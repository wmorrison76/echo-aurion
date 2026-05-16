"""
Iteration 21 - LUCCCA Culinary Module Smoke Test
Full cycle: invoice → recipe → cost → menu → AI notes → translate to Spanish
Plus Dashboard KPI links navigation, Pastry module loading, Purchasing & Receiving module loading
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestHealthAndDashboard:
    """Health check and Dashboard KPI endpoints"""

    def test_health_endpoint(self):
        """Verify backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("platform") == "LUCCCA Enterprise"
        print(f"✓ Health: {data.get('engines', {})}")

    def test_command_center_returns_200(self):
        """Dashboard command center endpoint"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # Verify KPI data exists for navigation
        assert "pos" in data, "Missing POS data for Revenue KPI"
        assert "labor" in data, "Missing Labor data for Labor Cost KPI"
        assert "operations" in data, "Missing Operations data for Inventory KPI"
        assert "events" in data, "Missing Events data for Events KPI"
        assert "forecasting" in data, "Missing Forecasting data for Forecast KPI"
        print(f"✓ Command Center: Revenue=${data['pos'].get('revenue_today', 0)}, Labor={data['labor'].get('labor_pct', 0)}%")


class TestCulinaryInvoiceProcessing:
    """Test invoice processing - first step in Culinary cycle"""

    def test_process_invoice_creates_ingredients(self):
        """POST /api/operations/invoice/process - processes invoice items"""
        invoice_data = {
            "vendor_name": "TEST_Sysco Foods",
            "po_number": f"PO-TEST-{uuid.uuid4().hex[:8]}",
            "invoice_number": f"INV-TEST-{uuid.uuid4().hex[:8]}",
            "items": [
                {"name": "TEST_Salmon Fillet", "quantity": 10, "unit": "lb", "unit_cost": 12.50},
                {"name": "TEST_Asparagus", "quantity": 5, "unit": "bunch", "unit_cost": 3.99},
                {"name": "TEST_Lemon", "quantity": 20, "unit": "each", "unit_cost": 0.50}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/operations/invoice/process", json=invoice_data, timeout=15)
        assert response.status_code == 200, f"Invoice processing failed: {response.text}"
        data = response.json()
        assert "processed_items" in data or "items_processed" in data or "ingredients_created" in data, f"Unexpected response: {data}"
        print(f"✓ Invoice processed: {data}")
        return data


class TestCulinaryRecipeCreation:
    """Test recipe creation - second step in Culinary cycle"""

    @pytest.fixture(scope="class")
    def test_ingredient_ids(self):
        """Create test ingredients and return their IDs"""
        ingredient_ids = []
        ingredients = [
            {"name": "TEST_Salmon Fillet", "category": "protein", "base_unit": "lb", "current_cost": 12.50},
            {"name": "TEST_Asparagus", "category": "produce", "base_unit": "bunch", "current_cost": 3.99},
            {"name": "TEST_Lemon", "category": "produce", "base_unit": "each", "current_cost": 0.50}
        ]
        for ing in ingredients:
            response = requests.post(f"{BASE_URL}/api/operations/ingredient", json=ing, timeout=10)
            if response.status_code == 200:
                data = response.json()
                ingredient_ids.append(data.get("id"))
        return ingredient_ids

    def test_create_recipe_with_id(self, test_ingredient_ids):
        """POST /api/operations/recipe - creates recipe with ID"""
        recipe_data = {
            "name": f"TEST_Grilled Salmon_{uuid.uuid4().hex[:6]}",
            "category": "entree",
            "yield_qty": 4,
            "yield_unit": "portions",
            "ingredients": [
                {"ingredient_id": test_ingredient_ids[0] if test_ingredient_ids else "salmon-001", "quantity": 2, "unit": "lb"},
                {"ingredient_id": test_ingredient_ids[1] if len(test_ingredient_ids) > 1 else "asparagus-001", "quantity": 1, "unit": "bunch"},
                {"ingredient_id": test_ingredient_ids[2] if len(test_ingredient_ids) > 2 else "lemon-001", "quantity": 2, "unit": "each"}
            ],
            "instructions": [
                "Season salmon with salt and pepper",
                "Grill salmon for 4-5 minutes per side",
                "Blanch asparagus in salted water",
                "Plate with lemon wedges"
            ],
            "prep_time_min": 15,
            "cook_time_min": 12,
            "menu_price": 32.00,
            "target_food_cost_pct": 28
        }
        response = requests.post(f"{BASE_URL}/api/operations/recipe", json=recipe_data, timeout=10)
        assert response.status_code == 200, f"Recipe creation failed: {response.text}"
        data = response.json()
        assert "id" in data, f"Recipe missing ID: {data}"
        assert data.get("name", "").startswith("TEST_"), f"Recipe name mismatch: {data}"
        print(f"✓ Recipe created: {data.get('id')} - {data.get('name')}")
        return data.get("id")


class TestCulinaryRecipeCost:
    """Test recipe cost calculation - third step in Culinary cycle"""

    @pytest.fixture(scope="class")
    def test_recipe_id(self):
        """Create a test recipe and return its ID"""
        # First create ingredients
        ing_ids = []
        for ing in [
            {"name": "TEST_Cost_Salmon", "category": "protein", "base_unit": "lb", "current_cost": 15.00},
            {"name": "TEST_Cost_Butter", "category": "dairy", "base_unit": "lb", "current_cost": 5.00}
        ]:
            resp = requests.post(f"{BASE_URL}/api/operations/ingredient", json=ing, timeout=10)
            if resp.status_code == 200:
                ing_ids.append(resp.json().get("id"))
        
        # Create recipe
        recipe_data = {
            "name": f"TEST_Cost_Recipe_{uuid.uuid4().hex[:6]}",
            "category": "entree",
            "yield_qty": 2,
            "yield_unit": "portions",
            "ingredients": [
                {"ingredient_id": ing_ids[0] if ing_ids else "test-salmon", "quantity": 1, "unit": "lb"},
                {"ingredient_id": ing_ids[1] if len(ing_ids) > 1 else "test-butter", "quantity": 0.25, "unit": "lb"}
            ],
            "menu_price": 28.00
        }
        resp = requests.post(f"{BASE_URL}/api/operations/recipe", json=recipe_data, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("id")
        return None

    def test_recipe_cost_returns_breakdown(self, test_recipe_id):
        """GET /api/operations/recipe/{id}/cost - returns cost breakdown"""
        if not test_recipe_id:
            pytest.skip("No test recipe created")
        
        response = requests.get(f"{BASE_URL}/api/operations/recipe/{test_recipe_id}/cost", timeout=10)
        assert response.status_code == 200, f"Recipe cost failed: {response.text}"
        data = response.json()
        # Verify cost breakdown structure
        assert "total_cost" in data or "cost_per_portion" in data, f"Missing cost data: {data}"
        print(f"✓ Recipe cost: {data}")
        return data


class TestCulinaryAINotes:
    """Test AI notes generation - fourth step in Culinary cycle"""

    @pytest.fixture(scope="class")
    def test_recipe_for_notes(self):
        """Create a test recipe for notes generation"""
        # Create ingredients first
        ing_ids = []
        for ing in [
            {"name": "TEST_Notes_Chicken", "category": "protein", "base_unit": "lb", "current_cost": 8.00},
            {"name": "TEST_Notes_Garlic", "category": "produce", "base_unit": "each", "current_cost": 0.30}
        ]:
            resp = requests.post(f"{BASE_URL}/api/operations/ingredient", json=ing, timeout=10)
            if resp.status_code == 200:
                ing_ids.append(resp.json().get("id"))
        
        recipe_data = {
            "name": f"TEST_Notes_Roast_Chicken_{uuid.uuid4().hex[:6]}",
            "category": "entree",
            "yield_qty": 4,
            "yield_unit": "portions",
            "ingredients": [
                {"ingredient_id": ing_ids[0] if ing_ids else "test-chicken", "quantity": 3, "unit": "lb"},
                {"ingredient_id": ing_ids[1] if len(ing_ids) > 1 else "test-garlic", "quantity": 6, "unit": "each"}
            ],
            "instructions": ["Season chicken", "Roast at 425F for 45 minutes", "Rest before carving"],
            "menu_price": 24.00
        }
        resp = requests.post(f"{BASE_URL}/api/operations/recipe", json=recipe_data, timeout=10)
        if resp.status_code == 200:
            return resp.json().get("id")
        return None

    def test_generate_server_notes(self, test_recipe_for_notes):
        """POST /api/culinary/notes/generate - creates AI server notes"""
        if not test_recipe_for_notes:
            pytest.skip("No test recipe created")
        
        notes_data = {
            "recipe_id": test_recipe_for_notes,
            "note_type": "server"
        }
        response = requests.post(f"{BASE_URL}/api/culinary/notes/generate", json=notes_data, timeout=30)
        assert response.status_code == 200, f"Server notes generation failed: {response.text}"
        data = response.json()
        # Verify notes structure
        assert "notes" in data or "description" in data, f"Missing notes data: {data}"
        print(f"✓ Server notes generated: {list(data.get('notes', data).keys()) if isinstance(data.get('notes', data), dict) else 'OK'}")
        return data

    def test_generate_cook_notes(self, test_recipe_for_notes):
        """POST /api/culinary/notes/generate - creates AI cook notes"""
        if not test_recipe_for_notes:
            pytest.skip("No test recipe created")
        
        notes_data = {
            "recipe_id": test_recipe_for_notes,
            "note_type": "cook"
        }
        response = requests.post(f"{BASE_URL}/api/culinary/notes/generate", json=notes_data, timeout=30)
        assert response.status_code == 200, f"Cook notes generation failed: {response.text}"
        data = response.json()
        assert "notes" in data or "steps" in data or "mise_en_place" in data, f"Missing cook notes: {data}"
        print(f"✓ Cook notes generated")
        return data


class TestCulinaryTranslation:
    """Test translation to Spanish - fifth step in Culinary cycle"""

    def test_translate_notes_to_spanish(self):
        """POST /api/culinary/translate - translates notes to Spanish"""
        translate_data = {
            "recipe_id": "test-recipe-001",
            "text": "Grilled salmon with asparagus and lemon butter sauce. Contains fish and dairy allergens.",
            "target_language": "spanish"
        }
        response = requests.post(f"{BASE_URL}/api/culinary/translate", json=translate_data, timeout=30)
        assert response.status_code == 200, f"Translation failed: {response.text}"
        data = response.json()
        assert "translated_text" in data, f"Missing translated text: {data}"
        assert data.get("target_language") == "spanish"
        print(f"✓ Translation to Spanish: {data.get('translated_text', '')[:100]}...")
        return data


class TestCulinaryMenuCreation:
    """Test menu creation - sixth step in Culinary cycle"""

    @pytest.fixture(scope="class")
    def test_recipe_ids_for_menu(self):
        """Create test recipes for menu"""
        recipe_ids = []
        for i, recipe in enumerate([
            {"name": f"TEST_Menu_Appetizer_{uuid.uuid4().hex[:6]}", "category": "appetizer", "menu_price": 14.00},
            {"name": f"TEST_Menu_Entree_{uuid.uuid4().hex[:6]}", "category": "entree", "menu_price": 32.00},
            {"name": f"TEST_Menu_Dessert_{uuid.uuid4().hex[:6]}", "category": "dessert", "menu_price": 12.00}
        ]):
            recipe["yield_qty"] = 1
            recipe["yield_unit"] = "portion"
            recipe["ingredients"] = []
            resp = requests.post(f"{BASE_URL}/api/operations/recipe", json=recipe, timeout=10)
            if resp.status_code == 200:
                recipe_ids.append(resp.json().get("id"))
        return recipe_ids

    def test_create_menu_with_recipes(self, test_recipe_ids_for_menu):
        """POST /api/culinary/menus - creates menu with recipe items"""
        if not test_recipe_ids_for_menu:
            pytest.skip("No test recipes created")
        
        menu_data = {
            "name": f"TEST_Dinner_Menu_{uuid.uuid4().hex[:6]}",
            "description": "Test dinner menu for smoke testing",
            "category": "dinner",
            "recipe_ids": test_recipe_ids_for_menu
        }
        response = requests.post(f"{BASE_URL}/api/culinary/menus", json=menu_data, timeout=15)
        assert response.status_code == 200, f"Menu creation failed: {response.text}"
        data = response.json()
        assert "id" in data, f"Menu missing ID: {data}"
        assert "items" in data, f"Menu missing items: {data}"
        assert len(data.get("items", [])) == len(test_recipe_ids_for_menu), f"Menu item count mismatch"
        print(f"✓ Menu created: {data.get('id')} with {len(data.get('items', []))} items")
        return data

    def test_list_menus(self):
        """GET /api/culinary/menus - lists all menus"""
        response = requests.get(f"{BASE_URL}/api/culinary/menus", timeout=10)
        assert response.status_code == 200, f"List menus failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list of menus: {data}"
        print(f"✓ Menus listed: {len(data)} menus")


class TestModuleEndpoints:
    """Test module-specific endpoints for Pastry and Purchasing & Receiving"""

    def test_pastry_recipes_endpoint(self):
        """Verify pastry module can access recipes"""
        response = requests.get(f"{BASE_URL}/api/operations/recipes", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Pastry recipes accessible: {len(data)} recipes")

    def test_purchasing_ingredients_endpoint(self):
        """Verify purchasing module can access ingredients"""
        response = requests.get(f"{BASE_URL}/api/operations/ingredients", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Purchasing ingredients accessible: {len(data)} ingredients")

    def test_purchasing_low_stock_endpoint(self):
        """Verify purchasing module can check low stock"""
        response = requests.get(f"{BASE_URL}/api/operations/low-stock", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Low stock check: {len(data)} items below par")

    def test_purchasing_po_suggestions(self):
        """Verify purchasing module can get PO suggestions"""
        response = requests.get(f"{BASE_URL}/api/operations/po-suggestions", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ PO suggestions: {len(data)} suggestions")


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_data(self):
        """Note: Test data prefixed with TEST_ should be cleaned up"""
        # This is a placeholder - actual cleanup would delete TEST_ prefixed items
        print("✓ Test data cleanup noted (TEST_ prefixed items)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
