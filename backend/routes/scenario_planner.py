"""
LUCCCA Scenario Planner Engine
===============================
What-If event scenario builder powered by Knowledge Engine.
Used for:
  - Sales training & onboarding
  - Practice pitch decks
  - Side-by-side scenario comparison
  - Minimum spend validation
  - Full operational + financial impact projection
"""
import os
import math
import json
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/scenario-planner", tags=["scenario-planner"])

from database import db as _db
scenarios_col = _db["scenarios"]
training_col = _db["training_scenarios"]

def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())

# ─── Helpers: pull from knowledge engine ────────────────────────────

def _get_ke_data(domain_id: str) -> dict:
    doc = _db["banquet_knowledge"].find_one({"domain_id": domain_id}, {"_id": 0})
    return doc.get("data", {}) if doc else {}


def _find_package(tier: str, event_type: str, service_style: str) -> dict:
    pricing = _get_ke_data("package_pricing")
    templates = pricing.get("package_templates", [])
    for t in templates:
        if t.get("tier") == tier and event_type in t.get("suitable_event_types", []):
            fam = t.get("package_family_id", "")
            if service_style in fam:
                return t
    for t in templates:
        if t.get("tier") == tier and event_type in t.get("suitable_event_types", []):
            return t
    return templates[0] if templates else {}


def _calc_capacity(room_template: dict, setup_style: dict, elements: list, comfort_tier: str = "standard") -> dict:
    room_data = _get_ke_data("room_setup_capacity")
    footprint_lib = {f["footprint_id"]: f for f in room_data.get("footprint_library", [])}
    capacity_model = room_data.get("capacity_model", {})
    comfort_tiers = {c["tier_id"]: c for c in capacity_model.get("comfort_tiers", [])}

    gross = room_template.get("gross_sqft", 0)
    program_sqft = 0
    for el_id in elements:
        fp = footprint_lib.get(el_id, {})
        program_sqft += fp.get("total_sqft", 0)

    service_sqft = gross * 0.08
    remaining = gross - program_sqft - service_sqft
    sqft_range = setup_style.get("space_per_guest_sqft_range", {"low": 12, "high": 14})
    avg_sqft = (sqft_range["low"] + sqft_range["high"]) / 2
    mod = comfort_tiers.get(comfort_tier, {}).get("seat_density_modifier", 1.0)
    comfortable = max(0, math.floor((remaining / avg_sqft) * mod))
    compressed = max(0, math.floor((remaining / sqft_range["low"]) * 1.1))

    return {
        "gross_sqft": gross,
        "program_sqft": program_sqft,
        "service_sqft": round(service_sqft),
        "remaining_seating_sqft": round(remaining),
        "comfortable_capacity": comfortable,
        "compressed_capacity": compressed,
        "comfort_tier": comfort_tier,
    }


# ─── Models ─────────────────────────────────────────────────────────

class ScenarioInput(BaseModel):
    name: str = "Untitled Scenario"
    event_type: str = "wedding"
    service_style: str = "buffet"
    meal_period: str = "dinner"
    guest_count: int = 150
    tier: str = "signature"
    setup_style_id: str = "banquet_rounds_60"
    room_template_id: str = "template_ballroom_medium"
    comfort_tier: str = "standard"
    program_elements: List[str] = []
    upgrades: List[str] = []
    bar_model: str = ""
    bar_tier: str = "house"
    bar_hours: float = 0
    bar_demand_level: str = "moderate"
    addons: List[str] = []
    av_package_usd: float = 0
    music_entertainment_usd: float = 0
    floral_decor_usd: float = 0
    photography_usd: float = 0
    custom_enhancements: List[dict] = []
    concession_percent: float = 0
    concession_reason: str = ""
    room_rental_usd: float = 0
    fnb_minimum_usd: float = 0
    is_outdoor: bool = False
    is_training_mode: bool = False

