"""
Housekeeping Command Dashboard
===============================
Real-time occupancy readiness command center. Third pillar alongside
spa_ops (revenue) and eng_ops (uptime). Rooms + attendants + inspections
+ linen + turnover + guest experience signals.

Endpoints (prefix /api/hskp-ops):
  GET  /kpis                     — 12 housekeeping KPIs
  GET  /today                    — today's readiness board
  GET  /rooms                    — room status list (filter: status, floor)
  PATCH /rooms/{room_no}         — change room status
  GET  /arrival-priority         — today's arrivals with priority scoring
  GET  /attendants               — productivity board
  GET  /assignments              — attendant ↔ room assignments
  POST /assignments/auto         — auto-assign rooms by proximity + VIP priority
  GET  /inspections              — inspection queue
  POST /inspections              — log an inspection result
  GET  /linen                    — linen par levels + shortages
  PATCH /linen/{item}            — update a linen par level
  GET  /turnover                 — turnover speed intelligence
  GET  /guest-signals            — cleanliness / amenity complaint feed
  POST /report-issue             — attendant reports issue → auto work order
  POST /seed                     — idempotent seed of demo data
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import uuid4
import random

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db

try:
    import event_bus
except ImportError:
    event_bus = None

router = APIRouter(prefix="/api/hskp-ops", tags=["hskp-ops"])

ROOM_COLL = "hskp_rooms"
ATTEND_COLL = "hskp_attendants"
ASSIGN_COLL = "hskp_assignments"
INSP_COLL = "hskp_inspections"
LINEN_COLL = "hskp_linen"
SIGNAL_COLL = "hskp_guest_signals"
ARRIVAL_COLL = "hskp_arrivals"

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()

ROOM_STATUSES = ["ready", "dirty", "in_progress", "inspected", "ooo", "oos", "pickup", "refused"]


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class Room(BaseModel):
    room_no: str
    floor: int
    room_type: str                 # standard | deluxe | suite | presidential
    status: str = "dirty"
    is_vip_today: bool = False
    is_suite: bool = False
    current_guest: Optional[str] = None
    next_arrival_time: Optional[str] = None
    adr: float = 200.0
    last_cleaned_at: Optional[str] = None
    last_inspected_at: Optional[str] = None


class Attendant(BaseModel):
    id: str
    name: str
    floor_primary: int
    shift: str = "day"
    rooms_cleaned_today: int = 0
    active: bool = True


class RoomUpdate(BaseModel):
    status: Optional[str] = None
    attendant_id: Optional[str] = None
    note: Optional[str] = None


class LinenLevel(BaseModel):
    item: str                      # bath_towel | hand_towel | sheet_king | pillowcase | bathrobe
    par_level: int
    on_hand: int
    in_wash: int = 0
    outsourced_eta: Optional[str] = None


class IssueReport(BaseModel):
    room_no: str
    title: str
    description: str = ""
    severity: str = "medium"
    category: str = "plumbing"


class InspectionResult(BaseModel):
    room_no: str
    inspector: str
    passed: bool
    notes: str = ""


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _strip(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


async def _seed_if_empty():
    if db[ROOM_COLL].count_documents({}) == 0:
        rooms = []
        now = _now()
        for floor in range(2, 8):
            for r in range(1, 15):
                rn = f"{floor}{r:02d}"
                is_suite = r >= 12
                rooms.append({
                    "room_no": rn,
                    "floor": floor,
                    "room_type": "suite" if is_suite else ("deluxe" if r > 7 else "standard"),
                    "status": random.choices(ROOM_STATUSES[:5], weights=[25, 40, 10, 15, 5])[0],
                    "is_vip_today": random.random() < 0.08,
                    "is_suite": is_suite,
                    "current_guest": None,
                    "next_arrival_time": (now.replace(hour=15, minute=0, second=0) + timedelta(minutes=random.randint(-120, 240))).isoformat() if random.random() < 0.5 else None,
                    "adr": round(random.uniform(180, 820), 2),
                    "last_cleaned_at": (now - timedelta(hours=random.randint(1, 48))).isoformat(),
                    "last_inspected_at": (now - timedelta(hours=random.randint(1, 24))).isoformat() if random.random() < 0.7 else None,
                })
        db[ROOM_COLL].insert_many(rooms)

    if db[ATTEND_COLL].count_documents({}) == 0:
        attendants = []
        names = ["Nina Okonkwo", "Priya Sharma", "Elena Vargas", "Yuki Tanaka", "Omar Haddad", "Beatriz Reyes", "Kenji Morales", "Sofia Bergström"]
        for i, n in enumerate(names):
            attendants.append({
                "id": f"attn-{i:03d}",
                "name": n,
                "floor_primary": 2 + (i % 6),
                "shift": random.choice(["day", "evening"]),
                "rooms_cleaned_today": random.randint(0, 12),
                "active": True,
                "avg_clean_minutes": round(random.uniform(22, 38), 1),
                "inspection_pass_rate": round(random.uniform(0.88, 0.99), 2),
            })
        db[ATTEND_COLL].insert_many(attendants)

    if db[LINEN_COLL].count_documents({}) == 0:
        items = [
            ("bath_towel", 1200, 420, 320),
            ("hand_towel", 1500, 680, 210),
            ("sheet_king", 900, 540, 180),
            ("sheet_queen", 900, 410, 220),
            ("pillowcase", 1800, 1050, 340),
            ("bathrobe", 420, 180, 90),
            ("pool_towel", 800, 210, 260),
        ]
        for it, par, oh, wash in items:
            db[LINEN_COLL].insert_one({
                "item": it,
                "par_level": par,
                "on_hand": oh,
                "in_wash": wash,
                "outsourced_eta": None,
                "updated_at": _iso(),
            })

    if db[ARRIVAL_COLL].count_documents({}) == 0:
        now = _now()
        arrivals = []
        rooms = list(db[ROOM_COLL].find({}, {"_id": 0}).limit(200))
        for r in random.sample(rooms, min(22, len(rooms))):
            is_vip = r.get("is_vip_today") or random.random() < 0.12
            arrivals.append({
                "id": f"arr-{uuid4().hex[:8]}",
                "room_no": r["room_no"],
                "guest_name": random.choice(["E. Nakamura", "M. Patel", "L. Rossi", "J. Kim", "T. Abioye", "S. Aldana", "R. Weiss", "B. Chevrier"]),
                "loyalty_tier": random.choice(["standard", "gold", "platinum", "black"]),
                "vip": is_vip,
                "suite": r.get("is_suite"),
                "early_arrival": random.random() < 0.25,
                "eta": (now.replace(hour=15, minute=0, second=0) + timedelta(minutes=random.randint(-240, 360))).isoformat(),
                "special_requests": random.sample(["extra pillows", "hypoallergenic bedding", "chilled champagne", "rollaway", "crib", "late checkout"], k=random.randint(0, 2)),
                "adr": r.get("adr", 220),
            })
        db[ARRIVAL_COLL].insert_many(arrivals)


def _priority_score(arrival: dict) -> int:
    score = 0
    if arrival.get("vip"):
        score += 50
    if arrival.get("suite"):
        score += 25
    tier = arrival.get("loyalty_tier", "standard")
    score += {"black": 40, "platinum": 25, "gold": 12}.get(tier, 0)
    if arrival.get("early_arrival"):
        score += 15
    if arrival.get("special_requests"):
        score += 5 * len(arrival["special_requests"])
    score += min(30, int(arrival.get("adr", 0) / 50))
    return score


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@router.post("/seed")
async def seed():
    await _seed_if_empty()
    return {
        "ok": True,
        "rooms": db[ROOM_COLL].count_documents({}),
        "attendants": db[ATTEND_COLL].count_documents({}),
        "linen": db[LINEN_COLL].count_documents({}),
        "arrivals": db[ARRIVAL_COLL].count_documents({}),
    }


@router.get("/kpis")
async def kpis():
    await _seed_if_empty()
    rooms = list(db[ROOM_COLL].find({}, {"_id": 0}).limit(500))
    attendants = list(db[ATTEND_COLL].find({}, {"_id": 0}).limit(50))
    arrivals = list(db[ARRIVAL_COLL].find({}, {"_id": 0}).limit(200))

    total = len(rooms)
    ready = sum(1 for r in rooms if r["status"] in ("ready", "inspected"))
    dirty = sum(1 for r in rooms if r["status"] == "dirty")
    in_progress = sum(1 for r in rooms if r["status"] == "in_progress")
    ooo = sum(1 for r in rooms if r["status"] == "ooo")
    oos = sum(1 for r in rooms if r["status"] == "oos")

    # Rooms ready by arrival time — how many arrival rooms are ready already?
    arrival_rooms = {a["room_no"]: a for a in arrivals}
    arrival_ready = sum(1 for r in rooms if r["room_no"] in arrival_rooms and r["status"] in ("ready", "inspected"))
    arrival_not_ready = len(arrival_rooms) - arrival_ready
    revenue_at_risk = sum(a["adr"] for rn, a in arrival_rooms.items() if next((rr for rr in rooms if rr["room_no"] == rn), {}).get("status") not in ("ready", "inspected"))

    cleaned_today = sum(a.get("rooms_cleaned_today", 0) for a in attendants)
    active_attendants = sum(1 for a in attendants if a.get("active"))
    avg_clean_min = round(sum(a.get("avg_clean_minutes", 30) for a in attendants) / max(1, len(attendants)), 1)
    inspection_pass = round(100 * sum(a.get("inspection_pass_rate", 0.95) for a in attendants) / max(1, len(attendants)), 1)

    # Linen utilization
    linen = list(db[LINEN_COLL].find({}, {"_id": 0}).limit(50))
    linen_shortages = sum(1 for l in linen if l["on_hand"] < l["par_level"] * 0.4)

    return {
        "ts": _iso(),
        "rooms_total": total,
        "rooms_ready": ready,
        "rooms_dirty": dirty,
        "rooms_in_progress": in_progress,
        "rooms_ooo": ooo,
        "rooms_oos": oos,
        "arrivals_today": len(arrival_rooms),
        "arrival_rooms_ready": arrival_ready,
        "arrival_rooms_not_ready": arrival_not_ready,
        "revenue_at_risk_usd": round(revenue_at_risk, 2),
        "rooms_cleaned_today": cleaned_today,
        "active_attendants": active_attendants,
        "avg_clean_time_minutes": avg_clean_min,
        "inspection_pass_rate": inspection_pass,
        "linen_shortages_count": linen_shortages,
        "productivity_score": round(100 * cleaned_today / max(1, active_attendants * 14), 1),
    }


@router.get("/today")
async def today():
    await _seed_if_empty()
    now = _now()
    rooms = list(db[ROOM_COLL].find({}, {"_id": 0}).limit(500))
    arrivals = list(db[ARRIVAL_COLL].find({}, {"_id": 0}).limit(200))
    # status counts
    counts = {s: 0 for s in ROOM_STATUSES}
    for r in rooms:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    # not-ready arrival risk
    arrival_map = {a["room_no"]: a for a in arrivals}
    not_ready = []
    for rn, a in arrival_map.items():
        rm = next((r for r in rooms if r["room_no"] == rn), None)
        if rm and rm["status"] not in ("ready", "inspected"):
            not_ready.append({
                "room_no": rn,
                "status": rm["status"],
                "guest": a.get("guest_name"),
                "vip": a.get("vip"),
                "suite": a.get("suite"),
                "eta": a.get("eta"),
                "adr": a.get("adr", 0),
            })
    not_ready.sort(key=lambda x: (not x["vip"], x["eta"] or ""))
    return {
        "ts": _iso(),
        "status_counts": counts,
        "not_ready_arrival_rooms": not_ready,
        "revenue_exposure_total": round(sum(x["adr"] for x in not_ready), 2),
    }


@router.get("/rooms")
async def list_rooms(status: Optional[str] = None, floor: Optional[int] = None):
    await _seed_if_empty()
    q = {}
    if status:
        q["status"] = status
    if floor is not None:
        q["floor"] = floor
    docs = list(db[ROOM_COLL].find(q, {"_id": 0}).sort("room_no", 1).limit(500))
    return {"items": docs, "count": len(docs)}


@router.patch("/rooms/{room_no}")
async def update_room(room_no: str, upd: RoomUpdate):
    doc = db[ROOM_COLL].find_one({"room_no": room_no}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "room not found")
    updates = {}
    if upd.status and upd.status in ROOM_STATUSES:
        updates["status"] = upd.status
        if upd.status == "ready":
            updates["last_cleaned_at"] = _iso()
        if upd.status == "inspected":
            updates["last_inspected_at"] = _iso()
    if updates:
        db[ROOM_COLL].update_one({"room_no": room_no}, {"$set": updates})
    out = db[ROOM_COLL].find_one({"room_no": room_no}, {"_id": 0})
    return {"ok": True, "room": out}


@router.get("/arrival-priority")
async def arrival_priority():
    await _seed_if_empty()
    arrivals = list(db[ARRIVAL_COLL].find({}, {"_id": 0}).limit(200))
    rooms_by_no = {r["room_no"]: r for r in list(db[ROOM_COLL].find({}, {"_id": 0}).limit(500))}
    for a in arrivals:
        a["priority_score"] = _priority_score(a)
        room = rooms_by_no.get(a["room_no"])
        a["room_status"] = room["status"] if room else "unknown"
        a["ready"] = a["room_status"] in ("ready", "inspected")
    arrivals.sort(key=lambda x: (-x["priority_score"], x["eta"]))
    return {"items": arrivals, "count": len(arrivals)}


@router.get("/attendants")
async def attendants():
    await _seed_if_empty()
    docs = list(db[ATTEND_COLL].find({}, {"_id": 0}).sort("name", 1).limit(50))
    return {"items": docs, "count": len(docs)}


@router.get("/assignments")
async def get_assignments():
    docs = list(db[ASSIGN_COLL].find({}, {"_id": 0}).sort("created_at", -1).limit(500))
    return {"items": docs, "count": len(docs)}


@router.post("/assignments/auto")
async def auto_assign():
    """Cluster dirty rooms by floor, assign to the attendant on that floor, VIP first."""
    await _seed_if_empty()
    rooms = list(db[ROOM_COLL].find({"status": "dirty"}, {"_id": 0}).limit(500))
    attendants = list(db[ATTEND_COLL].find({"active": True}, {"_id": 0}).limit(50))
    arrival_vip = {a["room_no"]: a for a in list(db[ARRIVAL_COLL].find({"vip": True}, {"_id": 0}).limit(200))}
    # Group rooms by floor
    by_floor = {}
    for r in rooms:
        by_floor.setdefault(r["floor"], []).append(r)
    assignments = []
    for floor, floor_rooms in by_floor.items():
        # sort floor rooms: VIP first, then by room number
        floor_rooms.sort(key=lambda x: (0 if x["room_no"] in arrival_vip else 1, x["room_no"]))
        # pick attendant on that floor, or nearest
        cand = [a for a in attendants if a["floor_primary"] == floor]
        if not cand:
            cand = sorted(attendants, key=lambda a: abs(a["floor_primary"] - floor))[:1]
        if not cand:
            continue
        attendant = cand[0]
        for r in floor_rooms:
            assignments.append({
                "id": f"asgn-{uuid4().hex[:8]}",
                "room_no": r["room_no"],
                "attendant_id": attendant["id"],
                "attendant_name": attendant["name"],
                "vip_priority": r["room_no"] in arrival_vip,
                "floor": floor,
                "created_at": _iso(),
            })
    if assignments:
        # clear old assignments from today and insert new
        today = _now().date().isoformat()
        db[ASSIGN_COLL].delete_many({"created_at": {"$gte": today}})
        db[ASSIGN_COLL].insert_many([a.copy() for a in assignments])
    return {"ok": True, "assignments": assignments, "count": len(assignments)}


@router.get("/inspections")
async def inspection_queue():
    docs = list(db[INSP_COLL].find({}, {"_id": 0}).sort("performed_at", -1).limit(200))
    pending = db[ROOM_COLL].count_documents({"status": "ready"})
    return {"items": docs, "pending_count": pending}


@router.post("/inspections")
async def log_inspection(result: InspectionResult):
    doc = {
        "id": f"insp-{uuid4().hex[:8]}",
        "room_no": result.room_no,
        "inspector": result.inspector,
        "passed": result.passed,
        "notes": result.notes,
        "performed_at": _iso(),
    }
    db[INSP_COLL].insert_one(doc.copy())
    new_status = "inspected" if result.passed else "dirty"
    db[ROOM_COLL].update_one({"room_no": result.room_no}, {"$set": {"status": new_status, "last_inspected_at": _iso()}})
    return {"ok": True, "inspection": _strip(doc), "room_status": new_status}


@router.get("/linen")
async def linen_levels():
    await _seed_if_empty()
    items = list(db[LINEN_COLL].find({}, {"_id": 0}).limit(50))
    for it in items:
        par = it.get("par_level", 1)
        oh = it.get("on_hand", 0)
        it["pct_of_par"] = round(100 * oh / max(1, par), 1)
        it["shortage"] = oh < par * 0.4
    return {"items": items}


@router.patch("/linen/{item}")
async def update_linen(item: str, level: LinenLevel):
    upd = level.dict()
    upd["updated_at"] = _iso()
    res = db[LINEN_COLL].update_one({"item": item}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "linen item not found")
    doc = db[LINEN_COLL].find_one({"item": item}, {"_id": 0})
    return {"ok": True, "linen": doc}


@router.get("/turnover")
async def turnover_intelligence():
    """Compute turnover speed intelligence."""
    await _seed_if_empty()
    attendants = list(db[ATTEND_COLL].find({}, {"_id": 0}).limit(50))
    rooms = list(db[ROOM_COLL].find({}, {"_id": 0}).limit(500))
    arrivals = list(db[ARRIVAL_COLL].find({}, {"_id": 0}).limit(200))

    avg_clean = sum(a.get("avg_clean_minutes", 30) for a in attendants) / max(1, len(attendants))
    avg_inspect = 5.5  # static demo
    avg_release_to_ready = avg_clean + avg_inspect

    # By floor
    by_floor = {}
    for r in rooms:
        by_floor.setdefault(r["floor"], {"total": 0, "ready": 0})
        by_floor[r["floor"]]["total"] += 1
        if r["status"] in ("ready", "inspected"):
            by_floor[r["floor"]]["ready"] += 1

    # Forecast arrival readiness time
    not_ready = [r for r in rooms if r["status"] not in ("ready", "inspected") and r["room_no"] in {a["room_no"] for a in arrivals}]
    minutes_needed = len(not_ready) * avg_release_to_ready / max(1, sum(1 for a in attendants if a.get("active", True)))
    now = _now()
    forecast = now + timedelta(minutes=minutes_needed)

    return {
        "avg_clean_minutes": round(avg_clean, 1),
        "avg_inspect_minutes": avg_inspect,
        "avg_release_to_ready_minutes": round(avg_release_to_ready, 1),
        "by_floor_readiness": {str(f): round(100 * v["ready"] / max(1, v["total"]), 1) for f, v in by_floor.items()},
        "arrival_readiness_forecast_time": forecast.isoformat(),
        "not_ready_count": len(not_ready),
    }


@router.get("/guest-signals")
async def guest_signals():
    await _seed_if_empty()
    if db[SIGNAL_COLL].count_documents({}) == 0:
        # Auto-seed a few signals for the demo
        now = _now()
        for i in range(8):
            db[SIGNAL_COLL].insert_one({
                "id": f"sig-{uuid4().hex[:8]}",
                "room_no": f"{random.randint(2,7)}{random.randint(1,14):02d}",
                "signal_type": random.choice(["cleanliness", "missing_amenity", "late_ready", "linen", "odor"]),
                "severity": random.choice(["low", "medium", "high"]),
                "message": random.choice(["Dust on dresser", "Missing slippers", "Room not ready at 3pm", "Sheet stain", "Musty odor"]),
                "status": "open",
                "created_at": (now - timedelta(hours=random.randint(0, 36))).isoformat(),
            })
    docs = list(db[SIGNAL_COLL].find({}, {"_id": 0}).sort("created_at", -1).limit(100))
    counts = {}
    for d in docs:
        counts[d["severity"]] = counts.get(d["severity"], 0) + 1
    return {"items": docs, "severity_counts": counts}


@router.post("/report-issue")
async def report_issue(req: IssueReport):
    """Attendant-reported maintenance issue. Auto-creates an engineering work order
    and if severity=high/critical, blocks the room (OOO)."""
    # Block room if severe
    block = req.severity in ("high", "critical")
    if block:
        db[ROOM_COLL].update_one({"room_no": req.room_no}, {"$set": {"status": "ooo"}})

    # Look up ADR for revenue_at_risk if the room is blocked
    room = db[ROOM_COLL].find_one({"room_no": req.room_no}, {"_id": 0})
    revenue_at_risk = room.get("adr", 0.0) if block and room else 0.0
    is_vip = (room or {}).get("is_vip_today", False)

    # Create engineering work order via internal insert (direct db) to avoid cross-router circular deps
    wo_doc = {
        "id": f"wo-{uuid4().hex[:10]}",
        "ticket_no": f"ENG-{_now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}",
        "title": f"[Housekeeping] {req.title}",
        "description": req.description,
        "category": req.category,
        "severity": req.severity,
        "status": "open",
        "location": f"Room {req.room_no}",
        "room_number": req.room_no,
        "asset_id": None,
        "assignee": None,
        "source": "housekeeping",
        "guest_impact": True,
        "vip_room": is_vip,
        "revenue_at_risk": revenue_at_risk,
        "sla_breach_at": (_now() + timedelta(hours={"critical":1,"high":4,"medium":24,"low":72}.get(req.severity, 24))).isoformat(),
        "opened_at": _iso(),
        "assigned_at": None,
        "resolved_at": None,
        "notes": [],
    }
    db["eng_work_orders"].insert_one(wo_doc.copy())
    if event_bus:
        try:
            event_bus.publish("eng.work_order.created", {"id": wo_doc["id"], "ticket_no": wo_doc["ticket_no"], "severity": wo_doc["severity"], "room_number": req.room_no, "source": "housekeeping"}, source="hskp_ops")
            event_bus.publish("hskp.issue.reported", {"room_no": req.room_no, "severity": req.severity, "room_blocked": block, "revenue_at_risk": revenue_at_risk}, source="hskp_ops")
        except Exception:
            pass
    return {
        "ok": True,
        "work_order": _strip(wo_doc),
        "room_blocked": block,
        "revenue_at_risk": revenue_at_risk,
    }
