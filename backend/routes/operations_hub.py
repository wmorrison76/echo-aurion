"""
Phase B-D: Job Share, Echo Layout, Echo Events Extras
======================================================
- Advanced Job Share: schedule, benefits, job market, coverage gaps, tip pool visibility
- Echo Layout: floor plans per event type, VIP seating, pipe/drape, holiday buffet
- Echo Events: extras/add-ons, pricing, customer complaints, compensation
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
import math

router = APIRouter(prefix="/api/operations", tags=["operations"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ══════════════════════════════════════
#  ADVANCED JOB SHARE
# ══════════════════════════════════════

DEPARTMENTS = ["banquet_foh", "banquet_boh", "restaurant_foh", "restaurant_boh", "bar", "ird", "pool", "stewarding", "engineering"]
SHIFTS = ["AM (6:00-14:30)", "PM (14:00-22:30)", "SPLIT (10:00-14:00, 17:00-22:00)", "ON-CALL"]

@router.get("/job-share/schedule")
async def get_schedule(department: Optional[str] = None, week_offset: int = 0):
    """Employee schedule view — see shifts, coverage gaps, tip pool for the week."""
    base_date = datetime.now(timezone.utc) + timedelta(weeks=week_offset)
    week_start = base_date - timedelta(days=base_date.weekday())

    # Get BEOs for the week to determine staffing needs
    week_dates = [(week_start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
    beos = list(db["beo_documents"].find(
        {"event_date": {"$in": week_dates}},
        {"_id": 0, "beo_number": 1, "event_name": 1, "event_date": 1, "guaranteed_count": 1, "room": 1, "start_time": 1}
    ))

    # Build daily staffing needs
    daily = {}
    for date_str in week_dates:
        day_beos = [b for b in beos if b.get("event_date") == date_str]
        covers = sum(b.get("guaranteed_count", 0) for b in day_beos)
        daily[date_str] = {
            "date": date_str,
            "day_name": (week_start + timedelta(days=week_dates.index(date_str))).strftime("%A"),
            "events": day_beos,
            "total_covers": covers,
            "staffing_needs": {
                "banquet_foh": {"servers": max(2, covers // 18), "captains": max(1, covers // 40), "bartenders": max(1, len(day_beos))},
                "banquet_boh": {"cooks": max(2, covers // 60), "prep": max(1, covers // 100), "expediter": 1 if covers > 100 else 0},
                "stewarding": {"dishwashers": max(2, covers // 80), "runners": max(1, covers // 120)},
            },
            "coverage_status": "full" if covers < 200 else ("tight" if covers < 400 else "understaffed"),
            "tip_pool_estimate": round(covers * 52 * 0.16 / max(max(2, covers // 18) + max(1, covers // 40), 1), 2) if covers > 0 else 0,
        }

    # Job openings / coverage gaps
    coverage_gaps = []
    for date_str, day in daily.items():
        if day["coverage_status"] in ["tight", "understaffed"]:
            needs = day["staffing_needs"]
            for dept, roles in needs.items():
                for role, count in roles.items():
                    if count > 3:  # Likely short
                        coverage_gaps.append({
                            "date": date_str, "department": dept, "role": role,
                            "needed": count, "estimated_short": max(1, count - 3),
                            "shift": "PM (14:00-22:30)", "tip_pool_estimate": day["tip_pool_estimate"],
                        })

    return {
        "week_start": week_dates[0],
        "week_end": week_dates[-1],
        "daily_schedule": daily,
        "coverage_gaps": coverage_gaps,
        "total_weekly_events": len(beos),
        "total_weekly_covers": sum(d["total_covers"] for d in daily.values()),
    }


@router.get("/job-share/benefits")
async def employee_benefits():
    """Employee benefits overview visible in job share app."""
    return {
        "benefits": [
            {"category": "Health", "items": [
                {"name": "Medical Insurance", "description": "PPO plan — employee + family", "employer_contribution": "70%"},
                {"name": "Dental", "description": "Full coverage", "employer_contribution": "100%"},
                {"name": "Vision", "description": "Annual exam + frames", "employer_contribution": "80%"},
            ]},
            {"category": "Financial", "items": [
                {"name": "401(k)", "description": "6% match after 1 year", "employer_contribution": "6% match"},
                {"name": "Tip Pool", "description": "Department-specific tip pool distribution per shift worked"},
                {"name": "Employee Dining", "description": "50% off all F&B outlets during shift", "employer_contribution": "50%"},
            ]},
            {"category": "Time Off", "items": [
                {"name": "PTO", "description": "15 days/year (Year 1), 20 days (Year 3+)"},
                {"name": "Sick Leave", "description": "5 days/year"},
                {"name": "Holiday Pay", "description": "Time and a half on recognized holidays"},
            ]},
            {"category": "Development", "items": [
                {"name": "Certification Support", "description": "Up to $2,000/year for hospitality certifications"},
                {"name": "Cross-Training", "description": "Earn shift in other departments for schedule flexibility"},
                {"name": "Promotion Track", "description": "Server → Captain → Supervisor → Manager pathway"},
            ]},
        ],
    }


@router.get("/job-share/marketplace")
async def job_marketplace():
    """Internal job market — open shifts, cross-department opportunities."""
    # Generate from coverage gaps
    schedule = await get_schedule()
    gaps = schedule.get("coverage_gaps", [])

    open_shifts = []
    for gap in gaps:
        open_shifts.append({
            "id": f"shift-{_uid()}",
            "date": gap["date"],
            "department": gap["department"],
            "role": gap["role"],
            "shift": gap["shift"],
            "estimated_tips": f"${gap['tip_pool_estimate']:.2f}/person",
            "status": "open",
            "urgency": "high" if gap["estimated_short"] > 2 else "medium",
            "cross_train_eligible": True,
        })

    # Permanent openings
    permanent = [
        {"id": f"job-{_uid()}", "title": "Banquet Server", "department": "banquet_foh", "type": "full_time",
         "hourly_rate": "$5.54 + tips", "avg_tips": "$18-25/hr", "shift": "PM",
         "requirements": ["1+ year banquet experience", "Must be available weekends"]},
        {"id": f"job-{_uid()}", "title": "Line Cook II", "department": "banquet_boh", "type": "full_time",
         "hourly_rate": "$22.00", "shift": "AM/PM rotating",
         "requirements": ["Culinary degree or 3+ years experience", "Knife skills certification"]},
    ]

    return {
        "open_shifts": open_shifts,
        "permanent_openings": permanent,
        "total_open_shifts": len(open_shifts),
    }


# ══════════════════════════════════════
#  ECHO LAYOUT — FLOOR PLANS & VIP
# ══════════════════════════════════════

ROOM_TEMPLATES = {
    "Harbour Lawn": {"max_capacity": 350, "sq_ft": 8000, "outdoor": True, "power_outlets": 8, "stage_capable": True},
    "Aviva Ballroom & Lawn": {"max_capacity": 500, "sq_ft": 12000, "outdoor": False, "ballroom_sq_ft": 8000, "lawn_sq_ft": 4000, "power_outlets": 16, "stage_capable": True, "divisible": True},
    "Tavistock Ballroom": {"max_capacity": 400, "sq_ft": 10000, "outdoor": False, "power_outlets": 12, "stage_capable": True},
    "Crystal Ballroom": {"max_capacity": 600, "sq_ft": 15000, "outdoor": False, "power_outlets": 20, "stage_capable": True, "divisible": True},
    "Adult Pool Deck": {"max_capacity": 200, "sq_ft": 5000, "outdoor": True, "power_outlets": 4, "stage_capable": False},
    "Pier Deck": {"max_capacity": 150, "sq_ft": 4000, "outdoor": True, "power_outlets": 4, "stage_capable": False},
    "Coastal Room": {"max_capacity": 250, "sq_ft": 6000, "outdoor": False, "power_outlets": 10, "stage_capable": True},
}

EVENT_FLOOR_PLANS = {
    "corporate_conference": [
        {"name": "Crescent Rounds with Stage", "layout": "crescent_stage",
         "description": "30 crescent rounds of 7 facing stage with podium. Theater overflow seating in rear. AV tech tables flanking stage.",
         "tables": 30, "chairs_per_table": 7, "capacity": 210, "stage": "12x32 with stairs both sides",
         "extras": ["(2) Water Stations", "AV Tech table with 2 chairs", "P66 pens/notepads/mints", "Stage/riser"]},
        {"name": "Classroom Style", "layout": "classroom",
         "description": "6ft tables in rows facing stage with presenter podium and screens.",
         "tables": 35, "chairs_per_table": 3, "capacity": 105, "stage": "8x16",
         "extras": ["Notepads & pens", "Water pitchers per table", "Power strips for laptops"]},
        {"name": "U-Shape Executive", "layout": "u_shape",
         "description": "Large U-shape conference table for intimate executive sessions.",
         "tables": 1, "chairs_per_table": 40, "capacity": 40, "stage": "None — presenter at open end",
         "extras": ["Microphone at each seat", "Bottled water per person", "Screen at open end"]},
        {"name": "Theater Style", "layout": "theater",
         "description": "Maximum seating — chairs only in rows facing stage.",
         "tables": 0, "chairs_per_table": 0, "capacity": 400, "stage": "16x32 full stage",
         "extras": ["(4) Aisle runners", "Reserved front row", "Standing room overflow"]},
        {"name": "Hybrid Rounds + Breakout", "layout": "hybrid",
         "description": "Main rounds in center, breakout pods in corners, lounge area in rear.",
         "tables": 20, "chairs_per_table": 8, "capacity": 160, "stage": "8x16 presentation area",
         "extras": ["(4) Breakout pods with whiteboards", "Lounge sofas in rear", "Coffee station"]},
    ],
    "wedding": [
        {"name": "Grand Reception with Head Table", "layout": "wedding_grand",
         "description": "Head table on elevated stage for bridal party. Rounds of 10 for guests. Dance floor center. Band/DJ stage.",
         "tables": 25, "chairs_per_table": 10, "capacity": 250,
         "head_table": {"on_stage": True, "seats": 14, "elevated": True, "sweetheart_option": True},
         "extras": ["Dance floor 20x20", "Band/DJ stage 12x16", "Pipe & drape backdrop", "Sweetheart table option", "Cake table", "Gift table", "Photo booth area"]},
        {"name": "Intimate Garden", "layout": "wedding_garden",
         "description": "Outdoor ceremony transitioning to reception. Ceremony chairs facing arch, then flip to dinner rounds.",
         "tables": 15, "chairs_per_table": 10, "capacity": 150,
         "head_table": {"on_stage": False, "seats": 10, "elevated": False},
         "extras": ["Ceremony arch/arbor", "Aisle runner", "Cocktail hour lounge", "String lights"]},
        {"name": "Formal Ballroom", "layout": "wedding_formal",
         "description": "Classic ballroom wedding. Head table on stage. Grand entrance double doors.",
         "tables": 30, "chairs_per_table": 10, "capacity": 300,
         "head_table": {"on_stage": True, "seats": 16, "elevated": True},
         "extras": ["Grand entrance doors", "Chandelier lighting", "Pipe & drape full perimeter", "Uplighting package", "Photo booth", "Band stage 16x20"]},
        {"name": "Cocktail-Style Reception", "layout": "wedding_cocktail",
         "description": "Standing cocktail-style with food stations. Limited seating for elderly/VIP.",
         "tables": 10, "chairs_per_table": 4, "capacity": 250,
         "extras": ["(6) Food stations", "(3) Bars", "Lounge pods", "High-top cocktail tables x20"]},
        {"name": "Destination Beach", "layout": "wedding_beach",
         "description": "Ceremony on beach/pier, reception on deck. Tiki bar. Bonfire pit.",
         "tables": 20, "chairs_per_table": 8, "capacity": 160,
         "extras": ["Beach ceremony setup", "Tiki bar", "Bonfire pit", "Tiki torches", "Sand-friendly dance floor"]},
    ],
    "holiday_gala": [
        {"name": "Holiday Grand Buffet", "layout": "holiday_buffet",
         "description": "Full holiday buffet with carving stations, chafers, heat lamps. Band/DJ stage. Photo booth. Action stations.",
         "tables": 25, "chairs_per_table": 10, "capacity": 250,
         "buffet_setup": {
             "chafers": 12, "heat_lamps": 6, "carving_stations": 2, "action_stations": 3,
             "ice_displays": 1, "dessert_station": 1,
             "layout": "Dual-sided buffet along wall. Carving on ends. Action stations as islands.",
         },
         "entertainment": {
             "band_stage": "16x20 with PA system",
             "dj_booth": "8x8 elevated platform",
             "photo_booth": "10x10 enclosed with props",
             "dance_floor": "24x24 parquet",
         },
         "extras": ["Pipe & drape full perimeter", "Uplighting", "Holiday decor package", "Coat check", "Valet station"]},
        {"name": "NYE Countdown Gala", "layout": "nye_gala",
         "description": "New Year's Eve with midnight countdown stage. Champagne toast stations. Confetti drop.",
         "tables": 30, "chairs_per_table": 10, "capacity": 300,
         "extras": ["Countdown clock on stage screen", "Champagne toast station x4", "Confetti drop system", "Balloon drop", "Party favor baskets", "Photo booth"]},
        {"name": "Valentines Dinner", "layout": "valentines",
         "description": "Intimate plated dinner. Small rounds of 4-6. Candle centerpieces. Live jazz trio.",
         "tables": 40, "chairs_per_table": 4, "capacity": 160,
         "extras": ["Rose petal aisle", "Candle centerpieces", "Jazz trio in corner", "Dessert cart service"]},
        {"name": "Thanksgiving Family Feast", "layout": "thanksgiving",
         "description": "Long communal tables for family-style service. Turkey carving station. Pie bar.",
         "tables": 12, "chairs_per_table": 20, "capacity": 240,
         "extras": ["Communal family-style platters", "Turkey carving x3", "Pie & dessert bar", "Kids activity corner"]},
        {"name": "4th of July Pool Party", "layout": "july4th",
         "description": "Outdoor pool deck with BBQ stations, lawn games, live band. Fireworks viewing area.",
         "tables": 25, "chairs_per_table": 8, "capacity": 200,
         "extras": ["BBQ grill stations x4", "Lawn games area", "Band stage", "Fireworks viewing section", "Tiki bars x2"]},
    ],
}


@router.get("/layout/floor-plans")
async def get_floor_plans(event_type: Optional[str] = None):
    """Get 5 floor plan templates per event type."""
    if event_type and event_type in EVENT_FLOOR_PLANS:
        return {"event_type": event_type, "plans": EVENT_FLOOR_PLANS[event_type]}
    return {"event_types": list(EVENT_FLOOR_PLANS.keys()), "all_plans": EVENT_FLOOR_PLANS}


@router.get("/layout/rooms")
async def get_rooms():
    """Available rooms with specs."""
    return {"rooms": ROOM_TEMPLATES}


@router.post("/layout/generate")
async def generate_layout(body: dict = {}):
    """Generate a specific layout for a BEO, attaching to the event."""
    beo_number = body.get("beo_number")
    plan_name = body.get("plan_name", "")
    event_type = body.get("event_type", "corporate_conference")
    vip_guests = body.get("vip_guests", [])
    pipe_drape = body.get("pipe_drape", False)

    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    plans = EVENT_FLOOR_PLANS.get(event_type, EVENT_FLOOR_PLANS["corporate_conference"])
    selected = next((p for p in plans if p["name"] == plan_name), plans[0])

    # VIP seating assignments
    vip_assignments = []
    for i, guest in enumerate(vip_guests):
        vip_assignments.append({
            "guest": guest,
            "table": 1 if event_type == "corporate_conference" else "Head Table",
            "seat": i + 1,
            "notes": "Front row / Head table priority seating",
        })

    layout = {
        "id": f"layout-{_uid()}",
        "beo_number": beo_number,
        "event_name": beo.get("event_name", ""),
        "room": beo.get("room", ""),
        "event_type": event_type,
        "plan": selected,
        "vip_seating": vip_assignments,
        "pipe_and_drape": pipe_drape,
        "total_capacity": selected.get("capacity", 0),
        "guaranteed_count": beo.get("guaranteed_count", 0),
        "created_at": _now(),
    }

    db["event_layouts_generated"].insert_one({**layout, "_id": layout["id"]})
    return layout


# ══════════════════════════════════════
#  ECHO EVENTS — EXTRAS, ADD-ONS, PRICING
# ══════════════════════════════════════

EXTRAS_CATALOG = [
    {"id": "ext-pipe-drape", "category": "Decor", "name": "Pipe & Drape (per linear ft)", "price": 18.00, "unit": "linear_ft", "min_qty": 20},
    {"id": "ext-uplighting", "category": "Decor", "name": "LED Uplighting Package", "price": 850.00, "unit": "package", "min_qty": 1},
    {"id": "ext-centerpiece", "category": "Decor", "name": "Floral Centerpiece", "price": 75.00, "unit": "each", "min_qty": 10},
    {"id": "ext-linen-premium", "category": "Decor", "name": "Premium Linen Upgrade", "price": 12.00, "unit": "per_table", "min_qty": 1},
    {"id": "ext-dance-floor", "category": "Entertainment", "name": "Dance Floor (20x20)", "price": 1200.00, "unit": "each", "min_qty": 1},
    {"id": "ext-dance-floor-lg", "category": "Entertainment", "name": "Dance Floor (24x24)", "price": 1600.00, "unit": "each", "min_qty": 1},
    {"id": "ext-band-stage", "category": "Entertainment", "name": "Band/DJ Stage (16x20)", "price": 2200.00, "unit": "each", "min_qty": 1},
    {"id": "ext-photo-booth", "category": "Entertainment", "name": "Photo Booth (enclosed + props)", "price": 1500.00, "unit": "event", "min_qty": 1},
    {"id": "ext-dj", "category": "Entertainment", "name": "DJ Package (4 hours)", "price": 1800.00, "unit": "event", "min_qty": 1},
    {"id": "ext-live-band", "category": "Entertainment", "name": "Live Band (4-piece, 3 hours)", "price": 4500.00, "unit": "event", "min_qty": 1},
    {"id": "ext-carving", "category": "Food Service", "name": "Carving Station Attendant", "price": 200.00, "unit": "each", "min_qty": 1},
    {"id": "ext-chef-action", "category": "Food Service", "name": "Chef Action Station", "price": 450.00, "unit": "each", "min_qty": 1},
    {"id": "ext-chafer", "category": "Food Service", "name": "Chafer (full-size)", "price": 35.00, "unit": "each", "min_qty": 1},
    {"id": "ext-heat-lamp", "category": "Food Service", "name": "Heat Lamp Tower", "price": 85.00, "unit": "each", "min_qty": 1},
    {"id": "ext-ice-display", "category": "Food Service", "name": "Ice Sculpture / Display", "price": 650.00, "unit": "each", "min_qty": 1},
    {"id": "ext-champagne-toast", "category": "Beverage", "name": "Champagne Toast (per person)", "price": 18.00, "unit": "per_person", "min_qty": 50},
    {"id": "ext-cocktail-hour", "category": "Beverage", "name": "Cocktail Hour Package (1hr)", "price": 35.00, "unit": "per_person", "min_qty": 50},
    {"id": "ext-premium-bar", "category": "Beverage", "name": "Premium Bar Upgrade", "price": 15.00, "unit": "per_person", "min_qty": 50},
    {"id": "ext-valet", "category": "Services", "name": "Valet Parking", "price": 12.00, "unit": "per_car", "min_qty": 20},
    {"id": "ext-coat-check", "category": "Services", "name": "Coat Check Attendant", "price": 250.00, "unit": "event", "min_qty": 1},
    {"id": "ext-av-basic", "category": "AV", "name": "Basic AV Package (screen + projector + mic)", "price": 800.00, "unit": "event", "min_qty": 1},
    {"id": "ext-av-premium", "category": "AV", "name": "Premium AV (dual screens + wireless mics + streaming)", "price": 2500.00, "unit": "event", "min_qty": 1},
    {"id": "ext-confetti-drop", "category": "Special Effects", "name": "Confetti/Balloon Drop", "price": 450.00, "unit": "each", "min_qty": 1},
    {"id": "ext-fireworks", "category": "Special Effects", "name": "Fireworks Display (15 min)", "price": 8500.00, "unit": "event", "min_qty": 1},
    {"id": "ext-sparklers", "category": "Special Effects", "name": "Sparkler Exit Package", "price": 350.00, "unit": "event", "min_qty": 1},
]


@router.get("/events/extras")
async def list_extras(category: Optional[str] = None):
    """Full catalog of event extras and add-ons with pricing."""
    filtered = [e for e in EXTRAS_CATALOG if not category or e["category"].lower() == category.lower()]
    categories = sorted(set(e["category"] for e in EXTRAS_CATALOG))
    return {"extras": filtered, "categories": categories, "total": len(filtered)}


@router.post("/events/extras/quote")
async def generate_extras_quote(body: dict = {}):
    """Generate quote for selected extras on a BEO."""
    beo_number = body.get("beo_number")
    selected_extras = body.get("extras", [])  # [{"id": "ext-pipe-drape", "qty": 100}, ...]

    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0}) if beo_number else None
    covers = beo.get("guaranteed_count", 100) if beo else body.get("covers", 100)

    line_items = []
    total = 0
    for sel in selected_extras:
        extra = next((e for e in EXTRAS_CATALOG if e["id"] == sel["id"]), None)
        if not extra:
            continue
        qty = sel.get("qty", 1)
        if extra["unit"] == "per_person":
            qty = covers
        elif extra["unit"] == "per_table":
            qty = max(1, covers // 10)
        subtotal = round(extra["price"] * qty, 2)
        line_items.append({
            "extra_id": extra["id"], "name": extra["name"], "category": extra["category"],
            "unit_price": extra["price"], "quantity": qty, "unit": extra["unit"],
            "subtotal": subtotal,
        })
        total += subtotal

    service_charge = round(total * 0.26, 2)
    grand_total = round(total + service_charge, 2)

    return {
        "beo_number": beo_number,
        "covers": covers,
        "line_items": line_items,
        "subtotal": round(total, 2),
        "service_charge": service_charge,
        "grand_total": grand_total,
    }


@router.post("/events/pricing/adjust")
async def adjust_event_pricing(body: dict = {}):
    """Event manager adjusts pricing on a BEO — discount, markup, or custom pricing."""
    beo_number = body.get("beo_number")
    adjustment_type = body.get("type", "discount")  # discount, markup, custom
    value = body.get("value", 0)  # percentage for discount/markup, dollar for custom
    reason = body.get("reason", "")
    approved_by = body.get("approved_by", "")

    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    original = beo.get("financial", {}).get("total", 0)
    if adjustment_type == "discount":
        adjusted = round(original * (1 - value / 100), 2)
    elif adjustment_type == "markup":
        adjusted = round(original * (1 + value / 100), 2)
    else:
        adjusted = value

    adjustment = {
        "id": f"adj-{_uid()}", "beo_number": beo_number,
        "type": adjustment_type, "value": value,
        "original_total": original, "adjusted_total": adjusted,
        "difference": round(adjusted - original, 2),
        "reason": reason, "approved_by": approved_by,
        "created_at": _now(),
    }
    db["pricing_adjustments"].insert_one({**adjustment, "_id": adjustment["id"]})

    return adjustment


# ══════════════════════════════════════
#  CUSTOMER COMPLAINTS & COMPENSATION
# ══════════════════════════════════════

@router.post("/events/complaint")
async def log_customer_complaint(body: dict = {}):
    """Log customer complaint — Echo Events suggests compensation based on severity and history."""
    beo_number = body.get("beo_number")
    complaint_type = body.get("type", "service")  # service, food, timing, billing, facilities
    description = body.get("description", "")
    severity = body.get("severity", "medium")
    guest_name = body.get("guest_name", "")
    guest_contact = body.get("guest_contact", "")

    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0}) if beo_number else None
    event_revenue = beo.get("financial", {}).get("total", 0) if beo else 0

    # Check complaint history for this account
    account = beo.get("account", "") if beo else ""
    history = list(db["customer_complaints"].find({"account": account}, {"_id": 0}).limit(10)) if account else []
    is_repeat = len(history) > 0

    # Compensation suggestions
    comp_table = {
        ("service", "low"): {"comp_pct": 5, "comp_type": "Future event discount", "action": "Manager apology letter + 5% future discount"},
        ("service", "medium"): {"comp_pct": 10, "comp_type": "Partial comp", "action": "GM call + 10% credit on next event"},
        ("service", "high"): {"comp_pct": 20, "comp_type": "Significant comp", "action": "GM visit + 20% credit + complimentary spa package"},
        ("food", "low"): {"comp_pct": 5, "comp_type": "Course comp", "action": "Comp affected course + chef apology"},
        ("food", "medium"): {"comp_pct": 15, "comp_type": "Meal comp", "action": "Comp affected meal + future dining credit"},
        ("food", "high"): {"comp_pct": 25, "comp_type": "Full comp", "action": "Full meal comp + GM visit + written plan for correction"},
        ("timing", "low"): {"comp_pct": 5, "comp_type": "Beverage comp", "action": "Complimentary round of beverages"},
        ("timing", "medium"): {"comp_pct": 10, "comp_type": "Service comp", "action": "Comp dessert course + expedited service recovery"},
        ("timing", "high"): {"comp_pct": 20, "comp_type": "Event comp", "action": "20% event credit + priority scheduling for next event"},
        ("billing", "low"): {"comp_pct": 3, "comp_type": "Correction", "action": "Correct billing error + 3% courtesy discount"},
        ("billing", "medium"): {"comp_pct": 5, "comp_type": "Adjustment", "action": "Full billing correction + 5% goodwill credit"},
        ("facilities", "low"): {"comp_pct": 5, "comp_type": "Facility credit", "action": "Room rental credit on next event"},
        ("facilities", "medium"): {"comp_pct": 15, "comp_type": "Facility comp", "action": "Full room rental comp + facility upgrades"},
        ("facilities", "high"): {"comp_pct": 25, "comp_type": "Full comp", "action": "Full facility comp + GM oversight for next event"},
    }

    suggestion = comp_table.get((complaint_type, severity), comp_table[("service", "medium")])

    # Increase comp for repeat complainers
    if is_repeat:
        suggestion = {**suggestion, "comp_pct": min(50, suggestion["comp_pct"] + 10),
                      "action": suggestion["action"] + " [REPEAT COMPLAINT — escalate to Director level]"}

    comp_amount = round(event_revenue * suggestion["comp_pct"] / 100, 2)

    complaint = {
        "id": f"comp-{_uid()}", "beo_number": beo_number,
        "account": account, "guest_name": guest_name, "guest_contact": guest_contact,
        "type": complaint_type, "severity": severity,
        "description": description,
        "event_revenue": event_revenue,
        "suggested_comp": suggestion,
        "comp_amount": comp_amount,
        "is_repeat_complaint": is_repeat,
        "previous_complaints": len(history),
        "status": "open",
        "created_at": _now(),
    }
    db["customer_complaints"].insert_one({**complaint, "_id": complaint["id"]})

    return complaint
