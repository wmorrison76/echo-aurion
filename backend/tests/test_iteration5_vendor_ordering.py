"""
LUCCCA Enterprise - Iteration 5 Backend Tests
==============================================
Tests for:
1. Vendor Ordering (replacing table ordering)
2. On-Hand Inventory with stock tracking
3. Invoice-to-Inventory pipeline
4. Verify table ordering endpoints are REMOVED
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVendorOrdering:
    """Vendor ordering endpoint tests - replaces table ordering"""
    
    def test_get_vendors_returns_5_vendors(self):
        """GET /api/ordering/vendors should return 5 seeded vendors"""
        response = requests.get(f"{BASE_URL}/api/ordering/vendors")
        assert response.status_code == 200
        data = response.json()
        assert "vendors" in data
        assert len(data["vendors"]) == 5
        
        # Verify expected vendors exist
        vendor_names = [v["name"] for v in data["vendors"]]
        assert "Sysco Foods" in vendor_names
        assert "US Foods" in vendor_names
        assert "Performance Foodservice" in vendor_names
        assert "Restaurant Depot" in vendor_names
        assert "Local Farms Direct" in vendor_names
        
    def test_get_vendor_by_id(self):
        """GET /api/ordering/vendors/{id} should return vendor details"""
        # First get vendors list
        response = requests.get(f"{BASE_URL}/api/ordering/vendors")
        vendors = response.json()["vendors"]
        vendor_id = vendors[0]["id"]
        
        # Get specific vendor
        response = requests.get(f"{BASE_URL}/api/ordering/vendors/{vendor_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == vendor_id
        assert "name" in data
        assert "code" in data
        
    def test_create_vendor_order_with_po_number(self):
        """POST /api/ordering/vendor-orders should create PO with proper structure"""
        # Get a vendor
        response = requests.get(f"{BASE_URL}/api/ordering/vendors")
        vendors = response.json()["vendors"]
        sysco = next(v for v in vendors if v["code"] == "SYSCO")
        
        # Get an ingredient
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand")
        items = response.json()["items"]
        ingredient = items[0]
        
        # Create vendor order
        order_data = {
            "vendor_id": sysco["id"],
            "outlet_id": "main",
            "items": [{
                "ingredient_id": ingredient["id"],
                "name": ingredient["name"],
                "quantity": 5,
                "unit": ingredient["unit"],
                "unit_price": ingredient["unit_cost"]
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/ordering/vendor-orders",
            json=order_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify PO structure
        assert "id" in data
        assert "po_number" in data
        assert data["po_number"].startswith("PO-")
        assert data["vendor_id"] == sysco["id"]
        assert data["vendor_name"] == "Sysco Foods"
        assert data["status"] == "draft"
        assert "subtotal" in data
        assert "tax" in data
        assert "total" in data
        assert len(data["items"]) == 1
        
        return data["id"]
        
    def test_update_vendor_order_status_to_delivered_updates_inventory(self):
        """PUT /api/ordering/vendor-orders/{id}/status to 'delivered' should add items to inventory"""
        # Get vendor and ingredient
        response = requests.get(f"{BASE_URL}/api/ordering/vendors")
        vendors = response.json()["vendors"]
        sysco = next(v for v in vendors if v["code"] == "SYSCO")
        
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand")
        items = response.json()["items"]
        ingredient = items[0]
        initial_stock = ingredient["current_stock"]
        
        # Create order
        order_data = {
            "vendor_id": sysco["id"],
            "outlet_id": "main",
            "items": [{
                "ingredient_id": ingredient["id"],
                "name": ingredient["name"],
                "quantity": 3,
                "unit": ingredient["unit"],
                "unit_price": ingredient["unit_cost"]
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/ordering/vendor-orders", json=order_data)
        order_id = response.json()["id"]
        
        # Update status to delivered
        response = requests.put(
            f"{BASE_URL}/api/ordering/vendor-orders/{order_id}/status",
            json={"status": "delivered"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["status"] == "delivered"
        
        # Verify inventory was updated
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand")
        items = response.json()["items"]
        updated_ingredient = next(i for i in items if i["id"] == ingredient["id"])
        assert updated_ingredient["current_stock"] == initial_stock + 3
        
    def test_get_vendor_orders_list(self):
        """GET /api/ordering/vendor-orders should return orders list"""
        response = requests.get(f"{BASE_URL}/api/ordering/vendor-orders?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data


class TestOnHandInventory:
    """On-hand inventory endpoint tests"""
    
    def test_get_on_hand_inventory_returns_items_with_stock_levels(self):
        """GET /api/ordering/on-hand should return items with stock tracking fields"""
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total_items" in data
        assert "total_value" in data
        assert "low_stock_count" in data
        assert len(data["items"]) > 0
        
        # Verify item structure
        item = data["items"][0]
        assert "id" in item
        assert "name" in item
        assert "current_stock" in item
        assert "par_level" in item
        assert "unit" in item
        assert "unit_cost" in item
        assert "on_hand_value" in item
        assert "is_low_stock" in item
        assert "stock_pct" in item
        
    def test_get_on_hand_low_stock_filter(self):
        """GET /api/ordering/on-hand?low_stock_only=true should filter low stock items"""
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand?low_stock_only=true")
        assert response.status_code == 200
        data = response.json()
        
        # All returned items should be low stock
        for item in data["items"]:
            assert item["is_low_stock"] == True
            
    def test_get_inventory_history_for_ingredient(self):
        """GET /api/ordering/on-hand/{id}/history should return transaction history"""
        # Get an ingredient
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand")
        items = response.json()["items"]
        ingredient_id = items[0]["id"]
        
        # Get history
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand/{ingredient_id}/history")
        assert response.status_code == 200
        data = response.json()
        
        assert "ingredient" in data
        assert "transactions" in data
        assert "total" in data
        assert data["ingredient"]["id"] == ingredient_id


class TestInvoicePipeline:
    """Invoice-to-inventory pipeline tests"""
    
    def test_invoice_to_inventory_matches_ingredients(self):
        """POST /api/ordering/invoice-to-inventory should match items and create transactions"""
        # Get an ingredient name
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand")
        items = response.json()["items"]
        ingredient = items[0]
        
        # Process invoice
        invoice_data = {
            "vendor": "Test Vendor",
            "outlet_id": "main",
            "invoice_number": "TEST-INV-002",
            "items": [
                {"name": ingredient["name"], "quantity": 2, "unit": ingredient["unit"], "unit_price": ingredient["unit_cost"], "total": 0},
                {"name": "Unknown Item ABC", "quantity": 1, "unit": "ea", "unit_price": 10.0, "total": 10.0}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/ordering/invoice-to-inventory", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "invoice_id" in data
        assert data["matched"] == 1
        assert data["unmatched"] == 1
        assert data["total_items"] == 2
        
        # Verify results
        results = data["results"]
        matched_result = next(r for r in results if r["status"] == "matched")
        assert matched_result["matched_ingredient"] == ingredient["name"]
        assert matched_result["transaction_id"] is not None


class TestOrderingStats:
    """Ordering statistics endpoint tests"""
    
    def test_get_ordering_stats(self):
        """GET /api/ordering/stats should return inventory and purchasing stats"""
        response = requests.get(f"{BASE_URL}/api/ordering/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "inventory" in data
        assert "purchasing" in data
        assert "timestamp" in data
        
        # Verify inventory stats
        inv = data["inventory"]
        assert "total_items" in inv
        assert "total_value" in inv
        assert "low_stock" in inv
        
        # Verify purchasing stats
        purch = data["purchasing"]
        assert "open_orders" in purch
        assert "total_orders" in purch
        assert "pending_value" in purch
        assert "active_vendors" in purch
        assert purch["active_vendors"] == 5


class TestTableOrderingRemoved:
    """Verify table ordering endpoints are REMOVED"""
    
    def test_tables_endpoint_not_found(self):
        """GET /api/ordering/tables should return 404"""
        response = requests.get(f"{BASE_URL}/api/ordering/tables")
        assert response.status_code == 404
        
    def test_table_orders_endpoint_not_found(self):
        """GET /api/ordering/table-orders should return 404"""
        response = requests.get(f"{BASE_URL}/api/ordering/table-orders")
        assert response.status_code == 404


class TestHealthAndBasics:
    """Basic health and connectivity tests"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
    def test_seed_endpoint(self):
        """POST /api/seed should work"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
