"""
Item Mapping Engine Tests - Iteration 94
=========================================
Tests for AI Invoice Item Mapping Engine:
- Internal catalog (30 items)
- Fuzzy matching with confidence scores
- Learning from approved mappings (99.9% confidence on repeat)
- Review queue for low-confidence matches
- CRUD operations for mappings
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestItemMappingCatalog:
    """Tests for GET /api/item-mapping/catalog - Internal catalog endpoint"""
    
    def test_catalog_returns_30_items(self):
        """Verify catalog returns 30 internal items"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        assert "total" in data, "Response should have 'total' key"
        assert "categories" in data, "Response should have 'categories' key"
        
        # Verify 30 items
        assert data["total"] == 30, f"Expected 30 items, got {data['total']}"
        assert len(data["items"]) == 30, f"Expected 30 items in list, got {len(data['items'])}"
        
    def test_catalog_item_structure(self):
        """Verify catalog items have required fields"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog")
        assert response.status_code == 200
        
        data = response.json()
        item = data["items"][0]
        
        required_fields = ["item_id", "name", "category", "unit", "par_cost", "gl_code"]
        for field in required_fields:
            assert field in item, f"Item missing required field: {field}"
            
    def test_catalog_categories(self):
        """Verify catalog has expected categories"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog")
        assert response.status_code == 200
        
        data = response.json()
        expected_categories = ["seafood", "proteins", "produce", "dairy", "dry_goods", "specialty", "beverage", "chemicals", "supplies"]
        
        for cat in expected_categories:
            assert cat in data["categories"], f"Missing category: {cat}"
            
    def test_catalog_filter_by_category(self):
        """Verify catalog can filter by category"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/catalog?category=seafood")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] > 0, "Should have seafood items"
        
        for item in data["items"]:
            assert item["category"] == "seafood", f"Item {item['name']} should be seafood"


class TestItemMappingMatch:
    """Tests for POST /api/item-mapping/match - Fuzzy matching endpoint"""
    
    def test_match_high_confidence_auto_matched(self):
        """Test that high confidence matches (>=85%) get auto_matched status"""
        payload = {
            "vendor_name": "Blue Harbor Seafood Co.",
            "line_items": [
                {"description": "Atlantic Salmon Fillet Fresh 10LB", "item_code": "SAL-001", "quantity_shipped": 5, "unit_price": 12.50}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["vendor_name"] == "Blue Harbor Seafood Co."
        assert data["total_items"] == 1
        
        item = data["items"][0]
        assert item["best_match"] is not None, "Should have a best match"
        assert item["best_match"]["confidence"] >= 50, f"Confidence should be >= 50, got {item['best_match']['confidence']}"
        
        # High confidence should be auto_matched
        if item["best_match"]["confidence"] >= 85:
            assert item["status"] == "auto_matched", f"Expected auto_matched for confidence {item['best_match']['confidence']}"
            
    def test_match_medium_confidence_review(self):
        """Test that medium confidence matches (50-84%) get review status"""
        payload = {
            "vendor_name": "Generic Supplier",
            "line_items": [
                {"description": "Fresh Fish Fillet", "item_code": "FF-001", "quantity_shipped": 3, "unit_price": 10.00}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        item = data["items"][0]
        
        if item["best_match"] and 50 <= item["best_match"]["confidence"] < 85:
            assert item["status"] == "review", f"Expected review status for confidence {item['best_match']['confidence']}"
            
    def test_match_low_confidence(self):
        """Test that low confidence matches (<50%) get low_confidence status"""
        payload = {
            "vendor_name": "Random Vendor",
            "line_items": [
                {"description": "XYZ Widget 123", "item_code": "XYZ-123", "quantity_shipped": 1, "unit_price": 5.00}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        item = data["items"][0]
        
        if item["best_match"] and item["best_match"]["confidence"] < 50:
            assert item["status"] == "low_confidence", f"Expected low_confidence status"
            
    def test_match_returns_alternatives(self):
        """Test that match returns alternative suggestions"""
        payload = {
            "vendor_name": "Test Vendor",
            "line_items": [
                {"description": "Salmon Fresh", "item_code": "SAL-001", "quantity_shipped": 2, "unit_price": 15.00}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        item = data["items"][0]
        
        # Should have alternatives array
        assert "alternatives" in item, "Should have alternatives array"
        
    def test_match_multiple_items(self):
        """Test matching multiple line items at once"""
        payload = {
            "vendor_name": "Multi-Item Vendor",
            "line_items": [
                {"description": "Atlantic Salmon Fillet", "item_code": "SAL-001", "quantity_shipped": 5, "unit_price": 12.50},
                {"description": "Jumbo Shrimp 16/20", "item_code": "SHR-001", "quantity_shipped": 10, "unit_price": 14.80},
                {"description": "Beef Tenderloin Prime", "item_code": "BEF-001", "quantity_shipped": 3, "unit_price": 38.50}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_items"] == 3, f"Expected 3 items, got {data['total_items']}"
        assert len(data["items"]) == 3


class TestItemMappingApproveAndLearn:
    """Tests for POST /api/item-mapping/approve - Learning mechanism"""
    
    def test_approve_mapping_creates_record(self):
        """Test that approving a mapping creates a persistent record"""
        # Use unique vendor/item to avoid conflicts
        unique_id = str(int(time.time()))
        payload = {
            "vendor_item_code": f"TEST-{unique_id}",
            "vendor_item_desc": f"TEST Salmon Fillet Fresh {unique_id}",
            "vendor_name": f"TEST Vendor {unique_id}",
            "internal_item_id": "cat-001",
            "internal_item_name": "Atlantic Salmon Fillet",
            "unit_conversion": 1.0,
            "pack_size": "10LB",
            "notes": "Test mapping"
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "approved", "Status should be approved"
        assert "mapping" in data, "Should return mapping object"
        assert data["mapping"]["internal_item_id"] == "cat-001"
        
    def test_learned_match_returns_99_9_confidence(self):
        """CRITICAL TEST: After approving, re-matching same item returns 99.9% confidence with source='learned'"""
        # Step 1: Create a unique mapping
        unique_id = str(int(time.time())) + "_learn"
        vendor_name = f"Blue Harbor Seafood {unique_id}"
        vendor_desc = f"ATLANTIC SALMON FILLET FRESH 10LB {unique_id}"
        
        # Step 2: Approve the mapping
        approve_payload = {
            "vendor_item_code": f"SAL-{unique_id}",
            "vendor_item_desc": vendor_desc,
            "vendor_name": vendor_name,
            "internal_item_id": "cat-001",
            "internal_item_name": "Atlantic Salmon Fillet",
            "unit_conversion": 1.0,
            "pack_size": "10LB",
            "notes": "Learning test"
        }
        approve_response = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=approve_payload)
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        
        # Step 3: Re-match the same item - should return 99.9% confidence with source='learned'
        match_payload = {
            "vendor_name": vendor_name,
            "line_items": [
                {"description": vendor_desc, "item_code": f"SAL-{unique_id}", "quantity_shipped": 5, "unit_price": 12.50}
            ]
        }
        match_response = requests.post(f"{BASE_URL}/api/item-mapping/match", json=match_payload)
        assert match_response.status_code == 200, f"Match failed: {match_response.text}"
        
        match_data = match_response.json()
        item = match_data["items"][0]
        
        assert item["best_match"] is not None, "Should have a best match"
        assert item["best_match"]["confidence"] == 99.9, f"Expected 99.9% confidence for learned match, got {item['best_match']['confidence']}"
        assert item["best_match"]["source"] == "learned", f"Expected source='learned', got {item['best_match'].get('source')}"
        assert item["status"] == "auto_matched", f"Learned match should be auto_matched, got {item['status']}"


class TestItemMappingCRUD:
    """Tests for mapping CRUD operations"""
    
    def test_list_mappings(self):
        """Test GET /api/item-mapping/mappings returns list"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/mappings")
        assert response.status_code == 200
        
        data = response.json()
        assert "mappings" in data
        assert "total" in data
        assert "approved" in data
        assert "rejected" in data
        
    def test_list_mappings_filter_by_vendor(self):
        """Test filtering mappings by vendor"""
        # First create a mapping
        unique_id = str(int(time.time())) + "_filter"
        vendor_name = f"Filter Test Vendor {unique_id}"
        
        approve_payload = {
            "vendor_item_code": f"FLT-{unique_id}",
            "vendor_item_desc": f"Filter Test Item {unique_id}",
            "vendor_name": vendor_name,
            "internal_item_id": "cat-002",
            "internal_item_name": "Jumbo Shrimp 16/20"
        }
        requests.post(f"{BASE_URL}/api/item-mapping/approve", json=approve_payload)
        
        # Now filter by vendor
        response = requests.get(f"{BASE_URL}/api/item-mapping/mappings?vendor={vendor_name}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= 1, "Should find at least one mapping for this vendor"
        
    def test_delete_mapping(self):
        """Test DELETE /api/item-mapping/mappings/{id}"""
        # First create a mapping
        unique_id = str(int(time.time())) + "_delete"
        
        approve_payload = {
            "vendor_item_code": f"DEL-{unique_id}",
            "vendor_item_desc": f"Delete Test Item {unique_id}",
            "vendor_name": f"Delete Test Vendor {unique_id}",
            "internal_item_id": "cat-003",
            "internal_item_name": "Beef Tenderloin USDA Prime"
        }
        approve_response = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=approve_payload)
        assert approve_response.status_code == 200
        
        mapping_id = approve_response.json()["mapping"]["id"]
        
        # Delete the mapping
        delete_response = requests.delete(f"{BASE_URL}/api/item-mapping/mappings/{mapping_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        data = delete_response.json()
        assert data["deleted"] == mapping_id
        
    def test_delete_nonexistent_mapping_returns_404(self):
        """Test deleting non-existent mapping returns 404"""
        response = requests.delete(f"{BASE_URL}/api/item-mapping/mappings/nonexistent-id-12345")
        assert response.status_code == 404


class TestItemMappingReject:
    """Tests for POST /api/item-mapping/reject/{id}"""
    
    def test_reject_mapping(self):
        """Test rejecting a mapping"""
        # First create a mapping
        unique_id = str(int(time.time())) + "_reject"
        
        approve_payload = {
            "vendor_item_code": f"REJ-{unique_id}",
            "vendor_item_desc": f"Reject Test Item {unique_id}",
            "vendor_name": f"Reject Test Vendor {unique_id}",
            "internal_item_id": "cat-004",
            "internal_item_name": "Chicken Breast Boneless"
        }
        approve_response = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=approve_payload)
        assert approve_response.status_code == 200
        
        mapping_id = approve_response.json()["mapping"]["id"]
        
        # Reject the mapping
        reject_payload = {"reason": "incorrect_match"}
        reject_response = requests.post(f"{BASE_URL}/api/item-mapping/reject/{mapping_id}", json=reject_payload)
        assert reject_response.status_code == 200
        
        data = reject_response.json()
        assert data["status"] == "rejected"
        assert data["mapping_id"] == mapping_id


