"""
Iteration 88: Forecast Accuracy Tracking System Tests
======================================================
Tests for the new forecast accuracy tracking system added to forecast_21day.py:
- POST /api/forecast-21/accuracy/snapshot - Capture daily forecast snapshot
- POST /api/forecast-21/accuracy/record-actual - Record actual data for a date
- GET /api/forecast-21/accuracy/report - Accuracy metrics with MAPE, grade, weekly, by_horizon
- GET /api/forecast-21/accuracy/trend - Snapshot count, actuals count, tracking_active

Also verifies:
- De-duplication: forecast_21day.py (operational) vs echo_stratus_forecast.py (financial) are distinct
- Existing 21-day forecast endpoints still work
- Regression tests for other APIs
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestForecastAccuracyTracking:
    """Tests for the new forecast accuracy tracking system"""
    
    def test_accuracy_snapshot_creates_snapshot(self):
        """POST /api/forecast-21/accuracy/snapshot captures 21-day forecast snapshot"""
        response = requests.post(f"{BASE_URL}/api/forecast-21/accuracy/snapshot")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "snapshot_id" in data
        assert data["snapshot_id"].startswith("snap-")
        assert "captured" in data
        assert "days_captured" in data
        assert data["days_captured"] == 21
        print(f"Snapshot created: {data['snapshot_id']} for {data['captured']}")
    
    def test_accuracy_record_actual_records_data(self):
        """POST /api/forecast-21/accuracy/record-actual records actual data from MongoDB"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.post(
            f"{BASE_URL}/api/forecast-21/accuracy/record-actual",
            json={"date": yesterday}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["id"].startswith("act-")
        assert "date" in data
        assert data["date"] == yesterday
        assert "actual_occupancy" in data
        assert "actual_rooms" in data
        assert "actual_revenue" in data
        assert "actual_ird_orders" in data
        assert "recorded_at" in data
        assert "sources" in data
        
        # Verify sources breakdown
        sources = data["sources"]
        assert "ird" in sources
        assert "minibar" in sources
        assert "spa" in sources
        assert "retail" in sources
        assert "rooms" in sources
        print(f"Actual recorded for {yesterday}: occupancy={data['actual_occupancy']}%, revenue=${data['actual_revenue']}")
    
    def test_accuracy_report_returns_metrics(self):
        """GET /api/forecast-21/accuracy/report returns accuracy metrics with MAPE, grade, weekly, by_horizon"""
        response = requests.get(f"{BASE_URL}/api/forecast-21/accuracy/report")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "period" in data
        assert "total_comparisons" in data
        assert "overall" in data
        assert "weekly" in data
        assert "by_horizon" in data
        assert "comparisons" in data
        assert "message" in data
        
        # Verify overall structure
        overall = data["overall"]
        assert "occupancy_mape" in overall
        assert "revenue_mape" in overall
        assert "grade" in overall
        
        # Verify by_horizon structure (1-3, 4-7, 8-14, 15-21 days)
        by_horizon = data["by_horizon"]
        assert len(by_horizon) == 4
        horizons = [h["horizon"] for h in by_horizon]
        assert "1-3 days" in horizons
        assert "4-7 days" in horizons
        assert "8-14 days" in horizons
        assert "15-21 days" in horizons
        
        for h in by_horizon:
            assert "occupancy_mape" in h
            assert "revenue_mape" in h
            assert "samples" in h
        
        print(f"Accuracy report: {data['total_comparisons']} comparisons, grade={overall['grade']}")
    
    def test_accuracy_report_grade_system(self):
        """Verify accuracy report grades: A (<5%), B (<10%), C (<15%), D (>15%)"""
        response = requests.get(f"{BASE_URL}/api/forecast-21/accuracy/report")
        assert response.status_code == 200
        data = response.json()
        
        # Grade should be one of A, B, C, D, or N/A (if no comparisons)
        grade = data["overall"]["grade"]
        assert grade in ["A", "B", "C", "D", "N/A"]
        print(f"Current accuracy grade: {grade}")
    
    def test_accuracy_trend_returns_tracking_status(self):
        """GET /api/forecast-21/accuracy/trend returns snapshot count, actuals count, tracking_active"""
        response = requests.get(f"{BASE_URL}/api/forecast-21/accuracy/trend")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "snapshots_captured" in data
        assert "actuals_recorded" in data
        assert "latest_snapshot" in data
        assert "tracking_active" in data
        assert "message" in data
        
        # Verify types
        assert isinstance(data["snapshots_captured"], int)
        assert isinstance(data["actuals_recorded"], int)
        assert isinstance(data["tracking_active"], bool)
        
        print(f"Trend: {data['snapshots_captured']} snapshots, {data['actuals_recorded']} actuals, active={data['tracking_active']}")


