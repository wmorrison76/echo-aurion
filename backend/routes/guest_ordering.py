"""
Guest Ordering Platform — Public-facing IRD & Amenity Ordering
================================================================
- QR-code launched guest ordering website
- Room number + guest last name authentication
- Time-period-aware menu (overnight, breakfast, all day) with adjustable windows
- Available count tracking: items auto-hide when sold out
- Manager alerts for sold-out items with one-click count reset
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/guest-order", tags=["guest-ordering"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# ── Models ──
class GuestAuthInput(BaseModel):
    room_number: str
    last_name: str

class GuestOrderInput(BaseModel):
    room_number: str
    guest_name: str
    session_token: str
    items: List[dict] = []   # [{item_id, name, quantity, price, special_instructions}]
    special_instructions: str = ""

class MenuPeriodInput(BaseModel):
    period_id: str
    label: str
    start_time: str   # HH:MM format
    end_time: str      # HH:MM format
    active: bool = True

class ItemCountResetInput(BaseModel):
    available_count: int

class MenuItemUpdateInput(BaseModel):
    available_count: Optional[int] = None
    price: Optional[float] = None
    active: Optional[bool] = None
    period: Optional[str] = None


# ── Seed menu periods ──
def seed_periods():
    if db["menu_periods"].count_documents({}) > 0:
        return
    periods = [
        {"period_id": "breakfast", "label": "Breakfast", "start_time": "05:30", "end_time": "11:00", "sort_order": 1, "active": True, "created_at": _now()},
        {"period_id": "all_day", "label": "All Day", "start_time": "11:01", "end_time": "23:00", "sort_order": 2, "active": True, "created_at": _now()},
        {"period_id": "overnight", "label": "Overnight", "start_time": "23:00", "end_time": "05:30", "sort_order": 3, "active": True, "created_at": _now()},
    ]
    for p in periods:
        db["menu_periods"].insert_one(p)


def seed_guest_menu():
    """Seed the guest-facing menu with period assignments and available counts."""
    if db["guest_menu"].count_documents({}) > 0:
        return
    items = [
        # Breakfast items
        {"name": "Eggs Benedict", "category": "food", "subcategory": "eggs", "price": 24, "description": "Poached eggs, Canadian bacon, hollandaise, English muffin", "period": "breakfast", "prep_time_mins": 15, "available_count": None, "ordered_count": 0, "image_emoji": "🍳"},
        {"name": "Continental Breakfast", "category": "food", "subcategory": "breakfast", "price": 28, "description": "Pastries, fresh fruit, yogurt, juice, coffee", "period": "breakfast", "prep_time_mins": 10, "available_count": None, "ordered_count": 0, "image_emoji": "🥐"},
        {"name": "Avocado Toast", "category": "food", "subcategory": "toast", "price": 18, "description": "Sourdough, smashed avocado, poached egg, chili flakes, microgreens", "period": "breakfast", "prep_time_mins": 12, "available_count": None, "ordered_count": 0, "image_emoji": "🥑"},
        {"name": "Belgian Waffle Stack", "category": "food", "subcategory": "breakfast", "price": 22, "description": "Fresh berries, whipped cream, maple syrup, powdered sugar", "period": "breakfast", "prep_time_mins": 15, "available_count": None, "ordered_count": 0, "image_emoji": "🧇"},
        {"name": "Smoked Salmon Bagel", "category": "food", "subcategory": "breakfast", "price": 20, "description": "Cream cheese, capers, red onion, everything bagel", "period": "breakfast", "prep_time_mins": 8, "available_count": None, "ordered_count": 0, "image_emoji": "🥯"},
        {"name": "Fresh Orange Juice", "category": "beverage", "subcategory": "juice", "price": 12, "description": "Freshly squeezed, large", "period": "breakfast", "prep_time_mins": 5, "available_count": None, "ordered_count": 0, "image_emoji": "🍊"},
        {"name": "Cappuccino", "category": "beverage", "subcategory": "coffee", "price": 8, "description": "Double shot espresso with steamed milk", "period": "breakfast", "prep_time_mins": 5, "available_count": None, "ordered_count": 0, "image_emoji": "☕"},
        {"name": "Green Smoothie", "category": "beverage", "subcategory": "smoothie", "price": 14, "description": "Spinach, banana, mango, coconut water", "period": "breakfast", "prep_time_mins": 5, "available_count": None, "ordered_count": 0, "image_emoji": "🥤"},

        # All Day items
        {"name": "Classic Club Sandwich", "category": "food", "subcategory": "sandwiches", "price": 22, "description": "Triple-decker with turkey, bacon, avocado", "period": "all_day", "prep_time_mins": 20, "available_count": None, "ordered_count": 0, "image_emoji": "🥪"},
        {"name": "Caesar Salad", "category": "food", "subcategory": "salads", "price": 18, "description": "Romaine, parmesan, house-made croutons, anchovy dressing", "period": "all_day", "prep_time_mins": 12, "available_count": None, "ordered_count": 0, "image_emoji": "🥗"},
        {"name": "8oz Filet Mignon", "category": "food", "subcategory": "entrees", "price": 58, "description": "USDA Prime, truffle butter, roasted vegetables", "period": "all_day", "prep_time_mins": 30, "available_count": 8, "ordered_count": 0, "image_emoji": "🥩"},
        {"name": "Margherita Pizza", "category": "food", "subcategory": "pizza", "price": 20, "description": "San Marzano tomato, fresh mozzarella, basil", "period": "all_day", "prep_time_mins": 18, "available_count": None, "ordered_count": 0, "image_emoji": "🍕"},
        {"name": "Grilled Salmon", "category": "food", "subcategory": "entrees", "price": 42, "description": "Atlantic salmon, lemon butter, asparagus, rice pilaf", "period": "all_day", "prep_time_mins": 25, "available_count": 12, "ordered_count": 0, "image_emoji": "🐟"},
        {"name": "Cheese & Charcuterie Board", "category": "food", "subcategory": "appetizers", "price": 32, "description": "Artisan cheeses, cured meats, crackers, honeycomb", "period": "all_day", "prep_time_mins": 10, "available_count": None, "ordered_count": 0, "image_emoji": "🧀"},
        {"name": "Truffle Fries", "category": "food", "subcategory": "sides", "price": 16, "description": "Hand-cut fries, truffle oil, parmesan, herbs", "period": "all_day", "prep_time_mins": 12, "available_count": None, "ordered_count": 0, "image_emoji": "🍟"},
        {"name": "Kids Chicken Tenders", "category": "food", "subcategory": "kids", "price": 14, "description": "Crispy tenders with fries and dipping sauce", "period": "all_day", "prep_time_mins": 15, "available_count": None, "ordered_count": 0, "image_emoji": "🍗"},
        {"name": "Bottle of Prosecco", "category": "beverage", "subcategory": "wine", "price": 45, "description": "La Marca DOC", "period": "all_day", "prep_time_mins": 5, "available_count": 6, "ordered_count": 0, "image_emoji": "🍾"},
        {"name": "Craft Beer Selection", "category": "beverage", "subcategory": "beer", "price": 12, "description": "Ask for today's rotating selection", "period": "all_day", "prep_time_mins": 3, "available_count": None, "ordered_count": 0, "image_emoji": "🍺"},
        {"name": "Sparkling Water", "category": "beverage", "subcategory": "water", "price": 8, "description": "San Pellegrino 750ml", "period": "all_day", "prep_time_mins": 3, "available_count": None, "ordered_count": 0, "image_emoji": "💧"},

        # Overnight items
        {"name": "Midnight Burger", "category": "food", "subcategory": "burgers", "price": 24, "description": "Wagyu blend, aged cheddar, caramelized onion, truffle aioli", "period": "overnight", "prep_time_mins": 20, "available_count": None, "ordered_count": 0, "image_emoji": "🍔"},
        {"name": "Loaded Nachos", "category": "food", "subcategory": "snacks", "price": 18, "description": "Tortilla chips, cheese, guacamole, sour cream, jalapenos", "period": "overnight", "prep_time_mins": 12, "available_count": None, "ordered_count": 0, "image_emoji": "🌮"},
        {"name": "Grilled Cheese & Tomato Soup", "category": "food", "subcategory": "comfort", "price": 16, "description": "Three-cheese blend on sourdough with roasted tomato bisque", "period": "overnight", "prep_time_mins": 15, "available_count": None, "ordered_count": 0, "image_emoji": "🧈"},
        {"name": "Chicken Wings (12pc)", "category": "food", "subcategory": "snacks", "price": 20, "description": "Buffalo, BBQ, or garlic parmesan with ranch or blue cheese", "period": "overnight", "prep_time_mins": 18, "available_count": None, "ordered_count": 0, "image_emoji": "🍗"},
        {"name": "Ice Cream Sundae", "category": "food", "subcategory": "desserts", "price": 14, "description": "Three scoops, hot fudge, whipped cream, cherry", "period": "overnight", "prep_time_mins": 5, "available_count": None, "ordered_count": 0, "image_emoji": "🍨"},
        {"name": "Hot Chocolate", "category": "beverage", "subcategory": "hot", "price": 8, "description": "Belgian chocolate, whipped cream, marshmallows", "period": "overnight", "prep_time_mins": 5, "available_count": None, "ordered_count": 0, "image_emoji": "🍫"},

        # Sundries (available all periods)
        {"name": "Phone Charger (USB-C)", "category": "sundry", "subcategory": "electronics", "price": 15, "description": "Universal USB-C fast charger", "period": "all_day", "prep_time_mins": 10, "available_count": 5, "ordered_count": 0, "image_emoji": "🔌"},
        {"name": "Toothbrush Kit", "category": "sundry", "subcategory": "toiletries", "price": 5, "description": "Toothbrush, toothpaste, mouthwash", "period": "all_day", "prep_time_mins": 5, "available_count": None, "ordered_count": 0, "image_emoji": "🪥"},
        {"name": "First Aid Kit", "category": "sundry", "subcategory": "health", "price": 0, "description": "Basic first aid supplies", "period": "all_day", "prep_time_mins": 5, "available_count": None, "ordered_count": 0, "image_emoji": "🩹"},

        # Amenities (complimentary, all periods)
        {"name": "Extra Pillows (2)", "category": "amenity", "subcategory": "bedding", "price": 0, "description": "Hypoallergenic pillow set", "period": "all_day", "prep_time_mins": 10, "available_count": None, "ordered_count": 0, "image_emoji": "🛏️"},
        {"name": "Bathrobes (Set of 2)", "category": "amenity", "subcategory": "bath", "price": 0, "description": "Plush cotton robes", "period": "all_day", "prep_time_mins": 10, "available_count": None, "ordered_count": 0, "image_emoji": "🧖"},
        {"name": "Turndown Service", "category": "amenity", "subcategory": "service", "price": 0, "description": "Evening turndown with chocolate and water", "period": "all_day", "prep_time_mins": 15, "available_count": None, "ordered_count": 0, "image_emoji": "🌙"},
    ]
    for item in items:
        db["guest_menu"].insert_one({"id": f"gm-{_uid()}", **item, "active": True, "created_at": _now()})


def _get_current_period():
    """Determine which menu period is currently active based on server time."""
    now = datetime.now(timezone.utc)
    current_minutes = now.hour * 60 + now.minute
    periods = list(db["menu_periods"].find({"active": True}, {"_id": 0}).sort("sort_order", 1))
    for p in periods:
        start_h, start_m = map(int, p["start_time"].split(":"))
        end_h, end_m = map(int, p["end_time"].split(":"))
        start_mins = start_h * 60 + start_m
        end_mins = end_h * 60 + end_m
        if start_mins > end_mins:
            # Crosses midnight (e.g., 23:00 to 05:30)
            if current_minutes >= start_mins or current_minutes < end_mins:
                return p
        else:
            if start_mins <= current_minutes < end_mins:
                return p
    # Fallback to all_day
    return {"period_id": "all_day", "label": "All Day"}


# ── Guest Authentication ──
@router.post("/auth")
async def guest_auth(data: GuestAuthInput):
    """Authenticate guest by room number + last name. Returns a session token."""
    seed_periods()
    seed_guest_menu()
    # Check housekeeping rooms for occupied rooms
    room = db["hk_rooms"].find_one({"number": data.room_number}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found. Please check your room number.")
    if room.get("status") not in ("occupied", "checkout", "vip_prep", "clean", "inspected", "dirty"):
        raise HTTPException(403, "This room is not currently checked in.")

    # For demo: accept any last name for occupied rooms since we have generic guest names
    # In production: validate against PMS guest folio
    token = f"gt-{_uid()}-{_uid()}"
    db["guest_sessions"].insert_one({
        "token": token, "room_number": data.room_number,
        "guest_name": data.last_name, "created_at": _now(),
        "active": True,
    })
    return {
        "authenticated": True,
        "token": token,
        "room_number": data.room_number,
        "guest_name": data.last_name,
        "message": f"Welcome, {data.last_name}! You're ordering for Room {data.room_number}.",
    }


def _validate_session(token: str):
    session = db["guest_sessions"].find_one({"token": token, "active": True}, {"_id": 0})
    if not session:
        raise HTTPException(401, "Session expired. Please re-enter your room details.")
    return session


# ── Guest Menu (Time-filtered) ──
@router.get("/menu")
async def guest_menu(token: Optional[str] = None):
    """Get the current menu filtered by active time period. Hides sold-out items."""
    seed_periods()
    seed_guest_menu()
    current_period = _get_current_period()
    periods = list(db["menu_periods"].find({"active": True}, {"_id": 0}).sort("sort_order", 1))

    # Get items for current period + sundries/amenities (always available)
    items = list(db["guest_menu"].find({
        "active": True,
        "$or": [
            {"period": current_period["period_id"]},
            {"category": {"$in": ["sundry", "amenity"]}},
        ]
    }, {"_id": 0}))

    # Filter out sold-out items (available_count not None and ordered_count >= available_count)
    available_items = []
    for item in items:
        ac = item.get("available_count")
        oc = item.get("ordered_count", 0)
        if ac is not None and oc >= ac:
            continue  # sold out, hide from guest menu
        remaining = (ac - oc) if ac is not None else None
        item["remaining"] = remaining
        available_items.append(item)

    # Group by category
    categories = defaultdict(list)
    for item in available_items:
        categories[item["category"]].append(item)

    return {
        "current_period": current_period,
        "all_periods": periods,
        "menu": dict(categories),
        "total_items": len(available_items),
    }


# ── Place Guest Order ──
@router.post("/order")
async def place_guest_order(data: GuestOrderInput):
    """Place an order from the guest ordering platform."""
    seed_periods()
    seed_guest_menu()

    # Validate session
    session = _validate_session(data.session_token)

    # Validate and decrement counts
    for item in data.items:
        menu_item = db["guest_menu"].find_one({"id": item.get("item_id")}, {"_id": 0})
        if not menu_item:
            raise HTTPException(400, f"Item {item.get('name', 'unknown')} is no longer available.")
        ac = menu_item.get("available_count")
        oc = menu_item.get("ordered_count", 0)
        qty = item.get("quantity", 1)
        if ac is not None and (oc + qty) > ac:
            remaining = max(0, ac - oc)
            raise HTTPException(400, f"Sorry, only {remaining} of '{menu_item['name']}' remaining.")
        # Decrement available count
        db["guest_menu"].update_one(
            {"id": item["item_id"]},
            {"$inc": {"ordered_count": qty}}
        )

    total = sum(i.get("price", 0) * i.get("quantity", 1) for i in data.items)
    order = {
        "id": f"go-{_uid()}", "room_number": data.room_number,
        "guest_name": data.guest_name, "items": data.items,
        "total": round(total, 2), "status": "received",
        "estimated_delivery_mins": max(15, max((i.get("prep_time_mins", 15) for i in data.items), default=15) + 5),
        "special_instructions": data.special_instructions,
        "source": "guest_ordering_platform",
        "created_at": _now(),
    }
    db["ird_orders"].insert_one(order)
    order.pop("_id", None)

    # Also log as guest_orders for Guest 360
    db["guest_orders"].insert_one({
        "id": f"gord-{_uid()}", "room_number": data.room_number,
        "order_type": "ird_guest_platform", "items": data.items,
        "total": round(total, 2), "status": "pending",
        "source": "guest_ordering_platform", "created_at": _now(),
    })

    # Check if any items are now sold out — create manager alert
    for item in data.items:
        menu_item = db["guest_menu"].find_one({"id": item["item_id"]}, {"_id": 0})
        if menu_item:
            ac = menu_item.get("available_count")
            oc = menu_item.get("ordered_count", 0)
            if ac is not None and oc >= ac:
                db["ird_manager_alerts"].update_one(
                    {"item_id": item["item_id"], "resolved": False},
                    {"$set": {
                        "item_id": item["item_id"], "item_name": menu_item["name"],
                        "alert_type": "sold_out", "available_count": ac,
                        "ordered_count": oc, "resolved": False, "created_at": _now(),
                    }},
                    upsert=True,
                )

    return {
        "order_id": order["id"], "total": order["total"],
        "estimated_delivery_mins": order["estimated_delivery_mins"],
        "message": f"Order confirmed! Your order will arrive in approximately {order['estimated_delivery_mins']} minutes.",
        "items_count": len(data.items),
    }


# ── Manager: Get menu periods ──
@router.get("/manager/periods")
async def get_periods():
    seed_periods()
    return {"periods": list(db["menu_periods"].find({}, {"_id": 0}).sort("sort_order", 1))}


@router.put("/manager/periods/{period_id}")
async def update_period(period_id: str, data: MenuPeriodInput):
    """Update a menu period's time window."""
    db["menu_periods"].update_one(
        {"period_id": period_id},
        {"$set": {"label": data.label, "start_time": data.start_time, "end_time": data.end_time, "active": data.active, "updated_at": _now()}}
    )
    return {"updated": period_id, "start": data.start_time, "end": data.end_time}


