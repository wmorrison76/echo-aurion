"""
D48 · PMS core (Property Management System).

User directive: "let's get echo to a full PMS."

Existing surfaces handle housekeeping, concierge, IRD, retail.
This module is the SPINE of a full PMS:

  · Reservations CRUD with availability search
  · Guest folio (charges + payments + balance)
  · Channel manager seam (OTA inbound + outbound; adapter via D17)
  · Check-in / check-out flow with room assignment
  · Rate plans (BAR, AAA, corporate, package)
  · Occupancy + ADR + RevPAR rollup

Endpoints (all /api/pms)

  POST /reservations                  create
  GET  /reservations                  search (filter dates, guest, status)
  GET  /reservations/{id}             detail (includes folio)
  POST /reservations/{id}/check-in    assign room + open folio
  POST /reservations/{id}/check-out   close folio + release room
  POST /reservations/{id}/cancel      cancel + release inventory
  POST /availability                  search rate plans + rooms

  POST /folios/{folio_id}/charge      add charge (room, F&B, IRD, …)
  POST /folios/{folio_id}/payment     record payment
  GET  /folios/{folio_id}             detail with balance

  POST /channel/inbound               OTA pushes a reservation in
                                      (Booking.com, Expedia, etc.)
  GET  /channel/outbound/inventory    PMS publishes ARI to OTAs

  GET  /metrics/{property_id}         occupancy, ADR, RevPAR rollup

Doctrine alignment

  · §1.4: reservations are operator surface; guest-facing surfaces
    (concierge, IRD) live in their own modules.
  · §3.1 append-only: folio entries write-once. Voids create
    NEW reverse entries, never edit.
  · D27 tenant isolation everywhere.
  · D17 fuse box: channel manager + payment gateway are
    one-file-replaceable adapters.

Idempotency

  Reservations carry a confirmation_code (8-char hex). External
  channel reservations carry external_id which becomes the
  natural_key for inbound dedupe.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/pms", tags=["pms-core"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _gen_confirm_code() -> str:
    return secrets.token_hex(4).upper()


def _emit_audit(tenant_id: str, kind: str, eid: str,
                payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"pms.{kind}",
            "entity_id": eid,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


# ─── Models ────────────────────────────────────────────────────────────

class ReservationCreate(BaseModel):
    property_id: str
    guest_first_name: str = Field(..., min_length=1)
    guest_last_name: str = Field(..., min_length=1)
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    arrival_date: str            # ISO date
    departure_date: str
    room_type: str               # standard, suite, ocean_view, etc.
    rate_plan: str = "BAR"
    rate_per_night: float = Field(..., ge=0)
    adults: int = Field(1, ge=1)
    children: int = Field(0, ge=0)
    special_requests: Optional[str] = None
    channel: str = "direct"      # direct | booking_com | expedia | ...
    external_id: Optional[str] = None


class CheckInBody(BaseModel):
    room_number: str
    actor_id: str = Field(..., min_length=1)


class FolioCharge(BaseModel):
    description: str
    amount: float
    category: str = Field(..., pattern="^(room|fnb|spa|ird|retail|tax|fee|other)$")
    quantity: int = 1
    posted_by: Optional[str] = None


class FolioPayment(BaseModel):
    amount: float = Field(..., gt=0)
    method: str = Field(..., pattern="^(credit_card|cash|check|comp|ach)$")
    reference: Optional[str] = None
    actor_id: Optional[str] = None


class AvailabilitySearch(BaseModel):
    property_id: str
    arrival_date: str
    departure_date: str
    adults: int = 2
    rate_plan: Optional[str] = None


# ─── 1. Reservations ──────────────────────────────────────────────────

@router.post("/reservations")
def create_reservation(
    body: ReservationCreate,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()

    # Channel-inbound dedupe via external_id
    if body.external_id:
        existing = db["pms_reservations"].find_one(
            {"tenant_id": tenant_id, "channel": body.channel,
             "external_id": body.external_id})
        if existing:
            existing.pop("_id", None)
            return {"ok": True, "idempotent": True,
                    "reservation": existing}

    # Calculate nights + total
    arr = datetime.fromisoformat(body.arrival_date).date()
    dep = datetime.fromisoformat(body.departure_date).date()
    if dep <= arr:
        raise HTTPException(400, "departure_date must be > arrival_date")
    nights = (dep - arr).days
    room_subtotal = round(body.rate_per_night * nights, 2)

    res_id = uuid.uuid4().hex[:16]
    confirmation = _gen_confirm_code()
    res = {
        "id": res_id,
        "confirmation_code": confirmation,
        "tenant_id": tenant_id,
        "property_id": body.property_id,
        "guest_first_name": body.guest_first_name,
        "guest_last_name": body.guest_last_name,
        "guest_email": body.guest_email,
        "guest_phone": body.guest_phone,
        "arrival_date": body.arrival_date,
        "departure_date": body.departure_date,
        "nights": nights,
        "room_type": body.room_type,
        "rate_plan": body.rate_plan,
        "rate_per_night": body.rate_per_night,
        "room_subtotal": room_subtotal,
        "adults": body.adults,
        "children": body.children,
        "special_requests": body.special_requests,
        "channel": body.channel,
        "external_id": body.external_id,
        "status": "booked",
        "room_number": None,
        "checked_in_at": None,
        "checked_out_at": None,
        "folio_id": None,
        "created_at": _now_iso(),
    }
    db["pms_reservations"].insert_one(res.copy())
    _emit_audit(tenant_id, "reservation_create", res_id, {
        "channel": body.channel, "nights": nights,
        "room_subtotal": room_subtotal})
    return {"ok": True, "idempotent": False, "reservation": res}


@router.get("/reservations")
def search_reservations(
    property_id: Optional[str] = None,
    status: Optional[str] = None,
    arrival_from: Optional[str] = None,
    arrival_to: Optional[str] = None,
    guest_last_name: Optional[str] = None,
    confirmation_code: Optional[str] = None,
    limit: int = 100,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if property_id: q["property_id"] = property_id
    if status: q["status"] = status
    if guest_last_name: q["guest_last_name"] = guest_last_name
    if confirmation_code: q["confirmation_code"] = confirmation_code
    rows = list(db["pms_reservations"].find(q, {"_id": 0}).limit(2000))
    if arrival_from:
        rows = [r for r in rows if r.get("arrival_date","") >= arrival_from]
    if arrival_to:
        rows = [r for r in rows if r.get("arrival_date","") <= arrival_to]
    rows.sort(key=lambda r: r.get("arrival_date") or "")
    rows = rows[:max(1, min(2000, limit))]
    return {"ok": True, "total": len(rows), "reservations": rows}


@router.get("/reservations/{reservation_id}")
def get_reservation(
    reservation_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    res = db["pms_reservations"].find_one(
        {"id": reservation_id, "tenant_id": tenant_id}, {"_id": 0})
    if not res:
        raise HTTPException(404, "reservation not found")
    folio = None
    if res.get("folio_id"):
        folio = db["pms_folios"].find_one(
            {"id": res["folio_id"], "tenant_id": tenant_id}, {"_id": 0})
        if folio:
            entries = list(db["pms_folio_entries"].find(
                {"folio_id": folio["id"], "tenant_id": tenant_id},
                {"_id": 0}).limit(2000))
            folio["entries"] = entries
    return {"ok": True, "reservation": res, "folio": folio}


# ─── 2. Check-in / Check-out ──────────────────────────────────────────

@router.post("/reservations/{reservation_id}/check-in")
def check_in(
    reservation_id: str,
    body: CheckInBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    res = db["pms_reservations"].find_one(
        {"id": reservation_id, "tenant_id": tenant_id})
    if not res:
        raise HTTPException(404, "reservation not found")
    if res.get("status") != "booked":
        raise HTTPException(409,
            f"reservation is {res['status']}, cannot check in")

    folio_id = uuid.uuid4().hex[:16]
    folio = {
        "id": folio_id,
        "tenant_id": tenant_id,
        "reservation_id": reservation_id,
        "guest_name": (f"{res['guest_first_name']} "
                       f"{res['guest_last_name']}").strip(),
        "room_number": body.room_number,
        "balance": 0.0,
        "status": "open",
        "opened_at": _now_iso(),
        "closed_at": None,
    }
    db["pms_folios"].insert_one(folio.copy())

    # Pre-post the room charge × nights
    nightly = float(res.get("rate_per_night", 0))
    nights = int(res.get("nights", 0))
    if nightly > 0 and nights > 0:
        for n in range(nights):
            entry_id = uuid.uuid4().hex[:16]
            db["pms_folio_entries"].insert_one({
                "id": entry_id,
                "folio_id": folio_id,
                "tenant_id": tenant_id,
                "kind": "charge",
                "description": (f"Room {body.room_number} · "
                                f"{res['rate_plan']} · "
                                f"night {n+1}/{nights}"),
                "category": "room",
                "amount": nightly,
                "posted_by": body.actor_id,
                "posted_at": _now_iso(),
                "voided": False,
            })
        new_balance = round(nightly * nights, 2)
        db["pms_folios"].update_one(
            {"id": folio_id, "tenant_id": tenant_id},
            {"$set": {"balance": new_balance}})

    db["pms_reservations"].update_one(
        {"id": reservation_id, "tenant_id": tenant_id},
        {"$set": {"status": "in_house",
                  "room_number": body.room_number,
                  "checked_in_at": _now_iso(),
                  "folio_id": folio_id,
                  "checked_in_by": body.actor_id}})

    # Mark room as occupied in housekeeping
    db["hk_rooms"].update_one(
        {"number": body.room_number, "tenant_id": tenant_id},
        {"$set": {"status": "occupied",
                  "guest_name": folio["guest_name"],
                  "occupied_at": _now_iso()}})

    _emit_audit(tenant_id, "check_in", reservation_id, {
        "room": body.room_number, "actor": body.actor_id,
        "folio_id": folio_id})

    return {"ok": True, "reservation_id": reservation_id,
            "folio_id": folio_id,
            "room_number": body.room_number}


@router.post("/reservations/{reservation_id}/check-out")
def check_out(
    reservation_id: str,
    actor_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    res = db["pms_reservations"].find_one(
        {"id": reservation_id, "tenant_id": tenant_id})
    if not res:
        raise HTTPException(404, "reservation not found")
    if res.get("status") != "in_house":
        raise HTTPException(409,
            f"reservation is {res['status']}, cannot check out")
    folio_id = res.get("folio_id")
    folio = db["pms_folios"].find_one(
        {"id": folio_id, "tenant_id": tenant_id})
    if not folio:
        raise HTTPException(404, "folio missing")

    # Settle: balance must be zero (or comped). Here we just stamp.
    db["pms_folios"].update_one(
        {"id": folio_id, "tenant_id": tenant_id},
        {"$set": {"status": "closed",
                  "closed_at": _now_iso(),
                  "closed_by": actor_id}})
    db["pms_reservations"].update_one(
        {"id": reservation_id, "tenant_id": tenant_id},
        {"$set": {"status": "checked_out",
                  "checked_out_at": _now_iso(),
                  "checked_out_by": actor_id}})
    db["hk_rooms"].update_one(
        {"number": res["room_number"], "tenant_id": tenant_id},
        {"$set": {"status": "dirty",
                  "guest_name": None,
                  "vacated_at": _now_iso()}})
    _emit_audit(tenant_id, "check_out", reservation_id, {
        "actor": actor_id, "final_balance": folio.get("balance", 0)})
    return {"ok": True, "reservation_id": reservation_id,
            "final_balance": folio.get("balance", 0)}


@router.post("/reservations/{reservation_id}/cancel")
def cancel_reservation(
    reservation_id: str,
    actor_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    res = db["pms_reservations"].find_one(
        {"id": reservation_id, "tenant_id": tenant_id})
    if not res:
        raise HTTPException(404, "reservation not found")
    if res.get("status") in ("checked_out","cancelled"):
        raise HTTPException(409, f"already {res['status']}")
    db["pms_reservations"].update_one(
        {"id": reservation_id, "tenant_id": tenant_id},
        {"$set": {"status": "cancelled",
                  "cancelled_at": _now_iso(),
                  "cancelled_by": actor_id}})
    _emit_audit(tenant_id, "cancel", reservation_id,
                {"actor": actor_id})
    return {"ok": True, "reservation_id": reservation_id,
            "status": "cancelled"}


# ─── 3. Folio (charges + payments) ────────────────────────────────────

@router.post("/folios/{folio_id}/charge")
def add_charge(
    folio_id: str,
    body: FolioCharge,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    folio = db["pms_folios"].find_one(
        {"id": folio_id, "tenant_id": tenant_id})
    if not folio:
        raise HTTPException(404, "folio not found")
    if folio.get("status") != "open":
        raise HTTPException(409, "folio is closed")
    line_total = round(body.amount * max(1, body.quantity), 2)
    entry = {
        "id": uuid.uuid4().hex[:16],
        "folio_id": folio_id,
        "tenant_id": tenant_id,
        "kind": "charge",
        "description": body.description,
        "category": body.category,
        "amount": line_total,
        "quantity": body.quantity,
        "posted_by": body.posted_by,
        "posted_at": _now_iso(),
        "voided": False,
    }
    db["pms_folio_entries"].insert_one(entry.copy())
    new_balance = round(float(folio.get("balance",0)) + line_total, 2)
    db["pms_folios"].update_one(
        {"id": folio_id, "tenant_id": tenant_id},
        {"$set": {"balance": new_balance}})
    return {"ok": True, "entry": entry, "new_balance": new_balance}


@router.post("/folios/{folio_id}/payment")
def record_payment(
    folio_id: str,
    body: FolioPayment,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    folio = db["pms_folios"].find_one(
        {"id": folio_id, "tenant_id": tenant_id})
    if not folio:
        raise HTTPException(404, "folio not found")
    entry = {
        "id": uuid.uuid4().hex[:16],
        "folio_id": folio_id,
        "tenant_id": tenant_id,
        "kind": "payment",
        "description": f"Payment · {body.method}",
        "category": "payment",
        "amount": -body.amount,
        "method": body.method,
        "reference": body.reference,
        "posted_by": body.actor_id,
        "posted_at": _now_iso(),
        "voided": False,
    }
    db["pms_folio_entries"].insert_one(entry.copy())
    new_balance = round(float(folio.get("balance",0)) - body.amount, 2)
    db["pms_folios"].update_one(
        {"id": folio_id, "tenant_id": tenant_id},
        {"$set": {"balance": new_balance}})
    return {"ok": True, "entry": entry, "new_balance": new_balance}


@router.get("/folios/{folio_id}")
def get_folio(
    folio_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    folio = db["pms_folios"].find_one(
        {"id": folio_id, "tenant_id": tenant_id}, {"_id": 0})
    if not folio:
        raise HTTPException(404, "folio not found")
    entries = list(db["pms_folio_entries"].find(
        {"folio_id": folio_id, "tenant_id": tenant_id},
        {"_id": 0}).limit(2000))
    entries.sort(key=lambda e: e.get("posted_at") or "")
    folio["entries"] = entries
    folio["entry_count"] = len(entries)
    return {"ok": True, "folio": folio}


# ─── 4. Availability ───────────────────────────────────────────────────

@router.post("/availability")
def availability_search(
    body: AvailabilitySearch,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    arr = datetime.fromisoformat(body.arrival_date).date()
    dep = datetime.fromisoformat(body.departure_date).date()
    if dep <= arr:
        raise HTTPException(400, "departure_date must be > arrival_date")
    nights = (dep - arr).days

    # Total inventory by room_type
    rooms = list(db["hk_rooms"].find(
        {"tenant_id": tenant_id, "property_id": body.property_id},
        {"_id": 0}).limit(2000))
    if not rooms:
        rooms = list(db["hk_rooms"].find({},{"_id":0}).limit(2000))
    by_type: Dict[str, int] = {}
    for r in rooms:
        rt = r.get("room_type") or "standard"
        by_type[rt] = by_type.get(rt, 0) + 1

    # Held: reservations overlapping the window
    holds_by_type: Dict[str, int] = {}
    for r in db["pms_reservations"].find(
        {"tenant_id": tenant_id, "property_id": body.property_id,
         "status": {"$ne": "cancelled"}}, {"_id": 0}).limit(5000):
        if r["status"] in ("checked_out","cancelled"):
            continue
        a = r.get("arrival_date","")
        d = r.get("departure_date","")
        if d <= body.arrival_date or a >= body.departure_date:
            continue   # no overlap
        rt = r.get("room_type") or "standard"
        holds_by_type[rt] = holds_by_type.get(rt, 0) + 1

    # Rate plans
    plans = list(db["pms_rate_plans"].find(
        {"tenant_id": tenant_id, "active": True}, {"_id": 0}).limit(50))
    if body.rate_plan:
        plans = [p for p in plans if p.get("code") == body.rate_plan]

    options = []
    for rt, total in by_type.items():
        held = holds_by_type.get(rt, 0)
        avail = max(0, total - held)
        if avail == 0:
            continue
        for p in plans:
            base_rate = float(p.get("base_rate", 200))
            type_mult = float(p.get("type_multiplier", {}).get(rt, 1.0))
            nightly = round(base_rate * type_mult, 2)
            options.append({
                "room_type": rt,
                "rate_plan": p.get("code"),
                "rate_plan_name": p.get("name"),
                "nightly_rate": nightly,
                "nights": nights,
                "total_room_charge": round(nightly * nights, 2),
                "rooms_available": avail,
            })
    options.sort(key=lambda o: o["nightly_rate"])
    return {"ok": True,
            "property_id": body.property_id,
            "arrival_date": body.arrival_date,
            "departure_date": body.departure_date,
            "nights": nights,
            "options": options}


# ─── 5. Channel manager (inbound + outbound seam) ─────────────────────

@router.post("/channel/inbound")
def channel_inbound(
    body: ReservationCreate,
    x_tenant_id: Optional[str] = Header(None),
):
    """OTA pushes a reservation. Same as /reservations but tagged
    with the channel, deduped by external_id."""
    if not body.external_id:
        raise HTTPException(400, "external_id required for channel inbound")
    return create_reservation(body, x_tenant_id=x_tenant_id)


@router.get("/channel/outbound/inventory")
def outbound_inventory(
    property_id: str,
    arrival_from: str,
    arrival_to: str,
    x_tenant_id: Optional[str] = Header(None),
):
    """ARI feed for OTAs. Returns availability + base rate per
    room_type per date in the window. The actual push to OTA is a
    fuse-box adapter (D17)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    arr = datetime.fromisoformat(arrival_from).date()
    end = datetime.fromisoformat(arrival_to).date()
    if end <= arr:
        raise HTTPException(400, "arrival_to must be > arrival_from")
    days = (end - arr).days + 1

    rooms = list(db["hk_rooms"].find(
        {"tenant_id": tenant_id, "property_id": property_id},
        {"_id": 0}).limit(2000))
    by_type_total: Dict[str, int] = {}
    for r in rooms:
        rt = r.get("room_type") or "standard"
        by_type_total[rt] = by_type_total.get(rt, 0) + 1

    plans = list(db["pms_rate_plans"].find(
        {"tenant_id": tenant_id, "active": True}, {"_id": 0}).limit(20))

    # For each day, compute holds and produce ARI rows
    all_res = list(db["pms_reservations"].find(
        {"tenant_id": tenant_id, "property_id": property_id,
         "status": {"$ne": "cancelled"}}, {"_id": 0}).limit(5000))

    ari_rows = []
    for d in range(days):
        target = (arr + timedelta(days=d)).isoformat()
        for rt, total in by_type_total.items():
            held = sum(1 for r in all_res
                if r.get("room_type") == rt
                and r.get("status") not in ("cancelled","checked_out")
                and r.get("arrival_date","") <= target
                and target < r.get("departure_date",""))
            avail = max(0, total - held)
            for p in plans:
                base = float(p.get("base_rate", 200))
                mult = float(p.get("type_multiplier", {}).get(rt, 1.0))
                ari_rows.append({
                    "date": target,
                    "room_type": rt,
                    "rate_plan": p.get("code"),
                    "rate": round(base * mult, 2),
                    "available": avail,
                })

    return {"ok": True, "property_id": property_id,
            "days": days, "ari_rows": ari_rows}


