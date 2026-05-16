"""
Beverage Intelligence Engine
=============================
Pour tracking, variance analysis, cocktail costing from inventory,
cellar temperature monitoring, comped drinks tracking.
Connects Sommelier module to ordering, inventory, and finance.
"""
import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import database
db = database.db

router = APIRouter(prefix="/api/beverage", tags=["beverage"])

def _now(): return datetime.now(timezone.utc).isoformat()
def _uid(): return str(uuid.uuid4())[:12]


# ── Demo Data Seeding ──

DEMO_SPIRITS = [
    {"id": "spr-1", "name": "Clase Azul Reposado", "spirit_type": "Tequila", "producer": "Clase Azul", "abv": 40, "retail_price": 28, "cost_price": 8.40, "total_qty": 12, "par_level": 8, "reorder_point": 4, "pour_size_oz": 2.0},
    {"id": "spr-2", "name": "Macallan 18 Year", "spirit_type": "Scotch", "producer": "Macallan", "abv": 43, "retail_price": 45, "cost_price": 18.50, "total_qty": 6, "par_level": 6, "reorder_point": 3, "pour_size_oz": 2.0},
    {"id": "spr-3", "name": "Grey Goose", "spirit_type": "Vodka", "producer": "Bacardi", "abv": 40, "retail_price": 16, "cost_price": 3.20, "total_qty": 24, "par_level": 18, "reorder_point": 8, "pour_size_oz": 1.5},
    {"id": "spr-4", "name": "Ketel One", "spirit_type": "Vodka", "producer": "Diageo", "abv": 40, "retail_price": 14, "cost_price": 2.80, "total_qty": 4, "par_level": 12, "reorder_point": 6, "pour_size_oz": 1.5},
    {"id": "spr-5", "name": "Hendrick's Gin", "spirit_type": "Gin", "producer": "Grant's", "abv": 41.4, "retail_price": 15, "cost_price": 4.50, "total_qty": 15, "par_level": 10, "reorder_point": 5, "pour_size_oz": 1.5},
    {"id": "spr-6", "name": "Opus One 2018", "spirit_type": "Red Wine", "producer": "Opus One", "abv": 14.5, "retail_price": 95, "cost_price": 45.00, "total_qty": 2, "par_level": 6, "reorder_point": 3, "pour_size_oz": 5.0},
    {"id": "spr-7", "name": "Veuve Clicquot Brut", "spirit_type": "Champagne", "producer": "LVMH", "abv": 12, "retail_price": 22, "cost_price": 7.50, "total_qty": 18, "par_level": 12, "reorder_point": 6, "pour_size_oz": 5.0},
    {"id": "spr-8", "name": "Don Julio 1942", "spirit_type": "Tequila", "producer": "Diageo", "abv": 40, "retail_price": 35, "cost_price": 14.00, "total_qty": 8, "par_level": 6, "reorder_point": 3, "pour_size_oz": 2.0},
    {"id": "spr-9", "name": "Maker's Mark", "spirit_type": "Bourbon", "producer": "Beam Suntory", "abv": 45, "retail_price": 12, "cost_price": 2.40, "total_qty": 16, "par_level": 12, "reorder_point": 6, "pour_size_oz": 2.0},
    {"id": "spr-10", "name": "Patron Silver", "spirit_type": "Tequila", "producer": "Bacardi", "abv": 40, "retail_price": 14, "cost_price": 3.50, "total_qty": 20, "par_level": 15, "reorder_point": 8, "pour_size_oz": 1.5},
]


def seed_beverage():
    col = db["beverage_inventory"]
    if col.count_documents({}) > 0:
        return
    for s in DEMO_SPIRITS:
        s["pour_cost_pct"] = round(s["cost_price"] / max(s["retail_price"], 1) * 100, 1)
        s["created_at"] = _now()
        col.insert_one(s)


# ── Inventory ──

@router.get("/inventory")
def list_beverage_inventory(
    spirit_type: Optional[str] = None,
    q: Optional[str] = None,
    low_stock_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
):
    query = {}
    if spirit_type:
        query["spirit_type"] = spirit_type
    if q:
        import re as _re
        query["name"] = {"$regex": _re.escape(q), "$options": "i"}
    if low_stock_only:
        query["$expr"] = {"$lte": ["$total_qty", "$reorder_point"]}

    items = list(db["beverage_inventory"].find(query, {"_id": 0}).sort("name", 1).limit(limit))
    total_value = sum(i.get("cost_price", 0) * i.get("total_qty", 0) for i in items)
    low_stock = [i for i in items if i.get("total_qty", 0) <= i.get("reorder_point", 0)]

    return {
        "items": items,
        "total": len(items),
        "total_value": round(total_value, 2),
        "total_bottles": sum(i.get("total_qty", 0) for i in items),
        "low_stock_count": len(low_stock),
        "avg_pour_cost": round(sum(i.get("pour_cost_pct", 0) for i in items) / max(len(items), 1), 1),
    }


