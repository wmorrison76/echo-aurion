"""
D16a · Commissary backend.

Two production lanes share one mechanic:

  pastry   Finished products (cheesecake, croissants) from the pastry
           shop. Long-lead — laminations, preferments, age-and-cure
           items can be 3 months ahead.
  banquet  Bases (chicken stock, demi-glace, dressings, cut fruit,
           soups) from the banquet production line. Typically 24–72h
           lead.

Endpoints (all under `/api/commissary`):

  Catalog (admin / chef):
    POST   /products                 — create a catalog entry
    GET    /products?lane=…          — list (admin view; both lanes)
    PUT    /products/{id}            — update
    DELETE /products/{id}            — soft-delete (sets active=false)

  Per-outlet approvals (admin / chef):
    POST   /approvals                — approve product for outlet
    GET    /approvals?outlet_id=…    — list approvals for one outlet
    DELETE /approvals/{id}           — revoke

  Outlet-filtered catalog (line cooks / outlet managers):
    GET    /catalog?outlet_id=…&lane=…
                                      — returns ONLY products approved
                                        for this outlet, with the
                                        approver's note attached.

  Orders (internal-transfer-at-cost):
    POST   /orders                   — submit; computes total, stamps
                                        audit, sets status=submitted
    GET    /orders?outlet_id=…&status=…
                                      — list. Shows only orders the
                                        caller's outlet placed OR the
                                        caller's outlet is producing
    POST   /orders/{id}/status       — advance status; appends audit

The "internal-transfer-at-cost" semantic is captured by:
  - unit_cost stored on each line at order time (no later re-pricing)
  - on `status=delivered`, we emit an `internal_transfers` ledger row
    that both outlets' COGS reports can join

Production-sheet linkage: when the producing kitchen schedules the
work, they call POST /orders/{id}/status with status="in_production"
and provide an optional `production_task_id` that ties the order to
the row in their production calendar. D16b adds the UI for that;
the field is stored here.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/commissary", tags=["commissary"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_admin(x_admin_token: Optional[str]) -> None:
    expected = os.environ.get("ADMIN_API_TOKEN")
    if expected and x_admin_token != expected:
        raise HTTPException(401, "admin token required")


# ─── Validators ───────────────────────────────────────────────────────────

ALLOWED_LANES = {"pastry", "banquet"}
ALLOWED_UNITS = {"each", "g", "kg", "ml", "l", "qt", "gal",
                 "case", "pan", "portion"}
ALLOWED_STATUSES = {"draft", "submitted", "in_production", "ready",
                    "in_transit", "delivered", "cancelled"}
# Allowed forward transitions (no time-travel).
STATUS_GRAPH = {
    "draft":         {"submitted", "cancelled"},
    "submitted":     {"in_production", "cancelled"},
    "in_production": {"ready", "cancelled"},
    "ready":         {"in_transit", "cancelled"},
    "in_transit":    {"delivered", "cancelled"},
    "delivered":     set(),
    "cancelled":     set(),
}


# ─── Catalog (products) ───────────────────────────────────────────────────

class ProductCreate(BaseModel):
    lane: str
    name: str = Field(..., min_length=2, max_length=120)
    slug: str = Field(..., min_length=2, max_length=120,
                      pattern=r"^[a-z0-9][a-z0-9._-]*$")
    recipe_id: Optional[str] = None
    unit: str
    pack_size: int = 1
    unit_cost: float
    lead_time_hours: int
    preferment_hours: Optional[int] = None
    active: bool = True
    description: Optional[str] = ""
    producing_outlet_id: str


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    recipe_id: Optional[str] = None
    pack_size: Optional[int] = None
    unit_cost: Optional[float] = None
    lead_time_hours: Optional[int] = None
    preferment_hours: Optional[int] = None
    active: Optional[bool] = None
    description: Optional[str] = None
    producing_outlet_id: Optional[str] = None


def _validate_product(body: ProductCreate) -> None:
    if body.lane not in ALLOWED_LANES:
        raise HTTPException(400, f"lane must be one of {sorted(ALLOWED_LANES)}")
    if body.unit not in ALLOWED_UNITS:
        raise HTTPException(400, f"unit must be one of {sorted(ALLOWED_UNITS)}")
    if body.pack_size < 1:
        raise HTTPException(400, "pack_size must be >= 1")
    if body.unit_cost < 0:
        raise HTTPException(400, "unit_cost cannot be negative")
    if body.lead_time_hours < 0:
        raise HTTPException(400, "lead_time_hours cannot be negative")
    if body.preferment_hours is not None and body.preferment_hours < 0:
        raise HTTPException(400, "preferment_hours cannot be negative")


@router.post("/products")
def create_product(
    body: ProductCreate,
    x_admin_token: Optional[str] = Header(None),
):
    _require_admin(x_admin_token)
    _validate_product(body)
    if db["commissary_products"].find_one({"slug": body.slug}, {"_id": 0}):
        raise HTTPException(409, f"product slug '{body.slug}' already exists")
    doc = {
        "id": uuid.uuid4().hex[:12],
        **body.model_dump(),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    db["commissary_products"].insert_one(doc.copy())
    return {"ok": True, "product": doc}


@router.get("/products")
def list_products(
    lane: Optional[str] = None,
    include_inactive: bool = False,
    x_admin_token: Optional[str] = Header(None),
):
    """Admin view: every product across both lanes."""
    _require_admin(x_admin_token)
    q: Dict[str, Any] = {}
    if lane:
        if lane not in ALLOWED_LANES:
            raise HTTPException(400, f"lane must be one of {sorted(ALLOWED_LANES)}")
        q["lane"] = lane
    if not include_inactive:
        q["active"] = True
    items = list(db["commissary_products"].find(q, {"_id": 0})
                 .sort([("lane", 1), ("name", 1)]))
    return {"ok": True, "total": len(items), "products": items}


@router.put("/products/{product_id}")
def update_product(
    product_id: str,
    body: ProductUpdate,
    x_admin_token: Optional[str] = Header(None),
):
    _require_admin(x_admin_token)
    existing = db["commissary_products"].find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "product not found")
    update: Dict[str, Any] = {"updated_at": _now_iso()}
    for k, v in body.model_dump(exclude_unset=True).items():
        update[k] = v
    if "pack_size" in update and update["pack_size"] < 1:
        raise HTTPException(400, "pack_size must be >= 1")
    if "unit_cost" in update and update["unit_cost"] < 0:
        raise HTTPException(400, "unit_cost cannot be negative")
    db["commissary_products"].update_one({"id": product_id}, {"$set": update})
    return {"ok": True,
            "product": db["commissary_products"].find_one({"id": product_id},
                                                          {"_id": 0})}


@router.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    x_admin_token: Optional[str] = Header(None),
):
    """Soft-delete: sets active=false. Preserves order history."""
    _require_admin(x_admin_token)
    r = db["commissary_products"].update_one(
        {"id": product_id}, {"$set": {"active": False, "updated_at": _now_iso()}})
    if getattr(r, "matched_count", 0) == 0:
        raise HTTPException(404, "product not found")
    return {"ok": True, "id": product_id, "deactivated": True}


# ─── Approvals (per-outlet catalog gating) ────────────────────────────────

class ApprovalCreate(BaseModel):
    outlet_id: str
    product_id: str
    max_units_per_day: Optional[int] = None
    note: Optional[str] = None
    approved_by_user_id: Optional[str] = None
    approved_by_name: Optional[str] = None


@router.post("/approvals")
def approve_for_outlet(
    body: ApprovalCreate,
    x_admin_token: Optional[str] = Header(None),
):
    """Approve a product for an outlet. Idempotent on (outlet_id,
    product_id) — re-calling reactivates a revoked approval."""
    _require_admin(x_admin_token)
    product = db["commissary_products"].find_one({"id": body.product_id},
                                                  {"_id": 0})
    if not product:
        raise HTTPException(404, f"unknown product_id: {body.product_id}")

    # Idempotent: upsert on (outlet_id, product_id).
    existing = db["commissary_approvals"].find_one(
        {"outlet_id": body.outlet_id, "product_id": body.product_id},
        {"_id": 0})
    doc = {
        "id": existing["id"] if existing else uuid.uuid4().hex[:12],
        "outlet_id": body.outlet_id,
        "product_id": body.product_id,
        "is_active": True,
        "approved_by_user_id": body.approved_by_user_id,
        "approved_by_name": body.approved_by_name,
        "approved_at": _now_iso(),
        "max_units_per_day": body.max_units_per_day,
        "note": body.note or "",
    }
    db["commissary_approvals"].update_one(
        {"outlet_id": body.outlet_id, "product_id": body.product_id},
        {"$set": doc}, upsert=True)
    return {"ok": True, "approval": doc}


@router.get("/approvals")
def list_approvals(
    outlet_id: Optional[str] = None,
    product_id: Optional[str] = None,
    x_admin_token: Optional[str] = Header(None),
):
    _require_admin(x_admin_token)
    q: Dict[str, Any] = {"is_active": True}
    if outlet_id:  q["outlet_id"]  = outlet_id
    if product_id: q["product_id"] = product_id
    items = list(db["commissary_approvals"].find(q, {"_id": 0}))
    return {"ok": True, "total": len(items), "approvals": items}


@router.delete("/approvals/{approval_id}")
def revoke_approval(
    approval_id: str,
    x_admin_token: Optional[str] = Header(None),
):
    """Soft-revoke (sets is_active=false). Keeps the audit trail of
    when the outlet was approved + by whom."""
    _require_admin(x_admin_token)
    r = db["commissary_approvals"].update_one(
        {"id": approval_id}, {"$set": {"is_active": False}})
    if getattr(r, "matched_count", 0) == 0:
        raise HTTPException(404, "approval not found")
    return {"ok": True, "revoked": approval_id}


# ─── Outlet-filtered catalog (the "what can I order?" view) ───────────────

@router.get("/catalog")
def outlet_catalog(
    outlet_id: str,
    lane: Optional[str] = None,
):
    """Return ONLY products approved for `outlet_id`. Each product
    carries the approval row's note + max_units_per_day so the client
    can render constraints inline ('Cafe — pull from morning bake')."""
    if lane and lane not in ALLOWED_LANES:
        raise HTTPException(400, f"lane must be one of {sorted(ALLOWED_LANES)}")

    # 1. Active approvals for this outlet.
    approvals = list(db["commissary_approvals"].find(
        {"outlet_id": outlet_id, "is_active": True}, {"_id": 0}))
    if not approvals:
        return {"ok": True, "outlet_id": outlet_id, "lane": lane,
                "products": [], "total": 0}

    # 2. Pull the matching products. Drop inactive / wrong-lane.
    by_pid = {a["product_id"]: a for a in approvals}
    q: Dict[str, Any] = {"id": {"$in": list(by_pid.keys())}, "active": True}
    if lane:
        q["lane"] = lane
    products = list(db["commissary_products"].find(q, {"_id": 0}))

    # 3. Decorate each product with its approval row.
    out = []
    for p in products:
        a = by_pid.get(p["id"], {})
        out.append({
            **p,
            "approval": {
                "max_units_per_day": a.get("max_units_per_day"),
                "note": a.get("note") or "",
                "approved_by": a.get("approved_by_name"),
                "approved_at": a.get("approved_at"),
            },
        })
    out.sort(key=lambda p: (p["lane"], p["name"]))
    return {"ok": True, "outlet_id": outlet_id, "lane": lane,
            "products": out, "total": len(out)}


# ─── Orders (internal-transfer-at-cost) ───────────────────────────────────

class OrderLineIn(BaseModel):
    product_id: str
    qty: float


class OrderCreate(BaseModel):
    ordering_outlet_id: str
    needed_by: str        # ISO datetime
    lines: List[OrderLineIn]
    note: Optional[str] = None
    beo_id: Optional[str] = None
    ordered_by_user_id: Optional[str] = None
    ordered_by_name: Optional[str] = None
    # D27 · tenant_id always set (header > body > "default" fallback).
    # Without this, multi-tenant deployments leak orders across customers.
    tenant_id: Optional[str] = None


@router.post("/orders")
def submit_order(
    body: OrderCreate,
    x_admin_token: Optional[str] = Header(None),
    x_tenant_id: Optional[str] = Header(None),
):
    # D27 · tenant precedence: header > body > "default" so the
    # admin-token caller can override and tests can pass directly.
    tenant_id = (x_tenant_id or body.tenant_id or "default").strip().lower()
    """Submit an internal-transfer order. Validates each line against:
      1. The product exists and is active.
      2. The product is approved for `ordering_outlet_id`.
      3. Optional: max_units_per_day not exceeded across this day.
    Computes line totals at the product's CURRENT unit_cost (snapshot)
    and enforces single-producing-outlet (a single order can't span
    multiple production kitchens)."""
    _require_admin(x_admin_token)

    if not body.lines:
        raise HTTPException(400, "order must have at least one line")

    # Pull product rows + approvals for the ordering outlet in one pass.
    pids = [ln.product_id for ln in body.lines]
    products = {p["id"]: p for p in db["commissary_products"].find(
        {"id": {"$in": pids}, "active": True}, {"_id": 0})}
    approvals = {a["product_id"]: a for a in db["commissary_approvals"].find(
        {"outlet_id": body.ordering_outlet_id, "is_active": True,
         "product_id": {"$in": pids}}, {"_id": 0})}

    out_lines: List[Dict[str, Any]] = []
    total_cost = 0.0
    producing_outlet_id: Optional[str] = None
    lane: Optional[str] = None

    for ln in body.lines:
        p = products.get(ln.product_id)
        if not p:
            raise HTTPException(400, f"unknown or inactive product: {ln.product_id}")
        if ln.product_id not in approvals:
            raise HTTPException(403,
                f"outlet '{body.ordering_outlet_id}' is not approved for "
                f"product '{p['name']}' ({ln.product_id})")
        if ln.qty <= 0:
            raise HTTPException(400, f"qty must be > 0 for {p['name']}")
        # max_units_per_day soft-cap
        a = approvals[ln.product_id]
        cap = a.get("max_units_per_day")
        if cap is not None and ln.qty > cap:
            raise HTTPException(403,
                f"qty {ln.qty} exceeds max_units_per_day {cap} for "
                f"{p['name']} at this outlet")
        # Single-producing-outlet rule.
        if producing_outlet_id is None:
            producing_outlet_id = p["producing_outlet_id"]
            lane = p["lane"]
        elif producing_outlet_id != p["producing_outlet_id"]:
            raise HTTPException(400,
                "order spans multiple producing outlets; please split "
                "into separate orders (one per producing kitchen)")
        line_total = round(float(ln.qty) * float(p["unit_cost"]), 2)
        total_cost += line_total
        # D20 · snapshot the recipe stages version this order line
        # was placed against. Audit can reconstruct exactly which
        # version of the recipe was in effect when the order fired,
        # even if the chef has since edited the stages.
        stages_version = None
        if p.get("recipe_id"):
            try:
                _stage_doc = db["recipe_stages"].find_one(
                    {"recipe_id": p["recipe_id"]}, {"_id": 0})
                if _stage_doc:
                    stages_version = int(_stage_doc.get("version") or 1)
            except Exception:
                pass
        out_lines.append({
            "product_id":   p["id"],
            "product_name": p["name"],
            "unit":         p["unit"],
            "qty":          float(ln.qty),
            "unit_cost":    float(p["unit_cost"]),
            "line_total":   line_total,
            "recipe_id":    p.get("recipe_id"),
            "recipe_stages_version": stages_version,
        })

    doc = {
        "id": uuid.uuid4().hex[:12],
        "lane": lane,
        "tenant_id": tenant_id,   # D27 · isolate orders per tenant
        "ordering_outlet_id":  body.ordering_outlet_id,
        "producing_outlet_id": producing_outlet_id,
        "needed_by": body.needed_by,
        "status": "submitted",
        "lines": out_lines,
        "total_cost": round(total_cost, 2),
        "audit_log": [{
            "at": _now_iso(),
            "user_id": body.ordered_by_user_id,
            "user_name": body.ordered_by_name,
            "action": "submitted",
            "note": body.note or "",
        }],
        "production_task_id": None,
        "beo_id": body.beo_id,
        "ordered_by_user_id": body.ordered_by_user_id,
        "ordered_by_name":   body.ordered_by_name,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    db["commissary_orders"].insert_one(doc.copy())

    # D16f · auto-spawn the production task on the producing kitchen's
    # production sheet. The task's start time is needed_by minus the
    # total lead time (from staged recipe when present, static field
    # otherwise). This is what closes the receiving loop — the chef
    # at the pastry shop / banquet kitchen sees the order land on
    # their calendar with a ready-to-fire timer.
    try:
        task_id = _spawn_production_task_for_order(doc)
        if task_id:
            db["commissary_orders"].update_one(
                {"id": doc["id"]},
                {"$set": {"production_task_id": task_id,
                          "updated_at": _now_iso()}})
            doc["production_task_id"] = task_id
    except Exception:
        # Task spawn failure must not block the order. Surface in
        # logs; the chef can manually link via /orders/{id}/status
        # when transitioning to in_production.
        pass

    return {"ok": True, "order": doc}


@router.get("/orders")
def list_orders(
    outlet_id: str,
    role: str = "ordering",   # "ordering" | "producing" | "either"
    status: Optional[str] = None,
    limit: int = 100,
):
    """List orders for an outlet — either the ones it placed
    (consumer view) or the ones it's producing (kitchen view) or both."""
    if role not in ("ordering", "producing", "either"):
        raise HTTPException(400, "role must be ordering | producing | either")
    q: Dict[str, Any] = {}
    if role == "ordering":
        q["ordering_outlet_id"] = outlet_id
    elif role == "producing":
        q["producing_outlet_id"] = outlet_id
    else:
        q["$or"] = [{"ordering_outlet_id": outlet_id},
                    {"producing_outlet_id": outlet_id}]
    if status:
        if status not in ALLOWED_STATUSES:
            raise HTTPException(400, f"status must be one of {sorted(ALLOWED_STATUSES)}")
        q["status"] = status
    items = list(db["commissary_orders"].find(q, {"_id": 0})
                 .sort("created_at", -1).limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(items), "orders": items}


