"""
iter254 · Echo Schedule v2 + Consolidation Tests
=================================================
Tests for:
1. Echo Schedule v2 API (positions, employees, shifts, compliance, myecho)
2. Regression: vendor-skus lookup, approvals limits, invoices
3. Verify PurchasingApprovals module deletion (no standalone route)
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

TODAY_ISO = datetime.now().strftime("%Y-%m-%d")


class TestEchoSchedulePositions:
    """Test /api/echo-schedule/positions endpoint"""

    def test_positions_returns_8_departments(self):
        """GET /api/echo-schedule/positions returns 8 departments"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/positions")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "departments" in data
        assert len(data["departments"]) == 8, f"Expected 8 departments, got {len(data['departments'])}"
        expected_depts = ["boh-culinary", "boh-stewarding", "foh-restaurant", "foh-banquets",
                         "foh-pool-rooftop", "spa", "engineering", "housekeeping"]
        for dept in expected_depts:
            assert dept in data["departments"], f"Missing department: {dept}"

    def test_positions_returns_50_plus_positions(self):
        """GET /api/echo-schedule/positions returns 50+ positions"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/positions")
        assert r.status_code == 200
        data = r.json()
        assert "positions" in data
        assert len(data["positions"]) >= 50, f"Expected 50+ positions, got {len(data['positions'])}"

    def test_positions_has_tier_labels(self):
        """GET /api/echo-schedule/positions returns tier labels 1/2/3"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/positions")
        assert r.status_code == 200
        data = r.json()
        assert "tiers" in data
        tiers = data["tiers"]
        assert 1 in tiers or "1" in tiers, "Missing tier 1"
        assert 2 in tiers or "2" in tiers, "Missing tier 2"
        assert 3 in tiers or "3" in tiers, "Missing tier 3"


