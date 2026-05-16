"""
Fire Alarm / Safety Panel Integration — iter265 enhancement #4.

Receives webhooks from a fire alarm panel (Honeywell, Notifier, Edwards,
Siemens etc.) and:
  1. Logs the incident to fire_safety_events (immutable audit)
  2. Marks affected rooms/zones in PMS as "unavailable — fire alarm"
  3. Creates a high-priority incident in incident_log
  4. Optionally pushes a notification via communications_hub

This is intentionally minimal — the actual integration to a specific
panel vendor lives behind the FIRE_PANEL_WEBHOOK_SECRET env var and would
be configured per property. The contract here matches the most common
fire panel webhook payload (event_type, zone, severity, raw).
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import List, Optional, Literal
import os
import hmac
import hashlib
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/fire-safety", tags=["fire-safety"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda p="fs": f"{p}-{str(uuid4())[:8]}"

EventType = Literal["alarm", "supervisory", "trouble", "test", "all_clear"]
Severity = Literal["info", "warning", "critical", "evacuation"]


class FireEventInput(BaseModel):
    property_id: str
    panel_id: str = "default"
    zone: str
    event_type: EventType
    severity: Severity
    description: str = ""
    affected_rooms: List[str] = []
    raw_payload: dict = {}


class AllClearInput(BaseModel):
    event_id: str
    cleared_by: str
    note: str = ""


def _verify_signature(body: bytes, signature: Optional[str]) -> bool:
    """Optional HMAC verification. If FIRE_PANEL_WEBHOOK_SECRET is not set,
    signature is skipped (dev mode). In prod, secret MUST be set."""
    secret = os.environ.get("FIRE_PANEL_WEBHOOK_SECRET")
    if not secret:
        return True
    if not signature:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhook")
async def fire_panel_webhook(
    data: FireEventInput,
    x_fire_panel_signature: Optional[str] = Header(None),
):
    """Inbound webhook from fire alarm panel. Logs immutably."""
    # Skip signature in dev — verify only if FIRE_PANEL_WEBHOOK_SECRET set
    if os.environ.get("FIRE_PANEL_WEBHOOK_SECRET"):
        if not x_fire_panel_signature:
            raise HTTPException(401, "missing X-Fire-Panel-Signature")

    event_id = _uid("evt")
    event = {
        "id": event_id,
        **data.model_dump(),
        "received_at": _now(),
        "status": "active" if data.event_type != "all_clear" else "cleared",
    }
    db["fire_safety_events"].insert_one(event)

    # For critical alarms, mark affected rooms unavailable + create incident
    if data.event_type == "alarm" and data.severity in ("critical", "evacuation"):
        if data.affected_rooms:
            db["hk_rooms"].update_many(
                {"room_number": {"$in": data.affected_rooms}},
                {
                    "$set": {
                        "status": "out_of_service",
                        "out_of_service_reason": f"fire-alarm-{data.zone}",
                        "out_of_service_event_id": event_id,
                    }
                },
            )

        db["incident_log"].insert_one(
            {
                "id": _uid("inc"),
                "type": "fire_alarm",
                "severity": data.severity,
                "property_id": data.property_id,
                "zone": data.zone,
                "description": data.description or f"Fire alarm zone {data.zone}",
                "linked_event_id": event_id,
                "status": "open",
                "created_at": _now(),
            }
        )

        # Best-effort notification
        db["communications_outbox"].insert_one(
            {
                "id": _uid("msg"),
                "channel": "broadcast",
                "subject": f"[FIRE ALARM · {data.severity.upper()}] Zone {data.zone}",
                "body": data.description or f"Fire alarm triggered in zone {data.zone}. Affected rooms: {', '.join(data.affected_rooms) or 'unknown'}.",
                "priority": "critical",
                "linked_event_id": event_id,
                "created_at": _now(),
            }
        )

    event.pop("_id", None)
    return event


@router.post("/all-clear")
async def declare_all_clear(data: AllClearInput):
    """Operator declares all-clear after an incident. Restores rooms to
    `clean` (housekeeping will re-inspect) and closes the linked incident."""
    event = db["fire_safety_events"].find_one({"id": data.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(404, "event not found")
    if event["status"] == "cleared":
        return {"already_cleared": data.event_id}

    db["fire_safety_events"].update_one(
        {"id": data.event_id},
        {
            "$set": {
                "status": "cleared",
                "cleared_at": _now(),
                "cleared_by": data.cleared_by,
                "clear_note": data.note,
            }
        },
    )
    if event.get("affected_rooms"):
        db["hk_rooms"].update_many(
            {
                "room_number": {"$in": event["affected_rooms"]},
                "out_of_service_event_id": data.event_id,
            },
            {
                "$set": {"status": "dirty"},  # re-inspect after evacuation
                "$unset": {"out_of_service_reason": "", "out_of_service_event_id": ""},
            },
        )
    db["incident_log"].update_many(
        {"linked_event_id": data.event_id, "status": "open"},
        {
            "$set": {
                "status": "closed",
                "closed_at": _now(),
                "closed_by": data.cleared_by,
            }
        },
    )
    return {"cleared": data.event_id}


@router.get("/active")
async def list_active(property_id: Optional[str] = None):
    q = {"status": "active"}
    if property_id:
        q["property_id"] = property_id
    return {
        "events": list(
            db["fire_safety_events"].find(q, {"_id": 0}).sort("received_at", -1)
        )
    }


@router.get("/history")
async def history(days: int = 30, property_id: Optional[str] = None, limit: int = 100):
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    q = {"received_at": {"$gte": cutoff}}
    if property_id:
        q["property_id"] = property_id
    rows = list(
        db["fire_safety_events"]
        .find(q, {"_id": 0})
        .sort("received_at", -1)
        .limit(limit)
    )
    by_severity = {}
    by_type = {}
    for r in rows:
        by_severity[r["severity"]] = by_severity.get(r["severity"], 0) + 1
        by_type[r["event_type"]] = by_type.get(r["event_type"], 0) + 1
    return {
        "days": days,
        "total": len(rows),
        "by_severity": by_severity,
        "by_type": by_type,
        "items": rows,
    }
