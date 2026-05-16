"""
EchoAi3 -- Chef-Mode Cognitive Assistant
==========================================
Context-aware culinary intelligence for kitchen operators.
Provides recipe scaling, substitution advice, prep timelines,
allergen checking, and real-time kitchen decision support
optimized for hands-free, voice-compatible interactions.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/chef", tags=["echoai3-chef-mode"])

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]

ALLERGEN_MATRIX = {
    "gluten": ["wheat", "barley", "rye", "flour", "bread", "pasta", "couscous", "semolina"],
    "dairy": ["milk", "cream", "butter", "cheese", "yogurt", "whey", "casein", "lactose"],
    "nuts": ["almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut", "macadamia"],
    "shellfish": ["shrimp", "crab", "lobster", "mussel", "clam", "oyster", "scallop"],
    "eggs": ["egg", "mayonnaise", "meringue", "custard"],
    "soy": ["soy", "tofu", "edamame", "tempeh", "miso", "soy sauce"],
    "fish": ["salmon", "tuna", "cod", "halibut", "anchovy", "sardine", "bass"],
    "sesame": ["sesame", "tahini"],
}


class ChefQueryRequest(BaseModel):
    query: str
    context: Optional[str] = None  # kitchen, prep, service, pastry


class RecipeScaleRequest(BaseModel):
    recipe_name: str
    original_servings: int = 4
    target_servings: int = 100
    constraints: Optional[dict] = None


class SubstitutionRequest(BaseModel):
    ingredient: str
    reason: str = "unavailable"  # unavailable, allergen, cost, preference
    dish_context: Optional[str] = None


class AllergenCheckRequest(BaseModel):
    ingredients: list
    allergens_to_check: list = []


class PrepTimelineRequest(BaseModel):
    event_type: str = "plated_dinner"
    covers: int = 100
    service_time: str = "19:00"
    menu_items: int = 5


# ─── Chef Intelligence Functions ───

def scale_recipe(recipe_name: str, original: int, target: int) -> dict:
    """Scale a recipe with professional kitchen adjustments."""
    factor = target / max(original, 1)

    # Search for recipe in DB
    recipe = db["recipes"].find_one(
        {"name": {"$regex": recipe_name, "$options": "i"}},
        {"_id": 0}
    )

    if recipe:
        ingredients = recipe.get("ingredients", [])
        scaled = []
        for ing in ingredients:
            qty = ing.get("quantity", 0) * factor
            # Professional adjustments for large batches
            if factor > 10:
                # Reduce seasoning by 15% for large batches (flavors concentrate)
                if any(s in ing.get("name", "").lower() for s in ["salt", "pepper", "spice", "seasoning", "herb"]):
                    qty *= 0.85
                # Reduce liquid by 10% for large batches (less evaporation per unit)
                if any(s in ing.get("name", "").lower() for s in ["stock", "broth", "water", "wine", "cream"]):
                    qty *= 0.90
            scaled.append({
                "name": ing.get("name", ""),
                "original_qty": ing.get("quantity", 0),
                "scaled_qty": round(qty, 2),
                "unit": ing.get("unit", ""),
                "adjustment": "reduced 15% (large batch seasoning)" if factor > 10 and any(s in ing.get("name", "").lower() for s in ["salt", "pepper", "spice"]) else "linear scale",
            })

        return {
            "recipe": recipe_name,
            "found_in_db": True,
            "scale_factor": round(factor, 2),
            "original_servings": original,
            "target_servings": target,
            "scaled_ingredients": scaled,
            "chef_notes": [
                "Seasoning reduced 15% for batch scaling" if factor > 10 else "Linear scaling applied",
                f"Estimated prep time: {round(target / 20 * 0.5, 1)}h for {target} servings",
                "Taste and adjust seasoning after scaling — large batches need professional palate check",
            ],
        }
    else:
        return {
            "recipe": recipe_name,
            "found_in_db": False,
            "scale_factor": round(factor, 2),
            "original_servings": original,
            "target_servings": target,
            "scaled_ingredients": [],
            "chef_notes": [
                f"Recipe '{recipe_name}' not found in database. Provide ingredients for manual scaling.",
                f"General scaling factor: {round(factor, 2)}x",
                "For seasoning: use 85% of scaled amount for batches over 10x",
            ],
        }


def check_allergens(ingredients: list, allergens: list) -> dict:
    """Check a list of ingredients against allergen matrix."""
    if not allergens:
        allergens = list(ALLERGEN_MATRIX.keys())

    flags = []
    safe = []
    for allergen in allergens:
        triggers = ALLERGEN_MATRIX.get(allergen, [])
        found = []
        for ing in ingredients:
            ing_lower = ing.lower()
            for trigger in triggers:
                if trigger in ing_lower:
                    found.append({"ingredient": ing, "trigger": trigger, "allergen": allergen})
        if found:
            flags.append({"allergen": allergen, "triggers": found, "status": "FLAGGED"})
        else:
            safe.append(allergen)

    return {
        "ingredients_checked": len(ingredients),
        "allergens_checked": allergens,
        "flags": flags,
        "safe_allergens": safe,
        "total_flags": len(flags),
        "safe_to_serve": len(flags) == 0,
        "recommendation": "All clear — no allergen conflicts detected" if not flags else f"CAUTION: {len(flags)} allergen(s) detected. Review flagged items.",
    }


def find_substitutions(ingredient: str, reason: str, dish_context: str = None) -> dict:
    """Find professional-grade ingredient substitutions."""
    subs_db = {
        "butter": [
            {"sub": "Clarified ghee", "ratio": "1:1", "best_for": "sauteing, high-heat cooking", "notes": "Higher smoke point, nutty flavor"},
            {"sub": "Olive oil", "ratio": "3/4 cup per 1 cup butter", "best_for": "savory dishes", "notes": "Different flavor profile"},
            {"sub": "Coconut oil", "ratio": "1:1", "best_for": "baking, dairy-free", "notes": "Slight coconut flavor"},
        ],
        "cream": [
            {"sub": "Coconut cream", "ratio": "1:1", "best_for": "soups, sauces", "notes": "Dairy-free, slight sweetness"},
            {"sub": "Cashew cream", "ratio": "1:1", "best_for": "pasta sauces", "notes": "Neutral flavor, smooth texture"},
            {"sub": "Creme fraiche", "ratio": "1:1", "best_for": "finishing sauces", "notes": "Tangy, more body"},
        ],
        "flour": [
            {"sub": "Almond flour", "ratio": "1:1", "best_for": "gluten-free baking", "notes": "Denser, nuttier"},
            {"sub": "Cornstarch", "ratio": "1/2 amount", "best_for": "thickening", "notes": "Use slurry method"},
            {"sub": "Rice flour", "ratio": "1:1", "best_for": "tempura, GF breading", "notes": "Lighter texture"},
        ],
        "eggs": [
            {"sub": "Flax egg (1T ground flax + 3T water)", "ratio": "per egg", "best_for": "baking", "notes": "Let sit 5min to gel"},
            {"sub": "Aquafaba (3T)", "ratio": "per egg", "best_for": "meringues, mousse", "notes": "Chickpea liquid"},
            {"sub": "Banana (1/4 mashed)", "ratio": "per egg", "best_for": "sweet baking", "notes": "Adds sweetness"},
        ],
        "salt": [
            {"sub": "Soy sauce", "ratio": "1/2 tsp per 1 tsp salt", "best_for": "umami depth", "notes": "Adds color"},
            {"sub": "Fish sauce", "ratio": "1/4 tsp per 1 tsp salt", "best_for": "Southeast Asian, dressings", "notes": "Very potent"},
        ],
    }

    ing_lower = ingredient.lower()
    matches = subs_db.get(ing_lower, [])

    # Try partial matching
    if not matches:
        for key, subs in subs_db.items():
            if key in ing_lower or ing_lower in key:
                matches = subs
                break

    return {
        "original_ingredient": ingredient,
        "reason": reason,
        "dish_context": dish_context,
        "substitutions": matches,
        "count": len(matches),
        "recommendation": matches[0]["sub"] if matches else f"No automatic substitution found for '{ingredient}'. Consult head chef.",
    }


def generate_prep_timeline(event_type: str, covers: int, service_time: str, menu_items: int) -> dict:
    """Generate a detailed prep timeline working backward from service time."""
    # Parse service time
    try:
        svc_hour, svc_min = map(int, service_time.split(":"))
    except Exception:
        svc_hour, svc_min = 19, 0

    # Prep time multipliers per event type
    prep_mult = {
        "plated_dinner": 1.0, "buffet_dinner": 0.8, "plated_lunch": 0.85,
        "buffet_lunch": 0.7, "reception": 0.6, "breakfast": 0.5,
    }
    mult = prep_mult.get(event_type, 1.0)

    base_hours = max(4, covers / 50 * 2 + menu_items * 0.5) * mult
    total_prep_hours = round(base_hours, 1)

    # Build timeline (backward from service)
    milestones = []
    svc_minutes = svc_hour * 60 + svc_min

    def add_ms(offset_min, label, dept, critical=False):
        t = svc_minutes - offset_min
        h, m = divmod(max(0, t), 60)
        milestones.append({
            "time": f"{int(h):02d}:{int(m):02d}",
            "minutes_before_service": offset_min,
            "task": label,
            "department": dept,
            "critical": critical,
        })

    add_ms(0, "SERVICE — plates leave kitchen", "kitchen", True)
    add_ms(15, "Final quality check, garnish plating", "kitchen", True)
    add_ms(30, "Proteins fire, sauces finish", "hot line", True)
    add_ms(45, "Salad/cold course plated", "garde manger")
    add_ms(60, "Front of house final briefing", "FOH")
    add_ms(90, "Hot prep begins — stocks, reductions, par-cooking", "hot line")
    add_ms(120, "Cold prep complete — terrines, salads staged", "garde manger")
    add_ms(180, "Butchery, portioning, mise en place", "prep", True)
    add_ms(240, "Pastry production — desserts, bread", "pastry")
    add_ms(int(total_prep_hours * 60), "Kitchen call — all hands on deck", "all", True)
    add_ms(int(total_prep_hours * 60) + 30, "Receiving check — verify all deliveries", "receiving")

    milestones.sort(key=lambda x: x["minutes_before_service"], reverse=True)

    return {
        "event_type": event_type,
        "covers": covers,
        "service_time": service_time,
        "menu_items": menu_items,
        "total_prep_hours": total_prep_hours,
        "kitchen_call_time": milestones[-2]["time"] if len(milestones) > 1 else "06:00",
        "timeline": milestones,
        "staffing": {
            "cooks_needed": max(2, covers // 40),
            "prep_cooks": max(1, covers // 60),
            "pastry": max(1, menu_items // 3),
            "garde_manger": max(1, covers // 80),
            "servers": max(2, covers // 20),
            "total_boh": max(2, covers // 40) + max(1, covers // 60) + max(1, menu_items // 3),
        },
    }


# ─── AI Chef Assistant ───

async def chef_ai_query(query: str, context: str = None) -> str:
    """AI-powered chef assistant for complex culinary queries."""
    # Gather kitchen context
    menu_count = db["menu_items"].count_documents({})
    recipe_count = db["recipes"].count_documents({})
    ingredients = list(db["ingredients"].find({}, {"_id": 0, "name": 1, "current_stock": 1, "par_level": 1}).limit(20))
    low_stock = [i["name"] for i in ingredients if i.get("current_stock", 0) < i.get("par_level", 10)]

    kitchen_context = f"""Kitchen Status:
