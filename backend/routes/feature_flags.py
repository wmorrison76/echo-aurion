"""iter193 · FM-Upgrade 0 — Feature flag HTTP surface.

Public read:   GET  /api/flags/public?bucket=<user_or_tenant_id>
Admin read:    GET  /api/flags                                   (X-Admin-Token)
Admin write:   POST /api/flags/{name}                            (X-Admin-Token)
Admin delete:  DELETE /api/flags/{name}                          (X-Admin-Token)
"""
from __future__ import annotations
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from lib.flags import list_flags, get_flag, set_flag, is_enabled, _db

router = APIRouter(prefix="/api/flags", tags=["feature-flags"])


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


class FlagBody(BaseModel):
    enabled: Optional[bool] = None
    rollout_pct: Optional[int] = None
    description: Optional[str] = None
    allow_list: Optional[List[str]] = None
    deny_list: Optional[List[str]] = None


@router.get("")
async def admin_list(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    return {"ok": True, "flags": list_flags()}


@router.post("/{name}")
async def admin_upsert(name: str, body: FlagBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    flag = set_flag(
        name,
        enabled=body.enabled, rollout_pct=body.rollout_pct,
        description=body.description,
        allow_list=body.allow_list, deny_list=body.deny_list,
        actor="admin",
    )
    # iter194 · FM-Upgrade 1 — feature_flag.toggled TimelineEvent
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import FEATURE_FLAG_TOGGLED
        _tl(FEATURE_FLAG_TOGGLED,
            actor={"type": "user", "id": "admin", "name": "Admin"},
            entity_refs=[{"kind": "feature_flag", "id": name}],
            payload={"enabled": flag.get("enabled"), "rollout_pct": flag.get("rollout_pct"),
                     "allow_list_size": len(flag.get("allow_list") or []),
                     "deny_list_size": len(flag.get("deny_list") or [])})
    except Exception: pass
    return {"ok": True, "flag": flag}


@router.delete("/{name}")
async def admin_delete(name: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    r = _db().feature_flags.delete_one({"name": name})
    return {"ok": True, "deleted": r.deleted_count}


@router.get("/public")
async def public_resolve(bucket: Optional[str] = None):
    """Resolve every known flag for a given bucket. Called by the frontend on
    app boot. Returns a flat map so the client can cache and check without
    another round trip."""
    out: Dict[str, bool] = {}
    for f in list_flags():
        out[f["name"]] = is_enabled(f["name"], bucket_key=bucket, default=False)
    return {"ok": True, "bucket": bucket, "flags": out}
