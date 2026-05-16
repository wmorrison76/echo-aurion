"""
D17a · Fuse Box admin endpoint.

  GET /api/admin/fuse-box        — every wire's status (UI panel)
  GET /api/admin/fuse-box/health — live health probes for each service

The endpoint is read-only — wires are configured via env vars / the
secrets manager, not via the UI. Lets a customer's IT / DevOps person
verify what's wired before going live, without ssh'ing into the box
and grep'ing the .env file.

Auth: same gate as the other admin surfaces — if ADMIN_API_TOKEN is
set in the fuse box, require it in X-Admin-Token. If not set
(development), anyone with admin sidebar access can read.

What this is NOT:
  · NOT a place to *edit* secrets — too high-risk a UI for a web
    panel. Edit .env or the secrets manager, redeploy, refresh.
  · NOT a place to manage per-customer integrations (Stripe, ADP,
    Toast). Those go in the integrations layer.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from config import get_settings, fuse_box_snapshot
from services.clients import health_check_all

router = APIRouter(prefix="/api/admin/fuse-box", tags=["admin-fuse-box"])


def _require_admin(x_admin_token: Optional[str]) -> None:
    s = get_settings()
    if s.ADMIN_API_TOKEN and x_admin_token != s.ADMIN_API_TOKEN:
        raise HTTPException(401, "admin token required")


@router.get("")
def get_fuse_box(x_admin_token: Optional[str] = Header(None)):
    """Snapshot of every wire — keys, masked values, configured-or-not,
    grouped by category. The admin UI renders this as a fuse-box
    diagram."""
    _require_admin(x_admin_token)
    snap = fuse_box_snapshot()
    # Roll up per-category counts so the UI can show "auth: 3/4 wired".
    by_cat: dict[str, dict] = {}
    for w in snap["wires"]:
        c = w["category"]
        bucket = by_cat.setdefault(c, {"wired": 0, "total": 0})
        bucket["total"] += 1
        if w["configured"]:
            bucket["wired"] += 1
    return {
        "ok": True,
        "env": snap["env"],
        "by_category": by_cat,
        "wires": snap["wires"],
    }


@router.get("/health")
def get_health(x_admin_token: Optional[str] = Header(None)):
    """Live health probes for each service (Mongo ping, key-present
    check for OpenAI/Anthropic, etc.). Cheap to call — designed for
    a dashboard refresh-every-30s pattern."""
    _require_admin(x_admin_token)
    return {"ok": True, "checks": health_check_all()}
