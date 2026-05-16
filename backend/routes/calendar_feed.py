"""iter202a · Global Calendar Unification — single source of truth aggregator.

Problem: each module wrote to its own silo. Engineering/Banquet/AV couldn't see
a consolidated view. PTO, Standup activities, Lifestyle activations, Group Events
never made it into the main calendar spine.

Solution: one aggregator endpoint (`GET /api/calendar/feed`) that unions every
source into a normalised CalendarEntry shape. Each source can either (a) write
into `calendar_events` at state-change, or (b) be pulled live by the aggregator.
Both patterns are supported here for incremental adoption.

Normalised shape per entry:
    {
      id, title, dept, start, end, all_day,
      source_module, source_id,
      room, location, guest_count,
      requires_av, requires_setup, severity, status,
      color?, meta: {...original}
    }

Supported departments (dept field):
    events, conventions, banquet, av, engineering, hr, pto, lifestyle,
    spa, fnb, groups, operations
"""
from __future__ import annotations
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Query, HTTPException
from database import db

log = logging.getLogger("calendar_feed")
router = APIRouter(prefix="/api/calendar", tags=["calendar-feed"])

# Departments surfaced to the UI filter bar (in display order)
DEPARTMENTS = [
    {"id": "events", "label": "Events & BEO", "color": "#3b82f6"},
    {"id": "conventions", "label": "Conventions", "color": "#a855f7"},
    {"id": "groups", "label": "Group Events", "color": "#ec4899"},
    {"id": "banquet", "label": "Banquet Setup", "color": "#f59e0b"},
    {"id": "av", "label": "AV / Production", "color": "#10b981"},
    {"id": "engineering", "label": "Engineering", "color": "#ef4444"},
    {"id": "lifestyle", "label": "Lifestyle & Activities", "color": "#06b6d4"},
    {"id": "spa", "label": "Spa", "color": "#fb7185"},
    {"id": "fnb", "label": "F&B Outlets", "color": "#84cc16"},
    {"id": "pto", "label": "PTO & Time-Off", "color": "#64748b"},
    {"id": "operations", "label": "Operations", "color": "#94a3b8"},
]

DEPT_IDS = {d["id"] for d in DEPARTMENTS}


