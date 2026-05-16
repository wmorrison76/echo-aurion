"""
EchoAi3 — Master Chef Engine
==============================
Complete culinary intelligence for FOH/BOH operations.

Capabilities:
1. Recipe Generation — AI creates recipes for menu items, costs them, marks as EchoAi-generated, requires chef approval
2. BEO Production Planning — Calculate hours, case qty, check inventory, transfers, usage, receiving, commissary
3. Kitchen Design & Workflow — Equipment specs, station layout, production flow, line design
4. Flavor Matrix & R&D — Map chef flavor profiles, generate recipes in a chef's style
5. FOH/BOH Operations Knowledge — Deep operational expertise
6. Purchasing Intelligence — Order history, brand matching, vendor selection, par-based ordering
"""
import os
import json
import math
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/masterchef", tags=["echoai3-masterchef"])

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]


# ═══════════════════════════════════════════════════════════════════
# 1. RECIPE GENERATION ENGINE
# ═══════════════════════════════════════════════════════════════════

class RecipeGenerateRequest(BaseModel):
    menu_item_name: str
    category: str = ""
    cuisine: str = ""
    target_food_cost_pct: float = 28.0
    servings: int = 4
    chef_style_id: Optional[str] = None
    dietary_tags: list = []
    notes: Optional[str] = None


class RecipeApproveRequest(BaseModel):
    recipe_id: str
    approved: bool
    chef_notes: Optional[str] = None
    modifications: Optional[dict] = None


