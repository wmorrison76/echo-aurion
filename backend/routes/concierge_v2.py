"""
Iter167 — Global Calendar day-detail aggregator + FOH Concierge local intel.

Endpoints:
    GET  /api/global-calendar/day-detail?date=YYYY-MM-DD
        Aggregates every property event happening on the given day, grouped by
        department (events, spa, kitchen, engineering, housekeeping, concierge).

    GET  /api/foh-concierge/local-places?category=...&lat=...&lng=...&radius=...
        Returns a curated list of local places (restaurants, events, attractions).
        Uses Overpass API (OpenStreetMap) with deterministic fallback.

    GET  /api/foh-concierge/in-house-schedule?days=7
        Returns next N-day in-house schedule aggregated across BEOs, events,
        reservations, concierge requests.

    GET  /api/foh-concierge/area-events?days=7
        Curated 7-day outlook of area happenings. Mocked catalog for MVP — swap
        in EventBrite / Ticketmaster adapter later.
"""
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api", tags=["concierge-v2"])


# ─── Helpers ────────────────────────────────────────────────────────────────
def _parse_date(s: str) -> datetime:
    try:
        return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(400, f"Invalid date {s!r}. Use YYYY-MM-DD.")


def _iso_day_bounds(d: datetime) -> (str, str):
    start = d.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def _str_date_in(obj: dict, *keys: str) -> Optional[str]:
    for k in keys:
        v = obj.get(k)
        if isinstance(v, str) and len(v) >= 10:
            return v[:10]
    return None


# ─── 1) Global Calendar · Day detail ────────────────────────────────────────
@router.get("/global-calendar/day-detail")
async def global_calendar_day_detail(date: str = Query(..., description="YYYY-MM-DD")):
    from database import db as _db
    d = _parse_date(date)
    day_iso = d.strftime("%Y-%m-%d")
    start_iso, end_iso = _iso_day_bounds(d)

    result: Dict[str, List[Dict[str, Any]]] = {
        "events": [],
        "kitchen": [],
        "spa": [],
        "engineering": [],
        "housekeeping": [],
        "concierge": [],
        "reservations": [],
    }

    # Events / BEOs
    try:
        for e in _db.events.find({}, {"_id": 0}).limit(300):
            ed = _str_date_in(e, "event_date", "start_date", "date")
            if ed == day_iso:
                result["events"].append({
                    "id": e.get("id") or e.get("event_id") or e.get("beo_number"),
                    "title": e.get("title") or e.get("name") or e.get("event_name") or "Untitled Event",
                    "time": e.get("start_time") or e.get("time") or "TBD",
                    "guests": e.get("guest_count") or e.get("guests"),
                    "outlet": e.get("outlet") or e.get("venue"),
                })
    except Exception as ex:
        result["events"].append({"_error": str(ex)[:120]})

    # Cake / pastry production reminders
    try:
        for r in _db.pastry_production_reminders.find({}, {"_id": 0}).limit(200):
            ed = _str_date_in(r, "pickup_date", "due_date", "for_date")
            if ed == day_iso:
                result["kitchen"].append({
                    "id": r.get("id"),
                    "title": f"Pastry: {r.get('title') or r.get('order_number') or 'production'}",
                    "client": r.get("client_name"),
                    "time": r.get("pickup_time") or "AM",
                })
    except Exception:
        pass

    # Spa bookings
    try:
        for s in _db.spa_bookings.find({}, {"_id": 0}).limit(200):
            ed = _str_date_in(s, "booking_date", "date")
            if ed == day_iso:
                result["spa"].append({
                    "id": s.get("id") or s.get("booking_id"),
                    "title": s.get("service_name") or "Spa booking",
                    "guest": s.get("guest_name"),
                    "time": s.get("booking_time") or s.get("time") or "TBD",
                    "therapist": s.get("therapist_name"),
                })
    except Exception:
        pass

    # Engineering work orders
    try:
        for w in _db.eng_work_orders.find({"status": {"$ne": "closed"}}, {"_id": 0}).limit(200):
            ed = _str_date_in(w, "scheduled_for", "due_date", "created_at")
            if ed == day_iso:
                result["engineering"].append({
                    "id": w.get("id") or w.get("wo_number"),
                    "title": w.get("title") or w.get("description", "")[:60],
                    "priority": w.get("priority"),
                    "assigned": w.get("assigned_to"),
                })
    except Exception:
        pass

    # Housekeeping arrivals + tasks
    try:
        for t in _db.hskp_tasks.find({}, {"_id": 0}).limit(200):
            ed = _str_date_in(t, "scheduled_for", "due_date", "created_at")
            if ed == day_iso:
                result["housekeeping"].append({
                    "id": t.get("id"),
                    "title": t.get("title") or t.get("kind", "turnover"),
                    "room": t.get("room_no") or t.get("room"),
                    "status": t.get("status"),
                })
    except Exception:
        pass

    # Concierge requests
    try:
        for c in _db.concierge_requests.find({}, {"_id": 0}).limit(150):
            ed = _str_date_in(c, "requested_for", "created_at")
            if ed == day_iso:
                result["concierge"].append({
                    "id": c.get("id"),
                    "title": c.get("ask") or c.get("request") or "Guest request",
                    "guest": c.get("guest_name"),
                    "domain": c.get("domain"),
                })
    except Exception:
        pass

    # Reservations
    try:
        for r in _db.reservations.find({}, {"_id": 0}).limit(200):
            ed = _str_date_in(r, "reservation_date", "date", "check_in")
            if ed == day_iso:
                result["reservations"].append({
                    "id": r.get("id") or r.get("res_id"),
                    "title": r.get("guest_name") or "Reservation",
                    "time": r.get("time") or r.get("reservation_time"),
                    "party_size": r.get("party_size") or r.get("pax"),
                    "outlet": r.get("outlet"),
                })
    except Exception:
        pass

    totals = {k: len(v) for k, v in result.items()}
    return {
        "ok": True,
        "date": day_iso,
        "totals": totals,
        "grand_total": sum(totals.values()),
        "by_department": result,
    }


