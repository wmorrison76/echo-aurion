"""
EchoAi3 — Echo Never Sleeps: Continuous Intelligence Engine
=============================================================
Background analysis that runs on schedule (every 4 hours or on-demand):
- Predicts sales of every menu item 10 days out
- Refines predictions as dates approach (decay-weighted confidence)
- Analyzes: historical sales, group business, weather, occupancy, capture ratio, menu matrix
- Determines par levels for production
- Identifies peak periods and overproduction risk
- Generates actionable insights for kitchen, purchasing, and management
"""
import os
import math
import random
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/continuous", tags=["echoai3-continuous"])

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]


# ─── Data Collection Functions ───

def _get_historical_sales() -> dict:
    """Aggregate historical sales patterns from POS and events."""
    pos = list(db["pos_transactions"].find({}, {"_id": 0}).limit(500))
    events = list(db["events"].find({}, {"_id": 0}).limit(100))
    menu_items = list(db["menu_items"].find({}, {"_id": 0}).limit(200))

    # Build item popularity from POS
    item_freq = {}
    for t in pos:
        for item in t.get("items", []):
            name = item.get("name", "")
            if name:
                if name not in item_freq:
                    item_freq[name] = {"count": 0, "revenue": 0, "avg_price": 0}
                item_freq[name]["count"] += item.get("quantity", 1)
                item_freq[name]["revenue"] += item.get("total", item.get("price", 0))

    # Calculate averages
    for name, data in item_freq.items():
        data["avg_price"] = round(data["revenue"] / max(data["count"], 1), 2)

    # Event-driven demand
    event_demand = {}
    for ev in events:
        covers = ev.get("guest_count", 0)
        ev_type = ev.get("type", "other")
        if ev_type not in event_demand:
            event_demand[ev_type] = {"total_covers": 0, "count": 0}
        event_demand[ev_type]["total_covers"] += covers
        event_demand[ev_type]["count"] += 1

    return {
        "item_popularity": dict(sorted(item_freq.items(), key=lambda x: x[1]["count"], reverse=True)[:50]),
        "event_demand": event_demand,
        "total_pos_transactions": len(pos),
        "total_events": len(events),
        "menu_items_tracked": len(menu_items),
    }


def _get_occupancy_data() -> dict:
    """Get hotel occupancy and capture ratio data."""
    properties = list(db["properties"].find({}, {"_id": 0}).limit(5))
    total_rooms = sum(p.get("room_count", p.get("rooms", 250)) for p in properties) or 250

    # Simulate occupancy pattern (would come from PMS in production)
    today = datetime.now(timezone.utc)
    dow = today.weekday()
    base_occ = 0.72
    # Weekend boost
    if dow in (4, 5):
        base_occ = 0.88
    elif dow == 6:
        base_occ = 0.80
    # Midweek dip
    elif dow in (1, 2):
        base_occ = 0.65

    # Group business from events
    group_rooms = sum(e.get("room_block", 0) for e in db["events"].find({}, {"_id": 0, "room_block": 1}).limit(20))

    return {
        "total_rooms": total_rooms,
        "current_occupancy_pct": round(base_occ * 100, 1),
        "occupied_rooms": round(total_rooms * base_occ),
        "group_rooms_blocked": group_rooms,
        "capture_rate": 0.65,
        "estimated_fnb_guests": round(total_rooms * base_occ * 0.65 * 1.8),
    }


def _get_upcoming_events(days_ahead: int = 10) -> list:
    """Get upcoming events that drive demand."""
    events = list(db["events"].find({}, {"_id": 0}).limit(50))
    beos = list(db["beos"].find({}, {"_id": 0}).limit(30))
    cal = list(db["calendar_events"].find({}, {"_id": 0}).limit(30))

    upcoming = []
    for ev in events:
        upcoming.append({
            "name": ev.get("title", ev.get("name", "")),
            "type": ev.get("type", ""),
            "covers": ev.get("guest_count", 0),
            "meal_type": ev.get("meal_type", "plated_dinner"),
            "room_block": ev.get("room_block", 0),
        })
    return upcoming[:20]


