"""
D13 · Third-Party Module Registry — wrap-around for partner modules.

Until D13 the platform only toggled internal modules on/off (D8). The
"on/off" framework was designed to read modules from a static list of
known names — there was no path for a customer or partner to plug a
third-party module into the dashboard.

This module ships the **backend half** of the wrap-around:

  POST /api/admin/modules/install         — install a manifest the admin
                                            pastes (JSON body)
  POST /api/admin/modules/install-from-url — fetch + validate a manifest
                                            from a URL (HTTPS-only in
                                            production)
  GET  /api/admin/modules/registry        — list installed modules
                                            (internal + third-party)
  POST /api/admin/modules/{id}/toggle     — enable/disable an installed
                                            module
  DELETE /api/admin/modules/{id}          — uninstall

Security posture:
  • iframe mode ONLY in this PR — no remote code execution / dynamic
    import. The marketplace UI mounts the third-party module in a
    sandboxed iframe with a postMessage bridge for auth + theme.
    Bundle-import mode is intentionally deferred until we have a
    threat model + signed-bundle review.
  • Manifest URL must be HTTPS in production (LUCCCA_ENV=production).
    Localhost / 127.0.0.1 / non-https accepted only in development.
  • Tenant-scoped: each customer's installed modules live in their
    own row set. A module installed for tenant A is not visible to
    tenant B.
  • Permissions are declared in the manifest and surfaced to the
    admin during install — they must explicitly grant before the
    module activates.
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/admin/modules", tags=["module-registry"])


# ─── Manifest schema ──────────────────────────────────────────────────────

# Permissions a third-party module may request. The customer admin
# must explicitly approve these during install. Keep this list narrow:
# every new permission widens the partner attack surface.
ALLOWED_PERMISSIONS = {
    "read:user_profile",     # caller's name + role + tenant
    "read:outlet_list",      # the outlets the user oversees
    "read:user_id",          # opaque user_id (no PII)
    "read:property_id",      # which property is active
    "write:notifications",   # send user a notification via the host
    "open:url",              # open external links via the host (auditable)
}

# Where a module renders. Tier maps to D8's three-tier dashboard system.
ALLOWED_TIERS = {"properties", "outlets", "outlet-detail", "mobile"}


class ModuleUI(BaseModel):
    icon_url: Optional[str] = None
    sidebar_label: Optional[str] = None
    default_tier: Optional[str] = None  # one of ALLOWED_TIERS


class ThirdPartyManifest(BaseModel):
    """Strict shape for a third-party module manifest. The validator
    enforces field hygiene; the install endpoints additionally check
    URL scheme + permissions allowlist."""
    id: str = Field(..., min_length=3, max_length=120,
                    pattern=r"^[a-z0-9][a-z0-9._-]*$",
                    description="Stable slug, e.g. marketplace.acme-cleaning")
    name: str = Field(..., min_length=2, max_length=80)
    version: str = Field(..., min_length=1, max_length=24)
    publisher: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field("", max_length=2000)
    # Iframe mode only in this PR — see file docstring.
    iframe_url: str
    # Origin used to validate postMessage events from the iframe; if
    # absent, derived from iframe_url (scheme + host + port).
    origin: Optional[str] = None
    permissions: List[str] = []
    ui: Optional[ModuleUI] = None
    # Source — internal modules don't go through this registry; this
    # is here so the response shape unifies with the internal listing.
    source: Literal["third-party"] = "third-party"


# ─── helpers ──────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_prod() -> bool:
    return (os.environ.get("LUCCCA_ENV") or "").lower() == "production"


def _validate_url(u: str, *, label: str) -> str:
    """Return the parsed URL string after validating scheme + host.
    Raises HTTPException on failure."""
    try:
        parsed = urlparse(u)
    except Exception:
        raise HTTPException(400, f"{label}: malformed URL")
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(400, f"{label}: needs scheme + host")
    if _is_prod() and parsed.scheme != "https":
        raise HTTPException(400, f"{label}: must be HTTPS in production "
                                 f"(got {parsed.scheme})")
    if parsed.scheme not in ("https", "http"):
        raise HTTPException(400, f"{label}: only http/https supported "
                                 f"(got {parsed.scheme})")
    if not _is_prod():
        # Dev: allow localhost; in production we already require https
        ok_dev_hosts = {"localhost", "127.0.0.1", "::1"}
        if parsed.hostname in ok_dev_hosts and parsed.scheme == "http":
            return u
    return u


def _origin_from(iframe_url: str) -> str:
    """Derive the postMessage origin (scheme://host[:port]) from the
    iframe URL. Used to validate inbound postMessage events on the
    host side."""
    p = urlparse(iframe_url)
    port = f":{p.port}" if p.port else ""
    return f"{p.scheme}://{p.hostname}{port}"


def _resolve_tenant(x_tenant_id: Optional[str], x_admin_token: Optional[str]) -> str:
    """Resolve the calling tenant. The admin token gates the entire
    surface; tenant_id picks which tenant we're operating on (an MSP
    can manage multiple). If no header is present, fall back to the
    "default" tenant for single-tenant deployments."""
    expected = os.environ.get("ADMIN_API_TOKEN")
    if expected and x_admin_token != expected:
        raise HTTPException(401, "admin token required")
    return (x_tenant_id or "default").strip().lower()


def _validate_permissions(perms: List[str]) -> None:
    bad = [p for p in perms if p not in ALLOWED_PERMISSIONS]
    if bad:
        raise HTTPException(400, f"unknown permissions: {bad}. "
                                 f"allowed: {sorted(ALLOWED_PERMISSIONS)}")


def _validate_manifest(m: ThirdPartyManifest) -> Dict[str, Any]:
    """Run cross-field validation that pydantic can't express, then
    return the canonical doc to persist."""
    iframe = _validate_url(m.iframe_url, label="iframe_url")
    origin = m.origin or _origin_from(iframe)
    _validate_url(origin, label="origin")
    _validate_permissions(m.permissions or [])
    if m.ui and m.ui.default_tier and m.ui.default_tier not in ALLOWED_TIERS:
        raise HTTPException(400, f"ui.default_tier must be one of "
                                 f"{sorted(ALLOWED_TIERS)}")
    return {
        "id": m.id,
        "name": m.name,
        "version": m.version,
        "publisher": m.publisher,
        "description": m.description or "",
        "iframe_url": iframe,
        "origin": origin,
        "permissions": list(m.permissions or []),
        "ui": (m.ui.model_dump() if m.ui else None),
        "source": "third-party",
    }


# ─── install / uninstall ──────────────────────────────────────────────────

class InstallBody(BaseModel):
    manifest: ThirdPartyManifest
    accepted_permissions: List[str] = []  # admin's explicit grant


@router.post("/install")
def install_module(
    body: InstallBody,
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """Install a third-party module from a manifest the admin pastes.
    The admin must echo back the permissions they're granting; if the
    manifest declares more permissions than were accepted, install
    fails so a partner can't sneak a wider scope through a bundled
    manifest."""
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    canon = _validate_manifest(body.manifest)
    declared = set(canon["permissions"])
    accepted = set(body.accepted_permissions or [])
    missing = declared - accepted
    if missing:
        raise HTTPException(400, f"permissions declared but not accepted: "
                                 f"{sorted(missing)}")
    extra = accepted - declared
    if extra:
        # Accepting a permission the manifest didn't declare is harmless
        # but suspicious — surface it rather than silently ignore.
        raise HTTPException(400, f"accepted_permissions includes scopes "
                                 f"the manifest did not declare: "
                                 f"{sorted(extra)}")

    doc = {
        **canon,
        "tenant_id": tenant,
        "registration_id": uuid.uuid4().hex[:12],
        "enabled": True,
        "installed_at": _now_iso(),
        "installed_by_admin_token": "***",  # don't echo the token
    }
    # Upsert by (tenant_id, id) so re-installing a newer manifest
    # version overwrites the row instead of duplicating.
    db["module_registrations"].update_one(
        {"tenant_id": tenant, "id": doc["id"]},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "module": doc}


class InstallFromUrlBody(BaseModel):
    manifest_url: str
    accepted_permissions: List[str] = []


@router.post("/install-from-url")
def install_from_url(
    body: InstallFromUrlBody,
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """Fetch a manifest from a URL, validate, install. Useful for the
    marketplace flow where the partner publishes a manifest at a stable
    URL. In production HTTPS is required; in dev we allow localhost.

    Note: this endpoint performs a network fetch. In environments
    without outbound network access, use /install with the manifest
    pasted into the request body."""
    _resolve_tenant(x_tenant_id, x_admin_token)  # auth gate
    _validate_url(body.manifest_url, label="manifest_url")
    try:
        import urllib.request, json as _json
        with urllib.request.urlopen(body.manifest_url, timeout=10) as resp:
            raw = _json.loads(resp.read())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"manifest fetch failed: {e}")
    try:
        manifest = ThirdPartyManifest(**raw)
    except Exception as e:
        raise HTTPException(400, f"manifest schema invalid: {e}")
    return install_module(
        InstallBody(manifest=manifest,
                    accepted_permissions=body.accepted_permissions),
        x_tenant_id=x_tenant_id,
        x_admin_token=x_admin_token,
    )


@router.delete("/{module_id}")
def uninstall_module(
    module_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    r = db["module_registrations"].delete_one({"tenant_id": tenant, "id": module_id})
    if getattr(r, "deleted_count", 0) == 0:
        raise HTTPException(404, "not installed for this tenant")
    return {"ok": True, "uninstalled": module_id}


class ToggleBody(BaseModel):
    enabled: bool


@router.post("/{module_id}/toggle")
def toggle_module(
    module_id: str,
    body: ToggleBody,
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    existing = db["module_registrations"].find_one(
        {"tenant_id": tenant, "id": module_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "not installed for this tenant")
    db["module_registrations"].update_one(
        {"tenant_id": tenant, "id": module_id},
        {"$set": {"enabled": bool(body.enabled), "updated_at": _now_iso()}},
    )
    return {"ok": True, "id": module_id, "enabled": bool(body.enabled)}


@router.get("/registry")
def list_registry(
    x_tenant_id: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
):
    """List all modules visible to this tenant — internal + third-party.
    Internal modules come from the static feature_flags / D8 registry;
    third-party from `module_registrations`. Returned shape unifies
    them so the marketplace UI can render one list."""
    tenant = _resolve_tenant(x_tenant_id, x_admin_token)
    third_party = list(db["module_registrations"].find(
        {"tenant_id": tenant}, {"_id": 0}))

    # Pull internal modules from feature_flags (D8 framework). If the
    # collection is empty (fresh deployment), return an empty internal
    # list — the client can fall back to a hardcoded internal manifest.
    internals = []
    try:
        for ff in db["feature_flags"].find({"tenant_id": tenant}, {"_id": 0}):
            key = ff.get("key") or ""
            if not key.startswith("module:"):
                continue
            internals.append({
                "id": key.split(":", 1)[1],
                "source": "internal",
                "enabled": bool(ff.get("enabled")),
            })
    except Exception:
        pass

    return {
        "ok": True,
        "tenant_id": tenant,
        "internal": internals,
        "third_party": third_party,
        "total": len(internals) + len(third_party),
    }
