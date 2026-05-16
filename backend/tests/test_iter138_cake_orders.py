"""
Iteration 138: Cake Orders Module Tests
=======================================
Tests for the new cake-orders system including:
- Unique order number generation (CK-{INITIALS}-{YYMMDD}-{3char-checksum})
- Email queuing when RESEND_API_KEY not configured
- POS outbound queue
- Graceful Stripe degradation
- Regression tests for production-schedules and cake-assets
"""
import pytest
import requests
import os
import re
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Safe alphabet for checksum (no 0/O/1/I)
SAFE_ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class TestCakeOrdersConfigStatus:
    """Test /api/cake-orders/config/status endpoint"""

    def test_config_status_returns_service_flags(self):
        """GET /api/cake-orders/config/status returns resend_configured, stripe_configured, sender_email, brand_name"""
        response = requests.get(f"{BASE_URL}/api/cake-orders/config/status")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "resend_configured" in data
        assert "stripe_configured" in data
        assert "sender_email" in data
        assert "brand_name" in data
        
        # Verify types
        assert isinstance(data["resend_configured"], bool)
        assert isinstance(data["stripe_configured"], bool)
        assert isinstance(data["sender_email"], str)
        assert isinstance(data["brand_name"], str)
        
        # RESEND_API_KEY is NOT configured per requirements
        assert data["resend_configured"] == False, "RESEND_API_KEY should not be configured"
        
        # STRIPE_API_KEY is placeholder sk_test_emergent - should be True (key exists) but will fail on use
        # The code checks if STRIPE_API_KEY exists, not if it's valid
        assert data["brand_name"] == "LUCCCA Pastry"
        print(f"Config status: resend={data['resend_configured']}, stripe={data['stripe_configured']}, brand={data['brand_name']}")


