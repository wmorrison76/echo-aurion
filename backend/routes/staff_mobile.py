"""iter190 · Build 2 backend — role-gated staff mobile APIs.

Three new surfaces:
  · /api/staff-mobile/me          — who am I + role-flags for UI gating
  · /api/pto/*                    — PTO request flow (create / list-mine / cancel-mine) + admin approve
  · /api/benefits/mine            — read-only benefits view per staff

Role gating:
  - `role` on employees collection ∈ {general, salary, manager, owner}
  - General staff see only their own data
  - Salary/manager/owner see limited aggregates (not financials)
  - Admin-level approval still requires X-Admin-Token
"""
from __future__ import annotations
import os
import secrets
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/staff-mobile", tags=["staff-mobile"])
pto_router = APIRouter(prefix="/api/pto", tags=["pto"])
benefits_router = APIRouter(prefix="/api/benefits", tags=["benefits"])


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _auth_staff(x_briefing_token: Optional[str]) -> Dict[str, Any]:
    """Reuse the briefing_mobile_tokens collection as the staff session surface.
    Staff were already provisioned for the daily briefing; we now link each
    token to an employee record by `staff_email` match."""
    if not x_briefing_token: raise HTTPException(401, "staff token required")
    from database import db as _db
    sess = _db.briefing_mobile_tokens.find_one({"token": x_briefing_token, "active": True}, {"_id": 0})
    if not sess: raise HTTPException(401, "invalid or revoked staff token")
    exp = sess.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now(): raise HTTPException(410, "staff token expired")
    return sess