async def _generate_recipe_ai(req: RecipeGenerateRequest) -> dict:
    """Use AI to generate a professional recipe."""
    # Get chef's flavor profile if specified
    chef_profile = ""
    if req.chef_style_id:
        profile = db["chef_flavor_profiles"].find_one({"chef_id": req.chef_style_id}, {"_id": 0})
        if profile:
            chef_profile = (
                f"\n\nCHEF STYLE PROFILE: {profile.get('chef_name', '')}\n"
                f"Flavor signatures: {', '.join(profile.get('flavor_signatures', []))}\n"
                f"Preferred techniques: {', '.join(profile.get('preferred_techniques', []))}\n"
                f"Cuisine influences: {', '.join(profile.get('cuisine_influences', []))}\n"
                f"Plating style: {profile.get('plating_style', '')}\n"
                f"Generate this recipe IN THIS CHEF'S STYLE — use their flavor combinations and techniques."
            )

    # Get existing ingredients for cost reference
    ingredients_ref = list(db["ingredients"].find({}, {"_id": 0, "name": 1, "current_cost": 1, "unit": 1, "category": 1}).limit(100))
    cost_ref = {i["name"].lower(): i for i in ingredients_ref}
    cost_context = "Available ingredients with costs:\n" + "\n".join(
        f"- {i['name']}: ${i.get('current_cost', 0)}/{i.get('unit', 'each')}"
        for i in ingredients_ref[:30]
    )

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=f"recipe-gen-{_uid()}",
            system_message=(
                "You are EchoAi³ Master Chef — a professional culinary AI with Michelin-level recipe development skills. "
                "Generate recipes that are production-ready for a luxury resort kitchen. "
                "Include precise measurements, professional techniques, and plating instructions. "
                "Format all responses as valid JSON only — no markdown."
                f"{chef_profile}"
            ),
        )
        chat.with_model("openai", "gpt-4.1-mini")

        dietary = f"\nDietary requirements: {', '.join(req.dietary_tags)}" if req.dietary_tags else ""
        notes = f"\nSpecial notes: {req.notes}" if req.notes else ""

        prompt = f"""Generate a professional recipe for: {req.menu_item_name}
Category: {req.category or 'entree'}
Cuisine: {req.cuisine or 'contemporary American'}
Target food cost: {req.target_food_cost_pct}% of menu price
Servings: {req.servings}{dietary}{notes}

{cost_context}

Return ONLY valid JSON:
{{
  "name": "...",
  "description": "2-3 sentence description",
  "category": "...",
  "cuisine": "...",
  "yield_qty": {req.servings},
  "yield_unit": "portions",
  "prep_time_min": 0,
  "cook_time_min": 0,
  "difficulty": "intermediate",
  "ingredients": [
    {{"name": "...", "quantity": 0.0, "unit": "...", "estimated_cost": 0.00, "prep_note": "..."}}
  ],
  "instructions": [
    {{"step": 1, "instruction": "...", "time_min": 0, "technique": "...", "critical_point": false}}
  ],
  "plating": "Detailed plating description",
  "flavor_profile": {{
    "primary": ["..."],
    "secondary": ["..."],
    "texture": ["..."],
    "temperature": "hot/cold/ambient",
    "intensity": "light/medium/bold"
  }},
  "allergens": ["..."],
  "suggested_menu_price": 0.00,
  "estimated_food_cost": 0.00,
  "estimated_food_cost_pct": 0.0,
  "wine_pairing": "...",
  "chef_tips": ["..."]
}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        text = response.strip() if isinstance(response, str) else str(response).strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3].strip()
        return json.loads(text)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI recipe response", "raw": text[:500] if 'text' in dir() else ""}
    except Exception as e:
        return {"error": f"Recipe generation failed: {str(e)[:200]}"}


# ═══════════════════════════════════════════════════════════════════
# 2. BEO PRODUCTION PLANNING ENGINE
# ═══════════════════════════════════════════════════════════════════

class BEOProductionRequest(BaseModel):
    beo_id: Optional[str] = None
    event_name: str = ""
    covers: int = 100
    menu_items: list = []
    service_time: str = "19:00"
    event_type: str = "plated_dinner"


def _calculate_production_plan(req: BEOProductionRequest) -> dict:
    """Calculate full production plan from BEO."""
    covers = req.covers

    # Get BEO data if ID provided
    beo = None
    if req.beo_id:
        beo = db["beos"].find_one({"beo_id": req.beo_id}, {"_id": 0})
        if beo:
            covers = beo.get("guest_count", covers)
            req.menu_items = req.menu_items or [m.get("name", "") for m in beo.get("menu", [])]

    # Get recipes for menu items
    recipe_data = []
    total_ingredient_need = {}
    total_prep_hours = 0

    for item_name in req.menu_items:
        recipe = db["recipes"].find_one(
            {"name": {"$regex": item_name, "$options": "i"}}, {"_id": 0}
        )
        if recipe:
            scale_factor = covers / max(recipe.get("yield_qty", 4), 1)
            prep_time = recipe.get("prep_time_min", 30) * math.log2(max(scale_factor, 1) + 1)
            cook_time = recipe.get("cook_time_min", 20)

            scaled_ingredients = []
            for ing in recipe.get("ingredients", []):
                qty = ing.get("quantity", 0) * scale_factor
                # Large batch seasoning adjustment
                if scale_factor > 10 and any(s in ing.get("name", "").lower() for s in ["salt", "pepper", "spice"]):
                    qty *= 0.85
                name = ing.get("name", "")
                unit = ing.get("unit", "each")
                scaled_ingredients.append({"name": name, "quantity": round(qty, 2), "unit": unit})

                # Aggregate ingredient needs
                key = name.lower()
                if key not in total_ingredient_need:
                    total_ingredient_need[key] = {"name": name, "quantity": 0, "unit": unit}
                total_ingredient_need[key]["quantity"] += qty

            total_prep_hours += prep_time / 60
            recipe_data.append({
                "item": item_name,
                "found_recipe": True,
                "scale_factor": round(scale_factor, 1),
                "prep_time_hours": round(prep_time / 60, 1),
                "cook_time_min": cook_time,
                "scaled_ingredients": scaled_ingredients,
            })
        else:
            # No recipe found — estimate
            est_prep = covers * 0.02  # 0.02 hours per cover per item
            total_prep_hours += est_prep
            recipe_data.append({
                "item": item_name,
                "found_recipe": False,
                "estimated_prep_hours": round(est_prep, 1),
                "note": "Recipe not in database — EchoAi³ can generate one (POST /masterchef/generate-recipe)",
            })

    # Check inventory against needs
    inventory_check = []
    for key, need in total_ingredient_need.items():
        inv = db["ingredients"].find_one(
            {"name": {"$regex": need["name"], "$options": "i"}}, {"_id": 0}
        )
        if inv:
            current = inv.get("current_stock", 0)
            deficit = max(0, need["quantity"] - current)
            inventory_check.append({
                "ingredient": need["name"],
                "needed": round(need["quantity"], 2),
                "on_hand": current,
                "deficit": round(deficit, 2),
                "unit": need["unit"],
                "status": "OK" if deficit == 0 else "ORDER_NEEDED",
                "par_level": inv.get("par_level", 0),
            })
        else:
            inventory_check.append({
                "ingredient": need["name"],
                "needed": round(need["quantity"], 2),
                "on_hand": 0,
                "deficit": round(need["quantity"], 2),
                "unit": need["unit"],
                "status": "NOT_IN_SYSTEM",
            })

    # Calculate case quantities for ordering
    order_list = []
    for item in inventory_check:
        if item["status"] != "OK":
            # Check order history for brand/product
            history = db["purchase_orders"].find_one(
                {"items.name": {"$regex": item["ingredient"], "$options": "i"}}, {"_id": 0}
            )
            brand = ""
            vendor = ""
            case_size = 1
            if history:
                for hi in history.get("items", []):
                    if item["ingredient"].lower() in hi.get("name", "").lower():
                        brand = hi.get("brand", "")
                        case_size = hi.get("case_size", hi.get("pack_size", 1))
                        break
                vendor = history.get("vendor", history.get("vendor_name", ""))

            cases_needed = math.ceil(item["deficit"] / max(case_size, 1))
            order_list.append({
                "ingredient": item["ingredient"],
                "quantity_needed": item["deficit"],
                "unit": item["unit"],
                "case_size": case_size,
                "cases_to_order": cases_needed,
                "preferred_brand": brand,
                "preferred_vendor": vendor,
                "source": "commissary" if brand else "vendor",
                "status": "awaiting_approval",
            })

    # Labor hours calculation
    cooks_needed = max(2, covers // 40)
    prep_cooks = max(1, covers // 60)
    total_labor_hours = round(total_prep_hours + (covers * 0.015), 1)

    # Parse service time
    try:
        svc_h, svc_m = map(int, req.service_time.split(":"))
    except Exception:
        svc_h, svc_m = 19, 0

    kitchen_call_hours_before = max(4, total_prep_hours + 2)
    call_h = svc_h - int(kitchen_call_hours_before)
    call_m = svc_m
    if call_h < 0:
        call_h += 24

    return {
        "event": req.event_name or (beo.get("event_name", "") if beo else ""),
        "covers": covers,
        "service_time": req.service_time,
        "event_type": req.event_type,
        "menu_items": recipe_data,
        "total_prep_hours": round(total_prep_hours, 1),
        "total_labor_hours": total_labor_hours,
        "kitchen_call_time": f"{call_h:02d}:{call_m:02d}",
        "staffing": {
            "cooks_needed": cooks_needed,
            "prep_cooks": prep_cooks,
            "total_boh": cooks_needed + prep_cooks,
            "servers_needed": max(2, covers // 20),
        },
        "inventory_check": inventory_check,
        "items_to_order": order_list,
        "items_ok": sum(1 for i in inventory_check if i["status"] == "OK"),
        "items_need_order": sum(1 for i in inventory_check if i["status"] != "OK"),
    }


# ═══════════════════════════════════════════════════════════════════
# 3. KITCHEN DESIGN & WORKFLOW
# ═══════════════════════════════════════════════════════════════════

KITCHEN_STATIONS = {
    "hot_line": {"name": "Hot Line", "equipment": ["6-burner range", "flat-top griddle", "salamander", "convection oven", "steam table"], "staff": "1-3 cooks", "flow": "Receives prepped ingredients → cooks to order → plates → passes to expo"},
    "cold_station": {"name": "Cold Station / Garde Manger", "equipment": ["prep table", "lowboy refrigerator", "mandoline", "immersion blender", "vacuum sealer"], "staff": "1-2 cooks", "flow": "Cold apps, salads, ceviches, garnishes → plates → passes to expo"},
    "grill": {"name": "Grill Station", "equipment": ["charbroiler", "wood-fire grill", "rotisserie", "smoker"], "staff": "1-2 cooks", "flow": "Proteins and vegetables → marks/chars → rests → plates"},
    "saute": {"name": "Sauté Station", "equipment": ["sauté pans", "induction burners", "sauce pots", "reduction station"], "staff": "1-2 cooks", "flow": "Pan sauces, sautéed dishes, pasta → plates → expo"},
    "pastry": {"name": "Pastry Station", "equipment": ["deck oven", "sheeter", "proof box", "ice cream machine", "chocolate temperer", "stand mixer"], "staff": "1-2 pastry cooks", "flow": "Baked goods, desserts, bread, petit fours → plates/displays"},
    "prep": {"name": "Prep Area", "equipment": ["robot coupe", "tilting skillet", "stock pots", "immersion circulator", "vacuum tumbler"], "staff": "2-4 prep cooks", "flow": "Raw ingredients → wash → cut/portion → mise en place → distribute to stations"},
    "dish": {"name": "Dish / Stewarding", "equipment": ["flight-type dishwasher", "pot sink", "chemical dispensers", "glass washer"], "staff": "2-3 stewards", "flow": "Dirty → scrape → wash → sanitize → store → redistribute"},
    "expo": {"name": "Expo / Pass", "equipment": ["heat lamps", "ticket rail", "garnish station", "expeditor screen"], "staff": "1 (chef or sous)", "flow": "Quality check → garnish → temperature verify → hand to server"},
    "receiving": {"name": "Receiving Dock", "equipment": ["platform scale", "thermometer", "pallet jack", "date labeler"], "staff": "1 receiver", "flow": "Delivery → inspect → weigh → temp check → label → store"},
    "walk_in": {"name": "Walk-in Storage", "equipment": ["walk-in cooler (34-38°F)", "walk-in freezer (0°F)", "dry storage shelving", "FIFO labels"], "staff": "Shared", "flow": "Received goods → categorize → FIFO rotate → monitor temps"},
    "banquet_kitchen": {"name": "Banquet Kitchen", "equipment": ["combi ovens", "tilt kettles", "blast chiller", "holding cabinets", "banquet carts"], "staff": "Scaled to event", "flow": "Bulk prep → cook → hold at temp → plate/serve → transport to venue"},
}

EQUIPMENT_SPECS = {
    "combi_oven": {"name": "Combi Oven", "cost_range": "$15,000-60,000", "capacity": "10-40 hotel pans", "power": "208-480V, 30-60 kW", "use": "Steam, convection, combination cooking", "maintenance": "Daily cleaning, annual service"},
    "tilt_kettle": {"name": "Tilting Braising Pan", "cost_range": "$8,000-25,000", "capacity": "30-80 gallon", "use": "Stocks, soups, braises, sauces in volume"},
    "blast_chiller": {"name": "Blast Chiller", "cost_range": "$5,000-20,000", "capacity": "40-200 lbs/cycle", "use": "HACCP compliance — 135°F to 41°F in <4h"},
    "walk_in_cooler": {"name": "Walk-in Cooler", "cost_range": "$8,000-30,000", "size": "8x10 to 20x30 ft", "temp": "34-38°F", "maintenance": "Coil cleaning quarterly, door gaskets annually"},
    "flight_dishwasher": {"name": "Flight-Type Dishwasher", "cost_range": "$30,000-100,000", "capacity": "200-350 racks/hour", "use": "High-volume banquet and restaurant operations"},
    "robocoup": {"name": "Robot Coupe Food Processor", "cost_range": "$1,500-5,000", "use": "Chopping, slicing, puréeing, emulsifying"},
    "immersion_circulator": {"name": "Immersion Circulator (Sous Vide)", "cost_range": "$500-3,000", "use": "Precise temperature cooking, proteins, vegetables"},
    "deck_oven": {"name": "Deck Oven", "cost_range": "$10,000-40,000", "use": "Bread, pastry, pizza — stone or steel decks"},
    "charbroiler": {"name": "Charbroiler/Grill", "cost_range": "$3,000-12,000", "use": "Proteins, vegetables — char marks and smoke flavor"},
    "steam_table": {"name": "Steam Table", "cost_range": "$1,500-5,000", "use": "Hot holding for buffet and banquet service"},
}


# ═══════════════════════════════════════════════════════════════════
# 4. FLAVOR MATRIX & R&D
# ═══════════════════════════════════════════════════════════════════

FLAVOR_DIMENSIONS = {
    "sweet": ["sugar", "honey", "maple", "caramel", "fruit", "chocolate", "vanilla", "mirin"],
    "salty": ["salt", "soy sauce", "fish sauce", "miso", "anchovy", "capers", "olives", "cured meat"],
    "sour": ["lemon", "lime", "vinegar", "wine", "tomato", "yogurt", "tamarind", "pickled"],
    "bitter": ["arugula", "radicchio", "dark chocolate", "coffee", "turmeric", "grapefruit", "charred"],
    "umami": ["parmesan", "mushroom", "dashi", "tomato paste", "aged cheese", "bone broth", "miso", "soy"],
    "spicy": ["chili", "pepper", "wasabi", "horseradish", "ginger", "mustard", "szechuan", "harissa"],
    "herbaceous": ["basil", "cilantro", "parsley", "thyme", "rosemary", "mint", "dill", "tarragon"],
    "earthy": ["truffle", "beetroot", "mushroom", "root vegetable", "lentil", "walnut", "cumin"],
    "floral": ["lavender", "rose", "elderflower", "chamomile", "jasmine", "saffron", "hibiscus"],
    "smoky": ["smoked salt", "chipotle", "paprika", "charcoal", "wood-fired", "bacon", "lapsang"],
}

class FlavorProfileRequest(BaseModel):
    chef_id: str
    chef_name: str
    flavor_signatures: list = []
    preferred_techniques: list = []
    cuisine_influences: list = []
    plating_style: str = ""
    signature_dishes: list = []


class AnalyzeFlavorRequest(BaseModel):
    recipe_name: str = ""
    ingredients: list = []


# ═══════════════════════════════════════════════════════════════════
# FOH/BOH OPERATIONS KNOWLEDGE
# ═══════════════════════════════════════════════════════════════════

FOH_BOH_KNOWLEDGE = {
    "boh_stations": KITCHEN_STATIONS,
    "equipment": EQUIPMENT_SPECS,
    "food_safety": {
        "haccp_principles": [
            "Conduct hazard analysis",
            "Determine Critical Control Points (CCPs)",
            "Establish critical limits",
            "Establish monitoring procedures",
            "Establish corrective actions",
            "Establish verification procedures",
            "Establish record-keeping and documentation",
        ],
        "temperature_danger_zone": "41°F - 135°F (5°C - 57°C)",
        "cooling_requirement": "135°F to 70°F in 2h, then 70°F to 41°F in 4h (total 6h)",
        "reheating_requirement": "To 165°F within 2h",
        "minimum_cooking_temps": {
            "poultry": "165°F (74°C)",
            "ground_meat": "155°F (68°C)",
            "pork_beef_whole": "145°F (63°C) + 3 min rest",
            "fish": "145°F (63°C)",
            "eggs_immediate": "145°F (63°C)",
            "fruits_vegetables": "135°F (57°C) for hot holding",
        },
        "handwashing": "20 seconds with soap and warm water (100°F)",
    },
    "production_methods": {
        "a_la_minute": "Cooked to order — highest quality, slowest service",
        "batch_cooking": "Cook in timed batches to maintain freshness during high volume",
        "sous_vide": "Vacuum-sealed, precise temperature — ideal for proteins, consistency",
        "advance_prep": "Mise en place done hours/day before service — sauces, stocks, portioned proteins",
        "cook_chill": "Cook → rapidly cool → refrigerate → reheat — ideal for banquets, commissary",
        "cook_freeze": "Cook → blast freeze → store — up to 3 months, quality maintained",
    },
    "foh_service_styles": {
        "french": "Guerdon/tableside, silver service, platter to plate at table",
        "russian": "Food plated in kitchen, served from the left",
        "american": "Pre-plated in kitchen, served from the right",
        "buffet": "Self-service stations, requires sneeze guards, temperature monitoring",
        "family_style": "Platters to table, guests serve themselves",
        "tasting_menu": "Multi-course, small portions, sommelier-paired, 2-3 hour experience",
    },
    "banquet_production_formulas": {
        "covers_to_labor_hours": "1 cook per 40 covers (plated), 1 per 60 (buffet)",
        "servers_per_covers": "1 per 20 (plated), 1 per 40 (buffet)",
        "prep_time_multiplier": "Base recipe time × log2(scale_factor + 1)",
        "seasoning_scale_adjustment": "Reduce by 15% for batches >10x original",
        "liquid_scale_adjustment": "Reduce by 10% for batches >10x original",
    },
}


# ═══════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

# ─── Recipe Generation ───

@router.post("/generate-recipe")
async def generate_recipe(req: RecipeGenerateRequest):
    """AI generates a professional recipe, costs it, marks as EchoAi-generated, adds to DB pending chef approval."""
    recipe_data = await _generate_recipe_ai(req)
    if "error" in recipe_data:
        return recipe_data

    recipe_id = f"echoai-recipe-{_uid()}"

    # Calculate actual cost using ingredient DB
    total_cost = 0
    for ing in recipe_data.get("ingredients", []):
        db_ing = db["ingredients"].find_one({"name": {"$regex": ing.get("name", ""), "$options": "i"}}, {"_id": 0})
        if db_ing:
            total_cost += db_ing.get("current_cost", 0) * ing.get("quantity", 0)
        else:
            total_cost += ing.get("estimated_cost", 0)

    # Build full recipe record
    record = {
        "id": recipe_id,
        "name": recipe_data.get("name", req.menu_item_name),
        "description": recipe_data.get("description", ""),
        "category": recipe_data.get("category", req.category),
        "cuisine": recipe_data.get("cuisine", req.cuisine),
        "yield_qty": recipe_data.get("yield_qty", req.servings),
        "yield_unit": recipe_data.get("yield_unit", "portions"),
        "prep_time_min": recipe_data.get("prep_time_min", 0),
        "cook_time_min": recipe_data.get("cook_time_min", 0),
        "difficulty": recipe_data.get("difficulty", "intermediate"),
        "ingredients": recipe_data.get("ingredients", []),
        "instructions": recipe_data.get("instructions", []),
        "plating": recipe_data.get("plating", ""),
        "flavor_profile": recipe_data.get("flavor_profile", {}),
        "allergens": recipe_data.get("allergens", []),
        "dietary_tags": req.dietary_tags,
        "menu_price": recipe_data.get("suggested_menu_price", 0),
        "total_food_cost": round(total_cost, 2),
        "food_cost_pct": round(total_cost / max(recipe_data.get("suggested_menu_price", 1), 1) * 100, 1),
        "target_food_cost_pct": req.target_food_cost_pct,
        "wine_pairing": recipe_data.get("wine_pairing", ""),
        "chef_tips": recipe_data.get("chef_tips", []),
        "source": "echoai3_generated",
        "chef_style_id": req.chef_style_id,
        "status": "pending_approval",
        "created_at": _now(),
    }

    db["recipes"].insert_one({**record})
    record.pop("_id", None)

    trace_log(event_type="recipe_generated", entity_type="masterchef", entity_id=recipe_id, actor_id="echoai3",
              metadata={"name": record["name"], "cost": total_cost})

    return {"recipe_id": recipe_id, "recipe": record, "status": "pending_approval",
            "message": "Recipe generated and added to database. Awaiting chef approval."}


@router.post("/approve-recipe")
async def approve_recipe(req: RecipeApproveRequest):
    """Chef approves or rejects an AI-generated recipe."""
    recipe = db["recipes"].find_one({"id": req.recipe_id}, {"_id": 0})
    if not recipe:
        return {"error": "Recipe not found"}

    new_status = "approved" if req.approved else "rejected"
    update = {"status": new_status, "approved_at": _now(), "chef_notes": req.chef_notes or ""}
    if req.modifications:
        update["modifications"] = req.modifications
    db["recipes"].update_one({"id": req.recipe_id}, {"$set": update})

    trace_log(event_type="recipe_approval", entity_type="masterchef", entity_id=req.recipe_id, actor_id="chef",
              metadata={"approved": req.approved, "notes": req.chef_notes})

    return {"recipe_id": req.recipe_id, "status": new_status, "message": f"Recipe {'approved' if req.approved else 'rejected'} by chef."}


@router.get("/pending-recipes")
async def pending_recipes():
    """Get all AI-generated recipes pending chef approval."""
    recipes = list(db["recipes"].find({"source": "echoai3_generated", "status": "pending_approval"}, {"_id": 0}))
    return {"recipes": recipes, "count": len(recipes)}


# ─── BEO Production Planning ───

@router.post("/production-plan")
async def generate_production_plan(req: BEOProductionRequest):
    """Generate a full production plan for a BEO/event."""
    plan = _calculate_production_plan(req)
    plan_id = f"prod-{_uid()}"

    db["production_plans"].insert_one({"plan_id": plan_id, **plan, "created_at": _now()})

    trace_log(event_type="production_plan_generated", entity_type="masterchef", entity_id=plan_id, actor_id="echoai3",
              metadata={"covers": req.covers, "items": len(req.menu_items)})

    return {"plan_id": plan_id, **plan}


@router.post("/auto-order")
async def auto_generate_order(req: BEOProductionRequest):
    """Generate purchase orders based on BEO production plan — waits for human approval."""
    plan = _calculate_production_plan(req)
    order_id = f"auto-ord-{_uid()}"

    order = {
        "order_id": order_id,
        "source": "echoai3_masterchef",
        "event": plan["event"],
        "covers": plan["covers"],
        "items": plan["items_to_order"],
        "total_items": len(plan["items_to_order"]),
        "status": "awaiting_human_approval",
        "created_at": _now(),
    }
    db["auto_orders"].insert_one({**order})
    order.pop("_id", None)

    return {"order_id": order_id, **order, "message": "Order prepared. Awaiting human approval to send to vendors."}


# ─── Kitchen Design & Workflow ───

@router.get("/kitchen-stations")
async def get_kitchen_stations():
    """Get all BOH kitchen station configurations."""
    return {"stations": KITCHEN_STATIONS, "count": len(KITCHEN_STATIONS)}


@router.get("/equipment")
async def get_equipment_specs():
    """Get commercial kitchen equipment specifications."""
    return {"equipment": EQUIPMENT_SPECS, "count": len(EQUIPMENT_SPECS)}


@router.get("/kitchen-design")
async def get_kitchen_design(covers_per_service: int = Query(200), service_style: str = Query("plated")):
    """Generate a kitchen design recommendation based on capacity needs."""
    stations_needed = []
    for key, station in KITCHEN_STATIONS.items():
        stations_needed.append({
            "station": station["name"],
            "equipment": station["equipment"],
            "staff": station["staff"],
            "workflow": station["flow"],
            "required": True,
        })

    total_sqft = 800 + (covers_per_service * 5)

    return {
        "recommended_layout": f"Production kitchen for {covers_per_service} covers/{service_style} service",
        "total_sqft_recommended": total_sqft,
        "stations": stations_needed,
        "design_principles": [
            "Flow: Receiving → Storage → Prep → Cook Line → Expo → Service — one-directional",
            "Cross-contamination prevention: Separate raw/cooked paths",
            "Temperature zones: Hot line separated from cold/pastry",
            "Ergonomics: 36-inch minimum aisle width, 42-inch preferred",
            "Ventilation: Type I hood over all cooking equipment, makeup air system",
            "Fire suppression: ANSUL system over all hood areas",
            "Flooring: Non-slip, coved base, epoxy or quarry tile",
            "Lighting: 50 foot-candles prep areas, 30 fc storage, 20 fc walk-ins",
        ],
        "equipment_budget_estimate": f"${total_sqft * 150:,.0f} - ${total_sqft * 300:,.0f}",
    }


@router.get("/foh-boh")
async def get_foh_boh_knowledge():
    """Get comprehensive FOH/BOH operations knowledge."""
    return FOH_BOH_KNOWLEDGE


# ─── Flavor Matrix & R&D ───

@router.get("/flavor-matrix")
async def get_flavor_matrix():
    """Get the complete flavor dimension matrix."""
    return {"dimensions": FLAVOR_DIMENSIONS, "count": len(FLAVOR_DIMENSIONS)}


@router.post("/chef-profile")
async def create_chef_profile(req: FlavorProfileRequest):
    """Create or update a chef's flavor profile for recipe generation in their style."""
    db["chef_flavor_profiles"].update_one(
        {"chef_id": req.chef_id},
        {"$set": {
            "chef_id": req.chef_id,
            "chef_name": req.chef_name,
            "flavor_signatures": req.flavor_signatures,
            "preferred_techniques": req.preferred_techniques,
            "cuisine_influences": req.cuisine_influences,
            "plating_style": req.plating_style,
            "signature_dishes": req.signature_dishes,
            "updated_at": _now(),
        }},
        upsert=True,
    )
    return {"chef_id": req.chef_id, "status": "saved"}


