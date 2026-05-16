"""
Lifecycle Engine — generalized step-tracker for any project type
=================================================================
Generalization of `period_close.py`. The monthly P&L close is one
project type out of many. This module exposes the same core
mechanics (templates, runs, steps, status events) but parameterized:

  · Any project type — renovation, new-property opening, F&B menu
    rollout, training cohort, SOC 2 evidence collection, BEO
    production cycle, CapEx project, marketing campaign, etc.
  · Anchor-relative scheduling — steps are offsets from a project
    anchor date, not month-day. So a "T-90 hire core team" step
    in a property-opening project resolves to the actual date
    based on the project's launch date.
  · Custom owners — every project type can declare its own owner
    roles (Architect, GM, Marketing Lead, Auditor) without code
    changes.
  · Auto-creation triggers (future) — the engine emits
    `lifecycle.run_created` and `lifecycle.step_completed` events
    so other services can hook in (e.g., when a BEO is booked,
    auto-create a "BEO production cycle" run).

Co-existence with `period_close.py`:
  · The legacy /api/period-close/* endpoints continue to work.
  · This engine is at /api/lifecycles/* — frontends can migrate
    at their own pace.
  · The 8 hospitality lifecycle templates are seeded by
    `backend/echo/lifecycle_templates_seed.py`.

Doctrine alignment:
  · §3.1 append-only — `lifecycle_step_events` immutable
  · §1.1 transparency — template + version + step status all queryable
  · §2.4 retrospective — per-run accuracy ("did we hit dates?")
"""
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import Optional, List, Dict
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/lifecycles", tags=["lifecycle-engine"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


PROJECT_TYPES = {
    "monthly_pnl_close": "Monthly P&L / Forecast Lifecycle",
    "renovation": "Renovation Project",
    "property_opening": "New Property Opening (90-day Playbook)",
    "fb_menu_rollout": "F&B Menu Rollout",
    "training_cohort": "Training Cohort Rollout",
    "soc2_evidence": "SOC 2 Evidence Collection",
    "beo_production_cycle": "BEO Production Cycle",
    "capex_project": "Capital Expenditure Project",
    "marketing_campaign": "Marketing Campaign",
    "custom": "Custom Project",
}


def _ensure_indexes():
    db["lifecycle_templates"].create_index([("template_id", 1)], unique=True)
    db["lifecycle_templates"].create_index([("project_type", 1), ("active", 1)])
    db["lifecycle_runs"].create_index([("run_id", 1)], unique=True)
    db["lifecycle_runs"].create_index([("property_id", 1), ("project_type", 1), ("status", 1)])
    db["lifecycle_runs"].create_index([("anchor_date", 1)])
    db["lifecycle_step_events"].create_index([("run_id", 1), ("step_id", 1), ("ts", -1)])


try:
    _ensure_indexes()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────
class TemplateStep(BaseModel):
    step_id: str
    title: str
    type: str = Field(default="Owner", description="Owner | Mandatory")
    owner_role: str = ""
    category: str = ""
    day_offset: int = Field(
        default=0,
        description="Days from anchor_date. Negative = before (T-7), zero = anchor day, positive = after (T+30).",
    )
    duration_days: int = Field(default=0, description="If >0, step spans a date range")
    depends_on: List[str] = Field(default_factory=list)
    deliverable: str = ""
    notes: str = ""


class TemplateCreate(BaseModel):
    template_id: Optional[str] = None
    project_type: str
    property_id: Optional[str] = None     # None = global template; specific = property-scoped
    display_name: str
    description: str = ""
    steps: List[TemplateStep] = Field(default_factory=list)
    anchor_label: str = Field(
        default="anchor_date",
        description="What the anchor represents — e.g. 'project start', 'opening date', 'campaign launch'",
    )


class RunCreate(BaseModel):
    property_id: str
    project_type: str
    anchor_date: str = Field(..., description="ISO date the project's offsets resolve against")
    title: str = Field(..., description="Human label for this run, e.g. 'Pier 66 Spa Renovation 2026'")
    template_id: Optional[str] = Field(default=None, description="If absent, picks the property's active template for this project_type, else the global default")
    description: str = ""
    project_lead: Optional[str] = None


class StepStatusUpdate(BaseModel):
    step_id: str
    status: str = Field(..., description="not_started | in_progress | complete | deferred | blocked")
    completed_by: Optional[str] = None
    notes: Optional[str] = None
    deferred_to_date: Optional[str] = None


