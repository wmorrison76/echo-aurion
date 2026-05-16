"""
Beverage Operations Intelligence — Bottle Scanning, Consumption Bar Tracking,
Monthly Audits, FOH Training, Toast/Arrival Beverages, Pricing Accuracy
==========================================================================
- Bottle scan: photo-based volume detection for monthly inventory audits
- Consumption bar tracking: before/after event snap to determine usage
- Non-alcoholic beverages → food cost line (accounting)
- Arrival beverages & toasts tracking
- Pricing accuracy metrics vs banquet menu pricing over time
- FOH Chef Gio Training mode for mixology/sommelier
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from database import db
import math

router = APIRouter(prefix="/api/beverage-ops", tags=["beverage-ops"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


# ══════════════════════════════════════
#  BOTTLE SCAN & VOLUME TRACKING
# ══════════════════════════════════════

STANDARD_BOTTLES = {
    "750ml": {"oz": 25.4, "ml": 750, "pours_1_5oz": 16, "pours_2oz": 12},
    "1L": {"oz": 33.8, "ml": 1000, "pours_1_5oz": 22, "pours_2oz": 16},
    "1.75L": {"oz": 59.2, "ml": 1750, "pours_1_5oz": 39, "pours_2oz": 29},
}

# Volume levels for bottle scanning (10ths)
VOLUME_LEVELS = {
    "full": 1.0, "9/10": 0.9, "8/10": 0.8, "7/10": 0.7,
    "6/10": 0.6, "half": 0.5, "4/10": 0.4, "3/10": 0.3,
    "2/10": 0.2, "1/10": 0.1, "empty": 0.0,
}


@router.post("/bottle-scan")
async def scan_bottle(body: dict = {}):
    """Record a bottle scan — photo-based volume detection for inventory audit.

    In production: camera snap → AI volume detection.
    Current: manual volume level entry with photo URL.
    """
    item_id = body.get("item_id")
    item_name = body.get("item_name", "")
    volume_level = body.get("volume_level", "half")  # full, 9/10, 8/10... empty
    bottle_size = body.get("bottle_size", "750ml")
    location = body.get("location", "main_bar")  # main_bar, service_bar, banquet_bar, storage
    photo_url = body.get("photo_url", "")
    scanned_by = body.get("scanned_by", "")
    audit_id = body.get("audit_id", "")

    vol_pct = VOLUME_LEVELS.get(volume_level, 0.5)
    bottle_spec = STANDARD_BOTTLES.get(bottle_size, STANDARD_BOTTLES["750ml"])
    remaining_oz = round(bottle_spec["oz"] * vol_pct, 1)
    remaining_pours = int(remaining_oz / 1.5)
    value_remaining = round(remaining_oz / bottle_spec["oz"] * body.get("bottle_cost", 25.00), 2)

    scan = {
        "id": f"scan-{_uid()}",
        "item_id": item_id,
        "item_name": item_name,
        "volume_level": volume_level,
        "volume_pct": vol_pct,
        "bottle_size": bottle_size,
        "remaining_oz": remaining_oz,
        "remaining_pours": remaining_pours,
        "value_remaining": value_remaining,
        "location": location,
        "photo_url": photo_url,
        "scanned_by": scanned_by,
        "audit_id": audit_id,
        "scanned_at": _now(),
    }
    db["bottle_scans"].insert_one({**scan, "_id": scan["id"]})
    return scan


@router.get("/bottle-scans")
async def list_bottle_scans(audit_id: Optional[str] = None, location: Optional[str] = None, limit: int = 100):
    """List bottle scans, optionally filtered by audit or location."""
    query = {}
    if audit_id:
        query["audit_id"] = audit_id
    if location:
        query["location"] = location
    scans = list(db["bottle_scans"].find(query, {"_id": 0}).sort("scanned_at", -1).limit(limit))
    total_value = sum(s.get("value_remaining", 0) for s in scans)
    return {"scans": scans, "total_scans": len(scans), "total_value_remaining": round(total_value, 2)}


# ══════════════════════════════════════
#  MONTHLY INVENTORY AUDIT
# ══════════════════════════════════════

@router.post("/audit/start")
async def start_monthly_audit(body: dict = {}):
    """Start a new monthly beverage inventory audit."""
    month = body.get("month", datetime.now(timezone.utc).month)
    year = body.get("year", datetime.now(timezone.utc).year)
    audit_type = body.get("type", "monthly")  # monthly, weekly, spot_check
    locations = body.get("locations", ["main_bar", "service_bar", "banquet_bar", "pool_bar", "storage"])

    audit = {
        "id": f"audit-{_uid()}",
        "month": month, "year": year,
        "type": audit_type,
        "locations": locations,
        "status": "in_progress",
        "started_by": body.get("started_by", ""),
        "started_at": _now(),
        "completed_at": None,
        "scan_count": 0,
        "total_bottles": 0,
        "total_value": 0,
        "variance_from_pos": 0,
    }
    db["beverage_audits"].insert_one({**audit, "_id": audit["id"]})
    return audit


@router.post("/audit/{audit_id}/complete")
async def complete_audit(audit_id: str):
    """Complete an audit — calculate totals and variance."""
    audit = db["beverage_audits"].find_one({"id": audit_id}, {"_id": 0})
    if not audit:
        raise HTTPException(404, "Audit not found")

    scans = list(db["bottle_scans"].find({"audit_id": audit_id}, {"_id": 0}))
    total_value = sum(s.get("value_remaining", 0) for s in scans)
    total_bottles = len(scans)

    # Calculate variance against POS sales
    # In production: pull POS data for the period
    estimated_pos_usage = round(total_value * 0.15, 2)  # ~15% usage rate per month
    variance = round(total_value - (total_value + estimated_pos_usage), 2)
    variance_pct = round(abs(variance) / max(total_value + estimated_pos_usage, 1) * 100, 1)

    update = {
        "status": "completed",
        "completed_at": _now(),
        "scan_count": len(scans),
        "total_bottles": total_bottles,
        "total_value": round(total_value, 2),
        "variance_from_pos": variance,
        "variance_pct": variance_pct,
        "summary_by_location": {},
    }

    # Summarize by location
    locations = set(s.get("location", "") for s in scans)
    for loc in locations:
        loc_scans = [s for s in scans if s.get("location") == loc]
        update["summary_by_location"][loc] = {
            "bottles": len(loc_scans),
            "value": round(sum(s.get("value_remaining", 0) for s in loc_scans), 2),
        }

    db["beverage_audits"].update_one({"id": audit_id}, {"$set": update})
    return {**audit, **update}


@router.get("/audits")
async def list_audits(limit: int = 12):
    """List all audits."""
    audits = list(db["beverage_audits"].find({}, {"_id": 0}).sort("started_at", -1).limit(limit))
    return {"audits": audits}


# ══════════════════════════════════════
#  CONSUMPTION BAR TRACKING (Events)
# ══════════════════════════════════════

@router.post("/consumption/event-snap")
async def event_consumption_snap(body: dict = {}):
    """Record before/after consumption bar snapshot for a BEO event.

    Snap before event starts, snap after event ends.
    Difference = actual consumption → compare to BEO pricing.
    """
    beo_number = body.get("beo_number")
    snap_type = body.get("snap_type", "before")  # before, after
    bottles = body.get("bottles", [])  # [{name, volume_level, bottle_size, unit_cost}]

    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0}) if beo_number else None
    event_name = beo.get("event_name", "") if beo else ""

    processed = []
    total_value = 0
    total_oz = 0

    for b in bottles:
        vol_pct = VOLUME_LEVELS.get(b.get("volume_level", "full"), 1.0)
        spec = STANDARD_BOTTLES.get(b.get("bottle_size", "750ml"), STANDARD_BOTTLES["750ml"])
        remaining_oz = round(spec["oz"] * vol_pct, 1)
        value = round(vol_pct * b.get("unit_cost", 25.00), 2)
        processed.append({
            "name": b.get("name", ""),
            "category": b.get("category", "spirits"),
            "volume_level": b.get("volume_level", "full"),
            "volume_pct": vol_pct,
            "remaining_oz": remaining_oz,
            "value": value,
            "bottle_size": b.get("bottle_size", "750ml"),
            "unit_cost": b.get("unit_cost", 25.00),
        })
        total_value += value
        total_oz += remaining_oz

    snap = {
        "id": f"snap-{_uid()}",
        "beo_number": beo_number,
        "event_name": event_name,
        "snap_type": snap_type,
        "bottles": processed,
        "total_bottles": len(processed),
        "total_value": round(total_value, 2),
        "total_oz": round(total_oz, 1),
        "snapped_by": body.get("snapped_by", ""),
        "snapped_at": _now(),
    }
    db["consumption_snaps"].insert_one({**snap, "_id": snap["id"]})
    return snap


@router.get("/consumption/event-usage")
async def calculate_event_usage(beo_number: int = Query(...)):
    """Calculate actual consumption for an event by comparing before/after snaps."""
    snaps = list(db["consumption_snaps"].find({"beo_number": beo_number}, {"_id": 0}).sort("snapped_at", 1))
    before = next((s for s in snaps if s["snap_type"] == "before"), None)
    after = next((s for s in snaps if s["snap_type"] == "after"), None)

    if not before or not after:
        return {
            "beo_number": beo_number,
            "status": "incomplete",
            "message": f"Need both before and after snaps. Have: {'before' if before else ''} {'after' if after else ''}",
            "snaps_available": [s["snap_type"] for s in snaps],
        }

    # Calculate usage per bottle
    usage_items = []
    total_usage_value = 0
    total_usage_oz = 0

    for b_before in before["bottles"]:
        name = b_before["name"]
        b_after = next((a for a in after["bottles"] if a["name"] == name), None)
        if not b_after:
            # Bottle fully consumed
            usage_oz = b_before["remaining_oz"]
            usage_value = b_before["value"]
        else:
            usage_oz = round(b_before["remaining_oz"] - b_after["remaining_oz"], 1)
            usage_value = round(b_before["value"] - b_after["value"], 2)

        if usage_oz > 0:
            pours = int(usage_oz / 1.5)
            usage_items.append({
                "name": name,
                "category": b_before.get("category", "spirits"),
                "before_level": b_before["volume_level"],
                "after_level": b_after["volume_level"] if b_after else "empty",
                "usage_oz": usage_oz,
                "usage_pours": pours,
                "usage_cost": usage_value,
            })
            total_usage_value += usage_value
            total_usage_oz += usage_oz

    # Get BEO beverage pricing for comparison
    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0})
    bev_menu = beo.get("beverage_menu", {}) if beo else {}
    covers = beo.get("guaranteed_count", 0) if beo else 0

    # Estimate expected beverage revenue based on consumption
    avg_drinks_per_guest = 3.5  # Industry standard for 4-hour event
    total_pours = int(total_usage_oz / 1.5)
    estimated_revenue = 0
    for item in usage_items:
        if item["category"] == "spirits":
            estimated_revenue += item["usage_pours"] * 24.00
        elif item["category"] == "wine":
            estimated_revenue += item["usage_pours"] * 18.00
        elif item["category"] == "beer":
            estimated_revenue += item["usage_pours"] * 12.00
        else:
            estimated_revenue += item["usage_pours"] * 10.00

    cost_pct = round(total_usage_value / max(estimated_revenue, 1) * 100, 1)
    drinks_per_guest = round(total_pours / max(covers, 1), 1)

    return {
        "beo_number": beo_number,
        "event_name": beo.get("event_name", "") if beo else "",
        "covers": covers,
        "status": "complete",
        "usage": usage_items,
        "totals": {
            "total_usage_oz": round(total_usage_oz, 1),
            "total_pours": total_pours,
            "total_cost": round(total_usage_value, 2),
            "estimated_revenue": round(estimated_revenue, 2),
            "cost_pct": cost_pct,
            "drinks_per_guest": drinks_per_guest,
            "avg_industry_drinks_per_guest": avg_drinks_per_guest,
        },
        "pricing_accuracy": {
            "menu_prices_align": cost_pct < 25,
            "note": f"Beverage cost at {cost_pct}% — {'within target (18-22%)' if cost_pct < 25 else 'ABOVE TARGET — review pricing'}",
            "recommendation": "Prices align with menu" if cost_pct < 25 else f"Consider increasing consumption bar pricing by ${round((cost_pct - 22) * 0.5, 2)}/drink to reach 22% target",
        },
    }


# ══════════════════════════════════════
#  TOAST & ARRIVAL BEVERAGES
# ══════════════════════════════════════

@router.post("/toast-arrival/log")
async def log_toast_arrival(body: dict = {}):
    """Log toast or arrival beverage service for a BEO.

    Non-alcoholic beverages → food cost line.
    Alcoholic beverages → beverage cost line.
    """
    beo_number = body.get("beo_number")
    service_type = body.get("type", "arrival")  # arrival, toast, welcome_drink, farewell
    items = body.get("items", [])

    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0}) if beo_number else None
    covers = beo.get("guaranteed_count", 0) if beo else body.get("covers", 100)

    processed = []
    food_cost_total = 0
    bev_cost_total = 0
    revenue_total = 0

    for item in items:
        name = item.get("name", "")
        is_alcoholic = item.get("is_alcoholic", True)
        cost_per_unit = item.get("cost_per_unit", 3.00)
        price_per_unit = item.get("price_per_unit", 18.00)
        quantity = item.get("quantity", covers)

        total_cost = round(cost_per_unit * quantity, 2)
        total_revenue = round(price_per_unit * quantity, 2)

        if is_alcoholic:
            bev_cost_total += total_cost
            gl_account = "4200 - Beverage Cost"
        else:
            food_cost_total += total_cost
            gl_account = "4100 - Food Cost"

        revenue_total += total_revenue

        processed.append({
            "name": name,
            "is_alcoholic": is_alcoholic,
            "cost_per_unit": cost_per_unit,
            "price_per_unit": price_per_unit,
            "quantity": quantity,
            "total_cost": total_cost,
            "total_revenue": total_revenue,
            "gl_account": gl_account,
            "cost_category": "beverage" if is_alcoholic else "food",
        })

    record = {
        "id": f"toast-{_uid()}",
        "beo_number": beo_number,
        "event_name": beo.get("event_name", "") if beo else "",
        "service_type": service_type,
        "covers": covers,
        "items": processed,
        "food_cost_total": round(food_cost_total, 2),
        "beverage_cost_total": round(bev_cost_total, 2),
        "total_cost": round(food_cost_total + bev_cost_total, 2),
        "total_revenue": round(revenue_total, 2),
        "gl_summary": {
            "4100_food_cost": round(food_cost_total, 2),
            "4200_beverage_cost": round(bev_cost_total, 2),
            "note": f"Non-alcoholic items (${food_cost_total:,.2f}) post to Food Cost 4100. Alcoholic items (${bev_cost_total:,.2f}) post to Beverage Cost 4200.",
        },
        "created_at": _now(),
    }
    db["toast_arrival_logs"].insert_one({**record, "_id": record["id"]})
    return record


@router.get("/toast-arrival/history")
async def toast_arrival_history(beo_number: Optional[int] = None, limit: int = 50):
    """List toast/arrival beverage logs."""
    query = {"beo_number": beo_number} if beo_number else {}
    logs = list(db["toast_arrival_logs"].find(query, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"logs": logs, "total": len(logs)}


# ══════════════════════════════════════
#  PRICING ACCURACY TRACKER
# ══════════════════════════════════════

@router.get("/pricing-accuracy")
async def pricing_accuracy_report(months: int = Query(6)):
    """Track beverage pricing accuracy against actual consumption costs over time.

    Compares BEO menu prices to actual pour costs to ensure profitability.
    """
    # Get all consumption events
    usages = list(db["consumption_snaps"].find({"snap_type": "after"}, {"_id": 0}).sort("snapped_at", -1).limit(100))
    toast_logs = list(db["toast_arrival_logs"].find({}, {"_id": 0}).sort("created_at", -1).limit(100))

    # Aggregate by month
    monthly = {}
    for log in toast_logs:
        month_key = log.get("created_at", "")[:7]
        if month_key not in monthly:
            monthly[month_key] = {"revenue": 0, "food_cost": 0, "bev_cost": 0, "events": 0}
        monthly[month_key]["revenue"] += log.get("total_revenue", 0)
        monthly[month_key]["food_cost"] += log.get("food_cost_total", 0)
        monthly[month_key]["bev_cost"] += log.get("beverage_cost_total", 0)
        monthly[month_key]["events"] += 1

    periods = []
    for key in sorted(monthly.keys()):
        m = monthly[key]
        total_cost = m["food_cost"] + m["bev_cost"]
        cost_pct = round(total_cost / max(m["revenue"], 1) * 100, 1)
        periods.append({
            "period": key,
            "revenue": round(m["revenue"], 2),
            "food_cost": round(m["food_cost"], 2),
            "beverage_cost": round(m["bev_cost"], 2),
            "total_cost": round(total_cost, 2),
            "cost_pct": cost_pct,
            "events": m["events"],
            "pricing_status": "on_target" if cost_pct < 25 else "review_needed",
        })

    # BEO menu price analysis
    beo_prices = []
    for beo in db["beo_documents"].find({"beverage_menu.spirits": {"$exists": True}}, {"_id": 0, "beo_number": 1, "beverage_menu": 1, "event_date": 1}).limit(20):
        bev = beo.get("beverage_menu", {})
        spirits = bev.get("spirits", [])
        if spirits:
            avg_spirit_price = round(sum(s.get("price", 0) for s in spirits) / max(len(spirits), 1), 2)
            beo_prices.append({
                "beo_number": beo["beo_number"],
                "event_date": beo.get("event_date", ""),
                "avg_spirit_price": avg_spirit_price,
                "spirit_count": len(spirits),
            })

    avg_menu_price = round(sum(b["avg_spirit_price"] for b in beo_prices) / max(len(beo_prices), 1), 2) if beo_prices else 0
    target_cost = round(avg_menu_price * 0.20, 2)  # 20% beverage cost target

    return {
        "periods": periods,
        "beo_menu_analysis": beo_prices,
        "benchmarks": {
            "avg_menu_spirit_price": avg_menu_price,
            "target_pour_cost": target_cost,
            "target_cost_pct": 20,
            "industry_avg_cost_pct": 22,
        },
        "recommendation": f"Menu spirit avg ${avg_menu_price}. Target pour cost ${target_cost} (20%). {'Prices well-positioned.' if avg_menu_price > 20 else 'Consider menu price increase.'}",
    }


# ══════════════════════════════════════
#  FOH TRAINING (Mixology/Sommelier)
# ══════════════════════════════════════

FOH_TRAINING_SYSTEM = """You are an expert Front-of-House trainer specializing in mixology, wine service, and sommelier skills.
You train bartenders, servers, and banquet staff on:
1. COCKTAIL KNOWLEDGE: Classic recipes, modern techniques, garnishing, presentation
2. WINE SERVICE: Opening, decanting, proper pour, wine-food pairing, temperature service
3. SPIRITS KNOWLEDGE: Bourbon vs Scotch vs Rye, tequila types, gin botanicals, rum origins
4. CONSUMPTION BAR MANAGEMENT: Par levels, bottle rotation, inventory counting, waste tracking
5. GUEST INTERACTION: Upselling premium, handling complaints, allergy awareness for beverages
6. POS ACCURACY: Ring every drink, consumption tracking, comp logging
7. BAR SETUP: Speed well organization, garnish prep, ice management, back bar display
8. BANQUET BAR: Before/after event inventory counts, bottle scan procedure, consumption reporting
You speak with authority but are approachable. Use real product names and techniques."""


@router.post("/foh-training/session")
async def create_foh_training_session(body: dict = {}):
    """Create a FOH training session for mixology/sommelier education."""
    session_id = f"foh-{_uid()}"
    topic = body.get("topic", "general")  # general, wine, cocktails, consumption_bar, banquet_bar
    trainee_name = body.get("trainee_name", "Trainee")

    topic_prompts = {
        "general": "Let's start with the basics of bar service. What area would you like to focus on?",
        "wine": "Wine service is an art. Let's talk about proper opening technique, decanting, and the wines on our current banquet menu. Which wine region interests you most?",
        "cocktails": "Let's build your cocktail repertoire. Do you know the 6 base spirits and a classic cocktail for each?",
        "consumption_bar": "Consumption bars are critical for banquet revenue. Let's walk through the before/after bottle count process and how to ensure accurate billing.",
        "banquet_bar": "Banquet bar service is different from restaurant bar. Let's cover setup, consumption tracking, and the bottle scan procedure for inventory accuracy.",
    }

    opening = topic_prompts.get(topic, topic_prompts["general"])

    session = {
        "session_id": session_id,
        "type": "foh_training",
        "topic": topic,
        "trainee_name": trainee_name,
        "status": "active",
        "message_count": 1,
        "created_at": _now(),
    }
    db["foh_training_sessions"].insert_one({**session, "_id": session_id})
    db["foh_training_messages"].insert_one({
        "_id": f"msg-{_uid()}", "session_id": session_id,
        "role": "assistant", "content": opening, "created_at": _now(),
    })

    return {"session_id": session_id, "opening_message": opening, "topic": topic}


@router.post("/foh-training/{session_id}/message")
async def foh_training_message(session_id: str, body: dict = {}):
    """Send message in FOH training session."""
    message = body.get("message", "")
    session = db["foh_training_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")

    db["foh_training_messages"].insert_one({
        "_id": f"msg-{_uid()}", "session_id": session_id,
        "role": "user", "content": message, "created_at": _now(),
    })

    # Get history
    history = list(db["foh_training_messages"].find(
        {"session_id": session_id}, {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", 1).limit(30))

    # Use LLM for response
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        from dotenv import load_dotenv
        import os
        load_dotenv()

        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
            session_id=session_id,
            system_message=FOH_TRAINING_SYSTEM,
        ).with_model("openai", "gpt-4.1")

        if len(history) > 2:
            for msg in history[:-1]:
                if msg["role"] == "user":
                    await chat.send_message(UserMessage(text=msg["content"]))

        response = await chat.send_message(UserMessage(text=message))
    except Exception as e:
        response = f"Let me help with that. In our bar program, we focus on accuracy and consistency. Could you tell me more about what specific area you'd like to learn about? (System note: {str(e)[:50]})"

    db["foh_training_messages"].insert_one({
        "_id": f"msg-{_uid()}", "session_id": session_id,
        "role": "assistant", "content": response, "created_at": _now(),
    })

    count = session.get("message_count", 0) + 2
    db["foh_training_sessions"].update_one({"session_id": session_id}, {"$set": {"message_count": count}})

    return {"response": response, "message_count": count}


@router.get("/foh-training/{session_id}/history")
async def foh_training_history(session_id: str):
    """Get FOH training session history."""
    session = db["foh_training_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")
    messages = list(db["foh_training_messages"].find(
        {"session_id": session_id}, {"_id": 0, "role": 1, "content": 1, "created_at": 1}
    ).sort("created_at", 1))
    return {"session": session, "messages": messages}


@router.get("/foh-training/sessions")
async def list_foh_sessions():
    """List all FOH training sessions."""
    sessions = list(db["foh_training_sessions"].find({}, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"sessions": sessions}



# ══════════════════════════════════════
#  WINE CELLAR AGING TRACKER
# ══════════════════════════════════════

WINE_REGIONS = {
    "Bordeaux": {"country": "France", "optimal_aging_years": (5, 20), "peak_window_years": 3},
    "Burgundy": {"country": "France", "optimal_aging_years": (4, 15), "peak_window_years": 2},
    "Champagne": {"country": "France", "optimal_aging_years": (1, 8), "peak_window_years": 2},
    "Napa Valley": {"country": "USA", "optimal_aging_years": (3, 15), "peak_window_years": 3},
    "Tuscany": {"country": "Italy", "optimal_aging_years": (3, 12), "peak_window_years": 3},
    "Rioja": {"country": "Spain", "optimal_aging_years": (2, 10), "peak_window_years": 2},
    "Barossa Valley": {"country": "Australia", "optimal_aging_years": (2, 8), "peak_window_years": 2},
    "Veneto": {"country": "Italy", "optimal_aging_years": (0, 3), "peak_window_years": 1},
    "Cotes de Provence": {"country": "France", "optimal_aging_years": (0, 2), "peak_window_years": 1},
    "Monterey": {"country": "USA", "optimal_aging_years": (1, 5), "peak_window_years": 2},
}


@router.post("/wine-cellar/add")
async def add_wine_to_cellar(body: dict = {}):
    """Add wine to the cellar tracker with aging and drinking window."""
    name = body.get("name", "")
    vintage = body.get("vintage", 2022)
    region = body.get("region", "Napa Valley")
    varietal = body.get("varietal", "Cabernet Sauvignon")
    quantity = body.get("quantity", 6)
    cost_per_bottle = body.get("cost_per_bottle", 45.00)
    bin_location = body.get("bin_location", "")
    serving_temp_f = body.get("serving_temp_f", 64)

    region_info = WINE_REGIONS.get(region, {"optimal_aging_years": (2, 8), "peak_window_years": 2})
    current_year = datetime.now(timezone.utc).year
    age = current_year - vintage

    min_age, max_age = region_info["optimal_aging_years"]
    peak_start = vintage + min_age
    peak_end = vintage + max_age
    peak_window = region_info["peak_window_years"]

    if age < min_age:
        status = "aging"
        drink_recommendation = f"Hold until {peak_start}. Currently {min_age - age} years from optimal window."
    elif age <= max_age:
        status = "peak"
        drink_recommendation = f"In peak drinking window ({peak_start}-{peak_end}). Ideal to serve now."
    else:
        status = "past_peak"
        drink_recommendation = f"Past optimal window by {age - max_age} years. Serve soon or use for cooking."

    wine = {
        "id": f"wine-{_uid()}",
        "name": name, "vintage": vintage, "region": region, "varietal": varietal,
        "quantity": quantity, "cost_per_bottle": cost_per_bottle,
        "total_value": round(cost_per_bottle * quantity, 2),
        "bin_location": bin_location,
        "serving_temp_f": serving_temp_f,
        "age_years": age,
        "peak_start": peak_start, "peak_end": peak_end,
        "status": status,
        "drink_recommendation": drink_recommendation,
        "added_at": _now(),
    }
    db["wine_cellar"].insert_one({**wine, "_id": wine["id"]})
    return wine


@router.get("/wine-cellar")
async def list_wine_cellar(status: Optional[str] = None):
    """List wines in cellar with aging status."""
    query = {"status": status} if status else {}
    wines = list(db["wine_cellar"].find(query, {"_id": 0}).sort("vintage", 1))
    total_value = sum(w.get("total_value", 0) for w in wines)
    total_bottles = sum(w.get("quantity", 0) for w in wines)

    status_counts = {"aging": 0, "peak": 0, "past_peak": 0}
    for w in wines:
        s = w.get("status", "aging")
        if s in status_counts:
            status_counts[s] += 1

    return {
        "wines": wines,
        "total_bottles": total_bottles,
        "total_value": round(total_value, 2),
        "status_counts": status_counts,
        "action_needed": [w for w in wines if w.get("status") in ["peak", "past_peak"]],
    }


@router.get("/wine-cellar/pairing-suggestions")
async def wine_pairing_suggestions(dish: str = Query("grilled steak")):
    """Wine pairing suggestions for a dish."""
    pairings = {
        "steak": [
            {"wine": "Cabernet Sauvignon", "region": "Napa Valley", "why": "Full body matches rich protein. Tannins cut through fat."},
            {"wine": "Malbec", "region": "Mendoza", "why": "Juicy dark fruit with soft tannins complement char flavors."},
        ],
        "fish": [
            {"wine": "Sauvignon Blanc", "region": "Marlborough", "why": "Crisp acidity pairs with delicate fish. Citrus notes complement seafood."},
            {"wine": "Pinot Grigio", "region": "Friuli", "why": "Light, clean profile won't overpower the fish."},
        ],
        "chicken": [
            {"wine": "Chardonnay", "region": "Burgundy", "why": "Medium body matches chicken. Oak notes pair with roasted skin."},
            {"wine": "Pinot Noir", "region": "Oregon", "why": "Light red with earthy notes works with poultry."},
        ],
        "pasta": [
            {"wine": "Chianti", "region": "Tuscany", "why": "Acidity cuts through tomato sauce. Italian pairing tradition."},
            {"wine": "Barbera", "region": "Piedmont", "why": "Low tannin, high acid — made for Italian comfort food."},
        ],
        "dessert": [
            {"wine": "Sauternes", "region": "Bordeaux", "why": "Noble rot sweetness pairs with rich desserts."},
            {"wine": "Moscato d'Asti", "region": "Piedmont", "why": "Light effervescence and sweetness complement fruit desserts."},
        ],
        "bbq": [
            {"wine": "Zinfandel", "region": "Sonoma", "why": "Bold, jammy fruit stands up to smoky BBQ flavors."},
            {"wine": "Shiraz", "region": "Barossa Valley", "why": "Pepper and spice notes complement smoked meats."},
        ],
    }
    # Find matching pairings
    dish_lower = dish.lower()
    matched = []
    for key, suggestions in pairings.items():
        if key in dish_lower or dish_lower in key:
            matched.extend(suggestions)
    if not matched:
        matched = pairings.get("steak", [])  # Default
    return {"dish": dish, "pairings": matched}


# ══════════════════════════════════════
#  COCKTAIL RECIPE COSTING (Linked to Inventory)
# ══════════════════════════════════════

CLASSIC_COCKTAILS = [
    {"name": "Old Fashioned", "category": "whiskey", "ingredients": [
        {"item": "Bourbon", "oz": 2.0, "cost_per_oz": 1.10},
        {"item": "Simple Syrup", "oz": 0.25, "cost_per_oz": 0.10},
        {"item": "Angostura Bitters", "dashes": 3, "cost_per_dash": 0.05},
        {"item": "Orange Peel", "each": 1, "cost_each": 0.15},
    ], "menu_price": 24.00, "glassware": "Rocks glass"},
    {"name": "Margarita", "category": "tequila", "ingredients": [
        {"item": "Tequila Blanco", "oz": 2.0, "cost_per_oz": 0.95},
        {"item": "Lime Juice", "oz": 1.0, "cost_per_oz": 0.20},
        {"item": "Triple Sec", "oz": 0.75, "cost_per_oz": 0.50},
        {"item": "Simple Syrup", "oz": 0.5, "cost_per_oz": 0.10},
    ], "menu_price": 24.00, "glassware": "Coupe"},
    {"name": "Espresso Martini", "category": "vodka", "ingredients": [
        {"item": "Vodka", "oz": 1.5, "cost_per_oz": 0.85},
        {"item": "Coffee Liqueur", "oz": 1.0, "cost_per_oz": 0.65},
        {"item": "Espresso Shot", "oz": 1.0, "cost_per_oz": 0.30},
        {"item": "Simple Syrup", "oz": 0.5, "cost_per_oz": 0.10},
    ], "menu_price": 26.00, "glassware": "Coupe"},
    {"name": "Mojito", "category": "rum", "ingredients": [
        {"item": "White Rum", "oz": 2.0, "cost_per_oz": 0.75},
        {"item": "Lime Juice", "oz": 1.0, "cost_per_oz": 0.20},
        {"item": "Simple Syrup", "oz": 0.75, "cost_per_oz": 0.10},
        {"item": "Mint Leaves", "each": 8, "cost_each": 0.03},
        {"item": "Soda Water", "oz": 2.0, "cost_per_oz": 0.05},
    ], "menu_price": 24.00, "glassware": "Collins glass"},
    {"name": "Negroni", "category": "gin", "ingredients": [
        {"item": "Gin", "oz": 1.0, "cost_per_oz": 0.95},
        {"item": "Campari", "oz": 1.0, "cost_per_oz": 0.80},
        {"item": "Sweet Vermouth", "oz": 1.0, "cost_per_oz": 0.40},
        {"item": "Orange Peel", "each": 1, "cost_each": 0.15},
    ], "menu_price": 24.00, "glassware": "Rocks glass"},
    {"name": "Pier Two Signature", "category": "specialty", "ingredients": [
        {"item": "Vodka", "oz": 1.5, "cost_per_oz": 0.85},
        {"item": "Passion Fruit Puree", "oz": 1.0, "cost_per_oz": 0.60},
        {"item": "Lime Juice", "oz": 0.75, "cost_per_oz": 0.20},
        {"item": "Vanilla Syrup", "oz": 0.5, "cost_per_oz": 0.15},
        {"item": "Prosecco Float", "oz": 1.0, "cost_per_oz": 0.60},
    ], "menu_price": 26.00, "glassware": "Coupe"},
]


@router.get("/cocktail-costing")
async def cocktail_cost_analysis():
    """Full cocktail recipe costing linked to current inventory levels."""
    results = []
    for cocktail in CLASSIC_COCKTAILS:
        total_cost = 0
        ingredient_costs = []
        for ing in cocktail["ingredients"]:
            if "oz" in ing:
                cost = round(ing["oz"] * ing.get("cost_per_oz", 0.50), 2)
            elif "dashes" in ing:
                cost = round(ing["dashes"] * ing.get("cost_per_dash", 0.05), 2)
            elif "each" in ing:
                cost = round(ing["each"] * ing.get("cost_each", 0.10), 2)
            else:
                cost = 0.10
            total_cost += cost
            ingredient_costs.append({**ing, "line_cost": cost})

        menu_price = cocktail["menu_price"]
        profit = round(menu_price - total_cost, 2)
        cost_pct = round(total_cost / max(menu_price, 1) * 100, 1)

        # Check inventory for primary spirit
        primary_spirit = cocktail["ingredients"][0]["item"]
        inv_item = db["beverage_inventory"].find_one(
            {"name": {"$regex": primary_spirit, "$options": "i"}},
            {"_id": 0, "total_qty": 1, "name": 1}
        )
        in_stock = inv_item.get("total_qty", 0) if inv_item else 0
        pours_available = int(in_stock * 25.4 / max(cocktail["ingredients"][0].get("oz", 2), 0.5)) if in_stock > 0 else 0

        results.append({
            "name": cocktail["name"],
            "category": cocktail["category"],
            "glassware": cocktail["glassware"],
            "ingredients": ingredient_costs,
            "total_cost": round(total_cost, 2),
            "menu_price": menu_price,
            "profit": profit,
            "cost_pct": cost_pct,
            "margin_pct": round(100 - cost_pct, 1),
            "primary_spirit": primary_spirit,
            "in_stock_bottles": in_stock,
            "pours_available": pours_available,
            "pricing_status": "profitable" if cost_pct < 25 else "review",
        })

    results.sort(key=lambda x: x["cost_pct"])
    avg_cost_pct = round(sum(r["cost_pct"] for r in results) / max(len(results), 1), 1)

    return {
        "cocktails": results,
        "summary": {
            "total_recipes": len(results),
            "avg_cost_pct": avg_cost_pct,
            "most_profitable": results[0]["name"] if results else "",
            "least_profitable": results[-1]["name"] if results else "",
            "target_cost_pct": 20,
        },
    }


# ══════════════════════════════════════
#  SEASONAL BEVERAGE PROGRAM
# ══════════════════════════════════════

SEASONAL_PROGRAMS = {
    "spring": {
        "name": "Spring Refresh", "months": [3, 4, 5],
        "themes": ["Garden Party", "Citrus Forward", "Floral Notes"],
        "featured_cocktails": [
            {"name": "Lavender Collins", "base": "Gin", "season_ingredient": "Lavender Syrup", "estimated_cost": 3.20, "suggested_price": 24.00},
            {"name": "Strawberry Basil Smash", "base": "Vodka", "season_ingredient": "Fresh Strawberries + Basil", "estimated_cost": 3.50, "suggested_price": 24.00},
            {"name": "Elderflower Spritz", "base": "Prosecco", "season_ingredient": "St-Germain", "estimated_cost": 4.10, "suggested_price": 26.00},
        ],
        "wine_focus": ["Rose from Provence", "Sauvignon Blanc", "Light Pinot Noir"],
    },
    "summer": {
        "name": "Summer Chill", "months": [6, 7, 8],
        "themes": ["Tropical Escape", "Pool Vibes", "Frozen Classics"],
        "featured_cocktails": [
            {"name": "Passion Fruit Hurricane", "base": "Rum", "season_ingredient": "Passion Fruit", "estimated_cost": 3.80, "suggested_price": 26.00},
            {"name": "Watermelon Margarita", "base": "Tequila", "season_ingredient": "Fresh Watermelon", "estimated_cost": 3.40, "suggested_price": 24.00},
            {"name": "Coconut Mojito", "base": "Rum", "season_ingredient": "Coconut Cream", "estimated_cost": 3.60, "suggested_price": 24.00},
        ],
        "wine_focus": ["Prosecco", "Albarino", "Vinho Verde"],
    },
    "fall": {
        "name": "Autumn Harvest", "months": [9, 10, 11],
        "themes": ["Harvest Table", "Spiced & Warm", "Apple Season"],
        "featured_cocktails": [
            {"name": "Apple Cider Old Fashioned", "base": "Bourbon", "season_ingredient": "Apple Cider + Cinnamon", "estimated_cost": 3.10, "suggested_price": 24.00},
            {"name": "Pumpkin Spice Espresso Martini", "base": "Vodka", "season_ingredient": "Pumpkin Puree + Spice", "estimated_cost": 3.90, "suggested_price": 26.00},
            {"name": "Cranberry Mule", "base": "Vodka", "season_ingredient": "Cranberry + Ginger Beer", "estimated_cost": 3.30, "suggested_price": 24.00},
        ],
        "wine_focus": ["Pinot Noir", "Malbec", "Chardonnay (Oaked)"],
    },
    "winter": {
        "name": "Winter Warmth", "months": [12, 1, 2],
        "themes": ["Holiday Spirit", "Après-Ski", "Cozy Nightcap"],
        "featured_cocktails": [
            {"name": "Hot Toddy", "base": "Bourbon", "season_ingredient": "Honey + Lemon + Clove", "estimated_cost": 2.80, "suggested_price": 22.00},
            {"name": "Gingerbread Martini", "base": "Vodka", "season_ingredient": "Gingerbread Syrup", "estimated_cost": 3.50, "suggested_price": 26.00},
            {"name": "Champagne Royale", "base": "Champagne", "season_ingredient": "Chambord + Gold Flake", "estimated_cost": 5.20, "suggested_price": 28.00},
        ],
        "wine_focus": ["Cabernet Sauvignon", "Barolo", "Port"],
    },
}


@router.get("/seasonal-program")
async def get_seasonal_program(season: Optional[str] = None):
    """Get seasonal beverage program with featured cocktails and wines."""
    if season and season in SEASONAL_PROGRAMS:
        program = SEASONAL_PROGRAMS[season]
        # Cost analysis
        for cocktail in program["featured_cocktails"]:
            cocktail["cost_pct"] = round(cocktail["estimated_cost"] / max(cocktail["suggested_price"], 1) * 100, 1)
            cocktail["profit"] = round(cocktail["suggested_price"] - cocktail["estimated_cost"], 2)
        return {"season": season, "program": program}

    # Determine current season
    month = datetime.now(timezone.utc).month
    for s_name, s_data in SEASONAL_PROGRAMS.items():
        if month in s_data["months"]:
            current = s_name
            break
    else:
        current = "spring"

    programs = {}
    for s_name, s_data in SEASONAL_PROGRAMS.items():
        for cocktail in s_data["featured_cocktails"]:
            cocktail["cost_pct"] = round(cocktail["estimated_cost"] / max(cocktail["suggested_price"], 1) * 100, 1)
            cocktail["profit"] = round(cocktail["suggested_price"] - cocktail["estimated_cost"], 2)
        programs[s_name] = s_data

    return {"current_season": current, "programs": programs}


@router.post("/seasonal-program/forecast")
async def forecast_seasonal_demand(body: dict = {}):
    """EchoStratus integration — forecast beverage demand for upcoming season."""
    season = body.get("season", "summer")
    covers_per_month = body.get("covers_per_month", 5000)
    program = SEASONAL_PROGRAMS.get(season, SEASONAL_PROGRAMS["summer"])
    months = len(program["months"])
    total_covers = covers_per_month * months

    # Estimate drink mix
    cocktail_pct = 0.45
    wine_pct = 0.30
    beer_pct = 0.15
    na_pct = 0.10

    total_drinks = round(total_covers * 2.8)  # 2.8 drinks avg per guest
    cocktail_drinks = int(total_drinks * cocktail_pct)
    wine_drinks = int(total_drinks * wine_pct)

    # Ordering needs
    cocktail_bottles = math.ceil(cocktail_drinks / 16)  # 16 pours per 750ml
    wine_bottles = math.ceil(wine_drinks / 5)  # 5 glasses per bottle

    forecast = {
        "season": season,
        "program_name": program["name"],
        "months": months,
        "covers_per_month": covers_per_month,
        "total_covers": total_covers,
        "drink_forecast": {
            "total_drinks": total_drinks,
            "cocktails": cocktail_drinks,
            "wine": wine_drinks,
            "beer": int(total_drinks * beer_pct),
            "non_alcoholic": int(total_drinks * na_pct),
        },
        "ordering_needs": {
            "spirit_bottles_needed": cocktail_bottles,
            "wine_bottles_needed": wine_bottles,
            "estimated_spirit_cost": round(cocktail_bottles * 28, 2),
            "estimated_wine_cost": round(wine_bottles * 18, 2),
            "total_estimated_cost": round(cocktail_bottles * 28 + wine_bottles * 18, 2),
        },
        "revenue_forecast": {
            "cocktail_revenue": round(cocktail_drinks * 24, 2),
            "wine_revenue": round(wine_drinks * 18, 2),
            "total_beverage_revenue": round(cocktail_drinks * 24 + wine_drinks * 18, 2),
        },
        "featured_cocktails": program["featured_cocktails"],
    }
    return forecast