class TestCakeOrderCreation:
    """Test POST /api/cake-orders/ endpoint"""

    def test_create_order_basic(self):
        """Create a basic cake order and verify order number format"""
        payload = {
            "design_name": "TEST_Basic Wedding Cake",
            "client": {
                "name": "John Morrison",
                "email": "john@example.com",
                "phone": "+1-555-0100"
            },
            "pickup_date": "2026-05-14",
            "pickup_time": "15:00",
            "tiers": [
                {"tier": 1, "shape": "round", "diameter": 12, "height": 5, "flavor": "Vanilla", "filling": "Raspberry"}
            ],
            "decorations": ["Cascading Roses", "Gold Leaf"],
            "total_servings": 50,
            "costing": {
                "food_cost": 85.00,
                "labor_hours": 6,
                "labor_cost": 180.00,
                "total_cost": 265.00,
                "suggested_price": 450.00,
                "per_serving": 9.00
            },
            "notes": "Nut-free kitchen required",
            "send_email": True,
            "create_deposit_link": False
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["success"] == True
        assert "order" in data
        assert "email_preview_html" in data
        assert "pos_outbound_id" in data
        
        order = data["order"]
        
        # Verify order number format: CK-{INITIALS}-{YYMMDD}-{3char-checksum}
        order_no = order["order_number"]
        pattern = r"^CK-[A-Z]{2}-\d{6}-[A-Z0-9]{3}$"
        assert re.match(pattern, order_no), f"Order number {order_no} doesn't match expected format"
        
        # Verify initials come from customer name (John Morrison -> JM)
        parts = order_no.split("-")
        assert parts[1] == "JM", f"Initials should be JM, got {parts[1]}"
        
        # Verify YYMMDD comes from pickup_date (2026-05-14 -> 260514)
        assert parts[2] == "260514", f"Date should be 260514, got {parts[2]}"
        
        # Verify checksum is 3 chars from safe alphabet (no 0/O/1/I)
        checksum = parts[3]
        assert len(checksum) == 3
        for char in checksum:
            assert char in SAFE_ALPHA, f"Checksum char {char} not in safe alphabet"
        
        # Verify email_status is 'queued' (no RESEND_API_KEY)
        assert order["email_status"] == "queued", f"Expected email_status='queued', got {order['email_status']}"
        
        # Verify no _id in response
        assert "_id" not in order
        
        # Verify email_preview_html is substantial
        html = data["email_preview_html"]
        assert len(html) > 1000, f"Email HTML should be >1000 chars, got {len(html)}"
        assert "LUCCCA Pastry" in html
        assert order_no in html
        
        print(f"Created order: {order_no}, email_status={order['email_status']}")
        return order_no

    def test_create_order_different_numbers_same_customer_date(self):
        """Same customer name and pickup date should generate DIFFERENT order numbers"""
        payload = {
            "design_name": "TEST_Uniqueness Test Cake",
            "client": {"name": "Alice Smith", "email": "alice@example.com"},
            "pickup_date": "2026-06-20",
            "tiers": [],
            "decorations": [],
            "total_servings": 20,
            "send_email": False,
            "create_deposit_link": False
        }
        
        # Create first order
        resp1 = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert resp1.status_code == 200
        order1 = resp1.json()["order"]["order_number"]
        
        # Create second order with same customer/date
        resp2 = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert resp2.status_code == 200
        order2 = resp2.json()["order"]["order_number"]
        
        # Order numbers must be different (uniqueness via checksum salt)
        assert order1 != order2, f"Order numbers should be unique: {order1} vs {order2}"
        
        # Both should have same prefix (CK-AS-260620-) - 13 chars
        assert order1[:13] == order2[:13], f"Same customer/date should have same prefix: {order1[:13]} vs {order2[:13]}"
        
        # Checksums should differ (last 3 chars)
        assert order1[-3:] != order2[-3:], f"Checksums should be different: {order1[-3:]} vs {order2[-3:]}"
        
        print(f"Uniqueness verified: {order1} != {order2}")

    def test_create_order_single_name_initials(self):
        """Single name customer should get X as second initial"""
        payload = {
            "design_name": "TEST_Single Name Cake",
            "client": {"name": "Madonna"},
            "pickup_date": "2026-07-01",
            "tiers": [],
            "decorations": [],
            "total_servings": 10,
            "send_email": False,
            "create_deposit_link": False
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert response.status_code == 200
        order_no = response.json()["order"]["order_number"]
        
        # Single name "Madonna" -> MX
        parts = order_no.split("-")
        assert parts[1] == "MX", f"Single name should produce MX initials, got {parts[1]}"
        print(f"Single name initials: {order_no}")

    def test_create_order_with_deposit_link_graceful_failure(self):
        """create_deposit_link:true should NOT crash with placeholder Stripe key"""
        payload = {
            "design_name": "TEST_Deposit Link Cake",
            "client": {"name": "Bob Wilson", "email": "bob@example.com"},
            "pickup_date": "2026-08-15",
            "tiers": [{"tier": 1, "shape": "round", "diameter": 8, "flavor": "Chocolate"}],
            "decorations": [],
            "total_servings": 25,
            "costing": {"suggested_price": 300.00},
            "deposit_amount": 150.00,
            "send_email": False,
            "create_deposit_link": True  # This should fail gracefully
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        # Should NOT crash - graceful degradation
        assert response.status_code == 200, f"Should not crash with invalid Stripe key: {response.text}"
        
        data = response.json()
        order = data["order"]
        
        # deposit_link should be null (Stripe call failed gracefully)
        assert order["deposit_link"] is None, f"deposit_link should be null, got {order['deposit_link']}"
        
        print(f"Graceful Stripe failure: deposit_link={order['deposit_link']}")

    def test_create_order_no_email_when_send_email_false(self):
        """send_email:false should not queue email"""
        payload = {
            "design_name": "TEST_No Email Cake",
            "client": {"name": "Carol Davis", "email": "carol@example.com"},
            "pickup_date": "2026-09-01",
            "tiers": [],
            "decorations": [],
            "total_servings": 15,
            "send_email": False,
            "create_deposit_link": False
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert response.status_code == 200
        order = response.json()["order"]
        
        # email_status should be 'pending' (not queued because send_email=false)
        assert order["email_status"] == "pending", f"Expected pending, got {order['email_status']}"
        print(f"No email queued: email_status={order['email_status']}")

    def test_create_order_no_client_email(self):
        """Order without client email should not queue email"""
        payload = {
            "design_name": "TEST_No Client Email Cake",
            "client": {"name": "Dan Evans"},  # No email
            "pickup_date": "2026-09-15",
            "tiers": [],
            "decorations": [],
            "total_servings": 10,
            "send_email": True,  # Even with send_email=true
            "create_deposit_link": False
        }
        
        response = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert response.status_code == 200
        order = response.json()["order"]
        
        # email_status should be 'pending' (no email to send to)
        assert order["email_status"] == "pending", f"Expected pending without client email, got {order['email_status']}"
        print(f"No client email: email_status={order['email_status']}")


class TestCakeOrdersPOSOutbound:
    """Test POS outbound queue functionality"""

    def test_pos_outbound_queue_has_pending_items(self):
        """GET /api/cake-orders/pos/outbound?status=pending returns queued items"""
        response = requests.get(f"{BASE_URL}/api/cake-orders/pos/outbound?status=pending")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        
        # Should have items from previous tests
        if data["total"] > 0:
            item = data["items"][0]
            assert "id" in item
            assert "order_number" in item
            assert "status" in item
            assert item["status"] == "pending"
            assert "_id" not in item
            print(f"POS outbound has {data['total']} pending items")
        else:
            print("POS outbound queue is empty (may need to create orders first)")

    def test_pos_outbound_mark_delivered(self):
        """POST /api/cake-orders/pos/outbound/{id}/mark-delivered updates status"""
        # First get a pending item
        resp = requests.get(f"{BASE_URL}/api/cake-orders/pos/outbound?status=pending&limit=1")
        assert resp.status_code == 200
        items = resp.json()["items"]
        
        if not items:
            pytest.skip("No pending POS items to mark delivered")
        
        item_id = items[0]["id"]
        
        # Mark as delivered
        mark_resp = requests.post(f"{BASE_URL}/api/cake-orders/pos/outbound/{item_id}/mark-delivered")
        assert mark_resp.status_code == 200
        assert mark_resp.json()["success"] == True
        
        # Verify it's now delivered
        delivered_resp = requests.get(f"{BASE_URL}/api/cake-orders/pos/outbound?status=delivered")
        assert delivered_resp.status_code == 200
        delivered_items = delivered_resp.json()["items"]
        delivered_ids = [i["id"] for i in delivered_items]
        assert item_id in delivered_ids, f"Item {item_id} should be in delivered list"
        
        print(f"Marked {item_id} as delivered")

    def test_pos_outbound_mark_delivered_404(self):
        """Mark nonexistent item returns 404"""
        response = requests.post(f"{BASE_URL}/api/cake-orders/pos/outbound/nonexistent-id/mark-delivered")
        assert response.status_code == 404


class TestCakeOrdersEmailOutbox:
    """Test email outbox functionality"""

    def test_email_outbox_queued_items(self):
        """GET /api/cake-orders/email/outbox?status=queued returns queued emails"""
        response = requests.get(f"{BASE_URL}/api/cake-orders/email/outbox?status=queued")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert "resend_configured" in data
        
        # resend_configured should be False
        assert data["resend_configured"] == False
        
        if data["total"] > 0:
            item = data["items"][0]
            assert "id" in item
            assert "order_number" in item
            assert "to" in item
            assert "subject" in item
            assert "html" in item
            assert "status" in item
            assert item["status"] == "queued"
            assert "_id" not in item
            assert len(item["html"]) > 1000, "Email HTML should be substantial"
            print(f"Email outbox has {data['total']} queued emails, resend_configured={data['resend_configured']}")
        else:
            print("Email outbox is empty")


class TestCakeOrdersListAndGet:
    """Test list and get order endpoints"""

    def test_list_orders_sorted_desc(self):
        """GET /api/cake-orders/ returns orders sorted by created_at desc"""
        response = requests.get(f"{BASE_URL}/api/cake-orders/")
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        assert "total" in data
        
        orders = data["orders"]
        if len(orders) >= 2:
            # Verify descending order by created_at
            for i in range(len(orders) - 1):
                assert orders[i]["created_at"] >= orders[i+1]["created_at"], "Orders should be sorted desc by created_at"
        
        # Verify no _id in any order
        for order in orders:
            assert "_id" not in order
        
        print(f"Listed {data['total']} orders, sorted desc by created_at")

    def test_get_order_by_number(self):
        """GET /api/cake-orders/{order_number} returns specific order"""
        # First create an order to get
        payload = {
            "design_name": "TEST_Get Order Test",
            "client": {"name": "Eve Franklin"},
            "pickup_date": "2026-10-01",
            "tiers": [],
            "decorations": [],
            "total_servings": 10,
            "send_email": False,
            "create_deposit_link": False
        }
        create_resp = requests.post(f"{BASE_URL}/api/cake-orders/", json=payload)
        assert create_resp.status_code == 200
        order_no = create_resp.json()["order"]["order_number"]
        
        # Get the order
        get_resp = requests.get(f"{BASE_URL}/api/cake-orders/{order_no}")
        assert get_resp.status_code == 200
        order = get_resp.json()
        
        assert order["order_number"] == order_no
        assert order["design_name"] == "TEST_Get Order Test"
        assert "_id" not in order
        
        print(f"Retrieved order: {order_no}")

    def test_get_order_404(self):
        """GET nonexistent order returns 404"""
        response = requests.get(f"{BASE_URL}/api/cake-orders/CK-XX-999999-ZZZ")
        assert response.status_code == 404


class TestCakeOrdersPreviewSample:
    """Test preview/sample endpoint"""

    def test_preview_sample_returns_order_and_html(self):
        """GET /api/cake-orders/preview/sample returns sample order + rendered HTML"""
        response = requests.get(f"{BASE_URL}/api/cake-orders/preview/sample")
        assert response.status_code == 200
        data = response.json()
        
        assert "order" in data
        assert "html" in data
        
        order = data["order"]
        html = data["html"]
        
        # Verify order structure
        assert "order_number" in order
        assert "design_name" in order
        assert "client" in order
        assert "tiers" in order
        assert len(order["tiers"]) == 3  # Sample has 3 tiers
        
        # Verify HTML is substantial
        assert len(html) > 1000, f"Sample HTML should be >1000 chars, got {len(html)}"
        assert "LUCCCA Pastry" in html
        assert order["order_number"] in html
        
        print(f"Preview sample: order_number={order['order_number']}, html_length={len(html)}")


class TestRegressionProductionSchedules:
    """Regression tests for production-schedules endpoints"""

    def test_production_schedules_summary(self):
        """GET /api/production-schedules/summary still works"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_open" in data
        assert "buckets" in data
        assert "headline" in data
        print(f"Production schedules summary: total_open={data['total_open']}")

    def test_production_schedules_grouped_by_day(self):
        """GET /api/production-schedules/grouped-by-day still works"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/grouped-by-day")
        assert response.status_code == 200
        data = response.json()
        
        assert "groups" in data
        print(f"Production schedules grouped: {len(data['groups'])} groups")

    def test_production_schedules_list(self):
        """GET /api/production-schedules/ still works"""
        response = requests.get(f"{BASE_URL}/api/production-schedules/")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        # Verify no _id leak
        for item in data["items"]:
            assert "_id" not in item
        print(f"Production schedules list: {len(data['items'])} items")


class TestRegressionCakeAssets:
    """Regression tests for cake-assets endpoints"""

    def test_cake_assets_advanced_tools(self):
        """GET /api/cake-assets/advanced-tools returns 10 tools"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/advanced-tools")
        assert response.status_code == 200
        data = response.json()
        
        assert "tools" in data
        assert len(data["tools"]) == 10
        print(f"Advanced tools: {len(data['tools'])} tools")

    def test_cake_assets_airbrush_nozzles(self):
        """GET /api/cake-assets/airbrush-nozzles returns 4 nozzles"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/airbrush-nozzles")
        assert response.status_code == 200
        data = response.json()
        
        assert "nozzles" in data
        assert len(data["nozzles"]) == 4
        print(f"Airbrush nozzles: {len(data['nozzles'])} nozzles")

    def test_cake_assets_textures(self):
        """GET /api/cake-assets/textures returns 15 textures"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/textures")
        assert response.status_code == 200
        data = response.json()
        
        assert "textures" in data
        assert len(data["textures"]) == 15
        print(f"Textures: {len(data['textures'])} textures")

    def test_cake_assets_piping(self):
        """GET /api/cake-assets/piping returns 12 patterns"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/piping")
        assert response.status_code == 200
        data = response.json()
        
        assert "patterns" in data
        assert len(data["patterns"]) == 12
        print(f"Piping patterns: {len(data['patterns'])} patterns")

    def test_cake_assets_flowers(self):
        """GET /api/cake-assets/flowers returns 8 arrangements"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        assert response.status_code == 200
        data = response.json()
        
        assert "flowers" in data
        assert len(data["flowers"]) == 8
        print(f"Flowers: {len(data['flowers'])} arrangements")

    def test_cake_assets_templates(self):
        """GET /api/cake-assets/templates returns templates"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        assert response.status_code == 200
        data = response.json()
        
        assert "templates" in data
        assert len(data["templates"]) > 0
        print(f"Templates: {len(data['templates'])} templates")

    def test_cake_assets_stands(self):
        """GET /api/cake-assets/stands returns 10 stands"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        assert response.status_code == 200
        data = response.json()
        
        assert "stands" in data
        assert len(data["stands"]) == 10
        print(f"Stands: {len(data['stands'])} stands")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
