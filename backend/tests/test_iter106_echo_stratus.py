"""
Iteration 106: EchoStratus Predictive Intelligence Brain + Performance Intelligence Enhancements
=================================================================================================
Tests for:
- EchoStratus Executive Dashboard, Forecasting, What-If Scenarios
- Signal Detection, Recommendations, Portfolio Intelligence
- Risk Radar, Budget Engine, CapEx ROI, Activation Modeling
- Monthly P&L Review
- Performance Intelligence Day Analysis (new)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestEchoStratusExecutive:
    """Executive Dashboard and Narrative endpoints"""
    
    def test_executive_dashboard(self, api_client):
        """GET /api/echo-stratus/executive/dashboard - returns kpis, projections, pipeline, cost_structure, confidence"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/executive/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify KPIs structure
        assert "kpis" in data
        kpis = data["kpis"]
        assert "revenue" in kpis
        assert "ebitda" in kpis
        assert "food_cost_pct" in kpis
        assert "labor_pct" in kpis
        assert "margin" in kpis
        assert "pipeline_value" in kpis
        
        # Verify projections
        assert "projections" in data
        proj = data["projections"]
        assert "30d_revenue" in proj
        assert "30d_ebitda" in proj
        assert "seasonality_trend" in proj
        
        # Verify pipeline
        assert "pipeline" in data
        assert "confirmed" in data["pipeline"]
        assert "tentative" in data["pipeline"]
        
        # Verify cost structure
        assert "cost_structure" in data
        assert "food" in data["cost_structure"]
        assert "labor" in data["cost_structure"]
        
        # Verify confidence
        assert "confidence" in data
        assert "forecast" in data["confidence"]
        assert "data_sources_active" in data["confidence"]
        
        print(f"✓ Executive dashboard: Revenue ${kpis['revenue']['value']:,.0f}, EBITDA ${kpis['ebitda']['value']:,.0f}")
    
    def test_executive_narrative(self, api_client):
        """POST /api/echo-stratus/executive/narrative - returns AI narrative text"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/executive/narrative", json={})
        assert response.status_code == 200
        data = response.json()
        
        assert "narrative" in data
        assert isinstance(data["narrative"], str)
        assert len(data["narrative"]) > 50  # Should have substantial content
        assert "generated_at" in data
        assert "confidence" in data
        
        print(f"✓ Executive narrative generated ({len(data['narrative'])} chars)")


class TestEchoStratusForecast:
    """Forecast Engine endpoints"""
    
    def test_forecast_domains(self, api_client):
        """GET /api/echo-stratus/forecast/domains - returns horizons and domains"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/forecast/domains")
        assert response.status_code == 200
        data = response.json()
        
        assert "horizons" in data
        assert len(data["horizons"]) >= 4  # 7d, 30d, 90d, 12m, capital
        
        # Verify horizon structure
        for h in data["horizons"]:
            assert "id" in h
            assert "label" in h
            assert "days" in h
        
        assert "domains" in data
        assert "revenue" in data["domains"]
        assert "labor" in data["domains"]
        
        print(f"✓ Forecast domains: {len(data['horizons'])} horizons, {len(data['domains'])} domains")
    
    def test_forecast_30d(self, api_client):
        """POST /api/echo-stratus/forecast with {horizon: '30d'} - returns periods and summary"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/forecast", json={"horizon": "30d"})
        assert response.status_code == 200
        data = response.json()
        
        assert "horizon" in data
        assert data["horizon"] == "30d"
        
        assert "periods" in data
        assert len(data["periods"]) == 30  # 30 days
        
        # Verify period structure
        period = data["periods"][0]
        assert "date" in period
        assert "revenue" in period
        assert "cost" in period
        assert "profit" in period
        assert "covers" in period
        assert "confidence" in period
        
        assert "summary" in data
        summary = data["summary"]
        assert "total_forecast_revenue" in summary
        assert "total_forecast_profit" in summary
        assert "avg_margin_pct" in summary
        assert "avg_confidence" in summary
        
        print(f"✓ 30d forecast: ${summary['total_forecast_revenue']:,.0f} revenue, {summary['avg_confidence']*100:.0f}% confidence")
    
    def test_forecast_90d(self, api_client):
        """POST /api/echo-stratus/forecast with {horizon: '90d'}"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/forecast", json={"horizon": "90d"})
        assert response.status_code == 200
        data = response.json()
        
        assert data["horizon"] == "90d"
        assert len(data["periods"]) == 90
        print(f"✓ 90d forecast: {len(data['periods'])} periods")


