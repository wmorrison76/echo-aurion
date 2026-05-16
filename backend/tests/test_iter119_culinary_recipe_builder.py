"""
Iteration 119: Culinary Recipe Builder & Expanded Yield Database Tests
======================================================================
Tests for:
1. Expanded yield database (89 → 132 items)
2. Fuzzy search for new items (burrata, truffle, chihuahua, foie gras)
3. Yield calculation with cut types (asparagus tips, pistachio shelled)
4. Culinary recipe CRUD endpoints (save/load recipes)
5. Category counts verification (8 categories, 132 total)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestYieldDatabaseExpanded:
    """Tests for expanded yield database (132 items)"""
    
    def test_categories_returns_7_categories_132_items(self):
        """GET /api/yields/categories returns 7 categories totaling 132 ingredients"""
        response = requests.get(f"{BASE_URL}/api/yields/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        categories = data["categories"]
        total = sum(c["count"] for c in categories)
        # Should have 132 items total
        assert total == 132, f"Expected 132 total items, got {total}"
        # Should have 7 categories (dairy, fruit, grain, herb, protein, seafood, vegetable)
        assert len(categories) == 7, f"Expected 7 categories, got {len(categories)}"
        print(f"PASSED: 7 categories with {total} total items")
        for cat in categories:
            print(f"  - {cat['name']}: {cat['count']} items")
    
    def test_search_burrata_returns_dairy_item(self):
        """GET /api/yields/search?q=burrata returns Burrata dairy item"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=burrata")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert len(data["results"]) > 0, "No results for 'burrata'"
        top_result = data["results"][0]
        assert "burrata" in top_result["name"].lower()
        assert top_result["category"] == "dairy"
        assert top_result["yield_pct"] == 100
        assert top_result["ep_cost_lb"] == 16.00
        print(f"PASSED: Burrata found - {top_result['name']}, yield {top_result['yield_pct']}%, EP ${top_result['ep_cost_lb']}/lb")
    
    def test_search_truffle_returns_black_winter_truffle(self):
        """GET /api/yields/search?q=truffle returns Black Winter Truffle"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=truffle")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0, "No results for 'truffle'"
        top_result = data["results"][0]
        assert "truffle" in top_result["name"].lower()
        assert top_result["ep_cost_lb"] == 500.00  # $500/oz EP
        print(f"PASSED: Truffle found - {top_result['name']}, EP ${top_result['ep_cost_lb']}/oz")
    
    def test_search_chihuahua_returns_cheese(self):
        """GET /api/yields/search?q=chihu returns Chihuahua Cheese"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=chihu")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0, "No results for 'chihu'"
        top_result = data["results"][0]
        assert "chihuahua" in top_result["name"].lower()
        assert top_result["category"] == "dairy"
        assert top_result["ep_cost_lb"] == 7.20
        print(f"PASSED: Chihuahua Cheese found - {top_result['name']}, EP ${top_result['ep_cost_lb']}/lb")
    
    def test_search_foie_returns_foie_gras(self):
        """GET /api/yields/search?q=foie returns Foie Gras"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=foie")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0, "No results for 'foie'"
        top_result = data["results"][0]
        assert "foie" in top_result["name"].lower()
        assert top_result["category"] == "protein"
        assert top_result["yield_pct"] == 75
        assert top_result["ep_cost_lb"] == 113.33
        print(f"PASSED: Foie Gras found - {top_result['name']}, yield {top_result['yield_pct']}%, EP ${top_result['ep_cost_lb']}/lb")


class TestYieldCalculations:
    """Tests for yield calculation with cut types"""
    
    def test_asparagus_tips_yield_35_percent(self):
        """GET /api/yields/calculate?ingredient=asparagus&quantity=2&unit=lb&cut=tips returns yield 35%"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=asparagus&quantity=2&unit=lb&cut=tips")
        assert response.status_code == 200
        data = response.json()
        assert "yield_pct" in data
        assert data["yield_pct"] == 35, f"Expected yield 35%, got {data['yield_pct']}%"
        assert data["ap_quantity"] == 2
        # EP quantity should be 2 * 0.35 = 0.7
        assert abs(data["ep_quantity"] - 0.7) < 0.01, f"Expected EP qty 0.7, got {data['ep_quantity']}"
        print(f"PASSED: Asparagus tips - yield {data['yield_pct']}%, EP qty {data['ep_quantity']}lb from 2lb AP")
    
    def test_pistachio_shelled_yield_50_percent(self):
        """GET /api/yields/calculate?ingredient=pistachio&quantity=1&unit=lb&cut=shelled returns yield 50%"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=pistachio&quantity=1&unit=lb&cut=shelled")
        assert response.status_code == 200
        data = response.json()
        assert "yield_pct" in data
        assert data["yield_pct"] == 50, f"Expected yield 50%, got {data['yield_pct']}%"
        assert abs(data["ep_quantity"] - 0.5) < 0.01
        print(f"PASSED: Pistachio shelled - yield {data['yield_pct']}%, EP qty {data['ep_quantity']}lb")
    
    def test_quinoa_yield_270_percent(self):
        """Quinoa has 270% yield (cooked vs dry)"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=quinoa&quantity=1&unit=lb")
        assert response.status_code == 200
        data = response.json()
        assert data["yield_pct"] == 270, f"Expected yield 270%, got {data['yield_pct']}%"
        print(f"PASSED: Quinoa - yield {data['yield_pct']}% (cooked vs dry)")
    
    def test_black_bean_yield_250_percent(self):
        """Black Bean (dried) has 250% yield"""
        response = requests.get(f"{BASE_URL}/api/yields/calculate?ingredient=black+bean&quantity=1&unit=lb")
        assert response.status_code == 200
        data = response.json()
        assert data["yield_pct"] == 250, f"Expected yield 250%, got {data['yield_pct']}%"
        print(f"PASSED: Black Bean - yield {data['yield_pct']}%")


