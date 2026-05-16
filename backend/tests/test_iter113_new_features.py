"""
Iteration 113: Testing new features
- Banquet Menu Catalog API (Pier 66 menu seeded from PDF)
- BEO Menu Builder endpoints
- Mixology R&D Lab expansion to 55 recipes
- Chef Gio Whisper STT endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBanquetMenuCatalog:
    """Banquet Menu Catalog API tests - Pier 66 menu seeded from PDF"""
    
    def test_seed_pier66_menu(self):
        """Seed the Pier 66 menu if not already seeded"""
        response = requests.post(f"{BASE_URL}/api/banquet-menus/seed-pier66")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["seeded", "already_seeded"]
        if data.get("status") == "seeded":
            assert data.get("menu_id") == "bm-pier66-v1"
            assert data.get("sections") == 7
        print(f"PASSED: Seed Pier 66 menu - status: {data.get('status')}")
    
    def test_list_menus_returns_pier66(self):
        """GET /api/banquet-menus returns menu list with seeded Pier 66 menu"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus")
        assert response.status_code == 200
        data = response.json()
        assert "menus" in data
        assert "total" in data
        assert data["total"] >= 1
        # Find Pier 66 menu
        pier66 = next((m for m in data["menus"] if m.get("menu_id") == "bm-pier66-v1"), None)
        assert pier66 is not None, "Pier 66 menu not found in list"
        assert pier66.get("property") == "Pier Sixty-Six Resort"
        assert pier66.get("active") == True
        print(f"PASSED: GET /api/banquet-menus - found {data['total']} menus including Pier 66")
    
    def test_get_pier66_categories_returns_7_sections(self):
        """GET /api/banquet-menus/bm-pier66-v1/categories returns 7 sections with subsections"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus/bm-pier66-v1/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert data.get("menu_id") == "bm-pier66-v1"
        categories = data["categories"]
        assert len(categories) == 7, f"Expected 7 sections, got {len(categories)}"
        # Verify section names
        section_names = [c["name"] for c in categories]
        expected_sections = ["BREAKFAST", "BREAKS", "LUNCH", "DINNER", "RECEPTION", "BEVERAGE", "ADD-ONS & SERVICES"]
        for expected in expected_sections:
            assert expected in section_names, f"Missing section: {expected}"
        # Verify subsections exist
        for cat in categories:
            assert "subsections" in cat
            assert len(cat["subsections"]) > 0, f"Section {cat['name']} has no subsections"
        print(f"PASSED: GET /api/banquet-menus/bm-pier66-v1/categories - 7 sections: {section_names}")
    
    def test_get_breakfast_plated_items(self):
        """GET /api/banquet-menus/bm-pier66-v1/items?section=BREAKFAST&subsection=PLATED BREAKFAST returns items"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus/bm-pier66-v1/items", params={
            "section": "BREAKFAST",
            "subsection": "PLATED BREAKFAST"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] > 0, "No items returned for PLATED BREAKFAST"
        # Verify item structure
        item = data["items"][0]
        assert "id" in item
        assert "name" in item
        assert "section" in item
        assert "subsection" in item
        assert item["section"] == "BREAKFAST"
        assert item["subsection"] == "PLATED BREAKFAST"
        print(f"PASSED: GET breakfast plated items - {data['total']} items returned")
    
    def test_get_dinner_plated_items(self):
        """GET /api/banquet-menus/bm-pier66-v1/items?section=DINNER&subsection=PLATED DINNER returns dinner items"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus/bm-pier66-v1/items", params={
            "section": "DINNER",
            "subsection": "PLATED DINNER"
        })
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] > 0, "No items returned for PLATED DINNER"
        # Verify dinner items
        item_names = [i["name"] for i in data["items"]]
        # Should have entrees like Filet Mignon, Sea Bass, etc.
        print(f"PASSED: GET dinner plated items - {data['total']} items: {item_names[:5]}...")
    
    def test_upload_new_menu(self):
        """POST /api/banquet-menus/upload accepts new menu data"""
        test_menu = {
            "name": "TEST_Custom Banquet Menu",
            "property": "Test Resort",
            "version": "2025-01-01",
            "sections": [
                {
                    "name": "TEST_SECTION",
                    "subsections": [
                        {
                            "name": "TEST_SUBSECTION",
                            "price": "$50 Per Guest",
                            "items": [
                                {"name": "Test Item 1", "description": "Test description"}
                            ]
                        }
                    ]
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/banquet-menus/upload", json=test_menu)
        assert response.status_code == 200
        data = response.json()
        assert "menu_id" in data
        assert data["name"] == "TEST_Custom Banquet Menu"
        assert data["property"] == "Test Resort"
        assert len(data["sections"]) == 1
        print(f"PASSED: POST /api/banquet-menus/upload - created menu {data['menu_id']}")
    
    def test_get_menu_not_found(self):
        """GET /api/banquet-menus/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/banquet-menus/nonexistent")
        assert response.status_code == 404
        print("PASSED: GET nonexistent menu returns 404")


