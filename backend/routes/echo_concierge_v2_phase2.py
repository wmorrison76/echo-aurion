"""
iter169 · EchoConcierge Phase 2 — outlet hours, dining, rooms, transport,
celebrations (cross-module cascade), service recovery, and guest folio stub.

Extends echo_concierge_v2.py (Phase 1). Keeps /api/concierge-v2/* prefix.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(tags=["echo-concierge-v2-phase2"])


def _now_iso() -> str: return datetime.now(timezone.utc).isoformat()


# ═══ Outlet hours (persisted) ═══════════════════════════════════════════════
DEFAULT_OUTLETS: List[Dict[str, Any]] = [
    {"id": "o-sotogrande", "name": "Sotogrande", "type": "fine-dining", "cuisine": "Modern Spanish",
     "hours": {"mon": "17:00-23:00", "tue": "17:00-23:00", "wed": "17:00-23:00", "thu": "17:00-23:00",
               "fri": "17:00-00:00", "sat": "11:00-00:00", "sun": "11:00-22:00"},
     "phone": "ext. 4201", "reservations_required": True, "dress_code": "smart"},
    {"id": "o-atrium", "name": "Atrium Lounge", "type": "bar", "cuisine": "Cocktail + light bites",
     "hours": {"mon": "16:00-01:00", "tue": "16:00-01:00", "wed": "16:00-01:00", "thu": "16:00-01:00",
               "fri": "16:00-02:00", "sat": "14:00-02:00", "sun": "14:00-00:00"},
     "phone": "ext. 4202", "reservations_required": False, "dress_code": "casual"},
    {"id": "o-harbor", "name": "Harbor Terrace", "type": "casual", "cuisine": "Seafood + grill",
     "hours": {"mon": "11:30-22:00", "tue": "11:30-22:00", "wed": "11:30-22:00", "thu": "11:30-22:00",
               "fri": "11:30-23:00", "sat": "11:30-23:00", "sun": "11:30-22:00"},
     "phone": "ext. 4203", "reservations_required": True, "dress_code": "resort"},
    {"id": "o-palm-cafe", "name": "Palm Café", "type": "cafe", "cuisine": "Coffee + pastries",
     "hours": {"mon": "06:30-15:00", "tue": "06:30-15:00", "wed": "06:30-15:00", "thu": "06:30-15:00",
               "fri": "06:30-15:00", "sat": "07:00-16:00", "sun": "07:00-16:00"},
     "phone": "ext. 4204", "reservations_required": False, "dress_code": "casual"},
    {"id": "o-pool-bar", "name": "Cabana Pool Bar", "type": "poolside", "cuisine": "Light lunch + cocktails",
     "hours": {"mon": "11:00-19:00", "tue": "11:00-19:00", "wed": "11:00-19:00", "thu": "11:00-19:00",
               "fri": "11:00-20:00", "sat": "10:00-20:00", "sun": "10:00-20:00"},
     "phone": "ext. 4205", "reservations_required": False, "dress_code": "casual"},
]


class OutletUpsert(BaseModel):
    id: Optional[str] = None
    name: str
    type: str
    cuisine: str
    hours: Dict[str, str]
    phone: Optional[str] = None
    reservations_required: bool = False
    dress_code: Optional[str] = None


def _seed_outlets_once():
    from database import db as _db
    if _db.concierge_outlets.count_documents({}) == 0:
        for o in DEFAULT_OUTLETS:
            _db.concierge_outlets.insert_one({**o, "seeded": True, "updated_at": _now_iso()})


@router.get("/api/concierge-v2/outlets")
async def list_outlets():
    from database import db as _db
    _seed_outlets_once()
    items = list(_db.concierge_outlets.find({}, {"_id": 0}).sort("name", 1))
    return {"ok": True, "total": len(items), "outlets": items}


@router.post("/api/concierge-v2/outlets/upsert")
async def upsert_outlet(body: OutletUpsert):
    from database import db as _db
    if body.id:
        existing = _db.concierge_outlets.find_one({"id": body.id}, {"_id": 0})
        if not existing: raise HTTPException(404, "outlet not found")
        update = {**body.dict(exclude_unset=True), "updated_at": _now_iso()}
        _db.concierge_outlets.update_one({"id": body.id}, {"$set": update})
        return {"ok": True, "outlet": _db.concierge_outlets.find_one({"id": body.id}, {"_id": 0})}
    rec = {**body.dict(exclude_unset=True), "id": uuid.uuid4().hex[:10], "created_at": _now_iso(), "updated_at": _now_iso()}
    _db.concierge_outlets.insert_one(rec.copy())
    return {"ok": True, "outlet": rec}


# ═══ Dining reservations (with table preferences) ═══════════════════════════
class DiningReservationCreate(BaseModel):
    guest_id: str
    outlet_id: str
    party_size: int = Field(..., ge=1, le=20)
    when: str  # ISO or "YYYY-MM-DD HH:MM"
    table_preference: Optional[str] = None  # "window", "booth", "patio", "bar"
    dietary_notes: Optional[str] = None
    occasion: Optional[str] = None  # "anniversary", "birthday", "business"
    notes: Optional[str] = None


@router.post("/api/concierge-v2/dining/reserve")
async def dining_reserve(body: DiningReservationCreate):
    from database import db as _db
    from routes.echo_concierge_v2 import _find_guest
    guest = _find_guest(body.guest_id)
    outlet = _db.concierge_outlets.find_one({"id": body.outlet_id}, {"_id": 0})
    if not outlet: raise HTTPException(404, "outlet not found")

    # Deterministic table assignment for MVP
    idx = abs(hash(body.outlet_id + body.when + body.guest_id)) % 24 + 1
    table_no = f"T{idx:02d}"

    rec = {
        "id": uuid.uuid4().hex[:12],
        "guest_id": guest["id"], "guest_name": guest["name"], "room": guest["room"],
        "outlet_id": outlet["id"], "outlet_name": outlet["name"],
        "party_size": body.party_size, "when": body.when,
        "table_number": table_no, "table_preference": body.table_preference,
        "dietary_notes": body.dietary_notes or ", ".join(guest.get("dietary", [])),
        "occasion": body.occasion, "notes": body.notes,
        "status": "confirmed", "created_at": _now_iso(),
    }
    _db.concierge_dining_reservations.insert_one(rec.copy())
    return {"ok": True, "reservation": rec}


@router.get("/api/concierge-v2/dining/availability")
async def dining_availability(outlet_id: str, date: str, time: str):
    """Deterministic pseudo-table map for MVP (24 tables, subset near windows/bars)."""
    tables = []
    for i in range(1, 25):
        kind = "window" if i <= 6 else "booth" if i <= 12 else "main" if i <= 20 else "bar"
        booked = (abs(hash(outlet_id + date + time + str(i))) % 100) < 35
        tables.append({"table_no": f"T{i:02d}", "kind": kind, "available": not booked, "seats": 2 if kind == "bar" else 4 if kind == "booth" else 6})
    return {"ok": True, "outlet_id": outlet_id, "date": date, "time": time, "tables": tables,
            "summary": {"total": len(tables), "available": sum(1 for t in tables if t["available"])}}


@router.get("/api/concierge-v2/dining/history")
async def dining_history(guest_id: str, limit: int = 10):
    from database import db as _db
    items = list(_db.concierge_dining_reservations.find({"guest_id": guest_id}, {"_id": 0}).sort("when", -1).limit(limit))
    return {"ok": True, "total": len(items), "history": items}


# ═══ Rooms — availability + upgrade candidates ══════════════════════════════
DEFAULT_ROOMS: List[Dict[str, Any]] = [
    # tier: standard | deluxe | suite | presidential
    {"room": "1201", "tier": "suite",        "view": "beach-front",  "bed": "king",  "max_pax": 3, "feat": ["balcony", "soaking tub"]},
    {"room": "1202", "tier": "suite",        "view": "beach-front",  "bed": "king",  "max_pax": 3, "feat": ["balcony"]},
    {"room": "0808", "tier": "standard",     "view": "city",         "bed": "queen", "max_pax": 2, "feat": []},
    {"room": "0810", "tier": "deluxe",       "view": "partial-ocean","bed": "king",  "max_pax": 2, "feat": ["balcony"]},
    {"room": "1414", "tier": "deluxe",       "view": "ocean",        "bed": "king",  "max_pax": 4, "feat": ["balcony", "connecting"]},
    {"room": "2002", "tier": "presidential", "view": "panoramic",    "bed": "king",  "max_pax": 6, "feat": ["butler", "terrace", "dining room"]},
    {"room": "0502", "tier": "standard",     "view": "garden",       "bed": "2x queen", "max_pax": 4, "feat": ["connecting"]},
    {"room": "1805", "tier": "suite",        "view": "ocean",        "bed": "king",  "max_pax": 3, "feat": ["balcony", "fireplace"]},
]


@router.get("/api/concierge-v2/rooms")
async def list_rooms():
    return {"ok": True, "total": len(DEFAULT_ROOMS), "rooms": DEFAULT_ROOMS}


@router.get("/api/concierge-v2/rooms/upgrades")
async def upgrade_candidates(current_room: str):
    tier_order = {"standard": 0, "deluxe": 1, "suite": 2, "presidential": 3}
    cur = next((r for r in DEFAULT_ROOMS if r["room"] == current_room), None)
    if not cur: raise HTTPException(404, f"room {current_room} not found")
    cur_tier = tier_order.get(cur["tier"], 0)
    candidates = [r for r in DEFAULT_ROOMS if tier_order.get(r["tier"], 0) > cur_tier]
    candidates.sort(key=lambda r: tier_order.get(r["tier"], 0))
    return {"ok": True, "current": cur, "upgrades": candidates[:5]}


# ═══ IRD Amenities ══════════════════════════════════════════════════════════
IRD_AMENITIES: List[Dict[str, Any]] = [
    {"id": "a-1", "name": "Champagne welcome",      "category": "beverage",  "price": 85,  "lead_min": 20, "tags": ["celebration", "vip"]},
    {"id": "a-2", "name": "Fresh fruit basket",     "category": "snack",     "price": 35,  "lead_min": 15, "tags": ["welcome"]},
    {"id": "a-3", "name": "Chocolate-dipped strawberries", "category": "dessert", "price": 55, "lead_min": 30, "tags": ["celebration", "romance"]},
    {"id": "a-4", "name": "Cheese and charcuterie", "category": "snack",     "price": 75,  "lead_min": 25, "tags": ["welcome", "vip"]},
    {"id": "a-5", "name": "Signature mocktail set", "category": "beverage",  "price": 40,  "lead_min": 15, "tags": ["family"]},
    {"id": "a-6", "name": "Aromatherapy pillow kit","category": "wellness",  "price": 60,  "lead_min": 10, "tags": ["spa", "relaxation"]},
    {"id": "a-7", "name": "Kids welcome kit",       "category": "family",    "price": 30,  "lead_min": 20, "tags": ["family", "kids"]},
    {"id": "a-8", "name": "Rose petal turndown",    "category": "turndown",  "price": 45,  "lead_min": 60, "tags": ["romance", "celebration"]},
    {"id": "a-9", "name": "Late-night sweet tray",  "category": "dessert",   "price": 25,  "lead_min": 15, "tags": ["turndown"]},
    {"id": "a-10","name": "Premium minibar restock","category": "beverage",  "price": 95,  "lead_min": 30, "tags": ["vip"]},
]


@router.get("/api/concierge-v2/ird/amenities")
async def ird_amenities(tag: Optional[str] = None, category: Optional[str] = None):
    items = IRD_AMENITIES
    if tag: items = [a for a in items if tag in a.get("tags", [])]
    if category: items = [a for a in items if a["category"] == category]
    return {"ok": True, "total": len(items), "amenities": items}


# ═══ Transport — Uber/Lyft + luxury options ═════════════════════════════════
class TransportRequestCreate(BaseModel):
    guest_id: str
    pickup_location: str
    dropoff_location: str
    when: str
    service: str  # "uber-x", "uber-black", "lyft-standard", "luxury-sedan", "luxury-suv", "golf-cart", "helicopter", "boat"
    party_size: int = 1
    notes: Optional[str] = None


TRANSPORT_OPTIONS: List[Dict[str, Any]] = [
    {"service": "uber-x",          "label": "Uber · UberX",        "eta_min": 6,  "est_cost": 22, "tier": "standard"},
    {"service": "uber-black",      "label": "Uber · Black",        "eta_min": 9,  "est_cost": 58, "tier": "premium"},
    {"service": "lyft-standard",   "label": "Lyft · Standard",     "eta_min": 5,  "est_cost": 20, "tier": "standard"},
    {"service": "lyft-lux",        "label": "Lyft · Lux",          "eta_min": 10, "est_cost": 62, "tier": "premium"},
    {"service": "luxury-sedan",    "label": "House Luxury Sedan",  "eta_min": 15, "est_cost": 120,"tier": "luxury"},
    {"service": "luxury-suv",      "label": "House Luxury SUV",    "eta_min": 18, "est_cost": 180,"tier": "luxury"},
    {"service": "golf-cart",       "label": "Property golf cart",  "eta_min": 3,  "est_cost": 0,  "tier": "internal"},
    {"service": "boat",            "label": "Marina boat transfer","eta_min": 25, "est_cost": 350,"tier": "luxury"},
    {"service": "helicopter",      "label": "Aerial Wings Heli",   "eta_min": 45, "est_cost": 2400,"tier": "luxury"},
]


@router.get("/api/concierge-v2/transport/options")
async def transport_options():
    return {"ok": True, "options": TRANSPORT_OPTIONS}


@router.post("/api/concierge-v2/transport/request")
async def transport_request(body: TransportRequestCreate):
    from database import db as _db
    from routes.echo_concierge_v2 import _find_guest
    guest = _find_guest(body.guest_id)
    rec = {
        "id": uuid.uuid4().hex[:12],
        "guest_id": guest["id"], "guest_name": guest["name"], "room": guest["room"],
        "pickup_location": body.pickup_location, "dropoff_location": body.dropoff_location,
        "when": body.when, "service": body.service, "party_size": body.party_size,
        "notes": body.notes, "status": "dispatched", "created_at": _now_iso(),
    }
    _db.concierge_transport_requests.insert_one(rec.copy())
    return {"ok": True, "request": rec}


# ═══ Celebration Composer — cross-module cascade ════════════════════════════
class CelebrationCreate(BaseModel):
    guest_id: str
    celebration: str  # anniversary | proposal | birthday | honeymoon | milestone
    date: str
    notes: Optional[str] = None


@router.post("/api/concierge-v2/celebration/compose")
async def compose_celebration(body: CelebrationCreate):
    """One call creates a parent 'celebration' concierge request + 4 downstream tickets
    across pastry, housekeeping, florist vendor, and amenity routing."""
    from database import db as _db
    from routes.echo_concierge_v2 import _find_guest
    guest = _find_guest(body.guest_id)

    # Parent record
    parent_id = uuid.uuid4().hex[:12]
    parent = {
        "id": parent_id,
        "guest_id": guest["id"], "guest_name": guest["name"], "guest_room": guest["room"],
        "vip_tier": guest["vip_tier"], "kind": "celebration", "celebration": body.celebration,
        "summary": f"{body.celebration.title()} setup · {guest['name']} · room {guest['room']}",
        "priority": "high", "status": "in_progress", "revenue_estimate": 350,
        "actual_revenue": 0, "scheduled_for": body.date, "notes": body.notes,
        "created_at": _now_iso(), "updated_at": _now_iso(),
        "cascade_child_ids": [],
    }

    # Cascade children
    children = []
    # 1. Pastry production ticket (anniversary → pastry cake; birthday → pastry birthday cake)
    if body.celebration in ("anniversary", "birthday", "honeymoon", "milestone", "proposal"):
        pastry_kind = {"anniversary": "anniversary cake", "birthday": "birthday cake",
                       "honeymoon": "welcome dessert plate", "milestone": "celebration cake",
                       "proposal": "champagne dessert"}[body.celebration]
        child = {"id": uuid.uuid4().hex[:12], "parent_id": parent_id, "dept": "pastry",
                 "title": f"Produce {pastry_kind}", "for_guest": guest["name"], "for_room": guest["room"],
                 "due_date": body.date, "status": "queued", "created_at": _now_iso()}
        _db.pastry_production_reminders.insert_one({**child, "pickup_date": body.date, "title": child["title"], "client_name": guest["name"]})
        children.append(child)
    # 2. Housekeeping turndown prep
    hk = {"id": uuid.uuid4().hex[:12], "parent_id": parent_id, "dept": "housekeeping",
          "title": f"{body.celebration.title()} turndown setup", "room_no": guest["room"],
          "scheduled_for": body.date, "kind": "celebration-prep", "status": "queued",
          "created_at": _now_iso()}
    _db.hskp_tasks.insert_one({**hk, "title": hk["title"], "status": hk["status"], "scheduled_for": body.date})
    children.append(hk)
    # 3. Florist vendor request
    florist = {"id": uuid.uuid4().hex[:12], "parent_id": parent_id, "dept": "florist",
               "title": "Floral setup (rose + white lily)", "vendor_id": "v-3",
               "scheduled_for": body.date, "status": "queued", "created_at": _now_iso()}
    _db.concierge_vendor_requests.insert_one(florist.copy())
    children.append(florist)
    # 4. Amenity routing (rose petal turndown for romance, sweet tray for birthday)
    amenity_id = "a-8" if body.celebration in ("anniversary", "honeymoon", "proposal") else "a-9"
    amen = {"id": uuid.uuid4().hex[:12], "parent_id": parent_id, "dept": "ird",
            "title": "Route IRD amenity", "amenity_id": amenity_id, "room_no": guest["room"],
            "scheduled_for": body.date, "status": "queued", "created_at": _now_iso()}
    _db.concierge_amenity_routes.insert_one(amen.copy())
    children.append(amen)

    parent["cascade_child_ids"] = [c["id"] for c in children]
    _db.concierge_v2_requests.insert_one(parent.copy())

    return {"ok": True, "celebration_id": parent_id, "cascade": {"pastry": 1, "housekeeping": 1, "florist": 1, "amenity": 1},
            "parent": parent, "children": children}


@router.get("/api/concierge-v2/celebration/cascade")
async def celebration_cascade(celebration_id: str):
    """Return the parent + its cascade children for the Prep-cascade UI view."""
    from database import db as _db
    parent = _db.concierge_v2_requests.find_one({"id": celebration_id}, {"_id": 0})
    if not parent: raise HTTPException(404, "celebration not found")
    children = []
    for cid in parent.get("cascade_child_ids") or []:
        for coll in ("pastry_production_reminders", "hskp_tasks", "concierge_vendor_requests", "concierge_amenity_routes"):
            row = getattr(_db, coll).find_one({"id": cid}, {"_id": 0})
            if row:
                row["_collection"] = coll
                children.append(row)
                break
    return {"ok": True, "parent": parent, "children": children}


# ═══ Service Recovery ═══════════════════════════════════════════════════════
class RecoveryCreate(BaseModel):
    guest_id: str
    category: str  # "room" | "dining" | "vendor" | "weather" | "reservation" | "other"
    description: str = Field(..., min_length=3)
    severity: str = "normal"  # low | normal | high | critical
    compensation_proposed: Optional[str] = None


@router.post("/api/concierge-v2/recovery/open")
async def open_recovery(body: RecoveryCreate):
    from database import db as _db
    from routes.echo_concierge_v2 import _find_guest
    guest = _find_guest(body.guest_id)
    rec = {
        "id": uuid.uuid4().hex[:12],
        "guest_id": guest["id"], "guest_name": guest["name"], "room": guest["room"],
        "vip_tier": guest["vip_tier"], "category": body.category,
        "description": body.description, "severity": body.severity,
        "compensation_proposed": body.compensation_proposed,
        "status": "open", "outcome": None,
        "created_at": _now_iso(), "updated_at": _now_iso(),
    }
    _db.concierge_recovery_cases.insert_one(rec.copy())
    return {"ok": True, "case": rec}


@router.get("/api/concierge-v2/recovery/cases")
async def list_recovery(status: Optional[str] = None, limit: int = 50):
    from database import db as _db
    q = {} if not status else {"status": status}
    items = list(_db.concierge_recovery_cases.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"ok": True, "total": len(items), "cases": items}


# ═══ Guest Folio stub ═══════════════════════════════════════════════════════
@router.get("/api/guest/folio")
async def guest_folio(guest_id: str):
    """Minimal folio roll-up: recent dining, recent requests, total spend estimate."""
    from database import db as _db
    from routes.echo_concierge_v2 import _find_guest
    guest = _find_guest(guest_id)
    dining = list(_db.concierge_dining_reservations.find({"guest_id": guest["id"]}, {"_id": 0}).sort("when", -1).limit(10))
    requests = list(_db.concierge_v2_requests.find({"guest_id": guest["id"]}, {"_id": 0}).sort("created_at", -1).limit(10))
    recovery = list(_db.concierge_recovery_cases.find({"guest_id": guest["id"]}, {"_id": 0}).sort("created_at", -1).limit(5))
    spend_actual = sum(float(r.get("actual_revenue") or 0) for r in requests)
    spend_est = sum(float(r.get("revenue_estimate") or 0) for r in requests)
    return {
        "ok": True,
        "guest": guest,
        "folio": {
            "dining_reservations": dining, "requests": requests, "recovery_cases": recovery,
            "spend_actual": round(spend_actual, 2), "spend_estimated": round(spend_est, 2),
            "counts": {"dining": len(dining), "requests": len(requests), "recovery": len(recovery)},
        },
    }


# ═══ EchoCommand SolveBar — hotkey-driven tailored resolution ══════════════
class SolveRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=600)
    guest_hint: Optional[str] = None  # optional guest name or room# already identified


SOLVE_SYSTEM_PROMPT = """You are EchoCommand SolveBar — the concierge's lightning-fast decision engine.

