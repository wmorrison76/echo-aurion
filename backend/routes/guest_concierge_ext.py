"""
iter184 · In-Room Dining + Menus + Reservations + Weather + VIP + Pre-arrival + Group Events

Extends the Guest Concierge Mobile. All routes live under `/api/guest-concierge/*`
(so the existing guest_concierge_router picks them up via an `include_router` in
`guest_concierge.py`). Group Events live under `/api/group-events/*`.

Principles:
  - Guest endpoints authenticate via X-Guest-Token
  - Admin CRUD endpoints use X-Admin-Token
  - Company info ALWAYS surfaces before nearby
"""
from __future__ import annotations

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel


# ── shared auth helpers (re-use from guest_concierge) ──────────────────────
def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()

def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")

def _auth_guest(x_guest_token: Optional[str]) -> Dict[str, Any]:
    from routes.guest_concierge import _auth_guest as _real_auth
    return _real_auth(x_guest_token)


# ── Extensions router (mounted into guest_concierge prefix) ────────────────
router_ext = APIRouter(prefix="/api/guest-concierge", tags=["guest-concierge-ext"])


# ──────────────────────────────────────────────────────────────────────────
# 1. Menus + allergens + reservations
# ──────────────────────────────────────────────────────────────────────────
class MenuItem(BaseModel):
    name: str
    description: Optional[str] = ""
    price: Optional[float] = None
    category: str = "main"
    allergens: List[str] = []
    tags: List[str] = []  # vegan, gluten-free, chef-pick, spicy…
    available: bool = True


class MenuUpsert(BaseModel):
    venue_slug: str
    items: List[MenuItem]


