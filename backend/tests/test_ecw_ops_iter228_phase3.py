"""
iter228 · ECW Operations Phase 3 — Backend API Tests

Tests for:
- Activity feed (POST/GET /api/ecw-ops/activity)
- P&L snapshot (GET /api/ecw-ops/pnl-snapshot)
- Dashboard (GET /api/ecw-ops/dashboard)
- Invoice drill-down + flagging (GET/POST /api/ecw-ops/invoices/*)
- Delivery notifications (POST /api/ecw-ops/deliveries/notify)
- Commissary outlets + catalog + transfers (GET/POST /api/ecw-ops/commissary/*)
- Echo Chef mimic-style (POST /api/ecw-ops/echo-chef/mimic-style)
- Recipe URL import (POST /api/ecw-ops/recipes/import-url)
"""
import os
import pytest
import requests
import uuid
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com")


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "X-User-Id": "chef-william"
    })
    return session


# ══════════════════════════════════════════════════════════════════════
# 1. Activity Feed Tests
# ══════════════════════════════════════════════════════════════════════

class TestActivityFeed:
    """Activity feed endpoint tests"""

    def test_post_activity_creates_event(self, api_client):
        """POST /api/ecw-ops/activity creates activity event"""
        payload = {
            "outlet_id": "outlet-main",
            "kind": "test_event",
            "title": f"TEST_Activity_{uuid.uuid4().hex[:8]}",
            "detail": "Test activity detail",
            "actor": "chef-william",
            "meta": {"test": True}
        }
        response = api_client.post(f"{BASE_URL}/api/ecw-ops/activity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "event" in data
        assert data["event"]["kind"] == "test_event"
        assert data["event"]["title"].startswith("TEST_Activity_")

    def test_get_activity_returns_events(self, api_client):
        """GET /api/ecw-ops/activity returns events for outlet"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/activity?outlet_id=outlet-main&limit=30")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "count" in data
        # Should have at least the event we just created or synthesized events
        assert isinstance(data["rows"], list)

    def test_get_activity_synthesizes_from_collections(self, api_client):
        """GET /api/ecw-ops/activity synthesizes events from POs, line checks, deliveries"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/activity?outlet_id=outlet-main&limit=50")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        # Check that rows have expected structure
        for row in data.get("rows", [])[:5]:
            assert "id" in row
            assert "kind" in row
            assert "title" in row
            assert "created_at" in row


# ══════════════════════════════════════════════════════════════════════
# 2. P&L Snapshot Tests
# ══════════════════════════════════════════════════════════════════════

class TestPnlSnapshot:
    """P&L snapshot endpoint tests"""

    def test_pnl_snapshot_forecast_returns_200(self, api_client):
        """GET /api/ecw-ops/pnl-snapshot?compare=forecast returns valid response"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/pnl-snapshot?outlet_id=outlet-main&compare=forecast")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        # Check required fields
        assert "revenue" in data
        assert "expenses" in data
        assert "banners" in data
        assert "percentages" in data
        # Revenue should have actual > 0 (demo seed)
        assert data["revenue"]["actual"] > 0
        # Banners should have food and labor keys
        assert "food" in data["banners"]
        assert "labor" in data["banners"]
        # Each banner should have color
        assert "color" in data["banners"]["food"]
        assert data["banners"]["food"]["color"] in ["red", "green", "amber", "neutral"]

    def test_pnl_snapshot_budget_returns_200(self, api_client):
        """GET /api/ecw-ops/pnl-snapshot?compare=budget returns valid response"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/pnl-snapshot?outlet_id=outlet-main&compare=budget")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("compare_to") == "budget"
        assert "revenue" in data
        assert "expenses" in data
        assert "banners" in data

    def test_pnl_snapshot_has_percentages(self, api_client):
        """P&L snapshot includes food_pct, labor_pct, and targets"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/pnl-snapshot?outlet_id=outlet-main&compare=forecast")
        assert response.status_code == 200
        data = response.json()
        pct = data.get("percentages", {})
        assert "food_pct" in pct
        assert "labor_pct" in pct
        assert "food_pct_target" in pct
        assert "labor_pct_target" in pct


# ══════════════════════════════════════════════════════════════════════
# 3. Dashboard Tests
# ══════════════════════════════════════════════════════════════════════

class TestDashboard:
    """Dashboard endpoint tests"""

    def test_dashboard_returns_kpis(self, api_client):
        """GET /api/ecw-ops/dashboard returns KPIs"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/dashboard?outlet_id=outlet-main")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "kpis" in data
        kpis = data["kpis"]
        # Check all required KPI fields
        assert "today_sales" in kpis
        assert "today_covers" in kpis
        assert "open_pos" in kpis
        assert "open_requisitions" in kpis
        assert "deliveries_today" in kpis
        assert "flagged_invoices" in kpis


