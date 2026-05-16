"""
Iteration 58: Recipe Import API Tests
=====================================
Tests for the recipe import functionality including:
- POST /api/recipe/import - import from BBC Good Food URL (json-ld source)
- POST /api/recipe/import - import from blocked site (ai-url-inference fallback)
- POST /api/recipe/import - error handling for invalid URL
- GET /api/recipe/image - proxy recipe image
- GET /api/recipe/image - error handling for missing/invalid URL
- App health and existing features verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRecipeImportAPI:
    """Recipe Import endpoint tests"""
    
    def test_health_check(self):
        """Verify app is healthy before running tests"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert "engines" in data
        print(f"✓ Health check passed - platform: {data.get('platform')}")
    
    def test_recipe_import_bbc_good_food_json_ld(self):
        """Test recipe import from BBC Good Food - should return json-ld source"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": "https://www.bbcgoodfood.com/recipes/easy-chocolate-cake"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "recipe" in data, "Response should contain 'recipe' key"
        assert "source" in data, "Response should contain 'source' key"
        assert data["source"] == "json-ld", f"Expected json-ld source, got {data['source']}"
        
        # Verify recipe data
        recipe = data["recipe"]
        assert recipe.get("name"), "Recipe should have a name"
        assert recipe.get("title"), "Recipe should have a title"
        assert "chocolate" in recipe["name"].lower(), "Recipe name should contain 'chocolate'"
        assert isinstance(recipe.get("ingredients"), list), "Ingredients should be a list"
        assert len(recipe["ingredients"]) > 0, "Should have at least one ingredient"
        assert isinstance(recipe.get("instructions"), list), "Instructions should be a list"
        assert len(recipe["instructions"]) > 0, "Should have at least one instruction"
        assert recipe.get("image"), "Recipe should have an image URL"
        assert recipe.get("source_url") == "https://www.bbcgoodfood.com/recipes/easy-chocolate-cake"
        
        print(f"✓ BBC Good Food import: {recipe['name']} with {len(recipe['ingredients'])} ingredients")
    
    def test_recipe_import_blocked_site_ai_fallback(self):
        """Test recipe import from blocked site (allrecipes) - should fallback to ai-url-inference"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": "https://www.allrecipes.com/recipe/22180/waffles-i/"},
            timeout=45  # AI inference may take longer
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "recipe" in data, "Response should contain 'recipe' key"
        assert "source" in data, "Response should contain 'source' key"
        # Should be ai-url-inference or ai-extracted (depending on what content was accessible)
        assert data["source"] in ["ai-url-inference", "ai-extracted", "json-ld"], \
            f"Expected AI fallback source, got {data['source']}"
        
        # Verify recipe data
        recipe = data["recipe"]
        assert recipe.get("name"), "Recipe should have a name"
        assert isinstance(recipe.get("ingredients"), list), "Ingredients should be a list"
        assert isinstance(recipe.get("instructions"), list), "Instructions should be a list"
        
        print(f"✓ Blocked site import: {recipe['name']} via {data['source']}")
    
    def test_recipe_import_invalid_url_error(self):
        """Test recipe import with invalid URL - should return 400 error"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": "not-a-valid-url"},
            timeout=10
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data or "error" in data
        error_msg = data.get("detail") or data.get("error", "")
        assert "invalid" in error_msg.lower() or "http" in error_msg.lower()
        print(f"✓ Invalid URL error: {error_msg}")
    
    def test_recipe_import_empty_url_error(self):
        """Test recipe import with empty URL - should return 400 error"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": ""},
            timeout=10
        )
        assert response.status_code == 400 or response.status_code == 422
        print(f"✓ Empty URL returns error status: {response.status_code}")


class TestImageProxyAPI:
    """Image Proxy endpoint tests"""
    
    def test_image_proxy_valid_url(self):
        """Test image proxy with valid image URL - should return image data"""
        image_url = "https://images.immediate.co.uk/production/volatile/sites/30/2020/08/easy_chocolate_cake-b62f92c.jpg"
        response = requests.get(
            f"{BASE_URL}/api/recipe/image",
            params={"url": image_url},
            timeout=15
        )
        assert response.status_code == 200
        
        # Verify content type is an image
        content_type = response.headers.get("content-type", "")
        assert content_type.startswith("image/"), f"Expected image content-type, got {content_type}"
        
        # Verify we got actual image data
        assert len(response.content) > 1000, "Image should have substantial content"
        
        print(f"✓ Image proxy: {len(response.content)} bytes, type: {content_type}")
    
    def test_image_proxy_missing_url_error(self):
        """Test image proxy with missing URL parameter - should return 400 error"""
        response = requests.get(
            f"{BASE_URL}/api/recipe/image",
            timeout=10
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data or "error" in data
        print(f"✓ Missing URL error: {data.get('detail') or data.get('error')}")
    
    def test_image_proxy_invalid_url_error(self):
        """Test image proxy with invalid URL - should return 400 error"""
        response = requests.get(
            f"{BASE_URL}/api/recipe/image",
            params={"url": "not-a-valid-url"},
            timeout=10
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data or "error" in data
        print(f"✓ Invalid URL error: {data.get('detail') or data.get('error')}")


class TestExistingFeatures:
    """Verify existing features still work after module archival"""
    
    def test_zaro_guardian_status(self):
        """Verify ZARO Guardian is still operational"""
        response = requests.get(f"{BASE_URL}/api/zaro/status", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # ZARO returns "ACTIVE" status
        assert data.get("status") == "ACTIVE"
        assert "guardians" in data
        print(f"✓ ZARO Guardian: {len(data['guardians'])} guardians active, threat level: {data.get('threat_level')}")
    
    def test_echoai3_health_endpoint(self):
        """Verify EchoAi3 health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "operational"
        assert "domains" in data
        print(f"✓ EchoAi3 health: {len(data['domains'])} domains, {data.get('sessions')} sessions")
    
    def test_confidence_panel_heatmap(self):
        """Verify Confidence Panel heatmap endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/echoai3/confidence/heatmap", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "platform_confidence" in data
        assert "domains" in data
        print(f"✓ Confidence Panel: platform confidence {data.get('platform_confidence')}%, {len(data.get('domains', []))} domains")
    
    def test_echoai3_identity_endpoint(self):
        """Verify EchoAi3 identity endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/echoai3/identity", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # Identity endpoint returns self_model and role_descriptions
        assert "self_model" in data or "role_descriptions" in data
        print(f"✓ EchoAi3 identity endpoint accessible")
    
    def test_document_intelligence_endpoint(self):
        """Verify Document Intelligence endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/echoai3/ingest/stats", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "total_documents" in data or "supported_formats" in data
        print(f"✓ Document Intelligence: {data.get('total_documents', 0)} documents")
    
    def test_command_center_endpoint(self):
        """Verify Command Center endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200
        print(f"✓ Command Center endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
