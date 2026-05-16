"""
Banquet Menu Catalog — Historical Menu Storage & BEO Menu Builder API
=====================================================================
Stores uploaded banquet menus (extracted from PDFs) with versioning,
seasonal tracking, and historical lookup. Powers the dual-panel
click-and-add BEO menu builder.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from database import db
import re

router = APIRouter(prefix="/api/banquet-menus", tags=["banquet-menus"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ══════════════════════════════════════
#  MENU CRUD
# ══════════════════════════════════════

@router.get("")
async def list_menus(active_only: bool = True):
    """List all banquet menus with metadata."""
    q = {"active": True} if active_only else {}
    menus = list(db["banquet_menu_catalog"].find(q, {"_id": 0, "sections": 0, "guidelines": 0}).sort("uploaded_at", -1))
    return {"menus": menus, "total": len(menus)}


@router.get("/{menu_id}")
async def get_menu(menu_id: str):
    """Get full menu detail including all sections and items."""
    menu = db["banquet_menu_catalog"].find_one({"menu_id": menu_id}, {"_id": 0})
    if not menu:
        raise HTTPException(404, "Menu not found")
    return menu


@router.get("/{menu_id}/categories")
async def get_categories(menu_id: str):
    """Get hierarchical categories for a menu — sections and subsections."""
    menu = db["banquet_menu_catalog"].find_one({"menu_id": menu_id}, {"_id": 0, "sections": 1})
    if not menu:
        raise HTTPException(404, "Menu not found")
    cats = []
    for sec in menu.get("sections", []):
        subs = []
        for sub in sec.get("subsections", []):
            subs.append({
                "name": sub["name"],
                "price": sub.get("price", ""),
                "price_numeric": sub.get("price_numeric", 0),
                "item_count": _count_items(sub),
            })
        cats.append({"name": sec["name"], "subsections": subs})
    return {"menu_id": menu_id, "categories": cats}


@router.get("/{menu_id}/items")
async def get_items(menu_id: str, section: Optional[str] = None, subsection: Optional[str] = None):
    """Get menu items filtered by section/subsection. Returns flat list for the builder."""
    menu = db["banquet_menu_catalog"].find_one({"menu_id": menu_id}, {"_id": 0, "sections": 1})
    if not menu:
        raise HTTPException(404, "Menu not found")

    results = []
    for sec in menu.get("sections", []):
        if section and sec["name"].upper() != section.upper():
            continue
        for sub in sec.get("subsections", []):
            if subsection and sub["name"].upper() != subsection.upper():
                continue
            base_price = sub.get("price_numeric", 0)
            _flatten_items(sub.get("items", []), sec["name"], sub["name"], base_price, results)

    return {"items": results, "total": len(results)}


@router.post("/upload")
async def upload_menu(body: dict = {}):
    """Upload a new banquet menu (extracted from PDF). Supports versioning and seasonal tracking."""
    menu_id = f"bm-{_uid()}"
    sections = body.get("sections", [])
    processed = _process_sections(sections)

    doc = {
        "menu_id": menu_id,
        "name": body.get("name", "Banquet Menu"),
        "property": body.get("property", "Pier Sixty-Six Resort"),
        "version": body.get("version", _now()[:10]),
        "season": body.get("season", _detect_season()),
        "year": body.get("year", datetime.now(timezone.utc).year),
        "type": body.get("type", "full_banquet"),
        "sections": processed,
        "guidelines": body.get("guidelines", {}),
        "service_charge_pct": body.get("service_charge_pct", 26.0),
        "tax_pct": body.get("tax_pct", 7.0),
        "notes": body.get("notes", []),
        "active": True,
        "uploaded_at": _now(),
        "updated_at": _now(),
    }
    db["banquet_menu_catalog"].insert_one({**doc, "_id": menu_id})
    doc.pop("_id", None)
    return doc


@router.put("/{menu_id}/deactivate")
async def deactivate_menu(menu_id: str):
    """Deactivate a menu (keep for historical lookup)."""
    result = db["banquet_menu_catalog"].update_one(
        {"menu_id": menu_id}, {"$set": {"active": False, "updated_at": _now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Menu not found")
    return {"status": "deactivated", "menu_id": menu_id}


# ══════════════════════════════════════
#  BEO TEMPLATES (Save as Template)
# ══════════════════════════════════════

@router.get("/templates/list")
async def list_beo_templates():
    """List all saved BEO menu templates."""
    templates = list(db["beo_templates"].find({}, {"_id": 0}).sort("name", 1))
    return {"templates": templates, "total": len(templates)}


@router.post("/templates/save")
async def save_beo_template(body: dict = {}):
    """Save current BEO menu selection as a reusable template."""
    template_id = f"tpl-{_uid()}"
    doc = {
        "template_id": template_id,
        "name": body.get("name", "Untitled Template"),
        "description": body.get("description", ""),
        "event_type": body.get("event_type", "corporate"),
        "guest_count": body.get("guest_count", 0),
        "items": body.get("items", []),
        "service_charge_pct": body.get("service_charge_pct", 26.0),
        "tax_pct": body.get("tax_pct", 7.0),
        "created_by": body.get("created_by", ""),
        "use_count": 0,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["beo_templates"].insert_one({**doc, "_id": template_id})
    return doc


@router.get("/templates/{template_id}")
async def get_beo_template(template_id: str):
    """Get a BEO template to load into the builder."""
    tpl = db["beo_templates"].find_one({"template_id": template_id}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Template not found")
    db["beo_templates"].update_one({"template_id": template_id}, {"$inc": {"use_count": 1}})
    return tpl


@router.delete("/templates/{template_id}")
async def delete_beo_template(template_id: str):
    """Delete a BEO template."""
    result = db["beo_templates"].delete_one({"template_id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Template not found")
    return {"status": "deleted", "template_id": template_id}



# ══════════════════════════════════════
#  BEO CREATION FROM MENU BUILDER
# ══════════════════════════════════════

@router.post("/create-beo")
async def create_beo_from_builder(body: dict = {}):
    """Create a BEO document from the menu builder selection. Connects to BEO Orchestration."""
    event_name = body.get("event_name", "New Event")
    event_date = body.get("event_date", "")
    guest_count = body.get("guest_count", 80)
    items = body.get("items", [])
    service_charge_pct = body.get("service_charge_pct", 26.0)
    tax_pct = body.get("tax_pct", 7.0)
    contact = body.get("contact", {})
    venue = body.get("venue", "Banquet Hall")

    # Build menu sections from items
    sections_map = {}
    for item in items:
        key = f"{item.get('section', 'General')} > {item.get('subsection', 'Items')}"
        sections_map.setdefault(key, [])
        sections_map[key].append({
            "name": item.get("name", ""),
            "quantity": item.get("quantity", 1),
            "price": item.get("adjusted_price", item.get("price_numeric", 0)),
            "dietary_info": item.get("dietary_info", ""),
        })

    menu_sections = []
    subtotal = 0
    for key, sec_items in sections_map.items():
        parts = key.split(" > ")
        section_total = sum(i["price"] * i["quantity"] for i in sec_items)
        subtotal += section_total
        menu_sections.append({
            "section": parts[0],
            "subsection": parts[1] if len(parts) > 1 else "",
            "items": sec_items,
            "section_total": round(section_total, 2),
        })

    per_person = subtotal / max(guest_count, 1)
    food_bev_total = subtotal * guest_count
    service_charge = food_bev_total * (service_charge_pct / 100)
    tax = (food_bev_total + service_charge) * (tax_pct / 100)
    grand_total = food_bev_total + service_charge + tax

    beo_id = f"beo-{_uid()}"
    beo_number = f"BEO-{datetime.now(timezone.utc).strftime('%y%m%d')}-{_uid()[:3].upper()}"

    doc = {
        "id": beo_id,
        "beo_number": beo_number,
        "event_name": event_name,
        "event_date": event_date,
        "venue": venue,
        "guaranteed_count": guest_count,
        "contact": contact,
        "menu_sections": menu_sections,
        "financial": {
            "per_person": round(per_person, 2),
            "food_bev_total": round(food_bev_total, 2),
            "service_charge_pct": service_charge_pct,
            "service_charge": round(service_charge, 2),
            "tax_pct": tax_pct,
            "tax": round(tax, 2),
            "total": round(grand_total, 2),
            "credits": 0,
        },
        "status": "draft",
        "items_count": len(items),
        "created_from": "menu_builder",
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["beo_documents"].insert_one({**doc, "_id": beo_id})
    return doc



# ══════════════════════════════════════
#  SEED FROM PDF EXTRACTION
# ══════════════════════════════════════

@router.post("/seed-pier66")
async def seed_pier66_menu():
    """Seed the full Luccca Resort banquet menu from the extracted PDF data."""
    existing = db["banquet_menu_catalog"].find_one({"property": "Luccca Resort", "active": True})
    if existing:
        return {"status": "already_seeded", "menu_id": existing.get("menu_id")}

    menu_id = "bm-pier66-v1"
    doc = {
        "menu_id": menu_id,
        "name": "Luccca Resort Banquet Menu",
        "property": "Luccca Resort",
        "version": "01/10/2025",
        "season": "winter_2025",
        "year": 2025,
        "type": "full_banquet",
        "sections": _get_pier66_menu_data(),
        "guidelines": _get_pier66_guidelines(),
        "service_charge_pct": 26.0,
        "outdoor_service_charge_pct": 28.0,
        "tax_pct": 7.0,
        "dietary_codes": {
            "D": "Contains Dairy", "G": "Contains Gluten", "N": "Contains Nuts",
            "S": "Contains Shellfish", "VE": "Vegan", "VG": "Vegetarian",
        },
        "notes": [
            "Prices subject to change based on market prices",
            "Stations designed for minimum 50 guests",
            "Chef/Attendant fees: $400 per 2 hours, $150 per additional hour",
            "Bartender fees: $400 per 2 hours, max 4 hours",
        ],
        "active": True,
        "uploaded_at": _now(),
        "updated_at": _now(),
    }
    db["banquet_menu_catalog"].insert_one({**doc, "_id": menu_id})
    return {"status": "seeded", "menu_id": menu_id, "sections": len(doc["sections"])}


# ══════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════

def _count_items(sub):
    count = 0
    for item in sub.get("items", []):
        if item.get("items"):
            count += len(item["items"])
        else:
            count += 1
    return count


def _flatten_items(items, section, subsection, base_price, results):
    """Flatten nested menu items into a flat list for the builder UI."""
    for item in items:
        if item.get("items"):
            group_name = item.get("name", "")
            select_rule = item.get("description", "")
            group_price = _parse_price(item.get("price", "")) if item.get("price") else None
            for sub_item in item["items"]:
                item_price = _parse_price(sub_item.get("price", "")) if sub_item.get("price") else group_price
                results.append({
                    "id": f"{section}|{subsection}|{group_name}|{sub_item['name']}",
                    "name": sub_item["name"],
                    "description": sub_item.get("description", ""),
                    "group": group_name,
                    "select_rule": select_rule,
                    "section": section,
                    "subsection": subsection,
                    "dietary_info": sub_item.get("dietary_info", ""),
                    "price": sub_item.get("price", ""),
                    "price_numeric": item_price or 0,
                    "base_package_price": base_price,
                    "note": sub_item.get("note", ""),
                })
        else:
            item_price = _parse_price(item.get("price", "")) if item.get("price") else None
            results.append({
                "id": f"{section}|{subsection}|{item['name']}",
                "name": item["name"],
                "description": item.get("description", ""),
                "group": "",
                "select_rule": "",
                "section": section,
                "subsection": subsection,
                "dietary_info": item.get("dietary_info", ""),
                "price": item.get("price", ""),
                "price_numeric": item_price or 0,
                "base_package_price": base_price,
                "note": item.get("note", ""),
            })


def _parse_price(price_str):
    if not price_str:
        return 0
    nums = re.findall(r'[\d.]+', str(price_str))
    return float(nums[0]) if nums else 0


def _detect_season():
    month = datetime.now(timezone.utc).month
    if month in (12, 1, 2):
        return f"winter_{datetime.now(timezone.utc).year}"
    elif month in (3, 4, 5):
        return f"spring_{datetime.now(timezone.utc).year}"
    elif month in (6, 7, 8):
        return f"summer_{datetime.now(timezone.utc).year}"
    return f"fall_{datetime.now(timezone.utc).year}"


def _process_sections(sections):
    """Process uploaded sections — assign IDs and parse prices."""
    processed = []
    for sec in sections:
        p_sec = {"name": sec.get("name", ""), "subsections": []}
        for sub in sec.get("subsections", []):
            p_sub = {
                "name": sub.get("name", ""),
                "price": sub.get("price", ""),
                "price_numeric": _parse_price(sub.get("price", "")),
                "items": sub.get("items", []),
                "notes": sub.get("notes", []),
            }
            p_sec["subsections"].append(p_sub)
        processed.append(p_sec)
    return processed


# ══════════════════════════════════════
#  BANQUET MENU DATA (from PDF extraction)
# ══════════════════════════════════════

def _get_pier66_menu_data():
    return [
        {
            "name": "BREAKFAST",
            "subsections": [
                {
                    "name": "PLATED BREAKFAST",
                    "price": "$65 Per Guest",
                    "price_numeric": 65,
                    "items": [
                        {"name": "BAKERY", "description": "Assortment of Muffins, Croissants, Danishes", "dietary_info": "D/G/N/VG"},
                        {"name": "COLD SELECTION", "description": "Select One", "items": [
                            {"name": "Seasonal Fruits and Berries", "description": "Greek Yogurt, Honey", "dietary_info": "VG"},
                            {"name": "Greek Yogurt Parfait", "description": "Passion Fruit, Mango, Granola", "dietary_info": "D/N/VG"},
                            {"name": "Acai Berry Bowl", "description": "Berries, Banana, Coconut Flakes, Cocoa Nibs", "dietary_info": "VG"},
                            {"name": "House-Made Granola", "description": "Apples, Dates, Pecans, Cranberries", "dietary_info": "N/VG"},
                        ]},
                        {"name": "ENTREE", "description": "Select One", "items": [
                            {"name": "Egg White Frittata", "description": "Peppers, Heirloom Tomatoes, Mushrooms, Kale Citrus Salad, Turkey Bacon, Breakfast Potatoes"},
                            {"name": "Buttermilk Pancakes", "description": "Chocolate Chips, Berries, Toasted Almonds, Maple Syrup", "dietary_info": "D/G/N/VG"},
                            {"name": "Avocado Toast", "description": "Poached Egg, Sourdough, Mashed Avocado, Vegan Feta, Pomegranate Seeds", "dietary_info": "G/VG"},
                            {"name": "Scrambled Eggs", "description": "Chives, Bacon, Roasted Tomatoes, Hashbrowns", "dietary_info": "D"},
                            {"name": "Classic Poached Eggs Benedict", "description": "English Muffin, Canadian Bacon, Hollandaise, Potato Hash", "dietary_info": "D/G"},
                            {"name": "Smoked Salmon and Asparagus Quiche", "description": "Citrus Goat Cheese", "dietary_info": "D/G"},
                        ]},
                        {"name": "BEVERAGE", "items": [
                            {"name": "Orange Juice", "dietary_info": "VE"},
                            {"name": "Grapefruit Juice", "dietary_info": "VE"},
                            {"name": "Selection of Coffee and Tea"},
                        ]},
                    ],
                },
                {
                    "name": "CONTINENTAL BREAKFAST BUFFET",
                    "price": "$55 Per Guest",
                    "price_numeric": 55,
                    "items": [
                        {"name": "BAKERY", "description": "Muffins, Croissants, Danishes, Fruit Preserves, Whipped Butter", "dietary_info": "D/G/N/VG"},
                        {"name": "COLD SELECTION", "items": [
                            {"name": "Sliced Seasonal Fruits", "dietary_info": "VE"},
                            {"name": "House-Made Granola", "dietary_info": "N/VG"},
                            {"name": "Individual Organic Flavored Yogurts", "dietary_info": "D/VG"},
                            {"name": "Assorted Bagels", "description": "Whipped Cream Cheese", "dietary_info": "G"},
                        ]},
                        {"name": "ENHANCEMENT", "description": "Select One", "items": [
                            {"name": "Hard Boiled Eggs"},
                            {"name": "Chocolate Chia Pudding", "description": "Blueberry Compote", "dietary_info": "D"},
                        ]},
                        {"name": "BEVERAGE", "items": [
                            {"name": "Orange Juice", "dietary_info": "VE"},
                            {"name": "Grapefruit Juice", "dietary_info": "VE"},
                            {"name": "Selection of Coffee and Tea"},
                        ]},
                    ],
                },
                {
                    "name": "WELLNESS BUFFET",
                    "price": "$70 Per Guest",
                    "price_numeric": 70,
                    "items": [
                        {"name": "BAKERY", "description": "Almond Buttered Multigrain Toast, Sea Salt Honey, Banana-Flaxseed Cake, Bran Muffins", "dietary_info": "G/N/VG"},
                        {"name": "COLD SELECTION", "items": [
                            {"name": "Sliced Seasonal Fruits and Berries", "dietary_info": "VE"},
                            {"name": "House-Made Granola", "dietary_info": "N/VG"},
                            {"name": "Individual Organic Flavored Yogurts", "dietary_info": "D/VG"},
                        ]},
                        {"name": "HOT SELECTION", "description": "Select Two", "items": [
                            {"name": "Steel-Cut Irish Oatmeal", "description": "Dried Apricots, Cranberries, Honey", "dietary_info": "VE"},
                            {"name": "Cage Free Scrambled Eggs", "description": "Baby Kale, Mushrooms, Tomatoes, Feta", "dietary_info": "D/VG"},
                            {"name": "Veggie Sausage Patties", "dietary_info": "VE"},
                            {"name": "Oven Roasted Rosemary-Garlic Fingerling Potatoes", "dietary_info": "VE"},
                        ]},
                        {"name": "BEVERAGE", "description": "Select Two", "items": [
                            {"name": "Cold Pressed Detox Green Juice", "dietary_info": "VE"},
                            {"name": "Cold Pressed Carrot-Ginger Juice", "dietary_info": "VE"},
                            {"name": "Orange Juice", "dietary_info": "VE"},
                            {"name": "Grapefruit Juice", "dietary_info": "VE"},
                            {"name": "Selection of Coffee and Tea"},
                        ]},
                    ],
                },
                {
                    "name": "PIER SIXTY-SIX BREAKFAST BUFFET",
                    "price": "$80 Per Guest",
                    "price_numeric": 80,
                    "items": [
                        {"name": "BAKERY", "description": "Muffins, Croissants, Danishes, Fruit Preserves, Whipped Butter", "dietary_info": "D/G/N/VG"},
                        {"name": "COLD SELECTION", "items": [
                            {"name": "Sliced Seasonal Fruits and Berries", "dietary_info": "VE"},
                            {"name": "Individual Organic Flavored Yogurts", "dietary_info": "D/VG"},
                            {"name": "Assorted Bagels", "description": "Whipped Cream Cheese", "dietary_info": "G/VG"},
                        ]},
                        {"name": "ENHANCEMENT", "description": "Select One", "items": [
                            {"name": "Greek Yogurt Parfait", "description": "Passion Fruit, Mango, Granola", "dietary_info": "D/VG"},
                            {"name": "Traditional Pancakes", "description": "Maple Syrup", "dietary_info": "D/G/VE"},
                            {"name": "Steel-Cut Irish Oatmeal", "description": "Raisins, Coconut", "dietary_info": "G/VE"},
                            {"name": "French Toast", "description": "Apricot Compote", "dietary_info": "D/G/VE"},
                        ]},
                        {"name": "EGG SELECTION", "description": "Select One", "items": [
                            {"name": "Traditional Scrambled Eggs", "dietary_info": "D/VG"},
                            {"name": "Scrambled Egg Whites", "description": "Tomatoes, Spinach, Goat Cheese, Kale", "dietary_info": "D/VG"},
                            {"name": "Classic Poached Eggs Benedict", "description": "English Muffin, Canadian Bacon, Hollandaise", "dietary_info": "G/D"},
                            {"name": "Huevos Rancheros Skillet", "description": "Refried Beans, Corn Tortilla, Salsa Roja, Queso Fresco", "dietary_info": "D/VG"},
                            {"name": "Breakfast Burrito", "description": "Scrambled Eggs, Chorizo, Chihuahua Cheese, Peppers, Salsa Roja", "dietary_info": "D/G"},
                        ]},
                        {"name": "POTATOES", "description": "Select One", "items": [
                            {"name": "Traditional Hash Brown", "dietary_info": "D/VG"},
                            {"name": "Herbed Red Bliss Potato Wedges", "dietary_info": "VE"},
                            {"name": "Potato Hash", "description": "Queso Fresco, Peppers, Onions", "dietary_info": "D/VG"},
                            {"name": "Yukon Gold Potatoes", "description": "Caramelized Onions", "dietary_info": "VE"},
                        ]},
                        {"name": "BREAKFAST MEAT", "items": [
                            {"name": "Applewood Smoked Bacon"},
                            {"name": "Chicken Apple Sausage"},
                            {"name": "Sausage Patties"},
                            {"name": "Veggie Sausage Patties", "dietary_info": "VE"},
                        ]},
                        {"name": "BEVERAGE", "items": [
                            {"name": "Orange Juice", "dietary_info": "VE"},
                            {"name": "Grapefruit Juice", "dietary_info": "VE"},
                            {"name": "Selection of Coffee and Tea"},
                        ]},
                    ],
                    "notes": ["Any Additional Breakfast Meat: $8 Each"],
                },
                {
                    "name": "GRAB AND GO",
                    "price": "$65 Per Guest",
                    "price_numeric": 65,
                    "items": [
                        {"name": "COLD", "description": "Select One", "items": [
                            {"name": "Sliced Fresh Fruits and Berries", "dietary_info": "VE"},
                            {"name": "Seasonal Whole Fruit", "dietary_info": "VE"},
                            {"name": "Individual Organic Flavored Yogurts", "dietary_info": "D/VG"},
                            {"name": "Seasonal Muffins", "dietary_info": "D/G/N"},
                        ]},
                        {"name": "SANDWICH", "description": "Select One", "items": [
                            {"name": "Everything Bagel", "description": "Smoked Salmon, Red Onions, Spinach, Capers, Tomatoes, Cream Cheese", "dietary_info": "D/G/VG"},
                        ]},
                        {"name": "HOT", "items": [
                            {"name": "Scrambled Eggs Croissant", "description": "Applewood Smoked Bacon, Cheddar", "dietary_info": "D/G"},
                            {"name": "Scrambled Eggs Biscuit", "description": "Canadian Bacon, Caramelized Onions, Pepper Jack", "dietary_info": "D/G"},
                            {"name": "Breakfast Burrito", "description": "Scrambled Eggs, Chorizo, Chihuahua Cheese, Peppers, Salsa Roja", "dietary_info": "D/G"},
                            {"name": "Spinach and Feta Frittata", "description": "Mortadella, Provolone, English Muffin", "dietary_info": "D/G/VG"},
                        ]},
                        {"name": "BEVERAGE", "description": "Select One", "items": [
                            {"name": "Orange Juice", "dietary_info": "VE"},
                            {"name": "Grapefruit Juice", "dietary_info": "VE"},
                            {"name": "Bottled Water"},
                            {"name": "Selection of Coffee and Tea"},
                        ]},
                    ],
                    "notes": ["Eco-Friendly Disposable Cutlery and Box Included. Enhance with Insulated Bag for $10 per Guest."],
                },
                {
                    "name": "ACTION STATIONS",
                    "price": "Varies",
                    "price_numeric": 0,
                    "items": [
                        {"name": "WAFFLES AND PANCAKES", "description": "Select One, Chef to Prepare", "price": "$28 Per Guest", "items": [
                            {"name": "Classic Belgian Waffles", "dietary_info": "D/G/VG"},
                            {"name": "Traditional Buttermilk Pancakes", "dietary_info": "D/G/VG"},
                            {"name": "Brioche French Toast", "dietary_info": "D/G/VG"},
                        ]},
                        {"name": "EGGS AND OMELET", "description": "Chef to Prepare", "price": "$30 Per Guest", "items": [
                            {"name": "Cage Free Whole Eggs, Liquid Eggs, Egg Whites, Vegan Egg Substitute"},
                            {"name": "Ham, Bacon, Pork Sausage, Tofu", "dietary_info": "VG"},
                            {"name": "Cheddar, Mozzarella, Pepper Jack, Goat Cheese", "dietary_info": "D/VG"},
                            {"name": "Baby Kale, Spinach, Red Onions, Bell Peppers, Mushrooms, Jalapenos", "dietary_info": "VE"},
                        ]},
                        {"name": "TOAST AND EGGS", "description": "Select One, Chef to Prepare", "price": "$24 Per Guest", "items": [
                            {"name": "Traditional", "description": "Multigrain, Avocado Mash, Cucumber, Poached Egg, Goat Cheese", "dietary_info": "D/G/VG"},
                            {"name": "Florentine Benedict", "description": "Crumpet, Canadian Bacon, Spinach, Tomatoes, Poached Egg, Hollandaise", "dietary_info": "D/G"},
                            {"name": "Southern", "description": "Biscuit, Pimento Cheese, Pastrami, Poached Egg, Sausage Gravy", "dietary_info": "D/G"},
                            {"name": "Healthy", "description": "Whole Wheat, Red Beet Hummus, Grilled Zucchini, Poached Egg, Vegan Feta", "dietary_info": "G/VG"},
                        ]},
                    ],
                    "notes": ["Stations for minimum 50 guests. Chef fees: $400 per 2 hours, $150/hr additional."],
                },
                {
                    "name": "DISPLAYED ENHANCEMENTS",
                    "price": "Varies",
                    "price_numeric": 0,
                    "items": [
                        {"name": "SPECIALTY EGGS", "description": "Select One", "price": "$28 Per Guest", "items": [
                            {"name": "Spanish Tortilla", "description": "Eggs, Potatoes, Onions, Tomato Sauce", "dietary_info": "VG"},
                            {"name": "Florentine Benedict", "description": "Poached Egg, Canadian Bacon, Spinach, Choron Sauce", "dietary_info": "D/G"},
                            {"name": "Truffle Benedict", "description": "Poached Egg, Wilted Kale, Pastrami, Crumpet, Hollandaise, Truffle Dust", "dietary_info": "D/G"},
                        ]},
                        {"name": "MARKET JUICES", "description": "Select Three", "price": "$22 Per Guest", "items": [
                            {"name": "Orange", "dietary_info": "VE"},
                            {"name": "Grapefruit", "dietary_info": "VE"},
                            {"name": "Cold Pressed Carrot-Ginger", "dietary_info": "VE"},
                            {"name": "Cold Pressed Detox Green Juice", "dietary_info": "VE"},
                            {"name": "Red Beet, Orange, Pineapple", "dietary_info": "VE"},
                        ]},
                        {"name": "YOGURT BAR", "price": "$24 Per Guest", "items": [
                            {"name": "Greek and Low-Fat Yogurt", "dietary_info": "D/VG"},
                            {"name": "House-Made Granola", "description": "Chia Seeds, Raisins, Dried Cranberries, Pumpkin Seeds", "dietary_info": "VG"},
                            {"name": "Toasted Almonds", "description": "Dried Pomegranate Seeds, Fresh Seasonal Berries, Coconut Flakes", "dietary_info": "N/VG"},
                            {"name": "Local Multi Flower Honey", "dietary_info": "VG"},
                        ]},
                    ],
                    "notes": ["Stations for minimum 50 guests."],
                },
                {
                    "name": "A LA CARTE ENHANCEMENTS",
                    "price": "Varies",
                    "price_numeric": 0,
                    "items": [
                        {"name": "PASTRIES AND CEREALS", "description": "Select One", "items": [
                            {"name": "Individual Cereals", "description": "2%, Oat Milk, Whole Milk", "price": "$7 each", "dietary_info": "D/G/VG"},
                            {"name": "House-Made Granola Berry Parfait", "price": "$170 Per Dozen", "dietary_info": "D/N/VG"},
                            {"name": "Warm Cinnamon Rolls", "price": "$102 Per Dozen", "dietary_info": "D/G/N/VG"},
                            {"name": "Assortment of Danishes", "price": "$102 Per Dozen", "dietary_info": "D/G/N/VG"},
                            {"name": "Assorted Breakfast Pastries", "price": "$102 Per Dozen", "dietary_info": "D/G/N/VG"},
                            {"name": "Assorted Bagels, Cream Cheese", "price": "$102 Per Dozen", "dietary_info": "D/G/VG"},
                        ]},
                        {"name": "HOT", "items": [
                            {"name": "Scrambled Eggs, Bacon, Cheddar Croissant", "price": "$156 Per Dozen", "dietary_info": "D/G"},
                            {"name": "Spinach Feta Frittata, Mortadella, Provolone, English Muffin", "price": "$125 Per Dozen", "dietary_info": "D/G/N"},
                            {"name": "Over Medium Egg, Canadian Bacon, Caramelized Onions, Pepper Jack, Buttermilk Biscuit", "price": "$156 Per Dozen", "dietary_info": "D/G"},
                            {"name": "Breakfast Burrito", "description": "Scrambled Eggs, Black Beans, Mixed Peppers, Chihuahua Cheese, Salsa Roja", "price": "$156 Per Dozen", "dietary_info": "D/G/VG"},
                        ]},
                        {"name": "SANDWICH (COLD)", "items": [
                            {"name": "Everything Bagel", "description": "Smoked Salmon, Red Onions, Spinach, Capers, Tomatoes, Cream Cheese", "price": "$169 Per Dozen", "dietary_info": "D/G"},
                        ]},
                    ],
                },
                {
                    "name": "BRUNCH",
                    "price": "$160 Per Guest",
                    "price_numeric": 160,
                    "items": [
                        {"name": "BAKERY", "description": "Muffins, Croissants, Danishes, Fruit Preserves, Whipped Butter", "dietary_info": "D/G/N/VG"},
                        {"name": "COLD SELECTION", "items": [
                            {"name": "Sliced Seasonal Fruits and Berries", "dietary_info": "VE"},
                            {"name": "Yogurt Parfait", "description": "Passion Fruit, Mango", "dietary_info": "D/N/VG"},
                            {"name": "Smoked Salmon", "description": "Herb Cream Cheese, Accoutrements", "dietary_info": "D/VG"},
                            {"name": "Domestic and International Cheese Selection"},
                            {"name": "Artisan Breads and Bagels", "dietary_info": "G/VG"},
                        ]},
                        {"name": "EGGS AND OMELETS", "description": "Chef to Prepare", "items": [
                            {"name": "Ham, Bacon, Pork Sausage, Tofu"},
                            {"name": "Cage Free Whole Eggs, Liquid Eggs, Egg Whites", "dietary_info": "VG"},
                            {"name": "Cheddar, Mozzarella, Pepper Jack, Goat Cheese", "dietary_info": "D"},
                            {"name": "Baby Kale, Spinach, Red Onions, Bell Peppers, Mushrooms, Tomatoes", "dietary_info": "VE"},
                        ]},
                        {"name": "HOT SELECTION", "description": "Select Two", "items": [
                            {"name": "Huevos Rancheros Skillet", "description": "Refried Beans, Corn Tortilla, Salsa Roja, Queso Fresco", "dietary_info": "D/VG"},
                            {"name": "Classic Eggs Benedict", "description": "Canadian Bacon, English Muffin, Hollandaise", "dietary_info": "G"},
                            {"name": "Grilled Asparagus", "description": "Lemon-Parmesan Butter", "dietary_info": "D/VG"},
                            {"name": "Roasted Heirloom Potatoes", "description": "Rosemary, Garlic", "dietary_info": "VE"},
                            {"name": "Scrambled Eggs", "dietary_info": "D"},
                            {"name": "Applewood Smoked Bacon"},
                            {"name": "Chicken Apple Sausage"},
                        ]},
                        {"name": "CARVING STATION", "description": "Select One, Attendant to Carve", "items": [
                            {"name": "New York Strip Loin", "description": "Red Wine Jus, Creamed Horseradish, Dinner Rolls", "dietary_info": "G/D"},
                            {"name": "Orange Glazed Bone-in Ham"},
                            {"name": "Herb Marinated Beef Tenderloin", "description": "Au Jus, Dinner Rolls", "dietary_info": "G"},
                        ]},
                        {"name": "DESSERT", "items": [
                            {"name": "Key Lime Pie", "dietary_info": "D/G/VG"},
                            {"name": "Vanilla Creme Brulee", "dietary_info": "D/VG"},
                            {"name": "Chocolate-Caramel Mousse", "dietary_info": "D"},
                        ]},
                        {"name": "BEVERAGE", "items": [
                            {"name": "Orange Juice", "dietary_info": "VE"},
                            {"name": "Grapefruit Juice", "dietary_info": "VE"},
                            {"name": "Selection of Coffee and Tea"},
                        ]},
                    ],
                    "notes": ["Enhance with Mimosa Bar and Bloody Mary Bar. Stations for minimum 50 guests."],
                },
            ],
        },
        {
            "name": "BREAKS",
            "subsections": [
                {
                    "name": "ENERGY-UP",
                    "price": "$42 Per Guest",
                    "price_numeric": 42,
                    "items": [
                        {"name": "Make Your Own Trail Mix", "description": "Dried Apricots, Chocolate Chunks, Cranberries, Banana Chips, Almonds, Walnuts, Pumpkin Seeds, Coconut Flakes", "dietary_info": "N/VG"},
                        {"name": "Warm Soft Pretzels", "description": "Beer Cheese, Whole Grain Mustard", "dietary_info": "D/G"},
                        {"name": "Rice Crispy Treats", "dietary_info": "D/G/VG"},
                        {"name": "Seasonal Whole Fruit", "dietary_info": "VE"},
                        {"name": "Infused Water Station"},
                        {"name": "Selection of Coffee and Tea"},
                    ],
                },
                {
                    "name": "WELLNESS",
                    "price": "$44 Per Guest",
                    "price_numeric": 44,
                    "items": [
                        {"name": "Hummus Trio", "description": "Classic, Roasted Red Pepper, Avocado with Pita Chips", "dietary_info": "G/VG"},
                        {"name": "Seasonal Crudites", "description": "Ranch Dip", "dietary_info": "D/VG"},
                        {"name": "Energy Bites", "description": "Peanut Butter, Oats, Dark Chocolate, Coconut", "dietary_info": "N/VG"},
                        {"name": "Seasonal Whole Fruit", "dietary_info": "VE"},
                        {"name": "Infused Water Station"},
                        {"name": "Selection of Coffee and Tea"},
                    ],
                },
                {
                    "name": "SWEET INDULGENCE",
                    "price": "$46 Per Guest",
                    "price_numeric": 46,
                    "items": [
                        {"name": "Assorted Macarons", "dietary_info": "D/G/N"},
                        {"name": "Mini Cheesecake Bites", "dietary_info": "D/G/VG"},
                        {"name": "Chocolate Dipped Strawberries", "dietary_info": "D/VG"},
                        {"name": "Seasonal Whole Fruit", "dietary_info": "VE"},
                        {"name": "Infused Water Station"},
                        {"name": "Selection of Coffee and Tea"},
                    ],
                },
            ],
        },
        {
            "name": "LUNCH",
            "subsections": [
                {
                    "name": "PLATED LUNCH",
                    "price": "$85 Per Guest",
                    "price_numeric": 85,
                    "items": [
                        {"name": "SALAD", "description": "Select One", "items": [
                            {"name": "Caesar Salad", "description": "Romaine, Parmesan, Croutons, Caesar Dressing", "dietary_info": "D/G"},
                            {"name": "Garden Salad", "description": "Mixed Greens, Tomatoes, Cucumber, Balsamic Vinaigrette", "dietary_info": "VE"},
                            {"name": "Kale Salad", "description": "Dried Cranberries, Feta, Walnuts, Lemon Vinaigrette", "dietary_info": "D/N/VG"},
                        ]},
                        {"name": "ENTREE", "description": "Select One", "items": [
                            {"name": "Grilled Chicken Breast", "description": "Roasted Vegetables, Herb Jus"},
                            {"name": "Pan-Seared Salmon", "description": "Asparagus, Lemon Beurre Blanc", "dietary_info": "D"},
                            {"name": "Braised Short Rib", "description": "Mashed Potatoes, Red Wine Jus", "dietary_info": "D"},
                            {"name": "Grilled Vegetable Stack", "description": "Portobello, Zucchini, Peppers, Balsamic Glaze", "dietary_info": "VE"},
                        ]},
                        {"name": "DESSERT", "description": "Select One", "items": [
                            {"name": "Chocolate Lava Cake", "description": "Vanilla Ice Cream", "dietary_info": "D/G"},
                            {"name": "Key Lime Tart", "description": "Whipped Cream", "dietary_info": "D/G/VG"},
                            {"name": "Seasonal Fruit Sorbet", "dietary_info": "VE"},
                        ]},
                        {"name": "BEVERAGE", "items": [
                            {"name": "Iced Tea"},
                            {"name": "Lemonade"},
                            {"name": "Selection of Coffee and Tea"},
                        ]},
                    ],
                },
                {
                    "name": "LUNCH BUFFET",
                    "price": "$95 Per Guest",
                    "price_numeric": 95,
                    "items": [
                        {"name": "SALAD BAR", "items": [
                            {"name": "Caesar Salad", "description": "Romaine, Parmesan, Croutons", "dietary_info": "D/G"},
                            {"name": "Mixed Greens", "description": "Assorted Dressings", "dietary_info": "VE"},
                            {"name": "Grilled Vegetable Antipasto", "dietary_info": "VE"},
                        ]},
                        {"name": "ENTREE", "description": "Select Two", "items": [
                            {"name": "Herb Roasted Chicken", "description": "Lemon Pan Jus"},
                            {"name": "Grilled Mahi-Mahi", "description": "Mango Salsa"},
                            {"name": "Braised Beef Short Rib", "description": "Red Wine Reduction", "dietary_info": "D"},
                            {"name": "Pasta Primavera", "description": "Seasonal Vegetables, Garlic Olive Oil", "dietary_info": "G/VE"},
                        ]},
                        {"name": "SIDES", "description": "Select Two", "items": [
                            {"name": "Roasted Fingerling Potatoes", "dietary_info": "VE"},
                            {"name": "Grilled Asparagus", "dietary_info": "VE"},
                            {"name": "Jasmine Rice", "dietary_info": "VE"},
                            {"name": "Sauteed Broccolini", "dietary_info": "VE"},
                        ]},
                        {"name": "DESSERT", "items": [
                            {"name": "Assorted Mini Pastries", "dietary_info": "D/G"},
                            {"name": "Seasonal Fresh Fruit", "dietary_info": "VE"},
                        ]},
                    ],
                },
            ],
        },
        {
            "name": "DINNER",
            "subsections": [
                {
                    "name": "PLATED DINNER",
                    "price": "$135 Per Guest",
                    "price_numeric": 135,
                    "items": [
                        {"name": "FIRST COURSE", "description": "Select One", "items": [
                            {"name": "Lobster Bisque", "description": "Tarragon Cream, Chive Oil", "dietary_info": "D/S"},
                            {"name": "Burrata Caprese", "description": "Heirloom Tomatoes, Basil, Aged Balsamic", "dietary_info": "D/VG"},
                            {"name": "Tuna Tartare", "description": "Avocado, Sesame, Wonton Crisp", "dietary_info": "G"},
                        ]},
                        {"name": "SALAD", "description": "Select One", "items": [
                            {"name": "Caesar Salad", "description": "White Anchovy, Parmesan, Croutons", "dietary_info": "D/G"},
                            {"name": "Wedge Salad", "description": "Blue Cheese, Bacon, Tomatoes", "dietary_info": "D"},
                            {"name": "Arugula Salad", "description": "Shaved Parmesan, Pine Nuts, Lemon Vinaigrette", "dietary_info": "D/N/VG"},
                        ]},
                        {"name": "ENTREE", "description": "Select One", "items": [
                            {"name": "Filet Mignon 8oz", "description": "Truffle Mashed Potatoes, Asparagus, Red Wine Demi-Glace", "dietary_info": "D"},
                            {"name": "Pan-Seared Chilean Sea Bass", "description": "Saffron Risotto, Beurre Blanc", "dietary_info": "D"},
                            {"name": "Herb-Crusted Rack of Lamb", "description": "Ratatouille, Rosemary Jus", "dietary_info": "D"},
                            {"name": "Grilled Lobster Tail", "description": "Drawn Butter, Roasted Potatoes", "dietary_info": "D/S"},
                            {"name": "Wild Mushroom Risotto", "description": "Truffle Oil, Parmesan", "dietary_info": "D/VG"},
                        ]},
                        {"name": "DESSERT", "description": "Select One", "items": [
                            {"name": "Chocolate Souffle", "description": "Creme Anglaise", "dietary_info": "D/G"},
                            {"name": "Creme Brulee Trio", "description": "Vanilla, Espresso, Passion Fruit", "dietary_info": "D"},
                            {"name": "Tiramisu", "description": "Mascarpone, Ladyfingers, Espresso", "dietary_info": "D/G"},
                        ]},
                    ],
                },
                {
                    "name": "DINNER BUFFET",
                    "price": "$150 Per Guest",
                    "price_numeric": 150,
                    "items": [
                        {"name": "SALAD", "items": [
                            {"name": "Caesar Salad", "description": "Romaine, Parmesan, Croutons", "dietary_info": "D/G"},
                            {"name": "Mixed Greens", "description": "Assorted Dressings", "dietary_info": "VE"},
                        ]},
                        {"name": "ENTREE", "description": "Select Three", "items": [
                            {"name": "Herb Roasted Chicken", "description": "Lemon Thyme Jus"},
                            {"name": "Pan-Seared Salmon", "description": "Dill Cream Sauce", "dietary_info": "D"},
                            {"name": "Braised Short Rib", "description": "Cabernet Reduction"},
                            {"name": "Grilled NY Strip", "description": "Chimichurri"},
                            {"name": "Pasta Bolognese", "description": "San Marzano Ragu", "dietary_info": "D/G"},
                        ]},
                        {"name": "SIDES", "description": "Select Two", "items": [
                            {"name": "Truffle Mashed Potatoes", "dietary_info": "D"},
                            {"name": "Grilled Asparagus", "dietary_info": "VE"},
                            {"name": "Roasted Root Vegetables", "dietary_info": "VE"},
                            {"name": "Creamed Spinach", "dietary_info": "D"},
                        ]},
                        {"name": "CARVING STATION", "description": "Select One", "items": [
                            {"name": "Prime Rib", "description": "Au Jus, Creamed Horseradish"},
                            {"name": "Herb-Crusted Beef Tenderloin", "description": "Bearnaise"},
                        ]},
                        {"name": "DESSERT", "items": [
                            {"name": "Assorted Mini Desserts", "dietary_info": "D/G"},
                            {"name": "Seasonal Fruit Display", "dietary_info": "VE"},
                        ]},
                    ],
                },
            ],
        },
        {
            "name": "RECEPTION",
            "subsections": [
                {
                    "name": "COLD PASSED HORS D'OEUVRES",
                    "price": "$8 Per Piece",
                    "price_numeric": 8,
                    "items": [
                        {"name": "Tuna Tartare", "description": "Sesame, Avocado, Wonton Crisp"},
                        {"name": "Shrimp Ceviche", "description": "Coconut, Lime, Cilantro", "dietary_info": "S"},
                        {"name": "Burrata Crostini", "description": "Heirloom Tomato, Basil Oil", "dietary_info": "D/G"},
                        {"name": "Smoked Salmon Blini", "description": "Creme Fraiche, Dill", "dietary_info": "D/G"},
                        {"name": "Caprese Skewer", "description": "Fresh Mozzarella, Tomato, Basil", "dietary_info": "D/VG"},
                    ],
                },
                {
                    "name": "HOT PASSED HORS D'OEUVRES",
                    "price": "$10 Per Piece",
                    "price_numeric": 10,
                    "items": [
                        {"name": "Coconut Shrimp", "description": "Sweet Chili Dipping Sauce", "dietary_info": "S/G"},
                        {"name": "Beef Slider", "description": "Cheddar, Pickles, Special Sauce", "dietary_info": "D/G"},
                        {"name": "Chicken Satay", "description": "Peanut Sauce", "dietary_info": "N"},
                        {"name": "Lamb Lollipop", "description": "Mint Chimichurri"},
                        {"name": "Truffle Mac & Cheese Bites", "description": "Panko Crust", "dietary_info": "D/G"},
                        {"name": "Mushroom Arancini", "description": "Truffle Aioli", "dietary_info": "D/G/VG"},
                    ],
                },
                {
                    "name": "RECEPTION STATIONS",
                    "price": "Varies",
                    "price_numeric": 0,
                    "items": [
                        {"name": "RAW BAR", "price": "$38 Per Guest", "items": [
                            {"name": "Oysters on the Half Shell", "dietary_info": "S"},
                            {"name": "Shrimp Cocktail", "dietary_info": "S"},
                            {"name": "Ceviche", "dietary_info": "S"},
                            {"name": "Mignonette, Cocktail Sauce, Lemon"},
                        ]},
                        {"name": "CHARCUTERIE & CHEESE", "price": "$32 Per Guest", "items": [
                            {"name": "Artisan Cheese Selection", "dietary_info": "D/VG"},
                            {"name": "Cured Meats", "description": "Prosciutto, Sopressata, Salami"},
                            {"name": "House Pickles, Olives, Honey, Crackers"},
                        ]},
                        {"name": "SUSHI STATION", "price": "$42 Per Guest", "items": [
                            {"name": "Assorted Nigiri and Maki Rolls"},
                            {"name": "Sashimi Selection"},
                            {"name": "Soy, Wasabi, Pickled Ginger"},
                        ]},
                    ],
                },
            ],
        },
        {
            "name": "BEVERAGE",
            "subsections": [
                {
                    "name": "HOSTED BAR PACKAGES",
                    "price": "From $75/hr Per Guest",
                    "price_numeric": 75,
                    "items": [
                        {"name": "PIER 1 PACKAGE", "description": "Well Spirits, House Wine, Domestic Beer", "price": "$75 Per Guest (1st hr), $40 (2nd hr), $30 (3rd hr)", "items": [
                            {"name": "Well Vodka, Gin, Rum, Tequila, Bourbon, Scotch"},
                            {"name": "House Wine Selection"},
                            {"name": "Domestic Beer"},
                            {"name": "Soft Drinks, Juices, Water"},
                        ]},
                        {"name": "PIER 2 PACKAGE", "description": "Premium Spirits, Sommelier Wine", "price": "$85 Per Guest (1st hr), $50 (2nd hr), $40 (3rd hr)", "items": [
                            {"name": "Tito's, Bombay, Bacardi, Espolon, Wild Turkey, Dewars"},
                            {"name": "Sommelier Wine Selection"},
                            {"name": "Domestic & Import Beer"},
                            {"name": "Soft Drinks, Juices, Water"},
                        ]},
                        {"name": "PIER 3 PACKAGE", "description": "Ultra-Premium Spirits, Reserve Wine", "price": "$95 Per Guest (1st hr), $60 (2nd hr), $50 (3rd hr)", "items": [
                            {"name": "Grey Goose, Hendrick's, Don Julio, Maker's Mark, Macallan 12"},
                            {"name": "Reserve Wine Selection"},
                            {"name": "Craft & Import Beer"},
                            {"name": "Soft Drinks, Juices, Water"},
                        ]},
                    ],
                },
                {
                    "name": "WINE BY THE BOTTLE",
                    "price": "From $65/bottle",
                    "price_numeric": 65,
                    "items": [
                        {"name": "TAVISTOCK RESERVE", "items": [
                            {"name": "Prosecco, Veneto, Italy", "price": "$65"},
                            {"name": "Pinot Grigio, Friuli, Italy", "price": "$65"},
                            {"name": "Sauvignon Blanc, Monterey, CA", "price": "$65"},
                            {"name": "Chardonnay, Monterey, CA", "price": "$65"},
                            {"name": "Rose, Cotes de Provence, France", "price": "$65"},
                            {"name": "Pinot Noir, Monterey, CA", "price": "$65"},
                            {"name": "Cabernet Sauvignon, Monterey, CA", "price": "$65"},
                        ]},
                        {"name": "SOMMELIER SELECTION", "items": [
                            {"name": "Prosecco di Valdobbiadene, Gambino Gold", "price": "$80"},
                            {"name": "Sauvignon Blanc, Pascal Jolivet, Loire", "price": "$80"},
                            {"name": "Chardonnay, Hartford Court, Russian River", "price": "$80"},
                            {"name": "Pinot Noir, Benton Lane, Willamette Valley", "price": "$80"},
                            {"name": "Cabernet Sauvignon, Napa Cellars, Napa Valley", "price": "$80"},
                        ]},
                    ],
                },
                {
                    "name": "MIXOLOGY",
                    "price": "From $24 Per Drink",
                    "price_numeric": 24,
                    "items": [
                        {"name": "CLASSIC COCKTAILS", "price": "$24 Per Drink", "items": [
                            {"name": "Paloma", "description": "Espolon Tequila, Lime, Grapefruit Soda"},
                            {"name": "Margarita", "description": "Cazcabel Tequila, Lime, Orange Liqueur, Agave"},
                            {"name": "Daiquiri", "description": "Flor De Cana Rum, Lime, Simple Syrup"},
                            {"name": "Martini", "description": "Tito's Vodka, Dry Vermouth, Olives"},
                            {"name": "Old Fashioned", "description": "Wild Turkey Bourbon, Demerara, Angostura"},
                            {"name": "Manhattan", "description": "Sazerac Rye, Sweet Vermouth, Angostura"},
                            {"name": "Espresso Martini", "description": "Wheatley Vodka, Coffee Liqueur, Espresso"},
                            {"name": "Aperol Spritz", "description": "Aperol, Prosecco, Club Soda"},
                            {"name": "French 75", "description": "Bombay Gin, Sparkling Wine, Lemon"},
                        ]},
                        {"name": "SPECIALTY COCKTAILS", "price": "$26 Per Drink", "items": [
                            {"name": "Belvet Martini", "description": "Belvedere, Creme De Cassis, Pineapple Juice"},
                            {"name": "Lychee Martini", "description": "Ketel One Vodka, Lychee Liqueur, Orange Liqueur"},
                            {"name": "Gin Tree", "description": "Botanist Gin, Lemon, Lime, Yuzu Sparkling Soda"},
                            {"name": "In The Mint Time", "description": "Maker's Mark, Sazerac Rye, Demerara, Mint, Club Soda"},
                            {"name": "Oaxacan Water", "description": "Vida Mezcal, Casamigos Blanco, Ancho Reyes, Pineapple, Lime"},
                            {"name": "Flavored Margaritas", "description": "Lime, Mango, Strawberry, Jalapeno, Coconut"},
                        ]},
                    ],
                    "notes": ["Minimum order of 25. Custom mocktails available."],
                },
                {
                    "name": "BEVERAGE STATIONS",
                    "price": "Varies",
                    "price_numeric": 0,
                    "items": [
                        {"name": "MIMOSA STATION", "price": "$30 Per Guest Per Hour", "description": "Minimum 25 guests", "items": [
                            {"name": "House Sparkling Wine"},
                            {"name": "Seasonal Fruit Purees & Juices"},
                            {"name": "Seasonal Berry Garnishes"},
                        ]},
                        {"name": "BLOODY MARY STATION", "price": "$35 Per Guest Per Hour", "description": "Minimum 25 guests", "items": [
                            {"name": "House Vodka"},
                            {"name": "Tomato Mix, Pickled Vegetables, Celery"},
                            {"name": "Lemon and Lime Wedges"},
                        ]},
                        {"name": "ZERO PROOF STATION", "price": "$16 Per Drink", "items": [
                            {"name": "Garden Brut", "description": "Seedlip Garden, Sparkling Brut, Lemon"},
                            {"name": "Key Cane", "description": "Lyre's Cane, Ginger, Honey, Lime, Soda"},
                            {"name": "Yuzu Berrie", "description": "Seedlip Garden, Fever Tree Lemon Yuzu, Berries"},
                            {"name": "Non-Spritz", "description": "Lyre's Italian Spritz, Sparkling Brut, Club Soda"},
                        ]},
                    ],
                },
                {
                    "name": "BEER SELECTION",
                    "price": "From $10/bottle",
                    "price_numeric": 10,
                    "items": [
                        {"name": "DOMESTIC & INTERNATIONAL", "price": "$12 Per Bottle", "items": [
                            {"name": "Coors Light"}, {"name": "Michelob Ultra"}, {"name": "Bud Light"},
                            {"name": "Corona"}, {"name": "Modelo Especial"}, {"name": "Guinness"},
                            {"name": "Stella Artois"}, {"name": "Heineken"}, {"name": "Sam Adams"},
                            {"name": "Sierra Nevada IPA"}, {"name": "Athletic Non-Alcoholic"},
                        ]},
                        {"name": "LOCAL CRAFT", "price": "$16 Per Bottle", "items": [
                            {"name": "IPA, Ever Haze 16oz", "description": "Tripping Animals Brewing, Doral FL"},
                            {"name": "Lager, Beach Access", "description": "Civil Society Brewing, Jupiter FL"},
                        ]},
                        {"name": "HARD SELTZER", "price": "$10 Per Bottle", "items": [
                            {"name": "Austin Cocktails Orange-Lime Margarita"},
                            {"name": "Austin Cocktails Grapefruit Vodka"},
                            {"name": "Austin Cocktails Cucumber Mojito"},
                        ]},
                    ],
                },
            ],
        },
        {
            "name": "ADD-ONS & SERVICES",
            "subsections": [
                {
                    "name": "AUDIO VISUAL",
                    "price": "Varies",
                    "price_numeric": 0,
                    "items": [
                        {"name": "Pinnacle Live Audio Visual", "description": "Full-time production staff on property"},
                        {"name": "Electrical Services & Internet", "description": "Contract through Pinnacle Live"},
                        {"name": "Rigging & Lighting", "description": "Fees assessed separately"},
                    ],
                    "notes": ["Pinnacle Live is the exclusive AV provider."],
                },
                {
                    "name": "FLORAL & DECOR",
                    "price": "Varies",
                    "price_numeric": 0,
                    "items": [
                        {"name": "Custom Floral Arrangements", "description": "Through preferred DMC partners"},
                        {"name": "Specialty Linens", "description": "Consult Event Manager"},
                        {"name": "Entertainment", "description": "Through preferred DMC partners"},
                    ],
                    "notes": ["All displays and decorations must be approved in writing by the Resort."],
                },
                {
                    "name": "SECURITY",
                    "price": "$75 Per Officer Per Hour",
                    "price_numeric": 75,
                    "items": [
                        {"name": "Dedicated Security Staff", "description": "Minimum 4 consecutive hours", "price": "$75/hr per officer"},
                    ],
                    "notes": ["14 business days advance notice required."],
                },
                {
                    "name": "VALET & PARKING",
                    "price": "From $60/car/night",
                    "price_numeric": 60,
                    "items": [
                        {"name": "Standard Valet", "price": "$60 per car per night"},
                        {"name": "Oversized Vehicle", "price": "$70 per car per night"},
                    ],
                },
            ],
        },
    ]


def _get_pier66_guidelines():
    return {
        "service_charge": {"indoor": 26, "outdoor": 28, "event_center": 26},
        "tax_rate": 7,
        "meal_durations": {
            "coffee_breaks": "30 minutes",
            "breakfast_buffets": "1 hour",
            "lunch_dinner_reception_stations": "1 hour",
            "lunch_dinner_buffets": "2 hours",
        },
        "guarantee_rules": [
            "Final guarantees due 3 business days prior at 9AM EST",
            "Guarantee not subject to reduction",
            "Over 100 guests: serve up to 5% over guarantee on request",
            "Under 100 guests: serve guaranteed count only",
        ],
        "staffing_fees": {
            "chef_attendant": "$400 per 2 hours, $150/hr additional",
            "sushi_chef": "$600 per 2 hours, $250/hr additional",
            "bartender": "$400 per 2 hours (max 4 hours), $150/hr additional",
            "mixologist": "$600 per 2 hours, $200/hr additional",
            "specialty_bar_setup": "$400 per bar/station",
            "small_group_setup": "$400 for groups of 30 or fewer",
        },
        "tableside_upcharge": "$75 per person (events up to 200 guests)",
        "cancellation": "Cancellations within 30 days assessed full estimated charges",
        "outdoor_music_cutoff": "10:00 PM",
    }
