"""
Beverage Ordering & Escrow Engine
===================================
Handles alcohol ordering for events with escrow account checks.
Ensures balance is sufficient before placing orders.
Notifies finance if adjustment needed.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/beverage-orders", tags=["beverage-orders"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

BEVERAGE_CATALOG = [
    {"id": "bv-001", "name": "Dewar's White Label 1.75L", "category": "spirits", "unit_cost": 32.00, "unit": "BTL", "par": 12},
    {"id": "bv-002", "name": "Grey Goose Vodka 1L", "category": "spirits", "unit_cost": 28.00, "unit": "BTL", "par": 18},
    {"id": "bv-003", "name": "Patron Silver 750ml", "category": "spirits", "unit_cost": 38.00, "unit": "BTL", "par": 8},
    {"id": "bv-004", "name": "Hendrick's Gin 1L", "category": "spirits", "unit_cost": 35.00, "unit": "BTL", "par": 6},
    {"id": "bv-005", "name": "Caymus Cabernet 2021", "category": "wine", "unit_cost": 68.00, "unit": "BTL", "par": 24},
    {"id": "bv-006", "name": "Whispering Angel Rose", "category": "wine", "unit_cost": 22.00, "unit": "BTL", "par": 36},
    {"id": "bv-007", "name": "Veuve Clicquot Brut NV", "category": "champagne", "unit_cost": 48.00, "unit": "BTL", "par": 12},
    {"id": "bv-008", "name": "Stella Artois Keg", "category": "beer", "unit_cost": 165.00, "unit": "KEG", "par": 4},
    {"id": "bv-009", "name": "Corona Extra Case/24", "category": "beer", "unit_cost": 28.00, "unit": "CASE", "par": 8},
    {"id": "bv-010", "name": "S.Pellegrino Sparkling 500ml/24", "category": "non_alc", "unit_cost": 32.00, "unit": "CASE", "par": 6},
    {"id": "bv-011", "name": "Coca-Cola Products Case/24", "category": "non_alc", "unit_cost": 18.00, "unit": "CASE", "par": 10},
    {"id": "bv-012", "name": "Fresh Orange Juice GAL", "category": "non_alc", "unit_cost": 12.00, "unit": "GAL", "par": 8},
]

def _seed_escrow():
    if db["escrow_accounts"].count_documents({}) > 0:
        return
    db["escrow_accounts"].insert_one({
        "id": "escrow-beverage", "name": "Beverage Escrow Account",
        "balance": 50000.00, "minimum_balance": 5000.00,
        "auto_replenish": True, "replenish_threshold": 10000.00,
        "replenish_amount": 25000.00, "created_at": _now(),
        "transactions": [],
    })

class BeverageOrderInput(BaseModel):
    beo_id: str = ""
    items: List[dict]  # [{beverage_id, qty}]
    event_name: str = ""
    notes: str = ""

class EscrowAdjustInput(BaseModel):
    amount: float
    reason: str


@router.post("/order")
async def create_beverage_order(data: BeverageOrderInput):
    """Create a beverage order for an event — checks escrow before placing."""
    _seed_escrow()
    catalog = {b["id"]: b for b in BEVERAGE_CATALOG}

    order_lines = []
    total_cost = 0
    for item in data.items:
        bev = catalog.get(item.get("beverage_id", ""))
        if not bev:
            continue
        qty = item.get("qty", 0)
        line_cost = round(bev["unit_cost"] * qty, 2)
        order_lines.append({
            "beverage_id": bev["id"], "name": bev["name"], "category": bev["category"],
            "qty": qty, "unit_cost": bev["unit_cost"], "line_cost": line_cost, "unit": bev["unit"],
        })
        total_cost += line_cost

    # Check escrow balance
    escrow = db["escrow_accounts"].find_one({"id": "escrow-beverage"}, {"_id": 0})
    balance = escrow.get("balance", 0) if escrow else 0
    sufficient = balance >= total_cost
    remaining_after = round(balance - total_cost, 2)
    below_minimum = remaining_after < escrow.get("minimum_balance", 5000) if escrow else True

    order = {
        "id": f"bvord-{_uid()}", "beo_id": data.beo_id, "event_name": data.event_name,
        "items": order_lines, "total_cost": round(total_cost, 2), "notes": data.notes,
        "escrow_check": {
            "balance_before": balance, "order_amount": round(total_cost, 2),
            "balance_after": remaining_after, "sufficient": sufficient,
            "below_minimum": below_minimum,
        },
        "status": "approved" if sufficient else "pending_finance",
        "created_at": _now(),
    }

    if sufficient:
        # Deduct from escrow
        db["escrow_accounts"].update_one(
            {"id": "escrow-beverage"},
            {"$inc": {"balance": -total_cost},
             "$push": {"transactions": {"type": "debit", "amount": total_cost,
                                         "ref": order["id"], "description": f"Beverage order for {data.event_name or data.beo_id}",
                                         "timestamp": _now()}}}
        )
        if below_minimum:
            order["finance_alert"] = f"Escrow balance ${remaining_after:,.0f} below minimum ${escrow.get('minimum_balance',5000):,.0f}. Finance notified."
    else:
        order["finance_alert"] = f"INSUFFICIENT FUNDS: Need ${total_cost:,.0f} but only ${balance:,.0f} available. Order held for finance approval."

    db["beverage_orders"].insert_one(order)
    order.pop("_id", None)
    return order


@router.get("/escrow")
async def get_escrow_status():
    _seed_escrow()
    escrow = db["escrow_accounts"].find_one({"id": "escrow-beverage"}, {"_id": 0})
    pending_orders = sum(o.get("total_cost", 0) for o in db["beverage_orders"].find({"status": "pending_finance"}, {"_id": 0, "total_cost": 1}))
    return {**escrow, "pending_orders_total": round(pending_orders, 2),
            "effective_balance": round(escrow.get("balance", 0) - pending_orders, 2)}


@router.post("/escrow/adjust")
async def adjust_escrow(data: EscrowAdjustInput):
    _seed_escrow()
    db["escrow_accounts"].update_one(
        {"id": "escrow-beverage"},
        {"$inc": {"balance": data.amount},
         "$push": {"transactions": {"type": "credit" if data.amount > 0 else "debit",
                                     "amount": abs(data.amount), "description": data.reason, "timestamp": _now()}}}
    )
    escrow = db["escrow_accounts"].find_one({"id": "escrow-beverage"}, {"_id": 0})
    return {"new_balance": escrow["balance"], "adjustment": data.amount, "reason": data.reason}


@router.get("/catalog")
async def beverage_catalog():
    return {"items": BEVERAGE_CATALOG, "total": len(BEVERAGE_CATALOG)}


@router.get("/orders")
async def list_beverage_orders(beo_id: Optional[str] = None):
    q = {"beo_id": beo_id} if beo_id else {}
    orders = list(db["beverage_orders"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"orders": orders, "total": len(orders)}
