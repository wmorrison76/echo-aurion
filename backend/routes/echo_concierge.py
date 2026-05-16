"""
Echo Concierge — Guest Issue Tracker + Service Recovery
=========================================================
Guest-facing: report issues with photos (room, restaurant, spa, facility)
Staff-facing: ticket tracking, department routing, SLA timers, follow-up enforcement
Service recovery: cost tracking, resolution workflow, guest satisfaction
Kitchen/outlet repair tracking with room numbers
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from database import db
import os, base64

router = APIRouter(prefix="/api/concierge", tags=["echo-concierge"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

ISSUE_CATEGORIES = [
    {"id": "room", "label": "Room Issue", "department": "housekeeping", "icon": "bed", "sla_mins": 30},
    {"id": "maintenance", "label": "Maintenance/Repair", "department": "engineering", "icon": "wrench", "sla_mins": 60},
    {"id": "restaurant", "label": "Restaurant Service", "department": "foh", "icon": "utensils", "sla_mins": 15},
    {"id": "kitchen", "label": "Kitchen/Food Quality", "department": "culinary", "icon": "chef-hat", "sla_mins": 20},
    {"id": "spa", "label": "Spa & Wellness", "department": "spa", "icon": "sparkles", "sla_mins": 20},
    {"id": "facility", "label": "Facility/Common Area", "department": "engineering", "icon": "building", "sla_mins": 45},
    {"id": "noise", "label": "Noise Complaint", "department": "security", "icon": "volume", "sla_mins": 15},
    {"id": "billing", "label": "Billing Issue", "department": "front-desk", "icon": "credit-card", "sla_mins": 30},
    {"id": "amenity", "label": "Missing Amenity", "department": "housekeeping", "icon": "package", "sla_mins": 20},
    {"id": "equipment", "label": "Kitchen Equipment", "department": "engineering", "icon": "settings", "sla_mins": 45},
    {"id": "other", "label": "Other", "department": "front-desk", "icon": "message", "sla_mins": 60},
]

PRIORITY_SLA = {"critical": 15, "high": 30, "medium": 60, "low": 120}

KITCHEN_EQUIPMENT = [
    {"equipment_id": "eq-combi-oven-1", "name": "Combi Oven #1 (Rational)", "outlet_id": "out-main-kitchen", "type": "cooking", "make": "Rational", "model": "SCC 202", "location": "Hot Line"},
    {"equipment_id": "eq-combi-oven-2", "name": "Combi Oven #2 (Rational)", "outlet_id": "out-main-kitchen", "type": "cooking", "make": "Rational", "model": "SCC 102", "location": "Hot Line"},
    {"equipment_id": "eq-flat-grill", "name": "Flat Top Griddle", "outlet_id": "out-main-kitchen", "type": "cooking", "make": "Vulcan", "model": "MSA36", "location": "Hot Line"},
    {"equipment_id": "eq-charbroiler", "name": "Charbroiler Grill", "outlet_id": "out-main-kitchen", "type": "cooking", "make": "Montague", "model": "C36", "location": "Hot Line"},
    {"equipment_id": "eq-fryer-bank", "name": "Deep Fryer Bank (3-well)", "outlet_id": "out-main-kitchen", "type": "cooking", "make": "Pitco", "model": "SSH55", "location": "Fry Station"},
    {"equipment_id": "eq-walk-in-cooler", "name": "Walk-In Cooler", "outlet_id": "out-main-kitchen", "type": "refrigeration", "make": "Kolpak", "model": "P7-0810-CT", "location": "Cold Storage"},
    {"equipment_id": "eq-walk-in-freezer", "name": "Walk-In Freezer", "outlet_id": "out-main-kitchen", "type": "refrigeration", "make": "Kolpak", "model": "P7-0610-FS", "location": "Cold Storage"},
    {"equipment_id": "eq-reach-in-1", "name": "Reach-In Refrigerator (Prep)", "outlet_id": "out-main-kitchen", "type": "refrigeration", "make": "True", "model": "T-49", "location": "Prep Area"},
    {"equipment_id": "eq-lowboy-1", "name": "Lowboy Under-Counter Fridge", "outlet_id": "out-main-kitchen", "type": "refrigeration", "make": "True", "model": "TUC-48", "location": "Hot Line"},
    {"equipment_id": "eq-dishwasher", "name": "Commercial Dishwasher", "outlet_id": "out-main-kitchen", "type": "warewashing", "make": "Hobart", "model": "AM15", "location": "Dish Pit"},
    {"equipment_id": "eq-ice-machine", "name": "Ice Machine", "outlet_id": "out-main-kitchen", "type": "refrigeration", "make": "Manitowoc", "model": "IYT0500A", "location": "Service Area"},
    {"equipment_id": "eq-mixer-1", "name": "60-Qt Floor Mixer", "outlet_id": "out-pastry-shop", "type": "prep", "make": "Hobart", "model": "HL600", "location": "Mixing Station"},
    {"equipment_id": "eq-sheeter", "name": "Dough Sheeter", "outlet_id": "out-pastry-shop", "type": "prep", "make": "Rondo", "model": "Econom", "location": "Lamination Area"},
    {"equipment_id": "eq-deck-oven", "name": "Deck Oven (3-tier)", "outlet_id": "out-pastry-shop", "type": "cooking", "make": "Bongard", "model": "Cervap", "location": "Bake Station"},
    {"equipment_id": "eq-blast-chiller", "name": "Blast Chiller/Freezer", "outlet_id": "out-pastry-shop", "type": "refrigeration", "make": "Irinox", "model": "MF 70.2", "location": "Pastry Cold"},
    {"equipment_id": "eq-tempering-machine", "name": "Chocolate Tempering Machine", "outlet_id": "out-pastry-shop", "type": "prep", "make": "ChocoVision", "model": "Revolation Delta", "location": "Chocolate Station"},
    {"equipment_id": "eq-salamander", "name": "Salamander Broiler", "outlet_id": "out-pier66-rest", "type": "cooking", "make": "Garland", "model": "SER-300", "location": "Expo Line"},
    {"equipment_id": "eq-sushi-case", "name": "Sushi Display Case", "outlet_id": "out-pier66-rest", "type": "refrigeration", "make": "Hoshizaki", "model": "HNC-180BA", "location": "Sushi Bar"},
    {"equipment_id": "eq-espresso", "name": "Espresso Machine", "outlet_id": "out-pier66-rest", "type": "beverage", "make": "La Marzocco", "model": "Linea PB", "location": "Beverage Station"},
    {"equipment_id": "eq-draft-system", "name": "Draft Beer System (12-tap)", "outlet_id": "out-rooftop-bar", "type": "beverage", "make": "Perlick", "model": "69036-D12", "location": "Bar"},
    {"equipment_id": "eq-undercounter-fridge-bar", "name": "Under-Counter Glass Frosters", "outlet_id": "out-rooftop-bar", "type": "refrigeration", "make": "True", "model": "TBB-24-48G", "location": "Bar"},
    {"equipment_id": "eq-pool-grill", "name": "Outdoor Gas Grill", "outlet_id": "out-pool-bar", "type": "cooking", "make": "Crown Verity", "model": "CV-MCB-72", "location": "Pool Deck"},
    {"equipment_id": "eq-heat-lamp-bqt", "name": "Heat Lamp Carving Station (x4)", "outlet_id": "out-banquet-hall", "type": "serving", "make": "Hatco", "model": "GR2BW-42", "location": "Staging Area"},
    {"equipment_id": "eq-hot-box-bqt", "name": "Hot Box / Holding Cabinet", "outlet_id": "out-banquet-hall", "type": "serving", "make": "Alto-Shaam", "model": "1000-UP", "location": "Staging Area"},
]


def _seed_equipment():
    if db["kitchen_equipment"].count_documents({}) > 0:
        return
    for eq in KITCHEN_EQUIPMENT:
        db["kitchen_equipment"].insert_one({**eq, "status": "operational", "last_service": None, "created_at": _now()})


class IssueInput(BaseModel):
    guest_name: str = ""
    room_number: str = ""
    outlet_id: str = ""
    category: str = "other"
    priority: str = "medium"
    title: str
    description: str = ""
    photos: List[str] = []  # base64 or URLs
    reported_by: str = "guest"  # guest, staff, system
    reporter_id: str = ""
    equipment_id: str = ""
    equipment_name: str = ""

class RecoveryAction(BaseModel):
    action_type: str  # comp, discount, upgrade, apology, replacement, refund, other
    description: str
    cost: float = 0
    approved_by: str = ""

class FollowUpInput(BaseModel):
    note: str
    action_taken: str = ""
    staff_id: str = ""
    staff_name: str = ""


def seed_concierge():
    if db["concierge_tickets"].count_documents({}) > 0:
        return
    # Ensure outlets exist (pull from admin onboarding seed)
    if db["outlets"].count_documents({}) == 0:
        from routes.admin_onboarding import _seed_outlets
        _seed_outlets()
    # Seed equipment if not present
    _seed_equipment()
    now = _now()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tickets = [
        {"title": "AC not cooling in room", "category": "maintenance", "room_number": "412", "priority": "critical", "guest_name": "Mr. Wellington", "description": "AC blowing warm air since check-in", "status": "in_progress", "department": "engineering", "photos": []},
        {"title": "Stained bedsheets", "category": "room", "room_number": "305", "priority": "high", "guest_name": "Ms. Chen", "description": "Found stain on pillowcase", "status": "open", "department": "housekeeping", "photos": []},
        {"title": "Slow service at dinner", "category": "restaurant", "room_number": "518", "priority": "medium", "guest_name": "Davis Family", "description": "Waited 45 minutes for entrees at main dining", "outlet_id": "main-dining", "status": "resolved", "department": "foh", "recovery": [{"action_type": "comp", "description": "Complimentary dessert course", "cost": 45}]},
        {"title": "Broken showerhead", "category": "maintenance", "room_number": "220", "priority": "high", "guest_name": "Mr. Park", "description": "Showerhead detached from wall mount", "status": "open", "department": "engineering", "photos": []},
        {"title": "Missing towels", "category": "amenity", "room_number": "612", "priority": "low", "guest_name": "Johnson Party", "description": "Requested extra towels 2 hours ago", "status": "dispatched", "department": "housekeeping", "photos": []},
        {"title": "Cold soup served", "category": "kitchen", "room_number": "", "priority": "medium", "guest_name": "Walk-in guest", "description": "French onion soup served lukewarm at Sky Bar", "outlet_id": "sky-bar", "status": "open", "department": "culinary", "photos": []},
        {"title": "Noisy neighbors", "category": "noise", "room_number": "410", "priority": "medium", "guest_name": "Ms. Volkov", "description": "Music from room 411 after midnight", "status": "resolved", "department": "security", "photos": []},
    ]
    for t in tickets:
        recovery = t.pop("recovery", [])
        outlet = t.pop("outlet_id", "")
        cat_info = next((c for c in ISSUE_CATEGORIES if c["id"] == t["category"]), ISSUE_CATEGORIES[-1])
        sla_mins = PRIORITY_SLA.get(t["priority"], 60)
        doc = {
            "id": f"tc-{_uid()}", **t, "outlet_id": outlet,
            "reported_by": "guest", "reporter_id": "",
            "sla_mins": sla_mins, "sla_deadline": (datetime.now(timezone.utc) + timedelta(minutes=sla_mins)).isoformat(),
            "assigned_to": None, "assigned_name": None,
            "follow_ups": [], "recovery_actions": recovery,
            "recovery_cost": sum(r.get("cost", 0) for r in recovery),
            "satisfaction_score": None, "resolved_at": None,
            "created_at": now, "date": today,
        }
        db["concierge_tickets"].insert_one(doc)


# ── Outlets & Equipment ──

@router.get("/outlets")
async def concierge_outlets():
    """Return populated outlet/location list for ticket creation."""
    # Ensure outlets exist (from onboarding + equipment-linked outlets)
    if db["outlets"].count_documents({}) == 0:
        from routes.admin_onboarding import _seed_outlets
        _seed_outlets()
    # Also ensure equipment-linked outlets exist
    _ensure_equipment_outlets()
    outlets = list(db["outlets"].find({}, {"_id": 0, "outlet_id": 1, "name": 1, "type": 1, "location": 1}).sort("name", 1))
    return {"outlets": outlets}


def _ensure_equipment_outlets():
    """Ensure all equipment-referenced outlets exist in the outlets collection."""
    eq_outlets = {
        "out-main-kitchen": {"name": "Main Kitchen", "type": "kitchen", "location": "Level 1, Building A"},
        "out-pastry-shop": {"name": "Pastry Shop", "type": "kitchen", "location": "Level 1, Building A"},
        "out-pier66-rest": {"name": "Marina Grill", "type": "restaurant", "location": "Pier Level, Building B"},
        "out-rooftop-bar": {"name": "Rooftop Bar & Lounge", "type": "bar", "location": "Level 12, Building B"},
        "out-banquet-hall": {"name": "Grand Banquet Hall", "type": "banquet", "location": "Level 2, Convention Center"},
        "out-pool-bar": {"name": "Pool Bar & Grill", "type": "bar", "location": "Pool Deck, Building C"},
    }
    for oid, info in eq_outlets.items():
        if db["outlets"].count_documents({"outlet_id": oid}) == 0:
            db["outlets"].insert_one({"outlet_id": oid, **info, "active": True, "created_at": _now()})



@router.get("/equipment")
async def concierge_equipment(outlet_id: Optional[str] = None):
    """Return kitchen equipment list, optionally filtered by outlet."""
    _seed_equipment()
    q: dict = {}
    if outlet_id:
        q["outlet_id"] = outlet_id
    equipment = list(db["kitchen_equipment"].find(q, {"_id": 0}).sort("name", 1))
    return {"equipment": equipment, "total": len(equipment)}


# ── Dashboard ──
@router.get("/dashboard")
async def concierge_dashboard():
    seed_concierge()
    tickets = list(db["concierge_tickets"].find({}, {"_id": 0}))
    now = datetime.now(timezone.utc)

    by_status = defaultdict(int)
    by_category = defaultdict(int)
    by_dept = defaultdict(int)
    by_priority = defaultdict(int)
    total_recovery = 0
    sla_breaches = 0

    for t in tickets:
        by_status[t.get("status", "open")] += 1
        by_category[t.get("category", "other")] += 1
        by_dept[t.get("department", "other")] += 1
        by_priority[t.get("priority", "medium")] += 1
        total_recovery += t.get("recovery_cost", 0)
        if t.get("status") not in ("resolved", "closed"):
            deadline = t.get("sla_deadline", "")
            if deadline:
                try:
                    dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                    if now > dl:
                        sla_breaches += 1
                except (ValueError, TypeError):
                    pass

    active = by_status.get("open", 0) + by_status.get("in_progress", 0) + by_status.get("dispatched", 0)

    return {
        "kpis": {
            "total_tickets": len(tickets),
            "active": active,
            "resolved": by_status.get("resolved", 0),
            "sla_breaches": sla_breaches,
            "total_recovery_cost": round(total_recovery, 2),
            "avg_recovery": round(total_recovery / max(by_status.get("resolved", 0), 1), 2),
        },
        "by_status": dict(by_status),
        "by_category": [{"category": c, "count": n, "label": next((cat["label"] for cat in ISSUE_CATEGORIES if cat["id"] == c), c)} for c, n in sorted(by_category.items(), key=lambda x: x[1], reverse=True)],
        "by_department": dict(by_dept),
        "by_priority": dict(by_priority),
        "recent": sorted(tickets, key=lambda t: t.get("created_at", ""), reverse=True)[:10],
        "categories": ISSUE_CATEGORIES,
    }


# ── Tickets CRUD ──
@router.get("/tickets")
async def list_tickets(status: Optional[str] = None, category: Optional[str] = None, department: Optional[str] = None, room: Optional[str] = None, priority: Optional[str] = None):
    seed_concierge()
    q = {}
    if status: q["status"] = status
    if category: q["category"] = category
    if department: q["department"] = department
    if room: q["room_number"] = room
    if priority: q["priority"] = priority
    tickets = list(db["concierge_tickets"].find(q, {"_id": 0}).sort("created_at", -1))
    return {"tickets": tickets, "total": len(tickets)}

@router.post("/tickets")
async def create_ticket(data: IssueInput):
    seed_concierge()
    cat_info = next((c for c in ISSUE_CATEGORIES if c["id"] == data.category), ISSUE_CATEGORIES[-1])
    sla_mins = PRIORITY_SLA.get(data.priority, 60)
    doc = {
        "id": f"tc-{_uid()}", **data.model_dump(),
        "status": "open", "department": cat_info["department"],
        "sla_mins": sla_mins,
        "sla_deadline": (datetime.now(timezone.utc) + timedelta(minutes=sla_mins)).isoformat(),
        "assigned_to": None, "assigned_name": None,
        "follow_ups": [], "recovery_actions": [], "recovery_cost": 0,
        "satisfaction_score": None, "resolved_at": None,
        "created_at": _now(), "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    db["concierge_tickets"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    t = db["concierge_tickets"].find_one({"id": ticket_id}, {"_id": 0})
    if not t: raise HTTPException(404, "Ticket not found")
    return t

@router.put("/tickets/{ticket_id}/status")
async def update_status(ticket_id: str, status: str = Query(...)):
    update = {"status": status, "updated_at": _now()}
    if status == "resolved":
        update["resolved_at"] = _now()
    result = db["concierge_tickets"].update_one({"id": ticket_id}, {"$set": update})
    if result.matched_count == 0: raise HTTPException(404, "Ticket not found")
    return {"updated": ticket_id, "status": status}

@router.put("/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, staff_id: str = Query(""), staff_name: str = Query(""), department: Optional[str] = None):
    update: dict = {"assigned_to": staff_id, "assigned_name": staff_name, "status": "dispatched", "updated_at": _now()}
    if department: update["department"] = department
    db["concierge_tickets"].update_one({"id": ticket_id}, {"$set": update})
    return {"assigned": ticket_id, "to": staff_name}

@router.post("/tickets/{ticket_id}/follow-up")
async def add_follow_up(ticket_id: str, data: FollowUpInput):
    fu = {"id": f"fu-{_uid()}", **data.model_dump(), "timestamp": _now()}
    db["concierge_tickets"].update_one({"id": ticket_id}, {"$push": {"follow_ups": fu}})
    return fu

@router.post("/tickets/{ticket_id}/recovery")
async def add_recovery(ticket_id: str, data: RecoveryAction):
    ra = {"id": f"ra-{_uid()}", **data.model_dump(), "timestamp": _now()}
    db["concierge_tickets"].update_one({"id": ticket_id}, {"$push": {"recovery_actions": ra}, "$inc": {"recovery_cost": data.cost}})
    return ra

@router.put("/tickets/{ticket_id}/satisfaction")
async def rate_satisfaction(ticket_id: str, score: int = Query(..., ge=1, le=5)):
    db["concierge_tickets"].update_one({"id": ticket_id}, {"$set": {"satisfaction_score": score, "updated_at": _now()}})
    return {"ticket": ticket_id, "satisfaction": score}

@router.post("/tickets/{ticket_id}/photo")
async def add_photo_url(ticket_id: str, photo_url: str = Query(...)):
    db["concierge_tickets"].update_one({"id": ticket_id}, {"$push": {"photos": photo_url}})
    return {"added": photo_url}


@router.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...)):
    """Upload a photo for ticket attachment. Returns the URL to the uploaded file."""
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "concierge")
    os.makedirs(upload_dir, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"photo-{_uid()}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/api/concierge/photos/{filename}"
    return {"url": url, "filename": filename, "size": len(content)}


@router.get("/photos/{filename}")
async def serve_photo(filename: str):
    """Serve uploaded concierge photos."""
    from fastapi.responses import FileResponse
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "concierge")
    filepath = os.path.join(upload_dir, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(404, "Photo not found")
    return FileResponse(filepath)


# ── Analytics ──
@router.get("/analytics")
async def concierge_analytics():
    seed_concierge()
    tickets = list(db["concierge_tickets"].find({}, {"_id": 0}))

    by_room = defaultdict(int)
    recovery_by_type = defaultdict(lambda: {"count": 0, "total_cost": 0})
    daily_count = defaultdict(int)

    for t in tickets:
        rm = t.get("room_number", "")
        if rm: by_room[rm] += 1
        for r in t.get("recovery_actions", []):
            rt = r.get("action_type", "other")
            recovery_by_type[rt]["count"] += 1
            recovery_by_type[rt]["total_cost"] += r.get("cost", 0)
        daily_count[t.get("date", "")] += 1

    room_hotspots = [{"room": r, "issues": c} for r, c in sorted(by_room.items(), key=lambda x: x[1], reverse=True)[:10]]
    recovery_breakdown = [{"type": t, "count": d["count"], "cost": round(d["total_cost"], 2)} for t, d in sorted(recovery_by_type.items(), key=lambda x: x[1]["total_cost"], reverse=True)]
    trend = [{"date": d, "count": c} for d, c in sorted(daily_count.items())[-14:]]

    total_recovery = sum(d["total_cost"] for d in recovery_by_type.values())
    resolved_with_score = [t for t in tickets if t.get("satisfaction_score")]
    avg_satisfaction = round(sum(t["satisfaction_score"] for t in resolved_with_score) / max(len(resolved_with_score), 1), 1)

    return {
        "total_tickets": len(tickets),
        "total_recovery_cost": round(total_recovery, 2),
        "avg_satisfaction": avg_satisfaction,
        "room_hotspots": room_hotspots,
        "recovery_breakdown": recovery_breakdown,
        "daily_trend": trend,
    }


# ── Guest-facing report (no auth) ──
@router.post("/guest-report")
async def guest_report_issue(data: IssueInput):
    """Public endpoint for guests to report issues (from room tablet/mobile)."""
    data.reported_by = "guest"
    return await create_ticket(data)



# ── Shift Log ──

class ShiftLogEntry(BaseModel):
    author: str
    role: str = "MOD"
    shift: str = "AM"  # AM, PM, Night
    notes: str
    handoff_items: List[str] = []
    vip_alerts: List[str] = []
    open_issues: List[str] = []

@router.get("/shift-log")
async def get_shift_logs(limit: int = 10):
    """Get recent shift log entries."""
    logs = list(db["shift_logs"].find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"logs": logs}

@router.post("/shift-log")
async def create_shift_log(data: ShiftLogEntry):
    """Create a new shift log entry for handoff."""
    # Auto-populate open issues from current tickets
    open_tickets = list(db["concierge_tickets"].find({"status": {"$in": ["open", "in_progress", "dispatched"]}}, {"_id": 0, "id": 1, "title": 1, "room_number": 1, "priority": 1}).limit(20))

    entry = {
        "id": f"sl-{_uid()}",
        **data.model_dump(),
        "auto_open_tickets": [{"id": t["id"], "title": t.get("title",""), "room": t.get("room_number",""), "priority": t.get("priority","")} for t in open_tickets],
        "created_at": _now(),
    }
    db["shift_logs"].insert_one(entry)
    entry.pop("_id", None)
    return entry


# ── Saved Filters ──

@router.get("/saved-filters")
async def get_saved_filters():
    """Get all saved ticket filters."""
    filters = list(db["concierge_saved_filters"].find({}, {"_id": 0}).sort("sort_order", 1))
    if not filters:
        # Seed default saved filters
        defaults = [
            {"id": f"sf-{_uid()}", "name": "Guest Requests", "icon": "📋", "filters": {"category": {"$in": ["room", "amenity", "billing", "noise"]}}, "sort_order": 1},
            {"id": f"sf-{_uid()}", "name": "Maintenance", "icon": "🔧", "filters": {"category": "maintenance"}, "sort_order": 2},
            {"id": f"sf-{_uid()}", "name": "Housekeeping", "icon": "🏨", "filters": {"department": "housekeeping"}, "sort_order": 3},
            {"id": f"sf-{_uid()}", "name": "Critical & High", "icon": "🔴", "filters": {"priority": {"$in": ["critical", "high"]}}, "sort_order": 4},
            {"id": f"sf-{_uid()}", "name": "Open Issues", "icon": "⚠", "filters": {"status": "open"}, "sort_order": 5},
            {"id": f"sf-{_uid()}", "name": "Recovery Actions", "icon": "💰", "filters": {"recovery_cost": {"$gt": 0}}, "sort_order": 6},
            {"id": f"sf-{_uid()}", "name": "SPA Issues", "icon": "💆", "filters": {"category": "spa"}, "sort_order": 7},
            {"id": f"sf-{_uid()}", "name": "F&B Complaints", "icon": "🍽", "filters": {"category": {"$in": ["restaurant", "kitchen"]}}, "sort_order": 8},
        ]
        for f in defaults:
            db["concierge_saved_filters"].insert_one({**f, "created_at": _now()})
        filters = defaults
    return {"filters": filters}
