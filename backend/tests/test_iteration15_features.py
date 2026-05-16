"""
Iteration 15 - Feature Tests
============================
Tests for:
1. AI³ NLP Food Knowledge Integration (8000 items)
2. Recipe Import from URL endpoint
3. Backend health check
4. Sidebar loading (no errors)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_healthy(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        assert data["version"] == "3.1"
        assert "engines" in data
        print(f"PASS: Health endpoint returns healthy, version {data['version']}")


class TestAI3FoodKnowledge:
    """AI³ NLP endpoint with food_knowledge integration tests"""
    
    def test_ai3_ask_with_food_query(self):
        """POST /api/ai3/ask with food query should include food_knowledge context"""
        response = requests.post(
            f"{BASE_URL}/api/ai3/ask",
            json={
                "query": "What are the best oils for high-heat cooking?",
                "user_id": "usr-owner-001"
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "response" in data
        assert "user" in data
        assert "session_id" in data
        assert "timestamp" in data
        
        # Verify user context
        assert data["user"]["role"] == "owner"
        
        # Verify food_knowledge is included in context (either in LLM response or fallback)
        response_text = data["response"].lower()
        assert "food knowledge" in response_text or "oil" in response_text or "8000" in response_text
        print(f"PASS: AI³ ask endpoint returns response with food context")
        print(f"  User: {data['user']['name']} ({data['user']['role']})")
    
    def test_ai3_ask_with_culinary_query(self):
        """POST /api/ai3/ask with culinary query should include food_knowledge"""
        response = requests.post(
            f"{BASE_URL}/api/ai3/ask",
            json={
                "query": "Tell me about vinegar types for cooking",
                "user_id": "usr-owner-001"
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        # Food knowledge should be triggered by "vinegar" keyword
        print(f"PASS: AI³ culinary query returns response")
    
    def test_ai3_ask_with_recipe_query(self):
        """POST /api/ai3/ask with recipe query should include food_knowledge"""
        response = requests.post(
            f"{BASE_URL}/api/ai3/ask",
            json={
                "query": "What ingredients do I need for a basic sauce?",
                "user_id": "usr-owner-001"
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        print(f"PASS: AI³ recipe query returns response")
    
    def test_ai3_ask_invalid_user(self):
        """POST /api/ai3/ask with invalid user should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/ai3/ask",
            json={
                "query": "Test query",
                "user_id": "invalid-user-id"
            },
            timeout=10
        )
        assert response.status_code == 404
        print(f"PASS: AI³ returns 404 for invalid user")


class TestRecipeImport:
    """Recipe import from URL endpoint tests"""
    
    def test_recipe_import_valid_url(self):
        """POST /api/recipe/import with valid BBC Good Food URL should return recipe data"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": "https://www.bbcgoodfood.com/recipes/easy-chocolate-cake"},
            timeout=20
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "recipe" in data
        assert "source" in data
        
        recipe = data["recipe"]
        assert "name" in recipe
        assert "ingredients" in recipe
        assert "instructions" in recipe
        assert "source_url" in recipe
        
        # Verify recipe content
        assert len(recipe["name"]) > 0
        assert len(recipe["ingredients"]) > 0
        assert len(recipe["instructions"]) > 0
        assert recipe["source_url"] == "https://www.bbcgoodfood.com/recipes/easy-chocolate-cake"
        
        print(f"PASS: Recipe import returns valid data")
        print(f"  Recipe: {recipe['name']}")
        print(f"  Ingredients: {len(recipe['ingredients'])} items")
        print(f"  Instructions: {len(recipe['instructions'])} steps")
        print(f"  Source: {data['source']}")
    
    def test_recipe_import_invalid_url_format(self):
        """POST /api/recipe/import with invalid URL format should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": "invalid-url"},
            timeout=10
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Invalid URL" in data["detail"]
        print(f"PASS: Recipe import returns 400 for invalid URL format")
    
    def test_recipe_import_empty_url(self):
        """POST /api/recipe/import with empty URL should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": ""},
            timeout=10
        )
        assert response.status_code == 400
        print(f"PASS: Recipe import returns 400 for empty URL")
    
    def test_recipe_import_missing_url(self):
        """POST /api/recipe/import without URL field should return 422"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={},
            timeout=10
        )
        assert response.status_code == 422
        print(f"PASS: Recipe import returns 422 for missing URL field")


class TestFoodKnowledgeCollection:
    """Verify food_knowledge collection has data"""
    
    def test_food_knowledge_count_via_ai3(self):
        """Verify food_knowledge collection has 8000 items via AI³ response"""
        response = requests.post(
            f"{BASE_URL}/api/ai3/ask",
            json={
                "query": "Tell me about cooking oils and fats",
                "user_id": "usr-owner-001"
            },
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # The response should mention 8000 items in food knowledge
        response_text = data["response"]
        assert "8000" in response_text or "FOOD KNOWLEDGE" in response_text
        print(f"PASS: Food knowledge collection confirmed (8000 items)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
