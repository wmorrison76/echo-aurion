"""
Outlet Capture — Trial-Level Retrospective
==========================================
The deep version of the active-learning loop. After actuals arrive,
this module walks back inside the Monte Carlo and asks:

  · Which individual trials predicted the actual quantity correctly?
  · What did those winning trials sample differently from the median?
  · What signal does that suggest we underweight in aggregate?

This is the §2.4 retrospective practice mechanized — the chef tasting
the sauce after service and recognizing the moment when it was right,
then asking why. The model is never permitted to be "occasionally
correct"; even on a hit, the walkback continues to ask which trial was
tightest and what it knew.

Doctrine alignment:
  · §2.4 retrospective practice — every shift, after service, walk back
  · §2.5 framing — the output is observation, not accusation. Phrases
    like "Trial 437 sampled the high tail of Saturday DOW because group
    block was wider than aggregate priced in" — observation about what
    the model could see, not blame for what it missed.
  · §1.1 transparency — the walkback is a public daily artifact

Never-satisfied posture:
  Even when MAPE is near the empirical floor, this loop continues to
  identify the tightest trials and decompose their advantage. The
  pursuit is the doctrine; the destination is unreachable.
"""
from datetime import datetime, timezone, timedelta
from statistics import mean, median, stdev
from typing import Dict, List, Optional

from database import db


WINNER_TOLERANCE_PCT = 0.02         # trials within 2% of actual = winners
NEAR_MISS_TOLERANCE_PCT = 0.05      # trials within 5% = near-misses
MIN_WINNERS_FOR_ATTRIBUTION = 3     # need at least 3 winners to trust signal attribution
SIGNAL_NUDGE_FROM_WINNERS_MAX = 0.03  # cap on width-nudges from winners (3%)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_retrospective(outlet_id: str, target_date: str) -> Dict:
    """Generate the trial-level retrospective for one outlet × date.
    Idempotent — overwrites the prior retrospective row for the same
    (outlet, date)."""
    actual_row = db["outlet_capture_daily"].find_one(
        {"outlet_id": outlet_id, "date": target_date}, {"_id": 0},
    )
    if not actual_row:
        return {"outlet_id": outlet_id, "for_date": target_date, "skipped": "no_actual"}

    actual_covers = actual_row.get("covers", 0)
    if actual_covers == 0:
        return {"outlet_id": outlet_id, "for_date": target_date, "skipped": "zero_actual"}

    # Find the forecast record(s) made for this date — usually one per
    # horizon. Retrospective focuses on the 1-day horizon (the tightest)
    # but reports across all available horizons.
    forecasts = list(
        db["outlet_capture_forecasts"].find(
            {"outlet_id": outlet_id, "for_date": target_date}, {"_id": 0},
        ).sort("horizon_days", 1)
    )
    if not forecasts:
        return {"outlet_id": outlet_id, "for_date": target_date, "skipped": "no_forecast"}

    horizon_walks: List[Dict] = []
    for forecast in forecasts:
        walk = _walkback_one_horizon(forecast, actual_covers)
        horizon_walks.append(walk)

    # The "post-service walkback" — §2.5 framing in plain English
    walkback_text = _compose_walkback_narrative(outlet_id, target_date, horizon_walks)

    # Aggregate signal-direction insights across horizons. If the
    # winners across multiple horizons all sampled the same signal in
    # the same direction, that's a strong signal we should nudge the
    # signal width or mean.
    signal_directions = _aggregate_signal_directions(horizon_walks)

    retrospective = {
        "outlet_id": outlet_id,
        "for_date": target_date,
        "actual_covers": actual_covers,
        "horizons": horizon_walks,
        "walkback_text": walkback_text,
        "signal_directions": signal_directions,
        "doctrine_note": (
            "The model is not permitted to be 'occasionally correct.' "
            "This walkback identifies the trials that predicted the actual "
            "quantity correctly and decomposes what they sampled. The "
            "pursuit is the discipline — the metric is the side effect."
        ),
        "generated_at": _now(),
    }
    db["outlet_capture_retrospectives"].update_one(
        {"outlet_id": outlet_id, "for_date": target_date},
        {"$set": retrospective},
        upsert=True,
    )

    # Apply learnings to the weights (bounded, transparent)
    _apply_winner_signal_nudges(outlet_id, signal_directions)

    return retrospective


