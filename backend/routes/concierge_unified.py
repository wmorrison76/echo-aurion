"""
D12a · Concierge Unified Feed — events + venues + nearby for any persona

The customer-admin design (per the founder): the guest concierge is the
"24/7 mobile information system" — events, hours, restaurants on-property
first, then external. The hourly staff concierge shares the *same view*
so a server can answer guest questions without flagging down a manager.
The salary/manager concierge gets the same view *plus* write capabilities
(amenity orders with cost+audit, guest-complaint ticket visibility) which
land in D12b.

This module owns:
  - the `concierge_events` collection (Director of Lifestyle creates events
    and happenings; they feed into every concierge surface)
  - `_resolve_concierge_scope()` — identity resolution for guest tokens,
    hourly staff (X-User-Id header → admin_users), and salary staff
  - GET `/api/concierge/feed` — single endpoint returning the curated
    bundle: events + on-property venues (promoted) + off-property nearby

The existing `/api/guest-concierge/*` routes (room+last-name auth) and
`/api/concierge/*` ticket routes continue to work; this module sits
alongside, not in front of them.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/concierge", tags=["concierge-unified"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _require_admin(x_admin_token: Optional[str]) -> None:
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected:
        return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


# ─── Persona resolution (guest | hourly | salary) ─────────────────────────

# Roles that get manager-tier concierge privileges (see D12b for the
# write paths that gate on this list). Keep in sync with access_matrix.
SALARY_ROLES = {
    "owner", "gm", "general-manager", "director", "f&b-director",
    "fb-director", "culinary-director", "executive-chef", "exec_chef",
    "executive_chef", "chef-de-cuisine", "cdc", "district-chef",
    "front-of-house-director", "foh-director",
}


def _resolve_concierge_scope(
    x_guest_token: Optional[str],
    x_user_id: Optional[str],
) -> Dict[str, Any]:
    """Resolve the caller to one of three personas.

      guest:   X-Guest-Token header → concierge_guest_sessions row →
               property_id from concierge_guests row (set at check-in).
      salary:  X-User-Id header → admin_users row whose role ∈ SALARY_ROLES.
               property_id derived from the user's first assigned outlet.
      hourly:  X-User-Id header → any other admin_users row.
               property_id derived the same way.

    Returns:
      {persona, property_id, guest_id?, user_id?, role?, outlet_ids?}

    Raises 401 if neither header is present or the lookup fails."""
    from database import db as _db

    if x_guest_token:
        s = _db.concierge_guest_sessions.find_one({"token": x_guest_token}, {"_id": 0})
        if not s:
            raise HTTPException(401, "invalid guest session")
        exp = s.get("expires_at")
        if isinstance(exp, datetime):
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < _now():
                raise HTTPException(410, "guest session expired")
        g = _db.concierge_guests.find_one({"id": s["guest_id"]}, {"_id": 0}) or {}
        return {
            "persona": "guest",
            "property_id": g.get("property_id"),
            "guest_id": g.get("id"),
            "guest_name": g.get("display_name") or g.get("name"),
            "room": g.get("room"),
        }

    if x_user_id:
        # Admin-onboarded user (the customer-admin profile builder writes
        # here via POST /api/admin/users).
        u = _db.admin_users.find_one({"user_id": x_user_id}, {"_id": 0}) \
            or _db.admin_users.find_one({"id": x_user_id}, {"_id": 0}) \
            or _db.user_roles.find_one({"user_id": x_user_id}, {"_id": 0})
        if not u:
            raise HTTPException(401, "unknown staff user")
        role = (u.get("role") or "").lower()
        outlet_ids = u.get("outlet_ids") or []
        # Property is the property of the first non-"all" outlet they
        # oversee — a CDC tagged to 4 outlets all within one resort lands
        # on that resort's concierge feed.
        property_id = None
        if outlet_ids and outlet_ids != ["all"]:
            outlet = _db.outlets.find_one({"outlet_id": outlet_ids[0]}, {"_id": 0}) \
                     or _db.outlets.find_one({"id": outlet_ids[0]}, {"_id": 0}) \
                     or {}
            property_id = outlet.get("property_id")
        persona = "salary" if role in SALARY_ROLES else "hourly"
        return {
            "persona": persona,
            "property_id": property_id,
            "user_id": u.get("user_id") or u.get("id"),
            "role": role,
            "outlet_ids": outlet_ids,
            "name": u.get("name"),
        }

    raise HTTPException(401, "concierge token or user_id required")


# ─── Events (the Director of Lifestyle's calendar) ────────────────────────

class EventUpsert(BaseModel):
    id: Optional[str] = None
    slug: str
    title: str
    summary: Optional[str] = ""
    starts_at: str           # ISO 8601 — when the event begins
    ends_at: Optional[str] = None
    location: Optional[str] = ""   # human label, e.g. "Beach Club Lawn"
    venue_slug: Optional[str] = None  # links to a concierge_venues row
    category: str = "happening"  # happening | live-music | class | tasting | excursion
    photo_url: Optional[str] = ""
    cta_label: Optional[str] = None  # "RSVP" | "Reserve" | "Walk in"
    cta_url: Optional[str] = None
    capacity: Optional[int] = None
    is_featured: bool = False
    property_id: Optional[str] = None  # which property hosts this event
    active: bool = True


@router.post("/events/upsert")
async def upsert_event(body: EventUpsert, x_admin_token: Optional[str] = Header(None)):
    """Director of Lifestyle endpoint: create / edit an event. The
    `concierge_events` collection feeds every concierge surface."""
    _require_admin(x_admin_token)
    from database import db as _db
    doc = body.model_dump()
    slug = doc["slug"].strip().lower().replace(" ", "-")
    doc["slug"] = slug
    doc["updated_at"] = _now_iso()
    existing = _db.concierge_events.find_one({"slug": slug}, {"_id": 0})
    if existing:
        doc["id"] = existing["id"]
        doc["created_at"] = existing.get("created_at") or _now_iso()
        _db.concierge_events.update_one({"slug": slug}, {"$set": doc})
    else:
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.concierge_events.insert_one(doc.copy())
    return {"ok": True, "event": _db.concierge_events.find_one({"slug": slug}, {"_id": 0})}


@router.get("/events")
async def list_events(
    days_ahead: int = 14,
    x_guest_token: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """Upcoming events across the next `days_ahead` days, scoped to the
    caller's property. Same payload for guest, hourly, and salary."""
    scope = _resolve_concierge_scope(x_guest_token, x_user_id)
    from database import db as _db
    cutoff_iso = (_now() + timedelta(days=max(1, min(60, days_ahead)))).isoformat()
    q: Dict[str, Any] = {
        "active": True,
        "starts_at": {"$lte": cutoff_iso},
    }
    pid = scope.get("property_id")
    if pid:
        q["$or"] = [{"property_id": pid},
                    {"property_id": None},
                    {"property_id": {"$exists": False}}]
    items = list(_db.concierge_events.find(q, {"_id": 0})
                 .sort([("starts_at", 1)]).limit(200))
    # Drop already-ended events from the list (events whose ends_at is
    # before "now" are stale even if still active=True).
    now_iso = _now_iso()
    fresh = [e for e in items if (e.get("ends_at") or e.get("starts_at")) >= now_iso]
    return {"ok": True, "total": len(fresh), "events": fresh,
            "property_id": pid, "persona": scope["persona"]}


