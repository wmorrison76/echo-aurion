"""
Iteration 77 Backend Tests - Context Menu Modules
Tests for: Housekeeping, Echo Concierge, Engineering Work Tickets, FOH Operations, Retail Ops, MinibarIRD, Guest Ordering
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
        assert data["status"] == "healthy"
        assert "engines" in data
        print("✓ Health check passed")


class TestHousekeeping:
    """Housekeeping module endpoints"""
    
    def test_dashboard_returns_rooms_and_staff(self):
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "rooms" in data
        assert "staff" in data
        assert data["kpis"]["total_rooms"] == 65
        assert len(data["rooms"]) > 0
        assert len(data["staff"]) > 0
        print(f"✓ Housekeeping dashboard: {data['kpis']['total_rooms']} rooms, {len(data['staff'])} staff")
    
    def test_update_room_status_to_clean(self):
        # Update room 301 to clean
        response = requests.put(f"{BASE_URL}/api/housekeeping/rooms/301/status?status=clean")
        assert response.status_code == 200
        data = response.json()
        assert data["room"] == "301"
        assert data["status"] == "clean"
        print("✓ Room 301 status updated to clean")
    
    def test_update_room_status_to_inspected(self):
        response = requests.put(f"{BASE_URL}/api/housekeeping/rooms/302/status?status=inspected")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "inspected"
        print("✓ Room 302 status updated to inspected")


class TestEchoConcierge:
    """Echo Concierge module endpoints"""
    
    def test_tickets_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        assert response.status_code == 200
        data = response.json()
        assert "tickets" in data
        assert isinstance(data["tickets"], list)
        print(f"✓ Concierge tickets: {len(data['tickets'])} tickets")
    
    def test_dashboard_returns_kpis(self):
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "active" in data["kpis"]
        assert "resolved" in data["kpis"]
        print(f"✓ Concierge dashboard: {data['kpis']['active']} active, {data['kpis']['resolved']} resolved")


class TestEngineeringOps:
    """Engineering Work Tickets module endpoints"""
    
    def test_tickets_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/engineering-ops/tickets")
        assert response.status_code == 200
        data = response.json()
        assert "tickets" in data
        assert isinstance(data["tickets"], list)
        assert len(data["tickets"]) > 0
        # Verify ticket structure
        ticket = data["tickets"][0]
        assert "id" in ticket
        assert "title" in ticket
        assert "trade" in ticket
        assert "status" in ticket
        print(f"✓ Engineering tickets: {len(data['tickets'])} tickets")
    
    def test_dashboard_returns_kpis(self):
        response = requests.get(f"{BASE_URL}/api/engineering-ops/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "total_tickets" in data["kpis"]
        assert "open" in data["kpis"]
        print(f"✓ Engineering dashboard: {data['kpis']['total_tickets']} total, {data['kpis']['open']} open")


class TestFOHOperations:
    """FOH Operations module endpoints"""
    
    def test_dashboard_returns_tables_and_servers(self):
        response = requests.get(f"{BASE_URL}/api/foh/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "tables" in data
        assert "servers" in data
        assert data["kpis"]["total_tables"] == 20
        assert len(data["tables"]) == 20
        assert len(data["servers"]) > 0
        print(f"✓ FOH dashboard: {data['kpis']['total_tables']} tables, {len(data['servers'])} servers")
    
    def test_tip_pool_returns_distribution(self):
        response = requests.get(f"{BASE_URL}/api/foh/tip-pool")
        assert response.status_code == 200
        data = response.json()
        assert "total_tips" in data
        assert "distribution" in data
        print(f"✓ FOH tip pool: ${data['total_tips']} total")


class TestRetailOps:
    """Retail Operations module endpoints"""
    
    def test_dashboard_returns_inventory(self):
        response = requests.get(f"{BASE_URL}/api/retail/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "items" in data
        assert data["kpis"]["total_items"] == 10
        assert len(data["items"]) == 10
        # Verify item structure
        item = data["items"][0]
        assert "id" in item
        assert "name" in item
        assert "price" in item
        assert "qty_on_hand" in item
        print(f"✓ Retail dashboard: {data['kpis']['total_items']} items, ${data['kpis']['total_revenue']} revenue")


class TestMinibarIRD:
    """MinibarIRD module endpoints"""
    
    def test_orders_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/ird/orders")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"✓ IRD orders: {len(data['orders'])} orders")
    
    def test_dashboard_returns_kpis(self):
        response = requests.get(f"{BASE_URL}/api/ird/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "active_orders" in data["kpis"]
        assert "total_orders" in data["kpis"]
        assert "ird_revenue" in data["kpis"]
        print(f"✓ IRD dashboard: {data['kpis']['total_orders']} orders, ${data['kpis']['ird_revenue']} revenue")
    
    def test_menu_returns_categories(self):
        response = requests.get(f"{BASE_URL}/api/ird/menu")
        assert response.status_code == 200
        data = response.json()
        assert "menu" in data
        assert isinstance(data["menu"], dict)
        print(f"✓ IRD menu: {len(data['menu'])} categories")


class TestGuestOrdering:
    """Guest Ordering Platform endpoints"""
    
    def test_auth_with_valid_room(self):
        response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] == True
        assert "token" in data
        assert data["room_number"] == "412"
        assert data["guest_name"] == "Smith"
        print(f"✓ Guest auth: token={data['token'][:20]}...")
    
    def test_menu_returns_time_filtered_items(self):
        response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert response.status_code == 200
        data = response.json()
        assert "current_period" in data
        assert "menu" in data
        assert "total_items" in data
        assert data["total_items"] > 0
        print(f"✓ Guest menu: {data['current_period']['label']} period, {data['total_items']} items")
    
    def test_manager_periods_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/periods")
        assert response.status_code == 200
        data = response.json()
        assert "periods" in data
        assert len(data["periods"]) == 3
        period_ids = [p["period_id"] for p in data["periods"]]
        assert "breakfast" in period_ids
        assert "all_day" in period_ids
        assert "overnight" in period_ids
        print(f"✓ Manager periods: {len(data['periods'])} periods")
    
    def test_manager_menu_returns_all_items(self):
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/menu")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) > 20  # Should have 31 items
        print(f"✓ Manager menu: {len(data['items'])} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