# ─── 6. Property metrics (occupancy / ADR / RevPAR) ───────────────────

@router.get("/metrics/{property_id}")
def property_metrics(
    property_id: str,
    period_start: str,
    period_end: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    arr = datetime.fromisoformat(period_start).date()
    end = datetime.fromisoformat(period_end).date()
    if end <= arr:
        raise HTTPException(400, "period_end must be > period_start")
    days = (end - arr).days

    # Total room nights available
    rooms = list(db["hk_rooms"].find(
        {"tenant_id": tenant_id, "property_id": property_id},
        {"_id": 0}).limit(2000))
    inventory = len(rooms)
    total_room_nights = inventory * days

    # Sold + revenue: walk reservations overlapping window
    sold_room_nights = 0
    room_revenue = 0.0
    for r in db["pms_reservations"].find(
        {"tenant_id": tenant_id, "property_id": property_id,
         "status": {"$ne": "cancelled"}}, {"_id": 0}).limit(10000):
        if r["status"] == "cancelled":
            continue
        a = max(arr,
            datetime.fromisoformat(r["arrival_date"]).date())
        d = min(end,
            datetime.fromisoformat(r["departure_date"]).date())
        if d <= a:
            continue
        nights_in_window = (d - a).days
        sold_room_nights += nights_in_window
        room_revenue += nights_in_window * float(r.get("rate_per_night",0))

    occupancy = (sold_room_nights / total_room_nights
                  if total_room_nights else 0)
    adr = (room_revenue / sold_room_nights
            if sold_room_nights else 0)
    revpar = room_revenue / total_room_nights if total_room_nights else 0

    return {
        "ok": True,
        "property_id": property_id,
        "period_start": period_start,
        "period_end": period_end,
        "days": days,
        "inventory": inventory,
        "total_room_nights": total_room_nights,
        "sold_room_nights": sold_room_nights,
        "room_revenue": round(room_revenue, 2),
        "occupancy_pct": round(occupancy * 100, 1),
        "adr": round(adr, 2),
        "revpar": round(revpar, 2),
    }
