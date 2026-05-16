"""iter195 · FM-Upgrade 2 — Recipe graph HTTP surface.

Lives at /api/recipe-graph/* (doesn't collide with legacy /api/recipes/*).

Endpoints:
  POST /api/recipe-graph/recipes              create Recipe shell
  POST /api/recipe-graph/recipes/{id}/nodes   create/update a node
  GET  /api/recipe-graph/recipes/{id}         the recipe + nodes
  GET  /api/recipe-graph/recipes/{id}/computed   cascade computation
  POST /api/recipe-graph/nodes/{id}/update    triggers propagate_dirty
  POST /api/recipe-graph/seed-demo            insert the Thai Peanut Bowl demo (idempotent)
  GET  /api/recipe-graph/recipes              list with computed rollups
"""
from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from lib.recipe_graph import walk, computed_for_recipe, propagate_dirty, _ensure_indexes_once

router = APIRouter(prefix="/api/recipe-graph", tags=["recipe-graph"])


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _db():
    from database import db as _d
    return _d


def _now_iso() -> str: return datetime.now(timezone.utc).isoformat()
def _uid() -> str: return uuid4().hex[:10]


class RecipeBody(BaseModel):
    name: str
    description: Optional[str] = None
    yield_qty: Optional[float] = None
    yield_unit: Optional[str] = None
    tags: Optional[List[str]] = None


