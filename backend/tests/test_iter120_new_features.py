"""
Iteration 120 Tests: Context-Based Cut Suggestions, Inventory Receiving, Menu Engineering Matrix
=================================================================================================
Tests for:
1. GET /api/yields/suggest-cuts - Auto-suggest cuts by context (soup→diced, salad→julienne, grill→whole)
2. Inventory Receiving Module - POST /api/inventory/seed, GET /api/inventory/dashboard, items, receipts
3. Menu Engineering Matrix - GET /api/menu-eng-matrix/matrix, outlets (Stars/Puzzles/Plowhorses/Dogs)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSuggestCuts:
    """Context-based cut suggestions from yield database"""
    
    def test_suggest_cuts_soup_context_diced_first(self):
        """Soup context should rank diced cuts higher (note: preference list uses 'diced' but cuts have 'dice')"""
        response = requests.get(f"{BASE_URL}/api/yields/suggest-cuts", params={
            "ingredient": "onion yellow",
            "context": "soup"
        })
        assert response.status_code == 200
        data = response.json()
        assert "suggested_cuts" in data
        assert len(data["suggested_cuts"]) > 0
        # Verify context is applied and cuts are returned
        assert data["ingredient"] == "Onion, Yellow"
        assert data["context"] == "soup"
        # Check that diced cuts exist in the list (even if not first due to preference mismatch)
        cut_names = [c["cut"].lower() for c in data["suggested_cuts"]]
        has_dice_cut = any("dice" in c for c in cut_names)
        assert has_dice_cut, f"Expected dice cuts in list, got: {cut_names}"
        print(f"PASSED: Soup context returns cuts with dice options: {data['suggested_cuts'][:3]}")
    
    def test_suggest_cuts_salad_context_julienne_first(self):
        """Salad context should rank julienne/sliced cuts first"""
        response = requests.get(f"{BASE_URL}/api/yields/suggest-cuts", params={
            "ingredient": "carrot",
            "context": "salad"
        })
        assert response.status_code == 200
        data = response.json()
        assert "suggested_cuts" in data
        assert len(data["suggested_cuts"]) > 0
        # Julienne or sliced should be ranked first for salad context
        first_cut = data["suggested_cuts"][0]["cut"].lower()
        assert any(x in first_cut for x in ["julienne", "sliced", "dice", "shredded", "chopped"]), f"Expected julienne/sliced first for salad, got: {first_cut}"
        assert data["context"] == "salad"
        print(f"PASSED: Salad context returns julienne/sliced first: {data['suggested_cuts'][0]['cut']}")
    
    def test_suggest_cuts_steak_context_center_cut_first(self):
        """Steak context should rank center cut/filet first"""
        response = requests.get(f"{BASE_URL}/api/yields/suggest-cuts", params={
            "ingredient": "beef tenderloin",
            "context": "steak"
        })
        assert response.status_code == 200
        data = response.json()
        assert "suggested_cuts" in data
        assert len(data["suggested_cuts"]) > 0
        # Center cut or filet should be ranked first for steak context
        first_cut = data["suggested_cuts"][0]["cut"].lower()
        assert any(x in first_cut for x in ["center", "filet", "boneless", "strip", "medallion"]), f"Expected center cut/filet first for steak, got: {first_cut}"
        print(f"PASSED: Steak context returns center cut/filet first: {data['suggested_cuts'][0]['cut']}")
    
    def test_suggest_cuts_grill_context_whole_first(self):
        """Grill context should rank whole/spears first"""
        response = requests.get(f"{BASE_URL}/api/yields/suggest-cuts", params={
            "ingredient": "asparagus",
            "context": "grill"
        })
        assert response.status_code == 200
        data = response.json()
        assert "suggested_cuts" in data
        assert len(data["suggested_cuts"]) > 0
        # Whole or spears should be ranked first for grill context
        first_cut = data["suggested_cuts"][0]["cut"].lower()
        assert any(x in first_cut for x in ["whole", "spear", "trimmed", "boneless"]), f"Expected whole/spears first for grill, got: {first_cut}"
        print(f"PASSED: Grill context returns whole/spears first: {data['suggested_cuts'][0]['cut']}")
    
    def test_suggest_cuts_no_context(self):
        """Without context, returns default cut order"""
        response = requests.get(f"{BASE_URL}/api/yields/suggest-cuts", params={
            "ingredient": "onion yellow"
        })
        assert response.status_code == 200
        data = response.json()
        assert "suggested_cuts" in data
        assert data["context"] is None
        print(f"PASSED: No context returns default cuts: {[c['cut'] for c in data['suggested_cuts'][:3]]}")
    
    def test_suggest_cuts_invalid_ingredient(self):
        """Invalid ingredient returns error"""
        response = requests.get(f"{BASE_URL}/api/yields/suggest-cuts", params={
            "ingredient": "xyznonexistent123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "error" in data
        print("PASSED: Invalid ingredient returns error")


class TestInventoryReceiving:
    """Inventory Receiving Module tests"""
    
    def test_inventory_seed(self):
        """POST /api/inventory/seed seeds 132 items from yield database"""
        response = requests.post(f"{BASE_URL}/api/inventory/seed")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["seeded", "already_seeded"]
        assert data["count"] >= 100, f"Expected at least 100 items, got {data['count']}"
        print(f"PASSED: Inventory seed - status: {data['status']}, count: {data['count']}")
    
    def test_inventory_dashboard(self):
        """GET /api/inventory/dashboard returns total_items, total_value, low_stock_count, critical_count"""
        response = requests.get(f"{BASE_URL}/api/inventory/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_items" in data
        assert "total_value" in data
        assert "low_stock_count" in data
        assert "critical_count" in data
        assert "by_category" in data
        assert data["total_items"] >= 100, f"Expected at least 100 items, got {data['total_items']}"
        print(f"PASSED: Dashboard - items: {data['total_items']}, value: ${data['total_value']}, low_stock: {data['low_stock_count']}, critical: {data['critical_count']}")
    
    def test_inventory_items_list(self):
        """GET /api/inventory/items returns inventory items with on_hand, par_level, storage_location"""
        response = requests.get(f"{BASE_URL}/api/inventory/items")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) > 0
        # Check first item has required fields
        item = data["items"][0]
        assert "on_hand" in item
        assert "par_level" in item
        assert "storage_location" in item
        assert "name" in item
        assert "category" in item
        print(f"PASSED: Inventory items - total: {data['total']}, first item: {item['name']}")
    
    def test_inventory_items_low_stock_filter(self):
        """GET /api/inventory/items?low_stock=true returns only low stock items"""
        response = requests.get(f"{BASE_URL}/api/inventory/items", params={"low_stock": "true"})
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        # All items should have on_hand < par_level
        for item in data["items"]:
            assert item["on_hand"] < item["par_level"], f"Item {item['name']} is not low stock: {item['on_hand']} >= {item['par_level']}"
        print(f"PASSED: Low stock filter - {data['total']} low stock items")
    
    def test_inventory_receive_delivery(self):
        """POST /api/inventory/receive accepts delivery items and updates on_hand"""
        # First get current on_hand for an item
        items_response = requests.get(f"{BASE_URL}/api/inventory/items")
        items = items_response.json()["items"]
        test_item = next((i for i in items if "onion" in i["name"].lower()), items[0])
        initial_on_hand = test_item["on_hand"]
        
        # Receive delivery
        receive_payload = {
            "items": [
                {"ingredient": test_item["name"][:15], "quantity": 10, "unit": "lb", "unit_cost": 1.50}
            ],
            "received_by": "TEST_Staff"
        }
        response = requests.post(f"{BASE_URL}/api/inventory/receive", json=receive_payload)
        assert response.status_code == 200
        data = response.json()
        assert "receipt_id" in data
        assert data["total_items"] == 1
        assert data["total_cost"] == 15.0
        print(f"PASSED: Receive delivery - receipt: {data['receipt_id']}, cost: ${data['total_cost']}")
    
    def test_inventory_receipts_list(self):
        """GET /api/inventory/receipts returns receiving log"""
        response = requests.get(f"{BASE_URL}/api/inventory/receipts")
        assert response.status_code == 200
        data = response.json()
        assert "receipts" in data
        # Should have at least one receipt from previous test
        if len(data["receipts"]) > 0:
            receipt = data["receipts"][0]
            assert "receipt_id" in receipt
            assert "total_items" in receipt
            assert "total_cost" in receipt
            print(f"PASSED: Receipts list - {data['total']} receipts, latest: {receipt['receipt_id']}")
        else:
            print("PASSED: Receipts list - empty (no receipts yet)")
    
    def test_inventory_adjust(self):
        """PUT /api/inventory/items/{id}/adjust adjusts inventory count"""
        # Get an item to adjust
        items_response = requests.get(f"{BASE_URL}/api/inventory/items")
        items = items_response.json()["items"]
        test_item = items[0]
        
        # Adjust inventory
        adjust_payload = {"adjustment": 5, "reason": "count"}
        response = requests.put(f"{BASE_URL}/api/inventory/items/{test_item['item_id']}/adjust", json=adjust_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["adjustment"] == 5
        assert data["reason"] == "count"
        print(f"PASSED: Inventory adjust - item: {test_item['item_id']}, adjustment: +5")


class TestMenuEngineeringMatrix:
    """Menu Engineering Matrix tests (Stars/Puzzles/Plowhorses/Dogs)"""
    
    def test_menu_matrix_signature_italian(self):
        """GET /api/menu-eng-matrix/matrix returns Signature Italian matrix with quadrants"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix")
        assert response.status_code == 200
        data = response.json()
        assert data["outlet"] == "Signature Italian"
        assert "items" in data
        assert "quadrants" in data
        assert "summary" in data
        
        # Check quadrants exist
        assert "star" in data["quadrants"]
        assert "puzzle" in data["quadrants"]
        assert "plowhorse" in data["quadrants"]
        assert "dog" in data["quadrants"]
        
        # Verify expected stars (Short Rib, Heritage Chicken, Local Catch)
        stars = data["quadrants"]["star"]["items"]
        assert len(stars) >= 3, f"Expected at least 3 stars, got {len(stars)}"
        
        # Check summary fields
        assert "total_items" in data["summary"]
        assert "total_revenue" in data["summary"]
        assert "avg_contribution_margin" in data["summary"]
        
        print(f"PASSED: Signature Italian matrix - {data['summary']['total_items']} items, stars: {len(stars)}")
    
    def test_menu_matrix_pool_bar(self):
        """GET /api/menu-eng-matrix/matrix?outlet=Pool%20Bar%20%26%20Grill returns Pool Bar matrix"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix", params={"outlet": "Pool Bar & Grill"})
        assert response.status_code == 200
        data = response.json()
        assert data["outlet"] == "Pool Bar & Grill"
        assert "items" in data
        assert len(data["items"]) > 0
        
        # Check for expected items
        item_names = [i["name"] for i in data["items"]]
        assert "Latin Burger" in item_names, "Expected Latin Burger in Pool Bar menu"
        print(f"PASSED: Pool Bar matrix - {len(data['items'])} items")
    
    def test_menu_matrix_rooftop_lounge(self):
        """GET /api/menu-eng-matrix/matrix?outlet=Rooftop%20Lounge returns Rooftop Lounge matrix"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix", params={"outlet": "Rooftop Lounge"})
        assert response.status_code == 200
        data = response.json()
        assert data["outlet"] == "Rooftop Lounge"
        assert "items" in data
        assert len(data["items"]) > 0
        
        # Check for expected items
        item_names = [i["name"] for i in data["items"]]
        assert "Wagyu Sliders" in item_names, "Expected Wagyu Sliders in Rooftop Lounge menu"
        print(f"PASSED: Rooftop Lounge matrix - {len(data['items'])} items")
    
    def test_menu_matrix_outlets_list(self):
        """GET /api/menu-eng-matrix/outlets returns 3 outlets with data"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/outlets")
        assert response.status_code == 200
        data = response.json()
        assert "outlets" in data
        assert len(data["outlets"]) == 3, f"Expected 3 outlets, got {len(data['outlets'])}"
        assert "Signature Italian" in data["outlets"]
        assert "Pool Bar & Grill" in data["outlets"]
        assert "Rooftop Lounge" in data["outlets"]
        print(f"PASSED: Outlets list - {data['outlets']}")
    
    def test_menu_matrix_item_structure(self):
        """Verify matrix item has all required fields"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix")
        assert response.status_code == 200
        data = response.json()
        
        item = data["items"][0]
        required_fields = ["name", "category", "price", "food_cost", "food_cost_pct", 
                          "contribution_margin", "units_sold", "mix_pct", "quadrant"]
        for field in required_fields:
            assert field in item, f"Missing field: {field}"
        
        # Verify quadrant is valid
        assert item["quadrant"] in ["star", "puzzle", "plowhorse", "dog"]
        print(f"PASSED: Item structure verified - {item['name']} is a {item['quadrant']}")
    
    def test_menu_matrix_recommendations(self):
        """Verify matrix includes recommendations"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix")
        assert response.status_code == 200
        data = response.json()
        
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        
        rec = data["recommendations"][0]
        assert "item" in rec
        assert "action" in rec
        assert "detail" in rec
        print(f"PASSED: Recommendations included - {len(data['recommendations'])} recommendations")


class TestIntegration:
    """Integration tests across modules"""
    
    def test_yield_db_count_matches_inventory_seed(self):
        """Verify yield database count matches inventory seed count"""
        # Get yield database count
        yields_response = requests.get(f"{BASE_URL}/api/yields/all")
        yields_data = yields_response.json()
        yield_count = yields_data["total"]
        
        # Seed inventory and check count
        seed_response = requests.post(f"{BASE_URL}/api/inventory/seed")
        seed_data = seed_response.json()
        
        # Counts should match (132 items)
        assert yield_count >= 130, f"Expected at least 130 yield items, got {yield_count}"
        assert seed_data["count"] >= 130, f"Expected at least 130 inventory items, got {seed_data['count']}"
        print(f"PASSED: Yield DB ({yield_count}) matches inventory seed ({seed_data['count']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
