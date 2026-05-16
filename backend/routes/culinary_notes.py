"""
Culinary Notes & Translation API
Server notes, cook notes, and multi-language translation using Gemini.
"""
import os
import json
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from database import db

load_dotenv()

router = APIRouter(prefix="/api/culinary", tags=["culinary"])

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    HAS_LLM = True
except ImportError:
    HAS_LLM = False

recipes_col = db["recipes"]
notes_col = db["culinary_notes"]
menus_col = db["menus"]
ingredients_col = db["ingredients"]


class NotesRequest(BaseModel):
    recipe_id: str
    note_type: str = "server"  # "server" | "cook" | "prep"


class TranslateRequest(BaseModel):
    recipe_id: str
    text: str
    target_language: str = "spanish"


class MenuCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str = "dinner"
    recipe_ids: list[str] = []


def _now():
    return datetime.now(timezone.utc).isoformat()


def _get_recipe_with_ingredients(recipe_id: str):
    """Fetch recipe and resolve ingredient names."""
    recipe = recipes_col.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        raise HTTPException(404, "Recipe not found")

    resolved = []
    for ri in recipe.get("ingredients", []):
        ing = ingredients_col.find_one({"id": ri.get("ingredient_id")}, {"_id": 0})
        name = ing.get("name", "Unknown") if ing else ri.get("ingredient_id", "Unknown")
        resolved.append({
            "name": name,
            "quantity": ri.get("quantity", 0),
            "unit": ri.get("unit", "each"),
        })
    recipe["resolved_ingredients"] = resolved
    return recipe


@router.post("/notes/generate")
async def generate_notes(data: NotesRequest):
    """Generate server notes, cook notes, or prep notes for a recipe using AI."""
    recipe = _get_recipe_with_ingredients(data.recipe_id)
    ingredients_text = ", ".join(
        f"{i['quantity']} {i['unit']} {i['name']}" for i in recipe["resolved_ingredients"]
    )

    if data.note_type == "server":
        prompt = f"""Generate professional SERVER NOTES for this restaurant dish. Server notes help waitstaff describe and sell the dish to guests.

Recipe: {recipe['name']}
Category: {recipe.get('category', 'entree')}
Ingredients: {ingredients_text}
Menu Price: ${recipe.get('menu_price', 0)}
Instructions: {'; '.join(recipe.get('instructions', [])[:5])}

Include:
1. Brief dish description (2-3 sentences, appetizing language)
2. Key allergens (gluten, dairy, shellfish, nuts, etc.)
3. Suggested wine pairings (2-3 options)
4. Common modifications (GF, dairy-free, etc.)
5. Upsell suggestions
6. Plating description

Return as JSON: {{"description": "...", "allergens": [...], "wine_pairings": [...], "modifications": [...], "upsell": "...", "plating": "..."}}"""

    elif data.note_type == "cook":
        prompt = f"""Generate professional COOK NOTES for the kitchen line. These are the step-by-step preparation and cooking instructions.

Recipe: {recipe['name']}
Yield: {recipe.get('yield_qty', 1)} {recipe.get('yield_unit', 'portions')}
Prep Time: {recipe.get('prep_time_min', 0)} min
Cook Time: {recipe.get('cook_time_min', 0)} min
Ingredients: {ingredients_text}
Instructions: {'; '.join(recipe.get('instructions', [])[:10])}

Include:
1. Mise en place checklist
2. Step-by-step cooking instructions (numbered)
3. Temperature and timing for each step
4. Quality checkpoints (visual, texture, temp)
5. Plating instructions
6. Hold time and temperature

Return as JSON: {{"mise_en_place": [...], "steps": [{{"step": 1, "instruction": "...", "temp": "...", "time": "..."}}], "quality_checks": [...], "plating": "...", "hold_info": "..."}}"""

    else:  # prep
        prompt = f"""Generate PREP NOTES for the prep cook. Focus on advance preparation tasks.

Recipe: {recipe['name']}
Yield: {recipe.get('yield_qty', 1)} {recipe.get('yield_unit', 'portions')}
Ingredients: {ingredients_text}

Include:
1. Items to prep in advance (with shelf life)
2. Butchery/portioning instructions
3. Marinade/brine times
4. Mise en place breakdown by station
5. Storage instructions

Return as JSON: {{"advance_prep": [{{"item": "...", "instructions": "...", "shelf_life": "..."}}], "portioning": [...], "storage": [...]}}"""

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not HAS_LLM or not api_key:
        return _generate_fallback_notes(recipe, data.note_type)

    try:
        llm = LlmChat(
            api_key=api_key,
            session_id=f"notes-{data.recipe_id}-{data.note_type}",
            system_message="You are a professional culinary consultant generating notes for restaurant operations. Always return valid JSON.",
        )
        llm.with_model("openai", "gpt-4.1-mini")
        user_msg = UserMessage(text=prompt)
        response = await llm.send_message(user_msg)
        text = response.strip() if isinstance(response, str) else str(response)
        # Parse JSON from response
        if "```" in text:
            text = text.split("```")[1] if "```" in text else text
            if text.startswith("json"):
                text = text[4:]
        notes_data = json.loads(text.strip())
    except (json.JSONDecodeError, Exception):
        notes_data = _generate_fallback_notes(recipe, data.note_type)
        return notes_data

    # Save to DB
    doc = {
        "recipe_id": data.recipe_id,
        "recipe_name": recipe["name"],
        "note_type": data.note_type,
        "notes": notes_data,
        "generated_at": _now(),
        "ai_generated": True,
    }
    notes_col.update_one(
        {"recipe_id": data.recipe_id, "note_type": data.note_type},
        {"$set": doc},
        upsert=True,
    )
    return doc


