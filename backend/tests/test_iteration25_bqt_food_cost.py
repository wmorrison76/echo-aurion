"""
Iteration 25 - BQT Food Cost & Portion Sizing Enhancement Tests
================================================================
Tests for:
- BQT portion standards endpoint (14-18% target, 6-8oz entree, 8oz duo)
- Attach menu with portion_size_oz, is_duo, duo_proteins, duo_split_oz
- BEO document includes food_cost_target_min_pct=14 and food_cost_target_max_pct=18
- Food cost analysis endpoint with status, recommendations, item_analysis
- Post financials includes bqt_target_range and food_cost_status
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")


class TestBQTPortionStandards:
    """Test GET /api/event-workflow/bqt-portion-standards"""

    def test_bqt_portion_standards_returns_correct_structure(self):
        """Verify BQT portion standards endpoint returns correct data structure"""
        response = requests.get(f"{BASE_URL}/api/event-workflow/bqt-portion-standards")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify food cost targets (14-18%)
        assert "food_cost_target_min" in data, "Missing food_cost_target_min"
        assert "food_cost_target_max" in data, "Missing food_cost_target_max"
        assert data["food_cost_target_min"] == 14.0, f"Expected 14.0, got {data['food_cost_target_min']}"
        assert data["food_cost_target_max"] == 18.0, f"Expected 18.0, got {data['food_cost_target_max']}"
        
        # Verify portions structure
        assert "portions" in data, "Missing portions"
        portions = data["portions"]
        
        # Verify entree portion (6-8oz)
        assert "entree" in portions, "Missing entree portion standard"
        entree = portions["entree"]
        assert entree["min_oz"] == 6.0, f"Entree min_oz should be 6.0, got {entree['min_oz']}"
        assert entree["max_oz"] == 8.0, f"Entree max_oz should be 8.0, got {entree['max_oz']}"
        
        # Verify duo entree (8oz total)
        assert "entree_duo" in portions, "Missing entree_duo portion standard"
        duo = portions["entree_duo"]
        assert duo["min_oz"] == 8.0, f"Duo min_oz should be 8.0, got {duo['min_oz']}"
        assert duo["max_oz"] == 8.0, f"Duo max_oz should be 8.0, got {duo['max_oz']}"
        
        # Verify appetizer (3-5oz)
        assert "appetizer" in portions, "Missing appetizer portion standard"
        app = portions["appetizer"]
        assert app["min_oz"] == 3.0, f"Appetizer min_oz should be 3.0, got {app['min_oz']}"
        assert app["max_oz"] == 5.0, f"Appetizer max_oz should be 5.0, got {app['max_oz']}"
        
        # Verify dessert (4-6oz)
        assert "dessert" in portions, "Missing dessert portion standard"
        dessert = portions["dessert"]
        assert dessert["min_oz"] == 4.0, f"Dessert min_oz should be 4.0, got {dessert['min_oz']}"
        assert dessert["max_oz"] == 6.0, f"Dessert max_oz should be 6.0, got {dessert['max_oz']}"
        
        print(f"PASS: BQT portion standards returned correctly - 14-18% target, entree 6-8oz, duo 8oz")


class TestEventCreationWithPortions:
    """Test creating event and attaching menu with portion sizing"""
    
    @pytest.fixture(scope="class")
    def test_event(self):
        """Create a test event for portion testing"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "event_name": f"TEST_BQT_Portion_Event_{unique_id}",
            "client_name": "Test Client",
            "client_email": "test@example.com",
            "client_phone": "555-1234",
            "client_company": "Test Corp",
            "event_type": "corporate",
            "event_date": "2026-07-15",
            "start_time": "18:00",
            "end_time": "23:00",
            "guest_count": 100,
            "guaranteed_count": 100,
            "venue": "Test Venue",
            "room": "Grand Ballroom",
            "setup_style": "Banquet Rounds",
            "notes": "BQT portion testing event"
        }
        response = requests.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=payload)
        assert response.status_code == 200, f"Failed to create event: {response.text}"
        data = response.json()
        event_id = data["event"]["id"]
        print(f"Created test event: {event_id}")
        return event_id
    
    def test_attach_menu_with_duo_entree(self, test_event):
        """Test attaching menu with duo entree (Filet + Lobster, 5oz+3oz split)"""
        event_id = test_event
        
        # 3-course menu with duo entree
        payload = {
            "event_id": event_id,
            "courses": [
                {
                    "course": "appetizer",
                    "dish_name": "Seared Tuna Tataki",
                    "description": "Sesame-crusted tuna with ponzu",
                    "quantity": 1,
                    "portion_size_oz": 4.0,
                    "is_duo": False
                },
                {
                    "course": "entree",
                    "dish_name": "Filet & Lobster Duo",
                    "description": "Filet Mignon with Butter-Poached Lobster Tail",
                    "quantity": 1,
                    "portion_size_oz": 8.0,  # Total 8oz for duo
                    "is_duo": True,
                    "duo_proteins": ["Filet Mignon", "Lobster Tail"],
                    "duo_split_oz": [5.0, 3.0]  # 5oz filet + 3oz lobster
                },
                {
                    "course": "dessert",
                    "dish_name": "Chocolate Lava Cake",
                    "description": "Warm chocolate fondant with vanilla ice cream",
                    "quantity": 1,
                    "portion_size_oz": 5.0,
                    "is_duo": False
                }
            ],
            "dietary_requirements": ["vegetarian-option", "gluten-free-option"],
            "beo_notes": "BQT portion test - duo entree with 5oz+3oz split"
        }
        
        response = requests.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=payload)
        assert response.status_code == 200, f"Failed to attach menu: {response.text}"
        
        data = response.json()
        beo = data["beo"]
        
        # Verify BEO has food cost targets
        assert "food_cost_target_min_pct" in beo, "Missing food_cost_target_min_pct in BEO"
        assert "food_cost_target_max_pct" in beo, "Missing food_cost_target_max_pct in BEO"
        assert beo["food_cost_target_min_pct"] == 14.0, f"Expected 14.0, got {beo['food_cost_target_min_pct']}"
        assert beo["food_cost_target_max_pct"] == 18.0, f"Expected 18.0, got {beo['food_cost_target_max_pct']}"
        
        # Verify menu items have portion data
        menu_items = beo["menu_items"]
        assert len(menu_items) == 3, f"Expected 3 menu items, got {len(menu_items)}"
        
        # Check appetizer
        appetizer = menu_items[0]
        assert appetizer["portion_size_oz"] == 4.0, f"Appetizer portion should be 4.0oz"
        assert appetizer["is_duo"] == False, "Appetizer should not be duo"
        assert "portion_standard" in appetizer, "Missing portion_standard in appetizer"
        
        # Check duo entree
        entree = menu_items[1]
        assert entree["portion_size_oz"] == 8.0, f"Duo entree portion should be 8.0oz total"
        assert entree["is_duo"] == True, "Entree should be marked as duo"
        assert entree["duo_proteins"] == ["Filet Mignon", "Lobster Tail"], f"Duo proteins mismatch"
        assert entree["duo_split_oz"] == [5.0, 3.0], f"Duo split should be [5.0, 3.0]"
        assert "portion_standard" in entree, "Missing portion_standard in entree"
        
        # Check dessert
        dessert = menu_items[2]
        assert dessert["portion_size_oz"] == 5.0, f"Dessert portion should be 5.0oz"
        assert dessert["is_duo"] == False, "Dessert should not be duo"
        
        print(f"PASS: Menu attached with duo entree - 5oz Filet + 3oz Lobster = 8oz total")
        return event_id
    
    def test_get_beo_enriches_menu_items(self, test_event):
        """Test GET /api/event-workflow/beo/{event_id} enriches menu items"""
        event_id = test_event
        
        response = requests.get(f"{BASE_URL}/api/event-workflow/beo/{event_id}")
        assert response.status_code == 200, f"Failed to get BEO: {response.text}"
        
        beo = response.json()
        
        # Verify BEO structure
        assert "food_cost_target_min_pct" in beo, "Missing food_cost_target_min_pct"
        assert "food_cost_target_max_pct" in beo, "Missing food_cost_target_max_pct"
        assert beo["food_cost_target_min_pct"] == 14.0
        assert beo["food_cost_target_max_pct"] == 18.0
        
        # Verify menu items have portion data
        for item in beo.get("menu_items", []):
            assert "portion_size_oz" in item, f"Missing portion_size_oz in {item.get('course')}"
            assert "is_duo" in item, f"Missing is_duo in {item.get('course')}"
            assert "portion_standard" in item, f"Missing portion_standard in {item.get('course')}"
            
            # If recipe attached, should have recipe_portion_size_oz
            if item.get("recipe_id"):
                # recipe_portion_size_oz is added when recipe exists
                pass  # This is optional based on recipe existence
        
        print(f"PASS: BEO enriched with portion data for all menu items")


