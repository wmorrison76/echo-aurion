"""
LUCCCA Enterprise – Ordering Module Routes
============================================
Vendor ordering, on-hand inventory tracking, and invoice-to-inventory pipeline.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db

router = APIRouter(prefix="/api/ordering", tags=["ordering"])

# Collections
vendor_orders_col = db["vendor_orders"]
vendors_col = db["vendors"]
invoices_col = db["invoices"]
ingredients_col = db["ingredients"]
inventory_transactions_col = db["inventory_transactions"]

def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid.uuid4())

# ---------------------------------------------------------------------------
# SEED: Default vendors and on-hand inventory
# ---------------------------------------------------------------------------
def seed_vendors():
    if vendors_col.count_documents({}) > 0:
        return
    default_vendors = [
        {"id": _uid(), "name": "Sysco Foods", "code": "SYSCO", "category": "Broadline",
         "contact_email": "orders@sysco.com", "contact_phone": "(800) 555-0100",
         "delivery_days": ["Monday", "Wednesday", "Friday"], "min_order": 150.00,
         "payment_terms": "Net 30", "status": "active", "rating": 4.8, "created_at": _now()},
        {"id": _uid(), "name": "US Foods", "code": "USFOODS", "category": "Broadline",
         "contact_email": "orders@usfoods.com", "contact_phone": "(800) 555-0200",
         "delivery_days": ["Tuesday", "Thursday", "Saturday"], "min_order": 200.00,
         "payment_terms": "Net 30", "status": "active", "rating": 4.6, "created_at": _now()},
        {"id": _uid(), "name": "Performance Foodservice", "code": "PFS", "category": "Broadline",
         "contact_email": "orders@pfgc.com", "contact_phone": "(800) 555-0300",
         "delivery_days": ["Monday", "Thursday"], "min_order": 100.00,
         "payment_terms": "Net 15", "status": "active", "rating": 4.5, "created_at": _now()},
        {"id": _uid(), "name": "Restaurant Depot", "code": "RDEPOT", "category": "Cash & Carry",
         "contact_email": "info@restaurantdepot.com", "contact_phone": "(800) 555-0400",
         "delivery_days": [], "min_order": 0,
         "payment_terms": "COD", "status": "active", "rating": 4.3, "created_at": _now()},
        {"id": _uid(), "name": "Local Farms Direct", "code": "LFD", "category": "Specialty",
         "contact_email": "farm@localfarms.com", "contact_phone": "(800) 555-0500",
         "delivery_days": ["Tuesday", "Friday"], "min_order": 75.00,
         "payment_terms": "Net 7", "status": "active", "rating": 4.9, "created_at": _now()},
    ]
    vendors_col.insert_many(default_vendors)

    # Seed menu items for PurchRec ordering
    menu_col = db["menu_items"]
    if menu_col.count_documents({}) == 0:
        menu_items = [
            {"id": f"menu-{_uid()}", "name": "Herb-Crusted Prime Rib", "category": "Entree", "price": 54.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "Pan-Seared Salmon", "category": "Entree", "price": 38.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "Vegan Wellington", "category": "Entree", "price": 32.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "Caesar Salad", "category": "Appetizer", "price": 16.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "French Onion Soup", "category": "Appetizer", "price": 14.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "Chocolate Lava Cake", "category": "Dessert", "price": 18.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "Crème Brûlée", "category": "Dessert", "price": 16.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "Continental Breakfast Platter", "category": "Breakfast", "price": 24.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "Working Lunch Platter", "category": "Banquet", "price": 45.00, "recipe_id": None, "is_active": True},
            {"id": f"menu-{_uid()}", "name": "5-Course Tasting Menu", "category": "Special", "price": 125.00, "recipe_id": None, "is_active": True},
        ]
        menu_col.insert_many(menu_items)


# ========================== VENDORS =========================================

@router.get("/vendors")
def get_vendors(status: Optional[str] = None):
    q = {"status": status} if status else {}
    vendors = list(vendors_col.find(q, {"_id": 0}).sort("name", 1))
    return {"vendors": vendors, "total": len(vendors)}


@router.get("/vendors/{vendor_id}")
def get_vendor(vendor_id: str):
    v = vendors_col.find_one({"id": vendor_id}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Vendor not found")
    return v


# ========================== VENDOR ORDERS (PURCHASE ORDERS) =================

class VendorOrderItem(BaseModel):
    ingredient_id: Optional[str] = None
    name: str
    quantity: float
    unit: str = "ea"
    unit_price: float = 0
    notes: Optional[str] = None


class CreateVendorOrder(BaseModel):
    vendor_id: str
    outlet_id: str = "main"
    items: list[VendorOrderItem]
    delivery_date: Optional[str] = None
    notes: Optional[str] = None
    urgent: bool = False


@router.post("/vendor-orders")
def create_vendor_order(data: CreateVendorOrder):
    vendor = vendors_col.find_one({"id": data.vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    order_id = _uid()
    items = []
    subtotal = 0
    for item in data.items:
        line_total = round(item.quantity * item.unit_price, 2)
        subtotal += line_total
        items.append({
            "id": _uid(),
            "ingredient_id": item.ingredient_id,
            "name": item.name,
            "quantity": item.quantity,
            "unit": item.unit,
            "unit_price": item.unit_price,
            "line_total": line_total,
            "notes": item.notes,
            "received_qty": 0,
            "status": "pending",
        })

    order = {
        "id": order_id,
        "po_number": f"PO-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{order_id[:6].upper()}",
        "vendor_id": data.vendor_id,
        "vendor_name": vendor["name"],
        "outlet_id": data.outlet_id,
        "items": items,
        "subtotal": round(subtotal, 2),
        "tax": round(subtotal * 0.085, 2),
        "total": round(subtotal * 1.085, 2),
        "status": "draft",
        "urgent": data.urgent,
        "delivery_date": data.delivery_date,
        "notes": data.notes,
        "created_at": _now(),
        "updated_at": _now(),
    }
    vendor_orders_col.insert_one(order)
    del order["_id"]
    return order


@router.get("/vendor-orders")
def get_vendor_orders(status: Optional[str] = None, vendor_id: Optional[str] = None, limit: int = 50):
    q = {}
    if status:
        q["status"] = status
    if vendor_id:
        q["vendor_id"] = vendor_id
    orders = list(vendor_orders_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"orders": orders, "total": len(orders)}


@router.get("/vendor-orders/{order_id}")
def get_vendor_order(order_id: str):
    order = vendor_orders_col.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    return order


class UpdateVendorOrderStatus(BaseModel):
    status: str = Field(..., pattern="^(draft|submitted|confirmed|shipped|delivered|cancelled)$")


@router.put("/vendor-orders/{order_id}/status")
def update_vendor_order_status(order_id: str, data: UpdateVendorOrderStatus):
    order = vendor_orders_col.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")

    vendor_orders_col.update_one(
        {"id": order_id},
        {"$set": {"status": data.status, "updated_at": _now()}}
    )

    # On delivery, add items to inventory
    if data.status == "delivered":
        for item in order.get("items", []):
            if item.get("ingredient_id"):
                txn = {
                    "id": _uid(),
                    "ingredient_id": item["ingredient_id"],
                    "ingredient_name": item["name"],
                    "type": "receiving",
                    "quantity": item["quantity"],
                    "unit": item["unit"],
                    "unit_cost": item["unit_price"],
                    "total_cost": item["line_total"],
                    "outlet_id": order.get("outlet_id", "main"),
                    "vendor": order.get("vendor_name", ""),
                    "po_id": order_id,
                    "timestamp": _now(),
                }
                inventory_transactions_col.insert_one(txn)
                ingredients_col.update_one(
                    {"id": item["ingredient_id"]},
                    {"$inc": {"current_stock": item["quantity"]},
                     "$set": {"last_received": _now(), "last_vendor": order.get("vendor_name", "")}}
                )

    return {"success": True, "order_id": order_id, "status": data.status}


# ========================== ON-HAND INVENTORY ===============================

@router.get("/on-hand")
def get_on_hand_inventory(outlet_id: Optional[str] = None, low_stock_only: bool = False):
    """Get current on-hand inventory with stock levels."""
    ingredients = list(ingredients_col.find({}, {"_id": 0}))
    result = []
    total_value = 0
    low_stock_count = 0

    for ing in ingredients:
        stock = ing.get("current_stock", 0)
        par = ing.get("par_level", 0)
        unit_cost = ing.get("unit_cost", 0)
        on_hand_value = round(stock * unit_cost, 2)
        total_value += on_hand_value
        is_low = stock < par if par > 0 else False
        if is_low:
            low_stock_count += 1

        if low_stock_only and not is_low:
            continue

        result.append({
            "id": ing["id"],
            "name": ing["name"],
            "category": ing.get("category", ""),
            "current_stock": stock,
            "par_level": par,
            "unit": ing.get("unit", "ea"),
            "unit_cost": unit_cost,
            "on_hand_value": on_hand_value,
            "is_low_stock": is_low,
            "stock_pct": round(stock / max(par, 0.01) * 100, 1) if par > 0 else 100,
            "last_received": ing.get("last_received"),
            "last_vendor": ing.get("last_vendor"),
            "supplier": ing.get("supplier", ""),
        })

    # Sort by name
    result.sort(key=lambda x: x["name"])

    return {
        "items": result,
        "total_items": len(result),
        "total_value": round(total_value, 2),
        "low_stock_count": low_stock_count,
        "timestamp": _now(),
    }


@router.get("/on-hand/{ingredient_id}/history")
def get_inventory_history(ingredient_id: str, limit: int = 20):
    """Get transaction history for an ingredient."""
    transactions = list(
        inventory_transactions_col.find(
            {"ingredient_id": ingredient_id}, {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
    )
    ingredient = ingredients_col.find_one({"id": ingredient_id}, {"_id": 0})
    return {
        "ingredient": ingredient,
        "transactions": transactions,
        "total": len(transactions),
    }


# ========================== INGREDIENT SEARCH (FUZZY) =======================

@router.get("/search-ingredients")
def search_ingredients(q: str = "", limit: int = 10):
    """Fuzzy search ingredients by name for autocomplete."""
    import re as _re
    if not q.strip():
        # Return all ingredients when no query
        items = list(ingredients_col.find({}, {"_id": 0}).sort("name", 1).limit(limit))
        return {"results": items, "query": q}

    escaped = _re.escape(q)
    # Case-insensitive partial match
    items = list(ingredients_col.find(
        {"name": {"$regex": escaped, "$options": "i"}},
        {"_id": 0}
    ).sort("name", 1).limit(limit))
    return {"results": items, "query": q}


# ========================== MENU FOR ORDERING ===============================

@router.get("/menu")
def get_ordering_menu(category: Optional[str] = None):
    """Get menu items available for ordering."""
    from database import db as _db
    menu_col = _db["menu_items"]
    q = {}
    if category:
        q["category"] = category
    items = list(menu_col.find(q, {"_id": 0}))
    categories = menu_col.distinct("category")
    return {"items": items, "categories": categories, "total": len(items)}


# ========================== INVOICE → INVENTORY PIPELINE ====================

class InvoiceItem(BaseModel):
    name: str
    quantity: float
    unit: str = "ea"
    unit_price: float = 0
    total: float = 0


class InvoiceToInventory(BaseModel):
    invoice_id: Optional[str] = None
    vendor: str = "Unknown"
    outlet_id: str = "main"
    items: list[InvoiceItem]
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None


@router.post("/invoice-to-inventory")
def invoice_to_inventory(data: InvoiceToInventory):
    """
    Process a scanned invoice: match items to inventory ingredients,
    create inventory transactions, and update stock levels.
    """
    import re as _re
    results = []
    matched = 0
    unmatched = 0
    total_value = 0

    inv_id = data.invoice_id or _uid()

    # Save invoice record
    invoice_record = {
        "id": inv_id,
        "vendor": data.vendor,
        "outlet_id": data.outlet_id,
        "invoice_number": data.invoice_number,
        "invoice_date": data.invoice_date,
        "items_count": len(data.items),
        "status": "processed",
        "processed_at": _now(),
        "created_at": _now(),
    }
    invoices_col.update_one({"id": inv_id}, {"$set": invoice_record}, upsert=True)

    for item in data.items:
        # Fuzzy match against ingredients
        escaped_name = _re.escape(item.name)
        ingredient = ingredients_col.find_one(
            {"name": {"$regex": f"^{escaped_name}$", "$options": "i"}},
            {"_id": 0}
        )
        if not ingredient:
            ingredient = ingredients_col.find_one(
                {"name": {"$regex": escaped_name, "$options": "i"}},
                {"_id": 0}
            )

        line_total = item.total or round(item.quantity * item.unit_price, 2)
        total_value += line_total

        if ingredient:
            matched += 1
            txn = {
                "id": _uid(),
                "ingredient_id": ingredient["id"],
                "ingredient_name": ingredient["name"],
                "type": "receiving",
                "quantity": item.quantity,
                "unit": item.unit,
                "unit_cost": item.unit_price,
                "total_cost": line_total,
                "outlet_id": data.outlet_id,
                "vendor": data.vendor,
                "invoice_id": inv_id,
                "timestamp": _now(),
            }
            inventory_transactions_col.insert_one(txn)
            del txn["_id"]

            ingredients_col.update_one(
                {"id": ingredient["id"]},
                {"$inc": {"current_stock": item.quantity},
                 "$set": {"last_received": _now(), "last_vendor": data.vendor}}
            )

            results.append({
                "item_name": item.name,
                "matched_ingredient": ingredient["name"],
                "quantity": item.quantity,
                "status": "matched",
                "transaction_id": txn["id"],
            })
        else:
            unmatched += 1
            results.append({
                "item_name": item.name,
                "matched_ingredient": None,
                "quantity": item.quantity,
                "status": "unmatched",
                "transaction_id": None,
            })

    return {
        "invoice_id": inv_id,
        "outlet_id": data.outlet_id,
        "vendor": data.vendor,
        "total_items": len(data.items),
        "matched": matched,
        "unmatched": unmatched,
        "total_value": round(total_value, 2),
        "results": results,
    }


# ========================== ORDERING STATS ==================================

@router.get("/stats")
def ordering_stats():
    total_ingredients = ingredients_col.count_documents({})
    ingredients = list(ingredients_col.find({}, {"_id": 0}))
    total_value = sum(i.get("current_stock", 0) * i.get("unit_cost", 0) for i in ingredients)
    low_stock = sum(1 for i in ingredients if i.get("current_stock", 0) < i.get("par_level", 0) and i.get("par_level", 0) > 0)

    open_pos = vendor_orders_col.count_documents({"status": {"$in": ["draft", "submitted", "confirmed", "shipped"]}})
    total_pos = vendor_orders_col.count_documents({})
    total_vendors = vendors_col.count_documents({"status": "active"})

    # PO value
    pipeline = [
        {"$match": {"status": {"$in": ["submitted", "confirmed", "shipped"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    agg = list(vendor_orders_col.aggregate(pipeline))
    pending_po_value = agg[0]["total"] if agg else 0

    return {
        "inventory": {
            "total_items": total_ingredients,
            "total_value": round(total_value, 2),
            "low_stock": low_stock,
        },
        "purchasing": {
            "open_orders": open_pos,
            "total_orders": total_pos,
            "pending_value": round(pending_po_value, 2),
            "active_vendors": total_vendors,
        },
        "timestamp": _now(),
    }


# ========================== OUTLET-BASED ORDERING ===========================

@router.get("/outlets")
def get_ordering_outlets():
    """Get outlets that can place orders (each outlet orders independently)."""
    from database import db as _db
    outlets = list(_db["calendar_outlets"].find({}, {"_id": 0}))
    if not outlets:
        # Fallback default outlets
        outlets = [
            {"id": "main-kitchen", "name": "Main Kitchen", "outlet_type": "kitchen"},
            {"id": "sky-bar", "name": "Sky Bar", "outlet_type": "bar"},
            {"id": "main-dining", "name": "Main Dining", "outlet_type": "restaurant"},
        ]
    return {"outlets": outlets, "total": len(outlets)}


@router.get("/outlet-orders/{outlet_id}")
def get_outlet_orders(outlet_id: str, status: Optional[str] = None, limit: int = 50):
    """Get orders placed by a specific outlet."""
    q = {"outlet_id": outlet_id}
    if status:
        q["status"] = status
    orders = list(vendor_orders_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"orders": orders, "outlet_id": outlet_id, "total": len(orders)}


# ========================== INVOICES HISTORY ================================

@router.get("/invoices")
def list_invoices(outlet_id: Optional[str] = None, vendor: Optional[str] = None, limit: int = 50):
    """List processed invoices."""
    q = {}
    if outlet_id:
        q["outlet_id"] = outlet_id
    if vendor:
        import re as _re
        q["vendor"] = {"$regex": _re.escape(vendor), "$options": "i"}
    invoices = list(invoices_col.find(q, {"_id": 0}).sort("processed_at", -1).limit(limit))
    return {"invoices": invoices, "total": len(invoices)}


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: str):
    inv = invoices_col.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    txns = list(inventory_transactions_col.find(
        {"invoice_id": invoice_id}, {"_id": 0}
    ).sort("timestamp", -1))
    inv["transactions"] = txns
    return inv


# ========================== CALENDAR-DRIVEN PURCHASING ======================

@router.get("/calendar-demand")
def get_calendar_demand(days_ahead: int = 7):
    """
    AI³ Demand Signal: Analyze upcoming calendar events to predict
    purchasing needs. Cross-references menu_items from events with
    recipe ingredients to suggest purchase orders.
    """
    from datetime import timedelta
    from database import db as _db

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    end = (datetime.now(timezone.utc) + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    # Get all upcoming events with menu items
    events = list(_db["calendar_events"].find({
        "start": {"$lte": f"{end}T23:59:59Z"},
        "end": {"$gte": f"{today}T00:00:00Z"},
        "menu_items": {"$exists": True, "$ne": []},
    }, {"_id": 0}))

    demand_items = {}
    for ev in events:
        guest_count = ev.get("guest_count", 0) or 10
        for menu_item in ev.get("menu_items", []):
            key = menu_item.lower().strip()
            if key not in demand_items:
                demand_items[key] = {"item": menu_item, "total_covers": 0, "events": []}
            demand_items[key]["total_covers"] += guest_count
            demand_items[key]["events"].append({
                "title": ev.get("title", ""),
                "date": ev.get("start", "")[:10],
                "guest_count": guest_count,
            })

    # Check current stock for known ingredients
    suggestions = []
    for key, demand in demand_items.items():
        import re as _re
        ingredient = ingredients_col.find_one(
            {"name": {"$regex": _re.escape(key), "$options": "i"}},
            {"_id": 0}
        )
        if ingredient:
            current = ingredient.get("current_stock", 0)
            needed = demand["total_covers"] * 0.3  # rough estimate: 0.3 units per cover
            if current < needed:
                suggestions.append({
                    "ingredient": ingredient["name"],
                    "current_stock": current,
                    "estimated_need": round(needed, 1),
                    "shortfall": round(needed - current, 1),
                    "driven_by": demand["events"],
                    "priority": "high" if (needed - current) > current else "medium",
                })

    return {
        "period": {"from": today, "to": end},
        "upcoming_events": len(events),
        "demand_items": list(demand_items.values()),
        "purchase_suggestions": suggestions,
        "total_covers": sum(d["total_covers"] for d in demand_items.values()),
    }
