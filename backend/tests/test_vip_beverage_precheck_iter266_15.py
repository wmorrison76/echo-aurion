"""iter266.15 — VIP Beverage Pre-Check + concierge-desk regression.

Covers POST /api/beverage-network/vip-precheck,
GET /api/beverage-network/vip-precheck/alerts,
POST /api/beverage-network/vip-precheck/alerts/{id}/resolve,
plus regressions for vip-tracker leader-gate, availability,
find, transfer, chef-outlet, beo-timeline, labor-brain.
"""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
PREFIX = f"{BASE}/api/beverage-network"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ── VIP Pre-Check core ─────────────────────────────────────────────────
class TestVipPrecheck:
    def test_shortfall_response_shape(self, s):
        r = s.post(f"{PREFIX}/vip-precheck", json={
            "vip_id": "vip-novak",
            "outlet_id": "rooftop-lounge",
            "party_size": 8,
            "preferred_beverages": ["Opus One", "Ketel One", "Macallan 18"],
            "notify": True,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["overall_status"] in ("shortfall", "tight", "ok")
        assert isinstance(body["results"], list)
        assert len(body["results"]) == 3
        for res in body["results"]:
            for k in ("sku", "central_on_hand", "expected_need_for_visit",
                      "shortfall_units", "status"):
                assert k in res, f"missing {k} in {res}"
        # Opus One: on_hand=2, expected ≥3 → shortfall ≥1
        opus = next(r for r in body["results"] if r["sku"] == "Opus One")
        assert opus["central_on_hand"] == 2
        assert opus["shortfall_units"] >= 1
        assert opus["status"] == "shortfall"
        assert body["overall_status"] == "shortfall"
        assert body["alert_filed"] is True
        assert body["alert_id"] is not None
        pytest.alert_id = body["alert_id"]

    def test_notify_false_does_not_persist(self, s):
        r = s.post(f"{PREFIX}/vip-precheck", json={
            "vip_id": "vip-reyes",
            "outlet_id": "rooftop-lounge",
            "party_size": 8,
            "preferred_beverages": ["Opus One"],
            "notify": False,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["alert_filed"] is False
        assert body["alert_id"] is None

    def test_empty_preferred_beverages(self, s):
        r = s.post(f"{PREFIX}/vip-precheck", json={
            "vip_id": "vip-okafor",
            "party_size": 4,
            "preferred_beverages": [],
            "notify": True,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["results"] == []
        assert body["overall_status"] == "ok"
        assert body["alert_filed"] is False

    def test_alerts_list_and_filter(self, s):
        r = s.get(f"{PREFIX}/vip-precheck/alerts")
        assert r.status_code == 200
        body = r.json()
        assert "alerts" in body and "count" in body
        assert body["count"] >= 1
        assert isinstance(body["alerts"], list)

        # filter by outlet_id
        r2 = s.get(f"{PREFIX}/vip-precheck/alerts",
                   params={"outlet_id": "rooftop-lounge", "status": "open"})
        assert r2.status_code == 200
        for a in r2.json()["alerts"]:
            assert a["outlet_id"] == "rooftop-lounge"
            assert a["status"] == "open"

    def test_resolve_alert(self, s):
        alert_id = getattr(pytest, "alert_id", None)
        if not alert_id:
            pytest.skip("no alert_id from prior test")
        r = s.post(
            f"{PREFIX}/vip-precheck/alerts/{alert_id}/resolve",
            params={"resolved_by": "gm-test"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["alert_id"] == alert_id

        # verify persistence by fetching all alerts
        r2 = s.get(f"{PREFIX}/vip-precheck/alerts", params={"status": "all"})
        assert r2.status_code == 200
        match = next((a for a in r2.json()["alerts"] if a["id"] == alert_id), None)
        assert match is not None, "resolved alert not found"
        assert match["status"] == "resolved"
        assert match["resolved_by"] == "gm-test"
        assert "resolved_at" in match


# ── Regressions ────────────────────────────────────────────────────────
class TestRegressions:
    def test_vip_tracker_list_concierge_desk_allowed(self, s):
        r = s.get(f"{BASE}/api/vip-tracker/list",
                  params={"status": "all"},
                  headers={"X-User-Id": "concierge-desk"})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_vip_tracker_list_anon_still_forbidden(self, s):
        r = s.get(f"{BASE}/api/vip-tracker/list",
                  params={"status": "all"})
        assert r.status_code == 403

    def test_availability(self, s):
        r = s.get(f"{PREFIX}/availability")
        assert r.status_code == 200
        body = r.json()
        assert "central_stock" in body and "totals" in body

    def test_find_paloma(self, s):
        r = s.get(f"{PREFIX}/find", params={"sku": "paloma"})
        assert r.status_code == 200
        body = r.json()
        assert body["sku_query"] == "paloma"
        assert "transfer_suggestions" in body

    def test_transfer(self, s):
        r = s.post(f"{PREFIX}/transfer", json={
            "sku": "TEST_SKU_X",
            "quantity": 1,
            "from_outlet": "rooftop",
            "to_outlet": "galley",
            "requested_by": "test-suite",
            "reason": "regression-test",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["transfer"]["from_outlet"] == "rooftop"
        assert body["transfer"]["to_outlet"] == "galley"

    def test_chef_outlet_dashboard(self, s):
        r = s.get(f"{BASE}/api/chef-outlet/dashboard",
                  params={"outlet_id": "p66demo-galley"})
        assert r.status_code == 200

    def test_chef_outlet_beo_timeline(self, s):
        r = s.get(f"{BASE}/api/chef-outlet/beo-timeline")
        assert r.status_code == 200

    def test_labor_brain(self, s):
        r = s.get(f"{BASE}/api/echo-schedule/labor-brain")
        assert r.status_code == 200