@router.get("/chef-profiles")
async def list_chef_profiles():
    """List all chef flavor profiles."""
    profiles = list(db["chef_flavor_profiles"].find({}, {"_id": 0}))
    return {"profiles": profiles, "count": len(profiles)}


@router.post("/analyze-flavor")
async def analyze_flavor_profile(req: AnalyzeFlavorRequest):
    """Analyze the flavor profile of a recipe or ingredient list."""
    ingredients = req.ingredients
    if not ingredients and req.recipe_name:
        recipe = db["recipes"].find_one({"name": {"$regex": req.recipe_name, "$options": "i"}}, {"_id": 0})
        if recipe:
            ingredients = [i.get("name", "") if isinstance(i, dict) else str(i) for i in recipe.get("ingredients", [])]

    profile = {dim: [] for dim in FLAVOR_DIMENSIONS}
    for ing in ingredients:
        ing_lower = ing.lower() if isinstance(ing, str) else ""
        for dim, markers in FLAVOR_DIMENSIONS.items():
            for marker in markers:
                if marker in ing_lower:
                    profile[dim].append(ing)

    active_dims = {d: v for d, v in profile.items() if v}
    dominant = max(active_dims, key=lambda d: len(active_dims[d])) if active_dims else "neutral"

    return {
        "recipe": req.recipe_name,
        "ingredients_analyzed": len(ingredients),
        "flavor_profile": active_dims,
        "dominant_flavor": dominant,
        "dimensions_active": len(active_dims),
        "balance_score": min(100, round(len(active_dims) / 5 * 100)),
        "suggestion": f"Consider adding {'sweet' if 'sweet' not in active_dims else 'acid'} elements for better balance" if len(active_dims) < 3 else "Well-balanced flavor profile",
    }


@router.get("/food-safety")
async def get_food_safety_standards():
    """Get comprehensive food safety and HACCP standards."""
    return FOH_BOH_KNOWLEDGE["food_safety"]


@router.get("/production-methods")
async def get_production_methods():
    """Get all production method descriptions."""
    return {"methods": FOH_BOH_KNOWLEDGE["production_methods"]}


@router.get("/service-styles")
async def get_service_styles():
    """Get FOH service style descriptions."""
    return {"styles": FOH_BOH_KNOWLEDGE["foh_service_styles"]}
