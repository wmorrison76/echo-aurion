"""
iter175 · Magic-Link Department Delegation for Daily Standup

Front Office can mint a tokenized URL for each department. The dept recipient
opens the link (no login) and can ONLY edit their own section(s). Tokens are
scoped to (date, dept, section_ids) and expire after 24h.

Routes under `/api/standup/delegation/*`.
"""
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/standup/delegation", tags=["standup-delegation"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


class MintRequest(BaseModel):
    date: str
    department: str
    section_ids: List[str]
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    ttl_hours: int = 24


@router.post("/mint")
async def mint_token(body: MintRequest, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    try: datetime.strptime(body.date, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "date must be YYYY-MM-DD")
    if not body.section_ids: raise HTTPException(400, "section_ids required")
    from database import db as _db
    token = secrets.token_urlsafe(24)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=max(1, min(168, body.ttl_hours)))).isoformat()
    doc = {"id": uuid.uuid4().hex[:12], "token": token, "date": body.date,
           "department": body.department, "section_ids": body.section_ids,
           "recipient_name": body.recipient_name, "recipient_email": body.recipient_email,
           "expires_at": expires_at, "used_count": 0, "created_at": _now_iso()}
    _db.standup_delegation_tokens.insert_one(doc.copy())
    base = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")
    url = f"{base}/delegation/{token}" if base else f"/delegation/{token}"
    return {"ok": True, "token": token, "url": url, "expires_at": expires_at,
            "scoped_to": {"date": body.date, "department": body.department, "section_ids": body.section_ids}}


@router.get("/resolve/{token}")
async def resolve(token: str):
    """What does this magic link unlock? Consumed by the delegation landing page."""
    from database import db as _db
    t = _db.standup_delegation_tokens.find_one({"token": token}, {"_id": 0})
    if not t: raise HTTPException(404, "invalid or expired token")
    if t.get("expires_at") and t["expires_at"] < _now_iso():
        raise HTTPException(410, "token expired")
    # Return scope + current board sections
    bd = _db.standup_boards.find_one({"date": t["date"]}, {"_id": 0}) or {}
    scoped = {sid: (bd.get("sections", {}) or {}).get(sid) for sid in t["section_ids"]}
    return {"ok": True, "token": token, "scope": t, "sections": scoped}


class EditRequest(BaseModel):
    token: str
    section_id: str
    content: Any
    editor_name: Optional[str] = None


@router.post("/edit")
async def edit(body: EditRequest):
    """Anonymous edit via token. Must be inside scope."""
    from database import db as _db
    t = _db.standup_delegation_tokens.find_one({"token": body.token}, {"_id": 0})
    if not t: raise HTTPException(404, "invalid token")
    if t.get("expires_at") and t["expires_at"] < _now_iso():
        raise HTTPException(410, "token expired")
    if body.section_id not in (t.get("section_ids") or []):
        raise HTTPException(403, f"section '{body.section_id}' not in delegation scope")
    # Refuse writes on confirmed/sent boards (same rule as /section)
    bd = _db.standup_boards.find_one({"date": t["date"]}, {"_id": 0})
    if not bd: raise HTTPException(404, "board for date not found")
    if bd.get("status") == "sent": raise HTTPException(409, "board already sent; cannot edit")
    editor = body.editor_name or t.get("recipient_name") or f"delegate({t.get('department','')})"
    _db.standup_boards.update_one({"date": t["date"]}, {"$set": {
        f"sections.{body.section_id}.content": body.content,
        f"sections.{body.section_id}.edited_by": editor,
        f"sections.{body.section_id}.updated_at": _now_iso(),
        f"sections.{body.section_id}.autofilled": False,
    }})
    _db.standup_delegation_tokens.update_one({"token": body.token},
        {"$inc": {"used_count": 1}, "$set": {"last_used_at": _now_iso(), "last_editor": editor}})
    return {"ok": True, "section_id": body.section_id, "date": t["date"]}


@router.get("/list")
async def list_tokens(date: Optional[str] = None):
    from database import db as _db
    q: Dict[str, Any] = {}
    if date: q["date"] = date
    items = list(_db.standup_delegation_tokens.find(q, {"_id": 0}).sort("created_at", -1).limit(200))
    # Never return the raw token in list view — only prefix
    return {"ok": True, "total": len(items),
            "tokens": [{**t, "token": t["token"][:6] + "…", "masked": True} for t in items]}