@router.get("/inventory/{item_id}")
def get_beverage_item(item_id: str):
    item = db["beverage_inventory"].find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item not found")
    # Get pour history
    pours = list(db["pour_logs"].find({"item_id": item_id}, {"_id": 0}).sort("timestamp", -1).limit(50))
    item["pour_history"] = pours
    return item


# ── Pour Tracking ──

class PourLogInput(BaseModel):
    item_id: str
    outlet_id: Optional[str] = "sky-bar"
    pours: int = 1
    bartender: Optional[str] = ""
    is_comp: Optional[bool] = False
    comp_reason: Optional[str] = ""
    pos_ticket_id: Optional[str] = None


@router.post("/pour")
def log_pour(data: PourLogInput):
    item = db["beverage_inventory"].find_one({"id": data.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item not found")

    revenue = item.get("retail_price", 0) * data.pours if not data.is_comp else 0
    cost = item.get("cost_price", 0) * data.pours

    doc = {
        "id": f"pour-{_uid()}",
        **data.model_dump(),
        "item_name": item["name"],
        "spirit_type": item.get("spirit_type"),
        "revenue": round(revenue, 2),
        "cost": round(cost, 2),
        "timestamp": _now(),
    }
    db["pour_logs"].insert_one(doc)
    doc.pop("_id", None)

    # Decrement inventory (simplified: 1 pour ~ fraction of a bottle)
    pour_size = item.get("pour_size_oz", 1.5)
    bottle_oz = 25.4  # 750ml bottle
    bottles_used = (data.pours * pour_size) / bottle_oz
    new_qty = max(0, item.get("total_qty", 0) - bottles_used)
    db["beverage_inventory"].update_one(
        {"id": data.item_id},
        {"$set": {"total_qty": round(new_qty, 1)}},
    )

    return doc


@router.get("/pours")
def list_pours(
    item_id: Optional[str] = None,
    outlet_id: Optional[str] = None,
    comps_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
):
    q = {}
    if item_id:
        q["item_id"] = item_id
    if outlet_id:
        q["outlet_id"] = outlet_id
    if comps_only:
        q["is_comp"] = True
    pours = list(db["pour_logs"].find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))
    total_rev = sum(p.get("revenue", 0) for p in pours)
    total_cost = sum(p.get("cost", 0) for p in pours)
    comp_count = len([p for p in pours if p.get("is_comp")])

    return {
        "pours": pours,
        "total": len(pours),
        "total_revenue": round(total_rev, 2),
        "total_cost": round(total_cost, 2),
        "pour_cost_pct": round(total_cost / max(total_rev, 1) * 100, 1),
        "comp_count": comp_count,
        "comp_value": round(sum(p.get("cost", 0) for p in pours if p.get("is_comp")), 2),
    }


# ── Variance Analysis ──

@router.get("/variance")
def variance_analysis(outlet_id: Optional[str] = None):
    """Actual vs theoretical variance — the core audit metric for beverage."""
    items = list(db["beverage_inventory"].find({}, {"_id": 0}))
    pours = list(db["pour_logs"].find({}, {"_id": 0}))

    pour_by_item = {}
    for p in pours:
        iid = p.get("item_id", "")
        pour_by_item.setdefault(iid, {"total_pours": 0, "revenue": 0, "cost": 0})
        pour_by_item[iid]["total_pours"] += p.get("pours", 0)
        pour_by_item[iid]["revenue"] += p.get("revenue", 0)
        pour_by_item[iid]["cost"] += p.get("cost", 0)

    variances = []
    for item in items:
        iid = item["id"]
        actual = pour_by_item.get(iid, {"total_pours": 0, "revenue": 0, "cost": 0})
        pour_size = item.get("pour_size_oz", 1.5)
        theoretical_pours = item.get("total_qty", 0) * 25.4 / pour_size  # bottles to pours
        variance_pct = 0
        if actual["total_pours"] > 0:
            variance_pct = round((actual["total_pours"] - theoretical_pours) / max(theoretical_pours, 1) * 100, 1)

        variances.append({
            "item_id": iid,
            "name": item["name"],
            "spirit_type": item.get("spirit_type"),
            "theoretical_pours": round(theoretical_pours, 1),
            "actual_pours": actual["total_pours"],
            "variance_pct": variance_pct,
            "variance_status": "normal" if abs(variance_pct) < 5 else "warning" if abs(variance_pct) < 15 else "critical",
            "revenue": round(actual["revenue"], 2),
            "cost": round(actual["cost"], 2),
        })

    variances.sort(key=lambda x: abs(x["variance_pct"]), reverse=True)

    total_rev = sum(v["revenue"] for v in variances)
    total_cost = sum(v["cost"] for v in variances)

    return {
        "items": variances,
        "total_items": len(variances),
        "total_revenue": round(total_rev, 2),
        "total_cost": round(total_cost, 2),
        "overall_pour_cost": round(total_cost / max(total_rev, 1) * 100, 1),
        "items_with_variance": len([v for v in variances if v["variance_status"] != "normal"]),
    }


# ── Cocktail Costing ──

class CocktailRecipeInput(BaseModel):
    name: str
    category: Optional[str] = "cocktail"
    ingredients: list  # [{item_id, oz_amount}]
    retail_price: float
    garnish: Optional[str] = ""
    glass_type: Optional[str] = ""
    method: Optional[str] = ""


@router.post("/cocktail-recipes")
def create_cocktail_recipe(data: CocktailRecipeInput):
    total_cost = 0
    resolved_ingredients = []
    for ing in data.ingredients:
        item = db["beverage_inventory"].find_one({"id": ing.get("item_id")}, {"_id": 0})
        if item:
            cost_per_oz = item.get("cost_price", 0) * 25.4 / 750  # cost per oz from bottle
            oz = ing.get("oz_amount", 1.5)
            ing_cost = cost_per_oz * oz
            total_cost += ing_cost
            resolved_ingredients.append({
                "item_id": item["id"],
                "name": item["name"],
                "oz_amount": oz,
                "cost": round(ing_cost, 2),
            })

    pour_cost_pct = round(total_cost / max(data.retail_price, 0.01) * 100, 1)

    doc = {
        "id": f"cock-{_uid()}",
        "name": data.name,
        "category": data.category,
        "ingredients": resolved_ingredients,
        "retail_price": data.retail_price,
        "total_cost": round(total_cost, 2),
        "pour_cost_pct": pour_cost_pct,
        "garnish": data.garnish,
        "glass_type": data.glass_type,
        "method": data.method,
        "margin": round(data.retail_price - total_cost, 2),
        "created_at": _now(),
    }
    db["cocktail_recipes"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/cocktail-recipes")
def list_cocktail_recipes(category: Optional[str] = None):
    q = {"category": category} if category else {}
    recipes = list(db["cocktail_recipes"].find(q, {"_id": 0}).sort("name", 1))
    return {"recipes": recipes, "total": len(recipes)}


# ── Cellar Temperature Monitoring (beverage-specific) ──

@router.get("/cellar-status")
def cellar_status():
    """Current cellar/cooler status with optimal ranges."""
    zones = [
        {"zone": "Wine Cellar A", "current_temp": 55.2, "optimal_min": 53, "optimal_max": 57, "humidity": 68, "status": "optimal"},
        {"zone": "Wine Cellar B (Reds)", "current_temp": 62.5, "optimal_min": 60, "optimal_max": 65, "humidity": 62, "status": "optimal"},
        {"zone": "Champagne Vault", "current_temp": 47.8, "optimal_min": 45, "optimal_max": 50, "humidity": 72, "status": "optimal"},
        {"zone": "Spirit Storage", "current_temp": 68.0, "optimal_min": 60, "optimal_max": 72, "humidity": 45, "status": "optimal"},
        {"zone": "Beer Cooler (Draft)", "current_temp": 38.5, "optimal_min": 36, "optimal_max": 40, "humidity": None, "status": "optimal"},
        {"zone": "Walk-In Cooler B", "current_temp": 48.2, "optimal_min": 36, "optimal_max": 41, "humidity": None, "status": "alert"},
    ]
    alerts = [z for z in zones if z["status"] != "optimal"]
    return {
        "zones": zones,
        "total_zones": len(zones),
        "alerts": len(alerts),
        "overall_status": "alert" if alerts else "optimal",
    }


# ── Comped Drinks Summary ──

@router.get("/comps-summary")
def comps_summary():
    """Summary of comped/complimentary drinks for management review."""
    comps = list(db["pour_logs"].find({"is_comp": True}, {"_id": 0}).sort("timestamp", -1).limit(100))
    total_cost = sum(c.get("cost", 0) for c in comps)
    by_reason = {}
    for c in comps:
        reason = c.get("comp_reason", "unspecified")
        by_reason.setdefault(reason, {"count": 0, "cost": 0})
        by_reason[reason]["count"] += 1
        by_reason[reason]["cost"] += c.get("cost", 0)

    return {
        "total_comps": len(comps),
        "total_cost": round(total_cost, 2),
        "by_reason": {k: {**v, "cost": round(v["cost"], 2)} for k, v in by_reason.items()},
        "recent": comps[:10],
    }
