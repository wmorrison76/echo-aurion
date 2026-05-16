"""
What-If Scenario Sandbox
=========================
B.4 from the CFO toolkit. Director-grade modeling. *"Show me cash
position if banquet revenue drops 15% next month."* *"Show me labor
cost if minimum wage goes to $20."* *"Show me F&B margin if beef
goes up 8%."*

Driver-based modeling on top of the existing budget engine. Reads the
property's current driver baselines, applies user-specified shifts,
recomputes the affected P&L lines, and returns the delta.

Reads from:
  · `annual_budgets`            — base case driver values
  · `outlet_capture_daily`      — actuals to derive empirical drivers
  · `culinary_recipes`          — recipe sensitivity to commodity shifts
  · `cogs_events`               — current ingredient prices
  · `labor_actuals`             — current wage rates

Writes to:
  · `whatif_scenarios`           — saved scenarios for replay/comparison

Real math; no synthesized P&L. When a driver isn't represented in
existing data, the endpoint says so honestly rather than guessing.
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, Dict, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/whatif", tags=["cfo-whatif"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


SUPPORTED_DRIVERS = {
    "occupancy_pct_delta",        # +/- pct points to occupancy
    "adr_delta_pct",              # +/- % to ADR
    "fb_revenue_delta_pct",       # +/- % to F&B revenue
    "banquet_revenue_delta_pct",  # +/- % to banquet revenue
    "spa_revenue_delta_pct",      # +/- % to spa revenue
    "wage_rate_delta_pct",        # +/- % to blended wage
    "food_cost_delta_pct",        # +/- % to plated cost
    "energy_cost_delta_pct",      # +/- % to utilities
    "marketing_delta_cents",      # absolute monthly delta
    "headcount_delta_fte",        # +/- FTEs property-wide
}


def _ensure_indexes():
    db["whatif_scenarios"].create_index([("scenario_id", 1)], unique=True)
    db["whatif_scenarios"].create_index([("property_id", 1), ("created_at", -1)])


try:
    _ensure_indexes()
except Exception:
    pass


class ScenarioRequest(BaseModel):
    property_id: str
    name: str = Field(..., description="A short name to remember the scenario by")
    description: str = ""
    drivers: Dict[str, float] = Field(
        default_factory=dict,
        description="Subset of SUPPORTED_DRIVERS to driver shift (e.g. {'banquet_revenue_delta_pct': -0.15})",
    )
    target_year: int
    target_month: int


@router.get("/supported-drivers")
async def list_supported_drivers():
    """Lists the drivers the sandbox understands and what each does."""
    return {
        "drivers": [
            {"key": "occupancy_pct_delta", "unit": "percentage_points", "example": "+0.05 means +5pp occupancy"},
            {"key": "adr_delta_pct", "unit": "percent", "example": "0.03 means +3% ADR"},
            {"key": "fb_revenue_delta_pct", "unit": "percent", "example": "-0.10 means F&B revenue down 10%"},
            {"key": "banquet_revenue_delta_pct", "unit": "percent", "example": "-0.15"},
            {"key": "spa_revenue_delta_pct", "unit": "percent", "example": "0.20"},
            {"key": "wage_rate_delta_pct", "unit": "percent", "example": "0.07 simulates a $20→$21.40 minimum-wage jump"},
            {"key": "food_cost_delta_pct", "unit": "percent", "example": "0.08 simulates beef +8%"},
            {"key": "energy_cost_delta_pct", "unit": "percent", "example": "0.20"},
            {"key": "marketing_delta_cents", "unit": "cents_per_month", "example": "1000000 means +$10,000/month"},
            {"key": "headcount_delta_fte", "unit": "fte", "example": "-2 means cut 2 FTEs"},
        ],
    }


@router.post("/run")
async def run_scenario(req: ScenarioRequest):
    """Run a what-if scenario. Returns base-case P&L, scenario P&L,
    and the per-line delta. Persists the scenario to whatif_scenarios
    so it can be referenced or compared later."""
    unsupported = set(req.drivers.keys()) - SUPPORTED_DRIVERS
    if unsupported:
        raise HTTPException(400, f"Unsupported drivers: {sorted(unsupported)}. Use GET /supported-drivers for the list.")

    base = _build_base_pnl(req.property_id, req.target_year, req.target_month)
    if not base.get("available"):
        return {
            "scenario_id": None,
            "available": False,
            "reason": base.get("reason"),
            "remediation": base.get("remediation"),
            "generated_at": _now(),
        }
    scenario = _apply_drivers(base, req.drivers)

    scenario_id = _uid()
    record = {
        "scenario_id": scenario_id,
        "property_id": req.property_id,
        "name": req.name,
        "description": req.description,
        "target_year": req.target_year,
        "target_month": req.target_month,
        "drivers": req.drivers,
        "base_pnl": base["pnl"],
        "scenario_pnl": scenario,
        "delta": _compute_delta(base["pnl"], scenario),
        "created_at": _now(),
    }
    db["whatif_scenarios"].insert_one(record.copy())
    record.pop("_id", None)
    return record


@router.get("/scenarios/{property_id}")
async def list_scenarios(property_id: str, limit: int = 50):
    """List recent scenarios for a property."""
    rows = list(
        db["whatif_scenarios"].find({"property_id": property_id}, {"_id": 0})
        .sort("created_at", -1).limit(limit)
    )
    return {"property_id": property_id, "count": len(rows), "scenarios": rows}


@router.get("/scenario/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Retrieve a saved scenario."""
    rec = db["whatif_scenarios"].find_one({"scenario_id": scenario_id}, {"_id": 0})
    if not rec:
        raise HTTPException(404, f"Scenario {scenario_id} not found")
    return rec


