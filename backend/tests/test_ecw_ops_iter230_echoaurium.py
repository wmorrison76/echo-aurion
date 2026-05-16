"""iter230 · EchoAurium Full P&L + Accrual Reconciliation + GL-separated Invoices

Tests for:
1. POST /api/echoaurium/seed-march-2026 — seeds 8 outlets × 2 periods
2. GET /api/echoaurium/outlets — returns 8 outlets including Pelican (active=false)
3. GET /api/echoaurium/pnl/full — full GL-level P&L with sections/kpis/banners
4. GET /api/echoaurium/pnl/occupancy — resort occupancy metrics
5. POST /api/ecw-ops/reconciliation/accrual-sweep — dry_run + commit
6. GET /api/ecw-ops/reconciliation/accruals — list accruals
7. POST /api/ecw-ops/reconciliation/accruals/{id}/clear — clear accrual
8. GET /api/ecw-ops/reconciliation/at-risk — at-risk summary
9. GET /api/ecw-ops/invoices/{id} — GL code per line item (5001 vs 8210)
"""
import os
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
HEADERS = {"X-User-Id": "chef-william", "Content-Type": "application/json"}


class TestEchoAuriumSeed:
    """Test seeding of William's 8 outlets at Pier Sixty Six"""

    def test_seed_march_2026_returns_lines_written(self):
        """POST /api/echoaurium/seed-march-2026 — seeds 8 outlets × 2 periods"""
        r = requests.post(f"{BASE_URL}/api/echoaurium/seed-march-2026", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("lines_written", 0) > 900, f"Expected >900 lines, got {data.get('lines_written')}"
        assert data.get("occupancy_rows") == 2, f"Expected 2 occupancy rows, got {data.get('occupancy_rows')}"
        assert len(data.get("periods", [])) == 2
        assert data.get("outlets") == 8

    def test_seed_is_idempotent(self):
        """Calling seed twice should not fail"""
        r1 = requests.post(f"{BASE_URL}/api/echoaurium/seed-march-2026", headers=HEADERS)
        assert r1.status_code == 200
        r2 = requests.post(f"{BASE_URL}/api/echoaurium/seed-march-2026", headers=HEADERS)
        assert r2.status_code == 200


class TestEchoAuriumOutlets:
    """Test outlet listing for William's 8 outlets"""

    def test_outlets_returns_8_outlets(self):
        """GET /api/echoaurium/outlets — returns 8 outlets"""
        r = requests.get(f"{BASE_URL}/api/echoaurium/outlets", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("count") == 8, f"Expected 8 outlets, got {data.get('count')}"
        rows = data.get("rows", [])
        assert len(rows) == 8

    def test_outlets_includes_pelican_inactive(self):
        """Pelican outlet should be present with active=false"""
        r = requests.get(f"{BASE_URL}/api/echoaurium/outlets", headers=HEADERS)
        data = r.json()
        rows = data.get("rows", [])
        pelican = next((o for o in rows if o.get("id") == "outlet-pelican"), None)
        assert pelican is not None, "Pelican outlet not found"
        assert pelican.get("active") is False, "Pelican should be inactive"
        assert pelican.get("name") == "Pelican"

    def test_outlets_has_expected_names(self):
        """All 8 outlets should have correct names"""
        r = requests.get(f"{BASE_URL}/api/echoaurium/outlets", headers=HEADERS)
        data = r.json()
        rows = data.get("rows", [])
        names = {o.get("name") for o in rows}
        expected = {"Windows on 66", "Nectar", "Two Club", "Pools", 
                    "Elate Market Cafe", "Saltbreeze", "In-Room Dining", "Pelican"}
        assert names == expected, f"Expected {expected}, got {names}"


class TestEchoAuriumPnlFull:
    """Test full GL-level P&L endpoint"""

    def test_pnl_full_returns_sections(self):
        """GET /api/echoaurium/pnl/full — returns all 5 sections"""
        # Ensure data is seeded
        requests.post(f"{BASE_URL}/api/echoaurium/seed-march-2026", headers=HEADERS)
        
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full?outlet_id=outlet-windows&period=2026-03",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        sections = data.get("sections", {})
        expected_sections = {"revenue", "cogs", "labor", "payroll_related", "other_exp"}
        assert set(sections.keys()) == expected_sections, f"Expected {expected_sections}, got {set(sections.keys())}"

    def test_pnl_full_has_kpis(self):
        """P&L should include KPI metrics"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full?outlet_id=outlet-windows&period=2026-03",
            headers=HEADERS
        )
        data = r.json()
        kpis = data.get("kpis", {})
        
        required_kpis = ["food_cost_pct", "labor_cost_pct", "prime_cost", 
                         "prime_cost_pct", "gross_profit", "departmental_profit"]
        for kpi in required_kpis:
            assert kpi in kpis, f"Missing KPI: {kpi}"

    def test_pnl_full_has_banners(self):
        """P&L should include variance banners for non-revenue sections"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full?outlet_id=outlet-windows&period=2026-03",
            headers=HEADERS
        )
        data = r.json()
        banners = data.get("banners", {})
        
        # Banners should exist for expense sections (not revenue)
        for section in ["cogs", "labor", "payroll_related", "other_exp"]:
            assert section in banners, f"Missing banner for {section}"
            banner = banners[section]
            assert "color" in banner, f"Banner {section} missing color"
            assert banner["color"] in ["red", "green", "neutral"], f"Invalid color: {banner['color']}"

    def test_pnl_full_compare_budget(self):
        """P&L with compare=budget should succeed"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full?outlet_id=outlet-windows&period=2026-03&compare=budget",
            headers=HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("compare_to") == "budget"

    def test_pnl_full_compare_forecast(self):
        """P&L with compare=forecast should succeed"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full?outlet_id=outlet-windows&period=2026-03&compare=forecast",
            headers=HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("compare_to") == "forecast"

    def test_pnl_full_compare_prior_year(self):
        """P&L with compare=prior_year should succeed"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full?outlet_id=outlet-windows&period=2026-03&compare=prior_year",
            headers=HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("compare_to") == "prior_year"

    def test_pnl_full_has_gl_8210_paper_plastics(self):
        """GL 8210 (Paper & Plastics) should exist separately from GL 5001 (Food Cost)"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full?outlet_id=outlet-windows&period=2026-03",
            headers=HEADERS
        )
        data = r.json()
        
        # Check other_exp section for GL 8210
        other_exp = data.get("sections", {}).get("other_exp", {})
        lines = other_exp.get("lines", [])
        gl_codes = [ln.get("gl_code") for ln in lines]
        
        assert "8210" in gl_codes, f"GL 8210 (Paper & Plastics) not found in other_exp. Found: {gl_codes}"
        
        # Check cogs section for GL 5001
        cogs = data.get("sections", {}).get("cogs", {})
        cogs_lines = cogs.get("lines", [])
        cogs_gl_codes = [ln.get("gl_code") for ln in cogs_lines]
        
        assert "5001" in cogs_gl_codes, f"GL 5001 (Food Cost) not found in cogs. Found: {cogs_gl_codes}"


