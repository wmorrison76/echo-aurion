"""
EchoStratus Budget & Forecast Engine (Enterprise-Grade)
==========================================================
- Daily Flash Report: auto-generated morning KPI snapshot
- Budget Builder: driver-based annual budget with 12-month P&L
- Forecast Adjustment: directors modify monthly forecasts with driver changes
- Budget vs Actual variance tracking
- Commentary and narrative per period
- Budget-to-Forecast flip for next year planning

Drivers: covers, avg_check, occupancy, food_cost_pct, labor_pct, bev_pct
Each driver flows through to calculate revenue, costs, and profit automatically.
"""
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, Dict, List

from database import db

router = APIRouter(prefix="/api/budget", tags=["budget-forecast"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
SEASONALITY = {1: 0.72, 2: 0.78, 3: 0.88, 4: 0.95, 5: 1.05, 6: 1.12, 7: 1.08, 8: 0.98, 9: 0.92, 10: 1.02, 11: 1.10, 12: 1.18}


class BudgetDrivers(BaseModel):
    avg_daily_covers: int = 225
    avg_check: float = 85.0
    occupancy_pct: float = 72.0
    food_cost_target_pct: float = 22.0
    bev_cost_target_pct: float = 18.0
    hourly_labor_target_pct: float = 25.0
    mgmt_salary_monthly: float = 22000.0
    benefits_monthly: float = 18500.0
    rent_monthly: float = 28000.0
    utilities_base: float = 8500.0
    marketing_monthly: float = 4500.0
    maintenance_monthly: float = 3500.0
    insurance_monthly: float = 4200.0
    growth_rate_pct: float = 3.0
    banquet_events_per_month: int = 6
    banquet_avg_revenue: float = 12000.0


class ForecastAdjustment(BaseModel):
    month: int  # 1-12
    year: int = 2026
    driver_changes: Dict[str, float] = {}
    commentary: Optional[str] = ""
    adjusted_by: Optional[str] = "Director"


# ── Daily Flash Report ──

@router.get("/daily-flash")
async def daily_flash():
    """Auto-generated morning flash report — yesterday's performance at a glance."""
    today = datetime.now(timezone.utc)
    yesterday = today - timedelta(days=1)
    y_str = yesterday.strftime("%Y-%m-%d")
    dow = MONTH_NAMES[yesterday.month - 1] + " " + str(yesterday.day)

    # Yesterday's POS data
    pos_txns = list(db["pos_transactions"].find({}, {"_id": 0}).limit(5000))
    y_txns = [t for t in pos_txns if t.get("closed_at", "").startswith(y_str)]

    # If no yesterday data (simulation may not have exact date), use last day with data
    if not y_txns and pos_txns:
        dates = set()
        for t in pos_txns:
            d = t.get("closed_at", "")[:10]
            if d:
                dates.add(d)
        if dates:
            latest_date = max(dates)
            y_txns = [t for t in pos_txns if t.get("closed_at", "").startswith(latest_date)]
            y_str = latest_date
            dow = latest_date

    y_revenue = sum(t.get("subtotal", 0) for t in y_txns)
    y_covers = sum(t.get("guest_count", 0) for t in y_txns)
    y_food_cost = sum(t.get("food_cost_total", 0) for t in y_txns)
    y_avg_check = round(y_revenue / max(len(y_txns), 1), 2)
    y_food_pct = round(y_food_cost / max(y_revenue, 1) * 100, 1)

    # Period-to-date (MTD from simulation)
    all_revenue = sum(t.get("subtotal", 0) for t in pos_txns)
    all_covers = sum(t.get("guest_count", 0) for t in pos_txns)
    all_food_cost = sum(t.get("food_cost_total", 0) for t in pos_txns)

    # Waste yesterday
    waste = list(db["waste_tracking"].find({"date": y_str}, {"_id": 0}))
    y_waste = round(sum(w.get("cost", 0) for w in waste), 2)

    # Labor yesterday
    labor = list(db["labor_schedules"].find({"date": y_str}, {"_id": 0}))
    y_labor = round(sum(s.get("total_cost", 0) for s in labor), 2)
    y_ot = round(sum(s.get("overtime_hours", 0) for s in labor), 1)

    # Recent invoices
    recent_inv = list(db["invoices"].find({}, {"_id": 0}).sort("created_at", -1).limit(3))

    # Build flash
    flash = {
        "date": y_str,
        "day_label": dow,
        "generated_at": _now(),
        "yesterday": {
            "revenue": round(y_revenue, 2),
            "covers": y_covers,
            "transactions": len(y_txns),
            "avg_check": y_avg_check,
            "food_cost": round(y_food_cost, 2),
            "food_cost_pct": y_food_pct,
            "labor_cost": y_labor,
            "overtime_hours": y_ot,
            "waste": y_waste,
        },
        "mtd": {
            "revenue": round(all_revenue, 2),
            "covers": all_covers,
            "transactions": len(pos_txns),
            "food_cost": round(all_food_cost, 2),
            "food_cost_pct": round(all_food_cost / max(all_revenue, 1) * 100, 1),
            "avg_check": round(all_revenue / max(len(pos_txns), 1), 2),
        },
        "alerts": [],
        "recent_deliveries": [
            {"vendor": inv.get("vendor_name"), "total": inv.get("total"), "date": inv.get("invoice_date")}
            for inv in recent_inv
        ],
    }

    # Alert generation
    if y_food_pct > 25:
        flash["alerts"].append({"severity": "critical", "message": f"Food cost {y_food_pct}% — above 25% threshold"})
    elif y_food_pct > 22:
        flash["alerts"].append({"severity": "warning", "message": f"Food cost {y_food_pct}% — above 22% target"})

    if y_ot > 5:
        flash["alerts"].append({"severity": "warning", "message": f"{y_ot} overtime hours yesterday — review scheduling"})

    if y_waste > 200:
        flash["alerts"].append({"severity": "info", "message": f"Waste ${y_waste:.0f} yesterday — above daily target"})

    return flash


# ── Budget Builder ──

@router.post("/build")
async def build_budget(drivers: BudgetDrivers, budget_name: str = Query("FY2027 Operating Budget")):
    """Build a 12-month budget from drivers. Each driver flows through to calculate all P&L lines."""
    months = {}
    annual = {"revenue": 0, "food_cost": 0, "bev_cost": 0, "hourly_labor": 0,
              "mgmt_salary": 0, "benefits": 0, "rent": 0, "utilities": 0,
              "marketing": 0, "maintenance": 0, "insurance": 0,
              "total_cost": 0, "ebitda": 0, "covers": 0, "events": 0,
              "banquet_revenue": 0}

    for m in range(1, 13):
        season = SEASONALITY.get(m, 1.0)
        growth = 1 + (drivers.growth_rate_pct / 100) * (m / 12)
        days_in_month = 30  # simplified

        # Revenue drivers
        monthly_covers = round(drivers.avg_daily_covers * days_in_month * season * growth)
        monthly_revenue = round(monthly_covers * drivers.avg_check, 2)
        banquet_rev = round(drivers.banquet_events_per_month * drivers.banquet_avg_revenue * season, 2)
        total_rev = round(monthly_revenue + banquet_rev, 2)

        # Cost drivers (% of revenue)
        food_cost = round(total_rev * drivers.food_cost_target_pct / 100, 2)
        bev_cost = round(total_rev * drivers.bev_cost_target_pct / 100, 2)
        hourly_labor = round(total_rev * drivers.hourly_labor_target_pct / 100, 2)

        # Fixed costs (adjusted by season for utilities)
        mgmt = drivers.mgmt_salary_monthly
        benefits = drivers.benefits_monthly
        rent = drivers.rent_monthly
        utilities = round(drivers.utilities_base * season, 2)
        marketing = drivers.marketing_monthly
        maint = drivers.maintenance_monthly
        insurance = drivers.insurance_monthly

        total_cost = round(food_cost + bev_cost + hourly_labor + mgmt + benefits + rent + utilities + marketing + maint + insurance, 2)
        ebitda = round(total_rev - total_cost, 2)

        months[str(m)] = {
            "month": m, "month_name": MONTH_NAMES[m - 1],
            "seasonality": season,
            "drivers": {
                "covers": monthly_covers,
                "avg_check": drivers.avg_check,
                "occupancy_pct": round(drivers.occupancy_pct * season, 1),
                "banquet_events": drivers.banquet_events_per_month,
            },
            "revenue": {"dining": monthly_revenue, "banquet": banquet_rev, "total": total_rev},
            "cost_of_sales": {"food": food_cost, "beverage": bev_cost, "total": round(food_cost + bev_cost, 2)},
            "labor": {
                "hourly": hourly_labor, "management": mgmt, "benefits": benefits,
                "total": round(hourly_labor + mgmt + benefits, 2),
            },
            "operating_expenses": {
                "rent": rent, "utilities": utilities, "marketing": marketing,
                "maintenance": maint, "insurance": insurance,
                "total": round(rent + utilities + marketing + maint + insurance, 2),
            },
            "ebitda": ebitda,
            "ebitda_margin_pct": round(ebitda / total_rev * 100, 1) if total_rev > 0 else 0,
            "total_cost": total_cost,
        }

        # Accumulate annual
        for k in ["revenue", "food_cost", "bev_cost", "hourly_labor", "mgmt_salary",
                   "benefits", "rent", "utilities", "marketing", "maintenance", "insurance",
                   "total_cost", "ebitda", "covers", "events", "banquet_revenue"]:
            val_map = {
                "revenue": total_rev, "food_cost": food_cost, "bev_cost": bev_cost,
                "hourly_labor": hourly_labor, "mgmt_salary": mgmt, "benefits": benefits,
                "rent": rent, "utilities": utilities, "marketing": marketing,
                "maintenance": maint, "insurance": insurance, "total_cost": total_cost,
                "ebitda": ebitda, "covers": monthly_covers,
                "events": drivers.banquet_events_per_month, "banquet_revenue": banquet_rev,
            }
            annual[k] += val_map.get(k, 0)

    # Round annual
    for k in annual:
        annual[k] = round(annual[k], 2)
    annual["ebitda_margin_pct"] = round(annual["ebitda"] / annual["revenue"] * 100, 1) if annual["revenue"] > 0 else 0
    annual["food_cost_pct"] = round(annual["food_cost"] / annual["revenue"] * 100, 1) if annual["revenue"] > 0 else 0
    annual["labor_pct"] = round((annual["hourly_labor"] + annual["mgmt_salary"] + annual["benefits"]) / annual["revenue"] * 100, 1) if annual["revenue"] > 0 else 0

    budget_id = f"budget-{_uid()}"
    budget_doc = {
        "id": budget_id,
        "name": budget_name,
        "status": "draft",
        "fiscal_year": 2027,
        "created_by": "EchoStratus",
        "drivers": drivers.model_dump(),
        "months": months,
        "annual": annual,
        "commentary": {},
        "created_at": _now(),
        "updated_at": _now(),
    }

    db["budgets"].update_one({"id": budget_id}, {"$set": budget_doc}, upsert=True)

    return budget_doc


# ── Forecast Adjustment ──

@router.post("/forecast/adjust")
async def adjust_forecast(adj: ForecastAdjustment):
    """Directors adjust monthly forecasts by changing drivers.
    Automatically recalculates all downstream P&L lines."""

    # Get latest budget as base
    budget = db["budgets"].find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    if not budget:
        return {"error": "No budget exists — build one first"}

    base_month = budget["months"].get(str(adj.month))
    if not base_month:
        return {"error": f"Month {adj.month} not found in budget"}

    # Apply driver changes
    base_drivers = budget.get("drivers", {})
    adjusted_drivers = {**base_drivers}
    for k, v in adj.driver_changes.items():
        if k in adjusted_drivers:
            adjusted_drivers[k] = v

    # Recalculate the month
    season = SEASONALITY.get(adj.month, 1.0)
    covers = round(adjusted_drivers.get("avg_daily_covers", 225) * 30 * season)
    avg_check = adjusted_drivers.get("avg_check", 85)
    dining_rev = round(covers * avg_check, 2)
    banquet_rev = round(adjusted_drivers.get("banquet_events_per_month", 6) * adjusted_drivers.get("banquet_avg_revenue", 12000) * season, 2)
    total_rev = round(dining_rev + banquet_rev, 2)

    food_cost = round(total_rev * adjusted_drivers.get("food_cost_target_pct", 22) / 100, 2)
    bev_cost = round(total_rev * adjusted_drivers.get("bev_cost_target_pct", 18) / 100, 2)
    hourly_labor = round(total_rev * adjusted_drivers.get("hourly_labor_target_pct", 25) / 100, 2)
    mgmt = adjusted_drivers.get("mgmt_salary_monthly", 22000)
    benefits = adjusted_drivers.get("benefits_monthly", 18500)
    rent = adjusted_drivers.get("rent_monthly", 28000)
    utilities = round(adjusted_drivers.get("utilities_base", 8500) * season, 2)
    marketing = adjusted_drivers.get("marketing_monthly", 4500)
    maint = adjusted_drivers.get("maintenance_monthly", 3500)
    insurance = adjusted_drivers.get("insurance_monthly", 4200)
    total_cost = round(food_cost + bev_cost + hourly_labor + mgmt + benefits + rent + utilities + marketing + maint + insurance, 2)
    ebitda = round(total_rev - total_cost, 2)

    original_rev = base_month["revenue"]["total"]
    original_ebitda = base_month["ebitda"]

    adjusted = {
        "month": adj.month,
        "month_name": MONTH_NAMES[adj.month - 1],
        "original": {"revenue": original_rev, "ebitda": original_ebitda},
        "adjusted": {
            "revenue": total_rev, "dining_revenue": dining_rev, "banquet_revenue": banquet_rev,
            "food_cost": food_cost, "bev_cost": bev_cost, "hourly_labor": hourly_labor,
            "total_cost": total_cost, "ebitda": ebitda,
            "ebitda_margin_pct": round(ebitda / total_rev * 100, 1) if total_rev > 0 else 0,
            "covers": covers,
        },
        "variance": {
            "revenue": round(total_rev - original_rev, 2),
            "revenue_pct": round((total_rev - original_rev) / original_rev * 100, 1) if original_rev > 0 else 0,
            "ebitda": round(ebitda - original_ebitda, 2),
            "ebitda_pct": round((ebitda - original_ebitda) / abs(original_ebitda) * 100, 1) if original_ebitda != 0 else 0,
        },
        "driver_changes": adj.driver_changes,
        "commentary": adj.commentary,
        "adjusted_by": adj.adjusted_by,
    }

    # Store forecast adjustment
    db["forecast_adjustments"].insert_one({
        "id": f"fadj-{_uid()}",
        "budget_id": budget["id"],
        **adjusted,
        "created_at": _now(),
    })

    return adjusted


# ── Budget vs Actual ──

@router.get("/variance")
async def budget_vs_actual(month: Optional[int] = None):
    """Compare budget to actual performance from simulation data."""
    budget = db["budgets"].find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    if not budget:
        return {"error": "No budget exists — build one first"}

    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(2000))
    labor = list(db["labor_schedules"].find({}, {"_id": 0}).limit(1000))

    # Calculate actuals
    total_rev = sum(e["amount"] for e in gl if e.get("entry_type") == "revenue")
    food_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5000")
    bev_cogs = sum(e["amount"] for e in gl if e.get("gl_code") == "5100")
    hourly_labor = sum(e["amount"] for e in gl if e.get("gl_code") in ("6000", "6010"))
    total_exp = sum(e["amount"] for e in gl if e.get("entry_type") == "expense")
    ebitda = total_rev - total_exp

    # Compare to budget (use current month or full year)
    if month:
        bm = budget["months"].get(str(month), {})
        b_rev = bm.get("revenue", {}).get("total", 0)
        b_food = bm.get("cost_of_sales", {}).get("food", 0)
        b_bev = bm.get("cost_of_sales", {}).get("beverage", 0)
        b_labor = bm.get("labor", {}).get("hourly", 0)
        b_ebitda = bm.get("ebitda", 0)
        label = MONTH_NAMES[month - 1]
    else:
        ba = budget.get("annual", {})
        b_rev = ba.get("revenue", 0)
        b_food = ba.get("food_cost", 0)
        b_bev = ba.get("bev_cost", 0)
        b_labor = ba.get("hourly_labor", 0)
        b_ebitda = ba.get("ebitda", 0)
        label = "Annual"

    def _var(actual, budgeted, is_cost=False):
        diff = round(actual - budgeted, 2)
        pct = round(diff / budgeted * 100, 1) if budgeted != 0 else 0
        status = ("favorable" if diff <= 0 else "unfavorable") if is_cost else ("favorable" if diff >= 0 else "unfavorable")
        return {"actual": round(actual, 2), "budget": round(budgeted, 2), "variance": diff, "variance_pct": pct, "status": status}

    return {
        "period": label,
        "budget_name": budget.get("name", ""),
        "lines": {
            "revenue": _var(total_rev, b_rev),
            "food_cost": _var(food_cogs, b_food, True),
            "bev_cost": _var(bev_cogs, b_bev, True),
            "hourly_labor": _var(hourly_labor, b_labor, True),
            "ebitda": _var(ebitda, b_ebitda),
        },
        "generated_at": _now(),
    }


@router.get("/12-month-view")
async def twelve_month_view():
    """Enterprise-grade 12-month budget view with actuals overlay."""
    budget = db["budgets"].find_one({}, {"_id": 0}, sort=[("created_at", -1)])

    # Get forecast adjustments
    adjustments = list(db["forecast_adjustments"].find({}, {"_id": 0}).sort("created_at", -1).limit(24))
    adj_map = {}
    for a in adjustments:
        m = a.get("month")
        if m and m not in adj_map:
            adj_map[m] = a

    months = []
    for m in range(1, 13):
        bm = budget["months"].get(str(m), {}) if budget else {}
        adj = adj_map.get(m)

        month_data = {
            "month": m, "month_name": MONTH_NAMES[m - 1],
            "budget": {
                "revenue": bm.get("revenue", {}).get("total", 0),
                "food_cost": bm.get("cost_of_sales", {}).get("food", 0),
                "bev_cost": bm.get("cost_of_sales", {}).get("beverage", 0),
                "hourly_labor": bm.get("labor", {}).get("hourly", 0),
                "ebitda": bm.get("ebitda", 0),
                "ebitda_margin_pct": bm.get("ebitda_margin_pct", 0),
                "covers": bm.get("drivers", {}).get("covers", 0),
            },
            "forecast": None,
            "has_adjustment": adj is not None,
        }

        if adj:
            a = adj.get("adjusted", {})
            month_data["forecast"] = {
                "revenue": a.get("revenue", 0),
                "food_cost": a.get("food_cost", 0),
                "ebitda": a.get("ebitda", 0),
                "covers": a.get("covers", 0),
                "adjusted_by": adj.get("adjusted_by", ""),
                "commentary": adj.get("commentary", ""),
            }

        months.append(month_data)

    return {
        "budget_name": budget.get("name", "") if budget else "No budget",
        "months": months,
        "annual_budget": budget.get("annual", {}) if budget else {},
        "generated_at": _now(),
    }
