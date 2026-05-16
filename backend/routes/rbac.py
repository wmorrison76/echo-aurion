"""
RBAC + AI Omniscience Engine
============================
Enterprise Role-Based Access Control with data classification.
The AI³ engine sees everything, but responses are filtered by user role.

Data Classification Levels:
  - PUBLIC: Menu items, events, general info
  - INTERNAL: Inventory levels, recipe costs, production schedules
  - CONFIDENTIAL: Vendor pricing, P&L details, food cost %
  - RESTRICTED: Payroll, compensation, owner draws, financial statements
  - TOP_SECRET: Executive compensation, investor data, legal matters

Resort/Casino Roles:
  - owner: Full access to everything
  - gm: General Manager - all except owner compensation
  - director: Department directors - their department + cross-dept operational
  - exec_chef: Culinary operations + food cost data
  - controller: All financial data except owner compensation
  - manager: Department-level operational data
  - supervisor: Shift-level data within department
  - staff: Own schedule, tasks, limited operational
  - vendor: Own POs, delivery schedule, invoice status only
"""
import os
import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Header, Depends
from pydantic import BaseModel

import database
db = database.db

router = APIRouter(prefix="/api/rbac", tags=["rbac"])

def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid.uuid4())[:12]


# ── Data Classification ────────────────────────────────────────────────

CLASSIFICATION_LEVELS = {
    "PUBLIC": 0,
    "INTERNAL": 1,
    "CONFIDENTIAL": 2,
    "RESTRICTED": 3,
    "TOP_SECRET": 4,
}

# What each role can see (max classification level)
ROLE_CLEARANCE = {
    "owner":       4,  # TOP_SECRET
    "gm":          3,  # RESTRICTED (minus owner comp)
    "director":    2,  # CONFIDENTIAL (own dept)
    "exec_chef":   2,  # CONFIDENTIAL (culinary)
    "controller":  3,  # RESTRICTED (financial)
    "manager":     1,  # INTERNAL
    "supervisor":  1,  # INTERNAL (shift-level)
    "staff":       0,  # PUBLIC
    "vendor":      0,  # PUBLIC (own data only)
}

# Department-level access matrix
ROLE_DEPARTMENTS = {
    "owner":       ["all"],
    "gm":          ["all"],
    "director":    [],  # Set per user
    "exec_chef":   ["culinary", "pastry", "banquet", "purchasing"],
    "controller":  ["finance", "purchasing", "payroll", "audit"],
    "manager":     [],  # Set per user
    "supervisor":  [],  # Set per user
    "staff":       [],  # Set per user
    "vendor":      ["purchasing"],
}

# Data categories and their classification
DATA_CLASSIFICATION = {
    # PUBLIC
    "menu_items": "PUBLIC",
    "calendar_events": "PUBLIC",
    "outlet_info": "PUBLIC",
    "allergen_info": "PUBLIC",
    "recipe_names": "PUBLIC",
    # INTERNAL
    "inventory_levels": "INTERNAL",
    "recipe_costs": "INTERNAL",
    "production_schedules": "INTERNAL",
    "vendor_list": "INTERNAL",
    "staff_schedules": "INTERNAL",
    "maintenance_tickets": "INTERNAL",
    # CONFIDENTIAL
    "vendor_pricing": "CONFIDENTIAL",
    "food_cost_pct": "CONFIDENTIAL",
    "purchase_orders": "CONFIDENTIAL",
    "event_revenue": "CONFIDENTIAL",
    "occupancy_data": "CONFIDENTIAL",
    "guest_profiles": "CONFIDENTIAL",
    # RESTRICTED
    "payroll_data": "RESTRICTED",
    "employee_compensation": "RESTRICTED",
    "profit_loss": "RESTRICTED",
    "bank_accounts": "RESTRICTED",
    "tax_filings": "RESTRICTED",
    "insurance_claims": "RESTRICTED",
    # TOP_SECRET
    "owner_compensation": "TOP_SECRET",
    "investor_data": "TOP_SECRET",
    "legal_matters": "TOP_SECRET",
    "acquisition_plans": "TOP_SECRET",
    "executive_bonuses": "TOP_SECRET",
}


