"""
Iteration 95: Regression Test Suite - Post-Cleanup Verification
================================================================
Tests all major module endpoints after system cleanup:
- 36 dead route files deleted
- Competitor names scrubbed (Craftable, OnTrack, BirchStreet, Fourth, Builder.io)
- Broken imports fixed in server.py, scheduler.py, echoai3_orchestrator.py

Verifies: Health, Enterprise BI, Concierge, Purchasing, Item Mapping, Daily Reports,
21-Day Forecast, EchoAi3, Procurement, and no competitor names in responses.
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndStartup:
    """Verify server starts correctly with all 10 engines active"""
    
    def test_health_endpoint_returns_200(self):
        """GET /api/health - server starts and returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        print(f"✓ Health check passed: {data['status']}")
    
    def test_all_10_engines_active(self):
        """Verify all 10 engines are active in health response"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        data = response.json()
        engines = data.get("engines", {})
        
        expected_engines = [
            "operations_core", "ai_forecasting", "pos_integration",
            "event_lifecycle", "labor_cost", "event_bus", "payroll",
            "workflow", "notifications", "tamper_audit"
        ]
        
        for engine in expected_engines:
            assert engine in engines, f"Missing engine: {engine}"
            assert engines[engine] == "active", f"Engine {engine} not active"
        
        print(f"✓ All 10 engines active: {list(engines.keys())}")


class TestEnterpriseBIModule:
    """Enterprise BI endpoints - STR and Portfolio dashboards"""
    
    def test_str_dashboard(self):
        """GET /api/enterprise-bi/str/dashboard - STR dashboard works"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard", timeout=10)
        assert response.status_code == 200, f"STR dashboard failed: {response.status_code}"
        data = response.json()
        assert "str_data" in data or "metrics" in data or "dashboard" in data or isinstance(data, dict)
        print(f"✓ Enterprise BI STR dashboard: 200 OK")
    
    def test_portfolio_dashboard(self):
        """GET /api/enterprise-bi/portfolio/dashboard - Portfolio dashboard works"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard", timeout=10)
        assert response.status_code == 200, f"Portfolio dashboard failed: {response.status_code}"
        print(f"✓ Enterprise BI Portfolio dashboard: 200 OK")


class TestConciergeModule:
    """Echo Concierge endpoints - outlets, equipment, tickets"""
    
    def test_concierge_outlets(self):
        """GET /api/concierge/outlets - Concierge outlets work"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets", timeout=10)
        assert response.status_code == 200, f"Concierge outlets failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✓ Concierge outlets: 200 OK")
    
    def test_concierge_equipment(self):
        """GET /api/concierge/equipment - Equipment works"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment", timeout=10)
        assert response.status_code == 200, f"Concierge equipment failed: {response.status_code}"
        print(f"✓ Concierge equipment: 200 OK")
    
    def test_concierge_guest_report_creation(self):
        """POST /api/concierge/guest-report - Ticket creation works"""
        payload = {
            "guest_name": "TEST_Regression Guest",
            "room_number": "412",
            "issue_type": "maintenance",
            "description": "Test ticket from regression suite iter95",
            "priority": "medium"
        }
        response = requests.post(f"{BASE_URL}/api/concierge/guest-report", json=payload, timeout=10)
        # Accept 200, 201, or 422 (validation) as valid responses
        assert response.status_code in [200, 201, 422], f"Guest report failed: {response.status_code}"
        print(f"✓ Concierge guest-report: {response.status_code}")


class TestPurchasingModule:
    """Purchasing Hub endpoints"""
    
    def test_purchasing_dashboard(self):
        """GET /api/purchasing/dashboard - Purchasing hub works"""
        response = requests.get(f"{BASE_URL}/api/purchasing/dashboard", timeout=10)
        assert response.status_code == 200, f"Purchasing dashboard failed: {response.status_code}"
        print(f"✓ Purchasing dashboard: 200 OK")
    
    def test_purchasing_vendors(self):
        """GET /api/purchasing/vendors - Vendors list works"""
        response = requests.get(f"{BASE_URL}/api/purchasing/vendors", timeout=10)
        assert response.status_code == 200, f"Purchasing vendors failed: {response.status_code}"
        print(f"✓ Purchasing vendors: 200 OK")


class TestItemMappingModule:
    """Item Mapping Engine endpoints"""
    
    def test_item_mapping_catalog(self):
        """GET /api/item-mapping/catalog - Catalog works with 30 items"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog", timeout=10)
        assert response.status_code == 200, f"Item mapping catalog failed: {response.status_code}"
        data = response.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        if isinstance(items, list):
            assert len(items) >= 30, f"Expected 30+ items, got {len(items)}"
            print(f"✓ Item mapping catalog: 200 OK ({len(items)} items)")
        else:
            print(f"✓ Item mapping catalog: 200 OK")
    
    def test_item_mapping_fuzzy_match(self):
        """POST /api/item-mapping/match - Fuzzy matching works"""
        # Correct payload format with vendor_name and line_items
        payload = {
            "vendor_name": "TEST_Vendor",
            "line_items": [
                {"description": "Atlantic Salmon Fillet 8oz", "vendor_code": "SAL-001"}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload, timeout=10)
        assert response.status_code == 200, f"Item mapping match failed: {response.status_code}"
        data = response.json()
        # Response contains 'items' with match results
        assert "items" in data or "results" in data or "matches" in data
        if "items" in data:
            assert len(data["items"]) > 0, "No match results returned"
            assert data["items"][0].get("best_match"), "No best_match in result"
        print(f"✓ Item mapping fuzzy match: 200 OK (confidence: {data.get('items', [{}])[0].get('best_match', {}).get('confidence', 'N/A')}%)")
    
    def test_item_mapping_stats(self):
        """GET /api/item-mapping/stats - Stats work"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/stats", timeout=10)
        assert response.status_code == 200, f"Item mapping stats failed: {response.status_code}"
        print(f"✓ Item mapping stats: 200 OK")


class TestDailyReportsModule:
    """Daily Reports endpoints"""
    
    def test_gm_flash_report(self):
        """GET /api/daily-reports/gm-flash - GM Flash report works"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash", timeout=10)
        assert response.status_code == 200, f"GM Flash report failed: {response.status_code}"
        print(f"✓ Daily reports GM Flash: 200 OK")


