"""
LUCCCA Portion Engine Service
=============================
Reusable portion reference library for restaurant, banquet, buffet, and catering operations.
Supports configurable overrides by concept, meal period, event type, service style, luxury tier, account/property.
Downstream use: recipe scaling, BEO calculations, purchasing forecasts, plate costing, buffet replenishment.
"""
import os
import json
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/portion-engine", tags=["portion-engine"])

from database import db

library_col = db["portion_library"]
overrides_col = db["portion_overrides"]

_SCHEMA_VERSION = "1.0.0"

def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())


# ─── Seed Data ──────────────────────────────────────────────────────

def _seed_portion_library():
    """Seed the portion library from the embedded reference data. Idempotent via item_id."""
    seed_path = os.path.join(os.path.dirname(__file__), "portion_library_seed.json")
    if not os.path.exists(seed_path):
        return 0
    with open(seed_path, "r") as f:
        data = json.load(f)
    items = data.get("items", [])
    seeded = 0
    for item in items:
        item_id = item.get("item_id")
        if not item_id:
            continue
        existing = library_col.find_one({"item_id": item_id})
        if not existing:
            item["created_at"] = _now()
            item["updated_at"] = _now()
            library_col.insert_one(item)
            seeded += 1
    # Create indexes
    library_col.create_index("item_id", unique=True)
    library_col.create_index("category")
    library_col.create_index("subcategory")
    library_col.create_index("service_style")
    library_col.create_index("tags")
    overrides_col.create_index("item_id")
    overrides_col.create_index("account_id")
    return seeded


# ─── Models ─────────────────────────────────────────────────────────

class PortionOverrideInput(BaseModel):
    item_id: str
    account_id: str = "default"
    property_id: str = "default"
    concept: str = ""
    meal_period: str = ""
    event_type: str = ""
    service_style: str = ""
    luxury_tier: str = ""
    restaurant_portion: Optional[dict] = None
    banquet_portion: Optional[dict] = None
    buffet_portion: Optional[dict] = None
    planning_defaults: Optional[dict] = None
    notes: str = ""


class PortionResolveInput(BaseModel):
    item_id: Optional[str] = None
    item_name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    service_style: str = "banquet"
    account_id: str = "default"
    property_id: str = "default"
    concept: str = ""
    meal_period: str = ""
    event_type: str = ""
    luxury_tier: str = ""


class RecipeScaleInput(BaseModel):
    item_id: str
    guest_count: int
    service_style: str = "banquet"
    account_id: str = "default"
    event_type: str = ""
    luxury_tier: str = ""
    overage_pct: float = 5.0


class BuffetReplenishInput(BaseModel):
    items: list[dict]  # [{item_id, guests_remaining, current_pans}]
    total_guests: int
    service_duration_hours: float = 2.0
    account_id: str = "default"
    event_type: str = ""


# ─── 1. Schema / Health ────────────────────────────────────────────

@router.get("/schema")
async def get_schema():
    count = library_col.count_documents({})
    override_count = overrides_col.count_documents({})
    categories = library_col.distinct("category")
    return {
        "schema_version": _SCHEMA_VERSION,
        "library_name": "LUCCCA Portion Library",
        "total_items": count,
        "total_overrides": override_count,
        "categories": sorted(categories),
        "units": {"weight_primary": "oz", "count_primary": "each"},
    }


# ─── 2. List / Search Items ───────────────────────────────────────

@router.get("/items")
async def list_items(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    service_style: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(200, le=500),
    offset: int = 0,
):
    query = {}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if service_style:
        query["service_style"] = service_style
    if tag:
        query["tags"] = tag
    if search:
        import re as _re
        query["item_name"] = {"$regex": _re.escape(search), "$options": "i"}

    items = list(library_col.find(query, {"_id": 0}).skip(offset).limit(limit))
    total = library_col.count_documents(query)
    return {"items": items, "total": total, "offset": offset, "limit": limit}


# ─── 3. Get Single Item ───────────────────────────────────────────

