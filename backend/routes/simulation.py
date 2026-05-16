"""
30-Day Restaurant Simulation Engine
====================================
Generates 30 days of realistic restaurant operations data:
- POS transactions (breakfast, lunch, dinner, bar)
- GL entries (revenue, COGS, labor, OpEx)
- Purchase orders → Receiving → Invoices pipeline
- Labor schedules by department
- Waste tracking
All data flows through the real EchoAurum/EchoStratus P&L pipeline.
"""
import os
import random
import math
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from database import db

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

# ── Restaurant config ──
OUTLETS = [
    {"outlet_id": "main-dining", "name": "The Grand Dining Room", "type": "restaurant", "manager": "Chef Marco Bellini"},
    {"outlet_id": "banquet-hall", "name": "Crystal Ballroom", "type": "banquet", "manager": "Maria Santos"},
    {"outlet_id": "sky-bar", "name": "SkyBar Lounge", "type": "bar", "manager": "David Park"},
    {"outlet_id": "pool-cafe", "name": "Aqua Café", "type": "cafe", "manager": "Lisa Chang"},
    {"outlet_id": "main-kitchen", "name": "Central Kitchen", "type": "kitchen", "manager": "Chef Jean-Pierre"},
]

MENU_ITEMS = [
    # Breakfast
    {"name": "Classic Eggs Benedict", "category": "breakfast", "price": 22.00, "food_cost": 4.40, "outlet": "main-dining"},
    {"name": "Avocado Toast", "category": "breakfast", "price": 18.00, "food_cost": 3.60, "outlet": "main-dining"},
    {"name": "Belgian Waffle Stack", "category": "breakfast", "price": 16.00, "food_cost": 2.80, "outlet": "main-dining"},
    {"name": "Smoked Salmon Platter", "category": "breakfast", "price": 28.00, "food_cost": 8.40, "outlet": "main-dining"},
    {"name": "Continental Breakfast", "category": "breakfast", "price": 14.00, "food_cost": 3.50, "outlet": "pool-cafe"},
    # Lunch
    {"name": "Grilled Caesar Salad", "category": "lunch", "price": 19.00, "food_cost": 3.80, "outlet": "main-dining"},
    {"name": "Wagyu Burger", "category": "lunch", "price": 32.00, "food_cost": 9.60, "outlet": "main-dining"},
    {"name": "Lobster Roll", "category": "lunch", "price": 38.00, "food_cost": 12.00, "outlet": "main-dining"},
    {"name": "Mediterranean Bowl", "category": "lunch", "price": 24.00, "food_cost": 5.50, "outlet": "pool-cafe"},
    {"name": "Club Sandwich", "category": "lunch", "price": 20.00, "food_cost": 4.20, "outlet": "pool-cafe"},
    # Dinner
    {"name": "Pan-Seared Salmon", "category": "dinner", "price": 42.00, "food_cost": 12.60, "outlet": "main-dining"},
    {"name": "Filet Mignon 8oz", "category": "dinner", "price": 68.00, "food_cost": 22.00, "outlet": "main-dining"},
    {"name": "Rack of Lamb", "category": "dinner", "price": 56.00, "food_cost": 16.80, "outlet": "main-dining"},
    {"name": "Seafood Risotto", "category": "dinner", "price": 38.00, "food_cost": 9.50, "outlet": "main-dining"},
    {"name": "Duck Confit", "category": "dinner", "price": 46.00, "food_cost": 11.50, "outlet": "main-dining"},
    {"name": "Truffle Pasta", "category": "dinner", "price": 36.00, "food_cost": 8.00, "outlet": "main-dining"},
    {"name": "Vegetable Tasting Menu", "category": "dinner", "price": 52.00, "food_cost": 10.40, "outlet": "main-dining"},
    # Bar / Beverages
    {"name": "Craft Cocktail", "category": "beverage", "price": 18.00, "food_cost": 3.60, "outlet": "sky-bar"},
    {"name": "Premium Wine Glass", "category": "beverage", "price": 22.00, "food_cost": 6.60, "outlet": "sky-bar"},
    {"name": "Signature Martini", "category": "beverage", "price": 20.00, "food_cost": 4.00, "outlet": "sky-bar"},
    {"name": "Bottle of Champagne", "category": "beverage", "price": 120.00, "food_cost": 36.00, "outlet": "sky-bar"},
    {"name": "Beer Flight", "category": "beverage", "price": 16.00, "food_cost": 4.80, "outlet": "sky-bar"},
    {"name": "Non-Alcoholic Mocktail", "category": "beverage", "price": 12.00, "food_cost": 2.40, "outlet": "sky-bar"},
    # Banquet packages
    {"name": "Banquet Plated Dinner", "category": "banquet", "price": 85.00, "food_cost": 21.25, "outlet": "banquet-hall"},
    {"name": "Banquet Buffet Lunch", "category": "banquet", "price": 55.00, "food_cost": 15.40, "outlet": "banquet-hall"},
    {"name": "Cocktail Reception Package", "category": "banquet", "price": 45.00, "food_cost": 10.80, "outlet": "banquet-hall"},
    # Desserts
    {"name": "Crème Brûlée", "category": "dessert", "price": 14.00, "food_cost": 2.80, "outlet": "main-dining"},
    {"name": "Chocolate Lava Cake", "category": "dessert", "price": 16.00, "food_cost": 3.20, "outlet": "main-dining"},
    {"name": "Tiramisu", "category": "dessert", "price": 15.00, "food_cost": 3.00, "outlet": "main-dining"},
]

VENDORS = [
    {"name": "Blue Harbor Seafood Co.", "category": "seafood", "terms": "NET 30"},
    {"name": "Premium Meats Direct", "category": "proteins", "terms": "NET 15"},
    {"name": "Valley Fresh Produce", "category": "produce", "terms": "COD"},
    {"name": "Artisan Dairy Group", "category": "dairy", "terms": "NET 30"},
    {"name": "Global Spice Imports", "category": "dry_goods", "terms": "NET 45"},
    {"name": "Crystal Clean Supplies", "category": "chemicals", "terms": "NET 30"},
    {"name": "Pacific Paper Products", "category": "paper", "terms": "NET 30"},
    {"name": "Wine & Spirits Distributors", "category": "beverage", "terms": "NET 15"},
]

