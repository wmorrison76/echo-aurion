"""
Enhanced Purchasing & Receiving Hub — Unified module with Invoice OCR, GL codes, vendor receiving, PO management.
Consolidates Invoice Scanner into the P&R workflow where it logically belongs.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import os

router = APIRouter(prefix="/api/purchasing", tags=["purchasing"])

from database import db as _db
vendors_col = _db["pr_vendors"]
purchase_orders_col = _db["pr_purchase_orders"]
receiving_log_col = _db["pr_receiving_log"]
gl_codes_col = _db["pr_gl_codes"]
invoice_scans_col = _db["pr_invoice_scans"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════
# VENDORS
# ═══════════════════════════════════════════

@router.get("/vendors")
def list_vendors(status: Optional[str] = None):
    """List all vendors."""
    q = {}
    if status:
        q["status"] = status
    vendors = list(vendors_col.find(q, {"_id": 0}).sort("name", 1).limit(100))
    if not vendors:
        defaults = [
            {"vendor_id": f"v-{_uid()}", "name": "Blue Harbor Seafood Co.", "category": "seafood", "contact": "Mike Torres", "email": "orders@blueharborseafood.com", "phone": "(305) 555-0142", "payment_terms": "NET 30", "status": "active", "total_orders": 156, "ytd_spend": 287450.00, "rating": 4.7, "gl_code": "5000"},
            {"vendor_id": f"v-{_uid()}", "name": "Premium Meats Direct", "category": "proteins", "contact": "Sarah Chen", "email": "wholesale@premiummeats.com", "phone": "(305) 555-0198", "payment_terms": "NET 15", "status": "active", "total_orders": 234, "ytd_spend": 412300.00, "rating": 4.5, "gl_code": "5000"},
            {"vendor_id": f"v-{_uid()}", "name": "Valley Fresh Produce", "category": "produce", "contact": "Jorge Ramirez", "email": "sales@valleyfresh.com", "phone": "(305) 555-0167", "payment_terms": "COD", "status": "active", "total_orders": 312, "ytd_spend": 198700.00, "rating": 4.8, "gl_code": "5000"},
            {"vendor_id": f"v-{_uid()}", "name": "Artisan Dairy Group", "category": "dairy", "contact": "Emily White", "email": "orders@artisandairy.com", "phone": "(305) 555-0134", "payment_terms": "NET 30", "status": "active", "total_orders": 89, "ytd_spend": 67200.00, "rating": 4.3, "gl_code": "5010"},
            {"vendor_id": f"v-{_uid()}", "name": "Global Spice Imports", "category": "dry_goods", "contact": "Raj Patel", "email": "bulk@globalspice.com", "phone": "(305) 555-0211", "payment_terms": "NET 45", "status": "active", "total_orders": 48, "ytd_spend": 34500.00, "rating": 4.6, "gl_code": "5000"},
            {"vendor_id": f"v-{_uid()}", "name": "Crystal Clean Supplies", "category": "chemicals", "contact": "David Kim", "email": "orders@crystalclean.com", "phone": "(305) 555-0189", "payment_terms": "NET 30", "status": "active", "total_orders": 24, "ytd_spend": 18900.00, "rating": 4.1, "gl_code": "6500"},
        ]
        for v in defaults:
            v["created_at"] = _now()
            vendors_col.insert_one(v)
        vendors = list(vendors_col.find(q, {"_id": 0}).sort("name", 1))
    return {"vendors": vendors, "total": len(vendors)}


@router.post("/vendors")
def create_vendor(body: dict):
    """Create a new vendor."""
    vendor = {
        "vendor_id": f"v-{_uid()}",
        "name": body.get("name", ""),
        "category": body.get("category", "general"),
        "contact": body.get("contact", ""),
        "email": body.get("email", ""),
        "phone": body.get("phone", ""),
        "payment_terms": body.get("payment_terms", "NET 30"),
        "status": "active",
        "total_orders": 0,
        "ytd_spend": 0,
        "rating": 0,
        "gl_code": body.get("gl_code", "5000"),
        "created_at": _now(),
    }
    vendors_col.insert_one(vendor)
    del vendor["_id"]
    return vendor


# ═══════════════════════════════════════════
# PURCHASE ORDERS
# ═══════════════════════════════════════════

@router.get("/orders")
def list_purchase_orders(status: Optional[str] = None, vendor_id: Optional[str] = None, limit: int = 30):
    """List purchase orders."""
    q = {}
    if status:
        q["status"] = status
    if vendor_id:
        q["vendor_id"] = vendor_id
    orders = list(purchase_orders_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    if not orders:
        # Seed demo POs
        vendors = list(vendors_col.find({}, {"_id": 0, "vendor_id": 1, "name": 1}).limit(6))
        import random
        random.seed(42)
        for i in range(8):
            v = vendors[i % len(vendors)] if vendors else {"vendor_id": "v-demo", "name": "Demo Vendor"}
            items = []
            num_items = random.randint(3, 8)
            total = 0
            for j in range(num_items):
                qty = random.randint(2, 50)
                price = round(random.uniform(5, 80), 2)
                ext = round(qty * price, 2)
                total += ext
                items.append({"item_code": f"SKU-{1000+j}", "description": f"Item {j+1}", "quantity": qty, "unit_price": price, "extension": ext, "unit": "CASE"})

            po = {
                "po_id": f"PO-{20000+i}",
                "vendor_id": v["vendor_id"],
                "vendor_name": v.get("name", ""),
                "status": random.choice(["open", "open", "received", "received", "partially_received", "closed"]),
                "items": items,
                "subtotal": round(total, 2),
                "tax": round(total * 0.0825, 2),
                "total": round(total * 1.0825, 2),
                "delivery_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(-3, 7))).strftime("%Y-%m-%d"),
                "gl_code": "5000",
                "notes": "",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))).isoformat(),
            }
            purchase_orders_col.insert_one(po)
        orders = list(purchase_orders_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"orders": orders, "total": len(orders)}


@router.post("/orders")
def create_purchase_order(body: dict):
    """Create a new purchase order."""
    items = body.get("items", [])
    subtotal = sum(i.get("extension", 0) for i in items)
    po = {
        "po_id": f"PO-{_uid()}",
        "vendor_id": body.get("vendor_id", ""),
        "vendor_name": body.get("vendor_name", ""),
        "status": "open",
        "items": items,
        "subtotal": round(subtotal, 2),
        "tax": round(subtotal * 0.0825, 2),
        "total": round(subtotal * 1.0825, 2),
        "delivery_date": body.get("delivery_date", ""),
        "gl_code": body.get("gl_code", "5000"),
        "notes": body.get("notes", ""),
        "created_at": _now(),
    }
    purchase_orders_col.insert_one(po)
    del po["_id"]
    return po


# ═══════════════════════════════════════════
# RECEIVING LOG
# ═══════════════════════════════════════════

@router.post("/receive")
def receive_delivery(body: dict):
    """Log a vendor delivery / receiving event."""
    entry = {
        "receive_id": f"rcv-{_uid()}",
        "po_id": body.get("po_id", ""),
        "vendor_id": body.get("vendor_id", ""),
        "vendor_name": body.get("vendor_name", ""),
        "received_by": body.get("received_by", "Admin"),
        "items_received": body.get("items", []),
        "temperature_check": body.get("temperature_check", "pass"),
        "quality_check": body.get("quality_check", "pass"),
        "notes": body.get("notes", ""),
        "invoice_scan_id": body.get("invoice_scan_id"),
        "gl_code": body.get("gl_code", "5000"),
        "status": "received",
        "received_at": _now(),
    }
    receiving_log_col.insert_one(entry)
    del entry["_id"]

    # Update PO status
    if body.get("po_id"):
        purchase_orders_col.update_one(
            {"po_id": body["po_id"]},
            {"$set": {"status": "received", "received_at": _now()}},
        )

    return entry


@router.get("/receiving-log")
def get_receiving_log(limit: int = 30):
    """Get receiving history."""
    logs = list(receiving_log_col.find({}, {"_id": 0}).sort("received_at", -1).limit(limit))
    return {"logs": logs, "total": len(logs)}


# ═══════════════════════════════════════════
# GL CODES
# ═══════════════════════════════════════════

@router.get("/gl-codes")
def list_gl_codes():
    """List all GL codes for purchasing categorization."""
    codes = list(gl_codes_col.find({}, {"_id": 0}).sort("code", 1))
    if not codes:
        defaults = [
            {"code": "5000", "name": "Cost of Goods - Food", "category": "COGS", "description": "All food purchases including proteins, produce, dairy, dry goods"},
            {"code": "5010", "name": "Cost of Goods - Beverage", "category": "COGS", "description": "All beverage purchases including wine, spirits, beer, non-alcoholic"},
            {"code": "5020", "name": "Cost of Goods - Catering", "category": "COGS", "description": "Catering-specific food and beverage costs"},
            {"code": "5100", "name": "Paper & Disposables", "category": "COGS", "description": "Napkins, to-go containers, disposable serviceware"},
            {"code": "6000", "name": "Labor - Kitchen", "category": "Labor", "description": "Kitchen staff wages, overtime, and benefits"},
            {"code": "6010", "name": "Labor - FOH", "category": "Labor", "description": "Front of house staff wages and benefits"},
            {"code": "6500", "name": "Supplies & Smallwares", "category": "Expense", "description": "Cleaning chemicals, smallwares, equipment under $500"},
            {"code": "6600", "name": "Uniform & Laundry", "category": "Expense", "description": "Staff uniforms, linen service, laundry costs"},
            {"code": "7000", "name": "Rent & Occupancy", "category": "Overhead", "description": "Rent, CAM charges, property tax"},
            {"code": "7500", "name": "Utilities", "category": "Overhead", "description": "Electric, gas, water, waste removal"},
            {"code": "8000", "name": "Marketing & Promotions", "category": "Marketing", "description": "Advertising, social media, promotions, PR"},
            {"code": "8500", "name": "Repairs & Maintenance", "category": "Maintenance", "description": "Equipment repairs, building maintenance, HVAC"},
        ]
        for c in defaults:
            c["gl_id"] = f"gl-{_uid()}"
            c["created_at"] = _now()
            gl_codes_col.insert_one(c)
        codes = list(gl_codes_col.find({}, {"_id": 0}).sort("code", 1))
    return {"gl_codes": codes, "total": len(codes)}


@router.post("/gl-codes")
def create_gl_code(body: dict):
    """Create a new GL code."""
    gl = {
        "gl_id": f"gl-{_uid()}",
        "code": body.get("code", ""),
        "name": body.get("name", ""),
        "category": body.get("category", "Expense"),
        "description": body.get("description", ""),
        "created_at": _now(),
    }
    gl_codes_col.insert_one(gl)
    del gl["_id"]
    return gl


# ═══════════════════════════════════════════
# INVOICE SCANS — history for OCR results
# ═══════════════════════════════════════════

@router.get("/invoice-scans")
def list_invoice_scans(limit: int = 20):
    """Get history of invoice scans done through P&R."""
    scans = list(invoice_scans_col.find({}, {"_id": 0}).sort("scanned_at", -1).limit(limit))
    return {"scans": scans, "total": len(scans)}


@router.post("/invoice-scans")
def log_invoice_scan(body: dict):
    """Log an invoice scan result for audit trail."""
    scan = {
        "scan_id": f"iscan-{_uid()}",
        "filename": body.get("filename", ""),
        "vendor_name": body.get("vendor_name", ""),
        "invoice_number": body.get("invoice_number", ""),
        "po_number": body.get("po_number", ""),
        "total": body.get("total", 0),
        "line_count": body.get("line_count", 0),
        "match_status": body.get("match_status", "pending"),
        "gl_code": body.get("gl_code", "5000"),
        "scanned_by": body.get("scanned_by", "Admin"),
        "scanned_at": _now(),
    }
    invoice_scans_col.insert_one(scan)
    del scan["_id"]
    return scan


# ═══════════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════════

@router.get("/dashboard")
def purchasing_dashboard():
    """Unified P&R dashboard KPIs."""
    vendors = vendors_col.count_documents({"status": "active"})
    open_pos = purchase_orders_col.count_documents({"status": "open"})
    received_today = receiving_log_col.count_documents({"received_at": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}})
    total_scans = invoice_scans_col.count_documents({})
    gl_count = gl_codes_col.count_documents({})

    # YTD spend
    all_vendors = list(vendors_col.find({}, {"_id": 0, "ytd_spend": 1}))
    ytd_spend = sum(v.get("ytd_spend", 0) for v in all_vendors)

    return {
        "active_vendors": vendors,
        "open_purchase_orders": open_pos,
        "deliveries_today": received_today,
        "invoice_scans": total_scans,
        "gl_codes": gl_count,
        "ytd_spend": round(ytd_spend, 2),
    }
