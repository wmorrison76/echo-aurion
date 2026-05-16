"""
iter253 · Invoice Ingest + Vendor SKU pricing
============================================
Receives parsed vendor invoices (Cusano's, Halpern's, Mr. Greens, Sysco, etc.)
and:
  1. Stores invoice header + lines in MongoDB
  2. Updates the `vendor_skus` price-history collection so recipes can lookup
     current cost by ingredient name (fuzzy match on description)
  3. Auto-creates a `purchase_approval_request` linked to the invoice so the
     proper approver (per role-limit hierarchy) sees it on the top banner
     with a "+" drawer showing the actual invoice PDF.

Seed function at startup ingests William's 3 uploaded invoices
(`/app/backend/static/invoices/*.pdf`) so the workflow is demo-ready.
"""
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database import db

router = APIRouter(prefix="/api/invoices", tags=["invoices"])
sku_router = APIRouter(prefix="/api/vendor-skus", tags=["vendor-skus"])

INVOICE_DIR = Path(__file__).resolve().parent.parent / "static" / "invoices"
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: f"inv-{uuid4().hex[:10]}"


class InvoiceLine(BaseModel):
    item_code: Optional[str] = None
    description: str
    quantity: float = 0
    unit_of_measure: Optional[str] = "EA"
    unit_price: float = 0
    extended_price: float = 0
    pack_size: Optional[str] = None


class IngestPayload(BaseModel):
    vendor_name: str
    invoice_number: str
    invoice_date: str
    pdf_filename: Optional[str] = None     # served via /api/invoices/file/{name}
    outlet: Optional[str] = "Unassigned"
    company: Optional[str] = "EchoBook Editorial"   # legal: no real names
    total_amount: float = 0
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    lines: List[InvoiceLine] = []
    requested_by_id: Optional[str] = "purchasing_manager_user"


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def _ingest_one(payload: dict) -> dict:
    inv_id = _uid()
    doc = {
        "id": inv_id,
        "vendor_name": payload.get("vendor_name", "Unknown"),
        "invoice_number": payload.get("invoice_number", ""),
        "invoice_date": payload.get("invoice_date", ""),
        "pdf_filename": payload.get("pdf_filename"),
        "outlet": payload.get("outlet") or "Unassigned",
        "company": payload.get("company") or "EchoBook Editorial",
        "total_amount": float(payload.get("total_amount") or 0),
        "subtotal": float(payload.get("subtotal") or payload.get("total_amount") or 0),
        "tax": payload.get("tax"),
        "lines": payload.get("lines") or [],
        "ingested_at": _now(),
    }
    db["invoices"].update_one({"id": inv_id}, {"$set": {**doc, "_id": inv_id}}, upsert=True)

    # ── Update vendor SKU price history ─────────────────────────────
    for ln in doc["lines"]:
        sku_key = ln.get("item_code") or _slug(ln.get("description", ""))[:40] or str(uuid4())[:8]
        sku_id = f"{doc['vendor_name'][:18].lower().replace(' ', '_')}::{sku_key}"
        db["vendor_skus"].update_one(
            {"id": sku_id},
            {"$set": {
                "id": sku_id,
                "vendor_name": doc["vendor_name"],
                "item_code": ln.get("item_code"),
                "description": ln.get("description"),
                "_search": _slug(ln.get("description", "")),
                "current_unit_price": float(ln.get("unit_price") or 0),
                "current_uom": ln.get("unit_of_measure"),
                "pack_size": ln.get("pack_size"),
                "last_invoice_id": inv_id,
                "last_invoice_number": doc["invoice_number"],
                "last_invoice_date": doc["invoice_date"],
                "updated_at": _now(),
            },
             "$push": {"price_history": {
                 "invoice_id": inv_id, "invoice_number": doc["invoice_number"],
                 "date": doc["invoice_date"], "qty": ln.get("quantity"),
                 "unit_price": ln.get("unit_price"), "uom": ln.get("unit_of_measure"),
            }}},
            upsert=True)

    # ── Create approval request (auto-routes via hierarchy) ─────────
    try:
        from routes.purchasing_approvals import _required_approver, _get_role_config
        requester_id = payload.get("requested_by_id") or "purchasing_manager_user"
        rec = db["auth_users"].find_one({"id": requester_id}, {"_id": 0, "password_hash": 0}) or {}
        role = rec.get("role", "purchasing-manager")
        cfg = _get_role_config(role)
        amount = doc["total_amount"]
        needs = _required_approver(amount, role)
        ar_id = f"pa-{uuid4().hex[:10]}"
        ar_doc = {
            "id": ar_id, "_id": ar_id,
            "requested_by_id": requester_id,
            "requested_by_name": rec.get("name", "Purchasing"),
            "requested_by_role": role,
            "requested_by_role_label": cfg.get("label", role),
            "outlet": doc["outlet"],
            "company": doc["company"],
            "vendor": doc["vendor_name"],
            "item_description":
                f"Invoice {doc['invoice_number']} · {doc['vendor_name']} · "
                f"{len(doc['lines'])} lines",
            "amount": amount,
            "notes": f"Auto-ingested invoice. {len(doc['lines'])} line items.",
            "link_to": inv_id,
            "invoice_id": inv_id,
            "category": "invoice",
            "status": "auto-approved" if needs is None else "pending",
            "current_approver_role": needs,
            "approval_chain": [],
            "created_at": _now(),
            "updated_at": _now(),
            "limit_at_creation": cfg.get("limit"),
        }
        db["purchase_approval_requests"].insert_one(ar_doc)
        doc["approval_request_id"] = ar_id
    except Exception as e:
        doc["approval_error"] = str(e)
    return doc