INVOICE_ITEMS_BY_VENDOR = {
    "Blue Harbor Seafood Co.": [
        {"item": "Atlantic Salmon Fillet", "unit": "LB", "price": 12.50},
        {"item": "Jumbo Shrimp 16/20", "unit": "LB", "price": 14.75},
        {"item": "Fresh Lobster Tail", "unit": "EA", "price": 18.50},
        {"item": "Sea Bass Fillet", "unit": "LB", "price": 16.00},
        {"item": "Crab Meat Lump", "unit": "LB", "price": 28.00},
    ],
    "Premium Meats Direct": [
        {"item": "USDA Prime Ribeye", "unit": "LB", "price": 28.00},
        {"item": "Filet Mignon Center Cut", "unit": "LB", "price": 42.00},
        {"item": "Rack of Lamb Frenched", "unit": "LB", "price": 24.00},
        {"item": "Duck Breast Magret", "unit": "LB", "price": 14.00},
        {"item": "Wagyu Ground Beef", "unit": "LB", "price": 18.00},
        {"item": "Pork Tenderloin", "unit": "LB", "price": 8.50},
    ],
    "Valley Fresh Produce": [
        {"item": "Organic Mixed Greens", "unit": "CASE", "price": 22.50},
        {"item": "Heirloom Tomatoes", "unit": "CASE", "price": 28.00},
        {"item": "Fresh Herbs Assorted", "unit": "BUNCH", "price": 3.50},
        {"item": "Avocados Hass", "unit": "CASE", "price": 35.00},
        {"item": "Lemons", "unit": "CASE", "price": 18.00},
        {"item": "Baby Spinach", "unit": "CASE", "price": 24.00},
        {"item": "Mushroom Medley", "unit": "LB", "price": 9.00},
    ],
    "Artisan Dairy Group": [
        {"item": "Heavy Cream", "unit": "GAL", "price": 8.50},
        {"item": "Unsalted Butter", "unit": "LB", "price": 4.25},
        {"item": "Gruyère Cheese", "unit": "LB", "price": 14.00},
        {"item": "Fresh Mozzarella", "unit": "LB", "price": 8.00},
        {"item": "Crème Fraîche", "unit": "QT", "price": 6.50},
    ],
    "Global Spice Imports": [
        {"item": "Truffle Oil", "unit": "BTL", "price": 22.00},
        {"item": "Saffron Threads", "unit": "OZ", "price": 45.00},
        {"item": "Arborio Rice", "unit": "BAG", "price": 18.00},
        {"item": "Extra Virgin Olive Oil", "unit": "GAL", "price": 28.00},
        {"item": "Dried Pasta Assorted", "unit": "CASE", "price": 24.00},
    ],
    "Crystal Clean Supplies": [
        {"item": "Dish Detergent Commercial", "unit": "CASE", "price": 42.00},
        {"item": "Sanitizer Concentrate", "unit": "GAL", "price": 18.00},
        {"item": "Degreaser Kitchen", "unit": "GAL", "price": 15.00},
        {"item": "Hand Soap Bulk", "unit": "CASE", "price": 28.00},
    ],
    "Pacific Paper Products": [
        {"item": "Dinner Napkins White", "unit": "CASE", "price": 35.00},
        {"item": "To-Go Containers Compostable", "unit": "CASE", "price": 48.00},
        {"item": "Cocktail Napkins", "unit": "CASE", "price": 22.00},
        {"item": "Kitchen Parchment Paper", "unit": "ROLL", "price": 12.00},
        {"item": "Aluminum Foil Heavy Duty", "unit": "ROLL", "price": 28.00},
    ],
    "Wine & Spirits Distributors": [
        {"item": "House Cabernet Sauvignon", "unit": "CASE", "price": 96.00},
        {"item": "House Chardonnay", "unit": "CASE", "price": 84.00},
        {"item": "Veuve Clicquot Champagne", "unit": "BTL", "price": 45.00},
        {"item": "Grey Goose Vodka", "unit": "BTL", "price": 32.00},
        {"item": "Hendricks Gin", "unit": "BTL", "price": 28.00},
        {"item": "Craft Beer Assorted", "unit": "CASE", "price": 36.00},
    ],
}

DOW_MULTIPLIER = {0: 0.70, 1: 0.75, 2: 0.85, 3: 0.90, 4: 1.10, 5: 1.30, 6: 1.15}  # Mon=0..Sun=6
SEASONALITY = {1: 0.72, 2: 0.78, 3: 0.88, 4: 0.95, 5: 1.05, 6: 1.12, 7: 1.08, 8: 0.98, 9: 0.92, 10: 1.02, 11: 1.10, 12: 1.18}

GL_CODES = {
    "food_revenue": {"code": "4000", "name": "Food Revenue", "type": "revenue"},
    "bev_revenue": {"code": "4100", "name": "Beverage Revenue", "type": "revenue"},
    "banquet_revenue": {"code": "4200", "name": "Banquet Revenue", "type": "revenue"},
    "food_cogs": {"code": "5000", "name": "Food Cost of Goods Sold", "type": "expense"},
    "bev_cogs": {"code": "5100", "name": "Beverage Cost of Goods Sold", "type": "expense"},
    "labor_boh": {"code": "6000", "name": "Labor - Kitchen/BOH", "type": "expense"},
    "labor_foh": {"code": "6010", "name": "Labor - FOH Service", "type": "expense"},
    "labor_mgmt": {"code": "6020", "name": "Labor - Management Salary", "type": "expense"},
    "labor_benefits": {"code": "6050", "name": "Labor - Benefits & Insurance", "type": "expense"},
    "paper_supplies": {"code": "5100", "name": "Paper & Disposable Supplies", "type": "expense"},
    "cleaning": {"code": "6500", "name": "Cleaning Supplies & Chemicals", "type": "expense"},
    "utilities": {"code": "7500", "name": "Utilities", "type": "expense"},
    "rent": {"code": "7000", "name": "Rent & Occupancy", "type": "expense"},
    "marketing": {"code": "8000", "name": "Marketing & Promotions", "type": "expense"},
    "maintenance": {"code": "8500", "name": "Repairs & Maintenance", "type": "expense"},
    "insurance": {"code": "7200", "name": "Insurance", "type": "expense"},
}