# ─────────────────────────────────────────────────────────────────
# Template management
# ─────────────────────────────────────────────────────────────────
@router.get("/project-types")
async def list_project_types():
    """Enumerate the supported project types + their seeded templates."""
    out = []
    for pt, label in PROJECT_TYPES.items():
        seeded = db["lifecycle_templates"].count_documents({"project_type": pt, "is_seed": True})
        out.append({"project_type": pt, "display_name": label, "seeded_template_count": seeded})
    return {"project_types": out}


@router.post("/templates")
async def create_template(req: TemplateCreate):
    """Create a lifecycle template. property_id=None makes it a
    global default for that project type; specifying property_id
    creates a per-property override."""
    if req.project_type not in PROJECT_TYPES:
        raise HTTPException(400, f"Unknown project_type. Supported: {list(PROJECT_TYPES.keys())}")
    template_id = req.template_id or f"lct-{_uid()}"

    # If this is a property-specific template, deactivate any prior
    # active one for the same (property, project_type)
    if req.property_id:
        db["lifecycle_templates"].update_many(
            {"property_id": req.property_id, "project_type": req.project_type, "active": True},
            {"$set": {"active": False, "deactivated_at": _now()}},
        )

    record = {
        "template_id": template_id,
        "project_type": req.project_type,
        "property_id": req.property_id,
        "display_name": req.display_name,
        "description": req.description,
        "steps": [s.model_dump() for s in req.steps],
        "step_count": len(req.steps),
        "anchor_label": req.anchor_label,
        "version": 1,
        "active": True,
        "is_seed": False,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["lifecycle_templates"].insert_one(record.copy())
    record.pop("_id", None)
    return {"template": record}


@router.get("/templates")
async def list_templates(project_type: Optional[str] = None, property_id: Optional[str] = None, active_only: bool = True):
    """List templates, optionally filtered."""
    q: Dict = {}
    if project_type:
        q["project_type"] = project_type
    if property_id is not None:
        q["$or"] = [{"property_id": property_id}, {"property_id": None}]
    if active_only:
        q["active"] = True
    rows = list(db["lifecycle_templates"].find(q, {"_id": 0}))
    return {"count": len(rows), "templates": rows}


@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    template = db["lifecycle_templates"].find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(404, f"Template {template_id} not found")
    return template


@router.patch("/templates/{template_id}/step")
async def edit_template_step(template_id: str, edit: Dict):
    """Edit / add / delete a step in a template. Bumps version."""
    template = db["lifecycle_templates"].find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(404, f"Template {template_id} not found")
    if template.get("is_seed"):
        # Seeds are read-only — fork to property-specific to customize
        raise HTTPException(409, "Seed templates are read-only. POST a new template (with property_id set) to customize.")
    steps = template.get("steps", [])
    step_id = edit.get("step_id")
    if not step_id:
        raise HTTPException(400, "step_id required")

    delete = bool(edit.get("delete"))
    if delete:
        steps = [s for s in steps if s["step_id"] != step_id]
    else:
        idx = next((i for i, s in enumerate(steps) if s["step_id"] == step_id), None)
        edit_dict = {k: v for k, v in edit.items() if v is not None and k not in ("delete",)}
        if idx is not None:
            steps[idx].update(edit_dict)
        else:
            steps.append({"step_id": step_id, **edit_dict})

    db["lifecycle_templates"].update_one(
        {"template_id": template_id},
        {"$set": {
            "steps": steps,
            "step_count": len(steps),
            "version": template.get("version", 1) + 1,
            "updated_at": _now(),
        }},
    )
    return {"template_id": template_id, "step_count": len(steps), "version": template.get("version", 1) + 1, "edited_step": step_id, "deleted": delete}


# ─────────────────────────────────────────────────────────────────
# Run management
# ─────────────────────────────────────────────────────────────────
@router.post("/runs")
async def create_run(req: RunCreate):
    """Materialize a template into a runnable instance for a property
    × anchor date. Resolves day_offset values against the anchor."""
    if req.project_type not in PROJECT_TYPES:
        raise HTTPException(400, f"Unknown project_type")

    # Resolve template: explicit > property-specific > global seed
    if req.template_id:
        template = db["lifecycle_templates"].find_one({"template_id": req.template_id}, {"_id": 0})
    else:
        template = db["lifecycle_templates"].find_one(
            {"project_type": req.project_type, "property_id": req.property_id, "active": True},
            {"_id": 0},
        ) or db["lifecycle_templates"].find_one(
            {"project_type": req.project_type, "property_id": None, "active": True},
            {"_id": 0},
        )

    if not template:
        raise HTTPException(404, f"No template found for project_type={req.project_type}. Seed via lifecycle_templates_seed.")

    try:
        anchor = datetime.fromisoformat(req.anchor_date).date()
    except Exception:
        raise HTTPException(400, "anchor_date must be ISO date YYYY-MM-DD")

    # Materialize steps with concrete due_date computed from offset
    materialized = []
    for s in template["steps"]:
        offset = int(s.get("day_offset", 0))
        duration = int(s.get("duration_days", 0))
        due_date = anchor + timedelta(days=offset)
        end_date = due_date + timedelta(days=duration) if duration > 0 else due_date
        materialized.append({
            **s,
            "due_date": due_date.isoformat(),
            "end_date": end_date.isoformat() if duration > 0 else None,
            "status": "not_started",
            "completed_at": None,
            "completed_by": None,
            "notes": [],
            "deferred_to_date": None,
        })

    run_record = {
        "run_id": f"lcr-{_uid()}",
        "title": req.title,
        "description": req.description,
        "property_id": req.property_id,
        "project_type": req.project_type,
        "project_type_label": PROJECT_TYPES[req.project_type],
        "anchor_date": req.anchor_date,
        "anchor_label": template.get("anchor_label", "anchor_date"),
        "template_id": template["template_id"],
        "template_version": template.get("version", 1),
        "project_lead": req.project_lead,
        "steps": materialized,
        "step_count": len(materialized),
        "status": "open",
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["lifecycle_runs"].insert_one(run_record.copy())

    # Emit creation event so downstream can subscribe
    try:
        from event_bus import publish
        publish(
            "lifecycle.run_created",
            {"run_id": run_record["run_id"], "project_type": req.project_type, "property_id": req.property_id},
            source="lifecycle_engine",
        )
    except Exception:
        pass

    run_record.pop("_id", None)
    return run_record


@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    run = db["lifecycle_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    return run


@router.get("/runs/property/{property_id}")
async def list_property_runs(property_id: str, project_type: Optional[str] = None, status: Optional[str] = None, limit: int = 50):
    q: Dict = {"property_id": property_id}
    if project_type:
        q["project_type"] = project_type
    if status:
        q["status"] = status
    runs = list(
        db["lifecycle_runs"].find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    )
    return {"property_id": property_id, "count": len(runs), "runs": runs}


@router.patch("/runs/{run_id}/step")
async def update_step(run_id: str, update: StepStatusUpdate):
    run = db["lifecycle_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    if update.status not in ("not_started", "in_progress", "complete", "deferred", "blocked"):
        raise HTTPException(400, "Invalid status")

    idx = next((i for i, s in enumerate(run["steps"]) if s["step_id"] == update.step_id), None)
    if idx is None:
        raise HTTPException(404, f"Step {update.step_id} not in run")
    step = run["steps"][idx]
    prior_status = step.get("status")

    if update.notes:
        step["notes"] = step.get("notes", []) + [{
            "ts": _now(),
            "by": update.completed_by or "unknown",
            "text": update.notes,
        }]
    step["status"] = update.status
    if update.status == "complete":
        step["completed_at"] = _now()
        step["completed_by"] = update.completed_by
    elif update.status == "deferred":
        step["deferred_to_date"] = update.deferred_to_date
    run["steps"][idx] = step

    new_run_status = run.get("status")
    if all(s["status"] in ("complete", "deferred") for s in run["steps"]) and new_run_status != "closed":
        new_run_status = "ready_to_close"
    elif any(s["status"] == "in_progress" for s in run["steps"]) and new_run_status == "open":
        new_run_status = "in_flight"
    run["status"] = new_run_status
    run["updated_at"] = _now()
    db["lifecycle_runs"].update_one({"run_id": run_id}, {"$set": run})

    db["lifecycle_step_events"].insert_one({
        "event_id": _uid(),
        "run_id": run_id,
        "step_id": update.step_id,
        "ts": _now(),
        "actor": update.completed_by or "unknown",
        "from_status": prior_status,
        "to_status": update.status,
        "notes": update.notes,
        "deferred_to_date": update.deferred_to_date,
    })

    try:
        from event_bus import publish
        if update.status == "complete":
            publish(
                "lifecycle.step_completed",
                {"run_id": run_id, "step_id": update.step_id, "project_type": run.get("project_type")},
                source="lifecycle_engine",
            )
    except Exception:
        pass

    return {"updated": True, "step": step, "run_status": new_run_status}


@router.post("/runs/{run_id}/close")
async def close_run(run_id: str, closed_by: str = Query(...)):
    run = db["lifecycle_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    incomplete = [s for s in run["steps"] if s["status"] not in ("complete", "deferred")]
    if incomplete:
        return {
            "closed": False,
            "reason": "incomplete_steps",
            "incomplete_steps": [{"step_id": s["step_id"], "title": s["title"], "status": s["status"]} for s in incomplete],
        }
    db["lifecycle_runs"].update_one(
        {"run_id": run_id},
        {"$set": {"status": "closed", "closed_at": _now(), "closed_by": closed_by, "updated_at": _now()}},
    )
    db["lifecycle_step_events"].insert_one({
        "event_id": _uid(),
        "run_id": run_id,
        "step_id": "_RUN_LEVEL_",
        "ts": _now(),
        "actor": closed_by,
        "from_status": "open",
        "to_status": "closed",
    })
    return {"closed": True, "closed_by": closed_by}


# ─────────────────────────────────────────────────────────────────
# Daily digest — across all open runs at a property
# ─────────────────────────────────────────────────────────────────
@router.get("/digest/{property_id}")
async def daily_digest(property_id: str):
    """Per-property cross-project daily digest. Surfaces overdue,
    due-today, upcoming-3-day, just-completed across every open
    lifecycle run."""
    today = datetime.now(timezone.utc).date()
    runs = list(db["lifecycle_runs"].find(
        {"property_id": property_id, "status": {"$nin": ["closed"]}},
        {"_id": 0},
    ))

    overdue: List[Dict] = []
    due_today: List[Dict] = []
    upcoming: List[Dict] = []
    just_completed: List[Dict] = []

    for run in runs:
        for s in run.get("steps", []):
            try:
                due = datetime.fromisoformat(s["due_date"]).date()
            except Exception:
                continue
            entry = {
                "run_id": run["run_id"],
                "run_title": run.get("title"),
                "project_type": run.get("project_type"),
                "step_id": s["step_id"],
                "title": s["title"],
                "due_date": s["due_date"],
                "type": s.get("type"),
                "owner_role": s.get("owner_role"),
                "category": s.get("category"),
                "status": s.get("status"),
            }
            if s["status"] == "complete":
                completed_at = s.get("completed_at")
                if completed_at:
                    try:
                        cdt = datetime.fromisoformat(completed_at.replace("Z", "+00:00")).date()
                        if (today - cdt).days <= 1:
                            just_completed.append(entry)
                    except Exception:
                        pass
                continue
            if s["status"] == "deferred":
                continue
            days_diff = (due - today).days
            if days_diff < 0:
                overdue.append({**entry, "days_overdue": -days_diff})
            elif days_diff == 0:
                due_today.append(entry)
            elif days_diff <= 3:
                upcoming.append({**entry, "days_until_due": days_diff})

    overdue.sort(key=lambda e: e["days_overdue"], reverse=True)
    upcoming.sort(key=lambda e: e["days_until_due"])

    return {
        "property_id": property_id,
        "as_of": today.isoformat(),
        "summary": {
            "active_runs": len(runs),
            "overdue_count": len(overdue),
            "due_today_count": len(due_today),
            "upcoming_count": len(upcoming),
            "just_completed_count": len(just_completed),
        },
        "overdue": overdue,
        "due_today": due_today,
        "upcoming_3_days": upcoming,
        "just_completed": just_completed,
    }


@router.get("/audit/{run_id}")
async def step_audit(run_id: str):
    """Append-only step audit log for a run."""
    events = list(db["lifecycle_step_events"].find({"run_id": run_id}, {"_id": 0}).sort("ts", 1))
    return {"run_id": run_id, "event_count": len(events), "events": events}


@router.post("/seed")
async def seed_default_templates():
    """Seed the default global templates for all project types from
    lifecycle_templates_seed. Idempotent — re-running upserts. Use
    after fresh deploys or to refresh seeds when templates change."""
    from echo.lifecycle_templates_seed import SEED_TEMPLATES
    seeded = []
    for tmpl in SEED_TEMPLATES:
        record = {
            **tmpl,
            "active": True,
            "is_seed": True,
            "version": tmpl.get("version", 1),
            "step_count": len(tmpl.get("steps", [])),
            "created_at": _now(),
            "updated_at": _now(),
        }
        db["lifecycle_templates"].update_one(
            {"template_id": tmpl["template_id"]}, {"$set": record}, upsert=True,
        )
        seeded.append({"template_id": tmpl["template_id"], "project_type": tmpl["project_type"]})
    return {"seeded": len(seeded), "templates": seeded}
