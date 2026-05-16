"""
Spa Services Module
===================
Create / update / activate / deactivate spa services. Every create or
update automatically enqueues a POS outbound record so the hotel's POS
(Micros, Toast, etc.) stays in sync. Activation/deactivation is a single
toggle that also propagates to the POS queue.

Services are surfaced to the public booking page.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List
from uuid import uuid4

from database import db

router = APIRouter(prefix="/api/spa-services", tags=["spa-services"])
COLL = "spa_services"
_now = lambda: datetime.now(timezone.utc).isoformat()


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class SpaServiceCreate(BaseModel):
    name: str
    category: str = "massage"   # massage, facial, body, nails, salon, package
    description: Optional[str] = ""
    duration_min: int = 60
    price: float
    therapists: List[str] = []     # therapist IDs or names
    rooms: List[str] = []          # room IDs or types
    active: bool = True
    sku: Optional[str] = None
    tax_code: Optional[str] = None
    color: Optional[str] = "#c8a97e"
    image_url: Optional[str] = None
    # resort-facing pamphlet inclusions
    include_in_pamphlet: bool = True


class SpaServiceUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    duration_min: Optional[int] = None
    price: Optional[float] = None
    therapists: Optional[List[str]] = None
    rooms: Optional[List[str]] = None
    active: Optional[bool] = None
    sku: Optional[str] = None
    tax_code: Optional[str] = None
    color: Optional[str] = None
    image_url: Optional[str] = None
    include_in_pamphlet: Optional[bool] = None


# ─────────────────────────────────────────────
# POS sync helper
# ─────────────────────────────────────────────
def enqueue_pos(service: dict, action: str):
    """
    action: 'create' | 'update' | 'activate' | 'deactivate'
    The POS adapter (next session) will consume these records and
    translate them to Micros / Toast service-item payloads.
    """
    db["pos_outbound"].insert_one({
        "id": f"pos-{uuid4().hex[:8]}",
        "kind": "spa_service",
        "action": action,
        "service_id": service.get("id"),
        "sku": service.get("sku"),
        "name": service.get("name"),
        "price": service.get("price"),
        "active": service.get("active"),
        "payload": service,
        "status": "pending",
        "attempts": 0,
        "created_at": _now(),
        "delivered_at": None,
    })


def _auto_sku(name: str) -> str:
    base = "".join([c for c in name.upper() if c.isalnum()])[:6] or "SPA"
    return f"SPA-{base}-{uuid4().hex[:4].upper()}"


# ─────────────────────────────────────────────
# Seed (so the UI is meaningful in dev)
# ─────────────────────────────────────────────
def _seed_if_empty():
    if db[COLL].count_documents({}) > 0:
        return
    seed = [
        {"name": "Swedish Massage", "category": "massage", "duration_min": 60, "price": 155,
         "description": "Classic relaxation massage with long flowing strokes.", "color": "#c8a97e"},
        {"name": "Deep Tissue Massage", "category": "massage", "duration_min": 80, "price": 195,
         "description": "Targeted pressure for chronic tension.", "color": "#a6846a"},
        {"name": "Signature Hot Stone", "category": "massage", "duration_min": 90, "price": 235,
         "description": "Basalt stones + aromatherapy oils.", "color": "#8b6b4a"},
        {"name": "Hydrating Facial", "category": "facial", "duration_min": 60, "price": 165,
         "description": "Hyaluronic acid + cold-plunge finish.", "color": "#e8c7a0"},
        {"name": "Gold Luminosity Facial", "category": "facial", "duration_min": 90, "price": 325,
         "description": "24k gold mask, LED therapy, signature massage.", "color": "#d4a843"},
        {"name": "Sea Salt Body Polish", "category": "body", "duration_min": 60, "price": 145,
         "description": "Exfoliation + hydrating wrap.", "color": "#9db9c7"},
        {"name": "Couples Retreat Package", "category": "package", "duration_min": 120, "price": 620,
         "description": "Side-by-side Swedish + champagne + private suite.", "color": "#c48ba0"},
    ]
    for s in seed:
        s["id"] = f"svc-{uuid4().hex[:8]}"
        s["active"] = True
        s["therapists"] = []
        s["rooms"] = []
        s["sku"] = _auto_sku(s["name"])
        s["include_in_pamphlet"] = True
        s["created_at"] = _now()
        s["updated_at"] = _now()
    db[COLL].insert_many(seed)
    for s in seed:
        s.pop("_id", None)
        enqueue_pos(s, "create")


# ─────────────────────────────────────────────
# API
# ─────────────────────────────────────────────
@router.get("/")
async def list_services(category: Optional[str] = None, active_only: bool = False):
    _seed_if_empty()
    q: dict = {}
    if category: q["category"] = category
    if active_only: q["active"] = True
    items = list(db[COLL].find(q, {"_id": 0}).sort("name", 1))
    return {"services": items, "total": len(items),
            "categories": sorted({it.get("category", "other") for it in items})}


@router.get("/{service_id}")
async def get_service(service_id: str):
    s = db[COLL].find_one({"id": service_id}, {"_id": 0})
    if not s: raise HTTPException(404, "Service not found")
    return s


@router.post("/")
async def create_service(body: SpaServiceCreate):
    data = body.dict()
    data["id"] = f"svc-{uuid4().hex[:8]}"
    data["sku"] = data.get("sku") or _auto_sku(data["name"])
    data["created_at"] = _now()
    data["updated_at"] = _now()
    db[COLL].insert_one({**data})
    data.pop("_id", None)
    enqueue_pos(data, "create")
    return data


@router.patch("/{service_id}")
async def update_service(service_id: str, body: SpaServiceUpdate):
    existing = db[COLL].find_one({"id": service_id}, {"_id": 0})
    if not existing: raise HTTPException(404, "Service not found")
    patch = {k: v for k, v in body.dict().items() if v is not None}
    patch["updated_at"] = _now()
    db[COLL].update_one({"id": service_id}, {"$set": patch})
    merged = {**existing, **patch}
    enqueue_pos(merged, "update")
    return merged


@router.post("/{service_id}/toggle-active")
async def toggle_active(service_id: str):
    s = db[COLL].find_one({"id": service_id}, {"_id": 0})
    if not s: raise HTTPException(404, "Service not found")
    new_active = not s.get("active", True)
    db[COLL].update_one({"id": service_id}, {"$set": {"active": new_active, "updated_at": _now()}})
    s["active"] = new_active
    enqueue_pos(s, "activate" if new_active else "deactivate")
    return {"success": True, "id": service_id, "active": new_active}


@router.delete("/{service_id}")
async def delete_service(service_id: str):
    s = db[COLL].find_one({"id": service_id}, {"_id": 0})
    if not s: raise HTTPException(404, "Service not found")
    db[COLL].delete_one({"id": service_id})
    enqueue_pos(s, "deactivate")
    return {"success": True, "id": service_id}


@router.get("/pos/sync-queue")
async def pos_sync_queue(status: str = "pending", limit: int = 100):
    items = list(db["pos_outbound"].find({"kind": "spa_service", "status": status}, {"_id": 0})
                 .sort("created_at", 1).limit(limit))
    return {"items": items, "total": len(items)}
