"""
D29 · Monte Carlo retrospective replay analyzer.

Per the Echo AI³ Integrated Technical Specification §2.4:

  "When the system is wrong — and the system will be wrong — the
   response is not weight adjustment. It is investigation. The system
   runs back through its own decision space and finds the iteration
   where the right answer existed."

The seven steps from the doctrine, made executable:

  1. Outcome captured — D28 outcome events (parent_event_id → prediction)
  2. Variance computed — abs(forecast_p50 - actual) / max(actual, 1)
  3. Decision space replayed — perturb the decision_features stored in
     payload._retrospective and re-run the prediction
  4. Right-answer iteration identified — argmin variance across
     replays
  5. Distinguishing features extracted — diff between original
     features and the right-answer iteration's
  6. Features added to integration queue — `retrospective_findings`
     collection drained nightly by the existing scheduler.py
     _run_forecast_audit cron (D25)
  7. NOTHING SURFACES TO THE OPERATOR — pride done where no one is
     watching (§2.4 final paragraph)

What this module owns:
  · The replay walker (deterministic — same inputs reproduce)
  · The findings persister (never touches operator UI; not even an
    inbox row — by design per §2.5 "pride from love, not pride from
    fear")
  · The integration-queue read API (only audience=pass_dev)

What this module deliberately does NOT do:
  · Surface findings to operators
  · Compute "system performance" metrics
  · Fire alarms when accuracy dips
  · Anything that violates §2.5 fear-formation discipline

Pre-mortem (per the doctrine's "How it could fail" pattern):
  · Storage cost pressure to drop retrospective metadata.
    Mitigation: payload._retrospective is required by D28 contract
    on every prediction event; cost is measured but not reduced.
  · Engineers skipping retrospective on "obvious" errors that turn
    out not to be obvious.
    Mitigation: the analyzer runs over EVERY outcome event with
    parent_event_id; no filtering by error magnitude.
  · Replay queue bloating beyond useful processing capacity.
    Mitigation: findings are batch-written; the cron drains them
    overnight; the queue can grow unbounded between runs because
    there's no operator dependency.
"""
from __future__ import annotations

import math
import statistics
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from database import db
from echo.events import append_event, AppendEventBody

