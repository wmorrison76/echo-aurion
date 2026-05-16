"""iter195 · FM-Upgrade 2 — RecipeNode graph + cascade.

Recipes are DAGs of RecipeNodes. A node is either:
  • ingredient       → leaf with quantity + unit
  • sub_recipe       → reference to another Recipe (by root_node_id or recipe_id)

Computed fields (nutrition, allergens, cost, yield) propagate UP the graph from
ingredient leaves via memoized traversal. One sub-recipe edit → every parent
recomputes on next read. Save-hook marks dependents dirty so label regen can be
queued (FM-Upgrade 3 wires this in).

Cycle detection: graph walker tracks visited_node_ids and throws on revisit.
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set


def _now_iso() -> str: return datetime.now(timezone.utc).isoformat()


def _db():
    from database import db as _d
    return _d


def _ensure_indexes_once():
    global _IDX_DONE
    try:
        if _IDX_DONE: return
    except NameError:
        pass
    try:
        d = _db()
        d.recipe_nodes.create_index([("recipe_id", 1)])
        d.recipe_nodes.create_index([("parent_id", 1)])
        d.recipe_nodes.create_index([("ingredient_id", 1)])
        d.recipe_nodes.create_index([("sub_recipe_id", 1)])
        d.recipes_v2.create_index([("id", 1)], unique=True)
        d.recipes_v2.create_index([("name", 1)])
        globals()["_IDX_DONE"] = True
    except Exception:
        pass


# ── Ingredient default nutrition lookups ────────────────────────────────
# Per-100g rough defaults; replaced by real `ingredients` doc when available.
DEFAULT_NUTRITION_PER_100G: Dict[str, Dict[str, float]] = {
    "chicken":   {"calories": 165, "protein": 31, "fat": 3.6, "saturated_fat": 1.0, "carbohydrates": 0, "sugar": 0, "fiber": 0, "sodium": 74},
    "salmon":    {"calories": 208, "protein": 20, "fat": 13,  "saturated_fat": 3.1, "carbohydrates": 0, "sugar": 0, "fiber": 0, "sodium": 59},
    "rice":      {"calories": 130, "protein": 2.7, "fat": 0.3, "saturated_fat": 0.1, "carbohydrates": 28, "sugar": 0.1, "fiber": 0.4, "sodium": 1},
    "broccoli":  {"calories": 34,  "protein": 2.8, "fat": 0.4, "saturated_fat": 0.0, "carbohydrates": 7,  "sugar": 1.7, "fiber": 2.6, "sodium": 33},
    "peanut":    {"calories": 567, "protein": 26, "fat": 49,  "saturated_fat": 7,   "carbohydrates": 16, "sugar": 4,   "fiber": 9,   "sodium": 18},
    "soy_sauce": {"calories": 53,  "protein": 8,  "fat": 0,   "saturated_fat": 0,   "carbohydrates": 5,  "sugar": 0.4, "fiber": 0.8, "sodium": 5690},
    "olive_oil": {"calories": 884, "protein": 0,  "fat": 100, "saturated_fat": 14,  "carbohydrates": 0,  "sugar": 0,   "fiber": 0,   "sodium": 2},
    "lemon":     {"calories": 29,  "protein": 1.1,"fat": 0.3, "saturated_fat": 0.0, "carbohydrates": 9,  "sugar": 2.5, "fiber": 2.8, "sodium": 2},
    "garlic":    {"calories": 149, "protein": 6.4,"fat": 0.5, "saturated_fat": 0.1, "carbohydrates": 33, "sugar": 1,   "fiber": 2.1, "sodium": 17},
    "ginger":    {"calories": 80,  "protein": 1.8,"fat": 0.8, "saturated_fat": 0.2, "carbohydrates": 18, "sugar": 1.7, "fiber": 2,   "sodium": 13},
}

DEFAULT_ALLERGENS: Dict[str, List[str]] = {
    "peanut": ["peanuts"], "soy_sauce": ["soybeans", "wheat"],
    "egg": ["eggs"], "milk": ["milk"], "butter": ["milk"],
    "wheat": ["wheat"], "flour": ["wheat"],
    "sesame": ["sesame"], "shrimp": ["shellfish"], "crab": ["shellfish"],
    "cashew": ["tree_nuts"], "almond": ["tree_nuts"], "pistachio": ["tree_nuts"],
    "salmon": ["fish"], "tuna": ["fish"], "cod": ["fish"],
}

DEFAULT_PRICE_PER_G: Dict[str, float] = {
    "chicken": 0.012, "salmon": 0.028, "rice": 0.003, "broccoli": 0.006,
    "peanut": 0.010, "soy_sauce": 0.008, "olive_oil": 0.020, "lemon": 0.005,
    "garlic": 0.007, "ginger": 0.009,
}


def _slug(name: str) -> str:
    return "".join(c.lower() if c.isalnum() else "_" for c in (name or ""))


def _ingredient_profile(name: str, ingredient_id: str | None) -> Dict[str, Any]:
    """Look up the ingredient doc; fall back to per-keyword defaults."""
    d = _db()
    doc = None
    if ingredient_id:
        doc = d.ingredients.find_one({"id": ingredient_id}, {"_id": 0}) if hasattr(d, "ingredients") else None
    if not doc and name:
        # Keyword match default
        key = next((k for k in DEFAULT_NUTRITION_PER_100G if k in (name or "").lower()), None)
        if key:
            allergens_key = next((k for k in DEFAULT_ALLERGENS if k in (name or "").lower()), None)
            return {
                "name": name,
                "nutrition_per_100g": DEFAULT_NUTRITION_PER_100G[key],
                "allergens": DEFAULT_ALLERGENS.get(allergens_key or "", []),
                "price_per_g": DEFAULT_PRICE_PER_G.get(key, 0.0),
            }
    if doc:
        return doc
    return {"name": name, "nutrition_per_100g": {"calories": 0}, "allergens": [], "price_per_g": 0.0}


def _node_key(n: Dict[str, Any]) -> str:
    return n.get("id") or n.get("_id") or ""


# ── Graph walker ─────────────────────────────────────────────────────────
def walk(root_node_id: str, _visited: Optional[Set[str]] = None) -> Dict[str, Any]:
    """Recursively compute totals for the subtree rooted at `root_node_id`.

    Returns:
      {
        nutrition: per-serving totals (summed from grams×per-100g),
        allergens: {contains: [...], may_contain: [...]},
        cost: total in USD,
        total_grams: sum of ingredient grams,
        trace: flat list of leaf ingredient contributions
      }
    """
    _ensure_indexes_once()
    if _visited is None: _visited = set()
    if root_node_id in _visited:
        raise ValueError(f"Recipe graph cycle detected at node {root_node_id}")
    _visited = _visited | {root_node_id}

    d = _db()
    node = d.recipe_nodes.find_one({"id": root_node_id}, {"_id": 0})
    if not node:
        return {"nutrition": {}, "allergens": {"contains": [], "may_contain": []}, "cost": 0.0, "total_grams": 0.0, "trace": []}

    nutrition: Dict[str, float] = {}
    allergens: Set[str] = set()
    cost = 0.0
    total_g = 0.0
    trace: List[Dict[str, Any]] = []

    def _add_ingredient(name: str, ingredient_id: str | None, grams: float):
        nonlocal cost, total_g
        prof = _ingredient_profile(name, ingredient_id)
        per100 = prof.get("nutrition_per_100g") or {}
        for k, v in per100.items():
            try:
                nutrition[k] = nutrition.get(k, 0.0) + (float(v) * grams / 100.0)
            except (TypeError, ValueError): pass
        for a in (prof.get("allergens") or []):
            allergens.add(a)
        try: cost += float(prof.get("price_per_g") or 0.0) * grams
        except (TypeError, ValueError): pass
        total_g += grams
        trace.append({"name": prof.get("name") or name, "grams": round(grams, 2), "allergens": prof.get("allergens") or []})

    def _handle(n: Dict[str, Any], scale: float = 1.0):
        nonlocal cost, total_g
        nt = n.get("type")
        if nt == "ingredient":
            g = float(n.get("quantity_g") or n.get("grams") or 0.0) * scale
            _add_ingredient(n.get("name") or "", n.get("ingredient_id"), g)
        elif nt == "sub_recipe":
            sub_root = n.get("sub_root_node_id") or n.get("sub_recipe_root_id")
            scale_factor = float(n.get("scale_factor") or 1.0) * scale
            if not sub_root:
                # Try via sub_recipe_id
                sub_rid = n.get("sub_recipe_id")
                if sub_rid:
                    sub_recipe = d.recipes_v2.find_one({"id": sub_rid}, {"_id": 0})
                    if sub_recipe: sub_root = sub_recipe.get("root_node_id")
            if sub_root and sub_root not in _visited:
                sub = walk(sub_root, _visited)
                for k, v in (sub.get("nutrition") or {}).items():
                    nutrition[k] = nutrition.get(k, 0.0) + float(v) * scale_factor
                for a in (sub.get("allergens", {}).get("contains") or []):
                    allergens.add(a)
                cost += float(sub.get("cost") or 0.0) * scale_factor
                total_g += float(sub.get("total_grams") or 0.0) * scale_factor
                trace.extend(sub.get("trace") or [])
        elif nt == "group":
            # Container node — walk children
            pass
        # Walk children
        children = list(d.recipe_nodes.find({"parent_id": n.get("id")}, {"_id": 0}))
        for c in children:
            _handle(c, scale=scale)

    _handle(node, scale=1.0)

    return {
        "nutrition": {k: round(v, 2) for k, v in nutrition.items()},
        "allergens": {"contains": sorted(allergens), "may_contain": []},
        "cost": round(cost, 4),
        "total_grams": round(total_g, 2),
        "trace": trace,
    }


def computed_for_recipe(recipe_id: str) -> Dict[str, Any]:
    """Top-level computed envelope for a Recipe."""
    d = _db()
    r = d.recipes_v2.find_one({"id": recipe_id}, {"_id": 0})
    if not r:
        return {"error": "recipe not found"}
    root_id = r.get("root_node_id")
    if not root_id:
        return {"recipe_id": recipe_id, "nutrition": {}, "allergens": {"contains": []}, "cost": 0.0, "total_grams": 0.0, "trace": []}
    try:
        result = walk(root_id)
    except ValueError as e:
        return {"recipe_id": recipe_id, "error": str(e)}
    result["recipe_id"] = recipe_id
    result["recipe_name"] = r.get("name")
    result["version"] = r.get("version")
    # FDA 21 CFR 101 ingredient statement — sorted by descending weight
    trace = result.get("trace") or []
    by_name: Dict[str, float] = {}
    for leaf in trace:
        nm = leaf.get("name") or "unknown"
        by_name[nm] = by_name.get(nm, 0.0) + float(leaf.get("grams") or 0.0)
    sorted_ings = sorted(by_name.items(), key=lambda x: -x[1])
    result["ingredient_statement"] = ", ".join([n for n, _ in sorted_ings])
    return result


def propagate_dirty(node_id: str) -> List[str]:
    """Walk UP from a changed node, marking every recipe containing it (directly
    or via sub_recipe) as dirty. Returns the list of dirty recipe_ids so the
    label regenerator (FM-Upgrade 3) can queue them.
    """
    _ensure_indexes_once()
    d = _db()
    dirty_recipes: Set[str] = set()
    stack = [node_id]
    visited: Set[str] = set()
    while stack:
        cur = stack.pop()
        if cur in visited: continue
        visited.add(cur)
        # Recipe directly holding this node as root?
        direct = list(d.recipes_v2.find({"root_node_id": cur}, {"_id": 0, "id": 1}))
        for r in direct: dirty_recipes.add(r["id"])
        # Parent node?
        parent = d.recipe_nodes.find_one({"id": cur}, {"_id": 0, "parent_id": 1})
        if parent and parent.get("parent_id"): stack.append(parent["parent_id"])
        # Sub-recipe references: any node with sub_root_node_id == cur
        refs = list(d.recipe_nodes.find({"sub_root_node_id": cur}, {"_id": 0, "id": 1}))
        for r in refs: stack.append(r["id"])
        refs2 = list(d.recipe_nodes.find({"sub_recipe_id": {"$in": list(dirty_recipes) or ["__none__"]}}, {"_id": 0, "id": 1}))
        for r in refs2: stack.append(r["id"])
    if dirty_recipes:
        now = _now_iso()
        d.recipes_v2.update_many({"id": {"$in": list(dirty_recipes)}}, {"$set": {"labels_dirty": True, "dirty_at": now}})
    return sorted(dirty_recipes)
