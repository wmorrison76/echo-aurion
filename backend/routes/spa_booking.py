"""
Spa Public Booking + QR Code
============================
Public (no-auth) booking endpoint that a hotel can link to from its public
website. Generates a printable/embeddable QR code that points at
/book/{hotel_slug}.

Two surfaces:
  1. GET /api/spa-booking/services/{hotel_slug}  → public service catalog
  2. POST /api/spa-booking/book                  → create booking request
  3. GET /api/spa-booking/qr/{hotel_slug}        → inline SVG QR code

Bookings land in `spa_bookings` and also enqueue to POS outbound so
the hotel's POS sees them immediately.
"""
import io
import os
import base64
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

import qrcode
import qrcode.image.svg as qr_svg

from database import db

router = APIRouter(prefix="/api/spa-booking", tags=["spa-booking"])
BOOKINGS = "spa_bookings"
_now = lambda: datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class GuestInfo(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    room_number: Optional[str] = None


class BookingCreate(BaseModel):
    hotel_slug: str
    service_id: str
    guest: GuestInfo
    preferred_date: str = Field(..., description="YYYY-MM-DD")
    preferred_time: str = "10:00"
    therapist_preference: Optional[str] = None
    notes: Optional[str] = ""


# ─────────────────────────────────────────────
# QR code (SVG)
# ─────────────────────────────────────────────
def _public_url_base(request: Request) -> str:
    # Prefer external URL from env if present, else reconstruct
    return os.environ.get("PUBLIC_URL", "").strip() or str(request.base_url).rstrip("/")


@router.get("/qr/{hotel_slug}")
async def booking_qr(hotel_slug: str, request: Request, size: int = 240):
    """Return an SVG QR code pointing at /book/{hotel_slug}."""
    base = _public_url_base(request)
    target = f"{base}/book/{hotel_slug}"
    factory = qr_svg.SvgPathImage
    img = qrcode.make(target, image_factory=factory, box_size=max(4, size // 21))
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode("utf-8")
    return Response(content=svg, media_type="image/svg+xml", headers={"X-Booking-URL": target})


@router.get("/qr/{hotel_slug}/meta")
async def booking_qr_meta(hotel_slug: str, request: Request):
    """Returns { url, png_base64 } — handy for embedding in React dashboards."""
    base = _public_url_base(request)
    target = f"{base}/book/{hotel_slug}"
    img = qrcode.make(target)
    buf = io.BytesIO(); img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"url": target, "png_base64": b64, "hotel_slug": hotel_slug}


# ─────────────────────────────────────────────
# Public catalog
# ─────────────────────────────────────────────
@router.get("/services/{hotel_slug}")
async def public_services(hotel_slug: str, category: Optional[str] = None):
    # Ensure seed services exist
    from routes.spa_services import _seed_if_empty  # re-use
    _seed_if_empty()
    q = {"active": True}
    if category: q["category"] = category
    items = list(db["spa_services"].find(q, {"_id": 0, "therapists": 0, "rooms": 0, "tax_code": 0}).sort("price", 1))
    return {
        "hotel_slug": hotel_slug,
        "services": items,
        "total": len(items),
        "categories": sorted({s.get("category", "other") for s in items}),
    }


# ─────────────────────────────────────────────
# Booking submission
# ─────────────────────────────────────────────
@router.post("/book")
async def create_booking(body: BookingCreate):
    svc = db["spa_services"].find_one({"id": body.service_id, "active": True}, {"_id": 0})
    if not svc:
        raise HTTPException(404, "Service not found or inactive")

    booking = {
        "id": f"bk-{uuid4().hex[:10]}",
        "hotel_slug": body.hotel_slug,
        "service_id": body.service_id,
        "service_name": svc["name"],
        "service_category": svc.get("category"),
        "service_duration_min": svc.get("duration_min"),
        "service_price": svc.get("price"),
        "guest": body.guest.dict(),
        "preferred_date": body.preferred_date,
        "preferred_time": body.preferred_time,
        "therapist_preference": body.therapist_preference,
        "notes": body.notes,
        "status": "requested",   # requested → confirmed → completed / cancelled
        "created_at": _now(),
        "confirmation_code": f"SPA-{uuid4().hex[:6].upper()}",
    }
    db[BOOKINGS].insert_one({**booking})
    booking.pop("_id", None)

    # Enqueue to POS
    db["pos_outbound"].insert_one({
        "id": f"pos-{uuid4().hex[:8]}",
        "kind": "spa_booking",
        "action": "create",
        "booking_id": booking["id"],
        "confirmation_code": booking["confirmation_code"],
        "name": svc["name"],
        "price": svc.get("price"),
        "payload": booking,
        "status": "pending",
        "attempts": 0,
        "created_at": _now(),
        "delivered_at": None,
    })
    return {"success": True, "booking": booking}


@router.get("/bookings")
async def list_bookings(hotel_slug: Optional[str] = None, status: Optional[str] = None, limit: int = 100):
    q: dict = {}
    if hotel_slug: q["hotel_slug"] = hotel_slug
    if status: q["status"] = status
    items = list(db[BOOKINGS].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"bookings": items, "total": len(items)}


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    b = db[BOOKINGS].find_one({"id": booking_id}, {"_id": 0})
    if not b: raise HTTPException(404, "Booking not found")
    return b


@router.post("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, body: dict):
    new_status = (body or {}).get("status")
    if new_status not in ("requested", "confirmed", "completed", "cancelled", "no_show"):
        raise HTTPException(400, "Invalid status")
    res = db[BOOKINGS].update_one({"id": booking_id}, {"$set": {"status": new_status, "updated_at": _now()}})
    if res.matched_count == 0: raise HTTPException(404, "Booking not found")
    return {"success": True, "id": booking_id, "status": new_status}