def _walkback_one_horizon(forecast: Dict, actual_covers: float) -> Dict:
    """Per-horizon walkback. Loads the trial-level draws, classifies
    each trial as winner / near-miss / miss, and decomposes the
    signal-draw distribution of the winners vs. all trials."""
    horizon = forecast.get("horizon_days")
    forecast_id = forecast.get("forecast_id")
    p50 = forecast.get("p50", 0)
    p10 = forecast.get("p10", 0)
    p90 = forecast.get("p90", 0)

    trial_doc = db["outlet_capture_forecast_trials"].find_one(
        {"forecast_id": forecast_id}, {"_id": 0},
    )
    if not trial_doc:
        return {
            "horizon_days": horizon,
            "p50": p50,
            "actual": actual_covers,
            "abs_pct_error": _abs_pct(p50, actual_covers),
            "in_p10_p90": p10 <= actual_covers <= p90,
            "trial_data_available": False,
        }

    trials = trial_doc.get("trials", [])
    winner_band_low = actual_covers * (1 - WINNER_TOLERANCE_PCT)
    winner_band_high = actual_covers * (1 + WINNER_TOLERANCE_PCT)
    near_band_low = actual_covers * (1 - NEAR_MISS_TOLERANCE_PCT)
    near_band_high = actual_covers * (1 + NEAR_MISS_TOLERANCE_PCT)

    winners = [t for t in trials if winner_band_low <= t["sample"] <= winner_band_high]
    near_misses = [t for t in trials if near_band_low <= t["sample"] <= near_band_high and t not in winners]
    median_pool = trials   # for comparison

    signal_attribution = _attribute_winning_signals(winners, median_pool) if len(winners) >= MIN_WINNERS_FOR_ATTRIBUTION else None

    # The single tightest trial — the chef's "moment when it was right"
    tightest = min(trials, key=lambda t: abs(t["sample"] - actual_covers)) if trials else None

    return {
        "horizon_days": horizon,
        "p50": p50,
        "actual": actual_covers,
        "abs_pct_error": _abs_pct(p50, actual_covers),
        "in_p10_p90": p10 <= actual_covers <= p90,
        "trial_data_available": True,
        "trials_total": len(trials),
        "winners_count": len(winners),
        "near_misses_count": len(near_misses),
        "tightest_trial": tightest,
        "tightest_pct_error": _abs_pct(tightest["sample"], actual_covers) if tightest else None,
        "signal_attribution": signal_attribution,
    }


def _attribute_winning_signals(winners: List[Dict], all_trials: List[Dict]) -> Dict:
    """Decompose what the winners sampled vs. the median trial. Returns
    a per-signal mean and direction. Positive `delta_from_median` means
    winners sampled higher than median on that signal (so we likely
    underweight it). Negative means winners sampled lower (we overweight)."""
    if not winners or not all_trials:
        return {}
    signals = list(winners[0].get("draws", {}).keys())
    attribution = {}
    for sig in signals:
        winner_vals = [t["draws"][sig] for t in winners if sig in t.get("draws", {})]
        all_vals = [t["draws"][sig] for t in all_trials if sig in t.get("draws", {})]
        if not winner_vals or not all_vals:
            continue
        winner_mean = mean(winner_vals)
        median_val = median(all_vals)
        delta = winner_mean - median_val
        # Effect size relative to all-trial standard deviation
        all_std = stdev(all_vals) if len(all_vals) >= 2 else 0
        effect_size = (delta / all_std) if all_std > 0 else 0
        attribution[sig] = {
            "winners_mean": round(winner_mean, 4),
            "median_all_trials": round(median_val, 4),
            "delta_from_median": round(delta, 4),
            "effect_size_sigma": round(effect_size, 3),
            "direction": ("winners_sampled_higher" if delta > 0 else "winners_sampled_lower" if delta < 0 else "neutral"),
        }
    return attribution


def _aggregate_signal_directions(horizon_walks: List[Dict]) -> Dict:
    """If winners across multiple horizons all sampled DOW higher (say),
    that's a strong signal we underweight DOW. This aggregator votes
    across horizons and produces one recommendation per signal."""
    votes: Dict[str, List[float]] = {}
    for walk in horizon_walks:
        attribution = walk.get("signal_attribution") or {}
        for sig, info in attribution.items():
            votes.setdefault(sig, []).append(info["effect_size_sigma"])
    aggregated = {}
    for sig, vals in votes.items():
        if not vals:
            continue
        avg_effect = mean(vals)
        aggregated[sig] = {
            "avg_effect_sigma_across_horizons": round(avg_effect, 3),
            "horizons_voting": len(vals),
            "recommendation": _recommendation_for_effect(sig, avg_effect),
        }
    return aggregated


