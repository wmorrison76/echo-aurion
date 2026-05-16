"""iter238 · Multi-outlet expansion + employees + schedule + concierge v2.

Adds retail + service outlets (hair salon, 2 clothing, kids, souvenir, 3rd-party swim),
18 seeded employees, hours-of-operation with seasonal overrides, schedule platform,
concierge amenity/issue/elevation, off-property dining suggestions, valet + housekeeping
dispatch, and purchasing-group vendor selection.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["ecw-ops-iter238"])


# ══════════════════════════════════════════════════════════════════════
# 1. RETAIL + SERVICE OUTLETS (5 new + 1 third-party)
# ══════════════════════════════════════════════════════════════════════
# 5-star resort naming (distinctive but neutral — no trademarked names)
RETAIL_OUTLETS = [
    {"id": "outlet-salon",       "name": "Allure Salon & Spa",       "kind": "salon",
      "category": "service",  "gl_prefix": "82", "seats": 12, "owned_by": "property",
      "staff_positions": ["Stylist", "Colorist", "Nail Technician"]},
    {"id": "outlet-menswear",    "name": "Atelier — Men's",           "kind": "retail",
      "category": "apparel",  "gl_prefix": "84", "seats": 0, "owned_by": "property",
      "staff_positions": ["Sales Associate", "Store Lead", "Tailor"]},
    {"id": "outlet-womenswear",  "name": "Maison — Women's",          "kind": "retail",
      "category": "apparel",  "gl_prefix": "86", "seats": 0, "owned_by": "property",
      "staff_positions": ["Sales Associate", "Store Lead", "Stylist"]},
    {"id": "outlet-kids",        "name": "Voyagers Kids Adventure",   "kind": "experience",
      "category": "kids",     "gl_prefix": "88", "seats": 30, "owned_by": "property",
      "staff_positions": ["Adventure Guide", "Counselor", "Safety Lead"]},
    {"id": "outlet-souvenir",    "name": "The Keepsake",              "kind": "retail",
      "category": "gift",     "gl_prefix": "90", "seats": 0, "owned_by": "property",
      "staff_positions": ["Sales Associate", "Store Lead", "Cashier"]},
    # 3rd-party tenant — property employees staff it, revenue splits
    {"id": "outlet-swim",        "name": "Everything But Water",      "kind": "retail",
      "category": "swimwear", "gl_prefix": "92", "seats": 0, "owned_by": "third-party",
      "third_party_vendor": "Everything But Water LLC",
      "revenue_share_pct": 15.0,   # property takes 15% of gross
      "staff_positions": ["Sales Associate", "Store Lead", "Stylist"]},
]

# Employee first names — 3 per outlet for seed
EMPLOYEE_SEEDS = {
    "outlet-salon":      ["Sienna Ross", "Malik Grant", "Aria Chen"],
    "outlet-menswear":   ["Jaxon Reed", "Dante Morales", "Theo Park"],
    "outlet-womenswear": ["Isla Pierce", "Kenna Blake", "Vivienne Hart"],
    "outlet-kids":       ["Rowan Carter", "Quinn Avery", "Sage Miller"],
    "outlet-souvenir":   ["Nora Finch", "Cruz Okafor", "Luna Vega"],
    "outlet-swim":       ["Marina Cole", "Dashiell Wren", "Sunny Patel"],
}

DEFAULT_HOURS = {
    "mon": {"open": "09:00", "close": "21:00", "closed": False},
    "tue": {"open": "09:00", "close": "21:00", "closed": False},
    "wed": {"open": "09:00", "close": "21:00", "closed": False},
    "thu": {"open": "09:00", "close": "21:00", "closed": False},
    "fri": {"open": "09:00", "close": "22:00", "closed": False},
    "sat": {"open": "09:00", "close": "22:00", "closed": False},
    "sun": {"open": "10:00", "close": "20:00", "closed": False},
}


@router.post("/api/outlets/seed-retail")
def seed_retail_outlets():
    """Adds the 6 new retail/service outlets + 18 seed employees + default
    hours-of-operation. Idempotent: wipes & reseeds each call."""
    out_ids = [o["id"] for o in RETAIL_OUTLETS]
    db["echoaurium_outlets"].delete_many({"id": {"$in": out_ids}})
    db["employees"].delete_many({"outlet_id": {"$in": out_ids}})
    db["outlet_hours"].delete_many({"outlet_id": {"$in": out_ids}})

    total_emps = 0
    for o in RETAIL_OUTLETS:
        doc = {**o, "active": True, "created_at": utcnow_iso()}
        db["echoaurium_outlets"].insert_one(dict(doc))

        # 3 employees per outlet
        names = EMPLOYEE_SEEDS.get(o["id"], [])
        for i, name in enumerate(names):
            emp_id = f"emp-{uuid.uuid4().hex[:10]}"
            emp = {
                "id": emp_id,
                "full_name": name,
                "outlet_id": o["id"],
                "position": o["staff_positions"][i % len(o["staff_positions"])],
                "employment_type": "property",   # property-employed even for 3rd-party outlet
                "phone": f"+1-555-01{i:02d}-{abs(hash(name)) % 10000:04d}",
                "email": f"{name.lower().replace(' ', '.')}@echoresort.example",
                "hourly_rate": 18.00 + (i * 2.5),
                "hired_at": utcnow_iso(),
                "status": "active",
                "availability": _default_availability(),
                "skills": [o["staff_positions"][i % len(o["staff_positions"])]],
                "color_tag": ["#5eead4", "#fbbf24", "#a78bfa"][i % 3],
            }
            db["employees"].insert_one(dict(emp))
            total_emps += 1

        # Default hours of operation
        db["outlet_hours"].insert_one({
            "outlet_id": o["id"],
            "base_hours": DEFAULT_HOURS,
            "seasonal_overrides": [],  # { name, start_date, end_date, hours: {...} }
            "updated_at": utcnow_iso(),
        })

    return {"ok": True, "outlets_added": len(RETAIL_OUTLETS),
             "employees_seeded": total_emps}


def _default_availability():
    # Simple weekly availability grid — each day has AM / PM / Evening slots
    return {
        d: {"am": True, "pm": True, "evening": d in ("fri", "sat")}
        for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }


@router.get("/api/outlets/retail")
def list_retail_outlets():
    """List all outlets with kind != F&B (retail, service, experience). Mobile
    concierge / staff directory reads this."""
    rows = list(db["echoaurium_outlets"].find(
        {"$or": [{"owned_by": "third-party"},
                  {"category": {"$in": ["service", "apparel", "kids", "gift", "swimwear"]}}]},
        {"_id": 0}
    ))
    return {"ok": True, "count": len(rows), "rows": rows}


@router.get("/api/outlets/all")
def list_all_outlets():
    """Unified list — includes F&B and retail/service. For mobile concierge."""
    rows = list(db["echoaurium_outlets"].find({}, {"_id": 0}))
    return {"ok": True, "count": len(rows), "rows": rows}


# ══════════════════════════════════════════════════════════════════════
# 2. HOURS OF OPERATION (base + seasonal)
# ══════════════════════════════════════════════════════════════════════
class SeasonalOverride(BaseModel):
    name: str                         # "Spring Break 2026", "Hurricane Season"
    start_date: str                   # "2026-03-15"
    end_date: str                     # "2026-04-15"
    hours: Dict[str, Dict[str, Any]]  # same shape as base_hours


class HoursUpdateIn(BaseModel):
    base_hours: Optional[Dict[str, Dict[str, Any]]] = None
    seasonal_overrides: Optional[List[SeasonalOverride]] = None


@router.get("/api/outlets/{outlet_id}/hours")
def get_outlet_hours(outlet_id: str):
    doc = db["outlet_hours"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not doc:
        return {"ok": True, "outlet_id": outlet_id,
                 "base_hours": DEFAULT_HOURS, "seasonal_overrides": []}
    return {"ok": True, **doc}


@router.patch("/api/outlets/{outlet_id}/hours")
def update_outlet_hours(outlet_id: str, body: HoursUpdateIn,
                          x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    update: Dict[str, Any] = {"updated_at": utcnow_iso(),
                                "updated_by": x_user_id or "chef-william"}
    if body.base_hours is not None: update["base_hours"] = body.base_hours
    if body.seasonal_overrides is not None:
        update["seasonal_overrides"] = [o.model_dump() for o in body.seasonal_overrides]
    db["outlet_hours"].update_one(
        {"outlet_id": outlet_id},
        {"$set": update, "$setOnInsert": {"outlet_id": outlet_id}},
        upsert=True,
    )
    return {"ok": True, "outlet_id": outlet_id}


# ══════════════════════════════════════════════════════════════════════
# 3. EMPLOYEE DIRECTORY (search + availability + messaging)
# ══════════════════════════════════════════════════════════════════════
@router.get("/api/employees")
def list_employees(outlet_id: Optional[str] = None,
                    position: Optional[str] = None,
                    available_day: Optional[str] = None,   # mon..sun
                    available_slot: Optional[str] = None,  # am|pm|evening
                    q: Optional[str] = None,
                    limit: int = 50):
    """Search employees by outlet + position + availability. Mobile
    schedule-builder uses this to find staff for a timeslot."""
    query: Dict[str, Any] = {}
    if outlet_id: query["outlet_id"] = outlet_id
    if position: query["position"] = position
    if available_day and available_slot:
        query[f"availability.{available_day}.{available_slot}"] = True
    rows = list(db["employees"].find(query, {"_id": 0}).limit(min(limit, 200)))
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in (r.get("full_name", "") + " " +
                                             r.get("position", "") + " " +
                                             " ".join(r.get("skills") or [])).lower()]
    return {"ok": True, "count": len(rows), "rows": rows}


class MessageEmployeeIn(BaseModel):
    text: str


@router.post("/api/employees/{employee_id}/message")
def message_employee(employee_id: str, body: MessageEmployeeIn,
                      x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Send a message to an employee through the in-app inbox. If the
    employee has SMS opted in, also queues an SMS dispatch (stub)."""
    emp = db["employees"].find_one({"id": employee_id}, {"_id": 0})
    if not emp: raise HTTPException(404, "employee not found")
    mid = f"empmsg-{uuid.uuid4().hex[:10]}"
    doc = {
        "id": mid, "employee_id": employee_id,
        "from_user_id": x_user_id or "chef-william",
        "text": body.text,
        "created_at": utcnow_iso(), "read_at": None,
        "sms_queued": bool(emp.get("sms_opt_in")),
    }
    db["employee_messages"].insert_one(dict(doc))
    return {"ok": True, "message_id": mid, "sms_queued": doc["sms_queued"]}


