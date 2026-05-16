"""iter210 · Shared admin-token dependency (audit recommendation BE-5).

Replaces ~25 copies of::

    def _require_admin(x_admin_token: Optional[str]):
        expected = os.environ.get("ADMIN_API_TOKEN")
        if expected and x_admin_token != expected:
            raise HTTPException(401, "admin token required")

with a single FastAPI dependency::

    from lib.admin_auth import require_admin_token

    @router.post("/something", dependencies=[Depends(require_admin_token)])
    async def ...

Behaviour is identical to the old duplicated helpers:
    - If ADMIN_API_TOKEN is unset, it's a no-op (dev-friendly)
    - If set, the X-Admin-Token header must match exactly
"""
from __future__ import annotations
import os
from typing import Optional

from fastapi import Header, HTTPException

__all__ = ["require_admin_token"]


def require_admin_token(x_admin_token: Optional[str] = Header(None)) -> None:
    expected = os.environ.get("ADMIN_API_TOKEN")
    if expected and x_admin_token != expected:
        raise HTTPException(status_code=401, detail="admin token required")
