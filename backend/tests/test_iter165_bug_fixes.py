"""
Iteration 165 Backend Regression Tests
- Golden Seed SDK endpoints (/api/seed/*)
- Health check
- Pastry/BEO/Eng-Ops endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_TOKEN = "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc"


class TestHealthAndRegression:
    """Basic health and regression tests"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "engines" in data
        print("✓ Health endpoint working")
    
    def test_pastry_packages(self):
        """GET /api/pastry/packages returns packages"""
        response = requests.get(f"{BASE_URL}/api/pastry/packages")
        assert response.status_code == 200
        data = response.json()
        assert "packages" in data
        print("✓ Pastry packages endpoint working")
    
    def test_beo_packages(self):
        """GET /api/beo-standalone/packages returns packages"""
        response = requests.get(f"{BASE_URL}/api/beo-standalone/packages")
        assert response.status_code == 200
        data = response.json()
        assert "packages" in data
        print("✓ BEO packages endpoint working")
    
    def test_eng_ops_stratus_plans(self):
        """GET /api/eng-ops/stratus/plans returns plans"""
        response = requests.get(f"{BASE_URL}/api/eng-ops/stratus/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        print("✓ Eng-Ops Stratus plans endpoint working")


class TestGoldenSeedSDK:
    """Golden Seed SDK endpoint tests (iter164 regression)"""
    
    def test_seed_pillars_public(self):
        """GET /api/seed/pillars returns 7 pillars (public)"""
        response = requests.get(f"{BASE_URL}/api/seed/pillars")
        assert response.status_code == 200
        data = response.json()
        assert "pillars" in data
        assert len(data["pillars"]) == 7
        pillar_ids = [p["id"] for p in data["pillars"]]
        assert "brain" in pillar_ids
        assert "spine" in pillar_ids
        assert "cognition" in pillar_ids
        print("✓ Seed pillars endpoint working (7 pillars)")
    
    def test_seed_manifest_public(self):
        """GET /api/seed/manifest returns templates (public)"""
        response = requests.get(f"{BASE_URL}/api/seed/manifest")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) >= 6
        print(f"✓ Seed manifest endpoint working ({len(data['templates'])} templates)")
    
    def test_seed_spawns_requires_auth(self):
        """GET /api/seed/spawns without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/seed/spawns")
        assert response.status_code in [401, 403]
        print("✓ Seed spawns endpoint correctly requires auth")
    
    def test_seed_spawns_with_auth(self):
        """GET /api/seed/spawns with admin token returns spawns"""
        response = requests.get(
            f"{BASE_URL}/api/seed/spawns",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        assert "spawns" in data
        print(f"✓ Seed spawns endpoint working with auth ({len(data['spawns'])} spawns)")


class TestAdminGatedEndpoints:
    """Admin-gated endpoint tests"""
    
    def test_pastry_admin_requires_auth(self):
        """GET /api/pastry/admin/subscribers without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/pastry/admin/subscribers")
        assert response.status_code in [401, 403]
        print("✓ Pastry admin endpoint correctly requires auth")
    
    def test_pastry_admin_with_auth(self):
        """GET /api/pastry/admin/subscribers with admin token returns data"""
        response = requests.get(
            f"{BASE_URL}/api/pastry/admin/subscribers",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert response.status_code == 200
        data = response.json()
        assert "subscribers" in data
        print(f"✓ Pastry admin endpoint working with auth ({len(data['subscribers'])} subscribers)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
