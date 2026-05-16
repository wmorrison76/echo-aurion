"""
LUCCCA Labor Cost Integration Engine
=====================================
Complete labor cost management connecting Schedule to P&L.

Features:
- Auto-plan event labor based on guest count ratios
- Real-time labor cost tracking
- Overtime/premium pay calculation
- Labor cost % in P&L
- Schedule-to-actual variance tracking
- Labor efficiency analytics

Integration: Schedule Module -> Event Lifecycle -> EchoAurum P&L
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import math
from database import (
    labor_plans_col, labor_actuals_col, positions_col,
    events_col, audit_log_col,
)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _uid():
    return str(uuid.uuid4())


def _audit(action: str, data: dict):
    audit_log_col.insert_one({
        "id": _uid(), "engine": "labor_cost",
        "action": action, "data": data, "timestamp": _now(),
    })


# Default position configs for hospitality
DEFAULT_POSITIONS = [
    {"code": "SRV", "name": "Server", "department": "foh", "guests_per_staff": 20,
     "min_staff": 2, "base_rate": 15.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 2.0, "night_diff": 1.5, "holiday_mult": 2.0,
     "min_shift": 4, "max_shift": 10},
    {"code": "BRT", "name": "Bartender", "department": "foh", "guests_per_staff": 50,
     "min_staff": 1, "base_rate": 18.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 2.0, "night_diff": 1.5, "holiday_mult": 2.0,
     "min_shift": 4, "max_shift": 10},
    {"code": "CHF", "name": "Chef/Cook", "department": "boh", "guests_per_staff": 25,
     "min_staff": 2, "base_rate": 22.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 3.0, "night_diff": 2.0, "holiday_mult": 2.0,
     "min_shift": 6, "max_shift": 12},
    {"code": "DSH", "name": "Dishwasher", "department": "boh", "guests_per_staff": 75,
     "min_staff": 1, "base_rate": 12.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 1.0, "night_diff": 1.0, "holiday_mult": 1.5,
     "min_shift": 4, "max_shift": 8},
    {"code": "HST", "name": "Host/Hostess", "department": "foh", "guests_per_staff": 100,
     "min_staff": 1, "base_rate": 14.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 1.5, "night_diff": 1.0, "holiday_mult": 1.5,
     "min_shift": 4, "max_shift": 8},
    {"code": "BQC", "name": "Banquet Captain", "department": "foh", "guests_per_staff": 100,
     "min_staff": 1, "base_rate": 25.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 3.0, "night_diff": 2.0, "holiday_mult": 2.0,
     "min_shift": 6, "max_shift": 12},
    {"code": "BQS", "name": "Banquet Server", "department": "foh", "guests_per_staff": 15,
     "min_staff": 2, "base_rate": 16.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 2.0, "night_diff": 1.5, "holiday_mult": 2.0,
     "min_shift": 4, "max_shift": 10},
    {"code": "STW", "name": "Steward", "department": "boh", "guests_per_staff": 50,
     "min_staff": 1, "base_rate": 13.00, "ot_mult": 1.5, "dt_mult": 2.0,
     "weekend_diff": 1.5, "night_diff": 1.0, "holiday_mult": 1.5,
     "min_shift": 4, "max_shift": 8},
]


def seed_positions():
    """Initialize default positions if empty"""
    if positions_col.count_documents({}) > 0:
        return
    for p in DEFAULT_POSITIONS:
        positions_col.insert_one({
            "id": _uid(),
            "code": p["code"],
            "name": p["name"],
            "department": p["department"],
            "guests_per_staff": p["guests_per_staff"],
            "min_staff": p["min_staff"],
            "base_rate": p["base_rate"],
            "ot_mult": p["ot_mult"],
            "dt_mult": p["dt_mult"],
            "weekend_diff": p["weekend_diff"],
            "night_diff": p["night_diff"],
            "holiday_mult": p["holiday_mult"],
            "min_shift": p["min_shift"],
            "max_shift": p["max_shift"],
            "created_at": _now(),
        })


def get_positions() -> list:
    return list(positions_col.find({}, {"_id": 0}))


def upsert_position(data: dict) -> dict:
    pid = data.get("id") or _uid()
    doc = {
        "id": pid,
        "code": data["code"],
        "name": data["name"],
        "department": data.get("department", "foh"),
        "guests_per_staff": data.get("guests_per_staff", 20),
        "min_staff": data.get("min_staff", 1),
        "base_rate": data.get("base_rate", 15),
        "ot_mult": data.get("ot_mult", 1.5),
        "dt_mult": data.get("dt_mult", 2.0),
        "weekend_diff": data.get("weekend_diff", 0),
        "night_diff": data.get("night_diff", 0),
        "holiday_mult": data.get("holiday_mult", 1.5),
        "min_shift": data.get("min_shift", 4),
        "max_shift": data.get("max_shift", 10),
        "updated_at": _now(),
    }
    positions_col.update_one({"id": pid}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    return doc


# ---------------------------------------------------------------------------
# AUTO-PLAN LABOR (Guest Count -> Staffing)
# ---------------------------------------------------------------------------
def auto_plan_labor(event_id: str, override_positions: list = None) -> dict:
    event = events_col.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise ValueError(f"Event {event_id} not found")

    guest_count = event.get("guest_count", 0) or event.get("guaranteed_count", 0)
    if guest_count <= 0:
        raise ValueError("Guest count must be > 0 for labor planning")

    # Determine event duration
    start = event.get("start_time", "18:00")
    end = event.get("end_time", "23:00")
    try:
        s = datetime.strptime(start, "%H:%M")
        e = datetime.strptime(end, "%H:%M")
        duration_hours = max((e - s).seconds / 3600, 4)
    except (ValueError, TypeError):
        duration_hours = 5  # default

    # Add setup (1h) + breakdown (1h)
    total_shift_hours = duration_hours + 2

    positions = override_positions or list(positions_col.find({}, {"_id": 0}))
    plan_id = _uid()
    staff_plan = []
    total_cost = 0
    total_staff = 0
    total_hours = 0

    for pos in positions:
        # Calculate staff needed by guest ratio
        gps = pos.get("guests_per_staff", 20)
        needed = max(math.ceil(guest_count / gps), pos.get("min_staff", 1))
        if pos.get("max_staff"):
            needed = min(needed, pos["max_staff"])

        # Calculate cost
        shift_hrs = min(total_shift_hours, pos.get("max_shift", 10))
        shift_hrs = max(shift_hrs, pos.get("min_shift", 4))
        regular_hrs = min(shift_hrs, 8)
        ot_hrs = max(0, shift_hrs - 8)

        base = pos.get("base_rate", 15)
        cost_per_staff = (regular_hrs * base) + (ot_hrs * base * pos.get("ot_mult", 1.5))

        # Weekend differential check (simplified)
        event_date_str = event.get("event_date", "")
        is_weekend = False
        try:
            ed = datetime.strptime(event_date_str, "%Y-%m-%d")
            is_weekend = ed.weekday() >= 5
        except (ValueError, TypeError):
            pass

        if is_weekend:
            cost_per_staff += shift_hrs * pos.get("weekend_diff", 0)

        position_total = round(cost_per_staff * needed, 2)

        staff_plan.append({
            "position_code": pos.get("code"),
            "position_name": pos.get("name"),
            "department": pos.get("department"),
            "staff_needed": needed,
            "shift_hours": round(shift_hrs, 1),
            "regular_hours": round(regular_hrs, 1),
            "overtime_hours": round(ot_hrs, 1),
            "base_rate": base,
            "cost_per_staff": round(cost_per_staff, 2),
            "total_cost": position_total,
            "is_weekend": is_weekend,
        })
        total_cost += position_total
        total_staff += needed
        total_hours += shift_hrs * needed

    doc = {
        "id": plan_id,
        "event_id": event_id,
        "event_name": event.get("name", ""),
        "guest_count": guest_count,
        "event_date": event.get("event_date", ""),
        "duration_hours": round(duration_hours, 1),
        "total_shift_hours": round(total_shift_hours, 1),
        "staff_plan": staff_plan,
        "total_staff": total_staff,
        "total_hours": round(total_hours, 1),
        "total_cost": round(total_cost, 2),
        "cost_per_guest": round(total_cost / max(guest_count, 1), 2),
        "labor_pct_target": 25,
        "status": "planned",
        "created_at": _now(),
    }
    labor_plans_col.insert_one(doc)
    del doc["_id"]

    # Update event with labor info
    events_col.update_one({"id": event_id}, {"$set": {
        "labor_plan_id": plan_id,
        "staff_count": total_staff,
        "labor_hours": round(total_hours, 1),
        "costs.labor": round(total_cost, 2),
        "updated_at": _now(),
    }})

    _audit("labor_planned", {"event_id": event_id, "total_staff": total_staff, "total_cost": total_cost})
    return doc


def get_labor_plan(plan_id: str) -> Optional[dict]:
    return labor_plans_col.find_one({"id": plan_id}, {"_id": 0})


def get_event_labor_plan(event_id: str) -> Optional[dict]:
    return labor_plans_col.find_one({"event_id": event_id}, {"_id": 0})


# ---------------------------------------------------------------------------
# ACTUAL LABOR TRACKING
# ---------------------------------------------------------------------------
def record_actual_labor(event_id: str, staff_entries: list) -> dict:
    actual_id = _uid()
    total_cost = 0
    total_hours = 0
    processed = []

    for entry in staff_entries:
        hrs = entry.get("hours", 0)
        rate = entry.get("rate", 0)
        ot_hrs = max(0, hrs - 8)
        reg_hrs = min(hrs, 8)
        cost = (reg_hrs * rate) + (ot_hrs * rate * entry.get("ot_mult", 1.5))

        processed.append({
            "staff_name": entry.get("staff_name", ""),
            "position_code": entry.get("position_code", ""),
            "hours": hrs,
            "regular_hours": reg_hrs,
            "overtime_hours": ot_hrs,
            "rate": rate,
            "cost": round(cost, 2),
        })
        total_cost += cost
        total_hours += hrs

    doc = {
        "id": actual_id,
        "event_id": event_id,
        "date": _now()[:10],
        "entries": processed,
        "total_hours": round(total_hours, 1),
        "total_cost": round(total_cost, 2),
        "recorded_at": _now(),
    }
    labor_actuals_col.insert_one(doc)
    del doc["_id"]

    _audit("actual_labor_recorded", {"event_id": event_id, "total_cost": total_cost})
    return doc


# ---------------------------------------------------------------------------
# VARIANCE ANALYSIS (Planned vs Actual)
# ---------------------------------------------------------------------------
def get_labor_variance(event_id: str) -> dict:
    plan = labor_plans_col.find_one({"event_id": event_id}, {"_id": 0})
    actuals = list(labor_actuals_col.find({"event_id": event_id}, {"_id": 0}))

    planned_cost = plan.get("total_cost", 0) if plan else 0
    planned_hours = plan.get("total_hours", 0) if plan else 0
    planned_staff = plan.get("total_staff", 0) if plan else 0

    actual_cost = sum(a.get("total_cost", 0) for a in actuals)
    actual_hours = sum(a.get("total_hours", 0) for a in actuals)
    actual_staff = sum(len(a.get("entries", [])) for a in actuals)

    return {
        "event_id": event_id,
        "planned": {"cost": planned_cost, "hours": planned_hours, "staff": planned_staff},
        "actual": {"cost": round(actual_cost, 2), "hours": round(actual_hours, 1), "staff": actual_staff},
        "variance": {
            "cost": round(actual_cost - planned_cost, 2),
            "cost_pct": round((actual_cost - planned_cost) / max(planned_cost, 0.01) * 100, 2),
            "hours": round(actual_hours - planned_hours, 1),
            "staff": actual_staff - planned_staff,
        },
        "efficiency": round(planned_hours / max(actual_hours, 0.01) * 100, 1) if actual_hours > 0 else 0,
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# ANALYTICS
# ---------------------------------------------------------------------------
def get_labor_analytics(days: int = 30) -> dict:
    plans = list(labor_plans_col.find({}, {"_id": 0}).sort("created_at", -1).limit(50))
    total_planned = sum(p.get("total_cost", 0) for p in plans)
    avg_cost_per_guest = 0

    if plans:
        guests = sum(p.get("guest_count", 0) for p in plans)
        avg_cost_per_guest = round(total_planned / max(guests, 1), 2)

    by_department = {"foh": 0, "boh": 0}
    for p in plans:
        for sp in p.get("staff_plan", []):
            dept = sp.get("department", "foh")
            by_department[dept] = by_department.get(dept, 0) + sp.get("total_cost", 0)

    return {
        "total_plans": len(plans),
        "total_planned_cost": round(total_planned, 2),
        "avg_cost_per_guest": avg_cost_per_guest,
        "by_department": {k: round(v, 2) for k, v in by_department.items()},
        "engine": "labor_cost",
        "status": "healthy",
        "timestamp": _now(),
    }
