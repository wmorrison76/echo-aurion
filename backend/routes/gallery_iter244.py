"""iter244 · Gallery upgrades — link photos to recipes / menu items / waste / dishes.

Endpoints:
  POST /api/gallery/{photo_id}/link-recipe    {recipe_id}
  POST /api/gallery/{photo_id}/link-menu-item {menu_item_id}
  POST /api/gallery/{photo_id}/link-waste     {waste_event_id}
  POST /api/gallery/{photo_id}/recognize      → run vision on the photo and
                                                  surface candidate recipes/menu
                                                  items by name match
  GET  /api/gallery/list                      enriched (joins station/item/recipe)
  GET  /api/gallery/{photo_id}/full           full detail w/ all linked refs
  POST /api/gallery/{photo_id}/notes          chef notes append
  POST /api/gallery/{photo_id}/like           heart count
"""
from __future__ import annotations
import base64
import re
import uuid
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from database import db
from lib.time import utcnow_iso

router = APIRouter(tags=["gallery-iter244"])


# ── Enriched list ───────────────────────────────────────────────────────
@router.get("/api/gallery/list")
def gallery_list(outlet_id: Optional[str] = None,
                   station: Optional[str] = None,
                   q: Optional[str] = None,
                   only_confirmed: bool = False,
                   limit: int = 60):
    query: Dict[str, Any] = {}
    if outlet_id: query["outlet_id"] = outlet_id
    if station: query["station_id"] = station
    if only_confirmed: query["confirmed"] = True
    if q:
        query["$or"] = [
            {"label": {"$regex": q, "$options": "i"}},
            {"auto_name": {"$regex": q, "$options": "i"}},
        ]
    rows = list(db["food_photos"].find(query, {"_id": 0, "media_base64": 0})
                  .sort("created_at", -1).limit(min(limit, 200)))

    # Enrich with linked recipe + menu item names
    for r in rows:
        if r.get("recipe_id"):
            rec = db["recipes"].find_one({"id": r["recipe_id"]},
                                              {"_id": 0, "name": 1, "yield": 1, "cost": 1})
            r["recipe"] = rec
        if r.get("menu_item_id"):
            mi = db["menu_items"].find_one({"id": r["menu_item_id"]},
                                                {"_id": 0, "name": 1, "price": 1})
            r["menu_item"] = mi
        if r.get("station_id"):
            st = db["ecw_stations"].find_one({"id": r["station_id"]}, {"_id": 0, "name": 1})
            r["station"] = st
        # Heart count from gallery_likes
        r["heart_count"] = db["gallery_likes"].count_documents({"photo_id": r["id"]})

    return {"ok": True, "count": len(rows), "rows": rows}


@router.get("/api/gallery/{photo_id}/full")
def gallery_full(photo_id: str):
    p = db["food_photos"].find_one({"id": photo_id}, {"_id": 0, "media_base64": 0})
    if not p: raise HTTPException(404, "photo not found")
    if p.get("recipe_id"):
        p["recipe"] = db["recipes"].find_one({"id": p["recipe_id"]}, {"_id": 0})
    if p.get("menu_item_id"):
        p["menu_item"] = db["menu_items"].find_one({"id": p["menu_item_id"]}, {"_id": 0})
    if p.get("waste_event_id"):
        p["waste_event"] = db["echowaste_events"].find_one(
            {"id": p["waste_event_id"]}, {"_id": 0, "media_base64": 0})
    p["notes"] = list(db["gallery_notes"].find({"photo_id": photo_id}, {"_id": 0})
                          .sort("created_at", -1).limit(50))
    p["heart_count"] = db["gallery_likes"].count_documents({"photo_id": photo_id})
    return {"ok": True, "photo": p}


# ── Linking endpoints ───────────────────────────────────────────────────
class LinkIn(BaseModel):
    target_id: str


@router.post("/api/gallery/{photo_id}/link-recipe")
def link_recipe(photo_id: str, body: LinkIn):
    if not db["recipes"].find_one({"id": body.target_id}):
        raise HTTPException(404, "recipe not found")
    db["food_photos"].update_one({"id": photo_id},
                                       {"$set": {"recipe_id": body.target_id,
                                                   "updated_at": utcnow_iso()}})
    return {"ok": True}


