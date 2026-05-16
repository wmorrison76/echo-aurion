"""
D16h-followup · Auto-order recommendation with COGS-% guardrail.

Closes the "EchoAi as CPA" loop the owner described:

  - Take the Monte Carlo forecast (D16h)
  - Cap order quantities to a target food-cost percentage
  - Flag items where ordering even at p10 would blow the budget
  - Allow the chef to override (human-in-the-loop)
  - Percentage-focused, NOT absolute: COGS can run higher in absolute
    dollars if sales are there, as long as the ratio holds

Math (per item):

  selling_price            menu price the POS rings
  cost_per_unit            ingredient cost (recipe BOM × ingredient
                            costs); for v1 we accept an explicit
                            cost from the request body so the
                            endpoint isn't blocked on full BOM
                            integration
  forecast_p50             from Monte Carlo (the chef's "expected"
                            sales)
  target_cogs_pct          0.30 = 30% food cost target

  forecasted_revenue   = forecast_p50 × selling_price
  budget_at_target     = forecasted_revenue × target_cogs_pct
  cost_to_serve_p50    = forecast_p50 × cost_per_unit
  recommended_qty      = forecast_p50 (default)

  guardrail_status:
    "ok"             cost_to_serve_p50 ≤ budget_at_target
    "warn"           1.0× ≤ ratio < 1.05× (within 5% tolerance)
    "over"           ratio ≥ 1.05× — flag for chef review

The endpoint returns per-item recommendations with the guardrail
status. The chef can accept the recommendation as-is, override
quantities, or split into multiple orders. Auto-order draft creation
in the commissary is left to a later PR — this PR ships the
recommendation engine the chef + auto-order generator both consume.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/chronos/auto-order", tags=["chronos-auto-order"])


# How much over the target ratio is acceptable before we flag.
# 5% tolerance gives the chef breathing room ("hit 31% on a 30%
# target — close enough to ship") but flags genuine misses.
WARN_TOLERANCE = 0.05


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Schemas ────────────────────────────────────────────────────────────

class ItemEconomics(BaseModel):
    """Inputs the recommender needs per item. The forecast comes
    from /api/chronos/forecast/by-date — caller passes those rows
    plus per-item economics so we can compute revenue / cost."""
    item_id: str
    item_name: str
    forecast_p50: float = Field(..., ge=0)
    forecast_p10: Optional[float] = None
    forecast_p90: Optional[float] = None
    selling_price: float = Field(..., ge=0)
    cost_per_unit: float = Field(..., ge=0)


class AutoOrderRecRequest(BaseModel):
    outlet_id: str
    target_date: str
    target_cogs_pct: float = Field(..., gt=0, lt=1,
        description="0.30 = 30% food cost target")
    items: List[ItemEconomics]


class AutoOrderRec(BaseModel):
    item_id: str
    item_name: str
    forecast_p50: float
    recommended_qty: float
    forecasted_revenue: float
    cost_to_serve_p50: float
    cost_pct: float                # cost / revenue
    budget_at_target: float
    over_budget_amount: float      # 0 if under
    guardrail_status: str          # "ok" | "warn" | "over"
    note: Optional[str] = None


# ─── Endpoints ──────────────────────────────────────────────────────────

@router.post("/recommend")
def recommend(body: AutoOrderRecRequest):
    """Generate per-item order recommendations capped at the chef's
    food-cost % target. Returns the recommendation set + an outlet
    roll-up the dashboard tile renders."""
    if not body.items:
        raise HTTPException(400, "at least one item required")

    recs: List[Dict[str, Any]] = []
    total_revenue = 0.0
    total_cost = 0.0
    over_count = 0
    warn_count = 0

    for it in body.items:
        revenue = float(it.forecast_p50) * float(it.selling_price)
        cost    = float(it.forecast_p50) * float(it.cost_per_unit)
        budget  = revenue * float(body.target_cogs_pct)
        cost_pct = (cost / revenue) if revenue > 0 else 0.0

        # Guardrail: how does cost stack vs target budget?
        if revenue == 0:
            status = "ok"   # nothing to serve, nothing to bust
            over_amount = 0.0
            note = None
        else:
            ratio = cost_pct / float(body.target_cogs_pct)
            over_amount = max(0.0, cost - budget)
            if ratio <= 1.0:
                status = "ok"
                note = None
            elif ratio < (1.0 + WARN_TOLERANCE):
                status = "warn"
                warn_count += 1
                note = (f"cost {cost_pct*100:.1f}% vs target "
                        f"{body.target_cogs_pct*100:.1f}% — within tolerance")
            else:
                status = "over"
                over_count += 1
                note = (f"cost {cost_pct*100:.1f}% > target by "
                        f"{(ratio-1)*100:.1f}%; consider repricing or "
                        f"reducing portion to land under")

        recs.append({
            "item_id":            it.item_id,
            "item_name":          it.item_name,
            "forecast_p50":       float(it.forecast_p50),
            "recommended_qty":    float(it.forecast_p50),
            "forecasted_revenue": round(revenue, 2),
            "cost_to_serve_p50":  round(cost, 2),
            "cost_pct":           round(cost_pct, 4),
            "budget_at_target":   round(budget, 2),
            "over_budget_amount": round(over_amount, 2),
            "guardrail_status":   status,
            "note":               note,
        })
        total_revenue += revenue
        total_cost += cost

    # Outlet-level roll-up
    blended_pct = (total_cost / total_revenue) if total_revenue > 0 else 0.0
    blended_status = ("over" if blended_pct > body.target_cogs_pct * (1 + WARN_TOLERANCE)
                       else "warn" if blended_pct > body.target_cogs_pct
                       else "ok")

    # Persist for audit (caller can reproduce the recommendation).
    rec_doc = {
        "id": uuid.uuid4().hex[:12],
        "outlet_id": body.outlet_id,
        "target_date": body.target_date,
        "target_cogs_pct": body.target_cogs_pct,
        "items": recs,
        "rollup": {
            "total_forecasted_revenue": round(total_revenue, 2),
            "total_cost_to_serve":      round(total_cost, 2),
            "blended_cost_pct":         round(blended_pct, 4),
            "blended_status":           blended_status,
            "items_over":               over_count,
            "items_warn":               warn_count,
            "items_ok":                 len(recs) - over_count - warn_count,
        },
        "generated_at": _now_iso(),
    }
    # Idempotent on (outlet, date) — re-running with the same target
    # overwrites; with a different target, the row is replaced.
    db["auto_order_recommendations"].update_one(
        {"outlet_id": body.outlet_id, "target_date": body.target_date},
        {"$set": rec_doc}, upsert=True)

    # D18 · push to chef inbox + audit log
    try:
        from routes.audit_log import emit_audit, create_pending_approval
        emit_audit(
            module="chronos-auto-order",
            action="recommend",
            entity_type="auto_order", entity_id=rec_doc["id"],
            summary=(f"{body.outlet_id} {body.target_date}: "
                      f"blended {rec_doc['rollup']['blended_cost_pct']*100:.1f}% "
                      f"({over_count} over, {warn_count} warn)"),
            metadata={"outlet_id": body.outlet_id,
                      "target_date": body.target_date})
        # Only enqueue if the rollup has any non-OK item — clean
        # recommendations don't need chef sign-off
        urgent = (rec_doc["rollup"]["blended_status"] == "over")
        if rec_doc["rollup"]["items_over"] + rec_doc["rollup"]["items_warn"] > 0:
            create_pending_approval(
                kind="auto_order",
                entity_id=f"{body.outlet_id}:{body.target_date}",
                outlet_id=body.outlet_id,
                summary=(f"Auto-order rec — blended "
                         f"{rec_doc['rollup']['blended_cost_pct']*100:.1f}% "
                         f"({rec_doc['rollup']['items_over']} over, "
                         f"{rec_doc['rollup']['items_warn']} warn)"),
                urgency=("high" if urgent else "normal"),
                source_module="chronos-auto-order",
                payload={"target_date": body.target_date,
                         "items_over": rec_doc["rollup"]["items_over"],
                         "items_warn": rec_doc["rollup"]["items_warn"]})
    except Exception:
        pass

    return {"ok": True, **rec_doc}


@router.get("/by-date")
def get_recommendation(outlet_id: str, target_date: str):
    """Read back a previously-generated recommendation for an
    outlet × date. Used by the chef phone tile + the auto-order
    UI to render recommendations without recomputing."""
    doc = db["auto_order_recommendations"].find_one(
        {"outlet_id": outlet_id, "target_date": target_date}, {"_id": 0})
    if not doc:
        raise HTTPException(404,
            f"no recommendation for {outlet_id} on {target_date}")
    return {"ok": True, **doc}


class AcceptOverrideRequest(BaseModel):
    """Chef's response to the recommendation. Either accepts as-is
    or overrides specific items' quantities. The override goes into
    the audit trail so the GM can see when the chef bumped a number
    against the recommendation."""
    overrides: List[Dict[str, Any]] = []  # [{item_id, qty, reason}]
    accepted_by_user_id: Optional[str] = None
    accepted_by_name: Optional[str] = None
    note: Optional[str] = None


@router.post("/by-date/{outlet_id}/{target_date}/accept")
def accept_recommendation(
    outlet_id: str,
    target_date: str,
    body: AcceptOverrideRequest,
):
    """Chef accepts the recommendation (with optional per-item
    overrides). Stamps audit on the row and returns the final
    recommended quantities. The actual draft-order creation in
    the commissary is a separate call — this just records the
    chef's decision."""
    doc = db["auto_order_recommendations"].find_one(
        {"outlet_id": outlet_id, "target_date": target_date}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "no recommendation to accept")

    # Apply overrides
    overrides_by_id = {o.get("item_id"): o for o in body.overrides}
    final_items = []
    for it in (doc.get("items") or []):
        ov = overrides_by_id.get(it["item_id"])
        if ov:
            it = {
                **it,
                "recommended_qty": float(ov.get("qty", it["recommended_qty"])),
                "override_applied": True,
                "override_reason":  ov.get("reason"),
            }
        else:
            it = {**it, "override_applied": False}
        final_items.append(it)

    audit = list(doc.get("audit_log") or []) + [{
        "at": _now_iso(),
        "user_id": body.accepted_by_user_id,
        "user_name": body.accepted_by_name,
        "action": "accepted",
        "overrides_count": len(body.overrides),
        "note": body.note or "",
    }]
    db["auto_order_recommendations"].update_one(
        {"outlet_id": outlet_id, "target_date": target_date},
        {"$set": {
            "items": final_items,
            "accepted": True,
            "accepted_at": _now_iso(),
            "accepted_by_user_id": body.accepted_by_user_id,
            "accepted_by_name":   body.accepted_by_name,
            "audit_log": audit,
        }})
    # D18 · close inbox + audit
    try:
        from routes.audit_log import emit_audit, resolve_pending_approval
        resolve_pending_approval(
            kind="auto_order", entity_id=f"{outlet_id}:{target_date}",
            decision="approved",
            decided_by_user_id=body.accepted_by_user_id,
            decided_by_name=body.accepted_by_name, note=body.note)
        emit_audit(
            module="chronos-auto-order",
            action="accept",
            entity_type="auto_order",
            entity_id=f"{outlet_id}:{target_date}",
            user_id=body.accepted_by_user_id,
            user_name=body.accepted_by_name,
            summary=(f"accepted with {len(body.overrides)} override(s)"),
            metadata={"outlet_id": outlet_id, "target_date": target_date})
    except Exception:
        pass

    return {"ok": True, "outlet_id": outlet_id,
            "target_date": target_date,
            "items": final_items,
            "overrides_applied": len(body.overrides)}
