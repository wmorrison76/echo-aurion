"""
Echo AURION · IRD Menu Builder + Public Guest Ordering (iter263.4)

Capabilities:
  - IRD Manager drag-drops PDF/Word doc → AI auto-generates structured menu
  - Live editor for sections, items, prices, dietary flags, availability windows
  - Public guest endpoint accessed via QR code: /api/ird-public/menu/{slug}
  - Place test orders (test mode flag) before going live
  - Auto-route orders to printers (mocked endpoint, ready for real printer service)

Endpoints:
  POST /api/ird-builder/import          — upload doc, AI parses into menu JSON
  GET  /api/ird-builder/menu            — current draft menu
  PUT  /api/ird-builder/menu            — save edits
  POST /api/ird-builder/publish         — flip draft → live (testable first)
  GET  /api/ird-builder/qr              — QR code SVG/PNG to ordering URL
  POST /api/ird-builder/orders          — create order (test or live)
  GET  /api/ird-builder/orders          — list orders
  POST /api/ird-builder/orders/{id}/route-print — route to printer
  GET  /api/ird-public/menu             — guest-facing menu (no auth)
  POST /api/ird-public/order            — guest places order
"""
from __future__ import annotations
import os
import json
import base64
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from dotenv import load_dotenv
from database import db

load_dotenv()

try:
    import event_bus
except Exception:
    event_bus = None

def _emit(t: str, p: dict, src: str = "ird-builder") -> None:
    try:
        if event_bus is not None:
            event_bus.publish(t, p, source=src)
    except Exception:
        pass

