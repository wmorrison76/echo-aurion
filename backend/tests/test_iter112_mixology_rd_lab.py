"""
Iteration 112: Mixology R&D Lab - Flavor Profiling, Taste Science, Recipe Knowledge Base
========================================================================================
Tests for:
- GET /api/mixology-rd/ingredients - 40+ ingredients with flavor_tags and chemistry
- GET /api/mixology-rd/taste-map - 5 taste bud types with balance rules
- GET /api/mixology-rd/recipes - 25 recipes (20 alcoholic + 5 non-alcoholic) with costing
- GET /api/mixology-rd/recipes?type_filter=non_alcoholic - non-alcoholic with GL 4100
- GET /api/mixology-rd/recipes?category=whiskey - filter by category
- GET /api/mixology-rd/recipes/{recipe_name} - single recipe detail
- GET /api/mixology-rd/search/by-taste - taste-based recipe search
- POST /api/mixology-rd/recipes/analyze - custom recipe analyzer
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestMixologyRDIngredients:
    """Test ingredient library with 40+ ingredients"""
    
    def test_get_all_ingredients(self):
        """GET /api/mixology-rd/ingredients returns 40+ ingredients"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/ingredients")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ingredients" in data
        assert "categories" in data
        assert "total" in data
        
        # Verify 40+ ingredients
        assert data["total"] >= 40, f"Expected 40+ ingredients, got {data['total']}"
        
        # Verify categories exist
        expected_categories = ["spirit", "liqueur", "juice", "syrup", "mixer", "bitters", "garnish"]
        for cat in expected_categories:
            assert cat in data["categories"], f"Missing category: {cat}"
        
        print(f"✓ Total ingredients: {data['total']}")
        print(f"✓ Categories: {data['categories']}")
    
    def test_ingredient_chemistry_structure(self):
        """Verify ingredient chemistry fields (ABV, sugar, acid, bitterness)"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/ingredients")
        assert response.status_code == 200
        
        data = response.json()
        ingredients = data["ingredients"]
        
        # Check vodka has correct chemistry
        assert "vodka" in ingredients
        vodka = ingredients["vodka"]
        assert vodka["abv"] == 40
        assert vodka["sugar_g_per_oz"] == 0
        assert vodka["acid_g_per_oz"] == 0
        assert vodka["bitterness"] == 0
        assert "flavor_tags" in vodka
        assert "neutral" in vodka["flavor_tags"]
        
        # Check lime juice has acid
        assert "lime_juice" in ingredients
        lime = ingredients["lime_juice"]
        assert lime["abv"] == 0
        assert lime["acid_g_per_oz"] > 0, "Lime juice should have acid"
        assert "sour" in lime["flavor_tags"]
        
        # Check simple syrup has sugar
        assert "simple_syrup" in ingredients
        syrup = ingredients["simple_syrup"]
        assert syrup["sugar_g_per_oz"] > 0, "Simple syrup should have sugar"
        
        # Check Campari has bitterness
        assert "campari" in ingredients
        campari = ingredients["campari"]
        assert campari["bitterness"] > 0, "Campari should have bitterness"
        assert "bitter" in campari["flavor_tags"]
        
        print("✓ Ingredient chemistry verified: ABV, sugar, acid, bitterness")
    
    def test_filter_ingredients_by_category(self):
        """GET /api/mixology-rd/ingredients?category=spirit filters correctly"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/ingredients?category=spirit")
        assert response.status_code == 200
        
        data = response.json()
        ingredients = data["ingredients"]
        
        # All returned should be spirits
        for ing_id, ing in ingredients.items():
            assert ing["category"] == "spirit", f"{ing_id} is not a spirit"
        
        # Should have common spirits
        assert "vodka" in ingredients
        assert "gin" in ingredients
        assert "bourbon" in ingredients
        
        print(f"✓ Spirit filter returned {data['total']} spirits")


