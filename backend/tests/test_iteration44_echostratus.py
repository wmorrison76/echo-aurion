"""
Iteration 44 - EchoStratus Predictive Intelligence Dashboard Tests
===================================================================
Tests all 7 EchoStratus API endpoints:
- Executive Dashboard + Narrative
- Forecast Engine
- Scenario Simulation
- Signal Detection
- Recommendations
- Portfolio Overview
- Risk Radar
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cfo-toolkit-deploy.preview.emergentagent.com').rstrip('/')


class TestEchoStratusExecutive:
    """Executive Dashboard and Narrative endpoints"""
    
    def test_executive_dashboard(self):
        """GET /api/echo-stratus/executive/dashboard - returns KPIs, cost structure, projections"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/executive/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        # Verify KPIs structure
        assert "kpis" in data
        kpis = data["kpis"]
        assert "revenue" in kpis
        assert "ebitda" in kpis
        assert "margin" in kpis
        assert "food_cost_pct" in kpis
        assert "labor_pct" in kpis
        assert "pipeline_value" in kpis
        
        # Verify KPI values are numeric
        assert isinstance(kpis["revenue"]["value"], (int, float))
        assert isinstance(kpis["ebitda"]["value"], (int, float))
        
        # Verify cost structure
        assert "cost_structure" in data
        cost = data["cost_structure"]
        assert "food" in cost
        assert "beverage" in cost
        assert "labor" in cost
        assert "purchasing" in cost
        assert "total" in cost
        
        # Verify projections
        assert "projections" in data
        proj = data["projections"]
        assert "30d_revenue" in proj
        assert "30d_cost" in proj
        assert "30d_ebitda" in proj
        assert "30d_margin" in proj
        assert "seasonality_current" in proj
        assert "seasonality_next" in proj
        assert "seasonality_trend" in proj
        
        # Verify confidence
        assert "confidence" in data
        conf = data["confidence"]
        assert "forecast" in conf
        assert "data_sources_active" in conf
        
        # Verify pipeline
        assert "pipeline" in data
        assert "confirmed" in data["pipeline"]
        
        print(f"Executive Dashboard: Revenue=${kpis['revenue']['value']:,.0f}, EBITDA=${kpis['ebitda']['value']:,.0f}, Margin={kpis['margin']['value']}%")
    
    def test_executive_narrative(self):
        """POST /api/echo-stratus/executive/narrative - generates AI executive summary"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/executive/narrative", json={}, timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "narrative" in data
        assert isinstance(data["narrative"], str)
        assert len(data["narrative"]) > 100  # Should be substantial narrative
        
        assert "generated_at" in data
        assert "data_context" in data
        assert "ai_generated" in data
        assert "confidence" in data
        
        # Verify data context
        ctx = data["data_context"]
        assert "revenue" in ctx
        assert "ebitda" in ctx
        assert "margin_pct" in ctx
        
        print(f"Executive Narrative generated: {len(data['narrative'])} chars, AI={data['ai_generated']}")


class TestEchoStratusForecast:
    """Forecast Engine endpoints"""
    
    def test_forecast_domains(self):
        """GET /api/echo-stratus/forecast/domains - returns available forecast domains and horizons"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/forecast/domains")
        assert response.status_code == 200
        
        data = response.json()
        assert "domains" in data
        assert "horizons" in data
        
        # Verify domains
        domains = data["domains"]
        assert len(domains) >= 5
        domain_ids = [d["id"] for d in domains]
        assert "revenue" in domain_ids
        assert "labor" in domain_ids
        assert "food_cost" in domain_ids
        
        # Verify horizons
        horizons = data["horizons"]
        assert len(horizons) == 5
        horizon_ids = [h["id"] for h in horizons]
        assert "7d" in horizon_ids
        assert "30d" in horizon_ids
        assert "90d" in horizon_ids
        assert "12m" in horizon_ids
        assert "36m" in horizon_ids
        
        print(f"Forecast Domains: {len(domains)} domains, {len(horizons)} horizons")
    
    def test_forecast_30d(self):
        """POST /api/echo-stratus/forecast - generates 30-day forecast"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/forecast", json={"horizon": "30d"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["horizon"] == "30d"
        assert data["horizon_days"] == 30
        
        # Verify periods
        assert "periods" in data
        periods = data["periods"]
        assert len(periods) == 30  # Daily for 30d
        
        # Verify period structure
        p = periods[0]
        assert "date" in p
        assert "revenue" in p
        assert "food_cost" in p
        assert "labor_cost" in p
        assert "total_cost" in p
        assert "net_profit" in p
        assert "margin_pct" in p
        assert "confidence" in p
        assert "confidence_band_low" in p
        assert "confidence_band_high" in p
        
        # Verify summary
        assert "summary" in data
        s = data["summary"]
        assert "total_forecast_revenue" in s
        assert "total_forecast_profit" in s
        assert "avg_margin_pct" in s
        assert "avg_confidence" in s
        assert "total_covers" in s
        
        print(f"30d Forecast: {len(periods)} periods, Revenue=${s['total_forecast_revenue']:,.0f}, Confidence={s['avg_confidence']*100:.0f}%")
    
    def test_forecast_7d(self):
        """POST /api/echo-stratus/forecast - generates 7-day forecast"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/forecast", json={"horizon": "7d"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["horizon"] == "7d"
        assert data["horizon_days"] == 7
        assert len(data["periods"]) == 7
        
        print(f"7d Forecast: {len(data['periods'])} periods")
    
    def test_forecast_90d(self):
        """POST /api/echo-stratus/forecast - generates 90-day forecast (weekly periods)"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/forecast", json={"horizon": "90d"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["horizon"] == "90d"
        assert data["horizon_days"] == 90
        # 90 days / 7 day step = ~13 periods
        assert len(data["periods"]) >= 12
        
        print(f"90d Forecast: {len(data['periods'])} periods")


class TestEchoStratusScenarios:
    """Scenario Simulation endpoints"""
    
    def test_scenario_templates(self):
        """GET /api/echo-stratus/scenarios/templates - returns pre-built scenario templates"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/scenarios/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        assert len(templates) == 5
        
        # Verify template structure
        types = [t["type"] for t in templates]
        assert "occupancy_drop" in types
        assert "price_increase" in types
        assert "event_cancellation" in types
        assert "labor_cap" in types
        assert "commissary_expansion" in types
        
        # Verify template fields
        t = templates[0]
        assert "name" in t
        assert "description" in t
        assert "default_params" in t
        assert "risk_category" in t
        
        print(f"Scenario Templates: {len(templates)} templates")
    
    def test_scenario_simulate_occupancy_drop(self):
        """POST /api/echo-stratus/scenarios/simulate - simulates occupancy drop scenario"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/scenarios/simulate", json={
            "scenario_type": "occupancy_drop",
            "name": "12% Occupancy Decline",
            "parameters": {"drop_percent": 12}
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["scenario_type"] == "occupancy_drop"
        assert "baseline" in data
        assert "impact" in data
        assert "projected" in data
        assert "action_plan" in data
        assert "confidence" in data
        
        # Verify impact structure
        impact = data["impact"]
        assert "revenue_change" in impact
        assert "cost_change" in impact
        assert "labor_change" in impact
        assert "ebitda_change" in impact
        assert "ebitda_change_pct" in impact
        
        # Revenue should decrease
        assert impact["revenue_change"] < 0
        
        # Verify action plan
        plan = data["action_plan"]
        assert "staffing" in plan
        assert "purchasing" in plan
        assert "production" in plan
        
        print(f"Occupancy Drop Scenario: EBITDA Impact={impact['ebitda_change_pct']}%")
    
    def test_scenario_simulate_price_increase(self):
        """POST /api/echo-stratus/scenarios/simulate - simulates ingredient price surge"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/scenarios/simulate", json={
            "scenario_type": "price_increase",
            "name": "Beef Price Surge",
            "parameters": {"item": "beef", "increase_percent": 9}
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["scenario_type"] == "price_increase"
        
        # Food cost should increase
        assert data["impact"]["food_cost_change"] > 0
        
        print(f"Price Increase Scenario: Food Cost Change=${data['impact']['food_cost_change']:,.0f}")


class TestEchoStratusSignals:
    """Signal Detection endpoint"""
    
    def test_signals(self):
        """GET /api/echo-stratus/signals - detects anomalies and risk signals"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/signals")
        assert response.status_code == 200
        
        data = response.json()
        assert "signals" in data
        assert "total" in data
        assert "by_severity" in data
        assert "by_category" in data
        assert "generated_at" in data
        
        # Verify severity breakdown
        sev = data["by_severity"]
        assert "critical" in sev
        assert "high" in sev
        assert "medium" in sev
        assert "low" in sev
        assert "info" in sev
        
        # If signals exist, verify structure
        if data["signals"]:
            s = data["signals"][0]
            assert "id" in s
            assert "type" in s
            assert "severity" in s
            assert "category" in s
            assert "title" in s
            assert "description" in s
            assert "action" in s
            assert "confidence" in s
        
        print(f"Signals: {data['total']} total, Critical={sev['critical']}, High={sev['high']}")


class TestEchoStratusRecommendations:
    """Recommendations endpoint"""
    
    def test_recommendations(self):
        """GET /api/echo-stratus/recommendations - generates actionable recommendations"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/recommendations")
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendations" in data
        assert "total" in data
        assert "total_estimated_impact" in data
        assert "by_category" in data
        assert "avg_confidence" in data
        
        # Verify recommendations exist
        recs = data["recommendations"]
        assert len(recs) >= 1
        
        # Verify recommendation structure
        r = recs[0]
        assert "id" in r
        assert "category" in r
        assert "title" in r
        assert "description" in r
        assert "action" in r
        assert "estimated_impact" in r
        assert "impact_type" in r
        assert "confidence" in r
        assert "risk_level" in r
        assert "time_horizon" in r
        assert "priority" in r
        assert "roi_estimate_pct" in r
        
        print(f"Recommendations: {data['total']} total, Est. Impact=${data['total_estimated_impact']:,.0f}")


class TestEchoStratusPortfolio:
    """Portfolio Intelligence endpoints"""
    
    def test_portfolio_overview(self):
        """GET /api/echo-stratus/portfolio/overview - returns portfolio-wide metrics"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "portfolio" in data
        assert "outlets" in data
        assert "benchmarks" in data
        assert "optimization_opportunities" in data
        
        # Verify portfolio metrics
        p = data["portfolio"]
        assert "total_revenue" in p
        assert "total_cost" in p
        assert "ebitda" in p
        assert "portfolio_margin" in p
        assert "total_outlets" in p
        assert "total_events" in p
        
        # Verify outlets
        outlets = data["outlets"]
        assert len(outlets) >= 1
        o = outlets[0]
        assert "outlet_id" in o
        assert "name" in o
        assert "type" in o
        assert "revenue" in o
        assert "margin_pct" in o
        assert "utilization_pct" in o
        
        # Verify benchmarks
        b = data["benchmarks"]
        assert "avg_outlet_margin" in b
        assert "best_performer" in b
        assert "worst_performer" in b
        
        # Verify optimization opportunities
        opt = data["optimization_opportunities"]
        assert "commissary" in opt
        assert "labor_balancing" in opt
        assert "central_purchasing" in opt
        
        print(f"Portfolio: {p['total_outlets']} outlets, Revenue=${p['total_revenue']:,.0f}, EBITDA=${p['ebitda']:,.0f}")
    
    def test_risk_radar(self):
        """GET /api/echo-stratus/portfolio/risk-radar - returns risk exposure assessment"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/risk-radar")
        assert response.status_code == 200
        
        data = response.json()
        assert "overall_risk_score" in data
        assert "overall_severity" in data
        assert "dimensions" in data
        assert "total_dimensions" in data
        
        # Verify risk dimensions
        dims = data["dimensions"]
        assert len(dims) == 6
        
        dim_names = [d["dimension"] for d in dims]
        assert "supplier_dependency" in dim_names
        assert "labor_shortage" in dim_names
        assert "menu_volatility" in dim_names
        assert "pipeline_fragility" in dim_names
        assert "pricing_instability" in dim_names
        assert "weather_exposure" in dim_names
        
        # Verify dimension structure
        d = dims[0]
        assert "label" in d
        assert "score" in d
        assert "severity" in d
        assert "detail" in d
        
        print(f"Risk Radar: Overall Score={data['overall_risk_score']}, Severity={data['overall_severity']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