class SimulationRequest(BaseModel):
    days: int = 30
    start_date: Optional[str] = None  # ISO format, defaults to 30 days ago
    clear_existing: bool = True
    seed: int = 42


def _generate_daily_pos(day_date, menu, day_mult, season_mult, rng):
    """Generate POS transactions for a single day."""
    transactions = []
    base_txn_count = 110  # base transactions per day
    daily_count = max(40, int(base_txn_count * day_mult * season_mult + rng.gauss(0, 12)))

    meal_dist = {"breakfast": 0.20, "lunch": 0.28, "dinner": 0.32, "beverage": 0.12, "dessert": 0.08}

    for meal_type, share in meal_dist.items():
        count = max(3, int(daily_count * share))
        meal_items = [m for m in menu if m["category"] == meal_type]
        if not meal_items:
            meal_items = [m for m in menu if m["category"] == "lunch"]

        for _ in range(count):
            items_count = rng.choices([1, 2, 3, 4], weights=[0.25, 0.40, 0.25, 0.10])[0]
            chosen_items = rng.choices(meal_items, k=items_count)
            guest_count = rng.randint(1, 4)

            txn_items = []
            subtotal = 0
            food_cost_total = 0
            for item in chosen_items:
                qty = 1 if meal_type == "beverage" else rng.choices([1, 2], weights=[0.85, 0.15])[0]
                price_var = item["price"] * rng.uniform(0.95, 1.05)
                ext = round(qty * price_var, 2)
                fc = round(qty * item["food_cost"], 2)
                subtotal += ext
                food_cost_total += fc
                txn_items.append({
                    "name": item["name"],
                    "quantity": qty,
                    "price": round(price_var, 2),
                    "revenue": ext,
                    "food_cost": fc,
                    "food_cost_pct": round(fc / ext * 100, 2) if ext > 0 else 0,
                    "category": item["category"],
                })

            tax = round(subtotal * 0.0825, 2)
            tip = round(subtotal * rng.uniform(0.15, 0.25), 2)
            total = round(subtotal + tax + tip, 2)

            hour = {"breakfast": rng.randint(7, 10), "lunch": rng.randint(11, 14),
                    "dinner": rng.randint(17, 22), "beverage": rng.randint(16, 23),
                    "dessert": rng.randint(18, 22), "banquet": rng.randint(18, 21)}
            h = hour.get(meal_type, 12)
            closed_at = day_date.replace(hour=h, minute=rng.randint(0, 59)).isoformat()

            outlet = chosen_items[0].get("outlet", "main-dining")
            server_names = ["Alex T.", "Maria G.", "James W.", "Sofia R.", "Chen L.", "Priya M.", "Robert K.", "Anna S."]

            transactions.append({
                "id": _uid(),
                "external_id": f"POS-{_uid()}",
                "provider": "generic",
                "transaction_type": "sale",
                "outlet_id": outlet,
                "server_name": rng.choice(server_names),
                "subtotal": round(subtotal, 2),
                "tax": tax,
                "tip": tip,
                "total": total,
                "guest_count": guest_count,
                "items": txn_items,
                "food_cost_total": round(food_cost_total, 2),
                "food_cost_pct": round(food_cost_total / subtotal * 100, 2) if subtotal > 0 else 0,
                "closed_at": closed_at,
                "processed_at": closed_at,
                "meal_period": meal_type,
            })

    return transactions


def _generate_banquet_events(start_date, days, rng):
    """Generate banquet events over the simulation period."""
    events = []
    for d in range(days):
        day = start_date + timedelta(days=d)
        dow = day.weekday()
        if dow >= 4 or rng.random() < 0.25:
            guest_count = rng.choice([50, 80, 120, 150, 200, 250, 300])
            pkg = rng.choice(["Banquet Plated Dinner", "Banquet Buffet Lunch", "Cocktail Reception Package"])
            pkg_item = next((m for m in MENU_ITEMS if m["name"] == pkg), MENU_ITEMS[-4])
            revenue = round(guest_count * pkg_item["price"], 2)
            food_cost = round(guest_count * pkg_item["food_cost"], 2)
            bev_add = round(guest_count * rng.uniform(15, 35), 2)

            events.append({
                "id": _uid(),
                "name": rng.choice(["Corporate Gala", "Wedding Reception", "Annual Awards Dinner",
                                     "Product Launch", "Charity Fundraiser", "Holiday Party",
                                     "Board Meeting Dinner", "Anniversary Celebration"]),
                "event_date": day.strftime("%Y-%m-%d"),
                "venue": "Crystal Ballroom",
                "room": "Grand Hall" if guest_count > 150 else "Salon A",
                "guest_count": guest_count,
                "package": pkg,
                "revenue": {"food": revenue, "beverage": bev_add, "total": round(revenue + bev_add, 2)},
                "food_cost": food_cost,
                "stage": rng.choice(["beo_approved", "contract_signed", "completed"]),
                "status": "confirmed",
                "outlet_id": "banquet-hall",
                "created_at": (day - timedelta(days=rng.randint(14, 60))).isoformat(),
            })
    return events


