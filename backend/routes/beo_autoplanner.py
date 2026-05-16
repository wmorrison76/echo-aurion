"""
Echo AURION · BEO Auto-Planner (iter263 — the AI scheduler the Director asked for)

What it does end-to-end for ANY BEO in the platform:
  1. Reads the BEO (menu items, guest count, start time, dietary, room, setup style)
  2. AI estimates: prep time (per dish), setup time, service time, breakdown time
  3. AI generates: staff schedule (positions × shifts × in/out times)
  4. AI generates: prep order list (what gets ordered, when, in what qty)
  5. Cross-day audit: when multiple BEOs are on the same day, surfaces:
     - Resource collisions (kitchen capacity, FOH staff overlap)
     - 24-hour-prep-window targets and their work-back-from times
     - Total platform load forecast
  6. Times itself end-to-end so the Director sees how fast the AI thinks.

Endpoints (all role-gated to admin/director/exec-chef in front-end nav):
  POST /api/beo-planner/plan/{beo_id}           — single BEO plan
  POST /api/beo-planner/plan-day/{date}         — plan ALL BEOs on a date, audit collisions
  POST /api/beo-planner/feedback                — capture post-event learning
  GET  /api/beo-planner/plans                   — list cached plans
  GET  /api/beo-planner/plans/{plan_id}         — fetch one
"""
from __future__ import annotations

import asyncio
import json
import os
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from database import db

# iter263.3 · Publish to event_bus so the right-rail drawer + Live Activity Feed
# pick up BEO planning events. Wrapped in try/except so a missing event_bus
# never breaks the planner.
try:
    import event_bus
except Exception:  # pragma: no cover
    event_bus = None  # type: ignore


def _emit(event_type: str, payload: dict) -> None:
    try:
        if event_bus is not None:
            event_bus.publish(event_type, payload, source="beo-planner")
    except Exception:
        pass

load_dotenv()

