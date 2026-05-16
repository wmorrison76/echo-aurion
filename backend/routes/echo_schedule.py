"""
iter254 · Echo Schedule v2 — Employee Rating, Job Descriptions, Position
=========================================================================
Backend support for William's enhanced schedule:
  - Employee rating (1/2/3 tiers, where 3 = "smaller events only" — surfaced
    privately to managers, NEVER labeled negatively in UI)
  - Per-employee job description + reviews
  - Position scheduled (BOH cook, FOH server, banquet captain, steward, etc.)
  - In-time / out-time per shift with break tracking
  - Legal compliance flags (minor, OT-trigger, mandated-rest violation)
  - Surface in MyEcho for hourly staff (their schedule + position)
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from database import db

router = APIRouter(prefix="/api/echo-schedule", tags=["echo-schedule"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda p: f"{p}-{uuid4().hex[:10]}"


# ─────── POSITIONS BY DEPARTMENT (William's scope) ───────
POSITIONS_BY_DEPT = {
    # Back of house
    "boh-culinary": [
        "executive-chef", "chef-de-cuisine", "sous-chef", "pastry-chef",
        "lead-line-cook", "line-cook-grill", "line-cook-saute",
        "line-cook-fry", "garde-manger", "prep-cook", "expediter",
    ],
    "boh-stewarding": [
        "chief-steward", "steward-banquet-setup", "steward-banquet-strike",
        "steward-pot-wash", "steward-floor-runner", "steward-overnight",
    ],
    # Front of house
    "foh-restaurant": [
        "restaurant-manager", "assistant-manager", "host-hostess",
        "server", "server-fine-dining", "server-trainer",
        "barback", "bartender", "sommelier", "captain", "food-runner",
        "busser", "expo",
    ],
    "foh-banquets": [
        "banquet-manager", "banquet-captain", "banquet-server",
        "banquet-bartender", "banquet-cocktail-server", "banquet-houseman",
        "av-tech",
    ],
    "foh-pool-rooftop": [
        "pool-bar-server", "pool-attendant", "rooftop-bartender",
        "rooftop-server", "cabana-host",
    ],
    # Other
    "spa": ["spa-therapist", "spa-attendant", "spa-receptionist"],
    "engineering": ["engineer-overnight", "engineer-day", "hvac-tech"],
    "housekeeping": ["housekeeper", "houseman", "laundry-attendant",
                     "public-area-attendant"],
}

# Internal tier labels (manager-only). UI will show neutral copy.
TIER_LABELS = {
    1: "Tier 1 · Top performer — schedule for VIP / high-pressure shifts",
    2: "Tier 2 · Reliable — schedule for standard service",
    3: "Tier 3 · Developing — schedule for smaller events / lower volume",
}


# ─────── Models ───────
class EmployeeProfile(BaseModel):
    name: str
    email: Optional[str] = None
    department: str            # one of POSITIONS_BY_DEPT keys
    primary_position: str
    secondary_positions: List[str] = []
    is_minor: bool = False     # under 18 — triggers labor-law guards
    tier: int = 2              # 1/2/3 (manager-only)
    job_description: Optional[str] = None
    reviews: List[Dict[str, Any]] = []
    hire_date: Optional[str] = None
    hourly_rate: Optional[float] = None
    employee_id: Optional[str] = None
    active: bool = True


class ShiftAssignment(BaseModel):
    employee_id: str
    date_iso: str              # YYYY-MM-DD
    position_scheduled: str    # actual position for THIS shift (may differ from primary)
    in_time: str               # HH:MM 24h
    out_time: str
    break_minutes: int = 30
    outlet: Optional[str] = None
    event_id: Optional[str] = None
    notes: Optional[str] = None


class ReviewEntry(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str
    reviewer_id: str
    reviewer_name: Optional[str] = None
    period: Optional[str] = None        # "2026-Q1"


# ─────── Endpoints ───────
@router.get("/positions")
def list_positions():
    """Return positions grouped by department."""
    rows = []
    for dept, plist in POSITIONS_BY_DEPT.items():
        for p in plist:
            rows.append({
                "department": dept,
                "position": p,
                "label": p.replace("-", " ").title(),
            })
    return {"departments": list(POSITIONS_BY_DEPT.keys()),
            "positions": rows, "tiers": TIER_LABELS}


@router.post("/employees")
def create_employee(body: EmployeeProfile):
    eid = body.employee_id or _uid("emp")
    if body.tier not in (1, 2, 3):
        raise HTTPException(400, "tier must be 1, 2, or 3")
    doc = body.dict()
    doc["id"] = eid
    doc["created_at"] = _now()
    doc["updated_at"] = _now()
    db["echo_schedule_employees"].update_one(
        {"id": eid}, {"$set": {**doc, "_id": eid}}, upsert=True)
    return doc


@router.get("/employees")
def list_employees(department: Optional[str] = None,
                   active_only: bool = True, limit: int = 200):
    q: dict = {}
    if department: q["department"] = department
    if active_only: q["active"] = True
    rows = list(db["echo_schedule_employees"].find(q, {"_id": 0})
                .sort("name", 1).limit(limit))
    return {"rows": rows, "count": len(rows)}


@router.get("/employees/{eid}")
def get_employee(eid: str):
    doc = db["echo_schedule_employees"].find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "employee not found")
    return doc


@router.put("/employees/{eid}/tier")
def update_tier(eid: str, body: dict):
    tier = int(body.get("tier", 2))
    if tier not in (1, 2, 3):
        raise HTTPException(400, "tier must be 1, 2, or 3")
    res = db["echo_schedule_employees"].update_one(
        {"id": eid}, {"$set": {"tier": tier, "updated_at": _now()}})
    if res.matched_count == 0:
        raise HTTPException(404, "employee not found")
    return {"ok": True, "id": eid, "tier": tier,
            "label": TIER_LABELS[tier]}


@router.put("/employees/{eid}/job-description")
def update_job_desc(eid: str, body: dict):
    desc = body.get("job_description", "")
    res = db["echo_schedule_employees"].update_one(
        {"id": eid}, {"$set": {"job_description": desc, "updated_at": _now()}})
    if res.matched_count == 0:
        raise HTTPException(404, "employee not found")
    return {"ok": True, "id": eid}


@router.post("/employees/{eid}/reviews")
def add_review(eid: str, body: ReviewEntry):
    review = body.dict()
    review["id"] = _uid("rev")
    review["created_at"] = _now()
    res = db["echo_schedule_employees"].update_one(
        {"id": eid}, {"$push": {"reviews": review},
                       "$set": {"updated_at": _now()}})
    if res.matched_count == 0:
        raise HTTPException(404, "employee not found")
    return {"ok": True, "id": eid, "review": review}


# ─────── Shifts + Legal Compliance ───────
def _check_shift_compliance(emp: dict, body: ShiftAssignment) -> List[str]:
    """Return list of compliance flags. Empty = OK."""
    flags = []
    try:
        in_h, in_m = map(int, body.in_time.split(":"))
        out_h, out_m = map(int, body.out_time.split(":"))
        in_min = in_h * 60 + in_m
        out_min = out_h * 60 + out_m
        if out_min < in_min:
            out_min += 24 * 60      # wraps midnight
        gross_minutes = out_min - in_min
        net_minutes = gross_minutes - max(0, body.break_minutes)
        net_hours = net_minutes / 60.0

        # Minor labor laws (federal FLSA + most states)
        if emp.get("is_minor"):
            if net_hours > 8:
                flags.append("MINOR_OVERTIME")
            if net_hours > 6 and body.break_minutes < 30:
                flags.append("MINOR_BREAK_REQUIRED")
            # 14–15 yo: no work past 7pm school day, 9pm summer.
            # (Simplified: warn if past 9pm.)
            if out_h >= 21 or out_h < 6:
                flags.append("MINOR_LATE_NIGHT")

        # Adult: federal OT (>40/wk handled at week-roll-up endpoint)
        if net_hours > 10:
            flags.append("LONG_SHIFT_OT")

        # Mandatory rest gap (most states: 8h between shifts)
        prev = db["echo_schedule_shifts"].find_one(
            {"employee_id": body.employee_id,
             "date_iso": {"$lt": body.date_iso}},
            sort=[("date_iso", -1)])
        if prev:
            try:
                prev_out = prev.get("out_time", "")
                if prev_out:
                    pout_h, pout_m = map(int, prev_out.split(":"))
                    # crude 8h gap check assuming next-day start
                    if pout_h >= 22 and in_h < 6:
                        flags.append("REST_GAP_LT_8H")
            except Exception:
                pass
    except Exception:
        flags.append("PARSE_ERROR")
    return flags


@router.post("/shifts")
def create_shift(body: ShiftAssignment):
    emp = db["echo_schedule_employees"].find_one({"id": body.employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "employee not found")
    sid = _uid("shf")
    flags = _check_shift_compliance(emp, body)
    doc = {**body.dict(), "id": sid, "_id": sid,
           "compliance_flags": flags, "created_at": _now(),
           "employee_name": emp.get("name"),
           "employee_tier": emp.get("tier"),
           "employee_dept": emp.get("department")}
    db["echo_schedule_shifts"].insert_one(doc)
    return {**doc, "_id": sid}


@router.get("/shifts")
def list_shifts(date_iso: Optional[str] = None,
                department: Optional[str] = None,
                employee_id: Optional[str] = None,
                limit: int = 500):
    q: dict = {}
    if date_iso: q["date_iso"] = date_iso
    if employee_id: q["employee_id"] = employee_id
    if department:
        # iter266.4 · Map user-facing department names ("Pastry", "Culinary",
        # "Banquets", "FOH", "Spa", "Engineering") onto the schedule's slug
        # values ("boh-culinary", "foh-banquets", etc.). Accept both forms.
        dept_lc = department.strip().lower()
        DEPT_MAP: dict[str, list[str]] = {
            "pastry": ["pastry", "boh-pastry", "boh-culinary"],   # pastry sits under boh-culinary in current seed
            "culinary": ["boh-culinary", "culinary"],
            "banquets": ["foh-banquets", "banquets"],
            "foh": ["foh-restaurant", "foh-banquets", "foh"],
            "spa": ["spa"],
            "engineering": ["engineering"],
            "stewarding": ["boh-stewarding"],
            "events": ["foh-banquets", "events"],
            "beverage": ["foh-restaurant", "beverage"],
            "hotel operations": ["foh-restaurant", "spa"],
            "finance": ["finance"],
            "operations": ["foh-restaurant", "foh-banquets", "boh-culinary"],
            "executive": [],  # exec roles see everything; handled upstream
            "it": [],         # admin sees everything
            "sales & marketing": [],
            "creative": [],
        }
        slugs = DEPT_MAP.get(dept_lc, [department])
        if slugs:
            q["employee_dept"] = {"$in": slugs}
    rows = list(db["echo_schedule_shifts"].find(q, {"_id": 0})
                .sort("date_iso", 1).limit(limit))
    return {"rows": rows, "count": len(rows)}


@router.get("/shifts/checker")
def schedule_checker(date_iso: str = Query(...)):
    """Echo's "schedule checker" — returns compliance violations + coverage
    gaps for a given day across all departments."""
    shifts = list(db["echo_schedule_shifts"].find({"date_iso": date_iso}, {"_id": 0}))
    compliance = [s for s in shifts if s.get("compliance_flags")]
    by_dept: Dict[str, List[dict]] = {}
    for s in shifts:
        by_dept.setdefault(s.get("employee_dept", "unknown"), []).append(s)
    return {
        "date": date_iso,
        "total_shifts": len(shifts),
        "compliance_violations": [
            {"shift_id": s["id"], "employee": s.get("employee_name"),
             "flags": s["compliance_flags"], "in": s["in_time"], "out": s["out_time"]}
            for s in compliance
        ],
        "by_department": {d: len(v) for d, v in by_dept.items()},
        "tier_breakdown": {
            f"tier_{t}": sum(1 for s in shifts if s.get("employee_tier") == t)
            for t in (1, 2, 3)
        },
    }


# ─────── MyEcho — staff view of their own schedule ───────
@router.get("/myecho/{eid}")
def myecho_schedule(eid: str, days: int = 14):
    """The hourly-staff-facing endpoint for /m/me. Surfaces ONLY this
    employee's shifts + position scheduled + in/out times."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = list(db["echo_schedule_shifts"].find(
        {"employee_id": eid, "date_iso": {"$gte": today}},
        {"_id": 0, "compliance_flags": 0, "employee_tier": 0}    # hide tier from staff
    ).sort("date_iso", 1).limit(days))
    return {"rows": rows, "count": len(rows)}


