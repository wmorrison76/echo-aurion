"""
BEO Orchestration Engine — Full Event Lifecycle
=================================================
Manages the complete Banquet Event Order lifecycle:
Prospect → Sales → Contract → BEO → Recipes → Costing → Scheduling →
Engineering → HK → Setup → Execution → Settlement → Analytics

Supports 50-100+ simultaneous events/day across multiple rooms.
Master accounts, minimum spend tracking, credits, guest satisfaction.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from database import db
import random

router = APIRouter(prefix="/api/beo-engine", tags=["beo-engine"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]
_today = lambda: datetime.now(timezone.utc)

SERVICE_CHARGE_PCT = 26.0
TAX_PCT = 7.0

# ══════════════════════════════════════
#  BEO NUMBER GENERATOR (Sequential)
# ══════════════════════════════════════

def _next_beo_number():
    counter = db["beo_counters"].find_one_and_update(
        {"_id": "beo_seq"}, {"$inc": {"seq": 1}},
        upsert=True, return_document=True
    )
    return counter["seq"] + 7000  # Start at 7001+ to match real hotel numbering


# ══════════════════════════════════════
#  MODELS
# ══════════════════════════════════════

class ProspectInput(BaseModel):
    company_name: str
    contact_name: str
    contact_email: str = ""
    contact_phone: str = ""
    event_type: str = "breakfast"  # breakfast, lunch, dinner, reception, conference, wedding
    estimated_guests: int = 50
    preferred_dates: List[str] = []
    notes: str = ""
    source: str = "direct"  # direct, referral, web, repeat

class BEOCreateInput(BaseModel):
    prospect_id: str
    event_name: str
    event_date: str
    start_time: str = "07:00"
    end_time: str = "09:00"
    room: str = "Coastal Room"
    event_classification: str = "Breakfast - Buffet"
    setup_type: str = "Existing"
    expected_count: int = 80
    guaranteed_count: int = 80
    set_count: int = 80
    menu_items: List[dict] = []
    setup_notes: List[str] = []
    av_notes: str = ""
    additional_info: str = ""
    minimum_spend: float = 0
    master_account_id: str = ""
    post_as: str = ""
    booking_owner: str = ""
    service_manager: str = ""

class MenuItemInput(BaseModel):
    name: str
    category: str  # bakery, cold_selection, enhancement, egg_selection, potatoes, meat, beverage, dessert
    dietary_codes: List[str] = []  # D, G, N, VG, VE
    recipe_id: str = ""
    price_per_person: float = 0
    description: str = ""

class RecipeInput(BaseModel):
    name: str
    category: str = "bakery"
    yield_portions: int = 80
    ingredients: List[dict] = []  # [{name, qty, unit, cost_per_unit}]
    method: str = ""
    allergens: List[str] = []
    prep_time_minutes: int = 30
    cook_time_minutes: int = 0
    station: str = "cold"  # cold, hot, pastry, garde_manger, saucier, butcher

class CreditInput(BaseModel):
    beo_id: str
    amount: float
    reason: str
    approved_by: str = ""

class SatisfactionInput(BaseModel):
    beo_id: str
    overall_score: int  # 1-10
    food_score: int = 0
    service_score: int = 0
    setup_score: int = 0
    comments: str = ""
    rated_by: str = ""


# ══════════════════════════════════════
#  1. PROSPECT & SALES CYCLE
# ══════════════════════════════════════

@router.post("/prospect")
async def create_prospect(data: ProspectInput):
    """Create a new event prospect — starts the sales cycle."""
    prospect = {
        "id": f"prsp-{_uid()}", "company_name": data.company_name,
        "contact_name": data.contact_name, "contact_email": data.contact_email,
        "contact_phone": data.contact_phone, "event_type": data.event_type,
        "estimated_guests": data.estimated_guests, "preferred_dates": data.preferred_dates,
        "notes": data.notes, "source": data.source,
        "stage": "prospect", "created_at": _now(), "updated_at": _now(),
        "activities": [{"action": "Prospect created", "timestamp": _now(), "by": "system"}],
    }
    db["event_prospects"].insert_one(prospect)
    prospect.pop("_id", None)

    # Update global calendar with tentative hold
    for date in data.preferred_dates:
        db["calendar_events"].insert_one({
            "id": f"cal-{_uid()}", "title": f"[TENTATIVE] {data.company_name} - {data.event_type}",
            "date": date, "type": "event_hold", "prospect_id": prospect["id"],
            "status": "tentative", "created_at": _now(),
        })

    return prospect


@router.put("/prospect/{prospect_id}/advance")
async def advance_prospect(prospect_id: str, new_stage: str = Query(...)):
    """Advance prospect through sales cycle: prospect → inquiry → tentative → contract_signed."""
    valid_stages = ["inquiry", "tentative", "contract_signed", "lost"]
    if new_stage not in valid_stages:
        raise HTTPException(400, f"Invalid stage. Valid: {valid_stages}")

    result = db["event_prospects"].find_one_and_update(
        {"id": prospect_id},
        {"$set": {"stage": new_stage, "updated_at": _now()},
         "$push": {"activities": {"action": f"Advanced to {new_stage}", "timestamp": _now(), "by": "sales"}}},
        return_document=True
    )
    if not result:
        raise HTTPException(404, "Prospect not found")

    # Update calendar status
    if new_stage == "contract_signed":
        db["calendar_events"].update_many(
            {"prospect_id": prospect_id}, {"$set": {"status": "confirmed", "title_prefix": "[CONFIRMED]"}}
        )

    result.pop("_id", None)
    return result


@router.get("/prospects")
async def list_prospects(stage: Optional[str] = None):
    q = {"stage": stage} if stage else {}
    prospects = list(db["event_prospects"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"prospects": prospects, "total": len(prospects)}


# ══════════════════════════════════════
#  2. BEO CREATION & MANAGEMENT
# ══════════════════════════════════════

@router.post("/beo")
async def create_beo(data: BEOCreateInput):
    """Create a full BEO — triggers cascading notifications across all departments."""
    beo_num = _next_beo_number()

    beo = {
        "id": f"beo-{_uid()}", "beo_number": beo_num,
        "prospect_id": data.prospect_id,
        "event_name": data.event_name, "event_date": data.event_date,
        "start_time": data.start_time, "end_time": data.end_time,
        "room": data.room, "event_classification": data.event_classification,
        "setup_type": data.setup_type,
        "expected_count": data.expected_count, "guaranteed_count": data.guaranteed_count,
        "set_count": data.set_count,
        "menu_sections": [], "setup_notes": data.setup_notes,
        "av_notes": data.av_notes, "additional_info": data.additional_info,
        "minimum_spend": data.minimum_spend,
        "master_account_id": data.master_account_id or f"MA-{_uid()}",
        "post_as": data.post_as, "booking_owner": data.booking_owner,
        "service_manager": data.service_manager,
        "status": "draft", "revision": 1, "revised_date": _now(),
        "service_charge_pct": SERVICE_CHARGE_PCT, "tax_pct": TAX_PCT,
        "financial": {"food_revenue": 0, "beverage_revenue": 0, "rental": 0, "av_charges": 0,
                       "service_charge": 0, "tax": 0, "total": 0, "credits": 0, "net": 0,
                       "actual_food_cost": 0, "actual_labor_cost": 0, "profit_margin": 0},
        "signatures": {"client": None, "resort": None},
        "changelog": [{"action": "BEO created", "timestamp": _now(), "by": "system", "revision": 1}],
        "created_at": _now(), "updated_at": _now(),
        "room_block": [], "guest_satisfaction": None,
    }

    # Get prospect info
    prospect = db["event_prospects"].find_one({"id": data.prospect_id}, {"_id": 0})
    if prospect:
        beo["account"] = prospect.get("company_name", "")
        beo["contact_name"] = prospect.get("contact_name", "")
        beo["contact_email"] = prospect.get("contact_email", "")
        beo["contact_phone"] = prospect.get("contact_phone", "")
        db["event_prospects"].update_one({"id": data.prospect_id}, {"$set": {"stage": "beo_issued", "beo_id": beo["id"]}})

    db["beo_documents"].insert_one(beo)
    beo.pop("_id", None)

    # === CASCADE: Notify all departments ===
    cascades = _trigger_beo_cascades(beo)

    return {"beo": beo, "cascades": cascades}


def _trigger_beo_cascades(beo: dict) -> dict:
    """Trigger cross-department cascading actions from a new/updated BEO."""
    cascades = {"notifications": [], "tasks": [], "schedule_impacts": []}
    event_date = beo["event_date"]
    room = beo["room"]
    beo_id = beo["id"]
    beo_num = beo["beo_number"]

    # 1. Global Calendar
    db["calendar_events"].update_one(
        {"prospect_id": beo.get("prospect_id")},
        {"$set": {"title": f"BEO #{beo_num} - {beo['event_name']}", "status": "confirmed",
                  "beo_id": beo_id, "room": room, "start_time": beo["start_time"], "end_time": beo["end_time"],
                  "guests": beo["guaranteed_count"]}},
        upsert=True,
    )
    cascades["notifications"].append({"dept": "calendar", "action": f"Event added to calendar: {event_date} {room}"})

    # 2. Engineering: HVAC 3hrs before + room check 3 days before
    db["eng_tickets"].insert_many([
        {"id": f"eng-{_uid()}", "title": f"HVAC Pre-Event Adjustment — BEO #{beo_num}",
         "description": f"Adjust HVAC for {beo['guaranteed_count']} guests in {room}. Set 3 hours before {beo['start_time']}.",
         "category": "hvac", "priority": "high", "status": "scheduled",
         "room": room, "beo_id": beo_id, "scheduled_date": event_date,
         "due_by": f"{event_date}T{_subtract_hours(beo['start_time'], 3)}", "created_at": _now()},
        {"id": f"eng-{_uid()}", "title": f"Room Readiness Check — BEO #{beo_num}",
         "description": f"Inspect {room} for event readiness. Check 3 days before event.",
         "category": "inspection", "priority": "medium", "status": "scheduled",
         "room": room, "beo_id": beo_id,
         "due_by": (_today() + timedelta(days=-3)).isoformat() if event_date else _now(),
         "created_at": _now()},
    ])
    cascades["notifications"].append({"dept": "engineering", "action": f"HVAC + room inspection scheduled for {room}"})

    # 3. Housekeeping: Room prep notification
    db["concierge_tickets"].insert_one({
        "id": f"tc-{_uid()}", "title": f"Event Room Prep — BEO #{beo_num} ({room})",
        "description": f"Prepare {room} for {beo['event_name']}. {beo['guaranteed_count']} guests. Setup: {beo['setup_type']}.",
        "category": "facility", "priority": "high", "status": "open",
        "department": "housekeeping", "room_number": room,
        "beo_id": beo_id, "created_at": _now(),
    })
    cascades["notifications"].append({"dept": "housekeeping", "action": f"Room prep ticket created for {room}"})

    # 4. Banquet Setup Team: Equipment pull sheet
    equipment_pull = {
        "id": f"pull-{_uid()}", "beo_id": beo_id, "beo_number": beo_num,
        "room": room, "event_date": event_date,
        "setup_type": beo["setup_type"], "guest_count": beo["guaranteed_count"],
        "items": _generate_equipment_pull(beo),
        "status": "pending", "assigned_to": "banquet_setup_team",
        "created_at": _now(),
    }
    db["equipment_pull_sheets"].insert_one(equipment_pull)
    cascades["notifications"].append({"dept": "banquet_setup", "action": f"Equipment pull sheet generated ({len(equipment_pull['items'])} items)"})

    # 5. Stewarding notification
    cascades["notifications"].append({"dept": "stewarding", "action": f"China/glass/silver pull needed for {beo['guaranteed_count']} covers"})

    # 6. Finance: Track minimum spend and event financials
    if beo.get("minimum_spend", 0) > 0:
        cascades["notifications"].append({"dept": "finance", "action": f"Minimum spend: ${beo['minimum_spend']:,.0f} — tracking active"})

    return cascades


def _generate_equipment_pull(beo: dict) -> list:
    """Generate equipment pull list based on setup type and guest count."""
    gc = beo["guaranteed_count"]
    items = [
        {"item": "Dinner Plates", "qty": gc + 10, "location": "Stewarding"},
        {"item": "Salad Plates", "qty": gc + 10, "location": "Stewarding"},
        {"item": "Coffee Cups & Saucers", "qty": gc + 10, "location": "Stewarding"},
        {"item": "Water Glasses", "qty": gc + 10, "location": "Stewarding"},
        {"item": "Juice Glasses", "qty": gc, "location": "Stewarding"},
        {"item": "Silverware Sets", "qty": gc + 10, "location": "Stewarding"},
        {"item": "Linen Napkins", "qty": gc + 20, "location": "Linen Room"},
        {"item": "Tablecloths (90x132)", "qty": max(gc // 8, 5), "location": "Linen Room"},
        {"item": "Buffet Chafers (full)", "qty": 6, "location": "Banquet Storage"},
        {"item": "Buffet Chafers (half)", "qty": 4, "location": "Banquet Storage"},
        {"item": "Sterno Fuel Cans", "qty": 20, "location": "Banquet Storage"},
        {"item": "Beverage Dispensers", "qty": 3, "location": "Banquet Storage"},
        {"item": "Food Labels/Tent Cards", "qty": 15, "location": "Print Shop"},
    ]
    if beo.get("setup_type") == "Existing":
        items.append({"item": "Bus Tubs", "qty": 8, "location": "Stewarding"})
    return items


def _subtract_hours(time_str: str, hours: int) -> str:
    try:
        h, m = map(int, time_str.split(":"))
        h = max(0, h - hours)
        return f"{h:02d}:{m:02d}"
    except:
        return "04:00"


# ══════════════════════════════════════
#  3. MENU & RECIPE MANAGEMENT
# ══════════════════════════════════════

@router.post("/beo/{beo_id}/menu-section")
async def add_menu_section(beo_id: str, section_name: str = Query(...), items: List[dict] = []):
    """Add a menu section (Bakery, Cold Selection, etc.) to a BEO."""
    section = {
        "id": f"sec-{_uid()}", "name": section_name, "items": items, "created_at": _now(),
    }
    result = db["beo_documents"].update_one(
        {"id": beo_id},
        {"$push": {"menu_sections": section, "changelog": {"action": f"Menu section '{section_name}' added", "timestamp": _now(), "by": "chef"}},
         "$set": {"updated_at": _now()}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "BEO not found")
    return {"section": section}


@router.post("/recipe")
async def create_recipe(data: RecipeInput):
    """Create a banquet recipe with auto-costing from internal catalog."""
    total_cost = 0
    costed_ingredients = []
    for ing in data.ingredients:
        # Try to find in internal catalog
        catalog_item = db["internal_catalog"].find_one(
            {"name": {"$regex": ing.get("name", ""), "$options": "i"}},
            {"_id": 0, "par_cost": 1, "name": 1, "unit": 1}
        )
        unit_cost = ing.get("cost_per_unit", 0)
        if catalog_item and unit_cost == 0:
            unit_cost = catalog_item.get("par_cost", 0)
        line_cost = round(unit_cost * ing.get("qty", 0), 2)
        total_cost += line_cost
        costed_ingredients.append({**ing, "cost_per_unit": unit_cost, "line_cost": line_cost,
                                    "catalog_match": catalog_item.get("name") if catalog_item else None})

    cost_per_portion = round(total_cost / max(data.yield_portions, 1), 2)

    recipe = {
        "id": f"rcp-{_uid()}", "name": data.name, "category": data.category,
        "yield_portions": data.yield_portions, "ingredients": costed_ingredients,
        "method": data.method, "allergens": data.allergens,
        "total_cost": round(total_cost, 2), "cost_per_portion": cost_per_portion,
        "prep_time_minutes": data.prep_time_minutes, "cook_time_minutes": data.cook_time_minutes,
        "station": data.station, "status": "active",
        "created_at": _now(), "updated_at": _now(),
    }
    db["beo_recipes"].insert_one(recipe)
    recipe.pop("_id", None)
    return recipe


@router.get("/recipes")
async def list_recipes(category: Optional[str] = None):
    q = {"status": "active"}
    if category:
        q["category"] = category
    recipes = list(db["beo_recipes"].find(q, {"_id": 0}).sort("name", 1))
    return {"recipes": recipes, "total": len(recipes)}


# ══════════════════════════════════════
#  4. BEO COSTING & FINANCIALS
# ══════════════════════════════════════

@router.post("/beo/{beo_id}/cost")
async def cost_beo(beo_id: str):
    """Auto-cost a BEO from its menu recipes. Calculates food cost, service charge, tax, total."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    gc = beo["guaranteed_count"]
    recipes = list(db["beo_recipes"].find({"status": "active"}, {"_id": 0}))
    recipe_map = {r["name"].lower(): r for r in recipes}

    total_food_cost = 0
    menu_costing = []
    for section in beo.get("menu_sections", []):
        for item in section.get("items", []):
            item_name = item.get("name", "").lower()
            recipe = recipe_map.get(item_name)
            if recipe:
                item_cost = recipe["cost_per_portion"] * gc
                total_food_cost += item_cost
                menu_costing.append({"item": item.get("name"), "cost_per_portion": recipe["cost_per_portion"],
                                      "total_cost": round(item_cost, 2), "recipe_id": recipe["id"]})

    # Pricing: typically 3.5-4x food cost markup
    food_revenue = round(total_food_cost * 3.8, 2)
    bev_estimate = round(gc * 8.50, 2)  # $8.50 pp for basic beverage
    subtotal = food_revenue + bev_estimate
    service_charge = round(subtotal * SERVICE_CHARGE_PCT / 100, 2)
    tax = round((subtotal + service_charge) * TAX_PCT / 100, 2)
    total = round(subtotal + service_charge + tax, 2)

    financial = {
        "food_revenue": food_revenue, "beverage_revenue": bev_estimate,
        "rental": 0, "av_charges": 0,
        "service_charge": service_charge, "tax": tax, "subtotal": subtotal, "total": total,
        "actual_food_cost": round(total_food_cost, 2),
        "food_cost_pct": round(total_food_cost / max(food_revenue, 1) * 100, 1),
        "credits": 0, "net": total,
        "minimum_spend_met": total >= beo.get("minimum_spend", 0),
        "menu_costing": menu_costing,
    }

    db["beo_documents"].update_one({"id": beo_id}, {"$set": {"financial": financial, "updated_at": _now()}})
    return {"beo_id": beo_id, "financial": financial}


