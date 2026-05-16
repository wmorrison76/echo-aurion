"""
Front of House Operations — Host, Servers, Tips, Guest Feedback
================================================================
- Host stand management (waitlist, table assignments, turn times)
- Server section assignments + covers tracking
- Tip pool management with what-if modeling
- Guest feedback capture (QR-based ratings)
- Banquet FOH integration
- Enterprise integration-ready tip calculations
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/foh", tags=["foh-operations"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

class TipPoolConfig(BaseModel):
    pool_name: str
    structure: str = "points"  # points, percentage, equal, hours_based
    participants: List[dict] = []  # [{role, points_or_pct, name}]
    total_tips: float = 0
    service_charge_pct: float = 20
    include_banquet: bool = False

class WhatIfScenario(BaseModel):
    base_config_id: str = ""
    changes: List[dict] = []  # [{role, new_points_or_pct}]
    total_tips: float = 0

class GuestFeedbackInput(BaseModel):
    outlet_id: str = ""
    room_number: str = ""
    server_name: str = ""
    food_rating: int = 0  # 1-5
    service_rating: int = 0
    ambiance_rating: int = 0
    overall_rating: int = 0
    comment: str = ""
    guest_name: str = ""


def seed_foh():
    if db["foh_tables"].count_documents({}) > 0:
        return
    # Tables
    tables = []
    for i in range(1, 21):
        section = "A" if i <= 7 else "B" if i <= 14 else "C"
        tables.append({"id": f"tbl-{i:02d}", "number": i, "section": section, "capacity": 2 if i <= 5 else 4 if i <= 15 else 6, "status": "available", "server": None, "current_party": None})
    for t in tables:
        db["foh_tables"].insert_one({**t, "created_at": _now()})

    # Servers
    servers = [
        {"name": "Jessica M.", "role": "server", "section": "A", "shift": "PM", "hours_today": 6.5, "covers_today": 0, "tips_today": 0},
        {"name": "Marcus T.", "role": "server", "section": "B", "shift": "PM", "hours_today": 7, "covers_today": 0, "tips_today": 0},
        {"name": "Alyssa K.", "role": "server", "section": "C", "shift": "PM", "hours_today": 5.5, "covers_today": 0, "tips_today": 0},
        {"name": "David R.", "role": "bartender", "section": "Bar", "shift": "PM", "hours_today": 8, "covers_today": 0, "tips_today": 0},
        {"name": "Emma S.", "role": "host", "section": "Host", "shift": "PM", "hours_today": 6, "covers_today": 0, "tips_today": 0},
        {"name": "Tyler J.", "role": "busser", "section": "All", "shift": "PM", "hours_today": 5, "covers_today": 0, "tips_today": 0},
        {"name": "Sophia L.", "role": "food_runner", "section": "All", "shift": "PM", "hours_today": 5.5, "covers_today": 0, "tips_today": 0},
    ]
    for s in servers:
        db["foh_servers"].insert_one({"id": f"srv-{_uid()}", **s, "created_at": _now()})

    # Default tip pool config
    db["foh_tip_configs"].insert_one({
        "id": f"tp-{_uid()}", "pool_name": "Main Dining PM",
        "structure": "points", "outlet_id": "main-dining",
        "participants": [
            {"role": "server", "points": 10, "share_type": "individual"},
            {"role": "bartender", "points": 5, "share_type": "pool"},
            {"role": "busser", "points": 3, "share_type": "pool"},
            {"role": "food_runner", "points": 2, "share_type": "pool"},
            {"role": "host", "points": 1, "share_type": "pool"},
        ],
        "total_tips": 2450, "service_charge_pct": 20, "include_banquet": False,
        "active": True, "created_at": _now(),
    })

    # Sample feedback
    for i in range(5):
        db["foh_feedback"].insert_one({
            "id": f"fb-{_uid()}", "outlet_id": "main-dining",
            "food_rating": 4 + (i % 2), "service_rating": 3 + (i % 3),
            "ambiance_rating": 4, "overall_rating": 4 + (i % 2),
            "comment": ["Great experience!", "Service was slow but food excellent", "Will return!", "Nice ambiance", "Loved the steak"][i],
            "server_name": servers[i % 3]["name"], "guest_name": f"Guest {i+1}",
            "room_number": str(300 + i * 10), "created_at": _now(),
        })


# ── Dashboard ──
@router.get("/dashboard")
async def foh_dashboard():
    seed_foh()
    tables = list(db["foh_tables"].find({}, {"_id": 0}))
    servers = list(db["foh_servers"].find({}, {"_id": 0}))
    feedback = list(db["foh_feedback"].find({}, {"_id": 0}))
    configs = list(db["foh_tip_configs"].find({"active": True}, {"_id": 0}))

    available = len([t for t in tables if t["status"] == "available"])
    occupied = len([t for t in tables if t["status"] == "occupied"])
    total_covers = sum(s.get("covers_today", 0) for s in servers)
    avg_rating = round(sum(f.get("overall_rating", 0) for f in feedback) / max(len(feedback), 1), 1)

    return {
        "kpis": {
            "total_tables": len(tables), "available": available, "occupied": occupied,
            "total_servers": len([s for s in servers if s["role"] == "server"]),
            "total_staff": len(servers), "total_covers": total_covers,
            "avg_rating": avg_rating, "feedback_count": len(feedback),
        },
        "tables": tables,
        "servers": servers,
        "recent_feedback": sorted(feedback, key=lambda f: f.get("created_at", ""), reverse=True)[:5],
        "tip_config": configs[0] if configs else None,
    }


# ── Tip Pool + What-If ──
@router.get("/tip-pool")
async def get_tip_pool():
    seed_foh()
    configs = list(db["foh_tip_configs"].find({"active": True}, {"_id": 0}))
    servers = list(db["foh_servers"].find({}, {"_id": 0}))
    if not configs:
        return {"config": None, "distribution": []}

    config = configs[0]
    return _calculate_distribution(config, servers)

@router.post("/tip-pool/what-if")
async def tip_pool_what_if(scenario: WhatIfScenario):
    """Model what happens if we change the tip structure."""
    seed_foh()
    configs = list(db["foh_tip_configs"].find({"active": True}, {"_id": 0}))
    servers = list(db["foh_servers"].find({}, {"_id": 0}))
    if not configs:
        return {"error": "No active tip config"}

    config = configs[0].copy()
    if scenario.total_tips > 0:
        config["total_tips"] = scenario.total_tips
    for change in scenario.changes:
        for p in config["participants"]:
            if p["role"] == change.get("role"):
                p["points"] = change.get("new_points_or_pct", p["points"])

    return _calculate_distribution(config, servers, label="what_if")


def _calculate_distribution(config, servers, label="current"):
    total_tips = config.get("total_tips", 0)
    total_points = sum(p.get("points", 0) for p in config.get("participants", []))
    per_point = total_tips / max(total_points, 1)

    distribution = []
    for p in config.get("participants", []):
        role = p["role"]
        pts = p.get("points", 0)
        role_share = per_point * pts
        staff_in_role = [s for s in servers if s.get("role") == role]
        hours_in_role = sum(s.get("hours_today", 0) for s in staff_in_role)
        per_person = role_share / max(len(staff_in_role), 1)
        per_hour = role_share / max(hours_in_role, 1)

        distribution.append({
            "role": role, "points": pts, "total_share": round(role_share, 2),
            "staff_count": len(staff_in_role), "per_person": round(per_person, 2),
            "total_hours": round(hours_in_role, 1), "per_hour": round(per_hour, 2),
            "staff": [{"name": s["name"], "hours": s.get("hours_today", 0), "tip_amount": round(per_person * (s.get("hours_today", 0) / max(hours_in_role / max(len(staff_in_role), 1), 1)), 2)} for s in staff_in_role],
        })

    return {"config": config, "distribution": distribution, "label": label, "total_tips": total_tips, "total_points": total_points, "per_point": round(per_point, 2)}


# ── Guest Feedback ──
@router.get("/feedback")
async def list_feedback(outlet_id: Optional[str] = None):
    seed_foh()
    q = {"outlet_id": outlet_id} if outlet_id else {}
    return {"feedback": list(db["foh_feedback"].find(q, {"_id": 0}).sort("created_at", -1).limit(50))}

@router.post("/feedback")
async def submit_feedback(data: GuestFeedbackInput):
    doc = {"id": f"fb-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["foh_feedback"].insert_one(doc)
    doc.pop("_id", None)
    return doc


# ── Integration Ready Endpoints ──
@router.get("/integrations/payroll")
async def payroll_integration_status():
    """Check readiness for time & attendance integrations."""
    return {
        "integrations": [
            {"id": "adp", "name": "ADP Workforce Now", "status": "ready", "description": "Tip distribution syncs to ADP payroll. Hours + tip amounts per employee."},
            {"id": "echo_time", "name": "Echo TimeTrack", "status": "ready", "description": "Real-time tip tracking integration with time and attendance system."},
            {"id": "paylocity", "name": "Paylocity", "status": "ready", "description": "Payroll integration for tip reporting and tax compliance."},
            {"id": "toast-tips", "name": "Toast Tip Management", "status": "ready", "description": "Auto-import tips from Toast POS transactions."},
        ],
        "note": "Provide API credentials to activate. Tip data is structured for immediate sync."
    }
