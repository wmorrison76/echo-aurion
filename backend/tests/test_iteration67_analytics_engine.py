"""
Iteration 67: Analytics Engine Backend Tests
============================================
Tests for the Craftable-class Analytics BI module:
- GET /api/analytics/home - KPIs with period comparisons
- GET /api/analytics/sales-by-hour - Hourly breakdown
- GET /api/analytics/sales-by-item - Item-level sales
- GET /api/analytics/sales-vs-labor - 14-day comparison
- GET /api/analytics/menu-engineering - Stars/Plowhorses/Puzzles/Dogs
- GET /api/analytics/prime-cost - COGS + Labor analysis
- GET /api/analytics/server-performance - Server stats
- GET /api/analytics/daily-comparison - Week-over-week
- GET /api/analytics/sales-trend - Trend by outlet/category/item
- GET /api/analytics/reports - Report catalog
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalyticsHome:
    """Analytics home endpoint tests - KPIs with period comparisons"""
    
    def test_analytics_home_returns_kpis(self):
        """GET /api/analytics/home returns KPIs"""
        response = requests.get(f"{BASE_URL}/api/analytics/home")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check for error case (no data)
        if "error" in data:
            pytest.skip(f"No POS data available: {data['error']}")
        
        # Validate KPIs structure
        assert "kpis" in data, "Response missing 'kpis'"
        kpis = data["kpis"]
        
        # Required KPI fields
        assert "today_revenue" in kpis, "Missing today_revenue"
        assert "today_covers" in kpis, "Missing today_covers"
        assert "today_avg_check" in kpis, "Missing today_avg_check"
        assert "sdlw" in kpis, "Missing sdlw (Same Day Last Week)"
        assert "week_to_date" in kpis, "Missing week_to_date"
        assert "month_to_date" in kpis, "Missing month_to_date"
        assert "labor_pct" in kpis, "Missing labor_pct"
        
        # Validate SDLW structure
        assert "revenue" in kpis["sdlw"], "SDLW missing revenue"
        assert "change_pct" in kpis["sdlw"], "SDLW missing change_pct"
        
        # Validate WTD structure
        assert "revenue" in kpis["week_to_date"], "WTD missing revenue"
        assert "change_pct" in kpis["week_to_date"], "WTD missing change_pct"
        
        # Validate MTD structure
        assert "revenue" in kpis["month_to_date"], "MTD missing revenue"
        
        print(f"✓ Analytics Home KPIs: Today Revenue ${kpis['today_revenue']}, Covers {kpis['today_covers']}, Labor {kpis['labor_pct']}%")
    
    def test_analytics_home_returns_charts(self):
        """GET /api/analytics/home returns chart data"""
        response = requests.get(f"{BASE_URL}/api/analytics/home")
        assert response.status_code == 200
        
        data = response.json()
        if "error" in data:
            pytest.skip(f"No POS data available: {data['error']}")
        
        # Validate sales_this_week chart
        assert "sales_this_week" in data, "Missing sales_this_week chart"
        assert isinstance(data["sales_this_week"], list), "sales_this_week should be a list"
        
        if len(data["sales_this_week"]) > 0:
            day = data["sales_this_week"][0]
            assert "date" in day, "Chart day missing date"
            assert "day" in day, "Chart day missing day name"
            assert "revenue" in day, "Chart day missing revenue"
            assert "covers" in day, "Chart day missing covers"
        
        # Validate sales_by_outlet table
        assert "sales_by_outlet" in data, "Missing sales_by_outlet"
        assert isinstance(data["sales_by_outlet"], list), "sales_by_outlet should be a list"
        
        if len(data["sales_by_outlet"]) > 0:
            outlet = data["sales_by_outlet"][0]
            assert "outlet" in outlet, "Outlet missing outlet name"
            assert "gross" in outlet, "Outlet missing gross"
            assert "covers" in outlet, "Outlet missing covers"
            assert "avg_check" in outlet, "Outlet missing avg_check"
        
        print(f"✓ Analytics Home Charts: {len(data['sales_this_week'])} days, {len(data['sales_by_outlet'])} outlets")


class TestSalesByHour:
    """Sales by hour endpoint tests"""
    
    def test_sales_by_hour_returns_hourly_data(self):
        """GET /api/analytics/sales-by-hour returns hourly breakdown"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-by-hour")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "hourly" in data, "Missing hourly data"
        assert "peak_hour" in data, "Missing peak_hour"
        assert "date" in data, "Missing date"
        
        # Validate hourly structure
        assert isinstance(data["hourly"], list), "hourly should be a list"
        
        if len(data["hourly"]) > 0:
            hour = data["hourly"][0]
            assert "hour" in hour, "Hour missing hour number"
            assert "label" in hour, "Hour missing label"
            assert "revenue" in hour, "Hour missing revenue"
            assert "covers" in hour, "Hour missing covers"
            assert "txns" in hour, "Hour missing txns"
        
        # Validate peak_hour
        if data["peak_hour"]:
            assert "label" in data["peak_hour"], "Peak hour missing label"
            assert "revenue" in data["peak_hour"], "Peak hour missing revenue"
        
        print(f"✓ Sales by Hour: {len(data['hourly'])} hours, Peak: {data['peak_hour'].get('label', 'N/A')}")


