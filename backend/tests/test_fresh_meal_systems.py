"""
Fresh Meal Systems Module - Backend API Tests
Tests all 24+ endpoints for the FMS manufacturing-grade orchestration platform.
Covers: Overview, Products, Production Runs, Assembly Lanes, Packaging, 
Subscriptions, Distribution, Forecasting, Margin Analysis, Safety, Routes, Shelf Life
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFreshMealSystemsOverview:
    """Overview endpoint tests - system status and KPIs"""
    
    def test_overview_returns_operational_status(self):
        """GET /api/fresh-meals/overview returns operational status"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/overview")
        assert response.status_code == 200
        data = response.json()
        
        # Verify status
        assert data.get("status") == "operational"
        assert "total_products" in data
        assert "active_production_runs" in data
        assert "active_assembly_lanes" in data
        assert "active_subscriptions" in data
        assert "total_routes" in data
        
    def test_overview_has_kb_loaded(self):
        """Overview shows knowledge base is loaded"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/overview")
        data = response.json()
        assert data.get("knowledge_base_loaded") == True
        
    def test_overview_has_channels(self):
        """Overview returns available distribution channels"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/overview")
        data = response.json()
        channels = data.get("available_channels", [])
        assert len(channels) >= 5
        assert "direct_to_consumer" in channels
        
    def test_overview_has_zones(self):
        """Overview returns cold chain zones and assembly zones"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/overview")
        data = response.json()
        assert "cold_chain_zones" in data
        assert "assembly_zones" in data
        assert len(data["cold_chain_zones"]) >= 3
        
    def test_overview_has_lane_throughput_reference(self):
        """Overview returns lane throughput reference"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/overview")
        data = response.json()
        ref = data.get("lane_throughput_reference", {})
        assert "standard_lane_kits_per_hour" in ref


class TestFreshMealSystemsProducts:
    """Product CRUD tests with auto-atomization"""
    
    def test_create_product_with_auto_atomization(self):
        """POST /api/fresh-meals/products creates product with auto-atomized components"""
        payload = {
            "name": "TEST_FMS_Grilled_Chicken_Kit",
            "product_type": "meal_kit",
            "category": "entree",
            "packaging_type": "insulated_box",
            "cold_chain_zone": "chilled",
            "target_shelf_life_days": 5,
            "dietary_tags": ["high-protein", "gluten-free"],
            "channels": ["direct_to_consumer", "fitness_subscription_meals"]
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/products", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify product created
        assert data.get("product_id") is not None
        assert data.get("name") == "TEST_FMS_Grilled_Chicken_Kit"
        assert data.get("product_type") == "meal_kit"
        
        # Verify auto-atomization created components
        components = data.get("components", [])
        assert len(components) >= 4  # protein, veg, starch, sauce, garnish
        assert data.get("component_count") == len(components)
        
        # Verify cost estimation
        assert data.get("base_cost", 0) > 0
        assert data.get("price", 0) > 0
        
    def test_list_products(self):
        """GET /api/fresh-meals/products lists products"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "count" in data
        assert data["count"] >= 1
        
    def test_list_products_filter_by_type(self):
        """GET /api/fresh-meals/products?product_type=meal_kit filters by type"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/products?product_type=meal_kit")
        assert response.status_code == 200
        data = response.json()
        for p in data.get("products", []):
            assert p.get("product_type") == "meal_kit"
            
    def test_get_product_by_id(self):
        """GET /api/fresh-meals/products/{id} returns product details"""
        # First get a product ID
        list_resp = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        products = list_resp.json().get("products", [])
        if products:
            pid = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/fresh-meals/products/{pid}")
            assert response.status_code == 200
            data = response.json()
            assert data.get("product_id") == pid


