"""
Engineering Deep Dive — HotSOS/Quore-Style Extensions
=======================================================
- Room maintenance matrix
- Auto-escalation rules
- Inspection checklists
- Vendor/contractor management
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from database import db

router = APIRouter(prefix="/api/engineering/advanced", tags=["engineering-advanced"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


class InspectionChecklist(BaseModel):
    name: str
    category: str = "general"  # fire_safety, health_dept, brand_standards, pool, kitchen
    items: List[Dict]  # [{item, status, notes}]
    inspector: str = ""
    location: str = ""


# ── Room Maintenance Matrix ──

@router.get("/room-matrix")
async def room_maintenance_matrix():
    """Room-by-room maintenance status — which rooms have open issues."""
    wos = list(db["work_orders"].find({"location": {"$regex": "Room|room|Suite|suite"}}, {"_id": 0}).limit(200))
    rooms = {}
    for wo in wos:
        loc = wo.get("location", "")
        if loc not in rooms:
            rooms[loc] = {"location": loc, "open": 0, "in_progress": 0, "completed": 0, "critical": 0, "issues": []}
        status = wo.get("status", "open")
        rooms[loc][status] = rooms[loc].get(status, 0) + 1
        if wo.get("priority") == "critical" and status != "completed":
            rooms[loc]["critical"] += 1
        if status != "completed":
            rooms[loc]["issues"].append({"wo_id": wo["wo_id"], "title": wo["title"], "priority": wo["priority"], "status": status})

    room_list = sorted(rooms.values(), key=lambda r: r["critical"] + r["open"], reverse=True)
    return {
        "rooms": room_list,
        "total_rooms_with_issues": len([r for r in room_list if r["open"] + r.get("in_progress", 0) > 0]),
        "critical_rooms": len([r for r in room_list if r["critical"] > 0]),
        "generated_at": _now(),
    }


# ── Auto-Escalation ──

@router.post("/check-escalations")
async def check_escalations():
    """Check for work orders that need escalation based on age and priority."""
    now = datetime.now(timezone.utc)
    wos = list(db["work_orders"].find({"status": {"$in": ["open", "in_progress"]}}, {"_id": 0}))

    escalation_rules = {
        "critical": timedelta(hours=2),
        "high": timedelta(hours=8),
        "medium": timedelta(hours=24),
        "low": timedelta(hours=72),
    }

    escalated = []
    for wo in wos:
        priority = wo.get("priority", "medium")
        created = wo.get("created_at", "")
        try:
            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        threshold = escalation_rules.get(priority, timedelta(hours=24))
        age = now - created_dt
        if age > threshold:
            hours_overdue = round((age - threshold).total_seconds() / 3600, 1)
            escalated.append({
                "wo_id": wo["wo_id"],
                "title": wo["title"],
                "priority": priority,
                "location": wo.get("location", ""),
                "age_hours": round(age.total_seconds() / 3600, 1),
                "threshold_hours": threshold.total_seconds() / 3600,
                "hours_overdue": hours_overdue,
                "escalate_to": "Director of Engineering" if priority == "critical" else "Chief Engineer",
            })

            # Create escalation notification
            db["notifications"].update_one(
                {"entity_id": wo["wo_id"], "type": "escalation"},
                {"$set": {
                    "id": _uid(), "type": "escalation",
                    "recipient_role": "director",
                    "title": f"ESCALATION: {wo['title']}",
                    "message": f"[{priority.upper()}] WO {wo['wo_id']} has been open {round(age.total_seconds()/3600, 1)}hrs — exceeds {threshold.total_seconds()/3600}hr threshold. Location: {wo.get('location', '')}",
                    "priority": "critical", "read": False,
                    "entity_type": "work_order", "entity_id": wo["wo_id"],
                    "created_at": _now(),
                }},
                upsert=True,
            )

    return {"escalated": escalated, "total": len(escalated), "checked": len(wos), "generated_at": _now()}


# ── Inspection Checklists ──

@router.post("/inspection")
async def create_inspection(checklist: InspectionChecklist):
    """Create an inspection checklist (fire safety, health dept, brand standards)."""
    doc = {
        "inspection_id": f"INS-{_uid()}",
        "name": checklist.name,
        "category": checklist.category,
        "items": checklist.items,
        "inspector": checklist.inspector,
        "location": checklist.location,
        "status": "in_progress",
        "pass_count": len([i for i in checklist.items if i.get("status") == "pass"]),
        "fail_count": len([i for i in checklist.items if i.get("status") == "fail"]),
        "total_items": len(checklist.items),
        "created_at": _now(),
        "completed_at": None,
    }
    db["inspections"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/inspections")
async def list_inspections(category: Optional[str] = None):
    """List inspections."""
    q = {}
    if category:
        q["category"] = category
    inspections = list(db["inspections"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"inspections": inspections, "total": len(inspections)}


# ── Vendor/Contractor Management ──

@router.get("/contractors")
async def list_contractors():
    """List maintenance vendors/contractors."""
    contractors = list(db["engineering_contractors"].find({}, {"_id": 0}).limit(50))
    if not contractors:
        # Seed sample contractors
        samples = [
            {"name": "HVAC Pro Services", "specialty": "hvac", "phone": "305-555-0101", "emergency_available": True, "hourly_rate": 125},
            {"name": "Elite Elevator Corp", "specialty": "elevator", "phone": "305-555-0102", "emergency_available": True, "hourly_rate": 175},
            {"name": "Miami Fire Safety Inc", "specialty": "fire_safety", "phone": "305-555-0103", "emergency_available": False, "hourly_rate": 95},
            {"name": "Coastal Plumbing", "specialty": "plumbing", "phone": "305-555-0104", "emergency_available": True, "hourly_rate": 110},
            {"name": "PowerGrid Electric", "specialty": "electrical", "phone": "305-555-0105", "emergency_available": True, "hourly_rate": 135},
            {"name": "Pool Masters LLC", "specialty": "pool", "phone": "305-555-0106", "emergency_available": False, "hourly_rate": 85},
        ]
        for s in samples:
            s["contractor_id"] = f"CTR-{_uid()}"
            s["active"] = True
            s["created_at"] = _now()
        db["engineering_contractors"].insert_many(samples)
        contractors = samples

    return {"contractors": [{k: v for k, v in c.items() if k != "_id"} for c in contractors], "total": len(contractors)}