router = APIRouter(prefix="/api/beo-planner", tags=["beo-planner"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Multi-provider fallback chain — same pattern as chronos_ai.deep_dive
MODEL_CHAIN = [
    ("openai", "gpt-4o"),                          # fast + reliable
    ("openai", "gpt-4o-mini"),                     # fastest fallback
    ("anthropic", "claude-sonnet-4-5-20250929"),   # last resort (slow upstream)
]


PLAN_SYSTEM_PROMPT = """You are Echo, the principal banquet operations planner for a luxury hotel-restaurant group.
You receive ONE Banquet Event Order (BEO) and must return a PRECISE JSON plan covering prep, setup, service, breakdown, staffing, and ordering.

CONSTRAINTS — non-negotiable:
- Every BEO must be PREPPED 24 HOURS before service. Work backward from the start time.
- Order placement deadline must land 48 hours before service to allow vendor lead time.
- Staff schedule must include: position, count needed, in_time (HH:MM 24h), out_time, role notes.
- For each menu item, give a realistic per-100-guest prep_minutes and the station that owns it.

OUTPUT — return STRICT JSON only, no prose, no markdown fences. Schema:
{
  "executive_summary": "2-3 sentence summary",
  "timing": {
    "service_start": "YYYY-MM-DDTHH:MM",
    "service_end": "YYYY-MM-DDTHH:MM",
    "prep_complete_by": "YYYY-MM-DDTHH:MM",   // 24h before service start
    "order_deadline":  "YYYY-MM-DDTHH:MM",    // 48h before service start
    "setup_window":    {"start":"YYYY-MM-DDTHH:MM","end":"YYYY-MM-DDTHH:MM"},
    "breakdown_window":{"start":"YYYY-MM-DDTHH:MM","end":"YYYY-MM-DDTHH:MM"},
    "total_minutes_to_execute": <int>
  },
  "menu_prep": [
    {"course":"appetizer","dish":"...","station":"garde-manger","prep_minutes_per_100_guests":<int>,
     "total_prep_minutes":<int>,"start_at":"YYYY-MM-DDTHH:MM","ingredients_critical":["..."]}
  ],
  "staffing": [
    {"position":"banquet-server","count":<int>,"in_time":"HH:MM","out_time":"HH:MM","notes":"..."}
  ],
  "orders": [
    {"vendor":"Sysco","sku_or_item":"BEEF-FILET-8OZ","qty":<num>,"unit":"each",
     "place_by":"YYYY-MM-DDTHH:MM","reason":"..."}
  ],
  "risks": ["1-line risk items the GM should see"],
  "confidence": 0.0
}
Return JSON ONLY."""


DAY_AUDIT_SYSTEM_PROMPT = """You are Echo, the operations auditor for a hotel running multiple banquet events on the same day.
You receive an array of single-event plans (already produced) and must produce a CROSS-EVENT AUDIT in JSON only.

OUTPUT JSON schema:
{
  "summary": "2-3 sentences on the day's load",
  "load_score": 0..1,            // 0=light, 1=overloaded
  "collisions": [
    {"window":"HH:MM-HH:MM","type":"staff|kitchen|setup-team","severity":"warn|critical","detail":"..."}
  ],
  "consolidated_orders": [
    {"vendor":"Sysco","sku_or_item":"...","qty":<num>,"unit":"...","place_by":"YYYY-MM-DDTHH:MM",
     "events":["beo_id1","beo_id2"]}
  ],
  "recommendations": ["2-5 actionable lines for the Director"],
  "earliest_prep_start": "YYYY-MM-DDTHH:MM",
  "latest_breakdown_end": "YYYY-MM-DDTHH:MM"
}
Return JSON ONLY."""


# ════════════════════ MODELS ════════════════════

class PlanResp(BaseModel):
    plan_id: str
    beo_id: str
    plan: Dict[str, Any]
    model_used: str
    elapsed_ms: int
    cached: bool = False
    degraded: bool = False
    reason: Optional[str] = None


# ════════════════════ HELPERS ════════════════════

def _serialize_beo(beo: Dict[str, Any]) -> str:
    """Compact BEO summary the LLM can reason over quickly."""
    keep = {
        k: beo.get(k)
        for k in (
            "id", "event_name", "client_name", "event_date", "start_time",
            "end_time", "guest_count", "guaranteed_count", "venue", "room",
            "setup_style", "menu_items", "dietary_requirements", "beo_notes",
        )
    }
    return json.dumps(keep, default=str, indent=2)


async def _call_llm(system: str, user_text: str) -> tuple[str, str]:
    """Try each model in MODEL_CHAIN until one returns. Raises on full failure."""
    if not EMERGENT_LLM_KEY:
        raise RuntimeError("EMERGENT_LLM_KEY not configured")
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    last: Optional[Exception] = None
    for provider, model in MODEL_CHAIN:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"beo-planner-{model}-{int(time.time())}",
                system_message=system,
            ).with_model(provider, model)
            r = await asyncio.wait_for(
                chat.send_message(UserMessage(text=user_text)),
                timeout=55,
            )
            return r, f"{provider}/{model}"
        except Exception as e:
            last = e
            continue
    raise RuntimeError(f"All providers failed; last={type(last).__name__}: {str(last)[:160]}")


def _parse_json(text: str) -> Dict[str, Any]:
    """Best-effort JSON extraction (model may wrap in fences despite instructions)."""
    text = text.strip()
    # Strip code fences
    if text.startswith("```"):
        first_nl = text.find("\n")
        text = text[first_nl + 1:] if first_nl != -1 else text
        if text.endswith("```"):
            text = text[:-3]
    # Find first { ... last }
    s, e = text.find("{"), text.rfind("}")
    if s != -1 and e != -1 and e > s:
        text = text[s : e + 1]
    return json.loads(text)


# ════════════════════ ENDPOINTS ════════════════════

@router.post("/plan/{beo_id}")
async def plan_one_beo(beo_id: str, refresh: bool = False):
    """Generate (or fetch cached) plan for a single BEO."""
    if not refresh:
        cached = db["beo_plans"].find_one({"beo_id": beo_id}, {"_id": 0})
        if cached:
            return PlanResp(**cached, cached=True).dict()

    beo = db["beos"].find_one({"id": beo_id}, {"_id": 0}) \
        or db["beos"].find_one({"event_id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, f"BEO {beo_id} not found")

    user_text = f"BEO PAYLOAD:\n{_serialize_beo(beo)}\n\nReturn the JSON plan now."
    t0 = time.time()
    try:
        text, model_used = await _call_llm(PLAN_SYSTEM_PROMPT, user_text)
        plan = _parse_json(text)
    except Exception as e:
        elapsed = int((time.time() - t0) * 1000)
        return PlanResp(
            plan_id=f"plan-{beo_id}",
            beo_id=beo_id,
            plan={"executive_summary": "AI planner unavailable",
                  "raw_error": f"{type(e).__name__}: {str(e)[:200]}"},
            model_used="fallback-failed",
            elapsed_ms=elapsed,
            degraded=True,
            reason=f"{type(e).__name__}: {str(e)[:200]}",
        ).dict()

    elapsed = int((time.time() - t0) * 1000)
    plan_id = f"plan-{beo_id}-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    doc = {
        "plan_id": plan_id, "beo_id": beo_id, "plan": plan,
        "model_used": model_used, "elapsed_ms": elapsed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    db["beo_plans"].update_one({"beo_id": beo_id}, {"$set": doc}, upsert=True)
    _emit("beo.planned", {
        "beo_id": beo_id,
        "event_name": beo.get("event_name"),
        "event_date": beo.get("event_date"),
        "guest_count": beo.get("guest_count"),
        "elapsed_ms": elapsed,
        "model": model_used,
    })
    return PlanResp(**doc, cached=False).dict()


@router.post("/plan-day/{date}")
async def plan_day(date: str, refresh: bool = False):
    """Plan EVERY BEO scheduled on `date`, then run a cross-event audit."""
    beos = list(db["beos"].find({"event_date": date}, {"_id": 0}))
    if not beos:
        raise HTTPException(404, f"No BEOs on {date}")

    t_total = time.time()
    plans = []
    for beo in beos:
        beo_id = beo.get("id") or beo.get("event_id")
        if not beo_id:
            continue
        # Reuse the single-BEO planner so caching + fallback applies per event.
        single = await plan_one_beo(beo_id, refresh=refresh)
        plans.append(single)

    # Cross-event audit
    audit_input = json.dumps(
        [{"beo_id": p["beo_id"], "plan": p["plan"]} for p in plans],
        default=str, indent=2,
    )
    audit_t = time.time()
    audit: Dict[str, Any]
    audit_model = "n/a"
    audit_degraded = False
    audit_reason: Optional[str] = None
    try:
        text, audit_model = await _call_llm(
            DAY_AUDIT_SYSTEM_PROMPT,
            f"DATE: {date}\n\nEVENT PLANS ({len(plans)}):\n{audit_input}\n\nAudit now.",
        )
        audit = _parse_json(text)
    except Exception as e:
        audit = {"summary": "Audit unavailable",
                 "raw_error": f"{type(e).__name__}: {str(e)[:200]}"}
        audit_degraded = True
        audit_reason = f"{type(e).__name__}: {str(e)[:200]}"
    audit_ms = int((time.time() - audit_t) * 1000)
    total_ms = int((time.time() - t_total) * 1000)

    out = {
        "date": date,
        "beo_count": len(beos),
        "per_event_plans": plans,
        "cross_event_audit": audit,
        "audit_model": audit_model,
        "audit_elapsed_ms": audit_ms,
        "audit_degraded": audit_degraded,
        "audit_reason": audit_reason,
        "total_elapsed_ms": total_ms,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    db["beo_plan_days"].update_one({"date": date}, {"$set": out}, upsert=True)
    _emit("beo.day_planned", {
        "date": date,
        "beo_count": len(beos),
        "total_elapsed_ms": total_ms,
        "load_score": (audit or {}).get("load_score"),
        "collisions": len((audit or {}).get("collisions", [])),
        "consolidated_orders": len((audit or {}).get("consolidated_orders", [])),
    })
    return out


class FeedbackReq(BaseModel):
    plan_id: str
    actual_prep_minutes: Optional[int] = None
    actual_staff_count: Optional[int] = None
    notes: Optional[str] = None
    accuracy_rating: Optional[int] = None     # 1..5


@router.post("/feedback")
def capture_feedback(req: FeedbackReq):
    """Director-side learning loop: capture post-event accuracy of the plan."""
    db["beo_plan_feedback"].insert_one({
        **req.dict(),
        "captured_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True, "plan_id": req.plan_id}


@router.get("/plans")
def list_plans(limit: int = 30):
    docs = list(
        db["beo_plans"].find({}, {"_id": 0})
        .sort("generated_at", -1)
        .limit(max(1, min(200, limit)))
    )
    return {"plans": docs, "count": len(docs)}


@router.get("/plans/{plan_id}")
def get_plan(plan_id: str):
    doc = db["beo_plans"].find_one({"plan_id": plan_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, f"Plan {plan_id} not found")
    return doc


@router.get("/calendar")
def planning_calendar():
    """Group BEOs by date so the front-end can show a 'days needing planning' list."""
    pipeline = [
        {"$group": {"_id": "$event_date",
                    "count": {"$sum": 1},
                    "beos": {"$push": {"id": "$id", "event_name": "$event_name",
                                       "guest_count": "$guest_count",
                                       "start_time": "$start_time"}}}},
        {"$sort": {"_id": 1}},
    ]
    raw = list(db["beos"].aggregate(pipeline))
    days = []
    for row in raw:
        if not row["_id"]:
            continue
        # Has the day been planned already?
        planned = db["beo_plan_days"].find_one({"date": row["_id"]}, {"_id": 0, "date": 1})
        days.append({
            "date": row["_id"],
            "beo_count": row["count"],
            "events": row["beos"],
            "planned": bool(planned),
        })
    return {"days": days, "total_days": len(days)}


@router.post("/sync-to-calendar")
def sync_beos_to_calendar(date: Optional[str] = None):
    """Push BEOs (optionally filtered by date) into calendar_events so they
    flow through the global calendar UI. Idempotent — uses linked_beo_id as key.
    iter263.3 · cross-department flow test."""
    q: Dict[str, Any] = {}
    if date:
        q["event_date"] = date
    beos = list(db["beos"].find(q, {"_id": 0}))
    pushed = 0
    skipped = 0
    for beo in beos:
        beo_id = beo.get("id") or beo.get("event_id")
        if not beo_id:
            continue
        existing = db["calendar_events"].find_one({"linked_beo_id": beo_id}, {"_id": 0, "id": 1})
        if existing:
            skipped += 1
            continue
        date_str = beo.get("event_date") or "2026-01-01"
        start_t = beo.get("start_time") or "00:00"
        end_t = beo.get("end_time") or "23:00"
        doc = {
            "id": f"cal-beo-{beo_id[:24]}",
            "title": beo.get("event_name") or "Unnamed BEO",
            "outlet_id": "outlet-main-dining",
            "event_type": "banquet",
            "start": f"{date_str}T{start_t}:00Z",
            "end":   f"{date_str}T{end_t}:00Z",
            "all_day": False,
            "status": beo.get("status") or "draft",
            "color": "#a0789e",
            "assigned_to": [],
            "linked_event_id": beo.get("event_id"),
            "linked_beo_id": beo_id,
            "linked_po_ids": [],
            "metadata": {
                "guest_count": beo.get("guest_count"),
                "venue": beo.get("venue"),
                "room": beo.get("room"),
                "client_name": beo.get("client_name"),
            },
            "org_id": "default",
            "source_module": "beo-planner",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "source": "beo-planner-sync",
        }
        db["calendar_events"].insert_one(doc.copy())
        pushed += 1
    _emit("calendar.synced_from_beo", {"pushed": pushed, "skipped": skipped, "filter_date": date})
    return {"ok": True, "pushed": pushed, "skipped": skipped, "total_beos": len(beos)}
