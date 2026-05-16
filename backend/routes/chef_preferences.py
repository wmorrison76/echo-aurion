"""iter214 · Chef / user notification preferences

Stores notification preferences + contact methods per user. Used by EchoAi³
outbound alerts (order-ready, shortage, waste digest, etc.).

Collection: `user_notification_prefs`
  {
    user_id (email-like or employee_id),
    display_name, role, outlet_id,
    phone_e164 (E.164 string, nullable),
    phone_verified (bool),
    email (echo of auth),
    channels: { sms: bool, email: bool, push: bool, in_app: bool },
    alerts: {
      order_ready: bool,
      shortage: bool,
      waste_digest: bool,
      buffet_close: bool,
      par_sheet: bool,
      timeline_mentions: bool,
    },
    quiet_hours: {start_hour:int, end_hour:int, enabled:bool},
    updated_at, created_at,
  }
"""
from __future__ import annotations
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_ids  # noqa: F401

router = APIRouter(prefix="/api/chef-prefs", tags=["chef-preferences"])

_DEFAULT_CHANNELS = {"sms": False, "email": True, "push": True, "in_app": True}
_DEFAULT_ALERTS = {
    "order_ready": True,
    "shortage": True,
    "waste_digest": True,
    "buffet_close": True,
    "par_sheet": True,
    "timeline_mentions": True,
    "shortage_threshold_pct": 10,  # alert when stock <10% of par
}
_DEFAULT_QUIET = {"enabled": False, "start_hour": 22, "end_hour": 6}

E164 = re.compile(r"^\+?\d{10,15}$")


def _norm_phone(raw: Optional[str]) -> Optional[str]:
    if not raw: return None
    digits = re.sub(r"[^\d+]", "", raw)
    if not digits: return None
    # US default — prepend +1 when it looks like a 10-digit US number
    if not digits.startswith("+"):
        if len(digits) == 10: digits = "+1" + digits
        elif len(digits) == 11 and digits.startswith("1"): digits = "+" + digits
    return digits if E164.match(digits.replace("+", "")) else None


class PrefsUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    outlet_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    channels: Optional[Dict[str, bool]] = None
    alerts: Optional[Dict[str, Any]] = None
    quiet_hours: Optional[Dict[str, Any]] = None


def _identify_user(x_user_id: Optional[str] = None, authorization: Optional[str] = None) -> str:
    """For Phase 2 we accept either an X-User-Id header or a bearer token
    mapped to a session. Falls back to 'anon-test' for local preview."""
    from fastapi import Header as _H  # noqa: F401
    if x_user_id: return x_user_id.strip()[:120]
    # try resolve the auth session
    if authorization and authorization.lower().startswith("bearer "):
        tok = authorization.split(None, 1)[1].strip()
        s = db["auth_sessions"].find_one({"session_token": tok}, {"_id": 0, "user_email": 1, "user_id": 1}) \
            if db is not None else None
        if s: return (s.get("user_email") or s.get("user_id") or "anon-test")[:120]
    return "anon-test"


def _ensure_defaults(doc: Dict[str, Any]) -> Dict[str, Any]:
    doc.setdefault("channels", dict(_DEFAULT_CHANNELS))
    doc.setdefault("alerts", dict(_DEFAULT_ALERTS))
    doc.setdefault("quiet_hours", dict(_DEFAULT_QUIET))
    for k, v in _DEFAULT_CHANNELS.items(): doc["channels"].setdefault(k, v)
    for k, v in _DEFAULT_ALERTS.items(): doc["alerts"].setdefault(k, v)
    for k, v in _DEFAULT_QUIET.items(): doc["quiet_hours"].setdefault(k, v)
    return doc


@router.get("/me")
def get_my_prefs(x_user_id: Optional[str] = None, authorization: Optional[str] = None):
    from fastapi import Header
    # Explicit header resolver
    pass  # (param parsing handled by FastAPI at call-site)


