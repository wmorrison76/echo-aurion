"""iter192 → iter199 · Push notifications (Web Push via VAPID · FCM HTTP v1 via Firebase Admin).

Pattern mirrors the existing email/SMS fan-out:
  - Staff app (Capacitor/PWA) registers its subscription via POST /api/push/register (native token)
    or POST /api/push/register-web (PushSubscription with endpoint + keys)
  - When standup / whats-new is sent, fan-out pushes to every active device
  - Without FIREBASE_SERVICE_ACCOUNT_JSON or VAPID_PRIVATE_KEY set, push is gracefully queued

Env vars for live delivery:
  - FIREBASE_SENDER_ID, VAPID_PUBLIC_KEY  — frontend subscribe (safe to expose)
  - VAPID_PRIVATE_KEY, VAPID_SUBJECT       — pywebpush Web Push (browsers/PWAs)
  - FIREBASE_SERVICE_ACCOUNT_JSON          — firebase_admin.messaging (native iOS/Android/Web via FCM HTTP v1)
"""
from __future__ import annotations
import os, json, logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

log = logging.getLogger("push_native")
router = APIRouter(prefix="/api/push", tags=["push-native"])

# Lazy-initialized Firebase Admin app singleton (None until service account JSON is configured)
_firebase_app = None


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()


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