class TestFoodCostAnalysis:
    """Test POST /api/event-workflow/food-cost-analysis"""
    
    @pytest.fixture(scope="class")
    def analysis_event(self):
        """Create event with menu for food cost analysis"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create event
        event_payload = {
            "event_name": f"TEST_FoodCost_Analysis_{unique_id}",
            "client_name": "Analysis Test Client",
            "event_type": "corporate",
            "event_date": "2026-08-20",
            "start_time": "18:00",
            "end_time": "22:00",
            "guest_count": 50,
            "guaranteed_count": 50,
            "venue": "Test Venue",
            "room": "Test Room"
        }
        response = requests.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=event_payload)
        assert response.status_code == 200
        event_id = response.json()["event"]["id"]
        
        # Attach menu with various portion sizes
        menu_payload = {
            "event_id": event_id,
            "courses": [
                {
                    "course": "appetizer",
                    "dish_name": "Test Appetizer",
                    "portion_size_oz": 4.0,
                    "is_duo": False
                },
                {
                    "course": "entree",
                    "dish_name": "Test Duo Entree",
                    "portion_size_oz": 8.0,
                    "is_duo": True,
                    "duo_proteins": ["Beef", "Shrimp"],
                    "duo_split_oz": [5.0, 3.0]
                },
                {
                    "course": "dessert",
                    "dish_name": "Test Dessert",
                    "portion_size_oz": 5.0,
                    "is_duo": False
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=menu_payload)
        assert response.status_code == 200
        
        return event_id
    
    def test_food_cost_analysis_returns_correct_structure(self, analysis_event):
        """Test food cost analysis returns status, recommendations, item_analysis"""
        event_id = analysis_event
        
        payload = {
            "event_id": event_id,
            "menu_price_per_guest": 95.00
        }
        
        response = requests.post(f"{BASE_URL}/api/event-workflow/food-cost-analysis", json=payload)
        assert response.status_code == 200, f"Failed food cost analysis: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "status" in data, "Missing status field"
        assert data["status"] in ["below_target", "on_target", "above_target"], f"Invalid status: {data['status']}"
        
        assert "recommendations" in data, "Missing recommendations field"
        assert isinstance(data["recommendations"], list), "recommendations should be a list"
        
        assert "item_analysis" in data, "Missing item_analysis field"
        assert isinstance(data["item_analysis"], list), "item_analysis should be a list"
        
        # Verify target range
        assert "target_range" in data, "Missing target_range"
        assert data["target_range"]["min"] == 14.0, "Target min should be 14.0"
        assert data["target_range"]["max"] == 18.0, "Target max should be 18.0"
        
        # Verify item analysis has portion validation
        for item in data["item_analysis"]:
            assert "course" in item, "Missing course in item_analysis"
            assert "dish_name" in item, "Missing dish_name in item_analysis"
            assert "portion_size_oz" in item, "Missing portion_size_oz in item_analysis"
            assert "portion_status" in item, "Missing portion_status in item_analysis"
            assert "portion_standard" in item, "Missing portion_standard in item_analysis"
            assert "is_duo" in item, "Missing is_duo in item_analysis"
            assert "cost_per_portion" in item, "Missing cost_per_portion in item_analysis"
            
            # Verify portion_status is valid
            assert item["portion_status"] in ["ok", "under", "over"], f"Invalid portion_status: {item['portion_status']}"
        
        # Verify food cost metrics
        assert "food_cost_pct" in data, "Missing food_cost_pct"
        assert "food_cost_per_guest" in data, "Missing food_cost_per_guest"
        assert "total_food_cost" in data, "Missing total_food_cost"
        assert "status_message" in data, "Missing status_message"
        
        print(f"PASS: Food cost analysis returned - status: {data['status']}, {len(data['item_analysis'])} items analyzed")
    
    def test_food_cost_analysis_validates_portions_against_standards(self, analysis_event):
        """Test that food cost analysis validates portions against BQT standards"""
        event_id = analysis_event
        
        payload = {
            "event_id": event_id,
            "menu_price_per_guest": 95.00
        }
        
        response = requests.post(f"{BASE_URL}/api/event-workflow/food-cost-analysis", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Find the duo entree in item_analysis
        duo_item = None
        for item in data["item_analysis"]:
            if item.get("is_duo"):
                duo_item = item
                break
        
        assert duo_item is not None, "Duo entree not found in item_analysis"
        
        # Verify duo entree has correct portion standard (8oz for duo)
        assert duo_item["portion_standard"]["min_oz"] == 8.0, "Duo min should be 8oz"
        assert duo_item["portion_standard"]["max_oz"] == 8.0, "Duo max should be 8oz"
        
        # Verify duo proteins and split are preserved
        assert duo_item["duo_proteins"] == ["Beef", "Shrimp"], "Duo proteins mismatch"
        assert duo_item["duo_split_oz"] == [5.0, 3.0], "Duo split mismatch"
        
        print(f"PASS: Portion validation working - duo entree validated against 8oz standard")


class TestPostFinancialsWithBQTTargets:
    """Test POST /api/event-workflow/post-financials includes BQT targets"""
    
    @pytest.fixture(scope="class")
    def financials_event(self):
        """Create event with menu for financials testing"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create event
        event_payload = {
            "event_name": f"TEST_Financials_BQT_{unique_id}",
            "client_name": "Financials Test Client",
            "event_type": "corporate",
            "event_date": "2026-09-15",
            "start_time": "18:00",
            "end_time": "22:00",
            "guest_count": 75,
            "guaranteed_count": 75,
            "venue": "Test Venue",
            "room": "Test Room"
        }
        response = requests.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=event_payload)
        assert response.status_code == 200
        event_id = response.json()["event"]["id"]
        
        # Attach menu
        menu_payload = {
            "event_id": event_id,
            "courses": [
                {
                    "course": "appetizer",
                    "dish_name": "Test App",
                    "portion_size_oz": 4.0,
                    "is_duo": False
                },
                {
                    "course": "entree",
                    "dish_name": "Test Entree",
                    "portion_size_oz": 7.0,
                    "is_duo": False
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=menu_payload)
        assert response.status_code == 200
        
        return event_id
    
    def test_post_financials_includes_bqt_target_range(self, financials_event):
        """Test post-financials includes bqt_target_range and food_cost_status in COGS"""
        event_id = financials_event
        
        payload = {
            "event_id": event_id,
            "menu_price_per_guest": 95.00,
            "beverage_price_per_guest": 45.00,
            "room_rental": 2500.00,
            "av_misc": 1200.00,
            "service_charge_pct": 22.0,
            "tax_pct": 7.5
        }
        
        response = requests.post(f"{BASE_URL}/api/event-workflow/post-financials", json=payload)
        assert response.status_code == 200, f"Failed to post financials: {response.text}"
        
        data = response.json()
        
        # Verify COGS section has BQT target range
        assert "cogs" in data, "Missing cogs section"
        cogs = data["cogs"]
        
        assert "bqt_target_range" in cogs, "Missing bqt_target_range in COGS"
        assert cogs["bqt_target_range"]["min"] == 14.0, "BQT target min should be 14.0"
        assert cogs["bqt_target_range"]["max"] == 18.0, "BQT target max should be 18.0"
        
        assert "food_cost_status" in cogs, "Missing food_cost_status in COGS"
        assert cogs["food_cost_status"] in ["below_target", "on_target", "above_target"], \
            f"Invalid food_cost_status: {cogs['food_cost_status']}"
        
        assert "food_cost_pct" in cogs, "Missing food_cost_pct in COGS"
        
        print(f"PASS: Post financials includes BQT targets - status: {cogs['food_cost_status']}, "
              f"food_cost_pct: {cogs['food_cost_pct']}%, target: 14-18%")


class TestHealthAndListEndpoints:
    """Basic health and list endpoint tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is working"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Health endpoint working")
    
    def test_list_beos_endpoint(self):
        """Test list BEOs endpoint"""
        response = requests.get(f"{BASE_URL}/api/event-workflow/beos")
        assert response.status_code == 200
        data = response.json()
        assert "beos" in data
        assert "total" in data
        print(f"PASS: List BEOs endpoint working - {data['total']} BEOs found")


class TestErrorHandling:
    """Test error handling for invalid requests"""
    
    def test_food_cost_analysis_invalid_event(self):
        """Test food cost analysis with non-existent event"""
        payload = {
            "event_id": "non-existent-event-id",
            "menu_price_per_guest": 95.00
        }
        response = requests.post(f"{BASE_URL}/api/event-workflow/food-cost-analysis", json=payload)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Food cost analysis returns 404 for invalid event")
    
    def test_beo_not_found(self):
        """Test BEO endpoint with non-existent event"""
        response = requests.get(f"{BASE_URL}/api/event-workflow/beo/non-existent-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: BEO endpoint returns 404 for invalid event")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
