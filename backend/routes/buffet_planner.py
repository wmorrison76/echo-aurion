"""
LUCCCA Banquet Buffet Planning Engine
======================================
Deterministic planning framework for banquet/catering buffet service.
Computes: planning covers -> take rates -> guest servings ->
production servings -> prepared qty -> purchase qty ->
opening set & replenishment waves.

Implements the full 9-step calculation flow from the LUCCCA Buffet Schema v1.
"""
import os
import math
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/buffet-planner", tags=["buffet-planner"])

from database import db

buffet_items_col = db["buffet_menu_items"]
buffet_plans_col = db["buffet_plans"]
portion_lib = db["portion_library"]

def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())

# ─── Planning Policies ──────────────────────────────────────────────

ATTENDANCE_FACTORS = {
    "guaranteed_only": 1.0,
    "expected_known": 1.0,
    "walk_in_risk_low": 1.02,
    "walk_in_risk_medium": 1.05,
    "walk_in_risk_high": 1.08,
}

BASE_OVERAGE = {
    "single_pass_buffet": 0.05,
    "multi_pass_buffet": 0.08,
    "staff_attended_buffet": 0.04,
    "action_station_buffet": 0.10,
    "hybrid_buffet_plated": 0.06,
    "reception_to_buffet": 0.10,
    "brunch_buffet": 0.08,
    "themed_buffet": 0.09,
    "late_night_buffet": 0.06,
}

LUXURY_OVERAGE = {
    "standard": 0.0,
    "upscale": 0.01,
    "luxury": 0.02,
    "ultra_luxury": 0.04,
}

DURATION_MODIFIER = {
    "under_45_min": -0.05,
    "45_to_75_min": 0.0,
    "76_to_120_min": 0.05,
    "over_120_min": 0.10,
}

CHILDREN_FACTOR = 0.6
TEEN_FACTOR = 1.15
SENIOR_FACTOR = 0.9
STAFF_FACTOR = 1.0

SERVICE_STYLE_PRESETS = {
    "single_pass_buffet": {"return_pass_factor": 0.95, "opening_display_pct": 0.65},
    "multi_pass_buffet": {"return_pass_factor": 1.10, "opening_display_pct": 0.55},
    "staff_attended_buffet": {"return_pass_factor": 0.95, "opening_display_pct": 0.60},
    "action_station_buffet": {"return_pass_factor": 1.05, "opening_display_pct": 0.45},
    "hybrid_buffet_plated": {"return_pass_factor": 1.0, "opening_display_pct": 0.55},
    "reception_to_buffet": {"return_pass_factor": 1.05, "opening_display_pct": 0.50},
    "brunch_buffet": {"return_pass_factor": 1.10, "opening_display_pct": 0.55},
    "themed_buffet": {"return_pass_factor": 1.05, "opening_display_pct": 0.50},
    "late_night_buffet": {"return_pass_factor": 1.0, "opening_display_pct": 0.55},
}

CATEGORY_DEFAULTS = {
    "main_protein": {"base_take_rate": 0.78, "avg_servings_if_taken": 1.0, "default_portion_oz": 5.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.50},
    "secondary_protein": {"base_take_rate": 0.52, "avg_servings_if_taken": 0.9, "default_portion_oz": 3.5, "item_overage_modifier": 0.02, "opening_display_pct": 0.45},
    "vegetarian_entree": {"base_take_rate": 0.28, "avg_servings_if_taken": 0.9, "default_portion_oz": 4.5, "item_overage_modifier": 0.03, "opening_display_pct": 0.45},
    "starch": {"base_take_rate": 0.72, "avg_servings_if_taken": 1.0, "default_portion_oz": 3.5, "item_overage_modifier": 0.01, "opening_display_pct": 0.55},
    "vegetable": {"base_take_rate": 0.68, "avg_servings_if_taken": 0.95, "default_portion_oz": 3.0, "item_overage_modifier": 0.01, "opening_display_pct": 0.55},
    "salad": {"base_take_rate": 0.62, "avg_servings_if_taken": 0.95, "default_portion_oz": 3.0, "item_overage_modifier": 0.02, "opening_display_pct": 0.60},
    "bread": {"base_take_rate": 0.58, "avg_servings_if_taken": 1.2, "default_portion_each": 1.0, "item_overage_modifier": 0.02, "opening_display_pct": 0.65},
    "dessert_mini": {"base_take_rate": 0.85, "avg_servings_if_taken": 1.8, "default_portion_each": 1.0, "item_overage_modifier": 0.08, "opening_display_pct": 0.50},
    "dessert_slice": {"base_take_rate": 0.55, "avg_servings_if_taken": 1.0, "default_portion_oz": 3.0, "item_overage_modifier": 0.05, "opening_display_pct": 0.50},
    "condiment_sauce": {"base_take_rate": 0.45, "avg_servings_if_taken": 1.0, "default_portion_oz": 1.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.40},
    "kids_item": {"base_take_rate": 0.85, "avg_servings_if_taken": 1.0, "default_portion_oz": 3.5, "item_overage_modifier": 0.03, "opening_display_pct": 0.55},
    "carving_station": {"base_take_rate": 0.62, "avg_servings_if_taken": 1.0, "default_portion_oz": 5.0, "item_overage_modifier": 0.05, "opening_display_pct": 0.45},
    "action_station_base": {"base_take_rate": 0.42, "avg_servings_if_taken": 1.0, "default_portion_oz": 5.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.40},
    "action_station_topping": {"base_take_rate": 0.35, "avg_servings_if_taken": 1.0, "default_portion_each": 3.0, "item_overage_modifier": 0.06, "opening_display_pct": 0.45},
}

