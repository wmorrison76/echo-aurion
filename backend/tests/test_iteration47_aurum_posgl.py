"""
Iteration 47 - EchoStratus Aurum GL Actuals Bridge & POS/GL Integration Hub Tests
==================================================================================
Tests for:
1. EchoAurum GL Actuals Bridge (actuals, by-outlet, budget-bridge)
2. POS/GL Integration Hub (Toast POS, QuickBooks Online status)
3. PDF Board Report Export
4. Data Export JSON
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestAurumGLActuals:
    """EchoAurum GL Actuals Bridge API tests"""
    
    def test_aurum_actuals_endpoint(self):
        """GET /api/echo-stratus/aurum/actuals - returns GL actuals with annual totals and 12 monthly breakdowns"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/aurum/actuals")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "source" in data, "Missing 'source' field"
        assert data["source"] == "EchoAurum GL", f"Expected source 'EchoAurum GL', got {data['source']}"
        assert "fiscal_year" in data, "Missing 'fiscal_year' field"
        assert "generated_at" in data, "Missing 'generated_at' field"
        assert "data_points" in data, "Missing 'data_points' field"
        assert "monthly" in data, "Missing 'monthly' field"
        assert "annual" in data, "Missing 'annual' field"
        
        # Verify data_points structure
        dp = data["data_points"]
        assert "gl_entries" in dp, "Missing gl_entries count"
        assert "labor_schedules" in dp, "Missing labor_schedules count"
        assert "events" in dp, "Missing events count"
        
        # Verify 12 months exist
        monthly = data["monthly"]
        assert len(monthly) == 12, f"Expected 12 months, got {len(monthly)}"
        for m in range(1, 13):
            assert str(m) in monthly, f"Missing month {m}"
            month_data = monthly[str(m)]
            assert "revenue" in month_data, f"Month {m} missing revenue"
            assert "cost_of_sales" in month_data, f"Month {m} missing cost_of_sales"
            assert "labor" in month_data, f"Month {m} missing labor"
            assert "ebitda" in month_data, f"Month {m} missing ebitda"
        
        # Verify annual totals
        annual = data["annual"]
        assert "total_revenue" in annual, "Missing total_revenue"
        assert "total_food_cost" in annual, "Missing total_food_cost"
        assert "total_beverage_cost" in annual, "Missing total_beverage_cost"
        assert "total_labor" in annual, "Missing total_labor"
        assert "total_ebitda" in annual, "Missing total_ebitda"
        assert "ebitda_margin_pct" in annual, "Missing ebitda_margin_pct"
        assert "food_cost_pct" in annual, "Missing food_cost_pct"
        assert "labor_pct" in annual, "Missing labor_pct"
        
        print(f"PASS: aurum/actuals - {dp['gl_entries']} GL entries, {dp['labor_schedules']} labor, {dp['events']} events")
        print(f"  Annual: Revenue ${annual['total_revenue']:,.0f}, EBITDA ${annual['total_ebitda']:,.0f} ({annual['ebitda_margin_pct']}%)")
    
    def test_aurum_actuals_by_outlet(self):
        """GET /api/echo-stratus/aurum/actuals/by-outlet - returns per-outlet revenue with food cost % and avg check"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/aurum/actuals/by-outlet")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "generated_at" in data, "Missing generated_at"
        assert "outlets" in data, "Missing outlets array"
        assert "summary" in data, "Missing summary"
        
        outlets = data["outlets"]
        assert len(outlets) > 0, "Expected at least 1 outlet"
        
        # Verify outlet structure
        for outlet in outlets:
            assert "outlet_id" in outlet, "Outlet missing outlet_id"
            assert "name" in outlet, "Outlet missing name"
            assert "type" in outlet, "Outlet missing type"
            assert "revenue" in outlet, "Outlet missing revenue"
            assert "food_cost" in outlet, "Outlet missing food_cost"
            assert "food_cost_pct" in outlet, "Outlet missing food_cost_pct"
            assert "avg_check" in outlet, "Outlet missing avg_check"
        
        # Verify summary
        summary = data["summary"]
        assert "total_revenue" in summary, "Summary missing total_revenue"
        assert "total_food_cost" in summary, "Summary missing total_food_cost"
        assert "outlet_count" in summary, "Summary missing outlet_count"
        
        print(f"PASS: aurum/actuals/by-outlet - {len(outlets)} outlets")
        for o in outlets[:3]:
            print(f"  {o['name']}: ${o['revenue']:,.0f}, {o['food_cost_pct']}% FC, ${o['avg_check']:.0f}/chk")
    
    def test_aurum_budget_bridge(self):
        """GET /api/echo-stratus/aurum/budget-bridge/{id} - returns monthly budget vs actual bridge with variance"""
        # First get a budget ID
        list_response = requests.get(f"{BASE_URL}/api/echo-stratus/budget/list")
        assert list_response.status_code == 200, f"Budget list failed: {list_response.text}"
        
        budgets = list_response.json().get("budgets", [])
        if not budgets:
            # Create a budget if none exists
            create_response = requests.post(
                f"{BASE_URL}/api/echo-stratus/budget/create",
                json={"fiscal_year": 2026, "name": "TEST_FY2026 Budget Bridge Test"}
            )
            assert create_response.status_code == 200, f"Budget create failed: {create_response.text}"
            budget_id = create_response.json().get("id")
        else:
            budget_id = budgets[0]["id"]
        
        # Now test budget bridge
        response = requests.get(f"{BASE_URL}/api/echo-stratus/aurum/budget-bridge/{budget_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "budget_id" in data, "Missing budget_id"
        assert "budget_name" in data, "Missing budget_name"
        assert "generated_at" in data, "Missing generated_at"
        assert "current_month" in data, "Missing current_month"
        assert "source" in data, "Missing source"
        assert "monthly_bridge" in data, "Missing monthly_bridge"
        assert "ytd" in data, "Missing ytd"
        assert "data_quality" in data, "Missing data_quality"
        
        # Verify monthly bridge structure
        bridge = data["monthly_bridge"]
        assert len(bridge) == 12, f"Expected 12 months in bridge, got {len(bridge)}"
        
        # Check first month structure
        m1 = bridge.get("1", {})
        assert "revenue" in m1, "Month 1 missing revenue"
        assert "food_cost" in m1, "Month 1 missing food_cost"
        assert "labor" in m1, "Month 1 missing labor"
        assert "ebitda" in m1, "Month 1 missing ebitda"
        
        # Verify variance structure
        if m1.get("revenue"):
            rev = m1["revenue"]
            assert "actual" in rev, "Revenue missing actual"
            assert "budget" in rev, "Revenue missing budget"
            assert "variance" in rev, "Revenue missing variance"
            assert "variance_pct" in rev, "Revenue missing variance_pct"
            assert "status" in rev, "Revenue missing status (favorable/unfavorable)"
        
        # Verify YTD
        ytd = data["ytd"]
        assert "actual" in ytd, "YTD missing actual"
        assert "budget" in ytd, "YTD missing budget"
        assert "variance" in ytd, "YTD missing variance"
        
        # Verify data quality
        dq = data["data_quality"]
        assert "gl_entries_used" in dq, "Data quality missing gl_entries_used"
        assert "labor_records_used" in dq, "Data quality missing labor_records_used"
        assert "events_counted" in dq, "Data quality missing events_counted"
        assert "coverage" in dq, "Data quality missing coverage"
        
        print(f"PASS: aurum/budget-bridge/{budget_id}")
        print(f"  Budget: {data['budget_name']}, Month {data['current_month']}/12")
        print(f"  Data quality: {dq['coverage']} ({dq['gl_entries_used']} GL, {dq['labor_records_used']} labor, {dq['events_counted']} events)")


class TestPOSGLIntegrationHub:
    """POS/GL Integration Hub API tests (Toast POS, QuickBooks Online)"""
    
    def test_pos_gl_status(self):
        """GET /api/pos-gl/status - returns Toast POS and QuickBooks Online integration status"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "integrations" in data, "Missing integrations array"
        
        integrations = data["integrations"]
        assert len(integrations) >= 2, f"Expected at least 2 integrations, got {len(integrations)}"
        
        # Find Toast and QuickBooks
        toast = next((i for i in integrations if i["provider"] == "toast"), None)
        qb = next((i for i in integrations if i["provider"] == "quickbooks"), None)
        
        assert toast is not None, "Toast POS integration not found"
        assert qb is not None, "QuickBooks integration not found"
        
        # Verify Toast structure
        assert "name" in toast, "Toast missing name"
        assert toast["name"] == "Toast POS", f"Expected 'Toast POS', got {toast['name']}"
        assert "status" in toast, "Toast missing status"
        assert "features" in toast, "Toast missing features"
        assert "config" in toast, "Toast missing config"
        
        # Verify QuickBooks structure
        assert "name" in qb, "QuickBooks missing name"
        assert qb["name"] == "QuickBooks Online", f"Expected 'QuickBooks Online', got {qb['name']}"
        assert "status" in qb, "QuickBooks missing status"
        assert "features" in qb, "QuickBooks missing features"
        assert "config" in qb, "QuickBooks missing config"
        
        print(f"PASS: pos-gl/status")
        print(f"  Toast POS: {toast['status']}, features: {toast['features']}")
        print(f"  QuickBooks: {qb['status']}, features: {qb['features']}")
    
    def test_toast_connect_sandbox(self):
        """POST /api/pos-gl/toast/connect - connect Toast POS (sandbox mode)"""
        response = requests.post(
            f"{BASE_URL}/api/pos-gl/toast/connect",
            json={
                "client_id": "test-client-id",
                "client_secret": "test-client-secret",
                "restaurant_external_id": "test-restaurant-123"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "connection" in data, "Missing connection object"
        
        conn = data["connection"]
        assert conn.get("status") == "connected", f"Expected status 'connected', got {conn.get('status')}"
        assert "connection_id" in conn, "Missing connection_id"
        
        print(f"PASS: toast/connect - {conn['connection_id']} status={conn['status']}")
    
    def test_quickbooks_connect_sandbox(self):
        """POST /api/pos-gl/quickbooks/connect - connect QuickBooks (sandbox mode)"""
        response = requests.post(
            f"{BASE_URL}/api/pos-gl/quickbooks/connect",
            json={
                "client_id": "test-qb-client-id",
                "realm_id": "test-realm-123"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        assert "connection" in data, "Missing connection object"
        
        conn = data["connection"]
        assert conn.get("status") == "connected", f"Expected status 'connected', got {conn.get('status')}"
        
        print(f"PASS: quickbooks/connect - {conn['connection_id']} status={conn['status']}")


class TestBoardReportExport:
    """PDF Board Report and Data Export tests"""
    
    def test_executive_pdf_report(self):
        """GET /api/echo-stratus/report/executive-pdf - returns HTML board report (HTTP 200)"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/report/executive-pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is HTML
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected text/html, got {content_type}"
        
        # Verify Content-Disposition header for download
        content_disp = response.headers.get("content-disposition", "")
        assert "attachment" in content_disp, f"Expected attachment disposition, got {content_disp}"
        assert "EchoStratus_Board_Report" in content_disp, f"Expected filename with EchoStratus_Board_Report, got {content_disp}"
        
        # Verify HTML content
        html = response.text
        assert "<!DOCTYPE html>" in html, "Missing DOCTYPE"
        assert "ECHOSTRATUS" in html, "Missing ECHOSTRATUS title"
        assert "Executive Board Report" in html, "Missing 'Executive Board Report' text"
        assert "Financial Performance Summary" in html, "Missing 'Financial Performance Summary' section"
        assert "Revenue" in html, "Missing Revenue KPI"
        assert "EBITDA" in html, "Missing EBITDA KPI"
        
        print(f"PASS: report/executive-pdf - HTML report generated ({len(html)} bytes)")
        print(f"  Content-Disposition: {content_disp[:60]}...")
    
    def test_data_export_json(self):
        """GET /api/echo-stratus/report/data-export - returns JSON data export with GL entries, events, outlets, budgets"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/report/data-export")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "export_type" in data, "Missing export_type"
        assert data["export_type"] == "echostratus_full", f"Expected 'echostratus_full', got {data['export_type']}"
        assert "generated_at" in data, "Missing generated_at"
        assert "summary" in data, "Missing summary"
        assert "gl_entries" in data, "Missing gl_entries"
        assert "events" in data, "Missing events"
        assert "outlets" in data, "Missing outlets"
        assert "budgets" in data, "Missing budgets"
        
        # Verify summary
        summary = data["summary"]
        assert "total_revenue" in summary, "Summary missing total_revenue"
        assert "total_expenses" in summary, "Summary missing total_expenses"
        assert "ebitda" in summary, "Summary missing ebitda"
        assert "total_events" in summary, "Summary missing total_events"
        assert "total_outlets" in summary, "Summary missing total_outlets"
        assert "budgets_count" in summary, "Summary missing budgets_count"
        
        print(f"PASS: report/data-export")
        print(f"  Summary: Revenue ${summary['total_revenue']:,.0f}, EBITDA ${summary['ebitda']:,.0f}")
        print(f"  Data: {len(data['gl_entries'])} GL entries, {len(data['events'])} events, {len(data['outlets'])} outlets, {len(data['budgets'])} budgets")


class TestNavigationTabs:
    """Verify all 14 navigation tabs have working backend endpoints"""
    
    def test_executive_dashboard(self):
        """Executive tab - GET /api/echo-stratus/executive/dashboard"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/executive/dashboard")
        assert response.status_code == 200, f"Executive dashboard failed: {response.status_code}"
        print("PASS: Executive dashboard endpoint")
    
    def test_ask_templates(self):
        """Ask tab - GET /api/echo-stratus/decision/templates"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/decision/templates")
        assert response.status_code == 200, f"Decision templates failed: {response.status_code}"
        print("PASS: Ask/Decision templates endpoint")
    
    def test_budget_list(self):
        """Budget tab - GET /api/echo-stratus/budget/list"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/budget/list")
        assert response.status_code == 200, f"Budget list failed: {response.status_code}"
        print("PASS: Budget list endpoint")
    
    def test_forecast(self):
        """Forecast tab - POST /api/echo-stratus/forecast"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/forecast", json={"horizon": "30d"})
        assert response.status_code == 200, f"Forecast failed: {response.status_code}"
        print("PASS: Forecast endpoint")
    
    def test_scenarios_templates(self):
        """What-If tab - GET /api/echo-stratus/scenarios/templates"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/scenarios/templates")
        assert response.status_code == 200, f"Scenarios templates failed: {response.status_code}"
        print("PASS: Scenarios templates endpoint")
    
    def test_capex_analyze(self):
        """CapEx tab - POST /api/echo-stratus/capex/analyze"""
        response = requests.post(f"{BASE_URL}/api/echo-stratus/capex/analyze", json={
            "name": "Test Table", "item_type": "table", "cost": 4000, "seats": 4
        })
        assert response.status_code == 200, f"CapEx analyze failed: {response.status_code}"
        print("PASS: CapEx analyze endpoint")
    
    def test_activations_templates(self):
        """Events tab - GET /api/echo-stratus/activations/templates"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/activations/templates")
        assert response.status_code == 200, f"Activations templates failed: {response.status_code}"
        print("PASS: Activations templates endpoint")
    
    def test_signals(self):
        """Signals tab - GET /api/echo-stratus/signals"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/signals")
        assert response.status_code == 200, f"Signals failed: {response.status_code}"
        print("PASS: Signals endpoint")
    
    def test_recommendations(self):
        """Actions tab - GET /api/echo-stratus/recommendations"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/recommendations")
        assert response.status_code == 200, f"Recommendations failed: {response.status_code}"
        print("PASS: Recommendations endpoint")
    
    def test_portfolio_overview(self):
        """Portfolio tab - GET /api/echo-stratus/portfolio/overview"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/overview")
        assert response.status_code == 200, f"Portfolio overview failed: {response.status_code}"
        print("PASS: Portfolio overview endpoint")
    
    def test_risk_radar(self):
        """Risk tab - GET /api/echo-stratus/portfolio/risk-radar"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/portfolio/risk-radar")
        assert response.status_code == 200, f"Risk radar failed: {response.status_code}"
        print("PASS: Risk radar endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
