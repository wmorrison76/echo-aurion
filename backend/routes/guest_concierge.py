"""
iter183 · Guest Concierge Mobile — property-aware services app

A richer layer on top of `concierge_mobile.py` focused on the GUEST's experience
on-property: venue directory, maps, valet, transport, luggage, nearby.

Auth:
  POST /api/guest-concierge/authenticate {room, last_name}
    → returns a 48h session token + guest bundle (if match found in
      concierge_guests by case-insensitive last_name + room match)

Guest endpoints (token via `X-Guest-Token` header):
  GET  /session              — rehydrate session
  GET  /venues               — on-property venues (dining/spa/pool/etc.)
  GET  /map                  — property map metadata
  POST /valet                — request car; auto sets 10-min ETA + timer
  POST /transport            — internal transport (golf-cart / shuttle)
  POST /luggage              — luggage pickup with pickup_time + drop location
  GET  /requests             — list my active requests
  GET  /nearby               — curated local restaurants + attractions
  POST /location             — share current geolocation (for guided nav)

Admin endpoints (X-Admin-Token):
  POST /venues/upsert        — add/update a venue (name, type, hours, photo, coords)
  POST /nearby/upsert        — add/update a nearby place
  GET  /admin/requests       — all pending valet/transport/luggage requests
  POST /admin/requests/{id}/ack — mark request in_progress/completed

Data stored separately from employee PII:
  - concierge_venues, concierge_nearby, concierge_guest_sessions, concierge_service_requests
"""
from __future__ import annotations

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/guest-concierge", tags=["guest-concierge"])

SESSION_TTL_HOURS = 48


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


def _auth_guest(x_guest_token: Optional[str]) -> Dict[str, Any]:
    if not x_guest_token:
        raise HTTPException(401, "guest token required")
    from database import db as _db
    s = _db.concierge_guest_sessions.find_one({"token": x_guest_token}, {"_id": 0})
    if not s:
        raise HTTPException(401, "invalid guest session")
    exp = s.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            _db.concierge_guest_sessions.delete_one({"token": x_guest_token})
            raise HTTPException(410, "guest session expired")
    g = _db.concierge_guests.find_one({"id": s["guest_id"]}, {"_id": 0})
    if not g:
        raise HTTPException(404, "guest record vanished")
    # Property scoping (D12a): the guest's property_id was set at check-in
    # by the front desk (or the room-block PMS sync). If absent we leave it
    # None and the listing endpoints will fall back to their pre-D12a
    # behavior — return everything — so single-property deployments and
    # un-migrated guest records keep working.
    return {"session": s, "guest": g, "property_id": g.get("property_id")}


# ─── Authenticate (room + last name) ───────────────────────────────────────
class AuthBody(BaseModel):
    room: str
    last_name: str


def _guest_matches(g: Dict[str, Any], room: str, last_name: str) -> bool:
    g_room = str(g.get("room") or "").strip().lower()
    if g_room != room.strip().lower():
        return False
    full = (g.get("display_name") or g.get("name") or "").lower()
    return last_name.strip().lower() in full


@router.post("/authenticate")
async def authenticate(body: AuthBody):
    from database import db as _db
    if not body.room or not body.last_name:
        raise HTTPException(400, "room and last_name required")
    for g in _db.concierge_guests.find({}, {"_id": 0}).limit(500):
        if _guest_matches(g, body.room, body.last_name):
            tok = secrets.token_urlsafe(24)
            _db.concierge_guest_sessions.insert_one({
                "token": tok, "guest_id": g["id"],
                "expires_at": _now() + timedelta(hours=SESSION_TTL_HOURS),
                "created_at": _now(), "source": "room-last-name",
            })
            return {"ok": True, "token": tok,
                    "guest": {"id": g["id"], "name": g.get("display_name") or g.get("name"),
                              "room": g.get("room"), "vip_tier": g.get("vip_tier"),
                              "check_in": g.get("check_in"), "check_out": g.get("check_out")}}
    raise HTTPException(404, "no matching reservation — double-check your room number and last name")


