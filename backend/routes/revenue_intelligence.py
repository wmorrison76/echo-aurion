"""
Revenue Intelligence — Cross-Module Analytics & Dynamic Yield Variance Benchmarking.
Aggregates data from Fix My Menu, Micro-Market, Mobile Preorder, and Cafeteria
to provide unified margin insights, yield variance tracking, and channel mix analysis.
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import os

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

from database import db as _db
menu_items_col = _db["menu_items"]
analyses_col = _db["menu_analyses"]
mm_kiosks_col = _db["mm_kiosks"]
mm_inventory_col = _db["mm_inventory"]
mm_sales_col = _db["mm_sales"]
mo_orders_col = _db["mo_orders"]
mo_lockers_col = _db["mo_lockers"]
caf_transactions_col = _db["cafeteria_transactions"]
caf_waste_col = _db["cafeteria_waste"]
yield_benchmarks_col = _db["yield_benchmarks"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════════════════════════
# CROSS-MODULE DASHBOARD — unified KPIs across all channels
# ═══════════════════════════════════════════════════════════════

@router.get("/cross-module")
def cross_module_dashboard(property_id: Optional[str] = None, days: int = 30):
    """Unified analytics across Fix My Menu, Micro-Market, Mobile Order, and Cafeteria."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # --- Fix My Menu data ---
    all_items = list(menu_items_col.find({}, {"_id": 0}).limit(300))
    flagged_count = 0
    total_revenue_at_risk = 0
    avg_food_cost = 0
    item_costs = []
    for item in all_items:
        fc = item.get("food_cost", 0)
        sp = item.get("price", item.get("sell_price", 0))
        if sp > 0:
            cost_pct = fc / sp
            item_costs.append(cost_pct)
            if cost_pct > 0.35:
                flagged_count += 1
                total_revenue_at_risk += fc * item.get("monthly_volume", 0)
    avg_food_cost = round(sum(item_costs) / max(len(item_costs), 1), 4)

    recent_fixes = analyses_col.count_documents({"created_at": {"$gte": cutoff}})
    total_fixes = analyses_col.count_documents({})

    # --- Micro-Market data ---
    mm_kiosks = list(mm_kiosks_col.find({}, {"_id": 0}))
    mm_total_revenue = sum(k.get("total_revenue", 0) for k in mm_kiosks)
    mm_total_sales = sum(k.get("total_sales", 0) for k in mm_kiosks)
    mm_inv_count = mm_inventory_col.count_documents({})
    mm_low_stock = 0
    for inv in mm_inventory_col.find({}, {"_id": 0, "quantity": 1, "par_level": 1}):
        if inv.get("quantity", 0) <= inv.get("par_level", 5):
            mm_low_stock += 1

    # --- Mobile Preorder data ---
    mo_lockers = list(mo_lockers_col.find({}, {"_id": 0}))
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    mo_today_orders = list(mo_orders_col.find({"date": today}, {"_id": 0}))
    mo_today_revenue = sum(o.get("total", 0) for o in mo_today_orders)
    mo_pickup_rate = 0
    ready_or_picked = [o for o in mo_today_orders if o.get("status") in ("ready_for_pickup", "picked_up")]
    picked_up = [o for o in mo_today_orders if o.get("status") == "picked_up"]
    if ready_or_picked:
        mo_pickup_rate = round(len(picked_up) / len(ready_or_picked), 3)

    # --- Cafeteria data ---
    caf_txns = list(caf_transactions_col.find({"date": today}, {"_id": 0}))
    caf_revenue = sum(t.get("total", t.get("amount", 0)) for t in caf_txns)
    caf_waste_today = list(caf_waste_col.find({"date": today}, {"_id": 0}))
    caf_waste_lbs = sum(w.get("weight_lbs", w.get("quantity", 0)) for w in caf_waste_today)

    # --- Channel mix ---
    channels = [
        {"channel": "Dine-In Menu", "revenue": round(sum(i.get("price", i.get("sell_price", 0)) * i.get("monthly_volume", 0) for i in all_items) / 30, 2), "source": "fix-menu"},
        {"channel": "Micro-Market", "revenue": round(mm_total_revenue, 2), "source": "micro-market"},
        {"channel": "Mobile Preorder", "revenue": round(mo_today_revenue, 2), "source": "mobile-order"},
        {"channel": "Cafeteria", "revenue": round(caf_revenue, 2), "source": "cafeteria"},
    ]
    total_channel_rev = sum(c["revenue"] for c in channels)
    for c in channels:
        c["pct"] = round(c["revenue"] / max(total_channel_rev, 0.01), 3)

    # --- Margin recovery opportunities ---
    recovery_opportunities = []
    flagged_items = [i for i in all_items if i.get("food_cost", 0) / max(i.get("price", i.get("sell_price", 1)), 0.01) > 0.35]
    for item in flagged_items[:8]:
        fc = item.get("food_cost", 0)
        sp = item.get("price", item.get("sell_price", 0))
        optimized_price = round(fc / 0.28, 2)
        grab_go_price = round(sp * 0.85, 2)
        monthly_vol = item.get("monthly_volume", 0)
        recovery_opportunities.append({
            "item_name": item.get("name", ""),
            "category": item.get("category", ""),
            "current_food_cost_pct": round(fc / max(sp, 0.01), 3),
            "current_price": sp,
            "food_cost": fc,
            "monthly_volume": monthly_vol,
            "strategies": [
                {
                    "strategy": "price_optimize",
                    "label": "Optimize Dine-In Price",
                    "new_price": optimized_price,
                    "delta": round(optimized_price - sp, 2),
                    "monthly_impact": round((optimized_price - sp) * monthly_vol, 2),
                },
                {
                    "strategy": "micro_market_bundle",
                    "label": "Micro-Market Grab-and-Go",
                    "new_price": grab_go_price,
                    "target_food_cost_pct": 0.30,
                    "monthly_impact": round(grab_go_price * monthly_vol * 0.15, 2),
                },
                {
                    "strategy": "portion_resize",
                    "label": "Portion Adjustment",
                    "savings_pct": 0.08,
                    "monthly_impact": round(fc * monthly_vol * 0.08, 2),
                },
            ],
        })

    return {
        "period_days": days,
        "date": today,
        "summary": {
            "total_menu_items": len(all_items),
            "flagged_margin_items": flagged_count,
            "revenue_at_risk": round(total_revenue_at_risk, 2),
            "avg_food_cost_pct": avg_food_cost,
            "total_ai_fixes": total_fixes,
            "recent_fixes": recent_fixes,
            "mm_kiosks": len(mm_kiosks),
            "mm_revenue": round(mm_total_revenue, 2),
            "mm_sales": mm_total_sales,
            "mm_low_stock": mm_low_stock,
            "mo_lockers": len(mo_lockers),
            "mo_today_orders": len(mo_today_orders),
            "mo_today_revenue": round(mo_today_revenue, 2),
            "mo_pickup_rate": mo_pickup_rate,
            "caf_today_revenue": round(caf_revenue, 2),
            "caf_today_transactions": len(caf_txns),
            "caf_waste_lbs": round(caf_waste_lbs, 2),
        },
        "channel_mix": channels,
        "total_channel_revenue": round(total_channel_rev, 2),
        "recovery_opportunities": recovery_opportunities,
    }


