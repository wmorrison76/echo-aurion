"""
Panel Compatibility Shims
=========================
Fills in API endpoints that some legacy frontend panels still call but that
were either renamed or never landed in the FastAPI backend. Each shim
returns a well-shaped empty response so the panel renders its own
"no data yet" state instead of hanging on a permanent loading spinner.

Doctrine §1.1 — these shims are explicit, labeled, and surface "no data
yet" rather than fabricated data. They get replaced module-by-module
when the real engine lands; until then, the panel renders.

Wired into server.py via app.include_router(panel_compat_shims_router).
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Query


router = APIRouter(tags=["panel-compat-shims"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Menu Engineering Matrix — used by client/modules/MenuEngineering/index.tsx
# Calls /api/menu-eng-matrix/outlets and /api/menu-eng-matrix/matrix?outlet=X
# ---------------------------------------------------------------------------
@router.get("/api/menu-eng-matrix/outlets")
async def menu_eng_outlets():
    """Returns the list of outlets the matrix can be computed for.
    The current substrate uses `outlet_capture_daily` rows — once any
    outlet logs covers + revenue the matrix populates."""
    return {
        "outlets": [],
        "available": False,
        "reason": "menu_engineering_matrix_pipeline_not_wired",
        "remediation": (
            "The Menu Engineering matrix is the next planned deep-dive. The "
            "substrate (recipes, sales-mix, food-cost) exists in MongoDB but the "
            "classifier (Stars / Plowhorses / Puzzles / Dogs) hasn't been wired. "
            "Until then this panel surfaces the §1.1 empty state."
        ),
        "generated_at": _now(),
    }


@router.get("/api/menu-eng-matrix/matrix")
async def menu_eng_matrix(outlet: str = Query("")):
    """Per-outlet 4-quadrant menu engineering matrix shape."""
    return {
        "outlet": outlet,
        "available": False,
        "reason": "menu_engineering_matrix_pipeline_not_wired",
        "items": [],
        "quadrants": {"star": [], "plowhorse": [], "puzzle": [], "dog": []},
        "generated_at": _now(),
    }


# ---------------------------------------------------------------------------
# Ops Forecast (21-day) — used by client/modules/OpsForecast/index.tsx
# Panel hits /api/ops-forecast/{21-day,groups,room-states,outlet-forecast,trends,summary}
# Forwarding shape — real data lives at /api/forecast-21/* but the panel
# was written against the older naming convention.
# ---------------------------------------------------------------------------
@router.get("/api/ops-forecast/21-day")
async def ops_forecast_21_day(property_id: str = Query("pier-sixty-six-demo")):
    return {
        "property_id": property_id,
        "days": [],
        "available": False,
        "reason": "forecast_pipeline_renamed_to_forecast_21",
        "remediation": "Use /api/forecast-21/forecast?property_id=...",
        "generated_at": _now(),
    }


@router.get("/api/ops-forecast/groups")
async def ops_forecast_groups():
    return {"groups": [], "available": False, "generated_at": _now()}


@router.get("/api/ops-forecast/room-states")
async def ops_forecast_room_states():
    return {"room_states": {}, "available": False, "generated_at": _now()}


@router.get("/api/ops-forecast/outlet-forecast")
async def ops_forecast_outlet_forecast():
    return {"outlets": [], "available": False, "generated_at": _now()}


@router.get("/api/ops-forecast/trends")
async def ops_forecast_trends():
    return {"trends": [], "available": False, "generated_at": _now()}


@router.get("/api/ops-forecast/summary")
async def ops_forecast_summary():
    return {
        "summary": {
            "occupancy_avg": 0,
            "revenue_total_cents": 0,
            "covers_total": 0,
        },
        "available": False,
        "reason": "forecast_pipeline_renamed_to_forecast_21",
        "remediation": "Use /api/forecast-21/forecast?property_id=...",
        "generated_at": _now(),
    }


@router.get("/api/weather/ops-forecast-overlay")
async def weather_ops_forecast_overlay():
    return {"overlay": [], "available": False, "generated_at": _now()}
