"""
Purchasing Requisition Engine — Forecast-Driven Prep & Ordering
===============================================================
Connects the 21-Day Forecast outlet covers → Recipe DB ingredients
→ auto-generates prep lists with quantities, flags supplier
shortages 72 hours out, and creates purchase requisitions.

Flow: Forecast covers → Menu items needed → Recipe ingredients → Aggregate → PR
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
import math

router = APIRouter(prefix="/api/purchasing", tags=["purchasing"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# Outlet → popular menu items and their ingredient needs
OUTLET_MENU_MIX = {
    "Signature Italian": {
        "items": [
            {"name": "Lobster Linguine Arrabbiata", "pct": 18, "category": "pasta"},
            {"name": "Braised Short Rib", "pct": 15, "category": "entree"},
            {"name": "Heritage Chicken", "pct": 14, "category": "entree"},
            {"name": "Caesar Salad", "pct": 12, "category": "salad"},
            {"name": "Grilled Octopus", "pct": 10, "category": "appetizer"},
            {"name": "Turbot", "pct": 8, "category": "entree"},
            {"name": "Local Burrata", "pct": 8, "category": "appetizer"},
            {"name": "Agnolotti Primavera", "pct": 8, "category": "pasta"},
            {"name": "Dover Sole Meuniere", "pct": 4, "category": "entree"},
            {"name": "Bisteca alla Fiorentina", "pct": 3, "category": "entree"},
        ],
        "avg_check": 95,
    },
    "Rooftop Lounge": {
        "items": [
            {"name": "Wagyu Sliders", "pct": 18, "category": "appetizer"},
            {"name": "Lobster Roll", "pct": 14, "category": "appetizer"},
            {"name": "Cheese + Charcuterie", "pct": 12, "category": "appetizer"},
            {"name": "Shishito Peppers", "pct": 10, "category": "appetizer"},
            {"name": "Noir Martini", "pct": 15, "category": "cocktail"},
            {"name": "Citrus Veil", "pct": 8, "category": "cocktail"},
            {"name": "Shiso Pretty", "pct": 8, "category": "cocktail"},
            {"name": "New York Thymes", "pct": 8, "category": "cocktail"},
            {"name": "Chandon Brut Rose", "pct": 4, "category": "wine"},
            {"name": "Strawberry + Mint Crumble", "pct": 3, "category": "dessert"},
        ],
        "avg_check": 55,
    },
    "Pool Bar & Grill": {
        "items": [
            {"name": "Latin Burger", "pct": 25, "category": "entree"},
            {"name": "Tacos de Carnitas", "pct": 18, "category": "entree"},
            {"name": "Baja Tacos", "pct": 15, "category": "entree"},
            {"name": "Beef Quesadilla", "pct": 12, "category": "entree"},
            {"name": "Chicken-Avocado Wrap", "pct": 10, "category": "entree"},
            {"name": "Cheese Quesadilla", "pct": 8, "category": "entree"},
            {"name": "Veggie Burger", "pct": 6, "category": "entree"},
            {"name": "Ice Cream Sandwich", "pct": 3, "category": "dessert"},
            {"name": "Sorbet Frutina", "pct": 3, "category": "dessert"},
        ],
        "avg_check": 35,
    },
    "Family Dining": {
        "items": [
            {"name": "One Egg Breakfast", "pct": 25, "category": "breakfast"},
            {"name": "Petite Pancake", "pct": 20, "category": "breakfast"},
            {"name": "Mini Waffle", "pct": 20, "category": "breakfast"},
            {"name": "Nutella Crepe", "pct": 18, "category": "breakfast"},
            {"name": "Fruit Toast", "pct": 12, "category": "breakfast"},
            {"name": "Cold Island Buffet", "pct": 5, "category": "buffet"},
        ],
        "avg_check": 22,
    },
}

# Standard ingredient yields per cover for common items
INGREDIENT_YIELDS = {
    "Latin Burger": [
        {"ingredient": "Angus Ground Beef 8oz", "qty_per_cover": 0.5, "unit": "lb", "cost_per_unit": 6.50},
        {"ingredient": "Brioche Buns", "qty_per_cover": 1, "unit": "each", "cost_per_unit": 0.85},
        {"ingredient": "Applewood Bacon", "qty_per_cover": 0.12, "unit": "lb", "cost_per_unit": 8.50},
        {"ingredient": "Chihuahua Cheese", "qty_per_cover": 0.06, "unit": "lb", "cost_per_unit": 7.20},
        {"ingredient": "Mixed Lettuce", "qty_per_cover": 0.03, "unit": "lb", "cost_per_unit": 3.50},
    ],
    "Tacos de Carnitas": [
        {"ingredient": "Pork Shoulder", "qty_per_cover": 0.35, "unit": "lb", "cost_per_unit": 4.80},
        {"ingredient": "Corn Tortillas 6in", "qty_per_cover": 3, "unit": "each", "cost_per_unit": 0.12},
        {"ingredient": "Limes", "qty_per_cover": 0.5, "unit": "each", "cost_per_unit": 0.25},
        {"ingredient": "Salsa Verde", "qty_per_cover": 0.06, "unit": "lb", "cost_per_unit": 4.00},
    ],
    "Lobster Linguine Arrabbiata": [
        {"ingredient": "Lobster Tail 6oz", "qty_per_cover": 1, "unit": "each", "cost_per_unit": 14.50},
        {"ingredient": "Fresh Linguine", "qty_per_cover": 0.35, "unit": "lb", "cost_per_unit": 3.80},
        {"ingredient": "Calabrian Chili", "qty_per_cover": 0.02, "unit": "lb", "cost_per_unit": 18.00},
        {"ingredient": "San Marzano Tomatoes", "qty_per_cover": 0.15, "unit": "lb", "cost_per_unit": 3.20},
    ],
    "Braised Short Rib": [
        {"ingredient": "Bone-In Short Rib", "qty_per_cover": 0.75, "unit": "lb", "cost_per_unit": 12.80},
        {"ingredient": "Polenta (dry)", "qty_per_cover": 0.08, "unit": "lb", "cost_per_unit": 2.40},
        {"ingredient": "Cherry Peppers", "qty_per_cover": 0.04, "unit": "lb", "cost_per_unit": 5.60},
    ],
    "Heritage Chicken": [
        {"ingredient": "Heritage Chicken Breast", "qty_per_cover": 0.5, "unit": "lb", "cost_per_unit": 8.50},
        {"ingredient": "Wild Mushrooms", "qty_per_cover": 0.08, "unit": "lb", "cost_per_unit": 14.00},
        {"ingredient": "Leeks", "qty_per_cover": 0.06, "unit": "lb", "cost_per_unit": 3.80},
    ],
    "Wagyu Sliders": [
        {"ingredient": "Wagyu Ground Beef", "qty_per_cover": 0.25, "unit": "lb", "cost_per_unit": 22.00},
        {"ingredient": "Slider Brioche Buns", "qty_per_cover": 2, "unit": "each", "cost_per_unit": 0.65},
        {"ingredient": "Guinness Cheddar", "qty_per_cover": 0.04, "unit": "lb", "cost_per_unit": 12.00},
    ],
    "Baja Tacos": [
        {"ingredient": "Snapper Fillet", "qty_per_cover": 0.35, "unit": "lb", "cost_per_unit": 11.50},
        {"ingredient": "Flour Tortillas 6in", "qty_per_cover": 3, "unit": "each", "cost_per_unit": 0.15},
        {"ingredient": "Avocados", "qty_per_cover": 0.25, "unit": "each", "cost_per_unit": 1.80},
        {"ingredient": "Cabbage", "qty_per_cover": 0.04, "unit": "lb", "cost_per_unit": 1.20},
    ],
    "Caesar Salad": [
        {"ingredient": "Romaine Hearts", "qty_per_cover": 0.5, "unit": "each", "cost_per_unit": 1.40},
        {"ingredient": "Parmigiano Reggiano", "qty_per_cover": 0.03, "unit": "lb", "cost_per_unit": 22.00},
        {"ingredient": "Croutons", "qty_per_cover": 0.03, "unit": "lb", "cost_per_unit": 4.50},
    ],
    "One Egg Breakfast": [
        {"ingredient": "Cage Free Eggs", "qty_per_cover": 1, "unit": "each", "cost_per_unit": 0.45},
        {"ingredient": "Applewood Bacon", "qty_per_cover": 0.08, "unit": "lb", "cost_per_unit": 8.50},
        {"ingredient": "Breakfast Potatoes", "qty_per_cover": 0.12, "unit": "lb", "cost_per_unit": 1.80},
    ],
    "Petite Pancake": [
        {"ingredient": "Pancake Mix (dry)", "qty_per_cover": 0.15, "unit": "lb", "cost_per_unit": 2.20},
        {"ingredient": "Fresh Berries", "qty_per_cover": 0.06, "unit": "lb", "cost_per_unit": 8.50},
        {"ingredient": "Maple Syrup", "qty_per_cover": 0.03, "unit": "lb", "cost_per_unit": 12.00},
    ],
}


@router.get("/prep-list")
async def generate_prep_list(date: Optional[str] = None, outlet: Optional[str] = None, lookahead_days: int = 1):
    """Generate a prep list for a specific date based on forecast covers."""
    from routes.ops_forecast_21day import FORECAST_DATA, OUTLET_CAPTURE_RATES

    target_dates = []
    if date:
        target_dates = [date]
    else:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        for d in FORECAST_DATA[:lookahead_days]:
            target_dates.append(d["date"])
        if not target_dates:
            target_dates = [FORECAST_DATA[0]["date"]]

    all_ingredients = {}
    outlet_breakdown = {}

    for target_date in target_dates:
        day_data = next((d for d in FORECAST_DATA if d["date"] == target_date), None)
        if not day_data:
            continue

        guests = day_data["guest_count"]

        for outlet_name, rates in OUTLET_CAPTURE_RATES.items():
            if outlet and outlet != outlet_name:
                continue
            if rates["type"] == "banquet":
                continue

            covers = round(guests * rates["capture_pct"] / 100)
            mix = OUTLET_MENU_MIX.get(outlet_name, {})

            for item in mix.get("items", []):
                item_covers = round(covers * item["pct"] / 100)
                if item_covers == 0:
                    continue

                yields = INGREDIENT_YIELDS.get(item["name"], [])
                for ing in yields:
                    key = ing["ingredient"]
                    qty = ing["qty_per_cover"] * item_covers
                    cost = qty * ing["cost_per_unit"]

                    if key not in all_ingredients:
                        all_ingredients[key] = {
                            "ingredient": key, "unit": ing["unit"],
                            "total_qty": 0, "total_cost": 0, "cost_per_unit": ing["cost_per_unit"],
                            "sources": [],
                        }
                    all_ingredients[key]["total_qty"] = round(all_ingredients[key]["total_qty"] + qty, 2)
                    all_ingredients[key]["total_cost"] = round(all_ingredients[key]["total_cost"] + cost, 2)
                    all_ingredients[key]["sources"].append({
                        "outlet": outlet_name, "item": item["name"],
                        "covers": item_covers, "qty": round(qty, 2),
                    })

                    outlet_breakdown.setdefault(outlet_name, {"covers": 0, "cost": 0, "items": 0})
                    outlet_breakdown[outlet_name]["covers"] = max(outlet_breakdown[outlet_name]["covers"], covers)
                    outlet_breakdown[outlet_name]["cost"] += cost

    # Sort by cost descending
    ingredients_list = sorted(all_ingredients.values(), key=lambda x: x["total_cost"], reverse=True)
    total_cost = sum(i["total_cost"] for i in ingredients_list)

    # Check for shortage flags (72-hour lookahead)
    shortages = []
    for ing in ingredients_list:
        try:
            search_term = ing["ingredient"][:15].replace("(", "").replace(")", "")
            inv = db["inventory_items"].find_one(
                {"name": {"$regex": search_term, "$options": "i"}}, {"_id": 0}
            )
        except Exception:
            inv = None
        par = inv.get("par_level", 0) if inv else 0
        on_hand = inv.get("on_hand", 0) if inv else 0
        if on_hand < ing["total_qty"]:
            shortages.append({
                "ingredient": ing["ingredient"],
                "needed": ing["total_qty"],
                "on_hand": on_hand,
                "deficit": round(ing["total_qty"] - on_hand, 2),
                "unit": ing["unit"],
                "est_cost": round((ing["total_qty"] - on_hand) * ing["cost_per_unit"], 2),
            })

    return {
        "dates": target_dates,
        "prep_list": ingredients_list,
        "total_ingredients": len(ingredients_list),
        "total_cost": round(total_cost, 2),
        "outlet_breakdown": outlet_breakdown,
        "shortages": shortages,
        "shortage_count": len(shortages),
    }


@router.post("/requisition")
async def create_purchase_requisition(body: dict = {}):
    """Create a purchase requisition from the prep list."""
    req_id = f"pr-{_uid()}"
    doc = {
        "requisition_id": req_id,
        "date": body.get("date", _now()[:10]),
        "outlet": body.get("outlet", "all"),
        "items": body.get("items", []),
        "total_cost": body.get("total_cost", 0),
        "status": "pending",
        "requested_by": body.get("requested_by", ""),
        "approved_by": None,
        "created_at": _now(),
    }
    db["purchase_requisitions"].insert_one({**doc, "_id": req_id})
    # iter194 · FM-Upgrade 1 · TimelineEvent — PO drafted
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import PO_DRAFTED
        _tl(PO_DRAFTED,
            actor={"type": "user", "id": doc.get("requested_by") or "ops", "name": doc.get("requested_by") or "Ops"},
            entity_refs=[{"kind": "purchase_requisition", "id": req_id}],
            payload={"outlet": doc.get("outlet"), "line_count": len(doc.get("items") or []),
                     "total_cost": doc.get("total_cost"), "commodity": "mixed",
                     "quantity": len(doc.get("items") or []), "unit": "lines"},
            idempotency_key=f"po.drafted:{req_id}")
    except Exception: pass
    return doc


@router.get("/requisitions")
async def list_requisitions(status: Optional[str] = None):
    """List all purchase requisitions."""
    q: dict = {}
    if status:
        q["status"] = status
    reqs = list(db["purchase_requisitions"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"requisitions": reqs, "total": len(reqs)}


@router.put("/requisitions/{req_id}/approve")
async def approve_requisition(req_id: str, body: dict = {}):
    """Approve a purchase requisition."""
    result = db["purchase_requisitions"].update_one(
        {"requisition_id": req_id},
        {"$set": {"status": "approved", "approved_by": body.get("approved_by", ""), "approved_at": _now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Requisition not found")
    # iter194 · FM-Upgrade 1 — PO approved
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import PO_APPROVED
        _tl(PO_APPROVED,
            actor={"type": "user", "id": body.get("approved_by") or "admin", "name": body.get("approved_by") or "Admin"},
            entity_refs=[{"kind": "purchase_requisition", "id": req_id}],
            payload={"approved_by": body.get("approved_by")},
            idempotency_key=f"po.approved:{req_id}")
    except Exception: pass
    return {"requisition_id": req_id, "status": "approved"}


@router.get("/dashboard")
async def purchasing_dashboard():
    """Purchasing dashboard with cost projections."""
    from routes.ops_forecast_21day import FORECAST_DATA, OUTLET_CAPTURE_RATES

    # Project next 7 days of costs
    weekly_cost = 0
    daily_projections = []
    for day in FORECAST_DATA[:7]:
        guests = day["guest_count"]
        day_cost = 0
        for outlet_name, rates in OUTLET_CAPTURE_RATES.items():
            if rates["type"] == "banquet":
                continue
            covers = round(guests * rates["capture_pct"] / 100)
            mix = OUTLET_MENU_MIX.get(outlet_name, {})
            for item in mix.get("items", []):
                item_covers = round(covers * item["pct"] / 100)
                yields = INGREDIENT_YIELDS.get(item["name"], [])
                for ing in yields:
                    day_cost += ing["qty_per_cover"] * item_covers * ing["cost_per_unit"]

        weekly_cost += day_cost
        daily_projections.append({
            "date": day["date"], "dow": day["dow"],
            "guests": guests, "projected_food_cost": round(day_cost, 2),
        })

    pending_prs = db["purchase_requisitions"].count_documents({"status": "pending"})
    approved_prs = db["purchase_requisitions"].count_documents({"status": "approved"})

    return {
        "weekly_projected_cost": round(weekly_cost, 2),
        "daily_projections": daily_projections,
        "pending_requisitions": pending_prs,
        "approved_requisitions": approved_prs,
        "ingredients_tracked": len(INGREDIENT_YIELDS),
        "outlets_tracked": len(OUTLET_MENU_MIX),
    }
