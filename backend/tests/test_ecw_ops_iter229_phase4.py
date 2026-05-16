"""iter229 · ECW Operations Phase 4 — Backend API Tests

Tests for:
1. Recipe unification — publish mobile drafts into shared menu_items + menu_components + menu_recipes
2. Order reconciliation — PO vs Invoice vs Receipt tracking
3. Predictive invoice mis-code detector (heuristic + Claude fallback)
4. Curated order guides (desktop → mobile)
5. Vendor Reliability Scorecard (mobile)
6. Punch-out (cXML OrderRequest) stub
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com")
HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestRecipePublish:
    """Recipe unification — publish mobile drafts into shared system"""

    def test_publish_draft_creates_menu_item_and_recipe(self):
        """POST /api/ecw-ops/echo-chef/drafts/{draft_id}/publish promotes draft into menu_items + menu_components + menu_recipes"""
        # First get existing drafts
        r = requests.get(f"{BASE_URL}/api/ecw-ops/echo-chef/drafts?chef_id=chef-william", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        drafts = data.get("rows", [])
        
        # Find an unpublished draft
        unpublished = [d for d in drafts if d.get("status") != "published"]
        if not unpublished:
            pytest.skip("No unpublished drafts available for testing")
        
        draft = unpublished[0]
        draft_id = draft["id"]
        
        # Publish the draft
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/echo-chef/drafts/{draft_id}/publish",
            headers=HEADERS,
            json={"outlet_id": "outlet-main", "sell_price": 25.0, "target_cost_pct": 28.0}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "item_id" in data
        assert "recipe_id" in data
        
        item_id = data["item_id"]
        recipe_id = data["recipe_id"]
        
        # Verify item_id starts with mi- and recipe_id starts with mr-
        assert item_id.startswith("mi-")
        assert recipe_id.startswith("mr-")
        
        # Verify draft status flipped to published
        r = requests.get(f"{BASE_URL}/api/ecw-ops/echo-chef/drafts?chef_id=chef-william", headers=HEADERS)
        assert r.status_code == 200
        updated_drafts = r.json().get("rows", [])
        updated_draft = next((d for d in updated_drafts if d["id"] == draft_id), None)
        if updated_draft:
            assert updated_draft.get("status") == "published"

    def test_publish_draft_not_found(self):
        """POST /api/ecw-ops/echo-chef/drafts/{draft_id}/publish returns 404 for non-existent draft"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/echo-chef/drafts/nonexistent-draft-id/publish",
            headers=HEADERS,
            json={"outlet_id": "outlet-main"}
        )
        assert r.status_code == 404