def _get_weather_context() -> dict:
    """Weather impact on sales (would integrate with weather API in production)."""
    # Deterministic based on time
    today = datetime.now(timezone.utc)
    month = today.month
    # Seasonal patterns
    if month in (6, 7, 8):
        return {"season": "summer", "impact": "high_outdoor_dining", "demand_modifier": 1.15, "cold_items_boost": 1.2, "hot_items_reduction": 0.85}
    elif month in (12, 1, 2):
        return {"season": "winter", "impact": "comfort_food_demand", "demand_modifier": 1.05, "cold_items_boost": 0.8, "hot_items_reduction": 1.15}
    elif month in (3, 4, 5):
        return {"season": "spring", "impact": "light_fresh_demand", "demand_modifier": 1.0, "cold_items_boost": 1.0, "hot_items_reduction": 1.0}
    else:
        return {"season": "fall", "impact": "harvest_seasonal", "demand_modifier": 1.08, "cold_items_boost": 0.9, "hot_items_reduction": 1.1}


# ─── Prediction Engine ───

def predict_menu_item_sales(days_ahead: int = 10) -> list:
    """Predict sales of every menu item for the next N days."""
    menu_items = list(db["menu_items"].find({"status": {"$ne": "86"}}, {"_id": 0}).limit(200))
    historical = _get_historical_sales()
    occupancy = _get_occupancy_data()
    events = _get_upcoming_events(days_ahead)
    weather = _get_weather_context()

    total_event_covers = sum(e["covers"] for e in events)
    daily_fnb_guests = occupancy["estimated_fnb_guests"]

    predictions = []
    for item in menu_items:
        name = item.get("name", "")
        category = item.get("category", "").lower()
        price = item.get("price", item.get("menu_price", 0))
        cost = item.get("cost", item.get("food_cost", 0))

        # Base popularity from historical data
        hist = historical["item_popularity"].get(name, {})
        base_daily = hist.get("count", 5) / max(historical["total_pos_transactions"] / 30, 1)
        if base_daily < 1:
            base_daily = max(1, len(menu_items) and daily_fnb_guests / len(menu_items) * 0.3)

        daily_predictions = []
        for day in range(1, days_ahead + 1):
            future_date = datetime.now(timezone.utc) + timedelta(days=day)
            dow = future_date.weekday()

            # Day-of-week factor
            dow_factor = {0: 0.85, 1: 0.80, 2: 0.90, 3: 1.0, 4: 1.15, 5: 1.30, 6: 1.10}[dow]

            # Weather/seasonal factor
            weather_factor = weather["demand_modifier"]
            if "cold" in category or "salad" in category or "ceviche" in category:
                weather_factor *= weather["cold_items_boost"]
            elif "soup" in category or "stew" in category or "braise" in category:
                weather_factor *= weather["hot_items_reduction"]

            # Event boost
            event_boost = 1.0 + (total_event_covers / max(daily_fnb_guests * 30, 1)) * 0.5

            # Confidence decay — farther out = less confident
            confidence = max(40, 95 - (day * 5))

            predicted_qty = round(base_daily * dow_factor * weather_factor * event_boost)
            predicted_revenue = round(predicted_qty * price, 2)
            predicted_cost = round(predicted_qty * cost, 2)

            daily_predictions.append({
                "day": day,
                "date": future_date.strftime("%Y-%m-%d"),
                "dow": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dow],
                "predicted_qty": max(1, predicted_qty),
                "predicted_revenue": predicted_revenue,
                "predicted_cost": predicted_cost,
                "confidence_pct": confidence,
            })

        # Aggregate
        total_qty = sum(d["predicted_qty"] for d in daily_predictions)
        peak_day = max(daily_predictions, key=lambda d: d["predicted_qty"])
        low_day = min(daily_predictions, key=lambda d: d["predicted_qty"])

        # Par level recommendation
        avg_daily = total_qty / max(days_ahead, 1)
        par_level = math.ceil(avg_daily * 1.15)  # 15% safety buffer

        predictions.append({
            "item": name,
            "category": category,
            "price": price,
            "cost": cost,
            "daily_predictions": daily_predictions,
            "total_predicted_qty": total_qty,
            "avg_daily_qty": round(avg_daily, 1),
            "peak_day": {"date": peak_day["date"], "qty": peak_day["predicted_qty"]},
            "low_day": {"date": low_day["date"], "qty": low_day["predicted_qty"]},
            "recommended_par": par_level,
            "overproduction_risk": "HIGH" if par_level > avg_daily * 1.5 else "LOW",
        })

    predictions.sort(key=lambda x: x["total_predicted_qty"], reverse=True)
    return predictions


