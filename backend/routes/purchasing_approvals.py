"""
iter252 · Purchasing Approval Hierarchy
======================================
Role-based purchasing-limit + approval-chain framework. Every purchase request
above the requester's role limit auto-routes to the next approver in the
hierarchy. William (Director) sets per-role limits via Onboarding Controls;
salaried managers see a banner when they have a pending approval awaiting
their sign-off.

Endpoints
---------
GET  /api/approvals/limits                  → per-role purchasing limits
PUT  /api/approvals/limits/{role}           → admin/director override
GET  /api/approvals/hierarchy               → role → approver-role chain
PUT  /api/approvals/hierarchy/{role}        → admin/director override
POST /api/approvals/requests                → create purchase request (auto-routes)
GET  /api/approvals/requests                → list (filterable by status, requester)
GET  /api/approvals/requests/pending        → pending for current approver (?for_user=)
POST /api/approvals/requests/{id}/approve   → approve (advances chain or finalises)
POST /api/approvals/requests/{id}/reject    → reject with reason
GET  /api/approvals/banner                  → top-banner payload for current user
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Body, Request
from pydantic import BaseModel, Field
from database import db

router = APIRouter(prefix="/api/approvals", tags=["purchasing-approvals"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: f"pa-{uuid4().hex[:10]}"

# ─────────────────────────────────────────────────────────────
# DEFAULT CONFIG  (William's spec — Sous Chef $2k, CDC $5k,
# Executive $10k, Director $25k. Admin = unlimited)
# ─────────────────────────────────────────────────────────────
DEFAULT_LIMITS = {
    # role:                limit ($)        approver_role
    "staff":               (0,              "sous-chef"),
    "sous-chef":           (2000,           "executive-chef"),
    "dining-room-manager": (2000,           "fb-director"),
    "pastry-chef":         (5000,           "executive-chef"),
    "events-manager":      (5000,           "fb-director"),
    "spa-manager":         (5000,           "general-manager"),
    "dir-engineering":     (5000,           "general-manager"),
    "purchasing-manager":  (5000,           "controller"),
    "controller":          (10000,          "fb-director"),
    "executive-chef":      (10000,          "fb-director"),
    "fb-director":         (15000,          "general-manager"),
    "general-manager":     (20000,          "director"),
    "director":            (25000,          "admin"),
    "admin":               (10_000_000,     None),     # final
}

ROLE_LABELS = {
    "staff": "Hourly Staff",
    "sous-chef": "Sous Chef",
    "dining-room-manager": "Dining Room Manager",
    "pastry-chef": "Pastry Chef",
    "events-manager": "Events Manager",
    "spa-manager": "Spa Manager",
    "dir-engineering": "Director of Engineering",
    "purchasing-manager": "Purchasing Manager",
    "controller": "Controller",
    "executive-chef": "Executive Chef · CDC",
    "fb-director": "F&B Director",
    "general-manager": "General Manager",
    "director": "Director (Multi-Property)",
    "admin": "Administrator",
}


def seed_approval_config():
    """Idempotent — seeds default per-role limits + hierarchy."""
    for role, (lim, approver) in DEFAULT_LIMITS.items():
        existing = db["approval_limits"].find_one({"role": role}, {"_id": 0})
        if existing:
            continue
        db["approval_limits"].insert_one({
            "role": role,
            "label": ROLE_LABELS.get(role, role),
            "limit": lim,
            "approver_role": approver,
            "updated_at": _now(),
            "updated_by": "system-seed",
        })
    try:
        db["approval_limits"].create_index("role", unique=True)
        db["purchase_approval_requests"].create_index("status")
        db["purchase_approval_requests"].create_index("current_approver_role")
        db["purchase_approval_requests"].create_index("requested_by_id")
    except Exception:
        pass


def _get_role_config(role: str) -> dict:
    row = db["approval_limits"].find_one({"role": role}, {"_id": 0})
    if row:
        return row
    # fallback to defaults if user role not yet in table
    if role in DEFAULT_LIMITS:
        lim, approver = DEFAULT_LIMITS[role]
        return {"role": role, "limit": lim, "approver_role": approver,
                "label": ROLE_LABELS.get(role, role)}
    return {"role": role, "limit": 0, "approver_role": "admin",
            "label": role}


def _resolve_user(uid: str) -> Optional[dict]:
    if not uid:
        return None
    return db["auth_users"].find_one({"id": uid}, {"_id": 0, "password_hash": 0})


def _user_for_role(role: str) -> Optional[dict]:
    """Pick first salaried user of a given role (for routing notifications)."""
    return db["auth_users"].find_one(
        {"role": role}, {"_id": 0, "password_hash": 0})


# ─────────────────────────────────────────────────────────────
# Request models
# ─────────────────────────────────────────────────────────────
class LimitUpdate(BaseModel):
    limit: float
    approver_role: Optional[str] = None


class CreateRequest(BaseModel):
    requested_by_id: str
    requested_by_name: Optional[str] = None
    requested_by_role: Optional[str] = None
    outlet: str
    company: Optional[str] = None
    vendor: Optional[str] = None
    item_description: str
    amount: float
    notes: Optional[str] = ""
    link_to: Optional[str] = None    # deep link (panel id, request id, etc.)
    category: Optional[str] = "purchase"


class ApproveBody(BaseModel):
    approver_id: str
    approver_name: Optional[str] = None
    note: Optional[str] = ""


class RejectBody(BaseModel):
    approver_id: str
    approver_name: Optional[str] = None
    reason: str = ""


# ─────────────────────────────────────────────────────────────
# Limits + hierarchy
# ─────────────────────────────────────────────────────────────
@router.get("/limits")
def list_limits():
    seed_approval_config()
    rows = list(db["approval_limits"].find({}, {"_id": 0}).sort("limit", 1))
    return {"rows": rows, "count": len(rows)}


@router.put("/limits/{role}")
def update_limit(role: str, body: LimitUpdate, request: Request):
    """Admin/Director-gated in production. (UI surfaces only to those roles.)"""
    seed_approval_config()
    update = {"limit": float(body.limit), "updated_at": _now()}
    if body.approver_role is not None:
        update["approver_role"] = body.approver_role or None
    res = db["approval_limits"].find_one_and_update(
        {"role": role}, {"$set": update}, return_document=True)
    if not res:
        # create row if it didn't exist
        db["approval_limits"].insert_one({
            "role": role, "label": ROLE_LABELS.get(role, role),
            "limit": float(body.limit),
            "approver_role": body.approver_role,
            "updated_at": _now(),
        })
    return {"ok": True, "role": role, **update}


@router.get("/hierarchy")
def hierarchy():
    seed_approval_config()
    rows = list(db["approval_limits"].find(
        {}, {"_id": 0, "role": 1, "approver_role": 1, "limit": 1, "label": 1}
    ).sort("limit", 1))
    return {"rows": rows}


# ─────────────────────────────────────────────────────────────
# Purchase request lifecycle
# ─────────────────────────────────────────────────────────────
def _required_approver(amount: float, requester_role: str) -> Optional[str]:
    """Walk the chain until an approver-role's limit covers `amount`."""
    seen = set()
    role = requester_role
    cfg = _get_role_config(role)
    if amount <= (cfg.get("limit") or 0):
        return None    # within own authority
    next_role = cfg.get("approver_role")
    while next_role and next_role not in seen:
        seen.add(next_role)
        cfg2 = _get_role_config(next_role)
        if amount <= (cfg2.get("limit") or 0):
            return next_role
        next_role = cfg2.get("approver_role")
    return next_role or "admin"


