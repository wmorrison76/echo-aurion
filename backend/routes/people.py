"""
iter173 · People Services — Employee Directory + Onboarding Profile

Core HR directory that powers:
  - People Services "Birthdays & Anniversaries" auto-feed in Daily Standup
  - Leadership Coverage picker (filter by dept + role)
  - Lifestyle Dashboard staffing suggestions
  - Privacy-safe display: first name + last initial only (William's spec)

Routes under `/api/people/*`. Admin-gated writes via X-Admin-Token header.
"""
import os
import uuid
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field, EmailStr

router = APIRouter(prefix="/api/people", tags=["people-services"])


# ─── Admin gate ─────────────────────────────────────────────────────────────
def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected:
        return  # dev bypass if not set
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


DEPARTMENTS = [
    "front-office", "guest-services", "housekeeping", "engineering", "fb",
    "culinary", "pastry", "sales", "marketing", "people-services", "finance",
    "spa", "lifestyle", "security", "activities", "ird", "concierge",
]

ROLES = [
    "executive", "director", "manager", "assistant-manager", "supervisor",
    "team-lead", "team-member", "intern", "contractor",
]


class Employee(BaseModel):
    id: Optional[str] = None
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: str
    role: str  # from ROLES
    title: Optional[str] = None
    hire_date: Optional[str] = None  # YYYY-MM-DD
    birthday: Optional[str] = None  # MM-DD only (privacy)
    photo_url: Optional[str] = None
    property: Optional[str] = "main"
    active: bool = True
    onboarding_complete: bool = False
    notes: Optional[str] = None
    # iter174 · promotion history (for People Services celebrations)
    promotion_history: List[Dict[str, Any]] = Field(default_factory=list)
    # Each entry: {"date": "YYYY-MM-DD", "from_title": str, "to_title": str, "note": str}


class PromotionEntry(BaseModel):
    employee_id: str
    date: str                   # YYYY-MM-DD
    from_title: Optional[str] = None
    to_title: str
    note: Optional[str] = None


