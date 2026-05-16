"""iter195 · FM-Upgrades 4 + 5 — Channel · Kitchen Calendar · Echo Permission Ladder.

Bundled because all three are lightweight config primitives that underpin later
FM-Upgrades (labels, morning brief, Echo guardrails).

  GET/POST /api/channels                 channel CRUD (admin)
  GET/POST /api/kitchen-calendar         calendar CRUD (admin) + today lookup
  GET      /api/kitchen-calendar/today   current day-type + tempo hint
  GET/POST /api/echo/capabilities        Echo rung config per capability
  POST     /api/echo/capabilities/check  guardrail check — can Echo do X?
"""
from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel


def _db():
    from database import db as _d
    return _d


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()
def _uid(prefix: str) -> str:
    import uuid as _u
    return f"{prefix}-{_u.uuid4().hex[:8]}"


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


# ══════════════════════════════════════════════════════════════════
# FM-Upgrade 4a · Channels (first-class entity)
# ══════════════════════════════════════════════════════════════════
channels_router = APIRouter(prefix="/api/channels", tags=["channels"])


class ChannelBody(BaseModel):
    type: str       # b2c_subscription|b2c_alacarte|b2b_corporate|b2b_gym|clinical|retail|grocery_wholesale|concierge_medicine
    name: str
    pricing: Optional[str] = "standard"
    label_format: Optional[str] = "chilled_grab_go"
    sla_hours: Optional[int] = 48
    menu_subset: Optional[List[str]] = None
    compliance_requirements: Optional[List[str]] = None


CHANNEL_TYPES = {"b2c_subscription", "b2c_alacarte", "b2b_corporate", "b2b_gym",
                 "clinical", "retail", "grocery_wholesale", "concierge_medicine"}


@channels_router.get("")
async def list_channels():
    items = list(_db().channels.find({}, {"_id": 0}).sort("name", 1))
    return {"ok": True, "total": len(items), "channels": items}