@router.get("/notes/{recipe_id}/{note_type}")
async def get_notes(recipe_id: str, note_type: str):
    """Get saved notes for a recipe."""
    doc = notes_col.find_one({"recipe_id": recipe_id, "note_type": note_type}, {"_id": 0})
    if not doc:
        raise HTTPException(404, f"No {note_type} notes found for recipe {recipe_id}")
    return doc


@router.post("/translate")
async def translate_notes(data: TranslateRequest):
    """Translate text (cook notes, server notes) to a target language."""
    api_key = os.environ.get("EMERGENT_LLM_KEY", "")

    if not HAS_LLM or not api_key:
        return {"translated_text": f"[Translation to {data.target_language} not available without AI key]", "target_language": data.target_language}

    prompt = f"""Translate the following culinary/restaurant text to {data.target_language}. 
Preserve culinary terminology. If the input is JSON, maintain the JSON structure but translate the values.

Text to translate:
{data.text}

Return ONLY the translated text, nothing else."""

    try:
        llm = LlmChat(
            api_key=api_key,
            session_id=f"translate-{data.recipe_id}",
            system_message="You are a professional culinary translator. Translate text accurately while preserving culinary terminology.",
        )
        llm.with_model("openai", "gpt-4.1-mini")
        user_msg = UserMessage(text=prompt)
        translated = await llm.send_message(user_msg)
        if not isinstance(translated, str):
            translated = str(translated)
        translated = translated.strip()
    except Exception as e:
        translated = f"[Translation error: {str(e)[:100]}]"

    return {
        "original_text": data.text[:200],
        "translated_text": translated,
        "target_language": data.target_language,
        "recipe_id": data.recipe_id,
        "translated_at": _now(),
    }


@router.post("/menus")
async def create_menu(data: MenuCreateRequest):
    """Create a menu from a list of recipe IDs."""
    menu_items = []
    total_cost = 0
    for rid in data.recipe_ids:
        recipe = recipes_col.find_one({"id": rid}, {"_id": 0})
        if not recipe:
            continue
        # Calculate cost
        cost_data = {}
        try:
            from operations_core import calculate_recipe_cost
            cost_data = calculate_recipe_cost(rid)
        except Exception:
            pass

        menu_items.append({
            "recipe_id": rid,
            "name": recipe["name"],
            "category": recipe.get("category", "entree"),
            "menu_price": recipe.get("menu_price", 0),
            "food_cost_pct": cost_data.get("food_cost_pct", 0),
            "cost_per_portion": cost_data.get("cost_per_portion", 0),
            "margin": cost_data.get("margin", 0),
        })
        total_cost += cost_data.get("cost_per_portion", 0)

    menu_doc = {
        "id": str(__import__("uuid").uuid4()),
        "name": data.name,
        "description": data.description,
        "category": data.category,
        "items": menu_items,
        "item_count": len(menu_items),
        "avg_food_cost_pct": round(sum(i["food_cost_pct"] for i in menu_items) / max(len(menu_items), 1), 1),
        "total_menu_value": sum(i["menu_price"] for i in menu_items),
        "created_at": _now(),
        "updated_at": _now(),
        "active": True,
    }
    menus_col.update_one({"id": menu_doc["id"]}, {"$set": menu_doc}, upsert=True)
    return menu_doc


@router.get("/menus")
async def list_menus():
    """List all menus."""
    return list(menus_col.find({}, {"_id": 0}).sort("created_at", -1))


@router.get("/menus/{menu_id}")
async def get_menu(menu_id: str):
    """Get menu details."""
    doc = menus_col.find_one({"id": menu_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Menu not found")
    return doc


def _generate_fallback_notes(recipe, note_type):
    """Generate basic notes without AI."""
    ingredients = recipe.get("resolved_ingredients", [])
    name = recipe.get("name", "Dish")

    if note_type == "server":
        allergens = []
        for i in ingredients:
            n = i["name"].lower()
            if any(a in n for a in ["salmon", "shrimp", "crab", "lobster"]):
                allergens.append("Shellfish/Fish")
            if any(a in n for a in ["butter", "cream", "cheese", "parmesan"]):
                allergens.append("Dairy")
            if any(a in n for a in ["flour", "bread"]):
                allergens.append("Gluten")
        return {
            "description": f"{name} - a signature dish prepared with {', '.join(i['name'] for i in ingredients[:3])}.",
            "allergens": list(set(allergens)) or ["None identified"],
            "wine_pairings": ["Chardonnay", "Sauvignon Blanc", "Pinot Noir"],
            "modifications": ["Gluten-free available on request", "Dairy-free option available"],
            "upsell": "Pair with our signature cocktail or upgrade to a premium wine flight.",
            "plating": "Served on a warm plate with garnish."
        }
    elif note_type == "cook":
        steps = recipe.get("instructions", [])
        if not steps:
            steps = [f"Prep {i['name']}" for i in ingredients[:3]] + ["Cook to order", "Plate and serve"]
        return {
            "mise_en_place": [f"{i['quantity']} {i['unit']} {i['name']}" for i in ingredients],
            "steps": [{"step": idx + 1, "instruction": s, "temp": "", "time": ""} for idx, s in enumerate(steps)],
            "quality_checks": ["Check internal temperature", "Verify seasoning", "Visual inspection"],
            "plating": "Center protein, starch on the side, sauce drizzle",
            "hold_info": "Hold at 140°F max 30 minutes"
        }
    else:
        return {
            "advance_prep": [{"item": i["name"], "instructions": "Clean and portion", "shelf_life": "2 days"} for i in ingredients[:5]],
            "portioning": [f"{i['quantity']} {i['unit']} {i['name']} per portion" for i in ingredients],
            "storage": ["Refrigerate at 34-38°F", "Label with date and time", "FIFO rotation"]
        }
