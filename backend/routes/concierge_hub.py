"""
Echo Concierge Hub — Unified Intake & Routing Layer
====================================================
Central orchestration for all guest-originated and staff-originated
requests across the property. Replaces scattered ticket endpoints with
one normalized pipeline.

Flow:
  1) Request arrives from: guest app / front desk / QR card / staff tablet
  2) Liability filter sanitizes (reuses /api/echo-concierge/liability)
  3) Intent classifier routes to one of:
       housekeeping | engineering | spa | ird (in-room dining & minibar)
       | foh (front-office) | guest360 (profile/preferences)
  4) Creates a domain ticket in the corresponding queue
  5) Returns confirmation + routed destination + the created ticket id

Collections:
  - concierge_tickets       (all normalized requests, source of truth)
  - concierge_routing_log   (audit of classification decisions)

Endpoints (prefix /api/concierge):
  POST /intake                  — submit a request (auto-routes)
  GET  /tickets                 — list concierge tickets (filter: domain, status, room_no, guest_name)
  PATCH /tickets/{id}           — update status / assign
  GET  /domains                 — breakdown by domain
  GET  /stats                   — 7-day volume + resolution stats
"""
import re
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db

try:
    import event_bus
except ImportError:
    event_bus = None

router = APIRouter(prefix="/api/concierge", tags=["concierge-hub"])

TICKETS_COLL = "concierge_tickets"
ROUTING_LOG = "concierge_routing_log"

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()

DOMAINS = ["housekeeping", "engineering", "spa", "ird", "foh", "guest360"]
STATUSES = ["open", "routed", "in_progress", "resolved", "cancelled"]

# ─────────────────────────────────────────────
# Intent classifier — deterministic, keyword-based
# ─────────────────────────────────────────────
ROUTING_RULES = [
    # (regex, domain, default_severity, default_category)
    (r"\b(leak\w*|dripping|flood\w*|no hot water|no cold water|clogged|toilet|faucet|pipe|plumb\w*)\b", "engineering", "high", "plumbing"),
    (r"\b(ac|a/c|air conditioning|heat(er)?|hvac|too cold|too hot|not cooling|not heating)\b", "engineering", "high", "hvac"),
    (r"\b(power|outlet|light|bulb|lamp|electric|no power|tripped)\b", "engineering", "medium", "electrical"),
    (r"\b(tv|remote|wifi|internet|network|cable|hdmi)\b", "engineering", "medium", "it_av"),
    (r"\b(elevator|lift|stuck)\b", "engineering", "critical", "elevator"),
    (r"\b(oven|stove|grill|fridge|cooler|freezer|ice machine)\b", "engineering", "high", "kitchen_equipment"),
    (r"\b(broken|damage|cracked|won't|doesn't work|won't work|not working|malfunction)\b", "engineering", "medium", "general"),

    (r"\b(towel|sheet|pillow|bed|linen|duvet|blanket|bathrobe|slipper)\b", "housekeeping", "medium", "linen_amenity"),
    (r"\b(clean|dirty|dust|stain|vacuum|tidy|maid|housekeep)\b", "housekeeping", "medium", "cleaning"),
    (r"\b(turndown|turn down|turn-down)\b", "housekeeping", "low", "turndown"),
    (r"\b(rollaway|roll away|cot|crib)\b", "housekeeping", "medium", "extra_bed"),
    (r"\b(late checkout|extend stay|keep room)\b", "housekeeping", "low", "late_checkout"),
    (r"\b(iron|ironing board|hair dryer|robe|slippers)\b", "housekeeping", "low", "amenity_request"),

    (r"\b(spa|massage|facial|manicure|pedicure|sauna|steam room)\b", "spa", "medium", "spa_booking"),
    (r"\b(appointment|book|reserv)\b.*\b(spa|massage|treatment)\b", "spa", "medium", "spa_booking"),

    (r"\b(minibar|mini bar|minibar restock|restock)\b", "ird", "low", "minibar"),
    (r"\b(room service|order food|food menu|breakfast|dinner|lunch|drink|coffee|tea|wine)\b", "ird", "medium", "room_service"),
    (r"\b(ice|water bottle|snacks)\b", "ird", "low", "minibar"),

    (r"\b(check.in|check in|checkin|key card|keycard|reception|lobby|front desk|concierge)\b", "foh", "medium", "front_desk"),
    (r"\b(wake up|wake-up call)\b", "foh", "low", "wake_up_call"),
    (r"\b(taxi|transport|airport|shuttle|uber)\b", "foh", "medium", "transport"),
    (r"\b(luggage|bag|porter|bellhop)\b", "foh", "medium", "luggage"),

    (r"\b(preferences|profile|allergy|allergies|dietary|pillow type|birthday|anniversary)\b", "guest360", "low", "profile_update"),
    (r"\b(loyalty|points|member|tier)\b", "guest360", "low", "loyalty"),
]


