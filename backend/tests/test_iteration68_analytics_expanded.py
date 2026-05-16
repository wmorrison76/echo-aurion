"""
Iteration 68: Analytics Engine Expanded - 17 Reports Testing
=============================================================
Tests all 17 analytics endpoints including 7 new endpoints:
- heatmap, daypart, category-mix, speed-of-service, guest-analytics, 
- outlet-comparison, waste-variance, forecast

Plus all 10 original endpoints from iteration 67.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalyticsNewEndpoints:
    """Test the 7 NEW analytics endpoints added in iteration 68"""
    
    def test_heatmap_returns_126_cells(self):
        """GET /api/analytics/heatmap - Returns 126 cells (7 days x 18 hours)"""
        response = requests.get(f"{BASE_URL}/api/analytics/heatmap", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "cells" in data, "Response should have 'cells' field"
        assert "max_revenue" in data, "Response should have 'max_revenue' field"
        assert "days" in data, "Response should have 'days' field"
        assert "hours" in data, "Response should have 'hours' field"
        
        # Verify 7 days x 18 hours (6:00-23:00) = 126 cells
        cells = data["cells"]
        assert len(cells) == 126, f"Expected 126 cells (7 days x 18 hours), got {len(cells)}"
        
        # Verify cell structure
        sample_cell = cells[0]
        assert "day" in sample_cell, "Cell should have 'day'"
        assert "day_idx" in sample_cell, "Cell should have 'day_idx'"
        assert "hour" in sample_cell, "Cell should have 'hour'"
        assert "revenue" in sample_cell, "Cell should have 'revenue'"
        assert "intensity" in sample_cell, "Cell should have 'intensity'"
        
        # Verify intensity is normalized (0-1)
        for cell in cells:
            assert 0 <= cell["intensity"] <= 1, f"Intensity should be 0-1, got {cell['intensity']}"
        
        print(f"✓ Heatmap: {len(cells)} cells, max_revenue={data['max_revenue']}")
    
    def test_daypart_returns_4_dayparts(self):
        """GET /api/analytics/daypart - Returns 4 dayparts with revenue, covers, avg_check"""
        response = requests.get(f"{BASE_URL}/api/analytics/daypart", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "dayparts" in data, "Response should have 'dayparts' field"
        assert "total_revenue" in data, "Response should have 'total_revenue' field"
        
        dayparts = data["dayparts"]
        assert len(dayparts) == 4, f"Expected 4 dayparts, got {len(dayparts)}"
        
        # Verify daypart names
        daypart_names = [dp["daypart"] for dp in dayparts]
        expected_names = ["Breakfast", "Lunch", "Dinner", "Late Night"]
        for name in expected_names:
            assert name in daypart_names, f"Missing daypart: {name}"
        
        # Verify daypart structure
        for dp in dayparts:
            assert "revenue" in dp, "Daypart should have 'revenue'"
            assert "covers" in dp, "Daypart should have 'covers'"
            assert "avg_check" in dp, "Daypart should have 'avg_check'"
            assert "hours" in dp, "Daypart should have 'hours'"
            assert "revenue_pct" in dp, "Daypart should have 'revenue_pct'"
        
        print(f"✓ Daypart: {len(dayparts)} dayparts, total_revenue=${data['total_revenue']}")
    
    def test_category_mix_returns_categories_with_trend(self):
        """GET /api/analytics/category-mix - Returns categories with revenue, mix_pct, fc_pct, and 14-day trend"""
        response = requests.get(f"{BASE_URL}/api/analytics/category-mix", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Response should have 'categories' field"
        assert "total_revenue" in data, "Response should have 'total_revenue' field"
        assert "trend" in data, "Response should have 'trend' field"
        assert "trend_dates" in data, "Response should have 'trend_dates' field"
        
        categories = data["categories"]
        assert len(categories) > 0, "Should have at least 1 category"
        
        # Verify category structure
        sample_cat = categories[0]
        assert "category" in sample_cat, "Category should have 'category' name"
        assert "revenue" in sample_cat, "Category should have 'revenue'"
        assert "mix_pct" in sample_cat, "Category should have 'mix_pct'"
        assert "fc_pct" in sample_cat, "Category should have 'fc_pct'"
        assert "margin" in sample_cat, "Category should have 'margin'"
        
        # Verify trend data (14 days)
        trend = data["trend"]
        assert len(trend) <= 14, f"Trend should have up to 14 days, got {len(trend)}"
        
        print(f"✓ Category Mix: {len(categories)} categories, {len(trend)} trend days")
    
    def test_speed_of_service_returns_overall_and_breakdowns(self):
        """GET /api/analytics/speed-of-service - Returns overall_avg_mins, by_hour, by_day, by_outlet"""
        response = requests.get(f"{BASE_URL}/api/analytics/speed-of-service", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "overall_avg_mins" in data, "Response should have 'overall_avg_mins'"
        assert "total_tickets" in data, "Response should have 'total_tickets'"
        assert "by_hour" in data, "Response should have 'by_hour'"
        assert "by_day" in data, "Response should have 'by_day'"
        assert "by_outlet" in data, "Response should have 'by_outlet'"
        
        # Verify by_hour has 18 entries (6:00-23:00)
        by_hour = data["by_hour"]
        assert len(by_hour) == 18, f"Expected 18 hourly entries, got {len(by_hour)}"
        
        # Verify by_day has 7 entries
        by_day = data["by_day"]
        assert len(by_day) == 7, f"Expected 7 daily entries, got {len(by_day)}"
        
        # Verify structure
        assert "avg_mins" in by_hour[0], "Hourly entry should have 'avg_mins'"
        assert "tickets" in by_hour[0], "Hourly entry should have 'tickets'"
        
        print(f"✓ Speed of Service: overall_avg={data['overall_avg_mins']}min, {data['total_tickets']} tickets")
    
    def test_guest_analytics_returns_party_sizes_and_covers(self):
        """GET /api/analytics/guest-analytics - Returns party_size_distribution, server_covers, covers_trend"""
        response = requests.get(f"{BASE_URL}/api/analytics/guest-analytics", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_covers" in data, "Response should have 'total_covers'"
        assert "avg_daily_covers" in data, "Response should have 'avg_daily_covers'"
        assert "party_size_distribution" in data, "Response should have 'party_size_distribution'"
        assert "server_covers" in data, "Response should have 'server_covers'"
        assert "covers_trend" in data, "Response should have 'covers_trend'"
        
        # Verify party size distribution has expected buckets
        party_dist = data["party_size_distribution"]
        assert len(party_dist) == 5, f"Expected 5 party size buckets, got {len(party_dist)}"
        
        expected_sizes = ["1", "2", "3-4", "5-6", "7+"]
        actual_sizes = [p["size"] for p in party_dist]
        for size in expected_sizes:
            assert size in actual_sizes, f"Missing party size bucket: {size}"
        
        # Verify covers_trend has up to 14 days
        covers_trend = data["covers_trend"]
        assert len(covers_trend) <= 14, f"Covers trend should have up to 14 days"
        
        print(f"✓ Guest Analytics: {data['total_covers']} total covers, avg_daily={data['avg_daily_covers']}")
    
    def test_outlet_comparison_returns_outlets_with_metrics(self):
        """GET /api/analytics/outlet-comparison - Returns outlets with revenue, avg_check, fc_pct, tip_pct, items_per_cover"""
        response = requests.get(f"{BASE_URL}/api/analytics/outlet-comparison", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "outlets" in data, "Response should have 'outlets' field"
        
        outlets = data["outlets"]
        assert len(outlets) > 0, "Should have at least 1 outlet"
        
        # Verify outlet structure for radar chart
        sample_outlet = outlets[0]
        required_fields = ["outlet", "revenue", "avg_check", "fc_pct", "tip_pct", "items_per_cover", "covers_per_day"]
        for field in required_fields:
            assert field in sample_outlet, f"Outlet should have '{field}'"
        
        print(f"✓ Outlet Comparison: {len(outlets)} outlets")
        for outlet in outlets:
            print(f"  - {outlet['outlet']}: revenue=${outlet['revenue']}, avg_check=${outlet['avg_check']}")
    
    def test_waste_variance_returns_theoretical_vs_actual(self):
        """GET /api/analytics/waste-variance - Returns theoretical_cost, actual_cogs, variance, waste_breakdown"""
        response = requests.get(f"{BASE_URL}/api/analytics/waste-variance", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "theoretical_cost" in data, "Response should have 'theoretical_cost'"
        assert "actual_cogs" in data, "Response should have 'actual_cogs'"
        assert "variance" in data, "Response should have 'variance'"
        assert "variance_pct" in data, "Response should have 'variance_pct'"
        assert "waste_breakdown" in data, "Response should have 'waste_breakdown'"
        assert "by_category" in data, "Response should have 'by_category'"
        
        # Verify variance calculation
        expected_variance = data["actual_cogs"] - data["theoretical_cost"]
        assert abs(data["variance"] - expected_variance) < 0.01, "Variance calculation mismatch"
        
        print(f"✓ Waste & Variance: theoretical=${data['theoretical_cost']}, actual=${data['actual_cogs']}, variance={data['variance_pct']}%")
    
    def test_forecast_returns_7_day_prediction(self):
        """GET /api/analytics/forecast - Returns 7-day forecast with predicted, confidence_low/high, method=sma7_trend_seasonal"""
        response = requests.get(f"{BASE_URL}/api/analytics/forecast", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "forecast" in data, "Response should have 'forecast'"
        assert "actual" in data, "Response should have 'actual'"
        assert "method" in data, "Response should have 'method'"
        
        # Verify method is sma7_trend_seasonal
        assert data["method"] == "sma7_trend_seasonal", f"Expected method 'sma7_trend_seasonal', got '{data['method']}'"
        
        # Verify 7-day forecast
        forecast = data["forecast"]
        assert len(forecast) == 7, f"Expected 7-day forecast, got {len(forecast)}"
        
        # Verify forecast structure
        for day in forecast:
            assert "date" in day, "Forecast day should have 'date'"
            assert "day" in day, "Forecast day should have 'day'"
            assert "predicted" in day, "Forecast day should have 'predicted'"
            assert "confidence_low" in day, "Forecast day should have 'confidence_low'"
            assert "confidence_high" in day, "Forecast day should have 'confidence_high'"
            
            # Verify confidence band (low < predicted < high)
            assert day["confidence_low"] <= day["predicted"] <= day["confidence_high"], \
                f"Confidence band invalid: {day['confidence_low']} <= {day['predicted']} <= {day['confidence_high']}"
        
        print(f"✓ Forecast: {len(forecast)} days, method={data['method']}")


class TestAnalyticsOriginalEndpoints:
    """Test the 10 ORIGINAL analytics endpoints from iteration 67"""
    
    def test_home_returns_kpis(self):
        """GET /api/analytics/home - Returns KPIs and charts"""
        response = requests.get(f"{BASE_URL}/api/analytics/home", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "kpis" in data, "Response should have 'kpis'"
        assert "sales_this_week" in data, "Response should have 'sales_this_week'"
        assert "sales_by_outlet" in data, "Response should have 'sales_by_outlet'"
        
        kpis = data["kpis"]
        assert "today_revenue" in kpis
        assert "today_covers" in kpis
        assert "today_avg_check" in kpis
        assert "sdlw" in kpis
        assert "week_to_date" in kpis
        assert "month_to_date" in kpis
        
        print(f"✓ Home: today_revenue=${kpis['today_revenue']}, covers={kpis['today_covers']}")
    
    def test_sales_by_hour(self):
        """GET /api/analytics/sales-by-hour - Returns hourly breakdown"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-by-hour", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "hourly" in data
        assert "peak_hour" in data
        
        hourly = data["hourly"]
        assert len(hourly) == 18, f"Expected 18 hours (6-23), got {len(hourly)}"
        
        print(f"✓ Sales by Hour: peak_hour={data['peak_hour'].get('label', 'N/A')}")
    
    def test_sales_by_item(self):
        """GET /api/analytics/sales-by-item - Returns item breakdown"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-by-item", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total_items" in data
        
        items = data["items"]
        if len(items) > 0:
            assert "name" in items[0]
            assert "revenue" in items[0]
            assert "food_cost" in items[0]
            assert "margin" in items[0]
        
        print(f"✓ Sales by Item: {data['total_items']} items")
    
    def test_sales_vs_labor(self):
        """GET /api/analytics/sales-vs-labor - Returns sales vs labor comparison"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-vs-labor", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "days" in data
        
        print(f"✓ Sales vs Labor: {data['days']} days of data")
    
    def test_menu_engineering(self):
        """GET /api/analytics/menu-engineering - Returns menu engineering matrix"""
        response = requests.get(f"{BASE_URL}/api/analytics/menu-engineering", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "summary" in data
        
        summary = data["summary"]
        classifications = ["star", "plowhorse", "puzzle", "dog"]
        for cls in classifications:
            assert cls in summary, f"Missing classification: {cls}"
        
        print(f"✓ Menu Engineering: stars={summary.get('star', 0)}, plowhorses={summary.get('plowhorse', 0)}, puzzles={summary.get('puzzle', 0)}, dogs={summary.get('dog', 0)}")
    
    def test_prime_cost(self):
        """GET /api/analytics/prime-cost - Returns prime cost analysis"""
        response = requests.get(f"{BASE_URL}/api/analytics/prime-cost", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "revenue" in data
        assert "cogs" in data
        assert "labor" in data
        assert "prime_cost" in data
        assert "prime_cost_pct" in data
        assert "target" in data
        
        print(f"✓ Prime Cost: {data['prime_cost_pct']}% (target: {data['target']}%)")
    
    def test_server_performance(self):
        """GET /api/analytics/server-performance - Returns server stats"""
        response = requests.get(f"{BASE_URL}/api/analytics/server-performance", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "servers" in data
        assert "total_servers" in data
        
        print(f"✓ Server Performance: {data['total_servers']} servers")
    
    def test_daily_comparison(self):
        """GET /api/analytics/daily-comparison - Returns week comparison"""
        response = requests.get(f"{BASE_URL}/api/analytics/daily-comparison", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "comparison" in data
        
        print(f"✓ Daily Comparison: {len(data['comparison'])} days compared")
    
    def test_sales_trend(self):
        """GET /api/analytics/sales-trend - Returns trend data"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-trend", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "group_by" in data
        assert "trends" in data
        assert "dates" in data
        
        print(f"✓ Sales Trend: {len(data['dates'])} days, grouped by {data['group_by']}")
    
    def test_reports_catalog(self):
        """GET /api/analytics/reports - Returns 6 categories with 17 total reports"""
        response = requests.get(f"{BASE_URL}/api/analytics/reports", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "categories" in data
        
        categories = data["categories"]
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Count total reports
        total_reports = sum(len(cat.get("reports", [])) for cat in categories)
        assert total_reports == 17, f"Expected 17 total reports, got {total_reports}"
        
        # Verify category IDs
        category_ids = [cat["id"] for cat in categories]
        expected_ids = ["sales", "labor", "profit", "guests", "comparisons", "trends"]
        for cid in expected_ids:
            assert cid in category_ids, f"Missing category: {cid}"
        
        print(f"✓ Reports Catalog: {len(categories)} categories, {total_reports} reports")


class TestAnalyticsDataIntegrity:
    """Test data integrity and consistency across endpoints"""
    
    def test_heatmap_intensity_normalization(self):
        """Verify heatmap intensity values are properly normalized"""
        response = requests.get(f"{BASE_URL}/api/analytics/heatmap", timeout=30)
        data = response.json()
        
        cells = data["cells"]
        max_rev = data["max_revenue"]
        
        # Find cell with max revenue - should have intensity close to 1
        max_cell = max(cells, key=lambda c: c["revenue"])
        if max_rev > 0:
            expected_intensity = max_cell["revenue"] / max_rev
            assert abs(max_cell["intensity"] - expected_intensity) < 0.01, \
                f"Max cell intensity mismatch: {max_cell['intensity']} vs {expected_intensity}"
        
        print(f"✓ Heatmap intensity normalization verified")
    
    def test_daypart_revenue_sums_to_total(self):
        """Verify daypart revenues sum to total_revenue"""
        response = requests.get(f"{BASE_URL}/api/analytics/daypart", timeout=30)
        data = response.json()
        
        dayparts = data["dayparts"]
        total = data["total_revenue"]
        
        sum_revenue = sum(dp["revenue"] for dp in dayparts)
        assert abs(sum_revenue - total) < 1, f"Daypart sum {sum_revenue} != total {total}"
        
        # Verify percentages sum to ~100%
        sum_pct = sum(dp["revenue_pct"] for dp in dayparts)
        assert 99 <= sum_pct <= 101, f"Daypart percentages sum to {sum_pct}%, expected ~100%"
        
        print(f"✓ Daypart revenue integrity verified")
    
    def test_category_mix_percentages_sum_to_100(self):
        """Verify category mix percentages sum to ~100%"""
        response = requests.get(f"{BASE_URL}/api/analytics/category-mix", timeout=30)
        data = response.json()
        
        categories = data["categories"]
        sum_pct = sum(cat["mix_pct"] for cat in categories)
        
        assert 99 <= sum_pct <= 101, f"Category mix percentages sum to {sum_pct}%, expected ~100%"
        
        print(f"✓ Category mix percentages verified")
    
    def test_forecast_confidence_bands(self):
        """Verify forecast confidence bands are valid (low < predicted < high)"""
        response = requests.get(f"{BASE_URL}/api/analytics/forecast", timeout=30)
        data = response.json()
        
        forecast = data["forecast"]
        for day in forecast:
            low = day["confidence_low"]
            pred = day["predicted"]
            high = day["confidence_high"]
            
            assert low <= pred, f"confidence_low ({low}) > predicted ({pred})"
            assert pred <= high, f"predicted ({pred}) > confidence_high ({high})"
            
            # Verify ~15% confidence band
            if pred > 0:
                low_pct = (pred - low) / pred * 100
                high_pct = (high - pred) / pred * 100
                assert 10 <= low_pct <= 20, f"Low band {low_pct}% outside expected range"
                assert 10 <= high_pct <= 20, f"High band {high_pct}% outside expected range"
        
        print(f"✓ Forecast confidence bands verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
