"""
Customer Onboarding Wizard — Fast Property Setup
===================================================
Ingest vendors, employees, GL codes, menus via CSV/JSON drag-drop.
Within hours, a new property is fully configured.
"""
import csv
import io
import json
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional, List, Dict

from database import db

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


class OnboardingSession(BaseModel):
    property_name: str
    property_code: str = ""
    contact_name: str = ""
    contact_email: str = ""


# ── Onboarding Session ──

@router.post("/start")
async def start_onboarding(session: OnboardingSession):
    """Start a new customer onboarding session."""
    doc = {
        "session_id": f"onb-{_uid()}",
        "property_name": session.property_name,
        "property_code": session.property_code or session.property_name[:3].upper(),
        "contact_name": session.contact_name,
        "contact_email": session.contact_email,
        "status": "in_progress",
        "steps_completed": [],
        "steps": {
            "property": False, "outlets": False, "vendors": False,
            "employees": False, "gl_codes": False, "menus": False,
            "intercompany": False,
        },
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["onboarding_sessions"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get onboarding session status."""
    session = db["onboarding_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return {"error": "Session not found"}
    return session


# ── Vendor Import ──

@router.post("/import/vendors")
async def import_vendors(file: UploadFile = File(...), session_id: str = Form("")):
    """Import vendors from CSV. Expected columns: name, category, account_number, contact_name, contact_email, phone, payment_terms, address."""
    content = await file.read()
    text = content.decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(text))
    imported = []
    errors = []

    for i, row in enumerate(reader):
        try:
            name = row.get("name", "").strip() or row.get("vendor_name", "").strip()
            if not name:
                errors.append({"row": i + 2, "error": "Missing vendor name"})
                continue

            vendor = {
                "vendor_id": f"v-{_uid()}",
                "name": name,
                "category": row.get("category", "").strip() or "general",
                "account_number": row.get("account_number", "").strip() or row.get("account", "").strip(),
                "contact_name": row.get("contact_name", "").strip() or row.get("contact", "").strip(),
                "contact_email": row.get("contact_email", "").strip() or row.get("email", "").strip(),
                "phone": row.get("phone", "").strip(),
                "payment_terms": row.get("payment_terms", "").strip() or row.get("terms", "NET 30"),
                "address": row.get("address", "").strip(),
                "active": True,
                "imported_at": _now(),
                "source": "onboarding_import",
            }
            db["vendor_directory"].update_one({"name": name}, {"$set": vendor}, upsert=True)
            imported.append(vendor)
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    if session_id:
        db["onboarding_sessions"].update_one(
            {"session_id": session_id},
            {"$set": {"steps.vendors": True, "updated_at": _now()}, "$addToSet": {"steps_completed": "vendors"}},
        )

    return {"imported": len(imported), "errors": len(errors), "error_details": errors[:10], "vendors": imported[:5]}


# ── Employee Import ──

@router.post("/import/employees")
async def import_employees(file: UploadFile = File(...), session_id: str = Form("")):
    """Import employees from CSV. Expected columns: name, email, role, department, outlet, hourly_rate."""
    content = await file.read()
    text = content.decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(text))
    imported = []
    errors = []

    for i, row in enumerate(reader):
        try:
            name = row.get("name", "").strip() or row.get("employee_name", "").strip()
            if not name:
                errors.append({"row": i + 2, "error": "Missing employee name"})
                continue

            emp = {
                "employee_id": f"emp-{_uid()}",
                "name": name,
                "email": row.get("email", "").strip(),
                "role": row.get("role", "").strip() or "staff",
                "department": row.get("department", "").strip(),
                "outlet_id": row.get("outlet", "").strip() or row.get("outlet_id", "").strip(),
                "hourly_rate": float(row.get("hourly_rate", 0) or row.get("rate", 0) or 0),
                "employment_type": row.get("type", "hourly").strip(),
                "active": True,
                "imported_at": _now(),
                "source": "onboarding_import",
            }
            db["employees"].update_one({"name": name, "email": emp["email"]}, {"$set": emp}, upsert=True)
            imported.append(emp)
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    if session_id:
        db["onboarding_sessions"].update_one(
            {"session_id": session_id},
            {"$set": {"steps.employees": True, "updated_at": _now()}, "$addToSet": {"steps_completed": "employees"}},
        )

    return {"imported": len(imported), "errors": len(errors), "error_details": errors[:10], "employees": imported[:5]}


# ── GL Code Import ──

@router.post("/import/gl-codes")
async def import_gl_codes(file: UploadFile = File(...), session_id: str = Form("")):
    """Import chart of accounts from CSV. Expected columns: gl_code, description, account_type, department."""
    content = await file.read()
    text = content.decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(text))
    imported = []
    errors = []

    for i, row in enumerate(reader):
        try:
            code = row.get("gl_code", "").strip() or row.get("code", "").strip() or row.get("account", "").strip()
            if not code:
                errors.append({"row": i + 2, "error": "Missing GL code"})
                continue

            gl = {
                "gl_id": f"gl-{_uid()}",
                "gl_code": code,
                "description": row.get("description", "").strip() or row.get("name", "").strip(),
                "account_type": row.get("account_type", "").strip() or row.get("type", "expense"),
                "department": row.get("department", "").strip(),
                "active": True,
                "imported_at": _now(),
                "source": "onboarding_import",
            }
            db["chart_of_accounts"].update_one({"gl_code": code}, {"$set": gl}, upsert=True)
            imported.append(gl)
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    if session_id:
        db["onboarding_sessions"].update_one(
            {"session_id": session_id},
            {"$set": {"steps.gl_codes": True, "updated_at": _now()}, "$addToSet": {"steps_completed": "gl_codes"}},
        )

    return {"imported": len(imported), "errors": len(errors), "error_details": errors[:10], "gl_codes": imported[:5]}


# ── Menu Import ──

@router.post("/import/menu")
async def import_menu(file: UploadFile = File(...), session_id: str = Form(""), outlet_id: str = Form("")):
    """Import menu items from CSV. Expected columns: name, category, price, food_cost, description."""
    content = await file.read()
    text = content.decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(text))
    imported = []
    errors = []

    for i, row in enumerate(reader):
        try:
            name = row.get("name", "").strip() or row.get("item_name", "").strip()
            if not name:
                errors.append({"row": i + 2, "error": "Missing item name"})
                continue

            price = float(row.get("price", 0) or row.get("sell_price", 0) or 0)
            food_cost = float(row.get("food_cost", 0) or row.get("cost", 0) or 0)

            item = {
                "item_id": f"menu-{_uid()}",
                "name": name,
                "category": row.get("category", "").strip() or "entree",
                "price": price,
                "food_cost": food_cost,
                "food_cost_pct": round(food_cost / price * 100, 1) if price > 0 else 0,
                "description": row.get("description", "").strip(),
                "outlet_id": outlet_id,
                "active": True,
                "imported_at": _now(),
                "source": "onboarding_import",
            }
            db["menu_items"].update_one({"name": name, "outlet_id": outlet_id}, {"$set": item}, upsert=True)
            imported.append(item)
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    if session_id:
        db["onboarding_sessions"].update_one(
            {"session_id": session_id},
            {"$set": {"steps.menus": True, "updated_at": _now()}, "$addToSet": {"steps_completed": "menus"}},
        )

    return {"imported": len(imported), "errors": len(errors), "error_details": errors[:10], "items": imported[:5]}


# ── Inter-Company / Multi-Property Setup ──
# When the property declares it's part of a multi-property entity, this
# walkthrough captures the parent entity + the consolidation member list
# + per-pair elimination rules. Writes to the same collections used by
# the standalone /api/intercompany endpoints so post-onboarding edits go
# through the same surface.

class IntercompanyDeclaration(BaseModel):
    session_id: str = ""
    is_multi_property: bool
    parent_entity_id: str = ""
    parent_entity_display_name: str = ""
    consolidates: List[str] = []
    fiscal_year_end_month: int = 12


class IntercompanyEliminationDeclaration(BaseModel):
    session_id: str = ""
    parent_entity_id: str
    rules: List[Dict] = []   # Each: {description, selling_property, buying_property,
                             #        gl_account_seller, gl_account_buyer, granularity}


@router.post("/import/intercompany-entity")
async def declare_intercompany_entity(decl: IntercompanyDeclaration):
    """During onboarding: declare whether the property is part of a
    multi-property consolidating entity. If yes, registers the parent
    entity and member properties. Editable later via /api/intercompany."""
    if not decl.is_multi_property:
        # Standalone property — record the choice and move on
        if decl.session_id:
            db["onboarding_sessions"].update_one(
                {"session_id": decl.session_id},
                {"$set": {"steps.intercompany": True, "intercompany_declared": "standalone", "updated_at": _now()},
                 "$addToSet": {"steps_completed": "intercompany"}},
            )
        return {"is_multi_property": False, "next_step": "Skip — no consolidation needed"}

    if not decl.parent_entity_id or not decl.consolidates:
        return {
            "error": "Multi-property declaration requires parent_entity_id and consolidates list",
            "example": {
                "is_multi_property": True,
                "parent_entity_id": "aurion_holdings_inc",
                "parent_entity_display_name": "Aurion Holdings, Inc.",
                "consolidates": ["pier_sixty_six", "naples", "aspen"],
                "fiscal_year_end_month": 12,
            },
        }

    if len(decl.consolidates) < 2:
        return {"error": "Multi-property entity must consolidate at least 2 properties"}

    record = {
        "entity_id": decl.parent_entity_id,
        "display_name": decl.parent_entity_display_name or decl.parent_entity_id,
        "consolidates": decl.consolidates,
        "fiscal_year_end_month": decl.fiscal_year_end_month,
        "created_at": _now(),
        "updated_at": _now(),
        "source": "onboarding_wizard",
    }
    db["intercompany_entities"].update_one(
        {"entity_id": decl.parent_entity_id}, {"$set": record}, upsert=True,
    )

    if decl.session_id:
        db["onboarding_sessions"].update_one(
            {"session_id": decl.session_id},
            {"$set": {
                "steps.intercompany": True,
                "intercompany_declared": "multi_property",
                "intercompany_entity_id": decl.parent_entity_id,
                "updated_at": _now(),
            },
             "$addToSet": {"steps_completed": "intercompany"}},
        )

    return {
        "is_multi_property": True,
        "entity": record,
        "next_step": (
            "POST /import/intercompany-rules with the elimination rules between member properties. "
            "Or POST /api/intercompany/rules later — both write to the same collection."
        ),
    }


@router.post("/import/intercompany-rules")
async def declare_intercompany_rules(decl: IntercompanyEliminationDeclaration):
    """During onboarding: bulk-create elimination rules between member
    properties. Each rule: {description, selling_property, buying_property,
    gl_account_seller, gl_account_buyer, granularity?}.
    Granularity defaults to 'trial_balance'."""
    entity = db["intercompany_entities"].find_one({"entity_id": decl.parent_entity_id}, {"_id": 0})
    if not entity:
        return {"error": f"Entity {decl.parent_entity_id} not found. Declare the entity first."}

    created = []
    errors = []
    for i, raw in enumerate(decl.rules):
        try:
            for required in ("description", "selling_property", "buying_property", "gl_account_seller", "gl_account_buyer"):
                if not raw.get(required):
                    raise ValueError(f"Missing required field: {required}")
            for prop in (raw["selling_property"], raw["buying_property"]):
                if prop not in entity["consolidates"]:
                    raise ValueError(f"Property {prop} not in entity's consolidates list")
            rule_record = {
                "rule_id": f"icr-{_uid()}",
                "entity_id": decl.parent_entity_id,
                "description": raw["description"],
                "selling_property": raw["selling_property"],
                "buying_property": raw["buying_property"],
                "gl_account_seller": raw["gl_account_seller"],
                "gl_account_buyer": raw["gl_account_buyer"],
                "granularity": raw.get("granularity", "trial_balance"),
                "match_field": raw.get("match_field"),
                "active": True,
                "created_at": _now(),
                "updated_at": _now(),
                "source": "onboarding_wizard",
            }
            db["intercompany_rules"].insert_one(rule_record.copy())
            rule_record.pop("_id", None)
            created.append(rule_record)
        except Exception as e:
            errors.append({"index": i, "error": str(e)})

    if decl.session_id:
        db["onboarding_sessions"].update_one(
            {"session_id": decl.session_id},
            {"$set": {"intercompany_rules_count": len(created), "updated_at": _now()}},
        )

    return {
        "entity_id": decl.parent_entity_id,
        "rules_created": len(created),
        "errors": errors,
        "rules": created,
        "next_step": "Edit anytime via PATCH/DELETE on /api/intercompany/rules/{rule_id}",
    }


# ── Outlet Import ──
# Each imported outlet is auto-registered in the capture-tracking
# system with cold-start defaults so it appears in dashboards
# immediately. As actuals arrive, weights diverge from defaults
# toward property-specific reality (see backend/echo/outlet_capture_learner.py).

@router.post("/import/outlets")
async def import_outlets(file: UploadFile = File(...), session_id: str = Form(""), property_id: str = Form("")):
    """Import outlets from CSV. Expected columns:
    outlet_id, name, outlet_type, seats, turns_per_service, open, close,
    dayparts, days_open, min_age, requires_reservation, room_classes,
    ticketed_event.

    `dayparts` is pipe-separated (e.g. "breakfast|lunch|dinner").
    `days_open` is pipe-separated (e.g. "mon|tue|wed|thu|fri|sat|sun"); defaults to all 7.
    `room_classes` is pipe-separated (e.g. "all" or "suite_only|club_only").
    """
    from routes.outlet_capture import _seed_cold_start_weights, _publish_outlet_created

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    imported = []
    errors = []

    # Resolve property_id from the session if not passed explicitly
    if not property_id and session_id:
        sess = db["onboarding_sessions"].find_one({"session_id": session_id}) or {}
        property_id = sess.get("property_code") or sess.get("property_name") or ""

    for i, row in enumerate(reader):
        try:
            outlet_id = (row.get("outlet_id") or row.get("id") or "").strip()
            name = (row.get("name") or row.get("outlet_name") or "").strip()
            if not outlet_id and name:
                outlet_id = name.lower().replace(" ", "-")
            if not outlet_id:
                errors.append({"row": i + 2, "error": "Missing outlet_id and name"})
                continue

            outlet_type = (row.get("outlet_type") or row.get("type") or "default").strip().lower()
            seats = int(float(row.get("seats", 0) or 0))
            turns = float(row.get("turns_per_service", 1.0) or 1.0)
            open_t = (row.get("open") or "07:00").strip()
            close_t = (row.get("close") or "22:00").strip()
            dayparts_raw = (row.get("dayparts") or "all_day").strip()
            dayparts = [d.strip() for d in dayparts_raw.split("|") if d.strip()]
            days_open_raw = (row.get("days_open") or "mon|tue|wed|thu|fri|sat|sun").strip()
            days_open = [d.strip().lower() for d in days_open_raw.split("|") if d.strip()]
            min_age = int(float(row.get("min_age", 0) or 0))
            requires_res = str(row.get("requires_reservation", "")).strip().lower() in ("true", "yes", "1")
            room_classes_raw = (row.get("room_classes") or "all").strip()
            room_classes = [c.strip() for c in room_classes_raw.split("|") if c.strip()]
            ticketed = str(row.get("ticketed_event", "")).strip().lower() in ("true", "yes", "1")

            hours = [
                {"day": d, "open": open_t, "close": close_t, "dayparts": dayparts}
                for d in days_open
            ]
            services_per_day = max(1, len(dayparts))
            max_daily_covers = int(seats * turns * max(1, services_per_day / 7)) if seats else 0

            outlet = {
                "outlet_id": outlet_id,
                "property_id": property_id or "default",
                "name": name or outlet_id,
                "outlet_type": outlet_type,
                "capacity": {
                    "seats": seats,
                    "turns_per_service": turns,
                    "max_daily_covers": max_daily_covers,
                },
                "hours": hours,
                "eligibility": {
                    "min_age": min_age,
                    "requires_reservation": requires_res,
                    "room_classes": room_classes,
                    "ticketed_event": ticketed,
                },
                "active": True,
                "first_actual_at": None,
                "imported_at": _now(),
                "source": "onboarding_import",
                "created_at": _now(),
                "updated_at": _now(),
            }
            db["outlets"].update_one(
                {"property_id": outlet["property_id"], "outlet_id": outlet_id},
                {"$set": outlet},
                upsert=True,
            )

            # Seed cold-start capture weights so the outlet appears in
            # dashboards immediately
            _seed_cold_start_weights(outlet_id, outlet_type)
            _publish_outlet_created(outlet_id, outlet["property_id"], outlet_type)

            imported.append({"outlet_id": outlet_id, "name": outlet["name"], "type": outlet_type})
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    if session_id:
        db["onboarding_sessions"].update_one(
            {"session_id": session_id},
            {"$set": {"steps.outlets": True, "updated_at": _now()}, "$addToSet": {"steps_completed": "outlets"}},
        )

    return {
        "imported": len(imported),
        "errors": len(errors),
        "error_details": errors[:10],
        "outlets": imported[:10],
        "capture_tracking_seeded": len(imported),
    }


# ── Import Templates ──

@router.get("/templates/{template_type}")
async def get_import_template(template_type: str):
    """Get CSV template headers for each import type."""
    templates = {
        "vendors": "name,category,account_number,contact_name,contact_email,phone,payment_terms,address",
        "employees": "name,email,role,department,outlet,hourly_rate,type",
        "gl_codes": "gl_code,description,account_type,department",
        "menu": "name,category,price,food_cost,description",
        "outlets": "outlet_id,name,outlet_type,seats,turns_per_service,open,close,dayparts,days_open,min_age,requires_reservation,room_classes,ticketed_event",
    }
    if template_type not in templates:
        return {"error": f"Unknown template: {template_type}", "available": list(templates.keys())}
    return {"template_type": template_type, "headers": templates[template_type], "format": "csv"}
