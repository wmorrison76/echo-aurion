"""
Iteration 105: EchoAi3 Performance Intelligence & ROI Analytics Tests
=====================================================================
Tests for:
- Break-even analysis endpoint
- Department efficiency scoring (95% target)
- Timeline data for horizontal scrolling view
- BEO search functionality
- CSV export endpoint
- Similar BEO finder (404 for nonexistent)
- ROI per-BEO with frequency-weighted task breakdown
- Annual ROI calculation (corrected labor hours)
- Daily savings with chef hours
- Live operations savings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestHealthRegression:
    """Basic health check to ensure backend is running"""
    
    def test_health_endpoint(self):
        """GET /api/health - returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASSED: Health endpoint returns healthy")


class TestBreakEvenAnalysis:
    """Break-even analysis endpoint tests"""
    
    def test_break_even_default_covers(self):
        """GET /api/echoai3/performance/break-even - returns break-even data with default covers"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/break-even")
        assert response.status_code == 200
        data = response.json()
        
        # Validate required fields
        assert "break_even_covers" in data
        assert "scenarios" in data
        assert "revenue_per_person" in data
        assert "contribution_per_person" in data
        assert "fixed_costs" in data
        assert "recommendation" in data
        
        # Validate data types
        assert isinstance(data["break_even_covers"], int)
        assert isinstance(data["scenarios"], list)
        assert len(data["scenarios"]) >= 1
        assert data["revenue_per_person"] > 0
        
        print(f"PASSED: Break-even covers = {data['break_even_covers']}, revenue/person = ${data['revenue_per_person']}")
    
    def test_break_even_custom_covers(self):
        """GET /api/echoai3/performance/break-even?covers=150 - returns scenarios for custom covers"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/break-even?covers=150")
        assert response.status_code == 200
        data = response.json()
        
        assert data["current_covers"] == 150
        assert len(data["scenarios"]) >= 2
        
        # Validate scenario structure
        for scenario in data["scenarios"]:
            assert "covers" in scenario
            assert "revenue" in scenario
            assert "profit" in scenario
            assert "margin_pct" in scenario
            assert "profitable" in scenario
        
        print(f"PASSED: Break-even with 150 covers, {len(data['scenarios'])} scenarios returned")


class TestDepartmentEfficiency:
    """Department efficiency scoring tests (95% target)"""
    
    def test_department_efficiency_returns_all_departments(self):
        """GET /api/echoai3/performance/department-efficiency - returns 6 departments with status"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/department-efficiency")
        assert response.status_code == 200
        data = response.json()
        
        # Validate overall efficiency
        assert "overall_efficiency" in data
        assert "target" in data
        assert data["target"] == 95
        assert "gap" in data
        assert "departments" in data
        
        # Validate 6 departments exist
        expected_depts = ["culinary", "banquet_foh", "stewarding", "engineering", "housekeeping", "beverage"]
        for dept in expected_depts:
            assert dept in data["departments"], f"Missing department: {dept}"
            dept_data = data["departments"][dept]
            assert "efficiency" in dept_data
            assert "target" in dept_data
            assert "status" in dept_data
            assert "recommendation" in dept_data
            assert dept_data["status"] in ["on_target", "needs_improvement", "critical"]
        
        print(f"PASSED: Overall efficiency = {data['overall_efficiency']}%, 6 departments returned")


class TestTimelineData:
    """Timeline data for horizontal scrolling view"""
    
    def test_timeline_returns_array_with_required_fields(self):
        """GET /api/echoai3/performance/timeline - returns timeline array with dates, covers, labor_hours"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/timeline")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "timeline" in data
        assert "department_lines" in data
        assert "period" in data
        assert "total_events" in data
        assert "total_covers" in data
        assert "total_revenue" in data
        
        # Validate timeline points if any exist
        if len(data["timeline"]) > 0:
            point = data["timeline"][0]
            assert "date" in point
            assert "total_covers" in point
            assert "labor_hours" in point
            assert "beo_count" in point
            assert "staff_needed" in point
        
        # Validate department_lines structure
        assert isinstance(data["department_lines"], dict)
        expected_depts = ["culinary", "banquet_foh", "stewarding", "engineering", "housekeeping", "beverage"]
        for dept in expected_depts:
            assert dept in data["department_lines"], f"Missing department line: {dept}"
        
        print(f"PASSED: Timeline has {len(data['timeline'])} points, {data['total_events']} total events")