def classify(text: str, severity_hint: Optional[str] = None) -> Dict[str, Any]:
    """Return dict with keys: domain, severity, category, matched_rule."""
    if not text:
        return {"domain": "foh", "severity": severity_hint or "low", "category": "general", "matched_rule": None}
    lower = text.lower()
    for pattern, domain, sev, cat in ROUTING_RULES:
        if re.search(pattern, lower):
            return {
                "domain": domain,
                "severity": severity_hint or sev,
                "category": cat,
                "matched_rule": pattern,
            }
    return {"domain": "foh", "severity": severity_hint or "low", "category": "general", "matched_rule": None}


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class IntakeRequest(BaseModel):
    title: str
    body: str = ""
    source: str = "guest_app"          # guest_app | qr_card | front_desk | staff_tablet | api
    room_no: Optional[str] = None
    guest_name: Optional[str] = None
    guest_id: Optional[str] = None
    vip: bool = False
    loyalty_tier: Optional[str] = None
    severity_hint: Optional[str] = None
    domain_hint: Optional[str] = None  # force route
    language: str = "en"


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assignee: Optional[str] = None
    note: Optional[str] = None


# ─────────────────────────────────────────────
# Cross-module dispatch (lazy imports to avoid cycles)
# ─────────────────────────────────────────────
async def _dispatch_to_domain(domain: str, ticket: dict) -> Dict[str, Any]:
    """Create a domain-specific ticket in the right queue. Returns the created id."""
    now = _iso()
    if domain == "engineering":
        wo = {
            "id": f"wo-{uuid4().hex[:10]}",
            "ticket_no": f"ENG-{_now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
            "title": ticket["title"],
            "description": ticket["body"],
            "category": ticket.get("category", "general"),
            "severity": ticket.get("severity", "medium"),
            "status": "open",
            "location": f"Room {ticket['room_no']}" if ticket.get("room_no") else "",
            "room_number": ticket.get("room_no"),
            "asset_id": None,
            "assignee": None,
            "source": "concierge",
            "guest_impact": True,
            "vip_room": ticket.get("vip", False),
            "revenue_at_risk": 0.0,
            "sla_breach_at": (_now() + timedelta(hours={"critical": 1, "high": 4, "medium": 24, "low": 72}.get(ticket.get("severity", "medium"), 24))).isoformat(),
            "opened_at": now,
            "assigned_at": None,
            "resolved_at": None,
            "notes": [],
        }
        db["eng_work_orders"].insert_one(wo.copy())
        return {"queue": "eng_work_orders", "ref_id": wo["id"], "ref_no": wo["ticket_no"]}

    if domain == "housekeeping":
        task = {
            "id": f"hskp-task-{uuid4().hex[:8]}",
            "ticket_no": f"HSKP-{_now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
            "title": ticket["title"],
            "description": ticket["body"],
            "category": ticket.get("category", "amenity_request"),
            "severity": ticket.get("severity", "medium"),
            "status": "open",
            "room_no": ticket.get("room_no"),
            "vip": ticket.get("vip", False),
            "loyalty_tier": ticket.get("loyalty_tier"),
            "source": "concierge",
            "opened_at": now,
        }
        db["hskp_tasks"].insert_one(task.copy())
        return {"queue": "hskp_tasks", "ref_id": task["id"], "ref_no": task["ticket_no"]}

    if domain == "spa":
        inquiry = {
            "id": f"spa-inq-{uuid4().hex[:8]}",
            "title": ticket["title"],
            "body": ticket["body"],
            "room_no": ticket.get("room_no"),
            "guest_name": ticket.get("guest_name"),
            "vip": ticket.get("vip", False),
            "status": "open",
            "source": "concierge",
            "created_at": now,
        }
        db["spa_inquiries"].insert_one(inquiry.copy())
        return {"queue": "spa_inquiries", "ref_id": inquiry["id"], "ref_no": None}

    if domain == "ird":
        order = {
            "id": f"ird-{uuid4().hex[:8]}",
            "ticket_no": f"IRD-{_now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
            "title": ticket["title"],
            "body": ticket["body"],
            "room_no": ticket.get("room_no"),
            "category": ticket.get("category", "room_service"),
            "status": "open",
            "source": "concierge",
            "created_at": now,
        }
        db["ird_tickets"].insert_one(order.copy())
        return {"queue": "ird_tickets", "ref_id": order["id"], "ref_no": order["ticket_no"]}

    if domain == "guest360":
        note = {
            "id": f"g360-{uuid4().hex[:8]}",
            "guest_id": ticket.get("guest_id"),
            "guest_name": ticket.get("guest_name"),
            "room_no": ticket.get("room_no"),
            "title": ticket["title"],
            "body": ticket["body"],
            "category": ticket.get("category", "profile_update"),
            "status": "open",
            "source": "concierge",
            "created_at": now,
        }
        db["guest360_notes"].insert_one(note.copy())
        return {"queue": "guest360_notes", "ref_id": note["id"], "ref_no": None}

    # foh / fallback
    foh = {
        "id": f"foh-{uuid4().hex[:8]}",
        "ticket_no": f"FOH-{_now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
        "title": ticket["title"],
        "body": ticket["body"],
        "room_no": ticket.get("room_no"),
        "guest_name": ticket.get("guest_name"),
        "category": ticket.get("category", "general"),
        "status": "open",
        "source": "concierge",
        "created_at": now,
    }
    db["foh_tickets"].insert_one(foh.copy())
    return {"queue": "foh_tickets", "ref_id": foh["id"], "ref_no": foh["ticket_no"]}