# ── Manager: Menu items with counts ──
@router.get("/manager/menu")
async def manager_menu():
    """Full menu for manager view — includes counts and sold-out status."""
    seed_guest_menu()
    items = list(db["guest_menu"].find({}, {"_id": 0}).sort([("period", 1), ("category", 1)]))
    for item in items:
        ac = item.get("available_count")
        oc = item.get("ordered_count", 0)
        item["sold_out"] = ac is not None and oc >= ac
        item["remaining"] = (ac - oc) if ac is not None else None
    return {"items": items}


@router.put("/manager/menu/{item_id}")
async def update_menu_item(item_id: str, data: MenuItemUpdateInput):
    """Update a menu item (price, count, active status, period)."""
    update = {"updated_at": _now()}
    if data.available_count is not None:
        update["available_count"] = data.available_count
    if data.price is not None:
        update["price"] = data.price
    if data.active is not None:
        update["active"] = data.active
    if data.period is not None:
        update["period"] = data.period
    db["guest_menu"].update_one({"id": item_id}, {"$set": update})
    return {"updated": item_id}


@router.put("/manager/reset-count/{item_id}")
async def reset_item_count(item_id: str, data: ItemCountResetInput):
    """Reset a sold-out item's count and clear alert."""
    db["guest_menu"].update_one(
        {"id": item_id},
        {"$set": {"available_count": data.available_count, "ordered_count": 0, "updated_at": _now()}}
    )
    db["ird_manager_alerts"].update_many(
        {"item_id": item_id, "resolved": False},
        {"$set": {"resolved": True, "resolved_at": _now()}}
    )
    return {"reset": item_id, "new_count": data.available_count}


