"""
Iteration 82: Desktop Taskbar & Enterprise Integration Tests
=============================================================
Tests for:
1. Desktop Taskbar (macOS-style dock) - 9 quick-launch icons
2. Email service endpoints
3. Guest ordering with live tracking
4. Housekeeping, Spa, Guest360, Kitchen Routing dashboards
5. Right-click context menus on Spa appointments and Guest360 profile
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestHealthAndCore:
    """Core health and status endpoints"""

    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("✓ GET /api/health returns 200")


class TestEmailService:
    """Email notification service tests"""

    def test_email_status(self):
        """GET /api/email/status returns email config info"""
        response = requests.get(f"{BASE_URL}/api/email/status", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "sendgrid_configured" in data
        assert "from_email" in data
        assert "message" in data
        print(f"✓ GET /api/email/status - sendgrid_configured: {data['sendgrid_configured']}")

    def test_email_test_creates_demo_log(self):
        """POST /api/email/test creates demo email log"""
        response = requests.post(f"{BASE_URL}/api/email/test", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"]["status"] in ["sent", "demo_logged"]
        print(f"✓ POST /api/email/test - status: {data['result']['status']}")


class TestGuestOrdering:
    """Guest ordering platform with live tracking"""

    def test_guest_auth_room_412_smith(self):
        """POST /api/guest-order/auth with room 412 + Smith"""
        response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"},
            timeout=10
        )
        assert response.status_code == 200, f"Auth failed: {response.text}"
        data = response.json()
        assert data["authenticated"] is True
        assert "token" in data
        assert data["room_number"] == "412"
        print(f"✓ POST /api/guest-order/auth - token: {data['token'][:20]}...")
        return data["token"]

    def test_guest_order_flow(self):
        """Full guest order flow: auth -> order -> track"""
        # Step 1: Authenticate
        auth_response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"},
            timeout=10
        )
        assert auth_response.status_code == 200
        token = auth_response.json()["token"]
        print(f"✓ Auth successful, token: {token[:20]}...")

        # Step 2: Get menu
        menu_response = requests.get(f"{BASE_URL}/api/guest-order/menu?token={token}", timeout=10)
        assert menu_response.status_code == 200
        menu_data = menu_response.json()
        assert "menu" in menu_data
        assert "current_period" in menu_data
        print(f"✓ Menu loaded - period: {menu_data['current_period']['label']}, items: {menu_data['total_items']}")

        # Step 3: Place order
        # Get first available item from menu
        items_to_order = []
        for category, items in menu_data["menu"].items():
            if items:
                item = items[0]
                items_to_order.append({
                    "item_id": item["id"],
                    "name": item["name"],
                    "price": item["price"],
                    "quantity": 1,
                    "prep_time_mins": item.get("prep_time_mins", 15)
                })
                break

        if items_to_order:
            order_response = requests.post(
                f"{BASE_URL}/api/guest-order/order",
                json={
                    "room_number": "412",
                    "guest_name": "Smith",
                    "session_token": token,
                    "items": items_to_order,
                    "special_instructions": "Test order from iteration 82"
                },
                timeout=10
            )
            assert order_response.status_code == 200, f"Order failed: {order_response.text}"
            order_data = order_response.json()
            assert "order_id" in order_data
            assert "total" in order_data
            assert "estimated_delivery_mins" in order_data
            print(f"✓ Order placed - ID: {order_data['order_id']}, total: ${order_data['total']}")

            # Step 4: Track order
            track_response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_data['order_id']}", timeout=10)
            assert track_response.status_code == 200
            track_data = track_response.json()
            assert track_data["status"] in ["received", "preparing", "delivering", "delivered"]
            assert "history" in track_data
            print(f"✓ Order tracking - status: {track_data['status']}")

            return order_data["order_id"]
        else:
            print("⚠ No menu items available to order")
            return None

    def test_order_status_update(self):
        """PUT /api/guest-order/order/{order_id}/status updates order"""
        # First create an order
        auth_response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"},
            timeout=10
        )
        token = auth_response.json()["token"]

        menu_response = requests.get(f"{BASE_URL}/api/guest-order/menu?token={token}", timeout=10)
        menu_data = menu_response.json()

        items_to_order = []
        for category, items in menu_data["menu"].items():
            if items:
                item = items[0]
                items_to_order.append({
                    "item_id": item["id"],
                    "name": item["name"],
                    "price": item["price"],
                    "quantity": 1,
                    "prep_time_mins": item.get("prep_time_mins", 15)
                })
                break

        if items_to_order:
            order_response = requests.post(
                f"{BASE_URL}/api/guest-order/order",
                json={
                    "room_number": "412",
                    "guest_name": "Smith",
                    "session_token": token,
                    "items": items_to_order,
                    "special_instructions": ""
                },
                timeout=10
            )
            order_id = order_response.json()["order_id"]

            # Update status to preparing
            update_response = requests.put(
                f"{BASE_URL}/api/guest-order/order/{order_id}/status?status=preparing",
                timeout=10
            )
            assert update_response.status_code == 200
            update_data = update_response.json()
            assert update_data["status"] == "preparing"
            print(f"✓ Order status updated to 'preparing' for {order_id}")

            # Verify tracking shows updated status
            track_response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_id}", timeout=10)
            track_data = track_response.json()
            assert track_data["status"] == "preparing"
            assert len(track_data["history"]) >= 1
            print(f"✓ Tracking confirms status: {track_data['status']}, history entries: {len(track_data['history'])}")


class TestHousekeepingDashboard:
    """Housekeeping dashboard tests"""

    def test_housekeeping_dashboard(self):
        """GET /api/housekeeping/dashboard returns rooms"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "rooms" in data or "kpis" in data or "summary" in data
        print(f"✓ GET /api/housekeeping/dashboard - keys: {list(data.keys())}")


