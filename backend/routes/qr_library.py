"""
D37 · QR Library + outlet storyboard + mobile menu allergens.

User directives in this PR:

  1. Sidebar/admin surface to STORE QR codes for property
     destinations:
       · Spa website
       · IRD & Amenities site
       · Guest Concierge
       · MyEcho hourly / salary download
       · Fresh Meal site
       · Every menu on the property
     Plus a tile to copy a QR's URL to clipboard, or print one or
     more QRs at once (multi-select).

  2. QR generator: paste a URL → get back the QR payload data
     for any in-property destination, including a print-ready
     bundle with caption + url stamped beneath.

  3. Mobile menu surface for guests where allergens are listed
     on each menu item — visible to a guest scanning the menu QR
     without exposing internal recipe cost / method.

  4. Outlet "Instagram-style" storyboard. Each restaurant + outlet
     surfaces a carousel of marketing-team-uploaded posts. NOT a
     link to Instagram — content lives in the app, gives a sense
     and feel of the venue when concierge / guest loads it.

This module ships all four. They share a tenant_id contract,
emit audit log entries on admin writes, and follow the established
D33-D35 idempotency conventions where applicable.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/qr", tags=["qr-library"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _emit_audit(tenant_id: str, kind: str, entity_id: str,
                payload: Dict[str, Any]) -> None:
    try:
        db["audit_log"].insert_one({
            "id": uuid.uuid4().hex,
            "tenant_id": tenant_id,
            "kind": f"qr_library.{kind}",
            "entity_id": entity_id,
            "payload": payload,
            "created_at": _now_iso(),
        })
    except Exception:
        pass


# QR payload URL: we generate via the public chart server. Per the
# fuse-box pattern (D17), the actual provider URL is configurable —
# this is the default. The frontend can render a local QR via a
# library; this URL is the failover / printable.
def _qr_image_url(target_url: str, size: int = 320) -> str:
    return (f"https://api.qrserver.com/v1/create-qr-code/"
            f"?size={size}x{size}&data={quote_plus(target_url)}")


# Built-in destination types — can be extended by /items POST with
# any custom type, but this gives the admin a starter palette.
DEFAULT_TYPES: List[Dict[str, Any]] = [
    {"type": "spa_site", "label": "Spa Website",
     "description": "Bookings, services, packages"},
    {"type": "ird_site", "label": "IRD & Amenities",
     "description": "In-room dining + amenity ordering"},
    {"type": "guest_concierge", "label": "Guest Concierge",
     "description": "All-in-one guest-facing concierge"},
    {"type": "myecho_install", "label": "MyEcho Install",
     "description": "Employee app download (hourly + salary)"},
    {"type": "fresh_meal_site", "label": "Fresh Meal",
     "description": "Fresh meal program ordering"},
    {"type": "menu", "label": "Menu",
     "description": "Outlet menu (mobile, with allergens)"},
    {"type": "outlet_landing", "label": "Outlet Landing",
     "description": "Restaurant or outlet front page (storyboard)"},
    {"type": "wifi", "label": "Guest WiFi",
     "description": "WPA2 join string"},
    {"type": "custom", "label": "Custom",
     "description": "Any URL"},
]


# ─── Models ──────────────────────────────────────────────────────────────

class QRItemBody(BaseModel):
    label: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)   # one of DEFAULT_TYPES or any string
    target_url: str = Field(..., min_length=4)
    outlet_id: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None        # branded foreground image
    sort_order: int = 0


class QRGenerateBody(BaseModel):
    target_url: str = Field(..., min_length=4)
    label: Optional[str] = None
    size: int = 320


class PrintBundleBody(BaseModel):
    qr_ids: List[str] = Field(..., min_length=1)
    cols_per_page: int = 2
    show_url: bool = True


class StoryPostBody(BaseModel):
    outlet_id: str
    image_url: str = Field(..., min_length=4)
    caption: Optional[str] = None
    posted_by: str = Field(..., min_length=1)
    tags: List[str] = Field(default_factory=list)


# ─── 1. QR types catalog ─────────────────────────────────────────────────

@router.get("/types")
def list_types():
    return {"ok": True, "types": DEFAULT_TYPES}


# ─── 2. QR items CRUD ────────────────────────────────────────────────────

@router.post("/items")
def create_qr_item(
    body: QRItemBody,
    x_tenant_id: Optional[str] = Header(None),
    x_actor_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    item_id = uuid.uuid4().hex[:16]
    item = {
        "id": item_id,
        "tenant_id": tenant_id,
        "label": body.label,
        "type": body.type,
        "outlet_id": body.outlet_id,
        "target_url": body.target_url,
        "description": body.description,
        "image_url": body.image_url,
        "sort_order": int(body.sort_order),
        "qr_image_url": _qr_image_url(body.target_url),
        "active": True,
        "created_at": _now_iso(),
        "created_by": x_actor_id or "anonymous",
    }
    db["qr_library_items"].insert_one(item.copy())
    _emit_audit(tenant_id, "create", item_id, {
        "label": body.label, "type": body.type,
        "actor": x_actor_id})
    return {"ok": True, "item": item}


@router.get("/items")
def list_qr_items(
    type: Optional[str] = None,
    outlet_id: Optional[str] = None,
    active_only: bool = True,
    limit: int = 500,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id}
    if type: q["type"] = type
    if outlet_id: q["outlet_id"] = outlet_id
    if active_only: q["active"] = True
    rows = list(db["qr_library_items"].find(q, {"_id": 0})
                .sort("sort_order", 1)
                .limit(max(1, min(2000, limit))))
    # Sort already done; secondary by created_at if we wanted
    return {"ok": True, "total": len(rows), "items": rows}


@router.get("/items/{item_id}")
def get_qr_item(
    item_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    item = db["qr_library_items"].find_one(
        {"id": item_id, "tenant_id": tenant_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "QR item not found")
    return {"ok": True, "item": item}


@router.delete("/items/{item_id}")
def delete_qr_item(
    item_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_actor_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    item = db["qr_library_items"].find_one(
        {"id": item_id, "tenant_id": tenant_id})
    if not item:
        raise HTTPException(404, "QR item not found")
    db["qr_library_items"].update_one(
        {"id": item_id, "tenant_id": tenant_id},
        {"$set": {"active": False,
                  "deleted_at": _now_iso(),
                  "deleted_by": x_actor_id or "anonymous"}})
    _emit_audit(tenant_id, "delete", item_id,
                {"actor": x_actor_id})
    return {"ok": True, "id": item_id, "deleted": True}


# ─── 3. Clipboard helper ─────────────────────────────────────────────────

@router.get("/items/{item_id}/clipboard")
def get_clipboard_payload(
    item_id: str,
    x_tenant_id: Optional[str] = Header(None),
):
    """Return the canonical URL for a QR item so the frontend can
    write it to the clipboard. Stays server-side so the URL +
    label can later be re-stamped by the frontend if needed."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    item = db["qr_library_items"].find_one(
        {"id": item_id, "tenant_id": tenant_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "QR item not found")
    return {"ok": True, "id": item_id,
            "label": item["label"],
            "target_url": item["target_url"]}


