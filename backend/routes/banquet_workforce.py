"""
Banquet Workforce & PTO Engine
================================
Manages banquet staff profiles, PTO requests, conflict detection,
EchoAi³ auto-scheduling, VIP team assignment, multi-company employees.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/banquet-workforce", tags=["banquet-workforce"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# ══════════════════════════════════════
#  SEED BANQUET STAFF
# ══════════════════════════════════════

def _seed_staff():
    if db["banquet_staff"].count_documents({}) > 0:
        return
    roles = [
        ("Banquet Captain", 28.00, "foh", True),
        ("Banquet Captain", 28.00, "foh", True),
        ("Lead Server", 22.00, "foh", False),
        ("Lead Server", 22.00, "foh", False),
    ]
    names = ["Marcus Rivera", "Diana Chen", "James Okafor", "Sofia Petrov",
             "Andre Williams", "Keiko Tanaka", "Carlos Mendez", "Priya Sharma",
             "Ethan Brooks", "Nina Volkov", "Omar Hassan", "Lucia Ferretti",
             "Tyler Washington", "Mei Lin Zhang", "Raj Patel", "Emma Johansson",
             "David Kim", "Aaliyah Jackson", "Tomás García", "Hannah Schmidt"]
    staff = []
    for i, name in enumerate(names):
        if i < 4:
            role, rate, dept, is_captain = roles[i]
        else:
            role, rate, dept = "Banquet Server", 18.00, "foh"
            is_captain = False
        companies = ["LUCCCA Resort"]
        if i % 3 == 0:
            companies.append("Hilton Fort Lauderdale")
        if i % 5 == 0:
            companies.append("W Hotel South Beach")
        staff.append({
            "id": f"bqs-{_uid()}", "name": name, "role": role,
            "hourly_rate": rate, "department": dept, "is_captain": is_captain,
            "companies": companies, "primary_company": "LUCCCA Resort",
            "vip_certified": i < 8, "languages": ["English"] + (["Spanish"] if i % 2 == 0 else []),
            "skills": ["buffet", "plated"] + (["wine_service"] if is_captain else []),
            "performance_score": round(3.5 + (i % 15) * 0.1, 1),
            "availability": {"mon": True, "tue": True, "wed": True, "thu": True,
                             "fri": True, "sat": i % 3 != 0, "sun": i % 4 != 0},
            "status": "active", "created_at": _now(),
        })
    db["banquet_staff"].insert_many(staff)


class PTORequest(BaseModel):
    staff_id: str
    dates: List[str]
    reason: str = "personal"

class ScheduleGenInput(BaseModel):
    beo_id: str
    date: str


# ══════════════════════════════════════
#  PTO WITH CONFLICT DETECTION
# ══════════════════════════════════════

@router.post("/pto/request")
async def request_pto(data: PTORequest):
    """Submit PTO request — EchoAi³ checks for conflicts, suggests substitutes."""
    _seed_staff()
    staff = db["banquet_staff"].find_one({"id": data.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(404, "Staff not found")

    conflicts = []
    for date in data.dates:
        # Check BEOs on this date
        beos = list(db["beo_documents"].find({"event_date": date}, {"_id": 0, "beo_number": 1, "event_name": 1, "guaranteed_count": 1}))
        if beos:
            conflicts.append({"date": date, "events": [{"beo": b["beo_number"], "name": b["event_name"], "covers": b["guaranteed_count"]} for b in beos]})

        # Check if another staff already has PTO this day
        existing_pto = list(db["pto_requests"].find({"dates": date, "status": "approved", "staff_id": {"$ne": data.staff_id}}, {"_id": 0, "staff_id": 1}))
        if existing_pto:
            conflicts.append({"date": date, "type": "same_day_pto", "count": len(existing_pto),
                              "message": f"{len(existing_pto)} other staff already approved off this day"})

    # Find substitutes
    substitutes = []
    if conflicts:
        same_role = list(db["banquet_staff"].find(
            {"role": staff["role"], "id": {"$ne": data.staff_id}, "status": "active"},
            {"_id": 0, "id": 1, "name": 1, "performance_score": 1, "vip_certified": 1}
        ).sort("performance_score", -1).limit(5))
        # Filter out those who already have PTO
        for sub in same_role:
            has_conflict = db["pto_requests"].count_documents({"staff_id": sub["id"], "dates": {"$in": data.dates}, "status": "approved"})
            if not has_conflict:
                substitutes.append(sub)

    # Determine auto-action
    has_event_conflict = any(c for c in conflicts if "events" in c)
    has_same_day = any(c for c in conflicts if c.get("type") == "same_day_pto")

    status = "pending"
    echoai3_note = ""
    if has_event_conflict and has_same_day:
        echoai3_note = "HIGH RISK: Event scheduled AND another staff already off. Chef/manager approval required."
        approval_probability = "low"
    elif has_event_conflict:
        echoai3_note = "Event conflict detected. EchoAi³ found substitutes. Pending chef approval."
        approval_probability = "medium"
    elif has_same_day:
        echoai3_note = "Another staff already off this day. Consider picking a different day for higher approval probability."
        approval_probability = "medium"
    else:
        echoai3_note = "No conflicts detected. Auto-approved."
        status = "approved"
        approval_probability = "high"

    pto = {
        "id": f"pto-{_uid()}", "staff_id": data.staff_id, "staff_name": staff["name"],
        "dates": data.dates, "reason": data.reason, "status": status,
        "conflicts": conflicts, "substitutes": [s["name"] for s in substitutes[:3]],
        "echoai3_note": echoai3_note, "approval_probability": approval_probability,
        "created_at": _now(),
    }
    db["pto_requests"].insert_one(pto)
    pto.pop("_id", None)

    # Notify chef if there's a conflict
    if has_event_conflict:
        db["concierge_tickets"].insert_one({
            "id": f"tc-{_uid()}", "title": f"PTO Review: {staff['name']} requested {', '.join(data.dates)}",
            "description": f"{echoai3_note}\nSubstitutes: {', '.join(s['name'] for s in substitutes[:3])}",
            "category": "other", "priority": "high", "status": "open",
            "department": "culinary", "created_at": _now(),
        })

    return pto


@router.put("/pto/{pto_id}/approve")
async def approve_pto(pto_id: str):
    db["pto_requests"].update_one({"id": pto_id}, {"$set": {"status": "approved", "approved_at": _now()}})
    return {"status": "approved", "id": pto_id}

@router.put("/pto/{pto_id}/deny")
async def deny_pto(pto_id: str, reason: str = Query("scheduling_conflict")):
    db["pto_requests"].update_one({"id": pto_id}, {"$set": {"status": "denied", "deny_reason": reason, "denied_at": _now()}})
    return {"status": "denied", "id": pto_id}

@router.get("/pto")
async def list_pto(status: Optional[str] = None):
    q = {"status": status} if status else {}
    ptos = list(db["pto_requests"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"requests": ptos, "total": len(ptos)}


# ══════════════════════════════════════
#  SMART SCHEDULE GENERATION
# ══════════════════════════════════════

@router.post("/schedule/generate")
async def generate_schedule(data: ScheduleGenInput):
    """EchoAi³ auto-generates optimal banquet schedule for a BEO date."""
    _seed_staff()
    beo = db["beo_documents"].find_one({"id": data.beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    gc = beo["guaranteed_count"]
    # Staffing ratios: 1 captain per 40, 1 server per 15-20
    captains_needed = max(1, gc // 40)
    servers_needed = max(2, gc // 18)
    setup_crew = max(2, gc // 30)

    # Check VIP
    is_vip = beo.get("post_as", "").lower().find("executive") >= 0 or gc > 150

    # Get available staff (not on PTO, correct day-of-week)
    day_name = datetime.strptime(data.date, "%Y-%m-%d").strftime("%a").lower()[:3]
    all_staff = list(db["banquet_staff"].find({"status": "active"}, {"_id": 0}))
    pto_staff_ids = set(
        p["staff_id"] for p in db["pto_requests"].find({"dates": data.date, "status": "approved"}, {"_id": 0, "staff_id": 1})
    )

    available = [s for s in all_staff if s["id"] not in pto_staff_ids and s.get("availability", {}).get(day_name, True)]

    # Pick best teams
    captains = sorted([s for s in available if s["is_captain"]], key=lambda x: -x["performance_score"])[:captains_needed]
    remaining = [s for s in available if not s["is_captain"]]
    if is_vip:
        servers = sorted([s for s in remaining if s["vip_certified"]], key=lambda x: -x["performance_score"])[:servers_needed]
    else:
        servers = sorted(remaining, key=lambda x: -x["performance_score"])[:servers_needed]
    setup = remaining[servers_needed:servers_needed + setup_crew]

    schedule = {
        "id": f"sched-{_uid()}", "beo_id": data.beo_id, "beo_number": beo["beo_number"],
        "date": data.date, "event_name": beo["event_name"], "room": beo["room"],
        "guest_count": gc, "is_vip": is_vip,
        "assignments": {
            "captains": [{"id": s["id"], "name": s["name"], "score": s["performance_score"]} for s in captains],
            "servers": [{"id": s["id"], "name": s["name"], "score": s["performance_score"], "vip": s["vip_certified"]} for s in servers],
            "setup_crew": [{"id": s["id"], "name": s["name"]} for s in setup],
        },
        "staffing": {
            "captains_needed": captains_needed, "captains_assigned": len(captains),
            "servers_needed": servers_needed, "servers_assigned": len(servers),
            "setup_needed": setup_crew, "setup_assigned": len(setup),
            "shortfall": max(0, (captains_needed - len(captains)) + (servers_needed - len(servers))),
        },
        "status": "proposed", "generated_by": "echoai3", "created_at": _now(),
    }
    db["banquet_schedules"].insert_one(schedule)
    schedule.pop("_id", None)
    return schedule


@router.get("/staff")
async def list_staff(role: Optional[str] = None):
    _seed_staff()
    q = {"status": "active"}
    if role:
        q["role"] = role
    staff = list(db["banquet_staff"].find(q, {"_id": 0}).sort("performance_score", -1))
    return {"staff": staff, "total": len(staff)}


@router.get("/staff/{staff_id}/availability")
async def check_availability(staff_id: str, date: str = Query(...)):
    _seed_staff()
    staff = db["banquet_staff"].find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(404, "Staff not found")
    has_pto = db["pto_requests"].count_documents({"staff_id": staff_id, "dates": date, "status": "approved"}) > 0
    day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%a").lower()[:3]
    day_available = staff.get("availability", {}).get(day_name, True)
    return {"staff_id": staff_id, "name": staff["name"], "date": date, "available": day_available and not has_pto, "on_pto": has_pto, "day_available": day_available}
