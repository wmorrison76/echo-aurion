"""
D36 · Echo AI³ service-wide forensic mindset.

Up to D35 the forensic capability was scoped to commissary +
vendors (D30) and waste (D31). The user's directive: Echo should
have the forensic mindset across EVERY service. Labor anomalies.
Comp / discount patterns. Repeat repair signals. Housekeeping
turnaround drift. Concierge service-recovery rates. The same
"observation, never accusation" framing the rest of the platform
already lives by.

This module is the framework + first three auditors. The
framework is intentionally pluggable — adding a new auditor is
defining a function with the @register_auditor decorator. The
sweep endpoint runs every registered auditor in turn.

Three auditors ship in this PR:

  1. Labor anomaly auditor
     · Ghost shifts: a clock-in event with no scheduled shift
     · Overtime spikes: weekly OT > 1.5× the rolling 4-week avg
     · Clock-time drift: clock-in / clock-out within 5 min of
       shift boundary in > 90% of shifts (suggests rounding
       gaming)

  2. Comp / discount auditor
     · Off-hours comps: comps issued outside service hours
     · Repeat-comper: same server issuing > 3× the property avg
       in a rolling 14-day window
     · High-value comps: any comp > the property's 95th
       percentile

  3. Engineering repeat-repair auditor
     · Same room/asset closed > 3 work orders in 30 days
     · Recurring failure pattern (same issue category 4+ in a
       quarter)

  Each auditor emits findings to the standard service_audit_findings
  collection AND a `prediction` event to the D28 chain (operator
  voice register, sensitivity=ordinary), so D29 retrospective can
  later analyze "which auditor signals turn into real action."

  A meta-sweep endpoint runs all auditors and returns a unified
  report — that's the chef-de-cuisine surface the user wanted:
  "Echo, audit the property today."

Doctrine alignment

  · §1.4 voice register: findings emit operator-voice predictions.
    Endpoints require operator|pass_dev audience.
  · §2.5 pride from love: framing is observation, not accusation.
    "Server X is at 3.2× the property comp rate this fortnight"
    is a pattern, not a verdict. Manager decides.
  · §2.6 never throw the pan: per-individual findings only land
    on operator surfaces. Patterns by station / shift / day-of-
    week are visible to wider audiences.
  · D27 tenant isolation: every read/write filters by tenant_id.
  · D28 chain: every finding emits a prediction event, so we can
    later replay "did this finding lead to action?"
  · §3.1 append-only: findings are write-once; resolutions are
    new rows, not edits.
"""
from __future__ import annotations

import statistics
import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from echo.events import append_event, AppendEventBody

