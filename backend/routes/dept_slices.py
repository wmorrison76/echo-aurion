"""iter202b · Department Slices — Engineering HVAC + Banquet equipment + AV flag.

These are READ-ONLY views over /api/calendar/feed. Each slice filters and enriches
the unified feed with dept-specific metadata.

Routes:
  GET /api/dept-slices/engineering?from=&to=     HVAC/work-window overlay
  GET /api/dept-slices/banquet-setup?from=&to=   Equipment auto-pull checklist
  GET /api/dept-slices/av?from=&to=              AV-required events + flags
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query
from database import db

router = APIRouter(prefix="/api/dept-slices", tags=["dept-slices"])


def _parse(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _equipment_from_setup_style(setup_style: str, guest_count: int) -> List[Dict[str, Any]]:
    """Map setup style + guest count to an equipment pull list."""
    style = (setup_style or "general").lower()
    gc = max(0, int(guest_count or 0))
    base = {
        "theater":   [("chairs", gc), ("staging", 1), ("podium", 1)],
        "classroom": [("chairs", gc), ("classroom tables 6ft", max(1, (gc + 2) // 3))],
        "u-shape":   [("chairs", gc), ("6ft tables", max(3, (gc + 1) // 2))],
        "banquet":   [("chairs", gc), ("rounds of 10", max(1, (gc + 9) // 10)), ("linens", max(1, (gc + 9) // 10)), ("place settings", gc)],
        "reception": [("high-tops", max(4, gc // 8)), ("linens", max(4, gc // 8)), ("bar stations", max(1, gc // 75))],
    }
    items = base.get(style, [("chairs", gc), ("6ft tables", max(1, gc // 8))])
    return [{"item": n, "qty": q} for n, q in items]


@router.get("/engineering")
def engineering_slice(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
):
    """Returns all events across departments that have a room/location plus a
    simple 'safe work windows' synthesis for each room (slots with NO events)."""
    from routes.calendar_feed import calendar_feed  # lazy to avoid cyclic import
    feed = calendar_feed(from_=from_, to=to, depts=None)
    entries = feed["entries"]

    by_room: Dict[str, List[Dict[str, Any]]] = {}
    for e in entries:
        room = e.get("room") or ""
        if not room:
            continue
        by_room.setdefault(room, []).append(e)

    now = datetime.now(timezone.utc)
    rooms = []
    for room, evs in sorted(by_room.items()):
        evs.sort(key=lambda x: x.get("start") or "")
        # Find next 4 "safe windows" of at least 60 min between events
        work_windows: List[Dict[str, Any]] = []
        cursor = max(now, _parse(evs[0].get("start")) - timedelta(hours=2) if evs else now)
        for e in evs:
            start = _parse(e.get("start"))
            if start and start - cursor >= timedelta(minutes=60):
                work_windows.append({"start": cursor.isoformat(), "end": start.isoformat()})
                if len(work_windows) >= 4:
                    break
            end = _parse(e.get("end")) or start
            if end and end > cursor:
                cursor = end
        rooms.append({
            "room": room,
            "event_count": len(evs),
            "upcoming_events": evs[:3],
            "safe_work_windows": work_windows,
        })

    return {"ok": True, "from": feed["from"], "to": feed["to"], "total": len(rooms), "total_rooms": len(rooms), "rooms": rooms}


@router.get("/banquet-setup")
def banquet_setup_slice(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
):
    """Auto-pull equipment checklist for every event needing setup in the window."""
    from routes.calendar_feed import calendar_feed
    feed = calendar_feed(from_=from_, to=to, depts="events,conventions,groups,banquet")
    entries = feed["entries"]

    rows = []
    for e in entries:
        if not e.get("requires_setup"):
            continue
        # Fetch richer shape if it's an event
        style = "banquet"
        if e.get("source_module") == "events":
            doc = db["events"].find_one({"id": e.get("source_id")}, {"_id": 0, "setup_style": 1})
            if doc and doc.get("setup_style"):
                style = doc["setup_style"]
        equipment = _equipment_from_setup_style(style, e.get("guest_count") or 0)
        rows.append({
            "id": e["id"],
            "title": e["title"],
            "start": e["start"],
            "end": e["end"],
            "room": e.get("room"),
            "guest_count": e.get("guest_count"),
            "setup_style": style,
            "equipment": equipment,
            "source_module": e.get("source_module"),
            "source_id": e.get("source_id"),
        })
    rows.sort(key=lambda r: r.get("start") or "")
    return {"ok": True, "from": feed["from"], "to": feed["to"], "total": len(rows), "rows": rows}


@router.get("/av")
def av_slice(
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
):
    """Flags every event that needs AV, even when AV isn't explicitly requested
    but the event type implies it (stage, music, conference, wedding reception)."""
    from routes.calendar_feed import calendar_feed
    feed = calendar_feed(from_=from_, to=to, depts=None)
    entries = feed["entries"]

    rows = []
    for e in entries:
        implied_av = False
        title = (e.get("title") or "").lower()
        if any(kw in title for kw in ("conference", "summit", "keynote", "panel", "reception", "gala", "wedding", "launch")):
            implied_av = True
        requires_av = bool(e.get("requires_av")) or implied_av
        if not requires_av:
            continue
        rows.append({
            **e,
            "av_flag_reason": "explicit" if e.get("requires_av") else "implied_by_title",
            "av_crew_assigned": False,  # placeholder — hooks into AV scheduling once wired
        })
    rows.sort(key=lambda r: r.get("start") or "")
    return {"ok": True, "from": feed["from"], "to": feed["to"], "total": len(rows), "rows": rows}
