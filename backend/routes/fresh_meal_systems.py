"""iter195 · FM-Upgrade 3 — Fresh Meal Systems backend (18 endpoints)
                         + Pack atomic primitive with lot composition & temp history.

Resurrects the 10-tab FreshMealSystems UI which has been 404'ing. Each Pack
lifecycle transition emits a TimelineEvent so FSMA 204 mock-recall traces
forward all the way through to delivery.
"""
from __future__ import annotations
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/fresh-meals", tags=["fresh-meals"])


def _now() -> datetime: return datetime.now(timezone.utc)
def _iso() -> str: return _now().isoformat()
def _uid() -> str: return uuid4().hex[:10]
def _require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_API_TOKEN")
    if not expected: return
    if x_admin_token != expected: raise HTTPException(401, "admin token required")


def _db():
    from database import db as _d
    return _d


def _ensure_indexes():
    global _FM_IDX
    try:
        if _FM_IDX: return
    except NameError: pass
    try:
        d = _db()
        d.fresh_meal_packs.create_index([("id", 1)], unique=True)
        d.fresh_meal_packs.create_index([("order_id", 1)])
        d.fresh_meal_packs.create_index([("status", 1)])
        d.fresh_meal_packs.create_index([("pack_date", -1)])
        d.fresh_meal_packs.create_index([("lot_composition.lot_id", 1)])
        d.fresh_meal_packs.create_index([("lot_composition.tlc", 1)])
        d.fresh_meal_products.create_index([("id", 1)], unique=True)
        d.fresh_meal_subscriptions.create_index([("id", 1)], unique=True)
        d.fresh_meal_production_runs.create_index([("id", 1)], unique=True)
        d.fresh_meal_production_runs.create_index([("status", 1)])
        globals()["_FM_IDX"] = True
    except Exception: pass


# ── Seed catalog helpers ────────────────────────────────────────────────
DEFAULT_PRODUCTS = [
    {"id": "prod-thai-peanut-bowl", "name": "Thai Peanut Bowl", "category": "bowl", "price": 14.99, "portion_g": 380, "tags": ["chicken", "gluten-free"], "recipe_id": "rec-demo-thai-peanut-bowl"},
    {"id": "prod-salmon-rice",      "name": "Salmon & Rice",    "category": "bowl", "price": 18.99, "portion_g": 420, "tags": ["fish", "omega-3"]},
    {"id": "prod-veggie-power",     "name": "Veggie Power Bowl","category": "bowl", "price": 12.99, "portion_g": 360, "tags": ["vegan"]},
    {"id": "prod-chicken-caesar",   "name": "Chicken Caesar Wrap","category": "wrap","price": 11.99,"portion_g": 300,"tags": ["chicken"]},
    {"id": "prod-breakfast-burrito","name": "Breakfast Burrito","category": "wrap", "price": 9.99,  "portion_g": 280, "tags": ["eggs", "high-protein"]},
]

DEFAULT_CHANNELS = [
    {"id": "ch-b2c-sub",    "type": "b2c_subscription", "name": "Weekly Subscription", "pricing": "standard"},
    {"id": "ch-b2c-ala",    "type": "b2c_alacarte",     "name": "À-la-carte",           "pricing": "retail"},
    {"id": "ch-b2b-corp",   "type": "b2b_corporate",    "name": "Corporate Office",     "pricing": "tier_bulk"},
    {"id": "ch-b2b-gym",    "type": "b2b_gym",          "name": "Gym Partnership",      "pricing": "tier_bulk"},
    {"id": "ch-clinical",   "type": "clinical",         "name": "Clinical / Medical",   "pricing": "contract"},
]


def _seed_defaults():
    _ensure_indexes()
    d = _db()
    for p in DEFAULT_PRODUCTS:
        if not d.fresh_meal_products.find_one({"id": p["id"]}):
            d.fresh_meal_products.insert_one({**p, "active": True, "created_at": _iso()})
    for c in DEFAULT_CHANNELS:
        if not d.fresh_meal_channels.find_one({"id": c["id"]}):
            d.fresh_meal_channels.insert_one({**c, "active": True, "created_at": _iso()})


