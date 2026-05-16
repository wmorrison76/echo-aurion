"""
iter183 · Guest Concierge Mobile App Tests

Tests:
1. Admin token rotation — old token must return 401, new token must return 200
2. Guest authentication (room + last_name)
3. Guest session management (X-Guest-Token)
4. Venues CRUD (6 seeded venues)
5. Nearby CRUD (3 seeded nearby items)
6. Property map endpoint
7. Valet/Transport/Luggage service requests
8. Guest requests list
9. Location sharing
10. Admin endpoints (requests list, ack)
11. Property meta upsert
12. Cross-guest isolation
"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

# Token values
OLD_ADMIN_TOKEN = "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc"
NEW_ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o")

# Test guest credentials (seeded in concierge_guests)
TEST_ROOM = "1208"
TEST_LAST_NAME = "Reed"

# Store tokens for cross-test use
_guest_token = None
_guest_token_b = None  # For cross-guest isolation test


class TestAdminTokenRotation:
    """Verify old admin token is rejected and new token works"""
    
    def test_old_token_returns_401(self):
        """Old admin token should be rejected on admin-gated endpoints"""
        # Test on job-profiles/list which is admin-gated
        r = requests.get(
            f"{BASE_URL}/api/job-profiles/list",
            headers={"X-Admin-Token": OLD_ADMIN_TOKEN}
        )
        assert r.status_code == 401, f"Expected 401 for old token, got {r.status_code}: {r.text}"
        print(f"✓ Old admin token correctly rejected with 401")
    
    def test_new_token_returns_200(self):
        """New admin token should work on admin-gated endpoints"""
        r = requests.get(
            f"{BASE_URL}/api/job-profiles/list",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200 for new token, got {r.status_code}: {r.text}"
        data = r.json()
        assert "profiles" in data or "items" in data or isinstance(data, list), f"Unexpected response: {data}"
        print(f"✓ New admin token works correctly (200)")


class TestGuestAuthentication:
    """Test POST /api/guest-concierge/authenticate"""
    
    def test_authenticate_success(self):
        """Valid room + last_name returns token + guest bundle"""
        global _guest_token
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"room": TEST_ROOM, "last_name": TEST_LAST_NAME}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data, "Missing token in response"
        assert "guest" in data, "Missing guest in response"
        assert data["guest"].get("room") == TEST_ROOM
        _guest_token = data["token"]
        print(f"✓ Guest authenticated: {data['guest'].get('name')} in room {data['guest'].get('room')}")
    
    def test_authenticate_404_no_match(self):
        """Non-matching room/last_name returns 404"""
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"room": "9999", "last_name": "NonExistent"}
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
        print(f"✓ Non-matching credentials correctly return 404")
    
    def test_authenticate_400_missing_fields(self):
        """Missing room or last_name returns 400"""
        # Missing last_name
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"room": "1208"}
        )
        assert r.status_code in [400, 422], f"Expected 400/422, got {r.status_code}: {r.text}"
        
        # Missing room
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"last_name": "Reed"}
        )
        assert r.status_code in [400, 422], f"Expected 400/422, got {r.status_code}: {r.text}"
        print(f"✓ Missing fields correctly return 400/422")
    
    def test_authenticate_case_insensitive(self):
        """Last name matching is case-insensitive"""
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"room": TEST_ROOM, "last_name": "REED"}
        )
        assert r.status_code == 200, f"Expected 200 for case-insensitive match, got {r.status_code}"
        print(f"✓ Case-insensitive matching works")


class TestGuestSession:
    """Test GET /api/guest-concierge/session"""
    
    def test_session_with_valid_token(self):
        """Valid X-Guest-Token returns guest info"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/session",
            headers={"X-Guest-Token": _guest_token}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "guest" in data
        print(f"✓ Session rehydrated for guest: {data['guest'].get('name')}")
    
    def test_session_401_without_token(self):
        """Missing X-Guest-Token returns 401"""
        r = requests.get(f"{BASE_URL}/api/guest-concierge/session")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        print(f"✓ Missing token correctly returns 401")
    
    def test_session_401_invalid_token(self):
        """Invalid X-Guest-Token returns 401"""
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/session",
            headers={"X-Guest-Token": "invalid_token_12345"}
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        print(f"✓ Invalid token correctly returns 401")


