"""
Iteration 36 - Cafeteria & Employee Dining Module Tests
Tests all cafeteria endpoints: overview, locations, meal-periods, menus, transactions, waste, kpis
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')

# Valid mode IDs from KB
VALID_MODES = [
    "k12_school_cafeteria",
    "higher_ed_dining",
    "employee_dining_staff_cafeteria",
    "healthcare_staff_retail",
    "luxury_resort_employee_dining"
]

class TestCafeteriaOverview:
    """Test GET /api/cafeteria/overview"""
    
    def test_overview_returns_kb_loaded(self):
        """Overview should return kb_loaded=true with 5 modes"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/overview")
        assert response.status_code == 200
        data = response.json()
        
        # Verify kb_loaded
        assert data.get("kb_loaded") == True, "KB should be loaded"
        
        # Verify 5 modes
        assert data.get("total_modes") == 5, f"Expected 5 modes, got {data.get('total_modes')}"
        
        # Verify available_modes structure
        modes = data.get("available_modes", [])
        assert len(modes) == 5, f"Expected 5 available modes, got {len(modes)}"
        
        for mode in modes:
            assert "mode_id" in mode, "Mode should have mode_id"
            assert "name" in mode, "Mode should have name"
            assert "objectives" in mode, "Mode should have objectives"
            assert "metrics" in mode, "Mode should have metrics"
            assert mode["mode_id"] in VALID_MODES, f"Invalid mode_id: {mode['mode_id']}"
    
    def test_overview_returns_locations_list(self):
        """Overview should return locations list"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/overview")
        assert response.status_code == 200
        data = response.json()
        
        assert "locations" in data, "Should have locations field"
        assert isinstance(data["locations"], list), "Locations should be a list"
        assert "total_locations" in data, "Should have total_locations"
        assert "total_seat_capacity" in data, "Should have total_seat_capacity"
    
    def test_overview_returns_today_stats(self):
        """Overview should return today's transaction stats"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/overview")
        assert response.status_code == 200
        data = response.json()
        
        assert "today_transactions" in data, "Should have today_transactions"
        assert "today_revenue" in data, "Should have today_revenue"
        assert isinstance(data["today_transactions"], int), "today_transactions should be int"
        assert isinstance(data["today_revenue"], (int, float)), "today_revenue should be numeric"


class TestCafeteriaLocations:
    """Test /api/cafeteria/locations endpoints"""
    
    def test_list_locations(self):
        """GET /api/cafeteria/locations should return locations list"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/locations")
        assert response.status_code == 200
        data = response.json()
        
        assert "locations" in data, "Should have locations field"
        assert "total" in data, "Should have total field"
        assert isinstance(data["locations"], list), "Locations should be a list"
    
    def test_create_location_valid_mode(self):
        """POST /api/cafeteria/locations with valid mode_id should succeed"""
        payload = {
            "name": "TEST_Cafeteria Location",
            "mode_id": "employee_dining_staff_cafeteria",
            "building": "Test Building",
            "floor": "1",
            "seat_capacity": 150,
            "operating_hours": "07:00-19:00"
        }
        response = requests.post(f"{BASE_URL}/api/cafeteria/locations", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "location_id" in data, "Should have location_id"
        assert data["name"] == payload["name"], "Name should match"
        assert data["mode_id"] == payload["mode_id"], "mode_id should match"
        assert "mode_name" in data, "Should have mode_name"
        assert data["mode_name"] == "Employee Dining / Staff Cafeteria", f"mode_name should be 'Employee Dining / Staff Cafeteria', got {data['mode_name']}"
        assert "kpis" in data, "Should have kpis"
        assert isinstance(data["kpis"], dict), "kpis should be a dict"
        
        # Store location_id for cleanup
        self.__class__.created_location_id = data["location_id"]
    
    def test_create_location_invalid_mode(self):
        """POST /api/cafeteria/locations with invalid mode_id should return 400"""
        payload = {
            "name": "TEST_Invalid Mode Location",
            "mode_id": "invalid_mode_xyz",
            "building": "Test Building",
            "seat_capacity": 100
        }
        response = requests.post(f"{BASE_URL}/api/cafeteria/locations", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid mode, got {response.status_code}"
    
    def test_created_location_appears_in_list(self):
        """Verify created location appears in GET /api/cafeteria/locations"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/locations")
        assert response.status_code == 200
        data = response.json()
        
        location_ids = [loc["location_id"] for loc in data["locations"]]
        assert hasattr(self.__class__, 'created_location_id'), "No location was created in previous test"
        assert self.__class__.created_location_id in location_ids, "Created location should appear in list"


