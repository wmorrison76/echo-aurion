"""
Iteration 19 - Dashboard Smoke Tests
=====================================
Tests for:
1. Weather widget on dashboard
2. KPI cards clickability (Revenue, Labor, Inventory, Events, Forecast)
3. Labor cost % calculation fix (should be ~36%, not 2327%)
4. Backend /api/enterprise/command-center endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEnterpriseCommandCenter:
    """Tests for /api/enterprise/command-center endpoint"""
    
    def test_command_center_returns_200(self):
        """Test that command center endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        print("✅ Command center endpoint returns 200")
    
    def test_command_center_has_weather(self):
        """Test that command center returns weather data"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        # Check weather object exists
        assert "weather" in data, "Weather object missing from response"
        weather = data["weather"]
        
        # Check weather has required fields
        assert "temp" in weather, "Weather missing 'temp' field"
        assert "description" in weather, "Weather missing 'description' field"
        assert "icon" in weather, "Weather missing 'icon' field"
        
        # Validate weather values
        assert isinstance(weather["temp"], (int, float)), "Weather temp should be a number"
        assert isinstance(weather["description"], str), "Weather description should be a string"
        assert isinstance(weather["icon"], str), "Weather icon should be a string"
        
        print(f"✅ Weather data: {weather['temp']}°F, {weather['description']}, icon={weather['icon']}")
    
    def test_labor_pct_is_realistic(self):
        """Test that labor_pct is a realistic number (< 100%)"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        # Check labor object exists
        assert "labor" in data, "Labor object missing from response"
        labor = data["labor"]
        
        # Check labor_pct exists and is realistic
        assert "labor_pct" in labor, "Labor missing 'labor_pct' field"
        labor_pct = labor["labor_pct"]
        
        # Labor % should be between 0 and 100 (realistic range)
        assert 0 <= labor_pct <= 100, f"Labor % {labor_pct} is unrealistic (should be 0-100)"
        
        # Specifically check it's not the old buggy value of 2327%
        assert labor_pct < 200, f"Labor % {labor_pct} is way too high (bug not fixed)"
        
        print(f"✅ Labor cost: {labor_pct}% (Target: {labor.get('target_pct', 'N/A')}%)")
    
    def test_pos_revenue_data(self):
        """Test that POS revenue data is present"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        # Check POS object exists
        assert "pos" in data, "POS object missing from response"
        pos = data["pos"]
        
        # Check required POS fields
        assert "revenue_today" in pos, "POS missing 'revenue_today' field"
        assert "transactions_today" in pos, "POS missing 'transactions_today' field"
        
        revenue = pos["revenue_today"]
        transactions = pos["transactions_today"]
        
        assert isinstance(revenue, (int, float)), "Revenue should be a number"
        assert isinstance(transactions, int), "Transactions should be an integer"
        
        print(f"✅ POS data: ${revenue} revenue, {transactions} transactions")
    
    def test_events_data(self):
        """Test that events data is present"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        # Check events object exists
        assert "events" in data, "Events object missing from response"
        events = data["events"]
        
        # Check required events fields
        assert "total" in events, "Events missing 'total' field"
        assert "upcoming" in events, "Events missing 'upcoming' field"
        
        print(f"✅ Events data: {events['total']} total events, {len(events['upcoming'])} upcoming")
    
    def test_forecasting_data(self):
        """Test that forecasting data is present"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        # Check forecasting object exists
        assert "forecasting" in data, "Forecasting object missing from response"
        forecasting = data["forecasting"]
        
        # Check required forecasting fields
        assert "accuracy" in forecasting, "Forecasting missing 'accuracy' field"
        
        accuracy = forecasting["accuracy"]
        assert 0 <= accuracy <= 100, f"Accuracy {accuracy} should be 0-100"
        
        print(f"✅ Forecasting data: {accuracy}% accuracy")
    
    def test_system_health_data(self):
        """Test that system health data is present"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        data = response.json()
        
        # Check system_health object exists
        assert "system_health" in data, "System health object missing from response"
        health = data["system_health"]
        
        # Check required health fields
        assert "engines_active" in health, "Health missing 'engines_active' field"
        assert "engines_total" in health, "Health missing 'engines_total' field"
        
        print(f"✅ System health: {health['engines_active']}/{health['engines_total']} engines active")


class TestWeatherEndpoint:
    """Tests for /api/weather endpoint"""
    
    def test_weather_endpoint_returns_200(self):
        """Test that weather endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/weather")
        assert response.status_code == 200
        print("✅ Weather endpoint returns 200")
    
    def test_weather_has_current_and_forecast(self):
        """Test that weather has current and forecast data"""
        response = requests.get(f"{BASE_URL}/api/weather")
        assert response.status_code == 200
        data = response.json()
        
        assert "current" in data, "Weather missing 'current' field"
        assert "forecast" in data, "Weather missing 'forecast' field"
        
        current = data["current"]
        assert "temp" in current, "Current weather missing 'temp'"
        assert "description" in current, "Current weather missing 'description'"
        assert "icon" in current, "Current weather missing 'icon'"
        
        print(f"✅ Weather: {current['temp']}°F, {current['description']}")


class TestHealthEndpoint:
    """Tests for /api/health endpoint"""
    
    def test_health_endpoint_returns_200(self):
        """Test that health endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Health endpoint returns 200")
    
    def test_health_shows_engines_active(self):
        """Test that health shows 10 engines active"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        
        assert "engines" in data, "Health missing 'engines' field"
        engines = data["engines"]
        
        # Count active engines (each engine has status "active")
        active_count = sum(1 for status in engines.values() if status == "active")
        
        # Should have 10 engines
        assert active_count == 10, f"Expected 10 active engines, got {active_count}"
        
        print(f"✅ Health: {active_count}/10 engines active")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