# ══════════════════════════════════════════════════════════════════════
# 4. Invoice Tests
# ══════════════════════════════════════════════════════════════════════

class TestInvoices:
    """Invoice drill-down and flagging tests"""

    def test_list_invoices_returns_demo_seed(self, api_client):
        """GET /api/ecw-ops/invoices returns demo-seeded invoices when empty"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/invoices?outlet_id=outlet-main")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        # Should have at least demo invoices
        assert len(data["rows"]) >= 1

    def test_get_invoice_by_id_returns_invoice(self, api_client):
        """GET /api/ecw-ops/invoices/{invoice_id} returns single invoice with line_items"""
        # Use demo invoice ID
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/invoices/inv-demo-1")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "invoice" in data
        inv = data["invoice"]
        assert "line_items" in inv
        assert isinstance(inv["line_items"], list)

    def test_flag_invoice_creates_flag(self, api_client):
        """POST /api/ecw-ops/invoices/{invoice_id}/flag creates flag and activity event"""
        payload = {
            "reason": "coding_error",
            "comment": f"TEST_Flag_{uuid.uuid4().hex[:8]} - GL code incorrect",
            "notify_accounting": True,
            "notify_outlet_managers": True
        }
        response = api_client.post(f"{BASE_URL}/api/ecw-ops/invoices/inv-demo-1/flag", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "flag" in data
        assert data["flag"]["reason"] == "coding_error"
        assert "notified_count" in data
        assert data["notified_count"] >= 0

    def test_resolve_flag(self, api_client):
        """POST /api/ecw-ops/invoices/{invoice_id}/resolve-flag resolves the flag"""
        # First create a flag
        flag_payload = {
            "reason": "price",
            "comment": f"TEST_ResolveFlag_{uuid.uuid4().hex[:8]}"
        }
        flag_resp = api_client.post(f"{BASE_URL}/api/ecw-ops/invoices/inv-demo-2/flag", json=flag_payload)
        assert flag_resp.status_code == 200
        flag_id = flag_resp.json()["flag"]["id"]

        # Now resolve it
        response = api_client.post(
            f"{BASE_URL}/api/ecw-ops/invoices/inv-demo-2/resolve-flag?flag_id={flag_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert data.get("resolved") is True


# ══════════════════════════════════════════════════════════════════════
# 5. Delivery Notifications Tests
# ══════════════════════════════════════════════════════════════════════

class TestDeliveryNotifications:
    """Delivery notification tests"""

    def test_notify_delivery_creates_event(self, api_client):
        """POST /api/ecw-ops/deliveries/notify creates delivery and activity event"""
        payload = {
            "outlet_id": "outlet-main",
            "vendor_name": f"TEST_Vendor_{uuid.uuid4().hex[:6]}",
            "driver": "John Driver",
            "note": "3 cases of produce"
        }
        response = api_client.post(f"{BASE_URL}/api/ecw-ops/deliveries/notify", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "delivery" in data
        assert data["delivery"]["vendor_name"].startswith("TEST_Vendor_")
        assert data["delivery"]["driver"] == "John Driver"


# ══════════════════════════════════════════════════════════════════════
# 6. Commissary Tests
# ══════════════════════════════════════════════════════════════════════

class TestCommissary:
    """Commissary outlets, catalog, and transfer tests"""

    def test_commissary_outlets_returns_3_seeds(self, api_client):
        """GET /api/ecw-ops/commissary/outlets returns 3 seeded outlets"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/commissary/outlets")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        # Should have 3 commissary outlets (Production, Pastry, Storeroom)
        assert len(data["rows"]) >= 3
        kinds = [r["kind"] for r in data["rows"]]
        assert "production" in kinds
        assert "pastry" in kinds
        assert "storeroom" in kinds

    def test_commissary_catalog_returns_items(self, api_client):
        """GET /api/ecw-ops/commissary/catalog?commissary_id=com-pastry returns items"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/commissary/catalog?commissary_id=com-pastry")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        # Should have seeded items (6 per commissary)
        assert len(data["rows"]) >= 6
        # Check item structure
        for item in data["rows"][:3]:
            assert "name" in item
            assert "unit_cost" in item
            assert "pack_size" in item

    def test_commissary_transfer_request_creates_transfer(self, api_client):
        """POST /api/ecw-ops/commissary/transfer-request creates transfer and activity event"""
        payload = {
            "source_commissary_id": "com-pastry",
            "dest_outlet_id": "outlet-main",
            "items": [
                {"item_id": "test-item-1", "name": "Brioche loaf", "qty": 5},
                {"item_id": "test-item-2", "name": "Croissants", "qty": 12}
            ],
            "note": f"TEST_Transfer_{uuid.uuid4().hex[:8]}"
        }
        response = api_client.post(f"{BASE_URL}/api/ecw-ops/commissary/transfer-request", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "transfer" in data
        assert data["transfer"]["status"] == "pending"
        assert data["transfer"]["item_count"] == 2

    def test_list_commissary_transfers(self, api_client):
        """GET /api/ecw-ops/commissary/transfer-requests lists requests"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/commissary/transfer-requests")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert isinstance(data["rows"], list)


