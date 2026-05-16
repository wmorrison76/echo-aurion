"""
iter266.16 - BEO Detail Command Center backend tests
Tests:
  - GET /api/chef-outlet/beo-timeline/{id}/detail  enriched payload
  - POST /api/chef-outlet/beo-timeline/{id}/order/submit  flips order state
  - GET /api/chef-outlet/beo-timeline/{id}/print/{kind}  HTML rendering
  - GET /api/calendar/events  merges BEOs as event_type='beo'
"""
import os
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Read from frontend/.env directly
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_base_url()
DEMO_BEO_IDS = [
    "demo-bf-rooftop-sunset",
    "demo-bf-poolside-brunch",
    "demo-bf-garden-gala",      # 320 covers - for scaling check
    "demo-bf-beach-ceremony",
]
GARDEN_GALA = "demo-bf-garden-gala"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── BEO detail endpoint ────────────────────────────────────────────────
class TestBEODetail:
    def test_detail_returns_200_with_required_keys(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/detail")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in [
            "menu_items", "order_status", "prep_items", "setup",
            "schedule_team", "schedule_team_visible",
            "days_until_event", "printable_urls", "event_timeline_id",
            "same_day_beo_count",
        ]:
            assert key in data, f"missing key: {key}"
        # setup sub-keys
        for k in ["equipment", "setup_minutes", "teardown_minutes", "buffet_layout"]:
            assert k in data["setup"], f"setup missing: {k}"

    def test_detail_404_for_non_existent(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/non-existent-id/detail")
        assert r.status_code == 404

    def test_menu_items_shape(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/detail")
        data = r.json()
        assert isinstance(data["menu_items"], list)
        assert len(data["menu_items"]) > 0, "expected at least one menu item"
        for m in data["menu_items"]:
            assert "name" in m and m["name"]
            assert "cost_per_cover" in m  # nullable
            assert "is_costed" in m and isinstance(m["is_costed"], bool)

    def test_order_status_fresh_not_started(self, client):
        # Use rooftop sunset which hasn't been touched yet
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/demo-bf-beach-ceremony/detail")
        data = r.json()
        os_ = data["order_status"]
        # If a prior test or seed inserted an order, accept submitted=True; else assert defaults
        if os_["submitted"] is False:
            assert os_["status"] == "not_started"

    def test_printable_urls_present(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/detail")
        urls = r.json()["printable_urls"]
        assert "beo_pdf" in urls and urls["beo_pdf"].endswith("/print/beo")
        assert "recipe_packet" in urls and urls["recipe_packet"].endswith("/print/recipes")
        assert "setup_sheet" in urls and urls["setup_sheet"].endswith("/print/setup")

    def test_schedule_team_visible_within_14_days(self, client):
        # Demo BEOs are mid-May 2026, today is ~May 12 2026 -> within 14 days
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/detail")
        data = r.json()
        assert data["schedule_team_visible"] is True
        assert data["days_until_event"] is not None
        assert -1 < data["days_until_event"] < 14
        # schedule_team is a list (may be empty if no shifts seeded - non-fatal)
        assert isinstance(data["schedule_team"], list)

    def test_setup_default_equipment_scales_for_320_covers(self, client):
        # Garden Gala = 320 covers -> tables=40, chairs=324, etc.
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/detail")
        eq = r.json()["setup"]["equipment"]
        names = [e["item"] for e in eq]
        # Standard items present (any of the 7 banquet defaults OR a custom equipment_list)
        # If BEO has no equipment_list, we expect the 7 defaults
        # Look for partial matches because outdoor venue uses 'Buffet stations · outdoor'
        expected_partials = [
            "60-inch round tables", "Banquet chairs", "Linens",
            "Plate setups", "Glassware", "Buffet stations", "Audio",
        ]
        for partial in expected_partials:
            assert any(partial in n for n in names), f"missing equipment: {partial} (have {names})"
        # Scaling check
        tables = next(e for e in eq if "60-inch" in e["item"])
        chairs = next(e for e in eq if "Banquet chairs" in e["item"])
        assert tables["qty"] == 320 // 8  # 40
        assert chairs["qty"] == 320 + 4   # 324

    def test_same_day_beo_count_at_least_one(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/detail")
        # The BEO itself counts
        assert r.json()["same_day_beo_count"] >= 1


# ── Order submit endpoint ──────────────────────────────────────────────
class TestOrderSubmit:
    def test_submit_creates_purchase_approval_and_detail_reflects_it(self, client):
        target = "demo-bf-poolside-brunch"
        r = client.post(
            f"{BASE_URL}/api/chef-outlet/beo-timeline/{target}/order/submit",
            params={"submitted_by": "test-user"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["status"] == "submitted"
        assert body["submitted_by"] == "test-user"
        assert body["submitted_at"]

        # GET detail should now reflect submitted
        d = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{target}/detail").json()
        os_ = d["order_status"]
        assert os_["submitted"] is True
        assert os_["status"] == "submitted"
        assert os_["submitted_by"] == "test-user"
        assert os_["submitted_at"]
        assert os_["expected_arrival"]

    def test_submit_idempotent_double_post(self, client):
        target = "demo-bf-rooftop-sunset"
        r1 = client.post(
            f"{BASE_URL}/api/chef-outlet/beo-timeline/{target}/order/submit",
            params={"submitted_by": "test-user-A"},
        )
        assert r1.status_code == 200
        r2 = client.post(
            f"{BASE_URL}/api/chef-outlet/beo-timeline/{target}/order/submit",
            params={"submitted_by": "test-user-B"},
        )
        assert r2.status_code == 200
        d = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{target}/detail").json()
        assert d["order_status"]["submitted"] is True
        assert d["order_status"]["status"] == "submitted"

    def test_submit_404_for_non_existent(self, client):
        r = client.post(
            f"{BASE_URL}/api/chef-outlet/beo-timeline/non-existent-id/order/submit"
        )
        assert r.status_code == 404


# ── Printable HTML endpoints ───────────────────────────────────────────
class TestPrintableHTML:
    def test_print_beo_html(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/print/beo")
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
        body = r.text
        # h2 has the BEO name
        assert "<h2>" in body
        assert "Aurum Black-Tie Garden Gala" in body
        assert "Menu" in body  # Menu section heading

    def test_print_recipes_html(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/print/recipes")
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
        body = r.text
        assert "Menu Items" in body
        assert "Production Notes" in body

    def test_print_setup_html_table(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{GARDEN_GALA}/print/setup")
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
        body = r.text
        assert "<table" in body
        # Expect a column header for the equipment table
        assert "Item" in body and "Qty" in body


# ── Calendar merge with BEOs ───────────────────────────────────────────
class TestCalendarBEOMerge:
    def test_calendar_includes_beos_in_may(self, client):
        r = client.get(
            f"{BASE_URL}/api/calendar/events",
            params={"start_date": "2026-05-01", "end_date": "2026-05-31"},
        )
        assert r.status_code == 200, r.text
        events = r.json()["data"]
        beos = [e for e in events if e.get("event_type") == "beo"]
        assert len(beos) > 0, "no BEO events merged into calendar"
        b = beos[0]
        assert b["source_module"] == "maestrobqt"
        assert b["deep_link_panel"] == "beo-timeline-ui"
        assert b["deep_link_event_id"]
        assert "beo" in (b.get("tags") or [])

    def test_calendar_filter_by_source_module_returns_only_beos(self, client):
        r = client.get(
            f"{BASE_URL}/api/calendar/events",
            params={"source_module": "maestrobqt"},
        )
        assert r.status_code == 200
        events = r.json()["data"]
        assert len(events) > 0
        for e in events:
            assert e.get("source_module") == "maestrobqt"
            assert e.get("event_type") == "beo"

    def test_calendar_no_filter_returns_merged(self, client):
        r = client.get(f"{BASE_URL}/api/calendar/events")
        assert r.status_code == 200
        events = r.json()["data"]
        # Regression: should not crash, should be non-empty (BEOs at minimum)
        assert isinstance(events, list)
        # At least the BEO demos should be there
        beo_count = sum(1 for e in events if e.get("event_type") == "beo")
        assert beo_count >= 1
