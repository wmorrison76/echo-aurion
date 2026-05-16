"""
Weather API Tests - Iteration 124
Tests for live OpenWeatherMap integration and demand impact endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')


class TestWeatherCurrentEndpoint:
    """Tests for /api/weather/current endpoint"""
    
    def test_weather_current_returns_200(self):
        """Test that current weather endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/weather/current")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/weather/current returns 200")
    
    def test_weather_current_has_live_source(self):
        """Test that current weather returns live OpenWeatherMap data"""
        response = requests.get(f"{BASE_URL}/api/weather/current")
        data = response.json()
        
        # Check source is openweathermap_live
        assert data.get("source") == "openweathermap_live", f"Expected source='openweathermap_live', got {data.get('source')}"
        print(f"✓ Source is openweathermap_live")
    
    def test_weather_current_has_required_fields(self):
        """Test that current weather has all required fields"""
        response = requests.get(f"{BASE_URL}/api/weather/current")
        data = response.json()
        
        # Check location
        assert "location" in data, "Missing 'location' field"
        assert data["location"]["name"] == "Fort Lauderdale, FL", f"Expected Fort Lauderdale, FL, got {data['location']['name']}"
        
        # Check current weather data
        assert "current" in data, "Missing 'current' field"
        current = data["current"]
        required_fields = ["temp", "feels_like", "humidity", "wind_speed", "condition"]
        for field in required_fields:
            assert field in current, f"Missing '{field}' in current weather"
        
        # Check condition has required subfields
        assert "main" in current["condition"], "Missing 'main' in condition"
        assert "description" in current["condition"], "Missing 'description' in condition"
        
        print(f"✓ Current weather has all required fields: temp={current['temp']}F, condition={current['condition']['main']}")


class TestWeatherForecastEndpoint:
    """Tests for /api/weather/forecast endpoint"""
    
    def test_weather_forecast_returns_200(self):
        """Test that forecast endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/weather/forecast?days=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/weather/forecast?days=5 returns 200")
    
    def test_weather_forecast_has_required_fields(self):
        """Test that forecast has temp_high, temp_low, rain_chance, condition"""
        response = requests.get(f"{BASE_URL}/api/weather/forecast?days=5")
        data = response.json()
        
        assert "forecast" in data, "Missing 'forecast' field"
        assert len(data["forecast"]) > 0, "Forecast array is empty"
        
        # Check first day has required fields
        day = data["forecast"][0]
        required_fields = ["temp_high", "temp_low", "rain_chance", "condition", "date", "day_name"]
        for field in required_fields:
            assert field in day, f"Missing '{field}' in forecast day"
        
        # Validate data types
        assert isinstance(day["temp_high"], (int, float)), "temp_high should be numeric"
        assert isinstance(day["temp_low"], (int, float)), "temp_low should be numeric"
        assert isinstance(day["rain_chance"], (int, float)), "rain_chance should be numeric"
        assert "main" in day["condition"], "condition should have 'main' field"
        
        print(f"✓ Forecast has required fields: {day['date']} - High: {day['temp_high']}F, Low: {day['temp_low']}F, Rain: {day['rain_chance']}%")
    
    def test_weather_forecast_returns_correct_days(self):
        """Test that forecast returns requested number of days"""
        response = requests.get(f"{BASE_URL}/api/weather/forecast?days=5")
        data = response.json()
        
        assert data.get("days") <= 5, f"Expected at most 5 days, got {data.get('days')}"
        assert len(data["forecast"]) <= 5, f"Expected at most 5 forecast entries"
        print(f"✓ Forecast returns {len(data['forecast'])} days as requested")


class TestWeatherDemandImpactEndpoint:
    """Tests for /api/weather/demand-impact endpoint"""
    
    def test_demand_impact_returns_200(self):
        """Test that demand-impact endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/weather/demand-impact?days=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/weather/demand-impact returns 200")
    
    def test_demand_impact_has_required_fields(self):
        """Test that demand-impact returns covers_modifier, menu_recommendation, beverage_recommendation, pool_bar_open"""
        response = requests.get(f"{BASE_URL}/api/weather/demand-impact?days=5")
        data = response.json()
        
        assert "impacts" in data, "Missing 'impacts' field"
        assert len(data["impacts"]) > 0, "Impacts array is empty"
        
        # Check first impact has required fields
        impact = data["impacts"][0]
        required_fields = ["covers_modifier", "menu_recommendation", "beverage_recommendation", "pool_bar_open"]
        for field in required_fields:
            assert field in impact, f"Missing '{field}' in demand impact"
        
        # Validate covers_modifier is a reasonable value
        assert 0.5 <= impact["covers_modifier"] <= 1.5, f"covers_modifier {impact['covers_modifier']} out of expected range"
        
        # Validate pool_bar_open is boolean
        assert isinstance(impact["pool_bar_open"], bool), "pool_bar_open should be boolean"
        
        print(f"✓ Demand impact has required fields: covers_modifier={impact['covers_modifier']}, pool_bar_open={impact['pool_bar_open']}")
    
    def test_demand_impact_has_avg_modifier(self):
        """Test that demand-impact returns avg_covers_modifier"""
        response = requests.get(f"{BASE_URL}/api/weather/demand-impact?days=5")
        data = response.json()
        
        assert "avg_covers_modifier" in data, "Missing 'avg_covers_modifier' field"
        assert isinstance(data["avg_covers_modifier"], (int, float)), "avg_covers_modifier should be numeric"
        print(f"✓ Average covers modifier: {data['avg_covers_modifier']}")


