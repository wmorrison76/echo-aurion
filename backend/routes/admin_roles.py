"""
D11b · Custom Role Persistence — admin endpoint for creating/editing
custom role definitions that override or extend the seeded ROLE_ACCESS
matrix in `access_matrix.py`.

The customer admin needs to be able to define roles that don't ship in
the seed — e.g. "Mountain Region Culinary Director" with access to
specific departments AND a custom outlet set (the outlet set is per-USER
and lives in `admin_users.outlet_ids` — see D11a; this module handles
the role TEMPLATE, not the per-user assignment).

Endpoints:
  POST   /api/admin/roles            — create custom role
  GET    /api/admin/roles            — list internal + custom (unified)
  PUT    /api/admin/roles/{role}     — update custom role
  DELETE /api/admin/roles/{role}     — uninstall custom role
                                       (cannot delete internal seeded roles)

Tenant isolation: rows keyed by (tenant_id, role). Tenant A's "mountain-
culinary-director" doesn't bleed to tenant B.

Internal role overrides: a custom role with the SAME slug as a seeded
internal role (e.g. "executive-chef") replaces the internal definition
*for that tenant only*. The seeded version is unchanged for everyone
else. This lets an MSP customize for a specific deployment without
forking the codebase.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db
from routes.access_matrix import DEPT_MODULES, ROLE_ACCESS, effective_modules, _LANDINGS

router = APIRouter(prefix="/api/admin/roles", tags=["admin-roles"])


ALLOWED_TIERS = {
    "admin", "enterprise", "property", "dept-head",
    "enterprise-desktop", "mobile",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_tenant(x_tenant_id: Optional[str], x_admin_token: Optional[str]) -> str:
    """Same gate as module_registry — admin token required (when set),
    tenant_id picks the row scope."""
    expected = os.environ.get("ADMIN_API_TOKEN")
    if expected and x_admin_token != expected:
        raise HTTPException(401, "admin token required")
    return (x_tenant_id or "default").strip().lower()


# ─── Schemas ──────────────────────────────────────────────────────────────

class CustomRoleBody(BaseModel):
    role: str = Field(..., min_length=2, max_length=80,
                      pattern=r"^[a-z0-9][a-z0-9._-]*$",
                      description="Slug, e.g. mountain-culinary-director")
    label: str = Field(..., min_length=2, max_length=120,
                       description="Human label shown in the admin UI")
    tier: str = Field(..., description="One of admin|enterprise|property|"
                                         "dept-head|enterprise-desktop|mobile")
    depts: List[str] = []
    extras: List[str] = []
    landing_panel: Optional[str] = None
    description: Optional[str] = ""


class CustomRoleUpdate(BaseModel):
    label: Optional[str] = None
    tier: Optional[str] = None
    depts: Optional[List[str]] = None
    extras: Optional[List[str]] = None
    landing_panel: Optional[str] = None
    description: Optional[str] = None


# ─── Validators ───────────────────────────────────────────────────────────

def _validate_payload(body: CustomRoleBody) -> None:
    if body.tier not in ALLOWED_TIERS:
        raise HTTPException(400, f"tier must be one of {sorted(ALLOWED_TIERS)}")
    bad_depts = [d for d in body.depts if d not in DEPT_MODULES]
    if bad_depts:
        raise HTTPException(400, f"unknown depts: {bad_depts}. "
                                 f"valid: {sorted(DEPT_MODULES.keys())}")
    # Build the union of valid module ids and check extras against it.
    all_valid_modules: set[str] = set()
    for ms in DEPT_MODULES.values():
        all_valid_modules.update(ms)
    bad_extras = [e for e in body.extras if e not in all_valid_modules]
    if bad_extras:
        raise HTTPException(400, f"unknown extras (modules not in DEPT_MODULES): "
                                 f"{bad_extras}")


# ─── Endpoints ────────────────────────────────────────────────────────────

@router.post("")
def create_custom_role(
    body: CustomRoleBody,
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """Create a custom role. Fails if the (tenant_id, role) pair already
    exists — use PUT to update an existing custom role."""
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    _validate_payload(body)
    if db["custom_roles"].find_one(
        {"tenant_id": tenant, "role": body.role}, {"_id": 0}
    ):
        raise HTTPException(409, f"custom role '{body.role}' already exists "
                                 f"for this tenant — use PUT to update")

    doc = {
        "tenant_id": tenant,
        "role": body.role,
        "label": body.label,
        "tier": body.tier,
        "depts": list(body.depts),
        "extras": list(body.extras),
        "landing_panel": body.landing_panel or "chronos",
        "description": body.description or "",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "source": "custom",
    }
    db["custom_roles"].insert_one(doc)
    return {"ok": True, "role": doc,
            "effective_modules": effective_modules(body.role, tenant)}


@router.put("/{role}")
def update_custom_role(
    role: str,
    body: CustomRoleUpdate,
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    existing = db["custom_roles"].find_one(
        {"tenant_id": tenant, "role": role}, {"_id": 0})
    if not existing:
        raise HTTPException(404, f"custom role '{role}' not found for this tenant")

    update = {"updated_at": _now_iso()}
    if body.label is not None:
        update["label"] = body.label
    if body.tier is not None:
        if body.tier not in ALLOWED_TIERS:
            raise HTTPException(400, f"tier must be one of {sorted(ALLOWED_TIERS)}")
        update["tier"] = body.tier
    if body.depts is not None:
        bad = [d for d in body.depts if d not in DEPT_MODULES]
        if bad:
            raise HTTPException(400, f"unknown depts: {bad}")
        update["depts"] = list(body.depts)
    if body.extras is not None:
        all_valid: set[str] = set()
        for ms in DEPT_MODULES.values(): all_valid.update(ms)
        bad = [e for e in body.extras if e not in all_valid]
        if bad:
            raise HTTPException(400, f"unknown extras: {bad}")
        update["extras"] = list(body.extras)
    if body.landing_panel is not None:
        update["landing_panel"] = body.landing_panel
    if body.description is not None:
        update["description"] = body.description

    db["custom_roles"].update_one(
        {"tenant_id": tenant, "role": role}, {"$set": update})
    fresh = db["custom_roles"].find_one(
        {"tenant_id": tenant, "role": role}, {"_id": 0})
    return {"ok": True, "role": fresh,
            "effective_modules": effective_modules(role, tenant)}


@router.delete("/{role}")
def delete_custom_role(
    role: str,
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    # Refuse to delete a seeded internal role — those live in code, not
    # the DB. (You CAN delete a custom override of an internal slug;
    # that just removes the override and reverts to the seeded behavior.)
    if role in ROLE_ACCESS and not db["custom_roles"].find_one(
        {"tenant_id": tenant, "role": role}, {"_id": 0}
    ):
        raise HTTPException(400, f"'{role}' is a seeded internal role "
                                 f"(no custom override to remove)")
    r = db["custom_roles"].delete_one({"tenant_id": tenant, "role": role})
    if getattr(r, "deleted_count", 0) == 0:
        raise HTTPException(404, f"custom role '{role}' not found for this tenant")
    return {"ok": True, "deleted": role,
            "reverted_to_seeded": role in ROLE_ACCESS}


@router.get("")
def list_roles(
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """List every role visible to this tenant — internal + custom in a
    unified shape so the admin UI can render one table."""
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    customs = list(db["custom_roles"].find({"tenant_id": tenant}, {"_id": 0}))
    custom_slugs = {c["role"] for c in customs}

    internal = []
    for slug, spec in ROLE_ACCESS.items():
        # If a custom override exists for this slug, the custom row will
        # appear in the customs list — don't double-list the internal.
        if slug in custom_slugs:
            continue
        internal.append({
            "role": slug,
            "label": slug.replace("-", " ").title(),
            "tier": spec.get("tier"),
            "depts": list(spec.get("depts") or []),
            "extras": list(spec.get("extras") or []),
            "landing_panel": _LANDINGS.get(slug, "dashboard"),
            "source": "internal",
        })

    return {
        "ok": True,
        "tenant_id": tenant,
        "internal": internal,
        "custom": customs,
        "total": len(internal) + len(customs),
        # Convenience for the UI builder.
        "available_depts": sorted(DEPT_MODULES.keys()),
        "available_tiers": sorted(ALLOWED_TIERS),
    }
