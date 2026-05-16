"""
Iteration 79: Kitchen Routing Module + Seasonal Templates + PWA Service Worker
==============================================================================
Tests for:
1. Kitchen Routing APIs - stations, printers, outlets, dashboard
2. Seasonal Templates - 6 holiday presets (valentines, new_years, thanksgiving, christmas, summer, mothers_day)
3. PWA Service Worker - offline sync endpoints cached
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKitchenRoutingDashboard:
    """Kitchen Routing Dashboard API tests"""
    
    def test_dashboard_returns_kpis(self):
        """GET /api/kitchen-routing/dashboard returns KPIs with 8 stations, 5 printers, 1 outlet"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data
        kpis = data["kpis"]
        assert kpis["total_stations"] == 8, f"Expected 8 stations, got {kpis['total_stations']}"
        assert kpis["total_printers"] == 5, f"Expected 5 printers, got {kpis['total_printers']}"
        assert kpis["total_outlets"] == 1, f"Expected 1 outlet, got {kpis['total_outlets']}"
        assert "online_printers" in kpis
        
        # Verify stations and printers arrays
        assert "stations" in data
        assert "printers" in data
        assert "outlets" in data
        assert len(data["stations"]) == 8
        assert len(data["printers"]) == 5


class TestKitchenRoutingStations:
    """Kitchen Routing Stations API tests"""
    
    def test_list_stations(self):
        """GET /api/kitchen-routing/stations returns 8 stations with names and colors"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/stations")
        assert response.status_code == 200
        data = response.json()
        
        assert "stations" in data
        stations = data["stations"]
        assert len(stations) == 8, f"Expected 8 stations, got {len(stations)}"
        
        # Verify station structure
        station_names = [s["name"] for s in stations]
        expected_stations = ["Grill Station", "Sauté Station", "Garde Manger", "Pastry Station", 
                           "Fry Station", "Expo Window", "Pizza Oven", "Banquet Prep"]
        for expected in expected_stations:
            assert expected in station_names, f"Missing station: {expected}"
        
        # Verify each station has required fields
        for station in stations:
            assert "id" in station
            assert "name" in station
            assert "color" in station
            assert "description" in station
            assert "default_printers" in station
    
    def test_create_station(self):
        """POST /api/kitchen-routing/stations creates a new station"""
        new_station = {
            "name": "TEST_Dessert Station",
            "description": "Test station for desserts",
            "color": "#ec4899",
            "outlet_id": "default",
            "default_printers": ["ptr-02"],
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/kitchen-routing/stations", json=new_station)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "TEST_Dessert Station"
        assert data["color"] == "#ec4899"
        assert "id" in data
        assert data["id"].startswith("stn-")
        
        # Cleanup - delete the test station
        station_id = data["id"]
        requests.delete(f"{BASE_URL}/api/kitchen-routing/stations/{station_id}")


class TestKitchenRoutingPrinters:
    """Kitchen Routing Printers API tests"""
    
    def test_list_printers(self):
        """GET /api/kitchen-routing/printers returns 5 printers with IP addresses and technology"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/printers")
        assert response.status_code == 200
        data = response.json()
        
        assert "printers" in data
        printers = data["printers"]
        assert len(printers) == 5, f"Expected 5 printers, got {len(printers)}"
        
        # Verify printer structure
        printer_names = [p["name"] for p in printers]
        expected_printers = ["KDS-Hot Line", "KDS-Cold/Pastry", "KDS-Expo", "Label Printer", "Bar Printer"]
        for expected in expected_printers:
            assert expected in printer_names, f"Missing printer: {expected}"
        
        # Verify each printer has required fields
        for printer in printers:
            assert "id" in printer
            assert "name" in printer
            assert "ip_address" in printer
            assert "technology" in printer
            assert printer["technology"] in ["thermal", "impact", "laser"]
    
    def test_printers_have_ip_addresses(self):
        """Verify all printers have valid IP addresses"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/printers")
        data = response.json()
        
        expected_ips = {
            "KDS-Hot Line": "192.168.1.101",
            "KDS-Cold/Pastry": "192.168.1.102",
            "KDS-Expo": "192.168.1.103",
            "Label Printer": "192.168.1.104",
            "Bar Printer": "192.168.1.105"
        }
        
        for printer in data["printers"]:
            if printer["name"] in expected_ips:
                assert printer["ip_address"] == expected_ips[printer["name"]]
    
    def test_create_printer(self):
        """POST /api/kitchen-routing/printers creates a new printer"""
        new_printer = {
            "name": "TEST_Backup Printer",
            "technology": "thermal",
            "location": "Kitchen Backup",
            "ip_address": "192.168.1.199",
            "recommended_use": "Backup printing",
            "description": "Test backup printer",
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/kitchen-routing/printers", json=new_printer)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "TEST_Backup Printer"
        assert data["ip_address"] == "192.168.1.199"
        assert "id" in data
        assert data["id"].startswith("ptr-")
        
        # Cleanup
        printer_id = data["id"]
        requests.delete(f"{BASE_URL}/api/kitchen-routing/printers/{printer_id}")


class TestKitchenRoutingOutlets:
    """Kitchen Routing Outlets API tests"""
    
    def test_list_outlets(self):
        """GET /api/kitchen-routing/outlets returns outlet routing with station/printer mapping"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/outlets")
        assert response.status_code == 200
        data = response.json()
        
        assert "outlets" in data
        outlets = data["outlets"]
        assert len(outlets) >= 1, "Expected at least 1 outlet"
        
        # Verify outlet structure
        outlet = outlets[0]
        assert "outlet_id" in outlet
        assert "outlet_name" in outlet
        assert "stations" in outlet
        assert "printers" in outlet
    
    def test_get_default_outlet(self):
        """GET /api/kitchen-routing/outlets/default returns Main Kitchen with station/printer details"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/outlets/default")
        assert response.status_code == 200
        data = response.json()
        
        assert data["outlet_name"] == "Main Kitchen"
        assert data["outlet_id"] == "default"
        assert "station_details" in data
        assert "printer_details" in data
        assert len(data["station_details"]) == 8
        assert len(data["printer_details"]) == 5


class TestSeasonalTemplates:
    """Seasonal Templates API tests - 6 holiday presets"""
    
    def test_manager_style_returns_seasonal_names(self):
        """GET /api/guest-order/manager/style returns seasonal_names list with 6 seasons"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/style")
        assert response.status_code == 200
        data = response.json()
        
        assert "seasonal_names" in data
        seasonal_names = data["seasonal_names"]
        assert len(seasonal_names) == 6, f"Expected 6 seasonal templates, got {len(seasonal_names)}"
        
        expected_seasons = ["valentines", "new_years", "thanksgiving", "christmas", "summer", "mothers_day"]
        for season in expected_seasons:
            assert season in seasonal_names, f"Missing seasonal template: {season}"
        
        # Verify seasonal presets are available
        assert "seasonal" in data
        assert len(data["seasonal"]) == 6
    
    def test_apply_valentines_preset(self):
        """POST /api/guest-order/manager/style/preset/valentines applies Valentine's theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/valentines")
        assert response.status_code == 200
        data = response.json()
        
        assert data["applied"] == "valentines"
        assert data["header_text"] == "Valentine's Dining"
        assert data["color_accent"] == "#e8456b"  # Pink/red accent
        assert data["color_background"] == "#1a0a10"  # Dark romantic background
    
    def test_apply_christmas_preset(self):
        """POST /api/guest-order/manager/style/preset/christmas applies Christmas theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/christmas")
        assert response.status_code == 200
        data = response.json()
        
        assert data["applied"] == "christmas"
        assert data["header_text"] == "Holiday Dining"
        assert data["color_accent"] == "#c41e3a"  # Christmas red
        assert data["color_background"] == "#0c1a0c"  # Dark green background
    
    def test_apply_summer_preset(self):
        """POST /api/guest-order/manager/style/preset/summer applies Summer theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/summer")
        assert response.status_code == 200
        data = response.json()
        
        assert data["applied"] == "summer"
        assert data["header_text"] == "Summer Menu"
        assert data["color_accent"] == "#0891b2"  # Cyan/teal
        assert data["color_background"] == "#fffbf0"  # Light warm background
    
    def test_apply_mothers_day_preset(self):
        """POST /api/guest-order/manager/style/preset/mothers_day applies Mother's Day theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/mothers_day")
        assert response.status_code == 200
        data = response.json()
        
        assert data["applied"] == "mothers_day"
        assert data["header_text"] == "Mother's Day Brunch"
        assert data["color_accent"] == "#be185d"  # Pink
        assert data["color_background"] == "#fdf2f8"  # Light pink background
    
    def test_apply_new_years_preset(self):
        """POST /api/guest-order/manager/style/preset/new_years applies New Year's theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/new_years")
        assert response.status_code == 200
        data = response.json()
        
        assert data["applied"] == "new_years"
        assert data["header_text"] == "New Year's Eve Dining"
        assert data["color_gold"] == "#ffd700"  # Gold
    
    def test_apply_thanksgiving_preset(self):
        """POST /api/guest-order/manager/style/preset/thanksgiving applies Thanksgiving theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/thanksgiving")
        assert response.status_code == 200
        data = response.json()
        
        assert data["applied"] == "thanksgiving"
        assert data["header_text"] == "Thanksgiving Feast"
        assert data["color_gold"] == "#d4760a"  # Orange/amber
    
    def test_reset_to_classic(self):
        """POST /api/guest-order/manager/style/preset/classic resets to classic theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/classic")
        assert response.status_code == 200
        data = response.json()
        
        assert data["applied"] == "classic"
        assert data["color_background"] == "#faf9f7"  # Light classic background
        assert data["font_heading"] == "Playfair Display"


class TestGuestOrderingIntegration:
    """Guest Ordering Platform integration tests"""
    
    def test_guest_auth(self):
        """POST /api/guest-order/auth authenticates Room 412 + Smith"""
        response = requests.post(f"{BASE_URL}/api/guest-order/auth", json={
            "room_number": "412",
            "last_name": "Smith"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["authenticated"] == True
        assert data["room_number"] == "412"
        assert "token" in data
    
    def test_guest_menu(self):
        """GET /api/guest-order/menu returns time-filtered menu"""
        response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_period" in data
        assert "menu" in data
        assert "total_items" in data


class TestPWAServiceWorkerEndpoints:
    """Test that PWA-cached API endpoints are working"""
    
    def test_health_endpoint(self):
        """GET /api/health is cacheable for PWA"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
    
    def test_dashboard_endpoint(self):
        """GET /api/dashboard is cacheable for PWA"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
    
    def test_kitchen_routing_dashboard_cacheable(self):
        """GET /api/kitchen-routing/dashboard is in PWA cache list"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/dashboard")
        assert response.status_code == 200
    
    def test_kitchen_routing_stations_cacheable(self):
        """GET /api/kitchen-routing/stations is in PWA cache list"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/stations")
        assert response.status_code == 200
    
    def test_kitchen_routing_printers_cacheable(self):
        """GET /api/kitchen-routing/printers is in PWA cache list"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/printers")
        assert response.status_code == 200
    
    def test_guest_order_style_cacheable(self):
        """GET /api/guest-order/style is in PWA cache list"""
        response = requests.get(f"{BASE_URL}/api/guest-order/style")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
