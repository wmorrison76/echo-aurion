"""
Compliance & HACCP Engine
=========================
Food safety checklists, health inspection prep, temperature logs,
audit trails, corrective actions. No competitor has this integrated.
"""
import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

import database
db = database.db

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

def _now(): return datetime.now(timezone.utc).isoformat()
def _uid(): return str(uuid.uuid4())[:12]


# ── HACCP Templates ─────────────────────────────────────────────────────

HACCP_TEMPLATES = [
    {
        "id": "haccp-receiving",
        "name": "Receiving Inspection",
        "category": "receiving",
        "frequency": "per_delivery",
        "items": [
            {"id": "ri-1", "check": "Temperature of refrigerated items <= 41°F (5°C)", "type": "temperature", "critical": True},
            {"id": "ri-2", "check": "Temperature of frozen items <= 0°F (-18°C)", "type": "temperature", "critical": True},
            {"id": "ri-3", "check": "Packaging intact, no damage or contamination", "type": "visual", "critical": True},
            {"id": "ri-4", "check": "Expiration dates verified and acceptable", "type": "date_check", "critical": True},
            {"id": "ri-5", "check": "Delivery vehicle clean and at proper temperature", "type": "visual", "critical": False},
            {"id": "ri-6", "check": "Invoice matches purchase order quantities", "type": "count", "critical": False},
        ],
    },
    {
        "id": "haccp-cooling",
        "name": "Cooling Process Log",
        "category": "production",
        "frequency": "per_batch",
        "items": [
            {"id": "cl-1", "check": "Food cooled from 135°F to 70°F within 2 hours", "type": "temperature", "critical": True},
            {"id": "cl-2", "check": "Food cooled from 70°F to 41°F within 4 hours", "type": "temperature", "critical": True},
            {"id": "cl-3", "check": "Cooling method documented (ice bath, blast chiller, etc.)", "type": "text", "critical": False},
            {"id": "cl-4", "check": "Product labeled with date, time, and contents", "type": "visual", "critical": True},
        ],
    },
    {
        "id": "haccp-cooking",
        "name": "Cooking Temperature Verification",
        "category": "production",
        "frequency": "per_item",
        "items": [
            {"id": "ck-1", "check": "Poultry internal temp >= 165°F (74°C) for 15 sec", "type": "temperature", "critical": True},
            {"id": "ck-2", "check": "Ground meats >= 155°F (68°C) for 17 sec", "type": "temperature", "critical": True},
            {"id": "ck-3", "check": "Seafood, steaks, eggs >= 145°F (63°C) for 15 sec", "type": "temperature", "critical": True},
            {"id": "ck-4", "check": "Fruits/vegetables for hot holding >= 135°F (57°C)", "type": "temperature", "critical": True},
            {"id": "ck-5", "check": "Thermometer calibrated today", "type": "verification", "critical": True},
        ],
    },
    {
        "id": "haccp-holding",
        "name": "Hot & Cold Holding Log",
        "category": "service",
        "frequency": "every_2_hours",
        "items": [
            {"id": "hh-1", "check": "Hot food held at >= 135°F (57°C)", "type": "temperature", "critical": True},
            {"id": "hh-2", "check": "Cold food held at <= 41°F (5°C)", "type": "temperature", "critical": True},
            {"id": "hh-3", "check": "Sneeze guards in place for buffet items", "type": "visual", "critical": False},
            {"id": "hh-4", "check": "Utensils changed every 2 hours or sooner", "type": "visual", "critical": False},
            {"id": "hh-5", "check": "Time-stamped labels on display items", "type": "visual", "critical": True},
        ],
    },
    {
        "id": "haccp-sanitation",
        "name": "Daily Sanitation Checklist",
        "category": "sanitation",
        "frequency": "daily",
        "items": [
            {"id": "sn-1", "check": "All food contact surfaces cleaned and sanitized", "type": "visual", "critical": True},
            {"id": "sn-2", "check": "Sanitizer concentration test: 50-100 ppm chlorine or 200-400 ppm quat", "type": "test_strip", "critical": True},
            {"id": "sn-3", "check": "Handwashing stations stocked (soap, towels, warm water)", "type": "visual", "critical": True},
            {"id": "sn-4", "check": "Floors, walls, ceilings clean — no grease buildup", "type": "visual", "critical": False},
            {"id": "sn-5", "check": "Waste receptacles emptied and cleaned", "type": "visual", "critical": False},
            {"id": "sn-6", "check": "No pest evidence (droppings, gnaw marks, nesting)", "type": "visual", "critical": True},
        ],
    },
    {
        "id": "haccp-walkin",
        "name": "Walk-In Cooler/Freezer Log",
        "category": "storage",
        "frequency": "twice_daily",
        "items": [
            {"id": "wk-1", "check": "Walk-in cooler temperature 36-41°F (2-5°C)", "type": "temperature", "critical": True},
            {"id": "wk-2", "check": "Walk-in freezer temperature 0°F or below (-18°C)", "type": "temperature", "critical": True},
            {"id": "wk-3", "check": "FIFO organization maintained", "type": "visual", "critical": False},
            {"id": "wk-4", "check": "All items labeled with date received and use-by date", "type": "visual", "critical": True},
            {"id": "wk-5", "check": "Raw meats stored below ready-to-eat foods", "type": "visual", "critical": True},
            {"id": "wk-6", "check": "Door seals intact, no condensation issues", "type": "visual", "critical": False},
        ],
    },
    {
        "id": "haccp-allergen",
        "name": "Allergen Management Protocol",
        "category": "allergen",
        "frequency": "per_service",
        "items": [
            {"id": "al-1", "check": "Allergen reference chart posted and current", "type": "visual", "critical": True},
            {"id": "al-2", "check": "Staff briefed on today's allergen items", "type": "verification", "critical": True},
            {"id": "al-3", "check": "Dedicated allergen-free prep area available", "type": "visual", "critical": True},
            {"id": "al-4", "check": "Color-coded utensils for allergen-free prep in use", "type": "visual", "critical": False},
            {"id": "al-5", "check": "Manager verified special dietary plates before service", "type": "verification", "critical": True},
        ],
    },
]