class TestSalesByItem:
    """Sales by item endpoint tests"""
    
    def test_sales_by_item_returns_items(self):
        """GET /api/analytics/sales-by-item returns item breakdown"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-by-item?limit=25")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Missing items"
        assert "total_items" in data, "Missing total_items"
        
        assert isinstance(data["items"], list), "items should be a list"
        
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "name" in item, "Item missing name"
            assert "category" in item, "Item missing category"
            assert "qty" in item, "Item missing qty"
            assert "revenue" in item, "Item missing revenue"
            assert "food_cost" in item, "Item missing food_cost"
            assert "margin" in item, "Item missing margin"
            assert "fc_pct" in item, "Item missing fc_pct"
            assert "avg_price" in item, "Item missing avg_price"
        
        print(f"✓ Sales by Item: {len(data['items'])} items returned, {data['total_items']} total")


class TestSalesVsLabor:
    """Sales vs Labor endpoint tests"""
    
    def test_sales_vs_labor_returns_comparison(self):
        """GET /api/analytics/sales-vs-labor returns 14-day comparison"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-vs-labor")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "data" in data, "Missing data"
        assert "days" in data, "Missing days count"
        
        assert isinstance(data["data"], list), "data should be a list"
        
        if len(data["data"]) > 0:
            day = data["data"][0]
            assert "date" in day, "Day missing date"
            assert "day" in day, "Day missing day name"
            assert "sales" in day, "Day missing sales"
            assert "labor" in day, "Day missing labor"
            assert "labor_pct" in day, "Day missing labor_pct"
        
        print(f"✓ Sales vs Labor: {data['days']} days of comparison data")


class TestMenuEngineering:
    """Menu Engineering endpoint tests - Stars/Plowhorses/Puzzles/Dogs"""
    
    def test_menu_engineering_returns_classifications(self):
        """GET /api/analytics/menu-engineering returns item classifications"""
        response = requests.get(f"{BASE_URL}/api/analytics/menu-engineering")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Missing items"
        assert "summary" in data, "Missing summary"
        
        # Validate summary has all 4 classifications
        summary = data["summary"]
        assert "star" in summary, "Summary missing star count"
        assert "plowhorse" in summary, "Summary missing plowhorse count"
        assert "puzzle" in summary, "Summary missing puzzle count"
        assert "dog" in summary, "Summary missing dog count"
        
        # Validate item structure
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "name" in item, "Item missing name"
            assert "classification" in item, "Item missing classification"
            assert item["classification"] in ["star", "plowhorse", "puzzle", "dog"], f"Invalid classification: {item['classification']}"
            assert "qty" in item, "Item missing qty"
            assert "revenue" in item, "Item missing revenue"
            assert "margin" in item, "Item missing margin"
            assert "margin_pct" in item, "Item missing margin_pct"
            assert "fc_pct" in item, "Item missing fc_pct"
        
        print(f"✓ Menu Engineering: Stars={summary['star']}, Plowhorses={summary['plowhorse']}, Puzzles={summary['puzzle']}, Dogs={summary['dog']}")


class TestPrimeCost:
    """Prime Cost endpoint tests - COGS + Labor analysis"""
    
    def test_prime_cost_returns_breakdown(self):
        """GET /api/analytics/prime-cost returns COGS and labor breakdown"""
        response = requests.get(f"{BASE_URL}/api/analytics/prime-cost")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Validate top-level fields
        assert "revenue" in data, "Missing revenue"
        assert "cogs" in data, "Missing cogs"
        assert "labor" in data, "Missing labor"
        assert "prime_cost" in data, "Missing prime_cost"
        assert "prime_cost_pct" in data, "Missing prime_cost_pct"
        assert "target" in data, "Missing target"
        assert "status" in data, "Missing status"
        
        # Validate COGS breakdown
        cogs = data["cogs"]
        assert "food" in cogs, "COGS missing food"
        assert "beverage" in cogs, "COGS missing beverage"
        assert "total" in cogs, "COGS missing total"
        assert "pct" in cogs, "COGS missing pct"
        
        # Validate Labor breakdown
        labor = data["labor"]
        assert "hourly" in labor, "Labor missing hourly"
        assert "management" in labor, "Labor missing management"
        assert "benefits" in labor, "Labor missing benefits"
        assert "total" in labor, "Labor missing total"
        assert "pct" in labor, "Labor missing pct"
        
        # Validate status
        assert data["status"] in ["on_target", "over"], f"Invalid status: {data['status']}"
        
        print(f"✓ Prime Cost: {data['prime_cost_pct']}% (Target: {data['target']}%, Status: {data['status']})")


