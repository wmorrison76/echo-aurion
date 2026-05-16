"""
Iteration 24 - Event Workflow End-to-End Testing
=================================================
Tests the complete event workflow:
  Prospect → Booking → Calendar → 3-Course Menu BEO → Room Layout → 
  AI Recipe Generation → Labor Schedules (4 depts with separate GL codes) → 
  Purchase Orders → Mock Invoices → Financial Posting to EchoAurum with USALI GL codes.

Event: LUCCCA Launch Party, 390 guests (existing event ID: e0609bb9-8d50-45cd-bc0f-8af25cdd50f0)
Also tests creation of a new event: Test Gala 2026
"""
import pytest
import requests
import os
import math
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')

# Existing LUCCCA Launch Party event ID
LUCCCA_EVENT_ID = "e0609bb9-8d50-45cd-bc0f-8af25cdd50f0"

# Expected GL codes per USALI standards
EXPECTED_GL_CODES = {
    "revenue": {
        "banquet_revenue": "4100",
        "banquet_bev_revenue": "4110",
        "banquet_room_revenue": "4120",
        "banquet_av_revenue": "4130",
    },
    "expense": {
        "banquet_food_cogs": "5100",
        "banquet_bev_cogs": "5110",
        "labor_kitchen": "6100",
        "labor_setup": "6110",
        "labor_dining": "6120",
        "labor_stewarding": "6130",
        "banquet_opex": "7100",
        "banquet_linen": "7110",
    }
}

