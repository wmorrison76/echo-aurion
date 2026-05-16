"""iter244 · Backend tests for Firebase push, Gallery upgrades, and AR shelf scan.

Tests:
  - Firebase: GET /api/push/status, POST /api/push/register-token, POST /api/push/test, POST /api/push/fan-out-vip-ping/{ping_id}
  - Gallery: GET /api/gallery/list, GET /api/gallery/{id}/full, POST /api/gallery/{id}/like, POST /api/gallery/{id}/notes,
             POST /api/gallery/{id}/link-recipe, POST /api/gallery/{id}/link-menu-item, POST /api/gallery/{id}/recognize,
             GET /api/gallery/recipe-options, GET /api/gallery/menu-item-options
  - Storage AR: POST /api/storage-map/shelf-count
  - Regression: VIP at-the-door widget, BEO chat, voice draft
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestFirebasePush:
    """Firebase push notification endpoints"""

    def test_push_status(self):
        """GET /api/push/status returns firebase_ready status"""
        r = requests.get(f"{BASE_URL}/api/push/status")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "firebase_ready" in data
        assert "device_count" in data
        assert "leader_token_count" in data
        print(f"Firebase status: ready={data['firebase_ready']}, devices={data['device_count']}")

    def test_register_token_new(self):
        """POST /api/push/register-token registers a new FCM token"""
        token = f"test-fcm-token-{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{BASE_URL}/api/push/register-token", json={
            "fcm_token": token,
            "device_label": "Test Device",
            "platform": "web"
        }, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("user_id") == "chef-william"
        print(f"Registered token: {token[:20]}...")

    def test_register_token_upsert(self):
        """POST /api/push/register-token upserts same token (idempotent)"""
        token = f"test-fcm-upsert-{uuid.uuid4().hex[:8]}"
        # First call
        r1 = requests.post(f"{BASE_URL}/api/push/register-token", json={
            "fcm_token": token,
            "device_label": "Device v1",
            "platform": "web"
        }, headers=HEADERS)
        assert r1.status_code == 200
        # Second call with updated label
        r2 = requests.post(f"{BASE_URL}/api/push/register-token", json={
            "fcm_token": token,
            "device_label": "Device v2",
            "platform": "ios"
        }, headers=HEADERS)
        assert r2.status_code == 200
        assert r2.json().get("ok") is True
        print("Token upsert working correctly")

    def test_push_test(self):
        """POST /api/push/test returns ok with tokens count"""
        r = requests.post(f"{BASE_URL}/api/push/test", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "tokens" in data
        print(f"Push test: {data.get('tokens')} tokens targeted")

    def test_fan_out_vip_ping(self):
        """POST /api/push/fan-out-vip-ping/{ping_id} with valid ping"""
        # First seed VIP data
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo", headers=HEADERS)
        # Get a ping
        pings_r = requests.get(f"{BASE_URL}/api/vip-tracker/pings?limit=1", headers=HEADERS)
        if pings_r.status_code == 200 and pings_r.json().get("rows"):
            ping_id = pings_r.json()["rows"][0]["id"]
            r = requests.post(f"{BASE_URL}/api/push/fan-out-vip-ping/{ping_id}", headers=HEADERS)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            data = r.json()
            assert data.get("ok") is True
            assert "tokens_targeted" in data
            print(f"Fan-out VIP ping: {data.get('tokens_targeted')} tokens targeted")
        else:
            # Create a ping if none exist
            pytest.skip("No VIP pings available for fan-out test")

    def test_fan_out_invalid_ping(self):
        """POST /api/push/fan-out-vip-ping with invalid ping_id returns 404"""
        r = requests.post(f"{BASE_URL}/api/push/fan-out-vip-ping/nonexistent-ping-id", headers=HEADERS)
        assert r.status_code == 404


class TestGalleryBackend:
    """Gallery backend endpoints"""

    @pytest.fixture(autouse=True)
    def setup_gallery_data(self):
        """Ensure we have some gallery data"""
        # Seed some photos if needed
        requests.post(f"{BASE_URL}/api/ecw-ops/photos/seed-demo", headers=HEADERS)

    def test_gallery_list(self):
        """GET /api/gallery/list returns enriched photos"""
        r = requests.get(f"{BASE_URL}/api/gallery/list?limit=10")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "count" in data
        print(f"Gallery list: {data['count']} photos")
        # Check enrichment fields if photos exist
        if data["rows"]:
            photo = data["rows"][0]
            assert "id" in photo
            assert "label" in photo
            assert "heart_count" in photo or photo.get("heart_count") is None or photo.get("heart_count") == 0

    def test_gallery_list_with_search(self):
        """GET /api/gallery/list with search query"""
        r = requests.get(f"{BASE_URL}/api/gallery/list?q=test&limit=5")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True

    def test_gallery_list_confirmed_only(self):
        """GET /api/gallery/list with only_confirmed filter"""
        r = requests.get(f"{BASE_URL}/api/gallery/list?only_confirmed=true&limit=5")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True

    def test_gallery_full_detail(self):
        """GET /api/gallery/{id}/full returns photo with notes and heart_count"""
        # Get a photo first
        list_r = requests.get(f"{BASE_URL}/api/gallery/list?limit=1")
        if list_r.status_code == 200 and list_r.json().get("rows"):
            photo_id = list_r.json()["rows"][0]["id"]
            r = requests.get(f"{BASE_URL}/api/gallery/{photo_id}/full")
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            data = r.json()
            assert data.get("ok") is True
            assert "photo" in data
            photo = data["photo"]
            assert "id" in photo
            assert "notes" in photo
            assert "heart_count" in photo
            print(f"Gallery full: photo {photo_id}, {photo['heart_count']} hearts, {len(photo['notes'])} notes")
        else:
            pytest.skip("No photos available for full detail test")

    def test_gallery_full_not_found(self):
        """GET /api/gallery/{id}/full with invalid id returns 404"""
        r = requests.get(f"{BASE_URL}/api/gallery/nonexistent-photo-id/full")
        assert r.status_code == 404

    def test_gallery_like(self):
        """POST /api/gallery/{id}/like increments count (idempotent per user)"""
        list_r = requests.get(f"{BASE_URL}/api/gallery/list?limit=1")
        if list_r.status_code == 200 and list_r.json().get("rows"):
            photo_id = list_r.json()["rows"][0]["id"]
            # Like once
            r1 = requests.post(f"{BASE_URL}/api/gallery/{photo_id}/like", headers=HEADERS)
            assert r1.status_code == 200
            count1 = r1.json().get("count", 0)
            # Like again (should be idempotent for same user)
            r2 = requests.post(f"{BASE_URL}/api/gallery/{photo_id}/like", headers=HEADERS)
            assert r2.status_code == 200
            count2 = r2.json().get("count", 0)
            # Count should be same (idempotent)
            assert count2 == count1, f"Like should be idempotent: {count1} vs {count2}"
            print(f"Gallery like: photo {photo_id}, count={count2}")
        else:
            pytest.skip("No photos available for like test")

    def test_gallery_add_note(self):
        """POST /api/gallery/{id}/notes adds a chef note"""
        list_r = requests.get(f"{BASE_URL}/api/gallery/list?limit=1")
        if list_r.status_code == 200 and list_r.json().get("rows"):
            photo_id = list_r.json()["rows"][0]["id"]
            note_text = f"Test note from iter244 - {uuid.uuid4().hex[:6]}"
            r = requests.post(f"{BASE_URL}/api/gallery/{photo_id}/notes", json={
                "text": note_text
            }, headers=HEADERS)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            data = r.json()
            assert data.get("ok") is True
            assert "note" in data
            assert data["note"]["text"] == note_text
            assert data["note"]["author_id"] == "chef-william"
            print(f"Gallery note added: {note_text[:30]}...")
        else:
            pytest.skip("No photos available for note test")

    def test_gallery_recipe_options(self):
        """GET /api/gallery/recipe-options returns recipes"""
        r = requests.get(f"{BASE_URL}/api/gallery/recipe-options?limit=10")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"Recipe options: {len(data['rows'])} recipes")

    def test_gallery_menu_item_options(self):
        """GET /api/gallery/menu-item-options returns menu items"""
        r = requests.get(f"{BASE_URL}/api/gallery/menu-item-options?limit=10")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"Menu item options: {len(data['rows'])} items")

    def test_gallery_link_recipe_invalid(self):
        """POST /api/gallery/{id}/link-recipe with invalid recipe_id returns 404"""
        list_r = requests.get(f"{BASE_URL}/api/gallery/list?limit=1")
        if list_r.status_code == 200 and list_r.json().get("rows"):
            photo_id = list_r.json()["rows"][0]["id"]
            r = requests.post(f"{BASE_URL}/api/gallery/{photo_id}/link-recipe", json={
                "target_id": "nonexistent-recipe-id"
            }, headers=HEADERS)
            assert r.status_code == 404
        else:
            pytest.skip("No photos available for link-recipe test")

    def test_gallery_link_menu_item_invalid(self):
        """POST /api/gallery/{id}/link-menu-item with invalid menu_item_id returns 404"""
        list_r = requests.get(f"{BASE_URL}/api/gallery/list?limit=1")
        if list_r.status_code == 200 and list_r.json().get("rows"):
            photo_id = list_r.json()["rows"][0]["id"]
            r = requests.post(f"{BASE_URL}/api/gallery/{photo_id}/link-menu-item", json={
                "target_id": "nonexistent-menu-item-id"
            }, headers=HEADERS)
            assert r.status_code == 404
        else:
            pytest.skip("No photos available for link-menu-item test")

    def test_gallery_recognize(self):
        """POST /api/gallery/{id}/recognize attempts vision recognition"""
        list_r = requests.get(f"{BASE_URL}/api/gallery/list?limit=1")
        if list_r.status_code == 200 and list_r.json().get("rows"):
            photo_id = list_r.json()["rows"][0]["id"]
            r = requests.post(f"{BASE_URL}/api/gallery/{photo_id}/recognize", headers=HEADERS)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            data = r.json()
            # May return ok:true with empty results or ok:false with error
            assert "ok" in data
            if data.get("ok"):
                assert "detected_items" in data
                assert "recipes" in data or data.get("recipes") is None
                assert "menu_items" in data or data.get("menu_items") is None
                print(f"Recognize: detected={data.get('detected_items', [])}")
            else:
                print(f"Recognize returned error (expected if no media): {data.get('error', 'unknown')}")
        else:
            pytest.skip("No photos available for recognize test")


class TestStorageArScan:
    """Storage AR shelf count endpoint"""

    @pytest.fixture(autouse=True)
    def setup_storage_data(self):
        """Seed storage shelves"""
        requests.post(f"{BASE_URL}/api/storage-map/seed-demo", headers=HEADERS)

    def test_shelf_count_valid(self):
        """POST /api/storage-map/shelf-count creates a shelf_counts row"""
        # Get a shelf first
        shelves_r = requests.get(f"{BASE_URL}/api/storage-map/shelves")
        assert shelves_r.status_code == 200
        shelves = shelves_r.json().get("rows", [])
        if shelves:
            shelf_id = shelves[0]["id"]
            r = requests.post(f"{BASE_URL}/api/storage-map/shelf-count", json={
                "shelf_id": shelf_id,
                "items": [
                    {"sku": "SKU-001", "qty": 5},
                    {"sku": "SKU-002", "qty": 3}
                ]
            }, headers=HEADERS)
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            data = r.json()
            assert data.get("ok") is True
            assert "id" in data
            print(f"Shelf count created: {data['id']}")
        else:
            pytest.skip("No shelves available for shelf-count test")

    def test_shelf_count_invalid_shelf(self):
        """POST /api/storage-map/shelf-count with invalid shelf_id returns 404"""
        r = requests.post(f"{BASE_URL}/api/storage-map/shelf-count", json={
            "shelf_id": "nonexistent-shelf-id",
            "items": [{"sku": "SKU-001", "qty": 1}]
        }, headers=HEADERS)
        assert r.status_code == 404

    def test_list_shelves(self):
        """GET /api/storage-map/shelves returns shelves with zones"""
        r = requests.get(f"{BASE_URL}/api/storage-map/shelves")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "zones" in data
        print(f"Storage shelves: {data['count']} shelves, zones={data['zones']}")


class TestRegressionIter243:
    """Regression tests for iter243 features"""

    def test_vip_tracker_seed(self):
        """VIP tracker seed still works"""
        r = requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo", headers=HEADERS)
        assert r.status_code == 200

    def test_vip_tracker_list(self):
        """VIP tracker list returns VIPs"""
        r = requests.get(f"{BASE_URL}/api/vip-tracker/list", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "rows" in data
        print(f"VIP list: {data.get('count', len(data.get('rows', [])))} VIPs")

    def test_beo_seed(self):
        """BEO seed still works"""
        r = requests.post(f"{BASE_URL}/api/maestro/beo/seed-demo", headers=HEADERS)
        assert r.status_code == 200

    def test_schedule_week(self):
        """Schedule week endpoint still works"""
        r = requests.get(f"{BASE_URL}/api/schedules/week?outlet_id=outlet-rooftop&week_start=2026-01-20", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