GUEST_BEHAVIOR = {
    "family_event": {"kids_item": 1.2, "dessert_mini": 1.1, "vegetable": 0.95},
    "corporate_event": {"salad": 1.08, "dessert_mini": 0.9, "bread": 0.95},
    "wedding_or_social_luxury": {"main_protein": 1.1, "secondary_protein": 1.1, "dessert_mini": 1.15, "_overage_mult": 1.1},
    "late_night": {"kids_item": 1.1, "starch": 1.15, "vegetable": 0.7, "salad": 0.6},
}

STATION_THROUGHPUT = {
    "omelet": 18,
    "pasta": 20,
    "taco": 30,
    "carving": 25,
    "risotto": 16,
}

LINE_RECOMMENDATIONS = [
    {"max_guests": 60, "lines": 1},
    {"max_guests": 140, "lines": 2},
    {"max_guests": 240, "lines": 3},
    {"max_guests": 400, "lines": 4},
]


# ─── Models ─────────────────────────────────────────────────────────

class GuestProfile(BaseModel):
    adult_count: Optional[int] = None
    children_count: int = 0
    teen_count: int = 0
    senior_count: int = 0
    staff_vendor_meals: int = 0

class BuffetMenuItem(BaseModel):
    item_id: str
    item_name: Optional[str] = None
    category_role: Optional[str] = None
    popularity_factor: float = 1.0
    dietary_fit_factor: float = 1.0
    placement_factor: float = 1.0
    menu_competition_modifier: float = 1.0

class BuffetPlanInput(BaseModel):
    event_name: str
    service_date: str
    guest_count_guaranteed: int
    guest_count_expected: Optional[int] = None
    service_style: str = "multi_pass_buffet"
    meal_period: str = "dinner"
    luxury_tier: str = "standard"
    event_duration_minutes: int = 90
    guest_profile: Optional[GuestProfile] = None
    guest_behavior: Optional[str] = None  # family_event, corporate_event, etc.
    walk_in_risk: str = "guaranteed_only"
    menu_items: list[BuffetMenuItem] = []
    station_count: int = 1
    line_count: Optional[int] = None


# ─── Core Calculation Engine ────────────────────────────────────────

def _get_duration_key(minutes: int) -> str:
    if minutes < 45:
        return "under_45_min"
    elif minutes <= 75:
        return "45_to_75_min"
    elif minutes <= 120:
        return "76_to_120_min"
    return "over_120_min"


