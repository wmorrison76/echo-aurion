"""iter242 · Maestro BQT seed + standup admin write-back + storage map seed."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["ecw-ops-iter242-misc"])


# ── Seed BEOs (banquet event orders) ─────────────────────────────────────
@router.post("/api/maestro/beo/seed-demo")
def seed_beos():
    if db["beos"].count_documents({"source": "iter242-seed"}) >= 3:
        return {"ok": True, "skipped": True}

    today = datetime.now(timezone.utc).date()
    rows = [
        {"id": "beo-2026-spring-gala",
          "event_name": "Spring Gala — Heritage Foundation",
          "event_date": (today + timedelta(days=2)).isoformat(),
          "start_time": "18:30", "end_time": "23:00",
          "guest_count": 220,
          "venue": "Grand Ballroom",
          "client_contact": "Emily Whitfield · 555-204-9912",
          "stations": [
            {"name": "Cocktail reception", "covers": 220, "menu": "5 passed canapes + raw bar"},
            {"name": "Plated dinner", "covers": 220, "menu": "Truffle agnolotti / Sea bass / 21-day filet / Vegan tasting"},
            {"name": "Coffee & dessert station", "covers": 220, "menu": "Petits fours + barista bar"},
          ],
          "service_notes": "5 dietary cards. 12 kosher meals confirmed by Friday. Plated 19:30 sharp.",
          "status": "confirmed",
          "ai_order_total": 18420,
          "estimated_revenue": 49500,
          "captain": "Theo Marquez",
          "kitchen_lead": "Chef Aria",
          "tags": ["VIP", "press"],
          "created_at": utcnow_iso(),
          "source": "iter242-seed"},
        {"id": "beo-2026-corp-luminaire",
          "event_name": "Luminaire Capital · Board Retreat Closing Dinner",
          "event_date": (today + timedelta(days=1)).isoformat(),
          "start_time": "19:00", "end_time": "22:30",
          "guest_count": 28,
          "venue": "Sky Suite",
          "client_contact": "Sofia Novak — VIP",
          "stations": [
            {"name": "Welcome drinks", "covers": 28, "menu": "Sancerre + champagne, sparkling water"},
            {"name": "Tasting menu (4 course)", "covers": 28, "menu": "Pescatarian options confirmed for principals"},
          ],
          "service_notes": "Sesame allergen — entire menu cleared by chef. Plated discreetly. No social.",
          "status": "confirmed",
          "ai_order_total": 4250,
          "estimated_revenue": 11900,
          "captain": "Aria Khoury",
          "kitchen_lead": "Chef William",
          "tags": ["VIP", "anniversary"],
          "vip_id": "vip-novak",
          "created_at": utcnow_iso(),
          "source": "iter242-seed"},
        {"id": "beo-2026-wedding-okonkwo",
          "event_name": "Okonkwo / Adeyemi Wedding · Reception",
          "event_date": (today + timedelta(days=5)).isoformat(),
          "start_time": "17:30", "end_time": "00:30",
          "guest_count": 145,
          "venue": "Garden Pavilion",
          "client_contact": "Ade Okonkwo · 555-188-7733",
          "stations": [
            {"name": "Cocktail hour", "covers": 145, "menu": "8 passed canapes + Nigerian small plates station"},
            {"name": "Family-style dinner", "covers": 145, "menu": "West African heritage menu — ask chef"},
            {"name": "Cake cut + coffee", "covers": 145, "menu": "Cake provided · 60 portions petits fours"},
          ],
          "service_notes": "12 kids meals. Vegan table of 8. No pork on menu (cultural).",
          "status": "in-prep",
          "ai_order_total": 11800,
          "estimated_revenue": 32750,
          "captain": "Mira Tang",
          "kitchen_lead": "Chef Aria",
          "tags": ["wedding", "cultural"],
          "created_at": utcnow_iso(),
          "source": "iter242-seed"},
    ]
    for r in rows:
        db["beos"].update_one({"id": r["id"]}, {"$set": r}, upsert=True)
        # Seed corresponding AI order
        ai = {
            "id": uuid.uuid4().hex[:12],
            "beo_id": r["id"],
            "generated_at": utcnow_iso(),
            "groups": [
                {"vendor": "US Foods", "subtotal": round(r["ai_order_total"] * 0.45, 2),
                  "items": ["Beef tenderloin 21-day", "Sea bass fillet", "Heritage tomatoes",
                              "Truffle pecorino", "Sparkling waters case x12"]},
                {"vendor": "Sysco",    "subtotal": round(r["ai_order_total"] * 0.32, 2),
                  "items": ["Cream 33% gallon x6", "Sourdough loaves x40", "Petits fours mix"]},
                {"vendor": "Local Farm", "subtotal": round(r["ai_order_total"] * 0.18, 2),
                  "items": ["Microgreens 5oz", "Heirloom carrots 10#", "Edible flowers"]},
                {"vendor": "Direct wine", "subtotal": round(r["ai_order_total"] * 0.05, 2),
                  "items": ["Sancerre 2022 case", "Champagne brut case"]},
            ],
            "total": r["ai_order_total"],
            "issued_to": ["procurement@property.local"],
            "status": "ready-to-place",
        }
        db["beo_ai_orders"].update_one({"beo_id": r["id"]}, {"$set": ai}, upsert=True)
    return {"ok": True, "inserted": len(rows)}


# ── Standup full admin write (headline / sections / shoutouts / items) ───
class StandupAdminWrite(BaseModel):
    date: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    sections: List[Dict[str, Any]] = Field(default_factory=list)
    items: List[Dict[str, Any]] = Field(default_factory=list)
    shoutouts: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/api/ecw-ops/standup/admin-write")
def standup_admin_write(body: StandupAdminWrite):
    """Full upsert from admin editor — writes everything in one shot.

    Idempotent on (date) — overwrites the day's standup row."""
    date = body.date or datetime.now(timezone.utc).date().isoformat()
    doc = body.model_dump()
    doc["date"] = date
    doc["updated_at"] = utcnow_iso()
    db["ecw_standups"].update_one(
        {"date": date},
        {"$set": doc, "$setOnInsert": {"created_at": utcnow_iso()}},
        upsert=True,
    )
    return {"ok": True, "date": date}