# ─────────────────────────────────────────────
# Liability sanitize (inline, simple — mirrors concierge_liability core rules)
# ─────────────────────────────────────────────
LIABILITY_PATTERNS = [
    (r"\b(drunk|intoxicated|high on\s+\w+|on drugs)\b", "[redacted-behavior]"),
    (r"\b(crazy|insane|psychotic|mental|nutjob)\b", "[redacted-opinion]"),
    (r"\b(he seems|she seems|they seem)\b", "[observation-only]"),
    (r"\b\d{3}-\d{2}-\d{4}\b", "[redacted-ssn]"),
    (r"\b\d{16}\b", "[redacted-card]"),
]


def sanitize(text: str) -> Dict[str, Any]:
    if not text:
        return {"sanitized": "", "findings": []}
    findings = []
    sanitized = text
    for pat, repl in LIABILITY_PATTERNS:
        if re.search(pat, sanitized, flags=re.IGNORECASE):
            findings.append({"pattern": pat})
            sanitized = re.sub(pat, repl, sanitized, flags=re.IGNORECASE)
    return {"sanitized": sanitized, "findings": findings}


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@router.post("/intake")
async def intake(req: IntakeRequest):
    combined_text = f"{req.title} {req.body}"
    san = sanitize(combined_text)
    classification = classify(combined_text, severity_hint=req.severity_hint)
    if req.domain_hint and req.domain_hint in DOMAINS:
        classification["domain"] = req.domain_hint

    # Returning-guest analytics + recurring-issue detection
    guest_profile = None
    guest_history = []
    recurring = None
    team_notifications = []
    try:
        if req.guest_id or req.guest_name:
            q = {"guest_id": req.guest_id} if req.guest_id else {"name": req.guest_name}
            guest_profile = db["guest360_profiles"].find_one(q, {"_id": 0})
        if req.guest_name:
            guest_history = list(db[TICKETS_COLL].find(
                {"guest_name": req.guest_name}, {"_id": 0}
            ).sort("created_at", -1).limit(10))
        # Recurring: same room + same category in last 30d
        if req.room_no:
            since = (_now() - timedelta(days=30)).isoformat()
            past = list(db[TICKETS_COLL].find(
                {"room_no": req.room_no, "category": classification["category"], "created_at": {"$gte": since}},
                {"_id": 0}
            ).limit(30))
            if len(past) >= 2:
                recurring = {
                    "room_no": req.room_no,
                    "category": classification["category"],
                    "count_last_30d": len(past),
                    "previous_tickets": [{"id": p.get("id"), "title": p.get("title"), "created_at": p.get("created_at")} for p in past[:5]],
                }
                team_notifications.append({"to": "gm", "reason": f"Recurring {classification['category']} issue in {req.room_no} ({len(past)} in 30d)"})
    except Exception:
        pass

    # VIP notification
    effective_vip = req.vip or (guest_profile.get("vip") if guest_profile else False)
    if effective_vip:
        team_notifications.append({"to": "front_office_manager", "reason": "VIP guest request"})
    if classification["severity"] == "critical":
        team_notifications.append({"to": "duty_manager", "reason": "Critical severity ticket"})

    ticket = {
        "id": f"con-{uuid4().hex[:10]}",
        "confirmation_no": f"CON-{_now().strftime('%y%m%d')}-{uuid4().hex[:5].upper()}",
        "title": req.title,
        "body": sanitize(req.body)["sanitized"],
        "source": req.source,
        "room_no": req.room_no,
        "guest_name": req.guest_name,
        "guest_id": req.guest_id,
        "vip": effective_vip,
        "loyalty_tier": req.loyalty_tier or (guest_profile.get("loyalty_tier") if guest_profile else None),
        "domain": classification["domain"],
        "category": classification["category"],
        "severity": classification["severity"],
        "status": "routed",
        "language": req.language,
        "liability_findings": san["findings"],
        "guest_history_count": len(guest_history),
        "recurring": recurring,
        "team_notifications": team_notifications,
        "created_at": _iso(),
    }

    dispatch = await _dispatch_to_domain(classification["domain"], ticket)
    ticket["downstream_ref"] = dispatch

    db[TICKETS_COLL].insert_one(ticket.copy())
    db[ROUTING_LOG].insert_one({
        "id": f"log-{uuid4().hex[:8]}",
        "ticket_id": ticket["id"],
        "matched_rule": classification.get("matched_rule"),
        "domain": classification["domain"],
        "severity": classification["severity"],
        "category": classification["category"],
        "created_at": _iso(),
    })

    # Persist team notifications for downstream
    for n in team_notifications:
        db["team_notifications"].insert_one({
            "id": f"notif-{uuid4().hex[:8]}",
            "ticket_id": ticket["id"],
            "to": n["to"],
            "reason": n["reason"],
            "room_no": req.room_no,
            "guest_name": req.guest_name,
            "severity": classification["severity"],
            "created_at": _iso(),
            "acknowledged": False,
        })

    ticket.pop("_id", None)
    if event_bus:
        try:
            event_bus.publish("concierge.intake", {"id": ticket["id"], "domain": ticket["domain"], "severity": ticket["severity"], "vip": ticket.get("vip"), "room_no": ticket.get("room_no"), "recurring": bool(recurring)}, source="concierge_hub")
        except Exception:
            pass
    return {
        "ok": True,
        "ticket": ticket,
        "routed_to": classification["domain"],
        "downstream": dispatch,
        "liability_redactions": len(san["findings"]),
        "guest_profile": guest_profile,
        "guest_history_count": len(guest_history),
        "recurring": recurring,
        "team_notifications": team_notifications,
    }