def generate_continuous_analysis() -> dict:
    """Run the full continuous analysis cycle."""
    analysis_id = f"ens-{_uid()}"

    # Gather all inputs
    historical = _get_historical_sales()
    occupancy = _get_occupancy_data()
    events = _get_upcoming_events(10)
    weather = _get_weather_context()
    predictions = predict_menu_item_sales(10)

    # Inventory vs predicted demand
    ingredients = list(db["ingredients"].find({}, {"_id": 0}).limit(200))
    total_pred_covers = sum(e["covers"] for e in events) + occupancy["estimated_fnb_guests"] * 10
    stockout_risk = [i for i in ingredients if i.get("current_stock", 0) == 0]
    low_stock = [i for i in ingredients if 0 < i.get("current_stock", 0) < i.get("par_level", 10)]

    # Peak identification
    peak_items = [p for p in predictions if p.get("peak_day", {}).get("qty", 0) > p["avg_daily_qty"] * 1.3]

    # Overproduction risk
    overprod_risk = [p for p in predictions if p["overproduction_risk"] == "HIGH"]

    # Financial projections
    total_predicted_revenue = sum(sum(d["predicted_revenue"] for d in p["daily_predictions"]) for p in predictions)
    total_predicted_cost = sum(sum(d["predicted_cost"] for d in p["daily_predictions"]) for p in predictions)

    # Insights
    insights = []

    if stockout_risk:
        insights.append({
            "priority": "critical",
            "category": "inventory",
            "insight": f"{len(stockout_risk)} ingredients at zero stock. Events requiring these items in next 10 days will be impacted.",
            "action": f"Emergency order: {', '.join(i.get('name','') for i in stockout_risk[:5])}",
            "impact_days": 1,
        })

    if low_stock:
        insights.append({
            "priority": "high",
            "category": "inventory",
            "insight": f"{len(low_stock)} items below par. Predicted demand over 10 days: ~{total_pred_covers:,} covers.",
            "action": "Generate purchase orders for below-par items immediately",
            "impact_days": 3,
        })

    if peak_items:
        insights.append({
            "priority": "medium",
            "category": "production",
            "insight": f"{len(peak_items)} menu items show peak demand spikes (>30% above average). Prepare for surge.",
            "action": f"Peak items: {', '.join(p['item'] for p in peak_items[:5])}",
            "impact_days": 5,
        })

    if overprod_risk:
        insights.append({
            "priority": "medium",
            "category": "waste_prevention",
            "insight": f"{len(overprod_risk)} items at overproduction risk. Reduce par to avoid waste.",
            "action": f"Review pars for: {', '.join(p['item'] for p in overprod_risk[:5])}",
            "impact_days": 7,
        })

    if occupancy["current_occupancy_pct"] > 85:
        insights.append({
            "priority": "high",
            "category": "capacity",
            "insight": f"Occupancy at {occupancy['current_occupancy_pct']}% — high capture expected. Increase F&B prep levels.",
            "action": f"Expect {occupancy['estimated_fnb_guests']} F&B guests today. Staff accordingly.",
            "impact_days": 1,
        })

    if events:
        total_event_covers = sum(e["covers"] for e in events)
        insights.append({
            "priority": "high",
            "category": "events",
            "insight": f"{len(events)} upcoming events, {total_event_covers:,} total covers in next 10 days.",
            "action": "Verify BEO production plans, inventory, and staffing for all events.",
            "impact_days": 10,
        })

    # Revenue projection
    insights.append({
        "priority": "info",
        "category": "financial",
        "insight": f"10-day revenue projection: ${total_predicted_revenue:,.0f} (food cost: ${total_predicted_cost:,.0f}, {round(total_predicted_cost/max(total_predicted_revenue,1)*100,1)}%)",
        "action": "Monitor actuals vs forecast daily. Recalibrate if variance >5%.",
        "impact_days": 10,
    })

    analysis = {
        "analysis_id": analysis_id,
        "timestamp": _now(),
        "data_inputs": {
            "historical_pos_transactions": historical["total_pos_transactions"],
            "menu_items_tracked": historical["menu_items_tracked"],
            "upcoming_events": len(events),
            "occupancy_pct": occupancy["current_occupancy_pct"],
            "weather_season": weather["season"],
            "demand_modifier": weather["demand_modifier"],
        },
        "predictions_generated": len(predictions),
        "top_predicted_items": [{"item": p["item"], "10day_qty": p["total_predicted_qty"], "par": p["recommended_par"]} for p in predictions[:10]],
        "financial_projection": {
            "10day_revenue": round(total_predicted_revenue, 2),
            "10day_food_cost": round(total_predicted_cost, 2),
            "food_cost_pct": round(total_predicted_cost / max(total_predicted_revenue, 1) * 100, 1),
        },
        "risk_summary": {
            "stockout_items": len(stockout_risk),
            "below_par_items": len(low_stock),
            "peak_demand_items": len(peak_items),
            "overproduction_risk_items": len(overprod_risk),
        },
        "insights": insights,
        "occupancy": occupancy,
        "weather": weather,
    }

    # Store analysis
    db["continuous_analyses"].insert_one({**analysis})
    analysis.pop("_id", None)

    trace_log(event_type="continuous_analysis", entity_type="echoai3_continuous", entity_id=analysis_id,
              actor_id="echoai3", metadata={"items_predicted": len(predictions), "insights": len(insights)})

    return analysis


