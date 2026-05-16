"""
POS Auto-Router — Automatic Menu Item → POS Routing Engine
===========================================================
When a MENU ITEM (not a recipe) is created — banquet, outlet, or beverage —
it auto-generates a POS routing record with:
  - POS item ID, revenue center, GL account
  - Chit printer assignment (kitchen hot/cold, bar, pastry, expo)
  - Price, tax class, modifier groups
  - Global flag for beverages (shared across all outlets with bars)

Key distinction: Recipes are EXCLUDED. A chef may have 10 recipes for one
dessert, but only 1 menu item hits the POS. The menu item is the sellable
unit; the recipe is the production instruction behind it.

Chit printer routing is per-outlet — the same cocktail routes to the
service bar printer at the Pool Bar but the main bar printer in the Lounge.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/pos-router", tags=["pos-router"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ══════════════════════════════════════
#  CONSTANTS
# ══════════════════════════════════════

GL_ACCOUNTS = {
    "food": {"code": "4100", "name": "Food Cost"},
    "alcoholic_beverage": {"code": "4200", "name": "Beverage Cost"},
    "non_alcoholic_beverage": {"code": "4100", "name": "Food Cost (NA Bev)"},
    "wine": {"code": "4200", "name": "Beverage Cost (Wine)"},
    "beer": {"code": "4200", "name": "Beverage Cost (Beer)"},
    "av": {"code": "4300", "name": "AV Revenue"},
    "rental": {"code": "4400", "name": "Room Rental"},
    "service": {"code": "4500", "name": "Service Fees"},
    "floral": {"code": "4600", "name": "Floral & Decor"},
    "valet": {"code": "4700", "name": "Parking & Valet"},
}

REVENUE_CENTERS_DEFAULT = [
    {"code": "BNQ", "name": "Banquet", "type": "banquet"},
    {"code": "REST", "name": "Restaurant", "type": "outlet"},
    {"code": "POOL", "name": "Pool Bar", "type": "outlet"},
    {"code": "LNG", "name": "Lounge", "type": "outlet"},
    {"code": "IRS", "name": "In-Room Dining", "type": "outlet"},
    {"code": "MBR", "name": "Minibar", "type": "outlet"},
    {"code": "CAF", "name": "Cafeteria", "type": "outlet"},
    {"code": "SPA", "name": "Spa Cafe", "type": "outlet"},
    {"code": "EVT", "name": "Event Center", "type": "banquet"},
]

CHIT_PRINTERS_DEFAULT = [
    {"id": "prn-kit-hot", "name": "Kitchen Hot Line", "type": "kitchen_hot", "location": "Main Kitchen", "routes_to": "Grilled, sauteed, fried items"},
    {"id": "prn-kit-cold", "name": "Kitchen Cold / Garde Manger", "type": "kitchen_cold", "location": "Main Kitchen", "routes_to": "Salads, cold apps, plating"},
    {"id": "prn-pastry", "name": "Pastry Station", "type": "pastry", "location": "Pastry Kitchen", "routes_to": "Desserts, bread, pastries"},
    {"id": "prn-bar-main", "name": "Main Bar", "type": "bar", "location": "Main Bar", "routes_to": "Cocktails, spirits, beer, wine"},
    {"id": "prn-bar-svc", "name": "Service Bar", "type": "service_bar", "location": "Service Bar", "routes_to": "Banquet/event beverages"},
    {"id": "prn-bar-pool", "name": "Pool Bar", "type": "bar", "location": "Pool Deck", "routes_to": "Pool bar cocktails and food"},
    {"id": "prn-expo", "name": "Expo / Pass", "type": "expo", "location": "Expo Window", "routes_to": "Final plating, quality check, runner"},
    {"id": "prn-bnq-kit", "name": "Banquet Kitchen", "type": "kitchen_hot", "location": "Banquet Kitchen", "routes_to": "Banquet food production"},
    {"id": "prn-bnq-bar", "name": "Banquet Bar", "type": "bar", "location": "Banquet Staging", "routes_to": "Banquet beverage service"},
]

# Item type → default chit printer mapping
DEFAULT_PRINTER_MAP = {
    "entree": "kitchen_hot",
    "appetizer_hot": "kitchen_hot",
    "appetizer_cold": "kitchen_cold",
    "salad": "kitchen_cold",
    "soup": "kitchen_hot",
    "dessert": "pastry",
    "bakery": "pastry",
    "cocktail": "bar",
    "wine": "bar",
    "beer": "bar",
    "spirit": "bar",
    "non_alcoholic": "bar",
    "coffee_tea": "kitchen_hot",
    "side": "kitchen_hot",
    "carving": "kitchen_hot",
    "station": "kitchen_hot",
}


# ══════════════════════════════════════
#  SEED: Revenue Centers & Chit Printers
# ══════════════════════════════════════

@router.post("/seed")
async def seed_pos_router():
    """Seed revenue centers, chit printers, and auto-route existing menu items."""
    # Revenue centers
    if db["pos_revenue_centers"].count_documents({}) == 0:
        for rc in REVENUE_CENTERS_DEFAULT:
            db["pos_revenue_centers"].insert_one({
                **rc, "id": f"rc-{rc['code'].lower()}", "active": True, "created_at": _now(),
            })

    # Chit printers
    if db["pos_chit_printers"].count_documents({}) == 0:
        for p in CHIT_PRINTERS_DEFAULT:
            db["pos_chit_printers"].insert_one({
                **p, "active": True, "ip_address": "", "created_at": _now(),
            })

    # Auto-route banquet catalog items
    banquet_count = await _auto_route_banquet_catalog()
    # Auto-route mixology recipes as global beverage items
    beverage_count = await _auto_route_global_beverages()

    return {
        "status": "seeded",
        "revenue_centers": len(REVENUE_CENTERS_DEFAULT),
        "chit_printers": len(CHIT_PRINTERS_DEFAULT),
        "banquet_items_routed": banquet_count,
        "global_beverages_routed": beverage_count,
    }


# ══════════════════════════════════════
#  AUTO-ROUTING ENGINE
# ══════════════════════════════════════

async def _auto_route_banquet_catalog():
    """Auto-route all banquet catalog menu items to POS."""
    menu = db["banquet_menu_catalog"].find_one({"active": True}, {"_id": 0})
    if not menu:
        return 0

    count = 0
    for section in menu.get("sections", []):
        for subsection in section.get("subsections", []):
            sub_name = subsection.get("name", "")
            base_price = subsection.get("price_numeric", 0)
            price_label = subsection.get("price", "")

            # Route the subsection itself as a package item
            item_type, gl_key = _classify_item(section["name"], sub_name, "")
            if base_price > 0:
                await _upsert_pos_item({
                    "name": f"{sub_name}",
                    "display_name": f"{sub_name} ({section['name']})",
                    "source": "banquet_catalog",
                    "source_id": f"{menu['menu_id']}|{section['name']}|{sub_name}",
                    "category": section["name"].lower(),
                    "subcategory": sub_name.lower(),
                    "item_type": item_type,
                    "gl_account": GL_ACCOUNTS.get(gl_key, GL_ACCOUNTS["food"])["code"],
                    "gl_name": GL_ACCOUNTS.get(gl_key, GL_ACCOUNTS["food"])["name"],
                    "price": base_price,
                    "price_label": price_label,
                    "price_type": "per_person",
                    "tax_class": "food" if gl_key == "food" else "beverage",
                    "revenue_center": "BNQ",
                    "chit_printer": _default_printer(item_type),
                    "is_global": False,
                    "outlets": ["banquet"],
                })
                count += 1

            # Route individual priced items (a la carte, per-drink, per-dozen)
            for item in subsection.get("items", []):
                if item.get("items"):
                    # Group with sub-items
                    group_price = item.get("price", "")
                    for sub_item in item.get("items", []):
                        sp = sub_item.get("price", "") or group_price
                        if sp:
                            it, gk = _classify_item(section["name"], sub_name, sub_item.get("name", ""))
                            await _upsert_pos_item({
                                "name": sub_item["name"],
                                "display_name": sub_item["name"],
                                "source": "banquet_catalog",
                                "source_id": f"{menu['menu_id']}|{section['name']}|{sub_name}|{sub_item['name']}",
                                "category": section["name"].lower(),
                                "subcategory": sub_name.lower(),
                                "item_type": it,
                                "gl_account": GL_ACCOUNTS.get(gk, GL_ACCOUNTS["food"])["code"],
                                "gl_name": GL_ACCOUNTS.get(gk, GL_ACCOUNTS["food"])["name"],
                                "price": _parse_price(sp),
                                "price_label": sp,
                                "price_type": _detect_price_type(sp),
                                "tax_class": "food" if gk == "food" else "beverage",
                                "revenue_center": "BNQ",
                                "chit_printer": _default_printer(it),
                                "is_global": gk in ("alcoholic_beverage", "wine", "beer"),
                                "outlets": ["banquet"] if gk == "food" else ["all"],
                                "dietary_info": sub_item.get("dietary_info", ""),
                                "description": sub_item.get("description", ""),
                            })
                            count += 1
                elif item.get("price"):
                    it, gk = _classify_item(section["name"], sub_name, item.get("name", ""))
                    await _upsert_pos_item({
                        "name": item["name"],
                        "display_name": item["name"],
                        "source": "banquet_catalog",
                        "source_id": f"{menu['menu_id']}|{section['name']}|{sub_name}|{item['name']}",
                        "category": section["name"].lower(),
                        "subcategory": sub_name.lower(),
                        "item_type": it,
                        "gl_account": GL_ACCOUNTS.get(gk, GL_ACCOUNTS["food"])["code"],
                        "gl_name": GL_ACCOUNTS.get(gk, GL_ACCOUNTS["food"])["name"],
                        "price": _parse_price(item["price"]),
                        "price_label": item["price"],
                        "price_type": _detect_price_type(item["price"]),
                        "tax_class": "food" if gk == "food" else "beverage",
                        "revenue_center": "BNQ",
                        "chit_printer": _default_printer(it),
                        "is_global": gk in ("alcoholic_beverage", "wine", "beer"),
                        "outlets": ["banquet"] if gk == "food" else ["all"],
                        "dietary_info": item.get("dietary_info", ""),
                        "description": item.get("description", ""),
                    })
                    count += 1

    return count


async def _auto_route_global_beverages():
    """Auto-route mixology R&D recipes as global beverage items (shared across all outlets)."""
    from routes.mixology_rd import RECIPE_DB, INGREDIENTS, _cost_recipe

    count = 0
    for recipe in RECIPE_DB:
        costed = _cost_recipe(recipe)
        is_alcoholic = recipe["type"] == "alcoholic"
        gl_key = "alcoholic_beverage" if is_alcoholic else "non_alcoholic_beverage"

        await _upsert_pos_item({
            "name": recipe["name"],
            "display_name": recipe["name"],
            "source": "mixology_rd",
            "source_id": f"mixology|{recipe['name']}",
            "category": "cocktail" if is_alcoholic else "mocktail",
            "subcategory": recipe.get("category", ""),
            "item_type": "cocktail" if is_alcoholic else "non_alcoholic",
            "gl_account": GL_ACCOUNTS[gl_key]["code"],
            "gl_name": GL_ACCOUNTS[gl_key]["name"],
            "price": recipe["menu_price"],
            "price_label": f"${recipe['menu_price']:.0f}",
            "price_type": "per_drink",
            "tax_class": "beverage" if is_alcoholic else "food",
            "revenue_center": "ALL",
            "chit_printer": "bar",
            "is_global": True,
            "outlets": ["all"],
            "cost": costed["total_cost"],
            "margin_pct": costed["margin_pct"],
            "abv_pct": costed.get("abv_pct", 0),
            "method": recipe.get("method", ""),
            "glass": recipe.get("glass", ""),
        })
        count += 1

    return count


async def _upsert_pos_item(data: dict):
    """Upsert a POS menu item — update if exists, create if new."""
    source_id = data.get("source_id", "")
    existing = db["pos_menu_items"].find_one({"source_id": source_id})

    if existing:
        db["pos_menu_items"].update_one(
            {"source_id": source_id},
            {"$set": {**data, "updated_at": _now()}}
        )
    else:
        item_id = f"pmi-{_uid()}"
        db["pos_menu_items"].insert_one({
            "_id": item_id,
            "item_id": item_id,
            **data,
            "pos_item_code": _generate_pos_code(data),
            "modifier_groups": [],
            "active": True,
            "auto_routed": True,
            "printer_overrides": {},  # {outlet_code: printer_id} — per-outlet printer overrides
            "created_at": _now(),
            "updated_at": _now(),
        })


def _generate_pos_code(data):
    """Generate a POS item code: GL-CAT-SEQ."""
    gl = data.get("gl_account", "4100")
    cat = data.get("category", "food")[:3].upper()
    return f"{gl}-{cat}-{_uid()[:4].upper()}"


# ══════════════════════════════════════
#  CHIT PRINTER MANAGEMENT
# ══════════════════════════════════════

@router.get("/printers")
async def list_printers():
    """List all chit printers."""
    printers = list(db["pos_chit_printers"].find({}, {"_id": 0}))
    return {"printers": printers, "total": len(printers)}


@router.post("/printers")
async def create_printer(body: dict = {}):
    """Create or update a chit printer."""
    printer_id = body.get("id", f"prn-{_uid()}")
    doc = {
        "id": printer_id,
        "name": body.get("name", ""),
        "type": body.get("type", "kitchen_hot"),
        "location": body.get("location", ""),
        "routes_to": body.get("routes_to", ""),
        "ip_address": body.get("ip_address", ""),
        "active": body.get("active", True),
        "created_at": _now(),
    }
    db["pos_chit_printers"].update_one({"id": printer_id}, {"$set": doc}, upsert=True)
    return doc


@router.put("/items/{item_id}/printer")
async def set_item_printer(item_id: str, body: dict = {}):
    """Set chit printer for a POS menu item. Supports per-outlet overrides.

    body: { "printer": "bar", "outlet": "pool_bar" }
    If outlet is provided, sets an override for that outlet only.
    If no outlet, sets the default printer for the item.
    """
    printer = body.get("printer", "")
    outlet = body.get("outlet", "")

    if outlet:
        # Per-outlet override
        result = db["pos_menu_items"].update_one(
            {"item_id": item_id},
            {"$set": {f"printer_overrides.{outlet}": printer, "updated_at": _now()}}
        )
    else:
        result = db["pos_menu_items"].update_one(
            {"item_id": item_id},
            {"$set": {"chit_printer": printer, "updated_at": _now()}}
        )

    if result.matched_count == 0:
        raise HTTPException(404, "POS item not found")
    return {"item_id": item_id, "printer": printer, "outlet": outlet or "default"}


@router.put("/items/bulk-printer")
async def bulk_set_printer(body: dict = {}):
    """Bulk-assign chit printer to items by category or type.

    body: { "filter": {"category": "cocktail"}, "printer": "bar", "outlet": "pool_bar" }
    """
    filter_q = body.get("filter", {})
    printer = body.get("printer", "")
    outlet = body.get("outlet", "")

    if not printer:
        raise HTTPException(400, "printer is required")

    q = {"active": True}
    if filter_q.get("category"):
        q["category"] = filter_q["category"]
    if filter_q.get("item_type"):
        q["item_type"] = filter_q["item_type"]
    if filter_q.get("is_global"):
        q["is_global"] = True

    if outlet:
        update = {"$set": {f"printer_overrides.{outlet}": printer, "updated_at": _now()}}
    else:
        update = {"$set": {"chit_printer": printer, "updated_at": _now()}}

    result = db["pos_menu_items"].update_many(q, update)
    return {"matched": result.matched_count, "modified": result.modified_count, "printer": printer, "outlet": outlet or "default"}


# ══════════════════════════════════════
#  REVENUE CENTERS
# ══════════════════════════════════════

@router.get("/revenue-centers")
async def list_revenue_centers():
    """List all revenue centers."""
    centers = list(db["pos_revenue_centers"].find({}, {"_id": 0}))
    return {"revenue_centers": centers, "total": len(centers)}


@router.post("/revenue-centers")
async def create_revenue_center(body: dict = {}):
    """Create a revenue center."""
    rc_id = f"rc-{_uid()}"
    doc = {
        "id": rc_id,
        "code": body.get("code", ""),
        "name": body.get("name", ""),
        "type": body.get("type", "outlet"),
        "active": True,
        "created_at": _now(),
    }
    db["pos_revenue_centers"].insert_one(doc)
    doc.pop("_id", None)
    return doc


# ══════════════════════════════════════
#  POS MENU ITEM CRUD & QUERIES
# ══════════════════════════════════════

@router.get("/items")
async def list_pos_items(
    category: Optional[str] = None,
    item_type: Optional[str] = None,
    source: Optional[str] = None,
    is_global: Optional[bool] = None,
    outlet: Optional[str] = None,
    revenue_center: Optional[str] = None,
    printer: Optional[str] = None,
    active_only: bool = True,
    limit: int = 200,
):
    """List POS menu items with filtering. Resolves per-outlet printer assignments."""
    q: dict = {}
    if active_only:
        q["active"] = True
    if category:
        q["category"] = category
    if item_type:
        q["item_type"] = item_type
    if source:
        q["source"] = source
    if is_global is not None:
        q["is_global"] = is_global
    if revenue_center:
        q["revenue_center"] = revenue_center
    if printer:
        q["chit_printer"] = printer
    if outlet:
        q["$or"] = [{"outlets": "all"}, {"outlets": outlet}]

    items = list(db["pos_menu_items"].find(q, {"_id": 0}).sort("name", 1).limit(limit))

    # Resolve effective printer per outlet
    if outlet:
        for item in items:
            overrides = item.get("printer_overrides", {})
            item["effective_printer"] = overrides.get(outlet, item.get("chit_printer", ""))

    return {"items": items, "total": len(items)}


@router.get("/items/{item_id}")
async def get_pos_item(item_id: str):
    """Get a single POS menu item."""
    item = db["pos_menu_items"].find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "POS item not found")
    return item


@router.post("/items")
async def create_pos_item(body: dict = {}):
    """Manually create a POS menu item (for items not from banquet/mixology catalogs)."""
    item_type = body.get("item_type", "food")
    gl_key = _gl_key_for_type(item_type)

    item_id = f"pmi-{_uid()}"
    doc = {
        "item_id": item_id,
        "name": body.get("name", ""),
        "display_name": body.get("display_name", body.get("name", "")),
        "source": body.get("source", "manual"),
        "source_id": body.get("source_id", f"manual|{item_id}"),
        "category": body.get("category", ""),
        "subcategory": body.get("subcategory", ""),
        "item_type": item_type,
        "gl_account": GL_ACCOUNTS.get(gl_key, GL_ACCOUNTS["food"])["code"],
        "gl_name": GL_ACCOUNTS.get(gl_key, GL_ACCOUNTS["food"])["name"],
        "price": body.get("price", 0),
        "price_label": body.get("price_label", ""),
        "price_type": body.get("price_type", "per_item"),
        "tax_class": body.get("tax_class", "food"),
        "revenue_center": body.get("revenue_center", "ALL"),
        "chit_printer": body.get("chit_printer", _default_printer(item_type)),
        "is_global": body.get("is_global", False),
        "outlets": body.get("outlets", ["all"]),
        "pos_item_code": f"{GL_ACCOUNTS.get(gl_key, GL_ACCOUNTS['food'])['code']}-MAN-{_uid()[:4].upper()}",
        "modifier_groups": body.get("modifier_groups", []),
        "printer_overrides": body.get("printer_overrides", {}),
        "active": True,
        "auto_routed": False,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["pos_menu_items"].insert_one({**doc, "_id": item_id})
    return doc


@router.put("/items/{item_id}")
async def update_pos_item(item_id: str, body: dict = {}):
    """Update a POS menu item (price, printer, outlet assignment, etc.)."""
    allowed = {"name", "display_name", "price", "price_label", "price_type", "tax_class",
               "revenue_center", "chit_printer", "is_global", "outlets", "modifier_groups",
               "printer_overrides", "active", "gl_account", "gl_name", "item_type", "category"}
    updates = {k: v for k, v in body.items() if k in allowed}
    updates["updated_at"] = _now()

    result = db["pos_menu_items"].update_one({"item_id": item_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "POS item not found")
    return {"item_id": item_id, "updated": list(updates.keys())}


# ══════════════════════════════════════
#  GLOBAL BEVERAGES (shared across outlets)
# ══════════════════════════════════════

@router.get("/global-beverages")
async def list_global_beverages(outlet: Optional[str] = None):
    """List all global beverage items — cocktails, wine, beer shared across all outlets with bars.
    Resolves effective chit printer per outlet."""
    q = {"is_global": True, "active": True}
    items = list(db["pos_menu_items"].find(q, {"_id": 0}).sort("name", 1))

    if outlet:
        for item in items:
            overrides = item.get("printer_overrides", {})
            item["effective_printer"] = overrides.get(outlet, item.get("chit_printer", "bar"))

    by_type = {}
    for item in items:
        t = item.get("category", "other")
        by_type.setdefault(t, []).append(item)

    return {
        "items": items,
        "total": len(items),
        "by_category": {k: len(v) for k, v in by_type.items()},
        "outlet": outlet,
    }


@router.get("/wine-list")
async def get_wine_list():
    """Get the wine list — all wine items routed through POS."""
    wines = list(db["pos_menu_items"].find(
        {"item_type": "wine", "active": True}, {"_id": 0}
    ).sort("name", 1))
    return {"wines": wines, "total": len(wines)}


# ══════════════════════════════════════
#  BEO → POS CHECK GENERATION
# ══════════════════════════════════════

@router.post("/beo/{beo_id}/generate-check")
async def generate_beo_pos_check(beo_id: str):
    """When a BEO is finalized, auto-generate a POS check/tab with all menu items properly routed."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    gc = beo.get("guaranteed_count", 0)
    check_id = f"chk-{_uid()}"
    line_items = []
    total = 0

    # Match BEO menu items to POS items
    for section in beo.get("menu_sections", []):
        for item in section.get("items", []):
            item_name = item.get("name", "")
            pos_item = db["pos_menu_items"].find_one(
                {"name": {"$regex": f"^{item_name}$", "$options": "i"}, "active": True},
                {"_id": 0}
            )
            if pos_item:
                price = pos_item.get("price", 0)
                line_total = price * gc if pos_item.get("price_type") == "per_person" else price
                line_items.append({
                    "pos_item_id": pos_item["item_id"],
                    "name": pos_item["name"],
                    "gl_account": pos_item["gl_account"],
                    "chit_printer": pos_item["chit_printer"],
                    "price": price,
                    "quantity": gc if pos_item.get("price_type") == "per_person" else 1,
                    "line_total": round(line_total, 2),
                    "revenue_center": pos_item.get("revenue_center", "BNQ"),
                })
                total += line_total

    service_charge = round(total * (beo.get("service_charge_pct", 26) / 100), 2)
    tax = round((total + service_charge) * (beo.get("tax_pct", 7) / 100), 2)

    check = {
        "check_id": check_id,
        "beo_id": beo_id,
        "beo_number": beo.get("beo_number"),
        "event_name": beo.get("event_name", ""),
        "guest_count": gc,
        "line_items": line_items,
        "subtotal": round(total, 2),
        "service_charge": service_charge,
        "tax": tax,
        "grand_total": round(total + service_charge + tax, 2),
        "status": "open",
        "created_at": _now(),
    }
    db["pos_checks"].insert_one({**check, "_id": check_id})
    return check


