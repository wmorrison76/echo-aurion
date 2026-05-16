"""
Lightweight admin guard for standalone SaaS dashboards and scheduler-trigger endpoints.
Uses a shared ADMIN_API_TOKEN from env. Header: `X-Admin-Token: <token>`.

Rationale: Pastry/BEO admin dashboards, billing sweeps, and Stratus escalation
triggers expose customer PII + revenue + control actions. Until full Google Auth
(already on backlog) is wired, these MUST be gated.

If ADMIN_API_TOKEN is not set, all admin endpoints FAIL CLOSED with a 503 so we
can never accidentally ship an open admin dashboard.
"""
import os
import hmac
from fastapi import Header, HTTPException

_ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "")


def require_admin(x_admin_token: str | None = Header(default=None)):
    """FastAPI dependency: require a valid admin token header.
    Uses hmac.compare_digest for constant-time comparison.
    """
    if not _ADMIN_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="ADMIN_API_TOKEN not configured — admin endpoints disabled. "
                   "Set ADMIN_API_TOKEN in backend/.env to enable.",
        )
    if not x_admin_token or not hmac.compare_digest(x_admin_token, _ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Admin-Token header")
    return True
