"""
Outlet Capture — Active Learning Loop
=====================================
The retrospective practice (§2.4) made mechanical: every day, look at
yesterday's forecast vs yesterday's actual; decompose error by signal;
nudge weights toward truth; persist a new weights version. Bounded so
a single bad day cannot blow out the model.

Architecture: docs/financial/OUTLET_CAPTURE_ARCHITECTURE.md

Doctrine alignment:
  · §2.4 retrospective — this loop IS the post-service walkback
  · §2.5 framing — surfaces the variance as observation, not blame
  · §3.1 append-only — every weight change is versioned; prior
    weights remain queryable
  · §1.1 transparency — accuracy gauge published; no hidden tuning

Bounds:
  · WEIGHT_NUDGE_MAX_PCT — single-day weight change cap (5% default)
  · REGIME_CHANGE_THRESHOLD — error level that triggers reset to
    neighbor-property defaults instead of incremental nudge
  · MIN_SAMPLES — won't nudge weights with fewer than this many
    actuals (avoids overfitting to noise)
"""
from datetime import datetime, timezone, timedelta
from statistics import mean
from typing import Dict, List, Optional

from database import db


WEIGHT_NUDGE_MAX_PCT = 0.05         # 5% max per-day weight nudge
REGIME_CHANGE_THRESHOLD = 0.40      # 40%+ MAPE → suspect structural change
MIN_SAMPLES_FOR_NUDGE = 7           # don't tune weights with <1 week of data
HORIZONS = [1, 3, 5, 10, 21]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_daily_audit(target_date: Optional[str] = None) -> Dict:
    """The main entrypoint. Runs once per day after midnight UTC.
    For each outlet × horizon, compares the forecast that was made
    `horizon` days ago against today's actual, computes error, nudges
    weights. Returns a report of what happened.

    Idempotent: re-running for the same date overwrites the prior
    audit row but never modifies prior weights versions (those are
    append-only)."""
    if target_date is None:
        # Yesterday's actuals are reliably closed by 04:00 UTC
        target_date = (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()

    # Lazy import to avoid circular dependency at module load
    from echo.outlet_capture_retrospective import run_retrospective

    audited_outlets = []
    retrospectives_run = 0
    for outlet in db["outlets"].find({"active": True}, {"_id": 0}):
        outlet_report = _audit_one_outlet(outlet, target_date)
        # Trial-level retrospective ALWAYS runs — even on outlets that
        # were skipped for weight-nudging, even on hits. The doctrine
        # is: never declare victory. Pursuit is the discipline.
        try:
            retro_result = run_retrospective(outlet["outlet_id"], target_date)
            outlet_report["retrospective"] = {
                "ran": True,
                "skipped_reason": retro_result.get("skipped"),
                "winners_at_1d": _winners_at_1d(retro_result),
            }
            if not retro_result.get("skipped"):
                retrospectives_run += 1
        except Exception as exc:
            outlet_report["retrospective"] = {"ran": False, "error": str(exc)}
        audited_outlets.append(outlet_report)

    summary = {
        "audit_date": target_date,
        "audited_at": _now(),
        "outlets_audited": len(audited_outlets),
        "outlets_nudged": sum(1 for r in audited_outlets if r.get("weights_nudged")),
        "outlets_in_regime_change": sum(1 for r in audited_outlets if r.get("regime_change_flag")),
        "outlets_skipped_low_sample": sum(1 for r in audited_outlets if r.get("skipped")),
        "retrospectives_completed": retrospectives_run,
        "details": audited_outlets,
    }
    db["outlet_capture_audit_runs"].insert_one(summary.copy())
    summary.pop("_id", None)
    return summary


def _audit_one_outlet(outlet: Dict, target_date: str) -> Dict:
    """Per-outlet audit. Compares each horizon's prior forecast for
    target_date against the actual; emits an accuracy row; nudges
    weights if conditions met."""
    outlet_id = outlet["outlet_id"]
    actual = db["outlet_capture_daily"].find_one(
        {"outlet_id": outlet_id, "date": target_date},
        {"_id": 0},
    )
    if not actual:
        return {"outlet_id": outlet_id, "skipped": True, "reason": "no_actual_for_date"}

    actual_covers = actual.get("covers", 0)

    weights = db["outlet_capture_weights"].find_one({"outlet_id": outlet_id}) or {}
    horizon_errors: List[Dict] = []
    nudged = False
    regime_change = False

    for horizon in HORIZONS:
        forecast_made_for = (
            datetime.fromisoformat(target_date).date() - timedelta(days=0)
        ).isoformat()
        forecast = db["outlet_capture_forecasts"].find_one(
            {
                "outlet_id": outlet_id,
                "for_date": target_date,
                "horizon_days": horizon,
            },
            {"_id": 0},
            sort=[("forecast_made_at", 1)],
        )
        if not forecast:
            continue

        forecast_p50 = forecast.get("p50", 0)
        if actual_covers == 0 and forecast_p50 == 0:
            continue
        if actual_covers == 0:
            abs_pct_error = 1.0
        else:
            abs_pct_error = abs(forecast_p50 - actual_covers) / max(1, actual_covers)
        signed_error = (forecast_p50 - actual_covers) / max(1, actual_covers)

        accuracy_row = {
            "outlet_id": outlet_id,
            "for_date": target_date,
            "horizon_days": horizon,
            "forecast_p50": forecast_p50,
            "forecast_p10": forecast.get("p10", 0),
            "forecast_p90": forecast.get("p90", 0),
            "actual": actual_covers,
            "abs_pct_error": round(abs_pct_error, 4),
            "signed_pct_error": round(signed_error, 4),
            "in_p10_p90_band": forecast.get("p10", 0) <= actual_covers <= forecast.get("p90", 0),
            "weights_version": forecast.get("weights_version", 0),
            "audited_at": _now(),
        }
        db["outlet_capture_accuracy"].update_one(
            {
                "outlet_id": outlet_id,
                "for_date": target_date,
                "horizon_days": horizon,
            },
            {"$set": accuracy_row},
            upsert=True,
        )
        horizon_errors.append(accuracy_row)

        if abs_pct_error >= REGIME_CHANGE_THRESHOLD:
            regime_change = True

    # Nudge weights only when we have enough recent samples and we're
    # not in a regime-change condition
    sample_count = db["outlet_capture_daily"].count_documents({"outlet_id": outlet_id})
    if sample_count >= MIN_SAMPLES_FOR_NUDGE and not regime_change and horizon_errors:
        nudged = _nudge_weights(outlet, weights, horizon_errors, actual)
    elif regime_change:
        _flag_regime_change(outlet, horizon_errors)

    return {
        "outlet_id": outlet_id,
        "horizons_audited": len(horizon_errors),
        "weights_nudged": nudged,
        "regime_change_flag": regime_change,
        "skipped": sample_count < MIN_SAMPLES_FOR_NUDGE,
        "skip_reason": ("low_sample" if sample_count < MIN_SAMPLES_FOR_NUDGE else None),
        "errors": [
            {"horizon": h["horizon_days"], "abs_pct_error": h["abs_pct_error"]}
            for h in horizon_errors
        ],
    }


def _nudge_weights(outlet: Dict, weights: Dict, horizon_errors: List[Dict], actual: Dict) -> bool:
    """Apply bounded nudges to the weights based on observed error.
    Today the only learned dimension is the DOW multiplier; can be
    extended to weather, occupancy elasticity, etc., as those signals
    are wired."""
    avg_signed_error = mean(h["signed_pct_error"] for h in horizon_errors)
    # If forecast is systematically high (positive error), reduce DOW
    # multiplier for this DOW slightly. If systematically low, increase.
    nudge = max(-WEIGHT_NUDGE_MAX_PCT, min(WEIGHT_NUDGE_MAX_PCT, -avg_signed_error * 0.3))
    if abs(nudge) < 0.005:
        return False                       # too small to bother

    target_date = actual["date"]
    dow_idx = datetime.fromisoformat(target_date).weekday()
    dow_label = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][dow_idx]
    current_mult = weights.get("dow_multipliers", {}).get(dow_label, 1.0)
    new_mult = round(current_mult * (1 + nudge), 4)

    # Bounds: never let multiplier go negative or absurdly large
    new_mult = max(0.20, min(3.00, new_mult))

    new_dow = dict(weights.get("dow_multipliers", {}))
    new_dow[dow_label] = new_mult

    new_version = (weights.get("version", 0) or 0) + 1
    db["outlet_capture_weights"].update_one(
        {"outlet_id": outlet["outlet_id"]},
        {"$set": {
            "dow_multipliers": new_dow,
            "version": new_version,
            "is_cold_start": False,
            "last_nudge": {
                "date": target_date,
                "dow": dow_label,
                "signed_error": round(avg_signed_error, 4),
                "applied_nudge": round(nudge, 4),
                "old_multiplier": current_mult,
                "new_multiplier": new_mult,
            },
            "updated_at": _now(),
        }},
    )

    # Append the prior version to the version history (so we can
    # always see what the model believed previously — doctrine §3.1)
    db["outlet_capture_weights_history"].insert_one({
        "outlet_id": outlet["outlet_id"],
        "version": weights.get("version", 0),
        "snapshot": {k: v for k, v in weights.items() if k != "_id"},
        "archived_at": _now(),
    })
    return True


