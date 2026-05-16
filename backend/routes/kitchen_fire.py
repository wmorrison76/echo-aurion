"""
Kitchen Fire — expo workflow on top of kitchen_routing (iter265).

Adds the real "fire" verbs operators use at expo:
  · Create a multi-course ticket with line items mapped to stations
  · Fire a course (releases tickets to assigned stations)
  · Hold remaining courses (so a station doesn't drop too early)
  · Expo callout — broadcasts "Table X, N min out" to all stations
  · Fire-back — return an item to its station with a reason (under-cooked,
    wrong temp, mis-fired, etc.). Logs and re-fires.
  · Bump — mark an item ready at the station; expo sees it lit green
  · All-day report — count of each item across active tickets

Persistent collections:
  fire_tickets          — the ticket header (table, server, courses, status)
  fire_ticket_items     — every line item with current state (queued, fired,
                          ready, bumped, fire_back)
  fire_callouts         — append-only audit log of expo callouts
  fire_back_log         — audit of fire-backs with reason and outcome
"""
from datetime import datetime, timezone
from uuid import uuid4
from typing import List, Optional, Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from database import db

router = APIRouter(prefix="/api/kitchen-fire", tags=["kitchen-fire"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda p="fire": f"{p}-{str(uuid4())[:8]}"

ItemState = Literal["queued", "fired", "ready", "bumped", "fire_back"]
TicketState = Literal["open", "in_progress", "expo_called", "closed"]


# ──────────────────────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────────────────────
class LineItemInput(BaseModel):
    name: str
    course: int = Field(1, ge=1, le=12)
    station_id: str
    qty: int = 1
    notes: str = ""
    seat: Optional[int] = None
    allergen_flags: List[str] = []


class TicketInput(BaseModel):
    table: str
    server: str
    outlet_id: str = "default"
    party_size: int = 1
    items: List[LineItemInput]
    open_until_course: int = 0  # 0 = none fired yet


class FireCourseInput(BaseModel):
    course: int = Field(..., ge=1, le=12)


class CalloutInput(BaseModel):
    minutes_out: int = Field(..., ge=0, le=60)
    message: str = ""


class FireBackInput(BaseModel):
    reason: str
    action: Literal["redo", "adjust", "remove"] = "redo"
    notes: str = ""


# ──────────────────────────────────────────────────────────────────────────────
# Tickets
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/tickets")
async def create_ticket(data: TicketInput):
    """Create a new fire ticket. All items start in `queued` state — nothing
    prints until a course is explicitly fired."""
    ticket_id = _uid("tkt")
    ticket = {
        "id": ticket_id,
        "table": data.table,
        "server": data.server,
        "outlet_id": data.outlet_id,
        "party_size": data.party_size,
        "state": "open",
        "open_until_course": data.open_until_course,
        "fired_courses": [],
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["fire_tickets"].insert_one(ticket)
    item_ids = []
    for item in data.items:
        item_doc = {
            "id": _uid("itm"),
            "ticket_id": ticket_id,
            **item.model_dump(),
            "state": "queued",
            "fired_at": None,
            "ready_at": None,
            "bumped_at": None,
            "fire_back_count": 0,
            "created_at": _now(),
        }
        db["fire_ticket_items"].insert_one(item_doc)
        item_ids.append(item_doc["id"])
    ticket.pop("_id", None)
    return {**ticket, "item_ids": item_ids}


@router.get("/tickets/active")
async def list_active_tickets(outlet_id: Optional[str] = None, station_id: Optional[str] = None):
    """Active = not closed. If station_id is given, only return tickets that
    have at least one item assigned to that station."""
    q = {"state": {"$ne": "closed"}}
    if outlet_id:
        q["outlet_id"] = outlet_id
    tickets = list(db["fire_tickets"].find(q, {"_id": 0}).sort("created_at", 1))
    out = []
    for t in tickets:
        items = list(
            db["fire_ticket_items"].find({"ticket_id": t["id"]}, {"_id": 0}).sort("course", 1)
        )
        if station_id and not any(i.get("station_id") == station_id for i in items):
            continue
        out.append({**t, "items": items})
    return {"count": len(out), "tickets": out}


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    t = db["fire_tickets"].find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "ticket not found")
    items = list(
        db["fire_ticket_items"].find({"ticket_id": ticket_id}, {"_id": 0}).sort("course", 1)
    )
    return {**t, "items": items}


@router.post("/tickets/{ticket_id}/fire")
async def fire_course(ticket_id: str, data: FireCourseInput):
    """Fire a course. Updates all items at that course to `fired` state and
    timestamps. Returns the per-station summary for routing."""
    t = db["fire_tickets"].find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "ticket not found")
    if data.course in t.get("fired_courses", []):
        raise HTTPException(400, f"course {data.course} already fired")

    now = _now()
    db["fire_ticket_items"].update_many(
        {"ticket_id": ticket_id, "course": data.course, "state": "queued"},
        {"$set": {"state": "fired", "fired_at": now}},
    )
    fired_courses = t.get("fired_courses", []) + [data.course]
    db["fire_tickets"].update_one(
        {"id": ticket_id},
        {
            "$set": {
                "state": "in_progress",
                "fired_courses": fired_courses,
                "open_until_course": data.course,
                "updated_at": now,
            }
        },
    )
    fired = list(
        db["fire_ticket_items"].find(
            {"ticket_id": ticket_id, "course": data.course},
            {"_id": 0},
        )
    )
    by_station = {}
    for item in fired:
        sid = item["station_id"]
        by_station.setdefault(sid, []).append(item)
    return {
        "fired_course": data.course,
        "ticket_id": ticket_id,
        "items_fired": len(fired),
        "by_station": by_station,
    }


@router.post("/tickets/{ticket_id}/hold")
async def hold_ticket(ticket_id: str):
    """Hold — keep ticket open but flag stations not to drop the next course."""
    t = db["fire_tickets"].find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "ticket not found")
    db["fire_tickets"].update_one(
        {"id": ticket_id}, {"$set": {"state": "open", "updated_at": _now()}}
    )
    return {"held": ticket_id}