class OrderStatusUpdate(BaseModel):
    """When the producing kitchen schedules the work in their
    production calendar, they pass `production_task_id` so the
    consuming outlet can see progress on the source order."""
    status: str
    note: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    production_task_id: Optional[str] = None


@router.post("/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
):
    """Advance the status. Enforces forward-only transitions; appends
    to audit log. On `delivered` writes an `internal_transfers` ledger
    row that COGS reports can join against."""
    if body.status not in ALLOWED_STATUSES:
        raise HTTPException(400, f"status must be one of {sorted(ALLOWED_STATUSES)}")
    order = db["commissary_orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "order not found")
    current = order.get("status")
    if body.status not in STATUS_GRAPH.get(current, set()) and body.status != current:
        raise HTTPException(400,
            f"illegal transition: {current} → {body.status}. "
            f"allowed: {sorted(STATUS_GRAPH.get(current, set()))}")

    audit_entry = {
        "at": _now_iso(),
        "user_id": body.user_id,
        "user_name": body.user_name,
        "action": f"status:{body.status}",
        "note": body.note or "",
    }
    update: Dict[str, Any] = {
        "status": body.status,
        "updated_at": _now_iso(),
        "audit_log": list(order.get("audit_log") or []) + [audit_entry],
    }
    if body.production_task_id is not None:
        update["production_task_id"] = body.production_task_id
    if body.status == "delivered":
        # Internal transfer ledger — both outlets' COGS reports join here.
        # Idempotent guard: only emit if not already emitted.
        if not db["internal_transfers"].find_one(
            {"source_order_id": order_id}, {"_id": 0}
        ):
            db["internal_transfers"].insert_one({
                "id": uuid.uuid4().hex[:12],
                "source_order_id": order_id,
                "lane": order["lane"],
                "from_outlet_id": order["producing_outlet_id"],
                "to_outlet_id":   order["ordering_outlet_id"],
                "lines": order["lines"],
                "total_cost": order["total_cost"],
                "delivered_at": _now_iso(),
                "delivered_by_user_id": body.user_id,
                "delivered_by_name":   body.user_name,
            })

    db["commissary_orders"].update_one({"id": order_id}, {"$set": update})
    return {"ok": True,
            "order": db["commissary_orders"].find_one({"id": order_id},
                                                       {"_id": 0})}


# ─── D16b · Recipe production stages ─────────────────────────────────────
# A mousse cake breaks down as: bake biscuit → make mousse → assemble +
# freeze → finish. Each stage has active (hands-on chef) + passive
# (cool / freeze / proof) minutes. Total lead time = sum across stages.

class StageBody(BaseModel):
    sequence_order: int
    name: str = Field(..., min_length=2, max_length=120)
    active_minutes: int
    passive_minutes: int = 0
    station: Optional[str] = None
    equipment: Optional[List[str]] = None
    notes: Optional[str] = None
    can_overlap_with_next: bool = False
    source: Optional[str] = "manual"


def _validate_stage(s: StageBody) -> None:
    if s.sequence_order < 1:
        raise HTTPException(400, "sequence_order must be >= 1")
    if s.active_minutes < 0 or s.passive_minutes < 0:
        raise HTTPException(400, "stage minutes cannot be negative")
    if s.source and s.source not in ("manual", "ai_inferred", "imported"):
        raise HTTPException(400, "source must be manual | ai_inferred | imported")


@router.post("/recipes/{recipe_id}/stages")
def upsert_stages(
    recipe_id: str,
    stages: List[StageBody],
    x_admin_token: Optional[str] = Header(None),
):
    """Replace ALL stages for a recipe with the given list. The full-
    replacement semantic keeps the data model simple — chefs edit a
    recipe's stages as a unit, not row-by-row. Ordering is preserved
    via sequence_order."""
    _require_admin(x_admin_token)
    if not stages:
        raise HTTPException(400, "at least one stage required")
    for s in stages:
        _validate_stage(s)
    # Sequence numbers must be unique within the set.
    seqs = [s.sequence_order for s in stages]
    if len(seqs) != len(set(seqs)):
        raise HTTPException(400, "sequence_order values must be unique")

    # D20 · versioning. The current row carries `version` (1-indexed,
    # bumped on every replace) and gets archived to recipe_stage_history
    # before the in-place upsert so an audit can ask "which version of
    # mousse cake was used Tuesday" by joining
    # commissary_orders.recipe_stages_version → recipe_stage_history.
    existing = db["recipe_stages"].find_one(
        {"recipe_id": recipe_id}, {"_id": 0})
    next_version = int((existing or {}).get("version") or 0) + 1
    if existing:
        # Snapshot the prior version into history before overwriting.
        archive = {
            **{k: v for k, v in existing.items() if k != "_id"},
            "archived_at": _now_iso(),
            "superseded_by_version": next_version,
        }
        try:
            db["recipe_stage_history"].insert_one(archive)
        except Exception:
            pass   # history is best-effort; don't block edits

    db["recipe_stages"].update_one(
        {"recipe_id": recipe_id},
        {"$set": {
            "recipe_id": recipe_id,
            "version": next_version,
            "stages": [{**s.model_dump(),
                        "id": uuid.uuid4().hex[:12],
                        "recipe_id": recipe_id,
                        "version": next_version,
                        "created_at": _now_iso(),
                        "updated_at": _now_iso()} for s in stages],
            "updated_at": _now_iso(),
        }},
        upsert=True,
    )
    return {"ok": True, "recipe_id": recipe_id,
            "version": next_version,
            "stages": _stages_for(recipe_id)}


@router.get("/recipes/{recipe_id}/stages")
def get_stages(recipe_id: str):
    """Public read — line cooks need to see the stages on the
    production sheet without admin-token gating."""
    row = db["recipe_stages"].find_one({"recipe_id": recipe_id}, {"_id": 0})
    return {"ok": True, "recipe_id": recipe_id,
            "version": int((row or {}).get("version") or 0),
            "stages": _stages_for(recipe_id)}


@router.get("/recipes/{recipe_id}/stages/history")
def get_stages_history(recipe_id: str, limit: int = 50):
    """D20 · history view — every prior version of this recipe's
    stages, newest first. Used by the audit-replay UI to answer
    'which stages was this order placed against?' by joining
    commissary_orders.lines[].recipe_stages_version → version."""
    rows = list(db["recipe_stage_history"].find(
        {"recipe_id": recipe_id}, {"_id": 0})
        .sort("version", -1).limit(max(1, min(200, limit))))
    return {"ok": True, "recipe_id": recipe_id,
            "current_version": int(
                (db["recipe_stages"].find_one(
                    {"recipe_id": recipe_id}, {"_id": 0}) or {}
                ).get("version") or 0),
            "history": rows,
            "total": len(rows)}


@router.get("/recipes/{recipe_id}/stages/at-version/{version}")
def get_stages_at_version(recipe_id: str, version: int):
    """D20 · resolve a specific version. Returns the current row if
    it matches, otherwise pulls from history. Used when the audit
    UI clicks "show me what version 3 looked like" without forcing
    the chef to manually walk the history list."""
    current = db["recipe_stages"].find_one(
        {"recipe_id": recipe_id}, {"_id": 0})
    if current and int(current.get("version") or 0) == version:
        return {"ok": True, "recipe_id": recipe_id, "version": version,
                "stages": current.get("stages") or [],
                "source": "current"}
    archived = db["recipe_stage_history"].find_one(
        {"recipe_id": recipe_id, "version": version}, {"_id": 0})
    if not archived:
        raise HTTPException(404,
            f"version {version} not found for recipe {recipe_id}")
    return {"ok": True, "recipe_id": recipe_id, "version": version,
            "stages": archived.get("stages") or [],
            "source": "archived",
            "archived_at": archived.get("archived_at"),
            "superseded_by_version": archived.get("superseded_by_version")}


def _stages_for(recipe_id: str) -> List[Dict[str, Any]]:
    row = db["recipe_stages"].find_one({"recipe_id": recipe_id}, {"_id": 0})
    stages = list((row or {}).get("stages") or [])
    stages.sort(key=lambda s: s.get("sequence_order") or 0)
    return stages


def _stage_breakdown(stages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute the cumulative timeline. When can_overlap_with_next is
    set, the *next* stage's active minutes start during this stage's
    passive minutes (the chef preps decoration during the freeze)."""
    total = 0
    active = 0
    passive = 0
    out: List[Dict[str, Any]] = []
    prev_overlap = False
    prev_passive = 0
    for s in stages:
        am = int(s.get("active_minutes") or 0)
        pm = int(s.get("passive_minutes") or 0)
        active += am
        passive += pm
        # If previous stage allowed overlap, the next stage's active
        # time is absorbed into the previous passive — credit back the
        # min(active_now, passive_prev_unused).
        if prev_overlap and prev_passive >= am:
            stage_total = pm  # active hidden inside prev passive
        else:
            stage_total = am + pm
        total += stage_total
        out.append({
            "sequence_order": s.get("sequence_order"),
            "name": s.get("name"),
            "active_minutes": am,
            "passive_minutes": pm,
            "cumulative_minutes": total,
        })
        prev_overlap = bool(s.get("can_overlap_with_next"))
        prev_passive = pm
    return {
        "total_minutes": total,
        "total_hours": round(total / 60.0, 2),
        "active_minutes": active,
        "passive_minutes": passive,
        "stages": out,
    }


@router.get("/products/{product_id}/total-lead-time")
def product_lead_time(product_id: str):
    """Roll up the production timeline for a product. Reads stages
    from the linked recipe; falls back to the product's static
    lead_time_hours when no stages are defined."""
    p = db["commissary_products"].find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "product not found")
    rid = p.get("recipe_id")
    stages = _stages_for(rid) if rid else []
    if stages:
        b = _stage_breakdown(stages)
        return {"ok": True, "product_id": product_id,
                "source": "stages", **b}
    # No stages → fall back to the static field.
    minutes = int((p.get("lead_time_hours") or 0)) * 60 \
              + int((p.get("preferment_hours") or 0)) * 60
    return {"ok": True, "product_id": product_id,
            "source": "static_lead_time",
            "total_minutes": minutes,
            "total_hours": round(minutes / 60.0, 2),
            "active_minutes": 0,
            "passive_minutes": minutes,
            "stages": []}


# ─── AI stage inference (Anthropic via fuse box) ─────────────────────────

class InferStagesBody(BaseModel):
    """Caller passes the recipe payload they want stages for. This
    endpoint does NOT itself look up a recipe by id — that gives the
    UI flexibility to tweak (e.g. preview stages for an unsaved
    recipe). The caller decides whether to persist the result via
    POST /recipes/{recipe_id}/stages."""
    name: str
    yield_qty: float = 1.0
    yield_unit: str = "each"
    ingredients: Optional[List[Dict[str, Any]]] = None
    method: Optional[str] = None
    notes: Optional[str] = None


_INFER_SYSTEM_PROMPT = (
    "You are a working pastry / banquet sous chef breaking down a "
    "recipe into PRODUCTION STAGES. Each stage has hands-on chef "
    "time (active_minutes) and wait/cook/cool time (passive_minutes). "
    "Stages are 1-indexed and sequential. Be realistic — a 90-day-aged "
    "fruitcake has a passive stage in DAYS converted to minutes; a "
    "vinaigrette is one short stage. Output ONLY a JSON array; no "
    "narration. Each element MUST have: "
    "sequence_order, name, active_minutes, passive_minutes, station, "
    "equipment (array, may be empty), notes (may be empty string), "
    "can_overlap_with_next (boolean — true only when the chef can "
    "begin the NEXT active step during this stage's passive wait)."
)


def _build_infer_prompt(body: InferStagesBody) -> str:
    parts = [
        f"Recipe name: {body.name}",
        f"Yield: {body.yield_qty} {body.yield_unit}",
    ]
    if body.ingredients:
        parts.append("Ingredients:")
        for ing in body.ingredients:
            qty = ing.get("qty") or ing.get("quantity") or ""
            unit = ing.get("unit") or ""
            nm = ing.get("name") or ing.get("ingredient") or "?"
            parts.append(f"  - {qty} {unit} {nm}".strip())
    if body.method:
        parts.append(f"Method: {body.method}")
    if body.notes:
        parts.append(f"Notes: {body.notes}")
    parts.append("Return the production stages as a JSON array.")
    return "\n".join(parts)


@router.post("/recipes/{recipe_id}/stages/infer")
def infer_stages(
    recipe_id: str,
    body: InferStagesBody,
    persist: bool = False,
    x_admin_token: Optional[str] = Header(None),
):
    """Ask Claude to break the recipe into production stages. Returns
    the suggested stages WITHOUT persisting unless ?persist=true.

    Wired through the fuse box (services.clients.get_anthropic_client)
    so the OPENAI_API_KEY/ANTHROPIC_API_KEY rotation policy applies.
    Falls back to a deterministic heuristic when no AI key is wired,
    so the demo path still produces something usable."""
    _require_admin(x_admin_token)

    suggested: List[Dict[str, Any]] = []
    used = "fallback"
    try:
        from services.clients import get_anthropic_client
        client = get_anthropic_client()
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            system=_INFER_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _build_infer_prompt(body)}],
        )
        # Anthropic SDK returns content as a list of blocks
        text = ""
        for block in getattr(msg, "content", []) or []:
            if getattr(block, "type", "") == "text":
                text += getattr(block, "text", "")
        import json as _json
        # Strip markdown fences if present
        t = text.strip()
        if t.startswith("```"):
            t = t.split("```", 2)[1]
            if t.startswith("json"):
                t = t[4:]
            t = t.rsplit("```", 1)[0]
        suggested = _json.loads(t)
        used = "anthropic"
    except Exception as e:
        # Fallback heuristic — divide into a reasonable default
        # depending on recipe size. Marks every stage as ai_inferred=False
        # / source="fallback" so chefs know to edit.
        suggested = _fallback_stages(body)
        used = f"fallback ({type(e).__name__})"

    # Normalize: enforce required fields, source tag, integer minutes.
    cleaned: List[Dict[str, Any]] = []
    for i, raw in enumerate(suggested or []):
        try:
            cleaned.append({
                "sequence_order": int(raw.get("sequence_order") or (i + 1)),
                "name": str(raw.get("name") or f"Stage {i + 1}"),
                "active_minutes": max(0, int(raw.get("active_minutes") or 0)),
                "passive_minutes": max(0, int(raw.get("passive_minutes") or 0)),
                "station": raw.get("station") or "",
                "equipment": list(raw.get("equipment") or []),
                "notes": str(raw.get("notes") or ""),
                "can_overlap_with_next": bool(raw.get("can_overlap_with_next")),
                "source": "ai_inferred",
            })
        except Exception:
            continue

    breakdown = _stage_breakdown(cleaned)

    if persist and cleaned:
        # Persist via the same path as upsert_stages so the
        # validation rules apply.
        bodies = [StageBody(**{k: v for k, v in s.items()
                               if k in StageBody.__annotations__})
                  for s in cleaned]
        upsert_stages(recipe_id, bodies, x_admin_token=x_admin_token)

    return {"ok": True, "recipe_id": recipe_id,
            "stages": cleaned, "breakdown": breakdown,
            "model": used, "persisted": bool(persist and cleaned)}


def _fallback_stages(body: InferStagesBody) -> List[Dict[str, Any]]:
    """Deterministic fallback when no AI is wired. Produces 2-3
    reasonable stages so the demo still has something to render. The
    chef edits from there."""
    name = (body.name or "").lower()
    has_dough = any(k in name for k in ("bread", "croissant", "pastry",
                                          "dough", "sourdough", "cake"))
    has_cure = any(k in name for k in ("cured", "aged", "fruitcake"))
    if has_cure:
        return [
            {"sequence_order": 1, "name": "Mix and form",
             "active_minutes": 60, "passive_minutes": 0},
            {"sequence_order": 2, "name": "Cure / age",
             "active_minutes": 0, "passive_minutes": 60 * 24 * 90},
        ]
    if has_dough:
        return [
            {"sequence_order": 1, "name": "Mix and bulk ferment",
             "active_minutes": 30, "passive_minutes": 240},
            {"sequence_order": 2, "name": "Shape and proof",
             "active_minutes": 20, "passive_minutes": 120},
            {"sequence_order": 3, "name": "Bake",
             "active_minutes": 10, "passive_minutes": 30},
        ]
    return [
        {"sequence_order": 1, "name": "Mise en place",
         "active_minutes": 15, "passive_minutes": 0},
        {"sequence_order": 2, "name": "Cook",
         "active_minutes": 30, "passive_minutes": 30},
        {"sequence_order": 3, "name": "Cool / hold",
         "active_minutes": 5, "passive_minutes": 60},
    ]


# ─── Onboarding hook · flag an outlet as a commissary + seed defaults ────

class CommissarySetupBody(BaseModel):
    """Body for the onboarding endpoint. The admin checks "this outlet
    runs a commissary" in the onboarding wizard and picks a lane —
    this endpoint flips the outlet flag and seeds a starter set of
    products. Safe to re-call (idempotent)."""
    lane: str          # "pastry" | "banquet"
    seed_defaults: bool = True


@router.post("/onboarding/outlets/{outlet_id}/commissary")
def setup_outlet_commissary(
    outlet_id: str,
    body: CommissarySetupBody,
    x_admin_token: Optional[str] = Header(None),
):
    """When an outlet is marked as a commissary in onboarding:
      1. Set is_commissary=true and commissary_lane on the outlet row
      2. (Optional) seed a starter product catalog for that lane

    The starter products are realistic defaults the chef will
    customize. Each carries an empty recipe_id — the chef links to
    a real recipe in the recipe builder, then runs the AI stage
    inference. Idempotent: re-calling does NOT duplicate seeds."""
    _require_admin(x_admin_token)

    if body.lane not in ALLOWED_LANES:
        raise HTTPException(400, f"lane must be one of {sorted(ALLOWED_LANES)}")

    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0}) \
            or db["outlets"].find_one({"id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, f"outlet {outlet_id} not found")

    db["outlets"].update_one(
        {"outlet_id": outlet.get("outlet_id") or outlet_id},
        {"$set": {"is_commissary": True,
                  "commissary_lane": body.lane,
                  "updated_at": _now_iso()}},
    )

    seeded: List[Dict[str, Any]] = []
    if body.seed_defaults:
        defaults = _DEFAULT_SEEDS.get(body.lane, [])
        for spec in defaults:
            slug = spec["slug"]
            if db["commissary_products"].find_one({"slug": slug}, {"_id": 0}):
                continue  # already exists — idempotent skip
            doc = {
                "id": uuid.uuid4().hex[:12],
                "lane": body.lane,
                "slug": slug,
                "name": spec["name"],
                "unit": spec["unit"],
                "pack_size": spec.get("pack_size", 1),
                "unit_cost": spec["unit_cost"],
                "lead_time_hours": spec["lead_time_hours"],
                "preferment_hours": spec.get("preferment_hours"),
                "active": True,
                "description": spec.get("description") or "",
                "producing_outlet_id": outlet_id,
                "recipe_id": None,   # chef links via the recipe builder
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
            db["commissary_products"].insert_one(doc.copy())
            seeded.append(doc)

    return {"ok": True, "outlet_id": outlet_id, "lane": body.lane,
            "seeded": len(seeded), "products": seeded}


# Default starter catalogs. The chef edits cost / lead time / recipe
# linkage after onboarding completes. These exist so the brand-new
# pastry shop / banquet kitchen has something to demo with.
_DEFAULT_SEEDS: Dict[str, List[Dict[str, Any]]] = {
    "pastry": [
        {"slug": "cheesecake-slice",  "name": "Cheesecake Slice",
         "unit": "portion", "pack_size": 12, "unit_cost": 4.50,
         "lead_time_hours": 24,
         "description": "NY-style cheesecake; 12 slices per pan."},
        {"slug": "croissant",         "name": "Croissant",
         "unit": "each",    "pack_size": 1,  "unit_cost": 1.85,
         "lead_time_hours": 48,
         "description": "Laminated dough; 24h cold rest + bake."},
        {"slug": "chocolate-mousse-cake", "name": "Chocolate Mousse Cake",
         "unit": "each",    "pack_size": 1,  "unit_cost": 18.00,
         "lead_time_hours": 8,
         "description": "Biscuit base + chocolate mousse + glaze."},
        {"slug": "sourdough-loaf",    "name": "Sourdough Loaf",
         "unit": "each",    "pack_size": 1,  "unit_cost": 4.25,
         "lead_time_hours": 24,
         "description": "Levain refresh 24h ahead; bake morning of."},
        {"slug": "macaron-shells",    "name": "Macaron Shells",
         "unit": "case",    "pack_size": 60, "unit_cost": 0.45,
         "lead_time_hours": 18,
         "description": "Aged whites; pipe + rest 60 min before bake."},
    ],
    "banquet": [
        {"slug": "chicken-stock-1qt", "name": "Chicken Stock (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 3.00,
         "lead_time_hours": 24,
         "description": "Roasted bones, mirepoix; 6h simmer."},
        {"slug": "veal-stock-1qt",    "name": "Veal Stock (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 5.50,
         "lead_time_hours": 48,
         "description": "Brown veal stock; 24h simmer for depth."},
        {"slug": "fish-stock-1qt",    "name": "Fish Stock (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 4.00,
         "lead_time_hours": 6,
         "description": "Quick fumet; 30 min simmer max."},
        {"slug": "demi-glace-1pt",    "name": "Demi-Glace (1 pt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 7.50,
         "lead_time_hours": 72,
         "description": "Reduce veal stock + sauce espagnole."},
        {"slug": "house-vinaigrette-1qt", "name": "House Vinaigrette (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 2.75,
         "lead_time_hours": 2,
         "description": "Mustard, sherry vinegar, EVOO; emulsified."},
        {"slug": "ranch-dressing-1qt",  "name": "Ranch Dressing (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 2.25,
         "lead_time_hours": 4,
         "description": "Buttermilk + herbs; rest 4h for flavor."},
        {"slug": "cut-fruit-case",      "name": "Cut Fruit Case",
         "unit": "case", "pack_size": 1, "unit_cost": 22.00,
         "lead_time_hours": 4,
         "description": "Pineapple / melon / berries; service-day prep."},
        {"slug": "tomato-soup-pint",    "name": "Tomato Soup (1 pint)",
         "unit": "qt", "pack_size": 1, "unit_cost": 1.95,
         "lead_time_hours": 4,
         "description": "Roasted tomato; 2h simmer."},
    ],
}


# ─── D16e · PAR levels & calibration ─────────────────────────────────────
# Each (outlet_id, product_id) pair has a par. base_par is steady-state;
# current_par is the calibrated target that flexes with reservations,
# sales velocity, and the calendar. The same product at two outlets has
# two independent pars — the Cafe runs 24 cheesecake slices on hand,
# Marina Grill runs 12. The auto-order generator below diffs current_par
# against (on_hand + on_order) and drafts replenishment orders.

class ParUpsertBody(BaseModel):
    outlet_id: str
    product_id: str
    base_par: float = Field(..., ge=0)
    # current_par is normally computed by the calibrator. Letting it be
    # set on upsert means a chef can "hand-set today" without waiting
    # for the next calibration run.
    current_par: Optional[float] = None
    active: bool = True


@router.post("/pars")
def upsert_par(
    body: ParUpsertBody,
    x_admin_token: Optional[str] = Header(None),
):
    """Create or update a par for a (outlet, product) pair. Idempotent
    on the pair — re-calling updates the same row."""
    _require_admin(x_admin_token)
    if not db["commissary_products"].find_one({"id": body.product_id},
                                                 {"_id": 0}):
        raise HTTPException(404, f"unknown product_id: {body.product_id}")

    existing = db["commissary_pars"].find_one(
        {"outlet_id": body.outlet_id, "product_id": body.product_id},
        {"_id": 0})
    doc = {
        "id": existing["id"] if existing else uuid.uuid4().hex[:12],
        "outlet_id": body.outlet_id,
        "product_id": body.product_id,
        "base_par": float(body.base_par),
        "current_par": (float(body.current_par)
                        if body.current_par is not None
                        else float(body.base_par)),
        "calibrated_at": _now_iso(),
        "calibration_factors": (existing or {}).get("calibration_factors")
                                or {"notes": "manually set"},
        "active": body.active,
        "created_at": (existing or {}).get("created_at") or _now_iso(),
        "updated_at": _now_iso(),
    }
    db["commissary_pars"].update_one(
        {"outlet_id": body.outlet_id, "product_id": body.product_id},
        {"$set": doc}, upsert=True,
    )
    return {"ok": True, "par": doc}


@router.get("/pars")
def list_pars(
    outlet_id: Optional[str] = None,
    product_id: Optional[str] = None,
    include_inactive: bool = False,
):
    q: Dict[str, Any] = {}
    if outlet_id:  q["outlet_id"]  = outlet_id
    if product_id: q["product_id"] = product_id
    if not include_inactive:
        q["active"] = True
    pars = list(db["commissary_pars"].find(q, {"_id": 0}))
    return {"ok": True, "total": len(pars), "pars": pars}


# ─── Calibration ─────────────────────────────────────────────────────────

class CalibrationSignals(BaseModel):
    """Inputs the calibrator multiplies against base_par. All three
    are multipliers normalized around 1.0 — caller is responsible for
    converting raw counts into ratios.

    A GM kicking off "calibrate for tomorrow" typically passes:
      reservation_pace = (tomorrow's covers / 4-week DOW average)
      sales_velocity   = (last-7d sales / trailing-28d sales for
                         this product, capped 0.5..2.0)
      calendar_factor  = 1.0 normal, 1.4 holiday-eve, 2.0 Mother's
                         Day, 0.7 Tuesday-after-long-weekend
    """
    reservation_pace: float = 1.0
    sales_velocity: float = 1.0
    calendar_factor: float = 1.0
    notes: Optional[str] = None


def _clamp_factor(f: float) -> float:
    """Pars must not be wildly miscalibrated by a noisy signal —
    cap each factor at a sane band so a runaway POS feed doesn't
    triple every par overnight."""
    return max(0.5, min(2.5, float(f)))


class CalibrateRequest(BaseModel):
    outlet_id: str
    # When omitted, calibrate every par at this outlet using the same
    # signals (whole-outlet recalibration — what the nightly job does).
    product_id: Optional[str] = None
    signals: CalibrationSignals


@router.post("/pars/calibrate")
def calibrate_pars(
    body: CalibrateRequest,
    x_admin_token: Optional[str] = Header(None),
):
    """Recompute current_par for one product or every active product
    at an outlet. Multiplies base_par by the three clamped signals;
    rounds up to whole units; never goes below base_par."""
    _require_admin(x_admin_token)

    rp = _clamp_factor(body.signals.reservation_pace)
    sv = _clamp_factor(body.signals.sales_velocity)
    cf = _clamp_factor(body.signals.calendar_factor)
    multiplier = rp * sv * cf

    q: Dict[str, Any] = {"outlet_id": body.outlet_id, "active": True}
    if body.product_id:
        q["product_id"] = body.product_id
    pars = list(db["commissary_pars"].find(q, {"_id": 0}))
    if not pars:
        raise HTTPException(404,
            "no active pars matched — set base_par via POST /pars first")

    import math
    updated: List[Dict[str, Any]] = []
    for par in pars:
        base = float(par.get("base_par") or 0)
        # Floor at base_par. If the multiplier would scale below 1.0,
        # we still don't drop below the steady-state minimum the chef
        # set during onboarding.
        target = max(base, math.ceil(base * multiplier))
        update = {
            "current_par": float(target),
            "calibrated_at": _now_iso(),
            "calibration_factors": {
                "reservation_pace": rp,
                "sales_velocity":   sv,
                "calendar_factor":  cf,
                "notes": body.signals.notes or "",
            },
            "updated_at": _now_iso(),
        }
        db["commissary_pars"].update_one(
            {"outlet_id": par["outlet_id"], "product_id": par["product_id"]},
            {"$set": update})
        updated.append({**par, **update})

    return {"ok": True, "outlet_id": body.outlet_id,
            "multiplier": round(multiplier, 3),
            "updated": len(updated), "pars": updated}


# ─── Below-par + auto-order generator ────────────────────────────────────

def _on_hand(outlet_id: str, product_id: str) -> float:
    """Best-effort lookup of current on-hand qty for a (outlet, product).
    Falls back to 0 when no inventory row exists — the auto-order
    generator then drafts a full-par order, which is exactly what the
    chef wants on day 1."""
    row = db["outlet_inventory"].find_one(
        {"outlet_id": outlet_id, "product_id": product_id}, {"_id": 0})
    if row and "on_hand" in row:
        try:
            return float(row["on_hand"])
        except Exception:
            return 0.0
    return 0.0


def _on_order(outlet_id: str, product_id: str) -> float:
    """Open commissary orders this outlet has pending — anything not
    yet delivered or cancelled. Counts toward inventory so we don't
    double-order."""
    open_orders = db["commissary_orders"].find(
        {"ordering_outlet_id": outlet_id,
         "status": {"$in": ["submitted", "in_production",
                             "ready", "in_transit"]}},
        {"_id": 0})
    total = 0.0
    for o in open_orders:
        for line in (o.get("lines") or []):
            if line.get("product_id") == product_id:
                try:
                    total += float(line.get("qty") or 0)
                except Exception:
                    continue
    return total


def _lead_time_for(product: Dict[str, Any]) -> int:
    """Pick the right lead-time number for a product. Stage-derived
    when the recipe is staged; static otherwise."""
    rid = product.get("recipe_id")
    if rid:
        row = db["recipe_stages"].find_one({"recipe_id": rid}, {"_id": 0})
        if row and row.get("stages"):
            stages = sorted(row["stages"],
                            key=lambda s: s.get("sequence_order") or 0)
            b = _stage_breakdown(stages)
            return int(round(b["total_minutes"] / 60.0)) or 1
    return int(product.get("lead_time_hours") or 0) + \
           int(product.get("preferment_hours") or 0)


@router.get("/pars/below")
def list_below_par(outlet_id: str):
    """List the outlet's items currently below their calibrated par.
    The auto-order generator uses this to decide what to draft.
    Returns ParShortfallRow shape for each row.

    Soft-failure design: items with no par row are skipped (chef has
    not committed to stocking them); items with par but no product
    are skipped (stale par after product deletion)."""
    pars = list(db["commissary_pars"].find(
        {"outlet_id": outlet_id, "active": True}, {"_id": 0}))
    if not pars:
        return {"ok": True, "outlet_id": outlet_id,
                "rows": [], "total_below": 0}

    pids = [p["product_id"] for p in pars]
    products = {p["id"]: p for p in db["commissary_products"].find(
        {"id": {"$in": pids}, "active": True}, {"_id": 0})}

    rows: List[Dict[str, Any]] = []
    for par in pars:
        prod = products.get(par["product_id"])
        if not prod:
            continue   # stale par after product deletion / deactivation
        on_hand = _on_hand(outlet_id, par["product_id"])
        on_order = _on_order(outlet_id, par["product_id"])
        shortfall = max(0.0, float(par["current_par"]) - on_hand - on_order)
        if shortfall <= 0:
            continue
        rows.append({
            "outlet_id":      outlet_id,
            "product_id":     par["product_id"],
            "product_name":   prod["name"],
            "base_par":       float(par["base_par"]),
            "current_par":    float(par["current_par"]),
            "on_hand":        on_hand,
            "on_order":       on_order,
            "shortfall":      shortfall,
            "unit":           prod.get("unit", "each"),
            "unit_cost":      float(prod.get("unit_cost") or 0),
            "lead_time_hours": _lead_time_for(prod),
        })
    rows.sort(key=lambda r: -r["shortfall"])
    return {"ok": True, "outlet_id": outlet_id,
            "rows": rows, "total_below": len(rows)}


class AutoOrderRequest(BaseModel):
    outlet_id: str
    needed_by: str
    # When True, immediately submits the draft. Otherwise it's saved
    # as status="draft" for the chef to review and submit.
    auto_submit: bool = False
    ordered_by_user_id: Optional[str] = None
    ordered_by_name: Optional[str] = None


@router.post("/pars/auto-order")
def auto_order(
    body: AutoOrderRequest,
    x_admin_token: Optional[str] = Header(None),
):
    """Draft (or submit) replenishment orders for everything below
    par at the outlet. Splits by producing kitchen — pastry shop
    items go in one order, banquet-kitchen items in another, since
    the single-producing-outlet rule applies."""
    _require_admin(x_admin_token)

    below = list_below_par(body.outlet_id)["rows"]
    if not below:
        return {"ok": True, "outlet_id": body.outlet_id,
                "drafts": [], "submitted": [], "note": "nothing below par"}

    # Group shortfall rows by producing outlet.
    by_producer: Dict[str, List[Dict[str, Any]]] = {}
    for row in below:
        prod = db["commissary_products"].find_one(
            {"id": row["product_id"]}, {"_id": 0})
        if not prod:
            continue
        by_producer.setdefault(prod["producing_outlet_id"], []).append(
            {**row, "_product": prod})

    drafts: List[Dict[str, Any]] = []
    submitted: List[Dict[str, Any]] = []
    for prod_outlet, rows in by_producer.items():
        lines: List[Dict[str, Any]] = []
        total_cost = 0.0
        lane = rows[0]["_product"]["lane"]
        for r in rows:
            qty = float(r["shortfall"])
            unit_cost = float(r["unit_cost"])
            line_total = round(qty * unit_cost, 2)
            total_cost += line_total
            lines.append({
                "product_id":   r["product_id"],
                "product_name": r["product_name"],
                "unit":         r["unit"],
                "qty":          qty,
                "unit_cost":    unit_cost,
                "line_total":   line_total,
            })
        status = "submitted" if body.auto_submit else "draft"
        doc = {
            "id": uuid.uuid4().hex[:12],
            "lane": lane,
            "ordering_outlet_id":  body.outlet_id,
            "producing_outlet_id": prod_outlet,
            "needed_by": body.needed_by,
            "status": status,
            "lines": lines,
            "total_cost": round(total_cost, 2),
            "audit_log": [{
                "at": _now_iso(),
                "user_id": body.ordered_by_user_id,
                "user_name": body.ordered_by_name,
                "action": status,
                "note": f"auto-order from below-par sweep ({len(lines)} items)",
            }],
            "production_task_id": None,
            "beo_id": None,
            "ordered_by_user_id": body.ordered_by_user_id,
            "ordered_by_name":   body.ordered_by_name,
            "auto_generated": True,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        db["commissary_orders"].insert_one(doc.copy())
        if body.auto_submit:
            submitted.append(doc)
        else:
            drafts.append(doc)

    return {"ok": True, "outlet_id": body.outlet_id,
            "drafts": drafts, "submitted": submitted}


# ─── D16f · Production-sheet pickup ──────────────────────────────────────
# When a commissary order is submitted, an entry lands on the producing
# kitchen's production sheet. Each line of the order becomes a task. If
# the linked recipe has stages (D16b), the task carries them as sub-steps
# the chef can check off in real time. start_at is computed as
# needed_by - total_lead_time so the chef sees "must start at 02:00".

def _spawn_production_task_for_order(order: Dict[str, Any]) -> Optional[str]:
    """Create a `commissary_production_tasks` row for this order,
    sized by recipe lead time. Idempotent — if a task already exists
    for this order_id, returns the existing id."""
    existing = db["commissary_production_tasks"].find_one(
        {"source_order_id": order["id"]}, {"_id": 0})
    if existing:
        return existing["id"]

    needed_by = order.get("needed_by") or _now_iso()
    # Compute total lead time = max of any line's lead time. The
    # chef will start the longest-lead item first; shorter items
    # slot in along the way.
    max_lead_minutes = 0
    line_tasks: List[Dict[str, Any]] = []
    for line in (order.get("lines") or []):
        prod = db["commissary_products"].find_one(
            {"id": line.get("product_id")}, {"_id": 0})
        if not prod:
            continue
        # Stage chain wins; static lead time is the fallback.
        rid = prod.get("recipe_id")
        stages = []
        if rid:
            row = db["recipe_stages"].find_one({"recipe_id": rid}, {"_id": 0})
            if row and row.get("stages"):
                stages = sorted(row["stages"],
                                key=lambda s: s.get("sequence_order") or 0)
        if stages:
            b = _stage_breakdown(stages)
            line_lead_minutes = b["total_minutes"]
        else:
            line_lead_minutes = (int(prod.get("lead_time_hours") or 0) * 60
                                 + int(prod.get("preferment_hours") or 0) * 60)
        max_lead_minutes = max(max_lead_minutes, line_lead_minutes)
        line_tasks.append({
            "product_id":   prod["id"],
            "product_name": prod.get("name"),
            "qty":          line.get("qty"),
            "unit":         line.get("unit"),
            "lead_minutes": line_lead_minutes,
            "stages":       [{
                "sequence_order": s.get("sequence_order"),
                "name":           s.get("name"),
                "active_minutes": s.get("active_minutes") or 0,
                "passive_minutes": s.get("passive_minutes") or 0,
                "station":        s.get("station") or "",
                "status":         "pending",   # pending | in_progress | done
            } for s in stages],
        })

    # start_at = needed_by - max_lead_minutes
    start_at = needed_by
    try:
        from datetime import datetime, timezone, timedelta
        nb = datetime.fromisoformat(str(needed_by).replace("Z", "+00:00"))
        if nb.tzinfo is None:
            nb = nb.replace(tzinfo=timezone.utc)
        start_at = (nb - timedelta(minutes=max_lead_minutes)).isoformat()
    except Exception:
        # If needed_by isn't ISO, just leave start_at == needed_by;
        # the chef's UI shows the warning.
        pass

    task = {
        "id": uuid.uuid4().hex[:12],
        "source_order_id":      order["id"],
        "producing_outlet_id":  order["producing_outlet_id"],
        "ordering_outlet_id":   order["ordering_outlet_id"],
        "lane":                 order.get("lane"),
        "status":               "scheduled",   # scheduled | active | done | cancelled
        "needed_by":            needed_by,
        "start_at":             start_at,
        "lead_minutes":         max_lead_minutes,
        "lines":                line_tasks,
        "auto_generated":       True,
        "created_at":           _now_iso(),
        "updated_at":           _now_iso(),
    }
    db["commissary_production_tasks"].insert_one(task.copy())
    return task["id"]


@router.get("/production-sheet")
def production_sheet(
    outlet_id: str,
    days_ahead: int = 7,
    include_done: bool = False,
):
    """Live production sheet for a producing kitchen. Returns every
    auto-spawned task keyed off submitted commissary orders, sorted
    by start_at so the chef sees what fires next.

    Each task surfaces:
      - source_order_id        the consuming outlet's request
      - lane                   pastry | banquet
      - start_at, needed_by    wall-clock anchors
      - lead_minutes           total
      - lines[].stages[]       per-line stage chain with status
                                ("pending" | "in_progress" | "done")"""
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).isoformat()
    q: Dict[str, Any] = {"producing_outlet_id": outlet_id,
                         "needed_by": {"$lte": cutoff}}
    if not include_done:
        q["status"] = {"$ne": "done"}
    tasks = list(db["commissary_production_tasks"].find(q, {"_id": 0})
                 .sort("start_at", 1).limit(200))
    return {"ok": True, "outlet_id": outlet_id,
            "total": len(tasks), "tasks": tasks}


class StageStatusUpdate(BaseModel):
    """Per-stage status the chef pings as they progress through a
    task. Updates the embedded stage entry in commissary_production
    _tasks; advances the parent task's status accordingly."""
    line_index: int
    stage_sequence: int
    new_status: str    # "pending" | "in_progress" | "done"


@router.post("/production-sheet/tasks/{task_id}/stage")
def update_stage_status(
    task_id: str,
    body: StageStatusUpdate,
):
    """Mark one stage of one line in a production task as in-progress
    or done. Cascades the parent task's status: when every line's
    every stage is done → task.status = done. When any stage is in
    progress → task.status = active."""
    if body.new_status not in ("pending", "in_progress", "done"):
        raise HTTPException(400,
            "new_status must be pending | in_progress | done")
    task = db["commissary_production_tasks"].find_one(
        {"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(404, "task not found")

    lines = list(task.get("lines") or [])
    if body.line_index < 0 or body.line_index >= len(lines):
        raise HTTPException(400, "line_index out of range")
    line = lines[body.line_index]

    stages = list(line.get("stages") or [])
    matched = False
    for s in stages:
        if s.get("sequence_order") == body.stage_sequence:
            s["status"] = body.new_status
            matched = True
            break
    if not matched:
        raise HTTPException(404, "stage not found on this line")
    line["stages"] = stages
    lines[body.line_index] = line

    # Cascade parent status.
    all_stages = [s for ln in lines for s in (ln.get("stages") or [])]
    if all_stages and all(s.get("status") == "done" for s in all_stages):
        task_status = "done"
    elif any(s.get("status") == "in_progress" for s in all_stages):
        task_status = "active"
    else:
        task_status = task.get("status", "scheduled")

    db["commissary_production_tasks"].update_one(
        {"id": task_id},
        {"$set": {"lines": lines, "status": task_status,
                  "updated_at": _now_iso()}})
    return {"ok": True,
            "task": db["commissary_production_tasks"].find_one(
                {"id": task_id}, {"_id": 0})}


# ─── D16g · Confirm transfer + COGS event stream ─────────────────────────
# When a transfer arrives at the receiving outlet — whether delivered by
# a runner or physically picked up — the chef confirms the actual
# quantity received (which may differ from the ordered qty: over,
# short, or substitution). At that point:
#   1. The order moves to status="delivered" with actual_lines stamped
#   2. The internal_transfers ledger row is written / amended
#   3. Two cogs_events fire: a DEBIT on the ordering outlet (cost up)
#      and a CREDIT on the producing outlet (cost out). The chef's
#      phone tile + Chronos read these to surface the live commissary
#      cost alongside POS sales.
#   4. Any line where actual != ordered carries an adjustment_delta so
#      the overnight finance reconcile can flag it.

class ActualLine(BaseModel):
    """One line of the confirmation. qty_actual may differ from
    qty_ordered for over / short / substitution. reason captures
    the why for audit."""
    product_id: str
    qty_actual: float = Field(..., ge=0)
    adjustment_reason: Optional[str] = None    # "short", "substituted", "extra", etc.


class ConfirmTransferBody(BaseModel):
    pickup_method: str           # "delivered" | "picked_up"
    actual_lines: List[ActualLine]
    confirmed_by_user_id: Optional[str] = None
    confirmed_by_name: Optional[str] = None
    note: Optional[str] = None


def _emit_cogs_events(*,
                      order_id: str,
                      ordering_outlet_id: str,
                      producing_outlet_id: str,
                      lane: str,
                      lines: List[Dict[str, Any]],
                      total_amount: float,
                      tenant_id: str = "default") -> List[Dict[str, Any]]:
    """Write the two-sided COGS entries that close the transfer.
    Idempotent on (source_id, outlet_id) — re-calling on the same
    delivery doesn't double-post.

    DEBIT on the receiving outlet  → cost goes UP
    CREDIT on the producing outlet → cost goes OUT (transferred)

    Internal transfers cross at cost (no internal margin) so the
    debit and credit amounts match. The chef's phone tile sums today's
    debits per outlet to show 'commissary cost so far today.'"""
    events_out: List[Dict[str, Any]] = []
    if total_amount <= 0:
        return events_out
    now = _now_iso()

    for outlet_id, direction, gl in (
        (ordering_outlet_id,  "debit",  "5001"),   # Cost of Food Sales
        (producing_outlet_id, "credit", "5001"),
    ):
        # Idempotent guard: don't emit twice for the same source+outlet.
        existing = db["cogs_events"].find_one(
            {"source_id": order_id, "outlet_id": outlet_id,
             "source": "internal_transfer"}, {"_id": 0})
        if existing:
            events_out.append(existing)
            continue
        ev = {
            "id": uuid.uuid4().hex[:12],
            "tenant_id": tenant_id,
            "outlet_id": outlet_id,
            "direction": direction,
            "source": "internal_transfer",
            "source_id": order_id,
            "lane": lane,
            "lines": lines,
            "amount": float(total_amount),
            "gl_code": gl,
            "occurred_at": now,
            "reconciled_at": None,
        }
        db["cogs_events"].insert_one(ev.copy())
        events_out.append(ev)
    return events_out


def _emit_cogs_adjustment(*,
                           order_id: str,
                           outlet_id: str,
                           direction: str,
                           amount: float,
                           reason: str,
                           tenant_id: str = "default") -> Dict[str, Any]:
    """Emit a per-outlet COGS adjustment for an over/short/sub.
    Always inserts a new row (not idempotent) — the reason text plus
    timestamp distinguishes amendments from the original transfer."""
    ev = {
        "id": uuid.uuid4().hex[:12],
        "tenant_id": tenant_id,
        "outlet_id": outlet_id,
        "direction": direction,
        "source": "internal_transfer_adjustment",
        "source_id": order_id,
        "amount": float(amount),
        "reason": reason,
        "gl_code": "5001",
        "occurred_at": _now_iso(),
        "reconciled_at": None,
    }
    db["cogs_events"].insert_one(ev.copy())
    return ev


@router.post("/orders/{order_id}/confirm-transfer")
def confirm_transfer(
    order_id: str,
    body: ConfirmTransferBody,
):
    """Receiving outlet confirms the transfer arrived. Records actual
    quantities (may differ from ordered), advances the order to
    delivered, writes the internal_transfers ledger, and emits the
    two-sided COGS events that hit Aurium / Chronos / the chef's
    phone in real time.

    Idempotent on the order: if already delivered, returns the prior
    confirmation rather than re-emitting events. Use the adjustment
    endpoint (D16g extension) for amendments after delivery."""
    if body.pickup_method not in ("delivered", "picked_up"):
        raise HTTPException(400,
            "pickup_method must be 'delivered' | 'picked_up'")

    order = db["commissary_orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "order not found")

    if order.get("status") == "delivered":
        # Idempotent re-confirmation — return existing without
        # re-emitting events.
        return {"ok": True, "order": order, "duplicate": True,
                "events": []}

    if order.get("status") not in ("submitted", "in_production",
                                    "ready", "in_transit"):
        raise HTTPException(400,
            f"cannot confirm transfer from status={order.get('status')}")

    # Build actual_lines map keyed by product_id.
    actuals: Dict[str, ActualLine] = {a.product_id: a
                                       for a in body.actual_lines}

    # Reconcile against ordered lines.
    confirmed_lines: List[Dict[str, Any]] = []
    actual_total = 0.0
    deltas: List[Dict[str, Any]] = []
    for line in (order.get("lines") or []):
        a = actuals.get(line["product_id"])
        qty_actual = float(a.qty_actual) if a else float(line.get("qty") or 0)
        unit_cost = float(line.get("unit_cost") or 0)
        actual_total += qty_actual * unit_cost
        delta_qty = qty_actual - float(line.get("qty") or 0)
        confirmed = {
            **line,
            "qty_actual": qty_actual,
            "qty_ordered": line.get("qty"),
            "delta_qty": delta_qty,
            "actual_line_total": round(qty_actual * unit_cost, 2),
            "adjustment_reason": (a.adjustment_reason if a else None),
        }
        confirmed_lines.append(confirmed)
        if abs(delta_qty) > 1e-6:
            deltas.append({
                "product_id": line["product_id"],
                "product_name": line.get("product_name"),
                "qty_ordered": line.get("qty"),
                "qty_actual":  qty_actual,
                "delta_qty":   delta_qty,
                "delta_amount": round(delta_qty * unit_cost, 2),
                "reason": (a.adjustment_reason if a else "unmatched"),
            })
    actual_total = round(actual_total, 2)

    # Write the internal_transfers ledger (idempotent on source_order_id).
    if not db["internal_transfers"].find_one(
        {"source_order_id": order_id}, {"_id": 0}
    ):
        db["internal_transfers"].insert_one({
            "id": uuid.uuid4().hex[:12],
            "source_order_id": order_id,
            "lane": order.get("lane"),
            "from_outlet_id": order["producing_outlet_id"],
            "to_outlet_id":   order["ordering_outlet_id"],
            "lines": confirmed_lines,
            "total_cost": actual_total,
            "pickup_method": body.pickup_method,
            "delivered_at": _now_iso(),
            "delivered_by_user_id": body.confirmed_by_user_id,
            "delivered_by_name":   body.confirmed_by_name,
            "deltas_count": len(deltas),
        })

    # Update the order. Audit log records the confirmation.
    audit = list(order.get("audit_log") or []) + [{
        "at": _now_iso(),
        "user_id": body.confirmed_by_user_id,
        "user_name": body.confirmed_by_name,
        "action": f"confirm-transfer:{body.pickup_method}",
        "note": body.note or "",
        "deltas": len(deltas),
    }]
    db["commissary_orders"].update_one(
        {"id": order_id},
        {"$set": {
            "status": "delivered",
            "actual_lines": confirmed_lines,
            "actual_total_cost": actual_total,
            "pickup_method": body.pickup_method,
            "delivered_at":  _now_iso(),
            "delivered_by_user_id": body.confirmed_by_user_id,
            "delivered_by_name":   body.confirmed_by_name,
            "delta_count": len(deltas),
            "audit_log": audit,
            "updated_at": _now_iso(),
        }})

    # Emit COGS events that hit Aurium / Chronos / the chef's phone.
    events = _emit_cogs_events(
        order_id=order_id,
        ordering_outlet_id=order["ordering_outlet_id"],
        producing_outlet_id=order["producing_outlet_id"],
        lane=order.get("lane") or "",
        lines=confirmed_lines,
        total_amount=actual_total,
    )

    fresh = db["commissary_orders"].find_one({"id": order_id}, {"_id": 0})
    return {"ok": True, "order": fresh,
            "events": events,
            "deltas": deltas,
            "actual_total": actual_total}


class AmendTransferBody(BaseModel):
    """Used after delivery when a discrepancy is found late (e.g.
    'we counted 12 but found 11 cheesecakes when we plated dinner').
    Posts an adjustment delta to the cogs_events stream without
    rewriting history."""
    product_id: str
    qty_correction: float       # +1 = found one extra; -1 = one short
    reason: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None


@router.post("/orders/{order_id}/amend")
def amend_transfer(
    order_id: str,
    body: AmendTransferBody,
):
    """Post-delivery amendment. Order status stays delivered; the
    cogs_events stream gets two adjustment events (one debit on the
    receiving outlet, one credit on the producing outlet) for the
    correction. Original line totals on the order are preserved
    so the audit shows what was originally confirmed vs. what
    showed up later."""
    order = db["commissary_orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "order not found")
    if order.get("status") != "delivered":
        raise HTTPException(400,
            "amend only valid after delivery; use confirm-transfer first")

    line = next((l for l in (order.get("actual_lines") or [])
                 if l.get("product_id") == body.product_id), None)
    if not line:
        raise HTTPException(404,
            f"product {body.product_id} not on this order")

    delta_amount = round(float(body.qty_correction) *
                          float(line.get("unit_cost") or 0), 2)

    # Direction depends on sign of the correction:
    #   +qty (found extra)   → receiver cost UP, producer cost MORE OUT
    #   -qty (was short)     → receiver cost DOWN (refund), producer pulls back
    if delta_amount >= 0:
        debit_outlet  = order["ordering_outlet_id"]
        credit_outlet = order["producing_outlet_id"]
        amount = delta_amount
    else:
        debit_outlet  = order["producing_outlet_id"]   # producer recovers
        credit_outlet = order["ordering_outlet_id"]   # receiver gets the refund
        amount = abs(delta_amount)

    debit_ev = _emit_cogs_adjustment(
        order_id=order_id, outlet_id=debit_outlet,
        direction="debit", amount=amount, reason=body.reason)
    credit_ev = _emit_cogs_adjustment(
        order_id=order_id, outlet_id=credit_outlet,
        direction="credit", amount=amount, reason=body.reason)

    # Stamp on the order audit
    audit = list(order.get("audit_log") or []) + [{
        "at": _now_iso(),
        "user_id": body.user_id,
        "user_name": body.user_name,
        "action": "amend",
        "note": body.reason,
        "product_id": body.product_id,
        "qty_correction": body.qty_correction,
        "delta_amount": delta_amount,
    }]
    db["commissary_orders"].update_one(
        {"id": order_id},
        {"$set": {"audit_log": audit, "updated_at": _now_iso()}})

    return {"ok": True, "order_id": order_id,
            "delta_amount": delta_amount,
            "events": [debit_ev, credit_ev]}


# ─── Live tile for chef phone / Chronos dashboard ───────────────────────

@router.get("/cogs/today")
def cogs_today(outlet_id: str,
                x_tenant_id: Optional[str] = Header(None)):
    """The day-view tile. Sum today's commissary debits and credits
    for one outlet so the chef sees their commissary cost run alongside
    POS sales as checks close.

    D27 · tenant_id REQUIRED in the query — without it, two tenants
    sharing the outlet_id namespace would see each other's COGS.
    Header > "default" precedence so single-tenant deployments still
    work with no header set.

    Used by:
      - MyEcho phone app (chef tile, refresh-on-pull)
      - Chronos dashboard (live cost line for today)"""
    from datetime import datetime, timezone
    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00")
    tenant_id = (x_tenant_id or "default").strip().lower()
    rows = list(db["cogs_events"].find(
        {"tenant_id": tenant_id,
         "outlet_id": outlet_id,
         "occurred_at": {"$gte": today_start}},
        {"_id": 0}))
    debit  = sum(float(r["amount"]) for r in rows if r["direction"] == "debit")
    credit = sum(float(r["amount"]) for r in rows if r["direction"] == "credit")
    return {"ok": True, "outlet_id": outlet_id,
            "tenant_id": tenant_id,
            "as_of": _now_iso(),
            "debit_total":  round(debit, 2),
            "credit_total": round(credit, 2),
            "net":          round(debit - credit, 2),
            "event_count":  len(rows),
            "events":       rows[-20:]}   # most recent 20 for the feed


@router.get("/cogs/events")
def cogs_events(
    outlet_id: Optional[str] = None,
    since: Optional[str] = None,
    limit: int = 200,
    x_tenant_id: Optional[str] = Header(None),
):
    """Generic feed used by the overnight reconciler + auditors.
    D27 · always tenant-filtered."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if outlet_id:
        q["outlet_id"] = outlet_id
    if since:
        q["occurred_at"] = {"$gte": since}
    rows = list(db["cogs_events"].find(q, {"_id": 0})
                .sort("occurred_at", -1).limit(max(1, min(1000, limit))))
    return {"ok": True, "total": len(rows), "events": rows}


# ─── Overnight reconciliation hook ──────────────────────────────────────

class ReconcileBody(BaseModel):
    """The nightly finance batch calls this to mark events as
    reconciled (visible to the auditor) or to flag mismatches for
    a human. Idempotent: re-running on the same window is safe."""
    until: str                         # ISO; reconcile everything on/before
    operator: Optional[str] = None     # "nightly-finance-batch", etc.


@router.post("/cogs/reconcile")
def reconcile_cogs(
    body: ReconcileBody,
    x_admin_token: Optional[str] = Header(None),
):
    """Reconcile every cogs_event up to `until`. Walks the events,
    pairs debits with credits by source_id, marks both reconciled.
    Returns counts: {paired, orphaned_debits, orphaned_credits}.

    Orphans flag a problem the auditor needs to look at — a debit
    without a matching credit means money 'appeared' in COGS without
    a transfer source."""
    _require_admin(x_admin_token)

    events = list(db["cogs_events"].find(
        {"occurred_at": {"$lte": body.until},
         "reconciled_at": None},
        {"_id": 0}))
    by_source: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}
    for e in events:
        bucket = by_source.setdefault(e["source_id"],
                                       {"debit": [], "credit": []})
        bucket[e["direction"]].append(e)

    paired = 0
    orphan_d = []
    orphan_c = []
    for src, sides in by_source.items():
        d_amt = sum(e["amount"] for e in sides["debit"])
        c_amt = sum(e["amount"] for e in sides["credit"])
        if abs(d_amt - c_amt) < 0.01 and sides["debit"] and sides["credit"]:
            for e in sides["debit"] + sides["credit"]:
                db["cogs_events"].update_one(
                    {"id": e["id"]},
                    {"$set": {"reconciled_at": _now_iso(),
                              "reconciled_by": body.operator
                                                or "nightly-batch"}})
                paired += 1
        else:
            orphan_d.extend(sides["debit"])
            orphan_c.extend(sides["credit"])

    return {"ok": True,
            "until": body.until,
            "paired_events": paired,
            "orphaned_debits":  len(orphan_d),
            "orphaned_credits": len(orphan_c),
            "orphan_sources": [
                {"source_id": e["source_id"], "outlet_id": e["outlet_id"],
                 "direction": e["direction"], "amount": e["amount"]}
                for e in (orphan_d + orphan_c)
            ]}
