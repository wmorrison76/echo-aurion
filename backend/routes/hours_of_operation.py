"""
iter173 · Hours of Operation Editor

Central source of truth for outlet/amenity hours. Seeded during onboarding,
easy to edit, auto-feeds Daily Standup "Hours" card + Concierge outlet lookup.

Routes under `/api/hours/*`. Admin-gated writes.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/hours", tags=["hours-of-operation"])

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

OUTLET_TYPES = [
    "restaurant", "bar", "lounge", "cafe", "pool-bar", "spa", "gym", "fitness",
    "retail", "kids-club", "marina", "activities", "business-center", "concierge",
    "valet", "front-desk", "executive-lounge", "room-service", "other",
]


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class OutletHours(BaseModel):
    id: Optional[str] = None
    name: str
    outlet_type: str = "restaurant"
    phone: Optional[str] = None
    location: Optional[str] = None
    reservations_required: bool = False
    reservations_url: Optional[str] = None
    # Per-weekday hours as "HH:MM-HH:MM" or "closed" or "24h"
    hours: Dict[str, str] = Field(default_factory=lambda: {w: "closed" for w in WEEKDAYS})
    notes: Optional[str] = None
    active: bool = True
    property: Optional[str] = "main"


def _validate_hours_string(h: str) -> str:
    h = (h or "").strip().lower()
    if h in ("closed", "24h", "24/7", ""): return h or "closed"
    # Accept "11:00-22:00" format
    if "-" in h:
        parts = h.split("-")
        if len(parts) == 2 and all(":" in p for p in parts):
            return h
    # Allow free-form (e.g. "11:00-14:00, 18:00-22:00") but at least require a digit
    if any(c.isdigit() for c in h): return h
    return "closed"


@router.post("/upsert")
async def upsert_outlet(o: OutletHours, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if o.outlet_type not in OUTLET_TYPES:
        raise HTTPException(400, f"unknown outlet_type '{o.outlet_type}'")
    from database import db as _db
    doc = o.model_dump()
    doc["hours"] = {w: _validate_hours_string(doc["hours"].get(w, "closed")) for w in WEEKDAYS}
    doc["updated_at"] = _now_iso()
    if not doc.get("id"):
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.outlet_hours.insert_one(doc.copy())
    else:
        _db.outlet_hours.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    return {"ok": True, "outlet": _db.outlet_hours.find_one({"id": doc["id"]}, {"_id": 0})}


@router.get("/list")
async def list_outlets(outlet_type: Optional[str] = None, active_only: bool = True):
    from database import db as _db
    q: Dict[str, Any] = {}
    if active_only: q["active"] = True
    if outlet_type: q["outlet_type"] = outlet_type
    items = list(_db.outlet_hours.find(q, {"_id": 0}).sort([("outlet_type", 1), ("name", 1)]))
    return {"ok": True, "total": len(items), "outlets": items,
            "weekdays": WEEKDAYS, "outlet_types": OUTLET_TYPES}


@router.get("/today")
async def hours_today(date_iso: Optional[str] = None):
    """Returns today's hours for every outlet — fuels Daily Standup 'hours' section."""
    from database import db as _db
    if date_iso:
        try: wd = datetime.strptime(date_iso, "%Y-%m-%d").weekday()
        except ValueError: raise HTTPException(400, "date_iso must be YYYY-MM-DD")
    else:
        wd = datetime.now(timezone.utc).weekday()
    key = WEEKDAYS[wd]
    rows = []
    for o in _db.outlet_hours.find({"active": True}, {"_id": 0}).sort([("outlet_type", 1), ("name", 1)]):
        rows.append({
            "outlet": o.get("name"),
            "type": o.get("outlet_type"),
            "today_hours": (o.get("hours") or {}).get(key, "closed"),
            "phone": o.get("phone"),
            "reservations_required": o.get("reservations_required", False),
        })
    return {"ok": True, "weekday": key, "outlets": rows, "total": len(rows)}


@router.post("/{outlet_id}/deactivate")
async def deactivate(outlet_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.outlet_hours.update_one({"id": outlet_id}, {"$set": {"active": False, "updated_at": _now_iso()}})
    if r.matched_count == 0: raise HTTPException(404, "outlet not found")
    return {"ok": True, "deactivated": outlet_id}


def seed_outlet_hours():
    """Idempotent seed — mirrors the 5 concierge outlets + adds spa/gym/retail/etc."""
    from database import db as _db
    if _db.outlet_hours.count_documents({}) > 0:
        return 0
    samples = [
        {"name": "Sotogrande", "outlet_type": "restaurant", "reservations_required": True,
         "hours": {"mon": "17:00-23:00", "tue": "17:00-23:00", "wed": "17:00-23:00", "thu": "17:00-23:00",
                   "fri": "17:00-00:00", "sat": "17:00-00:00", "sun": "17:00-22:00"}, "location": "Level 2"},
        {"name": "Atrium Lounge", "outlet_type": "lounge",
         "hours": {w: "14:00-02:00" for w in WEEKDAYS}, "location": "Lobby"},
        {"name": "Harbor Terrace", "outlet_type": "restaurant", "reservations_required": True,
         "hours": {"mon": "11:30-22:00", "tue": "11:30-22:00", "wed": "11:30-22:00", "thu": "11:30-22:00",
                   "fri": "11:30-23:00", "sat": "10:00-23:00", "sun": "10:00-22:00"}, "location": "Marina level"},
        {"name": "Palm Café", "outlet_type": "cafe",
         "hours": {w: "06:30-14:00" for w in WEEKDAYS}, "location": "Lobby"},
        {"name": "Cabana Pool Bar", "outlet_type": "pool-bar",
         "hours": {w: "10:00-18:00" for w in WEEKDAYS}, "location": "Pool deck"},
        {"name": "Serenity Spa", "outlet_type": "spa", "reservations_required": True,
         "hours": {w: "09:00-20:00" for w in WEEKDAYS}, "phone": "+1-555-0100"},
        {"name": "Fitness Center", "outlet_type": "gym",
         "hours": {w: "24h" for w in WEEKDAYS}},
        {"name": "Coastal Boutique", "outlet_type": "retail",
         "hours": {"mon": "10:00-19:00", "tue": "10:00-19:00", "wed": "10:00-19:00", "thu": "10:00-19:00",
                   "fri": "10:00-21:00", "sat": "10:00-21:00", "sun": "11:00-18:00"}},
        {"name": "Kids Club · Adventure Cove", "outlet_type": "kids-club",
         "hours": {w: "09:00-17:00" for w in WEEKDAYS}},
        {"name": "Valet", "outlet_type": "valet",
         "hours": {w: "24h" for w in WEEKDAYS}},
    ]
    for s in samples:
        s["id"] = uuid.uuid4().hex[:12]
        s["active"] = True
        s["property"] = "main"
        s["created_at"] = _now_iso()
        s["updated_at"] = _now_iso()
        _db.outlet_hours.insert_one(s)
    return len(samples)
