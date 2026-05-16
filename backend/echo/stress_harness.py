"""
D41 · Forecast stress-test harness + accuracy self-audit.

User directive: generate fake sales over a long-enough period to
test EchoAI³'s Monte Carlo forecast accuracy. Echo audits itself
on accuracy. When the chef changes an order Echo created, run
the divergence comparison.

This module is the harness for that. Three operations:

  1. /seed-sales
     Generate synthetic POS sales over N days for a set of items.
     Each item has a base demand, day-of-week multipliers, weekly
     seasonality, plus Gaussian noise. The result is realistic
     enough that a Monte Carlo forecast SHOULD be able to model
     it once it has 14+ days of history.

  2. /run-replay
     Walk the seeded period day by day. For each day D:
       a. Compute "forecast for D" from history before D using a
          simple but doctrine-aligned Monte Carlo (1000 trials,
          baseline = trailing-28d average × dow multiplier).
       b. Compare forecast median to the seeded "actual" for D.
       c. Persist the comparison row to forecast_replay_results.
     At the end: aggregate MAPE (mean absolute percent error),
     hit rate (% of days actual fell within forecast 5–95
     percentile band), and per-item accuracy.

  3. /accuracy-report
     Read forecast_replay_results, group by item / day-of-week /
     overall, return a clean accuracy dashboard. The CFO surface.

Self-audit framing per §2.4: Echo's own forecast IS audited as a
prediction event in D28. D29 retrospective then replays "did the
forecast nudges work?" and writes calibration findings. This
harness is the deterministic test path that ensures the forecast
fights its weight before live service depends on it.
"""
from __future__ import annotations

