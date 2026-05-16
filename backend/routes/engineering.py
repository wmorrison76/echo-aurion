"""
Engineering Department Profile + Work Order Management
========================================================
Hotel engineering work order system (similar to HotSOS/Quore):
- Work orders: create, assign, track, close
- Equipment registry with PM schedules
- Guest room maintenance tracking
- Energy & utility monitoring
- Notifications for engineering team
"""
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List

from database import db

router = APIRouter(prefix="/api/engineering", tags=["engineering"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

WORK_ORDER_TYPES = ["preventive", "corrective", "emergency", "guest_request", "inspection", "capital_project"]
PRIORITY_LEVELS = ["low", "medium", "high", "critical"]
EQUIPMENT_CATEGORIES = ["hvac", "kitchen", "plumbing", "electrical", "elevator", "fire_safety", "pool", "laundry", "refrigeration", "general"]


class WorkOrder(BaseModel):
    title: str
    description: str = ""
    wo_type: str = "corrective"
    priority: str = "medium"
    location: str = ""
    equipment_id: Optional[str] = None
    assigned_to: Optional[str] = None
    requested_by: Optional[str] = None
    estimated_hours: float = 1.0


class Equipment(BaseModel):
    name: str
    category: str = "general"
    location: str = ""
    model_number: str = ""
    serial_number: str = ""
    install_date: Optional[str] = None
    pm_frequency_days: int = 90
    last_pm_date: Optional[str] = None


# ── Work Orders ──

@router.post("/work-orders")
async def create_work_order(wo: WorkOrder):
    """Create a new work order."""
    doc = {
        "wo_id": f"WO-{_uid()}",
        "title": wo.title,
        "description": wo.description,
        "wo_type": wo.wo_type,
        "priority": wo.priority,
        "location": wo.location,
        "equipment_id": wo.equipment_id,
        "assigned_to": wo.assigned_to,
        "requested_by": wo.requested_by,
        "estimated_hours": wo.estimated_hours,
        "actual_hours": None,
        "status": "open",
        "parts_used": [],
        "notes": [],
        "created_at": _now(),
        "updated_at": _now(),
        "completed_at": None,
    }
    db["work_orders"].insert_one(doc)
    doc.pop("_id", None)

    # Create notification
    if wo.assigned_to:
        db["notifications"].insert_one({
            "id": _uid(),
            "type": "work_order",
            "recipient_user_id": wo.assigned_to,
            "title": f"New Work Order: {wo.title}",
            "message": f"[{wo.priority.upper()}] {wo.wo_type} — {wo.location}. {wo.description[:100]}",
            "priority": wo.priority,
            "read": False,
            "entity_type": "work_order",
            "entity_id": doc["wo_id"],
            "created_at": _now(),
        })

    return doc


@router.get("/work-orders")
async def list_work_orders(status: Optional[str] = None, priority: Optional[str] = None, limit: int = 50):
    """List work orders with optional filtering."""
    q = {}
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    orders = list(db["work_orders"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {
        "work_orders": orders,
        "total": len(orders),
        "open": db["work_orders"].count_documents({"status": "open"}),
        "in_progress": db["work_orders"].count_documents({"status": "in_progress"}),
        "completed": db["work_orders"].count_documents({"status": "completed"}),
    }


@router.put("/work-orders/{wo_id}")
async def update_work_order(wo_id: str, status: str = Query("in_progress"), actual_hours: Optional[float] = None, notes: Optional[str] = None):
    """Update work order status."""
    update = {"status": status, "updated_at": _now()}
    if actual_hours:
        update["actual_hours"] = actual_hours
    if status == "completed":
        update["completed_at"] = _now()

    result = db["work_orders"].update_one({"wo_id": wo_id}, {"$set": update})
    if notes:
        db["work_orders"].update_one({"wo_id": wo_id}, {"$push": {"notes": {"text": notes, "timestamp": _now()}}})

    if result.matched_count == 0:
        return {"error": "Work order not found"}
    return {"wo_id": wo_id, "status": status}


# ── Equipment Registry ──

@router.post("/equipment")
async def register_equipment(equip: Equipment):
    """Register equipment in the asset registry."""
    doc = {
        "equipment_id": f"EQ-{_uid()}",
        "name": equip.name,
        "category": equip.category,
        "location": equip.location,
        "model_number": equip.model_number,
        "serial_number": equip.serial_number,
        "install_date": equip.install_date,
        "pm_frequency_days": equip.pm_frequency_days,
        "last_pm_date": equip.last_pm_date,
        "status": "operational",
        "work_order_count": 0,
        "created_at": _now(),
    }
    db["equipment_registry"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/equipment")
async def list_equipment(category: Optional[str] = None):
    """List all equipment."""
    q = {}
    if category:
        q["category"] = category
    equip = list(db["equipment_registry"].find(q, {"_id": 0}).limit(100))
    return {"equipment": equip, "total": len(equip)}


# ── PM Schedule ──

@router.get("/pm-schedule")
async def pm_schedule():
    """Get preventive maintenance schedule — what's due."""
    equipment = list(db["equipment_registry"].find({}, {"_id": 0}).limit(200))
    today = datetime.now(timezone.utc)
    due = []
    upcoming = []

    for eq in equipment:
        last_pm = eq.get("last_pm_date")
        freq = eq.get("pm_frequency_days", 90)
        if last_pm:
            try:
                last_dt = datetime.fromisoformat(last_pm.replace("Z", "+00:00"))
                next_pm = last_dt + timedelta(days=freq)
                days_until = (next_pm - today).days
                entry = {
                    "equipment_id": eq["equipment_id"],
                    "name": eq["name"],
                    "category": eq["category"],
                    "location": eq["location"],
                    "last_pm": last_pm,
                    "next_pm": next_pm.strftime("%Y-%m-%d"),
                    "days_until": days_until,
                    "status": "overdue" if days_until < 0 else "due_soon" if days_until < 7 else "scheduled",
                }
                if days_until < 7:
                    due.append(entry)
                else:
                    upcoming.append(entry)
            except (ValueError, TypeError):
                pass

    return {
        "due_now": due,
        "upcoming": upcoming,
        "total_equipment": len(equipment),
        "overdue_count": len([d for d in due if d["status"] == "overdue"]),
    }


# ── Engineering Dashboard ──

@router.get("/dashboard")
async def engineering_dashboard():
    """Full engineering department dashboard."""
    wo_total = db["work_orders"].count_documents({})
    wo_open = db["work_orders"].count_documents({"status": "open"})
    wo_ip = db["work_orders"].count_documents({"status": "in_progress"})
    wo_done = db["work_orders"].count_documents({"status": "completed"})
    wo_critical = db["work_orders"].count_documents({"priority": "critical", "status": {"$ne": "completed"}})

    equip_total = db["equipment_registry"].count_documents({})

    # Recent work orders
    recent = list(db["work_orders"].find({}, {"_id": 0}).sort("created_at", -1).limit(10))

    # By type breakdown
    type_counts = {}
    for t in WORK_ORDER_TYPES:
        type_counts[t] = db["work_orders"].count_documents({"wo_type": t})

    return {
        "work_orders": {
            "total": wo_total,
            "open": wo_open,
            "in_progress": wo_ip,
            "completed": wo_done,
            "critical_open": wo_critical,
            "by_type": type_counts,
        },
        "equipment": {
            "total": equip_total,
            "categories": EQUIPMENT_CATEGORIES,
        },
        "recent_orders": recent[:5],
        "generated_at": _now(),
    }


# ── Seed sample engineering data ──

@router.post("/seed")
async def seed_engineering():
    """Seed sample equipment and work orders for demo."""
    if db["equipment_registry"].count_documents({}) > 0:
        return {"status": "already_seeded"}

    equipment = [
        {"name": "Walk-In Cooler #1", "category": "refrigeration", "location": "Main Kitchen", "model_number": "KR-4500", "pm_frequency_days": 30},
        {"name": "Walk-In Freezer #1", "category": "refrigeration", "location": "Main Kitchen", "model_number": "KF-3200", "pm_frequency_days": 30},
        {"name": "Combi Oven Rational SCC", "category": "kitchen", "location": "Main Kitchen", "model_number": "SCC-201", "pm_frequency_days": 90},
        {"name": "Hobart Dishwasher", "category": "kitchen", "location": "Main Kitchen", "model_number": "CL44E", "pm_frequency_days": 60},
        {"name": "HVAC Chiller Unit A", "category": "hvac", "location": "Mechanical Room", "model_number": "Trane-CenTraVac", "pm_frequency_days": 120},
        {"name": "HVAC AHU Ballroom", "category": "hvac", "location": "Crystal Ballroom", "model_number": "AHU-BQ-01", "pm_frequency_days": 90},
        {"name": "Pool Pump System", "category": "pool", "location": "Pool Deck", "model_number": "Pentair-IntelliFlo", "pm_frequency_days": 60},
        {"name": "Elevator #1 Guest", "category": "elevator", "location": "Main Lobby", "model_number": "Otis-Gen3", "pm_frequency_days": 30},
        {"name": "Fire Suppression Kitchen", "category": "fire_safety", "location": "Main Kitchen", "model_number": "Ansul-R102", "pm_frequency_days": 180},
        {"name": "Ice Machine Scotsman", "category": "kitchen", "location": "SkyBar", "model_number": "SC-C0830", "pm_frequency_days": 60},
    ]

    for eq in equipment:
        eq["equipment_id"] = f"EQ-{_uid()}"
        eq["serial_number"] = f"SN-{_uid()}"
        eq["install_date"] = "2023-06-15"
        eq["last_pm_date"] = (datetime.now(timezone.utc) - timedelta(days=eq["pm_frequency_days"] - 5)).isoformat()
        eq["status"] = "operational"
        eq["work_order_count"] = 0
        eq["created_at"] = _now()
    db["equipment_registry"].insert_many(equipment)

    work_orders = [
        {"title": "Walk-in cooler temp alarm", "wo_type": "emergency", "priority": "critical", "location": "Main Kitchen", "description": "Temperature alarm triggered — 42°F reading, should be 38°F"},
        {"title": "Dishwasher not draining", "wo_type": "corrective", "priority": "high", "location": "Main Kitchen", "description": "Hobart dishwasher backup in drain line"},
        {"title": "Guest room 412 AC not cooling", "wo_type": "guest_request", "priority": "high", "location": "Room 412", "description": "Guest complaint — room at 78°F"},
        {"title": "Pool pump monthly PM", "wo_type": "preventive", "priority": "medium", "location": "Pool Deck", "description": "Monthly PM on Pentair pump system"},
        {"title": "Replace ballroom lighting fixtures", "wo_type": "capital_project", "priority": "low", "location": "Crystal Ballroom", "description": "Upgrade to LED fixtures per renovation plan"},
    ]

    for wo in work_orders:
        wo["wo_id"] = f"WO-{_uid()}"
        wo["assigned_to"] = "eng-team"
        wo["requested_by"] = "operations"
        wo["estimated_hours"] = 2.0
        wo["actual_hours"] = None
        wo["status"] = "open"
        wo["parts_used"] = []
        wo["notes"] = []
        wo["created_at"] = _now()
        wo["updated_at"] = _now()
        wo["completed_at"] = None
    db["work_orders"].insert_many(work_orders)

    return {"status": "seeded", "equipment": len(equipment), "work_orders": len(work_orders)}
