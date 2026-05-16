"""
Outlet Capture System
=====================
Per-outlet capture-ratio tracking + multi-horizon Monte Carlo forecasts
+ event-driven debounced recompute + active-learning loop hooks.

Architecture: docs/financial/OUTLET_CAPTURE_ARCHITECTURE.md

Three capture ratios computed and stored:
  · total_capture     = unique_outlet_guests / total_property_guests
  · eligible_capture  = unique_outlet_guests / eligible_property_guests
  · available_capture = actual_touches      / outlet_max_capacity

Forecasts produced at horizons {1, 3, 5, 10, 21} days with P10/P50/P90
Monte Carlo bands. Accuracy (MAPE) published per outlet per horizon —
no claims of precision the model can't deliver.

Doctrine alignment:
  · §3.1 append-only — `outlet_capture_events` is append-only
  · §2.4 retrospective — the active-learning loop IS the retrospective
  · §1.1 transparency — accuracy gauge published; bands not compressed
"""
from datetime import datetime, timezone, timedelta, date as date_cls
from collections import defaultdict
from statistics import mean, median, stdev
from uuid import uuid4
import math
import random
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import db

router = APIRouter(prefix="/api/outlet-capture", tags=["outlet-capture"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())
_today_iso = lambda: datetime.now(timezone.utc).date().isoformat()

# ─────────────────────────────────────────────────────────────────
# Constants — these are bounds, not magic numbers. They cap the
# learning loop's authority so a single bad day can't blow out the
# weights. Values are conservative on purpose.
# ─────────────────────────────────────────────────────────────────
HORIZONS = [1, 3, 5, 10, 21]                  # days ahead to forecast
WEIGHT_NUDGE_MAX_PCT = 0.05                   # max single-day weight nudge: 5%
COLD_START_DAYS = 30                          # show "cold-start" banner this long
DEBOUNCE_SECONDS = 60                         # event recompute debounce
ACCURACY_WINDOW_DAYS = 60                     # MAPE plotted over this window
PRODUCTION_BUFFER_PERCENTILE = 75             # over-prep cap = P75, not P90

# Cold-start default capture ratios by outlet type. These are the
# floor when no actuals exist; they fade as actuals arrive.
COLD_START_DEFAULTS = {
    "restaurant":   {"eligible": 0.62, "available": 0.55, "total": 0.45},
    "ird":          {"eligible": 0.18, "available": 0.40, "total": 0.15},
    "banquet":      {"eligible": 0.30, "available": 0.65, "total": 0.20},
    "bar":          {"eligible": 0.45, "available": 0.50, "total": 0.35},
    "spa":          {"eligible": 0.22, "available": 0.60, "total": 0.18},
    "retail":       {"eligible": 0.30, "available": 0.40, "total": 0.25},
    "minibar":      {"eligible": 0.40, "available": 0.30, "total": 0.35},
    "pool_bar":     {"eligible": 0.35, "available": 0.50, "total": 0.28},
    "cafe":         {"eligible": 0.55, "available": 0.45, "total": 0.40},
    "default":      {"eligible": 0.40, "available": 0.50, "total": 0.30},
}

# DOW signal weights at cold-start. Updated by the learner.
DOW_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
COLD_START_DOW = {  # cover-volume multiplier vs. property mean
    "restaurant": [0.78, 0.82, 0.88, 0.96, 1.18, 1.32, 1.06],
    "ird":        [0.92, 0.94, 0.96, 1.00, 1.08, 1.12, 1.08],
    "banquet":    [0.40, 0.55, 0.70, 0.80, 1.20, 1.60, 0.75],
    "bar":        [0.70, 0.75, 0.85, 0.95, 1.30, 1.40, 1.05],
    "spa":        [0.65, 0.80, 0.90, 1.00, 1.10, 1.30, 1.25],
    "retail":     [0.85, 0.90, 0.95, 1.00, 1.10, 1.20, 1.00],
    "default":    [0.85, 0.90, 0.95, 1.00, 1.10, 1.20, 1.00],
}


# ─────────────────────────────────────────────────────────────────
# Indexes (idempotent — create_index is safe to call repeatedly)
# ─────────────────────────────────────────────────────────────────
def _ensure_indexes():
    db["outlets"].create_index([("property_id", 1), ("outlet_id", 1)], unique=True)
    db["outlets"].create_index("active")
    db["outlet_capture_events"].create_index([("outlet_id", 1), ("date", 1)])
    db["outlet_capture_events"].create_index([("property_id", 1), ("date", 1)])
    db["outlet_capture_events"].create_index("ts")
    db["outlet_capture_daily"].create_index([("outlet_id", 1), ("date", 1)], unique=True)
    db["outlet_capture_daily"].create_index([("property_id", 1), ("date", 1)])
    db["outlet_capture_forecasts"].create_index([("outlet_id", 1), ("for_date", 1), ("horizon_days", 1)])
    db["outlet_capture_forecasts"].create_index("forecast_made_at")
    db["outlet_capture_weights"].create_index([("outlet_id", 1)], unique=True)
    db["outlet_capture_accuracy"].create_index([("outlet_id", 1), ("horizon_days", 1), ("for_date", 1)])
    db["outlet_capture_recompute_q"].create_index("ready_at")
    db["outlet_capture_recompute_q"].create_index([("outlet_id", 1), ("for_date", 1)])
    db["outlet_capture_forecast_trials"].create_index("forecast_id", unique=True)
    db["outlet_capture_forecast_trials"].create_index([("outlet_id", 1), ("for_date", 1)])
    db["outlet_capture_retrospectives"].create_index([("outlet_id", 1), ("for_date", 1)], unique=True)


try:
    _ensure_indexes()
except Exception as exc:                      # pragma: no cover
    # database may be unavailable at import time in certain test setups;
    # indexes are created on first call instead.
    pass


# ─────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────
class OutletHours(BaseModel):
    day: str                                    # "mon" .. "sun"
    open: str                                   # "07:00"
    close: str                                  # "22:00"
    dayparts: List[str] = Field(default_factory=list)


class OutletEligibility(BaseModel):
    min_age: int = 0
    requires_reservation: bool = False
    room_classes: List[str] = Field(default_factory=lambda: ["all"])
    ticketed_event: bool = False


class OutletCapacity(BaseModel):
    seats: int = 0
    turns_per_service: float = 1.0
    max_daily_covers: int = 0


class OutletCreate(BaseModel):
    outlet_id: str
    property_id: str
    name: str
    outlet_type: str                            # restaurant | ird | banquet | etc.
    capacity: OutletCapacity = Field(default_factory=OutletCapacity)
    hours: List[OutletHours] = Field(default_factory=list)
    eligibility: OutletEligibility = Field(default_factory=OutletEligibility)
    active: bool = True


class CaptureEvent(BaseModel):
    outlet_id: str
    property_id: str
    date: str                                   # YYYY-MM-DD
    daypart: str = "all_day"
    guest_id: Optional[str] = None
    stay_id: Optional[str] = None
    is_property_guest: bool = True
    covers: int = 1
    revenue_cents: int = 0
    source: str = "manual"


class RecomputeRequest(BaseModel):
    outlet_id: Optional[str] = None             # if absent → property-wide
    property_id: Optional[str] = None
    affected_dates: List[str] = Field(default_factory=list)
    reason: str = "manual"


# ─────────────────────────────────────────────────────────────────
# Outlet registry
# ─────────────────────────────────────────────────────────────────
@router.get("/outlets")
async def list_outlets(property_id: Optional[str] = None, active_only: bool = True):
    """List outlets, optionally scoped to a property."""
    query: Dict = {}
    if property_id:
        query["property_id"] = property_id
    if active_only:
        query["active"] = True
    outlets = list(db["outlets"].find(query, {"_id": 0}))
    return {"count": len(outlets), "outlets": outlets}


@router.post("/outlets")
async def create_outlet(outlet: OutletCreate):
    """Register a new outlet. Auto-creates a cold-start weights row
    so the outlet appears in the dashboard immediately with sensible
    defaults that fade as actuals arrive."""
    existing = db["outlets"].find_one({
        "property_id": outlet.property_id,
        "outlet_id": outlet.outlet_id,
    })
    if existing:
        raise HTTPException(409, f"Outlet {outlet.outlet_id} already exists for {outlet.property_id}")

    now = _now()
    # Compute max_daily_covers if not provided
    if not outlet.capacity.max_daily_covers and outlet.capacity.seats:
        services = max(1, sum(len(h.dayparts) for h in outlet.hours))
        outlet.capacity.max_daily_covers = int(
            outlet.capacity.seats * outlet.capacity.turns_per_service * max(1, services / 7)
        )

    record = outlet.model_dump()
    record.update({
        "created_at": now,
        "updated_at": now,
        "first_actual_at": None,                # set when first capture event arrives
    })
    db["outlets"].insert_one(record)

    _seed_cold_start_weights(outlet.outlet_id, outlet.outlet_type)
    _publish_outlet_created(outlet.outlet_id, outlet.property_id, outlet.outlet_type)

    record.pop("_id", None)
    return {"outlet": record, "cold_start_weights_seeded": True}


@router.patch("/outlets/{outlet_id}")
async def update_outlet(outlet_id: str, patch: Dict):
    """Update outlet metadata. Capacity / hours / eligibility changes
    queue a recompute because available_capture math depends on them."""
    patch["updated_at"] = _now()
    result = db["outlets"].update_one({"outlet_id": outlet_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(404, "Outlet not found")
    if any(k in patch for k in ("capacity", "hours", "eligibility")):
        _enqueue_recompute(outlet_id, _next_n_dates(21), reason="outlet_metadata_changed")
    return {"updated": True}


# ─────────────────────────────────────────────────────────────────
# Capture event ingestion (called by POS adapter, reservations,
# concierge, etc.)
# ─────────────────────────────────────────────────────────────────
@router.post("/events")
async def record_event(event: CaptureEvent):
    """Append a capture event to the immutable log. Triggers debounced
    recompute of forecasts that depend on this date."""
    outlet = db["outlets"].find_one({"outlet_id": event.outlet_id})
    if not outlet:
        raise HTTPException(404, f"Outlet {event.outlet_id} not registered")

    record = event.model_dump()
    record.update({
        "event_id": _uid(),
        "ts": _now(),
        "doctrine_version_hash": _current_doctrine_hash(),
    })
    db["outlet_capture_events"].insert_one(record)

    # Mark first_actual_at so the cold-start banner can clear
    if not outlet.get("first_actual_at"):
        db["outlets"].update_one(
            {"outlet_id": event.outlet_id},
            {"$set": {"first_actual_at": _now()}},
        )

    # Recompute today's daily aggregation immediately (cheap)
    _refresh_daily_aggregation(event.outlet_id, event.date)

    # Queue forecast recompute for affected horizon (debounced)
    _enqueue_recompute(event.outlet_id, [event.date], reason=f"event:{event.source}")

    record.pop("_id", None)
    return {"event": record, "recompute_queued": True}


# ─────────────────────────────────────────────────────────────────
# Capture ratios (live read)
# ─────────────────────────────────────────────────────────────────
@router.get("/ratios/{outlet_id}")
async def get_ratios(outlet_id: str, days: int = Query(7, ge=1, le=90)):
    """Per-day capture ratios for an outlet over the recent window.
    Reads pre-aggregated `outlet_capture_daily` for speed."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()
    rows = list(
        db["outlet_capture_daily"].find(
            {"outlet_id": outlet_id, "date": {"$gte": cutoff}},
            {"_id": 0},
        ).sort("date", 1)
    )
    if not rows:
        return {"outlet_id": outlet_id, "rows": [], "summary": None}

    summary = {
        "avg_eligible_capture": round(mean(r["eligible_capture"] for r in rows), 4),
        "avg_available_capture": round(mean(r["available_capture"] for r in rows), 4),
        "avg_total_capture": round(mean(r["total_capture"] for r in rows), 4),
        "best_day": max(rows, key=lambda r: r["eligible_capture"])["date"],
        "worst_day": min(rows, key=lambda r: r["eligible_capture"])["date"],
        "days_covered": len(rows),
    }
    return {"outlet_id": outlet_id, "rows": rows, "summary": summary}


@router.get("/ratios/property/{property_id}")
async def property_ratios(property_id: str, day: Optional[str] = None):
    """Cross-outlet capture snapshot for a property on a date.
    Surfaces the headroom — what we'd earn at top-decile capture."""
    target_date = day or _today_iso()
    rows = list(
        db["outlet_capture_daily"].find(
            {"property_id": property_id, "date": target_date},
            {"_id": 0},
        )
    )
    if not rows:
        return {"property_id": property_id, "date": target_date, "outlets": []}

    # Compute headroom: revenue if every outlet hit its top-decile
    # historical eligible_capture
    headroom_total_cents = 0
    enriched = []
    for r in rows:
        outlet_id = r["outlet_id"]
        history = list(
            db["outlet_capture_daily"].find(
                {"outlet_id": outlet_id},
                {"_id": 0, "eligible_capture": 1, "revenue_cents": 1, "covers": 1},
            ).sort("date", -1).limit(90)
        )
        if len(history) >= 10:
            top_decile_capture = sorted(
                (h["eligible_capture"] for h in history), reverse=True
            )[max(1, len(history) // 10) - 1]
            avg_revenue_per_capture_pt = (
                mean(h["revenue_cents"] / max(0.001, h["eligible_capture"]) for h in history if h["eligible_capture"] > 0)
                if any(h["eligible_capture"] > 0 for h in history) else 0
            )
            potential_cents = int(top_decile_capture * avg_revenue_per_capture_pt)
            headroom_cents = max(0, potential_cents - r["revenue_cents"])
        else:
            top_decile_capture = None
            headroom_cents = 0
        headroom_total_cents += headroom_cents
        enriched.append({**r, "top_decile_capture": top_decile_capture, "headroom_cents": headroom_cents})

    return {
        "property_id": property_id,
        "date": target_date,
        "outlets": enriched,
        "total_revenue_capture_potential_cents": headroom_total_cents,
    }


# ─────────────────────────────────────────────────────────────────
# Forecast — Monte Carlo at multiple horizons
# ─────────────────────────────────────────────────────────────────
@router.get("/forecast/{outlet_id}")
async def get_forecast(outlet_id: str, horizons: Optional[str] = None):
    """Per-outlet forecast at one or more horizons.
    `horizons` is a comma-separated list (e.g. "1,3,5,10,21").
    Defaults to all five canonical horizons."""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, "Outlet not found")

    requested = [int(h) for h in (horizons or "1,3,5,10,21").split(",")]
    today = datetime.now(timezone.utc).date()
    forecasts = []

    for h in requested:
        for_date = (today + timedelta(days=h)).isoformat()
        cached = db["outlet_capture_forecasts"].find_one(
            {"outlet_id": outlet_id, "for_date": for_date, "horizon_days": h},
            {"_id": 0},
            sort=[("forecast_made_at", -1)],
        )
        if cached:
            forecasts.append(cached)
        else:
            fresh = _compute_forecast(outlet, for_date, h)
            forecasts.append(fresh)

    # Compute production recommendation (P75 — over-prep buffer
    # bounded to prevent waste)
    for f in forecasts:
        f["production_recommendation"] = _interpolate_percentile(
            f["p10"], f["p50"], f["p90"], PRODUCTION_BUFFER_PERCENTILE,
        )

    return {
        "outlet_id": outlet_id,
        "outlet_type": outlet["outlet_type"],
        "is_cold_start": _is_cold_start(outlet),
        "generated_at": _now(),
        "forecasts": forecasts,
    }


@router.post("/forecast/recompute")
async def trigger_recompute(req: RecomputeRequest):
    """Manually trigger recompute. Honors the debounce queue —
    requests for the same (outlet, date) coalesce."""
    if req.outlet_id:
        outlet_ids = [req.outlet_id]
    elif req.property_id:
        outlet_ids = [
            o["outlet_id"]
            for o in db["outlets"].find({"property_id": req.property_id, "active": True}, {"_id": 0, "outlet_id": 1})
        ]
    else:
        raise HTTPException(400, "Must provide outlet_id or property_id")

    affected = req.affected_dates or _next_n_dates(21)
    queued = 0
    for outlet_id in outlet_ids:
        queued += _enqueue_recompute(outlet_id, affected, reason=req.reason)
    return {"queued": queued, "affected_outlets": len(outlet_ids), "affected_dates": len(affected)}


# ─────────────────────────────────────────────────────────────────
# Accuracy gauge — published honestly
# ─────────────────────────────────────────────────────────────────
@router.get("/accuracy/{outlet_id}")
async def get_accuracy(outlet_id: str):
    """Rolling MAPE per horizon over the accuracy window. The team
    watches this number drop as the loop converges."""
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=ACCURACY_WINDOW_DAYS)).isoformat()
    rows = list(
        db["outlet_capture_accuracy"].find(
            {"outlet_id": outlet_id, "for_date": {"$gte": cutoff}},
            {"_id": 0},
        ).sort("for_date", 1)
    )
    by_horizon: Dict[int, List[Dict]] = defaultdict(list)
    for r in rows:
        by_horizon[r["horizon_days"]].append(r)

    summary = {}
    for h in HORIZONS:
        h_rows = by_horizon.get(h, [])
        if h_rows:
            errors = [r["abs_pct_error"] for r in h_rows if r.get("abs_pct_error") is not None]
            if errors:
                summary[f"horizon_{h}d"] = {
                    "mape_current": round(mean(errors), 4),
                    "mape_min": round(min(errors), 4),
                    "mape_max": round(max(errors), 4),
                    "samples": len(errors),
                    "trend": _direction(errors),
                }
            else:
                summary[f"horizon_{h}d"] = None
        else:
            summary[f"horizon_{h}d"] = None

    return {
        "outlet_id": outlet_id,
        "window_days": ACCURACY_WINDOW_DAYS,
        "by_horizon": summary,
        "rows": rows,
    }


# ─────────────────────────────────────────────────────────────────
# Trial-level retrospective — the deep §2.4 walkback
# ─────────────────────────────────────────────────────────────────
@router.get("/retrospective/{outlet_id}")
async def get_retrospective(outlet_id: str, day: Optional[str] = None, days_back: int = Query(7, ge=1, le=30)):
    """The post-service walkback for an outlet. Returns the most recent
    trial-level retrospective (or one for a specific day), including
    the §2.5-framed walkback narrative, signal attribution from
    winning trials, and the strongest "could-have-seen" direction.

    This is the doctrine surface — Ai³ is never permitted to be
    "occasionally correct"; the walkback continues even on hits."""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, "Outlet not found")

    if day:
        retro = db["outlet_capture_retrospectives"].find_one(
            {"outlet_id": outlet_id, "for_date": day}, {"_id": 0},
        )
        if not retro:
            return {"outlet_id": outlet_id, "for_date": day, "available": False}
        return retro

    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=days_back)).isoformat()
    rows = list(
        db["outlet_capture_retrospectives"].find(
            {"outlet_id": outlet_id, "for_date": {"$gte": cutoff}},
            {"_id": 0},
        ).sort("for_date", -1)
    )
    return {
        "outlet_id": outlet_id,
        "window_days": days_back,
        "rows": rows,
        "count": len(rows),
    }


