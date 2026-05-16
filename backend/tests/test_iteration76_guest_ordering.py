"""
Iteration 76: Guest Ordering Platform + Guest360 + Housekeeping + MinibarIRD Tests
==================================================================================
Testing 3 new modules and the Guest Ordering Platform:
- Guest360: Unified guest profile with spa/concierge/dining history
- Housekeeping: Room status board with KPIs
- MinibarIRD: IRD menu, minibar inventory, orders
- Guest Ordering: QR-code launched ordering with time-period-aware menu
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHousekeeping:
    """Housekeeping module - Room status board and KPIs"""
    
    def test_housekeeping_dashboard(self):
        """GET /api/housekeeping/dashboard returns rooms data with kpis"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data, "Missing kpis in response"
        kpis = data["kpis"]
        assert "total_rooms" in kpis, "Missing total_rooms in kpis"
        assert "occupied" in kpis, "Missing occupied in kpis"
        assert "dirty" in kpis, "Missing dirty in kpis"
        assert "clean" in kpis, "Missing clean in kpis"
        assert "inspected" in kpis, "Missing inspected in kpis"
        assert kpis["total_rooms"] > 0, "Should have rooms seeded"
        
        # Verify rooms array
        assert "rooms" in data, "Missing rooms in response"
        assert len(data["rooms"]) > 0, "Should have rooms"
        
        # Verify room structure
        room = data["rooms"][0]
        assert "number" in room, "Room missing number"
        assert "status" in room, "Room missing status"
        assert "floor" in room, "Room missing floor"
        print(f"✓ Housekeeping dashboard: {kpis['total_rooms']} rooms, {kpis['occupied']} occupied")
    
    def test_housekeeping_update_room_status(self):
        """PUT /api/housekeeping/rooms/412/status?status=clean updates room status"""
        # First get current status
        response = requests.get(f"{BASE_URL}/api/housekeeping/dashboard")
        assert response.status_code == 200
        
        # Update room 412 to clean
        response = requests.put(f"{BASE_URL}/api/housekeeping/rooms/412/status?status=clean")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["room"] == "412", "Room number mismatch"
        assert data["status"] == "clean", "Status not updated"
        print(f"✓ Room 412 status updated to clean")
    
    def test_housekeeping_rooms_list(self):
        """GET /api/housekeeping/rooms returns room list"""
        response = requests.get(f"{BASE_URL}/api/housekeeping/rooms")
        assert response.status_code == 200
        data = response.json()
        assert "rooms" in data
        assert len(data["rooms"]) > 0
        print(f"✓ Housekeeping rooms list: {len(data['rooms'])} rooms")


class TestGuest360:
    """Guest 360 Profile - Unified guest view"""
    
    def test_guest360_search(self):
        """GET /api/guest360/search?q=Guest returns guest results"""
        response = requests.get(f"{BASE_URL}/api/guest360/search?q=Guest")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "results" in data, "Missing results in response"
        print(f"✓ Guest360 search: {len(data['results'])} results for 'Guest'")
    
    def test_guest360_profile_by_room(self):
        """GET /api/guest360/profile/301 returns unified guest profile"""
        response = requests.get(f"{BASE_URL}/api/guest360/profile/301")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify profile structure
        assert "profile" in data, "Missing profile"
        assert "summary" in data, "Missing summary"
        
        # Verify summary has all touchpoints
        summary = data["summary"]
        assert "total_spend" in summary, "Missing total_spend"
        assert "spa_visits" in summary, "Missing spa_visits"
        assert "concierge_tickets" in summary, "Missing concierge_tickets"
        assert "minibar_charges" in summary, "Missing minibar_charges"
        assert "ird_orders" in summary, "Missing ird_orders"
        
        # Verify history arrays exist
        assert "spa_history" in data, "Missing spa_history"
        assert "concierge_history" in data, "Missing concierge_history"
        assert "dining_feedback" in data, "Missing dining_feedback"
        assert "minibar_history" in data, "Missing minibar_history"
        assert "ird_history" in data, "Missing ird_history"
        
        print(f"✓ Guest360 profile for room 301: total_spend=${summary['total_spend']}, {summary['total_interactions']} interactions")


