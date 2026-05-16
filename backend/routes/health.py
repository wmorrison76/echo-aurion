"""
D53.3 · Health check endpoints.

Standard k8s / Fly / load-balancer hooks:

  GET /healthz   liveness — process is alive, can serve requests
  GET /readyz    readiness — process is alive AND DB is reachable
                 AND auto_register has completed
  GET /version   build SHA + ts (for cache-busting + correlation)

Doctrine alignment

  · §3.1 append-only: health checks never write
  · No tenant scoping — health endpoints are infra-level
  · No PII exposed — neither endpoint reveals data shape
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict

from fastapi import APIRouter, Response

logger = logging.getLogger("echo.health")

router = APIRouter(tags=["health"])

# Process boot time (ms since epoch) for uptime calculation
_BOOT_AT = time.time()

# Set by server.py once auto_register completes
_READY = {"ok": False, "reason": "boot"}


def mark_ready() -> None:
    """Server.py calls this once startup is complete."""
    _READY["ok"] = True
    _READY["reason"] = "ready"


def mark_unready(reason: str) -> None:
    _READY["ok"] = False
    _READY["reason"] = reason


@router.get("/healthz")
def healthz() -> Dict[str, Any]:
    """Liveness check. Returns 200 as long as the process is
    reachable. Does NOT check downstream deps — that's /readyz."""
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - _BOOT_AT, 1),
    }


@router.get("/readyz")
def readyz(response: Response) -> Dict[str, Any]:
    """Readiness check. Verifies:
      · process is alive
      · MongoDB is reachable (ping)
      · auto_register completed
    Returns 503 if not ready (load balancer should drain traffic)."""
    out: Dict[str, Any] = {
        "status": "checking",
        "checks": {},
    }

    # Process
    out["checks"]["process"] = {
        "ok": True,
        "uptime_seconds": round(time.time() - _BOOT_AT, 1),
    }

    # Mongo
    try:
        import database
        # Real Mongo: db.command("ping"). FakeDb: just verify the
        # handle exists.
        if hasattr(database.db, "command"):
            database.db.command("ping")
        out["checks"]["mongo"] = {"ok": True}
    except Exception as e:
        out["checks"]["mongo"] = {"ok": False,
                                    "error": str(e)[:120]}

    # Boot complete
    out["checks"]["startup"] = dict(_READY)

    all_ok = all(c.get("ok", False) for c in out["checks"].values())
    out["status"] = "ok" if all_ok else "not_ready"
    if not all_ok:
        response.status_code = 503
    return out


@router.get("/version")
def version() -> Dict[str, str]:
    """Build identity. Helps correlate logs to git SHA."""
    return {
        "git_sha": os.getenv("GIT_SHA", "unknown"),
        "build_ts": os.getenv("BUILD_TS", "unknown"),
        "service": "echo-aurion-luccca",
        "started_at": str(_BOOT_AT),
    }