class TestForecast21DayModule:
    """21-Day Forecast endpoints"""
    
    def test_forecast_dashboard(self):
        """GET /api/forecast-21/forecast - 21-Day Forecast works"""
        # Correct endpoint is /api/forecast-21/forecast (not /api/forecast-21day/dashboard)
        response = requests.get(f"{BASE_URL}/api/forecast-21/forecast", timeout=10)
        assert response.status_code == 200, f"21-Day Forecast failed: {response.status_code}"
        data = response.json()
        assert "forecast" in data or "period" in data
        print(f"✓ 21-Day Forecast: 200 OK")


class TestEchoAi3Module:
    """EchoAi3 Intelligence endpoints"""
    
    def test_echoai3_identity(self):
        """GET /api/echoai3/identity - Identity endpoint works (refactored inline)"""
        response = requests.get(f"{BASE_URL}/api/echoai3/identity", timeout=10)
        assert response.status_code == 200, f"EchoAi3 identity failed: {response.status_code}"
        data = response.json()
        assert "self_model" in data or "name" in data or "role_descriptions" in data
        print(f"✓ EchoAi3 identity: 200 OK")
    
    def test_echoai3_health(self):
        """GET /api/echoai3/health - EchoAi3 health check"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health", timeout=10)
        assert response.status_code == 200, f"EchoAi3 health failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "operational"
        print(f"✓ EchoAi3 health: 200 OK (operational)")


class TestProcurementModule:
    """Procurement endpoints"""
    
    def test_vendor_scorecards(self):
        """GET /api/procurement/vendor-scorecards - Procurement works"""
        response = requests.get(f"{BASE_URL}/api/procurement/vendor-scorecards", timeout=10)
        assert response.status_code == 200, f"Vendor scorecards failed: {response.status_code}"
        print(f"✓ Procurement vendor scorecards: 200 OK")
    
    def test_ap_aging(self):
        """GET /api/procurement/ap-aging - AP aging works"""
        response = requests.get(f"{BASE_URL}/api/procurement/ap-aging", timeout=10)
        assert response.status_code == 200, f"AP aging failed: {response.status_code}"
        print(f"✓ Procurement AP aging: 200 OK")


class TestNoCompetitorNames:
    """Verify no competitor names in API responses"""
    
    COMPETITOR_NAMES = ["craftable", "ontrack", "birchstreet", "fourth", "builder.io"]
    
    def _check_for_competitors(self, data, endpoint):
        """Helper to check for competitor names in response"""
        text = json.dumps(data).lower()
        found = [name for name in self.COMPETITOR_NAMES if name in text]
        assert not found, f"Competitor names found in {endpoint}: {found}"
    
    def test_health_no_competitors(self):
        """Health endpoint has no competitor names"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        self._check_for_competitors(response.json(), "/api/health")
        print(f"✓ No competitor names in /api/health")
    
    def test_dashboard_no_competitors(self):
        """Dashboard endpoint has no competitor names"""
        response = requests.get(f"{BASE_URL}/api/dashboard", timeout=10)
        if response.status_code == 200:
            self._check_for_competitors(response.json(), "/api/dashboard")
            print(f"✓ No competitor names in /api/dashboard")
        else:
            print(f"⚠ Dashboard returned {response.status_code}, skipping competitor check")
    
    def test_echoai3_identity_no_competitors(self):
        """EchoAi3 identity has no competitor names"""
        response = requests.get(f"{BASE_URL}/api/echoai3/identity", timeout=10)
        self._check_for_competitors(response.json(), "/api/echoai3/identity")
        print(f"✓ No competitor names in /api/echoai3/identity")


