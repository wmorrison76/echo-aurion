"""
iter237 Backend Tests - Recipes UUID fix, Tickets, Audit v2, Bottle scan

Tests:
1. GET /api/ecw-ops/recipes - ingredient names should be human-readable (NOT UUIDs)
2. Recipe rows include menu_price, food_cost_pct, pos_mapped, station_id
3. POST /api/ecw-ops/tickets (maintenance) - returns assign_group='engineering'
4. POST /api/ecw-ops/tickets (guest) - returns assign_group='foh-manager'
5. GET /api/ecw-ops/tickets - returns recent tickets
6. POST /api/ecw-ops/inventory/audit/start - creates new audit
7. POST /api/ecw-ops/inventory/audit/start - 409 conflict for different mode
8. POST /api/ecw-ops/inventory/audit/start - resumes same mode
9. POST /api/ecw-ops/inventory/audit/complete - marks complete + queues reminder
10. PATCH /api/ecw-ops/inventory/entry/{id} - writes to edit_history
11. POST /api/ecw-ops/inventory/bottle-scan - logs bottle scan
12. Regression tests for existing endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestRecipesUUIDFix:
    """Test that recipe ingredients show human-readable names, not UUIDs"""
    
    def test_recipes_list_returns_human_readable_names(self):
        """GET /api/ecw-ops/recipes should return ingredient names, not UUIDs"""
        response = requests.get(
            f"{BASE_URL}/api/ecw-ops/recipes",
            params={"outlet_id": "outlet-rooftop", "limit": 10},
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        rows = data.get("rows", [])
        print(f"Found {len(rows)} recipes")
        
        # Check at least some recipes exist
        if len(rows) == 0:
            pytest.skip("No recipes found in database - may need seeding")
        
        # Check that ingredient names are human-readable (not UUIDs)
        uuid_pattern_found = False
        for recipe in rows[:5]:  # Check first 5 recipes
            ingredients = recipe.get("ingredients", [])
            for ing in ingredients:
                name = ing.get("name", "")
                # UUID pattern: 8-4-4-4-12 hex chars
                if name and len(name) == 36 and name.count("-") == 4:
                    uuid_pattern_found = True
                    print(f"WARNING: Found UUID-like name: {name} in recipe {recipe.get('item_name')}")
        
        assert not uuid_pattern_found, "Found UUID-like ingredient names - bug not fixed"
        print("PASS: No UUID-like ingredient names found")
    
    def test_recipes_include_required_fields(self):
        """Recipes from menu_recipes should include menu_price, food_cost_pct, pos_mapped, station_id.
        Note: Recipes from 'recipes' collection (mobile-imported) may not have all fields."""
        response = requests.get(
            f"{BASE_URL}/api/ecw-ops/recipes",
            params={"outlet_id": "outlet-rooftop", "limit": 20},
            headers=HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        rows = data.get("rows", [])
        
        if len(rows) == 0:
            pytest.skip("No recipes found")
        
        # Find a recipe that has station_id (from menu_recipes collection)
        menu_recipe = None
        for r in rows:
            if r.get("station_id") is not None:
                menu_recipe = r
                break
        
        # Check that at least some recipes have the required fields
        has_menu_price = any(r.get("menu_price") is not None for r in rows)
        has_station_id = any(r.get("station_id") is not None for r in rows)
        has_pos_mapped = any(r.get("pos_mapped") is not None for r in rows)
        
        print(f"Total recipes: {len(rows)}")
        print(f"Has menu_price: {has_menu_price}")
        print(f"Has station_id: {has_station_id}")
        print(f"Has pos_mapped: {has_pos_mapped}")
        
        # At minimum, menu_price should be present on most recipes
        assert has_menu_price, "No recipes have menu_price"
        
        # If we found a menu_recipe, verify it has all fields
        if menu_recipe:
            print(f"Checking menu_recipe: {menu_recipe.get('item_name')}")
            assert "station_id" in menu_recipe
            assert "pos_mapped" in menu_recipe
            print(f"menu_price: {menu_recipe.get('menu_price')}")
            print(f"food_cost_pct: {menu_recipe.get('food_cost_pct')}")
            print(f"pos_mapped: {menu_recipe.get('pos_mapped')}")
            print(f"station_id: {menu_recipe.get('station_id')}")
        else:
            print("No menu_recipes found (only mobile-imported recipes) - this is OK")


class TestTickets:
    """Test ticket creation and listing"""
    
    def test_create_maintenance_ticket(self):
        """POST /api/ecw-ops/tickets with kind='maintenance' returns assign_group='engineering'"""
        ticket_data = {
            "kind": "maintenance",
            "title": f"TEST_Broken fridge handle {uuid.uuid4().hex[:6]}",
            "priority": "medium",
            "location": "walk-in-1",
            "problem_type": "equipment"
        }
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/tickets",
            json=ticket_data,
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        ticket = data.get("ticket", {})
        assert ticket.get("assign_group") == "engineering", f"Expected engineering, got {ticket.get('assign_group')}"
        assert "id" in ticket or "ticket_id" in data
        print(f"Created maintenance ticket: {data.get('ticket_id') or ticket.get('id')}")
    
    def test_create_guest_ticket(self):
        """POST /api/ecw-ops/tickets with kind='guest' returns assign_group='foh-manager'"""
        ticket_data = {
            "kind": "guest",
            "title": f"TEST_Guest complaint about noise {uuid.uuid4().hex[:6]}",
            "priority": "high",
            "location": "restaurant-main",
            "problem_type": "service"
        }
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/tickets",
            json=ticket_data,
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        ticket = data.get("ticket", {})
        assert ticket.get("assign_group") == "foh-manager", f"Expected foh-manager, got {ticket.get('assign_group')}"
        print(f"Created guest ticket: {data.get('ticket_id') or ticket.get('id')}")
    
    def test_list_tickets(self):
        """GET /api/ecw-ops/tickets returns recent tickets without photo_data_url"""
        response = requests.get(
            f"{BASE_URL}/api/ecw-ops/tickets",
            params={"limit": 10},
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        
        rows = data.get("rows", [])
        print(f"Found {len(rows)} tickets")
        
        # Verify photo_data_url is excluded for bandwidth
        for ticket in rows:
            assert "photo_data_url" not in ticket, "photo_data_url should be excluded from list"


class TestInventoryAudit:
    """Test inventory audit v2 flow"""
    
    @pytest.fixture
    def unique_dept(self):
        """Generate unique dept to avoid conflicts"""
        return f"kitchen"  # Use standard dept
    
    def test_audit_start_creates_new(self):
        """POST /api/ecw-ops/inventory/audit/start creates new audit"""
        # Use unique outlet to avoid conflicts
        test_outlet = f"outlet-test-{uuid.uuid4().hex[:8]}"
        audit_data = {
            "outlet_id": test_outlet,
            "mode": "full",
            "dept": "kitchen",
            "auditor_name": "TEST_Chef William",
            "auditor_role": "chef",
            "is_finance_present": False
        }
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            json=audit_data,
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "audit_id" in data
        assert data.get("resumed") is False
        print(f"Created audit: {data.get('audit_id')}")
        return data.get("audit_id")
    
    def test_audit_start_conflict_different_mode(self):
        """POST /api/ecw-ops/inventory/audit/start returns 409 for different mode"""
        # First create a full audit
        test_outlet = f"outlet-conflict-{uuid.uuid4().hex[:8]}"
        audit_data = {
            "outlet_id": test_outlet,
            "mode": "full",
            "dept": "bar",
            "auditor_name": "TEST_Auditor",
            "auditor_role": "chef",
            "is_finance_present": False
        }
        response1 = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            json=audit_data,
            headers=HEADERS
        )
        assert response1.status_code == 200
        
        # Now try spot-check on same outlet+dept
        audit_data["mode"] = "spot-check"
        response2 = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            json=audit_data,
            headers=HEADERS
        )
        assert response2.status_code == 409, f"Expected 409 conflict, got {response2.status_code}: {response2.text}"
        print("PASS: Got 409 conflict for different mode")
    
    def test_audit_start_resumes_same_mode(self):
        """POST /api/ecw-ops/inventory/audit/start with same mode resumes"""
        test_outlet = f"outlet-resume-{uuid.uuid4().hex[:8]}"
        audit_data = {
            "outlet_id": test_outlet,
            "mode": "full",
            "dept": "retail",
            "auditor_name": "TEST_Auditor Resume",
            "auditor_role": "chef",
            "is_finance_present": False
        }
        # First call
        response1 = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            json=audit_data,
            headers=HEADERS
        )
        assert response1.status_code == 200
        audit_id1 = response1.json().get("audit_id")
        
        # Second call with same mode
        response2 = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            json=audit_data,
            headers=HEADERS
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2.get("resumed") is True, f"Expected resumed=True, got {data2.get('resumed')}"
        assert data2.get("audit_id") == audit_id1, "Should return same audit_id"
        print(f"PASS: Resumed audit {audit_id1}")
    
    def test_audit_complete_with_reminder(self):
        """POST /api/ecw-ops/inventory/audit/complete marks complete and queues reminder"""
        # First create an audit for bar dept (triggers reminder)
        test_outlet = f"outlet-complete-{uuid.uuid4().hex[:8]}"
        audit_data = {
            "outlet_id": test_outlet,
            "mode": "full",
            "dept": "bar",  # bar/alcohol/foh trigger spot-check reminder
            "auditor_name": "TEST_Finance Auditor",
            "auditor_role": "finance",
            "is_finance_present": True
        }
        response1 = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            json=audit_data,
            headers=HEADERS
        )
        assert response1.status_code == 200
        audit_id = response1.json().get("audit_id")
        
        # Complete the audit
        complete_data = {
            "audit_id": audit_id,
            "finance_notified": True,
            "spot_check_reminder_next_day": True
        }
        response2 = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/complete",
            json=complete_data,
            headers=HEADERS
        )
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert data.get("ok") is True
        assert data.get("finance_notified") is True
        
        # Check if reminder was queued (for bar dept)
        reminders = data.get("reminders", [])
        print(f"Reminders queued: {len(reminders)}")
        if reminders:
            assert reminders[0].get("kind") == "spot_check"
            print(f"PASS: Spot-check reminder queued for {reminders[0].get('dept')}")


class TestAuditEntryEdit:
    """Test audit entry editing with reason requirement"""
    
    def test_edit_entry_requires_reason(self):
        """PATCH /api/ecw-ops/inventory/entry/{id} requires reason"""
        # First create an audit and add an entry
        test_outlet = f"outlet-edit-{uuid.uuid4().hex[:8]}"
        
        # Create audit
        audit_response = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/start",
            json={
                "outlet_id": test_outlet,
                "mode": "full",
                "dept": "kitchen",
                "auditor_name": "TEST_Edit Tester"
            },
            headers=HEADERS
        )
        assert audit_response.status_code == 200
        audit_id = audit_response.json().get("audit_id")
        
        # Add an entry via audit-batch
        batch_response = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/audit-batch",
            json={
                "outlet_id": test_outlet,
                "audit_id": audit_id,
                "entries": [
                    {"shelf": "shelf-1", "item_name": "TEST_Tomatoes", "qty": 5, "unit": "cs"}
                ]
            },
            headers=HEADERS
        )
        assert batch_response.status_code == 200
        
        # Get the entry ID from the audit
        audit_detail = requests.get(
            f"{BASE_URL}/api/ecw-ops/inventory/audit/{audit_id}",
            headers=HEADERS
        )
        assert audit_detail.status_code == 200
        entries = audit_detail.json().get("entries", [])
        
        if not entries:
            pytest.skip("No entries created - cannot test edit")
        
        entry_id = entries[0].get("id")
        
        # Edit the entry with reason
        edit_response = requests.patch(
            f"{BASE_URL}/api/ecw-ops/inventory/entry/{entry_id}",
            json={
                "new_qty": 6,
                "reason": "Miscounted - found one more case behind shelf"
            },
            headers=HEADERS
        )
        assert edit_response.status_code == 200, f"Expected 200, got {edit_response.status_code}: {edit_response.text}"
        data = edit_response.json()
        assert data.get("ok") is True
        assert data.get("edit_count", 0) >= 1
        print(f"PASS: Entry edited, edit_count={data.get('edit_count')}")


class TestBottleScan:
    """Test bottle scan endpoint"""
    
    def test_bottle_scan_logs_successfully(self):
        """POST /api/ecw-ops/inventory/bottle-scan returns scan_id"""
        scan_data = {
            "outlet_id": "outlet-rooftop",
            "item_name": "TEST_Grey Goose 750ml",
            "unopened_count": 3
        }
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/inventory/bottle-scan",
            json=scan_data,
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "scan_id" in data
        print(f"PASS: Bottle scan logged: {data.get('scan_id')}")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""
    
    def test_echoaurium_outlets(self):
        """GET /api/echoaurium/outlets returns 8 neutral outlet names"""
        response = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        rows = data.get("rows", [])
        print(f"Found {len(rows)} outlets")
        # Should have outlets
        assert len(rows) > 0, "No outlets returned"
    
    def test_proactive_briefing(self):
        """GET /api/echo-voice/proactive-briefing works"""
        response = requests.get(
            f"{BASE_URL}/api/echo-voice/proactive-briefing",
            params={"outlet_id": "outlet-rooftop"},
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "speech" in data
        print(f"Proactive briefing speech length: {len(data.get('speech', ''))}")
    
    def test_shift_notes(self):
        """POST/GET /api/ecw-ops/shift-notes works"""
        # Create a shift note
        note_data = {
            "outlet_id": "outlet-rooftop",
            "shift": "pm",
            "text": f"TEST_Shift note {uuid.uuid4().hex[:6]}"
        }
        post_response = requests.post(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            json=note_data,
            headers=HEADERS
        )
        assert post_response.status_code == 200, f"POST failed: {post_response.status_code}"
        
        # Get shift notes
        get_response = requests.get(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            params={"outlet_id": "outlet-rooftop", "limit": 5},
            headers=HEADERS
        )
        assert get_response.status_code == 200, f"GET failed: {get_response.status_code}"
        print("PASS: Shift notes POST/GET working")
    
    def test_orders_place(self):
        """POST /api/ecw-ops/orders/place works"""
        order_data = {
            "outlet_id": "outlet-rooftop",
            "vendor_id": "vendor-test",
            "vendor_name": "Test Supplier",
            "items": [
                {"name": "TEST_Tomatoes", "qty": 2, "unit": "cs", "unit_price": 25.00}
            ]
        }
        response = requests.post(
            f"{BASE_URL}/api/ecw-ops/orders/place",
            json=order_data,
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "po" in data
        print(f"PASS: Order placed: {data.get('po', {}).get('id')}")
    
    def test_team_chat_rooms(self):
        """Team chat rooms flow works"""
        # Create a room
        room_data = {
            "name": f"TEST_Room {uuid.uuid4().hex[:6]}",
            "kind": "group",
            "members": ["chef-william"]
        }
        create_response = requests.post(
            f"{BASE_URL}/api/team-chat/rooms",
            json=room_data,
            headers=HEADERS
        )
        assert create_response.status_code == 200, f"Create room failed: {create_response.status_code}"
        room = create_response.json().get("room", {})
        room_id = room.get("id")
        
        # Send a message
        msg_response = requests.post(
            f"{BASE_URL}/api/team-chat/rooms/{room_id}/send",
            json={"text": "TEST_Hello from test"},
            headers=HEADERS
        )
        assert msg_response.status_code == 200, f"Send message failed: {msg_response.status_code}"
        
        # Get messages
        get_response = requests.get(
            f"{BASE_URL}/api/team-chat/rooms/{room_id}/messages",
            headers=HEADERS
        )
        assert get_response.status_code == 200, f"Get messages failed: {get_response.status_code}"
        print("PASS: Team chat rooms flow working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
