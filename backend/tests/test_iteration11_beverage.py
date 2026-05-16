"""
Iteration 11 - Beverage Intelligence Engine Tests
=================================================
Tests for: Pour tracking, variance analysis, cocktail costing,
cellar monitoring, comped drinks tracking.
Also regression tests for previously working endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint"""
    
    def test_health_returns_healthy(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"PASS: Health check - status: {data.get('status')}")


class TestBeverageInventory:
    """Beverage inventory CRUD and filtering tests"""
    
    def test_list_inventory_returns_10_spirits(self):
        """GET /api/beverage/inventory returns 10 seeded spirits with stats"""
        response = requests.get(f"{BASE_URL}/api/beverage/inventory")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "items" in data
        assert "total" in data
        assert "total_value" in data
        assert "total_bottles" in data
        assert "low_stock_count" in data
        assert "avg_pour_cost" in data
        
        # Verify 10 seeded spirits
        assert data["total"] >= 10, f"Expected at least 10 spirits, got {data['total']}"
        
        # Verify item structure
        if data["items"]:
            item = data["items"][0]
            assert "id" in item
            assert "name" in item
            assert "spirit_type" in item
            assert "retail_price" in item
            assert "cost_price" in item
            assert "total_qty" in item
        
        print(f"PASS: Inventory returns {data['total']} spirits, total_value: ${data['total_value']}")
    
    def test_filter_by_spirit_type_tequila(self):
        """GET /api/beverage/inventory?spirit_type=Tequila returns only tequila items"""
        response = requests.get(f"{BASE_URL}/api/beverage/inventory?spirit_type=Tequila")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1, "Expected at least 1 tequila item"
        
        # Verify all items are Tequila
        for item in data["items"]:
            assert item["spirit_type"] == "Tequila", f"Expected Tequila, got {item['spirit_type']}"
        
        print(f"PASS: Tequila filter returns {data['total']} items")
    
    def test_search_by_name_macallan(self):
        """GET /api/beverage/inventory?q=macallan returns Macallan 18"""
        response = requests.get(f"{BASE_URL}/api/beverage/inventory?q=macallan")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1, "Expected at least 1 Macallan item"
        
        # Verify Macallan is in results
        names = [item["name"].lower() for item in data["items"]]
        assert any("macallan" in name for name in names), "Macallan not found in results"
        
        print(f"PASS: Search 'macallan' returns {data['total']} items")
    
    def test_get_single_item_with_pour_history(self):
        """GET /api/beverage/inventory/{item_id} returns item with pour history"""
        response = requests.get(f"{BASE_URL}/api/beverage/inventory/spr-1")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["id"] == "spr-1"
        assert "name" in data
        assert "pour_history" in data
        assert isinstance(data["pour_history"], list)
        
        print(f"PASS: Single item spr-1 returns with pour_history array")
    
    def test_get_nonexistent_item_returns_404(self):
        """GET /api/beverage/inventory/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/beverage/inventory/nonexistent-item")
        assert response.status_code == 404
        print("PASS: Nonexistent item returns 404")


class TestPourTracking:
    """Pour logging and tracking tests"""
    
    def test_log_pour_decrements_inventory(self):
        """POST /api/beverage/pour logs a pour and decrements inventory"""
        # Get initial inventory
        inv_before = requests.get(f"{BASE_URL}/api/beverage/inventory/spr-3").json()
        initial_qty = inv_before.get("total_qty", 0)
        
        # Log a pour
        pour_data = {
            "item_id": "spr-3",
            "outlet_id": "sky-bar",
            "pours": 1,
            "bartender": "TEST_bartender"
        }
        response = requests.post(f"{BASE_URL}/api/beverage/pour", json=pour_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify pour log structure
        assert "id" in data
        assert data["item_id"] == "spr-3"
        assert data["pours"] == 1
        assert "revenue" in data
        assert "cost" in data
        assert "timestamp" in data
        assert data["is_comp"] == False
        
        # Verify inventory decremented
        inv_after = requests.get(f"{BASE_URL}/api/beverage/inventory/spr-3").json()
        new_qty = inv_after.get("total_qty", 0)
        assert new_qty < initial_qty, f"Inventory should decrease: {initial_qty} -> {new_qty}"
        
        print(f"PASS: Pour logged, inventory decreased from {initial_qty} to {new_qty}")
    
    def test_log_comped_pour(self):
        """POST /api/beverage/pour with is_comp=true logs a comped drink"""
        pour_data = {
            "item_id": "spr-5",
            "outlet_id": "pool-bar",
            "pours": 1,
            "bartender": "TEST_bartender",
            "is_comp": True,
            "comp_reason": "TEST_vip_guest"
        }
        response = requests.post(f"{BASE_URL}/api/beverage/pour", json=pour_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_comp"] == True
        assert data["comp_reason"] == "TEST_vip_guest"
        assert data["revenue"] == 0, "Comped drinks should have 0 revenue"
        assert data["cost"] > 0, "Comped drinks should still have cost"
        
        print(f"PASS: Comped pour logged with reason '{data['comp_reason']}', cost: ${data['cost']}")
    
    def test_list_pours_returns_history(self):
        """GET /api/beverage/pours returns pour history with revenue and cost"""
        response = requests.get(f"{BASE_URL}/api/beverage/pours")
        assert response.status_code == 200
        data = response.json()
        
        assert "pours" in data
        assert "total" in data
        assert "total_revenue" in data
        assert "total_cost" in data
        assert "pour_cost_pct" in data
        assert "comp_count" in data
        assert "comp_value" in data
        
        print(f"PASS: Pours list returns {data['total']} pours, revenue: ${data['total_revenue']}, cost: ${data['total_cost']}")
    
    def test_pour_invalid_item_returns_404(self):
        """POST /api/beverage/pour with invalid item_id returns 404"""
        pour_data = {
            "item_id": "invalid-item",
            "pours": 1
        }
        response = requests.post(f"{BASE_URL}/api/beverage/pour", json=pour_data)
        assert response.status_code == 404
        print("PASS: Pour with invalid item returns 404")


class TestVarianceAnalysis:
    """Variance analysis tests"""
    
    def test_variance_returns_all_items(self):
        """GET /api/beverage/variance returns variance analysis for all items"""
        response = requests.get(f"{BASE_URL}/api/beverage/variance")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total_items" in data
        assert "total_revenue" in data
        assert "total_cost" in data
        assert "overall_pour_cost" in data
        assert "items_with_variance" in data
        
        # Verify item structure
        if data["items"]:
            item = data["items"][0]
            assert "item_id" in item
            assert "name" in item
            assert "theoretical_pours" in item
            assert "actual_pours" in item
            assert "variance_pct" in item
            assert "variance_status" in item
        
        print(f"PASS: Variance analysis returns {data['total_items']} items, {data['items_with_variance']} with variance")


class TestCellarMonitoring:
    """Cellar temperature monitoring tests"""
    
    def test_cellar_status_returns_6_zones_with_alert(self):
        """GET /api/beverage/cellar-status returns 6 zones with 1 alert"""
        response = requests.get(f"{BASE_URL}/api/beverage/cellar-status")
        assert response.status_code == 200
        data = response.json()
        
        assert "zones" in data
        assert "total_zones" in data
        assert "alerts" in data
        assert "overall_status" in data
        
        assert data["total_zones"] == 6, f"Expected 6 zones, got {data['total_zones']}"
        assert data["alerts"] >= 1, f"Expected at least 1 alert, got {data['alerts']}"
        
        # Verify zone structure
        zone = data["zones"][0]
        assert "zone" in zone
        assert "current_temp" in zone
        assert "optimal_min" in zone
        assert "optimal_max" in zone
        assert "status" in zone
        
        # Find the alert zone
        alert_zones = [z for z in data["zones"] if z["status"] == "alert"]
        assert len(alert_zones) >= 1, "Expected at least 1 alert zone"
        
        print(f"PASS: Cellar status returns {data['total_zones']} zones, {data['alerts']} alerts")


class TestCompsSummary:
    """Comped drinks summary tests"""
    
    def test_comps_summary_returns_count_and_cost(self):
        """GET /api/beverage/comps-summary returns comp count and cost by reason"""
        response = requests.get(f"{BASE_URL}/api/beverage/comps-summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_comps" in data
        assert "total_cost" in data
        assert "by_reason" in data
        assert "recent" in data
        
        print(f"PASS: Comps summary returns {data['total_comps']} comps, total cost: ${data['total_cost']}")


class TestCocktailRecipes:
    """Cocktail recipe and costing tests"""
    
    def test_create_cocktail_recipe_with_cost_calculation(self):
        """POST /api/beverage/cocktail-recipes creates recipe with cost calculation"""
        recipe_data = {
            "name": "TEST_Margarita",
            "category": "cocktail",
            "ingredients": [
                {"item_id": "spr-1", "oz_amount": 2.0},  # Clase Azul Reposado
                {"item_id": "spr-3", "oz_amount": 0.5}   # Grey Goose (for testing)
            ],
            "retail_price": 18.00,
            "garnish": "lime wheel",
            "glass_type": "coupe",
            "method": "shaken"
        }
        response = requests.post(f"{BASE_URL}/api/beverage/cocktail-recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "TEST_Margarita"
        assert "ingredients" in data
        assert "total_cost" in data
        assert "pour_cost_pct" in data
        assert "margin" in data
        assert data["total_cost"] > 0, "Recipe should have calculated cost"
        
        # Verify ingredients have costs
        for ing in data["ingredients"]:
            assert "cost" in ing
            assert ing["cost"] >= 0
        
        print(f"PASS: Cocktail recipe created with cost: ${data['total_cost']}, margin: ${data['margin']}")
    
    def test_list_cocktail_recipes(self):
        """GET /api/beverage/cocktail-recipes returns recipes"""
        response = requests.get(f"{BASE_URL}/api/beverage/cocktail-recipes")
        assert response.status_code == 200
        data = response.json()
        
        assert "recipes" in data
        assert "total" in data
        
        print(f"PASS: Cocktail recipes list returns {data['total']} recipes")


class TestRegressionPreviousEndpoints:
    """Regression tests for previously working endpoints"""
    
    def test_calendar_outlets(self):
        """GET /api/calendar/outlets still works"""
        response = requests.get(f"{BASE_URL}/api/calendar/outlets")
        assert response.status_code == 200
        data = response.json()
        assert "outlets" in data or "data" in data or isinstance(data, list)
        print("PASS: /api/calendar/outlets still works")
    
    def test_rbac_roles(self):
        """GET /api/rbac/roles still works"""
        response = requests.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200
        data = response.json()
        assert "roles" in data
        print("PASS: /api/rbac/roles still works")
    
    def test_procurement_ap_aging(self):
        """GET /api/procurement/ap-aging still works"""
        response = requests.get(f"{BASE_URL}/api/procurement/ap-aging")
        assert response.status_code == 200
        data = response.json()
        assert "aging_buckets" in data or "buckets" in data or "invoices" in data or "summary" in data
        print("PASS: /api/procurement/ap-aging still works")
    
    def test_compliance_haccp_templates(self):
        """GET /api/compliance/haccp-templates still works"""
        response = requests.get(f"{BASE_URL}/api/compliance/haccp-templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        print("PASS: /api/compliance/haccp-templates still works")
    
    def test_finance_real_time_pl(self):
        """GET /api/finance/real-time-pl still works"""
        response = requests.get(f"{BASE_URL}/api/finance/real-time-pl")
        assert response.status_code == 200
        data = response.json()
        assert "revenue" in data or "net_income" in data or "period" in data
        print("PASS: /api/finance/real-time-pl still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