router = APIRouter(prefix="/api/ird-builder", tags=["ird-builder"])
public_router = APIRouter(prefix="/api/ird-public", tags=["ird-public"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


# ════════════════════ MODELS ════════════════════

class MenuItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    price: Optional[float] = None
    price_glass: Optional[float] = None
    price_bottle: Optional[float] = None
    dietary_flags: List[str] = []
    available: bool = True
    photo_url: Optional[str] = None
    # iter264.1 · per-item availability windows (HH:MM, 24-hour). Empty = inherit section.
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    # iter264.1 · inventory count — when count drops to 0 item auto-hides
    count_remaining: Optional[int] = None
    lead_time_hours: Optional[float] = None  # for amenities (e.g. cake = 72h)


class MenuSection(BaseModel):
    id: str
    header: str
    availability: Optional[str] = None     # human-readable "6:00 AM - 11:00 AM"
    available_now: bool = True
    # iter264.1 · structured windows for runtime gating on the public endpoint
    available_from: Optional[str] = None   # "06:00"
    available_until: Optional[str] = None  # "11:00"
    items: List[MenuItem] = []


class IrdMenu(BaseModel):
    slug: str = "main"
    title: str = "In-Room Dining"
    subtitle: str = "24-hour service"
    sections: List[MenuSection] = []
    service_notes: List[str] = []
    is_live: bool = False
    test_mode: bool = True
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


# ════════════════════ SEED FROM REAL IRD MENU ════════════════════

# Compact seed structure derived from the user's uploaded IRD Menu - Copy.docx
_SEED_MENU = {
    "slug": "main",
    "title": "In-Room Dining",
    "subtitle": "24-hour service · Ext. 63100",
    "sections": [
        {"id": "breakfast", "header": "Breakfast", "availability": "6:00 AM - 11:00 AM", "available_from": "06:00", "available_until": "11:00", "items": [
            {"id":"b1","name":"Fruits & Berries Plate","description":"Selection of seasonal sliced fruits and berries","price":16,"dietary_flags":["VE"]},
            {"id":"b2","name":"Tropical Chia Pudding","description":"Coconut milk, spiced pineapple, shaved coconut, dried cherries","price":18,"dietary_flags":["VE"]},
            {"id":"b3","name":"Cage Free Eggs","description":"Two eggs any style, applewood smoked bacon or sausage, house potatoes","price":22,"dietary_flags":[]},
            {"id":"b4","name":"Three Egg Omelet","description":"Choice of three ingredients; additional ingredients +2 each","price":22,"dietary_flags":["D"]},
            {"id":"b5","name":"Avocado Toast","description":"Avocado mash, sliced avocado, lemon zest, pickled red onion","price":26,"dietary_flags":["VE","G"]},
            {"id":"b6","name":"Brioche & Egg","description":"Scrambled eggs, Comté cheese, bacon marmalade","price":28,"dietary_flags":["D","G"]},
            {"id":"b7","name":"Greek Yogurt Parfait","description":"Berries, almond & coconut granola, honey","price":16,"dietary_flags":["D","N"]},
            {"id":"b8","name":"Crab Benedict","description":"Crab cake, poached eggs, hollandaise, side house potatoes","price":37,"dietary_flags":["D","G","S"]},
            {"id":"b9","name":"Smoked Salmon Bagel Board","description":"Arugula, capers, pickled red onions, tomatoes, lemon, cream cheese","price":28,"dietary_flags":["D","G"]},
            {"id":"b10","name":"Steak & Eggs","description":"5 oz New York Strip, béarnaise, choose your egg style","price":31,"dietary_flags":["D"]},
            {"id":"b11","name":"French Toast","description":"Caramelized bananas, maple rum butter, toasted pecans","price":22,"dietary_flags":["D","G","N","V"]},
            {"id":"b12","name":"Pancakes","description":"Maple syrup, powdered sugar — blueberry, chocolate chip, or banana (GF available)","price":16,"dietary_flags":["G","D","V"]},
        ]},
        {"id":"all_day","header":"All Day","availability":"11:00 AM - 11:00 PM","available_from":"11:00","available_until":"23:00","items":[
            {"id":"a1","name":"Buffalo Chicken Lollipops","description":"Carrot and celery sticks, blue cheese dip","price":26,"dietary_flags":["D","G"]},
            {"id":"a2","name":"Roasted Carrot Hummus","description":"Shaved salad, sunflower seeds, mint, vadouvan, grilled naan","price":20,"dietary_flags":["G","V"]},
            {"id":"a3","name":"Caesar Salad","description":"Romaine hearts, arugula, confit tomatoes, focaccia croûtons, anchovies","price":22,"dietary_flags":["D","G"]},
            {"id":"a4","name":"Burrata Bowl","description":"Quinoa, baby heirloom tomatoes, balsamic pearls, grilled pita","price":24,"dietary_flags":["D","G","V"]},
            {"id":"a5","name":"Power 66 Bowl","description":"Ancient grain, roasted beets, edamame, avocado, roasted sweet potatoes","price":25,"dietary_flags":["VE"]},
            {"id":"a6","name":"Classic Club","description":"Sourdough, roasted turkey, pork bacon, iceberg, tomatoes, muenster, mustard aïoli","price":28,"dietary_flags":["D","G"]},
            {"id":"a7","name":"Black Angus Burger","description":"Brioche bun, choice of cheese, fries or salad","price":28,"dietary_flags":["G","D"]},
            {"id":"a8","name":"Margherita Pizza","description":"Marinara, mozzarella","price":23,"dietary_flags":["D","G","V"]},
            {"id":"a9","name":"Pepperoni Pizza","description":"Marinara, pepperoni, mozzarella","price":28,"dietary_flags":["D","G"]},
            {"id":"a10","name":"Half Roasted Chicken","description":"Mashed potatoes, grilled asparagus, jus","price":49,"dietary_flags":["D"]},
            {"id":"a11","name":"Pan Seared Snapper","description":"Roasted tomatoes, preserved lemon Israeli cous-cous, broccolini","price":54,"dietary_flags":["D"]},
            {"id":"a12","name":"Cauliflower Steak","description":"Ancient grain, carrot hummus, broccolini, cucumber raita","price":45,"dietary_flags":["VE"]},
            {"id":"a13","name":"Filet Mignon","description":"Roasted fingerling potatoes, grilled asparagus, jus","price":68,"dietary_flags":["D"]},
            {"id":"a14","name":"Florida Key Lime Pie","description":"Graham cracker crust, grapefruit","price":16,"dietary_flags":["D","G"]},
            {"id":"a15","name":"Exotic Pavlova","description":"Crisp meringue, tropical fruits, passion fruit coulis","price":16,"dietary_flags":["VE"]},
        ]},
        {"id":"kids","header":"Pier Kids","items":[
            {"id":"k1","name":"Mini Waffle","description":"Powdered sugar, maple syrup","price":16,"dietary_flags":["D","G","V"]},
            {"id":"k2","name":"Chicken Tenders","description":"Honey mustard, choice of vegetables or fries","price":16,"dietary_flags":["G"]},
            {"id":"k3","name":"Cheeseburger","description":"American or cheddar, side of vegetables or fries","price":16,"dietary_flags":["D","G"]},
            {"id":"k4","name":"Mac & Cheese","description":"Cheddar cheese sauce","price":16,"dietary_flags":["D","G"]},
        ]},
        {"id":"overnight","header":"Overnight","availability":"11:00 PM - 6:00 AM","available_from":"23:00","available_until":"06:00","items":[
            {"id":"o1","name":"Early Bird Parfait","description":"Yogurt, granola, berries","price":14,"dietary_flags":["D","G","N"]},
            {"id":"o2","name":"Three Egg Omelet","description":"Three ingredients, house potatoes","price":28,"dietary_flags":["D"]},
            {"id":"o3","name":"Chicken Soup","description":"Onions, carrot, celery","price":16,"dietary_flags":[]},
            {"id":"o4","name":"London Broil","description":"Sourdough, taleggio, grilled onions, horseradish cream","price":18,"dietary_flags":["D","G"]},
            {"id":"o5","name":"Margherita Pizza","description":"Marinara, mozzarella","price":23,"dietary_flags":["D","G","V"]},
            {"id":"o6","name":"Vanilla Crème Brûlée","description":"Berries","price":16,"dietary_flags":["D"]},
        ]},
        {"id":"beverage","header":"Beverages","items":[
            {"id":"bv1","name":"Pot of Tea","description":"English Breakfast, Chamomile, Earl Grey, Green","price":8,"dietary_flags":[]},
            {"id":"bv2","name":"Espresso","price":7,"dietary_flags":[]},
            {"id":"bv3","name":"Espresso Beverages","description":"Latte, cappuccino, macchiato, mochaccino","price":8,"dietary_flags":["D"]},
            {"id":"bv4","name":"Juices","description":"Orange, grapefruit, tomato, apple, cranberry, pineapple","price":8,"dietary_flags":["VE"]},
            {"id":"bv5","name":"Soft Drinks","description":"Coke, Diet Coke, Coke Zero, Sprite","price":10,"dietary_flags":[]},
            {"id":"bv6","name":"Evian Still or Sparkling","price":8,"dietary_flags":[]},
            {"id":"bv7","name":"Cosmopolitan (200ml bottle service)","price":35,"dietary_flags":[]},
            {"id":"bv8","name":"Espresso Martini (200ml bottle service)","price":35,"dietary_flags":[]},
            {"id":"bv9","name":"Old Fashioned (200ml bottle service)","price":35,"dietary_flags":[]},
            {"id":"bv10","name":"Champagne, Nicolas Feuillatte 'Brut' NV","price_glass":25,"price_bottle":105,"dietary_flags":[]},
            {"id":"bv11","name":"Champagne, Dom Pérignon '15","price_bottle":550,"dietary_flags":[]},
            {"id":"bv12","name":"Pinot Grigio, Terlato Vineyards '23","price_glass":18,"price_bottle":72,"dietary_flags":[]},
        ]},
    ],
    "service_notes": [
        "IN-ROOM DINING 24 hours — Ext. 63100",
        "*Consuming raw or undercooked meats, poultry, seafood, shellfish or eggs may increase your risk of foodborne illness.",
        "20% service charge added to all orders.",
    ],
    "is_live": False,
    "test_mode": True,
}


_SEED_AMENITY_MENU = {
    "slug": "amenities",
    "title": "Amenities",
    "subtitle": "Add a thoughtful touch to your stay",
    "sections": [
        {"id":"flowers","header":"Flowers & Botanicals","items":[
            {"id":"am1","name":"Seasonal Bouquet","description":"Florist's choice of fresh seasonal blooms","price":85,"dietary_flags":[]},
            {"id":"am2","name":"Orchid Arrangement","description":"Long-lasting white phalaenopsis","price":120,"dietary_flags":[]},
            {"id":"am3","name":"Rose Petal Turn-Down","description":"Rose petals across the bed and bath","price":65,"dietary_flags":[]},
        ]},
        {"id":"celebration","header":"Celebrations","items":[
            {"id":"am4","name":"Birthday Cake (6\")","description":"Choose vanilla, chocolate, or red velvet — personalized","price":95,"dietary_flags":["D","G"]},
            {"id":"am5","name":"Champagne & Strawberries","description":"Half bottle of Nicolas Feuillatte Brut + chocolate-dipped strawberries","price":150,"dietary_flags":["D"]},
            {"id":"am6","name":"Anniversary Setup","description":"Candles, rose petals, champagne, hand-written note","price":225,"dietary_flags":[]},
        ]},
        {"id":"family","header":"Family & Kids","items":[
            {"id":"am7","name":"Kids' Welcome Kit","description":"Plush toy, coloring book, crayons, milk & cookies","price":45,"dietary_flags":["D"]},
            {"id":"am8","name":"Bedtime Milk & Cookies","description":"Warm milk, chocolate chip cookies","price":18,"dietary_flags":["D","G"]},
        ]},
        {"id":"wellness","header":"Wellness","items":[
            {"id":"am9","name":"Lavender Pillow Mist","description":"Calming lavender room spray (50ml take-home)","price":35,"dietary_flags":[]},
            {"id":"am10","name":"Yoga Mat & Block Set","description":"In-room yoga mat with foam blocks (rental)","price":25,"dietary_flags":[]},
            {"id":"am11","name":"Wellness Tea Service","description":"Sleep, detox, and glow tea trio","price":42,"dietary_flags":["VE"]},
        ]},
    ],
    "service_notes": [
        "Amenities require 2 hours advance notice for setup.",
        "20% service charge applies.",
    ],
    "is_live": False,
    "test_mode": True,
}


def _get_menu(slug: str = "main") -> dict:
    doc = db["ird_menus"].find_one({"slug": slug}, {"_id": 0})
    if doc:
        return doc
    seed = _SEED_MENU if slug == "main" else _SEED_AMENITY_MENU
    db["ird_menus"].insert_one(seed.copy())
    return seed


# ════════════════════ MENU BUILDER ENDPOINTS ════════════════════

@router.get("/menu")
def get_menu(slug: str = "main"):
    return _get_menu(slug)


@router.put("/menu")
def save_menu(menu: IrdMenu):
    doc = menu.dict()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    db["ird_menus"].update_one({"slug": menu.slug}, {"$set": doc}, upsert=True)
    _emit("ird.menu_updated", {"slug": menu.slug, "section_count": len(menu.sections), "test_mode": menu.test_mode})
    return {"ok": True, "slug": menu.slug}


class PublishReq(BaseModel):
    slug: str = "main"
    test_mode: bool = False


@router.post("/publish")
def publish_menu(req: PublishReq):
    db["ird_menus"].update_one(
        {"slug": req.slug},
        {"$set": {"is_live": True, "test_mode": req.test_mode,
                  "published_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    _emit("ird.menu_published", {"slug": req.slug, "test_mode": req.test_mode})
    return {"ok": True, "slug": req.slug, "is_live": True, "test_mode": req.test_mode,
            "guest_url": f"/ird/{req.slug}"}


class ImportReq(BaseModel):
    text_content: str
    slug: str = "main"


@router.post("/import")
async def import_menu_from_text(req: ImportReq):
    """AI parses pasted text from doc/PDF into structured menu JSON.
    Manager pastes the full menu text; LLM returns sections with items, prices,
    dietary flags. Saves as draft (test_mode=True, is_live=False)."""
    if not EMERGENT_LLM_KEY:
        return {"ok": False, "reason": "LLM key unavailable", "menu": None}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ird-import-{int(datetime.now(timezone.utc).timestamp())}",
            system_message=(
                "You are a menu structurer. Convert raw IRD menu text into STRICT JSON: "
                "{slug, title, subtitle, sections:[{id, header, availability, items:["
                "{id, name, description, price, dietary_flags:[]}]}], service_notes:[]}. "
                "Use lower-case slug ids, infer dietary flags from {VE, V, G, D, N, S}. "
                "Return JSON only, no fences."
            ),
        ).with_model("openai", "gpt-4o")
        text = await chat.send_message(UserMessage(text=req.text_content[:18000]))
        # strip fences
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text
            if text.endswith("```"): text = text[:-3]
        s, e = text.find("{"), text.rfind("}")
        parsed = json.loads(text[s : e + 1]) if s >= 0 else {}
        parsed["slug"] = req.slug
        parsed["is_live"] = False
        parsed["test_mode"] = True
        parsed["updated_at"] = datetime.now(timezone.utc).isoformat()
        db["ird_menus"].update_one({"slug": req.slug}, {"$set": parsed}, upsert=True)
        _emit("ird.menu_imported", {"slug": req.slug, "sections": len(parsed.get("sections", []))})
        return {"ok": True, "menu": parsed}
    except Exception as e:
        return {"ok": False, "reason": f"{type(e).__name__}: {str(e)[:200]}", "menu": None}


@router.get("/qr")
def qr_url(slug: str = "main"):
    """Real PNG QR (iter263.5) pointing at the public guest ordering page."""
    base = os.environ.get("PUBLIC_BASE_URL") or "https://cfo-toolkit-deploy.preview.emergentagent.com"
    url = f"{base}/ird/{slug}"
    from routes._io_helpers import qr_png
    data_url, b64 = qr_png(url)
    # keep an SVG fallback for clients that explicitly want it
    svg = (
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='220' height='220'>"
        f"<rect width='100' height='100' fill='white'/>"
        f"<text x='50' y='50' text-anchor='middle' font-size='6' fill='#222'>{slug}</text>"
        f"</svg>"
    )
    return {"url": url, "svg": svg, "data_url": data_url, "png_base64": b64}


# ════════════════════ ORDERS ════════════════════

class OrderItem(BaseModel):
    item_id: str
    name: str
    qty: int = 1
    unit_price: float
    notes: Optional[str] = None


class IrdOrder(BaseModel):
    order_id: Optional[str] = None
    room_no: str
    guest_name: Optional[str] = None
    items: List[OrderItem]
    section: Optional[str] = "main"
    test_mode: bool = False
    notes: Optional[str] = None


@router.post("/orders")
def create_order(o: IrdOrder):
    return _create_order(o)


def _create_order(o: IrdOrder):
    oid = o.order_id or f"ord-{int(datetime.now(timezone.utc).timestamp())}"
    total = round(sum(it.qty * it.unit_price for it in o.items), 2)
    doc = {
        "order_id": oid, "room_no": o.room_no, "guest_name": o.guest_name,
        "items": [it.dict() for it in o.items],
        "section": o.section, "test_mode": o.test_mode, "notes": o.notes,
        "total": total, "service_charge": round(total * 0.20, 2),
        "grand_total": round(total * 1.20, 2),
        "status": "received",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db["ird_orders_v2"].insert_one(doc.copy())
    _emit("ird.order_created", {"order_id": oid, "room": o.room_no, "items": len(o.items),
                                 "total": doc["grand_total"], "test_mode": o.test_mode})
    return doc


@router.get("/orders")
def list_orders(test_mode: Optional[bool] = None, limit: int = 50):
    q: Dict[str, Any] = {}
    if test_mode is not None:
        q["test_mode"] = test_mode
    docs = list(db["ird_orders_v2"].find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(200, limit))))
    return {"orders": docs, "count": len(docs)}


@router.post("/orders/{order_id}/route-print")
def route_to_printer(order_id: str, station: str = "main-kitchen"):
    """Send the order to a REAL printer (iter263.5). Uses raw socket / ESC-POS
    via _io_helpers.print_ticket. Falls back to stored-ticket mode in dev when
    PRINTER_<station>_HOST isn't set."""
    o = db["ird_orders_v2"].find_one({"order_id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, f"Order {order_id} not found")
    ticket = "\n".join([
        "================================",
        f"  IRD ORDER · {o['order_id']}",
        f"  Station: {station}",
        f"  Room: {o['room_no']}",
        "================================",
        *[f"  {it['qty']}x {it['name']}" for it in o["items"]],
        "--------------------------------",
        f"  Total: ${o['grand_total']:.2f}{' (TEST)' if o.get('test_mode') else ''}",
        "================================",
    ])
    from routes._io_helpers import print_ticket
    delivery = print_ticket(ticket, station)
    db["ird_orders_v2"].update_one(
        {"order_id": order_id},
        {"$set": {"printed_at": datetime.now(timezone.utc).isoformat(),
                  "printed_to": station, "status": "printed",
                  "print_delivery": delivery}},
    )
    _emit("ird.order_printed", {"order_id": order_id, "station": station,
                                 "delivered": delivery.get("delivered"),
                                 "mode": delivery.get("mode")})
    return {"ok": True, "ticket": ticket, "station": station, "delivery": delivery}


# ════════════════════ PUBLIC GUEST ENDPOINTS (no auth) ════════════════════

def _now_hhmm() -> str:
    """Local kitchen time (HH:MM 24h)."""
    from datetime import datetime
    return datetime.now().strftime("%H:%M")


def _within(now: str, start: Optional[str], end: Optional[str]) -> bool:
    """Inclusive HH:MM window check; supports overnight wrap (e.g. 23:00→06:00)."""
    if not start or not end:
        return True
    if start <= end:
        return start <= now <= end
    return now >= start or now <= end  # overnight


def _filter_by_windows(menu: dict) -> dict:
    """iter264.1 · Hide sections/items outside their availability window
    AND auto-hide items with count_remaining == 0."""
    now = _now_hhmm()
    out_sections = []
    for s in menu.get("sections", []) or []:
        s_start, s_end = s.get("available_from"), s.get("available_until")
        if not _within(now, s_start, s_end):
            continue  # whole section out-of-window → hide
        kept_items = []
        for it in s.get("items", []) or []:
            if it.get("count_remaining") is not None and (it.get("count_remaining") or 0) <= 0:
                continue  # sold out
            i_start, i_end = it.get("available_from") or s_start, it.get("available_until") or s_end
            if not _within(now, i_start, i_end):
                continue
            kept_items.append(it)
        if kept_items or not s.get("items"):
            out_sections.append({**s, "items": kept_items})
    return {**menu, "sections": out_sections}


@public_router.get("/menu")
def public_menu(slug: str = "main", preview: bool = False):
    """When `preview=True` we skip the live filter so chef/manager can see
    everything (used by the in-app PreviewTab)."""
    doc = db["ird_menus"].find_one({"slug": slug, "is_live": True}, {"_id": 0})
    if not doc:
        # If not live, return the seeded preview so QR still works in test mode
        doc = {"_preview": True, **_get_menu(slug)}
    if preview:
        return doc
    return _filter_by_windows(doc)


@public_router.post("/order")
def public_place_order(o: IrdOrder):
    """Guest-facing endpoint. Auto-flagged as test_mode if menu not live."""
    menu = db["ird_menus"].find_one({"slug": o.section or "main"}, {"_id": 0, "is_live": 1, "test_mode": 1})
    o.test_mode = bool((menu or {}).get("test_mode", True)) or not bool((menu or {}).get("is_live", False))
    return _create_order(o)
