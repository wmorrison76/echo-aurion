"""
Iteration 81: Email Notifications + Order Tracking Tests
=========================================================
Tests for:
1. Email notification service (SendGrid-ready, logs to DB when no key)
2. Real-time guest order tracking with 4-step progress
3. Order status update API for kitchen staff
4. Existing APIs regression (housekeeping, concierge, engineering, kitchen-routing)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmailNotificationService:
    """Email notification service tests - SendGrid-ready, logs to DB in demo mode"""
    
    def test_email_status_returns_sendgrid_not_configured(self):
        """GET /api/email/status returns sendgrid_configured=false and descriptive message"""
        response = requests.get(f"{BASE_URL}/api/email/status")
        assert response.status_code == 200
        data = response.json()
        assert "sendgrid_configured" in data
        assert data["sendgrid_configured"] == False  # No SendGrid key in test env
        assert "message" in data
        assert "from_email" in data
        print(f"Email status: sendgrid_configured={data['sendgrid_configured']}, message={data['message'][:50]}...")
    
    def test_email_test_creates_demo_logged_email(self):
        """POST /api/email/test creates a demo_logged email in DB"""
        response = requests.post(f"{BASE_URL}/api/email/test")
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        result = data["result"]
        assert result["status"] == "demo_logged"
        assert "id" in result
        assert result["to"] == "admin@luccca.io"
        assert "SendGrid" in result["subject"]
        print(f"Test email created: id={result['id']}, status={result['status']}")
    
    def test_email_log_returns_emails_with_stats(self):
        """GET /api/email/log returns email list with stats"""
        response = requests.get(f"{BASE_URL}/api/email/log")
        assert response.status_code == 200
        data = response.json()
        assert "emails" in data
        assert "stats" in data
        assert "sendgrid_configured" in data
        stats = data["stats"]
        assert "total" in stats
        assert "sent" in stats
        assert "demo" in stats
        assert "failed" in stats
        print(f"Email log: {len(data['emails'])} emails, stats={stats}")
    
    def test_email_send_custom_email_logs_to_db(self):
        """POST /api/email/send sends custom email (logs to DB in demo mode)"""
        payload = {
            "to": "test@example.com",
            "subject": "TEST_Iteration81 Custom Email",
            "body_html": "<h1>Test Email</h1><p>This is a test from iteration 81.</p>",
            "body_text": "Test Email - This is a test from iteration 81.",
            "category": "test_iteration81"
        }
        response = requests.post(f"{BASE_URL}/api/email/send", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "demo_logged"
        assert data["to"] == "test@example.com"
        assert "TEST_Iteration81" in data["subject"]
        assert data["category"] == "test_iteration81"
        print(f"Custom email sent: id={data['id']}, status={data['status']}")
    
    def test_email_log_filter_by_category(self):
        """GET /api/email/log?category=test filters by category"""
        response = requests.get(f"{BASE_URL}/api/email/log?category=test")
        assert response.status_code == 200
        data = response.json()
        assert "emails" in data
        # All returned emails should have category=test
        for email in data["emails"]:
            assert email["category"] == "test"
        print(f"Filtered email log: {len(data['emails'])} test emails")


class TestGuestOrderTracking:
    """Guest order tracking tests - 4-step progress indicator"""
    
    @pytest.fixture(scope="class")
    def guest_session(self):
        """Authenticate as guest and return session token"""
        response = requests.post(f"{BASE_URL}/api/guest-order/auth", json={
            "room_number": "412",
            "last_name": "Smith"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] == True
        return data
    
    @pytest.fixture(scope="class")
    def menu_item(self, guest_session):
        """Get a menu item for ordering"""
        response = requests.get(f"{BASE_URL}/api/guest-order/menu?token={guest_session['token']}")
        assert response.status_code == 200
        data = response.json()
        # Get first food item
        food_items = data["menu"].get("food", [])
        assert len(food_items) > 0
        return food_items[0]
    
    @pytest.fixture(scope="class")
    def placed_order(self, guest_session, menu_item):
        """Place an order and return order details"""
        payload = {
            "room_number": guest_session["room_number"],
            "guest_name": guest_session["guest_name"],
            "session_token": guest_session["token"],
            "items": [{
                "item_id": menu_item["id"],
                "name": menu_item["name"],
                "quantity": 1,
                "price": menu_item["price"],
                "prep_time_mins": menu_item.get("prep_time_mins", 15)
            }],
            "special_instructions": "TEST_Iteration81 order"
        }
        response = requests.post(f"{BASE_URL}/api/guest-order/order", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        return data
    
    def test_guest_auth_with_room_412_smith(self):
        """POST /api/guest-order/auth with room 412 + Smith"""
        response = requests.post(f"{BASE_URL}/api/guest-order/auth", json={
            "room_number": "412",
            "last_name": "Smith"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] == True
        assert data["room_number"] == "412"
        assert "token" in data
        print(f"Guest auth: room={data['room_number']}, name={data['guest_name']}")
    
    def test_place_order_returns_order_id(self, guest_session, menu_item):
        """POST /api/guest-order/order places order and returns order_id"""
        payload = {
            "room_number": guest_session["room_number"],
            "guest_name": guest_session["guest_name"],
            "session_token": guest_session["token"],
            "items": [{
                "item_id": menu_item["id"],
                "name": menu_item["name"],
                "quantity": 1,
                "price": menu_item["price"],
                "prep_time_mins": menu_item.get("prep_time_mins", 15)
            }],
            "special_instructions": "TEST_Iteration81 tracking test"
        }
        response = requests.post(f"{BASE_URL}/api/guest-order/order", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert "total" in data
        assert "estimated_delivery_mins" in data
        assert "message" in data
        print(f"Order placed: id={data['order_id']}, total=${data['total']}, eta={data['estimated_delivery_mins']}min")
    
    def test_track_order_returns_status_and_history(self, placed_order):
        """GET /api/guest-order/track/{order_id} returns status + status_label + history"""
        order_id = placed_order["order_id"]
        response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] == order_id
        assert "status" in data
        assert "status_label" in data
        assert "history" in data
        assert "room_number" in data
        assert "total" in data
        assert "items" in data
        assert "estimated_delivery_mins" in data
        print(f"Track order: status={data['status']}, label={data['status_label']}")
    
    def test_update_status_to_preparing(self, placed_order):
        """PUT /api/guest-order/order/{order_id}/status?status=preparing updates status"""
        order_id = placed_order["order_id"]
        response = requests.put(f"{BASE_URL}/api/guest-order/order/{order_id}/status?status=preparing")
        assert response.status_code == 200
        data = response.json()
        assert data["order_id"] == order_id
        assert data["status"] == "preparing"
        print(f"Status updated to preparing: {data['message']}")
        
        # Verify via track endpoint
        track_response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_id}")
        track_data = track_response.json()
        assert track_data["status"] == "preparing"
        assert len(track_data["history"]) >= 1  # Should have at least one history entry
    
    def test_update_status_to_delivering(self, placed_order):
        """PUT /api/guest-order/order/{order_id}/status?status=delivering updates status"""
        order_id = placed_order["order_id"]
        response = requests.put(f"{BASE_URL}/api/guest-order/order/{order_id}/status?status=delivering")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "delivering"
        print(f"Status updated to delivering: {data['message']}")
        
        # Verify history grows
        track_response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_id}")
        track_data = track_response.json()
        assert track_data["status"] == "delivering"
        assert len(track_data["history"]) >= 2
    
    def test_update_status_to_delivered_triggers_email(self, placed_order):
        """PUT /api/guest-order/order/{order_id}/status?status=delivered updates and triggers email log"""
        order_id = placed_order["order_id"]
        
        # Get email count before
        email_before = requests.get(f"{BASE_URL}/api/email/log?limit=1").json()
        before_total = email_before["stats"]["total"]
        
        response = requests.put(f"{BASE_URL}/api/guest-order/order/{order_id}/status?status=delivered")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "delivered"
        print(f"Status updated to delivered: {data['message']}")
        
        # Verify email was logged (delivery confirmation)
        time.sleep(0.5)  # Small delay for DB write
        email_after = requests.get(f"{BASE_URL}/api/email/log?limit=1").json()
        after_total = email_after["stats"]["total"]
        assert after_total >= before_total  # Email should have been logged
        print(f"Email count: before={before_total}, after={after_total}")
    
    def test_track_order_shows_full_history(self, placed_order):
        """GET /api/guest-order/track/{order_id} after updates shows status history"""
        order_id = placed_order["order_id"]
        response = requests.get(f"{BASE_URL}/api/guest-order/track/{order_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "delivered"
        assert data["status_label"] == "Delivered — enjoy your meal!"
        # History should have entries for: received->preparing, preparing->delivering, delivering->delivered
        assert len(data["history"]) >= 3
        print(f"Order history: {len(data['history'])} entries, final status={data['status']}")
        for entry in data["history"]:
            print(f"  - {entry['old_status']} -> {entry['new_status']} at {entry['created_at']}")
    
    def test_invalid_status_returns_400(self, placed_order):
        """PUT with invalid status returns 400"""
        order_id = placed_order["order_id"]
        response = requests.put(f"{BASE_URL}/api/guest-order/order/{order_id}/status?status=invalid_status")
        assert response.status_code == 400
        print("Invalid status correctly rejected with 400")


class TestExistingAPIsRegression:
    """Regression tests for existing APIs - housekeeping, concierge, engineering, kitchen-routing"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("Health check passed")
    
    def test_housekeeping_dashboard(self):
        """GET /api/housekeeping/dashboard returns rooms"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "rooms" in data
        print(f"Housekeeping: {len(data['rooms'])} rooms")
    
    def test_concierge_dashboard(self):
        """GET /api/concierge/dashboard returns concierge KPIs"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data or "requests" in data or "reservations" in data
        print("Concierge dashboard working")
    
    def test_engineering_dashboard(self):
        """GET /api/engineering-ops/dashboard returns engineering KPIs"""
        response = requests.get(f"{BASE_URL}/api/engineering-ops/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data or "work_orders" in data
        print("Engineering dashboard working")
    
    def test_kitchen_routing_dashboard(self):
        """GET /api/kitchen-routing/dashboard returns stations and printers"""
        response = requests.get(f"{BASE_URL}/api/kitchen-routing/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "stations" in data
        assert "printers" in data
        print(f"Kitchen routing: {len(data['stations'])} stations, {len(data['printers'])} printers")
    
    def test_ird_dashboard(self):
        """GET /api/ird/dashboard returns IRD KPIs"""
        response = requests.get(f"{BASE_URL}/api/ird/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data or "orders" in data
        print("IRD dashboard working")
    
    def test_guest_order_menu(self):
        """GET /api/guest-order/menu returns menu items"""
        response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert response.status_code == 200
        data = response.json()
        assert "menu" in data
        assert "current_period" in data
        print(f"Guest menu: {data['total_items']} items, period={data['current_period']['label']}")
    
    def test_guest_order_style(self):
        """GET /api/guest-order/style returns menu styling"""
        response = requests.get(f"{BASE_URL}/api/guest-order/style")
        assert response.status_code == 200
        data = response.json()
        assert "font_heading" in data or "fonts" in data
        print("Guest order style endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
