"""
Iteration 115: Outlet Menu Catalog + Dish Assembly Tests
=========================================================
Tests for:
- Outlet seeding (4 outlets: Signature Italian, Rooftop Lounge, Pool Bar & Grill, Family Dining)
- Menu retrieval (4 menus with 98 items routed to POS)
- Dish Assembly ticket creation with production steps
- POS Router integration (outlet_menu source items)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOutletMenusSeeding:
    """Test outlet and menu seeding from PDF imports"""
    
    def test_seed_outlets_creates_4_outlets_and_menus(self):
        """POST /api/outlet-menus/seed-outlets creates 4 outlets and 4 menus"""
        response = requests.post(f"{BASE_URL}/api/outlet-menus/seed-outlets")
        assert response.status_code == 200
        data = response.json()
        # Either seeded or already_seeded
        assert data.get("status") in ["seeded", "already_seeded"]
        if data.get("status") == "seeded":
            assert data.get("outlets") == 4
            assert data.get("menus") == 4
            assert data.get("items_routed", 0) >= 90  # ~98 items expected
        print(f"Seed result: {data}")

class TestOutletsList:
    """Test outlet listing"""
    
    def test_list_outlets_returns_4_outlets(self):
        """GET /api/outlet-menus/outlets returns 4 outlets"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus/outlets")
        assert response.status_code == 200
        data = response.json()
        outlets = data.get("outlets", [])
        
        # Filter to the 4 seeded outlets
        seeded_ids = ["out-signature", "out-rooftop", "out-poolbar", "out-family"]
        seeded_outlets = [o for o in outlets if o.get("outlet_id") in seeded_ids]
        assert len(seeded_outlets) == 4, f"Expected 4 seeded outlets, got {len(seeded_outlets)}"
        
        # Verify outlet names
        outlet_names = {o.get("name") for o in seeded_outlets}
        expected_names = {"Signature Italian", "Rooftop Lounge", "Pool Bar & Grill", "Family Dining"}
        assert outlet_names == expected_names, f"Expected {expected_names}, got {outlet_names}"
        print(f"Outlets: {[o.get('name') for o in seeded_outlets]}")

class TestMenusList:
    """Test menu listing"""
    
    def test_list_menus_returns_4_menus(self):
        """GET /api/outlet-menus returns 4 menus"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus")
        assert response.status_code == 200
        data = response.json()
        menus = data.get("menus", [])
        
        # Filter to the 4 seeded menus
        seeded_ids = ["om-signature-v1", "om-rooftop-v1", "om-poolbar-v1", "om-family-v1"]
        seeded_menus = [m for m in menus if m.get("menu_id") in seeded_ids]
        assert len(seeded_menus) == 4, f"Expected 4 seeded menus, got {len(seeded_menus)}"
        print(f"Menus: {[m.get('name') for m in seeded_menus]}")

class TestSignatureItalianMenu:
    """Test Signature Italian menu (fine dining)"""
    
    def test_get_signature_menu_full(self):
        """GET /api/outlet-menus/om-signature-v1 returns full menu with sections"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus/om-signature-v1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("menu_id") == "om-signature-v1"
        assert data.get("outlet_id") == "out-signature"
        assert data.get("name") == "Signature Italian Dinner Menu"
        
        sections = data.get("sections", [])
        section_names = [s.get("name") for s in sections]
        
        # Verify expected sections
        expected_sections = ["CAVIAR", "RAW BAR / CRUDO", "PASTA", "APPETIZERS", "ENTREES", "FOR THE TABLE", "VEGETABLES"]
        for sec in expected_sections:
            assert sec in section_names, f"Missing section: {sec}"
        
        print(f"Signature Italian sections: {section_names}")
    
    def test_get_signature_menu_items_flat(self):
        """GET /api/outlet-menus/om-signature-v1/items returns flat items list"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus/om-signature-v1/items")
        assert response.status_code == 200
        data = response.json()
        
        items = data.get("items", [])
        assert len(items) >= 20, f"Expected at least 20 items, got {len(items)}"
        
        # Check for specific items
        item_names = [i.get("name") for i in items]
        assert "Lobster Linguine Arrabbiata" in item_names, "Missing Lobster Linguine"
        assert "Bisteca alla Fiorentina" in item_names, "Missing Bisteca"
        print(f"Signature Italian items: {len(items)}")

class TestRooftopLoungeMenu:
    """Test Rooftop Lounge menu (cocktails, wine, beer, spirits)"""
    
    def test_get_rooftop_menu_full(self):
        """GET /api/outlet-menus/om-rooftop-v1 returns menu with cocktails and wine"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus/om-rooftop-v1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("menu_id") == "om-rooftop-v1"
        assert data.get("outlet_id") == "out-rooftop"
        
        sections = data.get("sections", [])
        section_names = [s.get("name") for s in sections]
        
        # Verify beverage sections
        assert "COCKTAILS" in section_names, "Missing COCKTAILS section"
        assert "WINE" in section_names, "Missing WINE section"
        assert "BEER" in section_names, "Missing BEER section"
        
        # Check for cocktails
        cocktails_section = next((s for s in sections if s.get("name") == "COCKTAILS"), None)
        assert cocktails_section is not None
        cocktail_items = cocktails_section.get("items", [])
        cocktail_names = [c.get("name") for c in cocktail_items]
        assert "Noir Martini" in cocktail_names, "Missing Noir Martini"
        
        print(f"Rooftop sections: {section_names}")