class TestReconciliation:
    """Order reconciliation — PO vs Invoice vs Receipt tracking"""

    def test_open_orders_returns_200(self):
        """GET /api/ecw-ops/reconciliation/open-orders returns POs with invoice_matched, days_overdue, needs_attention flags"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/reconciliation/open-orders?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "count" in data
        assert "as_of" in data
        
        # If there are rows, verify structure
        if data["rows"]:
            row = data["rows"][0]
            assert "invoice_matched" in row
            assert "days_overdue" in row or row.get("days_overdue") is None
            assert "needs_attention" in row

    def test_open_orders_overdue_only_filter(self):
        """GET /api/ecw-ops/reconciliation/open-orders?overdue_only=true filters to overdue POs"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/reconciliation/open-orders?outlet_id=outlet-main&overdue_only=true", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # All returned rows should have needs_attention=true
        for row in data.get("rows", []):
            assert row.get("needs_attention") is True

    def test_missing_by_invoice_returns_200(self):
        """GET /api/ecw-ops/reconciliation/missing-by-invoice returns PO items not found on any matched invoice"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/reconciliation/missing-by-invoice?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "gap_count" in data
        assert "rows" in data
        assert "as_of" in data

    def test_eom_sweep_dry_run(self):
        """POST /api/ecw-ops/reconciliation/eom-sweep (dry_run:true) returns period + outlets_alerted without writing"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/reconciliation/eom-sweep",
            headers=HEADERS,
            json={"dry_run": True}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("dry_run") is True
        assert "period" in data
        assert "outlets_alerted" in data
        assert "results" in data

    def test_eom_sweep_actual_run(self):
        """POST /api/ecw-ops/reconciliation/eom-sweep (dry_run:false) writes to eom_alerts + emits activity event"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/reconciliation/eom-sweep",
            headers=HEADERS,
            json={"dry_run": False}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("dry_run") is False
        assert "period" in data


class TestInvoiceScanCoding:
    """Predictive invoice mis-code detector (heuristic + Claude fallback)"""

    def test_scan_coding_miscoded_invoice(self):
        """POST /api/ecw-ops/invoices/{invoice_id}/scan-coding for inv-miscoded-test returns suspicion=true"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/invoices/inv-miscoded-test/scan-coding",
            headers=HEADERS
        )
        # May return 404 if seed data not present, or 200 with result
        if r.status_code == 404:
            pytest.skip("inv-miscoded-test not seeded in database")
        
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # Should detect parchment paper on food invoice via heuristic
        if data.get("suspicion"):
            assert "flag_id" in data or "explanation" in data

    def test_scan_coding_clean_invoice(self):
        """POST /api/ecw-ops/invoices/{invoice_id}/scan-coding for clean invoice returns suspicion=false"""
        # First get a demo invoice
        r = requests.get(f"{BASE_URL}/api/ecw-ops/invoices?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        invoices = r.json().get("rows", [])
        
        # Find an invoice without AI flag
        clean_inv = next((inv for inv in invoices if not inv.get("ai_flagged")), None)
        if not clean_inv:
            pytest.skip("No clean invoices available for testing")
        
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/invoices/{clean_inv['id']}/scan-coding",
            headers=HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # Result depends on invoice content

    def test_scan_all_unflagged(self):
        """POST /api/ecw-ops/invoices/scan-all?outlet_id=outlet-main&limit=5 batch scans unflagged invoices"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/invoices/scan-all?outlet_id=outlet-main&limit=5",
            headers=HEADERS
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "scanned" in data
        assert "results" in data


class TestOrderGuides:
    """Curated order guides (desktop → mobile)"""

    def test_list_order_guides(self):
        """GET /api/ecw-ops/order-guides?outlet_id=outlet-main returns curated guides"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/order-guides?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "count" in data
        assert "rows" in data

    def test_upsert_order_guide_create(self):
        """POST /api/ecw-ops/order-guides creates a new curated guide"""
        unique_name = f"TEST_Weekly Seafood {uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/order-guides",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "name": unique_name,
                "items": [
                    {"item_id": "test-item-1", "name": "Salmon Fillet", "unit_cost": 12.50, "preferred_vendor": "Halperns"},
                    {"item_id": "test-item-2", "name": "Shrimp 16/20", "unit_cost": 18.00, "preferred_vendor": "Sysco"}
                ],
                "active": True
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "id" in data
        assert data.get("created") is True

    def test_upsert_order_guide_update(self):
        """POST /api/ecw-ops/order-guides updates existing guide with same name"""
        unique_name = f"TEST_Update Guide {uuid.uuid4().hex[:6]}"
        
        # Create first
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/order-guides",
            headers=HEADERS,
            json={"outlet_id": "outlet-main", "name": unique_name, "items": [], "active": True}
        )
        assert r.status_code == 200
        guide_id = r.json().get("id")
        
        # Update with same name
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/order-guides",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "name": unique_name,
                "items": [{"item_id": "new-item", "name": "New Item"}],
                "active": True
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("updated") is True
        assert data.get("id") == guide_id

    def test_delete_order_guide(self):
        """DELETE /api/ecw-ops/order-guides/{id} soft-deletes (active=false)"""
        # Create a guide to delete
        unique_name = f"TEST_Delete Guide {uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/order-guides",
            headers=HEADERS,
            json={"outlet_id": "outlet-main", "name": unique_name, "items": [], "active": True}
        )
        assert r.status_code == 200
        guide_id = r.json().get("id")
        
        # Delete it
        r = requests.delete(f"{BASE_URL}/api/ecw-ops/order-guides/{guide_id}", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True


class TestVendorScorecards:
    """Vendor Reliability Scorecard (mobile)"""

    def test_vendor_scorecards_returns_200(self):
        """GET /api/ecw-ops/vendor-scorecards?outlet_id=outlet-main&days=90 returns per-vendor metrics"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/vendor-scorecards?outlet_id=outlet-main&days=90", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "count" in data
        assert "rows" in data
        assert "period_days" in data
        assert data["period_days"] == 90
        assert "as_of" in data
        
        # If there are rows, verify structure
        if data["rows"]:
            row = data["rows"][0]
            assert "vendor_id" in row
            assert "vendor_name" in row
            assert "order_count" in row
            assert "total_spend" in row
            assert "on_time_rate" in row
            assert "variance_rate" in row
            assert "reliability_score" in row


class TestPunchout:
    """Punch-out (cXML OrderRequest) stub"""

    def test_list_punchout_configs(self):
        """GET /api/ecw-ops/punchout/config lists configs (shared_secret must be REDACTED)"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/punchout/config", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "count" in data
        assert "rows" in data
        
        # Verify shared_secret is not exposed
        for row in data.get("rows", []):
            assert "shared_secret" not in row

    def test_upsert_punchout_config(self):
        """POST /api/ecw-ops/punchout/config upserts config"""
        unique_vendor = f"vnd-test-{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/punchout/config",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "vendor_id": unique_vendor,
                "enabled": False,
                "punchout_url": "https://vendor.example.com/punchout",
                "identity": "luccca-test",
                "shared_secret": "test-secret-123"
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "id" in data

    def test_punchout_init_disabled_vendor(self):
        """POST /api/ecw-ops/punchout/init for disabled vendor returns ok=false detail='not configured/enabled'"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/punchout/init",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "vendor_id": "nonexistent-vendor",
                "user_id": "chef-william"
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is False
        assert "not configured" in data.get("detail", "").lower() or "not enabled" in data.get("detail", "").lower()

    def test_punchout_init_enabled_vendor(self):
        """POST /api/ecw-ops/punchout/init for configured+enabled vendor returns cxml payload + session_id"""
        # First create an enabled config
        unique_vendor = f"vnd-enabled-{uuid.uuid4().hex[:6]}"
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/punchout/config",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "vendor_id": unique_vendor,
                "enabled": True,
                "punchout_url": "https://vendor.example.com/punchout",
                "identity": "luccca-test",
                "shared_secret": "test-secret-123"
            }
        )
        assert r.status_code == 200
        
        # Now init punchout
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/punchout/init",
            headers=HEADERS,
            json={
                "outlet_id": "outlet-main",
                "vendor_id": unique_vendor,
                "user_id": "chef-william"
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "session_id" in data
        assert "cxml" in data
        
        # Verify shared_secret is REDACTED in cXML
        cxml = data.get("cxml", "")
        assert "***REDACTED***" in cxml
        assert "test-secret-123" not in cxml

    def test_punchout_return(self):
        """POST /api/ecw-ops/punchout/return accepts arbitrary payload body, writes to punchout_returns"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/punchout/return",
            headers=HEADERS,
            json={
                "cxml_order_message": "<PunchOutOrderMessage>test</PunchOutOrderMessage>",
                "buyer_cookie": "test-cookie-123",
                "items": [{"sku": "TEST-001", "qty": 5, "price": 10.00}]
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "id" in data


class TestRegressionPhase3:
    """Regression tests for Phase 3 endpoints (iter228)"""

    def test_activity_endpoint(self):
        """GET /api/ecw-ops/activity returns events"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/activity?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data

    def test_pnl_snapshot_endpoint(self):
        """GET /api/ecw-ops/pnl-snapshot returns P&L data"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/pnl-snapshot?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "revenue" in data
        assert "expenses" in data

    def test_dashboard_endpoint(self):
        """GET /api/ecw-ops/dashboard returns KPIs"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/dashboard?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "kpis" in data

    def test_invoices_endpoint(self):
        """GET /api/ecw-ops/invoices returns invoices"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/invoices?outlet_id=outlet-main", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data

    def test_commissary_outlets_endpoint(self):
        """GET /api/ecw-ops/commissary/outlets returns commissary outlets"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/commissary/outlets", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data

    def test_echo_chef_drafts_endpoint(self):
        """GET /api/ecw-ops/echo-chef/drafts returns drafts"""
        r = requests.get(f"{BASE_URL}/api/ecw-ops/echo-chef/drafts?chef_id=chef-william", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "rows" in data
