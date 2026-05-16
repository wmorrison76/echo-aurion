"""iter184 · Group Events — co-authored itinerary for corporate groups + conferences.

Typical flow:
  - Admin (resort event planner) creates event shell: company, dates, planner emails
  - Both the company planner and resort planner get magic links
  - Either can add sessions (meeting rooms, meals, coffee breaks) to shared itinerary
  - Attendees access via a read-only code (posted on the event app / badge QR)

Endpoints:
  POST  /events/upsert                     admin
  GET   /events                            admin
  GET   /events/{code}                     public (attendee code)
  POST  /events/{code}/session/add         admin or planner
  POST  /events/{code}/invite-planner      admin → returns magic link
  POST  /events/{code}/attendee-code       admin → returns read-only code
"""
from __future__ import annotations
import os, secrets, uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/group-events", tags=["group-events"])


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _require_planner(x_planner_token: Optional[str], event_code: str) -> Dict[str, Any]:
    if not x_planner_token: raise HTTPException(401, "planner token required")
    from database import db as _db
    rec = _db.group_event_planner_tokens.find_one({"token": x_planner_token, "event_code": event_code}, {"_id": 0})
    if not rec: raise HTTPException(401, "invalid planner token")
    exp = rec.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now(): raise HTTPException(410, "planner token expired")
    return rec


class EventUpsert(BaseModel):
    code: str                         # e.g. "acme-offsite-2026"
    company_name: str
    event_name: str
    date_start: str                   # YYYY-MM-DD
    date_end: str
    attendee_count: Optional[int] = None
    primary_planner_email: Optional[str] = None
    resort_planner_email: Optional[str] = None
    welcome_note: Optional[str] = None


@router.post("/events/upsert")
async def upsert_event(body: EventUpsert, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    code = body.code.strip().lower()
    doc = body.model_dump(); doc["code"] = code; doc["updated_at"] = _iso()
    existing = _db.group_events.find_one({"code": code}, {"_id": 0})
    if existing:
        doc["id"] = existing["id"]; doc["created_at"] = existing.get("created_at") or _iso()
        _db.group_events.update_one({"code": code}, {"$set": doc})
    else:
        doc["id"] = uuid.uuid4().hex[:12]; doc["created_at"] = _iso()
        doc["itinerary"] = []; doc["attendee_code"] = secrets.token_urlsafe(6)
        _db.group_events.insert_one(doc.copy())
    saved = _db.group_events.find_one({"code": code}, {"_id": 0})
    return {"ok": True, "event": saved}


@router.get("/events")
async def list_events(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    items = list(_db.group_events.find({}, {"_id": 0}).sort("date_start", -1).limit(100))
    return {"ok": True, "total": len(items), "events": items}


@router.get("/events/{code}")
async def get_event(code: str, attendee_code: Optional[str] = None, x_planner_token: Optional[str] = Header(None),
                    x_admin_token: Optional[str] = Header(None)):
    from database import db as _db
    e = _db.group_events.find_one({"code": code.lower()}, {"_id": 0})
    if not e: raise HTTPException(404, "event not found")
    # Authorization: admin / planner / attendee_code
    is_admin = bool(os.environ.get("ADMIN_API_TOKEN")) and x_admin_token == os.environ.get("ADMIN_API_TOKEN")
    is_planner = False
    if x_planner_token:
        try: _require_planner(x_planner_token, code.lower()); is_planner = True
        except HTTPException: pass
    is_attendee = attendee_code and attendee_code == e.get("attendee_code")
    if not (is_admin or is_planner or is_attendee):
        raise HTTPException(401, "access code required (?attendee_code=… or X-Planner-Token)")
    # Hide attendee_code from attendees
    if is_attendee and not (is_admin or is_planner):
        e.pop("attendee_code", None)
        e.pop("primary_planner_email", None); e.pop("resort_planner_email", None)
    return {"ok": True, "event": e, "can_edit": is_admin or is_planner}


class SessionAdd(BaseModel):
    date: str   # YYYY-MM-DD
    time: str   # HH:MM
    duration_min: int = 60
    title: str
    location: str
    kind: str = "meeting"   # meeting | meal | coffee-break | keynote | off-site | team-building
    menu_url: Optional[str] = None
    notes: Optional[str] = None
    owner: Optional[str] = None  # "company" | "resort"


@router.post("/events/{code}/session/add")
async def add_session(code: str, body: SessionAdd, x_planner_token: Optional[str] = Header(None),
                      x_admin_token: Optional[str] = Header(None)):
    from database import db as _db
    # Either admin or planner OK
    is_admin = bool(os.environ.get("ADMIN_API_TOKEN")) and x_admin_token == os.environ.get("ADMIN_API_TOKEN")
    if not is_admin:
        _require_planner(x_planner_token, code.lower())
    e = _db.group_events.find_one({"code": code.lower()}, {"_id": 0})
    if not e: raise HTTPException(404, "event not found")
    session = body.model_dump(); session["id"] = uuid.uuid4().hex[:10]; session["created_at"] = _iso()
    _db.group_events.update_one({"code": code.lower()},
                                {"$push": {"itinerary": session},
                                 "$set": {"updated_at": _iso()}})
    return {"ok": True, "session": session}


@router.post("/events/{code}/invite-planner")
async def invite_planner(code: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    e = _db.group_events.find_one({"code": code.lower()}, {"_id": 0})
    if not e: raise HTTPException(404, "event not found")
    tok = secrets.token_urlsafe(18)
    _db.group_event_planner_tokens.insert_one({
        "token": tok, "event_code": code.lower(),
        "created_at": _now(),
        "expires_at": _now() + timedelta(days=60),
    })
    return {"ok": True, "planner_token": tok,
            "planner_url": f"/g/event/{code.lower()}?planner={tok}",
            "attendee_code": e.get("attendee_code"),
            "attendee_url": f"/g/event/{code.lower()}?attendee={e.get('attendee_code')}"}


@router.post("/events/{code}/attendee-code")
async def rotate_attendee_code(code: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    new_code = secrets.token_urlsafe(6)
    r = _db.group_events.update_one({"code": code.lower()}, {"$set": {"attendee_code": new_code, "updated_at": _iso()}})
    if r.matched_count == 0: raise HTTPException(404, "event not found")
    return {"ok": True, "attendee_code": new_code,
            "attendee_url": f"/g/event/{code.lower()}?attendee={new_code}"}