class CompareRequest(BaseModel):
    scenario_a: ScenarioInput
    scenario_b: ScenarioInput


# ─── Build Scenario ─────────────────────────────────────────────────

def _build_scenario_result(inp: ScenarioInput) -> dict:
    """Core scenario builder that produces full financial + operational projection."""
    # 1. Package pricing
    pricing_data = _get_ke_data("package_pricing")
    pkg = _find_package(inp.tier, inp.event_type, inp.service_style)
    pm = pkg.get("price_model", {})
    price_range = pm.get("example_price_range_usd_pp", {"low": 50, "high": 100})
    base_pp = (price_range["low"] + price_range["high"]) / 2

    # 2. Upgrades
    all_upgrades = (pricing_data.get("upgrade_ladders", {}).get("food_upgrades", []) +
                    pricing_data.get("upgrade_ladders", {}).get("beverage_upgrades", []) +
                    pricing_data.get("upgrade_ladders", {}).get("presentation_upgrades", []))
    upgrade_details = []
    upgrade_pp = 0
    for uid in inp.upgrades:
        match = next((u for u in all_upgrades if u["upgrade_id"] == uid), None)
        if match:
            cost = match.get("example_add_usd", 0)
            upgrade_details.append({"id": uid, "name": match["name"], "cost": cost, "effects": match.get("operational_effects", [])})
            if "per_person" in match.get("pricing_unit", ""):
                upgrade_pp += cost

    # 3. Bar estimate
    bar_logic = pricing_data.get("bar_package_logic", {})
    bar_pp = 0
    bar_detail = {}
    if inp.bar_model and inp.bar_hours > 0:
        tier_data = next((t for t in bar_logic.get("bar_tiers", []) if t["bar_tier_id"] == inp.bar_tier), {})
        demand = bar_logic.get("hourly_demand_assumptions", {}).get(inp.bar_demand_level, {})
        base_drink = 8.0 * tier_data.get("relative_cost_index", 1.0)
        drinks_pp = demand.get("drinks_pp_first_hour", 1.5) + demand.get("drinks_pp_additional_hour", 0.8) * max(0, inp.bar_hours - 1)
        bar_pp = round(drinks_pp * base_drink, 2)
        bar_detail = {"model": inp.bar_model, "tier": inp.bar_tier, "hours": inp.bar_hours, "est_drinks_pp": round(drinks_pp, 1), "cost_pp": bar_pp}

    # 4. Addons
    all_addons_master = pricing_data.get("rental_and_service_addons", {})
    all_addons = (all_addons_master.get("rental_addons", []) + all_addons_master.get("service_addons", []) + all_addons_master.get("program_addons", []))
    addon_details = []
    addon_flat = 0
    for aid in inp.addons:
        match = next((a for a in all_addons if a["addon_id"] == aid), None)
        if match:
            cost = match.get("example_add_usd", 0)
            addon_details.append({"id": aid, "name": match["name"], "cost": cost})
            addon_flat += cost

    # 5. Custom enhancements
    custom_total = inp.av_package_usd + inp.music_entertainment_usd + inp.floral_decor_usd + inp.photography_usd
    for ce in inp.custom_enhancements:
        custom_total += ce.get("cost_usd", 0)

    # 6. Financial summary
    total_pp = base_pp + upgrade_pp + bar_pp
    fnb_total = total_pp * inp.guest_count
    gross_total = fnb_total + addon_flat + custom_total + inp.room_rental_usd
    concession_amt = round(gross_total * inp.concession_percent / 100, 2) if inp.concession_percent > 0 else 0
    net_total = gross_total - concession_amt

    # Minimum spend check
    min_spend_shortfall = max(0, inp.fnb_minimum_usd - fnb_total) if inp.fnb_minimum_usd > 0 else 0
    meets_minimum = min_spend_shortfall == 0

    # Margin estimate
    margin_floors = pricing_data.get("margin_guardrails", {}).get("recommended_margin_floors", {})
    target_margin = margin_floors.get(inp.tier, 0.42)
    est_food_cost_pct = 0.32
    est_labor_pct = 0.22
    est_direct_cost = fnb_total * (est_food_cost_pct + est_labor_pct)
    est_margin = fnb_total - est_direct_cost
    est_margin_pct = est_margin / fnb_total if fnb_total > 0 else 0

    # 7. Room capacity
    room_data = _get_ke_data("room_setup_capacity")
    room_templates = room_data.get("room_templates", [])
    setup_styles = room_data.get("setup_styles", [])
    room_tmpl = next((r for r in room_templates if r["room_id"] == inp.room_template_id), {})
    setup_style = next((s for s in setup_styles if s["setup_style_id"] == inp.setup_style_id), {})
    capacity = _calc_capacity(room_tmpl, setup_style, inp.program_elements, inp.comfort_tier)
    room_fits = inp.guest_count <= capacity.get("comfortable_capacity", 999)

    # 8. Staffing estimate (enhanced with Timeline Throughput Engine)
    throughput = _get_ke_data("timeline_throughput")
    tp_sections = throughput.get("sections", {})
    tp_ratios = tp_sections.get("staffing_ratios", {})
    tp_speed = tp_sections.get("service_speed_models", {})
    tp_pacing = tp_sections.get("course_pacing_guidelines_minutes", {})
    tp_dish = tp_sections.get("dish_pit_capacity_model", {})
    tp_timeline = tp_sections.get("timeline_validation_rules", {})

    # Compute FOH from throughput engine ratios
    if inp.service_style == "plated":
        tier_key = "luxury" if inp.tier in ("luxury", "signature") else "standard" if inp.tier == "elevated" else "economy"
        ratio_str = tp_ratios.get("plated_service", {}).get(tier_key, "1 per 18")
        # Parse "1 server per X-Y guests" → use midpoint
        import re
        nums = re.findall(r'\d+', ratio_str)
        ratio_mid = (int(nums[0]) + int(nums[1])) / 2 if len(nums) >= 2 else 18
        base_foh = max(1, math.ceil(inp.guest_count / ratio_mid))
    else:
        # Buffet default: 1 per 25-40 → midpoint ~32
        base_foh = max(1, math.ceil(inp.guest_count / 32))

    # Additional station staff
    action_staff = math.ceil(inp.guest_count / 100)  # 1 per 75-125 midpoint
    carving_staff = math.ceil(inp.guest_count / 150)
    dessert_staff = math.ceil(inp.guest_count / 120)
    coffee_staff = math.ceil(inp.guest_count / 150)
    station_staff = action_staff + carving_staff + dessert_staff + coffee_staff if inp.service_style in ("buffet", "stations") else 0
    captains = max(1, math.ceil(base_foh / 8))  # 1 per 6-10 servers, midpoint 8
    bussers = max(1, math.ceil(base_foh / 2.5))  # 1 per 2-3

    base_boh = max(1, math.ceil(inp.guest_count / 30))
    bartenders = max(1, math.ceil(inp.guest_count / 75)) if inp.bar_model else 0

    multiplier = 1.0
    if inp.is_outdoor:
        multiplier += 0.15
    if inp.tier in ("signature", "luxury"):
        multiplier += 0.15
    if len(inp.program_elements) > 4:
        multiplier += 0.1

    adj_foh = math.ceil((base_foh + bartenders + station_staff + captains + bussers) * multiplier)
    adj_boh = math.ceil(base_boh * multiplier)

    # 8b. Throughput feasibility analysis
    plate_clear_rate = tp_speed.get("plate_clear_rate_per_server_per_minute", 8)
    tray_capacity = tp_speed.get("tray_capacity_avg", 8)
    plates_to_clear = inp.guest_count
    available_clearers = max(1, base_foh + bussers)
    clear_capacity_per_min = available_clearers * plate_clear_rate
    est_clear_minutes = math.ceil(plates_to_clear / clear_capacity_per_min) if clear_capacity_per_min > 0 else 999

    # Distance multiplier
    dist_rules = tp_speed.get("distance_multiplier_rules", {})
    dist_mult = dist_rules.get("under_50ft", 1.0)  # default
    if inp.is_outdoor:
        dist_mult = dist_rules.get("remote_outdoor", 1.35)
    adj_clear_minutes = math.ceil(est_clear_minutes * dist_mult)

    # Course pacing (total service timeline)
    total_pacing_min = sum(tp_pacing.values())
    flag_under = tp_timeline.get("flag_if_under_minutes", 7)
    timeline_feasible = adj_clear_minutes >= flag_under

    # Dish pit check
    rack_rate = tp_dish.get("rack_processing_rate_per_minute", 1.5)
    total_racks = math.ceil(plates_to_clear / tray_capacity)
    dish_time_min = math.ceil(total_racks / rack_rate * tp_dish.get("surge_multiplier", 1.25))

    throughput_warnings = []
    if adj_clear_minutes < flag_under:
        throughput_warnings.append({"flag": "dangerously_fast_clear", "severity": "critical", "detail": f"Clearing {plates_to_clear} plates in {adj_clear_minutes}min with {available_clearers} staff is below {flag_under}min safety threshold — add staff or extend timeline"})
    if dish_time_min > adj_clear_minutes + 15:
        throughput_warnings.append({"flag": "dish_pit_bottleneck", "severity": "high", "detail": f"Dish pit needs {dish_time_min}min to process {total_racks} racks but clearing finishes in {adj_clear_minutes}min — dishware backup likely"})
    if dist_mult > 1.1:
        throughput_warnings.append({"flag": "distance_penalty", "severity": "medium", "detail": f"Remote/outdoor layout adds {int((dist_mult - 1) * 100)}% to service time due to travel distance"})

    # 9. Risk flags

    # 9. Risk flags
    risk_flags = []
    if not room_fits:
        risk_flags.append({"flag": "room_capacity_exceeded", "severity": "critical", "detail": f"{inp.guest_count} guests exceeds comfortable capacity of {capacity.get('comfortable_capacity', 0)}"})
    if min_spend_shortfall > 0:
        risk_flags.append({"flag": "minimum_spend_shortfall", "severity": "high", "detail": f"F&B total ${fnb_total:,.0f} is ${min_spend_shortfall:,.0f} below minimum ${inp.fnb_minimum_usd:,.0f}"})
    if est_margin_pct < target_margin:
        risk_flags.append({"flag": "margin_below_target", "severity": "high", "detail": f"Est margin {est_margin_pct:.1%} below target {target_margin:.0%}"})
    if inp.concession_percent > 10:
        risk_flags.append({"flag": "heavy_concession", "severity": "medium", "detail": f"{inp.concession_percent}% concession requires director+ approval"})

    # 9a. Throughput warnings
    risk_flags.extend(throughput_warnings)

    # 9b. Vendor dependency risk analysis
    vendor_data = _get_ke_data("av_decor_vendor")
    vendor_risks = []
    vendor_assets = []
    if vendor_data:
        asset_lib = {a["asset_id"]: a for a in vendor_data.get("asset_library", [])}
        dep_rules = vendor_data.get("dependency_rules", [])
        total_vendor_footprint = 0
        total_setup_min = 0
        total_strike_min = 0
        power_flags = []

        for el_id in inp.program_elements:
            asset = asset_lib.get(el_id)
            if asset:
                vendor_assets.append(asset)
                total_vendor_footprint += asset.get("typical_footprint_sqft", 0)
                total_setup_min += asset.get("setup_minutes", 0)
                total_strike_min += asset.get("strike_minutes", 0)
                pp = asset.get("power_profile", "")
                if "high_draw" in pp or "3phase" in pp or "multiple" in pp:
                    power_flags.append({"asset": asset["name"], "profile": pp})

        for dep in dep_rules:
            trigger = dep.get("trigger", "").lower()
            matched = False
            for va in vendor_assets:
                cat = va.get("category", "").lower()
                name = va.get("name", "").lower()
                if "stage" in trigger and ("stage" in cat or "stage" in name):
                    matched = True
                elif "band" in trigger and ("band" in name or "entertainment" in cat):
                    matched = True
                elif "photo" in trigger and ("photo" in name or "booth" in name):
                    matched = True
                elif "flame" in trigger and ("flame" in name or "candle" in name):
                    matched = True
                elif "outdoor" in trigger and inp.is_outdoor:
                    matched = True
                elif "light" in trigger and "lighting" in cat:
                    matched = True
                elif "large" in trigger and ("arch" in name or "lounge" in name or "scenic" in name):
                    matched = True
            if matched:
                vendor_risks.append({
                    "dependency_id": dep["dependency_id"],
                    "trigger": dep["trigger"],
                    "requires": dep["requires"],
                    "priority": dep.get("priority", "medium"),
                    "risk_if_missed": dep.get("risk_if_missed", ""),
                })

        if power_flags:
            risk_flags.append({"flag": "unconfirmed_high_power", "severity": "critical", "detail": f"High-power AV/vendor assets need engineering signoff: {', '.join(p['asset'] for p in power_flags)}"})
        if total_vendor_footprint > capacity.get("remaining_seating_sqft", 99999) * 0.3:
            risk_flags.append({"flag": "vendor_footprint_heavy", "severity": "high", "detail": f"Vendor assets occupy {total_vendor_footprint} sqft — over 30% of remaining seating area"})

    # Concession approval tier
    conc_approval = "none"
    if inp.concession_percent > 0:
        gov = pricing_data.get("concessions_and_negotiation_rules", {}).get("governance", {}).get("approval_tiers", [])
        for tier_rule in gov:
            if inp.concession_percent <= tier_rule.get("max_discount_percent", 0):
                conc_approval = tier_rule["tier"]
                break
        else:
            conc_approval = "executive_review"

    # 10. Operational impact warnings
    op_warnings = []
    crosswalk = pricing_data.get("operational_impact_crosswalk", {}).get("pricing_to_operational_links", [])
    for uid in inp.upgrades:
        short = uid.replace("upg_", "")
        for lnk in crosswalk:
            if short in lnk.get("sales_choice", ""):
                op_warnings.append(lnk)

    return {
        "scenario_name": inp.name,
        "input": inp.dict(),
        "package": {
            "package_id": pkg.get("package_id"),
            "name": pkg.get("package_name"),
            "tier": inp.tier,
            "base_pp": base_pp,
            "price_range": price_range,
        },
        "upgrades": upgrade_details,
        "bar": bar_detail,
        "addons": addon_details,
        "enhancements": {
            "av": inp.av_package_usd,
            "music": inp.music_entertainment_usd,
            "floral": inp.floral_decor_usd,
            "photography": inp.photography_usd,
            "custom": inp.custom_enhancements,
            "total": custom_total,
        },
        "financials": {
            "base_pp": base_pp,
            "upgrade_pp": upgrade_pp,
            "bar_pp": bar_pp,
            "total_pp": round(total_pp, 2),
            "fnb_total": round(fnb_total, 2),
            "addon_flat": addon_flat,
            "enhancements_total": custom_total,
            "room_rental": inp.room_rental_usd,
            "gross_total": round(gross_total, 2),
            "concession_amount": concession_amt,
            "concession_approval_tier": conc_approval,
            "net_total": round(net_total, 2),
        },
        "minimum_spend": {
            "fnb_minimum": inp.fnb_minimum_usd,
            "fnb_actual": round(fnb_total, 2),
            "shortfall": round(min_spend_shortfall, 2),
            "meets_minimum": meets_minimum,
        },
        "margin_analysis": {
            "est_food_cost_pct": est_food_cost_pct,
            "est_labor_pct": est_labor_pct,
            "est_direct_cost": round(est_direct_cost, 2),
            "est_margin_dollars": round(est_margin, 2),
            "est_margin_pct": round(est_margin_pct, 4),
            "target_margin_pct": target_margin,
            "margin_healthy": est_margin_pct >= target_margin,
        },
        "room_capacity": {
            "room": room_tmpl.get("label", inp.room_template_id),
            "setup": setup_style.get("label", inp.setup_style_id),
            **capacity,
            "guest_count_fits": room_fits,
        },
        "staffing_estimate": {
            "foh": adj_foh,
            "boh": adj_boh,
            "bartenders": bartenders,
            "captains": captains,
            "bussers": bussers,
            "station_staff": station_staff,
            "total": adj_foh + adj_boh,
            "multiplier": round(multiplier, 2),
        },
        "throughput_analysis": {
            "plates_to_clear": plates_to_clear,
            "available_clearers": available_clearers,
            "plate_clear_rate_per_min": plate_clear_rate,
            "est_clear_minutes": adj_clear_minutes,
            "distance_multiplier": dist_mult,
            "total_course_pacing_minutes": total_pacing_min,
            "dish_pit_racks": total_racks,
            "dish_pit_time_minutes": dish_time_min,
            "timeline_feasible": timeline_feasible,
        },
        "risk_flags": risk_flags,
        "operational_warnings": op_warnings,
        "vendor_analysis": {
            "assets_detected": [{"asset_id": a["asset_id"], "name": a["name"], "category": a.get("category"), "footprint_sqft": a.get("typical_footprint_sqft", 0), "setup_min": a.get("setup_minutes", 0), "strike_min": a.get("strike_minutes", 0), "power": a.get("power_profile"), "noise": a.get("noise_profile")} for a in vendor_assets],
            "total_vendor_footprint_sqft": sum(a.get("typical_footprint_sqft", 0) for a in vendor_assets),
            "total_setup_minutes": sum(a.get("setup_minutes", 0) for a in vendor_assets),
            "total_strike_minutes": sum(a.get("strike_minutes", 0) for a in vendor_assets),
            "dependency_triggers": vendor_risks,
        },
    }


