"""
iter177 · Job Profiles — Position Library for Hiring, Evaluation & AI Rating

A catalogue of defined positions (Cook 1, Cook 2, Cook 3, Sous Chef, Housekeeper,
Front Desk Agent, etc.) each carrying:
  - Responsibilities
  - Expectations
  - Required skills & certifications
  - Typical experience band
  - Salary band (optional)
  - Reports-to

Powers:
  - Employee profile assignment ("What is this person qualified to do?")
  - Hiring checklist when adding a new employee
  - AI-driven evaluation (Claude reads the resume + the job profile and rates fit)

All writes admin-gated (X-Admin-Token). Reads are admin-only too since this is
internal HR data.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/job-profiles", tags=["job-profiles"])


# ─── Admin gate ─────────────────────────────────────────────────────────────
def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected:
        return  # dev bypass if not set
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


LEVELS = ["entry", "mid", "senior", "lead", "management", "executive"]


class JobProfile(BaseModel):
    id: Optional[str] = None
    code: str  # e.g. "cook_1", "cook_2", "sous_chef"
    title: str
    department: str
    level: str = "entry"  # from LEVELS
    summary: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    expectations: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    required_certifications: List[str] = Field(default_factory=list)
    min_experience_years: Optional[float] = 0
    salary_band_min: Optional[float] = None
    salary_band_max: Optional[float] = None
    reports_to_code: Optional[str] = None  # code of parent JobProfile
    active: bool = True


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Upsert ────────────────────────────────────────────────────────────────
@router.post("/upsert")
async def upsert_profile(profile: JobProfile, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if profile.level not in LEVELS:
        raise HTTPException(400, f"level must be one of {LEVELS}")
    code = (profile.code or "").strip().lower().replace(" ", "_")
    if not code:
        raise HTTPException(400, "code required")
    from database import db as _db
    doc = profile.model_dump()
    doc["code"] = code
    doc["updated_at"] = _now_iso()
    existing = _db.job_profiles.find_one({"code": code}, {"_id": 0})
    if existing:
        doc["id"] = existing["id"]
        doc["created_at"] = existing.get("created_at") or _now_iso()
        _db.job_profiles.update_one({"code": code}, {"$set": doc})
    else:
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.job_profiles.insert_one(doc.copy())
    saved = _db.job_profiles.find_one({"code": code}, {"_id": 0})
    return {"ok": True, "profile": saved}


# ─── List ──────────────────────────────────────────────────────────────────
@router.get("/list")
async def list_profiles(department: Optional[str] = None, level: Optional[str] = None,
                        active_only: bool = True, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    q: Dict[str, Any] = {}
    if active_only: q["active"] = True
    if department: q["department"] = department
    if level: q["level"] = level
    items = list(_db.job_profiles.find(q, {"_id": 0}).sort([("department", 1), ("level", 1), ("title", 1)]).limit(500))
    return {"ok": True, "total": len(items), "profiles": items, "levels": LEVELS}


@router.get("/by-code/{code}")
async def get_by_code(code: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    p = _db.job_profiles.find_one({"code": code.lower()}, {"_id": 0})
    if not p: raise HTTPException(404, "job profile not found")
    return {"ok": True, "profile": p}


@router.post("/{code}/deactivate")
async def deactivate(code: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.job_profiles.update_one({"code": code.lower()}, {"$set": {"active": False, "updated_at": _now_iso()}})
    if r.matched_count == 0: raise HTTPException(404, "job profile not found")
    return {"ok": True, "deactivated": code}


# ─── Seeder ────────────────────────────────────────────────────────────────
def seed_job_profiles():
    """Seed a core hospitality position library. Idempotent by `code`."""
    from database import db as _db
    if _db.job_profiles.count_documents({}) > 0:
        return 0
    samples: List[Dict[str, Any]] = [
        # ─── Culinary ladder ─────────────────────────────────────────────
        {
            "code": "cook_1", "title": "Cook 1 (Lead Line)", "department": "culinary", "level": "senior",
            "summary": "Leads a primary station (grill, sauté, fish, or garde manger) during service. Mentors Cook 2 & 3.",
            "responsibilities": [
                "Execute menu items to spec at primary station",
                "Run prep sheet every AM and sign off on mise en place",
                "Coach Cook 2/3 on technique and speed",
                "Call tickets on the line during peak",
                "Close station, wrap walk-in, temp logs complete",
            ],
            "expectations": [
                "Consistent plate appearance — no returns from QA",
                "100% temp-log compliance per HACCP",
                "Zero tolerance for cross-contact or allergen slips",
                "Reports waste & 86'd items before each service",
            ],
            "required_skills": ["knife skills", "sauté/grill", "sauces", "timing", "HACCP"],
            "preferred_skills": ["butchery", "pastry basics", "sous-vide"],
            "required_certifications": ["ServSafe Food Handler"],
            "min_experience_years": 3, "salary_band_min": 48000, "salary_band_max": 62000,
            "reports_to_code": "sous_chef",
        },
        {
            "code": "cook_2", "title": "Cook 2 (Station Cook)", "department": "culinary", "level": "mid",
            "summary": "Runs a secondary station independently. Learning Cook 1 responsibilities.",
            "responsibilities": [
                "Execute secondary station (pantry, fry, pizza, pasta)",
                "Complete daily prep list",
                "Support Cook 1 during peak", "Keep station clean & organized",
            ],
            "expectations": [
                "Hits all tickets under 8 minutes at 80% capacity",
                "Prep complete by noon daily",
                "Zero sanitation violations",
            ],
            "required_skills": ["station prep", "line speed", "basic sauces"],
            "preferred_skills": ["grill experience", "inventory awareness"],
            "required_certifications": ["ServSafe Food Handler"],
            "min_experience_years": 1, "salary_band_min": 38000, "salary_band_max": 48000,
            "reports_to_code": "cook_1",
        },
        {
            "code": "cook_3", "title": "Cook 3 (Prep / Entry)", "department": "culinary", "level": "entry",
            "summary": "Prep cook. Learns knife work, mise en place, and station discipline.",
            "responsibilities": [
                "Daily prep list: cuts, sauces, breakdowns",
                "Rotate stock FIFO",
                "Support dish and pot-wash overflow",
                "Learn station recipes under Cook 2",
            ],
            "expectations": [
                "Show up ready — uniform, knives, clean",
                "Ask questions instead of guessing on recipes",
                "Clean as you go",
            ],
            "required_skills": ["basic knife skills", "recipe following", "cleanliness"],
            "preferred_skills": ["culinary school coursework"],
            "required_certifications": ["ServSafe Food Handler (within 30 days)"],
            "min_experience_years": 0, "salary_band_min": 32000, "salary_band_max": 38000,
            "reports_to_code": "cook_2",
        },
        {
            "code": "sous_chef", "title": "Sous Chef", "department": "culinary", "level": "management",
            "summary": "Second-in-command of the kitchen. Runs service in the Chef's absence.",
            "responsibilities": [
                "Own service execution, line management, ticket flow",
                "Daily ordering & receiving",
                "Coach cooks 1-3 on technique and consistency",
                "Interview and hire line cooks with Chef",
                "P&L awareness: food cost, labor, waste",
            ],
            "expectations": [
                "Consistent 28-32% food cost",
                "Zero health-department violations",
                "Staff retention > 70% year-over-year",
            ],
            "required_skills": ["kitchen leadership", "menu costing", "HACCP", "scheduling", "hiring"],
            "required_certifications": ["ServSafe Manager"],
            "min_experience_years": 5, "salary_band_min": 65000, "salary_band_max": 85000,
            "reports_to_code": "executive_chef",
        },
        {
            "code": "executive_chef", "title": "Executive Chef", "department": "culinary", "level": "executive",
            "summary": "Culinary leader. Owns menu, cost, staff, quality.",
            "responsibilities": [
                "Concept and menu development",
                "Culinary P&L ownership",
                "Vendor relationships",
                "Health & safety compliance",
                "Staff development across all culinary",
            ],
            "expectations": [
                "Menu refresh 2x / year minimum",
                "Food cost target met monthly",
                "Culinary team engagement survey > 4.0/5",
            ],
            "required_skills": ["menu engineering", "P&L", "leadership", "recruiting"],
            "required_certifications": ["ServSafe Manager", "Culinary Arts Degree or equivalent"],
            "min_experience_years": 8, "salary_band_min": 95000, "salary_band_max": 140000,
        },
        # ─── Pastry ladder ───────────────────────────────────────────────
        {
            "code": "pastry_cook", "title": "Pastry Cook", "department": "pastry", "level": "entry",
            "summary": "Supports pastry chef on production, plating, breads, showpieces.",
            "responsibilities": ["Daily pastry prep", "Breads & laminated doughs", "Plated desserts", "Freezer rotation"],
            "expectations": ["Consistent weighing & scaling", "Clean bench between tasks"],
            "required_skills": ["baking fundamentals", "scaling", "tempering basics"],
            "required_certifications": ["ServSafe Food Handler"],
            "min_experience_years": 0, "salary_band_min": 34000, "salary_band_max": 44000,
            "reports_to_code": "pastry_chef",
        },
        {
            "code": "pastry_chef", "title": "Pastry Chef", "department": "pastry", "level": "management",
            "summary": "Leads pastry program: menu, production, events, cakes.",
            "responsibilities": [
                "Pastry menu & production schedule",
                "Wedding & event cakes",
                "Cost & yield tracking",
                "Supervise Pastry Cooks",
            ],
            "expectations": ["Zero missed event deadlines", "<4% pastry waste", "Monthly menu innovation"],
            "required_skills": ["showpiece work", "chocolate", "sugar", "plated desserts", "cake architecture"],
            "required_certifications": ["ServSafe Manager"],
            "min_experience_years": 5, "salary_band_min": 60000, "salary_band_max": 82000,
            "reports_to_code": "executive_chef",
        },
        # ─── F&B floor ───────────────────────────────────────────────────
        {
            "code": "server", "title": "Server", "department": "fb", "level": "mid",
            "summary": "Takes and delivers orders; narrates menu, upsells, handles guest requests.",
            "responsibilities": [
                "Full menu memorization including 86'd items",
                "Order entry via POS", "Wine & cocktail pairing suggestions",
                "Check accuracy and timely delivery",
                "Side-work rotation",
            ],
            "expectations": ["Average check > +12% upsell", "Zero comps from order errors", "Guest survey > 4.5/5"],
            "required_skills": ["POS", "menu knowledge", "wine service", "guest recovery"],
            "preferred_skills": ["sommelier basics", "bilingual"],
            "required_certifications": ["Food Handler", "TIPS/Alcohol Service"],
            "min_experience_years": 1, "salary_band_min": 28000, "salary_band_max": 55000,  # varies by tips
            "reports_to_code": "fb_manager",
        },
        {
            "code": "bartender", "title": "Bartender", "department": "fb", "level": "mid",
            "summary": "Crafts cocktails, pours wine & beer, manages the bar service rail.",
            "responsibilities": [
                "Speed & consistency on classic + signature cocktails",
                "Liquor/inventory control", "Guest engagement & storytelling",
                "POS tabs and payments",
            ],
            "expectations": ["Pour-cost 18-22%", "Zero comp incidents", "4.5/5 guest rating"],
            "required_skills": ["classics", "spec pours", "POS", "cash handling"],
            "required_certifications": ["TIPS/Alcohol Service"],
            "min_experience_years": 2, "salary_band_min": 30000, "salary_band_max": 65000,
            "reports_to_code": "fb_manager",
        },
        {
            "code": "fb_manager", "title": "F&B Manager", "department": "fb", "level": "management",
            "summary": "Runs floor service: hiring, scheduling, guest recovery, labor targets.",
            "responsibilities": ["Scheduling & labor cost", "Training & evaluation", "Guest recovery", "POS admin"],
            "expectations": ["Labor 22-26% of revenue", "Turnover <35% annually"],
            "required_skills": ["leadership", "POS admin", "P&L", "scheduling"],
            "required_certifications": ["ServSafe Manager", "TIPS Manager"],
            "min_experience_years": 5, "salary_band_min": 62000, "salary_band_max": 82000,
        },
        # ─── Rooms division ──────────────────────────────────────────────
        {
            "code": "front_desk_agent", "title": "Front Desk Agent", "department": "front-office", "level": "entry",
            "summary": "Guest check-in / check-out, reservations, folio accuracy, resolution.",
            "responsibilities": [
                "Check in / check out", "Folio & payment accuracy",
                "Room assignment", "Guest request routing", "Safe box & cash handling",
            ],
            "expectations": ["4.6+ GSS (guest satisfaction)", "Zero folio disputes", "Upsell rate > 8%"],
            "required_skills": ["PMS (Opera/Cloudbeds)", "guest service", "basic math", "multi-tasking"],
            "preferred_skills": ["multilingual", "concierge experience"],
            "min_experience_years": 0, "salary_band_min": 36000, "salary_band_max": 48000,
            "reports_to_code": "front_office_manager",
        },
        {
            "code": "concierge", "title": "Concierge", "department": "concierge", "level": "mid",
            "summary": "Curates guest experiences inside and outside the property.",
            "responsibilities": [
                "Dining, transport, and excursion bookings",
                "VIP pre-arrival prep",
                "Local knowledge depth + vendor relationships",
                "Service recovery for guest issues",
            ],
            "expectations": ["VIP arrivals 100% prepped", "Repeat-guest retention > 60%"],
            "required_skills": ["local market depth", "vendor negotiation", "written communication"],
            "preferred_skills": ["Les Clefs d'Or candidate"],
            "min_experience_years": 2, "salary_band_min": 45000, "salary_band_max": 62000,
            "reports_to_code": "front_office_manager",
        },
        {
            "code": "front_office_manager", "title": "Front Office Manager", "department": "front-office", "level": "management",
            "summary": "Leads Front Desk, Concierge, Bell, Valet.",
            "responsibilities": ["Scheduling", "Training", "GSS ownership", "Upsell program"],
            "expectations": ["GSS > 4.6", "Turnover < 30%"],
            "required_skills": ["PMS admin", "leadership", "P&L"],
            "min_experience_years": 5, "salary_band_min": 65000, "salary_band_max": 85000,
        },
        {
            "code": "housekeeper", "title": "Room Attendant (Housekeeper)", "department": "housekeeping", "level": "entry",
            "summary": "Cleans guest rooms to brand standard.",
            "responsibilities": ["15-17 rooms/day to standard", "Inspect & report maintenance issues",
                                 "Linen & amenity stocking", "Lost & found protocol"],
            "expectations": ["Zero room rejections", "Quota met daily", "Zero linen loss"],
            "required_skills": ["attention to detail", "time management", "physical stamina"],
            "required_certifications": ["Bloodborne Pathogen Training"],
            "min_experience_years": 0, "salary_band_min": 34000, "salary_band_max": 42000,
            "reports_to_code": "executive_housekeeper",
        },
        {
            "code": "executive_housekeeper", "title": "Executive Housekeeper", "department": "housekeeping", "level": "management",
            "summary": "Leads room attendants, houseman, and laundry.",
            "responsibilities": ["Scheduling", "Quality inspections", "Chemical & linen inventory",
                                 "Cost control", "Staff training"],
            "expectations": ["Room rejection rate <2%", "Labor on par with budget"],
            "required_skills": ["HK inspection", "scheduling", "chemical safety"],
            "min_experience_years": 6, "salary_band_min": 58000, "salary_band_max": 78000,
        },
        # ─── Lifestyle / Activities / Spa ────────────────────────────────
        {
            "code": "recreation_attendant", "title": "Recreation Attendant", "department": "activities", "level": "entry",
            "summary": "Runs daily activations — pool, cabanas, kids' club support.",
            "responsibilities": ["Activity setup & breakdown", "Guest engagement", "Safety monitoring"],
            "expectations": ["4.5+ guest engagement", "Zero safety incidents"],
            "required_skills": ["energy", "guest service", "swim safety"],
            "required_certifications": ["CPR/AED", "First Aid"],
            "min_experience_years": 0, "salary_band_min": 30000, "salary_band_max": 38000,
            "reports_to_code": "recreation_manager",
        },
        {
            "code": "recreation_manager", "title": "Recreation Manager", "department": "activities", "level": "management",
            "summary": "Leads all pool, beach, kids-club, and activation staff.",
            "responsibilities": ["Activation calendar", "Staff scheduling", "Vendor liaison (water sports, excursions)"],
            "expectations": ["Activations fill > 70% capacity", "4.5+ guest rating"],
            "required_skills": ["event design", "leadership", "budget"],
            "required_certifications": ["CPR/AED", "Lifeguard Instructor (preferred)"],
            "min_experience_years": 4, "salary_band_min": 52000, "salary_band_max": 72000,
        },
        {
            "code": "spa_therapist", "title": "Spa Therapist", "department": "spa", "level": "mid",
            "summary": "Delivers massage, facial, or body treatment services.",
            "responsibilities": ["Licensed treatments to spec", "Retail attach at checkout",
                                 "Treatment room setup & sanitation"],
            "expectations": ["4.8+ therapist rating", "20% retail attach"],
            "required_skills": ["massage or esthetics", "retail", "guest consultation"],
            "required_certifications": ["State License (Massage Therapy or Esthetics)"],
            "min_experience_years": 1, "salary_band_min": 45000, "salary_band_max": 75000,
            "reports_to_code": "spa_manager",
        },
        {
            "code": "spa_manager", "title": "Spa Manager", "department": "spa", "level": "management",
            "summary": "Leads therapy staff and spa retail.",
            "responsibilities": ["Scheduling", "Retail P&L", "Treatment menu design"],
            "expectations": ["Retail 25% of spa revenue", "Rebooking > 55%"],
            "required_skills": ["spa operations", "retail management", "P&L"],
            "min_experience_years": 5, "salary_band_min": 60000, "salary_band_max": 80000,
        },
        # ─── Engineering / Security ──────────────────────────────────────
        {
            "code": "engineer_tech", "title": "Engineering Technician", "department": "engineering", "level": "mid",
            "summary": "Property maintenance, HVAC/plumbing/electric response.",
            "responsibilities": ["PM rounds", "Guest request response", "HVAC filter changes",
                                 "Pool chemistry", "Minor electrical & plumbing"],
            "expectations": ["PM 100% on-time", "Guest response <10 min"],
            "required_skills": ["HVAC basics", "plumbing", "electrical 101", "PMS ticketing"],
            "preferred_skills": ["CPO (Certified Pool Operator)", "HVAC-EPA 608"],
            "min_experience_years": 2, "salary_band_min": 48000, "salary_band_max": 68000,
            "reports_to_code": "chief_engineer",
        },
        {
            "code": "chief_engineer", "title": "Chief Engineer / Director", "department": "engineering", "level": "executive",
            "summary": "Owns all property systems, capex, and maintenance staff.",
            "responsibilities": ["Capex planning", "Vendor management", "Code compliance", "Energy cost"],
            "expectations": ["Uptime > 99%", "Energy cost within budget"],
            "required_skills": ["facility mgmt", "P&L", "capex", "vendor negotiation"],
            "preferred_skills": ["LEED-accredited"],
            "min_experience_years": 10, "salary_band_min": 95000, "salary_band_max": 135000,
        },
    ]
    for s in samples:
        s["id"] = uuid.uuid4().hex[:12]
        s["active"] = True
        s["level"] = s.get("level") or "entry"
        s.setdefault("preferred_skills", [])
        s.setdefault("required_certifications", [])
        s["created_at"] = _now_iso()
        s["updated_at"] = _now_iso()
        from database import db as _db
        _db.job_profiles.insert_one(s.copy())
    return len(samples)
