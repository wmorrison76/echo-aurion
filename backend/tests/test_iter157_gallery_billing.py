"""
Iteration 157 — Pastry Gallery + Recurring Monthly Billing Tests

Tests:
- GET /api/pastry/gallery — list saved photoreal renders with filters
- PATCH /api/pastry/gallery/{render_id} — update title/tags/favorited
- DELETE /api/pastry/gallery/{render_id} — remove render
- POST /api/pastry/billing/run-monthly — dry-run and real billing
- GET /api/pastry/billing/runs — audit history
- Regression: /api/pastry/admin/subscribers, /api/pastry/packages, /api/health
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestGalleryEndpoints:
    """Gallery list/patch/delete endpoint tests"""

    def test_gallery_list_returns_items(self, api_client):
        """GET /api/pastry/gallery returns items array with renders"""
        r = api_client.get(f"{BASE_URL}/api/pastry/gallery")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        # Should have at least 1 render (rnd-demo-01 seeded)
        assert data["total"] >= 1, f"Expected at least 1 render, got {data['total']}"
        print(f"✓ Gallery list returned {data['total']} renders")

    def test_gallery_list_with_limit(self, api_client):
        """GET /api/pastry/gallery?limit=2 respects limit parameter"""
        r = api_client.get(f"{BASE_URL}/api/pastry/gallery?limit=2")
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) <= 2
        print(f"✓ Gallery limit=2 returned {len(data['items'])} items")

    def test_gallery_list_favorited_only(self, api_client):
        """GET /api/pastry/gallery?favorited_only=true filters to favorites"""
        r = api_client.get(f"{BASE_URL}/api/pastry/gallery?favorited_only=true")
        assert r.status_code == 200
        data = r.json()
        # All returned items should be favorited
        for item in data["items"]:
            assert item.get("favorited") == True, f"Item {item.get('render_id')} not favorited"
        print(f"✓ Favorited-only filter returned {len(data['items'])} favorited items")

    def test_gallery_item_structure(self, api_client):
        """Gallery items have required fields"""
        r = api_client.get(f"{BASE_URL}/api/pastry/gallery?limit=1")
        assert r.status_code == 200
        data = r.json()
        if data["items"]:
            item = data["items"][0]
            assert "render_id" in item
            assert "image_url" in item
            assert "kind" in item
            assert item["kind"] == "photoreal_render"
            print(f"✓ Gallery item has required fields: render_id={item['render_id']}")

    def test_gallery_patch_valid_render(self, api_client):
        """PATCH /api/pastry/gallery/{render_id} updates title/tags"""
        # Use rnd-demo-01 which is seeded
        render_id = "rnd-demo-01"
        patch_data = {
            "title": f"Test Title {uuid.uuid4().hex[:6]}",
            "tags": ["test", "iter157"]
        }
        r = api_client.patch(f"{BASE_URL}/api/pastry/gallery/{render_id}", json=patch_data)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") == True
        assert data.get("updated") >= 1
        print(f"✓ PATCH gallery/{render_id} updated {data['updated']} fields")

    def test_gallery_patch_verify_persistence(self, api_client):
        """PATCH changes persist in subsequent GET"""
        render_id = "rnd-demo-01"
        unique_title = f"Persist Test {uuid.uuid4().hex[:6]}"
        
        # Patch
        r = api_client.patch(f"{BASE_URL}/api/pastry/gallery/{render_id}", json={"title": unique_title})
        assert r.status_code == 200
        
        # Verify via GET
        r2 = api_client.get(f"{BASE_URL}/api/pastry/gallery?limit=10")
        assert r2.status_code == 200
        items = r2.json()["items"]
        found = next((i for i in items if i["render_id"] == render_id), None)
        assert found is not None, f"Render {render_id} not found in gallery"
        assert found["title"] == unique_title, f"Title not persisted: {found['title']} != {unique_title}"
        print(f"✓ PATCH title persisted: {unique_title}")

    def test_gallery_patch_favorited_toggle(self, api_client):
        """PATCH favorited field toggles star"""
        render_id = "rnd-demo-01"
        
        # Get current state
        r = api_client.get(f"{BASE_URL}/api/pastry/gallery?limit=10")
        items = r.json()["items"]
        item = next((i for i in items if i["render_id"] == render_id), None)
        current_fav = item.get("favorited", False)
        
        # Toggle
        r2 = api_client.patch(f"{BASE_URL}/api/pastry/gallery/{render_id}", json={"favorited": not current_fav})
        assert r2.status_code == 200
        
        # Verify
        r3 = api_client.get(f"{BASE_URL}/api/pastry/gallery?limit=10")
        items = r3.json()["items"]
        item = next((i for i in items if i["render_id"] == render_id), None)
        assert item["favorited"] == (not current_fav), "Favorited toggle failed"
        
        # Restore original state
        api_client.patch(f"{BASE_URL}/api/pastry/gallery/{render_id}", json={"favorited": current_fav})
        print(f"✓ Favorited toggle works: {current_fav} → {not current_fav} → {current_fav}")

    def test_gallery_patch_unknown_render_404(self, api_client):
        """PATCH /api/pastry/gallery/{unknown} returns 404"""
        r = api_client.patch(f"{BASE_URL}/api/pastry/gallery/unknown-render-xyz", json={"title": "Test"})
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"
        print("✓ PATCH unknown render returns 404")

    def test_gallery_delete_unknown_render_404(self, api_client):
        """DELETE /api/pastry/gallery/{unknown} returns 404"""
        r = api_client.delete(f"{BASE_URL}/api/pastry/gallery/unknown-render-xyz")
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"
        print("✓ DELETE unknown render returns 404")


class TestBillingEndpoints:
    """Monthly billing run and audit endpoints"""

    def test_billing_dry_run_returns_structure(self, api_client):
        """POST /api/pastry/billing/run-monthly?dry_run=true returns proper structure"""
        r = api_client.post(f"{BASE_URL}/api/pastry/billing/run-monthly?dry_run=true")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "processed" in data
        assert "charged" in data
        assert "skipped" in data
        assert "errors" in data
        assert isinstance(data["charged"], list)
        assert isinstance(data["skipped"], list)
        assert isinstance(data["errors"], list)
        print(f"✓ Dry-run billing: processed={data['processed']}, charged={len(data['charged'])}")

    def test_billing_dry_run_no_stripe_sessions(self, api_client):
        """Dry-run should NOT create Stripe sessions (charged items have dry_run=True)"""
        r = api_client.post(f"{BASE_URL}/api/pastry/billing/run-monthly?dry_run=true")
        assert r.status_code == 200
        data = r.json()
        for charged in data["charged"]:
            assert charged.get("dry_run") == True, f"Charged item missing dry_run=True: {charged}"
            assert "checkout_url" not in charged, "Dry-run should not have checkout_url"
            assert "session_id" not in charged, "Dry-run should not have session_id"
        print(f"✓ Dry-run correctly marks charged items with dry_run=True, no Stripe sessions")

    def test_billing_runs_audit_history(self, api_client):
        """GET /api/pastry/billing/runs returns audit history"""
        r = api_client.get(f"{BASE_URL}/api/pastry/billing/runs")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "runs" in data
        assert "total" in data
        assert isinstance(data["runs"], list)
        # Should have at least 1 run from previous tests
        if data["runs"]:
            run = data["runs"][0]
            assert "id" in run
            assert "run_at" in run
            assert "dry_run" in run
            assert "processed" in run
            assert "charged_count" in run
            print(f"✓ Billing runs audit: {data['total']} runs, latest: {run['run_at']}")
        else:
            print("✓ Billing runs audit: 0 runs (empty)")

    def test_billing_runs_sorted_newest_first(self, api_client):
        """Billing runs are sorted newest first"""
        r = api_client.get(f"{BASE_URL}/api/pastry/billing/runs?limit=10")
        assert r.status_code == 200
        data = r.json()
        runs = data["runs"]
        if len(runs) >= 2:
            # Verify descending order by run_at
            for i in range(len(runs) - 1):
                assert runs[i]["run_at"] >= runs[i+1]["run_at"], "Runs not sorted newest first"
            print(f"✓ Billing runs sorted newest first ({len(runs)} runs)")
        else:
            print(f"✓ Billing runs: only {len(runs)} run(s), cannot verify sort order")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""

    def test_health_endpoint(self, api_client):
        """GET /api/health returns healthy"""
        r = api_client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint healthy")

    def test_admin_subscribers_endpoint(self, api_client):
        """GET /api/pastry/admin/subscribers returns subscriber data"""
        r = api_client.get(f"{BASE_URL}/api/pastry/admin/subscribers")
        assert r.status_code == 200
        data = r.json()
        assert "subscribers" in data
        assert "total_subscribers" in data
        assert "active_subscribers" in data
        assert "mrr_usd" in data
        assert "lifetime_revenue_usd" in data
        # Should have seeded subscribers
        assert data["total_subscribers"] >= 2, f"Expected at least 2 subscribers, got {data['total_subscribers']}"
        print(f"✓ Admin subscribers: {data['total_subscribers']} total, MRR=${data['mrr_usd']}")

    def test_packages_endpoint(self, api_client):
        """GET /api/pastry/packages returns pricing info"""
        r = api_client.get(f"{BASE_URL}/api/pastry/packages")
        assert r.status_code == 200
        data = r.json()
        assert "packages" in data
        assert "stripe_enabled" in data
        assert data["stripe_enabled"] == True
        assert "standalone_monthly" in data["packages"]
        pkg = data["packages"]["standalone_monthly"]
        assert pkg["amount"] == 299.00
        assert pkg["setup_usd"] == 250.00
        assert pkg["monthly_usd"] == 49.00
        print(f"✓ Packages endpoint: standalone_monthly=${pkg['amount']}")

    def test_pastry_landing_route(self, api_client):
        """Pastry landing page is accessible"""
        r = api_client.get(f"{BASE_URL}/pastry", allow_redirects=True)
        # Frontend route - should return HTML or redirect
        assert r.status_code in [200, 304], f"Expected 200/304, got {r.status_code}"
        print("✓ /pastry route accessible")

    def test_root_dashboard_route(self, api_client):
        """Root dashboard is accessible"""
        r = api_client.get(f"{BASE_URL}/", allow_redirects=True)
        assert r.status_code in [200, 304], f"Expected 200/304, got {r.status_code}"
        print("✓ Root / route accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