class TestFreshMealSystemsProductionRuns:
    """Production run tests with lane validation"""
    
    def test_create_production_run(self):
        """POST /api/fresh-meals/production-runs creates run with lane validation"""
        # Get a product ID first
        products_resp = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        products = products_resp.json().get("products", [])
        if not products:
            pytest.skip("No products available for production run test")
            
        product_id = products[0]["product_id"]
        
        payload = {
            "name": "TEST_FMS_Production_Run_001",
            "product_ids": [product_id],
            "quantities": {product_id: 100},
            "target_date": "2026-01-20",
            "priority": "normal"
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/production-runs", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify run created
        assert data.get("run_id") is not None
        assert data.get("name") == "TEST_FMS_Production_Run_001"
        assert data.get("status") == "scheduled"
        assert data.get("total_kits") == 100
        
        # Verify production estimates
        assert "est_production_hours" in data
        assert "est_labor_hours" in data
        assert "ingredient_needs" in data
        
        return data.get("run_id")
        
    def test_list_production_runs(self):
        """GET /api/fresh-meals/production-runs lists runs"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/production-runs")
        assert response.status_code == 200
        data = response.json()
        assert "runs" in data
        assert "count" in data
        
    def test_update_run_status_to_in_progress(self):
        """PUT /api/fresh-meals/production-runs/{id}/status?status=in_progress changes status"""
        # Create a run first
        products_resp = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        products = products_resp.json().get("products", [])
        if not products:
            pytest.skip("No products available")
            
        product_id = products[0]["product_id"]
        create_resp = requests.post(f"{BASE_URL}/api/fresh-meals/production-runs", json={
            "name": "TEST_FMS_Status_Test_Run",
            "product_ids": [product_id],
            "quantities": {product_id: 50},
            "priority": "normal"
        })
        run_id = create_resp.json().get("run_id")
        
        # Update status
        response = requests.put(f"{BASE_URL}/api/fresh-meals/production-runs/{run_id}/status?status=in_progress")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "in_progress"


class TestFreshMealSystemsAssemblyLanes:
    """Assembly lane tests with bottleneck analysis"""
    
    def test_create_assembly_lane(self):
        """POST /api/fresh-meals/assembly-lanes creates lane with bottleneck analysis"""
        payload = {
            "name": "TEST_FMS_Assembly_Lane_A",
            "lane_type": "linear",
            "max_throughput_per_hour": 200
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/assembly-lanes", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify lane created
        assert data.get("lane_id") is not None
        assert data.get("name") == "TEST_FMS_Assembly_Lane_A"
        assert data.get("lane_type") == "linear"
        
        # Verify auto-generated stations
        assert "stations" in data
        assert data.get("station_count", 0) > 0
        
        # Verify bottleneck analysis
        assert "effective_throughput_per_hour" in data
        assert "bottleneck_station" in data
        
        return data.get("lane_id")
        
    def test_list_assembly_lanes(self):
        """GET /api/fresh-meals/assembly-lanes lists lanes"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/assembly-lanes")
        assert response.status_code == 200
        data = response.json()
        assert "lanes" in data
        assert "count" in data
        
    def test_lane_throughput_analysis(self):
        """GET /api/fresh-meals/assembly-lanes/{id}/throughput returns throughput analysis"""
        # Get a lane ID
        lanes_resp = requests.get(f"{BASE_URL}/api/fresh-meals/assembly-lanes")
        lanes = lanes_resp.json().get("lanes", [])
        if not lanes:
            pytest.skip("No lanes available")
            
        lane_id = lanes[0]["lane_id"]
        response = requests.get(f"{BASE_URL}/api/fresh-meals/assembly-lanes/{lane_id}/throughput?kits_needed=500")
        assert response.status_code == 200
        data = response.json()
        
        # Verify throughput analysis
        assert data.get("kits_needed") == 500
        assert "hours_needed" in data
        assert "shifts_needed" in data
        assert "staff_per_shift" in data
        assert "total_labor_hours" in data
        assert "can_complete_in_single_shift" in data


