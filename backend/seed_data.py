"""
LUCCCA Enterprise Seed Data
============================
Seeds the database with realistic hospitality data for testing
and demonstration of all enterprise engines.
"""
from datetime import datetime, timezone, timedelta
import uuid

def _uid():
    return str(uuid.uuid4())

def _now():
    return datetime.now(timezone.utc).isoformat()

def seed_all(db=None):
    """Seed all collections with demo data"""
    from database import (
        ingredients_col, recipes_col, menu_items_col,
        consumption_history_col, forecast_events_col, events_col, positions_col,
    )
    import labor_cost

    # Only seed if empty
    if ingredients_col.count_documents({}) > 0:
        return {"status": "already_seeded"}

    # ----- INGREDIENTS -----
    ingredients = [
        {"id": _uid(), "name": "Atlantic Salmon Fillet", "sku": "PRO-SAL-001", "category": "protein",
         "base_unit": "lb", "purchase_unit": "case", "purchase_to_base": 10,
         "current_cost": 12.50, "average_cost": 12.25, "last_purchase_cost": 12.50,
         "current_stock": 45, "par_level": 60, "reorder_point": 20, "reorder_qty": 40,
         "preferred_vendor": "Sysco", "allergens": ["fish"], "shelf_life_days": 5},
        {"id": _uid(), "name": "USDA Prime Ribeye", "sku": "PRO-RIB-001", "category": "protein",
         "base_unit": "lb", "purchase_unit": "case", "purchase_to_base": 8,
         "current_cost": 28.00, "average_cost": 27.50, "last_purchase_cost": 28.00,
         "current_stock": 30, "par_level": 50, "reorder_point": 15, "reorder_qty": 35,
         "preferred_vendor": "US Foods", "allergens": [], "shelf_life_days": 7},
        {"id": _uid(), "name": "Organic Mixed Greens", "sku": "PRD-GRN-001", "category": "produce",
         "base_unit": "lb", "purchase_unit": "case", "purchase_to_base": 5,
         "current_cost": 4.50, "average_cost": 4.25, "last_purchase_cost": 4.50,
         "current_stock": 18, "par_level": 30, "reorder_point": 10, "reorder_qty": 20,
         "preferred_vendor": "Local Farms Co", "allergens": [], "shelf_life_days": 3},
        {"id": _uid(), "name": "Heavy Cream", "sku": "DRY-CRM-001", "category": "dairy",
         "base_unit": "qt", "purchase_unit": "case", "purchase_to_base": 12,
         "current_cost": 3.75, "average_cost": 3.60, "last_purchase_cost": 3.75,
         "current_stock": 24, "par_level": 36, "reorder_point": 12, "reorder_qty": 24,
         "preferred_vendor": "Sysco", "allergens": ["dairy"], "shelf_life_days": 10},
        {"id": _uid(), "name": "Arborio Rice", "sku": "DRG-RIC-001", "category": "dry_goods",
         "base_unit": "lb", "purchase_unit": "bag", "purchase_to_base": 25,
         "current_cost": 2.10, "average_cost": 2.00, "last_purchase_cost": 2.10,
         "current_stock": 50, "par_level": 75, "reorder_point": 25, "reorder_qty": 50,
         "preferred_vendor": "US Foods", "allergens": [], "shelf_life_days": 365},
        {"id": _uid(), "name": "Fresh Basil", "sku": "PRD-BSL-001", "category": "produce",
         "base_unit": "bunch", "purchase_unit": "case", "purchase_to_base": 12,
         "current_cost": 2.50, "average_cost": 2.30, "last_purchase_cost": 2.50,
         "current_stock": 8, "par_level": 15, "reorder_point": 5, "reorder_qty": 12,
         "preferred_vendor": "Local Farms Co", "allergens": [], "shelf_life_days": 4},
        {"id": _uid(), "name": "Unsalted Butter", "sku": "DRY-BTR-001", "category": "dairy",
         "base_unit": "lb", "purchase_unit": "case", "purchase_to_base": 36,
         "current_cost": 4.25, "average_cost": 4.10, "last_purchase_cost": 4.25,
         "current_stock": 20, "par_level": 40, "reorder_point": 12, "reorder_qty": 36,
         "preferred_vendor": "Sysco", "allergens": ["dairy"], "shelf_life_days": 30},
        {"id": _uid(), "name": "Chocolate Callets 70%", "sku": "BAK-CHO-001", "category": "bakery",
         "base_unit": "lb", "purchase_unit": "bag", "purchase_to_base": 10,
         "current_cost": 8.50, "average_cost": 8.25, "last_purchase_cost": 8.50,
         "current_stock": 15, "par_level": 25, "reorder_point": 8, "reorder_qty": 20,
         "preferred_vendor": "Valrhona Direct", "allergens": ["dairy", "soy"], "shelf_life_days": 180},
        {"id": _uid(), "name": "Jumbo Shrimp 16/20", "sku": "SEA-SHR-001", "category": "seafood",
         "base_unit": "lb", "purchase_unit": "case", "purchase_to_base": 5,
         "current_cost": 14.75, "average_cost": 14.50, "last_purchase_cost": 14.75,
         "current_stock": 12, "par_level": 25, "reorder_point": 8, "reorder_qty": 15,
         "preferred_vendor": "Sysco", "allergens": ["shellfish"], "shelf_life_days": 3},
        {"id": _uid(), "name": "Extra Virgin Olive Oil", "sku": "DRG-OIL-001", "category": "dry_goods",
         "base_unit": "L", "purchase_unit": "case", "purchase_to_base": 6,
         "current_cost": 9.00, "average_cost": 8.75, "last_purchase_cost": 9.00,
         "current_stock": 10, "par_level": 18, "reorder_point": 6, "reorder_qty": 12,
         "preferred_vendor": "US Foods", "allergens": [], "shelf_life_days": 365},
    ]

    for ing in ingredients:
        ing["created_at"] = _now()
        ing["updated_at"] = _now()
        ing["vendor_codes"] = []
        ing.setdefault("storage_temp", None)
    ingredients_col.insert_many(ingredients)

    # ----- RECIPES -----
    salmon_id = ingredients[0]["id"]
    ribeye_id = ingredients[1]["id"]
    greens_id = ingredients[2]["id"]
    cream_id = ingredients[3]["id"]
    rice_id = ingredients[4]["id"]
    basil_id = ingredients[5]["id"]
    butter_id = ingredients[6]["id"]
    choco_id = ingredients[7]["id"]
    shrimp_id = ingredients[8]["id"]
    olive_id = ingredients[9]["id"]

    recipes = [
        {"id": _uid(), "name": "Pan-Seared Salmon with Risotto", "category": "entree",
         "yield_qty": 4, "yield_unit": "portion", "menu_price": 42.00,
         "target_food_cost_pct": 28, "prep_time_min": 15, "cook_time_min": 25,
         "ingredients": [
             {"ingredient_id": salmon_id, "quantity": 2.0, "unit": "lb"},
             {"ingredient_id": rice_id, "quantity": 1.0, "unit": "lb"},
             {"ingredient_id": cream_id, "quantity": 0.5, "unit": "qt"},
             {"ingredient_id": butter_id, "quantity": 0.25, "unit": "lb"},
             {"ingredient_id": basil_id, "quantity": 0.5, "unit": "bunch"},
             {"ingredient_id": olive_id, "quantity": 0.1, "unit": "L"},
         ]},
        {"id": _uid(), "name": "Prime Ribeye Steak", "category": "entree",
         "yield_qty": 2, "yield_unit": "portion", "menu_price": 58.00,
         "target_food_cost_pct": 30, "prep_time_min": 10, "cook_time_min": 20,
         "ingredients": [
             {"ingredient_id": ribeye_id, "quantity": 2.5, "unit": "lb"},
             {"ingredient_id": butter_id, "quantity": 0.25, "unit": "lb"},
             {"ingredient_id": olive_id, "quantity": 0.05, "unit": "L"},
         ]},
        {"id": _uid(), "name": "Caesar Salad", "category": "appetizer",
         "yield_qty": 4, "yield_unit": "portion", "menu_price": 16.00,
         "target_food_cost_pct": 22, "prep_time_min": 10, "cook_time_min": 0,
         "ingredients": [
             {"ingredient_id": greens_id, "quantity": 1.0, "unit": "lb"},
             {"ingredient_id": olive_id, "quantity": 0.1, "unit": "L"},
         ]},
        {"id": _uid(), "name": "Shrimp Scampi", "category": "appetizer",
         "yield_qty": 4, "yield_unit": "portion", "menu_price": 24.00,
         "target_food_cost_pct": 28, "prep_time_min": 10, "cook_time_min": 12,
         "ingredients": [
             {"ingredient_id": shrimp_id, "quantity": 1.5, "unit": "lb"},
             {"ingredient_id": butter_id, "quantity": 0.25, "unit": "lb"},
             {"ingredient_id": olive_id, "quantity": 0.1, "unit": "L"},
             {"ingredient_id": basil_id, "quantity": 0.5, "unit": "bunch"},
         ]},
        {"id": _uid(), "name": "Chocolate Lava Cake", "category": "dessert",
         "yield_qty": 6, "yield_unit": "portion", "menu_price": 14.00,
         "target_food_cost_pct": 20, "prep_time_min": 20, "cook_time_min": 14,
         "ingredients": [
             {"ingredient_id": choco_id, "quantity": 0.75, "unit": "lb"},
             {"ingredient_id": butter_id, "quantity": 0.5, "unit": "lb"},
             {"ingredient_id": cream_id, "quantity": 0.25, "unit": "qt"},
         ]},
    ]

    for r in recipes:
        r["created_at"] = _now()
        r["updated_at"] = _now()
        r["instructions"] = []
    recipes_col.insert_many(recipes)

    # ----- MENU ITEMS (POS Mapping) -----
    menu_map = [
        {"id": _uid(), "name": "Pan-Seared Salmon with Risotto", "pos_item_id": "TOAST-SAL-001",
         "pos_provider": "toast", "category": "entree", "menu_price": 42.00,
         "recipe_id": recipes[0]["id"],
         "ingredient_map": [
             {"ingredient_id": salmon_id, "quantity_per_item": 0.5},
             {"ingredient_id": rice_id, "quantity_per_item": 0.25},
             {"ingredient_id": cream_id, "quantity_per_item": 0.125},
             {"ingredient_id": butter_id, "quantity_per_item": 0.0625},
         ], "active": True},
        {"id": _uid(), "name": "Prime Ribeye Steak", "pos_item_id": "TOAST-RIB-001",
         "pos_provider": "toast", "category": "entree", "menu_price": 58.00,
         "recipe_id": recipes[1]["id"],
         "ingredient_map": [
             {"ingredient_id": ribeye_id, "quantity_per_item": 1.25},
             {"ingredient_id": butter_id, "quantity_per_item": 0.125},
         ], "active": True},
        {"id": _uid(), "name": "Caesar Salad", "pos_item_id": "TOAST-CES-001",
         "pos_provider": "toast", "category": "appetizer", "menu_price": 16.00,
         "recipe_id": recipes[2]["id"],
         "ingredient_map": [
             {"ingredient_id": greens_id, "quantity_per_item": 0.25},
             {"ingredient_id": olive_id, "quantity_per_item": 0.025},
         ], "active": True},
        {"id": _uid(), "name": "Shrimp Scampi", "pos_item_id": "TOAST-SHR-001",
         "pos_provider": "toast", "category": "appetizer", "menu_price": 24.00,
         "recipe_id": recipes[3]["id"],
         "ingredient_map": [
             {"ingredient_id": shrimp_id, "quantity_per_item": 0.375},
             {"ingredient_id": butter_id, "quantity_per_item": 0.0625},
         ], "active": True},
        {"id": _uid(), "name": "Chocolate Lava Cake", "pos_item_id": "TOAST-CHO-001",
         "pos_provider": "toast", "category": "dessert", "menu_price": 14.00,
         "recipe_id": recipes[4]["id"],
         "ingredient_map": [
             {"ingredient_id": choco_id, "quantity_per_item": 0.125},
             {"ingredient_id": butter_id, "quantity_per_item": 0.083},
         ], "active": True},
    ]

    for mi in menu_map:
        mi["created_at"] = _now()
        mi["updated_at"] = _now()
    menu_items_col.insert_many(menu_map)

    # ----- CONSUMPTION HISTORY (30 days for forecasting) -----
    today = datetime.now(timezone.utc)
    for ing in ingredients:
        for day_offset in range(30):
            d = today - timedelta(days=day_offset)
            date_str = d.strftime("%Y-%m-%d")
            dow = d.weekday()
            # Higher usage on weekends
            base_usage = {"protein": 5, "produce": 3, "dairy": 4, "dry_goods": 2,
                          "bakery": 1.5, "seafood": 3, "spice": 0.5, "other": 1}
            usage = base_usage.get(ing["category"], 2)
            if dow >= 4:  # Fri-Sun
                usage *= 1.6
            import random
            usage *= random.uniform(0.7, 1.3)
            consumption_history_col.insert_one({
                "ingredient_id": ing["id"],
                "quantity": round(usage, 2),
                "date": date_str,
                "reason": "production",
                "timestamp": d.isoformat(),
            })

    # ----- EVENTS -----
    event_data = [
        {"name": "Smith-Johnson Wedding Reception", "event_type": "wedding",
         "stage": "contract_signed", "phase": 1,
         "client_name": "Sarah Smith", "client_email": "sarah@email.com",
         "guest_count": 200, "guaranteed_count": 180,
         "event_date": (today + timedelta(days=45)).strftime("%Y-%m-%d"),
         "start_time": "17:00", "end_time": "23:00",
         "venue": "Grand Ballroom", "room": "Main Hall",
         "revenue": {"food": 18000, "beverage": 8000, "rental": 3000, "av": 1500, "service_charge": 4500, "other": 500, "total": 35500},
         "costs": {"food": 5400, "beverage": 2400, "labor": 0, "rental": 800, "overhead": 1200, "total": 9800},
         "menu_items": [
             {"recipe_id": recipes[0]["id"], "name": "Pan-Seared Salmon", "quantity": 1},
             {"recipe_id": recipes[2]["id"], "name": "Caesar Salad", "quantity": 1},
             {"recipe_id": recipes[4]["id"], "name": "Chocolate Lava Cake", "quantity": 1},
         ]},
        {"name": "TechCorp Annual Gala 2026", "event_type": "corporate",
         "stage": "menu_selected", "phase": 2,
         "client_name": "James Chen", "client_email": "james@techcorp.com",
         "guest_count": 350, "guaranteed_count": 320,
         "event_date": (today + timedelta(days=30)).strftime("%Y-%m-%d"),
         "start_time": "18:00", "end_time": "00:00",
         "venue": "Convention Center", "room": "Platinum Hall",
         "revenue": {"food": 31500, "beverage": 14000, "rental": 5000, "av": 3500, "service_charge": 8100, "other": 1000, "total": 63100},
         "costs": {"food": 9450, "beverage": 4200, "labor": 0, "rental": 1500, "overhead": 2000, "total": 17150},
         "menu_items": [
             {"recipe_id": recipes[1]["id"], "name": "Prime Ribeye", "quantity": 1},
             {"recipe_id": recipes[3]["id"], "name": "Shrimp Scampi", "quantity": 1},
             {"recipe_id": recipes[4]["id"], "name": "Chocolate Lava Cake", "quantity": 1},
         ]},
        {"name": "Martinez Quinceañera", "event_type": "social",
         "stage": "prospect", "phase": 1,
         "client_name": "Maria Martinez", "client_email": "maria@email.com",
         "guest_count": 150, "guaranteed_count": 0,
         "event_date": (today + timedelta(days=60)).strftime("%Y-%m-%d"),
         "start_time": "16:00", "end_time": "22:00",
         "venue": "Garden Terrace", "room": "",
         "revenue": {"food": 0, "beverage": 0, "rental": 0, "av": 0, "service_charge": 0, "other": 0, "total": 0},
         "costs": {"food": 0, "beverage": 0, "labor": 0, "rental": 0, "overhead": 0, "total": 0},
         "menu_items": []},
        {"name": "Charity Gala Fundraiser", "event_type": "gala",
         "stage": "closed", "phase": 5,
         "client_name": "Foundation Board", "client_email": "events@foundation.org",
         "guest_count": 250, "guaranteed_count": 240,
         "event_date": (today - timedelta(days=10)).strftime("%Y-%m-%d"),
         "start_time": "18:00", "end_time": "23:00",
         "venue": "Grand Ballroom", "room": "Main Hall",
         "revenue": {"food": 22500, "beverage": 10000, "rental": 4000, "av": 2500, "service_charge": 5850, "other": 750, "total": 45600},
         "costs": {"food": 6750, "beverage": 3000, "labor": 8500, "rental": 1200, "overhead": 1800, "total": 21250},
         "menu_items": []},
    ]

    for ed in event_data:
        eid = _uid()
        doc = {
            "id": eid,
            "org_id": "default",
            **ed,
            "client_phone": "", "client_company": "",
            "deposits": [], "payments": [],
            "beo_notes": "", "dietary_requirements": [],
            "layout_id": None, "setup_style": "rounds",
            "table_count": ed["guest_count"] // 10,
            "labor_plan_id": None, "staff_count": 0, "labor_hours": 0,
            "stage_history": [{"stage": ed["stage"], "entered_at": _now(), "by": "seed"}],
            "notes": [], "tags": [], "assigned_to": "",
            "created_at": _now(), "updated_at": _now(),
        }
        events_col.insert_one(doc)

    # ----- FORECAST EVENTS -----
    forecast_events_col.insert_many([
        {"id": _uid(), "name": "Valentine's Day Rush", "event_type": "holiday",
         "date": (today + timedelta(days=5)).strftime("%Y-%m-%d"),
         "guest_count": 300, "menu_items": [], "impact_multiplier": 2.0, "created_at": _now()},
        {"id": _uid(), "name": "Weekend Brunch Special", "event_type": "recurring",
         "date": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
         "guest_count": 150, "menu_items": [], "impact_multiplier": 1.3, "created_at": _now()},
    ])

    # ----- SEED POSITIONS -----
    labor_cost.seed_positions()

    return {
        "status": "seeded",
        "ingredients": len(ingredients),
        "recipes": len(recipes),
        "menu_items": len(menu_map),
        "events": len(event_data),
        "consumption_days": 30,
    }