import random
import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/echo/stress",
                   tags=["echo-stress-harness"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Models ──────────────────────────────────────────────────────────────

class SeedSalesBody(BaseModel):
    outlet_id: str = Field(..., min_length=1)
    days: int = Field(60, ge=14, le=365)
    seed: int = 42
    items: Optional[List[Dict[str, Any]]] = None
    end_date: Optional[str] = None  # ISO date; default = today


class ReplayBody(BaseModel):
    outlet_id: str
    start_offset_days: int = 28   # need 28d warm-up before forecasting
    monte_carlo_trials: int = 1000


# ─── Default item catalog (used when caller doesn't supply) ────────────

DEFAULT_ITEMS: List[Dict[str, Any]] = [
    {"sku": "burger", "name": "Burger",
     "base_demand": 80, "dow_multipliers": [0.7,0.8,0.9,1.0,1.3,1.6,1.4]},
    {"sku": "caesar", "name": "Caesar Salad",
     "base_demand": 45, "dow_multipliers": [0.9,1.0,1.0,0.9,1.1,1.3,1.2]},
    {"sku": "ribeye", "name": "Ribeye",
     "base_demand": 30, "dow_multipliers": [0.5,0.6,0.7,0.8,1.4,1.8,1.6]},
    {"sku": "ceviche", "name": "Ceviche",
     "base_demand": 25, "dow_multipliers": [0.6,0.7,0.9,1.0,1.2,1.5,1.4]},
    {"sku": "pasta", "name": "Pasta Pomodoro",
     "base_demand": 60, "dow_multipliers": [0.8,0.9,1.0,1.0,1.2,1.4,1.3]},
    {"sku": "fries", "name": "Fries",
     "base_demand": 110, "dow_multipliers": [0.7,0.8,0.9,1.0,1.3,1.6,1.5]},
    {"sku": "tartare", "name": "Beef Tartare",
     "base_demand": 18, "dow_multipliers": [0.6,0.7,0.8,0.9,1.2,1.6,1.5]},
    {"sku": "tart", "name": "Apple Tart",
     "base_demand": 22, "dow_multipliers": [0.8,0.9,1.0,1.0,1.2,1.4,1.3]},
]


# ─── 1. Seed synthetic sales ────────────────────────────────────────────

@router.post("/seed-sales")
def seed_sales(
    body: SeedSalesBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    rng = random.Random(body.seed)
    items = body.items or DEFAULT_ITEMS

    if body.end_date:
        try:
            end = datetime.fromisoformat(body.end_date)
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(400, "end_date must be ISO date")
    else:
        end = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0)

    rows: List[Dict[str, Any]] = []
    for d in range(body.days):
        day = end - timedelta(days=body.days - 1 - d)
        dow = day.weekday()   # 0=Mon
        # Subtle weekly trend (revenue growing 0.5%/week) + monthly
        # seasonal swing (cosine over 28 days)
        week_idx = d / 7.0
        trend = 1.0 + (week_idx * 0.005)
        import math
        seasonal = 1.0 + 0.05 * math.cos(2 * math.pi * d / 28.0)

        for item in items:
            base = float(item["base_demand"]) * trend * seasonal
            mult = item["dow_multipliers"][dow]
            mu = base * mult
            # Gaussian noise (sigma=10% of mu); never negative
            sigma = max(2.0, mu * 0.10)
            qty = max(0, int(round(rng.gauss(mu, sigma))))
            row = {
                "tenant_id": tenant_id,
                "outlet_id": body.outlet_id,
                "date": day.date().isoformat(),
                "day_of_week": dow,
                "sku": item["sku"],
                "name": item["name"],
                "qty_sold": qty,
            }
            rows.append(row)

    # Wipe + replace stress collection so re-runs are clean
    db["pos_stress_sales"].rows = [
        r for r in db["pos_stress_sales"].rows
        if not (r.get("tenant_id") == tenant_id
                and r.get("outlet_id") == body.outlet_id)
    ] if hasattr(db["pos_stress_sales"], "rows") else []
    for r in rows:
        db["pos_stress_sales"].insert_one(r.copy())

    return {"ok": True,
            "tenant_id": tenant_id,
            "outlet_id": body.outlet_id,
            "days_seeded": body.days,
            "items_seeded": len(items),
            "rows_written": len(rows),
            "end_date": end.date().isoformat(),
            "start_date": (end - timedelta(days=body.days - 1)).date().isoformat()}


# ─── 2. Monte Carlo forecast for one day ────────────────────────────────

def _forecast_one_day(
    history: List[Dict[str, Any]], target_dow: int,
    trials: int, rng: random.Random,
) -> Dict[str, float]:
    """Per-item, given history rows up to (but not including) the
    target day, run trials trials of:
      base = trailing-28d average for THIS dow (or overall avg
             if fewer than 4 same-dow observations)
      pct  = ratio of (this dow avg) / (overall avg)
      noise = normal(1.0, 0.12)  # 12% noise
      qty   = base * pct * noise
    Return {p5, p25, p50, p75, p95, mean}."""
    if not history:
        return {"p5":0,"p25":0,"p50":0,"p75":0,"p95":0,"mean":0}
    same_dow = [h["qty_sold"] for h in history
                if h["day_of_week"] == target_dow]
    overall = [h["qty_sold"] for h in history]
    overall_avg = statistics.mean(overall) if overall else 0
    if len(same_dow) >= 4:
        base = statistics.mean(same_dow)
    else:
        # Not enough same-dow observations; fall back to overall avg
        base = overall_avg
    samples: List[float] = []
    for _ in range(trials):
        noise = rng.gauss(1.0, 0.12)
        samples.append(max(0.0, base * noise))
    samples.sort()
    n = len(samples)
    def pct(p): return samples[int(n * p)]
    return {
        "p5": round(pct(0.05), 1),
        "p25": round(pct(0.25), 1),
        "p50": round(pct(0.50), 1),
        "p75": round(pct(0.75), 1),
        "p95": round(pct(0.95), 1),
        "mean": round(statistics.mean(samples), 1),
    }


# ─── 3. Replay-and-compare ──────────────────────────────────────────────

@router.post("/run-replay")
def run_replay(
    body: ReplayBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    sales = list(db["pos_stress_sales"].find(
        {"tenant_id": tenant_id, "outlet_id": body.outlet_id},
        {"_id": 0}).limit(20000))
    if not sales:
        raise HTTPException(404,
            "no seeded sales found — call /seed-sales first")

    # Group by sku → list of (date_str, qty, dow)
    by_sku: Dict[str, List[Dict[str, Any]]] = {}
    for r in sales:
        by_sku.setdefault(r["sku"], []).append(r)
    for sku in by_sku:
        by_sku[sku].sort(key=lambda r: r["date"])

    # Sorted unique dates in entire test set
    all_dates = sorted({r["date"] for r in sales})
    start_idx = max(body.start_offset_days, 0)
    if start_idx >= len(all_dates):
        raise HTTPException(400,
            "start_offset_days exceeds seeded period")

    # Wipe existing replay results for this run
    db["forecast_replay_results"].rows = [
        r for r in db["forecast_replay_results"].rows
        if not (r.get("tenant_id") == tenant_id
                and r.get("outlet_id") == body.outlet_id)
    ] if hasattr(db["forecast_replay_results"], "rows") else []

    rng = random.Random(0)
    rows_written = 0
    per_item_errors: Dict[str, List[float]] = {}
    per_item_hits: Dict[str, List[int]] = {}

    for d_idx in range(start_idx, len(all_dates)):
        target_date = all_dates[d_idx]
        target_dt = datetime.fromisoformat(target_date).replace(
            tzinfo=timezone.utc)
        target_dow = target_dt.weekday()

        for sku, hist in by_sku.items():
            history = [h for h in hist if h["date"] < target_date]
            actual_row = next(
                (h for h in hist if h["date"] == target_date), None)
            if actual_row is None:
                continue
            actual = actual_row["qty_sold"]
            forecast = _forecast_one_day(history, target_dow,
                body.monte_carlo_trials, rng)
            ape = (abs(forecast["p50"] - actual) / max(1, actual))
            in_band = bool(forecast["p5"] <= actual <= forecast["p95"])
            row = {
                "tenant_id": tenant_id,
                "outlet_id": body.outlet_id,
                "date": target_date,
                "sku": sku,
                "actual": actual,
                "forecast_p50": forecast["p50"],
                "forecast_p5": forecast["p5"],
                "forecast_p95": forecast["p95"],
                "ape": round(ape, 4),
                "in_band": in_band,
                "history_size": len(history),
                "created_at": _now_iso(),
            }
            db["forecast_replay_results"].insert_one(row.copy())
            rows_written += 1
            per_item_errors.setdefault(sku, []).append(ape)
            per_item_hits.setdefault(sku, []).append(1 if in_band else 0)

    # Aggregate metrics
    overall_apes = [e for errs in per_item_errors.values() for e in errs]
    overall_hits = [h for hits in per_item_hits.values() for h in hits]
    per_item: Dict[str, Dict[str, float]] = {}
    for sku, errs in per_item_errors.items():
        per_item[sku] = {
            "mape_pct": round(statistics.mean(errs) * 100, 2),
            "hit_rate_pct": round(
                statistics.mean(per_item_hits[sku]) * 100, 1),
            "observations": len(errs),
        }

    summary = {
        "overall_mape_pct": round(
            statistics.mean(overall_apes) * 100, 2)
            if overall_apes else None,
        "overall_hit_rate_pct": round(
            statistics.mean(overall_hits) * 100, 1)
            if overall_hits else None,
        "per_item": per_item,
        "days_replayed": len(all_dates) - start_idx,
        "rows_written": rows_written,
    }
    return {"ok": True,
            "outlet_id": body.outlet_id,
            "summary": summary}


# ─── 4. Accuracy report (read-only) ─────────────────────────────────────

@router.get("/accuracy-report")
def accuracy_report(
    outlet_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    rows = list(db["forecast_replay_results"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id},
        {"_id": 0}).limit(20000))
    if not rows:
        return {"ok": True, "outlet_id": outlet_id,
                "rows": 0, "report": None}

    apes = [r["ape"] for r in rows]
    hits = [1 if r["in_band"] else 0 for r in rows]
    by_sku: Dict[str, Dict[str, List[float]]] = {}
    by_dow: Dict[int, Dict[str, List[float]]] = {}
    for r in rows:
        by_sku.setdefault(r["sku"], {"ape": [], "hit": []})
        by_sku[r["sku"]]["ape"].append(r["ape"])
        by_sku[r["sku"]]["hit"].append(1 if r["in_band"] else 0)
        d = datetime.fromisoformat(r["date"]).weekday()
        by_dow.setdefault(d, {"ape": [], "hit": []})
        by_dow[d]["ape"].append(r["ape"])
        by_dow[d]["hit"].append(1 if r["in_band"] else 0)

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "rows": len(rows),
        "report": {
            "overall_mape_pct": round(statistics.mean(apes) * 100, 2),
            "overall_hit_rate_pct": round(statistics.mean(hits) * 100, 1),
            "by_sku": {sku: {
                "mape_pct": round(statistics.mean(v["ape"]) * 100, 2),
                "hit_rate_pct": round(statistics.mean(v["hit"]) * 100, 1),
                "observations": len(v["ape"]),
            } for sku, v in by_sku.items()},
            "by_day_of_week": {str(d): {
                "mape_pct": round(statistics.mean(v["ape"]) * 100, 2),
                "hit_rate_pct": round(statistics.mean(v["hit"]) * 100, 1),
                "observations": len(v["ape"]),
            } for d, v in by_dow.items()},
        },
    }