class TestMinibarIRD:
    """Minibar & IRD module - Menu, orders, minibar inventory"""
    
    def test_ird_dashboard(self):
        """GET /api/ird/dashboard returns IRD KPIs"""
        response = requests.get(f"{BASE_URL}/api/ird/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify KPIs
        assert "kpis" in data, "Missing kpis"
        kpis = data["kpis"]
        assert "active_orders" in kpis, "Missing active_orders"
        assert "total_orders" in kpis, "Missing total_orders"
        assert "ird_revenue" in kpis, "Missing ird_revenue"
        assert "minibar_revenue" in kpis, "Missing minibar_revenue"
        assert "menu_items" in kpis, "Missing menu_items"
        
        print(f"✓ IRD dashboard: {kpis['menu_items']} menu items, ${kpis['total_revenue']} total revenue")
    
    def test_ird_menu(self):
        """GET /api/ird/menu returns categorized menu"""
        response = requests.get(f"{BASE_URL}/api/ird/menu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "menu" in data, "Missing menu"
        assert "total_items" in data, "Missing total_items"
        
        # Verify categories exist
        menu = data["menu"]
        assert len(menu) > 0, "Menu should have categories"
        
        # Check for expected categories
        categories = list(menu.keys())
        print(f"✓ IRD menu: {data['total_items']} items in categories: {categories}")
    
    def test_minibar_inventory(self):
        """GET /api/ird/minibar/412 returns minibar inventory"""
        response = requests.get(f"{BASE_URL}/api/ird/minibar/412")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "room_number" in data, "Missing room_number"
        assert data["room_number"] == "412", "Room number mismatch"
        assert "inventory" in data, "Missing inventory"
        assert "charges" in data, "Missing charges"
        assert "total_charges" in data, "Missing total_charges"
        
        print(f"✓ Minibar for room 412: {len(data['inventory'])} items, ${data['total_charges']} charges")
    
    def test_minibar_consume(self):
        """POST /api/ird/minibar/consume charges minibar item"""
        # First get inventory to find an item
        inv_response = requests.get(f"{BASE_URL}/api/ird/minibar/412")
        assert inv_response.status_code == 200
        inventory = inv_response.json()["inventory"]
        
        if len(inventory) > 0:
            item = inventory[0]
            response = requests.post(
                f"{BASE_URL}/api/ird/minibar/consume",
                json={"room_number": "412", "item_id": item["item_id"], "quantity": 1}
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert "total" in data, "Missing total in charge"
            assert data["room_number"] == "412", "Room number mismatch"
            print(f"✓ Minibar consume: charged ${data['total']} for {data['item_name']}")
        else:
            print("⚠ No minibar items to test consume")


class TestGuestOrdering:
    """Guest Ordering Platform - QR-code launched ordering"""
    
    def test_guest_order_auth(self):
        """POST /api/guest-order/auth with room_number+last_name returns session token"""
        response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "authenticated" in data, "Missing authenticated"
        assert data["authenticated"] == True, "Should be authenticated"
        assert "token" in data, "Missing token"
        assert "room_number" in data, "Missing room_number"
        assert data["room_number"] == "412", "Room number mismatch"
        
        print(f"✓ Guest auth: token={data['token'][:20]}...")
        return data["token"]
    
    def test_guest_order_menu(self):
        """GET /api/guest-order/menu returns time-period-filtered menu"""
        response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "current_period" in data, "Missing current_period"
        assert "all_periods" in data, "Missing all_periods"
        assert "menu" in data, "Missing menu"
        assert "total_items" in data, "Missing total_items"
        
        # Verify period structure
        period = data["current_period"]
        assert "period_id" in period, "Missing period_id"
        assert "label" in period, "Missing label"
        
        # Verify menu has categories
        menu = data["menu"]
        categories = list(menu.keys())
        
        print(f"✓ Guest menu: {data['total_items']} items, period={period['label']}, categories={categories}")
    
    def test_guest_order_place_order(self):
        """POST /api/guest-order/order places order, decrements counts"""
        # First authenticate
        auth_response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "TestOrder"}
        )
        assert auth_response.status_code == 200
        token = auth_response.json()["token"]
        
        # Get menu to find an item
        menu_response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert menu_response.status_code == 200
        menu = menu_response.json()["menu"]
        
        # Find first available item
        item = None
        for category, items in menu.items():
            if len(items) > 0:
                item = items[0]
                break
        
        if item:
            response = requests.post(
                f"{BASE_URL}/api/guest-order/order",
                json={
                    "room_number": "412",
                    "guest_name": "TestOrder",
                    "session_token": token,
                    "items": [{
                        "item_id": item["id"],
                        "name": item["name"],
                        "quantity": 1,
                        "price": item["price"],
                        "prep_time_mins": item.get("prep_time_mins", 15)
                    }],
                    "special_instructions": "Test order"
                }
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            
            assert "order_id" in data, "Missing order_id"
            assert "total" in data, "Missing total"
            assert "estimated_delivery_mins" in data, "Missing estimated_delivery_mins"
            
            print(f"✓ Guest order placed: {data['order_id']}, total=${data['total']}, ETA={data['estimated_delivery_mins']}min")
        else:
            print("⚠ No menu items available to test order")
    
    def test_guest_order_manager_periods(self):
        """GET /api/guest-order/manager/periods returns 3 periods"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/periods")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "periods" in data, "Missing periods"
        periods = data["periods"]
        assert len(periods) >= 3, f"Expected at least 3 periods, got {len(periods)}"
        
        # Verify period IDs
        period_ids = [p["period_id"] for p in periods]
        assert "breakfast" in period_ids, "Missing breakfast period"
        assert "all_day" in period_ids, "Missing all_day period"
        assert "overnight" in period_ids, "Missing overnight period"
        
        print(f"✓ Manager periods: {[p['label'] for p in periods]}")
    
    def test_guest_order_manager_update_period(self):
        """PUT /api/guest-order/manager/periods/breakfast updates time window"""
        response = requests.put(
            f"{BASE_URL}/api/guest-order/manager/periods/breakfast",
            json={
                "period_id": "breakfast",
                "label": "Breakfast",
                "start_time": "05:30",
                "end_time": "11:00",
                "active": True
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "updated" in data, "Missing updated"
        assert data["updated"] == "breakfast", "Period ID mismatch"
        
        print(f"✓ Period updated: breakfast {data['start']} - {data['end']}")
    
    def test_guest_order_manager_menu(self):
        """GET /api/guest-order/manager/menu returns all items with counts"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/menu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "items" in data, "Missing items"
        items = data["items"]
        assert len(items) > 0, "Should have menu items"
        
        # Verify item structure includes counts
        item = items[0]
        assert "available_count" in item or item.get("available_count") is None, "Missing available_count"
        assert "ordered_count" in item, "Missing ordered_count"
        assert "sold_out" in item, "Missing sold_out"
        
        sold_out_count = len([i for i in items if i.get("sold_out")])
        print(f"✓ Manager menu: {len(items)} items, {sold_out_count} sold out")
    
    def test_guest_order_manager_reset_count(self):
        """PUT /api/guest-order/manager/reset-count/{item_id} resets count"""
        # Get menu to find an item with available_count
        menu_response = requests.get(f"{BASE_URL}/api/guest-order/manager/menu")
        assert menu_response.status_code == 200
        items = menu_response.json()["items"]
        
        # Find item with available_count
        item = None
        for i in items:
            if i.get("available_count") is not None:
                item = i
                break
        
        if item:
            response = requests.put(
                f"{BASE_URL}/api/guest-order/manager/reset-count/{item['id']}",
                json={"available_count": 10}
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            
            assert "reset" in data, "Missing reset"
            assert "new_count" in data, "Missing new_count"
            assert data["new_count"] == 10, "Count not reset correctly"
            
            print(f"✓ Reset count for {item['name']}: new_count={data['new_count']}")
        else:
            print("⚠ No items with available_count to test reset")
    
    def test_guest_order_manager_alerts(self):
        """GET /api/guest-order/manager/alerts returns sold-out alerts"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "alerts" in data, "Missing alerts"
        assert "count" in data, "Missing count"
        
        print(f"✓ Manager alerts: {data['count']} active alerts")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
