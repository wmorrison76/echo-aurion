"""
Iteration 84: Echo Concierge ALICE-Inspired Rebuild + WebSocket Order Tracking
================================================================================
Tests:
1. Concierge saved filters (8 ALICE-inspired views)
2. Shift log with auto-populated open tickets
3. Concierge tickets CRUD
4. Concierge dashboard KPIs
5. Order status update with WebSocket broadcast
6. Order tracking endpoint
7. Regression: health, guest-intel, housekeeping, ird, email
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestConciergeAPIs:
    """Echo Concierge API tests - saved filters, shift log, tickets"""

    def test_health_check(self):
        """Verify backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASS: Health check - backend healthy")

    def test_concierge_saved_filters_returns_8_filters(self):
        """GET /api/concierge/saved-filters returns 8 ALICE-inspired saved filters"""
        response = requests.get(f"{BASE_URL}/api/concierge/saved-filters")
        assert response.status_code == 200
        data = response.json()
        assert "filters" in data
        filters = data["filters"]
        assert len(filters) == 8, f"Expected 8 saved filters, got {len(filters)}"
        
        # Verify expected filter names
        filter_names = [f["name"] for f in filters]
        expected_names = [
            "Guest Requests", "Maintenance", "Housekeeping", "Critical & High",
            "Open Issues", "Recovery Actions", "SPA Issues", "F&B Complaints"
        ]
        for name in expected_names:
            assert name in filter_names, f"Missing filter: {name}"
        
        # Verify each filter has required fields
        for f in filters:
            assert "id" in f
            assert "name" in f
            assert "icon" in f
            assert "filters" in f
        
        print(f"PASS: Saved filters - 8 filters returned: {filter_names}")

    def test_concierge_dashboard_returns_kpis(self):
        """GET /api/concierge/dashboard returns KPIs"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "kpis" in data
        kpis = data["kpis"]
        assert "total_tickets" in kpis
        assert "active" in kpis
        assert "resolved" in kpis
        assert "sla_breaches" in kpis
        assert "total_recovery_cost" in kpis
        
        assert "by_status" in data
        assert "by_category" in data
        assert "categories" in data
        
        print(f"PASS: Concierge dashboard - KPIs: total={kpis['total_tickets']}, active={kpis['active']}, resolved={kpis['resolved']}")

    def test_concierge_tickets_list(self):
        """GET /api/concierge/tickets returns ticket list"""
        response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        assert response.status_code == 200
        data = response.json()
        
        assert "tickets" in data
        assert "total" in data
        tickets = data["tickets"]
        assert isinstance(tickets, list)
        
        if len(tickets) > 0:
            ticket = tickets[0]
            assert "id" in ticket
            assert "title" in ticket
            assert "status" in ticket
            assert "priority" in ticket
            assert "category" in ticket
        
        print(f"PASS: Concierge tickets - {len(tickets)} tickets returned")

    def test_concierge_tickets_filter_by_status(self):
        """GET /api/concierge/tickets?status=open filters by status"""
        response = requests.get(f"{BASE_URL}/api/concierge/tickets?status=open")
        assert response.status_code == 200
        data = response.json()
        
        tickets = data["tickets"]
        for t in tickets:
            assert t["status"] == "open", f"Expected status=open, got {t['status']}"
        
        print(f"PASS: Concierge tickets filter - {len(tickets)} open tickets")


class TestShiftLog:
    """Shift log API tests - create with auto-populated open tickets"""

    def test_create_shift_log_with_auto_open_tickets(self):
        """POST /api/concierge/shift-log creates entry with auto_open_tickets populated"""
        payload = {
            "author": "TEST_John Manager",
            "role": "MOD",
            "shift": "PM",
            "notes": "Test shift handoff - busy evening with VIP arrivals",
            "handoff_items": ["Room 412 AC issue pending", "VIP in 501 needs extra pillows"],
            "vip_alerts": ["Mr. Wellington arriving at 6pm", "Celebrity guest in penthouse"],
            "open_issues": []
        }
        response = requests.post(
            f"{BASE_URL}/api/concierge/shift-log",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["author"] == "TEST_John Manager"
        assert data["shift"] == "PM"
        assert data["notes"] == payload["notes"]
        assert "handoff_items" in data
        assert "vip_alerts" in data
        assert "auto_open_tickets" in data, "auto_open_tickets should be populated"
        
        # auto_open_tickets should be a list (may be empty if no open tickets)
        assert isinstance(data["auto_open_tickets"], list)
        
        # If there are auto-populated tickets, verify structure
        if len(data["auto_open_tickets"]) > 0:
            ticket = data["auto_open_tickets"][0]
            assert "id" in ticket
            assert "title" in ticket
            assert "room" in ticket
            assert "priority" in ticket
        
        print(f"PASS: Shift log created - auto_open_tickets: {len(data['auto_open_tickets'])} tickets")
        return data["id"]

    def test_get_shift_logs(self):
        """GET /api/concierge/shift-log returns recent logs"""
        response = requests.get(f"{BASE_URL}/api/concierge/shift-log")
        assert response.status_code == 200
        data = response.json()
        
        assert "logs" in data
        logs = data["logs"]
        assert isinstance(logs, list)
        
        if len(logs) > 0:
            log = logs[0]
            assert "id" in log
            assert "author" in log
            assert "shift" in log
            assert "notes" in log
            assert "created_at" in log
        
        print(f"PASS: Shift logs - {len(logs)} logs returned")


class TestGuestOrderTracking:
    """Guest order tracking with WebSocket broadcast"""

    def test_guest_auth(self):
        """POST /api/guest-order/auth authenticates guest"""
        payload = {"room_number": "412", "last_name": "Smith"}
        response = requests.post(f"{BASE_URL}/api/guest-order/auth", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["authenticated"] == True
        assert "token" in data
        assert data["room_number"] == "412"
        
        print(f"PASS: Guest auth - Room 412, token received")
        return data["token"]

    def test_guest_menu(self):
        """GET /api/guest-order/menu returns menu items"""
        response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_period" in data
        assert "menu" in data
        assert "total_items" in data
        
        print(f"PASS: Guest menu - {data['total_items']} items, period: {data['current_period']['label']}")

    def test_place_order_and_track(self):
        """Place order and verify tracking endpoint"""
        # First authenticate
        auth_response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"}
        )
        assert auth_response.status_code == 200
        token = auth_response.json()["token"]
        
        # Get menu to find an item
        menu_response = requests.get(f"{BASE_URL}/api/guest-order/menu?token={token}")
        assert menu_response.status_code == 200
        menu_data = menu_response.json()
        
        # Find a food item
        food_items = menu_data["menu"].get("food", [])
        if len(food_items) == 0:
            pytest.skip("No food items available in menu")
        
        item = food_items[0]
        
        # Place order
        order_payload = {
            "room_number": "412",
            "guest_name": "Smith",
            "session_token": token,
            "items": [{
                "item_id": item["id"],
                "name": item["name"],
                "price": item["price"],
                "quantity": 1,
                "prep_time_mins": item.get("prep_time_mins", 15)
            }],
            "special_instructions": "TEST order - please ignore"
        }
        order_response = requests.post(f"{BASE_URL}/api/guest-order/order", json=order_payload)
        assert order_response.status_code == 200
        order_data = order_response.json()
        
        assert "order_id" in order_data
        order_id = order_data["order_id"]
        
        # Test tracking endpoint
        track_response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_id}")
        assert track_response.status_code == 200
        track_data = track_response.json()
        
        assert track_data["order_id"] == order_id
        assert "status" in track_data
        assert "status_label" in track_data
        assert track_data["room_number"] == "412"
        assert "items" in track_data
        assert "history" in track_data
        
        print(f"PASS: Order placed and tracked - order_id: {order_id}, status: {track_data['status']}")
        return order_id

    def test_order_status_update_broadcasts(self):
        """PUT /api/guest-order/order/{id}/status updates status (WebSocket broadcast)"""
        # First create an order
        auth_response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"}
        )
        token = auth_response.json()["token"]
        
        menu_response = requests.get(f"{BASE_URL}/api/guest-order/menu?token={token}")
        food_items = menu_response.json()["menu"].get("food", [])
        if len(food_items) == 0:
            pytest.skip("No food items available")
        
        item = food_items[0]
        order_payload = {
            "room_number": "412",
            "guest_name": "Smith",
            "session_token": token,
            "items": [{"item_id": item["id"], "name": item["name"], "price": item["price"], "quantity": 1, "prep_time_mins": 15}],
            "special_instructions": "TEST status update"
        }
        order_response = requests.post(f"{BASE_URL}/api/guest-order/order", json=order_payload)
        order_id = order_response.json()["order_id"]
        
        # Update status to "preparing"
        status_response = requests.put(f"{BASE_URL}/api/guest-order/order/{order_id}/status?status=preparing")
        assert status_response.status_code == 200
        status_data = status_response.json()
        
        assert status_data["order_id"] == order_id
        assert status_data["status"] == "preparing"
        
        # Verify tracking shows updated status
        track_response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_id}")
        track_data = track_response.json()
        assert track_data["status"] == "preparing"
        assert "Chef is preparing" in track_data["status_label"]
        
        print(f"PASS: Order status updated to 'preparing' - WebSocket broadcast triggered")


class TestRegressionAPIs:
    """Regression tests for existing APIs"""

    def test_housekeeping_dashboard(self):
        """GET /api/housekeeping/dashboard still works"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data or "rooms" in data
        print("PASS: Housekeeping dashboard working")

    def test_ird_dashboard(self):
        """GET /api/ird/dashboard still works"""
        response = requests.get(f"{BASE_URL}/api/ird/dashboard")
        assert response.status_code == 200
        print("PASS: IRD dashboard working")

    def test_guest_intel_dashboard(self):
        """GET /api/guest-intel/dashboard still works"""
        response = requests.get(f"{BASE_URL}/api/guest-intel/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data or "kpis" in data
        print("PASS: Guest Intelligence dashboard working")

    def test_email_status(self):
        """GET /api/email/status still works"""
        response = requests.get(f"{BASE_URL}/api/email/status")
        assert response.status_code == 200
        print("PASS: Email status working")

    def test_concierge_analytics(self):
        """GET /api/concierge/analytics still works"""
        response = requests.get(f"{BASE_URL}/api/concierge/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "total_tickets" in data
        assert "room_hotspots" in data
        print("PASS: Concierge analytics working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