# ══════════════════════════════════════
#  DASHBOARD / STATS
# ══════════════════════════════════════

@router.get("/dashboard")
async def pos_router_dashboard():
    """Dashboard stats for POS routing."""
    total = db["pos_menu_items"].count_documents({"active": True})
    global_bev = db["pos_menu_items"].count_documents({"is_global": True, "active": True})
    by_source = {}
    for src in ["banquet_catalog", "mixology_rd", "manual", "wine_list", "outlet_menu"]:
        by_source[src] = db["pos_menu_items"].count_documents({"source": src, "active": True})

    by_gl = {}
    for gl_code in ["4100", "4200", "4300", "4400"]:
        by_gl[gl_code] = db["pos_menu_items"].count_documents({"gl_account": gl_code, "active": True})

    by_printer = {}
    for p in ["kitchen_hot", "kitchen_cold", "pastry", "bar", "service_bar", "expo"]:
        by_printer[p] = db["pos_menu_items"].count_documents({"chit_printer": p, "active": True})

    printers = db["pos_chit_printers"].count_documents({"active": True})
    rev_centers = db["pos_revenue_centers"].count_documents({"active": True})
    checks = db["pos_checks"].count_documents({})

    return {
        "total_pos_items": total,
        "global_beverages": global_bev,
        "by_source": by_source,
        "by_gl_account": by_gl,
        "by_chit_printer": by_printer,
        "chit_printers": printers,
        "revenue_centers": rev_centers,
        "pos_checks_generated": checks,
    }


