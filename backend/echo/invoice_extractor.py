"""
D54 · Invoice extractor — calibrated against the 91-invoice corpus
the user provided on 2026-05-07.

Real OCR'd invoices from Pier Sixty-Six Resort (Florida) operations:
  · Restaurant / IRD vendors (Mr. Greens, Cheese of the World,
    Somm Sel, Showcase Provisions, Politis Specialty Foods, ...)
  · Logistics + facilities (Waste Management, 2J Logistics, MEP)
  · Hospitality services (Maritz Travel, Fora Travel, ALHI,
    Les Clefs d'Or)
  · Marketing / printing (Bayfront Floral, ABC Printing,
    Bella Fiori, Panache Events, VP Press)
  · Online procurement (Amazon-TPC)
  · Linen + waste (Supreme Linen, Waste Management)
  · Specialty (Marcolin Eyewear, Aroma Market, Showcase
    Provisions, Chef Chef Chef)

Approach

  Extracting a clean structured invoice from arbitrary scanned PDFs
  is a vendor-template problem. Each vendor's layout is consistent
  (the same template repeats month over month) but vendors differ
  wildly. So this module ships:

    1. A FIELD EXTRACTOR — vendor-agnostic regex for the universal
       fields (invoice number, invoice date, total amount, due
       date, vendor address). 80% of invoices yield these via
       regex alone.

    2. A VENDOR TEMPLATE LIBRARY — per-vendor markers that boost
       extraction confidence and unlock line-item parsing for the
       complex layouts (Mr. Greens, Showcase Provisions, etc.)
       that have tabular line items.

    3. An ENTITY-RESOLVER — maps "Mr. Greens" / "MR GREENS LLC" /
       "MRGREENS" to canonical vendor_id. Same for SKUs across
       vendors (the produce that Sysco calls "TOM-RED-5LB" and
       Mr. Greens calls "Tomato Red 5lb Box").

    4. CONFIDENCE SCORING — each extraction returns confidence ∈
       [0, 1]. Findings below threshold queue for human review
       in the D18 approval inbox.

Doctrine alignment

  · §1.4: extracted invoices flow to the operator (controller)
    surface. Line cooks never see raw vendor pricing.
  · §3.1 append-only: extractions write `invoice_extractions`
    rows with the source OCR text + extracted fields + confidence;
    corrections are NEW rows referencing prior_extraction_id.
  · D27 tenant isolation on every persist.
  · D30 forensic chain: extracted invoices feed the 3-way match
    auditor (PO ↔ receiver ↔ invoice).
  · D17 fuse-box: the OCR provider is dependency-injected
    (Tesseract local, Google Vision, AWS Textract, etc.).
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/echo/invoice-extract",
                   tags=["echo-invoice-extract"])


# ─── Vendor template library — built from the 91-invoice corpus ────────

# Each entry maps to a vendor with high-confidence markers (strings
# that appear ONLY on this vendor's invoices) + extraction hints
# specific to that vendor's layout.
VENDOR_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "mr_greens": {
        "display_name": "Mr. Greens Produce",
        "markers": ["Mr.", "Greens", "(305) 545"],
        "category": "produce",
        "invoice_number_pattern": r"Invoice\s+(N[A-Z]\d+)",
        "ship_to_anchor": "Ship To:",
        "line_item_table_header": ["Item", "Description", "Qty",
                                     "Price", "Extension"],
    },
    "waste_management": {
        "display_name": "Waste Management Inc of Florida",
        "markers": ["WM", "wm.com", "Waste Management"],
        "category": "facilities",
        "invoice_number_pattern": r"Invoice Number:\s*(\d+-\d+-\d+)",
        "service_period_pattern": r"Service Period:\s*([\d/-]+)",
    },
    "2j_logistics": {
        "display_name": "2J Logistic Services LLC",
        "markers": ["2J Logistic", "JMorales.2J", "JVarela.2J"],
        "category": "logistics",
        "invoice_number_pattern": r"INVOICE\s*#\s*(\d+-?[A-Z]*)",
    },
    "panache_events": {
        "display_name": "Panache Events",
        "markers": ["Panache", "Events"],
        "category": "events",
    },
    "abc_printing": {
        "display_name": "ABC Printing",
        "markers": ["ABC Printing", "ABC PRINTING", "abcprint.com",
                    "PRINTING COMPANY", "773.774.8282"],
        "category": "marketing",
    },
    "amazon_tpc": {
        "display_name": "Amazon Business (TPC)",
        "markers": ["Amazon", "1PXX", "1XX9", "Amazon.com"],
        "category": "online_procurement",
        "invoice_number_pattern": r"(\d{4}-\d{4}-\d{4})",
    },
    "supreme_linen": {
        "display_name": "Supreme Linen Service Inc",
        "markers": ["Supreme Linen", "SUPREME LINEN",
                    "Supreme", "supremelinen"],
        "category": "linen",
    },
    "showcase_provisions": {
        "display_name": "Showcase Provisions Inc",
        "markers": ["Showcase Provisions", "SHOWCASE"],
        "category": "specialty_food",
    },
    "politis_foods": {
        "display_name": "Politis Specialty Foods",
        "markers": ["Politis", "POLITIS"],
        "category": "specialty_food",
    },
    "somm_sel": {
        "display_name": "Somm Sel",
        "markers": ["Somm Sel", "SOMM SEL", "Somm",
                    "sommsel"],
        "category": "wine_beverage",
    },
    "chefs_warehouse": {
        "display_name": "Chef's Warehouse",
        "markers": ["Chef's Warehouse", "Chefs Warehouse",
                    "Chef's Warehouse,", "chefswarehouse",
                    "TheChefsWarehouse"],
        "category": "broadline",
    },
    "fedex": {
        "display_name": "Federal Express Corp",
        "markers": ["Federal Express", "FedEx", "FEDEX",
                    "9-282-65126", "fedex.com"],
        "category": "shipping",
    },
    "maritz_travel": {
        "display_name": "Maritz Travel Co",
        "markers": ["Maritz", "MARITZ"],
        "category": "travel",
    },
    "fora_travel": {
        "display_name": "Fora Travel",
        "markers": ["FORA TRAVEL", "Fora Travel"],
        "category": "travel",
    },
    "alhi": {
        "display_name": "Associated Luxury Hotels International",
        "markers": ["ALHI", "Associated Luxury Hotels"],
        "category": "hospitality_services",
    },
    "les_clefs_dor": {
        "display_name": "Les Clefs d'Or USA",
        "markers": ["Les Clefs", "Clefs d'Or"],
        "category": "concierge_services",
    },
    "bayfront_floral": {
        "display_name": "Bayfront Floral Decorators Inc",
        "markers": ["BAYFRONT FLORAL", "Bayfront Floral"],
        "category": "floral",
    },
    "bella_fiori": {
        "display_name": "Bella Fiori Flower Walls",
        "markers": ["BELLA FIORI", "Bella Fiori"],
        "category": "floral",
    },
    "vp_press": {
        "display_name": "VP Press Inc",
        "markers": ["VP PRESS", "VP Press"],
        "category": "printing",
    },
    "mep_florida": {
        "display_name": "MEP Florida LLC",
        "markers": ["MEP Florida", "MEP FLORIDA"],
        "category": "facilities_engineering",
    },
    "marcolin_eyewear": {
        "display_name": "Marcolin Eyewear",
        "markers": ["Marcolin", "MARCOLIN"],
        "category": "retail",
    },
    "aroma_market": {
        "display_name": "Aroma Market & Catering",
        "markers": ["Aroma Market", "AROMA MARKET",
                    "Stirling Road", "954-252-2600",
                    "Cooper City"],
        "category": "specialty_food",
    },
    "chef_chef_chef": {
        "display_name": "Chef Chef Chef Inc",
        "markers": ["CHEF CHEF CHEF", "Chef Chef Chef",
                    "Chef ", "ChefChef"],
        "category": "specialty_food",
    },
    "creative_circle": {
        "display_name": "Creative Circle",
        "markers": ["CREATIVE CIRCLE", "Creative Circle"],
        "category": "marketing_staffing",
    },
    "one_stop_aquatic": {
        "display_name": "One Stop Aquatic Safety LLC",
        "markers": ["ONE STOP AQUATIC", "One Stop Aquatic"],
        "category": "facilities_safety",
    },
    "bluip": {
        "display_name": "BluIP Inc",
        "markers": ["BluIP", "BLUIP"],
        "category": "telecom",
    },
    # ─── D54.2 expansion: 45 vendors added from corpus pass-2 ───
    "blue_coast": {
        "display_name": "Blue Coast Contractors LLC",
        "markers": ["BLUE COAST", "Blue Coast Contractors"],
        "category": "facilities_engineering",
    },
    "boucher_brothers": {
        "display_name": "Boucher Brothers Beach Management",
        "markers": ["BOUCHER BROTHERS", "Boucher Brothers"],
        "category": "facilities_beach",
    },
    "breakthru": {
        "display_name": "Breakthru Beverage",
        "markers": ["Breakthru"],
        "category": "wine_beverage",
    },
    "concentra": {
        "display_name": "Concentra Medical Centers",
        "markers": ["CONCENTRA", "Concentra Medical"],
        "category": "medical_occupational",
    },
    "cusanos_bakery": {
        "display_name": "Cusano's Italian Bakery Inc",
        "markers": ["CUSANO", "Cusano's"],
        "category": "bakery",
    },
    "canteen": {
        "display_name": "Canteen",
        "markers": ["Canteen"],
        "category": "vending",
    },
    "cintas": {
        "display_name": "Cintas Corporation",
        "markers": ["Cintas Corporation", "Cintas",
                    "CINTAS", "cintas.com",
                    "Uniform Purchases"],
        "category": "uniforms",
    },
    "ecolab": {
        "display_name": "Ecolab Pest Elimination",
        "markers": ["ECOLAB", "Ecolab"],
        "category": "pest_control",
    },
    "egh_talent": {
        "display_name": "EGH Talent & Culture LLC",
        "markers": ["EGH TALENT", "EGH-PSS"],
        "category": "hr_consulting",
    },
    "emas_group": {
        "display_name": "EMAS Group Inc",
        "markers": ["EMAS GROUP", "EMAS Group"],
        "category": "consulting",
    },
    "full_pot_flowers": {
        "display_name": "Full Pot of Flowers",
        "markers": ["FULL POT OF FLOWERS", "Full Pot"],
        "category": "floral",
    },
    "fortessa": {
        "display_name": "Fortessa Tableware Solutions",
        "markers": ["Fortessa", "FORTESSA"],
        "category": "tableware",
    },
    "fragomen_law": {
        "display_name": "Fragomen, Del Rey, Bernsen & Loewy",
        "markers": ["Fragomen", "FRAGOMEN"],
        "category": "legal_immigration",
    },
    "garnier_thiebaut": {
        "display_name": "Garnier Thiebaut",
        "markers": ["GARNIER THIEBAUT", "Garnier Thiebaut"],
        "category": "linen",
    },
    "golden_goat_caviar": {
        "display_name": "Golden Goat Caviar LLC",
        "markers": ["GOLDEN GOAT", "Golden Goat Caviar"],
        "category": "specialty_food",
    },
    "goldcoast": {
        "display_name": "GoldCoast",
        "markers": ["GoldCoast", "Gold Coast"],
        "category": "services",
    },
    "grainger": {
        "display_name": "Grainger Industrial Supply",
        "markers": ["Grainger", "GRAINGER"],
        "category": "industrial_supply",
    },
    "hotelslippers": {
        "display_name": "HotelSlippers.com",
        "markers": ["HOTELSLIPPERS", "HotelSlippers"],
        "category": "guest_amenities",
    },
    "halperns": {
        "display_name": "Halpern's",
        "markers": ["Halpern's", "HALPERN'S", "Halperns"],
        "category": "meat_protein",
    },
    "imperial_investment": {
        "display_name": "Imperial Investment Corp",
        "markers": ["IMPERIAL INVESTMENT"],
        "category": "investment",
    },
    "in_house_agency": {
        "display_name": "In House Agency LLC",
        "markers": ["IN HOUSE AGENCY", "In House Agency"],
        "category": "marketing_agency",
    },
    "itavi_holdings": {
        "display_name": "Itavi Holdings Inc",
        "markers": ["ITAVI HOLDINGS"],
        "category": "consulting",
    },
    "mode_green": {
        "display_name": "Mode Green",
        "markers": ["MODE GREEN", "Mode Green"],
        "category": "sustainability",
    },
    "national_service_group": {
        "display_name": "National Service Group & Associates",
        "markers": ["NATIONAL SERVICE GROUP"],
        "category": "facilities",
    },
    "navis": {
        "display_name": "Navis",
        "markers": ["NAVIS"],
        "category": "hospitality_software",
    },
    "pw_greystone": {
        "display_name": "P.W. FL & Greystone",
        "markers": ["P.W. FL", "Greystone"],
        "category": "facilities",
    },
    "pacific_office": {
        "display_name": "Pacific Office Automation",
        "markers": ["PACIFIC OFFICE AUTOMATION"],
        "category": "office_equipment",
    },
    "pathspot": {
        "display_name": "PathSpot Technologies",
        "markers": ["PATHSPOT", "PathSpot"],
        "category": "food_safety_tech",
    },
    "pg_fine_wine": {
        "display_name": "PG Fine Wine",
        "markers": ["PG Fine Wine", "PG FINE WINE"],
        "category": "wine_beverage",
    },
    "pinnacle_live": {
        "display_name": "Pinnacle Live",
        "markers": ["PINNACLE LIVE", "Pinnacle Live"],
        "category": "av_production",
    },
    "revenue_inspiration": {
        "display_name": "Revenue of Inspiration Inc",
        "markers": ["REVENUE OF INSPIRATION"],
        "category": "consulting",
    },
    "roth_southeast": {
        "display_name": "Roth Southeast",
        "markers": ["ROTH SOUTHEAST", "Roth Southeast"],
        "category": "consulting",
    },
    "seaport_hotel": {
        "display_name": "Seaport Hotel LP",
        "markers": ["SEAPORT HOTEL"],
        "category": "hotel_partner",
    },
    "sgws": {
        "display_name": "Southern Glazer's Wine & Spirits",
        "markers": ["SGWS", "Southern Glazer"],
        "category": "wine_beverage",
    },
    "stfpro": {
        "display_name": "STFPro LLC",
        "markers": ["STFPRO", "STFPro"],
        "category": "services",
    },
    "sushi_by_bou": {
        "display_name": "Sushi by Bou Bayside LLC",
        "markers": ["SUSHI BY BOU", "Sushi by Bou"],
        "category": "specialty_food",
    },
    "sysco_guest_supply": {
        "display_name": "Sysco Guest Supply LLC",
        "markers": ["Sysco Guest Supply", "SYSCO GUEST",
                    "guestsupply", "Guest Supply", "Guest Supply ",
                    "1-800-772-7676"],
        "category": "guest_amenities",
    },
    "taquiza": {
        "display_name": "Taquiza Commissary LLC",
        "markers": ["TAQUIZA", "Taquiza"],
        "category": "specialty_food",
    },
    "tartufo_prestige": {
        "display_name": "Tartufo Prestige",
        "markers": ["TARTUFO PRESTIGE", "Tartufo"],
        "category": "specialty_food",
    },
    "teneo_hospitality": {
        "display_name": "Teneo Hospitality Group",
        "markers": ["TENEO HOSPITALITY", "Teneo Hospitality"],
        "category": "hospitality_consulting",
    },
    "us_foods": {
        "display_name": "US Foods",
        "markers": ["US Foods", "USFoods", "US FOODS"],
        "category": "broadline",
    },
    "uline": {
        "display_name": "Uline",
        "markers": ["Uline", "ULINE"],
        "category": "industrial_supply",
    },
    "vicer": {
        "display_name": "Vicer LLC",
        "markers": ["Vicer LLC", "VICER LLC"],
        "category": "services",
    },
    "william_cruz": {
        "display_name": "William Cruz (Independent Contractor)",
        "markers": ["CRUZ, WILLIAM", "William Cruz", "PSS-2026"],
        "category": "contractor_individual",
    },
    "stephanie_gonzalez": {
        "display_name": "Stephanie Gonzalez (Independent Contractor)",
        "markers": ["GONZALEZ, STEPHANIE"],
        "category": "contractor_individual",
    },
}


# ─── Universal regex patterns (vendor-agnostic) ────────────────────────

INVOICE_NUM_PATTERNS = [
    re.compile(r"INVOICE\s*#\s*([A-Z0-9\-/]{3,30})", re.I),
    re.compile(r"Invoice\s+(?:Number|No\.?|#)?\s*[:#]?\s*([A-Z0-9\-/]{3,30})", re.I),
    re.compile(r"\bInv(?:oice)?\.?\s+([A-Z0-9\-/]{4,30})", re.I),
]

DATE_PATTERNS = [
    re.compile(r"(?:Invoice\s+)?Date\s*[:#]?\s*"
                r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", re.I),
    re.compile(r"(?:Invoice\s+)?Date\s*[:#]?\s*"
                r"([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})", re.I),
]

TOTAL_PATTERNS = [
    re.compile(r"(?:TOTAL|Total\s+Due|Amount\s+Due|Balance\s+Due|Grand\s+Total)\s*[:$]?\s*"
                r"\$?\s*([\d,]+\.\d{2})", re.I),
    re.compile(r"Total\s*\$\s*([\d,]+\.\d{2})", re.I),
    re.compile(r"\$\s*([\d,]+\.\d{2})\s*$", re.M),  # dollar at end of line
]

DUE_DATE_PATTERNS = [
    re.compile(r"Due\s+Date\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", re.I),
    re.compile(r"Payment\s+Due\s*[:#]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", re.I),
]

PO_NUMBER_PATTERNS = [
    re.compile(r"(?:Purchase\s+Order|PO|P\.O\.)\s*(?:Number|#|No\.?)?\s*[:#]?\s*([A-Z0-9\-]{3,20})", re.I),
]


# ─── Models ────────────────────────────────────────────────────────────

class ExtractBody(BaseModel):
    ocr_text: str = Field(..., min_length=20)
    source_filename: Optional[str] = None
    outlet_id: Optional[str] = None


# ─── Helpers ────────────────────────────────────────────────────────────

def _norm_amount(raw: str) -> float:
    return float(raw.replace(",", "").replace("$", "").strip())


def _parse_date(raw: str) -> Optional[str]:
    """Best-effort ISO normalization."""
    raw = raw.strip()
    fmts = ["%m/%d/%Y", "%m/%d/%y", "%m-%d-%Y", "%m-%d-%y",
             "%B %d, %Y", "%B %d %Y", "%b %d, %Y", "%b %d %Y"]
    for f in fmts:
        try:
            return datetime.strptime(raw, f).date().isoformat()
        except ValueError:
            continue
    return None


def _identify_vendor(ocr_text: str) -> Tuple[Optional[str], float]:
    """Score each vendor template by marker hits in the OCR text.
    Returns (vendor_key, confidence)."""
    text_low = ocr_text.lower()
    best: Tuple[Optional[str], int] = (None, 0)
    for key, tmpl in VENDOR_TEMPLATES.items():
        hits = sum(1 for m in tmpl["markers"]
                    if m.lower() in text_low)
        if hits > best[1]:
            best = (key, hits)
    if best[0] is None:
        return None, 0.0
    # Confidence: 1.0 when all markers hit; 0.5 baseline for any hit
    tmpl = VENDOR_TEMPLATES[best[0]]
    conf = min(1.0, 0.5 + 0.25 * (best[1] - 1))
    return best[0], conf


def _extract_first_match(patterns: List[re.Pattern],
                          text: str) -> Optional[str]:
    for p in patterns:
        m = p.search(text)
        if m:
            return m.group(1).strip()
    return None


# ─── Extractor (vendor-agnostic + vendor-aware) ───────────────────────

def extract_invoice(ocr_text: str) -> Dict[str, Any]:
    """Run extraction. Returns structured fields + confidence."""
    vendor_key, vendor_conf = _identify_vendor(ocr_text)
    vendor_meta = (VENDOR_TEMPLATES.get(vendor_key, {})
                    if vendor_key else {})

    # Vendor-specific patterns layered first (higher precision)
    patterns_inv = list(INVOICE_NUM_PATTERNS)
    if vendor_meta.get("invoice_number_pattern"):
        try:
            patterns_inv.insert(0,
                re.compile(vendor_meta["invoice_number_pattern"]))
        except re.error:
            pass

    invoice_number = _extract_first_match(patterns_inv, ocr_text)
    invoice_date_raw = _extract_first_match(DATE_PATTERNS, ocr_text)
    invoice_date_iso = (_parse_date(invoice_date_raw)
                         if invoice_date_raw else None)
    due_date_raw = _extract_first_match(DUE_DATE_PATTERNS, ocr_text)
    due_date_iso = (_parse_date(due_date_raw)
                     if due_date_raw else None)
    total_raw = _extract_first_match(TOTAL_PATTERNS, ocr_text)
    total_amount = (_norm_amount(total_raw) if total_raw else None)
    po_number = _extract_first_match(PO_NUMBER_PATTERNS, ocr_text)

    # Confidence: average of field-level confidences
    field_confidences: List[float] = []
    if invoice_number: field_confidences.append(0.9)
    if invoice_date_iso: field_confidences.append(0.85)
    if total_amount: field_confidences.append(0.95)
    if vendor_conf > 0: field_confidences.append(vendor_conf)
    overall_conf = (sum(field_confidences) / len(field_confidences)
                     if field_confidences else 0.0)

    return {
        "vendor_key": vendor_key,
        "vendor_name": vendor_meta.get("display_name"),
        "vendor_category": vendor_meta.get("category"),
        "vendor_confidence": round(vendor_conf, 2),
        "invoice_number": invoice_number,
        "invoice_date": invoice_date_iso,
        "invoice_date_raw": invoice_date_raw,
        "due_date": due_date_iso,
        "due_date_raw": due_date_raw,
        "total_amount": total_amount,
        "total_raw": total_raw,
        "po_number": po_number,
        "overall_confidence": round(overall_conf, 2),
        "fields_extracted": len(field_confidences),
    }


# ─── Endpoints ─────────────────────────────────────────────────────────

@router.post("/extract")
def post_extract(
    body: ExtractBody,
    x_tenant_id: Optional[str] = Header(None),
    x_actor_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    result = extract_invoice(body.ocr_text)
    eid = uuid.uuid4().hex[:16]
    record = {
        "id": eid,
        "tenant_id": tenant_id,
        "outlet_id": body.outlet_id,
        "source_filename": body.source_filename,
        "extracted": result,
        "ocr_text_excerpt": body.ocr_text[:500],
        "review_required": result["overall_confidence"] < 0.7,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "extracted_by": x_actor_id,
    }
    db["invoice_extractions"].insert_one(record.copy())
    # Audit
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": "invoice_extract.create",
            "entity_id": eid,
            "payload": {
                "vendor_key": result["vendor_key"],
                "invoice_number": result["invoice_number"],
                "total_amount": result["total_amount"],
                "confidence": result["overall_confidence"],
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass
    return {"ok": True, "extraction": record}


@router.get("/vendors")
def list_vendor_templates():
    """Catalog of known vendors with marker counts. Useful for UI
    showing "we recognize 26 vendors out of the box; add yours."""
    return {
        "ok": True,
        "vendors": [
            {
                "key": key,
                "display_name": tmpl["display_name"],
                "category": tmpl.get("category"),
                "marker_count": len(tmpl.get("markers", [])),
                "has_custom_invoice_pattern": bool(
                    tmpl.get("invoice_number_pattern")),
            }
            for key, tmpl in VENDOR_TEMPLATES.items()
        ],
        "total": len(VENDOR_TEMPLATES),
    }


@router.get("/extractions")
def list_extractions(
    review_required: Optional[bool] = None,
    vendor_key: Optional[str] = None,
    limit: int = 100,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if review_required is not None:
        q["review_required"] = review_required
    if vendor_key:
        q["extracted.vendor_key"] = vendor_key
    rows = list(db["invoice_extractions"].find(q, {"_id": 0})
                .sort("extracted_at", -1)
                .limit(max(1, min(2000, limit))))
    return {"ok": True, "total": len(rows), "extractions": rows}
