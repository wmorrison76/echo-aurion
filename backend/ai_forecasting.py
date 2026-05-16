"""
LUCCCA AI Forecasting Engine
=============================
Intelligent demand forecasting for proactive inventory management.

Features:
- Historical consumption pattern analysis
- Event-aware demand (BEOs, banquets)
- Seasonality & day-of-week patterns
- Trend detection (upward/downward)
- Confidence scoring
- Optimized order schedule generation
- Stock alerts by urgency
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import math
from database import (
    ingredients_col, consumption_history_col, forecast_events_col,
    forecasts_col, audit_log_col,
)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _uid():
    return str(uuid.uuid4())


def _today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# CONSUMPTION HISTORY
# ---------------------------------------------------------------------------
def record_consumption(ingredient_id: str, qty: float, date: str = "", reason: str = "sale"):
    consumption_history_col.insert_one({
        "ingredient_id": ingredient_id,
        "quantity": qty,
        "date": date or _today(),
        "reason": reason,
        "timestamp": _now(),
    })


def get_consumption_history(ingredient_id: str, days: int = 30) -> list:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    return list(consumption_history_col.find(
        {"ingredient_id": ingredient_id, "date": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("date", 1))


# ---------------------------------------------------------------------------
# EVENT CALENDAR (for demand spikes)
# ---------------------------------------------------------------------------
def add_forecast_event(data: dict) -> dict:
    eid = _uid()
    doc = {
        "id": eid,
        "name": data["name"],
        "event_type": data.get("event_type", "banquet"),
        "date": data["date"],
        "guest_count": data.get("guest_count", 0),
        "menu_items": data.get("menu_items", []),
        "impact_multiplier": data.get("impact_multiplier", 1.5),
        "created_at": _now(),
    }
    forecast_events_col.insert_one(doc)
    del doc["_id"]
    return doc


def get_upcoming_events(days_ahead: int = 14) -> list:
    cutoff = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    today = _today()
    return list(forecast_events_col.find(
        {"date": {"$gte": today, "$lte": cutoff}},
        {"_id": 0}
    ).sort("date", 1))


# ---------------------------------------------------------------------------
# FORECASTING LOGIC
# ---------------------------------------------------------------------------
def _day_of_week_pattern(history: list) -> dict:
    """Analyze consumption by day of week"""
    dow_totals = {i: [] for i in range(7)}
    for h in history:
        try:
            d = datetime.strptime(h["date"], "%Y-%m-%d")
            dow_totals[d.weekday()].append(h["quantity"])
        except (ValueError, KeyError):
            pass

    pattern = {}
    for dow, vals in dow_totals.items():
        pattern[dow] = round(sum(vals) / len(vals), 4) if vals else 0
    return pattern


def _detect_trend(history: list) -> dict:
    if len(history) < 7:
        return {"direction": "stable", "strength": 0}

    mid = len(history) // 2
    first_half = sum(h["quantity"] for h in history[:mid]) / max(mid, 1)
    second_half = sum(h["quantity"] for h in history[mid:]) / max(len(history) - mid, 1)

    if second_half > first_half * 1.1:
        return {"direction": "increasing", "strength": round((second_half / max(first_half, 0.01) - 1) * 100, 1)}
    elif second_half < first_half * 0.9:
        return {"direction": "decreasing", "strength": round((1 - second_half / max(first_half, 0.01)) * 100, 1)}
    return {"direction": "stable", "strength": 0}


def forecast_ingredient(ingredient_id: str, days_ahead: int = 7) -> dict:
    ing = ingredients_col.find_one({"id": ingredient_id}, {"_id": 0})
    if not ing:
        raise ValueError(f"Ingredient {ingredient_id} not found")

    history = get_consumption_history(ingredient_id, days=90)
    if not history:
        return {
            "ingredient_id": ingredient_id,
            "ingredient_name": ing["name"],
            "daily_forecasts": [],
            "total_forecasted": 0,
            "confidence": 0,
            "message": "No consumption history available",
        }

    dow_pattern = _day_of_week_pattern(history)
    trend = _detect_trend(history)
    avg_daily = sum(h["quantity"] for h in history) / max(len(set(h["date"] for h in history)), 1)

    # Event impact
    events = get_upcoming_events(days_ahead)
    event_dates = {e["date"]: e.get("impact_multiplier", 1.5) for e in events}

    # Generate daily forecasts
    daily = []
    total = 0
    today = datetime.now(timezone.utc)
    trend_factor = 1 + (trend["strength"] / 100 * (0.01 if trend["direction"] == "increasing" else -0.01))

    for i in range(days_ahead):
        d = today + timedelta(days=i + 1)
        date_str = d.strftime("%Y-%m-%d")
        dow = d.weekday()

        base = dow_pattern.get(dow, avg_daily)
        if base == 0:
            base = avg_daily

        adjusted = base * trend_factor
        if date_str in event_dates:
            adjusted *= event_dates[date_str]

        adjusted = round(max(adjusted, 0), 4)
        daily.append({
            "date": date_str,
            "forecasted_qty": adjusted,
            "day_of_week": d.strftime("%A"),
            "has_event": date_str in event_dates,
        })
        total += adjusted

    confidence = min(95, 40 + len(history) * 0.5)

    result = {
        "ingredient_id": ingredient_id,
        "ingredient_name": ing["name"],
        "current_stock": ing.get("current_stock", 0),
        "par_level": ing.get("par_level", 0),
        "avg_daily_consumption": round(avg_daily, 4),
        "trend": trend,
        "daily_forecasts": daily,
        "total_forecasted": round(total, 2),
        "days_of_stock": round(ing.get("current_stock", 0) / max(avg_daily, 0.01), 1),
        "confidence": round(confidence, 1),
        "will_stockout": ing.get("current_stock", 0) < total,
        "stockout_date": None,
        "forecasted_at": _now(),
    }

    # Calculate stockout date
    running_stock = ing.get("current_stock", 0)
    for f in daily:
        running_stock -= f["forecasted_qty"]
        if running_stock <= 0:
            result["stockout_date"] = f["date"]
            break

    # Save forecast
    forecasts_col.update_one(
        {"ingredient_id": ingredient_id},
        {"$set": result, "$setOnInsert": {"created_at": _now()}},
        upsert=True
    )
    return result


def forecast_all() -> dict:
    ingredients = list(ingredients_col.find({}, {"_id": 0, "id": 1, "name": 1}))
    results = []
    will_stockout = 0
    for ing in ingredients:
        try:
            f = forecast_ingredient(ing["id"])
            results.append(f)
            if f.get("will_stockout"):
                will_stockout += 1
        except Exception:
            pass

    return {
        "total_ingredients": len(ingredients),
        "forecasted": len(results),
        "will_stockout": will_stockout,
        "forecasts": results,
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# ORDER SCHEDULE
# ---------------------------------------------------------------------------
def generate_order_schedule(days_ahead: int = 7) -> dict:
    forecasts = forecast_all()
    orders = []

    for f in forecasts.get("forecasts", []):
        if f.get("will_stockout") or f.get("days_of_stock", 999) < 3:
            ing = ingredients_col.find_one({"id": f["ingredient_id"]}, {"_id": 0})
            if not ing:
                continue
            par = ing.get("par_level", 0)
            stock = ing.get("current_stock", 0)
            needed = max(par - stock, f.get("total_forecasted", 0) - stock)
            order_qty = max(needed, ing.get("reorder_qty", 0))

            orders.append({
                "ingredient_id": f["ingredient_id"],
                "ingredient_name": f["ingredient_name"],
                "current_stock": stock,
                "forecasted_usage": f["total_forecasted"],
                "days_of_stock": f.get("days_of_stock", 0),
                "stockout_date": f.get("stockout_date"),
                "order_qty": round(order_qty, 2),
                "estimated_cost": round(order_qty * ing.get("current_cost", 0), 2),
                "urgency": "critical" if f.get("days_of_stock", 99) < 1 else
                           "urgent" if f.get("days_of_stock", 99) < 3 else "normal",
                "preferred_vendor": ing.get("preferred_vendor", ""),
            })

    orders.sort(key=lambda x: {"critical": 0, "urgent": 1, "normal": 2}.get(x["urgency"], 3))

    return {
        "days_ahead": days_ahead,
        "total_orders": len(orders),
        "total_estimated_cost": round(sum(o["estimated_cost"] for o in orders), 2),
        "orders": orders,
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# ALERTS
# ---------------------------------------------------------------------------
def get_stock_alerts() -> dict:
    ingredients = list(ingredients_col.find({"reorder_point": {"$gt": 0}}, {"_id": 0}))
    critical = []
    warning = []
    normal = []

    for ing in ingredients:
        stock = ing.get("current_stock", 0)
        reorder = ing.get("reorder_point", 0)
        alert = {
            "ingredient_id": ing["id"],
            "ingredient_name": ing["name"],
            "current_stock": stock,
            "reorder_point": reorder,
            "par_level": ing.get("par_level", 0),
        }

        if stock <= 0:
            alert["level"] = "critical"
            critical.append(alert)
        elif stock <= reorder:
            alert["level"] = "warning"
            warning.append(alert)
        elif stock <= reorder * 1.5:
            alert["level"] = "normal"
            normal.append(alert)

    return {
        "critical": critical,
        "warning": warning,
        "normal": normal,
        "total_alerts": len(critical) + len(warning) + len(normal),
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# BULK IMPORT
# ---------------------------------------------------------------------------
def import_consumption_data(records: list) -> dict:
    inserted = 0
    for r in records:
        try:
            consumption_history_col.insert_one({
                "ingredient_id": r["ingredient_id"],
                "quantity": r["quantity"],
                "date": r["date"],
                "reason": r.get("reason", "historical"),
                "timestamp": _now(),
            })
            inserted += 1
        except Exception:
            pass
    return {"imported": inserted, "total": len(records)}
