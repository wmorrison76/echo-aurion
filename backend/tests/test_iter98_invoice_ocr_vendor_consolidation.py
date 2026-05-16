"""
Iteration 98: Invoice OCR Panel + Vendor Consolidation Tests
=============================================================
Tests:
1. Vendor scorecards from consolidated pr_vendors collection (12 vendors)
2. Purchasing vendors endpoint using pr_vendors
3. Item mapping catalog (30 items with categories)
4. Item mapping stats
5. Fuzzy matching POST /api/item-mapping/match
6. Approve mapping POST /api/item-mapping/approve
7. List mappings GET /api/item-mapping/mappings
8. Regression: health, enterprise-bi, concierge outlets
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestVendorConsolidation:
    """Test vendor endpoints using consolidated pr_vendors collection"""
    
    def test_vendor_scorecards_returns_vendors(self):
        """GET /api/procurement/vendor-scorecards - returns vendors from pr_vendors"""
        response = requests.get(f"{BASE_URL}/api/procurement/vendor-scorecards")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "scorecards" in data, "Response should have 'scorecards' key"
        assert "total" in data, "Response should have 'total' key"
        # Should have vendors (seeded data)
        print(f"Vendor scorecards: {data['total']} vendors found")
        
    def test_vendor_scorecards_has_expected_fields(self):
        """Verify vendor scorecard structure"""
        response = requests.get(f"{BASE_URL}/api/procurement/vendor-scorecards")
        assert response.status_code == 200
        data = response.json()
        if data["scorecards"]:
            vendor = data["scorecards"][0]
            expected_fields = ["vendor_id", "name", "category", "rating", "total_orders", "total_spend", "status"]
            for field in expected_fields:
                assert field in vendor, f"Vendor should have '{field}' field"
                
    def test_purchasing_vendors_returns_vendors(self):
        """GET /api/purchasing/vendors - returns vendors from pr_vendors"""
        response = requests.get(f"{BASE_URL}/api/purchasing/vendors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "vendors" in data, "Response should have 'vendors' key"
        assert "total" in data, "Response should have 'total' key"
        print(f"Purchasing vendors: {data['total']} vendors found")
        
    def test_purchasing_vendors_has_vendor_id(self):
        """Verify vendors have vendor_id field (not just 'id')"""
        response = requests.get(f"{BASE_URL}/api/purchasing/vendors")
        assert response.status_code == 200
        data = response.json()
        if data["vendors"]:
            vendor = data["vendors"][0]
            assert "vendor_id" in vendor, "Vendor should have 'vendor_id' field"
            assert "name" in vendor, "Vendor should have 'name' field"


class TestItemMappingCatalog:
    """Test item mapping catalog endpoints"""
    
    def test_catalog_returns_items(self):
        """GET /api/item-mapping/catalog - returns items with categories"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        assert "total" in data, "Response should have 'total' key"
        assert "categories" in data, "Response should have 'categories' key"
        print(f"Catalog: {data['total']} items, categories: {data['categories']}")
        
    def test_catalog_has_30_items(self):
        """Catalog should have 30 seeded items"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 30, f"Expected at least 30 items, got {data['total']}"
        
    def test_catalog_item_structure(self):
        """Verify catalog item has required fields"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog")
        assert response.status_code == 200
        data = response.json()
        if data["items"]:
            item = data["items"][0]
            expected_fields = ["item_id", "name", "category", "unit", "par_cost", "gl_code"]
            for field in expected_fields:
                assert field in item, f"Item should have '{field}' field"
                
    def test_catalog_filter_by_category(self):
        """GET /api/item-mapping/catalog?category=seafood - filters by category"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog?category=seafood")
        assert response.status_code == 200
        data = response.json()
        # All items should be seafood category
        for item in data["items"]:
            assert item["category"] == "seafood", f"Expected seafood, got {item['category']}"
        print(f"Seafood items: {len(data['items'])}")


class TestItemMappingStats:
    """Test item mapping stats endpoint"""
    
    def test_stats_returns_data(self):
        """GET /api/item-mapping/stats - returns mapping stats"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "mappings" in data, "Response should have 'mappings' key"
        assert "queue" in data, "Response should have 'queue' key"
        assert "catalog_items" in data, "Response should have 'catalog_items' key"
        assert "learning_rate" in data, "Response should have 'learning_rate' key"
        print(f"Stats: mappings={data['mappings']}, catalog_items={data['catalog_items']}, learning_rate={data['learning_rate']}%")
        
    def test_stats_mappings_structure(self):
        """Verify mappings stats structure"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/stats")
        assert response.status_code == 200
        data = response.json()
        mappings = data["mappings"]
        assert "total" in mappings, "Mappings should have 'total'"
        assert "approved" in mappings, "Mappings should have 'approved'"
        assert "rejected" in mappings, "Mappings should have 'rejected'"


class TestItemMappingMatch:
    """Test fuzzy matching endpoint"""
    
    def test_match_returns_results(self):
        """POST /api/item-mapping/match - fuzzy matching works"""
        payload = {
            "vendor_name": "Blue Harbor Seafood",
            "line_items": [
                {"description": "Atlantic Salmon Fresh", "item_code": "SKU-001", "quantity_shipped": 10, "unit_price": 12.50},
                {"description": "Jumbo Shrimp 16-20ct", "item_code": "SKU-002", "quantity_shipped": 5, "unit_price": 14.80}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        assert "total_items" in data, "Response should have 'total_items' key"
        assert "auto_matched" in data, "Response should have 'auto_matched' key"
        assert "needs_review" in data, "Response should have 'needs_review' key"
        print(f"Match results: {data['total_items']} items, auto_matched={data['auto_matched']}, needs_review={data['needs_review']}")
        
    def test_match_item_has_best_match(self):
        """Verify matched items have best_match with confidence"""
        payload = {
            "vendor_name": "Test Vendor",
            "line_items": [
                {"description": "Beef Tenderloin Prime", "item_code": "SKU-100"}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload)
        assert response.status_code == 200
        data = response.json()
        if data["items"]:
            item = data["items"][0]
            assert "best_match" in item, "Item should have 'best_match'"
            assert "status" in item, "Item should have 'status'"
            if item["best_match"]:
                assert "confidence" in item["best_match"], "Best match should have 'confidence'"
                assert "internal_item_id" in item["best_match"], "Best match should have 'internal_item_id'"
                print(f"Best match: {item['best_match']['internal_item_name']} ({item['best_match']['confidence']}%)")


class TestItemMappingApprove:
    """Test approve mapping endpoint"""
    
    def test_approve_creates_mapping(self):
        """POST /api/item-mapping/approve - creates learned mapping"""
        payload = {
            "vendor_item_code": "TEST-001",
            "vendor_item_desc": "TEST Atlantic Salmon Fillet Fresh",
            "vendor_name": "TEST Vendor",
            "internal_item_id": "cat-001",
            "internal_item_name": "Atlantic Salmon Fillet"
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "status" in data, "Response should have 'status' key"
        assert data["status"] == "approved", f"Expected status 'approved', got {data['status']}"
        assert "mapping" in data, "Response should have 'mapping' key"
        print(f"Approved mapping: {data['mapping'].get('id')}")
        
    def test_approve_mapping_persists(self):
        """Verify approved mapping appears in mappings list"""
        # First approve a mapping
        payload = {
            "vendor_item_code": "TEST-002",
            "vendor_item_desc": "TEST Jumbo Shrimp 16/20",
            "vendor_name": "TEST Vendor Persist",
            "internal_item_id": "cat-002",
            "internal_item_name": "Jumbo Shrimp 16/20"
        }
        approve_response = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=payload)
        assert approve_response.status_code == 200
        
        # Then verify it appears in mappings list
        list_response = requests.get(f"{BASE_URL}/api/item-mapping/mappings?status=approved")
        assert list_response.status_code == 200
        data = list_response.json()
        assert "mappings" in data, "Response should have 'mappings' key"
        # Check if our test mapping is in the list
        found = any(m.get("vendor_item_desc") == "TEST Jumbo Shrimp 16/20" for m in data["mappings"])
        assert found, "Approved mapping should appear in mappings list"


class TestItemMappingsList:
    """Test list mappings endpoint"""
    
    def test_list_mappings_returns_data(self):
        """GET /api/item-mapping/mappings - lists approved mappings"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/mappings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "mappings" in data, "Response should have 'mappings' key"
        assert "total" in data, "Response should have 'total' key"
        assert "approved" in data, "Response should have 'approved' key"
        print(f"Mappings: total={data['total']}, approved={data['approved']}")
        
    def test_list_mappings_filter_by_status(self):
        """GET /api/item-mapping/mappings?status=approved - filters by status"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/mappings?status=approved")
        assert response.status_code == 200
        data = response.json()
        # All mappings should be approved
        for mapping in data["mappings"]:
            assert mapping.get("status") == "approved", f"Expected approved, got {mapping.get('status')}"


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health - returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy" or "healthy" in str(data).lower(), "Health check should return healthy"
        print("Health check: PASSED")
        
    def test_enterprise_bi_str_dashboard(self):
        """GET /api/enterprise-bi/str/dashboard - returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Enterprise BI STR Dashboard: PASSED")
        
    def test_concierge_outlets(self):
        """GET /api/concierge/outlets - returns 200"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "outlets" in data or isinstance(data, list), "Should return outlets data"
        print("Concierge outlets: PASSED")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_mappings(self):
        """Delete TEST_ prefixed mappings"""
        # Get all mappings
        response = requests.get(f"{BASE_URL}/api/item-mapping/mappings?limit=100")
        if response.status_code == 200:
            data = response.json()
            for mapping in data.get("mappings", []):
                if mapping.get("vendor_name", "").startswith("TEST"):
                    mapping_id = mapping.get("id")
                    if mapping_id:
                        requests.delete(f"{BASE_URL}/api/item-mapping/mappings/{mapping_id}")
                        print(f"Cleaned up test mapping: {mapping_id}")
        print("Cleanup completed")