def _display_name(e: Dict[str, Any]) -> str:
    """First name + last initial (privacy-safe for standup broadcast)."""
    fn = (e.get("first_name") or "").strip()
    ln = (e.get("last_name") or "").strip()
    return f"{fn} {ln[0]}." if ln else fn


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Upsert ────────────────────────────────────────────────────────────────
@router.post("/upsert")
async def upsert_employee(emp: Employee, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if emp.department not in DEPARTMENTS:
        raise HTTPException(400, f"unknown department '{emp.department}'")
    if emp.role not in ROLES:
        raise HTTPException(400, f"unknown role '{emp.role}'")
    from database import db as _db
    doc = emp.model_dump()
    doc["display_name"] = _display_name(doc)
    doc["updated_at"] = _now_iso()
    if not doc.get("id"):
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.employees.insert_one(doc.copy())
    else:
        _db.employees.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    saved = _db.employees.find_one({"id": doc["id"]}, {"_id": 0})
    return {"ok": True, "employee": saved}


# ─── List ──────────────────────────────────────────────────────────────────
@router.get("/list")
async def list_employees(department: Optional[str] = None, role: Optional[str] = None,
                          active_only: bool = True, q: Optional[str] = None):
    from database import db as _db
    query: Dict[str, Any] = {}
    if active_only: query["active"] = True
    if department: query["department"] = department
    if role: query["role"] = role
    if q:
        query["$or"] = [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
            {"title": {"$regex": q, "$options": "i"}},
        ]
    items = list(_db.employees.find(query, {"_id": 0}).sort([("department", 1), ("last_name", 1)]).limit(500))
    return {"ok": True, "total": len(items), "employees": items, "departments": DEPARTMENTS, "roles": ROLES}


@router.get("/{employee_id}")
async def get_employee(employee_id: str):
    from database import db as _db
    e = _db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not e: raise HTTPException(404, "employee not found")
    return {"ok": True, "employee": e}


# ─── Delete (soft) ─────────────────────────────────────────────────────────
@router.post("/{employee_id}/deactivate")
async def deactivate(employee_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.employees.update_one({"id": employee_id}, {"$set": {"active": False, "updated_at": _now_iso()}})
    if r.matched_count == 0: raise HTTPException(404, "employee not found")
    return {"ok": True, "deactivated": employee_id}


# ─── Promotions (iter174) ─────────────────────────────────────────────────
@router.post("/promotion")
async def log_promotion(entry: PromotionEntry, x_admin_token: Optional[str] = Header(None)):
    """Log a promotion. Pushes to employee.promotion_history and updates current title."""
    _require_admin(x_admin_token)
    try: datetime.strptime(entry.date, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "date must be YYYY-MM-DD")
    from database import db as _db
    e = _db.employees.find_one({"id": entry.employee_id}, {"_id": 0})
    if not e: raise HTTPException(404, "employee not found")
    promo = {"date": entry.date, "from_title": entry.from_title or e.get("title"),
             "to_title": entry.to_title, "note": entry.note, "logged_at": _now_iso()}
    _db.employees.update_one({"id": entry.employee_id}, {
        "$set": {"title": entry.to_title, "updated_at": _now_iso()},
        "$push": {"promotion_history": promo}})
    return {"ok": True, "promotion": promo, "employee": _db.employees.find_one({"id": entry.employee_id}, {"_id": 0})}


# ─── Birthdays + anniversaries (powers People Services standup card) ───────
def _today_md() -> str:
    return datetime.now(timezone.utc).strftime("%m-%d")


@router.get("/celebrations/today")
async def celebrations_today(date_iso: Optional[str] = None):
    """Returns today's birthdays + work anniversaries. Privacy-safe display names only."""
    from database import db as _db
    if date_iso:
        try:
            d = datetime.strptime(date_iso, "%Y-%m-%d")
            md = d.strftime("%m-%d")
            yyyy = d.year
        except ValueError:
            raise HTTPException(400, "date must be YYYY-MM-DD")
    else:
        now = datetime.now(timezone.utc)
        md = now.strftime("%m-%d")
        yyyy = now.year

    birthdays = []
    anniversaries = []
    promotions = []
    for e in _db.employees.find({"active": True}, {"_id": 0}):
        if e.get("birthday") and e["birthday"].endswith(md):
            birthdays.append({"name": _display_name(e), "department": e.get("department"), "title": e.get("title") or e.get("role")})
        hd = e.get("hire_date") or ""
        if len(hd) >= 10 and hd[5:10] == md:
            try:
                yrs = yyyy - int(hd[:4])
                if yrs > 0:
                    anniversaries.append({"name": _display_name(e), "years": yrs, "department": e.get("department"), "title": e.get("title") or e.get("role")})
            except ValueError:
                pass
        for p in (e.get("promotion_history") or []):
            pd = p.get("date") or ""
            if len(pd) >= 10 and pd[5:10] == md:
                try:
                    yrs = yyyy - int(pd[:4])
                    if yrs > 0:
                        promotions.append({"name": _display_name(e), "years": yrs,
                                           "from_title": p.get("from_title"), "to_title": p.get("to_title"),
                                           "department": e.get("department")})
                except ValueError:
                    pass
    return {"ok": True, "date": date_iso or _today_md(), "birthdays": birthdays, "anniversaries": anniversaries,
            "promotions": promotions,
            "summary": f"{len(birthdays)} birthday(s), {len(anniversaries)} work anniversary(ies), {len(promotions)} promotion anniversary(ies) today"}


@router.get("/celebrations/upcoming")
async def celebrations_upcoming(days: int = 7):
    """Upcoming birthdays/anniversaries in next N days."""
    from datetime import timedelta
    from database import db as _db
    now = datetime.now(timezone.utc).date()
    window = [(now + timedelta(days=i)).strftime("%m-%d") for i in range(days)]
    results = []
    for e in _db.employees.find({"active": True}, {"_id": 0}):
        bd = e.get("birthday") or ""
        bd_md = bd[-5:] if len(bd) >= 5 else ""
        if bd_md and bd_md in window:
            idx = window.index(bd_md)
            results.append({"kind": "birthday", "when": (now + timedelta(days=idx)).isoformat(),
                            "name": _display_name(e), "department": e.get("department")})
        hd = e.get("hire_date") or ""
        if len(hd) >= 10 and hd[5:10] in window:
            idx = window.index(hd[5:10])
            try: yrs = (now + timedelta(days=idx)).year - int(hd[:4])
            except ValueError: yrs = 0
            if yrs > 0:
                results.append({"kind": "anniversary", "when": (now + timedelta(days=idx)).isoformat(),
                                "name": _display_name(e), "years": yrs, "department": e.get("department")})
    results.sort(key=lambda r: r["when"])
    return {"ok": True, "days": days, "total": len(results), "celebrations": results}


# ─── Seeder ────────────────────────────────────────────────────────────────
def seed_employees():
    """Idempotent seed of a sample leadership team for demo/testing."""
    from database import db as _db
    if _db.employees.count_documents({}) > 0:
        return 0
    samples = [
        {"first_name": "Marcus", "last_name": "Hayes", "department": "front-office", "role": "director", "title": "Director of Front Office", "hire_date": "2021-04-18", "birthday": "04-19", "active": True},
        {"first_name": "Elena", "last_name": "Ruiz", "department": "lifestyle", "role": "director", "title": "Director of Lifestyle", "hire_date": "2019-11-03", "birthday": "07-22", "active": True},
        {"first_name": "Priya", "last_name": "Shah", "department": "people-services", "role": "director", "title": "Director of People Services", "hire_date": "2020-02-14", "birthday": "04-18", "active": True},
        {"first_name": "Tobias", "last_name": "Klein", "department": "engineering", "role": "director", "title": "Director of Engineering", "hire_date": "2018-06-01", "birthday": "12-09", "active": True},
        {"first_name": "Anika", "last_name": "Patel", "department": "housekeeping", "role": "manager", "title": "Executive Housekeeper", "hire_date": "2022-09-12", "birthday": "03-15", "active": True},
        {"first_name": "Diego", "last_name": "Morales", "department": "fb", "role": "director", "title": "Director of F&B", "hire_date": "2017-08-20", "birthday": "11-02", "active": True},
        {"first_name": "Sasha", "last_name": "Nguyen", "department": "spa", "role": "manager", "title": "Spa Manager", "hire_date": "2023-01-09", "birthday": "06-18", "active": True},
        {"first_name": "Ravi", "last_name": "Chandrasekaran", "department": "sales", "role": "director", "title": "Director of Sales & Marketing", "hire_date": "2020-05-18", "birthday": "09-30", "active": True},
        {"first_name": "Luna", "last_name": "Bellworth", "department": "activities", "role": "manager", "title": "Recreation Manager", "hire_date": "2024-03-11", "birthday": "04-19", "active": True},
        {"first_name": "Jamal", "last_name": "Ortiz", "department": "guest-services", "role": "manager", "title": "Concierge Manager", "hire_date": "2019-10-04", "birthday": "02-28", "active": True},
    ]
    for s in samples:
        s["id"] = uuid.uuid4().hex[:12]
        s["display_name"] = _display_name(s)
        s["onboarding_complete"] = True
        s["promotion_history"] = []
        s["created_at"] = _now_iso()
        s["updated_at"] = _now_iso()
        _db.employees.insert_one(s)
    # Sample promotion on today's date so demo People Services card shows activity
    marcus = _db.employees.find_one({"first_name": "Marcus"}, {"_id": 0})
    if marcus:
        today_md = datetime.now(timezone.utc).strftime("%m-%d")
        promo = {"date": f"2023-{today_md}", "from_title": "Front Office Manager",
                 "to_title": "Director of Front Office", "note": "Promoted after 2 years of 9.1+ GSS",
                 "logged_at": _now_iso()}
        _db.employees.update_one({"id": marcus["id"]}, {"$push": {"promotion_history": promo}})
    return len(samples)
