"""
iter253 · Notification Preferences (per-user)
============================================
William's spec: every salaried profile sets their own notification preferences
(Email · Text · Push · In-app). Some events (e.g. "PO received") cascade to
downstream staff — CDC asked: when his order is received, text him AND his
sous chef. Stored per-user in `notification_prefs` keyed by user_id.

Endpoints under /api/notif-prefs/*
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/notif-prefs", tags=["notif-prefs"])
_now = lambda: datetime.now(timezone.utc).isoformat()

EVENT_KEYS = [
    "approval_pending",       # I'm the approver — needs my sign-off
    "approval_decision",      # my submitted PR was approved/rejected
    "po_received",            # PO physically received at dock
    "shift_swap_requested",
    "shift_swap_decision",
    "callout_filed",
    "huddle_posted",
    "vip_arrival",
    "save_the_ticket",        # severe issue triggered AI remediation draft
    "tonights_playbook",      # 4pm daily push to salaried managers
]

CHANNEL_KEYS = ["in_app", "email", "text", "push"]

# Default prefs by role — sensible defaults so William doesn't onboard each user
DEFAULTS_BY_ROLE: Dict[str, Dict[str, List[str]]] = {
    "admin":           {k: ["in_app", "email"] for k in EVENT_KEYS},
    "director":        {k: ["in_app", "email", "push"] for k in EVENT_KEYS},
    "general-manager": {k: ["in_app", "push", "text"] for k in EVENT_KEYS},
    "executive-chef":  {**{k: ["in_app", "push"] for k in EVENT_KEYS},
                        "po_received": ["in_app", "text"]},   # CDC's specific request
    "sous-chef":       {**{k: ["in_app", "push"] for k in EVENT_KEYS},
                        "po_received": ["in_app", "text"]},   # CDC asked for cascade
    "fb-director":     {k: ["in_app", "email", "push"] for k in EVENT_KEYS},
    "controller":      {k: ["in_app", "email"] for k in EVENT_KEYS},
    "purchasing-manager": {k: ["in_app", "email", "text"] for k in EVENT_KEYS},
}

# Cascade rules — when this event fires for {role}, also notify these roles
CASCADE_RULES: Dict[str, Dict[str, List[str]]] = {
    "po_received": {
        "executive-chef": ["sous-chef"],     # CDC's order received → sous chef too
    },
}


class PrefsUpdate(BaseModel):
    user_id: str
    prefs: Dict[str, List[str]]


def _seed_for(user_id: str, role: str) -> dict:
    """Idempotent — return existing or insert defaults."""
    existing = db["notification_prefs"].find_one({"user_id": user_id}, {"_id": 0})
    if existing:
        return existing
    defaults = DEFAULTS_BY_ROLE.get(role) or {k: ["in_app"] for k in EVENT_KEYS}
    doc = {"user_id": user_id, "role": role, "prefs": defaults,
           "created_at": _now(), "updated_at": _now()}
    db["notification_prefs"].insert_one({**doc, "_id": user_id})
    return doc


@router.get("/{user_id}")
def get_prefs(user_id: str):
    user = db["auth_users"].find_one({"id": user_id}, {"_id": 0})
    role = user.get("role", "staff") if user else "staff"
    return _seed_for(user_id, role) | {"event_keys": EVENT_KEYS,
                                         "channel_keys": CHANNEL_KEYS}


@router.put("/{user_id}")
def update_prefs(user_id: str, body: PrefsUpdate):
    user = db["auth_users"].find_one({"id": user_id}, {"_id": 0})
    role = user.get("role", "staff") if user else "staff"
    db["notification_prefs"].update_one(
        {"user_id": user_id},
        {"$set": {"prefs": body.prefs, "updated_at": _now(), "role": role}},
        upsert=True)
    return {"ok": True, "user_id": user_id}


@router.post("/fire")
def fire_event(body: dict):
    """Internal helper — given {event_key, target_user_id|target_role, payload}
    determines which channels to fan-out to (respecting per-user prefs +
    cascade rules) and writes a delivery record to `notification_outbox`. Real
    SMS/Email senders pick this up async (currently MOCKED — print to log)."""
    event = body.get("event_key", "")
    target_uid = body.get("target_user_id")
    target_role = body.get("target_role")
    payload = body.get("payload", {})

    targets: List[dict] = []
    if target_uid:
        u = db["auth_users"].find_one({"id": target_uid}, {"_id": 0})
        if u: targets.append(u)
    elif target_role:
        targets = list(db["auth_users"].find({"role": target_role}, {"_id": 0}))

    deliveries = []
    for u in targets:
        # Direct delivery
        prefs = (db["notification_prefs"].find_one({"user_id": u["id"]}, {"_id": 0})
                 or {"prefs": DEFAULTS_BY_ROLE.get(u.get("role", ""), {})})
        chans = prefs.get("prefs", {}).get(event, ["in_app"])
        for ch in chans:
            deliv = {
                "id": f"{u['id']}::{event}::{ch}::{_now()}",
                "user_id": u["id"], "name": u.get("name"),
                "role": u.get("role"), "event": event, "channel": ch,
                "payload": payload, "delivered": False, "queued_at": _now(),
            }
            db["notification_outbox"].insert_one(deliv)
            deliveries.append(deliv)
        # Cascade — does this event_key cascade for this role?
        cascade_to = CASCADE_RULES.get(event, {}).get(u.get("role", ""), [])
        for cr in cascade_to:
            for cu in db["auth_users"].find({"role": cr}, {"_id": 0}):
                cprefs = (db["notification_prefs"].find_one({"user_id": cu["id"]}, {"_id": 0})
                          or {"prefs": DEFAULTS_BY_ROLE.get(cr, {})})
                cchans = cprefs.get("prefs", {}).get(event, ["in_app"])
                for ch in cchans:
                    cdeliv = {
                        "id": f"{cu['id']}::{event}::{ch}::{_now()}",
                        "user_id": cu["id"], "name": cu.get("name"),
                        "role": cu.get("role"), "event": event, "channel": ch,
                        "payload": {**payload, "cascaded_from": u.get("name")},
                        "delivered": False, "queued_at": _now(),
                    }
                    db["notification_outbox"].insert_one(cdeliv)
                    deliveries.append(cdeliv)
    return {"ok": True, "fanout_count": len(deliveries),
            "deliveries": [{"user_id": d["user_id"], "channel": d["channel"]}
                            for d in deliveries]}


@router.get("/outbox/{user_id}")
def outbox_for(user_id: str, limit: int = 50):
    rows = list(db["notification_outbox"].find({"user_id": user_id}, {"_id": 0})
                 .sort("queued_at", -1).limit(limit))
    return {"rows": rows, "count": len(rows)}