class TestFreshMealSystemsPackaging:
    """Packaging options and cold chain validation tests"""
    
    def test_list_packaging_options(self):
        """GET /api/fresh-meals/packaging-options returns packaging types and cold chain additives"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/packaging-options")
        assert response.status_code == 200
        data = response.json()
        
        # Verify packaging types
        pkg_types = data.get("packaging_types", [])
        assert len(pkg_types) >= 5
        
        # Verify cold chain zones
        assert "cold_chain_zones" in data
        assert "cold_chain_rules" in data
        
        # Verify cold chain additives
        additives = data.get("cold_chain_additives", {})
        assert "chilled" in additives
        assert "frozen" in additives
        assert additives["chilled"]["additive"] == "gel_packs"
        assert additives["frozen"]["additive"] == "dry_ice"
        
    def test_validate_packaging_valid(self):
        """POST /api/fresh-meals/packaging/validate validates packaging vs cold chain"""
        # API uses query parameters
        response = requests.post(f"{BASE_URL}/api/fresh-meals/packaging/validate?packaging_type=insulated_box&cold_chain_zone=chilled")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("valid") == True
        assert data.get("packaging_type") == "insulated_box"
        assert "packaging_cost" in data
        
    def test_validate_packaging_invalid(self):
        """POST /api/fresh-meals/packaging/validate detects invalid combinations"""
        # API uses query parameters
        response = requests.post(f"{BASE_URL}/api/fresh-meals/packaging/validate?packaging_type=standard_box&cold_chain_zone=chilled")
        assert response.status_code == 200
        data = response.json()
        
        # Should have issues for standard box with chilled zone
        assert data.get("valid") == False
        assert len(data.get("issues", [])) > 0


class TestFreshMealSystemsSubscriptions:
    """Subscription CRUD and stats tests"""
    
    def test_create_subscription(self):
        """POST /api/fresh-meals/subscriptions creates subscription"""
        payload = {
            "customer_name": "TEST_FMS_John_Doe",
            "customer_email": "test_fms_john@example.com",
            "plan_type": "weekly",
            "meals_per_delivery": 6,
            "dietary_preferences": ["vegetarian"],
            "delivery_day": "wednesday"
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/subscriptions", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify subscription created
        assert data.get("subscription_id") is not None
        assert data.get("customer_name") == "TEST_FMS_John_Doe"
        assert data.get("plan_type") == "weekly"
        assert data.get("meals_per_delivery") == 6
        assert data.get("status") == "active"
        assert "next_delivery_date" in data
        
        return data.get("subscription_id")
        
    def test_list_subscriptions(self):
        """GET /api/fresh-meals/subscriptions lists subscriptions"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/subscriptions")
        assert response.status_code == 200
        data = response.json()
        assert "subscriptions" in data
        assert "count" in data
        
    def test_skip_subscription_delivery(self):
        """PUT /api/fresh-meals/subscriptions/{id}/skip increments skip count"""
        # Create a subscription first
        create_resp = requests.post(f"{BASE_URL}/api/fresh-meals/subscriptions", json={
            "customer_name": "TEST_FMS_Skip_Test",
            "customer_email": "test_fms_skip@example.com",
            "plan_type": "weekly",
            "meals_per_delivery": 4
        })
        sub_id = create_resp.json().get("subscription_id")
        
        # Skip delivery
        response = requests.put(f"{BASE_URL}/api/fresh-meals/subscriptions/{sub_id}/skip")
        assert response.status_code == 200
        data = response.json()
        assert data.get("action") == "skipped"
        
    def test_cancel_subscription(self):
        """PUT /api/fresh-meals/subscriptions/{id}/cancel sets status to cancelled"""
        # Create a subscription first
        create_resp = requests.post(f"{BASE_URL}/api/fresh-meals/subscriptions", json={
            "customer_name": "TEST_FMS_Cancel_Test",
            "customer_email": "test_fms_cancel@example.com",
            "plan_type": "monthly",
            "meals_per_delivery": 8
        })
        sub_id = create_resp.json().get("subscription_id")
        
        # Cancel subscription
        response = requests.put(f"{BASE_URL}/api/fresh-meals/subscriptions/{sub_id}/cancel")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "cancelled"
        
    def test_subscription_stats(self):
        """GET /api/fresh-meals/subscriptions/stats returns churn rate and meal totals"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/subscriptions/stats")
        assert response.status_code == 200
        data = response.json()
        
        assert "active" in data
        assert "cancelled" in data
        assert "churn_rate" in data
        assert "total_meals_per_cycle" in data
        assert "by_plan" in data


class TestFreshMealSystemsDistribution:
    """Distribution channels tests"""
    
    def test_list_distribution_channels(self):
        """GET /api/fresh-meals/distribution/channels returns 5 enriched channels"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/distribution/channels")
        assert response.status_code == 200
        data = response.json()
        
        channels = data.get("channels", [])
        assert len(channels) >= 5
        
        # Verify channel enrichment
        for ch in channels:
            assert "channel_id" in ch
            assert "label" in ch
            assert "product_count" in ch
            assert "active_runs" in ch


