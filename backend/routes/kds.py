"""
KDS — Kitchen Display Orchestration Layer
==========================================
Production command surface sitting *above* POS KDS. Treats tickets as
data objects routed across stations with course-timing, VIP/allergy
overlays, aging, delay detection, and 3 operating modes (restaurant /
ird / banquet).

Endpoints (prefix /api/kds):
  GET  /stations                 — list all configured stations (+health)
  GET  /expo                     — Expo Command Screen payload
  GET  /station/{slug}           — Per-station ticket queue
  GET  /tickets                  — list tickets (filter: mode, status, outlet)
  POST /tickets                  — create a ticket with multi-station routing
  POST /tickets/{id}/bump-item   — mark an item ready at its station
  POST /tickets/{id}/fire-course — fire next course
  POST /tickets/{id}/hold        — hold a ticket
  POST /tickets/{id}/recall      — recall a ticket from bumped state
  POST /tickets/{id}/fulfill     — mark complete
  POST /tickets/{id}/reroute     — reroute items between stations
  GET  /allday                   — all-day rolled-up item counts + due in 5/10m
  GET  /pacing                   — overall kitchen pacing drift (for FOH)
  POST /86                       — add an SKU to the 86 list
  GET  /86                       — current 86 list
  POST /seed                     — demo seed
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4
import random

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db

try:
    import event_bus
except ImportError:
    event_bus = None

router = APIRouter(prefix="/api/kds", tags=["kds"])

STATIONS_COLL = "kds_stations"
TICKETS_COLL = "kds_tickets"
EIGHTY_SIX = "kds_86_list"

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()

DEFAULT_STATIONS = [
    ("grill", "Grill", "hot_line", 12, 540),
    ("saute", "Sauté", "hot_line", 10, 480),
    ("pantry", "Pantry", "cold_line", 8, 300),
    ("pastry", "Pastry", "dessert", 6, 720),
    ("pizza", "Pizza", "hot_line", 8, 480),
    ("fryer", "Fryer", "hot_line", 8, 360),
    ("cold", "Cold Line", "cold_line", 6, 240),
    ("expo", "Expo", "expo", 4, 60),
    ("ird-assembly", "IRD Assembly", "ird", 6, 600),
    ("banquet-plating", "Banquet Plating", "banquet", 20, 900),
    ("pool-kitchen", "Pool Kitchen", "outdoor", 6, 480),
]

TICKET_MODES = ["restaurant", "ird", "banquet"]
ITEM_STATUSES = ["new", "working", "ready", "bumped", "86"]
COURSES = ["app", "entree", "dessert", "beverage"]


class TicketItem(BaseModel):
    sku: str
    name: str
    qty: int = 1
    station_slug: str
    course: str = "entree"
    seat_no: Optional[int] = None
    modifiers: List[str] = []
    allergy_overlay: List[str] = []
    status: str = "new"
    fired_at: Optional[str] = None
    ready_at: Optional[str] = None
    bumped_at: Optional[str] = None


class CreateTicketReq(BaseModel):
    mode: str = "restaurant"
    outlet_slug: str = "pier-top"
    table_no: Optional[str] = None
    room_no: Optional[str] = None
    function_name: Optional[str] = None
    cover_count: int = 2
    guest_name: Optional[str] = None
    vip: bool = False
    allergy_flags: List[str] = []
    celebration: Optional[str] = None
    course_fire_policy: str = "sequential"   # sequential | all_at_once
    target_fire_time: Optional[str] = None
    items: List[TicketItem]


class BumpItemReq(BaseModel):
    item_index: int


class RerouteReq(BaseModel):
    item_index: int
    new_station: str


def _strip(doc: dict) -> dict:
    if doc: doc.pop("_id", None)
    return doc


async def _seed():
    if db[STATIONS_COLL].count_documents({}) == 0:
        for slug, name, group, cap, target in DEFAULT_STATIONS:
            db[STATIONS_COLL].insert_one({
                "slug": slug,
                "name": name,
                "station_group": group,
                "capacity": cap,
                "target_time_seconds": target,
                "active": True,
            })
    # Seed demo tickets across 3 modes
    if db[TICKETS_COLL].count_documents({}) == 0:
        now = _now()
        demo_items_rest = [
            [("app-tuna", "Tuna Tartare", "pantry", "app"), ("ent-salmon", "Pan-Seared Salmon", "grill", "entree")],
            [("app-caes", "Caesar Salad", "pantry", "app"), ("ent-ribeye", "Ribeye 16oz", "grill", "entree"), ("des-brulee", "Crème Brûlée", "pastry", "dessert")],
            [("ent-risotto", "Lobster Risotto", "saute", "entree"), ("ent-branz", "Branzino", "grill", "entree")],
            [("app-burr", "Burrata", "pantry", "app"), ("ent-duck", "Duck Breast", "saute", "entree")],
        ]
        for i, items in enumerate(demo_items_rest):
            ticket_items = [
                {"sku": sku, "name": name, "qty": 1, "station_slug": st, "course": course, "seat_no": idx+1, "modifiers": [], "allergy_overlay": [], "status": random.choice(["new", "working"]), "fired_at": now.isoformat(), "ready_at": None, "bumped_at": None}
                for idx, (sku, name, st, course) in enumerate(items)
            ]
            db[TICKETS_COLL].insert_one({
                "id": f"tkt-{uuid4().hex[:8]}",
                "ticket_no": f"R{now.strftime('%y%m%d')}-{100+i}",
                "mode": "restaurant",
                "outlet_slug": random.choice(["pier-top", "calusso", "sotogrande", "garni"]),
                "table_no": f"T{10+i}",
                "cover_count": random.randint(2, 6),
                "guest_name": random.choice(["E. Nakamura", "M. Patel", "B. Chevrier", None]),
                "vip": random.random() < 0.2,
                "allergy_flags": random.sample(["shellfish", "gluten", "nuts"], k=random.randint(0, 1)),
                "celebration": random.choice([None, None, None, "anniversary", "birthday"]),
                "status": "working",
                "items": ticket_items,
                "current_course": "app" if i % 2 else "entree",
                "created_at": (now - timedelta(minutes=random.randint(3, 24))).isoformat(),
                "fired_at": (now - timedelta(minutes=random.randint(0, 18))).isoformat(),
                "target_fire_time": (now + timedelta(minutes=random.randint(0, 10))).isoformat(),
            })
        # IRD demo
        db[TICKETS_COLL].insert_one({
            "id": f"tkt-{uuid4().hex[:8]}",
            "ticket_no": f"IRD{now.strftime('%y%m%d')}-01",
            "mode": "ird",
            "outlet_slug": "ird",
            "room_no": "412",
            "cover_count": 2,
            "guest_name": "E. Nakamura",
            "vip": True,
            "allergy_flags": [],
            "status": "working",
            "items": [
                {"sku": "ird-steak", "name": "Filet Mignon", "qty": 1, "station_slug": "grill", "course": "entree", "seat_no": None, "modifiers": [], "allergy_overlay": [], "status": "working", "fired_at": now.isoformat(), "ready_at": None, "bumped_at": None},
                {"sku": "ird-bev", "name": "Champagne Split", "qty": 1, "station_slug": "ird-assembly", "course": "beverage", "seat_no": None, "modifiers": [], "allergy_overlay": [], "status": "new", "fired_at": None, "ready_at": None, "bumped_at": None},
            ],
            "current_course": "entree",
            "delivery_target": (now + timedelta(minutes=25)).isoformat(),
            "created_at": (now - timedelta(minutes=6)).isoformat(),
            "fired_at": (now - timedelta(minutes=5)).isoformat(),
            "target_fire_time": (now - timedelta(minutes=5)).isoformat(),
        })
        # Banquet wave demo
        db[TICKETS_COLL].insert_one({
            "id": f"tkt-{uuid4().hex[:8]}",
            "ticket_no": f"BQT{now.strftime('%y%m%d')}-W2",
            "mode": "banquet",
            "outlet_slug": "banquet",
            "function_name": "Westwood Gala",
            "table_no": "Tables 1-24",
            "cover_count": 96,
            "wave_no": 2,
            "wave_total": 4,
            "status": "working",
            "items": [
                {"sku": "bqt-course3-main", "name": "Crown Roast × 96", "qty": 96, "station_slug": "banquet-plating", "course": "entree", "seat_no": None, "modifiers": [], "allergy_overlay": [], "status": "working", "fired_at": now.isoformat(), "ready_at": None, "bumped_at": None},
            ],
            "current_course": "entree",
            "created_at": (now - timedelta(minutes=14)).isoformat(),
            "fired_at": (now - timedelta(minutes=10)).isoformat(),
            "target_fire_time": (now + timedelta(minutes=5)).isoformat(),
        })


def _aging_state(ticket: dict) -> str:
    """Classify ticket aging color: green/yellow/red."""
    try:
        fired = datetime.fromisoformat(ticket.get("fired_at") or ticket.get("created_at"))
        elapsed = (_now() - fired).total_seconds()
        # target time based on mode
        target = 900 if ticket.get("mode") == "restaurant" else 1800 if ticket.get("mode") == "ird" else 1200
        if elapsed < target * 0.75: return "green"
        if elapsed < target: return "yellow"
        return "red"
    except Exception:
        return "green"


def _elapsed_seconds(ticket: dict) -> int:
    try:
        fired = datetime.fromisoformat(ticket.get("fired_at") or ticket.get("created_at"))
        return int((_now() - fired).total_seconds())
    except Exception:
        return 0


def _station_health(slug: str) -> Dict[str, Any]:
    """Compute station health from current working items."""
    # count working items and avg age on this station
    tickets = list(db[TICKETS_COLL].find({"status": {"$nin": ["fulfilled", "cancelled"]}}, {"_id": 0}))
    working = 0
    ages = []
    blocked = 0
    for t in tickets:
        for it in t.get("items", []):
            if it.get("station_slug") == slug and it.get("status") == "working":
                working += 1
                if it.get("fired_at"):
                    try:
                        ages.append((_now() - datetime.fromisoformat(it["fired_at"])).total_seconds())
                    except Exception:
                        pass
            elif it.get("station_slug") == slug and it.get("status") == "new":
                blocked += 1
    station = db[STATIONS_COLL].find_one({"slug": slug}, {"_id": 0}) or {}
    target = station.get("target_time_seconds", 600)
    capacity = station.get("capacity", 10)
    avg_age = sum(ages) / len(ages) if ages else 0
    longest = max(ages) if ages else 0
    color = "green"
    if avg_age > target or working > capacity * 0.9: color = "yellow"
    if avg_age > target * 1.4 or working > capacity * 1.2: color = "red"
    suggested = None
    if color == "red":
        suggested = f"Throttle routing or add labor to {station.get('name', slug)}"
    elif color == "yellow":
        suggested = f"Monitor; hold next fire on large items at {station.get('name', slug)}"
    return {
        "slug": slug,
        "name": station.get("name", slug),
        "active": working,
        "blocked": blocked,
        "avg_age_seconds": int(avg_age),
        "longest_seconds": int(longest),
        "capacity": capacity,
        "target_seconds": target,
        "color": color,
        "suggested_action": suggested,
    }


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@router.post("/seed")
async def seed():
    await _seed()
    return {"ok": True, "stations": db[STATIONS_COLL].count_documents({}), "tickets": db[TICKETS_COLL].count_documents({})}


@router.get("/stations")
async def list_stations():
    await _seed()
    stations = list(db[STATIONS_COLL].find({}, {"_id": 0}))
    # attach health
    out = [{**s, "health": _station_health(s["slug"])} for s in stations]
    return {"items": out}


@router.get("/expo")
async def expo_command_screen(mode: Optional[str] = None):
    """Expo Command Screen payload — everything the control tower needs."""
    await _seed()
    q = {"status": {"$nin": ["fulfilled", "cancelled"]}}
    if mode:
        q["mode"] = mode
    tickets = list(db[TICKETS_COLL].find(q, {"_id": 0}).sort("fired_at", 1))

    # top-bar metrics
    active = len(tickets)
    aging = {"green": 0, "yellow": 0, "red": 0}
    elapsed_samples = []
    longest = {"ticket_no": None, "seconds": 0}
    for t in tickets:
        st = _aging_state(t)
        aging[st] += 1
        e = _elapsed_seconds(t)
        elapsed_samples.append(e)
        if e > longest["seconds"]:
            longest = {"ticket_no": t.get("ticket_no"), "seconds": e}
    avg_ticket_time = int(sum(elapsed_samples) / len(elapsed_samples)) if elapsed_samples else 0

    # stations health
    stations = list(db[STATIONS_COLL].find({}, {"_id": 0}))
    station_health = [_station_health(s["slug"]) for s in stations]

    # ticket cards: compute readiness per ticket
    cards = []
    for t in tickets:
        items = t.get("items", [])
        ready = sum(1 for it in items if it.get("status") in ("ready", "bumped"))
        total = len(items)
        # next-action heuristic
        na = "Fire course"
        if total == 0:
            na = "—"
        elif ready == total:
            na = "Plate & run"
        elif any(it.get("status") == "new" for it in items):
            na = "Fire items"
        else:
            trailing_stations = list({it["station_slug"] for it in items if it.get("status") == "working"})
            na = f"Waiting on {', '.join(trailing_stations[:2])}"
        cards.append({
            "id": t["id"],
            "ticket_no": t.get("ticket_no"),
            "mode": t.get("mode"),
            "outlet_slug": t.get("outlet_slug"),
            "table_no": t.get("table_no"),
            "room_no": t.get("room_no"),
            "function_name": t.get("function_name"),
            "wave_no": t.get("wave_no"),
            "wave_total": t.get("wave_total"),
            "cover_count": t.get("cover_count"),
            "current_course": t.get("current_course"),
            "vip": t.get("vip", False),
            "allergy_flags": t.get("allergy_flags", []),
            "celebration": t.get("celebration"),
            "elapsed_seconds": _elapsed_seconds(t),
            "target_fire_time": t.get("target_fire_time"),
            "delivery_target": t.get("delivery_target"),
            "aging": _aging_state(t),
            "ready_count": ready,
            "total_items": total,
            "next_action": na,
            "items": items,
        })

    # all-day roll-up
    counts: Dict[str, Dict[str, Any]] = {}
    for t in tickets:
        for it in t.get("items", []):
            if it.get("status") in ("bumped", "ready"):  # already done — skip
                continue
            key = it["name"]
            counts.setdefault(key, {"name": key, "qty": 0, "vip_qty": 0, "allergy_variants": 0, "stations": set()})
            counts[key]["qty"] += it.get("qty", 1)
            if t.get("vip"):
                counts[key]["vip_qty"] += it.get("qty", 1)
            if t.get("allergy_flags") or it.get("allergy_overlay"):
                counts[key]["allergy_variants"] += 1
            counts[key]["stations"].add(it["station_slug"])
    allday = []
    for v in counts.values():
        v["stations"] = list(v["stations"])
        allday.append(v)
    allday.sort(key=lambda x: -x["qty"])

    # 86 list
    eightysix = list(db[EIGHTY_SIX].find({}, {"_id": 0}).limit(50))

    # FOH pacing drift
    pacing_drift_min = 0
    if elapsed_samples:
        # if avg > 12 min, compute drift
        avg_min = avg_ticket_time / 60
        pacing_drift_min = round(max(0, avg_min - 12), 1)

    return {
        "ts": _iso(),
        "top_bar": {
            "active_tickets": active,
            "danger": aging["red"] + aging["yellow"],
            "aging_counts": aging,
            "avg_ticket_seconds": avg_ticket_time,
            "longest": longest,
            "eighty_six_count": len(eightysix),
            "pacing_drift_min": pacing_drift_min,
        },
        "station_health": station_health,
        "tickets": cards,
        "allday": allday[:30],
        "eighty_six": eightysix,
    }


@router.get("/station/{slug}")
async def station_view(slug: str):
    """Per-station queue."""
    await _seed()
    tickets = list(db[TICKETS_COLL].find({"status": {"$nin": ["fulfilled", "cancelled"]}}, {"_id": 0}))
    rows = []
    for t in tickets:
        for idx, it in enumerate(t.get("items", [])):
            if it.get("station_slug") == slug:
                rows.append({
                    "ticket_id": t["id"],
                    "ticket_no": t.get("ticket_no"),
                    "mode": t.get("mode"),
                    "outlet_slug": t.get("outlet_slug"),
                    "table_no": t.get("table_no"),
                    "room_no": t.get("room_no"),
                    "function_name": t.get("function_name"),
                    "cover_count": t.get("cover_count"),
                    "vip": t.get("vip", False),
                    "allergy_flags": t.get("allergy_flags", []),
                    "item_index": idx,
                    "item": it,
                    "age_seconds": (
                        int((_now() - datetime.fromisoformat(it["fired_at"])).total_seconds())
                        if it.get("fired_at") else 0
                    ),
                })
    rows.sort(key=lambda x: (-int(bool(x["vip"])), -x["age_seconds"]))
    return {"station": slug, "health": _station_health(slug), "items": rows, "count": len(rows)}


@router.get("/tickets")
async def list_tickets(mode: Optional[str] = None, status: Optional[str] = None, outlet: Optional[str] = None, limit: int = Query(100, le=500)):
    q = {}
    if mode: q["mode"] = mode
    if status: q["status"] = status
    if outlet: q["outlet_slug"] = outlet
    docs = list(db[TICKETS_COLL].find(q, {"_id": 0}).sort("fired_at", -1).limit(limit))
    return {"items": docs, "count": len(docs)}


@router.post("/tickets")
async def create_ticket(req: CreateTicketReq):
    if req.mode not in TICKET_MODES:
        raise HTTPException(400, f"mode must be one of {TICKET_MODES}")
    now = _now()
    doc = {
        "id": f"tkt-{uuid4().hex[:8]}",
        "ticket_no": f"{req.mode[:1].upper()}{now.strftime('%y%m%d')}-{uuid4().hex[:3].upper()}",
        "mode": req.mode,
        "outlet_slug": req.outlet_slug,
        "table_no": req.table_no,
        "room_no": req.room_no,
        "function_name": req.function_name,
        "cover_count": req.cover_count,
        "guest_name": req.guest_name,
        "vip": req.vip,
        "allergy_flags": req.allergy_flags,
        "celebration": req.celebration,
        "status": "working",
        "items": [it.dict() for it in req.items],
        "current_course": req.items[0].course if req.items else "entree",
        "created_at": now.isoformat(),
        "fired_at": now.isoformat(),
        "target_fire_time": req.target_fire_time or (now + timedelta(minutes=15)).isoformat(),
    }
    # initialize item fire times for sequential policy: fire only current course now
    if req.course_fire_policy == "sequential" and req.items:
        cur_course = req.items[0].course
        for it in doc["items"]:
            if it["course"] == cur_course:
                it["status"] = "working"
                it["fired_at"] = now.isoformat()
            else:
                it["status"] = "new"
                it["fired_at"] = None
    else:
        for it in doc["items"]:
            it["status"] = "working"
            it["fired_at"] = now.isoformat()
    db[TICKETS_COLL].insert_one(doc.copy())
    if event_bus:
        try:
            event_bus.publish("kds.ticket.created", {"id": doc["id"], "ticket_no": doc["ticket_no"], "mode": doc["mode"], "outlet_slug": doc["outlet_slug"], "vip": doc["vip"]}, source="kds")
        except Exception:
            pass
    return {"ok": True, "ticket": _strip(doc)}


@router.post("/tickets/{ticket_id}/bump-item")
async def bump_item(ticket_id: str, req: BumpItemReq):
    t = db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "ticket not found")
    items = t.get("items", [])
    if req.item_index < 0 or req.item_index >= len(items):
        raise HTTPException(400, "item_index out of range")
    items[req.item_index]["status"] = "bumped"
    items[req.item_index]["bumped_at"] = _iso()
    items[req.item_index]["ready_at"] = items[req.item_index].get("ready_at") or _iso()
    # auto-fulfill if all bumped
    if all(it["status"] == "bumped" for it in items):
        db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": {"items": items, "status": "fulfilled", "fulfilled_at": _iso()}})
    else:
        db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": {"items": items}})
    if event_bus:
        try: event_bus.publish("kds.item.bumped", {"id": ticket_id, "item_index": req.item_index}, source="kds")
        except Exception: pass
    # Push completed item status back to POS outbound queue (for ticket sync)
    try:
        db["pos_outbound"].insert_one({
            "id": f"pos-{uuid4().hex[:8]}",
            "kind": "kds_item_complete",
            "action": "update",
            "ref_id": ticket_id,
            "payload": {
                "ticket_id": ticket_id,
                "ticket_no": t.get("ticket_no"),
                "item_index": req.item_index,
                "item_name": items[req.item_index].get("name"),
                "station_slug": items[req.item_index].get("station_slug"),
                "status": "ready",
                "timestamp": _iso(),
            },
            "created_at": _iso(),
            "delivered": False,
            "attempts": 0,
        })
    except Exception:
        pass
    return {"ok": True, "ticket": db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})}


@router.post("/tickets/{ticket_id}/fire-course")
async def fire_course(ticket_id: str):
    t = db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "ticket not found")
    current = t.get("current_course", "app")
    # find next course containing "new" items
    courses_in_ticket = []
    for it in t.get("items", []):
        if it["course"] not in courses_in_ticket: courses_in_ticket.append(it["course"])
    try:
        idx = courses_in_ticket.index(current)
        next_course = courses_in_ticket[idx + 1] if idx + 1 < len(courses_in_ticket) else current
    except ValueError:
        next_course = current
    items = t.get("items", [])
    now_iso = _iso()
    for it in items:
        if it["course"] == next_course and it["status"] == "new":
            it["status"] = "working"
            it["fired_at"] = now_iso
    db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": {"items": items, "current_course": next_course}})
    if event_bus:
        try: event_bus.publish("kds.course.fired", {"id": ticket_id, "course": next_course}, source="kds")
        except Exception: pass
    return {"ok": True, "fired_course": next_course, "ticket": db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})}


@router.post("/tickets/{ticket_id}/hold")
async def hold_ticket(ticket_id: str):
    r = db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": {"status": "holding", "held_at": _iso()}})
    if r.matched_count == 0: raise HTTPException(404, "ticket not found")
    return {"ok": True}


@router.post("/tickets/{ticket_id}/recall")
async def recall_ticket(ticket_id: str):
    t = db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})
    if not t: raise HTTPException(404, "ticket not found")
    items = t.get("items", [])
    for it in items:
        if it["status"] == "bumped":
            it["status"] = "working"
            it["bumped_at"] = None
    db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": {"items": items, "status": "working", "fulfilled_at": None}})
    return {"ok": True, "ticket": db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})}


@router.post("/tickets/{ticket_id}/fulfill")
async def fulfill_ticket(ticket_id: str):
    r = db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": {"status": "fulfilled", "fulfilled_at": _iso()}})
    if r.matched_count == 0: raise HTTPException(404, "ticket not found")
    return {"ok": True}


@router.post("/tickets/{ticket_id}/reroute")
async def reroute_item(ticket_id: str, req: RerouteReq):
    t = db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})
    if not t: raise HTTPException(404, "ticket not found")
    items = t.get("items", [])
    if req.item_index < 0 or req.item_index >= len(items):
        raise HTTPException(400, "item_index out of range")
    items[req.item_index]["station_slug"] = req.new_station
    db[TICKETS_COLL].update_one({"id": ticket_id}, {"$set": {"items": items}})
    return {"ok": True, "ticket": db[TICKETS_COLL].find_one({"id": ticket_id}, {"_id": 0})}


@router.get("/allday")
async def allday():
    tickets = list(db[TICKETS_COLL].find({"status": {"$nin": ["fulfilled", "cancelled"]}}, {"_id": 0}))
    counts: Dict[str, Dict[str, Any]] = {}
    for t in tickets:
        for it in t.get("items", []):
            if it.get("status") in ("bumped",): continue
            key = it["name"]
            counts.setdefault(key, {"name": key, "qty": 0, "new_qty": 0, "working_qty": 0, "ready_qty": 0, "vip_qty": 0, "allergy_variants": 0})
            counts[key]["qty"] += it.get("qty", 1)
            if it["status"] == "new": counts[key]["new_qty"] += it.get("qty", 1)
            if it["status"] == "working": counts[key]["working_qty"] += it.get("qty", 1)
            if it["status"] == "ready": counts[key]["ready_qty"] += it.get("qty", 1)
            if t.get("vip"): counts[key]["vip_qty"] += it.get("qty", 1)
            if t.get("allergy_flags"): counts[key]["allergy_variants"] += 1
    return {"items": sorted(counts.values(), key=lambda x: -x["qty"])}


@router.get("/pacing")
async def pacing():
    """FOH-facing pacing drift output."""
    tickets = list(db[TICKETS_COLL].find({"status": {"$nin": ["fulfilled", "cancelled"]}}, {"_id": 0}))
    elapsed = [_elapsed_seconds(t) for t in tickets]
    avg_min = (sum(elapsed) / len(elapsed) / 60) if elapsed else 0
    target_min = 12  # restaurant default
    drift = round(avg_min - target_min, 1)
    suggestion = None
    if drift > 3:
        suggestion = f"Kitchen running +{drift}m slow — FOH should throttle seating pace"
    elif drift > 0:
        suggestion = "Monitor; kitchen at threshold"
    return {"avg_ticket_minutes": round(avg_min, 1), "target_minutes": target_min, "drift_minutes": drift, "foh_suggestion": suggestion}


@router.post("/86")
async def add_86(sku: str, name: Optional[str] = None):
    db[EIGHTY_SIX].update_one({"sku": sku}, {"$set": {"sku": sku, "name": name or sku, "created_at": _iso()}}, upsert=True)
    return {"ok": True}


@router.get("/86")
async def list_86():
    items = list(db[EIGHTY_SIX].find({}, {"_id": 0}))
    return {"items": items}