@channels_router.post("")
async def create_channel(body: ChannelBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if body.type not in CHANNEL_TYPES:
        raise HTTPException(400, f"type must be one of {sorted(CHANNEL_TYPES)}")
    cid = _uid("ch")
    doc = {
        "id": cid, "type": body.type, "name": body.name,
        "pricing": body.pricing or "standard",
        "label_format": body.label_format or "chilled_grab_go",
        "sla_hours": int(body.sla_hours or 48),
        "menu_subset": body.menu_subset or [],
        "compliance_requirements": body.compliance_requirements or [],
        "active": True, "created_at": _iso(),
    }
    _db().channels.insert_one(doc.copy()); doc.pop("_id", None)
    return {"ok": True, "channel": doc}


@channels_router.get("/{channel_id}")
async def get_channel(channel_id: str):
    doc = _db().channels.find_one({"id": channel_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "channel not found")
    return {"ok": True, "channel": doc}


# ══════════════════════════════════════════════════════════════════
# FM-Upgrade 4b · Kitchen Calendar
# ══════════════════════════════════════════════════════════════════
kitchen_calendar_router = APIRouter(prefix="/api/kitchen-calendar", tags=["kitchen-calendar"])

DAY_TYPES = {"prep", "pack", "deliver", "receive", "rest", "hybrid"}

DEFAULT_CAL = {
    "id": "kc-default",
    "name": "Default weekly rhythm",
    "week_pattern": {
        "monday":    "prep",
        "tuesday":   "pack",
        "wednesday": "deliver",
        "thursday":  "prep",
        "friday":    "pack",
        "saturday":  "deliver",
        "sunday":    "rest",
    },
    "active": True,
    "created_at": _iso(),
}


def _seed_default_cal():
    d = _db()
    if not d.kitchen_calendars.find_one({"id": "kc-default"}):
        d.kitchen_calendars.insert_one(DEFAULT_CAL.copy())


class CalendarBody(BaseModel):
    name: str
    week_pattern: Dict[str, str]   # day→day_type


@kitchen_calendar_router.get("")
async def list_calendars():
    _seed_default_cal()
    items = list(_db().kitchen_calendars.find({}, {"_id": 0}).sort("name", 1))
    return {"ok": True, "total": len(items), "calendars": items}


@kitchen_calendar_router.post("")
async def upsert_calendar(body: CalendarBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    for dt in body.week_pattern.values():
        if dt not in DAY_TYPES:
            raise HTTPException(400, f"day_type must be one of {sorted(DAY_TYPES)}")
    d = _db()
    cid = _uid("kc")
    doc = {"id": cid, "name": body.name, "week_pattern": body.week_pattern,
           "active": True, "created_at": _iso()}
    d.kitchen_calendars.insert_one(doc.copy()); doc.pop("_id", None)
    return {"ok": True, "calendar": doc}


TEMPO_HINTS = {
    "prep":    {"headline": "Prep day", "tone": "focused", "focus": ["PO approvals", "mise-en-place", "cook-ahead batches"]},
    "pack":    {"headline": "Pack day", "tone": "tight", "focus": ["label audit", "CCP sweep", "pack-line throughput"]},
    "deliver": {"headline": "Delivery day", "tone": "alert", "focus": ["route sweep", "cold-chain telemetry", "POD review"]},
    "receive": {"headline": "Receiving day", "tone": "careful", "focus": ["temp capture", "TLC assignment", "vendor variance"]},
    "rest":    {"headline": "Rest day", "tone": "calm", "focus": ["deep clean", "training", "weekly review"]},
    "hybrid":  {"headline": "Hybrid day", "tone": "balanced", "focus": ["mixed ops"]},
}


@kitchen_calendar_router.get("/today")
async def today_day_type(calendar_id: Optional[str] = None):
    _seed_default_cal()
    cal = _db().kitchen_calendars.find_one({"id": calendar_id or "kc-default"}, {"_id": 0})
    if not cal: raise HTTPException(404, "calendar not found")
    weekday = _now().strftime("%A").lower()
    dt = (cal.get("week_pattern") or {}).get(weekday, "hybrid")
    hint = TEMPO_HINTS.get(dt, TEMPO_HINTS["hybrid"])
    return {"ok": True, "calendar_id": cal["id"], "weekday": weekday, "day_type": dt, "hint": hint}


# ══════════════════════════════════════════════════════════════════
# FM-Upgrade 5 · Echo Permission Ladder
# ══════════════════════════════════════════════════════════════════
echo_router = APIRouter(prefix="/api/echo", tags=["echo-capabilities"])

DEFAULT_CAPABILITIES = {
    "morning_brief":         4,
    "anomaly_detection":     4,
    "po_drafting":           2,
    "po_execution_under_threshold": 1,
    "forecast_adjustment":   3,
    "customer_retention_offers": 1,
    "staff_scheduling":      2,
    "menu_recommendations":  1,
    "vendor_switching":      1,
    "label_regeneration":    3,
    "price_adjustments":     0,
    "recipe_modifications":  0,
}

RUNG_DESCRIPTIONS = {
    0: "Observe — Echo watches, no action",
    1: "Suggest — Echo recommends, operator approves each",
    2: "Draft — Echo prepares full action, one-click approve",
    3: "Execute with notification — reversible for 1 hour",
    4: "Autonomous — acts silently within guardrails",
}


def _seed_capabilities():
    d = _db()
    for cap, rung in DEFAULT_CAPABILITIES.items():
        if not d.echo_capabilities.find_one({"capability": cap}):
            d.echo_capabilities.insert_one({
                "capability": cap, "rung": rung,
                "description": RUNG_DESCRIPTIONS.get(rung, ""),
                "reversibility_window_min": 60 if rung == 3 else 0,
                "updated_at": _iso(),
            })


class CheckBody(BaseModel):
    capability: str
    proposed_action: str         # "execute" | "draft" | "suggest" | "observe"


@echo_router.get("/capabilities")
async def list_capabilities():
    _seed_capabilities()
    items = list(_db().echo_capabilities.find({}, {"_id": 0}).sort("capability", 1))
    return {"ok": True, "total": len(items), "capabilities": items, "rungs": RUNG_DESCRIPTIONS}


@echo_router.post("/capabilities/check")
async def check_capability(body: CheckBody):
    """Guardrail: can Echo perform the proposed action for this capability?

    Rules: Observe requires rung ≥ 0; Suggest ≥ 1; Draft ≥ 2; Execute ≥ 3.
    Autonomous execute = rung 4 (no notification surface needed).
    """
    _seed_capabilities()
    cap = _db().echo_capabilities.find_one({"capability": body.capability}, {"_id": 0})
    if not cap:
        raise HTTPException(404, "capability not found")
    rung = int(cap.get("rung") or 0)
    required = {"observe": 0, "suggest": 1, "draft": 2, "execute": 3, "autonomous": 4}
    need = required.get(body.proposed_action.lower())
    if need is None:
        raise HTTPException(400, f"proposed_action must be one of {sorted(required)}")
    allowed = rung >= need
    return {"ok": True, "allowed": allowed, "capability": body.capability,
            "current_rung": rung, "required_rung": need,
            "reversibility_window_min": int(cap.get("reversibility_window_min") or 0),
            "description": RUNG_DESCRIPTIONS.get(rung, "")}


class CapabilityBody(BaseModel):
    rung: int           # 0..4


@echo_router.post("/capabilities/{capability}")
async def set_capability(capability: str, body: CapabilityBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if body.rung not in (0, 1, 2, 3, 4):
        raise HTTPException(400, "rung must be 0..4")
    d = _db()
    d.echo_capabilities.update_one(
        {"capability": capability},
        {"$set": {"capability": capability, "rung": body.rung,
                  "description": RUNG_DESCRIPTIONS.get(body.rung, ""),
                  "reversibility_window_min": 60 if body.rung == 3 else 0,
                  "updated_at": _iso()}},
        upsert=True,
    )
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ECHO_SUGGESTION_MADE
        _tl(ECHO_SUGGESTION_MADE,
            actor={"type": "user", "id": "admin", "name": "Admin"},
            entity_refs=[{"kind": "echo_capability", "id": capability}],
            payload={"rung": body.rung, "description": RUNG_DESCRIPTIONS.get(body.rung, "")})
    except Exception: pass
    return {"ok": True, "capability": capability, "rung": body.rung}
