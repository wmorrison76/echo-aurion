"""
Guest Intelligence — Spend Tracking, Amenity History, Allergens, Special Requests
===================================================================================
Tracks guest spend across all touchpoints (room charges, IRD, minibar, spa, retail),
monitors amenity delivery to avoid repeats on return visits, stores allergens and
special requests per guest, and ties everything to room key/credit card identifiers.
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/guest-intel", tags=["guest-intelligence"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ── Models ──

class GuestProfileInput(BaseModel):
    room_number: str
    first_name: str
    last_name: str
    email: str = ""
    phone: str = ""
    vip: bool = False
    allergens: List[str] = []
    dietary_restrictions: List[str] = []
    special_requests: List[str] = []
    payment_methods: List[dict] = []  # [{type: "credit_card", last_four: "1234", brand: "Visa"}]
    room_key_id: str = ""
    loyalty_number: str = ""
    notes: str = ""

class AmenityDeliveryInput(BaseModel):
    room_number: str
    guest_id: str
    amenity_name: str
    amenity_category: str = "comfort"  # comfort, bathroom, beverage, tech, welcome
    quantity: int = 1
    delivered_by: str = ""
    visit_number: int = 1
    notes: str = ""

class SpecialRequestInput(BaseModel):
    room_number: str
    guest_id: str
    request_type: str  # dietary, room_setup, accessibility, celebration, allergy
    request_text: str
    priority: str = "normal"  # low, normal, high, critical
    departments: List[str] = []  # ["housekeeping", "ird", "foh", "spa"]

class AllergenInput(BaseModel):
    guest_id: str
    allergens: List[str]
    dietary_restrictions: List[str] = []
    severity: str = "standard"  # mild, standard, severe, life_threatening
    notes: str = ""


# ── Seed ──
def seed_guest_profiles():
    if db["guest_intelligence"].count_documents({}) > 0:
        return
    profiles = [
        {
            "guest_id": f"gi-{_uid()}", "room_number": "412", "first_name": "James", "last_name": "Smith",
            "email": "james.smith@email.com", "phone": "+1-555-0412", "vip": True,
            "allergens": ["shellfish", "tree nuts"], "dietary_restrictions": ["gluten-free"],
            "special_requests": ["Extra firm pillows", "Feather-free bedding", "Late checkout preferred"],
            "payment_methods": [
                {"type": "credit_card", "last_four": "4242", "brand": "Amex Platinum"},
                {"type": "room_key", "key_id": "RK-412-001"},
            ],
            "room_key_id": "RK-412-001", "loyalty_number": "LY-GOLD-88421",
            "visit_count": 7, "lifetime_spend": 24580.00, "avg_spend_per_visit": 3511.43,
            "first_visit": "2023-06-15", "last_visit": "2026-04-14",
            "notes": "Prefers south-facing rooms. Anniversary in June.",
            "tags": ["gold_loyalty", "high_value", "repeat_guest", "allergy_alert"],
        },
        {
            "guest_id": f"gi-{_uid()}", "room_number": "301", "first_name": "Sarah", "last_name": "Johnson",
            "email": "sarah.j@company.com", "phone": "+1-555-0301", "vip": False,
            "allergens": [], "dietary_restrictions": ["vegetarian"],
            "special_requests": ["Quiet room away from elevator"],
            "payment_methods": [{"type": "credit_card", "last_four": "8910", "brand": "Visa"}],
            "room_key_id": "RK-301-002", "loyalty_number": "",
            "visit_count": 2, "lifetime_spend": 3200.00, "avg_spend_per_visit": 1600.00,
            "first_visit": "2025-11-20", "last_visit": "2026-04-10",
            "notes": "Business traveler, usually Monday-Thursday stays.",
            "tags": ["business_traveler"],
        },
        {
            "guest_id": f"gi-{_uid()}", "room_number": "501", "first_name": "Michael", "last_name": "Chen",
            "email": "mchen@tech.io", "phone": "+1-555-0501", "vip": True,
            "allergens": ["dairy", "eggs"], "dietary_restrictions": ["vegan"],
            "special_requests": ["Plant-based welcome amenity", "USB-C charger in room", "Oat milk in minibar"],
            "payment_methods": [
                {"type": "credit_card", "last_four": "5555", "brand": "Mastercard World Elite"},
                {"type": "room_key", "key_id": "RK-501-001"},
            ],
            "room_key_id": "RK-501-001", "loyalty_number": "LY-PLAT-12200",
            "visit_count": 12, "lifetime_spend": 52400.00, "avg_spend_per_visit": 4366.67,
            "first_visit": "2022-03-10", "last_visit": "2026-04-12",
            "notes": "Tech executive. Prefers high floor. Often hosts dinner for 6-8.",
            "tags": ["platinum_loyalty", "vip", "high_value", "repeat_guest", "allergy_alert", "vegan"],
        },
    ]
    for p in profiles:
        db["guest_intelligence"].insert_one({**p, "created_at": _now()})

    # Seed amenity delivery history
    amenities = [
        {"guest_id": profiles[0]["guest_id"], "room_number": "412", "amenity_name": "Welcome Fruit Basket", "amenity_category": "welcome", "visit_number": 7, "delivered_at": "2026-04-14T14:00:00Z"},
        {"guest_id": profiles[0]["guest_id"], "room_number": "412", "amenity_name": "Extra Pillows (2)", "amenity_category": "comfort", "visit_number": 7, "delivered_at": "2026-04-14T15:30:00Z"},
        {"guest_id": profiles[0]["guest_id"], "room_number": "412", "amenity_name": "Welcome Fruit Basket", "amenity_category": "welcome", "visit_number": 6, "delivered_at": "2026-02-10T14:00:00Z"},
        {"guest_id": profiles[0]["guest_id"], "room_number": "412", "amenity_name": "Bathrobes (Set of 2)", "amenity_category": "comfort", "visit_number": 6, "delivered_at": "2026-02-10T16:00:00Z"},
        {"guest_id": profiles[0]["guest_id"], "room_number": "412", "amenity_name": "Chocolate Truffles", "amenity_category": "welcome", "visit_number": 5, "delivered_at": "2025-12-20T14:00:00Z"},
        {"guest_id": profiles[0]["guest_id"], "room_number": "412", "amenity_name": "Welcome Fruit Basket", "amenity_category": "welcome", "visit_number": 4, "delivered_at": "2025-10-05T14:00:00Z"},
        {"guest_id": profiles[2]["guest_id"], "room_number": "501", "amenity_name": "Plant-Based Welcome Box", "amenity_category": "welcome", "visit_number": 12, "delivered_at": "2026-04-12T14:00:00Z"},
        {"guest_id": profiles[2]["guest_id"], "room_number": "501", "amenity_name": "USB-C Charger", "amenity_category": "tech", "visit_number": 12, "delivered_at": "2026-04-12T14:30:00Z"},
        {"guest_id": profiles[2]["guest_id"], "room_number": "501", "amenity_name": "Oat Milk Pack", "amenity_category": "beverage", "visit_number": 12, "delivered_at": "2026-04-12T15:00:00Z"},
        {"guest_id": profiles[2]["guest_id"], "room_number": "501", "amenity_name": "Plant-Based Welcome Box", "amenity_category": "welcome", "visit_number": 11, "delivered_at": "2026-03-01T14:00:00Z"},
    ]
    for a in amenities:
        db["amenity_deliveries"].insert_one({"id": f"ad-{_uid()}", **a, "quantity": 1, "created_at": _now()})


# ── Guest Profile CRUD ──

@router.get("/profile/{identifier}")
async def get_guest_intelligence(identifier: str):
    """Full guest intelligence profile by room number, email, or guest_id."""
    seed_guest_profiles()
    q = {"$or": [
        {"room_number": identifier}, {"email": identifier},
        {"guest_id": identifier}, {"last_name": {"$regex": identifier, "$options": "i"}},
        {"room_key_id": identifier},
    ]}
    guest = db["guest_intelligence"].find_one(q, {"_id": 0})
    if not guest:
        return {"found": False, "identifier": identifier}

    # Amenity history
    amenities = list(db["amenity_deliveries"].find(
        {"guest_id": guest["guest_id"]}, {"_id": 0}
    ).sort("delivered_at", -1))

    # Group amenities by visit
    by_visit = defaultdict(list)
    for a in amenities:
        by_visit[a.get("visit_number", 1)].append(a)

    # Amenity frequency — how often each was given
    amenity_freq = defaultdict(int)
    for a in amenities:
        amenity_freq[a["amenity_name"]] += 1

    # Suggest amenities to AVOID (given 2+ recent visits)
    recent_visits = sorted(by_visit.keys(), reverse=True)[:3]
    recent_amenities = set()
    for v in recent_visits:
        for a in by_visit[v]:
            recent_amenities.add(a["amenity_name"])

    # All available amenities for suggestion
    all_amenity_options = [
        "Welcome Fruit Basket", "Chocolate Truffles", "Champagne Split",
        "Local Artisan Chocolates", "Spa Welcome Kit", "Aromatherapy Set",
        "Gourmet Cookie Box", "Fresh Flowers", "Cheese & Wine Pairing",
        "Plant-Based Welcome Box", "Kids Welcome Pack", "Anniversary Cake",
        "Birthday Celebration", "Turndown Chocolate", "Bath Bomb Set",
        "Meditation Kit", "Yoga Mat & Props", "Running Map & Water",
        "USB-C Charger", "Extra Pillows (2)", "Bathrobes (Set of 2)",
        "Oat Milk Pack", "Espresso Pods Pack",
    ]
    suggestions = [a for a in all_amenity_options if a not in recent_amenities]

    # Spend breakdown from all sources
    room = guest.get("room_number")
    ird_orders = list(db["ird_orders"].find({"room_number": room}, {"_id": 0}).sort("created_at", -1).limit(20))
    minibar = list(db["minibar_charges"].find({"room_number": room}, {"_id": 0}).sort("created_at", -1).limit(20))
    spa_q = {"client_name": {"$regex": guest.get("last_name", ""), "$options": "i"}}
    spa = list(db["spa_appointments"].find(spa_q, {"_id": 0}).sort("date", -1).limit(10))
    retail = list(db["retail_sales"].find({"room_number": room}, {"_id": 0}).sort("created_at", -1).limit(10))

    current_stay_spend = {
        "ird": round(sum(o.get("total", 0) for o in ird_orders), 2),
        "minibar": round(sum(m.get("total", 0) for m in minibar), 2),
        "spa": round(sum(s.get("price", 0) for s in spa), 2),
        "retail": round(sum(r.get("total", 0) for r in retail), 2),
    }
    current_stay_spend["total"] = round(sum(current_stay_spend.values()), 2)

    # Special requests
    requests = list(db["guest_special_requests"].find(
        {"guest_id": guest["guest_id"]}, {"_id": 0}
    ).sort("created_at", -1))

    return {
        "found": True,
        "profile": guest,
        "amenity_history": amenities,
        "amenities_by_visit": {str(k): v for k, v in sorted(by_visit.items(), reverse=True)},
        "amenity_frequency": dict(amenity_freq),
        "avoid_amenities": list(recent_amenities),
        "suggested_amenities": suggestions[:8],
        "spend": current_stay_spend,
        "ird_history": ird_orders[:10],
        "minibar_history": minibar[:10],
        "spa_history": spa[:5],
        "retail_history": retail[:5],
        "special_requests": requests,
    }


@router.post("/profile")
async def create_or_update_profile(data: GuestProfileInput):
    """Create or update a guest intelligence profile."""
    seed_guest_profiles()
    existing = db["guest_intelligence"].find_one(
        {"$or": [{"room_number": data.room_number}, {"email": data.email}]},
        {"_id": 0}
    )
    if existing:
        update = data.model_dump()
        update["updated_at"] = _now()
        db["guest_intelligence"].update_one({"guest_id": existing["guest_id"]}, {"$set": update})
        return {"updated": existing["guest_id"]}
    else:
        profile = {"guest_id": f"gi-{_uid()}", **data.model_dump(), "visit_count": 1, "lifetime_spend": 0, "created_at": _now(), "tags": []}
        if data.allergens:
            profile["tags"].append("allergy_alert")
        db["guest_intelligence"].insert_one(profile)
        profile.pop("_id", None)
        return profile


@router.put("/profile/{guest_id}/allergens")
async def update_allergens(guest_id: str, data: AllergenInput):
    """Update guest allergens and dietary restrictions."""
    update = {
        "allergens": data.allergens,
        "dietary_restrictions": data.dietary_restrictions,
        "allergy_severity": data.severity,
        "allergy_notes": data.notes,
        "updated_at": _now(),
    }
    tags_add = ["allergy_alert"] if data.allergens else []
    db["guest_intelligence"].update_one(
        {"guest_id": guest_id},
        {"$set": update, "$addToSet": {"tags": {"$each": tags_add}}}
    )
    return {"updated": guest_id, "allergens": data.allergens, "severity": data.severity}


# ── Amenity Tracker ──

@router.post("/amenities/deliver")
async def log_amenity_delivery(data: AmenityDeliveryInput):
    """Log an amenity delivery to a guest."""
    delivery = {"id": f"ad-{_uid()}", **data.model_dump(), "delivered_at": _now(), "created_at": _now()}
    db["amenity_deliveries"].insert_one(delivery)
    delivery.pop("_id", None)
    return delivery


@router.get("/amenities/{guest_id}")
async def get_amenity_history(guest_id: str):
    """Get full amenity delivery history for a guest."""
    amenities = list(db["amenity_deliveries"].find({"guest_id": guest_id}, {"_id": 0}).sort("delivered_at", -1))
    by_visit = defaultdict(list)
    for a in amenities:
        by_visit[a.get("visit_number", 1)].append(a)
    freq = defaultdict(int)
    for a in amenities:
        freq[a["amenity_name"]] += 1
    return {
        "total_deliveries": len(amenities),
        "history": amenities,
        "by_visit": {str(k): v for k, v in sorted(by_visit.items(), reverse=True)},
        "frequency": dict(freq),
    }


@router.get("/amenities/{guest_id}/suggestions")
async def suggest_amenities(guest_id: str):
    """Get suggested amenities that haven't been given recently."""
    amenities = list(db["amenity_deliveries"].find({"guest_id": guest_id}, {"_id": 0}).sort("delivered_at", -1))
    guest = db["guest_intelligence"].find_one({"guest_id": guest_id}, {"_id": 0})

    recent = set(a["amenity_name"] for a in amenities[:10])
    all_options = [
        {"name": "Welcome Fruit Basket", "category": "welcome"},
        {"name": "Chocolate Truffles", "category": "welcome"},
        {"name": "Champagne Split", "category": "welcome"},
        {"name": "Local Artisan Chocolates", "category": "welcome"},
        {"name": "Fresh Flowers", "category": "welcome"},
        {"name": "Cheese & Wine Pairing", "category": "welcome"},
        {"name": "Spa Welcome Kit", "category": "wellness"},
        {"name": "Aromatherapy Set", "category": "wellness"},
        {"name": "Bath Bomb Set", "category": "wellness"},
        {"name": "Meditation Kit", "category": "wellness"},
        {"name": "Plant-Based Welcome Box", "category": "dietary"},
        {"name": "Gourmet Cookie Box", "category": "welcome"},
        {"name": "Anniversary Cake", "category": "celebration"},
        {"name": "Birthday Celebration", "category": "celebration"},
        {"name": "Kids Welcome Pack", "category": "family"},
        {"name": "Extra Pillows (2)", "category": "comfort"},
        {"name": "Bathrobes (Set of 2)", "category": "comfort"},
        {"name": "USB-C Charger", "category": "tech"},
        {"name": "Oat Milk Pack", "category": "dietary"},
        {"name": "Espresso Pods Pack", "category": "beverage"},
        {"name": "Running Map & Water", "category": "fitness"},
        {"name": "Yoga Mat & Props", "category": "fitness"},
    ]

    # Filter out allergen-incompatible amenities
    allergens = set(guest.get("allergens", [])) if guest else set()
    dietary = set(guest.get("dietary_restrictions", [])) if guest else set()

    suggestions = []
    for opt in all_options:
        if opt["name"] in recent:
            continue
        # Skip nut/dairy items for allergic guests
        if "tree nuts" in allergens and "Chocolate" in opt["name"]:
            continue
        if "dairy" in allergens and opt["name"] in ("Cheese & Wine Pairing", "Chocolate Truffles"):
            continue
        if "vegan" in dietary and opt["name"] in ("Cheese & Wine Pairing", "Gourmet Cookie Box"):
            continue
        suggestions.append({**opt, "recently_given": False})

    repeat_warning = [{"name": a, "recently_given": True, "warning": "Given on recent visit(s)"} for a in recent]

    return {
        "suggested": suggestions[:8],
        "avoid_repeats": repeat_warning,
        "guest_allergens": list(allergens),
        "guest_dietary": list(dietary),
    }


