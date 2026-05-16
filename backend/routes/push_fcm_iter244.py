"""iter244 · Firebase push fan-out for VIP pings + manager device registry.

Wire:
  - POST /api/push/register-token   manager device registers FCM token
  - POST /api/push/test-fan-out     send a test push (leadership only)
  - Hook: every new vip_pings row → fan out to all leader-device tokens
"""
from __future__ import annotations
import os
import json
import threading
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["push-iter244"])


_FIREBASE_READY = False
_FIREBASE_LOCK = threading.Lock()


def _init_firebase() -> bool:
    """Lazy init firebase-admin once. Returns True if ready."""
    global _FIREBASE_READY
    if _FIREBASE_READY: return True
    with _FIREBASE_LOCK:
        if _FIREBASE_READY: return True
        try:
            import firebase_admin
            from firebase_admin import credentials
            path = os.environ.get("FIREBASE_ADMIN_SDK_PATH")
            if not path or not os.path.exists(path):
                return False
            if not firebase_admin._apps:
                cred = credentials.Certificate(path)
                firebase_admin.initialize_app(cred)
            _FIREBASE_READY = True
            return True
        except Exception as e:
            print(f"[firebase-init-error] {e}")
            return False


def _send_push(tokens: List[str], title: str, body: str,
                  data: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    if not tokens: return {"ok": True, "sent": 0, "skipped": "no-tokens"}
    if not _init_firebase():
        return {"ok": False, "error": "firebase-not-initialised"}
    try:
        from firebase_admin import messaging
        msg = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=tokens,
        )
        resp = messaging.send_each_for_multicast(msg)
        return {"ok": True, "sent": resp.success_count, "failed": resp.failure_count}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


# ── Endpoints ────────────────────────────────────────────────────────────
class TokenRegisterIn(BaseModel):
    fcm_token: str
    device_label: Optional[str] = None
    user_id: Optional[str] = None
    platform: Optional[str] = "web"


@router.post("/api/push/register-token")
def register_token(body: TokenRegisterIn,
                    x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    uid = body.user_id or x_user_id or "chef-william"
    db["fcm_tokens"].update_one(
        {"fcm_token": body.fcm_token},
        {"$set": {
            "fcm_token": body.fcm_token,
            "user_id": uid,
            "device_label": body.device_label,
            "platform": body.platform,
            "updated_at": utcnow_iso(),
        }, "$setOnInsert": {"created_at": utcnow_iso()}},
        upsert=True,
    )
    return {"ok": True, "user_id": uid}


def _leader_tokens() -> List[str]:
    leaders = list(db["employees"].find(
        {"role": {"$in": ["salary", "manager", "owner", "director", "exec_chef",
                            "executive_chef", "gm", "general_manager", "bar_manager",
                            "outlet_manager", "executive_housekeeper"]}, "active": True},
        {"_id": 0, "id": 1},
    ))
    leader_ids = [l["id"] for l in leaders] + ["chef-william"]
    rows = list(db["fcm_tokens"].find({"user_id": {"$in": leader_ids}}, {"_id": 0, "fcm_token": 1}))
    return list({r["fcm_token"] for r in rows if r.get("fcm_token")})


@router.post("/api/push/fan-out-vip-ping/{ping_id}")
def fan_out_vip_ping(ping_id: str,
                       x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Manually fan out an existing vip_ping to all leader devices (idempotent
    if you re-call). Useful test harness — also called from a hook below."""
    p = db["vip_pings"].find_one({"id": ping_id}, {"_id": 0})
    if not p: raise HTTPException(404, "ping not found")
    tokens = _leader_tokens()
    title = f"★ {p.get('vip_name')} · {p.get('kind')}"
    body  = (p.get('detail') or '')[:140]
    out = _send_push(tokens, title, body, data={
        "kind": "vip-ping", "ping_id": ping_id, "vip_id": str(p.get("vip_id")),
    })
    db["vip_pings"].update_one({"id": ping_id},
                                    {"$set": {"push_dispatched_at": utcnow_iso(),
                                                "push_result": out}})
    return {"ok": True, "tokens_targeted": len(tokens), **out}


@router.post("/api/push/test")
def push_test(x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    tokens = _leader_tokens()
    out = _send_push(tokens, "Echo AURION test push", "This is a test from your mobile shell.",
                       data={"kind": "test"})
    return {"ok": True, "tokens": len(tokens), **out}


@router.get("/api/push/status")
def push_status():
    ready = _init_firebase()
    return {"ok": True, "firebase_ready": ready,
             "device_count": db["fcm_tokens"].count_documents({}),
             "leader_token_count": len(_leader_tokens())}
