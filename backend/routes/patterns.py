"""
Patterns & Recurring-Issue Engine
=================================
Cross-module pattern detection powering EchoStratus remediation
recommendations. Mines concierge tickets, engineering work orders,
housekeeping signals, and FOH recovery logs to surface:

  - Recurring issues by (room, category, severity)
  - Returning guests with repeat complaints
  - Outlet performance drift patterns
  - Asset failure clusters
  - Cross-module remediation recommendations (Stratus output)

Endpoints (prefix /api/patterns):
  GET  /recurring-issues            — grouped by room+category over N days
  GET  /guest-complaint-history     — guests with 2+ issues, sorted by count
  GET  /asset-failure-clusters      — assets/categories with repeat failures
  GET  /outlet-drift                — outlets whose ticket-variance is
                                      trending up
  GET  /stratus-recommendations     — remediation plans synthesized
                                      across all patterns (optional LLM)
  POST /remediation                 — file a remediation plan manually
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4
import os
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db

try:
    import event_bus
except Exception:
    event_bus = None

router = APIRouter(prefix="/api/patterns", tags=["patterns"])

REMED_COLL = "stratus_remediations"
DISMISS_COLL = "pattern_dismissals"   # iter147: GMs can dismiss resolved patterns

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()


class Remediation(BaseModel):
    title: str
    pattern_source: str           # recurring_issue | guest_complaint | asset_cluster | outlet_drift
    affected_scope: str = ""      # room, outlet, asset
    recommended_action: str
    owner_domain: str = "engineering"  # engineering | hskp | foh | spa | concierge | capex
    priority: str = "medium"
    estimated_impact_usd: float = 0.0


# ─────────────────────────────────────────────
# Recurring-issue miner
# ─────────────────────────────────────────────
def _recurring(days: int = 30) -> List[Dict[str, Any]]:
    since = (_now() - timedelta(days=days)).isoformat()
    buckets: Dict[str, Dict[str, Any]] = {}
    # Concierge tickets
    try:
        for t in db["concierge_tickets"].find({"created_at": {"$gte": since}}, {"_id": 0}).limit(2000):
            room = t.get("room_no") or "(no-room)"
            cat = t.get("category") or "(no-cat)"
            key = f"{room}|{cat}"
            b = buckets.setdefault(key, {
                "room_no": room, "category": cat, "sources": set(),
                "count": 0, "severities": {}, "first_seen": t.get("created_at"),
                "last_seen": t.get("created_at"), "tickets": [],
            })
            b["count"] += 1
            b["sources"].add("concierge")
            sev = t.get("severity", "medium")
            b["severities"][sev] = b["severities"].get(sev, 0) + 1
            b["tickets"].append({"id": t.get("id"), "title": t.get("title"), "source": "concierge"})
            if t.get("created_at") > b["last_seen"]:
                b["last_seen"] = t.get("created_at")
    except Exception:
        pass
    # Engineering work orders
    try:
        for w in db["eng_work_orders"].find({"opened_at": {"$gte": since}}, {"_id": 0}).limit(2000):
            room = w.get("room_number") or "(no-room)"
            cat = w.get("category") or "(no-cat)"
            key = f"{room}|{cat}"
            b = buckets.setdefault(key, {
                "room_no": room, "category": cat, "sources": set(),
                "count": 0, "severities": {}, "first_seen": w.get("opened_at"),
                "last_seen": w.get("opened_at"), "tickets": [],
            })
            b["count"] += 1
            b["sources"].add("engineering")
            sev = w.get("severity", "medium")
            b["severities"][sev] = b["severities"].get(sev, 0) + 1
            b["tickets"].append({"id": w.get("id"), "title": w.get("title"), "source": "engineering"})
    except Exception:
        pass
    # HSKP guest signals
    try:
        for s in db["hskp_guest_signals"].find({"created_at": {"$gte": since}}, {"_id": 0}).limit(2000):
            room = s.get("room_no") or "(no-room)"
            cat = s.get("signal_type") or "(no-cat)"
            key = f"{room}|{cat}"
            b = buckets.setdefault(key, {
                "room_no": room, "category": cat, "sources": set(),
                "count": 0, "severities": {}, "first_seen": s.get("created_at"),
                "last_seen": s.get("created_at"), "tickets": [],
            })
            b["count"] += 1
            b["sources"].add("hskp")
    except Exception:
        pass
    out = []
    for b in buckets.values():
        if b["count"] < 2:
            continue
        if b["room_no"] == "(no-room)":
            continue  # skip aggregate noise — focus on location-scoped recurrences
        b["sources"] = sorted(list(b["sources"]))
        out.append(b)
    # iter147: filter out dismissed patterns (room+category pairs dismissed
    # within the window stay hidden; a new ticket AFTER dismissal restores
    # visibility because we check the dismiss timestamp vs first_seen).
    try:
        dismissed = {
            (d["room_no"], d["category"]): d["dismissed_at"]
            for d in db[DISMISS_COLL].find({}, {"_id": 0, "room_no": 1, "category": 1, "dismissed_at": 1})
        }
        if dismissed:
            filtered = []
            for b in out:
                dkey = (b["room_no"], b["category"])
                dt = dismissed.get(dkey)
                if dt and b.get("last_seen") and b["last_seen"] <= dt:
                    # pattern was dismissed after the most recent ticket → hide
                    continue
                filtered.append(b)
            out = filtered
    except Exception:
        pass
    out.sort(key=lambda x: x["count"], reverse=True)
    return out


@router.get("/recurring-issues")
async def recurring_issues(days: int = 30, min_count: int = 2):
    items = [b for b in _recurring(days=days) if b["count"] >= min_count]
    return {"items": items[:60], "count": len(items), "window_days": days}


@router.get("/guest-complaint-history")
async def guest_complaints(days: int = 90, min_count: int = 2):
    since = (_now() - timedelta(days=days)).isoformat()
    guests: Dict[str, Dict[str, Any]] = {}
    try:
        for t in db["concierge_tickets"].find({"created_at": {"$gte": since}}, {"_id": 0}).limit(2000):
            name = t.get("guest_name") or t.get("guest_id")
            if not name:
                continue
            g = guests.setdefault(name, {"guest_name": name, "count": 0, "categories": {}, "severities": {}, "tickets": []})
            g["count"] += 1
            cat = t.get("category", "other")
            g["categories"][cat] = g["categories"].get(cat, 0) + 1
            sev = t.get("severity", "medium")
            g["severities"][sev] = g["severities"].get(sev, 0) + 1
            g["tickets"].append({"id": t.get("id"), "title": t.get("title"), "domain": t.get("domain"), "created_at": t.get("created_at")})
    except Exception:
        pass
    out = [g for g in guests.values() if g["count"] >= min_count]
    out.sort(key=lambda x: x["count"], reverse=True)
    # attach loyalty if available
    for g in out:
        prof = db["guest360_profiles"].find_one({"name": g["guest_name"]}, {"_id": 0})
        if prof:
            g["loyalty_tier"] = prof.get("loyalty_tier")
            g["vip"] = prof.get("vip")
            g["lifetime_revenue"] = prof.get("lifetime_revenue")
            g["current_room"] = prof.get("current_room")
    return {"items": out[:50], "count": len(out), "window_days": days}


@router.get("/asset-failure-clusters")
async def asset_clusters(days: int = 90):
    since = (_now() - timedelta(days=days)).isoformat()
    cats: Dict[str, Dict[str, Any]] = {}
    try:
        for w in db["eng_work_orders"].find({"opened_at": {"$gte": since}}, {"_id": 0}).limit(3000):
            cat = w.get("category", "other")
            c = cats.setdefault(cat, {"category": cat, "count": 0, "severities": {}, "avg_revenue_at_risk": 0, "_rar": []})
            c["count"] += 1
            sev = w.get("severity", "medium")
            c["severities"][sev] = c["severities"].get(sev, 0) + 1
            c["_rar"].append(w.get("revenue_at_risk", 0))
    except Exception:
        pass
    out = []
    for c in cats.values():
        rar = c.pop("_rar")
        c["avg_revenue_at_risk"] = round(sum(rar) / max(1, len(rar)), 2)
        out.append(c)
    out.sort(key=lambda x: x["count"], reverse=True)
    return {"items": out, "window_days": days}


@router.get("/outlet-drift")
async def outlet_drift(days: int = 14):
    """Detect outlets whose ticket-time-variance is trending up."""
    since = (_now() - timedelta(days=days)).isoformat()
    mid = (_now() - timedelta(days=days // 2)).isoformat()
    out = []
    try:
        for o in db["foh_outlets"].find({}, {"_id": 0}).limit(50):
            slug = o["slug"]
            old = list(db["foh_ticket_timings"].find({"outlet_slug": slug, "created_at": {"$gte": since, "$lt": mid}}, {"_id": 0}))
            new = list(db["foh_ticket_timings"].find({"outlet_slug": slug, "created_at": {"$gte": mid}}, {"_id": 0}))
            if not old or not new:
                continue
            old_var = sum(t.get("ticket_time_variance", 0) for t in old) / len(old)
            new_var = sum(t.get("ticket_time_variance", 0) for t in new) / len(new)
            drift = round(new_var - old_var, 2)
            if drift > 1.0:  # minutes drift
                out.append({
                    "outlet_slug": slug,
                    "outlet_name": o.get("name"),
                    "old_period_avg_variance": round(old_var, 2),
                    "new_period_avg_variance": round(new_var, 2),
                    "drift_minutes": drift,
                })
    except Exception:
        pass
    out.sort(key=lambda x: x["drift_minutes"], reverse=True)
    return {"items": out, "window_days": days}


# ─────────────────────────────────────────────
# Stratus remediations synthesizer
# ─────────────────────────────────────────────
async def _llm_remediation_plan(patterns: dict) -> Optional[str]:
    key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not key:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        summary_lines = []
        if patterns.get("recurring"):
            for r in patterns["recurring"][:5]:
                summary_lines.append(f"RECURRING: room {r['room_no']} · category {r['category']} · {r['count']} tickets · sources {r['sources']}")
        if patterns.get("asset"):
            for a in patterns["asset"][:5]:
                summary_lines.append(f"ASSET: category {a['category']} · {a['count']} failures · avg $ at risk {a.get('avg_revenue_at_risk', 0)}")
        if patterns.get("outlet_drift"):
            for d in patterns["outlet_drift"][:5]:
                summary_lines.append(f"OUTLET DRIFT: {d['outlet_slug']} variance +{d['drift_minutes']}m vs prior period")
        if patterns.get("guest"):
            for g in patterns["guest"][:5]:
                summary_lines.append(f"GUEST: {g['guest_name']} · {g['count']} tickets · categories {list(g['categories'].keys())}")
        if not summary_lines:
            return None
        bullets = "\n".join(summary_lines)
        chat = LlmChat(
            api_key=key,
            session_id=f"stratus-rem-{uuid4().hex[:6]}",
            system_message=(
                "You are EchoStratus — the strategic forecasting and remediation brain "
                "of a luxury resort operating system. Given recurring issue patterns, "
                "asset failure clusters, outlet drift, and guest-complaint repeats, "
                "produce 3-5 numbered concrete remediation plans. Each plan must name "
                "the target (room/asset/outlet/guest), the root cause hypothesis, the "
                "owner domain, the recommended action, and the estimated impact. Be "
                "specific and operational — not advisory. No corporate fluff."
            ),
        )
        chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text=f"Patterns:\n{bullets}"))
        return str(resp).strip() if resp else None
    except Exception:
        return None


@router.get("/stratus-recommendations")
async def stratus_recommendations(days: int = 30, use_llm: bool = True):
    recurring = [b for b in _recurring(days=days) if b["count"] >= 2][:15]
    # Convert sets→lists for downstream
    for r in recurring:
        if isinstance(r.get("sources"), set):
            r["sources"] = list(r["sources"])

    assets_resp = await asset_clusters(days=days)
    drift_resp = await outlet_drift(days=min(14, days))
    guest_resp = await guest_complaints(days=days)

    # Deterministic remediation seeds
    plans = []
    for r in recurring[:5]:
        plans.append({
            "id": f"plan-{uuid4().hex[:6]}",
            "pattern_source": "recurring_issue",
            "target": f"Room {r['room_no']} · {r['category']}",
            "recurrence_count": r["count"],
            "recommended_action": (
                f"Deep-inspect {r['category']} in {r['room_no']}. Create preventive "
                "work order if recurring > 3x. Consider asset replacement budgeting."
            ),
            "owner_domain": "engineering" if r["category"] in ("plumbing", "hvac", "electrical", "kitchen_equipment", "elevator") else "housekeeping",
            "priority": "high" if r["count"] >= 4 else "medium",
        })
    for a in assets_resp["items"][:3]:
        if a["count"] < 3:
            continue
        plans.append({
            "id": f"plan-{uuid4().hex[:6]}",
            "pattern_source": "asset_cluster",
            "target": f"Category {a['category']}",
            "recurrence_count": a["count"],
            "recommended_action": (
                f"{a['count']} failures in {a['category']} in {days}d. Review PM "
                "schedule frequency; escalate to CapEx review if avg revenue-at-risk exceeds $500."
            ),
            "owner_domain": "engineering",
            "priority": "high",
            "estimated_impact_usd": a.get("avg_revenue_at_risk", 0) * a["count"],
        })
    for d in drift_resp["items"][:3]:
        plans.append({
            "id": f"plan-{uuid4().hex[:6]}",
            "pattern_source": "outlet_drift",
            "target": d["outlet_name"] or d["outlet_slug"],
            "recommended_action": (
                f"Service pace drifted +{d['drift_minutes']}m at {d['outlet_name']}. "
                "Review station routing, kitchen pacing, staffing curve; notify GM."
            ),
            "owner_domain": "foh",
            "priority": "medium",
        })
    for g in guest_resp["items"][:3]:
        if g["count"] < 3:
            continue
        plans.append({
            "id": f"plan-{uuid4().hex[:6]}",
            "pattern_source": "guest_complaint",
            "target": f"Guest {g['guest_name']} ({g.get('loyalty_tier','?')}{' VIP' if g.get('vip') else ''})",
            "recurrence_count": g["count"],
            "recommended_action": (
                f"{g['count']} concierge tickets in window. GM personal outreach + "
                "proactive recovery amenity on next arrival. Flag profile for "
                "management review."
            ),
            "owner_domain": "foh",
            "priority": "high",
        })

    # Persist into remediation collection (idempotent upsert by id not applied — just append)
    for p in plans:
        p["created_at"] = _iso()
        db[REMED_COLL].insert_one(p.copy())
        p.pop("_id", None)

    # GAP FIX (audit iter146): HIGH-priority plans now generate persistent
    # team_notifications so GMs see them in the Aurium panel + Pattern
    # Intelligence widget + notification center (same channel used by
    # concierge intake). Avoids duplicating existing open notifications
    # for the same target within the same window.
    #
    # SELF-HEALING LOOP (iter147):
    # For recurring-issue plans with count >= 3 in a single room+category,
    # we also auto-create a PREVENTIVE engineering work order (once per
    # target per 14d window) so the domain team gets a concrete next action
    # without waiting for the GM to assign the notification manually.
    preventive_created = []
    try:
        since = (_now() - timedelta(days=days)).isoformat()
        pm_since = (_now() - timedelta(days=14)).isoformat()
        for p in plans:
            if p.get("priority") != "high":
                continue
            to_role = {
                "engineering": "eng_manager",
                "housekeeping": "hskp_manager",
                "foh": "gm",
                "capex": "controller",
                "concierge": "duty_manager",
                "spa": "spa_manager",
            }.get(p.get("owner_domain", "engineering"), "gm")
            exists = db["team_notifications"].find_one(
                {
                    "source": "stratus",
                    "target": p["target"],
                    "acknowledged": False,
                    "created_at": {"$gte": since},
                },
                {"_id": 0, "id": 1},
            )
            if not exists:
                db["team_notifications"].insert_one({
                    "id": f"notif-{uuid4().hex[:8]}",
                    "source": "stratus",
                    "plan_id": p["id"],
                    "to": to_role,
                    "reason": f"EchoStratus remediation: {p['target']} · {p.get('pattern_source','pattern')} ({p.get('recurrence_count') or 'see panel'}×)",
                    "target": p["target"],
                    "priority": p.get("priority"),
                    "pattern_source": p.get("pattern_source"),
                    "severity": "high",
                    "created_at": _iso(),
                    "acknowledged": False,
                    "status": "open",
                })

            # Auto-preventive engineering work order for recurring-issue
            # room+category patterns with count >= 3. Skipped if an open/
            # recent preventive WO for the same target already exists.
            if (
                p.get("pattern_source") == "recurring_issue"
                and (p.get("recurrence_count") or 0) >= 3
                and p.get("owner_domain") == "engineering"
            ):
                room_match = re.search(r"Room\s+(\S+)\s*·\s*(\S+)", p.get("target", ""))
                if room_match:
                    room_no = room_match.group(1)
                    category = room_match.group(2)
                    already = db["eng_work_orders"].find_one(
                        {
                            "room_number": room_no,
                            "category": category,
                            "source": "stratus_preventive",
                            "opened_at": {"$gte": pm_since},
                        },
                        {"_id": 0, "id": 1},
                    )
                    if not already:
                        pm_wo = {
                            "id": f"wo-{uuid4().hex[:10]}",
                            "ticket_no": f"PM-{_now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
                            "title": f"PREVENTIVE · Room {room_no} {category} ({p['recurrence_count']}× in {days}d)",
                            "description": (
                                f"Auto-generated by EchoStratus pattern engine. "
                                f"{p['recurrence_count']} {category} tickets detected in "
                                f"room {room_no} within {days} days. Inspect root cause, "
                                f"replace wear components, log findings."
                            ),
                            "category": category,
                            "severity": "medium",
                            "status": "open",
                            "room_number": room_no,
                            "location": f"Room {room_no}",
                            "source": "stratus_preventive",
                            "guest_impact": False,
                            "vip_room": False,
                            "revenue_at_risk": 0.0,
                            "plan_id": p["id"],
                            "opened_at": _iso(),
                            "assigned_at": None,
                            "resolved_at": None,
                            "notes": [],
                        }
                        db["eng_work_orders"].insert_one(pm_wo.copy())
                        p["preventive_work_order"] = pm_wo["ticket_no"]
                        preventive_created.append(pm_wo["ticket_no"])
    except Exception:
        pass

    narrative = None
    if use_llm:
        narrative = await _llm_remediation_plan({
            "recurring": recurring,
            "asset": assets_resp["items"],
            "outlet_drift": drift_resp["items"],
            "guest": guest_resp["items"],
        })

    # iter147: broadcast to any subscribed frontend panels so the
    # Pattern Intelligence widget / Aurium / sidebar badge refresh
    # in real time.
    if event_bus:
        try:
            event_bus.publish(
                "stratus.remediations.generated",
                {
                    "plans": len(plans),
                    "high_priority": sum(1 for p in plans if p.get("priority") == "high"),
                    "preventive_work_orders": len(preventive_created),
                },
                source="patterns",
            )
        except Exception:
            pass

    return {
        "ts": _iso(),
        "window_days": days,
        "plans": plans,
        "narrative": narrative,
        "preventive_work_orders": preventive_created,
        "counts": {
            "recurring": len(recurring),
            "asset_clusters": len(assets_resp["items"]),
            "outlet_drift": len(drift_resp["items"]),
            "guest_repeats": len(guest_resp["items"]),
        },
    }


@router.post("/remediation")
async def file_remediation(r: Remediation):
    doc = r.dict()
    doc["id"] = f"plan-{uuid4().hex[:8]}"
    doc["created_at"] = _iso()
    doc["manual"] = True
    db[REMED_COLL].insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "plan": doc}


@router.get("/remediation-log")
async def remediation_log(limit: int = 50):
    items = list(db[REMED_COLL].find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"items": items, "count": len(items)}


@router.get("/inline-summary")
async def inline_summary(days: int = 30):
    """Lightweight digest (no LLM) for embedding inside EchoAurium GM
    and EchoStratus Forecast panels. Returns the top-3 of every
    pattern family + aggregate counts so GMs see cross-module risk
    without opening the full Pattern Intelligence panel."""
    recurring = [b for b in _recurring(days=days) if b["count"] >= 2]
    for r in recurring:
        if isinstance(r.get("sources"), set):
            r["sources"] = list(r["sources"])

    assets_resp = await asset_clusters(days=max(30, days))
    drift_resp = await outlet_drift(days=min(14, days))
    guest_resp = await guest_complaints(days=max(60, days))

    top_recurring = [
        {
            "room_no": r["room_no"],
            "category": r["category"],
            "count": r["count"],
            "sources": r.get("sources", []),
        }
        for r in recurring[:3]
    ]
    top_assets = [
        {"category": a["category"], "count": a["count"], "avg_revenue_at_risk": a.get("avg_revenue_at_risk", 0)}
        for a in assets_resp["items"][:3]
        if a["count"] >= 3
    ]
    top_drift = [
        {"outlet_slug": d["outlet_slug"], "outlet_name": d.get("outlet_name"), "drift_minutes": d["drift_minutes"]}
        for d in drift_resp["items"][:3]
    ]
    top_guests = [
        {
            "guest_name": g["guest_name"],
            "count": g["count"],
            "loyalty_tier": g.get("loyalty_tier"),
            "vip": g.get("vip", False),
        }
        for g in guest_resp["items"][:3]
        if g["count"] >= 2
    ]

    # Simple risk score: weighted sum of counts
    risk_score = min(
        100,
        int(
            sum(r["count"] for r in recurring[:10]) * 2
            + sum(a["count"] for a in assets_resp["items"][:5] if a["count"] >= 3)
            + sum(d["drift_minutes"] for d in drift_resp["items"][:3]) * 3
            + sum(g["count"] for g in guest_resp["items"][:5] if g["count"] >= 2)
        ),
    )

    return {
        "ts": _iso(),
        "window_days": days,
        "risk_score": risk_score,  # 0-100 (higher = more pattern pressure)
        "totals": {
            "recurring_issues": len(recurring),
            "asset_hotspots": sum(1 for a in assets_resp["items"] if a["count"] >= 3),
            "outlet_drift_outlets": len(drift_resp["items"]),
            "repeat_guests": len([g for g in guest_resp["items"] if g["count"] >= 2]),
        },
        "top_recurring": top_recurring,
        "top_assets": top_assets,
        "top_drift": top_drift,
        "top_repeat_guests": top_guests,
    }



# ─────────────────────────────────────────────
# Pattern dismissal (iter147)
# ─────────────────────────────────────────────
class DismissPayload(BaseModel):
    room_no: str
    category: str
    reason: Optional[str] = None
    dismissed_by: Optional[str] = None


@router.post("/dismiss")
async def dismiss_pattern(p: DismissPayload):
    """Hide a recurring pattern after the owning team has resolved the
    root cause. A new ticket in the same room+category AFTER the
    dismissal timestamp restores visibility automatically."""
    doc = {
        "id": f"dis-{uuid4().hex[:8]}",
        "room_no": p.room_no,
        "category": p.category,
        "reason": p.reason,
        "dismissed_by": p.dismissed_by,
        "dismissed_at": _iso(),
    }
    # upsert on (room_no, category)
    db[DISMISS_COLL].update_one(
        {"room_no": p.room_no, "category": p.category},
        {"$set": doc},
        upsert=True,
    )
    if event_bus:
        try:
            event_bus.publish("patterns.dismissed", doc, source="patterns")
        except Exception:
            pass
    return {"ok": True, "dismissal": doc}


@router.get("/dismissals")
async def list_dismissals(limit: int = 100):
    items = list(db[DISMISS_COLL].find({}, {"_id": 0}).sort("dismissed_at", -1).limit(limit))
    return {"items": items, "count": len(items)}


@router.delete("/dismissals/{room_no}/{category}")
async def restore_dismissal(room_no: str, category: str):
    """Un-dismiss a pattern (make it visible again)."""
    res = db[DISMISS_COLL].delete_one({"room_no": room_no, "category": category})
    return {"ok": True, "deleted": res.deleted_count}



# ─────────────────────────────────────────────
# REVENUE-AT-RISK ENGINE (iter148)
# Weights every open pattern by:
#   ADR of the affected room (defaults to $450 if unknown)
#   Probability the guest will churn (from repeat-complaint counts + loyalty tier)
#   Asset failure revenue-at-risk (already captured in eng_work_orders)
# Returns a single "$ at risk in the next 14 days" number
# plus the drill-down list of rooms/outlets driving that figure.
# ─────────────────────────────────────────────

DEFAULT_ADR = 450.0
HORIZON_DAYS = 14
LOYALTY_CHURN_PROB = {
    "platinum": 0.65,
    "gold": 0.55,
    "silver": 0.40,
    "bronze": 0.30,
    None: 0.25,
}


def _room_adr(room_no: str) -> float:
    try:
        room = db["rooms"].find_one(
            {"$or": [{"room_number": room_no}, {"room_no": room_no}, {"number": room_no}]},
            {"_id": 0, "adr": 1, "nightly_rate": 1, "rate": 1, "category": 1},
        )
        if not room:
            return DEFAULT_ADR
        for k in ("adr", "nightly_rate", "rate"):
            if k in room and room[k]:
                try:
                    return float(room[k])
                except Exception:
                    pass
        # tier fallback
        cat = (room.get("category") or "").lower()
        if "presidential" in cat or "suite" in cat:
            return 1200.0
        if "deluxe" in cat:
            return 680.0
        return DEFAULT_ADR
    except Exception:
        return DEFAULT_ADR


def _guest_churn_probability(complaint_count: int, loyalty_tier: Optional[str]) -> float:
    # complaint_count amplifier: 2→1.0x, 3→1.3x, 4→1.6x, 5+→1.9x (capped)
    amp = min(1.0 + max(0, complaint_count - 2) * 0.3, 1.9)
    base = LOYALTY_CHURN_PROB.get(loyalty_tier, LOYALTY_CHURN_PROB[None])
    return min(0.95, base * amp)


@router.get("/revenue-at-risk")
async def revenue_at_risk(days: int = 30, horizon_days: int = HORIZON_DAYS):
    """Single-number revenue-at-risk across all open pattern signals
    plus the drill-down rows that drive it. Feeds the Aurium hero and
    the Pattern Intelligence panel."""
    recurring = [b for b in _recurring(days=days) if b["count"] >= 2]
    guest_resp = await guest_complaints(days=max(60, days))
    asset_resp = await asset_clusters(days=max(60, days))
    drift_resp = await outlet_drift(days=min(14, days))

    rows: List[Dict[str, Any]] = []
    total = 0.0

    # 1. Recurring room patterns → projected night-revenue loss
    for r in recurring[:20]:
        adr = _room_adr(r["room_no"])
        # Assume a recurring pattern generates ~1 complaint/wk → guest-risk nights/yr
        # In a 14-day horizon, exposure = min(r.count/days * horizon, 3 nights)
        exposure_nights = min((r["count"] / max(1, days)) * horizon_days, 3)
        # Severity weight (plumbing/hvac/elec are guest-impact heavy)
        sev = 1.4 if r["category"] in ("plumbing", "hvac", "electrical") else 1.0
        at_risk = adr * exposure_nights * sev
        rows.append({
            "kind": "recurring_room",
            "target": f"Room {r['room_no']} · {r['category']}",
            "room_no": r["room_no"],
            "category": r["category"],
            "count": r["count"],
            "adr": round(adr, 2),
            "exposure_nights": round(exposure_nights, 2),
            "at_risk_usd": round(at_risk, 2),
        })
        total += at_risk

    # 2. Repeat guests → churn-probability × estimated LTV × horizon share
    GUEST_LTV = 4200.0   # fallback LTV
    for g in guest_resp["items"][:15]:
        if g["count"] < 2:
            continue
        prob = _guest_churn_probability(g["count"], g.get("loyalty_tier"))
        # project loss over the horizon: probability × LTV × (horizon/365)
        at_risk = prob * GUEST_LTV * (horizon_days / 365.0)
        rows.append({
            "kind": "repeat_guest",
            "target": f"{g['guest_name']} ({g.get('loyalty_tier') or 'no-tier'})",
            "guest_name": g["guest_name"],
            "loyalty_tier": g.get("loyalty_tier"),
            "vip": g.get("vip", False),
            "complaint_count": g["count"],
            "churn_probability": round(prob, 2),
            "at_risk_usd": round(at_risk, 2),
        })
        total += at_risk

    # 3. Asset failure clusters → use existing avg_revenue_at_risk × count (capped)
    for a in asset_resp["items"][:10]:
        if a["count"] < 3:
            continue
        at_risk = min(a.get("avg_revenue_at_risk", 0) * a["count"] * 0.3, 15000)
        rows.append({
            "kind": "asset_cluster",
            "target": f"{a['category']} failures",
            "category": a["category"],
            "count": a["count"],
            "avg_revenue_at_risk": a.get("avg_revenue_at_risk", 0),
            "at_risk_usd": round(at_risk, 2),
        })
        total += at_risk

    # 4. Outlet drift → lost covers × avg_check
    for d in drift_resp["items"][:10]:
        drift_min = d.get("drift_minutes", 0)
        # each extra minute of ticket time costs ~0.5 covers/hour at avg outlet pace
        lost_covers_per_day = drift_min * 4
        avg_check = d.get("avg_check") or 85.0
        at_risk = lost_covers_per_day * avg_check * horizon_days * 0.15
        rows.append({
            "kind": "outlet_drift",
            "target": d.get("outlet_name") or d["outlet_slug"],
            "outlet_slug": d["outlet_slug"],
            "drift_minutes": drift_min,
            "at_risk_usd": round(at_risk, 2),
        })
        total += at_risk

    rows.sort(key=lambda x: x["at_risk_usd"], reverse=True)

    # bucket by kind for the Aurium hero summary
    buckets: Dict[str, float] = {}
    for r in rows:
        buckets[r["kind"]] = buckets.get(r["kind"], 0.0) + r["at_risk_usd"]

    return {
        "ts": _iso(),
        "window_days": days,
        "horizon_days": horizon_days,
        "total_at_risk_usd": round(total, 2),
        "by_kind": {k: round(v, 2) for k, v in buckets.items()},
        "rows": rows[:40],
        "count": len(rows),
    }


# ─────────────────────────────────────────────
# REVENUE-AT-RISK TREND (iter149)
# Hourly snapshot for 7-day rolling sparkline so GMs see whether
# assign/dismiss interventions are actually paying down the risk.
# ─────────────────────────────────────────────
RAR_TREND_COLL = "revenue_at_risk_snapshots"


@router.post("/revenue-at-risk/snapshot")
async def revenue_at_risk_snapshot():
    """Record current revenue-at-risk in the trend collection. Called
    by a cron hook or on-demand. Idempotent per hour: if a snapshot
    already exists for the current hour bucket, it updates it instead."""
    current = await revenue_at_risk(days=30, horizon_days=14)
    hour_bucket = _now().replace(minute=0, second=0, microsecond=0)
    doc = {
        "ts": hour_bucket.isoformat(),
        "recorded_at": _iso(),
        "total_at_risk_usd": current["total_at_risk_usd"],
        "by_kind": current.get("by_kind", {}),
        "row_count": current.get("count", 0),
    }
    db[RAR_TREND_COLL].update_one(
        {"ts": doc["ts"]},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "snapshot": doc}


@router.get("/revenue-at-risk/trend")
async def revenue_at_risk_trend(hours: int = 168):  # 7 days default
    """Return hourly snapshots for the sparkline. Auto-records the
    current hour if not yet present, so the chart always shows a
    fresh trailing point even on first load."""
    since = (_now() - timedelta(hours=hours)).isoformat()
    items = list(
        db[RAR_TREND_COLL]
        .find({"ts": {"$gte": since}}, {"_id": 0})
        .sort("ts", 1)
    )
    # auto-record current hour if missing so chart is never empty
    current_bucket = _now().replace(minute=0, second=0, microsecond=0).isoformat()
    if not items or items[-1]["ts"] != current_bucket:
        try:
            current = await revenue_at_risk(days=30, horizon_days=14)
            doc = {
                "ts": current_bucket,
                "recorded_at": _iso(),
                "total_at_risk_usd": current["total_at_risk_usd"],
                "by_kind": current.get("by_kind", {}),
                "row_count": current.get("count", 0),
            }
            db[RAR_TREND_COLL].update_one({"ts": current_bucket}, {"$set": doc}, upsert=True)
            items.append(doc)
        except Exception:
            pass
    # compute simple delta vs 24h ago
    delta_24h = None
    try:
        if len(items) >= 2:
            newest = items[-1]["total_at_risk_usd"]
            cutoff = (_now() - timedelta(hours=24)).isoformat()
            prior = next((i["total_at_risk_usd"] for i in reversed(items) if i["ts"] <= cutoff), items[0]["total_at_risk_usd"])
            delta_24h = round(newest - prior, 2)
    except Exception:
        pass
    return {
        "ts": _iso(),
        "hours": hours,
        "points": [{"ts": i["ts"], "usd": i["total_at_risk_usd"]} for i in items],
        "count": len(items),
        "delta_24h_usd": delta_24h,
    }