@router.get("/manager/alerts")
async def manager_alerts():
    """Get active sold-out alerts for the manager."""
    alerts = list(db["ird_manager_alerts"].find({"resolved": False}, {"_id": 0}).sort("created_at", -1))
    return {"alerts": alerts, "count": len(alerts)}


@router.put("/manager/alerts/{item_id}/dismiss")
async def dismiss_alert(item_id: str):
    db["ird_manager_alerts"].update_many(
        {"item_id": item_id, "resolved": False},
        {"$set": {"resolved": True, "resolved_at": _now()}}
    )
    return {"dismissed": item_id}


# ── Guest order history (for thank you page) ──
@router.get("/order/{order_id}")
async def get_order(order_id: str):
    order = db["ird_orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    return order


# ── Order Status Updates (for kitchen staff + real-time tracking) ──
@router.put("/order/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...)):
    """Update order status. Triggers WebSocket broadcast for real-time guest tracking."""
    valid = ["received", "preparing", "delivering", "delivered", "cancelled"]
    if status not in valid:
        raise HTTPException(400, f"Invalid status. Use: {valid}")

    order = db["ird_orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    db["ird_orders"].update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": _now()}}
    )

    # Log status change
    db["order_status_log"].insert_one({
        "order_id": order_id, "room_number": order.get("room_number"),
        "old_status": order.get("status"), "new_status": status,
        "created_at": _now(),
    })

    # Send email notification on delivery
    if status == "delivered":
        try:
            from routes.email_notifications import send_order_confirmation
            send_order_confirmation(
                room=order.get("room_number", ""),
                guest_name=order.get("guest_name", "Guest"),
                order_id=order_id,
                total=order.get("total", 0),
                items=order.get("items", []),
                eta=0,
            )
        except Exception:
            pass

    # Broadcast order status via WebSocket for real-time tracking
    try:
        from server import _broadcast_sync
        _broadcast_sync("order_status_update", {
            "order_id": order_id, "status": status,
            "room_number": order.get("room_number"),
            "status_label": {"received": "Order received by kitchen", "preparing": "Chef is preparing your order", "delivering": "On the way to your room", "delivered": "Delivered — enjoy your meal!", "cancelled": "Order has been cancelled"}.get(status, ""),
        })
    except Exception:
        pass

    return {
        "order_id": order_id, "status": status,
        "room_number": order.get("room_number"),
        "message": f"Order {order_id} updated to {status}",
    }


