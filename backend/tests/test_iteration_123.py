"""
Iteration 123 Backend Tests
===========================
Tests for:
- Menu Engineering Matrix API with real POS sales data
- Seed sales endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMenuEngineeringMatrix:
    """Menu Engineering Matrix endpoint tests - verifies real POS data integration"""
    
    def test_matrix_endpoint_returns_data(self):
        """Test /api/menu-eng-matrix/matrix returns valid data"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "outlet" in data, "Response should have 'outlet' field"
        assert "items" in data, "Response should have 'items' field"
        assert "summary" in data, "Response should have 'summary' field"
        assert "quadrants" in data, "Response should have 'quadrants' field"
        assert "data_source" in data, "Response should have 'data_source' field"
        
        print(f"✓ Matrix endpoint returned data for outlet: {data['outlet']}")
        print(f"  Data source: {data['data_source']}")
        print(f"  Total items: {len(data['items'])}")
    
    def test_matrix_uses_pos_database(self):
        """Test that matrix uses real POS database data"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix")
        assert response.status_code == 200
        
        data = response.json()
        # Should use pos_database when POS items exist
        assert data["data_source"] == "pos_database", f"Expected pos_database, got {data['data_source']}"
        print(f"✓ Matrix uses real POS database")
    
    def test_matrix_items_have_units_sold(self):
        """Test that matrix items have units_sold from pos_transactions"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix")
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        assert len(items) > 0, "Should have at least one item"
        
        # Check that items have units_sold field
        for item in items[:5]:  # Check first 5 items
            assert "units_sold" in item, f"Item {item.get('name')} missing units_sold"
            assert isinstance(item["units_sold"], (int, float)), "units_sold should be numeric"
            print(f"  {item['name']}: {item['units_sold']} units sold")
        
        print(f"✓ Items have units_sold data")
    
    def test_matrix_quadrant_classification(self):
        """Test that items are classified into quadrants"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix")
        assert response.status_code == 200
        
        data = response.json()
        quadrants = data.get("quadrants", {})
        
        # Should have all 4 quadrants
        expected_quadrants = ["star", "puzzle", "plowhorse", "dog"]
        for q in expected_quadrants:
            assert q in quadrants, f"Missing quadrant: {q}"
            print(f"  {q}: {quadrants[q]['count']} items")
        
        print(f"✓ All quadrants present")
    
    def test_outlets_endpoint(self):
        """Test /api/menu-eng-matrix/outlets returns available outlets"""
        response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/outlets")
        assert response.status_code == 200
        
        data = response.json()
        assert "outlets" in data, "Response should have 'outlets' field"
        assert "source" in data, "Response should have 'source' field"
        assert len(data["outlets"]) > 0, "Should have at least one outlet"
        
        print(f"✓ Outlets endpoint returned: {data['outlets']}")
        print(f"  Source: {data['source']}")
    
    def test_seed_sales_endpoint(self):
        """Test /api/menu-eng-matrix/seed-sales endpoint"""
        response = requests.post(f"{BASE_URL}/api/menu-eng-matrix/seed-sales")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data, "Response should have 'status' field"
        assert "transactions" in data, "Response should have 'transactions' field"
        
        # Should be already seeded or newly seeded
        assert data["status"] in ["already_seeded", "seeded", "no_pos_items"]
        print(f"✓ Seed sales endpoint: {data['status']}, {data['transactions']} transactions")
    
    def test_matrix_with_specific_outlet(self):
        """Test matrix endpoint with specific outlet parameter"""
        # First get available outlets
        outlets_response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/outlets")
        outlets = outlets_response.json().get("outlets", [])
        
        if outlets:
            outlet = outlets[0]
            response = requests.get(f"{BASE_URL}/api/menu-eng-matrix/matrix?outlet={outlet}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["outlet"] == outlet, f"Expected outlet {outlet}, got {data['outlet']}"
            print(f"✓ Matrix for specific outlet '{outlet}' works")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_accessible(self):
        """Test that API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint might not exist, so check for any valid response
        assert response.status_code in [200, 404], f"API not accessible: {response.status_code}"
        print(f"✓ API is accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