@router.post("/beo/{beo_id}/credit")
async def apply_credit(data: CreditInput):
    """Apply a credit/deduction to a BEO (event didn't go as planned)."""
    credit = {
        "id": f"crd-{_uid()}", "beo_id": data.beo_id, "amount": data.amount,
        "reason": data.reason, "approved_by": data.approved_by, "created_at": _now(),
    }
    db["beo_credits"].insert_one(credit)
    # Update BEO financial
    db["beo_documents"].update_one(
        {"id": data.beo_id},
        {"$inc": {"financial.credits": data.amount},
         "$push": {"changelog": {"action": f"Credit ${data.amount:.2f} applied: {data.reason}", "timestamp": _now(), "by": data.approved_by}}}
    )
    credit.pop("_id", None)
    return credit


# ══════════════════════════════════════
#  5. GUEST SATISFACTION & METRICS
# ══════════════════════════════════════

@router.post("/beo/{beo_id}/satisfaction")
async def record_satisfaction(data: SatisfactionInput):
    """Record guest satisfaction for an event — ties to server performance."""
    score = {
        "id": f"sat-{_uid()}", "beo_id": data.beo_id,
        "overall": data.overall_score, "food": data.food_score,
        "service": data.service_score, "setup": data.setup_score,
        "comments": data.comments, "rated_by": data.rated_by, "created_at": _now(),
    }
    db["event_satisfaction"].insert_one(score)
    score.pop("_id", None)  # Remove _id BEFORE updating BEO document
    db["beo_documents"].update_one({"id": data.beo_id}, {"$set": {"guest_satisfaction": score}})
    return score


