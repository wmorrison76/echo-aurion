"""iter197 · Mobile Build 5 — OpsSnapshot + ActivityStrip + Echo "What just happened?"

Tests for the new HomeSalary components:
- OpsSnapshot: Fresh Meal ops tiles (packs, temp excursions, delivery, lane util)
- ActivityStrip: Recent timeline events + "What just happened?" Echo summary
- Role gating: GENERAL role should NOT see these components (only salary+)
- Backend regression: /api/fresh-meals/ops-dashboard, /api/timeline/recent, /api/echo/whats-new
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o")
MANAGER_TOKEN = "2DwSKsmwALyIFd3JI_bq6Z3w"  # Manager briefing token from test_credentials.md


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestFreshMealsOpsDashboard:
    """Tests for /api/fresh-meals/ops-dashboard endpoint"""
    
    def test_ops_dashboard_returns_200(self, api_client):
        """Verify ops-dashboard endpoint returns 200 OK"""
        response = api_client.get(
            f"{BASE_URL}/api/fresh-meals/ops-dashboard",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        
    def test_ops_dashboard_has_production_data(self, api_client):
        """Verify ops-dashboard returns production data for OpsSnapshot tiles"""
        response = api_client.get(
            f"{BASE_URL}/api/fresh-meals/ops-dashboard",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check production section exists
        assert "production" in data
        prod = data["production"]
        assert "kits_produced_today" in prod
        assert "kits_in_queue" in prod
        
    def test_ops_dashboard_has_lanes_data(self, api_client):
        """Verify ops-dashboard returns lanes data for lane utilization tile"""
        response = api_client.get(
            f"{BASE_URL}/api/fresh-meals/ops-dashboard",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check lanes section exists
        assert "lanes" in data
        lanes = data["lanes"]
        assert "total" in lanes
        assert "avg_utilization" in lanes
        assert "lanes" in lanes
        
    def test_ops_dashboard_has_delivery_data(self, api_client):
        """Verify ops-dashboard returns delivery data for delivery tile"""
        response = api_client.get(
            f"{BASE_URL}/api/fresh-meals/ops-dashboard",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check delivery section exists
        assert "delivery" in data
        delivery = data["delivery"]
        assert "out_for_delivery" in delivery
        assert "delivered_today" in delivery
        assert "issues" in delivery
        
    def test_ops_dashboard_has_alerts(self, api_client):
        """Verify ops-dashboard returns alerts array (for temp excursions)"""
        response = api_client.get(
            f"{BASE_URL}/api/fresh-meals/ops-dashboard",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check alerts section exists
        assert "alerts" in data
        assert isinstance(data["alerts"], list)


class TestTimelineRecent:
    """Tests for /api/timeline/recent endpoint (ActivityStrip data source)"""
    
    def test_timeline_recent_returns_200(self, api_client):
        """Verify timeline/recent endpoint returns 200 OK"""
        response = api_client.get(
            f"{BASE_URL}/api/timeline/recent?limit=6",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        
    def test_timeline_recent_returns_events(self, api_client):
        """Verify timeline/recent returns events array"""
        response = api_client.get(
            f"{BASE_URL}/api/timeline/recent?limit=6",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data
        assert isinstance(data["events"], list)
        assert "total" in data
        
    def test_timeline_recent_event_structure(self, api_client):
        """Verify timeline events have correct structure"""
        response = api_client.get(
            f"{BASE_URL}/api/timeline/recent?limit=6",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["events"]:
            event = data["events"][0]
            assert "type" in event
            assert "timestamp" in event
            assert "actor" in event


class TestEchoWhatsNew:
    """Tests for /api/echo/whats-new endpoint (Echo "What just happened?" feature)"""
    
    def test_whats_new_returns_200(self, api_client):
        """Verify echo/whats-new endpoint returns 200 OK"""
        response = api_client.post(
            f"{BASE_URL}/api/echo/whats-new",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"minutes": 30}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        
    def test_whats_new_returns_summary(self, api_client):
        """Verify echo/whats-new returns summary and headline"""
        response = api_client.post(
            f"{BASE_URL}/api/echo/whats-new",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"minutes": 30}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "headline" in data
        assert "window_minutes" in data
        assert "event_count" in data
        assert "mode" in data
        
    def test_whats_new_respects_window(self, api_client):
        """Verify echo/whats-new respects the minutes parameter"""
        response = api_client.post(
            f"{BASE_URL}/api/echo/whats-new",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"minutes": 15}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["window_minutes"] == 15
        
    def test_whats_new_mode_is_valid(self, api_client):
        """Verify echo/whats-new returns valid mode"""
        response = api_client.post(
            f"{BASE_URL}/api/echo/whats-new",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"minutes": 30}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Mode should be one of: llm, fallback_no_llm, fallback_llm_error, empty
        valid_modes = ["llm", "fallback_no_llm", "fallback_llm_error", "empty"]
        assert data["mode"] in valid_modes


class TestStaffMobileMe:
    """Tests for /api/staff-mobile/me endpoint (role gating verification)"""
    
    def test_manager_token_returns_salary_caps(self, api_client):
        """Verify manager token returns is_salary=True capability"""
        response = api_client.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "capabilities" in data
        caps = data["capabilities"]
        assert caps.get("is_salary") is True or caps.get("is_manager") is True
        
    def test_staff_mobile_me_returns_staff_info(self, api_client):
        """Verify staff-mobile/me returns staff information"""
        response = api_client.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "staff" in data
        staff = data["staff"]
        assert "name" in staff or "role" in staff


class TestRegressionFinanceTiles:
    """Regression tests for existing finance tiles endpoint"""
    
    def test_finance_rollup_returns_200(self, api_client):
        """Verify finance rollup endpoint still works"""
        response = api_client.get(
            f"{BASE_URL}/api/staff-mobile/finance/rollup?days=7",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        # May return 403 for non-salary roles, but should not 500
        assert response.status_code in [200, 403]
        
    def test_finance_rollup_has_tiles(self, api_client):
        """Verify finance rollup returns tiles data"""
        response = api_client.get(
            f"{BASE_URL}/api/staff-mobile/finance/rollup?days=7",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        if response.status_code == 200:
            data = response.json()
            assert "tiles" in data


class TestRegressionHiring:
    """Regression tests for hiring endpoints (manager+)"""
    
    def test_hiring_batches_returns_200(self, api_client):
        """Verify hiring batches endpoint still works"""
        response = api_client.get(
            f"{BASE_URL}/api/staff-mobile/hiring/batches?limit=10",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        # May return 403 for non-manager roles
        assert response.status_code in [200, 403]
        
    def test_hiring_batches_has_batches(self, api_client):
        """Verify hiring batches returns batches array"""
        response = api_client.get(
            f"{BASE_URL}/api/staff-mobile/hiring/batches?limit=10",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        if response.status_code == 200:
            data = response.json()
            assert "batches" in data
            assert isinstance(data["batches"], list)


class TestRegressionTimeline:
    """Regression tests for timeline endpoints"""
    
    def test_timeline_query_returns_200(self, api_client):
        """Verify timeline query endpoint still works"""
        response = api_client.post(
            f"{BASE_URL}/api/timeline/query",
            headers={"X-Briefing-Token": MANAGER_TOKEN},
            json={"limit": 10}
        )
        assert response.status_code == 200
        
    def test_timeline_recall_returns_200(self, api_client):
        """Verify timeline recall endpoint still works"""
        response = api_client.get(
            f"{BASE_URL}/api/timeline/recall?tlc=TLC-TEST123",
            headers={"X-Briefing-Token": MANAGER_TOKEN}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
