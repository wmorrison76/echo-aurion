"""
Forecast Confidence-Drift Alarm
================================
T.4 from the CFO toolkit additions. When MAPE itself starts trending
UP — meaning the model is getting WORSE — that's a signal something
structural has changed. This module surfaces the *velocity* of error,
distinct from absolute MAPE.

Reads from:
  · `outlet_capture_accuracy`  — rolling forecast vs actual

Three drift signals computed:
  · drift_slope_per_day  — linear-fit slope of MAPE over the window
  · early_vs_late_delta  — mean(first half) vs mean(second half)
  · unprecedented_misses — count of days outside historical 95th percentile

Doctrine alignment:
  · §2.4 retrospective practice — drift detection is the meta-loop:
    even when individual forecasts pass, the loop watches for the
    failure of the forecasting itself
  · §1.1 transparency — drift is published; if the model is degrading,
    the team sees it
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median, stdev
from typing import Optional, List, Dict
from fastapi import APIRouter, Query, HTTPException

from database import db


router = APIRouter(prefix="/api/forecast-drift", tags=["cfo-forecast-drift"])

_now = lambda: datetime.now(timezone.utc).isoformat()


SIGNIFICANT_SLOPE_PER_DAY = 0.0015        # MAPE trending up by ≥0.15pp/day = drift
SIGNIFICANT_HALF_DELTA_PCT = 0.20         # late half MAPE 20% worse than early = drift
UNPRECEDENTED_PERCENTILE = 95             # error days beyond historical 95th = unprecedented


@router.get("/{outlet_id}")
async def outlet_drift(outlet_id: str, lookback_days: int = Query(60, ge=14, le=180)):
    """Per-outlet drift detection across all horizons."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=lookback_days)).isoformat()
    rows = list(
        db["outlet_capture_accuracy"].find(
            {"outlet_id": outlet_id, "for_date": {"$gte": cutoff}},
            {"_id": 0},
        ).sort("for_date", 1)
    )
    if len(rows) < 14:
        return {
            "outlet_id": outlet_id,
            "available": False,
            "reason": "insufficient_accuracy_history",
            "rows_found": len(rows),
            "minimum_required": 14,
            "generated_at": _now(),
        }

    by_horizon: Dict[int, List[Dict]] = {}
    for r in rows:
        by_horizon.setdefault(r["horizon_days"], []).append(r)

    drift_per_horizon = {}
    for horizon, h_rows in by_horizon.items():
        if len(h_rows) < 14:
            drift_per_horizon[f"horizon_{horizon}d"] = {
                "available": False,
                "reason": "insufficient_horizon_samples",
                "samples": len(h_rows),
            }
            continue
        drift = _compute_drift(h_rows)
        drift_per_horizon[f"horizon_{horizon}d"] = drift

    # Cross-horizon overall drift signal (worst-case)
    drift_signals = [
        d.get("drift_signal") for d in drift_per_horizon.values()
        if d.get("drift_signal")
    ]
    overall_signal = _aggregate_signals(drift_signals)

    return {
        "outlet_id": outlet_id,
        "available": True,
        "lookback_days": lookback_days,
        "by_horizon": drift_per_horizon,
        "overall_drift_signal": overall_signal,
        "narrative": _narrative(outlet_id, drift_per_horizon, overall_signal),
        "generated_at": _now(),
    }


@router.get("/property/{property_id}")
async def property_drift(property_id: str, lookback_days: int = Query(60, ge=14, le=180)):
    """Property-level drift summary — which outlets are degrading."""
    outlets = list(
        db["outlets"].find({"property_id": property_id, "active": True}, {"_id": 0, "outlet_id": 1, "name": 1})
    )
    summaries = []
    for outlet in outlets:
        result = await outlet_drift(outlet["outlet_id"], lookback_days)
        signal = result.get("overall_drift_signal", "no_data")
        summaries.append({
            "outlet_id": outlet["outlet_id"],
            "name": outlet.get("name"),
            "drift_signal": signal,
            "available": result.get("available", False),
        })

    counts = {"degrading": 0, "stable": 0, "improving": 0, "no_data": 0}
    for s in summaries:
        if s["drift_signal"] in counts:
            counts[s["drift_signal"]] += 1
        else:
            counts["no_data"] += 1

    return {
        "property_id": property_id,
        "outlets": summaries,
        "summary": counts,
        "outlets_to_investigate": [s for s in summaries if s["drift_signal"] == "degrading"],
        "generated_at": _now(),
    }


