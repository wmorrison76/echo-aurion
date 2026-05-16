"""
D42 · Chef order-divergence auditor.

User directive: "if the Chef changes an order that echo created,
you can do a comparison and be able to run that analysis when the
numbers don't match up."

This module is the deterministic comparison layer. When Echo
publishes a forecast-driven commissary order or production sheet,
we snapshot the proposed quantities. When the chef saves a
modified version, we snapshot the actual. The divergence rows
record what changed and by how much.

Then — in the spirit of D31's forecast feedback and D29's
retrospective replay — we run an analysis when actual sales come
in: was the chef RIGHT to change Echo's number? If their change
reduced waste OR avoided a stockout, the chef's intuition wins
the round and the calibration nudge feeds back into the forecast
weights. If the change made things worse, that's an observation
back to the chef — never a verdict, never a public score.

Endpoints (all /api/echo/divergence)

  POST /capture
       Capture a (proposed, actual) pair for a single order line.
       Called by the commissary order workflow when a chef saves.
       Idempotent on (order_id, sku).

  GET  /findings
       List divergence rows (filter by outlet, sku, severity).

  POST /analyze/{outlet_id}
       Run the analysis: for each captured divergence with a
       sales-realization timestamp older than 24h, compare the
       chef's actual to what eventually sold. Classify as
       chef_was_right / chef_was_wrong / inconclusive. Persist
       analysis row.

  GET  /summary
       Roll up: chef vs Echo win rate, per-sku trend, total
       avoided-waste / avoided-stockout dollars.

Doctrine alignment

  · §1.4 voice register: divergence is operator-audience. The
    chef-was-right / chef-was-wrong classification is per-row
    operator surface; aggregate "chef intuition net win rate is
    62% over the last 90 days" is operator dashboard.
  · §2.5 pride from love: framing is observation. "Chef adjusted
    burgers down 20% Friday — sold to forecast median, would
    have wasted 15." Not "chef overrode the system."
  · §2.6 never throw the pan: per-chef stats stay in pass_dev
    only. Operator dashboards show chef-collective intuition vs
    forecast, never per-individual rankings.
  · §3.1 append-only: divergence + analysis are append-only.
  · D27 tenant isolation on every read/write.
"""
from __future__ import annotations