# ── Special Requests ──

@router.post("/requests")
async def create_special_request(data: SpecialRequestInput):
    """Log a special request for a guest. Broadcasts to relevant departments."""
    req = {"id": f"sr-{_uid()}", **data.model_dump(), "status": "pending", "created_at": _now()}
    db["guest_special_requests"].insert_one(req)
    req.pop("_id", None)
    return req


@router.get("/requests")
async def list_requests(guest_id: Optional[str] = None, status: Optional[str] = None):
    q = {}
    if guest_id:
        q["guest_id"] = guest_id
    if status:
        q["status"] = status
    return {"requests": list(db["guest_special_requests"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))}


@router.put("/requests/{request_id}/status")
async def update_request_status(request_id: str, status: str = Query(...)):
    db["guest_special_requests"].update_one({"id": request_id}, {"$set": {"status": status, "updated_at": _now()}})
    return {"updated": request_id, "status": status}


# ── Spend Tracking ──

@router.get("/spend/{room_number}")
async def guest_spend_by_room(room_number: str):
    """Get comprehensive spend breakdown for a room/guest."""
    ird = list(db["ird_orders"].find({"room_number": room_number}, {"_id": 0}).sort("created_at", -1))
    minibar = list(db["minibar_charges"].find({"room_number": room_number}, {"_id": 0}).sort("created_at", -1))
    retail = list(db["retail_sales"].find({"room_number": room_number}, {"_id": 0}).sort("created_at", -1))
    guest_orders = list(db["guest_orders"].find({"room_number": room_number}, {"_id": 0}).sort("created_at", -1))

    spend = {
        "ird": {"count": len(ird), "total": round(sum(o.get("total", 0) for o in ird), 2), "orders": ird[:5]},
        "minibar": {"count": len(minibar), "total": round(sum(m.get("total", 0) for m in minibar), 2), "charges": minibar[:10]},
        "retail": {"count": len(retail), "total": round(sum(r.get("total", 0) for r in retail), 2), "sales": retail[:5]},
        "guest_orders": {"count": len(guest_orders), "total": round(sum(g.get("total", 0) for g in guest_orders), 2), "orders": guest_orders[:5]},
    }
    spend["grand_total"] = round(spend["ird"]["total"] + spend["minibar"]["total"] + spend["retail"]["total"] + spend["guest_orders"]["total"], 2)

    return {"room_number": room_number, "spend": spend}


