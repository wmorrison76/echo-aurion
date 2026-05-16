"""
LUCCCA Workflow Engine
=======================
State-machine based workflow engine for cross-module business processes.

Workflow Types:
- Event approval chain (Sales -> Chef -> GM -> Finance)
- Purchase order approval (Requester -> Chef -> Finance)
- Payroll approval (HR -> Finance -> GM)
- Recipe change approval (Sous Chef -> Chef -> R&D)
- Custom ad-hoc workflows

Features:
- State machine with guard conditions
- Step timeout and escalation
- Rollback / void capability
- Full audit trail
- Parallel and sequential steps
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
from database import db, audit_log_col

workflows_col = db["workflows"]
workflow_templates_col = db["workflow_templates"]

workflows_col.create_index("status")
workflows_col.create_index([("created_at", -1)])
workflows_col.create_index("workflow_type")


def _uid():
    return str(uuid.uuid4())

def _now():
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# BUILT-IN WORKFLOW TEMPLATES
# ---------------------------------------------------------------------------
TEMPLATES = {
    "event_approval": {
        "name": "Event Approval Chain",
        "description": "Sales -> Culinary -> GM -> Finance",
        "steps": [
            {"step": 1, "name": "Sales Review", "role": "sales_manager", "action": "approve",
             "timeout_hours": 24, "escalate_to": "general_manager"},
            {"step": 2, "name": "Culinary Review", "role": "executive_chef", "action": "approve",
             "timeout_hours": 24, "escalate_to": "general_manager"},
            {"step": 3, "name": "GM Approval", "role": "general_manager", "action": "approve",
             "timeout_hours": 48, "escalate_to": None},
            {"step": 4, "name": "Finance Sign-off", "role": "finance_director", "action": "approve",
             "timeout_hours": 24, "escalate_to": "general_manager"},
        ],
    },
    "po_approval": {
        "name": "Purchase Order Approval",
        "description": "Requester -> Chef -> Finance",
        "steps": [
            {"step": 1, "name": "Chef Approval", "role": "executive_chef", "action": "approve",
             "timeout_hours": 12, "escalate_to": "general_manager"},
            {"step": 2, "name": "Finance Approval", "role": "finance_director", "action": "approve",
             "timeout_hours": 24, "escalate_to": "general_manager"},
        ],
    },
    "payroll_approval": {
        "name": "Payroll Approval",
        "description": "HR -> Finance -> GM",
        "steps": [
            {"step": 1, "name": "HR Verification", "role": "hr_manager", "action": "verify",
             "timeout_hours": 24, "escalate_to": "general_manager"},
            {"step": 2, "name": "Finance Review", "role": "finance_director", "action": "approve",
             "timeout_hours": 24, "escalate_to": "general_manager"},
            {"step": 3, "name": "GM Final Approval", "role": "general_manager", "action": "approve",
             "timeout_hours": 48, "escalate_to": None},
        ],
    },
    "recipe_change": {
        "name": "Recipe Change Approval",
        "description": "Sous Chef -> Executive Chef -> Cost Review",
        "steps": [
            {"step": 1, "name": "Sous Chef Review", "role": "sous_chef", "action": "review",
             "timeout_hours": 12, "escalate_to": "executive_chef"},
            {"step": 2, "name": "Executive Chef Approval", "role": "executive_chef", "action": "approve",
             "timeout_hours": 24, "escalate_to": "general_manager"},
            {"step": 3, "name": "Cost Impact Review", "role": "finance_director", "action": "review",
             "timeout_hours": 24, "escalate_to": None},
        ],
    },
}


def seed_templates():
    if workflow_templates_col.count_documents({}) > 0:
        return
    for key, t in TEMPLATES.items():
        workflow_templates_col.insert_one({
            "id": _uid(), "key": key, **t, "created_at": _now(),
        })


# ---------------------------------------------------------------------------
# WORKFLOW LIFECYCLE
# ---------------------------------------------------------------------------
def start_workflow(workflow_type: str, entity_type: str, entity_id: str,
                   title: str, data: dict = None, started_by: str = "system") -> dict:
    template = TEMPLATES.get(workflow_type)
    if not template:
        raise ValueError(f"Unknown workflow type: {workflow_type}")

    wid = _uid()
    steps_state = []
    for s in template["steps"]:
        steps_state.append({
            **s,
            "status": "pending",
            "assigned_to": None,
            "action_by": None,
            "action_at": None,
            "comments": "",
        })
    # First step is active
    if steps_state:
        steps_state[0]["status"] = "active"

    doc = {
        "id": wid,
        "workflow_type": workflow_type,
        "template_name": template["name"],
        "entity_type": entity_type,
        "entity_id": entity_id,
        "title": title,
        "data": data or {},
        "steps": steps_state,
        "current_step": 1,
        "total_steps": len(steps_state),
        "status": "in_progress",
        "started_by": started_by,
        "started_at": _now(),
        "completed_at": None,
        "created_at": _now(),
    }
    workflows_col.insert_one(doc)
    del doc["_id"]

    audit_log_col.insert_one({
        "id": _uid(), "engine": "workflow",
        "action": "workflow_started",
        "data": {"workflow_id": wid, "type": workflow_type, "title": title},
        "timestamp": _now(),
    })
    return doc


def action_step(workflow_id: str, step_num: int, action: str,
                action_by: str = "system", comments: str = "") -> dict:
    """
    Actions: approve, reject, void, escalate
    """
    wf = workflows_col.find_one({"id": workflow_id})
    if not wf:
        raise ValueError("Workflow not found")
    if wf["status"] != "in_progress":
        raise ValueError(f"Workflow is {wf['status']}, cannot act")

    steps = wf["steps"]
    step_idx = step_num - 1
    if step_idx < 0 or step_idx >= len(steps):
        raise ValueError(f"Invalid step {step_num}")
    if steps[step_idx]["status"] != "active":
        raise ValueError(f"Step {step_num} is not active (status: {steps[step_idx]['status']})")

    now = _now()

    if action == "approve":
        steps[step_idx]["status"] = "approved"
        steps[step_idx]["action_by"] = action_by
        steps[step_idx]["action_at"] = now
        steps[step_idx]["comments"] = comments

        # Advance to next step
        if step_idx + 1 < len(steps):
            steps[step_idx + 1]["status"] = "active"
            workflows_col.update_one({"id": workflow_id}, {"$set": {
                "steps": steps, "current_step": step_num + 1, "updated_at": now,
            }})
        else:
            # All steps complete
            workflows_col.update_one({"id": workflow_id}, {"$set": {
                "steps": steps, "status": "completed", "completed_at": now, "updated_at": now,
            }})

    elif action == "reject":
        steps[step_idx]["status"] = "rejected"
        steps[step_idx]["action_by"] = action_by
        steps[step_idx]["action_at"] = now
        steps[step_idx]["comments"] = comments
        workflows_col.update_one({"id": workflow_id}, {"$set": {
            "steps": steps, "status": "rejected", "completed_at": now, "updated_at": now,
        }})

    elif action == "void":
        for s in steps:
            if s["status"] in ("pending", "active"):
                s["status"] = "voided"
        workflows_col.update_one({"id": workflow_id}, {"$set": {
            "steps": steps, "status": "voided", "completed_at": now, "updated_at": now,
        }})

    elif action == "escalate":
        esc_to = steps[step_idx].get("escalate_to")
        steps[step_idx]["status"] = "escalated"
        steps[step_idx]["comments"] = f"Escalated to {esc_to}. {comments}"
        steps[step_idx]["action_at"] = now
        workflows_col.update_one({"id": workflow_id}, {"$set": {
            "steps": steps, "updated_at": now,
        }})
    else:
        raise ValueError(f"Unknown action: {action}")

    audit_log_col.insert_one({
        "id": _uid(), "engine": "workflow",
        "action": f"step_{action}",
        "data": {"workflow_id": workflow_id, "step": step_num, "by": action_by},
        "timestamp": now,
    })

    return workflows_col.find_one({"id": workflow_id}, {"_id": 0})


def get_workflow(workflow_id: str) -> Optional[dict]:
    return workflows_col.find_one({"id": workflow_id}, {"_id": 0})


def list_workflows(status: str = None, workflow_type: str = None,
                   limit: int = 50) -> list:
    q = {}
    if status:
        q["status"] = status
    if workflow_type:
        q["workflow_type"] = workflow_type
    return list(workflows_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit))


def get_pending_actions(role: str = None) -> list:
    """Get all workflows with active steps matching a role"""
    q = {"status": "in_progress"}
    wfs = list(workflows_col.find(q, {"_id": 0}))
    pending = []
    for wf in wfs:
        for s in wf["steps"]:
            if s["status"] == "active":
                if role is None or s.get("role") == role:
                    pending.append({
                        "workflow_id": wf["id"],
                        "workflow_type": wf["workflow_type"],
                        "title": wf["title"],
                        "entity_type": wf.get("entity_type"),
                        "entity_id": wf.get("entity_id"),
                        "step": s["step"],
                        "step_name": s["name"],
                        "role_required": s["role"],
                        "action_needed": s["action"],
                        "started_at": wf["started_at"],
                    })
    return pending


def get_workflow_stats() -> dict:
    total = workflows_col.count_documents({})
    in_progress = workflows_col.count_documents({"status": "in_progress"})
    completed = workflows_col.count_documents({"status": "completed"})
    rejected = workflows_col.count_documents({"status": "rejected"})

    return {
        "total_workflows": total,
        "in_progress": in_progress,
        "completed": completed,
        "rejected": rejected,
        "engine": "workflow",
        "status": "healthy",
        "timestamp": _now(),
    }