class TestMixologyRDTasteMap:
    """Test taste bud science mapping"""
    
    def test_get_taste_map(self):
        """GET /api/mixology-rd/taste-map returns 5 taste types"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/taste-map")
        assert response.status_code == 200
        
        data = response.json()
        assert "taste_buds" in data
        assert "balance_rules" in data
        
        # Verify 5 taste types
        taste_buds = data["taste_buds"]
        expected_tastes = ["sweet", "sour", "bitter", "salty", "umami"]
        for taste in expected_tastes:
            assert taste in taste_buds, f"Missing taste: {taste}"
            assert "receptors" in taste_buds[taste]
            assert "threshold" in taste_buds[taste]
            assert "in_cocktails" in taste_buds[taste]
        
        print(f"✓ 5 taste types verified: {list(taste_buds.keys())}")
    
    def test_balance_rules(self):
        """Verify balance rules are present"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/taste-map")
        assert response.status_code == 200
        
        data = response.json()
        rules = data["balance_rules"]
        
        assert len(rules) >= 4, f"Expected 4+ balance rules, got {len(rules)}"
        
        # Check for key rules
        rule_texts = [r["rule"] for r in rules]
        assert any("Sweet" in r and "Sour" in r for r in rule_texts), "Missing Sweet+Sour rule"
        assert any("Bitter" in r for r in rule_texts), "Missing Bitter rule"
        
        print(f"✓ {len(rules)} balance rules verified")