class TestEchoAuriumOccupancy:
    """Test occupancy endpoint"""

    def test_occupancy_returns_metrics(self):
        """GET /api/echoaurium/pnl/occupancy — returns occupancy metrics"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/occupancy?period=2026-03",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        occ = data.get("occupancy", {})
        assert abs(occ.get("occupancy_pct", 0) - 62.7) < 0.5, f"Expected ~62.7%, got {occ.get('occupancy_pct')}"
        assert abs(occ.get("adr", 0) - 558) < 5, f"Expected ~558 ADR, got {occ.get('adr')}"
        assert abs(occ.get("revpar", 0) - 349.97) < 5, f"Expected ~349.97 RevPAR, got {occ.get('revpar')}"


class TestAccrualReconciliation:
    """Test accrual reconciliation endpoints"""

    @pytest.fixture(autouse=True)
    def setup_accrual_test_data(self):
        """Pre-seed required PO and delivery for accrual testing"""
        # Create a test PO
        po_data = {
            "id": "po-accrual-test",
            "outlet_id": "outlet-windows",
            "vendor_id": "vnd-halperns",
            "vendor_name": "Halperns",
            "total": 2480.00,
            "status": "ordered",
            "items": [
                {"item_id": "item-1", "name": "Beef Tender", "qty": 20, "unit_price": 124.00}
            ],
            "created_at": "2026-04-15T10:00:00Z"
        }
        # Insert via direct API or assume it exists
        # For this test, we'll create a delivery that references this PO
        
        # Create a delivery in April 2026 with no invoice
        delivery_data = {
            "outlet_id": "outlet-windows",
            "vendor_id": "vnd-halperns",
            "vendor_name": "Halperns",
            "po_id": "po-accrual-test",
            "driver": "Test Driver",
            "note": "Test delivery for accrual"
        }
        # This will create the delivery
        requests.post(
            f"{BASE_URL}/api/ecw-ops/deliveries/notify",
            headers=HEADERS,
            json=delivery_data
        )

    def test_accrual_sweep_dry_run(self):
        """POST /api/ecw-ops/reconciliation/accrual-sweep with dry_run=true"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/reconciliation/accrual-sweep",
            headers=HEADERS,
            json={"outlet_id": "outlet-windows", "dry_run": True}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "deliveries_scanned" in data
        assert "accruals_needed" in data
        assert "total_to_accrue" in data
        assert data.get("dry_run") is True

    def test_accrual_sweep_commit(self):
        """POST /api/ecw-ops/reconciliation/accrual-sweep with dry_run=false"""
        # First do dry run to get expected values
        dry = requests.post(
            f"{BASE_URL}/api/ecw-ops/reconciliation/accrual-sweep",
            headers=HEADERS,
            json={"outlet_id": "outlet-windows", "dry_run": True}
        ).json()
        
        # Now commit
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/reconciliation/accrual-sweep",
            headers=HEADERS,
            json={"outlet_id": "outlet-windows", "dry_run": False}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("dry_run") is False
        # total_to_accrue should match dry run
        assert data.get("total_to_accrue") == dry.get("total_to_accrue")

    def test_list_accruals(self):
        """GET /api/ecw-ops/reconciliation/accruals — list accruals"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/reconciliation/accruals?outlet_id=outlet-windows",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "totals_by_period" in data

    def test_at_risk_summary(self):
        """GET /api/ecw-ops/reconciliation/at-risk — at-risk summary"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/reconciliation/at-risk?outlet_id=outlet-windows",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "period" in data
        assert "total_at_risk" in data
        assert "po_count" in data
        assert "scanned" in data


