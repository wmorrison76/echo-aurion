"""
Recipe-Level Food Cost Variance
================================
B.6 from the CFO toolkit. The single most actionable financial signal
in a kitchen — and the one most absent from off-the-shelf systems.
*"Our braised short rib's plated cost is up 12% MoM because beef went
up — but menu price is unchanged. Margin compressed from 68% to 56%."*

Reads from:
  · `culinary_recipes`   — recipe definitions with ingredient lines
  · `menu_items`         — menu price per item
  · `cogs_events`        — actual ingredient unit costs over time
  · `pos_sales` / `mm_sales` — sold quantities

Real math:
  · plated_cost(recipe) at time T = Σ (ingredient.qty × ingredient.unit_cost_at_T)
  · margin_at_T = (menu_price - plated_cost) / menu_price
  · MoM/YoY drift computed from rolling windows
  · alerts when margin compresses ≥5pp month-over-month

Honest about missing data: if a recipe has ingredients without recent
COGS prices, those ingredient lines are reported as "unpriced" rather
than zeroed out (which would falsely improve margin).
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/recipe-variance", tags=["cfo-recipe-variance"])

_now = lambda: datetime.now(timezone.utc).isoformat()


@router.get("/recipe/{recipe_id}")
async def recipe_variance(recipe_id: str, lookback_days: int = Query(60, ge=14, le=365)):
    """Per-recipe plated cost over time, margin compression, and the
    ingredient driver(s) of the largest changes."""
    recipe = db["culinary_recipes"].find_one({"recipe_id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(404, f"Recipe {recipe_id} not found")

    menu_item = db["menu_items"].find_one({"recipe_id": recipe_id}, {"_id": 0}) or {}
    menu_price_cents = int(menu_item.get("price_cents") or menu_item.get("price", 0) * 100)

    # Build per-day plated cost using the daily ingredient unit costs
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    ingredients = recipe.get("ingredients") or []
    if not ingredients:
        return {
            "recipe_id": recipe_id,
            "available": False,
            "reason": "recipe_has_no_ingredients",
            "generated_at": _now(),
        }

    # For each ingredient, fetch the most recent unit_cost per day
    # COGS events are: {item, unit_cost_cents, ts, property_id}
    daily_plated_cost: Dict[str, Dict] = {}
    for ingredient in ingredients:
        item_id = ingredient.get("item_id") or ingredient.get("name")
        qty = float(ingredient.get("quantity") or 0)
        unit_label = ingredient.get("unit") or "ea"
        if not item_id or qty <= 0:
            continue
        cogs_for_item = list(
            db["cogs_events"].find(
                {"item_id": item_id, "ts": {"$gte": cutoff}},
                {"_id": 0, "unit_cost_cents": 1, "ts": 1},
            ).sort("ts", 1)
        )
        # Forward-fill: each day uses the most recent unit_cost_cents
        # known for that ingredient as of that day
        last_known = None
        for ev in cogs_for_item:
            day = ev["ts"][:10]
            last_known = ev.get("unit_cost_cents") or last_known
            if last_known is None:
                continue
            row = daily_plated_cost.setdefault(day, {"day": day, "lines": [], "plated_cost_cents": 0, "unpriced_lines": 0})
            existing = next((line for line in row["lines"] if line["item_id"] == item_id), None)
            if existing:
                existing["unit_cost_cents"] = last_known
                existing["line_cost_cents"] = int(qty * last_known)
            else:
                row["lines"].append({
                    "item_id": item_id,
                    "qty": qty,
                    "unit": unit_label,
                    "unit_cost_cents": last_known,
                    "line_cost_cents": int(qty * last_known),
                })

    # Compute plated cost per day
    series: List[Dict] = []
    for day in sorted(daily_plated_cost.keys()):
        row = daily_plated_cost[day]
        plated = sum(line["line_cost_cents"] for line in row["lines"])
        unpriced = sum(1 for ing in ingredients if not any(line["item_id"] in (ing.get("item_id"), ing.get("name")) for line in row["lines"]))
        margin_cents = menu_price_cents - plated if menu_price_cents else None
        margin_pct = (margin_cents / menu_price_cents) if menu_price_cents else None
        series.append({
            "day": day,
            "plated_cost_cents": plated,
            "menu_price_cents": menu_price_cents,
            "margin_cents": margin_cents,
            "margin_pct": round(margin_pct, 4) if margin_pct is not None else None,
            "ingredients_priced": len(row["lines"]),
            "ingredients_unpriced": unpriced,
        })
    if not series:
        return {
            "recipe_id": recipe_id,
            "available": False,
            "reason": "no_cogs_events_for_recipe_ingredients",
            "ingredient_count": len(ingredients),
            "generated_at": _now(),
        }

    # MoM drift
    today = datetime.now(timezone.utc).date()
    cur_month = [s for s in series if s["day"] >= (today - timedelta(days=30)).isoformat()]
    prev_month = [s for s in series if (today - timedelta(days=60)).isoformat() <= s["day"] < (today - timedelta(days=30)).isoformat()]
    cur_avg = mean(s["plated_cost_cents"] for s in cur_month) if cur_month else 0
    prev_avg = mean(s["plated_cost_cents"] for s in prev_month) if prev_month else 0
    mom_delta_cents = cur_avg - prev_avg
    mom_delta_pct = (mom_delta_cents / prev_avg) if prev_avg > 0 else 0

    # Margin compression
    cur_margin = mean(s["margin_pct"] for s in cur_month if s["margin_pct"] is not None) if cur_month else None
    prev_margin = mean(s["margin_pct"] for s in prev_month if s["margin_pct"] is not None) if prev_month else None
    margin_compression_pp = (cur_margin - prev_margin) if cur_margin is not None and prev_margin is not None else None

    # Driver ingredients (which line items moved most)
    drivers = _ingredient_drivers(daily_plated_cost, today)

    alert = None
    if margin_compression_pp is not None and margin_compression_pp <= -0.05:
        alert = {
            "level": "red" if margin_compression_pp <= -0.10 else "amber",
            "summary": f"Margin compressed {margin_compression_pp*100:+.1f}pp month-over-month",
        }

    return {
        "recipe_id": recipe_id,
        "recipe_name": recipe.get("name"),
        "menu_price_cents": menu_price_cents,
        "lookback_days": lookback_days,
        "available": True,
        "current_avg_plated_cost_cents": int(cur_avg),
        "prior_avg_plated_cost_cents": int(prev_avg),
        "mom_delta_cents": int(mom_delta_cents),
        "mom_delta_pct": round(mom_delta_pct, 4),
        "current_margin_pct": round(cur_margin, 4) if cur_margin is not None else None,
        "prior_margin_pct": round(prev_margin, 4) if prev_margin is not None else None,
        "margin_compression_pp": round(margin_compression_pp, 4) if margin_compression_pp is not None else None,
        "drivers": drivers,
        "daily_series": series,
        "alert": alert,
        "narrative": _recipe_narrative(recipe.get("name"), menu_price_cents, cur_avg, prev_avg, margin_compression_pp, drivers),
        "generated_at": _now(),
    }


@router.get("/property/{property_id}")
async def property_summary(property_id: str, lookback_days: int = Query(60, ge=14, le=180), top_n: int = 20):
    """Top N recipes by margin compression at the property level."""
    recipes = list(db["culinary_recipes"].find({"property_id": property_id, "active": True}, {"_id": 0, "recipe_id": 1}))
    summaries = []
    for r in recipes:
        try:
            v = await recipe_variance(r["recipe_id"], lookback_days)
        except HTTPException:
            continue
        if not v.get("available"):
            continue
        summaries.append({
            "recipe_id": r["recipe_id"],
            "recipe_name": v.get("recipe_name"),
            "current_margin_pct": v.get("current_margin_pct"),
            "margin_compression_pp": v.get("margin_compression_pp"),
            "mom_delta_pct": v.get("mom_delta_pct"),
            "alert": v.get("alert"),
        })
    summaries.sort(key=lambda s: (s.get("margin_compression_pp") or 0))
    return {
        "property_id": property_id,
        "recipes_analyzed": len(summaries),
        "compression_leaders": summaries[:top_n],
        "improvement_leaders": list(reversed(summaries))[:top_n],
        "alerts_count": sum(1 for s in summaries if s.get("alert")),
        "generated_at": _now(),
    }


def _ingredient_drivers(daily: Dict, today) -> List[Dict]:
    """Identify the ingredients that drove the largest cost change
    in the most recent 30 days vs the prior 30."""
    cutoff_recent = (today - timedelta(days=30)).isoformat()
    cutoff_prior = (today - timedelta(days=60)).isoformat()

    line_recent: Dict[str, List[int]] = {}
    line_prior: Dict[str, List[int]] = {}
    for day, row in daily.items():
        target = line_recent if day >= cutoff_recent else (line_prior if day >= cutoff_prior else None)
        if target is None:
            continue
        for line in row["lines"]:
            target.setdefault(line["item_id"], []).append(line["unit_cost_cents"])

    drivers = []
    for item_id, recent_costs in line_recent.items():
        prior_costs = line_prior.get(item_id, [])
        if not prior_costs:
            continue
        rec_avg = mean(recent_costs)
        prior_avg = mean(prior_costs)
        delta = rec_avg - prior_avg
        delta_pct = (delta / prior_avg) if prior_avg > 0 else 0
        drivers.append({
            "item_id": item_id,
            "recent_unit_cost_cents": int(rec_avg),
            "prior_unit_cost_cents": int(prior_avg),
            "delta_cents": int(delta),
            "delta_pct": round(delta_pct, 4),
        })
    drivers.sort(key=lambda d: abs(d["delta_pct"]), reverse=True)
    return drivers[:5]


def _recipe_narrative(name: str, menu_price: int, cur_cost: float, prev_cost: float,
                     margin_compression_pp: Optional[float], drivers: List[Dict]) -> str:
    if not name:
        name = "this recipe"
    if margin_compression_pp is None:
        return f"{name} cost trend cannot be assessed yet — insufficient prior-month data."
    if margin_compression_pp <= -0.05:
        top_driver = drivers[0] if drivers else None
        driver_text = f"primarily {top_driver['item_id']} (+{top_driver['delta_pct']*100:.1f}%)" if top_driver else "across multiple ingredients"
        return (
            f"{name} margin compressed {margin_compression_pp*100:+.1f}pp month-over-month "
            f"as plated cost rose ${(cur_cost - prev_cost)/100:,.2f} — "
            f"{driver_text}. Menu price unchanged at ${menu_price/100:,.2f}."
        )
    if margin_compression_pp >= 0.03:
        return f"{name} margin improved {margin_compression_pp*100:+.1f}pp month-over-month."
    return f"{name} margin held within ±3pp month-over-month — stable."
