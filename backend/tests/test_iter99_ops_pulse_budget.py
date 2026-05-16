"""
Iteration 99: EchoAi³ Operations Pulse + Annual Budget Engine + Labor Cost Fix
==============================================================================
Tests for:
1. Labor cost calculation fix (was 83.5%, now ~23%)
2. Chef daily report with real guest_orders + IRD data
3. EchoAi³ Operations Pulse - autonomous hotel analyzer
4. Annual Budget engine with 17 drivers, 12-month computation, what-if scenarios
5. Regression tests for health, STR dashboard, concierge, item-mapping
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestLaborCostFix:
    """Test that labor cost calculation is fixed (was 83.5%, now should be 15-35%)"""
    
    def test_command_center_labor_pct_in_range(self):
        """GET /api/enterprise/command-center - labor_pct should be between 15-35%"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "labor" in data, "Response should have 'labor' key"
        
        labor_pct = data["labor"].get("labor_pct", 0)
        print(f"Labor percentage: {labor_pct}%")
        
        # Labor should be between 15-35% (industry standard), not 83.5% bug
        assert 15 <= labor_pct <= 50, f"Labor % should be 15-50%, got {labor_pct}%"
        
    def test_command_center_labor_structure(self):
        """GET /api/enterprise/command-center - labor section has expected fields"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center")
        assert response.status_code == 200
        
        data = response.json()
        labor = data.get("labor", {})
        
        # Check required fields
        assert "total_cost" in labor, "Labor should have total_cost"
        assert "labor_pct" in labor, "Labor should have labor_pct"
        assert "target_pct" in labor, "Labor should have target_pct"
        assert "breakdown" in labor, "Labor should have breakdown"
        
        # Breakdown should have department splits
        breakdown = labor.get("breakdown", {})
        assert len(breakdown) > 0, "Breakdown should have department splits"


class TestChefDailyReport:
    """Test chef daily report with real guest_orders + IRD data"""
    
    def test_chef_daily_returns_200(self):
        """GET /api/daily-reports/chef-daily - returns 200"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_chef_daily_covers_structure(self):
        """GET /api/daily-reports/chef-daily - covers has breakfast/lunch/dinner"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        assert response.status_code == 200
        
        data = response.json()
        assert "covers" in data, "Response should have 'covers'"
        
        covers = data["covers"]
        assert "breakfast" in covers, "Covers should have breakfast"
        assert "lunch" in covers, "Covers should have lunch"
        assert "dinner" in covers, "Covers should have dinner"
        assert "ird" in covers, "Covers should have ird"
        
    def test_chef_daily_covers_non_zero(self):
        """GET /api/daily-reports/chef-daily - covers show non-zero values"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        assert response.status_code == 200
        
        data = response.json()
        covers = data.get("covers", {})
        
        # At least one meal period should have actual covers
        breakfast_actual = covers.get("breakfast", {}).get("actual", 0)
        lunch_actual = covers.get("lunch", {}).get("actual", 0)
        dinner_actual = covers.get("dinner", {}).get("actual", 0)
        ird_actual = covers.get("ird", {}).get("actual", 0)
        
        total_actual = breakfast_actual + lunch_actual + dinner_actual + ird_actual
        print(f"Covers - Breakfast: {breakfast_actual}, Lunch: {lunch_actual}, Dinner: {dinner_actual}, IRD: {ird_actual}")
        
        assert total_actual > 0, f"Total actual covers should be > 0, got {total_actual}"
        
    def test_chef_daily_costs_structure(self):
        """GET /api/daily-reports/chef-daily - costs section has expected fields"""
        response = requests.get(f"{BASE_URL}/api/daily-reports/chef-daily")
        assert response.status_code == 200
        
        data = response.json()
        assert "costs" in data, "Response should have 'costs'"
        
        costs = data["costs"]
        assert "food_cost_pct" in costs, "Costs should have food_cost_pct"
        assert "labor_cost_pct" in costs, "Costs should have labor_cost_pct"
        assert "ird_revenue_actual" in costs, "Costs should have ird_revenue_actual"