class TestPoolBarMenu:
    """Test Pool Bar & Grill menu (burgers, tacos, desserts)"""
    
    def test_get_poolbar_menu_full(self):
        """GET /api/outlet-menus/om-poolbar-v1 returns menu with mains and desserts"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus/om-poolbar-v1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("menu_id") == "om-poolbar-v1"
        assert data.get("outlet_id") == "out-poolbar"
        
        sections = data.get("sections", [])
        section_names = [s.get("name") for s in sections]
        
        assert "MAINS" in section_names, "Missing MAINS section"
        assert "DESSERTS" in section_names, "Missing DESSERTS section"
        
        # Check for specific items
        mains_section = next((s for s in sections if s.get("name") == "MAINS"), None)
        assert mains_section is not None
        main_items = mains_section.get("items", [])
        main_names = [m.get("name") for m in main_items]
        assert "Latin Burger" in main_names, "Missing Latin Burger"
        assert "Tacos de Carnitas" in main_names, "Missing Tacos de Carnitas"
        
        print(f"Pool Bar sections: {section_names}")

class TestFamilyDiningMenu:
    """Test Family Dining kids breakfast menu"""
    
    def test_get_family_menu_full(self):
        """GET /api/outlet-menus/om-family-v1 returns kids breakfast menu"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus/om-family-v1")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("menu_id") == "om-family-v1"
        assert data.get("outlet_id") == "out-family"
        assert "Kids Breakfast" in data.get("name", "")
        
        sections = data.get("sections", [])
        section_names = [s.get("name") for s in sections]
        
        assert "KIDS BREAKFAST" in section_names, "Missing KIDS BREAKFAST section"
        
        # Check for specific items
        breakfast_section = next((s for s in sections if s.get("name") == "KIDS BREAKFAST"), None)
        assert breakfast_section is not None
        items = breakfast_section.get("items", [])
        item_names = [i.get("name") for i in items]
        assert "Nutella Crepe" in item_names, "Missing Nutella Crepe"
        assert "Mini Waffle" in item_names, "Missing Mini Waffle"
        assert "Petite Pancake" in item_names, "Missing Petite Pancake"
        
        print(f"Family Dining sections: {section_names}")