@router_ext.post("/menu/upsert")
async def upsert_menu(body: MenuUpsert, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    doc = {"venue_slug": body.venue_slug, "items": [i.model_dump() for i in body.items],
           "updated_at": _iso()}
    _db.concierge_menus.update_one({"venue_slug": body.venue_slug}, {"$set": doc}, upsert=True)
    return {"ok": True, "venue_slug": body.venue_slug, "item_count": len(body.items)}


@router_ext.get("/menu/{venue_slug}")
async def get_menu(venue_slug: str, x_guest_token: Optional[str] = Header(None)):
    _auth_guest(x_guest_token)
    from database import db as _db
    m = _db.concierge_menus.find_one({"venue_slug": venue_slug}, {"_id": 0})
    if not m:
        return {"ok": True, "venue_slug": venue_slug, "items": [], "note": "No menu posted yet."}
    return {"ok": True, **m}


class ReserveBody(BaseModel):
    venue_slug: str
    date: str          # YYYY-MM-DD
    time: str          # HH:MM
    party_size: int = 2
    notes: Optional[str] = None


@router_ext.post("/reserve")
async def reserve(body: ReserveBody, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    g = ctx["guest"]
    from database import db as _db
    v = _db.concierge_venues.find_one({"slug": body.venue_slug}, {"_id": 0})
    if not v: raise HTTPException(404, "venue not found")
    rec = {
        "id": uuid.uuid4().hex[:12],
        "guest_id": g["id"], "guest_name": g.get("display_name") or g.get("name"),
        "room": g.get("room"),
        "venue_slug": body.venue_slug, "venue_name": v.get("name"),
        "date": body.date, "time": body.time, "party_size": body.party_size,
        "notes": (body.notes or "")[:280],
        "status": "requested", "source": "guest-concierge-mobile",
        "created_at": _iso(),
    }
    _db.concierge_reservations.insert_one(rec.copy())
    return {"ok": True, "reservation_id": rec["id"],
            "message": f"Reservation requested at {v.get('name')} for {body.party_size} on {body.date} {body.time}. We'll confirm shortly."}


# ──────────────────────────────────────────────────────────────────────────
# 2. In-Room Dining (menu + order + Domino's-style tracker)
# ──────────────────────────────────────────────────────────────────────────
IRD_STAGES = ["received", "preparing", "on-the-way", "delivered"]


class IRDItem(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category: str = "entree"
    available: bool = True
    tags: List[str] = []
    allergens: List[str] = []


class IRDMenuUpsert(BaseModel):
    items: List[IRDItem]


@router_ext.post("/in-room-dining/menu/upsert")
async def ird_menu_upsert(body: IRDMenuUpsert, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    _db.in_room_dining_menu.delete_many({})
    for it in body.items:
        d = it.model_dump()
        d["id"] = uuid.uuid4().hex[:10]
        _db.in_room_dining_menu.insert_one(d.copy())
    return {"ok": True, "count": len(body.items)}


@router_ext.get("/in-room-dining/menu")
async def ird_menu(x_guest_token: Optional[str] = Header(None)):
    _auth_guest(x_guest_token)
    from database import db as _db
    items = list(_db.in_room_dining_menu.find({"available": True}, {"_id": 0}).limit(400))
    return {"ok": True, "total": len(items), "items": items}


class IRDOrderLine(BaseModel):
    item_id: Optional[str] = None
    name: str
    qty: int = 1
    price: Optional[float] = None
    note: Optional[str] = None


class IRDOrder(BaseModel):
    lines: List[IRDOrderLine]
    desired_time: str = "now"   # "now" | ISO 8601 | "in 30 min" | "7:30pm"
    notes: Optional[str] = None


@router_ext.post("/in-room-dining/order")
async def ird_order(body: IRDOrder, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    g = ctx["guest"]
    if not body.lines:
        raise HTTPException(400, "at least one line required")
    from database import db as _db
    total = sum(((l.price or 0) * (l.qty or 1)) for l in body.lines)
    # Estimate ETA
    minutes_from_now = 35
    dt = (body.desired_time or "now").lower()
    if dt.startswith("in ") and "min" in dt:
        try:
            minutes_from_now = max(10, min(120, int("".join(c for c in dt if c.isdigit()) or "35")))
        except Exception: pass
    eta = _now() + timedelta(minutes=minutes_from_now)
    rec = {
        "id": uuid.uuid4().hex[:12],
        "guest_id": g["id"], "guest_name": g.get("display_name") or g.get("name"),
        "room": g.get("room"),
        "lines": [l.model_dump() for l in body.lines],
        "total": round(total, 2), "currency": "USD",
        "desired_time": body.desired_time,
        "notes": (body.notes or "")[:280],
        "stage": "received",
        "stage_history": [{"stage": "received", "at": _iso()}],
        "eta": eta.isoformat(),
        "created_at": _iso(),
    }
    _db.in_room_dining_orders.insert_one(rec.copy())
    # iter194 · FM-Upgrade 1 — order.placed TimelineEvent
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ORDER_PLACED
        _tl(ORDER_PLACED,
            actor={"type": "guest", "id": g["id"], "name": g.get("display_name") or g.get("name")},
            entity_refs=[
                {"kind": "order", "id": rec["id"], "name": f"IRD #{rec['id'][:6]}"},
                {"kind": "customer", "id": g["id"], "name": g.get("display_name") or g.get("name")},
            ],
            payload={
                "channel": "ird",
                "commodity": "in_room_dining",
                "total": rec["total"],
                "currency": rec["currency"],
                "line_count": len(rec["lines"]),
                "room": g.get("room"),
            },
            idempotency_key=f"order.placed:{rec['id']}")
    except Exception: pass
    return {"ok": True, "order_id": rec["id"], "total": rec["total"], "eta": rec["eta"],
            "message": f"Order received. Estimated delivery {eta.strftime('%I:%M %p')}."}


@router_ext.get("/in-room-dining/order/{order_id}")
async def ird_order_status(order_id: str, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    o = _db.in_room_dining_orders.find_one({"id": order_id, "guest_id": ctx["guest"]["id"]}, {"_id": 0})
    if not o: raise HTTPException(404, "order not found")
    return {"ok": True, "order": o, "stages": IRD_STAGES}


@router_ext.get("/in-room-dining/orders")
async def ird_my_orders(x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    items = list(_db.in_room_dining_orders.find({"guest_id": ctx["guest"]["id"]}, {"_id": 0}).sort("created_at", -1).limit(20))
    return {"ok": True, "total": len(items), "orders": items}


class IRDAdvance(BaseModel):
    stage: str  # one of IRD_STAGES


@router_ext.post("/admin/in-room-dining/order/{order_id}/advance")
async def ird_advance(order_id: str, body: IRDAdvance, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if body.stage not in IRD_STAGES:
        raise HTTPException(400, f"stage must be one of {IRD_STAGES}")
    from database import db as _db
    r = _db.in_room_dining_orders.update_one(
        {"id": order_id},
        {"$set": {"stage": body.stage, "updated_at": _iso()},
         "$push": {"stage_history": {"stage": body.stage, "at": _iso()}}},
    )
    if r.matched_count == 0: raise HTTPException(404, "order not found")
    # iter194 · FM-Upgrade 1 — status change CTE
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import ORDER_STATUS_CHANGED
        _tl(ORDER_STATUS_CHANGED,
            actor={"type": "user", "id": "admin", "name": "admin"},
            entity_refs=[{"kind": "order", "id": order_id}],
            payload={"channel": "ird", "stage": body.stage, "commodity": "in_room_dining"})
    except Exception: pass
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────
# 3. Weather Alternatives
# ──────────────────────────────────────────────────────────────────────────
@router_ext.get("/weather-alternatives")
async def weather_alts(x_guest_token: Optional[str] = Header(None)):
    """When a beach day is rained out, surface indoor options. Pulls from lifestyle_activations
    that are tagged indoor or from venues with category in [spa, fitness, retail, bar]."""
    _auth_guest(x_guest_token)
    from database import db as _db
    indoor_categories = {"spa", "fitness", "bar", "retail", "dining", "event-space"}
    venues = list(_db.concierge_venues.find(
        {"active": True, "category": {"$in": list(indoor_categories)}}, {"_id": 0}
    ).sort([("display_order", 1)]).limit(30))
    today = _now().strftime("%Y-%m-%d")
    activations: List[Dict[str, Any]] = []
    try:
        if "lifestyle_activations" in _db.list_collection_names():
            activations = list(_db.lifestyle_activations.find(
                {"date": today, "active": True, "$or": [{"indoor": True}, {"location": {"$regex": "lobby|indoor|spa|room|gallery", "$options": "i"}}]},
                {"_id": 0}
            ).limit(10))
    except Exception:
        activations = []
    return {"ok": True, "venues": venues, "activations_today": activations,
            "note": "Plan B for today — all indoor options curated for you."}


# ──────────────────────────────────────────────────────────────────────────
# 4. VIP WOW Add-ons (20 seeded)
# ──────────────────────────────────────────────────────────────────────────
@router_ext.get("/vip-addons")
async def vip_addons(x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    # Filter by tier if guest is standard (hide ultra-luxe)
    tier = (ctx["guest"].get("vip_tier") or "standard").lower()
    q: Dict[str, Any] = {"active": True}
    if tier == "standard":
        q["min_tier"] = {"$in": ["standard", "silver"]}
    items = list(_db.concierge_vip_addons.find(q, {"_id": 0}).sort([("display_order", 1)]).limit(40))
    return {"ok": True, "total": len(items), "addons": items, "guest_tier": tier}


# Curated picks for the celebration nudge on the home screen
_CELEBRATION_CURATION: Dict[str, List[str]] = {
    "anniversary":   ["fireplace-turndown", "in-suite-chef-welcome", "private-yacht-sunset"],
    "honeymoon":     ["couples-spa-day", "fireplace-turndown", "stargazer-rooftop"],
    "birthday":      ["anniversary-cake", "in-suite-mixologist", "sommelier-cellar"],
    "proposal":      ["stargazer-rooftop", "private-yacht-sunset", "fireplace-turndown"],
    "babymoon":      ["couples-spa-day", "beach-picnic", "weekly-wildflower"],
    "graduation":    ["in-suite-mixologist", "anniversary-cake", "beach-picnic"],
    "retirement":    ["sommelier-cellar", "private-yacht-sunset", "couples-spa-day"],
    "family":        ["family-cookie-lab", "kid-glamp-tent", "beach-picnic"],
}


@router_ext.get("/vip-addons/suggest")
async def vip_addons_suggest(x_guest_token: Optional[str] = Header(None)):
    """Return 3 hand-picked VIP add-ons curated to the guest's celebration tag."""
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    g = ctx["guest"]
    celebration = (g.get("celebration") or (g.get("preferences") or {}).get("celebration") or "").lower().strip()
    tier = (g.get("vip_tier") or "standard").lower()
    slugs = _CELEBRATION_CURATION.get(celebration, [])
    q: Dict[str, Any] = {"active": True}
    if tier == "standard":
        q["min_tier"] = {"$in": ["standard", "silver"]}
    picks: List[Dict[str, Any]] = []
    if slugs:
        q2 = dict(q); q2["slug"] = {"$in": slugs}
        found = {a["slug"]: a for a in _db.concierge_vip_addons.find(q2, {"_id": 0})}
        for s in slugs:
            if s in found: picks.append(found[s])
    if len(picks) < 3:
        # Back-fill with top-ordered addons the guest hasn't been offered yet
        seen = {p.get("slug") for p in picks}
        more = list(_db.concierge_vip_addons.find(
            {**q, "slug": {"$nin": list(seen)}}, {"_id": 0}
        ).sort([("display_order", 1)]).limit(3 - len(picks)))
        picks.extend(more)
    return {"ok": True, "celebration": celebration, "picks": picks[:3], "guest_tier": tier}


class AddonRequest(BaseModel):
    addon_slug: str
    notes: Optional[str] = None
    when: Optional[str] = None


@router_ext.post("/vip-addons/request")
async def request_addon(body: AddonRequest, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    addon = _db.concierge_vip_addons.find_one({"slug": body.addon_slug}, {"_id": 0})
    if not addon: raise HTTPException(404, "add-on not found")
    rec = {
        "id": uuid.uuid4().hex[:12],
        "kind": "vip-addon",
        "guest_id": ctx["guest"]["id"],
        "guest_name": ctx["guest"].get("display_name") or ctx["guest"].get("name"),
        "room": ctx["guest"].get("room"),
        "status": "pending",
        "source": "guest-concierge-mobile",
        "payload": {"addon_slug": body.addon_slug, "addon_name": addon.get("name"),
                    "notes": body.notes, "when": body.when},
        "created_at": _iso(),
    }
    _db.concierge_service_requests.insert_one(rec.copy())
    return {"ok": True, "request_id": rec["id"],
            "message": f"Requested: {addon.get('name')}. Our Guest Experience team will reach out to confirm."}


# ──────────────────────────────────────────────────────────────────────────
# 5. Pre-arrival wishlist
# ──────────────────────────────────────────────────────────────────────────
class PreArrivalWish(BaseModel):
    arrival_flight: Optional[str] = None
    dietary: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    preferences: Optional[List[str]] = None   # "quiet room", "early coffee", "extra pillows"
    celebrations: Optional[str] = None        # "anniversary" | "birthday" | ...
    itinerary: Optional[List[Dict[str, Any]]] = None  # [{date, slot, activity}]


@router_ext.post("/pre-arrival/wishlist")
async def pre_arrival_wishlist(body: PreArrivalWish, x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    doc = body.model_dump()
    doc["guest_id"] = ctx["guest"]["id"]
    doc["updated_at"] = _iso()
    _db.concierge_pre_arrival.update_one(
        {"guest_id": ctx["guest"]["id"]}, {"$set": doc}, upsert=True,
    )
    # Echo onto the guest profile as well so the arrival team sees it
    updates: Dict[str, Any] = {}
    prefs = ctx["guest"].get("preferences") or {}
    if body.celebrations: prefs["celebration"] = body.celebrations
    if body.dietary: prefs["dietary"] = body.dietary
    if body.allergies: prefs["allergies"] = body.allergies
    if body.preferences: prefs["notes"] = prefs.get("notes") or []
    if isinstance(prefs.get("notes"), list) and body.preferences:
        for n in body.preferences:
            if n not in prefs["notes"]: prefs["notes"].append(n)
    updates["preferences"] = prefs
    updates["arrival_flight"] = body.arrival_flight or ctx["guest"].get("arrival_flight")
    updates["updated_at"] = _iso()
    _db.concierge_guests.update_one({"id": ctx["guest"]["id"]}, {"$set": updates})
    return {"ok": True, "wishlist": doc}


@router_ext.get("/pre-arrival/wishlist")
async def get_wishlist(x_guest_token: Optional[str] = Header(None)):
    ctx = _auth_guest(x_guest_token)
    from database import db as _db
    w = _db.concierge_pre_arrival.find_one({"guest_id": ctx["guest"]["id"]}, {"_id": 0})
    return {"ok": True, "wishlist": w, "is_pre_arrival": _is_pre_arrival(ctx["guest"])}


def _is_pre_arrival(g: Dict[str, Any]) -> bool:
    ci = g.get("check_in")
    if not ci: return False
    try:
        d = datetime.strptime(ci, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return _now() < d
    except Exception: return False


# ──────────────────────────────────────────────────────────────────────────
# 6. Seed VIP add-ons (20)
# ──────────────────────────────────────────────────────────────────────────
def seed_vip_addons():
    from database import db as _db
    if _db.concierge_vip_addons.count_documents({}) > 0: return 0
    items = [
        ("in-suite-chef-welcome", "In-Suite Chef Welcome Dinner", "Private 5-course dinner prepared in your suite by our Executive Chef.", 450, "dining", "gold", 10),
        ("sunrise-private-yoga", "Private Sunrise Yoga", "Dedicated instructor, rooftop deck, espresso + pastry after.", 180, "wellness", "silver", 20),
        ("couples-spa-day", "Couples Spa Day", "2-hour couples treatment + private hammam + champagne.", 650, "wellness", "silver", 30),
        ("stargazer-rooftop", "Stargazer Rooftop Setup", "Telescopes + hot cocoa + astronomer-guided tour of tonight's sky.", 280, "experience", "standard", 40),
        ("sommelier-cellar", "Private Sommelier Cellar Tour", "Taste 5 rare vintages with our head sommelier.", 220, "dining", "silver", 50),
        ("beach-picnic", "Bespoke Beach Picnic", "Private cabana, 3-course picnic, beach butler, chilled rosé.", 320, "experience", "standard", 60),
        ("fireplace-turndown", "Fireplace Turndown", "Roaring fire, warm cognac, velvet robes, rose petal trail.", 85, "romance", "standard", 70),
        ("hot-air-balloon", "Sunrise Hot Air Balloon", "Private balloon ride over the coast with brunch on landing.", 1200, "adventure", "platinum", 80),
        ("family-cookie-lab", "Family Cookie Lab", "Kids bake with our pastry chef · take home a box.", 120, "family", "standard", 90),
        ("private-yacht-sunset", "Private Yacht Sunset", "2-hour coastal cruise with captain + crew + champagne.", 1800, "experience", "gold", 100),
        ("wardrobe-stylist", "Arrival Wardrobe Press & Steam", "We press your travel-weary wardrobe before you unpack.", 0, "service", "standard", 110),
        ("personal-fitness", "Personal Trainer Session", "1-hour tailored workout at the Summit Studio.", 140, "wellness", "standard", 120),
        ("private-wine-dinner", "Winemaker's Table", "5-course pairing dinner hosted by a guest winemaker (monthly).", 480, "dining", "gold", 130),
        ("golf-club-access", "Affiliate Golf Club Access", "Full-day pass to our partner Ocean Dunes Golf Club.", 380, "experience", "gold", 140),
        ("helicopter-arrival", "Helicopter Arrival", "Airport to resort helipad. Black-car transfer at origin.", 2400, "travel", "platinum", 150),
        ("kid-glamp-tent", "Kid's Glamp Tent", "Themed indoor tent setup in your suite with books + treats.", 90, "family", "standard", 160),
        ("anniversary-cake", "Anniversary Celebration Cake", "Photoreal custom cake from our Pastry Chef.", 220, "dining", "standard", 170),
        ("sea-kayak-dawn", "Dawn Sea-Kayak", "Private kayak launch at sunrise with guide + breakfast sandwich.", 160, "adventure", "standard", 180),
        ("in-suite-mixologist", "In-Suite Mixologist", "90-minute private cocktail class with our head bartender.", 240, "experience", "standard", 190),
        ("weekly-wildflower", "Wildflower Suite Refresh", "Daily wildflower bouquet refresh from our on-property gardener.", 75, "romance", "standard", 200),
    ]
    for slug, name, desc, price, category, min_tier, display_order in items:
        d = {
            "id": uuid.uuid4().hex[:12], "slug": slug, "name": name,
            "description": desc, "price": price, "category": category,
            "min_tier": min_tier, "display_order": display_order,
            "active": True, "created_at": _iso(), "updated_at": _iso(),
        }
        _db.concierge_vip_addons.insert_one(d.copy())
    return len(items)


def seed_ird_menu():
    from database import db as _db
    if _db.in_room_dining_menu.count_documents({}) > 0: return 0
    items = [
        ("Truffle Burger", "Wagyu beef, black truffle, aged gruyère, brioche.", 38, "entree", ["dairy","gluten"], ["chef-pick"]),
        ("Lobster Roll", "Chilled Maine lobster, brown butter, buttered brioche, chips.", 46, "entree", ["shellfish","dairy","gluten"], []),
        ("Green Garden Bowl", "Quinoa, kale, roasted vegetables, tahini, avocado.", 22, "entree", ["sesame"], ["vegan","gluten-free"]),
        ("Margherita Pizza", "San Marzano tomato, fior di latte, basil.", 24, "entree", ["dairy","gluten"], ["vegetarian"]),
        ("Caesar Salad", "Gem lettuce, anchovy, parmigiano, 6-minute egg.", 18, "starter", ["fish","dairy","egg","gluten"], []),
        ("Tuna Tartare", "Bluefin, avocado, ponzu, taro chips.", 28, "starter", ["fish","soy"], ["gluten-free"]),
        ("Dry-Aged Ribeye", "14oz 40-day dry-aged, peppercorn jus, pommes purée.", 72, "entree", ["dairy"], ["gluten-free","chef-pick"]),
        ("Miso Cod", "Black cod, sake-miso glaze, bok choy.", 54, "entree", ["fish","soy"], []),
        ("Chocolate Soufflé", "Bittersweet, crème anglaise. 20-minute bake.", 16, "dessert", ["dairy","egg","gluten"], ["chef-pick"]),
        ("Lemon Tart", "Meyer lemon, torched meringue, almond sable.", 14, "dessert", ["dairy","egg","gluten","tree-nut"], []),
        ("Cold-Pressed Juice", "Green · beet · turmeric ginger.", 9, "drink", [], ["vegan"]),
        ("Espresso", "Double shot, Mondarelli.", 6, "drink", [], ["vegan","gluten-free"]),
        ("Cabernet by the glass", "Napa · Stag's Leap District.", 22, "drink", ["sulfites"], []),
        ("Kids' Pasta", "Fusilli butter + parmigiano.", 14, "kids", ["dairy","gluten"], ["kid-friendly"]),
        ("Kids' Grilled Cheese", "Sourdough, cheddar, tomato soup.", 12, "kids", ["dairy","gluten"], ["kid-friendly"]),
    ]
    for name, desc, price, cat, allergens, tags in items:
        d = {"id": uuid.uuid4().hex[:10], "name": name, "description": desc, "price": price,
             "category": cat, "available": True, "allergens": allergens, "tags": tags,
             "created_at": _iso()}
        _db.in_room_dining_menu.insert_one(d.copy())
    return len(items)


def seed_iter184_all():
    return (seed_vip_addons() or 0) + (seed_ird_menu() or 0)


# ──────────────────────────────────────────────────────────────────────────
# 7. Pre-arrival invite (magic-link email-ready)
# ──────────────────────────────────────────────────────────────────────────
class PreArrivalInvite(BaseModel):
    guest_id: str


@router_ext.post("/pre-arrival/invite")
async def pre_arrival_invite(body: PreArrivalInvite, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    g = _db.concierge_guests.find_one({"id": body.guest_id}, {"_id": 0})
    if not g: raise HTTPException(404, "guest not found")
    tok = secrets.token_urlsafe(24)
    _db.concierge_guest_sessions.insert_one({
        "token": tok, "guest_id": g["id"],
        "expires_at": _now() + timedelta(days=30),  # longer TTL for pre-arrival
        "created_at": _now(), "source": "pre-arrival-invite",
    })
    base = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    url = f"{base}/guest?token_preview=true&auto_last={g.get('display_name','').split()[-1] if g.get('display_name') else ''}&auto_room={g.get('room','')}"
    return {"ok": True, "token": tok,
            "pre_arrival_url": f"/guest/prearrival?token={tok}",
            "convenience_url": url,
            "guest": {"id": g["id"], "name": g.get("display_name"), "check_in": g.get("check_in")}}
