"""
Per-Endpoint SLO Definitions + Dashboard
=========================================
L.13 from the launch-readiness audit. SLOs (Service Level Objectives)
are explicit, measured, public commitments about performance.

For Echo / LUCCCA, the SLOs are tiered by criticality:

  · TIER_1 — money + audit + login
      Availability: 99.9% (≤ 43.2 min/month downtime)
      P95 latency:  < 500ms
      P99 latency:  < 2000ms
  · TIER_2 — read endpoints (dashboards, lists)
      Availability: 99.5%
      P95:          < 1000ms
  · TIER_3 — heavy analytics (cross-property benchmarking, retrospective)
      Availability: 99.0%
      P95:          < 5000ms

Every endpoint declares its tier. The /api/slo dashboard reads the
declared tiers + recent latency histograms (from request logs / a
metrics sink) and reports compliance. Without a metrics sink wired,
this module surfaces declared SLOs only — when the sink is wired,
it reports real compliance.

Doctrine alignment:
  · §1.1 transparency — public SLOs the customer can hold us to
"""
from datetime import datetime, timezone, timedelta
from statistics import median
from typing import Dict, List, Optional
from fastapi import APIRouter, Query

from database import db


router = APIRouter(prefix="/api/slo", tags=["slo"])

_now = lambda: datetime.now(timezone.utc).isoformat()


# Tier definitions
SLO_TIERS = {
    "tier_1_critical": {
        "description": "Money, audit, login — highest reliability commitments",
        "availability_target_pct": 99.9,
        "p95_latency_ms": 500,
        "p99_latency_ms": 2000,
    },
    "tier_2_standard": {
        "description": "Read endpoints, dashboards, lists",
        "availability_target_pct": 99.5,
        "p95_latency_ms": 1000,
        "p99_latency_ms": 4000,
    },
    "tier_3_analytic": {
        "description": "Heavy analytics, cross-property aggregation, retrospective",
        "availability_target_pct": 99.0,
        "p95_latency_ms": 5000,
        "p99_latency_ms": 15000,
    },
}


# Endpoint → tier mapping. Edit as endpoints are added.
ENDPOINT_TIERS: Dict[str, str] = {
    # Tier 1 — money + audit + auth-critical
    "POST /api/aurum_gl_journal":              "tier_1_critical",
    "POST /api/payroll/run":                    "tier_1_critical",
    "POST /api/period-close/runs/{id}/close":   "tier_1_critical",
    "POST /api/intercompany/consolidate":       "tier_1_critical",
    "POST /api/admin-audit/log":                "tier_1_critical",
    "GET /api/upgrade/version":                 "tier_1_critical",
    "GET /api/upgrade/health":                  "tier_1_critical",
    "GET /api/health":                          "tier_1_critical",
    "POST /api/auth/login":                     "tier_1_critical",
    "POST /api/auth/logout":                    "tier_1_critical",

    # Tier 2 — standard reads
    "GET /api/forecast-21/forecast":            "tier_2_standard",
    "GET /api/outlet-capture/dashboard/{id}":   "tier_2_standard",
    "GET /api/pace/property/{id}":              "tier_2_standard",
    "GET /api/cash-runway/{id}":                "tier_2_standard",
    "GET /api/loan-covenants/dashboard/{id}":   "tier_2_standard",
    "GET /api/exception-review/{id}":           "tier_2_standard",
    "GET /api/lifecycles/digest/{id}":          "tier_2_standard",
    "GET /api/period-close/digest/{id}":        "tier_2_standard",

    # Tier 3 — heavy analytics
    "GET /api/cross-property/benchmark":        "tier_3_analytic",
    "GET /api/cross-property/deep-dive/{id}":   "tier_3_analytic",
    "GET /api/forecast-drift/{id}":             "tier_3_analytic",
    "GET /api/outlet-capture/retrospective/{id}": "tier_3_analytic",
    "GET /api/recipe-variance/property/{id}":   "tier_3_analytic",
    "GET /api/vendor-pareto/spend/{id}":        "tier_3_analytic",
    "GET /api/labor-productivity/property/{id}": "tier_3_analytic",
    "GET /api/menu-engineering/property/{id}":  "tier_3_analytic",
}


