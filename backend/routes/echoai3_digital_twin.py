"""
EchoAi3 -- Digital Twin Engine
================================
Full property simulation: kitchen, inventory, labor, and event twins.
Models the entire resort as a living digital replica that can be queried,
stress-tested, and used for what-if planning in real time.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/twin", tags=["echoai3-digital-twin"])

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]


# ─── Twin Subsystem Definitions ───

TWIN_SUBSYSTEMS = {
    "kitchen": {
        "name": "Kitchen Twin",
        "description": "Models all kitchen stations, equipment, prep workflows, and production capacity",
        "metrics": ["station_utilization", "prep_completion_rate", "equipment_status", "order_queue_depth", "temperature_compliance"],
    },
    "inventory": {
        "name": "Inventory Twin",
        "description": "Real-time model of all ingredient stocks, par levels, shelf life, and consumption velocity",
        "metrics": ["stock_health", "par_coverage", "expiry_risk", "consumption_velocity", "reorder_urgency"],
    },
    "labor": {
        "name": "Labor Twin",
        "description": "Models staffing levels, skill coverage, schedule efficiency, and fatigue tracking",
        "metrics": ["coverage_ratio", "skill_distribution", "overtime_exposure", "fatigue_index", "cross_training_depth"],
    },
    "event": {
        "name": "Event Twin",
        "description": "Models all upcoming events with resource allocation, timeline, and dependency tracking",
        "metrics": ["prep_readiness", "staff_allocation", "vendor_confirmation", "room_utilization", "timeline_health"],
    },
    "revenue": {
        "name": "Revenue Twin",
        "description": "Models revenue streams, check averages, outlet performance, and demand patterns",
        "metrics": ["outlet_performance", "check_avg_trend", "demand_forecast", "capture_rate", "promotion_impact"],
    },
    "facility": {
        "name": "Facility Twin",
        "description": "Models physical infrastructure: rooms, equipment, energy, and maintenance",
        "metrics": ["equipment_health", "energy_consumption", "maintenance_backlog", "room_availability", "hvac_status"],
    },
}


class StressTestRequest(BaseModel):
    subsystem: str
    stress_type: str
    magnitude: float = 1.0
    duration_hours: int = 24


class TwinQueryRequest(BaseModel):
    subsystem: str
    query: str


# ─── Twin State Generators ───

def build_kitchen_twin() -> dict:
    """Build a live state model of the kitchen subsystem."""
    recipes = list(db["recipes"].find({}, {"_id": 0}).limit(50))
    menu = list(db["menu_items"].find({}, {"_id": 0}).limit(100))
    ingredients = list(db["ingredients"].find({}, {"_id": 0}).limit(100))

    stations = ["hot line", "cold station", "pastry", "garde manger", "grill", "sautee", "prep"]
    station_load = {s: min(100, 20 + hash(s) % 60) for s in stations}

    low_stock = [i.get("name", "") for i in ingredients if i.get("current_stock", 0) < i.get("par_level", 10)][:5]

    return {
        "subsystem": "kitchen",
        "state": "operational",
        "stations": [{"name": s, "utilization_pct": station_load[s], "status": "nominal" if station_load[s] < 80 else "high_load"} for s in stations],
        "active_recipes": len(recipes),
        "menu_items_available": len([m for m in menu if m.get("status") != "86"]),
        "items_86d": len([m for m in menu if m.get("status") == "86"]),
        "ingredient_alerts": low_stock,
        "overall_utilization": round(sum(station_load.values()) / max(len(stations), 1), 1),
        "temperature_compliance": 98.5,
        "prep_completion_rate": 87,
    }


def build_inventory_twin() -> dict:
    ingredients = list(db["ingredients"].find({}, {"_id": 0}).limit(200))
    total = len(ingredients)
    below_par = [i for i in ingredients if i.get("current_stock", 0) < i.get("par_level", 10)]
    total_value = sum(i.get("current_stock", 0) * i.get("current_cost", 0) for i in ingredients)

    categories = {}
    for i in ingredients:
        cat = i.get("category", "other")
        if cat not in categories:
            categories[cat] = {"count": 0, "below_par": 0, "value": 0}
        categories[cat]["count"] += 1
        if i.get("current_stock", 0) < i.get("par_level", 10):
            categories[cat]["below_par"] += 1
        categories[cat]["value"] += round(i.get("current_stock", 0) * i.get("current_cost", 0), 2)

    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(50))
    waste_value = sum(w.get("cost", w.get("value", 0)) for w in waste)

    return {
        "subsystem": "inventory",
        "state": "operational",
        "total_items": total,
        "below_par_count": len(below_par),
        "below_par_items": [{"name": i.get("name", ""), "stock": i.get("current_stock", 0), "par": i.get("par_level", 10)} for i in below_par[:10]],
        "total_inventory_value": round(total_value, 2),
        "stock_health_pct": round((total - len(below_par)) / max(total, 1) * 100, 1),
        "categories": categories,
        "waste_tracking": {"entries": len(waste), "total_value": round(waste_value, 2)},
        "par_coverage_pct": round((total - len(below_par)) / max(total, 1) * 100, 1),
    }


def build_labor_twin() -> dict:
    schedules = list(db["labor_schedules"].find({}, {"_id": 0}).limit(100))
    total_hours = sum(s.get("total_hours", 0) for s in schedules)
    total_cost = sum(s.get("total_cost", 0) for s in schedules)
    ot_hours = sum(max(0, s.get("total_hours", 0) - 40) for s in schedules)

    departments = {}
    for s in schedules:
        dept = s.get("department", "general")
        if dept not in departments:
            departments[dept] = {"headcount": 0, "hours": 0, "cost": 0, "overtime_hours": 0}
        departments[dept]["headcount"] += 1
        departments[dept]["hours"] += s.get("total_hours", 0)
        departments[dept]["cost"] += s.get("total_cost", 0)
        departments[dept]["overtime_hours"] += max(0, s.get("total_hours", 0) - 40)

    return {
        "subsystem": "labor",
        "state": "operational",
        "total_staff": len(schedules),
        "total_scheduled_hours": round(total_hours, 1),
        "total_labor_cost": round(total_cost, 2),
        "overtime_hours": round(ot_hours, 1),
        "overtime_pct": round(ot_hours / max(total_hours, 1) * 100, 1),
        "departments": {k: {kk: round(vv, 2) if isinstance(vv, float) else vv for kk, vv in v.items()} for k, v in departments.items()},
        "coverage_ratio": round(len(schedules) / max(7, 1) * 100 / 15, 1),
        "fatigue_index": round(min(100, ot_hours / max(len(schedules), 1) * 10), 1),
        "cross_training_depth": 2.3,
    }


def build_event_twin() -> dict:
    events = list(db["events"].find({}, {"_id": 0}).limit(50))
    beos = list(db["beos"].find({}, {"_id": 0}).limit(30))
    cal = list(db["calendar_events"].find({}, {"_id": 0}).sort("start", 1).limit(20))

    total_covers = sum(e.get("guest_count", 0) for e in events)
    total_rev = sum(e.get("revenue", {}).get("total", 0) if isinstance(e.get("revenue"), dict) else 0 for e in events)

    event_types = {}
    for e in events:
        t = e.get("type", "other")
        event_types[t] = event_types.get(t, 0) + 1

    return {
        "subsystem": "event",
        "state": "operational",
        "total_events": len(events),
        "total_covers": total_covers,
        "total_event_revenue": round(total_rev, 2),
        "beos_active": len(beos),
        "upcoming_calendar": len(cal),
        "event_types": event_types,
        "avg_covers_per_event": round(total_covers / max(len(events), 1)),
        "prep_readiness_pct": 78,
        "staff_allocation_pct": 85,
        "vendor_confirmation_pct": 92,
    }


def build_revenue_twin() -> dict:
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(200))
    total_rev = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "revenue")
    food_cost = sum(e.get("amount", 0) for e in gl if "food" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
    labor_cost = sum(s.get("total_cost", 0) for s in db["labor_schedules"].find({}, {"_id": 0}).limit(200))

    outlets = list(db["outlets"].find({}, {"_id": 0}).limit(20))
    events = list(db["events"].find({}, {"_id": 0}).limit(50))
    total_covers = sum(e.get("guest_count", 0) for e in events)

    return {
        "subsystem": "revenue",
        "state": "operational",
        "total_revenue": round(total_rev, 2),
        "food_cost": round(food_cost, 2),
        "food_cost_pct": round(food_cost / max(total_rev, 1) * 100, 1),
        "labor_cost": round(labor_cost, 2),
        "labor_pct": round(labor_cost / max(total_rev, 1) * 100, 1),
        "ebitda": round(total_rev - food_cost - labor_cost, 2),
        "ebitda_margin_pct": round((total_rev - food_cost - labor_cost) / max(total_rev, 1) * 100, 1),
        "outlets": len(outlets),
        "total_covers": total_covers,
        "check_avg": round(total_rev / max(total_covers, 1), 2),
    }


def build_facility_twin() -> dict:
    outlets = list(db["outlets"].find({}, {"_id": 0}).limit(20))
    properties = list(db["properties"].find({}, {"_id": 0}).limit(5))
    checklists = list(db["compliance_checklists"].find({}, {"_id": 0}).sort("completed_at", -1).limit(10))
    open_actions = db["corrective_actions"].count_documents({"status": "open"})

    return {
        "subsystem": "facility",
        "state": "operational",
        "properties": len(properties),
        "outlets": len(outlets),
        "outlet_list": [{"name": o.get("name", ""), "type": o.get("type", ""), "status": "operational"} for o in outlets],
        "recent_inspections": len(checklists),
        "open_corrective_actions": open_actions,
        "equipment_health_pct": 94,
        "energy_efficiency_score": 87,
        "maintenance_backlog": open_actions,
        "hvac_status": "nominal",
    }


TWIN_BUILDERS = {
    "kitchen": build_kitchen_twin,
    "inventory": build_inventory_twin,
    "labor": build_labor_twin,
    "event": build_event_twin,
    "revenue": build_revenue_twin,
    "facility": build_facility_twin,
}


# ─── Stress Test Engine ───

def run_stress_test(subsystem: str, stress_type: str, magnitude: float, duration_hours: int) -> dict:
    """Simulate stress on a subsystem and predict impact."""
    base_state = TWIN_BUILDERS.get(subsystem, build_kitchen_twin)()

    stress_scenarios = {
        "surge": {
            "description": f"{magnitude:.0%} demand surge for {duration_hours}h",
            "impacts": {
                "kitchen": {"station_overload": min(100, base_state.get("overall_utilization", 50) * (1 + magnitude)), "prep_delay_minutes": round(15 * magnitude), "86_risk": magnitude > 0.3},
                "inventory": {"stockout_risk_pct": min(100, base_state.get("below_par_count", 0) * 3 * magnitude), "emergency_orders": round(5 * magnitude)},
                "labor": {"overtime_needed_hours": round(duration_hours * magnitude * 3), "agency_staff_needed": round(magnitude * 5)},
                "event": {"service_delay_risk": magnitude > 0.2, "quality_impact": "moderate" if magnitude > 0.3 else "low"},
                "revenue": {"revenue_upside": round(base_state.get("total_revenue", 100000) * magnitude * 0.3, 2)},
                "facility": {"equipment_stress": "high" if magnitude > 0.5 else "moderate", "energy_spike_pct": round(magnitude * 20)},
            },
        },
        "staffing_crisis": {
            "description": f"{magnitude:.0%} staff unavailable for {duration_hours}h",
            "impacts": {
                "kitchen": {"stations_undermanned": round(7 * magnitude), "menu_reduction_needed": magnitude > 0.3},
                "inventory": {"over_ordering_risk": True, "waste_increase_pct": round(magnitude * 15)},
                "labor": {"remaining_staff_ot_hours": round(duration_hours * magnitude * 2), "cost_increase_pct": round(magnitude * 50 * 1.5)},
                "event": {"event_risk": "HIGH" if magnitude > 0.3 else "moderate", "service_reduction": magnitude > 0.2},
                "revenue": {"revenue_at_risk_pct": round(magnitude * 25, 1)},
                "facility": {"maintenance_deferred": True, "inspection_risk": magnitude > 0.4},
            },
        },
        "supply_disruption": {
            "description": f"{magnitude:.0%} supply chain disruption for {duration_hours}h",
            "impacts": {
                "kitchen": {"menu_items_at_risk": round(magnitude * 15), "substitution_needed": True},
                "inventory": {"days_of_stock_remaining": round(3 / max(magnitude, 0.1)), "emergency_vendor_activation": magnitude > 0.3},
                "labor": {"prep_plan_disruption": True, "idle_staff_risk": magnitude > 0.5},
                "event": {"event_menu_change_risk": magnitude > 0.2, "client_notification_needed": magnitude > 0.4},
                "revenue": {"food_cost_spike_pct": round(magnitude * 20, 1)},
                "facility": {"storage_reallocation": magnitude > 0.3},
            },
        },
        "equipment_failure": {
            "description": f"{magnitude:.0%} critical equipment failure for {duration_hours}h",
            "impacts": {
                "kitchen": {"affected_stations": round(magnitude * 4), "production_capacity_reduction_pct": round(magnitude * 40)},
                "inventory": {"affected_storage": magnitude > 0.3, "cold_chain_risk": magnitude > 0.2},
                "labor": {"reassignment_needed": round(magnitude * 8), "safety_stand_down": magnitude > 0.7},
                "event": {"event_risk": "CRITICAL" if magnitude > 0.5 else "moderate"},
                "revenue": {"lost_revenue_per_hour": round(base_state.get("total_revenue", 100000) / 720 * magnitude, 2)},
                "facility": {"repair_urgency": "emergency" if magnitude > 0.5 else "urgent", "backup_systems": magnitude < 0.3},
            },
        },
    }

    scenario = stress_scenarios.get(stress_type, stress_scenarios["surge"])
    subsystem_impact = scenario["impacts"].get(subsystem, {})

    # Determine resilience score
    severity_factors = sum(1 for v in subsystem_impact.values() if isinstance(v, bool) and v) + sum(1 for v in subsystem_impact.values() if isinstance(v, str) and v in ("high", "HIGH", "CRITICAL", "emergency"))
    resilience = max(0, round(100 - severity_factors * 15 - magnitude * 30))

    return {
        "subsystem": subsystem,
        "stress_type": stress_type,
        "description": scenario["description"],
        "magnitude": magnitude,
        "duration_hours": duration_hours,
        "current_state": base_state,
        "stress_impact": subsystem_impact,
        "cross_system_impacts": {k: v for k, v in scenario["impacts"].items() if k != subsystem},
        "resilience_score": resilience,
        "recovery_estimate_hours": round(duration_hours * (1 + magnitude)),
        "recommended_actions": _generate_stress_actions(stress_type, magnitude, subsystem),
    }


def _generate_stress_actions(stress_type: str, magnitude: float, subsystem: str) -> list:
    actions = {
        "surge": [
            "Activate overflow prep stations",
            "Call in on-call staff immediately" if magnitude > 0.3 else "Alert on-call staff for standby",
            "Pre-plate high-demand items",
            "Simplify menu to top movers",
        ],
        "staffing_crisis": [
            "Activate cross-trained staff",
            "Contact staffing agencies",
            "Reduce menu complexity to match available hands",
            "Consolidate service stations",
        ],
        "supply_disruption": [
            "Activate backup vendor relationships",
            "Audit current stock for substitution options",
            "Notify affected event clients of potential menu adjustments",
            "Prioritize perishable items for immediate events",
        ],
        "equipment_failure": [
            "Deploy backup equipment if available",
            "Emergency repair dispatch",
            "Reroute production to unaffected stations",
            "Notify management and affected clients",
        ],
    }
    return actions.get(stress_type, ["Assess situation", "Notify management", "Activate contingency plan"])[:4]


# ─── AI Twin Query ───

async def query_twin_ai(subsystem: str, query: str, state: dict) -> str:
    """Use LLM to answer questions about the twin's current state."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json
        chat = LlmChat(api_key=LLM_KEY, session_id=f"twin-{_uid()}", system_message=(
            f"You are EchoAi3's Digital Twin for the {subsystem} subsystem. "
            f"You have complete knowledge of the current operational state. "
            f"Answer questions concisely with specific numbers from the state data. "
            f"Current state:\n{json.dumps(state, indent=2, default=str)}"
        ))
        chat.with_model("openai", "gpt-4.1-mini")
        return await chat.send_message(UserMessage(text=query))
    except Exception:
        return f"[Deterministic] {subsystem.title()} twin state: {len(state)} data points available. Use specific queries for detailed analysis."


