"""
Property Pulse demo · smoke test.

Validates the four backend endpoints powering the Live Dashboard tiles and the
outlet capture grid. Runs in ~2 seconds. Skips if the demo property has not been
seeded so it doesn't flake on a fresh database.

Run:
    cd /app && python -m pytest backend/tests/test_property_pulse_demo_smoke.py -v
"""
from __future__ import annotations

import os
from typing import Any

import httpx
import pytest

BASE_URL = os.environ.get("PROPERTY_PULSE_BASE_URL", "http://localhost:8001")
DEMO_PROPERTY = "pier-sixty-six-demo"
DEMO_OUTLET = "p66demo-galley"
TIMEOUT = 8.0


def _get(path: str) -> dict[str, Any]:
    with httpx.Client(timeout=TIMEOUT) as client:
        r = client.get(f"{BASE_URL}{path}")
        r.raise_for_status()
        return r.json()


@pytest.fixture(scope="session")
def demo_seeded() -> bool:
    """Verify the demo property exists. Skip the whole module if it doesn't."""
    try:
        data = _get(f"/api/outlet-capture/ratios/property/{DEMO_PROPERTY}")
    except httpx.HTTPError as exc:
        pytest.skip(f"backend unreachable at {BASE_URL}: {exc}")
    outlets = data.get("outlets") or []
    if not outlets:
        pytest.skip(
            f"demo property '{DEMO_PROPERTY}' not seeded "
            f"(POST {BASE_URL}/api/demo-seed/seed to seed)"
        )
    return True


def test_pace_endpoint(demo_seeded: bool) -> None:
    """Pace tile · MTD revenue + projection."""
    data = _get(f"/api/pace/property/{DEMO_PROPERTY}")
    assert "mtd" in data, "pace response missing 'mtd' key"
    assert "projection" in data, "pace response missing 'projection' key"
    assert isinstance(data["mtd"].get("revenue_cents"), (int, float)), \
        "mtd.revenue_cents should be numeric"


def test_cash_runway_endpoint(demo_seeded: bool) -> None:
    """Cash Runway tile · §1.1 missing-data state is acceptable."""
    data = _get(f"/api/cash-runway/{DEMO_PROPERTY}")
    # Either available with runway data, OR an explicit missing-data response —
    # both are valid per §1.1 doctrine.
    assert "available" in data, "cash-runway response missing 'available' key"
    if data["available"]:
        assert "runway_months" in data, \
            "cash-runway 'available' but missing runway_months"
    else:
        assert "reason" in data, \
            "cash-runway unavailable but missing 'reason' (§1.1 surface)"


def test_outlet_capture_ratios_endpoint(demo_seeded: bool) -> None:
    """Outlet Capture grid · per-outlet eligible-capture ratios."""
    data = _get(f"/api/outlet-capture/ratios/property/{DEMO_PROPERTY}")
    outlets = data.get("outlets") or []
    assert outlets, "outlets list is empty"
    sample = outlets[0]
    for key in ("outlet_id", "eligible_capture", "headroom_cents"):
        assert key in sample, f"outlet record missing '{key}': {sample!r}"


def test_forecast_21_endpoint(demo_seeded: bool) -> None:
    """21-Day Living Forecast · summary + per-day records + data source label."""
    data = _get(f"/api/forecast-21/forecast?property_id={DEMO_PROPERTY}")
    assert "forecast" in data, "forecast-21 response missing 'forecast' key"
    fc = data["forecast"]
    assert isinstance(fc, list), "forecast should be a list"
    assert len(fc) >= 1, "forecast should have at least 1 day"
    # §1.1 — data_source label must be present
    assert data.get("data_source"), "forecast missing 'data_source' label (§1.1)"


def test_outlet_capture_dashboard_endpoint(demo_seeded: bool) -> None:
    """Outlet deep-dive · multi-horizon forecast + signal weights."""
    data = _get(f"/api/outlet-capture/dashboard/{DEMO_OUTLET}")
    assert "outlet" in data, "outlet-capture/dashboard missing 'outlet'"
    assert "today" in data, "outlet-capture/dashboard missing 'today'"
    assert "forecast" in data, "outlet-capture/dashboard missing 'forecast'"
    forecasts = data.get("forecast") or []
    assert forecasts, "outlet forecast list is empty"
    # Each forecast row should have horizon + P10/P50/P90
    sample = forecasts[0]
    for key in ("horizon_days", "p10", "p50", "p90"):
        assert key in sample, f"forecast row missing '{key}'"


def test_lifecycle_digest_endpoint(demo_seeded: bool) -> None:
    """Lifecycle tile · today's standup digest."""
    data = _get(f"/api/lifecycles/digest/{DEMO_PROPERTY}")
    # Digest can legitimately be empty if no runs exist; just confirm shape.
    assert isinstance(data, dict), "digest response is not an object"
    # At minimum, the response should have one of these keys.
    assert any(
        k in data
        for k in ("summary", "upcoming_3_days", "overdue", "due_today")
    ), f"digest missing all expected keys: {list(data.keys())}"