def _get_firebase_app():
    """Lazy-load firebase_admin app from env-configured service account JSON. Returns None if unconfigured."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    sa = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if not sa:
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials
        if firebase_admin._apps:
            _firebase_app = list(firebase_admin._apps.values())[0]
            return _firebase_app
        # Accept either a JSON string OR a filesystem path
        if sa.startswith("{"):
            cred = credentials.Certificate(json.loads(sa))
        else:
            cred = credentials.Certificate(sa)
        _firebase_app = firebase_admin.initialize_app(cred)
        log.info("Firebase Admin SDK initialised for FCM HTTP v1")
        return _firebase_app
    except Exception as e:
        log.warning("Firebase Admin init failed: %s", e)
        return None


class RegisterBody(BaseModel):
    device_token: str
    platform: str
    app_variant: str = "staff"
    model: Optional[str] = None
    os_version: Optional[str] = None


class RegisterWebBody(BaseModel):
    endpoint: str
    keys: Dict[str, str]  # {p256dh, auth}
    app_variant: str = "staff"
    user_agent: Optional[str] = None


@router.post("/register")
async def register_device(body: RegisterBody, x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    if body.platform not in ("ios", "android", "web"):
        raise HTTPException(400, "platform must be ios|android|web")
    from database import db as _db
    key = {"staff_token": sess.get("token"), "device_token": body.device_token}
    doc = {
        **key, "staff_name": sess.get("staff_name"), "staff_email": sess.get("staff_email"),
        "platform": body.platform, "app_variant": body.app_variant,
        "model": body.model, "os_version": body.os_version,
        "active": True, "registered_at": _iso(),
    }
    _db.push_devices.update_one(key, {"$set": doc}, upsert=True)
    return {"ok": True, "device_id": body.device_token[:16] + "..."}


@router.post("/unregister")
async def unregister_device(body: RegisterBody, x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    from database import db as _db
    _db.push_devices.update_one(
        {"staff_token": sess.get("token"), "device_token": body.device_token},
        {"$set": {"active": False, "unregistered_at": _iso()}},
    )
    return {"ok": True}


@router.get("/config")
async def push_config():
    """Public frontend bootstrap config (safe values only — no private keys)."""
    pub = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
    sender = os.environ.get("FIREBASE_SENDER_ID", "").strip()
    vapid_priv_set = bool(os.environ.get("VAPID_PRIVATE_KEY", "").strip())
    fb_sa_set = bool(os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip())
    return {
        "ok": True,
        "vapid_public_key": pub,
        "firebase_sender_id": sender,
        "web_push_ready": bool(pub and vapid_priv_set),
        "native_push_ready": fb_sa_set,
        "configured": bool(pub),
    }


@router.post("/register-web")
async def register_web(body: RegisterWebBody, x_briefing_token: Optional[str] = Header(None)):
    """Register a browser/PWA PushSubscription. device_token = subscription.endpoint."""
    sess = _auth_staff(x_briefing_token)
    if not body.endpoint.startswith("https://"):
        raise HTTPException(400, "endpoint must be an HTTPS URL")
    if not body.keys.get("p256dh") or not body.keys.get("auth"):
        raise HTTPException(400, "keys.p256dh and keys.auth required")
    from database import db as _db
    key = {"staff_token": sess.get("token"), "device_token": body.endpoint}
    doc = {
        **key, "staff_name": sess.get("staff_name"), "staff_email": sess.get("staff_email"),
        "platform": "web", "app_variant": body.app_variant,
        "web_keys": body.keys, "user_agent": body.user_agent,
        "active": True, "registered_at": _iso(),
    }
    _db.push_devices.update_one(key, {"$set": doc}, upsert=True)
    return {"ok": True, "device_id": body.endpoint[-24:]}


@router.get("/devices/mine")
async def my_devices(x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    from database import db as _db
    items = list(_db.push_devices.find(
        {"staff_token": sess.get("token"), "active": True}, {"_id": 0}
    ).sort("registered_at", -1).limit(10))
    return {"ok": True, "total": len(items), "devices": items}


@router.get("/devices/all")
async def all_devices(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    items = list(_db.push_devices.find({"active": True}, {"_id": 0}).sort("registered_at", -1).limit(500))
    return {"ok": True, "total": len(items), "devices": items}


def _dispatch(device: Dict[str, Any], title: str, body: str, link: Optional[str]) -> Dict[str, Any]:
    """Dispatch via modern path based on device type.

    Strategy:
      - Web subscriptions (device_token starts with 'https://' — PushSubscription endpoint)
        → pywebpush with VAPID keypair (no Firebase account needed)
      - Native ios/android FCM tokens → firebase_admin.messaging (HTTP v1)
      - Falls back to queued_* statuses when keys not configured
    """
    platform = (device.get("platform") or "").lower()
    token = device.get("device_token") or ""

    # WEB PUSH via pywebpush + VAPID keypair
    if platform == "web" or token.startswith("https://"):
        priv = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
        pub = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
        subj = os.environ.get("VAPID_SUBJECT", "mailto:admin@luccca.com").strip()
        if not priv or not pub:
            return {"status": "queued_no_vapid_private", "channel": "webpush", "bucket": "queued"}
        keys = device.get("web_keys") or {}
        if not keys.get("p256dh") or not keys.get("auth"):
            return {"status": "queued_missing_web_keys", "channel": "webpush", "bucket": "queued"}
        try:
            from pywebpush import webpush, WebPushException  # type: ignore
            sub = {"endpoint": token, "keys": keys}
            payload = json.dumps({"title": title, "body": body, "link": link or "/"})
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=priv,
                vapid_claims={"sub": subj},
                ttl=3600,
            )
            return {"status": "delivered", "channel": "webpush", "bucket": "web"}
        except Exception as e:  # includes WebPushException (410 → cleanup)
            msg = str(e)[:120]
            if "410" in msg or "404" in msg:
                # stale — mark inactive
                from database import db as _db
                _db.push_devices.update_one(
                    {"device_token": token},
                    {"$set": {"active": False, "unregistered_at": _iso(), "reason": "push_gone"}}
                )
                return {"status": "stale_subscription_removed", "channel": "webpush", "bucket": "failed"}
            return {"status": f"webpush_failed: {msg}", "channel": "webpush", "bucket": "failed"}

    # NATIVE FCM (android) / APNs via FCM (ios) via Firebase Admin HTTP v1
    if platform in ("android", "ios"):
        app = _get_firebase_app()
        if app is None:
            return {"status": "queued_no_firebase_sa", "channel": "fcm", "bucket": "queued"}
        try:
            from firebase_admin import messaging  # type: ignore
            msg = messaging.Message(
                token=token,
                notification=messaging.Notification(title=title, body=body),
                data={"link": link or "/"},
            )
            message_id = messaging.send(msg, app=app)
            return {"status": f"delivered:{message_id[:32]}", "channel": "fcm", "bucket": platform}
        except Exception as e:
            msg_s = str(e)[:120]
            if "UNREGISTERED" in msg_s or "INVALID_ARGUMENT" in msg_s or "NotFound" in msg_s:
                from database import db as _db
                _db.push_devices.update_one(
                    {"device_token": token},
                    {"$set": {"active": False, "unregistered_at": _iso(), "reason": "fcm_unregistered"}}
                )
                return {"status": "stale_token_removed", "channel": "fcm", "bucket": "failed"}
            return {"status": f"fcm_failed: {msg_s}", "channel": "fcm", "bucket": "failed"}

    return {"status": "queued_unknown_platform", "channel": "unknown", "bucket": "queued"}


def send_push_to_staff(staff_token: str, title: str, body: str, link: Optional[str] = None) -> Dict[str, Any]:
    from database import db as _db
    devices = list(_db.push_devices.find({"staff_token": staff_token, "active": True}, {"_id": 0}).limit(10))
    out = {"total": len(devices), "ios": 0, "android": 0, "web": 0, "queued": 0, "failed": 0}
    for d in devices:
        rec = _dispatch(d, title, body, link)
        b = rec["bucket"]
        out[b] = out.get(b, 0) + 1
        _db.push_log.insert_one({
            "device_token": (d.get("device_token") or "")[:32],
            "platform": d.get("platform"),
            "staff_token": d.get("staff_token"),
            "title": title, "body": body, "link": link,
            "status": rec["status"], "channel": rec["channel"],
            "created_at": _iso(),
        })
    return out


@router.post("/broadcast")
async def broadcast(body_json: Dict[str, Any], x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    title = (body_json.get("title") or "").strip()
    body = (body_json.get("body") or "").strip()
    link = body_json.get("link")
    if not title or not body: raise HTTPException(400, "title and body required")
    from database import db as _db
    devices = list(_db.push_devices.find({"active": True}, {"_id": 0}).limit(500))
    stats = {"total": 0, "ios": 0, "android": 0, "web": 0, "queued": 0, "failed": 0}
    for d in devices:
        rec = _dispatch(d, title, body, link)
        stats["total"] += 1
        b = rec["bucket"]
        stats[b] = stats.get(b, 0) + 1
        _db.push_log.insert_one({
            "device_token": (d.get("device_token") or "")[:32],
            "platform": d.get("platform"),
            "staff_token": d.get("staff_token"),
            "title": title, "body": body, "link": link,
            "status": rec["status"], "channel": rec["channel"],
            "created_at": _iso(), "kind": "broadcast",
        })
    return {"ok": True, "stats": stats}