@router.post("/tickets/{ticket_id}/callout")
async def expo_callout(ticket_id: str, data: CalloutInput):
    """Expo announces ETA. Logged to fire_callouts so all stations + KDS can
    surface it. The frontend subscribes via the periodic /active poll."""
    t = db["fire_tickets"].find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "ticket not found")
    cid = _uid("cal")
    callout = {
        "id": cid,
        "ticket_id": ticket_id,
        "table": t["table"],
        "minutes_out": data.minutes_out,
        "message": data.message,
        "called_at": _now(),
    }
    db["fire_callouts"].insert_one(callout)
    db["fire_tickets"].update_one(
        {"id": ticket_id},
        {"$set": {"state": "expo_called", "updated_at": _now()}},
    )
    callout.pop("_id", None)
    return callout


@router.get("/callouts/recent")
async def recent_callouts(limit: int = 25):
    return {
        "callouts": list(
            db["fire_callouts"].find({}, {"_id": 0}).sort("called_at", -1).limit(limit)
        )
    }


# ──────────────────────────────────────────────────────────────────────────────
# Item-level actions (bump, fire-back)
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/items/{item_id}/bump")
async def bump_item(item_id: str):
    """Mark an item as ready at the station. Expo sees a green light."""
    item = db["fire_ticket_items"].find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "item not found")
    db["fire_ticket_items"].update_one(
        {"id": item_id},
        {"$set": {"state": "ready", "ready_at": _now()}},
    )
    return {"bumped": item_id}


@router.post("/items/{item_id}/expo-bump")
async def expo_bump_item(item_id: str):
    """Expo bumps the item off the rail (delivered)."""
    db["fire_ticket_items"].update_one(
        {"id": item_id}, {"$set": {"state": "bumped", "bumped_at": _now()}}
    )
    return {"expo_bumped": item_id}


@router.post("/items/{item_id}/fire-back")
async def fire_back_item(item_id: str, data: FireBackInput):
    """Send an item back to the station with a reason. Increments fire_back
    count and logs to fire_back_log for chef review."""
    item = db["fire_ticket_items"].find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "item not found")
    log_id = _uid("fb")
    db["fire_back_log"].insert_one(
        {
            "id": log_id,
            "item_id": item_id,
            "ticket_id": item["ticket_id"],
            "station_id": item["station_id"],
            "reason": data.reason,
            "action": data.action,
            "notes": data.notes,
            "logged_at": _now(),
        }
    )
    new_state = "queued" if data.action == "redo" else "fire_back"
    db["fire_ticket_items"].update_one(
        {"id": item_id},
        {
            "$set": {"state": new_state, "fired_at": None, "ready_at": None},
            "$inc": {"fire_back_count": 1},
        },
    )
    return {"fire_back": item_id, "new_state": new_state, "log_id": log_id}


# ──────────────────────────────────────────────────────────────────────────────
# Reports
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/all-day")
async def all_day_report(outlet_id: Optional[str] = None):
    """All-day count of every item across active tickets — used by the line
    to pre-prep batches."""
    tickets_q = {"state": {"$ne": "closed"}}
    if outlet_id:
        tickets_q["outlet_id"] = outlet_id
    active_ticket_ids = [t["id"] for t in db["fire_tickets"].find(tickets_q, {"_id": 0, "id": 1})]
    counts = {}
    for item in db["fire_ticket_items"].find(
        {"ticket_id": {"$in": active_ticket_ids}}, {"_id": 0}
    ):
        key = (item["name"], item["station_id"])
        counts[key] = counts.get(key, 0) + item.get("qty", 1)
    rows = [
        {"name": k[0], "station_id": k[1], "qty": v}
        for k, v in sorted(counts.items(), key=lambda x: x[1], reverse=True)
    ]
    return {"active_tickets": len(active_ticket_ids), "items": rows}


@router.get("/fire-back-summary")
async def fire_back_summary(days: int = 7):
    """Audit summary of fire-backs by reason and station — chef accountability."""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = list(
        db["fire_back_log"].find({"logged_at": {"$gte": cutoff}}, {"_id": 0})
    )
    by_reason = {}
    by_station = {}
    for r in rows:
        by_reason[r["reason"]] = by_reason.get(r["reason"], 0) + 1
        by_station[r["station_id"]] = by_station.get(r["station_id"], 0) + 1
    return {
        "days": days,
        "total": len(rows),
        "by_reason": by_reason,
        "by_station": by_station,
        "recent": rows[:20],
    }


@router.post("/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str):
    db["fire_tickets"].update_one(
        {"id": ticket_id}, {"$set": {"state": "closed", "updated_at": _now()}}
    )
    return {"closed": ticket_id}
