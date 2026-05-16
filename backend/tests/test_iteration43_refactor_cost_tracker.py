"""
Iteration 43 - Refactoring Verification + Event Cost Tracker Test
==================================================================
Tests:
1. NEW: Event Cost Tracker (3 endpoints)
2. REGRESSION: Event Workflow (18 routes - refactored into 6 sub-modules)
3. REGRESSION: Fresh Meals (28 routes - refactored into 6 sub-modules)
4. REGRESSION: Knowledge Engine (26 routes - refactored into 4 sub-modules)

All API routes must work identically at their original prefix paths.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ═══════════════════════════════════════════════════════════════════════════════
# 1. EVENT COST TRACKER (NEW FEATURE)
# ═══════════════════════════════════════════════════════════════════════════════

class TestEventCostTracker:
    """NEW: Event Cost Tracker endpoints"""
    
    def test_list_tracked_events(self, api_client):
        """GET /api/event-cost-tracker/events - list events with cost summary"""
        response = api_client.get(f"{BASE_URL}/api/event-cost-tracker/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "events" in data
        assert "total" in data
        assert data["total"] >= 1, "Should have at least 1 event"
        
        # Verify event structure
        if data["events"]:
            event = data["events"][0]
            assert "id" in event
            assert "name" in event
            assert "event_date" in event
            assert "event_type" in event
            assert "guest_count" in event
            assert "stage" in event
            assert "has_beo" in event
            assert "has_schedules" in event
            assert "has_financials" in event
            assert "food_cost" in event
            assert "labor_cost" in event
            assert "total_revenue" in event
            assert "total_expense" in event
            assert "net_margin_pct" in event
        
        print(f"✓ Event Cost Tracker: Listed {data['total']} events")
    
    def test_get_event_cost_detail(self, api_client):
        """GET /api/event-cost-tracker/event/{event_id} - detailed cost breakdown"""
        # First get an event with financials
        events_response = api_client.get(f"{BASE_URL}/api/event-cost-tracker/events")
        events = events_response.json().get("events", [])
        
        # Find an event with financials
        event_with_financials = next((e for e in events if e.get("has_financials")), None)
        if not event_with_financials:
            pytest.skip("No events with financials found")
        
        event_id = event_with_financials["id"]
        response = api_client.get(f"{BASE_URL}/api/event-cost-tracker/event/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "event" in data
        assert "food" in data
        assert "labor" in data
        assert "operating_expenses" in data
        assert "purchasing" in data
        assert "revenue" in data
        assert "expenses" in data
        assert "pnl" in data
        assert "alerts" in data
        assert "completeness" in data
        
        # Verify event details
        assert data["event"]["id"] == event_id
        
        # Verify food section
        assert "total_cost" in data["food"]
        assert "items_count" in data["food"]
        assert "cost_per_guest" in data["food"]
        assert "food_cost_pct" in data["food"]
        assert "target_range" in data["food"]
        
        # Verify labor section
        assert "total_cost" in data["labor"]
        assert "total_staff" in data["labor"]
        assert "labor_pct" in data["labor"]
        assert "by_department" in data["labor"]
        
        # Verify P&L section
        assert "gross_profit" in data["pnl"]
        assert "gross_margin_pct" in data["pnl"]
        assert "net_profit" in data["pnl"]
        assert "net_margin_pct" in data["pnl"]
        
        print(f"✓ Event Cost Detail: {data['event']['name']} - Net margin {data['pnl']['net_margin_pct']}%")
    
    def test_get_event_cost_detail_not_found(self, api_client):
        """GET /api/event-cost-tracker/event/{event_id} - 404 for non-existent"""
        response = api_client.get(f"{BASE_URL}/api/event-cost-tracker/event/non-existent-id")
        assert response.status_code == 404
        print("✓ Event Cost Detail: 404 for non-existent event")
    
    def test_get_aggregate_costs(self, api_client):
        """GET /api/event-cost-tracker/aggregate - portfolio-wide metrics"""
        response = api_client.get(f"{BASE_URL}/api/event-cost-tracker/aggregate")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "total_events" in data
        assert "total_guests" in data
        assert "total_revenue" in data
        assert "total_expenses" in data
        assert "total_labor" in data
        assert "total_po_value" in data
        assert "total_invoice_value" in data
        assert "net_profit" in data
        assert "net_margin_pct" in data
        assert "avg_revenue_per_event" in data
        assert "avg_revenue_per_guest" in data
        assert "events_by_type" in data
        
        print(f"✓ Aggregate Costs: {data['total_events']} events, ${data['total_revenue']:,.2f} revenue, {data['net_margin_pct']}% margin")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. EVENT WORKFLOW REGRESSION (Refactored into 6 sub-modules)
# ═══════════════════════════════════════════════════════════════════════════════

class TestEventWorkflowRegression:
    """REGRESSION: Event Workflow endpoints after refactoring"""
    
    event_id = None
    
    def test_01_prospect_to_booking(self, api_client):
        """POST /api/event-workflow/prospect-to-booking"""
        event_date = (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d")
        
        payload = {
            "event_name": "TEST_Iter43_Regression_Gala",
            "client_name": "TEST_Iter43_Client",
            "client_email": "test@iter43.com",
            "client_phone": "555-0143",
            "client_company": "Iter43 Corp",
            "event_type": "corporate",
            "event_date": event_date,
            "start_time": "18:00",
            "end_time": "23:00",
            "guest_count": 120,
            "guaranteed_count": 110,
            "venue": "LUCCCA Hospitality",
            "room": "Crystal Ballroom",
            "setup_style": "Banquet Rounds",
            "notes": "Iteration 43 regression test"
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "event" in data
        assert data["event"]["name"] == "TEST_Iter43_Regression_Gala"
        assert "calendar_event" in data
        assert "notification" in data
        assert "schedule_entry" in data
        assert "changelog" in data
        
        TestEventWorkflowRegression.event_id = data["event"]["id"]
        print(f"✓ Prospect to Booking: Created event {TestEventWorkflowRegression.event_id}")
    
    def test_02_attach_menu(self, api_client):
        """POST /api/event-workflow/attach-menu"""
        event_id = TestEventWorkflowRegression.event_id
        assert event_id, "Event ID not set"
        
        payload = {
            "event_id": event_id,
            "courses": [
                {"course": "appetizer", "dish_name": "TEST_Shrimp Cocktail", "portion_size_oz": 4.0},
                {"course": "entree", "dish_name": "TEST_Prime Rib", "portion_size_oz": 10.0},
                {"course": "dessert", "dish_name": "TEST_Tiramisu", "portion_size_oz": 5.0}
            ],
            "dietary_requirements": ["gluten-free option"],
            "beo_notes": "Iter43 test menu"
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "beo" in data
        assert len(data["beo"]["menu_items"]) == 3
        print("✓ Attach Menu: Created BEO with 3 courses")
    
    def test_03_get_beo(self, api_client):
        """GET /api/event-workflow/beo/{event_id}"""
        event_id = TestEventWorkflowRegression.event_id
        assert event_id, "Event ID not set"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beo/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        beo = response.json()
        assert beo["event_id"] == event_id
        assert "menu_items" in beo
        assert "changelog" in beo
        print("✓ Get BEO: Retrieved BEO successfully")
    
    def test_04_list_beos(self, api_client):
        """GET /api/event-workflow/beos"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/beos")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "beos" in data
        assert "total" in data
        assert data["total"] >= 1
        print(f"✓ List BEOs: {data['total']} BEOs found")
    
    def test_05_bqt_portion_standards(self, api_client):
        """GET /api/event-workflow/bqt-portion-standards"""
        response = api_client.get(f"{BASE_URL}/api/event-workflow/bqt-portion-standards")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "food_cost_target_min" in data
        assert "food_cost_target_max" in data
        assert "portions" in data
        assert "appetizer" in data["portions"]
        assert "entree" in data["portions"]
        print("✓ BQT Portion Standards: Retrieved successfully")
    
    def test_06_generate_schedules(self, api_client):
        """POST /api/event-workflow/generate-schedules"""
        event_id = TestEventWorkflowRegression.event_id
        assert event_id, "Event ID not set"
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/generate-schedules", json={"event_id": event_id})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "schedules" in data
        assert "summary" in data
        assert len(data["schedules"]) == 4
        print(f"✓ Generate Schedules: Created 4 schedules, ${data['summary']['total_labor_cost']:,.2f} total")
    
    def test_07_post_financials(self, api_client):
        """POST /api/event-workflow/post-financials"""
        event_id = TestEventWorkflowRegression.event_id
        assert event_id, "Event ID not set"
        
        payload = {
            "event_id": event_id,
            "menu_price_per_guest": 85.00,
            "beverage_price_per_guest": 40.00,
            "room_rental": 2000.00,
            "av_misc": 800.00,
            "service_charge_pct": 22.0,
            "tax_pct": 7.5
        }
        
        response = api_client.post(f"{BASE_URL}/api/event-workflow/post-financials", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "journal_id" in data
        assert "revenue" in data
        assert "cogs" in data
        assert "labor" in data
        assert "pnl" in data
        assert "gl_entries" in data
        print(f"✓ Post Financials: Revenue ${data['revenue']['total']:,.2f}, Net margin {data['pnl']['net_margin_pct']}%")
    
    def test_08_get_gl_entries(self, api_client):
        """GET /api/event-workflow/gl-entries/{event_id}"""
        event_id = TestEventWorkflowRegression.event_id
        assert event_id, "Event ID not set"
        
        response = api_client.get(f"{BASE_URL}/api/event-workflow/gl-entries/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["event_id"] == event_id
        assert "entries" in data
        assert data["total"] >= 6
        print(f"✓ Get GL Entries: {data['total']} entries")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. FRESH MEALS REGRESSION (Refactored into 6 sub-modules)
# ═══════════════════════════════════════════════════════════════════════════════

class TestFreshMealsRegression:
    """REGRESSION: Fresh Meals endpoints after refactoring"""
    
    def test_overview(self, api_client):
        """GET /api/fresh-meals/overview"""
        response = api_client.get(f"{BASE_URL}/api/fresh-meals/overview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data
        assert "total_products" in data
        assert "active_production_runs" in data
        assert "active_subscriptions" in data
        print(f"✓ Fresh Meals Overview: {data['total_products']} products, {data['active_subscriptions']} subscriptions")
    
    def test_get_products(self, api_client):
        """GET /api/fresh-meals/products"""
        response = api_client.get(f"{BASE_URL}/api/fresh-meals/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data
        count = data.get("total", data.get("count", len(data.get("products", []))))
        print(f"✓ Fresh Meals Products: {count} products")
    
    def test_create_product(self, api_client):
        """POST /api/fresh-meals/products"""
        payload = {
            "name": "TEST_Iter43_Meal_Kit",
            "product_type": "meal_kit",
            "sku": f"TEST-ITER43-{datetime.now().strftime('%H%M%S')}",
            "description": "Test meal kit for iteration 43",
            "base_price": 24.99,
            "servings": 2,
            "prep_time_minutes": 30,
            "shelf_life_days": 5,
            "storage_temp": "refrigerated",
            "channels": ["retail", "subscription"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/fresh-meals/products", json=payload)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Product created - response contains product data directly or nested
        assert "name" in data or "product" in data or "sku" in data
        print("✓ Fresh Meals Create Product: Created successfully")
    
    def test_get_production_runs(self, api_client):
        """GET /api/fresh-meals/production-runs"""
        response = api_client.get(f"{BASE_URL}/api/fresh-meals/production-runs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "runs" in data or "production_runs" in data
        print("✓ Fresh Meals Production Runs: Retrieved successfully")
    
    def test_get_subscriptions(self, api_client):
        """GET /api/fresh-meals/subscriptions"""
        response = api_client.get(f"{BASE_URL}/api/fresh-meals/subscriptions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscriptions" in data
        print(f"✓ Fresh Meals Subscriptions: {data.get('total', len(data.get('subscriptions', [])))} subscriptions")
    
    def test_safety_check(self, api_client):
        """POST /api/fresh-meals/safety/check"""
        payload = {
            "product_id": "test-product",
            "batch_id": "test-batch",
            "check_type": "temperature",
            "temperature_reading": 38.5,
            "humidity_reading": 45.0
        }
        
        response = api_client.post(f"{BASE_URL}/api/fresh-meals/safety/check", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Safety check returns check record with check_type, created_at, etc.
        assert "check_type" in data or "status" in data or "result" in data
        print("✓ Fresh Meals Safety Check: Completed successfully")
    
    def test_ops_dashboard(self, api_client):
        """GET /api/fresh-meals/ops-dashboard"""
        response = api_client.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify it returns dashboard data
        assert isinstance(data, dict)
        print("✓ Fresh Meals Ops Dashboard: Retrieved successfully")


# ═══════════════════════════════════════════════════════════════════════════════
# 4. KNOWLEDGE ENGINE REGRESSION (Refactored into 4 sub-modules)
# ═══════════════════════════════════════════════════════════════════════════════

class TestKnowledgeEngineRegression:
    """REGRESSION: Knowledge Engine endpoints after refactoring"""
    
    def test_get_domains(self, api_client):
        """GET /api/knowledge-engine/domains"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/domains")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "domains" in data
        assert "count" in data
        assert data["count"] >= 15, "Should have at least 15 knowledge domains"
        print(f"✓ Knowledge Engine Domains: {data['count']} domains loaded")
    
    def test_get_packages(self, api_client):
        """GET /api/knowledge-engine/packages"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/packages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "packages" in data or isinstance(data, list)
        print("✓ Knowledge Engine Packages: Retrieved successfully")
    
    def test_recommend_staffing(self, api_client):
        """POST /api/knowledge-engine/recommend/staffing"""
        payload = {
            "event_type": "corporate",
            "guest_count": 150,
            "service_style": "plated",
            "duration_hours": 4
        }
        
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/staffing", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recommendation" in data or "staffing" in data or "total_staff" in data
        print("✓ Knowledge Engine Staffing Recommendation: Generated successfully")
    
    def test_recommend_layout(self, api_client):
        """POST /api/knowledge-engine/recommend/layout"""
        payload = {
            "event_type": "wedding",
            "guest_count": 200,
            "room_sqft": 5000,
            "setup_style": "banquet_rounds"
        }
        
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/layout", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "recommendation" in data or "layout" in data or "tables" in data
        print("✓ Knowledge Engine Layout Recommendation: Generated successfully")
    
    def test_recommend_risk_assessment(self, api_client):
        """POST /api/knowledge-engine/recommend/risk-assessment"""
        payload = {
            "event_type": "gala",
            "guest_count": 300,
            "menu_items": ["seafood", "beef", "vegetarian"],
            "outdoor": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/risk-assessment", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "risks" in data or "assessment" in data or "risk_score" in data
        print("✓ Knowledge Engine Risk Assessment: Generated successfully")
    
    def test_recommend_pricing(self, api_client):
        """POST /api/knowledge-engine/recommend/pricing"""
        payload = {
            "event_type": "corporate",
            "guest_count": 100,
            "service_style": "buffet",
            "menu_tier": "premium"
        }
        
        response = api_client.post(f"{BASE_URL}/api/knowledge-engine/recommend/pricing", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pricing" in data or "recommendation" in data or "price_per_guest" in data
        print("✓ Knowledge Engine Pricing Recommendation: Generated successfully")
    
    def test_get_lifecycle_stages(self, api_client):
        """GET /api/knowledge-engine/recommend/lifecycle-stages"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/recommend/lifecycle-stages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "stages" in data or isinstance(data, list)
        print("✓ Knowledge Engine Lifecycle Stages: Retrieved successfully")
    
    def test_get_overrides(self, api_client):
        """GET /api/knowledge-engine/overrides"""
        response = api_client.get(f"{BASE_URL}/api/knowledge-engine/overrides")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "overrides" in data or isinstance(data, (list, dict))
        print("✓ Knowledge Engine Overrides: Retrieved successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