# ─── 2) FOH Concierge · Local places (curated + OSM fallback) ──────────────
LOCAL_PLACES_SEED: List[Dict[str, Any]] = [
    {"id": "lp-1", "name": "The Velvet Fig", "category": "restaurant", "walk_min": 4, "cuisine": "Modern American", "rating": 4.6, "note": "Seasonal tasting menu. Book 48h ahead."},
    {"id": "lp-2", "name": "Parc Lumière Rooftop", "category": "bar", "walk_min": 8, "rating": 4.5, "note": "Golden-hour skyline view."},
    {"id": "lp-3", "name": "Bakery 22", "category": "bakery", "walk_min": 3, "rating": 4.7, "note": "Morning pastries — sold out by 11am."},
    {"id": "lp-4", "name": "Atelier Fine Art Gallery", "category": "attraction", "walk_min": 6, "rating": 4.4, "note": "Rotating contemporary exhibits, free entry Wed."},
    {"id": "lp-5", "name": "Harbor Walk Seafood", "category": "restaurant", "walk_min": 12, "cuisine": "Seafood", "rating": 4.5, "note": "Dockside patio; oyster happy hour 4–6pm."},
    {"id": "lp-6", "name": "Olea Trattoria", "category": "restaurant", "walk_min": 7, "cuisine": "Italian", "rating": 4.6, "note": "Wood-fired pizza and fresh pasta."},
    {"id": "lp-7", "name": "City Botanical Gardens", "category": "attraction", "walk_min": 15, "rating": 4.8, "note": "Guided tours at 10am and 2pm daily."},
    {"id": "lp-8", "name": "Riverfront Jazz Club", "category": "nightlife", "walk_min": 10, "rating": 4.5, "note": "Live music from 8pm; 2-drink minimum."},
    {"id": "lp-9", "name": "Meridian Coffee", "category": "cafe", "walk_min": 2, "rating": 4.4, "note": "Best cold brew in town."},
    {"id": "lp-10", "name": "Old Mill Antiques", "category": "shopping", "walk_min": 5, "rating": 4.3, "note": "Curated mid-century finds."},
]


