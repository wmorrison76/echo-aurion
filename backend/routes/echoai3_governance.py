"""
EchoAi3 -- Policy & Governance Engine
========================================
Enforces role-based permission limits on EchoAi3 recommendations.
Cost thresholds, authority limits, brand standards, and approval workflows.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database
from tamper_audit import log_entry as trace_log

db = database.db
router = APIRouter(prefix="/api/echoai3/governance", tags=["echoai3-governance"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: uuid4().hex[:12]


# ─── Policy Definitions ───

AUTHORITY_MATRIX = {
    "owner": {
        "spending_limit": float("inf"),
        "can_approve": ["all"],
        "can_override": True,
        "restricted_data": [],
    },
    "gm": {
        "spending_limit": 50000,
        "can_approve": ["vendor_contracts", "labor_adjustments", "menu_changes", "event_pricing", "capex_under_50k"],
        "can_override": True,
        "restricted_data": ["owner_compensation", "investor_data"],
    },
    "controller": {
        "spending_limit": 25000,
        "can_approve": ["vendor_payments", "budget_adjustments", "gl_corrections"],
        "can_override": False,
        "restricted_data": ["owner_compensation", "executive_bonuses"],
    },
    "exec_chef": {
        "spending_limit": 10000,
        "can_approve": ["menu_changes", "recipe_updates", "vendor_food_orders", "kitchen_equipment"],
        "can_override": False,
        "restricted_data": ["payroll", "executive_financials", "investor_data"],
    },
    "director": {
        "spending_limit": 5000,
        "can_approve": ["department_purchases", "schedule_changes"],
        "can_override": False,
        "restricted_data": ["payroll", "compensation", "vendor_pricing", "p_and_l"],
    },
    "manager": {
        "spending_limit": 2000,
        "can_approve": ["daily_purchases", "shift_swaps"],
        "can_override": False,
        "restricted_data": ["payroll", "compensation", "vendor_pricing", "p_and_l", "capex"],
    },
    "supervisor": {
        "spending_limit": 500,
        "can_approve": ["shift_coverage"],
        "can_override": False,
        "restricted_data": ["all_financial", "vendor", "payroll"],
    },
    "staff": {
        "spending_limit": 0,
        "can_approve": [],
        "can_override": False,
        "restricted_data": ["all_financial", "vendor", "payroll", "management"],
    },
}

COST_THRESHOLDS = {
    "food_cost_pct": {"warning": 22, "critical": 28, "action": "Menu engineering review and vendor renegotiation"},
    "labor_pct": {"warning": 32, "critical": 38, "action": "Schedule optimization and cross-training audit"},
    "beverage_cost_pct": {"warning": 25, "critical": 32, "action": "Pour analysis and inventory count verification"},
    "waste_pct": {"warning": 1.5, "critical": 3.0, "action": "FIFO audit, portion control review, production forecasting"},
    "overtime_pct": {"warning": 5, "critical": 10, "action": "Staffing model review and agency utilization"},
}

BRAND_STANDARDS = {
    "minimum_menu_items": 12,
    "maximum_86d_items": 3,
    "service_time_max_minutes": 15,
    "allergen_labels_required": True,
    "temperature_log_frequency": "every_4_hours",
    "guest_complaint_response_minutes": 5,
    "food_safety_cert_required": True,
    "uniform_standard_enforced": True,
}


class PolicyCheckRequest(BaseModel):
    role: str
    action_type: str
    amount: float = 0.0
    description: Optional[str] = None


class ThresholdCheckRequest(BaseModel):
    metric: str
    value: float


class ApprovalRequest(BaseModel):
    requester_role: str
    requester_id: str
    action_type: str
    amount: float
    description: str
    urgency: str = "normal"


# ─── Policy Engine ───

def check_authority(role: str, action_type: str, amount: float) -> dict:
    """Check if a role has authority for a specific action and amount."""
    auth = AUTHORITY_MATRIX.get(role, AUTHORITY_MATRIX["staff"])

    within_limit = amount <= auth["spending_limit"]
    can_approve_action = "all" in auth["can_approve"] or action_type in auth["can_approve"]
    approved = within_limit and can_approve_action

    result = {
        "role": role,
        "action": action_type,
        "amount": amount,
        "approved": approved,
        "spending_limit": auth["spending_limit"] if auth["spending_limit"] != float("inf") else "unlimited",
        "within_spending_limit": within_limit,
        "action_permitted": can_approve_action,
        "can_override": auth["can_override"],
    }

    if not approved:
        # Determine who can approve
        escalation = []
        for r, a in AUTHORITY_MATRIX.items():
            if (amount <= a["spending_limit"] or a["spending_limit"] == float("inf")) and ("all" in a["can_approve"] or action_type in a["can_approve"]):
                escalation.append(r)
        result["escalate_to"] = escalation[:3]
        result["reason"] = "Amount exceeds spending limit" if not within_limit else "Action not in permitted list"

    return result


def check_threshold(metric: str, value: float) -> dict:
    """Check a metric against cost thresholds."""
    thresh = COST_THRESHOLDS.get(metric)
    if not thresh:
        return {"metric": metric, "value": value, "status": "unknown", "message": "No threshold defined"}

    if value >= thresh["critical"]:
        status = "critical"
    elif value >= thresh["warning"]:
        status = "warning"
    else:
        status = "nominal"

    return {
        "metric": metric,
        "value": value,
        "status": status,
        "warning_threshold": thresh["warning"],
        "critical_threshold": thresh["critical"],
        "recommended_action": thresh["action"] if status != "nominal" else "No action needed",
        "breach_amount": round(value - thresh["warning"], 2) if value >= thresh["warning"] else 0,
    }


def compliance_audit() -> dict:
    """Run a comprehensive compliance check against brand standards and policies."""
    violations = []
    checks = []

    # Menu item count
    menu_count = db["menu_items"].count_documents({})
    checks.append({"standard": "minimum_menu_items", "required": BRAND_STANDARDS["minimum_menu_items"], "actual": menu_count, "pass": menu_count >= BRAND_STANDARDS["minimum_menu_items"]})
    if menu_count < BRAND_STANDARDS["minimum_menu_items"]:
        violations.append({"standard": "minimum_menu_items", "severity": "medium", "detail": f"Only {menu_count} menu items active (minimum: {BRAND_STANDARDS['minimum_menu_items']})"})

    # 86'd items
    eightysixed = db["menu_items"].count_documents({"status": "86"})
    checks.append({"standard": "maximum_86d_items", "required": f"<= {BRAND_STANDARDS['maximum_86d_items']}", "actual": eightysixed, "pass": eightysixed <= BRAND_STANDARDS["maximum_86d_items"]})
    if eightysixed > BRAND_STANDARDS["maximum_86d_items"]:
        violations.append({"standard": "maximum_86d_items", "severity": "high", "detail": f"{eightysixed} items 86'd (max: {BRAND_STANDARDS['maximum_86d_items']})"})

    # Compliance checklists
    checklists = list(db["compliance_checklists"].find({}, {"_id": 0}).sort("completed_at", -1).limit(5))
    overdue = [c for c in checklists if c.get("status") == "overdue"]
    checks.append({"standard": "compliance_checklists", "required": "No overdue", "actual": f"{len(overdue)} overdue", "pass": len(overdue) == 0})
    if overdue:
        violations.append({"standard": "compliance_overdue", "severity": "critical", "detail": f"{len(overdue)} compliance checklists overdue"})

    # Open corrective actions
    open_ca = db["corrective_actions"].count_documents({"status": "open"})
    checks.append({"standard": "open_corrective_actions", "required": "< 5", "actual": open_ca, "pass": open_ca < 5})
    if open_ca >= 5:
        violations.append({"standard": "excessive_corrective_actions", "severity": "high", "detail": f"{open_ca} open corrective actions"})

    # GL financial thresholds
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(200))
    total_rev = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "revenue")
    food_cost = sum(e.get("amount", 0) for e in gl if "food" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
    if total_rev > 0:
        fc_pct = round(food_cost / total_rev * 100, 1)
        thresh_check = check_threshold("food_cost_pct", fc_pct)
        checks.append({"standard": "food_cost_threshold", "required": f"< {COST_THRESHOLDS['food_cost_pct']['warning']}%", "actual": f"{fc_pct}%", "pass": thresh_check["status"] == "nominal"})
        if thresh_check["status"] != "nominal":
            violations.append({"standard": "food_cost_threshold", "severity": thresh_check["status"], "detail": f"Food cost at {fc_pct}% ({thresh_check['status']})"})

    score = round((len(checks) - len(violations)) / max(len(checks), 1) * 100, 1)

    return {
        "compliance_score": score,
        "checks_performed": len(checks),
        "violations": violations,
        "violation_count": len(violations),
        "checks": checks,
        "brand_standards": BRAND_STANDARDS,
    }


# ─── API Endpoints ───

@router.get("/authority-matrix")
async def get_authority_matrix():
    """Get the full authority matrix for all roles."""
    matrix = {}
    for role, auth in AUTHORITY_MATRIX.items():
        matrix[role] = {
            "spending_limit": auth["spending_limit"] if auth["spending_limit"] != float("inf") else "unlimited",
            "can_approve": auth["can_approve"],
            "can_override": auth["can_override"],
            "restricted_data": auth["restricted_data"],
        }
    return {"authority_matrix": matrix}


@router.post("/check-authority")
async def check_authority_endpoint(req: PolicyCheckRequest):
    """Check if a specific role has authority for an action."""
    result = check_authority(req.role, req.action_type, req.amount)

    trace_log(
        event_type="authority_check",
        entity_type="echoai3_governance",
        entity_id=f"auth-{_uid()}",
        actor_id=req.role,
        metadata={"action": req.action_type, "amount": req.amount, "approved": result["approved"]},
    )

    return result


@router.post("/check-threshold")
async def check_threshold_endpoint(req: ThresholdCheckRequest):
    """Check a metric against operational thresholds."""
    return check_threshold(req.metric, req.value)


@router.get("/thresholds")
async def get_thresholds():
    """Get all cost threshold definitions."""
    return {"thresholds": COST_THRESHOLDS}


@router.get("/brand-standards")
async def get_brand_standards():
    """Get brand standard requirements."""
    return {"standards": BRAND_STANDARDS}


@router.get("/compliance-audit")
async def run_compliance_audit():
    """Run a comprehensive compliance audit against all policies and standards."""
    audit = compliance_audit()

    trace_log(
        event_type="compliance_audit",
        entity_type="echoai3_governance",
        entity_id=f"audit-{_uid()}",
        actor_id="echoai3",
        metadata={"score": audit["compliance_score"], "violations": audit["violation_count"]},
    )

    return {**audit, "timestamp": _now()}


@router.post("/request-approval")
async def request_approval(req: ApprovalRequest):
    """Submit an action for approval through the governance workflow."""
    auth_check = check_authority(req.requester_role, req.action_type, req.amount)
    approval_id = f"apv-{_uid()}"

    if auth_check["approved"]:
        status = "auto_approved"
        approver = req.requester_role
    else:
        status = "pending_escalation"
        approver = auth_check.get("escalate_to", ["gm"])[0]

    db["ai3_approvals"].insert_one({
        "approval_id": approval_id,
        "requester_role": req.requester_role,
        "requester_id": req.requester_id,
        "action_type": req.action_type,
        "amount": req.amount,
        "description": req.description,
        "urgency": req.urgency,
        "status": status,
        "approver": approver,
        "authority_check": auth_check,
        "created_at": _now(),
    })

    trace_log(
        event_type="approval_requested",
        entity_type="echoai3_governance",
        entity_id=approval_id,
        actor_id=req.requester_id,
        metadata={"action": req.action_type, "amount": req.amount, "status": status},
    )

    return {
        "approval_id": approval_id,
        "status": status,
        "authority_check": auth_check,
        "approver": approver,
    }


@router.get("/approvals")
async def list_approvals(status: str = Query("", description="Filter by status"), limit: int = Query(20)):
    """List approval requests."""
    query = {}
    if status:
        query["status"] = status
    approvals = list(db["ai3_approvals"].find(query, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"approvals": approvals, "count": len(approvals)}
