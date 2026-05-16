"""
Menu Engineering Matrix
=======================
Classifies menu items into Stars, Plowhorses, Puzzles, and Dogs
based on popularity (order volume) and profitability (contribution margin).

This file ships TWO API surfaces:

  1. The original snapshot endpoints (`/matrix`, `/overview`) which use
     each item's stored `cost` field — fast, simple, but stale to the
     extent the stored cost has drifted from live ingredient prices.

  2. The B.10 production endpoints (`/outlet/{outlet_id}`,
     `/property/{property_id}`) which:
       · scope to a single outlet (stored cost is often property-wide
         and can mask outlet-level differences)
       · use a rolling time window of actual sales velocity
       · derive plated cost LIVE from `cogs_events` per ingredient,
         so a beef-price spike compresses Stars into Plowhorses in
         real time

The original endpoints stay intact so anything currently calling them
keeps working. New surfaces below.
"""
from datetime import datetime, timezone, timedelta
from statistics import mean
from typing import Optional, Dict, List
from fastapi import APIRouter, Query, HTTPException

from database import db

router = APIRouter(prefix="/api/menu-engineering", tags=["menu-engineering"])

_now = lambda: datetime.now(timezone.utc).isoformat()


def _calculate_matrix():
    """
    Classification logic:
    - Stars:       High popularity + High profit
    - Plowhorses:  High popularity + Low profit
    - Puzzles:     Low popularity  + High profit
    - Dogs:        Low popularity  + Low profit

    Thresholds: median of each metric across all items.
    """
    items = list(db["menu_items"].find({}, {"_id": 0}))
    if not items:
        return [], {}

    # Calculate contribution margin and order volume for each item
    enriched = []
    for item in items:
        price = item.get("price", 0) or 0
        cost = item.get("cost", 0) or item.get("food_cost", 0) or 0
        orders = item.get("orders_count", 0) or item.get("popularity", 0) or 0
        margin = price - cost
        margin_pct = (margin / price * 100) if price > 0 else 0
        enriched.append({
            "id": item.get("id", ""),
            "name": item.get("name", "Unknown"),
            "category": item.get("category", ""),
            "price": round(price, 2),
            "cost": round(cost, 2),
            "margin": round(margin, 2),
            "margin_pct": round(margin_pct, 1),
            "orders": orders,
            "revenue": round(price * orders, 2),
            "profit": round(margin * orders, 2),
        })

    if not enriched:
        return [], {}

    # Calculate medians for thresholds
    margins = sorted([i["margin"] for i in enriched])
    orders_list = sorted([i["orders"] for i in enriched])
    n = len(margins)
    median_margin = margins[n // 2] if n % 2 == 1 else (margins[n // 2 - 1] + margins[n // 2]) / 2
    median_orders = orders_list[n // 2] if n % 2 == 1 else (orders_list[n // 2 - 1] + orders_list[n // 2]) / 2

    # Classify each item
    stars, plowhorses, puzzles, dogs = [], [], [], []
    for item in enriched:
        high_pop = item["orders"] >= median_orders
        high_profit = item["margin"] >= median_margin
        if high_pop and high_profit:
            item["classification"] = "star"
            stars.append(item)
        elif high_pop and not high_profit:
            item["classification"] = "plowhorse"
            plowhorses.append(item)
        elif not high_pop and high_profit:
            item["classification"] = "puzzle"
            puzzles.append(item)
        else:
            item["classification"] = "dog"
            dogs.append(item)

    summary = {
        "total_items": len(enriched),
        "stars": len(stars),
        "plowhorses": len(plowhorses),
        "puzzles": len(puzzles),
        "dogs": len(dogs),
        "median_margin": round(median_margin, 2),
        "median_orders": round(median_orders, 1),
        "total_revenue": round(sum(i["revenue"] for i in enriched), 2),
        "total_profit": round(sum(i["profit"] for i in enriched), 2),
        "recommendations": {
            "stars": "Maintain quality & visibility. These are your best performers.",
            "plowhorses": "Consider subtle price increases or cost reduction. High demand offsets thin margins.",
            "puzzles": "Increase visibility — better menu placement, server recommendations, specials.",
            "dogs": "Candidates for removal or complete rework. Evaluate if they serve a strategic purpose.",
        },
    }

    return enriched, summary


@router.get("/matrix")
async def get_menu_matrix():
    """Full menu engineering matrix with classifications and recommendations."""
    items, summary = _calculate_matrix()
    return {"items": items, "summary": summary}


@router.get("/overview")
async def get_matrix_overview():
    """Quick overview — counts per quadrant."""
    _, summary = _calculate_matrix()
    return summary


# ─────────────────────────────────────────────────────────────────
# B.10 production endpoints — outlet-scoped, time-windowed,
# COGS-driven plated cost.
# ─────────────────────────────────────────────────────────────────
@router.get("/outlet/{outlet_id}")
async def menu_matrix_for_outlet(outlet_id: str, lookback_days: int = Query(30, ge=7, le=180)):
    """Compute the matrix for one outlet using:
      · sales velocity from `pos_sales` + `mm_sales` over `lookback_days`
      · plated cost from live `cogs_events` (per-ingredient newest unit cost)

    Returns per-item classification + per-quadrant counts + the median
    thresholds the classification was based on (so a reader can verify
    the math)."""
    cutoff_iso = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()

    items = list(db["menu_items"].find({"outlet_id": outlet_id, "active": {"$ne": False}}, {"_id": 0}))
    if not items:
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "no_menu_items_for_outlet",
            "generated_at": _now(),
        }

    sales_by_item: Dict[str, int] = {}
    for collection in ("pos_sales", "mm_sales"):
        for sale in db[collection].find(
            {"outlet_id": outlet_id, "sold_date": {"$gte": cutoff_iso}},
            {"_id": 0, "menu_item_id": 1, "quantity": 1},
        ):
            item_id = sale.get("menu_item_id")
            if item_id:
                sales_by_item[item_id] = sales_by_item.get(item_id, 0) + sale.get("quantity", 0)

    if not sales_by_item:
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "no_sales_data_in_window",
            "menu_item_count": len(items),
            "lookback_days": lookback_days,
            "generated_at": _now(),
        }

    enriched: List[Dict] = []
    for item in items:
        recipe_id = item.get("recipe_id")
        recipe = db["culinary_recipes"].find_one({"recipe_id": recipe_id}, {"_id": 0}) if recipe_id else None
        plated_cost = _live_plated_cost_cents(recipe) if recipe else int(item.get("food_cost_cents") or item.get("cost", 0) * 100)
        menu_price_cents = int(item.get("price_cents") or item.get("price", 0) * 100)
        contribution = menu_price_cents - plated_cost if menu_price_cents > 0 else 0
        sold = sales_by_item.get(item.get("menu_item_id") or item.get("name"), 0)
        enriched.append({
            "menu_item_id": item.get("menu_item_id") or item.get("name"),
            "name": item.get("name"),
            "menu_price_cents": menu_price_cents,
            "plated_cost_cents": plated_cost,
            "contribution_margin_cents": contribution,
            "contribution_margin_pct": round(contribution / menu_price_cents, 4) if menu_price_cents else None,
            "qty_sold": sold,
            "revenue_cents": sold * menu_price_cents,
            "total_contribution_cents": sold * contribution,
        })

    # Use medians (more robust than means against runaway items)
    sorted_qty = sorted(e["qty_sold"] for e in enriched)
    sorted_cm = sorted(e["contribution_margin_cents"] for e in enriched)
    n = len(enriched)
    median_qty = sorted_qty[n // 2] if n % 2 else (sorted_qty[n // 2 - 1] + sorted_qty[n // 2]) / 2
    median_cm = sorted_cm[n // 2] if n % 2 else (sorted_cm[n // 2 - 1] + sorted_cm[n // 2]) / 2

    quadrant_recs = {
        "star": "Feature prominently. These are the menu's anchors.",
        "plowhorse": "Popular but low-margin. Consider repricing or reducing plated cost.",
        "puzzle": "Profitable when sold. Market harder, reposition on the menu, or train servers to suggest.",
        "dog": "Underperforms on both axes. Candidate for removal or replacement.",
    }
    for e in enriched:
        high_pop = e["qty_sold"] >= median_qty
        high_margin = e["contribution_margin_cents"] >= median_cm
        if high_pop and high_margin:
            e["quadrant"] = "star"
        elif high_pop and not high_margin:
            e["quadrant"] = "plowhorse"
        elif not high_pop and high_margin:
            e["quadrant"] = "puzzle"
        else:
            e["quadrant"] = "dog"
        e["recommendation"] = quadrant_recs[e["quadrant"]]

    counts = {q: sum(1 for e in enriched if e["quadrant"] == q) for q in quadrant_recs}

    return {
        "outlet_id": outlet_id,
        "lookback_days": lookback_days,
        "available": True,
        "items_analyzed": n,
        "thresholds": {
            "median_qty_sold": round(median_qty, 2),
            "median_contribution_margin_cents": int(median_cm),
        },
        "quadrant_counts": counts,
        "items": sorted(enriched, key=lambda x: -x["total_contribution_cents"]),
        "narrative": _matrix_narrative(counts, n),
        "generated_at": _now(),
    }


@router.get("/property/{property_id}")
async def menu_matrix_for_property(property_id: str, lookback_days: int = Query(30, ge=7, le=180)):
    """Roll up menu matrix across every outlet at a property. Useful
    for the Director seeing 'how many Dogs do we have property-wide?'"""
    outlets = list(db["outlets"].find({"property_id": property_id, "active": True}, {"_id": 0, "outlet_id": 1, "name": 1}))
    by_outlet = []
    rolled_up = {"star": 0, "plowhorse": 0, "puzzle": 0, "dog": 0}
    items_total = 0
    for outlet in outlets:
        try:
            r = await menu_matrix_for_outlet(outlet["outlet_id"], lookback_days)
        except HTTPException:
            continue
        if not r.get("available"):
            continue
        items_total += r["items_analyzed"]
        for q, c in r["quadrant_counts"].items():
            rolled_up[q] = rolled_up.get(q, 0) + c
        by_outlet.append({
            "outlet_id": outlet["outlet_id"],
            "outlet_name": outlet.get("name"),
            "items_analyzed": r["items_analyzed"],
            "quadrant_counts": r["quadrant_counts"],
        })
    return {
        "property_id": property_id,
        "lookback_days": lookback_days,
        "outlets_analyzed": len(by_outlet),
        "items_analyzed": items_total,
        "quadrant_counts": rolled_up,
        "by_outlet": by_outlet,
        "generated_at": _now(),
    }


def _live_plated_cost_cents(recipe: Dict) -> int:
    """Plated cost from the most-recent unit_cost_cents per ingredient.
    Ingredients without recent COGS data contribute zero — meaning the
    returned cost is a *lower bound*. Caller should surface this."""
    if not recipe:
        return 0
    total_cents = 0
    for ing in recipe.get("ingredients") or []:
        item_id = ing.get("item_id") or ing.get("name")
        qty = float(ing.get("quantity") or 0)
        if not item_id or qty <= 0:
            continue
        latest = db["cogs_events"].find_one(
            {"item_id": item_id}, {"_id": 0, "unit_cost_cents": 1}, sort=[("ts", -1)],
        )
        if latest and latest.get("unit_cost_cents") is not None:
            total_cents += int(qty * latest["unit_cost_cents"])
    return total_cents


def _matrix_narrative(counts: Dict, total: int) -> str:
    if total == 0:
        return "No menu items to analyze."
    return (
        f"{total} items analyzed: {counts.get('star', 0)} stars · "
        f"{counts.get('plowhorse', 0)} plowhorses (reprice or reduce cost) · "
        f"{counts.get('puzzle', 0)} puzzles (market harder) · "
        f"{counts.get('dog', 0)} dogs (consider removing)."
    )
