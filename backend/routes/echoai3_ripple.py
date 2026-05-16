"""
EchoAi3 -- Event Ripple Engine
================================
Shows how a banquet change cascades to prep, labor, inventory, and margin.
Traces the full dependency chain across operational modules when any
event parameter changes.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/ripple", tags=["echoai3-ripple"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]


class RippleRequest(BaseModel):
    trigger_type: str  # cover_change, menu_change, timing_change, venue_change, dietary_change
    trigger_params: dict
    property_id: str = "luccca-primary"


# ─── Ripple Propagation Engine ───

def propagate_cover_change(params: dict) -> dict:
    """When covers change, trace the cascade through every affected module."""
    delta = params.get("cover_delta", 0)
    meal_type = params.get("meal_type", "plated_dinner")
    lead_time_days = params.get("lead_time_days", 5)

    cost_map = {"plated_dinner": 85, "buffet_dinner": 65, "plated_lunch": 55, "buffet_lunch": 45, "reception": 35, "breakfast": 30}
    base_cost = cost_map.get(meal_type, 65)

    ripples = []

    # 1. PREP IMPACT
    prep_hours_per_50 = 6
    prep_delta = round(abs(delta) / 50 * prep_hours_per_50, 1)
    ripples.append({
        "module": "Kitchen Prep",
        "icon": "utensils",
        "severity": "high" if abs(delta) > 100 else "medium" if abs(delta) > 30 else "low",
        "impact": f"{'Additional' if delta > 0 else 'Reduced'} {prep_delta}h prep time required",
        "details": {
            "prep_hours_delta": prep_delta if delta > 0 else -prep_delta,
            "stations_affected": max(1, abs(delta) // 40),
            "lead_time_sufficient": lead_time_days >= 3,
            "risk": "INSUFFICIENT LEAD TIME" if lead_time_days < 2 and abs(delta) > 50 else "OK",
        },
    })

    # 2. LABOR IMPACT
    additional_servers = max(0, delta // 20) if delta > 0 else 0
    additional_cooks = max(0, delta // 40) if delta > 0 else 0
    labor_cost_delta = round((additional_servers * 18 + additional_cooks * 22) * 8, 2)
    ripples.append({
        "module": "Labor & Staffing",
        "icon": "users",
        "severity": "high" if additional_servers + additional_cooks > 5 else "medium" if additional_servers + additional_cooks > 2 else "low",
        "impact": f"Need {additional_servers} servers + {additional_cooks} cooks{'  URGENT' if lead_time_days < 2 else ''}",
        "details": {
            "additional_servers": additional_servers,
            "additional_cooks": additional_cooks,
            "labor_cost_delta": labor_cost_delta,
            "overtime_risk": lead_time_days < 3 and additional_cooks > 2,
            "agency_staff_needed": lead_time_days < 2 and additional_servers > 3,
        },
    })

    # 3. INVENTORY IMPACT
    ingredient_lines = max(1, abs(delta) // 10)
    food_cost_delta = round(base_cost * 0.38 * delta, 2)
    ripples.append({
        "module": "Inventory & Purchasing",
        "icon": "package",
        "severity": "high" if lead_time_days < 2 and abs(delta) > 50 else "medium",
        "impact": f"{'Order' if delta > 0 else 'Cancel/redirect'} ~{ingredient_lines} ingredient lines, ${abs(food_cost_delta):,.0f} impact",
        "details": {
            "ingredient_lines_affected": ingredient_lines,
            "food_cost_delta": food_cost_delta,
            "vendor_notification_needed": delta > 30,
            "perishable_risk": lead_time_days > 5 and delta < -50,
            "expedited_delivery_needed": lead_time_days < 2 and delta > 50,
        },
    })

    # 4. REVENUE IMPACT
    rev_per_cover = {"plated_dinner": 165, "buffet_dinner": 120, "plated_lunch": 95, "buffet_lunch": 80, "reception": 65, "breakfast": 50}
    rpc = rev_per_cover.get(meal_type, 120)
    rev_delta = round(rpc * delta, 2)
    ripples.append({
        "module": "Revenue & Margin",
        "icon": "trending-up",
        "severity": "high" if abs(rev_delta) > 10000 else "medium",
        "impact": f"${rev_delta:+,.0f} revenue impact. Margin {'improves' if rev_delta > 0 else 'contracts'}.",
        "details": {
            "revenue_delta": rev_delta,
            "food_cost_impact": food_cost_delta,
            "labor_cost_impact": labor_cost_delta,
            "net_margin_delta": round(rev_delta - food_cost_delta - labor_cost_delta, 2),
        },
    })

    # 5. EQUIPMENT & SPACE
    if abs(delta) > 50:
        ripples.append({
            "module": "Equipment & Venue",
            "icon": "settings",
            "severity": "medium" if abs(delta) > 100 else "low",
            "impact": f"{'Additional' if delta > 0 else 'Excess'} {max(1, abs(delta) // 10)} table setups. Verify room capacity.",
            "details": {
                "table_setups_delta": abs(delta) // 10,
                "room_capacity_check": delta > 0,
                "av_adjustment": abs(delta) > 80,
                "linen_order_change": True,
            },
        })

    # 6. BEO UPDATE
    ripples.append({
        "module": "BEO & Documentation",
        "icon": "file-text",
        "severity": "medium",
        "impact": f"BEO revision required. Update cover count, F&B quantities, staffing, and floor plan.",
        "details": {
            "beo_revision": True,
            "client_notification": True,
            "department_heads_notified": ["kitchen", "banquets", "front_of_house", "stewarding"],
        },
    })

    return {"trigger": "cover_change", "cover_delta": delta, "ripples": ripples, "total_modules_affected": len(ripples)}


def propagate_menu_change(params: dict) -> dict:
    items_changed = params.get("items_changed", 3)
    covers = params.get("covers", 150)

    ripples = [
        {
            "module": "Kitchen Prep",
            "icon": "utensils",
            "severity": "high" if items_changed > 5 else "medium",
            "impact": f"{items_changed} menu items changed. Recipe reprep for {covers} covers required.",
            "details": {"items_changed": items_changed, "prep_reset": items_changed > 3, "tastings_needed": items_changed > 2},
        },
        {
            "module": "Inventory & Purchasing",
            "icon": "package",
            "severity": "medium",
            "impact": f"Ingredient swap for {items_changed} items. Check par levels and vendor availability.",
            "details": {"new_ingredients": items_changed * 4, "vendor_check": True},
        },
        {
            "module": "Allergen & Compliance",
            "icon": "shield",
            "severity": "high",
            "impact": f"Allergen matrix must be recalculated. Dietary flags need re-verification.",
            "details": {"allergen_recheck": True, "dietary_flags": ["gluten", "dairy", "nuts", "shellfish"]},
        },
        {
            "module": "BEO & Client Approval",
            "icon": "file-text",
            "severity": "medium",
            "impact": f"Updated BEO with new menu needs client sign-off.",
            "details": {"client_approval_required": True, "beo_revision": True},
        },
        {
            "module": "Costing & Margin",
            "icon": "trending-up",
            "severity": "medium",
            "impact": f"Re-cost {items_changed} items. Verify event margin still meets threshold.",
            "details": {"recosting_needed": True, "margin_recheck": True},
        },
    ]
    return {"trigger": "menu_change", "items_changed": items_changed, "ripples": ripples, "total_modules_affected": len(ripples)}


def propagate_timing_change(params: dict) -> dict:
    hours_shifted = params.get("hours_shifted", 2)
    direction = params.get("direction", "earlier")

    ripples = [
        {
            "module": "Labor & Staffing",
            "icon": "users",
            "severity": "high" if hours_shifted > 3 else "medium",
            "impact": f"Event shifted {hours_shifted}h {direction}. All staff call-times must be adjusted.",
            "details": {"shift_adjustment": hours_shifted, "overtime_risk": direction == "later" and hours_shifted > 2},
        },
        {
            "module": "Kitchen Prep",
            "icon": "utensils",
            "severity": "medium",
            "impact": f"Prep timeline compressed/expanded by {hours_shifted}h. Verify cold chain compliance.",
            "details": {"timeline_adjustment": hours_shifted, "cold_chain_risk": hours_shifted > 4},
        },
        {
            "module": "Venue Operations",
            "icon": "settings",
            "severity": "medium" if hours_shifted > 2 else "low",
            "impact": f"Room flip schedule adjusted. Check for conflicts with other events.",
            "details": {"room_conflict_check": True, "setup_timeline_compressed": direction == "earlier"},
        },
    ]
    return {"trigger": "timing_change", "hours_shifted": hours_shifted, "ripples": ripples, "total_modules_affected": len(ripples)}


def propagate_venue_change(params: dict) -> dict:
    new_venue = params.get("new_venue", "Grand Ballroom")
    max_capacity = params.get("max_capacity", 300)
    current_covers = params.get("current_covers", 200)

    ripples = [
        {
            "module": "Venue Operations",
            "icon": "settings",
            "severity": "high",
            "impact": f"Venue changed to {new_venue} (max {max_capacity}). Full setup reconfiguration.",
            "details": {"capacity_check": current_covers <= max_capacity, "capacity_utilization": round(current_covers / max(max_capacity, 1) * 100, 1)},
        },
        {
            "module": "AV & Equipment",
            "icon": "settings",
            "severity": "medium",
            "impact": f"AV requirements may differ. Sound, lighting, and projection reset needed.",
            "details": {"av_survey_needed": True, "equipment_transfer": True},
        },
        {
            "module": "Floor Plan & Seating",
            "icon": "file-text",
            "severity": "medium",
            "impact": f"New floor plan required. Seating chart must be redrawn for {new_venue}.",
            "details": {"floor_plan_reset": True, "client_approval_needed": True},
        },
        {
            "module": "Service Flow",
            "icon": "users",
            "severity": "medium",
            "impact": f"Service stations repositioned. Staff walkthrough recommended.",
            "details": {"station_reconfiguration": True, "walkthrough_scheduled": False},
        },
    ]
    return {"trigger": "venue_change", "new_venue": new_venue, "ripples": ripples, "total_modules_affected": len(ripples)}


def propagate_dietary_change(params: dict) -> dict:
    dietary_type = params.get("dietary_type", "vegan")
    affected_covers = params.get("affected_covers", 20)

    ripples = [
        {
            "module": "Menu & Recipes",
            "icon": "utensils",
            "severity": "medium",
            "impact": f"{affected_covers} covers require {dietary_type} accommodation. Menu adaptation needed.",
            "details": {"dietary_type": dietary_type, "covers_affected": affected_covers, "menu_items_to_modify": max(2, affected_covers // 10)},
        },
        {
            "module": "Allergen Protocol",
            "icon": "shield",
            "severity": "high",
            "impact": f"Cross-contamination protocol activated for {dietary_type}. Separate prep area may be needed.",
            "details": {"cross_contamination_risk": True, "separate_prep": affected_covers > 15, "label_updates": True},
        },
        {
            "module": "Purchasing",
            "icon": "package",
            "severity": "low",
            "impact": f"Specialty ingredients for {dietary_type} menu. Verify supplier can deliver.",
            "details": {"specialty_ingredients": True, "supplier_check": True},
        },
    ]
    return {"trigger": "dietary_change", "dietary_type": dietary_type, "ripples": ripples, "total_modules_affected": len(ripples)}


PROPAGATORS = {
    "cover_change": propagate_cover_change,
    "menu_change": propagate_menu_change,
    "timing_change": propagate_timing_change,
    "venue_change": propagate_venue_change,
    "dietary_change": propagate_dietary_change,
}


# ─── API Endpoints ───

@router.get("/triggers")
async def get_ripple_triggers():
    """Get all available ripple trigger types."""
    return {
        "triggers": {
            "cover_change": {"description": "Covers added or removed from an event", "params": ["cover_delta", "meal_type", "lead_time_days"]},
            "menu_change": {"description": "Menu items changed for an event", "params": ["items_changed", "covers"]},
            "timing_change": {"description": "Event timing shifted", "params": ["hours_shifted", "direction"]},
            "venue_change": {"description": "Event venue changed", "params": ["new_venue", "max_capacity", "current_covers"]},
            "dietary_change": {"description": "Dietary requirements changed", "params": ["dietary_type", "affected_covers"]},
        }
    }


@router.post("/propagate")
async def propagate_ripple(req: RippleRequest):
    """Trigger a ripple propagation and see cascading impacts."""
    if req.trigger_type not in PROPAGATORS:
        return {"error": f"Unknown trigger: {req.trigger_type}", "available": list(PROPAGATORS.keys())}

    result = PROPAGATORS[req.trigger_type](req.trigger_params)
    ripple_id = f"rpl-{_uid()}"

    # Severity summary
    severity_counts = {"high": 0, "medium": 0, "low": 0}
    for r in result.get("ripples", []):
        severity_counts[r.get("severity", "low")] += 1

    # Log to TraceLedger
    trace_log(
        event_type="ripple_propagated",
        entity_type="echoai3_ripple",
        entity_id=ripple_id,
        actor_id="echoai3",
        metadata={"trigger": req.trigger_type, "params": req.trigger_params, "modules_affected": result.get("total_modules_affected", 0)},
    )

    # Store
    db["ai3_ripples"].insert_one({
        "ripple_id": ripple_id,
        "trigger_type": req.trigger_type,
        "trigger_params": req.trigger_params,
        "result": result,
        "severity_summary": severity_counts,
        "property_id": req.property_id,
        "created_at": _now(),
    })

    return {
        "ripple_id": ripple_id,
        "trigger_type": req.trigger_type,
        "result": result,
        "severity_summary": severity_counts,
        "timestamp": _now(),
    }


@router.get("/history")
async def ripple_history(limit: int = Query(20)):
    """Get recent ripple propagation history."""
    ripples = list(db["ai3_ripples"].find(
        {}, {"_id": 0, "ripple_id": 1, "trigger_type": 1, "trigger_params": 1, "severity_summary": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit))
    return {"ripples": ripples, "count": len(ripples)}
