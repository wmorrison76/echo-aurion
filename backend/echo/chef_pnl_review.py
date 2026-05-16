"""
D51 · Chef call P&L review (alternative to D42 distance-based).

D42 evaluated chef edits to Echo's orders by absolute distance to
actual sales: chef_was_right when |chef - actual| < |forecast - actual|.

That metric treats over- and under-stocking symmetrically. In a
real kitchen, they're not. Over-stocking wastes food cost.
Under-stocking loses ENTIRE retail-price sales (lost-revenue +
disappointed guest). The asymmetry matters.

This module is the alternative methodology — the chef's call is
judged on actual P&L impact across a 10-hour service window.

Inputs

  · forecast_qty       Echo's recommendation
  · chef_qty           chef's adjusted qty
  · service_window     10-hour window (e.g., 12pm–10pm)
  · hourly_actuals     actual demand per hour in the window
                       (or aggregated 10h actual + a curve)
  · selling_price      retail price per unit
  · food_cost          variable cost per unit produced
  · stockout_loss_factor  how much of selling_price you lose when
                          a guest walks away (default 1.0 — full
                          opportunity cost; some guests substitute
                          so 0.6–0.8 is realistic)

Output per strategy (forecast vs chef)

  · sales_revenue      = min(qty, demand) × selling_price
  · waste_cost         = max(qty - demand, 0) × food_cost
  · stockout_cost      = max(demand - qty, 0) × selling_price
                         × stockout_loss_factor
  · net_pnl            = sales_revenue - waste_cost - stockout_cost

Verdict

  chef_was_right     proposed_net > forecast_net by ≥ $5 OR ≥ 5%
  chef_was_wrong     forecast_net > proposed_net by ≥ $5 OR ≥ 5%
  inconclusive       within tolerance

Why this is better than D42's distance approach

  · Picks the chef's call when it AVOIDED a stockout that the
    forecast would have caused (chef was right even if their qty
    was further from the median, because the median would have
    sold out at hour 7 of a 10-hour window).
  · Penalizes the chef when they OVERSTOCKED a low-margin item
    (waste matters more on low-margin SKUs).
  · Captures the asymmetry that Operations actually feels.

Endpoints (all /api/echo/divergence-pnl)

  POST /evaluate     run the P&L evaluation on one divergence row
  POST /backtest/{outlet_id}   run on every divergence in a window
  GET  /summary/{outlet_id}    chef vs Echo P&L net win
"""
from __future__ import annotations