class TestMixologyRDRecipes:
    """Test recipe database with 25 recipes"""
    
    def test_get_all_recipes(self):
        """GET /api/mixology-rd/recipes returns 25 recipes (20 alcoholic + 5 non-alcoholic)"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes")
        assert response.status_code == 200
        
        data = response.json()
        assert "recipes" in data
        assert "total" in data
        assert "summary" in data
        
        # Verify 25 recipes
        assert data["total"] == 25, f"Expected 25 recipes, got {data['total']}"
        
        # Verify summary counts
        summary = data["summary"]
        assert summary["alcoholic"] == 20, f"Expected 20 alcoholic, got {summary['alcoholic']}"
        assert summary["non_alcoholic"] == 5, f"Expected 5 non-alcoholic, got {summary['non_alcoholic']}"
        
        print(f"✓ Total recipes: {data['total']}")
        print(f"✓ Alcoholic: {summary['alcoholic']}, Non-alcoholic: {summary['non_alcoholic']}")
    
    def test_recipe_costing_structure(self):
        """Verify recipes have full costing (cost, price, profit, margin)"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes")
        assert response.status_code == 200
        
        data = response.json()
        recipes = data["recipes"]
        
        for recipe in recipes[:5]:  # Check first 5
            assert "total_cost" in recipe, f"{recipe['name']} missing total_cost"
            assert "menu_price" in recipe, f"{recipe['name']} missing menu_price"
            assert "profit" in recipe, f"{recipe['name']} missing profit"
            assert "margin_pct" in recipe, f"{recipe['name']} missing margin_pct"
            assert "abv_pct" in recipe, f"{recipe['name']} missing abv_pct"
            assert "taste_profile" in recipe, f"{recipe['name']} missing taste_profile"
            assert "gl_account" in recipe, f"{recipe['name']} missing gl_account"
            
            # Verify costing math
            expected_profit = round(recipe["menu_price"] - recipe["total_cost"], 2)
            assert abs(recipe["profit"] - expected_profit) < 0.1, f"{recipe['name']} profit calculation wrong"
        
        print("✓ Recipe costing structure verified")
    
    def test_filter_non_alcoholic_gl_4100(self):
        """GET /api/mixology-rd/recipes?type_filter=non_alcoholic returns GL 4100"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes?type_filter=non_alcoholic")
        assert response.status_code == 200
        
        data = response.json()
        recipes = data["recipes"]
        
        assert len(recipes) == 5, f"Expected 5 non-alcoholic, got {len(recipes)}"
        
        for recipe in recipes:
            assert recipe["type"] == "non_alcoholic"
            # GL account should be 4100 (Food Cost)
            assert "4100" in recipe["gl_account"], f"{recipe['name']} should have GL 4100, got {recipe['gl_account']}"
        
        print(f"✓ {len(recipes)} non-alcoholic recipes with GL 4100 verified")
    
    def test_filter_by_category_whiskey(self):
        """GET /api/mixology-rd/recipes?category=whiskey filters correctly"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes?category=whiskey")
        assert response.status_code == 200
        
        data = response.json()
        recipes = data["recipes"]
        
        assert len(recipes) >= 3, f"Expected 3+ whiskey cocktails, got {len(recipes)}"
        
        for recipe in recipes:
            assert recipe["category"] == "whiskey", f"{recipe['name']} is not whiskey category"
        
        # Should include Old Fashioned, Whiskey Sour, Manhattan, Sazerac
        names = [r["name"] for r in recipes]
        assert "Old Fashioned" in names
        assert "Whiskey Sour" in names
        
        print(f"✓ Whiskey category filter returned {len(recipes)} recipes: {names}")
    
    def test_alcoholic_recipes_gl_4200(self):
        """Verify alcoholic recipes have GL 4200 (Beverage Cost)"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes?type_filter=alcoholic")
        assert response.status_code == 200
        
        data = response.json()
        recipes = data["recipes"]
        
        assert len(recipes) == 20, f"Expected 20 alcoholic, got {len(recipes)}"
        
        for recipe in recipes:
            assert recipe["type"] == "alcoholic"
            assert "4200" in recipe["gl_account"], f"{recipe['name']} should have GL 4200, got {recipe['gl_account']}"
        
        print(f"✓ {len(recipes)} alcoholic recipes with GL 4200 verified")


class TestMixologyRDRecipeDetail:
    """Test single recipe detail endpoint"""
    
    def test_get_old_fashioned_detail(self):
        """GET /api/mixology-rd/recipes/old-fashioned returns correct taste profile"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes/old-fashioned")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Old Fashioned"
        
        # Verify taste profile: sweet:2 sour:0 bitter:4
        tp = data["taste_profile"]
        assert tp["sweet"] == 2, f"Expected sweet:2, got {tp['sweet']}"
        assert tp["sour"] == 0, f"Expected sour:0, got {tp['sour']}"
        assert tp["bitter"] == 4, f"Expected bitter:4, got {tp['bitter']}"
        
        # Verify ingredients
        ing_names = [i["ingredient"] for i in data["ingredients"]]
        assert any("Bourbon" in n for n in ing_names), "Missing bourbon"
        assert any("Angostura" in n for n in ing_names), "Missing bitters"
        
        print(f"✓ Old Fashioned taste profile: sweet={tp['sweet']}, sour={tp['sour']}, bitter={tp['bitter']}")
    
    def test_get_margarita_detail(self):
        """GET /api/mixology-rd/recipes/margarita returns correct taste profile"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes/margarita")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Margarita"
        
        # Verify taste profile: sweet:3 sour:5 bitter:1
        tp = data["taste_profile"]
        assert tp["sweet"] == 3, f"Expected sweet:3, got {tp['sweet']}"
        assert tp["sour"] == 5, f"Expected sour:5, got {tp['sour']}"
        assert tp["bitter"] == 1, f"Expected bitter:1, got {tp['bitter']}"
        
        print(f"✓ Margarita taste profile: sweet={tp['sweet']}, sour={tp['sour']}, bitter={tp['bitter']}")
    
    def test_recipe_not_found(self):
        """GET /api/mixology-rd/recipes/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes/nonexistent-cocktail-xyz")
        assert response.status_code == 404
        
        print("✓ 404 returned for nonexistent recipe")


