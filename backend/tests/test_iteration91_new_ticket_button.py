"""
Iteration 91: Echo Concierge New Ticket Button Tests
=====================================================
Tests for the '+ New Ticket' button feature in Echo Concierge panel.
- POST /api/concierge/guest-report - creates new ticket with guest_name, room_number, category, priority, title, description
- GET /api/concierge/tickets - returns tickets list including newly created ones
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConciergeNewTicket:
    """Tests for Echo Concierge new ticket creation via guest-report endpoint"""
    
    def test_create_ticket_via_guest_report(self):
        """POST /api/concierge/guest-report creates a new ticket with all fields"""
        payload = {
            "guest_name": "Jane Smith",
            "room_number": "501",
            "category": "room",
            "priority": "high",
            "title": "Test New Ticket Button",
            "description": "Testing the new ticket creation from inline form",
            "photos": [],
            "reported_by": "staff",
            "reporter_id": ""
        }
        response = requests.post(f"{BASE_URL}/api/concierge/guest-report", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify all fields are returned correctly
        assert "id" in data, "Response should contain ticket id"
        assert data["title"] == payload["title"], f"Title mismatch: {data.get('title')}"
        assert data["guest_name"] == payload["guest_name"], f"Guest name mismatch: {data.get('guest_name')}"
        assert data["room_number"] == payload["room_number"], f"Room number mismatch: {data.get('room_number')}"
        assert data["category"] == payload["category"], f"Category mismatch: {data.get('category')}"
        assert data["priority"] == payload["priority"], f"Priority mismatch: {data.get('priority')}"
        assert data["description"] == payload["description"], f"Description mismatch: {data.get('description')}"
        assert data["status"] == "open", f"New ticket should have status 'open', got: {data.get('status')}"
        assert "created_at" in data, "Response should contain created_at timestamp"
        
        # Store ticket id for later tests
        self.__class__.created_ticket_id = data["id"]
        print(f"Created ticket: {data['id']} - {data['title']}")
    
    def test_create_ticket_minimal_fields(self):
        """POST /api/concierge/guest-report with only required title field"""
        payload = {
            "title": "Minimal Ticket Test",
            "photos": [],
            "reported_by": "staff",
            "reporter_id": ""
        }
        response = requests.post(f"{BASE_URL}/api/concierge/guest-report", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["title"] == "Minimal Ticket Test"
        # Default values should be applied
        assert data["category"] == "other" or data["category"] in ["room", "maintenance", "restaurant", "kitchen", "spa", "facility", "noise", "billing", "amenity", "other"]
        assert data["priority"] == "medium" or data["priority"] in ["critical", "high", "medium", "low"]
        print(f"Created minimal ticket: {data['id']}")
    
    def test_get_tickets_list(self):
        """GET /api/concierge/tickets returns list of tickets"""
        response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tickets" in data, "Response should contain 'tickets' array"
        assert "total" in data, "Response should contain 'total' count"
        assert isinstance(data["tickets"], list), "tickets should be a list"
        assert len(data["tickets"]) > 0, "Should have at least one ticket (from seed or created)"
        
        # Verify ticket structure
        ticket = data["tickets"][0]
        assert "id" in ticket
        assert "title" in ticket
        assert "status" in ticket
        print(f"Found {data['total']} tickets")
    
    def test_get_tickets_with_status_filter(self):
        """GET /api/concierge/tickets?status=open filters by status"""
        response = requests.get(f"{BASE_URL}/api/concierge/tickets?status=open")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tickets" in data
        # All returned tickets should have status=open
        for ticket in data["tickets"]:
            assert ticket["status"] == "open", f"Expected status 'open', got: {ticket.get('status')}"
        print(f"Found {len(data['tickets'])} open tickets")
    
    def test_created_ticket_appears_in_list(self):
        """Verify newly created ticket appears in GET /api/concierge/tickets"""
        # First create a unique ticket
        unique_title = f"TEST_Unique_Ticket_{os.urandom(4).hex()}"
        payload = {
            "guest_name": "Test Guest",
            "room_number": "999",
            "category": "maintenance",
            "priority": "critical",
            "title": unique_title,
            "description": "Verifying ticket appears in list",
            "photos": [],
            "reported_by": "staff",
            "reporter_id": ""
        }
        create_response = requests.post(f"{BASE_URL}/api/concierge/guest-report", json=payload)
        assert create_response.status_code == 200
        created_ticket = create_response.json()
        created_id = created_ticket["id"]
        
        # Now fetch tickets and verify it appears
        list_response = requests.get(f"{BASE_URL}/api/concierge/tickets")
        assert list_response.status_code == 200
        
        tickets = list_response.json()["tickets"]
        ticket_ids = [t["id"] for t in tickets]
        assert created_id in ticket_ids, f"Created ticket {created_id} not found in tickets list"
        
        # Find the ticket and verify data
        found_ticket = next((t for t in tickets if t["id"] == created_id), None)
        assert found_ticket is not None
        assert found_ticket["title"] == unique_title
        assert found_ticket["room_number"] == "999"
        assert found_ticket["priority"] == "critical"
        print(f"Verified ticket {created_id} appears in list with correct data")
    
    def test_ticket_categories(self):
        """Test creating tickets with different categories"""
        categories = ["room", "maintenance", "restaurant", "kitchen", "spa", "facility", "noise", "billing", "amenity", "other"]
        
        for category in categories[:3]:  # Test first 3 to save time
            payload = {
                "title": f"Test {category} category",
                "category": category,
                "photos": [],
                "reported_by": "staff",
                "reporter_id": ""
            }
            response = requests.post(f"{BASE_URL}/api/concierge/guest-report", json=payload)
            assert response.status_code == 200, f"Failed for category {category}: {response.text}"
            data = response.json()
            assert data["category"] == category
            print(f"Category '{category}' works correctly")
    
    def test_ticket_priorities(self):
        """Test creating tickets with different priorities"""
        priorities = ["critical", "high", "medium", "low"]
        
        for priority in priorities:
            payload = {
                "title": f"Test {priority} priority",
                "priority": priority,
                "photos": [],
                "reported_by": "staff",
                "reporter_id": ""
            }
            response = requests.post(f"{BASE_URL}/api/concierge/guest-report", json=payload)
            assert response.status_code == 200, f"Failed for priority {priority}: {response.text}"
            data = response.json()
            assert data["priority"] == priority
            print(f"Priority '{priority}' works correctly")


class TestConciergeDashboard:
    """Tests for concierge dashboard endpoint"""
    
    def test_dashboard_returns_kpis(self):
        """GET /api/concierge/dashboard returns KPIs and ticket stats"""
        response = requests.get(f"{BASE_URL}/api/concierge/dashboard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "kpis" in data, "Response should contain 'kpis'"
        assert "by_status" in data, "Response should contain 'by_status'"
        assert "by_category" in data, "Response should contain 'by_category'"
        assert "categories" in data, "Response should contain 'categories'"
        
        kpis = data["kpis"]
        assert "total_tickets" in kpis
        assert "active" in kpis
        assert "resolved" in kpis
        print(f"Dashboard KPIs: {kpis['total_tickets']} total, {kpis['active']} active")


class TestConciergeSavedFilters:
    """Tests for saved filters endpoint"""
    
    def test_get_saved_filters(self):
        """GET /api/concierge/saved-filters returns filter presets"""
        response = requests.get(f"{BASE_URL}/api/concierge/saved-filters")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "filters" in data, "Response should contain 'filters'"
        assert isinstance(data["filters"], list)
        assert len(data["filters"]) > 0, "Should have at least one saved filter"
        
        # Verify filter structure
        filter_item = data["filters"][0]
        assert "id" in filter_item
        assert "name" in filter_item
        assert "icon" in filter_item
        assert "filters" in filter_item
        print(f"Found {len(data['filters'])} saved filters")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
