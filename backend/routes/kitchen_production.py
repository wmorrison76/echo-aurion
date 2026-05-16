"""
Kitchen Production Intelligence — Oven Space Logic & Firing Sequence Engine
============================================================================
Models real kitchen equipment, retherm timelines, oven capacity constraints,
hot box logic, and EchoStratus bottleneck detection with chef-think solutions.

Equipment modeled:
- Rational iCombi Pro (combi ovens) — 5 sheet pan capacity, retherm mode
- Winston CVAP — moisture-controlled holding
- Conventional ovens — standard retherm
- Jade Range, Star, Wolf — range-top/broiler
- Hot Boxes — 145°F max hold, sterno-heated
- CresCorr / Creacore — insulated cabinets, no sterno (airtight)
- Speed racks — 32 sheet pan capacity for staging
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from database import db
import math

router = APIRouter(prefix="/api/kitchen-production", tags=["kitchen-production"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

# ══════════════════════════════════════
#  EQUIPMENT DATABASE
# ══════════════════════════════════════

EQUIPMENT = {
    "rational_1": {"id": "rational_1", "name": "Rational iCombi Pro 20-2/1", "type": "combi_oven", "brand": "Rational",
        "sheet_pan_capacity": 5, "status": "operational", "modes": ["retherm", "convection", "steam", "combi"],
        "retherm_settings": {"low_slow": {"temp_f": 250, "time_min": 25, "best_for": ["proteins", "starches"]},
                             "medium": {"temp_f": 300, "time_min": 15, "best_for": ["casseroles", "mac_cheese"]},
                             "high_blast": {"temp_f": 400, "time_min": 6, "best_for": ["vegetables", "crisp_items"]},
                             "finishing": {"temp_f": 425, "time_min": 2, "best_for": ["proteins_final_sear"]}},
        "preplated_system": True, "thermal_wrap_compatible": True,
        "notes": "Entire meal can be plated cold, placed on special racks, thermal wrap around cart, slides into oven. Holds temp 30min after."},
    "rational_2": {"id": "rational_2", "name": "Rational iCombi Pro 20-2/1 #2", "type": "combi_oven", "brand": "Rational",
        "sheet_pan_capacity": 5, "status": "operational", "modes": ["retherm", "convection", "steam", "combi"],
        "retherm_settings": {"low_slow": {"temp_f": 250, "time_min": 25}, "medium": {"temp_f": 300, "time_min": 15},
                             "high_blast": {"temp_f": 400, "time_min": 6}, "finishing": {"temp_f": 425, "time_min": 2}},
        "preplated_system": True, "thermal_wrap_compatible": True},
    "rational_3": {"id": "rational_3", "name": "Rational iCombi Pro 20-2/1 #3", "type": "combi_oven", "brand": "Rational",
        "sheet_pan_capacity": 5, "status": "operational", "modes": ["retherm", "convection", "steam", "combi"],
        "retherm_settings": {"low_slow": {"temp_f": 250, "time_min": 25}, "medium": {"temp_f": 300, "time_min": 15},
                             "high_blast": {"temp_f": 400, "time_min": 6}, "finishing": {"temp_f": 425, "time_min": 2}},
        "preplated_system": True, "thermal_wrap_compatible": True},
    "rational_4": {"id": "rational_4", "name": "Rational iCombi Pro 20-2/1 #4", "type": "combi_oven", "brand": "Rational",
        "sheet_pan_capacity": 5, "status": "repair", "repair_eta": "2026-04-22",
        "notes": "Heating element replacement — ETA 2 days"},
    "winston_cvap_1": {"id": "winston_cvap_1", "name": "Winston CVAP Hold & Serve", "type": "holding_cabinet", "brand": "Winston",
        "sheet_pan_capacity": 12, "status": "operational",
        "max_temp_f": 200, "moisture_control": True, "modes": ["hold", "retherm_low"],
        "best_for": ["proteins_hold", "starches_hold", "sauces"], "hold_time_hours": 4,
        "notes": "Moisture-controlled vapor technology. Proteins won't dry out. Perfect for holding after retherm."},
    "hotbox_1": {"id": "hotbox_1", "name": "Hot Box #1 (Cambro)", "type": "hot_box", "brand": "Cambro",
        "sheet_pan_capacity": 16, "status": "operational", "max_temp_f": 145,
        "sterno_compatible": True, "notes": "Max 145°F. Use sterno for extra heat in plate-up area. Good for holding cooked food."},
    "hotbox_2": {"id": "hotbox_2", "name": "Hot Box #2 (Cambro)", "type": "hot_box", "brand": "Cambro",
        "sheet_pan_capacity": 16, "status": "operational", "max_temp_f": 145, "sterno_compatible": True},
    "crescor_1": {"id": "crescor_1", "name": "CresCorr Insulated Cabinet", "type": "insulated_cabinet", "brand": "CresCorr",
        "sheet_pan_capacity": 10, "status": "operational", "max_temp_f": 180,
        "sterno_compatible": False, "airtight": True,
        "notes": "Airtight — flame goes out. Cannot use sterno. Electric heating only. Holds less sheet pans."},
    "jade_range": {"id": "jade_range", "name": "Jade Range 6-Burner + Griddle", "type": "range", "brand": "Jade",
        "status": "operational", "burners": 6, "griddle": True, "broiler": True,
        "best_for": ["sauces_to_boil", "sauteed_items", "grilled_proteins"]},
    "speed_rack_1": {"id": "speed_rack_1", "name": "Speed Rack (Full Size)", "type": "speed_rack",
        "sheet_pan_capacity": 32, "status": "operational",
        "notes": "Staging area. 32 sheet pans. Used for prep staging before oven loading."},
    "speed_rack_2": {"id": "speed_rack_2", "name": "Speed Rack #2", "type": "speed_rack",
        "sheet_pan_capacity": 32, "status": "operational"},
}

# Food categories and their retherm requirements
FOOD_RETHERM = {
    "proteins": {"method": "low_slow", "temp_f": 250, "time_min": 25, "hold_ok": True,
        "notes": "Retherm slowly to prevent drying. Last 2 min bump to 425°F for finishing. Move to hot box/CVAP after.",
        "sheet_pans_per_100_covers": 2.5},
    "starches": {"method": "medium", "temp_f": 275, "time_min": 18, "hold_ok": True,
        "notes": "Mashed potatoes, rice, mac & cheese can be heated earlier and hold fine in CVAP/hot box.",
        "sheet_pans_per_100_covers": 2.0},
    "vegetables": {"method": "high_blast", "temp_f": 400, "time_min": 6, "hold_ok": False,
        "notes": "HIGH FAST FAN. Green vegetables turn army green if held too long. Fire LAST, serve immediately.",
        "sheet_pans_per_100_covers": 1.5},
    "sauces": {"method": "range_top", "temp_f": 200, "time_min": 10, "hold_ok": True,
        "notes": "Heat to near boiling on range. Need sauce guns on req sheet. Hold in bain-marie or CVAP.",
        "sheet_pans_per_100_covers": 0.5},
    "bread_rolls": {"method": "medium", "temp_f": 325, "time_min": 8, "hold_ok": True,
        "notes": "Quick retherm. Can hold wrapped in hot box.", "sheet_pans_per_100_covers": 1.0},
    "desserts": {"method": "none", "temp_f": 0, "time_min": 0, "hold_ok": True,
        "notes": "Cold service. Stage on speed rack in walk-in.", "sheet_pans_per_100_covers": 1.5},
    "cold_items": {"method": "none", "temp_f": 0, "time_min": 0, "hold_ok": True,
        "notes": "Salads, cold apps. Stage on speed rack.", "sheet_pans_per_100_covers": 2.0},
}


# ══════════════════════════════════════
#  EQUIPMENT STATUS
# ══════════════════════════════════════

@router.get("/equipment")
async def list_equipment():
    """Get all kitchen equipment with status."""
    operational = [e for e in EQUIPMENT.values() if e.get("status") == "operational"]
    repair = [e for e in EQUIPMENT.values() if e.get("status") == "repair"]
    ovens = [e for e in operational if e.get("type") == "combi_oven"]
    total_oven_pans = sum(e.get("sheet_pan_capacity", 0) for e in ovens)

    return {
        "equipment": list(EQUIPMENT.values()),
        "summary": {
            "total": len(EQUIPMENT),
            "operational": len(operational),
            "in_repair": len(repair),
            "working_ovens": len(ovens),
            "total_oven_sheet_pan_capacity": total_oven_pans,
            "total_holding_capacity": sum(e.get("sheet_pan_capacity", 0) for e in operational if e["type"] in ["hot_box", "holding_cabinet", "insulated_cabinet"]),
            "speed_rack_capacity": sum(e.get("sheet_pan_capacity", 0) for e in operational if e["type"] == "speed_rack"),
        },
        "bottleneck_warning": total_oven_pans < 20,
    }


@router.post("/equipment/{equip_id}/status")
async def update_equipment_status(equip_id: str, body: dict = {}):
    """Update equipment status (operational/repair)."""
    if equip_id not in EQUIPMENT:
        raise HTTPException(404, "Equipment not found")
    new_status = body.get("status", "operational")
    EQUIPMENT[equip_id]["status"] = new_status
    if new_status == "repair":
        EQUIPMENT[equip_id]["repair_eta"] = body.get("repair_eta", "TBD")
        EQUIPMENT[equip_id]["repair_notes"] = body.get("notes", "")
    return {"updated": equip_id, "status": new_status}


# ══════════════════════════════════════
#  FIRING SEQUENCE ENGINE
# ══════════════════════════════════════

@router.post("/firing-sequence")
async def generate_firing_sequence(body: dict = {}):
    """Generate oven firing sequence for one or more BEOs firing simultaneously.

    Input: {beo_numbers: [7186, 7169], fire_time: "17:30"}
    Output: Minute-by-minute oven allocation, hot box staging, bottleneck alerts, solutions.
    """
    beo_numbers = body.get("beo_numbers", [])
    fire_time_str = body.get("fire_time", "17:30")

    # Get BEOs
    beos = list(db["beo_documents"].find(
        {"beo_number": {"$in": beo_numbers}},
        {"_id": 0}
    ))
    if not beos:
        raise HTTPException(404, "No BEOs found")

    # Working ovens
    working_ovens = [e for e in EQUIPMENT.values() if e.get("type") == "combi_oven" and e.get("status") == "operational"]
    total_oven_slots = sum(o["sheet_pan_capacity"] for o in working_ovens)

    # Analyze each BEO's food requirements
    all_tasks = []
    total_pans_needed = 0

    for beo in beos:
        covers = beo.get("guaranteed_count", 0)
        menu = beo.get("menu", {})
        sections = menu.get("sections", [])
        beo_num = beo["beo_number"]

        # Categorize menu items
        for section in sections:
            name = section.get("name", "").lower()
            items = section.get("items", [])
            if not items:
                continue

            if any(k in name for k in ["hot", "grill", "smoker", "carving"]):
                cat = "proteins"
            elif any(k in name for k in ["potato", "rice", "mac", "bean", "starch"]):
                cat = "starches"
            elif any(k in name for k in ["vegetable", "corn skillet"]):
                cat = "vegetables"
            elif any(k in name for k in ["soup", "sauce"]):
                cat = "sauces"
            elif any(k in name for k in ["bread", "roll", "bakery", "biscuit"]):
                cat = "bread_rolls"
            elif any(k in name for k in ["dessert"]):
                cat = "desserts"
            elif any(k in name for k in ["cold", "salad"]):
                cat = "cold_items"
            elif any(k in name for k in ["beverage"]):
                continue  # Skip beverages
            else:
                cat = "proteins"  # Default hot items to proteins

            retherm = FOOD_RETHERM.get(cat, FOOD_RETHERM["proteins"])
            pans = math.ceil(covers / 100 * retherm["sheet_pans_per_100_covers"])
            total_pans_needed += pans

            all_tasks.append({
                "beo_number": beo_num,
                "event_name": beo.get("event_name", ""),
                "section": section["name"],
                "category": cat,
                "items": items,
                "covers": covers,
                "sheet_pans": pans,
                "retherm_method": retherm["method"],
                "temp_f": retherm["temp_f"],
                "time_min": retherm["time_min"],
                "hold_ok": retherm["hold_ok"],
                "notes": retherm["notes"],
                "priority": 1 if cat == "proteins" else (2 if cat == "vegetables" else 3),
            })

    # Sort: proteins first (longest retherm), vegetables last (must be fresh)
    all_tasks.sort(key=lambda t: (t["priority"], -t["time_min"]))

    # Detect bottleneck
    has_bottleneck = total_pans_needed > total_oven_slots
    oven_utilization_pct = round(total_pans_needed / max(total_oven_slots, 1) * 100, 1)

    # Generate firing timeline
    timeline = []
    oven_schedule = {o["id"]: [] for o in working_ovens}
    current_oven_load = {o["id"]: 0 for o in working_ovens}
    hotbox_items = []
    wave = 1

    # Wave 1: Proteins (low & slow) — start earliest
    protein_tasks = [t for t in all_tasks if t["category"] == "proteins"]
    starch_tasks = [t for t in all_tasks if t["category"] == "starches"]
    veg_tasks = [t for t in all_tasks if t["category"] == "vegetables"]
    other_tasks = [t for t in all_tasks if t["category"] not in ["proteins", "starches", "vegetables", "cold_items", "desserts"]]

    # Assign proteins to ovens
    protein_start = -max((t["time_min"] for t in protein_tasks), default=0) - 5  # Buffer
    for task in protein_tasks:
        # Find oven with most space
        best_oven = min(oven_schedule.keys(), key=lambda o: current_oven_load[o])
        current_oven_load[best_oven] += task["sheet_pans"]
        oven_schedule[best_oven].append({**task, "wave": 1, "start_offset_min": protein_start})
        timeline.append({
            "wave": 1, "offset_min": protein_start, "action": f"LOAD proteins",
            "detail": f"BEO #{task['beo_number']} — {task['section']}: {task['sheet_pans']} pans into {best_oven} @ {task['temp_f']}°F for {task['time_min']}min (retherm mode)",
            "oven": best_oven, "pans": task["sheet_pans"],
        })

    # Proteins finishing: bump temp last 2 min
    if protein_tasks:
        timeline.append({
            "wave": 1, "offset_min": -7, "action": "BUMP TEMP on proteins",
            "detail": "Turn up ovens to 425°F for last 2 minutes — finishing sear on proteins",
            "oven": "all_with_proteins", "pans": 0,
        })
        timeline.append({
            "wave": 1, "offset_min": -5, "action": "PULL proteins to HOT BOX / CVAP",
            "detail": "Move all proteins to hot box with sterno or Winston CVAP. They hold safely while ovens freed for vegetables.",
            "oven": "hotbox_1", "pans": sum(t["sheet_pans"] for t in protein_tasks),
        })

    # Wave 2: Starches (can overlap or go after proteins)
    starch_start = protein_start + 5 if protein_tasks else -25
    for task in starch_tasks:
        best_oven = min(oven_schedule.keys(), key=lambda o: current_oven_load[o])
        timeline.append({
            "wave": 2, "offset_min": starch_start, "action": f"LOAD starches",
            "detail": f"BEO #{task['beo_number']} — {task['section']}: {task['sheet_pans']} pans @ {task['temp_f']}°F for {task['time_min']}min. Starches hold well — can go early.",
            "oven": best_oven, "pans": task["sheet_pans"],
        })

    # Wave 3: Vegetables LAST (high blast, serve immediately)
    veg_start = -8  # 8 minutes before fire time
    for task in veg_tasks:
        best_oven = min(oven_schedule.keys(), key=lambda o: current_oven_load[o])
        timeline.append({
            "wave": 3, "offset_min": veg_start, "action": f"BLAST vegetables",
            "detail": f"BEO #{task['beo_number']} — {task['section']}: {task['sheet_pans']} pans @ {task['temp_f']}°F HIGH FAN for {task['time_min']}min. DO NOT HOLD — serve immediately.",
            "oven": best_oven, "pans": task["sheet_pans"],
        })

    # Sauces on range
    sauce_tasks = [t for t in all_tasks if t["category"] == "sauces"]
    for task in sauce_tasks:
        timeline.append({
            "wave": 2, "offset_min": -15, "action": "HEAT sauces on range",
            "detail": f"BEO #{task['beo_number']} — Sauces to near boiling on Jade range. Sauce guns on req sheet. Hold in bain-marie.",
            "oven": "jade_range", "pans": 0,
        })

    timeline.sort(key=lambda t: t["offset_min"])

    # EchoStratus bottleneck solutions
    solutions = []
    if has_bottleneck:
        solutions.append({
            "id": "preplated_rational",
            "title": "Rational Pre-Plated System",
            "description": "Use Rational's pre-plated retherm system. Plate meals cold onto special racks. Pull from coolers to room temp slowly, then into oven with thermal wrap. Wrap stays on cart — chef opens side, adds sauce, serves. Holds temp 30min.",
            "benefits": ["Solves oven space issue", "Reduces labor on event day", "Multiple events retherm simultaneously", "Guest satisfaction maintained", "30-min temp hold after retherm"],
            "tradeoffs": ["Adds preparation time for early plating", "Requires thermal wrap inventory", "Requires coordination with AM prep team"],
            "labor_savings_pct": 25,
            "oven_capacity_gained_pct": 60,
            "cost_impact": "Adds ~$2.50/cover in prep labor, saves ~$4/cover in event-day labor. Net savings $1.50/cover.",
            "recommended_for": [t["beo_number"] for t in protein_tasks[:2]],
        })
        solutions.append({
            "id": "staggered_firing",
            "title": "Staggered Firing Sequence",
            "description": "Fire events in waves. Proteins for Event A first → hot box. Clear ovens. Proteins for Event B → hot box. Then blast all vegetables last.",
            "benefits": ["Works with existing equipment", "No additional investment", "Chef-familiar workflow"],
            "tradeoffs": ["Requires precise timing", "Hot box capacity becomes critical", "First event proteins hold longer"],
            "labor_savings_pct": 0,
            "oven_capacity_gained_pct": 40,
        })
        solutions.append({
            "id": "winston_cvap_hold",
            "title": "Winston CVAP Extended Hold",
            "description": "Use Winston CVAP moisture-controlled holding for proteins after retherm. Proteins won't dry out for up to 4 hours. Frees ovens for vegetables and second event.",
            "benefits": ["Proteins stay moist", "4-hour safe hold", "Frees oven space"],
            "tradeoffs": ["Limited to 12 sheet pans", "Not suitable for crisp items"],
            "labor_savings_pct": 10,
            "oven_capacity_gained_pct": 30,
        })

    # Cart logic
    cart_assignments = []
    cart_num = 1
    for task in all_tasks:
        if task["category"] in ["cold_items", "desserts"]:
            continue
        cart_assignments.append({
            "cart_number": cart_num,
            "beo_number": task["beo_number"],
            "category": task["category"],
            "items": task["items"][:3],
            "sheet_pans": task["sheet_pans"],
            "placement": "top" if task["category"] == "vegetables" else ("middle" if task["category"] == "proteins" else "bottom"),
            "sanitation_note": "Raw proteins on bottom shelf only. Vegetables on top. Starches middle." if task["category"] == "proteins" else "",
            "temp_requirement": f"{task['temp_f']}°F" if task["temp_f"] > 0 else "Cold",
        })
        cart_num += 1

    return {
        "fire_time": fire_time_str,
        "beos_firing": [{"beo_number": b["beo_number"], "event_name": b.get("event_name", ""), "covers": b["guaranteed_count"]} for b in beos],
        "equipment_status": {
            "working_ovens": len(working_ovens),
            "total_oven_slots": total_oven_slots,
            "in_repair": [e["name"] for e in EQUIPMENT.values() if e.get("status") == "repair"],
        },
        "demand": {
            "total_sheet_pans_needed": total_pans_needed,
            "total_oven_capacity": total_oven_slots,
            "utilization_pct": oven_utilization_pct,
            "has_bottleneck": has_bottleneck,
            "overflow_pans": max(0, total_pans_needed - total_oven_slots),
        },
        "firing_timeline": timeline,
        "food_tasks": all_tasks,
        "cart_assignments": cart_assignments,
        "echostratus_solutions": solutions,
        "chef_notes": [
            "Proteins: Retherm low & slow (250°F, 25min). Last 2min bump to 425°F. Move to hot box/CVAP.",
            "Starches: Mash potatoes, rice can heat early and hold fine in CVAP.",
            "Vegetables: HIGH FAST FAN (400°F, 6min). Fire LAST. Green vegetables turn army green if held too long.",
            "Sauces: Near boiling on range. Sauce guns on banquet req sheet.",
            "Plates: Extra sterno in hot box for plate-up area since hot boxes max at 145°F.",
        ] + (["BOTTLENECK DETECTED: Not enough oven space for simultaneous events. See EchoStratus solutions."] if has_bottleneck else []),
    }


# ══════════════════════════════════════
#  TIP POOL MANAGEMENT
# ══════════════════════════════════════

@router.get("/tip-pool/departments")
async def tip_pool_departments():
    """Get department tip pool configurations."""
    pools = list(db["tip_pools"].find({}, {"_id": 0}))
    if not pools:
        # Seed default department pools
        defaults = [
            {"id": f"pool-{_uid()}", "department": "banquet_foh", "name": "Banquet FOH Tip Pool",
             "tipped_positions": [
                 {"role": "Banquet Server", "share_pct": 45, "hourly_min": 5.54},
                 {"role": "Banquet Captain", "share_pct": 25, "hourly_min": 8.00},
                 {"role": "Bartender", "share_pct": 20, "hourly_min": 5.54},
                 {"role": "Barback", "share_pct": 10, "hourly_min": 7.00},
             ],
             "source": "26% service charge on food/bev — 16% distributed to tipped staff",
             "distribution_method": "percentage", "active": True, "created_at": _now()},
            {"id": f"pool-{_uid()}", "department": "restaurant_foh", "name": "Restaurant FOH Tip Pool",
             "tipped_positions": [
                 {"role": "Server", "share_pct": 50, "hourly_min": 5.54},
                 {"role": "Busser", "share_pct": 15, "hourly_min": 7.00},
                 {"role": "Host", "share_pct": 10, "hourly_min": 8.00},
                 {"role": "Bartender", "share_pct": 25, "hourly_min": 5.54},
             ],
             "source": "Guest gratuities", "distribution_method": "percentage", "active": True, "created_at": _now()},
            {"id": f"pool-{_uid()}", "department": "ird", "name": "In-Room Dining Tip Pool",
             "tipped_positions": [
                 {"role": "IRD Server", "share_pct": 70, "hourly_min": 5.54},
                 {"role": "IRD Runner", "share_pct": 30, "hourly_min": 7.00},
             ],
             "source": "22% service charge", "distribution_method": "percentage", "active": True, "created_at": _now()},
            {"id": f"pool-{_uid()}", "department": "pool_bar", "name": "Pool Bar Tip Pool",
             "tipped_positions": [
                 {"role": "Pool Bartender", "share_pct": 60, "hourly_min": 5.54},
                 {"role": "Pool Server", "share_pct": 40, "hourly_min": 5.54},
             ],
             "source": "Guest gratuities", "distribution_method": "percentage", "active": True, "created_at": _now()},
        ]
        db["tip_pools"].insert_many(defaults)
        pools = defaults
    return {"pools": pools}


@router.post("/tip-pool/configure")
async def configure_tip_pool(body: dict = {}):
    """Create or update a department tip pool configuration."""
    pool_id = body.get("id", f"pool-{_uid()}")
    pool = {
        "id": pool_id,
        "department": body.get("department"),
        "name": body.get("name"),
        "tipped_positions": body.get("tipped_positions", []),
        "source": body.get("source", "Service charge"),
        "distribution_method": body.get("distribution_method", "percentage"),
        "active": body.get("active", True),
        "updated_at": _now(),
    }
    db["tip_pools"].update_one({"id": pool_id}, {"$set": pool}, upsert=True)
    return pool


@router.post("/tip-pool/calculate")
async def calculate_tip_distribution(body: dict = {}):
    """Calculate tip distribution for a specific BEO event.

    Tip pool stays based on ORIGINAL BEO pricing even if comp is applied.
    """
    beo_number = body.get("beo_number")
    department = body.get("department", "banquet_foh")
    comp_pct = body.get("comp_pct", 0)  # Compensation percentage (0-100)

    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    pool = db["tip_pools"].find_one({"department": department}, {"_id": 0})
    if not pool:
        raise HTTPException(404, f"No tip pool configured for {department}")

    # Original BEO revenue (tip pool always based on original, not comped amount)
    original_revenue = beo.get("financial", {}).get("food_revenue", 0) + beo.get("financial", {}).get("beverage_revenue", 0)
    service_charge_pct = 0.26
    tip_distribution_pct = 0.16  # 16% of service charge goes to tipped staff

    total_service_charge = round(original_revenue * service_charge_pct, 2)
    total_tip_pool = round(original_revenue * tip_distribution_pct, 2)

    # Comp impact on GL (loss shows in P&L, but tip pool stays)
    comp_amount = round(original_revenue * comp_pct / 100, 2)
    revenue_after_comp = round(original_revenue - comp_amount, 2)

    # Distribution per position
    distribution = []
    for pos in pool.get("tipped_positions", []):
        share = round(total_tip_pool * pos["share_pct"] / 100, 2)
        distribution.append({
            "role": pos["role"],
            "share_pct": pos["share_pct"],
            "amount": share,
            "hourly_min": pos.get("hourly_min", 0),
        })

    return {
        "beo_number": beo_number,
        "event_name": beo.get("event_name", ""),
        "department": department,
        "original_revenue": original_revenue,
        "comp_pct": comp_pct,
        "comp_amount": comp_amount,
        "revenue_after_comp": revenue_after_comp,
        "total_service_charge": total_service_charge,
        "total_tip_pool": total_tip_pool,
        "tip_pool_note": "Tip pool calculated on ORIGINAL BEO pricing regardless of comp applied",
        "distribution": distribution,
        "gl_impact": {
            "revenue_line": revenue_after_comp,
            "comp_loss": comp_amount,
            "service_charge_collected": round(revenue_after_comp * service_charge_pct, 2),
            "tip_pool_obligation": total_tip_pool,
            "note": f"GL shows {comp_pct}% comp loss of ${comp_amount:,.2f}. Tip pool remains ${total_tip_pool:,.2f} based on original BEO."
        },
    }


# ══════════════════════════════════════
#  GUEST SATISFACTION & RECOVERY
# ══════════════════════════════════════

@router.post("/guest-recovery/evaluate")
async def evaluate_guest_recovery(body: dict = {}):
    """EchoAi³ three-lobe evaluation of guest incident and recommended recovery.

    Three-lobe logic:
    1. LOGICAL: What makes operational sense
    2. GUEST SATISFACTION: What creates the best guest experience
    3. FINANCIAL: What's best for the business P&L
    """
    incident_type = body.get("incident_type", "service_failure")
    severity = body.get("severity", "medium")  # low/medium/high/critical
    beo_number = body.get("beo_number")
    description = body.get("description", "")
    guest_reaction = body.get("guest_reaction", "disappointed")  # disappointed/upset/irate/wont_return

    beo = None
    event_revenue = 0
    if beo_number:
        beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0})
        event_revenue = beo.get("financial", {}).get("total", 0) if beo else 0

    # Severity multiplier
    sev_mult = {"low": 0.05, "medium": 0.15, "high": 0.30, "critical": 0.50}
    base_comp = sev_mult.get(severity, 0.15)

    # Guest reaction modifier
    reaction_mult = {"disappointed": 1.0, "upset": 1.3, "irate": 1.6, "wont_return": 2.0}
    reaction_mod = reaction_mult.get(guest_reaction, 1.0)

    # Three-lobe analysis
    logical_comp_pct = round(base_comp * 100, 1)
    guest_comp_pct = round(base_comp * reaction_mod * 100, 1)
    financial_comp_pct = round(min(50, base_comp * 0.8 * 100), 1)  # Cap at 50%

    # EchoAi³ recommended — weighted balance
    recommended_pct = round((logical_comp_pct * 0.3 + guest_comp_pct * 0.5 + financial_comp_pct * 0.2), 1)
    recommended_pct = min(50, recommended_pct)  # Never exceed 50%

    comp_amount = round(event_revenue * recommended_pct / 100, 2)

    # Recovery actions by incident type
    recovery_actions = {
        "service_failure": ["Immediate manager apology", "Expedite corrected service", "Follow-up thank you note from GM", "Future event discount offer"],
        "food_quality": ["Replace affected dishes immediately", "Chef visits table with apology", "Comp affected course", "Send complimentary dessert"],
        "food_allergy": ["CRITICAL: Remove item immediately", "Manager and chef at table within 2 min", "Medical assistance standby", "Comp entire meal for affected guest", "Document incident for legal", "Follow-up call next day from GM"],
        "late_service": ["Acknowledge delay with personal apology", "Offer complimentary round of beverages", "Expedite remaining courses", "Adjust timeline for remaining events"],
        "wrong_order": ["Replace with correct order immediately", "Comp the incorrect course", "Manager follow-up at table"],
        "staff_behavior": ["Remove staff member from event", "Manager apology", "Reassign experienced server", "Follow-up from Director of F&B"],
        "server_drops_table": ["Immediate cleanup crew", "Replace all affected plates within 10 min", "Comp affected table", "Manager personal service for remainder", "Check overage covers to replace"],
        "equipment_failure": ["Activate backup plan", "Concierge ticket for engineering", "Adjust timeline", "Communicate proactively to client"],
    }

    # Success probability
    success_probs = {
        "disappointed": {"recovery_pct": 92, "return_pct": 88, "referral_pct": 45},
        "upset": {"recovery_pct": 78, "return_pct": 72, "referral_pct": 25},
        "irate": {"recovery_pct": 55, "return_pct": 45, "referral_pct": 10},
        "wont_return": {"recovery_pct": 30, "return_pct": 20, "referral_pct": 5},
    }

    probs = success_probs.get(guest_reaction, success_probs["disappointed"])

    return {
        "incident": {
            "type": incident_type,
            "severity": severity,
            "guest_reaction": guest_reaction,
            "description": description,
            "beo_number": beo_number,
            "event_revenue": event_revenue,
        },
        "three_lobe_analysis": {
            "logical": {
                "comp_pct": logical_comp_pct,
                "reasoning": f"Standard {severity} incident protocol. {logical_comp_pct}% compensation aligns with industry practice.",
            },
            "guest_satisfaction": {
                "comp_pct": guest_comp_pct,
                "reasoning": f"Guest is {guest_reaction}. Elevated compensation of {guest_comp_pct}% to maximize recovery probability and long-term retention.",
            },
            "financial": {
                "comp_pct": financial_comp_pct,
                "reasoning": f"Financial cap at {financial_comp_pct}%. Protects margin while acknowledging service failure. Loss absorbed in comp GL line.",
            },
        },
        "echoai3_recommendation": {
            "comp_pct": recommended_pct,
            "comp_amount": comp_amount,
            "tip_pool_impact": "None — tip pool stays based on original BEO pricing",
            "gl_impact": f"${comp_amount:,.2f} loss recorded in comp GL line. P&L reflects actual revenue minus comp.",
            "recovery_actions": recovery_actions.get(incident_type, recovery_actions["service_failure"]),
        },
        "recovery_probability": probs,
        "scoring": {
            "success_likelihood": f"{probs['recovery_pct']}%",
            "guest_return_likelihood": f"{probs['return_pct']}%",
            "referral_likelihood": f"{probs['referral_pct']}%",
            "financial_impact_ratio": f"1:{round(event_revenue / max(comp_amount, 1), 1)}" if comp_amount > 0 else "N/A",
            "note": "For every $1 in comp, we retain ${:.0f} in future revenue potential".format(event_revenue / max(comp_amount, 1) * probs["return_pct"] / 100) if comp_amount > 0 else "",
        },
    }


# ══════════════════════════════════════
#  CART LABEL SHEET GENERATOR
# ══════════════════════════════════════

@router.post("/cart-labels")
async def generate_cart_labels(body: dict = {}):
    """Generate printable cart label sheets — large font BEO#, room, items, placement.

    Each cart gets a label with:
    - BEO # (HUGE FONT)
    - ROOM destination (HUGE FONT)
    - Event name
    - Cart number / total carts for this BEO
    - Items on this cart with sheet pan counts
    - Shelf placement (TOP/MIDDLE/BOTTOM) for sanitation
    - Temperature requirements
    - Daily count check boxes
    """
    beo_numbers = body.get("beo_numbers", [])
    beos = list(db["beo_documents"].find({"beo_number": {"$in": beo_numbers}}, {"_id": 0}))
    if not beos:
        raise HTTPException(404, "No BEOs found")

    all_labels = []
    for beo in beos:
        beo_num = beo["beo_number"]
        room = beo.get("room", "TBD")
        event_name = beo.get("event_name", "")
        covers = beo.get("guaranteed_count", 0)
        menu = beo.get("menu", {})
        sections = menu.get("sections", [])
        fire_time = beo.get("start_time", "TBD")

        # Build cart assignments from menu sections
        cart_num = 1
        beo_carts = []

        # Categorize sections into hot/cold
        hot_sections = []
        cold_sections = []
        for section in sections:
            name = section.get("name", "").lower()
            items = section.get("items", [])
            if not items:
                continue
            if any(k in name for k in ["hot", "grill", "smoker", "carving", "soup", "egg", "potato", "meat", "enhancement"]):
                hot_sections.append(section)
            elif any(k in name for k in ["cold", "salad", "dessert", "bakery", "bread"]):
                cold_sections.append(section)
            elif "beverage" in name:
                continue
            else:
                hot_sections.append(section)

        # Hot cart(s) — need temp control
        pans_per_cart = 16  # Hot box capacity
        hot_items = []
        for sec in hot_sections:
            for item in sec.get("items", []):
                pans = max(1, math.ceil(covers / 100 * 2))
                hot_items.append({
                    "item": item, "section": sec["name"],
                    "sheet_pans": pans,
                    "placement": "BOTTOM" if any(k in sec["name"].lower() for k in ["grill", "carving", "smoker", "meat"]) else "MIDDLE" if "potato" in sec["name"].lower() or "starch" in sec["name"].lower() else "TOP",
                    "temp": "145°F MIN" if any(k in sec["name"].lower() for k in ["grill", "carving", "hot", "smoker", "meat"]) else "HOT",
                })

        # Split hot items across carts
        current_pans = 0
        current_cart_items = []
        for hi in hot_items:
            if current_pans + hi["sheet_pans"] > pans_per_cart and current_cart_items:
                beo_carts.append({
                    "cart_number": cart_num,
                    "cart_type": "HOT",
                    "items": current_cart_items,
                    "total_pans": current_pans,
                })
                cart_num += 1
                current_cart_items = []
                current_pans = 0
            current_cart_items.append(hi)
            current_pans += hi["sheet_pans"]
        if current_cart_items:
            beo_carts.append({
                "cart_number": cart_num,
                "cart_type": "HOT",
                "items": current_cart_items,
                "total_pans": current_pans,
            })
            cart_num += 1

        # Cold cart(s)
        cold_items = []
        for sec in cold_sections:
            for item in sec.get("items", []):
                pans = max(1, math.ceil(covers / 100 * 1.5))
                cold_items.append({
                    "item": item, "section": sec["name"],
                    "sheet_pans": pans, "placement": "ANY",
                    "temp": "COLD 40°F" if "dessert" not in sec["name"].lower() else "COLD 40°F",
                })
        if cold_items:
            beo_carts.append({
                "cart_number": cart_num,
                "cart_type": "COLD",
                "items": cold_items,
                "total_pans": sum(i["sheet_pans"] for i in cold_items),
            })
            cart_num += 1

        total_carts = len(beo_carts)

        for cart in beo_carts:
            # Daily count check boxes (AM check, pre-fire check, post-fire check)
            checks = [
                {"time": "AM PREP", "checked": False, "initials": ""},
                {"time": "PRE-FIRE", "checked": False, "initials": ""},
                {"time": "POST-FIRE", "checked": False, "initials": ""},
                {"time": "PLATE-UP", "checked": False, "initials": ""},
            ]

            label = {
                "beo_number": beo_num,
                "room": room,
                "event_name": event_name,
                "covers": covers,
                "fire_time": fire_time,
                "cart_number": cart["cart_number"],
                "total_carts": total_carts,
                "cart_type": cart["cart_type"],
                "total_sheet_pans": cart["total_pans"],
                "items": cart["items"],
                "sanitation_rules": [
                    "PROTEINS → BOTTOM SHELF (prevent drip contamination)",
                    "STARCHES → MIDDLE SHELF",
                    "VEGETABLES → TOP SHELF (most delicate)",
                    "SAUCES → SEPARATE CONTAINER, SECURED",
                ] if cart["cart_type"] == "HOT" else ["ALL ITEMS COLD — maintain 40°F or below"],
                "daily_count_checks": checks,
                "label_print_format": {
                    "beo_display": f"BEO #{beo_num}",
                    "room_display": room.upper(),
                    "font_size_beo": "72pt",
                    "font_size_room": "60pt",
                    "font_size_items": "18pt",
                    "color_code": "RED" if cart["cart_type"] == "HOT" else "BLUE",
                    "note": "LARGE PRINT — POST ON CART. DO NOT REMOVE.",
                },
            }
            all_labels.append(label)

    return {
        "total_carts": len(all_labels),
        "labels": all_labels,
        "print_instructions": "Print each label on 8.5x11 cardstock. Laminate and attach to cart with zip tie. BEO# and ROOM must be visible from 15 feet.",
    }


# ══════════════════════════════════════
#  OVEN FIRING POSTER GENERATOR
# ══════════════════════════════════════

@router.post("/firing-poster")
async def generate_firing_poster(body: dict = {}):
    """Generate printable oven firing poster — place by ovens with times, temps, Chef's Logic.

    Large-format poster showing:
    - All events firing with times
    - Oven assignments (which oven gets what)
    - Temperature timeline
    - Chef's decision logic notes
    """
    beo_numbers = body.get("beo_numbers", [])
    fire_time_str = body.get("fire_time", "17:30")

    # Get firing sequence data
    seq_body = {"beo_numbers": beo_numbers, "fire_time": fire_time_str}
    seq = await generate_firing_sequence(seq_body)

    # Parse fire time
    try:
        fire_hour, fire_min = map(int, fire_time_str.split(":"))
    except ValueError:
        fire_hour, fire_min = 17, 30

    # Build oven-by-oven assignment display
    working_ovens = [e for e in EQUIPMENT.values() if e.get("type") == "combi_oven" and e.get("status") == "operational"]
    oven_poster = []

    for oven in working_ovens:
        oven_tasks = [t for t in seq["firing_timeline"] if t.get("oven") == oven["id"]]
        oven_poster.append({
            "oven_name": oven["name"],
            "oven_id": oven["id"],
            "capacity": f"{oven['sheet_pan_capacity']} sheet pans",
            "tasks": [{
                "time": f"T{t['offset_min']:+d}min ({fire_hour}:{max(0, fire_min + t['offset_min']):02d})",
                "action": t["action"],
                "detail": t["detail"],
                "pans": t["pans"],
            } for t in oven_tasks],
        })

    # Chef's Logic Decision Tree
    chefs_logic = [
        {"step": 1, "time": f"T-35min ({fire_hour}:{max(0, fire_min - 35):02d})", "action": "PREP CHECK",
         "detail": "Verify all sheet pans loaded on speed racks. Count matches BEO cover count. Check sauce pots on range."},
        {"step": 2, "time": f"T-30min ({fire_hour}:{max(0, fire_min - 30):02d})", "action": "LOAD PROTEINS → OVENS",
         "detail": "All protein pans into Rationals on RETHERM mode 250°F. Set timer 23 minutes. DO NOT open doors during retherm."},
        {"step": 3, "time": f"T-25min ({fire_hour}:{max(0, fire_min - 25):02d})", "action": "LOAD STARCHES → OVENS",
         "detail": "Starches (mash, rice, mac) can share oven space with proteins OR go into Winston CVAP if ovens full."},
        {"step": 4, "time": f"T-15min ({fire_hour}:{max(0, fire_min - 15):02d})", "action": "SAUCES ON RANGE",
         "detail": "All sauces to Jade range. Heat to near boiling. Load sauce guns. Stage in bain-marie."},
        {"step": 5, "time": f"T-7min ({fire_hour}:{max(0, fire_min - 7):02d})", "action": "BUMP PROTEIN TEMP",
         "detail": "Turn all ovens with proteins to 425°F for FINISHING SEAR. Timer: 2 minutes ONLY. Watch carefully."},
        {"step": 6, "time": f"T-5min ({fire_hour}:{max(0, fire_min - 5):02d})", "action": "PULL PROTEINS → HOT BOX / CVAP",
         "detail": "MOVE ALL PROTEINS out of ovens into hot boxes with extra sterno OR Winston CVAP. Ovens now CLEAR for vegetables."},
        {"step": 7, "time": f"T-5min ({fire_hour}:{max(0, fire_min - 5):02d})", "action": "LOAD VEGETABLES → OVENS",
         "detail": "ALL vegetables into Rationals at 400°F HIGH FAN BLAST. Timer: 6 minutes. Green veg will turn ARMY GREEN if held — fire LAST, serve IMMEDIATELY."},
        {"step": 8, "time": f"T-2min ({fire_hour}:{max(0, fire_min - 2):02d})", "action": "PLATES TO PLATE-UP AREA",
         "detail": "Hot plates from hot box (extra sterno) to plate-up station. Sauce guns ready. Garnish staged."},
        {"step": 9, "time": f"T+0 ({fire_hour}:{fire_min:02d})", "action": "FIRE / PLATE-UP",
         "detail": "Pull vegetables → plate-up area. Proteins from hot box. Sauce. Garnish. SERVE. Check BEO cart labels match room assignments."},
        {"step": 10, "time": f"T+5min ({fire_hour}:{fire_min + 5:02d})", "action": "QUALITY CHECK",
         "detail": "Chef walks buffet/plate-up. Temp check all items. Verify dietary restriction plates are correct. Signal captain: SERVICE GO."},
    ]

    # Bottleneck warnings for poster
    warnings = []
    if seq["demand"]["has_bottleneck"]:
        warnings.append(f"OVEN BOTTLENECK: Need {seq['demand']['total_sheet_pans_needed']} pans, only {seq['demand']['total_oven_capacity']} oven slots available ({seq['demand']['utilization_pct']}% utilization)")
        warnings.append("USE STAGGERED FIRING: Fire Event A proteins first → hot box → clear → Fire Event B")
        warnings.append("CONSIDER RATIONAL PRE-PLATED: Plate cold, thermal wrap, retherm entire cart")

    if any(e.get("status") == "repair" for e in EQUIPMENT.values() if e.get("type") == "combi_oven"):
        repair_ovens = [e["name"] for e in EQUIPMENT.values() if e.get("type") == "combi_oven" and e.get("status") == "repair"]
        warnings.append(f"OVEN DOWN: {', '.join(repair_ovens)} — working with {len(working_ovens)} ovens only")

    return {
        "fire_time": fire_time_str,
        "events": seq["beos_firing"],
        "oven_assignments": oven_poster,
        "chefs_logic": chefs_logic,
        "warnings": warnings,
        "equipment_summary": seq["equipment_status"],
        "demand_summary": seq["demand"],
        "print_format": {
            "size": "24x36 inches (poster)",
            "font_event_header": "48pt BOLD",
            "font_oven_name": "36pt",
            "font_time_temp": "28pt BOLD RED",
            "font_logic_steps": "22pt",
            "font_warnings": "30pt RED BACKGROUND",
            "note": "LAMINATE AND POST BY OVEN STATION. REPLACE DAILY.",
        },
    }


# ══════════════════════════════════════
#  SUPPLIER SHORTAGE & CALLOUT DETECTION
# ══════════════════════════════════════

@router.post("/supplier-shortage/detect")
async def detect_supplier_shortages(body: dict = {}):
    """Detect supplier shortages for upcoming BEO events.

    Checks: late deliveries, missing items, alternative vendor sourcing,
    24-hour advance rule violations, items arriving day-of.
    """
    beo_numbers = body.get("beo_numbers", [])
    event_date = body.get("event_date", "")

    beos = list(db["beo_documents"].find(
        {"beo_number": {"$in": beo_numbers}} if beo_numbers else {"event_date": event_date},
        {"_id": 0}
    ))

    # Simulate shortages based on menu analysis
    shortages = []
    alerts = []
    alternatives = []

    for beo in beos:
        menu = beo.get("menu", {})
        sections = menu.get("sections", [])
        beo_num = beo["beo_number"]
        covers = beo.get("guaranteed_count", 0)

        for section in sections:
            items = section.get("items", [])
            for item in items:
                item_lower = item.lower()
                # Simulate specific shortage scenarios
                if "grouper" in item_lower:
                    shortages.append({
                        "beo_number": beo_num, "item": item,
                        "issue": "Supplier shortage — fresh grouper not available from primary vendor (Sysco)",
                        "severity": "high",
                        "impact": f"Affects {covers} covers",
                        "24hr_violation": True,
                        "arriving_day_of": True,
                        "alternative_vendor": "US Foods — confirmed available, arriving 6AM day-of",
                        "chef_action": "Accept day-of delivery OR substitute with Mahi-Mahi (already on BBQ lunch menu)",
                    })
                if "skirt steak" in item_lower or "churrasco" in item_lower:
                    shortages.append({
                        "beo_number": beo_num, "item": item,
                        "issue": "Primary vendor (Sysco) short 40lbs on skirt steak order",
                        "severity": "medium",
                        "impact": f"Short ~80 portions of {covers} needed",
                        "24hr_violation": False,
                        "arriving_day_of": False,
                        "alternative_vendor": "Cheney Brothers — can deliver remaining 40lbs by 2PM tomorrow",
                        "chef_action": "Split order: 60% Sysco (confirmed), 40% Cheney Brothers backup",
                    })
                if "brisket" in item_lower:
                    alerts.append({
                        "beo_number": beo_num, "item": item,
                        "type": "timing_alert",
                        "message": f"Brisket requires 12-hour smoke time. Must start by midnight for 12PM service.",
                        "action": "Confirm smoker start time with night chef",
                    })

    # FOH/BOH callout detection
    callouts = {
        "foh_shortages": [],
        "boh_shortages": [],
    }

    total_covers = sum(b.get("guaranteed_count", 0) for b in beos)
    servers_needed = max(2, total_covers // 18)
    captains_needed = max(1, total_covers // 40)
    bartenders_needed = sum(1 for b in beos if b.get("beverage_menu"))
    cooks_needed = max(3, total_covers // 60)
    stewarding_needed = max(2, total_covers // 80)

    # Simulate callouts
    if total_covers > 300:
        callouts["foh_shortages"].append({
            "role": "Banquet Server", "needed": servers_needed, "available": servers_needed - 2,
            "shortage": 2, "reason": "2 servers called out — flu",
            "solution": "Pull 2 restaurant servers for cross-deployment. Adjust restaurant floor plan.",
        })
    if total_covers > 400:
        callouts["boh_shortages"].append({
            "role": "Line Cook", "needed": cooks_needed, "available": cooks_needed - 1,
            "shortage": 1, "reason": "1 cook no-show",
            "solution": "Chef covers station. Assign prep cook to assist plating.",
        })

    return {
        "event_date": event_date or (beos[0]["event_date"] if beos else ""),
        "beos_checked": len(beos),
        "total_covers": total_covers,
        "shortages": shortages,
        "alerts": alerts,
        "alternatives": alternatives,
        "callouts": callouts,
        "staffing_needs": {
            "foh": {"servers": servers_needed, "captains": captains_needed, "bartenders": bartenders_needed},
            "boh": {"cooks": cooks_needed, "stewarding": stewarding_needed},
        },
        "24hr_rule_violations": [s for s in shortages if s.get("24hr_violation")],
    }


# ══════════════════════════════════════
#  ALLERGEN RECIPE CUSTOMIZATION
# ══════════════════════════════════════

@router.post("/allergen-customize")
async def allergen_recipe_customization(body: dict = {}):
    """Generate allergen-safe recipe modifications for specific guests.

    Takes BEO dietary restrictions and generates per-guest custom plates.
    """
    beo_number = body.get("beo_number")
    beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    restrictions = beo.get("dietary_restrictions", [])
    menu = beo.get("menu", {})
    sections = menu.get("sections", [])
    all_items = []
    for sec in sections:
        for item in sec.get("items", []):
            all_items.append({"section": sec["name"], "item": item})

    customizations = []
    for rest in restrictions:
        restriction = rest["restriction"]
        count = rest["count"]

        # Generate modifications per restriction
        mods = []
        warnings = []
        safe_items = []
        unsafe_items = []

        for menu_item in all_items:
            item_lower = menu_item["item"].lower()
            is_safe = True

            if "shellfish" in restriction.lower() or "fish" in restriction.lower():
                if any(f in item_lower for f in ["grouper", "mahi", "fish", "shellfish", "shrimp", "lobster", "crab"]):
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — substitute with Grilled Chicken Breast")

            if "gluten" in restriction.lower() or "wheat" in restriction.lower():
                if any(g in item_lower for g in ["bread", "roll", "crouton", "biscuit", "focaccia", "flour", "mac and cheese", "pancake", "tart", "pie", "cheesecake"]):
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — provide GF alternative")

            if "coconut" in restriction.lower():
                if "coconut" in item_lower:
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — coconut allergy")

            if "beef" in restriction.lower() and "no beef" in restriction.lower():
                if any(b in item_lower for b in ["beef", "steak", "brisket", "churrasco"]):
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — no beef")

            if "pork" in restriction.lower() and "no pork" in restriction.lower():
                if any(p in item_lower for p in ["pork", "bacon", "ham", "chorizo", "sausage"]):
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — no pork")

            if "mushroom" in restriction.lower():
                if "mushroom" in item_lower:
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — mushroom allergy")

            if "dairy" in restriction.lower():
                if any(d in item_lower for d in ["cheese", "cream", "butter", "chantilly", "fondue", "mousse"]):
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — dairy free")

            if "avocado" in restriction.lower():
                if "avocado" in item_lower:
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — avocado allergy")

            if "pineapple" in restriction.lower():
                if "pineapple" in item_lower:
                    is_safe = False
                    mods.append(f"REMOVE: {menu_item['item']} — pineapple allergy")

            if is_safe:
                safe_items.append(menu_item["item"])
            else:
                unsafe_items.append(menu_item["item"])

        customizations.append({
            "restriction": restriction,
            "guest_count": count,
            "modifications": mods,
            "safe_items": safe_items[:10],
            "unsafe_items": unsafe_items,
            "plate_label": f"ALLERGY: {restriction}",
            "kitchen_ticket_color": "RED" if any(k in restriction.lower() for k in ["allergy", "free"]) else "YELLOW",
        })

    return {
        "beo_number": beo_number,
        "event_name": beo.get("event_name", ""),
        "total_restrictions": sum(r["count"] for r in restrictions),
        "customizations": customizations,
        "kitchen_instructions": [
            "ALL allergy plates prepared on SEPARATE cutting board with CLEAN utensils",
            "RED ticket = life-threatening allergy — Chef must verify before service",
            "YELLOW ticket = dietary preference — standard alternative protocol",
            "Label each plate with allergy card visible to server",
            "Captain delivers allergy plates personally — do NOT place on tray with regular plates",
        ],
    }


# ══════════════════════════════════════
#  ECHO CONCIERGE: EQUIPMENT BREAKDOWN
# ══════════════════════════════════════

@router.post("/concierge/equipment-ticket")
async def create_equipment_breakdown_ticket(body: dict = {}):
    """Create Echo Concierge ticket for kitchen equipment breakdown.

    Routes to Engineering, notifies Chef and Banquet Manager,
    activates backup plan, adjusts firing sequence.
    """
    equipment_id = body.get("equipment_id")
    issue = body.get("issue", "Equipment malfunction")
    reported_by = body.get("reported_by", "Chef")
    severity = body.get("severity", "high")
    active_beos = body.get("active_beo_numbers", [])

    equip = EQUIPMENT.get(equipment_id)
    if not equip:
        raise HTTPException(404, "Equipment not found")

    ticket_id = f"ENG-{_uid()}"
    equip_name = equip.get("name", equipment_id)
    equip_type = equip.get("type", "")

    # Update equipment status
    EQUIPMENT[equipment_id]["status"] = "repair"
    EQUIPMENT[equipment_id]["repair_notes"] = issue

    # Calculate impact
    impact = {"affected_capacity": 0, "backup_plan": "", "notifications": []}

    if equip_type == "combi_oven":
        lost_pans = equip.get("sheet_pan_capacity", 5)
        working = sum(1 for e in EQUIPMENT.values() if e.get("type") == "combi_oven" and e.get("status") == "operational")
        impact["affected_capacity"] = f"{lost_pans} sheet pan slots lost. Now operating with {working} ovens."
        impact["backup_plan"] = "Activate staggered firing sequence. Use Winston CVAP for protein holding. Consider Rational pre-plated system for overflow."
        impact["notifications"] = [
            {"to": "Executive Chef", "message": f"OVEN DOWN: {equip_name}. {working} ovens remaining. Backup plan activated."},
            {"to": "Banquet Manager", "message": f"Kitchen capacity reduced — may need to adjust event timing."},
            {"to": "Engineering", "message": f"URGENT: {equip_name} — {issue}. Priority repair needed."},
        ]
    elif equip_type in ["hot_box", "holding_cabinet"]:
        impact["backup_plan"] = "Use alternate hot box or CresCorr cabinet. Add extra sterno to remaining units."
        impact["notifications"] = [
            {"to": "Executive Chef", "message": f"Holding unit down: {equip_name}. Adjust holding strategy."},
            {"to": "Engineering", "message": f"{equip_name} — {issue}. Needs repair."},
        ]
    else:
        impact["backup_plan"] = "Assess alternate equipment availability."
        impact["notifications"] = [
            {"to": "Engineering", "message": f"{equip_name} — {issue}."},
        ]

    # Recalculate firing sequence if active BEOs
    adjusted_sequence = None
    if active_beos:
        try:
            adjusted_sequence = await generate_firing_sequence({"beo_numbers": active_beos, "fire_time": "17:30"})
        except Exception:
            adjusted_sequence = None

    ticket = {
        "ticket_id": ticket_id,
        "equipment": equip_name,
        "equipment_id": equipment_id,
        "issue": issue,
        "severity": severity,
        "reported_by": reported_by,
        "status": "open",
        "impact": impact,
        "adjusted_firing_sequence": bool(adjusted_sequence),
        "new_bottleneck": adjusted_sequence["demand"]["has_bottleneck"] if adjusted_sequence else None,
        "created_at": _now(),
    }

    db["concierge_equipment_tickets"].insert_one({**ticket, "_id": ticket_id})

    return {**ticket, "notifications_sent": impact["notifications"]}