# ─────── Seeded sample data so the panel has something to render ───────
def seed_echo_schedule():
    """Idempotent — seeds ~20 employees + 1 week of shifts across all depts."""
    if db["echo_schedule_employees"].count_documents({}) >= 15:
        return
    samples = [
        # boh-culinary
        ("Carlos Mendes", "boh-culinary", "sous-chef", 1, False),
        ("Lily Park", "boh-culinary", "line-cook-saute", 2, False),
        ("Andre Velasquez", "boh-culinary", "line-cook-grill", 2, False),
        ("Mei Tanaka", "boh-culinary", "garde-manger", 1, False),
        ("Jordan Lee", "boh-culinary", "prep-cook", 3, True),     # minor
        # boh-stewarding
        ("Ramon Diaz", "boh-stewarding", "chief-steward", 1, False),
        ("Kevin Asong", "boh-stewarding", "steward-banquet-setup", 2, False),
        ("Sasha Romero", "boh-stewarding", "steward-pot-wash", 3, False),
        # foh-restaurant
        ("Priya Patel", "foh-restaurant", "captain", 1, False),
        ("Marcus Johnson", "foh-restaurant", "server-fine-dining", 1, False),
        ("Elena Rossi", "foh-restaurant", "server", 2, False),
        ("Tomás García", "foh-restaurant", "bartender", 1, False),
        ("Aisha Mensah", "foh-restaurant", "host-hostess", 2, False),
        # foh-banquets
        ("Diego Morales", "foh-banquets", "banquet-captain", 1, False),
        ("Hannah Kim", "foh-banquets", "banquet-server", 2, False),
        ("Trevor Page", "foh-banquets", "banquet-server", 3, False),
        ("Yuki Sato", "foh-banquets", "banquet-bartender", 2, False),
        # spa / engineering
        ("Naomi Bell", "spa", "spa-therapist", 1, False),
        ("Pavel Volkov", "engineering", "engineer-overnight", 2, False),
    ]
    for name, dept, pos, tier, is_minor in samples:
        eid = f"emp-{name.lower().replace(' ', '-').replace('í','i').replace('é','e').replace('á','a').replace('ó','o').replace('ñ','n')}"
        db["echo_schedule_employees"].update_one(
            {"id": eid},
            {"$set": {
                "id": eid, "_id": eid, "name": name, "department": dept,
                "primary_position": pos, "secondary_positions": [],
                "is_minor": is_minor, "tier": tier,
                "job_description": f"{pos.replace('-',' ').title()} for {dept.replace('-',' ').title()}.",
                "reviews": [], "active": True,
                "hire_date": "2024-08-15", "hourly_rate": 18.00 + tier * 2,
                "created_at": _now(), "updated_at": _now(),
            }}, upsert=True)
    # Seed sample shifts across the next 5 days
    base = datetime.now(timezone.utc).date()
    in_outs = [("16:00", "23:30"), ("11:30", "15:30"), ("17:00", "01:00"),
               ("06:00", "14:30"), ("14:00", "22:00")]
    employees = list(db["echo_schedule_employees"].find({}, {"_id": 0}))
    for d in range(5):
        date_iso = (base + timedelta(days=d)).isoformat()
        for i, e in enumerate(employees):
            in_t, out_t = in_outs[(i + d) % len(in_outs)]
            sid = f"shf-seed-{e['id']}-{d}"
            shift_body = ShiftAssignment(
                employee_id=e["id"], date_iso=date_iso,
                position_scheduled=e.get("primary_position", ""),
                in_time=in_t, out_time=out_t, break_minutes=30,
            )
            flags = _check_shift_compliance(e, shift_body)
            db["echo_schedule_shifts"].update_one(
                {"id": sid},
                {"$set": {**shift_body.dict(), "id": sid, "_id": sid,
                          "compliance_flags": flags,
                          "employee_name": e["name"],
                          "employee_tier": e.get("tier"),
                          "employee_dept": e.get("department"),
                          "created_at": _now()}}, upsert=True)
    try:
        db["echo_schedule_employees"].create_index("department")
        db["echo_schedule_shifts"].create_index([("employee_id", 1), ("date_iso", 1)])
        db["echo_schedule_shifts"].create_index("date_iso")
    except Exception:
        pass