class TestBEOSearch:
    """BEO search functionality tests"""
    
    def test_search_by_company(self):
        """GET /api/echoai3/performance/search?company=test - returns BEO search results"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/search?company=test")
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert "total" in data
        assert "query" in data
        assert isinstance(data["results"], list)
        
        print(f"PASSED: Search returned {data['total']} results for 'test'")
    
    def test_search_by_beo_number(self):
        """GET /api/echoai3/performance/search?beo_number=1001 - returns BEO by number"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/search?beo_number=1001")
        assert response.status_code == 200
        data = response.json()
        
        assert "results" in data
        assert "total" in data
        
        print(f"PASSED: Search by BEO number returned {data['total']} results")


class TestExportData:
    """CSV export endpoint tests"""
    
    def test_export_returns_events_and_department_analysis(self):
        """GET /api/echoai3/performance/export?date_from=2026-01-01&date_to=2026-12-31 - returns export data"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/export?date_from=2026-01-01&date_to=2026-12-31")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "period" in data
        assert "summary" in data
        assert "events" in data
        assert "department_analysis" in data
        
        # Validate period
        assert data["period"]["from"] == "2026-01-01"
        assert data["period"]["to"] == "2026-12-31"
        
        # Validate summary fields
        summary = data["summary"]
        assert "total_events" in summary
        assert "total_covers" in summary
        assert "total_revenue" in summary
        assert "avg_covers_per_event" in summary
        
        # Validate department_analysis structure
        assert isinstance(data["department_analysis"], dict)
        
        print(f"PASSED: Export returned {summary['total_events']} events, {len(data['department_analysis'])} departments")


class TestSimilarBEOFinder:
    """Similar BEO finder tests"""
    
    def test_similar_beo_returns_404_for_nonexistent(self):
        """GET /api/echoai3/performance/similar/test-id - returns 404 for nonexistent BEO"""
        response = requests.get(f"{BASE_URL}/api/echoai3/performance/similar/nonexistent-beo-id-12345")
        assert response.status_code == 404
        
        print("PASSED: Similar BEO returns 404 for nonexistent ID")


class TestROIPerBEO:
    """ROI per-BEO with frequency-weighted task breakdown"""
    
    def test_roi_per_beo_frequency_weighted(self):
        """GET /api/echoai3/roi/per-beo - returns frequency-weighted task breakdown"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/per-beo")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "per_beo" in data
        assert "breakdown" in data
        
        per_beo = data["per_beo"]
        assert "total_manual_minutes" in per_beo
        assert "total_echo_minutes" in per_beo
        assert "minutes_saved" in per_beo
        assert "hours_saved" in per_beo
        assert "efficiency_gain_pct" in per_beo
        assert "cost_saved" in per_beo
        
        # KEY VALIDATION: total_manual_minutes should be ~307, NOT 675 (old inflated value)
        # The frequency multipliers reduce the effective manual time
        total_manual = per_beo["total_manual_minutes"]
        assert total_manual < 400, f"total_manual_minutes should be ~307 (frequency-weighted), got {total_manual}"
        assert total_manual > 200, f"total_manual_minutes seems too low, got {total_manual}"
        
        # Validate breakdown has frequency field
        assert len(data["breakdown"]) > 0
        for task in data["breakdown"]:
            assert "task" in task
            assert "frequency" in task
            assert "manual_mins" in task
            assert "echo_mins" in task
            assert "saved_mins" in task
            assert "cost_saved" in task
            # Frequency should be between 0 and 1
            assert 0 < task["frequency"] <= 1, f"Invalid frequency for {task['task']}: {task['frequency']}"
        
        print(f"PASSED: ROI per-BEO total_manual_minutes = {total_manual} (frequency-weighted, expected ~307)")


