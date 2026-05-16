"""iter209 · P2 · White-label tenant config (scaffolding).

Each tenant (operator) can have its own brand tokens stored in `tenant_config`:
    { tenant_id, name, brand_primary, brand_accent, logo_url, favicon_url,
      domain, features: {...}, created_at, updated_at }

The frontend calls GET /api/tenant/config to inject these as CSS vars + title +
favicon so one codebase serves multiple operators. Admin edits via PUT.

For now we return a single default tenant ('default') sourced from
environment variables if no Mongo row exists — lets us ship a working
white-label layer immediately without requiring any data setup.
"""
from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from database import db

router = APIRouter(prefix="/api/tenant", tags=["tenant"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if expected and x_admin_token != expected:
        raise HTTPException(401, "admin token required")


DEFAULT_CONFIG = {
    "tenant_id": "default",
    "name": os.environ.get("TENANT_NAME", "Luccca"),
    "brand_primary": os.environ.get("TENANT_BRAND_PRIMARY", "#c8a97e"),
    "brand_accent": os.environ.get("TENANT_BRAND_ACCENT", "#a855f7"),
    "logo_url": os.environ.get("TENANT_LOGO_URL", ""),
    "favicon_url": os.environ.get("TENANT_FAVICON_URL", ""),
    "domain": os.environ.get("TENANT_DOMAIN", ""),
    "features": {
        "echo_chat_bubble": True,
        "beo_builder": True,
        "activity_timeline": True,
        "crm_lifecycle_audit": True,
    },
}


class TenantConfig(BaseModel):
    tenant_id: Optional[str] = "default"
    name: Optional[str] = None
    brand_primary: Optional[str] = None
    brand_accent: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    domain: Optional[str] = None
    features: Optional[dict] = None


@router.get("/config")
def get_tenant_config(tenant_id: str = "default"):
    """Public read. Frontend uses this on boot to inject white-label tokens."""
    doc = db["tenant_config"].find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not doc:
        return {"ok": True, "config": DEFAULT_CONFIG, "source": "env_defaults"}
    return {"ok": True, "config": doc, "source": "mongo"}


@router.put("/config")
def put_tenant_config(body: TenantConfig, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    tid = body.tenant_id or "default"
    updates = {k: v for k, v in body.model_dump().items() if v is not None and k != "tenant_id"}
    updates["updated_at"] = _now()
    doc = db["tenant_config"].find_one_and_update(
        {"tenant_id": tid},
        {
            "$set": updates,
            "$setOnInsert": {"tenant_id": tid, "created_at": _now()},
        },
        upsert=True,
        return_document=True,
    )
    if doc:
        doc.pop("_id", None)
    return {"ok": True, "config": doc}


@router.get("/list")
def list_tenants(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    rows = list(db["tenant_config"].find({}, {"_id": 0}).limit(100))
    return {"ok": True, "tenants": rows, "count": len(rows)}
