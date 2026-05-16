"""
iter177 · Phase 6 · Emergent-managed Google OAuth for staff

Flow (per Emergent Auth Integration Playbook):
  1. Frontend redirects to https://auth.emergentagent.com/?redirect={origin}/auth/callback
  2. Emergent handles Google OAuth and redirects back to `/auth/callback#session_id=...`
  3. Frontend synchronously extracts session_id from URL hash and POSTs to
     /api/auth/session (this endpoint, exactly once)
  4. This route calls Emergent's session-data endpoint, persists user + session,
     sets an httpOnly session cookie, and returns the merged user payload.
  5. Subsequent calls hit /api/auth/me to validate the session and auto-resolve
     the authenticated user to an employees record (match by email).

Collections:
  - auth_users: {user_id, email, name, picture, created_at, updated_at}
  - auth_sessions: {session_token, user_id, expires_at, created_at}
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import requests
from fastapi import APIRouter, Cookie, HTTPException, Request, Response, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
SESSION_TTL_DAYS = 7
COOKIE_NAME = "session_token"


class ExchangeBody(BaseModel):
    session_id: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _session_expiry() -> datetime:
    return _now() + timedelta(days=SESSION_TTL_DAYS)


def _match_employee(email: str) -> Optional[Dict[str, Any]]:
    from database import db as _db
    if not email:
        return None
    # Case-insensitive exact match on the employees.email field
    e = _db.employees.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0})
    if not e:
        return None
    return {
        "id": e.get("id"),
        "display_name": e.get("display_name") or f"{e.get('first_name','')} {e.get('last_name','')}".strip(),
        "department": e.get("department"),
        "role": e.get("role"),
        "title": e.get("title"),
        "job_profile_code": e.get("job_profile_code"),
        "job_profile_title": e.get("job_profile_title"),
        "hire_date": e.get("hire_date"),
        "birthday": e.get("birthday"),
    }


def _authenticated_user(request: Request, authorization: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Look up the current user via session_token cookie first, Authorization bearer as fallback."""
    from database import db as _db
    tok = request.cookies.get(COOKIE_NAME)
    if not tok and authorization and authorization.lower().startswith("bearer "):
        tok = authorization.split(" ", 1)[1].strip()
    if not tok:
        return None
    s = _db.auth_sessions.find_one({"session_token": tok}, {"_id": 0})
    if not s:
        return None
    # Handle naive datetimes from legacy records
    exp = s.get("expires_at")
    if isinstance(exp, str):
        try: exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        except Exception: exp = None
    if not exp:
        return None
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < _now():
        _db.auth_sessions.delete_one({"session_token": tok})
        return None
    u = _db.auth_users.find_one({"user_id": s["user_id"]}, {"_id": 0})
    if not u:
        return None
    u["session_token"] = tok
    return u


# ─── POST /api/auth/session  (session_id exchange) ─────────────────────────
@router.post("/session")
async def exchange_session(body: ExchangeBody, response: Response):
    """Exchange a one-time session_id for a persistent session_token."""
    from database import db as _db
    if not body.session_id:
        raise HTTPException(400, "session_id required")
    try:
        r = requests.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id}, timeout=10)
    except Exception as e:
        raise HTTPException(502, f"auth provider unreachable: {e}")
    if r.status_code != 200:
        raise HTTPException(401, f"session_id rejected ({r.status_code})")
    data = r.json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(502, "provider returned no email")
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture") or ""
    session_token = data.get("session_token") or uuid.uuid4().hex
    now = _now()

    existing = _db.auth_users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        _db.auth_users.update_one({"user_id": user_id}, {"$set": {
            "name": name, "picture": picture, "updated_at": now,
        }})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        _db.auth_users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "created_at": now, "updated_at": now,
        })

    _db.auth_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": _session_expiry(),
        "created_at": now,
    })

    # Set httpOnly cookie (cross-origin safe)
    response.set_cookie(
        key=COOKIE_NAME, value=session_token,
        max_age=SESSION_TTL_DAYS * 86400,
        httponly=True, secure=True, samesite="none", path="/",
    )

    return {
        "ok": True,
        "user": {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "session_token": session_token,  # also returned so caller can cache it
        },
        "employee_match": _match_employee(email),
    }


# ─── GET /api/auth/me ───────────────────────────────────────────────────────
@router.get("/me")
async def get_me(request: Request, authorization: Optional[str] = Header(None)):
    u = _authenticated_user(request, authorization)
    if not u:
        raise HTTPException(401, "not authenticated")
    return {
        "ok": True,
        "user": {
            "user_id": u["user_id"], "email": u["email"], "name": u.get("name"),
            "picture": u.get("picture"),
        },
        "employee_match": _match_employee(u["email"]),
    }


# ─── POST /api/auth/logout ─────────────────────────────────────────────────
@router.post("/logout")
async def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    from database import db as _db
    tok = request.cookies.get(COOKIE_NAME)
    if not tok and authorization and authorization.lower().startswith("bearer "):
        tok = authorization.split(" ", 1)[1].strip()
    if tok:
        _db.auth_sessions.delete_one({"session_token": tok})
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}