# ════════════ iter266.8 · Workforce Command Dashboard ════════════
# Per-outlet labor analytics endpoint that powers the new Schedule
# Dashboard. UI uses these to render the multi-outlet mini-tile grid.

@router.get("/dashboard")
def schedule_dashboard(
    outlets: Optional[str] = Query(None, description="comma-separated outlet_ids"),
    department: Optional[str] = Query(None),
):
    now = datetime.now(timezone.utc)
    today_iso = now.strftime("%Y-%m-%d")
    week_start = now - timedelta(days=now.weekday())
    week_start_iso = week_start.strftime("%Y-%m-%d")

    outlet_ids: list[str] = []
    if outlets:
        outlet_ids = [o.strip() for o in outlets.split(",") if o.strip() and o.strip() != "all"]
    if not outlet_ids:
        try:
            outlet_ids = [d.get("id") for d in db["outlets"].find({}, {"_id": 0, "id": 1}) if d.get("id")]
        except Exception:
            outlet_ids = []
    if not outlet_ids:
        outlet_ids = ["out-pier66-rest", "out-banquet-hall", "out-rooftop-bar"]

    tiles: list[dict] = []
    portfolio = {
        "sales_today": 0.0, "labor_scheduled": 0.0, "labor_actual": 0.0,
        "coverage_pct": 0.0, "approaching_ot": 0, "on_clock_now": 0,
        "compliance_flags": 0,
    }

    for oid in outlet_ids:
        sales_today = 0.0
        try:
            sd = db["pos_sales_summary"].find_one({"outlet_id": oid, "date_iso": today_iso}, {"_id": 0})
            if sd: sales_today = float(sd.get("net_sales", 0))
        except Exception:
            pass
        if not sales_today:
            try:
                dr = db["daily_reports"].find_one({"outlet_id": oid, "date_iso": today_iso}, {"_id": 0})
                if dr: sales_today = float(dr.get("revenue", dr.get("net_sales", 0)))
            except Exception:
                pass

        try:
            shifts = list(db["echo_schedule_shifts"].find(
                {"date_iso": {"$gte": week_start_iso}}, {"_id": 0},
            ).limit(2000))
        except Exception:
            shifts = []

        labor_scheduled = 0.0
        emp_hours: dict[str, float] = {}
        compliance_flags = 0
        for s in shifts:
            if department and s.get("employee_dept") not in (department, department.lower()):
                continue
            dur = float(s.get("scheduled_hours", 0) or 0)
            if not dur and s.get("start_time") and s.get("end_time"):
                try:
                    sh, sm = [int(x) for x in s["start_time"].split(":")]
                    eh, em = [int(x) for x in s["end_time"].split(":")]
                    dur = max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60.0)
                except Exception:
                    dur = 0
            rate = float(s.get("pay_rate", 22) or 22)
            labor_scheduled += dur * rate
            eid = s.get("employee_id")
            if eid: emp_hours[eid] = emp_hours.get(eid, 0) + dur
            if s.get("compliance_flags"):
                compliance_flags += len(s["compliance_flags"])

        approaching_ot = sum(1 for h in emp_hours.values() if h >= 35)

        try:
            next24 = list(db["echo_schedule_shifts"].find(
                {"date_iso": today_iso}, {"_id": 0, "employee_id": 1},
            ))
            needed = max(1, len(next24))
            filled = sum(1 for s in next24 if s.get("employee_id"))
            coverage_pct = round((filled / needed) * 100, 1)
        except Exception:
            coverage_pct = 0

        labor_actual = 0.0
        try:
            cd = list(db["clock_logs"].find(
                {"outlet_id": oid, "clock_in_ts": {"$gte": week_start.isoformat()}},
                {"_id": 0, "hours_worked": 1, "pay_rate": 1},
            ))
            for c in cd:
                labor_actual += float(c.get("hours_worked", 0)) * float(c.get("pay_rate", 22))
        except Exception:
            pass

        on_clock_now = 0
        try:
            on_clock_now = db["clock_logs"].count_documents({
                "outlet_id": oid,
                "$or": [{"clock_out_ts": None}, {"clock_out_ts": {"$exists": False}}],
            })
        except Exception:
            pass

        next_apron_on = None
        try:
            upcoming = list(db["echo_schedule_shifts"].find(
                {"date_iso": today_iso}, {"_id": 0, "start_time": 1, "employee_name": 1},
            ).sort("start_time", 1).limit(10))
            cur_hhmm = now.strftime("%H:%M")
            for s in upcoming:
                if s.get("start_time", "") >= cur_hhmm:
                    next_apron_on = {"time": s["start_time"], "employee": s.get("employee_name", "")}
                    break
        except Exception:
            pass

        outlet_name = oid
        try:
            o = db["outlets"].find_one({"id": oid}, {"_id": 0, "name": 1})
            if o and o.get("name"): outlet_name = o["name"]
        except Exception:
            pass

        tile = {
            "outlet_id": oid, "outlet_name": outlet_name,
            "sales_today": round(sales_today, 2),
            "labor_scheduled": round(labor_scheduled, 2),
            "labor_actual": round(labor_actual, 2),
            "labor_pct_of_sales": (round((labor_actual / sales_today) * 100, 1) if sales_today > 0 else 0),
            "coverage_pct": coverage_pct,
            "approaching_ot": approaching_ot,
            "on_clock_now": on_clock_now,
            "compliance_flags": compliance_flags,
            "next_apron_on": next_apron_on,
            "shifts_this_week": len([s for s in shifts if not department or s.get("employee_dept") == department]),
        }
        tiles.append(tile)
        portfolio["sales_today"] += sales_today
        portfolio["labor_scheduled"] += labor_scheduled
        portfolio["labor_actual"] += labor_actual
        portfolio["approaching_ot"] += approaching_ot
        portfolio["on_clock_now"] += on_clock_now
        portfolio["compliance_flags"] += compliance_flags

    if tiles:
        portfolio["coverage_pct"] = round(sum(t["coverage_pct"] for t in tiles) / len(tiles), 1)
        portfolio["sales_today"] = round(portfolio["sales_today"], 2)
        portfolio["labor_scheduled"] = round(portfolio["labor_scheduled"], 2)
        portfolio["labor_actual"] = round(portfolio["labor_actual"], 2)
        portfolio["labor_pct_of_sales"] = (
            round((portfolio["labor_actual"] / portfolio["sales_today"]) * 100, 1)
            if portfolio["sales_today"] > 0 else 0
        )

    return {
        "generated_at": now.isoformat(),
        "tiles": tiles,
        "portfolio": portfolio,
        "scope": {"outlet_ids": outlet_ids, "department": department, "multi_outlet": len(tiles) > 1},
    }



