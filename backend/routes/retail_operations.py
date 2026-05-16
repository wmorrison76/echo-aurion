"""
Retail Outlet Operations — Gift Shop, Sundries, Mini-Markets
==============================================================
- Daily sales tracking, register management
- Inventory for retail items
- Staff scheduling
- Performance metrics
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/retail", tags=["retail"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

class RetailItemInput(BaseModel):
    name: str
    category: str  # apparel, souvenirs, sundries, snacks, beverages, gifts
    sku: str = ""
    price: float = 0
    cost: float = 0
    qty_on_hand: int = 0
    reorder_point: int = 5
    outlet_id: str = "gift-shop"

class RetailSaleInput(BaseModel):
    outlet_id: str = "gift-shop"
    items: List[dict] = []  # [{item_id, qty, price}]
    payment_method: str = "room_charge"
    room_number: str = ""
    cashier_id: str = ""


def seed_retail():
    if db["retail_items"].count_documents({}) > 0:
        return
    items = [
        {"name": "Resort Logo T-Shirt", "category": "apparel", "sku": "APP-001", "price": 35, "cost": 12, "qty_on_hand": 45, "reorder_point": 10},
        {"name": "Resort Logo Cap", "category": "apparel", "sku": "APP-002", "price": 25, "cost": 8, "qty_on_hand": 30, "reorder_point": 10},
        {"name": "Beach Towel (Premium)", "category": "sundries", "sku": "SUN-001", "price": 45, "cost": 15, "qty_on_hand": 60, "reorder_point": 15},
        {"name": "Sunscreen SPF 50", "category": "sundries", "sku": "SUN-002", "price": 18, "cost": 6, "qty_on_hand": 40, "reorder_point": 10},
        {"name": "Local Artisan Candle", "category": "gifts", "sku": "GFT-001", "price": 55, "cost": 20, "qty_on_hand": 20, "reorder_point": 5},
        {"name": "Chocolate Box (Local)", "category": "gifts", "sku": "GFT-002", "price": 28, "cost": 10, "qty_on_hand": 25, "reorder_point": 8},
        {"name": "Bottled Water (6-pack)", "category": "beverages", "sku": "BEV-001", "price": 8, "cost": 2, "qty_on_hand": 100, "reorder_point": 25},
        {"name": "Premium Trail Mix", "category": "snacks", "sku": "SNK-001", "price": 12, "cost": 4, "qty_on_hand": 35, "reorder_point": 10},
        {"name": "Resort Photo Magnet", "category": "souvenirs", "sku": "SOV-001", "price": 10, "cost": 2, "qty_on_hand": 80, "reorder_point": 20},
        {"name": "Resort Tote Bag", "category": "apparel", "sku": "APP-003", "price": 20, "cost": 5, "qty_on_hand": 50, "reorder_point": 15},
    ]
    for item in items:
        db["retail_items"].insert_one({"id": f"ri-{_uid()}", **item, "outlet_id": "gift-shop", "active": True, "created_at": _now()})

    # Sample sales
    for i in range(8):
        db["retail_sales"].insert_one({
            "id": f"rs-{_uid()}", "outlet_id": "gift-shop",
            "items": [{"item_name": items[i % len(items)]["name"], "qty": 1 + (i % 3), "price": items[i % len(items)]["price"]}],
            "total": items[i % len(items)]["price"] * (1 + (i % 3)),
            "payment_method": ["room_charge", "credit_card", "cash"][i % 3],
            "room_number": str(300 + i * 5) if i % 2 == 0 else "",
            "cashier_id": f"cashier-{(i % 2) + 1}", "created_at": _now(),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        })


@router.get("/dashboard")
async def retail_dashboard(outlet_id: str = "gift-shop"):
    seed_retail()
    items = list(db["retail_items"].find({"outlet_id": outlet_id}, {"_id": 0}))
    sales = list(db["retail_sales"].find({"outlet_id": outlet_id}, {"_id": 0}))

    total_rev = sum(s.get("total", 0) for s in sales)
    total_cost = sum(item["cost"] * item["qty_on_hand"] for item in items)
    low_stock = [i for i in items if i["qty_on_hand"] <= i.get("reorder_point", 5)]
    by_category = defaultdict(lambda: {"revenue": 0, "count": 0})
    for s in sales:
        for item in s.get("items", []):
            by_category[items[0]["category"] if items else "other"]["revenue"] += item.get("price", 0) * item.get("qty", 1)
            by_category[items[0]["category"] if items else "other"]["count"] += item.get("qty", 1)

    return {
        "kpis": {
            "total_items": len(items), "total_revenue": round(total_rev, 2),
            "total_sales": len(sales), "inventory_value": round(total_cost, 2),
            "low_stock_items": len(low_stock), "avg_transaction": round(total_rev / max(len(sales), 1), 2),
        },
        "items": items,
        "low_stock": low_stock,
        "recent_sales": sorted(sales, key=lambda s: s.get("created_at", ""), reverse=True)[:10],
    }

@router.get("/items")
async def list_items(outlet_id: str = "gift-shop", category: Optional[str] = None):
    seed_retail()
    q = {"outlet_id": outlet_id}
    if category: q["category"] = category
    return {"items": list(db["retail_items"].find(q, {"_id": 0}))}

@router.post("/items")
async def add_item(data: RetailItemInput):
    doc = {"id": f"ri-{_uid()}", **data.model_dump(), "active": True, "created_at": _now()}
    db["retail_items"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.post("/sales")
async def record_sale(data: RetailSaleInput):
    total = sum(i.get("price", 0) * i.get("qty", 1) for i in data.items)
    doc = {"id": f"rs-{_uid()}", **data.model_dump(), "total": round(total, 2), "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "created_at": _now()}
    db["retail_sales"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/sales")
async def list_sales(outlet_id: str = "gift-shop", date: Optional[str] = None):
    seed_retail()
    q = {"outlet_id": outlet_id}
    if date: q["date"] = date
    return {"sales": list(db["retail_sales"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))}