@router.get("/tickets")
async def list_tickets(
    domain: Optional[str] = None,
    status: Optional[str] = None,
    room_no: Optional[str] = None,
    guest_name: Optional[str] = None,
    limit: int = Query(100, le=500),
):
    q = {}
    if domain:
        q["domain"] = domain
    if status:
        q["status"] = status
    if room_no:
        q["room_no"] = room_no
    if guest_name:
        q["guest_name"] = {"$regex": re.escape(guest_name), "$options": "i"}
    docs = db[TICKETS_COLL].find(q, {"_id": 0}).sort("created_at", -1).to_list(length=limit)
    return {"items": docs, "count": len(docs)}


@router.patch("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, upd: TicketUpdate):
    doc = db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "ticket not found")
    updates = {}
    if upd.status and upd.status in STATUSES:
        updates["status"] = upd.status
        if upd.status == "resolved":
            updates["resolved_at"] = _iso()
    if upd.assignee is not None:
        updates["assignee"] = upd.assignee
    if upd.note:
        updates["notes"] = doc.get("notes", []) + [f"{_iso()} — {upd.note}"]
    if updates:
        db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": updates})
    out = db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})
    return {"ok": True, "ticket": out}


@router.get("/domains")
async def domain_breakdown():
    counts = {}
    for d in DOMAINS:
        counts[d] = {
            "open": db[TICKETS_COLL].count_documents({"domain": d, "status": {"$in": ["open", "routed", "in_progress"]}}),
            "resolved_7d": db[TICKETS_COLL].count_documents({
                "domain": d,
                "status": "resolved",
                "created_at": {"$gte": (_now() - timedelta(days=7)).isoformat()},
            }),
            "total": db[TICKETS_COLL].count_documents({"domain": d}),
        }
    return {"domains": counts}