def _compute_drift(rows: List[Dict]) -> Dict:
    """Three drift detectors over a sequence of accuracy rows."""
    errors = [r["abs_pct_error"] for r in rows if r.get("abs_pct_error") is not None]
    if len(errors) < 14:
        return {"available": False, "reason": "insufficient_data"}

    # Linear-fit slope (errors vs. day-index)
    n = len(errors)
    indices = list(range(n))
    mean_x = mean(indices)
    mean_y = mean(errors)
    num = sum((indices[i] - mean_x) * (errors[i] - mean_y) for i in range(n))
    den = sum((indices[i] - mean_x) ** 2 for i in range(n))
    slope = (num / den) if den > 0 else 0

    # Early-vs-late-half delta
    half = n // 2
    early = mean(errors[:half])
    late = mean(errors[half:])
    half_delta_pct = ((late - early) / early) if early > 0 else 0

    # Unprecedented misses — historical baseline excludes the most recent
    # 7 days, so we compare new errors against what was normal before
    if n > 14:
        baseline = errors[:-7]
        recent = errors[-7:]
        baseline_sorted = sorted(baseline)
        threshold_idx = int(len(baseline_sorted) * UNPRECEDENTED_PERCENTILE / 100)
        threshold = baseline_sorted[min(threshold_idx, len(baseline_sorted) - 1)]
        unprecedented = sum(1 for e in recent if e > threshold)
    else:
        threshold = max(errors)
        unprecedented = 0

    # Drift signal: which way is the model going?
    if slope > SIGNIFICANT_SLOPE_PER_DAY or half_delta_pct > SIGNIFICANT_HALF_DELTA_PCT or unprecedented >= 3:
        signal = "degrading"
    elif slope < -SIGNIFICANT_SLOPE_PER_DAY or half_delta_pct < -SIGNIFICANT_HALF_DELTA_PCT:
        signal = "improving"
    else:
        signal = "stable"

    return {
        "available": True,
        "samples": n,
        "current_mape": round(errors[-1], 4) if errors else None,
        "trailing_7d_mape": round(mean(errors[-7:]), 4),
        "trailing_14d_mape": round(mean(errors[-14:]), 4),
        "drift_slope_per_day": round(slope, 5),
        "early_half_mape": round(early, 4),
        "late_half_mape": round(late, 4),
        "half_delta_pct": round(half_delta_pct, 4),
        "unprecedented_threshold": round(threshold, 4),
        "unprecedented_recent_count": unprecedented,
        "drift_signal": signal,
    }


def _aggregate_signals(signals: List[str]) -> str:
    if not signals:
        return "no_data"
    if "degrading" in signals:
        return "degrading"
    if all(s == "improving" for s in signals):
        return "improving"
    return "stable"


def _narrative(outlet_id: str, drift: Dict, signal: str) -> str:
    if signal == "degrading":
        # Find the worst horizon
        worst = None
        worst_slope = 0
        for h_label, h_data in drift.items():
            if not h_data.get("available"):
                continue
            slope = h_data.get("drift_slope_per_day", 0)
            if slope > worst_slope:
                worst_slope = slope
                worst = h_label
        return (
            f"{outlet_id} forecast accuracy is degrading "
            f"({worst or 'multiple horizons'} showing the largest drift). "
            f"Investigate: structural change at the property (new menu, "
            f"new GM, renovation, market shift)? The model's signals may "
            f"need a partial reset to neighbor-property defaults — see "
            f"the regime-change escalation in outlet_capture_learner.py."
        )
    if signal == "improving":
        return f"{outlet_id} forecast accuracy is improving — active learning is converging."
    if signal == "stable":
        return f"{outlet_id} forecast accuracy is stable. The model is holding its baseline."
    return f"{outlet_id} drift cannot be assessed yet — accumulate more accuracy samples first."