@router.post("/requests")
def create_request(body: CreateRequest):
    seed_approval_config()
    requester = _resolve_user(body.requested_by_id) or {}
    role = body.requested_by_role or requester.get("role", "staff")
    name = body.requested_by_name or requester.get("name", "Unknown")
    cfg = _get_role_config(role)
    needs = _required_approver(body.amount, role)
    auto = needs is None

    doc = {
        "id": _uid(),
        "requested_by_id": body.requested_by_id,
        "requested_by_name": name,
        "requested_by_role": role,
        "requested_by_role_label": ROLE_LABELS.get(role, role),
        "outlet": body.outlet,
        "company": body.company or "",
        "vendor": body.vendor or "",
        "item_description": body.item_description,
        "amount": float(body.amount),
        "notes": body.notes or "",
        "link_to": body.link_to,
        "category": body.category or "purchase",
        "status": "auto-approved" if auto else "pending",
        "current_approver_role": needs,
        "approval_chain": [],
        "created_at": _now(),
        "updated_at": _now(),
        "limit_at_creation": cfg.get("limit"),
    }
    db["purchase_approval_requests"].insert_one({**doc, "_id": doc["id"]})
    if auto:
        # log self-approval
        db["purchase_approval_requests"].update_one(
            {"id": doc["id"]},
            {"$push": {"approval_chain": {
                "role": role, "actor_id": body.requested_by_id,
                "actor_name": name, "action": "auto-approved",
                "at": _now(), "note": "within own purchasing authority",
            }}})
    return doc


