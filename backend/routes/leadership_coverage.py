"""
iter173 · Leadership Coverage Schedule

Directors/Executives enter their on-duty days per department. Funnels into
Daily Standup "Leadership on Duty" card auto-fill + feeds GM Aurium dashboard.

Routes under `/api/leadership/*`.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/leadership", tags=["leadership-coverage"])


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


SHIFT_KINDS = ["am", "pm", "overnight", "mod", "on-call", "off"]  # mod = manager on duty


class Coverage(BaseModel):
    id: Optional[str] = None
    employee_id: str
    employee_name: Optional[str] = None  # denormalized for quick display
    department: str
    date: str  # YYYY-MM-DD
    shift: str = "am"  # from SHIFT_KINDS
    notes: Optional[str] = None
    property: Optional[str] = "main"


@router.post("/upsert")
async def upsert_coverage(c: Coverage, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if c.shift not in SHIFT_KINDS:
        raise HTTPException(400, f"unknown shift '{c.shift}' (valid: {SHIFT_KINDS})")
    try: datetime.strptime(c.date, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "date must be YYYY-MM-DD")
    from database import db as _db
    # Denormalize employee_name if not provided
    if not c.employee_name:
        e = _db.employees.find_one({"id": c.employee_id}, {"_id": 0, "display_name": 1, "department": 1, "title": 1, "role": 1})
        if e:
            c.employee_name = e.get("display_name")
            if e.get("department") and not c.department: c.department = e["department"]
    doc = c.model_dump()
    doc["updated_at"] = _now_iso()
    if not doc.get("id"):
        doc["id"] = uuid.uuid4().hex[:12]
        doc["created_at"] = _now_iso()
        _db.leadership_coverage.insert_one(doc.copy())
    else:
        _db.leadership_coverage.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    return {"ok": True, "coverage": _db.leadership_coverage.find_one({"id": doc["id"]}, {"_id": 0})}


@router.get("/by-date/{date_iso}")
async def by_date(date_iso: str):
    """Powers Daily Standup 'Leadership on Duty' card."""
    from database import db as _db
    items = list(_db.leadership_coverage.find({"date": date_iso}, {"_id": 0}).sort([("department", 1), ("shift", 1)]))
    # Group by dept for easy consumption
    by_dept: Dict[str, List[Dict[str, Any]]] = {}
    for it in items:
        by_dept.setdefault(it.get("department", "other"), []).append({
            "name": it.get("employee_name") or "—",
            "shift": it.get("shift"),
            "notes": it.get("notes"),
        })
    return {"ok": True, "date": date_iso, "total": len(items), "by_department": by_dept, "raw": items}


@router.get("/range")
async def by_range(start: str, days: int = 7):
    """Return coverage rows for a date window — used by Leadership Coverage calendar UI."""
    try: start_dt = datetime.strptime(start, "%Y-%m-%d")
    except ValueError: raise HTTPException(400, "start must be YYYY-MM-DD")
    dates = [(start_dt + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    from database import db as _db
    items = list(_db.leadership_coverage.find({"date": {"$in": dates}}, {"_id": 0}))
    return {"ok": True, "start": start, "days": days, "dates": dates, "total": len(items), "coverage": items}


@router.post("/{coverage_id}/delete")
async def delete_coverage(coverage_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    r = _db.leadership_coverage.delete_one({"id": coverage_id})
    if r.deleted_count == 0: raise HTTPException(404, "coverage not found")
    return {"ok": True, "deleted": coverage_id}


def seed_leadership_coverage():
    """Seed this week's coverage for leadership team (demo)."""
    from database import db as _db
    if _db.leadership_coverage.count_documents({}) > 0:
        return 0
    today = datetime.now(timezone.utc).date()
    # Get seeded directors
    dirs = list(_db.employees.find({"role": {"$in": ["director", "manager"]}, "active": True},
                                   {"_id": 0, "id": 1, "display_name": 1, "department": 1}).limit(10))
    shifts = ["am", "pm", "mod"]
    count = 0
    for i in range(7):
        d = (today + timedelta(days=i)).strftime("%Y-%m-%d")
        for j, emp in enumerate(dirs):
            if (i + j) % 7 == 6: continue  # one day off per week
            shift = shifts[(i + j) % len(shifts)]
            _db.leadership_coverage.insert_one({
                "id": uuid.uuid4().hex[:12],
                "employee_id": emp["id"],
                "employee_name": emp.get("display_name"),
                "department": emp.get("department"),
                "date": d, "shift": shift, "property": "main",
                "created_at": _now_iso(), "updated_at": _now_iso(),
            })
            count += 1
    return count