class TestServerPerformance:
    """Server Performance endpoint tests"""
    
    def test_server_performance_returns_stats(self):
        """GET /api/analytics/server-performance returns server stats"""
        response = requests.get(f"{BASE_URL}/api/analytics/server-performance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "servers" in data, "Missing servers"
        assert "total_servers" in data, "Missing total_servers"
        
        assert isinstance(data["servers"], list), "servers should be a list"
        
        if len(data["servers"]) > 0:
            server = data["servers"][0]
            assert "server" in server, "Server missing server name"
            assert "revenue" in server, "Server missing revenue"
            assert "covers" in server, "Server missing covers"
            assert "transactions" in server, "Server missing transactions"
            assert "avg_check" in server, "Server missing avg_check"
            assert "tips" in server, "Server missing tips"
            assert "tip_pct" in server, "Server missing tip_pct"
            assert "covers_per_txn" in server, "Server missing covers_per_txn"
        
        print(f"✓ Server Performance: {data['total_servers']} servers tracked")


class TestDailyComparison:
    """Daily Comparison endpoint tests - This week vs Last week"""
    
    def test_daily_comparison_returns_week_data(self):
        """GET /api/analytics/daily-comparison returns week-over-week comparison"""
        response = requests.get(f"{BASE_URL}/api/analytics/daily-comparison")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "comparison" in data, "Missing comparison"
        
        assert isinstance(data["comparison"], list), "comparison should be a list"
        
        if len(data["comparison"]) > 0:
            day = data["comparison"][0]
            assert "day" in day, "Day missing day name"
            assert "this_week" in day, "Day missing this_week"
            assert "last_week" in day, "Day missing last_week"
            assert "revenue_change" in day, "Day missing revenue_change"
            assert "change_pct" in day, "Day missing change_pct"
            
            # Validate this_week structure
            assert "date" in day["this_week"], "this_week missing date"
            assert "revenue" in day["this_week"], "this_week missing revenue"
            assert "covers" in day["this_week"], "this_week missing covers"
            
            # Validate last_week structure
            assert "date" in day["last_week"], "last_week missing date"
            assert "revenue" in day["last_week"], "last_week missing revenue"
        
        print(f"✓ Daily Comparison: {len(data['comparison'])} days compared")


class TestSalesTrend:
    """Sales Trend endpoint tests - by outlet/category/item"""
    
    def test_sales_trend_by_outlet(self):
        """GET /api/analytics/sales-trend?group_by=outlet returns outlet trends"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-trend?group_by=outlet&days=14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "group_by" in data, "Missing group_by"
        assert "days" in data, "Missing days"
        assert "dates" in data, "Missing dates"
        assert "trends" in data, "Missing trends"
        
        assert data["group_by"] == "outlet", f"Expected group_by=outlet, got {data['group_by']}"
        assert isinstance(data["dates"], list), "dates should be a list"
        assert isinstance(data["trends"], dict), "trends should be a dict"
        
        # Validate trend structure
        for outlet_name, trend_data in data["trends"].items():
            assert isinstance(trend_data, list), f"Trend data for {outlet_name} should be a list"
            if len(trend_data) > 0:
                point = trend_data[0]
                assert "date" in point, "Trend point missing date"
                assert "revenue" in point, "Trend point missing revenue"
        
        print(f"✓ Sales Trend by Outlet: {len(data['trends'])} outlets, {len(data['dates'])} days")
    
    def test_sales_trend_by_category(self):
        """GET /api/analytics/sales-trend?group_by=category returns category trends"""
        response = requests.get(f"{BASE_URL}/api/analytics/sales-trend?group_by=category&days=14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["group_by"] == "category", f"Expected group_by=category, got {data['group_by']}"
        
        print(f"✓ Sales Trend by Category: {len(data['trends'])} categories")


class TestReportCatalog:
    """Report Catalog endpoint tests"""
    
    def test_report_catalog_returns_categories(self):
        """GET /api/analytics/reports returns report catalog with 6 categories"""
        response = requests.get(f"{BASE_URL}/api/analytics/reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Missing categories"
        
        categories = data["categories"]
        assert isinstance(categories, list), "categories should be a list"
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Validate expected category IDs
        category_ids = [c["id"] for c in categories]
        expected_ids = ["sales", "labor", "profit", "servers", "comparisons", "trends"]
        for expected_id in expected_ids:
            assert expected_id in category_ids, f"Missing category: {expected_id}"
        
        # Validate category structure
        for cat in categories:
            assert "id" in cat, "Category missing id"
            assert "label" in cat, "Category missing label"
            assert "reports" in cat, "Category missing reports"
            assert isinstance(cat["reports"], list), "reports should be a list"
            
            # Validate report structure
            for report in cat["reports"]:
                assert "id" in report, "Report missing id"
                assert "label" in report, "Report missing label"
                assert "endpoint" in report, "Report missing endpoint"
        
        total_reports = sum(len(c["reports"]) for c in categories)
        print(f"✓ Report Catalog: {len(categories)} categories, {total_reports} total reports")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