class TestFreshMealSystemsRoutes:
    """Route creation and listing tests"""
    
    def test_create_route(self):
        """POST /api/fresh-meals/routes creates route with cost calculation"""
        payload = {
            "name": "TEST_FMS_Route_Downtown",
            "channel": "direct_to_consumer",
            "origin": "main_kitchen",
            "stops": [
                {"address": "123 Main St", "distance_miles": 10, "delivery_window": "9am-12pm"},
                {"address": "456 Oak Ave", "distance_miles": 15, "delivery_window": "12pm-3pm"}
            ],
            "vehicle_type": "refrigerated_van",
            "cold_chain_required": True
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/routes", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify route created
        assert data.get("route_id") is not None
        assert data.get("name") == "TEST_FMS_Route_Downtown"
        assert data.get("stop_count") == 2
        
        # Verify cost calculation
        assert "total_distance_miles" in data
        assert "est_time_hours" in data
        assert "fuel_cost" in data
        assert "cold_chain_cost" in data
        assert "total_route_cost" in data
        assert data.get("total_route_cost", 0) > 0
        
    def test_list_routes(self):
        """GET /api/fresh-meals/routes lists routes"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/routes")
        assert response.status_code == 200
        data = response.json()
        assert "routes" in data
        assert "count" in data


class TestFreshMealSystemsForecasting:
    """Demand forecasting tests"""
    
    def test_generate_forecast(self):
        """POST /api/fresh-meals/forecast generates demand forecast with weekly breakdown"""
        payload = {
            "horizon_weeks": 4,
            "include_subscriptions": True
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/forecast", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify forecast structure
        assert data.get("forecast_id") is not None
        assert data.get("horizon_weeks") == 4
        
        # Verify weekly breakdown
        weekly = data.get("weekly_breakdown", [])
        assert len(weekly) == 4
        for w in weekly:
            assert "week" in w
            assert "forecast_meals" in w
            assert "subscription_base" in w
            
        # Verify totals
        assert "total_forecast_meals" in data
        assert "est_ingredient_orders" in data
        assert "waste_risk_level" in data


class TestFreshMealSystemsMarginAnalysis:
    """Margin optimizer tests"""
    
    def test_margin_analysis(self):
        """POST /api/fresh-meals/margin-analysis returns unit economics and volume economics"""
        payload = {
            "quantity": 100,
            "channel": "direct_to_consumer",
            "shipping_zone": 2,
            "include_packaging": True,
            "include_labor": True
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/margin-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify unit economics
        unit = data.get("unit_economics", {})
        assert "ingredient_cost" in unit
        assert "packaging_cost" in unit
        assert "shipping_cost" in unit
        assert "labor_cost" in unit
        assert "total_cost" in unit
        assert "effective_price" in unit
        assert "gross_margin" in unit
        assert "margin_pct" in unit
        
        # Verify volume economics
        vol = data.get("volume_economics", {})
        assert vol.get("quantity") == 100
        assert "total_cost" in vol
        assert "total_revenue" in vol
        assert "total_profit" in vol
        
        # Verify health indicator
        assert "healthy" in data
        
    def test_margin_analysis_with_product(self):
        """POST /api/fresh-meals/margin-analysis with product_id uses product data"""
        # Get a product ID
        products_resp = requests.get(f"{BASE_URL}/api/fresh-meals/products")
        products = products_resp.json().get("products", [])
        if not products:
            pytest.skip("No products available")
            
        product_id = products[0]["product_id"]
        
        payload = {
            "product_id": product_id,
            "quantity": 200,
            "channel": "retail_distribution",
            "shipping_zone": 1
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/margin-analysis", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("product_id") == product_id
        assert data.get("product_name") is not None


class TestFreshMealSystemsSafety:
    """Safety validation tests"""
    
    def test_run_safety_check_pre_production(self):
        """POST /api/fresh-meals/safety/check runs pre_production check"""
        payload = {
            "check_type": "pre_production"
        }
        response = requests.post(f"{BASE_URL}/api/fresh-meals/safety/check", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify safety record
        assert data.get("record_id") is not None
        assert data.get("check_type") == "pre_production"
        assert data.get("overall_pass") == True
        
        # Verify checks
        checks = data.get("checks", [])
        assert len(checks) >= 4
        for c in checks:
            assert "check" in c
            assert "target" in c
            assert "status" in c
            
    def test_run_safety_check_in_process(self):
        """POST /api/fresh-meals/safety/check runs in_process check"""
        payload = {"check_type": "in_process"}
        response = requests.post(f"{BASE_URL}/api/fresh-meals/safety/check", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("check_type") == "in_process"
        assert len(data.get("checks", [])) >= 4
        
    def test_run_safety_check_final(self):
        """POST /api/fresh-meals/safety/check runs final check"""
        payload = {"check_type": "final"}
        response = requests.post(f"{BASE_URL}/api/fresh-meals/safety/check", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("check_type") == "final"
        
    def test_run_safety_check_cold_chain(self):
        """POST /api/fresh-meals/safety/check runs cold_chain check"""
        payload = {"check_type": "cold_chain"}
        response = requests.post(f"{BASE_URL}/api/fresh-meals/safety/check", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("check_type") == "cold_chain"
        
    def test_list_safety_records(self):
        """GET /api/fresh-meals/safety/records lists safety records"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/safety/records")
        assert response.status_code == 200
        data = response.json()
        assert "records" in data
        assert "count" in data


class TestFreshMealSystemsShelfLife:
    """Shelf life reference tests"""
    
    def test_get_shelf_life_reference(self):
        """GET /api/fresh-meals/shelf-life returns shelf life reference"""
        response = requests.get(f"{BASE_URL}/api/fresh-meals/shelf-life")
        assert response.status_code == 200
        data = response.json()
        
        assert "reference" in data
        assert "count" in data
        
        # Verify reference items
        ref = data.get("reference", [])
        for item in ref:
            assert "item" in item
            assert "range_days" in item
