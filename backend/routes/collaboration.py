"""
Real-Time Collaboration — WebSocket-based live editing for EchoLayout.
Supports cursor sharing, presence indicators, live edit broadcasting,
and collaborative room design sessions.
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os

router = APIRouter(prefix="/api/collaboration", tags=["collaboration"])

from database import db as _db
sessions_col = _db["collab_sessions"]
edits_col = _db["collab_edits"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# Colors for user cursors
CURSOR_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#06b6d4", "#f97316"]

@router.post("/sessions")
def create_session(body: dict):
    """Create a new collaboration session for a layout/room."""
    session = {
        "session_id": f"collab-{_uid()}",
        "name": body.get("name", "Untitled Session"),
        "layout_id": body.get("layout_id"),
        "room_name": body.get("room_name", ""),
        "created_by": body.get("user_name", "Anonymous"),
        "status": "active",
        "participants": [{
            "user_id": f"user-{_uid()}",
            "name": body.get("user_name", "Anonymous"),
            "color": CURSOR_COLORS[0],
            "joined_at": _now(),
            "cursor": {"x": 0, "y": 0},
            "role": "host",
        }],
        "max_participants": 8,
        "edit_count": 0,
        "created_at": _now(),
        "updated_at": _now(),
    }
    sessions_col.insert_one(session)
    del session["_id"]
    return session


@router.get("/sessions")
def list_sessions(status: Optional[str] = "active"):
    """List all collaboration sessions."""
    q = {}
    if status:
        q["status"] = status
    sessions = list(sessions_col.find(q, {"_id": 0}).sort("created_at", -1).limit(20))
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    """Get session details including participants and their cursors."""
    session = sessions_col.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return {"error": "Session not found"}
    return session


@router.post("/sessions/{session_id}/join")
def join_session(session_id: str, body: dict):
    """Join an existing collaboration session."""
    session = sessions_col.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return {"error": "Session not found"}
    if len(session.get("participants", [])) >= session.get("max_participants", 8):
        return {"error": "Session full"}

    participant = {
        "user_id": f"user-{_uid()}",
        "name": body.get("user_name", "Anonymous"),
        "color": CURSOR_COLORS[len(session.get("participants", [])) % len(CURSOR_COLORS)],
        "joined_at": _now(),
        "cursor": {"x": 0, "y": 0},
        "role": "collaborator",
    }

    sessions_col.update_one(
        {"session_id": session_id},
        {"$push": {"participants": participant}, "$set": {"updated_at": _now()}},
    )
    return {"joined": True, "participant": participant, "session_id": session_id}


@router.post("/sessions/{session_id}/leave")
def leave_session(session_id: str, body: dict):
    """Leave a collaboration session."""
    user_id = body.get("user_id")
    sessions_col.update_one(
        {"session_id": session_id},
        {"$pull": {"participants": {"user_id": user_id}}, "$set": {"updated_at": _now()}},
    )
    return {"left": True}


@router.post("/sessions/{session_id}/cursor")
def update_cursor(session_id: str, body: dict):
    """Update user's cursor position."""
    user_id = body.get("user_id")
    x = body.get("x", 0)
    y = body.get("y", 0)
    sessions_col.update_one(
        {"session_id": session_id, "participants.user_id": user_id},
        {"$set": {"participants.$.cursor": {"x": x, "y": y}, "updated_at": _now()}},
    )
    return {"updated": True}


@router.post("/sessions/{session_id}/edit")
def broadcast_edit(session_id: str, body: dict):
    """Record and broadcast an edit action."""
    edit = {
        "edit_id": f"edit-{_uid()}",
        "session_id": session_id,
        "user_id": body.get("user_id"),
        "user_name": body.get("user_name", "Anonymous"),
        "action": body.get("action", "move"),
        "element_id": body.get("element_id"),
        "element_type": body.get("element_type", "table"),
        "changes": body.get("changes", {}),
        "created_at": _now(),
    }
    edits_col.insert_one(edit)
    del edit["_id"]

    sessions_col.update_one(
        {"session_id": session_id},
        {"$inc": {"edit_count": 1}, "$set": {"updated_at": _now()}},
    )
    return edit


@router.get("/sessions/{session_id}/edits")
def get_edits(session_id: str, since: Optional[str] = None, limit: int = 50):
    """Get edit history for a session."""
    q = {"session_id": session_id}
    if since:
        q["created_at"] = {"$gt": since}
    edits = list(edits_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"edits": edits, "total": len(edits)}


@router.post("/sessions/{session_id}/end")
def end_session(session_id: str):
    """End a collaboration session."""
    sessions_col.update_one(
        {"session_id": session_id},
        {"$set": {"status": "ended", "ended_at": _now(), "updated_at": _now()}},
    )
    return {"ended": True}
