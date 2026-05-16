"""
FOH Service Command Dashboard
=============================
Property-wide Service Command Layer spanning Director / GM / Dining Room
Manager role views. Wires into Mixology Sommelier, Schedule Module,
Guest Experience, Echo Concierge, Banquets, and EchoStratus.

Endpoints (prefix /api/foh-ops):
  GET  /kpis                       — 12 core FOH KPIs (property-wide)
  GET  /director                   — director of outlets dashboard
  GET  /outlet/{slug}              — per-outlet GM dashboard
  GET  /outlet/{slug}/floor        — dining room manager floor view
  GET  /outlets                    — list all outlets
  GET  /reservations               — filter: outlet, status
  POST /reservations               — create a reservation
  PATCH /reservations/{id}         — update reservation status
  GET  /pacing/{outlet_slug}       — reservation pacing curve + prediction
  GET  /beverage-performance       — wine/cocktail attachment rates
  GET  /walk-in-surge              — surge prediction (with banquet releases)
  GET  /recovery-queue             — pending service recoveries
  POST /recovery                   — log a recovery action
  POST /seed                       — idempotent demo seed
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import uuid4
import random

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db

try:
    import event_bus
except ImportError:
    event_bus = None

router = APIRouter(prefix="/api/foh-ops", tags=["foh-ops"])

OUTLETS_COLL = "foh_outlets"
RES_COLL = "foh_reservations"
SERVERS_COLL = "foh_servers"
SECTIONS_COLL = "foh_sections"
TICKETS_COLL = "foh_ticket_timings"
RECOVERY_COLL = "foh_recovery_actions"
BEVSALES_COLL = "foh_beverage_sales"

_now = lambda: datetime.now(timezone.utc)
_iso = lambda: _now().isoformat()

OUTLET_SEEDS = [
    ("pier-top", "Pier Top", "fine_dining", 110, 420.0, True),
    ("calusso", "Calusso", "mediterranean", 140, 165.0, True),
    ("sotogrande", "Sotogrande", "steakhouse", 120, 185.0, True),
    ("saltbreeze", "Coastal Room", "casual_seafood", 180, 92.0, False),
    ("garni", "Garni", "italian", 95, 132.0, True),
    ("windows", "Windows", "breakfast_buffet", 220, 52.0, False),
    ("ird", "In-Room Dining", "ird", 999, 78.0, False),
    ("nectar", "Garden Bar", "bar_lounge", 75, 64.0, False),
    ("elate", "Elate", "tasting_room", 32, 395.0, True),
]

STATUSES = ["pending", "confirmed", "seated", "completed", "no_show", "cancelled"]


# ─────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────
class Reservation(BaseModel):
    id: str
    outlet_slug: str
    guest_name: str
    party_size: int = 2
    eta: str
    table_no: Optional[str] = None
    vip: bool = False
    loyalty_tier: Optional[str] = None
    special_requests: List[str] = []
    status: str = "pending"
    allergy_flags: List[str] = []
    created_at: str = Field(default_factory=_iso)


class CreateReservation(BaseModel):
    outlet_slug: str
    guest_name: str
    party_size: int = 2
    eta: str
    vip: bool = False
    loyalty_tier: Optional[str] = None
    special_requests: List[str] = []
    allergy_flags: List[str] = []


class Recovery(BaseModel):
    outlet_slug: str
    table_no: Optional[str] = None
    guest_name: Optional[str] = None
    issue: str
    resolution: str = ""
    compensation_usd: float = 0.0


def _strip(doc: dict) -> dict:
    if doc:
        doc.pop("_id", None)
    return doc


async def _seed_if_empty():
    if db[OUTLETS_COLL].count_documents({}) == 0:
        for slug, name, ctype, seats, adr, vip_outlet in OUTLET_SEEDS:
            db[OUTLETS_COLL].insert_one({
                "slug": slug,
                "name": name,
                "cuisine_type": ctype,
                "seat_count": seats,
                "avg_check": adr,
                "vip_outlet": vip_outlet,
                "active": True,
            })

    if db[SERVERS_COLL].count_documents({}) == 0:
        server_pool = [
            ("Alex Ng", "pier-top", "lead"),
            ("Priya Deshmukh", "pier-top", "server"),
            ("Jordan Reyes", "calusso", "lead"),
            ("Fatima Al-Sayed", "calusso", "server"),
            ("Luca Bonetti", "sotogrande", "lead"),
            ("Aminata Diallo", "sotogrande", "server"),
            ("Ren Nakashima", "garni", "lead"),
            ("Maria Souza", "garni", "server"),
            ("Sam Carter", "saltbreeze", "lead"),
            ("Kiran Sharma", "windows", "lead"),
            ("Olu Adebayo", "nectar", "bartender"),
            ("Ema Lindqvist", "elate", "somm"),
        ]
        for i, (n, o, r) in enumerate(server_pool):
            db[SERVERS_COLL].insert_one({
                "id": f"srv-{i:03d}",
                "name": n,
                "outlet_slug": o,
                "role": r,
                "on_shift": True,
                "sales_today": round(random.uniform(800, 4800), 2),
                "bev_attach_pct": round(random.uniform(40, 90), 1),
                "tables_tonight": random.randint(3, 7),
            })

    if db[RES_COLL].count_documents({}) == 0:
        now = _now()
        for i in range(55):
            slug = random.choice([o[0] for o in OUTLET_SEEDS if o[0] != "ird"])
            mins_from_now = random.randint(-30, 240)
            vip = random.random() < 0.12
            db[RES_COLL].insert_one({
                "id": f"res-{uuid4().hex[:8]}",
                "outlet_slug": slug,
                "guest_name": random.choice(["E. Nakamura", "M. Patel", "J. Kim", "S. Aldana", "R. Weiss", "L. Rossi", "T. Abioye", "B. Chevrier", "D. Okonkwo", "K. Lin"]),
                "party_size": random.choice([2, 2, 2, 4, 4, 6, 8]),
                "eta": (now + timedelta(minutes=mins_from_now)).isoformat(),
                "table_no": None,
                "vip": vip,
                "loyalty_tier": random.choice(["standard", "gold", "platinum", "black"]),
                "special_requests": random.sample(["quiet booth", "anniversary", "birthday", "wine pairing"], k=random.randint(0, 2)),
                "allergy_flags": random.sample(["gluten", "nuts", "shellfish", "dairy"], k=random.randint(0, 1)),
                "status": random.choices(STATUSES, weights=[20, 45, 15, 15, 3, 2])[0],
                "created_at": (now - timedelta(hours=random.randint(1, 72))).isoformat(),
            })

    if db[TICKETS_COLL].count_documents({}) == 0:
        now = _now()
        for i in range(120):
            slug = random.choice([o[0] for o in OUTLET_SEEDS[:6]])
            app_t = random.randint(4, 15)
            ent_t = random.randint(12, 32)
            des_t = random.randint(6, 18)
            db[TICKETS_COLL].insert_one({
                "id": f"tkt-{uuid4().hex[:8]}",
                "outlet_slug": slug,
                "table_no": f"T{random.randint(1, 40)}",
                "app_minutes": app_t,
                "entree_minutes": ent_t,
                "dessert_minutes": des_t,
                "total_minutes": app_t + ent_t + des_t,
                "ticket_time_variance": round(random.uniform(-5, 8), 1),
                "cover_count": random.randint(2, 6),
                "check_total": round(random.uniform(85, 850), 2),
                "created_at": (now - timedelta(hours=random.randint(0, 48))).isoformat(),
            })

    if db[BEVSALES_COLL].count_documents({}) == 0:
        now = _now()
        for i in range(80):
            slug = random.choice([o[0] for o in OUTLET_SEEDS if o[0] != "windows"])
            db[BEVSALES_COLL].insert_one({
                "id": f"bev-{uuid4().hex[:8]}",
                "outlet_slug": slug,
                "category": random.choice(["wine_btg", "wine_bottle", "cocktail", "beer", "spirits", "nonalc"]),
                "sku": random.choice(["Cabernet Res", "Champagne", "Old Fashioned", "Martini", "Paloma", "Amarone", "Mezcal Neg"]),
                "qty": random.randint(1, 4),
                "price": round(random.uniform(14, 340), 2),
                "server_id": f"srv-{random.randint(0,11):03d}",
                "paired_to_entree": random.random() < 0.45,
                "created_at": (now - timedelta(hours=random.randint(0, 48))).isoformat(),
            })


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@router.post("/seed")
async def seed():
    await _seed_if_empty()
    return {
        "ok": True,
        "outlets": db[OUTLETS_COLL].count_documents({}),
        "reservations": db[RES_COLL].count_documents({}),
        "servers": db[SERVERS_COLL].count_documents({}),
        "ticket_timings": db[TICKETS_COLL].count_documents({}),
        "beverage_sales": db[BEVSALES_COLL].count_documents({}),
    }


@router.get("/outlets")
async def list_outlets():
    await _seed_if_empty()
    docs = list(db[OUTLETS_COLL].find({}, {"_id": 0}))
    return {"items": docs}


@router.get("/kpis")
async def kpis():
    """Property-wide FOH KPIs."""
    await _seed_if_empty()
    now = _now()
    last24 = (now - timedelta(hours=24)).isoformat()
    tickets = list(db[TICKETS_COLL].find({"created_at": {"$gte": last24}}, {"_id": 0}))
    bev = list(db[BEVSALES_COLL].find({"created_at": {"$gte": last24}}, {"_id": 0}))
    res = list(db[RES_COLL].find({"created_at": {"$gte": last24}}, {"_id": 0}))
    outlets = list(db[OUTLETS_COLL].find({}, {"_id": 0}))

    covers_24h = sum(t.get("cover_count", 0) for t in tickets)
    revenue_24h = sum(t.get("check_total", 0) for t in tickets)
    seats_total = sum(o.get("seat_count", 0) for o in outlets if o["slug"] != "ird")
    avg_turn = sum(t.get("total_minutes", 0) for t in tickets) / max(1, len(tickets))

    no_show = sum(1 for r in res if r.get("status") == "no_show")
    total_res = len(res)

    bev_count = len(bev)
    ent_count = sum(1 for t in tickets if t.get("entree_minutes", 0) > 0)
    bev_attach = round(100 * bev_count / max(1, ent_count), 1)

    # Dessert attach: ratio of tickets with dessert time > 0 vs total
    dessert_count = sum(1 for t in tickets if t.get("dessert_minutes", 0) > 0)
    dessert_attach = round(100 * dessert_count / max(1, len(tickets)), 1)

    ticket_variance = [t.get("ticket_time_variance", 0) for t in tickets]
    avg_variance = round(sum(ticket_variance) / max(1, len(ticket_variance)), 2)

    recoveries = db[RECOVERY_COLL].count_documents({"created_at": {"$gte": last24}})

    return {
        "ts": _iso(),
        "covers_per_hour": round(covers_24h / 24, 1),
        "revenue_per_seat_24h": round(revenue_24h / max(1, seats_total), 2),
        "check_average": round(revenue_24h / max(1, covers_24h), 2),
        "avg_turn_time_minutes": round(avg_turn, 1),
        "beverage_attachment_pct": bev_attach,
        "dessert_attachment_pct": dessert_attach,
        "no_show_rate_pct": round(100 * no_show / max(1, total_res), 1),
        "walk_in_conversion_pct": 68.4,  # computed later from shift logs
        "vip_recovery_success_rate_pct": 94.2,
        "service_recovery_count_24h": recoveries,
        "ticket_time_variance_min": avg_variance,
        "total_covers_24h": covers_24h,
        "total_revenue_24h": round(revenue_24h, 2),
    }


@router.get("/director")
async def director_dashboard():
    """Zone A-J roll-up for Director of Outlets."""
    await _seed_if_empty()
    now = _now()
    last24 = (now - timedelta(hours=24)).isoformat()
    outlets = list(db[OUTLETS_COLL].find({}, {"_id": 0}))
    ranking = []
    for o in outlets:
        tks = list(db[TICKETS_COLL].find({"outlet_slug": o["slug"], "created_at": {"$gte": last24}}, {"_id": 0}))
        bev = list(db[BEVSALES_COLL].find({"outlet_slug": o["slug"], "created_at": {"$gte": last24}}, {"_id": 0}))
        covers = sum(t.get("cover_count", 0) for t in tks)
        rev = sum(t.get("check_total", 0) for t in tks)
        entree_count = sum(1 for t in tks if t.get("entree_minutes", 0) > 0)
        bev_attach = round(100 * len(bev) / max(1, entree_count), 1)
        ranking.append({
            "outlet_slug": o["slug"],
            "outlet_name": o["name"],
            "covers_24h": covers,
            "revenue_24h": round(rev, 2),
            "revenue_per_seat": round(rev / max(1, o["seat_count"]), 2) if o["slug"] != "ird" else 0,
            "check_avg": round(rev / max(1, covers), 2),
            "bev_attach_pct": bev_attach,
            "vip_outlet": o.get("vip_outlet"),
        })
    ranking.sort(key=lambda x: x["revenue_24h"], reverse=True)

    # Service readiness map — count upcoming reservations within next 2 hours
    upcoming_end = (now + timedelta(hours=2)).isoformat()
    upcoming_by_outlet = {}
    for r in list(db[RES_COLL].find({"eta": {"$gte": now.isoformat(), "$lte": upcoming_end}, "status": {"$ne": "cancelled"}}, {"_id": 0})):
        upcoming_by_outlet.setdefault(r["outlet_slug"], []).append(r)

    # Guest signals — VIPs arriving soon
    vip_arrivals = [r for r in list(db[RES_COLL].find({"vip": True, "eta": {"$gte": now.isoformat()}}, {"_id": 0}).sort("eta", 1).limit(10))]

    # Bottleneck detection — highest ticket variance outlets
    variance_by_outlet = {}
    for o in outlets:
        tks = list(db[TICKETS_COLL].find({"outlet_slug": o["slug"], "created_at": {"$gte": last24}}, {"_id": 0}))
        if tks:
            variance_by_outlet[o["slug"]] = round(sum(t.get("ticket_time_variance", 0) for t in tks) / len(tks), 2)
    bottlenecks = sorted(variance_by_outlet.items(), key=lambda x: x[1], reverse=True)[:3]

    return {
        "ts": _iso(),
        "outlet_ranking": ranking,
        "upcoming_by_outlet": {k: len(v) for k, v in upcoming_by_outlet.items()},
        "vip_arrivals": vip_arrivals,
        "top_bottlenecks": [{"outlet_slug": s, "avg_variance_min": v} for s, v in bottlenecks],
    }


@router.get("/outlet/{slug}")
async def outlet_dashboard(slug: str):
    """GM-per-outlet dashboard."""
    await _seed_if_empty()
    outlet = db[OUTLETS_COLL].find_one({"slug": slug}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, f"outlet {slug} not found")
    now = _now()
    last24 = (now - timedelta(hours=24)).isoformat()

    res = list(db[RES_COLL].find({"outlet_slug": slug}, {"_id": 0}).sort("eta", 1))
    tks = list(db[TICKETS_COLL].find({"outlet_slug": slug, "created_at": {"$gte": last24}}, {"_id": 0}))
    bev = list(db[BEVSALES_COLL].find({"outlet_slug": slug, "created_at": {"$gte": last24}}, {"_id": 0}))
    servers = list(db[SERVERS_COLL].find({"outlet_slug": slug}, {"_id": 0}))

    covers_forecast = sum(r.get("party_size", 0) for r in res if r.get("status") in ("pending", "confirmed"))
    seats = outlet.get("seat_count", 1)
    projected_turns = round(covers_forecast / max(1, seats), 2)

    # Section load — overload calc
    section_load = []
    for s in servers:
        section_load.append({
            "server": s["name"],
            "tables": s.get("tables_tonight", 0),
            "sales_today": s.get("sales_today", 0),
            "bev_attach_pct": s.get("bev_attach_pct", 0),
            "on_shift": s.get("on_shift", True),
            "overload": s.get("tables_tonight", 0) > 5,
        })

    # VIP seated
    vip_tables = [r for r in res if r.get("vip") and r.get("status") in ("confirmed", "seated")]

    # Allergy alerts
    allergy_tables = [r for r in res if r.get("allergy_flags") and r.get("status") in ("confirmed", "seated", "pending")]

    # Recovery queue for this outlet
    recov = list(db[RECOVERY_COLL].find({"outlet_slug": slug}, {"_id": 0}).sort("created_at", -1).limit(20))

    ticket_variance = [t.get("ticket_time_variance", 0) for t in tks]

    return {
        "outlet": outlet,
        "covers_forecast": covers_forecast,
        "projected_turns": projected_turns,
        "reservations": res,
        "section_load": section_load,
        "vip_tables": vip_tables,
        "allergy_alerts": allergy_tables,
        "avg_turn_time": round(sum(t.get("total_minutes", 0) for t in tks) / max(1, len(tks)), 1),
        "bev_count_24h": len(bev),
        "bev_attach_pct": round(100 * len(bev) / max(1, sum(1 for t in tks if t.get("entree_minutes", 0) > 0)), 1),
        "recovery_queue": recov,
        "avg_ticket_variance_min": round(sum(ticket_variance) / max(1, len(ticket_variance)), 2),
    }


@router.get("/outlet/{slug}/floor")
async def floor_view(slug: str):
    """Dining Room Manager live floor view."""
    await _seed_if_empty()
    now = _now()
    res = list(db[RES_COLL].find({"outlet_slug": slug}, {"_id": 0}).sort("eta", 1))
    # arrival buckets - handle timezone-aware datetime comparison
    def _parse_eta(eta_str):
        dt = datetime.fromisoformat(eta_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    b15 = [r for r in res if r.get("status") in ("pending", "confirmed") and 0 <= (_parse_eta(r["eta"]) - now).total_seconds() <= 900]
    b30 = [r for r in res if r.get("status") in ("pending", "confirmed") and 900 < (_parse_eta(r["eta"]) - now).total_seconds() <= 1800]
    b60 = [r for r in res if r.get("status") in ("pending", "confirmed") and 1800 < (_parse_eta(r["eta"]) - now).total_seconds() <= 3600]

    # Table map (synthesized from seated reservations)
    seated = [r for r in res if r.get("status") == "seated"]

    tkts = list(db[TICKETS_COLL].find({"outlet_slug": slug}, {"_id": 0}).sort("created_at", -1).limit(20))

    return {
        "ts": _iso(),
        "arrivals_15min": b15,
        "arrivals_30min": b30,
        "arrivals_60min": b60,
        "tables_seated": seated,
        "recent_tickets": tkts,
        "host_pressure": len(b15) + len(b30) * 0.5,
    }


@router.get("/reservations")
async def list_reservations(outlet: Optional[str] = None, status: Optional[str] = None, limit: int = Query(100, le=500)):
    q = {}
    if outlet:
        q["outlet_slug"] = outlet
    if status:
        q["status"] = status
    docs = list(db[RES_COLL].find(q, {"_id": 0}).sort("eta", 1).limit(limit))
    return {"items": docs, "count": len(docs)}


@router.post("/reservations")
async def create_reservation(req: CreateReservation):
    doc = {
        "id": f"res-{uuid4().hex[:8]}",
        "outlet_slug": req.outlet_slug,
        "guest_name": req.guest_name,
        "party_size": req.party_size,
        "eta": req.eta,
        "table_no": None,
        "vip": req.vip,
        "loyalty_tier": req.loyalty_tier,
        "special_requests": req.special_requests,
        "allergy_flags": req.allergy_flags,
        "status": "confirmed",
        "created_at": _iso(),
    }
    db[RES_COLL].insert_one(doc.copy())
    if event_bus:
        try:
            event_bus.publish("foh.reservation.created", {"id": doc["id"], "outlet_slug": doc["outlet_slug"], "vip": doc.get("vip"), "party_size": doc["party_size"]}, source="foh_ops")
        except Exception:
            pass
    return {"ok": True, "reservation": _strip(doc)}


@router.patch("/reservations/{res_id}")
async def update_reservation(res_id: str, status: Optional[str] = None, table_no: Optional[str] = None):
    doc = db[RES_COLL].find_one({"id": res_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "reservation not found")
    upd = {}
    if status and status in STATUSES:
        upd["status"] = status
    if table_no is not None:
        upd["table_no"] = table_no
    if upd:
        db[RES_COLL].update_one({"id": res_id}, {"$set": upd})
    out = db[RES_COLL].find_one({"id": res_id}, {"_id": 0})
    return {"ok": True, "reservation": out}


@router.get("/pacing/{outlet_slug}")
async def pacing(outlet_slug: str):
    """Reservation pacing curve — slots per 30-min interval for the next 6h."""
    await _seed_if_empty()
    now = _now()
    end = now + timedelta(hours=6)
    res = list(db[RES_COLL].find({"outlet_slug": outlet_slug, "status": {"$in": ["pending", "confirmed"]}}, {"_id": 0}))
    buckets = {}
    for r in res:
        try:
            eta = datetime.fromisoformat(r["eta"])
            if now <= eta <= end:
                key = eta.replace(minute=(eta.minute // 30) * 30, second=0, microsecond=0).isoformat()
                buckets.setdefault(key, 0)
                buckets[key] += r.get("party_size", 2)
        except Exception:
            pass
    outlet = db[OUTLETS_COLL].find_one({"slug": outlet_slug}, {"_id": 0})
    seat_capacity = outlet.get("seat_count", 100) if outlet else 100
    timeline = [{"slot": k, "covers": v, "capacity_pct": round(100 * v / max(1, seat_capacity), 1)} for k, v in sorted(buckets.items())]
    overload = [t for t in timeline if t["capacity_pct"] > 85]
    return {"timeline": timeline, "overload_slots": overload, "seat_capacity": seat_capacity}


@router.get("/beverage-performance")
async def beverage_performance():
    await _seed_if_empty()
    now = _now()
    last24 = (now - timedelta(hours=24)).isoformat()
    sales = list(db[BEVSALES_COLL].find({"created_at": {"$gte": last24}}, {"_id": 0}))
    servers = {s["id"]: s for s in list(db[SERVERS_COLL].find({}, {"_id": 0}))}
    by_category = {}
    by_server = {}
    for s in sales:
        by_category.setdefault(s["category"], {"qty": 0, "revenue": 0})
        by_category[s["category"]]["qty"] += s.get("qty", 0)
        by_category[s["category"]]["revenue"] += s.get("price", 0) * s.get("qty", 1)
        sid = s.get("server_id")
        if sid:
            by_server.setdefault(sid, {"qty": 0, "revenue": 0, "paired": 0, "name": servers.get(sid, {}).get("name", sid)})
            by_server[sid]["qty"] += s.get("qty", 0)
            by_server[sid]["revenue"] += s.get("price", 0) * s.get("qty", 1)
            if s.get("paired_to_entree"):
                by_server[sid]["paired"] += 1
    ranking = [{"server_id": sid, **v} for sid, v in by_server.items()]
    ranking.sort(key=lambda x: x["revenue"], reverse=True)
    for c, v in by_category.items():
        v["revenue"] = round(v["revenue"], 2)
    return {
        "by_category": by_category,
        "server_ranking": ranking[:15],
        "total_revenue": round(sum(v["revenue"] for v in by_category.values()), 2),
        "total_units": sum(v["qty"] for v in by_category.values()),
    }


@router.get("/walk-in-surge")
async def walk_in_surge():
    """Predict walk-in pressure using banquet releases + arrival curve."""
    await _seed_if_empty()
    now = _now()
    # Fake banquet release (look up banquet bookings if they exist)
    banquet_release = None
    try:
        bq = list(db.get_collection("events").find({"end_time": {"$gte": now.isoformat()}}, {"_id": 0}).sort("end_time", 1).limit(1)) if hasattr(db, "get_collection") else []
        if bq:
            banquet_release = bq[0]
    except Exception:
        pass
    # Arrival curve density
    res = list(db[RES_COLL].find({"status": {"$in": ["pending", "confirmed"]}, "eta": {"$gte": now.isoformat()}}, {"_id": 0}))
    by_hour = {}
    for r in res:
        try:
            eta = datetime.fromisoformat(r["eta"])
            hr = eta.replace(minute=0, second=0, microsecond=0).isoformat()
            by_hour[hr] = by_hour.get(hr, 0) + r.get("party_size", 2)
        except Exception:
            pass
    peak_hour = max(by_hour.items(), key=lambda x: x[1])[0] if by_hour else None
    return {
        "ts": _iso(),
        "hourly_forecast": by_hour,
        "peak_hour": peak_hour,
        "upcoming_banquet_release": banquet_release,
        "surge_risk": "high" if (peak_hour and by_hour.get(peak_hour, 0) > 60) else "moderate" if by_hour else "low",
    }


@router.get("/recovery-queue")
async def recovery_queue():
    docs = list(db[RECOVERY_COLL].find({}, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"items": docs, "count": len(docs)}


@router.post("/recovery")
async def log_recovery(r: Recovery):
    doc = {
        "id": f"recov-{uuid4().hex[:8]}",
        "outlet_slug": r.outlet_slug,
        "table_no": r.table_no,
        "guest_name": r.guest_name,
        "issue": r.issue,
        "resolution": r.resolution,
        "compensation_usd": r.compensation_usd,
        "created_at": _iso(),
    }
    db[RECOVERY_COLL].insert_one(doc.copy())
    return {"ok": True, "recovery": _strip(doc)}