class TestForecastDeduplication:
    """Verify forecast_21day.py (operational) and echo_stratus_forecast.py (financial) are distinct"""
    
    def test_21day_forecast_is_operational(self):
        """GET /api/forecast-21/forecast returns operational scheduling forecast"""
        response = requests.get(f"{BASE_URL}/api/forecast-21/forecast")
        assert response.status_code == 200
        data = response.json()
        
        # Verify it's the operational forecast
        assert data.get("data_source") == "live_mongodb"
        assert len(data.get("forecast", [])) == 21
        
        # Verify operational features: hourly staffing, coverage graphs
        day = data["forecast"][0]
        assert "outlets" in day
        assert "labor" in day
        assert "covers" in day
        
        # Verify hourly flow data for scheduling
        for outlet_id, outlet_data in day["outlets"].items():
            assert "hourly_flow" in outlet_data
            assert "staff_needed" in outlet_data.get("hourly_flow", {}).get(list(outlet_data.get("hourly_flow", {}).keys())[0] if outlet_data.get("hourly_flow") else 0, {})
        
        print("21-day forecast confirmed as OPERATIONAL (scheduling, hourly staffing)")
    
    def test_echo_stratus_forecast_is_financial(self):
        """POST /api/echo-stratus/forecast returns financial forecast"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/forecast",
            json={"horizon": "30d"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify it's the financial forecast
        assert data.get("horizon") == "30d"
        assert "periods" in data
        assert "summary" in data
        
        # Verify financial features: revenue, costs, margins, confidence bands
        summary = data["summary"]
        assert "total_forecast_revenue" in summary
        assert "total_forecast_cost" in summary
        assert "total_forecast_profit" in summary
        assert "avg_margin_pct" in summary
        assert "avg_confidence" in summary
        
        # Verify period has financial metrics
        period = data["periods"][0]
        assert "revenue" in period
        assert "food_cost" in period
        assert "labor_cost" in period
        assert "net_profit" in period
        assert "margin_pct" in period
        assert "confidence_band_low" in period
        assert "confidence_band_high" in period
        
        print("Echo Stratus forecast confirmed as FINANCIAL (revenue, margins, multi-horizon)")
    
    def test_forecasts_serve_different_purposes(self):
        """Verify the two forecasts have different structures and purposes"""
        # Get 21-day operational forecast
        op_response = requests.get(f"{BASE_URL}/api/forecast-21/forecast")
        op_data = op_response.json()
        
        # Get financial forecast
        fin_response = requests.post(
            f"{BASE_URL}/api/echo-stratus/forecast",
            json={"horizon": "30d"}
        )
        fin_data = fin_response.json()
        
        # Operational has: outlets, hourly_flow, staff_needed, surface_3d
        assert "outlets" in op_data["forecast"][0]
        assert "surface_3d" in op_data
        assert "ai_insights" in op_data
        
        # Financial has: confidence_band, margin_pct, engines_used
        assert "engines_used" in fin_data
        assert "confidence_band_low" in fin_data["periods"][0]
        assert "pipeline_estimated_revenue" in fin_data["summary"]
        
        print("Confirmed: Two forecasts serve DIFFERENT purposes (operational vs financial)")


class TestExisting21DayForecastEndpoints:
    """Verify existing 21-day forecast endpoints still work"""
    
    def test_forecast_returns_21_days(self):
        """GET /api/forecast-21/forecast still returns 21 days of forecast data"""
        response = requests.get(f"{BASE_URL}/api/forecast-21/forecast")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data.get("forecast", [])) == 21
        assert "summary" in data
        assert "ai_insights" in data
        assert "surface_3d" in data
        print(f"21-day forecast: {len(data['forecast'])} days, revenue=${data['summary']['total_revenue']:,.2f}")
    
    def test_notes_endpoint_creates_note(self):
        """POST /api/forecast-21/notes still creates AI-readable notes"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = requests.post(
            f"{BASE_URL}/api/forecast-21/notes",
            json={
                "date": tomorrow,
                "outlet": "restaurant",
                "note": "TEST_iter88 - VIP group expected",
                "author": "Test Manager",
                "ai_directive": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["id"].startswith("fn-")
        assert data["date"] == tomorrow
        assert data["note"] == "TEST_iter88 - VIP group expected"
        print(f"Note created: {data['id']}")
    
    def test_notes_endpoint_lists_notes(self):
        """GET /api/forecast-21/notes returns saved notes"""
        response = requests.get(f"{BASE_URL}/api/forecast-21/notes")
        assert response.status_code == 200
        data = response.json()
        
        assert "notes" in data
        assert isinstance(data["notes"], list)
        print(f"Notes count: {len(data['notes'])}")
    
    def test_day_detail_endpoint(self):
        """GET /api/forecast-21/forecast/day/{date} returns day detail"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/forecast-21/forecast/day/{today}")
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data
        assert "day_of_week" in data
        assert "occupancy" in data
        assert "revenue" in data
        assert "outlets" in data
        print(f"Day detail for {today}: {data['day_of_week']}, occupancy={data['occupancy']['forecast_pct']}%")
    
    def test_coverage_endpoint(self):
        """GET /api/forecast-21/coverage/{outlet}/{date} returns hourly coverage"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/forecast-21/coverage/restaurant/{today}")
        assert response.status_code == 200
        data = response.json()
        
        assert "outlet" in data
        assert data["outlet"] == "restaurant"
        assert "coverage" in data
        assert len(data["coverage"]) > 0
        
        # Verify coverage has status
        for hour in data["coverage"]:
            assert "status" in hour
            assert hour["status"] in ["optimal", "understaffed", "overstaffed"]
        print(f"Coverage for restaurant: {len(data['coverage'])} hours")


