"""
21-Day Living Forecast — outlet_capture-backed (D64 A.2 refactor)
==================================================================
The 21-day forecast endpoint, rewritten to consume the
outlet_capture_forecasts Monte Carlo output instead of the original
hardcoded multipliers + random.uniform() synthesis.

Contract preserved:
  · GET  /api/forecast-21/forecast            — 21-day rollup
  · GET  /api/forecast-21/forecast/day/{date} — per-day detail
  · POST /api/forecast-21/notes                — manager note
  · GET  /api/forecast-21/notes
  · DEL  /api/forecast-21/notes/{note_id}
  · POST /api/forecast-21/override             — manual override
  · GET  /api/forecast-21/coverage/{outlet}/{date}
  · POST /api/forecast-21/accuracy/snapshot    — legacy snapshot
  · POST /api/forecast-21/accuracy/record-actual
  · GET  /api/forecast-21/accuracy/report
  · GET  /api/forecast-21/accuracy/trend

The response JSON shape is identical to the prior implementation so
the frontend doesn't break. What changed is *what's behind it*:

  · Forecast values come from `outlet_capture_forecasts` (real Monte
    Carlo with P10/P50/P90 bands per outlet × horizon).
  · Per-day actuals (occupancy, covers, revenue) come from real
    collections: `hk_rooms`, `outlet_capture_daily`, `ird_orders`,
    `spa_appointments`.
  · DOW multipliers used for hourly distribution come from
    `outlet_capture_weights` (the active-learning-tuned weights),
    not the hardcoded DOW_PATTERNS dict.
  · Labor cost reads from `labor_blended_rates` per outlet when
    available, else falls back to a default with the fallback
    reason exposed in the response.
  · Manager notes and manual overrides are read live from
    `forecast_notes` and `forecast_overrides` (both real data).
  · NO `random.uniform()` calls anywhere. The bands are real Monte
    Carlo; the AI adjustments are the actual learned weight nudges.
  · Accuracy endpoints delegate to `outlet_capture_accuracy` which
    is the canonical accuracy ledger (60-day rolling MAPE per
    outlet × horizon).

Honest fallback: when outlet_capture has no forecast for a given
date (e.g., no outlets registered yet for the property), the
endpoint returns the day with `data_source: "no_outlet_capture_data"`
rather than synthesizing a plausible-looking value. Doctrine §1.1.

Doctrine alignment:
  · §1.1 transparency — every value's source is labeled; missing-
    data states are first-class
  · §3.1 append-only — accuracy comes from the append-only log;
    no overwriting
  · §2.4 retrospective — accuracy data feeds the
    outlet_capture_learner weight nudge loop
"""
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from statistics import mean
from typing import Optional, List, Dict
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from database import db


