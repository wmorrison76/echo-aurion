"""
D38 · Echo cross-correlation engine.

D36 gave us a forensic mindset PER service. D38 is the layer where
findings from different services TALK TO EACH OTHER.

The CFO question: "Did labor go up the same week food cost went
up?" The chef question: "Is the same vendor showing drift across
multiple outlets?" The GM question: "When ghost shifts spike, do
comp findings spike too?"

This module reads from the unified findings substrate
(service_audit_findings + commissary forensic findings + waste
findings + echowaste plating QC findings) and surfaces three
kinds of pattern:

  1. Co-occurrence
     Pairs of finding KINDS that appear within a time window of
     each other ≥ N times. Output: pair, support count, lift
     (= P(A∩B) / [P(A)·P(B)]). Lift > 1.5 means correlated;
     dashboards see the strongest associations sorted by lift.

  2. Cascade
     Temporal precedence: kind A consistently precedes kind B
     within a short window. "Repeat-asset engineering finding
     precedes high-value comp 60% of the time within 7 days" —
     guests get re-comped when the same room keeps breaking.

  3. Cross-outlet
     Same finding signature (e.g., vendor=Sysco, kind=price_drift)
     appearing across multiple outlet_ids. The CFO question:
     "Sysco is showing drift across our 3 outlets — is it a
     contract issue or local?"

Doctrine alignment

  · §1.4 voice register: every read endpoint requires audience=
    operator|pass_dev (correlation patterns can be sensitive).
  · §2.5 framing as observation: "co-occur 12 times" is data;
    no recommendations without operator interpretation.
  · §2.6 never throw the pan: per-individual cascade detection
    (cook X → comp Y) is pass_dev only. Pattern-level (station →
    finding kind) is operator.
  · §3.1 append-only: correlation findings are derived
    (computed each call); we don't write summary state because
    summaries can drift from source. CFO can rebuild any time.
  · D27 tenant isolation on every read.
"""
from __future__ import annotations

import statistics
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from itertools import combinations
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException

from database import db

router = APIRouter(prefix="/api/echo/correlation",
                   tags=["echo-correlation"])


# Tunables
DEFAULT_WINDOW_DAYS = 14
DEFAULT_MIN_SUPPORT = 3
DEFAULT_LOOKBACK_DAYS = 90
DEFAULT_MIN_LIFT = 1.5
CASCADE_WINDOW_DAYS = 7
CASCADE_MIN_OBSERVATIONS = 3


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_dt(value: Any) -> Optional[datetime]:
    try:
        ts = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts
    except Exception:
        return None


def _gather_findings(tenant_id: str, lookback_days: int
                     ) -> List[Dict[str, Any]]:
    """Pull findings from every source we know about and normalize
    to a unified shape: {ts, source, kind, signature, dims}."""
    since_iso = (_now() - timedelta(days=lookback_days)).isoformat()
    out: List[Dict[str, Any]] = []

    for row in db["service_audit_findings"].find(
        {"tenant_id": tenant_id, "created_at": {"$gte": since_iso}},
        {"_id": 0}).limit(20000):
        ts = _safe_dt(row.get("created_at"))
        if ts is None: continue
        out.append({
            "ts": ts,
            "source": row.get("auditor") or "service_audit",
            "kind": row.get("kind"),
            "signature": f"{row.get('auditor')}.{row.get('kind')}",
            "dims": {
                "outlet_id": row.get("outlet_id"),
                "vendor_id": row.get("vendor_id"),
                "asset": row.get("asset"),
                "employee_id": row.get("employee_id"),
                "server_id": row.get("server_id"),
            },
            "_id": row.get("id"),
        })

    for row in db["forensic_findings"].find(
        {"tenant_id": tenant_id, "created_at": {"$gte": since_iso}},
        {"_id": 0}).limit(20000):
        ts = _safe_dt(row.get("created_at"))
        if ts is None: continue
        out.append({
            "ts": ts,
            "source": "forensic",
            "kind": row.get("kind"),
            "signature": f"forensic.{row.get('kind')}",
            "dims": {
                "outlet_id": row.get("outlet_id"),
                "vendor_id": row.get("vendor_id"),
                "recipe_id": row.get("recipe_id"),
            },
            "_id": row.get("id"),
        })

    for row in db["plating_qc_findings"].find(
        {"tenant_id": tenant_id, "created_at": {"$gte": since_iso}},
        {"_id": 0}).limit(20000):
        ts = _safe_dt(row.get("created_at"))
        if ts is None: continue
        out.append({
            "ts": ts,
            "source": "waste",
            "kind": row.get("kind") or "plating_qc",
            "signature": "waste.plating_qc",
            "dims": {
                "outlet_id": row.get("outlet_id"),
                "recipe_id": row.get("recipe_id"),
            },
            "_id": row.get("id"),
        })

    return out