import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/echo/divergence-pnl",
                   tags=["echo-chef-pnl-review"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _emit_audit(tenant_id: str, kind: str, eid: str,
                payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"chef_pnl.{kind}",
            "entity_id": eid,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


# ─── Models ────────────────────────────────────────────────────────────

class EvaluateBody(BaseModel):
    outlet_id: str
    sku: str
    sku_name: Optional[str] = None
    forecast_qty: float = Field(..., ge=0)
    chef_qty: float = Field(..., ge=0)
    actual_total_demand: float = Field(..., ge=0)
    service_window_hours: int = Field(10, ge=1, le=24)
    hourly_demand_curve: Optional[List[float]] = None
    selling_price: float = Field(..., ge=0)
    food_cost: float = Field(..., ge=0)
    stockout_loss_factor: float = Field(0.7, ge=0, le=1.0)
    chef_id: Optional[str] = None


class BacktestBody(BaseModel):
    period_start: str
    period_end: str
    selling_price_default: float = 25.0
    food_cost_default: float = 8.0
    stockout_loss_factor: float = 0.7
    service_window_hours: int = 10


# ─── Core scenario simulator ──────────────────────────────────────────

def _scenario_pnl(
    qty_strategy: float,
    hourly_demand: List[float],
    selling_price: float,
    food_cost: float,
    stockout_loss_factor: float,
) -> Dict[str, float]:
    """Walk the service window hour by hour. Track remaining
    inventory; once exhausted, every demanded unit becomes a
    stockout.

    This captures the TIMING dimension D42 misses: a forecast
    that's "close" but stocks out at hour 7 of 10 loses 3 hours
    of sales, vs a chef call that's "further" but covers all 10
    hours.
    """
    inventory_left = float(qty_strategy)
    served = 0.0
    stockout_units = 0.0
    for d in hourly_demand:
        if inventory_left >= d:
            served += d
            inventory_left -= d
        else:
            served += inventory_left
            stockout_units += (d - inventory_left)
            inventory_left = 0
    waste = max(0, inventory_left)   # leftover = wasted food
    sales_revenue = round(served * selling_price, 2)
    waste_cost = round(waste * food_cost, 2)
    stockout_cost = round(
        stockout_units * selling_price * stockout_loss_factor, 2)
    net_pnl = round(sales_revenue - waste_cost - stockout_cost, 2)
    return {
        "qty_produced": qty_strategy,
        "units_served": round(served, 2),
        "units_wasted": round(waste, 2),
        "stockout_units": round(stockout_units, 2),
        "sales_revenue": sales_revenue,
        "waste_cost": waste_cost,
        "stockout_cost": stockout_cost,
        "net_pnl": net_pnl,
        "stocked_out": stockout_units > 0,
    }


def _build_demand_curve(total: float, hours: int,
                         provided: Optional[List[float]]
                         ) -> List[float]:
    """If hourly curve provided, use it (rescaled to total). Else
    apply a realistic dinner-service curve: ramp up, peak at 7pm,
    taper. For a 10-hour window 12pm–10pm:
      hours 0–2: 5%, 5%, 8%       (lunch ends)
      hours 3–4: 8%, 10%          (afternoon)
      hours 5–6: 14%, 18%         (early dinner)
      hours 7:   18%              (peak)
      hours 8–9: 10%, 4%          (winding down)
    Sums to 100%.
    """
    if provided and abs(sum(provided)) > 0:
        scale = total / sum(provided)
        return [v * scale for v in provided[:hours]]
    if hours == 10:
        weights = [0.05, 0.05, 0.08, 0.08, 0.10,
                    0.14, 0.18, 0.18, 0.10, 0.04]
    else:
        # Generic: cosine-shaped peak around middle
        import math
        weights = []
        for h in range(hours):
            x = (h + 0.5) / hours
            w = max(0.01, math.sin(x * math.pi) ** 2)
            weights.append(w)
        s = sum(weights)
        weights = [w / s for w in weights]
    return [w * total for w in weights]


# ─── 1. Evaluate one divergence ────────────────────────────────────────

@router.post("/evaluate")
def evaluate(
    body: EvaluateBody,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "evaluation requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()

    curve = _build_demand_curve(
        body.actual_total_demand,
        body.service_window_hours,
        body.hourly_demand_curve)

    forecast_outcome = _scenario_pnl(
        body.forecast_qty, curve,
        body.selling_price, body.food_cost,
        body.stockout_loss_factor)
    chef_outcome = _scenario_pnl(
        body.chef_qty, curve,
        body.selling_price, body.food_cost,
        body.stockout_loss_factor)

    delta = round(chef_outcome["net_pnl"]
                   - forecast_outcome["net_pnl"], 2)
    delta_pct = (delta / abs(forecast_outcome["net_pnl"])
                  if forecast_outcome["net_pnl"] != 0 else 0)
    if abs(delta) < 5.0 and abs(delta_pct) < 0.05:
        verdict = "inconclusive"
    elif delta > 0:
        verdict = "chef_was_right"
    else:
        verdict = "chef_was_wrong"

    explanation_parts = []
    if forecast_outcome["stocked_out"] and not chef_outcome["stocked_out"]:
        explanation_parts.append(
            f"chef avoided a stockout the forecast would have caused "
            f"({forecast_outcome['stockout_units']:.0f} units lost)")
    if chef_outcome["stocked_out"] and not forecast_outcome["stocked_out"]:
        explanation_parts.append(
            f"chef caused a stockout the forecast wouldn't have "
            f"({chef_outcome['stockout_units']:.0f} units lost)")
    if (forecast_outcome["units_wasted"] >
        chef_outcome["units_wasted"] * 1.5):
        explanation_parts.append(
            f"chef cut waste by {forecast_outcome['units_wasted'] - chef_outcome['units_wasted']:.0f} units")
    if (chef_outcome["units_wasted"] >
        forecast_outcome["units_wasted"] * 1.5):
        explanation_parts.append(
            f"chef increased waste by {chef_outcome['units_wasted'] - forecast_outcome['units_wasted']:.0f} units")
    if not explanation_parts:
        explanation_parts.append(
            f"net P&L delta ${delta:+.2f}; both strategies similar")

    eval_id = uuid.uuid4().hex[:16]
    record = {
        "id": eval_id,
        "tenant_id": tenant_id,
        "outlet_id": body.outlet_id,
        "sku": body.sku,
        "sku_name": body.sku_name,
        "service_window_hours": body.service_window_hours,
        "actual_total_demand": body.actual_total_demand,
        "forecast_outcome": forecast_outcome,
        "chef_outcome": chef_outcome,
        "delta_pnl": delta,
        "delta_pct": round(delta_pct, 4),
        "verdict": verdict,
        "explanation": "; ".join(explanation_parts),
        "chef_id": body.chef_id,
        "evaluated_at": _now_iso(),
    }
    db["chef_pnl_evaluations"].insert_one(record.copy())
    _emit_audit(tenant_id, "evaluate", eval_id, {
        "outlet_id": body.outlet_id, "sku": body.sku,
        "verdict": verdict, "delta_pnl": delta})
    # Hide chef_id on operator audience surface (§2.6)
    out = dict(record)
    if x_audience_register == "operator":
        out.pop("chef_id", None)
    return {"ok": True, **out}


# ─── 2. Backtest across all D42 divergences in a window ───────────────

@router.post("/backtest/{outlet_id}")
def backtest(
    outlet_id: str,
    body: BacktestBody,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "backtest requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()

    # Pull all D42 divergences in the period that have actual_sold
    divs = list(db["order_divergences"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "analysis_status": "analyzed"},
        {"_id": 0}).limit(5000))
    divs = [d for d in divs
            if (d.get("captured_at","")[:10] >= body.period_start
                and d.get("captured_at","")[:10] <= body.period_end
                and d.get("actual_sold") is not None)]
    if not divs:
        return {"ok": True,
                "outlet_id": outlet_id,
                "rows_evaluated": 0,
                "summary": None}

    chef_right = chef_wrong = inc = 0
    total_chef_pnl = 0.0
    total_forecast_pnl = 0.0
    per_row: List[Dict[str, Any]] = []

    for d in divs:
        # Look up sku metadata; fall back to defaults
        sku_meta = db["pos_menu_items"].find_one(
            {"tenant_id": tenant_id, "sku": d["sku"]}) or {}
        selling_price = float(sku_meta.get("price")
            or body.selling_price_default)
        food_cost = float(sku_meta.get("food_cost")
            or body.food_cost_default)

        body_eval = EvaluateBody(
            outlet_id=outlet_id, sku=d["sku"],
            sku_name=d.get("sku_name"),
            forecast_qty=float(d["forecast_qty"]),
            chef_qty=float(d["chef_qty"]),
            actual_total_demand=float(d["actual_sold"]),
            service_window_hours=body.service_window_hours,
            hourly_demand_curve=None,
            selling_price=selling_price,
            food_cost=food_cost,
            stockout_loss_factor=body.stockout_loss_factor,
            chef_id=d.get("chef_id"))
        # Direct call (skip audience-gate for backtest worker)
        curve = _build_demand_curve(
            body_eval.actual_total_demand,
            body_eval.service_window_hours, None)
        f_out = _scenario_pnl(body_eval.forecast_qty, curve,
            selling_price, food_cost,
            body.stockout_loss_factor)
        c_out = _scenario_pnl(body_eval.chef_qty, curve,
            selling_price, food_cost,
            body.stockout_loss_factor)
        delta = round(c_out["net_pnl"] - f_out["net_pnl"], 2)
        if abs(delta) < 5.0:
            verdict = "inconclusive"; inc += 1
        elif delta > 0:
            verdict = "chef_was_right"; chef_right += 1
        else:
            verdict = "chef_was_wrong"; chef_wrong += 1
        total_chef_pnl += c_out["net_pnl"]
        total_forecast_pnl += f_out["net_pnl"]
        per_row.append({
            "sku": d["sku"],
            "captured_at": d.get("captured_at"),
            "forecast_qty": d["forecast_qty"],
            "chef_qty": d["chef_qty"],
            "actual": d["actual_sold"],
            "forecast_net": f_out["net_pnl"],
            "chef_net": c_out["net_pnl"],
            "delta": delta,
            "verdict": verdict,
        })

    total = chef_right + chef_wrong + inc
    summary = {
        "rows_evaluated": total,
        "chef_right": chef_right,
        "chef_wrong": chef_wrong,
        "inconclusive": inc,
        "chef_win_rate_pct": (round(chef_right / total * 100, 1)
                               if total else 0),
        "total_chef_pnl": round(total_chef_pnl, 2),
        "total_forecast_pnl": round(total_forecast_pnl, 2),
        "net_chef_advantage": round(
            total_chef_pnl - total_forecast_pnl, 2),
    }
    return {"ok": True,
            "outlet_id": outlet_id,
            "service_window_hours": body.service_window_hours,
            "summary": summary,
            "per_row": per_row}


@router.get("/summary/{outlet_id}")
def summary(
    outlet_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "summary requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    rows = list(db["chef_pnl_evaluations"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id},
        {"_id": 0}).limit(5000))
    if not rows:
        return {"ok": True, "rows": 0, "summary": None}
    by_verdict: Dict[str, int] = {}
    chef_total = 0.0
    forecast_total = 0.0
    for r in rows:
        v = r.get("verdict") or "inconclusive"
        by_verdict[v] = by_verdict.get(v, 0) + 1
        chef_total += r["chef_outcome"]["net_pnl"]
        forecast_total += r["forecast_outcome"]["net_pnl"]
    return {"ok": True,
            "rows": len(rows),
            "by_verdict": by_verdict,
            "chef_pnl_total": round(chef_total, 2),
            "forecast_pnl_total": round(forecast_total, 2),
            "net_chef_advantage": round(
                chef_total - forecast_total, 2)}
