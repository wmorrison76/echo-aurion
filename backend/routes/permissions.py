"""
Echo AURION · Role Permissions Matrix (iter264.1)

Single source of truth for what each role can do across the menu builders,
inventory audits, and approval workflows. Used by:
  - Frontend onboarding "Permissions" tab to view/edit per-role grants
  - PanelHost / route guards to gate access (No Access hides the panel entirely)
  - Approval queue endpoints to determine who can publish vs only submit

Permission keys (machine names):
  ird.view              — read IRD menu & orders
  ird.edit              — modify IRD menu items / sections (saves as draft)
  ird.publish           — push IRD menu changes live (final approver)
  ird.approve           — approve a submitted draft from CDC/Chef
  spa.view              — read Spa catalog & bookings
  spa.edit              — modify Spa catalog (saves as draft)
  spa.publish           — push Spa changes live
  spa.approve           — approve a submitted Spa draft
  inventory_audits.start_stop — start/stop physical inventory audits
  recipes.link          — open the Recipe-Link panel and link components

Endpoints:
  GET  /api/permissions/matrix          — full role→permission matrix
  GET  /api/permissions/me              — current user's resolved permissions
  PUT  /api/permissions/role/{role}     — admin overrides for a role
"""
from __future__ import annotations
import os
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/permissions", tags=["permissions"])

# ── Permission catalog ─────────────────────────────────────────────────
PERMISSIONS = [
    {"key": "ird.view",      "label": "IRD · View",      "group": "IRD"},
    {"key": "ird.edit",      "label": "IRD · Edit Draft", "group": "IRD"},
    {"key": "ird.publish",   "label": "IRD · Publish Live", "group": "IRD"},
    {"key": "ird.approve",   "label": "IRD · Approve Submitted", "group": "IRD"},
    {"key": "spa.view",      "label": "Spa · View",      "group": "Spa"},
    {"key": "spa.edit",      "label": "Spa · Edit Draft", "group": "Spa"},
    {"key": "spa.publish",   "label": "Spa · Publish Live", "group": "Spa"},
    {"key": "spa.approve",   "label": "Spa · Approve Submitted", "group": "Spa"},
    {"key": "inventory_audits.start_stop", "label": "Inventory Audits · Start/Stop", "group": "Inventory"},
    {"key": "recipes.link",  "label": "Recipes · Link Components", "group": "Culinary"},
]

