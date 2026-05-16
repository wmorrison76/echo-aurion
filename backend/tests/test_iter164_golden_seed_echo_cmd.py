"""
Iteration 164 — Golden Seed SDK + EchoCommandBar Tests
=======================================================
Tests:
1. GET /api/seed/pillars → 200, returns 7 pillars (no auth)
2. GET /api/seed/manifest → 200, returns 6 templates + manifest (no auth)
3. GET /api/seed/spawns → 401 without admin token, 200 with admin token
4. POST /api/seed/spawn → creates spawn record, returns spawn_id + download_url (admin-gated)
5. GET /api/seed/download/{spawn_id} → streams .tar.gz tarball (admin-gated)
6. Regression: /api/pastry/admin/subscribers → 401 without token, 200 with token
"""
import pytest
import requests
import os
import tarfile
import io
import json

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc")


class TestGoldenSeedPublicEndpoints:
    """Public endpoints (no auth required)"""

    def test_get_pillars_returns_7_pillars(self):
        """GET /api/seed/pillars → 200, returns 7 pillars"""
        r = requests.get(f"{BASE_URL}/api/seed/pillars")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "pillars" in data, "Response should have 'pillars' key"
        assert len(data["pillars"]) == 7, f"Expected 7 pillars, got {len(data['pillars'])}"
        pillar_ids = [p["id"] for p in data["pillars"]]
        expected_ids = ["brain", "spine", "sidebar", "stripe-standalone", "auth", "observability", "cognition"]
        for pid in expected_ids:
            assert pid in pillar_ids, f"Missing pillar: {pid}"
        print(f"✓ GET /api/seed/pillars → 200, 7 pillars: {pillar_ids}")

    def test_get_manifest_returns_6_templates(self):
        """GET /api/seed/manifest → 200, returns 6 templates + manifest"""
        r = requests.get(f"{BASE_URL}/api/seed/manifest")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "templates" in data, "Response should have 'templates' key"
        assert len(data["templates"]) == 6, f"Expected 6 templates, got {len(data['templates'])}"
        template_ids = [t["id"] for t in data["templates"]]
        expected_ids = ["stripe-standalone", "ai-studio", "admin-dashboard", "public-share-link", "notifications-panel", "cake-viewer-3d"]
        for tid in expected_ids:
            assert tid in template_ids, f"Missing template: {tid}"
        assert "pillars" in data, "Manifest should have 'pillars' key"
        assert len(data["pillars"]) == 7, f"Expected 7 pillars in manifest, got {len(data['pillars'])}"
        print(f"✓ GET /api/seed/manifest → 200, 6 templates: {template_ids}")


