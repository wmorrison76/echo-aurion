"""
Kitchen Routing & Printers — Property-Level Configuration
============================================================
Extracted from Culinary/Pastry dish-assembly into a standalone
settings module. Each outlet has its own routing config, but
printers and stations are shared property-wide.
"""
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import db

router = APIRouter(prefix="/api/kitchen-routing", tags=["kitchen-routing"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]


class StationInput(BaseModel):
    name: str
    description: str = ""
    outlet_id: str = "default"
    default_printers: List[str] = []
    color: str = "#3b82f6"
    active: bool = True

class PrinterInput(BaseModel):
    name: str
    technology: str = "thermal"  # thermal, impact, laser
    location: str = ""
    ip_address: str = ""
    recommended_use: str = ""
    description: str = ""
    active: bool = True

class OutletRoutingInput(BaseModel):
    outlet_id: str
    outlet_name: str
    stations: List[str] = []
    printers: List[str] = []


def seed_routing():
    if db["kitchen_stations"].count_documents({}) > 0:
        return
    stations = [
        {"name": "Grill Station", "description": "Steaks, burgers, grilled proteins", "color": "#ef4444", "default_printers": ["ptr-01"]},
        {"name": "Sauté Station", "description": "Pan sauces, vegetables, pasta", "color": "#f59e0b", "default_printers": ["ptr-01"]},
        {"name": "Garde Manger", "description": "Cold apps, salads, charcuterie", "color": "#06b6d4", "default_printers": ["ptr-02"]},
        {"name": "Pastry Station", "description": "Desserts, bread, baked goods", "color": "#8b5cf6", "default_printers": ["ptr-02"]},
        {"name": "Fry Station", "description": "Deep-fried items, tempura", "color": "#f97316", "default_printers": ["ptr-01"]},
        {"name": "Expo Window", "description": "Final plating and quality check", "color": "#10b981", "default_printers": ["ptr-03"]},
        {"name": "Pizza Oven", "description": "Wood-fired pizza, flatbreads", "color": "#dc2626", "default_printers": ["ptr-01"]},
        {"name": "Banquet Prep", "description": "Large-batch prep for events", "color": "#7c3aed", "default_printers": ["ptr-03"]},
    ]
    for s in stations:
        db["kitchen_stations"].insert_one({"id": f"stn-{_uid()}", **s, "outlet_id": "default", "active": True, "created_at": _now()})

    printers = [
        {"id": "ptr-01", "name": "KDS-Hot Line", "technology": "thermal", "location": "Hot Line", "ip_address": "192.168.1.101", "recommended_use": "Hot station chit printing", "description": "Epson TM-T88VI thermal printer"},
        {"id": "ptr-02", "name": "KDS-Cold/Pastry", "technology": "thermal", "location": "Cold Side", "ip_address": "192.168.1.102", "recommended_use": "Cold apps and pastry chits", "description": "Epson TM-T88VI thermal printer"},
        {"id": "ptr-03", "name": "KDS-Expo", "technology": "impact", "location": "Expo Window", "ip_address": "192.168.1.103", "recommended_use": "Expo verification tickets", "description": "Star SP700 impact printer"},
        {"id": "ptr-04", "name": "Label Printer", "technology": "thermal", "location": "Prep Area", "ip_address": "192.168.1.104", "recommended_use": "Prep labels, date codes", "description": "Brother QL-820NWB label printer"},
        {"id": "ptr-05", "name": "Bar Printer", "technology": "thermal", "location": "Bar", "ip_address": "192.168.1.105", "recommended_use": "Bar drink tickets", "description": "Epson TM-T20III"},
    ]
    for p in printers:
        db["kitchen_printers"].insert_one({**p, "active": True, "created_at": _now()})

    # Default outlet routing
    db["outlet_routing"].insert_one({
        "id": f"rt-{_uid()}", "outlet_id": "default", "outlet_name": "Main Kitchen",
        "stations": [s["id"] for s in db["kitchen_stations"].find({}, {"_id": 0, "id": 1})],
        "printers": [p["id"] for p in printers],
        "created_at": _now(),
    })


# ── Stations ──
@router.get("/stations")
async def list_stations(outlet_id: Optional[str] = None):
    seed_routing()
    q = {"active": True}
    if outlet_id:
        q["outlet_id"] = outlet_id
    return {"stations": list(db["kitchen_stations"].find(q, {"_id": 0}).sort("name", 1))}

@router.post("/stations")
async def create_station(data: StationInput):
    station = {"id": f"stn-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["kitchen_stations"].insert_one(station)
    station.pop("_id", None)
    return station

@router.put("/stations/{station_id}")
async def update_station(station_id: str, data: StationInput):
    db["kitchen_stations"].update_one({"id": station_id}, {"$set": {**data.model_dump(), "updated_at": _now()}})
    return {"updated": station_id}

@router.delete("/stations/{station_id}")
async def delete_station(station_id: str):
    db["kitchen_stations"].update_one({"id": station_id}, {"$set": {"active": False}})
    return {"deleted": station_id}


# ── Printers ──
@router.get("/printers")
async def list_printers():
    seed_routing()
    return {"printers": list(db["kitchen_printers"].find({"active": True}, {"_id": 0}).sort("name", 1))}

@router.post("/printers")
async def create_printer(data: PrinterInput):
    printer = {"id": f"ptr-{_uid()}", **data.model_dump(), "created_at": _now()}
    db["kitchen_printers"].insert_one(printer)
    printer.pop("_id", None)
    return printer

@router.put("/printers/{printer_id}")
async def update_printer(printer_id: str, data: PrinterInput):
    db["kitchen_printers"].update_one({"id": printer_id}, {"$set": {**data.model_dump(), "updated_at": _now()}})
    return {"updated": printer_id}

@router.delete("/printers/{printer_id}")
async def delete_printer(printer_id: str):
    db["kitchen_printers"].update_one({"id": printer_id}, {"$set": {"active": False}})
    return {"deleted": printer_id}


# ── Outlet Routing ──
@router.get("/outlets")
async def list_outlet_routing():
    seed_routing()
    routes = list(db["outlet_routing"].find({}, {"_id": 0}))
    return {"outlets": routes}

@router.get("/outlets/{outlet_id}")
async def get_outlet_routing(outlet_id: str):
    seed_routing()
    route = db["outlet_routing"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not route:
        return {"outlet_id": outlet_id, "stations": [], "printers": []}
    stations = list(db["kitchen_stations"].find({"id": {"$in": route.get("stations", [])}}, {"_id": 0}))
    printers = list(db["kitchen_printers"].find({"id": {"$in": route.get("printers", [])}}, {"_id": 0}))
    return {**route, "station_details": stations, "printer_details": printers}

@router.put("/outlets/{outlet_id}")
async def update_outlet_routing(outlet_id: str, data: OutletRoutingInput):
    db["outlet_routing"].update_one(
        {"outlet_id": outlet_id},
        {"$set": {**data.model_dump(), "updated_at": _now()}},
        upsert=True,
    )
    return {"updated": outlet_id}


# ── Dashboard ──
@router.get("/dashboard")
async def routing_dashboard():
    seed_routing()
    stations = list(db["kitchen_stations"].find({"active": True}, {"_id": 0}))
    printers = list(db["kitchen_printers"].find({"active": True}, {"_id": 0}))
    outlets = list(db["outlet_routing"].find({}, {"_id": 0}))
    return {
        "kpis": {
            "total_stations": len(stations), "total_printers": len(printers),
            "total_outlets": len(outlets),
            "online_printers": len([p for p in printers if p.get("active")]),
        },
        "stations": stations, "printers": printers, "outlets": outlets,
    }
