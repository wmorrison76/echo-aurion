"""
MyEcho · PIN Re-auth
====================

Lightweight PIN-based re-authentication gate for sensitive personal-data
panels (paystubs, tax docs, garnishments, beneficiaries). Real flow — no
mocks.

Storage:
  collection: user_pins
    { _id, user_id, pin_hash (bcrypt), created_at, updated_at, failed_attempts,
      locked_until }

Endpoints (all prefixed /api/myecho/pin):
  GET    /status?user_id=...    → { has_pin, locked }
  POST   /setup                 → set/update PIN (4-6 digits)
  POST   /verify                → verify PIN, returns short-lived token
  POST   /change                → change PIN (requires old PIN)

Verification tokens are stored in-process for 15 minutes. The frontend
holds the token in memory only — it's not persisted to localStorage.

Doctrine §1.1 — this is a real gate against the real DB. The downstream
paystub data may be demo-shaped (myecho_staff.py returns demo:true), but
the PIN check itself is genuine.
"""
from __future__ import annotations

import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import bcrypt
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo import MongoClient


router = APIRouter(prefix="/api/myecho/pin", tags=["myecho-pin"])

# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------
_client = MongoClient(os.environ["MONGO_URL"])
_db = _client[os.environ["DB_NAME"]]
_pins = _db["user_pins"]
_pins.create_index("user_id", unique=True)

# Verification tokens — in-memory only (intentional; tokens expire in 15m)
_VERIFICATION_TOKENS: Dict[str, Dict] = {}
_TOKEN_TTL_MINUTES = 15
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_MINUTES = 15
_PIN_REGEX = re.compile(r"^\d{4,6}$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_pin_hash(pin: str, pin_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))
    except Exception:
        return False


def _issue_token(user_id: str) -> Dict:
    """Issue a 15-minute verification token bound to user_id."""
    token = secrets.token_urlsafe(24)
    expires_at = _now() + timedelta(minutes=_TOKEN_TTL_MINUTES)
    _VERIFICATION_TOKENS[token] = {
        "user_id": user_id,
        "issued_at": _now(),
        "expires_at": expires_at,
    }
    # Reap expired tokens lazily so the dict stays small
    expired = [t for t, v in _VERIFICATION_TOKENS.items() if v["expires_at"] < _now()]
    for t in expired:
        _VERIFICATION_TOKENS.pop(t, None)
    return {"token": token, "expires_at": expires_at.isoformat()}


# ---------------------------------------------------------------------------
# Public verification (used by other backend routes that want to gate sensitive
# endpoints behind the PIN check).
# ---------------------------------------------------------------------------
def verify_pin_token(token: Optional[str], user_id: str) -> bool:
    if not token:
        return False
    entry = _VERIFICATION_TOKENS.get(token)
    if not entry:
        return False
    if entry["expires_at"] < _now():
        _VERIFICATION_TOKENS.pop(token, None)
        return False
    return entry["user_id"] == user_id


# ---------------------------------------------------------------------------
# Pydantic
# ---------------------------------------------------------------------------
class PinSetupRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    pin: str = Field(..., min_length=4, max_length=6)


class PinVerifyRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    pin: str = Field(..., min_length=4, max_length=6)


class PinChangeRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    old_pin: str = Field(..., min_length=4, max_length=6)
    new_pin: str = Field(..., min_length=4, max_length=6)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.get("/status")
def status(user_id: str = Query(..., min_length=1)):
    doc = _pins.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return {"user_id": user_id, "has_pin": False, "locked": False}
    locked = False
    locked_until: Optional[str] = None
    if doc.get("locked_until"):
        lu = doc["locked_until"]
        if isinstance(lu, datetime) and lu > _now():
            locked = True
            locked_until = lu.isoformat()
    return {
        "user_id": user_id,
        "has_pin": True,
        "locked": locked,
        "locked_until": locked_until,
        "failed_attempts": doc.get("failed_attempts", 0),
    }


@router.post("/setup")
def setup(req: PinSetupRequest):
    if not _PIN_REGEX.match(req.pin):
        raise HTTPException(status_code=400, detail="PIN must be 4–6 digits")
    if _pins.find_one({"user_id": req.user_id}):
        raise HTTPException(
            status_code=409,
            detail="PIN already set for this user. Use /change instead.",
        )
    now = _now()
    _pins.insert_one({
        "user_id": req.user_id,
        "pin_hash": _hash_pin(req.pin),
        "created_at": now,
        "updated_at": now,
        "failed_attempts": 0,
        "locked_until": None,
    })
    # Auto-verify after setup so the user doesn't have to re-enter immediately
    token_info = _issue_token(req.user_id)
    return {"ok": True, "user_id": req.user_id, **token_info}


@router.post("/verify")
def verify(req: PinVerifyRequest):
    doc = _pins.find_one({"user_id": req.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="No PIN set for this user")
    if doc.get("locked_until") and isinstance(doc["locked_until"], datetime) and doc["locked_until"] > _now():
        raise HTTPException(
            status_code=429,
            detail=f"Account locked until {doc['locked_until'].isoformat()}",
        )
    if not _verify_pin_hash(req.pin, doc["pin_hash"]):
        attempts = doc.get("failed_attempts", 0) + 1
        update: Dict = {"failed_attempts": attempts, "updated_at": _now()}
        if attempts >= _MAX_FAILED_ATTEMPTS:
            update["locked_until"] = _now() + timedelta(minutes=_LOCKOUT_MINUTES)
            update["failed_attempts"] = 0
        _pins.update_one({"user_id": req.user_id}, {"$set": update})
        raise HTTPException(
            status_code=401,
            detail=f"Incorrect PIN. Attempts: {attempts}/{_MAX_FAILED_ATTEMPTS}",
        )
    # Success — reset failed counter, issue token
    _pins.update_one(
        {"user_id": req.user_id},
        {"$set": {"failed_attempts": 0, "locked_until": None, "updated_at": _now()}},
    )
    token_info = _issue_token(req.user_id)
    return {"ok": True, "user_id": req.user_id, **token_info}


@router.post("/change")
def change(req: PinChangeRequest):
    doc = _pins.find_one({"user_id": req.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="No PIN set for this user")
    if not _verify_pin_hash(req.old_pin, doc["pin_hash"]):
        raise HTTPException(status_code=401, detail="Old PIN incorrect")
    if not _PIN_REGEX.match(req.new_pin):
        raise HTTPException(status_code=400, detail="New PIN must be 4–6 digits")
    _pins.update_one(
        {"user_id": req.user_id},
        {"$set": {"pin_hash": _hash_pin(req.new_pin), "updated_at": _now(), "failed_attempts": 0, "locked_until": None}},
    )
    token_info = _issue_token(req.user_id)
    return {"ok": True, "user_id": req.user_id, **token_info}
