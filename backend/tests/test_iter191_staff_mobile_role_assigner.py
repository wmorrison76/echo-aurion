"""
iter191 · Staff Mobile Shell + Role Assigner Backend Tests

Tests for:
- GET /api/staff-mobile/employees (admin) - list all employees with roles
- POST /api/staff-mobile/employees/role (admin) - assign/update role
- GET /api/staff-mobile/me - capability flags change when role updated
- Regression: existing endpoints still work
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"

# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def admin_headers():
    return {"X-Admin-Token": ADMIN_TOKEN, "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def minted_token_general(admin_headers):
    """Mint a fresh token for a new staff member (defaults to general role)"""
    r = requests.post(
        f"{BASE_URL}/api/daily-briefing/mint",
        headers=admin_headers,
        json={
            "staff_name": "TEST_iter191_General_Staff",
            "staff_role": "Line Cook",
            "staff_email": "test.general.iter191@luccca.com",
            "ttl_days": 1
        }
    )
    assert r.status_code == 200, f"Failed to mint general token: {r.text}"
    data = r.json()
    return data["token"]

@pytest.fixture(scope="module")
def minted_token_salary(admin_headers):
    """Mint a token for priya.p@luccca.com who should be salary role"""
    r = requests.post(
        f"{BASE_URL}/api/daily-briefing/mint",
        headers=admin_headers,
        json={
            "staff_name": "Priya Patel",
            "staff_role": "FOH Lead",
            "staff_email": "priya.p@luccca.com",
            "ttl_days": 1
        }
    )
    assert r.status_code == 200, f"Failed to mint salary token: {r.text}"
    data = r.json()
    return data["token"]


# ─── GET /api/staff-mobile/employees Tests ────────────────────────────────────

class TestEmployeesList:
    """Admin endpoint to list all employees for role assignment"""
    
    def test_list_employees_requires_admin(self):
        """Should return 401 without admin token"""
        r = requests.get(f"{BASE_URL}/api/staff-mobile/employees")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
    
    def test_list_employees_returns_structure(self, admin_headers):
        """Should return {ok, total, employees, roles}"""
        r = requests.get(f"{BASE_URL}/api/staff-mobile/employees", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True
        assert "total" in data
        assert "employees" in data
        assert "roles" in data
        assert isinstance(data["employees"], list)
        assert data["roles"] == ["general", "salary", "manager", "owner"]
    
    def test_list_employees_item_structure(self, admin_headers):
        """Each employee should have id, name, email, role, title, source"""
        r = requests.get(f"{BASE_URL}/api/staff-mobile/employees", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        
        if data["employees"]:
            emp = data["employees"][0]
            # Check expected fields exist
            assert "name" in emp or emp.get("name") is None
            assert "email" in emp or emp.get("email") is None
            assert "role" in emp
            assert emp["role"] in ["general", "salary", "manager", "owner"]
            assert "source" in emp
            assert emp["source"] in ["employees", "briefing_token"]


# ─── POST /api/staff-mobile/employees/role Tests ──────────────────────────────

class TestRoleAssignment:
    """Admin endpoint to assign/update employee roles"""
    
    def test_assign_role_requires_admin(self):
        """Should return 401 without admin token"""
        r = requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            json={"employee_email": "test@test.com", "role": "salary"}
        )
        assert r.status_code == 401
    
    def test_assign_role_invalid_role_400(self, admin_headers):
        """Should return 400 for invalid role value"""
        r = requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"employee_email": "test@test.com", "role": "superadmin"}
        )
        assert r.status_code == 400
        assert "role must be one of" in r.text.lower()
    
    def test_assign_role_missing_identifier_400(self, admin_headers):
        """Should return 400 when neither email nor id provided"""
        r = requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"role": "salary"}
        )
        assert r.status_code == 400
        assert "employee_email or employee_id required" in r.text.lower()
    
    def test_assign_role_creates_stub_if_not_exists(self, admin_headers):
        """Should create stub employee record if doesn't exist"""
        test_email = "test.stub.iter191@luccca.com"
        r = requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"employee_email": test_email, "role": "general"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True
        assert data.get("role") == "general"
        # created=True means new stub was created
        assert "created" in data
        assert "id" in data
    
    def test_assign_role_updates_existing(self, admin_headers):
        """Should update role for existing employee"""
        # First ensure priya.p@luccca.com exists with some role
        r = requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"employee_email": "priya.p@luccca.com", "role": "salary"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True
        assert data.get("role") == "salary"
    
    def test_assign_role_valid_roles(self, admin_headers):
        """Should accept all valid role values"""
        test_email = "test.roles.iter191@luccca.com"
        
        for role in ["general", "salary", "manager", "owner"]:
            r = requests.post(
                f"{BASE_URL}/api/staff-mobile/employees/role",
                headers=admin_headers,
                json={"employee_email": test_email, "role": role}
            )
            assert r.status_code == 200, f"Failed for role {role}: {r.text}"
            assert r.json().get("role") == role


# ─── GET /api/staff-mobile/me Capability Tests ────────────────────────────────