def _compute_planning_covers(data: BuffetPlanInput) -> dict:
    """Step 1: Determine planning covers (adult-equivalent guests)."""
    gp = data.guest_profile or GuestProfile()
    adult_count = gp.adult_count if gp.adult_count is not None else data.guest_count_guaranteed

    adult_equiv = (
        adult_count
        + (gp.children_count * CHILDREN_FACTOR)
        + (gp.teen_count * TEEN_FACTOR)
        + (gp.senior_count * SENIOR_FACTOR)
        + (gp.staff_vendor_meals * STAFF_FACTOR)
    )

    attendance_factor = ATTENDANCE_FACTORS.get(data.walk_in_risk, 1.0)
    base = max(data.guest_count_guaranteed, (data.guest_count_expected or 0))
    planning_covers = round(max(adult_equiv, base) * attendance_factor, 1)

    return {
        "adult_equivalent": round(adult_equiv, 1),
        "attendance_factor": attendance_factor,
        "planning_covers": planning_covers,
        "breakdown": {
            "adults": adult_count,
            "children": gp.children_count,
            "teens": gp.teen_count,
            "seniors": gp.senior_count,
            "staff_vendor": gp.staff_vendor_meals,
        },
    }


def _compute_item_plan(item_data: dict, planning_covers: float,
                        service_style: str, luxury_tier: str,
                        duration_minutes: int, guest_behavior: Optional[str]) -> dict:
    """Steps 2-9: Full item-level calculation."""
    role = item_data.get("category_role", "starch")
    cat_defaults = CATEGORY_DEFAULTS.get(role, CATEGORY_DEFAULTS["starch"])

    # Step 2: Category role already assigned via item_data
    # Step 3: Take rate
    base_take_rate = item_data.get("base_take_rate", cat_defaults["base_take_rate"])
    popularity = item_data.get("popularity_factor", item_data.get("popularity_factor_default", 1.0))
    dietary_fit = item_data.get("dietary_fit_factor", item_data.get("dietary_fit_factor_default", 1.0))
    placement = item_data.get("placement_factor", item_data.get("placement_factor_default", 1.0))
    competition = item_data.get("menu_competition_modifier", item_data.get("menu_competition_modifier_default", 1.0))

    # Apply guest behavior modifier
    behavior_mult = 1.0
    if guest_behavior and guest_behavior in GUEST_BEHAVIOR:
        bmod = GUEST_BEHAVIOR[guest_behavior]
        behavior_mult = bmod.get(role, 1.0)

    take_rate = min(base_take_rate * popularity * dietary_fit * placement * behavior_mult, 1.25)

    # Step 4: Average servings if taken
    base_servings = item_data.get("avg_servings_if_taken", cat_defaults["avg_servings_if_taken"])
    style_preset = SERVICE_STYLE_PRESETS.get(service_style, SERVICE_STYLE_PRESETS["multi_pass_buffet"])
    return_pass = style_preset["return_pass_factor"]
    duration_mod_val = DURATION_MODIFIER.get(_get_duration_key(duration_minutes), 0.0)
    avg_servings = base_servings * return_pass * (1 + duration_mod_val) * competition

    # Step 5: Guest servings
    guest_servings = round(planning_covers * take_rate * avg_servings, 1)

    # Step 6: Production servings (apply overage)
    base_overage = BASE_OVERAGE.get(service_style, 0.08)
    item_overage = item_data.get("item_overage_modifier", cat_defaults["item_overage_modifier"])
    luxury_mod = LUXURY_OVERAGE.get(luxury_tier, 0.0)
    overage_behavior = 1.0
    if guest_behavior and guest_behavior in GUEST_BEHAVIOR:
        overage_behavior = GUEST_BEHAVIOR[guest_behavior].get("_overage_mult", 1.0)
    total_overage = (base_overage + item_overage + luxury_mod) * overage_behavior
    production_servings = round(guest_servings * (1 + total_overage), 1)

    # Step 7: Prepared quantity
    portion_uom = item_data.get("portion_uom", "oz")
    portion_size = item_data.get("buffet_portion_size",
                                  cat_defaults.get("default_portion_oz",
                                  cat_defaults.get("default_portion_each", 4.0)))

    if portion_uom in ("oz", "fl_oz"):
        prepared_oz = round(production_servings * portion_size, 1)
        prepared_lb = round(prepared_oz / 16, 2)
        prepared_qty = prepared_oz
        prepared_display = f"{prepared_lb} lb ({prepared_oz} oz)"
    elif portion_uom in ("each", "piece", "slice"):
        prepared_qty = math.ceil(production_servings * portion_size)
        prepared_display = f"{prepared_qty} {portion_uom}"
        prepared_oz = 0
        prepared_lb = 0
    else:
        prepared_qty = round(production_servings * portion_size, 1)
        prepared_display = f"{prepared_qty} {portion_uom}"
        prepared_oz = 0
        prepared_lb = 0

    # Step 8: Purchase quantity (apply yield)
    edible_yield = item_data.get("edible_yield", 1.0)
    as_purchased_qty = round(prepared_qty / edible_yield, 2) if edible_yield > 0 else prepared_qty
    if portion_uom in ("oz", "fl_oz"):
        as_purchased_lb = round(as_purchased_qty / 16, 2)
        purchase_display = f"{as_purchased_lb} lb AP ({as_purchased_qty} oz)"
    else:
        as_purchased_lb = 0
        purchase_display = f"{math.ceil(as_purchased_qty)} {portion_uom} AP"

    # Step 9: Opening set and replenishment
    opening_pct = item_data.get("opening_display_pct",
                                 style_preset.get("opening_display_pct_default",
                                 cat_defaults.get("opening_display_pct", 0.55)))
    opening_qty = round(prepared_qty * opening_pct, 1)
    replenishment_qty = round(prepared_qty - opening_qty, 1)

    # Pan calculations
    pan_cap = item_data.get("pan_capacity", {})
    full_pan = pan_cap.get("full_pan_servings")
    half_pan = pan_cap.get("half_pan_servings")
    pan_info = {}
    if full_pan:
        pan_info["full_pans_needed"] = math.ceil(production_servings / full_pan)
        pan_info["opening_pans"] = math.ceil((production_servings * opening_pct) / full_pan)
    if half_pan:
        pan_info["half_pans_equivalent"] = math.ceil(production_servings / half_pan)

    return {
        "item_id": item_data.get("item_id", ""),
        "item_name": item_data.get("item_name", ""),
        "category_role": role,
        "portion_uom": portion_uom,
        "buffet_portion_size": portion_size,
        "take_rate": round(take_rate, 3),
        "avg_servings_if_taken": round(avg_servings, 3),
        "guest_servings": guest_servings,
        "total_overage_pct": round(total_overage, 3),
        "production_servings": production_servings,
        "prepared_qty": round(prepared_qty, 1),
        "prepared_display": prepared_display,
        "edible_yield": edible_yield,
        "as_purchased_qty": round(as_purchased_qty, 1),
        "purchase_display": purchase_display,
        "opening_display_pct": opening_pct,
        "opening_qty": round(opening_qty, 1),
        "replenishment_qty": round(replenishment_qty, 1),
        "pan_info": pan_info,
        "quality_risk": item_data.get("quality_risk", "low"),
        "cost_tier": item_data.get("cost_tier", "medium"),
        "replenishment_notes": item_data.get("replenishment_notes", []),
        "service_notes": item_data.get("service_notes", []),
    }


