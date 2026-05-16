"""
Smart Order Consolidation & Production Engine
===============================================
Consolidates ingredient orders across multiple simultaneous BEOs.
Applies recipe yields, splits cases, minimizes waste, tracks production timelines.
Integrates with buying programs (Avendra-style).
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db
import math

router = APIRouter(prefix="/api/production-engine", tags=["production-engine"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

BUYING_PROGRAMS = [
    {"id": "avendra", "name": "Avendra GPO", "discount_pct": 8, "categories": ["proteins", "dairy", "dry_goods", "produce"]},
    {"id": "foodbuy", "name": "Foodbuy", "discount_pct": 6, "categories": ["beverage", "chemicals", "supplies"]},
]

CASE_SIZES = {
    "Atlantic Salmon Fillet": {"case_qty": 10, "unit": "LB"},
    "Jumbo Shrimp 16/20": {"case_qty": 5, "unit": "LB"},
    "Chicken Breast Boneless": {"case_qty": 40, "unit": "LB"},
    "Heavy Cream 36%": {"case_qty": 4, "unit": "GAL"},
    "Unsalted Butter AA": {"case_qty": 36, "unit": "LB"},
    "Eggs Large Grade A": {"case_qty": 15, "unit": "DZ"},
    "Mixed Greens Organic": {"case_qty": 1, "unit": "CASE"},
    "Roma Tomatoes": {"case_qty": 25, "unit": "LB"},
    "Yukon Gold Potatoes": {"case_qty": 50, "unit": "LB"},
    "Olive Oil Extra Virgin": {"case_qty": 6, "unit": "GAL"},
    "AP Flour 50lb": {"case_qty": 1, "unit": "BAG"},
    "Granulated Sugar 50lb": {"case_qty": 1, "unit": "BAG"},
}


class ConsolidateInput(BaseModel):
    beo_ids: List[str]
    production_date: str  # Date items need to be ready
    include_yield_loss: bool = True
    yield_loss_pct: float = 8.0  # Default 8% trim/waste

class ProductionTimelineInput(BaseModel):
    beo_id: str
    ready_by: str = "06:45"  # Must be ready 15 min before serve


@router.post("/consolidate-orders")
async def consolidate_orders(data: ConsolidateInput):
    """Consolidate ingredient orders across multiple BEOs — splits cases, applies yields."""
    beos = list(db["beo_documents"].find({"id": {"$in": data.beo_ids}}, {"_id": 0}))
    if not beos:
        raise HTTPException(404, "No BEOs found")

    recipes = {r["name"].lower(): r for r in db["beo_recipes"].find({"status": "active"}, {"_id": 0})}

    # Aggregate all ingredients across all BEOs
    ingredient_needs = defaultdict(lambda: {"qty": 0, "unit": "", "beo_sources": [], "cost_per_unit": 0})

    for beo in beos:
        gc = beo["guaranteed_count"]
        scale = gc / 80  # Base recipes are for 80 portions
        for section in beo.get("menu_sections", []):
            for item in section.get("items", []):
                recipe = recipes.get(item.get("name", "").lower())
                if not recipe:
                    continue
                for ing in recipe.get("ingredients", []):
                    key = ing.get("name", "")
                    needed = ing.get("qty", 0) * scale
                    if data.include_yield_loss:
                        needed *= (1 + data.yield_loss_pct / 100)
                    ingredient_needs[key]["qty"] += needed
                    ingredient_needs[key]["unit"] = ing.get("unit", "")
                    ingredient_needs[key]["cost_per_unit"] = ing.get("cost_per_unit", 0)
                    ingredient_needs[key]["beo_sources"].append({
                        "beo_number": beo["beo_number"], "event": beo["event_name"],
                        "qty_for_this_beo": round(needed, 2),
                    })

    # Consolidate into case orders with splits
    order_lines = []
    total_cost = 0
    total_savings = 0

    for name, need in ingredient_needs.items():
        qty_needed = need["qty"]
        unit = need["unit"]
        case_info = CASE_SIZES.get(name, {"case_qty": 1, "unit": unit})
        case_qty = case_info["case_qty"]

        cases_needed = math.ceil(qty_needed / case_qty) if case_qty > 0 else 1
        total_ordered = cases_needed * case_qty
        surplus = round(total_ordered - qty_needed, 2)
        unit_cost = need["cost_per_unit"]
        line_cost = round(cases_needed * case_qty * unit_cost, 2)

        # Check buying program discount
        catalog_item = db["internal_catalog"].find_one({"name": {"$regex": name[:15], "$options": "i"}}, {"_id": 0, "category": 1})
        cat = catalog_item.get("category", "") if catalog_item else ""
        program_discount = 0
        program_name = ""
        for prog in BUYING_PROGRAMS:
            if cat in prog["categories"]:
                program_discount = prog["discount_pct"]
                program_name = prog["name"]
                break
        discount_amount = round(line_cost * program_discount / 100, 2)
        total_savings += discount_amount

        order_lines.append({
            "item": name, "unit": unit,
            "qty_needed_raw": round(qty_needed / (1 + data.yield_loss_pct / 100) if data.include_yield_loss else qty_needed, 2),
            "qty_with_yield": round(qty_needed, 2),
            "yield_loss_pct": data.yield_loss_pct if data.include_yield_loss else 0,
            "case_size": case_qty, "cases_to_order": cases_needed,
            "total_ordered": total_ordered, "surplus": surplus,
            "unit_cost": unit_cost, "line_cost": line_cost,
            "buying_program": program_name, "discount_pct": program_discount,
            "discount_amount": discount_amount, "net_cost": round(line_cost - discount_amount, 2),
            "split_across_beos": len(need["beo_sources"]),
            "beo_breakdown": need["beo_sources"],
        })
        total_cost += line_cost

    order_lines.sort(key=lambda x: -x["net_cost"])

    consolidated = {
        "id": f"corder-{_uid()}", "production_date": data.production_date,
        "beo_count": len(beos), "beo_ids": data.beo_ids,
        "total_unique_ingredients": len(order_lines),
        "total_cost": round(total_cost, 2),
        "program_savings": round(total_savings, 2),
        "net_cost": round(total_cost - total_savings, 2),
        "order_lines": order_lines,
        "status": "pending_chef_review", "created_at": _now(),
    }
    db["consolidated_orders"].insert_one(consolidated)
    consolidated.pop("_id", None)
    return consolidated


@router.post("/production-timeline")
async def generate_production_timeline(data: ProductionTimelineInput):
    """Generate a detailed production timeline with station assignments and fire times."""
    beo = db["beo_documents"].find_one({"id": data.beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    recipes = {r["name"].lower(): r for r in db["beo_recipes"].find({"status": "active"}, {"_id": 0})}
    ready_h, ready_m = map(int, data.ready_by.split(":"))
    ready_mins = ready_h * 60 + ready_m

    stations = defaultdict(list)
    timeline = []

    for section in beo.get("menu_sections", []):
        for item in section.get("items", []):
            recipe = recipes.get(item.get("name", "").lower())
            if not recipe:
                continue
            total_time = recipe.get("prep_time_minutes", 30) + recipe.get("cook_time_minutes", 0)
            start_mins = max(0, ready_mins - total_time - 15)  # 15 min buffer
            start_h, start_m = divmod(start_mins, 60)

            entry = {
                "item": recipe["name"], "station": recipe["station"],
                "start_prep": f"{start_h:02d}:{start_m:02d}",
                "prep_time": recipe["prep_time_minutes"],
                "cook_time": recipe["cook_time_minutes"],
                "fire_at": f"{(ready_mins - recipe.get('cook_time_minutes', 0)) // 60:02d}:{(ready_mins - recipe.get('cook_time_minutes', 0)) % 60:02d}",
                "plate_by": data.ready_by,
                "allergens": recipe.get("allergens", []),
                "portions": beo["guaranteed_count"],
            }
            timeline.append(entry)
            stations[recipe["station"]].append(entry)

    timeline.sort(key=lambda x: x["start_prep"])

    return {
        "beo_number": beo["beo_number"], "event": beo["event_name"],
        "ready_by": data.ready_by, "serve_time": beo["start_time"],
        "guest_count": beo["guaranteed_count"],
        "timeline": timeline,
        "by_station": dict(stations),
        "station_summary": {k: len(v) for k, v in stations.items()},
    }


@router.get("/buying-programs")
async def list_buying_programs():
    return {"programs": BUYING_PROGRAMS}


@router.get("/inventory-check")
async def check_inventory_for_beos(beo_ids: str = Query(...)):
    """Check what's on hand vs what's needed for given BEOs."""
    ids = beo_ids.split(",")
    beos = list(db["beo_documents"].find({"id": {"$in": ids}}, {"_id": 0}))
    recipes = {r["name"].lower(): r for r in db["beo_recipes"].find({"status": "active"}, {"_id": 0})}

    needs = defaultdict(float)
    for beo in beos:
        gc = beo["guaranteed_count"]
        scale = gc / 80
        for section in beo.get("menu_sections", []):
            for item in section.get("items", []):
                recipe = recipes.get(item.get("name", "").lower())
                if recipe:
                    for ing in recipe.get("ingredients", []):
                        needs[ing.get("name", "")] += ing.get("qty", 0) * scale * 1.08

    on_hand = {}
    for name in needs:
        inv = db["internal_catalog"].find_one({"name": {"$regex": name[:15], "$options": "i"}}, {"_id": 0, "on_hand": 1, "name": 1})
        on_hand[name] = inv.get("on_hand", 0) if inv else 0

    items = []
    for name, needed in needs.items():
        have = on_hand.get(name, 0)
        items.append({"item": name, "needed": round(needed, 2), "on_hand": have,
                       "shortfall": round(max(0, needed - have), 2), "covered": have >= needed})

    return {"items": items, "fully_covered": all(i["covered"] for i in items), "shortfalls": len([i for i in items if not i["covered"]])}
