"""
Mobile Preorder & Locker Pickup — Employee/guest mobile ordering with locker assignment.
Supports pickup lockers, time-slot scheduling, order tracking, and pickup confirmation.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os

router = APIRouter(prefix="/api/mobile-order", tags=["mobile-order"])

from database import db as _db
orders_col = _db["mo_orders"]
lockers_col = _db["mo_lockers"]
timeslots_col = _db["mo_timeslots"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════════════════════════
# LOCKERS
# ═══════════════════════════════════════════════════════════════

class LockerCreate(BaseModel):
    name: str
    location: str = ""
    property_id: Optional[str] = None
    total_compartments: int = 12
    locker_type: str = "heated"  # heated, refrigerated, ambient, combo

@router.get("/lockers")
def list_lockers(property_id: Optional[str] = None):
    q: dict = {}
    if property_id:
        q["property_id"] = property_id
    lockers = list(lockers_col.find(q, {"_id": 0}))
    for lk in lockers:
        occupied = orders_col.count_documents({"locker_id": lk["locker_id"], "status": "ready_for_pickup"})
        lk["occupied"] = occupied
        lk["available"] = lk.get("total_compartments", 12) - occupied
    return {"lockers": lockers, "total": len(lockers)}

@router.post("/lockers")
def create_locker(data: LockerCreate):
    locker = {
        "locker_id": f"lk-{_uid()}",
        **data.dict(),
        "active": True,
        "created_at": _now(),
    }
    lockers_col.insert_one(locker)
    del locker["_id"]
    return locker


# ═══════════════════════════════════════════════════════════════
# TIME SLOTS
# ═══════════════════════════════════════════════════════════════

class TimeslotCreate(BaseModel):
    locker_id: str
    date: str
    time_start: str  # "11:30"
    time_end: str    # "12:00"
    max_orders: int = 10

@router.get("/timeslots")
def list_timeslots(locker_id: Optional[str] = None, date: Optional[str] = None):
    q: dict = {}
    if locker_id:
        q["locker_id"] = locker_id
    if date:
        q["date"] = date
    else:
        q["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    slots = list(timeslots_col.find(q, {"_id": 0}))
    for s in slots:
        booked = orders_col.count_documents({"timeslot_id": s["slot_id"]})
        s["booked"] = booked
        s["available"] = s.get("max_orders", 10) - booked
    return {"timeslots": slots, "total": len(slots)}

@router.post("/timeslots")
def create_timeslot(data: TimeslotCreate):
    slot = {
        "slot_id": f"ts-{_uid()}",
        **data.dict(),
        "created_at": _now(),
    }
    timeslots_col.insert_one(slot)
    del slot["_id"]
    return slot


# ═══════════════════════════════════════════════════════════════
# ORDERS
# ═══════════════════════════════════════════════════════════════

class OrderCreate(BaseModel):
    employee_id: str = ""
    guest_name: str = ""
    locker_id: str
    timeslot_id: str = ""
    items: list[dict] = []  # [{name, quantity, price}]
    notes: str = ""
    payment_method: str = "meal_plan"  # meal_plan, card, badge, cash

@router.post("/orders")
def create_order(data: OrderCreate):
    # Validate locker exists
    locker = lockers_col.find_one({"locker_id": data.locker_id}, {"_id": 0})
    if not locker:
        raise HTTPException(status_code=404, detail="Locker not found")

    # Check slot availability
    if data.timeslot_id:
        slot = timeslots_col.find_one({"slot_id": data.timeslot_id}, {"_id": 0})
        if slot:
            booked = orders_col.count_documents({"timeslot_id": data.timeslot_id})
            if booked >= slot.get("max_orders", 10):
                raise HTTPException(status_code=400, detail="Time slot is full")

    # Check compartment availability
    occupied = orders_col.count_documents({"locker_id": data.locker_id, "status": "ready_for_pickup"})
    if occupied >= locker.get("total_compartments", 12):
        raise HTTPException(status_code=400, detail="No compartments available")

    total = sum(i.get("price", 0) * i.get("quantity", 1) for i in data.items)
    compartment = occupied + 1

    order = {
        "order_id": f"mo-{_uid()}",
        "employee_id": data.employee_id,
        "guest_name": data.guest_name,
        "locker_id": data.locker_id,
        "locker_name": locker.get("name"),
        "timeslot_id": data.timeslot_id,
        "compartment_number": compartment,
        "items": data.items,
        "item_count": len(data.items),
        "total": round(total, 2),
        "notes": data.notes,
        "payment_method": data.payment_method,
        "status": "pending",  # pending → preparing → ready_for_pickup → picked_up → expired
        "pickup_code": f"{_uid()[:6].upper()}",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_at": _now(),
        "prepared_at": None,
        "picked_up_at": None,
    }
    orders_col.insert_one(order)
    del order["_id"]
    return order

@router.get("/orders")
def list_orders(locker_id: Optional[str] = None, status: Optional[str] = None, date: Optional[str] = None):
    q: dict = {}
    if locker_id:
        q["locker_id"] = locker_id
    if status:
        q["status"] = status
    if date:
        q["date"] = date
    orders = list(orders_col.find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"orders": orders, "total": len(orders)}

@router.put("/orders/{order_id}/status")
def update_order_status(order_id: str, status: str):
    valid = ["pending", "preparing", "ready_for_pickup", "picked_up", "expired", "cancelled"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid}")

    updates: dict = {"status": status, "updated_at": _now()}
    if status == "ready_for_pickup":
        updates["prepared_at"] = _now()
    elif status == "picked_up":
        updates["picked_up_at"] = _now()

    result = orders_col.update_one({"order_id": order_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return orders_col.find_one({"order_id": order_id}, {"_id": 0})


# ═══════════════════════════════════════════════════════════════
# PICKUP VERIFICATION
# ═══════════════════════════════════════════════════════════════

@router.post("/pickup/{pickup_code}")
def verify_pickup(pickup_code: str):
    order = orders_col.find_one({"pickup_code": pickup_code, "status": "ready_for_pickup"}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="No ready order found for this code")

    orders_col.update_one(
        {"order_id": order["order_id"]},
        {"$set": {"status": "picked_up", "picked_up_at": _now()}}
    )
    order["status"] = "picked_up"
    order["picked_up_at"] = _now()
    return {"message": "Pickup confirmed", "order": order}


# ═══════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/dashboard")
def mobile_order_dashboard(property_id: Optional[str] = None):
    locker_q: dict = {}
    if property_id:
        locker_q["property_id"] = property_id
    lockers = list(lockers_col.find(locker_q, {"_id": 0}))
    locker_ids = [lk["locker_id"] for lk in lockers]

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_orders = list(orders_col.find({"locker_id": {"$in": locker_ids}, "date": today}, {"_id": 0}))

    total_revenue = sum(o.get("total", 0) for o in today_orders)
    by_status = {}
    for o in today_orders:
        st = o.get("status", "unknown")
        by_status[st] = by_status.get(st, 0) + 1

    total_compartments = sum(lk.get("total_compartments", 12) for lk in lockers)
    occupied = orders_col.count_documents({"locker_id": {"$in": locker_ids}, "status": "ready_for_pickup"})

    avg_prep_minutes = 0
    prepped = [o for o in today_orders if o.get("prepared_at") and o.get("created_at")]
    if prepped:
        total_mins = 0
        for o in prepped:
            try:
                created = datetime.fromisoformat(o["created_at"])
                prepared = datetime.fromisoformat(o["prepared_at"])
                total_mins += (prepared - created).total_seconds() / 60
            except (ValueError, TypeError):
                pass
        avg_prep_minutes = round(total_mins / len(prepped), 1) if prepped else 0

    return {
        "today": today,
        "total_lockers": len(lockers),
        "total_compartments": total_compartments,
        "occupied_compartments": occupied,
        "occupancy_rate": round(occupied / max(total_compartments, 1), 3),
        "today_orders": len(today_orders),
        "today_revenue": round(total_revenue, 2),
        "by_status": by_status,
        "avg_prep_minutes": avg_prep_minutes,
        "lockers": [{
            "locker_id": lk["locker_id"],
            "name": lk["name"],
            "location": lk.get("location", ""),
            "type": lk.get("locker_type", "heated"),
            "compartments": lk.get("total_compartments", 12),
        } for lk in lockers],
    }
