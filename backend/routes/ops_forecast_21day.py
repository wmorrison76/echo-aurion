"""
21-Day Operations Forecast — Revenue & Rooms Intelligence
==========================================================
Ingests the property's 21-day forecast data (capacity, OTB, occupancy,
ADR, revenue, arrivals/departures, group blocks, guest counts) and
provides multiple views: Excel grid, detailed graphs, room state tracking,
AI trend analysis, and outlet-level spend forecasting.

Property: 331 rooms | Checkout: 11am | Checkin: 2pm
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
import math

router = APIRouter(prefix="/api/ops-forecast", tags=["ops-forecast"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

CAPACITY = 331

# ══════════════════════════════════════
#  21-DAY FORECAST DATA (from Excel)
# ══════════════════════════════════════

FORECAST_DATA = [
    {"date": "2026-04-13", "dow": "Mon", "capacity": 331, "ooo": 0, "otb_rooms": 290, "occ_pct": 87.6, "rooms_revenue": 132770.49, "adr": 457.83, "forecast_occ_pct": 87.0, "forecast_rooms": 288, "forecast_revenue": 132687.91, "forecast_adr": 460.72, "arrivals": 7, "departures": 4, "group_rooms": 46, "transient_rooms": 244, "guest_count": 399, "avg_guest_per_room": 1.38, "pickup_rooms": 0},
    {"date": "2026-04-14", "dow": "Tue", "capacity": 331, "ooo": 0, "otb_rooms": 292, "occ_pct": 88.2, "rooms_revenue": 137640.87, "adr": 471.37, "forecast_occ_pct": 88.5, "forecast_rooms": 293, "forecast_revenue": 139434.79, "forecast_adr": 475.89, "arrivals": 8, "departures": 3, "group_rooms": 38, "transient_rooms": 254, "guest_count": 392, "avg_guest_per_room": 1.34, "pickup_rooms": 1},
    {"date": "2026-04-15", "dow": "Wed", "capacity": 331, "ooo": 0, "otb_rooms": 118, "occ_pct": 35.6, "rooms_revenue": 69727.21, "adr": 590.91, "forecast_occ_pct": 37.8, "forecast_rooms": 125, "forecast_revenue": 76578.77, "forecast_adr": 612.63, "arrivals": 9, "departures": 8, "group_rooms": 61, "transient_rooms": 57, "guest_count": 173, "avg_guest_per_room": 1.47, "pickup_rooms": 4},
    {"date": "2026-04-16", "dow": "Thu", "capacity": 331, "ooo": 0, "otb_rooms": 139, "occ_pct": 42.0, "rooms_revenue": 81874.11, "adr": 589.02, "forecast_occ_pct": 45.6, "forecast_rooms": 151, "forecast_revenue": 93404.07, "forecast_adr": 618.57, "arrivals": 9, "departures": 8, "group_rooms": 95, "transient_rooms": 44, "guest_count": 205, "avg_guest_per_room": 1.47, "pickup_rooms": 6},
    {"date": "2026-04-17", "dow": "Fri", "capacity": 331, "ooo": 0, "otb_rooms": 137, "occ_pct": 41.4, "rooms_revenue": 77052.17, "adr": 562.42, "forecast_occ_pct": 45.9, "forecast_rooms": 152, "forecast_revenue": 91543.91, "forecast_adr": 602.26, "arrivals": 9, "departures": 8, "group_rooms": 106, "transient_rooms": 31, "guest_count": 234, "avg_guest_per_room": 1.71, "pickup_rooms": 11},
    {"date": "2026-04-18", "dow": "Sat", "capacity": 331, "ooo": 0, "otb_rooms": 119, "occ_pct": 35.9, "rooms_revenue": 65588.60, "adr": 551.16, "forecast_occ_pct": 41.4, "forecast_rooms": 137, "forecast_revenue": 83132.29, "forecast_adr": 606.81, "arrivals": 10, "departures": 8, "group_rooms": 115, "transient_rooms": 4, "guest_count": 243, "avg_guest_per_room": 2.04, "pickup_rooms": 10},
    {"date": "2026-04-19", "dow": "Sun", "capacity": 331, "ooo": 0, "otb_rooms": 109, "occ_pct": 32.9, "rooms_revenue": 53577.60, "adr": 491.54, "forecast_occ_pct": 36.6, "forecast_rooms": 121, "forecast_revenue": 64718.91, "forecast_adr": 534.87, "arrivals": 7, "departures": 8, "group_rooms": 71, "transient_rooms": 38, "guest_count": 208, "avg_guest_per_room": 1.91, "pickup_rooms": 10},
    {"date": "2026-04-20", "dow": "Mon", "capacity": 331, "ooo": 0, "otb_rooms": 232, "occ_pct": 70.1, "rooms_revenue": 101615.58, "adr": 437.99, "forecast_occ_pct": 72.8, "forecast_rooms": 241, "forecast_revenue": 109936.30, "forecast_adr": 456.17, "arrivals": 8, "departures": 8, "group_rooms": 32, "transient_rooms": 200, "guest_count": 294, "avg_guest_per_room": 1.27, "pickup_rooms": 20},
    {"date": "2026-04-21", "dow": "Tue", "capacity": 331, "ooo": 0, "otb_rooms": 240, "occ_pct": 72.5, "rooms_revenue": 102834.35, "adr": 428.48, "forecast_occ_pct": 75.8, "forecast_rooms": 251, "forecast_revenue": 112661.99, "forecast_adr": 448.85, "arrivals": 9, "departures": 8, "group_rooms": 44, "transient_rooms": 196, "guest_count": 299, "avg_guest_per_room": 1.25, "pickup_rooms": 0},
    {"date": "2026-04-22", "dow": "Wed", "capacity": 331, "ooo": 0, "otb_rooms": 151, "occ_pct": 45.6, "rooms_revenue": 42649.60, "adr": 282.45, "forecast_occ_pct": 50.2, "forecast_rooms": 166, "forecast_revenue": 55527.50, "forecast_adr": 334.50, "arrivals": 9, "departures": 8, "group_rooms": 47, "transient_rooms": 104, "guest_count": 202, "avg_guest_per_room": 1.34, "pickup_rooms": 0},
    {"date": "2026-04-23", "dow": "Thu", "capacity": 331, "ooo": 0, "otb_rooms": 154, "occ_pct": 46.5, "rooms_revenue": 46672.37, "adr": 303.07, "forecast_occ_pct": 52.3, "forecast_rooms": 173, "forecast_revenue": 63010.38, "forecast_adr": 364.22, "arrivals": 9, "departures": 8, "group_rooms": 55, "transient_rooms": 99, "guest_count": 204, "avg_guest_per_room": 1.32, "pickup_rooms": 0},
    {"date": "2026-04-24", "dow": "Fri", "capacity": 331, "ooo": 0, "otb_rooms": 86, "occ_pct": 26.0, "rooms_revenue": 39956.74, "adr": 464.61, "forecast_occ_pct": 32.9, "forecast_rooms": 109, "forecast_revenue": 62410.23, "forecast_adr": 572.57, "arrivals": 10, "departures": 8, "group_rooms": 58, "transient_rooms": 28, "guest_count": 170, "avg_guest_per_room": 1.98, "pickup_rooms": 0},
    {"date": "2026-04-25", "dow": "Sat", "capacity": 331, "ooo": 0, "otb_rooms": 225, "occ_pct": 68.0, "rooms_revenue": 122679.12, "adr": 545.24, "forecast_occ_pct": 77.3, "forecast_rooms": 256, "forecast_revenue": 152033.58, "forecast_adr": 592.91, "arrivals": 7, "departures": 8, "group_rooms": 74, "transient_rooms": 151, "guest_count": 327, "avg_guest_per_room": 1.45, "pickup_rooms": 0},
    {"date": "2026-04-26", "dow": "Sun", "capacity": 331, "ooo": 0, "otb_rooms": 273, "occ_pct": 82.5, "rooms_revenue": 141152.56, "adr": 517.04, "forecast_occ_pct": 86.7, "forecast_rooms": 287, "forecast_revenue": 155173.48, "forecast_adr": 540.09, "arrivals": 8, "departures": 8, "group_rooms": 43, "transient_rooms": 230, "guest_count": 373, "avg_guest_per_room": 1.37, "pickup_rooms": 0},
    {"date": "2026-04-27", "dow": "Mon", "capacity": 331, "ooo": 0, "otb_rooms": 221, "occ_pct": 66.8, "rooms_revenue": 96997.49, "adr": 438.90, "forecast_occ_pct": 72.5, "forecast_rooms": 240, "forecast_revenue": 115115.75, "forecast_adr": 479.65, "arrivals": 9, "departures": 8, "group_rooms": 34, "transient_rooms": 187, "guest_count": 329, "avg_guest_per_room": 1.49, "pickup_rooms": 0},
    {"date": "2026-04-28", "dow": "Tue", "capacity": 331, "ooo": 0, "otb_rooms": 275, "occ_pct": 83.1, "rooms_revenue": 125979.31, "adr": 458.11, "forecast_occ_pct": 86.7, "forecast_rooms": 287, "forecast_revenue": 138187.55, "forecast_adr": 481.49, "arrivals": 9, "departures": 8, "group_rooms": 39, "transient_rooms": 236, "guest_count": 383, "avg_guest_per_room": 1.39, "pickup_rooms": 0},
    {"date": "2026-04-29", "dow": "Wed", "capacity": 331, "ooo": 0, "otb_rooms": 204, "occ_pct": 61.6, "rooms_revenue": 102806.16, "adr": 503.95, "forecast_occ_pct": 68.0, "forecast_rooms": 225, "forecast_revenue": 121829.20, "forecast_adr": 541.44, "arrivals": 9, "departures": 8, "group_rooms": 46, "transient_rooms": 158, "guest_count": 295, "avg_guest_per_room": 1.45, "pickup_rooms": 0},
    {"date": "2026-04-30", "dow": "Thu", "capacity": 331, "ooo": 0, "otb_rooms": 137, "occ_pct": 41.4, "rooms_revenue": 81708.96, "adr": 596.42, "forecast_occ_pct": 49.8, "forecast_rooms": 165, "forecast_revenue": 106262.57, "forecast_adr": 644.02, "arrivals": 10, "departures": 8, "group_rooms": 54, "transient_rooms": 83, "guest_count": 232, "avg_guest_per_room": 1.69, "pickup_rooms": 0},
    {"date": "2026-05-01", "dow": "Fri", "capacity": 331, "ooo": 0, "otb_rooms": 203, "occ_pct": 61.3, "rooms_revenue": 137091.74, "adr": 675.33, "forecast_occ_pct": 74.6, "forecast_rooms": 247, "forecast_revenue": 177882.38, "forecast_adr": 719.82, "arrivals": 7, "departures": 8, "group_rooms": 56, "transient_rooms": 147, "guest_count": 358, "avg_guest_per_room": 1.76, "pickup_rooms": 0},
    {"date": "2026-05-02", "dow": "Sat", "capacity": 331, "ooo": 0, "otb_rooms": 279, "occ_pct": 84.3, "rooms_revenue": 178648.03, "adr": 640.32, "forecast_occ_pct": 92.4, "forecast_rooms": 306, "forecast_revenue": 204594.47, "forecast_adr": 668.61, "arrivals": 8, "departures": 8, "group_rooms": 46, "transient_rooms": 233, "guest_count": 520, "avg_guest_per_room": 1.86, "pickup_rooms": 0},
    {"date": "2026-05-03", "dow": "Sun", "capacity": 331, "ooo": 0, "otb_rooms": 266, "occ_pct": 80.4, "rooms_revenue": 155389.61, "adr": 584.17, "forecast_occ_pct": 83.7, "forecast_rooms": 277, "forecast_revenue": 167773.98, "forecast_adr": 605.68, "arrivals": 9, "departures": 8, "group_rooms": 27, "transient_rooms": 239, "guest_count": 483, "avg_guest_per_room": 1.82, "pickup_rooms": 0},
]

GROUP_BLOCKS = [
    {"name": "Farmer / Wannebo", "total_rooms": 238, "dates": ["2026-04-13", "2026-04-14"], "type": "corporate"},
    {"name": "Tortuga", "total_rooms": 24, "dates": ["2026-04-13", "2026-04-14"], "type": "social"},
    {"name": "VIP Block", "total_rooms": 71, "dates": ["2026-04-13", "2026-04-14", "2026-04-15"], "type": "vip"},
    {"name": "eClinical Works", "total_rooms": 64, "dates": ["2026-04-13", "2026-04-14", "2026-04-15"], "type": "corporate", "attendees": 325, "solo_pct": 85, "family_pct": 15},
    {"name": "Mestek BOD", "total_rooms": 57, "dates": ["2026-04-16", "2026-04-17", "2026-04-18"], "type": "corporate"},
    {"name": "Harding McGriff Executive", "total_rooms": 50, "dates": ["2026-04-16", "2026-04-17"], "type": "corporate"},
    {"name": "ALHI 2026", "total_rooms": 64, "dates": ["2026-04-18", "2026-04-19", "2026-04-20"], "type": "association"},
    {"name": "IFLE", "total_rooms": 175, "dates": ["2026-04-20", "2026-04-21", "2026-04-22"], "type": "conference"},
    {"name": "People Driven", "total_rooms": 45, "dates": ["2026-04-22", "2026-04-23"], "type": "corporate"},
    {"name": "Norton Rose F", "total_rooms": 117, "dates": ["2026-04-23", "2026-04-24", "2026-04-25"], "type": "corporate"},
    {"name": "Derma and Dental", "total_rooms": 33, "dates": ["2026-04-25", "2026-04-26"], "type": "medical"},
    {"name": "F1 Miami", "total_rooms": 62, "dates": ["2026-04-30", "2026-05-01", "2026-05-02", "2026-05-03"], "type": "sports"},
    {"name": "Pirelli F1 Right Formula", "total_rooms": 184, "dates": ["2026-04-30", "2026-05-01", "2026-05-02", "2026-05-03"], "type": "sports"},
    {"name": "JP Morgan", "total_rooms": 110, "dates": ["2026-04-28", "2026-04-29", "2026-04-30"], "type": "financial"},
    {"name": "Turner Brothers", "total_rooms": 131, "dates": ["2026-04-26", "2026-04-27", "2026-04-28"], "type": "corporate"},
]

# Outlet forecast multipliers (% of guests expected to dine)
OUTLET_CAPTURE_RATES = {
    "Signature Italian": {"capture_pct": 12, "avg_check": 95, "type": "fine_dining"},
    "Rooftop Lounge": {"capture_pct": 25, "avg_check": 55, "type": "lounge"},
    "Pool Bar & Grill": {"capture_pct": 30, "avg_check": 35, "type": "casual"},
    "Family Dining": {"capture_pct": 15, "avg_check": 22, "type": "family"},
    "In-Room Dining": {"capture_pct": 18, "avg_check": 48, "type": "ird"},
    "Banquet": {"capture_pct": 0, "avg_check": 0, "type": "banquet"},
}


# ══════════════════════════════════════
#  ENDPOINTS
# ══════════════════════════════════════

@router.get("/21-day")
async def get_21_day_forecast():
    """Full 21-day forecast with all metrics."""
    totals = _calc_totals(FORECAST_DATA)
    return {
        "property": {"name": "Resort Property", "capacity": CAPACITY, "checkout_time": "11:00 AM", "checkin_time": "2:00 PM"},
        "days": FORECAST_DATA,
        "totals": totals,
        "period": {"start": FORECAST_DATA[0]["date"], "end": FORECAST_DATA[-1]["date"], "days": len(FORECAST_DATA)},
    }


@router.get("/groups")
async def get_group_blocks():
    """Group business blocks for the 21-day window."""
    for g in GROUP_BLOCKS:
        g["rooms_per_night"] = round(g["total_rooms"] / max(len(g["dates"]), 1))
    return {"groups": GROUP_BLOCKS, "total_groups": len(GROUP_BLOCKS), "total_group_room_nights": sum(g["total_rooms"] for g in GROUP_BLOCKS)}


@router.get("/room-states")
async def get_room_states():
    """Room state tracking per day — occupied, departing (dirty), arriving, available."""
    states = []
    for day in FORECAST_DATA:
        occupied = day["otb_rooms"]
        departing = day["departures"]  # become dirty at 11am
        arriving = day["arrivals"]
        available = CAPACITY - occupied
        # Housekeeping window: 11am-2pm = 3 hours for flips
        rooms_to_flip = departing  # departures become dirty, need cleaning
        states.append({
            "date": day["date"], "dow": day["dow"],
            "occupied": occupied, "available": available,
            "departing_dirty": departing, "arriving_checkin": arriving,
            "rooms_to_flip": rooms_to_flip,
            "flip_window_hours": 3,
            "hk_staff_needed": max(1, math.ceil(rooms_to_flip / 14)),  # ~14 rooms per housekeeper
            "states": {
                "occupied": occupied - departing,
                "dirty_checkout": departing,
                "clean_ready": available - arriving,
                "assigned_arrival": arriving,
            }
        })
    return {"room_states": states, "capacity": CAPACITY}


@router.get("/outlet-forecast")
async def get_outlet_forecast():
    """Per-outlet revenue and covers forecast based on guest count and capture rates."""
    outlet_days = []
    for day in FORECAST_DATA:
        guests = day["guest_count"]
        day_outlets = {"date": day["date"], "dow": day["dow"], "total_guests": guests, "outlets": {}}
        total_outlet_rev = 0
        total_covers = 0
        for outlet_name, rates in OUTLET_CAPTURE_RATES.items():
            if rates["type"] == "banquet":
                continue
            covers = round(guests * rates["capture_pct"] / 100)
            revenue = round(covers * rates["avg_check"], 2)
            total_outlet_rev += revenue
            total_covers += covers
            day_outlets["outlets"][outlet_name] = {
                "covers": covers, "revenue": revenue,
                "avg_check": rates["avg_check"], "capture_pct": rates["capture_pct"],
            }
        day_outlets["total_outlet_revenue"] = round(total_outlet_rev, 2)
        day_outlets["total_covers"] = total_covers
        day_outlets["anticipated_daily_spend"] = round(total_outlet_rev / max(guests, 1), 2)
        outlet_days.append(day_outlets)
    return {"outlet_forecast": outlet_days}


@router.get("/trends")
async def get_trend_analysis():
    """AI-powered trend analysis: transient vs group mix, DOW patterns, ADR trends."""
    # Transient vs Group mix
    group_heavy_days = [d for d in FORECAST_DATA if d["group_rooms"] > d["transient_rooms"]]
    transient_heavy_days = [d for d in FORECAST_DATA if d["transient_rooms"] > d["group_rooms"]]

    # DOW patterns
    dow_avg = {}
    for d in FORECAST_DATA:
        dow_avg.setdefault(d["dow"], {"occ": [], "adr": [], "rev": [], "guests": []})
        dow_avg[d["dow"]]["occ"].append(d["occ_pct"])
        dow_avg[d["dow"]]["adr"].append(d["adr"])
        dow_avg[d["dow"]]["rev"].append(d["rooms_revenue"])
        dow_avg[d["dow"]]["guests"].append(d["guest_count"])

    dow_patterns = {}
    for dow, vals in dow_avg.items():
        dow_patterns[dow] = {
            "avg_occ": round(sum(vals["occ"]) / len(vals["occ"]), 1),
            "avg_adr": round(sum(vals["adr"]) / len(vals["adr"]), 2),
            "avg_revenue": round(sum(vals["rev"]) / len(vals["rev"]), 2),
            "avg_guests": round(sum(vals["guests"]) / len(vals["guests"])),
        }

    # Peak and valley detection
    peak_day = max(FORECAST_DATA, key=lambda d: d["forecast_revenue"])
    valley_day = min(FORECAST_DATA, key=lambda d: d["forecast_revenue"])

    # Revenue trend (first 7 vs last 7)
    first_week_rev = sum(d["forecast_revenue"] for d in FORECAST_DATA[:7])
    last_week_rev = sum(d["forecast_revenue"] for d in FORECAST_DATA[-7:])
    trend_pct = round((last_week_rev - first_week_rev) / max(first_week_rev, 1) * 100, 1)

    # Pickup momentum
    total_pickup = sum(d["pickup_rooms"] for d in FORECAST_DATA)

    return {
        "group_vs_transient": {
            "group_heavy_days": len(group_heavy_days),
            "transient_heavy_days": len(transient_heavy_days),
            "avg_group_mix_pct": round(sum(d["group_rooms"] for d in FORECAST_DATA) / max(sum(d["otb_rooms"] for d in FORECAST_DATA), 1) * 100, 1),
            "avg_transient_mix_pct": round(sum(d["transient_rooms"] for d in FORECAST_DATA) / max(sum(d["otb_rooms"] for d in FORECAST_DATA), 1) * 100, 1),
        },
        "dow_patterns": dow_patterns,
        "revenue_trend": {
            "first_week_total": round(first_week_rev, 2),
            "last_week_total": round(last_week_rev, 2),
            "trend_pct": trend_pct,
            "direction": "up" if trend_pct > 0 else "down",
        },
        "peak": {"date": peak_day["date"], "dow": peak_day["dow"], "revenue": peak_day["forecast_revenue"], "occ": peak_day["forecast_occ_pct"]},
        "valley": {"date": valley_day["date"], "dow": valley_day["dow"], "revenue": valley_day["forecast_revenue"], "occ": valley_day["forecast_occ_pct"]},
        "pickup_momentum": total_pickup,
        "insights": _generate_insights(FORECAST_DATA),
    }


@router.get("/summary")
async def get_forecast_summary():
    """Quick summary stats for the 21-day window."""
    t = _calc_totals(FORECAST_DATA)
    return {
        "period_days": 21,
        "capacity": CAPACITY,
        "total_room_nights_otb": t["total_otb"],
        "total_room_nights_forecast": t["total_forecast_rooms"],
        "avg_occ_pct": t["avg_occ"],
        "avg_forecast_occ_pct": t["avg_forecast_occ"],
        "total_revenue_otb": t["total_revenue"],
        "total_revenue_forecast": t["total_forecast_revenue"],
        "avg_adr": t["avg_adr"],
        "avg_forecast_adr": t["avg_forecast_adr"],
        "total_arrivals": t["total_arrivals"],
        "total_departures": t["total_departures"],
        "total_group_rooms": t["total_group"],
        "total_transient_rooms": t["total_transient"],
        "group_mix_pct": round(t["total_group"] / max(t["total_otb"], 1) * 100, 1),
        "total_guests": t["total_guests"],
    }


# ══════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════

def _calc_totals(data):
    total_otb = sum(d["otb_rooms"] for d in data)
    total_rev = sum(d["rooms_revenue"] for d in data)
    total_frooms = sum(d["forecast_rooms"] for d in data)
    total_frev = sum(d["forecast_revenue"] for d in data)
    return {
        "total_otb": total_otb,
        "total_revenue": round(total_rev, 2),
        "total_forecast_rooms": total_frooms,
        "total_forecast_revenue": round(total_frev, 2),
        "avg_occ": round(sum(d["occ_pct"] for d in data) / len(data), 1),
        "avg_forecast_occ": round(sum(d["forecast_occ_pct"] for d in data) / len(data), 1),
        "avg_adr": round(total_rev / max(total_otb, 1), 2),
        "avg_forecast_adr": round(total_frev / max(total_frooms, 1), 2),
        "total_arrivals": sum(d["arrivals"] for d in data),
        "total_departures": sum(d["departures"] for d in data),
        "total_group": sum(d["group_rooms"] for d in data),
        "total_transient": sum(d["transient_rooms"] for d in data),
        "total_guests": sum(d["guest_count"] for d in data),
    }


def _generate_insights(data):
    insights = []
    # F1 weekend detection
    f1_days = [d for d in data if d["date"] in ("2026-05-01", "2026-05-02", "2026-05-03")]
    if f1_days:
        avg_adr = sum(d["forecast_adr"] for d in f1_days) / len(f1_days)
        insights.append({"type": "event", "severity": "high", "message": f"F1 Miami weekend (May 1-3): ADR spikes to ${avg_adr:.0f} avg — 246 group rooms blocked. Expect maximum outlet demand."})

    # Low occupancy days
    low_days = [d for d in data if d["forecast_occ_pct"] < 40]
    if low_days:
        dates = ", ".join(d["date"][-5:] for d in low_days[:3])
        insights.append({"type": "warning", "severity": "medium", "message": f"Low occupancy days ({dates}): below 40% — opportunity for walk-in promotions and outlet specials."})

    # High ADR premium days
    premium = [d for d in data if d["forecast_adr"] > 600]
    if premium:
        insights.append({"type": "revenue", "severity": "high", "message": f"{len(premium)} premium ADR days (>${600}) — ensure high-touch service, upsell spa and dining."})

    # Group-heavy midweek
    midweek_group = [d for d in data if d["dow"] in ("Wed", "Thu") and d["group_rooms"] > d["transient_rooms"]]
    if midweek_group:
        insights.append({"type": "staffing", "severity": "medium", "message": f"{len(midweek_group)} midweek days are group-dominated — plan banquet staffing accordingly, lower outlet covers."})

    # Weekend demand
    weekends = [d for d in data if d["dow"] in ("Fri", "Sat", "Sun")]
    avg_wknd_occ = sum(d["forecast_occ_pct"] for d in weekends) / max(len(weekends), 1)
    if avg_wknd_occ > 70:
        insights.append({"type": "demand", "severity": "high", "message": f"Weekend avg forecast occupancy {avg_wknd_occ:.0f}% — ensure all outlets fully staffed, pool bar at max capacity."})

    return insights
