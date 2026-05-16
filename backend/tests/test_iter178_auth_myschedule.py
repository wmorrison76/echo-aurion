"""
iter178 · Backend Tests for Emergent Google OAuth + MySchedule Social Feed

Tests:
1. Auth endpoints: /api/auth/me, /api/auth/session, /api/auth/logout
2. Employee match via case-insensitive email
3. MySchedule company_feed (cross-department celebrations)
4. Regression: Job Profiles still returns 21+ profiles
"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc"

# Test session created in MongoDB for testing
TEST_SESSION_TOKEN = "session_marcus_1776558009425"
TEST_USER_EMAIL = "marcus.h@pier-sixty-six.com"
TEST_EMPLOYEE_ID = "bcf56cadefbb"


class TestAuthEndpoints:
    """Tests for /api/auth/* endpoints"""

    def test_auth_me_returns_401_without_auth(self):
        """GET /api/auth/me returns 401 when no cookie and no Authorization header"""
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        data = r.json()
        assert "not authenticated" in data.get("detail", "").lower()

    def test_auth_session_rejects_invalid_session_id(self):
        """POST /api/auth/session with invalid session_id returns 401"""
        r = requests.post(
            f"{BASE_URL}/api/auth/session",
            json={"session_id": "invalid_test_session_xyz"},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        data = r.json()
        assert "rejected" in data.get("detail", "").lower()

    def test_auth_logout_is_idempotent(self):
        """POST /api/auth/logout returns 200 even with no session"""
        r = requests.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True

    def test_auth_me_with_valid_bearer_token(self):
        """GET /api/auth/me with Authorization: Bearer {token} returns user + employee_match"""
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Verify response structure
        assert data.get("ok") is True
        assert "user" in data
        assert "employee_match" in data
        
        # Verify user fields
        user = data["user"]
        assert user.get("email") == TEST_USER_EMAIL
        assert "user_id" in user
        assert "name" in user

    def test_employee_match_case_insensitive(self):
        """employee_match resolves when auth_users.email matches employees.email case-insensitively"""
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
        )
        assert r.status_code == 200
        data = r.json()
        
        emp = data.get("employee_match")
        assert emp is not None, "employee_match should not be null for matching email"
        assert emp.get("id") == TEST_EMPLOYEE_ID
        assert emp.get("display_name") is not None
        assert emp.get("department") is not None

    def test_employee_match_returns_null_when_no_match(self):
        """employee_match returns null when no employees.email matches"""
        # Use the other test session that has no matching employee
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer test_session_1776557986266"}
        )
        assert r.status_code == 200
        data = r.json()
        
        # This user has email marcus.hayes@test.com which doesn't match any employee
        assert data.get("employee_match") is None


class TestMyScheduleCompanyFeed:
    """Tests for /api/my-schedule/employee/{id} company_feed field"""

    def test_my_schedule_returns_company_feed(self):
        """GET /api/my-schedule/employee/{id} returns company_feed with cross-department celebrations"""
        r = requests.get(f"{BASE_URL}/api/my-schedule/employee/{TEST_EMPLOYEE_ID}?days=7")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Verify response structure
        assert data.get("ok") is True
        assert "company_feed" in data
        assert "team_celebrations" in data
        assert "employee" in data
        
        # company_feed should be a list
        company_feed = data["company_feed"]
        assert isinstance(company_feed, list)

    def test_company_feed_entry_structure(self):
        """company_feed entries have correct structure: {date, name, kind, years, department}"""
        r = requests.get(f"{BASE_URL}/api/my-schedule/employee/{TEST_EMPLOYEE_ID}?days=7")
        assert r.status_code == 200
        data = r.json()
        
        company_feed = data.get("company_feed", [])
        if len(company_feed) > 0:
            entry = company_feed[0]
            assert "date" in entry, "company_feed entry missing 'date'"
            assert "name" in entry, "company_feed entry missing 'name'"
            assert "kind" in entry, "company_feed entry missing 'kind'"
            assert "department" in entry, "company_feed entry missing 'department'"
            # years can be null for birthdays
            assert "years" in entry, "company_feed entry missing 'years'"
            
            # kind should be one of: birthday, anniversary, promotion
            assert entry["kind"] in ["birthday", "anniversary", "promotion"]

    def test_company_feed_excludes_same_employee(self):
        """company_feed should not include the requesting employee's own milestones"""
        r = requests.get(f"{BASE_URL}/api/my-schedule/employee/{TEST_EMPLOYEE_ID}?days=7")
        assert r.status_code == 200
        data = r.json()
        
        company_feed = data.get("company_feed", [])
        employee_name = data.get("employee", {}).get("display_name")
        
        # None of the company_feed entries should be for the requesting employee
        for entry in company_feed:
            assert entry.get("name") != employee_name, \
                f"company_feed should not include the requesting employee's milestones"

    def test_team_celebrations_same_department_only(self):
        """team_celebrations should only include same-department milestones"""
        r = requests.get(f"{BASE_URL}/api/my-schedule/employee/{TEST_EMPLOYEE_ID}?days=7")
        assert r.status_code == 200
        data = r.json()
        
        employee_dept = data.get("employee", {}).get("department")
        team_celebrations = data.get("team_celebrations", [])
        
        for entry in team_celebrations:
            assert entry.get("department") == employee_dept, \
                f"team_celebrations entry has wrong department: {entry.get('department')} != {employee_dept}"


class TestRegressionJobProfiles:
    """Regression tests for iter177 Job Profiles feature"""

    def test_job_profiles_list_returns_21_plus(self):
        """GET /api/job-profiles/list returns 21+ seeded profiles"""
        r = requests.get(
            f"{BASE_URL}/api/job-profiles/list",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        profiles = data.get("profiles", [])
        assert len(profiles) >= 21, f"Expected 21+ profiles, got {len(profiles)}"

    def test_job_profiles_list_requires_admin_token(self):
        """GET /api/job-profiles/list returns 401 without X-Admin-Token"""
        r = requests.get(f"{BASE_URL}/api/job-profiles/list")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"


class TestRegressionEmployeeHR:
    """Regression tests for iter177 Employee HR features"""

    def test_people_list_returns_employees(self):
        """GET /api/people/list returns employees"""
        r = requests.get(f"{BASE_URL}/api/people/list")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        employees = data.get("employees", [])
        assert len(employees) > 0, "Expected at least 1 employee"

    def test_employee_hr_drawer_endpoint(self):
        """GET /api/employees/{id}/resume returns metadata (or 404 if no resume)"""
        r = requests.get(
            f"{BASE_URL}/api/employees/{TEST_EMPLOYEE_ID}/resume",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        # Either 200 (has resume) or 404 (no resume) is acceptable
        assert r.status_code in [200, 404], f"Expected 200 or 404, got {r.status_code}"


class TestHealthAndBasics:
    """Basic health checks"""

    def test_health_endpoint(self):
        """GET /api/health returns healthy status"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