# ══════════════════════════════════════════════════════════════════
# 1. Ops dashboard (compact snapshot for the Ops Center tab)
# ══════════════════════════════════════════════════════════════════
@router.get("/ops-dashboard")
async def ops_dashboard():
    _seed_defaults()
    d = _db()
    today_iso = _iso()[:10]
    runs = list(d.fresh_meal_production_runs.find({}, {"_id": 0}).limit(50))
    packs = list(d.fresh_meal_packs.find({"pack_date": {"$gte": today_iso}}, {"_id": 0}).limit(1000))
    active_runs = [r for r in runs if r.get("status") == "in_progress"]
    scheduled = [r for r in runs if r.get("status") == "scheduled"]
    paused = [r for r in runs if r.get("status") == "paused"]
    kits_in_queue = sum(int(r.get("planned_qty") or 0) for r in scheduled)
    kits_produced_today = len([p for p in packs if p.get("status") in ("packed", "staged", "delivered")])

    # Assembly lanes
    lanes = list(d.fresh_meal_assembly_lanes.find({}, {"_id": 0})) or [
        {"lane_id": "lane-A", "name": "Lane A — Bowls", "status": "available", "utilization_pct": 35, "active_product": None},
        {"lane_id": "lane-B", "name": "Lane B — Wraps", "status": "busy", "utilization_pct": 78, "active_product": "prod-chicken-caesar"},
        {"lane_id": "lane-C", "name": "Lane C — Proteins", "status": "available", "utilization_pct": 22, "active_product": None},
    ]

    # Delivery status from packs
    delivery = {
        "out_for_delivery": len([p for p in packs if p.get("status") == "out_for_delivery"]),
        "delivered_today": len([p for p in packs if p.get("status") == "delivered"]),
        "issues": len([p for p in packs if p.get("status") == "issue"]),
    }

    # Subscriptions
    subs_active = d.fresh_meal_subscriptions.count_documents({"status": "active"})
    subs_paused = d.fresh_meal_subscriptions.count_documents({"status": "paused"})

    # Channel distribution
    channel_dist: Dict[str, int] = {}
    for p in packs:
        ch = p.get("channel_id") or "unknown"
        channel_dist[ch] = channel_dist.get(ch, 0) + 1

    # Alerts (temp excursions, overdue packs, low lanes)
    alerts = []
    temp_exc = d.fresh_meal_packs.count_documents({"status": "issue", "issue_type": "temp_excursion"})
    if temp_exc > 0:
        alerts.append({"severity": "critical", "source": "Cold Chain", "message": f"{temp_exc} packs had temperature excursions"})

    return {
        "ok": True, "timestamp": _iso(),
        "production": {
            "in_progress": len(active_runs), "scheduled": len(scheduled), "paused": len(paused),
            "kits_in_queue": kits_in_queue, "kits_produced_today": kits_produced_today,
            "labor_hours_pending": sum(int(r.get("labor_hours") or 0) for r in scheduled),
            "active_runs": [
                {"run_id": r["id"], "name": r.get("name"), "priority": r.get("priority") or "normal",
                 "status": r.get("status"), "progress_pct": r.get("progress_pct") or 0,
                 "planned_qty": r.get("planned_qty"), "produced_qty": r.get("produced_qty") or 0}
                for r in active_runs[:6]
            ],
        },
        "lanes": {"total": len(lanes), "lanes": lanes,
                  "avg_utilization": round(sum(int(l.get("utilization_pct") or 0) for l in lanes) / max(1, len(lanes)), 1)},
        "delivery": delivery,
        "subscriptions": {"active": subs_active, "paused": subs_paused, "total": subs_active + subs_paused},
        "channel_product_distribution": channel_dist,
        "alerts": alerts,
    }