# ── 3D storage map · seed shelves and items ──────────────────────────────
@router.post("/api/storage-map/seed-demo")
def seed_storage_map():
    if db["storage_shelves"].count_documents({"source": "iter242-seed"}) >= 6:
        return {"ok": True, "skipped": True}

    shelves = [
        {"id": "shelf-walk-in-A1", "label": "Walk-in A · Top",       "zone": "walk-in-cold",  "x_idx": 0, "y_idx": 0,
          "items": ["Heritage tomato 5#", "Mesclun mix", "Heirloom carrots", "Microgreens"]},
        {"id": "shelf-walk-in-A2", "label": "Walk-in A · Middle",   "zone": "walk-in-cold",  "x_idx": 0, "y_idx": 1,
          "items": ["Cucumber case", "Bell pepper", "Avocado case", "Lemons 165ct"]},
        {"id": "shelf-walk-in-A3", "label": "Walk-in A · Bottom",   "zone": "walk-in-cold",  "x_idx": 0, "y_idx": 2,
          "items": ["Russet potato 50#", "Onions 50#", "Carrots 50#"]},
        {"id": "shelf-walk-in-B1", "label": "Walk-in B · Proteins", "zone": "walk-in-meat",  "x_idx": 1, "y_idx": 0,
          "items": ["Boneless chicken 40#", "Wild salmon side", "Ribeye 12oz", "Beef tenderloin 21-day"]},
        {"id": "shelf-walk-in-B2", "label": "Walk-in B · Dairy",    "zone": "walk-in-cold",  "x_idx": 1, "y_idx": 1,
          "items": ["Whole milk gal", "Cream 33% gal", "Butter 1#", "Eggs 30dz"]},
        {"id": "shelf-dry-1",      "label": "Dry · Aisle 1",         "zone": "dry-storage",   "x_idx": 2, "y_idx": 0,
          "items": ["Flour 50#", "Sugar 50#", "Olive oil 5L", "Salt kosher 3#"]},
        {"id": "shelf-dry-2",      "label": "Dry · Aisle 2",         "zone": "dry-storage",   "x_idx": 2, "y_idx": 1,
          "items": ["Sourdough loaves", "Pasta dry case", "Canned tomato #10"]},
        {"id": "shelf-bar-1",      "label": "Bar · Wines",           "zone": "bar",            "x_idx": 3, "y_idx": 0,
          "items": ["Sancerre 2022 case", "Burgundy 2020", "Champagne brut case"]},
        {"id": "shelf-bar-2",      "label": "Bar · Spirits",         "zone": "bar",            "x_idx": 3, "y_idx": 1,
          "items": ["Blue Label", "Reposado tequila", "Single rye barrel"]},
        {"id": "shelf-frzr-1",     "label": "Freezer · A",           "zone": "freezer",        "x_idx": 4, "y_idx": 0,
          "items": ["Pastry doughs", "Vanilla bean ice cream 3gal", "Sorbet variety"]},
    ]
    for s in shelves:
        s["source"] = "iter242-seed"
        s["last_audit_at"] = utcnow_iso()
        db["storage_shelves"].update_one({"id": s["id"]}, {"$set": s}, upsert=True)
    return {"ok": True, "inserted": len(shelves)}


@router.get("/api/storage-map/shelves")
def list_storage_shelves(zone: Optional[str] = None):
    q: Dict[str, Any] = {}
    if zone: q["zone"] = zone
    rows = list(db["storage_shelves"].find(q, {"_id": 0}).sort([("zone", 1), ("x_idx", 1), ("y_idx", 1)]))
    zones = sorted({r["zone"] for r in rows})
    return {"ok": True, "count": len(rows), "rows": rows, "zones": zones}


# ── Shelf count submission (from AR scan) ────────────────────────────────
class ShelfCountIn(BaseModel):
    shelf_id: str
    items: List[Dict[str, Any]]    # [{sku, qty}]
    scanned_at: Optional[str] = None


@router.post("/api/storage-map/shelf-count")
def shelf_count(body: ShelfCountIn):
    s = db["storage_shelves"].find_one({"id": body.shelf_id}, {"_id": 0})
    if not s: raise HTTPException(404, "shelf not found")
    cid = uuid.uuid4().hex[:12]
    db["shelf_counts"].insert_one({
        "id": cid, "shelf_id": body.shelf_id, "shelf_label": s.get("label"),
        "zone": s.get("zone"),
        "items": body.items, "total_scans": sum(int(i.get("qty") or 0) for i in body.items),
        "unique_skus": len(body.items),
        "scanned_at": body.scanned_at or utcnow_iso(),
        "created_at": utcnow_iso(),
    })
    db["storage_shelves"].update_one({"id": body.shelf_id},
                                          {"$set": {"last_scan_at": utcnow_iso(),
                                                      "last_scan_id": cid}})
    return {"ok": True, "id": cid}
