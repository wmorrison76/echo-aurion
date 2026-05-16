"""iter204 · Echo AI³ alignment — wisdom rules + proactive insights + pending actions.

Mirrors the patterns from `/Users/cami/…/Echo_Aurion-main` (see /app/memory/ECHO_AI3_BRIEF.md).
Ported to our Mongo stack with the same contracts:
  - 17 seeded wisdom rules (from Echo_Aurion migration 008)
  - proactive_insights persistence
  - pending_actions store with human-gate /approve + /reject
  - action-executor reads ONLY approved actions
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from database import db
import os

router = APIRouter(prefix="/api/echo-ai3", tags=["echo-ai3"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid.uuid4().hex[:12]


# ═══════════════════════ 17 seeded wisdom rules ═════════════════════════════
SEED_WISDOM_RULES: List[Dict[str, Any]] = [
    {"id": "wr-001", "category": "inventory", "rule": "Proteins with <3 days shelf life should be featured on daily specials",
     "trigger": "inventory.days_to_expire < 3 AND category == protein", "confidence": 0.85, "origin": "seed"},
    {"id": "wr-002", "category": "labor", "rule": "Labor cost > 32% of revenue triggers cut-shift review",
     "trigger": "labor_pct > 32", "confidence": 0.90, "origin": "seed"},
    {"id": "wr-003", "category": "inventory", "rule": "Par levels below rolling 7-day sell-through need replenishment POs",
     "trigger": "par < forecast_7d * 0.8", "confidence": 0.88, "origin": "seed"},
    {"id": "wr-004", "category": "forecast", "rule": "Weather forecast rain +20% within 48h reduces patio covers 30%",
     "trigger": "weather.rain_prob_48h > 0.2", "confidence": 0.72, "origin": "seed"},
    {"id": "wr-005", "category": "menu", "rule": "High-margin items with <5% sell-through should be pushed by servers",
     "trigger": "margin_pct > 30 AND sell_through_pct < 5", "confidence": 0.80, "origin": "seed"},
    {"id": "wr-006", "category": "scheduling", "rule": "Three or more back-to-back closing shifts raise call-out risk by 2.5x",
     "trigger": "consecutive_closes >= 3", "confidence": 0.82, "origin": "seed"},
    {"id": "wr-007", "category": "events", "rule": "Event guest_count updated within 7 days requires BEO re-audit",
     "trigger": "event.days_to_start < 7 AND event.guest_count_changed", "confidence": 0.95, "origin": "seed"},
    {"id": "wr-008", "category": "purchasing", "rule": "Vendor price drift >5% vs trailing 30d avg triggers bid re-solicit",
     "trigger": "vendor.price_drift_pct > 5", "confidence": 0.78, "origin": "seed"},
    {"id": "wr-009", "category": "safety", "rule": "CCP temp excursions for >30min require written corrective action",
     "trigger": "ccp.excursion_minutes > 30", "confidence": 0.98, "origin": "seed"},
    {"id": "wr-010", "category": "guest", "rule": "Guest complaints on response-time >15min need manager recovery in same shift",
     "trigger": "complaint.category == response_time AND minutes > 15", "confidence": 0.86, "origin": "seed"},
    {"id": "wr-011", "category": "compliance", "rule": "Food handlers missing current certificate block shift assignment",
     "trigger": "staff.food_handler_certificate_expired", "confidence": 0.99, "origin": "seed"},
    {"id": "wr-012", "category": "finance", "rule": "Daily food cost variance >4% requires shift-end recount",
     "trigger": "food_cost_variance_pct > 4", "confidence": 0.84, "origin": "seed"},
    {"id": "wr-013", "category": "events", "rule": "Multi-room convention with <14d to go needs cross-dept read-ahead",
     "trigger": "convention.days_to_start < 14 AND rooms_needed > 1", "confidence": 0.88, "origin": "seed"},
    {"id": "wr-014", "category": "banquet", "rule": "Setup_style requiring rounds-of-10 takes 12 minutes per table to flip",
     "trigger": "setup.style == banquet AND flip_required", "confidence": 0.90, "origin": "seed"},
    {"id": "wr-015", "category": "av", "rule": "Events with 'keynote' or 'presentation' in title imply AV needs even when not flagged",
     "trigger": "title.contains(keynote OR presentation) AND NOT requires_av", "confidence": 0.80, "origin": "seed"},
    {"id": "wr-016", "category": "engineering", "rule": "HVAC pre-cool 45 min before event start for rooms with >100 guests",
     "trigger": "event.guest_count > 100", "confidence": 0.92, "origin": "seed"},
    {"id": "wr-017", "category": "network", "rule": "When 60% of peer properties change a menu item, re-test locally within 30d",
     "trigger": "network.peer_menu_change_adoption > 0.6", "confidence": 0.70, "origin": "seed"},
]


def _ensure_seed() -> int:
    """Idempotent seeding — inserts only what's missing."""
    created = 0
    for rule in SEED_WISDOM_RULES:
        if not db["wisdom_rules"].find_one({"id": rule["id"]}):
            db["wisdom_rules"].insert_one({**rule, "created_at": _now(), "_id": rule["id"]})
            created += 1
    return created


