"""
Labor Productivity Drilldown
============================
B.8 from the CFO toolkit. Covers per labor hour, sales per labor hour,
broken out by daypart × outlet × position. Where staffing is wrong.
Likely 8–15% labor-cost reduction opportunity in any property running
on instinct.

Reads from:
  · `labor_actuals`             — hours worked per shift
  · `labor_schedules`           — scheduled hours
  · `outlet_capture_daily`      — covers and revenue per outlet per day
  · `pos_checks`                — daypart-level granularity (when wired)
  · `outlets`                   — outlet metadata

Real math: hours-by-bucket aggregation, productivity ratios, per-bucket
benchmarks. When daypart-level POS check timestamps aren't available,
the endpoint falls back to outlet-day level and reports the
precision degradation.
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/labor-productivity", tags=["cfo-labor-productivity"])

_now = lambda: datetime.now(timezone.utc).isoformat()


DAYPART_DEFINITION = [
    ("breakfast", 6, 11),
    ("lunch", 11, 15),
    ("afternoon", 15, 17),
    ("dinner", 17, 22),
    ("late_night", 22, 26),
]


def _daypart_for_hour(hour: int) -> str:
    for label, start, end in DAYPART_DEFINITION:
        if start <= hour < end:
            return label
    return "overnight"


@router.get("/outlet/{outlet_id}")
async def outlet_productivity(outlet_id: str, lookback_days: int = Query(30, ge=7, le=180)):
    """Productivity for a single outlet, broken out by daypart × position."""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, f"Outlet {outlet_id} not registered")

    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()

    # Try POS-check-level granularity first; fall back to outlet daily
    pos_checks = list(
        db["pos_checks"].find(
            {"outlet_id": outlet_id, "closed_at": {"$gte": cutoff}},
            {"_id": 0, "closed_at": 1, "subtotal_cents": 1, "covers": 1, "daypart": 1},
        ).limit(50000)
    )
    daypart_resolution_available = bool(pos_checks)

    labor_rows = list(
        db["labor_actuals"].find(
            {"outlet_id": outlet_id, "shift_date": {"$gte": cutoff}},
            {"_id": 0, "employee_id": 1, "shift_date": 1, "hours_worked": 1, "role": 1, "position": 1, "daypart": 1, "wage_rate_cents": 1},
        )
    )
    if not labor_rows:
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "no_labor_actuals_in_window",
            "lookback_days": lookback_days,
            "generated_at": _now(),
        }

    # Aggregation buckets keyed by (daypart, position)
    buckets: Dict[tuple, Dict] = {}

    if daypart_resolution_available:
        # Allocate POS revenue/covers to dayparts
        for chk in pos_checks:
            try:
                hour = datetime.fromisoformat(chk["closed_at"].replace("Z", "+00:00")).hour
            except Exception:
                continue
            dp = chk.get("daypart") or _daypart_for_hour(hour)
            key = (dp, "_revenue_total")            # cross-cuts position
            entry = buckets.setdefault(key, {"daypart": dp, "position": "_total", "revenue_cents": 0, "covers": 0, "labor_hours": 0, "labor_cost_cents": 0})
            entry["revenue_cents"] += chk.get("subtotal_cents", 0)
            entry["covers"] += chk.get("covers", 0)
        for lr in labor_rows:
            dp = lr.get("daypart") or "all_day"
            position = lr.get("position") or lr.get("role") or "unknown"
            key = (dp, position)
            entry = buckets.setdefault(key, {"daypart": dp, "position": position, "revenue_cents": 0, "covers": 0, "labor_hours": 0, "labor_cost_cents": 0})
            entry["labor_hours"] += lr.get("hours_worked", 0)
            wage = lr.get("wage_rate_cents", 0)
            entry["labor_cost_cents"] += int(wage * lr.get("hours_worked", 0))
    else:
        # Fall back to outlet-day rollup; daypart axis becomes "all_day"
        daily_rows = list(
            db["outlet_capture_daily"].find(
                {"outlet_id": outlet_id, "date": {"$gte": cutoff}},
                {"_id": 0, "date": 1, "revenue_cents": 1, "covers": 1},
            )
        )
        revenue_total = sum(r.get("revenue_cents", 0) for r in daily_rows)
        covers_total = sum(r.get("covers", 0) for r in daily_rows)
        buckets[("all_day", "_total")] = {
            "daypart": "all_day",
            "position": "_total",
            "revenue_cents": revenue_total,
            "covers": covers_total,
            "labor_hours": 0,
            "labor_cost_cents": 0,
        }
        for lr in labor_rows:
            position = lr.get("position") or lr.get("role") or "unknown"
            key = ("all_day", position)
            entry = buckets.setdefault(key, {"daypart": "all_day", "position": position, "revenue_cents": 0, "covers": 0, "labor_hours": 0, "labor_cost_cents": 0})
            entry["labor_hours"] += lr.get("hours_worked", 0)
            wage = lr.get("wage_rate_cents", 0)
            entry["labor_cost_cents"] += int(wage * lr.get("hours_worked", 0))

    # Compute productivity ratios — totals are at (daypart, "_total")
    rows: List[Dict] = []
    for (dp, position), entry in buckets.items():
        if position == "_total":
            continue
        # Find revenue/covers for this daypart
        total_for_dp = buckets.get((dp, "_total")) or {"revenue_cents": 0, "covers": 0}
        labor_hours = entry["labor_hours"]
        revenue_cents = total_for_dp["revenue_cents"]
        covers = total_for_dp["covers"]
        rows.append({
            "daypart": dp,
            "position": position,
            "labor_hours": round(labor_hours, 2),
            "labor_cost_cents": entry["labor_cost_cents"],
            "revenue_cents_in_daypart": revenue_cents,
            "covers_in_daypart": covers,
            "covers_per_labor_hour": round(covers / labor_hours, 3) if labor_hours > 0 else None,
            "revenue_cents_per_labor_hour": round(revenue_cents / labor_hours, 2) if labor_hours > 0 else None,
            "labor_cost_pct_of_revenue": round(entry["labor_cost_cents"] / revenue_cents, 4) if revenue_cents > 0 else None,
        })

    rows.sort(key=lambda r: (-(r.get("revenue_cents_per_labor_hour") or 0)))

    return {
        "outlet_id": outlet_id,
        "outlet_name": outlet.get("name"),
        "lookback_days": lookback_days,
        "available": True,
        "daypart_resolution_available": daypart_resolution_available,
        "fallback_reason": None if daypart_resolution_available else "no_pos_checks_with_timestamps_so_aggregating_at_outlet_day_level",
        "rows": rows,
        "summary": _outlet_summary(rows),
        "narrative": _outlet_narrative(outlet, rows, daypart_resolution_available),
        "generated_at": _now(),
    }


@router.get("/property/{property_id}")
async def property_productivity(property_id: str, lookback_days: int = Query(30, ge=7, le=180)):
    """Property-level rollup. Compares productivity across outlets and
    flags those with labor cost % of revenue > 35% (industry red line)."""
    outlets = list(db["outlets"].find({"property_id": property_id, "active": True}, {"_id": 0, "outlet_id": 1, "name": 1}))
    summaries = []
    for outlet in outlets:
        try:
            result = await outlet_productivity(outlet["outlet_id"], lookback_days)
        except HTTPException:
            continue
        if not result.get("available"):
            continue
        s = result.get("summary", {})
        summaries.append({
            "outlet_id": outlet["outlet_id"],
            "outlet_name": outlet.get("name"),
            **s,
        })
    summaries.sort(key=lambda s: -(s.get("revenue_per_labor_hour_cents") or 0))
    flags = [s for s in summaries if (s.get("labor_cost_pct_revenue") or 0) > 0.35]
    return {
        "property_id": property_id,
        "outlets_analyzed": len(summaries),
        "outlets": summaries,
        "high_labor_cost_flags": flags,
        "lookback_days": lookback_days,
        "generated_at": _now(),
    }


def _outlet_summary(rows: List[Dict]) -> Dict:
    if not rows:
        return {}
    total_hours = sum(r["labor_hours"] for r in rows)
    total_cost = sum(r["labor_cost_cents"] for r in rows)
    # Revenue is duplicated across positions in a daypart; dedupe by (daypart)
    by_dp_rev = {}
    for r in rows:
        by_dp_rev[r["daypart"]] = r["revenue_cents_in_daypart"]
    total_rev = sum(by_dp_rev.values())
    return {
        "total_labor_hours": round(total_hours, 2),
        "total_labor_cost_cents": total_cost,
        "total_revenue_cents": total_rev,
        "revenue_per_labor_hour_cents": round(total_rev / total_hours, 2) if total_hours > 0 else None,
        "labor_cost_pct_revenue": round(total_cost / total_rev, 4) if total_rev > 0 else None,
    }


def _outlet_narrative(outlet: Dict, rows: List[Dict], dp_resolution: bool) -> str:
    name = outlet.get("name", outlet["outlet_id"])
    if not rows:
        return f"{name}: no productivity rows."
    summary = _outlet_summary(rows)
    parts = [
        f"{name}: ${summary['total_revenue_cents']/100:,.0f} revenue / "
        f"{summary['total_labor_hours']:.0f} labor hours = "
        f"${(summary.get('revenue_per_labor_hour_cents') or 0)/100:,.2f}/hr."
    ]
    pct = summary.get("labor_cost_pct_revenue")
    if pct is not None:
        if pct > 0.40:
            parts.append(f"Labor cost {pct:.0%} of revenue is well above industry threshold (35%) — investigate.")
        elif pct > 0.35:
            parts.append(f"Labor cost {pct:.0%} of revenue — at the industry threshold (35%).")
    if not dp_resolution:
        parts.append("Note: daypart breakdown unavailable — POS check timestamps not yet wired. Aggregating at outlet-day level.")
    return " ".join(parts)
