"""
LUCCCA Enterprise - Iteration 4 Backend Tests
==============================================
Tests for:
- Table Ordering APIs (GET /api/ordering/tables, POST /api/ordering/orders, etc.)
- Mobile Ordering APIs
- Invoice-to-Inventory Pipeline
- Device Enrollment APIs
- Ordering Stats
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTableOrderingAPIs:
    """Table Ordering endpoint tests"""
    
    def test_get_tables(self):
        """GET /api/ordering/tables - should return tables with zones"""
        response = requests.get(f"{BASE_URL}/api/ordering/tables")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tables" in data, "Response should contain 'tables' key"
        assert "zones" in data, "Response should contain 'zones' key"
        assert "total" in data, "Response should contain 'total' key"
        
        # Verify we have tables (should be 29 based on seed)
        tables = data["tables"]
        assert len(tables) > 0, "Should have at least some tables"
        
        # Verify zones exist
        zones = data["zones"]
        expected_zones = ["Bar", "Main Dining", "Patio", "Private", "VIP"]
        for zone in expected_zones:
            assert zone in zones, f"Zone '{zone}' should exist"
        
        # Verify table structure
        if tables:
            table = tables[0]
            assert "id" in table, "Table should have 'id'"
            assert "number" in table, "Table should have 'number'"
            assert "zone" in table, "Table should have 'zone'"
            assert "status" in table, "Table should have 'status'"
            assert "capacity" in table, "Table should have 'capacity'"
        
        print(f"PASS: GET /api/ordering/tables - {len(tables)} tables, {len(zones)} zones")
    
    def test_get_tables_by_zone(self):
        """GET /api/ordering/tables?zone=Bar - should filter by zone"""
        response = requests.get(f"{BASE_URL}/api/ordering/tables?zone=Bar")
        assert response.status_code == 200
        
        data = response.json()
        tables = data["tables"]
        
        # All returned tables should be in Bar zone
        for table in tables:
            assert table["zone"] == "Bar", f"Table {table['number']} should be in Bar zone"
        
        print(f"PASS: GET /api/ordering/tables?zone=Bar - {len(tables)} Bar tables")
    
    def test_create_order(self):
        """POST /api/ordering/orders - should create a new order"""
        # First get a table
        tables_response = requests.get(f"{BASE_URL}/api/ordering/tables")
        tables = tables_response.json()["tables"]
        available_table = next((t for t in tables if t["status"] == "available"), None)
        
        if not available_table:
            pytest.skip("No available tables for testing")
        
        # Create order
        order_data = {
            "table_id": available_table["id"],
            "order_type": "dine_in",
            "server_name": "Test Server",
            "items": [
                {"name": "Test Item 1", "quantity": 2, "price": 15.99},
                {"name": "Test Item 2", "quantity": 1, "price": 9.99}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ordering/orders",
            json=order_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        order = response.json()
        assert "id" in order, "Order should have 'id'"
        assert order["table_id"] == available_table["id"], "Order should be linked to table"
        assert order["status"] == "open", "New order should be 'open'"
        assert len(order["items"]) == 2, "Order should have 2 items"
        
        # Verify totals calculation
        expected_subtotal = (15.99 * 2) + (9.99 * 1)
        assert abs(order["subtotal"] - expected_subtotal) < 0.01, f"Subtotal should be {expected_subtotal}"
        assert order["tax"] > 0, "Tax should be calculated"
        assert order["total"] > order["subtotal"], "Total should include tax"
        
        # Verify table is now occupied
        table_response = requests.get(f"{BASE_URL}/api/ordering/tables/{available_table['id']}")
        if table_response.status_code == 200:
            table_data = table_response.json()
            assert table_data["table"]["status"] == "occupied", "Table should be occupied"
            assert table_data["table"]["current_order_id"] == order["id"], "Table should have order ID"
        
        print(f"PASS: POST /api/ordering/orders - Order {order['id'][:8]} created, total=${order['total']}")
        return order
    
    def test_add_items_to_order(self):
        """POST /api/ordering/orders/{id}/items - should add items and recalculate totals"""
        # Create an order first
        order = self.test_create_order()
        original_total = order["total"]
        original_items = len(order["items"])
        
        # Add more items
        add_items_data = {
            "items": [
                {"name": "Additional Item", "quantity": 1, "price": 12.50}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ordering/orders/{order['id']}/items",
            json=add_items_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_order = response.json()
        assert len(updated_order["items"]) == original_items + 1, "Should have one more item"
        assert updated_order["total"] > original_total, "Total should increase"
        
        print(f"PASS: POST /api/ordering/orders/{order['id'][:8]}/items - Items added, new total=${updated_order['total']}")
    
    def test_update_order_status(self):
        """PUT /api/ordering/orders/{id}/status - should update order status"""
        # Create an order first
        order = self.test_create_order()
        
        # Update to submitted
        response = requests.put(
            f"{BASE_URL}/api/ordering/orders/{order['id']}/status",
            json={"status": "submitted"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result["success"] == True
        assert result["status"] == "submitted"
        
        # Verify order status changed
        get_response = requests.get(f"{BASE_URL}/api/ordering/orders/{order['id']}")
        if get_response.status_code == 200:
            updated_order = get_response.json()
            assert updated_order["status"] == "submitted"
        
        print(f"PASS: PUT /api/ordering/orders/{order['id'][:8]}/status - Status updated to 'submitted'")
    
    def test_close_order_frees_table(self):
        """PUT /api/ordering/orders/{id}/status to 'closed' should free the table"""
        # Create an order first
        order = self.test_create_order()
        table_id = order["table_id"]
        
        # Close the order
        response = requests.put(
            f"{BASE_URL}/api/ordering/orders/{order['id']}/status",
            json={"status": "closed"}
        )
        assert response.status_code == 200
        
        # Verify table is now cleaning (not occupied)
        table_response = requests.get(f"{BASE_URL}/api/ordering/tables/{table_id}")
        if table_response.status_code == 200:
            table_data = table_response.json()
            assert table_data["table"]["status"] in ["cleaning", "available"], "Table should be cleaning or available"
            assert table_data["table"]["current_order_id"] is None, "Table should not have order ID"
        
        print(f"PASS: Closing order frees table - Table status updated")


class TestMobileOrderingAPIs:
    """Mobile Ordering endpoint tests"""
    
    def test_get_menu(self):
        """GET /api/ordering/menu - should return menu items with categories"""
        response = requests.get(f"{BASE_URL}/api/ordering/menu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        assert "categories" in data, "Response should contain 'categories'"
        assert "total" in data, "Response should contain 'total'"
        
        print(f"PASS: GET /api/ordering/menu - {len(data['items'])} items, {len(data['categories'])} categories")
    
    def test_create_mobile_order(self):
        """POST /api/ordering/orders with order_type='mobile' - should create mobile order"""
        order_data = {
            "order_type": "mobile",
            "guest_name": "Test Mobile Guest",
            "device_id": "test-device-123",
            "items": [
                {"name": "Mobile Item 1", "quantity": 1, "price": 8.99},
                {"name": "Mobile Item 2", "quantity": 2, "price": 5.99}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ordering/orders",
            json=order_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        order = response.json()
        assert order["order_type"] == "mobile", "Order type should be 'mobile'"
        assert order["guest_name"] == "Test Mobile Guest"
        assert order["table_id"] is None, "Mobile order should not have table_id"
        
        print(f"PASS: POST /api/ordering/orders (mobile) - Order {order['id'][:8]} created")
    
    def test_get_mobile_orders(self):
        """GET /api/ordering/orders?order_type=mobile - should filter mobile orders"""
        # Create a mobile order first
        self.test_create_mobile_order()
        
        response = requests.get(f"{BASE_URL}/api/ordering/orders?order_type=mobile")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        
        # All returned orders should be mobile type
        for order in data["orders"]:
            assert order["order_type"] == "mobile", f"Order {order['id'][:8]} should be mobile type"
        
        print(f"PASS: GET /api/ordering/orders?order_type=mobile - {len(data['orders'])} mobile orders")


class TestInvoiceToInventoryPipeline:
    """Invoice-to-Inventory Pipeline tests"""
    
    def test_invoice_to_inventory(self):
        """POST /api/ordering/invoice-to-inventory - should process invoice and update stock"""
        invoice_data = {
            "vendor": "Test Vendor Co",
            "outlet_id": "main",
            "invoice_number": f"INV-{uuid.uuid4().hex[:8]}",
            "invoice_date": "2026-01-15",
            "items": [
                {"name": "Tomatoes", "quantity": 50, "unit": "lb", "unit_price": 2.50, "total": 125.00},
                {"name": "Olive Oil", "quantity": 10, "unit": "gal", "unit_price": 15.00, "total": 150.00},
                {"name": "Unknown Item XYZ", "quantity": 5, "unit": "ea", "unit_price": 10.00, "total": 50.00}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ordering/invoice-to-inventory",
            json=invoice_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "invoice_id" in result, "Response should contain 'invoice_id'"
        assert "total_items" in result, "Response should contain 'total_items'"
        assert "matched" in result, "Response should contain 'matched'"
        assert "unmatched" in result, "Response should contain 'unmatched'"
        assert "results" in result, "Response should contain 'results'"
        
        assert result["total_items"] == 3, "Should process 3 items"
        assert result["vendor"] == "Test Vendor Co"
        
        # Check results structure
        for item_result in result["results"]:
            assert "item_name" in item_result
            assert "status" in item_result
            assert item_result["status"] in ["matched", "unmatched"]
        
        print(f"PASS: POST /api/ordering/invoice-to-inventory - {result['matched']} matched, {result['unmatched']} unmatched, total_value=${result['total_value']}")


class TestOrderingStats:
    """Ordering Stats endpoint tests"""
    
    def test_get_ordering_stats(self):
        """GET /api/ordering/stats - should return table and order statistics"""
        response = requests.get(f"{BASE_URL}/api/ordering/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify tables stats
        assert "tables" in data, "Response should contain 'tables'"
        tables_stats = data["tables"]
        assert "total" in tables_stats
        assert "occupied" in tables_stats
        assert "available" in tables_stats
        assert "reserved" in tables_stats
        
        # Verify orders stats
        assert "orders" in data, "Response should contain 'orders'"
        orders_stats = data["orders"]
        assert "active" in orders_stats
        assert "total_today" in orders_stats
        assert "closed" in orders_stats
        assert "revenue" in orders_stats
        
        print(f"PASS: GET /api/ordering/stats - Tables: {tables_stats['total']} total, {tables_stats['occupied']} occupied | Orders: {orders_stats['active']} active, ${orders_stats['revenue']} revenue")


class TestDeviceEnrollmentAPIs:
    """Device Enrollment endpoint tests"""
    
    def test_generate_enrollment(self):
        """POST /api/enrollment/generate - should create enrollment token"""
        response = requests.post(f"{BASE_URL}/api/enrollment/generate")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id' (token)"
        assert "status" in data, "Response should contain 'status'"
        assert "created_at" in data, "Response should contain 'created_at'"
        
        assert data["status"] == "pending", "New enrollment should be 'pending'"
        
        print(f"PASS: POST /api/enrollment/generate - Token {data['id'][:12]}... created")
        return data
    
    def test_get_enrollment(self):
        """GET /api/enrollment/{token} - should return enrollment details"""
        # Generate enrollment first
        enrollment = self.test_generate_enrollment()
        token = enrollment["id"]
        
        response = requests.get(f"{BASE_URL}/api/enrollment/{token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == token
        assert data["status"] == "pending"
        
        print(f"PASS: GET /api/enrollment/{token[:12]}... - Status: {data['status']}")
    
    def test_get_enrollment_not_found(self):
        """GET /api/enrollment/{invalid_token} - should return 404"""
        response = requests.get(f"{BASE_URL}/api/enrollment/invalid-token-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: GET /api/enrollment/invalid-token - Returns 404")
    
    def test_activate_enrollment(self):
        """POST /api/enrollment/{token}/activate - should activate enrollment"""
        # Generate enrollment first
        enrollment = self.test_generate_enrollment()
        token = enrollment["id"]
        
        response = requests.post(f"{BASE_URL}/api/enrollment/{token}/activate")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert data["status"] == "activated"
        
        # Verify enrollment is now activated
        get_response = requests.get(f"{BASE_URL}/api/enrollment/{token}")
        if get_response.status_code == 200:
            updated = get_response.json()
            assert updated["status"] == "activated"
        
        print(f"PASS: POST /api/enrollment/{token[:12]}../activate - Enrollment activated")
    
    def test_activate_already_activated(self):
        """POST /api/enrollment/{token}/activate twice - should return 400"""
        # Generate and activate enrollment
        enrollment = self.test_generate_enrollment()
        token = enrollment["id"]
        
        # First activation
        requests.post(f"{BASE_URL}/api/enrollment/{token}/activate")
        
        # Second activation should fail
        response = requests.post(f"{BASE_URL}/api/enrollment/{token}/activate")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("PASS: POST /api/enrollment/activate twice - Returns 400")
    
    def test_list_enrollments(self):
        """GET /api/enrollment/list/all - should list all enrollments"""
        # Generate a few enrollments first
        self.test_generate_enrollment()
        
        response = requests.get(f"{BASE_URL}/api/enrollment/list/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enrollments" in data, "Response should contain 'enrollments'"
        assert "total" in data, "Response should contain 'total'"
        assert len(data["enrollments"]) > 0, "Should have at least one enrollment"
        
        print(f"PASS: GET /api/enrollment/list/all - {data['total']} enrollments")


class TestHealthAndSeeding:
    """Health check and seeding tests"""
    
    def test_health_endpoint(self):
        """GET /api/health - should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy" or "engines_active" in data
        
        print("PASS: GET /api/health - System healthy")
    
    def test_seed_endpoint(self):
        """POST /api/seed - should seed data"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data or "seeded" in data or "message" in data or "status" in data
        
        print("PASS: POST /api/seed - Data seeded")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