# Labor rates per department
LABOR_RATES = {
    "kitchen": {"rate": 22.50, "gl_code": "6100"},
    "setup": {"rate": 18.00, "gl_code": "6110"},
    "dining": {"rate": 20.00, "gl_code": "6120"},
    "steward": {"rate": 17.00, "gl_code": "6130"},
}


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestExistingLUCCCAEvent:
    """Tests for the existing LUCCCA Launch Party event (390 guests)"""
    
    def test_get_event_dashboard_returns_200(self, api_client):
        """GET /api/event-workflow/event/{event_id} returns unified event dashboard"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/event/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event" in data
        assert "beo" in data
        assert "calendar_event" in data
        assert "schedule_entry" in data
        assert "layout" in data
        assert "changelog" in data
        
        # Verify event details
        event = data["event"]
        assert event["name"] == "LUCCCA Launch Party"
        assert event["guest_count"] == 390
        assert event["guaranteed_count"] == 390
        print(f"✓ Event dashboard loaded: {event['name']} ({event['guest_count']} guests)")
    
    def test_get_beo_returns_full_beo_with_layout_and_recipes(self, api_client):
        """GET /api/event-workflow/beo/{event_id} returns full BEO with layout and recipes"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beo/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        beo = response.json()
        assert beo["event_name"] == "LUCCCA Launch Party"
        assert beo["guest_count"] == 390
        assert len(beo["menu_items"]) == 3, "Expected 3 courses"
        
        # Verify 3-course menu
        courses = [item["course"] for item in beo["menu_items"]]
        assert "appetizer" in courses
        assert "entree" in courses
        assert "dessert" in courses
        
        # Verify recipes are attached
        for item in beo["menu_items"]:
            assert item.get("recipe_id") is not None, f"Recipe missing for {item['dish_name']}"
            assert item.get("recipe_name") is not None, f"Recipe name missing for {item['dish_name']}"
        
        # Verify layout is attached
        assert beo.get("layout_id") is not None
        assert beo.get("layout_name") is not None
        assert "layout" in beo
        
        print(f"✓ BEO verified: {len(beo['menu_items'])} courses, layout: {beo['layout_name']}")
    
    def test_get_changelog_returns_complete_changelog(self, api_client):
        """GET /api/event-workflow/changelog/{event_id} returns complete changelog across all modules"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/changelog/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "changelog" in data
        changelog = data["changelog"]
        
        # Verify changelog has entries from multiple modules
        modules = set(entry["module"] for entry in changelog)
        expected_modules = {"echo-events", "calendar", "maestro-bqt", "schedule", "culinary", "echolayout", "echo-ai", "purchasing", "echo-aurum"}
        
        for module in expected_modules:
            assert module in modules, f"Missing changelog entries from module: {module}"
        
        # Verify key actions are logged
        actions = [entry["action"] for entry in changelog]
        expected_actions = ["event_created", "booking_confirmed", "calendar_synced", "maestro_notified", 
                          "schedule_marked", "menu_attached", "beo_created", "layout_attached",
                          "recipe_generated", "schedules_generated", "purchase_orders_created",
                          "invoices_created", "financials_posted"]
        
        for action in expected_actions:
            assert action in actions, f"Missing action in changelog: {action}"
        
        print(f"✓ Changelog verified: {len(changelog)} entries across {len(modules)} modules")


class TestLaborSchedules:
    """Tests for labor schedules with 4 departments and separate GL codes"""
    
    def test_get_schedules_returns_4_departments(self, api_client):
        """GET /api/event-workflow/schedules/{event_id} returns labor schedules for 4 departments"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/schedules/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        schedules = data["schedules"]
        assert len(schedules) == 4, f"Expected 4 schedules, got {len(schedules)}"
        
        # Verify all 4 department types
        schedule_types = {s["schedule_type"] for s in schedules}
        expected_types = {"kitchen", "setup", "dining", "steward"}
        assert schedule_types == expected_types, f"Expected {expected_types}, got {schedule_types}"
        
        print(f"✓ 4 labor schedules found: {schedule_types}")
    
    def test_each_schedule_has_separate_gl_code(self, api_client):
        """Each labor schedule has separate gl_code field"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/schedules/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        schedules = response.json()["schedules"]
        
        for schedule in schedules:
            schedule_type = schedule["schedule_type"]
            expected_gl = LABOR_RATES[schedule_type]["gl_code"]
            
            assert "gl_code" in schedule, f"Missing gl_code for {schedule_type}"
            assert schedule["gl_code"] == expected_gl, f"Wrong GL code for {schedule_type}: expected {expected_gl}, got {schedule['gl_code']}"
            
            # Verify hourly rate
            expected_rate = LABOR_RATES[schedule_type]["rate"]
            assert schedule["hourly_rate"] == expected_rate, f"Wrong rate for {schedule_type}: expected {expected_rate}, got {schedule['hourly_rate']}"
            
            print(f"✓ {schedule_type}: GL {schedule['gl_code']}, Rate ${schedule['hourly_rate']}/hr")
    
    def test_steward_count_calculation(self, api_client):
        """Steward count = ceil(guests/75), so 390 guests = 6 stewards"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/schedules/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        schedules = response.json()["schedules"]
        steward_schedule = next(s for s in schedules if s["schedule_type"] == "steward")
        
        # 390 guests / 75 = 5.2, ceil = 6 stewards
        expected_stewards = math.ceil(390 / 75)
        assert expected_stewards == 6, f"Math check: ceil(390/75) = {expected_stewards}"
        
        actual_stewards = steward_schedule["staff_count"]
        assert actual_stewards == expected_stewards, f"Expected {expected_stewards} stewards, got {actual_stewards}"
        
        print(f"✓ Steward count verified: {actual_stewards} stewards for 390 guests (ceil(390/75) = 6)")


class TestPurchaseOrdersAndInvoices:
    """Tests for purchase orders and mock invoices"""
    
    def test_get_purchase_orders_grouped_by_vendor(self, api_client):
        """GET /api/event-workflow/purchase-orders/{event_id} returns POs grouped by vendor"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/purchase-orders/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        pos = data["purchase_orders"]
        assert len(pos) >= 1, "Expected at least 1 PO"
        
        # Verify vendor grouping
        vendors = {po["vendor"] for po in pos}
        expected_vendors = {"Sysco Foods", "US Foods", "Chef's Warehouse"}
        
        for vendor in vendors:
            assert vendor in expected_vendors, f"Unexpected vendor: {vendor}"
        
        # Verify PO structure
        for po in pos:
            assert "po_number" in po
            assert "vendor" in po
            assert "items" in po
            assert "subtotal" in po
            assert len(po["items"]) > 0
        
        total_cost = sum(po["subtotal"] for po in pos)
        print(f"✓ {len(pos)} POs found: {vendors}, Total: ${total_cost:,.2f}")
    
    def test_get_invoices_returns_mock_vendor_invoices(self, api_client):
        """GET /api/event-workflow/invoices/{event_id} returns vendor invoices"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/invoices/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        invoices = data["invoices"]
        assert len(invoices) >= 1, "Expected at least 1 invoice"
        
        # Verify invoice structure
        for inv in invoices:
            assert "invoice_number" in inv
            assert "vendor" in inv
            assert "po_id" in inv
            assert "subtotal" in inv
            assert "tax_amount" in inv
            assert "total" in inv
            assert "gl_code" in inv
            assert inv["gl_code"] == "5100", f"Expected GL 5100 (COGS), got {inv['gl_code']}"
        
        total = sum(inv["total"] for inv in invoices)
        print(f"✓ {len(invoices)} invoices found, Total: ${total:,.2f}")


