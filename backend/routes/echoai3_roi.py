"""
EchoAi³ Time Savings & ROI Analytics
======================================
Tracks time saved by automation vs manual processes.
Quantifies management hours, chef hours, and operational efficiency.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from database import db

router = APIRouter(prefix="/api/echoai3/roi", tags=["echoai3-roi"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# Time benchmarks (minutes per task — industry averages for MANUAL process)
# freq_per_beo: how often this task runs per BEO.
#   1.0 = every single BEO triggers this task
#   0.5 = shared across ~2 BEOs (batched)
#   fractions = periodic tasks amortized per event
MANUAL_TIMES = {
    "beo_creation":             {"manual_mins": 45,  "echo_mins": 2,   "role": "Event Manager",   "hourly_rate": 35, "freq_per_beo": 1.0},
    "recipe_costing":           {"manual_mins": 30,  "echo_mins": 0.5, "role": "Chef",             "hourly_rate": 45, "freq_per_beo": 0.6},   # ~60% of BEOs need fresh costing
    "menu_building":            {"manual_mins": 60,  "echo_mins": 3,   "role": "Chef",             "hourly_rate": 45, "freq_per_beo": 0.3},   # menus reused across events
    "floor_plan_layout":        {"manual_mins": 35,  "echo_mins": 1,   "role": "Event Manager",   "hourly_rate": 35, "freq_per_beo": 0.7},   # template rooms reduce need
    "equipment_pull_sheet":     {"manual_mins": 20,  "echo_mins": 0,   "role": "Banquet Captain",  "hourly_rate": 28, "freq_per_beo": 1.0},
    "schedule_generation":      {"manual_mins": 40,  "echo_mins": 1,   "role": "Banquet Manager",  "hourly_rate": 38, "freq_per_beo": 1.0},
    "pto_conflict_check":       {"manual_mins": 15,  "echo_mins": 0.2, "role": "Chef/Manager",     "hourly_rate": 40, "freq_per_beo": 1.0},
    "order_consolidation":      {"manual_mins": 90,  "echo_mins": 2,   "role": "Chef",             "hourly_rate": 45, "freq_per_beo": 0.15},  # 1-2x/day across all BEOs
    "production_timeline":      {"manual_mins": 45,  "echo_mins": 1,   "role": "Chef",             "hourly_rate": 45, "freq_per_beo": 1.0},
    "fire_guide_creation":      {"manual_mins": 25,  "echo_mins": 0.5, "role": "Chef",             "hourly_rate": 45, "freq_per_beo": 1.0},
    "inventory_check":          {"manual_mins": 30,  "echo_mins": 0.5, "role": "Receiving Clerk",  "hourly_rate": 20, "freq_per_beo": 0.08},  # ~1x/day regardless of BEO count
    "vendor_ordering":          {"manual_mins": 25,  "echo_mins": 1,   "role": "Purchasing",       "hourly_rate": 28, "freq_per_beo": 0.15},  # batched 1-2x/day
    "invoice_matching":         {"manual_mins": 20,  "echo_mins": 0.3, "role": "AP Clerk",         "hourly_rate": 25, "freq_per_beo": 0.2},   # batched
    "gl_posting":               {"manual_mins": 10,  "echo_mins": 0,   "role": "Controller",       "hourly_rate": 55, "freq_per_beo": 0.08},  # daily batch, not per BEO
    "guest_satisfaction_tracking":{"manual_mins": 15, "echo_mins": 0.5, "role": "Event Manager",   "hourly_rate": 35, "freq_per_beo": 1.0},
    "engineering_scheduling":   {"manual_mins": 10,  "echo_mins": 0,   "role": "Eng Manager",      "hourly_rate": 32, "freq_per_beo": 0.5},   # shared across rooms
    "hk_notification":          {"manual_mins": 5,   "echo_mins": 0,   "role": "HK Manager",       "hourly_rate": 28, "freq_per_beo": 0.5},   # batched by floor
    "calendar_update":          {"manual_mins": 5,   "echo_mins": 0,   "role": "Coordinator",      "hourly_rate": 22, "freq_per_beo": 1.0},
    "financial_reconciliation": {"manual_mins": 30,  "echo_mins": 1,   "role": "Controller",       "hourly_rate": 55, "freq_per_beo": 0.08},  # daily, not per BEO
    "menu_analytics":           {"manual_mins": 120, "echo_mins": 1,   "role": "F&B Director",     "hourly_rate": 50, "freq_per_beo": 0.02},  # weekly, amortized
}


@router.get("/per-beo")
async def time_savings_per_beo():
    """Calculate time saved per single BEO event, weighted by frequency."""
    total_manual = 0
    total_echo = 0
    total_cost_manual = 0
    total_cost_echo = 0
    breakdown = []

    for task, data in MANUAL_TIMES.items():
        freq = data.get("freq_per_beo", 1.0)
        manual_weighted = data["manual_mins"] * freq
        echo_weighted = data["echo_mins"] * freq
        saved = manual_weighted - echo_weighted
        cost_manual = round(manual_weighted / 60 * data["hourly_rate"], 2)
        cost_echo = round(echo_weighted / 60 * data["hourly_rate"], 2)

        total_manual += manual_weighted
        total_echo += echo_weighted
        total_cost_manual += cost_manual
        total_cost_echo += cost_echo

        breakdown.append({
            "task": task.replace("_", " ").title(),
            "manual_mins": round(manual_weighted, 1),
            "echo_mins": round(echo_weighted, 1),
            "saved_mins": round(saved, 1),
            "raw_manual_mins": data["manual_mins"],
            "raw_echo_mins": data["echo_mins"],
            "frequency": freq,
            "role": data["role"], "hourly_rate": data["hourly_rate"],
            "cost_manual": cost_manual, "cost_echo": cost_echo,
            "cost_saved": round(cost_manual - cost_echo, 2),
        })

    breakdown.sort(key=lambda x: -x["saved_mins"])

    return {
        "per_beo": {
            "total_manual_minutes": round(total_manual, 1),
            "total_echo_minutes": round(total_echo, 1),
            "minutes_saved": round(total_manual - total_echo, 1),
            "hours_saved": round((total_manual - total_echo) / 60, 1),
            "efficiency_gain_pct": round((1 - total_echo / max(total_manual, 1)) * 100, 1),
            "cost_manual": round(total_cost_manual, 2),
            "cost_echo": round(total_cost_echo, 2),
            "cost_saved": round(total_cost_manual - total_cost_echo, 2),
        },
        "breakdown": breakdown,
    }


@router.get("/daily")
async def daily_savings(events_per_day: int = Query(12)):
    """Calculate daily time savings for a typical day with N events."""
    per_beo = await time_savings_per_beo()
    pb = per_beo["per_beo"]

    return {
        "events_per_day": events_per_day,
        "daily_manual_hours": round(pb["total_manual_minutes"] * events_per_day / 60, 1),
        "daily_echo_hours": round(pb["total_echo_minutes"] * events_per_day / 60, 1),
        "daily_hours_saved": round(pb["minutes_saved"] * events_per_day / 60, 1),
        "daily_cost_saved": round(pb["cost_saved"] * events_per_day, 2),
        "fte_equivalent_saved": round(pb["minutes_saved"] * events_per_day / 480, 1),  # 8hr shift
        "chef_hours_saved": round(sum(
            (MANUAL_TIMES[t]["manual_mins"] - MANUAL_TIMES[t]["echo_mins"])
            * MANUAL_TIMES[t].get("freq_per_beo", 1.0) * events_per_day / 60
            for t in MANUAL_TIMES if MANUAL_TIMES[t]["role"] == "Chef"
        ), 1),
    }


@router.get("/annual")
async def annual_savings(events_per_day: int = Query(12), operating_days: int = Query(350)):
    """Annual ROI calculation."""
    daily = await daily_savings(events_per_day)
    annual_events = events_per_day * operating_days

    return {
        "events_per_day": events_per_day,
        "operating_days": operating_days,
        "annual_events": annual_events,
        "annual_hours_saved": round(daily["daily_hours_saved"] * operating_days, 0),
        "annual_cost_saved": round(daily["daily_cost_saved"] * operating_days, 0),
        "annual_fte_saved": round(daily["fte_equivalent_saved"], 1),
        "annual_chef_hours_saved": round(daily["chef_hours_saved"] * operating_days, 0),
        "equivalent_salary_saved": round(daily["daily_cost_saved"] * operating_days, 0),
        "roi_metrics": {
            "manual_cost_per_event": round(daily["daily_cost_saved"] / max(events_per_day, 1) + daily["daily_echo_hours"] * 35 / max(events_per_day, 1), 2),
            "echo_cost_per_event": round(daily["daily_echo_hours"] * 35 / max(events_per_day, 1), 2),
        },
    }


@router.get("/live")
async def live_savings():
    """Calculate ACTUAL savings based on real operations data."""
    beo_count = db["beo_documents"].count_documents({})
    recipe_count = db["beo_recipes"].count_documents({"status": "active"})
    schedule_count = db["banquet_schedules"].count_documents({})
    order_count = db["consolidated_orders"].count_documents({})
    pto_count = db["pto_requests"].count_documents({})
    pull_sheets = db["equipment_pull_sheets"].count_documents({})
    financial_cycles = db["financial_cycles"].count_documents({})

    ops = {
        "beos_created": beo_count,
        "recipes_costed": recipe_count,
        "schedules_generated": schedule_count,
        "orders_consolidated": order_count,
        "pto_processed": pto_count,
        "pull_sheets_generated": pull_sheets,
        "financial_cycles_run": financial_cycles,
    }

    # Calculate actual time saved (frequency already baked into per-event counts)
    actual_saved_mins = (
        beo_count * (MANUAL_TIMES["beo_creation"]["manual_mins"] - MANUAL_TIMES["beo_creation"]["echo_mins"]) +
        recipe_count * (MANUAL_TIMES["recipe_costing"]["manual_mins"] - MANUAL_TIMES["recipe_costing"]["echo_mins"]) * MANUAL_TIMES["recipe_costing"]["freq_per_beo"] +
        beo_count * (MANUAL_TIMES["equipment_pull_sheet"]["manual_mins"]) +  # Auto = 0 mins
        schedule_count * (MANUAL_TIMES["schedule_generation"]["manual_mins"] - MANUAL_TIMES["schedule_generation"]["echo_mins"]) +
        order_count * (MANUAL_TIMES["order_consolidation"]["manual_mins"] - MANUAL_TIMES["order_consolidation"]["echo_mins"]) * MANUAL_TIMES["order_consolidation"]["freq_per_beo"] +
        pto_count * (MANUAL_TIMES["pto_conflict_check"]["manual_mins"] - MANUAL_TIMES["pto_conflict_check"]["echo_mins"]) +
        beo_count * (MANUAL_TIMES["engineering_scheduling"]["manual_mins"]) * MANUAL_TIMES["engineering_scheduling"]["freq_per_beo"] +
        beo_count * (MANUAL_TIMES["hk_notification"]["manual_mins"]) * MANUAL_TIMES["hk_notification"]["freq_per_beo"] +
        beo_count * (MANUAL_TIMES["calendar_update"]["manual_mins"]) +
        financial_cycles * (MANUAL_TIMES["financial_reconciliation"]["manual_mins"] - MANUAL_TIMES["financial_reconciliation"]["echo_mins"])
    )

    return {
        "operations_performed": ops,
        "total_time_saved_minutes": actual_saved_mins,
        "total_time_saved_hours": round(actual_saved_mins / 60, 1),
        "equivalent_work_days": round(actual_saved_mins / 480, 1),
        "estimated_cost_saved": round(actual_saved_mins / 60 * 35, 2),  # Avg $35/hr
    }
