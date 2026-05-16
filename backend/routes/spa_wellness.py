"""
Spa & Wellness Module — Reservation, Treatment Menu, CRM, Dashboard
====================================================================
- Treatment menu builder (CRUD)
- Appointment booking with availability grid + room assignment
- Client profiles (CRM) with visit history
- Spa dashboard (today's appointments, revenue, utilization)
- Therapist qualifications, credentials, and certification tracking
- Room management with type-based assignment
- BCC mass email promotions
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/spa", tags=["spa"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# ── Models ──
class TreatmentInput(BaseModel):
    name: str
    category: str  # massage, facial, body, nail, hair, package
    description: str = ""
    duration_mins: int = 60
    price: float = 0
    therapist_required: str = "any"  # any, senior, specialist
    room_type: str = "treatment"  # treatment, wet, nail, hair, couples
    required_qualifications: List[str] = []  # e.g. ["deep_tissue", "hot_stone"]
    active: bool = True

class AppointmentInput(BaseModel):
    client_id: str
    treatment_id: str
    therapist_id: Optional[str] = None
    room_id: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    notes: str = ""
    status: str = "confirmed"  # confirmed, pending, cancelled, completed, no_show
    override_qualification: bool = False  # true = book even if therapist not qualified

class ClientInput(BaseModel):
    first_name: str
    last_name: str
    email: str = ""
    phone: str = ""
    preferences: str = ""
    allergies: str = ""
    notes: str = ""
    vip: bool = False

class TherapistInput(BaseModel):
    name: str
    specialty: str  # primary specialty
    level: str = "any"  # any, senior, specialist
    employee_type: str = "in_house"  # in_house, outsourced, contractor
    qualifications: List[str] = []  # specific treatment qualifications
    credentials: List[dict] = []  # [{type, name, issuer, license_number, expiry, file_url}]
    available: bool = True
    email: str = ""
    phone: str = ""
    hourly_rate: float = 0
    bio: str = ""

class RoomInput(BaseModel):
    name: str
    room_type: str  # treatment, wet, nail, hair, couples, sauna, steam
    capacity: int = 1
    floor: str = ""
    equipment: List[str] = []
    status: str = "available"  # available, occupied, maintenance, closed

class CredentialInput(BaseModel):
    credential_type: str  # license, certification, insurance, training
    name: str
    issuer: str = ""
    license_number: str = ""
    issue_date: str = ""
    expiry_date: str = ""
    file_url: str = ""
    verified: bool = False

class PromotionInput(BaseModel):
    subject: str
    body: str
    recipient_list: str = "all"  # all, vip, recent, custom
    custom_emails: List[str] = []

# ── Qualification Definitions ──
QUALIFICATION_CATALOG = [
    {"id": "swedish_massage", "label": "Swedish Massage", "category": "massage"},
    {"id": "deep_tissue", "label": "Deep Tissue Massage", "category": "massage"},
    {"id": "hot_stone", "label": "Hot Stone Therapy", "category": "massage"},
    {"id": "sports_massage", "label": "Sports Massage", "category": "massage"},
    {"id": "prenatal_massage", "label": "Prenatal Massage", "category": "massage"},
    {"id": "aromatherapy", "label": "Aromatherapy", "category": "massage"},
    {"id": "reflexology", "label": "Reflexology", "category": "massage"},
    {"id": "basic_facial", "label": "Basic Facial", "category": "facial"},
    {"id": "anti_aging", "label": "Anti-Aging Facial", "category": "facial"},
    {"id": "chemical_peel", "label": "Chemical Peel", "category": "facial"},
    {"id": "microdermabrasion", "label": "Microdermabrasion", "category": "facial"},
    {"id": "body_wrap", "label": "Body Wrap", "category": "body"},
    {"id": "body_scrub", "label": "Body Scrub", "category": "body"},
    {"id": "hydrotherapy", "label": "Hydrotherapy", "category": "body"},
    {"id": "manicure", "label": "Manicure", "category": "nail"},
    {"id": "pedicure", "label": "Pedicure", "category": "nail"},
    {"id": "gel_nails", "label": "Gel Nails", "category": "nail"},
    {"id": "acrylic_nails", "label": "Acrylic Nails", "category": "nail"},
    {"id": "lash_extensions", "label": "Lash Extensions", "category": "beauty"},
    {"id": "waxing", "label": "Waxing", "category": "beauty"},
]


# ── Seed Data ──
def seed_spa():
    if db["spa_treatments"].count_documents({}) > 0:
        return

    # Seed rooms
    rooms = [
        {"name": "Tranquility Suite 1", "room_type": "treatment", "capacity": 1, "floor": "Level 1", "equipment": ["massage table", "hot towel warmer", "aromatherapy diffuser"], "status": "available"},
        {"name": "Tranquility Suite 2", "room_type": "treatment", "capacity": 1, "floor": "Level 1", "equipment": ["massage table", "hot towel warmer", "sound system"], "status": "available"},
        {"name": "Harmony Couples Room", "room_type": "couples", "capacity": 2, "floor": "Level 1", "equipment": ["2 massage tables", "champagne station", "fireplace", "aromatherapy"], "status": "available"},
        {"name": "Hydro Therapy Room", "room_type": "wet", "capacity": 1, "floor": "Level 1", "equipment": ["vichy shower", "soaking tub", "body wrap station"], "status": "available"},
        {"name": "Nail Lounge A", "room_type": "nail", "capacity": 3, "floor": "Level 1", "equipment": ["3 manicure stations", "UV dryer", "pedicure chairs"], "status": "available"},
        {"name": "Nail Lounge B", "room_type": "nail", "capacity": 2, "floor": "Level 1", "equipment": ["2 pedicure thrones", "gel station"], "status": "available"},
        {"name": "Facial Studio", "room_type": "treatment", "capacity": 1, "floor": "Level 1", "equipment": ["facial steamer", "LED therapy", "microdermabrasion unit", "magnifying lamp"], "status": "available"},
        {"name": "Sauna", "room_type": "sauna", "capacity": 8, "floor": "Level 1", "equipment": ["Finnish sauna", "cold plunge pool"], "status": "available"},
        {"name": "Steam Room", "room_type": "steam", "capacity": 6, "floor": "Level 1", "equipment": ["eucalyptus steam", "rainfall shower"], "status": "available"},
    ]
    for r in rooms:
        db["spa_rooms"].insert_one({"id": f"room-{_uid()}", **r, "created_at": _now()})

    treatments = [
        {"name": "Swedish Massage", "category": "massage", "duration_mins": 60, "price": 150, "description": "Classic relaxation massage", "therapist_required": "any", "room_type": "treatment", "required_qualifications": ["swedish_massage"]},
        {"name": "Deep Tissue Massage", "category": "massage", "duration_mins": 90, "price": 200, "description": "Targeted pressure for chronic tension", "therapist_required": "senior", "room_type": "treatment", "required_qualifications": ["deep_tissue"]},
        {"name": "Hot Stone Therapy", "category": "massage", "duration_mins": 75, "price": 180, "description": "Heated basalt stones for deep relaxation", "therapist_required": "specialist", "room_type": "treatment", "required_qualifications": ["hot_stone"]},
        {"name": "Signature Facial", "category": "facial", "duration_mins": 60, "price": 130, "description": "Customized facial with premium products", "therapist_required": "any", "room_type": "treatment", "required_qualifications": ["basic_facial"]},
        {"name": "Anti-Aging Facial", "category": "facial", "duration_mins": 75, "price": 175, "description": "Advanced anti-aging with collagen boost", "therapist_required": "senior", "room_type": "treatment", "required_qualifications": ["anti_aging", "chemical_peel"]},
        {"name": "Body Wrap — Detox", "category": "body", "duration_mins": 90, "price": 160, "description": "Full body seaweed detox wrap", "therapist_required": "any", "room_type": "wet", "required_qualifications": ["body_wrap"]},
        {"name": "Manicure & Pedicure", "category": "nail", "duration_mins": 75, "price": 85, "description": "Classic mani-pedi combo", "therapist_required": "any", "room_type": "nail", "required_qualifications": ["manicure", "pedicure"]},
        {"name": "Gel Nails — Full Set", "category": "nail", "duration_mins": 60, "price": 65, "description": "Long-lasting gel polish application", "therapist_required": "any", "room_type": "nail", "required_qualifications": ["gel_nails"]},
        {"name": "Couples Retreat Package", "category": "package", "duration_mins": 120, "price": 450, "description": "Side-by-side massage + facial + champagne", "therapist_required": "senior", "room_type": "couples", "required_qualifications": ["swedish_massage", "basic_facial"]},
        {"name": "Executive Destress", "category": "package", "duration_mins": 150, "price": 350, "description": "Deep tissue + hot stone + aromatherapy", "therapist_required": "specialist", "room_type": "treatment", "required_qualifications": ["deep_tissue", "hot_stone", "aromatherapy"]},
    ]
    for t in treatments:
        db["spa_treatments"].insert_one({"id": f"trt-{_uid()}", **t, "active": True, "created_at": _now()})

    therapists = [
        {"name": "Maria Santos", "specialty": "massage", "level": "senior", "employee_type": "in_house",
         "qualifications": ["swedish_massage", "deep_tissue", "hot_stone", "aromatherapy", "prenatal_massage"],
         "credentials": [
             {"credential_type": "license", "name": "Licensed Massage Therapist", "issuer": "State Board of Massage", "license_number": "LMT-2024-4821", "issue_date": "2024-01-15", "expiry_date": "2027-01-15", "verified": True},
             {"credential_type": "certification", "name": "NCBTMB Certified", "issuer": "National Certification Board", "license_number": "NCBTMB-88921", "issue_date": "2023-06-01", "expiry_date": "2027-06-01", "verified": True},
         ],
         "email": "maria.s@resort.com", "phone": "555-0301", "hourly_rate": 45, "bio": "15+ years specializing in therapeutic massage"},
        {"name": "David Kim", "specialty": "massage", "level": "specialist", "employee_type": "in_house",
         "qualifications": ["swedish_massage", "deep_tissue", "hot_stone", "sports_massage", "reflexology"],
         "credentials": [
             {"credential_type": "license", "name": "Licensed Massage Therapist", "issuer": "State Board of Massage", "license_number": "LMT-2023-7612", "issue_date": "2023-03-10", "expiry_date": "2026-03-10", "verified": True},
             {"credential_type": "certification", "name": "Sports Massage Specialist", "issuer": "AMTA", "license_number": "SMS-2022-331", "issue_date": "2022-11-01", "expiry_date": "2026-11-01", "verified": True},
         ],
         "email": "david.k@resort.com", "phone": "555-0302", "hourly_rate": 50, "bio": "Former sports team therapist, expert in injury recovery"},
        {"name": "Sofia Chen", "specialty": "facial", "level": "senior", "employee_type": "in_house",
         "qualifications": ["basic_facial", "anti_aging", "chemical_peel", "microdermabrasion", "lash_extensions"],
         "credentials": [
             {"credential_type": "license", "name": "Licensed Esthetician", "issuer": "State Board of Cosmetology", "license_number": "EST-2024-1190", "issue_date": "2024-02-20", "expiry_date": "2027-02-20", "verified": True},
         ],
         "email": "sofia.c@resort.com", "phone": "555-0303", "hourly_rate": 42, "bio": "Skincare expert with medical-grade treatment experience"},
        {"name": "James Taylor", "specialty": "body", "level": "any", "employee_type": "in_house",
         "qualifications": ["body_wrap", "body_scrub", "hydrotherapy", "swedish_massage"],
         "credentials": [
             {"credential_type": "license", "name": "Licensed Massage Therapist", "issuer": "State Board of Massage", "license_number": "LMT-2025-2204", "issue_date": "2025-01-05", "expiry_date": "2028-01-05", "verified": True},
         ],
         "email": "james.t@resort.com", "phone": "555-0304", "hourly_rate": 38, "bio": "Specializes in hydrotherapy and body treatments"},
        {"name": "Aisha Patel", "specialty": "nail", "level": "any", "employee_type": "in_house",
         "qualifications": ["manicure", "pedicure", "gel_nails", "acrylic_nails"],
         "credentials": [
             {"credential_type": "license", "name": "Licensed Nail Technician", "issuer": "State Board of Cosmetology", "license_number": "NLT-2024-5567", "issue_date": "2024-04-12", "expiry_date": "2027-04-12", "verified": True},
         ],
         "email": "aisha.p@resort.com", "phone": "555-0305", "hourly_rate": 30, "bio": "Expert nail artist with gel and acrylic specialization"},
        {"name": "Elena Volkov", "specialty": "massage", "level": "senior", "employee_type": "outsourced",
         "qualifications": ["swedish_massage", "deep_tissue", "aromatherapy", "prenatal_massage"],
         "credentials": [
             {"credential_type": "license", "name": "Licensed Massage Therapist", "issuer": "State Board of Massage", "license_number": "LMT-2023-9034", "issue_date": "2023-07-20", "expiry_date": "2026-07-20", "verified": True},
             {"credential_type": "insurance", "name": "Professional Liability Insurance", "issuer": "MassageSafe Insurance", "license_number": "PLI-2025-441", "issue_date": "2025-01-01", "expiry_date": "2026-01-01", "verified": True},
         ],
         "email": "elena.v@contractor.com", "phone": "555-0306", "hourly_rate": 55, "bio": "Independent contractor — available weekends and holidays"},
    ]
    for th in therapists:
        db["spa_therapists"].insert_one({"id": f"thp-{_uid()}", **th, "available": True, "created_at": _now()})

    clients = [
        {"first_name": "Victoria", "last_name": "Wellington", "email": "victoria@resort.com", "phone": "555-0101", "preferences": "Lavender essential oil, firm pressure", "allergies": "None", "vip": True},
        {"first_name": "Robert", "last_name": "Chen", "email": "robert.chen@email.com", "phone": "555-0102", "preferences": "Quiet room, no music", "allergies": "Eucalyptus", "vip": False},
        {"first_name": "Emma", "last_name": "Davis", "email": "emma.d@email.com", "phone": "555-0103", "preferences": "Deep pressure, focus on shoulders", "allergies": "None", "vip": True},
        {"first_name": "Michael", "last_name": "Park", "email": "m.park@corp.com", "phone": "555-0104", "preferences": "Couples room when available", "allergies": "Shellfish (body wraps)", "vip": False},
    ]
    for cl in clients:
        db["spa_clients"].insert_one({"id": f"cli-{_uid()}", **cl, "notes": "", "total_visits": 0, "total_spent": 0, "created_at": _now()})

    # Sample appointments with room assignments
    treatments_list = list(db["spa_treatments"].find({}, {"_id": 0}))
    clients_list = list(db["spa_clients"].find({}, {"_id": 0}))
    therapists_list = list(db["spa_therapists"].find({}, {"_id": 0}))
    rooms_list = list(db["spa_rooms"].find({"room_type": {"$in": ["treatment", "wet", "nail", "couples"]}}, {"_id": 0}))
    if treatments_list and clients_list and therapists_list:
        base_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        times = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"]
        for i, t in enumerate(times[:min(len(clients_list), len(times))]):
            cl = clients_list[i % len(clients_list)]
            trt = treatments_list[i % len(treatments_list)]
            thp = therapists_list[i % len(therapists_list)]
            room = rooms_list[i % len(rooms_list)] if rooms_list else None
            db["spa_appointments"].insert_one({
                "id": f"apt-{_uid()}", "client_id": cl["id"], "treatment_id": trt["id"],
                "therapist_id": thp["id"], "room_id": room["id"] if room else None,
                "date": base_date, "time": t,
                "status": "confirmed", "notes": "", "price": trt["price"],
                "client_name": f"{cl['first_name']} {cl['last_name']}",
                "treatment_name": trt["name"], "therapist_name": thp["name"],
                "room_name": room["name"] if room else "Unassigned",
                "duration_mins": trt["duration_mins"],
                "qualification_flag": None,
                "created_at": _now(),
            })


# ── Qualification Check Helper ──
def _check_qualification(therapist: dict, treatment: dict) -> dict:
    """Check if therapist is qualified for a treatment. Returns flag info."""
    required = treatment.get("required_qualifications", [])
    if not required:
        return {"qualified": True, "flag": None}
    therapist_quals = therapist.get("qualifications", [])
    missing = [q for q in required if q not in therapist_quals]
    if missing:
        qual_labels = {q["id"]: q["label"] for q in QUALIFICATION_CATALOG}
        return {
            "qualified": False,
            "flag": "unqualified",
            "missing_qualifications": [qual_labels.get(m, m) for m in missing],
            "message": f"{therapist['name']} is missing: {', '.join(qual_labels.get(m, m) for m in missing)}",
        }
    return {"qualified": True, "flag": None}


# ── Dashboard ──
@router.get("/dashboard")
async def spa_dashboard():
    seed_spa()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    apts = list(db["spa_appointments"].find({}, {"_id": 0}))
    today_apts = [a for a in apts if a.get("date") == today]
    treatments = list(db["spa_treatments"].find({"active": True}, {"_id": 0}))
    clients = list(db["spa_clients"].find({}, {"_id": 0}))
    therapists = list(db["spa_therapists"].find({}, {"_id": 0}))
    rooms = list(db["spa_rooms"].find({}, {"_id": 0}))

    today_rev = sum(a.get("price", 0) for a in today_apts)
    total_rev = sum(a.get("price", 0) for a in apts)
    flagged = len([a for a in apts if a.get("qualification_flag")])
    expiring_creds = 0
    for th in therapists:
        for cred in th.get("credentials", []):
            exp = cred.get("expiry_date", "")
            if exp and exp <= (datetime.now(timezone.utc) + timedelta(days=90)).strftime("%Y-%m-%d"):
                expiring_creds += 1

    return {
        "date": today,
        "kpis": {
            "today_appointments": len(today_apts),
            "today_revenue": round(today_rev, 2),
            "total_revenue": round(total_rev, 2),
            "total_appointments": len(apts),
            "completed": len([a for a in apts if a.get("status") == "completed"]),
            "cancelled": len([a for a in apts if a.get("status") == "cancelled"]),
            "active_treatments": len(treatments),
            "total_clients": len(clients),
            "total_therapists": len(therapists),
            "vip_clients": len([c for c in clients if c.get("vip")]),
            "total_rooms": len(rooms),
            "available_rooms": len([r for r in rooms if r.get("status") == "available"]),
            "flagged_bookings": flagged,
            "expiring_credentials": expiring_creds,
        },
        "today_schedule": sorted(today_apts, key=lambda a: a.get("time", "")),
        "upcoming": sorted([a for a in apts if a.get("date", "") >= today and a.get("status") != "cancelled"], key=lambda a: (a.get("date", ""), a.get("time", "")))[:10],
    }


# ── Treatments CRUD ──
@router.get("/treatments")
async def list_treatments(category: Optional[str] = None, active_only: bool = True):
    seed_spa()
    q = {}
    if category:
        q["category"] = category
    if active_only:
        q["active"] = True
    return {"treatments": list(db["spa_treatments"].find(q, {"_id": 0}))}

@router.post("/treatments")
async def create_treatment(data: TreatmentInput):
    doc = {"id": f"trt-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["spa_treatments"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/treatments/{treatment_id}")
async def update_treatment(treatment_id: str, data: TreatmentInput):
    result = db["spa_treatments"].update_one({"id": treatment_id}, {"$set": {**data.model_dump(), "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Treatment not found")
    return db["spa_treatments"].find_one({"id": treatment_id}, {"_id": 0})

@router.delete("/treatments/{treatment_id}")
async def delete_treatment(treatment_id: str):
    db["spa_treatments"].delete_one({"id": treatment_id})
    return {"deleted": treatment_id}


# ── Rooms CRUD ──
@router.get("/rooms")
async def list_rooms(room_type: Optional[str] = None):
    seed_spa()
    q = {"room_type": room_type} if room_type else {}
    return {"rooms": list(db["spa_rooms"].find(q, {"_id": 0}))}

@router.post("/rooms")
async def create_room(data: RoomInput):
    doc = {"id": f"room-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["spa_rooms"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/rooms/{room_id}")
async def update_room(room_id: str, data: RoomInput):
    result = db["spa_rooms"].update_one({"id": room_id}, {"$set": {**data.model_dump(), "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Room not found")
    return db["spa_rooms"].find_one({"id": room_id}, {"_id": 0})


# ── Appointments CRUD (with qualification check) ──
@router.get("/appointments")
async def list_appointments(date: Optional[str] = None, client_id: Optional[str] = None, status: Optional[str] = None):
    seed_spa()
    q = {}
    if date:
        q["date"] = date
    if client_id:
        q["client_id"] = client_id
    if status:
        q["status"] = status
    apts = list(db["spa_appointments"].find(q, {"_id": 0}).sort([("date", 1), ("time", 1)]))
    return {"appointments": apts, "total": len(apts)}

@router.post("/appointments")
async def create_appointment(data: AppointmentInput):
    trt = db["spa_treatments"].find_one({"id": data.treatment_id}, {"_id": 0})
    cl = db["spa_clients"].find_one({"id": data.client_id}, {"_id": 0})
    if not trt:
        raise HTTPException(404, "Treatment not found")
    if not cl:
        raise HTTPException(404, "Client not found")

    thp = db["spa_therapists"].find_one({"id": data.therapist_id}, {"_id": 0}) if data.therapist_id else None
    room = db["spa_rooms"].find_one({"id": data.room_id}, {"_id": 0}) if data.room_id else None

    # Auto-assign room if not specified
    if not room:
        room = db["spa_rooms"].find_one({"room_type": trt.get("room_type", "treatment"), "status": "available"}, {"_id": 0})

    # Qualification check
    qual_flag = None
    if thp:
        check = _check_qualification(thp, trt)
        if not check["qualified"]:
            if not data.override_qualification:
                raise HTTPException(
                    409,
                    detail={
                        "error": "qualification_mismatch",
                        "message": check["message"],
                        "missing": check.get("missing_qualifications", []),
                        "hint": "Set override_qualification=true to book anyway (will be flagged)",
                    }
                )
            qual_flag = check["message"]

    doc = {
        "id": f"apt-{_uid()}", **data.model_dump(), "price": trt["price"],
        "client_name": f"{cl['first_name']} {cl['last_name']}",
        "treatment_name": trt["name"],
        "therapist_name": thp["name"] if thp else "Any Available",
        "room_id": room["id"] if room else None,
        "room_name": room["name"] if room else "Unassigned",
        "duration_mins": trt["duration_mins"],
        "qualification_flag": qual_flag,
        "created_at": _now(),
    }
    db["spa_appointments"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/appointments/{apt_id}/status")
async def update_appointment_status(apt_id: str, status: str = Query(...)):
    result = db["spa_appointments"].update_one({"id": apt_id}, {"$set": {"status": status, "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Appointment not found")
    if status == "completed":
        apt = db["spa_appointments"].find_one({"id": apt_id}, {"_id": 0})
        if apt:
            db["spa_clients"].update_one({"id": apt["client_id"]}, {"$inc": {"total_visits": 1, "total_spent": apt.get("price", 0)}})
    return {"updated": apt_id, "status": status}

@router.put("/appointments/{apt_id}/assign-room")
async def assign_room(apt_id: str, room_id: str = Query(...)):
    room = db["spa_rooms"].find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    db["spa_appointments"].update_one({"id": apt_id}, {"$set": {"room_id": room_id, "room_name": room["name"], "updated_at": _now()}})
    return {"updated": apt_id, "room": room["name"]}


# ── Availability Grid ──
@router.get("/availability")
async def check_availability(date: str = Query(...), treatment_id: Optional[str] = None):
    seed_spa()
    therapists = list(db["spa_therapists"].find({"available": True}, {"_id": 0}))
    booked = list(db["spa_appointments"].find({"date": date, "status": {"$ne": "cancelled"}}, {"_id": 0}))
    booked_slots = {}
    for b in booked:
        tid = b.get("therapist_id", "")
        if tid not in booked_slots:
            booked_slots[tid] = []
        booked_slots[tid].append(b.get("time", ""))

    # If treatment specified, filter by qualified therapists
    trt = db["spa_treatments"].find_one({"id": treatment_id}, {"_id": 0}) if treatment_id else None
    required_quals = trt.get("required_qualifications", []) if trt else []

    slots = []
    for hour in range(9, 20):
        for minute in [0, 30]:
            t = f"{hour:02d}:{minute:02d}"
            available = []
            for th in therapists:
                if t in booked_slots.get(th["id"], []):
                    continue
                qualified = all(q in th.get("qualifications", []) for q in required_quals)
                available.append({"id": th["id"], "name": th["name"], "qualified": qualified, "specialty": th.get("specialty", "")})
            qualified_count = len([a for a in available if a["qualified"]])
            slots.append({"time": t, "available": len(available), "qualified": qualified_count, "therapists": available[:5]})
    return {"date": date, "slots": slots, "total_therapists": len(therapists), "treatment": trt["name"] if trt else None}


# ── Clients CRM ──
@router.get("/clients")
async def list_clients(vip_only: bool = False):
    seed_spa()
    q = {"vip": True} if vip_only else {}
    return {"clients": list(db["spa_clients"].find(q, {"_id": 0}))}

@router.post("/clients")
async def create_client(data: ClientInput):
    doc = {"id": f"cli-{_uid()}", **data.model_dump(), "total_visits": 0, "total_spent": 0, "created_at": _now()}
    db["spa_clients"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.get("/clients/{client_id}")
async def get_client(client_id: str):
    cl = db["spa_clients"].find_one({"id": client_id}, {"_id": 0})
    if not cl:
        raise HTTPException(404, "Client not found")
    history = list(db["spa_appointments"].find({"client_id": client_id}, {"_id": 0}).sort("date", -1).limit(20))
    return {**cl, "visit_history": history}

@router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientInput):
    result = db["spa_clients"].update_one({"id": client_id}, {"$set": {**data.model_dump(), "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Client not found")
    return db["spa_clients"].find_one({"id": client_id}, {"_id": 0})


# ── Therapists with Qualifications & Credentials ──
@router.get("/therapists")
async def list_therapists():
    seed_spa()
    return {"therapists": list(db["spa_therapists"].find({}, {"_id": 0})), "qualification_catalog": QUALIFICATION_CATALOG}

@router.get("/therapists/{therapist_id}")
async def get_therapist(therapist_id: str):
    th = db["spa_therapists"].find_one({"id": therapist_id}, {"_id": 0})
    if not th:
        raise HTTPException(404, "Therapist not found")
    appointments = list(db["spa_appointments"].find({"therapist_id": therapist_id}, {"_id": 0}).sort("date", -1).limit(20))
    qual_labels = {q["id"]: q["label"] for q in QUALIFICATION_CATALOG}
    return {
        **th,
        "qualification_labels": [qual_labels.get(q, q) for q in th.get("qualifications", [])],
        "recent_appointments": appointments,
    }

@router.post("/therapists")
async def create_therapist(data: TherapistInput):
    doc = {"id": f"thp-{_uid()}", **data.model_dump(), "available": True, "created_at": _now()}
    db["spa_therapists"].insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/therapists/{therapist_id}")
async def update_therapist(therapist_id: str, data: TherapistInput):
    result = db["spa_therapists"].update_one({"id": therapist_id}, {"$set": {**data.model_dump(), "updated_at": _now()}})
    if result.matched_count == 0:
        raise HTTPException(404, "Therapist not found")
    return db["spa_therapists"].find_one({"id": therapist_id}, {"_id": 0})

@router.post("/therapists/{therapist_id}/credentials")
async def add_credential(therapist_id: str, data: CredentialInput):
    th = db["spa_therapists"].find_one({"id": therapist_id}, {"_id": 0})
    if not th:
        raise HTTPException(404, "Therapist not found")
    cred = {"id": f"cred-{_uid()}", **data.model_dump(), "added_at": _now()}
    db["spa_therapists"].update_one({"id": therapist_id}, {"$push": {"credentials": cred}})
    return cred

@router.get("/therapists/{therapist_id}/check-qualification")
async def check_therapist_qualification(therapist_id: str, treatment_id: str = Query(...)):
    th = db["spa_therapists"].find_one({"id": therapist_id}, {"_id": 0})
    trt = db["spa_treatments"].find_one({"id": treatment_id}, {"_id": 0})
    if not th:
        raise HTTPException(404, "Therapist not found")
    if not trt:
        raise HTTPException(404, "Treatment not found")
    return _check_qualification(th, trt)


# ── Qualifications Catalog ──
@router.get("/qualifications")
async def list_qualifications():
    return {"qualifications": QUALIFICATION_CATALOG}


# ── Promotions / Mass Email ──
@router.post("/promotions/send")
async def send_promotion(data: PromotionInput):
    if data.recipient_list == "all":
        recipients = [c["email"] for c in db["spa_clients"].find({}, {"_id": 0, "email": 1}) if c.get("email")]
    elif data.recipient_list == "vip":
        recipients = [c["email"] for c in db["spa_clients"].find({"vip": True}, {"_id": 0, "email": 1}) if c.get("email")]
    else:
        recipients = data.custom_emails
    promo = {
        "id": f"promo-{_uid()}", "subject": data.subject, "body": data.body,
        "recipient_count": len(recipients), "recipient_list": data.recipient_list,
        "status": "queued", "created_at": _now(),
    }
    db["spa_promotions"].insert_one(promo)
    promo.pop("_id", None)
    return {**promo, "note": "Email queued. Requires SendGrid/Resend integration for actual delivery."}

@router.get("/promotions")
async def list_promotions():
    return {"promotions": list(db["spa_promotions"].find({}, {"_id": 0}).sort("created_at", -1).limit(20))}
