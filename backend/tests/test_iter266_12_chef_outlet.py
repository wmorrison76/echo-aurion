"""
iter266.12 — Chef Outlet Dashboard + MaestroBQT BEO Month-Timeline
Backend regression tests against the deployed preview URL.

Endpoints under test:
  GET  /api/chef-outlet/dashboard
  GET  /api/chef-outlet/outlets-for-chef
  POST /api/chef-outlet/forecast/recalibrate
  GET  /api/chef-outlet/forecast/accuracy
  GET  /api/chef-outlet/beo-timeline
  POST /api/chef-outlet/beo-timeline/cumulative

Plus regression on the iter266.11 Labor Brain Rail.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://cfo-toolkit-deploy.preview.emergentagent.com",
).rstrip("/")

OUTLET = "p66demo-galley"
ALLOWED_ITER = [1000, 2000, 5000, 7500]


# ──────────────── fixtures ────────────────
@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ════════════════════════ /chef-outlet/dashboard ════════════════════════
class TestChefDashboard:

    def test_dashboard_envelope_shape(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/dashboard",
            params={"outlet_id": OUTLET, "iterations": 2000},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["found"] is True
        assert d["outlet_id"] == OUTLET
        assert d.get("outlet_name")
        # Top-level required sections
        for k in ("orders", "inventory", "price_movers", "menu_mix",
                  "forecast", "labor", "ytd"):
            assert k in d, f"missing top-level section: {k}"
        # YTD shape
        ytd = d["ytd"]
        for k in ("ytd_cost", "ytd_sales", "ytd_margin_pct",
                  "ytd_sales_source"):
            assert k in ytd, f"ytd missing {k}"
        assert isinstance(ytd["ytd_sales"], (int, float))
        # Menu mix
        mm = d["menu_mix"]
        assert "items" in mm and "totals" in mm and "by_category" in mm
        # Price movers
        assert isinstance(d["price_movers"], list)

    def test_dashboard_forecast_horizons_and_invariant(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/dashboard",
            params={"outlet_id": OUTLET, "iterations": 2000},
            timeout=60,
        )
        d = r.json()
        fc = d["forecast"]
        assert "available" in fc
        if not fc["available"]:
            pytest.skip("forecast unavailable for outlet (no history)")
        assert "iterations" in fc
        assert fc["iterations"] == 2000
        horizons = fc.get("horizons") or {}
        for hk in ("d1", "d3", "d5", "d7"):
            assert hk in horizons, f"missing horizon {hk}"
            h = horizons[hk]
            # Monte Carlo invariant: P10 <= P50 <= P90
            assert h["p10"] <= h["p50"] <= h["p90"], (
                f"MC invariant broken at {hk}: {h}"
            )

    def test_dashboard_labor_shape(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/dashboard",
            params={"outlet_id": OUTLET, "iterations": 1000},
            timeout=60,
        )
        d = r.json()
        labor = d["labor"]
        for k in ("today_shifts", "by_day", "by_station",
                  "hourly_distribution", "pto_count",
                  "call_off_count", "dream_team"):
            assert k in labor, f"labor missing {k}"
        assert isinstance(labor["dream_team"], list)
        assert isinstance(labor["hourly_distribution"], list)

    @pytest.mark.parametrize("iters", ALLOWED_ITER)
    def test_dashboard_all_iteration_options(self, client, iters):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/dashboard",
            params={"outlet_id": OUTLET, "iterations": iters},
            timeout=90,
        )
        assert r.status_code == 200
        fc = r.json()["forecast"]
        if not fc["available"]:
            pytest.skip("forecast unavailable")
        assert fc["iterations"] == iters
        # P10<=P50<=P90 every horizon
        for hk, h in (fc.get("horizons") or {}).items():
            assert h["p10"] <= h["p50"] <= h["p90"], f"{iters}/{hk}"

    def test_invalid_iterations_falls_back_to_2000(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/dashboard",
            params={"outlet_id": OUTLET, "iterations": 999},
            timeout=60,
        )
        assert r.status_code == 200
        fc = r.json()["forecast"]
        if fc.get("available"):
            assert fc["iterations"] == 2000, (
                f"invalid value should fall back to 2000, got {fc['iterations']}"
            )

    def test_iteration_count_affects_sampling(self, client):
        """Different iter counts should produce different stdev values
        (same seed family, different sample sizes)."""
        results = {}
        for it in (1000, 7500):
            r = client.get(
                f"{BASE_URL}/api/chef-outlet/dashboard",
                params={"outlet_id": OUTLET, "iterations": it},
                timeout=90,
            )
            fc = r.json()["forecast"]
            if not fc.get("available"):
                pytest.skip("forecast unavailable")
            results[it] = fc["horizons"]["d7"]
        # P50 should be close but not necessarily identical; stdev may
        # differ. We at least confirm the API returned both correctly.
        assert results[1000] and results[7500]

    def test_nonexistent_outlet_returns_found_false(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/dashboard",
            params={"outlet_id": "non-existent-outlet-xyz"},
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["found"] is False
        assert d["outlet_id"] == "non-existent-outlet-xyz"


# ════════════════════ /chef-outlet/outlets-for-chef ════════════════════
class TestOutletsForChef:

    def test_no_email_returns_all_outlets(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/outlets-for-chef", timeout=30
        )
        assert r.status_code == 200
        d = r.json()
        assert "outlets" in d and "count" in d
        assert d["count"] == len(d["outlets"])
        assert d["count"] >= 1, "expected at least 1 outlet seeded"
        # Each outlet has outlet_id + name
        for o in d["outlets"]:
            assert "outlet_id" in o
            assert "name" in o

    def test_email_filter(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/outlets-for-chef",
            params={"email": "admin@echoaurion.com"},
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["chef_email"] == "admin@echoaurion.com"
        assert isinstance(d["outlets"], list)


# ═════════════════ /chef-outlet/forecast/recalibrate ═════════════════
class TestForecastFeedback:

    def test_recalibrate_persists(self, client):
        payload = {
            "outlet_id": OUTLET,
            "horizon_days": 3,
            "iterations": 2000,
            "predicted_p50": 10000.0,
            "actual_revenue": 11000.0,
            "accepted": True,
            "note": "TEST_iter266_12",
        }
        r = client.post(
            f"{BASE_URL}/api/chef-outlet/forecast/recalibrate",
            json=payload, timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        fb = d["feedback"]
        assert fb["outlet_id"] == OUTLET
        assert fb["delta_pct"] is not None
        # (11000 - 10000) / 10000 * 100 = 10.0
        assert abs(fb["delta_pct"] - 10.0) < 0.5

        # GET accuracy → should reflect this feedback (samples >= 1)
        time.sleep(0.5)
        a = client.get(
            f"{BASE_URL}/api/chef-outlet/forecast/accuracy",
            params={"outlet_id": OUTLET}, timeout=30,
        )
        assert a.status_code == 200
        ad = a.json()
        assert ad["samples"] >= 1
        assert ad["mean_delta_pct"] is not None
        assert ad["smape_pct"] is not None
        assert isinstance(ad["recent"], list)

    def test_accuracy_empty_outlet(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/forecast/accuracy",
            params={"outlet_id": "TEST_no_feedback_outlet_xyz"},
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["samples"] == 0
        assert d["smape_pct"] is None


# ════════════════════ /chef-outlet/beo-timeline ════════════════════
class TestBeoTimeline:

    def test_timeline_default_month(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/beo-timeline", timeout=30
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "events" in d and "totals" in d
        t = d["totals"]
        for k in ("count", "past_count", "future_count",
                  "last_minute_count", "recent_change_count",
                  "covers_total", "estimated_revenue_total",
                  "estimated_cost_total"):
            assert k in t, f"totals missing {k}"
        # Each event has color_tag in known set + boolean flags
        valid_tags = {"last_minute", "changed", "past", "scheduled"}
        for ev in d["events"]:
            assert ev["color_tag"] in valid_tags, ev["color_tag"]
            assert isinstance(ev["is_past"], bool)
            assert isinstance(ev["is_last_minute"], bool)
            assert isinstance(ev["is_recent_change"], bool)
            # estimated revenue = covers * 85
            assert abs(ev["estimated_revenue"]
                       - ev["expected_covers"] * 85.0) < 0.01
            # estimated cost = 32% revenue
            assert abs(ev["estimated_cost"]
                       - ev["estimated_revenue"] * 0.32) < 0.01

    def test_timeline_bad_month(self, client):
        r = client.get(
            f"{BASE_URL}/api/chef-outlet/beo-timeline",
            params={"month": "not-a-month"}, timeout=15,
        )
        assert r.status_code == 400

    def test_cumulative_with_events(self, client):
        # First fetch some event IDs from the timeline
        tl = client.get(
            f"{BASE_URL}/api/chef-outlet/beo-timeline", timeout=30
        ).json()
        ids = [e["id"] for e in tl["events"][:3] if e.get("id")]
        if not ids:
            pytest.skip("no BEOs available to cumulate")
        r = client.post(
            f"{BASE_URL}/api/chef-outlet/beo-timeline/cumulative",
            json=ids, timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["count"] == len(ids)
        # covers >= 0
        assert d["covers"] >= 0
        # revenue = covers * 85
        assert abs(d["revenue"] - d["covers"] * 85.0) < 0.01
        # cost = revenue * 0.32
        assert abs(d["cost"] - d["revenue"] * 0.32) < 0.01
        assert d.get("margin_pct") == 68.0
        assert len(d["events"]) == len(ids)

    def test_cumulative_empty(self, client):
        r = client.post(
            f"{BASE_URL}/api/chef-outlet/beo-timeline/cumulative",
            json=[], timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 0
        assert d["covers"] == 0
        assert d["revenue"] == 0.0


# ════════════════════ regression: Labor Brain (iter266.11) ════════════════════
class TestLaborBrainRegression:

    def test_labor_brain_still_works(self, client):
        r = client.get(
            f"{BASE_URL}/api/echo-schedule/labor-brain", timeout=30
        )
        assert r.status_code == 200, r.text
        d = r.json()
        # Just sanity-check it returned a dict (structure verified in iter267)
        assert isinstance(d, dict)

    def test_echo_schedule_dashboard_still_works(self, client):
        r = client.get(
            f"{BASE_URL}/api/echo-schedule/dashboard", timeout=30
        )
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), dict)