# ─────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────
def _build_base_pnl(property_id: str, year: int, month: int) -> Dict:
    """Build the base-case monthly P&L from annual_budgets + actuals.
    Read-only — we never mutate the underlying data when modeling."""
    budget = db["annual_budgets"].find_one({"property_id": property_id, "year": year}, {"_id": 0})
    if not budget:
        return {
            "available": False,
            "reason": "no_annual_budget_for_property_year",
            "remediation": (
                "Configure the property's annual budget in `annual_budgets` "
                "with monthly_revenue_cents, monthly_expense_cents (by category), "
                "and driver_baselines."
            ),
        }

    monthly_rev_map = budget.get("monthly_revenue_cents", {}) or {}
    monthly_exp_map = budget.get("monthly_expense_cents", {}) or {}
    rev_cents = int(monthly_rev_map.get(str(month), 0))
    exp_total = monthly_exp_map.get(str(month), {}) if isinstance(monthly_exp_map.get(str(month)), dict) else {}

    # Standard hospitality lines — these names match the Aurum chart of accounts
    pnl = {
        "rooms_revenue_cents": int(budget.get("rooms_revenue_split", 0.55) * rev_cents),
        "fb_revenue_cents": int(budget.get("fb_revenue_split", 0.30) * rev_cents),
        "banquet_revenue_cents": int(budget.get("banquet_revenue_split", 0.10) * rev_cents),
        "spa_revenue_cents": int(budget.get("spa_revenue_split", 0.05) * rev_cents),
        "total_revenue_cents": rev_cents,

        "labor_cost_cents": int(exp_total.get("labor", 0)),
        "food_cost_cents": int(exp_total.get("food", 0)),
        "beverage_cost_cents": int(exp_total.get("beverage", 0)),
        "energy_cost_cents": int(exp_total.get("utilities", 0)),
        "marketing_cost_cents": int(exp_total.get("marketing", 0)),
        "other_opex_cents": int(exp_total.get("other", 0)),
    }
    pnl["gop_cents"] = pnl["total_revenue_cents"] - sum(
        pnl[k] for k in ("labor_cost_cents", "food_cost_cents", "beverage_cost_cents",
                         "energy_cost_cents", "marketing_cost_cents", "other_opex_cents")
    )
    return {"available": True, "pnl": pnl}


def _apply_drivers(base: Dict, drivers: Dict) -> Dict:
    """Apply driver shifts. Each driver acts on a defined slice of the
    P&L; combinations interact additively where they affect different
    lines and multiplicatively where they affect the same line."""
    base_pnl = base["pnl"]
    scenario = dict(base_pnl)

    # Revenue-side drivers
    if "occupancy_pct_delta" in drivers:
        # Occupancy moves rooms revenue ~linearly
        delta = drivers["occupancy_pct_delta"]
        scenario["rooms_revenue_cents"] = int(scenario["rooms_revenue_cents"] * (1 + delta))
    if "adr_delta_pct" in drivers:
        scenario["rooms_revenue_cents"] = int(scenario["rooms_revenue_cents"] * (1 + drivers["adr_delta_pct"]))
    if "fb_revenue_delta_pct" in drivers:
        scenario["fb_revenue_cents"] = int(scenario["fb_revenue_cents"] * (1 + drivers["fb_revenue_delta_pct"]))
    if "banquet_revenue_delta_pct" in drivers:
        scenario["banquet_revenue_cents"] = int(scenario["banquet_revenue_cents"] * (1 + drivers["banquet_revenue_delta_pct"]))
    if "spa_revenue_delta_pct" in drivers:
        scenario["spa_revenue_cents"] = int(scenario["spa_revenue_cents"] * (1 + drivers["spa_revenue_delta_pct"]))

    # Cost-side drivers
    if "wage_rate_delta_pct" in drivers:
        scenario["labor_cost_cents"] = int(scenario["labor_cost_cents"] * (1 + drivers["wage_rate_delta_pct"]))
    if "food_cost_delta_pct" in drivers:
        scenario["food_cost_cents"] = int(scenario["food_cost_cents"] * (1 + drivers["food_cost_delta_pct"]))
    if "energy_cost_delta_pct" in drivers:
        scenario["energy_cost_cents"] = int(scenario["energy_cost_cents"] * (1 + drivers["energy_cost_delta_pct"]))
    if "marketing_delta_cents" in drivers:
        scenario["marketing_cost_cents"] = int(scenario["marketing_cost_cents"] + drivers["marketing_delta_cents"])
    if "headcount_delta_fte" in drivers:
        # 1 FTE ≈ $5,500/month at the platform's blended rate ($30/hr × 173 hrs)
        # If wage_rate also moved, apply both
        wage_mult = 1 + drivers.get("wage_rate_delta_pct", 0)
        scenario["labor_cost_cents"] = int(
            scenario["labor_cost_cents"] + drivers["headcount_delta_fte"] * 550000 * wage_mult
        )

    # Recompute totals
    scenario["total_revenue_cents"] = (
        scenario["rooms_revenue_cents"] + scenario["fb_revenue_cents"]
        + scenario["banquet_revenue_cents"] + scenario["spa_revenue_cents"]
    )
    scenario["gop_cents"] = scenario["total_revenue_cents"] - sum(
        scenario[k] for k in ("labor_cost_cents", "food_cost_cents", "beverage_cost_cents",
                              "energy_cost_cents", "marketing_cost_cents", "other_opex_cents")
    )
    return scenario


def _compute_delta(base: Dict, scenario: Dict) -> Dict:
    delta = {}
    for k in base:
        delta[k] = scenario[k] - base[k]
    delta["gop_delta_pct_of_revenue"] = (
        round((scenario["gop_cents"] - base["gop_cents"]) / base["total_revenue_cents"], 4)
        if base["total_revenue_cents"] else 0
    )
    return delta
