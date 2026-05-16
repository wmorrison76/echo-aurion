"""
Iteration 9 - Resort Calendar Backend & Cross-Module Intelligence Tests
========================================================================
Tests for:
- GET /api/health (10 engines)
- Calendar endpoints: outlets, events CRUD, resort-pulse, module-feed, prospects
- Ordering endpoints: outlets, outlet-orders, menu, invoices, calendar-demand, invoice-to-inventory
- Operations endpoint: GET /api/operations/recipe/{recipe_id}
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Health check with 10 engines verification"""
    
    def test_health_returns_healthy_with_10_engines(self):
        """GET /api/health returns healthy with 10 engines"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        
        # Verify 10 engines are active
        engines = data.get("engines", {})
        assert len(engines) == 10, f"Expected 10 engines, got {len(engines)}"
        
        expected_engines = [
            "operations_core", "ai_forecasting", "pos_integration",
            "event_lifecycle", "labor_cost", "event_bus",
            "payroll", "workflow", "notifications", "tamper_audit"
        ]
        for engine in expected_engines:
            assert engine in engines, f"Missing engine: {engine}"
            assert engines[engine] == "active", f"Engine {engine} not active"


class TestCalendarOutlets:
    """Calendar outlets endpoints"""
    
    def test_list_outlets_returns_10_seeded(self):
        """GET /api/calendar/outlets returns 10 seeded resort outlets"""
        response = requests.get(f"{BASE_URL}/api/calendar/outlets")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert data["total"] == 10, f"Expected 10 outlets, got {data['total']}"
        
        outlets = data["data"]
        assert len(outlets) == 10
        
        # Verify outlet structure
        for outlet in outlets:
            assert "id" in outlet
            assert "name" in outlet
            assert "outlet_type" in outlet
        
        # Verify specific seeded outlets exist
        outlet_names = [o["name"] for o in outlets]
        assert "Main Dining Room" in outlet_names
        assert "Grand Ballroom" in outlet_names
        assert "Sky Bar & Lounge" in outlet_names
        assert "Main Kitchen (Production)" in outlet_names
        assert "Pastry Lab" in outlet_names


class TestCalendarEvents:
    """Calendar events CRUD endpoints"""
    
    def test_list_events_returns_seeded_events(self):
        """GET /api/calendar/events returns 6 seeded events"""
        response = requests.get(f"{BASE_URL}/api/calendar/events")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "total" in data
        # Should have at least 6 seeded events
        assert data["total"] >= 6, f"Expected at least 6 events, got {data['total']}"
        
        events = data["data"]
        # Verify event structure
        for event in events:
            assert "id" in event
            assert "title" in event
            assert "outlet_id" in event
            assert "start" in event
            assert "end" in event
    
    def test_create_event(self):
        """POST /api/calendar/events creates a new calendar event"""
        new_event = {
            "title": "TEST_Iteration9_Event",
            "outlet_id": "outlet-main-dining",
            "event_type": "event",
            "start": "2026-03-01T10:00:00Z",
            "end": "2026-03-01T14:00:00Z",
            "status": "confirmed",
            "guest_count": 50,
            "description": "Test event for iteration 9"
        }
        
        response = requests.post(f"{BASE_URL}/api/calendar/events", json=new_event)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST_Iteration9_Event"
        assert data["outlet_id"] == "outlet-main-dining"
        assert data["guest_count"] == 50
        
        # Store event_id for subsequent tests
        self.__class__.created_event_id = data["id"]
    
    def test_get_single_event(self):
        """GET /api/calendar/events/{event_id} returns single event"""
        # First create an event to get
        new_event = {
            "title": "TEST_GetSingleEvent",
            "outlet_id": "outlet-conference-a",
            "event_type": "meeting",
            "start": "2026-03-02T09:00:00Z",
            "end": "2026-03-02T11:00:00Z"
        }
        create_response = requests.post(f"{BASE_URL}/api/calendar/events", json=new_event)
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Now get the event
        response = requests.get(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert data["data"]["id"] == event_id
        assert data["data"]["title"] == "TEST_GetSingleEvent"
    
    def test_update_event(self):
        """PUT /api/calendar/events/{event_id} updates an event"""
        # Create event first
        new_event = {
            "title": "TEST_UpdateEvent_Original",
            "outlet_id": "outlet-sky-bar",
            "event_type": "event",
            "start": "2026-03-03T18:00:00Z",
            "end": "2026-03-03T22:00:00Z",
            "guest_count": 30
        }
        create_response = requests.post(f"{BASE_URL}/api/calendar/events", json=new_event)
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Update the event
        update_data = {
            "title": "TEST_UpdateEvent_Modified",
            "guest_count": 45
        }
        response = requests.put(f"{BASE_URL}/api/calendar/events/{event_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == "TEST_UpdateEvent_Modified"
        assert data["guest_count"] == 45
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert get_response.status_code == 200
        assert get_response.json()["data"]["title"] == "TEST_UpdateEvent_Modified"
    
    def test_delete_event(self):
        """DELETE /api/calendar/events/{event_id} deletes an event"""
        # Create event first
        new_event = {
            "title": "TEST_DeleteEvent",
            "outlet_id": "outlet-pool-deck",
            "event_type": "event",
            "start": "2026-03-04T10:00:00Z",
            "end": "2026-03-04T16:00:00Z"
        }
        create_response = requests.post(f"{BASE_URL}/api/calendar/events", json=new_event)
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Delete the event
        response = requests.delete(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["deleted"] == True
        assert data["id"] == event_id
        
        # Verify deletion with GET (should return 404)
        get_response = requests.get(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert get_response.status_code == 404


class TestResortPulse:
    """Resort Pulse AI3 insights endpoint"""
    
    def test_resort_pulse_returns_insights(self):
        """GET /api/calendar/resort-pulse?date=2026-02-14 returns AI3 insights"""
        response = requests.get(f"{BASE_URL}/api/calendar/resort-pulse?date=2026-02-14")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2026-02-14"
        assert "total_events" in data
        assert "total_guests" in data
        assert "outlets_active" in data
        assert "critical_alerts" in data
        assert "by_type" in data
        assert "events" in data
        assert "ai3_insights" in data
        
        # Verify AI3 insights structure
        insights = data["ai3_insights"]
        assert isinstance(insights, list)
        
        # On 2026-02-14, there should be events (wedding, prep, service)
        assert data["total_events"] >= 1, "Expected at least 1 event on 2026-02-14"


class TestModuleFeed:
    """Module-specific intelligence feed endpoints"""
    
    def test_module_feed_purchasing(self):
        """GET /api/calendar/module-feed/purchasing returns delivery and menu-related events"""
        response = requests.get(f"{BASE_URL}/api/calendar/module-feed/purchasing")
        assert response.status_code == 200
        
        data = response.json()
        assert data["module"] == "purchasing"
        assert "date_range" in data
        assert "events" in data
        assert "total" in data
        assert "summary" in data
        assert "total_guests" in data["summary"]
        assert "critical" in data["summary"]
    
    def test_module_feed_bqt(self):
        """GET /api/calendar/module-feed/bqt returns banquet and large guest events"""
        response = requests.get(f"{BASE_URL}/api/calendar/module-feed/bqt")
        assert response.status_code == 200
        
        data = response.json()
        assert data["module"] == "bqt"
        assert "events" in data
        # BQT should include events with large guest counts or in ballroom/banquet outlets
    
    def test_module_feed_culinary(self):
        """GET /api/calendar/module-feed/culinary returns prep and menu service events"""
        response = requests.get(f"{BASE_URL}/api/calendar/module-feed/culinary")
        assert response.status_code == 200
        
        data = response.json()
        assert data["module"] == "culinary"
        assert "events" in data
    
    def test_module_feed_engineering(self):
        """GET /api/calendar/module-feed/engineering returns maintenance events"""
        response = requests.get(f"{BASE_URL}/api/calendar/module-feed/engineering")
        assert response.status_code == 200
        
        data = response.json()
        assert data["module"] == "engineering"
        assert "events" in data
    
    def test_module_feed_schedule(self):
        """GET /api/calendar/module-feed/schedule returns all events"""
        response = requests.get(f"{BASE_URL}/api/calendar/module-feed/schedule")
        assert response.status_code == 200
        
        data = response.json()
        assert data["module"] == "schedule"
        assert "events" in data
        # Schedule module should return all events (no filtering)


class TestOrderingOutlets:
    """Ordering outlets endpoints"""
    
    def test_ordering_outlets_returns_10(self):
        """GET /api/ordering/outlets returns 10 resort outlets from calendar"""
        response = requests.get(f"{BASE_URL}/api/ordering/outlets")
        assert response.status_code == 200
        
        data = response.json()
        assert "outlets" in data
        assert "total" in data
        assert data["total"] == 10, f"Expected 10 outlets, got {data['total']}"
        
        outlets = data["outlets"]
        assert len(outlets) == 10


class TestOrderingOutletOrders:
    """Outlet-specific orders endpoint"""
    
    def test_outlet_orders_returns_orders(self):
        """GET /api/ordering/outlet-orders/{outlet_id} returns orders for specific outlet"""
        # Use main kitchen outlet
        outlet_id = "outlet-main-kitchen"
        response = requests.get(f"{BASE_URL}/api/ordering/outlet-orders/{outlet_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert "outlet_id" in data
        assert data["outlet_id"] == outlet_id
        assert "total" in data


class TestOrderingMenu:
    """Ordering menu endpoint"""
    
    def test_menu_returns_items_with_categories(self):
        """GET /api/ordering/menu returns 11 menu items with categories"""
        response = requests.get(f"{BASE_URL}/api/ordering/menu")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "categories" in data
        assert "total" in data
        
        # Should have at least 10 seeded menu items (may have more from previous tests)
        assert data["total"] >= 10, f"Expected at least 10 menu items, got {data['total']}"
        
        # Verify categories exist
        categories = data["categories"]
        assert len(categories) > 0
        
        # Verify item structure
        for item in data["items"]:
            assert "id" in item
            assert "name" in item
            assert "category" in item
            assert "price" in item


class TestOrderingInvoices:
    """Invoices endpoint"""
    
    def test_invoices_returns_list(self):
        """GET /api/ordering/invoices returns processed invoices"""
        response = requests.get(f"{BASE_URL}/api/ordering/invoices")
        assert response.status_code == 200
        
        data = response.json()
        assert "invoices" in data
        assert "total" in data


class TestCalendarDemand:
    """Calendar-driven demand analysis endpoint"""
    
    def test_calendar_demand_returns_analysis(self):
        """GET /api/ordering/calendar-demand returns demand analysis"""
        response = requests.get(f"{BASE_URL}/api/ordering/calendar-demand")
        assert response.status_code == 200
        
        data = response.json()
        assert "period" in data
        assert "from" in data["period"]
        assert "to" in data["period"]
        assert "upcoming_events" in data
        assert "demand_items" in data
        assert "purchase_suggestions" in data
        assert "total_covers" in data


class TestInvoiceToInventory:
    """Invoice to inventory processing endpoint"""
    
    def test_invoice_to_inventory_processes(self):
        """POST /api/ordering/invoice-to-inventory processes invoice and updates inventory"""
        invoice_data = {
            "vendor": "TEST_Vendor_Iter9",
            "outlet_id": "main",
            "invoice_number": "INV-TEST-009",
            "invoice_date": "2026-01-15",
            "items": [
                {
                    "name": "Test Item 1",
                    "quantity": 10,
                    "unit": "ea",
                    "unit_price": 5.00,
                    "total": 50.00
                },
                {
                    "name": "Test Item 2",
                    "quantity": 5,
                    "unit": "lb",
                    "unit_price": 12.00,
                    "total": 60.00
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/ordering/invoice-to-inventory", json=invoice_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "invoice_id" in data
        assert "vendor" in data
        assert data["vendor"] == "TEST_Vendor_Iter9"
        assert "total_items" in data
        assert data["total_items"] == 2
        assert "matched" in data
        assert "unmatched" in data
        assert "results" in data


class TestOperationsRecipe:
    """Operations recipe endpoint"""
    
    def test_get_recipe_returns_404_for_nonexistent(self):
        """GET /api/operations/recipe/{recipe_id} returns 404 for non-existent recipe"""
        response = requests.get(f"{BASE_URL}/api/operations/recipe/nonexistent-recipe-id")
        assert response.status_code == 404
    
    def test_get_recipe_returns_recipe_if_exists(self):
        """GET /api/operations/recipe/{recipe_id} returns recipe by ID if exists"""
        # First create a recipe
        recipe_data = {
            "name": "TEST_Recipe_Iter9",
            "category": "entree",
            "yield_qty": 4,
            "yield_unit": "portion",
            "ingredients": [],
            "instructions": ["Step 1", "Step 2"],
            "prep_time_min": 15,
            "cook_time_min": 30,
            "menu_price": 25.00
        }
        
        create_response = requests.post(f"{BASE_URL}/api/operations/recipe", json=recipe_data)
        assert create_response.status_code == 200
        recipe_id = create_response.json()["id"]
        
        # Now get the recipe
        response = requests.get(f"{BASE_URL}/api/operations/recipe/{recipe_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == recipe_id
        assert data["name"] == "TEST_Recipe_Iter9"


class TestCalendarProspects:
    """Calendar prospects endpoint"""
    
    def test_prospects_returns_list(self):
        """GET /api/calendar/prospects returns prospect events"""
        response = requests.get(f"{BASE_URL}/api/calendar/prospects")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "total" in data


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests complete"""
    yield
    # Note: In a real scenario, we'd delete test data here
    # For now, test data with TEST_ prefix can be identified and cleaned manually


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