def _generate_invoices_and_pos(start_date, days, daily_food_cost, daily_bev_cost, rng):
    """Generate vendor invoices, purchase orders, and receiving logs."""
    invoices = []
    purchase_orders = []
    receiving_logs = []

    for d in range(0, days, 3):  # deliveries every ~3 days
        delivery_date = start_date + timedelta(days=d)
        period = delivery_date.strftime("%Y-%m")

        for vendor in VENDORS:
            if vendor["category"] in ("chemicals", "paper") and d % 9 != 0:
                continue
            if vendor["category"] == "beverage" and d % 6 != 0:
                continue

            vendor_items = INVOICE_ITEMS_BY_VENDOR.get(vendor["name"], [])
            if not vendor_items:
                continue

            num_items = rng.randint(2, min(len(vendor_items), 6))
            chosen = rng.sample(vendor_items, num_items)

            line_items = []
            subtotal = 0
            for item in chosen:
                qty = rng.randint(3, 30)
                price = round(item["price"] * rng.uniform(0.97, 1.03), 2)
                ext = round(qty * price, 2)
                subtotal += ext
                line_items.append({
                    "item_code": f"SKU-{_uid()[:6]}",
                    "description": item["item"],
                    "quantity_ordered": qty,
                    "quantity_shipped": qty if rng.random() > 0.08 else qty - rng.randint(1, 3),
                    "pack_unit": item["unit"],
                    "unit_price": price,
                    "extension": ext,
                })

            tax = round(subtotal * 0.0825, 2)
            total = round(subtotal + tax, 2)

            inv_num = f"INV-{vendor['name'][:3].upper()}-{_uid()[:6]}"
            po_id = f"PO-{_uid()}"

            # Determine GL code based on vendor category
            gl_map = {"seafood": "5000", "proteins": "5000", "produce": "5000",
                      "dairy": "5000", "dry_goods": "5000", "chemicals": "6500",
                      "paper": "5100", "beverage": "5100"}
            gl_code = gl_map.get(vendor["category"], "5000")

            purchase_orders.append({
                "po_id": po_id,
                "vendor_id": f"v-{vendor['name'][:8].lower().replace(' ', '')}",
                "vendor_name": vendor["name"],
                "status": "received",
                "items": line_items,
                "subtotal": round(subtotal, 2),
                "tax": tax,
                "total": total,
                "delivery_date": delivery_date.strftime("%Y-%m-%d"),
                "gl_code": gl_code,
                "notes": "",
                "created_at": (delivery_date - timedelta(days=rng.randint(2, 5))).isoformat(),
            })

            receiving_logs.append({
                "receive_id": f"rcv-{_uid()}",
                "po_id": po_id,
                "vendor_id": f"v-{vendor['name'][:8].lower().replace(' ', '')}",
                "vendor_name": vendor["name"],
                "received_by": rng.choice(["Chef Marco", "Sous Chef Ana", "Receiving Clerk Tom"]),
                "items_received": line_items,
                "temperature_check": "pass" if rng.random() > 0.05 else "fail",
                "quality_check": "pass" if rng.random() > 0.03 else "marginal",
                "notes": "",
                "invoice_number": inv_num,
                "gl_code": gl_code,
                "status": "received",
                "received_at": delivery_date.replace(hour=rng.randint(6, 9)).isoformat(),
            })

            # Determine invoice category for GL classification
            inv_cat = "food"
            if vendor["category"] == "beverage":
                inv_cat = "beverage"
            elif vendor["category"] in ("chemicals", "paper"):
                inv_cat = "supplies"

            invoices.append({
                "invoice_id": f"inv-{_uid()}",
                "invoice_number": inv_num,
                "vendor_name": vendor["name"],
                "vendor_category": vendor["category"],
                "po_id": po_id,
                "invoice_date": delivery_date.strftime("%Y-%m-%d"),
                "due_date": (delivery_date + timedelta(days=int(vendor["terms"].split()[-1]) if "NET" in vendor["terms"] else 0)).strftime("%Y-%m-%d"),
                "payment_terms": vendor["terms"],
                "line_items": line_items,
                "subtotal": round(subtotal, 2),
                "tax": tax,
                "total": total,
                "status": rng.choice(["approved", "approved", "approved", "paid", "paid"]),
                "gl_code": gl_code,
                "category": inv_cat,
                "period": period,
                "image_url": None,
                "created_at": delivery_date.isoformat(),
                "approved_at": (delivery_date + timedelta(days=1)).isoformat() if rng.random() > 0.1 else None,
                "paid_at": (delivery_date + timedelta(days=rng.randint(7, 30))).isoformat() if rng.random() > 0.4 else None,
            })

    return invoices, purchase_orders, receiving_logs


