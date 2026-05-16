"""
Guest 360 Profile — Unified guest view across all touchpoints
================================================================
Merges: spa visits, concierge tickets, restaurant feedback, room charges,
minibar usage, preferences, loyalty status into one comprehensive profile.
"""
from datetime import datetime, timezone
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/guest360", tags=["guest-360"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


@router.get("/profile/{identifier}")
async def guest_profile(identifier: str):
    """Get unified guest profile by room number, email, or name fragment."""
    # Search across all guest data sources
    spa_client = db["spa_clients"].find_one(
        {"$or": [{"email": identifier}, {"id": identifier}, {"first_name": {"$regex": identifier, "$options": "i"}}]},
        {"_id": 0}
    )

    room = identifier if identifier.isdigit() else None
    profile = {
        "guest_id": spa_client["id"] if spa_client else f"guest-{_uid()}",
        "name": f"{spa_client['first_name']} {spa_client['last_name']}" if spa_client else identifier,
        "email": spa_client.get("email", "") if spa_client else "",
        "phone": spa_client.get("phone", "") if spa_client else "",
        "vip": spa_client.get("vip", False) if spa_client else False,
        "preferences": spa_client.get("preferences", "") if spa_client else "",
        "allergies": spa_client.get("allergies", "") if spa_client else "",
        "room_number": room,
    }

    # Spa history
    spa_q = {"client_id": spa_client["id"]} if spa_client else {"client_name": {"$regex": identifier, "$options": "i"}}
    spa_visits = list(db["spa_appointments"].find(spa_q, {"_id": 0}).sort("date", -1).limit(10))
    spa_spend = sum(v.get("price", 0) for v in spa_visits)

    # Concierge tickets
    conc_q = {"room_number": room} if room else {"guest_name": {"$regex": identifier, "$options": "i"}}
    concierge_tickets = list(db["concierge_tickets"].find(conc_q, {"_id": 0}).sort("created_at", -1).limit(10))
    recovery_cost = sum(t.get("recovery_cost", 0) for t in concierge_tickets)

    # Restaurant feedback
    fb_q = {"room_number": room} if room else {"guest_name": {"$regex": identifier, "$options": "i"}}
    feedback = list(db["foh_feedback"].find(fb_q, {"_id": 0}).sort("created_at", -1).limit(10))
    avg_rating = round(sum(f.get("overall_rating", 0) for f in feedback) / max(len(feedback), 1), 1) if feedback else 0

    # Minibar charges
    minibar = list(db["minibar_charges"].find({"room_number": room} if room else {}, {"_id": 0}).sort("created_at", -1).limit(20))
    minibar_total = sum(m.get("total", 0) for m in minibar)

    # IRD orders
    ird_orders = list(db["ird_orders"].find({"room_number": room} if room else {"guest_name": {"$regex": identifier, "$options": "i"}}, {"_id": 0}).sort("created_at", -1).limit(10))
    ird_total = sum(o.get("total", 0) for o in ird_orders)

    # Guest orders (sundries, amenities)
    guest_orders = list(db["guest_orders"].find({"room_number": room} if room else {}, {"_id": 0}).sort("created_at", -1).limit(10))
    orders_total = sum(o.get("total", 0) for o in guest_orders)

    total_spend = spa_spend + minibar_total + ird_total + orders_total
    total_interactions = len(spa_visits) + len(concierge_tickets) + len(feedback) + len(minibar) + len(ird_orders) + len(guest_orders)

    return {
        "profile": profile,
        "summary": {
            "total_spend": round(total_spend, 2),
            "total_interactions": total_interactions,
            "spa_visits": len(spa_visits), "spa_spend": round(spa_spend, 2),
            "concierge_tickets": len(concierge_tickets), "recovery_cost": round(recovery_cost, 2),
            "avg_dining_rating": avg_rating, "feedback_count": len(feedback),
            "minibar_charges": round(minibar_total, 2),
            "ird_orders": len(ird_orders), "ird_spend": round(ird_total, 2),
            "guest_orders": len(guest_orders), "orders_spend": round(orders_total, 2),
        },
        "spa_history": spa_visits,
        "concierge_history": concierge_tickets,
        "dining_feedback": feedback,
        "minibar_history": minibar,
        "ird_history": ird_orders,
        "guest_orders": guest_orders,
    }


@router.get("/search")
async def search_guests(q: str = Query(..., min_length=1)):
    """Search guests across all data sources."""
    results = []
    # Spa clients
    for c in db["spa_clients"].find({"$or": [
        {"first_name": {"$regex": q, "$options": "i"}},
        {"last_name": {"$regex": q, "$options": "i"}},
        {"email": {"$regex": q, "$options": "i"}},
    ]}, {"_id": 0}).limit(10):
        results.append({"id": c["id"], "name": f"{c['first_name']} {c['last_name']}", "email": c.get("email", ""), "type": "spa_client", "vip": c.get("vip", False)})
    # Concierge guests by room
    for t in db["concierge_tickets"].find({"$or": [
        {"guest_name": {"$regex": q, "$options": "i"}},
        {"room_number": q},
    ]}, {"_id": 0}).limit(5):
        if not any(r["name"] == t.get("guest_name") for r in results):
            results.append({"id": t.get("room_number", ""), "name": t.get("guest_name", ""), "room": t.get("room_number", ""), "type": "concierge"})
    return {"results": results[:15]}
