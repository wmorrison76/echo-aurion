"""iter248 · POS ring ingestion — accepts manual CSV uploads or POS API
push payloads. Once `pos_rings` is populated, Reports Hub flips from demo
data to real numbers.

Schema for one ring row (one item rung up):
  ring_id        — string, unique
  outlet_id      — string (matches outlets.outlet_id)
  date           — YYYY-MM-DD
  time           — HH:MM (24h)
  hour           — int (for heatmap roll-ups)
  server_id      — string (matches employees.id)
  table          — string (optional)
  cover_count    — int (per-check covers)
  item_id        — string (POS PLU)
  item_name      — string
  qty            — int
  price          — float (extended price for this line, before tax)
  cost           — float (theoretical cost, can be 0 if not configured)
  void           — bool
  comp           — bool
  comp_reason    — string|null
  tender         — string ("Visa"|"Cash"|"Room Charge"|...)
  tender_amount  — float (line allocation)
"""
from __future__ import annotations
import os, csv, io
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/pos-rings", tags=["pos-rings"])


class Ring(BaseModel):
    ring_id: str
    outlet_id: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None
    server_id: Optional[str] = None
    table: Optional[str] = None
    cover_count: Optional[int] = None
    item_id: Optional[str] = None
    item_name: str
    qty: int = 1
    price: float = 0
    cost: float = 0
    void: bool = False
    comp: bool = False
    comp_reason: Optional[str] = None
    tender: Optional[str] = None
    tender_amount: Optional[float] = None


def _hour_from_time(t: Optional[str]) -> Optional[int]:
    if not t: return None
    try: return int(t.split(":")[0])
    except Exception: return None


@router.post("/bulk")
def bulk_ingest(rings: List[Ring]):
    """Bulk POST endpoint for POS systems pushing rings to us."""
    if not rings:
        return {"ok": True, "inserted": 0, "skipped": 0}
    docs: List[Dict[str, Any]] = []
    for r in rings:
        d = r.model_dump()
        d["hour"] = _hour_from_time(d.get("time"))
        d["ingested_at"] = utcnow_iso()
        docs.append(d)
    # Upsert to allow POS systems to retry without dupes
    inserted = 0; updated = 0
    for d in docs:
        res = db["pos_rings"].update_one(
            {"ring_id": d["ring_id"]}, {"$set": d}, upsert=True)
        if res.upserted_id is not None: inserted += 1
        else: updated += 1
    return {"ok": True, "inserted": inserted, "updated": updated,
              "total_in_collection": db["pos_rings"].count_documents({})}


