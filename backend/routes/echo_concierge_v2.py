"""
Echo Concierge v2 — Guest Experience Orchestration Layer (iter168, Phase 1 slice)

Scope: guest profile + preferences · request CRUD · vendor directory + availability ·
       itinerary LLM parser (Claude Sonnet 4.5) · revenue attribution.

Routes under `/api/concierge-v2/*`, `/api/guest/*`, `/api/itinerary/*`.
This module is separate from /app/backend/routes/echo_concierge.py (FOH tickets)
to avoid collisions. The frontend `modules/EchoConcierge/` talks to these.
"""
import os
import re
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(tags=["echo-concierge-v2"])


# ─── Seeded guest profiles (MVP, until CRM integration) ─────────────────────
SEED_GUESTS: List[Dict[str, Any]] = [
    {"id": "g-101", "room": "1201", "name": "Katherine Mansfield",
     "adults": 2, "children": 0, "vip_tier": "platinum", "repeat": True,
     "preferences": ["champagne on arrival", "beach-facing room", "jazz music"],
     "dietary": ["gluten-free"], "mobility": [], "language": "en",
     "special_dates": [{"label": "anniversary", "date": "2026-02-20"}]},
    {"id": "g-102", "room": "0808", "name": "Malik Jensen",
     "adults": 1, "children": 0, "vip_tier": "gold", "repeat": False,
     "preferences": ["quiet floor", "early riser coffee"],
     "dietary": ["vegetarian"], "mobility": [], "language": "en", "special_dates": []},
    {"id": "g-103", "room": "1414", "name": "Luca & Priya Navarro",
     "adults": 2, "children": 1, "vip_tier": "silver", "repeat": True,
     "preferences": ["pet-friendly", "late check-out"],
     "dietary": [], "mobility": ["step-free access"], "language": "en",
     "special_dates": [{"label": "birthday", "date": "2026-02-22"}]},
    {"id": "g-104", "room": "2002", "name": "Daniel Okafor",
     "adults": 2, "children": 0, "vip_tier": "owner", "repeat": True,
     "preferences": ["butler service", "cigar room", "private dining"],
     "dietary": [], "mobility": [], "language": "en", "special_dates": []},
    {"id": "g-105", "room": "0502", "name": "Amira Chen",
     "adults": 2, "children": 2, "vip_tier": "standard", "repeat": False,
     "preferences": ["kids club", "connecting rooms"],
     "dietary": ["nut allergy"], "mobility": [], "language": "en",
     "special_dates": [{"label": "honeymoon", "date": "2026-02-19"}]},
]


