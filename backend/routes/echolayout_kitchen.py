"""
EchoLayout · Kitchen Designer (D5)
==================================
Pure Python port of the D5 kitchen-design algorithm
(`server/services/echo-layout/kitchen-algorithm.ts`).

Endpoints
---------
GET  /api/echolayout/kitchen/equipment-library
     Returns the seeded equipment catalog. Optional filters:
       ?category=cooking&station=hot_line

POST /api/echolayout/kitchen/design
     Run the deterministic kitchen-design algorithm and return
     placement + thermal zones + utility runs + compliance findings.
     No persistence — caller decides whether to save.

POST /api/echolayout/kitchen/designs
     Persist a kitchen design into the `layout_designs` Mongo collection
     with design_type='kitchen' (mirrors the existing event-room schema).

GET  /api/echolayout/kitchen/designs/{design_id}
     Read a saved kitchen design.

Persistence
-----------
Catalog → `kitchen_equipment_catalog` collection (Mongo).
Designs  → `layout_designs` collection (Mongo), reused from event layouts.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

import database

router = APIRouter(prefix="/api/echolayout/kitchen", tags=["echolayout-kitchen"])

catalog_col = database.db["kitchen_equipment_catalog"]
designs_col = database.db["layout_designs"]


# ────────────────────────────── Models ──────────────────────────────

ThermalClass = Literal["hot", "warm", "neutral", "cool", "cold"]
KitchenWorkflow = Literal[
    "line_kitchen", "banquet_prep", "pastry_bakery", "bar_only", "ghost_kitchen"
]


class KitchenEquipment(BaseModel):
    id: Optional[str] = None
    slug: str
    name: str
    category: str
    station: Optional[str] = None
    width_ft: float
    depth_ft: float
    height_ft: Optional[float] = 0.0
    weight_lb: Optional[float] = 0.0
    needs_gas: bool = False
    gas_btu: Optional[float] = 0.0
    needs_water_supply: bool = False
    needs_water_drain: bool = False
    needs_electric: bool = False
    voltage: Optional[int] = 120
    amperage: Optional[int] = 0
    phase: Optional[int] = 1
    needs_hood: bool = False
    thermal_output_btu: float = 0.0
    thermal_class: ThermalClass = "neutral"
    min_clearance_back_in: float = 6.0
    min_clearance_sides_in: float = 6.0
    min_clearance_front_in: float = 36.0
    list_price_usd: Optional[float] = 0.0
    notes: Optional[str] = None


class KitchenRoomSpec(BaseModel):
    width: float = Field(..., description="long axis, ft")
    length: float = Field(..., description="short axis, ft")
    units: Literal["ft", "m"] = "ft"
    ceiling_height_ft: Optional[float] = 10.0
    has_gas_main: bool = True
    has_grease_trap: bool = True


class KitchenConstraints(BaseModel):
    require_walk_in: bool = False
    require_three_comp_sink: bool = True
    expected_volume_covers_per_day: Optional[int] = None


class KitchenDesignInput(BaseModel):
    workflow: KitchenWorkflow
    room: KitchenRoomSpec
    equipment: list[KitchenEquipment]
    constraints: Optional[KitchenConstraints] = None


# ────────────────────────── Algorithm (port) ──────────────────────────

def _r2(n: float) -> float:
    return round(n * 100) / 100


def _ft(inches: float) -> float:
    return inches / 12.0


STATION_ORDER: dict[str, list[str]] = {
    "line_kitchen":  ["walk_in", "cold_prep", "hot_line", "expo", "dish_pit", "dry_storage"],
    "banquet_prep":  ["walk_in", "cold_prep", "hot_line", "pastry", "expo", "dish_pit", "dry_storage"],
    "pastry_bakery": ["walk_in", "cold_prep", "pastry", "expo", "dish_pit", "dry_storage"],
    "bar_only":      ["bar", "dish_pit", "walk_in", "dry_storage"],
    "ghost_kitchen": ["walk_in", "cold_prep", "hot_line", "dish_pit"],
}


def _build_station_grid(workflow: str, room: KitchenRoomSpec):
    stations = STATION_ORDER[workflow]
    aisle_y = _r2(room.length / 2 - 2)
    aisle_height = 4

    front_strip = {"y0": 0.0, "y1": aisle_y}
    back_strip = {"y0": aisle_y + aisle_height, "y1": room.length}

    front_width = room.width
    back_width = room.width

    bounds: dict[str, dict[str, float]] = {}

    if "hot_line" in stations and "expo" in stations:
        bounds["hot_line"] = {"x0": 0, "y0": front_strip["y0"], "x1": front_width * 0.65, "y1": front_strip["y1"]}
        bounds["expo"] = {"x0": front_width * 0.65, "y0": front_strip["y0"], "x1": front_width, "y1": front_strip["y1"]}
    elif "hot_line" in stations:
        bounds["hot_line"] = {"x0": 0, "y0": front_strip["y0"], "x1": front_width, "y1": front_strip["y1"]}
    elif "bar" in stations:
        bounds["bar"] = {"x0": 0, "y0": front_strip["y0"], "x1": front_width, "y1": front_strip["y1"]}

    if "pastry" in stations and "pastry" not in bounds:
        bounds["pastry"] = {"x0": front_width * 0.35, "y0": front_strip["y0"], "x1": front_width * 0.65, "y1": front_strip["y1"]}

    back_stations = [s for s in ["walk_in", "cold_prep", "dish_pit", "dry_storage"] if s in stations]
    slice_width = back_width / max(1, len(back_stations))
    cursor = 0.0
    for s in back_stations:
        bounds[s] = {"x0": cursor, "y0": back_strip["y0"], "x1": cursor + slice_width, "y1": back_strip["y1"]}
        cursor += slice_width

    return bounds


def _pack_station(station_name: str, bounds: dict, equipment: list[KitchenEquipment]) -> list[dict]:
    # Tallest/heaviest first for visual balance.
    sorted_eq = sorted(
        equipment,
        key=lambda e: ((e.height_ft or 0), (e.weight_lb or 0)),
        reverse=True,
    )
    placed: list[dict] = []
    cursor = bounds["x0"] + 0.5  # 6" wall clearance
    y_pos = bounds["y0"] + 0.5
    for eq in sorted_eq:
        if cursor + eq.width_ft > bounds["x1"] - 0.5:
            continue  # out of room — caller may surface a warning
        placed.append({
            "equipmentId": eq.id or eq.slug,
            "slug": eq.slug,
            "name": eq.name,
            "station": station_name,
            "position": {"x": _r2(cursor), "y": _r2(y_pos)},
            "rotation": 0,
            "dimensions": {"width": eq.width_ft, "depth": eq.depth_ft},
            "thermal_class": eq.thermal_class,
            "thermal_output_btu": eq.thermal_output_btu,
        })
        cursor = _r2(cursor + eq.width_ft + _ft(eq.min_clearance_sides_in))
    return placed


def _build_thermal_zones(placed: list[dict]) -> list[dict]:
    by_class: dict[str, list[dict]] = {"hot": [], "warm": [], "neutral": [], "cool": [], "cold": []}
    for p in placed:
        by_class[p["thermal_class"]].append(p)

    zones: list[dict] = []
    for class_label, items in by_class.items():
        if not items or class_label == "neutral":
            continue
        xs = [v for p in items for v in (p["position"]["x"], p["position"]["x"] + p["dimensions"]["width"])]
        ys = [v for p in items for v in (p["position"]["y"], p["position"]["y"] + p["dimensions"]["depth"])]
        zones.append({
            "classLabel": class_label,
            "bounds": {"x0": min(xs), "y0": min(ys), "x1": max(xs), "y1": max(ys)},
            "total_btu": sum(abs(p["thermal_output_btu"]) for p in items),
        })
    return zones


def _build_utility_runs(placed: list[dict], by_slug: dict[str, KitchenEquipment], room: KitchenRoomSpec) -> list[dict]:
    gas_source = {"x": 0, "y": 0}
    water_source = {"x": room.width, "y": room.length}
    electric_source = {"x": 0, "y": 0}

    runs: list[dict] = []
    for p in placed:
        eq = by_slug.get(p["slug"])
        if not eq:
            continue
        center = {
            "x": p["position"]["x"] + p["dimensions"]["width"] / 2,
            "y": p["position"]["y"] + p["dimensions"]["depth"] / 2,
        }
        if eq.needs_gas:
            length = _r2(abs(center["x"] - gas_source["x"]) + abs(center["y"] - gas_source["y"]))
            runs.append({
                "utility": "gas", "from": gas_source, "to": center,
                "length_ft": length,
                "notes": f"{int(eq.gas_btu or 0):,} BTU/hr",
            })
        if eq.needs_water_supply:
            length = _r2(abs(center["x"] - water_source["x"]) + abs(center["y"] - water_source["y"]))
            runs.append({"utility": "water_supply", "from": water_source, "to": center, "length_ft": length})
        if eq.needs_water_drain:
            length = _r2(abs(center["x"] - water_source["x"]) + abs(center["y"] - water_source["y"]))
            runs.append({"utility": "water_drain", "from": water_source, "to": center, "length_ft": length})
        if eq.needs_electric:
            length = _r2(abs(center["x"] - electric_source["x"]) + abs(center["y"] - electric_source["y"]))
            is_high = (eq.voltage or 120) >= 208
            runs.append({
                "utility": "electric_high_volt" if is_high else "electric_low_volt",
                "from": electric_source, "to": center, "length_ft": length,
                "notes": f"{eq.voltage or 120}V {eq.amperage or 0}A {eq.phase or 1}-phase",
            })
    return runs


def _check_compliance(placed: list[dict], by_slug: dict[str, KitchenEquipment], inp: KitchenDesignInput) -> list[dict]:
    findings: list[dict] = []

    hot_line_eq = [p for p in placed if p["station"] == "hot_line" and p["thermal_class"] == "hot"]
    hand_sinks = [p for p in placed if p["slug"].startswith("hand_sink")]
    if hot_line_eq and not hand_sinks:
        findings.append({
            "rule": "NSF Hand Sink Coverage",
            "severity": "violation",
            "message": (
                f"Hot line has {len(hot_line_eq)} cooking units but no hand sink within 25ft. "
                "NSF requires at least one wall-mount hand sink per 25ft of hot line."
            ),
        })

    cons = inp.constraints
    if not cons or cons.require_three_comp_sink:
        has_3c = any(p["slug"] == "three_comp_sink" for p in placed)
        has_dish = any(p["slug"].startswith("dishwasher") for p in placed)
        if not has_3c and not has_dish:
            findings.append({
                "rule": "Health Code · 3-Compartment Sink",
                "severity": "violation",
                "message": "No 3-compartment sink or commercial dishwasher present. One is required by health code for any food-service kitchen.",
            })

    if cons and cons.require_walk_in and not any(p["slug"].startswith("walkin_cooler") for p in placed):
        findings.append({
            "rule": "Refrigeration · Walk-In",
            "severity": "warning",
            "message": "Workflow expects walk-in cooler (banquet/large-volume) but none placed. Reach-in capacity may be insufficient.",
        })

    needs_hood_list = [p for p in placed if (by_slug.get(p["slug"]) and by_slug[p["slug"]].needs_hood)]
    if needs_hood_list:
        findings.append({
            "rule": "Mechanical Code · Hood",
            "severity": "info",
            "message": (
                f'{len(needs_hood_list)} unit(s) require a Type-I commercial hood. '
                'Hood length must extend 6" past each end of the cooking line.'
            ),
            "affects": [p["equipmentId"] for p in needs_hood_list],
        })

    if inp.room.width < 8:
        findings.append({
            "rule": "ADA · Primary Aisle Width",
            "severity": "violation",
            "message": (
                f'Room width {inp.room.width}ft is below 8ft; primary aisle cannot meet '
                '42" ADA minimum without obstructing stations.'
            ),
        })

    for p in placed:
        eq = by_slug.get(p["slug"])
        if not eq:
            continue
        back_wall = inp.room.length
        back_clearance = _r2(back_wall - (p["position"]["y"] + p["dimensions"]["depth"]))
        if back_clearance < _ft(eq.min_clearance_back_in):
            findings.append({
                "rule": f"Clearance · {eq.name}",
                "severity": "warning",
                "message": (
                    f'{eq.name} has {_r2(back_clearance * 12)}" back clearance; '
                    f'minimum is {eq.min_clearance_back_in}".'
                ),
                "affects": [p["equipmentId"]],
            })
        if p["position"]["x"] < _ft(eq.min_clearance_sides_in):
            findings.append({
                "rule": f"Clearance · {eq.name}",
                "severity": "warning",
                "message": (
                    f'{eq.name} too close to left wall ({_r2(p["position"]["x"] * 12)}"); '
                    f'minimum is {eq.min_clearance_sides_in}".'
                ),
                "affects": [p["equipmentId"]],
            })

    total_gas_btu = sum((by_slug[p["slug"]].gas_btu or 0)
                       for p in placed
                       if by_slug.get(p["slug"]) and by_slug[p["slug"]].needs_gas)
    if total_gas_btu > 500_000 and not inp.room.has_gas_main:
        findings.append({
            "rule": "Gas Service · Capacity",
            "severity": "warning",
            "message": (
                f"Total gas demand {int(total_gas_btu):,} BTU/hr — confirm meter sizing with utility "
                "provider; standard residential service caps around 500K."
            ),
        })

    return findings


def _design_kitchen(inp: KitchenDesignInput) -> dict:
    by_slug = {e.slug: e for e in inp.equipment}
    bounds = _build_station_grid(inp.workflow, inp.room)

    by_station: dict[str, list[KitchenEquipment]] = {}
    for eq in inp.equipment:
        station = eq.station or "dry_storage"
        by_station.setdefault(station, []).append(eq)

    placements: list[dict] = []
    for station, b in bounds.items():
        placements.extend(_pack_station(station, b, by_station.get(station, [])))

    thermal_zones = _build_thermal_zones(placements)
    utility_runs = _build_utility_runs(placements, by_slug, inp.room)
    compliance = _check_compliance(placements, by_slug, inp)

    total_thermal_btu = sum(abs(p["thermal_output_btu"]) for p in placements)
    total_cost = sum((e.list_price_usd or 0) for e in inp.equipment)
    floor_used = sum(p["dimensions"]["width"] * p["dimensions"]["depth"] for p in placements)
    total_room = inp.room.width * inp.room.length
    requires_hood = sum(1 for p in placements
                        if by_slug.get(p["slug"]) and by_slug[p["slug"]].needs_hood)

    return {
        "workflow": inp.workflow,
        "room": inp.room.model_dump(),
        "placements": placements,
        "thermal_zones": thermal_zones,
        "utility_runs": utility_runs,
        "compliance": compliance,
        "totals": {
            "equipment_count": len(placements),
            "total_thermal_btu": total_thermal_btu,
            "total_estimated_cost_usd": _r2(total_cost),
            "floor_area_used_pct": _r2((floor_used / total_room) * 100) if total_room else 0,
            "requires_hood_count": requires_hood,
        },
    }


# ────────────────────────── Endpoints ──────────────────────────

@router.get("/equipment-library")
async def equipment_library(
    category: Optional[str] = Query(None),
    station: Optional[str] = Query(None),
):
    """Return the seeded kitchen equipment catalog with optional filters."""
    query: dict = {}
    if category:
        query["category"] = category
    if station:
        query["station"] = station
    items = list(catalog_col.find(query, {"_id": 0}).sort("category", 1))
    return {"success": True, "items": items, "count": len(items)}


class DesignSaveRequest(BaseModel):
    name: Optional[str] = None
    beoId: Optional[str] = None
    outletId: str
    orgId: Optional[str] = None
    lifecycleEventId: Optional[str] = None
    generatedBy: Optional[str] = None
    workflow: KitchenWorkflow
    room: KitchenRoomSpec
    equipment: list[dict] = []
    placements: list[dict] = []
    thermal_zones: list[dict] = []
    utility_runs: list[dict] = []
    compliance: list[dict] = []
    totals: dict = {}


@router.post("/design")
async def run_design(inp: KitchenDesignInput):
    """Run the deterministic kitchen-design algorithm (no persistence)."""
    if not inp.equipment:
        raise HTTPException(status_code=400, detail="equipment[] must be non-empty")
    return {"success": True, "design": _design_kitchen(inp)}


@router.post("/designs")
async def save_design(data: DesignSaveRequest):
    """Persist a kitchen design (mirrors event-room layout_designs schema)."""
    if not data.outletId:
        raise HTTPException(status_code=400, detail="outletId required")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "org_id": data.orgId,
        "beo_id": data.beoId,
        "outlet_id": data.outletId,
        "lifecycle_event_id": data.lifecycleEventId,
        "room_id": None,
        "style": "custom",
        "design_type": "kitchen",
        "status": "pending_approval",
        "guest_count": 0,
        "room_spec": data.room.model_dump(),
        "constraints": {},
        "tables": [],
        "fixtures": [],
        "aisles": [],
        "equipment": data.placements or data.equipment,
        "utility_zones": data.utility_runs,
        "thermal_zones": data.thermal_zones,
        "compliance": {
            "findings": data.compliance,
            "totals": data.totals,
            "workflow": data.workflow,
        },
        "totals": data.totals,
        "generated_by": data.generatedBy or "manual",
        "notes": data.name,
        "created_at": now,
        "updated_at": now,
    }
    designs_col.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "designId": doc["id"], "design": doc}


@router.get("/designs/{design_id}")
async def read_design(design_id: str):
    """Return a saved kitchen design."""
    doc = designs_col.find_one({"id": design_id, "design_type": "kitchen"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Design not found")
    return {"success": True, "design": doc}


# ────────────────────── Mongo Seeder (catalog) ──────────────────────

KITCHEN_CATALOG_SEED: list[dict] = [
    # Hot line
    {"slug": "range_6_burner", "name": "6-Burner Range with Oven", "category": "cooking", "station": "hot_line",
     "width_ft": 3.0, "depth_ft": 2.5, "height_ft": 4.5, "weight_lb": 525,
     "needs_gas": True, "gas_btu": 180000, "needs_water_supply": False, "needs_water_drain": False,
     "needs_electric": False, "needs_hood": True, "thermal_output_btu": 180000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 6500.00, "notes": "Standard hot line workhorse"},
    {"slug": "range_10_burner", "name": "10-Burner Range with 2 Ovens", "category": "cooking", "station": "hot_line",
     "width_ft": 5.0, "depth_ft": 2.5, "height_ft": 4.5, "weight_lb": 875,
     "needs_gas": True, "gas_btu": 300000, "needs_hood": True, "thermal_output_btu": 300000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 12500.00, "notes": "Heavy-line workhorse"},
    {"slug": "flat_top_griddle_36", "name": '36" Flat-Top Griddle', "category": "cooking", "station": "hot_line",
     "width_ft": 3.0, "depth_ft": 2.5, "height_ft": 1.5, "weight_lb": 350,
     "needs_gas": True, "gas_btu": 95000, "needs_hood": True, "thermal_output_btu": 95000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 3800.00, "notes": "Brunch / breakfast service"},
    {"slug": "charbroiler_36", "name": '36" Char-Broiler', "category": "cooking", "station": "hot_line",
     "width_ft": 3.0, "depth_ft": 2.5, "height_ft": 1.5, "weight_lb": 320,
     "needs_gas": True, "gas_btu": 120000, "needs_hood": True, "thermal_output_btu": 120000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 4200.00, "notes": "Marks + flavor for proteins"},
    {"slug": "salamander_36", "name": '36" Salamander Broiler', "category": "cooking", "station": "hot_line",
     "width_ft": 3.0, "depth_ft": 1.2, "height_ft": 2.0, "weight_lb": 220,
     "needs_gas": True, "gas_btu": 36000, "needs_hood": True, "thermal_output_btu": 36000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 24,
     "list_price_usd": 2900.00, "notes": "Wall/range-mount; finishing"},
    {"slug": "combi_oven_full", "name": "Full-Size Combi Oven", "category": "cooking", "station": "hot_line",
     "width_ft": 3.2, "depth_ft": 3.4, "height_ft": 6.0, "weight_lb": 720,
     "needs_water_supply": True, "needs_water_drain": True,
     "needs_electric": True, "voltage": 208, "amperage": 60, "phase": 3,
     "needs_hood": True, "thermal_output_btu": 80000, "thermal_class": "warm",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 18000.00, "notes": "Steam + convection; multi-tray"},
    {"slug": "convection_oven_full", "name": "Full-Size Convection Oven", "category": "cooking", "station": "hot_line",
     "width_ft": 3.2, "depth_ft": 3.3, "height_ft": 5.5, "weight_lb": 480,
     "needs_gas": True, "gas_btu": 65000,
     "needs_electric": True, "voltage": 120, "amperage": 10, "phase": 1,
     "needs_hood": True, "thermal_output_btu": 65000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 5500.00, "notes": "Even baking; dry heat"},
    {"slug": "fryer_double_basket", "name": "Double-Basket Fryer", "category": "cooking", "station": "hot_line",
     "width_ft": 1.3, "depth_ft": 2.5, "height_ft": 3.5, "weight_lb": 220,
     "needs_gas": True, "gas_btu": 120000, "needs_hood": True,
     "thermal_output_btu": 120000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 3200.00, "notes": "40 lb oil cap; pair with filter"},
    {"slug": "steam_kettle_40g", "name": "40-Gallon Steam Kettle", "category": "cooking", "station": "hot_line",
     "width_ft": 2.5, "depth_ft": 2.5, "height_ft": 3.5, "weight_lb": 380,
     "needs_water_supply": True, "needs_water_drain": True,
     "needs_electric": True, "voltage": 208, "amperage": 20, "phase": 3,
     "thermal_output_btu": 60000, "thermal_class": "warm",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 7900.00, "notes": "Stocks, sauces, soups"},
    {"slug": "tilting_skillet", "name": "30-Gallon Tilting Skillet", "category": "cooking", "station": "hot_line",
     "width_ft": 4.0, "depth_ft": 3.0, "height_ft": 3.0, "weight_lb": 460,
     "needs_gas": True, "gas_btu": 80000,
     "needs_water_supply": True, "needs_water_drain": True,
     "needs_electric": True, "voltage": 120, "amperage": 10, "phase": 1,
     "needs_hood": True, "thermal_output_btu": 80000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 48,
     "list_price_usd": 11000.00, "notes": "Banquet braising / sauteing"},
    # Refrigeration
    {"slug": "walkin_cooler_8x12", "name": "8x12 Walk-In Cooler", "category": "refrigeration", "station": "walk_in",
     "width_ft": 8.0, "depth_ft": 12.0, "height_ft": 8.0, "weight_lb": 1800,
     "needs_electric": True, "voltage": 208, "amperage": 20, "phase": 1,
     "thermal_output_btu": -10000, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 18000.00, "notes": "Standard restaurant walk-in"},
    {"slug": "walkin_freezer_6x10", "name": "6x10 Walk-In Freezer", "category": "refrigeration", "station": "walk_in",
     "width_ft": 6.0, "depth_ft": 10.0, "height_ft": 8.0, "weight_lb": 1500,
     "needs_electric": True, "voltage": 208, "amperage": 30, "phase": 1,
     "thermal_output_btu": -25000, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 19500.00, "notes": "Frozen storage"},
    {"slug": "reach_in_cooler_2dr", "name": "2-Door Reach-In Cooler", "category": "refrigeration", "station": "cold_prep",
     "width_ft": 4.2, "depth_ft": 2.7, "height_ft": 6.5, "weight_lb": 480,
     "needs_electric": True, "voltage": 120, "amperage": 8, "phase": 1,
     "thermal_output_btu": -2500, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 3800.00, "notes": "Line cooler"},
    {"slug": "undercounter_cooler", "name": "Undercounter Refrigerator", "category": "refrigeration", "station": "cold_prep",
     "width_ft": 4.0, "depth_ft": 2.5, "height_ft": 2.8, "weight_lb": 240,
     "needs_electric": True, "voltage": 120, "amperage": 6, "phase": 1,
     "thermal_output_btu": -1500, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 24,
     "list_price_usd": 2200.00, "notes": "Sandwich/pizza prep base"},
    {"slug": "blast_chiller", "name": "Blast Chiller / Freezer", "category": "refrigeration", "station": "cold_prep",
     "width_ft": 2.8, "depth_ft": 3.2, "height_ft": 5.5, "weight_lb": 420,
     "needs_electric": True, "voltage": 208, "amperage": 20, "phase": 3,
     "thermal_output_btu": -8000, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 14000.00, "notes": "HACCP rapid cool-down"},
    # Prep
    {"slug": "prep_table_6ft", "name": "6ft Stainless Prep Table", "category": "prep", "station": "cold_prep",
     "width_ft": 6.0, "depth_ft": 2.5, "height_ft": 3.0, "weight_lb": 200,
     "thermal_output_btu": 0, "thermal_class": "neutral",
     "min_clearance_back_in": 0, "min_clearance_sides_in": 6, "min_clearance_front_in": 30,
     "list_price_usd": 850.00, "notes": "NSF-listed; 16 ga top"},
    {"slug": "prep_table_with_sink", "name": "Prep Table with 1-Comp Sink", "category": "prep", "station": "cold_prep",
     "width_ft": 6.0, "depth_ft": 2.5, "height_ft": 3.0, "weight_lb": 280,
     "needs_water_supply": True, "needs_water_drain": True,
     "thermal_output_btu": 0, "thermal_class": "neutral",
     "min_clearance_back_in": 0, "min_clearance_sides_in": 6, "min_clearance_front_in": 30,
     "list_price_usd": 1400.00, "notes": "For protein prep"},
    {"slug": "hand_sink", "name": "Wall-Mount Hand Sink", "category": "prep", "station": "hot_line",
     "width_ft": 1.2, "depth_ft": 1.2, "height_ft": 2.5, "weight_lb": 45,
     "needs_water_supply": True, "needs_water_drain": True,
     "thermal_output_btu": 0, "thermal_class": "neutral",
     "min_clearance_back_in": 0, "min_clearance_sides_in": 0, "min_clearance_front_in": 24,
     "list_price_usd": 320.00, "notes": "Required every 25ft of hot line"},
    {"slug": "mixer_60qt", "name": "60-Quart Floor Mixer", "category": "prep", "station": "pastry",
     "width_ft": 2.5, "depth_ft": 3.0, "height_ft": 4.5, "weight_lb": 980,
     "needs_electric": True, "voltage": 208, "amperage": 30, "phase": 3,
     "thermal_output_btu": 1000, "thermal_class": "warm",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 12, "min_clearance_front_in": 36,
     "list_price_usd": 9500.00, "notes": "Pastry / bakery workhorse"},
    {"slug": "food_processor_robot", "name": "Food Processor (Robot Coupe)", "category": "prep", "station": "cold_prep",
     "width_ft": 1.2, "depth_ft": 1.2, "height_ft": 2.0, "weight_lb": 80,
     "needs_electric": True, "voltage": 120, "amperage": 6, "phase": 1,
     "thermal_output_btu": 200, "thermal_class": "warm",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 24,
     "list_price_usd": 1200.00, "notes": "Vegetables, doughs, purees"},
    # Dish
    {"slug": "dishwasher_conveyor", "name": "Conveyor Dishwasher", "category": "dish", "station": "dish_pit",
     "width_ft": 6.5, "depth_ft": 2.8, "height_ft": 6.0, "weight_lb": 850,
     "needs_water_supply": True, "needs_water_drain": True,
     "needs_electric": True, "voltage": 208, "amperage": 60, "phase": 3,
     "needs_hood": True, "thermal_output_btu": 3000, "thermal_class": "warm",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 48,
     "list_price_usd": 21000.00, "notes": "200+ rack/hr"},
    {"slug": "dishwasher_undercounter", "name": "Undercounter Dishwasher", "category": "dish", "station": "dish_pit",
     "width_ft": 2.2, "depth_ft": 2.5, "height_ft": 2.8, "weight_lb": 220,
     "needs_water_supply": True, "needs_water_drain": True,
     "needs_electric": True, "voltage": 208, "amperage": 20, "phase": 1,
     "thermal_output_btu": 1500, "thermal_class": "warm",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 24,
     "list_price_usd": 3500.00, "notes": "Bar / small kitchen"},
    {"slug": "three_comp_sink", "name": "3-Compartment Sink", "category": "dish", "station": "dish_pit",
     "width_ft": 8.0, "depth_ft": 2.5, "height_ft": 3.0, "weight_lb": 320,
     "needs_water_supply": True, "needs_water_drain": True,
     "thermal_output_btu": 0, "thermal_class": "neutral",
     "min_clearance_back_in": 0, "min_clearance_sides_in": 6, "min_clearance_front_in": 36,
     "list_price_usd": 1900.00, "notes": "Wash / rinse / sanitize; mandatory"},
    {"slug": "mop_sink", "name": "Floor-Mount Mop Sink", "category": "dish", "station": "dish_pit",
     "width_ft": 2.0, "depth_ft": 2.0, "height_ft": 1.0, "weight_lb": 80,
     "needs_water_supply": True, "needs_water_drain": True,
     "thermal_output_btu": 0, "thermal_class": "neutral",
     "min_clearance_back_in": 0, "min_clearance_sides_in": 6, "min_clearance_front_in": 18,
     "list_price_usd": 280.00, "notes": "Janitorial; locate near dish pit"},
    # Storage
    {"slug": "dry_shelving_4tier", "name": "4-Tier Dry Shelving (4ft)", "category": "storage", "station": "dry_storage",
     "width_ft": 4.0, "depth_ft": 1.5, "height_ft": 6.0, "weight_lb": 65,
     "thermal_output_btu": 0, "thermal_class": "neutral",
     "min_clearance_back_in": 0, "min_clearance_sides_in": 0, "min_clearance_front_in": 18,
     "list_price_usd": 280.00, "notes": "NSF-listed; 18ga"},
    {"slug": "storage_cabinet", "name": "Locking Storage Cabinet", "category": "storage", "station": "dry_storage",
     "width_ft": 3.5, "depth_ft": 2.0, "height_ft": 6.0, "weight_lb": 180,
     "thermal_output_btu": 0, "thermal_class": "neutral",
     "min_clearance_back_in": 0, "min_clearance_sides_in": 0, "min_clearance_front_in": 24,
     "list_price_usd": 850.00, "notes": "For chemicals + small wares"},
    # Bar
    {"slug": "back_bar_cooler_3dr", "name": "3-Door Back Bar Cooler", "category": "refrigeration", "station": "bar",
     "width_ft": 6.5, "depth_ft": 2.2, "height_ft": 3.0, "weight_lb": 320,
     "needs_electric": True, "voltage": 120, "amperage": 8, "phase": 1,
     "thermal_output_btu": -2200, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 0, "min_clearance_front_in": 24,
     "list_price_usd": 3200.00, "notes": "Bottle storage"},
    {"slug": "ice_machine_500lb", "name": "500lb/day Ice Machine", "category": "refrigeration", "station": "bar",
     "width_ft": 2.8, "depth_ft": 2.8, "height_ft": 5.0, "weight_lb": 280,
     "needs_water_supply": True, "needs_water_drain": True,
     "needs_electric": True, "voltage": 208, "amperage": 12, "phase": 1,
     "thermal_output_btu": -5000, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 24,
     "list_price_usd": 5800.00, "notes": "Bin sold separately"},
    {"slug": "beer_tap_system_4", "name": "4-Tap Beer System", "category": "bar", "station": "bar",
     "width_ft": 3.0, "depth_ft": 2.2, "height_ft": 3.5, "weight_lb": 280,
     "needs_electric": True, "voltage": 120, "amperage": 8, "phase": 1,
     "thermal_output_btu": -2000, "thermal_class": "cold",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 24,
     "list_price_usd": 2400.00, "notes": "Glycol cooled"},
    # Pastry / bakery
    {"slug": "proofer_8pan", "name": "8-Pan Proofer Cabinet", "category": "cooking", "station": "pastry",
     "width_ft": 1.8, "depth_ft": 2.5, "height_ft": 6.0, "weight_lb": 240,
     "needs_electric": True, "voltage": 120, "amperage": 8, "phase": 1,
     "thermal_output_btu": 4000, "thermal_class": "warm",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 30,
     "list_price_usd": 4800.00, "notes": "Bread doughs; humidity controlled"},
    {"slug": "deck_oven_3deck", "name": "3-Deck Pizza/Bread Oven", "category": "cooking", "station": "pastry",
     "width_ft": 5.5, "depth_ft": 4.0, "height_ft": 6.0, "weight_lb": 920,
     "needs_gas": True, "gas_btu": 140000,
     "needs_hood": True, "thermal_output_btu": 140000, "thermal_class": "hot",
     "min_clearance_back_in": 6, "min_clearance_sides_in": 6, "min_clearance_front_in": 48,
     "list_price_usd": 14500.00, "notes": "Hearth-style deck"},
]


def seed_kitchen_catalog():
    """Idempotent: insert missing slugs, leave existing rows untouched."""
    existing = {d["slug"] for d in catalog_col.find({}, {"slug": 1, "_id": 0})}
    to_insert = [item for item in KITCHEN_CATALOG_SEED if item["slug"] not in existing]
    if to_insert:
        catalog_col.insert_many(to_insert)
    return len(to_insert)