def _generate_gl_entries(start_date, days, daily_pos_data, invoices, events_data, rng):
    """Generate GL journal entries from all data sources."""
    entries = []

    for d in range(days):
        day = start_date + timedelta(days=d)
        period = day.strftime("%Y-%m")
        day_str = day.strftime("%Y-%m-%d")

        pos_day = daily_pos_data.get(d, [])
        food_rev = sum(sum(it["revenue"] for it in t["items"] if it["category"] not in ("beverage",)) for t in pos_day)
        bev_rev = sum(sum(it["revenue"] for it in t["items"] if it["category"] == "beverage") for t in pos_day)
        food_cost = sum(sum(it["food_cost"] for it in t["items"] if it["category"] not in ("beverage",)) for t in pos_day)
        bev_cost = sum(sum(it["food_cost"] for it in t["items"] if it["category"] == "beverage") for t in pos_day)

        # Banquet revenue
        day_events = [e for e in events_data if e["event_date"] == day_str]
        banquet_rev = sum(e["revenue"]["total"] for e in day_events)
        banquet_food = sum(e["food_cost"] for e in day_events)

        # Revenue entries
        if food_rev > 0:
            entries.append({
                "id": _uid(), "gl_code": "4000", "gl_name": "Food Revenue",
                "entry_type": "revenue", "amount": round(food_rev, 2),
                "period": period, "date": day_str, "source": "pos",
                "posted_at": day.isoformat(), "description": f"Daily food revenue {day_str}",
            })
        if bev_rev > 0:
            entries.append({
                "id": _uid(), "gl_code": "4100", "gl_name": "Beverage Revenue",
                "entry_type": "revenue", "amount": round(bev_rev, 2),
                "period": period, "date": day_str, "source": "pos",
                "posted_at": day.isoformat(), "description": f"Daily beverage revenue {day_str}",
            })
        if banquet_rev > 0:
            entries.append({
                "id": _uid(), "gl_code": "4200", "gl_name": "Banquet & Event Revenue",
                "entry_type": "revenue", "amount": round(banquet_rev, 2),
                "period": period, "date": day_str, "source": "events",
                "posted_at": day.isoformat(), "description": f"Banquet revenue {day_str}",
            })

        # COGS entries
        total_food_cost = food_cost + banquet_food
        if total_food_cost > 0:
            entries.append({
                "id": _uid(), "gl_code": "5000", "gl_name": "Food Cost of Goods Sold",
                "entry_type": "expense", "amount": round(total_food_cost, 2),
                "period": period, "date": day_str, "source": "pos+events",
                "posted_at": day.isoformat(), "description": f"Daily food COGS {day_str}",
            })
        if bev_cost > 0:
            entries.append({
                "id": _uid(), "gl_code": "5100", "gl_name": "Beverage Cost of Goods Sold",
                "entry_type": "expense", "amount": round(bev_cost, 2),
                "period": period, "date": day_str, "source": "pos",
                "posted_at": day.isoformat(), "description": f"Daily beverage COGS {day_str}",
            })

    # Monthly fixed / semi-variable entries
    months_covered = set()
    for d in range(days):
        months_covered.add((start_date + timedelta(days=d)).strftime("%Y-%m"))

    for period in sorted(months_covered):
        month_int = int(period.split("-")[1])
        season = SEASONALITY.get(month_int, 1.0)

        # Labor entries (monthly)
        entries.append({"id": _uid(), "gl_code": "6000", "gl_name": "Labor - Kitchen/BOH",
                        "entry_type": "expense", "amount": round(45000 * season, 2),
                        "period": period, "date": f"{period}-15", "source": "payroll",
                        "posted_at": f"{period}-15T00:00:00", "description": f"Monthly BOH labor {period}"})
        entries.append({"id": _uid(), "gl_code": "6010", "gl_name": "Labor - FOH Service",
                        "entry_type": "expense", "amount": round(38000 * season, 2),
                        "period": period, "date": f"{period}-15", "source": "payroll",
                        "posted_at": f"{period}-15T00:00:00", "description": f"Monthly FOH labor {period}"})
        entries.append({"id": _uid(), "gl_code": "6020", "gl_name": "Labor - Management Salary",
                        "entry_type": "expense", "amount": 22000.00,
                        "period": period, "date": f"{period}-15", "source": "payroll",
                        "posted_at": f"{period}-15T00:00:00", "description": f"Monthly management salary {period}"})
        entries.append({"id": _uid(), "gl_code": "6050", "gl_name": "Labor - Benefits & Insurance",
                        "entry_type": "expense", "amount": 18500.00,
                        "period": period, "date": f"{period}-15", "source": "payroll",
                        "posted_at": f"{period}-15T00:00:00", "description": f"Monthly benefits {period}"})

        # Fixed OpEx
        entries.append({"id": _uid(), "gl_code": "7000", "gl_name": "Rent & Occupancy",
                        "entry_type": "expense", "amount": 28000.00,
                        "period": period, "date": f"{period}-01", "source": "fixed",
                        "posted_at": f"{period}-01T00:00:00", "description": f"Monthly rent {period}"})
        entries.append({"id": _uid(), "gl_code": "7500", "gl_name": "Utilities",
                        "entry_type": "expense", "amount": round(8500 * season, 2),
                        "period": period, "date": f"{period}-01", "source": "fixed",
                        "posted_at": f"{period}-01T00:00:00", "description": f"Monthly utilities {period}"})
        entries.append({"id": _uid(), "gl_code": "8000", "gl_name": "Marketing & Promotions",
                        "entry_type": "expense", "amount": round(rng.uniform(3000, 6000), 2),
                        "period": period, "date": f"{period}-01", "source": "fixed",
                        "posted_at": f"{period}-01T00:00:00", "description": f"Monthly marketing {period}"})
        entries.append({"id": _uid(), "gl_code": "8500", "gl_name": "Repairs & Maintenance",
                        "entry_type": "expense", "amount": round(rng.uniform(2000, 5000), 2),
                        "period": period, "date": f"{period}-01", "source": "fixed",
                        "posted_at": f"{period}-01T00:00:00", "description": f"Monthly R&M {period}"})
        entries.append({"id": _uid(), "gl_code": "7200", "gl_name": "Insurance",
                        "entry_type": "expense", "amount": 4200.00,
                        "period": period, "date": f"{period}-01", "source": "fixed",
                        "posted_at": f"{period}-01T00:00:00", "description": f"Monthly insurance {period}"})

    return entries


def _generate_labor_schedules(start_date, days, rng):
    """Generate daily labor schedules."""
    schedules = []
    departments = [
        {"dept": "Kitchen/BOH", "base_staff": 12, "hourly": 18.50},
        {"dept": "FOH Service", "base_staff": 15, "hourly": 14.00},
        {"dept": "Bar", "base_staff": 4, "hourly": 16.00},
        {"dept": "Management", "base_staff": 3, "hourly": 35.00},
        {"dept": "Stewarding", "base_staff": 5, "hourly": 13.00},
    ]
    for d in range(days):
        day = start_date + timedelta(days=d)
        dow = day.weekday()
        mult = DOW_MULTIPLIER.get(dow, 1.0)

        for dept in departments:
            staff = max(2, int(dept["base_staff"] * mult + rng.gauss(0, 1)))
            hours = rng.uniform(7.5, 10.0)
            overtime_hrs = max(0, hours - 8) * staff * 0.3
            base_cost = round(staff * hours * dept["hourly"], 2)
            ot_cost = round(overtime_hrs * dept["hourly"] * 1.5, 2)

            schedules.append({
                "id": _uid(),
                "date": day.strftime("%Y-%m-%d"),
                "department": dept["dept"],
                "staff_count": staff,
                "hours_scheduled": round(staff * hours, 1),
                "overtime_hours": round(overtime_hrs, 1),
                "base_cost": base_cost,
                "overtime_cost": ot_cost,
                "total_cost": round(base_cost + ot_cost, 2),
                "hourly_rate": dept["hourly"],
            })
    return schedules