def _set_stay_windows():
    """Dynamically set stay windows around today so the timeline always shows data."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    for i, g in enumerate(SEED_GUESTS):
        start = today - timedelta(days=1 + (i % 3))
        end = today + timedelta(days=4 + (i % 3))
        g["stay_start"] = start.strftime("%Y-%m-%d")
        g["stay_end"] = end.strftime("%Y-%m-%d")


_set_stay_windows()


SEED_VENDORS: List[Dict[str, Any]] = [
    {"id": "v-1",  "name": "Coastal Carriage Co.", "category": "transport",    "tier": "luxury",  "avg_price": 220,  "rating": 4.9, "commission": 15, "contact": "dispatch@coastalcarriage.example"},
    {"id": "v-2",  "name": "Marina Charters",      "category": "marina",       "tier": "premium", "avg_price": 850,  "rating": 4.8, "commission": 12, "contact": "book@marinacharters.example"},
    {"id": "v-3",  "name": "Atelier Florale",      "category": "florist",      "tier": "luxury",  "avg_price": 180,  "rating": 4.7, "commission": 18, "contact": "orders@atelierflorale.example"},
    {"id": "v-4",  "name": "Lens & Light Studio",  "category": "photography",  "tier": "premium", "avg_price": 500,  "rating": 4.9, "commission": 20, "contact": "studio@lensandlight.example"},
    {"id": "v-5",  "name": "Quartet Mile End",     "category": "musician",     "tier": "luxury",  "avg_price": 1200, "rating": 4.8, "commission": 10, "contact": "mgr@quartetme.example"},
    {"id": "v-6",  "name": "Sunrise Excursions",   "category": "excursion",    "tier": "premium", "avg_price": 350,  "rating": 4.7, "commission": 15, "contact": "tours@sunriseex.example"},
    {"id": "v-7",  "name": "Aerial Wings Heli",    "category": "aviation",     "tier": "luxury",  "avg_price": 2400, "rating": 4.9, "commission": 8,  "contact": "ops@aerialwings.example"},
    {"id": "v-8",  "name": "Paws & Petals Care",   "category": "pet-care",     "tier": "premium", "avg_price": 80,   "rating": 4.6, "commission": 20, "contact": "care@pawsandpetals.example"},
    {"id": "v-9",  "name": "Mercato Private Chef", "category": "private-chef", "tier": "luxury",  "avg_price": 1800, "rating": 4.8, "commission": 15, "contact": "chef@mercato.example"},
    {"id": "v-10", "name": "Azure Spa Therapists", "category": "spa-vendor",   "tier": "premium", "avg_price": 280,  "rating": 4.7, "commission": 25, "contact": "book@azurespa.example"},
]


# ─── Schemas ────────────────────────────────────────────────────────────────
class ConciergeRequestCreate(BaseModel):
    guest_id: str
    kind: str
    summary: str = Field(..., min_length=3, max_length=300)
    priority: str = "normal"
    scheduled_for: Optional[str] = None
    vendor_id: Optional[str] = None
    revenue_estimate: Optional[float] = None
    notes: Optional[str] = None


class ConciergeRequestUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    actual_revenue: Optional[float] = None
    vendor_id: Optional[str] = None


class ItineraryParseRequest(BaseModel):
    guest_id: str
    natural_language: str = Field(..., min_length=3, max_length=1200)


class PreferenceWrite(BaseModel):
    guest_id: str
    key: str
    value: str
    confidence: float = 1.0


# ─── Helpers ────────────────────────────────────────────────────────────────
def _now_iso() -> str: return datetime.now(timezone.utc).isoformat()


def _find_guest(guest_id: str) -> Dict[str, Any]:
    for g in SEED_GUESTS:
        if g["id"] == guest_id or g["room"] == guest_id:
            return g
    raise HTTPException(404, f"guest {guest_id!r} not found")


# ─── 1. Guest profile + preferences ─────────────────────────────────────────
@router.get("/api/guest/profile")
async def guest_profile(room: Optional[str] = None, id: Optional[str] = None, q: Optional[str] = None):
    if room:
        for g in SEED_GUESTS:
            if g["room"] == room: return {"ok": True, "guest": g}
        return {"ok": False, "error": "not found"}
    if id:
        for g in SEED_GUESTS:
            if g["id"] == id: return {"ok": True, "guest": g}
        return {"ok": False, "error": "not found"}
    if q:
        ql = q.lower()
        hits = [g for g in SEED_GUESTS if ql in g["name"].lower() or ql in g["room"]]
        return {"ok": True, "guests": hits}
    return {"ok": True, "guests": SEED_GUESTS}


@router.get("/api/guest/preferences/read")
async def read_preferences(guest_id: str):
    from database import db as _db
    base = _find_guest(guest_id)
    stored = list(_db.concierge_guest_preferences.find({"guest_id": base["id"]}, {"_id": 0}))
    return {
        "ok": True, "guest_id": base["id"], "preferences": base["preferences"],
        "dietary": base["dietary"], "mobility": base["mobility"],
        "language": base["language"], "special_dates": base["special_dates"], "learned": stored,
    }


@router.post("/api/guest/preferences/write")
async def write_preference(body: PreferenceWrite):
    from database import db as _db
    _find_guest(body.guest_id)
    rec = {"id": uuid.uuid4().hex[:12], "guest_id": body.guest_id, "key": body.key,
           "value": body.value, "confidence": float(max(0, min(1, body.confidence))),
           "recorded_at": _now_iso()}
    _db.concierge_guest_preferences.insert_one(rec.copy())
    return {"ok": True, "preference": rec}


# ─── 2. Concierge requests ──────────────────────────────────────────────────
@router.post("/api/concierge-v2/request/create")
async def create_request(body: ConciergeRequestCreate):
    from database import db as _db
    guest = _find_guest(body.guest_id)
    req = {
        "id": uuid.uuid4().hex[:12], "guest_id": guest["id"],
        "guest_name": guest["name"], "guest_room": guest["room"],
        "vip_tier": guest["vip_tier"], "kind": body.kind, "summary": body.summary,
        "priority": body.priority, "scheduled_for": body.scheduled_for,
        "vendor_id": body.vendor_id, "revenue_estimate": body.revenue_estimate or 0,
        "actual_revenue": 0, "notes": body.notes, "status": "pending",
        "created_at": _now_iso(), "updated_at": _now_iso(),
        "history": [{"at": _now_iso(), "event": "created", "by": "concierge"}],
    }
    _db.concierge_v2_requests.insert_one(req.copy())
    return {"ok": True, "request": req}


@router.patch("/api/concierge-v2/request/{rid}")
async def update_request(rid: str, body: ConciergeRequestUpdate):
    from database import db as _db
    existing = _db.concierge_v2_requests.find_one({"id": rid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, f"request {rid!r} not found")
    updates: Dict[str, Any] = {"updated_at": _now_iso()}
    evts: List[Dict[str, Any]] = []
    if body.status is not None:
        updates["status"] = body.status
        evts.append({"at": _now_iso(), "event": f"status→{body.status}"})
    if body.notes is not None:
        updates["notes"] = body.notes
        evts.append({"at": _now_iso(), "event": "notes-updated"})
    if body.actual_revenue is not None:
        updates["actual_revenue"] = float(body.actual_revenue)
        evts.append({"at": _now_iso(), "event": f"revenue=${body.actual_revenue}"})
    if body.vendor_id is not None:
        updates["vendor_id"] = body.vendor_id
        evts.append({"at": _now_iso(), "event": f"vendor→{body.vendor_id}"})
    if evts:
        history = existing.get("history") or []
        history.extend(evts)
        updates["history"] = history
    _db.concierge_v2_requests.update_one({"id": rid}, {"$set": updates})
    return {"ok": True, "request": _db.concierge_v2_requests.find_one({"id": rid}, {"_id": 0})}


@router.get("/api/concierge-v2/request/status")
async def get_request_status(rid: str):
    from database import db as _db
    r = _db.concierge_v2_requests.find_one({"id": rid}, {"_id": 0})
    if not r: raise HTTPException(404, f"request {rid!r} not found")
    return {"ok": True, "request": r}


@router.get("/api/concierge-v2/requests")
async def list_requests(status: Optional[str] = None, guest_id: Optional[str] = None, limit: int = 100):
    from database import db as _db
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    if guest_id: q["guest_id"] = guest_id
    items = list(_db.concierge_v2_requests.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(500, limit))))
    agg_estimate = sum(float(i.get("revenue_estimate") or 0) for i in items)
    agg_actual = sum(float(i.get("actual_revenue") or 0) for i in items)
    by_status: Dict[str, int] = {}
    for i in items:
        by_status[i.get("status", "pending")] = by_status.get(i.get("status", "pending"), 0) + 1
    return {"ok": True, "total": len(items), "requests": items,
            "revenue": {"estimated": agg_estimate, "actual": agg_actual}, "by_status": by_status}


# ─── 3. Vendors ─────────────────────────────────────────────────────────────
@router.get("/api/concierge-v2/vendor/list")
async def vendor_list(category: Optional[str] = None):
    items = SEED_VENDORS
    if category and category != "all":
        items = [v for v in items if v["category"].lower() == category.lower()]
    return {"ok": True, "total": len(items), "vendors": items}


@router.get("/api/concierge-v2/vendor/availability")
async def vendor_availability(vendor_id: str, date: str):
    vendor = next((v for v in SEED_VENDORS if v["id"] == vendor_id), None)
    if not vendor: raise HTTPException(404, f"vendor {vendor_id!r} not found")
    try: d = datetime.strptime(date, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "Invalid date, use YYYY-MM-DD")
    slots_total = 6 if d.weekday() >= 5 else 10
    booked = (abs(hash(vendor_id + date)) % slots_total)
    return {"ok": True, "vendor_id": vendor_id, "date": date,
            "slots_total": slots_total, "slots_booked": booked,
            "slots_available": slots_total - booked,
            "next_available_slot": "16:00" if booked < slots_total else None}


# ─── 4. LLM itinerary parser ────────────────────────────────────────────────
ITINERARY_SYSTEM_PROMPT = """You are the EchoConcierge intelligence node at a luxury resort. You convert natural-language guest wishes into STRUCTURED, actionable concierge workflow items.

