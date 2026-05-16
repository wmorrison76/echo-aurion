"""iter193 · FM-Upgrade 0 — Release notes surface.

  GET  /api/release-notes                 (public, latest 20 published)
  POST /api/release-notes                 (admin — create)
  POST /api/release-notes/{id}/publish    (admin)
  POST /api/release-notes/{id}/unpublish  (admin)
  DELETE /api/release-notes/{id}          (admin)
  POST /api/release-notes/{id}/dismiss    (per-staff · briefing token)
  GET  /api/release-notes/unread          (per-staff · briefing token)
"""
from __future__ import annotations
import os
from datetime import datetime, timezone
from uuid import uuid4
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/release-notes", tags=["release-notes"])


def _now_iso() -> str: return datetime.now(timezone.utc).isoformat()
def _uid() -> str: return str(uuid4())[:12]


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _auth_staff(x_briefing_token: Optional[str]) -> Dict[str, Any]:
    if not x_briefing_token: raise HTTPException(401, "staff token required")
    from database import db as _db
    sess = _db.briefing_mobile_tokens.find_one({"token": x_briefing_token, "active": True}, {"_id": 0})
    if not sess: raise HTTPException(401, "invalid or revoked token")
    return sess


class ReleaseNoteBody(BaseModel):
    title: str
    body: str
    version: Optional[str] = None   # e.g., "iter193"
    category: Optional[str] = "feature"  # feature|fix|breaking|notice
    audience: Optional[List[str]] = None  # roles that should see this; None = everyone


@router.get("")
async def list_published(limit: int = 20):
    from database import db as _db
    items = list(_db.release_notes
                 .find({"published": True}, {"_id": 0})
                 .sort("published_at", -1).limit(max(1, min(100, limit))))
    return {"ok": True, "total": len(items), "notes": items}


@router.post("")
async def admin_create(body: ReleaseNoteBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    doc = {
        "id": _uid(),
        "title": body.title.strip(),
        "body": body.body.strip(),
        "version": body.version,
        "category": (body.category or "feature").lower(),
        "audience": body.audience or [],
        "published": False,
        "published_at": None,
        "created_at": _now_iso(),
    }
    if not doc["title"] or not doc["body"]:
        raise HTTPException(400, "title and body required")
    _db.release_notes.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "note": doc}


@router.post("/{note_id}/publish")
async def admin_publish(note_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.release_notes.update_one(
        {"id": note_id},
        {"$set": {"published": True, "published_at": _now_iso()}},
    )
    if not r.matched_count: raise HTTPException(404, "note not found")
    return {"ok": True}


@router.post("/{note_id}/unpublish")
async def admin_unpublish(note_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.release_notes.update_one({"id": note_id}, {"$set": {"published": False}})
    if not r.matched_count: raise HTTPException(404, "note not found")
    return {"ok": True}


@router.delete("/{note_id}")
async def admin_delete(note_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.release_notes.delete_one({"id": note_id})
    return {"ok": True, "deleted": r.deleted_count}


@router.get("/unread")
async def staff_unread(x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    from database import db as _db
    dismissed = set(
        (_db.release_notes_reads.find_one(
            {"staff_token": sess.get("token")}, {"_id": 0}) or {}
        ).get("dismissed_ids", [])
    )
    items = list(_db.release_notes.find({"published": True}, {"_id": 0})
                 .sort("published_at", -1).limit(50))
    unread = [n for n in items if n["id"] not in dismissed]
    return {"ok": True, "unread_count": len(unread), "unread": unread[:10]}


@router.post("/{note_id}/dismiss")
async def staff_dismiss(note_id: str, x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    from database import db as _db
    _db.release_notes_reads.update_one(
        {"staff_token": sess.get("token")},
        {"$addToSet": {"dismissed_ids": note_id}, "$set": {"updated_at": _now_iso()}},
        upsert=True,
    )
    return {"ok": True}
