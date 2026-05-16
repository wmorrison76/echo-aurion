"""
Assigned-notifications + dismissal audit log + Stratus SLA escalation plans.
Adds lightweight 'plans' entity with priority, assignee, escalation chain.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from database import db as _db
from auth_admin import require_admin

router = APIRouter(prefix="/api/eng-ops", tags=["eng-ops"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Assigned Notifications ───
@router.get("/notifications/assigned")
async def list_assigned_notifications(assignee: Optional[str] = None, limit: int = 50, unread_only: bool = False):
    """List notifications assigned to a user (or all if assignee is None).

    Reads from existing `notifications` collection (populated by notification_service.py).
    """
    q = {}
    if assignee:
        q["assignee"] = assignee
    if unread_only:
        q["read"] = {"$ne": True}
    rows = list(_db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(200, limit))))
    unread = sum(1 for r in rows if not r.get("read"))
    return {"items": rows, "total": len(rows), "unread": unread}


class NotifyAssign(BaseModel):
    assignee: str
    title: str
    detail: Optional[str] = ""
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    deep_link: Optional[str] = None
    source: Optional[str] = "manual"


@router.post("/notifications/assign")
async def assign_notification(body: NotifyAssign):
    doc = {
        "id": uuid.uuid4().hex[:12],
        "assignee": body.assignee,
        "title": body.title,
        "detail": body.detail,
        "priority": body.priority,
        "deep_link": body.deep_link,
        "source": body.source,
        "read": False,
        "dismissed": False,
        "created_at": _now(),
    }
    _db.notifications.insert_one(doc.copy())
    return {"ok": True, "id": doc["id"]}


@router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str):
    res = _db.notifications.update_one({"id": notif_id}, {"$set": {"read": True, "read_at": _now()}})
    if res.matched_count == 0:
        raise HTTPException(404, "notification not found")
    return {"ok": True}


class DismissReason(BaseModel):
    reason: Optional[str] = ""
    actor: Optional[str] = "unknown"


@router.post("/notifications/{notif_id}/dismiss")
async def dismiss_notification(notif_id: str, body: DismissReason):
    existing = _db.notifications.find_one({"id": notif_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "notification not found")
    now = _now()
    _db.notifications.update_one(
        {"id": notif_id},
        {"$set": {"dismissed": True, "dismissed_at": now, "dismissed_by": body.actor, "dismiss_reason": body.reason}},
    )
    # Append to dismissal audit log for Engineering manager review
    _db.dismissal_audit.insert_one({
        "id": uuid.uuid4().hex[:12],
        "notif_id": notif_id,
        "title": existing.get("title"),
        "assignee": existing.get("assignee"),
        "priority": existing.get("priority"),
        "dismissed_by": body.actor,
        "reason": body.reason,
        "dismissed_at": now,
        "source": existing.get("source"),
    })
    return {"ok": True}


@router.get("/dismissal-audit", dependencies=[Depends(require_admin)])
async def dismissal_audit(limit: int = 100, priority: Optional[str] = None, actor: Optional[str] = None):
    q = {}
    if priority:
        q["priority"] = priority
    if actor:
        q["dismissed_by"] = actor
    rows = list(_db.dismissal_audit.find(q, {"_id": 0}).sort("dismissed_at", -1).limit(max(1, min(500, limit))))
    # KPIs: total, by priority, high-priority dismissals in last 7 days
    total = len(rows)
    by_priority: dict = {}
    for r in rows:
        p = r.get("priority", "unknown")
        by_priority[p] = by_priority.get(p, 0) + 1
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    high_recent = sum(1 for r in rows if r.get("priority") in ("high", "critical") and r.get("dismissed_at", "") >= since)
    return {"items": rows, "total": total, "by_priority": by_priority, "high_recent_7d": high_recent}


# ─── Stratus SLA plans ───
class PlanCreate(BaseModel):
    title: str
    detail: Optional[str] = ""
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    category: Optional[str] = None
    assignee: Optional[str] = None
    sla_hours: Optional[int] = None


ESCALATION_CHAIN = ["owner", "duty_manager", "gm"]  # role names
DEFAULT_SLA_HOURS = {"critical": 2, "high": 8, "medium": 48, "low": 168}


@router.post("/stratus/plans")
async def create_plan(body: PlanCreate):
    sla = body.sla_hours or DEFAULT_SLA_HOURS.get(body.priority, 48)
    doc = {
        "id": f"plan-{uuid.uuid4().hex[:10]}",
        "title": body.title,
        "detail": body.detail,
        "priority": body.priority,
        "category": body.category,
        "assignee": body.assignee,
        "assignee_role": "owner",
        "sla_hours": sla,
        "status": "open",
        "escalation_level": 0,
        "created_at": _now(),
        "due_at": (datetime.now(timezone.utc) + timedelta(hours=sla)).isoformat(),
        "events": [{"at": _now(), "kind": "created", "note": "Plan created"}],
    }
    _db.stratus_plans.insert_one(doc.copy())
    return {"ok": True, "plan": doc}


@router.get("/stratus/plans")
async def list_plans(status: Optional[str] = None, priority: Optional[str] = None, limit: int = 100):
    q = {}
    if status:
        q["status"] = status
    if priority:
        q["priority"] = priority
    rows = list(_db.stratus_plans.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(500, limit))))
    return {"plans": rows, "total": len(rows)}


@router.post("/stratus/plans/{plan_id}/resolve")
async def resolve_plan(plan_id: str, body: DismissReason):
    existing = _db.stratus_plans.find_one({"id": plan_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "plan not found")
    event = {"at": _now(), "kind": "resolved", "by": body.actor, "note": body.reason or "Resolved"}
    _db.stratus_plans.update_one(
        {"id": plan_id},
        {"$set": {"status": "resolved", "resolved_at": _now(), "resolved_by": body.actor},
         "$push": {"events": event}},
    )
    return {"ok": True}


@router.post("/stratus/plans/run-escalation", dependencies=[Depends(require_admin)])
async def run_escalation():
    """Scan open HIGH+CRITICAL plans past SLA, escalate to next role in chain.
    owner -> duty_manager -> gm. Emits a notification to the next assignee role.
    """
    now_dt = datetime.now(timezone.utc)
    q = {"status": "open", "priority": {"$in": ["high", "critical"]}}
    open_plans = list(_db.stratus_plans.find(q, {"_id": 0}))
    escalated: List[dict] = []

    for p in open_plans:
        try:
            due = datetime.fromisoformat(p.get("due_at"))
        except Exception:
            continue
        if due > now_dt:
            continue  # not past SLA yet

        current_level = int(p.get("escalation_level", 0))
        if current_level >= len(ESCALATION_CHAIN) - 1:
            continue  # already at top
        next_level = current_level + 1
        next_role = ESCALATION_CHAIN[next_level]
        # Extend SLA by same window
        sla_h = int(p.get("sla_hours", 8))
        new_due = (now_dt + timedelta(hours=sla_h)).isoformat()
        event = {
            "at": _now(),
            "kind": "escalated",
            "from_role": ESCALATION_CHAIN[current_level],
            "to_role": next_role,
            "note": f"Auto-escalated past SLA",
        }
        _db.stratus_plans.update_one(
            {"id": p.get("id")},
            {
                "$set": {
                    "escalation_level": next_level,
                    "assignee_role": next_role,
                    "due_at": new_due,
                    "last_escalated_at": _now(),
                },
                "$push": {"events": event},
            },
        )
        # Emit an assigned-notification to the escalated role (role-scoped assignee string)
        _db.notifications.insert_one({
            "id": uuid.uuid4().hex[:12],
            "assignee": next_role,
            "title": f"[{p.get('priority','').upper()}] Escalated: {p.get('title')}",
            "detail": p.get("detail") or "",
            "priority": p.get("priority", "medium"),
            "source": "stratus_sla_escalation",
            "deep_link": f"/stratus/plans/{p.get('id')}",
            "read": False,
            "dismissed": False,
            "created_at": _now(),
        })
        escalated.append({"plan_id": p.get("id"), "to": next_role, "title": p.get("title")})

    _db.stratus_escalation_runs.insert_one({
        "id": uuid.uuid4().hex[:12],
        "run_at": _now(),
        "scanned": len(open_plans),
        "escalated_count": len(escalated),
    })
    return {"scanned": len(open_plans), "escalated": escalated}