def _generate_waste(start_date, days, rng):
    """Generate waste tracking entries."""
    waste_items = [
        "Mixed Greens", "Salmon Trim", "Bread/Rolls", "Fruit Garnish",
        "Prep Scraps", "Returned Plates", "Expired Dairy", "Overcooked Proteins",
    ]
    waste = []
    for d in range(days):
        day = start_date + timedelta(days=d)
        entries_today = rng.randint(2, 6)
        for _ in range(entries_today):
            item = rng.choice(waste_items)
            lbs = round(rng.uniform(0.5, 8.0), 1)
            cost_per_lb = rng.uniform(2.0, 18.0)
            waste.append({
                "id": _uid(),
                "date": day.strftime("%Y-%m-%d"),
                "item": item,
                "quantity": lbs,
                "unit": "LB",
                "cost": round(lbs * cost_per_lb, 2),
                "value": round(lbs * cost_per_lb, 2),
                "reason": rng.choice(["overproduction", "spoilage", "quality", "returned", "prep_waste"]),
                "department": rng.choice(["Kitchen", "Pastry", "Bar", "Banquet"]),
                "logged_by": rng.choice(["Chef Marco", "Sous Chef Ana", "Line Cook Jake"]),
                "created_at": day.isoformat(),
            })
    return waste


@router.post("/run-30-days")
async def run_simulation(req: SimulationRequest):
    """Run a full 30-day restaurant simulation populating all financial data."""
    rng = random.Random(req.seed)
    days = req.days

    if req.start_date:
        start_date = datetime.fromisoformat(req.start_date).replace(tzinfo=timezone.utc)
    else:
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Clear existing simulation data if requested
    if req.clear_existing:
        db["pos_transactions"].delete_many({})
        db["gl_entries"].delete_many({})
        db["events"].delete_many({})
        db["invoices"].delete_many({})
        db["pr_purchase_orders"].delete_many({})
        db["pr_receiving_log"].delete_many({})
        db["labor_schedules"].delete_many({})
        db["waste_tracking"].delete_many({})
        db["outlets"].delete_many({})
        db["labor_actuals"].delete_many({})

    # 1. Seed outlets
    for o in OUTLETS:
        db["outlets"].update_one({"outlet_id": o["outlet_id"]}, {"$set": o}, upsert=True)

    # 2. Generate banquet events
    events_data = _generate_banquet_events(start_date, days, rng)

    # 3. Generate daily POS transactions
    daily_pos = {}
    all_txns = []
    for d in range(days):
        day = start_date + timedelta(days=d)
        dow = day.weekday()
        month = day.month
        day_mult = DOW_MULTIPLIER.get(dow, 1.0)
        season_mult = SEASONALITY.get(month, 1.0)

        txns = _generate_daily_pos(day, MENU_ITEMS, day_mult, season_mult, rng)
        daily_pos[d] = txns
        all_txns.extend(txns)

    # 4. Generate invoices, POs, receiving
    avg_daily_food = sum(t["food_cost_total"] for t in all_txns) / max(days, 1)
    avg_daily_bev = avg_daily_food * 0.3
    invoices, pos_list, receiving = _generate_invoices_and_pos(start_date, days, avg_daily_food, avg_daily_bev, rng)

    # 5. Generate GL entries
    gl_entries = _generate_gl_entries(start_date, days, daily_pos, invoices, events_data, rng)

    # 6. Generate labor schedules
    labor = _generate_labor_schedules(start_date, days, rng)

    # 7. Generate waste
    waste = _generate_waste(start_date, days, rng)

    # ── Bulk insert everything ──
    if all_txns:
        db["pos_transactions"].insert_many(all_txns)
    if events_data:
        db["events"].insert_many(events_data)
    if invoices:
        db["invoices"].insert_many(invoices)
    if pos_list:
        db["pr_purchase_orders"].insert_many(pos_list)
    if receiving:
        db["pr_receiving_log"].insert_many(receiving)
    if gl_entries:
        db["gl_entries"].insert_many(gl_entries)
    if labor:
        db["labor_schedules"].insert_many(labor)
    if waste:
        db["waste_tracking"].insert_many(waste)

    # ── Compute summary ──
    total_revenue = sum(e["amount"] for e in gl_entries if e["entry_type"] == "revenue")
    total_expenses = sum(e["amount"] for e in gl_entries if e["entry_type"] == "expense")
    total_food_cost = sum(e["amount"] for e in gl_entries if "food" in e["gl_name"].lower() and e["entry_type"] == "expense")
    total_bev_cost = sum(e["amount"] for e in gl_entries if "beverage" in e["gl_name"].lower() and e["entry_type"] == "expense")
    total_labor = sum(s["total_cost"] for s in labor)
    total_covers = sum(t["guest_count"] for t in all_txns) + sum(e["guest_count"] for e in events_data)

    return {
        "status": "simulation_complete",
        "period": f"{start_date.strftime('%Y-%m-%d')} to {(start_date + timedelta(days=days-1)).strftime('%Y-%m-%d')}",
        "days_simulated": days,
        "data_generated": {
            "pos_transactions": len(all_txns),
            "banquet_events": len(events_data),
            "invoices": len(invoices),
            "purchase_orders": len(pos_list),
            "receiving_logs": len(receiving),
            "gl_entries": len(gl_entries),
            "labor_schedules": len(labor),
            "waste_entries": len(waste),
            "outlets": len(OUTLETS),
        },
        "financial_summary": {
            "total_revenue": round(total_revenue, 2),
            "total_expenses": round(total_expenses, 2),
            "ebitda": round(total_revenue - total_expenses, 2),
            "food_cost": round(total_food_cost, 2),
            "food_cost_pct": round(total_food_cost / total_revenue * 100, 1) if total_revenue > 0 else 0,
            "beverage_cost": round(total_bev_cost, 2),
            "total_labor": round(total_labor, 2),
            "labor_pct": round(total_labor / total_revenue * 100, 1) if total_revenue > 0 else 0,
            "total_covers": total_covers,
            "avg_check": round(sum(t["total"] for t in all_txns) / max(len(all_txns), 1), 2),
            "total_waste": round(sum(w["cost"] for w in waste), 2),
        },
    }