class TestMixologyRDExpanded:
    """Mixology R&D Lab tests - expanded to 55 recipes"""
    
    def test_recipes_returns_55_total(self):
        """GET /api/mixology-rd/recipes returns 55 recipes with correct counts"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes")
        assert response.status_code == 200
        data = response.json()
        assert "recipes" in data
        assert "total" in data
        assert "summary" in data
        # Verify 55 total recipes
        assert data["total"] == 55, f"Expected 55 recipes, got {data['total']}"
        # Verify summary counts
        summary = data["summary"]
        assert summary["alcoholic"] == 45, f"Expected 45 alcoholic, got {summary['alcoholic']}"
        assert summary["non_alcoholic"] == 10, f"Expected 10 non-alcoholic, got {summary['non_alcoholic']}"
        print(f"PASSED: GET /api/mixology-rd/recipes - {data['total']} recipes (45 alcoholic + 10 non-alcoholic)")
    
    def test_alcoholic_filter_returns_45(self):
        """GET /api/mixology-rd/recipes?type_filter=alcoholic returns 45 alcoholic recipes"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/recipes", params={"type_filter": "alcoholic"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 45, f"Expected 45 alcoholic recipes, got {data['total']}"
        # Verify all are alcoholic
        for recipe in data["recipes"]:
            assert recipe["type"] == "alcoholic"
        print(f"PASSED: GET /api/mixology-rd/recipes?type_filter=alcoholic - {data['total']} recipes")
    
    def test_taste_search_sweet_returns_pina_colada(self):
        """GET /api/mixology-rd/search/by-taste?sweet=5&sour=0&bitter=0 returns Pina Colada or similar sweet drink at top"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/search/by-taste", params={
            "sweet": 5, "sour": 0, "bitter": 0
        })
        assert response.status_code == 200
        data = response.json()
        assert "matches" in data
        assert len(data["matches"]) > 0
        # Top result should be a sweet drink
        top_match = data["matches"][0]
        top_recipe = top_match["recipe"]
        # Pina Colada has sweet:5, sour:1, bitter:0 - should be close match
        # Or Shirley Temple with sweet:5
        sweet_drinks = ["Pina Colada", "Shirley Temple"]
        top_name = top_recipe["name"]
        top_sweet = top_recipe["taste_profile"]["sweet"]
        assert top_sweet >= 4, f"Top match {top_name} has sweet={top_sweet}, expected >= 4"
        print(f"PASSED: Taste search sweet=5 - top match: {top_name} (sweet={top_sweet}, distance={top_match['taste_distance']})")
    
    def test_ingredients_returns_55_plus(self):
        """GET /api/mixology-rd/ingredients returns 55+ ingredients with new additions"""
        response = requests.get(f"{BASE_URL}/api/mixology-rd/ingredients")
        assert response.status_code == 200
        data = response.json()
        assert "ingredients" in data
        assert "total" in data
        assert data["total"] >= 55, f"Expected 55+ ingredients, got {data['total']}"
        # Verify some new ingredients exist
        ingredients = data["ingredients"]
        expected_new = ["cream_of_coconut", "tomato_juice", "cachaca", "orgeat", "falernum"]
        for ing in expected_new:
            assert ing in ingredients, f"Missing new ingredient: {ing}"
        print(f"PASSED: GET /api/mixology-rd/ingredients - {data['total']} ingredients")
    
    def test_analyze_custom_recipe(self):
        """POST /api/mixology-rd/recipes/analyze correctly analyzes custom recipe"""
        custom_recipe = {
            "name": "TEST_Custom Cocktail",
            "menu_price": 24.00,
            "ingredients": [
                {"ingredient_id": "vodka", "quantity": 2.0, "unit": "oz"},
                {"ingredient_id": "lime_juice", "quantity": 1.0, "unit": "oz"},
                {"ingredient_id": "simple_syrup", "quantity": 0.5, "unit": "oz"}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/mixology-rd/recipes/analyze", json=custom_recipe)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Custom Cocktail"
        assert "chemistry" in data
        assert "costing" in data
        assert "balance_score" in data
        # Verify chemistry calculations
        chem = data["chemistry"]
        assert chem["abv_pct"] > 0, "ABV should be > 0 for alcoholic recipe"
        assert chem["sugar_g_per_l"] > 0, "Sugar should be > 0 with simple syrup"
        assert chem["acid_g_per_l"] > 0, "Acid should be > 0 with lime juice"
        # Verify costing
        costing = data["costing"]
        assert costing["total_cost"] > 0
        assert costing["margin_pct"] > 0
        print(f"PASSED: POST /api/mixology-rd/recipes/analyze - ABV={chem['abv_pct']}%, margin={costing['margin_pct']}%")


class TestChefGioTraining:
    """Chef Gio Training tests - including Whisper STT endpoint"""
    
    def test_training_modes_returns_4(self):
        """GET /api/chef-gio/training-modes returns 4 training modes"""
        response = requests.get(f"{BASE_URL}/api/chef-gio/training-modes")
        assert response.status_code == 200
        data = response.json()
        assert "modes" in data
        modes = data["modes"]
        assert len(modes) == 4, f"Expected 4 training modes, got {len(modes)}"
        mode_ids = [m["id"] for m in modes]
        expected_modes = ["full_walkthrough", "quiz", "scenario", "freeform"]
        for expected in expected_modes:
            assert expected in mode_ids, f"Missing mode: {expected}"
        print(f"PASSED: GET /api/chef-gio/training-modes - 4 modes: {mode_ids}")
    
    def test_transcribe_endpoint_exists(self):
        """POST /api/chef-gio/transcribe endpoint exists and returns 500 with no audio (validates endpoint registration)"""
        # Send empty request to verify endpoint exists
        # It should return 422 (validation error) or 400 (bad request) - not 404
        response = requests.post(f"{BASE_URL}/api/chef-gio/transcribe")
        # Endpoint should exist - 404 means not registered
        assert response.status_code != 404, "Transcribe endpoint not found (404)"
        # Expected: 422 (missing file) or 400 (bad request)
        assert response.status_code in [400, 422, 500], f"Unexpected status: {response.status_code}"
        print(f"PASSED: POST /api/chef-gio/transcribe endpoint exists (status={response.status_code})")
    
    def test_create_session_freeform(self):
        """POST /api/chef-gio/sessions/create creates a freeform session"""
        response = requests.post(f"{BASE_URL}/api/chef-gio/sessions/create", json={
            "chef_name": "TEST_Sous Chef",
            "mode": "freeform"
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "opening_message" in data
        assert data.get("mode") == "freeform"
        print(f"PASSED: Create freeform session - {data['session_id']}")
    
    def test_list_sessions(self):
        """GET /api/chef-gio/sessions returns session list"""
        response = requests.get(f"{BASE_URL}/api/chef-gio/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        print(f"PASSED: GET /api/chef-gio/sessions - {len(data['sessions'])} sessions")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health(self):
        """GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASSED: GET /api/health")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
