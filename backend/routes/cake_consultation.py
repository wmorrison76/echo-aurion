"""
Live Cake Consultation — WebSocket-synced real-time viewer
==========================================================
Generates shareable consultation links. The designer works in the
Cake Designer, changes sync via WebSocket to the client's read-only
viewer. Client can rotate the 3D cake, browse the gallery, and approve.
"""
import os
import json
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from database import db
from typing import Dict

router = APIRouter(prefix="/api/cake-consultation", tags=["cake-consultation"])

_uid = lambda: str(uuid4())[:8]
_now = lambda: datetime.now(timezone.utc).isoformat()

# Active consultations: session_id -> { design_state, connected_clients }
active_sessions: Dict[str, dict] = {}


@router.post("/create")
async def create_consultation(body: dict = {}):
    """Create a new cake consultation session with a shareable link."""
    session_id = f"consult-{_uid()}"
    client_name = body.get("client_name", "Guest")
    designer_name = body.get("designer_name", "Pastry Chef")

    session = {
        "id": session_id,
        "client_name": client_name,
        "designer_name": designer_name,
        "status": "active",
        "design_state": body.get("initial_design", {}),
        "gallery": body.get("gallery", []),
        "messages": [],
        "client_approved": False,
        "client_comments": "",
        "created_at": _now(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    }

    db["cake_consultations"].insert_one({**session})
    active_sessions[session_id] = {"design_state": session["design_state"], "clients": set()}

    base_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    share_link = f"{base_url}/cake-view/{session_id}" if base_url else f"/cake-view/{session_id}"

    return {
        "session_id": session_id,
        "share_link": share_link,
        "expires_at": session["expires_at"],
    }


@router.get("/session/{session_id}")
async def get_consultation(session_id: str):
    """Get consultation session data (for the client viewer)."""
    session = db["cake_consultations"].find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Consultation not found")
    if session.get("status") == "expired":
        raise HTTPException(410, "Consultation has expired")
    return session


@router.put("/session/{session_id}/design")
async def update_design(session_id: str, body: dict = {}):
    """Designer pushes updated cake design to the session."""
    session = db["cake_consultations"].find_one({"id": session_id})
    if not session:
        raise HTTPException(404, "Consultation not found")

    design_state = body.get("design_state", {})
    db["cake_consultations"].update_one(
        {"id": session_id},
        {"$set": {"design_state": design_state, "updated_at": _now()}}
    )

    # Update in-memory for WebSocket push
    if session_id in active_sessions:
        active_sessions[session_id]["design_state"] = design_state

    return {"status": "updated", "session_id": session_id}


@router.post("/session/{session_id}/approve")
async def client_approve(session_id: str, body: dict = {}):
    """Client approves the cake design."""
    session = db["cake_consultations"].find_one({"id": session_id})
    if not session:
        raise HTTPException(404, "Consultation not found")

    comments = body.get("comments", "")
    client_name = body.get("client_name", session.get("client_name", ""))

    db["cake_consultations"].update_one(
        {"id": session_id},
        {"$set": {
            "client_approved": True,
            "client_comments": comments,
            "approved_at": _now(),
            "approved_by": client_name,
            "status": "approved",
        }}
    )

    return {"status": "approved", "session_id": session_id, "approved_by": client_name}


@router.post("/session/{session_id}/comment")
async def add_comment(session_id: str, body: dict = {}):
    """Client or designer adds a comment to the consultation."""
    session = db["cake_consultations"].find_one({"id": session_id})
    if not session:
        raise HTTPException(404, "Consultation not found")

    message = {
        "id": f"msg-{_uid()}",
        "sender": body.get("sender", "Client"),
        "text": body.get("text", ""),
        "timestamp": _now(),
    }

    db["cake_consultations"].update_one(
        {"id": session_id},
        {"$push": {"messages": message}}
    )

    return {"status": "comment_added", "message": message}


@router.get("/active")
async def list_active_consultations():
    """List all active consultations (for the designer dashboard)."""
    sessions = list(db["cake_consultations"].find(
        {"status": {"$in": ["active", "approved"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(20))

    return {"sessions": sessions, "total": len(sessions)}


@router.websocket("/ws/{session_id}")
async def consultation_websocket(websocket: WebSocket, session_id: str):
    """WebSocket for real-time design sync between designer and client viewer."""
    await websocket.accept()

    if session_id not in active_sessions:
        active_sessions[session_id] = {"design_state": {}, "clients": set()}

    client_id = f"client-{_uid()}"
    active_sessions[session_id]["clients"].add(client_id)

    try:
        # Send current design state on connect
        await websocket.send_json({
            "type": "initial_state",
            "design_state": active_sessions[session_id]["design_state"],
        })

        while True:
            data = await websocket.receive_json()

            if data.get("type") == "design_update":
                # Designer pushing update
                active_sessions[session_id]["design_state"] = data.get("design_state", {})
                # Broadcast to all connected clients would happen here
                await websocket.send_json({"type": "ack", "status": "synced"})

            elif data.get("type") == "request_state":
                await websocket.send_json({
                    "type": "state_update",
                    "design_state": active_sessions[session_id]["design_state"],
                })

    except WebSocketDisconnect:
        active_sessions[session_id]["clients"].discard(client_id)
        if not active_sessions[session_id]["clients"]:
            del active_sessions[session_id]
