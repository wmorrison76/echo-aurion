"""
Micro-Market & Smart Fridge — Unmanned retail, auto-replenishment, smart fridge inventory.
Designed for mega-resort common areas, employee break rooms, lobby grab-and-go.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os

router = APIRouter(prefix="/api/micro-market", tags=["micro-market"])

from database import db as _db
kiosks_col = _db["mm_kiosks"]
inventory_col = _db["mm_inventory"]
sales_col = _db["mm_sales"]
replenish_col = _db["mm_replenishment"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════════════════════════
# KIOSKS / SMART FRIDGES
# ═══════════════════════════════════════════════════════════════

class KioskCreate(BaseModel):
    name: str
    kiosk_type: str = "smart_fridge"  # smart_fridge, micro_market, vending, grab_and_go_cooler
    location: str = ""
    property_id: Optional[str] = None
    capacity_slots: int = 50
    temperature_zone: str = "cold"  # cold, frozen, ambient, mixed

@router.get("/kiosks")
def list_kiosks(property_id: Optional[str] = None):
    q: dict = {}
    if property_id:
        q["property_id"] = property_id
    kiosks = list(kiosks_col.find(q, {"_id": 0}))
    for k in kiosks:
        inv_count = inventory_col.count_documents({"kiosk_id": k["kiosk_id"], "quantity": {"$gt": 0}})
        k["stocked_items"] = inv_count
        k["fill_rate"] = round(inv_count / max(k.get("capacity_slots", 50), 1), 3)
    return {"kiosks": kiosks, "total": len(kiosks)}

@router.post("/kiosks")
def create_kiosk(data: KioskCreate):
    kiosk = {
        "kiosk_id": f"mk-{_uid()}",
        **data.dict(),
        "active": True,
        "last_restocked": None,
        "total_sales": 0,
        "total_revenue": 0,
        "created_at": _now(),
    }
    kiosks_col.insert_one(kiosk)
    del kiosk["_id"]
    return kiosk


# ═══════════════════════════════════════════════════════════════
# INVENTORY
# ═══════════════════════════════════════════════════════════════

class InventoryItem(BaseModel):
    kiosk_id: str
    product_name: str
    sku: str = ""
    category: str = "snack"  # snack, beverage, meal, dessert, fresh_fruit, salad
    price: float = 0
    cost: float = 0
    quantity: int = 10
    par_level: int = 5
    expiry_date: Optional[str] = None

@router.get("/inventory")
def list_inventory(kiosk_id: Optional[str] = None, low_stock_only: bool = False):
    q: dict = {}
    if kiosk_id:
        q["kiosk_id"] = kiosk_id
    if low_stock_only:
        q["$expr"] = {"$lte": ["$quantity", "$par_level"]}
    items = list(inventory_col.find(q, {"_id": 0}))
    return {"items": items, "total": len(items)}

@router.post("/inventory")
def add_inventory(data: InventoryItem):
    item = {
        "inv_id": f"inv-{_uid()}",
        **data.dict(),
        "sold_count": 0,
        "created_at": _now(),
        "updated_at": _now(),
    }
    inventory_col.insert_one(item)
    del item["_id"]
    return item

@router.put("/inventory/{inv_id}/restock")
def restock_item(inv_id: str, quantity: int = 10):
    result = inventory_col.update_one(
        {"inv_id": inv_id},
        {"$inc": {"quantity": quantity}, "$set": {"updated_at": _now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return inventory_col.find_one({"inv_id": inv_id}, {"_id": 0})


# ═══════════════════════════════════════════════════════════════
# SALES (Self-checkout / RFID scan)
# ═══════════════════════════════════════════════════════════════

class SaleRecord(BaseModel):
    kiosk_id: str
    inv_id: str
    quantity: int = 1
    payment_method: str = "card"  # card, badge, mobile, meal_plan
    employee_id: str = ""

@router.post("/sales")
def record_sale(data: SaleRecord):
    item = inventory_col.find_one({"inv_id": data.inv_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    if item.get("quantity", 0) < data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    total = item.get("price", 0) * data.quantity
    profit = (item.get("price", 0) - item.get("cost", 0)) * data.quantity

    sale = {
        "sale_id": f"ms-{_uid()}",
        "kiosk_id": data.kiosk_id,
        "inv_id": data.inv_id,
        "product_name": item.get("product_name"),
        "quantity": data.quantity,
        "unit_price": item.get("price", 0),
        "total": round(total, 2),
        "profit": round(profit, 2),
        "payment_method": data.payment_method,
        "employee_id": data.employee_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "timestamp": _now(),
    }
    sales_col.insert_one(sale)
    del sale["_id"]

    # Decrement inventory
    inventory_col.update_one(
        {"inv_id": data.inv_id},
        {"$inc": {"quantity": -data.quantity, "sold_count": data.quantity}, "$set": {"updated_at": _now()}}
    )

    # Update kiosk totals
    kiosks_col.update_one(
        {"kiosk_id": data.kiosk_id},
        {"$inc": {"total_sales": 1, "total_revenue": total}}
    )

    # Check auto-replenishment trigger
    updated_item = inventory_col.find_one({"inv_id": data.inv_id}, {"_id": 0})
    if updated_item and updated_item.get("quantity", 0) <= updated_item.get("par_level", 5):
        _trigger_replenishment(data.kiosk_id, updated_item)

    return sale

@router.get("/sales/summary")
def sales_summary(kiosk_id: Optional[str] = None, date: Optional[str] = None):
    q: dict = {}
    if kiosk_id:
        q["kiosk_id"] = kiosk_id
    if date:
        q["date"] = date
    else:
        q["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    sales = list(sales_col.find(q, {"_id": 0}))
    total_revenue = sum(s.get("total", 0) for s in sales)
    total_profit = sum(s.get("profit", 0) for s in sales)

    by_category: dict = {}
    for s in sales:
        cat = s.get("product_name", "unknown")
        by_category[cat] = by_category.get(cat, 0) + s.get("quantity", 0)

    return {
        "date": q.get("date"),
        "total_sales": len(sales),
        "total_revenue": round(total_revenue, 2),
        "total_profit": round(total_profit, 2),
        "margin_pct": round(total_profit / max(total_revenue, 0.01), 3),
        "by_product": by_category,
    }


# ═══════════════════════════════════════════════════════════════
# AUTO-REPLENISHMENT
# ═══════════════════════════════════════════════════════════════

def _trigger_replenishment(kiosk_id: str, item: dict):
    """Auto-create replenishment order when stock hits par level."""
    order = {
        "replenish_id": f"rep-{_uid()}",
        "kiosk_id": kiosk_id,
        "inv_id": item.get("inv_id"),
        "product_name": item.get("product_name"),
        "current_qty": item.get("quantity", 0),
        "par_level": item.get("par_level", 5),
        "reorder_qty": item.get("par_level", 5) * 2,
        "status": "pending",
        "priority": "high" if item.get("quantity", 0) == 0 else "normal",
        "created_at": _now(),
    }
    replenish_col.insert_one(order)

@router.get("/replenishment")
def list_replenishment(kiosk_id: Optional[str] = None, status: Optional[str] = None):
    q: dict = {}
    if kiosk_id:
        q["kiosk_id"] = kiosk_id
    if status:
        q["status"] = status
    orders = list(replenish_col.find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"orders": orders, "total": len(orders), "pending": sum(1 for o in orders if o.get("status") == "pending")}

@router.put("/replenishment/{replenish_id}/fulfill")
def fulfill_replenishment(replenish_id: str):
    order = replenish_col.find_one({"replenish_id": replenish_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Restock the item
    inventory_col.update_one(
        {"inv_id": order["inv_id"]},
        {"$inc": {"quantity": order["reorder_qty"]}, "$set": {"updated_at": _now()}}
    )

    # Update kiosk last restocked
    kiosks_col.update_one(
        {"kiosk_id": order["kiosk_id"]},
        {"$set": {"last_restocked": _now()}}
    )

    replenish_col.update_one(
        {"replenish_id": replenish_id},
        {"$set": {"status": "fulfilled", "fulfilled_at": _now()}}
    )
    return {"fulfilled": replenish_id, "restocked_qty": order["reorder_qty"]}


# ═══════════════════════════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/dashboard")
def micro_market_dashboard(property_id: Optional[str] = None):
    q: dict = {}
    if property_id:
        q["property_id"] = property_id
    kiosks = list(kiosks_col.find(q, {"_id": 0}))
    kiosk_ids = [k["kiosk_id"] for k in kiosks]

    total_revenue = sum(k.get("total_revenue", 0) for k in kiosks)
    total_sales = sum(k.get("total_sales", 0) for k in kiosks)

    low_stock = inventory_col.count_documents({
        "kiosk_id": {"$in": kiosk_ids},
        "$expr": {"$lte": ["$quantity", "$par_level"]},
    })

    pending_replenish = replenish_col.count_documents({
        "kiosk_id": {"$in": kiosk_ids},
        "status": "pending",
    })

    out_of_stock = inventory_col.count_documents({
        "kiosk_id": {"$in": kiosk_ids},
        "quantity": 0,
    })

    return {
        "total_kiosks": len(kiosks),
        "total_revenue": round(total_revenue, 2),
        "total_sales": total_sales,
        "low_stock_items": low_stock,
        "out_of_stock_items": out_of_stock,
        "pending_replenishment": pending_replenish,
        "kiosks": [{
            "kiosk_id": k["kiosk_id"],
            "name": k["name"],
            "type": k["kiosk_type"],
            "location": k.get("location", ""),
            "revenue": k.get("total_revenue", 0),
            "sales": k.get("total_sales", 0),
            "active": k.get("active", True),
        } for k in kiosks],
    }