def _recommend_lines(guest_count: int) -> int:
    for rec in LINE_RECOMMENDATIONS:
        if guest_count <= rec["max_guests"]:
            return rec["lines"]
    return math.ceil(guest_count / 100)


# ─── Endpoints ──────────────────────────────────────────────────────

@router.post("/plan")
async def generate_buffet_plan(data: BuffetPlanInput):
    """
    Master buffet planning endpoint. Runs the full 9-step calculation:
    covers -> take rates -> guest servings -> production -> purchase -> replenishment.
    """
    # Step 1: Planning covers
    covers_result = _compute_planning_covers(data)
    planning_covers = covers_result["planning_covers"]

    # Resolve menu items from DB
    item_plans = []
    category_totals = {}

    for menu_ref in data.menu_items:
        # Look up item in DB
        db_item = buffet_items_col.find_one({"item_id": menu_ref.item_id}, {"_id": 0})
        if not db_item:
            # Try portion library
            db_item = portion_lib.find_one({"item_id": menu_ref.item_id}, {"_id": 0})

        if not db_item:
            db_item = {"item_id": menu_ref.item_id, "item_name": menu_ref.item_name or menu_ref.item_id}

        # Merge user overrides
        merged = {**db_item}
        if menu_ref.item_name:
            merged["item_name"] = menu_ref.item_name
        if menu_ref.category_role:
            merged["category_role"] = menu_ref.category_role
        merged["popularity_factor"] = menu_ref.popularity_factor
        merged["dietary_fit_factor"] = menu_ref.dietary_fit_factor
        merged["placement_factor"] = menu_ref.placement_factor
        merged["menu_competition_modifier"] = menu_ref.menu_competition_modifier

        item_plan = _compute_item_plan(
            merged, planning_covers,
            data.service_style, data.luxury_tier,
            data.event_duration_minutes, data.guest_behavior,
        )
        item_plans.append(item_plan)

        # Track category totals
        role = item_plan["category_role"]
        if role not in category_totals:
            category_totals[role] = {"items": 0, "total_production_servings": 0, "total_prepared_qty": 0}
        category_totals[role]["items"] += 1
        category_totals[role]["total_production_servings"] += item_plan["production_servings"]
        category_totals[role]["total_prepared_qty"] += item_plan["prepared_qty"]

    # Line recommendation
    recommended_lines = data.line_count or _recommend_lines(data.guest_count_guaranteed)

    # Station throughput check
    station_alerts = []
    for item in item_plans:
        if item["category_role"] in ("carving_station", "action_station_base"):
            station_type = "carving" if item["category_role"] == "carving_station" else "omelet"
            throughput = STATION_THROUGHPUT.get(station_type, 20)
            peak_demand = round(planning_covers * item["take_rate"] * 0.4, 0)  # 40% in first 15min
            if peak_demand > throughput:
                station_alerts.append({
                    "item": item["item_name"],
                    "station_type": station_type,
                    "peak_demand_15min": int(peak_demand),
                    "station_capacity_15min": throughput,
                    "recommendation": f"Add parallel station or attendant — peak demand {int(peak_demand)} exceeds capacity {throughput}/15min",
                })

    # Save plan
    plan_id = _uid()
    plan_doc = {
        "id": plan_id,
        "event_name": data.event_name,
        "service_date": data.service_date,
        "service_style": data.service_style,
        "meal_period": data.meal_period,
        "luxury_tier": data.luxury_tier,
        "guest_count_guaranteed": data.guest_count_guaranteed,
        "planning_covers": covers_result,
        "item_plans": item_plans,
        "category_totals": category_totals,
        "recommended_lines": recommended_lines,
        "station_alerts": station_alerts,
        "created_at": _now(),
    }
    buffet_plans_col.update_one(
        {"event_name": data.event_name, "service_date": data.service_date},
        {"$set": plan_doc},
        upsert=True,
    )

    return {
        "plan_id": plan_id,
        "event_name": data.event_name,
        "service_date": data.service_date,
        "planning_covers": covers_result,
        "total_menu_items": len(item_plans),
        "item_plans": item_plans,
        "category_totals": category_totals,
        "recommended_lines": recommended_lines,
        "station_alerts": station_alerts,
    }


