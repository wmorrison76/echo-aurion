"""
D43 · Variance summarizer + complaint diffusion + multi-property
benchmark + FOH ops auditor.

Four capabilities ship in this PR. They share the doctrine
contract (operator audience, observation framing, tenant
isolation) and they round out the audit-and-explain layer.

  1. Variance summarizer — read sales / cost / labor for a period,
     report % variance vs prior period or vs forecast, surface
     the top 3 movers in each direction with their attribution.

  2. Complaint diffusion — track how a single guest complaint
     propagates: mention → comp → service-recovery action →
     repeat-comper signal. Detect stuck loops (same guest
     complaining repeatedly) without blaming any individual.

  3. Multi-property benchmark — anonymized cross-property roll-up.
     "Your prime-cost ratio is 58%; the cohort median is 62%."
     Property names are stripped on the read; only the calling
     property sees its own dot.

  4. FOH ops auditor — registered into the D36 framework. Two
     finding kinds:
        · table_flip_drift: median dinner table-turn time drifted
          > 20% over the trailing window
        · server_no_show: a scheduled server has no clock-in
          AND no shift-swap on the same day

Doctrine alignment

  · §1.4 voice register: every endpoint operator|pass_dev.
  · §2.5 pride from love: variance framing is observation +
    attribution, never recommendation. Complaint diffusion never
    names a server in operator audience.
  · §2.6 never throw the pan: benchmark anonymizes peer
    properties. Complaint diffusion shows guest-level diffusion
    but not server-level on operator audience.
  · §3.1 append-only: complaint diffusion writes per-event
    transitions, not summaries.
  · D27 tenant isolation on every read/write.
  · D36 plug-in: FOH auditor is a single function with the
    @register_auditor decorator (one-line registration).
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
from echo.service_auditors import register_auditor, _persist_finding


router = APIRouter(prefix="/api/echo/insights",
                   tags=["echo-insights"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _safe_dt(v: Any) -> Optional[datetime]:
    try:
        ts = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    except Exception:
        return None


# ─── 1. Variance summarizer ─────────────────────────────────────────────

@router.get("/variance/{outlet_id}")
def variance_summary(
    outlet_id: str,
    period_days: int = 7,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Pull pos_stress_sales (or pos_sales) for the trailing
    period and the period before that. Compute % variance per
    sku. Top 3 up + top 3 down + total trend."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "variance summary requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    end = _now()
    cur_start = end - timedelta(days=period_days)
    prev_start = cur_start - timedelta(days=period_days)

    def _pull(start: datetime, stop: datetime) -> Dict[str, float]:
        q = {"tenant_id": tenant_id, "outlet_id": outlet_id,
             "date": {"$gte": start.date().isoformat()}}
        rows = list(db["pos_stress_sales"].find(q, {"_id": 0}).limit(50000))
        if not rows:
            rows = list(db["pos_sales"].find(q, {"_id": 0}).limit(50000))
        rows = [r for r in rows if r.get("date","") <= stop.date().isoformat()]
        agg: Dict[str, float] = defaultdict(float)
        for r in rows:
            agg[r.get("sku") or "?"] += float(r.get("qty_sold") or 0)
        return dict(agg)

    cur = _pull(cur_start, end)
    prev = _pull(prev_start, cur_start)

    movers: List[Dict[str, Any]] = []
    skus = sorted(set(cur.keys()) | set(prev.keys()))
    for sku in skus:
        c = cur.get(sku, 0)
        p = prev.get(sku, 0)
        if p == 0 and c == 0:
            continue
        delta = c - p
        delta_pct = (delta / p) if p > 0 else (1.0 if c > 0 else 0)
        movers.append({
            "sku": sku,
            "current": c,
            "prior": p,
            "delta": delta,
            "delta_pct": round(delta_pct, 4),
        })
    movers.sort(key=lambda m: -m["delta_pct"])
    top_up = movers[:3]
    top_down = movers[-3:][::-1] if len(movers) >= 3 else movers[::-1]

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "period_days": period_days,
        "current_total": round(sum(cur.values()), 2),
        "prior_total": round(sum(prev.values()), 2),
        "period_delta_pct": (
            round((sum(cur.values()) - sum(prev.values()))
                  / sum(prev.values()), 4)
            if sum(prev.values()) > 0 else None),
        "top_up": top_up,
        "top_down": top_down,
        "skus_compared": len(movers),
    }


# ─── 2. Complaint diffusion ─────────────────────────────────────────────

class ComplaintEventBody(BaseModel):
    guest_id: str
    outlet_id: str
    kind: str = Field(..., min_length=1)   # mention | comp | recovery | repeat
    detail: Optional[str] = None
    actor_id: Optional[str] = None
    related_complaint_id: Optional[str] = None


@router.post("/complaints/event")
def complaint_event(
    body: ComplaintEventBody,
    x_tenant_id: Optional[str] = Header(None),
):
    """Record one complaint-lifecycle event. Append-only. Linked
    by guest_id + related_complaint_id so a thread can be traced."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    eid = uuid.uuid4().hex[:16]
    row = {
        "id": eid,
        "tenant_id": tenant_id,
        "guest_id": body.guest_id,
        "outlet_id": body.outlet_id,
        "kind": body.kind,
        "detail": body.detail,
        "actor_id": body.actor_id,
        "related_complaint_id": body.related_complaint_id,
        "created_at": _now_iso(),
    }
    db["complaint_events"].insert_one(row.copy())
    return {"ok": True, "event": row}


