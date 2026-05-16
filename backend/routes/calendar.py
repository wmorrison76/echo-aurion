"""
Resort Calendar — Central Nervous System
==========================================
Provides /api/calendar/* endpoints that serve as the single source of truth
for the entire resort. Every module (Events, Schedule, Purchasing, Engineering,
BQT) reads from and writes to this calendar.

When an event is created or updated here, it broadcasts via the event bus so
all modules stay in sync in real-time.
"""
import os
import uuid
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel

import database
db = database.db

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class OutletInput(BaseModel):
    name: str
    outlet_type: Optional[str] = "restaurant"  # restaurant, banquet, bar, conference, spa, pool, kitchen
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = None
    capacity: Optional[int] = 0
    location: Optional[str] = ""
    is_archived: Optional[bool] = False


class CalendarEventInput(BaseModel):
    title: str
    outlet_id: str
    event_type: Optional[str] = "event"  # event, meeting, maintenance, delivery, prep, service, block
    start: str  # ISO datetime
    end: str
    all_day: Optional[bool] = False
    status: Optional[str] = "confirmed"  # pending, confirmed, tentative, cancelled
    severity: Optional[str] = "normal"  # low, normal, high, critical
    description: Optional[str] = ""
    location: Optional[str] = ""
    room: Optional[str] = ""
    guest_count: Optional[int] = 0
    assigned_to: Optional[list] = []
    tags: Optional[list] = []
    color: Optional[str] = None
    # Cross-module linking
    linked_event_id: Optional[str] = None  # links to events.lifecycle
    linked_beo_id: Optional[str] = None
    linked_po_ids: Optional[list] = []
    linked_schedule_ids: Optional[list] = []
    # BEO / menu data
    menu_items: Optional[list] = []
    dietary_requirements: Optional[list] = []
    setup_style: Optional[str] = ""
    beo_notes: Optional[str] = ""
    # Metadata
    created_by: Optional[str] = "system"
    source_module: Optional[str] = "calendar"  # which module created this


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    outlet_id: Optional[str] = None
    event_type: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    all_day: Optional[bool] = None
    status: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    room: Optional[str] = None
    guest_count: Optional[int] = None
    assigned_to: Optional[list] = None
    tags: Optional[list] = None
    color: Optional[str] = None
    linked_event_id: Optional[str] = None
    linked_beo_id: Optional[str] = None
    linked_po_ids: Optional[list] = None
    linked_schedule_ids: Optional[list] = None
    menu_items: Optional[list] = None
    dietary_requirements: Optional[list] = None
    setup_style: Optional[str] = None
    beo_notes: Optional[str] = None


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid.uuid4())[:12]