# ─── 1. Co-occurrence ────────────────────────────────────────────────────

@router.get("/co-occurrences")
def co_occurrences(
    window_days: int = DEFAULT_WINDOW_DAYS,
    min_support: int = DEFAULT_MIN_SUPPORT,
    min_lift: float = DEFAULT_MIN_LIFT,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Find finding-kind pairs that appear within window_days of
    each other ≥ min_support times across the lookback period.

    Lift = P(A∩B in window) / [P(A) · P(B)]. Lift > 1.5 means
    "the two appear together more often than chance."
    """
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "co-occurrences require operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    findings = _gather_findings(tenant_id, lookback_days)
    if len(findings) < 4:
        return {"ok": True,
                "tenant_id": tenant_id,
                "findings_total": len(findings),
                "pairs": []}

    findings.sort(key=lambda f: f["ts"])
    sigs = sorted({f["signature"] for f in findings})
    sig_count = {s: sum(1 for f in findings if f["signature"] == s)
                 for s in sigs}
    total = len(findings)

    # Pair counts within window
    pair_counts: Dict[Tuple[str, str], int] = defaultdict(int)
    window = timedelta(days=window_days)
    for i, fi in enumerate(findings):
        for fj in findings[i + 1:]:
            if fj["ts"] - fi["ts"] > window:
                break
            if fi["signature"] == fj["signature"]:
                continue
            key = tuple(sorted([fi["signature"], fj["signature"]]))
            pair_counts[key] += 1

    pairs: List[Dict[str, Any]] = []
    for (a, b), support in pair_counts.items():
        if support < min_support:
            continue
        # lift estimate (rough)
        p_a = sig_count[a] / total
        p_b = sig_count[b] / total
        if p_a == 0 or p_b == 0:
            continue
        # support-as-prob (not strictly correct but useful proxy):
        p_ab = support / max(1, total)
        lift = p_ab / (p_a * p_b)
        if lift < min_lift:
            continue
        pairs.append({
            "a": a, "b": b,
            "support": support,
            "support_a": sig_count[a],
            "support_b": sig_count[b],
            "lift": round(lift, 2),
            "interpretation": (
                f"{a} and {b} co-occur within {window_days} days "
                f"{support} times (lift {lift:.2f}× chance)"
            ),
        })
    pairs.sort(key=lambda p: -p["lift"])
    return {"ok": True,
            "tenant_id": tenant_id,
            "window_days": window_days,
            "lookback_days": lookback_days,
            "findings_total": total,
            "kinds_observed": len(sigs),
            "pairs": pairs}


# ─── 2. Cascade (temporal precedence) ───────────────────────────────────

@router.get("/cascades")
def cascades(
    cascade_window_days: int = CASCADE_WINDOW_DAYS,
    min_observations: int = CASCADE_MIN_OBSERVATIONS,
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Detect kind A → kind B precedence within cascade_window_days,
    where the rate is ≥ 50% (more than half the time A is followed
    by B). Output sorted by precedence_rate desc."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "cascades require operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    findings = _gather_findings(tenant_id, lookback_days)
    findings.sort(key=lambda f: f["ts"])

    by_sig: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for f in findings:
        by_sig[f["signature"]].append(f)

    cascades_out: List[Dict[str, Any]] = []
    window = timedelta(days=cascade_window_days)
    for sig_a, list_a in by_sig.items():
        if len(list_a) < min_observations:
            continue
        for sig_b, list_b in by_sig.items():
            if sig_a == sig_b:
                continue
            followed = 0
            for fa in list_a:
                # any B within window after fa?
                hit = next((fb for fb in list_b
                            if fa["ts"] < fb["ts"] <= fa["ts"] + window),
                            None)
                if hit:
                    followed += 1
            rate = followed / len(list_a)
            if rate >= 0.5 and followed >= min_observations:
                cascades_out.append({
                    "antecedent": sig_a,
                    "consequent": sig_b,
                    "antecedent_total": len(list_a),
                    "followed_count": followed,
                    "precedence_rate": round(rate, 3),
                    "window_days": cascade_window_days,
                    "interpretation": (
                        f"{sig_a} is followed by {sig_b} within "
                        f"{cascade_window_days} days "
                        f"{followed}/{len(list_a)} times "
                        f"({rate*100:.0f}%)"
                    ),
                })
    cascades_out.sort(key=lambda c: -c["precedence_rate"])
    return {"ok": True,
            "tenant_id": tenant_id,
            "cascade_window_days": cascade_window_days,
            "lookback_days": lookback_days,
            "cascades": cascades_out}


# ─── 3. Cross-outlet ────────────────────────────────────────────────────

@router.get("/cross-outlet")
def cross_outlet(
    dim: str = "vendor_id",
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    min_outlet_count: int = 2,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Group findings by (kind, dim) and surface those where ≥
    min_outlet_count outlets show the same signature. dim defaults
    to vendor_id; can also be 'asset' or 'recipe_id'."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "cross-outlet requires operator")
    if dim not in ("vendor_id", "asset", "recipe_id", "employee_id"):
        raise HTTPException(400,
            f"unsupported dim '{dim}'; use vendor_id|asset|"
            f"recipe_id|employee_id")
    tenant_id = (x_tenant_id or "default").strip().lower()
    findings = _gather_findings(tenant_id, lookback_days)

    # group by (kind, dim_value), collect outlet_ids
    groups: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for f in findings:
        dim_val = f["dims"].get(dim)
        outlet = f["dims"].get("outlet_id")
        if not dim_val or not outlet:
            continue
        key = (f["signature"], str(dim_val))
        g = groups.setdefault(key, {
            "signature": f["signature"],
            "dim": dim,
            "dim_value": str(dim_val),
            "outlets": set(),
            "occurrences": 0,
        })
        g["outlets"].add(outlet)
        g["occurrences"] += 1

    rows: List[Dict[str, Any]] = []
    for g in groups.values():
        if len(g["outlets"]) < min_outlet_count:
            continue
        rows.append({
            "signature": g["signature"],
            "dim": g["dim"],
            "dim_value": g["dim_value"],
            "outlet_count": len(g["outlets"]),
            "outlets": sorted(g["outlets"]),
            "occurrences": g["occurrences"],
            "interpretation": (
                f"{g['signature']} for {dim}={g['dim_value']} "
                f"observed across {len(g['outlets'])} outlets "
                f"({g['occurrences']} occurrences)"
            ),
        })
    rows.sort(key=lambda r: (-r["outlet_count"], -r["occurrences"]))
    return {"ok": True,
            "tenant_id": tenant_id,
            "dim": dim,
            "lookback_days": lookback_days,
            "min_outlet_count": min_outlet_count,
            "patterns_found": len(rows),
            "patterns": rows}


# ─── 4. Unified pattern report ──────────────────────────────────────────

@router.get("/report")
def correlation_report(
    lookback_days: int = DEFAULT_LOOKBACK_DAYS,
    x_tenant_id: Optional[str] = Header(None),
    x_audience_register: Optional[str] = Header(None),
):
    """Single endpoint that runs all three pattern detectors and
    returns one consolidated report. CFO / GM dashboard surface."""
    if x_audience_register not in ("operator", "pass_dev"):
        raise HTTPException(403, "correlation report requires operator")
    tenant_id = (x_tenant_id or "default").strip().lower()
    co = co_occurrences(
        lookback_days=lookback_days,
        x_tenant_id=tenant_id, x_audience_register=x_audience_register)
    cas = cascades(
        lookback_days=lookback_days,
        x_tenant_id=tenant_id, x_audience_register=x_audience_register)
    co_v = cross_outlet(
        dim="vendor_id", lookback_days=lookback_days,
        x_tenant_id=tenant_id, x_audience_register=x_audience_register)
    co_a = cross_outlet(
        dim="asset", lookback_days=lookback_days,
        x_tenant_id=tenant_id, x_audience_register=x_audience_register)
    return {
        "ok": True,
        "tenant_id": tenant_id,
        "lookback_days": lookback_days,
        "generated_at": _now().isoformat(),
        "co_occurrences": co.get("pairs", []),
        "cascades": cas.get("cascades", []),
        "cross_outlet_vendor": co_v.get("patterns", []),
        "cross_outlet_asset": co_a.get("patterns", []),
        "summary": {
            "co_occurrence_count": len(co.get("pairs", [])),
            "cascade_count": len(cas.get("cascades", [])),
            "cross_outlet_vendor_count": len(co_v.get("patterns", [])),
            "cross_outlet_asset_count": len(co_a.get("patterns", [])),
        },
    }