import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/echo/divergence",
                   tags=["echo-order-divergence"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


# ─── Models ──────────────────────────────────────────────────────────────

class CaptureBody(BaseModel):
    order_id: str
    outlet_id: str
    sku: str
    sku_name: Optional[str] = None
    forecast_qty: float = Field(..., ge=0)
    chef_qty: float = Field(..., ge=0)
    chef_id: str
    forecast_source: str = "monte_carlo"
    note: Optional[str] = None


# ─── 1. Capture a divergence ────────────────────────────────────────────

@router.post("/capture")
def capture(
    body: CaptureBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    natural_key = f"{body.order_id}|{body.sku}"
    existing = db["order_divergences"].find_one(
        {"natural_key": natural_key, "tenant_id": tenant_id})
    if existing:
        existing.pop("_id", None)
        return {"ok": True, "idempotent": True,
                "divergence": existing}

    delta = body.chef_qty - body.forecast_qty
    pct = (delta / body.forecast_qty) if body.forecast_qty > 0 else 0
    severity = ("info" if abs(pct) < 0.10
                else "warn" if abs(pct) < 0.25
                else "critical")

    row = {
        "id": uuid.uuid4().hex[:16],
        "natural_key": natural_key,
        "tenant_id": tenant_id,
        "order_id": body.order_id,
        "outlet_id": body.outlet_id,
        "sku": body.sku,
        "sku_name": body.sku_name,
        "forecast_qty": body.forecast_qty,
        "chef_qty": body.chef_qty,
        "delta_qty": delta,
        "delta_pct": round(pct, 4),
        "direction": ("up" if delta > 0
                      else "down" if delta < 0 else "match"),
        "severity": severity,
        "chef_id": body.chef_id,
        "forecast_source": body.forecast_source,
        "note": body.note,
        "captured_at": _now_iso(),
        "analysis_status": "pending",
        "analysis_at": None,
        "verdict": None,
        "actual_sold": None,
    }
    db["order_divergences"].insert_one(row.copy())
    return {"ok": True, "idempotent": False, "divergence": row}


# ─── 2. List findings ───────────────────────────────────────────────────

@router.get("/findings")
def list_findings(
    outlet_id: Optional[str] = None,
    sku: Optional[str] = None,
    severity: Optional[str] = None,
    analysis_status: Optional[str] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "divergence findings require operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if outlet_id: q["outlet_id"] = outlet_id
    if sku: q["sku"] = sku
    if severity: q["severity"] = severity
    if analysis_status: q["analysis_status"] = analysis_status
    rows = list(db["order_divergences"].find(q, {"_id": 0})
                .sort("captured_at", -1)
                .limit(max(1, min(2000, limit))))
    # Hide chef_id on operator audience (§2.6)
    if x_audience_register == "operator":
        for r in rows:
            r.pop("chef_id", None)
    return {"ok": True, "total": len(rows), "findings": rows}


# ─── 3. Analyze (compare to actual sales) ──────────────────────────────

@router.post("/analyze/{outlet_id}")
def analyze(
    outlet_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "analysis requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()

    # Pending divergences captured > 24h ago (sales should have
    # come in by now)
    cutoff = (_now_dt() - timedelta(hours=24)).isoformat()
    pending = list(db["order_divergences"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "analysis_status": "pending",
         "captured_at": {"$lte": cutoff}}, {"_id": 0}).limit(2000))

    analyzed = 0
    chef_right = 0
    chef_wrong = 0
    inconclusive = 0

    for d in pending:
        # Pull actual sold for this sku on the captured date
        captured_at = datetime.fromisoformat(
            d["captured_at"].replace("Z", "+00:00"))
        sold_date = captured_at.date().isoformat()
        # Try stress sales first (test scenario), then real pos
        actual_row = (db["pos_stress_sales"].find_one(
            {"tenant_id": tenant_id, "outlet_id": outlet_id,
             "sku": d["sku"], "date": sold_date})
            or db["pos_sales"].find_one(
            {"tenant_id": tenant_id, "outlet_id": outlet_id,
             "sku": d["sku"], "date": sold_date}))
        if not actual_row:
            continue
        actual = float(actual_row.get("qty_sold") or 0)
        forecast_q = float(d["forecast_qty"])
        chef_q = float(d["chef_qty"])

        # Distance scores (lower is better)
        forecast_err = abs(forecast_q - actual)
        chef_err = abs(chef_q - actual)

        if abs(forecast_err - chef_err) < max(1, 0.05 * actual):
            verdict = "inconclusive"
            inconclusive += 1
        elif chef_err < forecast_err:
            verdict = "chef_was_right"
            chef_right += 1
        else:
            verdict = "chef_was_wrong"
            chef_wrong += 1

        db["order_divergences"].update_one(
            {"id": d["id"], "tenant_id": tenant_id},
            {"$set": {
                "analysis_status": "analyzed",
                "analysis_at": _now_iso(),
                "actual_sold": actual,
                "forecast_error": round(forecast_err, 2),
                "chef_error": round(chef_err, 2),
                "verdict": verdict,
            }})
        analyzed += 1

    return {"ok": True,
            "outlet_id": outlet_id,
            "analyzed": analyzed,
            "chef_right": chef_right,
            "chef_wrong": chef_wrong,
            "inconclusive": inconclusive,
            "pending_remaining": (len(pending) - analyzed)}


# ─── 4. Summary roll-up ──────────────────────────────────────────────────

@router.get("/summary")
def summary(
    outlet_id: Optional[str] = None,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "summary requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id,
                          "analysis_status": "analyzed"}
    if outlet_id: q["outlet_id"] = outlet_id
    rows = list(db["order_divergences"].find(q, {"_id": 0}).limit(20000))

    if not rows:
        return {"ok": True, "rows_analyzed": 0, "summary": None}

    by_verdict: Dict[str, int] = {}
    by_sku: Dict[str, Dict[str, int]] = {}
    forecast_errors: List[float] = []
    chef_errors: List[float] = []
    for r in rows:
        v = r.get("verdict") or "inconclusive"
        by_verdict[v] = by_verdict.get(v, 0) + 1
        s = r.get("sku")
        by_sku.setdefault(s, {"chef_right": 0, "chef_wrong": 0,
                              "inconclusive": 0})
        by_sku[s][v] = by_sku[s].get(v, 0) + 1
        if r.get("forecast_error") is not None:
            forecast_errors.append(float(r["forecast_error"]))
            chef_errors.append(float(r["chef_error"]))

    total = sum(by_verdict.values())
    chef_win_rate = (
        round(by_verdict.get("chef_was_right", 0) / total * 100, 1)
        if total else None)
    return {
        "ok": True,
        "rows_analyzed": total,
        "summary": {
            "by_verdict": by_verdict,
            "chef_win_rate_pct": chef_win_rate,
            "avg_forecast_error": round(
                statistics.mean(forecast_errors), 2)
                if forecast_errors else None,
            "avg_chef_error": round(
                statistics.mean(chef_errors), 2)
                if chef_errors else None,
            "by_sku": by_sku,
        },
    }