@router.get("/stats")
async def stats():
    now = _now()
    last7 = (now - timedelta(days=7)).isoformat()
    total_7d = db[TICKETS_COLL].count_documents({"created_at": {"$gte": last7}})
    resolved_7d = db[TICKETS_COLL].count_documents({"status": "resolved", "created_at": {"$gte": last7}})
    by_domain = {d: db[TICKETS_COLL].count_documents({"domain": d, "created_at": {"$gte": last7}}) for d in DOMAINS}
    by_severity = {s: db[TICKETS_COLL].count_documents({"severity": s, "created_at": {"$gte": last7}}) for s in ["low", "medium", "high", "critical"]}
    vip_count = db[TICKETS_COLL].count_documents({"vip": True, "created_at": {"$gte": last7}})
    # Avg resolution minutes
    resolved_docs = list(db[TICKETS_COLL].find({"status": "resolved", "created_at": {"$gte": last7}}, {"_id": 0, "created_at": 1, "resolved_at": 1}).limit(500))
    times = []
    for d in resolved_docs:
        if d.get("resolved_at"):
            try:
                times.append((datetime.fromisoformat(d["resolved_at"]) - datetime.fromisoformat(d["created_at"])).total_seconds() / 60)
            except Exception:
                pass
    return {
        "last_7_days": {
            "total": total_7d,
            "resolved": resolved_7d,
            "resolution_rate": round(100 * resolved_7d / max(1, total_7d), 1),
            "by_domain": by_domain,
            "by_severity": by_severity,
            "vip_count": vip_count,
            "avg_resolution_minutes": round(sum(times) / len(times), 1) if times else 0,
        },
        "ts": _iso(),
    }


@router.post("/classify")
async def classify_only(req: IntakeRequest):
    """Dry-run classifier — returns routing decision without creating tickets."""
    combined_text = f"{req.title} {req.body}"
    san = sanitize(combined_text)
    classification = classify(combined_text, severity_hint=req.severity_hint)
    return {
        "classification": classification,
        "sanitized_preview": san["sanitized"],
        "liability_findings": san["findings"],
    }


