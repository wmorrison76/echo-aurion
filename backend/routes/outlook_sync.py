"""
iter179 · Microsoft Graph / Outlook 2-way Calendar Sync — SCAFFOLDING

This is the Phase A scaffold. Full OAuth + delta sync + webhooks activates as
soon as William registers an Azure AD app and sets these env vars:

    AZURE_CLIENT_ID=<Application (client) ID>
    AZURE_CLIENT_SECRET=<client secret>
    AZURE_TENANT_ID=<directory (tenant) ID>
    OUTLOOK_REDIRECT_URI=https://{your-domain}/api/outlook/callback  # optional override

Endpoints:
  GET  /api/outlook/status            — whether configured + connected for current user
  GET  /api/outlook/authorize         — begin OAuth flow (302 to Microsoft)
  GET  /api/outlook/callback          — OAuth callback (exchanges code)
  POST /api/outlook/disconnect        — remove stored refresh token
  POST /api/outlook/sync/pull         — pull events via delta query (stub when disabled)
  POST /api/outlook/push-event        — push a local event to user's Outlook (stub when disabled)

Until env vars are present, all write endpoints return 503 with a clear
`{not_configured: true}` payload so the frontend can show "Admin: add Azure
keys to enable" instead of a broken button.

Security:
  - Refresh tokens stored encrypted (Fernet) via backend.observability... if
    ENCRYPTION_KEY set, plaintext otherwise with prominent warning log
  - User identity comes from the existing Emergent Google auth (cookie or
    Bearer token) — we re-use routes.auth_emergent._authenticated_user
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Header, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from lib.token_crypt import encrypt as _enc, decrypt as _dec

router = APIRouter(prefix="/api/outlook", tags=["outlook-sync"])

GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
DEFAULT_SCOPES = ["Calendars.ReadWrite", "offline_access", "User.Read"]


def _config() -> Dict[str, Any]:
    return {
        "client_id": os.environ.get("AZURE_CLIENT_ID", "").strip(),
        "client_secret": os.environ.get("AZURE_CLIENT_SECRET", "").strip(),
        "tenant_id": os.environ.get("AZURE_TENANT_ID", "common").strip(),
        "redirect_uri": os.environ.get("OUTLOOK_REDIRECT_URI", "").strip(),
    }


def _is_configured() -> bool:
    c = _config()
    return bool(c["client_id"] and c["client_secret"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(d: datetime) -> str:
    if d.tzinfo is None: d = d.replace(tzinfo=timezone.utc)
    return d.isoformat()


def _current_user(request: Request, authorization: Optional[str]) -> Dict[str, Any]:
    from routes.auth_emergent import _authenticated_user
    u = _authenticated_user(request, authorization)
    if not u:
        raise HTTPException(401, "not authenticated")
    return u


# ─── Status ────────────────────────────────────────────────────────────────
@router.get("/status")
async def status(request: Request, authorization: Optional[str] = Header(None)):
    configured = _is_configured()
    try:
        u = _current_user(request, authorization)
    except HTTPException:
        return {"ok": True, "configured": configured, "authenticated": False, "connected": False}
    from database import db as _db
    tok = _db.outlook_tokens.find_one({"user_id": u["user_id"]}, {"_id": 0,
                                                                 "encrypted_refresh_token": 0,
                                                                 "_cached_access_token": 0})
    return {
        "ok": True,
        "configured": configured,
        "authenticated": True,
        "connected": bool(tok and tok.get("status") == "active"),
        "outlook_email": (tok or {}).get("outlook_email"),
        "last_sync": (tok or {}).get("last_token_refresh"),
    }


# ─── OAuth · authorize ─────────────────────────────────────────────────────
@router.get("/authorize")
async def authorize(request: Request, authorization: Optional[str] = Header(None)):
    if not _is_configured():
        raise HTTPException(503, "Microsoft Graph not configured — set AZURE_CLIENT_ID/SECRET/TENANT_ID in backend/.env")
    u = _current_user(request, authorization)
    cfg = _config()
    # Generate CSRF state token tied to user_id
    state = secrets.token_urlsafe(24)
    from database import db as _db
    _db.outlook_oauth_state.insert_one({
        "state": state, "user_id": u["user_id"],
        "expires_at": _now() + timedelta(minutes=15), "created_at": _now(),
    })
    redirect_uri = cfg["redirect_uri"] or (str(request.base_url).rstrip("/") + "/api/outlook/callback")
    params = {
        "client_id": cfg["client_id"],
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "response_mode": "query",
        "scope": " ".join(DEFAULT_SCOPES),
        "state": state,
        "prompt": "consent",
    }
    url = f"https://login.microsoftonline.com/{cfg['tenant_id']}/oauth2/v2.0/authorize?" + urlencode(params)
    return RedirectResponse(url)


# ─── OAuth · callback ──────────────────────────────────────────────────────
@router.get("/callback")
async def callback(request: Request, code: Optional[str] = None, state: Optional[str] = None,
                   error: Optional[str] = None, error_description: Optional[str] = None):
    from database import db as _db
    if error:
        return RedirectResponse(f"/?outlook_error={error}")
    if not code or not state:
        raise HTTPException(400, "missing code or state")
    s = _db.outlook_oauth_state.find_one({"state": state}, {"_id": 0})
    if not s:
        raise HTTPException(400, "invalid state")
    exp = s.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            raise HTTPException(400, "state expired")
    _db.outlook_oauth_state.delete_one({"state": state})
    user_id = s["user_id"]

    if not _is_configured():
        raise HTTPException(503, "Microsoft Graph not configured")
    cfg = _config()
    redirect_uri = cfg["redirect_uri"] or (str(request.base_url).rstrip("/") + "/api/outlook/callback")

    import requests as _requests
    r = _requests.post(
        f"https://login.microsoftonline.com/{cfg['tenant_id']}/oauth2/v2.0/token",
        data={
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "scope": " ".join(DEFAULT_SCOPES),
        }, timeout=15,
    )
    if r.status_code != 200:
        return RedirectResponse(f"/?outlook_error=token_exchange_{r.status_code}")
    tok = r.json()
    refresh_token = tok.get("refresh_token") or ""
    access_token = tok.get("access_token") or ""
    expires_in = int(tok.get("expires_in") or 3600)
    if not refresh_token:
        return RedirectResponse("/?outlook_error=no_refresh_token")

    # Fetch Outlook email
    outlook_email = ""
    try:
        me = _requests.get(f"{GRAPH_API_BASE}/me", headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
        if me.status_code == 200:
            d = me.json()
            outlook_email = (d.get("mail") or d.get("userPrincipalName") or "").lower()
    except Exception:
        pass

    _db.outlook_tokens.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "encrypted_refresh_token": _enc(refresh_token),
            "_cached_access_token": access_token,
            "access_token_expires_at": _now() + timedelta(seconds=expires_in),
            "outlook_email": outlook_email,
            "status": "active",
            "connected_at": _now(),
            "last_token_refresh": _now(),
        }}, upsert=True,
    )
    return RedirectResponse("/?outlook_connected=1")


# ─── Disconnect ────────────────────────────────────────────────────────────
@router.post("/disconnect")
async def disconnect(request: Request, authorization: Optional[str] = Header(None)):
    u = _current_user(request, authorization)
    from database import db as _db
    _db.outlook_tokens.delete_one({"user_id": u["user_id"]})
    _db.outlook_sync_state.delete_one({"user_id": u["user_id"]})
    return {"ok": True}


# ─── Pull events (delta) ───────────────────────────────────────────────────
async def _valid_access_token(user_id: str) -> str:
    from database import db as _db
    rec = _db.outlook_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not rec or rec.get("status") != "active":
        raise HTTPException(400, "Outlook not connected")
    exp = rec.get("access_token_expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp > _now() + timedelta(minutes=2):
        cached = rec.get("_cached_access_token")
        if cached:
            return cached
    # Refresh
    cfg = _config()
    import requests as _requests
    r = _requests.post(
        f"https://login.microsoftonline.com/{cfg['tenant_id']}/oauth2/v2.0/token",
        data={
            "client_id": cfg["client_id"], "client_secret": cfg["client_secret"],
            "refresh_token": _dec(rec["encrypted_refresh_token"]),
            "grant_type": "refresh_token", "scope": " ".join(DEFAULT_SCOPES),
        }, timeout=15,
    )
    if r.status_code != 200:
        _db.outlook_tokens.update_one({"user_id": user_id}, {"$set": {"status": "expired"}})
        raise HTTPException(401, "refresh failed — please reconnect Outlook")
    d = r.json()
    new_access = d.get("access_token") or ""
    new_refresh_raw = d.get("refresh_token") or _dec(rec["encrypted_refresh_token"])
    expires_in = int(d.get("expires_in") or 3600)
    _db.outlook_tokens.update_one({"user_id": user_id}, {"$set": {
        "_cached_access_token": new_access,
        "encrypted_refresh_token": _enc(new_refresh_raw),
        "access_token_expires_at": _now() + timedelta(seconds=expires_in),
        "last_token_refresh": _now(),
    }})
    return new_access


@router.post("/sync/pull")
async def sync_pull(request: Request, authorization: Optional[str] = Header(None)):
    if not _is_configured():
        raise HTTPException(503, "Microsoft Graph not configured")
    u = _current_user(request, authorization)
    from database import db as _db
    import requests as _requests

    access = await _valid_access_token(u["user_id"])
    state = _db.outlook_sync_state.find_one({"user_id": u["user_id"]}, {"_id": 0}) or {}
    delta_link = state.get("delta_link")
    if delta_link:
        url = delta_link
    else:
        url = (
            f"{GRAPH_API_BASE}/me/calendarview/delta"
            f"?startDateTime={_iso(_now() - timedelta(days=30))}"
            f"&endDateTime={_iso(_now() + timedelta(days=90))}"
        )
    synced = 0
    next_link = url
    while next_link:
        r = _requests.get(next_link, headers={"Authorization": f"Bearer {access}",
                                              "Prefer": 'odata.maxpagesize=50'}, timeout=20)
        if r.status_code != 200:
            raise HTTPException(502, f"Graph API {r.status_code}: {r.text[:200]}")
        d = r.json()
        for ev in d.get("value") or []:
            if ev.get("@removed"):
                _db.outlook_events.delete_one({"user_id": u["user_id"], "outlook_event_id": ev.get("id")})
                continue
            _db.outlook_events.update_one(
                {"user_id": u["user_id"], "outlook_event_id": ev["id"]},
                {"$set": {
                    "user_id": u["user_id"], "outlook_event_id": ev["id"],
                    "title": ev.get("subject") or "",
                    "start_time": (ev.get("start") or {}).get("dateTime"),
                    "end_time": (ev.get("end") or {}).get("dateTime"),
                    "location": ((ev.get("location") or {}).get("displayName")) or "",
                    "is_all_day": bool(ev.get("isAllDay")),
                    "body_preview": ev.get("bodyPreview") or "",
                    "synced_at": _now(),
                    "source": "outlook_pull",
                }}, upsert=True,
            )
            synced += 1
        next_link = d.get("@odata.nextLink")
        if d.get("@odata.deltaLink"):
            _db.outlook_sync_state.update_one(
                {"user_id": u["user_id"]},
                {"$set": {"user_id": u["user_id"], "delta_link": d["@odata.deltaLink"], "last_sync": _now()}},
                upsert=True,
            )
    return {"ok": True, "synced": synced, "at": _iso(_now())}


@router.get("/events")
async def list_events(request: Request, limit: int = 50, authorization: Optional[str] = Header(None)):
    u = _current_user(request, authorization)
    from database import db as _db
    items = list(_db.outlook_events.find(
        {"user_id": u["user_id"]}, {"_id": 0}
    ).sort("start_time", -1).limit(max(1, min(200, limit))))
    return {"ok": True, "total": len(items), "events": items}


# ─── Push event to Outlook ─────────────────────────────────────────────────
class PushEvent(BaseModel):
    title: str
    start_time: str  # ISO 8601
    end_time: str
    description: Optional[str] = ""
    location: Optional[str] = ""
    is_all_day: bool = False
    category_tag: str = "EchoAi³"


@router.post("/push-event")
async def push_event(body: PushEvent, request: Request, authorization: Optional[str] = Header(None)):
    if not _is_configured():
        raise HTTPException(503, "Microsoft Graph not configured")
    u = _current_user(request, authorization)
    import requests as _requests
    access = await _valid_access_token(u["user_id"])
    payload = {
        "subject": body.title,
        "bodyPreview": body.description or "",
        "start": {"dateTime": body.start_time, "timeZone": "UTC"},
        "end": {"dateTime": body.end_time, "timeZone": "UTC"},
        "isAllDay": body.is_all_day,
        "categories": [body.category_tag],
        "reminderMinutesBeforeStart": 15,
        "isReminderOn": True,
    }
    if body.location:
        payload["location"] = {"displayName": body.location}
    r = _requests.post(f"{GRAPH_API_BASE}/me/events",
                       headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
                       json=payload, timeout=15)
    if r.status_code not in (200, 201):
        raise HTTPException(502, f"Graph API {r.status_code}: {r.text[:200]}")
    d = r.json()
    from database import db as _db
    _db.outlook_events.update_one(
        {"user_id": u["user_id"], "outlook_event_id": d["id"]},
        {"$set": {
            "user_id": u["user_id"], "outlook_event_id": d["id"],
            "title": body.title, "start_time": body.start_time, "end_time": body.end_time,
            "location": body.location, "is_all_day": body.is_all_day,
            "source": "local_push", "synced_at": _now(),
        }}, upsert=True,
    )
    return {"ok": True, "outlook_event_id": d["id"]}
