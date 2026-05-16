"""
Production Schedules API
========================
Persistent cake/pastry/production reminders that surface on the main
LUCCCA dashboard as an acknowledge-to-dismiss banner.

Groups multiple items due on the same calendar day and exposes
details (flavor profile, client, BEO link, decorator, delivery time)
for the popup drawer.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from typing import Optional, List
from database import db

# Use a dedicated collection — the legacy `production_schedules` collection
# on this cluster has a pre-existing unique index on `production_date` that
# conflicts with our schema. Kept isolated for the Cake/Pastry dashboard feed.
COLL = "pastry_production_reminders"

router = APIRouter(prefix="/api/production-schedules", tags=["production-schedules"])
_uid = lambda: str(uuid4())[:8]
_now = lambda: datetime.now(timezone.utc)

# ─────────────────────────────────────────────
# Sample seed so the banner is meaningful in dev
# ─────────────────────────────────────────────
def _seed_if_empty():
    if db[COLL].count_documents({}) > 0:
        return
    now = _now()
    seed = [
        {
            "kind": "cake", "priority": "high",
            "title": "Morrison Wedding — 3-tier Champagne",
            "client_name": "Morrison Family",
            "client_phone": "+1 305-555-0142",
            "due_date": (now + timedelta(days=1, hours=6)).isoformat(),
            "delivery_time": "15:00",
            "venue": "Grand Ballroom A",
            "beo_id": "BEO-8841",
            "beo_link": "/beo/BEO-8841",
            "assigned_chef": "Chef Gio",
            "assigned_decorator": "Pastry Lead — Marisol",
            "flavor_profile": [
                {"tier": 1, "flavor": "Champagne", "filling": "Swiss Meringue"},
                {"tier": 2, "flavor": "Vanilla Bean", "filling": "Lemon Curd"},
                {"tier": 3, "flavor": "Almond", "filling": "Raspberry Jam"},
            ],
            "decorations": ["Cascading Roses", "Gold Leaf", "Pearl Cluster"],
            "dietary_notes": "One gluten-free tier (tier 3) — segregated prep.",
            "prep_stage": "fondant_day",
            "status": "pending",
        },
        {
            "kind": "cake", "priority": "high",
            "title": "Reyes Anniversary — Geode Showpiece",
            "client_name": "Carlos & Lucia Reyes",
            "client_phone": "+1 305-555-0198",
            "due_date": (now + timedelta(days=1, hours=8)).isoformat(),
            "delivery_time": "18:30",
            "venue": "Terrace Suite",
            "beo_id": "BEO-8842",
            "beo_link": "/beo/BEO-8842",
            "assigned_chef": "Chef Gio",
            "assigned_decorator": "Pastry Lead — Marisol",
            "flavor_profile": [
                {"tier": 1, "flavor": "Dark Chocolate", "filling": "Salted Caramel"},
            ],
            "decorations": ["Amethyst Geode", "Edible Gold Veining"],
            "dietary_notes": "No nuts.",
            "prep_stage": "isomalt",
            "status": "pending",
        },
        {
            "kind": "specialty_cake", "priority": "medium",
            "title": "Patel 50th Birthday — Unicorn Magic",
            "client_name": "Patel Family",
            "client_phone": "+1 305-555-0173",
            "due_date": (now + timedelta(days=2, hours=9)).isoformat(),
            "delivery_time": "14:00",
            "venue": "Pool Deck Cabana 4",
            "beo_id": "BEO-8850",
            "beo_link": "/beo/BEO-8850",
            "assigned_chef": "Chef Gio",
            "assigned_decorator": "Asst — Amira",
            "flavor_profile": [
                {"tier": 1, "flavor": "Funfetti", "filling": "Vanilla Custard"},
            ],
            "decorations": ["Rainbow Ombre", "Gold Horn", "Peony Crown"],
            "dietary_notes": "Nut-free kitchen required.",
            "prep_stage": "buttercream",
            "status": "pending",
        },
        {
            "kind": "production", "priority": "medium",
            "title": "Sat AM — Bakery Case Refill",
            "client_name": "In-house (Bakery Case)",
            "due_date": (now + timedelta(days=2, hours=5)).isoformat(),
            "delivery_time": "07:00",
            "venue": "Main Bakery Display",
            "beo_id": None, "beo_link": None,
            "assigned_chef": "Chef Gio",
            "assigned_decorator": "Baker — Jorge",
            "flavor_profile": [
                {"batch": "Croissants", "qty": 120},
                {"batch": "Pain au Chocolat", "qty": 80},
                {"batch": "Almond Danish", "qty": 60},
            ],
            "decorations": [],
            "dietary_notes": "",
            "prep_stage": "proof_overnight",
            "status": "pending",
        },
        {
            "kind": "decorating", "priority": "low",
            "title": "Chen Corporate — Logo Sheet Cakes (4)",
            "client_name": "Chen Group Holdings",
            "client_phone": "+1 305-555-0110",
            "due_date": (now + timedelta(days=3, hours=10)).isoformat(),
            "delivery_time": "11:00",
            "venue": "Conference Room C-Level",
            "beo_id": "BEO-8861",
            "beo_link": "/beo/BEO-8861",
            "assigned_chef": "Chef Gio",
            "assigned_decorator": "Pastry Lead — Marisol",
            "flavor_profile": [
                {"batch": "Sheet Cake × 4", "flavor": "Vanilla/Chocolate marble"},
            ],
            "decorations": ["Edible Image — Corporate Logo", "Airbrush Gradient"],
            "dietary_notes": "",
            "prep_stage": "edible_image_queue",
            "status": "pending",
        },
        {
            "kind": "cake", "priority": "high",
            "title": "Kim Quinceañera — Princess Castle",
            "client_name": "Kim Family",
            "client_phone": "+1 305-555-0166",
            "due_date": (now + timedelta(days=3, hours=12)).isoformat(),
            "delivery_time": "17:00",
            "venue": "Grand Ballroom B",
            "beo_id": "BEO-8855",
            "beo_link": "/beo/BEO-8855",
            "assigned_chef": "Chef Gio",
            "assigned_decorator": "Pastry Lead — Marisol",
            "flavor_profile": [
                {"tier": 1, "flavor": "Strawberry", "filling": "Strawberry Mousse"},
                {"tier": 2, "flavor": "Vanilla Bean", "filling": "Vanilla Custard"},
                {"tier": 3, "flavor": "Vanilla Bean", "filling": "Cream Cheese"},
            ],
            "decorations": ["Sugar Flowers", "Edible Pearls", "Fondant Turrets"],
            "dietary_notes": "",
            "prep_stage": "fondant_day",
            "status": "pending",
        },
    ]
    for s in seed:
        s["id"] = f"sched-{_uid()}"
        s["created_at"] = _now().isoformat()
        s["acknowledged"] = False
        s["acknowledged_at"] = None
        s["acknowledged_by"] = None
    db[COLL].insert_many(seed)


def _serialize(doc: dict) -> dict:
    doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


def _relative_label(due_iso: str) -> dict:
    try:
        due = datetime.fromisoformat(due_iso.replace("Z", "+00:00"))
    except Exception:
        return {"label": "scheduled", "days": 999, "bucket": "later"}
    now = _now()
    delta = due - now
    days = delta.total_seconds() / 86400
    if days < 0:
        return {"label": "overdue", "days": round(days, 1), "bucket": "overdue"}
    if days < 0.5:
        return {"label": "due in hours", "days": round(days, 2), "bucket": "today"}
    if days < 1.0:
        return {"label": "due today", "days": round(days, 2), "bucket": "today"}
    if days < 2.0:
        return {"label": "due tomorrow", "days": round(days, 1), "bucket": "tomorrow"}
    if days < 7.0:
        return {"label": f"due in {int(days)} days", "days": round(days, 1), "bucket": "this_week"}
    return {"label": f"due in {int(days)} days", "days": round(days, 1), "bucket": "later"}


# ═════════════════════════════════════════════
# API ENDPOINTS
# ═════════════════════════════════════════════

@router.get("/summary")
async def banner_summary():
    """Banner-ready summary: counts grouped by urgency bucket."""
    _seed_if_empty()
    items = list(db[COLL].find(
        {"acknowledged": False},
        {"_id": 0, "id": 1, "title": 1, "due_date": 1, "priority": 1, "kind": 1, "client_name": 1}
    ))
    buckets = {"overdue": 0, "today": 0, "tomorrow": 0, "this_week": 0, "later": 0}
    next_up = None
    for it in items:
        rel = _relative_label(it.get("due_date", ""))
        buckets[rel["bucket"]] = buckets.get(rel["bucket"], 0) + 1
        if next_up is None or rel["days"] < next_up["days"]:
            next_up = {"id": it["id"], "title": it["title"], "client": it.get("client_name"), **rel}
    critical = buckets["overdue"] + buckets["today"] + buckets["tomorrow"]
    return {
        "total_open": len(items),
        "buckets": buckets,
        "critical_count": critical,
        "next_up": next_up,
        "headline": _headline(buckets),
    }


def _headline(b: dict) -> str:
    parts = []
    if b.get("overdue"):
        parts.append(f"{b['overdue']} OVERDUE")
    if b.get("today"):
        parts.append(f"{b['today']} due today")
    if b.get("tomorrow"):
        parts.append(f"{b['tomorrow']} tomorrow")
    if b.get("this_week") and not parts:
        parts.append(f"{b['this_week']} this week")
    if not parts:
        return "All production on schedule"
    return " • ".join(parts)


@router.get("/")
async def list_schedules(bucket: Optional[str] = None, kind: Optional[str] = None, include_acknowledged: bool = False):
    """Full list, optionally filtered by bucket or kind."""
    _seed_if_empty()
    q: dict = {} if include_acknowledged else {"acknowledged": False}
    if kind:
        q["kind"] = kind
    cursor = db[COLL].find(q, {"_id": 0})
    items = []
    for it in cursor:
        rel = _relative_label(it.get("due_date", ""))
        if bucket and rel["bucket"] != bucket:
            continue
        items.append({**it, **{"relative": rel}})
    items.sort(key=lambda x: x["relative"]["days"])
    return {"items": items, "total": len(items)}


@router.get("/grouped-by-day")
async def grouped_by_day():
    """Groups open items by calendar day — used by the banner popup."""
    _seed_if_empty()
    cursor = db[COLL].find({"acknowledged": False}, {"_id": 0})
    groups: dict = {}
    for it in cursor:
        try:
            due = datetime.fromisoformat(it["due_date"].replace("Z", "+00:00"))
            key = due.strftime("%Y-%m-%d")
            label = due.strftime("%A, %b %d")
        except Exception:
            key = "unknown"; label = "Unknown"
        groups.setdefault(key, {"date": key, "label": label, "items": []})
        rel = _relative_label(it.get("due_date", ""))
        groups[key]["items"].append({**it, **{"relative": rel}})
    ordered = sorted(groups.values(), key=lambda g: g["date"])
    for g in ordered:
        g["count"] = len(g["items"])
        g["bucket"] = g["items"][0]["relative"]["bucket"] if g["items"] else "later"
    return {"groups": ordered, "total_groups": len(ordered)}


@router.get("/{item_id}")
async def get_schedule(item_id: str):
    item = db[COLL].find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Schedule item not found")
    item["relative"] = _relative_label(item.get("due_date", ""))
    return item


@router.post("/")
async def create_schedule(body: dict):
    body["id"] = f"sched-{_uid()}"
    body["created_at"] = _now().isoformat()
    body.setdefault("acknowledged", False)
    body.setdefault("acknowledged_at", None)
    body.setdefault("acknowledged_by", None)
    body.setdefault("priority", "medium")
    body.setdefault("kind", "cake")
    body.setdefault("status", "pending")
    db[COLL].insert_one({**body})
    body.pop("_id", None)
    return body


@router.post("/{item_id}/acknowledge")
async def acknowledge(item_id: str, body: Optional[dict] = None):
    by = (body or {}).get("by", "Chef Gio")
    res = db[COLL].update_one(
        {"id": item_id},
        {"$set": {"acknowledged": True, "acknowledged_at": _now().isoformat(), "acknowledged_by": by}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Schedule item not found")
    return {"success": True, "id": item_id}


@router.post("/acknowledge-all")
async def acknowledge_all(body: Optional[dict] = None):
    by = (body or {}).get("by", "Chef Gio")
    res = db[COLL].update_many(
        {"acknowledged": False},
        {"$set": {"acknowledged": True, "acknowledged_at": _now().isoformat(), "acknowledged_by": by}}
    )
    return {"success": True, "count": res.modified_count}


@router.post("/seed/reset")
async def reset_seed():
    """Dev helper — wipe and reseed demo production items."""
    db[COLL].delete_many({})
    _seed_if_empty()
    return {"success": True, "seeded": db[COLL].count_documents({})}