- {menu_count} active menu items, {recipe_count} recipes in database
- Low stock items: {', '.join(low_stock[:5]) if low_stock else 'All items at par'}
- Context: {context or 'general kitchen operations'}"""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=f"chef-{_uid()}",
            system_message=(
                "You are EchoAi³ in Chef Mode — a culinary intelligence assistant for professional kitchen operators. "
                "You have deep knowledge of commercial kitchen operations, recipe scaling, food safety, allergens, "
                "prep timelines, and cost management. Be concise, practical, and kitchen-ready. "
                "Use professional culinary terminology. If you reference timing, give specific times. "
                f"\n\n{kitchen_context}"
            ),
        )
        chat.with_model("openai", "gpt-4.1-mini")
        return await chat.send_message(UserMessage(text=query))
    except Exception:
        return f"**Chef Mode — Deterministic Response**\n\nQuery: {query}\n\nKitchen context loaded: {menu_count} menu items, {recipe_count} recipes. {len(low_stock)} items below par."


# ─── API Endpoints ───

class ChefQuery(BaseModel):
    query: str
    context: Optional[str] = None


@router.post("/ask")
async def chef_ask(req: ChefQuery):
    """Ask the Chef-Mode AI assistant any culinary question."""
    response = await chef_ai_query(req.query, req.context)
    query_id = f"chef-{_uid()}"

    trace_log(
        event_type="chef_mode_query",
        entity_type="echoai3_chef",
        entity_id=query_id,
        actor_id="chef",
        metadata={"query": req.query[:100], "context": req.context},
    )

    return {"query_id": query_id, "response": response, "context": req.context, "timestamp": _now()}


@router.post("/scale")
async def scale_recipe_endpoint(req: RecipeScaleRequest):
    """Scale a recipe for banquet-level production."""
    result = scale_recipe(req.recipe_name, req.original_servings, req.target_servings)
    return {**result, "timestamp": _now()}


@router.post("/allergen-check")
async def allergen_check(req: AllergenCheckRequest):
    """Check ingredients against the allergen matrix."""
    result = check_allergens(req.ingredients, req.allergens_to_check)
    return {**result, "timestamp": _now()}


@router.post("/substitute")
async def find_substitution(req: SubstitutionRequest):
    """Find professional substitutions for an ingredient."""
    result = find_substitutions(req.ingredient, req.reason, req.dish_context)
    return {**result, "timestamp": _now()}


@router.post("/prep-timeline")
async def prep_timeline(req: PrepTimelineRequest):
    """Generate a prep timeline for an event."""
    result = generate_prep_timeline(req.event_type, req.covers, req.service_time, req.menu_items)
    return {**result, "timestamp": _now()}


@router.get("/allergen-matrix")
async def get_allergen_matrix():
    """Get the full allergen matrix."""
    return {"allergens": ALLERGEN_MATRIX, "count": len(ALLERGEN_MATRIX)}