# ══════════════════════════════════════════════════════════════════════
# 4. SCHEDULE PLATFORM (build + push via SMS)
# ══════════════════════════════════════════════════════════════════════
class ShiftIn(BaseModel):
    employee_id: str
    start: str         # ISO datetime
    end: str           # ISO datetime
    role: Optional[str] = None
    notes: Optional[str] = None


class ScheduleWeekIn(BaseModel):
    outlet_id: str
    week_start: str    # ISO date (Mon)
    shifts: List[ShiftIn] = []


@router.post("/api/schedules/week")
def save_schedule_week(body: ScheduleWeekIn,
                         x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Save/replace a full week's schedule for an outlet."""
    week_id = f"sched-{body.outlet_id}-{body.week_start}"
    doc = {
        "id": week_id,
        "outlet_id": body.outlet_id,
        "week_start": body.week_start,
        "shifts": [s.model_dump() for s in body.shifts],
        "published_at": utcnow_iso(),
        "published_by": x_user_id or "chef-william",
    }
    db["schedules"].update_one({"id": week_id}, {"$set": doc}, upsert=True)
    return {"ok": True, "schedule_id": week_id, "shift_count": len(body.shifts)}


@router.get("/api/schedules/week")
def get_schedule_week(outlet_id: str, week_start: str):
    doc = db["schedules"].find_one(
        {"id": f"sched-{outlet_id}-{week_start}"}, {"_id": 0})
    if not doc: return {"ok": True, "shifts": [], "empty": True}
    return {"ok": True, **doc}


class SchedulePushIn(BaseModel):
    mode: str = "sms"     # sms | email | both
    employee_ids: Optional[List[str]] = None   # None → whole schedule


@router.post("/api/schedules/{schedule_id}/push")
def push_schedule(schedule_id: str, body: SchedulePushIn):
    """Push the schedule to employees (SMS stub if Twilio not wired)."""
    sched = db["schedules"].find_one({"id": schedule_id}, {"_id": 0})
    if not sched: raise HTTPException(404, "schedule not found")
    recipients = body.employee_ids or list({s["employee_id"] for s in sched["shifts"]})
    queued = []
    for eid in recipients:
        emp = db["employees"].find_one({"id": eid}, {"_id": 0})
        if not emp: continue
        my_shifts = [s for s in sched["shifts"] if s["employee_id"] == eid]
        digest = "\n".join(f"• {s['start']} — {s['end']}" + (f" · {s['role']}" if s.get('role') else "")
                            for s in my_shifts) or "(no shifts)"
        db["schedule_push_queue"].insert_one({
            "id": f"spq-{uuid.uuid4().hex[:10]}",
            "schedule_id": schedule_id, "employee_id": eid,
            "mode": body.mode,
            "phone": emp.get("phone"), "email": emp.get("email"),
            "digest": f"Your schedule for week of {sched['week_start']}:\n{digest}",
            "status": "queued", "created_at": utcnow_iso(),
        })
        queued.append(eid)
    return {"ok": True, "queued_count": len(queued), "mode": body.mode,
             "twilio_live": False, "note": "SMS queued (Twilio FROM number pending)"}


# ══════════════════════════════════════════════════════════════════════
# 5. CONCIERGE · amenity dispatch · guest issue · elevation
# ══════════════════════════════════════════════════════════════════════
class AmenityDispatchIn(BaseModel):
    guest_room: str                   # "2104" or "Villa 12"
    guest_first: str
    guest_last: str
    amenity: str                      # "champagne", "fruit plate", "spa credit"
    dollar_value: Optional[float] = 0
    reason: str                       # "service recovery"
    notes: Optional[str] = ""


@router.post("/api/concierge/amenity")
def dispatch_amenity(body: AmenityDispatchIn,
                      x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Send amenity to guest's room. Logs to guest profile + folio tracking
    + notifies housekeeping/kitchen/front-desk."""
    aid = f"amt-{uuid.uuid4().hex[:10]}"
    doc = {
        "id": aid,
        "guest_room": body.guest_room,
        "guest_name": f"{body.guest_first} {body.guest_last}",
        "amenity": body.amenity,
        "dollar_value": body.dollar_value or 0,
        "reason": body.reason,
        "notes": body.notes,
        "dispatched_by": x_user_id or "chef-william",
        "status": "dispatched",
        "created_at": utcnow_iso(),
    }
    db["guest_amenities"].insert_one(dict(doc))
    _upsert_guest_profile(body.guest_first, body.guest_last, body.guest_room,
                            activity={"kind": "amenity", "detail": body.amenity, "value": body.dollar_value})
    # Notify teams
    for dept in ("front-desk", "housekeeping", "kitchen"):
        db["ecw_activity_events"].insert_one({
            "id": f"evt-{uuid.uuid4().hex[:10]}",
            "outlet_id": None,
            "kind": f"amenity.{dept}.notify",
            "title": f"Amenity dispatched: {body.amenity} → Room {body.guest_room}",
            "detail": f"Guest {doc['guest_name']} · {body.reason}",
            "actor": x_user_id or "chef-william",
            "meta": {"amenity_id": aid, "dept": dept},
            "created_at": utcnow_iso(),
        })
    return {"ok": True, "amenity_id": aid}


class GuestIssueIn(BaseModel):
    guest_room: str
    guest_first: str
    guest_last: str
    severity: str            # happy | neutral | sad | angry (maps to emoji 😊 😐 😟 😠)
    department: str          # dining | room | spa | pool | front-desk | other
    description: str
    table_number: Optional[str] = None
    table_reservation_id: Optional[str] = None
    elevated_to: Optional[str] = None   # next-level manager id


@router.post("/api/concierge/guest-issue")
def log_guest_issue(body: GuestIssueIn,
                     x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    """Flag a guest issue + auto-ticket the responsible department + flag
    the guest for the rest of their stay. Correlates to reservation if
    table_number provided. Severity maps to face emoji."""
    gid = f"gi-{uuid.uuid4().hex[:10]}"
    emoji_map = {"happy": "😊", "neutral": "😐", "sad": "😟", "angry": "😠"}
    doc = {
        "id": gid,
        "guest_room": body.guest_room,
        "guest_name": f"{body.guest_first} {body.guest_last}",
        "severity": body.severity,
        "severity_emoji": emoji_map.get(body.severity, "😐"),
        "department": body.department,
        "description": body.description,
        "table_number": body.table_number,
        "table_reservation_id": body.table_reservation_id,
        "elevated_to": body.elevated_to,
        "status": "open",
        "auto_flag_remaining_stay": body.severity in ("sad", "angry"),
        "logged_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    }
    db["guest_issues"].insert_one(dict(doc))

    # Auto-create a support ticket routed to the responsible department
    dept_assign = {
        "dining": "foh-manager", "room": "housekeeping",
        "spa": "spa-manager",   "pool": "pool-manager",
        "front-desk": "fd-manager", "other": "gm",
    }
    tkt_id = f"tkt-{uuid.uuid4().hex[:10]}"
    db["support_tickets"].insert_one({
        "id": tkt_id, "kind": "guest", "title": f"{doc['severity_emoji']} {body.department} · {body.description[:60]}",
        "detail": body.description, "priority": "high" if body.severity == "angry" else "medium",
        "location": body.department, "category": "guest-issue",
        "related_guest_issue_id": gid, "status": "open",
        "assign_group": dept_assign.get(body.department, "gm"),
        "created_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    })

    # Update guest profile with flag + activity
    _upsert_guest_profile(body.guest_first, body.guest_last, body.guest_room,
                            flag={"severity": body.severity, "issue_id": gid,
                                   "until_checkout": True},
                            activity={"kind": "issue", "detail": body.description,
                                       "department": body.department})
    return {"ok": True, "guest_issue_id": gid, "ticket_id": tkt_id,
             "severity_emoji": doc["severity_emoji"]}


class ElevateIssueIn(BaseModel):
    to_manager_id: str
    note: Optional[str] = ""


@router.post("/api/concierge/guest-issue/{issue_id}/elevate")
def elevate_issue(issue_id: str, body: ElevateIssueIn,
                    x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    issue = db["guest_issues"].find_one({"id": issue_id}, {"_id": 0})
    if not issue: raise HTTPException(404, "issue not found")
    db["guest_issues"].update_one({"id": issue_id},
        {"$set": {"elevated_to": body.to_manager_id, "elevated_at": utcnow_iso(),
                   "elevation_note": body.note, "status": "elevated"}})
    return {"ok": True, "issue_id": issue_id, "elevated_to": body.to_manager_id}


def _upsert_guest_profile(first: str, last: str, room: str,
                             flag: Optional[Dict] = None,
                             activity: Optional[Dict] = None):
    """Maintains a guest profile with flags + activity + folio-ready data."""
    guest_key = f"{first}.{last}.{room}".lower().replace(" ", "-")
    update = {"$set": {"updated_at": utcnow_iso()},
                "$setOnInsert": {"id": guest_key, "first_name": first, "last_name": last,
                                    "current_room": room, "created_at": utcnow_iso()}}
    if flag: update["$push"] = {**update.get("$push", {}),  "flags": flag}
    if activity:
        activity = {**activity, "at": utcnow_iso()}
        update["$push"] = {**update.get("$push", {}), "activity": activity}
    db["guest_profiles"].update_one({"id": guest_key}, update, upsert=True)


@router.get("/api/concierge/guest/{guest_id}")
def get_guest_profile(guest_id: str):
    g = db["guest_profiles"].find_one({"id": guest_id}, {"_id": 0})
    if not g: raise HTTPException(404, "guest not found")
    return {"ok": True, "guest": g}


# ══════════════════════════════════════════════════════════════════════
# 6. CONCIERGE · valet + housekeeping + reservation management
# ══════════════════════════════════════════════════════════════════════
class ValetRequestIn(BaseModel):
    guest_room: str
    guest_name: str


@router.post("/api/concierge/valet")
def request_valet(body: ValetRequestIn,
                    x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    rid = f"val-{uuid.uuid4().hex[:10]}"
    db["valet_requests"].insert_one({
        "id": rid, "guest_room": body.guest_room, "guest_name": body.guest_name,
        "status": "requested", "requested_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "request_id": rid, "eta": "4-6 min"}


class HousekeepingRequestIn(BaseModel):
    guest_room: str
    item: str                # "towels", "pillows", "toiletries"
    qty: int = 1
    notes: Optional[str] = ""


@router.post("/api/concierge/housekeeping")
def request_housekeeping(body: HousekeepingRequestIn,
                          x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    rid = f"hk-{uuid.uuid4().hex[:10]}"
    db["housekeeping_requests"].insert_one({
        "id": rid, "guest_room": body.guest_room,
        "item": body.item, "qty": body.qty, "notes": body.notes,
        "status": "pending", "requested_by": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    })
    return {"ok": True, "request_id": rid}


OFF_PROPERTY_SUGGESTIONS = [
    {"name": "Coastal Bistro",   "category": "restaurant", "cuisine": "seafood",
      "distance_mi": 1.2, "price": "$$$", "rating": 4.6},
    {"name": "Riverfront Terrace","category": "restaurant", "cuisine": "american",
      "distance_mi": 0.8, "price": "$$",  "rating": 4.4},
    {"name": "Bayside Sunset Cruise", "category": "activity", "kind": "tour",
      "distance_mi": 2.1, "price": "$$",  "rating": 4.8},
    {"name": "Downtown Gallery Walk", "category": "activity", "kind": "culture",
      "distance_mi": 3.4, "price": "$",    "rating": 4.3},
    {"name": "Skyline Rooftop Bar",    "category": "nightlife", "cuisine": "cocktails",
      "distance_mi": 1.8, "price": "$$$", "rating": 4.7},
]


@router.get("/api/concierge/off-property")
def list_off_property(category: Optional[str] = None):
    rows = [s for s in OFF_PROPERTY_SUGGESTIONS
             if not category or s["category"] == category]
    return {"ok": True, "count": len(rows), "rows": rows}


# ══════════════════════════════════════════════════════════════════════
# 7. MAESTRO BANQUET · mobile BEO flow dashboard
# ══════════════════════════════════════════════════════════════════════
@router.get("/api/maestro/beo/recent")
def list_recent_beos(limit: int = 10):
    """Recent BEOs created — with AI-generated order summary per BEO."""
    rows = list(db["beos"].find({}, {"_id": 0})
                    .sort([("created_at", -1)]).limit(min(limit, 50)))
    for r in rows:
        # Attach the AI-generated order summary if present
        r["ai_order_summary"] = db["beo_ai_orders"].find_one(
            {"beo_id": r.get("id")}, {"_id": 0}) or None
    return {"ok": True, "count": len(rows), "rows": rows}


# ══════════════════════════════════════════════════════════════════════
# 8. PURCHASING GROUPS + cheapest-vendor lookup
# ══════════════════════════════════════════════════════════════════════
PURCHASING_GROUPS = [
    {"id": "avendra",     "name": "Avendra",     "logo_letter": "A", "color": "#1e40af"},
    {"id": "foodbuy",     "name": "Foodbuy",     "logo_letter": "F", "color": "#059669"},
    {"id": "entegra",     "name": "Entegra",     "logo_letter": "E", "color": "#7c3aed"},
    {"id": "direct",      "name": "Direct",      "logo_letter": "D", "color": "#64748b"},
]


@router.get("/api/purchasing/groups")
def list_purchasing_groups():
    return {"ok": True, "count": len(PURCHASING_GROUPS), "rows": PURCHASING_GROUPS}


@router.get("/api/purchasing/item/{item_name}/price-compare")
def compare_item_prices(item_name: str, outlet_id: Optional[str] = None):
    """For a product (e.g. 'cucumber case'), show current price + next
    delivery day from each vendor. Picks cheapest + marks with group logo."""
    # Stub data — in production these come from vendor price feeds
    base = hash(item_name.lower()) % 100 / 10 + 10   # semi-stable demo price
    from datetime import date
    today = datetime.now(timezone.utc).date()
    quotes = [
        {"vendor": "Sysco",      "group_id": "avendra",  "price": round(base + 0.0, 2),
          "next_delivery": (today + timedelta(days=1)).isoformat(), "pack_size": "24 ct"},
        {"vendor": "US Foods",   "group_id": "avendra",  "price": round(base + 1.2, 2),
          "next_delivery": (today + timedelta(days=2)).isoformat(), "pack_size": "24 ct"},
        {"vendor": "Performance","group_id": "foodbuy",  "price": round(base - 0.3, 2),
          "next_delivery": (today + timedelta(days=2)).isoformat(), "pack_size": "24 ct"},
        {"vendor": "Local Farm", "group_id": "direct",   "price": round(base + 2.8, 2),
          "next_delivery": (today + timedelta(days=0)).isoformat(), "pack_size": "20 ct"},
    ]
    cheapest = min(quotes, key=lambda q: q["price"])
    for q in quotes:
        q["is_cheapest"] = q is cheapest
        g = next((g for g in PURCHASING_GROUPS if g["id"] == q["group_id"]), None)
        q["group_logo_letter"] = (g or {}).get("logo_letter")
        q["group_color"] = (g or {}).get("color")
    return {"ok": True, "item": item_name, "quotes": quotes,
             "cheapest": cheapest}


# ══════════════════════════════════════════════════════════════════════
# 9. OUTLET ANALYTICS (kind-aware: F&B vs retail)
# ══════════════════════════════════════════════════════════════════════
@router.get("/api/outlets/{outlet_id}/analytics")
def outlet_analytics(outlet_id: str):
    """Different KPI sets depending on outlet kind:
       F&B → covers, avg check, food/labor/prime
       Retail → units sold, avg transaction, conversion, returns
       Service (salon) → appointments, avg ticket, rebook rate
       Experience (kids) → enrollments, sessions, attendance"""
    outlet = db["echoaurium_outlets"].find_one({"id": outlet_id}, {"_id": 0})
    if not outlet: raise HTTPException(404, "outlet not found")
    kind = outlet.get("kind") or "restaurant"
    category = outlet.get("category") or "restaurant"
    # Demo KPIs — swap these for real aggregation once POS data is wired
    seed = abs(hash(outlet_id)) % 1000
    if category in ("apparel", "gift", "swimwear"):
        kpis = [
            {"label": "Units sold",      "value": 182 + seed % 40, "fmt": "int"},
            {"label": "Avg transaction", "value": 74.50, "fmt": "usd"},
            {"label": "Conversion",      "value": 28.0,  "fmt": "pct"},
            {"label": "Returns",         "value": 4.2,   "fmt": "pct"},
        ]
    elif category == "service":
        kpis = [
            {"label": "Appointments",    "value": 34 + seed % 10, "fmt": "int"},
            {"label": "Avg ticket",      "value": 145.00,         "fmt": "usd"},
            {"label": "Rebook rate",     "value": 62.0,           "fmt": "pct"},
            {"label": "Utilization",     "value": 78.0,           "fmt": "pct"},
        ]
    elif category == "kids":
        kpis = [
            {"label": "Enrollments",     "value": 22 + seed % 8, "fmt": "int"},
            {"label": "Sessions today",  "value": 4,              "fmt": "int"},
            {"label": "Attendance",      "value": 92.0,           "fmt": "pct"},
            {"label": "Parent rating",   "value": 4.8,            "fmt": "float"},
        ]
    else:  # F&B
        kpis = [
            {"label": "Covers",    "value": 142 + seed % 30, "fmt": "int"},
            {"label": "Avg check", "value": 58.30,           "fmt": "usd"},
            {"label": "Food %",    "value": 26.4,            "fmt": "pct"},
            {"label": "Labor %",   "value": 29.1,            "fmt": "pct"},
        ]
    # 3rd-party split indicator
    third_party_split = None
    if outlet.get("owned_by") == "third-party":
        third_party_split = {
            "vendor": outlet.get("third_party_vendor"),
            "revenue_share_pct": outlet.get("revenue_share_pct"),
            "property_portion_pct": 100 - (outlet.get("revenue_share_pct") or 0),
        }
    return {"ok": True, "outlet": outlet, "kind": kind, "category": category,
             "kpis": kpis, "third_party_split": third_party_split}
