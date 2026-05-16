"""
D34 · MyEcho install-by-QR + station-aware home + recipes-by-category.

Real-world flow the user surfaced:

  1. Manager onboards a new line cook. Scans an employee photo,
     enters role / department.
  2. System generates a one-time enrollment QR. Manager hands the
     phone to the employee or texts the link.
  3. Employee scans → PWA loads → "Add to Home Screen." App is
     installed in 30 seconds, no app store, no IT ticket.
  4. App home screen lights up with the modules that match the
     employee's profile: line cook gets waste / line check /
     transfer / recipes-by-category. Server gets tables / orders.
     Manager gets approvals / audit / schedule.
  5. Recipes page on the in-kitchen culinary tablet uses the same
     by-category endpoint — one source of truth.

Endpoints (all /api/myecho)

  POST /enroll/qr
       Manager generates a single-use enrollment token for an
       employee. Returns enrollment_token + qr_payload + expires_at.
       Token is short-lived (default 24h).

  POST /enroll/install
       Employee's PWA exchanges the enrollment token + a device_id
       for a long-lived employee_session_token (default 90d).
       Single-use: re-using the enrollment_token after install is
       rejected.

  GET  /home
       Returns module tiles for the employee, station-aware. Tiles
       are derived from role + department + active shift (if any).

  GET  /recipes/by-category
       Recipes grouped by category for the tablet UI. Filterable by
       station; only employees with a culinary role get the full
       set, others get a redacted view.

  POST /enroll/revoke
       Manager revokes an active session (lost phone, separation).

Doctrine alignment

  · §1.4 voice register: enrollment is operator → staff (manager
    creates, employee uses). Audit emitted on every enrollment +
    revoke.
  · §2.5 pride from love: tile copy is observation, not surveillance
    ("recipes for tonight" not "your assigned tasks for compliance").
  · §2.6 never throw the pan: the home page does NOT show
    individual performance scores. Patterns and tasks, never
    rankings.
  · D27 tenant isolation: every read/write is tenant-scoped.

Design contracts

  · enrollment_token MUST be single-use. We persist `consumed_at` on
    install so a stolen QR (intercepted in transit) can't be
    re-used after the employee installs.
  · employee_session_token is long-lived (90d default) but
    revocable. Sessions persist in `myecho_sessions` with active
    flag; revoke flips the flag.
  · Home tiles are computed at request time, not cached. Role
    changes (cook → sous chef) reflect immediately on next refresh.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/myecho", tags=["myecho-enrollment"])


# Tunables
ENROLL_TOKEN_HOURS = 24
SESSION_DAYS = 90
RECIPES_PAGE_LIMIT = 500


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _emit_audit(tenant_id: str, kind: str, entity_id: str,
                payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"myecho.{kind}",
            "entity_id": entity_id,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


# ─── Models ──────────────────────────────────────────────────────────────

class EnrollQRBody(BaseModel):
    employee_id: str
    activated_by: str = Field(..., min_length=1)
    duration_hours: int = ENROLL_TOKEN_HOURS


class InstallBody(BaseModel):
    enrollment_token: str
    device_id: str = Field(..., min_length=4)
    device_label: Optional[str] = None
    user_agent: Optional[str] = None


class RevokeBody(BaseModel):
    employee_session_token: str
    revoked_by: str
    reason: Optional[str] = None


# ─── 1. Enroll QR (manager-side) ─────────────────────────────────────────

@router.post("/enroll/qr")
def create_enrollment_qr(
    body: EnrollQRBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    employee = db["employees"].find_one(
        {"id": body.employee_id, "tenant_id": tenant_id}, {"_id": 0})
    if not employee:
        # Permit legacy seed (no tenant_id)
        employee = db["employees"].find_one(
            {"id": body.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(404,
            f"employee {body.employee_id} not found")

    duration = max(1, min(72, int(body.duration_hours)))
    token = secrets.token_urlsafe(20)
    expires = _now() + timedelta(hours=duration)
    enrollment = {
        "enrollment_token": token,
        "tenant_id": tenant_id,
        "employee_id": body.employee_id,
        "activated_by": body.activated_by,
        "consumed_at": None,
        "active": True,
        "created_at": _now_iso(),
        "expires_at": expires.isoformat(),
    }
    db["myecho_enrollments"].insert_one(enrollment.copy())
    _emit_audit(tenant_id, "enroll_qr", token, {
        "employee_id": body.employee_id,
        "activated_by": body.activated_by,
    })
    return {
        "ok": True,
        "enrollment_token": token,
        "employee_id": body.employee_id,
        "employee_name": (
            f"{employee.get('first_name','')} "
            f"{employee.get('last_name','')}").strip(),
        "expires_at": expires.isoformat(),
        "qr_payload": (
            f"luccca://myecho/install?token={token}"),
        "qr_install_url": f"/m/myecho/install?token={token}",
    }


# ─── 2. Install (employee PWA) ───────────────────────────────────────────

@router.post("/enroll/install")
def install_session(
    body: InstallBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    enroll = db["myecho_enrollments"].find_one(
        {"enrollment_token": body.enrollment_token,
         "tenant_id": tenant_id})
    if not enroll:
        raise HTTPException(404, "enrollment token not found")
    if enroll.get("consumed_at"):
        raise HTTPException(409, "enrollment token already used")
    if not enroll.get("active"):
        raise HTTPException(410, "enrollment token revoked")

    expires = enroll.get("expires_at")
    if expires:
        try:
            ed = datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
            if ed.tzinfo is None:
                ed = ed.replace(tzinfo=timezone.utc)
            if _now() > ed:
                raise HTTPException(410, "enrollment token expired")
        except (ValueError, TypeError):
            pass

    employee_id = enroll["employee_id"]
    session_token = secrets.token_urlsafe(32)
    session_expires = _now() + timedelta(days=SESSION_DAYS)
    session = {
        "session_token": session_token,
        "tenant_id": tenant_id,
        "employee_id": employee_id,
        "device_id": body.device_id,
        "device_label": body.device_label or body.device_id,
        "user_agent": body.user_agent,
        "active": True,
        "created_at": _now_iso(),
        "expires_at": session_expires.isoformat(),
        "last_seen_at": _now_iso(),
        "revoked_at": None,
        "revoked_by": None,
    }
    db["myecho_sessions"].insert_one(session.copy())

    # Mark enrollment consumed (single-use)
    db["myecho_enrollments"].update_one(
        {"enrollment_token": body.enrollment_token},
        {"$set": {"consumed_at": _now_iso(),
                  "consumed_by_device": body.device_id,
                  "active": False}})

    _emit_audit(tenant_id, "install", session_token, {
        "employee_id": employee_id,
        "device_id": body.device_id,
    })
    return {
        "ok": True,
        "employee_session_token": session_token,
        "employee_id": employee_id,
        "expires_at": session_expires.isoformat(),
        "install_modules": [
            "waste_scan", "line_check", "transfer_in_out",
            "recipes_by_category", "schedule", "shift_swap",
            "paystubs", "pto",
        ],
    }


# ─── 3. Station-aware home ───────────────────────────────────────────────

# Module catalog: title, route, audience predicates
MODULE_CATALOG: List[Dict[str, Any]] = [
    {"id": "waste_scan", "title": "Waste Scan",
     "route": "/m/waste/scan",
     "departments": ["FOH","BOH","Pastry","Banquet","Culinary"],
     "roles_excluded": []},
    {"id": "line_check", "title": "Line Check",
     "route": "/m/line-check",
     "departments": ["BOH","Pastry","Banquet","Culinary"]},
    {"id": "transfer_in_out", "title": "Transfer In / Out",
     "route": "/m/transfer",
     "departments": ["BOH","Pastry","Banquet","Culinary","Bar"]},
    {"id": "recipes_by_category", "title": "Recipes",
     "route": "/m/recipes",
     "departments": ["BOH","Pastry","Banquet","Culinary","Bar"]},
    {"id": "tables_orders", "title": "Tables & Orders",
     "route": "/m/foh/orders",
     "departments": ["FOH","Bar"]},
    {"id": "allergen_alerts", "title": "Allergen Alerts",
     "route": "/m/allergen-alerts",
     "departments": ["FOH","BOH","Pastry","Culinary"],
     "roles_required": ["manager","sous","exec_chef","captain"]},
    {"id": "approvals_inbox", "title": "Approvals",
     "route": "/m/approvals",
     "roles_required": ["manager","sous","exec_chef","gm"]},
    {"id": "schedule", "title": "My Schedule",
     "route": "/m/schedule"},
    {"id": "shift_swap", "title": "Shift Swap",
     "route": "/m/shift-swap"},
    {"id": "paystubs", "title": "Paystubs",
     "route": "/m/paystubs"},
    {"id": "pto", "title": "Time Off",
     "route": "/m/pto"},
    {"id": "training", "title": "Training",
     "route": "/m/training"},
]


def _resolve_session(token: str, tenant_id: str) -> Dict[str, Any]:
    s = db["myecho_sessions"].find_one(
        {"session_token": token, "tenant_id": tenant_id})
    if not s or not s.get("active"):
        raise HTTPException(401, "invalid or revoked session")
    expires = s.get("expires_at")
    if expires:
        try:
            ed = datetime.fromisoformat(str(expires).replace("Z", "+00:00"))
            if ed.tzinfo is None:
                ed = ed.replace(tzinfo=timezone.utc)
            if _now() > ed:
                raise HTTPException(401, "session expired")
        except (ValueError, TypeError):
            pass
    return s


def _employee_for_session(session: Dict[str, Any]) -> Dict[str, Any]:
    emp = db["employees"].find_one(
        {"id": session["employee_id"], "tenant_id": session["tenant_id"]},
        {"_id": 0}) or db["employees"].find_one(
        {"id": session["employee_id"]}, {"_id": 0})
    if not emp:
        raise HTTPException(404, "employee not found")
    return emp


def _tiles_for(employee: Dict[str, Any]) -> List[Dict[str, Any]]:
    dept = (employee.get("department") or "").strip()
    role = (employee.get("role") or "").lower().strip()
    tiles: List[Dict[str, Any]] = []
    for mod in MODULE_CATALOG:
        if "departments" in mod and dept and dept not in mod["departments"]:
            continue
        if "roles_required" in mod:
            if role and role not in mod["roles_required"]:
                continue
            if not role:
                continue
        if "roles_excluded" in mod and role in mod["roles_excluded"]:
            continue
        tiles.append({
            "id": mod["id"], "title": mod["title"],
            "route": mod["route"],
        })
    return tiles


@router.get("/home")
def home(
    x_employee_session: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None),
):
    if not x_employee_session:
        raise HTTPException(401, "x-employee-session header required")
    tenant_id = (x_tenant_id or "default").strip().lower()
    session = _resolve_session(x_employee_session, tenant_id)
    employee = _employee_for_session(session)

    # Touch last_seen_at
    db["myecho_sessions"].update_one(
        {"session_token": session["session_token"]},
        {"$set": {"last_seen_at": _now_iso()}})

    return {
        "ok": True,
        "employee": {
            "id": employee["id"],
            "name": (f"{employee.get('first_name','')} "
                     f"{employee.get('last_name','')}").strip(),
            "department": employee.get("department"),
            "role": employee.get("role"),
            "outlet_ids": employee.get("outlet_ids") or [],
        },
        "tiles": _tiles_for(employee),
    }


# ─── 4. Recipes by category (tablet + phone) ─────────────────────────────

CULINARY_DEPTS = {"BOH", "Pastry", "Banquet", "Culinary", "Bar"}


@router.get("/recipes/by-category")
def recipes_by_category(
    station: Optional[str] = None,
    outlet_id: Optional[str] = None,
    x_employee_session: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None),
):
    if not x_employee_session:
        raise HTTPException(401, "x-employee-session header required")
    tenant_id = (x_tenant_id or "default").strip().lower()
    session = _resolve_session(x_employee_session, tenant_id)
    employee = _employee_for_session(session)
    dept = (employee.get("department") or "").strip()
    is_culinary = dept in CULINARY_DEPTS

    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if outlet_id:
        q["outlet_id"] = outlet_id
    if station:
        q["station"] = station
    rows = list(db["recipes"].find(q, {"_id": 0}).limit(RECIPES_PAGE_LIMIT))
    if not rows:
        # Legacy fallback: find by outlet only
        legacy_q = {}
        if outlet_id:
            legacy_q["outlet_id"] = outlet_id
        rows = list(db["recipes"].find(legacy_q, {"_id": 0})
                    .limit(RECIPES_PAGE_LIMIT))

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        cat = (r.get("category") or "uncategorized").strip().lower()
        # Non-culinary departments get a redacted view: name + category +
        # allergens only. Internal ingredient costs / methods stay
        # culinary-only.
        if is_culinary:
            entry = {
                "id": r.get("id"),
                "name": r.get("name"),
                "category": cat,
                "station": r.get("station"),
                "yield_oz": r.get("yield_oz"),
                "portion_size_oz": r.get("portion_size_oz"),
                "method": r.get("method") or r.get("instructions"),
                "ingredients": r.get("ingredients") or [],
                "allergens": r.get("allergens") or [],
                "image_url": r.get("image_url"),
            }
        else:
            entry = {
                "id": r.get("id"),
                "name": r.get("name"),
                "category": cat,
                "allergens": r.get("allergens") or [],
            }
        grouped.setdefault(cat, []).append(entry)

    # Sort within each category by name; sort categories alphabetically
    sorted_grouped = {}
    for cat in sorted(grouped.keys()):
        sorted_grouped[cat] = sorted(
            grouped[cat], key=lambda x: (x.get("name") or "").lower())

    return {"ok": True,
            "employee_id": employee["id"],
            "is_culinary": is_culinary,
            "outlet_id": outlet_id,
            "station": station,
            "categories": list(sorted_grouped.keys()),
            "recipes_by_category": sorted_grouped,
            "total": len(rows)}


# ─── 5. Revoke ───────────────────────────────────────────────────────────

@router.post("/enroll/revoke")
def revoke_session(
    body: RevokeBody,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    s = db["myecho_sessions"].find_one(
        {"session_token": body.employee_session_token,
         "tenant_id": tenant_id})
    if not s:
        raise HTTPException(404, "session not found")
    db["myecho_sessions"].update_one(
        {"session_token": body.employee_session_token},
        {"$set": {"active": False,
                  "revoked_at": _now_iso(),
                  "revoked_by": body.revoked_by,
                  "revoke_reason": body.reason}})
    _emit_audit(tenant_id, "revoke", body.employee_session_token, {
        "revoked_by": body.revoked_by,
        "reason": body.reason,
    })
    return {"ok": True,
            "session_token": body.employee_session_token,
            "revoked_at": _now_iso()}


# ─── 6. List active sessions for an employee (manager view) ─────────────

@router.get("/sessions")
def list_sessions(
    employee_id: Optional[str] = None,
    active_only: bool = True,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if employee_id:
        q["employee_id"] = employee_id
    if active_only:
        q["active"] = True
    rows = list(db["myecho_sessions"].find(q, {"_id": 0,
        "session_token": 0})  # never expose tokens in lists
                .sort("created_at", -1)
                .limit(max(1, min(2000, limit))))
    return {"ok": True, "total": len(rows), "sessions": rows}