# Re-implement with explicit headers (FastAPI style)
@router.get("/prefs")
def get_prefs(x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    user_id = x_user_id or "anon-test"
    doc = db["user_notification_prefs"].find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        doc = _ensure_defaults({"user_id": user_id,
                                "created_at": utcnow_iso(),
                                "updated_at": utcnow_iso()})
    else:
        doc = _ensure_defaults(doc)
    return {"ok": True, "prefs": doc, "defaults": {
        "channels": _DEFAULT_CHANNELS, "alerts": _DEFAULT_ALERTS, "quiet_hours": _DEFAULT_QUIET,
    }}


@router.put("/prefs")
def put_prefs(body: PrefsUpdate, x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    user_id = x_user_id or "anon-test"
    existing = db["user_notification_prefs"].find_one({"user_id": user_id}, {"_id": 0}) or {}
    merged: Dict[str, Any] = {**existing, "user_id": user_id, "updated_at": utcnow_iso()}
    if not existing: merged["created_at"] = utcnow_iso()

    if body.display_name is not None: merged["display_name"] = body.display_name.strip()[:80]
    if body.role is not None: merged["role"] = body.role.strip()[:60]
    if body.outlet_id is not None: merged["outlet_id"] = body.outlet_id.strip()[:60]
    if body.email is not None: merged["email"] = body.email.strip()[:200]
    if body.phone is not None:
        norm = _norm_phone(body.phone)
        if body.phone and norm is None:
            raise HTTPException(400, "invalid phone — use E.164 or 10-digit US")
        merged["phone_e164"] = norm
        merged["phone_verified"] = False  # reset on change

    if body.channels:
        merged.setdefault("channels", dict(_DEFAULT_CHANNELS))
        for k in ("sms", "email", "push", "in_app"):
            if k in body.channels: merged["channels"][k] = bool(body.channels[k])
    if body.alerts:
        merged.setdefault("alerts", dict(_DEFAULT_ALERTS))
        for k in _DEFAULT_ALERTS.keys():
            if k in body.alerts:
                v = body.alerts[k]
                merged["alerts"][k] = int(v) if k.endswith("_pct") else bool(v)
    if body.quiet_hours:
        merged.setdefault("quiet_hours", dict(_DEFAULT_QUIET))
        for k in ("enabled", "start_hour", "end_hour"):
            if k in body.quiet_hours:
                v = body.quiet_hours[k]
                merged["quiet_hours"][k] = bool(v) if k == "enabled" else max(0, min(23, int(v)))

    db["user_notification_prefs"].update_one(
        {"user_id": user_id}, {"$set": merged}, upsert=True,
    )
    return {"ok": True, "prefs": _ensure_defaults(merged)}


@router.post("/test-sms")
def send_test_sms(x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Fire a test SMS to the user's phone (once they have one saved)."""
    user_id = x_user_id or "anon-test"
    doc = db["user_notification_prefs"].find_one({"user_id": user_id}, {"_id": 0}) or {}
    phone = doc.get("phone_e164")
    if not phone:
        raise HTTPException(400, "no phone on file — save one first")
    from lib.sms import send_sms, credentials_status
    st = credentials_status()
    resp = send_sms(phone,
                    f"EchoAi³ test · preferences saved for {doc.get('display_name') or user_id}. 🧑‍🍳",
                    purpose="test", related_entity={"type": "user", "id": user_id})
    return {"ok": resp.get("ok", False), "twilio": resp, "credentials": st}


@router.get("/chefs-to-notify")
def chefs_to_notify(outlet_id: Optional[str] = None, alert: str = "buffet_close"):
    """Return the list of users who should receive a given alert — used by
    EchoWaste / future alert fan-out logic."""
    q: Dict[str, Any] = {f"alerts.{alert}": True, "channels.sms": True,
                         "phone_e164": {"$nin": [None, ""]}}
    if outlet_id: q["outlet_id"] = outlet_id
    rows = list(db["user_notification_prefs"].find(q, {"_id": 0}))
    return {"ok": True, "alert": alert, "chefs": rows, "count": len(rows)}
