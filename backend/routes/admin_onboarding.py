"""
Admin & Onboarding — Property management, outlet management, user access, GL code assignment.
Enterprise admin for large resort/casino operations (40-50+ outlets).
Multi-property mode is opt-in via Settings tab.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import uuid

router = APIRouter()

from database import db
# --- Settings ---

@router.get("/api/admin/settings")
def get_settings():
    """Get all admin settings including multi-property toggle."""
    settings = db["admin_settings"].find_one({"setting_id": "global"}, {"_id": 0})
    if not settings:
        settings = {
            "setting_id": "global",
            "multi_property_enabled": False,
            "default_property_id": None,
            "updated_at": _now(),
        }
        db["admin_settings"].insert_one(settings)
        settings.pop("_id", None)
    return settings


@router.put("/api/admin/settings")
def update_settings(data: dict):
    """Update admin settings. Supports multi_property_enabled, default_property_id."""
    allowed = {"multi_property_enabled", "default_property_id"}
    updates = {k: v for k, v in data.items() if k in allowed}
    updates["updated_at"] = _now()
    db["admin_settings"].update_one(
        {"setting_id": "global"},
        {"$set": updates},
        upsert=True,
    )
    return db["admin_settings"].find_one({"setting_id": "global"}, {"_id": 0})


# --- Properties (groups of outlets) ---

class PropertyCreate(BaseModel):
    name: str
    code: str = ""
    address: str = ""
    outlet_ids: list[str] = []

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    outlet_ids: Optional[list[str]] = None
    active: Optional[bool] = None


@router.get("/api/admin/properties")
def list_properties():
    """List all properties. Each property groups multiple outlets."""
    props = list(db["properties"].find({}, {"_id": 0}))
    # Enrich with outlet names
    all_outlets = {o["outlet_id"]: o["name"] for o in db["outlets"].find({}, {"_id": 0, "outlet_id": 1, "name": 1})}
    for p in props:
        p["outlet_names"] = [all_outlets.get(oid, oid) for oid in p.get("outlet_ids", [])]
        p["outlet_count"] = len(p.get("outlet_ids", []))
    return {"properties": props, "total": len(props)}


@router.post("/api/admin/properties")
def create_property(data: PropertyCreate):
    prop = {
        "property_id": f"prop-{_uid()}",
        "name": data.name,
        "code": data.code or data.name[:3].upper(),
        "address": data.address,
        "outlet_ids": data.outlet_ids,
        "active": True,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["properties"].insert_one(prop)
    del prop["_id"]
    return prop


@router.put("/api/admin/properties/{property_id}")
def update_property(property_id: str, data: PropertyUpdate):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    updates["updated_at"] = _now()
    result = db["properties"].update_one({"property_id": property_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return db["properties"].find_one({"property_id": property_id}, {"_id": 0})


@router.delete("/api/admin/properties/{property_id}")
def delete_property(property_id: str):
    result = db["properties"].delete_one({"property_id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"deleted": property_id}


@router.get("/api/admin/properties/{property_id}/summary")
def property_summary(property_id: str):
    """Cross-property executive summary for a single property."""
    prop = db["properties"].find_one({"property_id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    oids = prop.get("outlet_ids", [])
    outlets = list(db["outlets"].find({"outlet_id": {"$in": oids}}, {"_id": 0}))
    total_capacity = sum(o.get("capacity", 0) for o in outlets)
    active_outlets = sum(1 for o in outlets if o.get("active"))
    users = list(db["admin_users"].find(
        {"$or": [{"outlet_ids": {"$in": oids}}, {"outlet_ids": "all"}]},
        {"_id": 0}
    ))
    return {
        "property": prop,
        "outlets": outlets,
        "total_capacity": total_capacity,
        "active_outlets": active_outlets,
        "total_outlets": len(outlets),
        "staff_count": len(users),
        "users": users,
    }


@router.get("/api/admin/cross-property-dashboard")
def cross_property_dashboard():
    """Executive dashboard comparing all properties side-by-side."""
    settings = db["admin_settings"].find_one({"setting_id": "global"}, {"_id": 0}) or {}
    if not settings.get("multi_property_enabled"):
        return {"enabled": False, "message": "Multi-property mode not enabled. Enable in Admin > Settings."}

    props = list(db["properties"].find({"active": True}, {"_id": 0}))
    all_outlets = {o["outlet_id"]: o for o in db["outlets"].find({}, {"_id": 0})}
    all_users = list(db["admin_users"].find({}, {"_id": 0}))

    comparison = []
    for p in props:
        oids = p.get("outlet_ids", [])
        prop_outlets = [all_outlets.get(oid) for oid in oids if oid in all_outlets]
        prop_users = [u for u in all_users if any(oid in u.get("outlet_ids", []) for oid in oids) or "all" in u.get("outlet_ids", [])]
        comparison.append({
            "property_id": p["property_id"],
            "name": p["name"],
            "code": p["code"],
            "outlet_count": len(prop_outlets),
            "active_outlets": sum(1 for o in prop_outlets if o and o.get("active")),
            "total_capacity": sum(o.get("capacity", 0) for o in prop_outlets if o),
            "staff_count": len(prop_users),
            "outlet_types": list(set(o.get("type", "unknown") for o in prop_outlets if o)),
        })

    return {
        "enabled": True,
        "total_properties": len(props),
        "total_outlets": len(all_outlets),
        "total_staff": len(all_users),
        "properties": comparison,
    }


# --- Outlets ---

class OutletCreate(BaseModel):
    name: str
    type: str = "restaurant"
    gl_code: str = ""
    location: str = ""
    capacity: int = 0
    manager: str = ""
    modules: list[str] = []
    connected_systems: list[str] = []

class OutletUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    gl_code: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    manager: Optional[str] = None
    modules: Optional[list[str]] = None
    connected_systems: Optional[list[str]] = None
    active: Optional[bool] = None


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid.uuid4())[:12]


@router.get("/api/admin/outlets")
def list_outlets():
    outlets = list(db["outlets"].find({}, {"_id": 0}))
    if not outlets:
        _seed_outlets()
        outlets = list(db["outlets"].find({}, {"_id": 0}))
    return {"outlets": outlets, "total": len(outlets)}


@router.post("/api/admin/outlets")
def create_outlet(data: OutletCreate):
    outlet = {
        "outlet_id": f"out-{_uid()}",
        "name": data.name,
        "type": data.type,
        "gl_code": data.gl_code,
        "location": data.location,
        "capacity": data.capacity,
        "manager": data.manager,
        "modules": data.modules,
        "connected_systems": data.connected_systems,
        "active": True,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["outlets"].insert_one(outlet)
    del outlet["_id"]
    return outlet


@router.put("/api/admin/outlets/{outlet_id}")
def update_outlet(outlet_id: str, data: OutletUpdate):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    updates["updated_at"] = _now()
    result = db["outlets"].update_one({"outlet_id": outlet_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Outlet not found")
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    return outlet


@router.delete("/api/admin/outlets/{outlet_id}")
def delete_outlet(outlet_id: str):
    result = db["outlets"].delete_one({"outlet_id": outlet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Outlet not found")
    return {"deleted": outlet_id}


# --- User Access Management ---

AVAILABLE_MODULES = [
    "culinary", "pastry", "mixology_sommelier", "purchasing_receiving",
    "echo_events", "echo_aurum", "echo_stratus", "global_calendar",
    "ai3_intelligence", "supplier_catalog", "convention_management",
    "energy_tracking", "plate_costing", "labor_command", "safety_controls",
    "forecast_hub", "whiteboard", "chef_net",
]

# iter267 · Role → default-modules + default-panel for onboarding auto-setup.
# When a user is created, their role's bundle pre-fills `modules` and
# `default_panel` so they land in the right place on first login.
ROLE_PROVISIONING: dict[str, dict] = {
    "exec_chef": {
        "modules": ["culinary", "plate_costing", "purchasing_receiving",
                    "supplier_catalog", "labor_command", "ai3_intelligence",
                    "global_calendar", "chef_net"],
        "default_panel": "chronos",
        "sidebar_pins": ["chronos", "chef-outlet-dashboard", "culinary",
                          "purchasing", "supplier-catalog"],
    },
    "banquet_chef": {
        "modules": ["culinary", "echo_events", "plate_costing",
                    "purchasing_receiving", "supplier_catalog",
                    "global_calendar", "ai3_intelligence"],
        "default_panel": "maestrobqt",
        "sidebar_pins": ["maestrobqt", "beo-builder", "echo-events",
                          "culinary", "purchasing"],
    },
    "commissary_chef": {
        "modules": ["culinary", "purchasing_receiving", "supplier_catalog",
                    "plate_costing", "global_calendar"],
        "default_panel": "culinary",
        "sidebar_pins": ["culinary", "pastry", "purchasing",
                          "supplier-catalog"],
    },
    "sous_chef": {
        "modules": ["culinary", "plate_costing", "purchasing_receiving",
                    "ai3_intelligence", "global_calendar"],
        "default_panel": "culinary",
        "sidebar_pins": ["culinary", "kitchen-war-room", "plate-costing"],
    },
    "pastry_chef": {
        "modules": ["pastry", "culinary", "plate_costing",
                    "purchasing_receiving", "supplier_catalog"],
        "default_panel": "pastry",
        "sidebar_pins": ["pastry", "cake-viewer", "purchasing"],
    },
    "fnb_director": {
        "modules": AVAILABLE_MODULES,  # nearly everything
        "default_panel": "luccca-jarvis-dashboard",
        "sidebar_pins": ["luccca-jarvis-dashboard", "chronos", "echo-aurum",
                          "echo-events", "forecast-hub"],
    },
    "gm": {
        "modules": AVAILABLE_MODULES,
        "default_panel": "daily-standup",
        "sidebar_pins": ["daily-standup", "chronos", "echo-aurum",
                          "vip-admin-desktop", "forecast-hub"],
    },
    "beverage_director": {
        "modules": ["mixology_sommelier", "purchasing_receiving",
                    "supplier_catalog", "ai3_intelligence", "global_calendar"],
        "default_panel": "beverage-operations",
        "sidebar_pins": ["beverage-operations", "mixology-sommelier",
                          "purchasing", "supplier-catalog"],
    },
    "purchasing": {
        "modules": ["purchasing_receiving", "supplier_catalog",
                    "ai3_intelligence", "global_calendar"],
        "default_panel": "purchasing",
        "sidebar_pins": ["purchasing", "supplier-catalog", "invoices",
                          "receiving"],
    },
    "concierge": {
        "modules": ["ai3_intelligence", "global_calendar"],
        "default_panel": "echo-concierge",
        "sidebar_pins": ["echo-concierge", "guest360-hub",
                          "vip-admin-desktop", "foh-concierge-hub"],
    },
    "front_desk": {
        "modules": ["global_calendar", "ai3_intelligence"],
        "default_panel": "pms",
        "sidebar_pins": ["pms", "guest360-hub", "echo-concierge"],
    },
    "finance": {
        "modules": ["echo_aurum", "ai3_intelligence", "global_calendar",
                    "forecast_hub", "plate_costing"],
        "default_panel": "echo-aurum",
        "sidebar_pins": ["echo-aurum", "enterprise-bi-suite",
                          "forecast-hub", "plate-costing"],
    },
    "events_manager": {
        "modules": ["echo_events", "convention_management",
                    "global_calendar", "ai3_intelligence"],
        "default_panel": "echo-events",
        "sidebar_pins": ["echo-events", "beo-builder",
                          "convention-management"],
    },
    "admin": {
        "modules": AVAILABLE_MODULES,
        "default_panel": "admin-console",
        "sidebar_pins": ["admin-console", "audit-security", "feature-flags",
                          "it-operations"],
    },
    "staff": {
        "modules": ["global_calendar"],
        "default_panel": "my-schedule",
        "sidebar_pins": ["my-schedule"],
    },
}


def _provision_for_role(role: str) -> dict:
    """Resolve role → modules + default_panel + sidebar_pins bundle.
    Unknown roles fall back to 'staff' (least-privilege)."""
    key = (role or "staff").lower().strip()
    return ROLE_PROVISIONING.get(key, ROLE_PROVISIONING["staff"])


class UserAccessCreate(BaseModel):
    name: str
    email: str
    role: str = "staff"
    department: str = ""
    outlet_ids: list[str] = []
    modules: list[str] = []
    is_admin: bool = False

class UserAccessUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    outlet_ids: Optional[list[str]] = None
    modules: Optional[list[str]] = None
    is_admin: Optional[bool] = None
    active: Optional[bool] = None


@router.get("/api/admin/users")
def list_admin_users():
    # iter266 · Always run upsert seed so renames / additions propagate
    # without manual DB intervention.
    _seed_admin_users()
    users = list(db["admin_users"].find({}, {"_id": 0}))
    return {"users": users, "total": len(users)}


@router.post("/api/admin/users")
def create_admin_user(data: UserAccessCreate):
    existing = db["admin_users"].find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    # iter267 · Onboarding auto-setup — apply role's default bundle when the
    # caller didn't override `modules`. Always attach default_panel +
    # sidebar_pins so the user lands in the right place on first login.
    bundle = _provision_for_role(data.role)
    resolved_modules = (
        data.modules if data.modules
        else (AVAILABLE_MODULES if data.is_admin else bundle["modules"])
    )
    user = {
        "user_id": f"usr-{_uid()}",
        "name": data.name,
        "email": data.email,
        "role": data.role,
        "department": data.department,
        "outlet_ids": data.outlet_ids,
        "modules": resolved_modules,
        "default_panel": bundle["default_panel"],
        "sidebar_pins": bundle["sidebar_pins"],
        "is_admin": data.is_admin,
        "active": True,
        "auto_provisioned": not bool(data.modules),
        "created_at": _now(),
        "last_login": None,
    }
    db["admin_users"].insert_one(user)
    del user["_id"]
    return user


@router.get("/api/admin/role-provisioning")
def get_role_provisioning():
    """iter267 · Expose the role→modules+panel+sidebar map so the frontend can
    show admins what gets auto-provisioned, and let the user-creation UI
    preview the bundle before submit."""
    return {
        "roles": [
            {"role": k, **v} for k, v in ROLE_PROVISIONING.items()
        ],
        "available_modules": AVAILABLE_MODULES,
    }


class RoleApplyRequest(BaseModel):
    role: Optional[str] = None  # if None, re-apply user's current role


@router.post("/api/admin/users/{user_id}/apply-role-defaults")
def apply_role_defaults(user_id: str, data: RoleApplyRequest):
    """iter267 · Re-provision a user with their role's default bundle.
    Useful when role mappings evolve or an account drifted."""
    user = db["admin_users"].find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = data.role or user.get("role", "staff")
    bundle = _provision_for_role(role)
    updates = {
        "role": role,
        "modules": bundle["modules"] if not user.get("is_admin") else AVAILABLE_MODULES,
        "default_panel": bundle["default_panel"],
        "sidebar_pins": bundle["sidebar_pins"],
        "auto_provisioned": True,
        "updated_at": _now(),
    }
    db["admin_users"].update_one({"user_id": user_id}, {"$set": updates})
    return db["admin_users"].find_one({"user_id": user_id}, {"_id": 0})


@router.get("/api/admin/users/{user_id}/onboarding-bundle")
def get_user_onboarding_bundle(user_id: str):
    """iter267 · Return the resolved onboarding bundle for a user — used by
    the shell on first login to auto-open the right panel and pre-pin the
    sidebar items."""
    user = db["admin_users"].find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    bundle = _provision_for_role(user.get("role", "staff"))
    return {
        "user_id": user_id,
        "role": user.get("role"),
        "modules": user.get("modules") or bundle["modules"],
        "default_panel": user.get("default_panel") or bundle["default_panel"],
        "sidebar_pins": user.get("sidebar_pins") or bundle["sidebar_pins"],
        "auto_provisioned": user.get("auto_provisioned", False),
    }


@router.put("/api/admin/users/{user_id}")
def update_admin_user(user_id: str, data: UserAccessUpdate):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    updates["updated_at"] = _now()
    result = db["admin_users"].update_one({"user_id": user_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = db["admin_users"].find_one({"user_id": user_id}, {"_id": 0})
    return user


@router.delete("/api/admin/users/{user_id}")
def delete_admin_user(user_id: str):
    result = db["admin_users"].delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"deleted": user_id}


@router.get("/api/admin/modules")
def list_available_modules():
    return {"modules": AVAILABLE_MODULES}


# --- GL Codes ---

class GLCodeAssignment(BaseModel):
    outlet_id: str
    gl_code: str
    description: str = ""
    account_type: str = "expense"

@router.get("/api/admin/gl-codes")
def list_gl_codes():
    codes = list(db["gl_codes"].find({}, {"_id": 0}))
    if not codes:
        _seed_gl_codes()
        codes = list(db["gl_codes"].find({}, {"_id": 0}))
    return {"gl_codes": codes, "total": len(codes)}


@router.post("/api/admin/gl-codes")
def assign_gl_code(data: GLCodeAssignment):
    code = {
        "id": f"gl-{_uid()}",
        "outlet_id": data.outlet_id,
        "gl_code": data.gl_code,
        "description": data.description,
        "account_type": data.account_type,
        "created_at": _now(),
    }
    db["gl_codes"].insert_one(code)
    del code["_id"]
    return code


# --- Seed Functions ---

def _seed_outlets():
    outlets = [
        {"outlet_id": "out-main-kitchen", "name": "Main Kitchen", "type": "kitchen", "gl_code": "5100-001", "location": "Level 1, Building A", "capacity": 200, "manager": "Maria Santos", "modules": ["culinary", "purchasing_receiving", "safety_controls"], "connected_systems": ["echo_aurum", "echo_stratus"], "active": True, "created_at": _now(), "updated_at": _now()},
        {"outlet_id": "out-pastry-shop", "name": "Pastry Shop", "type": "kitchen", "gl_code": "5100-002", "location": "Level 1, Building A", "capacity": 50, "manager": "Chef Marie Laurent", "modules": ["pastry", "purchasing_receiving"], "connected_systems": ["echo_aurum"], "active": True, "created_at": _now(), "updated_at": _now()},
        {"outlet_id": "out-pier66-rest", "name": "Marina Grill", "type": "restaurant", "gl_code": "4100-001", "location": "Pier Level, Building B", "capacity": 180, "manager": "Carlos Rivera", "modules": ["culinary", "mixology_sommelier", "echo_events"], "connected_systems": ["echo_aurum", "echo_stratus"], "active": True, "created_at": _now(), "updated_at": _now()},
        {"outlet_id": "out-rooftop-bar", "name": "Rooftop Bar & Lounge", "type": "bar", "gl_code": "4100-002", "location": "Level 12, Building B", "capacity": 120, "manager": "Jake Morrison", "modules": ["mixology_sommelier"], "connected_systems": ["echo_aurum"], "active": True, "created_at": _now(), "updated_at": _now()},
        {"outlet_id": "out-banquet-hall", "name": "Grand Banquet Hall", "type": "banquet", "gl_code": "4200-001", "location": "Level 2, Convention Center", "capacity": 500, "manager": "Michelle Mayor", "modules": ["culinary", "pastry", "echo_events", "convention_management"], "connected_systems": ["echo_aurum", "echo_stratus"], "active": True, "created_at": _now(), "updated_at": _now()},
        {"outlet_id": "out-pool-bar", "name": "Pool Bar & Grill", "type": "bar", "gl_code": "4100-003", "location": "Pool Deck, Building C", "capacity": 80, "manager": "Sarah Mitchell", "modules": ["mixology_sommelier", "culinary"], "connected_systems": ["echo_aurum"], "active": True, "created_at": _now(), "updated_at": _now()},
    ]
    db["outlets"].insert_many(outlets)


def _seed_admin_users():
    """iter266 · Idempotent — runs once when admin_users collection is empty,
    AND ALSO refreshes display-name / role / department on each /api/admin/users
    call via _ensure_admin_users_synced(). Mirrors the auth.py role_profiles
    list so the Onboarding panel matches the avatar Switch-Profile dropdown."""
    users = [
        # Owner — William J. Morrison
        {"user_id": "usr-owner-001", "name": "William J. Morrison", "email": "owner@EchoAurion.com", "role": "owner", "department": "Executive", "outlet_ids": ["all"], "modules": AVAILABLE_MODULES, "is_admin": True, "active": True, "title": "Owner · Pier Sixty-Six", "created_at": _now(), "last_login": _now()},
        # Admin
        {"user_id": "usr-admin-001", "name": "Admin", "email": "admin@luccca.com", "role": "admin", "department": "IT", "outlet_ids": ["all"], "modules": AVAILABLE_MODULES, "is_admin": True, "active": True, "title": "Administrator", "created_at": _now(), "last_login": _now()},
        # Executive Committee
        {"user_id": "usr-regional-001", "name": "Robert Sinclair", "email": "regional@luccca.com", "role": "regional-director", "department": "Executive", "outlet_ids": ["all"], "modules": AVAILABLE_MODULES, "is_admin": True, "active": True, "title": "Regional Director · Multi-Property", "created_at": _now(), "last_login": None},
        {"user_id": "usr-director-001", "name": "William Reyes", "email": "director@luccca.com", "role": "director", "department": "Executive", "outlet_ids": ["all"], "modules": AVAILABLE_MODULES, "is_admin": False, "active": True, "title": "Director · F&B and Retail", "created_at": _now(), "last_login": None},
        {"user_id": "usr-execfin-001", "name": "Alexandra Marchetti", "email": "execfin@luccca.com", "role": "exec-dir-finance", "department": "Finance", "outlet_ids": ["all"], "modules": AVAILABLE_MODULES, "is_admin": False, "active": True, "title": "Executive Director of Finance", "created_at": _now(), "last_login": None},
        {"user_id": "usr-gm-001", "name": "Sarah Mitchell", "email": "smitchell@luccca.com", "role": "gm", "department": "Operations", "outlet_ids": ["all"], "modules": AVAILABLE_MODULES, "is_admin": True, "active": True, "title": "General Manager", "created_at": _now(), "last_login": _now()},
        {"user_id": "usr-fbdir-001", "name": "Priya Patel", "email": "fbdir@luccca.com", "role": "fb-director", "department": "Executive", "outlet_ids": ["all"], "modules": AVAILABLE_MODULES, "is_admin": False, "active": True, "title": "F&B Director", "created_at": _now(), "last_login": None},
        # Culinary
        {"user_id": "usr-chef-001", "name": "Maria Santos", "email": "msantos@luccca.com", "role": "exec_chef", "department": "Culinary", "outlet_ids": ["out-main-kitchen", "out-pier66-rest"], "modules": ["culinary", "purchasing_receiving", "safety_controls", "plate_costing", "supplier_catalog", "ai3_intelligence"], "is_admin": False, "active": True, "title": "Executive Chef", "created_at": _now(), "last_login": None},
        {"user_id": "usr-execchefbqts-001", "name": "Giovanni Genao", "email": "Gio@EchoAurion.com", "role": "exec-chef-banquets", "department": "Banquets", "outlet_ids": ["out-banquet-hall"], "modules": ["culinary", "echo_events", "convention_management", "purchasing_receiving", "plate_costing", "supplier_catalog"], "is_admin": False, "active": True, "title": "Executive Chef of Banquets & Catering", "created_at": _now(), "last_login": None},
        {"user_id": "usr-souschef-001", "name": "Carlos Mendes", "email": "souschef@luccca.com", "role": "sous-chef", "department": "Culinary", "outlet_ids": ["out-main-kitchen"], "modules": ["culinary", "purchasing_receiving"], "is_admin": False, "active": True, "title": "Sous Chef", "created_at": _now(), "last_login": None},
        {"user_id": "usr-cdc-001", "name": "Mateo Rinaldi", "email": "cdc@luccca.com", "role": "chef-de-cuisine", "department": "Culinary", "outlet_ids": ["out-pier66-rest"], "modules": ["culinary", "purchasing_receiving", "plate_costing"], "is_admin": False, "active": True, "title": "Chef de Cuisine", "created_at": _now(), "last_login": None},
        {"user_id": "usr-pastry-001", "name": "Carissa DeSilva", "email": "pastrychef@EchoAurion.com", "role": "pastry-chef", "department": "Pastry", "outlet_ids": ["out-pastry-shop", "out-banquet-hall"], "modules": ["pastry", "purchasing_receiving", "plate_costing"], "is_admin": False, "active": True, "title": "Executive Pastry Chef", "created_at": _now(), "last_login": None},
        # Beverage / FOH
        {"user_id": "usr-bar-001", "name": "Jake Morrison", "email": "jmorrison@luccca.com", "role": "bar_manager", "department": "Beverage", "outlet_ids": ["out-rooftop-bar", "out-pool-bar"], "modules": ["mixology_sommelier", "purchasing_receiving"], "is_admin": False, "active": True, "title": "Bar Manager", "created_at": _now(), "last_login": None},
        {"user_id": "usr-dining-001", "name": "James Chen", "email": "dining@luccca.com", "role": "dining-room-manager", "department": "FOH", "outlet_ids": ["out-pier66-rest"], "modules": ["pos", "echo_events"], "is_admin": False, "active": True, "title": "Dining Room Manager", "created_at": _now(), "last_login": None},
        # Events
        {"user_id": "usr-events-001", "name": "Michelle Mayor", "email": "mmayor@luccca.com", "role": "events_director", "department": "Events", "outlet_ids": ["out-banquet-hall", "out-pier66-rest"], "modules": ["echo_events", "convention_management", "global_calendar", "culinary", "pastry"], "is_admin": False, "active": True, "title": "Events Director", "created_at": _now(), "last_login": None},
        {"user_id": "usr-events-002", "name": "Yuki Tanaka", "email": "events@luccca.com", "role": "events-manager", "department": "Events", "outlet_ids": ["out-banquet-hall"], "modules": ["echo_events", "convention_management", "global_calendar"], "is_admin": False, "active": True, "title": "Events Manager", "created_at": _now(), "last_login": None},
        {"user_id": "usr-bqtsales-001", "name": "Camille Beaumont", "email": "bqtsales@luccca.com", "role": "bqt-sales-marketing", "department": "Sales & Marketing", "outlet_ids": ["out-banquet-hall"], "modules": ["echo_events", "convention_management"], "is_admin": False, "active": True, "title": "Banquet Sales & Marketing", "created_at": _now(), "last_login": None},
        {"user_id": "usr-sales-001", "name": "Damien Cross", "email": "sales@luccca.com", "role": "sales", "department": "Sales & Marketing", "outlet_ids": ["all"], "modules": ["echo_events", "convention_management"], "is_admin": False, "active": True, "title": "Sales Manager", "created_at": _now(), "last_login": None},
        # Finance
        {"user_id": "usr-acct-001", "name": "David Chen", "email": "dchen@luccca.com", "role": "controller", "department": "Finance", "outlet_ids": ["all"], "modules": ["echo_aurum", "purchasing_receiving", "supplier_catalog", "energy_tracking", "forecast_hub"], "is_admin": False, "active": True, "title": "Controller", "created_at": _now(), "last_login": None},
        {"user_id": "usr-controller-001", "name": "Andre Dupont", "email": "controller@luccca.com", "role": "controller", "department": "Finance", "outlet_ids": ["all"], "modules": ["echo_aurum", "supplier_catalog", "forecast_hub"], "is_admin": False, "active": True, "title": "Controller", "created_at": _now(), "last_login": None},
        {"user_id": "usr-purchasing-001", "name": "Amara Okafor", "email": "purchasing@luccca.com", "role": "purchasing-manager", "department": "Finance", "outlet_ids": ["all"], "modules": ["purchasing_receiving", "supplier_catalog", "vendor_mobile"], "is_admin": False, "active": True, "title": "Purchasing Manager", "created_at": _now(), "last_login": None},
        {"user_id": "usr-accounting-001", "name": "Helena Ashford", "email": "accounting@luccca.com", "role": "accounting", "department": "Finance", "outlet_ids": ["all"], "modules": ["echo_aurum", "supplier_catalog"], "is_admin": False, "active": True, "title": "Accounting Department", "created_at": _now(), "last_login": None},
        # Hotel Operations
        {"user_id": "usr-ird-001", "name": "Naomi Khoury", "email": "ird@luccca.com", "role": "ird-manager", "department": "Hotel Operations", "outlet_ids": ["all"], "modules": ["pms", "echo_events"], "is_admin": False, "active": True, "title": "IRD Manager", "created_at": _now(), "last_login": None},
        {"user_id": "usr-spadir-001", "name": "Sienna Bellamy", "email": "spadir@luccca.com", "role": "spa-director", "department": "Spa", "outlet_ids": ["out-spa"], "modules": ["spa", "pms"], "is_admin": False, "active": True, "title": "Spa Director", "created_at": _now(), "last_login": None},
        {"user_id": "usr-spa-001", "name": "Elena Volkov", "email": "spa@luccca.com", "role": "spa-manager", "department": "Spa", "outlet_ids": ["out-spa"], "modules": ["spa"], "is_admin": False, "active": True, "title": "Spa Manager", "created_at": _now(), "last_login": None},
        {"user_id": "usr-eng-001", "name": "Liam O'Brien", "email": "eng@luccca.com", "role": "dir-engineering", "department": "Engineering", "outlet_ids": ["all"], "modules": ["energy_tracking", "safety_controls"], "is_admin": False, "active": True, "title": "Director of Engineering", "created_at": _now(), "last_login": None},
        # Operations / Creative
        {"user_id": "usr-opsctrl-001", "name": "Nikolas Petrov", "email": "opscontrol@luccca.com", "role": "operation-controller", "department": "Operations", "outlet_ids": ["all"], "modules": ["pos", "echo_aurum", "forecast_hub"], "is_admin": False, "active": True, "title": "Operation Controller", "created_at": _now(), "last_login": None},
        {"user_id": "usr-artmedia-001", "name": "Aurelia Voss", "email": "artmedia@luccca.com", "role": "senior-art-media-director", "department": "Creative", "outlet_ids": ["all"], "modules": ["echo_events", "convention_management"], "is_admin": False, "active": True, "title": "Senior Art & Media Director", "created_at": _now(), "last_login": None},
        # Staff
        {"user_id": "usr-staff-001", "name": "Sofia Ramirez", "email": "staff@luccca.com", "role": "staff", "department": "FOH", "outlet_ids": ["out-pier66-rest"], "modules": ["pos"], "is_admin": False, "active": True, "title": "Server", "created_at": _now(), "last_login": None},
    ]
    for u in users:
        db["admin_users"].update_one(
            {"email": u["email"]},
            {"$set": u},
            upsert=True,
        )
    # iter266 · Purge legacy James Wellington III seed (replaced by William J. Morrison)
    db["admin_users"].delete_many({"name": "James Wellington III"})
    db["admin_users"].delete_many({"email": "jwellington@luccca.com"})


def _seed_gl_codes():
    codes = [
        {"id": "gl-001", "outlet_id": "out-main-kitchen", "gl_code": "5100-001", "description": "Main Kitchen - Food Cost", "account_type": "expense", "created_at": _now()},
        {"id": "gl-002", "outlet_id": "out-pastry-shop", "gl_code": "5100-002", "description": "Pastry Shop - Food Cost", "account_type": "expense", "created_at": _now()},
        {"id": "gl-003", "outlet_id": "out-pier66-rest", "gl_code": "4100-001", "description": "Marina Grill - Revenue", "account_type": "revenue", "created_at": _now()},
        {"id": "gl-004", "outlet_id": "out-rooftop-bar", "gl_code": "4100-002", "description": "Rooftop Bar - Revenue", "account_type": "revenue", "created_at": _now()},
        {"id": "gl-005", "outlet_id": "out-banquet-hall", "gl_code": "4200-001", "description": "Banquet Hall - Revenue", "account_type": "revenue", "created_at": _now()},
        {"id": "gl-006", "outlet_id": "out-pool-bar", "gl_code": "4100-003", "description": "Pool Bar - Revenue", "account_type": "revenue", "created_at": _now()},
        {"id": "gl-007", "outlet_id": "out-main-kitchen", "gl_code": "5200-001", "description": "Main Kitchen - Labor", "account_type": "expense", "created_at": _now()},
        {"id": "gl-008", "outlet_id": "out-pier66-rest", "gl_code": "5200-003", "description": "Marina Grill - Labor", "account_type": "expense", "created_at": _now()},
    ]
    db["gl_codes"].insert_many(codes)
