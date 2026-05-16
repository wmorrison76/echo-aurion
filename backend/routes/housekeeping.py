"""
Housekeeping Module — Room Status Board, Assignments, Inspections
==================================================================
- Room status tracking (dirty, clean, inspected, occupied, OOO)
- Housekeeper assignments and workload
- Inspection checklists
- Turnover time tracking
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/housekeeping", tags=["housekeeping"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

ROOM_STATUSES = ["dirty", "in_progress", "clean", "inspected", "occupied", "checkout", "ooo", "vip_prep"]

def seed_housekeeping():
    if db["hk_rooms"].count_documents({}) > 0:
        return
    import random
    floors = {2: range(201, 215), 3: range(301, 315), 4: range(401, 415), 5: range(501, 510), 6: range(601, 615)}
    statuses = ["occupied", "occupied", "occupied", "clean", "dirty", "inspected", "checkout", "occupied"]
    types = ["king", "double", "suite", "king", "double", "king", "suite", "king"]
    for floor, rooms in floors.items():
        for i, rm in enumerate(rooms):
            db["hk_rooms"].insert_one({
                "id": f"rm-{rm}", "number": str(rm), "floor": floor,
                "room_type": types[i % len(types)], "status": statuses[i % len(statuses)],
                "housekeeper": None, "last_cleaned": None, "last_inspected": None,
                "guest_name": f"Guest {rm}" if statuses[i % len(statuses)] == "occupied" else None,
                "checkout_time": None, "notes": "", "priority": "normal",
                "do_not_disturb": False, "vip": rm % 10 == 1,
                "created_at": _now(),
            })

    housekeepers = [
        {"name": "Rosa M.", "shift": "AM", "section": "Floor 2-3", "rooms_assigned": 0, "rooms_completed": 0},
        {"name": "Maria G.", "shift": "AM", "section": "Floor 4-5", "rooms_assigned": 0, "rooms_completed": 0},
        {"name": "Ana P.", "shift": "AM", "section": "Floor 6", "rooms_assigned": 0, "rooms_completed": 0},
        {"name": "Carmen S.", "shift": "PM", "section": "Turndowns", "rooms_assigned": 0, "rooms_completed": 0},
        {"name": "Lucia R.", "shift": "AM", "section": "Public Areas", "rooms_assigned": 0, "rooms_completed": 0},
    ]
    for h in housekeepers:
        db["hk_staff"].insert_one({"id": f"hk-{_uid()}", **h, "status": "active", "created_at": _now()})


@router.get("/dashboard")
async def hk_dashboard():
    seed_housekeeping()
    rooms = list(db["hk_rooms"].find({}, {"_id": 0}))
    staff = list(db["hk_staff"].find({}, {"_id": 0}))
    by_status = defaultdict(int)
    by_floor = defaultdict(lambda: defaultdict(int))
    for r in rooms:
        by_status[r.get("status", "unknown")] += 1
        by_floor[r.get("floor", 0)][r.get("status", "unknown")] += 1
    vip_rooms = [r for r in rooms if r.get("vip")]
    return {
        "kpis": {
            "total_rooms": len(rooms), "occupied": by_status.get("occupied", 0),
            "dirty": by_status.get("dirty", 0) + by_status.get("checkout", 0),
            "clean": by_status.get("clean", 0), "inspected": by_status.get("inspected", 0),
            "ooo": by_status.get("ooo", 0), "vip_rooms": len(vip_rooms),
            "staff_on_duty": len([s for s in staff if s["status"] == "active"]),
        },
        "by_status": dict(by_status),
        "by_floor": {str(f): dict(s) for f, s in by_floor.items()},
        "rooms": rooms,
        "staff": staff,
    }

@router.get("/rooms")
async def list_rooms(floor: Optional[int] = None, status: Optional[str] = None):
    seed_housekeeping()
    q = {}
    if floor: q["floor"] = floor
    if status: q["status"] = status
    return {"rooms": list(db["hk_rooms"].find(q, {"_id": 0}).sort("number", 1))}

@router.put("/rooms/{room_number}/status")
async def update_room_status(room_number: str, status: str = Query(...), housekeeper_id: Optional[str] = None):
    update: dict = {"status": status, "updated_at": _now()}
    if status == "clean": update["last_cleaned"] = _now()
    if status == "inspected": update["last_inspected"] = _now()
    if housekeeper_id: update["housekeeper"] = housekeeper_id
    db["hk_rooms"].update_one({"number": room_number}, {"$set": update})
    return {"room": room_number, "status": status}

@router.put("/rooms/{room_number}/assign")
async def assign_room(room_number: str, housekeeper_id: str = Query(...)):
    hk = db["hk_staff"].find_one({"id": housekeeper_id}, {"_id": 0})
    db["hk_rooms"].update_one({"number": room_number}, {"$set": {"housekeeper": housekeeper_id, "housekeeper_name": hk["name"] if hk else "Unknown", "status": "in_progress"}})
    db["hk_staff"].update_one({"id": housekeeper_id}, {"$inc": {"rooms_assigned": 1}})
    return {"assigned": room_number, "to": hk["name"] if hk else housekeeper_id}