# ═══════════════════════════════════════════════════════════════
# DYNAMIC YIELD VARIANCE BENCHMARKING
# ═══════════════════════════════════════════════════════════════

@router.get("/yield-variance")
def yield_variance(property_id: Optional[str] = None):
    """Compare actual vs projected yields across menu items. Flag negative variance."""
    items = list(menu_items_col.find({}, {"_id": 0}).limit(200))

    benchmarks = []
    negative_variance = []
    positive_variance = []
    total_actual_yield = 0
    total_projected_yield = 0

    for item in items:
        name = item.get("name", "")
        category = item.get("category", "")
        monthly_vol = item.get("monthly_volume", 0)
        food_cost = item.get("food_cost", 0)
        sell_price = item.get("price", item.get("sell_price", 0))
        if sell_price <= 0 or monthly_vol <= 0:
            continue

        # Projected yield based on target 30% food cost
        projected_margin = 0.70
        projected_yield = round(sell_price * projected_margin * monthly_vol, 2)

        # Actual yield based on actual food cost
        actual_margin = 1 - (food_cost / sell_price)
        actual_yield = round(sell_price * actual_margin * monthly_vol, 2)

        variance = round(actual_yield - projected_yield, 2)
        variance_pct = round(variance / max(abs(projected_yield), 0.01), 4)

        # Industry benchmark (target food cost by category)
        industry_target = _industry_benchmark(category)

        entry = {
            "item_name": name,
            "category": category,
            "sell_price": sell_price,
            "food_cost": food_cost,
            "food_cost_pct": round(food_cost / sell_price, 4),
            "monthly_volume": monthly_vol,
            "projected_yield": projected_yield,
            "actual_yield": actual_yield,
            "variance": variance,
            "variance_pct": variance_pct,
            "industry_target_fc": industry_target,
            "vs_industry": round((food_cost / sell_price) - industry_target, 4),
            "status": "above_target" if (food_cost / sell_price) > industry_target else "on_target",
        }

        benchmarks.append(entry)
        total_actual_yield += actual_yield
        total_projected_yield += projected_yield

        if variance < 0:
            negative_variance.append(entry)
        else:
            positive_variance.append(entry)

    # Sort by worst variance first
    negative_variance.sort(key=lambda x: x["variance"])
    positive_variance.sort(key=lambda x: x["variance"], reverse=True)

    # Category aggregation
    category_agg = {}
    for b in benchmarks:
        cat = b["category"] or "Uncategorized"
        if cat not in category_agg:
            category_agg[cat] = {"category": cat, "items": 0, "projected": 0, "actual": 0, "variance": 0, "flagged": 0}
        category_agg[cat]["items"] += 1
        category_agg[cat]["projected"] += b["projected_yield"]
        category_agg[cat]["actual"] += b["actual_yield"]
        category_agg[cat]["variance"] += b["variance"]
        if b["status"] == "above_target":
            category_agg[cat]["flagged"] += 1

    for cat in category_agg.values():
        cat["projected"] = round(cat["projected"], 2)
        cat["actual"] = round(cat["actual"], 2)
        cat["variance"] = round(cat["variance"], 2)
        cat["variance_pct"] = round(cat["variance"] / max(abs(cat["projected"]), 0.01), 4)

    return {
        "total_items": len(benchmarks),
        "total_projected_yield": round(total_projected_yield, 2),
        "total_actual_yield": round(total_actual_yield, 2),
        "total_variance": round(total_actual_yield - total_projected_yield, 2),
        "total_variance_pct": round((total_actual_yield - total_projected_yield) / max(abs(total_projected_yield), 0.01), 4),
        "negative_variance_count": len(negative_variance),
        "positive_variance_count": len(positive_variance),
        "worst_performers": negative_variance[:10],
        "best_performers": positive_variance[:10],
        "by_category": list(category_agg.values()),
        "industry_benchmarks": {
            "Entree": 0.32,
            "Appetizer": 0.28,
            "Dessert": 0.25,
            "Beverage": 0.20,
            "Salad": 0.30,
            "Side": 0.25,
        },
    }