# ─── Unified feed (events + venues + nearby, single payload) ──────────────

@router.get("/feed")
async def concierge_feed(
    x_guest_token: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
):
    """The single endpoint every concierge surface (guest, hourly staff,
    salary manager) calls to render its home feed.

    Returns:
      {
        persona: "guest" | "hourly" | "salary",
        property: { id, name, hero_image_url, brand_color },
        events: [...],            # featured events first, then chronological
        on_property: [...],       # venues — dining/spa/pool/bar/etc.
        nearby:    [...],         # off-property restaurants/attractions
        capabilities: { ... },    # what this persona can DO
      }

    On-property venues are promoted before nearby (per spec: "promotes
    internal restaurants in outlets first then there's a section for them
    to find outside")."""
    scope = _resolve_concierge_scope(x_guest_token, x_user_id)
    from database import db as _db
    pid = scope.get("property_id")

    # Property meta
    cfg = (_db.concierge_property_meta.find_one({"id": pid}, {"_id": 0}) if pid else None) \
          or _db.concierge_property_meta.find_one({"id": "default"}, {"_id": 0}) or {}

    # On-property venues
    venue_q: Dict[str, Any] = {"active": True}
    if pid:
        venue_q["$or"] = [{"property_id": pid},
                          {"property_id": None},
                          {"property_id": {"$exists": False}}]
    on_property = list(_db.concierge_venues.find(venue_q, {"_id": 0})
                       .sort([("display_order", 1), ("name", 1)]).limit(200))

    # Off-property nearby
    nearby_q: Dict[str, Any] = {"active": True}
    if pid:
        nearby_q["$or"] = [{"property_id": pid},
                           {"property_id": None},
                           {"property_id": {"$exists": False}}]
    nearby = list(_db.concierge_nearby.find(nearby_q, {"_id": 0})
                  .sort([("display_order", 1), ("name", 1)]).limit(200))

    # Upcoming events — featured first, then chronological
    cutoff_iso = (_now() + timedelta(days=14)).isoformat()
    event_q: Dict[str, Any] = {"active": True, "starts_at": {"$lte": cutoff_iso}}
    if pid:
        event_q["$or"] = [{"property_id": pid},
                          {"property_id": None},
                          {"property_id": {"$exists": False}}]
    raw_events = list(_db.concierge_events.find(event_q, {"_id": 0})
                      .sort([("starts_at", 1)]).limit(50))
    now_iso = _now_iso()
    fresh_events = [e for e in raw_events if (e.get("ends_at") or e.get("starts_at")) >= now_iso]
    featured = [e for e in fresh_events if e.get("is_featured")]
    chrono = [e for e in fresh_events if not e.get("is_featured")]
    events = featured + chrono

    persona = scope["persona"]
    capabilities = {
        # Read paths every persona has.
        "view_events": True,
        "view_on_property": True,
        "view_nearby": True,
        # Write paths gated by persona. The endpoints (D12b) enforce
        # the same rule server-side via _require_salary; these flags
        # exist so the client can render the right UI without making
        # a round-trip first.
        "request_amenity": persona == "salary",          # POST /amenity-orders
        "view_guest_complaints": persona == "salary",    # GET /staff/tickets
        "approve_recovery": persona == "salary",
        # Hourly + salary can BOTH submit guest-on-behalf requests.
        "submit_guest_request": persona in ("hourly", "salary"),
    }

    out = {
        "ok": True,
        "persona": persona,
        "property": {
            "id": pid or cfg.get("id"),
            "name": cfg.get("name") or "Luccca Resort",
            "hero_image_url": cfg.get("hero_image_url") or "",
            "brand_color": cfg.get("brand_color") or "#c8a97e",
            "welcome_copy": cfg.get("welcome_copy") or "",
        },
        "events": events,
        "on_property": on_property,
        "nearby": nearby,
        "capabilities": capabilities,
    }
    if persona == "guest":
        out["guest"] = {"id": scope.get("guest_id"),
                        "name": scope.get("guest_name"),
                        "room": scope.get("room")}
    else:
        out["staff"] = {"user_id": scope.get("user_id"),
                        "name": scope.get("name"),
                        "role": scope.get("role"),
                        "outlet_ids": scope.get("outlet_ids") or []}
    return out


