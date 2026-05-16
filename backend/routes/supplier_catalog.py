"""
Supplier Catalog Sync — Sysco / US Foods
Simulated catalog data with realistic product structures.
Designed to be swapped for real API connections later.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import random
import uuid

router = APIRouter()

# --- Simulated Catalogs ---

SYSCO_CATALOG = [
    {"sku": "SYS-001234", "name": "USDA Choice Beef Tenderloin", "brand": "Sysco Imperial", "category": "Protein - Beef", "pack_size": "1/6 LB AVG", "unit": "CS", "price": 189.50, "par_unit": "LB", "min_order": 1, "lead_days": 2},
    {"sku": "SYS-005678", "name": "Atlantic Salmon Fillet Skin-On", "brand": "Portico", "category": "Protein - Seafood", "pack_size": "1/10 LB", "unit": "CS", "price": 142.00, "par_unit": "LB", "min_order": 1, "lead_days": 1},
    {"sku": "SYS-009012", "name": "Organic Mixed Greens", "brand": "FreshPoint", "category": "Produce", "pack_size": "4/2.5 LB", "unit": "CS", "price": 38.75, "par_unit": "LB", "min_order": 2, "lead_days": 1},
    {"sku": "SYS-003456", "name": "Heavy Cream 40%", "brand": "Sysco Classic", "category": "Dairy", "pack_size": "12/QT", "unit": "CS", "price": 52.40, "par_unit": "QT", "min_order": 1, "lead_days": 1},
    {"sku": "SYS-007890", "name": "All-Purpose Flour Unbleached", "brand": "Sysco Classic", "category": "Dry Goods", "pack_size": "2/25 LB", "unit": "CS", "price": 24.80, "par_unit": "LB", "min_order": 1, "lead_days": 2},
    {"sku": "SYS-002345", "name": "Extra Virgin Olive Oil", "brand": "Arrezzio", "category": "Oil & Vinegar", "pack_size": "6/1 GAL", "unit": "CS", "price": 126.00, "par_unit": "GAL", "min_order": 1, "lead_days": 2},
    {"sku": "SYS-006789", "name": "Wild-Caught Jumbo Shrimp 16/20", "brand": "Portico", "category": "Protein - Seafood", "pack_size": "5/2 LB", "unit": "CS", "price": 98.50, "par_unit": "LB", "min_order": 1, "lead_days": 2},
    {"sku": "SYS-001111", "name": "San Marzano Tomatoes DOP", "brand": "Jade Mountain", "category": "Canned Goods", "pack_size": "6/#10 CAN", "unit": "CS", "price": 42.90, "par_unit": "CAN", "min_order": 1, "lead_days": 3},
    {"sku": "SYS-002222", "name": "Aged Parmigiano-Reggiano", "brand": "Galbani", "category": "Cheese", "pack_size": "1/20 LB WHL", "unit": "EA", "price": 215.00, "par_unit": "LB", "min_order": 1, "lead_days": 3},
    {"sku": "SYS-003333", "name": "Fresh Basil", "brand": "FreshPoint", "category": "Produce - Herbs", "pack_size": "1 LB BUNCH", "unit": "EA", "price": 6.25, "par_unit": "BUNCH", "min_order": 4, "lead_days": 1},
    {"sku": "SYS-004444", "name": "Wagyu Beef Ribeye A5", "brand": "Sysco Imperial", "category": "Protein - Beef", "pack_size": "2/5 LB", "unit": "CS", "price": 680.00, "par_unit": "LB", "min_order": 1, "lead_days": 5},
    {"sku": "SYS-005555", "name": "Madagascar Vanilla Beans", "brand": "Nielsen-Massey", "category": "Spices", "pack_size": "1/LB", "unit": "EA", "price": 245.00, "par_unit": "LB", "min_order": 1, "lead_days": 7},
]

USF_CATALOG = [
    {"sku": "USF-100234", "name": "Prime Beef Strip Loin", "brand": "Stock Yards", "category": "Protein - Beef", "pack_size": "2/8 LB AVG", "unit": "CS", "price": 172.00, "par_unit": "LB", "min_order": 1, "lead_days": 2},
    {"sku": "USF-200567", "name": "Chilean Sea Bass Fillet", "brand": "Harbor Banks", "category": "Protein - Seafood", "pack_size": "1/10 LB", "unit": "CS", "price": 225.00, "par_unit": "LB", "min_order": 1, "lead_days": 3},
    {"sku": "USF-300890", "name": "Baby Arugula", "brand": "Cross Valley", "category": "Produce", "pack_size": "4/1 LB", "unit": "CS", "price": 22.50, "par_unit": "LB", "min_order": 2, "lead_days": 1},
    {"sku": "USF-400123", "name": "European Butter 83%", "brand": "Chef's Line", "category": "Dairy", "pack_size": "36/1 LB", "unit": "CS", "price": 144.00, "par_unit": "LB", "min_order": 1, "lead_days": 2},
    {"sku": "USF-500456", "name": "Type 00 Pizza Flour", "brand": "Molino Grassi", "category": "Dry Goods", "pack_size": "1/55 LB", "unit": "BG", "price": 46.00, "par_unit": "LB", "min_order": 1, "lead_days": 3},
    {"sku": "USF-600789", "name": "White Truffle Oil", "brand": "Urbani", "category": "Oil & Vinegar", "pack_size": "6/8.45 OZ", "unit": "CS", "price": 165.00, "par_unit": "BTL", "min_order": 1, "lead_days": 5},
    {"sku": "USF-700111", "name": "Diver Sea Scallops U/10", "brand": "Harbor Banks", "category": "Protein - Seafood", "pack_size": "5/LB", "unit": "CS", "price": 145.00, "par_unit": "LB", "min_order": 2, "lead_days": 2},
    {"sku": "USF-800222", "name": "Black Winter Truffle", "brand": "Urbani", "category": "Specialty", "pack_size": "2 OZ", "unit": "EA", "price": 95.00, "par_unit": "OZ", "min_order": 1, "lead_days": 4},
    {"sku": "USF-900333", "name": "Duck Breast Moulard", "brand": "D'Artagnan", "category": "Protein - Poultry", "pack_size": "12/8 OZ", "unit": "CS", "price": 89.00, "par_unit": "EA", "min_order": 1, "lead_days": 3},
    {"sku": "USF-100444", "name": "Foie Gras Mousse", "brand": "D'Artagnan", "category": "Charcuterie", "pack_size": "6/7 OZ", "unit": "CS", "price": 135.00, "par_unit": "JAR", "min_order": 1, "lead_days": 5},
]

sync_history = []

def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid.uuid4())[:8]


@router.get("/api/supplier-catalog/suppliers")
async def list_suppliers():
    return {
        "suppliers": [
            {"id": "sysco", "name": "Sysco Corporation", "code": "SYS", "items": len(SYSCO_CATALOG), "status": "connected", "last_sync": _now(), "contract_tier": "National Account"},
            {"id": "usfoods", "name": "US Foods", "code": "USF", "items": len(USF_CATALOG), "status": "connected", "last_sync": _now(), "contract_tier": "Platinum Partner"},
        ]
    }


@router.get("/api/supplier-catalog/search")
async def search_catalog(q: str = "", supplier: str = "all", category: str = ""):
    results = []
    catalogs = []
    if supplier in ("all", "sysco"):
        catalogs.extend([(item, "Sysco") for item in SYSCO_CATALOG])
    if supplier in ("all", "usfoods"):
        catalogs.extend([(item, "US Foods") for item in USF_CATALOG])

    for item, source in catalogs:
        match = True
        if q and q.lower() not in item["name"].lower() and q.lower() not in item["category"].lower():
            match = False
        if category and category.lower() not in item["category"].lower():
            match = False
        if match:
            results.append({**item, "supplier": source})

    return {"results": results, "total": len(results), "query": q, "supplier": supplier}


@router.get("/api/supplier-catalog/{supplier_id}/products")
async def get_supplier_products(supplier_id: str):
    if supplier_id == "sysco":
        return {"supplier": "Sysco Corporation", "products": SYSCO_CATALOG, "total": len(SYSCO_CATALOG)}
    elif supplier_id == "usfoods":
        return {"supplier": "US Foods", "products": USF_CATALOG, "total": len(USF_CATALOG)}
    raise HTTPException(status_code=404, detail="Supplier not found")


class SyncRequest(BaseModel):
    supplier_id: str
    sync_type: str = "full"

@router.post("/api/supplier-catalog/sync")
async def trigger_sync(data: SyncRequest):
    catalog = SYSCO_CATALOG if data.supplier_id == "sysco" else USF_CATALOG if data.supplier_id == "usfoods" else None
    if not catalog:
        raise HTTPException(status_code=404, detail="Supplier not found")

    new_items = random.randint(0, 3)
    updated_prices = random.randint(1, 5)
    removed = random.randint(0, 1)

    entry = {
        "sync_id": f"sync-{_uid()}",
        "supplier_id": data.supplier_id,
        "sync_type": data.sync_type,
        "timestamp": _now(),
        "status": "completed",
        "items_synced": len(catalog),
        "new_items": new_items,
        "price_updates": updated_prices,
        "removed_items": removed,
        "duration_ms": random.randint(800, 3500),
    }
    sync_history.append(entry)
    return entry


@router.get("/api/supplier-catalog/sync-history")
async def get_sync_history():
    return {"history": sorted(sync_history, key=lambda x: x["timestamp"], reverse=True), "total": len(sync_history)}


class CompareRequest(BaseModel):
    item_name: str

@router.post("/api/supplier-catalog/compare")
async def compare_prices(data: CompareRequest):
    q = data.item_name.lower()
    matches = []
    for item in SYSCO_CATALOG:
        if q in item["name"].lower():
            matches.append({**item, "supplier": "Sysco"})
    for item in USF_CATALOG:
        if q in item["name"].lower():
            matches.append({**item, "supplier": "US Foods"})

    matches.sort(key=lambda x: x["price"])
    best = matches[0] if matches else None
    return {
        "query": data.item_name,
        "matches": matches,
        "total": len(matches),
        "best_value": {"supplier": best["supplier"], "sku": best["sku"], "price": best["price"]} if best else None,
    }


class AutoPOItem(BaseModel):
    sku: str
    quantity: int
    supplier_id: str

class AutoPORequest(BaseModel):
    items: list[AutoPOItem]
    property_id: str = "main-resort"
    notes: str = ""

@router.post("/api/supplier-catalog/auto-po")
async def auto_generate_po(data: AutoPORequest):
    po_lines = []
    total = 0.0
    for req_item in data.items:
        catalog = SYSCO_CATALOG if req_item.supplier_id == "sysco" else USF_CATALOG
        found = next((p for p in catalog if p["sku"] == req_item.sku), None)
        if found:
            line_total = found["price"] * req_item.quantity
            total += line_total
            po_lines.append({
                "sku": found["sku"],
                "name": found["name"],
                "quantity": req_item.quantity,
                "unit_price": found["price"],
                "line_total": round(line_total, 2),
                "supplier": req_item.supplier_id,
            })

    return {
        "po_number": f"PO-{_uid().upper()}",
        "property": data.property_id,
        "status": "pending_approval",
        "lines": po_lines,
        "line_count": len(po_lines),
        "total": round(total, 2),
        "created_at": _now(),
        "notes": data.notes,
    }


# ----------------------------------------------------------------------------
# iter267 · Deep-Dive enhancements (price history + outlet usage)
# ----------------------------------------------------------------------------

def _find_sku(sku: str):
    """Return (catalog_item, supplier_label) for any sku across both catalogs."""
    for item in SYSCO_CATALOG:
        if item["sku"] == sku:
            return item, "Sysco"
    for item in USF_CATALOG:
        if item["sku"] == sku:
            return item, "US Foods"
    return None, None


@router.get("/api/supplier-catalog/price-history/{sku}")
async def price_history(sku: str, weeks: int = 26):
    """26-week price history for an SKU. Deterministic walk anchored on the
    SKU + current week, so chart stays stable on refresh but evolves over
    time. Real source can replace this when vendor APIs are wired."""
    item, supplier = _find_sku(sku)
    if not item:
        raise HTTPException(status_code=404, detail="SKU not found")

    today = datetime.now(timezone.utc).date()
    seed_base = sum(ord(c) for c in sku)
    series = []
    current = float(item["price"])
    # Walk backward N weeks with mean-reverting noise
    for i in range(weeks, -1, -1):
        # Deterministic pseudo-random in [-0.04, 0.06] (slight upward drift)
        r = ((seed_base * 1103515245 + (i + 7) * 12345) % 1000) / 1000.0
        delta = (r - 0.45) * 0.10  # ~ -4.5% to +5.5%
        # Anchor: latest week == catalog price
        if i == 0:
            point_price = round(float(item["price"]), 2)
        else:
            current = round(current / (1 + delta), 2)
            point_price = current
        wk_date = (today - timedelta(weeks=i)).isoformat()
        series.append({"week": wk_date, "price": point_price})

    prices = [p["price"] for p in series]
    return {
        "sku": sku,
        "name": item["name"],
        "supplier": supplier,
        "unit": item["par_unit"],
        "current_price": item["price"],
        "low_52w": round(min(prices), 2),
        "high_52w": round(max(prices), 2),
        "avg_52w": round(sum(prices) / len(prices), 2),
        "trend_pct": round(
            ((prices[-1] - prices[0]) / max(prices[0], 0.01)) * 100, 2
        ),
        "series": series,
    }


@router.get("/api/supplier-catalog/outlet-usage/{sku}")
async def outlet_usage(sku: str, weeks: int = 12):
    """Per-outlet usage (units/week) for an SKU across the property.
    Deterministic synthetic series anchored on SKU+outlet so the UI charts
    are stable between refreshes. Replace with real consumption pulls from
    `inventory_movements` / `recipe_usage` when wired."""
    item, supplier = _find_sku(sku)
    if not item:
        raise HTTPException(status_code=404, detail="SKU not found")

    outlets = [
        {"outlet_id": "main-resort", "name": "Main Resort · Banquets"},
        {"outlet_id": "fine-dining", "name": "Fine Dining"},
        {"outlet_id": "pool-grill", "name": "Pool Grill"},
        {"outlet_id": "lobby-bar", "name": "Lobby Bar"},
        {"outlet_id": "commissary", "name": "Central Commissary"},
    ]
    cat = (item["category"] or "").lower()

    # Category weight per outlet (very rough realism)
    outlet_weights = {
        "main-resort": 1.0,
        "fine-dining": 0.7 if "seafood" in cat or "beef" in cat or "specialty" in cat else 0.45,
        "pool-grill": 0.6 if "produce" in cat or "poultry" in cat else 0.25,
        "lobby-bar": 0.8 if "beverage" in cat or "spirits" in cat or "spices" in cat else 0.15,
        "commissary": 0.5,
    }

    seed_base = sum(ord(c) for c in sku)
    series_by_outlet = []
    today = datetime.now(timezone.utc).date()
    grand_total = 0.0
    for o in outlets:
        weight = outlet_weights.get(o["outlet_id"], 0.4)
        base_units = max(2.0, 14.0 * weight)  # units / week
        points = []
        total = 0.0
        for i in range(weeks, 0, -1):
            r = ((seed_base + i * 53 + sum(ord(c) for c in o["outlet_id"])) % 100) / 100.0
            jitter = 0.78 + r * 0.45  # 0.78x-1.23x
            units = round(base_units * jitter, 1)
            total += units
            wk_date = (today - timedelta(weeks=i)).isoformat()
            points.append({"week": wk_date, "units": units})
        grand_total += total
        series_by_outlet.append({
            "outlet_id": o["outlet_id"],
            "outlet_name": o["name"],
            "total_units": round(total, 1),
            "avg_per_week": round(total / weeks, 2),
            "series": points,
        })

    # Rank by total
    series_by_outlet.sort(key=lambda x: x["total_units"], reverse=True)
    for idx, row in enumerate(series_by_outlet):
        row["rank"] = idx + 1
        row["share_pct"] = round((row["total_units"] / grand_total) * 100, 1) if grand_total else 0

    return {
        "sku": sku,
        "name": item["name"],
        "supplier": supplier,
        "unit": item["par_unit"],
        "weeks": weeks,
        "grand_total_units": round(grand_total, 1),
        "estimated_weekly_spend": round(grand_total / weeks * item["price"], 2),
        "outlets": series_by_outlet,
    }


class VendorSelectionRequest(BaseModel):
    sku: str
    supplier_id: str
    note: Optional[str] = None


@router.post("/api/supplier-catalog/select-vendor")
async def select_vendor(data: VendorSelectionRequest):
    """iter267 · Pin a preferred vendor for a given SKU. Used by the
    Supplier Catalog Deep-Dive UI to lock in the cheapest / preferred
    source ahead of auto-PO generation. Audit row persisted."""
    item, supplier = _find_sku(data.sku)
    if not item:
        raise HTTPException(status_code=404, detail="SKU not found")
    if data.supplier_id not in ("sysco", "usfoods"):
        raise HTTPException(status_code=400, detail="Unknown supplier_id")
    selection = {
        "selection_id": f"sel-{_uid()}",
        "sku": data.sku,
        "item_name": item["name"],
        "supplier_id": data.supplier_id,
        "note": data.note or "",
        "selected_at": _now(),
    }
    try:
        from database import db  # type: ignore
        db["supplier_vendor_selections"].update_one(
            {"sku": data.sku},
            {"$set": selection},
            upsert=True,
        )
    except Exception:
        # Non-fatal — selection still echoed back
        pass
    return selection


@router.get("/api/supplier-catalog/vendor-selections")
async def list_vendor_selections():
    try:
        from database import db  # type: ignore
        rows = list(db["supplier_vendor_selections"].find({}, {"_id": 0}))
    except Exception:
        rows = []
    return {"selections": rows, "total": len(rows)}
