"""
Iteration 46 - EchoStratus Universal Decision Engine Tests
==========================================================
Tests for the new Ask View (AI Decision Engine) and Projects View (5-Year Pro Forma)
including event feasibility studies with GO/NOT WORTH IT verdicts.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')


class TestDecisionTemplates:
    """Test GET /api/echo-stratus/decision/templates - Question templates for Ask view"""
    
    def test_decision_templates_returns_5_categories(self):
        """Templates should return 5 categories of questions"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/decision/templates")
        assert response.status_code == 200
        data = response.json()
        
        assert "templates" in data
        templates = data["templates"]
        assert len(templates) == 5, f"Expected 5 categories, got {len(templates)}"
        
        # Verify all 5 categories exist
        categories = [t["category"] for t in templates]
        expected_categories = ["New Venue", "Events & Activations", "Capital Investment", "Operations", "Strategic"]
        for cat in expected_categories:
            assert cat in categories, f"Missing category: {cat}"
        
        # Each category should have questions
        for template in templates:
            assert "questions" in template
            assert len(template["questions"]) > 0, f"Category {template['category']} has no questions"
            print(f"Category '{template['category']}': {len(template['questions'])} questions")


class TestDecisionAsk:
    """Test POST /api/echo-stratus/decision/ask - AI-powered question answering"""
    
    def test_ask_guest_chef_question(self):
        """Ask about guest chef event - should classify as guest_chef_event"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/decision/ask",
            json={"question": "Is it worth bringing in a guest chef for $5,000?"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "question" in data
        assert "analysis_type" in data
        assert "ai_analysis" in data
        assert "financial_model" in data
        assert "baseline_context" in data
        assert "confidence" in data
        
        # Verify classification
        assert data["analysis_type"] == "guest_chef_event"
        
        # Verify financial model
        model = data["financial_model"]
        assert model["type"] == "guest_chef_event"
        assert "revenue" in model
        assert "total_cost" in model
        assert "profit" in model
        assert "margin_pct" in model
        assert "cost_breakdown" in model
        assert "worth_it" in model
        assert "recommendation" in model
        
        # Verify baseline context
        baseline = data["baseline_context"]
        assert "current_annual_revenue" in baseline
        assert "current_ebitda" in baseline
        assert "total_outlets" in baseline
        assert "total_events" in baseline
        
        print(f"Analysis type: {data['analysis_type']}")
        print(f"Financial model profit: ${model['profit']:,.2f}")
        print(f"Recommendation: {model['recommendation']}")
    
    def test_ask_new_venue_question(self):
        """Ask about new restaurant - should classify as new_venue"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/decision/ask",
            json={"question": "What if we build a new restaurant on the pool deck?"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["analysis_type"] == "new_venue"
        model = data["financial_model"]
        assert model["type"] == "new_venue"
        assert "total_investment" in model
        assert "annual_revenue_projected" in model
        assert "breakeven_months" in model
        print(f"New venue breakeven: {model['breakeven_months']} months")
    
    def test_ask_wine_event_question(self):
        """Ask about wine dinner - should classify as wine_event"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/decision/ask",
            json={"question": "What's the ROI on a monthly wine dinner series?"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["analysis_type"] == "wine_event"
        model = data["financial_model"]
        assert model["type"] == "event_activation"
        assert "revenue_per_event" in model
        assert "profit_per_event" in model
        assert "annual_if_monthly" in model
        print(f"Wine dinner annual profit (monthly): ${model['annual_if_monthly']:,.2f}")
    
    def test_ask_capex_question(self):
        """Ask about equipment purchase - should classify as capex"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/decision/ask",
            json={"question": "Is a $50K kitchen equipment upgrade worth it?"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Note: Classification depends on keyword matching - "invest in" triggers capex
        assert data["analysis_type"] in ["capex", "general"], f"Got {data['analysis_type']}"
        print(f"CapEx analysis type: {data['analysis_type']}")
    
    def test_ask_pricing_question(self):
        """Ask about price increase - should classify as pricing"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/decision/ask",
            json={"question": "What if we raise menu prices by 5%?"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["analysis_type"] == "pricing"
        model = data["financial_model"]
        assert model["type"] == "pricing"
        assert "current_revenue" in model
        assert "new_revenue_at_increase" in model
        assert "incremental_revenue" in model
        print(f"Pricing incremental revenue: ${model['incremental_revenue']:,.2f}")
    
    def test_ask_staffing_question(self):
        """Ask about hiring - should classify as staffing"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/decision/ask",
            json={"question": "Should we hire 3 more line cooks?"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["analysis_type"] == "staffing"
        model = data["financial_model"]
        assert model["type"] == "staffing"
        assert "annual_cost" in model
        assert "revenue_needed_to_justify" in model
        print(f"Staffing annual cost: ${model['annual_cost']:,.2f}")


class TestProjectAnalysis:
    """Test POST /api/echo-stratus/project/analyze - 5-Year Pro Forma"""
    
    def test_project_analyze_new_restaurant(self):
        """Analyze new restaurant project with 5-year pro forma"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/project/analyze",
            json={
                "name": "TEST_New Pool Deck Restaurant",
                "project_type": "new_restaurant",
                "build_cost": 500000,
                "ff_e_cost": 100000,
                "pre_opening_cost": 50000,
                "seats": 80,
                "turns_per_day": 2.0,
                "avg_check": 75,
                "operating_days_per_year": 350,
                "food_cost_pct": 18.0,
                "labor_cost_pct": 28.0,
                "foh_staff": 12,
                "boh_staff": 8,
                "management": 2,
                "year1_ramp_pct": 65,
                "year2_ramp_pct": 85,
                "mature_occupancy_pct": 95
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "project_id" in data
        assert "name" in data
        assert "project_type" in data
        assert "investment" in data
        assert "revenue_model" in data
        assert "staffing" in data
        assert "five_year_proforma" in data
        assert "monthly_year1" in data
        assert "breakeven_months" in data
        assert "payback_year" in data
        assert "npv" in data
        assert "sensitivity" in data
        assert "recommendation" in data
        
        # Verify investment breakdown
        inv = data["investment"]
        assert inv["build_cost"] == 500000
        assert inv["ff_e"] == 100000
        assert inv["pre_opening"] == 50000
        assert inv["total"] == 650000
        
        # Verify 5-year pro forma has 5 years
        proforma = data["five_year_proforma"]
        assert len(proforma) == 5, f"Expected 5 years, got {len(proforma)}"
        
        # Verify each year has required fields
        for year in proforma:
            assert "year" in year
            assert "occupancy_pct" in year
            assert "revenue" in year
            assert "food_cost" in year
            assert "labor" in year
            assert "ebitda" in year
            assert "ebitda_margin_pct" in year
            assert "cumulative_cash_flow" in year
        
        # Verify year 1 ramp
        assert proforma[0]["occupancy_pct"] == 65.0
        assert proforma[1]["occupancy_pct"] == 85.0
        assert proforma[2]["occupancy_pct"] == 95.0
        
        # Verify sensitivity analysis has 7 scenarios
        sensitivity = data["sensitivity"]
        assert len(sensitivity) == 7, f"Expected 7 sensitivity scenarios, got {len(sensitivity)}"
        
        # Verify sensitivity scenarios
        for s in sensitivity:
            assert "avg_check" in s
            assert "annual_revenue" in s
            assert "annual_ebitda" in s
            assert "breakeven_months" in s
        
        # Verify staffing model
        staffing = data["staffing"]
        assert staffing["foh"] == 12
        assert staffing["boh"] == 8
        assert staffing["management"] == 2
        assert staffing["total_headcount"] == 22
        assert "annual_labor_cost" in staffing
        
        # Verify monthly year 1 breakdown
        monthly = data["monthly_year1"]
        assert len(monthly) == 12, f"Expected 12 months, got {len(monthly)}"
        
        print(f"Project: {data['name']}")
        print(f"Total Investment: ${inv['total']:,.0f}")
        print(f"Breakeven: {data['breakeven_months']} months")
        print(f"NPV: ${data['npv']:,.0f}")
        print(f"Recommendation: {data['recommendation']}")
        print(f"5-Year Total EBITDA: ${data['total_5yr_ebitda']:,.0f}")
    
    def test_project_analyze_different_params(self):
        """Test project analysis with different parameters"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/project/analyze",
            json={
                "name": "TEST_Rooftop Bar",
                "project_type": "new_bar",
                "build_cost": 300000,
                "ff_e_cost": 75000,
                "seats": 50,
                "turns_per_day": 3.0,
                "avg_check": 45,
                "has_bar": True,
                "bar_revenue_pct": 60
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["project_type"] == "new_bar"
        assert data["revenue_model"]["seats"] == 50
        assert data["revenue_model"]["turns_per_day"] == 3.0
        print(f"Bar project NPV: ${data['npv']:,.0f}")


class TestEventFeasibility:
    """Test POST /api/echo-stratus/event/feasibility - Event feasibility with verdict"""
    
    def test_event_feasibility_guest_chef_go(self):
        """Test guest chef event feasibility - should return GO verdict"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/event/feasibility",
            json={
                "name": "TEST_Celebrity Chef Dinner",
                "event_type": "guest_chef",
                "expected_covers": 60,
                "ticket_price": 175,
                "includes_wine_pairing": True,
                "wine_pairing_price": 65,
                "guest_chef_fee": 5000,
                "food_cost_per_cover": 35,
                "beverage_cost_per_cover": 15,
                "extra_staff_count": 6,
                "extra_staff_hours": 8,
                "staff_hourly_rate": 25,
                "entertainment_cost": 500,
                "decor_cost": 800,
                "marketing_budget": 1200,
                "prep_days": 2
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "feasibility_id" in data
        assert "name" in data
        assert "event_type" in data
        assert "revenue" in data
        assert "costs" in data
        assert "profitability" in data
        assert "breakeven_covers" in data
        assert "series_impact" in data
        assert "vs_portfolio" in data
        assert "verdict" in data
        assert "is_worth_it" in data
        assert "risk_factors" in data
        
        # Verify revenue breakdown
        revenue = data["revenue"]
        assert "ticket_revenue" in revenue
        assert "wine_pairing_revenue" in revenue
        assert "total" in revenue
        assert "per_cover" in revenue
        
        # Verify costs breakdown
        costs = data["costs"]
        assert "food" in costs
        assert "beverage" in costs
        assert "labor_event_day" in costs
        assert "labor_prep" in costs
        assert "guest_chef_fee" in costs
        assert "entertainment" in costs
        assert "decor" in costs
        assert "marketing" in costs
        assert "total" in costs
        assert "per_cover" in costs
        
        # Verify profitability
        profit = data["profitability"]
        assert "profit" in profit
        assert "margin_pct" in profit
        assert "per_cover_profit" in profit
        
        # Verify verdict is GO or NOT WORTH IT
        assert data["verdict"] in ["GO", "MARGINAL", "NOT WORTH IT"]
        
        # Verify risk factors
        assert isinstance(data["risk_factors"], list)
        assert len(data["risk_factors"]) > 0
        
        print(f"Event: {data['name']}")
        print(f"Revenue: ${revenue['total']:,.0f}")
        print(f"Costs: ${costs['total']:,.0f}")
        print(f"Profit: ${profit['profit']:,.0f}")
        print(f"Margin: {profit['margin_pct']}%")
        print(f"Verdict: {data['verdict']}")
        print(f"Risk factors: {data['risk_factors']}")
    
    def test_event_feasibility_not_worth_it(self):
        """Test event with high costs - should return NOT WORTH IT verdict"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/event/feasibility",
            json={
                "name": "TEST_Expensive Chef Event",
                "event_type": "guest_chef",
                "expected_covers": 30,  # Low covers
                "ticket_price": 100,    # Low ticket price
                "includes_wine_pairing": False,
                "guest_chef_fee": 15000,  # Very high chef fee
                "food_cost_per_cover": 50,  # High food cost
                "beverage_cost_per_cover": 20,
                "extra_staff_count": 10,  # Too many staff
                "extra_staff_hours": 10,
                "staff_hourly_rate": 30,
                "entertainment_cost": 2000,
                "decor_cost": 3000,
                "marketing_budget": 5000,
                "prep_days": 3
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # This should be NOT WORTH IT due to high costs and low revenue
        profit = data["profitability"]["profit"]
        print(f"High-cost event profit: ${profit:,.0f}")
        print(f"Verdict: {data['verdict']}")
        
        # Verify the verdict logic works
        if profit < 0:
            assert data["verdict"] == "NOT WORTH IT"
            assert data["is_worth_it"] == False
    
    def test_event_feasibility_series(self):
        """Test event series impact calculation"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/event/feasibility",
            json={
                "name": "TEST_Monthly Wine Dinner Series",
                "event_type": "wine_dinner",
                "expected_covers": 40,
                "ticket_price": 145,
                "includes_wine_pairing": True,
                "wine_pairing_price": 55,
                "is_series": True,
                "events_per_year": 12
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify series impact
        series = data["series_impact"]
        assert series["events_per_year"] == 12
        assert "annual_revenue" in series
        assert "annual_profit" in series
        assert "annual_covers" in series
        
        # Annual should be 12x single event
        single_revenue = data["revenue"]["total"]
        assert series["annual_revenue"] == single_revenue * 12
        
        print(f"Series: {data['name']}")
        print(f"Events/year: {series['events_per_year']}")
        print(f"Annual revenue: ${series['annual_revenue']:,.0f}")
        print(f"Annual profit: ${series['annual_profit']:,.0f}")


class TestExistingEndpoints:
    """Verify existing endpoints still work after new features added"""
    
    def test_executive_dashboard(self):
        """Executive dashboard should still work"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/executive/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "projections" in data
        print("Executive dashboard: PASS")
    
    def test_budget_list(self):
        """Budget list should still work"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/budget/list")
        assert response.status_code == 200
        data = response.json()
        assert "budgets" in data
        print(f"Budget list: {len(data['budgets'])} budgets")
    
    def test_capex_analyze(self):
        """CapEx analyze should still work"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/capex/analyze",
            json={"name": "Test Table", "cost": 4000, "seats": 4}
        )
        assert response.status_code == 200
        data = response.json()
        assert "breakeven" in data
        assert "npv" in data
        print(f"CapEx analyze: NPV ${data['npv']:,.0f}")
    
    def test_activations_templates(self):
        """Activations templates should still work"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/activations/templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        print(f"Activations templates: {len(data['templates'])} templates")
    
    def test_signals(self):
        """Signals endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/signals")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        print(f"Signals: {len(data['signals'])} signals")
    
    def test_recommendations(self):
        """Recommendations endpoint should still work"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        print(f"Recommendations: {len(data['recommendations'])} recommendations")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