@router.post("/recipes")
async def create_recipe(body: RecipeBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    _ensure_indexes_once()
    d = _db()
    rid = f"rec-{_uid()}"
    root_id = f"node-{_uid()}"
    now = _now_iso()
    d.recipe_nodes.insert_one({
        "id": root_id, "recipe_id": rid,
        "type": "group", "name": body.name, "parent_id": None,
        "created_at": now,
    })
    d.recipes_v2.insert_one({
        "id": rid, "name": body.name, "description": body.description or "",
        "root_node_id": root_id, "version": 1, "status": "draft",
        "yield_qty": body.yield_qty, "yield_unit": body.yield_unit,
        "tags": body.tags or [], "labels_dirty": False,
        "created_at": now, "updated_at": now,
    })
    return {"ok": True, "recipe_id": rid, "root_node_id": root_id}


class NodeBody(BaseModel):
    type: str  # ingredient | sub_recipe | group
    name: Optional[str] = None
    parent_id: Optional[str] = None   # if not given → attach to root
    ingredient_id: Optional[str] = None
    quantity_g: Optional[float] = None
    sub_recipe_id: Optional[str] = None
    sub_root_node_id: Optional[str] = None
    scale_factor: Optional[float] = 1.0


@router.post("/recipes/{recipe_id}/nodes")
async def add_node(recipe_id: str, body: NodeBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    _ensure_indexes_once()
    d = _db()
    r = d.recipes_v2.find_one({"id": recipe_id}, {"_id": 0})
    if not r: raise HTTPException(404, "recipe not found")
    if body.type not in ("ingredient", "sub_recipe", "group"):
        raise HTTPException(400, "type must be ingredient|sub_recipe|group")
    if body.type == "sub_recipe":
        # Resolve sub_recipe_id → its root
        sub_root = body.sub_root_node_id
        if not sub_root and body.sub_recipe_id:
            sub = d.recipes_v2.find_one({"id": body.sub_recipe_id}, {"_id": 0})
            if sub: sub_root = sub.get("root_node_id")
        if not sub_root: raise HTTPException(400, "sub_recipe node needs sub_root_node_id or sub_recipe_id")
        # Cycle check — cannot reference self
        if sub_root == r.get("root_node_id"): raise HTTPException(400, "cycle: sub_recipe would reference self")
    node_id = f"node-{_uid()}"
    doc = {
        "id": node_id, "recipe_id": recipe_id,
        "type": body.type,
        "name": body.name or "",
        "parent_id": body.parent_id or r.get("root_node_id"),
        "ingredient_id": body.ingredient_id,
        "quantity_g": body.quantity_g,
        "sub_recipe_id": body.sub_recipe_id,
        "sub_root_node_id": body.sub_root_node_id,
        "scale_factor": body.scale_factor or 1.0,
        "created_at": _now_iso(),
    }
    d.recipe_nodes.insert_one(doc)
    doc.pop("_id", None)
    # Mark recipe dirty + bump version
    d.recipes_v2.update_one({"id": recipe_id}, {"$inc": {"version": 1}, "$set": {"labels_dirty": True, "updated_at": _now_iso()}})
    dirty = propagate_dirty(node_id)

    # iter195 · emit timeline event — label invalidation cascades
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import LABEL_INVALIDATED
        if dirty:
            _tl(LABEL_INVALIDATED,
                actor={"type": "system", "id": "recipe-graph", "name": "recipe-graph"},
                entity_refs=[{"kind": "recipe", "id": rid} for rid in dirty[:10]],
                payload={"reason": "node_added", "node_id": node_id, "dirty_recipes": dirty})
    except Exception: pass
    return {"ok": True, "node": doc, "dirty_recipes": dirty}


@router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str):
    _ensure_indexes_once()
    d = _db()
    r = d.recipes_v2.find_one({"id": recipe_id}, {"_id": 0})
    if not r: raise HTTPException(404, "recipe not found")
    nodes = list(d.recipe_nodes.find({"recipe_id": recipe_id}, {"_id": 0}))
    return {"ok": True, "recipe": r, "nodes": nodes}


@router.get("/recipes/{recipe_id}/computed")
async def get_computed(recipe_id: str):
    _ensure_indexes_once()
    result = computed_for_recipe(recipe_id)
    if result.get("error"):
        raise HTTPException(400 if "cycle" in result["error"] else 404, result["error"])
    return {"ok": True, "computed": result}


@router.get("/recipes")
async def list_recipes(limit: int = 100):
    _ensure_indexes_once()
    items = list(_db().recipes_v2.find({}, {"_id": 0}).sort("updated_at", -1).limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(items), "recipes": items}


@router.post("/seed-demo")
async def seed_demo(x_admin_token: Optional[str] = Header(None)):
    """Seed a three-level demo: Thai Peanut Bowl → Thai Peanut Sauce → Spice Blend."""
    _require_admin(x_admin_token)
    _ensure_indexes_once()
    d = _db()
    # Skip if already seeded
    if d.recipes_v2.find_one({"id": "rec-demo-thai-peanut-bowl"}): return {"ok": True, "seeded": False, "already_exists": True}
    now = _now_iso()

    # ── Level 3: Spice blend ──
    spice_root = "node-demo-spice-root"
    d.recipe_nodes.insert_many([
        {"id": spice_root, "recipe_id": "rec-demo-spice-blend", "type": "group", "name": "Thai spice blend", "parent_id": None, "created_at": now},
        {"id": "node-demo-spice-1", "recipe_id": "rec-demo-spice-blend", "type": "ingredient", "name": "garlic", "parent_id": spice_root, "quantity_g": 20, "created_at": now},
        {"id": "node-demo-spice-2", "recipe_id": "rec-demo-spice-blend", "type": "ingredient", "name": "ginger", "parent_id": spice_root, "quantity_g": 15, "created_at": now},
    ])
    d.recipes_v2.insert_one({
        "id": "rec-demo-spice-blend", "name": "Thai spice blend", "root_node_id": spice_root,
        "version": 1, "status": "active", "tags": ["sub-recipe"], "labels_dirty": False,
        "created_at": now, "updated_at": now,
    })

    # ── Level 2: Thai peanut sauce (uses spice blend) ──
    sauce_root = "node-demo-sauce-root"
    d.recipe_nodes.insert_many([
        {"id": sauce_root, "recipe_id": "rec-demo-thai-peanut-sauce", "type": "group", "name": "Thai peanut sauce", "parent_id": None, "created_at": now},
        {"id": "node-demo-sauce-1", "recipe_id": "rec-demo-thai-peanut-sauce", "type": "ingredient", "name": "peanut butter", "parent_id": sauce_root, "quantity_g": 80, "created_at": now},
        {"id": "node-demo-sauce-2", "recipe_id": "rec-demo-thai-peanut-sauce", "type": "ingredient", "name": "soy_sauce", "parent_id": sauce_root, "quantity_g": 30, "created_at": now},
        {"id": "node-demo-sauce-3", "recipe_id": "rec-demo-thai-peanut-sauce", "type": "ingredient", "name": "lemon juice", "parent_id": sauce_root, "quantity_g": 15, "created_at": now},
        {"id": "node-demo-sauce-4", "recipe_id": "rec-demo-thai-peanut-sauce", "type": "sub_recipe", "name": "Thai spice blend", "parent_id": sauce_root, "sub_root_node_id": spice_root, "sub_recipe_id": "rec-demo-spice-blend", "scale_factor": 0.3, "created_at": now},
    ])
    d.recipes_v2.insert_one({
        "id": "rec-demo-thai-peanut-sauce", "name": "Thai peanut sauce", "root_node_id": sauce_root,
        "version": 1, "status": "active", "tags": ["sub-recipe"], "labels_dirty": False,
        "created_at": now, "updated_at": now,
    })

    # ── Level 1: Thai Peanut Bowl (root, uses sauce) ──
    bowl_root = "node-demo-bowl-root"
    d.recipe_nodes.insert_many([
        {"id": bowl_root, "recipe_id": "rec-demo-thai-peanut-bowl", "type": "group", "name": "Thai Peanut Bowl", "parent_id": None, "created_at": now},
        {"id": "node-demo-bowl-1", "recipe_id": "rec-demo-thai-peanut-bowl", "type": "ingredient", "name": "chicken breast", "parent_id": bowl_root, "quantity_g": 150, "created_at": now},
        {"id": "node-demo-bowl-2", "recipe_id": "rec-demo-thai-peanut-bowl", "type": "ingredient", "name": "jasmine rice", "parent_id": bowl_root, "quantity_g": 120, "created_at": now},
        {"id": "node-demo-bowl-3", "recipe_id": "rec-demo-thai-peanut-bowl", "type": "ingredient", "name": "broccoli", "parent_id": bowl_root, "quantity_g": 90, "created_at": now},
        {"id": "node-demo-bowl-4", "recipe_id": "rec-demo-thai-peanut-bowl", "type": "sub_recipe", "name": "Thai peanut sauce", "parent_id": bowl_root, "sub_root_node_id": sauce_root, "sub_recipe_id": "rec-demo-thai-peanut-sauce", "scale_factor": 0.5, "created_at": now},
    ])
    d.recipes_v2.insert_one({
        "id": "rec-demo-thai-peanut-bowl", "name": "Thai Peanut Bowl", "description": "3-level demo recipe showing sub-recipe cascade.",
        "root_node_id": bowl_root, "version": 1, "status": "active",
        "yield_qty": 1, "yield_unit": "pack", "tags": ["demo", "bowl", "chicken"],
        "labels_dirty": False, "published_to_channels": ["b2c_subscription"],
        "created_at": now, "updated_at": now,
    })
    return {"ok": True, "seeded": True, "recipes": ["rec-demo-thai-peanut-bowl", "rec-demo-thai-peanut-sauce", "rec-demo-spice-blend"]}


class UpdateNodeBody(BaseModel):
    quantity_g: Optional[float] = None
    scale_factor: Optional[float] = None
    name: Optional[str] = None


@router.post("/nodes/{node_id}/update")
async def update_node(node_id: str, body: UpdateNodeBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    _ensure_indexes_once()
    d = _db()
    patch: Dict[str, Any] = {"updated_at": _now_iso()}
    if body.quantity_g is not None: patch["quantity_g"] = body.quantity_g
    if body.scale_factor is not None: patch["scale_factor"] = body.scale_factor
    if body.name is not None: patch["name"] = body.name
    r = d.recipe_nodes.update_one({"id": node_id}, {"$set": patch})
    if not r.matched_count: raise HTTPException(404, "node not found")
    dirty = propagate_dirty(node_id)
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import LABEL_INVALIDATED
        if dirty:
            _tl(LABEL_INVALIDATED,
                actor={"type": "user", "id": "admin", "name": "Admin"},
                entity_refs=[{"kind": "recipe", "id": rid} for rid in dirty[:10]],
                payload={"reason": "node_updated", "node_id": node_id, "dirty_recipes": dirty, "patch": patch})
    except Exception: pass
    return {"ok": True, "dirty_recipes": dirty}