class TestMixologyRDTasteSearch:
    """Test taste-based recipe search"""
    
    def test_search_sweet_sour_finds_pier_two(self):
        """GET /api/mixology-rd/search/by-taste?sweet=4&sour=3&bitter=0 finds Pier Two Signature"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/search/by-taste?sweet=4&sour=3&bitter=0")
        assert response.status_code == 200
        
        data = response.json()
        assert "query" in data
        assert "matches" in data
        
        # Verify query params
        assert data["query"]["sweet"] == 4
        assert data["query"]["sour"] == 3
        assert data["query"]["bitter"] == 0
        
        # Pier Two Signature has taste_profile sweet:4 sour:3 bitter:0 - should be perfect match
        matches = data["matches"]
        assert len(matches) > 0
        
        # First match should be Pier Two Signature (distance 0)
        first_match = matches[0]
        assert first_match["recipe"]["name"] == "Pier Two Signature", f"Expected Pier Two Signature, got {first_match['recipe']['name']}"
        assert first_match["taste_distance"] == 0, f"Expected distance 0, got {first_match['taste_distance']}"
        
        print(f"✓ Perfect match found: {first_match['recipe']['name']} (distance: {first_match['taste_distance']})")
    
    def test_search_bitter_finds_negroni_sazerac_espresso(self):
        """GET /api/mixology-rd/search/by-taste?sweet=1&sour=0&bitter=5 finds bitter cocktails"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/search/by-taste?sweet=1&sour=0&bitter=5")
        assert response.status_code == 200
        
        data = response.json()
        matches = data["matches"]
        
        # Get top 5 matches
        top_names = [m["recipe"]["name"] for m in matches[:5]]
        
        # Negroni (sweet:2 sour:0 bitter:5), Sazerac (sweet:1 sour:0 bitter:5), 
        # Espresso Martini (sweet:3 sour:1 bitter:5), Gin & Tonic (sweet:1 sour:1 bitter:5)
        # Espresso Tonic (sweet:1 sour:0 bitter:5) - non-alcoholic
        
        # Sazerac and Espresso Tonic should be perfect matches (distance 0)
        perfect_matches = [m for m in matches if m["taste_distance"] == 0]
        perfect_names = [m["recipe"]["name"] for m in perfect_matches]
        
        # At least Sazerac should be a perfect match
        assert "Sazerac" in perfect_names or "Espresso Tonic" in perfect_names, f"Expected Sazerac or Espresso Tonic in perfect matches, got {perfect_names}"
        
        # Negroni should be in top matches (bitter:5)
        assert "Negroni" in top_names, f"Expected Negroni in top matches, got {top_names}"
        
        print(f"✓ Bitter search top matches: {top_names}")
        print(f"✓ Perfect matches (distance 0): {perfect_names}")
    
    def test_search_returns_top_10(self):
        """Taste search returns up to 10 matches"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/search/by-taste?sweet=3&sour=3&bitter=1")
        assert response.status_code == 200
        
        data = response.json()
        matches = data["matches"]
        
        assert len(matches) <= 10, f"Expected max 10 matches, got {len(matches)}"
        
        # Verify matches are sorted by distance
        distances = [m["taste_distance"] for m in matches]
        assert distances == sorted(distances), "Matches should be sorted by taste_distance"
        
        print(f"✓ Search returned {len(matches)} matches, sorted by distance")


class TestMixologyRDRecipeAnalyzer:
    """Test custom recipe analyzer"""
    
    def test_analyze_custom_recipe(self):
        """POST /api/mixology-rd/recipes/analyze calculates ABV, chemistry, balance score"""
        payload = {
            "name": "Test Custom Cocktail",
            "ingredients": [
                {"ingredient_id": "vodka", "quantity": 2.0, "unit": "oz"},
                {"ingredient_id": "lime_juice", "quantity": 1.0, "unit": "oz"},
                {"ingredient_id": "simple_syrup", "quantity": 0.75, "unit": "oz"}
            ],
            "menu_price": 22.00
        }
        
        response = requests.post(f"{BASE_URL}/api/mixology-rd/recipes/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert data["name"] == "Test Custom Cocktail"
        assert "ingredients" in data
        assert "chemistry" in data
        assert "balance_score" in data
        assert "costing" in data
        assert "gl_account" in data
        
        # Verify chemistry
        chem = data["chemistry"]
        assert "total_volume_ml" in chem
        assert "abv_pct" in chem
        assert "sugar_g_per_l" in chem
        assert "acid_g_per_l" in chem
        assert "bitterness_index" in chem
        assert "sweetness" in chem
        
        # ABV should be calculated (vodka 40% * 2oz / total volume)
        assert chem["abv_pct"] > 0, "ABV should be > 0 for alcoholic recipe"
        
        # Balance score should be 0-100
        assert 0 <= data["balance_score"] <= 100
        
        # GL account should be 4200 (Beverage Cost) for alcoholic
        assert "4200" in data["gl_account"]
        
        print(f"✓ Custom recipe analyzed: ABV={chem['abv_pct']}%, balance={data['balance_score']}")
    
    def test_analyze_non_alcoholic_gl_4100(self):
        """POST /api/mixology-rd/recipes/analyze routes non-alcoholic to GL 4100"""
        payload = {
            "name": "Test Mocktail",
            "ingredients": [
                {"ingredient_id": "lime_juice", "quantity": 1.0, "unit": "oz"},
                {"ingredient_id": "simple_syrup", "quantity": 1.0, "unit": "oz"},
                {"ingredient_id": "soda_water", "quantity": 4.0, "unit": "oz"}
            ],
            "menu_price": 10.00
        }
        
        response = requests.post(f"{BASE_URL}/api/mixology-rd/recipes/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # ABV should be 0
        assert data["chemistry"]["abv_pct"] == 0
        
        # GL account should be 4100 (Food Cost) for non-alcoholic
        assert "4100" in data["gl_account"], f"Expected GL 4100, got {data['gl_account']}"
        
        print(f"✓ Non-alcoholic recipe routed to GL 4100")
    
    def test_analyze_with_bitters(self):
        """POST /api/mixology-rd/recipes/analyze handles dash units correctly"""
        payload = {
            "name": "Test Old Fashioned",
            "ingredients": [
                {"ingredient_id": "bourbon", "quantity": 2.0, "unit": "oz"},
                {"ingredient_id": "simple_syrup", "quantity": 0.25, "unit": "oz"},
                {"ingredient_id": "angostura", "quantity": 3, "unit": "dash"},
                {"ingredient_id": "orange_peel", "quantity": 1, "unit": "each"}
            ],
            "menu_price": 24.00
        }
        
        response = requests.post(f"{BASE_URL}/api/mixology-rd/recipes/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify bitters added bitterness
        assert data["chemistry"]["bitterness_index"] > 0, "Bitters should add bitterness"
        
        # Verify costing includes all ingredients
        assert len(data["ingredients"]) == 4
        
        # Verify costing math
        costing = data["costing"]
        assert costing["total_cost"] > 0
        assert costing["profit"] == round(costing["menu_price"] - costing["total_cost"], 2)
        
        print(f"✓ Recipe with bitters analyzed: bitterness={data['chemistry']['bitterness_index']}")
    
    def test_analyze_balance_scoring(self):
        """Verify balance scoring penalizes unbalanced recipes"""
        # Very sweet without acid - should be penalized
        payload = {
            "name": "Too Sweet",
            "ingredients": [
                {"ingredient_id": "vodka", "quantity": 1.0, "unit": "oz"},
                {"ingredient_id": "simple_syrup", "quantity": 3.0, "unit": "oz"}  # Very sweet
            ],
            "menu_price": 20.00
        }
        
        response = requests.post(f"{BASE_URL}/api/mixology-rd/recipes/analyze", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Balance should be penalized (< 100)
        assert data["balance_score"] < 100, f"Unbalanced recipe should have score < 100, got {data['balance_score']}"
        
        print(f"✓ Unbalanced recipe penalized: balance_score={data['balance_score']}")


class TestMixologyRDSazeracIngredient:
    """Test Sazerac recipe with lemon_peel (not in INGREDIENTS dict)"""
    
    def test_sazerac_costs_correctly(self):
        """Verify Sazerac with lemon_peel costs correctly with default fallback"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes/sazerac")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "Sazerac"
        
        # Verify it has ingredients and costing
        assert len(data["ingredients"]) >= 3
        assert data["total_cost"] > 0
        assert data["profit"] > 0
        
        # Find lemon_peel ingredient
        lemon_peel = next((i for i in data["ingredients"] if "lemon" in i["id"].lower()), None)
        assert lemon_peel is not None, "Sazerac should have lemon_peel ingredient"
        
        # Should have a cost (default fallback)
        assert lemon_peel["cost"] >= 0
        
        print(f"✓ Sazerac costed correctly: total_cost=${data['total_cost']}, profit=${data['profit']}")
        print(f"✓ lemon_peel ingredient: {lemon_peel}")


class TestMixologyRDHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