# ── Guest order tracking (polling for status) ──
@router.get("/track/{order_id}")
async def track_order(order_id: str):
    """Guest-facing order tracking endpoint."""
    order = db["ird_orders"].find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    status_log = list(db["order_status_log"].find(
        {"order_id": order_id}, {"_id": 0}
    ).sort("created_at", 1))

    status_labels = {
        "received": "Order received by kitchen",
        "preparing": "Chef is preparing your order",
        "delivering": "On the way to your room",
        "delivered": "Delivered — enjoy your meal!",
        "cancelled": "Order has been cancelled",
    }

    return {
        "order_id": order["id"],
        "status": order.get("status", "received"),
        "status_label": status_labels.get(order.get("status", "received"), ""),
        "room_number": order.get("room_number"),
        "total": order.get("total", 0),
        "items": order.get("items", []),
        "estimated_delivery_mins": order.get("estimated_delivery_mins", 0),
        "history": status_log,
        "created_at": order.get("created_at"),
    }



# ══════════════════════════════════════════════════
#  MENU DESIGNER — Styling, Fonts, Layout
# ══════════════════════════════════════════════════

class MenuStyleInput(BaseModel):
    font_heading: str = "Playfair Display"
    font_body: str = "Inter"
    font_accent: str = "Great Vibes"
    color_background: str = "#faf9f7"
    color_card: str = "#ffffff"
    color_accent: str = "#1a1a2e"
    color_gold: str = "#b8860b"
    color_text: str = "#1a1a2e"
    color_muted: str = "#6b7280"
    layout: str = "classic"  # classic, modern, bistro, fine_dining, brewery
    show_emoji: bool = True
    show_prep_time: bool = True
    show_description: bool = True
    header_text: str = "In-Room Dining"
    subheader_text: str = ""
    logo_url: str = ""
    border_radius: int = 14
    card_style: str = "elevated"  # elevated, flat, bordered, glass


