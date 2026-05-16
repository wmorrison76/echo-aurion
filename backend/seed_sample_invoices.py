"""
LUCCCA · Invoice Sample Seeder (iter266.7)
==========================================
William asked for "sample invoices … the invoice scanner has over 80+ invoices
from different vendors". The scanner output JSON at
`/app/scripts/outputs/invoice-to-pos-*-comprehensive-results.json` holds
parsed line items from culinary + pastry deliveries (Sysco / US Foods /
Gordon Food Service). This seeder bridges them into the live invoice
ingestion path so:

  1. Sample invoices show in the Invoice list (`GET /api/invoices`)
  2. `vendor_skus` is populated → recipes can look up real cost-per-unit
  3. A `purchase_approval_request` is auto-created → approvals banner lights up
  4. The 3 William PDF invoices (cusanos / halperns / mr greens) keep showing
     since their seeder runs separately.

Run via:

    from seed_sample_invoices import seed_sample_invoices
    seed_sample_invoices()

Called from server.py startup. Idempotent — uses the `seed_marker` field.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

import database
from routes.invoice_ingest import _ingest_one as ingest_invoice_doc

db = database.db
SCANNER_OUTPUTS = Path("/app/scripts/outputs")

# Map our 3 scanner-output vendors to slug-friendly vendor codes
VENDOR_OUTLET_MAP = {
    "Sysco Corporation":   "Main Kitchen",
    "US Foods":            "Banquet Kitchen",
    "Gordon Food Service": "Bakery / Pastry",
}

# Map module → who is the requesting role (for approval routing)
MODULE_REQUESTER = {
    "culinary": "souschef_user",
    "pastry":   "pastrychef_user",
}


def _coerce_line(line: dict) -> dict:
    """Normalize a scanner line item into the IngestPayload shape."""
    qty = float(line.get("quantity", 0))
    unit_price = float(line.get("unitPrice", 0))
    total_price = float(line.get("totalPrice", 0)) or round(qty * unit_price, 2)
    return {
        "item_code": line.get("itemCode") or (line.get("productName", "")[:18] or None),
        "description": line.get("productName", ""),
        "quantity": qty,
        "unit_of_measure": (line.get("unit") or "EA").upper(),
        "unit_price": unit_price,
        "extended_price": total_price,
        "pack_size": line.get("packSize"),
    }


def _load_module_file(module: str) -> list[dict]:
    fname = SCANNER_OUTPUTS / f"invoice-to-pos-{module}-comprehensive-results.json"
    if not fname.exists():
        return []
    with open(fname) as f:
        d = json.load(f)
    return d.get("invoices", [])


def seed_sample_invoices() -> dict:
    """Ingest the scanner-output JSON files into the live invoice pipeline."""
    if db["invoices"].count_documents({"seed_marker": "scanner-sample-iter266"}) > 0:
        return {"already_seeded": True, "ingested": 0}

    ingested = 0
    skipped = 0
    by_vendor: dict[str, int] = {}

    for module in ("culinary", "pastry"):
        for inv in _load_module_file(module):
            vendor = inv.get("vendorName") or "Unknown Vendor"
            inv_number = inv.get("invoiceNumber") or inv.get("invoiceId") or ""
            inv_date = inv.get("invoiceDate") or "2026-04-30"
            total_amount = float(inv.get("totalAmount") or 0)
            lines = [_coerce_line(li) for li in inv.get("lineItems", [])]
            if not lines:
                skipped += 1
                continue

            outlet = VENDOR_OUTLET_MAP.get(vendor, f"{module.title()} Department")

            payload = {
                "vendor_name": vendor,
                "invoice_number": inv_number,
                "invoice_date": inv_date,
                "pdf_filename": None,  # scanner output, no PDF on disk
                "outlet": outlet,
                "company": "Pier Sixty-Six · Resort",
                "total_amount": total_amount,
                "subtotal": total_amount,
                "tax": 0,
                "lines": lines,
                "requested_by_id": MODULE_REQUESTER.get(module, "purchasing_manager_user"),
            }
            doc = ingest_invoice_doc(payload)
            # Tag with seed marker so we don't re-ingest
            db["invoices"].update_one(
                {"id": doc["id"]},
                {"$set": {"seed_marker": "scanner-sample-iter266", "source_module": module}},
            )
            ingested += 1
            by_vendor[vendor] = by_vendor.get(vendor, 0) + 1

    print(f"[seed-invoices] +{ingested} sample invoices ingested "
          f"(skipped {skipped}); by_vendor={by_vendor}")
    return {"ingested": ingested, "skipped": skipped, "by_vendor": by_vendor}
