"""iter249 · Manager Workflow — desktop-side approvals + shift-swap broker
+ call-out review queue + chat-with-manager-on-duty bridge.

Endpoints:
  PTO
    GET    /api/manager-workflow/pto/pending          → list of pending PTO
    POST   /api/manager-workflow/pto/{id}/approve     → approve + push back
    POST   /api/manager-workflow/pto/{id}/deny        → deny + push + reason

  Shift Swap (Job Share)
    POST   /api/myecho/shift-swap/request             (mounted here, exposed to MyEcho too)
    GET    /api/manager-workflow/swap/pending
    POST   /api/manager-workflow/swap/{id}/approve
    POST   /api/manager-workflow/swap/{id}/deny

  Call-Outs
    GET    /api/manager-workflow/callouts/pending
    POST   /api/manager-workflow/callouts/{id}/acknowledge

  HR Config (callout policy)
    GET    /api/manager-workflow/hr-config
    POST   /api/manager-workflow/hr-config

  Manager-on-Duty Chat (WhatsApp-style)
    GET    /api/manager-workflow/mod/active-room?outlet_id=X    (auto-creates if needed)
    POST   /api/manager-workflow/mod/active-room/post
    GET    /api/manager-workflow/mod/active-room/messages
"""
from __future__ import annotations
import os
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/manager-workflow", tags=["manager-workflow"])


def _push(employee_id: Optional[str], title: str, body: str, kind: str):
    """Best-effort FCM/in-app push back to MyEcho. Stores a notification row
    so the mobile feed shows it even if FCM isn't configured."""
    if not employee_id: return
    db["myecho_notifications"].insert_one({
        "id": f"notif-{int(datetime.now().timestamp() * 1000)}",
        "employee_id": employee_id,
        "title": title, "body": body, "kind": kind,
        "read": False, "created_at": utcnow_iso(),
    })


# ── PTO ─────────────────────────────────────────────────────────────────
class DecisionBody(BaseModel):
    note: Optional[str] = None
    reason: Optional[str] = None


@router.get("/pto/pending")
def pto_pending(department: Optional[str] = None):
    q: Dict[str, Any] = {"status": "pending"}
    rows = list(db["pto_requests"].find(q, {"_id": 0}).sort("submitted_at", 1).limit(200))
    if department:
        # hydrate dept from employees.department for filtering
        eids = {r["employee_id"] for r in rows if r.get("employee_id")}
        emp_dept = {e["id"]: e.get("department") for e in
                          db["employees"].find({"id": {"$in": list(eids)}},
                                                          {"_id": 0, "id": 1, "department": 1})}
        rows = [r for r in rows if emp_dept.get(r.get("employee_id")) == department]
    return {"ok": True, "rows": rows}


@router.get("/pto/decided")
def pto_decided(limit: int = 40):
    rows = list(db["pto_requests"].find(
        {"status": {"$in": ["approved", "denied"]}}, {"_id": 0}
    ).sort("decided_at", -1).limit(limit))
    return {"ok": True, "rows": rows}