class TestWeatherOpsForecastOverlayEndpoint:
    """Tests for /api/weather/ops-forecast-overlay endpoint"""
    
    def test_ops_forecast_overlay_returns_200(self):
        """Test that ops-forecast-overlay endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/weather/ops-forecast-overlay")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/weather/ops-forecast-overlay returns 200")
    
    def test_ops_forecast_overlay_has_weather_by_date(self):
        """Test that ops-forecast-overlay returns weather_by_date keyed by date string"""
        response = requests.get(f"{BASE_URL}/api/weather/ops-forecast-overlay")
        data = response.json()
        
        assert "weather_by_date" in data, "Missing 'weather_by_date' field"
        assert isinstance(data["weather_by_date"], dict), "weather_by_date should be a dict"
        
        # Check that keys are date strings
        for date_key in data["weather_by_date"].keys():
            assert len(date_key) == 10, f"Date key '{date_key}' should be YYYY-MM-DD format"
            assert date_key[4] == "-" and date_key[7] == "-", f"Date key '{date_key}' should be YYYY-MM-DD format"
        
        print(f"✓ weather_by_date has {len(data['weather_by_date'])} dates")
    
    def test_ops_forecast_overlay_has_all_impact_fields(self):
        """Test that each date entry has all required impact fields"""
        response = requests.get(f"{BASE_URL}/api/weather/ops-forecast-overlay")
        data = response.json()
        
        weather_by_date = data.get("weather_by_date", {})
        assert len(weather_by_date) > 0, "weather_by_date is empty"
        
        # Check first date entry
        first_date = list(weather_by_date.keys())[0]
        entry = weather_by_date[first_date]
        
        required_fields = [
            "condition", "icon", "temp_high", "temp_low", "rain_chance",
            "covers_modifier", "outdoor_dining_pct", "indoor_dining_pct",
            "menu_recommendation", "beverage_recommendation", "pool_bar_open", "patio_service"
        ]
        
        for field in required_fields:
            assert field in entry, f"Missing '{field}' in weather_by_date entry"
        
        print(f"✓ Weather overlay entry for {first_date}: {entry['condition']}, {entry['temp_high']}F, Rain: {entry['rain_chance']}%, Covers: x{entry['covers_modifier']}")
    
    def test_ops_forecast_overlay_has_available_dates(self):
        """Test that ops-forecast-overlay returns available_dates array"""
        response = requests.get(f"{BASE_URL}/api/weather/ops-forecast-overlay")
        data = response.json()
        
        assert "available_dates" in data, "Missing 'available_dates' field"
        assert isinstance(data["available_dates"], list), "available_dates should be a list"
        assert len(data["available_dates"]) > 0, "available_dates is empty"
        
        print(f"✓ Available dates: {data['available_dates'][:3]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
