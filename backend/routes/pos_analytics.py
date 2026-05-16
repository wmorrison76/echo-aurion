"""
POS Menu Analytics — Active Menu Item Performance
==================================================
Connects POS menu items (full dishes as sold) to yield DB food costs
and actual sales transaction data. Provides:
- Per-dish profitability (CM, FC%, revenue)
- Sales velocity and trend analysis
- Star/Puzzle/Plowhorse/Dog by outlet
- Revenue contribution ranking
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query
from typing import Optional
from database import db

router = APIRouter(prefix="/api/pos-analytics", tags=["pos-analytics"])


def _get_sales_by_item() -> dict:
    """Aggregate sales volume from pos_transactions by item name."""
    txns = list(db["pos_transactions"].find({}, {"_id": 0, "items": 1, "outlet": 1, "timestamp": 1}))
    sales = {}
    for txn in txns:
        outlet = txn.get("outlet", "")
        for item in txn.get("items", []):
            name = item.get("name", "")
            if not name:
                continue
            key = f"{outlet}|{name}"
            if key not in sales:
                sales[key] = {"name": name, "outlet": outlet, "units": 0, "revenue": 0, "txn_count": 0}
            qty = item.get("qty", 1)
            price = item.get("price", 0)
            sales[key]["units"] += qty
            sales[key]["revenue"] += price * qty
            sales[key]["txn_count"] += 1
    return sales


def _estimate_food_cost(item_name: str, price: float) -> float:
    """Cross-reference yield DB for food cost estimate."""
    from routes.yield_database import YIELD_DB, _fuzzy_score
    best_match = None
    best_score = 0
    for yld in YIELD_DB:
        score = _fuzzy_score(item_name, yld["name"])
        if score > best_score:
            best_score = score
            best_match = yld
    if best_match and best_score > 25:
        return round(best_match["ep_cost_lb"] * 0.5, 2)
    return round(price * 0.30, 2)


@router.get("/menu-items")
async def get_active_menu_analytics(outlet: Optional[str] = None):
    """Full analytics for active POS menu items — the complete dishes as sold."""
    pos_items = list(db["pos_menu_items"].find(
        {"item_type": {"$in": ["entree", "appetizer", "dessert", "side", "salad", "crudo", "warm", "chilled"]}},
        {"_id": 0}
    ))
    if not pos_items:
        return {"items": [], "summary": {}, "outlet": outlet or "all"}

    sales_data = _get_sales_by_item()

    items = []
    for pi in pos_items:
        rc = pi.get("revenue_center", pi.get("outlet", ""))
        if outlet and rc != outlet:
            continue

        name = pi.get("display_name", pi.get("name", ""))
        price = pi.get("price", 0)
        if price <= 0:
            continue

        key = f"{rc}|{name}"
        sd = sales_data.get(key, {"units": 0, "revenue": 0, "txn_count": 0})

        food_cost = _estimate_food_cost(name, price)
        cm = round(price - food_cost, 2)
        fc_pct = round((food_cost / price) * 100, 1) if price > 0 else 0
        total_revenue = round(sd["units"] * price, 2)
        total_profit = round(sd["units"] * cm, 2)

        items.append({
            "name": name,
            "outlet": rc,
            "price": price,
            "food_cost": food_cost,
            "contribution_margin": cm,
            "food_cost_pct": fc_pct,
            "units_sold": sd["units"],
            "total_revenue": total_revenue,
            "total_profit": total_profit,
            "txn_count": sd["txn_count"],
            "category": pi.get("category", pi.get("item_type", "")),
            "item_id": pi.get("item_id", ""),
        })

    if not items:
        return {"items": [], "summary": {}, "outlet": outlet or "all"}

    # Classify: Star/Puzzle/Plowhorse/Dog
    avg_units = sum(i["units_sold"] for i in items) / len(items)
    avg_cm = sum(i["contribution_margin"] for i in items) / len(items)

    for item in items:
        high_pop = item["units_sold"] >= avg_units * 0.7
        high_profit = item["contribution_margin"] >= avg_cm
        if high_pop and high_profit:
            item["quadrant"] = "star"
        elif high_pop and not high_profit:
            item["quadrant"] = "plowhorse"
        elif not high_pop and high_profit:
            item["quadrant"] = "puzzle"
        else:
            item["quadrant"] = "dog"

    items.sort(key=lambda x: x["total_revenue"], reverse=True)

    total_rev = sum(i["total_revenue"] for i in items)
    total_cost = sum(i["food_cost"] * i["units_sold"] for i in items)
    total_profit = sum(i["total_profit"] for i in items)

    return {
        "items": items,
        "summary": {
            "total_items": len(items),
            "total_revenue": round(total_rev, 2),
            "total_food_cost": round(total_cost, 2),
            "total_profit": round(total_profit, 2),
            "avg_food_cost_pct": round((total_cost / max(total_rev, 1)) * 100, 1),
            "avg_contribution_margin": round(avg_cm, 2),
            "stars": len([i for i in items if i["quadrant"] == "star"]),
            "puzzles": len([i for i in items if i["quadrant"] == "puzzle"]),
            "plowhorses": len([i for i in items if i["quadrant"] == "plowhorse"]),
            "dogs": len([i for i in items if i["quadrant"] == "dog"]),
        },
        "outlet": outlet or "all",
        "thresholds": {"avg_units": round(avg_units, 1), "avg_cm": round(avg_cm, 2)},
    }


@router.get("/outlets")
async def get_outlet_performance():
    """Revenue and profitability breakdown by outlet."""
    sales = _get_sales_by_item()
    outlets = {}
    for key, sd in sales.items():
        rc = sd["outlet"]
        if rc not in outlets:
            outlets[rc] = {"outlet": rc, "items": 0, "units": 0, "revenue": 0}
        outlets[rc]["items"] += 1
        outlets[rc]["units"] += sd["units"]
        outlets[rc]["revenue"] += sd["revenue"]

    result = sorted(outlets.values(), key=lambda x: x["revenue"], reverse=True)
    return {"outlets": result, "total_outlets": len(result)}


@router.get("/top-performers")
async def get_top_performers(limit: int = 10):
    """Top performing dishes by total revenue across all outlets."""
    resp = await get_active_menu_analytics()
    items = resp.get("items", [])
    top = sorted(items, key=lambda x: x["total_revenue"], reverse=True)[:limit]
    return {"top_performers": top, "total_items": len(items)}


@router.get("/profit-alerts")
async def get_profit_alerts():
    """Items with food cost % above threshold or negative contribution margin."""
    resp = await get_active_menu_analytics()
    items = resp.get("items", [])
    alerts = []
    for item in items:
        if item["food_cost_pct"] > 35:
            alerts.append({**item, "alert_type": "high_food_cost", "message": f"FC% {item['food_cost_pct']}% exceeds 35% target"})
        if item["contribution_margin"] < 5 and item["units_sold"] > 10:
            alerts.append({**item, "alert_type": "low_margin", "message": f"CM ${item['contribution_margin']:.2f} below minimum"})
        if item["units_sold"] < 5 and item["quadrant"] == "dog":
            alerts.append({**item, "alert_type": "low_velocity", "message": f"Only {item['units_sold']} units sold — consider removal"})
    return {"alerts": alerts, "total_alerts": len(alerts)}