@router.post("/pto/{req_id}/approve")
def pto_approve(req_id: str, body: DecisionBody = DecisionBody(),
                  x_user_id: Optional[str] = Header(None)):
    rec = db["pto_requests"].find_one({"id": req_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "request not found")
    db["pto_requests"].update_one({"id": req_id}, {"$set": {
        "status": "approved", "decided_by": x_user_id or "manager",
        "decided_at": utcnow_iso(), "manager_note": body.note,
    }})
    _push(rec.get("employee_id"), "✓ PTO approved",
            f"{rec.get('start_date')} → {rec.get('end_date')} approved" +
            (f" — {body.note}" if body.note else ""), "pto-approved")
    return {"ok": True, "id": req_id, "status": "approved"}


@router.post("/pto/{req_id}/deny")
def pto_deny(req_id: str, body: DecisionBody = DecisionBody(),
                x_user_id: Optional[str] = Header(None)):
    rec = db["pto_requests"].find_one({"id": req_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "request not found")
    db["pto_requests"].update_one({"id": req_id}, {"$set": {
        "status": "denied", "decided_by": x_user_id or "manager",
        "decided_at": utcnow_iso(), "manager_note": body.reason,
    }})
    _push(rec.get("employee_id"), "✕ PTO denied",
            (body.reason or "No reason provided"), "pto-denied")
    return {"ok": True, "id": req_id, "status": "denied"}


# ── Shift Swap (Job Share) ──────────────────────────────────────────────
@router.get("/swap/pending")
def swap_pending():
    rows = list(db["shift_swaps"].find(
        {"status": "manager-pending"}, {"_id": 0}
    ).sort("submitted_at", 1).limit(200))
    return {"ok": True, "rows": rows}


@router.post("/swap/{swap_id}/approve")
def swap_approve(swap_id: str, body: DecisionBody = DecisionBody(),
                    x_user_id: Optional[str] = Header(None)):
    rec = db["shift_swaps"].find_one({"id": swap_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "swap not found")
    db["shift_swaps"].update_one({"id": swap_id}, {"$set": {
        "status": "approved", "decided_by": x_user_id or "manager",
        "decided_at": utcnow_iso(), "manager_note": body.note,
    }})
    # Push to BOTH parties
    _push(rec.get("requester_id"), "✓ Shift swap approved",
            f"You swapped {rec.get('shift_date')} with {rec.get('cover_name')}",
            "swap-approved")
    _push(rec.get("cover_id"), "✓ Shift swap approved",
            f"You're covering {rec.get('shift_date')} for {rec.get('requester_name')}",
            "swap-approved")
    return {"ok": True, "id": swap_id, "status": "approved"}


@router.post("/swap/{swap_id}/deny")
def swap_deny(swap_id: str, body: DecisionBody = DecisionBody(),
                 x_user_id: Optional[str] = Header(None)):
    rec = db["shift_swaps"].find_one({"id": swap_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "swap not found")
    db["shift_swaps"].update_one({"id": swap_id}, {"$set": {
        "status": "denied", "decided_by": x_user_id or "manager",
        "decided_at": utcnow_iso(), "manager_note": body.reason,
    }})
    _push(rec.get("requester_id"), "✕ Shift swap denied",
            body.reason or "Manager denied — please cover your scheduled shift",
            "swap-denied")
    _push(rec.get("cover_id"), "Swap denied",
            f"Swap with {rec.get('requester_name')} was denied", "swap-denied")
    return {"ok": True, "id": swap_id, "status": "denied"}


# ── Call-outs ───────────────────────────────────────────────────────────
@router.get("/callouts/pending")
def callouts_pending():
    rows = list(db["callout_requests"].find(
        {"status": "pending"}, {"_id": 0}
    ).sort("submitted_at", -1).limit(200))
    return {"ok": True, "rows": rows}


@router.post("/callouts/{co_id}/acknowledge")
def callouts_ack(co_id: str, body: DecisionBody = DecisionBody(),
                    x_user_id: Optional[str] = Header(None)):
    rec = db["callout_requests"].find_one({"id": co_id}, {"_id": 0})
    if not rec: raise HTTPException(404, "callout not found")
    db["callout_requests"].update_one({"id": co_id}, {"$set": {
        "status": "acknowledged",
        "acknowledged_by": x_user_id or "manager",
        "acknowledged_at": utcnow_iso(),
        "manager_note": body.note,
    }})
    _push(rec.get("employee_id"), "✓ Call-out acknowledged",
            "Your manager confirmed receipt — feel better.", "callout-ack")
    return {"ok": True, "id": co_id, "status": "acknowledged"}


# ── HR Config (callout policy) ──────────────────────────────────────────
class HrConfig(BaseModel):
    allow_mobile_callout: bool = False
    callout_min_hours_before_shift: int = 2
    manager_on_duty_chat_enabled: bool = True
    require_phone_call_after_callout: bool = True


@router.get("/hr-config")
def hr_config_get():
    rec = db["hr_config"].find_one({"_id": "global"}) or {}
    rec.pop("_id", None)
    cfg = HrConfig(**{k: rec.get(k) for k in HrConfig.model_fields if k in rec})
    return {"ok": True, "config": cfg.model_dump()}


@router.post("/hr-config")
def hr_config_set(cfg: HrConfig, x_user_id: Optional[str] = Header(None)):
    db["hr_config"].update_one({"_id": "global"}, {"$set": {
        **cfg.model_dump(),
        "updated_by": x_user_id or "manager",
        "updated_at": utcnow_iso(),
    }}, upsert=True)
    return {"ok": True, "config": cfg.model_dump()}


# ── Manager-on-Duty chat (WhatsApp-like, per outlet) ────────────────────
def _mod_room_id(outlet_id: str) -> str:
    return f"mod-{outlet_id}"


@router.get("/mod/active-room")
def mod_room(outlet_id: str = "out-coastal-kitchen"):
    rid = _mod_room_id(outlet_id)
    room = db["chat_rooms"].find_one({"id": rid}, {"_id": 0})
    if not room:
        outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0}) or {}
        room = {
            "id": rid, "name": f"Manager-on-Duty · {outlet.get('name', outlet_id)}",
            "kind": "manager-on-duty",
            "outlet_id": outlet_id,
            "members": ["all-staff"],
            "created_at": utcnow_iso(),
            "last_message_at": None,
        }
        db["chat_rooms"].insert_one(dict(room)); room.pop("_id", None)
    return {"ok": True, "room": room}


class ChatPost(BaseModel):
    text: str
    outlet_id: str = "out-coastal-kitchen"


@router.post("/mod/active-room/post")
def mod_post(body: ChatPost, x_user_id: Optional[str] = Header(None)):
    rid = _mod_room_id(body.outlet_id)
    # Lazy-create room
    if not db["chat_rooms"].find_one({"id": rid}, {"_id": 0}):
        mod_room(body.outlet_id)
    msg = {
        "id": f"msg-{int(datetime.now().timestamp() * 1000)}",
        "room_id": rid, "outlet_id": body.outlet_id,
        "author_id": x_user_id or "anonymous",
        "text": body.text,
        "created_at": utcnow_iso(),
    }
    db["chat_messages"].insert_one(dict(msg)); msg.pop("_id", None)
    db["chat_rooms"].update_one({"id": rid},
        {"$set": {"last_message_at": msg["created_at"]}})
    return {"ok": True, "message": msg}


@router.get("/mod/active-room/messages")
def mod_messages(outlet_id: str = "out-coastal-kitchen", limit: int = 60):
    rid = _mod_room_id(outlet_id)
    msgs = list(db["chat_messages"].find(
        {"room_id": rid}, {"_id": 0}
    ).sort("created_at", -1).limit(limit))
    msgs.reverse()
    # Hydrate author name
    aids = {m["author_id"] for m in msgs}
    name_map = {e["id"]: e.get("display_name") or
                       f"{e.get('first_name','')} {e.get('last_name','')}".strip()
                  for e in db["employees"].find({"id": {"$in": list(aids)}},
                      {"_id": 0, "id": 1, "display_name": 1, "first_name": 1, "last_name": 1})}
    for m in msgs:
        m["author_name"] = name_map.get(m["author_id"], m["author_id"] or "—")
    return {"ok": True, "rows": msgs, "outlet_id": outlet_id}