class TestItemMappingQueue:
    """Tests for unmapped items queue"""
    
    def test_queue_items(self):
        """Test POST /api/item-mapping/queue-items adds items to review queue"""
        unique_id = str(int(time.time())) + "_queue"
        
        payload = {
            "vendor_name": f"Queue Test Vendor {unique_id}",
            "line_items": [
                {"description": f"Queue Item 1 {unique_id}", "item_code": f"Q1-{unique_id}", "quantity_shipped": 2, "unit_price": 10.00},
                {"description": f"Queue Item 2 {unique_id}", "item_code": f"Q2-{unique_id}", "quantity_shipped": 3, "unit_price": 15.00}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/item-mapping/queue-items", json=payload)
        assert response.status_code == 200, f"Queue failed: {response.text}"
        
        data = response.json()
        assert data["queued"] == 2, f"Expected 2 items queued, got {data['queued']}"
        assert data["vendor"] == f"Queue Test Vendor {unique_id}"
        
    def test_get_unmapped_items(self):
        """Test GET /api/item-mapping/unmapped returns queue"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/unmapped")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data


class TestItemMappingStats:
    """Tests for GET /api/item-mapping/stats - Dashboard stats"""
    
    def test_stats_endpoint(self):
        """Test stats endpoint returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/stats")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check mappings stats
        assert "mappings" in data
        assert "total" in data["mappings"]
        assert "approved" in data["mappings"]
        assert "rejected" in data["mappings"]
        
        # Check queue stats
        assert "queue" in data
        assert "total" in data["queue"]
        assert "unmapped" in data["queue"]
        assert "review" in data["queue"]
        assert "auto_matched" in data["queue"]
        
        # Check catalog count
        assert "catalog_items" in data
        assert data["catalog_items"] == 30, f"Expected 30 catalog items, got {data['catalog_items']}"
        
        # Check top vendors
        assert "top_vendors" in data
        
        # Check learning rate
        assert "learning_rate" in data


class TestInvoiceOCRRegression:
    """Regression tests for existing invoice OCR endpoints"""
    
    def test_scan_endpoint_exists(self):
        """Test POST /api/invoice-ocr/scan endpoint exists (requires file upload)"""
        # Just verify the endpoint exists - actual scan requires EMERGENT_LLM_KEY
        # We'll test with a minimal request to see if it returns expected error
        response = requests.post(f"{BASE_URL}/api/invoice-ocr/scan")
        # Should return 422 (missing file) not 404
        assert response.status_code == 422, f"Expected 422 for missing file, got {response.status_code}"
        
    def test_scan_and_map_endpoint_exists(self):
        """Test POST /api/invoice-ocr/scan-and-map endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/invoice-ocr/scan-and-map")
        # Should return 422 (missing file) not 404
        assert response.status_code == 422, f"Expected 422 for missing file, got {response.status_code}"
        
    def test_match_po_endpoint(self):
        """Test POST /api/invoice-ocr/match-po endpoint"""
        payload = {
            "po_number": "PO-12345",
            "vendor": {"name": "Test Vendor"},
            "line_items": [
                {"item_code": "ITM-001", "description": "Test Item", "quantity_ordered": 10, "quantity_shipped": 10}
            ],
            "total": 100.00
        }
        response = requests.post(f"{BASE_URL}/api/invoice-ocr/match-po", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["po_number"] == "PO-12345"
        assert data["match_status"] == "clean"  # No discrepancies
        
    def test_match_po_with_discrepancies(self):
        """Test match-po detects quantity discrepancies"""
        payload = {
            "po_number": "PO-12346",
            "vendor": {"name": "Test Vendor"},
            "line_items": [
                {"item_code": "ITM-001", "description": "Test Item", "quantity_ordered": 10, "quantity_shipped": 8}
            ],
            "total": 80.00
        }
        response = requests.post(f"{BASE_URL}/api/invoice-ocr/match-po", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["match_status"] == "has_discrepancies"
        assert data["discrepancy_count"] == 1
        assert data["discrepancies"][0]["type"] == "short"


class TestCrossVendorIsolation:
    """Test that mappings are isolated per vendor"""
    
    def test_same_item_different_vendors(self):
        """Test that same item description from different vendors can have different mappings"""
        unique_id = str(int(time.time())) + "_iso"
        item_desc = f"Fresh Salmon Fillet {unique_id}"
        
        # Approve mapping for Vendor A -> cat-001
        vendor_a = f"Vendor A {unique_id}"
        approve_a = {
            "vendor_item_code": f"A-{unique_id}",
            "vendor_item_desc": item_desc,
            "vendor_name": vendor_a,
            "internal_item_id": "cat-001",
            "internal_item_name": "Atlantic Salmon Fillet"
        }
        resp_a = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=approve_a)
        assert resp_a.status_code == 200
        
        # Approve mapping for Vendor B -> cat-022 (Lobster Tail)
        vendor_b = f"Vendor B {unique_id}"
        approve_b = {
            "vendor_item_code": f"B-{unique_id}",
            "vendor_item_desc": item_desc,
            "vendor_name": vendor_b,
            "internal_item_id": "cat-022",
            "internal_item_name": "Lobster Tail 8oz"
        }
        resp_b = requests.post(f"{BASE_URL}/api/item-mapping/approve", json=approve_b)
        assert resp_b.status_code == 200
        
        # Match from Vendor A - should get cat-001
        match_a = {
            "vendor_name": vendor_a,
            "line_items": [{"description": item_desc, "item_code": f"A-{unique_id}", "quantity_shipped": 1, "unit_price": 10.00}]
        }
        resp_match_a = requests.post(f"{BASE_URL}/api/item-mapping/match", json=match_a)
        assert resp_match_a.status_code == 200
        data_a = resp_match_a.json()
        assert data_a["items"][0]["best_match"]["internal_item_id"] == "cat-001", "Vendor A should map to cat-001"
        
        # Match from Vendor B - should get cat-022
        match_b = {
            "vendor_name": vendor_b,
            "line_items": [{"description": item_desc, "item_code": f"B-{unique_id}", "quantity_shipped": 1, "unit_price": 10.00}]
        }
        resp_match_b = requests.post(f"{BASE_URL}/api/item-mapping/match", json=match_b)
        assert resp_match_b.status_code == 200
        data_b = resp_match_b.json()
        assert data_b["items"][0]["best_match"]["internal_item_id"] == "cat-022", "Vendor B should map to cat-022"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