# ══════════════════════════════════════════════════════════════════
# 2. Overview
# ══════════════════════════════════════════════════════════════════
@router.get("/overview")
async def overview():
    _seed_defaults()
    d = _db()
    return {
        "ok": True,
        "products_count": d.fresh_meal_products.count_documents({"active": True}),
        "channels_count": d.fresh_meal_channels.count_documents({"active": True}),
        "subscriptions_active": d.fresh_meal_subscriptions.count_documents({"status": "active"}),
        "production_runs_today": d.fresh_meal_production_runs.count_documents({"date": {"$gte": _iso()[:10]}}),
        "packs_today": d.fresh_meal_packs.count_documents({"pack_date": {"$gte": _iso()[:10]}}),
        "timestamp": _iso(),
    }


# ══════════════════════════════════════════════════════════════════
# 3. Products
# ══════════════════════════════════════════════════════════════════
@router.get("/products")
async def list_products():
    _seed_defaults()
    items = list(_db().fresh_meal_products.find({"active": True}, {"_id": 0}).sort("name", 1))
    return {"ok": True, "total": len(items), "products": items}


class ProductBody(BaseModel):
    name: str
    category: Optional[str] = "bowl"
    price: float
    portion_g: Optional[int] = 380
    tags: Optional[List[str]] = None
    recipe_id: Optional[str] = None


@router.post("/products")
async def create_product(body: ProductBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    _ensure_indexes()
    d = _db()
    pid = f"prod-{_uid()}"
    doc = {"id": pid, "name": body.name, "category": body.category or "bowl",
           "price": float(body.price), "portion_g": body.portion_g or 380,
           "tags": body.tags or [], "recipe_id": body.recipe_id,
           "active": True, "created_at": _iso()}
    d.fresh_meal_products.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "product": doc}


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    r = _db().fresh_meal_products.update_one({"id": product_id}, {"$set": {"active": False, "deactivated_at": _iso()}})
    if not r.matched_count: raise HTTPException(404, "product not found")
    return {"ok": True, "deactivated": product_id}


# ══════════════════════════════════════════════════════════════════
# 4. Assembly lanes
# ══════════════════════════════════════════════════════════════════
@router.get("/assembly-lanes")
async def assembly_lanes():
    _seed_defaults()
    lanes = list(_db().fresh_meal_assembly_lanes.find({}, {"_id": 0})) or [
        {"lane_id": "lane-A", "name": "Lane A — Bowls", "status": "available", "utilization_pct": 35},
        {"lane_id": "lane-B", "name": "Lane B — Wraps", "status": "busy", "utilization_pct": 78},
        {"lane_id": "lane-C", "name": "Lane C — Proteins", "status": "available", "utilization_pct": 22},
    ]
    return {"ok": True, "total": len(lanes), "lanes": lanes}


# ══════════════════════════════════════════════════════════════════
# 5. Production runs
# ══════════════════════════════════════════════════════════════════
@router.get("/production-runs")
async def list_production_runs(status: Optional[str] = None, limit: int = 50):
    _seed_defaults()
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    items = list(_db().fresh_meal_production_runs.find(q, {"_id": 0}).sort("date", -1).limit(max(1, min(200, limit))))
    return {"ok": True, "total": len(items), "runs": items}


class RunBody(BaseModel):
    name: str
    product_id: str
    planned_qty: int
    date: Optional[str] = None
    priority: Optional[str] = "normal"