class TestAccrualClear:
    """Test clearing accruals when invoice arrives"""

    def test_clear_accrual(self):
        """POST /api/ecw-ops/reconciliation/accruals/{id}/clear — clear accrual"""
        # First list accruals to get an ID
        list_r = requests.get(
            f"{BASE_URL}/api/ecw-ops/reconciliation/accruals",
            headers=HEADERS
        )
        accruals = list_r.json().get("rows", [])
        
        if not accruals:
            # Create one via sweep
            requests.post(
                f"{BASE_URL}/api/ecw-ops/reconciliation/accrual-sweep",
                headers=HEADERS,
                json={"dry_run": False}
            )
            list_r = requests.get(
                f"{BASE_URL}/api/ecw-ops/reconciliation/accruals",
                headers=HEADERS
            )
            accruals = list_r.json().get("rows", [])
        
        if accruals:
            accrual_id = accruals[0].get("id")
            r = requests.post(
                f"{BASE_URL}/api/ecw-ops/reconciliation/accruals/{accrual_id}/clear?invoice_id=inv-test-123",
                headers=HEADERS
            )
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            data = r.json()
            assert data.get("ok") is True
        else:
            pytest.skip("No accruals to clear")


class TestInvoiceGLCodes:
    """Test invoice line items have correct GL codes"""

    def test_invoice_demo_has_gl_separation(self):
        """GET /api/ecw-ops/invoices/{id} — demo fallback has 5 line items with GL separation"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/invoices/inv-demo-anything",
            headers=HEADERS
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        invoice = data.get("invoice", {})
        line_items = invoice.get("line_items", [])
        
        # Demo fallback should return 5 line items
        assert len(line_items) == 5, f"Expected 5 line items, got {len(line_items)}"
        
        # Check GL codes
        gl_codes = [li.get("gl_code") for li in line_items]
        
        # Should have 3 food items on 5001 and 2 paper items on 8210
        assert gl_codes.count("5001") == 3, f"Expected 3 items with GL 5001, got {gl_codes.count('5001')}"
        assert gl_codes.count("8210") == 2, f"Expected 2 items with GL 8210, got {gl_codes.count('8210')}"

    def test_invoice_demo_paper_items_have_8210(self):
        """Paper/disposables items should have GL 8210"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/invoices/inv-demo-1",
            headers=HEADERS
        )
        data = r.json()
        invoice = data.get("invoice", {})
        line_items = invoice.get("line_items", [])
        
        # Find paper items
        paper_items = [li for li in line_items if "paper" in li.get("name", "").lower() 
                       or "container" in li.get("name", "").lower()
                       or "parchment" in li.get("name", "").lower()]
        
        for item in paper_items:
            assert item.get("gl_code") == "8210", f"Paper item '{item.get('name')}' should have GL 8210, got {item.get('gl_code')}"


class TestRegressionPhase4:
    """Regression tests for iter229 Phase 4 endpoints"""

    def test_reconciliation_open_orders(self):
        """GET /api/ecw-ops/reconciliation/open-orders still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/reconciliation/open-orders?outlet_id=outlet-main",
            headers=HEADERS
        )
        assert r.status_code == 200

    def test_vendor_scorecards(self):
        """GET /api/ecw-ops/vendor-scorecards still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/vendor-scorecards?outlet_id=outlet-main",
            headers=HEADERS
        )
        assert r.status_code == 200

    def test_order_guides(self):
        """GET /api/ecw-ops/order-guides still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/order-guides?outlet_id=outlet-main",
            headers=HEADERS
        )
        assert r.status_code == 200


class TestRegressionPhase3:
    """Regression tests for iter228 Phase 3 endpoints"""

    def test_activity_endpoint(self):
        """GET /api/ecw-ops/activity still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/activity?outlet_id=outlet-main",
            headers=HEADERS
        )
        assert r.status_code == 200

    def test_pnl_snapshot_endpoint(self):
        """GET /api/ecw-ops/pnl-snapshot still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/pnl-snapshot?outlet_id=outlet-main",
            headers=HEADERS
        )
        assert r.status_code == 200

    def test_dashboard_endpoint(self):
        """GET /api/ecw-ops/dashboard still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/dashboard?outlet_id=outlet-main",
            headers=HEADERS
        )
        assert r.status_code == 200

    def test_invoices_endpoint(self):
        """GET /api/ecw-ops/invoices still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/invoices?outlet_id=outlet-main",
            headers=HEADERS
        )
        assert r.status_code == 200

    def test_commissary_outlets_endpoint(self):
        """GET /api/ecw-ops/commissary/outlets still works"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/commissary/outlets",
            headers=HEADERS
        )
        assert r.status_code == 200
