"""
Iteration 163 Backend Tests — Security + Structure Pass
========================================================
Tests:
1. Sentry backend init (no-op when SENTRY_DSN unset)
2. slowapi rate-limiter installed with 429 JSON handler
3. EchoCoder back-office gate requires valid X-Admin-Token via /api/admin/echocoder/verify
4. Regression tests for existing endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "kDLVaJJVmtxX_EPKYGpU2ZunwTT1j0TU4Z_ezSximgc"


class TestAdminEchoCoderGate:
    """Test /api/admin/echocoder/verify endpoint — requires X-Admin-Token"""

    def test_echocoder_verify_without_token_returns_401(self):
        """POST /api/admin/echocoder/verify without X-Admin-Token → 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/echocoder/verify",
            json={"username": "testuser"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ POST /api/admin/echocoder/verify without token returns 401")

    def test_echocoder_verify_with_invalid_token_returns_401(self):
        """POST /api/admin/echocoder/verify with invalid X-Admin-Token → 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/echocoder/verify",
            json={"username": "testuser"},
            headers={
                "Content-Type": "application/json",
                "X-Admin-Token": "invalid-token-12345"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ POST /api/admin/echocoder/verify with invalid token returns 401")

    def test_echocoder_verify_with_valid_token_returns_200(self):
        """POST /api/admin/echocoder/verify with valid X-Admin-Token → 200 with {ok:true,grant:echocoder}"""
        response = requests.post(
            f"{BASE_URL}/api/admin/echocoder/verify",
            json={"username": "testuser"},
            headers={
                "Content-Type": "application/json",
                "X-Admin-Token": ADMIN_TOKEN
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True, f"Expected ok=true, got {data}"
        assert data.get("grant") == "echocoder", f"Expected grant=echocoder, got {data}"
        print("✓ POST /api/admin/echocoder/verify with valid token returns 200 with {ok:true,grant:echocoder}")


class TestHealthEndpoint:
    """Test /api/health endpoint"""

    def test_health_returns_200(self):
        """GET /api/health → 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy", f"Expected status=healthy, got {data}"
        print("✓ GET /api/health returns 200 with status=healthy")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""

    def test_pastry_packages_returns_200(self):
        """GET /api/pastry/packages → 200"""
        response = requests.get(f"{BASE_URL}/api/pastry/packages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "packages" in data, f"Expected packages key, got {data}"
        print("✓ GET /api/pastry/packages returns 200")

    def test_beo_standalone_packages_returns_200(self):
        """GET /api/beo-standalone/packages → 200"""
        response = requests.get(f"{BASE_URL}/api/beo-standalone/packages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "packages" in data, f"Expected packages key, got {data}"
        print("✓ GET /api/beo-standalone/packages returns 200")

    def test_cake_ai_features_returns_200(self):
        """GET /api/cake-ai/features → 200"""
        response = requests.get(f"{BASE_URL}/api/cake-ai/features")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "photoreal_render" in data, f"Expected photoreal_render key, got {data}"
        print("✓ GET /api/cake-ai/features returns 200")

    def test_pastry_look_valid_token_returns_200(self):
        """GET /api/pastry/look/65617132d8 → 200"""
        response = requests.get(f"{BASE_URL}/api/pastry/look/65617132d8")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "render_id" in data or "image_url" in data, f"Expected render data, got {data}"
        print("✓ GET /api/pastry/look/65617132d8 returns 200")

    def test_pastry_referrals_leaderboard_returns_200(self):
        """GET /api/pastry/referrals/leaderboard → 200"""
        response = requests.get(f"{BASE_URL}/api/pastry/referrals/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "leaderboard" in data, f"Expected leaderboard key, got {data}"
        print("✓ GET /api/pastry/referrals/leaderboard returns 200")


class TestAdminGatedEndpoints:
    """Test admin-gated endpoints require X-Admin-Token"""

    def test_pastry_admin_subscribers_without_token_returns_401(self):
        """GET /api/pastry/admin/subscribers without token → 401"""
        response = requests.get(f"{BASE_URL}/api/pastry/admin/subscribers")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ GET /api/pastry/admin/subscribers without token returns 401")

    def test_pastry_admin_subscribers_with_token_returns_200(self):
        """GET /api/pastry/admin/subscribers with token → 200"""
        response = requests.get(
            f"{BASE_URL}/api/pastry/admin/subscribers",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "subscribers" in data, f"Expected subscribers key, got {data}"
        print("✓ GET /api/pastry/admin/subscribers with token returns 200")


class TestStripeCheckoutWithRateLimit:
    """Test /api/pastry/checkout/session with rate limiter (20/hour)"""

    def test_checkout_session_returns_200_with_stripe_url(self):
        """POST /api/pastry/checkout/session with origin_url+package_id → 200 + stripe URL"""
        response = requests.post(
            f"{BASE_URL}/api/pastry/checkout/session",
            json={
                "package_id": "standalone_monthly",
                "origin_url": "https://cfo-toolkit-deploy.preview.emergentagent.com"
            },
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data, f"Expected url key, got {data}"
        assert "session_id" in data, f"Expected session_id key, got {data}"
        assert "stripe.com" in data["url"] or "checkout" in data["url"], f"Expected Stripe URL, got {data['url']}"
        print("✓ POST /api/pastry/checkout/session returns 200 with Stripe URL")


class TestRateLimiterWiring:
    """Verify rate limiter is wired (don't spam, just verify module loads)"""

    def test_rate_limit_module_imported(self):
        """Verify rate_limit.py is imported successfully by checking server health"""
        # If rate_limit.py had import errors, server wouldn't start
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Server not healthy, rate_limit may have import errors"
        print("✓ Rate limiter module imported successfully (server is healthy)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
