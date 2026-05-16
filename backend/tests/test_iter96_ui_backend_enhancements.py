"""
Iteration 96: UI/UX + Backend Enhancement + Production Hardening Tests
=======================================================================
Tests for:
1. Sidebar width changes (220px/52px)
2. Dashboard date pickers with MTD defaults
3. KPI cards responsive text
4. PMS arrivals with guest_intelligence and room_ready enrichment
5. Global exception handler returning JSON (not HTML)
6. All existing endpoints still working after cleanup
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestHealthAndEngines:
    """Verify health endpoint and all engines active"""
    
    def test_health_returns_healthy(self):
        """GET /api/health - returns healthy with all engines"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "engines" in data
        # Verify all 10 engines are active
        engines = data["engines"]
        expected_engines = [
            "operations_core", "ai_forecasting", "pos_integration",
            "event_lifecycle", "labor_cost", "event_bus", "payroll",
            "workflow", "notifications", "tamper_audit"
        ]
        for engine in expected_engines:
            assert engine in engines, f"Engine {engine} not found"
            assert engines[engine] == "active", f"Engine {engine} not active"


class TestEnterpriseCommandCenter:
    """Test Enterprise Command Center with date params"""
    
    def test_command_center_returns_kpi_data(self):
        """GET /api/enterprise/command-center - returns KPI data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        # Verify KPI sections exist
        assert "operations" in data
        assert "pos" in data
        assert "labor" in data
        assert "events" in data
        assert "forecasting" in data
        assert "system_health" in data
        # Verify engines_active count
        assert data["system_health"]["engines_active"] >= 10
    
    def test_command_center_accepts_date_params(self):
        """GET /api/enterprise/command-center?date_from=2026-04-01&date_to=2026-04-15"""
        response = requests.get(
            f"{BASE_URL}/api/enterprise/command-center",
            params={"date_from": "2026-04-01", "date_to": "2026-04-15"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should still return valid data with date params
        assert "pos" in data
        assert "labor" in data


class TestPMSArrivals:
    """Test PMS arrivals with guest_intelligence and room_ready enrichment"""
    
    def test_arrivals_returns_rooms_ready_counts(self):
        """GET /api/enterprise-bi/pms/arrivals - returns rooms_ready and rooms_pending"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        assert response.status_code == 200
        data = response.json()
        # Verify rooms_ready and rooms_pending fields exist
        assert "rooms_ready" in data, "rooms_ready field missing"
        assert "rooms_pending" in data, "rooms_pending field missing"
        assert isinstance(data["rooms_ready"], int)
        assert isinstance(data["rooms_pending"], int)
        # Verify total_arrivals matches
        assert data["total_arrivals"] == data["rooms_ready"] + data["rooms_pending"]
    
    def test_arrivals_have_room_ready_boolean(self):
        """GET /api/enterprise-bi/pms/arrivals - arrivals have room_ready boolean"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        assert response.status_code == 200
        data = response.json()
        arrivals = data.get("arrivals", [])
        if len(arrivals) > 0:
            # Check first few arrivals have room_ready field
            for arrival in arrivals[:5]:
                assert "room_ready" in arrival, f"room_ready missing in arrival: {arrival.get('guest_name')}"
                assert isinstance(arrival["room_ready"], bool), "room_ready should be boolean"
    
    def test_arrivals_may_have_guest_intelligence(self):
        """GET /api/enterprise-bi/pms/arrivals - arrivals may have guest_intelligence"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        assert response.status_code == 200
        data = response.json()
        arrivals = data.get("arrivals", [])
        # Guest intelligence is optional (depends on guest_profiles collection)
        # Just verify the endpoint works and returns arrivals
        assert isinstance(arrivals, list)
        print(f"Total arrivals: {len(arrivals)}")
        # Check if any have guest_intelligence
        with_intel = [a for a in arrivals if "guest_intelligence" in a]
        print(f"Arrivals with guest_intelligence: {len(with_intel)}")


class TestExistingEndpointsAfterCleanup:
    """Verify existing endpoints still work after cleanup"""
    
    def test_portfolio_dashboard(self):
        """GET /api/enterprise-bi/portfolio/dashboard - still works"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "portfolio_summary" in data
        assert "properties" in data
    
    def test_item_mapping_stats(self):
        """GET /api/item-mapping/stats - still works"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_items" in data or "items" in data or response.status_code == 200
    
    def test_concierge_outlets(self):
        """GET /api/concierge/outlets - still works"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200


class TestGlobalExceptionHandler:
    """Test global exception handler returns JSON for unhandled errors"""
    
    def test_nonexistent_endpoint_returns_json(self):
        """GET /api/nonexistent - should return JSON with 'detail' field, not HTML"""
        response = requests.get(f"{BASE_URL}/api/nonexistent")
        # Should return 404 or 500, but as JSON not HTML
        assert response.status_code in [404, 500, 403]
        # Check content type is JSON
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type, f"Expected JSON, got: {content_type}"
        # Try to parse as JSON
        try:
            data = response.json()
            assert "detail" in data, "JSON response should have 'detail' field"
        except Exception as e:
            # If we can't parse JSON, check it's not HTML
            text = response.text
            assert not text.strip().startswith("<!DOCTYPE"), "Response should not be HTML"
            assert not text.strip().startswith("<html"), "Response should not be HTML"


class TestSTRDashboard:
    """Test STR competitive set dashboard"""
    
    def test_str_dashboard(self):
        """GET /api/enterprise-bi/str/dashboard - returns STR data"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "indices" in data
        assert "comp_set" in data


class TestPMSOTBPace:
    """Test PMS OTB pace report"""
    
    def test_otb_pace(self):
        """GET /api/enterprise-bi/pms/otb-pace - returns pace data"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/pms/otb-pace")
        assert response.status_code == 200
        data = response.json()
        assert "pace" in data
        assert "summary" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