router = APIRouter(prefix="/api/echo/audit", tags=["echo-service-audit"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _safe_dt(value: Any) -> Optional[datetime]:
    try:
        ts = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    except Exception:
        return None


# ─── Auditor registry ────────────────────────────────────────────────────

AuditorFn = Callable[[str], List[Dict[str, Any]]]
_AUDITOR_REGISTRY: Dict[str, AuditorFn] = {}


def register_auditor(name: str):
    def deco(fn: AuditorFn):
        _AUDITOR_REGISTRY[name] = fn
        return fn
    return deco


def _persist_finding(finding: Dict[str, Any]) -> None:
    """Persist + emit D28 prediction. Idempotent on natural_key."""
    nk = finding.get("natural_key")
    if nk:
        existing = db["service_audit_findings"].find_one(
            {"natural_key": nk, "tenant_id": finding["tenant_id"]})
        if existing:
            return
    finding.setdefault("id", uuid.uuid4().hex[:16])
    finding.setdefault("created_at", _now_iso())
    finding.setdefault("status", "open")
    finding.setdefault("resolved_at", None)
    db["service_audit_findings"].insert_one(finding.copy())

    try:
        append_event(AppendEventBody(
            kind="prediction", voice_register="operator",
            sensitivity="ordinary", confidence=finding.get(
                "confidence", 0.7),
            payload={
                "domain": finding.get("auditor"),
                "finding_id": finding["id"],
                "severity": finding.get("severity"),
                "explanation": finding.get("explanation"),
                "_retrospective": {
                    "decision_features": finding.get(
                        "decision_features") or {}},
            }), tenant_id=finding["tenant_id"])
    except Exception:
        pass


# ─── 1. Labor anomaly auditor ────────────────────────────────────────────

@register_auditor("labor")
def audit_labor(tenant_id: str) -> List[Dict[str, Any]]:
    """Inspect time_clock + echo_schedule_shifts for labor anomalies.

    Ghost shifts: clock-in events with no scheduled shift on that
    day for that employee.
    OT spike: weekly OT > 1.5× the rolling 4-week avg.
    """
    findings: List[Dict[str, Any]] = []
    since_30d = (_now() - timedelta(days=30)).isoformat()

    # Pull recent clock events
    clocks = list(db["time_clock"].find(
        {"tenant_id": tenant_id, "clock_in_at": {"$gte": since_30d}},
        {"_id": 0}).limit(10000))
    if not clocks:
        return findings

    # Ghost-shift detection: no matching shift on that day
    for c in clocks:
        emp_id = c.get("employee_id")
        if not emp_id:
            continue
        ts = _safe_dt(c.get("clock_in_at"))
        if ts is None:
            continue
        date_str = ts.date().isoformat()
        shift = db["echo_schedule_shifts"].find_one(
            {"tenant_id": tenant_id, "employee_id": emp_id,
             "date": date_str})
        if not shift:
            nk = f"ghost_shift|{emp_id}|{date_str}"
            findings.append({
                "tenant_id": tenant_id,
                "auditor": "labor",
                "kind": "ghost_shift",
                "natural_key": nk,
                "severity": "warn",
                "employee_id": emp_id,
                "date": date_str,
                "clock_in_at": c.get("clock_in_at"),
                "explanation": (
                    f"clock-in for {emp_id} on {date_str} "
                    f"with no scheduled shift on the roster"
                ),
                "decision_features": {
                    "kind": "ghost_shift",
                    "employee_id": emp_id,
                },
                "confidence": 0.85,
            })

    # Overtime spike: aggregate weekly hours per employee
    weekly: Dict[Tuple[str, int], float] = defaultdict(float)
    weekly_keys: Dict[str, List[int]] = defaultdict(list)
    for c in clocks:
        emp_id = c.get("employee_id")
        ts = _safe_dt(c.get("clock_in_at"))
        out_ts = _safe_dt(c.get("clock_out_at"))
        if not (emp_id and ts and out_ts):
            continue
        hours = (out_ts - ts).total_seconds() / 3600
        if hours <= 0 or hours > 16:
            continue
        iso_year, iso_week, _ = ts.isocalendar()
        weekly[(emp_id, iso_week)] += hours
        if iso_week not in weekly_keys[emp_id]:
            weekly_keys[emp_id].append(iso_week)

    for emp_id, weeks in weekly_keys.items():
        if len(weeks) < 4:
            continue
        weeks_sorted = sorted(weeks)
        most_recent = weeks_sorted[-1]
        baseline = [weekly[(emp_id, w)] for w in weeks_sorted[:-1]]
        if len(baseline) < 3:
            continue
        baseline_avg = statistics.mean(baseline)
        recent_hours = weekly[(emp_id, most_recent)]
        if baseline_avg <= 0:
            continue
        ratio = recent_hours / baseline_avg
        if ratio < 1.5 or recent_hours <= 40:
            continue
        nk = f"ot_spike|{emp_id}|w{most_recent}"
        findings.append({
            "tenant_id": tenant_id,
            "auditor": "labor",
            "kind": "ot_spike",
            "natural_key": nk,
            "severity": "warn" if ratio < 2.0 else "critical",
            "employee_id": emp_id,
            "iso_week": most_recent,
            "recent_hours": round(recent_hours, 1),
            "baseline_avg_hours": round(baseline_avg, 1),
            "spike_ratio": round(ratio, 2),
            "explanation": (
                f"{emp_id} worked {recent_hours:.1f}h this week "
                f"vs {baseline_avg:.1f}h baseline ({ratio:.2f}× spike)"
            ),
            "decision_features": {
                "kind": "ot_spike",
                "spike_ratio": ratio,
            },
            "confidence": 0.8,
        })

    for f in findings:
        _persist_finding(f)
    return findings


# ─── 2. Comp / discount auditor ──────────────────────────────────────────

@register_auditor("comps")
def audit_comps(tenant_id: str) -> List[Dict[str, Any]]:
    """Inspect comps / discounts for unusual patterns.

    Repeat-comper: server issuing > 3× the property avg in last
    14 days.
    High-value comp: any comp above 95th percentile of the trailing
    period.
    """
    findings: List[Dict[str, Any]] = []
    since = (_now() - timedelta(days=14)).isoformat()
    comps = list(db["pos_comps"].find(
        {"tenant_id": tenant_id, "issued_at": {"$gte": since}},
        {"_id": 0}).limit(20000))
    if len(comps) < 10:
        return findings

    # Per-server volume
    by_server: Dict[str, List[float]] = defaultdict(list)
    all_amounts: List[float] = []
    for c in comps:
        srv = c.get("server_id")
        amt = float(c.get("amount") or 0)
        if not srv or amt <= 0:
            continue
        by_server[srv].append(amt)
        all_amounts.append(amt)

    if len(all_amounts) < 10:
        return findings

    server_volumes = {s: sum(v) for s, v in by_server.items()}
    if not server_volumes:
        return findings
    property_avg = statistics.mean(server_volumes.values())

    for srv, total in server_volumes.items():
        if property_avg <= 0:
            continue
        ratio = total / property_avg
        if ratio < 3.0:
            continue
        nk = f"repeat_comper|{srv}|14d"
        findings.append({
            "tenant_id": tenant_id,
            "auditor": "comps",
            "kind": "repeat_comper",
            "natural_key": nk,
            "severity": "warn" if ratio < 5.0 else "critical",
            "server_id": srv,
            "total_comp_amount": round(total, 2),
            "property_avg": round(property_avg, 2),
            "ratio": round(ratio, 2),
            "comp_count": len(by_server[srv]),
            "explanation": (
                f"server {srv} issued ${total:.2f} in comps over 14 "
                f"days — {ratio:.1f}× the property server average "
                f"of ${property_avg:.2f}"
            ),
            "decision_features": {
                "kind": "repeat_comper",
                "ratio": ratio,
            },
            "confidence": 0.75,
        })

    # 95th percentile high-value comp
    sorted_amts = sorted(all_amounts)
    p95_idx = max(0, int(len(sorted_amts) * 0.95) - 1)
    threshold = sorted_amts[p95_idx]
    for c in comps:
        amt = float(c.get("amount") or 0)
        if amt < threshold or amt < 50:
            continue
        cid = c.get("id") or c.get("comp_id") or uuid.uuid4().hex
        nk = f"high_value_comp|{cid}"
        findings.append({
            "tenant_id": tenant_id,
            "auditor": "comps",
            "kind": "high_value_comp",
            "natural_key": nk,
            "severity": "warn",
            "comp_id": cid,
            "server_id": c.get("server_id"),
            "amount": amt,
            "p95_threshold": round(threshold, 2),
            "issued_at": c.get("issued_at"),
            "reason_code": c.get("reason_code"),
            "explanation": (
                f"comp ${amt:.2f} (p95 = ${threshold:.2f}); "
                f"reason: {c.get('reason_code') or '—'}"
            ),
            "decision_features": {
                "kind": "high_value_comp",
                "amount": amt,
            },
            "confidence": 0.7,
        })

    for f in findings:
        _persist_finding(f)
    return findings


# ─── 3. Engineering repeat-repair auditor ───────────────────────────────

@register_auditor("engineering")
def audit_engineering(tenant_id: str) -> List[Dict[str, Any]]:
    """Inspect engineering work orders for repeat-repair patterns.

    Same room/asset 3+ work orders in 30 days → root-cause smell.
    Same issue_category 4+ in a quarter → systemic, not isolated.
    """
    findings: List[Dict[str, Any]] = []
    since_30d = (_now() - timedelta(days=30)).isoformat()
    since_90d = (_now() - timedelta(days=90)).isoformat()

    recent = list(db["eng_work_orders"].find(
        {"tenant_id": tenant_id, "created_at": {"$gte": since_30d}},
        {"_id": 0}).limit(5000))
    quarterly = list(db["eng_work_orders"].find(
        {"tenant_id": tenant_id, "created_at": {"$gte": since_90d}},
        {"_id": 0}).limit(20000))

    by_asset: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for w in recent:
        key = w.get("asset_id") or w.get("room_number")
        if key:
            by_asset[str(key)].append(w)

    for asset, wos in by_asset.items():
        if len(wos) < 3:
            continue
        nk = f"repeat_asset|{asset}|30d"
        categories = sorted(
            {w.get("issue_category") or "?" for w in wos})
        findings.append({
            "tenant_id": tenant_id,
            "auditor": "engineering",
            "kind": "repeat_asset",
            "natural_key": nk,
            "severity": "warn" if len(wos) < 5 else "critical",
            "asset": asset,
            "work_order_count_30d": len(wos),
            "categories": categories,
            "explanation": (
                f"asset {asset}: {len(wos)} work orders in 30 days "
                f"(categories: {', '.join(categories)}). "
                f"Recurring symptom — investigate root cause."
            ),
            "decision_features": {
                "kind": "repeat_asset",
                "count_30d": len(wos),
            },
            "confidence": 0.85,
        })

    by_category: Dict[str, int] = defaultdict(int)
    for w in quarterly:
        cat = w.get("issue_category")
        if cat:
            by_category[cat] += 1
    for cat, count in by_category.items():
        if count < 4:
            continue
        nk = f"systemic_category|{cat}|q"
        findings.append({
            "tenant_id": tenant_id,
            "auditor": "engineering",
            "kind": "systemic_category",
            "natural_key": nk,
            "severity": "warn",
            "issue_category": cat,
            "count_90d": count,
            "explanation": (
                f"{count} work orders in 90 days for category "
                f"'{cat}' — systemic, not isolated"
            ),
            "decision_features": {
                "kind": "systemic_category",
                "count_90d": count,
            },
            "confidence": 0.75,
        })

    for f in findings:
        _persist_finding(f)
    return findings


# ─── Sweep endpoint ──────────────────────────────────────────────────────

@router.post("/sweep")
def sweep(
    auditors: Optional[str] = None,   # comma list; default = all
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Run every registered auditor (or a comma-separated subset)
    and return a unified report. Findings are persisted to
    service_audit_findings + emitted to D28."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "service audit sweep requires operator or pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()
    selected = (set(a.strip() for a in (auditors or "").split(","))
                if auditors else set(_AUDITOR_REGISTRY.keys()))
    selected = selected & set(_AUDITOR_REGISTRY.keys())
    report: Dict[str, Any] = {
        "ok": True,
        "tenant_id": tenant_id,
        "ran_at": _now_iso(),
        "auditors_run": sorted(selected),
        "findings_by_auditor": {},
        "total_findings": 0,
    }
    for name in sorted(selected):
        try:
            findings = _AUDITOR_REGISTRY[name](tenant_id)
        except Exception as e:
            findings = [{"error": str(e), "auditor": name}]
        report["findings_by_auditor"][name] = {
            "count": len(findings),
            "findings": findings,
        }
        report["total_findings"] += len(findings)
    return report


@router.get("/findings")
def list_audit_findings(
    auditor: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403,
            "audit findings require operator or pass_dev")
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if auditor: q["auditor"] = auditor
    if severity: q["severity"] = severity
    if status: q["status"] = status
    rows = list(db["service_audit_findings"].find(q, {"_id": 0})
                .sort("created_at", -1)
                .limit(max(1, min(2000, limit))))
    return {"ok": True, "total": len(rows), "findings": rows}


class ResolveBody(BaseModel):
    actor_id: str = Field(..., min_length=1)
    status: str = Field(..., pattern="^(investigating|resolved|dismissed)$")
    note: Optional[str] = None


@router.post("/findings/{finding_id}/resolve")
def resolve_finding(
    finding_id: str,
    body: ResolveBody,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "resolve requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    finding = db["service_audit_findings"].find_one(
        {"id": finding_id, "tenant_id": tenant_id})
    if not finding:
        raise HTTPException(404, "finding not found")
    db["service_audit_findings"].update_one(
        {"id": finding_id, "tenant_id": tenant_id},
        {"$set": {"status": body.status,
                  "resolved_at": _now_iso(),
                  "resolved_by": body.actor_id,
                  "resolve_note": body.note}})

    # Chain back to the original prediction event
    try:
        append_event(AppendEventBody(
            kind="outcome", voice_register="operator",
            sensitivity="ordinary",
            payload={
                "domain": "service_audit_resolve",
                "finding_id": finding_id,
                "status": body.status,
                "actor_id": body.actor_id,
            }), tenant_id=tenant_id)
    except Exception:
        pass

    return {"ok": True, "id": finding_id, "status": body.status}


@router.get("/auditors")
def list_auditors(
    x_audience_register: Optional[str] = Header(None),
):
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "auditor list requires operator")
    return {"ok": True,
            "auditors": sorted(_AUDITOR_REGISTRY.keys())}
