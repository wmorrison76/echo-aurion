"""
iter182 · Dashboard · Share-with-Team + Role-based Overview

Endpoints:
  POST /api/dashboard/share  (admin-gated or authenticated)
    body: {tab, layout, note?, expires_minutes=120}
    → returns share_id + url like /board/{share_id}
  GET  /api/dashboard/board/{share_id}  (public, readonly)
    → {created_by, tab, layout, note, server_time}
  GET  /api/dashboard/overview
    → role-aware KPIs: employee headcount, open relay tickets, today's standup health,
      activations this week, milestone count this week, hiring batch count this month,
      open concierge requests, outlook events today.
"""
from __future__ import annotations

import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected:
        raise HTTPException(401, "admin token required")


# ─── Share board ──────────────────────────────────────────────────────────
class ShareBody(BaseModel):
    tab: str = "executive"  # "executive" | "classic"
    layout: Dict[str, Any] = {}  # arbitrary JSON — tile order, toggles, filters
    note: Optional[str] = None
    expires_minutes: int = 120


@router.post("/share")
async def share_board(body: ShareBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    from database import db as _db
    share_id = secrets.token_urlsafe(12)
    now = _now()
    ttl_min = max(5, min(24 * 60, int(body.expires_minutes or 120)))
    doc = {
        "share_id": share_id,
        "tab": body.tab,
        "layout": body.layout or {},
        "note": (body.note or "")[:300],
        "created_at": now,
        "expires_at": now + timedelta(minutes=ttl_min),
        "views": 0,
    }
    _db.dashboard_shares.insert_one(doc.copy())
    return {"ok": True, "share_id": share_id,
            "url_hint": f"/board/{share_id}",
            "expires_at": (now + timedelta(minutes=ttl_min)).isoformat()}


@router.get("/board/{share_id}")
async def get_board(share_id: str):
    from database import db as _db
    doc = _db.dashboard_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "board not found")
    exp = doc.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < _now():
            raise HTTPException(410, "board expired")
    _db.dashboard_shares.update_one({"share_id": share_id}, {"$inc": {"views": 1}})
    # Return latest overview too, so viewer sees live-ish numbers
    overview = _compute_overview()
    doc["overview"] = overview
    return {"ok": True, "board": doc}


# ─── Overview · role-aware KPIs ──────────────────────────────────────────
def _compute_overview(outlet_filter: Optional[List[str]] = None) -> Dict[str, Any]:
    """iter266.3 · `outlet_filter` is the list of outlet_ids the caller is
    assigned to. When provided, scopes counts to those outlets so each
    manager's dashboard reflects only what they oversee."""
    from database import db as _db
    today_iso = _now().strftime("%Y-%m-%d")
    week_start = (_now() - timedelta(days=7)).isoformat()
    scoped = bool(outlet_filter)
    # Documents in different collections use slightly different field names,
    # so prepare a small set of $in clauses that try them in OR.
    def scope_clause() -> List[Dict[str, Any]]:
        if not scoped: return []
        ids = outlet_filter
        return [{"$or": [
            {"outlet_id": {"$in": ids}},
            {"outletId": {"$in": ids}},
            {"property_id": {"$in": ids}},
        ]}]

    def safe_count(name: str, q: Dict[str, Any]) -> int:
        try:
            if name in _db.list_collection_names():
                extra = scope_clause()
                if extra:
                    q = {"$and": [q] + extra}
                return _db[name].count_documents(q)
        except Exception:
            pass
        return 0

    staff_count = safe_count("employees", {"active": True})
    relay_open = safe_count("relay_tickets", {"status": {"$in": ["open", "in_progress", "escalated"]}})
    concierge_open = safe_count("concierge_requests", {"status": {"$in": ["pending", "in_progress", "confirmed"]}})
    standup_today = safe_count("standup_boards", {"date": today_iso})
    activations_week = safe_count("lifestyle_activations", {"date": {"$gte": (_now() - timedelta(days=7)).strftime("%Y-%m-%d")}})
    hiring_batches_month = safe_count("hiring_batches", {"created_at": {"$gte": (_now() - timedelta(days=30)).isoformat()}})
    job_profiles_count = safe_count("job_profiles", {"active": True})
    mobile_tokens_active = 0
    try:
        if "concierge_mobile_tokens" in _db.list_collection_names():
            mobile_tokens_active = _db.concierge_mobile_tokens.count_documents({"expires_at": {"$gt": _now()}})
    except Exception:
        pass

    # Top relay categories
    top_tickets: List[Dict[str, Any]] = []
    try:
        if "relay_tickets" in _db.list_collection_names():
            top_tickets = list(_db.relay_tickets.aggregate([
                {"$match": {"status": {"$in": ["open", "in_progress", "escalated"]}}},
                {"$group": {"_id": "$category", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}, {"$limit": 5},
                {"$project": {"_id": 0, "category": "$_id", "count": 1}},
            ]))
    except Exception:
        pass

    # Upcoming celebrations (this week)
    celebrations_this_week: List[Dict[str, Any]] = []
    try:
        from routes.milestones import _collect_milestones_for
        for i in range(0, 7):
            d = (_now() + timedelta(days=i)).strftime("%Y-%m-%d")
            for m in _collect_milestones_for(d) or []:
                celebrations_this_week.append({"date": d, "kind": m.get("kind"),
                                               "name": m.get("name"), "years": m.get("years"),
                                               "department": m.get("department")})
        celebrations_this_week = celebrations_this_week[:15]
    except Exception:
        pass

    return {
        "kpi": [
            {"label": "Active staff", "value": staff_count, "icon": "👥", "hint": "Employees on the roster"},
            {"label": "Open relay tickets", "value": relay_open, "icon": "🎫", "hint": "Across all departments"},
            {"label": "Open guest requests", "value": concierge_open, "icon": "🛎", "hint": "Concierge pipeline"},
            {"label": "Standup today", "value": "✓" if standup_today else "—", "icon": "⚓",
             "hint": "Daily standup board published" if standup_today else "No board yet today"},
            {"label": "Activations last 7d", "value": activations_week, "icon": "🌅", "hint": "Lifestyle events completed + scheduled"},
            {"label": "Hiring batches this month", "value": hiring_batches_month, "icon": "🧠", "hint": "AI-ranked candidate pools"},
            {"label": "Job profiles", "value": job_profiles_count, "icon": "🎯", "hint": "Positions in the library"},
            {"label": "Active mobile links", "value": mobile_tokens_active, "icon": "📱", "hint": "Guest companion tokens"},
        ],
        "top_ticket_categories": top_tickets,
        "celebrations_this_week": celebrations_this_week,
        "scope": {
            "scoped": scoped,
            "outlet_ids": outlet_filter or [],
        },
        "generated_at": _now().isoformat(),
    }


@router.get("/overview")
async def overview(outlets: Optional[str] = None):
    # iter266.3 · `outlets` is a comma-separated list of outlet_ids the
    # caller is assigned to. Empty/missing → portfolio-wide view.
    outlet_filter: Optional[List[str]] = None
    if outlets:
        outlet_filter = [o.strip() for o in outlets.split(",") if o.strip() and o.strip() != "all"]
        if not outlet_filter:
            outlet_filter = None
    return {"ok": True, "overview": _compute_overview(outlet_filter)}