def _industry_benchmark(category: str) -> float:
    """Return industry standard food cost % by category."""
    targets = {
        "Entree": 0.32,
        "entree": 0.32,
        "Appetizer": 0.28,
        "appetizer": 0.28,
        "Dessert": 0.25,
        "dessert": 0.25,
        "Beverage": 0.20,
        "beverage": 0.20,
        "Salad": 0.30,
        "salad": 0.30,
        "Side": 0.25,
        "side": 0.25,
    }
    return targets.get(category, 0.30)


# ═══════════════════════════════════════════════════════════════
# YIELD BENCHMARK SNAPSHOTS — historical tracking
# ═══════════════════════════════════════════════════════════════

@router.post("/yield-variance/snapshot")
def save_yield_snapshot():
    """Save current yield variance as a historical snapshot for trend analysis."""
    variance_data = yield_variance()

    snapshot = {
        "snapshot_id": f"ys-{_uid()}",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "total_items": variance_data["total_items"],
        "total_projected_yield": variance_data["total_projected_yield"],
        "total_actual_yield": variance_data["total_actual_yield"],
        "total_variance": variance_data["total_variance"],
        "total_variance_pct": variance_data["total_variance_pct"],
        "negative_count": variance_data["negative_variance_count"],
        "positive_count": variance_data["positive_variance_count"],
        "by_category": variance_data["by_category"],
        "created_at": _now(),
    }
    yield_benchmarks_col.insert_one(snapshot)
    del snapshot["_id"]
    return snapshot


@router.get("/yield-variance/history")
def yield_history(limit: int = 30):
    """Get historical yield variance snapshots for trend analysis."""
    snapshots = list(yield_benchmarks_col.find({}, {"_id": 0}).sort("date", -1).limit(limit))
    return {"snapshots": snapshots, "total": len(snapshots)}
