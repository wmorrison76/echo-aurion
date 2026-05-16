"""
EchoAi3 -- Layer 4: Simulation & Forecast Engine
==================================================
Explicit scenario delta calculators for banquet changes, labor impacts,
cost fluctuations, and operational cascading effects.
Connects to EchoStratus scenarios and provides real-time what-if analysis.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/simulation", tags=["echoai3-simulation"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


# ─── Scenario Templates ───

SCENARIO_TEMPLATES = {
    "banquet_change": {
        "name": "Banquet Cover Change",
        "description": "Model the cascading impact of adding or removing covers from a banquet event",
        "inputs": ["event_id", "cover_delta", "meal_type"],
        "affects": ["food_cost", "labor", "inventory", "revenue", "prep_time"],
    },
    "labor_adjustment": {
        "name": "Labor Schedule Adjustment",
        "description": "Calculate the financial and operational impact of staffing changes",
        "inputs": ["department", "headcount_delta", "shift_type", "period_days"],
        "affects": ["labor_cost", "service_capacity", "overtime", "coverage"],
    },
    "menu_price_change": {
        "name": "Menu Price Adjustment",
        "description": "Simulate revenue impact of changing menu item prices with elasticity modeling",
        "inputs": ["item_category", "price_change_pct", "demand_elasticity"],
        "affects": ["revenue", "covers", "check_average", "food_cost_pct"],
    },
    "vendor_substitution": {
        "name": "Vendor Substitution",
        "description": "Model cost and quality impact of switching ingredient suppliers",
        "inputs": ["ingredient_category", "cost_change_pct", "quality_impact"],
        "affects": ["food_cost", "quality_score", "yield", "waste"],
    },
    "occupancy_shift": {
        "name": "Occupancy Rate Change",
        "description": "Project F&B capture impact from hotel occupancy fluctuations",
        "inputs": ["occupancy_delta_pct", "capture_rate", "period_days"],
        "affects": ["revenue", "covers", "labor_need", "inventory_demand"],
    },
    "event_cancellation": {
        "name": "Event Cancellation",
        "description": "Calculate total financial exposure from cancelling a scheduled event",
        "inputs": ["event_id", "cancellation_window_days"],
        "affects": ["revenue_loss", "sunk_costs", "labor_reallocation", "inventory_exposure"],
    },
    "overtime_cap": {
        "name": "Overtime Cap Implementation",
        "description": "Model the impact of capping overtime hours across departments",
        "inputs": ["max_weekly_ot_hours", "departments"],
        "affects": ["labor_cost_savings", "service_gaps", "coverage_impact"],
    },
}


class SimulationRequest(BaseModel):
    scenario_type: str
    parameters: dict
    property_id: str = "luccca-primary"
    notes: Optional[str] = None


class ForecastRequest(BaseModel):
    metric: str  # revenue, food_cost, labor, covers, ebitda
    horizon_days: int = 30
    include_scenarios: bool = False


class BranchStep(BaseModel):
    scenario_type: str
    parameters: dict
    label: Optional[str] = None


class BranchRequest(BaseModel):
    steps: list  # list of BranchStep dicts
    property_id: str = "luccca-primary"
    name: Optional[str] = None


# ─── Delta Calculators ───

def _get_baseline_financials() -> dict:
    """Pull current baseline from GL entries."""
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(200))
    total_rev = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "revenue")
    food_cost = sum(e.get("amount", 0) for e in gl if "food" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
    bev_cost = sum(e.get("amount", 0) for e in gl if "beverage" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
    labor_total = sum(s.get("total_cost", 0) for s in db["labor_schedules"].find({}, {"_id": 0}).limit(200))
    events_list = list(db["events"].find({}, {"_id": 0}).limit(50))
    total_covers = sum(e.get("guest_count", 0) for e in events_list)
    opex = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "expense") - food_cost - bev_cost - labor_total

    return {
        "revenue": total_rev,
        "food_cost": food_cost,
        "beverage_cost": bev_cost,
        "labor_cost": labor_total,
        "opex": max(opex, 0),
        "ebitda": total_rev - food_cost - bev_cost - labor_total - max(opex, 0),
        "total_covers": total_covers,
        "event_count": len(events_list),
        "food_cost_pct": round(food_cost / max(total_rev, 1) * 100, 1),
        "labor_pct": round(labor_total / max(total_rev, 1) * 100, 1),
    }


def simulate_banquet_change(params: dict, baseline: dict) -> dict:
    cover_delta = params.get("cover_delta", 0)
    meal_type = params.get("meal_type", "plated_dinner")

    # Cost per cover by meal type
    cost_per_cover = {
        "plated_dinner": 85, "buffet_dinner": 65, "plated_lunch": 55,
        "buffet_lunch": 45, "reception": 35, "breakfast": 30,
    }
    rev_per_cover = {
        "plated_dinner": 165, "buffet_dinner": 120, "plated_lunch": 95,
        "buffet_lunch": 80, "reception": 65, "breakfast": 50,
    }

    cpc = cost_per_cover.get(meal_type, 65)
    rpc = rev_per_cover.get(meal_type, 120)

    food_delta = round(cpc * 0.38 * cover_delta, 2)
    labor_delta = round(cpc * 0.35 * cover_delta, 2)
    rev_delta = round(rpc * cover_delta, 2)
    ebitda_delta = rev_delta - food_delta - labor_delta - round(cpc * 0.1 * cover_delta, 2)

    # Prep time calculation (hours)
    prep_hours_per_50 = {"plated_dinner": 8, "buffet_dinner": 6, "plated_lunch": 5, "buffet_lunch": 4, "reception": 3, "breakfast": 3}
    prep_delta = round(abs(cover_delta) / 50 * prep_hours_per_50.get(meal_type, 5), 1)

    return {
        "scenario": "banquet_change",
        "cover_delta": cover_delta,
        "meal_type": meal_type,
        "deltas": {
            "revenue": {"current": baseline["revenue"], "delta": rev_delta, "new": baseline["revenue"] + rev_delta},
            "food_cost": {"current": baseline["food_cost"], "delta": food_delta, "new": baseline["food_cost"] + food_delta},
            "labor_cost": {"current": baseline["labor_cost"], "delta": labor_delta, "new": baseline["labor_cost"] + labor_delta},
            "ebitda": {"current": baseline["ebitda"], "delta": ebitda_delta, "new": baseline["ebitda"] + ebitda_delta},
        },
        "operational_impact": {
            "additional_prep_hours": prep_delta if cover_delta > 0 else 0,
            "additional_servers": max(0, cover_delta // 20),
            "additional_cooks": max(0, cover_delta // 40),
            "inventory_items_to_order": max(0, cover_delta // 10),
        },
        "margin_impact": {
            "current_margin_pct": round(baseline["ebitda"] / max(baseline["revenue"], 1) * 100, 1),
            "new_margin_pct": round((baseline["ebitda"] + ebitda_delta) / max(baseline["revenue"] + rev_delta, 1) * 100, 1),
        },
    }


def simulate_labor_adjustment(params: dict, baseline: dict) -> dict:
    headcount_delta = params.get("headcount_delta", 0)
    department = params.get("department", "kitchen")
    shift_type = params.get("shift_type", "full_time")
    period_days = params.get("period_days", 30)

    hourly_rates = {"kitchen": 22, "front_of_house": 18, "bar": 20, "banquets": 19, "stewarding": 16, "management": 38}
    hours_per_shift = {"full_time": 8, "part_time": 5, "overtime": 4}

    rate = hourly_rates.get(department, 20)
    hours = hours_per_shift.get(shift_type, 8)
    ot_mult = 1.5 if shift_type == "overtime" else 1.0

    daily_cost = headcount_delta * hours * rate * ot_mult
    period_cost = round(daily_cost * period_days, 2)
    annual_cost = round(daily_cost * 365, 2)

    covers_per_staff = {"kitchen": 40, "front_of_house": 25, "bar": 30, "banquets": 35, "stewarding": 60, "management": 0}
    capacity_delta = headcount_delta * covers_per_staff.get(department, 30)

    return {
        "scenario": "labor_adjustment",
        "department": department,
        "headcount_delta": headcount_delta,
        "deltas": {
            "labor_cost": {"current": baseline["labor_cost"], "delta": period_cost, "new": baseline["labor_cost"] + period_cost},
            "labor_pct": {"current": baseline["labor_pct"], "delta": round(period_cost / max(baseline["revenue"], 1) * 100, 1), "new": round((baseline["labor_cost"] + period_cost) / max(baseline["revenue"], 1) * 100, 1)},
            "ebitda": {"current": baseline["ebitda"], "delta": -period_cost, "new": baseline["ebitda"] - period_cost},
        },
        "operational_impact": {
            "daily_cost_change": round(daily_cost, 2),
            "period_cost_change": period_cost,
            "annual_cost_change": annual_cost,
            "capacity_covers_delta": capacity_delta,
            "overtime_risk": "HIGH" if baseline["labor_pct"] + (period_cost / max(baseline["revenue"], 1) * 100) > 32 else "LOW",
        },
    }


def simulate_menu_price_change(params: dict, baseline: dict) -> dict:
    price_change_pct = params.get("price_change_pct", 0)
    demand_elasticity = params.get("demand_elasticity", -0.3)
    category = params.get("item_category", "entrees")

    # Category revenue shares
    cat_share = {"entrees": 0.40, "appetizers": 0.15, "desserts": 0.10, "beverages": 0.20, "sides": 0.05, "specials": 0.10}
    share = cat_share.get(category, 0.20)

    cat_revenue = baseline["revenue"] * share
    demand_change_pct = price_change_pct * demand_elasticity

    new_price_factor = 1 + (price_change_pct / 100)
    new_demand_factor = 1 + (demand_change_pct / 100)
    new_cat_revenue = cat_revenue * new_price_factor * new_demand_factor
    rev_delta = round(new_cat_revenue - cat_revenue, 2)

    new_covers = round(baseline["total_covers"] * (1 + (demand_change_pct / 100 * share)))
    check_avg_current = baseline["revenue"] / max(baseline["total_covers"], 1)
    check_avg_new = (baseline["revenue"] + rev_delta) / max(new_covers, 1)

    return {
        "scenario": "menu_price_change",
        "category": category,
        "price_change_pct": price_change_pct,
        "demand_elasticity": demand_elasticity,
        "deltas": {
            "revenue": {"current": baseline["revenue"], "delta": rev_delta, "new": baseline["revenue"] + rev_delta},
            "covers": {"current": baseline["total_covers"], "delta": new_covers - baseline["total_covers"], "new": new_covers},
            "check_average": {"current": round(check_avg_current, 2), "delta": round(check_avg_new - check_avg_current, 2), "new": round(check_avg_new, 2)},
            "food_cost_pct": {
                "current": baseline["food_cost_pct"],
                "delta": round(-price_change_pct * 0.3, 1),
                "new": round(baseline["food_cost_pct"] - price_change_pct * 0.3, 1),
            },
        },
    }


def simulate_vendor_substitution(params: dict, baseline: dict) -> dict:
    cost_change_pct = params.get("cost_change_pct", 0)
    quality_impact = params.get("quality_impact", "neutral")
    category = params.get("ingredient_category", "proteins")

    cat_share = {"proteins": 0.35, "produce": 0.20, "dairy": 0.15, "dry_goods": 0.12, "seafood": 0.10, "bakery": 0.08}
    share = cat_share.get(category, 0.15)
    cat_cost = baseline["food_cost"] * share
    cost_delta = round(cat_cost * (cost_change_pct / 100), 2)

    quality_yield = {"positive": 1.03, "neutral": 1.0, "negative": 0.95}
    yield_factor = quality_yield.get(quality_impact, 1.0)
    waste_impact = {"positive": -0.5, "neutral": 0, "negative": 1.5}

    return {
        "scenario": "vendor_substitution",
        "category": category,
        "cost_change_pct": cost_change_pct,
        "deltas": {
            "food_cost": {"current": baseline["food_cost"], "delta": cost_delta, "new": baseline["food_cost"] + cost_delta},
            "food_cost_pct": {
                "current": baseline["food_cost_pct"],
                "delta": round(cost_delta / max(baseline["revenue"], 1) * 100, 1),
                "new": round((baseline["food_cost"] + cost_delta) / max(baseline["revenue"], 1) * 100, 1),
            },
            "ebitda": {"current": baseline["ebitda"], "delta": -cost_delta, "new": baseline["ebitda"] - cost_delta},
        },
        "quality_impact": {
            "quality_change": quality_impact,
            "yield_factor": yield_factor,
            "waste_change_pct": waste_impact.get(quality_impact, 0),
        },
    }


def simulate_occupancy_shift(params: dict, baseline: dict) -> dict:
    occ_delta = params.get("occupancy_delta_pct", 0)
    capture_rate = params.get("capture_rate", 0.65)
    period_days = params.get("period_days", 30)

    rooms = 250
    current_occ = 0.72
    new_occ = min(1.0, max(0, current_occ + occ_delta / 100))
    room_nights_delta = round(rooms * (occ_delta / 100) * period_days)
    fnb_guests_delta = round(room_nights_delta * capture_rate * 1.8)
    avg_check = baseline["revenue"] / max(baseline["total_covers"], 1)
    rev_delta = round(fnb_guests_delta * avg_check, 2)

    labor_need_delta = max(0, fnb_guests_delta // 25)

    return {
        "scenario": "occupancy_shift",
        "occupancy_delta_pct": occ_delta,
        "deltas": {
            "revenue": {"current": baseline["revenue"], "delta": rev_delta, "new": baseline["revenue"] + rev_delta},
            "covers": {"current": baseline["total_covers"], "delta": fnb_guests_delta, "new": baseline["total_covers"] + fnb_guests_delta},
        },
        "operational_impact": {
            "room_nights_change": room_nights_delta,
            "fnb_guest_change": fnb_guests_delta,
            "additional_staff_needed": labor_need_delta,
            "current_occupancy": round(current_occ * 100, 1),
            "projected_occupancy": round(new_occ * 100, 1),
        },
    }


def simulate_event_cancellation(params: dict, baseline: dict) -> dict:
    cancellation_days = params.get("cancellation_window_days", 7)

    # Pull a sample event
    event = db["events"].find_one({}, {"_id": 0})
    covers = event.get("guest_count", 150) if event else 150
    event_rev = covers * 135
    food_sunk = event_rev * 0.15 if cancellation_days < 3 else event_rev * 0.05
    labor_sunk = event_rev * 0.08 if cancellation_days < 5 else 0

    return {
        "scenario": "event_cancellation",
        "cancellation_window_days": cancellation_days,
        "deltas": {
            "revenue_loss": {"amount": round(event_rev, 2), "recoverable": round(event_rev * 0.1, 2)},
            "sunk_food_cost": {"amount": round(food_sunk, 2), "reason": "Perishables already ordered/prepped"},
            "sunk_labor_cost": {"amount": round(labor_sunk, 2), "reason": "Staff already scheduled"},
            "net_financial_impact": {"amount": round(-(event_rev - food_sunk - labor_sunk), 2)},
        },
        "mitigation": {
            "labor_reallocation": f"Reassign {max(1, covers // 30)} staff to other outlets",
            "inventory_redirect": "Redirect perishables to daily outlets within 48h",
            "cancellation_fee": f"Enforce {min(100, max(10, 50 - cancellation_days * 5))}% cancellation fee per contract",
        },
    }


def simulate_overtime_cap(params: dict, baseline: dict) -> dict:
    max_ot = params.get("max_weekly_ot_hours", 10)
    departments = params.get("departments", ["kitchen", "front_of_house", "bar"])

    schedules = list(db["labor_schedules"].find({}, {"_id": 0}).limit(100))
    current_ot_hours = sum(max(0, s.get("total_hours", 0) - 40) for s in schedules)
    current_ot_cost = current_ot_hours * 28 * 1.5

    capped_ot_hours = min(current_ot_hours, max_ot * len(departments) * 4)
    new_ot_cost = capped_ot_hours * 28 * 1.5
    savings = round(current_ot_cost - new_ot_cost, 2)

    return {
        "scenario": "overtime_cap",
        "max_weekly_ot_hours": max_ot,
        "departments": departments,
        "deltas": {
            "labor_cost": {"current": baseline["labor_cost"], "delta": -savings, "new": baseline["labor_cost"] - savings},
            "overtime_hours": {"current": round(current_ot_hours, 1), "new": round(capped_ot_hours, 1), "reduction": round(current_ot_hours - capped_ot_hours, 1)},
            "ebitda": {"current": baseline["ebitda"], "delta": savings, "new": baseline["ebitda"] + savings},
        },
        "operational_impact": {
            "service_gap_risk": "HIGH" if savings > baseline["labor_cost"] * 0.05 else "MEDIUM" if savings > baseline["labor_cost"] * 0.02 else "LOW",
            "departments_affected": departments,
            "recommended_mitigation": "Increase cross-training to maintain coverage without overtime",
        },
    }


SIMULATOR_MAP = {
    "banquet_change": simulate_banquet_change,
    "labor_adjustment": simulate_labor_adjustment,
    "menu_price_change": simulate_menu_price_change,
    "vendor_substitution": simulate_vendor_substitution,
    "occupancy_shift": simulate_occupancy_shift,
    "event_cancellation": simulate_event_cancellation,
    "overtime_cap": simulate_overtime_cap,
}


# ─── Forecast Engine ───

def generate_forecast(metric: str, horizon_days: int) -> dict:
    """Generate a rolling forecast for a specific metric."""
    baseline = _get_baseline_financials()
    daily_rev = baseline["revenue"] / 30
    daily_food = baseline["food_cost"] / 30
    daily_labor = baseline["labor_cost"] / 30
    daily_covers = baseline["total_covers"] / 30

    import math
    forecasts = []
    for d in range(1, horizon_days + 1):
        # Simple seasonal model: weekends get 20% boost, mid-week dips
        dow_factor = 1.2 if d % 7 in (5, 6) else 0.95 if d % 7 in (1, 2) else 1.0
        # Growth trend: 0.1% daily compounding
        trend = 1 + (0.001 * d)
        # Seasonality wave
        season = 1 + 0.05 * math.sin(2 * math.pi * d / 90)

        factor = dow_factor * trend * season

        if metric == "revenue":
            forecasts.append({"day": d, "value": round(daily_rev * factor, 2), "lower": round(daily_rev * factor * 0.9, 2), "upper": round(daily_rev * factor * 1.1, 2)})
        elif metric == "food_cost":
            forecasts.append({"day": d, "value": round(daily_food * factor * 0.98, 2), "lower": round(daily_food * factor * 0.92, 2), "upper": round(daily_food * factor * 1.06, 2)})
        elif metric == "labor":
            forecasts.append({"day": d, "value": round(daily_labor * factor * 0.97, 2), "lower": round(daily_labor * factor * 0.93, 2), "upper": round(daily_labor * factor * 1.05, 2)})
        elif metric == "covers":
            forecasts.append({"day": d, "value": round(daily_covers * factor), "lower": round(daily_covers * factor * 0.85), "upper": round(daily_covers * factor * 1.15)})
        elif metric == "ebitda":
            ebitda_daily = (baseline["ebitda"]) / 30
            forecasts.append({"day": d, "value": round(ebitda_daily * factor, 2), "lower": round(ebitda_daily * factor * 0.8, 2), "upper": round(ebitda_daily * factor * 1.2, 2)})

    total_forecast = sum(f["value"] for f in forecasts)
    return {
        "metric": metric,
        "horizon_days": horizon_days,
        "baseline_monthly": round(baseline.get(metric, baseline["revenue"]), 2),
        "forecast_total": round(total_forecast, 2),
        "forecast_daily_avg": round(total_forecast / max(horizon_days, 1), 2),
        "confidence_band": "90%",
        "daily_forecast": forecasts[:90],
    }


# ─── AI-Powered Narrative ───

async def _generate_simulation_narrative(result: dict) -> str:
    """Use LLM to narrate simulation results."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(api_key=LLM_KEY, session_id=f"sim-{_uid()}", system_message=(
            "You are EchoAi3's Simulation Engine. Provide a concise executive summary of the simulation results. "
            "Use specific numbers. Highlight risks and opportunities. Be direct — no filler. 3-5 sentences max."
        ))
        chat.with_model("openai", "gpt-4.1-mini")
        import json
        narrative = await chat.send_message(UserMessage(text=f"Simulation results:\n{json.dumps(result, indent=2)}"))
        return narrative
    except Exception:
        return ""