@router.get("/items/{item_id}")
async def get_item(item_id: str):
    item = library_col.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, f"Item '{item_id}' not found")
    return item


# ─── 4. Categories ────────────────────────────────────────────────

@router.get("/categories")
async def get_categories():
    pipeline = [
        {"$group": {
            "_id": {"category": "$category", "subcategory": "$subcategory"},
            "count": {"$sum": 1},
            "service_styles": {"$addToSet": "$service_style"},
        }},
        {"$sort": {"_id.category": 1, "_id.subcategory": 1}},
    ]
    results = list(library_col.aggregate(pipeline))
    categories = {}
    for r in results:
        cat = r["_id"]["category"]
        sub = r["_id"]["subcategory"]
        if cat not in categories:
            categories[cat] = {"subcategories": [], "total": 0}
        categories[cat]["subcategories"].append({
            "subcategory": sub,
            "count": r["count"],
            "service_styles": r["service_styles"],
        })
        categories[cat]["total"] += r["count"]
    return {"categories": categories}


# ─── 5. Resolve Portion (Smart Lookup with Overrides) ─────────────

@router.post("/resolve")
async def resolve_portion(data: PortionResolveInput):
    """
    Resolve the correct portion for a given context.
    Priority: override > exact match > category match (flagged estimated).
    """
    item = None
    estimated = False

    # 1. Try exact item_id match
    if data.item_id:
        item = library_col.find_one({"item_id": data.item_id}, {"_id": 0})

    # 2. Try name search
    if not item and data.item_name:
        import re as _re
        item = library_col.find_one(
            {"item_name": {"$regex": f"^{_re.escape(data.item_name)}$", "$options": "i"}},
            {"_id": 0}
        )
        if not item:
            item = library_col.find_one(
                {"item_name": {"$regex": _re.escape(data.item_name), "$options": "i"}},
                {"_id": 0}
            )

    # 3. Infer from nearest category match
    if not item and (data.category or data.subcategory):
        query = {}
        if data.subcategory:
            query["subcategory"] = data.subcategory
        elif data.category:
            query["category"] = data.category
        # Don't filter by service_style for inference — items have portions for all styles
        item = library_col.find_one(query, {"_id": 0})
        if item:
            estimated = True

    if not item:
        raise HTTPException(404, "No matching portion found in library")

    # 4. Check for overrides (most specific first)
    override = _find_best_override(
        item["item_id"],
        data.account_id,
        data.property_id,
        data.concept,
        data.meal_period,
        data.event_type,
        data.service_style,
        data.luxury_tier,
    )

    # 5. Apply override
    resolved = dict(item)
    override_applied = False
    if override:
        override_applied = True
        for key in ["restaurant_portion", "banquet_portion", "buffet_portion", "planning_defaults"]:
            if override.get(key):
                resolved[key] = override[key]

    # 6. Select the right portion for the requested service style
    portion_key = f"{data.service_style}_portion" if data.service_style in ("restaurant", "banquet", "buffet") else "banquet_portion"

    # For buffet service, prioritize buffet_portion for carving/passed items
    if data.service_style == "buffet":
        bp = resolved.get("buffet_portion", {})
        if bp and bp.get("min") is not None:
            portion_key = "buffet_portion"
        else:
            portion_key = "banquet_portion"

    active_portion = resolved.get(portion_key, {})

    # Apply luxury tier scaling (premium = +15%, ultra = +25%)
    luxury_scale = 1.0
    if data.luxury_tier == "premium":
        luxury_scale = 1.15
    elif data.luxury_tier == "ultra":
        luxury_scale = 1.25

    if active_portion and active_portion.get("min") is not None and active_portion.get("unit") == "oz":
        active_portion = dict(active_portion)
        active_portion["min"] = round(active_portion["min"] * luxury_scale, 1)
        active_portion["max"] = round((active_portion.get("max") or active_portion["min"]) * luxury_scale, 1)
        active_portion["display"] = f"{active_portion['min']}–{active_portion['max']} oz" if active_portion["min"] != active_portion["max"] else f"{active_portion['min']} oz"

    return {
        "item_id": resolved["item_id"],
        "item_name": resolved["item_name"],
        "category": resolved["category"],
        "subcategory": resolved["subcategory"],
        "service_style_requested": data.service_style,
        "portion_key_used": portion_key,
        "active_portion": active_portion,
        "restaurant_portion": resolved.get("restaurant_portion"),
        "banquet_portion": resolved.get("banquet_portion"),
        "buffet_portion": resolved.get("buffet_portion"),
        "planning_defaults": resolved.get("planning_defaults"),
        "estimated": estimated,
        "override_applied": override_applied,
        "luxury_tier": data.luxury_tier or "standard",
        "luxury_scale": luxury_scale,
        "tags": resolved.get("tags", []),
        "notes": resolved.get("notes"),
    }


