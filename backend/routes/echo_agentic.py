"""iter197 · Echo agentic pilots — rung 2 (draft) + rung 3 (execute w/ reversal).

Two capabilities flipped from 'observe' to 'do':

  • PO drafting  (rung 2 → Echo drafts, operator one-click approves)
  • Label regeneration  (rung 3 → Echo executes, 60-min reversibility window)

Each action:
  • Checks the Echo permission ladder via /api/echo/capabilities/check logic
  • Creates the action record in `echo_actions` collection
  • For rung 3: writes a reversal_token valid for `reversibility_window_min`
  • Emits `echo.action_executed` TimelineEvent with payload.reversible=true
  • On reversal: emits `echo.action_reversed` TimelineEvent

Endpoints:
  POST /api/echo/draft-po                  — rung 2 (draft only, no execution)
  POST /api/echo/draft-po/{id}/approve     — admin approves → creates real PO
  POST /api/echo/regenerate-label          — rung 3 (auto-executes with reversal)
  POST /api/echo/action/{id}/reverse       — manual reversal within window
  GET  /api/echo/actions?status=&limit=    — audit log
"""
from __future__ import annotations
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/echo", tags=["echo-agentic"])


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()
def _uid(prefix: str) -> str: return f"{prefix}-{uuid4().hex[:10]}"
def _db():
    from database import db as _d
    return _d


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _get_rung(capability: str) -> Dict[str, Any]:
    """Resolve current rung + reversibility window for a capability."""
    d = _db()
    cap = d.echo_capabilities.find_one({"capability": capability}, {"_id": 0})
    if not cap:
        # Auto-seed from defaults
        from routes.fm_foundations import _seed_capabilities
        _seed_capabilities()
        cap = d.echo_capabilities.find_one({"capability": capability}, {"_id": 0}) or {}
    return {
        "capability": capability,
        "rung": int(cap.get("rung") or 0),
        "reversibility_window_min": int(cap.get("reversibility_window_min") or 0),
    }


def _require_rung(capability: str, minimum_rung: int) -> Dict[str, Any]:
    info = _get_rung(capability)
    if info["rung"] < minimum_rung:
        raise HTTPException(
            403,
            f"Echo rung too low — capability '{capability}' at rung {info['rung']} "
            f"but requires rung {minimum_rung}. Admin: POST /api/echo/capabilities/{capability} {{\"rung\":{minimum_rung}}}",
        )
    return info


# ══════════════════════════════════════════════════════════════════
# PO drafting · rung 2 (Draft — operator approves)
# ══════════════════════════════════════════════════════════════════
class DraftPOBody(BaseModel):
    product_id: Optional[str] = None       # narrow draft to one product
    days_lookback: int = 14
    safety_stock_pct: float = 15.0         # buffer percentage


@router.post("/draft-po")
async def draft_po(body: DraftPOBody):
    """Echo drafts a PO from forecast + baselines. Stored for admin approval."""
    info = _require_rung("po_drafting", 2)
    d = _db()

    # Pull forecast baselines (from iter197 warmup migration)
    q: Dict[str, Any] = {}
    if body.product_id: q["product_id"] = body.product_id
    baselines = list(d.forecast_baselines.find(q, {"_id": 0}))

    if not baselines:
        # Fallback — synthesize from pack history
        from collections import defaultdict
        counts: dict = defaultdict(int)
        for p in d.fresh_meal_packs.find({}, {"_id": 0, "product_id": 1}):
            counts[p.get("product_id") or "_"] += 1
        baselines = [{"product_id": pid, "daily_mean_7d": c / max(body.days_lookback, 1)} for pid, c in counts.items()]

    # Ingredient demand: roll up pack-level demand → recipe ingredient totals
    lines: List[Dict[str, Any]] = []
    for b in baselines[:20]:
        pid = b.get("product_id")
        prod = d.fresh_meal_products.find_one({"id": pid}, {"_id": 0}) if pid else None
        recipe_id = prod.get("recipe_id") if prod else None
        daily = float(b.get("daily_mean_7d") or 0)
        forecast_qty = int(daily * body.days_lookback * (1 + body.safety_stock_pct / 100.0))
        if forecast_qty <= 0: continue
        if recipe_id:
            try:
                from lib.recipe_graph import computed_for_recipe
                c = computed_for_recipe(recipe_id)
                for leaf in (c.get("trace") or [])[:10]:
                    lines.append({
                        "ingredient": leaf.get("name"),
                        "qty_needed_g": round(float(leaf.get("grams") or 0) * forecast_qty, 1),
                        "for_product": pid, "forecast_packs": forecast_qty,
                    })
            except Exception:
                lines.append({"ingredient": pid, "qty_needed_g": forecast_qty, "for_product": pid, "forecast_packs": forecast_qty})
        else:
            lines.append({"ingredient": pid, "qty_needed_g": forecast_qty, "for_product": pid, "forecast_packs": forecast_qty})

    draft_id = _uid("po-draft")
    action = {
        "id": draft_id, "capability": "po_drafting",
        "kind": "po_draft", "status": "pending_approval",
        "rung_at_time": info["rung"],
        "draft": {
            "lines": lines,
            "days_lookback": body.days_lookback,
            "safety_stock_pct": body.safety_stock_pct,
            "total_line_count": len(lines),
        },
        "created_at": _iso(),
        "actor": "echo",
    }
    d.echo_actions.insert_one(action.copy()); action.pop("_id", None)

    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ECHO_SUGGESTION_MADE
        _tl(ECHO_SUGGESTION_MADE,
            actor={"type": "echo", "id": "echo-po", "name": "Echo"},
            entity_refs=[{"kind": "echo_action", "id": draft_id}],
            payload={"kind": "po_draft", "line_count": len(lines), "rung": info["rung"]})
    except Exception: pass

    return {"ok": True, "action": action, "requires_approval": True,
            "approve_url": f"/api/echo/draft-po/{draft_id}/approve"}