# ══════════════════════════════════════
#  6. BEO RETRIEVAL & SEARCH
# ══════════════════════════════════════

@router.get("/beo/{beo_id}")
async def get_beo(beo_id: str):
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")
    return beo


@router.get("/beos")
async def list_beos(status: Optional[str] = None, date: Optional[str] = None, room: Optional[str] = None, limit: int = 50):
    q: dict = {}
    if status:
        q["status"] = status
    if date:
        q["event_date"] = date
    if room:
        q["room"] = room
    beos = list(db["beo_documents"].find(q, {"_id": 0}).sort("event_date", 1).limit(limit))
    return {"beos": beos, "total": len(beos)}


# ══════════════════════════════════════
#  BEO REVISION & AUDIT TRAIL
# ══════════════════════════════════════

@router.put("/beo/{beo_id}/revise")
async def revise_beo(beo_id: str, body: dict = {}):
    """Revise a BEO — increments revision, snapshots previous version,
    logs all changes, re-triggers department cascades, and runs self-audit."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    # Snapshot current version before changes
    snapshot = {**beo, "snapshot_id": f"snap-{_uid()}", "snapshot_at": _now()}
    db["beo_revisions"].insert_one(snapshot)

    # Track what changed
    changes = []
    updatable = ["event_name", "event_date", "start_time", "end_time", "room",
                 "expected_count", "guaranteed_count", "set_count", "setup_type",
                 "event_classification", "av_notes", "additional_info", "minimum_spend",
                 "menu_sections", "setup_notes", "service_manager", "booking_owner"]
    update_set = {}
    for field in updatable:
        if field in body and body[field] != beo.get(field):
            old_val = beo.get(field)
            new_val = body[field]
            changes.append({"field": field, "old": str(old_val)[:100], "new": str(new_val)[:100]})
            update_set[field] = new_val

    if not changes:
        return {"beo_id": beo_id, "message": "No changes detected", "revision": beo.get("revision", 1)}

    new_revision = beo.get("revision", 1) + 1
    revised_by = body.get("revised_by", "system")

    changelog_entry = {
        "action": f"Revision {new_revision}",
        "timestamp": _now(),
        "by": revised_by,
        "revision": new_revision,
        "changes": changes,
    }

    update_set["revision"] = new_revision
    update_set["revised_date"] = _now()
    update_set["updated_at"] = _now()
    update_set["status"] = body.get("status", beo.get("status", "revised"))

    db["beo_documents"].update_one(
        {"id": beo_id},
        {"$set": update_set, "$push": {"changelog": changelog_entry}}
    )

    # Re-trigger cascades if critical fields changed
    critical_changed = any(c["field"] in ("event_date", "room", "guaranteed_count", "start_time", "end_time", "menu_sections") for c in changes)
    cascade_result = {}
    if critical_changed:
        updated_beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
        cascade_result = _trigger_beo_cascades(updated_beo)
        # Notify all departments of revision
        db["beo_notifications"].insert_one({
            "id": f"notif-{_uid()}", "beo_id": beo_id, "beo_number": beo.get("beo_number"),
            "type": "revision", "revision": new_revision,
            "message": f"BEO #{beo.get('beo_number')} revised (Rev {new_revision}). Changes: {', '.join(c['field'] for c in changes)}",
            "departments": ["kitchen", "banquet", "engineering", "housekeeping", "stewarding", "finance"],
            "read_by": [], "created_at": _now(),
        })

    # Run self-audit after revision
    audit = await _self_audit_beo(beo_id)

    return {
        "beo_id": beo_id, "revision": new_revision, "changes": changes,
        "cascades_triggered": critical_changed, "cascade_result": cascade_result,
        "audit": audit,
    }


@router.get("/beo/{beo_id}/revisions")
async def get_beo_revisions(beo_id: str):
    """Get full revision history for a BEO — shows every snapshot."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0, "changelog": 1, "revision": 1, "beo_number": 1})
    if not beo:
        raise HTTPException(404, "BEO not found")
    revisions = list(db["beo_revisions"].find({"id": beo_id}, {"_id": 0}).sort("snapshot_at", -1))
    return {
        "beo_id": beo_id, "beo_number": beo.get("beo_number"),
        "current_revision": beo.get("revision", 1),
        "changelog": beo.get("changelog", []),
        "snapshots": len(revisions),
    }