def _find_best_override(item_id, account_id, property_id, concept, meal_period, event_type, service_style, luxury_tier):
    """Find the most specific override matching the context."""
    query = {"item_id": item_id}
    candidates = list(overrides_col.find(query, {"_id": 0}))
    if not candidates:
        return None

    def _score(ov):
        s = 0
        if ov.get("account_id") == account_id and account_id != "default":
            s += 16
        if ov.get("property_id") == property_id and property_id != "default":
            s += 8
        if ov.get("concept") == concept and concept:
            s += 4
        if ov.get("event_type") == event_type and event_type:
            s += 2
        if ov.get("luxury_tier") == luxury_tier and luxury_tier:
            s += 1
        return s

    candidates.sort(key=_score, reverse=True)
    best = candidates[0]
    if _score(best) == 0:
        return None
    return best


# ─── 6. Recipe Scaling ────────────────────────────────────────────

@router.post("/scale")
async def scale_for_guests(data: RecipeScaleInput):
    """
    Scale a portion item for a given guest count.
    Returns total raw amount needed including overage.
    """
    resolve_data = PortionResolveInput(
        item_id=data.item_id,
        service_style=data.service_style,
        account_id=data.account_id,
        event_type=data.event_type,
        luxury_tier=data.luxury_tier,
    )
    resolved = await resolve_portion(resolve_data)
    active = resolved["active_portion"]
    if not active or active.get("min") is None:
        raise HTTPException(400, f"No portion data available for '{data.item_id}' in {data.service_style} style")

    portion_per_guest = active.get("max", active.get("min", 0))
    unit = active.get("unit", "oz")
    overage_mult = 1 + (data.overage_pct / 100)

    total_raw = round(portion_per_guest * data.guest_count * overage_mult, 2)

    return {
        "item_id": data.item_id,
        "item_name": resolved["item_name"],
        "service_style": data.service_style,
        "guest_count": data.guest_count,
        "portion_per_guest": portion_per_guest,
        "unit": unit,
        "overage_pct": data.overage_pct,
        "total_needed": total_raw,
        "total_needed_lbs": round(total_raw / 16, 2) if unit == "oz" else None,
        "estimated": resolved["estimated"],
        "luxury_tier": resolved["luxury_tier"],
    }


# ─── 7. Buffet Replenishment ─────────────────────────────────────