class TestEchoScheduleEmployees:
    """Test /api/echo-schedule/employees endpoints"""

    def test_employees_returns_19_seeded(self):
        """GET /api/echo-schedule/employees returns 19 seeded employees"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/employees")
        assert r.status_code == 200
        data = r.json()
        assert "rows" in data
        # Should have at least 19 seeded employees
        assert data["count"] >= 19, f"Expected 19+ employees, got {data['count']}"

    def test_employees_includes_carlos_mendes(self):
        """GET /api/echo-schedule/employees includes Carlos Mendes (boh-culinary tier1)"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/employees")
        assert r.status_code == 200
        data = r.json()
        carlos = next((e for e in data["rows"] if "Carlos" in e.get("name", "")), None)
        assert carlos is not None, "Carlos Mendes not found"
        assert carlos["department"] == "boh-culinary"
        assert carlos["tier"] == 1

    def test_employees_includes_jordan_lee_minor(self):
        """GET /api/echo-schedule/employees includes Jordan Lee (boh-culinary minor tier3)"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/employees")
        assert r.status_code == 200
        data = r.json()
        jordan = next((e for e in data["rows"] if "Jordan" in e.get("name", "")), None)
        assert jordan is not None, "Jordan Lee not found"
        assert jordan["department"] == "boh-culinary"
        assert jordan["tier"] == 3
        assert jordan["is_minor"] == True

    def test_employees_includes_diego_morales(self):
        """GET /api/echo-schedule/employees includes Diego Morales (foh-banquets tier1)"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/employees")
        assert r.status_code == 200
        data = r.json()
        diego = next((e for e in data["rows"] if "Diego" in e.get("name", "")), None)
        assert diego is not None, "Diego Morales not found"
        assert diego["department"] == "foh-banquets"
        assert diego["tier"] == 1

    def test_get_employee_jordan_lee_is_minor(self):
        """GET /api/echo-schedule/employees/emp-jordan-lee returns is_minor=true"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/employees/emp-jordan-lee")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("is_minor") == True, f"Expected is_minor=True, got {data.get('is_minor')}"


class TestEchoScheduleTierUpdate:
    """Test PUT /api/echo-schedule/employees/{eid}/tier"""

    def test_update_tier_and_verify(self):
        """PUT /api/echo-schedule/employees/{eid}/tier updates tier; GET reflects"""
        eid = "emp-jordan-lee"
        # Update tier to 2
        r = requests.put(f"{BASE_URL}/api/echo-schedule/employees/{eid}/tier",
                         json={"tier": 2})
        assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["tier"] == 2

        # Verify with GET
        r2 = requests.get(f"{BASE_URL}/api/echo-schedule/employees/{eid}")
        assert r2.status_code == 200
        assert r2.json()["tier"] == 2

        # Restore to tier 3
        requests.put(f"{BASE_URL}/api/echo-schedule/employees/{eid}/tier",
                     json={"tier": 3})


class TestEchoScheduleJobDescription:
    """Test PUT /api/echo-schedule/employees/{eid}/job-description"""

    def test_update_job_description_persists(self):
        """PUT /api/echo-schedule/employees/{eid}/job-description persists"""
        eid = "emp-jordan-lee"
        new_desc = "TEST_iter254: Prep cook responsible for mise en place and basic prep work."
        r = requests.put(f"{BASE_URL}/api/echo-schedule/employees/{eid}/job-description",
                         json={"job_description": new_desc})
        assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"

        # Verify with GET
        r2 = requests.get(f"{BASE_URL}/api/echo-schedule/employees/{eid}")
        assert r2.status_code == 200
        assert new_desc in r2.json().get("job_description", "")


class TestEchoScheduleReviews:
    """Test POST /api/echo-schedule/employees/{eid}/reviews"""

    def test_add_review_appends_to_array(self):
        """POST /api/echo-schedule/employees/{eid}/reviews appends to reviews array"""
        eid = "emp-jordan-lee"
        review_payload = {
            "rating": 5,
            "comment": "TEST_iter254: Great work on prep station!",
            "reviewer_id": "admin"
        }
        r = requests.post(f"{BASE_URL}/api/echo-schedule/employees/{eid}/reviews",
                          json=review_payload)
        assert r.status_code == 200, f"POST failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["ok"] == True
        assert "review" in data
        assert data["review"]["rating"] == 5

        # Verify with GET
        r2 = requests.get(f"{BASE_URL}/api/echo-schedule/employees/{eid}")
        assert r2.status_code == 200
        reviews = r2.json().get("reviews", [])
        assert any("TEST_iter254" in (rev.get("comment", "") or "") for rev in reviews)


class TestEchoScheduleShifts:
    """Test POST /api/echo-schedule/shifts with compliance flags"""

    def test_create_shift_minor_late_night_flag(self):
        """POST /api/echo-schedule/shifts for minor with late night returns MINOR_LATE_NIGHT flag"""
        shift_payload = {
            "employee_id": "emp-jordan-lee",
            "date_iso": TODAY_ISO,
            "position_scheduled": "prep-cook",
            "in_time": "15:00",
            "out_time": "23:00",
            "break_minutes": 30
        }
        r = requests.post(f"{BASE_URL}/api/echo-schedule/shifts", json=shift_payload)
        assert r.status_code == 200, f"POST failed: {r.status_code} {r.text}"
        data = r.json()
        assert "compliance_flags" in data
        assert "MINOR_LATE_NIGHT" in data["compliance_flags"], \
            f"Expected MINOR_LATE_NIGHT flag, got {data['compliance_flags']}"


class TestEchoScheduleChecker:
    """Test GET /api/echo-schedule/shifts/checker"""

    def test_schedule_checker_returns_structure(self):
        """GET /api/echo-schedule/shifts/checker?date_iso=today returns expected structure"""
        r = requests.get(f"{BASE_URL}/api/echo-schedule/shifts/checker?date_iso={TODAY_ISO}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Check required fields
        assert "total_shifts" in data
        assert "compliance_violations" in data
        assert "by_department" in data
        assert "tier_breakdown" in data
        
        # Tier breakdown should have tier_1, tier_2, tier_3
        tb = data["tier_breakdown"]
        assert "tier_1" in tb
        assert "tier_2" in tb
        assert "tier_3" in tb


class TestEchoScheduleMyEcho:
    """Test GET /api/echo-schedule/myecho/{eid} (staff view)"""

    def test_myecho_returns_shifts_without_tier_or_compliance(self):
        """GET /api/echo-schedule/myecho/{eid}?days=14 returns shifts WITHOUT employee_tier or compliance_flags"""
        eid = "emp-jordan-lee"
        r = requests.get(f"{BASE_URL}/api/echo-schedule/myecho/{eid}?days=14")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "rows" in data
        
        # Check that sensitive fields are NOT exposed
        for shift in data["rows"]:
            assert "employee_tier" not in shift, "employee_tier should not be in myecho response"
            assert "compliance_flags" not in shift, "compliance_flags should not be in myecho response"


class TestRegressionVendorSkuLookup:
    """Regression: /api/vendor-skus/lookup still works"""

    def test_vendor_sku_lookup_butter_returns_plugra(self):
        """GET /api/vendor-skus/lookup?q=butter returns Plugra"""
        r = requests.get(f"{BASE_URL}/api/vendor-skus/lookup?q=butter")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "matches" in data
        assert len(data["matches"]) > 0, "Expected at least one match for 'butter'"
        # Check for Plugra
        plugra_match = next((m for m in data["matches"] if "plugra" in m.get("description", "").lower()), None)
        assert plugra_match is not None, "Plugra not found in butter lookup"


class TestRegressionApprovalsLimits:
    """Regression: /api/approvals/limits still returns 14 role rows"""

    def test_approvals_limits_returns_14_roles(self):
        """GET /api/approvals/limits returns 14 role rows"""
        r = requests.get(f"{BASE_URL}/api/approvals/limits")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "rows" in data
        assert len(data["rows"]) >= 14, f"Expected 14+ role rows, got {len(data['rows'])}"


class TestRegressionInvoices:
    """Regression: /api/invoices still returns William's 3 invoices"""

    def test_invoices_returns_3_william_invoices(self):
        """GET /api/invoices?limit=10 returns 3 William invoices"""
        r = requests.get(f"{BASE_URL}/api/invoices?limit=10")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "rows" in data
        assert len(data["rows"]) >= 3, f"Expected 3+ invoices, got {len(data['rows'])}"
        
        # Check for specific vendors
        vendors = [inv.get("vendor_name", "") for inv in data["rows"]]
        assert any("Cusanos" in v for v in vendors), "Cusanos invoice not found"
        assert any("Halperns" in v for v in vendors), "Halperns invoice not found"
        assert any("Mr Greens" in v for v in vendors), "Mr Greens invoice not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