def _parse(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    if isinstance(s, datetime):
        return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        # Also accept bare YYYY-MM-DD
        try:
            return datetime.strptime(str(s)[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            return None


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _between(start: datetime, end: datetime, win_from: datetime, win_to: datetime) -> bool:
    return end >= win_from and start <= win_to


def _normalise_calendar_event(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """The existing `calendar_events` collection already stores most events."""
    start = _parse(doc.get("start"))
    end = _parse(doc.get("end")) or start
    if not start:
        return None
    src = doc.get("source_module") or "events"
    dept = src if src in DEPT_IDS else "events"
    tags = doc.get("tags") or []
    requires_av = bool(doc.get("requires_av")) or any("av" in (t or "").lower() for t in tags)
    requires_setup = bool(doc.get("requires_setup")) or any("setup" in (t or "").lower() or "banquet" in (t or "").lower() for t in tags)
    return {
        "id": f"cal:{doc.get('id')}",
        "source_id": doc.get("id"),
        "source_module": src,
        "title": doc.get("title") or "Untitled",
        "dept": dept,
        "start": _iso(start),
        "end": _iso(end),
        "all_day": bool(doc.get("all_day")),
        "room": doc.get("room") or doc.get("outlet_id") or "",
        "location": doc.get("location") or "",
        "guest_count": doc.get("guest_count"),
        "requires_av": requires_av,
        "requires_setup": requires_setup,
        "severity": doc.get("severity", "normal"),
        "status": doc.get("status", "confirmed"),
        "color": doc.get("color"),
        "linked_event_id": doc.get("linked_event_id"),
    }


def _normalise_pto(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if doc.get("status") not in ("approved", "pending"):
        return None
    start = _parse(doc.get("start_date") or doc.get("start"))
    end = _parse(doc.get("end_date") or doc.get("end")) or start
    if not start:
        return None
    name = doc.get("employee_name") or doc.get("requester_name") or "Employee"
    return {
        "id": f"pto:{doc.get('id') or doc.get('_id')}",
        "source_id": doc.get("id") or str(doc.get("_id", "")),
        "source_module": "pto",
        "title": f"PTO · {name}",
        "dept": "pto",
        "start": _iso(start),
        "end": _iso(end),
        "all_day": True,
        "room": "",
        "location": doc.get("department", ""),
        "guest_count": None,
        "requires_av": False,
        "requires_setup": False,
        "severity": "low" if doc.get("status") == "approved" else "normal",
        "status": doc.get("status", "approved"),
        "color": "#64748b",
        "reason": doc.get("reason") or doc.get("type") or "",
    }


def _normalise_group_event(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    start = _parse(doc.get("start_date") or doc.get("event_date"))
    end = _parse(doc.get("end_date")) or start
    if not start:
        return None
    return {
        "id": f"grp:{doc.get('id') or doc.get('_id')}",
        "source_id": doc.get("id") or str(doc.get("_id", "")),
        "source_module": "group_events",
        "title": doc.get("name") or doc.get("title") or "Group Event",
        "dept": "groups",
        "start": _iso(start),
        "end": _iso(end),
        "all_day": False,
        "room": doc.get("venue") or doc.get("room") or "",
        "location": doc.get("location") or "",
        "guest_count": doc.get("attendee_count") or doc.get("guest_count"),
        "requires_av": bool(doc.get("av_requirements") or doc.get("requires_av")),
        "requires_setup": True,
        "severity": "normal",
        "status": doc.get("status", "confirmed"),
        "color": "#ec4899",
    }


def _normalise_event(doc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Fallback: events collection (the BEO/echo-events store)."""
    start = _parse(doc.get("start_date") or doc.get("event_date"))
    end = _parse(doc.get("end_date")) or start
    if not start:
        return None
    stage = doc.get("stage", "")
    return {
        "id": f"ev:{doc.get('id') or doc.get('_id')}",
        "source_id": doc.get("id") or str(doc.get("_id", "")),
        "source_module": "events",
        "title": doc.get("name") or doc.get("title") or "Event",
        "dept": "events",
        "start": _iso(start),
        "end": _iso(end),
        "all_day": False,
        "room": doc.get("venue") or doc.get("room") or "",
        "location": doc.get("location") or "",
        "guest_count": doc.get("guaranteed_count") or doc.get("guest_count"),
        "requires_av": bool(doc.get("av_requirements")),
        "requires_setup": True,
        "severity": "normal",
        "status": stage or doc.get("status", "planning"),
        "color": "#3b82f6",
        "stage": stage,
    }


@router.get("/feed")
def calendar_feed(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    depts: Optional[str] = Query(None, description="comma-separated dept ids to include"),
):
    """Unified calendar feed — unions calendar_events, pto_requests, group_events,
    and the events collection. Dedupes `calendar_events` that derive from a
    source_module already pulled live.
    """
    now = datetime.now(timezone.utc)
    win_from = _parse(from_) or (now - timedelta(days=7))
    win_to = _parse(to) or (now + timedelta(days=90))
    selected = set([d.strip() for d in depts.split(",") if d.strip()]) if depts else None

    entries: List[Dict[str, Any]] = []
    seen_source_ids: set = set()

    # 1) calendar_events — primary spine (everything that already flows in)
    if not selected or any(d in DEPT_IDS for d in selected):
        cur = db["calendar_events"].find({}, {"_id": 0})
        for doc in cur:
            entry = _normalise_calendar_event(doc)
            if not entry:
                continue
            start = _parse(entry["start"])
            end = _parse(entry["end"]) or start
            if not _between(start, end, win_from, win_to):
                continue
            if selected and entry["dept"] not in selected:
                continue
            entries.append(entry)
            # Dedupe sentinel — if this calendar_event links back to a source id,
            # we mark so we don't double-count from the raw source pull below.
            if entry.get("linked_event_id"):
                seen_source_ids.add(entry["linked_event_id"])

    # 2) PTO requests
    if (not selected or "pto" in selected) and "pto_requests" in db.list_collection_names():
        cur = db["pto_requests"].find({}, {"_id": 0})
        for doc in cur:
            entry = _normalise_pto(doc)
            if not entry:
                continue
            start = _parse(entry["start"])
            end = _parse(entry["end"]) or start
            if _between(start, end, win_from, win_to):
                entries.append(entry)

    # 3) Group events
    if (not selected or "groups" in selected) and "group_events" in db.list_collection_names():
        cur = db["group_events"].find({}, {"_id": 0})
        for doc in cur:
            if doc.get("id") in seen_source_ids:
                continue
            entry = _normalise_group_event(doc)
            if not entry:
                continue
            start = _parse(entry["start"])
            end = _parse(entry["end"]) or start
            if _between(start, end, win_from, win_to):
                entries.append(entry)

    # 4) Events collection (BEO / echo events)
    if (not selected or "events" in selected) and "events" in db.list_collection_names():
        cur = db["events"].find({}, {"_id": 0})
        for doc in cur:
            if doc.get("id") in seen_source_ids:
                continue
            entry = _normalise_event(doc)
            if not entry:
                continue
            start = _parse(entry["start"])
            end = _parse(entry["end"]) or start
            if _between(start, end, win_from, win_to):
                entries.append(entry)

    entries.sort(key=lambda e: e["start"] or "")
    return {
        "ok": True,
        "from": _iso(win_from),
        "to": _iso(win_to),
        "total": len(entries),
        "entries": entries,
        "departments": DEPARTMENTS,
    }


@router.get("/day")
def calendar_day(date: str = Query(..., description="YYYY-MM-DD")):
    """Day drill-down — all activities for one day, grouped by dept and sorted by time."""
    try:
        day_start = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    except Exception:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    day_end = day_start + timedelta(days=1)

    # Re-use the aggregator with the 1-day window
    feed = calendar_feed(from_=day_start.isoformat(), to=day_end.isoformat(), depts=None)
    entries = feed["entries"]

    # Group by dept, preserve time order within group
    grouped: Dict[str, List[Dict[str, Any]]] = {d["id"]: [] for d in DEPARTMENTS}
    for e in entries:
        grouped.setdefault(e["dept"], []).append(e)

    return {
        "ok": True,
        "date": date,
        "total": len(entries),
        "by_dept": {k: v for k, v in grouped.items() if v},
        "departments": DEPARTMENTS,
    }


@router.get("/departments")
def list_departments():
    return {"departments": DEPARTMENTS}