@router.post("/buffet-replenishment")
async def buffet_replenishment(data: BuffetReplenishInput):
    """
    Calculate buffet replenishment needs for carving stations and passed items.
    Prioritizes buffet_portion when available.
    """
    results = []
    for req in data.items:
        item_id = req.get("item_id", "")
        guests_remaining = req.get("guests_remaining", data.total_guests)
        current_pans = req.get("current_pans", 0)

        item = library_col.find_one({"item_id": item_id}, {"_id": 0})
        if not item:
            results.append({"item_id": item_id, "error": "Not found"})
            continue

        # Prioritize buffet_portion for carving/passed
        bp = item.get("buffet_portion", {})
        if bp and bp.get("min") is not None:
            portion_oz = bp.get("max", bp.get("min", 5))
            unit = bp.get("unit", "oz")
        else:
            bqt = item.get("banquet_portion", {})
            portion_oz = bqt.get("max", bqt.get("min", 4)) if bqt else 4
            unit = bqt.get("unit", "oz") if bqt else "oz"

        # Calculate replenishment
        total_needed_oz = portion_oz * guests_remaining
        pan_capacity_oz = 160  # standard hotel pan ~10lbs
        pans_needed = max(1, -(-int(total_needed_oz) // pan_capacity_oz))  # ceil div
        additional_pans = max(0, pans_needed - current_pans)

        # Service rate (portions per hour based on duration)
        portions_per_hour = guests_remaining / max(data.service_duration_hours, 0.5)
        oz_per_hour = portions_per_hour * portion_oz

        results.append({
            "item_id": item_id,
            "item_name": item.get("item_name", ""),
            "portion_per_guest": portion_oz,
            "unit": unit,
            "guests_remaining": guests_remaining,
            "total_needed": round(total_needed_oz, 1),
            "total_needed_lbs": round(total_needed_oz / 16, 2) if unit == "oz" else None,
            "pans_needed": pans_needed,
            "current_pans": current_pans,
            "additional_pans_needed": additional_pans,
            "burn_rate_oz_per_hour": round(oz_per_hour, 1),
            "source": "buffet_portion" if (bp and bp.get("min") is not None) else "banquet_portion",
        })

    return {
        "total_guests": data.total_guests,
        "service_duration_hours": data.service_duration_hours,
        "items": results,
    }


# ─── 8. Override CRUD ─────────────────────────────────────────────

@router.post("/overrides")
async def create_override(data: PortionOverrideInput):
    """Create or update a portion override for a specific context."""
    item = library_col.find_one({"item_id": data.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, f"Base item '{data.item_id}' not found in library")

    doc = {
        "id": _uid(),
        "item_id": data.item_id,
        "account_id": data.account_id,
        "property_id": data.property_id,
        "concept": data.concept,
        "meal_period": data.meal_period,
        "event_type": data.event_type,
        "service_style": data.service_style,
        "luxury_tier": data.luxury_tier,
        "restaurant_portion": data.restaurant_portion,
        "banquet_portion": data.banquet_portion,
        "buffet_portion": data.buffet_portion,
        "planning_defaults": data.planning_defaults,
        "notes": data.notes,
        "created_at": _now(),
        "updated_at": _now(),
    }

    # Upsert: match on item_id + account_id + property_id + event_type + luxury_tier
    match_query = {
        "item_id": data.item_id,
        "account_id": data.account_id,
        "property_id": data.property_id,
        "event_type": data.event_type,
        "luxury_tier": data.luxury_tier,
    }
    existing = overrides_col.find_one(match_query)
    if existing:
        overrides_col.update_one(match_query, {"$set": {**doc, "updated_at": _now()}})
        doc["id"] = existing.get("id", doc["id"])
        return {"status": "updated", "override": doc}
    else:
        overrides_col.insert_one(doc)
        doc.pop("_id", None)
        return {"status": "created", "override": doc}


@router.get("/overrides")
async def list_overrides(
    item_id: Optional[str] = None,
    account_id: Optional[str] = None,
    event_type: Optional[str] = None,
):
    query = {}
    if item_id:
        query["item_id"] = item_id
    if account_id:
        query["account_id"] = account_id
    if event_type:
        query["event_type"] = event_type
    overrides = list(overrides_col.find(query, {"_id": 0}).limit(100))
    return {"overrides": overrides, "total": len(overrides)}


@router.delete("/overrides/{override_id}")
async def delete_override(override_id: str):
    result = overrides_col.delete_one({"id": override_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Override not found")
    return {"status": "deleted", "id": override_id}


# ─── Startup: Seed Library ────────────────────────────────────────

def init_portion_engine():
    """Call this on app startup to seed the portion library."""
    count = _seed_portion_library()
    total = library_col.count_documents({})
    return {"seeded": count, "total": total}