# ── Default matrix per role ────────────────────────────────────────────
# True = granted, False = denied, missing = inherit from None (denied)
_DEFAULTS: Dict[str, Dict[str, bool]] = {
    # Admins / executives — everything
    "admin":              {p["key"]: True for p in PERMISSIONS},
    "owner":              {p["key"]: True for p in PERMISSIONS},
    "regional-director":  {p["key"]: True for p in PERMISSIONS},
    "director":           {p["key"]: True for p in PERMISSIONS},
    "general-manager":    {p["key"]: True for p in PERMISSIONS},

    # IRD Manager — full IRD authority + recipes
    "ird-manager": {
        "ird.view": True, "ird.edit": True, "ird.publish": True, "ird.approve": True,
        "recipes.link": True,
    },
    # Spa Director / Manager — full Spa authority + recipes (for spa F&B if any)
    "spa-director": {
        "spa.view": True, "spa.edit": True, "spa.publish": True, "spa.approve": True,
    },
    "spa-manager": {
        "spa.view": True, "spa.edit": True, "spa.publish": False, "spa.approve": False,
    },
    # F&B Director / Culinary Director — approve & publish on both menus
    "fb-director": {
        "ird.view": True, "ird.edit": True, "ird.publish": True, "ird.approve": True,
        "spa.view": True, "spa.edit": False, "spa.publish": True, "spa.approve": True,
        "recipes.link": True,
    },
    "executive-chef": {
        "ird.view": True, "ird.edit": True, "ird.publish": True, "ird.approve": True,
        "recipes.link": True,
    },
    "exec-chef-banquets": {
        "ird.view": True, "ird.edit": True, "ird.publish": False, "ird.approve": False,
        "recipes.link": True,
    },
    # CDC — view + edit but cannot push live; must submit for approval
    "chef-de-cuisine": {
        "ird.view": True, "ird.edit": True, "ird.publish": False, "ird.approve": False,
        "recipes.link": True,
    },
    "sous-chef": {
        "ird.view": True, "ird.edit": True, "ird.publish": False, "ird.approve": False,
        "recipes.link": True,
    },
    "pastry-chef": {
        "ird.view": True, "ird.edit": False, "recipes.link": True,
    },
    # Accounting — Inventory audit ONLY
    "accounting": {
        "inventory_audits.start_stop": True,
    },
    "controller": {
        "inventory_audits.start_stop": True,
    },
    "exec-dir-finance": {
        "inventory_audits.start_stop": True,
    },
    # Operation Controller — read-only on menus, can start audits
    "operation-controller": {
        "ird.view": True, "spa.view": True,
        "inventory_audits.start_stop": True,
    },
    # Sales / Marketing / Creative — no menu access by default
    "bqt-sales-marketing": {},
    "sales": {},
    "senior-art-media-director": {},
    "dir-banquets": {"ird.view": True, "spa.view": True},
    "events-manager": {},
    "dining-room-manager": {"ird.view": True},
    "purchasing-manager": {"recipes.link": True},
    "dir-engineering": {},
    "staff": {},
}


class RolePerms(BaseModel):
    role: str
    perms: Dict[str, bool] = {}


def _override_doc(role: str) -> Dict[str, bool]:
    doc = db["permission_overrides"].find_one({"role": role}, {"_id": 0}) or {}
    return doc.get("perms", {}) or {}


def resolve_permissions(role: Optional[str]) -> Dict[str, bool]:
    """Combine defaults + admin overrides → final permission set for role."""
    if not role:
        return {p["key"]: False for p in PERMISSIONS}
    base = dict(_DEFAULTS.get(role, {}))
    for k, v in _override_doc(role).items():
        base[k] = bool(v)
    # Fill missing with False so frontend gets a complete map
    out = {p["key"]: bool(base.get(p["key"], False)) for p in PERMISSIONS}
    return out


@router.get("/matrix")
def matrix() -> dict:
    """Full role → permission matrix (defaults merged with overrides)."""
    roles = sorted(set(_DEFAULTS.keys()) | {d["role"] for d in db["permission_overrides"].find({}, {"role": 1, "_id": 0})})
    return {
        "permissions": PERMISSIONS,
        "roles": [{"role": r, "perms": resolve_permissions(r)} for r in roles],
    }


@router.get("/me")
def my_perms(authorization: Optional[str] = Header(None)) -> dict:
    """Resolve current user's permissions from JWT (best-effort decode)."""
    role = None
    if authorization and authorization.lower().startswith("bearer "):
        try:
            import jwt as _jwt
            from config import get_settings
            token = authorization.split(" ", 1)[1]
            # D17e · read from the fuse box (Settings._validate rejects
            # the dev default in production, so this won't fall through
            # to a weak key on a live box).
            secret = get_settings().JWT_SECRET
            payload = _jwt.decode(token, secret, algorithms=["HS256"])
            role = payload.get("role")
        except Exception:
            pass
    return {"role": role, "perms": resolve_permissions(role)}


@router.put("/role/{role}")
def set_role_perms(role: str, body: RolePerms):
    """Admin-only endpoint to override a role's permission map."""
    if role != body.role:
        raise HTTPException(400, "role mismatch")
    db["permission_overrides"].update_one(
        {"role": role},
        {"$set": {"role": role, "perms": body.perms}},
        upsert=True,
    )
    return {"ok": True, "role": role, "perms": resolve_permissions(role)}