class TestDishAssemblyTickets:
    """Test dish assembly ticket creation with production steps"""
    
    def test_create_ticket_latin_burger_routes_to_grill(self):
        """POST /api/outlet-menus/dish-assembly/ticket with Latin Burger routes to kitchen_hot with grill steps"""
        response = requests.post(f"{BASE_URL}/api/outlet-menus/dish-assembly/ticket", json={
            "item_name": "Latin Burger",
            "outlet_id": "out-poolbar",
            "table": "Pool 5",
            "quantity": 2
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("item_name") == "Latin Burger"
        assert data.get("outlet_id") == "out-poolbar"
        assert data.get("quantity") == 2
        assert data.get("status") == "fired"
        assert data.get("ticket_id") is not None
        
        # Check production steps include grill
        steps = data.get("production_steps", [])
        assert len(steps) >= 3, f"Expected at least 3 production steps, got {len(steps)}"
        step_actions = [s.get("action", "").lower() for s in steps]
        assert any("grill" in a for a in step_actions), f"Expected grill step, got {step_actions}"
        
        print(f"Latin Burger ticket: {data.get('ticket_id')}, printer: {data.get('chit_printer')}, steps: {len(steps)}")
    
    def test_create_ticket_noir_martini_routes_to_bar(self):
        """POST /api/outlet-menus/dish-assembly/ticket with Noir Martini routes to bar"""
        response = requests.post(f"{BASE_URL}/api/outlet-menus/dish-assembly/ticket", json={
            "item_name": "Noir Martini",
            "outlet_id": "out-rooftop",
            "table": "Rooftop 12",
            "quantity": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("item_name") == "Noir Martini"
        assert data.get("chit_printer") == "bar", f"Expected bar printer, got {data.get('chit_printer')}"
        
        # Check production steps are bar steps
        steps = data.get("production_steps", [])
        assert len(steps) >= 2, f"Expected at least 2 production steps, got {len(steps)}"
        step_stations = [s.get("station", "").lower() for s in steps]
        assert any("bar" in s for s in step_stations), f"Expected bar station, got {step_stations}"
        
        print(f"Noir Martini ticket: {data.get('ticket_id')}, printer: {data.get('chit_printer')}")
    
    def test_create_ticket_lobster_linguine_routes_to_pasta_station(self):
        """POST /api/outlet-menus/dish-assembly/ticket with Lobster Linguine gets pasta station steps"""
        response = requests.post(f"{BASE_URL}/api/outlet-menus/dish-assembly/ticket", json={
            "item_name": "Lobster Linguine Arrabbiata",
            "outlet_id": "out-signature",
            "table": "Table 8",
            "quantity": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "Lobster Linguine" in data.get("item_name", "")
        
        # Check production steps include pasta station
        steps = data.get("production_steps", [])
        assert len(steps) >= 3, f"Expected at least 3 production steps, got {len(steps)}"
        step_stations = [s.get("station", "").lower() for s in steps]
        assert any("pasta" in s for s in step_stations), f"Expected pasta station, got {step_stations}"
        
        print(f"Lobster Linguine ticket: {data.get('ticket_id')}, steps: {[s.get('station') for s in steps]}")
    
    def test_create_ticket_sorbet_gets_pastry_steps(self):
        """POST /api/outlet-menus/dish-assembly/ticket with Sorbet Frutina gets dessert/pastry steps"""
        response = requests.post(f"{BASE_URL}/api/outlet-menus/dish-assembly/ticket", json={
            "item_name": "Sorbet Frutina",
            "outlet_id": "out-poolbar",
            "table": "Pool 3",
            "quantity": 1
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "Sorbet" in data.get("item_name", "")
        
        # Check production steps include pastry
        steps = data.get("production_steps", [])
        assert len(steps) >= 2, f"Expected at least 2 production steps, got {len(steps)}"
        step_stations = [s.get("station", "").lower() for s in steps]
        assert any("pastry" in s for s in step_stations), f"Expected pastry station, got {step_stations}"
        
        print(f"Sorbet ticket: {data.get('ticket_id')}, steps: {[s.get('station') for s in steps]}")

class TestDishAssemblyQueue:
    """Test dish assembly queue operations"""
    
    def test_get_assembly_queue_returns_fired_tickets(self):
        """GET /api/outlet-menus/dish-assembly/queue returns fired tickets"""
        response = requests.get(f"{BASE_URL}/api/outlet-menus/dish-assembly/queue")
        assert response.status_code == 200
        data = response.json()
        
        tickets = data.get("tickets", [])
        assert isinstance(tickets, list)
        
        # All tickets should be fired status
        for ticket in tickets:
            assert ticket.get("status") == "fired"
            assert ticket.get("ticket_id") is not None
            assert ticket.get("item_name") is not None
        
        print(f"Assembly queue: {len(tickets)} fired tickets")
    
    def test_complete_ticket_marks_as_completed(self):
        """PUT /api/outlet-menus/dish-assembly/{ticket_id}/complete marks ticket as completed"""
        # First create a ticket
        create_response = requests.post(f"{BASE_URL}/api/outlet-menus/dish-assembly/ticket", json={
            "item_name": "Cheese Quesadilla",
            "outlet_id": "out-poolbar",
            "table": "Pool 7",
            "quantity": 1
        })
        assert create_response.status_code == 200
        ticket_id = create_response.json().get("ticket_id")
        
        # Complete the ticket
        complete_response = requests.put(f"{BASE_URL}/api/outlet-menus/dish-assembly/{ticket_id}/complete")
        assert complete_response.status_code == 200
        data = complete_response.json()
        
        assert data.get("ticket_id") == ticket_id
        assert data.get("status") == "completed"
        
        print(f"Completed ticket: {ticket_id}")
    
    def test_complete_nonexistent_ticket_returns_404(self):
        """PUT /api/outlet-menus/dish-assembly/nonexistent/complete returns 404"""
        response = requests.put(f"{BASE_URL}/api/outlet-menus/dish-assembly/nonexistent-ticket/complete")
        assert response.status_code == 404

class TestPOSRouterIntegration:
    """Test POS Router integration with outlet menus"""
    
    def test_pos_dashboard_shows_outlet_menu_source(self):
        """GET /api/pos-router/dashboard shows outlet_menu source count"""
        response = requests.get(f"{BASE_URL}/api/pos-router/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        by_source = data.get("by_source", {})
        outlet_menu_count = by_source.get("outlet_menu", 0)
        
        # Should have ~98 outlet menu items
        assert outlet_menu_count >= 90, f"Expected at least 90 outlet_menu items, got {outlet_menu_count}"
        
        total = data.get("total_pos_items", 0)
        assert total >= 285, f"Expected at least 285 total POS items, got {total}"
        
        print(f"POS Dashboard: total={total}, outlet_menu={outlet_menu_count}")
    
    def test_pos_items_filter_by_outlet_menu_source(self):
        """GET /api/pos-router/items?source=outlet_menu returns outlet items"""
        response = requests.get(f"{BASE_URL}/api/pos-router/items?source=outlet_menu")
        assert response.status_code == 200
        data = response.json()
        
        items = data.get("items", [])
        assert len(items) >= 90, f"Expected at least 90 outlet_menu items, got {len(items)}"
        
        # All items should have outlet_menu source
        for item in items[:10]:  # Check first 10
            assert item.get("source") == "outlet_menu", f"Expected outlet_menu source, got {item.get('source')}"
        
        print(f"Outlet menu POS items: {len(items)}")

class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