# ══════════════════════════════════════
#  SUPPLIER SHORTAGE AUTO-FLAG
# ══════════════════════════════════════

@router.get("/supplier-alerts")
async def supplier_shortage_alerts():
    """Auto-flag when ingredient stock drops below par for active recipes.
    Compares inventory par levels against active recipe ingredient needs."""
    from routes.mixology_rd import RECIPE_DB, INGREDIENTS

    # Build ingredient demand from active recipes
    demand = {}
    for recipe in RECIPE_DB:
        for ing_id, qty, unit in recipe["ingredients"]:
            demand.setdefault(ing_id, {"name": INGREDIENTS.get(ing_id, {}).get("name", ing_id),
                                       "total_demand_oz": 0, "recipes_using": []})
            if unit == "oz":
                demand[ing_id]["total_demand_oz"] += qty
            demand[ing_id]["recipes_using"].append(recipe["name"])

    # Check against inventory (if available)
    alerts = []
    for ing_id, info in demand.items():
        inv = db["inventory_items"].find_one(
            {"name": {"$regex": ing_id.replace("_", " "), "$options": "i"}},
            {"_id": 0, "on_hand": 1, "par_level": 1, "name": 1}
        )
        spec = INGREDIENTS.get(ing_id, {})
        par_level = inv.get("par_level", 0) if inv else 0
        on_hand = inv.get("on_hand", 0) if inv else 0

        # Flag if no inventory tracked or below par
        if not inv or on_hand < par_level:
            severity = "critical" if on_hand == 0 else "warning" if on_hand < par_level * 0.5 else "low"
            alerts.append({
                "ingredient_id": ing_id,
                "ingredient_name": info["name"],
                "on_hand": on_hand,
                "par_level": par_level,
                "deficit": max(0, par_level - on_hand),
                "recipes_affected": len(set(info["recipes_using"])),
                "recipe_names": list(set(info["recipes_using"]))[:5],
                "severity": severity,
                "cost_per_oz": spec.get("cost_per_oz", 0),
                "estimated_reorder_cost": round(max(0, par_level - on_hand) * spec.get("cost_per_oz", 0), 2),
            })

    alerts.sort(key=lambda x: {"critical": 0, "warning": 1, "low": 2}[x["severity"]])
    return {
        "alerts": alerts,
        "total_alerts": len(alerts),
        "critical": len([a for a in alerts if a["severity"] == "critical"]),
        "warning": len([a for a in alerts if a["severity"] == "warning"]),
        "ingredients_tracked": len(demand),
    }