@router.post("/retrospective/{outlet_id}/run")
async def run_retrospective_now(outlet_id: str, day: Optional[str] = None):
    """Trigger the retrospective on demand (normally runs nightly via
    the scheduler). Useful for testing and for ad-hoc walkbacks."""
    target = day or (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat()
    from echo.outlet_capture_retrospective import run_retrospective
    return run_retrospective(outlet_id, target)


# ─────────────────────────────────────────────────────────────────
# Outlet dashboard — the single endpoint the frontend calls
# ─────────────────────────────────────────────────────────────────
@router.get("/dashboard/{outlet_id}")
async def outlet_dashboard(outlet_id: str):
    """Composite dashboard for the outlet view in EchoStratus.
    Includes the latest retrospective walkback so the morning view
    surfaces yesterday's lessons in §2.5 framing."""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(404, "Outlet not found")

    today_iso = _today_iso()
    today_row = db["outlet_capture_daily"].find_one(
        {"outlet_id": outlet_id, "date": today_iso}, {"_id": 0},
    )
    forecast = await get_forecast(outlet_id)
    accuracy = await get_accuracy(outlet_id)
    weights = db["outlet_capture_weights"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    history = list(
        db["outlet_capture_daily"].find({"outlet_id": outlet_id}, {"_id": 0})
        .sort("date", -1).limit(30)
    )
    latest_retrospective = db["outlet_capture_retrospectives"].find_one(
        {"outlet_id": outlet_id}, {"_id": 0}, sort=[("for_date", -1)],
    )

    return {
        "outlet": outlet,
        "is_cold_start": _is_cold_start(outlet),
        "today": today_row,
        "forecast": forecast["forecasts"],
        "accuracy": accuracy["by_horizon"],
        "weights_version": (weights or {}).get("version", 0),
        "recent_history": history,
        "drivers": (weights or {}).get("top_drivers", []),
        "retrospective": latest_retrospective,
        "doctrine_posture": (
            "The model is not permitted to be occasionally correct. "
            "Even on a hit, the walkback continues — which trial was "
            "tightest, and what did it know? The pursuit is the discipline."
        ),
        "generated_at": _now(),
    }


# ─────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────
def _seed_cold_start_weights(outlet_id: str, outlet_type: str):
    defaults = COLD_START_DEFAULTS.get(outlet_type, COLD_START_DEFAULTS["default"])
    dow = COLD_START_DOW.get(outlet_type, COLD_START_DOW["default"])
    db["outlet_capture_weights"].update_one(
        {"outlet_id": outlet_id},
        {"$set": {
            "outlet_id": outlet_id,
            "outlet_type": outlet_type,
            "version": 1,
            "is_cold_start": True,
            "ratios": defaults,
            "dow_multipliers": dict(zip(DOW_LABELS, dow)),
            "weather_sensitivity": {"rain": 1.00, "sun": 1.00, "snow": 0.95},
            "occupancy_elasticity": 1.0,
            "top_drivers": [],
            "updated_at": _now(),
        }},
        upsert=True,
    )


def _publish_outlet_created(outlet_id: str, property_id: str, outlet_type: str):
    """Fire an outlet.created event on the unified bus.
    Imported lazily because event_bus has its own initialization."""
    try:
        from event_bus import publish
        publish(
            "outlet.created",
            {"outlet_id": outlet_id, "property_id": property_id, "outlet_type": outlet_type},
            source="outlet_capture",
        )
    except Exception:
        # event_bus optional — system still works without it
        pass


def _current_doctrine_hash() -> str:
    """Returns the current doctrine version hash. Stub today; tied
    to the patent-described doctrine-as-code apparatus when that
    ships."""
    rec = db["doctrine_versions"].find_one({"current": True}, {"_id": 0, "version_hash": 1})
    return (rec or {}).get("version_hash", "doctrine-pre-versioning")


def _is_cold_start(outlet: Dict) -> bool:
    """An outlet is in cold-start until either (a) it has been live
    for COLD_START_DAYS calendar days OR (b) it has 30+ capture events,
    whichever comes first. Banner fades after that."""
    first_actual = outlet.get("first_actual_at")
    if not first_actual:
        return True
    try:
        first_dt = datetime.fromisoformat(first_actual.replace("Z", "+00:00"))
        days_live = (datetime.now(timezone.utc) - first_dt).days
        if days_live >= COLD_START_DAYS:
            return False
    except Exception:
        return True
    event_count = db["outlet_capture_events"].count_documents({"outlet_id": outlet["outlet_id"]})
    return event_count < 30


def _refresh_daily_aggregation(outlet_id: str, day: str):
    """Recompute the precomputed daily row for (outlet_id, day).
    Idempotent — overwrites prior aggregation for the same day."""
    outlet = db["outlets"].find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        return
    events = list(
        db["outlet_capture_events"].find(
            {"outlet_id": outlet_id, "date": day}, {"_id": 0},
        )
    )
    covers = sum(e.get("covers", 0) for e in events)
    revenue_cents = sum(e.get("revenue_cents", 0) for e in events)
    unique_guests = len({e.get("guest_id") for e in events if e.get("guest_id")})
    property_guests = _property_guest_count(outlet["property_id"], day)
    eligible_guests = _eligible_guest_count(outlet, day, property_guests)
    max_capacity = max(1, outlet.get("capacity", {}).get("max_daily_covers", 1))

    row = {
        "outlet_id": outlet_id,
        "property_id": outlet["property_id"],
        "date": day,
        "events": len(events),
        "covers": covers,
        "revenue_cents": revenue_cents,
        "unique_guests": unique_guests,
        "property_guests": property_guests,
        "eligible_guests": eligible_guests,
        "max_capacity": max_capacity,
        "total_capture": round(unique_guests / max(1, property_guests), 4),
        "eligible_capture": round(unique_guests / max(1, eligible_guests), 4),
        "available_capture": round(covers / max_capacity, 4),
        "updated_at": _now(),
    }
    db["outlet_capture_daily"].update_one(
        {"outlet_id": outlet_id, "date": day},
        {"$set": row},
        upsert=True,
    )


def _property_guest_count(property_id: str, day: str) -> int:
    """Total guests at the property on a given day. Reads from
    `hk_rooms` (occupancy) and `reservations` if available, else
    falls back to a property-level census."""
    occupied = db["hk_rooms"].count_documents({
        "property_id": property_id, "status": "occupied",
    })
    if occupied:
        # Approximate: 1.6 guests per occupied room (industry default)
        return int(occupied * 1.6)
    # Fallback: count distinct guests with capture events at the property today
    distinct = db["outlet_capture_events"].distinct(
        "guest_id", {"property_id": property_id, "date": day},
    )
    return max(1, len(distinct))


def _eligible_guest_count(outlet: Dict, day: str, property_guests: int) -> int:
    """Eligible-pool size given outlet hours + eligibility rules.
    Conservative: if the outlet is closed today, eligible = 0.
    If room-class restricted, prorate by historical mix."""
    dow = datetime.fromisoformat(day).strftime("%a").lower()[:3]
    hours_today = next((h for h in outlet.get("hours", []) if h.get("day") == dow), None)
    if not hours_today:
        return 0
    eligibility = outlet.get("eligibility", {})
    pool = property_guests
    if eligibility.get("room_classes") and "all" not in eligibility["room_classes"]:
        # Historical mix typically 30% suite, 60% standard, 10% club
        mix = {"suite_only": 0.30, "club_only": 0.10, "standard": 0.60}
        prorate = sum(mix.get(c, 0) for c in eligibility["room_classes"])
        pool = int(pool * max(0.05, prorate))
    if eligibility.get("min_age", 0) >= 21:
        # ~78% of property guests are typically 21+
        pool = int(pool * 0.78)
    return max(0, pool)


def _enqueue_recompute(outlet_id: str, dates: List[str], reason: str) -> int:
    """Add (outlet, date) work items to the debounce queue. Coalesces
    duplicates so the queue doesn't blow up on event storms."""
    ready_at = (datetime.now(timezone.utc) + timedelta(seconds=DEBOUNCE_SECONDS)).isoformat()
    queued = 0
    for d in dates:
        result = db["outlet_capture_recompute_q"].update_one(
            {"outlet_id": outlet_id, "for_date": d, "status": "pending"},
            {"$set": {
                "outlet_id": outlet_id,
                "for_date": d,
                "ready_at": ready_at,
                "status": "pending",
                "reason": reason,
                "updated_at": _now(),
            },
             "$setOnInsert": {"queued_at": _now()}},
            upsert=True,
        )
        if result.upserted_id:
            queued += 1
    return queued


def _compute_forecast(outlet: Dict, for_date: str, horizon_days: int) -> Dict:
    """Monte Carlo forecast for a single (outlet, date, horizon).

    Doctrine note (§2.4 retrospective practice): every individual trial's
    signal draws are recorded to `outlet_capture_forecast_trials` so the
    daily retrospective can identify the trials that landed closest to
    actual and decompose what they sampled. The model is never permitted
    to be "occasionally correct" — even on a hit, the walkback asks
    which trial was tightest and what it knew. This is the teaching
    behavior, not the metric chase."""
    weights = db["outlet_capture_weights"].find_one({"outlet_id": outlet["outlet_id"]}) or {}
    target = datetime.fromisoformat(for_date).date()
    dow = DOW_LABELS[target.weekday()]
    dow_mult_mean = weights.get("dow_multipliers", {}).get(dow, 1.0)

    # Property baseline
    property_id = outlet["property_id"]
    history = list(
        db["outlet_capture_daily"].find(
            {"outlet_id": outlet["outlet_id"]}, {"_id": 0},
        ).sort("date", -1).limit(90)
    )
    if history:
        base_covers = mean(r["covers"] for r in history)
        base_revenue_cents = mean(r["revenue_cents"] for r in history)
        if len(history) >= 7:
            cover_stdev = stdev(r["covers"] for r in history)
        else:
            cover_stdev = base_covers * 0.15
    else:
        # Cold-start: derive from outlet's max capacity + cold-start ratio
        capacity = outlet.get("capacity", {}).get("max_daily_covers", 50)
        cs_ratio = COLD_START_DEFAULTS.get(
            outlet["outlet_type"], COLD_START_DEFAULTS["default"]
        )["available"]
        base_covers = capacity * cs_ratio
        base_revenue_cents = int(base_covers * 4500)   # $45 avg check default
        cover_stdev = base_covers * 0.20

    # Horizon penalty — uncertainty grows with distance
    horizon_uncertainty = min(0.4, 0.03 * horizon_days)
    effective_stdev = cover_stdev * (1 + horizon_uncertainty)

    # Signal-distribution widths. Each trial draws from these so a
    # successful trial can be attributed to its specific draw on each
    # signal. Widths are conservative; the retrospective module nudges
    # them based on which signals consistently produced winners.
    dow_mult_width = weights.get("dow_mult_width", 0.08)
    occupancy_signal = weights.get("occupancy_elasticity", 1.0)
    occupancy_width = weights.get("occupancy_width", 0.10)
    weather_signal = 1.0    # Wired when weather feed is live
    noise_width = effective_stdev / max(1, base_covers)

    # Monte Carlo trials — record each trial's per-signal draw so the
    # retrospective can decompose the winners
    forecast_id = _uid()
    trials_for_storage: List[Dict] = []
    samples: List[float] = []
    for trial_idx in range(1000):
        dow_draw = random.gauss(dow_mult_mean, dow_mult_width)
        occ_draw = random.gauss(occupancy_signal, occupancy_width)
        weather_draw = random.gauss(weather_signal, 0.05)
        noise_draw = random.gauss(0, noise_width)
        # Composite signal product, scaled by base_covers
        signal_product = max(0.01, dow_draw * occ_draw * weather_draw * (1 + noise_draw))
        sample = max(0, base_covers * signal_product)
        samples.append(sample)
        # Store every 10th trial to bound storage; tighter sampling
        # at the tails would be even better but this is enough for
        # signal attribution to work.
        if trial_idx % 10 == 0:
            trials_for_storage.append({
                "trial_idx": trial_idx,
                "sample": round(sample, 2),
                "draws": {
                    "dow_mult": round(dow_draw, 4),
                    "occupancy": round(occ_draw, 4),
                    "weather": round(weather_draw, 4),
                    "noise": round(noise_draw, 4),
                },
            })

    samples.sort()
    p10 = round(samples[100])
    p50 = round(samples[500])
    p90 = round(samples[900])
    avg_check = base_revenue_cents / max(1, base_covers) if base_covers else 4500

    forecast = {
        "forecast_id": forecast_id,
        "outlet_id": outlet["outlet_id"],
        "property_id": property_id,
        "for_date": for_date,
        "horizon_days": horizon_days,
        "forecast_made_at": _now(),
        "metric": "covers",
        "p10": p10,
        "p50": p50,
        "p90": p90,
        "p10_revenue_cents": int(p10 * avg_check),
        "p50_revenue_cents": int(p50 * avg_check),
        "p90_revenue_cents": int(p90 * avg_check),
        "drivers": [
            {"signal": "dow", "weight": dow_mult_mean, "value": dow},
            {"signal": "history_window_days", "weight": 1.0, "value": len(history)},
            {"signal": "horizon_uncertainty", "weight": horizon_uncertainty, "value": horizon_days},
        ],
        "weights_version": weights.get("version", 0),
        "model": "monte_carlo_v1",
    }
    db["outlet_capture_forecasts"].insert_one(forecast.copy())

    # Persist trial-level draws for retrospective. Stored separately
    # so the main forecast doc stays small.
    if trials_for_storage:
        db["outlet_capture_forecast_trials"].insert_one({
            "forecast_id": forecast_id,
            "outlet_id": outlet["outlet_id"],
            "for_date": for_date,
            "horizon_days": horizon_days,
            "trials": trials_for_storage,
            "trial_count_recorded": len(trials_for_storage),
            "trial_count_total": 1000,
        })

    forecast.pop("_id", None)
    return forecast


def _interpolate_percentile(p10: float, p50: float, p90: float, pct: int) -> int:
    """Linear interpolation between known percentiles to get arbitrary
    percentile (here, p75 for the production recommendation)."""
    if pct <= 10:
        return int(p10)
    if pct <= 50:
        return int(p10 + (p50 - p10) * (pct - 10) / 40)
    if pct <= 90:
        return int(p50 + (p90 - p50) * (pct - 50) / 40)
    return int(p90)


def _next_n_dates(n: int) -> List[str]:
    today = datetime.now(timezone.utc).date()
    return [(today + timedelta(days=i)).isoformat() for i in range(n)]


def _direction(values: List[float]) -> str:
    """Are recent errors trending down (good), up (bad), or flat?"""
    if len(values) < 6:
        return "insufficient_data"
    half = len(values) // 2
    early = mean(values[:half])
    late = mean(values[half:])
    if late < early * 0.92:
        return "improving"
    if late > early * 1.08:
        return "degrading"
    return "stable"


# ─────────────────────────────────────────────────────────────────
# Event-bus subscribers — debounced recompute on signals that
# change outlet forecasts.
# ─────────────────────────────────────────────────────────────────
def _affected_dates_from_payload(payload: Dict) -> List[str]:
    """Extract the list of dates a signal affects. Falls back to
    'next 21 days' if the signal is property-wide rather than
    date-specific."""
    if payload.get("date"):
        return [payload["date"]]
    if payload.get("dates"):
        return list(payload["dates"])
    if payload.get("arrival_date") and payload.get("depart_date"):
        start = datetime.fromisoformat(payload["arrival_date"]).date()
        end = datetime.fromisoformat(payload["depart_date"]).date()
        return [(start + timedelta(days=i)).isoformat() for i in range((end - start).days + 1)]
    return _next_n_dates(21)


def _outlets_for_payload(payload: Dict) -> List[str]:
    """Resolve which outlets are affected by a payload. POS events
    name the outlet; property-wide events fan out to all outlets at
    the property."""
    if payload.get("outlet_id"):
        return [payload["outlet_id"]]
    if payload.get("property_id"):
        return [
            o["outlet_id"]
            for o in db["outlets"].find(
                {"property_id": payload["property_id"], "active": True},
                {"_id": 0, "outlet_id": 1},
            )
        ]
    return []


def _on_pos_check_closed(event: Dict):
    """A check closed at the POS. Affects today's actuals + the
    forecast that depends on this outlet's velocity."""
    payload = event.get("payload", {})
    outlets = _outlets_for_payload(payload)
    if not outlets:
        return
    dates = _affected_dates_from_payload(payload) or [_today_iso()]
    for outlet_id in outlets:
        # Refresh today's actuals immediately (cheap)
        for d in dates:
            _refresh_daily_aggregation(outlet_id, d)
        # Queue forecast recompute (debounced)
        _enqueue_recompute(outlet_id, _next_n_dates(21), reason="pos.check_closed")


def _on_reservation_changed(event: Dict):
    """A reservation was created, modified, or cancelled. Affects
    forecasts for the affected stay window."""
    payload = event.get("payload", {})
    dates = _affected_dates_from_payload(payload)
    outlets = _outlets_for_payload(payload) or [
        o["outlet_id"]
        for o in db["outlets"].find(
            {"property_id": payload.get("property_id", "default"), "active": True},
            {"_id": 0, "outlet_id": 1},
        )
    ]
    for outlet_id in outlets:
        _enqueue_recompute(outlet_id, dates, reason=event.get("event_type", "reservation"))


def _on_occupancy_changed(event: Dict):
    """Property occupancy changed. Affects every outlet at the
    property for the affected day."""
    payload = event.get("payload", {})
    dates = _affected_dates_from_payload(payload) or [_today_iso()]
    outlets = _outlets_for_payload(payload)
    for outlet_id in outlets:
        _enqueue_recompute(outlet_id, dates, reason="occupancy.changed")


def _on_manager_note_or_override(event: Dict):
    """Manager added a forecast note or override. Trust it: queue
    immediate recompute for the affected outlet × date."""
    payload = event.get("payload", {})
    outlets = _outlets_for_payload(payload) or [payload.get("outlet_id")]
    dates = _affected_dates_from_payload(payload)
    for outlet_id in outlets:
        if outlet_id:
            _enqueue_recompute(outlet_id, dates, reason="manager_signal")


def _on_weather_updated(event: Dict):
    """Weather forecast for the property changed. Affects every
    outlet at the property for the next 7 days."""
    payload = event.get("payload", {})
    outlets = _outlets_for_payload(payload)
    dates = _next_n_dates(7)
    for outlet_id in outlets:
        _enqueue_recompute(outlet_id, dates, reason="weather.updated")


_SUBSCRIPTIONS_REGISTERED = False


def subscribe_recompute_triggers() -> Dict:
    """Register all recompute subscribers with the unified event bus.
    Idempotent — safe to call multiple times. Returns a list of the
    event types subscribed to."""
    global _SUBSCRIPTIONS_REGISTERED
    if _SUBSCRIPTIONS_REGISTERED:
        return {"already_registered": True}

    try:
        from event_bus import subscribe
    except Exception as exc:                  # pragma: no cover
        return {"error": f"event_bus unavailable: {exc}", "registered": []}

    bindings = [
        ("pos.check_closed", _on_pos_check_closed),
        ("reservation.created", _on_reservation_changed),
        ("reservation.modified", _on_reservation_changed),
        ("reservation.cancelled", _on_reservation_changed),
        ("occupancy.changed", _on_occupancy_changed),
        ("forecast.note_added", _on_manager_note_or_override),
        ("forecast.override_saved", _on_manager_note_or_override),
        ("weather.updated", _on_weather_updated),
    ]
    for event_type, handler in bindings:
        try:
            subscribe(event_type, handler, name=f"outlet_capture::{handler.__name__}")
        except Exception:
            # event_bus version mismatch — keep going so other subs still register
            pass

    _SUBSCRIPTIONS_REGISTERED = True
    return {"registered": [b[0] for b in bindings]}


# Auto-register when the module is imported by FastAPI. Wrapped so
# that imports in test contexts (where event_bus may be stubbed) don't
# fail at import time.
try:
    subscribe_recompute_triggers()
except Exception:
    pass