def seed_william_invoices():
    """Idempotent — ingest William's 3 uploaded PDFs as parsed invoice records."""
    if db["invoices"].count_documents({"seed_marker": "william-iter253"}) >= 3:
        return    # already seeded

    # Manually-extracted line items (extracted via document AI; see iter253 PRD).
    invoices = [
        {
            "vendor_name": "Cusanos Italian Bakery",
            "invoice_number": "6243401",
            "invoice_date": "2026-04-23",
            "pdf_filename": "cusanos_6243401.pdf",
            "outlet": "Bakery / Pastry",
            "company": "EchoBook Editorial · Resort",
            "total_amount": 91.15,
            "subtotal": 91.15, "tax": 0,
            "requested_by_id": "demo-hourly-001",
            "lines": [
                {"item_code": "DCH-T", "description": "Deli Challah Sliced Thick",
                 "quantity": 8, "unit_of_measure": "PC", "unit_price": 5.89, "extended_price": 47.12},
                {"item_code": "DWH-T", "description": "Deli Wheat Sliced Thick",
                 "quantity": 3, "unit_of_measure": "PC", "unit_price": 4.53, "extended_price": 13.59},
                {"item_code": "DWT-T", "description": "Deli White Sliced Thick",
                 "quantity": 4, "unit_of_measure": "PC", "unit_price": 4.02, "extended_price": 16.08},
                {"item_code": "HMG-T", "description": "Hearth Multigrain Sliced Thick",
                 "quantity": 2, "unit_of_measure": "PC", "unit_price": 7.18, "extended_price": 14.36},
            ],
        },
        {
            "vendor_name": "Halperns",
            "invoice_number": "12118378",
            "invoice_date": "2026-04-23",
            "pdf_filename": "halperns_12118378.pdf",
            "outlet": "Signature Italian",
            "company": "EchoBook Editorial · Resort",
            "total_amount": 88.40,
            "subtotal": 88.40, "tax": 0,
            "requested_by_id": "demo-hourly-001",
            "lines": [
                {"item_code": "44-00590",
                 "description": "Chicken Breast ABF 8oz Double Lobe S/L 20#",
                 "quantity": 1, "unit_of_measure": "CS", "unit_price": 4.42,
                 "extended_price": 88.40, "pack_size": "20#"},
            ],
        },
        {
            "vendor_name": "Mr Greens",
            "invoice_number": "NC9994",
            "invoice_date": "2026-04-25",
            "pdf_filename": "mrgreens_NC9994.pdf",
            "outlet": "All Outlets · Produce + Dairy",
            "company": "EchoBook Editorial · Resort",
            "total_amount": 2950.64,
            "subtotal": 2950.64, "tax": 0,
            "requested_by_id": "sous_chef_user",
            "lines": [
                {"item_code": "16005", "description": "Avocado Hass 48 CT Ripe", "quantity": 2, "unit_of_measure": "CASE", "unit_price": 37.66, "extended_price": 75.32},
                {"item_code": "16021", "description": "Banana Green Tip 40#", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 24.94, "extended_price": 24.94},
                {"item_code": "12001", "description": "Berry Black 12x6oz", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 28.39, "extended_price": 28.39},
                {"item_code": "12002", "description": "Berry Blue 12x6oz", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 47.15, "extended_price": 47.15},
                {"item_code": "12003", "description": "Berry Raspberry 12x6oz", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 36.52, "extended_price": 36.52},
                {"item_code": "12004", "description": "Berry Strawberry 8x16oz", "quantity": 3, "unit_of_measure": "CASE", "unit_price": 23.61, "extended_price": 70.83},
                {"item_code": "31002", "description": "Butter 82% Plugra Unsalted 36/1#", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 130.00, "extended_price": 130.00},
                {"item_code": "31050", "description": "Buttermilk 9/.5gl", "quantity": 2, "unit_of_measure": "CASE", "unit_price": 37.04, "extended_price": 74.08},
                {"item_code": "15002", "description": "Cantaloupe 12 CT", "quantity": 3, "unit_of_measure": "CASE", "unit_price": 27.96, "extended_price": 83.88},
                {"item_code": "31120", "description": "Cheese Brie Wheel 2/2#", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 24.90, "extended_price": 24.90},
                {"item_code": "31124", "description": "Cheese Cheddar Wh Shred 4/5#", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 56.12, "extended_price": 56.12},
                {"item_code": "31144", "description": "Cheese Cotija Grated 6/2.2#", "quantity": 2, "unit_of_measure": "EA", "unit_price": 18.59, "extended_price": 37.18},
                {"item_code": "31177", "description": "Cheese Goat Crumbles 2/2#", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 33.38, "extended_price": 33.38},
                {"item_code": "31254", "description": "Cheese Parmesan Shaved 4x5#", "quantity": 2, "unit_of_measure": "EA", "unit_price": 24.14, "extended_price": 48.28},
                {"item_code": "31272", "description": "Cheese Ricotta Fr Tins Lioni 12/3#", "quantity": 1, "unit_of_measure": "EA", "unit_price": 17.68, "extended_price": 17.68},
                {"item_code": "21010", "description": "Cilantro 60 CT", "quantity": 1, "unit_of_measure": "HALF", "unit_price": 21.15, "extended_price": 21.15},
                {"item_code": "35004", "description": "Coleslaw Shredded 4/5#", "quantity": 2, "unit_of_measure": "CASE", "unit_price": 28.45, "extended_price": 56.90},
                {"item_code": "24070", "description": "Dill 1#", "quantity": 1, "unit_of_measure": "LB", "unit_price": 13.52, "extended_price": 13.52},
                {"item_code": "63430", "description": "Flour All Purpose 25LB", "quantity": 2, "unit_of_measure": "BAG", "unit_price": 14.58, "extended_price": 29.16},
                {"item_code": "50034", "description": "Frozen Acai Scoopable Tub 7L", "quantity": 2, "unit_of_measure": "CASE", "unit_price": 59.77, "extended_price": 119.54},
                {"item_code": "14002", "description": "Grape Green Seedless CS", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 45.23, "extended_price": 45.23},
                {"item_code": "14003", "description": "Grape Red Seedless CS", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 34.78, "extended_price": 34.78},
                {"item_code": "34011", "description": "Heavy Cream 36% 12/1pt", "quantity": 2, "unit_of_measure": "CASE", "unit_price": 34.99, "extended_price": 69.98},
                {"item_code": "15011", "description": "Honeydew 6 CT", "quantity": 4, "unit_of_measure": "CASE", "unit_price": 31.73, "extended_price": 126.92},
                {"item_code": "21105", "description": "Kale Baby 3#", "quantity": 2, "unit_of_measure": "CASE", "unit_price": 21.43, "extended_price": 42.86},
                {"item_code": "21200", "description": "Lettuce Arcadian Mix 4/3#", "quantity": 2, "unit_of_measure": "CASE", "unit_price": 39.74, "extended_price": 79.48},
                {"item_code": "21396", "description": "Lettuce Hydro Boston 12 CT", "quantity": 4, "unit_of_measure": "CASE", "unit_price": 26.00, "extended_price": 104.00},
                {"item_code": "21550", "description": "Lettuce Romaine Heart 12/3", "quantity": 1, "unit_of_measure": "CASE", "unit_price": 41.09, "extended_price": 41.09},
            ],
        },
    ]
    for inv in invoices:
        d = _ingest_one(inv)
        db["invoices"].update_one({"id": d["id"]},
            {"$set": {"seed_marker": "william-iter253"}})

    try:
        db["invoices"].create_index("id", unique=True)
        db["vendor_skus"].create_index("id", unique=True)
        db["vendor_skus"].create_index("_search")
    except Exception:
        pass


