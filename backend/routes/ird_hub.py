"""
In-Room Dining & Minibar Hub
=============================
IRD order management + minibar restock tracking. Draws on FOH menu
library and guest360 profiles. Integrated with the concierge hub
(ird_tickets collection) and POS outbound queue.

Endpoints (prefix /api/ird):
  GET  /menu                         — IRD menu
  GET  /orders                       — list orders
  POST /orders                       — create IRD order
  PATCH /orders/{id}                 — update status
  GET  /minibar/{room_no}            — minibar contents for a room
  POST /minibar/{room_no}/consumption — log consumption
  POST /minibar/{room_no}/restock    — mark restock
  GET  /restock-queue                — rooms needing restock
  GET  /kpis                         — 8-metric IRD KPIs
  POST /seed                         — demo seed
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import uuid4
import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db

try:
    import event_bus
except ImportError:
    event_bus = None

router = APIRouter(prefix="/api/ird-hub", tags=["ird-hub"])

MENU_COLL = "ird_hub_menu"
ORDERS_COLL = "ird_hub_orders"
MINIBAR_COLL = "ird_hub_minibar_state"

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()

MENU_SEED = [
    ("ird-brk-001", "Continental Breakfast", "breakfast", 28.0, True, "7AM-11AM"),
    ("ird-brk-002", "Eggs Benedict", "breakfast", 32.0, False, "7AM-11AM"),
    ("ird-brk-003", "Acai Bowl", "breakfast", 24.0, True, "7AM-11AM"),
    ("ird-lun-001", "Chef Salad", "lunch", 26.0, True, "11AM-5PM"),
    ("ird-lun-002", "Wagyu Burger", "lunch", 38.0, False, "11AM-11PM"),
    ("ird-din-001", "Filet Mignon", "dinner", 72.0, False, "5PM-11PM"),
    ("ird-din-002", "Pan-Seared Salmon", "dinner", 58.0, False, "5PM-11PM"),
    ("ird-din-003", "Lobster Risotto", "dinner", 65.0, False, "5PM-11PM"),
    ("ird-noc-001", "Late Night Bites", "late_night", 32.0, True, "11PM-6AM"),
    ("ird-kid-001", "Kids Pasta", "kids", 18.0, False, "All day"),
    ("ird-wine-001", "Champagne Bottle", "beverage", 180.0, False, "All day"),
    ("ird-wine-002", "Cabernet Sauvignon Bottle", "beverage", 140.0, False, "All day"),
    ("ird-bev-001", "Espresso", "beverage", 8.0, True, "All day"),
]

MINIBAR_DEFAULT = [
    {"sku": "water-still", "name": "Still Water 500ml", "price": 6.0, "par": 2},
    {"sku": "water-sprk", "name": "Sparkling Water 500ml", "price": 7.0, "par": 2},
    {"sku": "soda-cola", "name": "Cola 355ml", "price": 8.0, "par": 2},
    {"sku": "beer-local", "name": "Local Craft Beer", "price": 12.0, "par": 2},
    {"sku": "wine-btl", "name": "House Red Split", "price": 28.0, "par": 1},
    {"sku": "champ-split", "name": "Champagne Split", "price": 44.0, "par": 1},
    {"sku": "snack-nut", "name": "Premium Nuts", "price": 14.0, "par": 1},
    {"sku": "snack-choc", "name": "Artisan Chocolate Bar", "price": 12.0, "par": 1},
    {"sku": "spirit-mini", "name": "Spirits Miniature", "price": 18.0, "par": 2},
]

STATUSES = ["received", "preparing", "enroute", "delivered", "cancelled"]


class OrderItem(BaseModel):
    menu_id: str
    qty: int = 1
    special_requests: Optional[str] = None


class CreateOrder(BaseModel):
    room_no: str
    guest_name: Optional[str] = None
    items: List[OrderItem]
    delivery_eta_minutes: int = 30
    notes: Optional[str] = None


class UpdateOrder(BaseModel):
    status: Optional[str] = None


class ConsumptionItem(BaseModel):
    sku: str
    qty: int = 1


async def _seed_if_empty():
    if db[MENU_COLL].count_documents({}) == 0:
        for mid, name, cat, price, veg, avail in MENU_SEED:
            db[MENU_COLL].insert_one({
                "id": mid,
                "name": name,
                "category": cat,
                "price": price,
                "vegetarian": veg,
                "available_hours": avail,
                "active": True,
            })
    # Seed minibar for 20 rooms
    if db[MINIBAR_COLL].count_documents({}) == 0:
        for floor in range(2, 7):
            for r in range(1, 5):
                rn = f"{floor}{r:02d}"
                items = []
                for mb in MINIBAR_DEFAULT:
                    items.append({**mb, "on_hand": mb["par"] - random.randint(0, 1)})
                db[MINIBAR_COLL].insert_one({
                    "room_no": rn,
                    "items": items,
                    "last_restocked_at": (_now() - timedelta(hours=random.randint(6, 72))).isoformat(),
                    "updated_at": _iso(),
                })


@router.post("/seed")
async def seed():
    await _seed_if_empty()
    return {
        "ok": True,
        "menu_items": db[MENU_COLL].count_documents({}),
        "minibars": db[MINIBAR_COLL].count_documents({}),
        "orders": db[ORDERS_COLL].count_documents({}),
    }


@router.get("/menu")
async def menu(category: Optional[str] = None):
    await _seed_if_empty()
    q = {"active": True}
    if category:
        q["category"] = category
    docs = list(db[MENU_COLL].find(q, {"_id": 0}))
    return {"items": docs}


@router.get("/orders")
async def list_orders(status: Optional[str] = None, room_no: Optional[str] = None, limit: int = 100):
    q = {}
    if status:
        q["status"] = status
    if room_no:
        q["room_no"] = room_no
    docs = list(db[ORDERS_COLL].find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"items": docs, "count": len(docs)}


@router.post("/orders")
async def create_order(req: CreateOrder):
    await _seed_if_empty()
    menu_lookup = {m["id"]: m for m in list(db[MENU_COLL].find({}, {"_id": 0}))}
    total = 0.0
    enriched_items = []
    for item in req.items:
        m = menu_lookup.get(item.menu_id)
        if not m:
            raise HTTPException(400, f"menu item {item.menu_id} not found")
        enriched_items.append({
            "menu_id": item.menu_id,
            "name": m["name"],
            "price": m["price"],
            "qty": item.qty,
            "line_total": m["price"] * item.qty,
            "special_requests": item.special_requests,
        })
        total += m["price"] * item.qty
    now = _now()
    doc = {
        "id": f"ord-{uuid4().hex[:8]}",
        "ticket_no": f"IRD-{now.strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
        "room_no": req.room_no,
        "guest_name": req.guest_name,
        "items": enriched_items,
        "subtotal": round(total, 2),
        "service_charge": round(total * 0.18, 2),
        "delivery_eta": (now + timedelta(minutes=req.delivery_eta_minutes)).isoformat(),
        "notes": req.notes,
        "status": "received",
        "source": "ird_api",
        "created_at": now.isoformat(),
    }
    db[ORDERS_COLL].insert_one(doc.copy())
    # Enqueue to POS outbound for downstream delivery
    try:
        db["pos_outbound"].insert_one({
            "id": f"pos-{uuid4().hex[:8]}",
            "kind": "ird_order",
            "action": "create",
            "ref_id": doc["id"],
            "payload": doc,
            "created_at": now.isoformat(),
            "delivered": False,
            "attempts": 0,
        })
    except Exception:
        pass
    doc.pop("_id", None)
    if event_bus:
        try:
            event_bus.publish("ird.order.created", {"id": doc["id"], "ticket_no": doc["ticket_no"], "room_no": doc["room_no"], "subtotal": doc["subtotal"]}, source="ird_hub")
        except Exception:
            pass
    return {"ok": True, "order": doc}


@router.patch("/orders/{order_id}")
async def update_order(order_id: str, upd: UpdateOrder):
    doc = db[ORDERS_COLL].find_one({"id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "order not found")
    if upd.status and upd.status in STATUSES:
        extra = {}
        if upd.status == "delivered":
            extra["delivered_at"] = _iso()
        db[ORDERS_COLL].update_one({"id": order_id}, {"$set": {"status": upd.status, **extra}})
    updated_order = db[ORDERS_COLL].find_one({"id": order_id}, {"_id": 0})
    return {"ok": True, "order": updated_order}


@router.get("/minibar/{room_no}")
async def minibar(room_no: str):
    await _seed_if_empty()
    doc = db[MINIBAR_COLL].find_one({"room_no": room_no}, {"_id": 0})
    if not doc:
        # Create from default
        items = [{**mb, "on_hand": mb["par"]} for mb in MINIBAR_DEFAULT]
        doc = {"room_no": room_no, "items": items, "last_restocked_at": _iso(), "updated_at": _iso()}
        db[MINIBAR_COLL].insert_one(doc.copy())
        doc.pop("_id", None)
    return doc


@router.post("/minibar/{room_no}/consumption")
async def log_consumption(room_no: str, item: ConsumptionItem):
    doc = db[MINIBAR_COLL].find_one({"room_no": room_no})
    if not doc:
        # auto-create a fresh minibar for this room on first consumption
        items = [{**mb, "on_hand": mb["par"]} for mb in MINIBAR_DEFAULT]
        doc = {"room_no": room_no, "items": items, "last_restocked_at": _iso(), "updated_at": _iso()}
        db[MINIBAR_COLL].insert_one(doc.copy())
    items = doc.get("items", [])
    price = 0.0
    for it in items:
        if it["sku"] == item.sku:
            it["on_hand"] = max(0, it.get("on_hand", 0) - item.qty)
            price = it["price"] * item.qty
            break
    else:
        raise HTTPException(400, f"SKU {item.sku} not in this minibar")
    db[MINIBAR_COLL].update_one({"room_no": room_no}, {"$set": {"items": items, "updated_at": _iso()}})
    # Log a charge
    db["ird_minibar_charges"].insert_one({
        "id": f"mb-{uuid4().hex[:8]}",
        "room_no": room_no,
        "sku": item.sku,
        "qty": item.qty,
        "price": price,
        "created_at": _iso(),
    })
    return {"ok": True, "room_no": room_no, "price": price}


@router.post("/minibar/{room_no}/restock")
async def restock(room_no: str):
    doc = db[MINIBAR_COLL].find_one({"room_no": room_no})
    if not doc:
        raise HTTPException(404, "minibar for room not found")
    items = doc.get("items", [])
    for it in items:
        it["on_hand"] = it.get("par", 1)
    db[MINIBAR_COLL].update_one({"room_no": room_no}, {"$set": {"items": items, "last_restocked_at": _iso(), "updated_at": _iso()}})
    return {"ok": True, "room_no": room_no, "items": items}


@router.get("/restock-queue")
async def restock_queue():
    await _seed_if_empty()
    bars = list(db[MINIBAR_COLL].find({}, {"_id": 0}))
    flagged = []
    for b in bars:
        low = [it for it in b.get("items", []) if it.get("on_hand", 0) < it.get("par", 1)]
        if low:
            flagged.append({
                "room_no": b["room_no"],
                "low_items": low,
                "last_restocked_at": b.get("last_restocked_at"),
            })
    return {"items": flagged, "count": len(flagged)}


@router.get("/kpis")
async def kpis():
    await _seed_if_empty()
    now = _now()
    last24 = (now - timedelta(hours=24)).isoformat()
    orders_24 = list(db[ORDERS_COLL].find({"created_at": {"$gte": last24}}, {"_id": 0}))
    delivered = [o for o in orders_24 if o.get("status") == "delivered"]
    revenue = sum(o.get("subtotal", 0) for o in orders_24)
    avg_ticket = revenue / max(1, len(orders_24))
    delivery_times = []
    for o in delivered:
        if o.get("delivered_at") and o.get("created_at"):
            try:
                delivery_times.append((datetime.fromisoformat(o["delivered_at"]) - datetime.fromisoformat(o["created_at"])).total_seconds() / 60)
            except Exception:
                pass
    minibar_charges = list(db["ird_minibar_charges"].find({"created_at": {"$gte": last24}}, {"_id": 0}))
    minibar_rev = sum(c.get("price", 0) for c in minibar_charges)

    return {
        "ts": _iso(),
        "orders_24h": len(orders_24),
        "delivered_24h": len(delivered),
        "revenue_24h": round(revenue, 2),
        "avg_ticket": round(avg_ticket, 2),
        "avg_delivery_minutes": round(sum(delivery_times) / len(delivery_times), 1) if delivery_times else 0,
        "minibar_revenue_24h": round(minibar_rev, 2),
        "minibar_units_24h": sum(c.get("qty", 1) for c in minibar_charges),
        "open_orders": db[ORDERS_COLL].count_documents({"status": {"$in": ["received", "preparing", "enroute"]}}),
    }
