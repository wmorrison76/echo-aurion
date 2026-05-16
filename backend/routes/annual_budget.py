"""
Annual Budget & Driver-Based Forecasting Engine
=================================================
Full 12-month budget builder with adjustable drivers.
Pick drivers (occupancy, ADR, labor %, food cost %, etc.) to adjust forecasts.
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from database import db

router = APIRouter(prefix="/api/budget", tags=["budget-forecast"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]
_year = lambda: datetime.now(timezone.utc).year

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# ══════════════════════════════════════
#  DEFAULT DRIVERS & SEASONALITY
# ══════════════════════════════════════

DRIVER_DEFINITIONS = [
    {"id": "occupancy", "name": "Occupancy %", "category": "rooms", "unit": "%", "default": 72, "min": 20, "max": 100, "step": 1},
    {"id": "adr", "name": "Average Daily Rate", "category": "rooms", "unit": "$", "default": 289, "min": 100, "max": 800, "step": 5},
    {"id": "total_rooms", "name": "Total Rooms Available", "category": "rooms", "unit": "#", "default": 65, "min": 10, "max": 500, "step": 1},
    {"id": "fb_per_occupied", "name": "F&B Rev per Occ Room", "category": "f_and_b", "unit": "$", "default": 42, "min": 10, "max": 150, "step": 1},
    {"id": "spa_capture", "name": "Spa Capture Rate %", "category": "spa", "unit": "%", "default": 18, "min": 0, "max": 60, "step": 1},
    {"id": "spa_avg_ticket", "name": "Spa Avg Ticket", "category": "spa", "unit": "$", "default": 165, "min": 50, "max": 500, "step": 5},
    {"id": "retail_per_room", "name": "Retail Rev per Occ Room", "category": "other", "unit": "$", "default": 8, "min": 0, "max": 50, "step": 1},
    {"id": "other_per_room", "name": "Other Rev per Occ Room", "category": "other", "unit": "$", "default": 12, "min": 0, "max": 80, "step": 1},
    {"id": "labor_pct", "name": "Labor Cost %", "category": "expense", "unit": "%", "default": 28, "min": 15, "max": 50, "step": 0.5},
    {"id": "food_cost_pct", "name": "Food Cost %", "category": "expense", "unit": "%", "default": 29, "min": 15, "max": 50, "step": 0.5},
    {"id": "bev_cost_pct", "name": "Beverage Cost %", "category": "expense", "unit": "%", "default": 22, "min": 10, "max": 40, "step": 0.5},
    {"id": "utilities_pct", "name": "Utilities %", "category": "expense", "unit": "%", "default": 5, "min": 2, "max": 12, "step": 0.5},
    {"id": "marketing_pct", "name": "Marketing %", "category": "expense", "unit": "%", "default": 4, "min": 1, "max": 10, "step": 0.5},
    {"id": "maintenance_pct", "name": "Maintenance %", "category": "expense", "unit": "%", "default": 3.5, "min": 1, "max": 8, "step": 0.5},
    {"id": "insurance_monthly", "name": "Insurance Monthly", "category": "fixed", "unit": "$", "default": 18000, "min": 5000, "max": 80000, "step": 1000},
    {"id": "property_tax_monthly", "name": "Property Tax Monthly", "category": "fixed", "unit": "$", "default": 22000, "min": 5000, "max": 100000, "step": 1000},
    {"id": "management_fee_pct", "name": "Management Fee %", "category": "expense", "unit": "%", "default": 3, "min": 0, "max": 8, "step": 0.5},
]

# Seasonal multipliers (1.0 = average)
SEASONALITY = {
    0: 0.75, 1: 0.80, 2: 0.92,   # Jan-Mar: low season
    3: 1.05, 4: 1.12, 5: 1.18,   # Apr-Jun: high season
    6: 1.15, 7: 1.10, 8: 0.95,   # Jul-Sep: summer tail
    9: 1.00, 10: 1.08, 11: 0.90,  # Oct-Dec: shoulder + holiday
}

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


class BudgetInput(BaseModel):
    name: str = ""
    year: int = 2026
    drivers: Dict[str, float] = {}
    monthly_overrides: Dict[str, Dict[str, float]] = {}  # month_key -> driver_id -> value
    notes: str = ""


def _compute_budget(year: int, drivers: dict, monthly_overrides: dict = None):
    """Compute full 12-month budget from drivers."""
    if monthly_overrides is None:
        monthly_overrides = {}

    # Build default driver values
    driver_vals = {d["id"]: d["default"] for d in DRIVER_DEFINITIONS}
    driver_vals.update(drivers)

    months = []
    annual = defaultdict(float)

    for m in range(12):
        month_key = MONTHS[m]
        days = DAYS_IN_MONTH[m]
        seasonal = SEASONALITY[m]

        # Apply monthly overrides if present
        mv = dict(driver_vals)
        if month_key in monthly_overrides:
            mv.update(monthly_overrides[month_key])

        # ── REVENUE ──
        occ = mv["occupancy"] * seasonal / 100
        occ = min(occ, 1.0)
        rooms_sold = round(mv["total_rooms"] * occ * days)
        adr = mv["adr"] * (1 + (seasonal - 1) * 0.3)  # ADR adjusts with season
        room_revenue = round(rooms_sold * adr, 2)
        fb_revenue = round(rooms_sold * mv["fb_per_occupied"], 2)
        spa_guests = round(rooms_sold * mv["spa_capture"] / 100)
        spa_revenue = round(spa_guests * mv["spa_avg_ticket"], 2)
        retail_revenue = round(rooms_sold * mv["retail_per_room"], 2)
        other_revenue = round(rooms_sold * mv["other_per_room"], 2)
        total_revenue = room_revenue + fb_revenue + spa_revenue + retail_revenue + other_revenue

        # ── EXPENSES ──
        labor = round(total_revenue * mv["labor_pct"] / 100, 2)
        food_cost = round(fb_revenue * mv["food_cost_pct"] / 100, 2)
        bev_cost = round(fb_revenue * mv["bev_cost_pct"] / 100 * 0.4, 2)  # Bev is ~40% of F&B
        utilities = round(total_revenue * mv["utilities_pct"] / 100, 2)
        marketing = round(total_revenue * mv["marketing_pct"] / 100, 2)
        maintenance = round(total_revenue * mv["maintenance_pct"] / 100, 2)
        insurance = mv["insurance_monthly"]
        property_tax = mv["property_tax_monthly"]
        management_fee = round(total_revenue * mv["management_fee_pct"] / 100, 2)

        total_expenses = labor + food_cost + bev_cost + utilities + marketing + maintenance + insurance + property_tax + management_fee
        gop = round(total_revenue - total_expenses, 2)
        gop_margin = round(gop / max(total_revenue, 1) * 100, 1)
        noi = round(gop - insurance - property_tax, 2)  # Net after fixed costs

        month_data = {
            "month": month_key, "month_index": m, "days": days, "seasonal_factor": seasonal,
            "revenue": {
                "rooms": room_revenue, "f_and_b": fb_revenue, "spa": spa_revenue,
                "retail": retail_revenue, "other": other_revenue, "total": total_revenue,
            },
            "kpis": {
                "occupancy": round(occ * 100, 1), "adr": round(adr, 2),
                "revpar": round(room_revenue / (mv["total_rooms"] * days), 2),
                "trevpar": round(total_revenue / (mv["total_rooms"] * days), 2),
                "rooms_sold": rooms_sold, "spa_guests": spa_guests,
            },
            "expenses": {
                "labor": labor, "food_cost": food_cost, "beverage_cost": bev_cost,
                "utilities": utilities, "marketing": marketing, "maintenance": maintenance,
                "insurance": insurance, "property_tax": property_tax, "management_fee": management_fee,
                "total": round(total_expenses, 2),
            },
            "profit": {"gop": gop, "gop_margin": gop_margin, "noi": noi},
            "drivers_used": {k: mv[k] for k in mv},
        }
        months.append(month_data)

        # Accumulate annual
        for k, v in month_data["revenue"].items():
            annual[f"rev_{k}"] += v
        for k, v in month_data["expenses"].items():
            annual[f"exp_{k}"] += v
        annual["gop"] += gop
        annual["noi"] += noi
        annual["rooms_sold"] += rooms_sold

    annual_total_rev = annual["rev_total"]
    annual_gop_margin = round(annual["gop"] / max(annual_total_rev, 1) * 100, 1)

    return {
        "months": months,
        "annual_summary": {
            "total_revenue": round(annual_total_rev, 2),
            "room_revenue": round(annual["rev_rooms"], 2),
            "fb_revenue": round(annual["rev_f_and_b"], 2),
            "spa_revenue": round(annual["rev_spa"], 2),
            "total_expenses": round(annual["exp_total"], 2),
            "gop": round(annual["gop"], 2),
            "gop_margin": annual_gop_margin,
            "noi": round(annual["noi"], 2),
            "rooms_sold": int(annual["rooms_sold"]),
            "avg_occupancy": round(annual["rooms_sold"] / (driver_vals["total_rooms"] * 365) * 100, 1),
            "avg_revpar": round(annual["rev_rooms"] / (driver_vals["total_rooms"] * 365), 2),
            "avg_trevpar": round(annual_total_rev / (driver_vals["total_rooms"] * 365), 2),
        },
    }


# ══════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════

@router.get("/drivers")
async def list_drivers():
    """Return all available budget drivers with defaults and ranges."""
    return {"drivers": DRIVER_DEFINITIONS, "categories": ["rooms", "f_and_b", "spa", "other", "expense", "fixed"]}


@router.post("/compute")
async def compute_budget(data: BudgetInput):
    """Compute a full 12-month budget from the given drivers. Does NOT save."""
    result = _compute_budget(data.year, data.drivers, data.monthly_overrides)
    return {"year": data.year, **result}


@router.post("/save")
async def save_budget(data: BudgetInput):
    """Save a named budget scenario."""
    result = _compute_budget(data.year, data.drivers, data.monthly_overrides)
    budget_doc = {
        "id": f"bgt-{_uid()}",
        "name": data.name or f"Budget {data.year}",
        "year": data.year,
        "drivers": data.drivers,
        "monthly_overrides": data.monthly_overrides,
        "notes": data.notes,
        "annual_summary": result["annual_summary"],
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["annual_budgets"].insert_one(budget_doc)
    budget_doc.pop("_id", None)
    return {"status": "saved", "budget": budget_doc}


@router.get("/saved")
async def list_saved_budgets():
    """List all saved budget scenarios."""
    budgets = list(db["annual_budgets"].find({}, {"_id": 0}).sort("created_at", -1))
    return {"budgets": budgets, "total": len(budgets)}


@router.get("/saved/{budget_id}")
async def get_budget_detail(budget_id: str):
    """Load a saved budget and recompute full detail."""
    budget = db["annual_budgets"].find_one({"id": budget_id}, {"_id": 0})
    if not budget:
        raise HTTPException(404, "Budget not found")
    result = _compute_budget(budget["year"], budget.get("drivers", {}), budget.get("monthly_overrides", {}))
    return {**budget, **result}


@router.delete("/saved/{budget_id}")
async def delete_budget(budget_id: str):
    """Delete a saved budget."""
    r = db["annual_budgets"].delete_one({"id": budget_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Budget not found")
    return {"deleted": budget_id}


@router.post("/compare")
async def compare_budgets(budget_ids: List[str]):
    """Compare two or more saved budgets side-by-side."""
    comparisons = []
    for bid in budget_ids:
        budget = db["annual_budgets"].find_one({"id": bid}, {"_id": 0})
        if budget:
            result = _compute_budget(budget["year"], budget.get("drivers", {}), budget.get("monthly_overrides", {}))
            comparisons.append({"id": bid, "name": budget["name"], "year": budget["year"], **result["annual_summary"]})
    return {"comparisons": comparisons}


@router.get("/seasonality")
async def get_seasonality():
    """Return the seasonality curve used for forecasting."""
    return {"seasonality": {MONTHS[k]: v for k, v in SEASONALITY.items()}, "months": MONTHS}


@router.post("/what-if")
async def what_if_scenario(data: BudgetInput):
    """Quick what-if: change a single driver and see the annual impact vs default."""
    baseline = _compute_budget(data.year, {}, {})
    scenario = _compute_budget(data.year, data.drivers, data.monthly_overrides)

    deltas = {}
    for key in baseline["annual_summary"]:
        base_val = baseline["annual_summary"][key]
        scen_val = scenario["annual_summary"][key]
        if isinstance(base_val, (int, float)) and base_val != 0:
            deltas[key] = {
                "baseline": base_val, "scenario": scen_val,
                "delta": round(scen_val - base_val, 2),
                "delta_pct": round((scen_val - base_val) / abs(base_val) * 100, 1),
            }

    return {"year": data.year, "baseline": baseline["annual_summary"], "scenario": scenario["annual_summary"], "deltas": deltas}