For each guest request, respond with a single JSON object (no markdown, no prose):
{
  "itinerary": [
    {
      "title": "<concise action title>",
      "kind": "dining | spa | transport | activity | celebration | recovery | other",
      "suggested_time": "<e.g. 'tonight 7:30pm', 'tomorrow morning'>",
      "priority": "normal | high | urgent",
      "vendor_category": "marina | transport | florist | photography | musician | excursion | spa-vendor | private-chef | pet-care | aviation | internal",
      "revenue_estimate": <number in USD>,
      "notes": "<one-line ops rationale>"
    }
  ],
  "clarifying_question": "<OPTIONAL: only if you truly need one critical piece of info before booking>"
}

Guidelines:
- 1–5 items, sharply scoped, each bookable by the concierge team without further input.
- Factor in sunset/seasonality/weather when obvious.
- For celebrations (anniversary, proposal, birthday, honeymoon), include the anchor item + 2-3 supporting items (florals, music, photography).
- Match vendor_category exactly to one of the options above.
- Revenue estimate is resort revenue, not vendor revenue.
- Be concise. Never invent guest PII."""


@router.post("/api/itinerary/generate")
async def generate_itinerary(body: ItineraryParseRequest):
    from database import db as _db
    guest = _find_guest(body.guest_id)
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(503, "EMERGENT_LLM_KEY not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        raise HTTPException(503, f"emergentintegrations not installed: {e}")

    prefs = ", ".join(guest.get("preferences") or []) or "none recorded"
    diets = ", ".join(guest.get("dietary") or []) or "none"
    special = ", ".join([f"{s['label']}={s['date']}" for s in guest.get("special_dates") or []]) or "none"
    ctx = (
        f"GUEST: {guest['name']} · room {guest['room']} · VIP tier {guest['vip_tier']} · "
        f"adults {guest['adults']}, children {guest['children']} · repeat={guest['repeat']}\n"
        f"PREFERENCES: {prefs}\nDIETARY: {diets}\nSPECIAL DATES: {special}\n\n"
        f"REQUEST (verbatim): {body.natural_language}"
    )
    session_id = f"itinerary-{guest['id']}-{uuid.uuid4().hex[:8]}"
    chat = LlmChat(api_key=key, session_id=session_id,
                   system_message=ITINERARY_SYSTEM_PROMPT).with_model(
        "anthropic", "claude-sonnet-4-5-20250929")
    try:
        raw = await chat.send_message(UserMessage(text=ctx))
    except Exception as e:
        raise HTTPException(502, f"LLM failed: {str(e)[:140]}")

    txt = (raw or "").strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?\n?", "", txt)
        txt = re.sub(r"\n?```$", "", txt)
    m = re.search(r"(\{.*\})", txt, flags=re.DOTALL)
    parsed: Dict[str, Any] = {}
    if m:
        try: parsed = json.loads(m.group(1))
        except json.JSONDecodeError: pass
    if not parsed:
        try: parsed = json.loads(txt)
        except Exception:
            parsed = {"itinerary": [], "clarifying_question": "Sorry, I couldn't parse that. Try rephrasing."}

    session = {"id": session_id, "guest_id": guest["id"],
               "natural_language": body.natural_language,
               "parsed": parsed, "created_at": _now_iso()}
    _db.concierge_itinerary_sessions.insert_one(session.copy())
    return {"ok": True, "session_id": session_id, "guest_id": guest["id"], **parsed}


# ─── 5. Revenue attribution roll-up ─────────────────────────────────────────
@router.get("/api/concierge-v2/revenue-impact")
async def revenue_impact(days: int = Query(30, ge=1, le=365)):
    from database import db as _db
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    items = list(_db.concierge_v2_requests.find({"created_at": {"$gte": cutoff.isoformat()}}, {"_id": 0}))
    by_kind: Dict[str, Dict[str, float]] = {}
    total_est, total_actual = 0.0, 0.0
    for i in items:
        kind = i.get("kind", "other")
        by_kind.setdefault(kind, {"count": 0, "estimated": 0, "actual": 0})
        by_kind[kind]["count"] += 1
        by_kind[kind]["estimated"] += float(i.get("revenue_estimate") or 0)
        by_kind[kind]["actual"] += float(i.get("actual_revenue") or 0)
        total_est += float(i.get("revenue_estimate") or 0)
        total_actual += float(i.get("actual_revenue") or 0)
    return {"ok": True, "window_days": days, "total_requests": len(items),
            "total_estimated_revenue": round(total_est, 2),
            "total_actual_revenue": round(total_actual, 2),
            "by_kind": by_kind}
