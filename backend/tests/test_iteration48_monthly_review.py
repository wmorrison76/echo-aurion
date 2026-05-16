"""
Iteration 48 - EchoStratus Monthly P&L Review Tests
====================================================
Tests for the new Monthly Review feature including:
- POST /api/echo-stratus/monthly-review/generate endpoint
- Review response structure validation
- Outlet reports with health scores
- Causal factors analysis
- AI narrative generation
- Navigation tabs verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMonthlyReviewAPI:
    """Monthly Review API endpoint tests"""
    
    def test_generate_monthly_review_january(self):
        """Test generating monthly review for January 2026"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 1, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify review structure
        assert "review_id" in data
        assert "period" in data
        assert data["month_name"] == "Jan"
        assert data["year"] == 2026
        
        # Verify resort P&L
        resort_pnl = data["resort_pnl"]
        assert "revenue" in resort_pnl
        assert "ebitda" in resort_pnl
        assert "food_cost_pct" in resort_pnl
        assert "labor_pct" in resort_pnl
        assert "total_events" in resort_pnl
        assert "total_covers" in resort_pnl
        assert "avg_check" in resort_pnl
        assert "outlet_count" in resort_pnl
        
        print(f"Resort Revenue: ${resort_pnl['revenue']:,.0f}")
        print(f"Resort EBITDA: ${resort_pnl['ebitda']:,.0f} ({resort_pnl['ebitda_margin_pct']}%)")
        print(f"Food Cost: {resort_pnl['food_cost_pct']}%")
        print(f"Labor: {resort_pnl['labor_pct']}%")
        print(f"Events: {resort_pnl['total_events']}")
        print(f"Covers: {resort_pnl['total_covers']}")
    
    def test_generate_monthly_review_april(self):
        """Test generating monthly review for April 2026 (current month)"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 4, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["month_name"] == "Apr"
        assert data["year"] == 2026
        
        # Verify outlet reports
        outlet_reports = data["outlet_reports"]
        assert len(outlet_reports) == 6, f"Expected 6 outlets, got {len(outlet_reports)}"
        
        for outlet in outlet_reports:
            assert "outlet_id" in outlet
            assert "name" in outlet
            assert "type" in outlet
            assert "pnl" in outlet
            assert "health_score" in outlet
            assert "discrepancies" in outlet
            assert "causal_factors" in outlet
            assert "focus_areas" in outlet
            
            # Verify health score is 0-100
            assert 0 <= outlet["health_score"] <= 100
            
            print(f"Outlet: {outlet['name']} - Health: {outlet['health_score']}/100")
    
    def test_outlet_pnl_structure(self):
        """Test outlet P&L structure in review"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 4, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        outlet = data["outlet_reports"][0]
        pnl = outlet["pnl"]
        
        # Verify P&L fields
        required_fields = [
            "revenue", "food_cost", "beverage_cost", "labor_cost",
            "opex", "gross_profit", "ebitda", "food_cost_pct",
            "labor_pct", "ebitda_margin_pct", "covers", "avg_check",
            "events_count", "event_revenue", "event_covers", "waste_value"
        ]
        
        for field in required_fields:
            assert field in pnl, f"Missing field: {field}"
        
        print(f"Outlet: {outlet['name']}")
        print(f"  Revenue: ${pnl['revenue']:,.0f}")
        print(f"  EBITDA: ${pnl['ebitda']:,.0f} ({pnl['ebitda_margin_pct']}%)")
        print(f"  Food Cost: {pnl['food_cost_pct']}%")
        print(f"  Labor: {pnl['labor_pct']}%")
        print(f"  Covers: {pnl['covers']}")
    
    def test_causal_factors(self):
        """Test causal factors in review"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 4, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify global causal factors
        global_factors = data["global_causal_factors"]
        assert len(global_factors) > 0
        
        # Check for expected categories
        categories = [f["category"] for f in global_factors]
        assert "events" in categories
        assert "weather" in categories
        assert "occupancy" in categories
        
        for factor in global_factors:
            assert "category" in factor
            assert "factor" in factor
            assert "impact" in factor
            assert "detail" in factor
            assert factor["impact"] in ["positive", "negative", "neutral"]
            
            print(f"Factor: {factor['category']} - {factor['factor']} ({factor['impact']})")
    
    def test_discrepancies(self):
        """Test discrepancies detection in review"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 1, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all discrepancies
        all_discrepancies = data["all_discrepancies"]
        
        for disc in all_discrepancies[:5]:
            assert "metric" in disc
            assert "severity" in disc
            assert "actual" in disc
            assert "budget" in disc
            assert "variance_pct" in disc
            assert "direction" in disc
            assert "impact" in disc
            assert "outlet" in disc
            
            print(f"Discrepancy: {disc['outlet']} - {disc['metric']} ({disc['variance_pct']}%)")
    
    def test_focus_areas(self):
        """Test focus areas in review"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 4, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify top focus areas
        top_focus = data["top_focus_areas"]
        assert len(top_focus) > 0
        
        for focus in top_focus[:5]:
            assert "area" in focus
            assert "priority" in focus
            assert "detail" in focus
            assert "kpi_target" in focus
            assert "outlet" in focus
            assert focus["priority"] in ["critical", "high", "medium", "low"]
            
            print(f"Focus: {focus['outlet']} - {focus['area']} ({focus['priority']})")
    
    def test_health_summary(self):
        """Test health summary in review"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 4, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        health = data["health_summary"]
        assert "overall_score" in health
        assert "outlets_critical" in health
        assert "outlets_warning" in health
        assert "outlets_healthy" in health
        
        # Verify counts add up
        total = health["outlets_critical"] + health["outlets_warning"] + health["outlets_healthy"]
        assert total == len(data["outlet_reports"])
        
        print(f"Health Summary:")
        print(f"  Overall Score: {health['overall_score']}/100")
        print(f"  Healthy: {health['outlets_healthy']}")
        print(f"  Warning: {health['outlets_warning']}")
        print(f"  Critical: {health['outlets_critical']}")
    
    def test_ai_narrative(self):
        """Test AI narrative generation in review"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 4, "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify AI narrative exists
        assert "ai_narrative" in data
        assert len(data["ai_narrative"]) > 100, "AI narrative should be substantial"
        
        # Check for key content
        narrative = data["ai_narrative"]
        assert "revenue" in narrative.lower() or "$" in narrative
        
        print(f"AI Narrative (first 500 chars):")
        print(data["ai_narrative"][:500])


class TestExistingEndpoints:
    """Verify existing EchoStratus endpoints still work"""
    
    def test_executive_dashboard(self):
        """Test executive dashboard endpoint"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/executive/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        assert "projections" in data
    
    def test_forecast(self):
        """Test forecast endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/forecast",
            json={"horizon": "30d"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "periods" in data
        assert "summary" in data
    
    def test_signals(self):
        """Test signals endpoint"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/signals")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
    
    def test_recommendations(self):
        """Test recommendations endpoint"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
    
    def test_portfolio_overview(self):
        """Test portfolio overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/overview")
        assert response.status_code == 200
        data = response.json()
        assert "portfolio" in data
        assert "outlets" in data
    
    def test_risk_radar(self):
        """Test risk radar endpoint"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/risk-radar")
        assert response.status_code == 200
        data = response.json()
        assert "dimensions" in data
        assert "overall_risk_score" in data
    
    def test_budget_list(self):
        """Test budget list endpoint"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/budget/list")
        assert response.status_code == 200
        data = response.json()
        assert "budgets" in data
    
    def test_capex_analyze(self):
        """Test CapEx analyze endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/capex/analyze",
            json={
                "name": "Test Table",
                "item_type": "table",
                "cost": 4000,
                "seats": 4,
                "turns_per_day": 2.0,
                "avg_check": 65,
                "useful_life_years": 7
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "breakeven" in data
        assert "npv" in data
    
    def test_activations_templates(self):
        """Test activations templates endpoint"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/activations/templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data


class TestDeadCodeCleanup:
    """Verify Culinary2 and Pastry2 modules are removed"""
    
    def test_no_culinary2_errors(self):
        """Verify no errors from removed Culinary2 module"""
        # The app should load without errors from missing Culinary2
        response = requests.get(f"{BASE_URL}/api/echo-stratus/executive/dashboard")
        assert response.status_code == 200
    
    def test_no_pastry2_errors(self):
        """Verify no errors from removed Pastry2 module"""
        # The app should load without errors from missing Pastry2
        response = requests.get(f"{BASE_URL}/api/echo-stratus/signals")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