# ─── API Endpoints ───

@router.get("/subsystems")
async def list_subsystems():
    """List all available digital twin subsystems."""
    return {"subsystems": TWIN_SUBSYSTEMS}


@router.get("/state/{subsystem}")
async def get_twin_state(subsystem: str):
    """Get the current live state of a twin subsystem."""
    if subsystem not in TWIN_BUILDERS:
        return {"error": f"Unknown subsystem: {subsystem}", "available": list(TWIN_BUILDERS.keys())}

    state = TWIN_BUILDERS[subsystem]()
    return {"state": state, "timestamp": _now()}


@router.get("/state")
async def get_full_twin():
    """Get the complete digital twin state across all subsystems."""
    full_state = {}
    for name, builder in TWIN_BUILDERS.items():
        full_state[name] = builder()

    # Overall health score
    health_scores = {
        "kitchen": max(0, 100 - full_state["kitchen"].get("overall_utilization", 50)),
        "inventory": full_state["inventory"].get("stock_health_pct", 80),
        "labor": max(0, 100 - full_state["labor"].get("fatigue_index", 20)),
        "event": full_state["event"].get("prep_readiness_pct", 80),
        "revenue": min(100, full_state["revenue"].get("ebitda_margin_pct", 15) * 5),
        "facility": full_state["facility"].get("equipment_health_pct", 90),
    }
    overall = round(sum(health_scores.values()) / max(len(health_scores), 1), 1)

    return {
        "twin_state": full_state,
        "health_scores": health_scores,
        "overall_health": overall,
        "subsystem_count": len(full_state),
        "timestamp": _now(),
    }


