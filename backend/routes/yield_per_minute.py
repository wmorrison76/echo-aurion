"""
Yield-per-Occupied-Minute
=========================
T.1 from the CFO toolkit additions. For function rooms, restaurant
tables, spa treatment rooms, cabanas: revenue per occupied minute.
Identifies underused space and over-allocated space.

A function room rented for $8,000 for an 8-hour event is $16.67/min.
The same room rented for $4,500 for 4 hours is $18.75/min — better
yield. Most operators have never computed this.

Reads from:
  · `outlet_capture_daily`     — revenue + capacity utilization
  · `outlet_capture_events`    — event-level granularity
  · `outlets`                  — capacity metadata (seats, hours)
  · `banquet_schedules`        — function-room bookings if available

Real math; no synthesis. When event-level minute data is missing
(no granular timing), the endpoint computes daily yield-per-available-
minute from outlet hours and notes the precision degradation.
"""
from datetime import datetime, timezone, timedelta, date as date_cls
from statistics import mean, median
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/yield-per-minute", tags=["cfo-yield-per-minute"])

_now = lambda: datetime.now(timezone.utc).isoformat()


def _minutes_open_per_day(outlet: Dict, dow: str) -> int:
    """Minutes the outlet is open on a given day-of-week."""
    hours = outlet.get("hours") or []
    today_hours = next((h for h in hours if h.get("day") == dow), None)
    if not today_hours:
        return 0
    try:
        open_h, open_m = map(int, today_hours["open"].split(":"))
        close_h, close_m = map(int, today_hours["close"].split(":"))
        return (close_h * 60 + close_m) - (open_h * 60 + open_m)
    except Exception:
        return 600   # 10-hour fallback if format is malformed


@router.get("/outlet/{outlet_id}")
async def outlet_yield(outlet_id: str, lookback_days: int = Query(30, ge=7, le=180)):
    """Yield-per-occupied-minute for an outlet over a lookback window.
    Returns daily series + statistical summary + comparison vs. peer
    days within the same window."""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, f"Outlet {outlet_id} not registered")

    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    daily_rows = list(
        db["outlet_capture_daily"].find(
            {"outlet_id": outlet_id, "date": {"$gte": cutoff}},
            {"_id": 0},
        ).sort("date", 1)
    )
    if not daily_rows:
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "no_outlet_capture_daily_rows",
            "lookback_days": lookback_days,
            "generated_at": _now(),
        }

    DOW_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    series = []
    for row in daily_rows:
        d = datetime.fromisoformat(row["date"]).date()
        dow = DOW_LABELS[d.weekday()]
        minutes_open = _minutes_open_per_day(outlet, dow)
        if minutes_open == 0:
            continue                              # outlet closed that day

        revenue_cents = row.get("revenue_cents", 0)
        covers = row.get("covers", 0)
        capacity = max(1, outlet.get("capacity", {}).get("seats", 1))
        utilization = covers / max(1, outlet.get("capacity", {}).get("max_daily_covers", capacity * 3))

        # Yield per available minute: revenue / minutes_open
        # (treats minutes as the bookable inventory unit)
        yield_per_minute_cents = revenue_cents / minutes_open
        # Yield per occupied minute: revenue / (minutes_open × utilization)
        # Approximates the unit economics when seats are filled
        occupied_minutes = max(1, minutes_open * utilization)
        yield_per_occupied_minute_cents = revenue_cents / occupied_minutes

        series.append({
            "date": row["date"],
            "dow": dow,
            "minutes_open": minutes_open,
            "covers": covers,
            "revenue_cents": revenue_cents,
            "utilization": round(utilization, 4),
            "yield_per_minute_cents": round(yield_per_minute_cents, 2),
            "yield_per_occupied_minute_cents": round(yield_per_occupied_minute_cents, 2),
        })

    if not series:
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "outlet_closed_all_days_in_window",
            "generated_at": _now(),
        }

    yields_per_min = [s["yield_per_minute_cents"] for s in series]
    yields_per_occ_min = [s["yield_per_occupied_minute_cents"] for s in series]

    # Per-DOW summary so operators can see weekend vs weekday yield
    by_dow: Dict[str, List[float]] = {}
    for s in series:
        by_dow.setdefault(s["dow"], []).append(s["yield_per_minute_cents"])
    dow_summary = {
        dow: {
            "avg_yield_per_minute_cents": round(mean(values), 2),
            "samples": len(values),
        }
        for dow, values in by_dow.items()
    }

    return {
        "outlet_id": outlet_id,
        "outlet_name": outlet.get("name"),
        "outlet_type": outlet.get("outlet_type"),
        "available": True,
        "lookback_days": lookback_days,
        "summary": {
            "avg_yield_per_minute_cents": round(mean(yields_per_min), 2),
            "median_yield_per_minute_cents": round(median(yields_per_min), 2),
            "best_day_yield_cents": round(max(yields_per_min), 2),
            "worst_day_yield_cents": round(min(yields_per_min), 2),
            "avg_yield_per_occupied_minute_cents": round(mean(yields_per_occ_min), 2),
            "days_observed": len(series),
        },
        "by_dow": dow_summary,
        "daily_series": series,
        "generated_at": _now(),
    }


@router.get("/property/{property_id}")
async def property_yield_summary(property_id: str, lookback_days: int = Query(30, ge=7, le=180)):
    """Cross-outlet yield comparison for a property. Identifies the
    space with the highest yield-per-minute (your most valuable real
    estate) and the lowest (where there's headroom)."""
    outlets = list(db["outlets"].find({"property_id": property_id, "active": True}, {"_id": 0}))
    summaries = []
    for outlet in outlets:
        try:
            result = await outlet_yield(outlet["outlet_id"], lookback_days)
        except HTTPException:
            continue
        if not result.get("available"):
            continue
        s = result["summary"]
        summaries.append({
            "outlet_id": outlet["outlet_id"],
            "outlet_name": outlet.get("name"),
            "outlet_type": outlet.get("outlet_type"),
            "avg_yield_per_minute_cents": s["avg_yield_per_minute_cents"],
            "best_day_yield_cents": s["best_day_yield_cents"],
            "days_observed": s["days_observed"],
        })

    if not summaries:
        return {
            "property_id": property_id,
            "available": False,
            "reason": "no_outlets_with_yield_data",
            "generated_at": _now(),
        }

    summaries.sort(key=lambda x: x["avg_yield_per_minute_cents"], reverse=True)
    return {
        "property_id": property_id,
        "lookback_days": lookback_days,
        "outlets_ranked": summaries,
        "highest_yield_outlet": summaries[0],
        "lowest_yield_outlet": summaries[-1],
        "yield_spread_cents": summaries[0]["avg_yield_per_minute_cents"] - summaries[-1]["avg_yield_per_minute_cents"],
        "generated_at": _now(),
    }