# ══════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════

def _classify_item(section: str, subsection: str, item_name: str):
    """Classify a menu item into type and GL key based on section context."""
    sec = section.upper()
    sub = subsection.upper()
    name = item_name.upper()

    # Beverage section
    if sec == "BEVERAGE" or "BAR" in sub or "MIXOLOGY" in sub or "WINE" in sub or "BEER" in sub:
        if "NON-ALCOHOLIC" in sub or "ZERO PROOF" in sub or "SOFT" in name:
            return "non_alcoholic", "non_alcoholic_beverage"
        if "WINE" in sub or "WINE" in name:
            return "wine", "wine"
        if "BEER" in sub or "SELTZER" in sub:
            return "beer", "beer"
        return "cocktail", "alcoholic_beverage"

    # Add-ons
    if sec == "ADD-ONS & SERVICES":
        if "AUDIO" in sub or "AV" in sub:
            return "av", "av"
        if "FLORAL" in sub or "DECOR" in sub:
            return "floral", "floral"
        if "SECURITY" in sub:
            return "service", "service"
        if "VALET" in sub or "PARKING" in sub:
            return "valet", "valet"
        return "service", "service"

    # Food sections
    if "DESSERT" in sub or "DESSERT" in name:
        return "dessert", "food"
    if "BAKERY" in sub or "PASTRY" in sub:
        return "bakery", "food"
    if "SALAD" in sub or "COLD" in sub:
        return "appetizer_cold", "food"
    if "CARVING" in sub:
        return "carving", "food"
    if "STATION" in sub:
        return "station", "food"

    return "entree", "food"