class TestEchoStratusScenarios:
    """What-If Scenario Simulation endpoints"""
    
    def test_scenario_templates(self, api_client):
        """GET /api/echo-stratus/scenarios/templates - returns 5 scenario templates"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/scenarios/templates")
        assert response.status_code == 200
        data = response.json()
        
        assert "templates" in data
        assert len(data["templates"]) == 5
        
        # Verify template structure
        for t in data["templates"]:
            assert "type" in t
            assert "name" in t
            assert "description" in t
            assert "default_params" in t
        
        # Check specific templates exist
        types = [t["type"] for t in data["templates"]]
        assert "occupancy_drop" in types
        assert "food_price_spike" in types
        assert "event_cancellation" in types
        
        print(f"✓ Scenario templates: {len(data['templates'])} templates available")
    
    def test_simulate_occupancy_drop(self, api_client):
        """POST /api/echo-stratus/scenarios/simulate with {scenario_type:'occupancy_drop'} - returns impact and action_plan"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/scenarios/simulate", json={
            "scenario_type": "occupancy_drop",
            "parameters": {"occupancy_change_pct": -12}
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "scenario_type" in data
        assert data["scenario_type"] == "occupancy_drop"
        
        assert "impact" in data
        impact = data["impact"]
        assert "revenue_change" in impact
        assert "cost_change" in impact
        assert "labor_change" in impact
        assert "ebitda_change" in impact
        
        assert "action_plan" in data
        assert "confidence" in data
        
        print(f"✓ Occupancy drop scenario: Revenue impact ${impact['revenue_change']:,.0f}")
    
    def test_simulate_food_price_spike(self, api_client):
        """POST /api/echo-stratus/scenarios/simulate with food_price_spike"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/scenarios/simulate", json={
            "scenario_type": "food_price_spike",
            "parameters": {"food_cost_increase_pct": 9}
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data["scenario_type"] == "food_price_spike"
        assert data["impact"]["food_cost_change"] > 0
        print(f"✓ Food price spike scenario: Cost impact ${data['impact']['food_cost_change']:,.0f}")


class TestEchoStratusSignals:
    """Signal Detection endpoints"""
    
    def test_signals(self, api_client):
        """GET /api/echo-stratus/signals - returns signals array"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/signals")
        assert response.status_code == 200
        data = response.json()
        
        assert "signals" in data
        assert isinstance(data["signals"], list)
        
        # Verify signal structure if any exist
        if data["signals"]:
            signal = data["signals"][0]
            assert "title" in signal
            assert "description" in signal
            assert "severity" in signal
            assert "category" in signal
        
        assert "scanned_sources" in data
        assert "reliability_index" in data
        
        print(f"✓ Signals detected: {len(data['signals'])} signals, reliability {data['reliability_index']}")