# ─── Seed (a couple of demo events so the feed renders) ───────────────────

def seed_concierge_events():
    from database import db as _db
    if _db.concierge_events.count_documents({}) > 0:
        return 0
    soon = _now() + timedelta(hours=6)
    tomorrow = _now() + timedelta(days=1, hours=2)
    next_week = _now() + timedelta(days=5, hours=4)
    events = [
        {"slug": "sunset-jazz-cellar-47", "title": "Sunset Jazz at Cellar 47",
         "summary": "Live trio · curated wine flight pairing · no cover.",
         "starts_at": soon.isoformat(),
         "ends_at": (soon + timedelta(hours=3)).isoformat(),
         "location": "Cellar 47 Wine Bar", "venue_slug": "cellar-47",
         "category": "live-music", "is_featured": True,
         "cta_label": "Reserve", "active": True,
         "photo_url": "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f"},
        {"slug": "tide-pool-walk-am", "title": "Guided Tide Pool Walk",
         "summary": "Naturalist-led 90-min walk · meet at Beach Club lobby · all ages.",
         "starts_at": tomorrow.isoformat(),
         "ends_at": (tomorrow + timedelta(minutes=90)).isoformat(),
         "location": "Beach Club", "category": "excursion",
         "is_featured": False, "cta_label": "RSVP", "active": True},
        {"slug": "chef-tasting-marina-grill", "title": "Chef's Tasting · Marina Grill",
         "summary": "7-course menu · reservations limited to 12 covers.",
         "starts_at": next_week.isoformat(),
         "ends_at": (next_week + timedelta(hours=3)).isoformat(),
         "location": "Marina Grill", "venue_slug": "marina-grill",
         "category": "tasting", "is_featured": True, "capacity": 12,
         "cta_label": "Reserve", "active": True,
         "photo_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"},
    ]
    for e in events:
        e["id"] = uuid.uuid4().hex[:12]
        e["created_at"] = _now_iso()
        e["updated_at"] = _now_iso()
        _db.concierge_events.insert_one(e.copy())
    return len(events)