@router.get("/beo/{beo_id}/audit")
async def audit_beo(beo_id: str):
    """Run a self-audit on a BEO — checks for data integrity, missing charges, P&L alignment."""
    return await _self_audit_beo(beo_id)


async def _self_audit_beo(beo_id: str) -> dict:
    """EchoAi self-audit: verify BEO integrity after every process step."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        return {"status": "error", "message": "BEO not found"}

    issues = []
    warnings = []

    # 1. Financial integrity
    fin = beo.get("financial", {})
    food_rev = fin.get("food_revenue", 0)
    bev_rev = fin.get("beverage_revenue", 0)
    subtotal = food_rev + bev_rev + fin.get("rental", 0) + fin.get("av_charges", 0)
    expected_sc = round(subtotal * beo.get("service_charge_pct", 26) / 100, 2)
    actual_sc = fin.get("service_charge", 0)
    if abs(expected_sc - actual_sc) > 1.0 and subtotal > 0:
        issues.append({"type": "financial", "severity": "high", "message": f"Service charge mismatch: expected ${expected_sc}, got ${actual_sc}"})

    expected_tax = round((subtotal + actual_sc) * beo.get("tax_pct", 7) / 100, 2)
    actual_tax = fin.get("tax", 0)
    if abs(expected_tax - actual_tax) > 1.0 and subtotal > 0:
        issues.append({"type": "financial", "severity": "high", "message": f"Tax mismatch: expected ${expected_tax}, got ${actual_tax}"})

    # 2. Minimum spend check
    min_spend = beo.get("minimum_spend", 0)
    total = fin.get("total", 0)
    if min_spend > 0 and total < min_spend:
        warnings.append({"type": "minimum_spend", "severity": "medium", "message": f"Below minimum spend: ${total:,.0f} vs ${min_spend:,.0f} required"})

    # 3. Guest count consistency
    if beo.get("guaranteed_count", 0) != beo.get("set_count", 0):
        warnings.append({"type": "guest_count", "severity": "low", "message": f"Guaranteed ({beo.get('guaranteed_count')}) != Set ({beo.get('set_count')}) count"})

    # 4. Menu sections present
    if not beo.get("menu_sections") and beo.get("status") not in ("draft",):
        issues.append({"type": "menu", "severity": "high", "message": "No menu sections defined — kitchen cannot produce"})

    # 5. Department cascade verification
    eng_tickets = db["eng_tickets"].count_documents({"beo_id": beo_id})
    if eng_tickets == 0:
        warnings.append({"type": "cascade", "severity": "medium", "message": "No engineering tickets found — HVAC/room check may not be scheduled"})

    pull_sheets = db["equipment_pull_sheets"].count_documents({"beo_id": beo_id})
    if pull_sheets == 0:
        warnings.append({"type": "cascade", "severity": "medium", "message": "No equipment pull sheet — banquet setup may not be ready"})

    # 6. Calendar sync check
    cal_entry = db["calendar_events"].find_one({"beo_id": beo_id})
    if not cal_entry:
        issues.append({"type": "calendar", "severity": "high", "message": "BEO not synced to global calendar"})

    # 7. Revision consistency
    changelog = beo.get("changelog", [])
    if len(changelog) > 0:
        last_rev = changelog[-1].get("revision", 1)
        if last_rev != beo.get("revision", 1):
            issues.append({"type": "revision", "severity": "high", "message": f"Changelog revision ({last_rev}) doesn't match BEO revision ({beo.get('revision')})"})

    # 8. Signature status
    sigs = beo.get("signatures", {})
    if beo.get("status") in ("confirmed", "execution") and not sigs.get("client"):
        warnings.append({"type": "signature", "severity": "medium", "message": "BEO confirmed but no client signature on file"})

    # 9. Food cost % check
    food_cost_pct = fin.get("food_cost_pct", 0)
    if food_cost_pct > 35 and food_cost_pct > 0:
        warnings.append({"type": "profitability", "severity": "medium", "message": f"Food cost {food_cost_pct}% exceeds 35% threshold"})

    status = "clean" if not issues else "issues_found"

    audit_record = {
        "id": f"audit-{_uid()}", "beo_id": beo_id,
        "beo_number": beo.get("beo_number"), "revision": beo.get("revision"),
        "status": status, "issues": issues, "warnings": warnings,
        "total_issues": len(issues), "total_warnings": len(warnings),
        "audited_at": _now(),
    }
    db["beo_audits"].insert_one(audit_record)
    audit_record.pop("_id", None)

    # Update BEO with last audit status
    db["beo_documents"].update_one({"id": beo_id}, {"$set": {"last_audit": audit_record}})

    return audit_record


@router.post("/beo/{beo_id}/sign")
async def sign_beo(beo_id: str, body: dict = {}):
    """Client or resort signs the BEO — locks the current revision as the approved version."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    signer = body.get("signer", "client")  # "client" or "resort"
    name = body.get("name", "")

    sig = {"signed_by": name, "signed_at": _now(), "revision": beo.get("revision", 1)}

    update = {
        f"signatures.{signer}": sig,
        "updated_at": _now(),
    }
    if signer == "client":
        update["status"] = "client_approved"
        update["approved_revision"] = beo.get("revision", 1)

    db["beo_documents"].update_one(
        {"id": beo_id},
        {"$set": update,
         "$push": {"changelog": {"action": f"{signer.title()} signed (Rev {beo.get('revision',1)})", "timestamp": _now(), "by": name or signer, "revision": beo.get("revision", 1)}}}
    )

    # Run post-sign audit
    audit = await _self_audit_beo(beo_id)

    return {"beo_id": beo_id, "signer": signer, "signature": sig, "audit": audit}