@router.get("/requests")
def list_requests(status: Optional[str] = None,
                  requested_by_id: Optional[str] = None,
                  limit: int = 100):
    q: dict = {}
    if status:
        q["status"] = status
    if requested_by_id:
        q["requested_by_id"] = requested_by_id
    rows = list(db["purchase_approval_requests"].find(q, {"_id": 0})
                .sort("created_at", -1).limit(limit))
    return {"rows": rows, "count": len(rows)}


@router.get("/requests/pending")
def pending_for(for_user: str = Query(..., description="user id of approver")):
    """Return approval requests where this user (by role) is the next approver."""
    user = _resolve_user(for_user)
    if not user:
        return {"rows": [], "count": 0, "user": None}
    role = user.get("role")
    rows = list(db["purchase_approval_requests"].find(
        {"status": "pending", "current_approver_role": role},
        {"_id": 0}).sort("created_at", -1).limit(100))
    return {"rows": rows, "count": len(rows), "user": {
        "id": user["id"], "name": user["name"], "role": role}}


@router.post("/requests/{rid}/approve")
def approve(rid: str, body: ApproveBody):
    rec = db["purchase_approval_requests"].find_one({"id": rid}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "request not found")
    if rec["status"] != "pending":
        raise HTTPException(400, f"request is {rec['status']}, not pending")

    approver = _resolve_user(body.approver_id) or {}
    arole = approver.get("role")
    if arole != rec.get("current_approver_role") and arole != "admin":
        raise HTTPException(
            403,
            f"current approver must be {rec.get('current_approver_role')}; "
            f"you are {arole or 'unknown'}")

    chain_entry = {
        "role": arole, "actor_id": body.approver_id,
        "actor_name": body.approver_name or approver.get("name", ""),
        "action": "approved", "at": _now(), "note": body.note or "",
    }
    # does the approver's limit cover the amount? otherwise advance chain
    cfg = _get_role_config(arole)
    if rec["amount"] <= (cfg.get("limit") or 0) or arole == "admin":
        update = {"$set": {
            "status": "approved", "current_approver_role": None,
            "updated_at": _now(), "approved_at": _now(),
        }, "$push": {"approval_chain": chain_entry}}
    else:
        next_role = cfg.get("approver_role") or "admin"
        update = {"$set": {
            "current_approver_role": next_role,
            "updated_at": _now(),
        }, "$push": {"approval_chain": chain_entry}}
    db["purchase_approval_requests"].update_one({"id": rid}, update)
    return {"ok": True, "request_id": rid,
            "status": (update.get("$set") or {}).get("status", "pending"),
            "next_approver_role":
                (update.get("$set") or {}).get("current_approver_role")}


@router.post("/requests/{rid}/reject")
def reject(rid: str, body: RejectBody):
    rec = db["purchase_approval_requests"].find_one({"id": rid}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "request not found")
    if rec["status"] != "pending":
        raise HTTPException(400, f"request is {rec['status']}, not pending")
    approver = _resolve_user(body.approver_id) or {}
    db["purchase_approval_requests"].update_one(
        {"id": rid},
        {"$set": {
            "status": "rejected", "current_approver_role": None,
            "rejected_at": _now(), "updated_at": _now(),
            "rejection_reason": body.reason or "",
        }, "$push": {"approval_chain": {
            "role": approver.get("role"),
            "actor_id": body.approver_id,
            "actor_name": body.approver_name or approver.get("name", ""),
            "action": "rejected", "at": _now(),
            "note": body.reason or "",
        }}})
    return {"ok": True, "request_id": rid, "status": "rejected"}


# ─────────────────────────────────────────────────────────────
# Banner — what's awaiting *me*?
# ─────────────────────────────────────────────────────────────
@router.get("/banner")
def banner_for_user(for_user: str = Query(...)):
    user = _resolve_user(for_user)
    if not user:
        return {"pending": [], "count": 0}
    role = user.get("role")
    rows = list(db["purchase_approval_requests"].find(
        {"status": "pending", "current_approver_role": role},
        {"_id": 0, "id": 1, "requested_by_name": 1, "requested_by_role_label": 1,
         "outlet": 1, "company": 1, "amount": 1, "item_description": 1,
         "link_to": 1, "created_at": 1}
    ).sort("created_at", -1).limit(20))
    return {
        "pending": rows, "count": len(rows),
        "user": {"id": user["id"], "name": user["name"], "role": role},
    }
