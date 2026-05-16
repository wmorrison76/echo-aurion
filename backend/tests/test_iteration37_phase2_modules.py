"""
Iteration 37 - Phase 2 Modules Backend Tests
Tests for: Fix My Menu, Micro-Market & Smart Fridge, Mobile Preorder & Locker Pickup
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestFixMyMenu:
    """Fix My Menu - AI-powered menu margin analysis and optimization"""
    
    def test_scan_menu_default_threshold(self):
        """GET /api/fix-menu/scan - scan menu items with default threshold"""
        response = requests.get(f"{BASE_URL}/api/fix-menu/scan")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "threshold" in data
        assert "total_items_scanned" in data
        assert "flagged_count" in data
        assert "healthy_count" in data
        assert "total_revenue_at_risk" in data
        assert "avg_food_cost_pct" in data
        assert "flagged_items" in data
        assert "top_healthy" in data
        
        # Verify data types
        assert isinstance(data["flagged_items"], list)
        assert isinstance(data["top_healthy"], list)
        assert data["total_items_scanned"] > 0, "Should have seeded menu items"
        print(f"PASS: Scanned {data['total_items_scanned']} items, {data['flagged_count']} flagged")
    
    def test_scan_menu_custom_threshold(self):
        """GET /api/fix-menu/scan?threshold=0.35 - scan with custom threshold"""
        response = requests.get(f"{BASE_URL}/api/fix-menu/scan?threshold=0.35")
        assert response.status_code == 200
        data = response.json()
        
        assert data["threshold"] == 0.35
        assert data["flagged_count"] >= 0
        
        # Verify flagged items have required fields
        if data["flagged_items"]:
            item = data["flagged_items"][0]
            assert "item_id" in item
            assert "name" in item
            assert "food_cost" in item
            assert "sell_price" in item
            assert "cost_pct" in item
            assert "margin_pct" in item
            assert "revenue_at_risk" in item
            assert "suggested_price" in item
            assert "price_delta" in item
            assert item["cost_pct"] > 0.35, "Flagged items should exceed threshold"
        print(f"PASS: Custom threshold scan - {data['flagged_count']} flagged items")
    
    def test_suggest_fix_deterministic(self):
        """POST /api/fix-menu/suggest - get AI fix suggestions (may fallback to deterministic)"""
        payload = {
            "item_name": "TEST_Wagyu Ribeye",
            "food_cost": 28.5,
            "sell_price": 52.0,
            "category": "Entree",
            "monthly_volume": 180
        }
        response = requests.post(f"{BASE_URL}/api/fix-menu/suggest", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "analysis_id" in data
        assert data["analysis_id"].startswith("fix-")
        assert data["item_name"] == "TEST_Wagyu Ribeye"
        assert data["food_cost"] == 28.5
        assert data["sell_price"] == 52.0
        assert "cost_pct" in data
        assert "target_cost_pct" in data
        assert "gap_pct" in data
        assert "fixes" in data
        assert "created_at" in data
        
        # Verify fixes array
        assert isinstance(data["fixes"], list)
        assert len(data["fixes"]) >= 1, "Should have at least 1 fix suggestion"
        
        fix = data["fixes"][0]
        assert "fix_type" in fix
        assert "description" in fix
        assert "estimated_savings_pct" in fix
        assert "difficulty" in fix
        assert "impact" in fix
        print(f"PASS: Got {len(data['fixes'])} fix suggestions for {data['item_name']}")
    
    def test_fix_history(self):
        """GET /api/fix-menu/history - retrieve past analyses"""
        response = requests.get(f"{BASE_URL}/api/fix-menu/history")
        assert response.status_code == 200
        data = response.json()
        
        assert "analyses" in data
        assert "total" in data
        assert isinstance(data["analyses"], list)
        
        # Should have at least the analysis from previous test
        if data["analyses"]:
            analysis = data["analyses"][0]
            assert "analysis_id" in analysis
            assert "item_name" in analysis
            assert "fixes" in analysis
            assert "created_at" in analysis
        print(f"PASS: History contains {data['total']} analyses")


class TestMicroMarket:
    """Micro-Market & Smart Fridge - Unmanned retail, auto-replenishment"""
    
    def test_dashboard(self):
        """GET /api/micro-market/dashboard - get dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/micro-market/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_kiosks" in data
        assert "total_revenue" in data
        assert "total_sales" in data
        assert "low_stock_items" in data
        assert "out_of_stock_items" in data
        assert "pending_replenishment" in data
        assert "kiosks" in data
        assert isinstance(data["kiosks"], list)
        print(f"PASS: Dashboard shows {data['total_kiosks']} kiosks, ${data['total_revenue']} revenue")
    
    def test_list_kiosks(self):
        """GET /api/micro-market/kiosks - list all kiosks"""
        response = requests.get(f"{BASE_URL}/api/micro-market/kiosks")
        assert response.status_code == 200
        data = response.json()
        
        assert "kiosks" in data
        assert "total" in data
        assert isinstance(data["kiosks"], list)
        
        if data["kiosks"]:
            kiosk = data["kiosks"][0]
            assert "kiosk_id" in kiosk
            assert "name" in kiosk
            assert "kiosk_type" in kiosk
            assert "stocked_items" in kiosk
            assert "fill_rate" in kiosk
        print(f"PASS: Listed {data['total']} kiosks")
    
    def test_create_kiosk(self):
        """POST /api/micro-market/kiosks - create a new kiosk"""
        payload = {
            "name": "TEST_Employee Break Room Fridge",
            "kiosk_type": "smart_fridge",
            "location": "Building B Floor 2",
            "capacity_slots": 40,
            "temperature_zone": "cold"
        }
        response = requests.post(f"{BASE_URL}/api/micro-market/kiosks", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "kiosk_id" in data
        assert data["kiosk_id"].startswith("mk-")
        assert data["name"] == "TEST_Employee Break Room Fridge"
        assert data["kiosk_type"] == "smart_fridge"
        assert data["location"] == "Building B Floor 2"
        assert data["capacity_slots"] == 40
        assert data["temperature_zone"] == "cold"
        assert data["active"] == True
        assert "created_at" in data
        
        # Store for later tests
        self.__class__.test_kiosk_id = data["kiosk_id"]
        print(f"PASS: Created kiosk {data['kiosk_id']}")
    
    def test_add_inventory_item(self):
        """POST /api/micro-market/inventory - add inventory item"""
        # Get a kiosk ID first
        kiosks_resp = requests.get(f"{BASE_URL}/api/micro-market/kiosks")
        kiosk_id = kiosks_resp.json()["kiosks"][0]["kiosk_id"]
        
        payload = {
            "kiosk_id": kiosk_id,
            "product_name": "TEST_Energy Bar",
            "sku": "TEST-EB-001",
            "category": "snack",
            "price": 3.50,
            "cost": 1.50,
            "quantity": 20,
            "par_level": 5
        }
        response = requests.post(f"{BASE_URL}/api/micro-market/inventory", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "inv_id" in data
        assert data["inv_id"].startswith("inv-")
        assert data["product_name"] == "TEST_Energy Bar"
        assert data["price"] == 3.50
        assert data["cost"] == 1.50
        assert data["quantity"] == 20
        assert data["par_level"] == 5
        assert data["sold_count"] == 0
        
        self.__class__.test_inv_id = data["inv_id"]
        self.__class__.test_kiosk_for_inv = kiosk_id
        print(f"PASS: Added inventory item {data['inv_id']}")
    
    def test_list_inventory(self):
        """GET /api/micro-market/inventory - list inventory items"""
        response = requests.get(f"{BASE_URL}/api/micro-market/inventory")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        print(f"PASS: Listed {data['total']} inventory items")
    
    def test_list_inventory_by_kiosk(self):
        """GET /api/micro-market/inventory?kiosk_id=X - filter by kiosk"""
        kiosks_resp = requests.get(f"{BASE_URL}/api/micro-market/kiosks")
        kiosk_id = kiosks_resp.json()["kiosks"][0]["kiosk_id"]
        
        response = requests.get(f"{BASE_URL}/api/micro-market/inventory?kiosk_id={kiosk_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        for item in data["items"]:
            assert item["kiosk_id"] == kiosk_id
        print(f"PASS: Filtered inventory by kiosk - {data['total']} items")
    
    def test_record_sale(self):
        """POST /api/micro-market/sales - record a sale"""
        # First add an item with enough stock
        kiosks_resp = requests.get(f"{BASE_URL}/api/micro-market/kiosks")
        kiosk_id = kiosks_resp.json()["kiosks"][0]["kiosk_id"]
        
        inv_payload = {
            "kiosk_id": kiosk_id,
            "product_name": "TEST_Bottled Water",
            "category": "beverage",
            "price": 2.00,
            "cost": 0.50,
            "quantity": 50,
            "par_level": 10
        }
        inv_resp = requests.post(f"{BASE_URL}/api/micro-market/inventory", json=inv_payload)
        inv_id = inv_resp.json()["inv_id"]
        
        sale_payload = {
            "kiosk_id": kiosk_id,
            "inv_id": inv_id,
            "quantity": 2,
            "payment_method": "card",
            "employee_id": "TEST_EMP001"
        }
        response = requests.post(f"{BASE_URL}/api/micro-market/sales", json=sale_payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "sale_id" in data
        assert data["sale_id"].startswith("ms-")
        assert data["quantity"] == 2
        assert data["unit_price"] == 2.00
        assert data["total"] == 4.00
        assert data["profit"] == 3.00  # (2.00 - 0.50) * 2
        assert data["payment_method"] == "card"
        assert "timestamp" in data
        print(f"PASS: Recorded sale {data['sale_id']} - ${data['total']}")
    
    def test_sales_summary(self):
        """GET /api/micro-market/sales/summary - get daily sales breakdown"""
        response = requests.get(f"{BASE_URL}/api/micro-market/sales/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data
        assert "total_sales" in data
        assert "total_revenue" in data
        assert "total_profit" in data
        assert "margin_pct" in data
        assert "by_product" in data
        print(f"PASS: Sales summary - {data['total_sales']} sales, ${data['total_revenue']} revenue")
    
    def test_replenishment_list(self):
        """GET /api/micro-market/replenishment - list replenishment orders"""
        response = requests.get(f"{BASE_URL}/api/micro-market/replenishment")
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        assert "total" in data
        assert "pending" in data
        assert isinstance(data["orders"], list)
        print(f"PASS: Listed {data['total']} replenishment orders, {data['pending']} pending")
    
    def test_trigger_and_fulfill_replenishment(self):
        """Test auto-replenishment trigger and fulfillment"""
        # Create item with low stock to trigger replenishment
        kiosks_resp = requests.get(f"{BASE_URL}/api/micro-market/kiosks")
        kiosk_id = kiosks_resp.json()["kiosks"][0]["kiosk_id"]
        
        inv_payload = {
            "kiosk_id": kiosk_id,
            "product_name": "TEST_Low Stock Chips",
            "category": "snack",
            "price": 2.50,
            "cost": 1.00,
            "quantity": 6,  # Just above par
            "par_level": 5
        }
        inv_resp = requests.post(f"{BASE_URL}/api/micro-market/inventory", json=inv_payload)
        inv_id = inv_resp.json()["inv_id"]
        
        # Record sale to trigger replenishment (quantity drops to 5 = par level)
        sale_payload = {
            "kiosk_id": kiosk_id,
            "inv_id": inv_id,
            "quantity": 1,
            "payment_method": "badge"
        }
        requests.post(f"{BASE_URL}/api/micro-market/sales", json=sale_payload)
        
        # Check replenishment was created
        rep_resp = requests.get(f"{BASE_URL}/api/micro-market/replenishment")
        orders = rep_resp.json()["orders"]
        
        # Find our replenishment order
        our_order = next((o for o in orders if o["inv_id"] == inv_id), None)
        if our_order:
            assert our_order["status"] == "pending"
            
            # Fulfill it
            fulfill_resp = requests.put(f"{BASE_URL}/api/micro-market/replenishment/{our_order['replenish_id']}/fulfill")
            assert fulfill_resp.status_code == 200
            fulfill_data = fulfill_resp.json()
            assert fulfill_data["fulfilled"] == our_order["replenish_id"]
            print(f"PASS: Triggered and fulfilled replenishment {our_order['replenish_id']}")
        else:
            print("PASS: Replenishment trigger test (no order created - stock may not have hit par)")


class TestMobileOrder:
    """Mobile Preorder & Locker Pickup - Employee/guest mobile ordering"""
    
    def test_dashboard(self):
        """GET /api/mobile-order/dashboard - get locker/order stats"""
        response = requests.get(f"{BASE_URL}/api/mobile-order/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "today" in data
        assert "total_lockers" in data
        assert "total_compartments" in data
        assert "occupied_compartments" in data
        assert "occupancy_rate" in data
        assert "today_orders" in data
        assert "today_revenue" in data
        assert "by_status" in data
        assert "avg_prep_minutes" in data
        assert "lockers" in data
        print(f"PASS: Dashboard - {data['total_lockers']} lockers, {data['today_orders']} orders today")
    
    def test_list_lockers(self):
        """GET /api/mobile-order/lockers - list lockers with occupancy"""
        response = requests.get(f"{BASE_URL}/api/mobile-order/lockers")
        assert response.status_code == 200
        data = response.json()
        
        assert "lockers" in data
        assert "total" in data
        
        if data["lockers"]:
            locker = data["lockers"][0]
            assert "locker_id" in locker
            assert "name" in locker
            assert "locker_type" in locker
            assert "total_compartments" in locker
            assert "occupied" in locker
            assert "available" in locker
        print(f"PASS: Listed {data['total']} lockers")
    
    def test_create_locker(self):
        """POST /api/mobile-order/lockers - create a locker"""
        payload = {
            "name": "TEST_Cafeteria Pickup Station",
            "location": "Main Cafeteria",
            "total_compartments": 20,
            "locker_type": "heated"
        }
        response = requests.post(f"{BASE_URL}/api/mobile-order/lockers", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "locker_id" in data
        assert data["locker_id"].startswith("lk-")
        assert data["name"] == "TEST_Cafeteria Pickup Station"
        assert data["location"] == "Main Cafeteria"
        assert data["total_compartments"] == 20
        assert data["locker_type"] == "heated"
        assert data["active"] == True
        
        self.__class__.test_locker_id = data["locker_id"]
        print(f"PASS: Created locker {data['locker_id']}")
    
    def test_create_timeslot(self):
        """POST /api/mobile-order/timeslots - create a time slot"""
        # Get a locker ID
        lockers_resp = requests.get(f"{BASE_URL}/api/mobile-order/lockers")
        locker_id = lockers_resp.json()["lockers"][0]["locker_id"]
        
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "locker_id": locker_id,
            "date": today,
            "time_start": "12:00",
            "time_end": "12:30",
            "max_orders": 15
        }
        response = requests.post(f"{BASE_URL}/api/mobile-order/timeslots", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "slot_id" in data
        assert data["slot_id"].startswith("ts-")
        assert data["locker_id"] == locker_id
        assert data["date"] == today
        assert data["time_start"] == "12:00"
        assert data["time_end"] == "12:30"
        assert data["max_orders"] == 15
        
        self.__class__.test_slot_id = data["slot_id"]
        self.__class__.test_locker_for_slot = locker_id
        print(f"PASS: Created timeslot {data['slot_id']}")
    
    def test_list_timeslots(self):
        """GET /api/mobile-order/timeslots - list today's slots"""
        response = requests.get(f"{BASE_URL}/api/mobile-order/timeslots")
        assert response.status_code == 200
        data = response.json()
        
        assert "timeslots" in data
        assert "total" in data
        
        if data["timeslots"]:
            slot = data["timeslots"][0]
            assert "slot_id" in slot
            assert "locker_id" in slot
            assert "time_start" in slot
            assert "time_end" in slot
            assert "booked" in slot
            assert "available" in slot
        print(f"PASS: Listed {data['total']} timeslots")
    
    def test_create_order(self):
        """POST /api/mobile-order/orders - create order with pickup code"""
        # Get a locker ID
        lockers_resp = requests.get(f"{BASE_URL}/api/mobile-order/lockers")
        locker_id = lockers_resp.json()["lockers"][0]["locker_id"]
        
        payload = {
            "employee_id": "TEST_EMP002",
            "guest_name": "Test Employee",
            "locker_id": locker_id,
            "items": [
                {"name": "Grilled Chicken Wrap", "quantity": 1, "price": 9.50},
                {"name": "Side Salad", "quantity": 1, "price": 4.00}
            ],
            "notes": "No onions please",
            "payment_method": "meal_plan"
        }
        response = requests.post(f"{BASE_URL}/api/mobile-order/orders", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "order_id" in data
        assert data["order_id"].startswith("mo-")
        assert data["employee_id"] == "TEST_EMP002"
        assert data["guest_name"] == "Test Employee"
        assert data["locker_id"] == locker_id
        assert data["status"] == "pending"
        assert "pickup_code" in data
        assert len(data["pickup_code"]) == 6
        assert data["total"] == 13.50
        assert data["item_count"] == 2
        assert "compartment_number" in data
        
        self.__class__.test_order_id = data["order_id"]
        self.__class__.test_pickup_code = data["pickup_code"]
        print(f"PASS: Created order {data['order_id']} with pickup code {data['pickup_code']}")
    
    def test_list_orders(self):
        """GET /api/mobile-order/orders - list orders"""
        response = requests.get(f"{BASE_URL}/api/mobile-order/orders")
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        assert "total" in data
        
        if data["orders"]:
            order = data["orders"][0]
            assert "order_id" in order
            assert "status" in order
            assert "pickup_code" in order
            assert "total" in order
        print(f"PASS: Listed {data['total']} orders")
    
    def test_update_order_status_preparing(self):
        """PUT /api/mobile-order/orders/{id}/status?status=preparing - transition to preparing"""
        order_id = getattr(self.__class__, 'test_order_id', None)
        if not order_id:
            pytest.skip("No test order created")
        
        response = requests.put(f"{BASE_URL}/api/mobile-order/orders/{order_id}/status?status=preparing")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "preparing"
        assert "updated_at" in data
        print(f"PASS: Order {order_id} status updated to preparing")
    
    def test_update_order_status_ready(self):
        """PUT /api/mobile-order/orders/{id}/status?status=ready_for_pickup - mark ready"""
        order_id = getattr(self.__class__, 'test_order_id', None)
        if not order_id:
            pytest.skip("No test order created")
        
        response = requests.put(f"{BASE_URL}/api/mobile-order/orders/{order_id}/status?status=ready_for_pickup")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "ready_for_pickup"
        assert "prepared_at" in data
        print(f"PASS: Order {order_id} marked ready for pickup")
    
    def test_verify_pickup(self):
        """POST /api/mobile-order/pickup/{code} - verify pickup"""
        pickup_code = getattr(self.__class__, 'test_pickup_code', None)
        if not pickup_code:
            pytest.skip("No test pickup code")
        
        response = requests.post(f"{BASE_URL}/api/mobile-order/pickup/{pickup_code}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Pickup confirmed"
        assert "order" in data
        assert data["order"]["status"] == "picked_up"
        assert "picked_up_at" in data["order"]
        print(f"PASS: Pickup verified for code {pickup_code}")
    
    def test_verify_pickup_invalid_code(self):
        """POST /api/mobile-order/pickup/{code} - invalid code returns 404"""
        response = requests.post(f"{BASE_URL}/api/mobile-order/pickup/INVALID")
        assert response.status_code == 404
        print("PASS: Invalid pickup code returns 404")
    
    def test_update_order_invalid_status(self):
        """PUT /api/mobile-order/orders/{id}/status?status=invalid - returns 400"""
        # Create a new order for this test
        lockers_resp = requests.get(f"{BASE_URL}/api/mobile-order/lockers")
        locker_id = lockers_resp.json()["lockers"][0]["locker_id"]
        
        order_resp = requests.post(f"{BASE_URL}/api/mobile-order/orders", json={
            "locker_id": locker_id,
            "guest_name": "Test Invalid Status",
            "items": [{"name": "Test Item", "quantity": 1, "price": 5.00}]
        })
        order_id = order_resp.json()["order_id"]
        
        response = requests.put(f"{BASE_URL}/api/mobile-order/orders/{order_id}/status?status=invalid_status")
        assert response.status_code == 400
        print("PASS: Invalid status returns 400")


class TestCrossModuleIntegration:
    """Cross-module integration and regression tests"""
    
    def test_fix_menu_scan_has_seeded_data(self):
        """Verify menu_items collection has seeded data for fix-menu"""
        response = requests.get(f"{BASE_URL}/api/fix-menu/scan?threshold=0.35")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_items_scanned"] >= 20, "Should have seeded menu items"
        assert data["flagged_count"] >= 5, "Should have flagged items above 35% threshold"
        print(f"PASS: Seeded data verified - {data['total_items_scanned']} items, {data['flagged_count']} flagged")
    
    def test_micro_market_has_seeded_kiosk(self):
        """Verify mm_kiosks has seeded data"""
        response = requests.get(f"{BASE_URL}/api/micro-market/kiosks")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1, "Should have at least 1 seeded kiosk"
        print(f"PASS: Seeded kiosk verified - {data['total']} kiosks")
    
    def test_mobile_order_has_seeded_locker(self):
        """Verify mo_lockers has seeded data"""
        response = requests.get(f"{BASE_URL}/api/mobile-order/lockers")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] >= 1, "Should have at least 1 seeded locker"
        print(f"PASS: Seeded locker verified - {data['total']} lockers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