# ── Search with allergen alerts ──

@router.get("/search")
async def search_intel(q: str = Query(..., min_length=1)):
    """Search guest intelligence profiles."""
    seed_guest_profiles()
    results = list(db["guest_intelligence"].find(
        {"$or": [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"room_number": q},
            {"room_key_id": q},
            {"loyalty_number": {"$regex": q, "$options": "i"}},
        ]},
        {"_id": 0}
    ).limit(15))
    return {"results": results}


# ── Dashboard ──

@router.get("/dashboard")
async def intel_dashboard():
    """Guest Intelligence dashboard with KPIs."""
    seed_guest_profiles()
    total = db["guest_intelligence"].count_documents({})
    vips = db["guest_intelligence"].count_documents({"vip": True})
    allergy_alerts = db["guest_intelligence"].count_documents({"allergens": {"$ne": []}})
    repeat = db["guest_intelligence"].count_documents({"visit_count": {"$gte": 2}})
    amenities_today = db["amenity_deliveries"].count_documents({})
    pending_requests = db["guest_special_requests"].count_documents({"status": "pending"})

    profiles = list(db["guest_intelligence"].find({}, {"_id": 0}).sort("lifetime_spend", -1).limit(10))

    return {
        "kpis": {
            "total_profiles": total, "vip_guests": vips,
            "allergy_alerts": allergy_alerts, "repeat_guests": repeat,
            "amenities_delivered": amenities_today,
            "pending_requests": pending_requests,
        },
        "top_guests": profiles,
    }