# ─── 4. QR generator (ad-hoc, not stored) ────────────────────────────────

@router.post("/generate")
def generate_qr(body: QRGenerateBody):
    return {
        "ok": True,
        "target_url": body.target_url,
        "label": body.label or "",
        "qr_image_url": _qr_image_url(body.target_url, size=body.size),
        "size": body.size,
    }


# ─── 5. Print bundle (multi-select print) ───────────────────────────────

@router.post("/print-bundle")
def print_bundle(
    body: PrintBundleBody,
    x_tenant_id: Optional[str] = Header(None),
    x_actor_id: Optional[str] = Header(None),
):
    """Build a print-ready bundle for one or more QR items. The
    response is a structured payload (label + qr_image_url +
    target_url) that the frontend renders into a printable HTML
    page with the requested cols-per-page layout. The HTML stays
    in the frontend so the rendering is consistent across browsers
    and the user can preview before printing."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    items: List[Dict[str, Any]] = []
    missing: List[str] = []
    for qid in body.qr_ids:
        it = db["qr_library_items"].find_one(
            {"id": qid, "tenant_id": tenant_id}, {"_id": 0})
        if it:
            items.append(it)
        else:
            missing.append(qid)
    if not items:
        raise HTTPException(404,
            f"none of the requested QR items were found "
            f"(missing: {missing})")
    _emit_audit(tenant_id, "print_bundle",
                "+".join(i["id"] for i in items), {
        "ids": [i["id"] for i in items],
        "cols_per_page": body.cols_per_page,
        "show_url": body.show_url,
        "actor": x_actor_id})
    return {
        "ok": True,
        "items": items,
        "missing": missing,
        "cols_per_page": max(1, min(4, int(body.cols_per_page))),
        "show_url": body.show_url,
        "generated_at": _now_iso(),
    }


# ─── 6. Outlet storyboard (Instagram-style carousel) ────────────────────

storyboard_router = APIRouter(prefix="/api/outlets",
                              tags=["outlet-storyboard"])


@storyboard_router.post("/{outlet_id}/storyboard")
def post_story(
    outlet_id: str,
    body: StoryPostBody,
    x_tenant_id: Optional[str] = Header(None),
):
    if body.outlet_id != outlet_id:
        raise HTTPException(400,
            "outlet_id mismatch between path and body")
    tenant_id = (x_tenant_id or "default").strip().lower()
    post = {
        "id": uuid.uuid4().hex[:16],
        "tenant_id": tenant_id,
        "outlet_id": outlet_id,
        "image_url": body.image_url,
        "caption": body.caption,
        "tags": body.tags,
        "posted_by": body.posted_by,
        "active": True,
        "posted_at": _now_iso(),
    }
    db["outlet_storyboards"].insert_one(post.copy())
    _emit_audit(tenant_id, "story_post", post["id"], {
        "outlet_id": outlet_id, "posted_by": body.posted_by})
    return {"ok": True, "post": post}


@storyboard_router.get("/{outlet_id}/storyboard")
def list_stories(
    outlet_id: str,
    limit: int = 30,
    x_tenant_id: Optional[str] = Header(None),
):
    """Concierge / mobile loads the carousel. Most-recent first.
    No login required — these are marketing posts intended for
    public consumption (the audience IS guests)."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    rows = list(db["outlet_storyboards"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "active": True}, {"_id": 0})
                .sort("posted_at", -1)
                .limit(max(1, min(100, limit))))
    return {"ok": True, "outlet_id": outlet_id,
            "total": len(rows), "posts": rows}


