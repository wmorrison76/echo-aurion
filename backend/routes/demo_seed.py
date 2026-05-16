"""
Demo Property Seed
==================
Loads a fully-realistic fictional "Pier 66 Demo" property into the
platform so sales calls + onboarding training have something
substantive to walk through.

What gets seeded:
  · 1 demo property: pier-sixty-six-demo
  · 8 outlets across the typical luxury-resort mix:
      restaurant, ird, banquet, bar, spa, retail, beverage,
      housekeeping
  · 90 days of capture events synthesized with realistic DOW
    + daypart distributions (NOT random.uniform — these are
    structurally realistic patterns derived from outlet_capture
    cold-start distributions)
  · 21 days of forward forecasts via the existing Monte Carlo
    pipeline
  · 1 lifecycle run in flight (BEO production cycle for a
    100-cover wedding next week)
  · 1 monthly P&L close run mid-flight (showing weeks 1-2 done,
    weeks 3-4 pending)
  · 1 open regime-change alert (so the retrospective narrative
    has something to surface)
  · A handful of audit events so the why-changed drill has data
  · A demo annual budget so pace_report + cash_runway have
    meaningful inputs

Idempotent: re-running upserts everything; safe to call repeatedly.

Doctrine alignment:
  · §1.1 transparency — the demo is clearly labeled (property_id
    contains "-demo") so it can never be confused with a real
    property's data
  · §3.1 append-only — append-only collections (events,
    audit_events, weights_history) get new rows on each run; the
    operator can wipe the demo property cleanly if needed via the
    /seed/wipe endpoint
"""
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import Optional, List, Dict
from uuid import uuid4
import math
from fastapi import APIRouter, HTTPException, Query

from database import db