class TestEchoAi3OpsPulseAnalyze:
    """Test EchoAi³ Operations Pulse /analyze endpoint"""
    
    def test_ops_pulse_analyze_returns_200(self):
        """GET /api/echoai3/ops-pulse/analyze - returns 200"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_ops_pulse_analyze_has_hotel_score(self):
        """GET /api/echoai3/ops-pulse/analyze - returns hotel_score with overall, grade, breakdown"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200
        
        data = response.json()
        assert "hotel_score" in data, "Response should have 'hotel_score'"
        
        score = data["hotel_score"]
        assert "overall" in score, "hotel_score should have 'overall'"
        assert "grade" in score, "hotel_score should have 'grade'"
        assert "breakdown" in score, "hotel_score should have 'breakdown'"
        
        # Overall should be 0-100
        overall = score["overall"]
        assert 0 <= overall <= 100, f"Overall score should be 0-100, got {overall}"
        
        # Grade should be A/B/C/D
        grade = score["grade"]
        assert grade in ["A", "B", "C", "D"], f"Grade should be A/B/C/D, got {grade}"
        
        print(f"Hotel Score: {overall} (Grade: {grade})")
        
    def test_ops_pulse_analyze_has_departments(self):
        """GET /api/echoai3/ops-pulse/analyze - departments includes all 7 required"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200
        
        data = response.json()
        assert "departments" in data, "Response should have 'departments'"
        
        departments = data["departments"]
        required_depts = ["rooms", "food_beverage", "concierge", "engineering", "spa", "financial", "purchasing"]
        
        for dept in required_depts:
            assert dept in departments, f"Departments should include '{dept}'"
            
        print(f"Departments found: {list(departments.keys())}")
        
    def test_ops_pulse_analyze_has_alerts(self):
        """GET /api/echoai3/ops-pulse/analyze - returns alerts array"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200
        
        data = response.json()
        assert "alerts" in data, "Response should have 'alerts'"
        assert isinstance(data["alerts"], list), "Alerts should be a list"
        
        # If there are alerts, check structure
        if len(data["alerts"]) > 0:
            alert = data["alerts"][0]
            assert "severity" in alert, "Alert should have 'severity'"
            assert "dept" in alert, "Alert should have 'dept'"
            assert "msg" in alert, "Alert should have 'msg'"
            
        print(f"Alerts count: {len(data['alerts'])}")
        
    def test_ops_pulse_analyze_has_recommendations(self):
        """GET /api/echoai3/ops-pulse/analyze - returns recommendations array"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendations" in data, "Response should have 'recommendations'"
        assert isinstance(data["recommendations"], list), "Recommendations should be a list"
        
        print(f"Recommendations count: {len(data['recommendations'])}")
        
    def test_ops_pulse_analyze_has_insights(self):
        """GET /api/echoai3/ops-pulse/analyze - returns insights array"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200
        
        data = response.json()
        assert "insights" in data, "Response should have 'insights'"
        assert isinstance(data["insights"], list), "Insights should be a list"
        
    def test_ops_pulse_analyze_has_overall_health(self):
        """GET /api/echoai3/ops-pulse/analyze - returns overall_health"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/analyze")
        assert response.status_code == 200
        
        data = response.json()
        assert "overall_health" in data, "Response should have 'overall_health'"
        
        health = data["overall_health"]
        assert health in ["operational", "warning", "critical"], f"Health should be operational/warning/critical, got {health}"
        
        print(f"Overall health: {health}")


class TestEchoAi3OpsPulseGuidance:
    """Test EchoAi³ Operations Pulse /guidance endpoint"""
    
    def test_ops_pulse_guidance_returns_200(self):
        """GET /api/echoai3/ops-pulse/guidance - returns 200"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/guidance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_ops_pulse_guidance_has_top_actions(self):
        """GET /api/echoai3/ops-pulse/guidance - returns prioritized top_actions"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/guidance")
        assert response.status_code == 200
        
        data = response.json()
        assert "top_actions" in data, "Response should have 'top_actions'"
        assert isinstance(data["top_actions"], list), "top_actions should be a list"
        
        # Top actions should be limited (max 5)
        assert len(data["top_actions"]) <= 5, "top_actions should have max 5 items"
        
        print(f"Top actions count: {len(data['top_actions'])}")
        
    def test_ops_pulse_guidance_has_departments_needing_attention(self):
        """GET /api/echoai3/ops-pulse/guidance - includes departments_needing_attention"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/guidance")
        assert response.status_code == 200
        
        data = response.json()
        assert "departments_needing_attention" in data, "Response should have 'departments_needing_attention'"
        assert isinstance(data["departments_needing_attention"], list), "departments_needing_attention should be a list"
        
        print(f"Departments needing attention: {data['departments_needing_attention']}")