@router.get("/plan/{plan_id}")
async def get_buffet_plan(plan_id: str):
    """Retrieve a saved buffet plan."""
    plan = buffet_plans_col.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Buffet plan not found")
    return plan


@router.get("/plans")
async def list_buffet_plans(service_date: Optional[str] = None):
    """List all buffet plans, optionally filtered by date."""
    query = {}
    if service_date:
        query["service_date"] = service_date
    plans = list(buffet_plans_col.find(query, {"_id": 0, "item_plans": 0}))
    return {"plans": plans, "total": len(plans)}


@router.get("/menu-items")
async def list_buffet_menu_items(category: Optional[str] = None,
                                  role: Optional[str] = None):
    """List buffet menu item library with optional filters."""
    query = {}
    if category:
        query["category"] = category
    if role:
        query["category_role"] = role
    items = list(buffet_items_col.find(query, {"_id": 0}))
    return {"items": items, "total": len(items)}


@router.get("/menu-items/{item_id}")
async def get_buffet_menu_item(item_id: str):
    """Get a single buffet menu item by ID."""
    item = buffet_items_col.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, f"Item '{item_id}' not found")
    return item


@router.get("/category-defaults")
async def get_category_defaults():
    """Get all category role defaults for planning reference."""
    return {
        "category_defaults": CATEGORY_DEFAULTS,
        "service_style_presets": SERVICE_STYLE_PRESETS,
        "guest_behavior_models": list(GUEST_BEHAVIOR.keys()),
        "station_throughput": STATION_THROUGHPUT,
        "line_recommendations": LINE_RECOMMENDATIONS,
    }