@router.post("/draft-po/{draft_id}/approve")
async def approve_po_draft(draft_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    d = _db()
    action = d.echo_actions.find_one({"id": draft_id}, {"_id": 0})
    if not action: raise HTTPException(404, "draft not found")
    if action.get("status") != "pending_approval":
        raise HTTPException(400, f"draft already {action.get('status')}")

    # Materialize as a real purchase_requisition
    from uuid import uuid4 as _u
    pr_id = f"pr-echo-{_u().hex[:8]}"
    items = [
        {"ingredient": li["ingredient"], "qty": li["qty_needed_g"], "unit": "g"}
        for li in (action.get("draft") or {}).get("lines", [])
    ]
    d.purchase_requisitions.insert_one({
        "requisition_id": pr_id, "outlet": "luccca",
        "items": items, "total_cost": 0,
        "requested_by": "Echo (approved)", "status": "drafted",
        "echo_draft_id": draft_id,
        "created_at": _iso(),
    })
    d.echo_actions.update_one({"id": draft_id}, {
        "$set": {"status": "approved", "approved_at": _iso(), "pr_id": pr_id}
    })

    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ECHO_ACTION_EXECUTED, PO_DRAFTED
        _tl(ECHO_ACTION_EXECUTED,
            actor={"type": "echo", "id": "echo-po", "name": "Echo"},
            entity_refs=[{"kind": "echo_action", "id": draft_id},
                         {"kind": "purchase_requisition", "id": pr_id}],
            payload={"kind": "po_draft_approved", "line_count": len(items)})
        _tl(PO_DRAFTED,
            actor={"type": "echo", "id": "echo-po", "name": "Echo"},
            entity_refs=[{"kind": "purchase_requisition", "id": pr_id}],
            payload={"outlet": "luccca", "line_count": len(items),
                     "commodity": "mixed", "quantity": len(items), "unit": "lines"},
            idempotency_key=f"echo:po.drafted:{pr_id}")
    except Exception: pass

    return {"ok": True, "pr_id": pr_id, "status": "approved"}


# ══════════════════════════════════════════════════════════════════
# Label regeneration · rung 3 (Execute with 60-min reversal)
# ══════════════════════════════════════════════════════════════════
class RegenerateLabelBody(BaseModel):
    recipe_id: str


@router.post("/regenerate-label")
async def regenerate_label(body: RegenerateLabelBody):
    """Echo regenerates the label envelope when recipe flagged dirty.
    Rung 3 → auto-executes, admin has 60 min to reverse."""
    info = _require_rung("label_regeneration", 3)
    d = _db()
    r = d.recipes_v2.find_one({"id": body.recipe_id}, {"_id": 0})
    if not r: raise HTTPException(404, "recipe not found")

    from lib.recipe_graph import computed_for_recipe
    computed = computed_for_recipe(body.recipe_id)

    # Generate a fresh "label envelope"
    label_id = _uid("label")
    label = {
        "id": label_id, "recipe_id": body.recipe_id,
        "recipe_name": r.get("name"),
        "recipe_version": r.get("version"),
        "product_name": r.get("name"),
        "ingredient_statement": computed.get("ingredient_statement", ""),
        "nutrition_facts": computed.get("nutrition", {}),
        "allergens_contains": computed.get("allergens", {}).get("contains", []),
        "cost_per_serving": computed.get("cost"),
        "generated_at": _iso(),
        "status": "active",
        "generated_by": "echo",
    }
    d.fresh_meal_labels.insert_one(label.copy()); label.pop("_id", None)

    # Clear dirty flag on recipe
    d.recipes_v2.update_one({"id": body.recipe_id}, {"$set": {"labels_dirty": False, "label_id": label_id}})

    # Reversal token — 60 min window
    reversal_token = secrets.token_urlsafe(12)
    expires = (_now() + timedelta(minutes=info["reversibility_window_min"])).isoformat()
    action_id = _uid("act")
    action = {
        "id": action_id, "capability": "label_regeneration",
        "kind": "label_regenerated", "status": "executed",
        "rung_at_time": info["rung"],
        "recipe_id": body.recipe_id, "label_id": label_id,
        "reversal_token": reversal_token,
        "reversible_until": expires,
        "created_at": _iso(),
        "actor": "echo",
    }
    d.echo_actions.insert_one(action.copy()); action.pop("_id", None)

    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ECHO_ACTION_EXECUTED, LABEL_REGENERATED
        _tl(ECHO_ACTION_EXECUTED,
            actor={"type": "echo", "id": "echo-label", "name": "Echo"},
            entity_refs=[{"kind": "echo_action", "id": action_id},
                         {"kind": "recipe", "id": body.recipe_id},
                         {"kind": "label", "id": label_id}],
            payload={"kind": "label_regenerated", "reversible_until": expires,
                     "reversal_token_hint": reversal_token[:6] + "…"})
        _tl(LABEL_REGENERATED,
            actor={"type": "echo", "id": "echo-label", "name": "Echo"},
            entity_refs=[{"kind": "label", "id": label_id}, {"kind": "recipe", "id": body.recipe_id}],
            payload={"version": r.get("version"), "allergen_count": len(label["allergens_contains"])})
    except Exception: pass

    return {"ok": True, "action": action, "label": label, "reversible_until": expires}


class ReverseBody(BaseModel):
    reversal_token: str


@router.post("/action/{action_id}/reverse")
async def reverse_action(action_id: str, body: ReverseBody):
    d = _db()
    action = d.echo_actions.find_one({"id": action_id}, {"_id": 0})
    if not action: raise HTTPException(404, "action not found")
    if action.get("status") == "reversed":
        raise HTTPException(400, "already reversed")
    if action.get("reversal_token") != body.reversal_token:
        raise HTTPException(401, "invalid reversal token")
    expires = action.get("reversible_until")
    if expires and _iso() > expires:
        raise HTTPException(400, "reversibility window expired")

    # Apply the reversal per action kind
    if action.get("kind") == "label_regenerated":
        label_id = action.get("label_id")
        if label_id:
            d.fresh_meal_labels.update_one({"id": label_id}, {"$set": {"status": "reversed", "reversed_at": _iso()}})
        recipe_id = action.get("recipe_id")
        if recipe_id:
            d.recipes_v2.update_one({"id": recipe_id}, {"$set": {"labels_dirty": True, "label_id": None}})

    d.echo_actions.update_one({"id": action_id}, {"$set": {"status": "reversed", "reversed_at": _iso()}})

    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ECHO_ACTION_REVERSED
        _tl(ECHO_ACTION_REVERSED,
            actor={"type": "user", "id": "admin", "name": "Admin"},
            entity_refs=[{"kind": "echo_action", "id": action_id}],
            payload={"kind": action.get("kind"), "rung_at_time": action.get("rung_at_time")})
    except Exception: pass
    return {"ok": True, "status": "reversed"}


@router.get("/actions")
async def list_actions(status: Optional[str] = None, limit: int = 50):
    d = _db()
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    items = list(d.echo_actions.find(q, {"_id": 0, "reversal_token": 0}).sort("created_at", -1).limit(max(1, min(200, limit))))
    return {"ok": True, "total": len(items), "actions": items}
