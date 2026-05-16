"""
Engineering Command Dashboard
=============================
Predictive maintenance + uptime + utility + CapEx intelligence for the
property. Parallels spa_ops.py and hskp_ops.py.

Endpoints (prefix /api/eng-ops):
  GET  /kpis                         — 12 live KPIs
  GET  /today                        — today's ops board
  GET  /work-orders                  — list with filters
  POST /work-orders                  — create (can come from concierge, hskp, FOH)
  PATCH /work-orders/{id}            — update status, priority, assignee
  GET  /work-orders/{id}             — detail
  GET  /assets                       — asset register
  POST /assets                       — register new asset
  GET  /pm-schedule                  — upcoming preventive maintenance
  POST /pm-schedule                  — schedule PM
  GET  /utilities                    — readings + trend
  POST /utilities                    — ingest reading
  GET  /compliance                   — inspection queue
  POST /compliance                   — log inspection
  GET  /capex-forecast               — capital replacement projection
  GET  /technician-productivity      — labor utilization
  POST /seed                         — seed demo data (idempotent)
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from uuid import uuid4
import random

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db

try:
    import event_bus
except ImportError:
    event_bus = None

router = APIRouter(prefix="/api/eng-ops", tags=["eng-ops"])

WO_COLL = "eng_work_orders"
ASSET_COLL = "eng_assets"
PM_COLL = "eng_pm_schedule"
UTIL_COLL = "eng_utility_readings"
COMP_COLL = "eng_inspections"
CAPEX_COLL = "eng_capex_forecasts"
TECH_COLL = "eng_technicians"

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()

SEVERITIES = ["low", "medium", "high", "critical"]
STATUSES = ["open", "assigned", "in_progress", "awaiting_parts", "resolved", "closed"]
CATEGORIES = ["hvac", "plumbing", "electrical", "kitchen_equipment", "elevator", "pool_spa", "lighting", "carpentry", "it_av", "grounds"]


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class WorkOrder(BaseModel):
    id: str
    ticket_no: str
    title: str
    description: str = ""
    category: str
    severity: str = "medium"
    status: str = "open"
    location: str = ""                 # e.g., "Room 412", "Ballroom A", "Pool deck"
    room_number: Optional[str] = None
    asset_id: Optional[str] = None
    assignee: Optional[str] = None
    source: str = "manual"             # manual | concierge | housekeeping | foh | preventive
    guest_impact: bool = False
    vip_room: bool = False
    revenue_at_risk: float = 0.0
    sla_breach_at: Optional[str] = None
    opened_at: str = Field(default_factory=_iso)
    assigned_at: Optional[str] = None
    resolved_at: Optional[str] = None
    notes: List[str] = []


class Asset(BaseModel):
    id: str
    asset_no: str
    name: str
    category: str
    location: str
    installed_on: Optional[str] = None
    lifespan_months: int = 120
    replacement_cost: float = 0.0
    downtime_hours: float = 0.0
    last_serviced_at: Optional[str] = None
    failure_probability: float = 0.0   # 0-1, recomputed nightly


class PMEntry(BaseModel):
    id: str
    asset_id: str
    asset_name: str = ""
    task: str
    frequency_days: int = 30
    next_due: str
    last_completed: Optional[str] = None
    status: str = "scheduled"          # scheduled | in_progress | completed | overdue


class UtilityReading(BaseModel):
    id: str
    meter: str                         # electricity_main | water_main | gas_boiler | chiller_1 etc
    value: float
    unit: str                          # kWh | m3 | therms
    recorded_at: str = Field(default_factory=_iso)


class InspectionLog(BaseModel):
    id: str
    inspection_type: str               # fire_alarm | elevator | pool_chem | kitchen_hood | life_safety
    location: str = ""
    performed_by: str = ""
    performed_at: str = Field(default_factory=_iso)
    passed: bool = True
    notes: str = ""
    next_due: Optional[str] = None


class CreateWorkOrderReq(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    severity: str = "medium"
    location: str = ""
    room_number: Optional[str] = None
    asset_id: Optional[str] = None
    source: str = "manual"
    guest_impact: bool = False
    vip_room: bool = False
    revenue_at_risk: float = 0.0


class UpdateWorkOrderReq(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assignee: Optional[str] = None
    add_note: Optional[str] = None


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _strip(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


def _gen_ticket_no() -> str:
    return f"ENG-{_now().strftime('%y%m%d')}-{uuid4().hex[:4].upper()}"


def _compute_sla(severity: str) -> Optional[str]:
    hours = {"critical": 1, "high": 4, "medium": 24, "low": 72}.get(severity, 24)
    return (_now() + timedelta(hours=hours)).isoformat()


async def _seed_if_empty():
    if db[TECH_COLL].count_documents({}) == 0:
        techs = [
            {"id": f"tech-{i}", "name": n, "specialty": s, "active": True, "shift": sh}
            for i, (n, s, sh) in enumerate([
                ("Miguel Rivera", "hvac", "day"),
                ("Aisha Patel", "electrical", "day"),
                ("Tomás Lindqvist", "plumbing", "evening"),
                ("Dana Okafor", "kitchen_equipment", "day"),
                ("Rohan Kapoor", "elevator", "on_call"),
            ])
        ]
        db[TECH_COLL].insert_many(techs)

    if db[ASSET_COLL].count_documents({}) == 0:
        now = _now()
        assets = []
        for i, (name, cat, loc, cost, months_ago, life) in enumerate([
            ("Rooftop Chiller 01", "hvac", "Roof West", 85000, 72, 180),
            ("Boiler Unit A", "hvac", "Basement Plant", 42000, 48, 180),
            ("Main Elevator 1", "elevator", "Tower East", 180000, 120, 240),
            ("Kitchen Hood Line 1", "kitchen_equipment", "Main Kitchen", 22000, 36, 120),
            ("Pool Filtration Pump", "pool_spa", "Pool Plant", 8500, 24, 84),
            ("Ballroom A LED Rig", "electrical", "Ballroom A", 48000, 18, 120),
            ("Domestic Hot Water Tank", "plumbing", "Basement", 15000, 60, 120),
            ("Walk-in Cooler Kitchen", "kitchen_equipment", "Main Kitchen", 32000, 84, 144),
        ]):
            assets.append({
                "id": f"asset-{i:03d}",
                "asset_no": f"ASSET-{1000+i}",
                "name": name,
                "category": cat,
                "location": loc,
                "installed_on": (now - timedelta(days=months_ago * 30)).isoformat(),
                "lifespan_months": life,
                "replacement_cost": cost,
                "downtime_hours": round(random.uniform(0, 18), 1),
                "last_serviced_at": (now - timedelta(days=random.randint(7, 90))).isoformat(),
                "failure_probability": min(0.95, months_ago / life + random.uniform(-0.05, 0.15)),
            })
        db[ASSET_COLL].insert_many(assets)

    # Seed some historical work orders for KPIs
    if db[WO_COLL].count_documents({}) == 0:
        now = _now()
        wos = []
        categories = CATEGORIES
        for i in range(60):
            days_ago = random.randint(0, 30)
            sev = random.choices(SEVERITIES, weights=[40, 35, 20, 5])[0]
            opened = (now - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat()
            resolved = None
            status = "resolved"
            if days_ago < 2 and random.random() < 0.4:
                status = random.choice(["open", "assigned", "in_progress"])
            else:
                resolved = (datetime.fromisoformat(opened) + timedelta(hours=random.randint(1, 48))).isoformat()
            cat = random.choice(categories)
            wos.append({
                "id": f"wo-seed-{i}",
                "ticket_no": f"ENG-{(now - timedelta(days=days_ago)).strftime('%y%m%d')}-{i:04X}",
                "title": f"{cat.replace('_',' ').title()} issue reported",
                "description": "",
                "category": cat,
                "severity": sev,
                "status": status,
                "location": random.choice(["Room 301", "Room 412", "Ballroom A", "Pool deck", "Spa", "Main Kitchen", "Lobby"]),
                "room_number": random.choice([None, "301", "412", "502", "614"]),
                "asset_id": None,
                "assignee": random.choice([None, "tech-0", "tech-1", "tech-2", "tech-3"]),
                "source": random.choice(["manual", "concierge", "housekeeping", "foh", "preventive"]),
                "guest_impact": random.random() < 0.35,
                "vip_room": random.random() < 0.1,
                "revenue_at_risk": round(random.uniform(0, 650), 2) if random.random() < 0.3 else 0.0,
                "sla_breach_at": _compute_sla(sev),
                "opened_at": opened,
                "assigned_at": opened,
                "resolved_at": resolved,
                "notes": [],
            })
        db[WO_COLL].insert_many(wos)

    if db[PM_COLL].count_documents({}) == 0:
        now = _now()
        pm = []
        assets = list(db[ASSET_COLL].find({}, {"_id": 0}))
        tasks = {
            "hvac": "Filter change + coil inspection",
            "plumbing": "Check for leaks + pressure test",
            "electrical": "Panel thermal scan",
            "kitchen_equipment": "Hood degrease + calibration",
            "elevator": "Safety cert + cable inspection",
            "pool_spa": "Chemical balance + pump check",
        }
        for a in assets:
            freq = {"elevator": 30, "kitchen_equipment": 14, "hvac": 60, "plumbing": 90, "pool_spa": 7}.get(a["category"], 30)
            nd_days = random.randint(-5, 30)
            pm.append({
                "id": f"pm-{a['id']}",
                "asset_id": a["id"],
                "asset_name": a["name"],
                "task": tasks.get(a["category"], "Scheduled maintenance"),
                "frequency_days": freq,
                "next_due": (now + timedelta(days=nd_days)).isoformat(),
                "last_completed": (now - timedelta(days=random.randint(7, 60))).isoformat(),
                "status": "overdue" if nd_days < 0 else "scheduled",
            })
        db[PM_COLL].insert_many(pm)

    if db[UTIL_COLL].count_documents({}) == 0:
        now = _now()
        readings = []
        for d in range(14):
            for meter, unit, base in [("electricity_main", "kWh", 8500), ("water_main", "m3", 92), ("gas_boiler", "therms", 140)]:
                readings.append({
                    "id": f"util-{meter}-{d}",
                    "meter": meter,
                    "value": round(base + random.uniform(-base * 0.15, base * 0.2), 2),
                    "unit": unit,
                    "recorded_at": (now - timedelta(days=d)).isoformat(),
                })
        db[UTIL_COLL].insert_many(readings)

    if db[COMP_COLL].count_documents({}) == 0:
        now = _now()
        insp = []
        for t in ["fire_alarm", "elevator", "pool_chem", "kitchen_hood", "life_safety"]:
            insp.append({
                "id": f"insp-{t}",
                "inspection_type": t,
                "location": "various",
                "performed_by": "compliance-officer",
                "performed_at": (now - timedelta(days=random.randint(1, 45))).isoformat(),
                "passed": random.random() < 0.9,
                "notes": "",
                "next_due": (now + timedelta(days=random.choice([30, 90, 180, 365]))).isoformat(),
            })
        db[COMP_COLL].insert_many(insp)


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@router.post("/seed")
async def seed():
    await _seed_if_empty()
    return {
        "ok": True,
        "work_orders": db[WO_COLL].count_documents({}),
        "assets": db[ASSET_COLL].count_documents({}),
        "pm": db[PM_COLL].count_documents({}),
        "utilities": db[UTIL_COLL].count_documents({}),
        "inspections": db[COMP_COLL].count_documents({}),
    }


@router.get("/kpis")
async def kpis():
    await _seed_if_empty()
    now = _now()
    last30 = (now - timedelta(days=30)).isoformat()
    today = now.replace(hour=0, minute=0, second=0).isoformat()

    total_30 = db[WO_COLL].count_documents({"opened_at": {"$gte": last30}})
    resolved_30 = db[WO_COLL].count_documents({"opened_at": {"$gte": last30}, "status": {"$in": ["resolved", "closed"]}})
    open_now = db[WO_COLL].count_documents({"status": {"$in": ["open", "assigned", "in_progress", "awaiting_parts"]}})
    guest_impact_30 = db[WO_COLL].count_documents({"opened_at": {"$gte": last30}, "guest_impact": True})
    preventive_30 = db[WO_COLL].count_documents({"opened_at": {"$gte": last30}, "source": "preventive"})
    rooms_ooo = db[WO_COLL].count_documents({"status": {"$in": ["open", "in_progress"]}, "severity": {"$in": ["high", "critical"]}, "room_number": {"$ne": None}})

    # Response/resolution time averages
    samples = list(db[WO_COLL].find({"resolved_at": {"$ne": None}, "opened_at": {"$gte": last30}}, {"_id": 0}).limit(500))
    resp_times, res_times = [], []
    for wo in samples:
        try:
            opened = datetime.fromisoformat(wo["opened_at"])
            if wo.get("assigned_at"):
                resp_times.append((datetime.fromisoformat(wo["assigned_at"]) - opened).total_seconds() / 60)
            if wo.get("resolved_at"):
                res_times.append((datetime.fromisoformat(wo["resolved_at"]) - opened).total_seconds() / 60)
        except Exception:
            pass
    avg_response_min = round(sum(resp_times) / len(resp_times), 1) if resp_times else 0
    avg_resolution_min = round(sum(res_times) / len(res_times), 1) if res_times else 0

    # PM compliance
    pm_docs = list(db[PM_COLL].find({}, {"_id": 0}).limit(200))
    pm_due = [p for p in pm_docs if p.get("status") in ("scheduled", "overdue")]
    pm_overdue = [p for p in pm_docs if p.get("status") == "overdue"]
    pm_compliance = round(100 * (1 - len(pm_overdue) / max(1, len(pm_docs))), 1)

    # Utilities
    util = list(db[UTIL_COLL].find({}, {"_id": 0}).sort("recorded_at", -1).limit(60))
    last_elec = next((u["value"] for u in util if u["meter"] == "electricity_main"), 0)

    # Asset risk
    assets = list(db[ASSET_COLL].find({}, {"_id": 0}).limit(200))
    high_risk_assets = [a for a in assets if a.get("failure_probability", 0) > 0.7]
    capex_exposure = sum(a.get("replacement_cost", 0) * a.get("failure_probability", 0) for a in assets)

    return {
        "ts": _iso(),
        "work_order_completion_rate": round(100 * resolved_30 / max(1, total_30), 1),
        "avg_response_minutes": avg_response_min,
        "avg_resolution_minutes": avg_resolution_min,
        "guest_impact_ticket_ratio": round(100 * guest_impact_30 / max(1, total_30), 1),
        "preventive_vs_reactive_ratio": round(100 * preventive_30 / max(1, total_30), 1),
        "pm_compliance_rate": pm_compliance,
        "pm_overdue_count": len(pm_overdue),
        "rooms_ooo_count": rooms_ooo,
        "open_ticket_count": open_now,
        "high_risk_assets": len(high_risk_assets),
        "capex_exposure_30d": round(capex_exposure, 2),
        "last_electricity_reading": last_elec,
    }


@router.get("/today")
async def today_board():
    await _seed_if_empty()
    now = _now()
    today_start = now.replace(hour=0, minute=0, second=0).isoformat()

    open_tickets = list(db[WO_COLL].find(
        {"status": {"$in": ["open", "assigned", "in_progress", "awaiting_parts"]}}, {"_id": 0}
    ).sort("severity", -1).limit(80))

    # Severity grouping
    by_sev = {s: [wo for wo in open_tickets if wo.get("severity") == s] for s in SEVERITIES}

    # SLA breach imminent
    breach_soon = []
    for wo in open_tickets:
        if wo.get("sla_breach_at"):
            try:
                if datetime.fromisoformat(wo["sla_breach_at"]) < now + timedelta(hours=2):
                    breach_soon.append(wo)
            except Exception:
                pass

    # Today's PMs
    pm_today = list(db[PM_COLL].find({"next_due": {"$lte": (now + timedelta(days=1)).isoformat()}}, {"_id": 0}).limit(50))

    return {
        "ts": _iso(),
        "open_by_severity": {k: len(v) for k, v in by_sev.items()},
        "open_tickets": open_tickets[:30],
        "sla_breach_imminent": breach_soon,
        "pm_due_today": pm_today,
        "revenue_at_risk_total": round(sum(wo.get("revenue_at_risk", 0) for wo in open_tickets), 2),
    }


@router.get("/work-orders")
async def list_wos(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = Query(100, le=500),
):
    q = {}
    if status:
        q["status"] = status
    if severity:
        q["severity"] = severity
    if source:
        q["source"] = source
    docs = db[WO_COLL].find(q, {"_id": 0}).sort("opened_at", -1).to_list(length=limit)
    return {"items": docs, "count": len(docs)}


@router.post("/work-orders")
async def create_wo(req: CreateWorkOrderReq):
    if req.severity not in SEVERITIES:
        raise HTTPException(400, f"severity must be one of {SEVERITIES}")
    wo = {
        "id": f"wo-{uuid4().hex[:10]}",
        "ticket_no": _gen_ticket_no(),
        "title": req.title,
        "description": req.description,
        "category": req.category,
        "severity": req.severity,
        "status": "open",
        "location": req.location,
        "room_number": req.room_number,
        "asset_id": req.asset_id,
        "assignee": None,
        "source": req.source,
        "guest_impact": req.guest_impact,
        "vip_room": req.vip_room,
        "revenue_at_risk": req.revenue_at_risk,
        "sla_breach_at": _compute_sla(req.severity),
        "opened_at": _iso(),
        "assigned_at": None,
        "resolved_at": None,
        "notes": [],
    }
    db[WO_COLL].insert_one(wo.copy())
    if event_bus:
        try:
            event_bus.publish("eng.work_order.created", {"id": wo["id"], "ticket_no": wo["ticket_no"], "severity": wo["severity"], "category": wo["category"], "room_number": wo.get("room_number"), "source": wo.get("source")}, source="eng_ops")
        except Exception:
            pass
    return {"ok": True, "work_order": _strip(wo)}


@router.patch("/work-orders/{wo_id}")
async def update_wo(wo_id: str, req: UpdateWorkOrderReq):
    doc = db[WO_COLL].find_one({"id": wo_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "work order not found")
    updates = {}
    if req.status and req.status in STATUSES:
        updates["status"] = req.status
        if req.status in ("resolved", "closed") and not doc.get("resolved_at"):
            updates["resolved_at"] = _iso()
    if req.severity and req.severity in SEVERITIES:
        updates["severity"] = req.severity
        updates["sla_breach_at"] = _compute_sla(req.severity)
    if req.assignee is not None:
        updates["assignee"] = req.assignee
        if not doc.get("assigned_at"):
            updates["assigned_at"] = _iso()
    if req.add_note:
        updates["notes"] = doc.get("notes", []) + [f"{_iso()} — {req.add_note}"]
    if updates:
        db[WO_COLL].update_one({"id": wo_id}, {"$set": updates})
    out = db[WO_COLL].find_one({"id": wo_id}, {"_id": 0})
    return {"ok": True, "work_order": out}


@router.get("/work-orders/{wo_id}")
async def get_wo(wo_id: str):
    doc = db[WO_COLL].find_one({"id": wo_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "not found")
    return doc


@router.get("/assets")
async def list_assets():
    await _seed_if_empty()
    assets = list(db[ASSET_COLL].find({}, {"_id": 0}).limit(200))
    # add a risk tier
    for a in assets:
        fp = a.get("failure_probability", 0)
        a["risk_tier"] = "high" if fp > 0.7 else "medium" if fp > 0.4 else "low"
    return {"items": assets, "count": len(assets)}


@router.post("/assets")
async def create_asset(asset: Asset):
    doc = asset.dict()
    db[ASSET_COLL].insert_one(doc.copy())
    return {"ok": True, "asset": _strip(doc)}


@router.get("/pm-schedule")
async def pm_schedule():
    await _seed_if_empty()
    now = _now()
    pm = list(db[PM_COLL].find({}, {"_id": 0}).sort("next_due", 1).limit(200))
    for p in pm:
        try:
            if datetime.fromisoformat(p["next_due"]) < now and p["status"] != "completed":
                p["status"] = "overdue"
        except Exception:
            pass
    return {"items": pm, "count": len(pm)}


@router.post("/pm-schedule")
async def add_pm(entry: PMEntry):
    doc = entry.dict()
    db[PM_COLL].insert_one(doc.copy())
    return {"ok": True, "pm": _strip(doc)}


@router.get("/utilities")
async def utility_readings(days: int = 14, meter: Optional[str] = None):
    await _seed_if_empty()
    now = _now()
    q = {"recorded_at": {"$gte": (now - timedelta(days=days)).isoformat()}}
    if meter:
        q["meter"] = meter
    readings = list(db[UTIL_COLL].find(q, {"_id": 0}).sort("recorded_at", -1).limit(500))
    # Trend summary
    by_meter = {}
    for r in readings:
        by_meter.setdefault(r["meter"], []).append(r["value"])
    summary = {m: {"avg": round(sum(v) / len(v), 2), "max": max(v), "min": min(v), "count": len(v)} for m, v in by_meter.items()}
    return {"items": readings, "summary": summary}


@router.post("/utilities")
async def add_reading(r: UtilityReading):
    doc = r.dict()
    db[UTIL_COLL].insert_one(doc.copy())
    return {"ok": True, "reading": _strip(doc)}


@router.get("/compliance")
async def compliance():
    await _seed_if_empty()
    now = _now()
    docs = list(db[COMP_COLL].find({}, {"_id": 0}).sort("performed_at", -1).limit(100))
    # Flag anything due within 30 days
    for d in docs:
        try:
            due = datetime.fromisoformat(d["next_due"]) if d.get("next_due") else None
            d["due_soon"] = bool(due and due < now + timedelta(days=30))
            d["overdue"] = bool(due and due < now)
        except Exception:
            d["due_soon"] = False
            d["overdue"] = False
    return {"items": docs, "count": len(docs)}


@router.post("/compliance")
async def log_inspection(log: InspectionLog):
    doc = log.dict()
    db[COMP_COLL].insert_one(doc.copy())
    return {"ok": True, "inspection": _strip(doc)}


@router.get("/capex-forecast")
async def capex_forecast():
    await _seed_if_empty()
    assets = list(db[ASSET_COLL].find({}, {"_id": 0}).limit(200))
    forecast = []
    total_12m = 0.0
    total_36m = 0.0
    for a in assets:
        fp = a.get("failure_probability", 0)
        cost = a.get("replacement_cost", 0)
        if fp > 0.5:
            total_12m += cost * fp
        if fp > 0.3:
            total_36m += cost * min(1.0, fp + 0.2)
        forecast.append({
            "asset_id": a["id"],
            "name": a["name"],
            "category": a["category"],
            "replacement_cost": cost,
            "failure_probability": fp,
            "projected_replacement_year": int(datetime.now().year + (1 if fp > 0.7 else 2 if fp > 0.4 else 5)),
        })
    forecast.sort(key=lambda x: x["failure_probability"], reverse=True)
    return {
        "items": forecast,
        "total_12m_capex": round(total_12m, 2),
        "total_36m_capex": round(total_36m, 2),
    }


@router.get("/technician-productivity")
async def tech_productivity():
    await _seed_if_empty()
    now = _now()
    last30 = (now - timedelta(days=30)).isoformat()
    techs = list(db[TECH_COLL].find({}, {"_id": 0}).limit(50))
    out = []
    for t in techs:
        wos = list(db[WO_COLL].find({"assignee": t["id"], "opened_at": {"$gte": last30}}, {"_id": 0}).limit(500))
        closed = [w for w in wos if w.get("status") in ("resolved", "closed")]
        times = []
        for w in closed:
            try:
                times.append((datetime.fromisoformat(w["resolved_at"]) - datetime.fromisoformat(w["opened_at"])).total_seconds() / 3600)
            except Exception:
                pass
        out.append({
            "id": t["id"],
            "name": t["name"],
            "specialty": t["specialty"],
            "shift": t.get("shift", ""),
            "tickets_assigned_30d": len(wos),
            "tickets_closed_30d": len(closed),
            "avg_resolution_hours": round(sum(times) / len(times), 2) if times else 0,
            "productivity_score": round(100 * len(closed) / max(1, len(wos)), 1),
        })
    return {"items": out}
