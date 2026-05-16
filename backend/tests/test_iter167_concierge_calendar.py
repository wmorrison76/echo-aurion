"""
Iteration 167 — Backend Tests for:
1. Global Calendar day-detail endpoint
2. FOH Concierge Hub endpoints (local-places, area-events, in-house-schedule)

Tests verify response shapes, filtering, and data integrity.
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com")


class TestGlobalCalendarDayDetail:
    """Tests for GET /api/global-calendar/day-detail endpoint"""

    def test_day_detail_today_returns_200(self):
        """Day detail for today should return 200 with correct shape"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/global-calendar/day-detail?date={today}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=true"
        assert data.get("date") == today, f"Date should match {today}"
        
        # Verify totals structure
        totals = data.get("totals", {})
        expected_depts = ["events", "kitchen", "spa", "engineering", "housekeeping", "concierge", "reservations"]
        for dept in expected_depts:
            assert dept in totals, f"totals should contain {dept}"
            assert isinstance(totals[dept], int), f"totals[{dept}] should be int"
        
        # Verify grand_total
        assert "grand_total" in data, "Response should have grand_total"
        assert isinstance(data["grand_total"], int), "grand_total should be int"
        
        # Verify by_department structure
        by_dept = data.get("by_department", {})
        for dept in expected_depts:
            assert dept in by_dept, f"by_department should contain {dept}"
            assert isinstance(by_dept[dept], list), f"by_department[{dept}] should be list"

    def test_day_detail_future_date_returns_200(self):
        """Day detail for a future date should return 200 (likely empty)"""
        future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/global-calendar/day-detail?date={future}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("date") == future

    def test_day_detail_invalid_date_returns_400(self):
        """Invalid date format should return 400"""
        response = requests.get(f"{BASE_URL}/api/global-calendar/day-detail?date=invalid-date")
        
        assert response.status_code == 400, f"Expected 400 for invalid date, got {response.status_code}"

    def test_day_detail_missing_date_returns_422(self):
        """Missing date parameter should return 422"""
        response = requests.get(f"{BASE_URL}/api/global-calendar/day-detail")
        
        # FastAPI returns 422 for missing required query params
        assert response.status_code == 422, f"Expected 422 for missing date, got {response.status_code}"


class TestFOHConciergeLocalPlaces:
    """Tests for GET /api/foh-concierge/local-places endpoint"""

    def test_local_places_returns_10_curated(self):
        """Local places without filter should return 10 curated places"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/local-places")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("total") == 10, f"Expected 10 places, got {data.get('total')}"
        
        places = data.get("places", [])
        assert len(places) == 10, f"Expected 10 places in list, got {len(places)}"
        
        # Verify place structure
        for place in places:
            assert "id" in place, "Place should have id"
            assert "name" in place, "Place should have name"
            assert "category" in place, "Place should have category"
            assert "walk_min" in place, "Place should have walk_min"

    def test_local_places_filter_restaurant(self):
        """Filter by category=restaurant should return only restaurants (3 expected)"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/local-places?category=restaurant")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        
        places = data.get("places", [])
        assert data.get("total") == 3, f"Expected 3 restaurants, got {data.get('total')}"
        
        # Verify all are restaurants
        for place in places:
            assert place.get("category") == "restaurant", f"Expected restaurant, got {place.get('category')}"

    def test_local_places_filter_invalid_category(self):
        """Invalid category should return empty list"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/local-places?category=nonexistent")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("total") == 0, f"Expected 0 for invalid category, got {data.get('total')}"
        assert len(data.get("places", [])) == 0

    def test_local_places_filter_all_category(self):
        """category=all should return all places"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/local-places?category=all")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("total") == 10, f"Expected 10 for 'all' category, got {data.get('total')}"


class TestFOHConciergeAreaEvents:
    """Tests for GET /api/foh-concierge/area-events endpoint"""

    def test_area_events_default_7_days(self):
        """Default days=7 should return 7 events (day_offset 0..6)"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/area-events?days=7")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("days") == 7
        assert data.get("total") == 7, f"Expected 7 events, got {data.get('total')}"
        
        events = data.get("events", [])
        assert len(events) == 7
        
        # Verify day_offset range 0..6
        offsets = [e.get("day_offset") for e in events]
        for i in range(7):
            assert i in offsets, f"day_offset {i} should be present"
        
        # Verify event structure
        for event in events:
            assert "id" in event
            assert "title" in event
            assert "time" in event
            assert "where" in event
            assert "category" in event
            assert "date" in event  # Computed date

    def test_area_events_3_days(self):
        """days=3 should return only 3 events (day_offset 0..2)"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/area-events?days=3")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("days") == 3
        assert data.get("total") == 3, f"Expected 3 events, got {data.get('total')}"
        
        events = data.get("events", [])
        offsets = [e.get("day_offset") for e in events]
        
        # Should only have 0, 1, 2
        for offset in offsets:
            assert offset < 3, f"day_offset {offset} should be < 3"


class TestFOHConciergeInHouseSchedule:
    """Tests for GET /api/foh-concierge/in-house-schedule endpoint"""

    def test_in_house_schedule_7_days(self):
        """days=7 should return schedule with 7 date keys starting from today"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/in-house-schedule?days=7")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("days") == 7
        
        schedule = data.get("schedule", {})
        assert len(schedule) == 7, f"Expected 7 schedule keys, got {len(schedule)}"
        
        # Verify keys are valid ISO dates starting from today
        today = datetime.now().strftime("%Y-%m-%d")
        assert today in schedule, f"Today's date {today} should be in schedule"
        
        # Verify all keys are valid dates
        for date_key in schedule.keys():
            try:
                datetime.strptime(date_key, "%Y-%m-%d")
            except ValueError:
                pytest.fail(f"Invalid date key: {date_key}")
        
        # Verify totals structure
        totals = data.get("totals", {})
        assert len(totals) == 7, f"Expected 7 totals keys, got {len(totals)}"

    def test_in_house_schedule_3_days(self):
        """days=3 should return schedule with 3 date keys"""
        response = requests.get(f"{BASE_URL}/api/foh-concierge/in-house-schedule?days=3")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") is True
        assert data.get("days") == 3
        
        schedule = data.get("schedule", {})
        assert len(schedule) == 3, f"Expected 3 schedule keys, got {len(schedule)}"


class TestRegressionGoldenSeed:
    """Regression tests for Golden Seed endpoints (iter166)"""

    def test_seed_pillars_returns_200(self):
        """GET /api/seed/pillars should return 200"""
        response = requests.get(f"{BASE_URL}/api/seed/pillars")
        assert response.status_code == 200
        data = response.json()
        assert "pillars" in data

    def test_seed_manifest_returns_200(self):
        """GET /api/seed/manifest should return 200"""
        response = requests.get(f"{BASE_URL}/api/seed/manifest")
        assert response.status_code == 200

    def test_seed_spawns_without_token_returns_401(self):
        """GET /api/seed/spawns without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/seed/spawns")
        assert response.status_code == 401


class TestHealthAndRegression:
    """Basic health and regression tests"""

    def test_health_endpoint(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"

    def test_dashboard_endpoint(self):
        """Dashboard endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
