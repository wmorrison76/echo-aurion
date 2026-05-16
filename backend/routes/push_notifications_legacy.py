"""
Mobile Push Notification Framework
=====================================
Backend notification queue with delivery tracking.
Ready for mobile app connection (Firebase/APNs).
Supports: OT alerts, purchase alerts, daily flash, work orders, BEO updates, budget warnings.
User preferences for notification types, frequency, quiet hours.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from database import db

router = APIRouter(prefix="/api/notifications", tags=["notifications"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

NOTIFICATION_TYPES = [
    "overtime_alert", "purchase_alert", "daily_flash", "work_order",
    "beo_update", "budget_warning", "access_decision", "escalation",
    "vendor_price_alert", "food_cost_alert", "weather_alert",
    "commissary_order", "schedule_change", "equipment_pm",
]


class NotificationPreferences(BaseModel):
    user_id: str
    enabled_types: List[str] = NOTIFICATION_TYPES
    quiet_hours_start: Optional[str] = "22:00"
    quiet_hours_end: Optional[str] = "06:00"
    push_enabled: bool = True
    email_enabled: bool = False
    sms_enabled: bool = False


class PushNotification(BaseModel):
    recipient_user_id: Optional[str] = None
    recipient_role: Optional[str] = None
    notification_type: str
    title: str
    message: str
    priority: str = "normal"
    data: Optional[Dict] = None


# ── Send Notification ──

@router.post("/send")
async def send_notification(notif: PushNotification):
    """Queue a notification for delivery."""
    doc = {
        "notification_id": f"notif-{_uid()}",
        "recipient_user_id": notif.recipient_user_id,
        "recipient_role": notif.recipient_role,
        "notification_type": notif.notification_type,
        "title": notif.title,
        "message": notif.message,
        "priority": notif.priority,
        "data": notif.data or {},
        "status": "queued",
        "read": False,
        "delivered_at": None,
        "read_at": None,
        "created_at": _now(),
    }
    db["notification_queue"].insert_one(doc)
    doc.pop("_id", None)

    # Also store in the general notifications collection for immediate UI display
    db["notifications"].insert_one({
        "id": doc["notification_id"],
        "type": notif.notification_type,
        "recipient_user_id": notif.recipient_user_id,
        "recipient_role": notif.recipient_role,
        "title": notif.title,
        "message": notif.message,
        "priority": notif.priority,
        "read": False,
        "entity_type": notif.notification_type,
        "entity_id": notif.data.get("entity_id") if notif.data else None,
        "created_at": _now(),
    })

    return doc


# ── Notification Queue ──

@router.get("/queue")
async def notification_queue(user_id: Optional[str] = None, status: Optional[str] = None, limit: int = 50):
    """Get notification queue."""
    q = {}
    if user_id:
        q["recipient_user_id"] = user_id
    if status:
        q["status"] = status
    queue = list(db["notification_queue"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {
        "queue": queue,
        "total": len(queue),
        "undelivered": db["notification_queue"].count_documents({"status": "queued"}),
    }


# ── User Notifications ──

@router.get("/user/{user_id}")
async def user_notifications(user_id: str, unread_only: bool = False, limit: int = 30):
    """Get notifications for a specific user."""
    q = {"$or": [{"recipient_user_id": user_id}, {"recipient_role": {"$exists": True}}]}
    if unread_only:
        q["read"] = False
    notifs = list(db["notifications"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    unread = db["notifications"].count_documents({**q, "read": False})
    return {"notifications": notifs, "total": len(notifs), "unread": unread}


@router.put("/read/{notification_id}")
async def mark_read(notification_id: str):
    """Mark notification as read."""
    db["notifications"].update_one({"id": notification_id}, {"$set": {"read": True, "read_at": _now()}})
    db["notification_queue"].update_one({"notification_id": notification_id}, {"$set": {"status": "read", "read_at": _now()}})
    return {"status": "read"}


@router.put("/read-all/{user_id}")
async def mark_all_read(user_id: str):
    """Mark all notifications as read for a user."""
    result = db["notifications"].update_many(
        {"$or": [{"recipient_user_id": user_id}, {"recipient_role": {"$exists": True}}], "read": False},
        {"$set": {"read": True, "read_at": _now()}},
    )
    return {"marked_read": result.modified_count}


# ── Preferences ──

@router.post("/preferences")
async def set_preferences(prefs: NotificationPreferences):
    """Set notification preferences for a user."""
    doc = prefs.model_dump()
    doc["updated_at"] = _now()
    db["notification_preferences"].update_one({"user_id": prefs.user_id}, {"$set": doc}, upsert=True)
    return {"status": "updated", "user_id": prefs.user_id}


@router.get("/preferences/{user_id}")
async def get_preferences(user_id: str):
    """Get notification preferences."""
    prefs = db["notification_preferences"].find_one({"user_id": user_id}, {"_id": 0})
    if not prefs:
        return {"user_id": user_id, "enabled_types": NOTIFICATION_TYPES, "push_enabled": True, "quiet_hours_start": "22:00", "quiet_hours_end": "06:00"}
    return prefs


# ── Batch Alert Generation ──

@router.post("/generate-alerts")
async def generate_smart_alerts():
    """Generate smart alerts based on current system state — called by scheduler or manually."""
    alerts = []
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(200))
    invoices = list(db["invoices"].find({}, {"_id": 0}).sort("created_at", -1).limit(10))

    total_rev = sum(e["amount"] for e in gl if e.get("entry_type") == "revenue")
    food_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5000")
    hourly_labor = sum(e["amount"] for e in gl if e.get("gl_code") in ("6000", "6010"))

    # Food cost alert
    if total_rev > 0:
        fc_pct = food_cogs / total_rev * 100
        if fc_pct > 26:
            alerts.append(PushNotification(
                recipient_role="exec_chef",
                notification_type="food_cost_alert",
                title="Food Cost Alert",
                message=f"Food cost at {fc_pct:.1f}% — exceeds 26% threshold. Review top cost items.",
                priority="high",
            ))

    # Labor alert
    if total_rev > 0:
        labor_pct = hourly_labor / total_rev * 100
        if labor_pct > 28:
            alerts.append(PushNotification(
                recipient_role="manager",
                notification_type="overtime_alert",
                title="Labor Over Budget",
                message=f"Hourly labor at {labor_pct:.1f}% of revenue — review scheduling.",
                priority="high",
            ))

    # Recent large purchase
    for inv in invoices[:3]:
        if inv.get("total", 0) > 2000:
            alerts.append(PushNotification(
                recipient_role="exec_chef",
                notification_type="purchase_alert",
                title=f"Large Purchase: {inv.get('vendor_name', '')}",
                message=f"${inv.get('total', 0):,.2f} invoice from {inv.get('vendor_name', '')} ({inv.get('invoice_date', '')})",
                priority="normal",
                data={"invoice_id": inv.get("invoice_id")},
            ))

    # OT risk
    for s in labor[-10:]:
        if s.get("overtime_hours", 0) > 3:
            alerts.append(PushNotification(
                recipient_role="manager",
                notification_type="overtime_alert",
                title=f"OT Risk: {s.get('department', '')}",
                message=f"{s.get('department', '')}: {s.get('overtime_hours', 0)}hrs OT on {s.get('date', '')}",
                priority="warning",
            ))

    # Send all alerts
    sent = 0
    for alert in alerts:
        await send_notification(alert)
        sent += 1

    return {"alerts_generated": sent, "alert_types": [a.notification_type for a in alerts]}