# ─── D12b · Manager-tier write paths ──────────────────────────────────────
# Per spec: a salary manager can order amenities (toiletries, in-room
# delivery) on a guest's behalf, and can see guest-complaint tickets
# scoped to their property. Hourly staff can submit guest requests on
# behalf of a guest but cannot order amenities (no cost authority) and
# cannot read complaint tickets. The system tracks who-did-what + cost.

def _require_salary(scope: Dict[str, Any]) -> None:
    if scope.get("persona") != "salary":
        raise HTTPException(403, "manager privileges required")


class AmenityLineItem(BaseModel):
    sku: Optional[str] = None       # internal SKU if drawn from a catalog
    name: str                       # human label (e.g. "Toothbrush kit")
    qty: int = 1
    unit_cost: float = 0.0          # in property's billing currency


class AmenityOrderCreate(BaseModel):
    room: str                       # destination room
    guest_name: Optional[str] = None
    guest_id: Optional[str] = None
    items: List[AmenityLineItem]
    note: Optional[str] = None
    charge_to_room: bool = True     # else comp / VIP / service-recovery
    reason_code: Optional[str] = None  # vip-arrival | service-recovery | guest-request | restock


@router.post("/amenity-orders")
async def create_amenity_order(
    body: AmenityOrderCreate,
    x_user_id: Optional[str] = Header(None),
):
    """Salary-only. Submits an in-room amenity order. Tracks cost and
    audit (who, when). Hourly staff get 403 — they can submit a guest
    *request* (D12a `submit_guest_request` capability) but not an
    amenity order with a cost line."""
    scope = _resolve_concierge_scope(None, x_user_id)
    _require_salary(scope)
    from database import db as _db

    if not body.items:
        raise HTTPException(400, "at least one item required")
    items = [it.model_dump() for it in body.items]
    total_cost = round(sum(max(0, it["qty"]) * float(it.get("unit_cost") or 0)
                           for it in items), 2)

    doc = {
        "id": uuid.uuid4().hex[:12],
        "kind": "amenity-order",
        "property_id": scope.get("property_id"),
        "room": body.room,
        "guest_name": body.guest_name,
        "guest_id": body.guest_id,
        "items": items,
        "total_cost": total_cost,
        "currency": "USD",
        "charge_to_room": body.charge_to_room,
        "reason_code": body.reason_code,
        "note": body.note or "",
        "status": "pending",
        # Audit — who placed, who acknowledged, who delivered.
        "ordered_by_user_id": scope.get("user_id"),
        "ordered_by_name": scope.get("name"),
        "ordered_by_role": scope.get("role"),
        "audit_log": [{
            "at": _now_iso(),
            "user_id": scope.get("user_id"),
            "user_name": scope.get("name"),
            "action": "created",
            "note": body.note or "",
        }],
        "created_at": _now_iso(),
    }
    _db.concierge_amenity_orders.insert_one(doc.copy())
    return {"ok": True, "order": doc}