The concierge types a free-form problem, optionally prefixed with a guest name or room number. You respond with a single JSON object (no prose, no markdown) that gives a DECISIVE, 1-3 click resolution.

Schema:
{
  "headline": "<one-sentence problem restatement>",
  "root_cause": "<2-3 words classifying the issue>",
  "recommended_action": {
    "title": "<primary action the concierge should take right now>",
    "api_hint": "<which concierge-v2 endpoint to call: dining/reserve, transport/request, celebration/compose, recovery/open, ird-amenity, room-upgrade, notes-only>",
    "prefill": { /* parameters prefilled for that endpoint, e.g. {outlet_id, when, table_preference} */ }
  },
  "alternatives": [
    {"title": "<backup action 1>", "why": "<when to use this instead>"},
    {"title": "<backup action 2>", "why": "<...>"}
  ],
  "guest_line": "<OPTIONAL: a natural, confident sentence the concierge can say out loud to the guest>",
  "confidence": 0.0-1.0
}

Rules:
- Prefer 1-click over 3-click. Assume concierge is mid-conversation with guest.
- If a compensation is implied (complaint, delay), always propose it in root_cause + recommended_action.
- Match api_hint to EXACTLY one of the supplied values.
- guest_line must sound warm and empowered, never robotic.
- confidence is your certainty in the primary recommendation."""


@router.post("/api/concierge-v2/solve")
async def solve(body: SolveRequest):
    import os, re, json as jsonlib
    from database import db as _db
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(503, "EMERGENT_LLM_KEY not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError as e:
        raise HTTPException(503, f"emergentintegrations not installed: {e}")

    hint = f"\nGUEST HINT (pre-identified): {body.guest_hint}" if body.guest_hint else ""
    ctx = f"CONCIERGE TYPED: {body.query}{hint}"
    session_id = f"solve-{uuid.uuid4().hex[:8]}"
    chat = LlmChat(api_key=key, session_id=session_id, system_message=SOLVE_SYSTEM_PROMPT).with_model(
        "anthropic", "claude-sonnet-4-5-20250929")
    try:
        raw = await chat.send_message(UserMessage(text=ctx))
    except Exception as e:
        raise HTTPException(502, f"LLM failed: {str(e)[:140]}")

    txt = (raw or "").strip()
    if txt.startswith("```"):
        txt = re.sub(r"^```(?:json)?\n?", "", txt); txt = re.sub(r"\n?```$", "", txt)
    m = re.search(r"(\{.*\})", txt, flags=re.DOTALL)
    parsed: Dict[str, Any] = {}
    if m:
        try: parsed = jsonlib.loads(m.group(1))
        except jsonlib.JSONDecodeError: pass
    if not parsed:
        try: parsed = jsonlib.loads(txt)
        except Exception: parsed = {"headline": body.query, "root_cause": "parse-error", "recommended_action": {"title": "Review manually", "api_hint": "notes-only", "prefill": {}}, "alternatives": [], "confidence": 0.3}

    # Persist for audit
    _db.concierge_solve_sessions.insert_one({"id": session_id, "query": body.query, "guest_hint": body.guest_hint,
                                             "resolution": parsed, "created_at": _now_iso()})
    return {"ok": True, "session_id": session_id, "resolution": parsed}
