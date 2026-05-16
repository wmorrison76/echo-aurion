"""
Iteration 22 - LUCCCA Enterprise Smoke Test
Tests backend health and command center endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')

class TestBackendHealth:
    """Backend health and command center tests"""
    
    def test_health_endpoint_returns_200(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("platform") == "LUCCCA Enterprise"
        print(f"✅ Health: {data.get('platform')} v{data.get('version')}")
    
    def test_health_shows_all_engines_active(self):
        """All 10 engines should be active"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        engines = data.get("engines", {})
        active_count = sum(1 for status in engines.values() if status == "active")
        assert active_count == 10, f"Expected 10 active engines, got {active_count}"
        print(f"✅ Engines: {active_count}/10 active")
    
    def test_command_center_returns_200(self):
        """Command center should return 200 with KPI data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # Verify KPI sections exist
        assert "operations" in data
        assert "pos" in data
        assert "labor" in data
        assert "events" in data
        assert "forecasting" in data
        assert "system_health" in data
        print(f"✅ Command Center: All KPI sections present")
    
    def test_command_center_has_weather(self):
        """Command center should include weather data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200
        data = response.json()
        weather = data.get("weather")
        assert weather is not None
        assert "temp" in weather
        assert "description" in weather
        print(f"✅ Weather: {weather.get('temp')}°F {weather.get('description')}")
    
    def test_pos_revenue_data(self):
        """POS data should have revenue and transactions"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200
        data = response.json()
        pos = data.get("pos", {})
        assert "revenue_today" in pos
        assert "transactions_today" in pos
        print(f"✅ POS: ${pos.get('revenue_today')} revenue, {pos.get('transactions_today')} transactions")
    
    def test_labor_cost_is_realistic(self):
        """Labor cost percentage should be realistic (not 2327%)"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200
        data = response.json()
        labor = data.get("labor", {})
        labor_pct = labor.get("labor_pct", 0)
        assert 0 < labor_pct < 100, f"Labor % should be 0-100, got {labor_pct}"
        print(f"✅ Labor: {labor_pct}% (Target: {labor.get('target_pct')}%)")
    
    def test_events_data(self):
        """Events data should have total and upcoming"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200
        data = response.json()
        events = data.get("events", {})
        assert "total" in events
        print(f"✅ Events: {events.get('total')} total events")
    
    def test_websocket_endpoint_exists(self):
        """WebSocket endpoint should be configured"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "websocket" in data
        print(f"✅ WebSocket: {data.get('websocket')}")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
