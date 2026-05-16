"""
Onboarding Wizard & Guest Spa Booking
=======================================
- Role-based onboarding wizard (tracks completion per user)
- Public guest-facing spa booking (no auth required)
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/onboarding-wizard", tags=["onboarding-wizard"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# Role-based tour steps
TOUR_STEPS = {
    "owner": [
        {"step": 1, "title": "Welcome to LUCCCA", "description": "Your enterprise hospitality command center. Start with the Dashboard to see real-time performance across all outlets.", "highlight": "maestro-dashboard", "group": "dashboard"},
        {"step": 2, "title": "Analytics BI", "description": "Click Analytics BI in the sidebar to access 17 enterprise-class reports — from sales heatmaps to AI revenue forecasts.", "highlight": "analytics-engine", "group": "ai_integrations"},
        {"step": 3, "title": "Integration Hub", "description": "Connect your POS (Toast), GL (QuickBooks), and email (SendGrid) systems from the Integration Hub under AI & Integrations.", "highlight": "integration-control", "group": "ai_integrations"},
    ],
    "admin": [
        {"step": 1, "title": "Admin Command Center", "description": "Manage users, roles, properties, and system settings from Admin & Onboarding under HR & Administration.", "highlight": "admin-command", "group": "hr_admin"},
        {"step": 2, "title": "Dashboard Overview", "description": "Monitor all KPIs in real-time from the LUCCCA Dashboard — revenue, labor cost, events, and AI forecast accuracy.", "highlight": "maestro-dashboard", "group": "dashboard"},
        {"step": 3, "title": "Integration Hub", "description": "Configure Toast POS, QuickBooks, and email delivery from the unified Integration Hub.", "highlight": "integration-control", "group": "ai_integrations"},
    ],
    "exec_chef": [
        {"step": 1, "title": "Your Kitchen Command", "description": "Open Culinary Operations to access your menu engineering, plate costing, waste tracking, and recipe management.", "highlight": "culinary", "group": "culinary_ops"},
        {"step": 2, "title": "Ordering & Inventory", "description": "Track deliveries, manage par levels, and review vendor performance from Ordering & Inventory.", "highlight": "inventory", "group": "culinary_ops"},
        {"step": 3, "title": "Financial Insights", "description": "Monitor food costs, prime cost analysis, and P&L from Financial & Purchasing section.", "highlight": "financial-ops", "group": "financial"},
    ],
    "gm": [
        {"step": 1, "title": "Executive Command", "description": "Your daily briefing starts here — revenue, labor, events, and weather-adjusted forecasts across all outlets.", "highlight": "executive-command", "group": "dashboard"},
        {"step": 2, "title": "Department Dashboards", "description": "Each department (Culinary, Spa, Engineering) has its own analytics tab. Expand sidebar groups to navigate.", "highlight": "dept-dashboard", "group": "engineering"},
        {"step": 3, "title": "Spa & Events", "description": "Manage spa appointments, track event revenue, and monitor guest requests from dedicated modules.", "highlight": "spa-wellness", "group": "spa_wellness"},
    ],
    "spa_manager": [
        {"step": 1, "title": "Spa Dashboard", "description": "Your one-stop spa command center — today's appointments, revenue, client CRM, and therapist scheduling.", "highlight": "spa-wellness", "group": "spa_wellness"},
        {"step": 2, "title": "Staff & Credentials", "description": "Track therapist qualifications, licenses, and credentials. The system flags bookings with unqualified staff.", "highlight": "spa-wellness", "group": "spa_wellness"},
        {"step": 3, "title": "Promotions", "description": "Create and send BCC mass email promotions to all clients or VIP segments from the Promotions tab.", "highlight": "spa-wellness", "group": "spa_wellness"},
    ],
    "dir_engineering": [
        {"step": 1, "title": "Engineering Ops", "description": "Track work tickets, manage staff by trade classification, and monitor guest requests in real-time.", "highlight": "eng-work-tickets", "group": "engineering"},
        {"step": 2, "title": "Staff Schedule", "description": "View your team by trade (HVAC, Electrician, Plumber, etc.) and manage shift assignments.", "highlight": "eng-work-tickets", "group": "engineering"},
        {"step": 3, "title": "Integrations", "description": "Connect with hospitality operations platforms for enhanced management from the Integrations tab.", "highlight": "eng-work-tickets", "group": "engineering"},
    ],
    "default": [
        {"step": 1, "title": "Welcome to LUCCCA", "description": "Your enterprise hospitality platform. Start with the Dashboard to see today's performance.", "highlight": "maestro-dashboard", "group": "dashboard"},
        {"step": 2, "title": "Navigate by Department", "description": "The sidebar is organized by department. Click any category header to expand and see its tools.", "highlight": "culinary", "group": "culinary_ops"},
        {"step": 3, "title": "Need Help?", "description": "Visit Community & Support at the bottom of the sidebar for ChefNet discussions and support resources.", "highlight": "support", "group": "community"},
    ],
}


@router.get("/steps")
async def get_onboarding_steps(role: str = Query("default"), user_id: Optional[str] = None):
    """Get onboarding steps for a specific role."""
    role_key = role.lower().replace("-", "_").replace(" ", "_")
    steps = TOUR_STEPS.get(role_key, TOUR_STEPS["default"])

    # Check completion status
    completed_steps = []
    if user_id:
        record = db["onboarding_progress"].find_one({"user_id": user_id}, {"_id": 0})
        if record:
            completed_steps = record.get("completed_steps", [])

    enriched = []
    for s in steps:
        enriched.append({**s, "completed": s["step"] in completed_steps})

    return {
        "role": role_key,
        "steps": enriched,
        "total_steps": len(steps),
        "completed": len(completed_steps),
        "all_complete": len(completed_steps) >= len(steps),
    }


@router.post("/complete-step")
async def complete_step(user_id: str = Query(...), step: int = Query(...)):
    """Mark an onboarding step as completed."""
    record = db["onboarding_progress"].find_one({"user_id": user_id}, {"_id": 0})
    if record:
        if step not in record.get("completed_steps", []):
            db["onboarding_progress"].update_one(
                {"user_id": user_id},
                {"$push": {"completed_steps": step}, "$set": {"updated_at": _now()}}
            )
    else:
        db["onboarding_progress"].insert_one({
            "id": f"ob-{_uid()}", "user_id": user_id,
            "completed_steps": [step], "created_at": _now(), "updated_at": _now(),
        })
    return {"completed": step}


@router.post("/dismiss")
async def dismiss_onboarding(user_id: str = Query(...)):
    """Dismiss the onboarding wizard entirely."""
    db["onboarding_progress"].update_one(
        {"user_id": user_id},
        {"$set": {"dismissed": True, "updated_at": _now()}},
        upsert=True,
    )
    return {"dismissed": True}


@router.get("/status")
async def onboarding_status(user_id: str = Query(...)):
    """Check if user has completed or dismissed onboarding."""
    record = db["onboarding_progress"].find_one({"user_id": user_id}, {"_id": 0})
    if not record:
        return {"show_wizard": True, "completed_steps": [], "dismissed": False}
    return {
        "show_wizard": not record.get("dismissed", False) and len(record.get("completed_steps", [])) < 3,
        "completed_steps": record.get("completed_steps", []),
        "dismissed": record.get("dismissed", False),
    }


# ═══════════════ PUBLIC GUEST SPA BOOKING ═══════════════

guest_router = APIRouter(prefix="/api/guest-booking", tags=["guest-booking"])

class GuestBookingInput(BaseModel):
    guest_name: str
    guest_email: str
    guest_phone: str = ""
    room_number: str = ""
    treatment_id: str
    preferred_date: str
    preferred_time: str
    therapist_preference: Optional[str] = None
    notes: str = ""


@guest_router.get("/treatments")
async def public_treatment_menu():
    """Public treatment menu — no auth required."""
    treatments = list(db["spa_treatments"].find({"active": True}, {"_id": 0}))
    # Strip internal fields
    public = []
    for t in treatments:
        public.append({
            "id": t["id"], "name": t["name"], "category": t.get("category", ""),
            "description": t.get("description", ""), "duration_mins": t.get("duration_mins", 60),
            "price": t.get("price", 0),
        })
    return {"treatments": public}


@guest_router.get("/availability")
async def public_availability(date: str = Query(...), treatment_id: Optional[str] = None):
    """Public availability check — no auth required."""
    therapists = list(db["spa_therapists"].find({"available": True}, {"_id": 0}))
    booked = list(db["spa_appointments"].find({"date": date, "status": {"$ne": "cancelled"}}, {"_id": 0}))
    booked_slots = {}
    for b in booked:
        tid = b.get("therapist_id", "")
        if tid not in booked_slots:
            booked_slots[tid] = []
        booked_slots[tid].append(b.get("time", ""))

    trt = db["spa_treatments"].find_one({"id": treatment_id}, {"_id": 0}) if treatment_id else None
    required_quals = trt.get("required_qualifications", []) if trt else []

    slots = []
    for hour in range(9, 20):
        for minute in [0, 30]:
            t = f"{hour:02d}:{minute:02d}"
            count = 0
            for th in therapists:
                if t in booked_slots.get(th["id"], []):
                    continue
                if required_quals and not all(q in th.get("qualifications", []) for q in required_quals):
                    continue
                count += 1
            if count > 0:
                slots.append({"time": t, "available_therapists": count})
    return {"date": date, "slots": slots, "treatment": trt["name"] if trt else None}


@guest_router.post("/book")
async def public_book_appointment(data: GuestBookingInput):
    """Guest self-service booking — creates appointment and client record if needed."""
    trt = db["spa_treatments"].find_one({"id": data.treatment_id}, {"_id": 0})
    if not trt:
        raise HTTPException(404, "Treatment not found")

    # Find or create client
    client = db["spa_clients"].find_one({"email": data.guest_email}, {"_id": 0})
    if not client:
        client = {
            "id": f"cli-{_uid()}", "first_name": data.guest_name.split()[0],
            "last_name": " ".join(data.guest_name.split()[1:]) or data.guest_name,
            "email": data.guest_email, "phone": data.guest_phone,
            "preferences": "", "allergies": "", "notes": f"Room: {data.room_number}" if data.room_number else "",
            "vip": False, "total_visits": 0, "total_spent": 0, "created_at": _now(),
        }
        db["spa_clients"].insert_one(client)
        client.pop("_id", None)

    # Auto-assign therapist
    therapist = None
    if data.therapist_preference:
        therapist = db["spa_therapists"].find_one({"id": data.therapist_preference, "available": True}, {"_id": 0})
    if not therapist:
        required_quals = trt.get("required_qualifications", [])
        booked = [a["therapist_id"] for a in db["spa_appointments"].find({"date": data.preferred_date, "time": data.preferred_time, "status": {"$ne": "cancelled"}}, {"_id": 0})]
        for th in db["spa_therapists"].find({"available": True}, {"_id": 0}):
            if th["id"] in booked:
                continue
            if required_quals and not all(q in th.get("qualifications", []) for q in required_quals):
                continue
            therapist = th
            break

    # Auto-assign room
    room = db["spa_rooms"].find_one({"room_type": trt.get("room_type", "treatment"), "status": "available"}, {"_id": 0})

    apt = {
        "id": f"apt-{_uid()}", "client_id": client["id"], "treatment_id": data.treatment_id,
        "therapist_id": therapist["id"] if therapist else None,
        "room_id": room["id"] if room else None,
        "date": data.preferred_date, "time": data.preferred_time,
        "status": "pending", "notes": data.notes, "price": trt["price"],
        "client_name": data.guest_name,
        "treatment_name": trt["name"],
        "therapist_name": therapist["name"] if therapist else "To be assigned",
        "room_name": room["name"] if room else "To be assigned",
        "duration_mins": trt["duration_mins"],
        "qualification_flag": None, "source": "guest_booking",
        "guest_room": data.room_number, "created_at": _now(),
    }
    db["spa_appointments"].insert_one(apt)
    apt.pop("_id", None)

    return {
        "booking_id": apt["id"],
        "status": "pending",
        "confirmation": f"Your {trt['name']} appointment is pending confirmation for {data.preferred_date} at {data.preferred_time}.",
        "treatment": trt["name"],
        "date": data.preferred_date,
        "time": data.preferred_time,
        "therapist": therapist["name"] if therapist else "To be assigned",
        "price": trt["price"],
    }