# ───────────────────────── Endpoints ─────────────────────────
@router.post("/ingest")
def ingest_invoice(body: IngestPayload):
    """Public ingest — accepts pre-parsed invoice JSON, returns invoice + auto-PR."""
    return _ingest_one(body.dict())


@router.get("")
def list_invoices(limit: int = 50, vendor: Optional[str] = None):
    q = {}
    if vendor:
        q["vendor_name"] = {"$regex": vendor, "$options": "i"}
    rows = list(db["invoices"].find(q, {"_id": 0}).sort("ingested_at", -1).limit(limit))
    return {"rows": rows, "count": len(rows)}


@router.get("/{inv_id}")
def get_invoice(inv_id: str):
    doc = db["invoices"].find_one({"id": inv_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "invoice not found")
    return doc


@router.get("/file/{filename}")
def get_invoice_pdf(filename: str):
    safe = re.sub(r"[^a-zA-Z0-9._-]", "", filename)
    path = INVOICE_DIR / safe
    if not path.exists():
        raise HTTPException(404, "pdf not found")
    return FileResponse(path, media_type="application/pdf",
                        filename=safe)


# ── SKU lookup for recipe pricing ──
@sku_router.get("/lookup")
def lookup_sku(q: str = Query(..., min_length=2, description="ingredient name to match"),
               limit: int = 5,
               outlet_id: Optional[str] = Query(None, description="restrict to SKUs received at this outlet (C0.3)")):
    """Fuzzy-match recipe ingredient text to vendor SKU(s) for live cost lookup.
    Strategy: token-overlap scoring on `_search` field. Returns top N matches
    with current price.

    C0.3: when outlet_id is supplied, candidate SKUs are filtered to those
    whose most recent invoice was destined for that outlet (last_invoice_outlet),
    OR whose vendor has a delivery profile matching the outlet. Without an
    outlet filter the lookup falls back to the global pool — matches the
    historical behavior so existing callers keep working.
    """
    qslug = _slug(q)
    if not qslug:
        return {"matches": []}
    qtokens = set(qslug.split())

    # Pull candidates that share any token (uses regex OR for speed)
    rx = "|".join(re.escape(t) for t in qtokens if len(t) >= 3)
    if not rx:
        rx = re.escape(qslug)
    base_filter = {"_search": {"$regex": rx, "$options": "i"}}
    if outlet_id:
        # Outlet-scoped: SKU must have been received at this outlet OR be
        # part of the outlet's vendor delivery profile.
        base_filter = {
            "$and": [
                base_filter,
                {"$or": [
                    {"last_invoice_outlet": outlet_id},
                    {"outlet_destinations": outlet_id},
                ]},
            ]
        }
    candidates = list(db["vendor_skus"].find(
        base_filter,
        {"_id": 0, "price_history": 0}).limit(120))

    scored = []
    for c in candidates:
        cs = set((c.get("_search") or "").split())
        common = qtokens & cs
        if not common:
            continue
        score = len(common) / max(len(qtokens), 1)
        scored.append((score, c))
    scored.sort(key=lambda x: (-x[0], -(x[1].get("current_unit_price") or 0)))
    out = []
    for s, c in scored[:limit]:
        out.append({**c, "match_score": round(s, 3)})
    return {"matches": out, "query": q}


@sku_router.get("/all")
def list_all_skus(vendor: Optional[str] = None, limit: int = 200):
    q = {}
    if vendor:
        q["vendor_name"] = {"$regex": vendor, "$options": "i"}
    rows = list(db["vendor_skus"].find(q, {"_id": 0, "price_history": 0})
                .sort("description", 1).limit(limit))
    return {"rows": rows, "count": len(rows)}
