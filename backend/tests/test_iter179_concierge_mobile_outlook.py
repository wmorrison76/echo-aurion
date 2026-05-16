"""
iter179 · EchoConciergeMobile + Outlook Sync Scaffolding Tests

Tests:
- Concierge Mobile: mint (admin-gated), resolve, request, preference endpoints
- Outlook Sync: status, authorize, sync/pull scaffolding (503 when not configured)
- Regression: iter178 auth, iter177 job profiles, iter175 MySchedule
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc"

# Seeded guest IDs from concierge_guests collection
GUEST_WILLIAMS = "g_williams_r1208"  # anniversary · diamond · room 1208
GUEST_SANTOS = "g_santos_r714"       # birthday · gold · room 714
GUEST_OKAFOR = "g_okafor_r902"       # platinum · room 902


class TestConciergeMobileMint:
    """POST /api/concierge-mobile/mint - Admin-gated token minting"""

    def test_mint_requires_admin_token(self):
        """401 without X-Admin-Token header"""
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/mint", json={
            "guest_id": GUEST_WILLIAMS
        })
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_mint_404_unknown_guest(self):
        """404 for unknown guest_id"""
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/mint", json={
            "guest_id": "nonexistent_guest_xyz"
        }, headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_mint_success_williams(self):
        """Successfully mint token for g_williams_r1208"""
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/mint", json={
            "guest_id": GUEST_WILLIAMS,
            "ttl_days": 7
        }, headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
        assert len(data["token"]) > 10
        assert "url_hint" in data
        assert f"/m/concierge/{data['token']}" == data["url_hint"]
        assert "expires_at" in data
        # Store for later tests
        TestConciergeMobileMint.minted_token = data["token"]

    def test_mint_success_santos(self):
        """Successfully mint token for g_santos_r714 (birthday guest)"""
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/mint", json={
            "guest_id": GUEST_SANTOS,
            "ttl_days": 3
        }, headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
        TestConciergeMobileMint.santos_token = data["token"]


class TestConciergeMobileResolve:
    """GET /api/concierge-mobile/resolve/{token} - Resolve token to guest bundle"""

    def test_resolve_404_bad_token(self):
        """404 on invalid/unknown token"""
        r = requests.get(f"{BASE_URL}/api/concierge-mobile/resolve/invalid_token_xyz")
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_resolve_success_williams(self):
        """Resolve Williams token returns full bundle"""
        token = getattr(TestConciergeMobileMint, "minted_token", None)
        if not token:
            pytest.skip("No minted token from previous test")
        
        r = requests.get(f"{BASE_URL}/api/concierge-mobile/resolve/{token}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Verify bundle structure
        assert data.get("ok") is True
        assert "guest" in data
        assert "celebration" in data
        assert "dining_reservations" in data
        assert "spa_bookings" in data
        assert "open_requests" in data
        assert "activations_today" in data
        assert "server_time" in data
        
        # Verify guest data
        guest = data["guest"]
        assert guest["id"] == GUEST_WILLIAMS
        assert guest["vip_tier"] == "diamond"
        assert guest["room"] == "1208"
        assert guest["repeat"] is True
        
        # Verify celebration flag
        assert data["celebration"] == "anniversary"

    def test_resolve_success_santos_birthday(self):
        """Resolve Santos token shows birthday celebration"""
        token = getattr(TestConciergeMobileMint, "santos_token", None)
        if not token:
            pytest.skip("No Santos token from previous test")
        
        r = requests.get(f"{BASE_URL}/api/concierge-mobile/resolve/{token}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data["guest"]["id"] == GUEST_SANTOS
        assert data["guest"]["vip_tier"] == "gold"
        assert data["celebration"] == "birthday"


class TestConciergeMobileRequest:
    """POST /api/concierge-mobile/request - Submit service request"""

    def test_request_401_invalid_token(self):
        """401 on invalid token"""
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/request", json={
            "token": "invalid_token_xyz",
            "kind": "towels",
            "summary": "Extra towels please"
        })
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_request_success_towels(self):
        """Successfully submit towels request"""
        token = getattr(TestConciergeMobileMint, "minted_token", None)
        if not token:
            pytest.skip("No minted token from previous test")
        
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/request", json={
            "token": token,
            "kind": "towels",
            "summary": "TEST_iter179 Extra pool towels please",
            "urgency": "normal"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "request_id" in data
        assert data["status"] == "pending"
        TestConciergeMobileRequest.request_id = data["request_id"]

    def test_request_success_housekeeping(self):
        """Successfully submit housekeeping request"""
        token = getattr(TestConciergeMobileMint, "minted_token", None)
        if not token:
            pytest.skip("No minted token from previous test")
        
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/request", json={
            "token": token,
            "kind": "housekeeping",
            "summary": "TEST_iter179 Quick room refresh",
            "urgency": "normal"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True

    def test_request_success_custom_freeform(self):
        """Successfully submit custom freeform request"""
        token = getattr(TestConciergeMobileMint, "minted_token", None)
        if not token:
            pytest.skip("No minted token from previous test")
        
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/request", json={
            "token": token,
            "kind": "custom",
            "summary": "TEST_iter179 Can you recommend a quiet dinner spot for our anniversary?",
            "urgency": "normal",
            "details": {"occasion": "anniversary", "party_size": 2}
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True

    def test_request_appears_in_resolve(self):
        """Verify submitted request appears in open_requests"""
        token = getattr(TestConciergeMobileMint, "minted_token", None)
        if not token:
            pytest.skip("No minted token from previous test")
        
        r = requests.get(f"{BASE_URL}/api/concierge-mobile/resolve/{token}")
        assert r.status_code == 200
        data = r.json()
        
        # Check that our test requests appear
        open_requests = data.get("open_requests", [])
        test_summaries = [req["summary"] for req in open_requests if "TEST_iter179" in req.get("summary", "")]
        assert len(test_summaries) >= 1, f"Expected at least 1 TEST_iter179 request, found: {test_summaries}"
        
        # Verify source is mobile-companion
        for req in open_requests:
            if "TEST_iter179" in req.get("summary", ""):
                assert req.get("source") == "mobile-companion"


class TestConciergeMobilePreference:
    """POST /api/concierge-mobile/preference - Persist guest preference"""

    def test_preference_401_invalid_token(self):
        """401 on invalid token"""
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/preference", json={
            "token": "invalid_token_xyz",
            "key": "dietary",
            "value": "vegetarian"
        })
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_preference_success(self):
        """Successfully persist preference"""
        token = getattr(TestConciergeMobileMint, "minted_token", None)
        if not token:
            pytest.skip("No minted token from previous test")
        
        r = requests.post(f"{BASE_URL}/api/concierge-mobile/preference", json={
            "token": token,
            "key": "TEST_iter179_dietary",
            "value": "plant-forward, no shellfish"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True


class TestOutlookSyncScaffolding:
    """Outlook sync scaffolding - graceful degradation when not configured"""

    def test_status_returns_not_configured(self):
        """GET /api/outlook/status returns configured:false when AZURE_CLIENT_ID not set"""
        r = requests.get(f"{BASE_URL}/api/outlook/status")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("configured") is False
        assert data.get("authenticated") is False
        assert data.get("connected") is False

    def test_authorize_503_not_configured(self):
        """GET /api/outlook/authorize returns 503 when not configured"""
        r = requests.get(f"{BASE_URL}/api/outlook/authorize")
        assert r.status_code == 503, f"Expected 503, got {r.status_code}: {r.text}"
        # Verify error message mentions configuration
        assert "not configured" in r.text.lower() or "azure" in r.text.lower()

    def test_sync_pull_503_not_configured(self):
        """POST /api/outlook/sync/pull returns 503 when not configured"""
        r = requests.post(f"{BASE_URL}/api/outlook/sync/pull")
        assert r.status_code == 503, f"Expected 503, got {r.status_code}: {r.text}"


class TestRegressionIter178Auth:
    """Regression: iter178 Emergent Google OAuth still works"""

    def test_auth_me_401_without_auth(self):
        """GET /api/auth/me returns 401 without auth"""
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_auth_logout_idempotent(self):
        """POST /api/auth/logout returns 200 even without session"""
        r = requests.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"


class TestRegressionIter177JobProfiles:
    """Regression: iter177 Job Profiles still works"""

    def test_job_profiles_list_requires_admin(self):
        """GET /api/job-profiles/list returns 401 without admin token"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_job_profiles_list_success(self):
        """GET /api/job-profiles/list returns profiles with admin token"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list", headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "profiles" in data
        assert len(data["profiles"]) >= 21, f"Expected 21+ profiles, got {len(data['profiles'])}"


class TestRegressionIter175MySchedule:
    """Regression: iter175 MySchedule social feed still works"""

    def test_my_schedule_employee_endpoint(self):
        """GET /api/my-schedule/employee/{id} returns schedule data"""
        # Use a known employee ID from seeded data
        r = requests.get(f"{BASE_URL}/api/people/list", headers={"X-Admin-Token": ADMIN_TOKEN})
        if r.status_code != 200:
            pytest.skip("Could not get employee list")
        
        employees = r.json().get("employees", [])
        if not employees:
            pytest.skip("No employees found")
        
        emp_id = employees[0]["id"]
        r = requests.get(f"{BASE_URL}/api/my-schedule/employee/{emp_id}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # Verify social feed fields exist
        assert "team_celebrations" in data or "company_feed" in data


class TestHealthAndBasics:
    """Basic health checks"""

    def test_health_endpoint(self):
        """GET /api/health returns healthy"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        assert data.get("platform") == "LUCCCA Enterprise"

    def test_people_list(self):
        """GET /api/people/list returns employees"""
        r = requests.get(f"{BASE_URL}/api/people/list", headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "employees" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
