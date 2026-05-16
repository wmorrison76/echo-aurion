"""
Weather Auto-Rebook — iter265 enhancement #3.

When a SEVERE/EXTREME NWS alert intersects an outdoor BEO function within
the next N hours, automatically:
  1. Queue the indoor backup space (if defined on the event)
  2. Log a rebook recommendation to weather_rebook_log
  3. Notify the event manager via communications_hub

This route does NOT auto-commit the rebook. It surfaces a recommendation
and a one-click approve endpoint. Operator approval is still required —
no fully-automatic guest-impacting actions.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import List, Optional, Literal
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/weather-rebook", tags=["weather-rebook"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda p="wr": f"{p}-{str(uuid4())[:8]}"

NWS_ALERTS = "https://api.weather.gov/alerts/active"
SEVERE_LEVELS = {"Severe", "Extreme"}


class RebookApprovalInput(BaseModel):
    rebook_id: str
    approved_by: str
    note: str = ""


class GeofenceCheckInput(BaseModel):
    property_id: str
    horizon_hours: int = 4
    lat: float
    lng: float


@router.post("/check")
async def check_geofence(data: GeofenceCheckInput):
    """Scan upcoming outdoor BEO functions against NWS alerts. Returns
    rebook recommendations for any function inside the alert polygon."""
    cutoff = datetime.now(timezone.utc) + timedelta(hours=data.horizon_hours)

    # Pull upcoming outdoor functions
    upcoming = list(
        db["beo_functions"].find(
            {
                "property_id": data.property_id,
                "venue_type": "outdoor",
                "start_at": {
                    "$gte": _now(),
                    "$lte": cutoff.isoformat(),
                },
                "status": {"$in": ["confirmed", "tentative"]},
            },
            {"_id": 0},
        )
    )

    if not upcoming:
        return {
            "checked_at": _now(),
            "property_id": data.property_id,
            "outdoor_functions": 0,
            "recommendations": [],
            "data_source": "no_outdoor_functions",
        }

    # Fetch active alerts at location
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                f"{NWS_ALERTS}?point={data.lat:.4f},{data.lng:.4f}",
                headers={"Accept": "application/geo+json"},
            )
            res.raise_for_status()
            alerts = res.json().get("features", [])
    except Exception as e:
        raise HTTPException(502, f"NWS fetch failed: {e}")

    severe = [
        a for a in alerts if a.get("properties", {}).get("severity") in SEVERE_LEVELS
    ]
    if not severe:
        return {
            "checked_at": _now(),
            "property_id": data.property_id,
            "outdoor_functions": len(upcoming),
            "active_severe_alerts": 0,
            "recommendations": [],
            "data_source": "no_severe_alerts",
        }

    # For each function, propose rebook if backup space defined
    recommendations = []
    for fn in upcoming:
        backup_id = fn.get("backup_venue_id")
        rec_id = _uid()
        rec = {
            "id": rec_id,
            "function_id": fn.get("id"),
            "function_name": fn.get("name"),
            "start_at": fn.get("start_at"),
            "current_venue": fn.get("venue_id"),
            "backup_venue": backup_id,
            "triggering_alert": severe[0].get("properties", {}).get("event"),
            "alert_severity": severe[0].get("properties", {}).get("severity"),
            "alert_expires": severe[0].get("properties", {}).get("expires"),
            "can_auto_queue": bool(backup_id),
            "status": "pending_approval",
            "created_at": _now(),
        }
        db["weather_rebook_log"].insert_one({**rec})
        recommendations.append(rec)

    return {
        "checked_at": _now(),
        "property_id": data.property_id,
        "outdoor_functions": len(upcoming),
        "active_severe_alerts": len(severe),
        "recommendations": recommendations,
        "data_source": "live_nws",
    }


@router.get("/pending")
async def list_pending(property_id: Optional[str] = None):
    q = {"status": "pending_approval"}
    rows = list(db["weather_rebook_log"].find(q, {"_id": 0}).sort("created_at", -1))
    return {"count": len(rows), "recommendations": rows}


@router.post("/approve")
async def approve_rebook(data: RebookApprovalInput):
    """Operator approves the rebook. Updates the BEO function to point at
    the backup venue and notifies the event manager."""
    rec = db["weather_rebook_log"].find_one({"id": data.rebook_id}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "rebook recommendation not found")
    if rec["status"] != "pending_approval":
        raise HTTPException(400, f"already {rec['status']}")
    if not rec.get("backup_venue"):
        raise HTTPException(400, "no backup venue on this function — manual rebook required")

    # Update the BEO function
    db["beo_functions"].update_one(
        {"id": rec["function_id"]},
        {
            "$set": {
                "venue_id": rec["backup_venue"],
                "original_venue_id": rec["current_venue"],
                "rebook_reason": f"Weather: {rec['triggering_alert']}",
                "rebooked_at": _now(),
                "rebooked_by": data.approved_by,
            }
        },
    )
    db["weather_rebook_log"].update_one(
        {"id": data.rebook_id},
        {
            "$set": {
                "status": "approved",
                "approved_by": data.approved_by,
                "approved_at": _now(),
                "note": data.note,
            }
        },
    )

    # Notify via communications_hub (best-effort)
    db["communications_outbox"].insert_one(
        {
            "id": _uid("msg"),
            "channel": "email",
            "subject": f"[Weather Rebook] {rec['function_name']} moved indoors",
            "body": f"Severe weather ({rec['triggering_alert']}) triggered auto-rebook from "
                    f"{rec['current_venue']} to {rec['backup_venue']}. Approved by {data.approved_by}.",
            "function_id": rec["function_id"],
            "created_at": _now(),
        }
    )

    return {"approved": data.rebook_id, "function_id": rec["function_id"]}


@router.post("/dismiss")
async def dismiss_rebook(rebook_id: str, dismissed_by: str, reason: str = ""):
    rec = db["weather_rebook_log"].find_one({"id": rebook_id}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "not found")
    db["weather_rebook_log"].update_one(
        {"id": rebook_id},
        {
            "$set": {
                "status": "dismissed",
                "dismissed_by": dismissed_by,
                "dismissed_at": _now(),
                "dismiss_reason": reason,
            }
        },
    )
    return {"dismissed": rebook_id}


@router.get("/history")
async def history(days: int = 30, limit: int = 100):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = list(
        db["weather_rebook_log"]
        .find({"created_at": {"$gte": cutoff}}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    by_status = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
    return {"days": days, "total": len(rows), "by_status": by_status, "items": rows}