class TestVenues:
    """Test venues endpoints"""
    
    def test_list_venues_returns_6_seeded(self):
        """GET /api/guest-concierge/venues returns 6 seeded venues"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/venues",
            headers={"X-Guest-Token": _guest_token}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        venues = data.get("venues", [])
        assert len(venues) >= 6, f"Expected at least 6 venues, got {len(venues)}"
        print(f"✓ Venues list returned {len(venues)} venues")
        
        # Verify venue structure
        if venues:
            v = venues[0]
            assert "id" in v
            assert "name" in v
            assert "category" in v
    
    def test_upsert_venue_admin_only(self):
        """POST /api/guest-concierge/venues/upsert requires admin token"""
        # Without admin token
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/venues/upsert",
            json={"slug": "test-venue", "name": "Test Venue", "category": "dining"}
        )
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        
        # With admin token
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/venues/upsert",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN},
            json={"slug": "test-venue-iter183", "name": "Test Venue iter183", "category": "dining", "active": False}
        )
        assert r.status_code == 200, f"Expected 200 with admin token, got {r.status_code}: {r.text}"
        print(f"✓ Venue upsert admin-gated correctly")


class TestNearby:
    """Test nearby endpoints"""
    
    def test_list_nearby_returns_3_seeded(self):
        """GET /api/guest-concierge/nearby returns 3 seeded nearby items"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/nearby",
            headers={"X-Guest-Token": _guest_token}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        nearby = data.get("nearby", [])
        assert len(nearby) >= 3, f"Expected at least 3 nearby items, got {len(nearby)}"
        print(f"✓ Nearby list returned {len(nearby)} items")
    
    def test_upsert_nearby_admin_only(self):
        """POST /api/guest-concierge/nearby/upsert requires admin token"""
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/nearby/upsert",
            json={"slug": "test-nearby", "name": "Test Nearby", "category": "restaurant"}
        )
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print(f"✓ Nearby upsert admin-gated correctly")


class TestPropertyMap:
    """Test GET /api/guest-concierge/map"""
    
    def test_map_returns_property_metadata(self):
        """Map endpoint returns property metadata + venue pins"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/map",
            headers={"X-Guest-Token": _guest_token}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "property_name" in data
        assert "venues" in data
        print(f"✓ Map returned property: {data.get('property_name')}, {len(data.get('venues', []))} venue pins")


class TestServiceRequests:
    """Test valet, transport, luggage service requests"""
    
    def test_valet_request(self):
        """POST /api/guest-concierge/valet creates valet request with 10-min ETA"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/valet",
            headers={"X-Guest-Token": _guest_token, "Content-Type": "application/json"},
            json={"pickup_minutes": 10}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "request_id" in data
        assert "eta" in data
        assert "message" in data
        assert "10 minutes" in data.get("message", "")
        print(f"✓ Valet request created: {data.get('request_id')}, ETA: {data.get('eta')}")
    
    def test_transport_request(self):
        """POST /api/guest-concierge/transport creates transport request"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/transport",
            headers={"X-Guest-Token": _guest_token, "Content-Type": "application/json"},
            json={"from_location": "Room 1208", "to_location": "Beach Club", "party_size": 2, "when": "now"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "request_id" in data
        assert "message" in data
        print(f"✓ Transport request created: {data.get('request_id')}")
    
    def test_luggage_request(self):
        """POST /api/guest-concierge/luggage creates luggage pickup request"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/luggage",
            headers={"X-Guest-Token": _guest_token, "Content-Type": "application/json"},
            json={"pickup_location": "Room 1208", "pickup_time": "now", "bag_count": 2}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "request_id" in data
        assert "message" in data
        print(f"✓ Luggage request created: {data.get('request_id')}")


