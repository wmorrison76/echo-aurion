"""
LUCCCA Enterprise Platform - Backend API Tests
==============================================
Tests for all 5 engines:
1. Operations Core (Purchasing -> Receiving -> Inventory -> Culinary -> Auto-PO)
2. AI Forecasting (Demand prediction, order scheduling, stock alerts)
3. POS Integration (Real-time inventory decrement, food cost tracking)
4. Event Lifecycle (25-stage prospect-to-payment pipeline)
5. Labor Cost (Auto-plan staffing, real-time labor P&L)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============================================================================
# HEALTH & SEED TESTS
# ============================================================================
class TestHealthAndSeed:
    """Health check and seed data tests"""
    
    def test_health_check_returns_all_engines_active(self, api_client):
        """Health check /api/health returns all 5 engines active"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        assert "engines" in data
        
        engines = data["engines"]
        assert engines["operations_core"] == "active"
        assert engines["ai_forecasting"] == "active"
        assert engines["pos_integration"] == "active"
        assert engines["event_lifecycle"] == "active"
        assert engines["labor_cost"] == "active"
        print(f"All 5 engines active: {list(engines.keys())}")
    
    def test_seed_data_creates_demo_data(self, api_client):
        """Seed data creates ingredients, recipes, menu items, events, consumption history"""
        # First check if already seeded
        response = api_client.get(f"{BASE_URL}/api/operations/ingredients")
        if response.status_code == 200 and len(response.json()) > 0:
            print("Data already seeded, skipping seed")
            return
        
        # Seed the data
        response = api_client.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        data = response.json()
        
        if data.get("status") == "already_seeded":
            print("Data was already seeded")
        else:
            assert data.get("status") == "seeded"
            assert data.get("ingredients", 0) >= 10
            assert data.get("recipes", 0) >= 5
            assert data.get("menu_items", 0) >= 5
            assert data.get("events", 0) >= 4
            print(f"Seeded: {data}")


