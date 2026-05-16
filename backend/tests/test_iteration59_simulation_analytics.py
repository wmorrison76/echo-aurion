"""
Iteration 59: 30-Day Restaurant Simulation & Financial Analytics Tests
=======================================================================
Tests for:
- Simulation endpoints (status, gap-analysis, invoices, pnl-drilldown, purchasing-pipeline)
- EchoAi3 Analytics (business-review, next-month-forecast)
- EchoAurum actuals (P&L without labor double-counting)
- EchoStratus monthly review generation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestSimulationStatus:
    """Test simulation data status endpoint"""
    
    def test_simulation_status_has_data(self):
        """GET /api/simulation/status should return non-zero counts"""
        response = requests.get(f"{BASE_URL}/api/simulation/status")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        print(f"Simulation status: {data}")
        
        # Verify all data types have non-zero counts
        assert data.get("pos_transactions", 0) > 2000, f"Expected >2000 POS transactions, got {data.get('pos_transactions')}"
        assert data.get("invoices", 0) >= 60, f"Expected >=60 invoices, got {data.get('invoices')}"
        assert data.get("gl_entries", 0) >= 100, f"Expected >=100 GL entries, got {data.get('gl_entries')}"
        assert data.get("events", 0) >= 10, f"Expected >=10 events, got {data.get('events')}"
        assert data.get("labor_schedules", 0) >= 100, f"Expected >=100 labor schedules, got {data.get('labor_schedules')}"
        assert data.get("waste_entries", 0) >= 50, f"Expected >=50 waste entries, got {data.get('waste_entries')}"
        assert data.get("purchase_orders", 0) >= 50, f"Expected >=50 POs, got {data.get('purchase_orders')}"
        assert data.get("receiving_logs", 0) >= 50, f"Expected >=50 receiving logs, got {data.get('receiving_logs')}"
        assert data.get("outlets", 0) >= 5, f"Expected >=5 outlets, got {data.get('outlets')}"


class TestSimulationGapAnalysis:
    """Test gap analysis endpoint"""
    
    def test_gap_analysis_returns_gaps_and_kpis(self):
        """GET /api/simulation/gap-analysis should return gaps array and financial_kpis"""
        response = requests.get(f"{BASE_URL}/api/simulation/gap-analysis")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        print(f"Gap analysis keys: {list(data.keys())}")
        
        # Verify structure
        assert "gaps" in data, "Missing 'gaps' array"
        assert "financial_kpis" in data, "Missing 'financial_kpis'"
        assert "data_volumes" in data, "Missing 'data_volumes'"
        
        # Verify financial KPIs
        kpis = data["financial_kpis"]
        assert kpis.get("total_revenue", 0) > 0, "Revenue should be positive"
        assert "food_cost_pct" in kpis, "Missing food_cost_pct"
        assert "labor_pct" in kpis, "Missing labor_pct"
        assert "ebitda" in kpis, "Missing ebitda"
        
        print(f"Financial KPIs: Revenue=${kpis.get('total_revenue'):,.0f}, EBITDA=${kpis.get('ebitda'):,.0f}, Food%={kpis.get('food_cost_pct')}%, Labor%={kpis.get('labor_pct')}%")


class TestSimulationInvoices:
    """Test invoice listing and detail endpoints"""
    
    def test_list_invoices_with_summary(self):
        """GET /api/simulation/invoices should list invoices with summary"""
        response = requests.get(f"{BASE_URL}/api/simulation/invoices")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        assert "invoices" in data, "Missing 'invoices' array"
        assert "summary" in data, "Missing 'summary'"
        
        invoices = data["invoices"]
        assert len(invoices) > 0, "No invoices returned"
        
        # Verify invoice structure
        inv = invoices[0]
        assert "invoice_id" in inv, "Missing invoice_id"
        assert "vendor_name" in inv, "Missing vendor_name"
        assert "total" in inv, "Missing total"
        
        summary = data["summary"]
        assert summary.get("total_invoices", 0) > 0, "No invoices in summary"
        print(f"Invoices: {summary.get('total_invoices')} invoices, total ${summary.get('total_amount'):,.0f}")
    
    def test_invoice_detail_with_po_linkage(self):
        """GET /api/simulation/invoices/{invoice_id} should return invoice with PO linkage"""
        # First get an invoice ID
        list_response = requests.get(f"{BASE_URL}/api/simulation/invoices?limit=1")
        assert list_response.status_code == 200
        invoices = list_response.json().get("invoices", [])
        assert len(invoices) > 0, "No invoices to test"
        
        invoice_id = invoices[0]["invoice_id"]
        
        # Get invoice detail
        response = requests.get(f"{BASE_URL}/api/simulation/invoices/{invoice_id}")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        assert "invoice" in data, "Missing 'invoice'"
        assert "purchase_order" in data, "Missing 'purchase_order'"
        assert "receiving_log" in data, "Missing 'receiving_log'"
        assert "audit_trail" in data, "Missing 'audit_trail'"
        
        # Verify PO linkage
        if data.get("purchase_order"):
            assert data["purchase_order"].get("po_id") == data["invoice"].get("po_id"), "PO ID mismatch"
            print(f"Invoice {invoice_id} linked to PO {data['invoice'].get('po_id')}")


class TestSimulationPnlDrilldown:
    """Test P&L drilldown endpoints"""
    
    def test_pnl_drilldown_food_revenue(self):
        """GET /api/simulation/pnl-drilldown?category=food_revenue should return GL entries"""
        response = requests.get(f"{BASE_URL}/api/simulation/pnl-drilldown?category=food_revenue")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        assert "entries" in data, "Missing 'entries'"
        assert "total" in data, "Missing 'total'"
        assert data.get("category") == "food_revenue", f"Wrong category: {data.get('category')}"
        
        entries = data["entries"]
        assert len(entries) > 0, "No food revenue entries"
        
        # Verify entries are revenue type
        for entry in entries[:5]:
            assert entry.get("gl_code") == "4000", f"Expected GL code 4000, got {entry.get('gl_code')}"
        
        print(f"Food revenue drilldown: {len(entries)} entries, total ${data.get('total'):,.0f}")
    
    def test_pnl_drilldown_labor(self):
        """GET /api/simulation/pnl-drilldown?category=labor should return labor GL entries"""
        response = requests.get(f"{BASE_URL}/api/simulation/pnl-drilldown?category=labor")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        assert "entries" in data, "Missing 'entries'"
        assert data.get("category") == "labor", f"Wrong category: {data.get('category')}"
        
        entries = data["entries"]
        assert len(entries) > 0, "No labor entries"
        
        # Verify entries are labor GL codes (6000, 6010, 6020, 6050)
        labor_codes = {"6000", "6010", "6020", "6050"}
        for entry in entries[:5]:
            assert entry.get("gl_code") in labor_codes, f"Unexpected GL code: {entry.get('gl_code')}"
        
        print(f"Labor drilldown: {len(entries)} entries, total ${data.get('total'):,.0f}")


class TestSimulationPurchasingPipeline:
    """Test purchasing pipeline endpoint"""
    
    def test_purchasing_pipeline_linkage(self):
        """GET /api/simulation/purchasing-pipeline should show PO->Receiving->Invoice linkage"""
        response = requests.get(f"{BASE_URL}/api/simulation/purchasing-pipeline")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        assert "pipeline" in data, "Missing 'pipeline'"
        assert "summary" in data, "Missing 'summary'"
        
        pipeline = data["pipeline"]
        assert len(pipeline) > 0, "No pipeline entries"
        
        summary = data["summary"]
        total_pos = summary.get("total_pos", 0)
        fully_linked = summary.get("fully_linked", 0)
        
        # Verify >90% fully linked
        if total_pos > 0:
            linkage_pct = (fully_linked / total_pos) * 100
            assert linkage_pct >= 90, f"Expected >90% fully linked, got {linkage_pct:.1f}%"
            print(f"Purchasing pipeline: {total_pos} POs, {fully_linked} fully linked ({linkage_pct:.1f}%)")
        
        # Verify pipeline entry structure
        entry = pipeline[0]
        assert "po_id" in entry, "Missing po_id"
        assert "received" in entry, "Missing received flag"
        assert "invoiced" in entry, "Missing invoiced flag"
        assert "complete" in entry, "Missing complete flag"


class TestEchoAi3BusinessReview:
    """Test EchoAi3 business analytics endpoint"""
    
    def test_business_review_returns_full_analysis(self):
        """POST /api/echoai3/analytics/business-review should return comprehensive analysis"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/analytics/business-review",
            json={"include_ai_narrative": True}
        )
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        
        # Verify required fields
        assert "period_summary" in data, "Missing 'period_summary'"
        assert "recommendations" in data, "Missing 'recommendations'"
        assert "top_menu_items" in data, "Missing 'top_menu_items'"
        assert "vendor_analysis" in data, "Missing 'vendor_analysis'"
        assert "ai_narrative" in data, "Missing 'ai_narrative'"
        
        # Verify period summary
        summary = data["period_summary"]
        assert summary.get("total_revenue", 0) > 0, "Revenue should be positive"
        assert "ebitda" in summary, "Missing ebitda"
        assert "food_revenue" in summary, "Missing food_revenue"
        assert "beverage_revenue" in summary, "Missing beverage_revenue"
        
        # Verify top menu items
        top_items = data["top_menu_items"]
        assert len(top_items) > 0, "No top menu items"
        assert "name" in top_items[0], "Missing item name"
        assert "revenue" in top_items[0], "Missing item revenue"
        
        # Verify vendor analysis
        vendors = data["vendor_analysis"]
        assert len(vendors) > 0, "No vendor analysis"
        assert "vendor" in vendors[0], "Missing vendor name"
        assert "total_spend" in vendors[0], "Missing total_spend"
        
        # Verify AI narrative exists (may be error message if LLM fails)
        assert data.get("ai_narrative"), "AI narrative is empty"
        
        print(f"Business review: Revenue=${summary.get('total_revenue'):,.0f}, EBITDA=${summary.get('ebitda'):,.0f}")
        print(f"Top item: {top_items[0].get('name')} (${top_items[0].get('revenue'):,.0f})")
        print(f"AI narrative length: {len(data.get('ai_narrative', ''))} chars")


