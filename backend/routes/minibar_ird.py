"""
Minibar & IRD (In-Room Dining) + Guest Ordering Platform
==========================================================
- Minibar inventory per room with auto-charge on removal
- IRD menu with full ordering (food, beverages, amenities)
- Guest-facing ordering platform (sundries, amenities, minibar replenishment)
- Beautiful public ordering endpoint for in-room tablets/mobile
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/ird", tags=["minibar-ird"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

class MinibarUsageInput(BaseModel):
    room_number: str
    item_id: str
    quantity: int = 1

class IRDOrderInput(BaseModel):
    room_number: str
    guest_name: str = ""
    items: List[dict] = []  # [{item_id, name, quantity, price, special_instructions}]
    delivery_time: str = "asap"  # asap, scheduled
    scheduled_time: str = ""
    special_instructions: str = ""
    order_type: str = "food"  # food, beverage, amenity, sundry, minibar_replenish


def seed_ird():
    if db["ird_menu"].count_documents({}) > 0:
        return
    # IRD Menu — food, beverages, amenities, sundries
    menu_items = [
        # Food
        {"name": "Classic Club Sandwich", "category": "food", "subcategory": "sandwiches", "price": 22, "description": "Triple-decker with turkey, bacon, avocado", "available_hours": "11:00-23:00", "prep_time_mins": 20},
        {"name": "Caesar Salad", "category": "food", "subcategory": "salads", "price": 18, "description": "Romaine, parmesan, house-made croutons, anchovy dressing", "available_hours": "11:00-23:00", "prep_time_mins": 12},
        {"name": "8oz Filet Mignon", "category": "food", "subcategory": "entrees", "price": 58, "description": "USDA Prime, truffle butter, roasted vegetables", "available_hours": "17:00-23:00", "prep_time_mins": 30},
        {"name": "Margherita Pizza", "category": "food", "subcategory": "pizza", "price": 20, "description": "San Marzano tomato, fresh mozzarella, basil", "available_hours": "11:00-02:00", "prep_time_mins": 18},
        {"name": "Eggs Benedict", "category": "food", "subcategory": "breakfast", "price": 24, "description": "Poached eggs, Canadian bacon, hollandaise, English muffin", "available_hours": "06:00-11:00", "prep_time_mins": 15},
        {"name": "Continental Breakfast", "category": "food", "subcategory": "breakfast", "price": 28, "description": "Pastries, fresh fruit, yogurt, juice, coffee", "available_hours": "06:00-11:00", "prep_time_mins": 10},
        {"name": "Cheese & Charcuterie Board", "category": "food", "subcategory": "appetizers", "price": 32, "description": "Artisan cheeses, cured meats, crackers, honeycomb", "available_hours": "11:00-02:00", "prep_time_mins": 10},
        {"name": "Kids Chicken Tenders", "category": "food", "subcategory": "kids", "price": 14, "description": "Crispy tenders with fries and dipping sauce", "available_hours": "11:00-22:00", "prep_time_mins": 15},
        # Beverages
        {"name": "Bottle of Sparkling Water", "category": "beverage", "subcategory": "water", "price": 8, "description": "San Pellegrino 750ml", "available_hours": "00:00-23:59", "prep_time_mins": 5},
        {"name": "Fresh Orange Juice", "category": "beverage", "subcategory": "juice", "price": 12, "description": "Freshly squeezed, large", "available_hours": "06:00-14:00", "prep_time_mins": 5},
        {"name": "Cappuccino", "category": "beverage", "subcategory": "coffee", "price": 8, "description": "Double shot espresso with steamed milk", "available_hours": "06:00-22:00", "prep_time_mins": 5},
        {"name": "Bottle of Prosecco", "category": "beverage", "subcategory": "wine", "price": 45, "description": "La Marca DOC", "available_hours": "11:00-02:00", "prep_time_mins": 5},
        # Amenities
        {"name": "Extra Pillows (2)", "category": "amenity", "subcategory": "bedding", "price": 0, "description": "Hypoallergenic pillow set", "available_hours": "00:00-23:59", "prep_time_mins": 10},
        {"name": "Bathrobes (Set of 2)", "category": "amenity", "subcategory": "bath", "price": 0, "description": "Plush cotton robes", "available_hours": "00:00-23:59", "prep_time_mins": 10},
        {"name": "Turndown Service", "category": "amenity", "subcategory": "service", "price": 0, "description": "Evening turndown with chocolate and water", "available_hours": "18:00-22:00", "prep_time_mins": 15},
        {"name": "Iron & Board", "category": "amenity", "subcategory": "convenience", "price": 0, "description": "Full-size iron and ironing board", "available_hours": "00:00-23:59", "prep_time_mins": 10},
        {"name": "Crib Setup", "category": "amenity", "subcategory": "family", "price": 0, "description": "Portable crib with linens", "available_hours": "08:00-22:00", "prep_time_mins": 20},
        # Sundries
        {"name": "Phone Charger (USB-C)", "category": "sundry", "subcategory": "electronics", "price": 15, "description": "Universal USB-C fast charger", "available_hours": "00:00-23:59", "prep_time_mins": 10},
        {"name": "Toothbrush Kit", "category": "sundry", "subcategory": "toiletries", "price": 5, "description": "Toothbrush, toothpaste, mouthwash", "available_hours": "00:00-23:59", "prep_time_mins": 5},
        {"name": "First Aid Kit", "category": "sundry", "subcategory": "health", "price": 0, "description": "Basic first aid supplies", "available_hours": "00:00-23:59", "prep_time_mins": 5},
    ]
    for item in menu_items:
        db["ird_menu"].insert_one({"id": f"ird-{_uid()}", **item, "active": True, "image_url": "", "created_at": _now()})

    # Minibar template
    minibar_items = [
        {"name": "Fiji Water 500ml", "category": "water", "price": 6, "par_level": 4},
        {"name": "Coca-Cola", "category": "soda", "price": 5, "par_level": 2},
        {"name": "Diet Coke", "category": "soda", "price": 5, "par_level": 2},
        {"name": "Red Bull", "category": "energy", "price": 8, "par_level": 2},
        {"name": "Budweiser", "category": "beer", "price": 9, "par_level": 2},
        {"name": "Heineken", "category": "beer", "price": 10, "par_level": 2},
        {"name": "Cabernet Sauvignon (187ml)", "category": "wine", "price": 18, "par_level": 1},
        {"name": "Chardonnay (187ml)", "category": "wine", "price": 16, "par_level": 1},
        {"name": "Jack Daniels (50ml)", "category": "spirits", "price": 15, "par_level": 2},
        {"name": "Grey Goose Vodka (50ml)", "category": "spirits", "price": 16, "par_level": 2},
        {"name": "Mixed Nuts", "category": "snacks", "price": 10, "par_level": 2},
        {"name": "Chocolate Bar (Premium)", "category": "snacks", "price": 8, "par_level": 2},
        {"name": "Pringles", "category": "snacks", "price": 7, "par_level": 2},
        {"name": "Gummy Bears", "category": "snacks", "price": 6, "par_level": 2},
    ]
    for item in minibar_items:
        db["minibar_template"].insert_one({"id": f"mb-{_uid()}", **item, "created_at": _now()})


# ── IRD Menu (Public) ──
@router.get("/menu")
async def get_menu(category: Optional[str] = None):
    seed_ird()
    q = {"active": True}
    if category: q["category"] = category
    items = list(db["ird_menu"].find(q, {"_id": 0}).sort([("category", 1), ("subcategory", 1)]))
    categories = defaultdict(list)
    for item in items:
        categories[item["category"]].append(item)
    return {"menu": dict(categories), "total_items": len(items)}


# ── Guest Ordering (Public — no auth) ──
@router.post("/order")
async def place_order(data: IRDOrderInput):
    seed_ird()
    total = sum(i.get("price", 0) * i.get("quantity", 1) for i in data.items)
    order = {
        "id": f"ord-{_uid()}", **data.model_dump(), "total": round(total, 2),
        "status": "received", "estimated_delivery_mins": max(15, sum(20 for _ in data.items)),
        "created_at": _now(), "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    db["ird_orders"].insert_one(order)
    order.pop("_id", None)
    # Also charge to room via guest_orders
    db["guest_orders"].insert_one({
        "id": f"go-{_uid()}", "room_number": data.room_number, "order_type": data.order_type,
        "items": data.items, "total": round(total, 2), "status": "pending",
        "source": "ird", "created_at": _now(),
    })
    return {**order, "confirmation": f"Order #{order['id']} received. Estimated delivery: {order['estimated_delivery_mins']} minutes."}

@router.get("/orders")
async def list_orders(room_number: Optional[str] = None, status: Optional[str] = None):
    seed_ird()
    q = {}
    if room_number: q["room_number"] = room_number
    if status: q["status"] = status
    return {"orders": list(db["ird_orders"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))}

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...)):
    db["ird_orders"].update_one({"id": order_id}, {"$set": {"status": status, "updated_at": _now()}})
    return {"updated": order_id, "status": status}


# ── Minibar ──
@router.get("/minibar/template")
async def minibar_template():
    seed_ird()
    return {"items": list(db["minibar_template"].find({}, {"_id": 0}))}

@router.get("/minibar/{room_number}")
async def room_minibar(room_number: str):
    seed_ird()
    inventory = list(db["minibar_inventory"].find({"room_number": room_number}, {"_id": 0}))
    if not inventory:
        # Initialize from template
        template = list(db["minibar_template"].find({}, {"_id": 0}))
        for item in template:
            doc = {"id": f"mbi-{_uid()}", "room_number": room_number, "item_id": item["id"], "name": item["name"], "category": item["category"], "price": item["price"], "par_level": item["par_level"], "current_qty": item["par_level"], "created_at": _now()}
            db["minibar_inventory"].insert_one(doc)
        inventory = list(db["minibar_inventory"].find({"room_number": room_number}, {"_id": 0}))
    charges = list(db["minibar_charges"].find({"room_number": room_number}, {"_id": 0}).sort("created_at", -1))
    total_charges = sum(c.get("total", 0) for c in charges)
    return {"room_number": room_number, "inventory": inventory, "charges": charges, "total_charges": round(total_charges, 2)}

@router.post("/minibar/consume")
async def minibar_consume(data: MinibarUsageInput):
    """Auto-charge when item removed from minibar (sensor integration ready)."""
    seed_ird()
    inv = db["minibar_inventory"].find_one({"room_number": data.room_number, "item_id": data.item_id}, {"_id": 0})
    if not inv:
        template_item = db["minibar_template"].find_one({"id": data.item_id}, {"_id": 0})
        if not template_item:
            raise HTTPException(404, "Item not found")
        inv = {"name": template_item["name"], "price": template_item["price"], "current_qty": template_item["par_level"]}

    charge = {
        "id": f"mbc-{_uid()}", "room_number": data.room_number, "item_id": data.item_id,
        "item_name": inv["name"], "quantity": data.quantity,
        "unit_price": inv["price"], "total": round(inv["price"] * data.quantity, 2),
        "auto_detected": True, "created_at": _now(),
    }
    db["minibar_charges"].insert_one(charge)
    db["minibar_inventory"].update_one(
        {"room_number": data.room_number, "item_id": data.item_id},
        {"$inc": {"current_qty": -data.quantity}}
    )
    charge.pop("_id", None)
    return charge

@router.post("/minibar/{room_number}/replenish")
async def replenish_minibar(room_number: str):
    """Reset minibar to par levels (typically done by housekeeping)."""
    template = list(db["minibar_template"].find({}, {"_id": 0}))
    for item in template:
        db["minibar_inventory"].update_one(
            {"room_number": room_number, "item_id": item["id"]},
            {"$set": {"current_qty": item["par_level"], "updated_at": _now()}},
            upsert=True,
        )
    return {"replenished": room_number, "items": len(template)}


# ── Dashboard ──
@router.get("/dashboard")
async def ird_dashboard():
    seed_ird()
    orders = list(db["ird_orders"].find({}, {"_id": 0}))
    charges = list(db["minibar_charges"].find({}, {"_id": 0}))
    menu = list(db["ird_menu"].find({"active": True}, {"_id": 0}))

    active_orders = len([o for o in orders if o.get("status") in ("received", "preparing", "delivering")])
    total_revenue = sum(o.get("total", 0) for o in orders)
    minibar_revenue = sum(c.get("total", 0) for c in charges)

    return {
        "kpis": {
            "active_orders": active_orders, "total_orders": len(orders),
            "ird_revenue": round(total_revenue, 2), "minibar_revenue": round(minibar_revenue, 2),
            "total_revenue": round(total_revenue + minibar_revenue, 2),
            "menu_items": len(menu), "minibar_charges": len(charges),
        },
        "recent_orders": sorted(orders, key=lambda o: o.get("created_at", ""), reverse=True)[:10],
        "recent_charges": sorted(charges, key=lambda c: c.get("created_at", ""), reverse=True)[:10],
    }