class TestCafeteriaMealPeriods:
    """Test /api/cafeteria/meal-periods endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid location_id for testing"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/locations")
        if response.status_code == 200:
            locations = response.json().get("locations", [])
            if locations:
                self.location_id = locations[0]["location_id"]
            else:
                pytest.skip("No locations available for meal period tests")
        else:
            pytest.skip("Could not fetch locations")
    
    def test_create_meal_period(self):
        """POST /api/cafeteria/meal-periods should create a meal period"""
        payload = {
            "location_id": self.location_id,
            "period_name": "lunch",
            "start_time": "11:30",
            "end_time": "14:00",
            "max_covers": 250,
            "subsidy_per_meal": 5.50
        }
        response = requests.post(f"{BASE_URL}/api/cafeteria/meal-periods", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "period_id" in data, "Should have period_id"
        assert data["location_id"] == self.location_id, "location_id should match"
        assert data["period_name"] == "lunch", "period_name should match"
        assert data["max_covers"] == 250, "max_covers should match"
        
        self.__class__.created_period_id = data["period_id"]
    
    def test_list_meal_periods(self):
        """GET /api/cafeteria/meal-periods should return periods list"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/meal-periods")
        assert response.status_code == 200
        data = response.json()
        
        assert "meal_periods" in data, "Should have meal_periods field"
        assert "total" in data, "Should have total field"
    
    def test_list_meal_periods_with_location_filter(self):
        """GET /api/cafeteria/meal-periods?location_id=X should filter by location"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/meal-periods?location_id={self.location_id}")
        assert response.status_code == 200
        data = response.json()
        
        # All returned periods should have the filtered location_id
        for period in data.get("meal_periods", []):
            assert period["location_id"] == self.location_id, "All periods should match location_id filter"


class TestCafeteriaMenus:
    """Test /api/cafeteria/menus endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid location_id for testing"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/locations")
        if response.status_code == 200:
            locations = response.json().get("locations", [])
            if locations:
                self.location_id = locations[0]["location_id"]
            else:
                pytest.skip("No locations available for menu tests")
        else:
            pytest.skip("Could not fetch locations")
    
    def test_create_menu_with_items(self):
        """POST /api/cafeteria/menus should create a cycle menu with items"""
        payload = {
            "location_id": self.location_id,
            "cycle_name": "TEST_Week 1",
            "items": [
                {"name": "Grilled Chicken", "category": "entree", "price": 8.50},
                {"name": "Caesar Salad", "category": "salad", "price": 5.00},
                {"name": "Soup of the Day", "category": "soup", "price": 3.50}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/cafeteria/menus", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "menu_id" in data, "Should have menu_id"
        assert data["cycle_name"] == "TEST_Week 1", "cycle_name should match"
        assert len(data["items"]) == 3, "Should have 3 items"
        
        self.__class__.created_menu_id = data["menu_id"]
    
    def test_list_menus(self):
        """GET /api/cafeteria/menus should return menus list"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/menus")
        assert response.status_code == 200
        data = response.json()
        
        assert "menus" in data, "Should have menus field"
        assert "total" in data, "Should have total field"
    
    def test_list_menus_with_location_filter(self):
        """GET /api/cafeteria/menus?location_id=X should filter by location"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/menus?location_id={self.location_id}")
        assert response.status_code == 200
        data = response.json()
        
        for menu in data.get("menus", []):
            assert menu["location_id"] == self.location_id, "All menus should match location_id filter"


class TestCafeteriaTransactions:
    """Test /api/cafeteria/transactions endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid location_id for testing"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/locations")
        if response.status_code == 200:
            locations = response.json().get("locations", [])
            if locations:
                self.location_id = locations[0]["location_id"]
            else:
                pytest.skip("No locations available for transaction tests")
        else:
            pytest.skip("Could not fetch locations")
    
    def test_record_transaction(self):
        """POST /api/cafeteria/transactions should record a transaction"""
        payload = {
            "location_id": self.location_id,
            "employee_id": "TEST_EMP001",
            "items": [{"name": "Lunch Special", "price": 8.50}],
            "total": 8.50,
            "payment_method": "subsidy"
        }
        response = requests.post(f"{BASE_URL}/api/cafeteria/transactions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "tx_id" in data, "Should have tx_id"
        assert data["location_id"] == self.location_id, "location_id should match"
        assert data["total"] == 8.50, "total should match"
        assert data["payment_method"] == "subsidy", "payment_method should match"
        assert "date" in data, "Should have date"
    
    def test_transaction_summary(self):
        """GET /api/cafeteria/transactions/summary should return totals and breakdown"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/transactions/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data, "Should have date"
        assert "total_transactions" in data, "Should have total_transactions"
        assert "total_revenue" in data, "Should have total_revenue"
        assert "by_payment_method" in data, "Should have by_payment_method"
        assert "avg_ticket" in data, "Should have avg_ticket"
    
    def test_transaction_summary_with_location_filter(self):
        """GET /api/cafeteria/transactions/summary?location_id=X should filter by location"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/transactions/summary?location_id={self.location_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["location_id"] == self.location_id, "location_id should match filter"


class TestCafeteriaWaste:
    """Test /api/cafeteria/waste endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid location_id for testing"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/locations")
        if response.status_code == 200:
            locations = response.json().get("locations", [])
            if locations:
                self.location_id = locations[0]["location_id"]
            else:
                pytest.skip("No locations available for waste tests")
        else:
            pytest.skip("Could not fetch locations")
    
    def test_log_waste(self):
        """POST /api/cafeteria/waste should log a waste entry"""
        payload = {
            "location_id": self.location_id,
            "item_name": "TEST_Leftover Pasta",
            "quantity_lbs": 2.5,
            "reason": "overproduction"
        }
        response = requests.post(f"{BASE_URL}/api/cafeteria/waste", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "waste_id" in data, "Should have waste_id"
        assert data["item_name"] == "TEST_Leftover Pasta", "item_name should match"
        assert data["quantity_lbs"] == 2.5, "quantity_lbs should match"
        assert data["reason"] == "overproduction", "reason should match"
    
    def test_waste_summary(self):
        """GET /api/cafeteria/waste/summary should return waste totals by reason"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/waste/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_waste_lbs" in data, "Should have total_waste_lbs"
        assert "total_entries" in data, "Should have total_entries"
        assert "by_reason" in data, "Should have by_reason"
        assert "avg_per_entry" in data, "Should have avg_per_entry"
        assert isinstance(data["by_reason"], dict), "by_reason should be a dict"
    
    def test_waste_summary_with_location_filter(self):
        """GET /api/cafeteria/waste/summary?location_id=X should filter by location"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/waste/summary?location_id={self.location_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Should return valid summary structure
        assert "total_waste_lbs" in data
        assert "by_reason" in data


class TestCafeteriaKPIs:
    """Test /api/cafeteria/kpis/{location_id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get a valid location_id for testing"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/locations")
        if response.status_code == 200:
            locations = response.json().get("locations", [])
            if locations:
                self.location_id = locations[0]["location_id"]
                self.location_name = locations[0]["name"]
                self.mode_name = locations[0].get("mode_name", "")
            else:
                pytest.skip("No locations available for KPI tests")
        else:
            pytest.skip("Could not fetch locations")
    
    def test_kpis_returns_mode_specific_data(self):
        """GET /api/cafeteria/kpis/{location_id} should return mode-specific KPIs"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/kpis/{self.location_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify basic fields
        assert data["location"] == self.location_name, "location should match"
        assert "mode" in data, "Should have mode"
        assert "date" in data, "Should have date"
        
        # Verify KPI metrics
        assert "meals_served" in data, "Should have meals_served"
        assert "revenue" in data, "Should have revenue"
        assert "cost_per_meal" in data, "Should have cost_per_meal"
        assert "waste_lbs" in data, "Should have waste_lbs"
        assert "waste_per_meal" in data, "Should have waste_per_meal"
        assert "participation_rate" in data, "Should have participation_rate"
        assert "subsidy_rate" in data, "Should have subsidy_rate"
        assert "seat_utilization" in data, "Should have seat_utilization"
        
        # Verify mode-specific objectives and metrics
        assert "mode_objectives" in data, "Should have mode_objectives"
        assert "mode_metrics" in data, "Should have mode_metrics"
        assert isinstance(data["mode_objectives"], list), "mode_objectives should be a list"
        assert isinstance(data["mode_metrics"], list), "mode_metrics should be a list"
    
    def test_kpis_nonexistent_location_returns_404(self):
        """GET /api/cafeteria/kpis/{invalid_id} should return 404"""
        response = requests.get(f"{BASE_URL}/api/cafeteria/kpis/nonexistent-location-xyz")
        assert response.status_code == 404, f"Expected 404 for nonexistent location, got {response.status_code}"


class TestCrossPropertyDashboard:
    """Verify cross-property dashboard still works (regression test from iteration 35)"""
    
    def test_cross_property_dashboard_endpoint(self):
        """GET /api/admin/cross-property-dashboard should still work"""
        response = requests.get(f"{BASE_URL}/api/admin/cross-property-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have enabled field
        assert "enabled" in data, "Should have enabled field"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
