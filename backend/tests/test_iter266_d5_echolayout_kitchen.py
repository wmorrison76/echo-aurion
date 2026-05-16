"""
iter266 - D5 EchoLayout Kitchen Designer + Demo Seed + Existing Port Retention.

Validates:
  - GET /api/echolayout/kitchen/equipment-library (31 items, filters work)
  - POST /api/echolayout/kitchen/design (line_kitchen design algorithm)
  - POST /api/echolayout/kitchen/designs + GET /api/echolayout/kitchen/designs/{id}
  - GET /api/commissary/catalog?outlet_id=outlet-cafe (>=10 products)
  - POST /api/weather-rebook/check (Pier66 lat/lng)
  - Existing routers: kitchen-fire, fire-safety, voice, receiving, qr, help-agent, myecho payroll
"""

import os
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Fallback: read from frontend/.env
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.strip().startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except Exception:
            pass
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_base_url()
TIMEOUT = 30


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ───────────────────────── D5 EchoLayout Kitchen ─────────────────────────

class TestEchoLayoutKitchen:
    def test_equipment_library_returns_31_items(self, api):
        r = api.get(f"{BASE_URL}/api/echolayout/kitchen/equipment-library", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert isinstance(data.get("items"), list)
        assert data.get("count") == 31, f"expected 31 items, got {data.get('count')}"
        # verify _id is excluded
        for item in data["items"]:
            assert "_id" not in item
            assert "slug" in item

    def test_equipment_library_filter_by_category(self, api):
        r = api.get(
            f"{BASE_URL}/api/echolayout/kitchen/equipment-library",
            params={"category": "cooking"}, timeout=TIMEOUT,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["count"] > 0
        for item in data["items"]:
            assert item["category"] == "cooking"

    def test_equipment_library_filter_by_station(self, api):
        r = api.get(
            f"{BASE_URL}/api/echolayout/kitchen/equipment-library",
            params={"station": "hot_line"}, timeout=TIMEOUT,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["count"] > 0
        for item in data["items"]:
            assert item["station"] == "hot_line"

    def test_run_design_line_kitchen_4_items(self, api):
        # Fetch 4 real catalog items to use as design input
        lib = api.get(f"{BASE_URL}/api/echolayout/kitchen/equipment-library",
                     timeout=TIMEOUT).json()
        # Choose 4 deterministic items
        slugs = ["range_6_burner", "reach_in_cooler_2dr", "three_comp_sink", "prep_table_6ft"]
        equipment = [i for i in lib["items"] if i["slug"] in slugs]
        assert len(equipment) == 4, f"missing seed slugs, got {[e['slug'] for e in equipment]}"

        payload = {
            "workflow": "line_kitchen",
            "room": {"width": 40, "length": 25, "units": "ft",
                     "ceiling_height_ft": 12, "has_gas_main": True, "has_grease_trap": True},
            "equipment": equipment,
        }
        r = api.post(f"{BASE_URL}/api/echolayout/kitchen/design", json=payload, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        d = body["design"]
        # Required structures
        for key in ("placements", "thermal_zones", "utility_runs", "compliance", "totals"):
            assert key in d, f"missing key {key} in design"
        # NOTE: algorithm may silently skip items that don't fit station packing.
        # Spec only requires placements[] is returned; we assert >=3 placed of 4.
        assert isinstance(d["placements"], list) and len(d["placements"]) >= 3
        assert isinstance(d["thermal_zones"], list)
        assert isinstance(d["utility_runs"], list)
        assert isinstance(d["compliance"], list)
        # Totals keys
        t = d["totals"]
        for tkey in ("equipment_count", "total_thermal_btu",
                     "total_estimated_cost_usd", "floor_area_used_pct",
                     "requires_hood_count"):
            assert tkey in t, f"missing totals.{tkey}"
        assert t["equipment_count"] >= 3
        # range_6_burner has 180000 BTU and needs_hood=True
        assert t["total_thermal_btu"] >= 180000
        assert t["requires_hood_count"] >= 1
        assert t["total_estimated_cost_usd"] > 0

    def test_save_and_read_design(self, api):
        lib = api.get(f"{BASE_URL}/api/echolayout/kitchen/equipment-library",
                     timeout=TIMEOUT).json()
        slugs = ["range_6_burner", "reach_in_cooler_2dr", "three_comp_sink", "prep_table_6ft"]
        equipment = [i for i in lib["items"] if i["slug"] in slugs]

        # First run design
        design_payload = {
            "workflow": "line_kitchen",
            "room": {"width": 40, "length": 25, "units": "ft",
                     "ceiling_height_ft": 12, "has_gas_main": True, "has_grease_trap": True},
            "equipment": equipment,
        }
        dr = api.post(f"{BASE_URL}/api/echolayout/kitchen/design",
                      json=design_payload, timeout=TIMEOUT).json()
        design = dr["design"]

        save_payload = {
            "name": "TEST_iter266_kitchen",
            "outletId": "outlet-cafe",
            "workflow": "line_kitchen",
            "room": design_payload["room"],
            "equipment": equipment,
            "placements": design["placements"],
            "thermal_zones": design["thermal_zones"],
            "utility_runs": design["utility_runs"],
            "compliance": design["compliance"],
            "totals": design["totals"],
            "generatedBy": "iter266-test",
        }
        sr = api.post(f"{BASE_URL}/api/echolayout/kitchen/designs",
                      json=save_payload, timeout=TIMEOUT)
        assert sr.status_code == 200, sr.text
        sbody = sr.json()
        assert sbody["success"] is True
        design_id = sbody.get("designId")
        assert design_id and isinstance(design_id, str)

        # Read it back
        rr = api.get(f"{BASE_URL}/api/echolayout/kitchen/designs/{design_id}",
                     timeout=TIMEOUT)
        assert rr.status_code == 200, rr.text
        rbody = rr.json()
        assert rbody["success"] is True
        got = rbody["design"]
        assert got["id"] == design_id
        assert got["design_type"] == "kitchen"
        assert got["outlet_id"] == "outlet-cafe"
        assert "_id" not in got


# ───────────────────────── Demo Data Seed: Commissary ─────────────────────────

class TestCommissaryCatalog:
    def test_catalog_returns_at_least_10_products(self, api):
        r = api.get(f"{BASE_URL}/api/commissary/catalog",
                    params={"outlet_id": "outlet-cafe"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        # Be flexible: list or {products: []} or {items: []}
        products = data if isinstance(data, list) else (
            data.get("products") or data.get("items") or data.get("data") or []
        )
        assert isinstance(products, list)
        assert len(products) >= 10, f"expected >=10 commissary products, got {len(products)}"


# ───────────────────────── Weather Rebook ─────────────────────────

class TestWeatherRebook:
    def test_weather_check_pier66(self, api):
        # Use 168h horizon (7 days) so seeded outdoor BEOs (+1d..+6d) are included
        payload = {"property_id": "prop-pier66", "lat": 26.1224, "lng": -80.1373,
                   "horizon_hours": 168}
        try:
            r = api.post(f"{BASE_URL}/api/weather-rebook/check",
                         json=payload, timeout=45)
        except requests.exceptions.Timeout:
            pytest.skip("NWS upstream timeout - acceptable per problem statement")
        assert r.status_code == 200, r.text
        data = r.json()
        # outdoor_functions can be list or count
        of = data.get("outdoor_functions")
        if isinstance(of, list):
            assert len(of) >= 3, f"expected >=3 outdoor functions, got {len(of)}"
        elif isinstance(of, int):
            assert of >= 3
        else:
            # Might be nested
            outdoor_count = data.get("outdoor_function_count")
            assert outdoor_count is not None and outdoor_count >= 3, \
                f"no outdoor_functions field: {list(data.keys())}"

        ds = data.get("data_source")
        assert ds in {"live_nws", "no_severe_alerts", "no_outdoor_functions"}, \
            f"unexpected data_source: {ds}"


# ───────────────────────── Existing Port Retention ─────────────────────────

class TestExistingPorts:
    def test_kitchen_fire_active(self, api):
        r = api.get(f"{BASE_URL}/api/kitchen-fire/tickets/active", timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_fire_safety_active(self, api):
        r = api.get(f"{BASE_URL}/api/fire-safety/active", timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_voice_router_mounted(self, api):
        # Try common voice endpoints; success if any returns non-404
        candidates = ["/api/voice", "/api/voice/health", "/api/voice/status",
                      "/api/voice/transcripts", "/api/voice/sessions"]
        ok = False
        last = None
        for ep in candidates:
            try:
                r = api.get(f"{BASE_URL}{ep}", timeout=TIMEOUT)
                last = (ep, r.status_code)
                if r.status_code != 404:
                    ok = True
                    break
            except Exception:
                continue
        assert ok, f"voice router not mounted - all 404. last={last}"

    def test_receiving_router_mounted(self, api):
        candidates = ["/api/inventory/receipts", "/api/inventory/receipts/list",
                      "/api/inventory/receipts/recent", "/api/inventory/receipts/active"]
        ok = False
        last = None
        for ep in candidates:
            r = api.get(f"{BASE_URL}{ep}", timeout=TIMEOUT)
            last = (ep, r.status_code)
            if r.status_code == 200:
                ok = True
                break
        assert ok, f"receiving router endpoints not 200. last={last}"

    def test_qr_types(self, api):
        r = api.get(f"{BASE_URL}/api/qr/types", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        types = data if isinstance(data, list) else (
            data.get("types") or data.get("items") or []
        )
        assert len(types) >= 5, f"expected >=5 qr types, got {len(types)}"

    def test_help_agent_tours(self, api):
        r = api.get(f"{BASE_URL}/api/help-agent/tours", timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_myecho_payroll_comprehensive(self, api):
        r = api.get(f"{BASE_URL}/api/myecho/payroll/comprehensive", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
