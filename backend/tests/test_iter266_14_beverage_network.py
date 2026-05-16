"""
iter266.14 · Beverage Network backend test suite

Covers:
  - GET /api/beverage-network/availability (base, category filters)
  - GET /api/beverage-network/find        (central + outlet + exclude_outlet)
  - POST /api/beverage-network/transfer   (happy path + validations)
  - GET /api/beverage-network/transfers   (audit list)
  - Regression: chef-outlet/dashboard, beo-timeline, beo-timeline/cumulative,
                echo-schedule/labor-brain
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

API = f"{BASE_URL}/api/beverage-network"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─────────────────── /availability ───────────────────
class TestAvailability:
    def test_availability_base(self, client):
        r = client.get(f"{API}/availability", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("central_stock", "by_outlet", "low_stock", "totals"):
            assert k in data, f"missing key {k}"
        totals = data["totals"]
        for k in ("central_sku_count", "central_value", "low_stock_count",
                  "below_reorder_count", "outlets_with_sales"):
            assert k in totals, f"missing totals.{k}"
        assert isinstance(data["central_stock"], list)
        assert isinstance(data["by_outlet"], list)
        # Seed says 10 central SKUs (alcoholic) and 8 outlets in sales
        assert totals["central_sku_count"] >= 1
        # Outlets with sales should be > 0 per seed (8 outlets)
        assert totals["outlets_with_sales"] >= 1

    def test_availability_filter_alcoholic(self, client):
        r = client.get(f"{API}/availability", params={"category": "alcoholic"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["category_filter"] == "alcoholic"
        for c in data["central_stock"]:
            assert c["alcoholic"] is True, f"non-alcoholic leaked in alc filter: {c.get('name')}"
        # Per seed, all 10 central SKUs are alcoholic
        assert len(data["central_stock"]) >= 1

    def test_availability_filter_non_alcoholic(self, client):
        r = client.get(f"{API}/availability", params={"category": "non_alcoholic"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["category_filter"] == "non_alcoholic"
        # Seed only has alcoholic central SKUs, so this should be empty
        for c in data["central_stock"]:
            assert c["alcoholic"] is False
        assert data["totals"]["central_sku_count"] == len(data["central_stock"])


# ─────────────────── /find ───────────────────
class TestFind:
    def test_find_paloma_has_outlet_matches(self, client):
        r = client.get(f"{API}/find", params={"sku": "paloma"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("central_matches", "outlet_matches", "transfer_suggestions"):
            assert k in data
        # Paloma is in foh_beverage_sales per seed
        assert isinstance(data["outlet_matches"], list)
        # Validate confidence enum on suggestions
        for s in data["transfer_suggestions"]:
            assert s["confidence"] in ("high", "medium", "low"), s

    def test_find_ketel_one_central(self, client):
        r = client.get(f"{API}/find", params={"sku": "ketel one"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data["central_matches"]) >= 1, "Ketel One must appear in central_matches"
        names = [c.get("name", "").lower() for c in data["central_matches"]]
        assert any("ketel" in n for n in names)

    def test_find_exclude_outlet(self, client):
        # First confirm 'garni' may have paloma sales then exclude
        r_all = client.get(f"{API}/find", params={"sku": "paloma"}, timeout=30)
        assert r_all.status_code == 200
        r = client.get(f"{API}/find",
                       params={"sku": "paloma", "exclude_outlet": "garni"}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        for m in data["outlet_matches"]:
            assert m["outlet_slug"] != "garni", "garni outlet leaked despite exclude_outlet"


# ─────────────────── /transfer + /transfers ───────────────────
class TestTransfer:
    def test_transfer_happy_path(self, client):
        body = {
            "sku": "TEST_Paloma",
            "quantity": 2,
            "from_outlet": "garni",
            "to_outlet": "pier-top",
            "requested_by": "TEST_gm",
            "reason": "TEST_vip_walk_in",
        }
        r = client.post(f"{API}/transfer", json=body, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        t = data["transfer"]
        assert t["status"] == "pending"
        assert t["sku"] == body["sku"]
        assert t["quantity"] == body["quantity"]
        assert t["from_outlet"] == "garni"
        assert t["to_outlet"] == "pier-top"
        assert "id" in t and t["id"].startswith("bxfer-")
        # Persistence check via /transfers
        list_r = client.get(f"{API}/transfers", timeout=30)
        assert list_r.status_code == 200
        ldata = list_r.json()
        assert "transfers" in ldata and "count" in ldata
        ids = [row["id"] for row in ldata["transfers"]]
        assert t["id"] in ids, "newly created transfer not present in /transfers list"

    def test_transfer_same_outlet_400(self, client):
        body = {"sku": "TEST_x", "quantity": 1, "from_outlet": "garni", "to_outlet": "garni"}
        r = client.post(f"{API}/transfer", json=body, timeout=30)
        assert r.status_code == 400, r.text

    def test_transfer_zero_quantity_422(self, client):
        body = {"sku": "TEST_x", "quantity": 0, "from_outlet": "garni", "to_outlet": "pier-top"}
        r = client.post(f"{API}/transfer", json=body, timeout=30)
        assert r.status_code == 422, r.text

    def test_transfer_negative_quantity_422(self, client):
        body = {"sku": "TEST_x", "quantity": -3, "from_outlet": "garni", "to_outlet": "pier-top"}
        r = client.post(f"{API}/transfer", json=body, timeout=30)
        assert r.status_code == 422, r.text

    def test_transfers_listing_shape(self, client):
        r = client.get(f"{API}/transfers", params={"limit": 10}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data["transfers"], list)
        assert data["count"] == len(data["transfers"])


# ─────────────────── Regression ───────────────────
class TestRegression:
    def test_chef_outlet_dashboard(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/dashboard",
                       params={"outlet_id": "p66demo-galley"}, timeout=30)
        assert r.status_code == 200, r.text

    def test_beo_timeline(self, client):
        r = client.get(f"{BASE_URL}/api/chef-outlet/beo-timeline", timeout=30)
        assert r.status_code == 200, r.text

    def test_beo_timeline_cumulative(self, client):
        # Endpoint signature: event_ids: List[str] — body is a raw JSON list
        r = client.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/cumulative",
                        json=[], timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("count", "covers", "revenue", "cost", "events"):
            assert k in data, f"missing key {k}"
        assert data["count"] == 0

    def test_labor_brain(self, client):
        r = client.get(f"{BASE_URL}/api/echo-schedule/labor-brain", timeout=30)
        assert r.status_code == 200, r.text