# ══════════════════════════════════════════════════════════════════════
# iter266.11 · Labor Brain Advisory Rail
# Reads the same KPI tiles produced by /dashboard and surfaces 3-5
# ranked recommendations. Each rec has a 1-tap "accept" that writes a
# real PAF (borrow_pafs) + audit row, so accepting in the UI actually
# moves money/people on the schedule.
# ══════════════════════════════════════════════════════════════════════

class LaborBrainAcceptBody(BaseModel):
    rec_id: str
    outlet_id: str
    action_type: str  # cut_shift | call_in | reassign_ot | resolve_flag | hold_break
    rationale: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    accepted_by: Optional[str] = None


SEVERITY_WEIGHT = {"urgent": 100, "warn": 60, "optimize": 30, "info": 10}


def _rank(recs: list[dict]) -> list[dict]:
    """Sort by severity then by confidence desc, take top 5."""
    recs.sort(
        key=lambda r: (SEVERITY_WEIGHT.get(r.get("severity", "info"), 0),
                       r.get("confidence", 0)),
        reverse=True,
    )
    return recs[:5]


def _generate_labor_brain_recs(tile: dict, portfolio: dict) -> list[dict]:
    """Rules engine. Pure function of KPIs. No mocks — every threshold
    is grounded in a real KPI the dashboard already reports."""
    out: list[dict] = []
    oid = tile["outlet_id"]
    oname = tile["outlet_name"]

    # 1. Coverage gap — pull staff in
    if tile["coverage_pct"] < 85 and tile["shifts_this_week"] > 0:
        out.append({
            "id": f"{oid}-coverage-gap",
            "outlet_id": oid, "outlet_name": oname,
            "severity": "urgent",
            "title": f"Coverage gap at {oname} ({tile['coverage_pct']}%)",
            "rationale": (
                f"Today's coverage is {tile['coverage_pct']}% — below the 85% "
                f"floor. Borrow 1 service-side employee from a sister outlet "
                f"or call in an on-call to restore coverage before peak."
            ),
            "action_type": "call_in",
            "action_label": "Open Borrow PAF",
            "confidence": 0.92,
            "payload": {"target_coverage_pct": 95, "outlet_id": oid},
        })

    # 2. Labor over-spend — cut staff
    if (tile["sales_today"] > 0 and tile["labor_pct_of_sales"] > 38
            and tile["labor_actual"] > tile["labor_scheduled"] * 1.05):
        out.append({
            "id": f"{oid}-labor-overrun",
            "outlet_id": oid, "outlet_name": oname,
            "severity": "warn",
            "title": f"Labor running {tile['labor_pct_of_sales']}% of sales at {oname}",
            "rationale": (
                f"Labor actual is "
                f"${tile['labor_actual']:,.0f} vs scheduled "
                f"${tile['labor_scheduled']:,.0f} — "
                f"{tile['labor_pct_of_sales']}% of today's "
                f"${tile['sales_today']:,.0f} in sales. Cut 1 service-side "
                f"shift and hold remaining breaks to ~28%."
            ),
            "action_type": "cut_shift",
            "action_label": "Cut 1 shift",
            "confidence": 0.78,
            "payload": {"target_labor_pct": 30, "outlet_id": oid,
                        "savings_estimate": round(
                            tile["labor_actual"] -
                            tile["sales_today"] * 0.30, 2)},
        })

    # 3. Approaching OT — re-assign
    if tile["approaching_ot"] >= 2:
        out.append({
            "id": f"{oid}-ot-risk",
            "outlet_id": oid, "outlet_name": oname,
            "severity": "warn",
            "title": (f"{tile['approaching_ot']} employees nearing OT "
                       f"at {oname}"),
            "rationale": (
                f"{tile['approaching_ot']} employees are at or above 35h "
                f"scheduled this week. Re-assign their remaining hours to "
                f"part-timers and stagger end-of-week shifts to avoid "
                f"premium pay."
            ),
            "action_type": "reassign_ot",
            "action_label": "Re-assign OT hours",
            "confidence": 0.85,
            "payload": {"employees_at_risk": tile["approaching_ot"],
                        "outlet_id": oid},
        })

    # 4. Compliance flags — resolve
    if tile["compliance_flags"] > 0:
        out.append({
            "id": f"{oid}-compliance",
            "outlet_id": oid, "outlet_name": oname,
            "severity": "urgent" if tile["compliance_flags"] >= 3 else "warn",
            "title": (f"{tile['compliance_flags']} compliance flag"
                       f"{'s' if tile['compliance_flags'] != 1 else ''} "
                       f"open at {oname}"),
            "rationale": (
                f"Open compliance flags: rest-window, minor-cutoff, or OT "
                f"trigger. Resolve before the next clock-in or expect a "
                f"wage-and-hour exposure on this pay period."
            ),
            "action_type": "resolve_flag",
            "action_label": "Open compliance review",
            "confidence": 0.95,
            "payload": {"flag_count": tile["compliance_flags"],
                        "outlet_id": oid},
        })

    # 5. Under-covered & under-spending — call in pacing
    if (tile["coverage_pct"] >= 95
            and tile["labor_pct_of_sales"] > 0
            and tile["labor_pct_of_sales"] < 22
            and tile["sales_today"] > 0):
        out.append({
            "id": f"{oid}-quality",
            "outlet_id": oid, "outlet_name": oname,
            "severity": "optimize",
            "title": f"{oname} has headroom for an extra runner",
            "rationale": (
                f"Labor is only {tile['labor_pct_of_sales']}% of sales — "
                f"well below the 28-32% sweet spot. Add a food-runner or "
                f"barback for the dinner block to lift service speed without "
                f"hurting margin."
            ),
            "action_type": "call_in",
            "action_label": "Add 1 runner",
            "confidence": 0.62,
            "payload": {"position": "food-runner", "outlet_id": oid},
        })

    return out


