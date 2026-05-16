"""
Iteration 72: Sidebar Reorganization & Integration Hub Tests
=============================================================
Tests for:
1. Integration status endpoint (GET /api/integrations/status)
2. Integration configure endpoint (POST /api/integrations/configure)
3. Integration test endpoint (POST /api/integrations/test/{provider})
4. Engineering ops integrations endpoint (GET /api/engineering-ops/integrations)
5. Existing endpoints still work (spa, engineering, analytics, calendar)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestIntegrationStatus:
    """Test GET /api/integrations/status endpoint"""
    
    def test_integration_status_returns_200(self):
        """Integration status endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/integrations/status returns 200")
    
    def test_integration_status_has_4_providers(self):
        """Integration status returns 4 providers"""
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        assert "integrations" in data, "Response missing 'integrations' key"
        assert len(data["integrations"]) == 4, f"Expected 4 providers, got {len(data['integrations'])}"
        print(f"✓ Integration status has {len(data['integrations'])} providers")
    
    def test_integration_status_has_toast_pos(self):
        """Integration status includes Toast POS"""
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        providers = {i["name"]: i for i in data["integrations"]}
        assert "Toast POS" in providers, "Toast POS not found in integrations"
        assert providers["Toast POS"]["type"] == "pos", "Toast POS should be type 'pos'"
        print("✓ Toast POS found with type 'pos'")
    
    def test_integration_status_has_quickbooks(self):
        """Integration status includes QuickBooks Online"""
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        providers = {i["name"]: i for i in data["integrations"]}
        assert "QuickBooks Online" in providers, "QuickBooks Online not found"
        assert providers["QuickBooks Online"]["type"] == "gl", "QuickBooks should be type 'gl'"
        print("✓ QuickBooks Online found with type 'gl'")
    
    def test_integration_status_has_sendgrid(self):
        """Integration status includes SendGrid"""
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        providers = {i["name"]: i for i in data["integrations"]}
        assert "SendGrid" in providers, "SendGrid not found"
        assert providers["SendGrid"]["type"] == "email", "SendGrid should be type 'email'"
        print("✓ SendGrid found with type 'email'")
    
    def test_integration_status_has_resend(self):
        """Integration status includes Resend"""
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        providers = {i["name"]: i for i in data["integrations"]}
        assert "Resend" in providers, "Resend not found"
        assert providers["Resend"]["type"] == "email", "Resend should be type 'email'"
        print("✓ Resend found with type 'email'")


class TestIntegrationConfigure:
    """Test POST /api/integrations/configure endpoint"""
    
    def test_configure_integration_stores_credentials(self):
        """Configure endpoint stores credentials"""
        payload = {
            "provider": "toast",
            "api_key": "test-api-key-123",
            "client_id": "test-client-id",
            "client_secret": "test-secret",
            "environment": "sandbox"
        }
        response = requests.post(f"{BASE_URL}/api/integrations/configure", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "configured", f"Expected status 'configured', got {data.get('status')}"
        assert data["provider"] == "toast", f"Expected provider 'toast', got {data.get('provider')}"
        print("✓ POST /api/integrations/configure stores credentials successfully")
    
    def test_configure_updates_status(self):
        """After configure, status shows configured"""
        # First configure
        payload = {
            "provider": "quickbooks",
            "api_key": "qb-test-key",
            "client_id": "qb-client",
            "client_secret": "qb-secret",
            "environment": "sandbox"
        }
        requests.post(f"{BASE_URL}/api/integrations/configure", json=payload)
        
        # Then check status
        response = requests.get(f"{BASE_URL}/api/integrations/status")
        data = response.json()
        providers = {i["name"]: i for i in data["integrations"]}
        assert providers["QuickBooks Online"]["status"] == "configured", "QuickBooks should be configured"
        print("✓ Integration status updates after configure")


class TestIntegrationTest:
    """Test POST /api/integrations/test/{provider} endpoint"""
    
    def test_test_connection_configured_provider(self):
        """Test connection for configured provider"""
        # First configure
        payload = {
            "provider": "sendgrid",
            "api_key": "sg-test-key",
            "environment": "sandbox"
        }
        requests.post(f"{BASE_URL}/api/integrations/configure", json=payload)
        
        # Then test
        response = requests.post(f"{BASE_URL}/api/integrations/test/sendgrid")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "connection_ready", f"Expected 'connection_ready', got {data.get('status')}"
        print("✓ POST /api/integrations/test/sendgrid returns connection_ready")
    
    def test_test_connection_unconfigured_provider(self):
        """Test connection for unconfigured provider returns 404"""
        response = requests.post(f"{BASE_URL}/api/integrations/test/unconfigured_provider")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Test unconfigured provider returns 404")


class TestEngineeringOpsIntegrations:
    """Test GET /api/engineering-ops/integrations endpoint"""
    
    def test_engineering_ops_integrations_returns_200(self):
        """Engineering ops integrations endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/engineering-ops/integrations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/engineering-ops/integrations returns 200")
    
    def test_engineering_ops_has_integrations_array(self):
        """Engineering ops returns integrations array"""
        response = requests.get(f"{BASE_URL}/api/engineering-ops/integrations")
        data = response.json()
        assert "integrations" in data, "Response missing 'integrations' key"
        assert isinstance(data["integrations"], list), "integrations should be a list"
        print(f"✓ Engineering ops has {len(data['integrations'])} integrations")
    
    def test_engineering_ops_has_alice_quore_hotsos_flexkeeping(self):
        """Engineering ops includes ALICE, Quore, HotSOS (Amadeus), Flexkeeping"""
        response = requests.get(f"{BASE_URL}/api/engineering-ops/integrations")
        data = response.json()
        names = [i.get("name", "") for i in data.get("integrations", [])]
        # Note: HotSOS is named "HotSOS (Amadeus)" in the API
        expected = ["ALICE", "Quore", "HotSOS (Amadeus)", "Flexkeeping"]
        for name in expected:
            assert name in names, f"{name} not found in engineering ops integrations"
        print(f"✓ Engineering ops has ALICE, Quore, HotSOS (Amadeus), Flexkeeping")


class TestExistingEndpointsStillWork:
    """Verify existing endpoints still work after sidebar changes"""
    
    def test_spa_analytics_still_works(self):
        """Spa analytics endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/dept-analytics/spa")
        assert response.status_code == 200, f"Spa analytics failed: {response.status_code}"
        data = response.json()
        assert "kpis" in data, "Spa analytics missing kpis"
        print("✓ GET /api/dept-analytics/spa still works")
    
    def test_engineering_analytics_still_works(self):
        """Engineering analytics endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/dept-analytics/engineering")
        assert response.status_code == 200, f"Engineering analytics failed: {response.status_code}"
        data = response.json()
        assert "kpis" in data, "Engineering analytics missing kpis"
        print("✓ GET /api/dept-analytics/engineering still works")
    
    def test_calendar_events_still_works(self):
        """Calendar events endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/calendar/events")
        assert response.status_code == 200, f"Calendar events failed: {response.status_code}"
        data = response.json()
        assert "data" in data, "Calendar events missing data"
        print("✓ GET /api/calendar/events still works")
    
    def test_health_endpoint_still_works(self):
        """Health endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health endpoint failed: {response.status_code}"
        print("✓ GET /api/health still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
