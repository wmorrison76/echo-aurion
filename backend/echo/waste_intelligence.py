"""
D31 · Echo waste intelligence layer.

The existing echowaste.py is real and substantive — buffet capture,
single-plate scan, voice capture, vision stub, manual correction,
training feedback. Good bones. What it lacked: the INTELLIGENCE
that turns waste captures into actionable signal.

This module sits on top of echowaste data + emits to the D28 event
log so the chef sees the patterns, not the raw images.

Four capabilities:

  1. Waste pattern recognition
     Aggregate captures by station / cook / shift / item / day-part.
     Surface "Tuesday 6pm hot line wastes 3× the median" so coaching
     happens on patterns, not single incidents (§2.6 — never throw
     the pan).

  2. Forecast feedback loop
     When buffet over-produces, push a calibration signal to the
     D16h forecast: "Sunday brunch beef ribeye over-produced 14%
     last 3 weeks; suggest base_demand_dow_avg ↓ 12%."
     The signal is a D29 retrospective finding so the cron drains
     it overnight (§3.4 morning standup).

  3. Plating QC
     Compare a plate scan against the menu spec (recipe yield + plate
     style). Flag yield mismatch (we serve 4oz when menu says 6oz)
     and visible deviation (sauce streak, garnish missing).
     Output is a `prediction` event in operator register so the chef
     can drill in; nothing surfaces to the line cook directly.

  4. Cook attribution roll-up
     Group waste by station / cook / shift WITHOUT naming individuals
     in the output. The doctrine forbids surveillance language. The
     chef sees patterns; coaching happens through patterns; the
     individual stays anonymous on the operator dashboard. Pass_dev
     audit can drill to the row-level if a labor or HR investigation
     requires it.

Doctrine alignment

  · §1.4 voice register: predictions in operator register; pattern
    findings in operator audience-only.
  · §2.5 pride from love: framing is observation. "Ribeye is over-
    produced" not "Cook X is wasteful."
  · §2.6 never throw the pan: cook attribution rolls up by station/
    shift; individual identification is pass_dev only.
  · §3.1 append-only: every finding emitted to D28 events; D29
    retrospective can later analyze "which forecast nudges from
    waste signals were correct."
"""
from __future__ import annotations

import statistics
import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from echo.events import append_event, AppendEventBody

router = APIRouter(prefix="/api/echo/waste-intel", tags=["echo-waste-intel"])


# Tunables
PATTERN_LOOKBACK_DAYS = 28
PATTERN_MIN_OBSERVATIONS = 4   # don't over-fit on 1 weird night
OVERPRODUCTION_THRESHOLD_PCT = 0.10
PLATING_YIELD_TOLERANCE = 0.10


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── 1. Waste pattern recognition ────────────────────────────────────────