@router.post("/api/gallery/{photo_id}/link-menu-item")
def link_menu_item(photo_id: str, body: LinkIn):
    if not db["menu_items"].find_one({"id": body.target_id}):
        raise HTTPException(404, "menu item not found")
    db["food_photos"].update_one({"id": photo_id},
                                       {"$set": {"menu_item_id": body.target_id,
                                                   "updated_at": utcnow_iso()}})
    # Cross-link: store the photo id on menu_item too so Menu Builder can show hero
    db["menu_items"].update_one({"id": body.target_id},
                                      {"$set": {"hero_photo_id": photo_id,
                                                  "hero_photo_url": db["food_photos"].find_one(
                                                      {"id": photo_id}, {"_id": 0, "blob_url": 1}).get("blob_url"),
                                                  "updated_at": utcnow_iso()}})
    return {"ok": True}


@router.post("/api/gallery/{photo_id}/link-waste")
def link_waste(photo_id: str, body: LinkIn):
    db["food_photos"].update_one({"id": photo_id},
                                       {"$set": {"waste_event_id": body.target_id,
                                                   "updated_at": utcnow_iso()}})
    return {"ok": True}


# ── Recognize: vision lookup → suggest recipes/menu items by name ────────
@router.post("/api/gallery/{photo_id}/recognize")
async def recognize(photo_id: str):
    p = db["food_photos"].find_one({"id": photo_id}, {"_id": 0})
    if not p: raise HTTPException(404, "photo not found")
    media = p.get("media_base64")
    suggestions: Dict[str, List[Dict[str, Any]]] = {"recipes": [], "menu_items": []}
    detected: List[str] = []
    if media:
        try:
            from routes.echowaste import _run_vision_llm
            vr = await _run_vision_llm(media)
            for it in (vr or {}).get("items", []) or []:
                n = it.get("name")
                if n: detected.append(n)
        except Exception as e:
            return {"ok": False, "error": str(e)[:200]}

    # Search recipes + menu items by detected name fragments
    for term in detected[:5]:
        terms = [w for w in re.split(r"\s+", term) if len(w) > 2]
        rgx = "|".join(map(re.escape, terms)) if terms else re.escape(term)
        suggestions["recipes"].extend(list(db["recipes"].find(
            {"name": {"$regex": rgx, "$options": "i"}},
            {"_id": 0, "id": 1, "name": 1, "yield": 1},
        ).limit(5)))
        suggestions["menu_items"].extend(list(db["menu_items"].find(
            {"name": {"$regex": rgx, "$options": "i"}},
            {"_id": 0, "id": 1, "name": 1, "price": 1, "category": 1},
        ).limit(5)))

    # De-dupe
    suggestions["recipes"] = {r["id"]: r for r in suggestions["recipes"]}
    suggestions["menu_items"] = {r["id"]: r for r in suggestions["menu_items"]}
    suggestions = {k: list(v.values())[:8] for k, v in suggestions.items()}

    return {"ok": True, "detected_items": detected, **suggestions}


# ── Notes (chef commentary on each dish) ────────────────────────────────
class NoteIn(BaseModel):
    text: str


@router.post("/api/gallery/{photo_id}/notes")
def add_gallery_note(photo_id: str, body: NoteIn,
                       x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    n = {
        "id": uuid.uuid4().hex[:12],
        "photo_id": photo_id,
        "text": body.text.strip()[:2000],
        "author_id": x_user_id or "chef-william",
        "created_at": utcnow_iso(),
    }
    db["gallery_notes"].insert_one(dict(n))
    return {"ok": True, "note": n}


# ── Likes ───────────────────────────────────────────────────────────────
@router.post("/api/gallery/{photo_id}/like")
def like_photo(photo_id: str,
                 x_user_id: Optional[str] = Header(None, alias="X-User-Id")):
    uid = x_user_id or "chef-william"
    db["gallery_likes"].update_one(
        {"photo_id": photo_id, "user_id": uid},
        {"$set": {"photo_id": photo_id, "user_id": uid, "created_at": utcnow_iso()}},
        upsert=True,
    )
    return {"ok": True, "count": db["gallery_likes"].count_documents({"photo_id": photo_id})}


# ── Recipe + menu item lookup helpers (for picker UIs) ───────────────────
@router.get("/api/gallery/recipe-options")
def recipe_options(q: Optional[str] = None, limit: int = 30):
    query = {}
    if q: query["name"] = {"$regex": q, "$options": "i"}
    rows = list(db["recipes"].find(query, {"_id": 0, "id": 1, "name": 1, "yield": 1, "cost": 1})
                  .limit(min(limit, 60)))
    return {"ok": True, "rows": rows}


@router.get("/api/gallery/menu-item-options")
def menu_item_options(q: Optional[str] = None, limit: int = 30):
    query = {}
    if q: query["name"] = {"$regex": q, "$options": "i"}
    rows = list(db["menu_items"].find(query, {"_id": 0, "id": 1, "name": 1, "category": 1, "price": 1})
                  .limit(min(limit, 60)))
    return {"ok": True, "rows": rows}
