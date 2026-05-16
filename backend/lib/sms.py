"""iter214 · SMS helper — used by EchoWaste buffet-close digest + any future alerting.

Design:
  - Loads Twilio creds from env (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
    TWILIO_FROM_NUMBER). If any are missing, send_sms() returns
    {"ok": False, "queued": True, "reason": "no_credentials"} and persists
    the message to `outbound_sms_queue` so it can be flushed later.
  - Uses the `twilio` SDK which is installed only when creds are present.
  - Always logs the attempt to `outbound_sms_log`.
"""
from __future__ import annotations
import os
import uuid
from typing import Any, Dict, Optional

from database import db
from lib.time import utcnow_iso


def _sid() -> Optional[str]: return os.environ.get("TWILIO_ACCOUNT_SID") or None
def _tok() -> Optional[str]: return os.environ.get("TWILIO_AUTH_TOKEN") or None
def _from() -> Optional[str]: return os.environ.get("TWILIO_FROM_NUMBER") or None


def _credentials_present() -> bool:
    return all([_sid(), _tok(), _from()])


def send_sms(to_number: str, body: str, purpose: str = "generic",
             related_entity: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Send an SMS via Twilio. If creds missing, queue and return queued=True.

    Args:
        to_number: recipient phone (E.164, e.g. "+15617796872")
        body: SMS body (Twilio accepts up to 1600 chars; we trim to 320)
        purpose: classifier for analytics ("buffet_digest", "shortage_alert", etc.)
        related_entity: optional dict like {"type":"buffet_session","id":"bfs-..."}
    """
    msg_id = f"sms-{uuid.uuid4().hex[:12]}"
    body = (body or "")[:320]
    record_base = {
        "message_id": msg_id,
        "to": to_number,
        "body": body,
        "purpose": purpose,
        "related_entity": related_entity or {},
        "from_number": _from(),
        "created_at": utcnow_iso(),
    }

    if not _credentials_present():
        db["outbound_sms_queue"].insert_one({**record_base, "status": "queued", "reason": "no_credentials"})
        return {"ok": False, "queued": True, "reason": "no_credentials", "message_id": msg_id}

    try:
        from twilio.rest import Client  # type: ignore
        client = Client(_sid(), _tok())
        resp = client.messages.create(from_=_from(), to=to_number, body=body)
        db["outbound_sms_log"].insert_one({
            **record_base,
            "status": "sent",
            "twilio_sid": getattr(resp, "sid", None),
            "twilio_status": getattr(resp, "status", None),
        })
        return {"ok": True, "message_id": msg_id, "twilio_sid": getattr(resp, "sid", None)}
    except Exception as e:  # pragma: no cover — Twilio network errors
        db["outbound_sms_queue"].insert_one({
            **record_base, "status": "failed", "reason": "send_error", "error": str(e)[:400],
        })
        return {"ok": False, "queued": True, "reason": "send_error", "error": str(e)[:400],
                "message_id": msg_id}


def flush_queue(limit: int = 50) -> Dict[str, Any]:
    """Re-attempt queued SMS once credentials are present. Called by a manual
    `POST /api/admin/sms/flush` endpoint (and potentially a cron later)."""
    if not _credentials_present():
        return {"ok": False, "reason": "no_credentials", "flushed": 0}
    rows = list(db["outbound_sms_queue"].find({"status": {"$in": ["queued", "failed"]}}).limit(limit))
    sent = 0
    for r in rows:
        resp = send_sms(r["to"], r["body"], r.get("purpose") or "generic",
                        r.get("related_entity"))
        if resp.get("ok"):
            db["outbound_sms_queue"].delete_one({"_id": r["_id"]})
            sent += 1
    return {"ok": True, "attempted": len(rows), "flushed": sent}


def credentials_status() -> Dict[str, Any]:
    return {
        "configured": _credentials_present(),
        "has_account_sid": bool(_sid()),
        "has_auth_token": bool(_tok()),
        "has_from_number": bool(_from()),
        "from_number_hint": (_from() or "")[-4:] if _from() else None,
    }
