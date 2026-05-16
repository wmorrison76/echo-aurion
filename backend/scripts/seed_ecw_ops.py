"""iter224 · Seed ECW Operations demo data (stations, menu items, components, recipes)."""
from database import db
from lib.time import utcnow_iso
import uuid


OUTLET = "outlet-main"

STATIONS = [
    {"name": "Hot Line · Breakfast", "sort": 10},
    {"name": "Hot Line · Lunch", "sort": 20},
    {"name": "Garde Manger · Cold", "sort": 30},
    {"name": "Pastry", "sort": 40},
    {"name": "Grill", "sort": 50},
]

ITEMS = [
    # (station_index, name, perishable, par_default, cost, sell_price, temp_min, temp_max)
    (0, "Scrambled Eggs",       True,  40, 0.85, 6.00, 60, 74),
    (0, "Bacon",                True,  80, 1.20, 5.00, 60, 74),
    (0, "Breakfast Sausage",    True,  60, 1.10, 5.50, 60, 74),
    (0, "Hash Potatoes",        True,  50, 0.45, 4.50, 60, 74),
    (0, "Pancakes",             False, 60, 0.55, 7.00, None, None),
    (1, "Grilled Chicken",      True,  30, 3.20, 14.00, 60, 74),
    (1, "Salmon Fillet",        True,  20, 5.50, 22.00, 60, 74),
    (1, "Steamed Rice",         False, 80, 0.25, 3.00, None, None),
    (2, "Caesar Salad",         True,  25, 1.80, 12.00, 0, 4),
    (2, "Fruit Salad",          True,  30, 1.50, 9.00, 0, 4),
    (2, "Hummus Plate",         True,  15, 2.20, 11.00, 0, 4),
    (3, "Blueberry Muffin",     False, 48, 0.80, 3.50, None, None),
    (3, "Chocolate Muffin",     False, 48, 0.85, 3.50, None, None),
    (3, "Croissant",            False, 36, 0.70, 4.00, None, None),
    (3, "Bagel (Plain)",        False, 36, 0.45, 3.00, None, None),
    (4, "8oz Dry-Aged Ribeye",  True,  12, 12.00, 48.00, 2, 4),
    (4, "Grilled Vegetables",   False, 25, 1.10, 8.00, None, None),
]

COMPONENTS = {
    "Scrambled Eggs": [
        ("whole eggs",    160, 0.60, True,  0, 4),
        ("butter",         12, 0.08, True,  0, 4),
        ("heavy cream",    30, 0.15, True,  0, 4),
        ("salt",            2, 0.01, False, None, None),
    ],
    "Grilled Chicken": [
        ("chicken breast", 180, 2.40, True, 0, 4),
        ("olive oil",       10, 0.15, False, None, None),
        ("lemon",           15, 0.20, True, 0, 10),
        ("garlic",           5, 0.10, False, None, None),
        ("herbs",            3, 0.15, True, 0, 10),
    ],
    "Salmon Fillet": [
        ("atlantic salmon", 180, 5.00, True, 0, 4),
        ("lemon",            15, 0.20, True, 0, 10),
        ("dill",              3, 0.10, True, 0, 4),
    ],
    "Blueberry Muffin": [
        ("flour",    80, 0.10, False, None, None),
        ("blueberries", 30, 0.40, True, 0, 4),
        ("sugar",    25, 0.08, False, None, None),
        ("butter",   20, 0.15, True, 0, 4),
        ("egg",      25, 0.10, True, 0, 4),
    ],
    "Caesar Salad": [
        ("romaine", 120, 0.80, True, 0, 4),
        ("parmesan", 15, 0.30, True, 0, 4),
        ("croutons", 20, 0.12, False, None, None),
        ("caesar dressing", 30, 0.40, True, 0, 4),
    ],
}