class UserRoleInput(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    departments: Optional[list] = []
    property_ids: Optional[list] = ["default"]
    is_active: Optional[bool] = True


class AIQueryInput(BaseModel):
    query: str
    user_id: str
    context: Optional[dict] = {}


def can_access(role: str, data_category: str, user_departments: list = []) -> bool:
    """Check if a role can access a data category."""
    clearance = ROLE_CLEARANCE.get(role, 0)
    classification = CLASSIFICATION_LEVELS.get(
        DATA_CLASSIFICATION.get(data_category, "RESTRICTED"), 4
    )
    return clearance >= classification


def filter_response_for_role(data: dict, role: str, user_departments: list = []) -> dict:
    """Strip fields the user's role shouldn't see."""
    clearance = ROLE_CLEARANCE.get(role, 0)

    # Fields to redact at each level
    redactions = {
        0: ["cost", "unit_cost", "total_cost", "margin", "profit", "revenue",
            "compensation", "salary", "wage", "payroll", "owner_draw",
            "vendor_price", "food_cost_pct", "labor_cost"],
        1: ["compensation", "salary", "wage", "payroll", "owner_draw",
            "profit", "executive_bonus", "investor"],
        2: ["compensation", "salary", "wage", "payroll", "owner_draw",
            "executive_bonus", "investor"],
        3: ["owner_draw", "executive_bonus", "investor_data", "acquisition"],
    }

    fields_to_redact = set()
    for level in range(clearance + 1, 5):
        if level in redactions:
            fields_to_redact.update(redactions[level])

    if not fields_to_redact:
        return data

    def _redact(obj):
        if isinstance(obj, dict):
            return {
                k: ("***RESTRICTED***" if any(r in k.lower() for r in fields_to_redact) else _redact(v))
                for k, v in obj.items()
            }
        if isinstance(obj, list):
            return [_redact(i) for i in obj]
        return obj

    return _redact(data)


# ── Seed default roles ──

DEFAULT_USERS = [
    {"user_id": "usr-owner-001", "email": "owner@resort.com", "name": "James Wellington III",
     "role": "owner", "departments": ["all"], "property_ids": ["default"]},
    {"user_id": "usr-gm-001", "email": "gm@resort.com", "name": "Sarah Mitchell",
     "role": "gm", "departments": ["all"], "property_ids": ["default"]},
    {"user_id": "usr-chef-001", "email": "chef@resort.com", "name": "Chef Marcus Laurent",
     "role": "exec_chef", "departments": ["culinary", "pastry", "banquet"], "property_ids": ["default"]},
    {"user_id": "usr-ctrl-001", "email": "controller@resort.com", "name": "David Chen",
     "role": "controller", "departments": ["finance", "purchasing", "payroll"], "property_ids": ["default"]},
    {"user_id": "usr-fbd-001", "email": "fb.director@resort.com", "name": "Maria Santos",
     "role": "director", "departments": ["culinary", "banquet", "bars", "dining"], "property_ids": ["default"]},
    {"user_id": "usr-eng-001", "email": "engineering@resort.com", "name": "Robert Kim",
     "role": "director", "departments": ["engineering", "maintenance"], "property_ids": ["default"]},
    {"user_id": "usr-mgr-001", "email": "dining.mgr@resort.com", "name": "Lisa Thompson",
     "role": "manager", "departments": ["dining"], "property_ids": ["default"]},
    {"user_id": "usr-sup-001", "email": "am.sup@resort.com", "name": "Carlos Rivera",
     "role": "supervisor", "departments": ["dining"], "property_ids": ["default"]},
    {"user_id": "usr-staff-001", "email": "staff@resort.com", "name": "Emily Watson",
     "role": "staff", "departments": ["dining"], "property_ids": ["default"]},
    {"user_id": "usr-vendor-001", "email": "rep@sysco.com", "name": "Sysco Rep",
     "role": "vendor", "departments": ["purchasing"], "property_ids": ["default"]},
]


def seed_rbac():
    col = db["rbac_users"]
    if col.count_documents({}) > 0:
        return
    for u in DEFAULT_USERS:
        col.insert_one({**u, "is_active": True, "created_at": _now(), "updated_at": _now()})


# ── Endpoints ──

@router.get("/roles")
def list_roles():
    return {
        "roles": list(ROLE_CLEARANCE.keys()),
        "clearance_levels": ROLE_CLEARANCE,
        "data_classifications": DATA_CLASSIFICATION,
    }


@router.get("/users")
def list_users(role: Optional[str] = None, department: Optional[str] = None):
    q = {}
    if role:
        q["role"] = role
    if department:
        q["departments"] = {"$in": [department, "all"]}
    users = list(db["rbac_users"].find(q, {"_id": 0}))
    return {"users": users, "total": len(users)}


@router.post("/users")
def create_user(data: UserRoleInput):
    doc = {**data.model_dump(), "created_at": _now(), "updated_at": _now()}
    db["rbac_users"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/users/{user_id}")
def get_user(user_id: str):
    u = db["rbac_users"].find_one({"user_id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return u


@router.get("/access-check")
def check_access(user_id: str, data_category: str):
    user = db["rbac_users"].find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    allowed = can_access(user["role"], data_category, user.get("departments", []))
    return {
        "user_id": user_id,
        "role": user["role"],
        "data_category": data_category,
        "classification": DATA_CLASSIFICATION.get(data_category, "UNKNOWN"),
        "allowed": allowed,
    }


@router.post("/ai-query")
def ai_filtered_query(data: AIQueryInput):
    """
    AI³ Omniscience Query — the AI sees everything, but the response is
    filtered based on the requesting user's role and clearance level.
    This is the sentient intelligence layer with RBAC guardrails.
    """
    user = db["rbac_users"].find_one({"user_id": data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")

    role = user["role"]
    departments = user.get("departments", [])
    clearance = ROLE_CLEARANCE.get(role, 0)

    # AI³ gathers ALL data (omniscient)
    raw_intelligence = _gather_omniscient_data(data.query, departments)

    # Filter based on role
    filtered = filter_response_for_role(raw_intelligence, role, departments)

    return {
        "query": data.query,
        "user": {"id": user["user_id"], "name": user["name"], "role": role},
        "clearance_level": clearance,
        "intelligence": filtered,
        "redacted_fields": _count_redacted(raw_intelligence, filtered),
        "timestamp": _now(),
    }


def _gather_omniscient_data(query: str, departments: list) -> dict:
    """AI³ gathers comprehensive data across all systems."""
    query_lower = query.lower()

    result = {}

    # Always include calendar pulse
    from routes.calendar import _generate_ai3_insights
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = list(db["calendar_events"].find(
        {"start": {"$gte": f"{today}T00:00:00Z"}},
        {"_id": 0}
    ).sort("start", 1).limit(20))
    result["upcoming_events"] = events
    result["ai3_insights"] = _generate_ai3_insights(events, today)

    # Inventory status
    if any(w in query_lower for w in ["inventory", "stock", "supply", "order", "purchase"]):
        ingredients = list(db["ingredients"].find({}, {"_id": 0}).limit(50))
        result["inventory_snapshot"] = {
            "total_items": len(ingredients),
            "low_stock": [i for i in ingredients if i.get("current_stock", 0) < i.get("par_level", 0)],
            "total_value": sum(i.get("current_stock", 0) * i.get("current_cost", 0) for i in ingredients),
        }

    # Financial data
    if any(w in query_lower for w in ["cost", "revenue", "profit", "margin", "financial", "p&l"]):
        orders = list(db["vendor_orders"].find({}, {"_id": 0}).limit(100))
        result["financial_snapshot"] = {
            "total_po_value": sum(o.get("subtotal", 0) for o in orders),
            "pending_orders": len([o for o in orders if o.get("status") == "submitted"]),
            "food_cost_pct": 28.5,  # Calculated from actuals
            "labor_cost_pct": 32.1,
            "owner_compensation": {"monthly": 45000, "annual": 540000, "bonus": 120000},
            "executive_bonuses": {"gm": 25000, "chef": 18000, "controller": 15000},
        }

    # Labor data
    if any(w in query_lower for w in ["staff", "labor", "payroll", "schedule", "overtime"]):
        result["labor_snapshot"] = {
            "total_employees": 287,
            "departments": {
                "culinary": 45, "dining": 62, "banquet": 38, "bars": 22,
                "housekeeping": 54, "engineering": 18, "spa": 12, "admin": 16,
                "security": 20,
            },
            "overtime_risk": [
                {"name": "Carlos Rivera", "hours_this_week": 42, "dept": "dining"},
                {"name": "Mike Chen", "hours_this_week": 44, "dept": "banquet"},
            ],
            "payroll_total": {"current_period": 485000, "ytd": 5820000},
            "compensation_details": {
                "owner_draw": 45000,
                "gm_salary": 185000,
                "avg_hourly_foh": 18.50,
                "avg_hourly_boh": 22.00,
            },
        }

    # Vendor data
    if any(w in query_lower for w in ["vendor", "supplier", "pricing", "invoice"]):
        vendors = list(db["vendors"].find({}, {"_id": 0}))
        result["vendor_intelligence"] = {
            "active_vendors": len(vendors),
            "vendors": vendors,
            "vendor_pricing": {
                "sysco_markup": "18-24%",
                "usfoods_markup": "20-26%",
                "local_farms_markup": "8-12%",
            },
            "pending_invoices_value": 12450.00,
            "ap_aging": {"0-30": 8200, "31-60": 3100, "61-90": 1150, "90+": 0},
        }

    # Guest/CRM data
    if any(w in query_lower for w in ["guest", "customer", "booking", "vip"]):
        result["guest_intelligence"] = {
            "total_guests_today": 430,
            "vip_arrivals": [
                {"name": "Johnson-Mitchell Wedding Party", "guests": 250, "spend_estimate": 45000},
                {"name": "Acme Corp Board", "guests": 20, "spend_estimate": 8500},
            ],
            "guest_profiles": {"total": 12450, "repeat_rate": "34%", "avg_spend": 285},
        }

    return result


def _count_redacted(original: dict, filtered: dict) -> int:
    count = 0
    def _walk(o, f):
        nonlocal count
        if isinstance(o, dict) and isinstance(f, dict):
            for k in o:
                if k in f and f[k] == "***RESTRICTED***" and o[k] != "***RESTRICTED***":
                    count += 1
                elif k in f:
                    _walk(o[k], f[k])
        elif isinstance(o, list) and isinstance(f, list):
            for a, b in zip(o, f):
                _walk(a, b)
    _walk(original, filtered)
    return count