class TestRegressionOtherAPIs:
    """Regression tests for other APIs"""
    
    def test_gm_flash_report(self):
        """GET /api/daily-reports/gm-flash still returns live data"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/gm-flash")
        assert response.status_code == 200
        data = response.json()
        
        assert "report_date" in data
        assert "data_source" in data
        assert "yesterday" in data
        assert "mtd" in data
        print("GM Flash report: OK")
    
    def test_chef_daily_report(self):
        """GET /api/daily-reports/chef-daily still returns live data"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        assert response.status_code == 200
        data = response.json()
        
        assert "report_date" in data
        assert "data_source" in data
        assert "covers" in data
        assert "costs" in data
        print("Chef Daily report: OK")
    
    def test_guest_intel_dashboard(self):
        """GET /api/guest-intel/dashboard still works"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "kpis" in data or "top_guests" in data
        print("Guest Intel dashboard: OK")
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("status") == "healthy"
        print("Health endpoint: OK")


class TestGuestOrdering:
    """Test guest ordering still works"""
    
    def test_guest_auth(self):
        """Guest ordering auth with Room 412, Last name: Smith"""
        response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("authenticated") == True
        assert "token" in data
        print(f"Guest auth: OK, token={data['token']}")
    
    def test_guest_menu(self):
        """Guest menu endpoint works"""
        response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert response.status_code == 200
        data = response.json()
        
        assert "menu" in data or "current_period" in data
        print(f"Guest menu: OK, period={data.get('current_period', {}).get('label', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
