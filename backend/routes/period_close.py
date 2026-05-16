"""
Period Close — Monthly P&L / Forecast Lifecycle Engine
========================================================
B.18 from the CFO toolkit. The human's actual close is not a single
"close button" — it's a 4-week lifecycle of P&L deliverables AND
forecast deliverables, each with named owners, types (Owner /
Mandatory), and dates.

This engine implements that lifecycle as an **editable monthly
template**. Each month, a fresh "run" of the template is created
for the property. Users mark steps complete, leave notes, defer
dates with reasons. Daily digest surfaces what's due today + what's
overdue + what's coming up.

Architecture:
  · `period_close_templates`  — editable schedule template per property
                                (default seeded from the human's May 2026
                                lifecycle — the canonical Aurion close)
  · `period_close_runs`       — instances of the template applied to a
                                specific property × month
  · `period_close_step_events` — append-only log of every status change
                                 (doctrine §3.1)

Step types:
  · `Owner`     — single accountable person
  · `Mandatory` — meeting requiring full team attendance
  · Each step has owner_role, deliverable, depends_on (other step IDs)

The user's May 2026 lifecycle is encoded as the default template.
Properties can fork it, edit dates, add/remove steps, change owners.
The template is versioned — historical runs reference the template
version they were instantiated from (audit trail).

Doctrine alignment:
  · §3.1 append-only — every step status change persists to
    period_close_step_events
  · §1.1 transparency — both the template and the run are queryable;
    no hidden state
  · §2.4 retrospective — at close-out, the engine can compute "did we
    hit every deliverable on date" and surface drift
"""
from datetime import datetime, timezone, timedelta, date as date_cls
from calendar import monthrange
from typing import Optional, List, Dict
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/period-close", tags=["cfo-period-close"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


def _ensure_indexes():
    db["period_close_templates"].create_index([("template_id", 1)], unique=True)
    db["period_close_templates"].create_index([("property_id", 1), ("active", 1)])
    db["period_close_runs"].create_index([("run_id", 1)], unique=True)
    db["period_close_runs"].create_index([("property_id", 1), ("year", 1), ("month", 1)])
    db["period_close_step_events"].create_index([("run_id", 1), ("step_id", 1), ("ts", -1)])


try:
    _ensure_indexes()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────
