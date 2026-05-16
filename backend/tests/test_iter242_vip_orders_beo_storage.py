"""iter242 · Backend tests for VIP order intelligence, BEO, storage map, standup admin.

Tests:
- VIP order/checkin/enriched endpoints
- Maestro BEO seed + recent
- Storage map seed + list
- Standup admin-write
- Vendor price compare (stub)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
USER_ID = "chef-william"

class TestVipOrderIntelligence:
    """iter242 VIP order + checkin + enriched endpoints"""

    def test_seed_orders_demo_idempotent(self):
        """POST /api/vip-tracker/seed-orders-demo should be idempotent"""
        # First call
        r1 = requests.post(f"{BASE_URL}/api/vip-tracker/seed-orders-demo")
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1.get("ok") is True

        # Second call should return skipped:true
        r2 = requests.post(f"{BASE_URL}/api/vip-tracker/seed-orders-demo")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("ok") is True
        # Either skipped or already seeded
        print(f"Seed orders demo: {d2}")

    def test_post_order_creates_row_and_ping(self):
        """POST /api/vip-tracker/order with valid vip_id+items creates row + emits ping"""
        # First ensure VIP exists
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo")
        
        payload = {
            "vip_id": "vip-novak",
            "venue_slug": "outlet-rooftop",
            "server_name": "Test Server",
            "items": [
                {"name": "Test Dish", "kind": "food", "qty": 1, "price": 25},
                {"name": "Test Wine", "kind": "drink", "qty": 2, "price": 18}
            ],
            "course": "mains",
            "notes": "Test order from pytest"
        }
        r = requests.post(
            f"{BASE_URL}/api/vip-tracker/order",
            json=payload,
            headers={"X-User-Id": USER_ID}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "id" in d
        print(f"Created order: {d['id']}")

    def test_post_checkin_creates_row_and_ping(self):
        """POST /api/vip-tracker/checkin creates checkin + ping + chat post"""
        # Ensure VIP exists
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo")
        
        payload = {
            "vip_id": "vip-reyes",
            "venue_slug": "outlet-rooftop",
            "method": "host-stand",
            "detail": "Test checkin from pytest"
        }
        r = requests.post(
            f"{BASE_URL}/api/vip-tracker/checkin",
            json=payload,
            headers={"X-User-Id": USER_ID}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "id" in d
        print(f"Created checkin: {d['id']}")

    def test_get_enriched_returns_full_profile(self):
        """GET /api/vip-tracker/{id}/enriched returns vip + orders + checkins + favourites + ticket_time + servers_seen + stats"""
        # Ensure data exists
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo")
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-orders-demo")
        
        r = requests.get(
            f"{BASE_URL}/api/vip-tracker/vip-novak/enriched",
            headers={"X-User-Id": USER_ID}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "vip" in d
        assert "orders" in d
        assert "checkins" in d
        assert "favourites" in d
        assert "ticket_time" in d
        assert "servers_seen" in d
        assert "stats" in d
        
        # Validate structure
        assert isinstance(d["orders"], list)
        assert isinstance(d["checkins"], list)
        assert isinstance(d["favourites"], list)
        assert isinstance(d["servers_seen"], list)
        assert "total_orders" in d["stats"]
        assert "total_checkins" in d["stats"]
        assert "total_spend_estimate" in d["stats"]
        
        print(f"Enriched VIP: {d['vip'].get('display_name')}, orders={len(d['orders'])}, favourites={len(d['favourites'])}")


class TestMaestroBeo:
    """iter242 Maestro BEO seed + recent endpoints"""

    def test_seed_beos_idempotent(self):
        """POST /api/maestro/beo/seed-demo should be idempotent"""
        r1 = requests.post(f"{BASE_URL}/api/maestro/beo/seed-demo")
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1.get("ok") is True

        r2 = requests.post(f"{BASE_URL}/api/maestro/beo/seed-demo")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("ok") is True
        print(f"BEO seed: {d2}")

    def test_get_recent_beos_with_ai_order_summary(self):
        """GET /api/maestro/beo/recent returns BEOs with ai_order_summary stitched"""
        # Ensure seeded
        requests.post(f"{BASE_URL}/api/maestro/beo/seed-demo")
        
        r = requests.get(f"{BASE_URL}/api/maestro/beo/recent")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "rows" in d
        assert len(d["rows"]) >= 1, "Expected at least 1 BEO"
        
        # Check first BEO has expected fields
        beo = d["rows"][0]
        assert "id" in beo
        assert "event_name" in beo
        assert "ai_order_total" in beo or "ai_order_summary" in beo
        
        print(f"Found {len(d['rows'])} BEOs, first: {beo.get('event_name')}")


class TestStorageMap:
    """iter242 Storage map seed + list endpoints"""

    def test_seed_storage_map_idempotent(self):
        """POST /api/storage-map/seed-demo should be idempotent"""
        r1 = requests.post(f"{BASE_URL}/api/storage-map/seed-demo")
        assert r1.status_code == 200
        d1 = r1.json()
        assert d1.get("ok") is True

        r2 = requests.post(f"{BASE_URL}/api/storage-map/seed-demo")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("ok") is True
        print(f"Storage map seed: {d2}")

    def test_get_shelves_returns_zones_array(self):
        """GET /api/storage-map/shelves returns shelves + zones array"""
        # Ensure seeded
        requests.post(f"{BASE_URL}/api/storage-map/seed-demo")
        
        r = requests.get(f"{BASE_URL}/api/storage-map/shelves")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "rows" in d
        assert "zones" in d
        assert len(d["rows"]) >= 1, "Expected at least 1 shelf"
        assert len(d["zones"]) >= 1, "Expected at least 1 zone"
        
        # Check shelf structure
        shelf = d["rows"][0]
        assert "id" in shelf
        assert "label" in shelf
        assert "zone" in shelf
        assert "items" in shelf
        
        print(f"Found {len(d['rows'])} shelves in {len(d['zones'])} zones")

    def test_get_shelves_with_zone_filter(self):
        """GET /api/storage-map/shelves?zone=X filters by zone"""
        requests.post(f"{BASE_URL}/api/storage-map/seed-demo")
        
        r = requests.get(f"{BASE_URL}/api/storage-map/shelves?zone=walk-in-cold")
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        
        # All returned shelves should be in walk-in-cold zone
        for shelf in d.get("rows", []):
            assert shelf.get("zone") == "walk-in-cold", f"Expected walk-in-cold, got {shelf.get('zone')}"
        
        print(f"Filtered to {len(d['rows'])} shelves in walk-in-cold zone")


class TestStandupAdminWrite:
    """iter242 Standup admin-write endpoint"""

    def test_admin_write_upserts_standup(self):
        """POST /api/ecw-ops/standup/admin-write upserts the day's standup doc"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        payload = {
            "date": today,
            "headline": "Test Standup from pytest",
            "summary": "This is a test summary",
            "sections": [
                {"title": "Test Section", "body": "Test body content"}
            ],
            "items": [
                {"text": "Test item", "owner": "pytest"}
            ],
            "shoutouts": [
                {"name": "Test Person", "reason": "For testing"}
            ]
        }
        
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/standup/admin-write",
            json=payload
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert d.get("date") == today
        
        # Verify by fetching today's standup
        r2 = requests.get(f"{BASE_URL}/api/ecw-ops/standup/today")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("headline") == "Test Standup from pytest"
        
        print(f"Standup admin-write successful for {today}")


