"""iter250 · Scheduled Reports + Report Groups + Custom Periods + Task Manager.

Fills the gaps identified from the 2nd Agilysys video (User-side):
  1. Report Groups: bundle multiple Reports Hub reports into a named group.
  2. Scheduled Delivery: run a group on a cron-like schedule, deliver
     via email or SFTP. (Email/SFTP wiring is stubbed until Resend keys arrive.)
  3. Custom Periods: define non-standard date ranges ("Last 4 weekends",
     "4th of July 2026", "Manager fiscal Q1").
  4. Task Manager: history of generated reports — what ran, when, status.

All endpoints simulate immediate execution today; full cron worker is a future
ops concern (would use APScheduler / Celery beat).
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import db
from lib.time import utcnow_iso

router = APIRouter(prefix="/api/reports-hub", tags=["reports-hub-extras"])


# ── Report Groups ──────────────────────────────────────────────────────
class ReportGroup(BaseModel):
    name: str
    report_ids: List[str]
    description: Optional[str] = None


@router.post("/groups")
def create_group(body: ReportGroup):
    rec = {
        "id": f"grp-{int(datetime.now().timestamp() * 1000)}",
        "name": body.name, "report_ids": body.report_ids,
        "description": body.description, "created_at": utcnow_iso(),
    }
    db["report_groups"].insert_one(dict(rec)); rec.pop("_id", None)
    return {"ok": True, "group": rec}


@router.get("/groups")
def list_groups():
    rows = list(db["report_groups"].find({}, {"_id": 0}).sort("created_at", -1).limit(100))
    if not rows:
        # Seed two starter groups
        seeds = [
            {"id": "grp-gm-morning", "name": "GM Morning Pack",
              "description": "What every GM checks first thing — sales, labor, covers, voids",
              "report_ids": ["r12-gm-snapshot", "r1-sales-pc", "r4-covers", "r9-labor",
                                  "r5-voids"], "created_at": utcnow_iso()},
            {"id": "grp-controller-eod", "name": "Controller EOD",
              "description": "Tender mix + tax breakdown + voids — all the financial reconciliation",
              "report_ids": ["r2-tender", "r8-tax", "r5-voids"], "created_at": utcnow_iso()},
            {"id": "grp-chef-pmix", "name": "Chef PMix Review",
              "description": "Top items + margin + heatmap — feeds menu engineering decisions",
              "report_ids": ["r7-top-items", "r6-heatmap"], "created_at": utcnow_iso()},
        ]
        for s in seeds: db["report_groups"].insert_one(dict(s))
        rows = [{k: v for k, v in s.items() if k != "_id"} for s in seeds]
    return {"ok": True, "rows": rows}


@router.delete("/groups/{group_id}")
def delete_group(group_id: str):
    res = db["report_groups"].delete_one({"id": group_id})
    db["report_schedules"].delete_many({"group_id": group_id})
    return {"ok": True, "deleted": res.deleted_count}


# ── Scheduled Delivery ─────────────────────────────────────────────────
class Schedule(BaseModel):
    group_id: str
    cron_label: str             # "daily-7am" | "weekly-mon-7am" | "monthly-1st-7am"
    delivery_kind: str = "email"  # email | sftp | none (just queue task)
    recipients: List[str] = []
    enabled: bool = True


@router.post("/schedules")
def create_schedule(body: Schedule):
    rec = {
        "id": f"sch-{int(datetime.now().timestamp() * 1000)}",
        **body.model_dump(),
        "next_run_at": _next_run(body.cron_label),
        "last_run_at": None, "last_run_status": None,
        "created_at": utcnow_iso(),
    }
    db["report_schedules"].insert_one(dict(rec)); rec.pop("_id", None)
    return {"ok": True, "schedule": rec}


@router.get("/schedules")
def list_schedules():
    rows = list(db["report_schedules"].find({}, {"_id": 0}).sort("created_at", -1).limit(100))
    return {"ok": True, "rows": rows}


@router.post("/schedules/{schedule_id}/run-now")
def run_now(schedule_id: str):
    sch = db["report_schedules"].find_one({"id": schedule_id}, {"_id": 0})
    if not sch: raise HTTPException(404, "schedule not found")
    grp = db["report_groups"].find_one({"id": sch["group_id"]}, {"_id": 0})
    if not grp: raise HTTPException(404, "group not found")
    task = {
        "id": f"task-{int(datetime.now().timestamp() * 1000)}",
        "schedule_id": schedule_id, "group_id": grp["id"],
        "group_name": grp["name"], "report_ids": grp["report_ids"],
        "delivery_kind": sch.get("delivery_kind"), "recipients": sch.get("recipients", []),
        "started_at": utcnow_iso(),
        "status": "completed",  # would be 'running' in real async flow
        "completed_at": utcnow_iso(),
        "delivered": sch.get("delivery_kind") != "none",
        "delivery_note": "MOCKED — no email/SFTP keys configured yet" if sch.get("delivery_kind") != "none" else None,
    }
    db["report_tasks"].insert_one(dict(task)); task.pop("_id", None)
    db["report_schedules"].update_one({"id": schedule_id},
        {"$set": {"last_run_at": task["completed_at"],
                     "last_run_status": "completed",
                     "next_run_at": _next_run(sch.get("cron_label", ""))}})
    return {"ok": True, "task": task}


@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: str):
    res = db["report_schedules"].delete_one({"id": schedule_id})
    return {"ok": True, "deleted": res.deleted_count}


# ── Custom Periods ─────────────────────────────────────────────────────
class CustomPeriod(BaseModel):
    name: str
    start_date: str
    end_date: str
    description: Optional[str] = None


@router.post("/periods")
def create_period(body: CustomPeriod):
    rec = {
        "id": f"per-{int(datetime.now().timestamp() * 1000)}",
        **body.model_dump(),
        "created_at": utcnow_iso(),
    }
    db["custom_periods"].insert_one(dict(rec)); rec.pop("_id", None)
    return {"ok": True, "period": rec}


@router.get("/periods")
def list_periods():
    rows = list(db["custom_periods"].find({}, {"_id": 0}).sort("start_date", -1).limit(100))
    if not rows:
        # Seed common ones
        today = date.today()
        seeds = [
            {"id": "per-this-month", "name": "This Month",
              "start_date": today.replace(day=1).isoformat(),
              "end_date": today.isoformat(), "created_at": utcnow_iso()},
            {"id": "per-last-month", "name": "Last Month",
              "start_date": (today.replace(day=1) - timedelta(days=1)).replace(day=1).isoformat(),
              "end_date": (today.replace(day=1) - timedelta(days=1)).isoformat(),
              "created_at": utcnow_iso()},
            {"id": "per-trailing-7d", "name": "Trailing 7 Days",
              "start_date": (today - timedelta(days=6)).isoformat(),
              "end_date": today.isoformat(), "created_at": utcnow_iso()},
            {"id": "per-trailing-30d", "name": "Trailing 30 Days",
              "start_date": (today - timedelta(days=29)).isoformat(),
              "end_date": today.isoformat(), "created_at": utcnow_iso()},
        ]
        for s in seeds: db["custom_periods"].insert_one(dict(s))
        rows = [{k: v for k, v in s.items() if k != "_id"} for s in seeds]
    return {"ok": True, "rows": rows}


@router.delete("/periods/{period_id}")
def delete_period(period_id: str):
    res = db["custom_periods"].delete_one({"id": period_id})
    return {"ok": True, "deleted": res.deleted_count}


# ── Task Manager ───────────────────────────────────────────────────────
@router.get("/tasks")
def list_tasks(limit: int = 50):
    rows = list(db["report_tasks"].find({}, {"_id": 0}).sort("started_at", -1).limit(limit))
    return {"ok": True, "rows": rows}


@router.delete("/tasks")
def clear_tasks(older_than_days: int = 30):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=older_than_days)).isoformat()
    res = db["report_tasks"].delete_many({"started_at": {"$lt": cutoff}})
    return {"ok": True, "deleted": res.deleted_count}


# ── helpers ────────────────────────────────────────────────────────────
def _next_run(cron_label: str) -> str:
    """Approximate the next run time for a cron-style label."""
    now = datetime.now(timezone.utc)
    if cron_label.startswith("daily"):
        nxt = now.replace(hour=7, minute=0, second=0, microsecond=0)
        if nxt <= now: nxt += timedelta(days=1)
    elif cron_label.startswith("weekly"):
        days_ahead = 0 - now.weekday()  # next Monday
        if days_ahead <= 0: days_ahead += 7
        nxt = (now + timedelta(days=days_ahead)).replace(
            hour=7, minute=0, second=0, microsecond=0)
    elif cron_label.startswith("monthly"):
        if now.month == 12:
            nxt = now.replace(year=now.year + 1, month=1, day=1,
                                  hour=7, minute=0, second=0, microsecond=0)
        else:
            nxt = now.replace(month=now.month + 1, day=1,
                                  hour=7, minute=0, second=0, microsecond=0)
    else:
        nxt = now + timedelta(hours=24)
    return nxt.isoformat()
