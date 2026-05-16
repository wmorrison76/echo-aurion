"""
Iteration 45 - EchoStratus FP&A System Tests
=============================================
Tests for the new ProfitSword-level FP&A features:
- Budget View: Annual Budget Builder with driver-based P&L
- Budget vs Actual variance tracking
- CapEx ROI & Breakeven calculator (table sizes)
- Activations modeling (pop-up dinners, wine dinners)
- Guest Spending Pattern analysis (folio awareness)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBudgetEndpoints:
    """Budget CRUD, variance, and assumptions tests"""
    
    budget_id = None  # Will be set after create or list
    
    def test_budget_list(self):
        """GET /api/echo-stratus/budget/list - List existing budgets"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/budget/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "budgets" in data
        assert "count" in data
        assert isinstance(data["budgets"], list)
        print(f"PASS: Budget list returns {data['count']} budgets")
        
        # Store budget_id if exists
        if data["budgets"]:
            TestBudgetEndpoints.budget_id = data["budgets"][0]["id"]
            print(f"  Found existing budget: {TestBudgetEndpoints.budget_id}")
    
    def test_budget_create(self):
        """POST /api/echo-stratus/budget/create - Create new budget with 12 months"""
        payload = {
            "fiscal_year": 2026,
            "name": "TEST_FY2026 Operating Budget",
            "property_id": "default"
        }
        response = requests.post(f"{BASE_URL}/api/echo-stratus/budget/create", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate budget structure
        assert "id" in data
        assert "name" in data
        assert "fiscal_year" in data
        assert data["fiscal_year"] == 2026
        assert "months" in data
        assert "annual" in data
        assert "assumptions" in data
        
        # Validate 12 months exist
        assert len(data["months"]) == 12, f"Expected 12 months, got {len(data['months'])}"
        
        # Validate monthly P&L structure
        month1 = data["months"]["1"]
        assert "revenue" in month1
        assert "cost_of_sales" in month1
        assert "labor" in month1
        assert "operating_expenses" in month1
        assert "ebitda" in month1
        assert "drivers" in month1
        
        # Validate revenue breakdown
        assert "restaurant" in month1["revenue"]
        assert "banquet" in month1["revenue"]
        assert "bar_lounge" in month1["revenue"]
        assert "catering" in month1["revenue"]
        assert "total" in month1["revenue"]
        
        # Validate cost of sales
        assert "food" in month1["cost_of_sales"]
        assert "beverage" in month1["cost_of_sales"]
        
        # Validate labor breakdown
        assert "foh" in month1["labor"]
        assert "boh" in month1["labor"]
        assert "management" in month1["labor"]
        
        # Validate annual totals
        annual = data["annual"]
        assert "total_revenue" in annual
        assert "total_food_cost" in annual
        assert "total_labor" in annual
        assert "total_ebitda" in annual
        assert "ebitda_margin_pct" in annual
        assert "total_covers" in annual
        
        # Validate assumptions
        assumptions = data["assumptions"]
        assert "revenue_growth_pct" in assumptions
        assert "food_inflation_pct" in assumptions
        assert "labor_increase_pct" in assumptions
        
        TestBudgetEndpoints.budget_id = data["id"]
        print(f"PASS: Budget created with ID {data['id']}")
        print(f"  Annual Revenue: ${annual['total_revenue']:,.2f}")
        print(f"  Annual EBITDA: ${annual['total_ebitda']:,.2f} ({annual['ebitda_margin_pct']}%)")
        print(f"  Total Covers: {annual['total_covers']:,}")
    
    def test_budget_get(self):
        """GET /api/echo-stratus/budget/{id} - Get full budget detail"""
        if not TestBudgetEndpoints.budget_id:
            pytest.skip("No budget_id available")
        
        response = requests.get(f"{BASE_URL}/api/echo-stratus/budget/{TestBudgetEndpoints.budget_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["id"] == TestBudgetEndpoints.budget_id
        assert "months" in data
        assert len(data["months"]) == 12
        print(f"PASS: Budget {TestBudgetEndpoints.budget_id} retrieved successfully")
    
    def test_budget_variance(self):
        """GET /api/echo-stratus/budget/{id}/variance - YTD variance with alerts"""
        if not TestBudgetEndpoints.budget_id:
            pytest.skip("No budget_id available")
        
        response = requests.get(f"{BASE_URL}/api/echo-stratus/budget/{TestBudgetEndpoints.budget_id}/variance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate variance structure
        assert "budget_id" in data
        assert "ytd_variance" in data
        assert "pace" in data
        assert "alerts" in data
        
        # Validate YTD variance metrics
        ytd = data["ytd_variance"]
        assert "revenue" in ytd
        assert "food_cost" in ytd
        assert "labor" in ytd
        assert "ebitda" in ytd
        
        # Validate variance detail
        rev_var = ytd["revenue"]
        assert "actual" in rev_var
        assert "budget" in rev_var
        assert "variance" in rev_var
        assert "variance_pct" in rev_var
        assert "status" in rev_var  # favorable/unfavorable
        
        # Validate pace
        pace = data["pace"]
        assert "annualized_revenue" in pace
        assert "annual_budget" in pace
        assert "on_pace" in pace
        assert "pace_pct" in pace
        
        # Validate alerts
        assert isinstance(data["alerts"], list)
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "severity" in alert
            assert "message" in alert
            assert "action" in alert
        
        print(f"PASS: Variance analysis returned")
        print(f"  Revenue: Actual ${ytd['revenue']['actual']:,.2f} vs Budget ${ytd['revenue']['budget']:,.2f} ({ytd['revenue']['variance_pct']}%)")
        print(f"  Pace: {pace['pace_pct']}% of annual target")
        print(f"  Alerts: {len(data['alerts'])}")
    
    def test_budget_update_assumptions(self):
        """POST /api/echo-stratus/budget/update-assumptions - Recalculate budget"""
        if not TestBudgetEndpoints.budget_id:
            pytest.skip("No budget_id available")
        
        payload = {
            "budget_id": TestBudgetEndpoints.budget_id,
            "assumptions": {
                "revenue_growth_pct": 5.0,
                "food_inflation_pct": 3.0,
                "labor_increase_pct": 4.0
            }
        }
        response = requests.post(f"{BASE_URL}/api/echo-stratus/budget/update-assumptions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "status" in data
        assert data["status"] == "recalculated"
        assert "assumptions" in data
        assert "annual" in data
        
        # Verify assumptions were updated
        assert data["assumptions"]["revenue_growth_pct"] == 5.0
        assert data["assumptions"]["food_inflation_pct"] == 3.0
        
        print(f"PASS: Budget recalculated with new assumptions")
        print(f"  New Annual Revenue: ${data['annual']['total_revenue']:,.2f}")
        print(f"  New Annual EBITDA: ${data['annual']['total_ebitda']:,.2f}")


class TestCapexEndpoints:
    """CapEx ROI and Breakeven analysis tests"""
    
    def test_capex_analyze_default(self):
        """POST /api/echo-stratus/capex/analyze - Default $4,000 table analysis"""
        payload = {
            "name": "Restaurant Table (4-Top)",
            "item_type": "table",
            "cost": 4000,
            "seats": 4,
            "turns_per_day": 2.0,
            "avg_check": 65,
            "useful_life_years": 7,
            "operating_days_per_year": 350,
            "food_cost_pct": 16,
            "labor_cost_pct": 28,
            "maintenance_annual": 100
        }
        response = requests.post(f"{BASE_URL}/api/echo-stratus/capex/analyze", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "analysis_id" in data
        assert "name" in data
        assert "investment" in data
        assert "revenue_model" in data
        assert "cost_breakdown" in data
        assert "profitability" in data
        assert "breakeven" in data
        assert "npv" in data
        assert "roi_pct" in data
        assert "cash_flows" in data
        assert "table_size_comparison" in data
        assert "recommendation" in data
        
        # Validate investment
        inv = data["investment"]
        assert inv["cost"] == 4000
        assert inv["useful_life_years"] == 7
        
        # Validate revenue model
        rev = data["revenue_model"]
        assert rev["seats"] == 4
        assert rev["turns_per_day"] == 2.0
        assert rev["avg_check"] == 65
        assert "daily_revenue" in rev
        assert "annual_revenue" in rev
        
        # Validate breakeven
        be = data["breakeven"]
        assert "months" in be
        assert "covers_needed" in be
        assert be["months"] > 0
        
        # Validate table size comparison (2/4/6/8/10 seats)
        assert len(data["table_size_comparison"]) == 5
        for comp in data["table_size_comparison"]:
            assert "seats" in comp
            assert "breakeven_months" in comp
            assert "annual_profit" in comp
            assert "daily_revenue" in comp
        
        # Validate cash flows
        assert len(data["cash_flows"]) == 7  # 7 years
        for cf in data["cash_flows"]:
            assert "year" in cf
            assert "cash_flow" in cf
            assert "cumulative_npv" in cf
        
        # Validate recommendation
        assert data["recommendation"] in ["Invest", "Review", "Decline"]
        
        print(f"PASS: CapEx analysis completed")
        print(f"  Breakeven: {be['months']} months ({be['covers_needed']} covers)")
        print(f"  NPV: ${data['npv']:,.2f}")
        print(f"  ROI: {data['roi_pct']}%")
        print(f"  Recommendation: {data['recommendation']}")
    
    def test_capex_analyze_different_params(self):
        """POST /api/echo-stratus/capex/analyze - Different parameters"""
        payload = {
            "name": "Premium 6-Top Table",
            "item_type": "table",
            "cost": 6000,
            "seats": 6,
            "turns_per_day": 1.5,
            "avg_check": 85,
            "useful_life_years": 10,
            "operating_days_per_year": 300,
            "food_cost_pct": 18,
            "labor_cost_pct": 25,
            "maintenance_annual": 150
        }
        response = requests.post(f"{BASE_URL}/api/echo-stratus/capex/analyze", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["investment"]["cost"] == 6000
        assert data["revenue_model"]["seats"] == 6
        assert len(data["cash_flows"]) == 10  # 10 years
        
        print(f"PASS: CapEx analysis with different params")
        print(f"  Breakeven: {data['breakeven']['months']} months")
        print(f"  NPV: ${data['npv']:,.2f}")


class TestActivationsEndpoints:
    """Activations modeling and spending patterns tests"""
    
    def test_activations_templates(self):
        """GET /api/echo-stratus/activations/templates - Get 6 templates"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/activations/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "templates" in data
        templates = data["templates"]
        assert len(templates) == 6, f"Expected 6 templates, got {len(templates)}"
        
        # Validate template types
        template_types = [t["type"] for t in templates]
        expected_types = ["pop_up_dinner", "wine_dinner", "brunch_series", "holiday_event", "pool_party", "chef_table"]
        for expected in expected_types:
            assert expected in template_types, f"Missing template type: {expected}"
        
        # Validate template structure
        for t in templates:
            assert "type" in t
            assert "name" in t
            assert "description" in t
            assert "defaults" in t
            defaults = t["defaults"]
            assert "estimated_covers" in defaults
            assert "avg_check" in defaults
            assert "food_cost_pct" in defaults
            assert "frequency" in defaults
        
        print(f"PASS: Activations templates returned")
        for t in templates:
            print(f"  - {t['name']} ({t['type']}): {t['defaults']['estimated_covers']} covers @ ${t['defaults']['avg_check']}")
    
    def test_activations_model_popup(self):
        """POST /api/echo-stratus/activations/model - Model pop-up dinner"""
        payload = {
            "name": "Pop-Up Chef's Table",
            "activation_type": "pop_up_dinner",
            "frequency": "monthly",
            "estimated_covers": 24,
            "avg_check": 185,
            "food_cost_pct": 25,
            "labor_cost_pct": 15,
            "fixed_cost_per_event": 800,
            "marketing_cost": 400,
            "months_active": []
        }
        response = requests.post(f"{BASE_URL}/api/echo-stratus/activations/model", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "activation_id" in data
        assert "name" in data
        assert "type" in data
        assert "per_event" in data
        assert "annual" in data
        assert "monthly" in data
        assert "historical_benchmark" in data
        
        # Validate per-event metrics
        pe = data["per_event"]
        assert "covers" in pe
        assert "avg_check" in pe
        assert "revenue" in pe
        assert "food_cost" in pe
        assert "labor_cost" in pe
        assert "profit" in pe
        assert "margin_pct" in pe
        assert pe["covers"] == 24
        assert pe["avg_check"] == 185
        
        # Validate annual projections
        annual = data["annual"]
        assert "events" in annual
        assert "revenue" in annual
        assert "profit" in annual
        assert "covers" in annual
        assert "margin_pct" in annual
        
        # Validate monthly breakdown (12 months)
        assert len(data["monthly"]) == 12
        for m in range(1, 13):
            month = data["monthly"][str(m)]
            assert "events" in month
            assert "revenue" in month
            assert "active" in month
        
        print(f"PASS: Pop-up dinner modeled")
        print(f"  Per Event: ${pe['revenue']:,.2f} revenue, ${pe['profit']:,.2f} profit ({pe['margin_pct']}%)")
        print(f"  Annual: {annual['events']} events, ${annual['revenue']:,.2f} revenue, ${annual['profit']:,.2f} profit")
    
    def test_activations_model_wine_dinner(self):
        """POST /api/echo-stratus/activations/model - Model wine dinner"""
        payload = {
            "name": "Winemaker's Dinner",
            "activation_type": "wine_dinner",
            "frequency": "monthly",
            "estimated_covers": 36,
            "avg_check": 165,
            "food_cost_pct": 22,
            "labor_cost_pct": 18,
            "fixed_cost_per_event": 600,
            "marketing_cost": 350,
            "months_active": []
        }
        response = requests.post(f"{BASE_URL}/api/echo-stratus/activations/model", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["type"] == "wine_dinner"
        assert data["per_event"]["covers"] == 36
        print(f"PASS: Wine dinner modeled - ${data['annual']['revenue']:,.2f} annual revenue")
    
    def test_spending_patterns(self):
        """GET /api/echo-stratus/patterns/spending - Guest spending patterns"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/patterns/spending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "overall" in data
        assert "by_outlet" in data
        assert "by_event_type" in data
        assert "seasonal" in data
        
        # Validate overall metrics
        overall = data["overall"]
        assert "total_revenue" in overall
        assert "total_events" in overall
        assert "total_covers" in overall
        assert "avg_revenue_per_event" in overall
        assert "avg_check_per_guest" in overall
        
        # Validate outlet spending (should have 6 outlets)
        outlets = data["by_outlet"]
        assert len(outlets) >= 1, "Expected at least 1 outlet"
        for o in outlets:
            assert "outlet_id" in o
            assert "name" in o
            assert "estimated_revenue" in o
            assert "avg_check" in o
            assert "share_pct" in o
        
        # Validate seasonal patterns (12 months)
        assert len(data["seasonal"]) == 12
        for m in range(1, 13):
            month = data["seasonal"][str(m)]
            assert "month" in month
            assert "seasonality_factor" in month
            assert "estimated_revenue" in month
        
        print(f"PASS: Spending patterns returned")
        print(f"  Total Revenue: ${overall['total_revenue']:,.2f}")
        print(f"  Total Events: {overall['total_events']}")
        print(f"  Avg Check: ${overall['avg_check_per_guest']:,.2f}")
        print(f"  Outlets: {len(outlets)}")


class TestOriginalEchoStratusEndpoints:
    """Verify original 7 EchoStratus views still work"""
    
    def test_executive_dashboard(self):
        """GET /api/echo-stratus/executive/dashboard"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/executive/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "projections" in data
        print("PASS: Executive dashboard working")
    
    def test_forecast(self):
        """POST /api/echo-stratus/forecast"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/forecast", json={"horizon": "30d"})
        assert response.status_code == 200
        data = response.json()
        assert "periods" in data
        assert "summary" in data
        print("PASS: Forecast working")
    
    def test_scenarios_templates(self):
        """GET /api/echo-stratus/scenarios/templates"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/scenarios/templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        print("PASS: Scenario templates working")
    
    def test_scenarios_simulate(self):
        """POST /api/echo-stratus/scenarios/simulate"""
        payload = {
            "scenario_type": "occupancy_drop",
            "parameters": {"occupancy_drop_pct": 12},
            "name": "Test Scenario"
        }
        response = requests.post(f"{BASE_URL}/api/echo-stratus/scenarios/simulate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "impact" in data
        assert "ebitda_change" in data["impact"]
        print(f"PASS: Scenario simulation working - EBITDA impact: ${data['impact']['ebitda_change']:,.2f}")
    
    def test_signals(self):
        """GET /api/echo-stratus/signals"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/signals")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        print("PASS: Signals working")
    
    def test_recommendations(self):
        """GET /api/echo-stratus/recommendations"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        print("PASS: Recommendations working")
    
    def test_portfolio_overview(self):
        """GET /api/echo-stratus/portfolio/overview"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/overview")
        assert response.status_code == 200
        data = response.json()
        assert "portfolio" in data
        assert "outlets" in data
        print("PASS: Portfolio overview working")
    
    def test_risk_radar(self):
        """GET /api/echo-stratus/portfolio/risk-radar"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/risk-radar")
        assert response.status_code == 200
        data = response.json()
        assert "dimensions" in data
        assert "overall_risk_score" in data
        print("PASS: Risk radar working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