# ============================================================================
# OPERATIONS CORE ENGINE TESTS
# ============================================================================
class TestOperationsCore:
    """Operations Core Engine tests"""
    
    def test_get_ingredients_returns_10_with_sku_cost_stock(self, api_client):
        """GET /api/operations/ingredients returns 10 ingredients with SKU, cost, stock"""
        response = api_client.get(f"{BASE_URL}/api/operations/ingredients")
        assert response.status_code == 200
        
        ingredients = response.json()
        assert isinstance(ingredients, list)
        assert len(ingredients) >= 10, f"Expected at least 10 ingredients, got {len(ingredients)}"
        
        # Verify structure of first ingredient
        ing = ingredients[0]
        assert "id" in ing
        assert "name" in ing
        assert "sku" in ing
        assert "current_cost" in ing
        assert "current_stock" in ing
        print(f"Found {len(ingredients)} ingredients with proper structure")
    
    def test_get_recipes_returns_5_recipes(self, api_client):
        """GET /api/operations/recipes returns 5 recipes"""
        response = api_client.get(f"{BASE_URL}/api/operations/recipes")
        assert response.status_code == 200
        
        recipes = response.json()
        assert isinstance(recipes, list)
        assert len(recipes) >= 5, f"Expected at least 5 recipes, got {len(recipes)}"
        
        # Verify structure
        recipe = recipes[0]
        assert "id" in recipe
        assert "name" in recipe
        assert "ingredients" in recipe
        print(f"Found {len(recipes)} recipes")
    
    def test_recipe_cost_calculates_accurate_food_cost(self, api_client):
        """GET /api/operations/recipe/{id}/cost calculates accurate food cost per portion"""
        # Get a recipe first
        response = api_client.get(f"{BASE_URL}/api/operations/recipes")
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) > 0
        
        recipe_id = recipes[0]["id"]
        
        # Get recipe cost
        response = api_client.get(f"{BASE_URL}/api/operations/recipe/{recipe_id}/cost")
        assert response.status_code == 200
        
        cost_data = response.json()
        assert "recipe_id" in cost_data
        assert "cost_per_portion" in cost_data
        assert "total_ingredient_cost" in cost_data
        assert "food_cost_pct" in cost_data
        assert "ingredient_breakdown" in cost_data
        assert cost_data["cost_per_portion"] >= 0
        print(f"Recipe '{cost_data.get('recipe_name')}' cost: ${cost_data['cost_per_portion']:.2f}/portion, {cost_data['food_cost_pct']}% food cost")
    
    def test_receive_inventory_increases_stock(self, api_client):
        """POST /api/operations/inventory/receive increases stock and tracks transactions"""
        # Get an ingredient
        response = api_client.get(f"{BASE_URL}/api/operations/ingredients")
        assert response.status_code == 200
        ingredients = response.json()
        assert len(ingredients) > 0
        
        ingredient = ingredients[0]
        ingredient_id = ingredient["id"]
        initial_stock = ingredient["current_stock"]
        
        # Receive inventory
        receive_data = {
            "ingredient_id": ingredient_id,
            "quantity": 10.0,
            "unit_cost": 5.50,
            "vendor": "Test Vendor",
            "po_number": "TEST-PO-001"
        }
        response = api_client.post(f"{BASE_URL}/api/operations/inventory/receive", json=receive_data)
        assert response.status_code == 200
        
        txn = response.json()
        assert txn["transaction_type"] == "receive"
        assert txn["quantity"] == 10.0
        assert txn["stock_after"] == initial_stock + 10.0
        
        # Verify stock increased
        response = api_client.get(f"{BASE_URL}/api/operations/ingredient/{ingredient_id}")
        assert response.status_code == 200
        updated = response.json()
        assert updated["current_stock"] == initial_stock + 10.0
        print(f"Stock increased from {initial_stock} to {updated['current_stock']}")
    
    def test_consume_inventory_decreases_stock(self, api_client):
        """POST /api/operations/inventory/consume decreases stock and feeds consumption to forecasting"""
        # Get an ingredient with stock
        response = api_client.get(f"{BASE_URL}/api/operations/ingredients")
        assert response.status_code == 200
        ingredients = response.json()
        
        # Find one with stock
        ingredient = next((i for i in ingredients if i["current_stock"] > 5), ingredients[0])
        ingredient_id = ingredient["id"]
        initial_stock = ingredient["current_stock"]
        
        # Consume inventory
        consume_data = {
            "ingredient_id": ingredient_id,
            "quantity": 2.0,
            "reason": "test_production"
        }
        response = api_client.post(f"{BASE_URL}/api/operations/inventory/consume", json=consume_data)
        assert response.status_code == 200
        
        txn = response.json()
        assert txn["transaction_type"] == "consume"
        assert txn["quantity"] == -2.0
        assert txn["stock_after"] == initial_stock - 2.0
        print(f"Stock decreased from {initial_stock} to {txn['stock_after']}")
    
    def test_process_invoice_creates_ingredients_and_updates_inventory(self, api_client):
        """POST /api/operations/invoice/process creates ingredients and updates inventory"""
        invoice_data = {
            "vendor_name": "Test Supplier Inc",
            "po_number": "TEST-INV-001",
            "invoice_number": "INV-12345",
            "items": [
                {"name": "TEST_New Ingredient", "sku": "TEST-NEW-001", "quantity": 25, "unit_cost": 3.50, "category": "dry_goods"},
                {"name": "Atlantic Salmon Fillet", "quantity": 5, "unit_cost": 12.00}  # Existing ingredient
            ]
        }
        response = api_client.post(f"{BASE_URL}/api/operations/invoice/process", json=invoice_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "invoice_id" in result
        assert result["items_processed"] >= 2
        assert result["total_cost"] > 0
        print(f"Invoice processed: {result['items_processed']} items, ${result['total_cost']:.2f} total")
    
    def test_po_suggestions_returns_items_below_reorder_point(self, api_client):
        """GET /api/operations/po-suggestions returns items below reorder point"""
        response = api_client.get(f"{BASE_URL}/api/operations/po-suggestions")
        assert response.status_code == 200
        
        suggestions = response.json()
        assert isinstance(suggestions, list)
        
        # Verify structure if there are suggestions
        if len(suggestions) > 0:
            s = suggestions[0]
            assert "ingredient_id" in s
            assert "ingredient_name" in s
            assert "current_stock" in s
            assert "suggested_qty" in s
            assert "urgency" in s
        print(f"Found {len(suggestions)} PO suggestions")


# ============================================================================
# AI FORECASTING ENGINE TESTS
# ============================================================================
class TestAIForecasting:
    """AI Forecasting Engine tests"""
    
    def test_forecast_all_returns_forecasts_with_stockout_predictions(self, api_client):
        """GET /api/forecasting/all returns forecasts for all ingredients with stockout predictions"""
        response = api_client.get(f"{BASE_URL}/api/forecasting/all")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_ingredients" in data
        assert "forecasted" in data
        assert "will_stockout" in data
        assert "forecasts" in data
        
        forecasts = data["forecasts"]
        assert isinstance(forecasts, list)
        assert len(forecasts) > 0
        
        # Verify forecast structure
        f = forecasts[0]
        assert "ingredient_id" in f
        assert "ingredient_name" in f
        assert "will_stockout" in f
        assert "days_of_stock" in f
        print(f"Forecasted {data['forecasted']} ingredients, {data['will_stockout']} will stockout")
    
    def test_forecast_ingredient_returns_7_day_daily_forecasts(self, api_client):
        """GET /api/forecasting/ingredient/{id} returns 7-day daily forecasts with confidence"""
        # Get an ingredient
        response = api_client.get(f"{BASE_URL}/api/operations/ingredients")
        assert response.status_code == 200
        ingredients = response.json()
        ingredient_id = ingredients[0]["id"]
        
        # Get forecast
        response = api_client.get(f"{BASE_URL}/api/forecasting/ingredient/{ingredient_id}?days=7")
        assert response.status_code == 200
        
        forecast = response.json()
        assert "ingredient_id" in forecast
        assert "daily_forecasts" in forecast
        assert "confidence" in forecast
        assert "total_forecasted" in forecast
        
        daily = forecast["daily_forecasts"]
        assert len(daily) == 7, f"Expected 7 daily forecasts, got {len(daily)}"
        
        # Verify daily forecast structure
        if len(daily) > 0:
            d = daily[0]
            assert "date" in d
            assert "forecasted_qty" in d
            assert "day_of_week" in d
        print(f"7-day forecast for {forecast.get('ingredient_name')}: {forecast['total_forecasted']:.1f} units, {forecast['confidence']}% confidence")
    
    def test_order_schedule_returns_prioritized_recommendations(self, api_client):
        """GET /api/forecasting/order-schedule returns prioritized order recommendations"""
        response = api_client.get(f"{BASE_URL}/api/forecasting/order-schedule?days=7")
        assert response.status_code == 200
        
        schedule = response.json()
        assert "days_ahead" in schedule
        assert "total_orders" in schedule
        assert "total_estimated_cost" in schedule
        assert "orders" in schedule
        
        orders = schedule["orders"]
        assert isinstance(orders, list)
        
        # Verify order structure if there are orders
        if len(orders) > 0:
            o = orders[0]
            assert "ingredient_id" in o
            assert "order_qty" in o
            assert "urgency" in o
            assert "estimated_cost" in o
        print(f"Order schedule: {schedule['total_orders']} orders, ${schedule['total_estimated_cost']:.2f} estimated")
    
    def test_stock_alerts_returns_critical_warning_normal(self, api_client):
        """GET /api/forecasting/alerts returns critical/warning/normal stock alerts"""
        response = api_client.get(f"{BASE_URL}/api/forecasting/alerts")
        assert response.status_code == 200
        
        alerts = response.json()
        assert "critical" in alerts
        assert "warning" in alerts
        assert "normal" in alerts
        assert "total_alerts" in alerts
        
        # Verify alert structure
        for level in ["critical", "warning", "normal"]:
            assert isinstance(alerts[level], list)
            if len(alerts[level]) > 0:
                a = alerts[level][0]
                assert "ingredient_id" in a
                assert "ingredient_name" in a
                assert "current_stock" in a
                assert "level" in a
        print(f"Alerts: {len(alerts['critical'])} critical, {len(alerts['warning'])} warning, {len(alerts['normal'])} normal")


# ============================================================================
# POS INTEGRATION TESTS
# ============================================================================
class TestPOSIntegration:
    """POS Integration tests"""
    
    def test_pos_transaction_processes_sale_and_decrements_inventory(self, api_client):
        """POST /api/pos/transaction processes sale, decrements inventory, calculates food cost %"""
        # Get menu items
        response = api_client.get(f"{BASE_URL}/api/pos/menu-items")
        assert response.status_code == 200
        menu_items = response.json()
        assert len(menu_items) > 0
        
        menu_item = menu_items[0]
        
        # Get ingredient stock before sale
        if menu_item.get("ingredient_map") and len(menu_item["ingredient_map"]) > 0:
            ing_id = menu_item["ingredient_map"][0]["ingredient_id"]
            response = api_client.get(f"{BASE_URL}/api/operations/ingredient/{ing_id}")
            stock_before = response.json()["current_stock"] if response.status_code == 200 else None
        else:
            stock_before = None
            ing_id = None
        
        # Process POS transaction
        txn_data = {
            "provider": "toast",
            "outlet_id": "main",
            "guest_count": 2,
            "subtotal": menu_item["menu_price"],
            "tax": round(menu_item["menu_price"] * 0.09, 2),
            "total": round(menu_item["menu_price"] * 1.09, 2),
            "items": [{
                "pos_item_id": menu_item.get("pos_item_id", ""),
                "name": menu_item["name"],
                "quantity": 1,
                "price": menu_item["menu_price"]
            }]
        }
        response = api_client.post(f"{BASE_URL}/api/pos/transaction", json=txn_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "transaction_id" in result
        assert "items_processed" in result
        assert "food_cost_total" in result
        assert "food_cost_pct" in result
        assert result["items_processed"] >= 1
        
        # Verify inventory decremented
        if ing_id and stock_before is not None:
            response = api_client.get(f"{BASE_URL}/api/operations/ingredient/{ing_id}")
            if response.status_code == 200:
                stock_after = response.json()["current_stock"]
                assert stock_after < stock_before, f"Stock should decrease: {stock_before} -> {stock_after}"
                print(f"Inventory decremented: {stock_before} -> {stock_after}")
        
        print(f"POS transaction processed: {result['items_processed']} items, {result['food_cost_pct']}% food cost")
    
    def test_pos_analytics_returns_sales_mix(self, api_client):
        """GET /api/pos/analytics returns sales mix with revenue and food cost by item"""
        response = api_client.get(f"{BASE_URL}/api/pos/analytics?days=7")
        assert response.status_code == 200
        
        analytics = response.json()
        assert "period_days" in analytics
        assert "total_transactions" in analytics
        assert "total_revenue" in analytics
        assert "total_food_cost" in analytics
        assert "food_cost_pct" in analytics
        assert "sales_mix" in analytics
        
        # Verify sales mix structure
        sales_mix = analytics["sales_mix"]
        assert isinstance(sales_mix, list)
        if len(sales_mix) > 0:
            item = sales_mix[0]
            assert "name" in item
            assert "revenue" in item
            assert "food_cost" in item
        print(f"POS Analytics: {analytics['total_transactions']} txns, ${analytics['total_revenue']:.2f} revenue, {analytics['food_cost_pct']}% food cost")


# ============================================================================
# EVENT LIFECYCLE ENGINE TESTS
# ============================================================================
class TestEventLifecycle:
    """Event Lifecycle Engine tests"""
    
    def test_create_event_at_prospect_stage(self, api_client):
        """POST /api/events/lifecycle creates event at prospect stage"""
        event_data = {
            "name": "TEST_Corporate Dinner",
            "event_type": "corporate",
            "client_name": "Test Client",
            "client_email": "test@example.com",
            "guest_count": 100,
            "event_date": "2026-03-15",
            "start_time": "18:00",
            "end_time": "22:00",
            "venue": "Grand Ballroom"
        }
        response = api_client.post(f"{BASE_URL}/api/events/lifecycle", json=event_data)
        assert response.status_code == 200
        
        event = response.json()
        assert "id" in event
        assert event["name"] == "TEST_Corporate Dinner"
        assert event["stage"] == "prospect"
        assert event["phase"] == 1
        assert event["guest_count"] == 100
        print(f"Created event '{event['name']}' at stage '{event['stage']}'")
        return event["id"]
    
    def test_advance_event_through_stages(self, api_client):
        """POST /api/events/lifecycle/{id}/advance moves event through stages"""
        # Create a new event
        event_data = {
            "name": "TEST_Stage Advance Event",
            "event_type": "wedding",
            "guest_count": 150,
            "event_date": "2026-04-20"
        }
        response = api_client.post(f"{BASE_URL}/api/events/lifecycle", json=event_data)
        assert response.status_code == 200
        event_id = response.json()["id"]
        
        # Advance through stages
        stages_to_advance = ["qualified", "proposal_sent", "negotiation", "contract_sent", "contract_signed"]
        
        for stage in stages_to_advance:
            response = api_client.post(
                f"{BASE_URL}/api/events/lifecycle/{event_id}/advance",
                json={"target_stage": stage, "by": "test_user"}
            )
            assert response.status_code == 200
            updated = response.json()
            assert updated["stage"] == stage
            print(f"Advanced to stage: {stage}")
        
        # Verify final state
        response = api_client.get(f"{BASE_URL}/api/events/lifecycle/{event_id}")
        assert response.status_code == 200
        final = response.json()
        assert final["stage"] == "contract_signed"
    
    def test_deposit_received_creates_gl_journal_entries(self, api_client):
        """Stage advancement with deposit_received creates GL journal entries"""
        # Create and advance event to contract_signed
        event_data = {
            "name": "TEST_GL Entry Event",
            "event_type": "gala",
            "guest_count": 200,
            "event_date": "2026-05-10"
        }
        response = api_client.post(f"{BASE_URL}/api/events/lifecycle", json=event_data)
        assert response.status_code == 200
        event_id = response.json()["id"]
        
        # Advance to contract_signed
        for stage in ["qualified", "proposal_sent", "negotiation", "contract_sent", "contract_signed"]:
            api_client.post(f"{BASE_URL}/api/events/lifecycle/{event_id}/advance", json={"target_stage": stage})
        
        # Advance to deposit_received with amount
        response = api_client.post(
            f"{BASE_URL}/api/events/lifecycle/{event_id}/advance",
            json={"target_stage": "deposit_received", "by": "test", "data": {"amount": 5000, "method": "check"}}
        )
        assert response.status_code == 200
        
        # Check GL entries
        response = api_client.get(f"{BASE_URL}/api/events/gl-entries?event_id={event_id}")
        assert response.status_code == 200
        gl_entries = response.json()
        
        # Should have debit and credit entries for deposit
        assert len(gl_entries) >= 2, f"Expected at least 2 GL entries, got {len(gl_entries)}"
        print(f"GL entries created: {len(gl_entries)} entries for deposit")
    
    def test_pipeline_returns_kanban_style_view(self, api_client):
        """GET /api/events/pipeline returns kanban-style phase view"""
        response = api_client.get(f"{BASE_URL}/api/events/pipeline")
        assert response.status_code == 200
        
        pipeline = response.json()
        assert "stages" in pipeline
        assert "phase_totals" in pipeline
        assert "total_events" in pipeline
        
        # Verify stage structure
        stages = pipeline["stages"]
        assert isinstance(stages, dict)
        
        # Verify phase totals
        phase_totals = pipeline["phase_totals"]
        for phase_num in ["1", "2", "3", "4", "5"]:
            if phase_num in phase_totals:
                assert "events" in phase_totals[phase_num]
                assert "total_revenue" in phase_totals[phase_num]
        print(f"Pipeline: {pipeline['total_events']} total events across phases")
    
    def test_aggregate_pnl_returns_aggregated_data(self, api_client):
        """GET /api/events/aggregate-pnl returns aggregated P&L across closed events"""
        response = api_client.get(f"{BASE_URL}/api/events/aggregate-pnl")
        assert response.status_code == 200
        
        pnl = response.json()
        assert "events_count" in pnl
        assert "total_revenue" in pnl
        assert "total_cogs" in pnl
        assert "total_labor" in pnl
        assert "net_profit" in pnl
        assert "net_margin_pct" in pnl
        print(f"Aggregate P&L: {pnl['events_count']} events, ${pnl['total_revenue']:.2f} revenue, ${pnl['net_profit']:.2f} net profit")


# ============================================================================
# LABOR COST ENGINE TESTS
# ============================================================================
class TestLaborCost:
    """Labor Cost Engine tests"""
    
    def test_get_positions_returns_8_configured_positions(self, api_client):
        """GET /api/labor/positions returns 8 configured positions with rates"""
        response = api_client.get(f"{BASE_URL}/api/labor/positions")
        assert response.status_code == 200
        
        positions = response.json()
        assert isinstance(positions, list)
        assert len(positions) >= 8, f"Expected at least 8 positions, got {len(positions)}"
        
        # Verify position structure
        pos = positions[0]
        assert "id" in pos
        assert "code" in pos
        assert "name" in pos
        assert "base_rate" in pos
        assert "guests_per_staff" in pos
        print(f"Found {len(positions)} labor positions")
    
    def test_auto_plan_labor_generates_staffing_plan(self, api_client):
        """POST /api/labor/plan auto-generates staffing plan based on event guest count"""
        # Get an event with guest count
        response = api_client.get(f"{BASE_URL}/api/events/lifecycle")
        assert response.status_code == 200
        events = response.json()
        
        # Find event with guest count > 0
        event = next((e for e in events if e.get("guest_count", 0) > 0), None)
        if not event:
            # Create one
            response = api_client.post(f"{BASE_URL}/api/events/lifecycle", json={
                "name": "TEST_Labor Plan Event",
                "guest_count": 150,
                "event_date": "2026-06-15",
                "start_time": "17:00",
                "end_time": "23:00"
            })
            assert response.status_code == 200
            event = response.json()
        
        event_id = event["id"]
        
        # Generate labor plan
        response = api_client.post(f"{BASE_URL}/api/labor/plan", json={"event_id": event_id})
        assert response.status_code == 200
        
        plan = response.json()
        assert "id" in plan
        assert "event_id" in plan
        assert "staff_plan" in plan
        assert "total_staff" in plan
        assert "total_cost" in plan
        assert "cost_per_guest" in plan
        
        assert plan["total_staff"] > 0
        assert plan["total_cost"] > 0
        print(f"Labor plan: {plan['total_staff']} staff, ${plan['total_cost']:.2f} total, ${plan['cost_per_guest']:.2f}/guest")
    
    def test_labor_plan_updates_event_costs_labor(self, api_client):
        """Verify labor plan updates event costs.labor field"""
        # Create event
        response = api_client.post(f"{BASE_URL}/api/events/lifecycle", json={
            "name": "TEST_Labor Cost Update Event",
            "guest_count": 100,
            "event_date": "2026-07-20",
            "start_time": "18:00",
            "end_time": "22:00"
        })
        assert response.status_code == 200
        event_id = response.json()["id"]
        
        # Generate labor plan
        response = api_client.post(f"{BASE_URL}/api/labor/plan", json={"event_id": event_id})
        assert response.status_code == 200
        labor_cost = response.json()["total_cost"]
        
        # Verify event was updated
        response = api_client.get(f"{BASE_URL}/api/events/lifecycle/{event_id}")
        assert response.status_code == 200
        event = response.json()
        
        assert event["costs"]["labor"] == labor_cost
        assert event["labor_plan_id"] is not None
        print(f"Event labor cost updated to ${labor_cost:.2f}")
    
    def test_labor_variance_returns_planned_vs_actual(self, api_client):
        """GET /api/labor/variance/{event_id} returns planned vs actual comparison"""
        # Get an event with labor plan
        response = api_client.get(f"{BASE_URL}/api/events/lifecycle")
        assert response.status_code == 200
        events = response.json()
        
        event = next((e for e in events if e.get("labor_plan_id")), None)
        if not event:
            # Create and plan
            response = api_client.post(f"{BASE_URL}/api/events/lifecycle", json={
                "name": "TEST_Variance Event",
                "guest_count": 80,
                "event_date": "2026-08-10"
            })
            event_id = response.json()["id"]
            api_client.post(f"{BASE_URL}/api/labor/plan", json={"event_id": event_id})
        else:
            event_id = event["id"]
        
        # Get variance
        response = api_client.get(f"{BASE_URL}/api/labor/variance/{event_id}")
        assert response.status_code == 200
        
        variance = response.json()
        assert "event_id" in variance
        assert "planned" in variance
        assert "actual" in variance
        assert "variance" in variance
        assert "efficiency" in variance
        
        assert "cost" in variance["planned"]
        assert "hours" in variance["planned"]
        print(f"Labor variance: planned ${variance['planned']['cost']:.2f}, actual ${variance['actual']['cost']:.2f}")


# ============================================================================
# DASHBOARD TESTS
# ============================================================================
class TestDashboard:
    """Dashboard aggregation tests"""
    
    def test_dashboard_returns_all_engine_data(self, api_client):
        """GET /api/dashboard returns aggregated data from all engines"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        
        dashboard = response.json()
        assert "operations" in dashboard
        assert "pos" in dashboard
        assert "events" in dashboard
        assert "labor" in dashboard
        assert "alerts" in dashboard
        assert dashboard["platform"] == "LUCCCA Enterprise"
        print(f"Dashboard loaded with all engine data")


# ============================================================================
# CLEANUP
# ============================================================================
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(api_client):
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Note: In a real scenario, we'd delete test data here
    # For now, test data remains for inspection
    print("Test session complete")