def _recommendation_for_effect(signal: str, effect_size: float) -> str:
    """Translate an effect-size into a §2.5-framed observation
    (observation, not accusation)."""
    if abs(effect_size) < 0.3:
        return f"{signal}: winners sampled near the median — current weighting holds"
    direction = "high" if effect_size > 0 else "low"
    magnitude = "moderate" if abs(effect_size) < 0.7 else "strong"
    return (
        f"{signal}: winners sampled the {direction} tail with {magnitude} effect "
        f"({effect_size:+.2f}σ). The model could see this if its {signal} "
        f"distribution were widened in that direction."
    )


def _compose_walkback_narrative(outlet_id: str, target_date: str, horizon_walks: List[Dict]) -> str:
    """Produce the §2.5-framed walkback. Plain English for the morning
    digest. Observational tone: what the model could see, not what it
    missed."""
    if not horizon_walks:
        return f"No retrospective for {outlet_id} on {target_date} — no forecasts on file."

    one_day = next((w for w in horizon_walks if w.get("horizon_days") == 1), horizon_walks[0])
    actual = one_day.get("actual", 0)
    p50 = one_day.get("p50", 0)
    err = one_day.get("abs_pct_error", 0)
    winners = one_day.get("winners_count", 0)
    trials_total = one_day.get("trials_total", 0)
    tightest_err = one_day.get("tightest_pct_error", 0)

    parts = []
    parts.append(
        f"On {target_date}, {outlet_id} actual was {int(actual)} covers; "
        f"the 1-day forecast P50 was {int(p50)} ({err:.1%} off)."
    )
    if trials_total > 0 and winners > 0:
        parts.append(
            f"Inside the Monte Carlo, {winners} of {trials_total} recorded trials "
            f"landed within 2% of actual — and the tightest trial was within "
            f"{tightest_err:.2%}. The model could see this; the question is "
            f"why those specific trials saw it more clearly."
        )
    elif trials_total > 0:
        parts.append(
            f"None of the {trials_total} recorded trials landed within 2% of "
            f"actual, but the tightest was within {tightest_err:.2%}. The "
            f"distribution did not reach far enough — widen the relevant "
            f"signal."
        )

    # If we have signal attribution, surface the strongest direction
    sa = one_day.get("signal_attribution") or {}
    strong = [(sig, info) for sig, info in sa.items() if abs(info.get("effect_size_sigma", 0)) >= 0.3]
    if strong:
        strong.sort(key=lambda x: abs(x[1]["effect_size_sigma"]), reverse=True)
        sig, info = strong[0]
        parts.append(
            f"The winners sampled {sig} {info['direction'].replace('_', ' ')} "
            f"({info['effect_size_sigma']:+.2f}σ). The model already has the "
            f"signal; it under-explored the direction the winners chose."
        )

    parts.append(
        "The pursuit is the discipline. Tomorrow we widen what the winners "
        "saw and walk back again."
    )
    return " ".join(parts)


def _apply_winner_signal_nudges(outlet_id: str, signal_directions: Dict):
    """Apply bounded, transparent nudges based on what the winners
    sampled. Different from the aggregate-error nudge in the learner —
    this nudges signal *widths* (how widely we sample) rather than
    means. If winners consistently lived in the tail, the model is
    not exploring the tail enough."""
    if not signal_directions:
        return
    weights = db["outlet_capture_weights"].find_one({"outlet_id": outlet_id}) or {}
    width_updates = {}
    for sig, info in signal_directions.items():
        effect = info.get("avg_effect_sigma_across_horizons", 0)
        if abs(effect) < 0.3:
            continue
        # If winners lived in the tail, widen our sampling distribution
        # for this signal — bounded by SIGNAL_NUDGE_FROM_WINNERS_MAX.
        nudge = min(SIGNAL_NUDGE_FROM_WINNERS_MAX, abs(effect) * 0.02)
        width_key = f"{sig}_width"
        current = weights.get(width_key, 0.10)
        width_updates[width_key] = round(current * (1 + nudge), 4)

    if not width_updates:
        return
    new_version = (weights.get("version", 0) or 0) + 1
    db["outlet_capture_weights"].update_one(
        {"outlet_id": outlet_id},
        {"$set": {
            **width_updates,
            "version": new_version,
            "last_winner_attribution_at": _now(),
            "updated_at": _now(),
        }},
        upsert=True,
    )
    # Append prior version to history (doctrine §3.1)
    db["outlet_capture_weights_history"].insert_one({
        "outlet_id": outlet_id,
        "version": weights.get("version", 0),
        "snapshot": {k: v for k, v in weights.items() if k != "_id"},
        "trigger": "winner_signal_attribution",
        "archived_at": _now(),
    })


def _abs_pct(forecast: float, actual: float) -> float:
    if actual <= 0:
        return 1.0
    return round(abs(forecast - actual) / actual, 4)