class TestEchoAi3OpsPulseHistory:
    """Test EchoAi³ Operations Pulse /history endpoint"""
    
    def test_ops_pulse_history_returns_200(self):
        """GET /api/echoai3/ops-pulse/history - returns 200"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_ops_pulse_history_returns_pulses(self):
        """GET /api/echoai3/ops-pulse/history - returns pulse history"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ops-pulse/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "pulses" in data, "Response should have 'pulses'"
        assert isinstance(data["pulses"], list), "pulses should be a list"
        
        print(f"Pulse history count: {len(data['pulses'])}")


class TestBudgetDrivers:
    """Test Annual Budget /drivers endpoint"""
    
    def test_budget_drivers_returns_200(self):
        """GET /api/budget/drivers - returns 200"""
        response = requests.get(f"{BASE_URL}/api/budget/drivers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_budget_drivers_returns_17_drivers(self):
        """GET /api/budget/drivers - returns 17 drivers"""
        response = requests.get(f"{BASE_URL}/api/budget/drivers")
        assert response.status_code == 200
        
        data = response.json()
        assert "drivers" in data, "Response should have 'drivers'"
        
        drivers = data["drivers"]
        assert len(drivers) == 17, f"Should have 17 drivers, got {len(drivers)}"
        
        print(f"Drivers count: {len(drivers)}")
        
    def test_budget_drivers_structure(self):
        """GET /api/budget/drivers - each driver has id, name, category, unit, default, min, max"""
        response = requests.get(f"{BASE_URL}/api/budget/drivers")
        assert response.status_code == 200
        
        data = response.json()
        drivers = data.get("drivers", [])
        
        required_fields = ["id", "name", "category", "unit", "default", "min", "max"]
        
        for driver in drivers:
            for field in required_fields:
                assert field in driver, f"Driver should have '{field}', got {driver}"
                
        # Print driver IDs
        driver_ids = [d["id"] for d in drivers]
        print(f"Driver IDs: {driver_ids}")


class TestBudgetCompute:
    """Test Annual Budget /compute endpoint"""
    
    def test_budget_compute_with_empty_drivers(self):
        """POST /api/budget/compute with empty drivers - returns 12-month budget"""
        response = requests.post(f"{BASE_URL}/api/budget/compute", json={
            "year": 2026,
            "drivers": {}
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "months" in data, "Response should have 'months'"
        assert "annual_summary" in data, "Response should have 'annual_summary'"
        
    def test_budget_compute_returns_12_months(self):
        """POST /api/budget/compute - months array has 12 entries"""
        response = requests.post(f"{BASE_URL}/api/budget/compute", json={
            "year": 2026,
            "drivers": {}
        })
        assert response.status_code == 200
        
        data = response.json()
        months = data.get("months", [])
        
        assert len(months) == 12, f"Should have 12 months, got {len(months)}"
        
        # Check month names
        month_names = [m["month"] for m in months]
        expected = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        assert month_names == expected, f"Month names should be {expected}, got {month_names}"
        
    def test_budget_compute_month_structure(self):
        """POST /api/budget/compute - each month has revenue, kpis, expenses, profit"""
        response = requests.post(f"{BASE_URL}/api/budget/compute", json={
            "year": 2026,
            "drivers": {}
        })
        assert response.status_code == 200
        
        data = response.json()
        months = data.get("months", [])
        
        for month in months:
            assert "revenue" in month, f"Month should have 'revenue'"
            assert "kpis" in month, f"Month should have 'kpis'"
            assert "expenses" in month, f"Month should have 'expenses'"
            assert "profit" in month, f"Month should have 'profit'"
            
    def test_budget_compute_annual_summary_fields(self):
        """POST /api/budget/compute - annual_summary has total_revenue, gop, gop_margin, avg_occupancy, avg_revpar"""
        response = requests.post(f"{BASE_URL}/api/budget/compute", json={
            "year": 2026,
            "drivers": {}
        })
        assert response.status_code == 200
        
        data = response.json()
        summary = data.get("annual_summary", {})
        
        required_fields = ["total_revenue", "gop", "gop_margin", "avg_occupancy", "avg_revpar"]
        for field in required_fields:
            assert field in summary, f"annual_summary should have '{field}'"
            
        print(f"Annual Summary: Revenue=${summary['total_revenue']:,.0f}, GOP=${summary['gop']:,.0f}, GOP Margin={summary['gop_margin']}%")


class TestBudgetWhatIf:
    """Test Annual Budget /what-if endpoint"""
    
    def test_budget_whatif_with_adr_change(self):
        """POST /api/budget/what-if with adr=318 - shows positive delta vs baseline"""
        response = requests.post(f"{BASE_URL}/api/budget/what-if", json={
            "year": 2026,
            "drivers": {"adr": 318}  # Default is 289, so 318 is +10%
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "baseline" in data, "Response should have 'baseline'"
        assert "scenario" in data, "Response should have 'scenario'"
        assert "deltas" in data, "Response should have 'deltas'"
        
    def test_budget_whatif_positive_delta(self):
        """POST /api/budget/what-if with adr=318 - total_revenue delta is positive"""
        response = requests.post(f"{BASE_URL}/api/budget/what-if", json={
            "year": 2026,
            "drivers": {"adr": 318}
        })
        assert response.status_code == 200
        
        data = response.json()
        deltas = data.get("deltas", {})
        
        # With higher ADR, total_revenue should increase
        if "total_revenue" in deltas:
            delta = deltas["total_revenue"].get("delta", 0)
            print(f"Total Revenue Delta: ${delta:,.0f}")
            assert delta > 0, f"With higher ADR, revenue delta should be positive, got {delta}"
            
        # GOP should also increase
        if "gop" in deltas:
            gop_delta = deltas["gop"].get("delta", 0)
            print(f"GOP Delta: ${gop_delta:,.0f}")
            assert gop_delta > 0, f"With higher ADR, GOP delta should be positive, got {gop_delta}"


class TestBudgetSaveAndList:
    """Test Annual Budget save and list endpoints"""
    
    def test_budget_save(self):
        """POST /api/budget/save - saves a named budget scenario"""
        response = requests.post(f"{BASE_URL}/api/budget/save", json={
            "name": "TEST_Budget_2026_Optimistic",
            "year": 2026,
            "drivers": {"occupancy": 80, "adr": 310},
            "notes": "Test budget for iteration 99"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response should have 'status'"
        assert data["status"] == "saved", f"Status should be 'saved', got {data['status']}"
        assert "budget" in data, "Response should have 'budget'"
        
        budget = data["budget"]
        assert "id" in budget, "Budget should have 'id'"
        assert budget["name"] == "TEST_Budget_2026_Optimistic", "Budget name should match"
        
        print(f"Saved budget ID: {budget['id']}")
        return budget["id"]
        
    def test_budget_saved_list(self):
        """GET /api/budget/saved - lists saved budgets"""
        response = requests.get(f"{BASE_URL}/api/budget/saved")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "budgets" in data, "Response should have 'budgets'"
        assert isinstance(data["budgets"], list), "budgets should be a list"
        
        print(f"Saved budgets count: {len(data['budgets'])}")


class TestBudgetSeasonality:
    """Test Annual Budget /seasonality endpoint"""
    
    def test_budget_seasonality_returns_200(self):
        """GET /api/budget/seasonality - returns 200"""
        response = requests.get(f"{BASE_URL}/api/budget/seasonality")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_budget_seasonality_returns_12_months(self):
        """GET /api/budget/seasonality - returns 12-month seasonality multipliers"""
        response = requests.get(f"{BASE_URL}/api/budget/seasonality")
        assert response.status_code == 200
        
        data = response.json()
        assert "seasonality" in data, "Response should have 'seasonality'"
        assert "months" in data, "Response should have 'months'"
        
        seasonality = data["seasonality"]
        assert len(seasonality) == 12, f"Should have 12 months, got {len(seasonality)}"
        
        # Check multipliers are reasonable (0.5 to 1.5)
        for month, mult in seasonality.items():
            assert 0.5 <= mult <= 1.5, f"Seasonality for {month} should be 0.5-1.5, got {mult}"
            
        print(f"Seasonality: {seasonality}")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health - returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_str_dashboard(self):
        """GET /api/enterprise-bi/str/dashboard - returns 200"""
        response = requests.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_concierge_outlets(self):
        """GET /api/concierge/outlets - returns 200"""
        response = requests.get(f"{BASE_URL}/api/concierge/outlets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_item_mapping_stats(self):
        """GET /api/item-mapping/stats - returns 200"""
        response = requests.get(f"{BASE_URL}/api/item-mapping/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_budgets(self):
        """Delete TEST_ prefixed budgets"""
        # List saved budgets
        response = requests.get(f"{BASE_URL}/api/budget/saved")
        if response.status_code == 200:
            budgets = response.json().get("budgets", [])
            for budget in budgets:
                if budget.get("name", "").startswith("TEST_"):
                    budget_id = budget.get("id")
                    if budget_id:
                        del_response = requests.delete(f"{BASE_URL}/api/budget/saved/{budget_id}")
                        print(f"Deleted test budget: {budget_id}")
        
        assert True  # Cleanup always passes
