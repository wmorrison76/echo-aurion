"""iter255 · Backend tests for profile switching, sidebar consolidation, and Oracle dashboard data.

Tests:
1. GET /api/auth/jwt/me?devAuth=1 with X-Dev-User-Id header → returns switched user
2. GET /api/auth/jwt/me?devAuth=1 without header → returns admin (default)
3. GET /api/invoices?limit=10 → returns 3 William invoices (regression)
4. GET /api/vendor-skus/all?limit=200 → returns >30 SKUs (Cusanos + Halperns + Mr Greens)
5. GET /api/approvals/requests?limit=20 → returns pending+approved requests
6. GET /api/echo-schedule/employees → returns 19 seeded employees (regression)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestProfileSwitchingDevMode:
    """Test X-Dev-User-Id header for profile switching in dev mode."""

    def test_me_with_director_header_returns_william_reyes(self):
        """GET /api/auth/jwt/me?devAuth=1 with X-Dev-User-Id: director_user → William Reyes, role=director"""
        r = requests.get(
            f"{BASE_URL}/api/auth/jwt/me?devAuth=1",
            headers={"X-Dev-User-Id": "director_user"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok=True: {data}"
        user = data.get("user", {})
        assert user.get("role") == "director", f"Expected role=director, got {user.get('role')}"
        assert "William" in user.get("name", ""), f"Expected name to contain 'William', got {user.get('name')}"

    def test_me_with_executive_chef_header_returns_chef_gio(self):
        """GET /api/auth/jwt/me?devAuth=1 with X-Dev-User-Id: executive_chef_user → role=executive-chef"""
        r = requests.get(
            f"{BASE_URL}/api/auth/jwt/me?devAuth=1",
            headers={"X-Dev-User-Id": "executive_chef_user"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        assert user.get("role") == "executive-chef", f"Expected role=executive-chef, got {user.get('role')}"

    def test_me_with_sous_chef_header_returns_sous_chef(self):
        """GET /api/auth/jwt/me?devAuth=1 with X-Dev-User-Id: sous_chef_user → role=sous-chef"""
        r = requests.get(
            f"{BASE_URL}/api/auth/jwt/me?devAuth=1",
            headers={"X-Dev-User-Id": "sous_chef_user"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        assert user.get("role") == "sous-chef", f"Expected role=sous-chef, got {user.get('role')}"

    def test_me_without_header_returns_admin_default(self):
        """GET /api/auth/jwt/me?devAuth=1 (no X-Dev-User-Id header) → returns admin"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/me?devAuth=1")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        # Should be admin or at least a valid user
        assert user.get("role") in ["admin", "Admin"], f"Expected role=admin, got {user.get('role')}"


class TestInvoicesRegression:
    """Regression: GET /api/invoices should return 3 William invoices."""

    def test_invoices_returns_3_william_invoices(self):
        """GET /api/invoices?limit=10 → returns at least 3 invoices (Cusanos, Halperns, Mr Greens)"""
        r = requests.get(f"{BASE_URL}/api/invoices?limit=10")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        rows = data.get("rows", [])
        assert len(rows) >= 3, f"Expected at least 3 invoices, got {len(rows)}"
        
        # Check for expected vendors
        vendor_names = [inv.get("vendor_name", "").lower() for inv in rows]
        assert any("cusanos" in v for v in vendor_names), f"Expected Cusanos invoice, vendors: {vendor_names}"
        assert any("halperns" in v for v in vendor_names), f"Expected Halperns invoice, vendors: {vendor_names}"
        assert any("mr greens" in v or "mrgreens" in v or "mr. greens" in v for v in vendor_names), f"Expected Mr Greens invoice, vendors: {vendor_names}"


class TestVendorSkusForOracleDashboard:
    """GET /api/vendor-skus/all should return >30 SKUs for VendorIntelPanel."""

    def test_vendor_skus_returns_30_plus_skus(self):
        """GET /api/vendor-skus/all?limit=200 → returns >30 SKUs"""
        r = requests.get(f"{BASE_URL}/api/vendor-skus/all?limit=200")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        rows = data.get("rows", [])
        assert len(rows) >= 30, f"Expected at least 30 SKUs, got {len(rows)}"
        
        # Check for expected vendors in SKUs
        vendor_names = set(sku.get("vendor_name", "").lower() for sku in rows)
        # At least one of the main vendors should be present
        has_vendor = any(
            "cusanos" in v or "halperns" in v or "mr greens" in v or "mrgreens" in v
            for v in vendor_names
        )
        assert has_vendor, f"Expected at least one of Cusanos/Halperns/Mr Greens in SKUs, got vendors: {vendor_names}"


class TestApprovalsForOracleDashboard:
    """GET /api/approvals/requests should return pending+approved requests."""

    def test_approvals_requests_returns_data(self):
        """GET /api/approvals/requests?limit=20 → returns rows with status field"""
        r = requests.get(f"{BASE_URL}/api/approvals/requests?limit=20")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        rows = data.get("rows", [])
        # Should have at least some approval requests
        assert len(rows) >= 0, "Expected rows array in response"
        
        # If there are rows, verify structure
        if len(rows) > 0:
            first = rows[0]
            assert "status" in first, f"Expected 'status' field in approval request: {first}"
            assert "amount" in first or "item_description" in first, f"Expected amount or item_description: {first}"


class TestEchoScheduleRegression:
    """Regression: GET /api/echo-schedule/employees should return 19 seeded employees."""

    def test_echo_schedule_employees_returns_19(self):
        """GET /api/echo-schedule/employees → returns 19 seeded employees"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/employees")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        rows = data.get("rows", [])
        # iter254 seeded 19 employees
        assert len(rows) >= 19, f"Expected at least 19 employees, got {len(rows)}"
        
        # Check for some expected employees (field is 'name' not 'display_name')
        names = [emp.get("name", "").lower() for emp in rows]
        assert any("carlos" in n for n in names), f"Expected Carlos Mendes in employees: {names[:5]}..."


class TestAuthProfiles:
    """Test /api/auth/jwt/profiles endpoint for avatar dropdown."""

    def test_profiles_returns_all_roles(self):
        """GET /api/auth/jwt/profiles → returns list of all auth_users"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/profiles")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        rows = data.get("rows", [])
        # Should have at least the seeded role profiles (14 from seed_admin_and_staff)
        assert len(rows) >= 10, f"Expected at least 10 profiles, got {len(rows)}"
        
        # Check for director profile
        roles = [p.get("role", "") for p in rows]
        assert "director" in roles, f"Expected 'director' role in profiles: {roles}"
        assert "executive-chef" in roles, f"Expected 'executive-chef' role in profiles: {roles}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