@router.get("/notifications")
async def get_beo_notifications(unread_only: bool = True):
    """Get BEO revision notifications for departments."""
    q = {"read_by": {"$size": 0}} if unread_only else {}
    notifs = list(db["beo_notifications"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"notifications": notifs, "total": len(notifs)}



@router.get("/beo/{beo_id}/fire-guide")
async def get_fire_guide(beo_id: str):
    """Generate kitchen fire time guide — tells cooks when to fire and plate each item."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    start_h, start_m = map(int, beo.get("start_time", "07:00").split(":"))
    serve_time = start_h * 60 + start_m
    ready_time = serve_time - 15  # 15 min before serve

    recipes = list(db["beo_recipes"].find({"status": "active"}, {"_id": 0}))
    fire_guide = []
    for recipe in recipes:
        total_time = recipe.get("prep_time_minutes", 30) + recipe.get("cook_time_minutes", 0)
        fire_at = ready_time - total_time
        fire_h, fire_m = divmod(max(fire_at, 0), 60)
        fire_guide.append({
            "item": recipe["name"], "station": recipe["station"],
            "prep_time": recipe["prep_time_minutes"], "cook_time": recipe["cook_time_minutes"],
            "fire_at": f"{fire_h:02d}:{fire_m:02d}",
            "plate_by": f"{ready_time // 60:02d}:{ready_time % 60:02d}",
            "serve_time": beo["start_time"],
        })

    fire_guide.sort(key=lambda x: x["fire_at"])
    return {"beo_number": beo["beo_number"], "event": beo["event_name"], "fire_guide": fire_guide}


# ══════════════════════════════════════
#  7. MENU ITEM ANALYTICS (Plowhorse/Dog)
# ══════════════════════════════════════

@router.get("/menu-analytics")
async def menu_item_analytics():
    """Analyze banquet menu items: Stars, Plowhorses, Puzzles, Dogs."""
    beos = list(db["beo_documents"].find({}, {"_id": 0, "menu_sections": 1, "guaranteed_count": 1}))
    item_data = defaultdict(lambda: {"count": 0, "total_covers": 0, "revenue": 0, "cost": 0})

    recipes = {r["name"].lower(): r for r in db["beo_recipes"].find({"status": "active"}, {"_id": 0})}

    for beo in beos:
        gc = beo.get("guaranteed_count", 0)
        for section in beo.get("menu_sections", []):
            for item in section.get("items", []):
                name = item.get("name", "")
                key = name.lower()
                item_data[key]["name"] = name
                item_data[key]["count"] += 1
                item_data[key]["total_covers"] += gc
                recipe = recipes.get(key)
                if recipe:
                    item_data[key]["revenue"] += recipe["cost_per_portion"] * 3.8 * gc
                    item_data[key]["cost"] += recipe["cost_per_portion"] * gc

    # Classify: Star (high pop + high profit), Plowhorse (high pop + low profit),
    # Puzzle (low pop + high profit), Dog (low pop + low profit)
    items = list(item_data.values())
    if not items:
        return {"items": [], "summary": {}}

    avg_count = sum(i["count"] for i in items) / len(items)
    avg_margin = sum((i["revenue"] - i["cost"]) / max(i["revenue"], 1) for i in items) / len(items)

    for item in items:
        margin = (item["revenue"] - item["cost"]) / max(item["revenue"], 1)
        item["margin_pct"] = round(margin * 100, 1)
        item["profit"] = round(item["revenue"] - item["cost"], 2)
        high_pop = item["count"] >= avg_count
        high_profit = margin >= avg_margin
        if high_pop and high_profit:
            item["classification"] = "star"
        elif high_pop and not high_profit:
            item["classification"] = "plowhorse"
        elif not high_pop and high_profit:
            item["classification"] = "puzzle"
        else:
            item["classification"] = "dog"

    items.sort(key=lambda x: x["count"], reverse=True)
    return {
        "items": items,
        "summary": {
            "stars": len([i for i in items if i["classification"] == "star"]),
            "plowhorses": len([i for i in items if i["classification"] == "plowhorse"]),
            "puzzles": len([i for i in items if i["classification"] == "puzzle"]),
            "dogs": len([i for i in items if i["classification"] == "dog"]),
        },
    }


# ══════════════════════════════════════
#  8. MASTER ACCOUNT TRACKING
# ══════════════════════════════════════

@router.get("/master-accounts")
async def list_master_accounts():
    pipeline = [
        {"$group": {
            "_id": "$master_account_id",
            "account_name": {"$first": "$account"},
            "events": {"$sum": 1},
            "total_revenue": {"$sum": "$financial.total"},
            "total_credits": {"$sum": "$financial.credits"},
            "total_guests": {"$sum": "$guaranteed_count"},
        }},
        {"$sort": {"total_revenue": -1}},
    ]
    accounts = list(db["beo_documents"].aggregate(pipeline))
    return {"accounts": [{**a, "id": a["_id"]} for a in accounts if a["_id"]], "total": len(accounts)}


@router.get("/dashboard")
async def beo_dashboard():
    """Full BEO operations dashboard."""
    total_beos = db["beo_documents"].count_documents({})
    today_str = _today().strftime("%Y-%m-%d")
    today_events = db["beo_documents"].count_documents({"event_date": today_str})
    total_revenue = sum(b.get("financial", {}).get("total", 0) for b in db["beo_documents"].find({}, {"_id": 0, "financial.total": 1}))
    total_credits = sum(b.get("financial", {}).get("credits", 0) for b in db["beo_documents"].find({}, {"_id": 0, "financial.credits": 1}))
    total_recipes = db["beo_recipes"].count_documents({"status": "active"})
    prospects = db["event_prospects"].count_documents({})
    avg_satisfaction = 0
    sat_scores = list(db["event_satisfaction"].find({}, {"_id": 0, "overall": 1}))
    if sat_scores:
        avg_satisfaction = round(sum(s["overall"] for s in sat_scores) / len(sat_scores), 1)
    pull_sheets = db["equipment_pull_sheets"].count_documents({"status": "pending"})

    return {
        "total_beos": total_beos, "today_events": today_events,
        "total_revenue": round(total_revenue, 2), "total_credits": round(total_credits, 2),
        "net_revenue": round(total_revenue - total_credits, 2),
        "total_recipes": total_recipes, "active_prospects": prospects,
        "avg_satisfaction": avg_satisfaction, "pending_pull_sheets": pull_sheets,
    }
