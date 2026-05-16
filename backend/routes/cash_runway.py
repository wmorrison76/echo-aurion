"""
Cash Burn + Runway
==================
B.12 from the CFO toolkit. Daily cash burn computation + months-of-
runway estimation. Critical for any property in early-stage,
ramp-up, or refinancing — the metric that forces hard conversations
early rather than late.

Reads from:
  · `cash_balances`             — daily cash position snapshots
  · `aurum_gl_journal`          — journal entries for inflows/outflows
  · `outlet_capture_daily`      — revenue inflows
  · `ap_aging`                  — accounts payable obligations

Real math, no synthesis. If cash data is missing the endpoint says
so honestly rather than producing a fictitious runway.

Doctrine alignment:
  · §1.1 transparency — runway uncertainty bands published, not a
    single point estimate that creates false confidence
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median, stdev
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/cash-runway", tags=["cfo-cash-runway"])

_now = lambda: datetime.now(timezone.utc).isoformat()


def _ensure_indexes():
    db["cash_balances"].create_index([("property_id", 1), ("date", 1)], unique=True)


try:
    _ensure_indexes()
except Exception:
    pass


@router.get("/{property_id}")
async def cash_runway(property_id: str, lookback_days: int = Query(30, ge=7, le=365)):
    """Daily cash burn + months-of-runway calculator.

    Method:
      1. Read the most recent N days of cash balance snapshots.
      2. Compute net daily change (inflows - outflows).
      3. Use median, mean, and 25th-percentile burn (worst case
         within the lookback) to produce three runway estimates.
      4. Surface trailing 7-day vs trailing 30-day burn so the
         operator sees acceleration / deceleration."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    snapshots = list(
        db["cash_balances"].find(
            {"property_id": property_id, "date": {"$gte": cutoff}},
            {"_id": 0},
        ).sort("date", 1)
    )
    if len(snapshots) < 2:
        return {
            "property_id": property_id,
            "available": False,
            "reason": "insufficient_cash_balance_history",
            "snapshots_found": len(snapshots),
            "lookback_days": lookback_days,
            "remediation": (
                "No cash_balances entries for this property over the lookback window. "
                "Wire the daily cash close to insert a row per day with "
                "{property_id, date, cash_cents, restricted_cents, total_cents}."
            ),
            "generated_at": _now(),
        }

    # Daily deltas (negative = burning cash)
    deltas: List[Dict] = []
    for prev, curr in zip(snapshots, snapshots[1:]):
        delta = curr.get("total_cents", 0) - prev.get("total_cents", 0)
        deltas.append({
            "date": curr["date"],
            "delta_cents": delta,
            "ending_balance_cents": curr.get("total_cents", 0),
        })

    burns_only = [-d["delta_cents"] for d in deltas]   # positive = burn
    median_burn = median(burns_only) if burns_only else 0
    mean_burn = mean(burns_only) if burns_only else 0
    # 75th percentile burn = worst 25% scenario for runway
    sorted_burns = sorted(burns_only)
    p75_idx = int(len(sorted_burns) * 0.75)
    p75_burn = sorted_burns[p75_idx] if sorted_burns else 0

    # Trailing 7-day vs trailing 30-day (or full lookback) burn
    trailing_7 = burns_only[-7:] if len(burns_only) >= 7 else burns_only
    trailing_30 = burns_only[-30:] if len(burns_only) >= 30 else burns_only
    burn_7d = mean(trailing_7) if trailing_7 else 0
    burn_30d = mean(trailing_30) if trailing_30 else 0

    current_cash = snapshots[-1].get("total_cents", 0)
    restricted = snapshots[-1].get("restricted_cents", 0)
    available_cash = current_cash - restricted

    def runway_months(daily_burn: float) -> Optional[float]:
        if daily_burn <= 0:
            return None    # not burning — runway is infinite (or growing)
        return round((available_cash / daily_burn) / 30, 2)

    # Burn-rate trend: comparing 7d vs 30d
    if burn_30d > 0:
        burn_acceleration_pct = (burn_7d - burn_30d) / burn_30d
    else:
        burn_acceleration_pct = 0

    # Largest 5 outflow days for forensic context
    largest_outflows = sorted(deltas, key=lambda d: d["delta_cents"])[:5]

    return {
        "property_id": property_id,
        "available": True,
        "lookback_days": lookback_days,
        "current_cash": {
            "total_cents": current_cash,
            "restricted_cents": restricted,
            "available_cents": available_cash,
            "as_of_date": snapshots[-1]["date"],
        },
        "daily_burn_cents": {
            "median": int(median_burn),
            "mean": int(mean_burn),
            "p75_worst_quartile": int(p75_burn),
            "trailing_7d_avg": int(burn_7d),
            "trailing_30d_avg": int(burn_30d),
            "acceleration_pct": round(burn_acceleration_pct, 4),
        },
        "runway_months": {
            "median_burn": runway_months(median_burn),
            "mean_burn": runway_months(mean_burn),
            "worst_quartile_burn": runway_months(p75_burn),
            "trailing_7d_burn": runway_months(burn_7d),
        },
        "largest_outflows": largest_outflows,
        "warning_level": _warning_level(runway_months(p75_burn), burn_acceleration_pct),
        "narrative": _narrative(
            property_id, available_cash, median_burn, p75_burn,
            burn_7d, burn_30d, runway_months(p75_burn),
        ),
        "generated_at": _now(),
    }


def _warning_level(worst_runway_months: Optional[float], acceleration_pct: float) -> str:
    """Three levels: green / amber / red. Doctrine §2.5 — observation
    not alarm. Red means 'this needs a hard conversation' not
    'panic.'"""
    if worst_runway_months is None:
        return "green_or_growing"
    if worst_runway_months < 6:
        return "red_runway_under_6_months"
    if worst_runway_months < 12:
        return "amber_runway_under_12_months"
    if acceleration_pct > 0.20:
        return "amber_burn_accelerating"
    return "green"


def _narrative(property_id: str, available_cash: int, median_burn: float,
               p75_burn: float, burn_7d: float, burn_30d: float,
               worst_runway_months: Optional[float]) -> str:
    parts = [
        f"Available cash ${available_cash/100:,.0f}. "
        f"Median daily burn ${median_burn/100:,.0f}, "
        f"75th-percentile worst day ${p75_burn/100:,.0f}.",
    ]
    if worst_runway_months is None:
        parts.append("Property is cash-positive over the lookback — no burn-based runway constraint.")
    else:
        parts.append(
            f"At the worst-quartile burn rate, cash runway is "
            f"{worst_runway_months:.1f} months."
        )
    if burn_30d > 0:
        accel = (burn_7d - burn_30d) / burn_30d
        if accel > 0.20:
            parts.append(
                f"Burn rate is accelerating ({accel:+.0%} 7d vs 30d) — "
                f"investigate the driver."
            )
        elif accel < -0.20:
            parts.append(
                f"Burn rate is decelerating ({accel:+.0%} 7d vs 30d) — "
                f"trend is positive."
            )
    return " ".join(parts)