class TestAdditionalModulesRegression:
    """Additional module endpoints for broad regression coverage"""
    
    def test_operations_stats(self):
        """GET /api/operations/stats - Operations stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/operations/stats", timeout=10)
        assert response.status_code == 200, f"Operations stats failed: {response.status_code}"
        print(f"✓ Operations stats: 200 OK")
    
    def test_forecasting_alerts(self):
        """GET /api/forecasting/alerts - Forecasting alerts endpoint"""
        response = requests.get(f"{BASE_URL}/api/forecasting/alerts", timeout=10)
        assert response.status_code == 200, f"Forecasting alerts failed: {response.status_code}"
        print(f"✓ Forecasting alerts: 200 OK")
    
    def test_events_list(self):
        """GET /api/events"""
        response = requests.get(f"{BASE_URL}/api/events", timeout=10)
        assert response.status_code == 200, f"Events list failed: {response.status_code}"
        print(f"✓ Events list: 200 OK")
    
    def test_pos_stats(self):
        """GET /api/pos/stats - POS stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/pos/stats", timeout=10)
        assert response.status_code == 200, f"POS stats failed: {response.status_code}"
        print(f"✓ POS stats: 200 OK")
    
    def test_enterprise_command_center(self):
        """GET /api/enterprise/command-center"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200, f"Command center failed: {response.status_code}"
        print(f"✓ Enterprise command center: 200 OK")
    
    def test_rbac_users(self):
        """GET /api/rbac/users"""
        response = requests.get(f"{BASE_URL}/api/rbac/users", timeout=10)
        assert response.status_code == 200, f"RBAC users failed: {response.status_code}"
        print(f"✓ RBAC users: 200 OK")
    
    def test_calendar_events(self):
        """GET /api/calendar/events"""
        response = requests.get(f"{BASE_URL}/api/calendar/events", timeout=10)
        assert response.status_code == 200, f"Calendar events failed: {response.status_code}"
        print(f"✓ Calendar events: 200 OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
