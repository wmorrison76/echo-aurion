"""
Culinary/Pastry Waste Sheet — EchoAuruim Accounting Integration
===============================================================
Waste tracking with GL journal entries for accounting reconciliation.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db

router = APIRouter(prefix="/api/waste-sheet", tags=["waste-sheet"])


class WasteEntry(BaseModel):
    item_name: str
    ingredient_id: Optional[str] = None
    quantity: float
    unit: str
    reason: str  # expired, overproduction, prep_error, spoilage, quality_reject
    cost_per_unit: Optional[float] = None
    department: str = "culinary"  # culinary or pastry
    outlet_id: str = "main-kitchen"
    recorded_by: str = ""
    notes: Optional[str] = None


class WasteCreditEntry(BaseModel):
    waste_id: str
    credit_amount: float
    credit_type: str  # vendor_return, composting, donation, staff_meal
    notes: Optional[str] = None


@router.get("/entries")
async def list_waste_entries(department: Optional[str] = None, limit: int = 50):
    """List waste entries with accounting status."""
    query = {}
    if department:
        query["department"] = department
    entries = list(
        db["waste_tracking"].find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
    )
    # Attach GL journal entries for each waste item
    for entry in entries:
        journal = list(db["gl_journal_entries"].find(
            {"event_id": entry.get("id", ""), "memo": {"$regex": "waste", "$options": "i"}},
            {"_id": 0}
        ))
        entry["gl_entries"] = journal
        entry["accounting_posted"] = len(journal) > 0
    return {"entries": entries, "count": len(entries)}


@router.post("/entries")
async def create_waste_entry(data: WasteEntry):
    """Record a new waste entry and auto-post to GL."""
    cost_estimate = data.cost_per_unit * data.quantity if data.cost_per_unit else 0
    now = datetime.now(timezone.utc).isoformat()
    entry_id = str(uuid4())

    entry = {
        "id": entry_id,
        "ingredient_id": data.ingredient_id or "",
        "item_name": data.item_name,
        "quantity": data.quantity,
        "unit": data.unit,
        "reason": data.reason,
        "cost_per_unit": data.cost_per_unit or 0,
        "cost_estimate": cost_estimate,
        "department": data.department,
        "outlet_id": data.outlet_id,
        "recorded_by": data.recorded_by,
        "notes": data.notes or "",
        "timestamp": now,
        "credits": [],
        "net_cost": cost_estimate,
    }
    db["waste_tracking"].insert_one(entry)

    # Auto-post debit to Waste Expense GL
    if cost_estimate > 0:
        gl_debit = {
            "id": str(uuid4()),
            "event_id": entry_id,
            "account_code": "5400",
            "account_name": f"Waste Expense - {data.department.title()}",
            "debit": cost_estimate,
            "credit": 0,
            "memo": f"Waste: {data.item_name} ({data.quantity} {data.unit}) - {data.reason}",
            "posted_at": now,
        }
        gl_credit = {
            "id": str(uuid4()),
            "event_id": entry_id,
            "account_code": "1200",
            "account_name": "Inventory",
            "debit": 0,
            "credit": cost_estimate,
            "memo": f"Waste inventory write-off: {data.item_name}",
            "posted_at": now,
        }
        db["gl_journal_entries"].insert_many([gl_debit, gl_credit])

    entry.pop("_id", None)
    return {"entry": entry, "gl_posted": cost_estimate > 0}


@router.post("/credits")
async def apply_waste_credit(data: WasteCreditEntry):
    """Apply a credit/recovery against a waste entry (vendor return, donation, etc.)."""
    waste = db["waste_tracking"].find_one({"id": data.waste_id}, {"_id": 0})
    if not waste:
        raise HTTPException(404, "Waste entry not found")

    now = datetime.now(timezone.utc).isoformat()
    credit_id = str(uuid4())
    credit = {
        "id": credit_id,
        "amount": data.credit_amount,
        "type": data.credit_type,
        "notes": data.notes or "",
        "applied_at": now,
    }

    # Update waste entry with credit
    existing_credits = waste.get("credits", [])
    existing_credits.append(credit)
    total_credits = sum(c["amount"] for c in existing_credits)
    net_cost = waste.get("cost_estimate", 0) - total_credits

    db["waste_tracking"].update_one(
        {"id": data.waste_id},
        {"$set": {"credits": existing_credits, "net_cost": max(0, net_cost)}}
    )

    # Post credit GL entry
    gl_entry = {
        "id": str(uuid4()),
        "event_id": data.waste_id,
        "account_code": "5400",
        "account_name": f"Waste Recovery - {data.credit_type.replace('_', ' ').title()}",
        "debit": 0,
        "credit": data.credit_amount,
        "memo": f"Waste credit ({data.credit_type}): ${data.credit_amount:.2f} for {waste.get('item_name', 'Unknown')}",
        "posted_at": now,
    }
    db["gl_journal_entries"].insert_one(gl_entry)

    return {"credit": credit, "net_cost": max(0, net_cost), "gl_posted": True}


@router.get("/dashboard")
async def waste_dashboard(department: Optional[str] = None):
    """Dashboard summary: total waste, top reasons, department breakdown, GL impact."""
    query = {}
    if department:
        query["department"] = department
    all_waste = list(db["waste_tracking"].find(query, {"_id": 0}))

    total_cost = sum(w.get("cost_estimate", 0) for w in all_waste)
    total_credits = sum(
        sum(c.get("amount", 0) for c in w.get("credits", []))
        for w in all_waste
    )
    net_waste_cost = total_cost - total_credits

    # By reason
    by_reason = {}
    for w in all_waste:
        reason = w.get("reason", "unknown")
        by_reason.setdefault(reason, {"count": 0, "cost": 0})
        by_reason[reason]["count"] += 1
        by_reason[reason]["cost"] += w.get("cost_estimate", 0)

    # By department
    by_dept = {}
    for w in all_waste:
        dept = w.get("department", "unknown")
        by_dept.setdefault(dept, {"count": 0, "cost": 0})
        by_dept[dept]["count"] += 1
        by_dept[dept]["cost"] += w.get("cost_estimate", 0)

    return {
        "total_entries": len(all_waste),
        "total_cost": round(total_cost, 2),
        "total_credits": round(total_credits, 2),
        "net_waste_cost": round(net_waste_cost, 2),
        "by_reason": by_reason,
        "by_department": by_dept,
    }
