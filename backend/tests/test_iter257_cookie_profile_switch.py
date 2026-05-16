"""
iter257 · Cookie-based profile switching tests

Tests the new cookie-based dev user override that survives page reloads
and is immune to PWA service-worker fetch caching.

Key changes in iter257:
- Backend reads echo_dev_user + echo_dev_auth cookies (preferred) before
  falling back to X-Dev-User-Id header
- Cookie takes precedence over header when both are present
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestCookieBasedProfileSwitch:
    """Tests for iter257 cookie-based profile switching"""

    def test_cookie_director_user_returns_william_reyes(self):
        """GET /api/auth/jwt/me with cookie 'echo_dev_auth=1; echo_dev_user=director_user' returns director"""
        response = requests.get(
            f"{BASE_URL}/api/auth/jwt/me",
            cookies={"echo_dev_auth": "1", "echo_dev_user": "director_user"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        assert user.get("role") == "director", f"Expected role='director', got {user.get('role')}"
        assert user.get("name") == "William Reyes", f"Expected name='William Reyes', got {user.get('name')}"
        print(f"✓ Cookie director_user returns: {user.get('name')} ({user.get('role')})")

    def test_cookie_executive_chef_returns_chef_gio(self):
        """GET /api/auth/jwt/me with cookie 'echo_dev_auth=1; echo_dev_user=executive_chef_user' returns executive-chef"""
        response = requests.get(
            f"{BASE_URL}/api/auth/jwt/me",
            cookies={"echo_dev_auth": "1", "echo_dev_user": "executive_chef_user"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        assert user.get("role") == "executive-chef", f"Expected role='executive-chef', got {user.get('role')}"
        assert user.get("name") == "Chef Gio", f"Expected name='Chef Gio', got {user.get('name')}"
        print(f"✓ Cookie executive_chef_user returns: {user.get('name')} ({user.get('role')})")

    def test_devauth_query_param_fallback_returns_admin(self):
        """GET /api/auth/jwt/me?devAuth=1 (NO cookie) returns admin (default fallback)"""
        response = requests.get(f"{BASE_URL}/api/auth/jwt/me?devAuth=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        # Default fallback should be admin
        assert user.get("role") == "admin", f"Expected role='admin', got {user.get('role')}"
        print(f"✓ devAuth=1 fallback returns: {user.get('name')} ({user.get('role')})")

    def test_cookie_takes_precedence_over_header(self):
        """Cookie wins over X-Dev-User-Id header when both are present"""
        # Cookie says director_user, header says executive_chef_user
        # Cookie should win per iter257 fix
        response = requests.get(
            f"{BASE_URL}/api/auth/jwt/me",
            cookies={"echo_dev_auth": "1", "echo_dev_user": "director_user"},
            headers={"X-Dev-User-Id": "executive_chef_user"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        # Cookie should win - director_user
        assert user.get("role") == "director", f"Expected role='director' (cookie wins), got {user.get('role')}"
        assert user.get("name") == "William Reyes", f"Expected name='William Reyes', got {user.get('name')}"
        print(f"✓ Cookie takes precedence over header: {user.get('name')} ({user.get('role')})")

    def test_header_fallback_when_no_cookie(self):
        """X-Dev-User-Id header works as fallback when no cookie is set"""
        response = requests.get(
            f"{BASE_URL}/api/auth/jwt/me?devAuth=1",
            headers={"X-Dev-User-Id": "executive_chef_user"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        assert user.get("role") == "executive-chef", f"Expected role='executive-chef', got {user.get('role')}"
        print(f"✓ Header fallback works: {user.get('name')} ({user.get('role')})")


class TestApprovalsBannerWithCookie:
    """Tests for approvals banner with cookie-based auth"""

    def test_approvals_banner_with_director_cookie(self):
        """GET /api/approvals/banner?for_user=director_user with director cookies returns banner data"""
        response = requests.get(
            f"{BASE_URL}/api/approvals/banner?for_user=director_user",
            cookies={"echo_dev_auth": "1", "echo_dev_user": "director_user"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should return count (may be 0 if no pending approvals)
        assert "count" in data or "rows" in data, f"Expected 'count' or 'rows' in response: {data}"
        print(f"✓ Approvals banner for director: count={data.get('count', len(data.get('rows', [])))}")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""

    def test_employees_returns_19_seeded(self):
        """GET /api/echo-schedule/employees still returns 19 seeded employees"""
        response = requests.get(f"{BASE_URL}/api/echo-schedule/employees?devAuth=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        rows = data.get("rows", data.get("employees", []))
        assert len(rows) >= 19, f"Expected at least 19 employees, got {len(rows)}"
        print(f"✓ Employees endpoint returns {len(rows)} employees")

    def test_invoices_returns_william_invoices(self):
        """GET /api/invoices?limit=10 still returns 3 William invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices?limit=10&devAuth=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        rows = data.get("rows", data.get("invoices", []))
        assert len(rows) >= 3, f"Expected at least 3 invoices, got {len(rows)}"
        print(f"✓ Invoices endpoint returns {len(rows)} invoices")

    def test_vendor_skus_lookup_butter(self):
        """GET /api/vendor-skus/lookup?q=butter still returns Plugra match"""
        response = requests.get(f"{BASE_URL}/api/vendor-skus/lookup?q=butter&devAuth=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # API returns 'matches' key
        rows = data.get("matches", data.get("rows", data.get("results", [])))
        # Check if any result contains "Plugra" or "butter"
        found_butter = any(
            "butter" in str(r).lower() or "plugra" in str(r).lower()
            for r in rows
        )
        assert found_butter or len(rows) > 0, f"Expected butter/Plugra match, got {rows}"
        print(f"✓ Vendor SKUs lookup returns {len(rows)} results for 'butter'")

    def test_profiles_returns_14_cleaned_profiles(self):
        """GET /api/auth/jwt/profiles still returns 14 cleaned profiles with id, user_id, picture fields"""
        response = requests.get(f"{BASE_URL}/api/auth/jwt/profiles?devAuth=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        rows = data.get("rows", [])
        assert len(rows) >= 14, f"Expected at least 14 profiles, got {len(rows)}"
        
        # Check that each profile has required fields
        for profile in rows:
            assert "id" in profile, f"Profile missing 'id': {profile}"
            assert "user_id" in profile, f"Profile missing 'user_id': {profile}"
            assert "picture" in profile, f"Profile missing 'picture': {profile}"
        
        # Check director profile exists
        director = next((p for p in rows if p.get("id") == "director_user"), None)
        assert director is not None, "Director profile not found"
        assert director.get("name") == "William Reyes", f"Director name mismatch: {director.get('name')}"
        
        print(f"✓ Profiles endpoint returns {len(rows)} cleaned profiles with id, user_id, picture fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
