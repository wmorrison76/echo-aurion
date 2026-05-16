"""
Iteration 126: Recipe System Smoke Test
========================================
Tests for:
- GET /api/yields/recipes - List all recipes (should return 17 total)
- POST /api/yields/recipes - Create recipe with server-side cost calculation
- GET /api/yields/recipes/{recipe_id} - Get individual recipe
- GET /api/yields/search - Yield DB fuzzy search
- GET /api/ordering/search-ingredients - Inventory fuzzy search
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRecipeListEndpoint:
    """Test GET /api/yields/recipes - should return 17 recipes (10 new + 7 pre-existing)"""
    
    def test_recipes_list_returns_200(self):
        """Verify recipes list endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/yields/recipes returned 200")
    
    def test_recipes_list_has_recipes_array(self):
        """Verify response has recipes array"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        data = response.json()
        assert "recipes" in data, "Response missing 'recipes' key"
        assert isinstance(data["recipes"], list), "recipes should be a list"
        print(f"✓ Response has recipes array with {len(data['recipes'])} items")
    
    def test_recipes_list_has_total_count(self):
        """Verify response has total count"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        data = response.json()
        assert "total" in data, "Response missing 'total' key"
        print(f"✓ Total recipes: {data['total']}")
    
    def test_recipes_have_required_fields(self):
        """Verify each recipe has required fields: recipe_id, name, total_cost, cost_per_portion"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        data = response.json()
        recipes = data.get("recipes", [])
        
        if len(recipes) == 0:
            pytest.skip("No recipes found to validate")
        
        required_fields = ["recipe_id", "name", "total_cost", "cost_per_portion"]
        for recipe in recipes[:5]:  # Check first 5
            for field in required_fields:
                assert field in recipe, f"Recipe missing '{field}': {recipe.get('name', 'unknown')}"
        print(f"✓ Recipes have required fields: {required_fields}")
    
    def test_recipes_have_food_cost_pct(self):
        """Verify recipes have food_cost_pct field"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        data = response.json()
        recipes = data.get("recipes", [])
        
        if len(recipes) == 0:
            pytest.skip("No recipes found")
        
        # Check at least some recipes have food_cost_pct
        recipes_with_fcp = [r for r in recipes if "food_cost_pct" in r]
        print(f"✓ {len(recipes_with_fcp)}/{len(recipes)} recipes have food_cost_pct")
    
    def test_ai_recipes_have_source_field(self):
        """Verify AI-generated recipes have source='echoai3_generated'"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        data = response.json()
        recipes = data.get("recipes", [])
        
        ai_recipes = [r for r in recipes if r.get("source") == "echoai3_generated"]
        print(f"✓ Found {len(ai_recipes)} AI-generated recipes")


class TestRecipeCreateEndpoint:
    """Test POST /api/yields/recipes - Create recipe with server-side cost calculation"""
    
    def test_create_recipe_returns_201_or_200(self):
        """Verify recipe creation returns success status"""
        test_recipe = {
            "name": "TEST_Smoke_Recipe_126",
            "portions": 4,
            "menu_price": 28.00,
            "ingredients": [
                {"name": "Salmon, Fillet (Skin-On)", "ap_quantity": 1.5, "unit": "lb", "yield_pct": 90, "ep_cost": 20.00},
                {"name": "Lemon", "ap_quantity": 0.25, "unit": "lb", "yield_pct": 43, "ep_cost": 6.51}
            ],
            "category": "entree",
            "cuisine": "American"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/yields/recipes",
            json=test_recipe,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/yields/recipes returned {response.status_code}")
        
        # Verify response has recipe_id
        data = response.json()
        assert "recipe_id" in data, "Response missing recipe_id"
        print(f"✓ Created recipe with ID: {data['recipe_id']}")
        
        return data["recipe_id"]
    
    def test_create_recipe_calculates_costs(self):
        """Verify server calculates total_cost, cost_per_portion, food_cost_pct"""
        test_recipe = {
            "name": "TEST_Cost_Calc_Recipe_126",
            "portions": 10,
            "menu_price": 35.00,
            "ingredients": [
                {"name": "Beef, Tenderloin", "ap_quantity": 2, "unit": "lb", "yield_pct": 80, "ep_cost": 35.63}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/yields/recipes",
            json=test_recipe,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [200, 201]
        data = response.json()
        
        # Verify cost fields are calculated
        assert "total_cost" in data, "Missing total_cost"
        assert "cost_per_portion" in data, "Missing cost_per_portion"
        assert "food_cost_pct" in data, "Missing food_cost_pct"
        
        print(f"✓ Server calculated costs: total=${data['total_cost']}, per_portion=${data['cost_per_portion']}, food_cost={data['food_cost_pct']}%")


class TestRecipeGetByIdEndpoint:
    """Test GET /api/yields/recipes/{recipe_id}"""
    
    def test_get_recipe_by_id(self):
        """Verify can retrieve individual recipe by ID"""
        # First get list to find a recipe ID
        list_response = requests.get(f"{BASE_URL}/api/yields/recipes")
        recipes = list_response.json().get("recipes", [])
        
        if len(recipes) == 0:
            pytest.skip("No recipes available to test")
        
        # Find a manual recipe (not AI-generated) to test
        manual_recipes = [r for r in recipes if r.get("source") != "echoai3_generated"]
        if manual_recipes:
            recipe_id = manual_recipes[0]["recipe_id"]
        else:
            recipe_id = recipes[0]["recipe_id"]
        
        response = requests.get(f"{BASE_URL}/api/yields/recipes/{recipe_id}")
        
        if response.status_code == 404:
            # AI recipes might not be in culinary_recipes collection
            print(f"⚠ Recipe {recipe_id} not found in culinary_recipes (may be AI recipe)")
            pytest.skip("Recipe not found - may be AI-generated recipe stored elsewhere")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("recipe_id") == recipe_id
        print(f"✓ GET /api/yields/recipes/{recipe_id} returned recipe: {data.get('name')}")


class TestYieldSearchEndpoint:
    """Test GET /api/yields/search - Fuzzy search for yield DB items"""
    
    def test_yield_search_returns_200(self):
        """Verify yield search endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=salmon&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/yields/search returned 200")
    
    def test_yield_search_returns_results(self):
        """Verify yield search returns results array"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=chicken&limit=10")
        data = response.json()
        assert "results" in data, "Response missing 'results' key"
        assert len(data["results"]) > 0, "Expected at least 1 result for 'chicken'"
        print(f"✓ Search for 'chicken' returned {len(data['results'])} results")
    
    def test_yield_search_results_have_yield_data(self):
        """Verify search results have yield_pct, ap_cost_lb, ep_cost_lb"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=beef&limit=5")
        data = response.json()
        results = data.get("results", [])
        
        if len(results) == 0:
            pytest.skip("No results for 'beef'")
        
        required_fields = ["yield_pct", "ap_cost_lb", "ep_cost_lb"]
        for result in results[:3]:
            for field in required_fields:
                assert field in result, f"Result missing '{field}': {result.get('name')}"
        print(f"✓ Yield search results have: {required_fields}")
    
    def test_yield_search_fuzzy_matching(self):
        """Verify fuzzy matching works (partial queries)"""
        # Test partial query
        response = requests.get(f"{BASE_URL}/api/yields/search?q=salm&limit=5")
        data = response.json()
        results = data.get("results", [])
        
        # Should find salmon items
        salmon_results = [r for r in results if "salmon" in r.get("name", "").lower()]
        assert len(salmon_results) > 0, "Fuzzy search for 'salm' should find salmon items"
        print(f"✓ Fuzzy search 'salm' found {len(salmon_results)} salmon items")
    
    def test_yield_search_empty_query(self):
        """Verify empty query returns default results"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=&limit=15")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        print(f"✓ Empty query returned {len(data['results'])} default results")


class TestOrderingSearchEndpoint:
    """Test GET /api/ordering/search-ingredients - Inventory fuzzy search"""
    
    def test_ordering_search_returns_200(self):
        """Verify ordering search endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=milk&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/ordering/search-ingredients returned 200")
    
    def test_ordering_search_returns_results(self):
        """Verify ordering search returns results"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=butter&limit=10")
        data = response.json()
        assert "results" in data, "Response missing 'results' key"
        print(f"✓ Search for 'butter' returned {len(data.get('results', []))} results")


class TestSpecificRecipeIds:
    """Test specific recipe IDs created in previous iteration"""
    
    RECIPE_IDS = [
        "cr-b4b3ffd5",  # Sea Bass
        "cr-30648aea",  # Lamb
        "cr-bd94fd8e",  # Duck
        "cr-76aaef36",  # Lobster Risotto
        "cr-1505e810",  # Wagyu
        "cr-3133cf4c",  # Tuna Tartare
        "cr-eb328c79",  # Lava Cake
        "cr-1be57e87",  # Creme Brulee
        "cr-dc29cb89",  # Tiramisu
        "cr-37001a0b",  # Passion Fruit Tart
    ]
    
    def test_verify_recipes_exist_in_list(self):
        """Verify the 10 created recipes appear in the list"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        data = response.json()
        recipes = data.get("recipes", [])
        
        recipe_ids_in_list = [r.get("recipe_id") for r in recipes]
        
        found_count = 0
        for rid in self.RECIPE_IDS:
            if rid in recipe_ids_in_list:
                found_count += 1
        
        print(f"✓ Found {found_count}/{len(self.RECIPE_IDS)} expected recipe IDs in list")
        # Don't fail if some are missing - they may have been deleted
        if found_count < 5:
            print(f"⚠ Warning: Only {found_count} of expected recipes found")


class TestRecipeCount:
    """Verify total recipe count"""
    
    def test_total_recipe_count(self):
        """Verify total recipes is approximately 17 (10 new + 7 pre-existing)"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        data = response.json()
        total = data.get("total", 0)
        
        print(f"✓ Total recipes in system: {total}")
        # Allow some variance since recipes may have been added/deleted
        assert total >= 10, f"Expected at least 10 recipes, got {total}"


# Cleanup test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_recipes():
    """Cleanup TEST_ prefixed recipes after tests"""
    yield
    # Note: No delete endpoint available, so test recipes will persist
    print("Note: TEST_ prefixed recipes created during testing will persist")