@router.get("/status")
async def simulation_status():
    """Check current simulation data status."""
    return {
        "pos_transactions": db["pos_transactions"].count_documents({}),
        "gl_entries": db["gl_entries"].count_documents({}),
        "events": db["events"].count_documents({}),
        "invoices": db["invoices"].count_documents({}),
        "purchase_orders": db["pr_purchase_orders"].count_documents({}),
        "receiving_logs": db["pr_receiving_log"].count_documents({}),
        "labor_schedules": db["labor_schedules"].count_documents({}),
        "waste_entries": db["waste_tracking"].count_documents({}),
        "outlets": db["outlets"].count_documents({}),
    }


# ── Invoice drill-down endpoints ──

@router.get("/invoices")
async def list_invoices(status: Optional[str] = None, vendor: Optional[str] = None, limit: int = 50):
    """List all invoices with filtering."""
    q = {}
    if status:
        q["status"] = status
    if vendor:
        q["vendor_name"] = {"$regex": vendor, "$options": "i"}
    invoices = list(db["invoices"].find(q, {"_id": 0}).sort("invoice_date", -1).limit(limit))
    total = db["invoices"].count_documents(q)
    summary = {
        "total_invoices": total,
        "total_amount": round(sum(i.get("total", 0) for i in invoices), 2),
        "by_status": {},
        "by_category": {},
    }
    for inv in invoices:
        s = inv.get("status", "unknown")
        c = inv.get("category", "other")
        summary["by_status"][s] = summary["by_status"].get(s, 0) + 1
        summary["by_category"][c] = round(summary["by_category"].get(c, 0) + inv.get("total", 0), 2)

    return {"invoices": invoices, "summary": summary}


@router.get("/invoices/{invoice_id}")
async def get_invoice_detail(invoice_id: str):
    """Get full invoice detail with PO and receiving linkage."""
    invoice = db["invoices"].find_one({"invoice_id": invoice_id}, {"_id": 0})
    if not invoice:
        return {"error": "Invoice not found"}

    po = None
    receiving = None
    if invoice.get("po_id"):
        po = db["pr_purchase_orders"].find_one({"po_id": invoice["po_id"]}, {"_id": 0})
        receiving = db["pr_receiving_log"].find_one({"po_id": invoice["po_id"]}, {"_id": 0})

    # Check for discrepancies between ordered and received
    discrepancies = []
    for item in invoice.get("line_items", []):
        ordered = item.get("quantity_ordered", 0)
        shipped = item.get("quantity_shipped", 0)
        if ordered and shipped and ordered != shipped:
            discrepancies.append({
                "item": item.get("description"),
                "ordered": ordered,
                "shipped": shipped,
                "variance": shipped - ordered,
                "type": "short" if shipped < ordered else "over",
            })

    return {
        "invoice": invoice,
        "purchase_order": po,
        "receiving_log": receiving,
        "discrepancies": discrepancies,
        "audit_trail": {
            "created": invoice.get("created_at"),
            "approved": invoice.get("approved_at"),
            "paid": invoice.get("paid_at"),
        },
    }


@router.get("/pnl-drilldown")
async def pnl_drilldown(category: Optional[str] = None, period: Optional[str] = None):
    """Drill down into P&L categories — returns source transactions."""
    q = {}
    if period:
        q["period"] = period
    if category:
        cat_map = {
            "food_revenue": {"gl_code": "4000"},
            "bev_revenue": {"gl_code": "4100"},
            "banquet_revenue": {"gl_code": "4200"},
            "food_cogs": {"gl_code": "5000"},
            "bev_cogs": {"gl_code": "5100"},
            "labor_boh": {"gl_code": "6000"},
            "labor_foh": {"gl_code": "6010"},
            "labor_mgmt": {"gl_code": "6020"},
            "labor_benefits": {"gl_code": "6050"},
            "rent": {"gl_code": "7000"},
            "utilities": {"gl_code": "7500"},
            "marketing": {"gl_code": "8000"},
            "maintenance": {"gl_code": "8500"},
            "insurance": {"gl_code": "7200"},
        }
        if category in cat_map:
            q.update(cat_map[category])
        elif category == "labor":
            q["gl_code"] = {"$in": ["6000", "6010", "6020", "6050"]}
        elif category == "revenue":
            q["entry_type"] = "revenue"
        elif category == "expenses":
            q["entry_type"] = "expense"

    entries = list(db["gl_entries"].find(q, {"_id": 0}).sort("date", -1).limit(200))
    total = round(sum(e.get("amount", 0) for e in entries), 2)

    # Group by date for chart
    by_date = {}
    for e in entries:
        d = e.get("date", "unknown")
        by_date[d] = round(by_date.get(d, 0) + e.get("amount", 0), 2)

    return {
        "category": category or "all",
        "period": period or "all",
        "total": total,
        "entry_count": len(entries),
        "entries": entries,
        "by_date": [{"date": k, "amount": v} for k, v in sorted(by_date.items())],
    }


@router.get("/purchasing-pipeline")
async def purchasing_pipeline():
    """Full purchasing → receiving → invoice pipeline view."""
    pos_orders = list(db["pr_purchase_orders"].find({}, {"_id": 0}).sort("created_at", -1).limit(50))
    receiving = list(db["pr_receiving_log"].find({}, {"_id": 0}).sort("received_at", -1).limit(50))
    invoices = list(db["invoices"].find({}, {"_id": 0}).sort("invoice_date", -1).limit(50))

    # Build linked pipeline
    po_map = {po["po_id"]: po for po in pos_orders}
    rcv_map = {}
    for r in receiving:
        rcv_map[r.get("po_id", "")] = r
    inv_map = {}
    for inv in invoices:
        inv_map[inv.get("po_id", "")] = inv

    pipeline = []
    for po_id, po in po_map.items():
        pipeline.append({
            "po_id": po_id,
            "vendor": po.get("vendor_name"),
            "po_total": po.get("total"),
            "po_date": po.get("created_at", "")[:10],
            "po_status": po.get("status"),
            "received": rcv_map.get(po_id) is not None,
            "received_date": rcv_map.get(po_id, {}).get("received_at", "")[:10] if rcv_map.get(po_id) else None,
            "temp_check": rcv_map.get(po_id, {}).get("temperature_check") if rcv_map.get(po_id) else None,
            "invoiced": inv_map.get(po_id) is not None,
            "invoice_id": inv_map.get(po_id, {}).get("invoice_id") if inv_map.get(po_id) else None,
            "invoice_total": inv_map.get(po_id, {}).get("total") if inv_map.get(po_id) else None,
            "invoice_status": inv_map.get(po_id, {}).get("status") if inv_map.get(po_id) else None,
            "complete": rcv_map.get(po_id) is not None and inv_map.get(po_id) is not None,
        })

    pipeline.sort(key=lambda x: x.get("po_date", ""), reverse=True)

    return {
        "pipeline": pipeline,
        "summary": {
            "total_pos": len(pos_orders),
            "total_received": sum(1 for p in pipeline if p["received"]),
            "total_invoiced": sum(1 for p in pipeline if p["invoiced"]),
            "fully_linked": sum(1 for p in pipeline if p["complete"]),
            "total_po_value": round(sum(po.get("total", 0) for po in pos_orders), 2),
            "total_invoice_value": round(sum(inv.get("total", 0) for inv in invoices), 2),
        },
    }