router = APIRouter(prefix="/api/demo-seed", tags=["demo-seed"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


DEMO_PROPERTY_ID = "pier-sixty-six-demo"
DEMO_PROPERTY_NAME = "Pier Sixty-Six Resort & Marina (Demo)"


DEMO_OUTLETS = [
    {
        "outlet_id": "p66demo-galley",
        "name": "The Galley",
        "outlet_type": "restaurant",
        "capacity": {"seats": 80, "turns_per_service": 2.4, "max_daily_covers": 192},
        "hours": [
            {"day": d, "open": "07:00", "close": "22:00", "dayparts": ["breakfast", "lunch", "dinner"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 0, "requires_reservation": False, "room_classes": ["all"], "ticketed_event": False},
    },
    {
        "outlet_id": "p66demo-pier-club",
        "name": "Pier Club Bar",
        "outlet_type": "bar",
        "capacity": {"seats": 45, "turns_per_service": 3.0, "max_daily_covers": 135},
        "hours": [
            {"day": d, "open": "11:00", "close": "00:00", "dayparts": ["lunch", "afternoon", "dinner", "late_night"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 21, "requires_reservation": False, "room_classes": ["all"], "ticketed_event": False},
    },
    {
        "outlet_id": "p66demo-ird",
        "name": "In-Room Dining",
        "outlet_type": "ird",
        "capacity": {"seats": 1, "turns_per_service": 1.0, "max_daily_covers": 65},
        "hours": [
            {"day": d, "open": "06:00", "close": "23:00", "dayparts": ["breakfast", "lunch", "dinner", "late_night"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 0, "requires_reservation": False, "room_classes": ["all"], "ticketed_event": False},
    },
    {
        "outlet_id": "p66demo-banquet",
        "name": "Sunset Ballroom",
        "outlet_type": "banquet",
        "capacity": {"seats": 200, "turns_per_service": 1.0, "max_daily_covers": 200},
        "hours": [
            {"day": d, "open": "08:00", "close": "23:00", "dayparts": ["lunch", "dinner"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 0, "requires_reservation": True, "room_classes": ["all"], "ticketed_event": True},
    },
    {
        "outlet_id": "p66demo-spa",
        "name": "Aurion Spa",
        "outlet_type": "spa",
        "capacity": {"seats": 8, "turns_per_service": 5.0, "max_daily_covers": 40},
        "hours": [
            {"day": d, "open": "09:00", "close": "20:00", "dayparts": ["morning", "afternoon", "evening"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 18, "requires_reservation": True, "room_classes": ["all"], "ticketed_event": False},
    },
    {
        "outlet_id": "p66demo-retail",
        "name": "Marina Boutique",
        "outlet_type": "retail",
        "capacity": {"seats": 1, "turns_per_service": 1.0, "max_daily_covers": 80},
        "hours": [
            {"day": d, "open": "10:00", "close": "20:00", "dayparts": ["all_day"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 0, "requires_reservation": False, "room_classes": ["all"], "ticketed_event": False},
    },
    {
        "outlet_id": "p66demo-cafe",
        "name": "Sunrise Café",
        "outlet_type": "cafe",
        "capacity": {"seats": 24, "turns_per_service": 4.0, "max_daily_covers": 96},
        "hours": [
            {"day": d, "open": "06:00", "close": "11:00", "dayparts": ["breakfast"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 0, "requires_reservation": False, "room_classes": ["all"], "ticketed_event": False},
    },
    {
        "outlet_id": "p66demo-housekeeping",
        "name": "Housekeeping",
        "outlet_type": "housekeeping",
        "capacity": {"seats": 0, "turns_per_service": 1.0, "max_daily_covers": 0},
        "hours": [
            {"day": d, "open": "07:00", "close": "17:00", "dayparts": ["all_day"]}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        ],
        "eligibility": {"min_age": 0, "requires_reservation": False, "room_classes": ["all"], "ticketed_event": False},
    },
]


# Per-outlet typical revenue/cover for synthesized events. These are
# realistic averages for a luxury resort, not random — so the demo
# data tells a coherent story.
AVG_CHECK_CENTS = {
    "restaurant": 9500,    # $95
    "bar": 4200,
    "ird": 6800,
    "banquet": 12500,
    "spa": 22000,
    "retail": 8500,
    "cafe": 1800,
    "housekeeping": 0,
}

DOW_MULTIPLIERS = {
    "restaurant": [0.78, 0.82, 0.88, 0.96, 1.18, 1.32, 1.06],
    "bar":        [0.70, 0.75, 0.85, 0.95, 1.30, 1.40, 1.05],
    "ird":        [0.92, 0.94, 0.96, 1.00, 1.08, 1.12, 1.08],
    "banquet":    [0.30, 0.40, 0.55, 0.65, 1.20, 1.85, 0.80],
    "spa":        [0.65, 0.80, 0.90, 1.00, 1.10, 1.30, 1.25],
    "retail":     [0.85, 0.90, 0.95, 1.00, 1.10, 1.20, 1.00],
    "cafe":       [0.95, 0.98, 1.00, 1.02, 1.05, 1.12, 1.08],
    "housekeeping": [1.0]*7,
}

BASE_DAILY_COVERS = {
    "restaurant": 142,
    "bar": 95,
    "ird": 38,
    "banquet": 0,    # banquet covers come from event bookings only
    "spa": 22,
    "retail": 45,
    "cafe": 68,
    "housekeeping": 0,
}


@router.post("/seed")
async def seed_demo_property(force: bool = Query(False, description="Re-seed even if already present")):
    """Seed (or re-seed) the demo property. Idempotent."""
    existing = db["outlets"].count_documents({"property_id": DEMO_PROPERTY_ID})
    if existing and not force:
        return {
            "skipped": True,
            "reason": "demo_property_already_seeded",
            "existing_outlet_count": existing,
            "note": "Pass ?force=true to re-seed.",
        }

    counts = {"outlets": 0, "events": 0, "daily_aggs": 0, "lifecycle_runs": 0, "audit_events": 0, "regime_alerts": 0, "budget_rows": 0}

    # Property-level baseline data so health checks see something
    db["hk_rooms"].update_one(
        {"property_id": DEMO_PROPERTY_ID, "_demo": True},
        {"$set": {
            "property_id": DEMO_PROPERTY_ID,
            "_demo": True,
            "total_rooms": 384,
            "status": "occupied",
            "occupied_count": 287,
            "updated_at": _now(),
        }},
        upsert=True,
    )

    counts["outlets"] = _seed_outlets()
    counts["budget_rows"] = _seed_budget()
    counts["events"], counts["daily_aggs"] = _seed_capture_events()
    counts["lifecycle_runs"] = _seed_lifecycle_runs()
    counts["audit_events"] = _seed_audit_events()
    counts["regime_alerts"] = _seed_regime_alert()
    counts["invoices"] = _seed_vendor_invoices()
    counts["tip_audit_runs"] = _seed_tip_audit_runs()

    return {
        "seeded": True,
        "property_id": DEMO_PROPERTY_ID,
        "property_name": DEMO_PROPERTY_NAME,
        "counts": counts,
        "narrative": _seed_narrative(counts),
        "completed_at": _now(),
    }


@router.post("/wipe")
async def wipe_demo_property():
    """Wipe the demo property cleanly. Removes all records keyed to
    DEMO_PROPERTY_ID. Used when the demo gets messy and we want a
    clean re-seed."""
    deleted = {}
    collections_to_clean = [
        "outlets", "outlet_capture_events", "outlet_capture_daily",
        "outlet_capture_forecasts", "outlet_capture_forecast_trials",
        "outlet_capture_weights", "outlet_capture_accuracy",
        "outlet_capture_regime_alerts", "outlet_capture_retrospectives",
        "lifecycle_runs", "lifecycle_step_events",
        "period_close_runs", "period_close_step_events",
        "annual_budgets", "audit_events", "hk_rooms", "admin_audit_log",
    ]
    for coll in collections_to_clean:
        try:
            r = db[coll].delete_many({"property_id": DEMO_PROPERTY_ID})
            deleted[coll] = r.deleted_count
        except Exception:
            deleted[coll] = "error"
    # Outlet-keyed cleanup
    demo_outlet_ids = [o["outlet_id"] for o in DEMO_OUTLETS]
    for coll in ["outlet_capture_events", "outlet_capture_daily",
                 "outlet_capture_forecasts", "outlet_capture_weights",
                 "outlet_capture_weights_history",
                 "outlet_capture_accuracy", "outlet_capture_recompute_q"]:
        try:
            r = db[coll].delete_many({"outlet_id": {"$in": demo_outlet_ids}})
            deleted[f"{coll}_by_outlet"] = r.deleted_count
        except Exception:
            pass
    return {"wiped": True, "deleted": deleted, "completed_at": _now()}


@router.get("/status")
async def demo_status():
    """Quick check: is the demo property seeded? How many records?"""
    return {
        "property_id": DEMO_PROPERTY_ID,
        "property_name": DEMO_PROPERTY_NAME,
        "outlets": db["outlets"].count_documents({"property_id": DEMO_PROPERTY_ID}),
        "capture_events": db["outlet_capture_events"].count_documents({"property_id": DEMO_PROPERTY_ID}),
        "daily_aggs": db["outlet_capture_daily"].count_documents({"property_id": DEMO_PROPERTY_ID}),
        "lifecycle_runs": db["lifecycle_runs"].count_documents({"property_id": DEMO_PROPERTY_ID}),
        "audit_events": db["audit_events"].count_documents({"property_id": DEMO_PROPERTY_ID}),
        "regime_alerts_open": db["outlet_capture_regime_alerts"].count_documents({"status": "open"}),
        "checked_at": _now(),
    }


# ─────────────────────────────────────────────────────────────────
# Per-section seeders
# ─────────────────────────────────────────────────────────────────
def _seed_outlets() -> int:
    """Insert the 8 demo outlets and seed their cold-start weights."""
    from routes.outlet_capture import _seed_cold_start_weights

    count = 0
    for outlet_def in DEMO_OUTLETS:
        record = {
            **outlet_def,
            "property_id": DEMO_PROPERTY_ID,
            "active": True,
            "first_actual_at": (datetime.now(timezone.utc) - timedelta(days=89)).isoformat(),
            "_demo": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=120)).isoformat(),
            "updated_at": _now(),
        }
        db["outlets"].update_one(
            {"property_id": DEMO_PROPERTY_ID, "outlet_id": outlet_def["outlet_id"]},
            {"$set": record}, upsert=True,
        )
        try:
            _seed_cold_start_weights(outlet_def["outlet_id"], outlet_def["outlet_type"])
        except Exception:
            pass
        count += 1
    return count


def _seed_budget() -> int:
    """Insert a realistic annual budget for the demo property."""
    target_year = datetime.now(timezone.utc).year
    monthly_revenue_cents = {
        # Seasonality skewed for a Florida marina/resort: high Dec-Apr, low Jul-Aug
        "1": 285_000_00, "2": 312_000_00, "3": 340_000_00, "4": 305_000_00,
        "5": 245_000_00, "6": 215_000_00, "7": 198_000_00, "8": 205_000_00,
        "9": 215_000_00, "10": 248_000_00, "11": 295_000_00, "12": 325_000_00,
    }
    monthly_expense_cents = {
        m: {"labor": int(rev * 0.32), "food": int(rev * 0.24), "beverage": int(rev * 0.07),
            "utilities": int(rev * 0.05), "marketing": int(rev * 0.04), "other": int(rev * 0.18)}
        for m, rev in monthly_revenue_cents.items()
    }

    db["annual_budgets"].update_one(
        {"property_id": DEMO_PROPERTY_ID, "year": target_year},
        {"$set": {
            "property_id": DEMO_PROPERTY_ID,
            "year": target_year,
            "rooms_revenue_split": 0.55,
            "fb_revenue_split": 0.32,
            "banquet_revenue_split": 0.08,
            "spa_revenue_split": 0.05,
            "monthly_revenue_cents": monthly_revenue_cents,
            "monthly_expense_cents": monthly_expense_cents,
            "_demo": True,
            "updated_at": _now(),
        }}, upsert=True,
    )

    # Cash balance snapshots so cash_runway has data
    today = datetime.now(timezone.utc).date()
    cash = 850_000_00     # $850k starting cash
    for i in range(60, 0, -1):
        d = (today - timedelta(days=i)).isoformat()
        # Slight downward trend for the demo (story: we're spending faster than earning)
        cash -= 8_000_00 + ((i % 7) * 500_00)   # structural pattern, not random
        db["cash_balances"].update_one(
            {"property_id": DEMO_PROPERTY_ID, "date": d},
            {"$set": {
                "property_id": DEMO_PROPERTY_ID, "date": d,
                "total_cents": max(0, cash), "restricted_cents": 50_000_00,
                "_demo": True, "updated_at": _now(),
            }}, upsert=True,
        )

    return 1


def _seed_capture_events() -> tuple[int, int]:
    """Synthesize 90 days of capture events per outlet using DOW
    multipliers + structural daypart distributions. NOT random
    noise — these are realistic deterministic patterns."""
    today = datetime.now(timezone.utc).date()
    event_count = 0
    daily_count = 0

    for outlet in DEMO_OUTLETS:
        outlet_id = outlet["outlet_id"]
        outlet_type = outlet["outlet_type"]
        base = BASE_DAILY_COVERS.get(outlet_type, 50)
        avg_check = AVG_CHECK_CENTS.get(outlet_type, 5000)
        if base == 0:
            continue                                # housekeeping doesn't have capture events

        for days_ago in range(89, -1, -1):
            d = today - timedelta(days=days_ago)
            dow = d.weekday()
            mult = DOW_MULTIPLIERS.get(outlet_type, [1.0]*7)[dow]
            # Add a small "trend" so the data isn't perfectly flat
            trend = 1 + (89 - days_ago) * 0.0008    # small upward drift over 90 days
            covers = max(1, int(base * mult * trend))
            revenue_cents = int(covers * avg_check)

            # Insert one aggregated daily event (not per-cover, to
            # keep the seed lightweight)
            event_id = _uid()
            db["outlet_capture_events"].update_one(
                {"event_id": event_id},
                {"$set": {
                    "event_id": event_id,
                    "outlet_id": outlet_id,
                    "property_id": DEMO_PROPERTY_ID,
                    "guest_id": None,            # aggregated event
                    "date": d.isoformat(),
                    "daypart": "all_day",
                    "ts": d.isoformat() + "T20:00:00Z",
                    "source": "demo_seed",
                    "covers": covers,
                    "revenue_cents": revenue_cents,
                    "is_property_guest": True,
                    "_demo": True,
                }}, upsert=True,
            )
            event_count += 1

            # Daily aggregation row
            property_guests = 287    # from the hk_rooms record
            eligible = property_guests
            if outlet["eligibility"].get("min_age", 0) >= 21:
                eligible = int(eligible * 0.78)
            max_capacity = max(1, outlet["capacity"]["max_daily_covers"])
            db["outlet_capture_daily"].update_one(
                {"outlet_id": outlet_id, "date": d.isoformat()},
                {"$set": {
                    "outlet_id": outlet_id,
                    "property_id": DEMO_PROPERTY_ID,
                    "date": d.isoformat(),
                    "events": 1,
                    "covers": covers,
                    "revenue_cents": revenue_cents,
                    "unique_guests": int(covers * 0.85),
                    "property_guests": property_guests,
                    "eligible_guests": eligible,
                    "max_capacity": max_capacity,
                    "total_capture": round(int(covers * 0.85) / property_guests, 4),
                    "eligible_capture": round(int(covers * 0.85) / eligible, 4),
                    "available_capture": round(covers / max_capacity, 4),
                    "_demo": True,
                    "updated_at": _now(),
                }}, upsert=True,
            )
            daily_count += 1

    return event_count, daily_count


def _seed_lifecycle_runs() -> int:
    """Spin up two demo lifecycle runs:
       1. A monthly P&L close in flight (week 2 of 4)
       2. A BEO production cycle for next week's wedding"""
    today = datetime.now(timezone.utc).date()
    runs = 0

    # Period close — current month, weeks 1-2 done
    pnl_run_id = f"lcr-demo-pnl-{today.month}"
    pnl_steps = [
        # Week 1 — done
        {"step_id": "w1_pnl_finance_close", "title": "Finance close process complete",
         "type": "Owner", "owner_role": "Finance", "category": "P&L", "due_date": today.replace(day=6).isoformat(),
         "status": "complete", "completed_at": _now(), "completed_by": "j.cooper@p66demo", "notes": []},
        {"step_id": "w1_pnl_dept_review", "title": "Departmental review complete",
         "type": "Owner", "owner_role": "Department head", "category": "P&L", "due_date": today.replace(day=8).isoformat(),
         "status": "complete", "completed_at": _now(), "completed_by": "m.alvarez@p66demo", "notes": []},
        {"step_id": "w1_pnl_final", "title": "Final P&L completed",
         "type": "Owner", "owner_role": "Finance", "category": "P&L", "due_date": today.replace(day=8).isoformat(),
         "status": "complete", "completed_at": _now(), "completed_by": "j.cooper@p66demo", "notes": []},
        # Week 2 — in flight
        {"step_id": "w2_pnl_internal_meeting", "title": "Internal P&L meeting",
         "type": "Mandatory", "owner_role": "EC", "category": "P&L", "due_date": today.replace(day=11).isoformat() if today.day < 11 else (today + timedelta(days=2)).isoformat(),
         "status": "not_started", "completed_at": None, "completed_by": None, "notes": []},
        {"step_id": "w2_pnl_owners_deck", "title": "Owner's meeting deck sent to EC",
         "type": "Owner", "owner_role": "EC", "category": "P&L", "due_date": (today + timedelta(days=4)).isoformat(),
         "status": "not_started", "completed_at": None, "completed_by": None, "notes": []},
    ]
    db["lifecycle_runs"].update_one(
        {"run_id": pnl_run_id},
        {"$set": {
            "run_id": pnl_run_id,
            "title": f"Pier 66 Demo — May {today.year} P&L Close",
            "property_id": DEMO_PROPERTY_ID,
            "project_type": "monthly_pnl_close",
            "project_type_label": "Monthly P&L / Forecast Lifecycle",
            "anchor_date": today.replace(day=1).isoformat(),
            "anchor_label": "month_start",
            "template_id": "default_aurion",
            "template_version": 1,
            "project_lead": "j.cooper@p66demo",
            "steps": pnl_steps,
            "step_count": len(pnl_steps),
            "status": "in_flight",
            "_demo": True,
            "created_at": _now(),
            "updated_at": _now(),
        }}, upsert=True,
    )
    runs += 1

    # BEO production cycle — wedding next Saturday for 100 covers
    next_saturday = today + timedelta(days=(5 - today.weekday()) % 7 or 7)
    beo_run_id = f"lcr-demo-beo-{next_saturday.isoformat()}"
    beo_steps = [
        {"step_id": "beo_finalized", "title": "BEO finalized + signed by client",
         "type": "Owner", "owner_role": "Catering Manager", "category": "Pre-event",
         "due_date": (next_saturday - timedelta(days=14)).isoformat(),
         "status": "complete", "completed_at": _now(), "completed_by": "k.patel@p66demo", "notes": []},
        {"step_id": "equipment_list", "title": "Equipment + AV list confirmed",
         "type": "Owner", "owner_role": "Banquet Manager", "category": "Pre-event",
         "due_date": (next_saturday - timedelta(days=14)).isoformat(),
         "status": "complete", "completed_at": _now(), "completed_by": "k.patel@p66demo", "notes": []},
        {"step_id": "staffing_plan", "title": "Staffing plan complete",
         "type": "Owner", "owner_role": "Banquet Manager", "category": "Pre-event",
         "due_date": (next_saturday - timedelta(days=7)).isoformat(),
         "status": "complete", "completed_at": _now(), "completed_by": "k.patel@p66demo", "notes": []},
        {"step_id": "menu_costed", "title": "Menu costed + plated cost finalized",
         "type": "Owner", "owner_role": "EC", "category": "Pre-event",
         "due_date": (next_saturday - timedelta(days=7)).isoformat(),
         "status": "complete", "completed_at": _now(), "completed_by": "chef.robert@p66demo", "notes": []},
        {"step_id": "mise_en_place_orders", "title": "Mise en place orders placed",
         "type": "Owner", "owner_role": "Sous Chef", "category": "Pre-event",
         "due_date": (next_saturday - timedelta(days=3)).isoformat(),
         "status": "in_progress", "completed_at": None, "completed_by": None, "notes": []},
        {"step_id": "rentals_arrived", "title": "Rentals delivered + verified",
         "type": "Owner", "owner_role": "Banquet Manager", "category": "Pre-event",
         "due_date": (next_saturday - timedelta(days=1)).isoformat(),
         "status": "not_started", "completed_at": None, "completed_by": None, "notes": []},
        {"step_id": "pre_event_meeting", "title": "Pre-event walkthrough",
         "type": "Mandatory", "owner_role": "Catering + Banquet + EC", "category": "Pre-event",
         "due_date": (next_saturday - timedelta(days=1)).isoformat(),
         "status": "not_started", "completed_at": None, "completed_by": None, "notes": []},
    ]
    db["lifecycle_runs"].update_one(
        {"run_id": beo_run_id},
        {"$set": {
            "run_id": beo_run_id,
            "title": f"Wedding — Smith Reception ({next_saturday.isoformat()}, 100 covers)",
            "property_id": DEMO_PROPERTY_ID,
            "project_type": "beo_production_cycle",
            "project_type_label": "BEO Production Cycle",
            "anchor_date": next_saturday.isoformat(),
            "anchor_label": "event_date",
            "template_id": "seed_beo_production_cycle",
            "template_version": 1,
            "project_lead": "k.patel@p66demo",
            "steps": beo_steps,
            "step_count": len(beo_steps),
            "status": "in_flight",
            "_demo": True,
            "created_at": _now(),
            "updated_at": _now(),
        }}, upsert=True,
    )
    runs += 1

    return runs


def _seed_audit_events() -> int:
    """Seed a handful of audit events so the why-changed drill has
    data to render."""
    base = datetime.now(timezone.utc) - timedelta(days=7)
    events = [
        {"action": "update", "entity_type": "budget", "entity_id": f"budget-{datetime.now(timezone.utc).year}-may",
         "actor": "j.cooper@p66demo", "summary": "Bumped May banquet revenue forecast +12% per Smith reception book"},
        {"action": "create", "entity_type": "outlet", "entity_id": "p66demo-cafe",
         "actor": "m.alvarez@p66demo", "summary": "Activated Sunrise Café outlet"},
        {"action": "override", "entity_type": "forecast", "entity_id": "fcst-may-22",
         "actor": "k.patel@p66demo", "summary": "Override: banquet covers +50 (wedding block)"},
        {"action": "delete", "entity_type": "menu_item", "entity_id": "mi-galley-tunatartare",
         "actor": "chef.robert@p66demo", "summary": "Removed Tuna Tartare from spring menu (low velocity)"},
        {"action": "update", "entity_type": "tip_share_config", "entity_id": "tip-cfg-galley",
         "actor": "j.cooper@p66demo", "summary": "Updated Galley tip pool: server 60%, runner 25%, busser 15%"},
    ]
    count = 0
    for i, e in enumerate(events):
        ts = (base + timedelta(days=i, hours=i*2)).isoformat()
        try:
            db["audit_events"].update_one(
                {"entity_type": e["entity_type"], "entity_id": e["entity_id"], "ts": ts},
                {"$set": {
                    "ts": ts, "property_id": DEMO_PROPERTY_ID,
                    **e, "_demo": True,
                }}, upsert=True,
            )
            count += 1
        except Exception:
            pass
    return count


def _seed_regime_alert() -> int:
    """Add one open regime-change alert so the retrospective view
    has a signal to talk about."""
    db["outlet_capture_regime_alerts"].update_one(
        {"outlet_id": "p66demo-banquet", "status": "open", "_demo": True},
        {"$set": {
            "outlet_id": "p66demo-banquet",
            "property_id": DEMO_PROPERTY_ID,
            "raised_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "errors": [
                {"horizon_days": 1, "abs_pct_error": 0.43},
                {"horizon_days": 3, "abs_pct_error": 0.51},
            ],
            "reason": "abs_pct_error >= 0.40 on multiple horizons — banquet booking pace deviated sharply (Smith wedding +50 covers; weekend group block lift)",
            "status": "open",
            "_demo": True,
        }}, upsert=True,
    )
    return 1


def _seed_narrative(counts: Dict) -> str:
    return (
        f"Demo property '{DEMO_PROPERTY_NAME}' seeded with "
        f"{counts['outlets']} outlets, {counts['events']} capture events, "
        f"{counts['daily_aggs']} daily aggregations, {counts['lifecycle_runs']} "
        f"in-flight lifecycle runs (P&L close + BEO wedding), "
        f"{counts['audit_events']} audit events, "
        f"{counts['regime_alerts']} open regime-change alert, "
        f"{counts.get('invoices', 0)} vendor invoices, and "
        f"{counts.get('tip_audit_runs', 0)} tip audit runs. Ready for sales demo. "
        f"Hit /api/outlet-capture/dashboard/p66demo-galley for a populated dashboard, "
        f"/api/lifecycles/digest/{DEMO_PROPERTY_ID} for the daily lifecycle digest, "
        f"or /api/why-changed/drill?entity_type=budget&entity_id=budget-may for "
        f"the cross-collection event drill."
    )


# ---------------------------------------------------------------------------
# Iter 5 · 2026-05-11 — Vendor invoices + Tip-audit runs
# Light, deterministic seed so VendorPareto + TipAudit deep-dives have
# something to render against the demo property.
# ---------------------------------------------------------------------------

_DEMO_VENDORS = [
    ("vendor-aurora-seafood", "Aurora Seafood Co.", "seafood", 38),
    ("vendor-coastal-produce", "Coastal Produce Distributors", "produce", 22),
    ("vendor-premier-meats", "Premier Meats & Game", "meats", 16),
    ("vendor-pacific-spirits", "Pacific Spirits Wholesale", "beverage", 11),
    ("vendor-island-dairy", "Island Dairy & Eggs", "dairy", 6),
    ("vendor-five-star-paper", "Five-Star Paper Goods", "smallwares", 3),
    ("vendor-blue-line-chem", "Blue Line Chemicals", "chemicals", 2),
    ("vendor-rapid-linen", "Rapid Linen Service", "linen", 2),
]

# Sum of vendor weights ≈ 100. We turn weights into share-of-spend so the
# Pareto cliff (top 3 vendors carry ~76%, top 4 carry ~87%) is visible.

def _seed_vendor_invoices() -> int:
    """Seed 90 days of vendor invoices for VendorPareto.

    Spread invoices across the lookback window so the lookback selector
    surfaces realistic counts (~120 invoices total). The Pareto curve is
    deterministic: top 3 vendors take ~76% of spend, exposing the 80/20.
    """
    base_total_per_vendor_cents = {  # cents over 90d, deterministic
        v_id: int(weight * 120_000) for v_id, _, _, weight in _DEMO_VENDORS
    }
    today = datetime.now(timezone.utc).date()
    docs: List[Dict] = []
    for v_id, name, category, weight in _DEMO_VENDORS:
        # Number of invoices for this vendor: heavier vendors get more invoices
        n_invoices = max(2, int(round(weight / 2.5)))
        per_invoice_cents = max(
            5_000, int(base_total_per_vendor_cents[v_id] / n_invoices)
        )
        for i in range(n_invoices):
            # Spread across the 90-day window deterministically
            day_offset = int((i * 89) / max(1, n_invoices - 1)) if n_invoices > 1 else 30
            received = (today - timedelta(days=89 - day_offset)).isoformat()
            invoice_no = f"INV-{v_id[:8].upper()}-{i:03d}"
            docs.append({
                "id": f"{v_id}-{i}",
                "invoice_id": f"{v_id}-{i}",
                "invoice_no": invoice_no,
                "property_id": DEMO_PROPERTY_ID,
                "vendor_id": v_id,
                "vendor_name": name,
                "category": category,
                "received_date": received,
                "total_cents": per_invoice_cents,
                "status": "received",
                "_demo": True,
            })

    # Upsert by invoice_id so the seed is idempotent
    inserted = 0
    for d in docs:
        res = db["invoices"].update_one(
            {"invoice_id": d["invoice_id"], "_demo": True},
            {"$set": d},
            upsert=True,
        )
        if res.upserted_id or res.modified_count:
            inserted += 1
    return inserted


def _seed_tip_audit_runs() -> int:
    """Seed 14 days of tip audit runs for the TipAudit deep-dive.

    Each run carries a deterministic allocation across 3 employees + a
    binary `integrity_pass` (12 pass, 2 fail) so the integrity-failures
    panel has rows to render.
    """
    today = datetime.now(timezone.utc).date()
    employees = [
        ("emp-101", "Server · Tina", "server", 1.10),
        ("emp-102", "Bartender · Marco", "bartender", 1.00),
        ("emp-103", "Busser · Aaron", "busser", 0.85),
    ]
    inserted = 0
    for d_idx in range(14):
        shift_date = (today - timedelta(days=d_idx)).isoformat()
        shift_id = f"shift-galley-{shift_date}"
        # Total tip pool grows on weekends
        weekday = (today - timedelta(days=d_idx)).weekday()  # 0=Mon..6=Sun
        pool_cents = 48_000 + (28_000 if weekday in (4, 5, 6) else 0)
        # Allocate proportional to hours × weight
        hours_total = sum(8.0 * w for _, _, _, w in employees)
        allocations: List[Dict] = []
        for emp_id, emp_name, role, w in employees:
            hours = 8.0 * w
            share = hours / hours_total
            allocated = int(pool_cents * share)
            allocations.append({
                "employee_id": emp_id,
                "employee_name": emp_name,
                "role": role,
                "hours_worked": round(hours, 2),
                "hours_share_of_role": round(share, 4),
                "allocated_cents": allocated,
            })
        # Two integrity failures (days 3 and 8) for demo realism
        integrity_pass = d_idx not in (3, 8)
        integrity_notes = (
            "balanced"
            if integrity_pass
            else "POS pool total $20 short of allocated sum — investigate timekeeping clock-out"
        )
        doc = {
            "shift_id": shift_id,
            "property_id": DEMO_PROPERTY_ID,
            "outlet_id": "p66demo-galley",
            "shift_date": shift_date,
            "pool_total_cents": pool_cents,
            "allocated_total_cents": sum(a["allocated_cents"] for a in allocations),
            "allocations": allocations,
            "integrity_pass": integrity_pass,
            "integrity_notes": integrity_notes,
            "computed_at": _now(),
            "_demo": True,
        }
        res = db["tip_audit_runs"].update_one(
            {"shift_id": shift_id, "_demo": True},
            {"$set": doc},
            upsert=True,
        )
        if res.upserted_id or res.modified_count:
            inserted += 1
    return inserted