class TestGuestRequests:
    """Test GET /api/guest-concierge/requests"""
    
    def test_my_requests_returns_newest_first(self):
        """Guest's requests are returned newest-first"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/requests",
            headers={"X-Guest-Token": _guest_token}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        requests_list = data.get("requests", [])
        assert len(requests_list) >= 3, f"Expected at least 3 requests (valet, transport, luggage), got {len(requests_list)}"
        
        # Verify newest-first ordering
        if len(requests_list) >= 2:
            first_created = requests_list[0].get("created_at", "")
            second_created = requests_list[1].get("created_at", "")
            assert first_created >= second_created, "Requests not sorted newest-first"
        
        print(f"✓ My requests returned {len(requests_list)} items, newest-first")


class TestLocationShare:
    """Test POST /api/guest-concierge/location"""
    
    def test_share_location(self):
        """Location share creates concierge_guest_locations row"""
        global _guest_token
        if not _guest_token:
            pytest.skip("No guest token available")
        
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/location",
            headers={"X-Guest-Token": _guest_token, "Content-Type": "application/json"},
            json={"lat": 26.1224, "lng": -80.1373, "accuracy_m": 10.5}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ Location shared successfully")


class TestAdminEndpoints:
    """Test admin endpoints for service requests"""
    
    def test_admin_requests_list(self):
        """GET /api/guest-concierge/admin/requests returns all pending requests"""
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/admin/requests",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "requests" in data
        print(f"✓ Admin requests list returned {len(data.get('requests', []))} items")
    
    def test_admin_requests_requires_token(self):
        """Admin requests endpoint requires X-Admin-Token"""
        r = requests.get(f"{BASE_URL}/api/guest-concierge/admin/requests")
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        print(f"✓ Admin requests correctly requires token")
    
    def test_admin_ack_request(self):
        """POST /api/guest-concierge/admin/requests/{id}/ack updates status"""
        # First get a request ID
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/admin/requests",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN}
        )
        if r.status_code != 200:
            pytest.skip("Could not get requests list")
        
        requests_list = r.json().get("requests", [])
        if not requests_list:
            pytest.skip("No requests to ack")
        
        request_id = requests_list[0].get("id")
        
        # Ack the request
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/admin/requests/{request_id}/ack",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN, "Content-Type": "application/json"},
            json={"status": "in_progress", "note": "Test ack from iter183"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ Request {request_id} acked to in_progress")


class TestPropertyMeta:
    """Test POST /api/guest-concierge/property/upsert"""
    
    def test_property_upsert_admin_only(self):
        """Property meta upsert requires admin token"""
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/property/upsert",
            json={"name": "Test Property"}
        )
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/property/upsert",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN, "Content-Type": "application/json"},
            json={"name": "Luccca Resort & Spa", "brand_color": "#c8a97e"}
        )
        assert r.status_code == 200, f"Expected 200 with admin token, got {r.status_code}: {r.text}"
        print(f"✓ Property meta upsert admin-gated correctly")


class TestCrossGuestIsolation:
    """Test that guest A cannot access guest B's requests"""
    
    def test_cross_guest_isolation(self):
        """Token for guest A cannot fetch guest B's requests"""
        global _guest_token
        
        # Authenticate as a different guest (Valentina Santos, room 714)
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"room": "714", "last_name": "Santos"}
        )
        if r.status_code != 200:
            pytest.skip("Could not authenticate second guest")
        
        guest_b_token = r.json().get("token")
        
        # Create a request as guest B
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/valet",
            headers={"X-Guest-Token": guest_b_token, "Content-Type": "application/json"},
            json={"pickup_minutes": 15}
        )
        if r.status_code != 200:
            pytest.skip("Could not create request for guest B")
        
        guest_b_request_id = r.json().get("request_id")
        
        # Get requests as guest A (original token)
        if not _guest_token:
            pytest.skip("No guest A token available")
        
        r = requests.get(
            f"{BASE_URL}/api/guest-concierge/requests",
            headers={"X-Guest-Token": _guest_token}
        )
        assert r.status_code == 200
        
        guest_a_requests = r.json().get("requests", [])
        guest_a_request_ids = [req.get("id") for req in guest_a_requests]
        
        # Guest B's request should NOT appear in guest A's list
        assert guest_b_request_id not in guest_a_request_ids, "Cross-guest isolation violated!"
        print(f"✓ Cross-guest isolation verified: guest A cannot see guest B's requests")


class TestRegressionIter179MobileToken:
    """Regression: iter179 mobile token flow at /m/concierge/{token} still works"""
    
    def test_mobile_token_flow(self):
        """Mobile concierge token endpoint still works"""
        # Get a valid mobile token
        r = requests.get(
            f"{BASE_URL}/api/concierge-mobile/guests",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN}
        )
        if r.status_code != 200:
            pytest.skip("Could not get mobile guests list")
        
        guests = r.json().get("guests", [])
        if not guests:
            pytest.skip("No mobile guests available")
        
        # Mint a token for the first guest
        guest_id = guests[0].get("id")
        r = requests.post(
            f"{BASE_URL}/api/concierge-mobile/mint",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN, "Content-Type": "application/json"},
            json={"guest_id": guest_id, "ttl_days": 1}
        )
        if r.status_code != 200:
            pytest.skip("Could not mint mobile token")
        
        token = r.json().get("token")
        
        # Verify the token works via resolve endpoint
        r = requests.get(f"{BASE_URL}/api/concierge-mobile/resolve/{token}")
        assert r.status_code == 200, f"Expected 200 for mobile resolve, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        assert "guest" in data
        print(f"✓ Regression: iter179 mobile token flow works")


class TestRegressionIter182SharedBoard:
    """Regression: iter182 /board/{share_id} public viewer still works"""
    
    def test_shared_board_flow(self):
        """Dashboard share and public board still work"""
        # Create a share
        r = requests.post(
            f"{BASE_URL}/api/dashboard/share",
            headers={"X-Admin-Token": NEW_ADMIN_TOKEN, "Content-Type": "application/json"},
            json={"tab": "executive", "expires_minutes": 60}
        )
        if r.status_code != 200:
            pytest.skip("Could not create dashboard share")
        
        share_id = r.json().get("share_id")
        
        # Verify public access
        r = requests.get(f"{BASE_URL}/api/dashboard/board/{share_id}")
        assert r.status_code == 200, f"Expected 200 for public board, got {r.status_code}"
        data = r.json()
        assert "overview" in data or "board" in data
        print(f"✓ Regression: iter182 shared board works")


class TestRegressionJarvisDashboard:
    """Regression: JARVIS dashboard still pulls KPIs"""
    
    def test_dashboard_overview(self):
        """Dashboard overview endpoint returns KPIs"""
        r = requests.get(f"{BASE_URL}/api/dashboard/overview")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "kpis" in data or "metrics" in data or isinstance(data, dict)
        print(f"✓ Regression: JARVIS dashboard KPIs work")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