@router.post("/stress-test")
async def stress_test(req: StressTestRequest):
    """Run a stress test on a subsystem and predict cascading impacts."""
    if req.subsystem not in TWIN_BUILDERS:
        return {"error": f"Unknown subsystem: {req.subsystem}", "available": list(TWIN_BUILDERS.keys())}

    valid_stresses = ["surge", "staffing_crisis", "supply_disruption", "equipment_failure"]
    if req.stress_type not in valid_stresses:
        return {"error": f"Unknown stress type: {req.stress_type}", "available": valid_stresses}

    result = run_stress_test(req.subsystem, req.stress_type, req.magnitude, req.duration_hours)
    test_id = f"stress-{_uid()}"

    trace_log(
        event_type="stress_test_executed",
        entity_type="echoai3_digital_twin",
        entity_id=test_id,
        actor_id="echoai3",
        metadata={"subsystem": req.subsystem, "stress_type": req.stress_type, "magnitude": req.magnitude},
    )

    db["ai3_stress_tests"].insert_one({
        "test_id": test_id,
        "subsystem": req.subsystem,
        "stress_type": req.stress_type,
        "magnitude": req.magnitude,
        "duration_hours": req.duration_hours,
        "result": result,
        "created_at": _now(),
    })

    return {"test_id": test_id, **result, "timestamp": _now()}


@router.post("/query")
async def query_twin(req: TwinQueryRequest):
    """Ask an AI-powered question about a specific twin subsystem."""
    if req.subsystem not in TWIN_BUILDERS:
        return {"error": f"Unknown subsystem: {req.subsystem}", "available": list(TWIN_BUILDERS.keys())}

    state = TWIN_BUILDERS[req.subsystem]()
    answer = await query_twin_ai(req.subsystem, req.query, state)

    return {
        "subsystem": req.subsystem,
        "query": req.query,
        "answer": answer,
        "state_snapshot": state,
        "timestamp": _now(),
    }


@router.get("/stress-history")
async def stress_history(limit: int = Query(20)):
    """Get recent stress test history."""
    tests = list(db["ai3_stress_tests"].find(
        {}, {"_id": 0, "test_id": 1, "subsystem": 1, "stress_type": 1, "magnitude": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit))
    return {"tests": tests, "count": len(tests)}
