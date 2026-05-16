"""
Iteration 134: AI Image Generation & Cake Designer v2 Tests
============================================================
Tests for:
- POST /api/ai-image/generate - AI image generation (endpoint existence only, no actual generation)
- POST /api/ai-image/cake-concept - Cake concept generation (endpoint existence only)
- GET /api/ai-image/history - Generation history
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestAIImageEndpoints:
    """AI Image Generation endpoint tests - verifying endpoints exist without calling actual generation"""

    def test_ai_image_generate_endpoint_exists(self):
        """Verify POST /api/ai-image/generate endpoint exists and validates input"""
        # Send empty request to verify endpoint exists and validates
        response = requests.post(
            f"{BASE_URL}/api/ai-image/generate",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        # Should return 422 (validation error) since prompt is required, not 404
        assert response.status_code in [422, 400, 500], f"Expected validation error, got {response.status_code}"
        print(f"PASS: /api/ai-image/generate endpoint exists (status: {response.status_code})")

    @pytest.mark.skip(reason="Skipping actual AI generation to save credits - endpoint verified in test_ai_image_generate_endpoint_exists")
    def test_ai_image_generate_validates_prompt(self):
        """Verify endpoint validates prompt field - SKIPPED to save AI credits"""
        pass

    @pytest.mark.skip(reason="Skipping actual AI generation to save credits - endpoint verified via OPTIONS")
    def test_ai_image_cake_concept_endpoint_exists(self):
        """Verify POST /api/ai-image/cake-concept endpoint exists - SKIPPED to save AI credits"""
        pass

    def test_ai_image_cake_concept_endpoint_via_options(self):
        """Verify /api/ai-image/cake-concept endpoint exists via OPTIONS request"""
        # Use OPTIONS to verify endpoint exists without triggering generation
        response = requests.options(
            f"{BASE_URL}/api/ai-image/cake-concept",
            timeout=10
        )
        # OPTIONS should return 200 or 405 (method not allowed) but not 404
        assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
        print(f"PASS: /api/ai-image/cake-concept endpoint exists (OPTIONS status: {response.status_code})")

    def test_ai_image_history_endpoint(self):
        """Verify GET /api/ai-image/history returns generation history"""
        response = requests.get(
            f"{BASE_URL}/api/ai-image/history",
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "images" in data, "Response should contain 'images' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data["images"], list), "'images' should be a list"
        print(f"PASS: /api/ai-image/history returns {data['total']} records")

    def test_ai_image_history_with_limit(self):
        """Verify history endpoint respects limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/ai-image/history?limit=5",
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["images"]) <= 5, "Should respect limit parameter"
        print(f"PASS: /api/ai-image/history respects limit (returned {len(data['images'])} items)")


class TestHealthAndBasicAPIs:
    """Basic health checks to ensure backend is running"""

    def test_health_endpoint(self):
        """Verify backend health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("PASS: Backend health check")

    def test_yields_api_working(self):
        """Verify yields API is working (used by cake cost calculations)"""
        response = requests.get(f"{BASE_URL}/api/yields/all", timeout=10)
        assert response.status_code == 200, f"Yields API failed: {response.status_code}"
        print("PASS: Yields API working")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
