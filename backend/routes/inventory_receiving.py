"""
Inventory Receiving Module — Scan Deliveries Against PRs
=========================================================
When deliveries arrive, staff scan/confirm items against purchase
requisitions, auto-update par levels, and shortage alerts resolve
in real-time. Tracks received vs ordered, variances, and credits.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db

router = APIRouter(prefix="/api/inventory", tags=["inventory"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ══════════════════════════════════════
#  INVENTORY ITEMS (Par Levels)
# ══════════════════════════════════════

@router.get("/items")
async def list_inventory_items(category: Optional[str] = None, low_stock: bool = False):
    """List inventory items with current on-hand and par levels."""
    q: dict = {}
    if category:
        q["category"] = category
    items = list(db["inventory_items"].find(q, {"_id": 0}).sort("name", 1))
    if low_stock:
        items = [i for i in items if i.get("on_hand", 0) < i.get("par_level", 0)]
    return {"items": items, "total": len(items)}


@router.post("/items")
async def create_inventory_item(body: dict = {}):
    """Create or update an inventory item."""
    item_id = body.get("item_id", f"inv-{_uid()}")
    doc = {
        "item_id": item_id,
        "name": body.get("name", ""),
        "category": body.get("category", ""),
        "unit": body.get("unit", "lb"),
        "on_hand": body.get("on_hand", 0),
        "par_level": body.get("par_level", 0),
        "reorder_point": body.get("reorder_point", 0),
        "cost_per_unit": body.get("cost_per_unit", 0),
        "supplier": body.get("supplier", ""),
        "storage_location": body.get("storage_location", ""),
        "last_received": None,
        "updated_at": _now(),
    }
    db["inventory_items"].update_one(
        {"item_id": item_id}, {"$set": doc, "$setOnInsert": {"created_at": _now()}}, upsert=True
    )
    return doc


@router.post("/seed")
async def seed_inventory():
    """Seed inventory items from the yield database."""
    if db["inventory_items"].count_documents({}) > 20:
        return {"status": "already_seeded", "count": db["inventory_items"].count_documents({})}

    from routes.yield_database import YIELD_DB
    count = 0
    for item in YIELD_DB:
        item_id = f"inv-{item['name'][:20].lower().replace(' ', '-').replace(',', '').replace('(', '').replace(')', '')}"
        doc = {
            "item_id": item_id,
            "name": item["name"],
            "category": item["category"],
            "unit": item.get("unit", "lb"),
            "on_hand": 0,
            "par_level": round(item["ap_cost_lb"] * 2, 1) if item["ap_cost_lb"] < 50 else 5,
            "reorder_point": round(item["ap_cost_lb"], 1) if item["ap_cost_lb"] < 50 else 2,
            "cost_per_unit": item["ap_cost_lb"],
            "yield_pct": item["yield_pct"],
            "supplier": "",
            "storage_location": _default_storage(item["category"]),
            "last_received": None,
            "created_at": _now(),
            "updated_at": _now(),
        }
        db["inventory_items"].update_one({"item_id": item_id}, {"$set": doc}, upsert=True)
        count += 1

    return {"status": "seeded", "count": count}


# ══════════════════════════════════════
#  RECEIVING AGAINST PRs
# ══════════════════════════════════════

@router.post("/receive")
async def receive_delivery(body: dict = {}):
    """Receive a delivery against a purchase requisition.
    Scans items, compares to PR, updates on_hand, flags variances."""
    pr_id = body.get("requisition_id", "")
    received_items = body.get("items", [])
    received_by = body.get("received_by", "")
    supplier = body.get("supplier", "")

    # Load the PR
    pr = None
    if pr_id:
        pr = db["purchase_requisitions"].find_one({"requisition_id": pr_id}, {"_id": 0})

    receipt_id = f"rcv-{_uid()}"
    line_items = []
    total_cost = 0
    variances = []

    for item in received_items:
        name = item.get("ingredient", item.get("name", ""))
        qty_received = item.get("quantity", 0)
        unit = item.get("unit", "lb")
        unit_cost = item.get("unit_cost", 0)
        line_cost = round(qty_received * unit_cost, 2)
        total_cost += line_cost

        # Check against PR
        qty_ordered = 0
        if pr:
            for pr_item in pr.get("items", []):
                if pr_item.get("ingredient", "").lower() == name.lower():
                    qty_ordered = pr_item.get("qty", 0)
                    break

        variance = round(qty_received - qty_ordered, 2) if qty_ordered > 0 else 0
        variance_pct = round((variance / qty_ordered) * 100, 1) if qty_ordered > 0 else 0

        line_items.append({
            "ingredient": name,
            "qty_ordered": qty_ordered,
            "qty_received": qty_received,
            "unit": unit,
            "unit_cost": unit_cost,
            "line_cost": line_cost,
            "variance": variance,
            "variance_pct": variance_pct,
            "status": "exact" if variance == 0 else ("over" if variance > 0 else "short"),
        })

        if variance != 0:
            variances.append({"ingredient": name, "variance": variance, "unit": unit, "variance_pct": variance_pct})

        # Update on_hand in inventory
        db["inventory_items"].update_one(
            {"name": {"$regex": f"^{name[:15]}", "$options": "i"}},
            {"$inc": {"on_hand": qty_received}, "$set": {"last_received": _now(), "updated_at": _now()}}
        )

    # Save receipt
    receipt = {
        "receipt_id": receipt_id,
        "requisition_id": pr_id,
        "supplier": supplier,
        "received_by": received_by,
        "items": line_items,
        "total_cost": round(total_cost, 2),
        "total_items": len(line_items),
        "variances": variances,
        "variance_count": len(variances),
        "status": "received",
        "received_at": _now(),
    }
    db["receiving_log"].insert_one({**receipt, "_id": receipt_id})

    # iter194 · FM-Upgrade 1 · TimelineEvent — lot.received (CTE under FSMA 204)
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import LOT_RECEIVED, PO_RECEIVED_FULL
        import secrets as _sec
        for li in line_items:
            # Mint a TLC if the item doesn't carry one from the supplier
            tlc = f"TLC-{_sec.token_hex(4).upper()}"
            lot_id = f"lot-{_sec.token_urlsafe(6)}"
            _tl(LOT_RECEIVED,
                actor={"type": "user", "id": received_by or "receiving", "name": received_by or "Receiving"},
                entity_refs=[
                    {"kind": "lot", "id": lot_id, "name": li.get("ingredient")},
                    {"kind": "receipt", "id": receipt_id},
                    {"kind": "purchase_requisition", "id": pr_id} if pr_id else None,
                ],
                payload={
                    "commodity": li.get("ingredient"),
                    "quantity": li.get("qty_received"),
                    "unit": li.get("unit"),
                    "unit_cost": li.get("unit_cost"),
                    "variance": li.get("variance"),
                    "supplier": supplier,
                    "po_id": pr_id,
                    "tlc": tlc,
                    "lot_id": lot_id,
                    "reference_document_id": receipt_id,
                },
                idempotency_key=f"lot.received:{receipt_id}:{li.get('ingredient')}")
        # PO rollup event
        if pr_id:
            _tl(PO_RECEIVED_FULL,
                actor={"type": "user", "id": received_by or "receiving", "name": received_by or "Receiving"},
                entity_refs=[{"kind": "purchase_requisition", "id": pr_id}, {"kind": "receipt", "id": receipt_id}],
                payload={"supplier": supplier, "line_count": len(line_items), "total_cost": total_cost,
                         "commodity": "mixed", "quantity": len(line_items), "unit": "lines"},
                idempotency_key=f"po.received_full:{receipt_id}")
    except Exception: pass

    # Update PR status
    if pr_id:
        db["purchase_requisitions"].update_one(
            {"requisition_id": pr_id},
            {"$set": {"status": "received", "received_at": _now(), "receipt_id": receipt_id}}
        )

    return receipt


@router.get("/receipts")
async def list_receipts(limit: int = 20):
    """List receiving receipts."""
    receipts = list(db["receiving_log"].find({}, {"_id": 0}).sort("received_at", -1).limit(limit))
    return {"receipts": receipts, "total": len(receipts)}


@router.get("/receipts/{receipt_id}")
async def get_receipt(receipt_id: str):
    """Get a specific receipt."""
    r = db["receiving_log"].find_one({"receipt_id": receipt_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Receipt not found")
    return r


# ══════════════════════════════════════
#  INVENTORY DASHBOARD
# ══════════════════════════════════════

@router.get("/dashboard")
async def inventory_dashboard():
    """Inventory overview: stock levels, low stock alerts, recent receiving."""
    total_items = db["inventory_items"].count_documents({})
    low_stock = list(db["inventory_items"].find(
        {"$expr": {"$lt": ["$on_hand", "$par_level"]}}, {"_id": 0}
    ).sort("name", 1).limit(20))
    critical = [i for i in low_stock if i.get("on_hand", 0) == 0]
    recent_receipts = list(db["receiving_log"].find({}, {"_id": 0}).sort("received_at", -1).limit(5))

    # Total inventory value
    items = list(db["inventory_items"].find({}, {"_id": 0}))
    total_value = sum(i.get("on_hand", 0) * i.get("cost_per_unit", 0) for i in items)

    # Category breakdown
    by_cat = {}
    for item in items:
        cat = item.get("category", "other")
        by_cat.setdefault(cat, {"count": 0, "value": 0, "low_stock": 0})
        by_cat[cat]["count"] += 1
        by_cat[cat]["value"] += item.get("on_hand", 0) * item.get("cost_per_unit", 0)
        if item.get("on_hand", 0) < item.get("par_level", 0):
            by_cat[cat]["low_stock"] += 1

    return {
        "total_items": total_items,
        "total_value": round(total_value, 2),
        "low_stock_count": len(low_stock),
        "critical_count": len(critical),
        "low_stock_items": low_stock[:10],
        "critical_items": critical[:5],
        "recent_receipts": recent_receipts,
        "by_category": by_cat,
    }


@router.put("/items/{item_id}/adjust")
async def adjust_inventory(item_id: str, body: dict = {}):
    """Manual inventory adjustment (count correction, waste, transfer)."""
    adjustment = body.get("adjustment", 0)
    reason = body.get("reason", "manual_count")

    result = db["inventory_items"].update_one(
        {"item_id": item_id},
        {"$inc": {"on_hand": adjustment}, "$set": {"updated_at": _now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Item not found")

    # Log the adjustment
    db["inventory_adjustments"].insert_one({
        "_id": f"adj-{_uid()}", "item_id": item_id, "adjustment": adjustment,
        "reason": reason, "adjusted_by": body.get("adjusted_by", ""), "created_at": _now(),
    })
    return {"item_id": item_id, "adjustment": adjustment, "reason": reason}


def _default_storage(category):
    return {
        "protein": "Walk-In Cooler A",
        "seafood": "Walk-In Cooler B (Fish)",
        "vegetable": "Walk-In Cooler C (Produce)",
        "fruit": "Walk-In Cooler C (Produce)",
        "dairy": "Walk-In Cooler D (Dairy)",
        "herb": "Walk-In Cooler C (Produce)",
        "grain": "Dry Storage",
    }.get(category, "Dry Storage")
