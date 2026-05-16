"""
Iteration 92: Test Outlet Selection and Kitchen Equipment Tracking
===================================================================
Tests for:
- GET /api/concierge/outlets - returns list of outlets (should be 11)
- GET /api/concierge/equipment - returns all kitchen equipment (24 items)
- GET /api/concierge/equipment?outlet_id=out-main-kitchen - filters to Main Kitchen (11 items)
- GET /api/concierge/equipment?outlet_id=out-pastry-shop - filters to Pastry Shop (5 items)
- POST /api/concierge/guest-report with outlet_id and equipment_id creates ticket correctly
- POST /api/concierge/guest-report with category='equipment' routes to engineering department
- GET /api/concierge/tickets returns tickets with outlet_id and equipment_name fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestOutletsEndpoint:
    """Test GET /api/concierge/outlets endpoint"""
    
    def test_outlets_returns_list(self):
        """GET /api/concierge/outlets returns list of outlets"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "outlets" in data, "Response should have 'outlets' key"
        assert isinstance(data["outlets"], list), "outlets should be a list"
        
    def test_outlets_count(self):
        """GET /api/concierge/outlets should return 11 outlets"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200
        
        data = response.json()
        outlets = data.get("outlets", [])
        # Should have 11 outlets (5 from admin onboarding + 6 from equipment-linked outlets)
        assert len(outlets) >= 11, f"Expected at least 11 outlets, got {len(outlets)}"
        print(f"Found {len(outlets)} outlets")
        
    def test_outlets_structure(self):
        """Each outlet should have outlet_id, name, type, location"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200
        
        data = response.json()
        outlets = data.get("outlets", [])
        assert len(outlets) > 0, "Should have at least one outlet"
        
        # Check first outlet has required fields
        outlet = outlets[0]
        assert "outlet_id" in outlet, "Outlet should have outlet_id"
        assert "name" in outlet, "Outlet should have name"
        assert "type" in outlet, "Outlet should have type"
        # location may be optional for some outlets
        
    def test_outlets_contains_equipment_linked_outlets(self):
        """Outlets should include equipment-linked outlets like Main Kitchen, Pastry Shop"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200
        
        data = response.json()
        outlets = data.get("outlets", [])
        outlet_ids = [o.get("outlet_id") for o in outlets]
        
        # Check for equipment-linked outlets
        assert "out-main-kitchen" in outlet_ids, "Should have Main Kitchen outlet"
        assert "out-pastry-shop" in outlet_ids, "Should have Pastry Shop outlet"


class TestEquipmentEndpoint:
    """Test GET /api/concierge/equipment endpoint"""
    
    def test_equipment_returns_list(self):
        """GET /api/concierge/equipment returns list of equipment"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "equipment" in data, "Response should have 'equipment' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["equipment"], list), "equipment should be a list"
        
    def test_equipment_count_all(self):
        """GET /api/concierge/equipment should return 24 items total"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment")
        assert response.status_code == 200
        
        data = response.json()
        equipment = data.get("equipment", [])
        total = data.get("total", 0)
        
        assert len(equipment) == 24, f"Expected 24 equipment items, got {len(equipment)}"
        assert total == 24, f"Expected total=24, got {total}"
        print(f"Found {len(equipment)} equipment items")
        
    def test_equipment_structure(self):
        """Each equipment should have equipment_id, name, outlet_id, type, make, model, location"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment")
        assert response.status_code == 200
        
        data = response.json()
        equipment = data.get("equipment", [])
        assert len(equipment) > 0, "Should have at least one equipment"
        
        # Check first equipment has required fields
        eq = equipment[0]
        assert "equipment_id" in eq, "Equipment should have equipment_id"
        assert "name" in eq, "Equipment should have name"
        assert "outlet_id" in eq, "Equipment should have outlet_id"
        assert "type" in eq, "Equipment should have type"
        assert "make" in eq, "Equipment should have make"
        assert "model" in eq, "Equipment should have model"
        assert "location" in eq, "Equipment should have location"
        
    def test_equipment_filter_main_kitchen(self):
        """GET /api/concierge/equipment?outlet_id=out-main-kitchen should return 11 items"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment?outlet_id=out-main-kitchen")
        assert response.status_code == 200
        
        data = response.json()
        equipment = data.get("equipment", [])
        total = data.get("total", 0)
        
        assert len(equipment) == 11, f"Expected 11 Main Kitchen equipment, got {len(equipment)}"
        assert total == 11, f"Expected total=11, got {total}"
        
        # Verify all items are from Main Kitchen
        for eq in equipment:
            assert eq.get("outlet_id") == "out-main-kitchen", f"Equipment {eq.get('name')} should be from Main Kitchen"
        print(f"Main Kitchen has {len(equipment)} equipment items")
        
    def test_equipment_filter_pastry_shop(self):
        """GET /api/concierge/equipment?outlet_id=out-pastry-shop should return 5 items"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment?outlet_id=out-pastry-shop")
        assert response.status_code == 200
        
        data = response.json()
        equipment = data.get("equipment", [])
        total = data.get("total", 0)
        
        assert len(equipment) == 5, f"Expected 5 Pastry Shop equipment, got {len(equipment)}"
        assert total == 5, f"Expected total=5, got {total}"
        
        # Verify all items are from Pastry Shop
        for eq in equipment:
            assert eq.get("outlet_id") == "out-pastry-shop", f"Equipment {eq.get('name')} should be from Pastry Shop"
        print(f"Pastry Shop has {len(equipment)} equipment items")
        
    def test_equipment_filter_nonexistent_outlet(self):
        """GET /api/concierge/equipment?outlet_id=nonexistent should return empty list"""
        response = requests.get(f"{BASE_URL}/api/concierge/equipment?outlet_id=nonexistent-outlet")
        assert response.status_code == 200
        
        data = response.json()
        equipment = data.get("equipment", [])
        total = data.get("total", 0)
        
        assert len(equipment) == 0, f"Expected 0 equipment for nonexistent outlet, got {len(equipment)}"
        assert total == 0, f"Expected total=0, got {total}"


