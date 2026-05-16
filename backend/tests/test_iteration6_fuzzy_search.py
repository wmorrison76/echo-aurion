"""
LUCCCA Enterprise - Iteration 6: Ingredient Fuzzy Search Tests
===============================================================
Tests for the new fuzzy search feature in the Culinary module's recipe ingredients grid.
The search endpoint allows typing in the INGREDIENT input field to fuzzy-search 
the backend inventory and show matching items.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIngredientFuzzySearch:
    """Tests for GET /api/ordering/search-ingredients endpoint"""
    
    def test_search_sal_returns_salmon_and_butter(self):
        """Search 'sal' should return ingredients containing 'sal' (Salmon, Unsalted Butter)"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=sal")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert "query" in data
        assert data["query"] == "sal"
        
        # Should have at least 2 results (Salmon, Unsalted Butter)
        assert len(data["results"]) >= 2
        
        # Verify result structure
        names = [r["name"].lower() for r in data["results"]]
        assert any("salmon" in name for name in names), "Should find Salmon"
        assert any("unsalted" in name for name in names), "Should find Unsalted Butter"
        
        # Verify each result has required fields for autocomplete
        for result in data["results"]:
            assert "id" in result
            assert "name" in result
            assert "unit" in result or "base_unit" in result
            assert "unit_cost" in result or "current_cost" in result
    
    def test_search_a_returns_multiple_results(self):
        """Search 'a' should return 9+ ingredients containing 'a'"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=a")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert len(data["results"]) >= 9, f"Expected 9+ results, got {len(data['results'])}"
        
        # All results should contain 'a' in name (case-insensitive)
        for result in data["results"]:
            assert "a" in result["name"].lower(), f"'{result['name']}' should contain 'a'"
    
    def test_search_empty_returns_all_up_to_limit(self):
        """Empty search should return all ingredients up to limit"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert len(data["results"]) > 0, "Should return some ingredients"
        assert len(data["results"]) <= 10, "Should respect default limit of 10"
    
    def test_search_with_custom_limit(self):
        """Search with custom limit parameter"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["results"]) <= 5, "Should respect custom limit"
    
    def test_search_case_insensitive(self):
        """Search should be case-insensitive"""
        response_lower = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=salmon")
        response_upper = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=SALMON")
        response_mixed = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=SaLmOn")
        
        assert response_lower.status_code == 200
        assert response_upper.status_code == 200
        assert response_mixed.status_code == 200
        
        # All should return same results
        data_lower = response_lower.json()
        data_upper = response_upper.json()
        data_mixed = response_mixed.json()
        
        assert len(data_lower["results"]) == len(data_upper["results"]) == len(data_mixed["results"])
    
    def test_search_partial_match(self):
        """Search should match partial strings"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=rib")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["results"]) >= 1
        
        # Should find Ribeye
        names = [r["name"].lower() for r in data["results"]]
        assert any("ribeye" in name for name in names), "Should find Ribeye with 'rib' search"
    
    def test_search_no_results(self):
        """Search with no matches should return empty results"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=xyznonexistent123")
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 0, "Should return empty results for non-matching query"
    
    def test_search_result_has_autocomplete_fields(self):
        """Search results should have all fields needed for autocomplete dropdown"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=butter")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["results"]) >= 1
        
        result = data["results"][0]
        # Required fields for autocomplete
        assert "id" in result, "Result should have id"
        assert "name" in result, "Result should have name"
        
        # Fields for displaying in dropdown
        has_stock = "current_stock" in result
        has_unit = "unit" in result or "base_unit" in result
        has_cost = "unit_cost" in result or "current_cost" in result
        
        assert has_stock, "Result should have current_stock for display"
        assert has_unit, "Result should have unit for display"
        assert has_cost, "Result should have cost for auto-fill"
    
    def test_search_special_characters_escaped(self):
        """Search with special regex characters should be escaped properly"""
        # These characters could break regex if not escaped: . * + ? ^ $ { } [ ] \ | ( )
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=70%25")  # 70%
        assert response.status_code == 200
        
        data = response.json()
        # Should not error, may or may not have results
        assert "results" in data


class TestPreviousOrderingAPIsStillWork:
    """Verify all previous ordering APIs still work after adding fuzzy search"""
    
    def test_vendors_endpoint(self):
        """GET /api/ordering/vendors should still work"""
        response = requests.get(f"{BASE_URL}/api/ordering/vendors")
        assert response.status_code == 200
        
        data = response.json()
        assert "vendors" in data
        assert len(data["vendors"]) >= 5, "Should have 5 vendors"
    
    def test_on_hand_endpoint(self):
        """GET /api/ordering/on-hand should still work"""
        response = requests.get(f"{BASE_URL}/api/ordering/on-hand")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total_items" in data
        assert "total_value" in data
    
    def test_vendor_orders_endpoint(self):
        """GET /api/ordering/vendor-orders should still work"""
        response = requests.get(f"{BASE_URL}/api/ordering/vendor-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
    
    def test_stats_endpoint(self):
        """GET /api/ordering/stats should still work"""
        response = requests.get(f"{BASE_URL}/api/ordering/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "inventory" in data
        assert "purchasing" in data
    
    def test_invoice_to_inventory_endpoint(self):
        """POST /api/ordering/invoice-to-inventory should still work"""
        payload = {
            "vendor": "Test Vendor",
            "outlet_id": "main",
            "items": [
                {"name": "Test Item", "quantity": 1, "unit": "ea", "unit_price": 1.0, "total": 1.0}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/ordering/invoice-to-inventory", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "invoice_id" in data
        assert "results" in data


class TestHealthAndSeed:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Health endpoint should return OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
