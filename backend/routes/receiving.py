"""
Receiving / Truck-to-table workflow (iter266 · D3 → FastAPI port).

Replaces `client/_archive_node_dev_server/PurchasingReceiving/routes/receiving.ts`
(Express + Supabase). Endpoint paths unchanged so `useReceiving.ts` keeps working.

Collections:
  delivery_schedules     — daily/weekly delivery calendar
  shipments              — actual truck arrivals
  truck_inspections      — pre-unload cleanliness/temp/seal check
  haccp_checks           — pre-unload food-safety check
  receiving_checkins     — line-item-level scans at the dock
  receiving_discrepancies — shorts / damage / quality issues
  receiving_summaries    — per-(shipment, outlet) roll-up
  ap_invoice_drafts      — D3 auto-AP-invoice on commit (three-way-match seed)
  audit_events           — append-only audit log

All routes under /api/receiving/* and return the same JSON shape the
Express version did (paginated lists wrap in `{data, total, limit, offset}`).
"""
from datetime import datetime, timezone
from typing import Optional, List, Literal
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from database import db

router = APIRouter(prefix="/api/receiving", tags=["receiving"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda p="rcv": f"{p}-{str(uuid4())[:8]}"


def _log_audit(organization_id: str, action: str, payload: dict):
    db["audit_events"].insert_one(
        {
            "id": _uid("aud"),
            "organization_id": organization_id,
            "action": action,
            "payload": payload,
            "created_at": _now(),
        }
    )


def _paginate(cursor, total: int, limit: int, offset: int):
    return {
        "data": list(cursor),
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ─────────────────────────────────────────────────────────────
# Delivery schedules
# ─────────────────────────────────────────────────────────────
class DeliveryScheduleIn(BaseModel):
    organization_id: str
    vendor_id: str
    scheduled_date: str
    scheduled_time_start: Optional[str] = None
    scheduled_time_end: Optional[str] = None
    delivery_type: Optional[str] = None
    expected_items_count: Optional[int] = None
    expected_value: Optional[float] = None
    po_numbers: List[str] = []
    notes: str = ""


@router.get("/delivery-schedules")
async def list_delivery_schedules(
    organization_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    q: dict = {}
    if organization_id: q["organization_id"] = organization_id
    if vendor_id: q["vendor_id"] = vendor_id
    if status: q["status"] = status
    if start_date: q.setdefault("scheduled_date", {})["$gte"] = start_date
    if end_date: q.setdefault("scheduled_date", {})["$lte"] = end_date
    total = db["delivery_schedules"].count_documents(q)
    cursor = db["delivery_schedules"].find(q, {"_id": 0}).sort("scheduled_date", 1).skip(offset).limit(limit)
    return _paginate(cursor, total, limit, offset)


@router.post("/delivery-schedules")
async def create_delivery_schedule(data: DeliveryScheduleIn):
    doc = {"id": _uid("sched"), **data.model_dump(), "status": "scheduled", "created_at": _now()}
    db["delivery_schedules"].insert_one(doc)
    doc.pop("_id", None)
    _log_audit(data.organization_id, "schedule_created", {"schedule_id": doc["id"]})
    return doc


# ─────────────────────────────────────────────────────────────
# Shipments (truck arrivals)
# ─────────────────────────────────────────────────────────────
class ShipmentIn(BaseModel):
    organization_id: str
    delivery_schedule_id: Optional[str] = None
    vendor_id: str
    truck_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    estimated_arrival: Optional[str] = None


class ArrivalIn(BaseModel):
    actual_arrival: Optional[str] = None
    temperature_current: Optional[float] = None


@router.get("/shipments")
async def list_shipments(
    organization_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    q: dict = {}
    if organization_id: q["organization_id"] = organization_id
    if status: q["status"] = status
    total = db["shipments"].count_documents(q)
    cursor = db["shipments"].find(q, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    return _paginate(cursor, total, limit, offset)


@router.post("/shipments")
async def create_shipment(data: ShipmentIn):
    doc = {"id": _uid("ship"), **data.model_dump(), "status": "scheduled", "created_at": _now()}
    db["shipments"].insert_one(doc)
    if data.delivery_schedule_id:
        db["delivery_schedules"].update_one(
            {"id": data.delivery_schedule_id}, {"$set": {"status": "in_transit"}}
        )
    doc.pop("_id", None)
    return doc


@router.patch("/shipments/{shipment_id}/arrival")
async def update_shipment_arrival(shipment_id: str, data: ArrivalIn):
    res = db["shipments"].find_one_and_update(
        {"id": shipment_id},
        {"$set": {**data.model_dump(exclude_none=True), "status": "arrived"}},
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(404, "shipment not found")
    _log_audit(res.get("organization_id", ""), "truck_arrived", {"shipment_id": shipment_id})
    return res


# ─────────────────────────────────────────────────────────────
# Truck inspections
# ─────────────────────────────────────────────────────────────
class TruckInspectionIn(BaseModel):
    shipment_id: str
    organization_id: str
    inspected_by_user_id: str
    truck_cleanliness_score: Optional[int] = None
    no_visible_damage: bool = True
    damage_notes: str = ""
    temp_control_working: bool = True
    interior_temperature: Optional[float] = None
    temperature_acceptable: bool = True
    seal_intact: bool = True
    seal_broken_notes: str = ""
    inspection_status: Literal["pass", "fail", "conditional"] = "pass"
    fail_reason: str = ""


@router.post("/truck-inspections")
async def create_truck_inspection(data: TruckInspectionIn):
    can_proceed = data.inspection_status != "fail"
    doc = {
        "id": _uid("inspect"),
        **data.model_dump(),
        "can_proceed_to_unload": can_proceed,
        "created_at": _now(),
    }
    db["truck_inspections"].insert_one(doc)
    if can_proceed:
        db["shipments"].update_one({"id": data.shipment_id}, {"$set": {"status": "unloading"}})
    doc.pop("_id", None)
    _log_audit(data.organization_id, "inspection_completed", {"shipment_id": data.shipment_id})
    return doc


# ─────────────────────────────────────────────────────────────
# HACCP checks
# ─────────────────────────────────────────────────────────────
class HaccpCheckIn(BaseModel):
    shipment_id: str
    organization_id: str
    checked_by_user_id: str
    frozen_product_temp: Optional[float] = None
    frozen_acceptable: bool = True
    chilled_product_temp: Optional[float] = None
    chilled_acceptable: bool = True
    ambient_temp: Optional[float] = None
    ambient_acceptable: bool = True
    exterior_cleanliness: Optional[int] = None
    interior_cleanliness: Optional[int] = None
    cleanliness_acceptable: bool = True
    delivery_documentation_present: bool = True
    origin_cert_present: bool = True
    allergen_info_present: bool = True
    haccp_status: Literal["pass", "fail", "conditional"] = "pass"
    corrective_action_required: bool = False
    approver_user_id: Optional[str] = None


@router.post("/haccp-checks")
async def create_haccp_check(data: HaccpCheckIn):
    doc = {
        "id": _uid("haccp"),
        **data.model_dump(),
        "check_time": _now().split("T")[1],
        "created_at": _now(),
    }
    db["haccp_checks"].insert_one(doc)
    if data.haccp_status == "pass":
        db["shipments"].update_one({"id": data.shipment_id}, {"$set": {"status": "unloading"}})
    doc.pop("_id", None)
    _log_audit(data.organization_id, "haccp_passed", {"shipment_id": data.shipment_id})
    return doc


# ─────────────────────────────────────────────────────────────
# Item check-in
# ─────────────────────────────────────────────────────────────
class CheckinIn(BaseModel):
    shipment_id: str
    organization_id: str
    outlet_id: str
    receiving_user_id: str
    line_item_id: Optional[str] = None
    product_id: Optional[str] = None
    sku: str
    product_name: str
    category: Optional[str] = None
    po_quantity: float = 0
    po_unit: Optional[str] = None
    received_quantity: float = 0
    expiration_date: Optional[str] = None
    received_condition: Literal["good", "damaged", "marginal"] = "good"
    condition_notes: str = ""
    received_by_vendor_rep: bool = False
    vendor_rep_phone: Optional[str] = None


@router.post("/receiving-checkins")
async def create_checkin(data: CheckinIn):
    short_quantity = max(0, (data.po_quantity or 0) - (data.received_quantity or 0))
    is_short = short_quantity > 0
    requires_action = is_short or data.received_condition != "good"
    doc = {
        "id": _uid("cki"),
        **data.model_dump(),
        "short_quantity": short_quantity,
        "checkin_status": "short" if is_short else "received",
        "requires_action": requires_action,
        "checkin_date": _now(),
        "created_at": _now(),
    }
    db["receiving_checkins"].insert_one(doc)

    # Create a discrepancy row if needed
    if requires_action:
        shipment = db["shipments"].find_one({"id": data.shipment_id}, {"_id": 0, "vendor_id": 1})
        db["receiving_discrepancies"].insert_one(
            {
                "id": _uid("disc"),
                "checkin_id": doc["id"],
                "organization_id": data.organization_id,
                "outlet_id": data.outlet_id,
                "shipment_id": data.shipment_id,
                "vendor_id": (shipment or {}).get("vendor_id"),
                "discrepancy_type": "short" if is_short else "quality_issue",
                "product_id": data.product_id,
                "sku": data.sku,
                "quantity_affected": short_quantity,
                "resolution_status": "open",
                "vendor_notified": False,
                "created_at": _now(),
            }
        )

    doc.pop("_id", None)
    _log_audit(data.organization_id, "item_checkin", {"checkin_id": doc["id"]})
    return doc


@router.get("/receiving-checkins/{outlet_id}")
async def list_checkins(
    outlet_id: str,
    shipment_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    q: dict = {"outlet_id": outlet_id}
    if shipment_id: q["shipment_id"] = shipment_id
    if status: q["checkin_status"] = status
    total = db["receiving_checkins"].count_documents(q)
    cursor = db["receiving_checkins"].find(q, {"_id": 0}).sort("checkin_date", -1).skip(offset).limit(limit)
    return _paginate(cursor, total, limit, offset)


# ─────────────────────────────────────────────────────────────
# Discrepancies
# ─────────────────────────────────────────────────────────────
class VendorNotifyIn(BaseModel):
    notification_method: Literal["phone", "email", "sms", "in_app"]
    vendor_notified_by_user_id: str


@router.get("/receiving-discrepancies")
async def list_discrepancies(
    organization_id: Optional[str] = None,
    vendor_id: Optional[str] = None,
    resolution_status: Optional[str] = None,
    discrepancy_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    q: dict = {}
    if organization_id: q["organization_id"] = organization_id
    if vendor_id: q["vendor_id"] = vendor_id
    if resolution_status: q["resolution_status"] = resolution_status
    if discrepancy_type: q["discrepancy_type"] = discrepancy_type
    total = db["receiving_discrepancies"].count_documents(q)
    cursor = db["receiving_discrepancies"].find(q, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    return _paginate(cursor, total, limit, offset)


@router.post("/receiving-discrepancies/{discrepancy_id}/notify-vendor")
async def notify_vendor(discrepancy_id: str, data: VendorNotifyIn):
    res = db["receiving_discrepancies"].find_one_and_update(
        {"id": discrepancy_id},
        {
            "$set": {
                "vendor_notified": True,
                "vendor_notified_at": _now(),
                "vendor_notified_by_user_id": data.vendor_notified_by_user_id,
                "notification_method": data.notification_method,
            }
        },
        return_document=True,
        projection={"_id": 0},
    )
    if not res:
        raise HTTPException(404, "discrepancy not found")
    _log_audit(res.get("organization_id", ""), "vendor_notified", {"discrepancy_id": discrepancy_id})
    return res


# ─────────────────────────────────────────────────────────────
# Receiving summaries + auto-AP invoice (D3 commit flow)
# ─────────────────────────────────────────────────────────────
class CompleteSummaryIn(BaseModel):
    checkin_completed_by_user_id: str


def _auto_create_ap_invoice(shipment_id: str, outlet_id: str, checkins: list) -> Optional[str]:
    """D3 — auto-create A/P invoice draft on commit (three-way-match seed).
    Subtotal = sum of received_quantity * items.last_cost. Status='new'.
    AP/Chef team reviews and matches against PO; we don't fully reconcile."""
    if not checkins:
        return None
    subtotal = 0.0
    lines = []
    for c in checkins:
        item = db["items"].find_one({"sku": c.get("sku")}, {"_id": 0, "last_cost": 1})
        unit_cost = (item or {}).get("last_cost", 0) or 0
        line_total = (c.get("received_quantity", 0) or 0) * unit_cost
        subtotal += line_total
        lines.append(
            {
                "sku": c.get("sku"),
                "product_name": c.get("product_name"),
                "received_quantity": c.get("received_quantity"),
                "unit_cost": unit_cost,
                "line_total": round(line_total, 2),
            }
        )
    shipment = db["shipments"].find_one({"id": shipment_id}, {"_id": 0, "vendor_id": 1})
    invoice_id = _uid("apinv")
    db["ap_invoice_drafts"].insert_one(
        {
            "id": invoice_id,
            "shipment_id": shipment_id,
            "outlet_id": outlet_id,
            "vendor_id": (shipment or {}).get("vendor_id"),
            "status": "new",
            "subtotal": round(subtotal, 2),
            "lines": lines,
            "created_at": _now(),
            "source": "d3-auto-receive-commit",
        }
    )
    return invoice_id


@router.get("/receiving-summaries/{shipment_id}/{outlet_id}")
async def get_summary(shipment_id: str, outlet_id: str):
    doc = db["receiving_summaries"].find_one(
        {"shipment_id": shipment_id, "outlet_id": outlet_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "summary not found")
    return doc


@router.post("/receiving-summaries/{shipment_id}/{outlet_id}/complete")
async def complete_summary(shipment_id: str, outlet_id: str, data: CompleteSummaryIn):
    checkins = list(
        db["receiving_checkins"].find(
            {"shipment_id": shipment_id, "outlet_id": outlet_id}, {"_id": 0}
        )
    )
    totals = {
        "total_expected_items": sum(c.get("po_quantity", 0) or 0 for c in checkins),
        "total_received_items": sum(c.get("received_quantity", 0) or 0 for c in checkins),
        "total_short_items": sum(c.get("short_quantity", 0) or 0 for c in checkins),
        "total_damaged_items": sum(1 for c in checkins if c.get("received_condition") == "damaged"),
    }
    organization_id = checkins[0].get("organization_id") if checkins else ""
    summary = {
        "shipment_id": shipment_id,
        "outlet_id": outlet_id,
        "organization_id": organization_id,
        **totals,
        "checkin_completed": True,
        "checkin_completed_by_user_id": data.checkin_completed_by_user_id,
        "checkin_completed_at": _now(),
    }
    db["receiving_summaries"].update_one(
        {"shipment_id": shipment_id, "outlet_id": outlet_id},
        {"$set": summary},
        upsert=True,
    )

    # Auto-create AP invoice draft
    ap_id = _auto_create_ap_invoice(shipment_id, outlet_id, checkins)
    summary["auto_ap_invoice_id"] = ap_id

    _log_audit(
        organization_id,
        "checkin_completed",
        {"shipment_id": shipment_id, "outlet_id": outlet_id, "auto_ap_invoice_id": ap_id},
    )
    return summary


# ─────────────────────────────────────────────────────────────
# PO line lookup for ItemCheckinForm barcode scan (D3)
# ─────────────────────────────────────────────────────────────
@router.get("/po-lookup")
async def po_lookup(shipmentId: str = Query(...), sku: str = Query(...)):
    """Scan a barcode → resolve to the matching item.sku for the shipment's
    vendor; return item info + matching PO line (best effort). Frontend
    pre-populates the check-in form from this response."""
    if not shipmentId or not sku:
        raise HTTPException(400, "shipmentId and sku required")

    shipment = db["shipments"].find_one(
        {"id": shipmentId}, {"_id": 0, "id": 1, "vendor_id": 1, "delivery_schedule_id": 1}
    )
    if not shipment:
        raise HTTPException(404, "shipment not found")

    # Exact match first, then case-insensitive fallback
    item = db["items"].find_one(
        {"vendor_id": shipment["vendor_id"], "sku": sku}, {"_id": 0}
    )
    if not item:
        import re
        item = db["items"].find_one(
            {"vendor_id": shipment["vendor_id"], "sku": {"$regex": f"^{re.escape(sku)}$", "$options": "i"}},
            {"_id": 0},
        )
    if not item:
        return {"found": False, "sku": sku}

    # Find a PO line via the shipment's delivery_schedule.po_numbers
    po_line = None
    if shipment.get("delivery_schedule_id"):
        schedule = db["delivery_schedules"].find_one(
            {"id": shipment["delivery_schedule_id"]}, {"_id": 0, "po_numbers": 1}
        )
        po_numbers = (schedule or {}).get("po_numbers", []) or []
        if po_numbers:
            pos = list(
                db["purchase_orders"].find(
                    {"vendor_id": shipment["vendor_id"], "number": {"$in": po_numbers}},
                    {"_id": 0, "id": 1, "number": 1},
                )
            )
            po_ids = [p["id"] for p in pos]
            if po_ids:
                po_line = db["po_lines"].find_one(
                    {"po_id": {"$in": po_ids}, "sku": sku}, {"_id": 0}
                )

    return {"found": True, "sku": sku, "item": item, "po_line": po_line}