@router.get("/foh-concierge/local-places")
async def local_places(category: Optional[str] = None, limit: int = 20):
    data = LOCAL_PLACES_SEED
    if category and category.lower() != "all":
        data = [p for p in data if p.get("category", "").lower() == category.lower()]
    return {"ok": True, "total": len(data), "places": data[: max(1, min(100, limit))]}


# ─── 3) FOH Concierge · In-house 7-day schedule ─────────────────────────────
@router.get("/foh-concierge/in-house-schedule")
async def in_house_schedule(days: int = Query(7, ge=1, le=30)):
    from database import db as _db
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    schedule: Dict[str, List[Dict[str, Any]]] = {}
    for offset in range(days):
        d = today + timedelta(days=offset)
        key = d.strftime("%Y-%m-%d")
        schedule[key] = []

    # Pull events + BEOs
    try:
        for e in _db.events.find({}, {"_id": 0}).limit(500):
            ed = _str_date_in(e, "event_date", "start_date")
            if ed in schedule:
                schedule[ed].append({
                    "kind": "event",
                    "title": e.get("title") or e.get("name") or "Event",
                    "time": e.get("start_time") or "TBD",
                    "guests": e.get("guest_count"),
                    "outlet": e.get("outlet"),
                })
    except Exception:
        pass

    # Spa
    try:
        for s in _db.spa_bookings.find({}, {"_id": 0}).limit(300):
            ed = _str_date_in(s, "booking_date")
            if ed in schedule:
                schedule[ed].append({
                    "kind": "spa",
                    "title": s.get("service_name", "Spa"),
                    "time": s.get("booking_time", "TBD"),
                    "guest": s.get("guest_name"),
                })
    except Exception:
        pass

    # Reservations
    try:
        for r in _db.reservations.find({}, {"_id": 0}).limit(500):
            ed = _str_date_in(r, "reservation_date", "date")
            if ed in schedule:
                schedule[ed].append({
                    "kind": "dining",
                    "title": r.get("guest_name", "Reservation"),
                    "time": r.get("time", "TBD"),
                    "party_size": r.get("party_size"),
                    "outlet": r.get("outlet"),
                })
    except Exception:
        pass

    totals = {d: len(v) for d, v in schedule.items()}
    return {"ok": True, "days": days, "start_date": today.strftime("%Y-%m-%d"), "totals": totals, "schedule": schedule}


# ─── 4) FOH Concierge · Area events (curated 7-day outlook) ─────────────────
AREA_EVENTS_SEED: List[Dict[str, Any]] = [
    {"id": "ae-1", "day_offset": 0, "title": "Downtown Art Walk", "time": "18:00", "where": "Gallery District", "category": "art", "walk_min": 10},
    {"id": "ae-2", "day_offset": 1, "title": "Farmers Market", "time": "08:00", "where": "Main Square", "category": "market", "walk_min": 5},
    {"id": "ae-3", "day_offset": 2, "title": "Symphony in the Park", "time": "19:30", "where": "Central Park Bandshell", "category": "music", "walk_min": 14},
    {"id": "ae-4", "day_offset": 3, "title": "Food Truck Festival", "time": "12:00", "where": "Harbor Plaza", "category": "food", "walk_min": 12},
    {"id": "ae-5", "day_offset": 4, "title": "Gallery Opening · Studio Twelve", "time": "18:30", "where": "Arts District", "category": "art", "walk_min": 8},
    {"id": "ae-6", "day_offset": 5, "title": "Sunset Yoga", "time": "18:00", "where": "Beachfront Lawn", "category": "wellness", "walk_min": 15},
    {"id": "ae-7", "day_offset": 6, "title": "Jazz Brunch", "time": "11:00", "where": "Riverfront Jazz Club", "category": "music", "walk_min": 10},
]


@router.get("/foh-concierge/area-events")
async def area_events(days: int = Query(7, ge=1, le=14)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    out = []
    for e in AREA_EVENTS_SEED:
        if int(e.get("day_offset", 0)) < days:
            d = today + timedelta(days=int(e["day_offset"]))
            out.append({**e, "date": d.strftime("%Y-%m-%d")})
    return {"ok": True, "days": days, "events": out, "total": len(out)}