# ─── API Endpoints ───

@router.get("/templates")
async def get_simulation_templates():
    """Get all available simulation scenario templates."""
    return {"templates": SCENARIO_TEMPLATES}


@router.post("/run")
async def run_simulation(req: SimulationRequest):
    """Execute a simulation scenario and return delta analysis."""
    if req.scenario_type not in SIMULATOR_MAP:
        return {"error": f"Unknown scenario: {req.scenario_type}", "available": list(SIMULATOR_MAP.keys())}

    baseline = _get_baseline_financials()
    simulator = SIMULATOR_MAP[req.scenario_type]
    result = simulator(req.parameters, baseline)

    # AI narrative
    narrative = await _generate_simulation_narrative(result)

    sim_id = f"sim-{_uid()}"

    # Log to TraceLedger
    trace_log(
        event_type="simulation_executed",
        entity_type="echoai3_simulation",
        entity_id=sim_id,
        actor_id="echoai3",
        metadata={"scenario": req.scenario_type, "parameters": req.parameters},
    )

    # Store simulation
    db["ai3_simulations"].insert_one({
        "simulation_id": sim_id,
        "scenario_type": req.scenario_type,
        "parameters": req.parameters,
        "baseline": baseline,
        "result": result,
        "narrative": narrative,
        "property_id": req.property_id,
        "created_at": _now(),
    })

    return {
        "simulation_id": sim_id,
        "scenario_type": req.scenario_type,
        "baseline": baseline,
        "result": result,
        "narrative": narrative,
        "timestamp": _now(),
    }


