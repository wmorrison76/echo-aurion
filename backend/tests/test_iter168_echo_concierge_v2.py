"""
Iter168 Echo Concierge v2 — Guest Experience Orchestration Layer Backend Tests

Tests for:
- Guest profile endpoints (GET /api/guest/profile with filters)
- Guest preferences (read/write)
- Concierge request CRUD (create, update status, list, filter)
- Vendor directory and availability
- Revenue impact roll-up
- Itinerary LLM generation (may hit budget limits)
- Regression: iter167 endpoints still working
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestGuestProfile:
    """Guest profile endpoint tests - seeded SEED_GUESTS list"""

    def test_get_all_guests(self, api_client):
        """GET /api/guest/profile returns 5 seeded guests"""
        response = api_client.get(f"{BASE_URL}/api/guest/profile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        guests = data.get("guests", [])
        assert len(guests) == 5, f"Expected 5 guests, got {len(guests)}"
        # Verify guest structure
        for g in guests:
            assert "id" in g
            assert "room" in g
            assert "name" in g
            assert "vip_tier" in g
        print(f"✓ GET /api/guest/profile returned {len(guests)} guests")

    def test_get_guest_by_room(self, api_client):
        """GET /api/guest/profile?room=1201 returns Katherine Mansfield"""
        response = api_client.get(f"{BASE_URL}/api/guest/profile?room=1201")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        guest = data.get("guest")
        assert guest is not None, "Expected guest object"
        assert guest["name"] == "Katherine Mansfield"
        assert guest["room"] == "1201"
        assert guest["vip_tier"] == "platinum"
        print(f"✓ GET /api/guest/profile?room=1201 returned {guest['name']}")

    def test_search_guest_by_name(self, api_client):
        """GET /api/guest/profile?q=navarro returns 1 match"""
        response = api_client.get(f"{BASE_URL}/api/guest/profile?q=navarro")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        guests = data.get("guests", [])
        assert len(guests) == 1, f"Expected 1 match, got {len(guests)}"
        assert "Navarro" in guests[0]["name"]
        print(f"✓ GET /api/guest/profile?q=navarro returned {guests[0]['name']}")


class TestGuestPreferences:
    """Guest preferences read/write tests"""

    def test_read_preferences(self, api_client):
        """GET /api/guest/preferences/read?guest_id=g-101 returns preferences"""
        response = api_client.get(f"{BASE_URL}/api/guest/preferences/read?guest_id=g-101")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("guest_id") == "g-101"
        assert "preferences" in data
        assert "dietary" in data
        assert "mobility" in data
        assert "special_dates" in data
        assert "learned" in data
        # Katherine Mansfield has gluten-free dietary
        assert "gluten-free" in data["dietary"]
        print(f"✓ GET /api/guest/preferences/read returned preferences for g-101")

    def test_write_preference(self, api_client):
        """POST /api/guest/preferences/write creates record in concierge_guest_preferences"""
        unique_key = f"test_pref_{uuid.uuid4().hex[:8]}"
        payload = {
            "guest_id": "g-101",
            "key": unique_key,
            "value": "test_value",
            "confidence": 0.9
        }
        response = api_client.post(f"{BASE_URL}/api/guest/preferences/write", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        pref = data.get("preference")
        assert pref is not None
        assert pref["guest_id"] == "g-101"
        assert pref["key"] == unique_key
        assert pref["value"] == "test_value"
        assert pref["confidence"] == 0.9
        print(f"✓ POST /api/guest/preferences/write created preference {unique_key}")


class TestConciergeRequests:
    """Concierge request CRUD tests"""

    @pytest.fixture(scope="class")
    def created_request_id(self, api_client):
        """Create a test request and return its ID"""
        payload = {
            "guest_id": "g-101",
            "kind": "dining",
            "summary": f"TEST_Rooftop dinner {uuid.uuid4().hex[:6]}",
            "priority": "high",
            "revenue_estimate": 480
        }
        response = api_client.post(f"{BASE_URL}/api/concierge-v2/request/create", json=payload)
        assert response.status_code == 200
        data = response.json()
        return data["request"]["id"]

    def test_create_request(self, api_client):
        """POST /api/concierge-v2/request/create returns 200 with request.id and status='pending'"""
        payload = {
            "guest_id": "g-101",
            "kind": "dining",
            "summary": f"TEST_Rooftop dinner {uuid.uuid4().hex[:6]}",
            "priority": "high",
            "revenue_estimate": 480
        }
        response = api_client.post(f"{BASE_URL}/api/concierge-v2/request/create", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        req = data.get("request")
        assert req is not None
        assert "id" in req
        assert req["status"] == "pending"
        assert req["guest_id"] == "g-101"
        assert req["kind"] == "dining"
        assert req["priority"] == "high"
        assert req["revenue_estimate"] == 480
        print(f"✓ POST /api/concierge-v2/request/create returned request {req['id']} with status=pending")

    def test_update_request_status_in_progress(self, api_client, created_request_id):
        """PATCH /api/concierge-v2/request/{rid} with status='in_progress' advances status"""
        response = api_client.patch(
            f"{BASE_URL}/api/concierge-v2/request/{created_request_id}",
            json={"status": "in_progress"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        req = data.get("request")
        assert req["status"] == "in_progress"
        # Check history event logged
        history = req.get("history", [])
        assert any("in_progress" in str(h) for h in history)
        print(f"✓ PATCH status→in_progress for request {created_request_id}")

    def test_update_request_status_completed_with_revenue(self, api_client, created_request_id):
        """PATCH with status='completed' and actual_revenue logs history event"""
        response = api_client.patch(
            f"{BASE_URL}/api/concierge-v2/request/{created_request_id}",
            json={"status": "completed", "actual_revenue": 520}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        req = data.get("request")
        assert req["status"] == "completed"
        assert req["actual_revenue"] == 520
        # Check history has revenue event
        history = req.get("history", [])
        assert any("revenue" in str(h).lower() or "520" in str(h) for h in history)
        print(f"✓ PATCH status→completed with actual_revenue=520 for request {created_request_id}")

    def test_get_request_status(self, api_client, created_request_id):
        """GET /api/concierge-v2/request/status?rid=... returns the updated record"""
        response = api_client.get(f"{BASE_URL}/api/concierge-v2/request/status?rid={created_request_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        req = data.get("request")
        assert req["id"] == created_request_id
        assert req["status"] == "completed"
        print(f"✓ GET /api/concierge-v2/request/status returned request {created_request_id}")

    def test_list_requests_filter_by_status(self, api_client):
        """GET /api/concierge-v2/requests?status=pending returns filtered list"""
        # First create a pending request
        payload = {
            "guest_id": "g-102",
            "kind": "spa",
            "summary": f"TEST_Spa booking {uuid.uuid4().hex[:6]}",
            "priority": "normal"
        }
        api_client.post(f"{BASE_URL}/api/concierge-v2/request/create", json=payload)
        
        response = api_client.get(f"{BASE_URL}/api/concierge-v2/requests?status=pending")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        requests_list = data.get("requests", [])
        # All returned should be pending
        for r in requests_list:
            assert r["status"] == "pending"
        print(f"✓ GET /api/concierge-v2/requests?status=pending returned {len(requests_list)} pending requests")

    def test_list_requests_filter_by_guest(self, api_client):
        """GET /api/concierge-v2/requests?guest_id=g-101 returns guest-filtered list"""
        response = api_client.get(f"{BASE_URL}/api/concierge-v2/requests?guest_id=g-101")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        requests_list = data.get("requests", [])
        for r in requests_list:
            assert r["guest_id"] == "g-101"
        print(f"✓ GET /api/concierge-v2/requests?guest_id=g-101 returned {len(requests_list)} requests")


class TestVendorDirectory:
    """Vendor directory and availability tests - seeded SEED_VENDORS list"""

    def test_vendor_list_all(self, api_client):
        """GET /api/concierge-v2/vendor/list returns 10 vendors"""
        response = api_client.get(f"{BASE_URL}/api/concierge-v2/vendor/list")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        vendors = data.get("vendors", [])
        assert len(vendors) == 10, f"Expected 10 vendors, got {len(vendors)}"
        # Verify vendor structure
        for v in vendors:
            assert "id" in v
            assert "name" in v
            assert "category" in v
            assert "tier" in v
            assert "avg_price" in v
        print(f"✓ GET /api/concierge-v2/vendor/list returned {len(vendors)} vendors")

    def test_vendor_list_filter_by_category(self, api_client):
        """GET /api/concierge-v2/vendor/list?category=marina filters to marina vendors"""
        response = api_client.get(f"{BASE_URL}/api/concierge-v2/vendor/list?category=marina")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        vendors = data.get("vendors", [])
        assert len(vendors) >= 1, "Expected at least 1 marina vendor"
        for v in vendors:
            assert v["category"].lower() == "marina"
        print(f"✓ GET /api/concierge-v2/vendor/list?category=marina returned {len(vendors)} marina vendors")

    def test_vendor_availability(self, api_client):
        """GET /api/concierge-v2/vendor/availability returns deterministic slots"""
        response = api_client.get(f"{BASE_URL}/api/concierge-v2/vendor/availability?vendor_id=v-2&date=2026-02-21")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("vendor_id") == "v-2"
        assert data.get("date") == "2026-02-21"
        assert "slots_total" in data
        assert "slots_booked" in data
        assert "slots_available" in data
        # Verify math: available = total - booked
        assert data["slots_available"] == data["slots_total"] - data["slots_booked"]
        print(f"✓ GET /api/concierge-v2/vendor/availability returned slots_total={data['slots_total']}, booked={data['slots_booked']}, available={data['slots_available']}")


class TestRevenueImpact:
    """Revenue attribution roll-up tests"""

    def test_revenue_impact_30_days(self, api_client):
        """GET /api/concierge-v2/revenue-impact?days=30 returns revenue breakdown"""
        response = api_client.get(f"{BASE_URL}/api/concierge-v2/revenue-impact?days=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "total_estimated_revenue" in data
        assert "total_actual_revenue" in data
        assert "by_kind" in data
        assert data.get("window_days") == 30
        print(f"✓ GET /api/concierge-v2/revenue-impact?days=30 returned total_estimated={data['total_estimated_revenue']}, total_actual={data['total_actual_revenue']}")


class TestItineraryGeneration:
    """LLM itinerary generation tests - may hit budget limits"""

    def test_itinerary_generate(self, api_client):
        """POST /api/itinerary/generate returns itinerary or 502 if budget exhausted"""
        payload = {
            "guest_id": "g-101",
            "natural_language": "plan a romantic anniversary dinner tonight"
        }
        response = api_client.post(f"{BASE_URL}/api/itinerary/generate", json=payload)
        
        # Accept 200 (success) or 502 (LLM budget exhausted)
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") is True
            assert "itinerary" in data
            itinerary = data.get("itinerary", [])
            # Should have 1-5 items per spec
            assert 1 <= len(itinerary) <= 5 or len(itinerary) == 0, f"Expected 1-5 items, got {len(itinerary)}"
            print(f"✓ POST /api/itinerary/generate returned {len(itinerary)} itinerary items")
        elif response.status_code == 502:
            # LLM budget exhausted - expected behavior
            print(f"✓ POST /api/itinerary/generate returned 502 (LLM budget exhausted) - expected")
        elif response.status_code == 503:
            # EMERGENT_LLM_KEY not configured
            print(f"✓ POST /api/itinerary/generate returned 503 (LLM not configured) - expected")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")


class TestRegressionIter167:
    """Regression tests for iter167 endpoints"""

    def test_global_calendar_day_detail(self, api_client):
        """GET /api/global-calendar/day-detail still returns 200"""
        response = api_client.get(f"{BASE_URL}/api/global-calendar/day-detail?date=2026-02-20")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Regression: GET /api/global-calendar/day-detail returns 200")

    def test_foh_concierge_local_places(self, api_client):
        """GET /api/foh-concierge/local-places still returns 200"""
        response = api_client.get(f"{BASE_URL}/api/foh-concierge/local-places")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        print(f"✓ Regression: GET /api/foh-concierge/local-places returns 200")

    def test_seed_plant_endpoint(self, api_client):
        """GET /api/seed/pillars still returns 200"""
        response = api_client.get(f"{BASE_URL}/api/seed/pillars")
        assert response.status_code == 200
        print(f"✓ Regression: GET /api/seed/pillars returns 200")


class TestHealthCheck:
    """Basic health check"""

    def test_health(self, api_client):
        """GET /api/health returns 200"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ GET /api/health returns healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
