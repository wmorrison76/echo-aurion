"""
Canonical Health Endpoint
==========================
L.1 from the launch-readiness audit. Single source of truth for
operational health: aggregates every subsystem (DB, scheduler, event
bus, upgrade safety, outlet capture, weather, lifecycle engine) into
one red/amber/green response.

Used by:
  · Load balancer rolling-deploy gate (red → drain pod)
  · Status page (customer-visible service health)
  · Daily ops digest (which subsystems are degrading?)
  · PagerDuty / on-call alerts

Each subsystem reports its own (overall, issues[]). This service
aggregates them deterministically: any red subsystem makes overall
red; any amber makes overall amber; only all-green is green.

Honest behavior: subsystems that don't report (e.g., outlet capture
on a fresh install with no data) come back as `not_initialized`,
not green. We don't claim green for components that aren't running.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter

from database import db


router = APIRouter(prefix="/api/health", tags=["health"])

_now = lambda: datetime.now(timezone.utc).isoformat()


@router.get("")
async def canonical_health():
    """One health response covering every subsystem."""
    subsystems: Dict[str, Dict] = {}
    subsystems["database"] = _check_database()
    subsystems["scheduler"] = _check_scheduler()
    subsystems["event_bus"] = _check_event_bus()
    subsystems["upgrade_safety"] = _check_upgrade_safety()
    subsystems["outlet_capture"] = _check_outlet_capture()
    subsystems["weather_service"] = _check_weather()
    subsystems["lifecycle_engine"] = _check_lifecycle_engine()
    subsystems["forecast_pipeline"] = _check_forecast_pipeline()

    overall = _aggregate(subsystems)

    return {
        "overall": overall,
        "checked_at": _now(),
        "subsystems": subsystems,
        "summary": {
            "red": sum(1 for s in subsystems.values() if s.get("status") == "red"),
            "amber": sum(1 for s in subsystems.values() if s.get("status") == "amber"),
            "green": sum(1 for s in subsystems.values() if s.get("status") == "green"),
            "not_initialized": sum(
                1 for s in subsystems.values() if s.get("status") == "not_initialized"
            ),
        },
    }


@router.get("/ready")
async def readiness_probe():
    """Kubernetes-style readiness probe — returns 200 only if every
    critical subsystem is at least amber. Used by load balancer to
    decide if traffic should route to this pod."""
    response = await canonical_health()
    if response["overall"] == "red":
        return response, 503
    return response


@router.get("/live")
async def liveness_probe():
    """Liveness probe — returns 200 if the process is up. Doesn't
    check subsystems; only the process. Used to decide if the pod
    should be restarted."""
    return {"status": "alive", "checked_at": _now()}


# ─────────────────────────────────────────────────────────────────
# Per-subsystem checkers — each returns
#   {"status": "red|amber|green|not_initialized", "issues": [...], "details": {...}}
# ─────────────────────────────────────────────────────────────────
def _check_database() -> Dict:
    """Verify Mongo is responsive + measure ping latency."""
    try:
        from time import perf_counter_ns
        t0 = perf_counter_ns()
        db.command("ping")
        latency_ms = (perf_counter_ns() - t0) / 1_000_000
        if latency_ms > 1000:
            return {
                "status": "red",
                "issues": [f"Mongo ping latency {latency_ms:.0f}ms exceeds 1000ms threshold"],
                "details": {"latency_ms": round(latency_ms, 2)},
            }
        if latency_ms > 250:
            return {
                "status": "amber",
                "issues": [f"Mongo ping latency {latency_ms:.0f}ms exceeds 250ms threshold"],
                "details": {"latency_ms": round(latency_ms, 2)},
            }
        return {"status": "green", "issues": [], "details": {"latency_ms": round(latency_ms, 2)}}
    except Exception as exc:
        return {"status": "red", "issues": [f"Mongo unreachable: {exc}"], "details": {}}


def _check_scheduler() -> Dict:
    """APScheduler running? At least the lifecycle daily jobs scheduled?"""
    try:
        from scheduler import scheduler
        jobs = scheduler.get_jobs() if scheduler else []
        if not scheduler or not scheduler.running:
            return {"status": "red", "issues": ["scheduler not running"], "details": {"job_count": 0}}
        if len(jobs) == 0:
            return {"status": "amber", "issues": ["scheduler running but no jobs registered"], "details": {"job_count": 0}}
        return {"status": "green", "issues": [], "details": {"job_count": len(jobs), "job_ids": [j.id for j in jobs[:20]]}}
    except Exception as exc:
        return {"status": "not_initialized", "issues": [f"scheduler not yet imported: {exc}"], "details": {}}


def _check_event_bus() -> Dict:
    """Event bus events flowing? Any unprocessed dead letters?"""
    try:
        recent = db["event_bus_store"].count_documents({
            "timestamp": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
        })
        dead_letters = db["event_bus_dead_letter"].count_documents({"resolved": {"$ne": True}})
        if dead_letters > 50:
            return {
                "status": "red",
                "issues": [f"{dead_letters} unresolved dead-letter events"],
                "details": {"events_24h": recent, "dead_letters_open": dead_letters},
            }
        if dead_letters > 5:
            return {
                "status": "amber",
                "issues": [f"{dead_letters} unresolved dead-letter events"],
                "details": {"events_24h": recent, "dead_letters_open": dead_letters},
            }
        return {"status": "green", "issues": [], "details": {"events_24h": recent, "dead_letters_open": dead_letters}}
    except Exception as exc:
        return {"status": "not_initialized", "issues": [f"event_bus collections not yet created: {exc}"], "details": {}}


def _check_upgrade_safety() -> Dict:
    """Schema version current? No failed migrations? Snapshot recent?"""
    try:
        from services.upgrade_safety import REQUIRED_SCHEMA_VERSION, _schema_health_status
        latest = db["migrations_log"].find_one(
            {"status": "done"}, {"_id": 0, "id": 1, "finished_at": 1}, sort=[("finished_at", -1)]
        )
        schema_status = _schema_health_status(latest)
        failed = db["migrations_log"].count_documents({"status": "failed"})
        issues = []
        if schema_status == "stale":
            issues.append(f"Schema stale: latest applied {latest.get('id') if latest else 'NONE'}; expected {REQUIRED_SCHEMA_VERSION}")
        if failed:
            issues.append(f"{failed} migrations marked failed")
        if not issues:
            return {"status": "green", "issues": [], "details": {"latest_migration": (latest or {}).get("id"), "required": REQUIRED_SCHEMA_VERSION}}
        if any("stale" in i or "failed" in i for i in issues):
            return {"status": "amber", "issues": issues, "details": {"latest_migration": (latest or {}).get("id")}}
        return {"status": "green", "issues": [], "details": {}}
    except Exception as exc:
        return {"status": "not_initialized", "issues": [f"upgrade_safety not loaded: {exc}"], "details": {}}


def _check_outlet_capture() -> Dict:
    """Outlets registered? Capture events flowing? Forecasts being made?"""
    try:
        outlets = db["outlets"].count_documents({"active": True})
        if outlets == 0:
            return {"status": "not_initialized", "issues": ["no active outlets registered"], "details": {"outlets": 0}}
        events_24h = db["outlet_capture_events"].count_documents({
            "ts": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
        })
        forecasts_today = db["outlet_capture_forecasts"].count_documents({
            "for_date": {"$gte": datetime.now(timezone.utc).date().isoformat()}
        })
        regime_alerts = db["outlet_capture_regime_alerts"].count_documents({"status": "open"})
        issues = []
        if regime_alerts >= 3:
            issues.append(f"{regime_alerts} open regime-change alerts (model degrading)")
        return {
            "status": ("amber" if issues else "green"),
            "issues": issues,
            "details": {
                "active_outlets": outlets,
                "events_24h": events_24h,
                "forecasts_today": forecasts_today,
                "open_regime_alerts": regime_alerts,
            },
        }
    except Exception as exc:
        return {"status": "not_initialized", "issues": [f"outlet_capture not loaded: {exc}"], "details": {}}


def _check_weather() -> Dict:
    """Weather forecasts fresh enough?"""
    try:
        configured = db["property_weather_locations"].count_documents({})
        if configured == 0:
            return {"status": "not_initialized", "issues": ["no property weather locations configured"], "details": {}}
        latest = db["weather_history"].find_one({}, {"_id": 0, "fetched_at": 1}, sort=[("fetched_at", -1)])
        if not latest:
            return {"status": "amber", "issues": ["weather configured but never fetched"], "details": {"locations": configured}}
        try:
            age = datetime.now(timezone.utc) - datetime.fromisoformat(latest["fetched_at"].replace("Z", "+00:00"))
            age_hours = age.total_seconds() / 3600
            if age_hours > 12:
                return {"status": "amber", "issues": [f"weather forecast stale ({age_hours:.0f}h old)"], "details": {"age_hours": round(age_hours, 1)}}
        except Exception:
            pass
        return {"status": "green", "issues": [], "details": {"locations": configured, "last_fetched": latest.get("fetched_at")}}
    except Exception as exc:
        return {"status": "not_initialized", "issues": [str(exc)], "details": {}}


def _check_lifecycle_engine() -> Dict:
    """Templates seeded? Any runs in flight?"""
    try:
        templates = db["lifecycle_templates"].count_documents({"is_seed": True})
        if templates == 0:
            return {"status": "amber", "issues": ["lifecycle templates not yet seeded — run migration 20260509_lifecycle_engine"], "details": {"seeded_templates": 0}}
        active_runs = db["lifecycle_runs"].count_documents({"status": {"$nin": ["closed"]}})
        return {"status": "green", "issues": [], "details": {"seeded_templates": templates, "active_runs": active_runs}}
    except Exception as exc:
        return {"status": "not_initialized", "issues": [str(exc)], "details": {}}


def _check_forecast_pipeline() -> Dict:
    """Daily forecast generation cron has run today?"""
    try:
        latest_forecast = db["outlet_capture_forecasts"].find_one(
            {}, {"_id": 0, "forecast_made_at": 1}, sort=[("forecast_made_at", -1)],
        )
        if not latest_forecast:
            return {"status": "not_initialized", "issues": ["no forecasts on file"], "details": {}}
        try:
            made_at = datetime.fromisoformat(latest_forecast["forecast_made_at"].replace("Z", "+00:00"))
            hours_since = (datetime.now(timezone.utc) - made_at).total_seconds() / 3600
            if hours_since > 30:
                return {"status": "amber", "issues": [f"latest forecast {hours_since:.0f}h old (cron may have stopped)"], "details": {"hours_since": round(hours_since, 1)}}
        except Exception:
            pass
        return {"status": "green", "issues": [], "details": {"latest_forecast_at": latest_forecast.get("forecast_made_at")}}
    except Exception as exc:
        return {"status": "not_initialized", "issues": [str(exc)], "details": {}}


def _aggregate(subsystems: Dict[str, Dict]) -> str:
    """Roll up: any red → red; any amber → amber; else green.
    not_initialized doesn't count against the overall (it's a known
    pre-deploy state, not a failure)."""
    statuses = [s.get("status") for s in subsystems.values()]
    if "red" in statuses:
        return "red"
    if "amber" in statuses:
        return "amber"
    initialized = [s for s in statuses if s != "not_initialized"]
    if not initialized:
        return "not_initialized"
    return "green"