class TestGLEntriesAndFinancials:
    """Tests for GL journal entries with USALI codes"""
    
    def test_get_gl_entries_returns_journal_entries(self, api_client):
        """GET /api/event-workflow/gl-entries/{event_id} returns GL journal entries"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/gl-entries/{LUCCCA_EVENT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        entries = data["entries"]
        assert len(entries) >= 1, "Expected at least 1 GL entry"
        
        # Verify GL entry structure
        for entry in entries:
            assert "gl_code" in entry
            assert "gl_name" in entry
            assert "entry_type" in entry
            assert "debit" in entry
            assert "credit" in entry
            assert "amount" in entry
        
        print(f"✓ {len(entries)} GL entries found")
    
    def test_gl_entries_have_usali_revenue_codes(self, api_client):
        """GL entries include USALI revenue codes (4100-4130)"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/gl-entries/{LUCCCA_EVENT_ID}")
        entries = response.json()["entries"]
        
        gl_codes = {e["gl_code"] for e in entries}
        
        # Check revenue codes
        for code_name, code in EXPECTED_GL_CODES["revenue"].items():
            assert code in gl_codes, f"Missing revenue GL code {code} ({code_name})"
        
        print(f"✓ Revenue GL codes verified: 4100, 4110, 4120, 4130")
    
    def test_gl_entries_have_usali_expense_codes(self, api_client):
        """GL entries include USALI expense codes (5100-7110)"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/gl-entries/{LUCCCA_EVENT_ID}")
        entries = response.json()["entries"]
        
        gl_codes = {e["gl_code"] for e in entries}
        
        # Check expense codes (at least COGS and some labor)
        assert "5100" in gl_codes, "Missing GL 5100 (Food COGS)"
        assert "5110" in gl_codes, "Missing GL 5110 (Beverage COGS)"
        assert "7100" in gl_codes, "Missing GL 7100 (OpEx)"
        assert "7110" in gl_codes, "Missing GL 7110 (Linen)"
        
        # Check labor codes
        labor_codes = {"6100", "6110", "6120"}  # Kitchen, Setup, Dining
        found_labor = gl_codes.intersection(labor_codes)
        assert len(found_labor) >= 1, f"Missing labor GL codes. Found: {gl_codes}"
        
        print(f"✓ Expense GL codes verified: COGS (5100, 5110), Labor (6100-6130), OpEx (7100, 7110)")


class TestNewEventCreation:
    """Tests for creating a new event through the full workflow"""
    
    @pytest.fixture
    def test_event_name(self):
        """Generate unique test event name"""
        return f"TEST_Gala_{uuid.uuid4().hex[:8]}"
    
    def test_prospect_to_booking_creates_event(self, api_client, test_event_name):
        """POST /api/event-workflow/prospect-to-booking creates event, syncs calendar, notifies maestro, marks schedule"""
        payload = {
            "event_name": test_event_name,
            "client_name": "Test Client",
            "client_email": "test@example.com",
            "client_phone": "+1-555-0100",
            "client_company": "Test Corp",
            "event_type": "corporate",
            "event_date": "2026-07-20",
            "start_time": "19:00",
            "end_time": "23:00",
            "guest_count": 150,
            "guaranteed_count": 150,
            "venue": "Test Venue",
            "room": "Test Ballroom",
            "setup_style": "Banquet Rounds",
            "notes": "Test event for iteration 24"
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify event created
        assert "event" in data
        event = data["event"]
        assert event["name"] == test_event_name
        assert event["guest_count"] == 150
        assert event["stage"] == "deposit_received"
        
        # Verify calendar synced
        assert "calendar_event" in data
        cal = data["calendar_event"]
        assert cal["title"] == test_event_name
        assert cal["status"] == "confirmed"
        
        # Verify notification created
        assert "notification" in data
        notif = data["notification"]
        assert notif["type"] == "new_event"
        assert notif["module"] == "maestro-bqt"
        
        # Verify schedule entry
        assert "schedule_entry" in data
        sched = data["schedule_entry"]
        assert sched["title"] == test_event_name
        
        # Verify changelog
        assert "changelog" in data
        changelog = data["changelog"]
        actions = [c["action"] for c in changelog]
        assert "event_created" in actions
        assert "booking_confirmed" in actions
        assert "calendar_synced" in actions
        assert "maestro_notified" in actions
        assert "schedule_marked" in actions
        
        print(f"✓ Event created: {event['id'][:8]}... with calendar, notification, schedule")
        
        # Store event_id for cleanup
        return event["id"]
    
    def test_attach_menu_creates_beo_with_3_courses(self, api_client, test_event_name):
        """POST /api/event-workflow/attach-menu creates BEO with 3 courses"""
        # First create an event
        event_payload = {
            "event_name": test_event_name,
            "client_name": "Test Client",
            "event_type": "corporate",
            "event_date": "2026-07-21",
            "guest_count": 100,
        }
        event_response = api_client.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=event_payload)
        event_id = event_response.json()["event"]["id"]
        
        # Attach 3-course menu
        menu_payload = {
            "event_id": event_id,
            "courses": [
                {"course": "appetizer", "dish_name": "TEST Shrimp Cocktail", "description": "Jumbo shrimp", "quantity": 1},
                {"course": "entree", "dish_name": "TEST Grilled Salmon", "description": "Atlantic salmon", "quantity": 1},
                {"course": "dessert", "dish_name": "TEST Tiramisu", "description": "Classic Italian", "quantity": 1}
            ],
            "dietary_requirements": ["gluten-free"],
            "beo_notes": "Test BEO notes"
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=menu_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "beo" in data
        beo = data["beo"]
        assert len(beo["menu_items"]) == 3
        
        courses = [item["course"] for item in beo["menu_items"]]
        assert "appetizer" in courses
        assert "entree" in courses
        assert "dessert" in courses
        
        print(f"✓ BEO created with 3 courses for event {event_id[:8]}...")
    
    def test_generate_schedules_creates_4_labor_schedules(self, api_client, test_event_name):
        """POST /api/event-workflow/generate-schedules creates 4 labor schedules with correct GL codes"""
        # Create event with 150 guests
        event_payload = {
            "event_name": test_event_name,
            "client_name": "Test Client",
            "event_type": "corporate",
            "event_date": "2026-07-22",
            "guest_count": 150,
            "guaranteed_count": 150,
        }
        event_response = api_client.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=event_payload)
        event_id = event_response.json()["event"]["id"]
        
        # Generate schedules
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-schedules", json={"event_id": event_id})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        schedules = data["schedules"]
        assert len(schedules) == 4, f"Expected 4 schedules, got {len(schedules)}"
        
        # Verify GL codes
        for schedule in schedules:
            stype = schedule["schedule_type"]
            expected_gl = LABOR_RATES[stype]["gl_code"]
            assert schedule["gl_code"] == expected_gl, f"Wrong GL for {stype}"
        
        # Verify steward count for 150 guests: ceil(150/75) = 2
        steward = next(s for s in schedules if s["schedule_type"] == "steward")
        expected_stewards = math.ceil(150 / 75)
        assert steward["staff_count"] == expected_stewards, f"Expected {expected_stewards} stewards, got {steward['staff_count']}"
        
        print(f"✓ 4 schedules created with correct GL codes. Stewards: {steward['staff_count']}")
    
    def test_generate_purchase_orders_groups_by_vendor(self, api_client, test_event_name):
        """POST /api/event-workflow/generate-purchase-orders creates POs grouped by vendor"""
        # Create event and attach menu with recipes
        event_payload = {
            "event_name": test_event_name,
            "client_name": "Test Client",
            "event_type": "corporate",
            "event_date": "2026-07-23",
            "guest_count": 100,
        }
        event_response = api_client.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=event_payload)
        event_id = event_response.json()["event"]["id"]
        
        # Attach menu
        menu_payload = {
            "event_id": event_id,
            "courses": [
                {"course": "appetizer", "dish_name": "TEST Caesar Salad", "quantity": 1},
                {"course": "entree", "dish_name": "TEST Chicken Parmesan", "quantity": 1},
            ]
        }
        api_client.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=menu_payload)
        
        # Generate POs (may be empty if no recipes with ingredients)
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-purchase-orders", json={"event_id": event_id})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "purchase_orders" in data
        assert "summary" in data
        
        print(f"✓ PO generation endpoint working. POs: {len(data['purchase_orders'])}")
    
    def test_generate_invoices_creates_mock_invoices(self, api_client, test_event_name):
        """POST /api/event-workflow/generate-invoices creates mock vendor invoices"""
        # Use existing LUCCCA event which has POs
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-invoices", json={"event_id": LUCCCA_EVENT_ID})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invoices" in data
        invoices = data["invoices"]
        
        for inv in invoices:
            assert "invoice_number" in inv
            assert "vendor" in inv
            assert "total" in inv
            assert inv["status"] == "received"
        
        print(f"✓ Invoice generation working. Invoices: {len(invoices)}")
    
    def test_post_financials_creates_gl_entries(self, api_client, test_event_name):
        """POST /api/event-workflow/post-financials posts GL entries to EchoAurum"""
        # Create event with schedules
        event_payload = {
            "event_name": test_event_name,
            "client_name": "Test Client",
            "event_type": "corporate",
            "event_date": "2026-07-24",
            "guest_count": 100,
            "guaranteed_count": 100,
        }
        event_response = api_client.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=event_payload)
        event_id = event_response.json()["event"]["id"]
        
        # Generate schedules first (for labor costs)
        api_client.post(f"{BASE_URL}/api/event-workflow/generate-schedules", json={"event_id": event_id})
        
        # Post financials
        financials_payload = {
            "event_id": event_id,
            "menu_price_per_guest": 85.00,
            "beverage_price_per_guest": 40.00,
            "room_rental": 2000.00,
            "av_misc": 800.00,
            "service_charge_pct": 20.0,
            "tax_pct": 7.0
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/post-financials", json=financials_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify P&L structure
        assert "revenue" in data
        assert "cogs" in data
        assert "labor" in data
        assert "pnl" in data
        assert "gl_entries" in data
        
        # Verify revenue calculation
        revenue = data["revenue"]
        assert revenue["food"] == 8500.00  # 100 * 85
        assert revenue["beverage"] == 4000.00  # 100 * 40
        
        # Verify GL entries created
        gl_entries = data["gl_entries"]
        gl_codes = {e["gl_code"] for e in gl_entries}
        
        # Should have revenue codes
        assert "4100" in gl_codes, "Missing food revenue GL"
        assert "4110" in gl_codes, "Missing beverage revenue GL"
        
        # Should have expense codes
        assert "5100" in gl_codes, "Missing food COGS GL"
        assert "5110" in gl_codes, "Missing beverage COGS GL"
        
        print(f"✓ Financials posted. Revenue: ${data['revenue']['total']:,.2f}, Net margin: {data['pnl']['net_margin_pct']}%")


class TestErrorHandling:
    """Tests for error handling"""
    
    def test_get_event_not_found_returns_404(self, api_client):
        """GET /api/event-workflow/event/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/event/invalid-event-id")
        assert response.status_code == 404
    
    def test_get_beo_not_found_returns_404(self, api_client):
        """GET /api/event-workflow/beo/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beo/invalid-event-id")
        assert response.status_code == 404
    
    def test_attach_menu_invalid_event_returns_404(self, api_client):
        """POST /api/event-workflow/attach-menu with invalid event returns 404"""
        payload = {
            "event_id": "invalid-event-id",
            "courses": [{"course": "appetizer", "dish_name": "Test"}]
        }
        response = api_client.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=payload)
        assert response.status_code == 404


class TestHealthAndEndpoints:
    """Basic health and endpoint availability tests"""
    
    def test_health_endpoint(self, api_client):
        """GET /api/health returns 200"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Health check passed: {data.get('platform', 'LUCCCA')}")
    
    def test_list_beos_endpoint(self, api_client):
        """GET /api/event-workflow/beos returns list of BEOs"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beos")
        assert response.status_code == 200
        data = response.json()
        assert "beos" in data
        assert "total" in data
        print(f"✓ BEOs list: {data['total']} BEOs found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