@router.post("/build-scenario")
def build_scenario(inp: ScenarioInput):
    result = _build_scenario_result(inp)
    sid = _uid()
    result["scenario_id"] = sid
    result["created_at"] = _now()
    scenarios_col.insert_one({**result, "_id_internal": sid})
    result.pop("_id", None)
    result.pop("_id_internal", None)
    return result


@router.post("/compare")
def compare_scenarios(req: CompareRequest):
    a = _build_scenario_result(req.scenario_a)
    b = _build_scenario_result(req.scenario_b)

    def _delta(va, vb):
        return round(vb - va, 2)

    fa, fb = a["financials"], b["financials"]
    sa, sb = a["staffing_estimate"], b["staffing_estimate"]
    ma, mb = a["margin_analysis"], b["margin_analysis"]

    deltas = {
        "net_total": _delta(fa["net_total"], fb["net_total"]),
        "total_pp": _delta(fa["total_pp"], fb["total_pp"]),
        "fnb_total": _delta(fa["fnb_total"], fb["fnb_total"]),
        "total_staff": _delta(sa["total"], sb["total"]),
        "margin_pct_pp": _delta(ma["est_margin_pct"], mb["est_margin_pct"]),
        "room_fits_change": f"{'fits' if b['room_capacity']['guest_count_fits'] else 'EXCEEDS'} vs {'fits' if a['room_capacity']['guest_count_fits'] else 'EXCEEDS'}",
        "clear_time_delta": _delta(a["throughput_analysis"]["est_clear_minutes"], b["throughput_analysis"]["est_clear_minutes"]),
        "dish_pit_delta": _delta(a["throughput_analysis"]["dish_pit_time_minutes"], b["throughput_analysis"]["dish_pit_time_minutes"]),
    }

    return {
        "scenario_a": {**a, "scenario_name": req.scenario_a.name},
        "scenario_b": {**b, "scenario_name": req.scenario_b.name},
        "deltas": deltas,
        "comparison_summary": f"Scenario B is ${abs(deltas['net_total']):,.0f} {'more' if deltas['net_total'] > 0 else 'less'} than A. Staff delta: {deltas['total_staff']:+d}. Margin delta: {deltas['margin_pct_pp']:+.1%}.",
    }