def _employee_for(session: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve the staff session to an employees record. Returns an empty
    stub if no match — role defaults to 'general' so the UI still gates safely."""
    from database import db as _db
    email = (session.get("staff_email") or "").lower().strip()
    emp = None
    if email:
        emp = _db.employees.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0})
    if not emp:
        # Fallback by name
        name = (session.get("staff_name") or "").strip()
        if name:
            emp = _db.employees.find_one({
                "$or": [
                    {"full_name": {"$regex": f"^{name}$", "$options": "i"}},
                    {"name": {"$regex": f"^{name}$", "$options": "i"}},
                ]
            }, {"_id": 0})
    return emp or {
        "id": f"stub-{session.get('token','?')[:6]}",
        "full_name": session.get("staff_name"),
        "email": session.get("staff_email"),
        "role": "general",
    }


def _role_flags(role: str) -> Dict[str, bool]:
    role = (role or "general").lower()
    is_admin = role in ("salary", "manager", "owner")
    return {
        "role": role,
        "is_general": role == "general",
        "is_salary": role in ("salary", "manager", "owner"),
        "is_manager": role in ("manager", "owner"),
        "is_owner": role == "owner",
        # UI capability flags — what the mobile shell should render
        "can_view_dashboard": is_admin,
        "can_edit_standup": role in ("manager", "owner"),
        "can_manage_hiring": role in ("manager", "owner"),
        "can_mint_tokens": role in ("manager", "owner"),
        "can_approve_pto": role in ("manager", "owner"),
        "can_view_financials": role == "owner",
        "can_view_coworker_schedule": is_admin,
        "can_view_total_hours": is_admin,
    }


# ─── /api/staff-mobile/me ────────────────────────────────────────────────
@router.get("/me")
async def staff_me(x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    emp = _employee_for(sess)
    flags = _role_flags(emp.get("role"))
    return {
        "ok": True,
        "staff": {
            "id": emp.get("id") or emp.get("employee_id"),
            "name": sess.get("staff_name") or emp.get("full_name") or emp.get("name"),
            "email": sess.get("staff_email") or emp.get("email"),
            "phone": sess.get("staff_phone") or emp.get("phone"),
            "role": flags["role"],
            "title": emp.get("title") or emp.get("position") or sess.get("staff_role"),
            "department": emp.get("department"),
            "hired_on": emp.get("hire_date") or emp.get("start_date"),
        },
        "capabilities": flags,
    }


# ─── PTO ──────────────────────────────────────────────────────────────────
class PtoRequestBody(BaseModel):
    start_date: str   # YYYY-MM-DD
    end_date: str
    reason: Optional[str] = None
    kind: Optional[str] = "vacation"  # vacation | sick | personal | unpaid


@pto_router.post("/request")
async def pto_request(body: PtoRequestBody, x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    emp = _employee_for(sess)
    try:
        sd = date.fromisoformat(body.start_date)
        ed = date.fromisoformat(body.end_date)
    except Exception:
        raise HTTPException(400, "dates must be YYYY-MM-DD")
    if ed < sd: raise HTTPException(400, "end_date cannot be before start_date")
    if (ed - sd).days > 60: raise HTTPException(400, "request max 60 days")
    from database import db as _db
    rid = f"pto-{secrets.token_urlsafe(6)}"
    doc = {
        "id": rid,
        "employee_id": emp.get("id") or emp.get("employee_id"),
        "employee_name": sess.get("staff_name") or emp.get("full_name"),
        "employee_email": sess.get("staff_email"),
        "start_date": body.start_date,
        "end_date": body.end_date,
        "days": (ed - sd).days + 1,
        "kind": body.kind or "vacation",
        "reason": (body.reason or "").strip()[:500],
        "status": "pending",
        "created_at": _iso(),
    }
    _db.pto_requests.insert_one(doc.copy())
    return {"ok": True, "request": doc}


@pto_router.get("/mine")
async def pto_mine(x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    from database import db as _db
    email = (sess.get("staff_email") or "").lower()
    name = sess.get("staff_name")
    q: Dict[str, Any] = {"$or": []}
    if email: q["$or"].append({"employee_email": {"$regex": f"^{email}$", "$options": "i"}})
    if name: q["$or"].append({"employee_name": name})
    if not q["$or"]: return {"ok": True, "requests": []}
    items = list(_db.pto_requests.find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    # Compute rolling PTO balance from employee record (if present)
    emp = _employee_for(sess)
    balance = emp.get("pto_balance_days") or emp.get("pto_days_remaining") or None
    return {"ok": True, "total": len(items), "requests": items, "pto_balance_days": balance}


@pto_router.post("/cancel/{request_id}")
async def pto_cancel(request_id: str, x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    from database import db as _db
    doc = _db.pto_requests.find_one({"id": request_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "not found")
    if (doc.get("employee_email") or "").lower() != (sess.get("staff_email") or "").lower() and doc.get("employee_name") != sess.get("staff_name"):
        raise HTTPException(403, "not your request")
    if doc.get("status") not in ("pending", "approved"):
        raise HTTPException(400, f"cannot cancel a {doc.get('status')} request")
    _db.pto_requests.update_one({"id": request_id}, {"$set": {"status": "canceled", "canceled_at": _iso()}})
    return {"ok": True, "canceled": request_id}


class PtoDecisionBody(BaseModel):
    request_id: str
    decision: str   # approved | rejected
    reviewer_note: Optional[str] = None


@pto_router.post("/decide")
async def pto_decide(body: PtoDecisionBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(400, "decision must be approved or rejected")
    from database import db as _db
    r = _db.pto_requests.update_one(
        {"id": body.request_id, "status": "pending"},
        {"$set": {
            "status": body.decision,
            "reviewer_note": (body.reviewer_note or "")[:500],
            "reviewed_at": _iso(),
        }},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "pending request not found")
    return {"ok": True, "decision": body.decision}


@pto_router.get("/pending")
async def pto_pending(x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    items = list(_db.pto_requests.find({"status": "pending"}, {"_id": 0}).sort("created_at", 1).limit(200))
    return {"ok": True, "total": len(items), "requests": items}


# ─── Role assignment (admin) ──────────────────────────────────────────────
VALID_ROLES = ("general", "salary", "manager", "owner")


class RoleAssignBody(BaseModel):
    employee_email: Optional[str] = None
    employee_id: Optional[str] = None
    role: str


@router.get("/employees")
async def list_employees_for_role(x_admin_token: Optional[str] = Header(None)):
    """Admin-only: list all employees + their current role for the Role Assigner panel."""
    _require_admin(x_admin_token)
    from database import db as _db
    out: Dict[str, Dict[str, Any]] = {}
    for e in _db.employees.find({}, {"_id": 0}).limit(500):
        email = (e.get("email") or "").lower().strip()
        key = email or (e.get("full_name") or e.get("name") or e.get("id") or "").lower()
        if not key: continue
        out[key] = {
            "id": e.get("id") or e.get("employee_id"),
            "name": e.get("full_name") or e.get("name"),
            "email": e.get("email"),
            "role": e.get("role") or "general",
            "title": e.get("title") or e.get("position"),
            "source": "employees",
        }
    for t in _db.briefing_mobile_tokens.find({"active": True}, {"_id": 0}).limit(500):
        email = (t.get("staff_email") or "").lower().strip()
        key = email or (t.get("staff_name") or "").lower()
        if not key or key in out: continue
        out[key] = {
            "id": None, "name": t.get("staff_name"), "email": t.get("staff_email"),
            "role": "general", "title": t.get("staff_role"), "source": "briefing_token",
        }
    items = sorted(out.values(), key=lambda x: (x.get("role") != "owner", x.get("role") != "manager", x.get("role") != "salary", (x.get("name") or "").lower()))
    return {"ok": True, "total": len(items), "employees": items, "roles": list(VALID_ROLES)}


@router.post("/employees/role")
async def assign_role(body: RoleAssignBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    role = (body.role or "").strip().lower()
    if role not in VALID_ROLES: raise HTTPException(400, f"role must be one of {VALID_ROLES}")
    if not body.employee_email and not body.employee_id:
        raise HTTPException(400, "employee_email or employee_id required")
    from database import db as _db
    q: Dict[str, Any] = {}
    if body.employee_id: q["$or"] = [{"id": body.employee_id}, {"employee_id": body.employee_id}]
    elif body.employee_email: q["email"] = {"$regex": f"^{body.employee_email}$", "$options": "i"}
    existing = _db.employees.find_one(q, {"_id": 0})
    if existing:
        _db.employees.update_one(q, {"$set": {"role": role, "role_updated_at": _iso()}})
        return {"ok": True, "role": role, "created": False, "id": existing.get("id") or existing.get("employee_id")}
    new_id = f"emp-{secrets.token_urlsafe(6)}"
    _db.employees.insert_one({
        "id": new_id, "email": body.employee_email, "role": role,
        "full_name": None, "created_at": _iso(), "role_updated_at": _iso(),
        "source": "role_assigner_stub",
    })
    return {"ok": True, "role": role, "created": True, "id": new_id}



@benefits_router.get("/mine")
async def benefits_mine(x_briefing_token: Optional[str] = Header(None)):
    sess = _auth_staff(x_briefing_token)
    emp = _employee_for(sess)
    # Benefits are sourced from employees record if enrolled; otherwise surface
    # the plan catalog so staff can see what they're eligible for.
    enrolled = emp.get("benefits") or {}
    from database import db as _db
    catalog = list(_db.benefits_catalog.find({"active": True}, {"_id": 0}).sort("display_order", 1)) \
        if hasattr(_db, "benefits_catalog") else []
    if not catalog:
        catalog = _default_benefits_catalog()
    return {
        "ok": True,
        "employee": {
            "name": sess.get("staff_name") or emp.get("full_name"),
            "hired_on": emp.get("hire_date") or emp.get("start_date"),
            "status": emp.get("employment_status") or ("full_time" if _role_flags(emp.get("role"))["is_salary"] else "hourly"),
        },
        "enrolled": enrolled,
        "pto_balance_days": emp.get("pto_balance_days") or emp.get("pto_days_remaining"),
        "catalog": catalog,
        "note": "Enrollment & changes happen in person with HR. This page is read-only.",
    }


def _default_benefits_catalog() -> List[Dict[str, Any]]:
    """Safe default when no benefits_catalog collection has been seeded."""
    return [
        {"slug": "health", "name": "Health Insurance",        "summary": "Medical, BlueShield PPO · employer covers 80% of premium.", "icon": "🏥", "display_order": 1, "active": True},
        {"slug": "dental", "name": "Dental",                  "summary": "Delta Dental PPO · preventive care 100%.",                "icon": "🦷", "display_order": 2, "active": True},
        {"slug": "vision", "name": "Vision",                  "summary": "VSP · one exam + frames/contacts per year.",              "icon": "👁", "display_order": 3, "active": True},
        {"slug": "401k",   "name": "401(k) retirement",       "summary": "Employer match up to 4%, vested over 2 years.",           "icon": "📈", "display_order": 4, "active": True},
        {"slug": "pto",    "name": "Paid Time Off",           "summary": "Accrues monthly. Request from this app.",                 "icon": "🏝",  "display_order": 5, "active": True},
        {"slug": "meals",  "name": "Team meals",              "summary": "One meal per shift while on duty.",                       "icon": "🍽", "display_order": 6, "active": True},
        {"slug": "stay",   "name": "Luccca stay discount",    "summary": "50% off room rates for employee + family.",               "icon": "🛏",  "display_order": 7, "active": True},
        {"slug": "spa",    "name": "Spa & fitness access",    "summary": "Free access to the property gym + 30% spa discount.",     "icon": "💆", "display_order": 8, "active": True},
    ]



# ═══════════════════════════════════════════════════════════════════════════
# iter193 · Mobile Build 4 — HR Hiring + Finance roll-up (mobile-optimised)
# ═══════════════════════════════════════════════════════════════════════════
hiring_mobile_router = APIRouter(prefix="/api/staff-mobile/hiring", tags=["staff-mobile-hiring"])
finance_mobile_router = APIRouter(prefix="/api/staff-mobile/finance", tags=["staff-mobile-finance"])


def _require_manager(sess: Dict[str, Any]) -> Dict[str, Any]:
    emp = _employee_for(sess)
    flags = _role_flags(emp.get("role"))
    if not flags["can_manage_hiring"]:
        raise HTTPException(403, "manager or owner role required")
    return emp


def _require_financials(sess: Dict[str, Any]) -> Dict[str, Any]:
    emp = _employee_for(sess)
    flags = _role_flags(emp.get("role"))
    # Finance roll-up tiles for salary/manager/owner. Full line items only for owner.
    if not flags["can_view_dashboard"]:
        raise HTTPException(403, "salary, manager or owner role required")
    return emp


# ─── Hiring mobile surface ────────────────────────────────────────────────
@hiring_mobile_router.get("/batches")
async def hiring_batches_mobile(limit: int = 10, x_briefing_token: Optional[str] = Header(None)):
    """Compact list of recent hiring batches for the manager's mobile view."""
    sess = _auth_staff(x_briefing_token)
    _require_manager(sess)
    from database import db as _db
    items = list(_db.hiring_batches.find(
        {}, {"_id": 0, "id": 1, "job_profile_code": 1, "job_profile_title": 1,
             "candidate_count": 1, "created_at": 1, "ranked": 1},
    ).sort("created_at", -1).limit(max(1, min(30, limit))))
    # Trim each batch to compact summary (top 3 candidates)
    summary = []
    for b in items:
        ranked = b.get("ranked") or []
        top = [
            {
                "rank": r.get("rank"),
                "candidate_name": r.get("candidate_name"),
                "fit_score": r.get("fit_score"),
                "fit_label": r.get("fit_label"),
                "recommendation": r.get("recommendation"),
            }
            for r in ranked[:3]
        ]
        summary.append({
            "id": b.get("id"),
            "job_profile_title": b.get("job_profile_title"),
            "job_profile_code": b.get("job_profile_code"),
            "candidate_count": b.get("candidate_count") or len(ranked),
            "created_at": b.get("created_at"),
            "top_candidates": top,
        })
    return {"ok": True, "total": len(summary), "batches": summary}


@hiring_mobile_router.get("/batch/{batch_id}")
async def hiring_batch_detail_mobile(batch_id: str, x_briefing_token: Optional[str] = Header(None)):
    """Full batch detail — all candidates with scorecards, for the manager's decision screen."""
    sess = _auth_staff(x_briefing_token)
    _require_manager(sess)
    from database import db as _db
    b = _db.hiring_batches.find_one({"id": batch_id}, {"_id": 0})
    if not b: raise HTTPException(404, "batch not found")
    return {"ok": True, "batch": b}


class HiringDecisionBody(BaseModel):
    batch_id: str
    candidate_name: str
    decision: str  # advance | phone-screen | decline | consider-for-lower-level | hold
    note: Optional[str] = None


@hiring_mobile_router.post("/decision")
async def hiring_decision_mobile(body: HiringDecisionBody, x_briefing_token: Optional[str] = Header(None)):
    """Record a manager's decision on a candidate. Writes to `hiring_decisions`
    for an audit trail; does not mutate the original batch scorecard."""
    sess = _auth_staff(x_briefing_token)
    emp = _require_manager(sess)
    allowed = {"advance", "phone-screen", "decline", "consider-for-lower-level", "hold"}
    if body.decision not in allowed:
        raise HTTPException(400, f"decision must be one of {sorted(allowed)}")
    from database import db as _db
    if not _db.hiring_batches.find_one({"id": body.batch_id}, {"_id": 0, "id": 1}):
        raise HTTPException(404, "batch not found")
    doc = {
        "id": f"hd-{secrets.token_urlsafe(8)}",
        "batch_id": body.batch_id,
        "candidate_name": body.candidate_name,
        "decision": body.decision,
        "note": (body.note or "")[:500],
        "decided_by_name": sess.get("staff_name"),
        "decided_by_email": sess.get("staff_email"),
        "decided_by_role": _role_flags(emp.get("role"))["role"],
        "decided_at": _iso(),
    }
    _db.hiring_decisions.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "decision": doc}


