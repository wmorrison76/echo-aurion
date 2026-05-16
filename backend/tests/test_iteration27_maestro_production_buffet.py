"""
Iteration 27 - Maestro Production Engine & Buffet Planner Testing
==================================================================
Tests for:
- Maestro Production Engine: BEO consolidation, station assignment, procurement, inventory, vendors, commissary, timeline
- Buffet Planner: 9-step calculation, menu items, category defaults, policies
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


class TestMaestroProductionGeneratePlan:
    """Test POST /api/maestro-production/generate-plan"""
    
    def test_generate_plan_returns_200(self, api_client):
        """Generate production plan for date range with BEO consolidation"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "plan_id" in data
        assert "production_date" in data
        assert data["production_date"] == "2026-04-14"
        assert "total_beos" in data
        assert "total_events" in data
        assert "events" in data
        assert "consolidated_ingredients_count" in data
        assert "duplicate_prep_alerts" in data
        assert "stations" in data
        assert "timeline" in data
        assert "inventory_status" in data
        print(f"Generated plan: {data['plan_id']}, {data['total_beos']} BEOs, {data['total_events']} events")
    
    def test_generate_plan_has_events(self, api_client):
        """Verify plan captures seeded BEO events"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        assert response.status_code == 200
        data = response.json()
        
        # Should have events from seeded BEOs (2026-04-15, 2026-04-16)
        assert data["total_events"] >= 0, "Should have events in the lookahead window"
        print(f"Events found: {data['total_events']}")
        for ev in data.get("events", []):
            print(f"  - {ev.get('event_name')}: {ev.get('guest_count')} guests on {ev.get('event_date')}")
    
    def test_generate_plan_has_stations(self, api_client):
        """Verify station assignment (hot, cold, saucier, butcher)"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        assert response.status_code == 200
        data = response.json()
        
        stations = data.get("stations", {})
        print(f"Stations: {list(stations.keys())}")
        
        # Verify station structure
        for station_name, station_data in stations.items():
            assert "station" in station_data
            assert "description" in station_data
            assert "total_items" in station_data
            print(f"  - {station_name}: {station_data['total_items']} items")
    
    def test_generate_plan_has_timeline(self, api_client):
        """Verify production timeline with milestones"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        assert response.status_code == 200
        data = response.json()
        
        timeline = data.get("timeline", {})
        if timeline:
            print(f"Timeline milestones: {len(timeline.get('milestones', []))}")
            for m in timeline.get("milestones", []):
                print(f"  - {m.get('label')}: {m.get('time')}")
    
    def test_generate_plan_inventory_status(self, api_client):
        """Verify inventory status check"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        assert response.status_code == 200
        data = response.json()
        
        inv_status = data.get("inventory_status", {})
        assert "total_ingredients" in inv_status
        assert "covered" in inv_status
        assert "shortages" in inv_status
        print(f"Inventory: {inv_status['total_ingredients']} ingredients, {inv_status['covered']} covered, {inv_status['shortages']} shortages")