def _clean(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


# ---------------------------------------------------------------------------
# Seed default outlets for a resort
# ---------------------------------------------------------------------------
DEFAULT_OUTLETS = [
    {"id": "outlet-main-dining", "name": "Main Dining Room", "outlet_type": "restaurant", "color": "#3b82f6", "capacity": 200, "location": "Level 1"},
    {"id": "outlet-grand-ballroom", "name": "Grand Ballroom", "outlet_type": "banquet", "color": "#8b5cf6", "capacity": 500, "location": "Level 2"},
    {"id": "outlet-garden-terrace", "name": "Garden Terrace", "outlet_type": "banquet", "color": "#10b981", "capacity": 150, "location": "Ground Floor"},
    {"id": "outlet-sky-bar", "name": "Sky Bar & Lounge", "outlet_type": "bar", "color": "#f59e0b", "capacity": 80, "location": "Rooftop"},
    {"id": "outlet-conference-a", "name": "Conference Room A", "outlet_type": "conference", "color": "#6366f1", "capacity": 40, "location": "Level 3"},
    {"id": "outlet-conference-b", "name": "Conference Room B", "outlet_type": "conference", "color": "#ec4899", "capacity": 30, "location": "Level 3"},
    {"id": "outlet-pool-deck", "name": "Pool Deck", "outlet_type": "pool", "color": "#06b6d4", "capacity": 100, "location": "Ground Floor"},
    {"id": "outlet-spa-wellness", "name": "Spa & Wellness Center", "outlet_type": "spa", "color": "#d946ef", "capacity": 25, "location": "Level 1"},
    {"id": "outlet-main-kitchen", "name": "Main Kitchen (Production)", "outlet_type": "kitchen", "color": "#ef4444", "capacity": 0, "location": "Basement"},
    {"id": "outlet-pastry-lab", "name": "Pastry Lab", "outlet_type": "kitchen", "color": "#f97316", "capacity": 0, "location": "Basement"},
]

SAMPLE_EVENTS = [
    {
        "title": "Johnson-Mitchell Wedding Reception",
        "outlet_id": "outlet-grand-ballroom",
        "event_type": "event",
        "start": "2026-04-19T17:00:00Z",
        "end": "2026-04-19T23:00:00Z",
        "status": "confirmed",
        "severity": "critical",
        "guest_count": 250,
        "setup_style": "Rounds of 10",
        "menu_items": ["Herb-Crusted Prime Rib", "Pan-Seared Salmon", "Vegan Wellington"],
        "dietary_requirements": ["12 vegan", "5 gluten-free", "3 nut allergy"],
        "beo_notes": "Live band setup by 4pm. Cake cutting at 9pm.",
        "source_module": "echo_events",
        "tags": ["wedding", "VIP", "full-service"],
    },
    {
        "title": "Corporate Board Meeting — Acme Corp",
        "outlet_id": "outlet-conference-a",
        "event_type": "meeting",
        "start": "2026-04-20T09:00:00Z",
        "end": "2026-04-20T17:00:00Z",
        "status": "confirmed",
        "severity": "high",
        "guest_count": 20,
        "setup_style": "Boardroom",
        "menu_items": ["Continental Breakfast", "Working Lunch Platter"],
        "beo_notes": "AV setup required. NDA room — no housekeeping during session.",
        "source_module": "echo_events",
        "tags": ["corporate", "NDA"],
    },
    {
        "title": "Pool Deck Resurfacing",
        "outlet_id": "outlet-pool-deck",
        "event_type": "maintenance",
        "start": "2026-04-21T06:00:00Z",
        "end": "2026-04-23T18:00:00Z",
        "status": "confirmed",
        "severity": "high",
        "description": "Full pool deck resurfacing. Area closed to guests.",
        "source_module": "engineering",
        "tags": ["maintenance", "closure"],
    },
    {
        "title": "Sysco Weekly Delivery",
        "outlet_id": "outlet-main-kitchen",
        "event_type": "delivery",
        "start": "2026-04-18T06:00:00Z",
        "end": "2026-04-18T08:00:00Z",
        "status": "confirmed",
        "severity": "normal",
        "description": "Weekly produce + protein delivery. PO #VND-2026-001",
        "source_module": "purchasing",
        "tags": ["delivery", "sysco"],
    },
    {
        "title": "AM Prep — Wedding Reception",
        "outlet_id": "outlet-main-kitchen",
        "event_type": "prep",
        "start": "2026-04-19T06:00:00Z",
        "end": "2026-04-19T15:00:00Z",
        "status": "confirmed",
        "severity": "high",
        "description": "Full kitchen prep for 250-guest wedding. All hands on deck.",
        "source_module": "schedule",
        "tags": ["prep", "wedding"],
    },
    {
        "title": "Spa Grand Opening Week",
        "outlet_id": "outlet-spa-wellness",
        "event_type": "event",
        "start": "2026-04-22T09:00:00Z",
        "end": "2026-04-26T20:00:00Z",
        "status": "confirmed",
        "severity": "high",
        "guest_count": 40,
        "description": "Spa soft opening. Complimentary treatments for VIP guests.",
        "source_module": "spa",
        "tags": ["spa", "opening", "VIP"],
    },
    {
        "title": "Wine Tasting Dinner — Sky Bar",
        "outlet_id": "outlet-sky-bar",
        "event_type": "event",
        "start": "2026-04-24T19:00:00Z",
        "end": "2026-04-24T22:00:00Z",
        "status": "confirmed",
        "severity": "normal",
        "guest_count": 60,
        "menu_items": ["5-Wine Flight", "Charcuterie Board", "Cheese Selection"],
        "source_module": "echo_events",
        "tags": ["wine", "tasting", "special-event"],
    },
    {
        "title": "Mother's Day Brunch",
        "outlet_id": "outlet-main-dining",
        "event_type": "service",
        "start": "2026-05-10T10:00:00Z",
        "end": "2026-05-10T15:00:00Z",
        "status": "tentative",
        "severity": "critical",
        "guest_count": 200,
        "menu_items": ["Brunch Buffet", "Mimosa Bar", "Live Carving Station"],
        "source_module": "culinary",
        "tags": ["holiday", "brunch", "high-volume"],
    },
]


def seed_calendar():
    """Seed default outlets and sample events if empty."""
    outlets_col = db["calendar_outlets"]
    events_col = db["calendar_events"]

    if outlets_col.count_documents({}) == 0:
        for o in DEFAULT_OUTLETS:
            outlets_col.insert_one({
                **o,
                "org_id": "default",
                "created_at": _now(),
                "updated_at": _now(),
            })

    if events_col.count_documents({}) == 0:
        for ev in SAMPLE_EVENTS:
            events_col.insert_one({
                "id": f"cal-{_uid()}",
                **ev,
                "all_day": False,
                "assigned_to": ev.get("assigned_to", []),
                "linked_event_id": None,
                "linked_beo_id": None,
                "linked_po_ids": [],
                "linked_schedule_ids": [],
                "created_by": "system",
                "created_at": _now(),
                "updated_at": _now(),
                "org_id": "default",
            })


# ---------------------------------------------------------------------------
# Outlets CRUD
# ---------------------------------------------------------------------------
@router.get("/outlets")
def list_outlets(x_org_id: str = Header("default", alias="X-Org-ID")):
    outlets = list(db["calendar_outlets"].find(
        {"org_id": x_org_id}, {"_id": 0}
    ))
    return {"data": outlets, "total": len(outlets)}


@router.post("/outlets")
def create_outlet(data: OutletInput, x_org_id: str = Header("default", alias="X-Org-ID")):
    doc = {
        "id": f"outlet-{_uid()}",
        **data.model_dump(),
        "org_id": x_org_id,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["calendar_outlets"].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/outlets/{outlet_id}")
def get_outlet(outlet_id: str):
    o = db["calendar_outlets"].find_one({"id": outlet_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Outlet not found")
    return o


# ---------------------------------------------------------------------------
# Events CRUD
# ---------------------------------------------------------------------------
@router.get("/events")
def list_events(
    outlet_ids: Optional[str] = Query(None, description="Comma-separated outlet IDs"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source_module: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    x_org_id: str = Header("default", alias="X-Org-ID"),
):
    query = {"org_id": x_org_id}

    if outlet_ids:
        ids = [s.strip() for s in outlet_ids.split(",") if s.strip()]
        if ids:
            query["outlet_id"] = {"$in": ids}
    if event_type:
        query["event_type"] = event_type
    if status:
        query["status"] = status
    if source_module:
        query["source_module"] = source_module
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    if start_date:
        query.setdefault("start", {})["$gte"] = start_date
    if end_date:
        query.setdefault("end", {})["$lte"] = end_date

    events = list(db["calendar_events"].find(query, {"_id": 0}).sort("start", 1).limit(limit))

    # iter266.16 · Merge BEOs into the global calendar so they appear in the
    # same feed without duplicating writes. Cheaper than a sync job, always
    # fresh.
    if not source_module or source_module == "maestrobqt":
        beo_query: dict = {}
        if outlet_ids:
            ids = [s.strip() for s in outlet_ids.split(",") if s.strip()]
            if ids:
                beo_query["property_id"] = {"$in": ids}
        if start_date:
            beo_query.setdefault("start_at", {})["$gte"] = start_date
        if end_date:
            beo_query.setdefault("start_at", {})["$lte"] = end_date + "T23:59:59"
        try:
            beos = list(db["beo_functions"].find(beo_query, {"_id": 0}).limit(limit))
        except Exception:
            beos = []
        for b in beos:
            events.append({
                "id": f"beo::{b.get('id')}",
                "event_type": "beo",
                "title": b.get("name") or "BEO",
                "start": b.get("start_at"),
                "end": b.get("end_at"),
                "outlet_id": b.get("property_id"),
                "source_module": "maestrobqt",
                "status": b.get("status", "scheduled"),
                "client_name": b.get("client_name"),
                "expected_covers": b.get("expected_covers", 0),
                "venue_id": b.get("venue_id"),
                "tags": (["beo"] +
                         (["last-minute"] if (b.get("updated_at") or "") >
                          (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
                          and (b.get("updated_at") or "") != (b.get("created_at") or "") else [])),
                "deep_link_panel": "beo-timeline-ui",
                "deep_link_event_id": b.get("id"),
            })
        events.sort(key=lambda e: e.get("start") or "")
        events = events[:limit]

    return {"data": events, "total": len(events)}


@router.post("/events")
def create_event(data: CalendarEventInput, x_org_id: str = Header("default", alias="X-Org-ID")):
    doc = {
        "id": f"cal-{_uid()}",
        **data.model_dump(),
        "org_id": x_org_id,
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["calendar_events"].insert_one(doc)
    doc.pop("_id", None)

    # Broadcast to all modules via event bus
    try:
        import event_bus
        event_bus.publish("calendar.event.created", {
            "event_id": doc["id"],
            "title": doc["title"],
            "outlet_id": doc["outlet_id"],
            "event_type": doc["event_type"],
            "start": doc["start"],
            "end": doc["end"],
            "guest_count": doc.get("guest_count", 0),
            "source_module": doc.get("source_module", "calendar"),
        }, source="calendar")
    except Exception:
        pass

    return doc


@router.get("/events/{event_id}")
def get_event(event_id: str):
    ev = db["calendar_events"].find_one({"id": event_id}, {"_id": 0})
    if not ev:
        raise HTTPException(404, "Calendar event not found")
    return {"data": ev}


@router.put("/events/{event_id}")
def update_event(event_id: str, data: CalendarEventUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    updates["updated_at"] = _now()

    result = db["calendar_events"].find_one_and_update(
        {"id": event_id},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Calendar event not found")
    result.pop("_id", None)

    try:
        import event_bus
        event_bus.publish("calendar.event.updated", {
            "event_id": event_id,
            "updated_fields": list(updates.keys()),
            "title": result.get("title", ""),
        }, source="calendar")
    except Exception:
        pass

    return result


@router.delete("/events/{event_id}")
def delete_event(event_id: str):
    result = db["calendar_events"].delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Calendar event not found")
    return {"deleted": True, "id": event_id}


# ---------------------------------------------------------------------------
# Cross-Module Intelligence Endpoints
# ---------------------------------------------------------------------------
@router.get("/resort-pulse")
def resort_pulse(
    date: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    x_org_id: str = Header("default", alias="X-Org-ID"),
):
    """
    AI³ Resort Pulse — Returns a snapshot of everything happening on a given
    date across ALL outlets. This is the intelligence feed that every module
    consumes to stay aware of resort operations.
    """
    target = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    day_start = f"{target}T00:00:00Z"
    day_end = f"{target}T23:59:59Z"

    events = list(db["calendar_events"].find({
        "org_id": x_org_id,
        "start": {"$lte": day_end},
        "end": {"$gte": day_start},
    }, {"_id": 0}).sort("start", 1))

    # Categorize by type
    by_type = {}
    total_guests = 0
    critical_events = []
    outlets_busy = set()

    for ev in events:
        t = ev.get("event_type", "other")
        by_type.setdefault(t, []).append(ev)
        total_guests += ev.get("guest_count", 0)
        outlets_busy.add(ev.get("outlet_id"))
        if ev.get("severity") in ("critical", "high"):
            critical_events.append({
                "id": ev["id"],
                "title": ev["title"],
                "outlet_id": ev["outlet_id"],
                "severity": ev["severity"],
                "start": ev["start"],
                "guest_count": ev.get("guest_count", 0),
            })

    return {
        "date": target,
        "total_events": len(events),
        "total_guests": total_guests,
        "outlets_active": len(outlets_busy),
        "critical_alerts": critical_events,
        "by_type": {k: len(v) for k, v in by_type.items()},
        "events": events,
        "ai3_insights": _generate_ai3_insights(events, target),
    }


@router.get("/prospects")
def list_prospects(
    outlet_ids: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    x_org_id: str = Header("default", alias="X-Org-ID"),
):
    """Prospect events from the events lifecycle pipeline."""
    query = {"org_id": x_org_id}
    if outlet_ids:
        ids = [s.strip() for s in outlet_ids.split(",") if s.strip()]
        if ids:
            query["outlet_id"] = {"$in": ids}
    if start_date:
        query.setdefault("start", {})["$gte"] = start_date
    if end_date:
        query.setdefault("end", {})["$lte"] = end_date
    query["event_type"] = {"$in": ["prospect", "tentative"]}

    events = list(db["calendar_events"].find(query, {"_id": 0}).sort("start", 1).limit(100))
    return {"data": events, "total": len(events)}


@router.get("/module-feed/{module_name}")
def module_feed(
    module_name: str,
    date: Optional[str] = Query(None),
    days_ahead: int = Query(7, ge=1, le=90),
    x_org_id: str = Header("default", alias="X-Org-ID"),
):
    """
    Module-specific intelligence feed. Each module gets events relevant to them:
    - purchasing: deliveries, events with menu_items (need ordering)
    - schedule: all events (need staffing)
    - engineering: maintenance + events in specific rooms
    - culinary: events with menu_items, prep events
    - bqt: banquet events, large guest counts
    """
    from datetime import timedelta
    target = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    end = (datetime.fromisoformat(target) + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    base_query = {
        "org_id": x_org_id,
        "start": {"$lte": f"{end}T23:59:59Z"},
        "end": {"$gte": f"{target}T00:00:00Z"},
    }

    module_filters = {
        "purchasing": {"$or": [
            {"event_type": "delivery"},
            {"menu_items": {"$exists": True, "$ne": []}},
            {"tags": {"$in": ["delivery", "supply"]}},
        ]},
        "schedule": {},  # all events relevant
        "engineering": {"$or": [
            {"event_type": "maintenance"},
            {"tags": {"$in": ["maintenance", "repair", "setup", "teardown"]}},
        ]},
        "culinary": {"$or": [
            {"event_type": {"$in": ["prep", "service"]}},
            {"menu_items": {"$exists": True, "$ne": []}},
        ]},
        "bqt": {"$or": [
            {"outlet_id": {"$regex": "ballroom|banquet|conference", "$options": "i"}},
            {"guest_count": {"$gte": 20}},
        ]},
    }

    extra = module_filters.get(module_name, {})
    if extra:
        query = {**base_query, **extra}
    else:
        query = base_query

    events = list(db["calendar_events"].find(query, {"_id": 0}).sort("start", 1).limit(200))

    return {
        "module": module_name,
        "date_range": {"from": target, "to": end},
        "events": events,
        "total": len(events),
        "summary": {
            "total_guests": sum(e.get("guest_count", 0) for e in events),
            "critical": len([e for e in events if e.get("severity") in ("critical", "high")]),
        },
    }


def _generate_ai3_insights(events, date):
    """Generate simple intelligence insights from the day's events."""
    insights = []
    total_guests = sum(e.get("guest_count", 0) for e in events)

    if total_guests > 300:
        insights.append({
            "type": "capacity_alert",
            "severity": "high",
            "message": f"High-volume day: {total_guests} total guests expected. Ensure extra staffing and prep coverage.",
        })

    critical = [e for e in events if e.get("severity") == "critical"]
    if critical:
        insights.append({
            "type": "critical_events",
            "severity": "critical",
            "message": f"{len(critical)} critical event(s) today. All departments should be on heightened awareness.",
            "events": [{"id": e["id"], "title": e["title"]} for e in critical],
        })

    maintenance = [e for e in events if e.get("event_type") == "maintenance"]
    guest_events = [e for e in events if e.get("guest_count", 0) > 0]
    if maintenance and guest_events:
        maint_outlets = {e.get("outlet_id") for e in maintenance}
        event_outlets = {e.get("outlet_id") for e in guest_events}
        conflict = maint_outlets & event_outlets
        if conflict:
            insights.append({
                "type": "conflict",
                "severity": "critical",
                "message": f"Maintenance scheduled in same outlet as guest event! Outlets: {', '.join(conflict)}",
            })

    deliveries = [e for e in events if e.get("event_type") == "delivery"]
    if deliveries:
        insights.append({
            "type": "delivery_schedule",
            "severity": "info",
            "message": f"{len(deliveries)} delivery/ies expected. Ensure receiving dock is staffed.",
        })

    menu_events = [e for e in events if e.get("menu_items")]
    if menu_events:
        all_items = []
        for e in menu_events:
            all_items.extend(e.get("menu_items", []))
        insights.append({
            "type": "culinary_demand",
            "severity": "info",
            "message": f"{len(menu_events)} event(s) require menu service. {len(all_items)} menu items across all events.",
        })

    return insights



# ---------------------------------------------------------------------------
# Sync simulation events + outlets into calendar
# ---------------------------------------------------------------------------
@router.post("/sync-simulation")
def sync_simulation_data():
    """Sync simulation events and outlets into the calendar system."""
    outlets_col = db["calendar_outlets"]
    events_col = db["calendar_events"]

    # 1. Sync outlets from simulation
    sim_outlets = list(db["outlets"].find({}, {"_id": 0}))
    outlets_synced = 0
    outlet_color_map = {
        "restaurant": "#3b82f6", "banquet": "#8b5cf6", "bar": "#f59e0b",
        "cafe": "#06b6d4", "kitchen": "#ef4444",
    }
    for o in sim_outlets:
        cal_id = f"outlet-{o.get('outlet_id', '')}"
        existing = outlets_col.find_one({"id": cal_id})
        if not existing:
            outlets_col.insert_one({
                "id": cal_id,
                "name": o.get("name", ""),
                "outlet_type": o.get("type", "restaurant"),
                "color": outlet_color_map.get(o.get("type", ""), "#3b82f6"),
                "capacity": 0,
                "location": "",
                "is_archived": False,
                "org_id": "default",
                "created_at": _now(),
                "updated_at": _now(),
            })
            outlets_synced += 1

    # 2. Sync simulation banquet events into calendar
    sim_events = list(db["events"].find({}, {"_id": 0}).limit(200))
    events_synced = 0
    for ev in sim_events:
        event_date = ev.get("event_date", "")
        if not event_date:
            continue
        ev_id = f"sim-{ev.get('id', _uid())}"
        existing = events_col.find_one({"id": ev_id})
        if not existing:
            events_col.insert_one({
                "id": ev_id,
                "title": ev.get("name", "Event"),
                "outlet_id": f"outlet-{ev.get('outlet_id', 'banquet-hall')}",
                "event_type": "event",
                "start": f"{event_date}T17:00:00Z",
                "end": f"{event_date}T23:00:00Z",
                "all_day": False,
                "status": ev.get("status", "confirmed"),
                "severity": "high" if ev.get("guest_count", 0) > 150 else "normal",
                "guest_count": ev.get("guest_count", 0),
                "description": f"{ev.get('package', '')} — {ev.get('venue', '')}",
                "room": ev.get("room", ""),
                "setup_style": "",
                "menu_items": [],
                "beo_notes": f"Package: {ev.get('package', '')}. Guest count: {ev.get('guest_count', 0)}.",
                "assigned_to": [],
                "tags": ["banquet", "simulation"],
                "linked_event_id": ev.get("id"),
                "linked_beo_id": None,
                "linked_po_ids": [],
                "linked_schedule_ids": [],
                "created_by": "simulation",
                "source_module": "simulation",
                "org_id": "default",
                "created_at": _now(),
                "updated_at": _now(),
            })
            events_synced += 1

    # 3. Also ensure seed data exists
    seed_calendar()

    return {
        "status": "synced",
        "outlets_synced": outlets_synced,
        "events_synced": events_synced,
        "total_calendar_outlets": outlets_col.count_documents({}),
        "total_calendar_events": events_col.count_documents({}),
    }