@hiring_mobile_router.get("/decisions/{batch_id}")
async def hiring_decisions_mobile(batch_id: str, x_briefing_token: Optional[str] = Header(None)):
    """All decisions recorded against a given batch."""
    sess = _auth_staff(x_briefing_token)
    _require_manager(sess)
    from database import db as _db
    items = list(_db.hiring_decisions.find({"batch_id": batch_id}, {"_id": 0})
                 .sort("decided_at", -1).limit(200))
    return {"ok": True, "total": len(items), "decisions": items}


# ─── Finance roll-up tiles ────────────────────────────────────────────────
def _sum_gl(gl_rows: List[Dict[str, Any]], match) -> float:
    total = 0.0
    for r in gl_rows:
        if match(r):
            try: total += float(r.get("amount") or 0)
            except (TypeError, ValueError): pass
    return total


@finance_mobile_router.get("/rollup")
async def finance_rollup_mobile(days: int = 7, x_briefing_token: Optional[str] = Header(None)):
    """Compact finance tiles for the mobile Home tab. Returns a small,
    calorie-efficient payload sized for a phone screen."""
    sess = _auth_staff(x_briefing_token)
    _require_financials(sess)
    from database import db as _db

    days = max(1, min(90, days))
    cutoff = (_now() - timedelta(days=days)).isoformat()

    # GL entries drive revenue + food cost + labor. We fall back gracefully.
    gl_rows = list(_db.gl_entries.find(
        {"entry_date": {"$gte": cutoff[:10]}}, {"_id": 0, "entry_type": 1, "gl_code": 1, "amount": 1, "entry_date": 1},
    ).limit(5000)) if hasattr(_db, "gl_entries") else []

    revenue = _sum_gl(gl_rows, lambda r: r.get("entry_type") == "revenue")
    food_cost = _sum_gl(gl_rows, lambda r: r.get("gl_code") == "5000")
    labor = _sum_gl(gl_rows, lambda r: r.get("gl_code") in ("6000", "6010"))

    def pct(num, den): return (num / den) if den else None

    fc_pct = pct(food_cost, revenue)
    labor_pct = pct(labor, revenue)
    prime_cost_pct = pct(food_cost + labor, revenue)

    # Sparkline: per-day revenue over the window (compact, <= 14 points)
    days_bucket: Dict[str, float] = {}
    for r in gl_rows:
        if r.get("entry_type") != "revenue": continue
        d = (r.get("entry_date") or "")[:10]
        if not d: continue
        days_bucket[d] = days_bucket.get(d, 0.0) + float(r.get("amount") or 0)
    spark = [{"date": k, "revenue": round(v, 2)} for k, v in sorted(days_bucket.items())][-14:]

    # Open high-priority alerts (from notification_queue)
    alerts = []
    if hasattr(_db, "notifications"):
        alerts = list(_db.notifications.find(
            {"read": False, "priority": {"$in": ["high", "critical", "warning"]}},
            {"_id": 0, "id": 1, "title": 1, "priority": 1, "type": 1, "created_at": 1},
        ).sort("created_at", -1).limit(5))

    return {
        "ok": True,
        "window_days": days,
        "tiles": {
            "revenue": {"label": "Revenue", "value": round(revenue, 2), "unit": "USD"},
            "food_cost": {"label": "Food cost", "value": round(food_cost, 2), "unit": "USD", "pct_of_revenue": round(fc_pct * 100, 1) if fc_pct is not None else None, "target_pct": 26.0},
            "labor":     {"label": "Labor",     "value": round(labor, 2),     "unit": "USD", "pct_of_revenue": round(labor_pct * 100, 1) if labor_pct is not None else None, "target_pct": 28.0},
            "prime_cost": {"label": "Prime cost", "pct_of_revenue": round(prime_cost_pct * 100, 1) if prime_cost_pct is not None else None, "target_pct": 55.0},
        },
        "sparkline": spark,
        "alerts": alerts,
        "generated_at": _iso(),
    }
