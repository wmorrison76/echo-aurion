"""
LUCCCA · Demo Data Seeder (iter266)
====================================
Idempotent seeder that ensures the demo environment has REAL data the
UX needs to look alive:

  • Commissary catalog       — pastry + banquet starter products
  • Outdoor BEO functions    — upcoming events for weather-rebook demo
  • Employee badge tokens    — for QR scanner punch-in demos

Each seeder skips when matching docs already exist. Run via:

  from demo_data_seed import seed_all_demo_data
  seed_all_demo_data()

Called from server.py startup AFTER the core seeders. Safe to re-run.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

import database

db = database.db


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed_commissary_catalog() -> int:
    """Idempotent: ensures a baseline commissary catalog exists so the
    Commissary Ordering panel can demo without an empty state.
    """
    starter_products = [
        # Pastry lane
        {"slug": "cheesecake-slice", "lane": "pastry", "name": "Cheesecake Slice",
         "unit": "portion", "pack_size": 12, "unit_cost": 4.50,
         "lead_time_hours": 24, "description": "NY-style cheesecake; 12 slices per pan."},
        {"slug": "croissant", "lane": "pastry", "name": "Croissant",
         "unit": "each", "pack_size": 1, "unit_cost": 1.85,
         "lead_time_hours": 48, "description": "Laminated dough; 24h cold rest + bake."},
        {"slug": "chocolate-mousse-cake", "lane": "pastry", "name": "Chocolate Mousse Cake",
         "unit": "each", "pack_size": 1, "unit_cost": 18.00,
         "lead_time_hours": 8, "description": "Biscuit base + chocolate mousse + glaze."},
        {"slug": "sourdough-loaf", "lane": "pastry", "name": "Sourdough Loaf",
         "unit": "each", "pack_size": 1, "unit_cost": 4.25,
         "lead_time_hours": 24, "description": "Levain refresh 24h ahead; bake morning of."},
        {"slug": "macaron-shells", "lane": "pastry", "name": "Macaron Shells",
         "unit": "case", "pack_size": 60, "unit_cost": 0.45,
         "lead_time_hours": 18, "description": "Aged whites; pipe + rest 60 min before bake."},
        # Banquet lane
        {"slug": "chicken-stock-1qt", "lane": "banquet", "name": "Chicken Stock (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 3.00,
         "lead_time_hours": 24, "description": "Roasted bones, mirepoix; 6h simmer."},
        {"slug": "veal-stock-1qt", "lane": "banquet", "name": "Veal Stock (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 5.50,
         "lead_time_hours": 48, "description": "Brown veal stock; 24h simmer for depth."},
        {"slug": "fish-stock-1qt", "lane": "banquet", "name": "Fish Stock (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 4.00,
         "lead_time_hours": 6, "description": "Quick fumet; 30 min simmer max."},
        {"slug": "demi-glace-1pt", "lane": "banquet", "name": "Demi-Glace (1 pt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 7.50,
         "lead_time_hours": 72, "description": "Reduce veal stock + sauce espagnole."},
        {"slug": "house-vinaigrette-1qt", "lane": "banquet", "name": "House Vinaigrette (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 2.75,
         "lead_time_hours": 2, "description": "Mustard, sherry vinegar, EVOO; emulsified."},
        {"slug": "ranch-dressing-1qt", "lane": "banquet", "name": "Ranch Dressing (1 qt)",
         "unit": "qt", "pack_size": 1, "unit_cost": 2.25,
         "lead_time_hours": 4, "description": "Buttermilk + herbs; rest 4h for flavor."},
        {"slug": "cut-fruit-case", "lane": "banquet", "name": "Cut Fruit Case",
         "unit": "case", "pack_size": 1, "unit_cost": 22.00,
         "lead_time_hours": 4, "description": "Pineapple / melon / berries; service-day prep."},
        {"slug": "tomato-soup-pint", "lane": "banquet", "name": "Tomato Soup (1 pint)",
         "unit": "qt", "pack_size": 1, "unit_cost": 1.95,
         "lead_time_hours": 4, "description": "Roasted tomato; 2h simmer."},
    ]

    existing = {d["slug"] for d in db["commissary_products"].find({}, {"slug": 1, "_id": 0})}
    to_insert = []
    for s in starter_products:
        if s["slug"] in existing:
            continue
        to_insert.append({
            "id": uuid.uuid4().hex[:12],
            **s,
            "active": True,
            "producing_outlet_id": "commissary-main",
            "recipe_id": None,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        })
    if to_insert:
        db["commissary_products"].insert_many(to_insert)
    # Ensure a few demo outlets have access to the full catalog so the
    # commissary ordering panel demo isn't empty on first open.
    all_products = list(db["commissary_products"].find({}, {"id": 1, "_id": 0}))
    demo_outlet_ids = ["outlet-cafe", "outlet-room-service", "outlet-grand-ballroom"]
    for outlet_id in demo_outlet_ids:
        for prod in all_products:
            db["commissary_approvals"].update_one(
                {"outlet_id": outlet_id, "product_id": prod["id"]},
                {"$set": {
                    "id": uuid.uuid4().hex[:12],
                    "outlet_id": outlet_id,
                    "product_id": prod["id"],
                    "is_active": True,
                    "approved_by_name": "Demo Seeder",
                    "approved_at": _now_iso(),
                    "max_units_per_day": None,
                    "note": "",
                }},
                upsert=True,
            )
    return len(to_insert)


def seed_outdoor_beo_functions() -> int:
    """Idempotent: ensure 3-5 upcoming outdoor BEO functions exist so the
    weather-rebook geofence demo has live targets to evaluate.
    """
    existing_demo_ids = {
        d.get("id") for d in db["beo_functions"].find(
            {"is_demo": True}, {"id": 1, "_id": 0}
        )
    }
    now = datetime.now(timezone.utc)

    fns = [
        {
            "id": "demo-bf-rooftop-sunset",
            "name": "Morrison Sunset Cocktail Reception",
            "property_id": "prop-pier66",
            "venue_id": "rooftop-deck",
            "venue_type": "outdoor",
            "backup_venue_id": "grand-ballroom-a",
            "start_at": (now + timedelta(days=1, hours=4)).isoformat(),
            "end_at":   (now + timedelta(days=1, hours=7)).isoformat(),
            "expected_covers": 120,
            "status": "confirmed",
            "client_name": "Morrison Family",
            "contact": "Sarah Morrison · 305-555-0142",
            "lat": 26.1224, "lng": -80.1373,
            "menu_summary": "Tray-passed canapés + open bar · 3-tier champagne tower",
        },
        {
            "id": "demo-bf-poolside-brunch",
            "name": "Wells / Chen Pool-Side Wedding Brunch",
            "property_id": "prop-pier66",
            "venue_id": "infinity-pool-lawn",
            "venue_type": "outdoor",
            "backup_venue_id": "atrium-hall",
            "start_at": (now + timedelta(days=2, hours=10)).isoformat(),
            "end_at":   (now + timedelta(days=2, hours=14)).isoformat(),
            "expected_covers": 180,
            "status": "confirmed",
            "client_name": "Wells-Chen Wedding",
            "contact": "Olivia Chen · 786-555-0918",
            "lat": 26.1218, "lng": -80.1378,
            "menu_summary": "Brunch buffet · omelet station · mimosa flight",
        },
        {
            "id": "demo-bf-garden-gala",
            "name": "Aurum Black-Tie Garden Gala",
            "property_id": "prop-pier66",
            "venue_id": "south-garden",
            "venue_type": "outdoor",
            "backup_venue_id": "grand-ballroom-a",
            "start_at": (now + timedelta(days=5, hours=18)).isoformat(),
            "end_at":   (now + timedelta(days=5, hours=23)).isoformat(),
            "expected_covers": 320,
            "status": "confirmed",
            "client_name": "Aurum Wealth Partners",
            "contact": "Charles Whitfield · 305-555-0277",
            "lat": 26.1220, "lng": -80.1370,
            "menu_summary": "5-course plated · wine pairing · live string quartet",
        },
        {
            "id": "demo-bf-beach-ceremony",
            "name": "Patel / Singh Beach Ceremony",
            "property_id": "prop-pier66",
            "venue_id": "private-beach",
            "venue_type": "outdoor",
            "backup_venue_id": "ocean-room",
            "start_at": (now + timedelta(days=6, hours=15, minutes=30)).isoformat(),
            "end_at":   (now + timedelta(days=6, hours=17)).isoformat(),
            "expected_covers": 95,
            "status": "tentative",
            "client_name": "Patel-Singh",
            "contact": "Anjali Patel · 305-555-0633",
            "lat": 26.1213, "lng": -80.1381,
            "menu_summary": "Ceremony + cocktail; dinner moves indoors",
        },
    ]

    to_insert = [fn for fn in fns if fn["id"] not in existing_demo_ids]
    for fn in to_insert:
        fn["is_demo"] = True
        fn["created_at"] = _now_iso()
        fn["updated_at"] = _now_iso()
    if to_insert:
        db["beo_functions"].insert_many(to_insert)
    return len(to_insert)


def seed_employee_badge_tokens() -> int:
    """Idempotent: ensure demo employees have badge_token values so the
    QR Scanner punch-in flow can demo end-to-end. Uses URL-safe random tokens.
    """
    employees = list(db["employees"].find(
        {"$or": [{"badge_token": {"$exists": False}}, {"badge_token": None}, {"badge_token": ""}]},
        {"id": 1, "_id": 0},
    ))
    updated = 0
    for emp in employees[:50]:  # cap so we don't churn forever
        token = secrets.token_urlsafe(12)
        db["employees"].update_one(
            {"id": emp["id"]},
            {"$set": {"badge_token": token, "updated_at": _now_iso()}},
        )
        updated += 1
    return updated


def seed_all_demo_data() -> dict:
    """Run every demo seeder. Idempotent: safe on each boot."""
    result = {
        "commissary_products": seed_commissary_catalog(),
        "outdoor_beo_functions": seed_outdoor_beo_functions(),
        "employee_badges": seed_employee_badge_tokens(),
    }
    summary = ", ".join(f"{k}=+{v}" for k, v in result.items() if v)
    if summary:
        print(f"[demo-seed] {summary}")
    return result