class TestEchoStratusRecommendations:
    """Recommendation Engine endpoints"""
    
    def test_recommendations(self, api_client):
        """GET /api/echo-stratus/recommendations - returns 5 recommendations with ROI"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/recommendations")
        assert response.status_code == 200
        data = response.json()
        
        assert "recommendations" in data
        assert len(data["recommendations"]) == 5
        
        # Verify recommendation structure
        for rec in data["recommendations"]:
            assert "id" in rec
            assert "title" in rec
            assert "description" in rec
            assert "priority" in rec
            assert "estimated_impact" in rec
            assert "roi_estimate_pct" in rec
            assert "confidence" in rec
        
        assert "total_estimated_impact" in data
        
        print(f"✓ Recommendations: {len(data['recommendations'])} actions, total impact ${data['total_estimated_impact']:,.0f}")


class TestEchoStratusPortfolio:
    """Portfolio Intelligence endpoints"""
    
    def test_portfolio_overview(self, api_client):
        """GET /api/echo-stratus/portfolio/overview - returns 7 outlets with revenue/margin"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/portfolio/overview")
        assert response.status_code == 200
        data = response.json()
        
        assert "portfolio" in data
        assert "total_revenue" in data["portfolio"]
        assert "ebitda" in data["portfolio"]
        assert "total_outlets" in data["portfolio"]
        
        assert "outlets" in data
        assert len(data["outlets"]) == 7
        
        # Verify outlet structure
        for outlet in data["outlets"]:
            assert "outlet_id" in outlet
            assert "name" in outlet
            assert "type" in outlet
            assert "revenue" in outlet
            assert "margin_pct" in outlet
            assert "ebitda" in outlet
        
        assert "optimization_opportunities" in data
        
        print(f"✓ Portfolio: {len(data['outlets'])} outlets, total revenue ${data['portfolio']['total_revenue']:,.0f}")
    
    def test_risk_radar(self, api_client):
        """GET /api/echo-stratus/portfolio/risk-radar - returns 6 risk dimensions"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/portfolio/risk-radar")
        assert response.status_code == 200
        data = response.json()
        
        assert "dimensions" in data
        assert len(data["dimensions"]) == 6
        
        # Verify dimension structure
        for dim in data["dimensions"]:
            assert "label" in dim
            assert "score" in dim
            assert "severity" in dim
            assert "detail" in dim
        
        assert "overall_risk_score" in data
        assert "overall_severity" in data
        
        print(f"✓ Risk radar: {len(data['dimensions'])} dimensions, overall score {data['overall_risk_score']}")


class TestEchoStratusBudget:
    """Budget Engine endpoints"""
    
    def test_budget_create(self, api_client):
        """POST /api/echo-stratus/budget/create with {fiscal_year:2026} - creates budget with 12 monthly P&Ls"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/budget/create", json={
            "fiscal_year": 2026,
            "name": "TEST_FY2026 Budget"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "fiscal_year" in data
        assert data["fiscal_year"] == 2026
        
        assert "months" in data
        assert len(data["months"]) == 12
        
        # Verify monthly P&L structure
        month1 = data["months"]["1"]
        assert "revenue" in month1
        assert "cost_of_sales" in month1
        assert "labor" in month1
        assert "ebitda" in month1
        
        assert "annual" in data
        assert "total_revenue" in data["annual"]
        assert "total_ebitda" in data["annual"]
        
        print(f"✓ Budget created: {data['id']}, annual revenue ${data['annual']['total_revenue']:,.0f}")
        return data["id"]
    
    def test_budget_list(self, api_client):
        """GET /api/echo-stratus/budget/list - returns created budgets"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/budget/list")
        assert response.status_code == 200
        data = response.json()
        
        assert "budgets" in data
        assert isinstance(data["budgets"], list)
        
        # Should have at least the budget we just created
        if data["budgets"]:
            budget = data["budgets"][0]
            assert "id" in budget
            assert "fiscal_year" in budget
        
        print(f"✓ Budget list: {len(data['budgets'])} budgets found")


class TestEchoStratusCapex:
    """CapEx ROI Analysis endpoints"""
    
    def test_capex_analyze(self, api_client):
        """POST /api/echo-stratus/capex/analyze - returns breakeven, NPV, ROI"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/capex/analyze", json={
            "name": "TEST_Restaurant Table",
            "cost": 4000,
            "seats": 4,
            "turns_per_day": 2.0,
            "avg_check": 65,
            "useful_life_years": 7
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "investment" in data
        assert data["investment"]["name"] == "TEST_Restaurant Table"
        assert data["investment"]["cost"] == 4000
        
        assert "breakeven" in data
        assert "months" in data["breakeven"]
        assert "covers_needed" in data["breakeven"]
        
        assert "npv" in data
        assert "roi_pct" in data
        assert "recommendation" in data
        
        assert "cash_flows" in data
        assert len(data["cash_flows"]) == 7  # 7 years
        
        assert "table_size_comparison" in data
        
        print(f"✓ CapEx analysis: Breakeven {data['breakeven']['months']} months, ROI {data['roi_pct']}%, NPV ${data['npv']:,.0f}")


class TestEchoStratusActivations:
    """Activation Modeling endpoints"""
    
    def test_activation_templates(self, api_client):
        """GET /api/echo-stratus/activations/templates - returns 5 activation templates"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/activations/templates")
        assert response.status_code == 200
        data = response.json()
        
        assert "templates" in data
        assert len(data["templates"]) == 5
        
        # Verify template structure
        for t in data["templates"]:
            assert "type" in t
            assert "name" in t
            assert "description" in t
            assert "defaults" in t
            assert "estimated_covers" in t["defaults"]
            assert "avg_check" in t["defaults"]
        
        # Check specific templates
        types = [t["type"] for t in data["templates"]]
        assert "wine_dinner" in types
        assert "chef_table" in types
        assert "pool_brunch" in types
        
        print(f"✓ Activation templates: {len(data['templates'])} templates available")
    
    def test_activation_model(self, api_client):
        """POST /api/echo-stratus/activations/model - model activation profitability"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/activations/model", json={
            "name": "TEST_Wine Dinner",
            "estimated_covers": 48,
            "avg_check": 175,
            "food_cost_pct": 22,
            "labor_hours": 35,
            "frequency": "monthly"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "name" in data
        assert "per_event" in data
        assert "revenue" in data["per_event"]
        assert "profit" in data["per_event"]
        assert "margin_pct" in data["per_event"]
        
        assert "annual" in data
        assert "events" in data["annual"]
        assert "revenue" in data["annual"]
        assert "profit" in data["annual"]
        
        assert "monthly" in data
        assert len(data["monthly"]) == 12
        
        print(f"✓ Activation model: Per-event profit ${data['per_event']['profit']:,.0f}, annual ${data['annual']['profit']:,.0f}")


class TestEchoStratusMonthlyReview:
    """Monthly P&L Review endpoints"""
    
    def test_monthly_review_generate(self, api_client):
        """POST /api/echo-stratus/monthly-review/generate with {month:4} - returns full monthly review"""
        response = api_client.post(f"{BASE_URL}/api/echo-stratus/monthly-review/generate", json={
            "month": 4,
            "year": 2026
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "review_id" in data
        assert "month" in data
        assert data["month"] == 4
        assert "month_name" in data
        assert data["month_name"] == "April"
        
        assert "resort_pnl" in data
        pnl = data["resort_pnl"]
        assert "revenue" in pnl
        assert "food_cost" in pnl
        assert "labor_cost" in pnl
        assert "ebitda" in pnl
        assert "food_cost_pct" in pnl
        
        assert "outlet_reports" in data
        assert len(data["outlet_reports"]) == 7  # 7 outlets
        
        # Verify outlet report structure
        outlet = data["outlet_reports"][0]
        assert "outlet_id" in outlet
        assert "name" in outlet
        assert "health_score" in outlet
        assert "pnl" in outlet
        
        assert "health_summary" in data
        assert "overall_score" in data["health_summary"]
        assert "outlets_healthy" in data["health_summary"]
        
        assert "ai_narrative" in data
        assert len(data["ai_narrative"]) > 50
        
        print(f"✓ Monthly review: {data['month_name']} {data['year']}, overall score {data['health_summary']['overall_score']}")
    
    def test_review_history(self, api_client):
        """GET /api/echo-stratus/reviews/history - returns past reviews"""
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/reviews/history")
        assert response.status_code == 200
        data = response.json()
        
        assert "reviews" in data
        assert isinstance(data["reviews"], list)
        
        print(f"✓ Review history: {len(data['reviews'])} reviews found")


class TestPerformanceDayAnalysis:
    """Performance Intelligence Day Analysis (new feature)"""
    
    def test_day_analysis(self, api_client):
        """GET /api/echoai3/performance/day-analysis?date=2026-04-25 - returns deep day analysis"""
        response = api_client.get(f"{BASE_URL}/api/echoai3/performance/day-analysis?date=2026-04-25")
        assert response.status_code == 200
        data = response.json()
        
        assert "date" in data
        assert data["date"] == "2026-04-25"
        assert "event_count" in data
        assert "total_covers" in data
        assert "total_revenue" in data
        
        # Even if no events, should have structure
        assert "events" in data
        assert "department_breakdown" in data
        assert "financial_summary" in data
        assert "recommendations" in data
        assert "risk_factors" in data
        assert "efficiency_score" in data
        
        print(f"✓ Day analysis: {data['date']}, {data['event_count']} events, {data['total_covers']} covers")
    
    def test_day_analysis_with_events(self, api_client):
        """Test day analysis returns proper structure for events"""
        # Try a date that might have events
        response = api_client.get(f"{BASE_URL}/api/echoai3/performance/day-analysis?date=2026-01-15")
        assert response.status_code == 200
        data = response.json()
        
        # Verify department breakdown structure
        if data["department_breakdown"]:
            for dept, info in data["department_breakdown"].items():
                assert "hours" in info
                assert "headcount" in info
                assert "labor_cost" in info
        
        # Verify financial summary structure
        if data["financial_summary"]:
            fs = data["financial_summary"]
            assert "total_revenue" in fs
            assert "total_labor_cost" in fs
            assert "gross_profit" in fs
        
        print(f"✓ Day analysis structure verified")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_budgets(self, api_client):
        """Clean up TEST_ prefixed budgets"""
        # List budgets and note any TEST_ ones for manual cleanup
        response = api_client.get(f"{BASE_URL}/api/echo-stratus/budget/list")
        if response.status_code == 200:
            data = response.json()
            test_budgets = [b for b in data.get("budgets", []) if b.get("name", "").startswith("TEST_")]
            print(f"✓ Found {len(test_budgets)} TEST_ budgets (manual cleanup may be needed)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