def _default_printer(item_type: str) -> str:
    return DEFAULT_PRINTER_MAP.get(item_type, "kitchen_hot")


def _gl_key_for_type(item_type: str) -> str:
    mapping = {
        "food": "food", "entree": "food", "appetizer_hot": "food", "appetizer_cold": "food",
        "salad": "food", "soup": "food", "dessert": "food", "bakery": "food", "side": "food",
        "carving": "food", "station": "food", "coffee_tea": "food",
        "cocktail": "alcoholic_beverage", "spirit": "alcoholic_beverage",
        "wine": "wine", "beer": "beer",
        "non_alcoholic": "non_alcoholic_beverage",
        "av": "av", "rental": "rental", "service": "service", "floral": "floral", "valet": "valet",
    }
    return mapping.get(item_type, "food")


import re as _re

def _parse_price(price_str):
    if not price_str:
        return 0
    nums = _re.findall(r'[\d.]+', str(price_str))
    return float(nums[0]) if nums else 0


def _detect_price_type(price_str):
    if not price_str:
        return "per_item"
    p = str(price_str).lower()
    if "per guest" in p or "per person" in p:
        return "per_person"
    if "per dozen" in p:
        return "per_dozen"
    if "per drink" in p:
        return "per_drink"
    if "per bottle" in p:
        return "per_bottle"
    if "per hour" in p:
        return "per_hour"
    if "each" in p:
        return "per_item"
    return "per_item"
