"""
iter224 Phase 2 · ECW Ops Procurement Lifecycle Tests

Tests:
- Full procurement lifecycle: order-request → approve → PO → receive with variance
- Requisition reject flow
- PO creation conflict (pending_approval → 409)
- Inventory levels endpoint
- Inventory count persistence
- Order-requests and purchase-orders filtering
- Regression: iter224 phase 1 endpoints still work
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "X-User-Id": "chef-william"
    })
    return session


class TestInventoryLevels:
    """GET /api/ecw-ops/inventory/levels"""
    
    def test_inventory_levels_returns_rows(self, api_client):
        """Endpoint exists and returns items with required fields"""
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/inventory/levels?outlet_id=outlet-main")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "count" in data
        assert "low_stock_count" in data
        
        # Check row structure if rows exist
        if data["rows"]:
            row = data["rows"][0]
            assert "item_id" in row
            assert "name" in row
            assert "on_hand" in row
            assert "par_suggested" in row
            assert "low_stock" in row
            assert "gap" in row
            print(f"✓ inventory/levels returned {data['count']} items, {data['low_stock_count']} low stock")


class TestInventoryCount:
    """POST /api/ecw-ops/inventory/count"""
    
    def test_inventory_count_persists(self, api_client):
        """Count persists to inventory_counts with counted_at + chef_id"""
        # First get an item to count
        levels = api_client.get(f"{BASE_URL}/api/ecw-ops/inventory/levels?outlet_id=outlet-main").json()
        if not levels.get("rows"):
            pytest.skip("No items to count")
        
        item = levels["rows"][0]
        test_count = 42.5
        
        r = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/count", json={
            "outlet_id": "outlet-main",
            "item_id": item["item_id"],
            "on_hand": test_count,
            "unit": item.get("unit", "each"),
            "note": "TEST_count_persistence"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "count" in data
        
        count_doc = data["count"]
        assert count_doc.get("on_hand") == test_count
        assert count_doc.get("chef_id") == "chef-william"
        assert "counted_at" in count_doc
        print(f"✓ inventory/count persisted: {count_doc['id']}")


class TestOrderRequestsFiltering:
    """GET /api/ecw-ops/inventory/order-requests"""
    
    def test_order_requests_filter_by_outlet(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/inventory/order-requests?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ order-requests returned {data['count']} requisitions")
    
    def test_order_requests_filter_by_status(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/inventory/order-requests?outlet_id=outlet-main&status=pending_approval")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # All returned should be pending_approval
        for row in data.get("rows", []):
            assert row.get("status") == "pending_approval"
        print(f"✓ order-requests status filter works: {data['count']} pending")


class TestPurchaseOrdersFiltering:
    """GET /api/ecw-ops/inventory/purchase-orders"""
    
    def test_purchase_orders_filter_by_outlet(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/inventory/purchase-orders?outlet_id=outlet-main")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        print(f"✓ purchase-orders returned {data['count']} POs")
    
    def test_purchase_orders_filter_by_status(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/inventory/purchase-orders?outlet_id=outlet-main&status=ordered")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        for row in data.get("rows", []):
            assert row.get("status") == "ordered"
        print(f"✓ purchase-orders status filter works: {data['count']} ordered")


class TestFullProcurementLifecycle:
    """Full lifecycle: order-request → approve → PO → receive with variance"""
    
    def test_full_lifecycle_with_variance(self, api_client):
        """
        1. POST /inventory/order-request → creates requisition
        2. POST /inventory/requisitions/{id}/approve → status='approved'
        3. POST /inventory/purchase-orders (with unit_prices) → creates PO
        4. POST /inventory/purchase-orders/{po_id}/receive with qty_received < qty_ordered
           → po status flips to 'received_with_variance'
        """
        # Step 1: Create order request
        test_id = uuid.uuid4().hex[:8]
        order_req = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/order-request", json={
            "outlet_id": "outlet-main",
            "items": [
                {"item_id": f"TEST_item_{test_id}", "name": "Test Item", "qty": 10, "unit": "each"}
            ],
            "priority": "normal",
            "note": f"TEST_lifecycle_{test_id}"
        })
        assert order_req.status_code == 200, f"Order request failed: {order_req.text}"
        req_data = order_req.json()
        assert req_data.get("ok") is True
        req_id = req_data["requisition"]["id"]
        assert req_data["requisition"]["status"] == "pending_approval"
        print(f"✓ Step 1: Created requisition {req_id}")
        
        # Step 2: Approve requisition
        api_client.headers["X-User-Id"] = "purchasing-manager"
        approve_resp = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/requisitions/{req_id}/approve", json={
            "note": "Approved for testing"
        })
        assert approve_resp.status_code == 200, f"Approve failed: {approve_resp.text}"
        approve_data = approve_resp.json()
        assert approve_data.get("ok") is True
        assert approve_data["requisition"]["status"] == "approved"
        print(f"✓ Step 2: Approved requisition {req_id}")
        
        # Step 3: Create PO with unit prices
        po_resp = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/purchase-orders", json={
            "requisition_id": req_id,
            "vendor_id": "vendor-sysco",
            "vendor_name": "Sysco Test",
            "expected_delivery_date": "2026-02-01",
            "unit_prices": {f"TEST_item_{test_id}": 2.50},
            "note": f"TEST_PO_{test_id}"
        })
        assert po_resp.status_code == 200, f"PO creation failed: {po_resp.text}"
        po_data = po_resp.json()
        assert po_data.get("ok") is True
        po_id = po_data["po"]["id"]
        assert po_data["po"]["status"] == "ordered"
        assert po_data["po"]["total"] == 25.0  # 10 * 2.50
        print(f"✓ Step 3: Created PO {po_id} with total ${po_data['po']['total']}")
        
        # Step 4: Receive with variance (9 instead of 10)
        api_client.headers["X-User-Id"] = "chef-william"
        receive_resp = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/purchase-orders/{po_id}/receive", json={
            "items": [
                {"item_id": f"TEST_item_{test_id}", "qty_received": 9, "variance_note": "1 damaged"}
            ],
            "note": "Received with shortage"
        })
        assert receive_resp.status_code == 200, f"Receive failed: {receive_resp.text}"
        receive_data = receive_resp.json()
        assert receive_data.get("ok") is True
        assert receive_data["po_status"] == "received_with_variance"
        assert receive_data["variance"] is True
        print(f"✓ Step 4: Received PO with variance, status={receive_data['po_status']}")
        
        print(f"✓ FULL LIFECYCLE COMPLETE: {req_id} → approved → {po_id} → received_with_variance")


class TestRequisitionReject:
    """POST /inventory/requisitions/{id}/reject"""
    
    def test_reject_returns_status_rejected(self, api_client):
        """Reject returns status='rejected' with rejection_reason"""
        # Create a requisition to reject
        test_id = uuid.uuid4().hex[:8]
        api_client.headers["X-User-Id"] = "chef-william"
        order_req = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/order-request", json={
            "outlet_id": "outlet-main",
            "items": [{"item_id": f"TEST_reject_{test_id}", "name": "Reject Test", "qty": 5, "unit": "each"}],
            "priority": "normal",
            "note": f"TEST_reject_{test_id}"
        })
        assert order_req.status_code == 200
        req_id = order_req.json()["requisition"]["id"]
        
        # Reject it
        api_client.headers["X-User-Id"] = "purchasing-manager"
        reject_resp = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/requisitions/{req_id}/reject", json={
            "reason": "Budget exceeded for this period"
        })
        assert reject_resp.status_code == 200, f"Reject failed: {reject_resp.text}"
        reject_data = reject_resp.json()
        assert reject_data.get("ok") is True
        assert reject_data["requisition"]["status"] == "rejected"
        assert reject_data["requisition"]["rejection_reason"] == "Budget exceeded for this period"
        print(f"✓ Rejected requisition {req_id} with reason")


class TestPOCreationConflict:
    """POST /inventory/purchase-orders when requisition is pending_approval → 409"""
    
    def test_po_creation_on_pending_returns_409(self, api_client):
        """Cannot create PO from pending_approval requisition"""
        # Create a requisition but don't approve it
        test_id = uuid.uuid4().hex[:8]
        api_client.headers["X-User-Id"] = "chef-william"
        order_req = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/order-request", json={
            "outlet_id": "outlet-main",
            "items": [{"item_id": f"TEST_conflict_{test_id}", "name": "Conflict Test", "qty": 3, "unit": "each"}],
            "priority": "normal"
        })
        assert order_req.status_code == 200
        req_id = order_req.json()["requisition"]["id"]
        
        # Try to create PO without approving first
        api_client.headers["X-User-Id"] = "purchasing-manager"
        po_resp = api_client.post(f"{BASE_URL}/api/ecw-ops/inventory/purchase-orders", json={
            "requisition_id": req_id,
            "vendor_id": "vendor-test",
            "vendor_name": "Test Vendor"
        })
        assert po_resp.status_code == 409, f"Expected 409, got {po_resp.status_code}: {po_resp.text}"
        print(f"✓ PO creation on pending requisition correctly returns 409")


class TestRegressionIter224Phase1:
    """Regression: previous iter224 ECW Ops endpoints still work"""
    
    def test_stations_endpoint(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/stations?outlet_id=outlet-main")
        assert r.status_code == 200
        assert r.json().get("ok") is True
        print(f"✓ Regression: /stations works")
    
    def test_items_endpoint(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main")
        assert r.status_code == 200
        assert r.json().get("ok") is True
        print(f"✓ Regression: /items works")
    
    def test_components_endpoint(self, api_client):
        # Get an item first
        items = api_client.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main").json()
        if items.get("rows"):
            item_id = items["rows"][0]["id"]
            r = api_client.get(f"{BASE_URL}/api/ecw-ops/components?item_id={item_id}")
            assert r.status_code == 200
            assert r.json().get("ok") is True
            print(f"✓ Regression: /components works")
        else:
            pytest.skip("No items for components test")
    
    def test_recipes_endpoint(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/recipes?outlet_id=outlet-main")
        assert r.status_code == 200
        assert r.json().get("ok") is True
        print(f"✓ Regression: /recipes works")
    
    def test_line_check_start(self, api_client):
        # Get a station first
        stations = api_client.get(f"{BASE_URL}/api/ecw-ops/stations?outlet_id=outlet-main").json()
        if stations.get("rows"):
            station_id = stations["rows"][0]["id"]
            r = api_client.post(f"{BASE_URL}/api/ecw-ops/line-check/start", json={
                "outlet_id": "outlet-main",
                "station_id": station_id
            })
            assert r.status_code == 200
            assert r.json().get("ok") is True
            print(f"✓ Regression: /line-check/start works")
        else:
            pytest.skip("No stations for line-check test")
    
    def test_photos_endpoint(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/photos?outlet_id=outlet-main")
        assert r.status_code == 200
        assert r.json().get("ok") is True
        print(f"✓ Regression: /photos works")
    
    def test_published_endpoint(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/published?outlet_id=outlet-main")
        assert r.status_code == 200
        assert r.json().get("ok") is True
        print(f"✓ Regression: /published works")
    
    def test_par_suggest_endpoint(self, api_client):
        # Get an item first
        items = api_client.get(f"{BASE_URL}/api/ecw-ops/items?outlet_id=outlet-main").json()
        if items.get("rows"):
            item_id = items["rows"][0]["id"]
            r = api_client.get(f"{BASE_URL}/api/ecw-ops/par-suggest/{item_id}")
            assert r.status_code == 200
            data = r.json()
            assert data.get("ok") is True
            assert "suggested" in data
            assert "drivers" in data
            print(f"✓ Regression: /par-suggest works")
        else:
            pytest.skip("No items for par-suggest test")
    
    def test_summary_endpoint(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/ecw-ops/summary?outlet_id=outlet-main")
        assert r.status_code == 200
        assert r.json().get("ok") is True
        print(f"✓ Regression: /summary works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