class TestEchoAi3NextMonthForecast:
    """Test EchoAi3 next-month forecast endpoint"""
    
    def test_next_month_forecast_returns_forecast(self):
        """POST /api/echoai3/analytics/next-month-forecast should return forecast data"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/analytics/next-month-forecast",
            json={"horizon_days": 30, "include_ai": True}
        )
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        
        # Verify required fields
        assert "daily_forecast" in data, "Missing 'daily_forecast'"
        assert "weekly_forecast" in data, "Missing 'weekly_forecast'"
        assert "summary" in data, "Missing 'summary'"
        
        # Verify summary has positive forecast revenue
        summary = data["summary"]
        assert summary.get("forecast_revenue", 0) > 0, f"Forecast revenue should be positive, got {summary.get('forecast_revenue')}"
        assert "forecast_cost" in summary, "Missing forecast_cost"
        assert "forecast_profit" in summary, "Missing forecast_profit"
        assert "forecast_covers" in summary, "Missing forecast_covers"
        
        # Verify daily forecast
        daily = data["daily_forecast"]
        assert len(daily) > 0, "No daily forecast entries"
        assert "date" in daily[0], "Missing date"
        assert "revenue" in daily[0], "Missing revenue"
        assert "confidence" in daily[0], "Missing confidence"
        
        # Verify weekly forecast
        weekly = data["weekly_forecast"]
        assert len(weekly) > 0, "No weekly forecast entries"
        
        print(f"Forecast: Revenue=${summary.get('forecast_revenue'):,.0f}, Profit=${summary.get('forecast_profit'):,.0f}")
        print(f"Daily entries: {len(daily)}, Weekly entries: {len(weekly)}")


class TestEchoAurumActuals:
    """Test EchoAurum actuals endpoint - verify no labor double-counting"""
    
    def test_aurum_actuals_no_double_counting(self):
        """GET /api/echo-stratus/aurum/actuals should not double-count labor"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/aurum/actuals")
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        
        # Verify structure
        assert "annual" in data, "Missing 'annual'"
        assert "monthly" in data, "Missing 'monthly'"
        
        annual = data["annual"]
        
        # Verify EBITDA is positive (around $28K based on simulation)
        ebitda = annual.get("total_ebitda", 0)
        revenue = annual.get("total_revenue", 0)
        labor = annual.get("total_labor", 0)
        
        print(f"EchoAurum Actuals: Revenue=${revenue:,.0f}, Labor=${labor:,.0f}, EBITDA=${ebitda:,.0f}")
        print(f"EBITDA margin: {annual.get('ebitda_margin_pct')}%, Food cost: {annual.get('food_cost_pct')}%, Labor: {annual.get('labor_pct')}%")
        
        # EBITDA should be positive (not negative due to double-counting)
        # Based on simulation: Revenue ~$459K, EBITDA ~$28K (6.1%)
        assert ebitda > 0, f"EBITDA should be positive, got ${ebitda:,.0f} - possible labor double-counting"
        
        # Labor percentage should be reasonable (not >100% which would indicate double-counting)
        labor_pct = annual.get("labor_pct", 0)
        assert labor_pct < 100, f"Labor % is {labor_pct}% - indicates double-counting"