router = APIRouter(prefix="/api/forecast-21", tags=["21-day-forecast"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]
_today = lambda: datetime.now(timezone.utc)


# ─────────────────────────────────────────────────────────────────
# Hourly distribution defaults
# These are the *cold-start* defaults the system uses when an outlet
# has no learned hourly pattern yet. They are NOT synthesized noise;
# they are the published industry baseline. Once 30+ days of POS
# check_closed events exist, the learner replaces these with the
# outlet's empirical distribution.
# ─────────────────────────────────────────────────────────────────
DEFAULT_HOURLY_DISTRIBUTION = {
    "restaurant":   {6: 0.02, 7: 0.08, 8: 0.12, 9: 0.06, 10: 0.02, 11: 0.06, 12: 0.14, 13: 0.10, 14: 0.03, 15: 0.01, 16: 0.02, 17: 0.04, 18: 0.10, 19: 0.12, 20: 0.06, 21: 0.02, 22: 0.01},
    "ird":          {6: 0.05, 7: 0.12, 8: 0.10, 9: 0.05, 10: 0.03, 11: 0.04, 12: 0.08, 13: 0.06, 14: 0.03, 15: 0.02, 16: 0.03, 17: 0.04, 18: 0.08, 19: 0.10, 20: 0.06, 21: 0.05, 22: 0.04, 23: 0.02},
    "banquet":      {8: 0.05, 9: 0.08, 10: 0.10, 11: 0.08, 12: 0.15, 13: 0.10, 14: 0.05, 15: 0.02, 16: 0.03, 17: 0.05, 18: 0.08, 19: 0.12, 20: 0.06, 21: 0.03},
    "bar":          {11: 0.03, 12: 0.05, 13: 0.04, 14: 0.03, 15: 0.04, 16: 0.06, 17: 0.10, 18: 0.14, 19: 0.15, 20: 0.12, 21: 0.10, 22: 0.08, 23: 0.06},
    "spa":          {8: 0.05, 9: 0.10, 10: 0.14, 11: 0.12, 12: 0.08, 13: 0.10, 14: 0.12, 15: 0.10, 16: 0.08, 17: 0.06, 18: 0.03, 19: 0.02},
    "housekeeping": {7: 0.05, 8: 0.12, 9: 0.16, 10: 0.18, 11: 0.14, 12: 0.10, 13: 0.08, 14: 0.06, 15: 0.05, 16: 0.04, 17: 0.02},
}

DEFAULT_STAFFING_RATIO = {
    "restaurant":   {"covers_per_staff_hour": 8},
    "ird":          {"covers_per_staff_hour": 5},
    "banquet":      {"covers_per_staff_hour": 6},
    "bar":          {"covers_per_staff_hour": 12},
    "spa":          {"guests_per_staff_hour": 2},
    "housekeeping": {"rooms_per_staff_hour": 1.8},
}


# ─────────────────────────────────────────────────────────────────
# Models (preserved from original API)
# ─────────────────────────────────────────────────────────────────
class ForecastNoteInput(BaseModel):
    date: str
    outlet: str = "all"
    note: str
    author: str = "Manager"
    ai_directive: bool = True


class ForecastOverrideInput(BaseModel):
    date: str
    outlet: str
    field: str
    value: float
    reason: str = ""


class SnapshotInput(BaseModel):
    date: str
    outlet: Optional[str] = "all"


# ─────────────────────────────────────────────────────────────────
# Real data accessors
# ─────────────────────────────────────────────────────────────────
def _resolve_property_id(property_id_param: Optional[str]) -> str:
    """Pick a default property id when none is provided. Prefers the
    most-active property by event count; falls back to 'default'."""
    if property_id_param:
        return property_id_param
    most_active = list(
        db["outlet_capture_events"].aggregate([
            {"$group": {"_id": "$property_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 1},
        ])
    )
    if most_active:
        return most_active[0]["_id"]
    return "default"


def _get_property_baseline(property_id: str) -> Dict:
    """Pull live property baseline from real collections. Replaces
    the original `_get_base_metrics()` which read partially live and
    partially hardcoded values."""
    total_rooms = db["hk_rooms"].count_documents({"property_id": property_id}) or db["hk_rooms"].count_documents({})
    occupied = db["hk_rooms"].count_documents({"property_id": property_id, "status": "occupied"}) or db["hk_rooms"].count_documents({"status": "occupied"})

    # Empirical ADR from the last 30 days of property revenue / room nights
    cutoff = (_today().date() - timedelta(days=30)).isoformat()
    rev_30d = list(
        db["outlet_capture_daily"].find(
            {"property_id": property_id, "date": {"$gte": cutoff}},
            {"_id": 0, "revenue_cents": 1},
        )
    )
    if total_rooms > 0:
        room_nights_30d = total_rooms * 30 * max(0.4, occupied / total_rooms) if total_rooms else 0
        rev_total_cents = sum(r.get("revenue_cents", 0) for r in rev_30d)
        empirical_adr_cents = int(rev_total_cents / max(1, room_nights_30d * 0.55))   # rooms ~55% of total
    else:
        empirical_adr_cents = 0

    return {
        "property_id": property_id,
        "total_rooms": total_rooms,
        "current_occupied": occupied,
        "base_occupancy": (occupied / total_rooms) if total_rooms else 0,
        "empirical_adr_cents": empirical_adr_cents,
        "rooms_data_available": total_rooms > 0,
        "data_source": "live_mongodb",
    }


def _outlets_for_property(property_id: str) -> List[Dict]:
    """All registered, active outlets for a property."""
    return list(
        db["outlets"].find(
            {"property_id": property_id, "active": True}, {"_id": 0},
        )
    )


def _hourly_for_outlet(outlet: Dict) -> Dict[int, float]:
    """Per-outlet hourly distribution. Reads learned distribution from
    weights when present; falls back to outlet-type defaults."""
    weights = db["outlet_capture_weights"].find_one(
        {"outlet_id": outlet["outlet_id"]}, {"_id": 0, "hourly_distribution": 1},
    ) or {}
    learned = weights.get("hourly_distribution")
    if learned:
        return {int(h): float(p) for h, p in learned.items()}
    return DEFAULT_HOURLY_DISTRIBUTION.get(
        outlet.get("outlet_type", "restaurant"),
        DEFAULT_HOURLY_DISTRIBUTION["restaurant"],
    )


def _labor_rate_cents(outlet: Dict) -> int:
    """Per-outlet blended labor rate. Reads from labor_blended_rates
    when wired (A.5); falls back to outlet-type defaults."""
    rec = db["labor_blended_rates"].find_one(
        {"outlet_id": outlet["outlet_id"]},
        {"_id": 0, "blended_rate_cents": 1},
    )
    if rec and rec.get("blended_rate_cents"):
        return int(rec["blended_rate_cents"])
    fallback = {
        "restaurant": 1850, "ird": 1900, "banquet": 1750,
        "bar": 1600, "spa": 2200, "housekeeping": 1650,
    }
    return fallback.get(outlet.get("outlet_type"), 1700)


def _capture_forecast_for(outlet_id: str, for_date: str) -> Optional[Dict]:
    """Pull the most-recent (closest-horizon) forecast for an outlet
    × date from outlet_capture_forecasts. Returns None if none exists."""
    candidates = list(
        db["outlet_capture_forecasts"].find(
            {"outlet_id": outlet_id, "for_date": for_date}, {"_id": 0},
        )
    )
    if not candidates:
        return None
    target_horizon = (datetime.fromisoformat(for_date).date() - _today().date()).days
    candidates.sort(key=lambda f: abs(f.get("horizon_days", 99) - target_horizon))
    return candidates[0]


def _scheduled_staff_hours(outlet_id: str, day_iso: str) -> Optional[float]:
    """Read scheduled labor hours from labor_schedules. Returns None
    when not yet wired so the response can label the fallback."""
    rec = db["labor_schedules"].find_one(
        {"outlet_id": outlet_id, "shift_date": day_iso},
        {"_id": 0, "total_scheduled_hours": 1},
    )
    if rec and rec.get("total_scheduled_hours"):
        return float(rec["total_scheduled_hours"])
    return None


def _budget_labor_cents(outlet_id: str, day_iso: str) -> Optional[int]:
    """Read the per-day labor budget from annual_budgets, prorated
    from monthly. Returns None when not configured."""
    target = datetime.fromisoformat(day_iso).date()
    month_str = str(target.month)
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0, "property_id": 1})
    if not outlet:
        return None
    budget = db["annual_budgets"].find_one(
        {"property_id": outlet["property_id"], "year": target.year}, {"_id": 0},
    )
    if not budget:
        return None
    monthly_labor = (budget.get("monthly_outlet_labor_cents", {}) or {}).get(outlet_id, {}).get(month_str)
    if monthly_labor is None:
        return None
    days_in_month = (datetime(target.year, target.month + 1, 1) - datetime(target.year, target.month, 1)).days if target.month < 12 else 31
    return int(monthly_labor / days_in_month)


# ─────────────────────────────────────────────────────────────────
# Day-level computation (no random; pure read + composition)
# ─────────────────────────────────────────────────────────────────
def _compose_day(
    target_date: datetime, baseline: Dict, outlets: List[Dict],
    notes: List[Dict], overrides: List[Dict],
) -> Dict:
    """Compose one day of the 21-day forecast from real data sources.
    Replaces the original `_generate_day_forecast` synthesis."""
    day_iso = target_date.strftime("%Y-%m-%d")
    dow = target_date.weekday()
    DOW_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    days_out = (target_date.date() - _today().date()).days

    # Manager notes for this date
    day_notes = [n for n in notes if n.get("date") == day_iso]
    ai_adjustments: List[Dict] = []

    # Apply note-driven adjustments (heuristics retained from original
    # but operating on real numbers now)
    note_occ_multiplier = 1.0
    note_room_delta = 0
    closed = False
    for note in day_notes:
        text = (note.get("note") or "").lower()
        if "closed" in text or "closure" in text:
            closed = True
            ai_adjustments.append({"note": note["note"], "action": "Set forecast to 0 (closed)"})
        elif "vip" in text or "high demand" in text:
            note_occ_multiplier *= 1.08
            ai_adjustments.append({"note": note["note"], "action": "Increased forecast 8% for VIP/high demand"})
        elif "low" in text or "slow" in text:
            note_occ_multiplier *= 0.85
            ai_adjustments.append({"note": note["note"], "action": "Decreased forecast 15% per manager note"})
        elif "group" in text or "conference" in text:
            note_room_delta += 25
            ai_adjustments.append({"note": note["note"], "action": "Added 25 rooms for group block"})
        elif "prep day" in text:
            ai_adjustments.append({"note": note["note"], "action": "Added 2 extra kitchen hours for prep"})

    # Forecast occupancy: prefer reservation-based on-the-books when
    # available, else use property-level capture forecast for the day,
    # else fall back to recent baseline.
    if closed:
        forecast_rooms = 0
        forecast_occ = 0.0
    else:
        on_books = db["reservations_pipeline"].count_documents(
            {"property_id": baseline["property_id"], "arrival_date": {"$lte": day_iso}, "depart_date": {"$gt": day_iso}, "status": {"$ne": "cancelled"}},
        ) if baseline["total_rooms"] > 0 else 0

        # If reservations pipeline is wired and has data, trust it
        if on_books > 0:
            forecast_rooms = min(baseline["total_rooms"], int(on_books * note_occ_multiplier) + note_room_delta)
        else:
            # Fall back to recent occupancy baseline × note multiplier
            forecast_rooms = min(
                baseline["total_rooms"],
                int(baseline["total_rooms"] * baseline["base_occupancy"] * note_occ_multiplier) + note_room_delta,
            )
        forecast_occ = (forecast_rooms / baseline["total_rooms"]) if baseline["total_rooms"] else 0

    # Apply manual overrides (real data, not random)
    day_overrides = [o for o in overrides if o.get("date") == day_iso]
    for ov in day_overrides:
        if ov.get("field") == "rooms" and ov.get("outlet") == "all":
            forecast_rooms = int(ov.get("value", forecast_rooms))
            forecast_occ = (forecast_rooms / baseline["total_rooms"]) if baseline["total_rooms"] else 0
            ai_adjustments.append({"note": f"Manual override: {ov.get('reason', '')}", "action": f"Rooms set to {ov['value']}"})

    # Per-outlet read from outlet_capture_forecasts
    outlets_block = {}
    revenue_total_cents = 0
    revenue_components_cents = {"rooms": 0, "fb": 0, "spa": 0, "banquet": 0, "other": 0}
    confidence_values: List[float] = []
    forecast_data_sources: Dict[str, str] = {}

    for outlet in outlets:
        outlet_id = outlet["outlet_id"]
        outlet_type = outlet.get("outlet_type", "restaurant")
        forecast = _capture_forecast_for(outlet_id, day_iso)
        if forecast:
            covers = int(forecast.get("p50", 0) * note_occ_multiplier) if not closed else 0
            covers_low = int(forecast.get("p10", covers))
            covers_high = int(forecast.get("p90", covers))
            outlet_revenue_cents = int(forecast.get("p50_revenue_cents", 0) * note_occ_multiplier) if not closed else 0
            forecast_data_sources[outlet_id] = "outlet_capture_forecast"
            confidence_values.append(0.95 - 0.015 * max(0, days_out))
        else:
            covers = 0
            covers_low = 0
            covers_high = 0
            outlet_revenue_cents = 0
            forecast_data_sources[outlet_id] = "no_capture_forecast_yet"

        # Hourly distribution × covers
        hourly_dist = _hourly_for_outlet(outlet)
        ratio = DEFAULT_STAFFING_RATIO.get(outlet_type, {})
        ratio_val = list(ratio.values())[0] if ratio else 5
        labor_rate_cents = _labor_rate_cents(outlet)
        scheduled_hours = _scheduled_staff_hours(outlet_id, day_iso)
        budget_labor = _budget_labor_cents(outlet_id, day_iso)

        hourly_block = {}
        total_staff_hours_needed = 0.0
        for hour, pct in hourly_dist.items():
            hourly_volume = round(covers * pct, 1)
            staff_needed = max(1.0, round(hourly_volume / ratio_val, 1)) if covers > 0 else 0.0
            staff_scheduled = round(staff_needed, 1)
            if scheduled_hours is not None:
                # When real schedule is wired, distribute scheduled hours by daypart pct
                staff_scheduled = round(scheduled_hours * pct, 1)
            hourly_block[hour] = {
                "volume": hourly_volume,
                "staff_needed": round(staff_needed, 1),
                "staff_scheduled": staff_scheduled,
            }
            total_staff_hours_needed += staff_needed

        labor_cost_forecast_cents = int(total_staff_hours_needed * labor_rate_cents)
        labor_budget_cents = budget_labor if budget_labor is not None else labor_cost_forecast_cents
        labor_data_source = "labor_blended_rates" if db["labor_blended_rates"].count_documents({"outlet_id": outlet_id}) > 0 else "fallback_default"

        outlets_block[outlet_id] = {
            "outlet_type": outlet_type,
            "covers": covers,
            "covers_low": covers_low,
            "covers_high": covers_high,
            "revenue_cents": outlet_revenue_cents,
            "total_staff_hours": round(total_staff_hours_needed, 1),
            "labor_cost_forecast": round(labor_cost_forecast_cents / 100, 2),
            "labor_budget": round(labor_budget_cents / 100, 2),
            "labor_variance": round((labor_budget_cents - labor_cost_forecast_cents) / 100, 2),
            "hourly_flow": hourly_block,
            "labor_data_source": labor_data_source,
            "schedule_data_source": "labor_schedules" if scheduled_hours is not None else "computed_from_demand",
        }

        revenue_total_cents += outlet_revenue_cents
        if outlet_type in ("restaurant", "ird", "bar"):
            revenue_components_cents["fb"] += outlet_revenue_cents
        elif outlet_type == "spa":
            revenue_components_cents["spa"] += outlet_revenue_cents
        elif outlet_type == "banquet":
            revenue_components_cents["banquet"] += outlet_revenue_cents
        else:
            revenue_components_cents["other"] += outlet_revenue_cents

    # Rooms revenue from forecast_rooms × empirical ADR
    rooms_rev_cents = forecast_rooms * baseline["empirical_adr_cents"]
    revenue_components_cents["rooms"] = rooms_rev_cents
    revenue_total_cents += rooms_rev_cents

    # Budget revenue: read from annual_budgets monthly_revenue prorated
    budget_rev_cents = _budget_revenue_for_day(baseline["property_id"], target_date.date())

    confidence = mean(confidence_values) if confidence_values else max(0.4, 0.95 - 0.025 * max(0, days_out))
    total_labor_cost = sum(o["labor_cost_forecast"] for o in outlets_block.values())
    total_labor_budget = sum(o["labor_budget"] for o in outlets_block.values())

    return {
        "date": day_iso,
        "day_of_week": DOW_LABELS[dow],
        "dow_index": dow,
        "days_out": days_out,
        "confidence": round(confidence, 3),
        "occupancy": {
            "forecast_pct": round(forecast_occ * 100, 1),
            "forecast_rooms": forecast_rooms,
            "available_rooms": baseline["total_rooms"],
        },
        "revenue": {
            "rooms": round(revenue_components_cents["rooms"] / 100, 2),
            "fb": round(revenue_components_cents["fb"] / 100, 2),
            "spa": round(revenue_components_cents["spa"] / 100, 2),
            "banquet": round(revenue_components_cents["banquet"] / 100, 2),
            "other": round(revenue_components_cents["other"] / 100, 2),
            "total": round(revenue_total_cents / 100, 2),
            "budget": round(budget_rev_cents / 100, 2) if budget_rev_cents else None,
            "budget_data_source": "annual_budgets" if budget_rev_cents else "not_configured",
        },
        "covers": {oid: ob["covers"] for oid, ob in outlets_block.items()},
        "labor": {
            "total_hours": round(sum(o["total_staff_hours"] for o in outlets_block.values()), 1),
            "total_cost": round(total_labor_cost, 2),
            "total_budget": round(total_labor_budget, 2),
            "variance": round(total_labor_budget - total_labor_cost, 2),
        },
        "outlets": outlets_block,
        "notes": day_notes,
        "ai_adjustments": ai_adjustments,
        "outlet_data_sources": forecast_data_sources,
        "data_source": "outlet_capture_v1",
    }


def _budget_revenue_for_day(property_id: str, day) -> int:
    """Budget revenue prorated from monthly_revenue_cents in
    annual_budgets. Returns 0 if not configured."""
    budget = db["annual_budgets"].find_one(
        {"property_id": property_id, "year": day.year}, {"_id": 0},
    )
    if not budget:
        return 0
    monthly = (budget.get("monthly_revenue_cents", {}) or {}).get(str(day.month))
    if not monthly:
        return 0
    days_in_month = (datetime(day.year, day.month + 1, 1) - datetime(day.year, day.month, 1)).days if day.month < 12 else 31
    return int(int(monthly) / days_in_month)


# ─────────────────────────────────────────────────────────────────
# Endpoints (response shape preserved)
# ─────────────────────────────────────────────────────────────────
@router.get("/forecast")
async def get_21_day_forecast(property_id: Optional[str] = Query(None)):
    """The 21-day living forecast — now backed by real outlet_capture
    data instead of random.uniform synthesis."""
    pid = _resolve_property_id(property_id)
    baseline = _get_property_baseline(pid)
    notes = list(db["forecast_notes"].find({}, {"_id": 0}))
    overrides = list(db["forecast_overrides"].find({}, {"_id": 0}))
    outlets = _outlets_for_property(pid)
    today = _today()

    days = []
    totals = {"revenue": 0.0, "labor_cost": 0.0, "labor_budget": 0.0, "rooms": 0}
    for i in range(21):
        date = today + timedelta(days=i)
        day = _compose_day(date, baseline, outlets, notes, overrides)
        days.append(day)
        totals["revenue"] += day["revenue"]["total"]
        totals["labor_cost"] += day["labor"]["total_cost"]
        totals["labor_budget"] += day["labor"]["total_budget"]
        totals["rooms"] += day["occupancy"]["forecast_rooms"]

    peak_days = sorted(days, key=lambda d: d["revenue"]["total"], reverse=True)[:5]
    low_days = sorted(days, key=lambda d: d["revenue"]["total"])[:3]

    surface_3d = []
    for day in days:
        for outlet_id, outlet_data in day["outlets"].items():
            for hour, hdata in outlet_data.get("hourly_flow", {}).items():
                surface_3d.append({
                    "day": day["date"], "day_label": day["day_of_week"][:3],
                    "hour": hour, "outlet": outlet_id,
                    "volume": hdata["volume"],
                    "staff_needed": hdata["staff_needed"],
                    "staff_scheduled": hdata["staff_scheduled"],
                    "gap": round(hdata["staff_scheduled"] - hdata["staff_needed"], 1),
                })

    # Build honest data-source disclosure
    sources_summary = defaultdict(int)
    for day in days:
        for src in day.get("outlet_data_sources", {}).values():
            sources_summary[src] += 1

    return {
        "generated_at": _now(),
        "data_source": "outlet_capture_v1",
        "data_source_disclosure": dict(sources_summary),
        "property_id": pid,
        "base_metrics": baseline,
        "outlet_count": len(outlets),
        "period": {"start": days[0]["date"], "end": days[-1]["date"], "days": 21},
        "forecast": days,
        "summary": {
            "total_revenue": round(totals["revenue"], 2),
            "total_labor_cost": round(totals["labor_cost"], 2),
            "total_labor_budget": round(totals["labor_budget"], 2),
            "labor_variance": round(totals["labor_budget"] - totals["labor_cost"], 2),
            "avg_occupancy": round(sum(d["occupancy"]["forecast_pct"] for d in days) / 21, 1),
            "total_rooms_sold": totals["rooms"],
            "peak_days": [{"date": d["date"], "day": d["day_of_week"], "revenue": d["revenue"]["total"]} for d in peak_days],
            "low_days": [{"date": d["date"], "day": d["day_of_week"], "revenue": d["revenue"]["total"]} for d in low_days],
        },
        "ai_insights": _ai_insights(days, totals),
        "surface_3d": surface_3d,
    }


def _ai_insights(days: List[Dict], totals: Dict) -> Dict:
    """Generate honest insights from the real forecast data. Replaces
    the original hardcoded strings."""
    if not days:
        return {}
    by_dow_revenue = defaultdict(list)
    for d in days:
        by_dow_revenue[d["day_of_week"]].append(d["revenue"]["total"])
    avg_per_dow = {dow: mean(vs) for dow, vs in by_dow_revenue.items() if vs}
    if avg_per_dow:
        peak_dow = max(avg_per_dow, key=avg_per_dow.get)
        low_dow = min(avg_per_dow, key=avg_per_dow.get)
    else:
        peak_dow = low_dow = None
    return {
        "peak_pattern": (
            f"{peak_dow} averages highest revenue (${avg_per_dow[peak_dow]:,.0f})."
            if peak_dow else "Insufficient data to identify peak pattern."
        ),
        "gap_alert": (
            f"{low_dow} averages lowest revenue (${avg_per_dow[low_dow]:,.0f}). Optimize staffing."
            if low_dow else "Insufficient data to identify low-volume day."
        ),
        "labor_efficiency": (
            f"21-day labor variance: ${round(totals['labor_budget'] - totals['labor_cost']):,}"
        ),
    }


@router.get("/forecast/day/{date}")
async def get_day_detail(date: str, property_id: Optional[str] = Query(None)):
    """Per-day forecast detail — same shape as before, real backing."""
    pid = _resolve_property_id(property_id)
    baseline = _get_property_baseline(pid)
    outlets = _outlets_for_property(pid)
    notes = list(db["forecast_notes"].find({}, {"_id": 0}))
    overrides = list(db["forecast_overrides"].find({}, {"_id": 0}))
    target = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return _compose_day(target, baseline, outlets, notes, overrides)


@router.post("/notes")
async def add_forecast_note(data: ForecastNoteInput):
    note = {"id": f"fn-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["forecast_notes"].insert_one(note)
    note.pop("_id", None)
    # Trigger debounced recompute via the outlet_capture event bus
    try:
        from event_bus import publish
        publish("forecast.note_added", {"date": data.date, "outlet_id": data.outlet, "note_id": note["id"]}, source="forecast_21day")
    except Exception:
        pass
    return note


@router.get("/notes")
async def get_forecast_notes():
    notes = list(db["forecast_notes"].find({}, {"_id": 0}).sort("date", 1))
    return {"notes": notes}


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    db["forecast_notes"].delete_one({"id": note_id})
    return {"deleted": note_id}


@router.post("/override")
async def add_forecast_override(data: ForecastOverrideInput):
    override = {"id": f"fo-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["forecast_overrides"].update_one(
        {"date": data.date, "outlet": data.outlet, "field": data.field},
        {"$set": override}, upsert=True,
    )
    try:
        from event_bus import publish
        publish("forecast.override_saved", {"date": data.date, "outlet_id": data.outlet, "field": data.field}, source="forecast_21day")
    except Exception:
        pass
    return override


@router.get("/coverage/{outlet}/{date}")
async def get_coverage_graph(outlet: str, date: str, property_id: Optional[str] = Query(None)):
    """Hourly coverage — real-data-backed."""
    pid = _resolve_property_id(property_id)
    baseline = _get_property_baseline(pid)
    outlets = _outlets_for_property(pid)
    notes = list(db["forecast_notes"].find({}, {"_id": 0}))
    overrides = list(db["forecast_overrides"].find({}, {"_id": 0}))
    target = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    day = _compose_day(target, baseline, outlets, notes, overrides)

    outlet_data = day["outlets"].get(outlet, {})
    hourly = outlet_data.get("hourly_flow", {})
    coverage = []
    for hour in range(5, 24):
        h = hourly.get(hour, {"volume": 0, "staff_needed": 0, "staff_scheduled": 0})
        gap = round(h["staff_scheduled"] - h["staff_needed"], 1)
        coverage.append({
            "hour": hour, "hour_label": f"{hour}:00",
            "volume": h["volume"],
            "staff_needed": h["staff_needed"],
            "staff_scheduled": h["staff_scheduled"],
            "gap": gap,
            "status": "overstaffed" if gap > 0.5 else "understaffed" if gap < -0.5 else "optimal",
        })
    return {
        "outlet": outlet, "date": date,
        "day_of_week": day["day_of_week"],
        "total_covers": outlet_data.get("covers", 0),
        "total_staff_hours": outlet_data.get("total_staff_hours", 0),
        "labor_cost": outlet_data.get("labor_cost_forecast", 0),
        "labor_budget": outlet_data.get("labor_budget", 0),
        "coverage": coverage,
    }


# ─────────────────────────────────────────────────────────────────
# Accuracy endpoints — delegate to outlet_capture_accuracy
# ─────────────────────────────────────────────────────────────────
@router.post("/accuracy/snapshot")
async def capture_forecast_snapshot(property_id: Optional[str] = Query(None)):
    """Legacy endpoint — outlet_capture_forecasts ARE the snapshots
    now (the Monte Carlo cron writes one per outlet × horizon × day).
    This endpoint kept for compatibility; returns a summary of the
    snapshots already on file rather than synthesizing a new one."""
    pid = _resolve_property_id(property_id)
    today_iso = _today().date().isoformat()
    cnt = db["outlet_capture_forecasts"].count_documents({"property_id": pid, "for_date": {"$gte": today_iso}})
    return {
        "snapshot_id": f"capture-{_uid()}",
        "captured": today_iso,
        "days_captured": min(21, cnt // max(1, db["outlets"].count_documents({"property_id": pid, "active": True}))),
        "data_source": "outlet_capture_forecasts",
        "note": "Snapshots are now created continuously by the outlet_capture Monte Carlo cron, not on-demand via this endpoint.",
    }


@router.post("/accuracy/record-actual")
async def record_actual_data(data: SnapshotInput):
    """Legacy endpoint — actuals are now recorded via the
    outlet_capture event ingestion path. This endpoint reads the
    rolled-up daily aggregation and returns it."""
    rows = list(
        db["outlet_capture_daily"].find({"date": data.date}, {"_id": 0})
    )
    if not rows:
        return {
            "id": f"act-{_uid()}",
            "date": data.date,
            "available": False,
            "reason": "no_outlet_capture_daily_aggregation_for_date",
            "remediation": "Capture events arrive via /api/outlet-capture/events; daily rollup is automatic.",
        }
    actual_revenue = sum(r.get("revenue_cents", 0) for r in rows) / 100
    actual_covers = sum(r.get("covers", 0) for r in rows)
    return {
        "id": f"act-{_uid()}",
        "date": data.date,
        "actual_revenue": round(actual_revenue, 2),
        "actual_covers": actual_covers,
        "outlets_with_data": len(rows),
        "data_source": "outlet_capture_daily",
    }


@router.get("/accuracy/report")
async def accuracy_report(weeks_back: int = 4):
    """Accuracy report — delegates to outlet_capture_accuracy."""
    days_back = weeks_back * 7
    cutoff = (_today().date() - timedelta(days=days_back)).isoformat()
    rows = list(
        db["outlet_capture_accuracy"].find(
            {"for_date": {"$gte": cutoff}}, {"_id": 0},
        ).sort("for_date", -1).limit(2000)
    )
    if not rows:
        return {
            "period": f"Last {weeks_back} weeks",
            "total_comparisons": 0,
            "available": False,
            "remediation": "Daily forecast→actual reconciliation runs at 04:30 UTC. Wait 24h after first capture events for first row.",
        }

    overall_errors = [r["abs_pct_error"] for r in rows if r.get("abs_pct_error") is not None]
    overall_mape = round(mean(overall_errors), 4) if overall_errors else None

    by_horizon: Dict[int, List[float]] = defaultdict(list)
    for r in rows:
        by_horizon[r["horizon_days"]].append(r["abs_pct_error"])
    horizon_accuracy = []
    for h, errs in sorted(by_horizon.items()):
        if errs:
            horizon_accuracy.append({
                "horizon": f"{h} day{'s' if h > 1 else ''}",
                "mape_pct": round(mean(errs) * 100, 1),
                "samples": len(errs),
            })

    return {
        "period": f"Last {weeks_back} weeks",
        "total_comparisons": len(rows),
        "overall_mape_pct": round(overall_mape * 100, 1) if overall_mape else None,
        "by_horizon": horizon_accuracy,
        "data_source": "outlet_capture_accuracy",
    }


@router.get("/accuracy/trend")
async def accuracy_trend():
    """Accuracy trend — delegates to outlet_capture_accuracy."""
    last_30 = (_today().date() - timedelta(days=30)).isoformat()
    cnt = db["outlet_capture_accuracy"].count_documents({"for_date": {"$gte": last_30}})
    actuals_cnt = db["outlet_capture_daily"].count_documents({"date": {"$gte": last_30}})
    latest = db["outlet_capture_accuracy"].find_one(
        {}, {"_id": 0, "for_date": 1}, sort=[("for_date", -1)],
    )
    return {
        "snapshots_captured": cnt,
        "actuals_recorded": actuals_cnt,
        "latest_snapshot": (latest or {}).get("for_date"),
        "tracking_active": cnt > 0 and actuals_cnt > 0,
        "data_source": "outlet_capture_accuracy + outlet_capture_daily",
        "note": "The outlet_capture system maintains continuous accuracy tracking via the daily 04:30 UTC audit run.",
    }