@storyboard_router.delete("/{outlet_id}/storyboard/{post_id}")
def delete_story(
    outlet_id: str, post_id: str,
    x_tenant_id: Optional[str] = Header(None),
    x_actor_id: Optional[str] = Header(None),
):
    tenant_id = (x_tenant_id or "default").strip().lower()
    p = db["outlet_storyboards"].find_one(
        {"id": post_id, "outlet_id": outlet_id, "tenant_id": tenant_id})
    if not p:
        raise HTTPException(404, "post not found")
    db["outlet_storyboards"].update_one(
        {"id": post_id, "tenant_id": tenant_id},
        {"$set": {"active": False,
                  "deleted_at": _now_iso(),
                  "deleted_by": x_actor_id or "anonymous"}})
    _emit_audit(tenant_id, "story_delete", post_id,
                {"outlet_id": outlet_id, "actor": x_actor_id})
    return {"ok": True, "id": post_id, "deleted": True}


# ─── 7. Mobile menu with allergens (guest surface) ──────────────────────

mobile_menu_router = APIRouter(prefix="/api/mobile-menu",
                               tags=["mobile-menu"])


@mobile_menu_router.get("/{outlet_id}")
def mobile_menu(
    outlet_id: str,
    category: Optional[str] = None,
    x_tenant_id: Optional[str] = Header(None),
):
    """Public-facing menu for the QR-scan path. Only the fields a
    guest needs are returned: name, description, price, category,
    allergens (CRITICAL for safety), tags (vegetarian / GF /
    spicy). Internal cost, station, recipe id are NOT exposed."""
    tenant_id = (x_tenant_id or "default").strip().lower()
    q: Dict[str, Any] = {"tenant_id": tenant_id, "outlet_id": outlet_id,
                          "available": True}
    if category:
        q["category"] = category
    rows = list(db["pos_menu_items"].find(q, {"_id": 0}).limit(2000))
    if not rows:
        rows = list(db["pos_menu_items"].find(
            {"outlet_id": outlet_id, "available": True},
            {"_id": 0}).limit(2000))

    # Allergen lookup: each menu_item may have allergens directly,
    # OR derive from linked recipe_id
    by_category: Dict[str, List[Dict[str, Any]]] = {}
    allergen_universe = set()
    for r in rows:
        allergens = list(r.get("allergens") or [])
        if not allergens and r.get("recipe_id"):
            recipe = db["recipes"].find_one(
                {"id": r["recipe_id"], "tenant_id": tenant_id},
                {"_id": 0}) or db["recipes"].find_one(
                {"id": r["recipe_id"]}, {"_id": 0})
            if recipe:
                allergens = list(recipe.get("allergens") or [])
        for a in allergens:
            allergen_universe.add(a)
        cat = (r.get("category") or "uncategorized").strip().lower()
        by_category.setdefault(cat, []).append({
            "id": r.get("id") or r.get("sku"),
            "sku": r.get("sku"),
            "name": r.get("name"),
            "description": r.get("description"),
            "price": r.get("price"),
            "category": cat,
            "allergens": allergens,
            "tags": r.get("tags") or [],
            "image_url": r.get("image_url"),
        })

    sorted_cats = {}
    for cat in sorted(by_category.keys()):
        sorted_cats[cat] = sorted(
            by_category[cat], key=lambda x: (x.get("name") or "").lower())

    # Storyboard tile so the menu surface can also show 1-3 recent
    # marketing posts at the top — same content as the concierge
    # carousel.
    stories = list(db["outlet_storyboards"].find(
        {"tenant_id": tenant_id, "outlet_id": outlet_id,
         "active": True}, {"_id": 0})
                   .sort("posted_at", -1).limit(3))

    return {
        "ok": True,
        "outlet_id": outlet_id,
        "categories": list(sorted_cats.keys()),
        "items_by_category": sorted_cats,
        "allergens_in_menu": sorted(allergen_universe),
        "storyboard_preview": stories,
        "total_items": len(rows),
        "generated_at": _now_iso(),
    }