class TestEchoStratusMonthlyReview:
    """Test EchoStratus monthly review generation"""
    
    def test_monthly_review_generation(self):
        """POST /api/echo-stratus/monthly-review/generate should generate review"""
        response = requests.post(
            f"{BASE_URL}/api/echo-stratus/monthly-review/generate",
            json={"month": 0, "year": 0}  # 0 = current month/year
        )
        assert response.status_code == 200, f"Status code: {response.status_code}"
        
        data = response.json()
        
        # Verify required fields
        assert "outlet_reports" in data, "Missing 'outlet_reports'"
        assert "health_summary" in data, "Missing 'health_summary'"
        assert "resort_pnl" in data, "Missing 'resort_pnl'"
        
        # Verify outlet reports
        outlets = data["outlet_reports"]
        assert len(outlets) > 0, "No outlet reports"
        
        outlet = outlets[0]
        assert "name" in outlet, "Missing outlet name"
        assert "pnl" in outlet, "Missing outlet pnl"
        assert "health_score" in outlet, "Missing health_score"
        
        # Verify health summary
        health = data["health_summary"]
        assert "overall_score" in health, "Missing overall_score"
        
        # Verify resort P&L
        resort_pnl = data["resort_pnl"]
        assert resort_pnl.get("revenue", 0) > 0, "Resort revenue should be positive"
        
        print(f"Monthly review: {len(outlets)} outlets, overall health {health.get('overall_score')}/100")
        print(f"Resort P&L: Revenue=${resort_pnl.get('revenue'):,.0f}, EBITDA=${resort_pnl.get('ebitda'):,.0f}")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"Health check passed: {data.get('platform')} v{data.get('version')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
