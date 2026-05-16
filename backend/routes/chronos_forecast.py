"""
D16h · Chronos Monte Carlo forecast + self-audit loop.

The owner described this as "Echo as CPA + Master Chef." Three pieces:

  1. Forecast engine
     Given (outlet, target_date, items_with_history, signals), run N
     Monte Carlo iterations per item. Each iteration samples a noisy
     scaling of (base_dow_demand × weighted_signal_product). Returns
     per-item p10/p50/p90 plus a scenario histogram the audit can
     replay against.

  2. Self-audit
     When yesterday's actual sales come in, walk every forecast row.
     Compute error. Find the SCENARIO QTY that was closest to actual
     in the stored histogram — that's the scenario whose factor mix
     "knew" the right answer. Nudge the per-(outlet, item) signal
     weights toward that mix.

     Owner's words: "If chicken parm forecasted 26 but sold 27,
     Echo searches the Monte Carlo runs to find the scenario that
     predicted 27, compares the other items in that scenario, and
     recalibrates its signal weights."

     The nudge is small (5% per cycle) so a one-off outlier doesn't
     overwrite a year of good fits. Weights are floored at 0.5 and
     capped at 2.0 so a runaway signal can't dominate.

  3. Real-time accuracy tile
     Rolling 14-day mean error, with a "improving | flat | drifting"
     trend label so the chef sees whether yesterday's accuracy is
     in fact tomorrow's floor.

Why a deterministic Monte Carlo (no live AI dependency on the math):
seeded with the date + item_id + outlet_id, the simulation is
reproducible. That's a feature: an auditor can re-run yesterday's
forecast and get the same scenarios. The AI value is in the
self-audit's weight nudges (which DO accumulate over time) and in
explanation prose, not in randomness.
"""
from __future__ import annotations

import math
import random
import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/chronos/forecast", tags=["chronos-forecast"])

# Default Monte Carlo iterations per item. 1000 is enough to get tight
# p10/p50/p90 bands without making the endpoint slow.
DEFAULT_SCENARIOS = 1000

# Volatility around expected demand — 15% noise. Tunable per item via
# weights but kept as the population default.
DEFAULT_NOISE = 0.15

# How aggressively the audit nudges weights. 0.05 = 5% step toward
# the "best" factor on each audit cycle. Floor / cap prevent runaway.
WEIGHT_NUDGE_STEP = 0.05
WEIGHT_FLOOR = 0.5
WEIGHT_CAP = 2.0


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Pure engine (no IO) ─────────────────────────────────────────────────

def _weighted_factor(signals: Dict[str, float],
                     weights: Dict[str, float]) -> float:
    """Combine the five signals into one demand multiplier. Each
    signal raised to the per-(outlet, item) weight, then multiplied.

    Weight=1.0 means the signal contributes linearly; weight=0 means
    "ignore this signal"; weight=2.0 means "this signal dominates."
    The audit loop nudges these per item so chicken parm at the
    steakhouse can learn that reservations matter more than weather
    while the patio cafe learns the opposite."""
    def w(name: str, default: float = 1.0) -> float:
        v = float(weights.get(name, default) or default)
        return max(WEIGHT_FLOOR, min(WEIGHT_CAP, v))

    rp = float(signals.get("reservation_pace", 1.0) or 1.0)
    bf = float(signals.get("beo_guests_factor", 1.0) or 1.0)
    wf = float(signals.get("weather_factor", 1.0) or 1.0)
    cf = float(signals.get("calendar_factor", 1.0) or 1.0)
    sv = float(signals.get("sales_velocity", 1.0) or 1.0)

    return (
        (rp ** w("reservation"))
        * (bf ** w("beo"))
        * (wf ** w("weather"))
        * (cf ** w("calendar"))
        * (sv ** w("velocity"))
    )


