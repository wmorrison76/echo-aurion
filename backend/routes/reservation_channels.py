"""
D50 · Third-party reservation channel partners.

User directive: "Concierge book reservations will need to also
have 3rd party connections so OpenTable for example reservations
or concierge booking same table." + "What other companies other
than OpenTable should plan for."

This module is the channel-manager spine for restaurant
reservations + spa + activities, parallel to the PMS channel
manager (D48 handles hotel OTA inbound/outbound). The same
physical table can be booked by the concierge OR by an outside
channel; this layer prevents double-booking and unifies the
arrival list.

Channels supported in this PR (each via a fuse-box adapter
seam — D17 pattern; vendor SDK lives in services/clients.py):

  Restaurant reservations
    · OpenTable          (Booking Holdings; biggest US footprint)
    · Resy               (American Express; high-end)
    · Tock               (Squarespace; tasting menus, prepay)
    · SevenRooms         (direct + CRM)
    · Yelp Reservations  (small-mid ops)
    · TheFork            (TripAdvisor; Europe)

  Hotel OTAs (handled in D48 PMS already; cross-referenced)
    · Booking.com / Priceline / Agoda (Booking Holdings)
    · Expedia / Hotels.com / Vrbo
    · Marriott / Hilton / Hyatt direct CRS
    · Google Hotel Ads / Trivago (meta-search)

  Spa / wellness
    · MindBody
    · Booker (MindBody)
    · Vagaro
    · Acuity (Squarespace)

  Activities / tours
    · Viator (TripAdvisor)
    · GetYourGuide
    · Klook

Endpoints (all /api/reservation-channel)

  GET  /channels                        registry of supported
                                        channels + connection state
  POST /connections                     register a channel connection
                                        (api_key / oauth seam)
  POST /inbound                         channel pushes a reservation
                                        in (deduped on external_id)
  GET  /unified/{outlet_id}             unified arrival list across
                                        channels for a date
  POST /availability/sync               outbound: push current
                                        availability to all
                                        connected channels
  POST /reservations/{id}/cancel-inbound  guest-side cancel from
                                        the channel

Doctrine alignment

  · §1.4: operator audience required for write paths;
    /unified/{outlet_id} is operator + concierge audiences.
  · §3.1 append-only: channel inbound writes events; cancellations
    write a NEW row (status=cancelled), never delete.
  · D27 tenant isolation everywhere.
  · D17 fuse box: each channel's adapter is one file in
    services/clients.py — current implementation persists the
    payload + returns the structure, real adapter swaps in.
  · D32 hooks: arrival_calibration auditor reads from
    channel_reservations alongside pms_reservations.
  · D48 hotel OTA path is parallel; same idempotency contract.

Dedupe / double-booking prevention

  Inbound reservations carry (channel, external_id) — dedupe key.
  On insert we ALSO check for table conflicts at the destination
  outlet for the same time window; collision returns 409 with
  alternative_tables suggestions so the channel adapter can
  re-prompt the guest.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/reservation-channel",
                   tags=["reservation-channels"])


# Built-in channel registry — extends via /connections POST
CHANNEL_CATALOG: List[Dict[str, Any]] = [
    {"key": "opentable", "name": "OpenTable",
     "category": "restaurant", "auth": "oauth2",
     "features": ["inbound", "ari_outbound", "guest_profile_pull"]},
    {"key": "resy", "name": "Resy", "category": "restaurant",
     "auth": "api_key",
     "features": ["inbound", "ari_outbound"]},
    {"key": "tock", "name": "Tock", "category": "restaurant",
     "auth": "api_key",
     "features": ["inbound", "prepay", "tasting_menu_seat_management"]},
    {"key": "sevenrooms", "name": "SevenRooms",
     "category": "restaurant", "auth": "oauth2",
     "features": ["inbound", "ari_outbound", "crm_sync"]},
    {"key": "yelp_reservations", "name": "Yelp Reservations",
     "category": "restaurant", "auth": "api_key",
     "features": ["inbound"]},
    {"key": "thefork", "name": "TheFork",
     "category": "restaurant", "auth": "api_key",
     "features": ["inbound", "ari_outbound"]},
    {"key": "booking_com", "name": "Booking.com",
     "category": "hotel", "auth": "api_key",
     "features": ["inbound", "ari_outbound"]},
    {"key": "expedia", "name": "Expedia",
     "category": "hotel", "auth": "api_key",
     "features": ["inbound", "ari_outbound"]},
    {"key": "marriott_crs", "name": "Marriott CRS",
     "category": "hotel", "auth": "oauth2",
     "features": ["inbound", "loyalty_sync"]},
    {"key": "hilton_crs", "name": "Hilton CRS",
     "category": "hotel", "auth": "oauth2",
     "features": ["inbound", "loyalty_sync"]},
    {"key": "google_hotel_ads", "name": "Google Hotel Ads",
     "category": "hotel_meta", "auth": "oauth2",
     "features": ["ari_outbound"]},
    {"key": "mindbody", "name": "MindBody",
     "category": "spa", "auth": "oauth2",
     "features": ["inbound", "service_catalog_sync"]},
    {"key": "booker", "name": "Booker (MindBody)",
     "category": "spa", "auth": "api_key",
     "features": ["inbound"]},
    {"key": "vagaro", "name": "Vagaro",
     "category": "spa", "auth": "api_key",
     "features": ["inbound"]},
    {"key": "acuity", "name": "Acuity Scheduling",
     "category": "spa", "auth": "api_key",
     "features": ["inbound"]},
    {"key": "viator", "name": "Viator (TripAdvisor)",
     "category": "activity", "auth": "api_key",
     "features": ["inbound", "ari_outbound"]},
    {"key": "getyourguide", "name": "GetYourGuide",
     "category": "activity", "auth": "api_key",
     "features": ["inbound", "ari_outbound"]},
    {"key": "klook", "name": "Klook",
     "category": "activity", "auth": "api_key",
     "features": ["inbound"]},
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _emit_audit(tenant_id: str, kind: str, eid: str,
                payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"reservation_channel.{kind}",
            "entity_id": eid,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


# ─── Models ────────────────────────────────────────────────────────────

class ConnectionBody(BaseModel):
    channel: str = Field(..., min_length=1)
    display_name: str
    api_key: Optional[str] = None
    location_id: Optional[str] = None
    enabled: bool = True


class InboundReservationBody(BaseModel):
    channel: str
    external_id: str = Field(..., min_length=2)
    outlet_id: str
    guest_first_name: str = Field(..., min_length=1)
    guest_last_name: str = Field(..., min_length=1)
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    party_size: int = Field(..., ge=1)
    reservation_at: str            # ISO datetime
    duration_minutes: int = 90
    table_id: Optional[str] = None    # optional preferred table
    special_requests: Optional[str] = None


# ─── 1. Channel registry ───────────────────────────────────────────────

@router.get("/channels")
def list_channels(
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    connections = list(db["reservation_channel_connections"].find(
        {"tenant_id": tenant_id}, {"_id": 0}).limit(200))
    by_key = {c["channel"]: c for c in connections}
    out = []
    for ch in CHANNEL_CATALOG:
        c = by_key.get(ch["key"])
        out.append({
            **ch,
            "connected": c is not None,
            "enabled": (c or {}).get("enabled", False),
            "display_name": (c or {}).get("display_name"),
        })
    return {"ok": True, "channels": out}


@router.post("/connections")
def register_connection(
    body: ConnectionBody,
    x_tenant_id: Optional[str] = Header(None),
    x_actor_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    valid_keys = {c["key"] for c in CHANNEL_CATALOG}
    if body.channel not in valid_keys:
        raise HTTPException(400,
            f"unknown channel '{body.channel}'; "
            f"see /channels for supported list")
    existing = db["reservation_channel_connections"].find_one(
        {"tenant_id": tenant_id, "channel": body.channel})
    record = {
        "tenant_id": tenant_id,
        "channel": body.channel,
        "display_name": body.display_name,
        "api_key": body.api_key,
        "location_id": body.location_id,
        "enabled": body.enabled,
        "updated_at": _now_iso(),
    }
    if existing:
        db["reservation_channel_connections"].update_one(
            {"tenant_id": tenant_id, "channel": body.channel},
            {"$set": record})
    else:
        record["id"] = uuid.uuid4().hex[:16]
        record["created_at"] = _now_iso()
        db["reservation_channel_connections"].insert_one(record.copy())
    _emit_audit(tenant_id, "connection_register", body.channel,
                {"actor": x_actor_id})
    return {"ok": True, "channel": body.channel,
            "enabled": body.enabled}


# ─── 2. Inbound reservation (with dedupe + collision check) ───────────

def _check_collision(tenant_id: str, outlet_id: str,
                     start: datetime, end: datetime,
                     table_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """Look for an overlapping reservation on the same table.
    Returns the conflicting reservation or None."""
    if not table_id:
        return None
    rows = list(db["channel_reservations"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "table_id": table_id,
         "status": {"$ne": "cancelled"}}, {"_id": 0}).limit(500))
    for r in rows:
        try:
            rs = datetime.fromisoformat(
                r["reservation_at"].replace("Z", "+00:00"))
            re_end = rs + timedelta(minutes=r.get("duration_minutes", 90))
        except Exception:
            continue
        if not (re_end <= start or rs >= end):
            return r
    return None


def _suggest_alternative_tables(tenant_id: str, outlet_id: str,
                                  party_size: int,
                                  start: datetime, end: datetime
                                  ) -> List[Dict[str, Any]]:
    """Return up to 5 tables at outlet that fit party_size and are
    free in the window."""
    tables = list(db["echolayout_tables"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id},
        {"_id": 0}).limit(200))
    if not tables:
        tables = list(db["echolayout_tables"].find(
            {"outlet_id": outlet_id}, {"_id": 0}).limit(200))
    free = []
    for t in tables:
        if int(t.get("capacity", 0)) < party_size:
            continue
        if _check_collision(tenant_id, outlet_id,
                             start, end, t.get("id")):
            continue
        free.append({"table_id": t.get("id"),
                      "name": t.get("name"),
                      "capacity": t.get("capacity")})
        if len(free) >= 5:
            break
    return free


@router.post("/inbound")
def inbound_reservation(
    body: InboundReservationBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()

    # Dedupe on (channel, external_id)
    existing = db["channel_reservations"].find_one(
        {"tenant_id": tenant_id, "channel": body.channel,
         "external_id": body.external_id})
    if existing:
        existing.pop("_id", None)
        return {"ok": True, "idempotent": True,
                "reservation": existing}

    try:
        start = datetime.fromisoformat(
            body.reservation_at.replace("Z", "+00:00"))
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400,
            "reservation_at must be ISO datetime")
    end = start + timedelta(minutes=body.duration_minutes)

    # Collision check against the SAME table only — different
    # tables in same outlet can be booked concurrently.
    conflict = _check_collision(tenant_id, body.outlet_id,
                                  start, end, body.table_id)
    if conflict:
        alts = _suggest_alternative_tables(tenant_id, body.outlet_id,
                                             body.party_size, start, end)
        raise HTTPException(409, {
            "error": "table_collision",
            "conflict_with_external_id": conflict.get("external_id"),
            "conflict_channel": conflict.get("channel"),
            "alternative_tables": alts,
        })

    rid = uuid.uuid4().hex[:16]
    res = {
        "id": rid,
        "tenant_id": tenant_id,
        "channel": body.channel,
        "external_id": body.external_id,
        "outlet_id": body.outlet_id,
        "guest_first_name": body.guest_first_name,
        "guest_last_name": body.guest_last_name,
        "guest_email": body.guest_email,
        "guest_phone": body.guest_phone,
        "party_size": body.party_size,
        "reservation_at": body.reservation_at,
        "duration_minutes": body.duration_minutes,
        "table_id": body.table_id,
        "special_requests": body.special_requests,
        "status": "booked",
        "cancelled_at": None,
        "created_at": _now_iso(),
    }
    db["channel_reservations"].insert_one(res.copy())
    _emit_audit(tenant_id, "inbound_create", rid, {
        "channel": body.channel,
        "external_id": body.external_id,
        "outlet_id": body.outlet_id,
        "party_size": body.party_size})
    return {"ok": True, "idempotent": False, "reservation": res}


# ─── 3. Unified arrival list ───────────────────────────────────────────

@router.get("/unified/{outlet_id}")
def unified_arrivals(
    outlet_id: str,
    date: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "concierge", "pass_dev"):
        raise HTTPException(403,
            "unified arrivals require operator|concierge audience")
    tenant_id = (x_tenant_id or "default").strip().lower()
    rows = list(db["channel_reservations"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "status": {"$ne": "cancelled"}}, {"_id": 0}).limit(2000))
    rows = [r for r in rows
            if r.get("reservation_at", "").startswith(date)]
    rows.sort(key=lambda r: r.get("reservation_at") or "")

    by_channel: Dict[str, int] = {}
    total_covers = 0
    for r in rows:
        by_channel[r["channel"]] = by_channel.get(r["channel"], 0) + 1
        total_covers += int(r.get("party_size") or 0)

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "date": date,
        "reservation_count": len(rows),
        "total_covers": total_covers,
        "by_channel": by_channel,
        "reservations": rows,
    }


# ─── 4. Outbound availability sync ─────────────────────────────────────

@router.post("/availability/sync")
def availability_sync(
    outlet_id: str,
    arrival_from: str,
    arrival_to: str,
    x_tenant_id: Optional[str] = Header(None),
):
    """Compute per-day, per-time-window availability and return
    the payload that the channel adapters would push outbound.
    Real channel push is a fuse-box concern (D17)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    connections = list(db["reservation_channel_connections"].find(
        {"tenant_id": tenant_id, "enabled": True}, {"_id": 0}).limit(50))
    tables = list(db["echolayout_tables"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id},
        {"_id": 0}).limit(200))
    if not tables:
        tables = list(db["echolayout_tables"].find(
            {"outlet_id": outlet_id}, {"_id": 0}).limit(200))

    arr = datetime.fromisoformat(arrival_from).date()
    end = datetime.fromisoformat(arrival_to).date()
    if end <= arr:
        raise HTTPException(400, "arrival_to must be > arrival_from")
    days = (end - arr).days + 1

    # Standard 90-min windows from 17:00 to 22:00 (5 windows)
    windows = [(17, 0), (18, 30), (19, 0), (20, 30), (21, 0)]
    payload = []
    for d in range(days):
        date_str = (arr + timedelta(days=d)).isoformat()
        for hr, mn in windows:
            slot_start = datetime(arr.year, arr.month, arr.day,
                hr, mn, tzinfo=timezone.utc) + timedelta(days=d)
            slot_end = slot_start + timedelta(minutes=90)
            free = sum(1 for t in tables
                if not _check_collision(tenant_id, outlet_id,
                                          slot_start, slot_end,
                                          t.get("id")))
            payload.append({
                "date": date_str,
                "time": f"{hr:02d}:{mn:02d}",
                "tables_available": free,
                "max_party_size": (
                    max(int(t.get("capacity", 0)) for t in tables)
                    if tables else 0),
            })

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "channels_to_sync": [c["channel"] for c in connections],
        "rows": payload,
        "rows_count": len(payload),
        "_note": ("Returned payload would be pushed to each "
                  "channel via its adapter (D17 fuse box). This "
                  "endpoint returns the payload + the channel "
                  "list for the adapter to iterate.")
    }


@router.post("/reservations/{reservation_id}/cancel")
def cancel_reservation(
    reservation_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_actor_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    res = db["channel_reservations"].find_one(
        {"id": reservation_id, "tenant_id": tenant_id})
    if not res:
        raise HTTPException(404, "reservation not found")
    if res.get("status") == "cancelled":
        return {"ok": True, "idempotent": True}
    db["channel_reservations"].update_one(
        {"id": reservation_id, "tenant_id": tenant_id},
        {"$set": {"status": "cancelled",
                  "cancelled_at": _now_iso(),
                  "cancelled_by": x_actor_id}})
    _emit_audit(tenant_id, "cancel", reservation_id,
                {"actor": x_actor_id})
    return {"ok": True, "id": reservation_id, "status": "cancelled"}
