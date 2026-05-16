"""
AI Invoice Item Mapping Engine
===============================
Persistent vendor->internal item mappings with confidence scoring.
Learns from manual approvals to auto-match future invoices.
Unmapped item review workflow for staff.
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db
import difflib
import re

router = APIRouter(prefix="/api/item-mapping", tags=["item-mapping"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ══════════════════════════════════════
#  MODELS
# ══════════════════════════════════════

class MappingApproval(BaseModel):
    vendor_item_code: str = ""
    vendor_item_desc: str
    vendor_name: str
    internal_item_id: str
    internal_item_name: str
    unit_conversion: float = 1.0
    pack_size: str = ""
    notes: str = ""

class MappingReject(BaseModel):
    reason: str = "incorrect_match"

class InvoiceItemsInput(BaseModel):
    vendor_name: str
    line_items: List[dict]


# ══════════════════════════════════════
#  SEED INTERNAL CATALOG
# ══════════════════════════════════════

def _seed_catalog():
    if db["internal_catalog"].count_documents({}) > 0:
        return
    items = [
        {"item_id": "cat-001", "name": "Atlantic Salmon Fillet", "category": "seafood", "unit": "LB", "par_cost": 12.50, "gl_code": "5000"},
        {"item_id": "cat-002", "name": "Jumbo Shrimp 16/20", "category": "seafood", "unit": "LB", "par_cost": 14.80, "gl_code": "5000"},
        {"item_id": "cat-003", "name": "Beef Tenderloin USDA Prime", "category": "proteins", "unit": "LB", "par_cost": 38.50, "gl_code": "5000"},
        {"item_id": "cat-004", "name": "Chicken Breast Boneless", "category": "proteins", "unit": "LB", "par_cost": 4.20, "gl_code": "5000"},
        {"item_id": "cat-005", "name": "Duck Breast Moulard", "category": "proteins", "unit": "LB", "par_cost": 16.00, "gl_code": "5000"},
        {"item_id": "cat-006", "name": "Mixed Greens Organic", "category": "produce", "unit": "CASE", "par_cost": 28.00, "gl_code": "5000"},
        {"item_id": "cat-007", "name": "Roma Tomatoes", "category": "produce", "unit": "CASE", "par_cost": 22.50, "gl_code": "5000"},
        {"item_id": "cat-008", "name": "Yukon Gold Potatoes", "category": "produce", "unit": "CASE", "par_cost": 18.00, "gl_code": "5000"},
        {"item_id": "cat-009", "name": "Sweet Onions", "category": "produce", "unit": "CASE", "par_cost": 15.00, "gl_code": "5000"},
        {"item_id": "cat-010", "name": "Fresh Basil Bunch", "category": "produce", "unit": "BUNCH", "par_cost": 2.50, "gl_code": "5000"},
        {"item_id": "cat-011", "name": "Heavy Cream 36%", "category": "dairy", "unit": "GAL", "par_cost": 8.50, "gl_code": "5010"},
        {"item_id": "cat-012", "name": "Unsalted Butter AA", "category": "dairy", "unit": "LB", "par_cost": 5.80, "gl_code": "5010"},
        {"item_id": "cat-013", "name": "Parmesan Reggiano Wheel", "category": "dairy", "unit": "LB", "par_cost": 22.00, "gl_code": "5010"},
        {"item_id": "cat-014", "name": "Eggs Large Grade A", "category": "dairy", "unit": "CASE", "par_cost": 42.00, "gl_code": "5010"},
        {"item_id": "cat-015", "name": "Olive Oil Extra Virgin", "category": "dry_goods", "unit": "GAL", "par_cost": 32.00, "gl_code": "5000"},
        {"item_id": "cat-016", "name": "San Marzano Tomatoes #10", "category": "dry_goods", "unit": "CASE", "par_cost": 48.00, "gl_code": "5000"},
        {"item_id": "cat-017", "name": "Arborio Rice", "category": "dry_goods", "unit": "LB", "par_cost": 3.80, "gl_code": "5000"},
        {"item_id": "cat-018", "name": "AP Flour 50lb", "category": "dry_goods", "unit": "BAG", "par_cost": 24.00, "gl_code": "5000"},
        {"item_id": "cat-019", "name": "Granulated Sugar 50lb", "category": "dry_goods", "unit": "BAG", "par_cost": 28.00, "gl_code": "5000"},
        {"item_id": "cat-020", "name": "Black Truffle Oil", "category": "specialty", "unit": "BTL", "par_cost": 18.00, "gl_code": "5020"},
        {"item_id": "cat-021", "name": "Saffron Threads", "category": "specialty", "unit": "OZ", "par_cost": 45.00, "gl_code": "5020"},
        {"item_id": "cat-022", "name": "Lobster Tail 8oz", "category": "seafood", "unit": "EACH", "par_cost": 22.00, "gl_code": "5000"},
        {"item_id": "cat-023", "name": "Wagyu Ribeye A5", "category": "proteins", "unit": "LB", "par_cost": 120.00, "gl_code": "5000"},
        {"item_id": "cat-024", "name": "Lamb Rack Frenched", "category": "proteins", "unit": "LB", "par_cost": 28.00, "gl_code": "5000"},
        {"item_id": "cat-025", "name": "Dewar's White Label 1.75L", "category": "beverage", "unit": "BTL", "par_cost": 32.00, "gl_code": "5030"},
        {"item_id": "cat-026", "name": "Grey Goose Vodka 1L", "category": "beverage", "unit": "BTL", "par_cost": 28.00, "gl_code": "5030"},
        {"item_id": "cat-027", "name": "Caymus Cabernet 2021", "category": "beverage", "unit": "BTL", "par_cost": 68.00, "gl_code": "5030"},
        {"item_id": "cat-028", "name": "Bleach Concentrate Gal", "category": "chemicals", "unit": "GAL", "par_cost": 8.00, "gl_code": "6500"},
        {"item_id": "cat-029", "name": "Dish Detergent Commercial", "category": "chemicals", "unit": "GAL", "par_cost": 12.00, "gl_code": "6500"},
        {"item_id": "cat-030", "name": "Disposable Gloves L Box", "category": "supplies", "unit": "BOX", "par_cost": 14.00, "gl_code": "6000"},
    ]
    for item in items:
        db["internal_catalog"].insert_one({**item, "active": True, "created_at": _now()})


# ══════════════════════════════════════
#  FUZZY MATCHING ENGINE
# ══════════════════════════════════════

def _normalize(text: str) -> str:
    """Normalize text for matching: lowercase, strip, collapse spaces."""
    text = re.sub(r'[^\w\s]', ' ', text.lower().strip())
    return re.sub(r'\s+', ' ', text)

def _match_score(vendor_desc: str, internal_name: str) -> float:
    """Calculate match confidence between vendor item and internal catalog item."""
    v = _normalize(vendor_desc)
    i = _normalize(internal_name)
    # Direct sequence matching
    ratio = difflib.SequenceMatcher(None, v, i).ratio()
    # Token overlap bonus
    v_tokens = set(v.split())
    i_tokens = set(i.split())
    if v_tokens and i_tokens:
        overlap = len(v_tokens & i_tokens) / max(len(v_tokens | i_tokens), 1)
        ratio = ratio * 0.6 + overlap * 0.4
    return round(ratio * 100, 1)


def _find_best_matches(vendor_desc: str, vendor_name: str = "", vendor_code: str = "", limit: int = 5):
    """Find best matching internal catalog items for a vendor description."""
    _seed_catalog()

    # 1) Check existing approved mappings first (learned matches)
    existing = db["vendor_item_mappings"].find_one({
        "vendor_item_desc_norm": _normalize(vendor_desc),
        "vendor_name_norm": _normalize(vendor_name),
        "status": "approved",
    }, {"_id": 0})
    if existing:
        return [{
            "internal_item_id": existing["internal_item_id"],
            "internal_item_name": existing["internal_item_name"],
            "confidence": 99.9,
            "source": "learned",
            "mapping_id": existing.get("id"),
        }]

    # 2) Check code-based mappings
    if vendor_code:
        code_match = db["vendor_item_mappings"].find_one({
            "vendor_item_code": vendor_code,
            "vendor_name_norm": _normalize(vendor_name),
            "status": "approved",
        }, {"_id": 0})
        if code_match:
            return [{
                "internal_item_id": code_match["internal_item_id"],
                "internal_item_name": code_match["internal_item_name"],
                "confidence": 98.0,
                "source": "code_match",
                "mapping_id": code_match.get("id"),
            }]

    # 3) Fuzzy match against internal catalog
    catalog = list(db["internal_catalog"].find({"active": True}, {"_id": 0}))
    scored = []
    for item in catalog:
        score = _match_score(vendor_desc, item["name"])
        if score > 20:
            scored.append({
                "internal_item_id": item["item_id"],
                "internal_item_name": item["name"],
                "confidence": score,
                "source": "fuzzy",
                "category": item.get("category", ""),
                "unit": item.get("unit", ""),
                "par_cost": item.get("par_cost", 0),
            })

    scored.sort(key=lambda x: x["confidence"], reverse=True)
    return scored[:limit]


# ══════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════

@router.get("/catalog")
async def list_catalog(category: Optional[str] = None):
    """List internal item catalog."""
    _seed_catalog()
    q: dict = {"active": True}
    if category:
        q["category"] = category
    items = list(db["internal_catalog"].find(q, {"_id": 0}).sort("name", 1))
    categories = sorted(set(i.get("category", "") for i in items))
    return {"items": items, "total": len(items), "categories": categories}


@router.post("/match")
async def match_items(data: InvoiceItemsInput):
    """Match invoice line items against internal catalog. Returns match suggestions with confidence."""
    _seed_catalog()
    results = []
    auto_matched = 0
    needs_review = 0

    for item in data.line_items:
        desc = item.get("description", "")
        code = item.get("item_code", "")
        matches = _find_best_matches(desc, data.vendor_name, code)

        best = matches[0] if matches else None
        status = "unmapped"
        if best:
            if best["confidence"] >= 85:
                status = "auto_matched"
                auto_matched += 1
            elif best["confidence"] >= 50:
                status = "review"
                needs_review += 1
            else:
                status = "low_confidence"
                needs_review += 1
        else:
            needs_review += 1

        results.append({
            "vendor_item_code": code,
            "vendor_item_desc": desc,
            "quantity": item.get("quantity_shipped") or item.get("quantity_ordered", 0),
            "unit_price": item.get("unit_price", 0),
            "extension": item.get("extension", 0),
            "pack_unit": item.get("pack_unit", ""),
            "status": status,
            "best_match": best,
            "alternatives": matches[1:4] if len(matches) > 1 else [],
        })

    return {
        "vendor_name": data.vendor_name,
        "total_items": len(results),
        "auto_matched": auto_matched,
        "needs_review": needs_review,
        "unmapped": len(results) - auto_matched - needs_review,
        "items": results,
    }


@router.post("/approve")
async def approve_mapping(data: MappingApproval):
    """Approve and persist a vendor->internal item mapping. System learns for future invoices."""
    mapping = {
        "id": f"map-{_uid()}",
        "vendor_item_code": data.vendor_item_code,
        "vendor_item_desc": data.vendor_item_desc,
        "vendor_item_desc_norm": _normalize(data.vendor_item_desc),
        "vendor_name": data.vendor_name,
        "vendor_name_norm": _normalize(data.vendor_name),
        "internal_item_id": data.internal_item_id,
        "internal_item_name": data.internal_item_name,
        "unit_conversion": data.unit_conversion,
        "pack_size": data.pack_size,
        "notes": data.notes,
        "status": "approved",
        "approved_at": _now(),
        "times_used": 1,
        "created_at": _now(),
    }
    # Upsert — if mapping exists for this vendor+desc, update it
    existing = db["vendor_item_mappings"].find_one(
        {"vendor_item_desc_norm": mapping["vendor_item_desc_norm"], "vendor_name_norm": mapping["vendor_name_norm"]}
    )
    if existing:
        db["vendor_item_mappings"].update_one(
            {"_id": existing["_id"]},
            {"$set": {k: v for k, v in mapping.items() if k != "times_used"}, "$inc": {"times_used": 1}},
        )
    else:
        db["vendor_item_mappings"].insert_one(mapping)
        mapping.pop("_id", None)
    return {"status": "approved", "mapping": mapping}


@router.post("/reject/{mapping_id}")
async def reject_mapping(mapping_id: str, data: MappingReject):
    """Reject a suggested mapping."""
    db["vendor_item_mappings"].update_one(
        {"id": mapping_id},
        {"$set": {"status": "rejected", "reject_reason": data.reason, "rejected_at": _now()}},
    )
    return {"status": "rejected", "mapping_id": mapping_id}


@router.get("/mappings")
async def list_mappings(vendor: Optional[str] = None, status: Optional[str] = None, limit: int = 100):
    """List all vendor->internal item mappings."""
    q: dict = {}
    if vendor:
        q["vendor_name_norm"] = _normalize(vendor)
    if status:
        q["status"] = status
    mappings = list(db["vendor_item_mappings"].find(q, {"_id": 0}).sort("times_used", -1).limit(limit))
    return {
        "mappings": mappings,
        "total": db["vendor_item_mappings"].count_documents(q),
        "approved": db["vendor_item_mappings"].count_documents({**q, "status": "approved"}),
        "rejected": db["vendor_item_mappings"].count_documents({**q, "status": "rejected"}),
    }


@router.delete("/mappings/{mapping_id}")
async def delete_mapping(mapping_id: str):
    """Delete a mapping."""
    result = db["vendor_item_mappings"].delete_one({"id": mapping_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Mapping not found")
    return {"deleted": mapping_id}


@router.get("/unmapped")
async def unmapped_items(limit: int = 50):
    """Get invoice line items that haven't been mapped yet — review queue."""
    # Find recent invoice scans with unmapped items
    scans = list(db["invoice_item_queue"].find(
        {"mapping_status": {"$in": ["unmapped", "review", "low_confidence"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit))
    return {"items": scans, "total": len(scans)}


@router.post("/queue-items")
async def queue_invoice_items(data: InvoiceItemsInput):
    """Queue invoice line items for mapping review after an OCR scan."""
    _seed_catalog()
    queued = 0
    for item in data.line_items:
        desc = item.get("description", "")
        code = item.get("item_code", "")
        matches = _find_best_matches(desc, data.vendor_name, code)
        best = matches[0] if matches else None

        status = "unmapped"
        if best and best["confidence"] >= 85:
            status = "auto_matched"
        elif best and best["confidence"] >= 50:
            status = "review"
        elif best:
            status = "low_confidence"

        doc = {
            "id": f"qi-{_uid()}",
            "vendor_name": data.vendor_name,
            "vendor_item_code": code,
            "vendor_item_desc": desc,
            "quantity": item.get("quantity_shipped") or item.get("quantity_ordered", 0),
            "unit_price": item.get("unit_price", 0),
            "extension": item.get("extension", 0),
            "pack_unit": item.get("pack_unit", ""),
            "mapping_status": status,
            "best_match": best,
            "alternatives": matches[1:4] if len(matches) > 1 else [],
            "created_at": _now(),
        }
        db["invoice_item_queue"].insert_one(doc)
        doc.pop("_id", None)
        queued += 1

    return {"queued": queued, "vendor": data.vendor_name}


@router.get("/stats")
async def mapping_stats():
    """Dashboard stats for item mapping system."""
    total_mappings = db["vendor_item_mappings"].count_documents({})
    approved = db["vendor_item_mappings"].count_documents({"status": "approved"})
    rejected = db["vendor_item_mappings"].count_documents({"status": "rejected"})

    queue_total = db["invoice_item_queue"].count_documents({})
    queue_unmapped = db["invoice_item_queue"].count_documents({"mapping_status": "unmapped"})
    queue_review = db["invoice_item_queue"].count_documents({"mapping_status": "review"})
    queue_auto = db["invoice_item_queue"].count_documents({"mapping_status": "auto_matched"})

    catalog_count = db["internal_catalog"].count_documents({"active": True})

    # Top mapped vendors
    pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {"_id": "$vendor_name", "count": {"$sum": 1}, "last_used": {"$max": "$approved_at"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_vendors = list(db["vendor_item_mappings"].aggregate(pipeline))

    return {
        "mappings": {"total": total_mappings, "approved": approved, "rejected": rejected},
        "queue": {"total": queue_total, "unmapped": queue_unmapped, "review": queue_review, "auto_matched": queue_auto},
        "catalog_items": catalog_count,
        "top_vendors": [{"vendor": v["_id"], "mappings": v["count"]} for v in top_vendors],
        "learning_rate": round(approved / max(total_mappings, 1) * 100, 1),
    }