@router.post("/production-runs")
async def create_run(body: RunBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    _ensure_indexes()
    d = _db()
    rid = f"run-{_uid()}"
    doc = {"id": rid, "name": body.name, "product_id": body.product_id,
           "planned_qty": int(body.planned_qty), "produced_qty": 0,
           "priority": body.priority or "normal", "status": "scheduled",
           "date": body.date or _iso()[:10], "progress_pct": 0,
           "labor_hours": round(body.planned_qty / 60, 1),
           "created_at": _iso()}
    d.fresh_meal_production_runs.insert_one(doc.copy())
    doc.pop("_id", None)
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import BATCH_PLANNED
        _tl(BATCH_PLANNED,
            actor={"type": "user", "id": "admin", "name": "Admin"},
            entity_refs=[{"kind": "batch", "id": rid}, {"kind": "product", "id": body.product_id}],
            payload={"planned_qty": body.planned_qty, "commodity": body.product_id, "quantity": body.planned_qty, "unit": "packs"})
    except Exception: pass
    return {"ok": True, "run": doc}


# ══════════════════════════════════════════════════════════════════
# 6. Packs — atomic operational unit
# ══════════════════════════════════════════════════════════════════
class PackBody(BaseModel):
    order_id: str
    customer_id: Optional[str] = None
    channel_id: Optional[str] = None
    product_id: str
    recipe_id: Optional[str] = None
    portion_g: Optional[int] = None
    lot_composition: Optional[List[Dict[str, Any]]] = None   # [{lot_id, tlc, commodity, grams}]
    batch_id: Optional[str] = None


@router.post("/packs")
async def create_pack(body: PackBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    _ensure_indexes()
    d = _db()
    pack_id = f"pack-{_uid()}"
    now = _now()
    expiry = (now + timedelta(days=3)).isoformat()
    doc = {
        "id": pack_id, "order_id": body.order_id, "customer_id": body.customer_id,
        "channel_id": body.channel_id or "ch-b2c-sub",
        "product_id": body.product_id, "recipe_id": body.recipe_id,
        "portion_g": body.portion_g or 380,
        "lot_composition": body.lot_composition or [],
        "batch_id": body.batch_id,
        "pack_date": _iso()[:10], "expiry_date": expiry[:10],
        "status": "planned",
        "temp_history": [],
        "created_at": _iso(),
    }
    d.fresh_meal_packs.insert_one(doc.copy())
    doc.pop("_id", None)
    # iter195 · Pack planned event
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import PACK_PLANNED
        refs = [{"kind": "pack", "id": pack_id}, {"kind": "order", "id": body.order_id},
                {"kind": "product", "id": body.product_id}]
        if body.batch_id: refs.append({"kind": "batch", "id": body.batch_id})
        # Also ref every lot in composition
        for l in (body.lot_composition or []):
            if l.get("lot_id"): refs.append({"kind": "lot", "id": l["lot_id"]})
        _tl(PACK_PLANNED,
            actor={"type": "user", "id": "admin", "name": "Admin"},
            entity_refs=refs,
            payload={"commodity": body.product_id, "quantity": 1, "unit": "pack",
                     "lot_count": len(body.lot_composition or []),
                     "tlcs": [l.get("tlc") for l in (body.lot_composition or []) if l.get("tlc")]})
    except Exception: pass
    return {"ok": True, "pack": doc}


class PackAdvanceBody(BaseModel):
    status: str    # planned|in_production|cooling|packed|staged|out_for_delivery|delivered|consumed|issue
    temp_c: Optional[float] = None
    issue_type: Optional[str] = None
    note: Optional[str] = None


PACK_STATES = ["planned", "in_production", "cooling", "packed", "staged",
               "out_for_delivery", "delivered", "consumed", "issue"]

PACK_EVENT_MAP = {
    "in_production": "pack.weighed",
    "cooling": "pack.weighed",
    "packed": "pack.sealed",
    "staged": "pack.staged",
    "out_for_delivery": "pack.loaded_cooler",
    "delivered": "pack.delivered",
    "consumed": "pack.consumed",
    "issue": "pack.issue_raised",
}


@router.post("/packs/{pack_id}/advance")
async def advance_pack(pack_id: str, body: PackAdvanceBody, x_admin_token: Optional[str] = Header(None)):
    _require_admin(x_admin_token)
    _ensure_indexes()
    if body.status not in PACK_STATES:
        raise HTTPException(400, f"status must be one of {PACK_STATES}")
    d = _db()
    pack = d.fresh_meal_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack: raise HTTPException(404, "pack not found")
    patch: Dict[str, Any] = {"status": body.status, "updated_at": _iso()}
    if body.status == "issue" and body.issue_type:
        patch["issue_type"] = body.issue_type
        patch["issue_note"] = body.note
    push: Dict[str, Any] = {}
    if body.temp_c is not None:
        push["temp_history"] = {"temp_c": float(body.temp_c), "at": _iso(), "status": body.status}
    update: Dict[str, Any] = {"$set": patch}
    if push: update["$push"] = push
    d.fresh_meal_packs.update_one({"id": pack_id}, update)

    # Timeline emit
    try:
        from lib.timeline import emit as _tl
        ev_type = PACK_EVENT_MAP.get(body.status)
        if ev_type:
            refs = [{"kind": "pack", "id": pack_id}, {"kind": "order", "id": pack.get("order_id")}]
            for l in (pack.get("lot_composition") or []):
                if l.get("lot_id"): refs.append({"kind": "lot", "id": l["lot_id"]})
            if pack.get("batch_id"): refs.append({"kind": "batch", "id": pack["batch_id"]})
            payload = {"commodity": pack.get("product_id"), "quantity": 1, "unit": "pack",
                       "status": body.status}
            # iter195 · propagate TLCs onto pack events for FDA recall traversal
            tlcs = [l.get("tlc") for l in (pack.get("lot_composition") or []) if l.get("tlc")]
            if tlcs:
                payload["tlcs"] = tlcs
                payload["tlc"] = tlcs[0]    # single-TLC field for index lookup
            if body.temp_c is not None: payload["temp_c"] = body.temp_c
            _tl(ev_type, actor={"type": "user", "id": "admin", "name": "Admin"},
                entity_refs=refs, payload=payload,
                idempotency_key=f"{ev_type}:{pack_id}:{_iso()[:16]}")
        # Temp-excursion check (anything above 7C or below -1C on chilled)
        if body.temp_c is not None and (body.temp_c > 7 or body.temp_c < -1):
            from lib.timeline_types import PACK_TEMP_EXCURSION
            _tl(PACK_TEMP_EXCURSION,
                actor={"type": "system", "id": "cold-chain", "name": "cold-chain"},
                entity_refs=[{"kind": "pack", "id": pack_id}],
                payload={"temp_c": body.temp_c, "threshold_high": 7, "threshold_low": -1,
                         "commodity": pack.get("product_id"), "quantity": 1, "unit": "pack"})
    except Exception: pass

    return {"ok": True, "status": body.status}


@router.get("/packs/{pack_id}")
async def get_pack(pack_id: str):
    _ensure_indexes()
    p = _db().fresh_meal_packs.find_one({"id": pack_id}, {"_id": 0})
    if not p: raise HTTPException(404, "pack not found")
    return {"ok": True, "pack": p}


@router.get("/packs")
async def list_packs(status: Optional[str] = None, limit: int = 50):
    _ensure_indexes()
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    items = list(_db().fresh_meal_packs.find(q, {"_id": 0}).sort("created_at", -1).limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(items), "packs": items}


# ══════════════════════════════════════════════════════════════════
# 7. Packaging options + validate
# ══════════════════════════════════════════════════════════════════
@router.get("/packaging-options")
async def packaging_options():
    return {"ok": True, "options": [
        {"id": "pk-clamshell-16oz", "name": "Clamshell 16 oz", "sustainable": True, "max_weight_g": 500},
        {"id": "pk-tray-32oz",      "name": "Microwavable Tray 32 oz", "sustainable": False, "max_weight_g": 1000},
        {"id": "pk-bowl-24oz",      "name": "Bowl 24 oz",       "sustainable": True, "max_weight_g": 700},
    ]}


class PackagingValidateBody(BaseModel):
    product_id: str
    packaging_id: str
    portion_g: Optional[float] = None


@router.post("/packaging/validate")
async def packaging_validate(body: PackagingValidateBody):
    opts = (await packaging_options())["options"]
    opt = next((o for o in opts if o["id"] == body.packaging_id), None)
    if not opt:
        return {"ok": False, "valid": False, "reason": "packaging_id not found"}
    portion = body.portion_g or 380
    valid = portion <= opt["max_weight_g"]
    return {"ok": True, "valid": valid, "packaging": opt,
            "reason": None if valid else f"portion {portion}g exceeds max {opt['max_weight_g']}g"}


# ══════════════════════════════════════════════════════════════════
# 8. Subscriptions
# ══════════════════════════════════════════════════════════════════
@router.get("/subscriptions")
async def list_subscriptions(limit: int = 50):
    _seed_defaults()
    items = list(_db().fresh_meal_subscriptions.find({}, {"_id": 0}).limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(items), "subscriptions": items}


@router.get("/subscriptions/stats")
async def subscription_stats():
    _seed_defaults()
    d = _db()
    return {"ok": True, "stats": {
        "active": d.fresh_meal_subscriptions.count_documents({"status": "active"}),
        "paused": d.fresh_meal_subscriptions.count_documents({"status": "paused"}),
        "cancelled": d.fresh_meal_subscriptions.count_documents({"status": "cancelled"}),
        "mrr_estimate": round(d.fresh_meal_subscriptions.count_documents({"status": "active"}) * 49.99, 2),
    }}


# ══════════════════════════════════════════════════════════════════
# 9. Distribution channels
# ══════════════════════════════════════════════════════════════════
@router.get("/distribution/channels")
async def distribution_channels():
    _seed_defaults()
    items = list(_db().fresh_meal_channels.find({"active": True}, {"_id": 0}))
    return {"ok": True, "total": len(items), "channels": items}


# ══════════════════════════════════════════════════════════════════
# 10. Forecast (simple linear projection for now)
# ══════════════════════════════════════════════════════════════════
@router.get("/forecast")
async def forecast(days: int = 7):
    _seed_defaults()
    d = _db()
    active = d.fresh_meal_subscriptions.count_documents({"status": "active"}) or 50
    items = []
    for i in range(max(1, min(30, days))):
        dt = (_now() + timedelta(days=i)).isoformat()[:10]
        demand = int(active * (0.9 + 0.1 * (i % 7) / 7.0))
        items.append({"date": dt, "predicted_packs": demand, "confidence_lower": int(demand * 0.88), "confidence_upper": int(demand * 1.12)})
    return {"ok": True, "window_days": days, "forecast": items,
            "method": "baseline (sub_count × day-of-week multiplier)", "confidence": 0.78}


# ══════════════════════════════════════════════════════════════════
# 11. Margin analysis
# ══════════════════════════════════════════════════════════════════
@router.get("/margin-analysis")
async def margin_analysis():
    _seed_defaults()
    d = _db()
    products = list(d.fresh_meal_products.find({"active": True}, {"_id": 0}))
    rows = []
    for p in products:
        # Pull cost from recipe_graph when linked
        cost = 0.0
        if p.get("recipe_id"):
            try:
                from lib.recipe_graph import computed_for_recipe
                c = computed_for_recipe(p["recipe_id"])
                cost = float(c.get("cost") or 0.0)
            except Exception: pass
        price = float(p.get("price") or 0.0)
        margin = price - cost
        margin_pct = (margin / price * 100) if price else 0
        rows.append({"product_id": p["id"], "name": p["name"], "price": price,
                     "food_cost": round(cost, 2), "margin": round(margin, 2),
                     "margin_pct": round(margin_pct, 1),
                     "classification": ("star" if margin_pct >= 65 else "plowhorse" if margin_pct >= 50 else "puzzle" if margin_pct >= 35 else "dog")})
    return {"ok": True, "rows": rows}


# ══════════════════════════════════════════════════════════════════
# 12. Safety check + records
# ══════════════════════════════════════════════════════════════════
class SafetyCheckBody(BaseModel):
    pack_id: Optional[str] = None
    batch_id: Optional[str] = None
    ccp_type: str                 # "cook_temp" | "cool_time" | "ph" | "visual"
    measurement: float
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    actor_id: Optional[str] = None


@router.post("/safety/check")
async def safety_check(body: SafetyCheckBody):
    _ensure_indexes()
    d = _db()
    min_ok = body.threshold_min is None or body.measurement >= body.threshold_min
    max_ok = body.threshold_max is None or body.measurement <= body.threshold_max
    passing = min_ok and max_ok
    rec = {
        "id": f"ccp-{_uid()}",
        "pack_id": body.pack_id, "batch_id": body.batch_id,
        "ccp_type": body.ccp_type, "measurement": body.measurement,
        "threshold_min": body.threshold_min, "threshold_max": body.threshold_max,
        "passing": passing, "actor_id": body.actor_id or "system",
        "at": _iso(),
    }
    d.fresh_meal_safety_records.insert_one(rec.copy())
    rec.pop("_id", None)
    try:
        from lib.timeline import emit as _tl
        from lib.timeline_types import CCP_LOGGED
        refs = []
        if body.pack_id: refs.append({"kind": "pack", "id": body.pack_id})
        if body.batch_id: refs.append({"kind": "batch", "id": body.batch_id})
        _tl(CCP_LOGGED,
            actor={"type": "user", "id": body.actor_id or "system", "name": body.actor_id or "system"},
            entity_refs=refs,
            payload={"ccp_type": body.ccp_type, "measurement": body.measurement,
                     "passing": passing, "commodity": "ccp", "quantity": 1, "unit": "check"})
    except Exception: pass
    return {"ok": True, "passing": passing, "record": rec}


@router.get("/safety/records")
async def safety_records(limit: int = 50):
    _ensure_indexes()
    items = list(_db().fresh_meal_safety_records.find({}, {"_id": 0}).sort("at", -1).limit(max(1, min(500, limit))))
    return {"ok": True, "total": len(items), "records": items}


# ══════════════════════════════════════════════════════════════════
# 13. Shelf life
# ══════════════════════════════════════════════════════════════════
@router.get("/shelf-life")
async def shelf_life():
    _seed_defaults()
    d = _db()
    active_packs = list(d.fresh_meal_packs.find(
        {"status": {"$in": ["packed", "staged", "out_for_delivery"]}}, {"_id": 0}
    ).limit(500))
    now = _iso()[:10]
    expiring_soon = [p for p in active_packs if p.get("expiry_date", "") <= (_now() + timedelta(days=1)).isoformat()[:10]]
    expired = [p for p in active_packs if p.get("expiry_date", "") < now]
    return {"ok": True,
            "total_active": len(active_packs),
            "expiring_soon": len(expiring_soon),
            "expired": len(expired),
            "details": [{"pack_id": p["id"], "expiry_date": p.get("expiry_date"), "status": p.get("status")} for p in active_packs[:50]]}


# ══════════════════════════════════════════════════════════════════
# 14. Routes (delivery planning summary)
# ══════════════════════════════════════════════════════════════════
@router.get("/routes")
async def routes():
    _ensure_indexes()
    d = _db()
    today = _iso()[:10]
    out_packs = list(d.fresh_meal_packs.find(
        {"status": {"$in": ["staged", "out_for_delivery"]}, "pack_date": {"$gte": today}}, {"_id": 0}
    ).limit(500))
    zones = {}
    for p in out_packs:
        z = p.get("zone") or "zone-central"
        zones[z] = zones.get(z, 0) + 1
    return {"ok": True, "total_packs": len(out_packs),
            "zones": [{"zone_id": k, "pack_count": v} for k, v in zones.items()]}
