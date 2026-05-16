"""
EchoAi³ — Real-Time Operational Heartbeat
============================================
Returns live vital signs of the resort's operational state.
Used by the Canvas empty state to show EchoAi³ is alive and
aware even before a user asks anything.
"""
from datetime import datetime, timezone
from fastapi import APIRouter

import database

db = database.db
router = APIRouter(prefix="/api/echoai3", tags=["echoai3-heartbeat"])


@router.get("/heartbeat")
async def operational_heartbeat():
    """Return real-time operational vital signs."""
    gl = list(db["gl_entries"].find({}, {"_id": 0}).limit(200))
    total_rev = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "revenue")
    total_food = sum(e.get("amount", 0) for e in gl if "food" in e.get("gl_name", "").lower() and e.get("entry_type") == "expense")
    total_exp = sum(e.get("amount", 0) for e in gl if e.get("entry_type") == "expense")
    labor_total = sum(s.get("total_cost", 0) for s in db["labor_schedules"].find({}, {"_id": 0}).limit(200))
    ebitda = total_rev - total_exp

    events = list(db["events"].find({}, {"_id": 0}).limit(50))
    total_covers = sum(e.get("guest_count", 0) for e in events)

    ingredients = list(db["ingredients"].find({}, {"_id": 0}).limit(200))
    below_par = len([i for i in ingredients if i.get("current_stock", 0) < i.get("par_level", 10)])
    inv_health = round(max(0, 100 - (below_par / max(len(ingredients), 1) * 100)), 1)

    waste = list(db["waste_tracking"].find({}, {"_id": 0}).limit(100))
    waste_total = sum(w.get("cost", w.get("value", 0)) for w in waste)

    open_corrective = db["corrective_actions"].count_documents({"status": "open"})

    upcoming_events = db["calendar_events"].count_documents({})

    food_pct = round(total_food / max(total_rev, 1) * 100, 1)
    labor_pct = round(labor_total / max(total_rev, 1) * 100, 1)
    ebitda_pct = round(ebitda / max(total_rev, 1) * 100, 1)

    # Determine overall pulse
    signals = []
    if food_pct > 22:
        signals.append({"signal": "food_cost_elevated", "severity": "high", "value": food_pct})
    if labor_pct > 32:
        signals.append({"signal": "labor_cost_elevated", "severity": "high", "value": labor_pct})
    if below_par > 5:
        signals.append({"signal": "inventory_below_par", "severity": "medium", "count": below_par})
    if open_corrective > 3:
        signals.append({"signal": "open_corrective_actions", "severity": "medium", "count": open_corrective})

    pulse = "nominal" if not signals else "elevated" if any(s["severity"] == "high" for s in signals) else "attention"

    return {
        "pulse": pulse,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "vitals": {
            "food_cost_pct": food_pct,
            "labor_pct": labor_pct,
            "ebitda_margin_pct": ebitda_pct,
            "revenue": round(total_rev, 2),
            "ebitda": round(ebitda, 2),
            "total_covers": total_covers,
            "event_pipeline": upcoming_events,
            "inventory_health": inv_health,
            "items_below_par": below_par,
            "waste_value": round(waste_total, 2),
            "open_corrective": open_corrective,
        },
        "signals": signals,
        "outlet_count": db["outlets"].count_documents({}),
        "active_events": len(events),
    }