@router.get("/session")
async def session(x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    g = ctx["guest"]
    return {"ok": True, "guest": {
        "id": g["id"], "name": g.get("display_name") or g.get("name"),
        "room": g.get("room"), "vip_tier": g.get("vip_tier"),
        "check_in": g.get("check_in"), "check_out": g.get("check_out"),
        "celebration": (g.get("preferences") or {}).get("celebration"),
    }}


# ─── Venues (on-property) ─────────────────────────────────────────────────
class VenueUpsert(BaseModel):
    id: Optional[str] = None
    slug: str  # e.g. "marina-grill"
    name: str
    category: str  # dining | bar | spa | pool | fitness | retail | event-space | concierge-desk
    summary: Optional[str] = ""
    hours: Optional[str] = ""
    photo_url: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    floor: Optional[str] = ""
    building: Optional[str] = ""
    dress_code: Optional[str] = ""
    reservation_required: bool = False
    phone_extension: Optional[str] = ""
    display_order: int = 100
    active: bool = True
    external_reservation_url: Optional[str] = None   # OpenTable / Resy / Tock deep-link
    menu_qr_url: Optional[str] = None                # Public menu + allergens QR
    property_id: Optional[str] = None                # property scoping (D12a)
    outlet_id: Optional[str] = None                  # links a venue to an internal outlet


@router.post("/venues/upsert")
async def upsert_venue(body: VenueUpsert, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    doc = body.model_dump()
    slug = doc["slug"].strip().lower().replace(" ", "-")
    doc["slug"] = slug
    doc["updated_at"] = _now_iso()
    existing = _db.concierge_venues.find_one({"slug": slug}, {"_id": 0})
    if existing:
        doc["id"] = existing["id"]
        doc["created_at"] = existing.get("created_at") or _now_iso()
        _db.concierge_venues.update_one({"slug": slug}, {"$set": doc})
    else:
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.concierge_venues.insert_one(doc.copy())
    return {"ok": True, "venue": _db.concierge_venues.find_one({"slug": slug}, {"_id": 0})}


def _venue_query(property_id: Optional[str], extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Build a venue query that scopes to property_id when present, while
    still surfacing legacy un-tagged rows (property_id missing or None) so
    a freshly-deployed property doesn't go blank during the migration.

    Pre-D12a venues had no property_id; we treat those as "shared / any
    property" until the lifestyle director tags them."""
    q: Dict[str, Any] = {"active": True}
    if property_id:
        q["$or"] = [{"property_id": property_id},
                    {"property_id": None},
                    {"property_id": {"$exists": False}}]
    if extra:
        q.update(extra)
    return q


@router.get("/venues")
async def list_venues(x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    items = list(_db.concierge_venues
                 .find(_venue_query(ctx.get("property_id")), {"_id": 0})
                 .sort([("display_order", 1), ("name", 1)]).limit(200))
    return {"ok": True, "total": len(items), "venues": items,
            "property_id": ctx.get("property_id")}


@router.get("/map")
async def property_map(x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    pid = ctx.get("property_id")
    # Look up property meta by guest's property_id; fall back to "default"
    # so demo deploys without per-property meta still render.
    cfg = (_db.concierge_property_meta.find_one({"id": pid}, {"_id": 0}) if pid else None) \
          or _db.concierge_property_meta.find_one({"id": "default"}, {"_id": 0}) or {}
    q = _venue_query(pid, {"lat": {"$ne": None}})
    venues = list(_db.concierge_venues.find(q, {"_id": 0}))
    return {"ok": True,
            "property_id": pid,
            "property_name": cfg.get("name") or "Luccca Resort",
            "center_lat": cfg.get("lat"), "center_lng": cfg.get("lng"),
            "map_image_url": cfg.get("map_image_url") or "",
            "hero_image_url": cfg.get("hero_image_url") or "",
            "venues": venues}


# ─── Services ─────────────────────────────────────────────────────────────
class ValetRequest(BaseModel):
    pickup_minutes: int = 10  # default 10-min
    vehicle_note: Optional[str] = None


class TransportRequest(BaseModel):
    from_location: str
    to_location: str
    party_size: int = 1
    when: str = "now"  # "now" or ISO 8601 or "in 10 min"


class LuggageRequest(BaseModel):
    pickup_location: str
    pickup_time: str = "now"
    bag_count: int = 1
    notes: Optional[str] = None


def _request_doc(kind: str, guest: Dict[str, Any], payload: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": uuid.uuid4().hex[:12],
        "kind": kind,
        "guest_id": guest["id"],
        "guest_name": guest.get("display_name") or guest.get("name"),
        "room": guest.get("room"),
        "status": "pending",
        "source": "guest-concierge-mobile",
        "payload": payload,
        "created_at": _now_iso(),
    }


@router.post("/valet")
async def request_valet(body: ValetRequest, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    minutes = max(1, min(60, int(body.pickup_minutes)))
    eta_iso = (_now() + timedelta(minutes=minutes)).isoformat()
    doc = _request_doc("valet", ctx["guest"], {"pickup_minutes": minutes, "eta": eta_iso,
                                               "vehicle_note": body.vehicle_note or ""})
    _db.concierge_service_requests.insert_one(doc.copy())
    return {"ok": True, "request_id": doc["id"], "eta": eta_iso,
            "message": f"Valet notified. Your car will be at the front entrance in {minutes} minutes."}


@router.post("/transport")
async def request_transport(body: TransportRequest, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    doc = _request_doc("transport", ctx["guest"], body.model_dump())
    _db.concierge_service_requests.insert_one(doc.copy())
    return {"ok": True, "request_id": doc["id"],
            "message": f"Internal transport requested from {body.from_location} → {body.to_location}."}


@router.post("/luggage")
async def request_luggage(body: LuggageRequest, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    doc = _request_doc("luggage", ctx["guest"], body.model_dump())
    _db.concierge_service_requests.insert_one(doc.copy())
    return {"ok": True, "request_id": doc["id"],
            "message": f"Bell stand notified — {body.bag_count} bag(s) from {body.pickup_location}."}


@router.get("/requests")
async def my_requests(x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    items = list(_db.concierge_service_requests.find(
        {"guest_id": ctx["guest"]["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(30))
    return {"ok": True, "total": len(items), "requests": items}


# ─── Nearby (local, company-last) ─────────────────────────────────────────
class NearbyUpsert(BaseModel):
    id: Optional[str] = None
    slug: str
    name: str
    category: str  # restaurant | attraction | shopping | medical | transport
    summary: Optional[str] = ""
    distance_km: Optional[float] = None
    rating: Optional[float] = None
    phone: Optional[str] = ""
    photo_url: Optional[str] = ""
    map_url: Optional[str] = ""
    display_order: int = 100
    active: bool = True
    property_id: Optional[str] = None  # which property this is "near" (D12a)


@router.post("/nearby/upsert")
async def upsert_nearby(body: NearbyUpsert, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    doc = body.model_dump()
    slug = doc["slug"].strip().lower().replace(" ", "-")
    doc["slug"] = slug
    doc["updated_at"] = _now_iso()
    existing = _db.concierge_nearby.find_one({"slug": slug}, {"_id": 0})
    if existing:
        doc["id"] = existing["id"]
        doc["created_at"] = existing.get("created_at") or _now_iso()
        _db.concierge_nearby.update_one({"slug": slug}, {"$set": doc})
    else:
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.concierge_nearby.insert_one(doc.copy())
    return {"ok": True, "nearby": _db.concierge_nearby.find_one({"slug": slug}, {"_id": 0})}


@router.get("/nearby")
async def list_nearby(category: Optional[str] = None, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    q: Dict[str, Any] = {"active": True}
    if category: q["category"] = category
    pid = ctx.get("property_id")
    if pid:
        q["$or"] = [{"property_id": pid},
                    {"property_id": None},
                    {"property_id": {"$exists": False}}]
    items = list(_db.concierge_nearby.find(q, {"_id": 0}).sort([("display_order", 1), ("name", 1)]).limit(200))
    return {"ok": True, "total": len(items), "nearby": items, "property_id": pid}


# ─── Location share (for guided nav) ──────────────────────────────────────
class GuestLocation(BaseModel):
    lat: float
    lng: float
    accuracy_m: Optional[float] = None


@router.post("/location")
async def set_location(body: GuestLocation, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    _db.concierge_guest_locations.insert_one({
        "id": uuid.uuid4().hex[:12],
        "guest_id": ctx["guest"]["id"],
        "lat": body.lat, "lng": body.lng, "accuracy_m": body.accuracy_m or 0,
        "created_at": _now(),
    })
    return {"ok": True}


# ─── Admin helpers ────────────────────────────────────────────────────────
@router.get("/admin/requests")
async def admin_requests(status: Optional[str] = None, limit: int = 100,
                         x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    q = {}
    if status: q["status"] = status
    items = list(_db.concierge_service_requests.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(items), "requests": items}


class AckBody(BaseModel):
    status: str  # "in_progress" | "completed" | "cancelled"
    note: Optional[str] = None


@router.post("/admin/requests/{request_id}/ack")
async def ack_request(request_id: str, body: AckBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.concierge_service_requests.update_one(
        {"id": request_id},
        {"$set": {"status": body.status, "note": body.note or "", "updated_at": _now_iso()},
         "$push": {"history": {"at": _now_iso(), "status": body.status, "note": body.note or ""}}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "request not found")
    return {"ok": True}


# ─── Property meta (photos, map image) ───────────────────────────────────
class PropertyMeta(BaseModel):
    id: Optional[str] = None  # property_id; "default" if omitted (D12a)
    name: str
    hero_image_url: Optional[str] = ""
    map_image_url: Optional[str] = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    welcome_copy: Optional[str] = ""
    brand_color: Optional[str] = "#c8a97e"


@router.post("/property/upsert")
async def upsert_property(body: PropertyMeta, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    doc = body.model_dump()
    doc["id"] = doc.get("id") or "default"
    doc["updated_at"] = _now_iso()
    _db.concierge_property_meta.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    return {"ok": True, "property": _db.concierge_property_meta.find_one({"id": doc["id"]}, {"_id": 0})}


# ─── Seeders ──────────────────────────────────────────────────────────────
def seed_guest_concierge():
    from database import db as _db
    if _db.concierge_venues.count_documents({}) > 0:
        return 0
    venues = [
        {"slug": "marina-grill", "name": "Marina Grill", "category": "dining", "cuisine": "steakhouse",
         "price_point": "$$$$", "family_friendly": False,
         "summary": "Signature steakhouse · floor-to-ceiling ocean views · dress-code smart casual.",
         "hours": "5:30p - 10:30p nightly", "floor": "Penthouse", "building": "Main Tower",
         "dress_code": "smart casual", "reservation_required": True,
         "phone_extension": "2100", "display_order": 10, "active": True,
         "allergen_qr_url": "/m/menu/marina-grill",
         "photo_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"},
        {"slug": "beach-club-pool", "name": "Beach Club Pool & Cabanas", "category": "pool", "cuisine": None,
         "price_point": "$$", "family_friendly": False,
         "summary": "Adult-only infinity pool · cabana service · DJ poolside 2-6p weekends.",
         "hours": "6:00a - 9:00p daily", "floor": "Deck 3", "display_order": 20, "active": True,
         "photo_url": "https://images.unsplash.com/photo-1540541338287-41700207dee6"},
        {"slug": "verdant-spa", "name": "Verdant Spa", "category": "spa", "cuisine": None,
         "price_point": "$$$$", "family_friendly": False,
         "summary": "12 treatment rooms · hammam · couple's suite. Book 24h ahead.",
         "hours": "9:00a - 8:00p", "floor": "Ground", "building": "Wellness Wing",
         "reservation_required": True, "phone_extension": "3000", "display_order": 30, "active": True,
         "photo_url": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874"},
        {"slug": "summit-gym", "name": "Summit Fitness Studio", "category": "fitness", "cuisine": None,
         "price_point": "free", "family_friendly": True,
         "summary": "24h access · Peloton bikes · free weights · personal training.",
         "hours": "24/7", "floor": "Level 4", "display_order": 40, "active": True,
         "photo_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48"},
        {"slug": "cellar-47", "name": "Cellar 47 Wine Bar", "category": "bar", "cuisine": "wine-bar",
         "price_point": "$$$", "family_friendly": False,
         "summary": "Curated 200-label wine list · cheese + charcuterie · live jazz Thu-Sat.",
         "hours": "4:00p - 12:00a", "floor": "Level 1", "display_order": 50, "active": True,
         "allergen_qr_url": "/m/menu/cellar-47",
         "photo_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3"},
        {"slug": "concierge-desk", "name": "Concierge Desk", "category": "concierge-desk",
         "cuisine": None, "price_point": None, "family_friendly": True,
         "summary": "Experiences · excursions · restaurant reservations · 24/7.",
         "hours": "24/7", "floor": "Lobby", "phone_extension": "0",
         "display_order": 1, "active": True, "photo_url": ""},
    ]
    for v in venues:
        v["id"] = uuid.uuid4().hex[:12]
        v["created_at"] = _now_iso(); v["updated_at"] = _now_iso()
        _db.concierge_venues.insert_one(v.copy())
    nearby = [
        {"slug": "chef-marcos", "name": "Chef Marco's Trattoria", "category": "restaurant",
         "summary": "Italian · 0.4 km · wood-fired pasta. Concierge can book.",
         "distance_km": 0.4, "rating": 4.7, "phone": "+1-555-0123",
         "display_order": 10, "active": True},
        {"slug": "tide-pool-walk", "name": "Tide Pool Walk", "category": "attraction",
         "summary": "Guided low-tide walk · meet at Beach Club · 8a + 4p daily.",
         "distance_km": 0.1, "rating": 4.9, "display_order": 20, "active": True},
        {"slug": "marina-village", "name": "Marina Village Shops", "category": "shopping",
         "summary": "Boutiques · galleries · 1.2 km · resort shuttle every 30 min.",
         "distance_km": 1.2, "rating": 4.5, "display_order": 30, "active": True},
    ]
    for n in nearby:
        n["id"] = uuid.uuid4().hex[:12]
        n["created_at"] = _now_iso(); n["updated_at"] = _now_iso()
        _db.concierge_nearby.insert_one(n.copy())
    # Default property meta
    _db.concierge_property_meta.update_one({"id": "default"}, {"$set": {
        "id": "default", "name": "Luccca Resort & Spa",
        "hero_image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945",
        "map_image_url": "",
        "welcome_copy": "Welcome to Luccca — a quiet luxury retreat between the mountains and the sea.",
        "brand_color": "#c8a97e",
        "updated_at": _now_iso(),
    }}, upsert=True)
    return len(venues) + len(nearby)
