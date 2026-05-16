"""
Guest 360 Hub
=============
Deep guest profile with CRUD, notes, loyalty, preferences, in-house and
VIP queries. Complements the existing `guest360.py` module (which
searches across sources) by providing a canonical profile collection.

Endpoints (prefix /api/guest360-hub):
  GET  /profiles                      — list guests (filter: vip, loyalty_tier, in_house)
  GET  /profiles/{guest_id}           — full 360 view + concierge + reservations
  POST /profiles                      — upsert a guest
  PATCH /profiles/{guest_id}          — partial update
  POST /profiles/{guest_id}/note      — append staff note (PII/liability scrubbed)
  GET  /in-house                      — guests currently checked in
  GET  /vip-today                     — VIPs arriving today
  POST /seed                          — demo seed
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import uuid4
import random
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db

router = APIRouter(prefix="/api/guest360-hub", tags=["guest360-hub"])

GUEST_COLL = "guest360_profiles"
NOTES_COLL = "guest360_notes"

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()


class UpsertReq(BaseModel):
    guest_id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    loyalty_tier: str = "standard"
    vip: bool = False
    in_house: bool = False
    current_room: Optional[str] = None
    allergy_flags: List[str] = []
    dietary_prefs: List[str] = []
    wine_preference: Optional[str] = None


class NoteReq(BaseModel):
    category: str = "general"
    body: str
    author: str = "staff"


async def _seed_if_empty():
    if db[GUEST_COLL].count_documents({}) == 0:
        names = [
            ("Eiko Nakamura", "eiko@example.com", "black"),
            ("Meera Patel", "meera@example.com", "platinum"),
            ("Jin Woo Kim", "jin@example.com", "gold"),
            ("Sergio Aldana", "sergio@example.com", "gold"),
            ("Rebecca Weiss", "rebecca@example.com", "platinum"),
            ("Luisa Rossi", "luisa@example.com", "standard"),
            ("Tunde Abioye", "tunde@example.com", "platinum"),
            ("Brigitte Chevrier", "brigitte@example.com", "black"),
            ("Dilawar Okonkwo", "dilawar@example.com", "gold"),
            ("Katherine Lin", "kat@example.com", "standard"),
        ]
        rooms = ["201", "302", "412", "414", "502", None, "614", "708", None, "303"]
        for i, (n, e, t) in enumerate(names):
            db[GUEST_COLL].insert_one({
                "guest_id": f"gst-{i:04d}",
                "name": n,
                "email": e,
                "phone": f"+1-555-01{i:02d}",
                "loyalty_tier": t,
                "loyalty_points": random.randint(500, 48000),
                "vip": t in ("platinum", "black"),
                "in_house": rooms[i] is not None,
                "current_room": rooms[i],
                "anniversary_date": None,
                "birthday": f"{random.randint(1,12):02d}-{random.randint(1,28):02d}",
                "allergy_flags": random.sample(["gluten", "nuts", "shellfish", "dairy", "sulfites"], k=random.randint(0, 2)),
                "dietary_prefs": random.sample(["pescatarian", "vegetarian", "vegan", "keto", "halal"], k=random.randint(0, 1)),
                "pillow_type": random.choice(["down", "hypoallergenic", "firm", "memory foam", None]),
                "wine_preference": random.choice(["Bordeaux reds", "Napa cabs", "Burgundy whites", "Champagne only", None]),
                "preferred_table": random.choice([None, "booth", "window", "quiet", "bar"]),
                "lifetime_revenue": round(random.uniform(3400, 182000), 2),
                "total_stays": random.randint(1, 24),
                "last_stay_date": (_now() - timedelta(days=random.randint(0, 365))).isoformat(),
            })


@router.post("/seed")
async def seed():
    await _seed_if_empty()
    return {"ok": True, "profiles": db[GUEST_COLL].count_documents({})}


@router.get("/profiles")
async def list_profiles(vip: Optional[bool] = None, loyalty_tier: Optional[str] = None, in_house: Optional[bool] = None, limit: int = 100):
    await _seed_if_empty()
    q = {}
    if vip is not None:
        q["vip"] = vip
    if loyalty_tier:
        q["loyalty_tier"] = loyalty_tier
    if in_house is not None:
        q["in_house"] = in_house
    docs = list(db[GUEST_COLL].find(q, {"_id": 0}).limit(limit))
    return {"items": docs, "count": len(docs)}


@router.get("/profiles/{guest_id}")
async def get_profile(guest_id: str):
    doc = db[GUEST_COLL].find_one({"guest_id": guest_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "guest not found")
    notes = list(db[NOTES_COLL].find({"guest_id": guest_id}, {"_id": 0}).sort("created_at", -1).limit(30))
    concierge = list(db["concierge_tickets"].find({"guest_id": guest_id}, {"_id": 0}).sort("created_at", -1).limit(20))
    reservations = list(db["foh_reservations"].find({"guest_name": doc["name"]}, {"_id": 0}).sort("eta", -1).limit(20))
    spa = list(db["spa_inquiries"].find({"guest_name": doc["name"]}, {"_id": 0}).sort("created_at", -1).limit(10))
    return {
        "profile": doc,
        "notes": notes,
        "concierge_history": concierge,
        "reservations": reservations,
        "spa_touchpoints": spa,
    }


@router.post("/profiles")
async def upsert_profile(req: UpsertReq):
    gid = req.guest_id or f"gst-{uuid4().hex[:8]}"
    data = req.dict(exclude_none=True)
    data["guest_id"] = gid
    existing = db[GUEST_COLL].find_one({"guest_id": gid}, {"_id": 0})
    if existing:
        db[GUEST_COLL].update_one({"guest_id": gid}, {"$set": data})
    else:
        data.setdefault("loyalty_points", 0)
        data.setdefault("lifetime_revenue", 0.0)
        data.setdefault("total_stays", 0)
        db[GUEST_COLL].insert_one(data.copy())
    profile = db[GUEST_COLL].find_one({"guest_id": gid}, {"_id": 0})
    return {"ok": True, "profile": profile}


@router.patch("/profiles/{guest_id}")
async def patch_profile(guest_id: str, req: UpsertReq):
    res = db[GUEST_COLL].update_one({"guest_id": guest_id}, {"$set": {k: v for k, v in req.dict(exclude_none=True).items() if k != "guest_id"}})
    if res.matched_count == 0:
        raise HTTPException(404, "guest not found")
    return {"ok": True, "profile": db[GUEST_COLL].find_one({"guest_id": guest_id}, {"_id": 0})}


@router.post("/profiles/{guest_id}/note")
async def add_note(guest_id: str, req: NoteReq):
    body = req.body
    for pat, repl in [
        (r"\b(drunk|intoxicated|on drugs)\b", "[redacted-behavior]"),
        (r"\b(crazy|psychotic|nutjob)\b", "[redacted-opinion]"),
        (r"\b\d{3}-\d{2}-\d{4}\b", "[redacted-ssn]"),
    ]:
        body = re.sub(pat, repl, body, flags=re.IGNORECASE)
    doc = {
        "id": f"note-{uuid4().hex[:8]}",
        "guest_id": guest_id,
        "category": req.category,
        "body": body,
        "author": req.author,
        "created_at": _iso(),
    }
    db[NOTES_COLL].insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "note": doc}


@router.get("/in-house")
async def in_house():
    await _seed_if_empty()
    docs = list(db[GUEST_COLL].find({"in_house": True}, {"_id": 0}))
    return {"items": docs, "count": len(docs)}


@router.get("/vip-today")
async def vip_today():
    await _seed_if_empty()
    docs = list(db[GUEST_COLL].find({"vip": True}, {"_id": 0}))
    return {"items": docs, "count": len(docs)}
