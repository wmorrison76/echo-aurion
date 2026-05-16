"""
Iteration 61 Tests: Vendor Intelligence, Budget Engine, EchoAi³ Forecast
=========================================================================
Tests for:
- Vendor Price Intelligence (Craftable-style): price comparison, rogue spend, price alerts
- Budget Engine (ProfitSword-style): daily flash, budget builder, forecast adjustment, variance, 12-month view
- EchoAi³ Analytics: next-month forecast
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestVendorIntelligence:
    """Vendor Price Intelligence API tests"""
    
    def test_price_comparison_returns_40_plus_items(self):
        """GET /api/vendor-intel/price-comparison should return 40+ items with vendor pricing and trends"""
        response = requests.get(f"{BASE_URL}/api/vendor-intel/price-comparison")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "comparisons" in data, "Response should have 'comparisons' array"
        assert "total_items" in data, "Response should have 'total_items'"
        assert "items_with_savings" in data, "Response should have 'items_with_savings'"
        assert "estimated_savings_per_order" in data, "Response should have 'estimated_savings_per_order'"
        assert "generated_at" in data, "Response should have 'generated_at'"
        
        # Verify 40+ items tracked
        total_items = data["total_items"]
        assert total_items >= 40, f"Expected 40+ items, got {total_items}"
        
        # Verify comparison structure
        if len(data["comparisons"]) > 0:
            comp = data["comparisons"][0]
            assert "item" in comp, "Comparison should have 'item'"
            assert "cheapest_vendor" in comp, "Comparison should have 'cheapest_vendor'"
            assert "cheapest_price" in comp, "Comparison should have 'cheapest_price'"
            assert "vendors" in comp, "Comparison should have 'vendors' array"
            assert "price_spread" in comp, "Comparison should have 'price_spread'"
            assert "recommended_vendor" in comp, "Comparison should have 'recommended_vendor'"
            
            # Verify vendor has price trend
            if len(comp["vendors"]) > 0:
                vendor = comp["vendors"][0]
                assert "price_trend" in vendor, "Vendor should have 'price_trend'"
                assert vendor["price_trend"] in ["stable", "rising", "falling"], f"Invalid price_trend: {vendor['price_trend']}"
        
        print(f"✓ Price comparison: {total_items} items tracked, {data['items_with_savings']} with savings opportunity")
    
    def test_rogue_spend_detection(self):
        """GET /api/vendor-intel/rogue-spend should return rogue_items array and total_rogue_spend"""
        response = requests.get(f"{BASE_URL}/api/vendor-intel/rogue-spend")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "rogue_items" in data, "Response should have 'rogue_items' array"
        assert "total_rogue_spend" in data, "Response should have 'total_rogue_spend'"
        assert "rogue_count" in data, "Response should have 'rogue_count'"
        assert "generated_at" in data, "Response should have 'generated_at'"
        
        # Verify rogue_items is an array
        assert isinstance(data["rogue_items"], list), "rogue_items should be a list"
        
        # Verify total_rogue_spend is a number
        assert isinstance(data["total_rogue_spend"], (int, float)), "total_rogue_spend should be numeric"
        
        # If there are rogue items, verify structure
        if len(data["rogue_items"]) > 0:
            rogue = data["rogue_items"][0]
            assert "item" in rogue, "Rogue item should have 'item'"
            assert "ordered_from" in rogue, "Rogue item should have 'ordered_from'"
            assert "cheapest_vendor" in rogue, "Rogue item should have 'cheapest_vendor'"
            assert "overpayment" in rogue, "Rogue item should have 'overpayment'"
        
        print(f"✓ Rogue spend: {data['rogue_count']} items, ${data['total_rogue_spend']:.2f} total")
    
    def test_price_alerts(self):
        """GET /api/vendor-intel/price-alerts should return price increase alerts"""
        response = requests.get(f"{BASE_URL}/api/vendor-intel/price-alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "alerts" in data, "Response should have 'alerts' array"
        assert "alert_count" in data, "Response should have 'alert_count'"
        assert "generated_at" in data, "Response should have 'generated_at'"
        
        # Verify alerts is an array
        assert isinstance(data["alerts"], list), "alerts should be a list"
        
        # If there are alerts, verify structure
        if len(data["alerts"]) > 0:
            alert = data["alerts"][0]
            assert "item" in alert, "Alert should have 'item'"
            assert "vendor" in alert, "Alert should have 'vendor'"
            assert "previous_price" in alert, "Alert should have 'previous_price'"
            assert "current_price" in alert, "Alert should have 'current_price'"
            assert "increase_pct" in alert, "Alert should have 'increase_pct'"
            assert "severity" in alert, "Alert should have 'severity'"
            assert alert["severity"] in ["info", "warning", "critical"], f"Invalid severity: {alert['severity']}"
        
        print(f"✓ Price alerts: {data['alert_count']} alerts")


class TestBudgetEngine:
    """Budget Engine (ProfitSword-style) API tests"""
    
    def test_daily_flash_report(self):
        """GET /api/budget/daily-flash should return yesterday and MTD performance with alerts"""
        response = requests.get(f"{BASE_URL}/api/budget/daily-flash")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "date" in data, "Response should have 'date'"
        assert "day_label" in data, "Response should have 'day_label'"
        assert "yesterday" in data, "Response should have 'yesterday' object"
        assert "mtd" in data, "Response should have 'mtd' object"
        assert "alerts" in data, "Response should have 'alerts' array"
        assert "generated_at" in data, "Response should have 'generated_at'"
        
        # Verify yesterday structure
        y = data["yesterday"]
        assert "revenue" in y, "Yesterday should have 'revenue'"
        assert "covers" in y, "Yesterday should have 'covers'"
        assert "avg_check" in y, "Yesterday should have 'avg_check'"
        assert "food_cost_pct" in y, "Yesterday should have 'food_cost_pct'"
        
        # Verify MTD structure
        mtd = data["mtd"]
        assert "revenue" in mtd, "MTD should have 'revenue'"
        assert "covers" in mtd, "MTD should have 'covers'"
        assert "food_cost_pct" in mtd, "MTD should have 'food_cost_pct'"
        
        # Verify alerts is an array
        assert isinstance(data["alerts"], list), "alerts should be a list"
        
        print(f"✓ Daily flash: Yesterday ${y['revenue']:.2f}, MTD ${mtd['revenue']:.2f}, {len(data['alerts'])} alerts")
    
    def test_build_budget_creates_12_month_budget(self):
        """POST /api/budget/build should create 12-month budget with annual totals and driver-based calculations"""
        drivers = {
            "avg_daily_covers": 225,
            "avg_check": 85.0,
            "occupancy_pct": 72.0,
            "food_cost_target_pct": 22.0,
            "bev_cost_target_pct": 18.0,
            "hourly_labor_target_pct": 25.0,
            "mgmt_salary_monthly": 22000.0,
            "benefits_monthly": 18500.0,
            "rent_monthly": 28000.0,
            "utilities_base": 8500.0,
            "marketing_monthly": 4500.0,
            "maintenance_monthly": 3500.0,
            "insurance_monthly": 4200.0,
            "growth_rate_pct": 3.0,
            "banquet_events_per_month": 6,
            "banquet_avg_revenue": 12000.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/budget/build?budget_name=FY2027%20Operating%20Budget",
            json=drivers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Response should have 'id'"
        assert "name" in data, "Response should have 'name'"
        assert "months" in data, "Response should have 'months' object"
        assert "annual" in data, "Response should have 'annual' object"
        assert "drivers" in data, "Response should have 'drivers' object"
        
        # Verify 12 months
        months = data["months"]
        assert len(months) == 12, f"Expected 12 months, got {len(months)}"
        
        # Verify month structure
        month1 = months.get("1", {})
        assert "month_name" in month1, "Month should have 'month_name'"
        assert "revenue" in month1, "Month should have 'revenue'"
        assert "ebitda" in month1, "Month should have 'ebitda'"
        assert "drivers" in month1, "Month should have 'drivers'"
        
        # Verify annual totals
        annual = data["annual"]
        assert "revenue" in annual, "Annual should have 'revenue'"
        assert "ebitda" in annual, "Annual should have 'ebitda'"
        assert "food_cost" in annual, "Annual should have 'food_cost'"
        assert annual["revenue"] > 0, "Annual revenue should be positive"
        
        print(f"✓ Budget built: {data['name']}, Annual Revenue ${annual['revenue']:,.0f}, EBITDA ${annual['ebitda']:,.0f}")
    
    def test_forecast_adjustment_with_driver_changes(self):
        """POST /api/budget/forecast/adjust with month=5 and driver_changes should return adjusted vs original with variance"""
        adjustment = {
            "month": 5,
            "year": 2026,
            "driver_changes": {
                "avg_check": 90.0,
                "avg_daily_covers": 240
            },
            "commentary": "Spring promotions expected to lift covers 10%",
            "adjusted_by": "Director"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/budget/forecast/adjust",
            json=adjustment
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check for error (no budget exists)
        if "error" in data:
            pytest.skip(f"Skipping: {data['error']}")
        
        assert "month" in data, "Response should have 'month'"
        assert "month_name" in data, "Response should have 'month_name'"
        assert "original" in data, "Response should have 'original' object"
        assert "adjusted" in data, "Response should have 'adjusted' object"
        assert "variance" in data, "Response should have 'variance' object"
        
        # Verify original vs adjusted
        assert "revenue" in data["original"], "Original should have 'revenue'"
        assert "revenue" in data["adjusted"], "Adjusted should have 'revenue'"
        
        # Verify variance
        variance = data["variance"]
        assert "revenue" in variance, "Variance should have 'revenue'"
        assert "revenue_pct" in variance, "Variance should have 'revenue_pct'"
        
        print(f"✓ Forecast adjusted: {data['month_name']}, Original ${data['original']['revenue']:,.0f} → Adjusted ${data['adjusted']['revenue']:,.0f} ({variance['revenue_pct']:+.1f}%)")
    
    def test_budget_vs_actual_variance(self):
        """GET /api/budget/variance should compare budget to actual from simulation data"""
        response = requests.get(f"{BASE_URL}/api/budget/variance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check for error (no budget exists)
        if "error" in data:
            pytest.skip(f"Skipping: {data['error']}")
        
        assert "period" in data, "Response should have 'period'"
        assert "budget_name" in data, "Response should have 'budget_name'"
        assert "lines" in data, "Response should have 'lines' object"
        assert "generated_at" in data, "Response should have 'generated_at'"
        
        # Verify lines structure
        lines = data["lines"]
        assert "revenue" in lines, "Lines should have 'revenue'"
        assert "food_cost" in lines, "Lines should have 'food_cost'"
        assert "ebitda" in lines, "Lines should have 'ebitda'"
        
        # Verify line structure
        rev_line = lines["revenue"]
        assert "actual" in rev_line, "Line should have 'actual'"
        assert "budget" in rev_line, "Line should have 'budget'"
        assert "variance" in rev_line, "Line should have 'variance'"
        assert "variance_pct" in rev_line, "Line should have 'variance_pct'"
        assert "status" in rev_line, "Line should have 'status'"
        assert rev_line["status"] in ["favorable", "unfavorable"], f"Invalid status: {rev_line['status']}"
        
        print(f"✓ Budget vs Actual: {data['period']}, Revenue Actual ${rev_line['actual']:,.0f} vs Budget ${rev_line['budget']:,.0f}")
    
    def test_12_month_view(self):
        """GET /api/budget/12-month-view should show all 12 months with budget and forecast overlay"""
        response = requests.get(f"{BASE_URL}/api/budget/12-month-view")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "budget_name" in data, "Response should have 'budget_name'"
        assert "months" in data, "Response should have 'months' array"
        assert "annual_budget" in data, "Response should have 'annual_budget'"
        assert "generated_at" in data, "Response should have 'generated_at'"
        
        # Verify 12 months
        months = data["months"]
        assert len(months) == 12, f"Expected 12 months, got {len(months)}"
        
        # Verify month structure
        month = months[0]
        assert "month" in month, "Month should have 'month'"
        assert "month_name" in month, "Month should have 'month_name'"
        assert "budget" in month, "Month should have 'budget' object"
        assert "has_adjustment" in month, "Month should have 'has_adjustment'"
        
        # Verify budget structure
        budget = month["budget"]
        assert "revenue" in budget, "Budget should have 'revenue'"
        assert "ebitda" in budget, "Budget should have 'ebitda'"
        
        # Count months with forecast adjustments
        adjusted_months = [m for m in months if m.get("has_adjustment")]
        
        print(f"✓ 12-month view: {data['budget_name']}, {len(adjusted_months)} months with forecast adjustments")


class TestEchoAi3Analytics:
    """EchoAi³ Analytics API tests"""
    
    def test_next_month_forecast(self):
        """POST /api/echoai3/analytics/next-month-forecast should return forecast_revenue > 0 with daily and weekly breakdowns"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/analytics/next-month-forecast",
            json={"horizon_days": 30, "include_ai": False}  # Skip AI for faster test
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check for error (no simulation data)
        if "error" in data:
            pytest.skip(f"Skipping: {data['error']}")
        
        assert "engine" in data, "Response should have 'engine'"
        assert "forecast_period" in data, "Response should have 'forecast_period'"
        assert "summary" in data, "Response should have 'summary'"
        assert "daily_forecast" in data, "Response should have 'daily_forecast' array"
        assert "weekly_forecast" in data, "Response should have 'weekly_forecast' array"
        assert "generated_at" in data, "Response should have 'generated_at'"
        
        # Verify summary
        summary = data["summary"]
        assert "forecast_revenue" in summary, "Summary should have 'forecast_revenue'"
        assert "forecast_cost" in summary, "Summary should have 'forecast_cost'"
        assert "forecast_profit" in summary, "Summary should have 'forecast_profit'"
        assert "forecast_covers" in summary, "Summary should have 'forecast_covers'"
        assert "seasonality_factor" in summary, "Summary should have 'seasonality_factor'"
        
        # Verify forecast_revenue > 0
        assert summary["forecast_revenue"] > 0, f"forecast_revenue should be > 0, got {summary['forecast_revenue']}"
        
        # Verify daily forecast
        daily = data["daily_forecast"]
        assert len(daily) > 0, "daily_forecast should not be empty"
        day = daily[0]
        assert "date" in day, "Day should have 'date'"
        assert "revenue" in day, "Day should have 'revenue'"
        assert "confidence" in day, "Day should have 'confidence'"
        
        # Verify weekly forecast
        weekly = data["weekly_forecast"]
        assert len(weekly) > 0, "weekly_forecast should not be empty"
        week = weekly[0]
        assert "week" in week, "Week should have 'week'"
        assert "revenue" in week, "Week should have 'revenue'"
        
        print(f"✓ Next-month forecast: {data['forecast_period']['month']}, Revenue ${summary['forecast_revenue']:,.0f}, {len(daily)} daily, {len(weekly)} weekly")


class TestManagerDashboard:
    """Manager Dashboard API tests"""
    
    def test_manager_pnl_loads(self):
        """GET /api/manager/pnl should return role-scoped P&L"""
        response = requests.get(f"{BASE_URL}/api/manager/pnl?user_id=usr-mgr-001")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "user" in data, "Response should have 'user'"
        assert "pnl_lines" in data, "Response should have 'pnl_lines'"
        assert "locked_sections" in data, "Response should have 'locked_sections'"
        assert "kpis" in data, "Response should have 'kpis'"
        assert "summary" in data, "Response should have 'summary'"
        
        print(f"✓ Manager P&L: {len(data['pnl_lines'])} visible lines, {len(data['locked_sections'])} locked")


class TestHealth:
    """Health check"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "healthy", f"Expected healthy status, got {data.get('status')}"
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
