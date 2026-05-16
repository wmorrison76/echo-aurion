"""
DB Connection Pool Monitor + Leak Detector
==========================================
L.14 from the launch-readiness audit. Long-running Python services
slowly leak DB connections if any code path forgets to close a
client or release a connection back to the pool. Once the pool is
exhausted, every subsequent request hangs.

This module:
  · Reports current pool state (active / idle / max)
  · Tracks pool-state samples over time so leaks become visible
    as a steadily-rising "active" curve
  · Surfaces a /connections/snapshot endpoint that ops + automated
    health checks consume

It does NOT fix leaks (the leaking code path has to be found and
fixed). It makes leaks observable so they can be found.

Doctrine alignment:
  · §1.1 transparency — pool state is queryable, not hidden
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict
from fastapi import APIRouter, Query

from database import db


router = APIRouter(prefix="/api/connections", tags=["connection-pool"])

_now = lambda: datetime.now(timezone.utc).isoformat()


def _ensure_indexes():
    db["connection_pool_snapshots"].create_index("ts")
    db["connection_pool_snapshots"].create_index("ts", expireAfterSeconds=7 * 24 * 60 * 60)


try:
    _ensure_indexes()
except Exception:
    pass


def _pymongo_pool_state() -> Dict:
    """Best-effort introspection of pymongo's connection pool. PyMongo
    exposes pool stats via its event listeners or via the `topology`
    description; we read what's available without taking a hard
    dependency on internal APIs."""
    try:
        client = db.client                                 # standard pymongo client attribute
    except Exception:
        return {"available": False, "reason": "db.client not exposed"}

    try:
        topology = client._topology
        servers = topology.description.server_descriptions()
        per_server = []
        for addr, sd in servers.items():
            try:
                pool = topology._servers[addr].pool
                per_server.append({
                    "address": f"{addr[0]}:{addr[1]}" if isinstance(addr, tuple) else str(addr),
                    "active_sockets": getattr(pool, "active_sockets", None),
                    "in_use": len(getattr(pool, "active_contexts", []) or []),
                    "available": getattr(pool, "available_sockets", None) and len(pool.available_sockets) or None,
                    "max_pool_size": getattr(pool, "max_pool_size", None),
                    "min_pool_size": getattr(pool, "min_pool_size", None),
                    "operation_count": getattr(pool, "operation_count", None),
                })
            except Exception as exc:                       # pragma: no cover
                per_server.append({"address": str(addr), "error": str(exc)})
        return {"available": True, "per_server": per_server, "ts": _now()}
    except Exception as exc:                               # pragma: no cover
        return {"available": False, "reason": f"introspection failed: {exc}"}


@router.get("/snapshot")
async def snapshot():
    """Current connection-pool state. Intended for ops dashboards
    + the canonical health endpoint."""
    state = _pymongo_pool_state()
    if state.get("available"):
        try:
            db["connection_pool_snapshots"].insert_one({
                "ts": _now(),
                "per_server": state["per_server"],
            })
        except Exception:
            pass
    return state


@router.get("/history")
async def history(hours: int = Query(24, ge=1, le=168)):
    """Pool-state samples over the last N hours. Reveals leaks as a
    steadily-rising 'in_use' curve."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    rows = list(
        db["connection_pool_snapshots"].find(
            {"ts": {"$gte": cutoff}}, {"_id": 0},
        ).sort("ts", 1)
    )
    if not rows:
        return {"available": False, "reason": "no_samples_yet", "remediation": "Hit /api/connections/snapshot once or schedule it to run every minute."}

    # Compute trend on the first server's in_use count
    in_use_series = []
    for r in rows:
        ps = r.get("per_server") or []
        if ps and ps[0].get("in_use") is not None:
            in_use_series.append(ps[0]["in_use"])

    trend = "insufficient_data"
    if len(in_use_series) >= 6:
        half = len(in_use_series) // 2
        early = sum(in_use_series[:half]) / half
        late = sum(in_use_series[half:]) / (len(in_use_series) - half)
        if late > early * 1.5:
            trend = "rising_likely_leak"
        elif late > early * 1.10:
            trend = "rising_watch"
        else:
            trend = "stable"

    return {
        "hours": hours,
        "samples": len(rows),
        "trend": trend,
        "in_use_series_summary": {
            "min": min(in_use_series) if in_use_series else None,
            "max": max(in_use_series) if in_use_series else None,
            "latest": in_use_series[-1] if in_use_series else None,
        },
        "rows": rows,
    }
