"""
Echo Connect — Internal Messaging Platform
=============================================
WhatsApp-level messaging without personal data exposure.
- Department-based directory (first name + department only)
- Group chats by department/property/shift
- Line-level employee access via email invite
- File/image sharing, read receipts
- No phone numbers or last names exposed to other users
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/connect", tags=["echo-connect"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

class MessageInput(BaseModel):
    channel_id: str
    sender_id: str
    sender_name: str
    content: str
    message_type: str = "text"  # text, image, file, system
    file_url: str = ""

class ChannelInput(BaseModel):
    name: str
    channel_type: str = "department"  # department, group, direct, shift, property
    department: str = ""
    members: List[str] = []
    description: str = ""

class InviteInput(BaseModel):
    email: str = ""
    phone: str = ""
    name: str
    department: str
    role: str = "line-staff"  # line-staff, supervisor, manager


def seed_connect():
    if db["connect_channels"].count_documents({}) > 0:
        return
    channels = [
        {"name": "Culinary Team", "channel_type": "department", "department": "culinary", "description": "Kitchen operations and coordination"},
        {"name": "Front of House", "channel_type": "department", "department": "foh", "description": "FOH staff coordination and service updates"},
        {"name": "Engineering", "channel_type": "department", "department": "engineering", "description": "Maintenance requests and updates"},
        {"name": "Spa & Wellness", "channel_type": "department", "department": "spa", "description": "Spa team coordination"},
        {"name": "Housekeeping", "channel_type": "department", "department": "housekeeping", "description": "Room status and cleaning coordination"},
        {"name": "Management", "channel_type": "group", "department": "", "description": "Department heads and executive team"},
        {"name": "All Staff Announcements", "channel_type": "property", "department": "", "description": "Property-wide announcements"},
        {"name": "AM Shift", "channel_type": "shift", "department": "", "description": "Morning shift coordination (6am-2pm)"},
        {"name": "PM Shift", "channel_type": "shift", "department": "", "description": "Evening shift coordination (2pm-10pm)"},
        {"name": "Security & Safety", "channel_type": "department", "department": "security", "description": "Security team coordination"},
    ]
    for ch in channels:
        db["connect_channels"].insert_one({"id": f"ch-{_uid()}", **ch, "members": [], "created_at": _now(), "pinned": False, "last_message_at": _now()})

    # Seed sample messages
    channels_list = list(db["connect_channels"].find({}, {"_id": 0}))
    messages = [
        {"channel": "Culinary Team", "sender": "Chef James", "content": "Mise en place for tonight's wedding reception needs to start by 2pm. 250 covers."},
        {"channel": "Culinary Team", "sender": "Sous Chef Maria", "content": "Got it. Pulling extra prep cooks from the pool."},
        {"channel": "Front of House", "sender": "FOH Manager Sarah", "content": "VIP guest in section 3 tonight — Mr. Wellington. Allergic to shellfish. Please flag all servers."},
        {"channel": "Engineering", "sender": "Carlos (HVAC)", "content": "Room 412 AC fixed. Parts ordered for Room 220 showerhead."},
        {"channel": "All Staff Announcements", "sender": "GM Sarah Mitchell", "content": "Great news team — we achieved 98% guest satisfaction this week! Keep up the amazing work."},
        {"channel": "Housekeeping", "sender": "HK Supervisor", "content": "VIP arrival in Room 612 at 3pm. Full refresh + welcome amenity please."},
    ]
    for m in messages:
        ch = next((c for c in channels_list if c["name"] == m["channel"]), None)
        if ch:
            db["connect_messages"].insert_one({
                "id": f"msg-{_uid()}", "channel_id": ch["id"],
                "sender_id": f"usr-{_uid()}", "sender_name": m["sender"],
                "content": m["content"], "message_type": "text", "file_url": "",
                "read_by": [], "created_at": _now(),
            })


# ── Directory ──
@router.get("/directory")
async def staff_directory(department: Optional[str] = None, search: Optional[str] = None):
    """Staff directory — shows first name + department only (no phone/last name)."""
    seed_connect()
    users = list(db["users"].find({}, {"_id": 0}))
    if not users:
        # Fallback to RBAC users
        users = list(db["rbac_users"].find({}, {"_id": 0}))
    directory = []
    for u in users:
        name = u.get("name", u.get("display_name", "Unknown"))
        first_name = name.split()[0] if name else "Unknown"
        dept = u.get("department", u.get("role", "staff"))
        uid = u.get("id", u.get("user_id", ""))
        entry = {"id": uid, "display_name": first_name, "department": dept, "role": u.get("role", "staff"), "status": "online"}
        if department and dept.lower() != department.lower():
            continue
        if search and search.lower() not in first_name.lower() and search.lower() not in dept.lower():
            continue
        directory.append(entry)
    return {"directory": directory, "total": len(directory)}


# ── Channels ──
@router.get("/channels")
async def list_channels(channel_type: Optional[str] = None):
    seed_connect()
    q = {"channel_type": channel_type} if channel_type else {}
    channels = list(db["connect_channels"].find(q, {"_id": 0}).sort("last_message_at", -1))
    # Add unread count and last message preview
    for ch in channels:
        last_msg = db["connect_messages"].find_one({"channel_id": ch["id"]}, {"_id": 0}, sort=[("created_at", -1)])
        ch["last_message"] = last_msg.get("content", "")[:80] if last_msg else ""
        ch["last_sender"] = last_msg.get("sender_name", "") if last_msg else ""
        ch["message_count"] = db["connect_messages"].count_documents({"channel_id": ch["id"]})
    return {"channels": channels}

@router.post("/channels")
async def create_channel(data: ChannelInput):
    doc = {"id": f"ch-{_uid()}", **data.model_dump(), "created_at": _now(), "pinned": False, "last_message_at": _now()}
    db["connect_channels"].insert_one(doc)
    doc.pop("_id", None)
    return doc


# ── Messages ──
@router.get("/channels/{channel_id}/messages")
async def get_messages(channel_id: str, limit: int = 50):
    msgs = list(db["connect_messages"].find({"channel_id": channel_id}, {"_id": 0}).sort("created_at", -1).limit(limit))
    msgs.reverse()
    return {"messages": msgs, "channel_id": channel_id}

@router.post("/messages")
async def send_message(data: MessageInput):
    doc = {"id": f"msg-{_uid()}", **data.model_dump(), "read_by": [data.sender_id], "created_at": _now()}
    db["connect_messages"].insert_one(doc)
    db["connect_channels"].update_one({"id": data.channel_id}, {"$set": {"last_message_at": _now()}})
    doc.pop("_id", None)
    return doc

@router.put("/messages/{message_id}/read")
async def mark_read(message_id: str, user_id: str = Query(...)):
    db["connect_messages"].update_one({"id": message_id}, {"$addToSet": {"read_by": user_id}})
    return {"read": message_id}


# ── Invites (line-level employees) ──
@router.post("/invite")
async def invite_employee(data: InviteInput):
    """Invite line-level employee via email or phone — they get chat-only access."""
    invite = {
        "id": f"inv-{_uid()}", **data.model_dump(),
        "status": "pending", "access_level": "chat_only",
        "created_at": _now(),
    }
    db["connect_invites"].insert_one(invite)
    invite.pop("_id", None)
    return {**invite, "note": "Invite sent. Employee will receive access link via email/SMS when delivery is configured."}

@router.get("/invites")
async def list_invites():
    return {"invites": list(db["connect_invites"].find({}, {"_id": 0}).sort("created_at", -1).limit(50))}