@router.get("/gap-analysis")
async def gap_analysis():
    """Analyze gaps and weaknesses in the financial system after simulation."""
    pos_count = db["pos_transactions"].count_documents({})
    gl_count = db["gl_entries"].count_documents({})
    inv_count = db["invoices"].count_documents({})
    po_count = db["pr_purchase_orders"].count_documents({})
    rcv_count = db["pr_receiving_log"].count_documents({})
    event_count = db["events"].count_documents({})
    labor_count = db["labor_schedules"].count_documents({})
    waste_count = db["waste_tracking"].count_documents({})

    gaps = []

    # Check data completeness
    if pos_count == 0:
        gaps.append({"area": "POS", "severity": "critical", "issue": "No POS transactions — run simulation first"})
    if gl_count == 0:
        gaps.append({"area": "GL", "severity": "critical", "issue": "No GL entries — accounting system empty"})
    if inv_count == 0:
        gaps.append({"area": "Invoices", "severity": "high", "issue": "No invoices — AP system empty"})

    # Check PO → Invoice linkage
    pos_orders = list(db["pr_purchase_orders"].find({}, {"_id": 0, "po_id": 1}))
    invoices = list(db["invoices"].find({}, {"_id": 0, "po_id": 1}))
    inv_po_ids = {i.get("po_id") for i in invoices}
    unlinked_pos = [po for po in pos_orders if po["po_id"] not in inv_po_ids]
    if unlinked_pos:
        gaps.append({"area": "Purchasing Pipeline", "severity": "medium",
                      "issue": f"{len(unlinked_pos)} POs without matching invoices"})

    # Check receiving completeness
    received_pos = db["pr_receiving_log"].distinct("po_id")
    unreceived = [po for po in pos_orders if po["po_id"] not in received_pos]
    if unreceived:
        gaps.append({"area": "Receiving", "severity": "medium",
                      "issue": f"{len(unreceived)} POs never received"})

    # Check GL balance
    total_rev = sum(e.get("amount", 0) for e in db["gl_entries"].find({"entry_type": "revenue"}, {"_id": 0, "amount": 1}))
    total_exp = sum(e.get("amount", 0) for e in db["gl_entries"].find({"entry_type": "expense"}, {"_id": 0, "amount": 1}))
    if total_rev == 0:
        gaps.append({"area": "Revenue", "severity": "critical", "issue": "No revenue recorded in GL"})

    food_cogs = sum(e.get("amount", 0) for e in db["gl_entries"].find({"gl_code": "5000"}, {"_id": 0, "amount": 1}))
    food_pct = (food_cogs / total_rev * 100) if total_rev > 0 else 0
    if food_pct > 35:
        gaps.append({"area": "Food Cost", "severity": "high",
                      "issue": f"Food cost at {food_pct:.1f}% — above 35% threshold"})
    elif food_pct < 15:
        gaps.append({"area": "Food Cost", "severity": "medium",
                      "issue": f"Food cost at {food_pct:.1f}% — unusually low, check data completeness"})

    labor_total = sum(e.get("amount", 0) for e in db["gl_entries"].find(
        {"gl_code": {"$in": ["6000", "6010", "6020", "6050"]}}, {"_id": 0, "amount": 1}))
    labor_pct = (labor_total / total_rev * 100) if total_rev > 0 else 0
    if labor_pct > 40:
        gaps.append({"area": "Labor", "severity": "high",
                      "issue": f"Labor cost at {labor_pct:.1f}% — above 40% threshold"})

    # Invoice status check
    unpaid = db["invoices"].count_documents({"status": {"$ne": "paid"}})
    if unpaid > 0:
        gaps.append({"area": "Accounts Payable", "severity": "low",
                      "issue": f"{unpaid} invoices unpaid"})

    # Waste check
    total_waste = sum(w.get("cost", 0) for w in db["waste_tracking"].find({}, {"_id": 0, "cost": 1}))
    waste_pct = (total_waste / total_rev * 100) if total_rev > 0 else 0
    if waste_pct > 2:
        gaps.append({"area": "Waste Management", "severity": "medium",
                      "issue": f"Waste at {waste_pct:.1f}% of revenue — above 2% target"})

    if not gaps:
        gaps.append({"area": "System", "severity": "info", "issue": "No significant gaps detected — system healthy"})

    return {
        "data_volumes": {
            "pos_transactions": pos_count,
            "gl_entries": gl_count,
            "invoices": inv_count,
            "purchase_orders": po_count,
            "receiving_logs": rcv_count,
            "events": event_count,
            "labor_schedules": labor_count,
            "waste_entries": waste_count,
        },
        "financial_kpis": {
            "total_revenue": round(total_rev, 2),
            "total_expenses": round(total_exp, 2),
            "ebitda": round(total_rev - total_exp, 2),
            "food_cost_pct": round(food_pct, 1),
            "labor_pct": round(labor_pct, 1),
            "waste_pct": round(waste_pct, 2),
        },
        "gaps": gaps,
        "gap_count": len(gaps),
        "critical_count": len([g for g in gaps if g["severity"] == "critical"]),
    }