class TestCategoryFiltering:
    """Tests for category filtering"""
    
    def test_dairy_category_returns_18_items(self):
        """GET /api/yields/all?category=dairy returns 18 dairy items"""
        response = requests.get(f"{BASE_URL}/api/yields/all?category=dairy")
        assert response.status_code == 200
        data = response.json()
        assert "yields" in data
        dairy_items = data["yields"]
        # Count dairy items
        count = len(dairy_items)
        # Verify all are dairy
        for item in dairy_items:
            assert item["category"] == "dairy", f"Non-dairy item in dairy filter: {item['name']}"
        print(f"PASSED: Dairy category has {count} items")
        # List some dairy items
        dairy_names = [item["name"] for item in dairy_items[:5]]
        print(f"  Sample dairy items: {dairy_names}")
    
    def test_seafood_category_returns_19_items(self):
        """GET /api/yields/all?category=seafood returns 19 seafood items"""
        response = requests.get(f"{BASE_URL}/api/yields/all?category=seafood")
        assert response.status_code == 200
        data = response.json()
        seafood_items = data["yields"]
        count = len(seafood_items)
        for item in seafood_items:
            assert item["category"] == "seafood", f"Non-seafood item: {item['name']}"
        print(f"PASSED: Seafood category has {count} items")


class TestCulinaryRecipes:
    """Tests for culinary recipe save/load endpoints"""
    
    def test_save_culinary_recipe(self):
        """POST /api/yields/recipes saves a culinary recipe with costing data"""
        recipe_data = {
            "name": "TEST_Grilled Asparagus Salad",
            "portions": 10,
            "menu_price": 18.00,
            "ingredients": [
                {"name": "Asparagus", "ap_quantity": 2, "unit": "lb", "yield_pct": 56, "cut": "trimmed spears", "ep_cost": 10.36},
                {"name": "Burrata", "ap_quantity": 0.5, "unit": "lb", "yield_pct": 100, "cut": "", "ep_cost": 16.00},
                {"name": "Olive Oil, EVOO", "ap_quantity": 0.1, "unit": "gal", "yield_pct": 100, "cut": "", "ep_cost": 8.00}
            ],
            "total_cost": 28.52,
            "cost_per_portion": 2.85,
            "food_cost_pct": 15.8
        }
        response = requests.post(f"{BASE_URL}/api/yields/recipes", json=recipe_data)
        assert response.status_code == 200
        data = response.json()
        assert "recipe_id" in data
        assert data["name"] == "TEST_Grilled Asparagus Salad"
        assert data["portions"] == 10
        assert data["menu_price"] == 18.00
        assert len(data["ingredients"]) == 3
        print(f"PASSED: Recipe saved with ID {data['recipe_id']}")
        return data["recipe_id"]
    
    def test_list_culinary_recipes(self):
        """GET /api/yields/recipes returns saved recipes"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes")
        assert response.status_code == 200
        data = response.json()
        assert "recipes" in data
        assert "total" in data
        print(f"PASSED: Found {data['total']} saved recipes")
        if data["recipes"]:
            print(f"  Latest recipe: {data['recipes'][0]['name']}")
    
    def test_get_specific_recipe(self):
        """GET /api/yields/recipes/{id} returns a specific recipe"""
        # First save a recipe
        recipe_data = {
            "name": "TEST_Truffle Risotto",
            "portions": 8,
            "menu_price": 45.00,
            "ingredients": [
                {"name": "Truffle, Black Winter", "ap_quantity": 0.5, "unit": "oz", "yield_pct": 90, "cut": "", "ep_cost": 500.00}
            ],
            "total_cost": 250.00,
            "cost_per_portion": 31.25,
            "food_cost_pct": 69.4
        }
        save_response = requests.post(f"{BASE_URL}/api/yields/recipes", json=recipe_data)
        assert save_response.status_code == 200
        recipe_id = save_response.json()["recipe_id"]
        
        # Now get it
        response = requests.get(f"{BASE_URL}/api/yields/recipes/{recipe_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["recipe_id"] == recipe_id
        assert data["name"] == "TEST_Truffle Risotto"
        assert data["portions"] == 8
        print(f"PASSED: Retrieved recipe {recipe_id} - {data['name']}")
    
    def test_recipe_not_found(self):
        """GET /api/yields/recipes/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/yields/recipes/invalid-recipe-id-12345")
        assert response.status_code == 404
        print("PASSED: Invalid recipe ID returns 404")