# ─────────────────────────────────────────────
# EchoAi³ reasoning agent — explains routing decisions with
# returning-guest history + recurring-issue detection + LLM narrative
# ─────────────────────────────────────────────
async def _reasoning_narrative(context: dict) -> Optional[str]:
    key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not key:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        lines = []
        lines.append(f"REQUEST: {context['title']}")
        if context.get("body"):
            lines.append(f"BODY: {context['body']}")
        c = context["classification"]
        lines.append(f"ROUTED TO: {c['domain']} · severity {c['severity']} · category {c['category']} · matched_rule {c.get('matched_rule')}")
        if context.get("guest_profile"):
            gp = context["guest_profile"]
            lines.append(f"GUEST PROFILE: {gp.get('name')} · tier {gp.get('loyalty_tier')} · VIP {gp.get('vip')} · {gp.get('total_stays')} stays · lifetime ${gp.get('lifetime_revenue',0):,.0f}")
            if gp.get("allergy_flags"): lines.append(f"ALLERGIES: {gp['allergy_flags']}")
        if context.get("guest_history"):
            lines.append(f"GUEST TICKET HISTORY ({len(context['guest_history'])} prior): " + "; ".join(f"[{h.get('domain')}/{h.get('category')}] {h.get('title')}" for h in context["guest_history"][:5]))
        if context.get("recurring"):
            r = context["recurring"]
            lines.append(f"RECURRING PATTERN: room {r['room_no']} has had {r['count_last_30d']} tickets of category {r['category']} in last 30d")
        chat = LlmChat(
            api_key=key,
            session_id=f"concierge-reason-{uuid4().hex[:6]}",
            system_message=(
                "You are the Echo Concierge reasoning agent. Given a normalized "
                "guest request, its classification, returning-guest context, and "
                "any recurring-issue pattern, produce a crisp 3-5 sentence "
                "explanation that covers: (1) WHY this was routed to the chosen "
                "domain, (2) the returning-guest context a manager should know, "
                "(3) any recurring-issue pattern worth escalating to EchoStratus, "
                "(4) a single top recommended next action. Be concrete. No fluff."
            ),
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text="\n".join(lines)))
        return str(resp).strip() if resp else None
    except Exception:
        return None


@router.post("/reason")
async def reason(req: IntakeRequest):
    """Intake + reasoning agent narrative. Does everything /intake does plus
    calls Claude Sonnet 4.5 to explain the routing decision with full historical
    context. Returns the ticket + the narrative."""
    combined_text = f"{req.title} {req.body}"
    san = sanitize(combined_text)
    classification = classify(combined_text, severity_hint=req.severity_hint)
    if req.domain_hint and req.domain_hint in DOMAINS:
        classification["domain"] = req.domain_hint

    guest_profile = None
    guest_history = []
    recurring = None
    try:
        if req.guest_id or req.guest_name:
            q = {"guest_id": req.guest_id} if req.guest_id else {"name": req.guest_name}
            guest_profile = db["guest360_profiles"].find_one(q, {"_id": 0})
        if req.guest_name:
            guest_history = list(db[TICKETS_COLL].find(
                {"guest_name": req.guest_name}, {"_id": 0}
            ).sort("created_at", -1).limit(8))
        if req.room_no:
            since = (_now() - timedelta(days=30)).isoformat()
            past = list(db[TICKETS_COLL].find(
                {"room_no": req.room_no, "category": classification["category"], "created_at": {"$gte": since}},
                {"_id": 0}
            ).limit(30))
            if len(past) >= 2:
                recurring = {
                    "room_no": req.room_no,
                    "category": classification["category"],
                    "count_last_30d": len(past),
                    "previous_tickets": [{"id": p.get("id"), "title": p.get("title"), "created_at": p.get("created_at")} for p in past[:5]],
                }
    except Exception:
        pass

    narrative = await _reasoning_narrative({
        "title": req.title,
        "body": req.body,
        "classification": classification,
        "guest_profile": guest_profile,
        "guest_history": guest_history,
        "recurring": recurring,
    })

    return {
        "classification": classification,
        "guest_profile": guest_profile,
        "guest_history": guest_history,
        "recurring": recurring,
        "narrative": narrative,
        "sanitized_preview": san["sanitized"],
    }