def _ensure_indexes():
    db["slo_measurements"].create_index([("endpoint", 1), ("ts", -1)])
    db["slo_measurements"].create_index("ts")


try:
    _ensure_indexes()
except Exception:
    pass


@router.get("/tiers")
async def get_tiers():
    """Public SLO tier definitions."""
    return {"tiers": SLO_TIERS, "endpoint_count": len(ENDPOINT_TIERS), "endpoints_by_tier": _endpoints_by_tier()}


@router.get("/endpoint")
async def endpoint_slo(method: str = "GET", path: str = "/"):
    """Look up the SLO for a specific endpoint."""
    key = f"{method.upper()} {path}"
    tier = ENDPOINT_TIERS.get(key, "tier_2_standard")
    return {
        "endpoint": key,
        "tier": tier,
        "tier_definition": SLO_TIERS[tier],
        "tier_default_assumed": key not in ENDPOINT_TIERS,
    }


@router.get("/dashboard")
async def dashboard(window_hours: int = Query(24, ge=1, le=720)):
    """Per-endpoint compliance over the last N hours.

    Reads from `slo_measurements` if populated (request middleware
    writes there); otherwise reports declared SLOs without compliance
    data."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=window_hours)).isoformat()
    rows = list(
        db["slo_measurements"].find({"ts": {"$gte": cutoff}}, {"_id": 0})
    )
    if not rows:
        return {
            "window_hours": window_hours,
            "available": False,
            "reason": "no_slo_measurements_in_window",
            "remediation": "Wire request logging middleware to insert into slo_measurements per request, OR connect a metrics sink (Datadog, Loki, Prometheus) and read from there.",
            "declared_tiers": SLO_TIERS,
            "endpoint_count": len(ENDPOINT_TIERS),
        }

    by_endpoint: Dict[str, List[Dict]] = {}
    for r in rows:
        by_endpoint.setdefault(r["endpoint"], []).append(r)

    compliance: List[Dict] = []
    for ep, measurements in by_endpoint.items():
        tier_key = ENDPOINT_TIERS.get(ep, "tier_2_standard")
        tier = SLO_TIERS[tier_key]
        latencies = sorted(m["duration_ms"] for m in measurements)
        success_count = sum(1 for m in measurements if m.get("status_code", 0) < 500)
        availability_pct = (success_count / len(measurements)) * 100

        if latencies:
            p95_idx = max(0, int(len(latencies) * 0.95) - 1)
            p99_idx = max(0, int(len(latencies) * 0.99) - 1)
            p95 = latencies[p95_idx]
            p99 = latencies[p99_idx]
        else:
            p95 = p99 = 0

        compliance.append({
            "endpoint": ep,
            "tier": tier_key,
            "samples": len(measurements),
            "availability_pct": round(availability_pct, 4),
            "availability_target_pct": tier["availability_target_pct"],
            "availability_compliant": availability_pct >= tier["availability_target_pct"],
            "p95_ms": round(p95, 2),
            "p95_target_ms": tier["p95_latency_ms"],
            "p95_compliant": p95 <= tier["p95_latency_ms"],
            "p99_ms": round(p99, 2),
            "p99_target_ms": tier["p99_latency_ms"],
            "p99_compliant": p99 <= tier["p99_latency_ms"],
        })

    breaches = [c for c in compliance if not (c["availability_compliant"] and c["p95_compliant"] and c["p99_compliant"])]

    return {
        "window_hours": window_hours,
        "available": True,
        "endpoint_count": len(compliance),
        "breach_count": len(breaches),
        "compliance": sorted(compliance, key=lambda c: (c["tier"], -c["samples"])),
        "breaches": breaches,
        "tiers": SLO_TIERS,
    }


def _endpoints_by_tier() -> Dict[str, List[str]]:
    out: Dict[str, List[str]] = {t: [] for t in SLO_TIERS}
    for ep, tier in ENDPOINT_TIERS.items():
        out.setdefault(tier, []).append(ep)
    return out