@router.get("/policies")
async def get_planning_policies():
    """Get all planning policies and modifiers."""
    return {
        "attendance_factors": ATTENDANCE_FACTORS,
        "base_overage_by_style": BASE_OVERAGE,
        "luxury_overage": LUXURY_OVERAGE,
        "duration_modifiers": DURATION_MODIFIER,
        "guest_factors": {
            "children": CHILDREN_FACTOR,
            "teen": TEEN_FACTOR,
            "senior": SENIOR_FACTOR,
            "staff": STAFF_FACTOR,
        },
    }


# ─── Seed Data ──────────────────────────────────────────────────────

SEED_BUFFET_ITEMS = [
    {"item_id": "prime_rib_carved", "item_name": "Prime Rib, Carved", "category": "protein", "category_role": "carving_station", "service_format": "carving_station", "portion_uom": "oz", "buffet_portion_size": 5.0, "base_take_rate": 0.62, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.15, "dietary_fit_factor_default": 0.98, "placement_factor_default": 1.2, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.05, "opening_display_pct": 0.45, "edible_yield": 0.78, "pan_capacity": {"full_pan_servings": 48, "half_pan_servings": 24}, "replenishment_notes": ["Hold backup roasts whole until carving.", "Protect end cuts for late line or staff meal."], "service_notes": ["Best with staff attendant to control cut thickness."], "allergens": ["beef"], "dietary_tags": ["gluten_free"], "quality_risk": "medium", "cost_tier": "premium"},
    {"item_id": "roasted_chicken_supreme", "item_name": "Roasted Chicken Supreme", "category": "protein", "category_role": "main_protein", "service_format": "tray", "portion_uom": "oz", "buffet_portion_size": 5.0, "base_take_rate": 0.72, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.0, "dietary_fit_factor_default": 1.05, "placement_factor_default": 1.0, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.02, "opening_display_pct": 0.5, "edible_yield": 0.92, "pan_capacity": {"full_pan_servings": 40, "half_pan_servings": 20}, "replenishment_notes": ["Refresh with light jus each wave."], "service_notes": ["Universal center-of-plate protein."], "allergens": ["poultry"], "dietary_tags": ["gluten_free"], "quality_risk": "medium", "cost_tier": "medium"},
    {"item_id": "salmon_fillet", "item_name": "Salmon Fillet", "category": "protein", "category_role": "secondary_protein", "service_format": "tray", "portion_uom": "oz", "buffet_portion_size": 4.5, "base_take_rate": 0.46, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.08, "dietary_fit_factor_default": 0.95, "placement_factor_default": 1.0, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.04, "opening_display_pct": 0.45, "edible_yield": 0.9, "pan_capacity": {"full_pan_servings": 32, "half_pan_servings": 16}, "replenishment_notes": ["Do not overfill first wave; quality drops with long hold."], "service_notes": ["Premium alternate protein."], "allergens": ["fish"], "dietary_tags": ["gluten_free"], "quality_risk": "high", "cost_tier": "high"},
    {"item_id": "wild_mushroom_risotto", "item_name": "Wild Mushroom Risotto", "category": "starch", "category_role": "starch", "service_format": "chafing_dish", "portion_uom": "oz", "buffet_portion_size": 3.5, "base_take_rate": 0.55, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.05, "dietary_fit_factor_default": 0.98, "placement_factor_default": 1.0, "menu_competition_modifier_default": 0.95, "item_overage_modifier": 0.02, "opening_display_pct": 0.5, "edible_yield": 0.97, "pan_capacity": {"full_pan_servings": 55, "half_pan_servings": 28}, "replenishment_notes": ["Maintain smaller waves for texture."], "service_notes": ["Counts as indulgent starch, may pull from potato option."], "allergens": ["dairy"], "dietary_tags": ["vegetarian"], "quality_risk": "high", "cost_tier": "medium"},
    {"item_id": "garlic_mashed_potatoes", "item_name": "Garlic Mashed Potatoes", "category": "starch", "category_role": "starch", "service_format": "chafing_dish", "portion_uom": "oz", "buffet_portion_size": 4.0, "base_take_rate": 0.74, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.1, "dietary_fit_factor_default": 1.05, "placement_factor_default": 1.02, "menu_competition_modifier_default": 0.9, "item_overage_modifier": 0.01, "opening_display_pct": 0.6, "edible_yield": 0.98, "pan_capacity": {"full_pan_servings": 50, "half_pan_servings": 25}, "replenishment_notes": ["High refill speed; easy protection item."], "service_notes": ["Comfort starch with strong repeat behavior."], "allergens": ["dairy"], "dietary_tags": ["vegetarian", "gluten_free"], "quality_risk": "medium", "cost_tier": "low"},
    {"item_id": "seasonal_roasted_vegetables", "item_name": "Seasonal Roasted Vegetables", "category": "vegetable", "category_role": "vegetable", "service_format": "chafing_dish", "portion_uom": "oz", "buffet_portion_size": 3.0, "base_take_rate": 0.7, "avg_servings_if_taken": 0.95, "popularity_factor_default": 1.0, "dietary_fit_factor_default": 1.1, "placement_factor_default": 1.0, "menu_competition_modifier_default": 0.95, "item_overage_modifier": 0.01, "opening_display_pct": 0.6, "edible_yield": 0.94, "pan_capacity": {"full_pan_servings": 60, "half_pan_servings": 30}, "replenishment_notes": ["Can be used as catch-all side for mixed diets."], "service_notes": ["Supports most guest types and special meals."], "allergens": [], "dietary_tags": ["vegan", "gluten_free"], "quality_risk": "low", "cost_tier": "low"},
    {"item_id": "caesar_salad", "item_name": "Caesar Salad", "category": "salad", "category_role": "salad", "service_format": "display", "portion_uom": "oz", "buffet_portion_size": 3.0, "base_take_rate": 0.58, "avg_servings_if_taken": 0.95, "popularity_factor_default": 1.0, "dietary_fit_factor_default": 0.95, "placement_factor_default": 1.05, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.02, "opening_display_pct": 0.65, "edible_yield": 0.96, "pan_capacity": {"full_pan_servings": 55, "half_pan_servings": 28}, "replenishment_notes": ["Dress lightly if holding on buffet."], "service_notes": ["Popular classic but less universal than green salad."], "allergens": ["dairy", "fish", "gluten"], "dietary_tags": ["vegetarian_optional"], "quality_risk": "medium", "cost_tier": "low"},
    {"item_id": "garden_salad", "item_name": "Garden Salad", "category": "salad", "category_role": "salad", "service_format": "display", "portion_uom": "oz", "buffet_portion_size": 3.0, "base_take_rate": 0.66, "avg_servings_if_taken": 0.95, "popularity_factor_default": 1.0, "dietary_fit_factor_default": 1.1, "placement_factor_default": 1.04, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.02, "opening_display_pct": 0.65, "edible_yield": 0.95, "pan_capacity": {"full_pan_servings": 60, "half_pan_servings": 30}, "replenishment_notes": ["Keep crisp components separate for replenishment."], "service_notes": ["Broadest dietary fit among salads."], "allergens": [], "dietary_tags": ["vegan", "gluten_free"], "quality_risk": "low", "cost_tier": "low"},
    {"item_id": "artisan_rolls", "item_name": "Artisan Dinner Rolls", "category": "bread", "category_role": "bread", "service_format": "display", "portion_uom": "each", "buffet_portion_size": 1.0, "base_take_rate": 0.62, "avg_servings_if_taken": 1.2, "popularity_factor_default": 1.0, "dietary_fit_factor_default": 1.0, "placement_factor_default": 1.08, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.7, "edible_yield": 1.0, "pan_capacity": {"full_pan_servings": 80, "half_pan_servings": 40}, "replenishment_notes": ["Display in batches to keep fresh appearance."], "service_notes": ["Usage climbs with carved meats and sauced dishes."], "allergens": ["gluten"], "dietary_tags": ["vegetarian"], "quality_risk": "low", "cost_tier": "low"},
    {"item_id": "mini_cheesecake_bites", "item_name": "Mini Cheesecake Bites", "category": "dessert", "category_role": "dessert_mini", "service_format": "display", "portion_uom": "each", "buffet_portion_size": 1.0, "base_take_rate": 0.7, "avg_servings_if_taken": 1.5, "popularity_factor_default": 1.12, "dietary_fit_factor_default": 0.95, "placement_factor_default": 1.15, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.08, "opening_display_pct": 0.5, "edible_yield": 1.0, "pan_capacity": {"full_pan_servings": 96, "half_pan_servings": 48}, "replenishment_notes": ["High visual impact; hold reserve for reset."], "service_notes": ["Guests often take multiples."], "allergens": ["dairy", "gluten", "egg"], "dietary_tags": ["vegetarian"], "quality_risk": "low", "cost_tier": "medium"},
    {"item_id": "seasonal_fruit_display", "item_name": "Seasonal Fruit Display", "category": "dessert", "category_role": "dessert_slice", "service_format": "display", "portion_uom": "oz", "buffet_portion_size": 3.5, "base_take_rate": 0.5, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.0, "dietary_fit_factor_default": 1.15, "placement_factor_default": 1.05, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.55, "edible_yield": 0.92, "pan_capacity": {"full_pan_servings": 45, "half_pan_servings": 22}, "replenishment_notes": ["Can support breakfast, brunch, or dessert station."], "service_notes": ["Health halo item; strong with family events."], "allergens": [], "dietary_tags": ["vegan", "gluten_free"], "quality_risk": "low", "cost_tier": "medium"},
    {"item_id": "mac_and_cheese_kids", "item_name": "Mac and Cheese", "category": "starch", "category_role": "kids_item", "service_format": "chafing_dish", "portion_uom": "oz", "buffet_portion_size": 4.0, "base_take_rate": 0.18, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.2, "dietary_fit_factor_default": 1.0, "placement_factor_default": 0.9, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.55, "edible_yield": 0.98, "pan_capacity": {"full_pan_servings": 50, "half_pan_servings": 25}, "replenishment_notes": ["Use only if kids population or comfort-theme warrants."], "service_notes": ["Should be planned against kids count, not all covers."], "allergens": ["dairy", "gluten"], "dietary_tags": ["vegetarian"], "quality_risk": "medium", "cost_tier": "low"},
    {"item_id": "shrimp_cocktail_station", "item_name": "Shrimp Cocktail", "category": "protein", "category_role": "action_station_topping", "service_format": "display", "portion_uom": "piece", "buffet_portion_size": 3.0, "base_take_rate": 0.35, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.15, "dietary_fit_factor_default": 0.85, "placement_factor_default": 1.2, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.06, "opening_display_pct": 0.45, "edible_yield": 0.92, "pan_capacity": {"full_pan_servings": 120, "half_pan_servings": 60}, "replenishment_notes": ["Keep iced display shallow and replenish often."], "service_notes": ["Premium station item with theft and display risk."], "allergens": ["shellfish"], "dietary_tags": ["gluten_free"], "quality_risk": "high", "cost_tier": "premium"},
    {"item_id": "omelet_station_eggs", "item_name": "Made-to-Order Omelet Base", "category": "protein", "category_role": "action_station_base", "service_format": "action_station", "portion_uom": "oz", "buffet_portion_size": 5.0, "base_take_rate": 0.42, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.15, "dietary_fit_factor_default": 1.0, "placement_factor_default": 1.2, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.4, "edible_yield": 0.95, "pan_capacity": {"full_pan_servings": 36, "half_pan_servings": 18}, "replenishment_notes": ["Plan separately by station throughput and cook speed."], "service_notes": ["Brunch demand spikes early in service."], "allergens": ["egg"], "dietary_tags": ["gluten_free"], "quality_risk": "low", "cost_tier": "medium"},
    {"item_id": "carving_au_jus", "item_name": "Carving Au Jus", "category": "condiment", "category_role": "condiment_sauce", "service_format": "display", "portion_uom": "oz", "buffet_portion_size": 1.0, "base_take_rate": 0.55, "avg_servings_if_taken": 1.0, "popularity_factor_default": 1.0, "dietary_fit_factor_default": 1.0, "placement_factor_default": 1.0, "menu_competition_modifier_default": 1.0, "item_overage_modifier": 0.03, "opening_display_pct": 0.35, "edible_yield": 0.99, "pan_capacity": {"full_pan_servings": 128, "half_pan_servings": 64}, "replenishment_notes": ["Hold reserve hot; replenish in smaller vessels."], "service_notes": ["Usually tied to roast beef/prime rib demand."], "allergens": [], "dietary_tags": ["gluten_free"], "quality_risk": "low", "cost_tier": "low"},
]


def init_buffet_engine():
    """Seed buffet menu items if not present."""
    if buffet_items_col.count_documents({}) == 0:
        for item in SEED_BUFFET_ITEMS:
            item["created_at"] = _now()
            buffet_items_col.insert_one(item)
    buffet_items_col.create_index("item_id", unique=True)
    buffet_plans_col.create_index("id")
    return {"status": "initialized", "items": buffet_items_col.count_documents({})}