@router.post("/forecast")
async def run_forecast(req: ForecastRequest):
    """Generate a rolling forecast for a specific metric."""
    valid_metrics = ["revenue", "food_cost", "labor", "covers", "ebitda"]
    if req.metric not in valid_metrics:
        return {"error": f"Unknown metric: {req.metric}", "valid": valid_metrics}

    forecast = generate_forecast(req.metric, req.horizon_days)
    return {"forecast": forecast, "timestamp": _now()}


@router.post("/branch")
async def run_branch_exploration(req: BranchRequest):
    """Execute a multi-step scenario branch — chaining scenarios with compounding effects.
    Each step builds on the modified baseline from the previous step."""
    if not req.steps or len(req.steps) == 0:
        return {"error": "At least one scenario step is required"}
    if len(req.steps) > 10:
        return {"error": "Maximum 10 steps per branch"}

    baseline = _get_baseline_financials()
    current_baseline = dict(baseline)
    branch_id = f"branch-{_uid()}"
    nodes = []
    cumulative_deltas = {
        "revenue": 0, "food_cost": 0, "labor_cost": 0, "ebitda": 0, "total_covers": 0,
    }

    for i, step_data in enumerate(req.steps):
        step = step_data if isinstance(step_data, dict) else step_data.dict() if hasattr(step_data, "dict") else {}
        scenario_type = step.get("scenario_type", "")
        params = step.get("parameters", {})
        label = step.get("label", f"Step {i + 1}: {scenario_type}")

        if scenario_type not in SIMULATOR_MAP:
            nodes.append({
                "step": i + 1, "label": label, "scenario_type": scenario_type,
                "error": f"Unknown scenario: {scenario_type}",
            })
            continue

        simulator = SIMULATOR_MAP[scenario_type]
        result = simulator(params, current_baseline)

        # Extract deltas and update running baseline
        step_deltas = {}
        deltas = result.get("deltas", {})
        for key in ["revenue", "food_cost", "labor_cost", "ebitda"]:
            if key in deltas and isinstance(deltas[key], dict):
                d = deltas[key].get("delta", 0)
                step_deltas[key] = d
                cumulative_deltas[key] += d
                current_baseline[key] = current_baseline.get(key, 0) + d
        # Update derived percentages
        if current_baseline.get("revenue", 0) > 0:
            current_baseline["food_cost_pct"] = round(current_baseline["food_cost"] / current_baseline["revenue"] * 100, 1)
            current_baseline["labor_pct"] = round(current_baseline["labor_cost"] / current_baseline["revenue"] * 100, 1)
        # Cover changes
        if "covers" in deltas and isinstance(deltas["covers"], dict):
            cd = deltas["covers"].get("delta", 0)
            step_deltas["covers"] = cd
            cumulative_deltas["total_covers"] += cd
            current_baseline["total_covers"] = current_baseline.get("total_covers", 0) + cd

        nodes.append({
            "step": i + 1,
            "label": label,
            "scenario_type": scenario_type,
            "parameters": params,
            "step_deltas": step_deltas,
            "cumulative_state": {
                "revenue": round(current_baseline.get("revenue", 0), 2),
                "food_cost": round(current_baseline.get("food_cost", 0), 2),
                "labor_cost": round(current_baseline.get("labor_cost", 0), 2),
                "ebitda": round(current_baseline.get("ebitda", 0), 2),
                "food_cost_pct": round(current_baseline.get("food_cost_pct", 0), 1),
                "labor_pct": round(current_baseline.get("labor_pct", 0), 1),
                "total_covers": current_baseline.get("total_covers", 0),
            },
            "operational_impact": result.get("operational_impact", {}),
            "detail": result,
        })

    # Compute overall summary
    orig_ebitda = baseline.get("ebitda", 0)
    final_ebitda = current_baseline.get("ebitda", 0)
    ebitda_change_pct = round((final_ebitda - orig_ebitda) / max(abs(orig_ebitda), 1) * 100, 1) if orig_ebitda else 0

    summary = {
        "total_steps": len(nodes),
        "baseline": baseline,
        "final_state": {k: round(v, 2) if isinstance(v, float) else v for k, v in current_baseline.items()},
        "cumulative_deltas": {k: round(v, 2) for k, v in cumulative_deltas.items()},
        "ebitda_change_pct": ebitda_change_pct,
        "verdict": "FAVORABLE" if final_ebitda > orig_ebitda else "UNFAVORABLE" if final_ebitda < orig_ebitda else "NEUTRAL",
    }

    # AI narrative
    narrative = await _generate_simulation_narrative({"summary": summary, "steps": len(nodes)})

    # Store
    db["ai3_branches"].insert_one({
        "branch_id": branch_id,
        "name": req.name or f"Branch {branch_id[-6:]}",
        "steps": req.steps,
        "nodes": nodes,
        "summary": summary,
        "narrative": narrative,
        "property_id": req.property_id,
        "created_at": _now(),
    })

    trace_log(
        event_type="branch_explored",
        entity_type="echoai3_simulation",
        entity_id=branch_id,
        actor_id="echoai3",
        metadata={"steps": len(nodes), "verdict": summary["verdict"]},
    )

    return {
        "branch_id": branch_id,
        "name": req.name or f"Branch {branch_id[-6:]}",
        "nodes": nodes,
        "summary": summary,
        "narrative": narrative,
        "timestamp": _now(),
    }


@router.get("/branches")
async def list_branches(limit: int = Query(20)):
    """List recent branch explorations."""
    branches = list(db["ai3_branches"].find(
        {}, {"_id": 0, "branch_id": 1, "name": 1, "summary": 1, "narrative": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit))
    return {"branches": branches, "count": len(branches)}


@router.get("/branch/{branch_id}")
async def get_branch(branch_id: str):
    """Get a specific branch exploration result."""
    branch = db["ai3_branches"].find_one({"branch_id": branch_id}, {"_id": 0})
    if not branch:
        return {"error": "Branch not found"}
    return branch


@router.get("/history")
async def simulation_history(limit: int = Query(20)):
    """Get recent simulation history."""
    sims = list(db["ai3_simulations"].find(
        {}, {"_id": 0, "simulation_id": 1, "scenario_type": 1, "parameters": 1, "narrative": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit))
    return {"simulations": sims, "count": len(sims)}


@router.get("/{sim_id}")
async def get_simulation(sim_id: str):
    """Get a specific simulation result."""
    sim = db["ai3_simulations"].find_one({"simulation_id": sim_id}, {"_id": 0})
    if not sim:
        return {"error": "Simulation not found"}
    return sim