class ChecklistSubmission(BaseModel):
    template_id: str
    outlet_id: str
    completed_by: str
    items: list  # [{item_id, passed: bool, value: str/float, notes: str}]
    corrective_actions: Optional[list] = []


class CorrectiveAction(BaseModel):
    checklist_id: str
    item_id: str
    description: str
    assigned_to: str
    due_date: str
    priority: Optional[str] = "high"


class TemperatureLog(BaseModel):
    location: str  # walk-in-1, freezer-1, hot-hold-station-3
    outlet_id: str
    temperature: float
    unit: Optional[str] = "F"
    recorded_by: str
    equipment_id: Optional[str] = None
    notes: Optional[str] = ""


# ── Endpoints ──

@router.get("/haccp-templates")
def list_haccp_templates(category: Optional[str] = None):
    templates = HACCP_TEMPLATES
    if category:
        templates = [t for t in templates if t["category"] == category]
    return {"templates": templates, "total": len(templates)}


@router.get("/haccp-templates/{template_id}")
def get_haccp_template(template_id: str):
    for t in HACCP_TEMPLATES:
        if t["id"] == template_id:
            return t
    raise HTTPException(404, "Template not found")


@router.post("/checklists")
def submit_checklist(data: ChecklistSubmission):
    template = None
    for t in HACCP_TEMPLATES:
        if t["id"] == data.template_id:
            template = t
            break
    if not template:
        raise HTTPException(404, "Template not found")

    total = len(data.items)
    passed = len([i for i in data.items if i.get("passed")])
    critical_items = [i for i in template["items"] if i.get("critical")]
    critical_ids = {i["id"] for i in critical_items}
    critical_failed = [
        i for i in data.items
        if i.get("item_id") in critical_ids and not i.get("passed")
    ]

    doc = {
        "id": f"chk-{_uid()}",
        "template_id": data.template_id,
        "template_name": template["name"],
        "outlet_id": data.outlet_id,
        "completed_by": data.completed_by,
        "items": data.items,
        "corrective_actions": data.corrective_actions,
        "score": round(passed / max(total, 1) * 100, 1),
        "total_items": total,
        "passed_items": passed,
        "critical_failures": len(critical_failed),
        "status": "failed" if critical_failed else "passed",
        "completed_at": _now(),
    }
    db["compliance_checklists"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/checklists")
def list_checklists(
    outlet_id: Optional[str] = None,
    template_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
):
    q = {}
    if outlet_id:
        q["outlet_id"] = outlet_id
    if template_id:
        q["template_id"] = template_id
    if status:
        q["status"] = status
    checklists = list(db["compliance_checklists"].find(q, {"_id": 0}).sort("completed_at", -1).limit(limit))
    return {"checklists": checklists, "total": len(checklists)}


@router.post("/corrective-actions")
def create_corrective_action(data: CorrectiveAction):
    doc = {
        "id": f"ca-{_uid()}",
        **data.model_dump(),
        "status": "open",
        "created_at": _now(),
        "resolved_at": None,
    }
    db["corrective_actions"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/corrective-actions")
def list_corrective_actions(status: Optional[str] = None):
    q = {"status": status} if status else {}
    actions = list(db["corrective_actions"].find(q, {"_id": 0}).sort("created_at", -1))
    return {"actions": actions, "total": len(actions)}


@router.post("/corrective-actions/{action_id}/resolve")
def resolve_corrective_action(action_id: str, resolved_by: str = "manager"):
    result = db["corrective_actions"].find_one_and_update(
        {"id": action_id},
        {"$set": {"status": "resolved", "resolved_at": _now(), "resolved_by": resolved_by}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Corrective action not found")
    result.pop("_id", None)
    return result


# ── Temperature Monitoring ──

@router.post("/temperature-logs")
def log_temperature(data: TemperatureLog):
    doc = {
        "id": f"temp-{_uid()}",
        **data.model_dump(),
        "timestamp": _now(),
        "alert": data.temperature > 41 and "cooler" in data.location.lower(),
    }
    db["temperature_logs"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/temperature-logs")
def list_temperature_logs(
    location: Optional[str] = None,
    outlet_id: Optional[str] = None,
    alerts_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
):
    q = {}
    if location:
        import re as _re
        q["location"] = {"$regex": _re.escape(location), "$options": "i"}
    if outlet_id:
        q["outlet_id"] = outlet_id
    if alerts_only:
        q["alert"] = True
    logs = list(db["temperature_logs"].find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return {"logs": logs, "total": len(logs)}


# ── Health Inspection Readiness ──

@router.get("/inspection-readiness")
def inspection_readiness(outlet_id: Optional[str] = None):
    """Score the outlet's readiness for a health inspection."""
    q = {}
    if outlet_id:
        q["outlet_id"] = outlet_id

    checklists = list(db["compliance_checklists"].find(q, {"_id": 0}).sort("completed_at", -1).limit(50))
    open_actions = list(db["corrective_actions"].find({"status": "open"}, {"_id": 0}))
    temp_alerts = list(db["temperature_logs"].find({"alert": True}, {"_id": 0}).sort("timestamp", -1).limit(10))

    avg_score = sum(c.get("score", 0) for c in checklists) / max(len(checklists), 1) if checklists else 0
    critical_failures = sum(c.get("critical_failures", 0) for c in checklists[-10:]) if checklists else 0

    readiness_score = max(0, min(100, avg_score - (critical_failures * 5) - (len(open_actions) * 3) - (len(temp_alerts) * 2)))

    return {
        "readiness_score": round(readiness_score, 1),
        "grade": "A" if readiness_score >= 90 else "B" if readiness_score >= 80 else "C" if readiness_score >= 70 else "F",
        "checklists_completed": len(checklists),
        "avg_checklist_score": round(avg_score, 1),
        "critical_failures_recent": critical_failures,
        "open_corrective_actions": len(open_actions),
        "temperature_alerts": len(temp_alerts),
        "recommendations": _generate_recommendations(checklists, open_actions, temp_alerts),
    }


def _generate_recommendations(checklists, open_actions, temp_alerts):
    recs = []
    if not checklists:
        recs.append({"priority": "critical", "message": "No HACCP checklists completed. Start with Daily Sanitation and Walk-In Cooler logs."})
    if open_actions:
        recs.append({"priority": "high", "message": f"{len(open_actions)} corrective actions still open. Resolve before inspection."})
    if temp_alerts:
        recs.append({"priority": "high", "message": f"{len(temp_alerts)} recent temperature alerts. Check equipment calibration."})
    if checklists and any(c.get("critical_failures", 0) > 0 for c in checklists[-5:]):
        recs.append({"priority": "critical", "message": "Recent critical failures detected. Immediate staff retraining required."})
    if not recs:
        recs.append({"priority": "info", "message": "Good standing. Continue daily checklist completion and temperature monitoring."})
    return recs
