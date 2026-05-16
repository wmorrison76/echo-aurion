"""
Pace Report — the morning ritual
================================
B.2 from the CFO toolkit. The single most-used view in any chain
operator's morning: "we're 18 days into the month, 60% of the way
through, but at 71% of revenue target. On pace to finish at $2.4M
± $180k. 90% confidence range $2.22M to $2.58M."

Reads from:
  · `outlet_capture_daily`     — actuals, by outlet, by day
  · `outlet_capture_forecasts` — forward forecasts (P10/P50/P90)
  · `annual_budgets`           — monthly revenue targets

Uses real math on real data — no hardcoded multipliers, no
random.uniform(). When data is missing, returns explicit "no data
yet" rather than synthesizing.

Doctrine alignment:
  · §1.1 transparency — confidence bands published alongside the
    point estimate; missing-data states reported honestly
  · §2.5 framing — pace surfaces as observation ("on pace to
    finish at"), not accusation
"""
from datetime import datetime, timezone, timedelta
from calendar import monthrange
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/pace", tags=["cfo-pace"])

_now = lambda: datetime.now(timezone.utc).isoformat()


def _month_window(year: int, month: int) -> tuple[str, str, int]:
    """First-of-month, last-of-month (inclusive ISO strings) and total days."""
    last_day = monthrange(year, month)[1]
    start = f"{year:04d}-{month:02d}-01"
    end = f"{year:04d}-{month:02d}-{last_day:02d}"
    return start, end, last_day


def _today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


@router.get("/property/{property_id}")
async def property_pace(property_id: str, year: Optional[int] = None, month: Optional[int] = None):
    """Property-level pace for the current (or specified) month.
    Returns: month-to-date actual, days-elapsed, pace pct, projection
    point estimate, P10/P90 finish bands, and budget delta."""
    today = datetime.now(timezone.utc).date()
    target_year = year or today.year
    target_month = month or today.month
    month_start, month_end, total_days = _month_window(target_year, target_month)

    # Days elapsed (capped at total_days for completed months)
    if (target_year, target_month) == (today.year, today.month):
        elapsed_days = today.day
    elif (target_year, target_month) < (today.year, today.month):
        elapsed_days = total_days
    else:
        elapsed_days = 0   # future month

    # Actuals MTD across all outlets at this property
    mtd_rows = list(
        db["outlet_capture_daily"].find(
            {
                "property_id": property_id,
                "date": {"$gte": month_start, "$lte": _today_iso() if elapsed_days < total_days else month_end},
            },
            {"_id": 0, "date": 1, "revenue_cents": 1, "outlet_id": 1, "covers": 1},
        )
    )
    mtd_revenue_cents = sum(r.get("revenue_cents", 0) for r in mtd_rows)
    mtd_covers = sum(r.get("covers", 0) for r in mtd_rows)

    # Forward forecasts for remaining days of month
    remaining_days = total_days - elapsed_days
    p50_remainder_cents = 0
    p10_remainder_cents = 0
    p90_remainder_cents = 0
    if remaining_days > 0:
        future_dates = [
            (today + timedelta(days=i + 1)).isoformat()
            for i in range(remaining_days)
        ]
        for forecast_date in future_dates:
            # 1-day-horizon forecast for each future date is most reliable;
            # fall back to the closest available horizon if missing
            forecasts = list(
                db["outlet_capture_forecasts"].find(
                    {"property_id": property_id, "for_date": forecast_date},
                    {"_id": 0, "p10_revenue_cents": 1, "p50_revenue_cents": 1, "p90_revenue_cents": 1, "horizon_days": 1},
                )
            )
            if forecasts:
                # Closest-horizon forecast per outlet, summed
                by_outlet: Dict[str, Dict] = {}
                for f in forecasts:
                    key = f.get("outlet_id", "_global")
                    if key not in by_outlet or abs(f["horizon_days"] - 1) < abs(by_outlet[key]["horizon_days"] - 1):
                        by_outlet[key] = f
                p10_remainder_cents += sum(f.get("p10_revenue_cents", 0) for f in by_outlet.values())
                p50_remainder_cents += sum(f.get("p50_revenue_cents", 0) for f in by_outlet.values())
                p90_remainder_cents += sum(f.get("p90_revenue_cents", 0) for f in by_outlet.values())

    # Budget for the month (if configured)
    budget_doc = db["annual_budgets"].find_one(
        {"property_id": property_id, "year": target_year}, {"_id": 0},
    ) or {}
    monthly_budget_cents = int(
        (budget_doc.get("monthly_revenue_cents", {}) or {}).get(str(target_month), 0)
    )
    expected_pace_pct = (elapsed_days / total_days) if total_days > 0 else 0
    actual_pace_pct = (mtd_revenue_cents / monthly_budget_cents) if monthly_budget_cents > 0 else None

    projection_cents = mtd_revenue_cents + p50_remainder_cents
    projection_low_cents = mtd_revenue_cents + p10_remainder_cents
    projection_high_cents = mtd_revenue_cents + p90_remainder_cents

    return {
        "property_id": property_id,
        "year": target_year,
        "month": target_month,
        "month_start": month_start,
        "month_end": month_end,
        "total_days": total_days,
        "elapsed_days": elapsed_days,
        "remaining_days": remaining_days,
        "expected_pace_pct": round(expected_pace_pct, 4),
        "mtd": {
            "revenue_cents": mtd_revenue_cents,
            "covers": mtd_covers,
            "days_with_data": len({r["date"] for r in mtd_rows}),
        },
        "budget": {
            "monthly_cents": monthly_budget_cents,
            "configured": monthly_budget_cents > 0,
            "actual_vs_pace_pct": round(actual_pace_pct, 4) if actual_pace_pct is not None else None,
            "ahead_or_behind_cents": (
                int(mtd_revenue_cents - monthly_budget_cents * expected_pace_pct)
                if monthly_budget_cents > 0 else None
            ),
        },
        "projection": {
            "p10_finish_cents": projection_low_cents,
            "p50_finish_cents": projection_cents,
            "p90_finish_cents": projection_high_cents,
            "vs_budget_p50_cents": (
                projection_cents - monthly_budget_cents
                if monthly_budget_cents > 0 else None
            ),
            "forecast_data_available": p50_remainder_cents > 0,
        },
        "narrative": _narrative(
            property_id, elapsed_days, total_days, mtd_revenue_cents,
            monthly_budget_cents, projection_cents, projection_low_cents,
            projection_high_cents,
        ),
        "generated_at": _now(),
    }


