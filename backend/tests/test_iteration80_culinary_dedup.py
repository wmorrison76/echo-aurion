"""
Iteration 80: Culinary/Pastry De-duplication Testing
Tests for:
1. Health check
2. Kitchen Routing (from iteration 79)
3. Guest Order endpoints
4. Housekeeping dashboard
5. IRD dashboard
6. Concierge dashboard
7. Engineering Ops dashboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint"""
    
    def test_health_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "ok" in str(data).lower()
        print(f"✓ Health check passed: {data}")


class TestKitchenRouting:
    """Kitchen Routing endpoints - moved from Culinary to HR & Administration"""
    
    def test_dashboard_returns_stations_and_printers(self):
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "stations" in data
        assert "printers" in data
        kpis = data["kpis"]
        assert kpis["total_stations"] >= 8, f"Expected 8+ stations, got {kpis['total_stations']}"
        assert kpis["total_printers"] >= 5, f"Expected 5 printers, got {kpis['total_printers']}"
        print(f"✓ Kitchen Routing dashboard: {kpis['total_stations']} stations, {kpis['total_printers']} printers")
    
    def test_stations_returns_8_plus(self):
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/stations")
        assert response.status_code == 200
        data = response.json()
        assert "stations" in data
        stations = data["stations"]
        assert len(stations) >= 8, f"Expected 8+ stations, got {len(stations)}"
        # Verify station structure
        for station in stations[:3]:
            assert "id" in station
            assert "name" in station
            assert "color" in station
        print(f"✓ Kitchen Routing stations: {len(stations)} stations found")
    
    def test_printers_returns_5(self):
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/printers")
        assert response.status_code == 200
        data = response.json()
        assert "printers" in data
        printers = data["printers"]
        assert len(printers) >= 5, f"Expected 5 printers, got {len(printers)}"
        # Verify printer structure
        for printer in printers[:3]:
            assert "id" in printer
            assert "name" in printer
            assert "ip_address" in printer
            assert "technology" in printer
        print(f"✓ Kitchen Routing printers: {len(printers)} printers found")
    
    def test_outlets_returns_routing(self):
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
        print(f"✓ Kitchen Routing outlets: {len(outlets)} outlets found")


class TestGuestOrder:
    """Guest Order endpoints - Menu styling and auth"""
    
    def test_style_returns_menu_styling(self):
        response = requests.get(f"{BASE_URL}/api/guest-order/style")
        assert response.status_code == 200
        data = response.json()
        # Should have styling properties
        assert isinstance(data, dict)
        print(f"✓ Guest Order style endpoint working")
    
    def test_manager_style_returns_seasonal_presets(self):
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/style")
        assert response.status_code == 200
        data = response.json()
        # Should have seasonal_names with 6 presets
        assert "seasonal_names" in data
        seasonal = data["seasonal_names"]
        assert len(seasonal) >= 6, f"Expected 6 seasonal presets, got {len(seasonal)}"
        expected_seasons = ["valentines", "new_years", "thanksgiving", "christmas", "summer", "mothers_day"]
        for season in expected_seasons:
            assert season in seasonal, f"Missing seasonal preset: {season}"
        print(f"✓ Guest Order manager style: {len(seasonal)} seasonal presets")
    
    def test_auth_with_room_412_smith(self):
        response = requests.post(f"{BASE_URL}/api/guest-order/auth", json={
            "room_number": "412",
            "last_name": "Smith"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data or "authenticated" in data
        assert data.get("authenticated") == True or "token" in data
        print(f"✓ Guest Order auth: Room 412 + Smith authenticated")


class TestHousekeeping:
    """Housekeeping dashboard endpoint"""
    
    def test_dashboard_returns_rooms(self):
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200
        data = response.json()
        # Should have rooms or room-related data
        assert isinstance(data, dict)
        # Check for common housekeeping fields
        has_rooms = "rooms" in data or "room_status" in data or "floors" in data or "kpis" in data
        assert has_rooms, f"Expected rooms data, got keys: {list(data.keys())}"
        print(f"✓ Housekeeping dashboard: {list(data.keys())[:5]}")


class TestIRD:
    """IRD (In-Room Dining) dashboard endpoint"""
    
    def test_dashboard_returns_kpis(self):
        response = requests.get(f"{BASE_URL}/api/ird/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have KPIs or metrics
        has_metrics = "kpis" in data or "metrics" in data or "orders" in data or "revenue" in data
        assert has_metrics, f"Expected IRD metrics, got keys: {list(data.keys())}"
        print(f"✓ IRD dashboard: {list(data.keys())[:5]}")


class TestConcierge:
    """Concierge dashboard endpoint"""
    
    def test_dashboard_returns_kpis(self):
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have concierge-related data
        has_data = "kpis" in data or "requests" in data or "tasks" in data or "metrics" in data
        assert has_data, f"Expected concierge data, got keys: {list(data.keys())}"
        print(f"✓ Concierge dashboard: {list(data.keys())[:5]}")


class TestEngineeringOps:
    """Engineering Operations dashboard endpoint"""
    
    def test_dashboard_returns_kpis(self):
        response = requests.get(f"{BASE_URL}/api/engineering-ops/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have engineering-related data
        has_data = "kpis" in data or "tickets" in data or "work_orders" in data or "metrics" in data
        assert has_data, f"Expected engineering data, got keys: {list(data.keys())}"
        print(f"✓ Engineering Ops dashboard: {list(data.keys())[:5]}")


class TestExistingFeatures:
    """Verify existing features still work"""
    
    def test_dashboard_staff_status(self):
        response = requests.get(f"{BASE_URL}/api/dashboard/staff-status")
        assert response.status_code == 200
        print("✓ Dashboard staff status working")
    
    def test_dashboard_ops_metrics(self):
        response = requests.get(f"{BASE_URL}/api/dashboard/ops-metrics")
        assert response.status_code == 200
        print("✓ Dashboard ops metrics working")
    
    def test_admin_settings(self):
        response = requests.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200
        print("✓ Admin settings working")
    
    def test_user_preferences(self):
        response = requests.get(f"{BASE_URL}/api/user-preferences")
        assert response.status_code == 200
        print("✓ User preferences working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