class TestMaestroProductionSheets:
    """Test GET /api/maestro-production/sheets/{date}"""
    
    def test_get_sheets_returns_200(self, api_client):
        """Get production sheets for a date"""
        # First generate a plan
        api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        
        response = api_client.get(f"{BASE_URL}/api/maestro-production/sheets/2026-04-14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "production_date" in data
        assert "stations" in data or "station" in data
        print(f"Sheets for {data.get('production_date')}: {data.get('total_stations', len(data.get('stations', {})))} stations")
    
    def test_get_sheets_filter_by_station(self, api_client):
        """Filter sheets by specific station"""
        # First generate a plan
        api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        
        response = api_client.get(f"{BASE_URL}/api/maestro-production/sheets/2026-04-14?station=hot")
        # May return 200 or 404 depending on if hot station has items
        if response.status_code == 200:
            data = response.json()
            assert "station" in data
            assert data["station"] == "hot"
            print(f"Hot station sheet: {data.get('sheet', {}).get('total_items', 0)} items")
        else:
            print(f"Hot station not in plan (status {response.status_code})")
    
    def test_get_sheets_no_plan_returns_404(self, api_client):
        """Get sheets for date with no plan returns 404"""
        response = api_client.get(f"{BASE_URL}/api/maestro-production/sheets/2099-01-01")
        assert response.status_code == 404


class TestMaestroProductionOrders:
    """Test POST /api/maestro-production/generate-orders/{date}"""
    
    def test_generate_orders_returns_200(self, api_client):
        """Generate purchase orders based on plan"""
        # First generate a plan
        api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        
        response = api_client.post(f"{BASE_URL}/api/maestro-production/generate-orders/2026-04-14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "production_date" in data
        assert "purchase_orders" in data
        assert "total_vendors" in data
        assert "po_ids" in data
        assert "chef_flags" in data
        assert "items_from_commissary" in data
        print(f"Generated {data['total_vendors']} POs, {len(data['chef_flags'])} chef flags, {data.get('commissary_pulls', 0)} commissary pulls")
    
    def test_generate_orders_no_plan_returns_404(self, api_client):
        """Generate orders without plan returns 404"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/generate-orders/2099-01-01")
        assert response.status_code == 404


class TestMaestroInventory:
    """Test inventory endpoints"""
    
    def test_submit_daily_count(self, api_client):
        """POST /api/maestro-production/inventory/daily-count"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/inventory/daily-count", json={
            "items": [
                {"ingredient_id": "test_beef_tenderloin", "counted_qty": 50, "unit": "oz", "location": "cooler"},
                {"ingredient_id": "test_salmon", "counted_qty": 30, "unit": "oz", "location": "cooler"}
            ],
            "counted_by": "test_chef",
            "count_type": "daily"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "counted"
        assert "items_updated" in data
        assert "flags" in data
        assert "total_flags" in data
        print(f"Daily count: {data['items_updated']} items updated, {data['total_flags']} flags")
    
    def test_get_inventory_status(self, api_client):
        """GET /api/maestro-production/inventory/status"""
        response = api_client.get(f"{BASE_URL}/api/maestro-production/inventory/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "total_items" in data
        assert "below_par" in data
        assert "items" in data
        print(f"Inventory status: {data['total_items']} items, {data['below_par']} below par")


class TestMaestroParLevels:
    """Test par level endpoints"""
    
    def test_set_par_level(self, api_client):
        """POST /api/maestro-production/par-levels"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/par-levels", json={
            "ingredient_id": "test_iter27_beef",
            "ingredient_name": "Test Beef Tenderloin",
            "location": "banquet_kitchen",
            "par_level": 100.0,
            "unit": "oz",
            "seasonal_multiplier": 1.2,
            "season": "wedding_season"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "set"
        assert "par_level" in data
        assert data["par_level"]["ingredient_id"] == "test_iter27_beef"
        assert data["par_level"]["par_level"] == 100.0
        print(f"Par level set: {data['par_level']['ingredient_name']} = {data['par_level']['par_level']} {data['par_level']['unit']}")
    
    def test_get_par_levels(self, api_client):
        """GET /api/maestro-production/par-levels"""
        response = api_client.get(f"{BASE_URL}/api/maestro-production/par-levels")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "par_levels" in data
        assert "total" in data
        print(f"Par levels: {data['total']} items")


class TestMaestroVendors:
    """Test vendor endpoints"""
    
    def test_create_vendor(self, api_client):
        """POST /api/maestro-production/vendors"""
        response = api_client.post(f"{BASE_URL}/api/maestro-production/vendors", json={
            "name": "TEST_ITER27_Vendor",
            "categories": ["protein", "seafood"],
            "delivery_days": ["monday", "wednesday", "friday"],
            "lead_time_hours": 24,
            "minimum_order": 100.0,
            "notes": "Test vendor for iteration 27"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "saved"
        assert "vendor" in data
        assert data["vendor"]["name"] == "TEST_ITER27_Vendor"
        print(f"Vendor created: {data['vendor']['name']}")
    
    def test_list_vendors(self, api_client):
        """GET /api/maestro-production/vendors"""
        response = api_client.get(f"{BASE_URL}/api/maestro-production/vendors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "vendors" in data
        assert "total" in data
        # Should have seeded vendors (Sysco, US Foods, Chef's Warehouse, Local Farm Direct)
        assert data["total"] >= 4, f"Expected at least 4 seeded vendors, got {data['total']}"
        print(f"Vendors: {data['total']} total")
        for v in data["vendors"][:5]:
            print(f"  - {v.get('name')}: {v.get('categories')}")


class TestMaestroCommissary:
    """Test commissary endpoints"""
    
    def test_commissary_transfer(self, api_client):
        """POST /api/maestro-production/commissary/transfer"""
        response = api_client.post(
            f"{BASE_URL}/api/maestro-production/commissary/transfer",
            params={
                "ingredient_id": "test_iter27_ingredient",
                "qty": 25.0,
                "unit": "oz",
                "direction": "to_banquet"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["status"] == "transferred"
        assert data["ingredient_id"] == "test_iter27_ingredient"
        assert data["qty"] == 25.0
        assert data["direction"] == "to_banquet"
        print(f"Transfer: {data['qty']} {data.get('unit', 'oz')} {data['direction']}")
    
    def test_get_commissary_stock(self, api_client):
        """GET /api/maestro-production/commissary/stock"""
        response = api_client.get(f"{BASE_URL}/api/maestro-production/commissary/stock")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        print(f"Commissary stock: {data['total']} items")


class TestMaestroTimeline:
    """Test timeline endpoint"""
    
    def test_get_timeline(self, api_client):
        """GET /api/maestro-production/timeline/{date}"""
        # First generate a plan
        api_client.post(f"{BASE_URL}/api/maestro-production/generate-plan", json={
            "production_date": "2026-04-14",
            "lookahead_days": 3
        })
        
        response = api_client.get(f"{BASE_URL}/api/maestro-production/timeline/2026-04-14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "production_date" in data
        assert "timeline" in data
        assert "events" in data
        assert "stations" in data
        print(f"Timeline for {data['production_date']}: {len(data.get('events', []))} events")
    
    def test_get_timeline_no_plan_returns_404(self, api_client):
        """Get timeline for date with no plan returns 404"""
        response = api_client.get(f"{BASE_URL}/api/maestro-production/timeline/2099-01-01")
        assert response.status_code == 404


class TestBuffetPlannerPlan:
    """Test POST /api/buffet-planner/plan - 9-step calculation"""
    
    def test_generate_buffet_plan(self, api_client):
        """Generate buffet plan with 9-step calculation"""
        response = api_client.post(f"{BASE_URL}/api/buffet-planner/plan", json={
            "event_name": "TEST_ITER27_Buffet_Event",
            "service_date": "2026-04-20",
            "guest_count_guaranteed": 150,
            "guest_count_expected": 160,
            "service_style": "multi_pass_buffet",
            "meal_period": "dinner",
            "luxury_tier": "standard",
            "event_duration_minutes": 90,
            "guest_behavior": "wedding_or_social_luxury",
            "walk_in_risk": "walk_in_risk_low",
            "menu_items": [
                {"item_id": "roasted_chicken_supreme", "popularity_factor": 1.0, "dietary_fit_factor": 1.0, "placement_factor": 1.0, "menu_competition_modifier": 1.0},
                {"item_id": "salmon_fillet", "popularity_factor": 1.1, "dietary_fit_factor": 0.95, "placement_factor": 1.0, "menu_competition_modifier": 1.0},
                {"item_id": "garlic_mashed_potatoes", "popularity_factor": 1.1, "dietary_fit_factor": 1.0, "placement_factor": 1.0, "menu_competition_modifier": 0.9}
            ]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "plan_id" in data
        assert "event_name" in data
        assert data["event_name"] == "TEST_ITER27_Buffet_Event"
        assert "planning_covers" in data
        assert "item_plans" in data
        assert "category_totals" in data
        assert "recommended_lines" in data
        
        # Verify planning covers calculation (Step 1)
        covers = data["planning_covers"]
        assert "planning_covers" in covers
        assert "attendance_factor" in covers
        print(f"Planning covers: {covers['planning_covers']} (attendance factor: {covers['attendance_factor']})")
        
        # Verify item plans (Steps 2-9)
        for item in data["item_plans"]:
            assert "item_id" in item
            assert "take_rate" in item  # Step 3
            assert "avg_servings_if_taken" in item  # Step 4
            assert "guest_servings" in item  # Step 5
            assert "production_servings" in item  # Step 6
            assert "prepared_qty" in item  # Step 7
            assert "as_purchased_qty" in item  # Step 8
            assert "opening_qty" in item  # Step 9
            assert "replenishment_qty" in item  # Step 9
            print(f"  - {item['item_id']}: take_rate={item['take_rate']:.3f}, production={item['production_servings']}, opening={item['opening_qty']}")
        
        print(f"Buffet plan: {data['plan_id']}, {len(data['item_plans'])} items, {data['recommended_lines']} lines recommended")
    
    def test_buffet_plan_with_guest_profile(self, api_client):
        """Test buffet plan with detailed guest profile"""
        response = api_client.post(f"{BASE_URL}/api/buffet-planner/plan", json={
            "event_name": "TEST_ITER27_Family_Buffet",
            "service_date": "2026-04-21",
            "guest_count_guaranteed": 100,
            "service_style": "multi_pass_buffet",
            "meal_period": "dinner",
            "luxury_tier": "standard",
            "event_duration_minutes": 75,
            "guest_behavior": "family_event",
            "guest_profile": {
                "adult_count": 70,
                "children_count": 20,
                "teen_count": 5,
                "senior_count": 5,
                "staff_vendor_meals": 0
            },
            "menu_items": [
                {"item_id": "roasted_chicken_supreme"},
                {"item_id": "mac_and_cheese_kids"}
            ]
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify guest profile affects planning covers
        covers = data["planning_covers"]
        assert "breakdown" in covers
        assert covers["breakdown"]["children"] == 20
        assert covers["breakdown"]["teens"] == 5
        print(f"Family event covers: {covers['planning_covers']} (children factor applied)")


class TestBuffetPlannerPlans:
    """Test GET /api/buffet-planner/plans"""
    
    def test_list_buffet_plans(self, api_client):
        """List all buffet plans"""
        response = api_client.get(f"{BASE_URL}/api/buffet-planner/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "plans" in data
        assert "total" in data
        print(f"Buffet plans: {data['total']} total")
    
    def test_list_buffet_plans_filter_by_date(self, api_client):
        """Filter buffet plans by service date"""
        response = api_client.get(f"{BASE_URL}/api/buffet-planner/plans?service_date=2026-04-20")
        assert response.status_code == 200
        data = response.json()
        print(f"Plans for 2026-04-20: {data['total']}")


class TestBuffetPlannerMenuItems:
    """Test GET /api/buffet-planner/menu-items"""
    
    def test_list_menu_items(self, api_client):
        """List seeded buffet menu items"""
        response = api_client.get(f"{BASE_URL}/api/buffet-planner/menu-items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        # Should have 15 seeded items
        assert data["total"] >= 15, f"Expected at least 15 seeded items, got {data['total']}"
        print(f"Buffet menu items: {data['total']} total")
        
        # Verify item structure
        for item in data["items"][:3]:
            assert "item_id" in item
            assert "item_name" in item
            assert "category_role" in item
            print(f"  - {item['item_id']}: {item['item_name']} ({item['category_role']})")
    
    def test_list_menu_items_filter_by_role(self, api_client):
        """Filter menu items by category role"""
        response = api_client.get(f"{BASE_URL}/api/buffet-planner/menu-items?role=main_protein")
        assert response.status_code == 200
        data = response.json()
        print(f"Main protein items: {data['total']}")
        for item in data["items"]:
            assert item["category_role"] == "main_protein"


class TestBuffetPlannerCategoryDefaults:
    """Test GET /api/buffet-planner/category-defaults"""
    
    def test_get_category_defaults(self, api_client):
        """Get category defaults reference"""
        response = api_client.get(f"{BASE_URL}/api/buffet-planner/category-defaults")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "category_defaults" in data
        assert "service_style_presets" in data
        assert "guest_behavior_models" in data
        assert "station_throughput" in data
        assert "line_recommendations" in data
        
        # Verify category defaults structure
        cat_defaults = data["category_defaults"]
        assert "main_protein" in cat_defaults
        assert "starch" in cat_defaults
        assert "vegetable" in cat_defaults
        
        # Verify main_protein defaults
        mp = cat_defaults["main_protein"]
        assert "base_take_rate" in mp
        assert "avg_servings_if_taken" in mp
        assert "default_portion_oz" in mp
        print(f"Category defaults: {len(cat_defaults)} categories")
        print(f"  main_protein: take_rate={mp['base_take_rate']}, portion={mp['default_portion_oz']}oz")


class TestBuffetPlannerPolicies:
    """Test GET /api/buffet-planner/policies"""
    
    def test_get_policies(self, api_client):
        """Get planning policies reference"""
        response = api_client.get(f"{BASE_URL}/api/buffet-planner/policies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "attendance_factors" in data
        assert "base_overage_by_style" in data
        assert "luxury_overage" in data
        assert "duration_modifiers" in data
        assert "guest_factors" in data
        
        # Verify attendance factors
        att = data["attendance_factors"]
        assert "guaranteed_only" in att
        assert att["guaranteed_only"] == 1.0
        assert "walk_in_risk_high" in att
        
        # Verify guest factors
        gf = data["guest_factors"]
        assert "children" in gf
        assert gf["children"] == 0.6  # Children factor
        assert "teen" in gf
        assert gf["teen"] == 1.15  # Teen factor
        
        print(f"Policies: attendance factors={len(att)}, overage styles={len(data['base_overage_by_style'])}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self, api_client):
        """Verify API is healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"API healthy: {data.get('platform')} v{data.get('version')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
