"""
Iteration 114: POS Auto-Router API Tests
=========================================
Tests for the POS Auto-Routing engine that automatically routes menu items to POS
with chit printer assignments, GL accounts, and revenue centers.

Features tested:
- POST /api/pos-router/seed - Seeds revenue centers, printers, and auto-routes items
- GET /api/pos-router/dashboard - Returns stats with total_pos_items, global_beverages, etc.
- GET /api/pos-router/items - Returns POS items with filtering
- GET /api/pos-router/printers - Returns chit printers
- GET /api/pos-router/revenue-centers - Returns revenue centers
- GET /api/pos-router/global-beverages - Returns global beverage items
- PUT /api/pos-router/items/{item_id}/printer - Sets printer for an item
- GET /api/pos-router/wine-list - Returns wine items
- GET /api/pos-router/supplier-alerts - Returns ingredient shortage alerts
- POST /api/pos-router/items - Creates a manual POS item
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPOSRouterSeed:
    """Test POS Router seeding functionality"""
    
    def test_seed_pos_router(self):
        """POST /api/pos-router/seed creates revenue centers, printers, and auto-routes items"""
        response = requests.post(f"{BASE_URL}/api/pos-router/seed")
        assert response.status_code == 200, f"Seed failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "seeded", f"Expected status 'seeded', got: {data}"
        assert "revenue_centers" in data, "Missing revenue_centers in response"
        assert "chit_printers" in data, "Missing chit_printers in response"
        assert "banquet_items_routed" in data, "Missing banquet_items_routed in response"
        assert "global_beverages_routed" in data, "Missing global_beverages_routed in response"
        
        print(f"✓ Seed completed: {data['revenue_centers']} revenue centers, {data['chit_printers']} printers")
        print(f"  Banquet items routed: {data['banquet_items_routed']}, Global beverages: {data['global_beverages_routed']}")


class TestPOSRouterDashboard:
    """Test POS Router dashboard stats"""
    
    def test_dashboard_returns_stats(self):
        """GET /api/pos-router/dashboard returns stats with total_pos_items, global_beverages, by_source, by_gl_account, by_chit_printer"""
        response = requests.get(f"{BASE_URL}/api/pos-router/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "total_pos_items" in data, "Missing total_pos_items"
        assert "global_beverages" in data, "Missing global_beverages"
        assert "by_source" in data, "Missing by_source"
        assert "by_gl_account" in data, "Missing by_gl_account"
        assert "by_chit_printer" in data, "Missing by_chit_printer"
        assert "chit_printers" in data, "Missing chit_printers count"
        assert "revenue_centers" in data, "Missing revenue_centers count"
        
        # Verify data types
        assert isinstance(data["total_pos_items"], int), "total_pos_items should be int"
        assert isinstance(data["global_beverages"], int), "global_beverages should be int"
        assert isinstance(data["by_source"], dict), "by_source should be dict"
        assert isinstance(data["by_gl_account"], dict), "by_gl_account should be dict"
        assert isinstance(data["by_chit_printer"], dict), "by_chit_printer should be dict"
        
        print(f"✓ Dashboard stats: {data['total_pos_items']} total items, {data['global_beverages']} global beverages")
        print(f"  By source: {data['by_source']}")
        print(f"  By GL: {data['by_gl_account']}")
        print(f"  By printer: {data['by_chit_printer']}")


class TestPOSRouterItems:
    """Test POS Router items listing and filtering"""
    
    def test_list_all_items(self):
        """GET /api/pos-router/items returns POS items"""
        response = requests.get(f"{BASE_URL}/api/pos-router/items")
        assert response.status_code == 200, f"List items failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["items"], list), "items should be a list"
        
        # Verify item structure if items exist
        if data["items"]:
            item = data["items"][0]
            assert "name" in item, "Item missing name"
            assert "source" in item, "Item missing source"
            assert "gl_account" in item, "Item missing gl_account"
            assert "chit_printer" in item, "Item missing chit_printer"
        
        print(f"✓ Listed {data['total']} POS items")
    
    def test_filter_by_source_banquet(self):
        """GET /api/pos-router/items?source=banquet_catalog returns banquet items"""
        response = requests.get(f"{BASE_URL}/api/pos-router/items?source=banquet_catalog")
        assert response.status_code == 200, f"Filter by source failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items array"
        
        # Verify all items have correct source
        for item in data["items"]:
            assert item.get("source") == "banquet_catalog", f"Item has wrong source: {item.get('source')}"
        
        print(f"✓ Banquet catalog items: {data['total']}")
    
    def test_filter_by_source_mixology(self):
        """GET /api/pos-router/items?source=mixology_rd returns cocktail items"""
        response = requests.get(f"{BASE_URL}/api/pos-router/items?source=mixology_rd")
        assert response.status_code == 200, f"Filter by mixology failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items array"
        
        # Verify all items have correct source
        for item in data["items"]:
            assert item.get("source") == "mixology_rd", f"Item has wrong source: {item.get('source')}"
        
        print(f"✓ Mixology R&D items: {data['total']}")
    
    def test_filter_by_global(self):
        """GET /api/pos-router/items?is_global=true returns global beverages"""
        response = requests.get(f"{BASE_URL}/api/pos-router/items?is_global=true")
        assert response.status_code == 200, f"Filter by global failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items array"
        
        # Verify all items are global
        for item in data["items"]:
            assert item.get("is_global") == True, f"Item is not global: {item.get('name')}"
        
        print(f"✓ Global items: {data['total']}")
    
    def test_filter_by_outlet_resolves_printer(self):
        """GET /api/pos-router/items?outlet=pool_bar returns items with effective_printer resolved"""
        response = requests.get(f"{BASE_URL}/api/pos-router/items?outlet=pool_bar")
        assert response.status_code == 200, f"Filter by outlet failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items array"
        
        # Verify effective_printer is resolved for outlet
        if data["items"]:
            item = data["items"][0]
            assert "effective_printer" in item, "Missing effective_printer for outlet query"
        
        print(f"✓ Pool bar items: {data['total']} (with effective_printer resolved)")


class TestPOSRouterPrinters:
    """Test POS Router chit printers"""
    
    def test_list_printers(self):
        """GET /api/pos-router/printers returns 9 chit printers"""
        response = requests.get(f"{BASE_URL}/api/pos-router/printers")
        assert response.status_code == 200, f"List printers failed: {response.text}"
        
        data = response.json()
        assert "printers" in data, "Missing printers array"
        assert "total" in data, "Missing total count"
        
        # Verify printer structure
        if data["printers"]:
            printer = data["printers"][0]
            assert "id" in printer, "Printer missing id"
            assert "name" in printer, "Printer missing name"
            assert "type" in printer, "Printer missing type"
            assert "location" in printer, "Printer missing location"
        
        print(f"✓ Listed {data['total']} chit printers")
        for p in data["printers"]:
            print(f"  - {p['name']} ({p['type']}) @ {p['location']}")


class TestPOSRouterRevenueCenters:
    """Test POS Router revenue centers"""
    
    def test_list_revenue_centers(self):
        """GET /api/pos-router/revenue-centers returns revenue centers"""
        response = requests.get(f"{BASE_URL}/api/pos-router/revenue-centers")
        assert response.status_code == 200, f"List revenue centers failed: {response.text}"
        
        data = response.json()
        assert "revenue_centers" in data, "Missing revenue_centers array"
        assert "total" in data, "Missing total count"
        
        # Verify revenue center structure
        if data["revenue_centers"]:
            rc = data["revenue_centers"][0]
            assert "code" in rc, "Revenue center missing code"
            assert "name" in rc, "Revenue center missing name"
            assert "type" in rc, "Revenue center missing type"
        
        print(f"✓ Listed {data['total']} revenue centers")
        for rc in data["revenue_centers"]:
            print(f"  - {rc['code']}: {rc['name']} ({rc['type']})")


class TestPOSRouterGlobalBeverages:
    """Test POS Router global beverages"""
    
    def test_list_global_beverages(self):
        """GET /api/pos-router/global-beverages returns global beverage items"""
        response = requests.get(f"{BASE_URL}/api/pos-router/global-beverages")
        assert response.status_code == 200, f"List global beverages failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items array"
        assert "total" in data, "Missing total count"
        assert "by_category" in data, "Missing by_category breakdown"
        
        # Verify all items are global
        for item in data["items"]:
            assert item.get("is_global") == True, f"Item is not global: {item.get('name')}"
        
        print(f"✓ Global beverages: {data['total']}")
        print(f"  By category: {data['by_category']}")
    
    def test_global_beverages_with_outlet(self):
        """GET /api/pos-router/global-beverages?outlet=pool_bar resolves effective_printer per outlet"""
        response = requests.get(f"{BASE_URL}/api/pos-router/global-beverages?outlet=pool_bar")
        assert response.status_code == 200, f"Global beverages with outlet failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing items array"
        assert data.get("outlet") == "pool_bar", "Outlet not reflected in response"
        
        # Verify effective_printer is resolved
        if data["items"]:
            item = data["items"][0]
            assert "effective_printer" in item, "Missing effective_printer for outlet query"
        
        print(f"✓ Global beverages for pool_bar: {data['total']} (with effective_printer)")


class TestPOSRouterPrinterAssignment:
    """Test POS Router printer assignment"""
    
    def test_set_item_printer(self):
        """PUT /api/pos-router/items/{item_id}/printer sets printer for an item"""
        # First get an item to update
        items_response = requests.get(f"{BASE_URL}/api/pos-router/items?limit=1")
        assert items_response.status_code == 200, "Failed to get items"
        
        items_data = items_response.json()
        if not items_data.get("items"):
            pytest.skip("No items available to test printer assignment")
        
        item_id = items_data["items"][0].get("item_id")
        if not item_id:
            pytest.skip("Item has no item_id")
        
        # Set printer
        response = requests.put(
            f"{BASE_URL}/api/pos-router/items/{item_id}/printer",
            json={"printer": "bar"}
        )
        assert response.status_code == 200, f"Set printer failed: {response.text}"
        
        data = response.json()
        assert data.get("item_id") == item_id, "item_id mismatch"
        assert data.get("printer") == "bar", "printer not set correctly"
        assert data.get("outlet") == "default", "outlet should be 'default' when not specified"
        
        print(f"✓ Set printer for item {item_id} to 'bar'")
    
    def test_set_item_printer_with_outlet_override(self):
        """PUT /api/pos-router/items/{item_id}/printer with outlet sets per-outlet printer override"""
        # First get an item to update
        items_response = requests.get(f"{BASE_URL}/api/pos-router/items?limit=1")
        assert items_response.status_code == 200, "Failed to get items"
        
        items_data = items_response.json()
        if not items_data.get("items"):
            pytest.skip("No items available to test printer assignment")
        
        item_id = items_data["items"][0].get("item_id")
        if not item_id:
            pytest.skip("Item has no item_id")
        
        # Set printer with outlet override
        response = requests.put(
            f"{BASE_URL}/api/pos-router/items/{item_id}/printer",
            json={"printer": "service_bar", "outlet": "pool_bar"}
        )
        assert response.status_code == 200, f"Set printer with outlet failed: {response.text}"
        
        data = response.json()
        assert data.get("item_id") == item_id, "item_id mismatch"
        assert data.get("printer") == "service_bar", "printer not set correctly"
        assert data.get("outlet") == "pool_bar", "outlet not set correctly"
        
        print(f"✓ Set printer override for item {item_id} at pool_bar to 'service_bar'")
    
    def test_set_printer_nonexistent_item(self):
        """PUT /api/pos-router/items/nonexistent/printer returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/pos-router/items/nonexistent-item-id/printer",
            json={"printer": "bar"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for nonexistent item")


class TestPOSRouterWineList:
    """Test POS Router wine list"""
    
    def test_get_wine_list(self):
        """GET /api/pos-router/wine-list returns wine items"""
        response = requests.get(f"{BASE_URL}/api/pos-router/wine-list")
        assert response.status_code == 200, f"Wine list failed: {response.text}"
        
        data = response.json()
        assert "wines" in data, "Missing wines array"
        assert "total" in data, "Missing total count"
        
        # Verify wine items have correct type
        for wine in data["wines"]:
            assert wine.get("item_type") == "wine", f"Item is not wine: {wine.get('item_type')}"
        
        print(f"✓ Wine list: {data['total']} wines")


class TestPOSRouterSupplierAlerts:
    """Test POS Router supplier shortage alerts"""
    
    def test_get_supplier_alerts(self):
        """GET /api/pos-router/supplier-alerts returns ingredient shortage alerts"""
        response = requests.get(f"{BASE_URL}/api/pos-router/supplier-alerts")
        assert response.status_code == 200, f"Supplier alerts failed: {response.text}"
        
        data = response.json()
        assert "alerts" in data, "Missing alerts array"
        assert "total_alerts" in data, "Missing total_alerts count"
        assert "critical" in data, "Missing critical count"
        assert "warning" in data, "Missing warning count"
        assert "ingredients_tracked" in data, "Missing ingredients_tracked count"
        
        # Verify alert structure if alerts exist
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "ingredient_id" in alert, "Alert missing ingredient_id"
            assert "ingredient_name" in alert, "Alert missing ingredient_name"
            assert "severity" in alert, "Alert missing severity"
            assert "recipes_affected" in alert, "Alert missing recipes_affected"
        
        print(f"✓ Supplier alerts: {data['total_alerts']} total ({data['critical']} critical, {data['warning']} warning)")
        print(f"  Ingredients tracked: {data['ingredients_tracked']}")


class TestPOSRouterManualItem:
    """Test POS Router manual item creation"""
    
    def test_create_manual_pos_item(self):
        """POST /api/pos-router/items creates a manual POS item"""
        test_item = {
            "name": "TEST_Manual Appetizer",
            "display_name": "Test Manual Appetizer",
            "category": "appetizer",
            "item_type": "appetizer_hot",
            "price": 15.99,
            "price_label": "$15.99",
            "price_type": "per_item",
            "revenue_center": "REST",
            "chit_printer": "kitchen_hot",
            "is_global": False,
            "outlets": ["restaurant"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pos-router/items",
            json=test_item
        )
        assert response.status_code == 200, f"Create item failed: {response.text}"
        
        data = response.json()
        assert data.get("name") == test_item["name"], "Name mismatch"
        assert data.get("item_type") == test_item["item_type"], "item_type mismatch"
        assert data.get("price") == test_item["price"], "price mismatch"
        assert data.get("chit_printer") == test_item["chit_printer"], "chit_printer mismatch"
        assert "item_id" in data, "Missing item_id"
        assert "pos_item_code" in data, "Missing pos_item_code"
        assert data.get("source") == "manual", "source should be 'manual'"
        assert data.get("auto_routed") == False, "auto_routed should be False for manual items"
        
        print(f"✓ Created manual POS item: {data['item_id']} ({data['pos_item_code']})")


class TestPOSRouterHealth:
    """Basic health check"""
    
    def test_health_check(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "healthy", f"Unhealthy status: {data}"
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
