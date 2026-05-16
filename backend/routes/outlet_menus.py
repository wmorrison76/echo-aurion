"""
Outlet Menu Catalog — Multi-Restaurant Menu Import & POS Routing
================================================================
Imports restaurant/outlet menus (extracted from PDFs), stores with
outlet metadata, and auto-routes all menu items to POS with correct
chit printer and GL assignments. Connects to Dish Assembly for
production tickets.

Key design: NO real restaurant names in codebase — generic outlet
identifiers only. Actual names come from user configuration.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/outlet-menus", tags=["outlet-menus"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ══════════════════════════════════════
#  OUTLET MANAGEMENT
# ══════════════════════════════════════

@router.get("/outlets")
async def list_outlets():
    """List all configured outlets."""
    outlets = list(db["outlets"].find({}, {"_id": 0}).sort("name", 1))
    return {"outlets": outlets, "total": len(outlets)}


@router.post("/outlets")
async def create_outlet(body: dict = {}):
    """Create a new outlet."""
    outlet_id = f"out-{_uid()}"
    doc = {
        "outlet_id": outlet_id,
        "name": body.get("name", ""),
        "type": body.get("type", "restaurant"),
        "cuisine": body.get("cuisine", ""),
        "location": body.get("location", ""),
        "revenue_center": body.get("revenue_center", "REST"),
        "has_bar": body.get("has_bar", True),
        "default_kitchen_printer": body.get("default_kitchen_printer", "kitchen_hot"),
        "default_bar_printer": body.get("default_bar_printer", "bar"),
        "service_charge_pct": body.get("service_charge_pct", 20),
        "active": True,
        "created_at": _now(),
    }
    db["outlets"].insert_one({**doc, "_id": outlet_id})
    return doc


# ══════════════════════════════════════
#  OUTLET MENU CRUD
# ══════════════════════════════════════

@router.get("")
async def list_outlet_menus(outlet_id: Optional[str] = None, active_only: bool = True):
    """List outlet menus, optionally filtered by outlet."""
    q: dict = {}
    if active_only:
        q["active"] = True
    if outlet_id:
        q["outlet_id"] = outlet_id
    menus = list(db["outlet_menus"].find(q, {"_id": 0, "sections": 0}).sort("uploaded_at", -1))
    return {"menus": menus, "total": len(menus)}


@router.get("/{menu_id}")
async def get_outlet_menu(menu_id: str):
    """Get full outlet menu with all sections and items."""
    menu = db["outlet_menus"].find_one({"menu_id": menu_id}, {"_id": 0})
    if not menu:
        raise HTTPException(404, "Menu not found")
    return menu


@router.get("/{menu_id}/items")
async def get_menu_items(menu_id: str, section: Optional[str] = None):
    """Get flat item list for POS routing."""
    menu = db["outlet_menus"].find_one({"menu_id": menu_id}, {"_id": 0})
    if not menu:
        raise HTTPException(404, "Menu not found")

    items = []
    for sec in menu.get("sections", []):
        if section and sec["name"].upper() != section.upper():
            continue
        _flatten_outlet_items(sec.get("items", []), sec["name"], menu.get("outlet_id", ""), items)
    return {"items": items, "total": len(items)}


@router.post("/upload")
async def upload_outlet_menu(body: dict = {}):
    """Upload a new outlet menu (from PDF extraction). Auto-routes to POS."""
    menu_id = f"om-{_uid()}"
    outlet_id = body.get("outlet_id", "")

    doc = {
        "menu_id": menu_id,
        "outlet_id": outlet_id,
        "name": body.get("name", "Outlet Menu"),
        "version": body.get("version", _now()[:10]),
        "season": body.get("season", ""),
        "sections": body.get("sections", []),
        "notes": body.get("notes", []),
        "active": True,
        "uploaded_at": _now(),
        "updated_at": _now(),
    }
    db["outlet_menus"].insert_one({**doc, "_id": menu_id})

    # Auto-route to POS
    routed = await _auto_route_outlet_menu(doc)
    return {"menu_id": menu_id, "status": "uploaded", "items_routed": routed}


# ══════════════════════════════════════
#  SEED: Import the 4 restaurant menus
# ══════════════════════════════════════

@router.post("/seed-outlets")
async def seed_outlets():
    """Seed 4 outlets + their menus from extracted PDFs. Auto-route all to POS."""
    if db["outlet_menus"].count_documents({}) > 0:
        existing = list(db["outlets"].find({}, {"_id": 0}))
        return {"status": "already_seeded", "outlets": len(existing)}

    outlets_data = [
        {"outlet_id": "out-signature", "name": "Signature Italian", "type": "fine_dining", "cuisine": "Italian",
         "location": "Main Building, Ground Floor", "revenue_center": "REST",
         "has_bar": True, "default_kitchen_printer": "kitchen_hot", "default_bar_printer": "bar",
         "service_charge_pct": 20},
        {"outlet_id": "out-rooftop", "name": "Rooftop Lounge", "type": "lounge", "cuisine": "Small Plates & Cocktails",
         "location": "Top Floor", "revenue_center": "LNG",
         "has_bar": True, "default_kitchen_printer": "kitchen_hot", "default_bar_printer": "bar",
         "service_charge_pct": 20},
        {"outlet_id": "out-poolbar", "name": "Pool Bar & Grill", "type": "casual_dining", "cuisine": "American-Latin Grill",
         "location": "Pool Deck", "revenue_center": "POOL",
         "has_bar": True, "default_kitchen_printer": "kitchen_hot", "default_bar_printer": "bar",
         "service_charge_pct": 20},
        {"outlet_id": "out-family", "name": "Family Dining", "type": "family_dining", "cuisine": "Breakfast & Brunch",
         "location": "Marina Level", "revenue_center": "REST",
         "has_bar": False, "default_kitchen_printer": "kitchen_hot", "default_bar_printer": "kitchen_hot",
         "service_charge_pct": 20},
    ]

    for o in outlets_data:
        db["outlets"].update_one({"outlet_id": o["outlet_id"]}, {"$set": {**o, "active": True, "created_at": _now()}}, upsert=True)

    # Seed menus
    menus = [
        _build_signature_menu(),
        _build_rooftop_menu(),
        _build_poolbar_menu(),
        _build_family_menu(),
    ]

    total_routed = 0
    for menu in menus:
        db["outlet_menus"].update_one({"menu_id": menu["menu_id"]}, {"$set": {**menu, "_id": menu["menu_id"]}}, upsert=True)
        routed = await _auto_route_outlet_menu(menu)
        total_routed += routed

    return {"status": "seeded", "outlets": len(outlets_data), "menus": len(menus), "items_routed": total_routed}


# ══════════════════════════════════════
#  DISH ASSEMBLY TICKETS
# ══════════════════════════════════════

@router.post("/dish-assembly/ticket")
async def create_dish_assembly_ticket(body: dict = {}):
    """Create a dish assembly ticket when a menu item is ordered.
    Routes the order to the correct kitchen station with production steps."""
    item_name = body.get("item_name", "")
    outlet_id = body.get("outlet_id", "")
    table = body.get("table", "")
    quantity = body.get("quantity", 1)
    mods = body.get("modifications", [])
    server = body.get("server", "")

    # Find the POS item
    pos_item = db["pos_menu_items"].find_one(
        {"name": {"$regex": f"^{item_name}$", "$options": "i"}, "active": True},
        {"_id": 0}
    )

    # Resolve printer for this outlet
    printer = "kitchen_hot"
    if pos_item:
        overrides = pos_item.get("printer_overrides", {})
        printer = overrides.get(outlet_id, pos_item.get("chit_printer", "kitchen_hot"))

    ticket_id = f"da-{_uid()}"
    ticket = {
        "ticket_id": ticket_id,
        "item_name": item_name,
        "outlet_id": outlet_id,
        "table": table,
        "quantity": quantity,
        "modifications": mods,
        "server": server,
        "chit_printer": printer,
        "pos_item_id": pos_item.get("item_id") if pos_item else None,
        "gl_account": pos_item.get("gl_account", "4100") if pos_item else "4100",
        "price": pos_item.get("price", 0) if pos_item else 0,
        "production_steps": _generate_production_steps(item_name, pos_item),
        "status": "fired",
        "fired_at": _now(),
        "completed_at": None,
        "created_at": _now(),
    }
    db["dish_assembly_tickets"].insert_one({**ticket, "_id": ticket_id})
    return ticket


@router.get("/dish-assembly/queue")
async def dish_assembly_queue(outlet_id: Optional[str] = None, printer: Optional[str] = None, status: str = "fired"):
    """Get the current dish assembly queue — orders waiting at each station."""
    q: dict = {"status": status}
    if outlet_id:
        q["outlet_id"] = outlet_id
    if printer:
        q["chit_printer"] = printer
    tickets = list(db["dish_assembly_tickets"].find(q, {"_id": 0}).sort("fired_at", 1).limit(50))
    return {"tickets": tickets, "total": len(tickets)}


@router.put("/dish-assembly/{ticket_id}/complete")
async def complete_dish_assembly(ticket_id: str):
    """Mark a dish assembly ticket as complete."""
    result = db["dish_assembly_tickets"].update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": "completed", "completed_at": _now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Ticket not found")
    return {"ticket_id": ticket_id, "status": "completed"}


# ══════════════════════════════════════
#  AUTO-ROUTE OUTLET MENUS TO POS
# ══════════════════════════════════════

async def _auto_route_outlet_menu(menu: dict):
    """Auto-route all items from an outlet menu to POS."""
    count = 0
    outlet_id = menu.get("outlet_id", "")
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})

    for sec in menu.get("sections", []):
        items_flat = []
        _flatten_outlet_items(sec.get("items", []), sec["name"], outlet_id, items_flat)

        for item in items_flat:
            if not item.get("price") or item["price"] == 0:
                continue

            item_type = _classify_outlet_item(sec["name"], item.get("name", ""), item.get("subcategory", ""))
            gl_key = _gl_for_outlet_type(item_type)
            is_global_bev = item_type in ("cocktail", "wine", "beer", "spirit", "non_alcoholic")

            from routes.pos_auto_router import GL_ACCOUNTS, _default_printer
            gl = GL_ACCOUNTS.get(gl_key, GL_ACCOUNTS.get("food", {"code": "4100", "name": "Food Cost"}))

            # Determine printer
            if is_global_bev and outlet:
                chit_printer = outlet.get("default_bar_printer", "bar")
            elif outlet:
                chit_printer = outlet.get("default_kitchen_printer", "kitchen_hot")
            else:
                chit_printer = _default_printer(item_type)

            # Determine revenue center
            rc = outlet.get("revenue_center", "REST") if outlet else "REST"

            source_id = f"{menu['menu_id']}|{sec['name']}|{item['name']}"

            pos_doc = {
                "name": item["name"],
                "display_name": item["name"],
                "source": "outlet_menu",
                "source_id": source_id,
                "category": sec["name"].lower(),
                "subcategory": item.get("subcategory", ""),
                "item_type": item_type,
                "gl_account": gl["code"],
                "gl_name": gl["name"],
                "price": item["price"],
                "price_label": f"${item['price']}" if isinstance(item["price"], (int, float)) else str(item["price"]),
                "price_type": item.get("price_type", "per_item"),
                "tax_class": "beverage" if is_global_bev else "food",
                "revenue_center": rc,
                "chit_printer": chit_printer,
                "is_global": is_global_bev,
                "outlets": ["all"] if is_global_bev else [outlet_id],
                "outlet_id": outlet_id,
                "description": item.get("description", ""),
                "dietary_info": item.get("dietary_info", ""),
            }

            existing = db["pos_menu_items"].find_one({"source_id": source_id})
            if existing:
                db["pos_menu_items"].update_one({"source_id": source_id}, {"$set": {**pos_doc, "updated_at": _now()}})
            else:
                item_id = f"pmi-{_uid()}"
                db["pos_menu_items"].insert_one({
                    "_id": item_id, "item_id": item_id, **pos_doc,
                    "pos_item_code": f"{gl['code']}-OUT-{_uid()[:4].upper()}",
                    "modifier_groups": [], "active": True, "auto_routed": True,
                    "printer_overrides": {},
                    "created_at": _now(), "updated_at": _now(),
                })
            count += 1

    return count


# ══════════════════════════════════════
#  PRODUCTION STEPS GENERATOR
# ══════════════════════════════════════

def _generate_production_steps(item_name: str, pos_item: dict = None):
    """Generate production steps for dish assembly based on item type."""
    name = item_name.lower()
    printer = (pos_item or {}).get("chit_printer", "kitchen_hot")

    if printer == "bar":
        return [
            {"step": 1, "action": "Build drink", "station": "Bar", "time_est": "2-3 min"},
            {"step": 2, "action": "Garnish and present", "station": "Bar", "time_est": "30 sec"},
            {"step": 3, "action": "Send to runner", "station": "Bar Service", "time_est": "15 sec"},
        ]

    if "burger" in name or "steak" in name or "chicken" in name or "pork" in name:
        return [
            {"step": 1, "action": "Fire protein on grill/flat top", "station": "Grill", "time_est": "8-12 min"},
            {"step": 2, "action": "Toast bun / prep accompaniments", "station": "Garde Manger", "time_est": "2 min"},
            {"step": 3, "action": "Plate and assemble", "station": "Expo", "time_est": "1 min"},
            {"step": 4, "action": "QC check and send", "station": "Expo", "time_est": "30 sec"},
        ]

    if "taco" in name or "quesadilla" in name or "burrito" in name or "wrap" in name:
        return [
            {"step": 1, "action": "Heat protein / filling", "station": "Hot Line", "time_est": "5-8 min"},
            {"step": 2, "action": "Warm tortilla", "station": "Flat Top", "time_est": "1 min"},
            {"step": 3, "action": "Assemble with toppings", "station": "Cold Line", "time_est": "2 min"},
            {"step": 4, "action": "Plate and garnish", "station": "Expo", "time_est": "30 sec"},
        ]

    if "pasta" in name or "linguine" in name or "agnolotti" in name or "candele" in name:
        return [
            {"step": 1, "action": "Drop pasta in boiling water", "station": "Pasta Station", "time_est": "3-8 min"},
            {"step": 2, "action": "Build sauce in pan", "station": "Sauté", "time_est": "4-6 min"},
            {"step": 3, "action": "Toss pasta with sauce", "station": "Sauté", "time_est": "1 min"},
            {"step": 4, "action": "Plate, garnish, send", "station": "Expo", "time_est": "1 min"},
        ]

    if "salad" in name or "caesar" in name or "beetroot" in name or "crudo" in name or "oyster" in name:
        return [
            {"step": 1, "action": "Prep components", "station": "Garde Manger", "time_est": "3-5 min"},
            {"step": 2, "action": "Dress and plate", "station": "Garde Manger", "time_est": "2 min"},
            {"step": 3, "action": "Garnish and send", "station": "Expo", "time_est": "30 sec"},
        ]

    if "dessert" in name or "sorbet" in name or "ice cream" in name or "mousse" in name or "pie" in name or "crème" in name:
        return [
            {"step": 1, "action": "Prep dessert components", "station": "Pastry", "time_est": "3-5 min"},
            {"step": 2, "action": "Plate and decorate", "station": "Pastry", "time_est": "2 min"},
            {"step": 3, "action": "Send to runner", "station": "Expo", "time_est": "30 sec"},
        ]

    # Default
    return [
        {"step": 1, "action": "Prepare item", "station": "Kitchen", "time_est": "5-10 min"},
        {"step": 2, "action": "Plate and present", "station": "Expo", "time_est": "1-2 min"},
        {"step": 3, "action": "QC and send", "station": "Expo", "time_est": "30 sec"},
    ]


# ══════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════

def _flatten_outlet_items(items, section_name, outlet_id, results):
    """Flatten nested outlet menu items."""
    for item in items:
        if item.get("items"):
            sub_name = item.get("name", item.get("item_name", ""))
            sub_items = item.get("items", [])
            for si in sub_items:
                name = si.get("name", si.get("item_name", ""))
                price = si.get("price", 0)
                if isinstance(price, dict):
                    # Wine with GL/BTL pricing
                    results.append({
                        "name": name,
                        "description": si.get("description", ""),
                        "price": price.get("GL", price.get("BTL", 0)),
                        "price_btl": price.get("BTL", 0),
                        "price_type": "per_glass",
                        "subcategory": sub_name,
                        "section": section_name,
                        "dietary_info": ", ".join(si.get("dietary_flags", si.get("dietary_notes", []))),
                    })
                else:
                    p = _parse_num(price)
                    if p > 0:
                        results.append({
                            "name": name,
                            "description": si.get("description", ""),
                            "price": p,
                            "price_type": "per_item",
                            "subcategory": sub_name,
                            "section": section_name,
                            "dietary_info": ", ".join(si.get("dietary_flags", si.get("dietary_notes", []))),
                        })
        else:
            name = item.get("name", item.get("item_name", ""))
            price = item.get("price", item.get("number", 0))
            if isinstance(price, dict):
                results.append({
                    "name": name,
                    "description": item.get("description", ""),
                    "price": price.get("GL", price.get("BTL", 0)),
                    "price_btl": price.get("BTL", 0),
                    "price_type": "per_glass",
                    "subcategory": "",
                    "section": section_name,
                    "dietary_info": ", ".join(item.get("dietary_flags", item.get("dietary_notes", []))),
                })
            else:
                p = _parse_num(price)
                if p > 0:
                    results.append({
                        "name": name,
                        "description": item.get("description", ""),
                        "price": p,
                        "price_type": "per_item",
                        "subcategory": "",
                        "section": section_name,
                        "dietary_info": ", ".join(item.get("dietary_flags", item.get("dietary_notes", []))),
                    })
            # Handle sub-options (e.g. oysters 1/2 dz, 1 dz)
            for opt in item.get("options", []):
                p = _parse_num(opt.get("price", 0))
                if p > 0:
                    results.append({
                        "name": f"{name} ({opt['name']})",
                        "description": item.get("description", ""),
                        "price": p,
                        "price_type": "per_item",
                        "subcategory": "",
                        "section": section_name,
                    })


def _parse_num(val):
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        import re
        nums = re.findall(r'[\d.]+', val)
        return float(nums[0]) if nums else 0
    return 0


def _classify_outlet_item(section, name, subcategory=""):
    """Classify outlet menu item by type."""
    sec = section.upper()
    n = name.upper()
    sub = (subcategory or "").upper()

    if sec in ("COCKTAILS", "SPIRIT FREE") or "MARTINI" in n or "SPRITZ" in n:
        if "FREE" in sec or "SPIRIT FREE" in sec:
            return "non_alcoholic"
        return "cocktail"
    if sec in ("WINE", "SPARKLING") or "WINE" in sub or "CHAMPAGNE" in n or "PROSECCO" in n:
        return "wine"
    if sec == "BEER" or "BEER" in sub or "LAGER" in n or "IPA" in n or "CIDER" in n:
        return "beer"
    if sec in ("VODKA", "GIN", "TEQUILA", "MEZCAL", "RUM", "WHISKEY", "BOURBON", "SCOTCH", "IRISH",
               "JAPANESE", "CANADIAN", "RYE", "COGNAC", "LIQUORS & CORDIALS", "LIQUOR"):
        return "spirit"
    if "SPIRIT" in sub or "VODKA" in sub or "GIN" in sub or "TEQUILA" in sub or "BOURBON" in sub:
        return "spirit"
    if "TAVISTOCK" in sec:
        return "wine"
    if "CREATE YOUR OWN" in sec:
        return "spirit"

    if "DESSERT" in sec or "SWEET" in sec or "ICE CREAM" in n or "SORBET" in n:
        return "dessert"
    if "PASTA" in sec or "LINGUINE" in n or "AGNOLOTTI" in n:
        return "entree"
    if sec in ("CAVIAR", "RAW BAR", "RAW BAR / CRUDO", "CRUDO", "CHILLED"):
        return "appetizer_cold"
    if sec in ("APPETIZERS", "WARM"):
        return "appetizer_hot"
    if sec in ("ENTRÉES", "ENTREES", "MAINS", "FOR THE TABLE"):
        return "entree"
    if sec in ("VEGETABLES", "SIDES"):
        return "side"

    return "entree"


def _gl_for_outlet_type(item_type):
    mapping = {
        "entree": "food", "appetizer_hot": "food", "appetizer_cold": "food",
        "salad": "food", "soup": "food", "dessert": "food", "bakery": "food",
        "side": "food", "carving": "food", "station": "food",
        "cocktail": "alcoholic_beverage", "spirit": "alcoholic_beverage",
        "wine": "wine", "beer": "beer",
        "non_alcoholic": "non_alcoholic_beverage",
    }
    return mapping.get(item_type, "food")


# ══════════════════════════════════════
#  MENU DATA BUILDERS (from PDF extractions)
# ══════════════════════════════════════

def _build_signature_menu():
    return {
        "menu_id": "om-signature-v1", "outlet_id": "out-signature",
        "name": "Signature Italian Dinner Menu", "version": "2025-Q1",
        "active": True, "uploaded_at": _now(), "updated_at": _now(),
        "sections": [
            {"name": "CAVIAR", "items": [
                {"name": "Kaluga Caviar", "description": "Parmesan pizelle, traditional accoutrement", "price": 175, "price_type": "per_item"},
                {"name": "Royal Osetra Caviar", "description": "Parmesan pizelle, traditional accoutrement", "price": 225},
                {"name": "Golden Osetra Caviar", "description": "Parmesan pizelle, traditional accoutrement", "price": 375},
                {"name": "Beluga Huso Huso", "description": "Parmesan pizelle, traditional accoutrement", "price": 850},
            ]},
            {"name": "RAW BAR / CRUDO", "items": [
                {"name": "Pacific Rockfish", "description": "Florida citrus, salsa verde, red onion", "price": 26},
                {"name": "Hamachi", "description": "Country bread, pickled shallot, tomato jus", "price": 28},
                {"name": "Scallop Crudo", "description": "Black truffle, kumquat, hazelnut", "price": 36},
                {"name": "Oysters", "description": "Balsamic mignonette, house cocktail sauce", "price": 24, "options": [
                    {"name": "Half Dozen", "price": 24}, {"name": "Full Dozen", "price": 48},
                ]},
            ]},
            {"name": "PASTA", "items": [
                {"name": "Agnolotti Primavera", "description": "Market vegetables, ricotta, blistered tomato", "price": 36},
                {"name": "Lobster Linguine Arrabbiata", "description": "Calabrian chili, parsley, sauce Americaine", "price": 48},
                {"name": "Candele Fracis", "description": "Beef shin, winter truffle, comte", "price": 42},
            ]},
            {"name": "APPETIZERS", "items": [
                {"name": "Local Burrata", "description": "Sauce gribiche, basil, strawberry", "price": 24},
                {"name": "Caesar Salad", "description": "Baby gem, brioche crouton, bottarga", "price": 22},
                {"name": "Beetroot Salad", "description": "Roquefort, hazelnut, banyuls vinaigrette", "price": 26},
                {"name": "Vegetable Tart", "description": "Feuilles de brick, tomato marmalade, fines herbs", "price": 22},
                {"name": "Grilled Octopus", "description": "Garbanzo, chorizo, black garlic", "price": 30},
                {"name": "Foie Gras Torchon", "description": "Toasted pistachio, olive oil, quince", "price": 38},
            ]},
            {"name": "ENTREES", "items": [
                {"name": "Turbot", "description": "Roasted caper, pumpkin seed, lobster emulsion", "price": 55},
                {"name": "Grilled Local Catch", "description": "Roasted pepper pistou, pastoral salad, almond", "price": 50},
                {"name": "Heritage Chicken", "description": "Charred leek, wild mushrooms, natural jus", "price": 54},
                {"name": "Grilled Acorn Fed Pork", "description": "Smoked eggplant, peppercorn gastrique, calabrian XO", "price": 65},
                {"name": "Braised Short Rib", "description": "Preserved lemon, cherry pepper, polenta", "price": 56},
            ]},
            {"name": "FOR THE TABLE", "items": [
                {"name": "Dover Sole Meuniere", "description": "Brown butter, caper, lemon", "price": 95},
                {"name": "Lobster Parmesan", "description": "Marinara, mozzarella, coral butter", "price": 135},
                {"name": "Salmon en Croute", "description": "Beurre monte, salmon roe, sorrel", "price": 125},
                {"name": "Bisteca alla Fiorentina", "description": "Braised shallot, grilled lemon, maitre d' butter", "price": 250},
            ]},
            {"name": "VEGETABLES", "items": [
                {"name": "Pommes Anna", "price": 16},
                {"name": "Peas a la Francaise", "price": 14},
                {"name": "Braised Escarole", "price": 14},
                {"name": "Caramelized Romanesco", "price": 16},
            ]},
        ],
    }


def _build_rooftop_menu():
    return {
        "menu_id": "om-rooftop-v1", "outlet_id": "out-rooftop",
        "name": "Rooftop Lounge Menu", "version": "2025-Q1",
        "active": True, "uploaded_at": _now(), "updated_at": _now(),
        "sections": [
            {"name": "CHILLED", "items": [
                {"name": "Half Dozen Oyster", "description": "Yuzu pearls, apple mignonette", "price": 30},
                {"name": "Garden Crudite", "description": "Ancient grains, avocado green goddess", "price": 16},
                {"name": "Jumbo Shrimp Cocktail", "description": "Cognac sauce, cocktail sauce", "price": 28},
                {"name": "Cheese + Charcuterie", "description": "Pickled vegetables, violet mustard, honey, grilled baguette", "price": 32},
                {"name": "Red Endives Salad", "description": "Cinnamon roasted pumpkin, goat cheese, candied walnuts, cranberries", "price": 16},
            ]},
            {"name": "WARM", "items": [
                {"name": "Wagyu Sliders", "description": "Guinness cheddar, russian dressing, brioche", "price": 30},
                {"name": "Bourbon Meatballs", "description": "Crispy leeks, grilled baguette", "price": 30},
                {"name": "Croquetas de Jamon", "description": "Romesco", "price": 19},
                {"name": "Lobster Roll", "description": "Lemon remoulade, bibb lettuce, caviar", "price": 28},
                {"name": "Shishito Peppers", "description": "Citrus, smoked chili aioli", "price": 16},
                {"name": "Cracked Olives", "description": "Herbs, feta", "price": 16},
            ]},
            {"name": "SWEET", "items": [
                {"name": "Strawberry + Mint Crumble", "description": "Tiramisu cream, rum gelee, strawberry sorbet", "price": 14},
                {"name": "Black Lime + Almond Sable", "description": "Gin tonic sorbet", "price": 14},
                {"name": "Chocolate Macaron Assortment", "description": "6 pieces", "price": 18},
            ]},
            {"name": "COCKTAILS", "items": [
                {"name": "Noir Martini", "description": "Tito's Vodka, St. George Nola, Espresso", "price": 22},
                {"name": "Martini Nuage", "description": "Blue Cheese Infused Elyx Vodka, Dry Vermouth, Olive Brine, Tomato Foam", "price": 24},
                {"name": "Kaffir Breeze", "description": "Bombay Gin, Aloe Liqueur, Lemongrass, Kaffir, Lime, Club Soda", "price": 22},
                {"name": "Citrus Veil", "description": "Blood Orange Gin, Lillet Blanc, Italicus, Lemon, Grapefruit Bitters", "price": 22},
                {"name": "Shiso Pretty", "description": "Milagro Tequila, Vida Mezcal, Passionfruit, Vanilla, Lime", "price": 24},
                {"name": "New York Thymes", "description": "Buffalo Trace Bourbon, Sweet Vermouth, Benedictine, Campari Foam", "price": 24},
                {"name": "Bean Me Ube", "description": "Suntory Toki, Appleton Rum, Hoodoo, Ube-Marshmallow, Coconut, Lemon", "price": 25},
                {"name": "Dive In", "description": "Copalli Cacao Rum, Blue Curacao, Basil Brandy, Coconut, Lemon", "price": 24},
            ]},
            {"name": "SPIRIT FREE", "items": [
                {"name": "Passionfruit Bliss", "description": "Passionfruit, mint, lime, club soda", "price": 15},
                {"name": "Green Breeze", "description": "Seedlip Garden, cucumber, lemon, sparkling cucumber soda", "price": 15},
            ]},
            {"name": "WINE", "items": [
                {"name": "Chandon Brut Rose", "description": "Napa Valley, California NV", "price": {"GL": 18, "BTL": 72}},
                {"name": "Champagne G.H. Mumm Brut", "description": "Champagne, France NV", "price": {"GL": 30, "BTL": 120}},
                {"name": "Champagne Pommery Royal Brut", "description": "Reims, France '08", "price": {"GL": 55, "BTL": 220}},
                {"name": "Sancerre Champ Perroy", "description": "Loire, France '21", "price": {"GL": 22, "BTL": 88}},
                {"name": "Chablis Venon et Fils", "description": "Burgundy, France '20", "price": {"GL": 20, "BTL": 80}},
                {"name": "Flor de Muga Rose", "description": "Rioja, Spain '23", "price": {"GL": 24, "BTL": 96}},
                {"name": "Red Blend Niner Bootjack", "description": "Paso Robles, California '22", "price": {"GL": 22, "BTL": 88}},
                {"name": "Cab/Shiraz Penfolds Bin 600", "description": "California '22", "price": {"GL": 28, "BTL": 112}},
            ]},
            {"name": "BEER", "items": [
                {"name": "BOTTLES", "items": [
                    {"name": "Miller Lite", "description": "ABV 4.2%", "price": 12},
                    {"name": "Michelob Ultra", "description": "ABV 4.2%", "price": 12},
                    {"name": "Kronenburg 1664", "description": "ABV 5.5%", "price": 14},
                    {"name": "St. Bernardus Abt 12", "description": "ABV 10%", "price": 18},
                    {"name": "Angry Orchard Hard Cider", "description": "ABV 5%", "price": 12},
                ]},
                {"name": "DRAFT", "items": [
                    {"name": "Modelo Especial Draft", "description": "ABV 4.4%", "price": 12},
                    {"name": "Buenaveza Lager Draft", "description": "ABV 4.7% Stone Brewing", "price": 14},
                    {"name": "Ever Haze IPA Draft", "description": "ABV 7% Tripping Animals", "price": 14},
                ]},
            ]},
            {"name": "TAVISTOCK RESERVE COLLECTION", "items": [
                {"name": "Prosecco", "description": "Veneto, Italy", "price": {"GL": 17, "BTL": 65}},
                {"name": "Pinot Grigio", "description": "Friuli, Italy", "price": {"GL": 17, "BTL": 65}},
                {"name": "Sauvignon Blanc", "description": "Monterey, California", "price": {"GL": 17, "BTL": 65}},
                {"name": "Rose", "description": "Provence, France", "price": {"GL": 17, "BTL": 65}},
                {"name": "Chardonnay", "description": "Monterey, California", "price": {"GL": 17, "BTL": 65}},
                {"name": "Pinot Noir", "description": "Monterey, California", "price": {"GL": 17, "BTL": 65}},
                {"name": "Red Blend", "description": "Mendoza, Argentina", "price": {"GL": 17, "BTL": 65}},
                {"name": "Cabernet Sauvignon", "description": "Monterey, California", "price": {"GL": 17, "BTL": 65}},
                {"name": "Malbec", "description": "Mendoza, Argentina", "price": {"GL": 17, "BTL": 65}},
            ]},
        ],
    }


def _build_poolbar_menu():
    return {
        "menu_id": "om-poolbar-v1", "outlet_id": "out-poolbar",
        "name": "Pool Bar & Grill Menu", "version": "2025-AUG",
        "active": True, "uploaded_at": _now(), "updated_at": _now(),
        "sections": [
            {"name": "MAINS", "items": [
                {"name": "Latin Burger", "description": "Angus beef, crispy bacon, lettuce, tomatoes, sauteed onions, Chihuahua cheese, chimichurri aioli, brioche bun", "price": 25, "dietary_flags": ["D"]},
                {"name": "Veggie Burger", "description": "Black bean barley patty, pepper jack, lettuce, pickles, muhammara, brioche bun", "price": 22, "dietary_flags": ["D", "N", "V"]},
                {"name": "Chicken-Avocado Wrap", "description": "Lettuce, pico de gallo, chipotle aioli, spinach tortilla", "price": 22},
                {"name": "Tacos de Carnitas", "description": "Confit pork, charred corn salsa, pickled onions, salsa verde, corn tortilla", "price": 21, "dietary_flags": ["GF"]},
                {"name": "Beef Quesadilla", "description": "Braised beef, Chihuahua cheese, mozzarella, flour tortilla", "price": 28, "dietary_flags": ["D"]},
                {"name": "Baja Tacos", "description": "Beer-battered snapper, avocado crema, cabbage slaw, flour tortilla, chipotle aioli", "price": 26, "dietary_flags": ["D"]},
                {"name": "Cheese Quesadilla", "description": "Chihuahua cheese, mozzarella, flour tortilla", "price": 18, "dietary_flags": ["D", "V"]},
            ]},
            {"name": "DESSERTS", "items": [
                {"name": "Sorbet Frutina", "description": "Coco, Mango, Pina", "price": 10, "dietary_flags": ["V", "VE"]},
                {"name": "Caramel Crunch Verrine", "description": "Vanilla + Dulce de Leche ice cream, cookie crumble", "price": 10, "dietary_flags": ["D"]},
                {"name": "Dubai Chocolate Verrine", "description": "Pistachio + Chocolate ice cream, kadaif", "price": 10, "dietary_flags": ["D", "N"]},
                {"name": "Ice Cream Sandwich", "description": "Chocolate chip cookie, vanilla ice cream or raspberry sorbet", "price": 12, "dietary_flags": ["D"]},
            ]},
        ],
    }


def _build_family_menu():
    return {
        "menu_id": "om-family-v1", "outlet_id": "out-family",
        "name": "Family Dining Kids Breakfast", "version": "2025-MAY",
        "active": True, "uploaded_at": _now(), "updated_at": _now(),
        "sections": [
            {"name": "KIDS BREAKFAST", "items": [
                {"name": "Nutella Crepe", "description": "Fresh berries, powdered sugar", "price": 16, "dietary_flags": ["D", "G"]},
                {"name": "Mini Waffle", "description": "Mixed berries or banana, maple syrup", "price": 16, "dietary_flags": ["D", "G"]},
                {"name": "Fruit Toast", "description": "Multigrain toast, honey cream cheese, blueberries, banana, strawberries, clementines", "price": 12, "dietary_flags": ["D", "G"]},
                {"name": "Petite Pancake", "description": "Chocolate, plain or blueberry", "price": 16, "dietary_flags": ["D", "G"]},
                {"name": "One Egg Breakfast", "description": "Cage free egg, breakfast potato, applewood smoked bacon or sausage", "price": 18, "dietary_flags": ["D", "G"]},
            ]},
            {"name": "KIDS BUFFET", "items": [
                {"name": "Cold Island Buffet", "description": "Weekends only", "price": 20},
            ]},
        ],
    }
