"""
D16c · BEO → Production generator.

Architectural keystone tying the D16 thread together. When a BEO is
created or updated, this module:

  1. Reads the BEO (event_at, covers, menu items)
  2. Maps each menu item to a commissary product
       - by item.recipe_id matching commissary_products.recipe_id
       - or by item.slug matching commissary_products.slug
       - or by item.commissary_product_id direct link
  3. For each match, drafts a commissary order with
       needed_by = event_at - total_lead_time
     where total_lead_time is read from the recipe stages (D16b)
     when present, the static lead_time_hours otherwise.
  4. Splits drafts by producing kitchen (pastry / banquet) honoring
     the single-producer rule from D16a.
  5. Stamps `beo_id` on every order so the consuming-outlet's COGS
     events trace back to the source event during reconciliation.
  6. Returns a plan. By default the plan is DRAFT — chef reviews,
     approves, and only then are orders submitted (which auto-spawns
     production tasks via D16f). Human-in-the-loop guardrail.

Idempotent on `beo_id` — re-running for the same BEO replaces the
prior plan rather than duplicating drafts. Edits to the BEO that
cause a regen mark the previous plan as superseded so the audit
trail shows what changed.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/chronos/beo", tags=["beo-production"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Schemas ────────────────────────────────────────────────────────────

class BEOMenuItem(BaseModel):
    """One menu line on the BEO. The mapper looks for any of these
    three keys to find the commissary product. Caller passes whatever
    the BEO source gave."""
    recipe_id: Optional[str] = None
    slug: Optional[str] = None
    commissary_product_id: Optional[str] = None
    item_name: str
    qty_per_cover: float = Field(1.0, ge=0,
        description="How many of this item per cover (1.0 = each "
                    "guest gets one; 0.25 = a sheet of 4)")


class GeneratePlanRequest(BaseModel):
    beo_id: str
    event_at: str               # ISO datetime when the event fires
    covers: int = Field(..., ge=1)
    menu: List[BEOMenuItem]
    consuming_outlet_id: str    # the outlet running the event (ordering side)
    note: Optional[str] = None
    auto_submit: bool = False   # default DRAFT — chef approves before submit
    requested_by_user_id: Optional[str] = None
    requested_by_name: Optional[str] = None


class ApprovePlanRequest(BaseModel):
    approved_by_user_id: Optional[str] = None
    approved_by_name: Optional[str] = None
    note: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────────────────────

def _find_product(item: BEOMenuItem) -> Optional[Dict[str, Any]]:
    """Resolve a BEO menu line to a commissary_products row.
    Direct id wins; then recipe_id; then slug; then None."""
    if item.commissary_product_id:
        p = db["commissary_products"].find_one(
            {"id": item.commissary_product_id, "active": True}, {"_id": 0})
        if p:
            return p
    if item.recipe_id:
        p = db["commissary_products"].find_one(
            {"recipe_id": item.recipe_id, "active": True}, {"_id": 0})
        if p:
            return p
    if item.slug:
        p = db["commissary_products"].find_one(
            {"slug": item.slug, "active": True}, {"_id": 0})
        if p:
            return p
    return None


def _lead_minutes_for(product: Dict[str, Any]) -> int:
    """Stage chain wins; static lead_time_hours fallback."""
    rid = product.get("recipe_id")
    if rid:
        row = db["recipe_stages"].find_one({"recipe_id": rid}, {"_id": 0})
        if row and row.get("stages"):
            stages = sorted(row["stages"],
                            key=lambda s: s.get("sequence_order") or 0)
            total = 0
            prev_overlap = False
            prev_passive = 0
            for s in stages:
                am = int(s.get("active_minutes") or 0)
                pm = int(s.get("passive_minutes") or 0)
                if prev_overlap and prev_passive >= am:
                    total += pm
                else:
                    total += am + pm
                prev_overlap = bool(s.get("can_overlap_with_next"))
                prev_passive = pm
            return total
    return (int(product.get("lead_time_hours") or 0) * 60
            + int(product.get("preferment_hours") or 0) * 60)


def _approval_for(outlet_id: str, product_id: str) -> Optional[Dict[str, Any]]:
    return db["commissary_approvals"].find_one(
        {"outlet_id": outlet_id, "product_id": product_id,
         "is_active": True}, {"_id": 0})


# ─── Endpoints ──────────────────────────────────────────────────────────

@router.post("/generate-plan")
def generate_plan(body: GeneratePlanRequest):
    """Read a BEO and draft a production plan. Returns:
      {
        plan_id, beo_id, drafts: [order, ...],
        unmapped_items: [{item_name, reason}],   ← items with no
                                                  commissary product
                                                  match — chef must
                                                  resolve manually
        unapproved_items: [...],                 ← items where the
                                                  consuming outlet
                                                  is not approved
        rollup: { total_orders, total_units,
                  earliest_start, latest_start },
        status: "draft" | "submitted",
      }

    Idempotent on beo_id — re-running supersedes the prior plan.
    The previous plan_id is preserved with status=superseded so a
    reviewer can see what changed when the BEO was edited."""
    if not body.menu:
        raise HTTPException(400, "BEO must have at least one menu item")

    # Mark any prior plan for this BEO as superseded.
    prior = db["beo_production_plans"].find_one(
        {"beo_id": body.beo_id, "status": {"$in": ["draft", "submitted"]}},
        {"_id": 0})
    if prior:
        db["beo_production_plans"].update_one(
            {"id": prior["id"]},
            {"$set": {"status": "superseded",
                      "superseded_at": _now_iso(),
                      "updated_at": _now_iso()}})

    try:
        event_dt = datetime.fromisoformat(str(body.event_at).replace("Z", "+00:00"))
        if event_dt.tzinfo is None:
            event_dt = event_dt.replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "event_at must be ISO 8601 datetime")

    drafts: List[Dict[str, Any]] = []
    unmapped: List[Dict[str, Any]] = []
    unapproved: List[Dict[str, Any]] = []
    by_producer: Dict[str, List[Dict[str, Any]]] = {}

    for item in body.menu:
        prod = _find_product(item)
        if not prod:
            unmapped.append({
                "item_name": item.item_name,
                "qty_per_cover": item.qty_per_cover,
                "reason": "no commissary product matches recipe_id / slug / id",
            })
            continue

        approval = _approval_for(body.consuming_outlet_id, prod["id"])
        if not approval:
            unapproved.append({
                "item_name":  item.item_name,
                "product_id": prod["id"],
                "reason": (f"{body.consuming_outlet_id} is not approved "
                           f"to order {prod['name']}"),
            })
            continue

        # Quantity = covers × per-cover yield.  Round up — better one
        # extra slice on a tray than a guest going without.
        qty_total = float(body.covers) * float(item.qty_per_cover)
        qty_total = float(int(qty_total + 0.5))  # round half-up

        # Lead time → start time
        lead_min = _lead_minutes_for(prod)
        start_at = (event_dt - timedelta(minutes=lead_min)).isoformat()

        # Cap check: respect approval.max_units_per_day if set
        cap = approval.get("max_units_per_day")
        capped = False
        if cap is not None and qty_total > cap:
            qty_total = float(cap)
            capped = True

        line = {
            "product_id":   prod["id"],
            "product_name": prod["name"],
            "unit":         prod.get("unit", "each"),
            "qty":          qty_total,
            "qty_per_cover": float(item.qty_per_cover),
            "unit_cost":    float(prod.get("unit_cost") or 0),
            "line_total":   round(qty_total * float(prod.get("unit_cost") or 0), 2),
            "lead_minutes": lead_min,
            "capped_to_daily_max": capped,
        }
        producer = prod["producing_outlet_id"]
        by_producer.setdefault(producer, []).append({
            "line": line, "lane": prod["lane"], "start_at": start_at,
        })

    # Build one draft order per producing kitchen (single-producer rule)
    for producer, entries in by_producer.items():
        lines = [e["line"] for e in entries]
        lane = entries[0]["lane"]
        # earliest start across the lines drives needed_by anchor
        earliest_start = min(e["start_at"] for e in entries)
        total_cost = round(sum(l["line_total"] for l in lines), 2)
        order_doc = {
            "id": uuid.uuid4().hex[:12],
            "lane": lane,
            "ordering_outlet_id":  body.consuming_outlet_id,
            "producing_outlet_id": producer,
            "needed_by": body.event_at,
            "earliest_start_at": earliest_start,
            "status": "draft",
            "lines": lines,
            "total_cost": total_cost,
            "audit_log": [{
                "at": _now_iso(),
                "user_id":   body.requested_by_user_id,
                "user_name": body.requested_by_name,
                "action":    "draft",
                "note": f"auto-generated from BEO {body.beo_id} "
                        f"({body.covers} covers, {len(lines)} items)",
            }],
            "production_task_id": None,
            "beo_id": body.beo_id,
            "auto_generated": True,
            "ordered_by_user_id":  body.requested_by_user_id,
            "ordered_by_name":     body.requested_by_name,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        db["commissary_orders"].insert_one(order_doc.copy())
        drafts.append(order_doc)

    # Roll-up
    total_units = sum(l["qty"] for d in drafts for l in d["lines"])
    earliest_start = min((d["earliest_start_at"] for d in drafts),
                          default=body.event_at)
    latest_start = max((d["earliest_start_at"] for d in drafts),
                        default=body.event_at)

    plan_doc = {
        "id": uuid.uuid4().hex[:12],
        "beo_id":              body.beo_id,
        "event_at":            body.event_at,
        "covers":              body.covers,
        "consuming_outlet_id": body.consuming_outlet_id,
        "drafts":              drafts,
        "draft_order_ids":     [d["id"] for d in drafts],
        "unmapped_items":      unmapped,
        "unapproved_items":    unapproved,
        "rollup": {
            "total_orders":   len(drafts),
            "items_mapped":   sum(len(d["lines"]) for d in drafts),
            "items_unmapped": len(unmapped),
            "items_unapproved": len(unapproved),
            "total_units":    total_units,
            "total_cost":     round(sum(d["total_cost"] for d in drafts), 2),
            "earliest_start": earliest_start,
            "latest_start":   latest_start,
        },
        "status": "draft",
        "auto_submit_requested": bool(body.auto_submit),
        "requested_by_user_id":  body.requested_by_user_id,
        "requested_by_name":     body.requested_by_name,
        "note":  body.note or "",
        "audit_log": [{
            "at": _now_iso(),
            "user_id":   body.requested_by_user_id,
            "user_name": body.requested_by_name,
            "action":    "generated",
            "note":      body.note or "",
        }],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    db["beo_production_plans"].insert_one(plan_doc.copy())

    # D18 · publish to the central audit log + chef approval inbox
    # so the chef sees this BEO plan in the unified inbox alongside
    # auto-orders, flex-labor recs, and knowledge-distill items.
    try:
        from routes.audit_log import emit_audit, create_pending_approval
        emit_audit(
            module="beo-production",
            action="generate",
            entity_type="beo_plan", entity_id=plan_doc["id"],
            user_id=body.requested_by_user_id,
            user_name=body.requested_by_name,
            summary=(f"BEO {body.beo_id}: {body.covers} covers, "
                      f"{len(drafts)} draft order(s), "
                      f"${plan_doc['rollup']['total_cost']:.2f}"),
            metadata={"beo_id": body.beo_id, "covers": body.covers,
                      "outlet_id": body.consuming_outlet_id})
        # Only enqueue an approval if NOT auto-submitted (auto-submit
        # bypasses the chef gate by definition).
        if not body.auto_submit and drafts:
            create_pending_approval(
                kind="beo_plan", entity_id=plan_doc["id"],
                outlet_id=body.consuming_outlet_id,
                summary=(f"BEO {body.beo_id} — {body.covers} covers — "
                         f"{len(drafts)} order(s), "
                         f"${plan_doc['rollup']['total_cost']:.2f}"),
                urgency=("high" if (plan_doc['rollup'].get('items_unmapped') or 0) > 0
                          else "normal"),
                source_module="beo-production",
                payload={"beo_id": body.beo_id,
                         "draft_order_ids": plan_doc["draft_order_ids"],
                         "items_unmapped": plan_doc["rollup"].get("items_unmapped"),
                         "items_unapproved": plan_doc["rollup"].get("items_unapproved")},
                requested_by_user_id=body.requested_by_user_id,
                requested_by_name=body.requested_by_name)
    except Exception:
        pass   # never let inbox issues block plan generation

    # Optional auto-submit (chef opts in; default is human review)
    if body.auto_submit and drafts:
        for d in drafts:
            db["commissary_orders"].update_one(
                {"id": d["id"]},
                {"$set": {"status": "submitted",
                          "audit_log": list(d.get("audit_log") or []) + [{
                              "at": _now_iso(),
                              "user_id":   body.requested_by_user_id,
                              "user_name": body.requested_by_name,
                              "action":    "submitted",
                              "note":      "auto-submitted via BEO plan",
                          }],
                          "updated_at": _now_iso()}})
        db["beo_production_plans"].update_one(
            {"id": plan_doc["id"]},
            {"$set": {"status": "submitted",
                      "submitted_at": _now_iso(),
                      "updated_at": _now_iso()}})
        plan_doc["status"] = "submitted"

    return {"ok": True, **plan_doc}


@router.post("/plans/{plan_id}/approve")
def approve_plan(plan_id: str, body: ApprovePlanRequest):
    """Chef approves a draft plan → submits every draft order.
    Idempotent: re-approving a submitted plan is a no-op."""
    plan = db["beo_production_plans"].find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "plan not found")
    if plan.get("status") == "submitted":
        return {"ok": True, "plan_id": plan_id, "duplicate": True,
                "submitted_orders": plan.get("draft_order_ids") or []}
    if plan.get("status") == "superseded":
        raise HTTPException(400,
            "plan was superseded by a newer generation; approve the latest")

    submitted_ids: List[str] = []
    for oid in plan.get("draft_order_ids") or []:
        db["commissary_orders"].update_one(
            {"id": oid, "status": "draft"},
            {"$set": {"status": "submitted",
                      "audit_log_entry_pending": {
                          "at": _now_iso(),
                          "user_id":   body.approved_by_user_id,
                          "user_name": body.approved_by_name,
                          "action":    "submitted",
                          "note":      f"plan {plan_id} approved",
                      },
                      "updated_at": _now_iso()}})
        submitted_ids.append(oid)

    audit = list(plan.get("audit_log") or []) + [{
        "at": _now_iso(),
        "user_id":   body.approved_by_user_id,
        "user_name": body.approved_by_name,
        "action":    "approved",
        "note":      body.note or "",
        "orders_submitted": len(submitted_ids),
    }]
    db["beo_production_plans"].update_one(
        {"id": plan_id},
        {"$set": {"status": "submitted",
                  "submitted_at": _now_iso(),
                  "approved_by_user_id": body.approved_by_user_id,
                  "approved_by_name":   body.approved_by_name,
                  "audit_log": audit,
                  "updated_at": _now_iso()}})

    # D18 · close the inbox row + cross-module audit
    try:
        from routes.audit_log import emit_audit, resolve_pending_approval
        resolve_pending_approval(
            kind="beo_plan", entity_id=plan_id, decision="approved",
            decided_by_user_id=body.approved_by_user_id,
            decided_by_name=body.approved_by_name,
            note=body.note)
        emit_audit(
            module="beo-production",
            action="approve",
            entity_type="beo_plan", entity_id=plan_id,
            user_id=body.approved_by_user_id,
            user_name=body.approved_by_name,
            summary=f"approved {len(submitted_ids)} order(s)",
            metadata={"orders_submitted": submitted_ids})
    except Exception:
        pass

    return {"ok": True, "plan_id": plan_id,
            "submitted_orders": submitted_ids}


@router.get("/plans/{beo_id}")
def get_plans_for_beo(beo_id: str):
    """List every plan associated with a BEO (current + superseded)
    so the chef can see the edit history when the BEO changes."""
    plans = list(db["beo_production_plans"].find(
        {"beo_id": beo_id}, {"_id": 0}).sort("created_at", -1).limit(20))
    return {"ok": True, "beo_id": beo_id,
            "total": len(plans), "plans": plans}