@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Accept a CSV upload from the GM. Expected header row matches Ring fields."""
    text = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rings: List[Ring] = []
    errors: List[str] = []
    for i, row in enumerate(reader, start=2):
        try:
            # Coerce types
            row["qty"] = int(row.get("qty", 1) or 1)
            for fld in ("price", "cost", "tender_amount"):
                if row.get(fld) not in (None, ""):
                    row[fld] = float(row[fld])
                else:
                    row[fld] = 0.0 if fld != "tender_amount" else None
            for fld in ("void", "comp"):
                row[fld] = str(row.get(fld, "")).strip().lower() in ("1", "true", "yes", "y")
            row["cover_count"] = int(row["cover_count"]) if row.get("cover_count") else None
            rings.append(Ring(**row))
        except Exception as e:
            errors.append(f"row {i}: {e}")
    if not rings:
        return {"ok": False, "inserted": 0, "errors": errors[:10] or ["No valid rows"]}
    out = bulk_ingest(rings)
    out["errors"] = errors[:10]
    return out


@router.delete("/clear")
def clear_rings(date: Optional[str] = None):
    """Wipe rings (optionally for a specific date) — admin only in real life."""
    q = {"date": date} if date else {}
    res = db["pos_rings"].delete_many(q)
    return {"ok": True, "deleted": res.deleted_count}


@router.get("/status")
def status():
    """Quick health check — how much data have we ingested?"""
    total = db["pos_rings"].count_documents({})
    if total == 0:
        return {"ok": True, "total": 0, "demo_active": True,
                  "message": "No rings yet — Reports Hub serves demo data. POST to /api/pos-rings/bulk to start."}
    pipeline = [
        {"$group": {"_id": "$date", "count": {"$sum": 1},
                       "net": {"$sum": "$price"}}},
        {"$sort": {"_id": -1}}, {"$limit": 7},
    ]
    by_date = list(db["pos_rings"].aggregate(pipeline))
    by_date = [{"date": r["_id"], "count": r["count"],
                  "net_sales": round(r["net"] or 0, 2)} for r in by_date]
    outlets = sorted({r["outlet_id"] for r in db["pos_rings"].find(
        {}, {"outlet_id": 1, "_id": 0}).limit(50000)})
    return {"ok": True, "total": total, "demo_active": False,
              "by_date": by_date, "distinct_outlets": len(outlets)}


@router.post("/seed-demo")
def seed_demo(days: int = 1, rings_per_day: int = 200):
    """Generate sample rings so a demo can show real Reports Hub numbers
    without waiting for a POS integration."""
    import random, hashlib
    from datetime import timedelta as _td
    random.seed(42)
    today = datetime.now(timezone.utc).date()
    outlets = list(db["outlets"].find({"active": True},
        {"_id": 0, "outlet_id": 1, "name": 1}))
    if not outlets:
        outlets = [{"outlet_id": "out-coastal-kitchen", "name": "Coastal Kitchen"},
                      {"outlet_id": "out-rooftop-lounge", "name": "Rooftop Lounge"},
                      {"outlet_id": "out-pool-grill", "name": "Pool Grill"}]
    items = [
        ("Dry-aged ribeye 16oz", 78, 22), ("Black bass à la plancha", 52, 15.5),
        ("Truffle agnolotti", 38, 8), ("Heirloom tomato salad", 22, 6.5),
        ("Wagyu tartare", 32, 11), ("Charred octopus", 36, 9.5),
        ("Dover sole meunière", 68, 21), ("Crispy duck confit", 44, 13),
        ("Beet salad", 18, 4.8), ("Tuna tartare", 26, 8.2),
        ("Lobster roll", 38, 14), ("Bone marrow", 24, 6.5),
        ("Cacio e pepe", 28, 6), ("Chocolate soufflé", 16, 3.5),
    ]
    tenders = ["Visa", "Master Card", "American Express", "Cash", "Room Charge"]
    servers = list(db["employees"].find({"active": True},
        {"_id": 0, "id": 1}).limit(10)) or [{"id": f"emp-{i}"} for i in range(10)]
    inserted = 0
    for d in range(days):
        the_date = (today - _td(days=d)).isoformat()
        for i in range(rings_per_day):
            outlet = random.choice(outlets)
            item_name, price, cost = random.choice(items)
            qty = random.choices([1, 2, 3, 4], weights=[6, 3, 1, 0.5])[0]
            hour = random.choices(range(11, 23),
                                          weights=[1, 2, 3, 4, 3, 2, 4, 5, 4, 3, 2, 1])[0]
            minute = random.randint(0, 59)
            ring = {
                "ring_id": f"r-{the_date}-{outlet['outlet_id']}-{i:04d}",
                "outlet_id": outlet["outlet_id"],
                "date": the_date,
                "time": f"{hour:02d}:{minute:02d}",
                "hour": hour,
                "server_id": random.choice(servers).get("id"),
                "item_name": item_name,
                "qty": qty,
                "price": round(qty * price, 2),
                "cost": round(qty * cost, 2),
                "void": random.random() < 0.02,
                "comp": random.random() < 0.04,
                "tender": random.choice(tenders),
                "tender_amount": round(qty * price * 1.085, 2),
                "ingested_at": utcnow_iso(),
            }
            db["pos_rings"].update_one({"ring_id": ring["ring_id"]},
                                                {"$set": ring}, upsert=True)
            inserted += 1
    return {"ok": True, "inserted": inserted, "days": days,
              "message": f"Seeded {inserted} rings across {days} day(s). "
                            f"Reports Hub will now show real numbers."}