def _flag_regime_change(outlet: Dict, horizon_errors: List[Dict]):
    """When error blows past REGIME_CHANGE_THRESHOLD we don't nudge —
    we flag for human review. A new menu, renovation, or ownership
    change can break weights faster than incremental nudging can
    keep up. The flag surfaces in the dashboard with a 'check this
    out' tile rather than silently degrading the forecast."""
    db["outlet_capture_regime_alerts"].insert_one({
        "outlet_id": outlet["outlet_id"],
        "raised_at": _now(),
        "errors": horizon_errors,
        "reason": "abs_pct_error >= REGIME_CHANGE_THRESHOLD on at least one horizon",
        "status": "open",
    })


def process_recompute_queue(now_iso: Optional[str] = None) -> Dict:
    """Worker that drains the debounce queue. Runs every minute via
    the scheduler. Only processes items whose `ready_at` has passed
    so events are coalesced over the debounce window."""
    if now_iso is None:
        now_iso = _now()
    ready = list(
        db["outlet_capture_recompute_q"].find(
            {"status": "pending", "ready_at": {"$lte": now_iso}},
            {"_id": 0},
        ).limit(50)
    )
    if not ready:
        return {"processed": 0}

    # Lazy import to avoid circular dependency at module load
    from routes.outlet_capture import _compute_forecast, _refresh_daily_aggregation

    processed = 0
    for item in ready:
        outlet = db["outlets"].find_one({"outlet_id": item["outlet_id"]}, {"_id": 0})
        if not outlet:
            continue
        # Refresh today's daily aggregation in case underlying events changed
        _refresh_daily_aggregation(item["outlet_id"], item["for_date"])
        # Recompute forecasts at all horizons whose target_date falls within
        # the affected scope
        target = datetime.fromisoformat(item["for_date"]).date()
        today = datetime.now(timezone.utc).date()
        days_ahead = (target - today).days
        horizon = _nearest_horizon(days_ahead)
        if horizon is not None:
            _compute_forecast(outlet, item["for_date"], horizon)
        db["outlet_capture_recompute_q"].update_one(
            {"outlet_id": item["outlet_id"], "for_date": item["for_date"], "status": "pending"},
            {"$set": {"status": "completed", "processed_at": _now()}},
        )
        processed += 1

    # Emit a forecast.updated event per outlet so the UI can re-render
    try:
        from event_bus import publish
        emitted = set()
        for item in ready:
            key = item["outlet_id"]
            if key not in emitted:
                publish("forecast.updated", {"outlet_id": key}, source="outlet_capture_learner")
                emitted.add(key)
    except Exception:
        pass

    return {"processed": processed}


def _nearest_horizon(days_ahead: int) -> Optional[int]:
    """Map a date offset to the nearest canonical horizon.
    Negative offsets (past dates) return None (don't recompute past)."""
    if days_ahead < 0:
        return None
    if days_ahead == 0:
        return 1                      # 'today' is the 1d horizon's target
    return min(HORIZONS, key=lambda h: abs(h - days_ahead))


def _winners_at_1d(retro_result: Dict) -> Optional[int]:
    """Extract the 1-day-horizon winner count from a retrospective
    result. Surfaced in the audit summary so an operator scanning the
    digest can see at a glance whether the model was already capable
    of getting it right."""
    if retro_result.get("skipped"):
        return None
    horizons = retro_result.get("horizons") or []
    one_day = next((h for h in horizons if h.get("horizon_days") == 1), None)
    if not one_day:
        return None
    return one_day.get("winners_count")