# ══════════════════════════════════════════════════════════════════════
# 7. Echo Chef Tests
# ══════════════════════════════════════════════════════════════════════

class TestEchoChef:
    """Echo Chef mimic-style recipe generation tests"""

    def test_echo_chef_mimic_style_returns_draft(self, api_client):
        """POST /api/ecw-ops/echo-chef/mimic-style returns draft_id, signature, recipe"""
        payload = {
            "menu_item_name": "Maryland Crab Cakes",
            "chef_id": "chef-william",
            "reference_recipe_name": "crab cake",
            "instructions": "Old Bay heavy, jumbo lump only, pan-seared",
            "servings": 4
        }
        response = api_client.post(f"{BASE_URL}/api/ecw-ops/echo-chef/mimic-style", json=payload, timeout=60)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        # Required fields per spec
        assert "draft_id" in data
        assert "signature" in data
        assert "dominant" in data
        assert "prior_recipe_count" in data
        assert "recipe" in data
        # Recipe can have error field if LLM unavailable, or actual recipe
        recipe = data["recipe"]
        assert isinstance(recipe, dict)
        # Either has recipe content or error field
        has_content = "name" in recipe or "ingredients" in recipe
        has_error = "error" in recipe
        assert has_content or has_error, "Recipe should have content or error field"

    def test_echo_chef_drafts_list(self, api_client):
        """GET /api/ecw-ops/echo-chef/drafts?chef_id=chef-william lists drafts"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/echo-chef/drafts?chef_id=chef-william")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert isinstance(data["rows"], list)


# ══════════════════════════════════════════════════════════════════════
# 8. Recipe URL Import Tests
# ══════════════════════════════════════════════════════════════════════

class TestRecipeImport:
    """Recipe URL import tests"""

    def test_recipe_import_url_parses_recipe(self, api_client):
        """POST /api/ecw-ops/recipes/import-url parses recipe from URL"""
        # Use a well-known recipe URL that has JSON-LD
        payload = {
            "url": "https://www.allrecipes.com/recipe/13013/maryland-crab-cakes/",
            "outlet_id": "outlet-main"
        }
        response = api_client.post(f"{BASE_URL}/api/ecw-ops/recipes/import-url", json=payload, timeout=30)
        # May return 200 with recipe or 502 if site blocks
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") is True
            assert "recipe" in data or "draft_id" in data
        elif response.status_code == 502:
            # Site may block automated access - this is acceptable
            data = response.json()
            assert "detail" in data or "error" in data
        else:
            # Other status codes are unexpected
            assert response.status_code in [200, 502], f"Unexpected status: {response.status_code}"


# ══════════════════════════════════════════════════════════════════════
# 9. Regression Tests (iter225-227 endpoints still work)
# ══════════════════════════════════════════════════════════════════════

class TestRegressionIter225:
    """Regression tests for iter225 endpoints"""

    def test_vendors_endpoint(self, api_client):
        """GET /api/ecw-ops/vendors returns vendors"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/vendors")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_vendor_catalog_endpoint(self, api_client):
        """GET /api/ecw-ops/vendor-catalog returns items"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/vendor-catalog")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_order_guide_endpoint(self, api_client):
        """GET /api/ecw-ops/order-guide returns guide"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/order-guide?outlet_id=outlet-main")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_inventory_levels_endpoint(self, api_client):
        """GET /api/ecw-ops/inventory/levels returns levels"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/inventory/levels?outlet_id=outlet-main")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_stations_endpoint(self, api_client):
        """GET /api/ecw-ops/stations returns stations"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/stations?outlet_id=outlet-main")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True

    def test_recipes_endpoint(self, api_client):
        """GET /api/ecw-ops/recipes returns recipes"""
        response = api_client.get(f"{BASE_URL}/api/ecw-ops/recipes?outlet_id=outlet-main")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