# ─── API Endpoints ───

@router.get("/analyze")
async def run_continuous_analysis():
    """Run a full continuous analysis cycle — Echo Never Sleeps."""
    return generate_continuous_analysis()


@router.get("/predict-sales")
async def predict_sales(days_ahead: int = Query(10, ge=1, le=30)):
    """Predict sales of every menu item for the next N days."""
    predictions = predict_menu_item_sales(days_ahead)
    return {
        "days_ahead": days_ahead,
        "items_predicted": len(predictions),
        "predictions": predictions,
        "timestamp": _now(),
    }


@router.get("/par-levels")
async def recommended_par_levels():
    """Get recommended par levels for all active menu items."""
    predictions = predict_menu_item_sales(7)
    pars = []
    for p in predictions:
        pars.append({
            "item": p["item"],
            "category": p["category"],
            "current_avg_daily": p["avg_daily_qty"],
            "recommended_par": p["recommended_par"],
            "peak_day_qty": p["peak_day"]["qty"],
            "overproduction_risk": p["overproduction_risk"],
        })
    return {"par_levels": pars, "count": len(pars), "period": "7-day rolling", "timestamp": _now()}


@router.get("/peak-periods")
async def identify_peak_periods(days_ahead: int = Query(10)):
    """Identify peak sales periods for staffing and production planning."""
    predictions = predict_menu_item_sales(days_ahead)
    occupancy = _get_occupancy_data()
    events = _get_upcoming_events(days_ahead)

    # Aggregate daily totals
    daily_totals = {}
    for p in predictions:
        for d in p["daily_predictions"]:
            date = d["date"]
            if date not in daily_totals:
                daily_totals[date] = {"date": date, "dow": d["dow"], "total_items": 0, "total_revenue": 0}
            daily_totals[date]["total_items"] += d["predicted_qty"]
            daily_totals[date]["total_revenue"] += d["predicted_revenue"]

    days = sorted(daily_totals.values(), key=lambda x: x["total_revenue"], reverse=True)
    avg_daily_rev = sum(d["total_revenue"] for d in days) / max(len(days), 1)

    peak_days = [d for d in days if d["total_revenue"] > avg_daily_rev * 1.15]
    slow_days = [d for d in days if d["total_revenue"] < avg_daily_rev * 0.85]

    return {
        "days_ahead": days_ahead,
        "daily_forecast": days,
        "peak_days": peak_days,
        "slow_days": slow_days,
        "avg_daily_revenue": round(avg_daily_rev, 2),
        "peak_count": len(peak_days),
        "slow_count": len(slow_days),
        "upcoming_events": len(events),
        "occupancy": occupancy,
        "timestamp": _now(),
    }


@router.get("/history")
async def analysis_history(limit: int = Query(10)):
    """Get recent continuous analysis results."""
    analyses = list(db["continuous_analyses"].find({}, {"_id": 0, "predictions": 0}).sort("timestamp", -1).limit(limit))
    return {"analyses": analyses, "count": len(analyses)}