@router.get("/labor-brain")
def labor_brain(
    outlets: Optional[str] = Query(None,
        description="comma-separated outlet_ids"),
    department: Optional[str] = Query(None),
):
    """Returns ranked recommendations derived from the same KPI tiles
    /dashboard exposes. Frontend polls every 60s alongside the KPIs."""
    # Re-use the dashboard pipeline so the data is identical to what
    # users see in the KPI tiles. No duplicate aggregation, no drift.
    dash = schedule_dashboard(outlets=outlets, department=department)
    all_recs: list[dict] = []
    for tile in dash["tiles"]:
        all_recs.extend(_generate_labor_brain_recs(tile, dash["portfolio"]))

    ranked = _rank(all_recs)
    return {
        "generated_at": _now(),
        "scope": dash["scope"],
        "recommendations": ranked,
        "totals": {
            "all_recs": len(all_recs),
            "urgent": sum(1 for r in ranked if r["severity"] == "urgent"),
            "warn": sum(1 for r in ranked if r["severity"] == "warn"),
            "optimize": sum(1 for r in ranked if r["severity"] == "optimize"),
        },
    }


@router.post("/labor-brain/accept")
def accept_labor_brain_rec(body: LaborBrainAcceptBody):
    """1-tap accept. Writes a real PAF row + audit so the action is
    auditable and surfaces in HR's queue. Idempotent on (rec_id, day)."""
    today = datetime.now(timezone.utc).date().isoformat()
    natural_key = f"labor-brain::{body.rec_id}::{today}"

    existing = db["borrow_pafs"].find_one({"natural_key": natural_key},
                                           {"_id": 0})
    if existing:
        return {"ok": True, "idempotent": True, "paf": existing}

    paf_id = _uid("lbpaf")
    paf = {
        "id": paf_id,
        "natural_key": natural_key,
        "source": "labor-brain",
        "tenant_id": "default",
        "rec_id": body.rec_id,
        "outlet_id": body.outlet_id,
        "action_type": body.action_type,
        "rationale": body.rationale,
        "payload": body.payload,
        "status": "pending",
        "requested_by": body.accepted_by or "labor-brain-operator",
        "created_at": _now(),
    }
    try:
        db["borrow_pafs"].insert_one(paf.copy())
    except Exception:
        pass

    # Audit log for IT / compliance surface
    try:
        db["labor_brain_decisions"].insert_one({
            "id": _uid("lbd"),
            "rec_id": body.rec_id,
            "outlet_id": body.outlet_id,
            "action_type": body.action_type,
            "accepted_by": body.accepted_by or "operator",
            "paf_id": paf_id,
            "created_at": _now(),
        })
    except Exception:
        pass

    paf.pop("_id", None)
    return {"ok": True, "idempotent": False, "paf": paf}


@router.get("/labor-brain/decisions")
def list_labor_brain_decisions(limit: int = Query(50, le=200)):
    """Audit feed of accepted recommendations."""
    try:
        rows = list(
            db["labor_brain_decisions"].find({}, {"_id": 0})
            .sort("created_at", -1).limit(limit)
        )
    except Exception:
        rows = []
    return {"decisions": rows, "count": len(rows)}