class TestAnnualROI:
    """Annual ROI calculation tests (corrected labor hours)"""
    
    def test_annual_roi_at_50_events_per_day(self):
        """GET /api/echoai3/roi/annual?events_per_day=50 - returns annual_hours_saved < 100000"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/annual?events_per_day=50")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "events_per_day" in data
        assert "operating_days" in data
        assert "annual_events" in data
        assert "annual_hours_saved" in data
        assert "annual_cost_saved" in data
        assert "annual_fte_saved" in data
        assert "annual_chef_hours_saved" in data
        
        # Validate parameters
        assert data["events_per_day"] == 50
        
        # KEY VALIDATION: annual_hours_saved should be < 100000 (was previously ~192000)
        # With frequency weighting, at 50 events/day x 350 days = 17500 events
        # ~5 hours saved per BEO = ~87,500 hours (not 192,000)
        annual_hours = data["annual_hours_saved"]
        assert annual_hours < 100000, f"annual_hours_saved should be < 100000 (corrected), got {annual_hours}"
        assert annual_hours > 50000, f"annual_hours_saved seems too low, got {annual_hours}"
        
        print(f"PASSED: Annual hours saved at 50 events/day = {annual_hours} (expected ~87,360, was ~192,000 before fix)")
    
    def test_annual_roi_default_events(self):
        """GET /api/echoai3/roi/annual - returns annual savings with default 12 events/day"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/annual")
        assert response.status_code == 200
        data = response.json()
        
        assert data["events_per_day"] == 12
        assert data["operating_days"] == 350
        assert data["annual_events"] == 12 * 350
        
        print(f"PASSED: Annual ROI with default 12 events/day, {data['annual_hours_saved']} hours saved")


class TestDailySavings:
    """Daily savings with chef hours tests"""
    
    def test_daily_savings_includes_chef_hours(self):
        """GET /api/echoai3/roi/daily - returns daily savings with chef_hours_saved"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/daily")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "events_per_day" in data
        assert "daily_manual_hours" in data
        assert "daily_echo_hours" in data
        assert "daily_hours_saved" in data
        assert "daily_cost_saved" in data
        assert "fte_equivalent_saved" in data
        assert "chef_hours_saved" in data
        
        # Validate chef_hours_saved is present and reasonable
        assert data["chef_hours_saved"] >= 0
        
        print(f"PASSED: Daily savings = {data['daily_hours_saved']}h, chef hours = {data['chef_hours_saved']}h")


class TestLiveSavings:
    """Live operations savings tests"""
    
    def test_live_savings_returns_actual_operations(self):
        """GET /api/echoai3/roi/live - returns actual operations savings"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/live")
        assert response.status_code == 200
        data = response.json()
        
        # Validate structure
        assert "operations_performed" in data
        assert "total_time_saved_minutes" in data
        assert "total_time_saved_hours" in data
        assert "equivalent_work_days" in data
        assert "estimated_cost_saved" in data
        
        # Validate operations_performed structure
        ops = data["operations_performed"]
        assert "beos_created" in ops
        assert "recipes_costed" in ops
        assert "schedules_generated" in ops
        
        print(f"PASSED: Live savings = {data['total_time_saved_hours']}h from {ops['beos_created']} BEOs")


class TestROICalculationAccuracy:
    """Verify ROI calculation accuracy with frequency multipliers"""
    
    def test_frequency_multipliers_reduce_totals(self):
        """Verify that frequency multipliers properly reduce manual time totals"""
        response = requests.get(f"{BASE_URL}/api/echoai3/roi/per-beo")
        assert response.status_code == 200
        data = response.json()
        
        # Calculate raw total (without frequency) vs weighted total
        raw_total = sum(task["raw_manual_mins"] for task in data["breakdown"])
        weighted_total = data["per_beo"]["total_manual_minutes"]
        
        # Weighted should be significantly less than raw due to batched tasks
        assert weighted_total < raw_total, f"Weighted ({weighted_total}) should be < raw ({raw_total})"
        
        # Check specific batched tasks have frequency < 1
        batched_tasks = ["Order Consolidation", "Gl Posting", "Menu Analytics", "Financial Reconciliation"]
        for task in data["breakdown"]:
            if task["task"] in batched_tasks:
                assert task["frequency"] < 1, f"{task['task']} should have frequency < 1, got {task['frequency']}"
        
        print(f"PASSED: Raw total = {raw_total}m, Weighted total = {weighted_total}m (reduction from frequency multipliers)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