router = APIRouter(prefix="/api/echo/retrospective", tags=["echo-retrospective"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Step 1+2: outcome capture is upstream (D28); variance compute here ──

def _variance(forecast: float, actual: float) -> Dict[str, float]:
    """Variance metrics. We compute several so different downstream
    learners can pick what fits — symmetric percent error for
    comparability, signed delta for direction, raw distance for
    magnitude."""
    actual_floor = max(1.0, abs(actual))
    return {
        "delta": float(actual) - float(forecast),
        "abs_error": abs(float(actual) - float(forecast)),
        "pct_error": abs(float(actual) - float(forecast)) / actual_floor,
        # MAPE-style symmetric (caps when forecast=0)
        "symmetric_pct": (
            abs(float(actual) - float(forecast))
            / max(0.5 * (abs(actual) + abs(forecast)), 1.0)
        ),
    }


# ─── Step 3+4: decision-space replay ────────────────────────────────────

# Perturbation grid for replay. Each weight in decision_features gets
# tested at five magnitudes: large down, small down, original, small
# up, large up. Combined with the others this is intentionally coarse
# — the doctrine §2.4 emphasizes investigation, not exhaustive search.
# The chef's apprenticeship model: replay the service to find the
# moment attention slipped, not to enumerate every alternate timeline.
_PERTURBATIONS = (0.5, 0.85, 1.0, 1.15, 1.5)


def _replay_decision_space(
    *,
    decision_features: Dict[str, float],
    forecast: float,
    actual: float,
    base_demand: Optional[float] = None,
) -> Dict[str, Any]:
    """For a recorded prediction, perturb each decision_feature
    independently and find the perturbation that would have produced
    the closest-to-actual forecast.

    The replay is INDEPENDENT per feature — we don't sweep all combos
    (combinatorial blowup at scale). Instead we ask "if reservation
    weight had been 1.15× what it was, how much closer would we have
    been?" for each feature in turn.

    Returns:
      {
        per_feature: { feature_name: { best_multiplier, est_forecast,
                                         improvement } },
        best_feature: name of the feature whose perturbation got
                       closest to actual,
        best_multiplier: that feature's winning multiplier,
        improvement: how much closer the replay got
      }
    """
    if not decision_features:
        return {"per_feature": {}, "best_feature": None,
                "best_multiplier": 1.0, "improvement": 0.0}
    if base_demand is None:
        # Estimate base from forecast and the product of the original
        # weights (assumes f = base * Π features).
        prod = 1.0
        for v in decision_features.values():
            try:
                prod *= float(v)
            except Exception:
                continue
        base_demand = (float(forecast) / prod) if prod > 0 else float(forecast)

    original_error = abs(float(forecast) - float(actual))
    per_feature: Dict[str, Any] = {}
    best_overall = None

    for fname, fval in decision_features.items():
        try:
            fval = float(fval)
        except Exception:
            continue
        per: Dict[str, Any] = {"original_value": fval, "trials": []}
        winner = None
        for mult in _PERTURBATIONS:
            new_val = fval * mult
            # Recompute the prediction with this one feature perturbed.
            other_prod = 1.0
            for o_name, o_val in decision_features.items():
                if o_name == fname:
                    continue
                try:
                    other_prod *= float(o_val)
                except Exception:
                    continue
            est_forecast = base_demand * other_prod * new_val
            err = abs(est_forecast - float(actual))
            trial = {
                "multiplier": mult,
                "value": new_val,
                "est_forecast": round(est_forecast, 2),
                "error": round(err, 2),
            }
            per["trials"].append(trial)
            if winner is None or err < winner["error"]:
                winner = trial
        per["best"] = winner
        per_feature[fname] = per
        improvement = original_error - winner["error"]
        if (best_overall is None
            or improvement > best_overall["improvement"]):
            best_overall = {
                "feature": fname,
                "multiplier": winner["multiplier"],
                "value": winner["value"],
                "improvement": improvement,
            }

    return {
        "per_feature": per_feature,
        "best_feature": (best_overall or {}).get("feature"),
        "best_multiplier": (best_overall or {}).get("multiplier", 1.0),
        "improvement": round((best_overall or {}).get("improvement", 0.0), 2),
    }


# ─── Step 5+6: extract distinguishing features → integration queue ──────

def _persist_finding(
    *,
    tenant_id: str,
    prediction_event_id: str,
    outcome_event_id: str,
    forecast: float,
    actual: float,
    variance: Dict[str, float],
    replay: Dict[str, Any],
) -> Dict[str, Any]:
    """Write a row to retrospective_findings. The nightly forecast
    audit cron (scheduler.py:_run_forecast_audit, D25) drains this
    queue. Findings are NOT surfaced to operators — §2.4 final
    paragraph: 'Nothing surfaces to the operator. Pride done where
    no one is watching.'

    We also append a calibration event to the D28 log so the chain
    is auditable end-to-end."""
    finding = {
        "id": uuid.uuid4().hex[:12],
        "tenant_id": tenant_id,
        "prediction_event_id": prediction_event_id,
        "outcome_event_id": outcome_event_id,
        "forecast": float(forecast),
        "actual": float(actual),
        "variance": variance,
        "replay": replay,
        "applied": False,        # set true when nightly cron ingests
        "created_at": _now_iso(),
    }
    db["retrospective_findings"].insert_one(finding.copy())

    # Audit chain: emit a calibration event so the D28 log records
    # that we ran the retrospective. This is what makes §2.4
    # traceable in production — we can later prove "the system DID
    # learn from miss X" by retrieving the calibration event.
    append_event(AppendEventBody(
        kind="calibration",
        sensitivity="ordinary",
        parent_event_id=prediction_event_id,
        payload={
            "finding_id": finding["id"],
            "outcome_event_id": outcome_event_id,
            "variance_pct": variance.get("pct_error"),
            "best_feature": replay.get("best_feature"),
            "best_multiplier": replay.get("best_multiplier"),
            "improvement": replay.get("improvement"),
        }), tenant_id=tenant_id)
    return finding


# ─── Public entry points ────────────────────────────────────────────────

class AnalyzeBody(BaseModel):
    """Caller passes prediction + outcome ids for one specific replay.
    Used by tests and by /run-batch internally. Routine production
    flow uses /run-batch via the cron."""
    prediction_event_id: str
    outcome_event_id: str


@router.post("/analyze")
def analyze_one(body: AnalyzeBody,
                 x_tenant_id: Optional[str] = Header(None),
                 x_audience_register: Optional[str] = Header(None)):
    """Analyze a single (prediction, outcome) pair. Audience register
    must be pass_dev — the retrospective is internal-only by doctrine."""
    if x_audience_register != "pass_dev":
        raise HTTPException(403,
            "retrospective analyzer requires audience=pass_dev "
            "(§2.4 — pride done where no one is watching)")
    tenant_id = (x_tenant_id or "default").strip().lower()

    pred = db["echo_events"].find_one(
        {"id": body.prediction_event_id, "tenant_id": tenant_id,
         "kind": "prediction"}, {"_id": 0})
    if not pred:
        raise HTTPException(404, "prediction event not found")
    out = db["echo_events"].find_one(
        {"id": body.outcome_event_id, "tenant_id": tenant_id,
         "kind": "outcome",
         "parent_event_id": body.prediction_event_id}, {"_id": 0})
    if not out:
        raise HTTPException(404, "outcome event not found or not linked "
                                  "to that prediction")

    # Pull the retrospective metadata stamped on the prediction
    retro = (pred.get("payload") or {}).get("_retrospective") or {}
    decision_features = retro.get("decision_features") or {}
    forecast = float((pred.get("payload") or {}).get("forecast_p50")
                     or (pred.get("payload") or {}).get("forecast")
                     or 0)
    actual = float((out.get("payload") or {}).get("actual")
                   or (out.get("payload") or {}).get("qty_sold")
                   or 0)
    variance = _variance(forecast, actual)
    replay = _replay_decision_space(
        decision_features=decision_features,
        forecast=forecast,
        actual=actual)
    finding = _persist_finding(
        tenant_id=tenant_id,
        prediction_event_id=body.prediction_event_id,
        outcome_event_id=body.outcome_event_id,
        forecast=forecast, actual=actual,
        variance=variance, replay=replay)
    return {"ok": True, "finding": finding}


class RunBatchBody(BaseModel):
    since: Optional[str] = None     # ISO; default = 24h ago
    limit: int = 200
    only_unanalyzed: bool = True    # skip outcomes whose findings exist


@router.post("/run-batch")
def run_batch(body: RunBatchBody,
               x_tenant_id: Optional[str] = Header(None),
               x_audience_register: Optional[str] = Header(None)):
    """Sweep recent outcomes; for each, run analyze_one. The nightly
    forecast-audit cron (D25 _run_forecast_audit) calls this so the
    retrospective practice runs during quiet hours per §3.4."""
    if x_audience_register != "pass_dev":
        raise HTTPException(403,
            "retrospective batch requires audience=pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()
    since = body.since or (datetime.now(timezone.utc)
                            - timedelta(days=1)).isoformat()

    outcomes = list(db["echo_events"].find(
        {"tenant_id": tenant_id, "kind": "outcome",
         "occurred_at": {"$gte": since}}, {"_id": 0})
        .sort("occurred_at", -1).limit(max(1, min(2000, body.limit))))

    # Skip outcomes already analyzed
    if body.only_unanalyzed:
        analyzed_pred_ids = {
            f.get("prediction_event_id") for f in
            db["retrospective_findings"].find({"tenant_id": tenant_id})
        }
        outcomes = [o for o in outcomes
                     if o.get("parent_event_id") not in analyzed_pred_ids]

    findings: List[Dict[str, Any]] = []
    skipped_no_pred = 0
    for o in outcomes:
        pred_id = o.get("parent_event_id")
        if not pred_id:
            skipped_no_pred += 1
            continue
        pred = db["echo_events"].find_one(
            {"id": pred_id, "tenant_id": tenant_id,
             "kind": "prediction"}, {"_id": 0})
        if not pred:
            skipped_no_pred += 1
            continue
        retro = (pred.get("payload") or {}).get("_retrospective") or {}
        decision_features = retro.get("decision_features") or {}
        forecast = float((pred.get("payload") or {}).get("forecast_p50")
                         or (pred.get("payload") or {}).get("forecast")
                         or 0)
        actual = float((o.get("payload") or {}).get("actual")
                       or (o.get("payload") or {}).get("qty_sold")
                       or 0)
        variance = _variance(forecast, actual)
        replay = _replay_decision_space(
            decision_features=decision_features,
            forecast=forecast, actual=actual)
        findings.append(_persist_finding(
            tenant_id=tenant_id,
            prediction_event_id=pred_id,
            outcome_event_id=o["id"],
            forecast=forecast, actual=actual,
            variance=variance, replay=replay))

    return {"ok": True, "tenant_id": tenant_id,
            "analyzed": len(findings),
            "skipped_no_prediction": skipped_no_pred,
            "findings": findings[:50]}   # head only — full list via /findings


@router.get("/findings")
def list_findings(applied: Optional[bool] = None,
                   limit: int = 200,
                   x_tenant_id: Optional[str] = Header(None),
                   x_audience_register: Optional[str] = Header(None)):
    """Read the integration queue. Audience must be pass_dev because
    this is internal — operators don't see findings."""
    if x_audience_register != "pass_dev":
        raise HTTPException(403,
            "retrospective findings require audience=pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if applied is not None:
        q["applied"] = applied
    rows = list(db["retrospective_findings"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(max(1, min(2000, limit))))
    return {"ok": True, "tenant_id": tenant_id,
            "total": len(rows), "findings": rows}


class ApplyBody(BaseModel):
    finding_ids: List[str]


@router.post("/findings/apply")
def mark_applied(body: ApplyBody,
                  x_tenant_id: Optional[str] = Header(None),
                  x_audience_register: Optional[str] = Header(None)):
    """Mark findings as ingested by the nightly cron. The cron reads
    /findings?applied=false, drains them into the model's signal-
    weight store (e.g. forecast_signal_weights from D16h), then
    POSTs back here to flip the flag.

    This is the §2.4 step 6 boundary: 'Features added to integration
    queue. Overnight, during quiet-hours integration, these features
    inform the next iteration of decision logic.'"""
    if x_audience_register != "pass_dev":
        raise HTTPException(403,
            "retrospective apply requires audience=pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()
    matched = 0
    for fid in body.finding_ids:
        r = db["retrospective_findings"].update_one(
            {"id": fid, "tenant_id": tenant_id},
            {"$set": {"applied": True, "applied_at": _now_iso()}})
        matched += getattr(r, "matched_count", 0) or 0
    return {"ok": True, "applied": matched, "tenant_id": tenant_id}
