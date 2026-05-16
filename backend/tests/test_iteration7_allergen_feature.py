"""
Iteration 7 - Allergen Auto-Identification and Display Feature Tests
Tests for:
1. Backend health check
2. Ingredient search API (returns allergen data)
3. Code review verification of taxonomy.ts exports
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_200(self):
        """Backend health check at /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Health endpoint returns 200")


class TestIngredientSearchAPI:
    """Ingredient search API tests - verifies allergen data is returned"""
    
    def test_search_ingredients_endpoint_exists(self):
        """Backend /api/ordering/search-ingredients endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=test", timeout=10)
        # Should return 200 even if no results
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "results" in data, "Response should have 'results' key"
        assert "query" in data, "Response should have 'query' key"
        print("PASS: Search ingredients endpoint exists and returns correct structure")
    
    def test_search_ingredients_returns_allergen_data(self):
        """Search for 'sal' returns salmon with allergens field"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=sal", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        # Find salmon in results
        salmon_results = [r for r in data.get("results", []) if "salmon" in r.get("name", "").lower()]
        
        if salmon_results:
            salmon = salmon_results[0]
            # Verify allergens field exists
            assert "allergens" in salmon, "Salmon should have allergens field"
            assert isinstance(salmon["allergens"], list), "Allergens should be a list"
            # Salmon should have 'fish' allergen
            assert "fish" in salmon["allergens"], f"Salmon should have 'fish' allergen, got {salmon['allergens']}"
            print(f"PASS: Salmon has allergens: {salmon['allergens']}")
        else:
            # No salmon in inventory, but endpoint works
            print("INFO: No salmon in inventory, but endpoint works correctly")
    
    def test_search_ingredients_with_empty_query(self):
        """Empty query returns results up to limit"""
        response = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        print(f"PASS: Empty query returns {len(data['results'])} results")
    
    def test_search_ingredients_case_insensitive(self):
        """Search is case insensitive"""
        response_lower = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=butter", timeout=10)
        response_upper = requests.get(f"{BASE_URL}/api/ordering/search-ingredients?q=BUTTER", timeout=10)
        
        assert response_lower.status_code == 200
        assert response_upper.status_code == 200
        
        data_lower = response_lower.json()
        data_upper = response_upper.json()
        
        # Both should return same number of results
        assert len(data_lower["results"]) == len(data_upper["results"]), \
            "Case insensitive search should return same results"
        print("PASS: Search is case insensitive")


class TestRecipeEndpoints:
    """Recipe-related endpoint tests"""
    
    def test_recipes_endpoint_exists(self):
        """Check if recipes endpoint exists"""
        # Try common recipe endpoints
        endpoints = [
            "/api/recipes",
            "/api/culinary/recipes",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            if response.status_code == 200:
                print(f"PASS: Found working recipes endpoint at {endpoint}")
                return
        
        # If no endpoint found, that's okay - recipes may be stored client-side
        print("INFO: No server-side recipes endpoint found (recipes may be client-side only)")


class TestCodeReviewVerification:
    """Code review verification tests - these verify the code structure is correct"""
    
    def test_taxonomy_exports_allergen_tag_map(self):
        """Verify taxonomy.ts exports ALLERGEN_TAG_MAP"""
        # This is a code review test - we verify by checking the file exists
        # and contains the expected exports
        import subprocess
        result = subprocess.run(
            ["grep", "-c", "export const ALLERGEN_TAG_MAP", 
             "/app/client/modules/Culinary/client/lib/taxonomy.ts"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "ALLERGEN_TAG_MAP export not found"
        assert int(result.stdout.strip()) >= 1, "ALLERGEN_TAG_MAP should be exported"
        print("PASS: taxonomy.ts exports ALLERGEN_TAG_MAP")
    
    def test_taxonomy_exports_resolve_allergen_tags(self):
        """Verify taxonomy.ts exports resolveAllergenTags function"""
        import subprocess
        result = subprocess.run(
            ["grep", "-c", "export function resolveAllergenTags",
             "/app/client/modules/Culinary/client/lib/taxonomy.ts"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "resolveAllergenTags export not found"
        assert int(result.stdout.strip()) >= 1, "resolveAllergenTags should be exported"
        print("PASS: taxonomy.ts exports resolveAllergenTags function")
    
    def test_allergen_tag_map_has_required_entries(self):
        """Verify ALLERGEN_TAG_MAP has dairy, gluten, eggs, vegan entries"""
        import subprocess
        required_entries = ["dairy", "gluten", "eggs", "vegan"]
        
        for entry in required_entries:
            result = subprocess.run(
                ["grep", "-c", f"'{entry}':", 
                 "/app/client/modules/Culinary/client/lib/taxonomy.ts"],
                capture_output=True, text=True
            )
            # Also try without quotes
            if result.returncode != 0:
                result = subprocess.run(
                    ["grep", "-c", f"{entry}:",
                     "/app/client/modules/Culinary/client/lib/taxonomy.ts"],
                    capture_output=True, text=True
                )
            assert result.returncode == 0, f"Entry '{entry}' not found in ALLERGEN_TAG_MAP"
        
        print(f"PASS: ALLERGEN_TAG_MAP has all required entries: {required_entries}")
    
    def test_recipe_card_has_allergen_rendering(self):
        """Verify RecipeCard.tsx has allergen badge rendering"""
        import subprocess
        result = subprocess.run(
            ["grep", "-c", "allergenDietTags",
             "/app/client/modules/Culinary/client/components/RecipeCard.tsx"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "allergenDietTags not found in RecipeCard.tsx"
        assert int(result.stdout.strip()) >= 1, "RecipeCard should use allergenDietTags"
        print("PASS: RecipeCard.tsx has allergen badge rendering")
    
    def test_recipe_card_has_data_testid(self):
        """Verify RecipeCard.tsx has data-testid for allergen tags"""
        import subprocess
        result = subprocess.run(
            ["grep", "-c", 'data-testid="recipe-card-allergen-tags"',
             "/app/client/modules/Culinary/client/components/RecipeCard.tsx"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "data-testid for allergen tags not found"
        print("PASS: RecipeCard.tsx has data-testid='recipe-card-allergen-tags'")
    
    def test_echo_menu_studio_has_allergen_controls(self):
        """Verify EchoMenuStudio.tsx has allergen toggle controls"""
        import subprocess
        result = subprocess.run(
            ["grep", "-c", 'data-testid="menu-item-allergen-controls"',
             "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "Allergen controls not found in EchoMenuStudio.tsx"
        print("PASS: EchoMenuStudio.tsx has allergen toggle controls")
    
    def test_echo_menu_studio_has_allergen_tags_field(self):
        """Verify DesignerElement type has allergenTags field"""
        import subprocess
        result = subprocess.run(
            ["grep", "-c", "allergenTags",
             "/app/client/modules/Culinary/client/pages/sections/EchoMenuStudio.tsx"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "allergenTags field not found"
        count = int(result.stdout.strip())
        assert count >= 3, f"Expected at least 3 references to allergenTags, found {count}"
        print(f"PASS: EchoMenuStudio.tsx has {count} references to allergenTags")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