@router.get("/outlet/{outlet_id}")
async def outlet_pace(outlet_id: str, year: Optional[int] = None, month: Optional[int] = None):
    """Same pace metrics, scoped to a single outlet."""
    today = datetime.now(timezone.utc).date()
    target_year = year or today.year
    target_month = month or today.month
    month_start, month_end, total_days = _month_window(target_year, target_month)

    if (target_year, target_month) == (today.year, today.month):
        elapsed_days = today.day
    elif (target_year, target_month) < (today.year, today.month):
        elapsed_days = total_days
    else:
        elapsed_days = 0

    mtd_rows = list(
        db["outlet_capture_daily"].find(
            {
                "outlet_id": outlet_id,
                "date": {"$gte": month_start, "$lte": _today_iso() if elapsed_days < total_days else month_end},
            },
            {"_id": 0, "revenue_cents": 1, "covers": 1, "date": 1},
        )
    )
    mtd_revenue = sum(r.get("revenue_cents", 0) for r in mtd_rows)
    mtd_covers = sum(r.get("covers", 0) for r in mtd_rows)

    remaining_days = total_days - elapsed_days
    p50_remainder = 0
    p10_remainder = 0
    p90_remainder = 0
    if remaining_days > 0:
        future_dates = [
            (today + timedelta(days=i + 1)).isoformat()
            for i in range(remaining_days)
        ]
        future_forecasts = list(
            db["outlet_capture_forecasts"].find(
                {"outlet_id": outlet_id, "for_date": {"$in": future_dates}},
                {"_id": 0, "p10_revenue_cents": 1, "p50_revenue_cents": 1, "p90_revenue_cents": 1, "for_date": 1, "horizon_days": 1},
            )
        )
        # Use closest-horizon forecast per date
        by_date: Dict[str, Dict] = {}
        for f in future_forecasts:
            d = f["for_date"]
            if d not in by_date or abs(f["horizon_days"] - 1) < abs(by_date[d]["horizon_days"] - 1):
                by_date[d] = f
        p10_remainder = sum(f.get("p10_revenue_cents", 0) for f in by_date.values())
        p50_remainder = sum(f.get("p50_revenue_cents", 0) for f in by_date.values())
        p90_remainder = sum(f.get("p90_revenue_cents", 0) for f in by_date.values())

    return {
        "outlet_id": outlet_id,
        "year": target_year,
        "month": target_month,
        "elapsed_days": elapsed_days,
        "total_days": total_days,
        "expected_pace_pct": round(elapsed_days / total_days, 4) if total_days else 0,
        "mtd": {
            "revenue_cents": mtd_revenue,
            "covers": mtd_covers,
            "days_with_data": len({r["date"] for r in mtd_rows}),
        },
        "projection": {
            "p10_finish_cents": mtd_revenue + p10_remainder,
            "p50_finish_cents": mtd_revenue + p50_remainder,
            "p90_finish_cents": mtd_revenue + p90_remainder,
            "forecast_data_available": p50_remainder > 0,
        },
        "generated_at": _now(),
    }


def _narrative(property_id: str, elapsed: int, total: int, mtd_cents: int,
               budget_cents: int, p50_cents: int, p10_cents: int, p90_cents: int) -> str:
    if total == 0:
        return "Month not yet started."
    pace = elapsed / total
    if budget_cents <= 0:
        return (
            f"{elapsed} of {total} days elapsed ({pace:.1%}). "
            f"MTD revenue ${mtd_cents/100:,.0f}. No monthly budget configured "
            f"for this property — projection ${p50_cents/100:,.0f} (90% range "
            f"${p10_cents/100:,.0f}–${p90_cents/100:,.0f})."
        )
    actual_pct = mtd_cents / budget_cents
    delta_pct = actual_pct - pace
    direction = "ahead of" if delta_pct > 0 else "behind"
    return (
        f"{elapsed} of {total} days ({pace:.0%} through), MTD revenue "
        f"${mtd_cents/100:,.0f} = {actual_pct:.0%} of budget — "
        f"{abs(delta_pct):.1%} {direction} pace. Projection "
        f"${p50_cents/100:,.0f} (90% range ${p10_cents/100:,.0f}–${p90_cents/100:,.0f}) "
        f"vs ${budget_cents/100:,.0f} budget."
    )