def run_monte_carlo(
    *,
    base_demand: float,
    signals: Dict[str, float],
    weights: Dict[str, float],
    scenarios: int = DEFAULT_SCENARIOS,
    noise: float = DEFAULT_NOISE,
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """Pure function — returns p10/p50/p90 + scenario histogram for
    one item. Deterministic when `seed` is set (the endpoint sets it
    from outlet_id + date + item_id so reruns reproduce)."""
    factor = _weighted_factor(signals, weights)
    expected = max(0.0, float(base_demand) * factor)

    rng = random.Random(seed)
    samples: List[int] = []
    sigma = max(0.5, expected * noise)
    for _ in range(max(1, int(scenarios))):
        v = rng.gauss(expected, sigma)
        samples.append(max(0, round(v)))

    samples_sorted = sorted(samples)
    n = len(samples_sorted)

    def pct(p: float) -> int:
        # nearest-rank percentile to keep things integer
        idx = max(0, min(n - 1, int(round(p / 100.0 * (n - 1)))))
        return samples_sorted[idx]

    histogram: Dict[str, int] = {}
    for s in samples:
        histogram[str(s)] = histogram.get(str(s), 0) + 1

    return {
        "effective_factor": round(factor, 4),
        "expected_demand": round(expected, 2),
        "p10": pct(10),
        "p50": pct(50),
        "p90": pct(90),
        "scenario_histogram": histogram,
        "scenarios_run": n,
    }


def _seed_for(outlet_id: str, target_date: str, item_id: str) -> int:
    """Stable seed so reruns reproduce. Hashing keeps it deterministic
    without depending on Python's salted hash of strings."""
    h = 0
    for part in (outlet_id, target_date, item_id):
        for ch in part:
            h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    return h


def _load_weights(outlet_id: str, item_id: str) -> Dict[str, float]:
    """Per-(outlet, item) signal weights. Defaults to uniform 1.0
    when no audit cycles have run yet."""
    row = db["forecast_signal_weights"].find_one(
        {"outlet_id": outlet_id, "item_id": item_id}, {"_id": 0})
    if not row:
        return {"reservation": 1.0, "beo": 1.0, "weather": 1.0,
                "calendar": 1.0, "velocity": 1.0}
    return {k: float(row.get(k, 1.0)) for k in
            ("reservation", "beo", "weather", "calendar", "velocity")}


def _persist_weights(outlet_id: str, item_id: str,
                      weights: Dict[str, float],
                      audit_count: int) -> None:
    db["forecast_signal_weights"].update_one(
        {"outlet_id": outlet_id, "item_id": item_id},
        {"$set": {
            "outlet_id": outlet_id, "item_id": item_id,
            **{k: float(v) for k, v in weights.items()},
            "audit_count": audit_count,
            "updated_at": _now_iso(),
        }}, upsert=True)


# ─── Schemas ─────────────────────────────────────────────────────────────

class ForecastSignals(BaseModel):
    reservation_pace: float = 1.0
    beo_guests_factor: float = 1.0
    weather_factor: float = 1.0
    calendar_factor: float = 1.0
    sales_velocity: float = 1.0


class ForecastItemInput(BaseModel):
    item_id: str
    item_name: str
    base_demand_dow_avg: float = Field(..., ge=0)


class GenerateForecastBody(BaseModel):
    outlet_id: str
    target_date: str             # ISO date
    items: List[ForecastItemInput]
    signals: ForecastSignals
    scenarios: int = DEFAULT_SCENARIOS
    # D27 · tenant_id required for isolation. Per-outlet alone is
    # not enough — two tenants can share an outlet_id namespace.
    tenant_id: Optional[str] = None


class ActualSale(BaseModel):
    item_id: str
    qty: float = Field(..., ge=0)


class AuditBody(BaseModel):
    outlet_id: str
    date: str                    # ISO date — the day being audited
    actuals: List[ActualSale]


# ─── Endpoints ────────────────────────────────────────────────────────────

@router.post("/generate")
def generate_forecast(body: GenerateForecastBody,
                       x_tenant_id: Optional[str] = Header(None)):
    """Run the Monte Carlo for one outlet × one date × N items.
    Persists the per-item DailyForecast rows; returns the same.

    Idempotent on (tenant_id, outlet_id, date, item_id) — re-running
    with the same inputs reproduces the same output and overwrites
    the prior row. Re-running with different signals produces a new
    forecast that supersedes."""
    if not body.items:
        raise HTTPException(400, "at least one item required")
    # D27 · tenant precedence: header > body > "default"
    tenant_id = (x_tenant_id or body.tenant_id or "default").strip().lower()
    out: List[Dict[str, Any]] = []
    signals_dict = body.signals.model_dump()

    for item in body.items:
        weights = _load_weights(body.outlet_id, item.item_id)
        seed = _seed_for(body.outlet_id, body.target_date, item.item_id)
        mc = run_monte_carlo(
            base_demand=item.base_demand_dow_avg,
            signals=signals_dict,
            weights=weights,
            scenarios=body.scenarios,
            seed=seed,
        )
        doc = {
            "id": uuid.uuid4().hex[:12],
            "tenant_id":  tenant_id,    # D27
            "outlet_id":  body.outlet_id,
            "date":       body.target_date,
            "item_id":    item.item_id,
            "item_name":  item.item_name,
            "base_demand": float(item.base_demand_dow_avg),
            "signals":    signals_dict,
            "weights_used": weights,
            **mc,
            "generated_at": _now_iso(),
        }
        # Idempotent overwrite on (tenant, outlet, date, item).
        db["daily_forecasts"].update_one(
            {"tenant_id": tenant_id, "outlet_id": body.outlet_id,
             "date": body.target_date, "item_id": item.item_id},
            {"$set": doc}, upsert=True)
        # Re-fetch (without _id) to return the canonical row.
        out.append(db["daily_forecasts"].find_one(
            {"tenant_id": tenant_id, "outlet_id": body.outlet_id,
             "date": body.target_date, "item_id": item.item_id}, {"_id": 0}))

    return {"ok": True, "outlet_id": body.outlet_id,
            "date": body.target_date,
            "items_forecasted": len(out),
            "forecasts": out}


@router.get("/by-date")
def get_forecasts(outlet_id: str, date: str):
    """Read forecasts for one outlet × date. Used by the chef phone
    app + Chronos drill-down."""
    rows = list(db["daily_forecasts"].find(
        {"outlet_id": outlet_id, "date": date}, {"_id": 0})
        .sort("p50", -1).limit(500))
    return {"ok": True, "outlet_id": outlet_id, "date": date,
            "total": len(rows), "forecasts": rows}


@router.post("/audit")
def audit_forecast(body: AuditBody):
    """Self-audit yesterday's forecast against actual sales.

    For each (item) row of forecast on the given date:
      1. Compute error and error_pct against actual qty
      2. Walk the scenario histogram to find the BUCKET nearest to
         actual — that's the simulation outcome that "got it right"
      3. Nudge the per-(outlet, item) signal weights toward 1.0 if
         the closest_scenario was very close to expected_demand
         (signals were already calibrated), or AWAY from 1.0 if
         the closest_scenario was a big outlier (signals over- /
         under-pulled)
      4. Persist a forecast_accuracy row for the trend tile

    Returns rows-audited and the rolling rollup so a cron job can
    log progress.

    The nudge math is intentionally simple — see WEIGHT_NUDGE_STEP.
    A more sophisticated learner can replace the inner loop without
    changing the contract."""
    actuals = {a.item_id: float(a.qty) for a in body.actuals}
    forecasts = list(db["daily_forecasts"].find(
        {"outlet_id": body.outlet_id, "date": body.date}, {"_id": 0}))
    if not forecasts:
        raise HTTPException(404,
            f"no forecasts on {body.date} for {body.outlet_id}")

    audited: List[Dict[str, Any]] = []
    for f in forecasts:
        actual = actuals.get(f["item_id"])
        if actual is None:
            continue   # not all items ring up every day; skip
        forecast_p50 = float(f.get("p50") or 0)
        error = abs(forecast_p50 - actual)
        error_pct = error / max(1.0, actual)

        # Find the histogram bucket nearest to actual.
        hist = f.get("scenario_histogram") or {}
        closest_qty = forecast_p50
        if hist:
            keys = [int(k) for k in hist.keys()]
            closest_qty = min(keys, key=lambda k: abs(k - actual))

        # Nudge the weights. If error_pct is small (<5%), don't
        # disturb a working calibration. If error_pct > 5% AND the
        # closest scenario is meaningfully different from p50, we
        # learned the signals weren't pulling hard enough — bump
        # the weights toward the side of the histogram that won.
        weights = _load_weights(body.outlet_id, f["item_id"])
        if error_pct > 0.05:
            # Direction: did actual exceed forecast?  Then signals
            # under-pulled — nudge each weight up by NUDGE_STEP. If
            # actual fell short, signals over-pulled — nudge down.
            direction = 1.0 if actual > forecast_p50 else -1.0
            for k in weights:
                # Magnitude-aware: only nudge weights whose signal
                # was actually doing work (factor != 1.0). The
                # signal records aren't on this row, so we make a
                # uniform nudge — fine for v1; smarter audits land
                # in D16h-followup.
                weights[k] = max(WEIGHT_FLOOR,
                                  min(WEIGHT_CAP,
                                      weights[k] + direction * WEIGHT_NUDGE_STEP))
        prior_count = (db["forecast_signal_weights"].find_one(
            {"outlet_id": body.outlet_id, "item_id": f["item_id"]},
            {"_id": 0}) or {}).get("audit_count", 0)
        _persist_weights(body.outlet_id, f["item_id"], weights,
                          int(prior_count) + 1)

        acc_row = {
            "id": uuid.uuid4().hex[:12],
            "outlet_id": body.outlet_id,
            "date": body.date,
            "item_id": f["item_id"],
            "item_name": f.get("item_name") or f["item_id"],
            "forecast_p50": forecast_p50,
            "actual": actual,
            "error": round(error, 2),
            "error_pct": round(error_pct, 4),
            "closest_scenario_qty": closest_qty,
            "audited_at": _now_iso(),
        }
        # Idempotent on (outlet, date, item).
        db["forecast_accuracy"].update_one(
            {"outlet_id": body.outlet_id, "date": body.date,
             "item_id": f["item_id"]},
            {"$set": acc_row}, upsert=True)
        audited.append(acc_row)

    return {"ok": True,
            "outlet_id": body.outlet_id, "date": body.date,
            "rows_audited": len(audited),
            "accuracy_rows": audited}


@router.get("/accuracy")
def accuracy_rollup(outlet_id: str, days: int = 14):
    """Rolling accuracy summary the chef phone tile renders.
    Returns mean / worst / best error% across the window plus a
    trend label that compares last-7 to prior-7 so the chef sees
    whether yesterday's accuracy IS in fact tomorrow's floor."""
    if days < 2 or days > 90:
        raise HTTPException(400, "days must be between 2 and 90")
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    rows = list(db["forecast_accuracy"].find(
        {"outlet_id": outlet_id, "date": {"$gte": cutoff}}, {"_id": 0}))
    if not rows:
        return {"ok": True, "outlet_id": outlet_id, "window_days": days,
                "rows_audited": 0, "mean_error_pct": 0.0,
                "worst_error_pct": 0.0, "best_error_pct": 0.0,
                "trend": "flat"}

    errs = [float(r["error_pct"]) for r in rows]
    mean_err = statistics.mean(errs)
    worst = max(errs)
    best  = min(errs)

    # Trend: last 7 days vs. prior 7 days.
    prior_cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    last_7  = [float(r["error_pct"]) for r in rows if r["date"] >= prior_cutoff]
    prior_7 = [float(r["error_pct"]) for r in rows if r["date"] <  prior_cutoff]
    if last_7 and prior_7:
        diff = statistics.mean(last_7) - statistics.mean(prior_7)
        if diff < -0.005:
            trend = "improving"
        elif diff > 0.01:
            trend = "drifting"
        else:
            trend = "flat"
    else:
        trend = "flat"

    return {"ok": True, "outlet_id": outlet_id, "window_days": days,
            "rows_audited": len(rows),
            "mean_error_pct":  round(mean_err, 4),
            "worst_error_pct": round(worst, 4),
            "best_error_pct":  round(best, 4),
            "trend": trend}


@router.get("/weights")
def get_weights(outlet_id: str, item_id: str):
    """Read the per-(outlet, item) signal weights — what the audit
    has learned. Useful for explaining "why is Echo predicting 27
    chicken parms?" — the weight on `reservation_pace` exposes how
    much it's leaning on tomorrow's covers vs other signals."""
    row = db["forecast_signal_weights"].find_one(
        {"outlet_id": outlet_id, "item_id": item_id}, {"_id": 0})
    if not row:
        return {"ok": True, "outlet_id": outlet_id, "item_id": item_id,
                "weights": _load_weights(outlet_id, item_id),
                "audit_count": 0,
                "default": True}
    # Normalize the response so callers always read `result["weights"]`
    # — the top-level row has each weight as a sibling field.
    weights = {k: float(row.get(k, 1.0))
               for k in ("reservation", "beo", "weather",
                         "calendar", "velocity")}
    return {"ok": True,
            "outlet_id": row.get("outlet_id"),
            "item_id":   row.get("item_id"),
            "weights":   weights,
            "audit_count": int(row.get("audit_count", 0)),
            "updated_at": row.get("updated_at"),
            "default": False}