@router.get("/patterns")
def waste_patterns(
    outlet_id: Optional[str] = None,
    lookback_days: int = PATTERN_LOOKBACK_DAYS,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Aggregate waste entries by (station, day_of_week, hour_bucket,
    item) and surface buckets where waste is statistically elevated.

    Output is operator-audience: the chef sees patterns. Cook names
    are NOT in the output — that's a §2.6 boundary."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "waste patterns require audience=operator or pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()
    since = (datetime.now(timezone.utc)
              - timedelta(days=lookback_days)).isoformat()

    q: Dict[str, Any] = {"tenant_id": tenant_id,
                          "captured_at": {"$gte": since}}
    if outlet_id:
        q["outlet_id"] = outlet_id
    entries = list(db["echowaste_entries"].find(q, {"_id": 0}).limit(5000))
    if not entries:
        return {"ok": True, "outlet_id": outlet_id,
                "lookback_days": lookback_days,
                "entries_analyzed": 0, "patterns": []}

    # Bucket: (station, dow, hour_bucket, item_id) → list of weights
    buckets: Dict[Tuple[Any, ...], List[float]] = defaultdict(list)
    item_totals: Dict[str, List[float]] = defaultdict(list)
    for e in entries:
        try:
            ts = datetime.fromisoformat(
                str(e.get("captured_at")).replace("Z", "+00:00"))
            if ts.tzinfo is None: ts = ts.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        dow = ts.weekday()
        hour_bucket = ts.hour - (ts.hour % 4)   # 6h windows
        for item in (e.get("items") or []):
            station = item.get("station") or e.get("station") or "unknown"
            iid = item.get("recipe_id") or item.get("item_id") or "unknown"
            weight = float(item.get("weight_oz") or item.get("weight") or 0)
            if weight <= 0:
                continue
            buckets[(station, dow, hour_bucket, iid)].append(weight)
            item_totals[iid].append(weight)

    patterns: List[Dict[str, Any]] = []
    for key, weights in buckets.items():
        if len(weights) < PATTERN_MIN_OBSERVATIONS:
            continue
        station, dow, hour_bucket, iid = key
        all_for_item = item_totals.get(iid, [])
        if len(all_for_item) < PATTERN_MIN_OBSERVATIONS:
            continue
        bucket_avg = statistics.mean(weights)
        item_median = statistics.median(all_for_item)
        if item_median <= 0:
            continue
        ratio = bucket_avg / item_median
        if ratio < 1.5:
            continue   # not elevated; skip
        patterns.append({
            "station": station,
            "day_of_week": dow,
            "hour_bucket": f"{hour_bucket:02d}:00-{hour_bucket+4:02d}:00",
            "item_id": iid,
            "observation_count": len(weights),
            "avg_weight": round(bucket_avg, 2),
            "item_median": round(item_median, 2),
            "elevation_ratio": round(ratio, 2),
            "severity": (
                "critical" if ratio >= 3.0
                else "warn" if ratio >= 2.0
                else "info"),
            "explanation": (
                f"{station} produces {iid} at {ratio:.1f}× the item's "
                f"median waste during {hour_bucket:02d}:00-{hour_bucket+4:02d}:00 "
                f"on dow={dow}. {len(weights)} observations over "
                f"{lookback_days} days."
            ),
        })

    patterns.sort(key=lambda p: -p["elevation_ratio"])

    # Emit findings to D28 for the strongest patterns (operator
    # register; pattern stays observable but anonymous per §2.6).
    for p in patterns[:5]:
        try:
            append_event(AppendEventBody(
                kind="prediction", voice_register="operator",
                sensitivity="ordinary", confidence=0.7,
                payload={
                    "domain": "waste_pattern",
                    "station": p["station"],
                    "item_id": p["item_id"],
                    "elevation_ratio": p["elevation_ratio"],
                    "severity": p["severity"],
                    "explanation": p["explanation"],
                    "_retrospective": {"decision_features": {
                        "elevation": p["elevation_ratio"],
                        "observations": p["observation_count"],
                    }},
                }), tenant_id=tenant_id)
        except Exception:
            pass

    return {"ok": True, "tenant_id": tenant_id,
            "outlet_id": outlet_id,
            "lookback_days": lookback_days,
            "entries_analyzed": len(entries),
            "patterns_found": len(patterns),
            "patterns": patterns}


# ─── 2. Forecast feedback loop ───────────────────────────────────────────

@router.post("/forecast-feedback/{outlet_id}")
def forecast_feedback(
    outlet_id: str,
    lookback_days: int = 21,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Walk recent buffet sessions; for each item with consistent
    over- or under-production, write a calibration signal that the
    D29 retrospective queue ingests. The forecast (D16h) reads the
    queue and adjusts base_demand_dow_avg overnight (§3.4 morning
    standup)."""
    if x_audience_register != "pass_dev":
        raise HTTPException(403,
            "forecast feedback runs in pass_dev (§2.4 — investigation, "
            "not real-time reinforcement)")
    tenant_id = (x_tenant_id or "default").strip().lower()
    since = (datetime.now(timezone.utc)
              - timedelta(days=lookback_days)).isoformat()
    sessions = list(db["echowaste_buffet_sessions"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "started_at": {"$gte": since}}, {"_id": 0}).limit(500))
    if not sessions:
        return {"ok": True, "outlet_id": outlet_id,
                "sessions_analyzed": 0, "calibrations_written": 0}

    # By item_id, by day_of_week → list of (produced, consumed_actual,
    # leftover) tuples
    by_item_dow: Dict[Tuple[str, int], List[Dict[str, float]]] = defaultdict(list)
    for s in sessions:
        try:
            ts = datetime.fromisoformat(
                str(s.get("started_at")).replace("Z", "+00:00"))
            if ts.tzinfo is None: ts = ts.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        dow = ts.weekday()
        for item in (s.get("items_produced") or []):
            iid = item.get("recipe_id") or item.get("item_id")
            if not iid:
                continue
            produced = float(item.get("produced_qty") or 0)
            leftover = float(item.get("leftover_qty") or 0)
            if produced <= 0:
                continue
            by_item_dow[(iid, dow)].append({
                "produced": produced,
                "leftover": leftover,
                "leftover_pct": leftover / produced,
            })

    calibrations: List[Dict[str, Any]] = []
    for (iid, dow), rows in by_item_dow.items():
        if len(rows) < PATTERN_MIN_OBSERVATIONS:
            continue
        avg_leftover_pct = statistics.mean(r["leftover_pct"] for r in rows)
        if abs(avg_leftover_pct) < OVERPRODUCTION_THRESHOLD_PCT:
            continue
        # Suggested adjustment: if avg leftover 14%, suggest base_demand
        # decrease by 14%/(1+14%) ≈ 12% so produce-as-forecast hits the
        # actual consumption.
        suggested_factor = 1.0 - (avg_leftover_pct / (1 + avg_leftover_pct))
        finding = {
            "id": uuid.uuid4().hex[:12],
            "tenant_id": tenant_id,
            "outlet_id": outlet_id,
            "kind": "forecast_calibration_from_waste",
            "item_id": iid,
            "day_of_week": dow,
            "observation_count": len(rows),
            "avg_leftover_pct": round(avg_leftover_pct, 4),
            "suggested_base_demand_factor": round(suggested_factor, 4),
            "applied": False,
            "created_at": _now_iso(),
        }
        db["retrospective_findings"].insert_one(finding.copy())
        calibrations.append(finding)

        try:
            append_event(AppendEventBody(
                kind="calibration", sensitivity="ordinary",
                payload={
                    "domain": "waste_forecast_calibration",
                    "item_id": iid, "day_of_week": dow,
                    "avg_leftover_pct": round(avg_leftover_pct, 4),
                    "suggested_factor": round(suggested_factor, 4),
                }), tenant_id=tenant_id)
        except Exception:
            pass

    return {"ok": True, "outlet_id": outlet_id,
            "sessions_analyzed": len(sessions),
            "calibrations_written": len(calibrations),
            "calibrations": calibrations}


# ─── 3. Plating QC ───────────────────────────────────────────────────────

class PlatingScanBody(BaseModel):
    outlet_id: str
    recipe_id: str
    measured_weight_oz: float = Field(..., ge=0)
    expected_weight_oz: Optional[float] = None
    plate_style: Optional[str] = None
    visible_deviations: List[str] = Field(default_factory=list)
    captured_at: Optional[str] = None
    capture_id: Optional[str] = None


@router.post("/plating-qc")
def plating_qc(
    body: PlatingScanBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """Compare a single-plate scan against the menu spec. Flag yield
    mismatch (4oz served when spec is 6oz) and any visible deviation
    surfaced by the scanner.

    Output is a finding in operator register. Line cook does NOT
    receive a punitive notification — the chef decides whether and
    how to coach (§2.6)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    expected = body.expected_weight_oz
    if expected is None:
        recipe = db["recipes"].find_one(
            {"id": body.recipe_id, "tenant_id": tenant_id}, {"_id": 0})
        if recipe:
            expected = float(recipe.get("yield_oz")
                             or recipe.get("portion_size_oz")
                             or 0)
    if not expected or expected <= 0:
        return {"ok": False,
                "detail": f"no expected_weight for {body.recipe_id}"}

    drift = (body.measured_weight_oz - expected) / expected
    yield_severity = (
        "critical" if abs(drift) > 0.20
        else "warn" if abs(drift) > PLATING_YIELD_TOLERANCE
        else "ok")
    deviation_severity = (
        "warn" if body.visible_deviations else "ok")
    overall = ("critical" if yield_severity == "critical"
                or deviation_severity == "warn" and yield_severity == "warn"
                else yield_severity if yield_severity != "ok"
                else deviation_severity)

    finding = {
        "id": uuid.uuid4().hex[:12],
        "tenant_id": tenant_id,
        "outlet_id": body.outlet_id,
        "kind": "plating_qc",
        "recipe_id": body.recipe_id,
        "expected_weight_oz": expected,
        "measured_weight_oz": body.measured_weight_oz,
        "yield_drift_pct": round(drift, 4),
        "yield_severity": yield_severity,
        "visible_deviations": body.visible_deviations,
        "deviation_severity": deviation_severity,
        "severity": overall,
        "captured_at": body.captured_at or _now_iso(),
        "capture_id": body.capture_id,
        "explanation": (
            f"{body.recipe_id}: spec {expected:.1f}oz, measured "
            f"{body.measured_weight_oz:.1f}oz ({drift*100:+.1f}%)"
            + (f"; deviations: {', '.join(body.visible_deviations)}"
                if body.visible_deviations else "")
        ),
        "created_at": _now_iso(),
    }
    db["plating_qc_findings"].insert_one(finding.copy())

    if overall != "ok":
        try:
            append_event(AppendEventBody(
                kind="prediction", voice_register="operator",
                sensitivity="ordinary",
                confidence=(0.85 if overall == "critical" else 0.7),
                payload={
                    "domain": "plating_qc",
                    "finding_id": finding["id"],
                    "recipe_id": body.recipe_id,
                    "yield_drift_pct": finding["yield_drift_pct"],
                    "deviations": body.visible_deviations,
                    "severity": overall,
                    "_retrospective": {"decision_features": {
                        "yield_drift": abs(drift),
                        "deviation_count": len(body.visible_deviations),
                    }},
                }), tenant_id=tenant_id)
        except Exception:
            pass

    return {"ok": True, "finding": finding}


@router.get("/plating-qc/findings")
def list_plating_qc(
    outlet_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "plating QC findings require operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if outlet_id: q["outlet_id"] = outlet_id
    if severity: q["severity"] = severity
    rows = list(db["plating_qc_findings"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(max(1, min(2000, limit))))
    return {"ok": True, "total": len(rows), "findings": rows}


# ─── 4. Cook attribution roll-up (anonymous to operator) ─────────────────

@router.get("/attribution-rollup")
def attribution_rollup(
    outlet_id: str,
    lookback_days: int = 28,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Roll up waste by station / shift / day-of-week. Cook
    identification is NOT in the operator-audience response — only
    pass_dev sees per-cook breakdowns. The chef sees patterns the
    chef can act on through coaching, not blame trails (§2.6)."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "attribution rollup requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    since = (datetime.now(timezone.utc)
              - timedelta(days=lookback_days)).isoformat()
    entries = list(db["echowaste_entries"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "captured_at": {"$gte": since}}, {"_id": 0}).limit(5000))

    by_station: Dict[str, float] = defaultdict(float)
    by_shift: Dict[str, float] = defaultdict(float)
    by_dow: Dict[int, float] = defaultdict(float)
    by_cook: Dict[str, float] = defaultdict(float)   # pass_dev only
    total = 0.0

    for e in entries:
        try:
            ts = datetime.fromisoformat(
                str(e.get("captured_at")).replace("Z", "+00:00"))
            if ts.tzinfo is None: ts = ts.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        dow = ts.weekday()
        if 5 <= ts.hour < 11: shift = "morning"
        elif 11 <= ts.hour < 16: shift = "lunch"
        elif 16 <= ts.hour < 22: shift = "dinner"
        else: shift = "late_night"
        for item in (e.get("items") or []):
            w = float(item.get("weight_oz") or 0)
            if w <= 0: continue
            station = item.get("station") or e.get("station") or "unknown"
            cook = item.get("cook_id") or e.get("cook_id") or "anonymous"
            by_station[station] += w
            by_shift[shift] += w
            by_dow[dow] += w
            by_cook[cook] += w
            total += w

    response: Dict[str, Any] = {
        "ok": True, "outlet_id": outlet_id,
        "lookback_days": lookback_days,
        "entries_analyzed": len(entries),
        "total_weight_oz": round(total, 2),
        "by_station": {k: round(v, 2) for k, v in by_station.items()},
        "by_shift": {k: round(v, 2) for k, v in by_shift.items()},
        "by_day_of_week": {k: round(v, 2) for k, v in by_dow.items()},
    }
    # Cook breakdown ONLY for pass_dev (HR / labor investigation gate)
    if x_audience_register == "pass_dev":
        response["by_cook"] = {k: round(v, 2) for k, v in by_cook.items()}
        response["_pass_dev_notice"] = (
            "Per-cook breakdown surfaced only in pass_dev audience "
            "per §2.6. Operator dashboards show patterns, not people."
        )
    return response