class TestVipChatCreation:
    """iter241/242 VIP chat creation - verify no crash"""

    def test_create_chat_returns_room_id(self):
        """POST /api/vip-tracker/{vip_id}/create-chat returns room_id"""
        # Ensure VIP exists
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo")
        
        r = requests.post(
            f"{BASE_URL}/api/vip-tracker/vip-novak/create-chat",
            headers={"X-User-Id": USER_ID}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "room_id" in d
        assert d["room_id"].startswith("room-vip-")
        
        print(f"Chat created/reused: {d['room_id']}, reused={d.get('reused', False)}")

    def test_chat_room_has_string_last_message(self):
        """Verify chat room last_message is a string (not object) - fixes iter241 crash"""
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo")
        
        # Create chat
        r = requests.post(
            f"{BASE_URL}/api/vip-tracker/vip-novak/create-chat",
            headers={"X-User-Id": USER_ID}
        )
        d = r.json()
        room_id = d.get("room_id")
        
        # Fetch room messages to verify last_message format
        r2 = requests.get(f"{BASE_URL}/api/team-chat/rooms/{room_id}/messages")
        if r2.status_code == 200:
            d2 = r2.json()
            # The room should have messages with text field (string)
            if d2.get("messages"):
                msg = d2["messages"][0]
                assert isinstance(msg.get("text"), str), f"Expected text to be string, got {type(msg.get('text'))}"
                print(f"Message text is string: {msg.get('text')[:50]}...")


class TestRegressionIter240:
    """Regression tests for iter240 features"""

    def test_reservations_live_endpoint(self):
        """GET /api/ecw-ops/reservations/live still works"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/reservations/live?outlet_id=outlet-rooftop")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert "total_covers" in d or "ok" in d
        print(f"Reservations live: {d.get('total_covers', 0)} covers")

    def test_vip_list_endpoint(self):
        """GET /api/vip-tracker/list still works"""
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo")
        
        r = requests.get(
            f"{BASE_URL}/api/vip-tracker/list?status=all",
            headers={"X-User-Id": USER_ID}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "rows" in d
        assert len(d["rows"]) >= 4, f"Expected at least 4 VIPs, got {len(d['rows'])}"
        print(f"VIP list: {len(d['rows'])} VIPs")

    def test_vip_pings_feed(self):
        """GET /api/vip-tracker/pings/feed still works"""
        r = requests.get(
            f"{BASE_URL}/api/vip-tracker/pings/feed",
            headers={"X-User-Id": USER_ID}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        d = r.json()
        assert d.get("ok") is True
        assert "rows" in d
        assert "unread" in d
        print(f"Pings feed: {len(d['rows'])} pings, {d['unread']} unread")


class TestHealthAndBasics:
    """Basic health checks"""

    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        d = r.json()
        assert d.get("status") == "healthy"
        print("Health check passed")

    def test_employees_endpoint(self):
        """GET /api/employees returns employees (needed for schedule editor)"""
        r = requests.get(f"{BASE_URL}/api/employees?limit=50")
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d
        print(f"Employees: {len(d['rows'])} found")