@router.get("/amenity-orders")
async def list_amenity_orders(
    status: Optional[str] = None,
    limit: int = 50,
    x_user_id: Optional[str] = Header(None),
):
    """Salary-only. Lists amenity orders for the manager's property.
    Filters by `status` (pending/in_progress/delivered/cancelled) when
    provided. Hourly staff are blocked at the persona check."""
    scope = _resolve_concierge_scope(None, x_user_id)
    _require_salary(scope)
    from database import db as _db

    q: Dict[str, Any] = {}
    pid = scope.get("property_id")
    if pid:
        q["$or"] = [{"property_id": pid},
                    {"property_id": None},
                    {"property_id": {"$exists": False}}]
    if status:
        q["status"] = status
    items = list(_db.concierge_amenity_orders.find(q, {"_id": 0})
                 .sort("created_at", -1).limit(max(1, min(500, limit))))
    total_today = sum(o.get("total_cost") or 0 for o in items
                      if (o.get("created_at") or "").startswith(_now_iso()[:10]))
    return {"ok": True, "total": len(items), "orders": items,
            "summary": {"orders_today": len([o for o in items
                                              if (o.get("created_at") or "").startswith(_now_iso()[:10])]),
                        "spend_today": round(total_today, 2)}}


class AmenityStatusUpdate(BaseModel):
    status: str                # in_progress | delivered | cancelled
    note: Optional[str] = None


@router.post("/amenity-orders/{order_id}/status")
async def update_amenity_status(
    order_id: str,
    body: AmenityStatusUpdate,
    x_user_id: Optional[str] = Header(None),
):
    """Salary-only. Advances an amenity order's status, appending to
    the audit log. Allowed transitions are not enforced server-side
    (yet) — the UI gates them."""
    scope = _resolve_concierge_scope(None, x_user_id)
    _require_salary(scope)
    from database import db as _db

    order = _db.concierge_amenity_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "order not found")

    new_log_entry = {
        "at": _now_iso(),
        "user_id": scope.get("user_id"),
        "user_name": scope.get("name"),
        "action": f"status:{body.status}",
        "note": body.note or "",
    }
    log = list(order.get("audit_log") or []) + [new_log_entry]
    update = {"status": body.status, "updated_at": _now_iso(), "audit_log": log}
    if body.status == "delivered":
        update["delivered_at"] = _now_iso()
        update["delivered_by_user_id"] = scope.get("user_id")
        update["delivered_by_name"] = scope.get("name")
    _db.concierge_amenity_orders.update_one({"id": order_id}, {"$set": update})
    return {"ok": True, "order": _db.concierge_amenity_orders.find_one({"id": order_id}, {"_id": 0})}


# ─── Guest complaint visibility for salary managers ──────────────────────

@router.get("/staff/tickets")
async def staff_tickets(
    status: Optional[str] = None,
    limit: int = 100,
    x_user_id: Optional[str] = Header(None),
):
    """Salary-only. Reads guest-complaint tickets from the existing
    `concierge_tickets` collection (managed by `echo_concierge.py`),
    scoped to the manager's property.

    A ticket joins to a property via its `outlet_id` → outlets row →
    `property_id`. Tickets without an outlet_id (e.g. a "noisy
    neighbors" room complaint) match by the manager's set of property
    rooms — but room→property mapping is not yet wired, so for now
    such tickets surface for any manager at the deployment. This is
    flagged in the response as `unscoped_visible`."""
    scope = _resolve_concierge_scope(None, x_user_id)
    _require_salary(scope)
    from database import db as _db

    pid = scope.get("property_id")
    # First, identify the outlet_ids that belong to this property.
    outlets = list(_db.outlets.find({"property_id": pid} if pid else {}, {"_id": 0}))
    property_outlet_ids = {o.get("outlet_id") or o.get("id") for o in outlets}

    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    raw = list(_db.concierge_tickets.find(q, {"_id": 0})
               .sort("created_at", -1).limit(max(1, min(500, limit))))

    if pid:
        scoped = []
        unscoped_visible = []
        for t in raw:
            oid = t.get("outlet_id")
            if oid and oid in property_outlet_ids:
                scoped.append(t)
            elif not oid:
                unscoped_visible.append(t)
            # tickets with an outlet_id NOT in this property are dropped
        # Ordering: scoped tickets first, then untagged ones.
        tickets = scoped + unscoped_visible
        return {"ok": True, "total": len(tickets), "tickets": tickets,
                "property_id": pid,
                "unscoped_visible": len(unscoped_visible)}
    # No property — return everything (single-property deployment).
    return {"ok": True, "total": len(raw), "tickets": raw,
            "property_id": None, "unscoped_visible": 0}
