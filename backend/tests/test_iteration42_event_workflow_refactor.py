"""
Iteration 42 - Event Workflow Refactoring Test
===============================================
Tests the refactored event_workflow module split into 6 sub-modules:
  - event_workflow.py (thin aggregator, ~30 lines)
  - event_workflow_core.py (shared models/constants/helpers)
  - event_workflow_booking.py (booking routes)
  - event_workflow_beo.py (BEO/menu routes)
  - event_workflow_financials.py (GL/financials routes)
  - event_workflow_labor.py (labor schedule routes)
  - event_workflow_purchasing.py (PO/invoice routes)

All 18 API routes must work identically to before the refactoring.
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestEventWorkflowRefactoring:
    """
    End-to-end test of the refactored event workflow module.
    Creates event -> attaches menu -> generates schedules -> posts financials -> verifies all GETs.
    """
    
    # Store event_id across tests
    event_id = None
    
    # ─── 1. BOOKING MODULE TESTS ───────────────────────────────────────
    
    def test_01_prospect_to_booking(self, api_client):
        """POST /api/event-workflow/prospect-to-booking - creates event, calendar, notification, schedule"""
        event_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "event_name": "TEST_Refactor_Gala_Iter42",
            "client_name": "TEST_Refactor_Client",
            "client_email": "test@refactor.com",
            "client_phone": "555-0142",
            "client_company": "Refactor Corp",
            "event_type": "corporate",
            "event_date": event_date,
            "start_time": "18:00",
            "end_time": "23:00",
            "guest_count": 150,
            "guaranteed_count": 140,
            "venue": "LUCCCA Hospitality",
            "room": "Grand Ballroom",
            "setup_style": "Banquet Rounds",
            "notes": "Testing refactored event workflow module"
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify event created
        assert "event" in data, "Response should contain 'event'"
        assert data["event"]["name"] == "TEST_Refactor_Gala_Iter42"
        assert data["event"]["guest_count"] == 150
        assert data["event"]["stage"] == "deposit_received", "Event should be advanced to deposit_received"
        
        # Verify calendar event created
        assert "calendar_event" in data, "Response should contain 'calendar_event'"
        assert data["calendar_event"]["title"] == "TEST_Refactor_Gala_Iter42"
        assert data["calendar_event"]["status"] == "confirmed"
        
        # Verify notification created
        assert "notification" in data, "Response should contain 'notification'"
        assert data["notification"]["type"] == "new_event"
        assert data["notification"]["module"] == "maestro-bqt"
        
        # Verify schedule entry created
        assert "schedule_entry" in data, "Response should contain 'schedule_entry'"
        assert data["schedule_entry"]["type"] == "event"
        assert data["schedule_entry"]["department"] == "banquet"
        
        # Verify changelog
        assert "changelog" in data, "Response should contain 'changelog'"
        assert len(data["changelog"]) >= 4, "Should have at least 4 changelog entries"
        
        # Store event_id for subsequent tests
        TestEventWorkflowRefactoring.event_id = data["event"]["id"]
        print(f"✓ Created event: {TestEventWorkflowRefactoring.event_id}")
    
    def test_02_get_changelog(self, api_client):
        """GET /api/event-workflow/changelog/{event_id} - changelog entries"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/changelog/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == event_id
        assert "changelog" in data
        assert data["total"] >= 4, "Should have at least 4 changelog entries from booking"
        
        # Verify changelog structure
        for entry in data["changelog"]:
            assert "id" in entry
            assert "action" in entry
            assert "details" in entry
            assert "module" in entry
            assert "timestamp" in entry
        
        print(f"✓ Changelog has {data['total']} entries")
    
    # ─── 2. BEO MODULE TESTS ───────────────────────────────────────────
    
    def test_03_attach_menu(self, api_client):
        """POST /api/event-workflow/attach-menu - creates BEO with menu courses"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        payload = {
            "event_id": event_id,
            "courses": [
                {
                    "course": "appetizer",
                    "dish_name": "TEST_Seared Scallops",
                    "description": "Pan-seared scallops with citrus beurre blanc",
                    "quantity": 1,
                    "portion_size_oz": 4.0
                },
                {
                    "course": "salad",
                    "dish_name": "TEST_Caesar Salad",
                    "description": "Classic Caesar with house-made dressing",
                    "quantity": 1,
                    "portion_size_oz": 4.0
                },
                {
                    "course": "entree",
                    "dish_name": "TEST_Filet Mignon",
                    "description": "8oz center-cut filet with red wine reduction",
                    "quantity": 1,
                    "portion_size_oz": 8.0,
                    "is_duo": False
                },
                {
                    "course": "dessert",
                    "dish_name": "TEST_Chocolate Mousse",
                    "description": "Dark chocolate mousse with raspberry coulis",
                    "quantity": 1,
                    "portion_size_oz": 5.0
                }
            ],
            "dietary_requirements": ["vegetarian option", "gluten-free option"],
            "beo_notes": "VIP table near stage. Client prefers minimal garlic."
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify BEO created
        assert "beo" in data, "Response should contain 'beo'"
        beo = data["beo"]
        assert beo["event_id"] == event_id
        assert beo["event_name"] == "TEST_Refactor_Gala_Iter42"
        assert len(beo["menu_items"]) == 4, "Should have 4 menu items"
        assert beo["guest_count"] == 150
        assert beo["status"] == "draft"
        
        # Verify menu items have portion standards
        for item in beo["menu_items"]:
            assert "portion_standard" in item
            assert "portion_size_oz" in item
            assert "portion_source" in item
        
        # Verify dietary requirements
        assert "vegetarian option" in beo["dietary_requirements"]
        
        print(f"✓ BEO created with {len(beo['menu_items'])} courses")
    
    def test_04_attach_layout(self, api_client):
        """POST /api/event-workflow/attach-layout - attaches layout to BEO"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        # First, get available templates
        templates_response = api_client.get(f"{BASE_URL}/api/echolayout/templates")
        template_id = "test-template-iter42"
        if templates_response.status_code == 200:
            templates_data = templates_response.json()
            # Handle both list and dict responses
            if isinstance(templates_data, list):
                templates = templates_data
            else:
                templates = templates_data.get("templates", [])
            if templates:
                template_id = templates[0]["id"]
        
        payload = {
            "event_id": event_id,
            "template_id": template_id
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/attach-layout", json=payload)
        
        # May return 404 if template doesn't exist - that's acceptable for refactoring test
        if response.status_code == 404:
            print("✓ attach-layout endpoint working (template not found - expected)")
            return
        
        assert response.status_code == 200, f"Expected 200 or 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == event_id
        assert "layout" in data
        
        print(f"✓ Layout attached: {data.get('layout', {}).get('name', 'N/A')}")
    
    def test_05_get_beo(self, api_client):
        """GET /api/event-workflow/beo/{event_id} - retrieve BEO with enriched data"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beo/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        beo = response.json()
        
        # Verify BEO structure
        assert beo["event_id"] == event_id
        assert beo["event_name"] == "TEST_Refactor_Gala_Iter42"
        assert "menu_items" in beo
        assert len(beo["menu_items"]) == 4
        assert "changelog" in beo
        assert "dietary_requirements" in beo
        assert "food_cost_target_min_pct" in beo
        assert "food_cost_target_max_pct" in beo
        
        print(f"✓ BEO retrieved with {len(beo['menu_items'])} items and {len(beo['changelog'])} changelog entries")
    
    def test_06_list_beos(self, api_client):
        """GET /api/event-workflow/beos - list all BEOs"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beos")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "beos" in data
        assert "total" in data
        assert data["total"] >= 1, "Should have at least 1 BEO"
        
        # Find our test BEO
        test_beo = next((b for b in data["beos"] if b["event_name"] == "TEST_Refactor_Gala_Iter42"), None)
        assert test_beo is not None, "Test BEO should be in the list"
        
        print(f"✓ Listed {data['total']} BEOs")
    
    def test_07_bqt_portion_standards(self, api_client):
        """GET /api/event-workflow/bqt-portion-standards - portion standards config"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/bqt-portion-standards")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "food_cost_target_min" in data
        assert "food_cost_target_max" in data
        assert "portions" in data
        
        # Verify portion standards
        portions = data["portions"]
        assert "appetizer" in portions
        assert "entree" in portions
        assert "entree_duo" in portions
        assert "dessert" in portions
        
        # Verify portion structure
        for course, std in portions.items():
            assert "min_oz" in std
            assert "max_oz" in std
            assert "typical_oz" in std
            assert "notes" in std
        
        print(f"✓ BQT portion standards: {data['food_cost_target_min']}-{data['food_cost_target_max']}% target")
    
    def test_08_food_cost_analysis(self, api_client):
        """POST /api/event-workflow/food-cost-analysis - food cost analysis"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        payload = {
            "event_id": event_id,
            "menu_price_per_guest": 95.00
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/food-cost-analysis", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify analysis structure
        assert data["event_id"] == event_id
        assert "guests" in data
        assert "menu_price_per_guest" in data
        assert "food_cost_per_guest" in data
        assert "total_food_cost" in data
        assert "food_cost_pct" in data
        assert "target_range" in data
        assert "status" in data
        assert "status_message" in data
        assert "item_analysis" in data
        assert "recommendations" in data
        assert "bqt_portion_standards" in data
        
        # Verify item analysis
        assert len(data["item_analysis"]) == 4, "Should have 4 items analyzed"
        for item in data["item_analysis"]:
            assert "course" in item
            assert "dish_name" in item
            assert "portion_size_oz" in item
            assert "portion_status" in item
            assert "cost_per_portion" in item
        
        print(f"✓ Food cost analysis: {data['food_cost_pct']}% ({data['status']})")
    
    def test_09_generate_missing_recipes(self, api_client):
        """POST /api/event-workflow/generate-missing-recipes - AI recipe generation (fallback)"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        payload = {"event_id": event_id}
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-missing-recipes", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # May have no missing recipes if they were already assigned
        assert "generated" in data
        assert "total_generated" in data or "message" in data
        
        if data.get("message") == "All menu items already have recipes":
            print("✓ No missing recipes to generate")
        else:
            print(f"✓ Generated {data.get('total_generated', 0)} recipes")
    
    # ─── 3. LABOR MODULE TESTS ─────────────────────────────────────────
    
    def test_10_generate_schedules(self, api_client):
        """POST /api/event-workflow/generate-schedules - labor schedules"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        payload = {"event_id": event_id}
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-schedules", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify schedules structure
        assert "schedules" in data
        assert "summary" in data
        assert len(data["schedules"]) == 4, "Should have 4 schedules (kitchen, setup, dining, steward)"
        
        # Verify each schedule type
        schedule_types = [s["schedule_type"] for s in data["schedules"]]
        assert "kitchen" in schedule_types
        assert "setup" in schedule_types
        assert "dining" in schedule_types
        assert "steward" in schedule_types
        
        # Verify schedule structure
        for schedule in data["schedules"]:
            assert "id" in schedule
            assert "event_id" in schedule
            assert "department" in schedule
            assert "gl_code" in schedule
            assert "hourly_rate" in schedule
            assert "staff_count" in schedule
            assert "shifts" in schedule
            assert "total_hours" in schedule
            assert "total_cost" in schedule
        
        # Verify summary
        summary = data["summary"]
        assert "total_staff" in summary
        assert "total_hours" in summary
        assert "total_labor_cost" in summary
        assert "by_department" in summary
        
        print(f"✓ Generated 4 schedules: {summary['total_staff']} staff, ${summary['total_labor_cost']:,.2f} total")
    
    def test_11_get_labor_schedules(self, api_client):
        """GET /api/event-workflow/schedules/{event_id} - retrieve schedules"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/schedules/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == event_id
        assert "schedules" in data
        assert data["total"] == 4, "Should have 4 schedules"
        
        print(f"✓ Retrieved {data['total']} labor schedules")
    
    # ─── 4. FINANCIALS MODULE TESTS ────────────────────────────────────
    
    def test_12_post_financials(self, api_client):
        """POST /api/event-workflow/post-financials - GL entries and P&L"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        payload = {
            "event_id": event_id,
            "menu_price_per_guest": 95.00,
            "beverage_price_per_guest": 45.00,
            "room_rental": 2500.00,
            "av_misc": 1200.00,
            "service_charge_pct": 22.0,
            "tax_pct": 7.5
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/post-financials", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "journal_id" in data
        assert "event_name" in data
        assert "guests" in data
        assert "revenue" in data
        assert "cogs" in data
        assert "labor" in data
        assert "operating_expenses" in data
        assert "pnl" in data
        assert "gl_entries" in data
        
        # Verify revenue breakdown
        revenue = data["revenue"]
        assert "food" in revenue
        assert "beverage" in revenue
        assert "room_rental" in revenue
        assert "av_misc" in revenue
        assert "subtotal" in revenue
        assert "service_charge" in revenue
        assert "tax" in revenue
        assert "total" in revenue
        
        # Verify COGS
        cogs = data["cogs"]
        assert "food" in cogs
        assert "beverage" in cogs
        assert "total" in cogs
        assert "food_cost_pct" in cogs
        assert "food_cost_status" in cogs
        
        # Verify labor
        labor = data["labor"]
        assert "by_department" in labor
        assert "total" in labor
        assert "labor_cost_pct" in labor
        
        # Verify P&L
        pnl = data["pnl"]
        assert "gross_profit" in pnl
        assert "gross_margin_pct" in pnl
        assert "net_profit" in pnl
        assert "net_margin_pct" in pnl
        
        # Verify GL entries
        assert len(data["gl_entries"]) >= 6, "Should have at least 6 GL entries"
        for entry in data["gl_entries"]:
            assert "gl_code" in entry
            assert "gl_name" in entry
            assert "entry_type" in entry
            assert "amount" in entry
        
        print(f"✓ Posted financials: Revenue ${revenue['total']:,.2f}, Net margin {pnl['net_margin_pct']}%")
    
    def test_13_get_gl_entries(self, api_client):
        """GET /api/event-workflow/gl-entries/{event_id} - retrieve GL entries"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/gl-entries/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == event_id
        assert "entries" in data
        assert data["total"] >= 6, "Should have at least 6 GL entries"
        
        # Verify GL codes are USALI compliant
        gl_codes = [e["gl_code"] for e in data["entries"]]
        assert "4100" in gl_codes, "Should have Banquet Food Revenue (4100)"
        assert "4110" in gl_codes, "Should have Banquet Beverage Revenue (4110)"
        
        print(f"✓ Retrieved {data['total']} GL entries")
    
    # ─── 5. PURCHASING MODULE TESTS ────────────────────────────────────
    
    def test_14_generate_purchase_orders(self, api_client):
        """POST /api/event-workflow/generate-purchase-orders - POs from recipes"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        payload = {"event_id": event_id}
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-purchase-orders", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "purchase_orders" in data
        assert "summary" in data
        
        # May have 0 POs if no recipes have ingredients
        if data["summary"]["total_pos"] > 0:
            for po in data["purchase_orders"]:
                assert "id" in po
                assert "event_id" in po
                assert "po_number" in po
                assert "vendor" in po
                assert "items" in po
                assert "subtotal" in po
                assert "status" in po
            
            print(f"✓ Generated {data['summary']['total_pos']} POs: ${data['summary']['total_cost']:,.2f}")
        else:
            print("✓ No POs generated (no recipe ingredients)")
    
    def test_15_get_purchase_orders(self, api_client):
        """GET /api/event-workflow/purchase-orders/{event_id} - retrieve POs"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/purchase-orders/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == event_id
        assert "purchase_orders" in data
        assert "total" in data
        
        print(f"✓ Retrieved {data['total']} purchase orders")
    
    def test_16_generate_invoices(self, api_client):
        """POST /api/event-workflow/generate-invoices - invoices from POs"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        payload = {"event_id": event_id}
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-invoices", json=payload)
        
        # May return 404 if no POs exist
        if response.status_code == 404:
            print("✓ No invoices generated (no POs exist)")
            return
        
        assert response.status_code == 200, f"Expected 200 or 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "invoices" in data
        assert "summary" in data
        
        if data["summary"]["total_invoices"] > 0:
            for inv in data["invoices"]:
                assert "id" in inv
                assert "invoice_number" in inv
                assert "vendor" in inv
                assert "po_id" in inv
                assert "items" in inv
                assert "total" in inv
                assert "gl_code" in inv
            
            print(f"✓ Generated {data['summary']['total_invoices']} invoices: ${data['summary']['total_amount']:,.2f}")
        else:
            print("✓ No invoices generated")
    
    def test_17_get_invoices(self, api_client):
        """GET /api/event-workflow/invoices/{event_id} - retrieve invoices"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/invoices/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == event_id
        assert "invoices" in data
        assert "total" in data
        
        print(f"✓ Retrieved {data['total']} invoices")
    
    # ─── 6. EVENT DASHBOARD TEST ───────────────────────────────────────
    
    def test_18_get_event_dashboard(self, api_client):
        """GET /api/event-workflow/event/{event_id} - full event dashboard"""
        event_id = TestEventWorkflowRefactoring.event_id
        assert event_id, "Event ID not set from previous test"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/event/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify full dashboard structure
        assert "event" in data, "Should have event"
        assert "beo" in data, "Should have BEO"
        assert "calendar_event" in data, "Should have calendar_event"
        assert "schedule_entry" in data, "Should have schedule_entry"
        assert "notifications" in data, "Should have notifications"
        assert "changelog" in data, "Should have changelog"
        
        # Verify event data
        event = data["event"]
        assert event["id"] == event_id
        assert event["name"] == "TEST_Refactor_Gala_Iter42"
        # Stage advances through workflow - may be beo_created, beo_approved, or layout_designed
        assert event["stage"] in ["deposit_received", "menu_selected", "beo_created", "beo_approved", "layout_designed"], \
            f"Unexpected stage: {event['stage']}"
        
        # Verify BEO data
        beo = data["beo"]
        assert beo is not None, "BEO should exist"
        assert len(beo["menu_items"]) == 4
        
        # Verify calendar event
        cal = data["calendar_event"]
        assert cal is not None, "Calendar event should exist"
        assert cal["title"] == "TEST_Refactor_Gala_Iter42"
        
        # Verify changelog has all entries
        assert len(data["changelog"]) >= 10, "Should have at least 10 changelog entries from full workflow"
        
        print(f"✓ Event dashboard complete: {len(data['changelog'])} changelog entries")


class TestEventWorkflowErrorHandling:
    """Test error handling for invalid requests"""
    
    def test_get_beo_not_found(self, api_client):
        """GET /api/event-workflow/beo/{event_id} - 404 for non-existent event"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beo/non-existent-event-id")
        assert response.status_code == 404
        print("✓ BEO not found returns 404")
    
    def test_get_event_not_found(self, api_client):
        """GET /api/event-workflow/event/{event_id} - 404 for non-existent event"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/event/non-existent-event-id")
        assert response.status_code == 404
        print("✓ Event not found returns 404")
    
    def test_attach_menu_event_not_found(self, api_client):
        """POST /api/event-workflow/attach-menu - 404 for non-existent event"""
        payload = {
            "event_id": "non-existent-event-id",
            "courses": [{"course": "appetizer", "dish_name": "Test"}]
        }
        response = api_client.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=payload)
        assert response.status_code == 404
        print("✓ Attach menu to non-existent event returns 404")
    
    def test_post_financials_event_not_found(self, api_client):
        """POST /api/event-workflow/post-financials - 404 for non-existent event"""
        payload = {"event_id": "non-existent-event-id"}
        response = api_client.post(f"{BASE_URL}/api/event-workflow/post-financials", json=payload)
        assert response.status_code == 404
        print("✓ Post financials to non-existent event returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
