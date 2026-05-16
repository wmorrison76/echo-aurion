"""
iter173 · Phase 4 — Show Rooms ↔ Housekeeping Workflow

Front Office flags rooms as "show rooms" (designated for VIP tours, site visits,
sales walkthroughs). A Housekeeping manager must personally approve each show
room as Ready before it can be used. This ensures "one manager eyes on every
show room" before VIPs walk through.

Auto-feeds the Daily Standup "Showrooms" section.

Routes under `/api/showrooms/*`.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/showrooms", tags=["showrooms"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


SHOWROOM_PURPOSES = ["vip-walkthrough", "site-visit", "sales-tour", "executive-review", "media-tour", "other"]
SHOWROOM_STATUSES = ["designated", "in-prep", "pending-approval", "approved", "used", "released", "cancelled"]


class ShowRoom(BaseModel):
    id: Optional[str] = None
    room: str
    room_type: Optional[str] = None  # "Deluxe King", "Presidential Suite", etc.
    date: str  # YYYY-MM-DD
    window_start: Optional[str] = None  # HH:MM
    window_end: Optional[str] = None
    purpose: str = "sales-tour"
    audience: Optional[str] = None  # "McGriff group exec committee"
    designated_by: str = "front-office"  # employee name or role
    # Approval workflow
    status: str = "designated"
    approved_by: Optional[str] = None  # Housekeeping manager name
    approved_at: Optional[str] = None
    approval_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    property: Optional[str] = "main"


@router.post("/designate")
async def designate_showroom(sr: ShowRoom):
    if sr.purpose not in SHOWROOM_PURPOSES:
        raise HTTPException(400, f"unknown purpose '{sr.purpose}'")
    from database import db as _db
    doc = sr.model_dump()
    doc["id"] = uuid.uuid4().hex[:12]
    doc["status"] = "designated"
    doc["created_at"] = _now_iso()
    doc["updated_at"] = _now_iso()
    doc["history"] = [{"at": doc["created_at"], "actor": sr.designated_by, "action": "designated"}]
    _db.showrooms.insert_one(doc.copy())
    return {"ok": True, "showroom": _db.showrooms.find_one({"id": doc["id"]}, {"_id": 0})}


@router.post("/{showroom_id}/request-approval")
async def request_approval(showroom_id: str, actor: str = "front-office"):
    from database import db as _db
    sr = _db.showrooms.find_one({"id": showroom_id}, {"_id": 0})
    if not sr: raise HTTPException(404, "showroom not found")
    hist = sr.get("history") or []
    hist.append({"at": _now_iso(), "actor": actor, "action": "requested-approval",
                 "from": sr.get("status"), "to": "pending-approval"})
    _db.showrooms.update_one({"id": showroom_id}, {"$set": {
        "status": "pending-approval", "updated_at": _now_iso(), "history": hist,
    }})
    return {"ok": True, "showroom": _db.showrooms.find_one({"id": showroom_id}, {"_id": 0})}


@router.post("/{showroom_id}/approve")
async def approve_showroom(showroom_id: str, body: Dict[str, Any]):
    """Housekeeping manager approves. Requires hk_manager_name + optional notes."""
    name = (body or {}).get("hk_manager_name")
    if not name: raise HTTPException(400, "hk_manager_name required")
    from database import db as _db
    sr = _db.showrooms.find_one({"id": showroom_id}, {"_id": 0})
    if not sr: raise HTTPException(404, "showroom not found")
    hist = sr.get("history") or []
    hist.append({"at": _now_iso(), "actor": name, "action": "approved",
                 "from": sr.get("status"), "to": "approved",
                 "notes": (body or {}).get("notes")})
    _db.showrooms.update_one({"id": showroom_id}, {"$set": {
        "status": "approved", "approved_by": name, "approved_at": _now_iso(),
        "approval_notes": (body or {}).get("notes"),
        "updated_at": _now_iso(), "history": hist,
    }})
    return {"ok": True, "showroom": _db.showrooms.find_one({"id": showroom_id}, {"_id": 0})}


@router.post("/{showroom_id}/reject")
async def reject_showroom(showroom_id: str, body: Dict[str, Any]):
    name = (body or {}).get("hk_manager_name")
    reason = (body or {}).get("reason") or "No reason provided"
    if not name: raise HTTPException(400, "hk_manager_name required")
    from database import db as _db
    sr = _db.showrooms.find_one({"id": showroom_id}, {"_id": 0})
    if not sr: raise HTTPException(404, "showroom not found")
    hist = sr.get("history") or []
    hist.append({"at": _now_iso(), "actor": name, "action": "rejected", "reason": reason})
    _db.showrooms.update_one({"id": showroom_id}, {"$set": {
        "status": "in-prep", "rejection_reason": reason,
        "updated_at": _now_iso(), "history": hist,
    }})
    return {"ok": True, "showroom": _db.showrooms.find_one({"id": showroom_id}, {"_id": 0})}


@router.post("/{showroom_id}/release")
async def release_showroom(showroom_id: str):
    from database import db as _db
    sr = _db.showrooms.find_one({"id": showroom_id}, {"_id": 0})
    if not sr: raise HTTPException(404, "showroom not found")
    hist = sr.get("history") or []
    hist.append({"at": _now_iso(), "action": "released", "from": sr.get("status"), "to": "released"})
    _db.showrooms.update_one({"id": showroom_id}, {"$set": {
        "status": "released", "updated_at": _now_iso(), "history": hist,
    }})
    return {"ok": True}


@router.get("/list")
async def list_showrooms(date: Optional[str] = None, status: Optional[str] = None):
    from database import db as _db
    q: Dict[str, Any] = {}
    if date: q["date"] = date
    if status: q["status"] = status
    items = list(_db.showrooms.find(q, {"_id": 0}).sort([("date", 1), ("room", 1)]))
    return {"ok": True, "total": len(items), "showrooms": items,
            "purposes": SHOWROOM_PURPOSES, "statuses": SHOWROOM_STATUSES}


@router.get("/today-for-standup")
async def today_for_standup(date_iso: Optional[str] = None):
    """Structured rows for the Daily Standup 'Showrooms' section."""
    if not date_iso:
        date_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    from database import db as _db
    items = list(_db.showrooms.find({"date": date_iso, "status": {"$nin": ["cancelled", "released"]}}, {"_id": 0}).sort("room", 1))
    rows = [{"room": s["room"], "room_type": s.get("room_type"),
             "purpose": s.get("purpose"), "audience": s.get("audience"),
             "window": f"{s.get('window_start') or '—'}-{s.get('window_end') or '—'}",
             "status": s.get("status"), "approved_by": s.get("approved_by")}
            for s in items]
    return {"ok": True, "date": date_iso, "total": len(rows), "rows": rows}