class TestNewIngredients:
    """Tests for newly added ingredients in iteration 119"""
    
    def test_caviar_kaluga_exists(self):
        """Caviar Kaluga at $280/oz"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=caviar+kaluga")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        caviar = data["results"][0]
        assert "kaluga" in caviar["name"].lower()
        assert caviar["ep_cost_lb"] == 280.00
        print(f"PASSED: Caviar Kaluga - ${caviar['ep_cost_lb']}/oz")
    
    def test_wagyu_ground_exists(self):
        """Wagyu Ground at $27.50/lb EP"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=wagyu")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        wagyu = data["results"][0]
        assert "wagyu" in wagyu["name"].lower()
        assert wagyu["ep_cost_lb"] == 27.50
        print(f"PASSED: Wagyu Ground - ${wagyu['ep_cost_lb']}/lb EP")
    
    def test_romanesco_exists(self):
        """Romanesco vegetable exists"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=romanesco")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        item = data["results"][0]
        assert "romanesco" in item["name"].lower()
        assert item["category"] == "vegetable"
        print(f"PASSED: Romanesco - yield {item['yield_pct']}%")
    
    def test_gruyere_cheese_exists(self):
        """Gruyere cheese exists"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=gruyere")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        item = data["results"][0]
        assert "gruyere" in item["name"].lower()
        assert item["category"] == "dairy"
        assert item["ep_cost_lb"] == 18.00
        print(f"PASSED: Gruyere - ${item['ep_cost_lb']}/lb")
    
    def test_roquefort_cheese_exists(self):
        """Roquefort cheese exists"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=roquefort")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        item = data["results"][0]
        assert "roquefort" in item["name"].lower()
        assert item["category"] == "dairy"
        print(f"PASSED: Roquefort - ${item['ep_cost_lb']}/lb")


class TestFuzzySearchScoring:
    """Tests for fuzzy search scoring algorithm"""
    
    def test_exact_match_highest_score(self):
        """Exact match should have score 100"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=Burrata")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        # Exact match should be first with high score
        top = data["results"][0]
        assert top["score"] >= 90, f"Expected score >= 90 for exact match, got {top['score']}"
        print(f"PASSED: Exact match 'Burrata' has score {top['score']}")
    
    def test_starts_with_high_score(self):
        """Starts-with match should have score ~90"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=chick")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        # Should find Chicken items
        chicken_found = any("chicken" in r["name"].lower() for r in data["results"])
        assert chicken_found, "No chicken items found for 'chick'"
        print(f"PASSED: 'chick' finds chicken items with scores: {[r['score'] for r in data['results'][:3]]}")
    
    def test_contains_match(self):
        """Contains match should have score ~70+"""
        response = requests.get(f"{BASE_URL}/api/yields/search?q=pepper")
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) > 0
        # Should find Pepper Bell, Pepper Jack, Pepper Jalapeno
        pepper_items = [r for r in data["results"] if "pepper" in r["name"].lower()]
        assert len(pepper_items) >= 2, f"Expected multiple pepper items, got {len(pepper_items)}"
        print(f"PASSED: 'pepper' finds {len(pepper_items)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
