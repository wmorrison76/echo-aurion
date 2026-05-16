"""
Engineering Work Tickets & Staff Schedule Manager
===================================================
- Work ticket CRUD with priority, classification, assignment
- Staff schedule by trade classification (Painter, HVAC, Electrician, Plumber, etc.)
- Operations Hub for guest requests + task dispatch
- Integration hooks for future 3rd party connections (hospitality ops platforms)
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/engineering-ops", tags=["engineering-ops"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

TRADE_CLASSIFICATIONS = [
    {"id": "hvac", "label": "HVAC Technician", "color": "#3b82f6"},
    {"id": "electrician", "label": "Electrician", "color": "#f59e0b"},
    {"id": "plumber", "label": "Plumber", "color": "#06b6d4"},
    {"id": "painter", "label": "Painter", "color": "#8b5cf6"},
    {"id": "carpenter", "label": "Carpenter", "color": "#10b981"},
    {"id": "general", "label": "General Maintenance", "color": "#64748b"},
    {"id": "pool", "label": "Pool Technician", "color": "#0ea5e9"},
    {"id": "landscaping", "label": "Landscaping", "color": "#22c55e"},
    {"id": "fire-safety", "label": "Fire Safety", "color": "#ef4444"},
    {"id": "elevator", "label": "Elevator Technician", "color": "#a855f7"},
]

# ── Models ──
class WorkTicketInput(BaseModel):
    title: str
    description: str = ""
    priority: str = "medium"  # critical, high, medium, low
    trade: str = "general"
    location: str = ""
    room_number: str = ""
    assigned_to: Optional[str] = None
    requested_by: str = "system"
    category: str = "repair"  # repair, preventive, inspection, guest-request, emergency

class StaffMemberInput(BaseModel):
    name: str
    trade: str
    email: str = ""
    phone: str = ""
    shift: str = "day"  # day, evening, night
    status: str = "active"  # active, off-duty, vacation, sick

class GuestRequestInput(BaseModel):
    guest_name: str
    room_number: str
    request_type: str  # maintenance, housekeeping, amenity, concierge
    description: str
    priority: str = "normal"  # urgent, normal, low
    department: str = "engineering"

# ── Seed ──
def seed_engineering_ops():
    if db["eng_staff"].count_documents({}) > 0:
        return
    staff = [
        {"name": "Carlos Rivera", "trade": "hvac", "shift": "day", "email": "carlos@resort.com", "phone": "555-0201"},
        {"name": "Mike Johnson", "trade": "electrician", "shift": "day", "email": "mike.j@resort.com", "phone": "555-0202"},
        {"name": "Tom Williams", "trade": "plumber", "shift": "day", "email": "tom.w@resort.com", "phone": "555-0203"},
        {"name": "Kevin Brown", "trade": "painter", "shift": "day", "email": "kevin.b@resort.com", "phone": "555-0204"},
        {"name": "James Lee", "trade": "carpenter", "shift": "day", "email": "james.l@resort.com", "phone": "555-0205"},
        {"name": "Ahmed Hassan", "trade": "general", "shift": "day", "email": "ahmed@resort.com", "phone": "555-0206"},
        {"name": "Luis Garcia", "trade": "pool", "shift": "day", "email": "luis.g@resort.com", "phone": "555-0207"},
        {"name": "Robert Davis", "trade": "hvac", "shift": "evening", "email": "rob.d@resort.com", "phone": "555-0208"},
        {"name": "John Smith", "trade": "electrician", "shift": "evening", "email": "john.s@resort.com", "phone": "555-0209"},
        {"name": "Steve Park", "trade": "general", "shift": "night", "email": "steve.p@resort.com", "phone": "555-0210"},
    ]
    for s in staff:
        db["eng_staff"].insert_one({"id": f"eng-{_uid()}", **s, "status": "active", "created_at": _now()})

    # Seed work tickets
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    staff_list = list(db["eng_staff"].find({}, {"_id": 0}))
    tickets = [
        {"title": "AC unit not cooling — Room 412", "priority": "critical", "trade": "hvac", "location": "Floor 4", "room_number": "412", "category": "repair", "status": "in_progress"},
        {"title": "Leaking faucet — Room 305", "priority": "high", "trade": "plumber", "location": "Floor 3", "room_number": "305", "category": "repair", "status": "open"},
        {"title": "Touch-up paint — Lobby corridor", "priority": "low", "trade": "painter", "location": "Lobby", "room_number": "", "category": "repair", "status": "open"},
        {"title": "Quarterly fire alarm test", "priority": "high", "trade": "fire-safety", "location": "All floors", "room_number": "", "category": "inspection", "status": "scheduled"},
        {"title": "Pool filter replacement", "priority": "medium", "trade": "pool", "location": "Pool Deck", "room_number": "", "category": "preventive", "status": "open"},
        {"title": "Elevator #2 annual inspection", "priority": "high", "trade": "elevator", "location": "Elevator shaft", "room_number": "", "category": "inspection", "status": "scheduled"},
        {"title": "Guest request — extra towel rack", "priority": "low", "trade": "carpenter", "location": "Floor 5", "room_number": "518", "category": "guest-request", "status": "open"},
        {"title": "Emergency generator test", "priority": "critical", "trade": "electrician", "location": "Basement", "room_number": "", "category": "preventive", "status": "in_progress"},
    ]
    for i, t in enumerate(tickets):
        assigned = staff_list[i % len(staff_list)] if staff_list else None
        db["eng_work_tickets"].insert_one({
            "id": f"wt-{_uid()}", **t, "description": t.get("title", ""),
            "assigned_to": assigned["id"] if assigned else None,
            "assigned_name": assigned["name"] if assigned else "Unassigned",
            "requested_by": "system", "created_at": _now(), "date": today,
            "estimated_hours": 1 + (i % 4), "actual_hours": 0,
        })


# ── Dashboard ──
@router.get("/dashboard")
async def eng_ops_dashboard():
    seed_engineering_ops()
    tickets = list(db["eng_work_tickets"].find({}, {"_id": 0}))
    staff = list(db["eng_staff"].find({}, {"_id": 0}))

    by_status = defaultdict(int)
    by_priority = defaultdict(int)
    by_trade = defaultdict(int)
    for t in tickets:
        by_status[t.get("status", "unknown")] += 1
        by_priority[t.get("priority", "medium")] += 1
        by_trade[t.get("trade", "general")] += 1

    return {
        "kpis": {
            "total_tickets": len(tickets),
            "open": by_status.get("open", 0),
            "in_progress": by_status.get("in_progress", 0),
            "completed": by_status.get("completed", 0),
            "scheduled": by_status.get("scheduled", 0),
            "critical": by_priority.get("critical", 0),
            "total_staff": len(staff),
            "active_staff": len([s for s in staff if s.get("status") == "active"]),
        },
        "by_status": dict(by_status),
        "by_priority": dict(by_priority),
        "by_trade": dict(by_trade),
        "recent_tickets": sorted(tickets, key=lambda t: t.get("created_at", ""), reverse=True)[:10],
        "trade_classifications": TRADE_CLASSIFICATIONS,
    }


# ── Work Tickets CRUD ──
@router.get("/tickets")
async def list_tickets(status: Optional[str] = None, priority: Optional[str] = None, trade: Optional[str] = None):
    seed_engineering_ops()
    q = {}
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    if trade:
        q["trade"] = trade
    tickets = list(db["eng_work_tickets"].find(q, {"_id": 0}).sort("created_at", -1))
    return {"tickets": tickets, "total": len(tickets)}

@router.post("/tickets")
async def create_ticket(data: WorkTicketInput):
    seed_engineering_ops()
    assigned_name = "Unassigned"
    if data.assigned_to:
        s = db["eng_staff"].find_one({"id": data.assigned_to}, {"_id": 0})
        if s:
            assigned_name = s["name"]
    doc = {
        "id": f"wt-{_uid()}", **data.model_dump(), "status": "open",
        "assigned_name": assigned_name, "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "estimated_hours": 2, "actual_hours": 0, "created_at": _now(),
    }
    db["eng_work_tickets"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, status: str = Query(...)):
    result = db["eng_work_tickets"].update_one({"id": ticket_id}, {"$set": {"status": status, "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Ticket not found")
    return {"updated": ticket_id, "status": status}

@router.put("/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, staff_id: str = Query(...)):
    s = db["eng_staff"].find_one({"id": staff_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Staff not found")
    db["eng_work_tickets"].update_one({"id": ticket_id}, {"$set": {"assigned_to": staff_id, "assigned_name": s["name"], "updated_at": _now()}})
    return {"updated": ticket_id, "assigned_to": s["name"]}


# ── Staff Schedule ──
@router.get("/staff")
async def list_staff(trade: Optional[str] = None, shift: Optional[str] = None):
    seed_engineering_ops()
    q = {}
    if trade:
        q["trade"] = trade
    if shift:
        q["shift"] = shift
    return {"staff": list(db["eng_staff"].find(q, {"_id": 0})), "trades": TRADE_CLASSIFICATIONS}

@router.post("/staff")
async def add_staff(data: StaffMemberInput):
    doc = {"id": f"eng-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["eng_staff"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, data: StaffMemberInput):
    result = db["eng_staff"].update_one({"id": staff_id}, {"$set": {**data.model_dump(), "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Staff not found")
    return db["eng_staff"].find_one({"id": staff_id}, {"_id": 0})


# ── Operations Hub: Guest Request Tracking ──
@router.get("/guest-requests")
async def list_guest_requests(status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    reqs = list(db["guest_requests"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"requests": reqs, "total": len(reqs)}

@router.post("/guest-requests")
async def create_guest_request(data: GuestRequestInput):
    doc = {
        "id": f"gr-{_uid()}", **data.model_dump(), "status": "open",
        "assigned_to": None, "assigned_department": data.department,
        "response_time_mins": None, "resolution_time_mins": None,
        "created_at": _now(),
    }
    db["guest_requests"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/guest-requests/{request_id}/dispatch")
async def dispatch_guest_request(request_id: str, department: str = Query(...), assigned_to: Optional[str] = None):
    update = {"assigned_department": department, "status": "dispatched", "updated_at": _now()}
    if assigned_to:
        update["assigned_to"] = assigned_to
    result = db["guest_requests"].update_one({"id": request_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Request not found")
    return {"dispatched": request_id, "department": department}

@router.put("/guest-requests/{request_id}/resolve")
async def resolve_guest_request(request_id: str):
    req = db["guest_requests"].find_one({"id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Request not found")
    created = req.get("created_at", "")
    try:
        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        resolution_mins = round((datetime.now(timezone.utc) - created_dt).total_seconds() / 60, 1)
    except (ValueError, TypeError):
        resolution_mins = 0
    db["guest_requests"].update_one({"id": request_id}, {"$set": {"status": "resolved", "resolution_time_mins": resolution_mins, "updated_at": _now()}})
    return {"resolved": request_id, "resolution_time_mins": resolution_mins}


# ── Integration Hooks (Future 3rd Party) ──
@router.get("/integrations")
async def list_integrations():
    """List available 3rd party integration connectors."""
    return {
        "integrations": [
            {"id": "ops-platform", "name": "Operations Platform", "status": "available", "description": "Hotel operations platform — guest requests, task dispatch, team messaging", "config_url": "#", "connected": False},
            {"id": "quore", "name": "Quore", "status": "available", "description": "Hotel operations management — work orders, inspections, preventive maintenance", "config_url": "https://quore.com/", "connected": False},
            {"id": "hotsos", "name": "HotSOS (Amadeus)", "status": "available", "description": "Service optimization — guest requests, dispatch, analytics", "config_url": "https://www.amadeus-hospitality.com/", "connected": False},
            {"id": "flexkeeping", "name": "Flexkeeping", "status": "available", "description": "Housekeeping & maintenance operations", "config_url": "https://flexkeeping.com/", "connected": False},
        ],
        "note": "Configure API keys in Settings to connect. All integrations support webhook-based two-way sync."
    }