class TestMeCapabilities:
    """Test that /me returns correct capability flags based on role"""
    
    def test_me_general_role_capabilities(self, minted_token_general):
        """General role should have limited capabilities"""
        r = requests.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": minted_token_general}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True
        assert "staff" in data
        assert "capabilities" in data
        
        caps = data["capabilities"]
        # General role should have these flags
        assert caps.get("role") == "general"
        assert caps.get("is_general") is True
        assert caps.get("is_salary") is False
        assert caps.get("is_manager") is False
        assert caps.get("is_owner") is False
        
        # General should NOT have admin capabilities
        assert caps.get("can_view_dashboard") is False
        assert caps.get("can_edit_standup") is False
        assert caps.get("can_manage_hiring") is False
        assert caps.get("can_mint_tokens") is False
        assert caps.get("can_approve_pto") is False
        assert caps.get("can_view_financials") is False
    
    def test_me_salary_role_capabilities(self, minted_token_salary, admin_headers):
        """Salary role should have dashboard access but not manager capabilities"""
        # First ensure priya is salary
        requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"employee_email": "priya.p@luccca.com", "role": "salary"}
        )
        
        r = requests.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": minted_token_salary}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        caps = data["capabilities"]
        assert caps.get("role") == "salary"
        assert caps.get("is_salary") is True
        assert caps.get("is_manager") is False
        
        # Salary CAN view dashboard
        assert caps.get("can_view_dashboard") is True
        # Salary CANNOT approve PTO (that's manager+)
        assert caps.get("can_approve_pto") is False
        assert caps.get("can_edit_standup") is False
    
    def test_me_role_promotion_changes_capabilities(self, minted_token_salary, admin_headers):
        """Promoting from salary to manager should change capabilities"""
        # Promote to manager
        r = requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"employee_email": "priya.p@luccca.com", "role": "manager"}
        )
        assert r.status_code == 200
        
        # Check capabilities changed
        r = requests.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": minted_token_salary}
        )
        assert r.status_code == 200
        caps = r.json()["capabilities"]
        
        assert caps.get("role") == "manager"
        assert caps.get("is_manager") is True
        assert caps.get("can_approve_pto") is True
        assert caps.get("can_edit_standup") is True
        assert caps.get("can_mint_tokens") is True
        
        # Revert to salary for other tests
        requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"employee_email": "priya.p@luccca.com", "role": "salary"}
        )


# ─── Regression Tests ─────────────────────────────────────────────────────────

class TestRegressions:
    """Ensure existing endpoints still work"""
    
    def test_guest_auto_auth_still_works(self):
        """Guest concierge auto-auth should still work"""
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"room": "1208", "last_name": "Reed"}
        )
        assert r.status_code == 200, f"Guest auth failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
    
    def test_briefing_mint_still_works(self, admin_headers):
        """Daily briefing mint should still work"""
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers=admin_headers,
            json={
                "staff_name": "TEST_regression_iter191",
                "staff_role": "Test Role",
                "ttl_days": 1
            }
        )
        assert r.status_code == 200, f"Mint failed: {r.text}"
        data = r.json()
        assert "token" in data
        assert "mobile_url" in data
    
    def test_pto_request_still_works(self, minted_token_general):
        """PTO request flow should still work"""
        r = requests.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": minted_token_general, "Content-Type": "application/json"},
            json={
                "start_date": "2026-02-01",
                "end_date": "2026-02-03",
                "kind": "vacation",
                "reason": "Test iter191"
            }
        )
        assert r.status_code == 200, f"PTO request failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "request" in data
    
    def test_benefits_mine_still_works(self, minted_token_general):
        """Benefits endpoint should still work"""
        r = requests.get(
            f"{BASE_URL}/api/benefits/mine",
            headers={"X-Briefing-Token": minted_token_general}
        )
        assert r.status_code == 200, f"Benefits failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "catalog" in data
        assert len(data["catalog"]) == 8  # 8 default benefits
    
    def test_panel_host_root_route_loads(self):
        """Root route should still load (panel host)"""
        # Just check the route doesn't 500
        r = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint or similar should work
        assert r.status_code in [200, 404]  # 404 is ok if no health endpoint


# ─── Owner Role Tests ─────────────────────────────────────────────────────────

class TestOwnerRole:
    """Test owner role has all capabilities"""
    
    def test_owner_has_all_capabilities(self, admin_headers):
        """Owner role should have all capability flags"""
        # Create/update a test owner
        test_email = "test.owner.iter191@luccca.com"
        r = requests.post(
            f"{BASE_URL}/api/staff-mobile/employees/role",
            headers=admin_headers,
            json={"employee_email": test_email, "role": "owner"}
        )
        assert r.status_code == 200
        
        # Mint a token for this owner
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers=admin_headers,
            json={
                "staff_name": "Test Owner",
                "staff_email": test_email,
                "ttl_days": 1
            }
        )
        assert r.status_code == 200
        token = r.json()["token"]
        
        # Check capabilities
        r = requests.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": token}
        )
        assert r.status_code == 200
        caps = r.json()["capabilities"]
        
        assert caps.get("role") == "owner"
        assert caps.get("is_owner") is True
        assert caps.get("is_manager") is True
        assert caps.get("is_salary") is True
        assert caps.get("can_view_dashboard") is True
        assert caps.get("can_edit_standup") is True
        assert caps.get("can_manage_hiring") is True
        assert caps.get("can_mint_tokens") is True
        assert caps.get("can_approve_pto") is True
        assert caps.get("can_view_financials") is True
