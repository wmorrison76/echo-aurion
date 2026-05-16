"""
iter179 · EchoConciergeMobile backend — guest-facing mobile companion

Endpoints under `/api/concierge-mobile/*`, NO admin token required because guests
reach this via a magic-link token (mobile_token) that embeds their guest_id +
expiry. Guests can:
  - See their stay info + VIP banner + celebration flag
  - View their itinerary (dining, spa, activations, requests)
  - Submit a new service request (towels, housekeeping, transport, custom)

Security:
  - One-time `mobile_token` issued by concierge (admin-gated), scoped to guest_id
  - TTL default 7 days; `/resolve` rejects expired tokens (410)
"""
from __future__ import annotations

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/concierge-mobile", tags=["concierge-mobile"])


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


# ─── Mint mobile token (admin-gated) ───────────────────────────────────────
class MintBody(BaseModel):
    guest_id: str
    ttl_days: int = 7


@router.post("/mint")
async def mint_token(body: MintBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    # Accept either concierge_guests (v2) or guests (legacy) collection
    g = _db.concierge_guests.find_one({"id": body.guest_id}, {"_id": 0}) or \
        _db.guests.find_one({"id": body.guest_id}, {"_id": 0})
    if not g:
        raise HTTPException(404, "guest not found")
    tok = secrets.token_urlsafe(24)
    _db.concierge_mobile_tokens.insert_one({
        "token": tok,
        "guest_id": body.guest_id,
        "expires_at": _now() + timedelta(days=max(1, min(30, body.ttl_days))),
        "created_at": _now(),
    })
    return {"ok": True, "token": tok,
            "url_hint": f"/m/concierge/{tok}",
            "expires_at": (_now() + timedelta(days=body.ttl_days)).isoformat()}


# ─── Resolve + fetch bundle ────────────────────────────────────────────────
def _find_guest(guest_id: str) -> Dict[str, Any]:
    from database import db as _db
    g = _db.concierge_guests.find_one({"id": guest_id}, {"_id": 0}) or \
        _db.guests.find_one({"id": guest_id}, {"_id": 0})
    if not g:
        raise HTTPException(404, "guest not found")
    return g


def _celebration_flag(g: Dict[str, Any]) -> Optional[str]:
    p = g.get("preferences") or {}
    c = (p.get("celebration") or "").lower()
    if c in ("birthday", "anniversary", "honeymoon", "engagement", "graduation"):
        return c
    return None


@router.get("/resolve/{token}")
async def resolve(token: str):
    from database import db as _db
    t = _db.concierge_mobile_tokens.find_one({"token": token}, {"_id": 0})
    if not t:
        raise HTTPException(404, "token not found")
    exp = t.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            raise HTTPException(410, "token expired")
    g = _find_guest(t["guest_id"])

    # Bundle guest itinerary from multiple sources (dining reservations, spa,
    # active requests, activations attended). Keep lightweight for mobile.
    dining = list(_db.concierge_dining_reservations.find(
        {"guest_id": g["id"]}, {"_id": 0}
    ).sort("date", 1).limit(10)) if "concierge_dining_reservations" in _db.list_collection_names() else []
    spa = list(_db.spa_bookings.find(
        {"guest_id": g["id"]}, {"_id": 0}
    ).sort("date", 1).limit(10)) if "spa_bookings" in _db.list_collection_names() else []
    requests_open = list(_db.concierge_requests.find(
        {"guest_id": g["id"], "status": {"$in": ["pending", "in_progress", "confirmed"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(15)) if "concierge_requests" in _db.list_collection_names() else []

    # Today's activations (hotel lifestyle) — best-effort
    activations_today: List[Dict[str, Any]] = []
    try:
        today = _now().strftime("%Y-%m-%d")
        activations_today = list(_db.lifestyle_activations.find(
            {"date": today, "active": True}, {"_id": 0}
        ).limit(10))
    except Exception:
        activations_today = []

    return {
        "ok": True,
        "guest": {
            "id": g["id"],
            "name": g.get("display_name") or g.get("name"),
            "room": g.get("room"),
            "check_in": g.get("check_in"),
            "check_out": g.get("check_out"),
            "vip_tier": g.get("vip_tier") or "standard",
            "repeat": bool(g.get("repeat")),
            "preferences": g.get("preferences") or {},
        },
        "celebration": _celebration_flag(g),
        "dining_reservations": dining,
        "spa_bookings": spa,
        "open_requests": requests_open,
        "activations_today": activations_today,
        "server_time": _now_iso(),
    }


# ─── Submit a guest request ────────────────────────────────────────────────
class MobileRequest(BaseModel):
    token: str
    kind: str  # "housekeeping" | "towels" | "transport" | "dining" | "custom" | …
    summary: str = Field(..., min_length=2, max_length=400)
    urgency: str = "normal"  # "normal" | "urgent"
    details: Optional[Dict[str, Any]] = None


@router.post("/request")
async def submit_request(body: MobileRequest):
    from database import db as _db
    t = _db.concierge_mobile_tokens.find_one({"token": body.token}, {"_id": 0})
    if not t:
        raise HTTPException(401, "invalid token")
    exp = t.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            raise HTTPException(410, "token expired")
    g = _find_guest(t["guest_id"])

    rec = {
        "id": uuid.uuid4().hex[:12],
        "guest_id": g["id"],
        "guest_name": g.get("display_name") or g.get("name"),
        "room": g.get("room"),
        "kind": body.kind,
        "summary": body.summary[:400],
        "urgency": body.urgency,
        "details": body.details or {},
        "status": "pending",
        "source": "mobile-companion",
        "created_at": _now_iso(),
        "history": [{"at": _now_iso(), "event": "created_via_mobile"}],
    }
    _db.concierge_requests.insert_one(rec.copy())
    return {"ok": True, "request_id": rec["id"], "status": rec["status"]}


# ─── Update guest preference (light) ───────────────────────────────────────
class MobilePref(BaseModel):
    token: str
    key: str
    value: Any


@router.post("/preference")
async def set_preference(body: MobilePref):
    from database import db as _db
    t = _db.concierge_mobile_tokens.find_one({"token": body.token}, {"_id": 0})
    if not t:
        raise HTTPException(401, "invalid token")
    g = _find_guest(t["guest_id"])
    _db.concierge_guest_preferences.insert_one({
        "id": uuid.uuid4().hex[:12], "guest_id": g["id"],
        "key": body.key[:80], "value": body.value,
        "source": "mobile-guest",
        "created_at": _now_iso(),
    })
    return {"ok": True}


# ─── Admin: guest roster + active tokens ───────────────────────────────────
@router.get("/guests")
async def list_guests(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    guests = list(_db.concierge_guests.find({}, {"_id": 0}).sort("check_in", -1).limit(200))
    # Attach active (non-expired) token counts per guest
    now = _now()
    token_count: Dict[str, int] = {}
    latest_token: Dict[str, Dict[str, Any]] = {}
    for t in _db.concierge_mobile_tokens.find({}, {"_id": 0}):
        gid = t.get("guest_id")
        exp = t.get("expires_at")
        if isinstance(exp, datetime):
            if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
            if exp < now: continue
        token_count[gid] = token_count.get(gid, 0) + 1
        prev = latest_token.get(gid)
        if not prev or (t.get("created_at") and prev.get("created_at") and t["created_at"] > prev["created_at"]):
            latest_token[gid] = t
    for g in guests:
        g["active_token_count"] = token_count.get(g["id"], 0)
        lt = latest_token.get(g["id"])
        if lt:
            g["latest_token"] = lt.get("token")
            exp = lt.get("expires_at")
            if isinstance(exp, datetime):
                if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
                g["latest_token_expires_at"] = exp.isoformat()
    return {"ok": True, "total": len(guests), "guests": guests}


@router.get("/qr/{token}")
async def qr_code_svg(token: str, size: int = 260, x_admin_token: Optional[str] = Header(None)):
    """Return an SVG QR-code for the mobile URL. Admin-gated to prevent URL enumeration."""
    _require_admin(x_admin_token)
    from database import db as _db
    t = _db.concierge_mobile_tokens.find_one({"token": token}, {"_id": 0})
    if not t:
        raise HTTPException(404, "token not found")

    # Build canonical guest URL — the frontend router serves /m/concierge/{token}
    base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/") \
        or os.environ.get("FRONTEND_URL", "").rstrip("/") \
        or ""
    url = f"{base}/m/concierge/{token}" if base else f"/m/concierge/{token}"

    try:
        import qrcode
        import qrcode.image.svg as qsvg
        # SvgPathImage produces a single <path> — renders crisply at any CSS size
        factory = qsvg.SvgPathImage
        qr = qrcode.QRCode(box_size=10, border=2)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(image_factory=factory)
        from io import BytesIO
        buf = BytesIO()
        img.save(buf)
        svg = buf.getvalue().decode("utf-8")
        # Strip fixed width/height so the client can scale — keep viewBox
        import re as _re
        svg = _re.sub(r'\swidth="[^"]*"', ' width="100%"', svg, count=1)
        svg = _re.sub(r'\sheight="[^"]*"', ' height="100%"', svg, count=1)
    except Exception as e:
        raise HTTPException(503, f"QR generation unavailable: {e}")
    from fastapi.responses import Response
    return Response(content=svg, media_type="image/svg+xml",
                    headers={"Cache-Control": "private, max-age=300"})


@router.post("/revoke/{token}")
async def revoke_token(token: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.concierge_mobile_tokens.delete_one({"token": token})
    return {"ok": True, "deleted": r.deleted_count}