# The canonical Aurion close lifecycle (from the human's May 2026 spec)
# Day-of-month is offset (e.g. 6 = the 6th of the month). The template
# is editable per property.
# ─────────────────────────────────────────────────────────────────
AURION_DEFAULT_TEMPLATE = [
    # Week 1 — P&L close
    {"step_id": "w1_pnl_finance_close", "category": "P&L", "week": 1, "day_of_month": 6,
     "title": "Finance close process complete / prelim completed",
     "type": "Owner", "owner_role": "Finance",
     "depends_on": []},
    {"step_id": "w1_pnl_dept_review", "category": "P&L", "week": 1, "day_of_month_start": 6, "day_of_month_end": 8,
     "day_of_month": 8,
     "title": "Departmental review / changes made to prelim",
     "type": "Owner", "owner_role": "Department head, assistant director, director",
     "depends_on": ["w1_pnl_finance_close"]},
    {"step_id": "w1_pnl_final", "category": "P&L", "week": 1, "day_of_month": 8,
     "title": "Final P&L completed",
     "type": "Owner", "owner_role": "Finance",
     "depends_on": ["w1_pnl_dept_review"]},
    {"step_id": "w1_pnl_commentary", "category": "P&L", "week": 1, "day_of_month": 9,
     "title": "P&L commentary entered into PS",
     "type": "Owner", "owner_role": "Department head, assistant director, director",
     "depends_on": ["w1_pnl_final"]},
    {"step_id": "w1_fcst_monitor", "category": "Forecast", "week": 1, "day_of_month": 7,
     "title": "Monitor week-1 stats",
     "type": "Owner", "owner_role": "Department head",
     "depends_on": []},

    # Week 2 — P&L review + Owner meeting prep
    {"step_id": "w2_pnl_internal_meeting", "category": "P&L", "week": 2, "day_of_month": 11,
     "title": "Internal P&L meeting",
     "type": "Mandatory", "owner_role": "Department heads, assistant director, director",
     "depends_on": ["w1_pnl_commentary"]},
    {"step_id": "w2_pnl_owners_deck_to_ec", "category": "P&L", "week": 2, "day_of_month": 12,
     "title": "Owner's meeting deck sent to EC",
     "type": "Owner", "owner_role": "EC",
     "depends_on": ["w2_pnl_internal_meeting"]},
    {"step_id": "w2_pnl_owner_meeting_prep", "category": "P&L", "week": 2, "day_of_month": 14,
     "title": "Owner meeting prep",
     "type": "Mandatory", "owner_role": "EC",
     "depends_on": ["w2_pnl_owners_deck_to_ec"]},
    {"step_id": "w2_pnl_owners_deck_complete", "category": "P&L", "week": 2, "day_of_month": 15,
     "title": "Owner's meeting deck complete",
     "type": "Owner", "owner_role": "EC",
     "depends_on": ["w2_pnl_owner_meeting_prep"]},
    {"step_id": "w2_fcst_midmonth_accuracy", "category": "Forecast", "week": 2, "day_of_month": 15,
     "title": "Mid-month forecast accuracy update",
     "type": "Owner", "owner_role": "Department head, assistant director, director",
     "depends_on": []},

    # Week 3 — Owner meeting + Forecast deep-build
    {"step_id": "w3_pnl_owners_meeting", "category": "P&L", "week": 3, "day_of_month": 19,
     "title": "Owner's meeting — P&L and forecast review",
     "type": "Mandatory", "owner_role": "EC",
     "depends_on": ["w2_pnl_owners_deck_complete"]},
    {"step_id": "w3_fcst_rooms_revenue", "category": "Forecast", "week": 3, "day_of_month": 18,
     "title": "Rooms revenue forecast complete",
     "type": "Owner", "owner_role": "Revenue Team",
     "depends_on": []},
    {"step_id": "w3_fcst_30_60_90", "category": "Forecast", "week": 3, "day_of_month": 20,
     "title": "30/60/90-day forecast delivered",
     "type": "Owner", "owner_role": "Revenue Team",
     "depends_on": ["w3_fcst_rooms_revenue"]},
    {"step_id": "w3_fcst_rb_revenue", "category": "Forecast", "week": 3, "day_of_month": 20,
     "title": "R&B revenue forecast completed",
     "type": "Owner", "owner_role": "F&B Director",
     "depends_on": []},
    {"step_id": "w3_fcst_rooms_ontrack", "category": "Forecast", "week": 3, "day_of_month": 21,
     "title": "Rooms on-track loaded — updated labor standard",
     "type": "Owner", "owner_role": "Finance",
     "depends_on": ["w3_fcst_rooms_revenue"]},
    {"step_id": "w3_fcst_bc_revenue", "category": "Forecast", "week": 3, "day_of_month": 21,
     "title": "B&C revenue forecast completed",
     "type": "Owner", "owner_role": "Banquets/Catering",
     "depends_on": []},
    {"step_id": "w3_fcst_fb_ontrack", "category": "Forecast", "week": 3, "day_of_month": 23,
     "title": "F&B (all) on-track loaded — updated labor standard",
     "type": "Owner", "owner_role": "Finance",
     "depends_on": ["w3_fcst_rb_revenue", "w3_fcst_bc_revenue"]},
    {"step_id": "w3_fcst_labor_controllable", "category": "Forecast", "week": 3, "day_of_month_start": 23, "day_of_month_end": 25,
     "day_of_month": 25,
     "title": "Rooms & F&B update labor and controllable expenses",
     "type": "Owner", "owner_role": "Department heads",
     "depends_on": ["w3_fcst_rooms_ontrack", "w3_fcst_fb_ontrack"]},

    # Week 4 — Forecast completion + Corp lock
    {"step_id": "w4_fcst_rooms_division", "category": "Forecast", "week": 4, "day_of_month": 25,
     "title": "Rooms division forecast complete",
     "type": "Owner", "owner_role": "Rooms Director",
     "depends_on": ["w3_fcst_labor_controllable"]},
    {"step_id": "w4_fcst_fb_division", "category": "Forecast", "week": 4, "day_of_month": 25,
     "title": "F&B division forecast completed",
     "type": "Owner", "owner_role": "F&B Director",
     "depends_on": ["w3_fcst_labor_controllable"]},
    {"step_id": "w4_fcst_ec_internal_review", "category": "Forecast", "week": 4, "day_of_month": 26,
     "title": "EC Internal Forecast Review",
     "type": "Mandatory", "owner_role": "EC",
     "depends_on": ["w4_fcst_rooms_division", "w4_fcst_fb_division"]},
    {"step_id": "w4_fcst_corp_lock", "category": "Forecast", "week": 4, "day_of_month": 28,
     "title": "Corp locks forecast",
     "type": "Owner", "owner_role": "Corp Finance",
     "depends_on": ["w4_fcst_ec_internal_review"]},
]


# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────
class TemplateCreate(BaseModel):
    template_id: Optional[str] = None
    property_id: str
    display_name: str = "Aurion Default Monthly Lifecycle"
    steps: Optional[List[Dict]] = None   # If None, seeded from AURION_DEFAULT_TEMPLATE


class TemplateStepEdit(BaseModel):
    step_id: str
    title: Optional[str] = None
    type: Optional[str] = None
    owner_role: Optional[str] = None
    day_of_month: Optional[int] = None
    day_of_month_start: Optional[int] = None
    day_of_month_end: Optional[int] = None
    category: Optional[str] = None
    week: Optional[int] = None
    depends_on: Optional[List[str]] = None
    delete: bool = False


class StepStatusUpdate(BaseModel):
    step_id: str
    status: str = Field(..., description="not_started | in_progress | complete | deferred | blocked")
    completed_by: Optional[str] = None
    notes: Optional[str] = None
    deferred_to_date: Optional[str] = None


# ─────────────────────────────────────────────────────────────────
# Template management
# ─────────────────────────────────────────────────────────────────
@router.post("/templates")
async def create_template(req: TemplateCreate):
    """Create a new period-close template for a property. If no steps
    provided, seeds from the Aurion default monthly lifecycle (the
    human's May 2026 schedule)."""
    template_id = req.template_id or f"tmpl-{_uid()}"
    steps = req.steps if req.steps else [dict(s) for s in AURION_DEFAULT_TEMPLATE]

    # Deactivate any prior active template for this property — only
    # one active template per property at a time
    db["period_close_templates"].update_many(
        {"property_id": req.property_id, "active": True},
        {"$set": {"active": False, "deactivated_at": _now()}},
    )

    record = {
        "template_id": template_id,
        "property_id": req.property_id,
        "display_name": req.display_name,
        "steps": steps,
        "step_count": len(steps),
        "version": 1,
        "active": True,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["period_close_templates"].insert_one(record.copy())
    record.pop("_id", None)
    return {"template": record, "next_step": "PATCH /templates/{id}/step or POST /runs to create a monthly run"}


@router.get("/templates/{property_id}")
async def get_template(property_id: str):
    """Get the active template for a property. If none exists, returns
    the Aurion default (without persisting it — caller uses POST to
    create)."""
    template = db["period_close_templates"].find_one(
        {"property_id": property_id, "active": True}, {"_id": 0},
    )
    if template:
        return {"template": template, "is_default": False}
    return {
        "template": {
            "template_id": "default_aurion",
            "property_id": property_id,
            "display_name": "Aurion Default Monthly Lifecycle (preview only — not saved)",
            "steps": AURION_DEFAULT_TEMPLATE,
            "step_count": len(AURION_DEFAULT_TEMPLATE),
        },
        "is_default": True,
        "next_step": "POST /templates to save this default for the property, then PATCH steps to customize",
    }


@router.patch("/templates/{template_id}/step")
async def edit_template_step(template_id: str, edit: TemplateStepEdit):
    """Edit one step in a template. Bumps the template version. Future
    runs use the new version; existing runs keep their pinned version."""
    template = db["period_close_templates"].find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(404, f"Template {template_id} not found")
    steps = template.get("steps", [])

    if edit.delete:
        steps = [s for s in steps if s["step_id"] != edit.step_id]
    else:
        # Find the step to edit; if not present, append it as new
        step_idx = next((i for i, s in enumerate(steps) if s["step_id"] == edit.step_id), None)
        edit_dict = {k: v for k, v in edit.model_dump().items() if v is not None and k not in ("delete",)}
        if step_idx is not None:
            steps[step_idx].update(edit_dict)
        else:
            steps.append({"step_id": edit.step_id, **edit_dict})

    db["period_close_templates"].update_one(
        {"template_id": template_id},
        {"$set": {
            "steps": steps,
            "step_count": len(steps),
            "version": template.get("version", 1) + 1,
            "updated_at": _now(),
        }},
    )
    return {"template_id": template_id, "step_count": len(steps), "version": template.get("version", 1) + 1, "edited_step": edit.step_id, "deleted": edit.delete}


# ─────────────────────────────────────────────────────────────────
# Monthly runs
# ─────────────────────────────────────────────────────────────────
@router.post("/runs")
async def create_run(property_id: str, year: int, month: int):
    """Create a monthly run from the property's active template.
    Idempotent — returns existing run if one already exists for the
    property × month."""
    if month < 1 or month > 12:
        raise HTTPException(400, "Month must be 1-12")

    existing = db["period_close_runs"].find_one(
        {"property_id": property_id, "year": year, "month": month}, {"_id": 0},
    )
    if existing:
        return {"run": existing, "is_existing": True}

    template_doc = db["period_close_templates"].find_one(
        {"property_id": property_id, "active": True}, {"_id": 0},
    )
    if template_doc:
        template_steps = template_doc["steps"]
        template_id = template_doc["template_id"]
        template_version = template_doc.get("version", 1)
    else:
        template_steps = AURION_DEFAULT_TEMPLATE
        template_id = "default_aurion"
        template_version = 1

    last_day = monthrange(year, month)[1]

    # Materialize each step with a concrete due_date
    materialized_steps = []
    for s in template_steps:
        dom = s.get("day_of_month") or s.get("day_of_month_end") or 28
        dom = min(dom, last_day)
        due_date = date_cls(year, month, dom).isoformat()
        materialized_steps.append({
            **s,
            "due_date": due_date,
            "status": "not_started",
            "completed_at": None,
            "completed_by": None,
            "notes": [],
            "deferred_to_date": None,
        })

    run_record = {
        "run_id": f"run-{_uid()}",
        "property_id": property_id,
        "year": year,
        "month": month,
        "template_id": template_id,
        "template_version": template_version,
        "steps": materialized_steps,
        "step_count": len(materialized_steps),
        "status": "open",
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["period_close_runs"].insert_one(run_record.copy())
    run_record.pop("_id", None)
    return {"run": run_record, "is_existing": False}


@router.get("/runs/{run_id}")
async def get_run(run_id: str):
    run = db["period_close_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    return run


@router.get("/runs/property/{property_id}")
async def list_runs(property_id: str, limit: int = 24):
    runs = list(
        db["period_close_runs"].find({"property_id": property_id}, {"_id": 0})
        .sort("created_at", -1).limit(limit)
    )
    return {"property_id": property_id, "count": len(runs), "runs": runs}


@router.patch("/runs/{run_id}/step")
async def update_step_status(run_id: str, update: StepStatusUpdate):
    """Mark a step's status. All status changes persist to
    period_close_step_events (append-only audit trail)."""
    run = db["period_close_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    if update.status not in ("not_started", "in_progress", "complete", "deferred", "blocked"):
        raise HTTPException(400, "Invalid status")

    step_idx = next((i for i, s in enumerate(run["steps"]) if s["step_id"] == update.step_id), None)
    if step_idx is None:
        raise HTTPException(404, f"Step {update.step_id} not found in run {run_id}")
    step = run["steps"][step_idx]
    prior_status = step.get("status")

    # Append note before mutating status
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
    run["steps"][step_idx] = step

    # Recompute run-level status (open vs ready_to_close vs closed)
    run_status = "open"
    if all(s["status"] == "complete" for s in run["steps"]):
        run_status = "ready_to_close"
    if run.get("status") == "closed":
        run_status = "closed"
    run["status"] = run_status
    run["updated_at"] = _now()

    db["period_close_runs"].update_one({"run_id": run_id}, {"$set": run})

    # Append event to immutable log
    db["period_close_step_events"].insert_one({
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

    return {"updated": True, "step": step, "run_status": run_status}


@router.post("/runs/{run_id}/close")
async def close_run(run_id: str, closed_by: str = Query(...)):
    """Mark the run closed. Only allowed if every step is complete
    or deferred. The close itself is recorded as an audit event."""
    run = db["period_close_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    incomplete = [s for s in run["steps"] if s["status"] not in ("complete", "deferred")]
    if incomplete:
        return {
            "closed": False,
            "reason": "incomplete_steps",
            "incomplete_steps": [{"step_id": s["step_id"], "title": s["title"], "status": s["status"]} for s in incomplete],
        }
    db["period_close_runs"].update_one(
        {"run_id": run_id},
        {"$set": {"status": "closed", "closed_at": _now(), "closed_by": closed_by, "updated_at": _now()}},
    )
    db["period_close_step_events"].insert_one({
        "event_id": _uid(),
        "run_id": run_id,
        "step_id": "_RUN_LEVEL_",
        "ts": _now(),
        "actor": closed_by,
        "from_status": "open",
        "to_status": "closed",
    })
    return {"closed": True, "closed_by": closed_by, "closed_at": _now()}


# ─────────────────────────────────────────────────────────────────
# Daily digest — what's due today, overdue, coming up
# ─────────────────────────────────────────────────────────────────
@router.get("/digest/{property_id}")
async def daily_digest(property_id: str):
    """Daily digest of in-flight close lifecycles for a property.
    Surfaces: overdue steps (red), due-today steps (amber), due
    within 3 days (yellow), and recently-completed steps (green
    momentum)."""
    today = datetime.now(timezone.utc).date()
    runs = list(db["period_close_runs"].find(
        {"property_id": property_id, "status": {"$in": ["open", "ready_to_close"]}},
        {"_id": 0},
    ))

    overdue: List[Dict] = []
    due_today: List[Dict] = []
    upcoming: List[Dict] = []
    just_completed: List[Dict] = []

    for run in runs:
        for s in run["steps"]:
            try:
                due = datetime.fromisoformat(s["due_date"]).date()
            except Exception:
                continue
            entry = {
                "run_id": run["run_id"],
                "year": run["year"],
                "month": run["month"],
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
            "overdue_count": len(overdue),
            "due_today_count": len(due_today),
            "upcoming_count": len(upcoming),
            "just_completed_count": len(just_completed),
            "active_runs": len(runs),
        },
        "overdue": overdue,
        "due_today": due_today,
        "upcoming_3_days": upcoming,
        "just_completed": just_completed,
    }


@router.get("/audit/{run_id}")
async def step_audit(run_id: str):
    """Append-only audit log of every status change for a run."""
    events = list(
        db["period_close_step_events"].find({"run_id": run_id}, {"_id": 0})
        .sort("ts", 1)
    )
    return {"run_id": run_id, "event_count": len(events), "events": events}
