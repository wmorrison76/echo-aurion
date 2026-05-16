"""
Performance Profiler / Slow-Query Log
======================================
L.7 from the launch-readiness audit. Identifies the 5% of endpoints
generating 80% of latency before customers notice.

Two layers:

  1. **Endpoint timing capture** — the structured-logging
     middleware (services/structured_logging.py) already emits
     `request.end` events with `duration_ms`. This module persists
     them to `slo_measurements` (the same collection the SLO
     dashboard reads) and adds a `perf_outliers` capture for
     anomalous slow requests.

  2. **DB query slow-log** — wraps pymongo's command listener so
     queries exceeding a threshold persist to `db_slow_queries`
     with the operation type, collection, query shape, and
     duration. Doesn't capture the actual query values (PII risk);
     only the shape.

Both surfaces are queryable via /admin/perf endpoints.

Doctrine alignment:
  · §1.1 transparency — slow paths are visible
  · Privacy Tenet 4 — query *shapes* are logged, not values
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import uuid4
import time
from fastapi import APIRouter, Query

from database import db


router = APIRouter(prefix="/api/admin/perf", tags=["admin-perf"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


# Default thresholds — endpoints slower than this are "outliers"
ENDPOINT_OUTLIER_THRESHOLD_MS = 2000
DB_SLOW_QUERY_THRESHOLD_MS = 250

# Shape-only logging: redact actual values from queries before persisting
REDACT_PLACEHOLDER = "<value>"


def _ensure_indexes():
    db["slo_measurements"].create_index([("endpoint", 1), ("ts", -1)])
    db["slo_measurements"].create_index("ts", expireAfterSeconds=30 * 24 * 60 * 60)
    db["perf_outliers"].create_index([("endpoint", 1), ("ts", -1)])
    db["perf_outliers"].create_index("ts", expireAfterSeconds=90 * 24 * 60 * 60)
    db["db_slow_queries"].create_index([("collection", 1), ("operation", 1), ("ts", -1)])
    db["db_slow_queries"].create_index("ts", expireAfterSeconds=30 * 24 * 60 * 60)


try:
    _ensure_indexes()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────
# Endpoint timing capture — called from the request middleware
# ─────────────────────────────────────────────────────────────────
def record_endpoint_timing(method: str, path: str, status_code: int, duration_ms: float):
    """Persist an SLO measurement. Called by the structured-logging
    middleware on every request.end event."""
    ts = _now()
    endpoint = f"{method.upper()} {_normalize_path(path)}"
    try:
        db["slo_measurements"].insert_one({
            "endpoint": endpoint,
            "ts": ts,
            "duration_ms": round(duration_ms, 2),
            "status_code": status_code,
        })
        if duration_ms >= ENDPOINT_OUTLIER_THRESHOLD_MS:
            db["perf_outliers"].insert_one({
                "outlier_id": _uid(),
                "endpoint": endpoint,
                "ts": ts,
                "duration_ms": round(duration_ms, 2),
                "status_code": status_code,
                "threshold_ms": ENDPOINT_OUTLIER_THRESHOLD_MS,
            })
    except Exception:
        # Never let perf-logging break the actual request
        pass


def _normalize_path(path: str) -> str:
    """Replace UUIDs + numeric IDs in paths so /api/foo/abc123 and
    /api/foo/def456 group together for perf analysis."""
    import re
    path = re.sub(r"/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}", path)
    path = re.sub(r"/[a-z]{3}-[a-f0-9]{8,}", "/{id}", path)
    path = re.sub(r"/\d+", "/{n}", path)
    return path


# ─────────────────────────────────────────────────────────────────
# DB slow-query capture — pymongo command listener
# ─────────────────────────────────────────────────────────────────
class SlowQueryListener:
    """pymongo CommandListener that logs slow queries to
    db_slow_queries. Wire by registering on the MongoClient."""

    def __init__(self, threshold_ms: float = DB_SLOW_QUERY_THRESHOLD_MS):
        self.threshold_ms = threshold_ms
        self._starts: Dict[int, float] = {}

    def started(self, event):
        self._starts[event.request_id] = time.monotonic_ns()

    def succeeded(self, event):
        start_ns = self._starts.pop(event.request_id, None)
        if start_ns is None:
            return
        duration_ms = (time.monotonic_ns() - start_ns) / 1_000_000
        if duration_ms < self.threshold_ms:
            return
        try:
            db["db_slow_queries"].insert_one({
                "ts": _now(),
                "operation": event.command_name,
                "collection": event.command.get(event.command_name) if isinstance(event.command, dict) else None,
                "duration_ms": round(duration_ms, 2),
                "request_id": event.request_id,
                "shape": _query_shape(event.command),
            })
        except Exception:
            pass

    def failed(self, event):
        self._starts.pop(event.request_id, None)


def _query_shape(command: dict) -> dict:
    """Return the SHAPE of a query — keys preserved, values
    replaced with a placeholder. PII-safe."""
    if not isinstance(command, dict):
        return {}
    out: Dict = {}
    for k, v in command.items():
        if isinstance(v, dict):
            out[k] = _query_shape(v)
        elif isinstance(v, list):
            out[k] = [_query_shape(item) if isinstance(item, dict) else REDACT_PLACEHOLDER for item in v[:5]]
            if len(v) > 5:
                out[k].append(f"...{len(v) - 5} more")
        elif isinstance(v, (str, int, float, bool)):
            out[k] = REDACT_PLACEHOLDER
        else:
            out[k] = type(v).__name__
    return out


# ─────────────────────────────────────────────────────────────────
# Read API — admin only
# ─────────────────────────────────────────────────────────────────
@router.get("/endpoints")
async def slow_endpoints(window_hours: int = Query(24, ge=1, le=720), limit: int = Query(20, ge=1, le=100)):
    """Top N slowest endpoints by p95 latency over the lookback
    window."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=window_hours)).isoformat()
    pipeline = [
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {
            "_id": "$endpoint",
            "samples": {"$sum": 1},
            "max_ms": {"$max": "$duration_ms"},
            "avg_ms": {"$avg": "$duration_ms"},
            "all": {"$push": "$duration_ms"},
        }},
        {"$sort": {"max_ms": -1}},
        {"$limit": limit},
    ]
    results = list(db["slo_measurements"].aggregate(pipeline))

    out = []
    for r in results:
        durations = sorted(r["all"])
        n = len(durations)
        out.append({
            "endpoint": r["_id"],
            "samples": r["samples"],
            "p50_ms": round(durations[n // 2], 2) if durations else 0,
            "p95_ms": round(durations[max(0, int(n * 0.95) - 1)], 2) if durations else 0,
            "p99_ms": round(durations[max(0, int(n * 0.99) - 1)], 2) if durations else 0,
            "max_ms": round(r["max_ms"], 2),
            "avg_ms": round(r["avg_ms"], 2),
        })
    return {"window_hours": window_hours, "endpoints": out}


@router.get("/outliers")
async def list_outliers(window_hours: int = Query(24, ge=1, le=720), limit: int = Query(50, ge=1, le=500)):
    """Most-recent slow-request outliers (>2000ms)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=window_hours)).isoformat()
    rows = list(
        db["perf_outliers"].find({"ts": {"$gte": cutoff}}, {"_id": 0})
        .sort("ts", -1).limit(limit)
    )
    return {"window_hours": window_hours, "count": len(rows), "outliers": rows}


@router.get("/db-slow-queries")
async def slow_queries(window_hours: int = Query(24, ge=1, le=720), limit: int = Query(50, ge=1, le=500)):
    """Slow MongoDB queries from the listener."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=window_hours)).isoformat()
    rows = list(
        db["db_slow_queries"].find({"ts": {"$gte": cutoff}}, {"_id": 0})
        .sort("duration_ms", -1).limit(limit)
    )
    return {"window_hours": window_hours, "count": len(rows), "queries": rows}


@router.get("/summary")
async def perf_summary(window_hours: int = Query(24, ge=1, le=720)):
    """One-screen perf health summary."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=window_hours)).isoformat()
    total_requests = db["slo_measurements"].count_documents({"ts": {"$gte": cutoff}})
    total_outliers = db["perf_outliers"].count_documents({"ts": {"$gte": cutoff}})
    total_slow_queries = db["db_slow_queries"].count_documents({"ts": {"$gte": cutoff}})

    return {
        "window_hours": window_hours,
        "total_requests": total_requests,
        "outlier_count": total_outliers,
        "outlier_rate": round(total_outliers / max(1, total_requests), 4),
        "slow_query_count": total_slow_queries,
        "thresholds": {
            "endpoint_outlier_ms": ENDPOINT_OUTLIER_THRESHOLD_MS,
            "db_slow_query_ms": DB_SLOW_QUERY_THRESHOLD_MS,
        },
        "checked_at": _now(),
    }
