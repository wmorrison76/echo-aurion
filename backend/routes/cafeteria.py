"""
Cafeteria & Employee Dining Module
Backend endpoints for institutional foodservice management.
Uses KB domain: cafeteria_dining (5 operating modes).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os

router = APIRouter(prefix="/api/cafeteria", tags=["cafeteria"])

from database import db as _db
locations_col = _db["caf_locations"]
meal_periods_col = _db["caf_meal_periods"]
menus_col = _db["caf_menus"]
transactions_col = _db["caf_transactions"]
waste_col = _db["caf_waste_logs"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


def _load_kb():
    doc = _db["knowledge_domains"].find_one({"domain_id": "cafeteria_dining"}, {"_id": 0})
    return doc.get("data", {}) if doc else {}


# ═══════════════════════════════════════════════════════════════
# OVERVIEW
# ═══════════════════════════════════════════════════════════════

@router.get("/overview")
def cafeteria_overview(property_id: Optional[str] = None):
    kb = _load_kb()
    modes = kb.get("operating_modes", [])
    q: dict = {"active": True}
    if property_id:
        q["property_id"] = property_id
    locations = list(locations_col.find(q, {"_id": 0}))
    total_locations = len(locations)
    total_capacity = sum(loc.get("seat_capacity", 0) for loc in locations)
    active_modes = list(set(loc.get("mode_id", "") for loc in locations))

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_tx = transactions_col.count_documents({"date": today})
    today_revenue = 0
    for tx in transactions_col.find({"date": today}, {"_id": 0, "total": 1}):
        today_revenue += tx.get("total", 0)

    return {
        "kb_loaded": bool(kb),
        "available_modes": [{"mode_id": m.get("mode_id"), "name": m.get("name"), "objectives": m.get("primary_objectives", []), "metrics": m.get("success_metrics", [])} for m in modes],
        "total_modes": len(modes),
        "locations": locations,
        "total_locations": total_locations,
        "total_seat_capacity": total_capacity,
        "active_modes_in_use": active_modes,
        "today_transactions": today_tx,
        "today_revenue": round(today_revenue, 2),
    }


# ═══════════════════════════════════════════════════════════════
# LOCATIONS (Cafeteria Sites)
# ═══════════════════════════════════════════════════════════════

class LocationCreate(BaseModel):
    name: str
    mode_id: str
    building: str = ""
    floor: str = ""
    seat_capacity: int = 100
    operating_hours: str = "06:00-20:00"
    outlet_id: Optional[str] = None
    property_id: Optional[str] = None

@router.get("/locations")
def list_locations(property_id: Optional[str] = None):
    q: dict = {}
    if property_id:
        q["property_id"] = property_id
    locs = list(locations_col.find(q, {"_id": 0}))
    return {"locations": locs, "total": len(locs)}

@router.post("/locations")
def create_location(data: LocationCreate):
    kb = _load_kb()
    valid_modes = [m.get("mode_id") for m in kb.get("operating_modes", [])]
    if data.mode_id not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode_id. Valid: {valid_modes}")

    mode_info = next((m for m in kb.get("operating_modes", []) if m.get("mode_id") == data.mode_id), {})

    loc = {
        "location_id": f"caf-{_uid()}",
        "name": data.name,
        "mode_id": data.mode_id,
        "mode_name": mode_info.get("name", data.mode_id),
        "building": data.building,
        "floor": data.floor,
        "seat_capacity": data.seat_capacity,
        "operating_hours": data.operating_hours,
        "outlet_id": data.outlet_id,
        "property_id": data.property_id,
        "active": True,
        "kpis": {metric: 0 for metric in mode_info.get("success_metrics", [])},
        "created_at": _now(),
    }
    locations_col.insert_one(loc)
    del loc["_id"]
    return loc


# ═══════════════════════════════════════════════════════════════
# MEAL PERIODS
# ═══════════════════════════════════════════════════════════════

class MealPeriodCreate(BaseModel):
    location_id: str
    period_name: str  # breakfast, lunch, dinner, late_night, grab_and_go
    start_time: str = "11:00"
    end_time: str = "14:00"
    max_covers: int = 200
    subsidy_per_meal: float = 0.0
    menu_ids: list[str] = []

@router.get("/meal-periods")
def list_meal_periods(location_id: Optional[str] = None):
    q = {}
    if location_id:
        q["location_id"] = location_id
    periods = list(meal_periods_col.find(q, {"_id": 0}))
    return {"meal_periods": periods, "total": len(periods)}

@router.post("/meal-periods")
def create_meal_period(data: MealPeriodCreate):
    period = {
        "period_id": f"mp-{_uid()}",
        **data.dict(),
        "actual_covers": 0,
        "created_at": _now(),
    }
    meal_periods_col.insert_one(period)
    del period["_id"]
    return period


# ═══════════════════════════════════════════════════════════════
# MENUS (Cycle Menus per location/mode)
# ═══════════════════════════════════════════════════════════════

class MenuCreate(BaseModel):
    location_id: str
    cycle_name: str  # "Week 1", "Week 2", etc.
    items: list[dict] = []  # [{name, category, price, allergens, nutrition}]

@router.get("/menus")
def list_menus(location_id: Optional[str] = None):
    q = {}
    if location_id:
        q["location_id"] = location_id
    items = list(menus_col.find(q, {"_id": 0}))
    return {"menus": items, "total": len(items)}

@router.post("/menus")
def create_menu(data: MenuCreate):
    menu = {
        "menu_id": f"cm-{_uid()}",
        **data.dict(),
        "active": True,
        "created_at": _now(),
    }
    menus_col.insert_one(menu)
    del menu["_id"]
    return menu


# ═══════════════════════════════════════════════════════════════
# TRANSACTIONS (POS-like meal tracking)
# ═══════════════════════════════════════════════════════════════

class TransactionCreate(BaseModel):
    location_id: str
    period_id: str = ""
    employee_id: str = ""
    items: list[dict] = []
    total: float = 0
    payment_method: str = "subsidy"  # subsidy, cash, card, meal_plan

@router.post("/transactions")
def record_transaction(data: TransactionCreate):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tx = {
        "tx_id": f"ctx-{_uid()}",
        **data.dict(),
        "date": today,
        "timestamp": _now(),
    }
    transactions_col.insert_one(tx)
    del tx["_id"]
    return tx

@router.get("/transactions/summary")
def transaction_summary(location_id: Optional[str] = None, date: Optional[str] = None):
    q = {}
    if location_id:
        q["location_id"] = location_id
    if date:
        q["date"] = date
    else:
        q["date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    txs = list(transactions_col.find(q, {"_id": 0}))
    total_revenue = sum(t.get("total", 0) for t in txs)
    by_method = {}
    for t in txs:
        pm = t.get("payment_method", "unknown")
        by_method[pm] = by_method.get(pm, 0) + 1

    return {
        "date": q.get("date"),
        "location_id": location_id,
        "total_transactions": len(txs),
        "total_revenue": round(total_revenue, 2),
        "by_payment_method": by_method,
        "avg_ticket": round(total_revenue / max(len(txs), 1), 2),
    }


# ═══════════════════════════════════════════════════════════════
# WASTE TRACKING
# ═══════════════════════════════════════════════════════════════

class WasteLogCreate(BaseModel):
    location_id: str
    item_name: str
    quantity_lbs: float
    reason: str = "overproduction"  # overproduction, expired, damaged, plate_waste
    period_id: str = ""

@router.post("/waste")
def log_waste(data: WasteLogCreate):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = {
        "waste_id": f"cw-{_uid()}",
        **data.dict(),
        "date": today,
        "created_at": _now(),
    }
    waste_col.insert_one(entry)
    del entry["_id"]
    return entry

@router.get("/waste/summary")
def waste_summary(location_id: Optional[str] = None):
    q = {}
    if location_id:
        q["location_id"] = location_id
    logs = list(waste_col.find(q, {"_id": 0}))
    total_lbs = sum(w.get("quantity_lbs", 0) for w in logs)
    by_reason = {}
    for w in logs:
        r = w.get("reason", "other")
        by_reason[r] = by_reason.get(r, 0) + w.get("quantity_lbs", 0)

    return {
        "total_waste_lbs": round(total_lbs, 2),
        "total_entries": len(logs),
        "by_reason": {k: round(v, 2) for k, v in by_reason.items()},
        "avg_per_entry": round(total_lbs / max(len(logs), 1), 2),
    }


# ═══════════════════════════════════════════════════════════════
# MODE-SPECIFIC KPI ENGINE
# ═══════════════════════════════════════════════════════════════

@router.get("/kpis/{location_id}")
def location_kpis(location_id: str):
    loc = locations_col.find_one({"location_id": location_id}, {"_id": 0})
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    kb = _load_kb()
    mode_info = next((m for m in kb.get("operating_modes", []) if m.get("mode_id") == loc.get("mode_id")), {})

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_txs = list(transactions_col.find({"location_id": location_id, "date": today}, {"_id": 0}))
    today_waste = list(waste_col.find({"location_id": location_id, "date": today}, {"_id": 0}))

    meals_served = len(today_txs)
    revenue = sum(t.get("total", 0) for t in today_txs)
    waste_lbs = sum(w.get("quantity_lbs", 0) for w in today_waste)
    subsidy_meals = sum(1 for t in today_txs if t.get("payment_method") == "subsidy")
    capacity = loc.get("seat_capacity", 100)

    kpis = {
        "location": loc.get("name"),
        "mode": loc.get("mode_name"),
        "date": today,
        "meals_served": meals_served,
        "revenue": round(revenue, 2),
        "cost_per_meal": round(revenue / max(meals_served, 1), 2),
        "waste_lbs": round(waste_lbs, 2),
        "waste_per_meal": round(waste_lbs / max(meals_served, 1), 4),
        "participation_rate": round(meals_served / max(capacity, 1), 3),
        "subsidy_rate": round(subsidy_meals / max(meals_served, 1), 3),
        "seat_utilization": round(meals_served / max(capacity, 1), 3),
        "mode_objectives": mode_info.get("primary_objectives", []),
        "mode_metrics": mode_info.get("success_metrics", []),
    }
    return kpis