# ─── Saved Scenarios ────────────────────────────────────────────────

@router.get("/scenarios")
def list_scenarios(limit: int = 20):
    docs = list(scenarios_col.find({}, {"_id": 0, "_id_internal": 0}).sort("created_at", -1).limit(limit))
    return {"scenarios": docs, "count": len(docs)}


@router.get("/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    doc = scenarios_col.find_one({"scenario_id": scenario_id}, {"_id": 0, "_id_internal": 0})
    if not doc:
        raise HTTPException(404, "Scenario not found")
    return doc


@router.delete("/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str):
    r = scenarios_col.delete_one({"scenario_id": scenario_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Scenario not found")
    return {"deleted": scenario_id}


# ─── Training Scenarios ─────────────────────────────────────────────

@router.get("/training")
def list_training_scenarios():
    docs = list(training_col.find({}, {"_id": 0}))
    if not docs:
        _seed_training()
        docs = list(training_col.find({}, {"_id": 0}))
    return {"training_scenarios": docs, "count": len(docs)}


def _seed_training():
    presets = [
        {
            "training_id": "train_wedding_200",
            "title": "Wedding Buffet - 200 Guests (Signature)",
            "description": "Learn to build a signature wedding buffet with bar, dance floor, and premium upgrades. Understand min spend, margin, and operational impact.",
            "difficulty": "beginner",
            "learning_goals": ["Package selection", "Upgrade impact on operations", "Bar model selection", "Min spend validation"],
            "preset": {"event_type": "wedding", "service_style": "buffet", "meal_period": "dinner", "guest_count": 200, "tier": "signature", "setup_style_id": "banquet_rounds_60", "room_template_id": "template_ballroom_medium", "comfort_tier": "standard", "program_elements": ["dance_floor_24x24", "stage_12x24", "bar_12ft_backbar", "buffet_line_double_16ft", "dessert_station_standard", "coffee_station_double"], "bar_model": "hosted_hourly", "bar_tier": "premium", "bar_hours": 4, "bar_demand_level": "moderate", "fnb_minimum_usd": 25000, "room_rental_usd": 2500},
        },
        {
            "training_id": "train_corporate_lunch",
            "title": "Corporate Lunch - 300 Guests (Fast Turn)",
            "description": "Practice building a compressed corporate lunch with tight timelines, dual buffet lines, and budget sensitivity.",
            "difficulty": "intermediate",
            "learning_goals": ["Compressed capacity", "Dual-line layout", "Coffee routing", "Tight margin management"],
            "preset": {"event_type": "corporate", "service_style": "buffet", "meal_period": "lunch", "guest_count": 300, "tier": "elevated", "setup_style_id": "crescent_rounds", "room_template_id": "template_ballroom_large", "comfort_tier": "compressed", "program_elements": ["buffet_line_double_16ft", "buffet_line_double_16ft", "coffee_station_double", "water_station"], "bar_model": "", "bar_tier": "house", "bar_hours": 0},
        },
        {
            "training_id": "train_luxury_gala",
            "title": "Luxury Gala - 250 Guests (High-Touch)",
            "description": "Master luxury pricing with premium bar, multiple upgrades, concession governance, and margin protection.",
            "difficulty": "advanced",
            "learning_goals": ["Luxury margin floors", "Concession governance", "Premium bar exposure", "Operational complexity"],
            "preset": {"event_type": "social", "service_style": "stations", "meal_period": "reception", "guest_count": 250, "tier": "luxury", "setup_style_id": "banquet_rounds_60", "room_template_id": "template_ballroom_large", "comfort_tier": "luxury", "program_elements": ["bar_12ft_backbar", "bar_12ft_backbar", "buffet_line_double_16ft", "carving_station_standard", "action_station_pasta", "dessert_station_standard", "dance_floor_24x24", "stage_12x24"], "upgrades": ["upg_premium_protein", "upg_action_station", "upg_premium_dessert_display", "upg_premium_bar"], "bar_model": "hosted_hourly", "bar_tier": "luxury", "bar_hours": 5, "bar_demand_level": "high", "av_package_usd": 3500, "music_entertainment_usd": 5000, "floral_decor_usd": 8000, "fnb_minimum_usd": 50000, "room_rental_usd": 5000},
        },
    ]
    for p in presets:
        training_col.update_one({"training_id": p["training_id"]}, {"$set": p}, upsert=True)


# ─── Room Templates & Footprints (read-through from KB) ────────────

@router.get("/room-templates")
def list_room_templates():
    data = _get_ke_data("room_setup_capacity")
    return {"templates": data.get("room_templates", []), "room_types": data.get("room_taxonomy", {}).get("room_types", [])}


@router.get("/setup-styles")
def list_setup_styles():
    data = _get_ke_data("room_setup_capacity")
    return {"styles": data.get("setup_styles", [])}


@router.get("/footprints")
def list_footprints():
    data = _get_ke_data("room_setup_capacity")
    return {"footprints": data.get("footprint_library", [])}


@router.post("/capacity-check")
def capacity_check(
    room_template_id: str = "template_ballroom_medium",
    setup_style_id: str = "banquet_rounds_60",
    guest_count: int = 150,
    comfort_tier: str = "standard",
    program_elements: List[str] = [],
):
    data = _get_ke_data("room_setup_capacity")
    room_tmpl = next((r for r in data.get("room_templates", []) if r["room_id"] == room_template_id), {})
    setup = next((s for s in data.get("setup_styles", []) if s["setup_style_id"] == setup_style_id), {})
    if not room_tmpl:
        raise HTTPException(404, "Room template not found")
    cap = _calc_capacity(room_tmpl, setup, program_elements, comfort_tier)
    fits = guest_count <= cap["comfortable_capacity"]
    return {
        "room": room_tmpl.get("label"),
        "setup": setup.get("label"),
        **cap,
        "requested_guests": guest_count,
        "fits_comfortably": fits,
        "overage": max(0, guest_count - cap["comfortable_capacity"]),
    }


# ─── Vendor Assets (read-through from AV/Decor KB) ─────────────────

@router.get("/vendor-assets")
def list_vendor_assets():
    data = _get_ke_data("av_decor_vendor")
    return {
        "assets": data.get("asset_library", []),
        "categories": data.get("vendor_categories", []),
        "dependency_rules": data.get("dependency_rules", []),
    }


@router.get("/vendor-categories")
def list_vendor_categories():
    data = _get_ke_data("av_decor_vendor")
    return {"categories": data.get("vendor_categories", [])}


@router.get("/packages")
def list_packages():
    pricing = _get_ke_data("package_pricing")
    return {
        "templates": pricing.get("package_templates", []),
        "tiers": sorted(set(t.get("tier", "") for t in pricing.get("package_templates", []))),
        "upgrade_ladders": pricing.get("upgrade_ladders", {}),
        "bar_logic": pricing.get("bar_package_logic", {}),
        "addons": pricing.get("rental_and_service_addons", {}),
    }