class TestSpaDashboard:
    """Spa & Wellness dashboard tests"""

    def test_spa_dashboard(self):
        """GET /api/spa/dashboard returns spa KPIs"""
        response = requests.get(f"{BASE_URL}/api/spa/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        kpis = data["kpis"]
        assert "today_appointments" in kpis
        assert "today_revenue" in kpis
        print(f"✓ GET /api/spa/dashboard - today_appointments: {kpis['today_appointments']}, revenue: ${kpis['today_revenue']}")

    def test_spa_appointments(self):
        """GET /api/spa/appointments returns appointments list"""
        response = requests.get(f"{BASE_URL}/api/spa/appointments", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "appointments" in data
        print(f"✓ GET /api/spa/appointments - count: {len(data['appointments'])}")


class TestGuest360:
    """Guest 360 profile search tests"""

    def test_guest360_search(self):
        """GET /api/guest360/search?q=Guest returns results"""
        response = requests.get(f"{BASE_URL}/api/guest360/search?q=Guest", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        print(f"✓ GET /api/guest360/search?q=Guest - results: {len(data['results'])}")

    def test_guest360_search_smith(self):
        """GET /api/guest360/search?q=Smith returns results"""
        response = requests.get(f"{BASE_URL}/api/guest360/search?q=Smith", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        print(f"✓ GET /api/guest360/search?q=Smith - results: {len(data['results'])}")


class TestKitchenRouting:
    """Kitchen routing dashboard tests"""

    def test_kitchen_routing_dashboard(self):
        """GET /api/kitchen-routing/dashboard returns stations/printers"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # Check for expected keys
        has_stations = "stations" in data
        has_printers = "printers" in data
        has_kpis = "kpis" in data
        assert has_stations or has_printers or has_kpis, f"Expected stations/printers/kpis, got: {list(data.keys())}"
        print(f"✓ GET /api/kitchen-routing/dashboard - keys: {list(data.keys())}")


class TestIRDDashboard:
    """IRD (In-Room Dining) dashboard tests"""

    def test_ird_dashboard(self):
        """GET /api/ird/dashboard returns IRD data"""
        response = requests.get(f"{BASE_URL}/api/ird/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ GET /api/ird/dashboard - keys: {list(data.keys())}")


class TestConcierge:
    """Concierge dashboard tests"""

    def test_concierge_dashboard(self):
        """GET /api/concierge/dashboard returns concierge data"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ GET /api/concierge/dashboard - keys: {list(data.keys())}")


class TestEngineeringOps:
    """Engineering operations dashboard tests"""

    def test_engineering_dashboard(self):
        """GET /api/engineering-ops/dashboard returns engineering data"""
        response = requests.get(f"{BASE_URL}/api/engineering-ops/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ GET /api/engineering-ops/dashboard - keys: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
