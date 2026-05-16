"""
Echo AURION · Spa Menu Builder + Public Booking Surface (iter263.4)

Mirrors ird_menu_builder for the Spa side — Spa Director / Spa Manager profiles
can drag-drop a PDF/Word menu, AI parses it into a categorised service catalogue
with durations + pricing, edit live, publish, generate QR for guest discovery.

Endpoints:
  GET  /api/spa-builder/menu
  PUT  /api/spa-builder/menu
  POST /api/spa-builder/import   — AI parse pasted spa menu text
  POST /api/spa-builder/publish
  GET  /api/spa-builder/qr
  POST /api/spa-builder/booking-request
  GET  /api/spa-builder/bookings
  GET  /api/spa-public/menu      — guest-facing
  POST /api/spa-public/booking-request
"""
from __future__ import annotations
import os, json, base64
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from database import db

load_dotenv()

try:
    import event_bus
except Exception:
    event_bus = None

def _emit(t: str, p: dict, src: str = "spa-builder") -> None:
    try:
        if event_bus is not None:
            event_bus.publish(t, p, source=src)
    except Exception:
        pass

router = APIRouter(prefix="/api/spa-builder", tags=["spa-builder"])
public_router = APIRouter(prefix="/api/spa-public", tags=["spa-public"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


# ════════════════════ MODELS ════════════════════

class Duration(BaseModel):
    minutes: int
    price: Optional[float] = None


class SpaService(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    benefits: Optional[str] = ""
    durations: List[Duration] = []
    flat_price_label: Optional[str] = None        # for haircut "175-220"
    available: bool = True


class SpaCategory(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    services: List[SpaService] = []


class SpaMenu(BaseModel):
    slug: str = "main"
    title: str = "Spa & Wellness"
    subtitle: str = "Holistic healing, harmony, balance"
    categories: List[SpaCategory] = []
    policies: List[Dict[str, str]] = []
    is_live: bool = False
    test_mode: bool = True
    updated_at: Optional[str] = None


# ════════════════════ SEED — derived from Zenova Spa Menu ════════════════════

_SEED_SPA = {
    "slug": "main",
    "title": "Zenova Spa & Wellness",
    "subtitle": "Sanctuary for holistic healing — harmony, balance, vitality",
    "categories": [
        {"id":"thermal","name":"Thermal Experiences","description":"Four distinct wellness zones with breathtaking views.","services":[
            {"id":"vit-pool","name":"Vitality Pool","description":"Hydrotherapy circuit","durations":[]},
            {"id":"sauna","name":"Ceremonial Sauna","description":"Aromatherapy ritual","durations":[]},
            {"id":"snow","name":"Snow Room","description":"Cold therapy invigoration","durations":[]},
            {"id":"shower","name":"Sensory Shower","description":"Mood-led light + scent","durations":[]},
        ]},
        {"id":"signature","name":"Signature Journeys","description":"Immersive water-inspired wellness.","services":[
            {"id":"florida","name":"Authentic Florida","description":"Florida orange sugar polish, honey-coconut hydration, full-body massage","benefits":"Pairs with Via Aquae","durations":[{"minutes":100,"price":425}]},
            {"id":"med","name":"Mediterranean Escape","description":"Palermo polish with French pink clay; aromatherapy of grapefruit, fennel, juniper","benefits":"Pairs with full Via Aquae circuit","durations":[{"minutes":100,"price":425}]},
            {"id":"zen","name":"Zen Zone","description":"CBD-infused journey, Dead Sea salt scrub, Helimoor mud, full massage","benefits":"528 Hz custom soundtrack","durations":[{"minutes":100,"price":425}]},
            {"id":"sea","name":"Gift From The Sea","description":"Hand-harvested Irish seaweed wrap + lavender scrub + scalp massage","benefits":"528 Hz custom soundtrack","durations":[{"minutes":100,"price":425}]},
        ]},
        {"id":"mindbody","name":"Mind Body Connection","description":"New-age treatments for revitalised wellbeing.","services":[
            {"id":"rewind","name":"Time Rewind","description":"75-minute massage + 25-minute reset on Radiance PT table with Celluma LED + Mind Sync","durations":[{"minutes":100,"price":400}]},
            {"id":"naptime","name":"Naptime","description":"Mind Sync Neo-Nap Sleep Program; ideal for jet-lag","durations":[{"minutes":30,"price":80}]},
            {"id":"touchless","name":"Touchless Tranquility","description":"LED light + Mind Sync vibro-acoustic delta/theta wave reset","durations":[{"minutes":60,"price":175}]},
        ]},
        {"id":"duo","name":"Duo Suite Experiences","description":"Private spa suite for two.","services":[
            {"id":"duo-soul","name":"Duo: Soul-to-Soul","description":"Aromatic inhalation, full-body massage, rose quartz mask, scalp + foot massage","benefits":"Concludes with 20-min wellness delicacies + champagne","durations":[{"minutes":120,"price":550}]},
            {"id":"duo-mf","name":"Duo: Massage & Facial","description":"Full massage + Elemis Classic Expert Touch facial","benefits":"+20-min wellness delicacies","durations":[{"minutes":120,"price":550}]},
            {"id":"duo-sig","name":"Duo: Signature Journey","description":"Choose any Signature Journey — performed as duo","benefits":"+20-min wellness delicacies","durations":[{"minutes":120,"price":550}]},
            {"id":"body-bar","name":"Body Bar Add-On","description":"Self-guided body bar with salt polish, sugar scrub, clays, oils","durations":[{"minutes":30,"price":75}]},
        ]},
        {"id":"massage","name":"Massage & Bodywork","services":[
            {"id":"custom","name":"Zhenova Custom Massage","description":"Personalised pressure & focus areas; warm stones, essential oils","durations":[{"minutes":60,"price":240},{"minutes":75,"price":300},{"minutes":100,"price":400}]},
            {"id":"deepsea","name":"Deep Sea Therapeutic","description":"Arnica + magnesium oils; sports stretching","durations":[{"minutes":60,"price":240},{"minutes":75,"price":300},{"minutes":100,"price":400}]},
            {"id":"saltstone","name":"Salt Of The Sea Stone Massage","description":"Warm salt stones glide for circulation + tension release","durations":[{"minutes":60,"price":230},{"minutes":75,"price":289}]},
            {"id":"lymph","name":"Lymphatic Massage with Dry Brushing","description":"Detox + circulation","durations":[{"minutes":60,"price":240},{"minutes":75,"price":300}]},
            {"id":"lomi","name":"Lomi Lomi Massage","description":"Hawaiian rhythmic strokes, monoi oil","durations":[{"minutes":60,"price":240},{"minutes":75,"price":300},{"minutes":100,"price":400}]},
            {"id":"toneglow","name":"Tone & Glow","description":"Cupping + skin-toning techniques + mica glow finish","durations":[{"minutes":60,"price":250},{"minutes":75,"price":310}]},
            {"id":"prepost","name":"New Life Pre/Post Natal*","description":"Specialty bed for face-down comfort. *Past first trimester","durations":[{"minutes":60,"price":240},{"minutes":75,"price":300}]},
            {"id":"duo-mass","name":"Duo Massage","description":"Side-by-side massage in suite","durations":[{"minutes":60,"price":250},{"minutes":75,"price":310},{"minutes":100,"price":415}]},
            {"id":"reflex","name":"Reflexology","description":"Pressure-point hands + feet","durations":[{"minutes":60,"price":240}]},
            {"id":"sixtysix","name":"The Sixty-Six","description":"Express facial + massage","durations":[{"minutes":66,"price":266}]},
        ]},
        {"id":"body","name":"Body Rituals","services":[
            {"id":"tropical","name":"Tropical Body","description":"Florida orange sugar polish, honey-coconut hydration","durations":[{"minutes":60,"price":240}]},
            {"id":"oyster","name":"Oyster & Pearl Body Wrap","description":"Sea salt polish, marine clay mask","durations":[{"minutes":60,"price":240}]},
            {"id":"purerest","name":"Pure Rest Body Ritual","description":"CBD wellness elixir, Dead Sea salt scrub, full massage","durations":[{"minutes":60,"price":240}]},
            {"id":"marine","name":"Marine Detox Body Ritual","description":"Irish seaweed wrap + lavender-rosemary butter","durations":[{"minutes":60,"price":250}]},
        ]},
        {"id":"skincare","name":"Skincare","description":"Restorative facials","services":[
            {"id":"facemodel","name":"Facemodeling with Biologique Recherche","description":"Lift, sculpt, contour","durations":[{"minutes":60,"price":300},{"minutes":75,"price":375}]},
            {"id":"br-bespoke","name":"Biologique Recherche Bespoke","description":"Oxylight Ionix multimodal","durations":[{"minutes":60,"price":270},{"minutes":75,"price":339}]},
            {"id":"classic","name":"Classic Expert Touch","description":"Deep cleanse + extractions + hydration","durations":[{"minutes":60,"price":230}]},
            {"id":"radical","name":"Radical Botany","description":"Wildsmith botanicals + acupressure","durations":[{"minutes":60,"price":230},{"minutes":75,"price":289}]},
            {"id":"glass","name":"Glass Skin with Oxylight Ionix","description":"Microcurrent + RF + LED","durations":[{"minutes":60,"price":450},{"minutes":75,"price":560},{"minutes":100,"price":750}]},
            {"id":"cryo","name":"Cryo Sculpt & Firm 6","description":"All 6 Elemis BIOTEC modalities","durations":[{"minutes":75,"price":450}]},
            {"id":"biotech","name":"Biotech Hypercustomized 2.0","description":"Two BIOTEC modalities tailored","durations":[{"minutes":60,"price":350}]},
        ]},
        {"id":"salon","name":"Salon · Nails · Beauty Bar","description":"Hair, nails, lashes, brows.","services":[
            {"id":"hc-w","name":"Women's Haircut","flat_price_label":"$175 - $220","durations":[]},
            {"id":"hc-m","name":"Men's Haircut","flat_price_label":"$125 - $150","durations":[]},
            {"id":"blow","name":"Blow Dry & Style","flat_price_label":"$90 - $150","durations":[]},
            {"id":"color","name":"Single Process Color","flat_price_label":"$100 - $150","durations":[]},
            {"id":"highlights","name":"Highlights · Lowlights · Balayage","flat_price_label":"$250 - $350","durations":[]},
            {"id":"lash-c","name":"Eyelash Extensions Classic Set","flat_price_label":"$190","durations":[]},
            {"id":"lash-v","name":"Eyelash Extensions Volume Set","flat_price_label":"$285","durations":[]},
            {"id":"brow-tint","name":"Eyebrow Tinting","flat_price_label":"$70","durations":[]},
            {"id":"lash-lift","name":"Eyelash Lift & Tint","flat_price_label":"$195","durations":[]},
            {"id":"sig-mani","name":"Zenova Signature Manicure","flat_price_label":"$60","durations":[]},
            {"id":"sig-pedi","name":"Zenova Signature Pedicure","flat_price_label":"$90","durations":[]},
            {"id":"cbd-mani","name":"Therapeutic CBD Manicure","flat_price_label":"$60","durations":[]},
            {"id":"cbd-pedi","name":"Therapeutic CBD Pedicure","flat_price_label":"$90","durations":[]},
            {"id":"gel-mani","name":"Gel Manicure","flat_price_label":"$65","durations":[]},
            {"id":"gel-pedi","name":"Gel Pedicure","flat_price_label":"$85","durations":[]},
        ]},
        {"id":"packages","name":"Packages","description":"Curated experiences & spa-and-stay.","services":[
            {"id":"savoir","name":"Savoir-faire with Perrier-Jouët","description":"Oyster & Pearl Body Wrap (60), Salt of the Sea Stone Massage (75), Glass Skin Oxylight Ionix (60), Perrier-Jouët Belle Époque Brut + caviar","flat_price_label":"$1,490 per person","durations":[]},
            {"id":"custom-pkg","name":"Custom Spa Package","description":"Inquire with concierge to build your perfect day","durations":[]},
            {"id":"stay","name":"Spa & Stay","description":"Resort accommodations + daily spa credit","durations":[]},
        ]},
    ],
    "policies": [
        {"name":"Spa Hours","details":"Mon–Wed 10am–7pm · Thu–Sun 10am–8pm. Hours subject to change."},
        {"name":"Booking","details":"Confirmed via credit card or room number. Call 754.318.6950."},
        {"name":"Age Restrictions","details":"Under 18 require parent/guardian present for massage. 12-17 allowed for facials/hair/nails accompanied. Past 1st trimester required for any massage."},
        {"name":"Cancellation","details":"24 hour notice or 100% charge."},
        {"name":"Gratuity","details":"20% service charge added automatically."},
        {"name":"Arrivals","details":"Arrive 1 hour early. Late arrivals may have shortened service."},
        {"name":"Cashless","details":"Cashless property — major credit cards only."},
    ],
    "is_live": False,
    "test_mode": True,
}


def _get_menu(slug: str = "main") -> dict:
    doc = db["spa_menus"].find_one({"slug": slug}, {"_id": 0})
    if doc:
        return doc
    db["spa_menus"].insert_one(_SEED_SPA.copy())
    return _SEED_SPA


# ════════════════════ ENDPOINTS ════════════════════

@router.get("/menu")
def get_menu(slug: str = "main"):
    return _get_menu(slug)


@router.put("/menu")
def save_menu(menu: SpaMenu):
    doc = menu.dict()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    db["spa_menus"].update_one({"slug": menu.slug}, {"$set": doc}, upsert=True)
    _emit("spa.menu_updated", {"slug": menu.slug, "category_count": len(menu.categories)})
    return {"ok": True, "slug": menu.slug}


class PublishReq(BaseModel):
    slug: str = "main"
    test_mode: bool = False


@router.post("/publish")
def publish(req: PublishReq):
    db["spa_menus"].update_one(
        {"slug": req.slug},
        {"$set": {"is_live": True, "test_mode": req.test_mode,
                  "published_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    _emit("spa.menu_published", {"slug": req.slug, "test_mode": req.test_mode})
    return {"ok": True, "slug": req.slug, "is_live": True, "guest_url": f"/spa/{req.slug}"}


class ImportReq(BaseModel):
    text_content: str
    slug: str = "main"


@router.post("/import")
async def import_from_text(req: ImportReq):
    if not EMERGENT_LLM_KEY:
        return {"ok": False, "reason": "LLM key unavailable"}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"spa-import-{int(datetime.now(timezone.utc).timestamp())}",
            system_message=(
                "Convert raw spa menu text into STRICT JSON: "
                "{slug, title, subtitle, categories:[{id,name,description,services:["
                "{id,name,description,benefits,durations:[{minutes,price}],flat_price_label}]}], policies:[{name,details}]} "
                "Return JSON only."
            ),
        ).with_model("openai", "gpt-4o")
        text = await chat.send_message(UserMessage(text=req.text_content[:18000]))
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
        db["spa_menus"].update_one({"slug": req.slug}, {"$set": parsed}, upsert=True)
        _emit("spa.menu_imported", {"slug": req.slug, "categories": len(parsed.get("categories", []))})
        return {"ok": True, "menu": parsed}
    except Exception as e:
        return {"ok": False, "reason": f"{type(e).__name__}: {str(e)[:200]}"}


@router.get("/qr")
def qr(slug: str = "main"):
    base = os.environ.get("PUBLIC_BASE_URL") or "https://cfo-toolkit-deploy.preview.emergentagent.com"
    url = f"{base}/spa/{slug}"
    from routes._io_helpers import qr_png
    data_url, b64 = qr_png(url)
    svg = (
        f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='220' height='220'>"
        f"<rect width='100' height='100' fill='white'/>"
        f"<text x='50' y='50' text-anchor='middle' font-size='6' fill='#222'>{slug}</text>"
        f"</svg>"
    )
    return {"url": url, "svg": svg, "data_url": data_url, "png_base64": b64}


# ════════════════════ BOOKINGS ════════════════════

class BookingReq(BaseModel):
    booking_id: Optional[str] = None
    guest_name: str
    room_no: Optional[str] = None
    contact: Optional[str] = None
    service_id: str
    service_name: str
    duration_minutes: int
    price: Optional[float] = None
    requested_for: str          # "2026-05-02T14:00"
    notes: Optional[str] = None


@router.post("/booking-request")
def create_booking(req: BookingReq):
    return _create_booking(req)


def _create_booking(req: BookingReq):
    bid = req.booking_id or f"spa-{int(datetime.now(timezone.utc).timestamp())}"
    doc = {**req.dict(), "booking_id": bid, "status": "pending",
           "created_at": datetime.now(timezone.utc).isoformat()}
    db["spa_bookings"].insert_one(doc.copy())
    _emit("spa.booking_request", {"booking_id": bid, "service": req.service_name,
                                   "duration": req.duration_minutes, "price": req.price})
    return doc


@router.get("/bookings")
def list_bookings(limit: int = 50):
    docs = list(db["spa_bookings"].find({}, {"_id": 0}).sort("created_at", -1).limit(max(1, min(200, limit))))
    return {"bookings": docs, "count": len(docs)}


# ════════════════════ PUBLIC ════════════════════

@public_router.get("/menu")
def public_menu(slug: str = "main"):
    doc = db["spa_menus"].find_one({"slug": slug, "is_live": True}, {"_id": 0})
    if not doc:
        return {"_preview": True, **_get_menu(slug)}
    return doc


@public_router.post("/booking-request")
def public_booking(req: BookingReq):
    return _create_booking(req)