@router.get("/team-notifications")
async def list_team_notifications(acknowledged: Optional[bool] = None, limit: int = 50):
    q = {}
    if acknowledged is not None:
        q["acknowledged"] = acknowledged
    docs = list(db["team_notifications"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"items": docs, "count": len(docs)}


@router.post("/team-notifications/{notif_id}/ack")
async def ack_notification(notif_id: str):
    res = db["team_notifications"].update_one({"id": notif_id}, {"$set": {"acknowledged": True, "acknowledged_at": _iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "notification not found")
    return {"ok": True}


# ─────────────────────────────────────────────────────────
# SELF-HEALING LOOP (iter147):
# Assign a notification → create downstream task in the owner
# domain's queue and mark the notification as acknowledged
# with an assigned_to field and a downstream ref.
# ─────────────────────────────────────────────────────────
class AssignPayload(BaseModel):
    assigned_to: Optional[str] = None       # specific person (assignee)
    note: Optional[str] = None


DOMAIN_FROM_ROLE = {
    "eng_manager": "engineering",
    "engineering": "engineering",
    "hskp_manager": "housekeeping",
    "housekeeping": "housekeeping",
    "duty_manager": "foh",
    "gm": "foh",
    "front_office_manager": "foh",
    "foh": "foh",
    "controller": "engineering",    # capex routes to eng PM
    "spa_manager": "spa",
}


@router.post("/team-notifications/{notif_id}/assign")
async def assign_notification(notif_id: str, payload: AssignPayload):
    """Convert a pending team notification into an actionable downstream
    task in the owner domain's queue. Used by the GM directly from the
    Aurium / Pattern Intelligence widget — turns monitoring into ops."""
    notif = db["team_notifications"].find_one({"id": notif_id}, {"_id": 0})
    if not notif:
        raise HTTPException(404, "notification not found")
    if notif.get("status") == "assigned":
        return {"ok": True, "already_assigned": True, "downstream": notif.get("downstream")}

    owner_role = notif.get("to", "gm")
    domain = DOMAIN_FROM_ROLE.get(owner_role, "foh")

    # Build a synthetic "ticket" for the dispatcher
    target = notif.get("target") or notif.get("reason", "")[:60]
    # Try to extract a room number from the reason/target text
    room_match = re.search(r"(?:Rm|Room)\s*(\d{3})", f"{notif.get('reason','')} {target}")
    room_no = notif.get("room_no") or (room_match.group(1) if room_match else None)

    synthetic = {
        "title": f"[EchoStratus] {target}"[:200],
        "body": notif.get("reason", target),
        "category": "stratus_remediation",
        "severity": notif.get("severity", "high"),
        "room_no": room_no,
        "guest_name": notif.get("guest_name"),
        "vip": False,
        "loyalty_tier": None,
    }
    try:
        dispatch = await _dispatch_to_domain(domain, synthetic)
    except Exception as e:
        raise HTTPException(500, f"dispatch failed: {e}")

    db["team_notifications"].update_one(
        {"id": notif_id},
        {
            "$set": {
                "acknowledged": True,
                "acknowledged_at": _iso(),
                "status": "assigned",
                "assigned_to": payload.assigned_to,
                "assigned_at": _iso(),
                "downstream": dispatch,
                "note": payload.note,
            }
        },
    )

    if event_bus:
        try:
            event_bus.publish(
                "stratus.notification.assigned",
                {"notif_id": notif_id, "domain": domain, "downstream": dispatch},
                source="concierge_hub",
            )
        except Exception:
            pass

    return {"ok": True, "assigned_domain": domain, "downstream": dispatch}