DEFAULT_STYLE = {
    "font_heading": "Playfair Display",
    "font_body": "Inter",
    "font_accent": "Great Vibes",
    "color_background": "#faf9f7",
    "color_card": "#ffffff",
    "color_accent": "#1a1a2e",
    "color_gold": "#b8860b",
    "color_text": "#1a1a2e",
    "color_muted": "#6b7280",
    "layout": "classic",
    "show_emoji": True,
    "show_prep_time": True,
    "show_description": True,
    "header_text": "In-Room Dining",
    "subheader_text": "",
    "logo_url": "",
    "border_radius": 14,
    "card_style": "elevated",
}

AVAILABLE_FONTS = [
    # Serif / Elegant
    {"name": "Playfair Display", "category": "serif", "style": "elegant", "url": "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap"},
    {"name": "Cormorant Garamond", "category": "serif", "style": "elegant", "url": "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap"},
    {"name": "Cinzel", "category": "serif", "style": "elegant", "url": "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap"},
    {"name": "EB Garamond", "category": "serif", "style": "elegant", "url": "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&display=swap"},
    {"name": "Libre Baskerville", "category": "serif", "style": "elegant", "url": "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap"},
    {"name": "Abril Fatface", "category": "serif", "style": "display", "url": "https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap"},
    # Sans-serif / Modern
    {"name": "Inter", "category": "sans-serif", "style": "modern", "url": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"},
    {"name": "DM Sans", "category": "sans-serif", "style": "modern", "url": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"},
    {"name": "Montserrat", "category": "sans-serif", "style": "modern", "url": "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"},
    {"name": "Poppins", "category": "sans-serif", "style": "modern", "url": "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"},
    {"name": "Raleway", "category": "sans-serif", "style": "modern", "url": "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap"},
    # Script / Artistic / Acrylic
    {"name": "Great Vibes", "category": "script", "style": "artistic", "url": "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap"},
    {"name": "Sacramento", "category": "script", "style": "artistic", "url": "https://fonts.googleapis.com/css2?family=Sacramento&display=swap"},
    {"name": "Dancing Script", "category": "script", "style": "artistic", "url": "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap"},
    {"name": "Pacifico", "category": "script", "style": "artistic", "url": "https://fonts.googleapis.com/css2?family=Pacifico&display=swap"},
    {"name": "Satisfy", "category": "script", "style": "artistic", "url": "https://fonts.googleapis.com/css2?family=Satisfy&display=swap"},
    {"name": "Lobster", "category": "script", "style": "artistic", "url": "https://fonts.googleapis.com/css2?family=Lobster&display=swap"},
    # Monospace / Industrial
    {"name": "IBM Plex Mono", "category": "monospace", "style": "industrial", "url": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap"},
    {"name": "JetBrains Mono", "category": "monospace", "style": "industrial", "url": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"},
]

LAYOUT_PRESETS = {
    "classic": {
        "font_heading": "Playfair Display", "font_body": "Inter", "font_accent": "Great Vibes",
        "color_background": "#faf9f7", "color_card": "#ffffff", "color_accent": "#1a1a2e",
        "color_gold": "#b8860b", "color_text": "#1a1a2e", "color_muted": "#6b7280",
        "border_radius": 14, "card_style": "elevated",
    },
    "modern": {
        "font_heading": "Montserrat", "font_body": "DM Sans", "font_accent": "Dancing Script",
        "color_background": "#f8fafc", "color_card": "#ffffff", "color_accent": "#0f172a",
        "color_gold": "#7c3aed", "color_text": "#0f172a", "color_muted": "#94a3b8",
        "border_radius": 16, "card_style": "bordered",
    },
    "bistro": {
        "font_heading": "EB Garamond", "font_body": "Libre Baskerville", "font_accent": "Sacramento",
        "color_background": "#f5f0eb", "color_card": "#faf7f3", "color_accent": "#3d2b1f",
        "color_gold": "#8b6914", "color_text": "#3d2b1f", "color_muted": "#8b7355",
        "border_radius": 8, "card_style": "flat",
    },
    "fine_dining": {
        "font_heading": "Cinzel", "font_body": "Cormorant Garamond", "font_accent": "Great Vibes",
        "color_background": "#0a0a0f", "color_card": "#141420", "color_accent": "#c8a97e",
        "color_gold": "#c8a97e", "color_text": "#e8e4df", "color_muted": "#6b6175",
        "border_radius": 4, "card_style": "glass",
    },
    "brewery": {
        "font_heading": "Abril Fatface", "font_body": "Poppins", "font_accent": "Pacifico",
        "color_background": "#1c1917", "color_card": "#292524", "color_accent": "#f59e0b",
        "color_gold": "#f59e0b", "color_text": "#fafaf9", "color_muted": "#a8a29e",
        "border_radius": 12, "card_style": "elevated",
    },
}

SEASONAL_PRESETS = {
    "valentines": {
        "font_heading": "Playfair Display", "font_body": "Cormorant Garamond", "font_accent": "Great Vibes",
        "color_background": "#1a0a10", "color_card": "#2a1018", "color_accent": "#e8456b",
        "color_gold": "#e8456b", "color_text": "#f5e6ea", "color_muted": "#9e6b7a",
        "border_radius": 16, "card_style": "glass",
        "header_text": "Valentine's Dining", "show_emoji": True,
    },
    "new_years": {
        "font_heading": "Cinzel", "font_body": "DM Sans", "font_accent": "Sacramento",
        "color_background": "#0a0a14", "color_card": "#12122a", "color_accent": "#ffd700",
        "color_gold": "#ffd700", "color_text": "#e8e4f0", "color_muted": "#7a7a9e",
        "border_radius": 10, "card_style": "glass",
        "header_text": "New Year's Eve Dining", "show_emoji": True,
    },
    "thanksgiving": {
        "font_heading": "EB Garamond", "font_body": "Libre Baskerville", "font_accent": "Dancing Script",
        "color_background": "#1a1408", "color_card": "#2a2010", "color_accent": "#d4760a",
        "color_gold": "#d4760a", "color_text": "#f0e8d8", "color_muted": "#9e8a6b",
        "border_radius": 8, "card_style": "elevated",
        "header_text": "Thanksgiving Feast", "show_emoji": True,
    },
    "christmas": {
        "font_heading": "Playfair Display", "font_body": "Inter", "font_accent": "Great Vibes",
        "color_background": "#0c1a0c", "color_card": "#142014", "color_accent": "#c41e3a",
        "color_gold": "#c8a97e", "color_text": "#e8f0e8", "color_muted": "#6b8a6b",
        "border_radius": 12, "card_style": "elevated",
        "header_text": "Holiday Dining", "show_emoji": True,
    },
    "summer": {
        "font_heading": "Montserrat", "font_body": "Poppins", "font_accent": "Pacifico",
        "color_background": "#fffbf0", "color_card": "#ffffff", "color_accent": "#0891b2",
        "color_gold": "#f59e0b", "color_text": "#164e63", "color_muted": "#67a8b8",
        "border_radius": 18, "card_style": "bordered",
        "header_text": "Summer Menu", "show_emoji": True,
    },
    "mothers_day": {
        "font_heading": "Cormorant Garamond", "font_body": "Raleway", "font_accent": "Satisfy",
        "color_background": "#fdf2f8", "color_card": "#ffffff", "color_accent": "#be185d",
        "color_gold": "#be185d", "color_text": "#4a1942", "color_muted": "#a07898",
        "border_radius": 14, "card_style": "elevated",
        "header_text": "Mother's Day Brunch", "show_emoji": True,
    },
}


@router.get("/style")
async def get_menu_style():
    """Get the current menu styling configuration (public — used by guest ordering page)."""
    style = db["menu_style"].find_one({"active": True}, {"_id": 0})
    if not style:
        return {**DEFAULT_STYLE, "fonts": AVAILABLE_FONTS}
    style.pop("active", None)
    return {**style, "fonts": AVAILABLE_FONTS}


@router.get("/manager/style")
async def manager_get_style():
    """Manager view of current style + all options."""
    style = db["menu_style"].find_one({"active": True}, {"_id": 0})
    if not style:
        style = {**DEFAULT_STYLE}
    style.pop("active", None)
    return {
        "current": style,
        "fonts": AVAILABLE_FONTS,
        "layouts": LAYOUT_PRESETS,
        "layout_names": list(LAYOUT_PRESETS.keys()),
        "seasonal": SEASONAL_PRESETS,
        "seasonal_names": list(SEASONAL_PRESETS.keys()),
    }


@router.put("/manager/style")
async def update_menu_style(data: MenuStyleInput):
    """Update the guest menu styling."""
    style_data = data.model_dump()
    style_data["active"] = True
    style_data["updated_at"] = _now()
    db["menu_style"].update_one({"active": True}, {"$set": style_data}, upsert=True)
    return {"updated": True, **style_data}


@router.post("/manager/style/preset/{layout}")
async def apply_layout_preset(layout: str):
    """Apply a named layout preset."""
    all_presets = {**LAYOUT_PRESETS, **SEASONAL_PRESETS}
    if layout not in all_presets:
        raise HTTPException(400, f"Unknown layout: {layout}. Available: {list(all_presets.keys())}")
    preset = {**DEFAULT_STYLE, **all_presets[layout], "layout": layout}
    preset["active"] = True
    preset["updated_at"] = _now()
    db["menu_style"].update_one({"active": True}, {"$set": preset}, upsert=True)
    return {"applied": layout, **preset}
