"""
BEO Batch Runner & Labor Efficiency Tracker
=============================================
Run multiple BEOs simultaneously with different covers/names.
Track labor efficiency: scheduled vs actual production times.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from database import db
import time
import random

router = APIRouter(prefix="/api/beo-batch", tags=["beo-batch"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

EVENT_TEMPLATES = [
    {"name": "Corporate Breakfast Buffet", "classification": "Breakfast - Buffet", "setup": "Existing", "start": "07:00", "end": "09:00", "type": "breakfast"},
    {"name": "Working Lunch Plated", "classification": "Lunch - Plated", "setup": "Banquet", "start": "12:00", "end": "14:00", "type": "lunch"},
    {"name": "Reception Cocktail Hour", "classification": "Reception", "setup": "Reception", "start": "17:00", "end": "19:00", "type": "reception"},
    {"name": "Formal Dinner Plated", "classification": "Dinner - Plated", "setup": "Banquet", "start": "19:00", "end": "22:00", "type": "dinner"},
    {"name": "All-Day Conference Package", "classification": "Conference - Full Day", "setup": "Conference", "start": "08:00", "end": "17:00", "type": "conference"},
    {"name": "Wedding Reception", "classification": "Wedding - Reception", "setup": "Banquet", "start": "18:00", "end": "23:00", "type": "wedding"},
    {"name": "Bar Mitzvah Celebration", "classification": "Social - Celebration", "setup": "Banquet", "start": "12:00", "end": "16:00", "type": "celebration"},
    {"name": "AM Break Service", "classification": "Break - Morning", "setup": "Existing", "start": "10:00", "end": "10:30", "type": "break"},
    {"name": "PM Break Service", "classification": "Break - Afternoon", "setup": "Existing", "start": "15:00", "end": "15:30", "type": "break"},
]

ROOMS = ["Coastal Room", "Crystal Ballroom", "Pier Deck", "Marina Room", "Sky Lounge", "Boardroom A", "Boardroom B"]
COMPANIES = ["McGriff Insurance", "Goldman Family", "Deloitte Consulting", "JP Morgan", "Accenture", "PwC", "Merrill Lynch",
             "Florida Power & Light", "Baptist Health", "Royal Caribbean", "AutoNation", "Citrix Systems"]

class BatchInput(BaseModel):
    date: str
    events: List[dict]  # [{company, event_type_index, covers, room, minimum_spend}]

class LaborEntryInput(BaseModel):
    beo_id: str
    staff_id: str
    task: str
    scheduled_minutes: int
    actual_minutes: int
    station: str = ""
    notes: str = ""


@router.post("/run")
async def run_batch(data: BatchInput):
    """Create multiple BEOs simultaneously — different rooms, covers, event types."""
    start = time.time()
    from routes.beo_orchestration import _next_beo_number, _trigger_beo_cascades

    created = []
    total_covers = 0
    total_revenue = 0
    rooms_used = set()

    for evt in data.events:
        template = EVENT_TEMPLATES[evt.get("event_type_index", 0) % len(EVENT_TEMPLATES)]
        company = evt.get("company", random.choice(COMPANIES))
        covers = evt.get("covers", 50)
        room = evt.get("room", random.choice(ROOMS))
        min_spend = evt.get("minimum_spend", 0)

        # Create prospect
        prospect = {
            "id": f"prsp-{_uid()}", "company_name": company,
            "contact_name": f"Contact at {company}", "event_type": template["type"],
            "estimated_guests": covers, "preferred_dates": [data.date],
            "stage": "contract_signed", "created_at": _now(),
            "activities": [{"action": "Batch created", "timestamp": _now(), "by": "batch_runner"}],
        }
        db["event_prospects"].insert_one(prospect)

        # Create BEO
        beo_num = _next_beo_number()
        beo = {
            "id": f"beo-{_uid()}", "beo_number": beo_num,
            "prospect_id": prospect["id"], "account": company,
            "event_name": f"{company} — {template['name']}",
            "event_date": data.date,
            "start_time": template["start"], "end_time": template["end"],
            "room": room, "event_classification": template["classification"],
            "setup_type": template["setup"],
            "expected_count": covers, "guaranteed_count": covers, "set_count": covers + 5,
            "menu_sections": [], "setup_notes": [],
            "minimum_spend": min_spend,
            "master_account_id": f"MA-{company[:3].upper()}-{_uid()[:4]}",
            "post_as": company, "status": "confirmed", "revision": 1,
            "service_charge_pct": 26.0, "tax_pct": 7.0,
            "financial": {"food_revenue": round(covers * 42, 2), "beverage_revenue": round(covers * 8.5, 2),
                          "service_charge": round(covers * 50.5 * 0.26, 2), "tax": round(covers * 50.5 * 1.26 * 0.07, 2),
                          "total": round(covers * 50.5 * 1.26 * 1.07, 2), "credits": 0},
            "changelog": [{"action": "Batch BEO created", "timestamp": _now(), "by": "batch_runner", "revision": 1}],
            "created_at": _now(), "updated_at": _now(),
        }
        db["beo_documents"].insert_one(beo)
        beo.pop("_id", None)

        # Trigger cascades
        cascades = _trigger_beo_cascades(beo)

        total_covers += covers
        total_revenue += beo["financial"]["total"]
        rooms_used.add(room)
        created.append({
            "beo_number": beo_num, "beo_id": beo["id"], "company": company,
            "event": template["name"], "room": room, "covers": covers,
            "revenue": round(beo["financial"]["total"], 2),
            "cascades": len(cascades.get("notifications", [])),
        })

    elapsed = round(time.time() - start, 3)

    return {
        "batch_summary": {
            "events_created": len(created), "total_covers": total_covers,
            "total_projected_revenue": round(total_revenue, 2),
            "rooms_used": list(rooms_used), "date": data.date,
            "creation_time_seconds": elapsed,
            "events_per_second": round(len(created) / max(elapsed, 0.001), 1),
        },
        "events": created,
    }


@router.post("/run-day-simulation")
async def simulate_full_day(date: str = Query(...), event_count: int = Query(12, ge=1, le=100)):
    """Simulate a full hotel banquet day with N events across all rooms."""
    events = []
    for i in range(event_count):
        events.append({
            "company": COMPANIES[i % len(COMPANIES)],
            "event_type_index": i % len(EVENT_TEMPLATES),
            "covers": random.choice([20, 30, 50, 80, 100, 120, 150, 200, 250]),
            "room": ROOMS[i % len(ROOMS)],
            "minimum_spend": random.choice([0, 0, 2500, 5000, 10000, 15000]),
        })

    data = BatchInput(date=date, events=events)
    batch_result = await run_batch(data)

    # Now consolidate all orders for this day
    beo_ids = [e["beo_id"] for e in batch_result["events"]]

    # Generate schedules for all events
    from routes.banquet_workforce import _seed_staff
    _seed_staff()
    schedules = []
    for evt in batch_result["events"]:
        gc = evt["covers"]
        captains = max(1, gc // 40)
        servers = max(2, gc // 18)
        schedules.append({"beo": evt["beo_number"], "room": evt["room"], "covers": gc,
                          "captains": captains, "servers": servers, "total_staff": captains + servers + 2})

    total_staff = sum(s["total_staff"] for s in schedules)

    # ROI for this day
    from routes.echoai3_roi import MANUAL_TIMES
    manual_mins_per = sum(v["manual_mins"] for v in MANUAL_TIMES.values())
    echo_mins_per = sum(v["echo_mins"] for v in MANUAL_TIMES.values())
    time_saved = (manual_mins_per - echo_mins_per) * event_count

    return {
        **batch_result,
        "day_operations": {
            "total_staff_needed": total_staff,
            "schedules": schedules,
            "beo_ids_for_consolidation": beo_ids,
        },
        "time_savings": {
            "manual_hours": round(manual_mins_per * event_count / 60, 1),
            "echo_hours": round(echo_mins_per * event_count / 60, 1),
            "hours_saved": round(time_saved / 60, 1),
            "cost_saved": round(time_saved / 60 * 35, 0),
        },
    }


# ══════════════════════════════════════
#  LABOR EFFICIENCY TRACKING
# ══════════════════════════════════════

@router.post("/labor-entry")
async def record_labor_entry(data: LaborEntryInput):
    """Record actual vs scheduled labor time for efficiency tracking."""
    variance = data.actual_minutes - data.scheduled_minutes
    efficiency = round(data.scheduled_minutes / max(data.actual_minutes, 1) * 100, 1)

    entry = {
        "id": f"lab-{_uid()}", "beo_id": data.beo_id, "staff_id": data.staff_id,
        "task": data.task, "station": data.station,
        "scheduled_minutes": data.scheduled_minutes, "actual_minutes": data.actual_minutes,
        "variance_minutes": variance, "efficiency_pct": efficiency,
        "notes": data.notes, "created_at": _now(),
    }
    db["labor_efficiency"].insert_one(entry)
    entry.pop("_id", None)
    return entry


@router.get("/labor-analytics")
async def labor_efficiency_analytics():
    """Analyze labor efficiency across all BEOs."""
    entries = list(db["labor_efficiency"].find({}, {"_id": 0}))
    if not entries:
        return {"message": "No labor entries recorded yet", "entries": 0}

    by_station = defaultdict(lambda: {"scheduled": 0, "actual": 0, "count": 0})
    by_task = defaultdict(lambda: {"scheduled": 0, "actual": 0, "count": 0})

    total_scheduled = 0
    total_actual = 0

    for e in entries:
        station = e.get("station", "general")
        task = e.get("task", "general")
        by_station[station]["scheduled"] += e["scheduled_minutes"]
        by_station[station]["actual"] += e["actual_minutes"]
        by_station[station]["count"] += 1
        by_task[task]["scheduled"] += e["scheduled_minutes"]
        by_task[task]["actual"] += e["actual_minutes"]
        by_task[task]["count"] += 1
        total_scheduled += e["scheduled_minutes"]
        total_actual += e["actual_minutes"]

    bottlenecks = []
    for station, data in by_station.items():
        eff = round(data["scheduled"] / max(data["actual"], 1) * 100, 1)
        if eff < 80:
            bottlenecks.append({"station": station, "efficiency": eff, "over_by": data["actual"] - data["scheduled"]})

    bottlenecks.sort(key=lambda x: x["efficiency"])

    return {
        "total_entries": len(entries),
        "overall_efficiency": round(total_scheduled / max(total_actual, 1) * 100, 1),
        "total_scheduled_hours": round(total_scheduled / 60, 1),
        "total_actual_hours": round(total_actual / 60, 1),
        "variance_hours": round((total_actual - total_scheduled) / 60, 1),
        "by_station": {k: {**v, "efficiency": round(v["scheduled"] / max(v["actual"], 1) * 100, 1)} for k, v in by_station.items()},
        "by_task": {k: {**v, "efficiency": round(v["scheduled"] / max(v["actual"], 1) * 100, 1)} for k, v in by_task.items()},
        "bottlenecks": bottlenecks,
    }
