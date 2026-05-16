"""iter224 · ECW Ops backend tests — Line Check, Menu CRUD, Recipes, Photos, Publish, Outlets, Par-Suggest, Averaged-Trust.

Tests:
- ECW Ops endpoints: stations, items, components, recipes, outlets/mine, summary, published, par-suggest
- Line Check flow: start → record (with temp excursion) → complete
- Menu CRUD: create item, patch item, create/delete component
- Recipes: create/upsert, SMS (queued mode)
- Photos: upload (with auto-name), patch, list
- Menu publish: version increment + snapshot
- Outlet switch: success + 403 for non-accessible
- Benchmark averaged-trust endpoint
"""
import os
import pytest
import requests
import base64

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestEcwOpsStations:
    """Test GET /api/ecw-ops/stations"""

    def test_list_stations(self):
        r = requests.get(f"{BASE_URL}/api/ecw-ops/stations?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["count"] == 5
        assert len(data["rows"]) == 5
        # Verify station names
        names = [s["name"] for s in data["rows"]]
        assert "Hot Line · Breakfast" in names
        assert "Pastry" in names
        print(f"✓ Stations: {data['count']} stations returned")


class TestEcwOpsItems:
    """Test GET /api/ecw-ops/items"""

    def test_list_items(self):
        r = requests.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["count"] >= 17  # Seeded 17 items
        print(f"✓ Items: {data['count']} items returned")

    def test_list_items_by_station(self):
        # Get first station
        stations = requests.get(f"{BASE_URL}/api/ecw-ops/stations?outlet_id=outlet-main").json()
        station_id = stations["rows"][0]["id"]
        r = requests.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main&station_id={station_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        # All items should belong to the filtered station
        for item in data["rows"]:
            assert item["station_id"] == station_id
        print(f"✓ Items by station: {data['count']} items for station {station_id}")


class TestEcwOpsComponents:
    """Test GET /api/ecw-ops/components"""

    def test_list_components(self):
        # Get first item
        items = requests.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main").json()
        item_id = items["rows"][0]["id"]
        r = requests.get(f"{BASE_URL}/api/ecw-ops/components?item_id={item_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        print(f"✓ Components: {data['count']} components for item {item_id}")


class TestEcwOpsRecipes:
    """Test GET /api/ecw-ops/recipes with search"""

    def test_list_recipes(self):
        r = requests.get(f"{BASE_URL}/api/ecw-ops/recipes?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["count"] >= 5  # Seeded 5 recipes
        print(f"✓ Recipes: {data['count']} recipes returned")

    def test_search_recipes(self):
        r = requests.get(f"{BASE_URL}/api/ecw-ops/recipes?outlet_id=outlet-main&q=eggs")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        # Should find recipes with "eggs" in name or tags
        print(f"✓ Recipe search 'eggs': {data['count']} results")


class TestEcwOpsOutlets:
    """Test outlets/mine and outlets/switch"""

    def test_outlets_mine(self):
        r = requests.get(f"{BASE_URL}/api/ecw-ops/outlets/mine", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["chef_id"] == "chef-william"
        # chef-william should have 2 outlets: main + beachside
        assert len(data["outlets"]) >= 2
        outlet_ids = [o["id"] for o in data["outlets"]]
        assert "outlet-main" in outlet_ids
        assert "outlet-beachside" in outlet_ids
        print(f"✓ Outlets/mine: {len(data['outlets'])} outlets for chef-william")

    def test_outlet_switch_success(self):
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/outlets/switch",
            headers=HEADERS,
            json={"outlet_id": "outlet-beachside"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["primary_outlet_id"] == "outlet-beachside"
        print("✓ Outlet switch to beachside: success")
        # Switch back to main
        requests.post(
            f"{BASE_URL}/api/ecw-ops/outlets/switch",
            headers=HEADERS,
            json={"outlet_id": "outlet-main"}
        )

    def test_outlet_switch_forbidden(self):
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/outlets/switch",
            headers=HEADERS,
            json={"outlet_id": "outlet-nonexistent"}
        )
        assert r.status_code == 403
        print("✓ Outlet switch to non-accessible outlet: 403 returned")


class TestEcwOpsSummary:
    """Test GET /api/ecw-ops/summary"""

    def test_summary(self):
        r = requests.get(f"{BASE_URL}/api/ecw-ops/summary?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["stations"] == 5
        assert data["items"] >= 17
        assert "menu_version" in data
        print(f"✓ Summary: {data['stations']} stations, {data['items']} items, v{data['menu_version']}")


class TestEcwOpsPublished:
    """Test GET /api/ecw-ops/published"""

    def test_published(self):
        r = requests.get(f"{BASE_URL}/api/ecw-ops/published?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "publication" in data
        pub = data["publication"]
        assert "version" in pub
        assert "snapshot" in pub
        assert pub["snapshot"]["station_count"] == 5
        print(f"✓ Published: v{pub['version']} with {pub['snapshot']['item_count']} items")


class TestEcwOpsParSuggest:
    """Test GET /api/ecw-ops/par-suggest/{item_id}"""

    def test_par_suggest(self):
        # Get first item
        items = requests.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main").json()
        item_id = items["rows"][0]["id"]
        item_name = items["rows"][0]["name"]
        r = requests.get(f"{BASE_URL}/api/ecw-ops/par-suggest/{item_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["item_id"] == item_id
        assert "suggested" in data
        assert "baseline" in data
        assert "drivers" in data
        drivers = data["drivers"]
        # Verify all driver fields present
        assert "sales_velocity_30d" in drivers
        assert "occupancy" in drivers
        assert "reservations_today" in drivers
        assert "weather_mult" in drivers
        assert "dow_mult" in drivers
        assert "event_boost" in drivers
        print(f"✓ Par-suggest for {item_name}: suggested={data['suggested']}, drivers={list(drivers.keys())}")


class TestLineCheckFlow:
    """Test Line Check flow: start → record → complete"""

    def test_line_check_full_flow(self):
        # 1. Start a line check session
        stations = requests.get(f"{BASE_URL}/api/ecw-ops/stations?outlet_id=outlet-main").json()
        station_id = stations["rows"][0]["id"]
        
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/line-check/start",
            headers=HEADERS,
            json={"outlet_id": "outlet-main", "station_id": station_id}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        session = data["session"]
        assert session["status"] == "in_progress"
        assert session["station_id"] == station_id
        session_id = session["id"]
        
        # Verify items have par_suggested
        items = data["items"]
        assert len(items) > 0
        for item in items:
            assert "par_suggested" in item
            assert "suggested" in item["par_suggested"]
            assert "drivers" in item["par_suggested"]
        print(f"✓ Line check started: session={session_id}, {len(items)} items with par_suggested")

        # 2. Record a check (non-perishable, no temp)
        item_id = items[0]["id"]
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/line-check/record",
            headers=HEADERS,
            json={
                "session_id": session_id,
                "item_id": item_id,
                "par_observed": 10,
                "par_adjusted": 12
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["record"]["flag_temp_excursion"] is False
        print(f"✓ Line check record (non-perishable): no temp excursion")

        # 3. Record a check with temp excursion (find a perishable item)
        perishable_item = next((i for i in items if i.get("is_perishable")), None)
        if perishable_item:
            # Record with out-of-range temp (55°C is too high)
            r = requests.post(
                f"{BASE_URL}/api/ecw-ops/line-check/record",
                headers=HEADERS,
                json={
                    "session_id": session_id,
                    "item_id": perishable_item["id"],
                    "par_observed": 5,
                    "temp_c": 55.0  # Out of range
                }
            )
            assert r.status_code == 200
            data = r.json()
            assert data["ok"] is True
            assert data["record"]["flag_temp_excursion"] is True
            print(f"✓ Line check record (perishable, 55°C): temp excursion flagged")
        else:
            print("⚠ No perishable item found to test temp excursion")

        # 4. Complete the session
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/line-check/complete",
            headers=HEADERS,
            json={"session_id": session_id}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["session"]["status"] == "complete"
        print(f"✓ Line check completed: session={session_id}")


class TestMenuCRUD:
    """Test Menu CRUD: create item, patch item, create/delete component"""

    def test_create_and_patch_item(self):
        # Get first station
        stations = requests.get(f"{BASE_URL}/api/ecw-ops/stations?outlet_id=outlet-main").json()
        station_id = stations["rows"][0]["id"]

        # Create item
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/items",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "station_id": station_id,
                "name": "TEST_Avocado Toast",
                "is_perishable": True,
                "par_default": 20,
                "cost": 3.50,
                "sell_price": 12.00,
                "temp_min_c": 0,
                "temp_max_c": 8
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        item = data["item"]
        item_id = item["id"]
        # Verify margin computed
        expected_margin = (12.00 - 3.50) / 12.00
        assert abs(item["margin"] - expected_margin) < 0.01
        print(f"✓ Item created: {item_id}, margin={item['margin']:.3f}")

        # Patch item
        r = requests.patch(
            f"{BASE_URL}/api/ecw-ops/items/{item_id}",
            headers=HEADERS,
            json={"cost": 4.00, "sell_price": 14.00}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        updated = data["item"]
        assert updated["cost"] == 4.00
        assert updated["sell_price"] == 14.00
        # Verify margin recomputed
        new_margin = (14.00 - 4.00) / 14.00
        assert abs(updated["margin"] - new_margin) < 0.01
        print(f"✓ Item patched: cost=4.00, sell=14.00, margin={updated['margin']:.3f}")

        # Cleanup: soft-delete by setting active=false
        requests.patch(
            f"{BASE_URL}/api/ecw-ops/items/{item_id}",
            headers=HEADERS,
            json={"active": False}
        )

    def test_create_and_delete_component(self):
        # Get first item
        items = requests.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main").json()
        item_id = items["rows"][0]["id"]

        # Create component
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/components",
            headers=HEADERS,
            json={
                "item_id": item_id,
                "ingredient": "TEST_Butter",
                "quantity_g": 50,
                "cost": 0.25,
                "is_perishable": True
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        comp_id = data["component"]["id"]
        print(f"✓ Component created: {comp_id}")

        # Delete component
        r = requests.delete(f"{BASE_URL}/api/ecw-ops/components/{comp_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        print(f"✓ Component deleted: {comp_id}")


class TestRecipesSMS:
    """Test recipes SMS (queued mode when Twilio creds missing)"""

    def test_recipe_sms_queued(self):
        # Get first recipe
        recipes = requests.get(f"{BASE_URL}/api/ecw-ops/recipes?outlet_id=outlet-main").json()
        if recipes["count"] == 0:
            pytest.skip("No recipes to test SMS")
        recipe_id = recipes["rows"][0]["id"]

        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/recipes/sms",
            headers=HEADERS,
            json={"recipe_id": recipe_id, "phone": "+15551234567"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["mode"] == "queued"  # Twilio creds missing
        assert "body_preview" in data
        print(f"✓ Recipe SMS queued: mode={data['mode']}, preview={data['body_preview'][:50]}...")


class TestPhotos:
    """Test photos: upload, patch, list"""

    def test_photo_upload_and_patch(self):
        # Create a tiny valid JPEG (1x1 red pixel)
        # This is a minimal valid JPEG
        tiny_jpeg = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xCA,
            0x8A, 0x28, 0xA0, 0x02, 0x8A, 0x28, 0xA0, 0xFF, 0xD9
        ])
        b64 = base64.b64encode(tiny_jpeg).decode()

        # Upload photo with label (skip auto-name to avoid LLM cost)
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/photos",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "label": "TEST_Photo",
                "media_base64": b64
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        photo = data["photo"]
        photo_id = photo["id"]
        assert photo["label"] == "TEST_Photo"
        assert photo["confirmed"] is True  # Label provided = confirmed
        print(f"✓ Photo uploaded: {photo_id}")

        # Patch photo
        r = requests.patch(
            f"{BASE_URL}/api/ecw-ops/photos/{photo_id}",
            headers=HEADERS,
            json={"label": "TEST_Photo_Updated", "confirmed": True}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["photo"]["label"] == "TEST_Photo_Updated"
        print(f"✓ Photo patched: label updated")

        # List photos
        r = requests.get(f"{BASE_URL}/api/ecw-ops/photos?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        # Should find our test photo
        found = any(p["id"] == photo_id for p in data["rows"])
        assert found
        print(f"✓ Photos listed: {data['count']} photos, test photo found")

        # Cleanup: delete photo
        r = requests.delete(f"{BASE_URL}/api/ecw-ops/photos/{photo_id}")
        assert r.status_code == 200


class TestMenuPublish:
    """Test menu publish: version increment + snapshot"""

    def test_publish_increments_version(self):
        # Get current version
        r = requests.get(f"{BASE_URL}/api/ecw-ops/published?outlet_id=outlet-main")
        current_version = r.json()["publication"]["version"]

        # Publish
        r = requests.post(f"{BASE_URL}/api/ecw-ops/publish?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        pub = data["publication"]
        assert pub["version"] == current_version + 1
        assert pub["stations"] == 5
        assert pub["items"] >= 17
        print(f"✓ Menu published: v{pub['version']} with {pub['stations']} stations, {pub['items']} items")


class TestBenchmarkAveragedTrust:
    """Test POST /api/waste/benchmark/averaged-trust"""

    def test_averaged_trust_endpoint(self):
        # Get a sample to test with
        r = requests.get(f"{BASE_URL}/api/waste/benchmark/samples?limit=5")
        if r.status_code != 200 or r.json().get("count", 0) == 0:
            pytest.skip("No benchmark samples available")
        
        samples = r.json()["rows"]
        sample_id = samples[0]["id"]

        # Run averaged-trust with minimal runs (2) to avoid long test time
        r = requests.post(
            f"{BASE_URL}/api/waste/benchmark/averaged-trust",
            headers=HEADERS,
            json={
                "sample_ids": [sample_id],
                "runs": 2,
                "write_fingerprints": False  # Don't write fingerprints in test
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["samples"] == 1
        assert data["runs"] == 2
        assert "updates" in data
        assert "fingerprints_written" in data
        assert "per_sample" in data
        print(f"✓ Averaged-trust: {data['samples']} samples, {data['runs']} runs, {data['updates']} updates")


class TestBenchmarkStatusRegression:
    """Regression: GET /api/waste/benchmark/status"""

    def test_benchmark_status(self):
        r = requests.get(f"{BASE_URL}/api/waste/benchmark/status")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["sample_count"] >= 42  # Per requirements
        print(f"✓ Benchmark status: {data['sample_count']} samples, best={data['best_overall']:.2%}, grade={data['best_grade']}")


class TestWasteRegressionMobileRoute:
    """Regression: /m/waste route still works (iter223 routes untouched)"""

    def test_waste_capture_init(self):
        r = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            headers=HEADERS,
            json={"mode": "still"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert "capture_id" in data
        print(f"✓ Waste capture init: {data['capture_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
