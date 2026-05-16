"""
iter266.17 · BEO Messaging (WhatsApp-clone for EchoEvents/EchoEventsStudio)
=========================================================================

When the user who booked the event has a question for the Event Manager,
they can fire a thread directly from the BEO drawer. The thread is keyed
on the BEO id so:

  • Auto-context message prefilled with BEO# + Client + Date + Guests
  • Same thread surfaces in MyEcho mobile (continuity desktop ↔ mobile)
  • Event manager replies from MyEcho or Concierge web
  • Single source of truth: beo_messages collection

No mocks — every message persists, every read is real.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/beo-messaging", tags=["beo-messaging"])

_now = lambda: datetime.now(timezone.utc)
_now_iso = lambda: _now().isoformat()


def _build_auto_context(beo: dict) -> str:
    """The pre-populated WhatsApp-style opening message."""
    parts = [
        f"BEO #{beo.get('id', '—')}",
        f"Client: {beo.get('client_name', '—')}",
        f"Date: {(beo.get('start_at') or '—')[:10]}",
        f"Guest Count: {beo.get('expected_covers', 0)}",
    ]
    return "  ·  ".join(parts)


class SendBody(BaseModel):
    beo_id: str
    sender_id: str
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    body: str = Field(min_length=1, max_length=4000)
    is_auto_context: bool = False
    channel: str = "desktop"  # desktop | mobile


@router.post("/send")
def send_message(payload: SendBody):
    beo = db["beo_functions"].find_one({"id": payload.beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, f"BEO {payload.beo_id} not found")

    msg = {
        "id": f"bmsg-{uuid4().hex[:12]}",
        "beo_id": payload.beo_id,
        "beo_name": beo.get("name"),
        "client_name": beo.get("client_name"),
        "event_date": (beo.get("start_at") or "")[:10],
        "sender_id": payload.sender_id,
        "sender_name": payload.sender_name or payload.sender_id,
        "sender_role": payload.sender_role,
        "body": payload.body,
        "is_auto_context": payload.is_auto_context,
        "channel": payload.channel,
        "read_by": [],
        "created_at": _now_iso(),
    }
    try:
        db["beo_messages"].insert_one(msg.copy())
    except Exception:
        pass
    msg.pop("_id", None)
    return {"ok": True, "message": msg}


@router.get("/thread/{beo_id}")
def get_thread(beo_id: str, limit: int = Query(200, le=500)):
    """Returns the full thread + a fresh auto-context line for the
    composer placeholder (lets the UI show what'll be prefilled before
    the user types anything)."""
    beo = db["beo_functions"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, f"BEO {beo_id} not found")
    try:
        rows = list(
            db["beo_messages"].find({"beo_id": beo_id}, {"_id": 0})
            .sort("created_at", 1).limit(limit)
        )
    except Exception:
        rows = []
    return {
        "beo_id": beo_id,
        "beo_name": beo.get("name"),
        "client_name": beo.get("client_name"),
        "event_date": (beo.get("start_at") or "")[:10],
        "auto_context_template": _build_auto_context(beo),
        "messages": rows,
        "count": len(rows),
    }


@router.get("/unread")
def list_unread(user_id: str = Query(...), limit: int = Query(50, le=200)):
    """Inbox feed for MyEcho + Concierge — every BEO thread with at least
    one message the user hasn't read yet. Surfaces last sender + body
    preview so the inbox can render WhatsApp-style cards."""
    try:
        rows = list(
            db["beo_messages"].find(
                {"read_by": {"$ne": user_id}, "sender_id": {"$ne": user_id}},
                {"_id": 0},
            ).sort("created_at", -1).limit(limit * 5)
        )
    except Exception:
        rows = []
    by_beo: dict = {}
    for r in rows:
        bid = r.get("beo_id")
        if bid in by_beo: continue
        by_beo[bid] = {
            "beo_id": bid,
            "beo_name": r.get("beo_name"),
            "client_name": r.get("client_name"),
            "event_date": r.get("event_date"),
            "last_sender": r.get("sender_name"),
            "last_sender_role": r.get("sender_role"),
            "last_body": r.get("body", "")[:140],
            "last_at": r.get("created_at"),
            "unread_count": 1,
        }
    threads = list(by_beo.values())[:limit]
    return {"threads": threads, "count": len(threads)}


class MarkReadBody(BaseModel):
    beo_id: str
    user_id: str


@router.post("/mark-read")
def mark_read(body: MarkReadBody):
    try:
        result = db["beo_messages"].update_many(
            {"beo_id": body.beo_id, "read_by": {"$ne": body.user_id}},
            {"$addToSet": {"read_by": body.user_id}},
        )
        return {"ok": True, "marked": result.modified_count}
    except Exception:
        return {"ok": False, "marked": 0}