class TestTicketCreationWithOutletEquipment:
    """Test ticket creation with outlet_id and equipment_id/equipment_name"""
    
    def test_create_ticket_with_outlet_and_equipment(self):
        """POST /api/concierge/guest-report with outlet_id and equipment_id creates ticket correctly"""
        payload = {
            "title": "TEST_Walk-In Cooler temp alarm",
            "guest_name": "Test Engineer",
            "room_number": "",
            "outlet_id": "out-main-kitchen",
            "category": "equipment",
            "priority": "critical",
            "description": "Temperature alarm triggered on walk-in cooler",
            "equipment_id": "eq-walk-in-cooler",
            "equipment_name": "Walk-In Cooler"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have ticket id"
        assert data.get("outlet_id") == "out-main-kitchen", "Ticket should have outlet_id"
        assert data.get("equipment_id") == "eq-walk-in-cooler", "Ticket should have equipment_id"
        assert data.get("equipment_name") == "Walk-In Cooler", "Ticket should have equipment_name"
        assert data.get("category") == "equipment", "Ticket should have category=equipment"
        assert data.get("priority") == "critical", "Ticket should have priority=critical"
        
        print(f"Created ticket: {data.get('id')}")
        return data.get("id")
        
    def test_equipment_category_routes_to_engineering(self):
        """POST /api/concierge/guest-report with category='equipment' routes to engineering department"""
        payload = {
            "title": "TEST_Fryer malfunction",
            "guest_name": "",
            "room_number": "",
            "outlet_id": "out-main-kitchen",
            "category": "equipment",
            "priority": "high",
            "description": "Deep fryer not heating properly",
            "equipment_id": "eq-fryer-bank",
            "equipment_name": "Deep Fryer Bank (3-well)"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("department") == "engineering", f"Equipment category should route to engineering, got {data.get('department')}"
        print(f"Ticket routed to department: {data.get('department')}")
        
    def test_kitchen_category_routes_to_culinary(self):
        """POST /api/concierge/guest-report with category='kitchen' routes to culinary department"""
        payload = {
            "title": "TEST_Food quality issue",
            "guest_name": "Test Guest",
            "room_number": "101",
            "outlet_id": "out-main-kitchen",
            "category": "kitchen",
            "priority": "medium",
            "description": "Food was cold"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("department") == "culinary", f"Kitchen category should route to culinary, got {data.get('department')}"
        
    def test_maintenance_category_routes_to_engineering(self):
        """POST /api/concierge/guest-report with category='maintenance' routes to engineering department"""
        payload = {
            "title": "TEST_Maintenance issue",
            "guest_name": "Test Guest",
            "room_number": "202",
            "outlet_id": "",
            "category": "maintenance",
            "priority": "medium",
            "description": "AC not working"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("department") == "engineering", f"Maintenance category should route to engineering, got {data.get('department')}"


class TestTicketsListWithOutletEquipment:
    """Test GET /api/concierge/tickets returns tickets with outlet_id and equipment_name"""
    
    def test_tickets_list_has_outlet_and_equipment_fields(self):
        """GET /api/concierge/tickets returns tickets with outlet_id and equipment_name fields"""
        # First create a ticket with outlet and equipment
        payload = {
            "title": "TEST_Verify ticket fields",
            "outlet_id": "out-pastry-shop",
            "category": "equipment",
            "priority": "low",
            "equipment_id": "eq-mixer-1",
            "equipment_name": "60-Qt Floor Mixer"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/concierge/guest-report",
            json=payload
        )
        assert create_response.status_code == 200
        created_ticket = create_response.json()
        ticket_id = created_ticket.get("id")
        
        # Now fetch tickets list
        response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        assert response.status_code == 200
        
        data = response.json()
        tickets = data.get("tickets", [])
        
        # Find our created ticket
        found_ticket = None
        for t in tickets:
            if t.get("id") == ticket_id:
                found_ticket = t
                break
                
        assert found_ticket is not None, f"Created ticket {ticket_id} should be in tickets list"
        assert "outlet_id" in found_ticket, "Ticket should have outlet_id field"
        assert "equipment_name" in found_ticket, "Ticket should have equipment_name field"
        assert found_ticket.get("outlet_id") == "out-pastry-shop", "Ticket outlet_id should match"
        assert found_ticket.get("equipment_name") == "60-Qt Floor Mixer", "Ticket equipment_name should match"
        
        print(f"Verified ticket {ticket_id} has outlet_id and equipment_name fields")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_tickets(self):
        """Cleanup: List test tickets created (for reference)"""
        response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        assert response.status_code == 200
        
        data = response.json()
        tickets = data.get("tickets", [])
        
        test_tickets = [t for t in tickets if t.get("title", "").startswith("TEST_")]
        print(f"Test tickets created: {len(test_tickets)}")
        for t in test_tickets:
            print(f"  - {t.get('id')}: {t.get('title')}")