RECIPES = {
    "Scrambled Eggs": {
        "yield_qty": 1, "yield_unit": "plate",
        "prep_steps": [
            "Crack 4 eggs into bowl, whisk with 2 tbsp cream and pinch of salt",
            "Melt butter in non-stick pan on low heat",
            "Pour eggs, stir gently with silicone spatula",
            "Remove from heat while still glossy — carry-over will finish cooking",
            "Plate immediately; garnish with chives",
        ],
        "allergens": ["eggs", "dairy"], "tags": ["breakfast", "gf"],
    },
    "Grilled Chicken": {
        "yield_qty": 1, "yield_unit": "plate",
        "prep_steps": [
            "Marinate chicken in olive oil, lemon, garlic, herbs 30min min",
            "Pre-heat grill to 400°F",
            "Season chicken with salt & pepper",
            "Grill 5-6min per side, internal temp 165°F",
            "Rest 3min before plating",
        ],
        "allergens": [], "tags": ["lunch", "protein", "gf"],
    },
    "Salmon Fillet": {
        "yield_qty": 1, "yield_unit": "plate",
        "prep_steps": [
            "Pat salmon dry, season skin-side with salt",
            "Heat pan until smoking, add oil",
            "Place skin-side down, press gently, cook 4-5min",
            "Flip, add butter + lemon + dill, baste 2min",
            "Internal temp 125°F for medium",
        ],
        "allergens": ["fish", "dairy"], "tags": ["lunch", "protein", "heart-healthy"],
    },
    "Blueberry Muffin": {
        "yield_qty": 12, "yield_unit": "muffin",
        "prep_steps": [
            "Pre-heat oven 375°F, line muffin tin",
            "Whisk dry ingredients (flour, sugar, baking powder, salt)",
            "Whisk wet (melted butter, egg, milk, vanilla)",
            "Fold wet into dry until just combined — do not over-mix",
            "Fold in blueberries gently",
            "Fill cups 3/4, bake 18-22min until golden",
        ],
        "allergens": ["gluten", "dairy", "eggs"], "tags": ["pastry", "breakfast"],
    },
    "Caesar Salad": {
        "yield_qty": 1, "yield_unit": "plate",
        "prep_steps": [
            "Wash and chop romaine into bite-size",
            "Toss with dressing until lightly coated",
            "Top with shaved parmesan and croutons",
            "Cracked black pepper to taste",
        ],
        "allergens": ["dairy", "eggs", "gluten"], "tags": ["cold", "salad"],
    },
}


def seed() -> dict:
    # Skip if already seeded
    if db["menu_stations"].count_documents({"outlet_id": OUTLET}) > 0:
        return {"ok": True, "skipped": True,
                "stations": db["menu_stations"].count_documents({"outlet_id": OUTLET}),
                "items": db["menu_items"].count_documents({"outlet_id": OUTLET})}

    # Stations
    station_ids = {}
    for i, s in enumerate(STATIONS):
        sid = f"stn-{uuid.uuid4().hex[:10]}"
        db["menu_stations"].insert_one({
            "id": sid, "outlet_id": OUTLET, "name": s["name"],
            "sort": s["sort"], "active": True, "created_at": utcnow_iso(),
        })
        station_ids[i] = sid

    # Items
    item_ids = {}
    for si, name, perish, par, cost, sell, tmin, tmax in ITEMS:
        iid = f"mi-{uuid.uuid4().hex[:10]}"
        margin = 0.0 if sell == 0 else round((sell - cost) / sell, 3)
        db["menu_items"].insert_one({
            "id": iid, "outlet_id": OUTLET,
            "station_id": station_ids[si], "name": name,
            "is_perishable": perish, "par_default": par,
            "cost": cost, "sell_price": sell, "margin": margin,
            "temp_min_c": tmin, "temp_max_c": tmax,
            "active": True, "sort": 0, "created_at": utcnow_iso(),
        })
        item_ids[name] = iid

    # Components
    for item_name, comps in COMPONENTS.items():
        if item_name not in item_ids: continue
        for ingredient, qty, cost, perish, tmin, tmax in comps:
            db["menu_components"].insert_one({
                "id": f"mc-{uuid.uuid4().hex[:10]}",
                "item_id": item_ids[item_name],
                "ingredient": ingredient, "quantity_g": qty,
                "cost": cost, "is_perishable": perish,
                "temp_min_c": tmin, "temp_max_c": tmax,
                "created_at": utcnow_iso(),
            })

    # Recipes
    for item_name, r in RECIPES.items():
        if item_name not in item_ids: continue
        db["menu_recipes"].insert_one({
            "id": f"mr-{uuid.uuid4().hex[:10]}",
            "item_id": item_ids[item_name],
            "yield_qty": r["yield_qty"], "yield_unit": r["yield_unit"],
            "prep_steps": r["prep_steps"], "allergens": r["allergens"],
            "tags": r["tags"], "created_at": utcnow_iso(),
        })

    # Chef outlet access (william → outlet-main + optional secondary)
    db["chef_outlet_access"].update_one(
        {"chef_id": "chef-william"},
        {"$set": {
            "id": f"coa-{uuid.uuid4().hex[:10]}",
            "chef_id": "chef-william",
            "outlet_ids": ["outlet-main", "outlet-beachside"],
            "primary_outlet_id": "outlet-main",
            "role": "executive_chef",
            "updated_at": utcnow_iso(),
        }},
        upsert=True,
    )

    # Outlets catalog for switcher labels
    for oid, name in [("outlet-main", "Main Kitchen"),
                      ("outlet-beachside", "Beachside Grill")]:
        db["outlets_catalog"].update_one(
            {"id": oid},
            {"$set": {"id": oid, "name": name, "active": True,
                      "updated_at": utcnow_iso()}},
            upsert=True,
        )

    return {"ok": True, "stations": len(station_ids), "items": len(item_ids),
            "components": sum(len(v) for v in COMPONENTS.values()),
            "recipes": len(RECIPES)}


if __name__ == "__main__":
    import json
    print(json.dumps(seed(), indent=2))