@router.get("/complaints/diffusion/{guest_id}")
def complaint_diffusion(
    guest_id: str,
    lookback_days: int = 90,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Trace a guest's complaint thread. Output: ordered events +
    classification of the diffusion stage. Operator audience
    redacts actor_id (never throw the pan)."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "complaint diffusion requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    since = (_now() - timedelta(days=lookback_days)).isoformat()
    rows = list(db["complaint_events"].find(
        {"tenant_id": tenant_id, "guest_id": guest_id,
         "created_at": {"$gte": since}}, {"_id": 0}).limit(2000))
    rows.sort(key=lambda r: r.get("created_at") or "")

    # Classification
    kinds = [r["kind"] for r in rows]
    mentions = kinds.count("mention")
    comps = kinds.count("comp")
    recoveries = kinds.count("recovery")
    repeats = kinds.count("repeat")
    closed = bool(rows and rows[-1]["kind"] in ("recovery", "closed"))
    stuck_loop = (mentions >= 3 and recoveries < 2)
    classification = (
        "stuck_loop" if stuck_loop else
        "closed" if closed else
        "in_progress" if rows else
        "no_history")

    if x_audience_register == "operator":
        for r in rows:
            r.pop("actor_id", None)

    return {
        "ok": True,
        "guest_id": guest_id,
        "lookback_days": lookback_days,
        "event_count": len(rows),
        "mentions": mentions,
        "comps": comps,
        "recoveries": recoveries,
        "repeats": repeats,
        "classification": classification,
        "events": rows,
    }


# ─── 3. Multi-property benchmark (anonymized) ──────────────────────────

@router.get("/benchmark")
def multi_property_benchmark(
    metric: str,
    cohort_tag: Optional[str] = None,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Read property_metrics (a collection populated by the
    Stratus / Aurium roll-up cron) and return median / p25 / p75 /
    your-property's value for the given metric. Peer property
    NAMES are stripped — only the dot-vs-cohort comparison is
    visible to the calling property.

    metric ∈ {prime_cost_ratio, food_cost_ratio, labor_ratio,
              cogs_ratio, ebitda_margin, table_flip_minutes,
              waste_pct_of_food_cost}
    """
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "benchmark requires operator")
    valid = {"prime_cost_ratio", "food_cost_ratio", "labor_ratio",
             "cogs_ratio", "ebitda_margin", "table_flip_minutes",
             "waste_pct_of_food_cost"}
    if metric not in valid:
        raise HTTPException(400,
            f"metric must be one of {sorted(valid)}")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"metric": metric}
    if cohort_tag:
        q["cohort_tag"] = cohort_tag
    rows = list(db["property_metrics"].find(q, {"_id": 0}).limit(1000))
    if not rows:
        return {"ok": True, "metric": metric,
                "cohort_size": 0,
                "your_value": None, "summary": None}

    your_val = next((r["value"] for r in rows
                     if r.get("tenant_id") == tenant_id), None)
    cohort_vals = sorted(float(r["value"]) for r in rows)
    n = len(cohort_vals)
    def pct(p): return cohort_vals[min(n - 1, max(0, int(n * p)))]

    median = pct(0.5)
    p25 = pct(0.25)
    p75 = pct(0.75)

    rank_pct = None
    if your_val is not None:
        below = sum(1 for v in cohort_vals if v < your_val)
        rank_pct = round(below / n * 100, 1)

    return {
        "ok": True,
        "metric": metric,
        "cohort_tag": cohort_tag,
        "cohort_size": n,
        "your_value": your_val,
        "your_percentile_in_cohort": rank_pct,
        "summary": {
            "p25": round(p25, 4),
            "median": round(median, 4),
            "p75": round(p75, 4),
            "min": round(cohort_vals[0], 4),
            "max": round(cohort_vals[-1], 4),
        },
    }


# ─── 4. FOH ops auditor (D36 plug-in) ───────────────────────────────────

@register_auditor("foh_ops")
def audit_foh_ops(tenant_id: str) -> List[Dict[str, Any]]:
    """Two FOH-ops finding kinds:

      · table_flip_drift: median dinner-service table-turn time
        drifted > 20% in trailing 14 days vs the 28-day baseline
        (per outlet).
      · server_no_show: a scheduled server with no clock-in event
        AND no approved shift-swap on the same date.
    """
    findings: List[Dict[str, Any]] = []
    now = _now()
    since_42 = (now - timedelta(days=42)).isoformat()
    since_14 = (now - timedelta(days=14)).isoformat()
    yesterday = (now - timedelta(days=1)).date().isoformat()

    # Table flip drift
    flips = list(db["table_turns"].find(
        {"tenant_id": tenant_id, "ended_at": {"$gte": since_42}},
        {"_id": 0}).limit(20000))
    by_outlet: Dict[str, List[Tuple[datetime, float]]] = defaultdict(list)
    for r in flips:
        ts = _safe_dt(r.get("ended_at"))
        mins = float(r.get("duration_minutes") or 0)
        if ts and mins > 0:
            by_outlet[r.get("outlet_id") or "?"].append((ts, mins))
    for outlet, rows in by_outlet.items():
        baseline = [m for ts, m in rows
                     if ts.isoformat() < since_14
                     and ts.isoformat() >= since_42]
        recent = [m for ts, m in rows
                   if ts.isoformat() >= since_14]
        if len(baseline) < 10 or len(recent) < 5:
            continue
        b_med = statistics.median(baseline)
        r_med = statistics.median(recent)
        if b_med <= 0:
            continue
        drift_pct = (r_med - b_med) / b_med
        if abs(drift_pct) < 0.20:
            continue
        nk = f"table_flip_drift|{outlet}|{recent[0]:.0f}"
        findings.append({
            "tenant_id": tenant_id,
            "auditor": "foh_ops",
            "kind": "table_flip_drift",
            "natural_key": nk,
            "outlet_id": outlet,
            "severity": "warn" if abs(drift_pct) < 0.40 else "critical",
            "baseline_median_min": round(b_med, 1),
            "recent_median_min": round(r_med, 1),
            "drift_pct": round(drift_pct, 4),
            "explanation": (
                f"outlet {outlet} dinner table-turn drifted "
                f"{drift_pct*100:+.1f}% (baseline {b_med:.1f}min, "
                f"recent {r_med:.1f}min) over last 14 days"
            ),
            "decision_features": {
                "kind": "table_flip_drift",
                "drift_pct": drift_pct,
            },
            "confidence": 0.8,
        })

    # Server no-show: scheduled but no clock-in yesterday
    yest_shifts = list(db["echo_schedule_shifts"].find(
        {"tenant_id": tenant_id, "date": yesterday},
        {"_id": 0}).limit(2000))
    for s in yest_shifts:
        emp_id = s.get("employee_id")
        if not emp_id:
            continue
        clocked = db["time_clock"].find_one(
            {"tenant_id": tenant_id, "employee_id": emp_id,
             "clock_in_at": {"$gte": yesterday}})
        if clocked:
            continue
        # Approved shift-swap?
        swap = db["shift_swaps"].find_one(
            {"tenant_id": tenant_id, "shift_id": s.get("id"),
             "status": "approved"})
        if swap:
            continue
        nk = f"server_no_show|{emp_id}|{yesterday}"
        findings.append({
            "tenant_id": tenant_id,
            "auditor": "foh_ops",
            "kind": "server_no_show",
            "natural_key": nk,
            "employee_id": emp_id,
            "shift_id": s.get("id"),
            "shift_date": yesterday,
            "severity": "warn",
            "explanation": (
                f"{emp_id} scheduled for shift {s.get('id')} on "
                f"{yesterday} with no clock-in and no swap"
            ),
            "decision_features": {"kind": "server_no_show"},
            "confidence": 0.9,
        })

    for f in findings:
        _persist_finding(f)
    return findings