# ═══════════════════════ Wisdom rules ════════════════════════════════════════
@router.post("/wisdom/seed")
async def seed_wisdom():
    """Idempotent — safe to call on boot."""
    added = _ensure_seed()
    total = db["wisdom_rules"].count_documents({})
    return {"ok": True, "added": added, "total": total}


@router.get("/wisdom/rules")
async def list_wisdom_rules(category: Optional[str] = None):
    q: Dict[str, Any] = {"category": category} if category else {}
    rules = list(db["wisdom_rules"].find(q, {"_id": 0}).sort("id", 1))
    return {"rules": rules, "total": len(rules)}


# ═══════════════════════ Proactive insights ═════════════════════════════════
@router.get("/insights")
async def list_insights(status: Optional[str] = None, limit: int = 50):
    q: Dict[str, Any] = {"status": status} if status else {}
    insights = list(db["proactive_insights"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"insights": insights, "total": len(insights)}


# iter204b · Manual wisdom-rule evaluator trigger (also on cron every 15 min)
@router.post("/wisdom/evaluate-now")
async def evaluate_wisdom_now():
    """Fire the wisdom evaluator synchronously — useful for tests + demos."""
    from scheduler import _run_wisdom_evaluator
    await _run_wisdom_evaluator()
    total_insights = db["proactive_insights"].count_documents({"status": "active"})
    total_actions = db["pending_actions"].count_documents({"status": "pending"})
    return {"ok": True, "active_insights": total_insights, "pending_actions": total_actions}


class InsightResolve(BaseModel):
    outcome: str  # "helpful" | "noise" | "wrong"
    notes: Optional[str] = None


@router.patch("/insights/{insight_id}/resolve")
async def resolve_insight(insight_id: str, body: InsightResolve):
    """Outcome feeds back into wisdom-engine confidence scores."""
    res = db["proactive_insights"].update_one(
        {"id": insight_id},
        {"$set": {"status": "resolved", "outcome": body.outcome, "notes": body.notes, "resolved_at": _now()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "insight not found")
    insight = db["proactive_insights"].find_one({"id": insight_id}, {"_id": 0})
    # Adjust wisdom-rule confidence if linked
    rule_id = (insight or {}).get("rule_id")
    if rule_id and body.outcome in ("helpful", "wrong"):
        delta = 0.02 if body.outcome == "helpful" else -0.03
        db["wisdom_rules"].update_one({"id": rule_id}, {"$inc": {"confidence": delta}})
    return {"ok": True, "insight_id": insight_id}


class InsightCreate(BaseModel):
    category: str
    title: str
    summary: str
    severity: str = "normal"  # low | normal | high | critical
    org_id: Optional[str] = "default"
    rule_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


@router.post("/insights")
async def create_insight(body: InsightCreate):
    doc = {
        "id": f"insight-{_uid()}",
        "_id": f"insight-{_uid()}",
        **body.model_dump(),
        "status": "active",
        "created_at": _now(),
    }
    db["proactive_insights"].insert_one(doc)
    doc.pop("_id", None)
    return doc


# ═══════════════════════ Pending Actions + human gate ═══════════════════════
class PendingAction(BaseModel):
    kind: str  # "po_draft" | "payment" | "label_regen" | "menu_change" | ...
    title: str
    summary: str
    reversible: bool = True
    risk_level: str = "medium"  # low | medium | high
    payload: Dict[str, Any]
    money_amount: Optional[float] = None  # if non-null, MUST route through /approve
    created_by: Optional[str] = "echo-ai3"


@router.post("/actions")
async def submit_action(body: PendingAction):
    """Echo-AI3 writes here; client surfaces the PendingActionBanner."""
    aid = f"action-{_uid()}"
    doc = {
        "id": aid, "_id": aid, **body.model_dump(),
        "status": "pending", "created_at": _now(),
    }
    db["pending_actions"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/actions/pending")
async def list_pending_actions(limit: int = 20):
    actions = list(db["pending_actions"].find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"actions": actions, "total": len(actions)}


@router.post("/actions/{action_id}/approve")
async def approve_action(action_id: str, x_user: Optional[str] = Header(None)):
    doc = db["pending_actions"].find_one({"id": action_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "action not found")
    if doc.get("status") != "pending":
        raise HTTPException(409, f"action is {doc.get('status')}")
    # NOTE: real execution dispatched by action-executor (out-of-band worker).
    # Here we just flip the state so executor picks it up.
    db["pending_actions"].update_one(
        {"id": action_id},
        {"$set": {"status": "approved", "approved_by": x_user or "unknown", "approved_at": _now()}},
    )
    return {"ok": True, "action_id": action_id, "status": "approved"}


@router.post("/actions/{action_id}/reject")
async def reject_action(action_id: str, x_user: Optional[str] = Header(None)):
    doc = db["pending_actions"].find_one({"id": action_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "action not found")
    db["pending_actions"].update_one(
        {"id": action_id},
        {"$set": {"status": "rejected", "rejected_by": x_user or "unknown", "rejected_at": _now()}},
    )
    return {"ok": True, "action_id": action_id, "status": "rejected"}


# ═══════════════════════ iter207 · analyze-event (Echo logic/reasoning) ═════════════════════════════
class AnalyzeEventBody(BaseModel):
    event: Dict[str, Any]


@router.post("/analyze-event")
async def analyze_event(body: AnalyzeEventBody):
    """Claude Sonnet 4.5 explains the logic behind a TimelineEvent:
    why it fired, what it means for operations, and any follow-up worth
    surfacing. Falls back to a deterministic heuristic if the LLM is offline.
    """
    ev = body.event or {}
    ev_type = ev.get("type") or "unknown"
    actor = (ev.get("actor") or {}).get("name") or (ev.get("actor") or {}).get("id") or "system"
    refs = ev.get("entity_refs") or []
    ref_str = ", ".join(f"{r.get('kind','?')}:{r.get('name') or r.get('id','')}" for r in refs[:3]) or "—"
    payload = ev.get("payload") or {}
    ts = ev.get("timestamp") or _now()

    # Heuristic fallback — always works without LLM
    def _heuristic() -> str:
        bits = [
            f"Event `{ev_type}` fired at {ts} by {actor}.",
            f"Touched {ref_str}.",
        ]
        if payload.get("tlc"): bits.append(f"Traceability Lot Code: {payload['tlc']}.")
        if payload.get("temp_c") is not None:
            t = payload["temp_c"]
            bits.append(f"Temp {t}°C — {'⚠ outside 0–7°C safe band' if (t is not None and (t > 7 or t < -1)) else 'within safe band'}.")
        if ev_type.startswith("po."): bits.append("This is a purchasing state change — watch for receipt within SLA.")
        if ev_type.startswith("ccp."): bits.append("CCP event — required KDE for FSMA 204 compliance.")
        if ev_type.startswith("pack."): bits.append("Pack lifecycle step — propagates up to order status.")
        if ev_type.startswith("label."): bits.append("Label domain — nutrition/allergen statements may need regeneration.")
        return " ".join(bits)

    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return {"ok": True, "analysis": _heuristic(), "mode": "heuristic_no_llm"}

    from lib.llm import ask_echo
    system_prompt = (
        "You are Echo, the operational conscience of LUCCCA's fresh-meal and events platform. "
        "Given a single TimelineEvent, explain in 3-4 short sentences: "
        "(1) WHAT this event means in plain operator language, "
        "(2) WHY it fired (infer from event type + payload + entities), "
        "(3) any RISK or anomaly worth flagging (⚠ prefix for critical), "
        "(4) ONE recommended next action. Be concrete, no fluff, no bullets."
    )
    ctx = (
        f"EVENT_TYPE: {ev_type}\n"
        f"TIMESTAMP: {ts}\n"
        f"ACTOR: {actor}\n"
        f"ENTITIES: {ref_str}\n"
        f"PAYLOAD: {payload}\n"
    )
    result = await ask_echo(system_prompt, ctx, session_prefix="echo-analyze")
    if result["mode"] == "llm" and result["text"]:
        return {"ok": True, "analysis": result["text"], "mode": "llm"}
    return {"ok": True, "analysis": _heuristic(),
            "mode": f"heuristic_{result['mode']}",
            **({"error": result["error"]} if result.get("error") else {})}