class TestGoldenSeedAdminEndpoints:
    """Admin-gated endpoints (require X-Admin-Token)"""

    def test_get_spawns_without_token_returns_401(self):
        """GET /api/seed/spawns without admin token → 401"""
        r = requests.get(f"{BASE_URL}/api/seed/spawns")
        assert r.status_code == 401, f"Expected 401 without token, got {r.status_code}"
        print("✓ GET /api/seed/spawns without token → 401")

    def test_get_spawns_with_token_returns_200(self):
        """GET /api/seed/spawns with admin token → 200"""
        r = requests.get(f"{BASE_URL}/api/seed/spawns", headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, f"Expected 200 with token, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "spawns" in data, "Response should have 'spawns' key"
        assert isinstance(data["spawns"], list), "spawns should be a list"
        print(f"✓ GET /api/seed/spawns with token → 200, {len(data['spawns'])} spawns")

    def test_post_spawn_creates_record_and_returns_download_url(self):
        """POST /api/seed/spawn → creates spawn record, returns spawn_id + download_url"""
        payload = {
            "name": "TEST_Iter164_Platform",
            "domain": "test.example.com",
            "templates": ["stripe-standalone", "admin-dashboard"],
            "brand_color": "#ff5500",
            "owner_email": "test@iter164.com",
            "notes": "Test spawn from iter164 pytest"
        }
        r = requests.post(
            f"{BASE_URL}/api/seed/spawn",
            headers={"X-Admin-Token": ADMIN_TOKEN, "Content-Type": "application/json"},
            json=payload
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "spawn_id" in data, "Response should have spawn_id"
        assert "download_url" in data, "Response should have download_url"
        assert "spec" in data, "Response should have spec"
        spec = data["spec"]
        assert spec["name"] == payload["name"], f"Name mismatch: {spec['name']}"
        assert spec["domain"] == payload["domain"], f"Domain mismatch: {spec['domain']}"
        assert spec["templates"] == payload["templates"], f"Templates mismatch: {spec['templates']}"
        assert spec["brand_color"] == payload["brand_color"], f"Brand color mismatch: {spec['brand_color']}"
        assert spec["owner_email"] == payload["owner_email"], f"Owner email mismatch: {spec['owner_email']}"
        assert spec["status"] == "provisioned", f"Status should be 'provisioned', got {spec['status']}"
        print(f"✓ POST /api/seed/spawn → 200, spawn_id={data['spawn_id']}, download_url={data['download_url']}")
        # Store spawn_id for download test
        TestGoldenSeedAdminEndpoints._spawn_id = data["spawn_id"]
        TestGoldenSeedAdminEndpoints._spawn_slug = spec["slug"]

    def test_download_spawn_returns_tarball_with_spawn_json(self):
        """GET /api/seed/download/{spawn_id} → streams .tar.gz with SPAWN.json"""
        spawn_id = getattr(TestGoldenSeedAdminEndpoints, "_spawn_id", None)
        spawn_slug = getattr(TestGoldenSeedAdminEndpoints, "_spawn_slug", "test-iter164-platform")
        if not spawn_id:
            # Create a spawn first
            payload = {"name": "TEST_Download_Platform", "templates": ["stripe-standalone"]}
            r = requests.post(
                f"{BASE_URL}/api/seed/spawn",
                headers={"X-Admin-Token": ADMIN_TOKEN, "Content-Type": "application/json"},
                json=payload
            )
            assert r.status_code == 200, f"Failed to create spawn: {r.text[:200]}"
            data = r.json()
            spawn_id = data["spawn_id"]
            spawn_slug = data["spec"]["slug"]

        r = requests.get(
            f"{BASE_URL}/api/seed/download/{spawn_id}",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        assert r.headers.get("Content-Type") == "application/gzip", f"Expected application/gzip, got {r.headers.get('Content-Type')}"
        
        # Verify it's a valid tarball with SPAWN.json
        buf = io.BytesIO(r.content)
        with tarfile.open(fileobj=buf, mode="r:gz") as tar:
            names = tar.getnames()
            spawn_json_path = f"{spawn_slug}/SPAWN.json"
            assert spawn_json_path in names, f"SPAWN.json not found in tarball. Files: {names[:10]}"
            # Extract and verify SPAWN.json content
            spawn_file = tar.extractfile(spawn_json_path)
            spawn_data = json.loads(spawn_file.read().decode("utf-8"))
            assert spawn_data["id"] == spawn_id, f"SPAWN.json id mismatch: {spawn_data['id']} != {spawn_id}"
        print(f"✓ GET /api/seed/download/{spawn_id} → 200, valid .tar.gz with SPAWN.json")


class TestRegressionPastryAdmin:
    """Regression: Pastry admin endpoints still work"""

    def test_pastry_admin_subscribers_without_token_returns_401(self):
        """GET /api/pastry/admin/subscribers without token → 401"""
        r = requests.get(f"{BASE_URL}/api/pastry/admin/subscribers")
        assert r.status_code == 401, f"Expected 401 without token, got {r.status_code}"
        print("✓ GET /api/pastry/admin/subscribers without token → 401")

    def test_pastry_admin_subscribers_with_token_returns_200(self):
        """GET /api/pastry/admin/subscribers with token → 200"""
        r = requests.get(f"{BASE_URL}/api/pastry/admin/subscribers", headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200, f"Expected 200 with token, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "subscribers" in data, "Response should have 'subscribers' key"
        print(f"✓ GET /api/pastry/admin/subscribers with token → 200, {len(data['subscribers'])} subscribers")


class TestRegressionExistingRoutes:
    """Regression: Existing routes still work"""

    def test_health_endpoint(self):
        """GET /api/health → 200"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("status") == "healthy", f"Expected healthy, got {data.get('status')}"
        print("✓ GET /api/health → 200, healthy")

    def test_pastry_packages(self):
        """GET /api/pastry/packages → 200"""
        r = requests.get(f"{BASE_URL}/api/pastry/packages")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/pastry/packages → 200")

    def test_beo_packages(self):
        """GET /api/beo-standalone/packages → 200"""
        r = requests.get(f"{BASE_URL}/api/beo-standalone/packages")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/beo-standalone/packages → 200")

    def test_eng_ops_stratus_plans(self):
        """GET /api/eng-ops/stratus/plans → 200"""
        r = requests.get(f"{BASE_URL}/api/eng-ops/stratus/plans")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/eng-ops/stratus/plans → 200")
