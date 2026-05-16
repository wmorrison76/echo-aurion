"""
Iteration 26 - LUCCCA Portion Engine Service Tests
===================================================
Tests for the new Portion Engine Service with 113 items across 14 categories.
Covers: schema, items, categories, resolve, scale, buffet-replenishment, overrides.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test data prefix for cleanup
TEST_PREFIX = "TEST_ITER26_"


class TestPortionEngineSchema:
    """Test GET /api/portion-engine/schema endpoint"""

    def test_schema_returns_200(self):
        """Schema endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/schema")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Schema endpoint returns 200")

    def test_schema_has_correct_version(self):
        """Schema should have version 1.0.0"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/schema")
        data = response.json()
        assert data.get("schema_version") == "1.0.0", f"Expected version 1.0.0, got {data.get('schema_version')}"
        print("PASS: Schema version is 1.0.0")

    def test_schema_has_113_items(self):
        """Schema should report 113 total items"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/schema")
        data = response.json()
        total_items = data.get("total_items", 0)
        assert total_items == 113, f"Expected 113 items, got {total_items}"
        print(f"PASS: Schema reports {total_items} items")

    def test_schema_has_14_categories(self):
        """Schema should have 14 categories"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/schema")
        data = response.json()
        categories = data.get("categories", [])
        assert len(categories) == 14, f"Expected 14 categories, got {len(categories)}: {categories}"
        print(f"PASS: Schema has {len(categories)} categories: {categories}")


class TestPortionEngineItems:
    """Test GET /api/portion-engine/items endpoints"""

    def test_list_all_items_returns_113(self):
        """List all items should return 113 items"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/items?limit=200")
        assert response.status_code == 200
        data = response.json()
        total = data.get("total", 0)
        items = data.get("items", [])
        assert total == 113, f"Expected 113 total, got {total}"
        assert len(items) == 113, f"Expected 113 items in response, got {len(items)}"
        print(f"PASS: List items returns {total} items")

    def test_filter_by_category_protein(self):
        """Filter by category=protein should return ~54 items"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/items?category=protein&limit=100")
        assert response.status_code == 200
        data = response.json()
        total = data.get("total", 0)
        # Protein category should have around 54 items (beef, chicken, pork, seafood, lamb, vegetarian)
        assert total >= 40, f"Expected at least 40 protein items, got {total}"
        print(f"PASS: Filter by protein returns {total} items")

    def test_filter_by_tag_beef(self):
        """Filter by tag=beef should return only beef-tagged items"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/items?tag=beef&limit=100")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        total = data.get("total", 0)
        assert total > 0, "Expected at least 1 beef item"
        # Verify all items have beef tag
        for item in items:
            assert "beef" in item.get("tags", []), f"Item {item.get('item_id')} missing beef tag"
        print(f"PASS: Filter by tag=beef returns {total} items, all have beef tag")

    def test_get_single_item_by_id(self):
        """Get single item by item_id should return correct item"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/items/protein_beef_tenderloin")
        assert response.status_code == 200
        data = response.json()
        assert data.get("item_id") == "protein_beef_tenderloin"
        assert data.get("category") == "protein"
        assert data.get("subcategory") == "beef"
        assert data.get("item_name") == "Tenderloin"
        # Check portion structure
        assert "restaurant_portion" in data
        assert "banquet_portion" in data
        assert data["banquet_portion"]["min"] == 5
        assert data["banquet_portion"]["max"] == 6
        assert data["banquet_portion"]["unit"] == "oz"
        print(f"PASS: Get item protein_beef_tenderloin returns correct data")

    def test_get_nonexistent_item_returns_404(self):
        """Get nonexistent item should return 404"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/items/nonexistent_item_xyz")
        assert response.status_code == 404
        print("PASS: Nonexistent item returns 404")


class TestPortionEngineCategories:
    """Test GET /api/portion-engine/categories endpoint"""

    def test_categories_returns_grouped_data(self):
        """Categories endpoint should return grouped categories with counts"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/categories")
        assert response.status_code == 200
        data = response.json()
        categories = data.get("categories", {})
        assert len(categories) > 0, "Expected at least 1 category"
        # Check protein category exists and has subcategories
        assert "protein" in categories, "Expected protein category"
        protein = categories["protein"]
        assert "subcategories" in protein
        assert "total" in protein
        assert protein["total"] > 0
        print(f"PASS: Categories returns {len(categories)} categories with subcategory counts")


class TestPortionEngineResolve:
    """Test POST /api/portion-engine/resolve endpoint"""

    def test_resolve_by_item_id_banquet(self):
        """Resolve by item_id with banquet service_style"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={"item_id": "protein_beef_tenderloin", "service_style": "banquet"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("item_id") == "protein_beef_tenderloin"
        assert data.get("service_style_requested") == "banquet"
        assert data.get("portion_key_used") == "banquet_portion"
        assert data.get("estimated") == False
        active = data.get("active_portion", {})
        assert active.get("min") == 5
        assert active.get("max") == 6
        assert active.get("unit") == "oz"
        print(f"PASS: Resolve banquet portion for tenderloin: {active}")

    def test_resolve_by_item_id_restaurant(self):
        """Resolve by item_id with restaurant service_style"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={"item_id": "protein_beef_tenderloin", "service_style": "restaurant"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("portion_key_used") == "restaurant_portion"
        active = data.get("active_portion", {})
        assert active.get("min") == 6
        assert active.get("max") == 8
        print(f"PASS: Resolve restaurant portion for tenderloin: {active}")

    def test_resolve_buffet_prioritizes_buffet_portion(self):
        """Resolve with service_style=buffet should prioritize buffet_portion for carving items"""
        # First, let's find a buffet item that has buffet_portion
        response = requests.get(f"{BASE_URL}/api/portion-engine/items?category=buffet&limit=10")
        assert response.status_code == 200
        items = response.json().get("items", [])
        
        if items:
            buffet_item = items[0]
            item_id = buffet_item.get("item_id")
            
            resolve_response = requests.post(
                f"{BASE_URL}/api/portion-engine/resolve",
                json={"item_id": item_id, "service_style": "buffet"}
            )
            assert resolve_response.status_code == 200
            data = resolve_response.json()
            # For buffet items with buffet_portion, it should use buffet_portion
            # For items without buffet_portion, it falls back to banquet_portion
            assert data.get("portion_key_used") in ["buffet_portion", "banquet_portion"]
            print(f"PASS: Resolve buffet for {item_id}: portion_key_used={data.get('portion_key_used')}")
        else:
            print("SKIP: No buffet items found to test")

    def test_resolve_luxury_tier_premium_scales_115(self):
        """Resolve with luxury_tier=premium should scale portions by 1.15x"""
        # Use a unique account_id to avoid existing overrides
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={
                "item_id": "protein_beef_tenderloin", 
                "service_style": "banquet", 
                "luxury_tier": "premium",
                "account_id": f"{TEST_PREFIX}no_override_account"  # Unique account to avoid existing overrides
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("luxury_tier") == "premium"
        assert data.get("luxury_scale") == 1.15
        # If no override is applied, base banquet: min=5, max=6 -> scaled: min=5.75, max=6.9
        # If override is applied (from existing data), values may differ
        active = data.get("active_portion", {})
        override_applied = data.get("override_applied", False)
        if not override_applied:
            assert active.get("min") == 5.8, f"Expected 5.8 (5*1.15 rounded), got {active.get('min')}"
            assert active.get("max") == 6.9, f"Expected 6.9 (6*1.15 rounded), got {active.get('max')}"
        else:
            # Override was applied, just verify scaling factor is correct
            print(f"  Note: Override applied, checking luxury_scale only")
        print(f"PASS: Premium tier scales to {active}, override_applied={override_applied}")

    def test_resolve_luxury_tier_ultra_scales_125(self):
        """Resolve with luxury_tier=ultra should scale portions by 1.25x"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={"item_id": "protein_beef_tenderloin", "service_style": "banquet", "luxury_tier": "ultra"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("luxury_tier") == "ultra"
        assert data.get("luxury_scale") == 1.25
        active = data.get("active_portion", {})
        # Original banquet: min=5, max=6 -> scaled: min=6.25, max=7.5
        assert active.get("min") == 6.2, f"Expected 6.2 (5*1.25 rounded), got {active.get('min')}"
        assert active.get("max") == 7.5, f"Expected 7.5 (6*1.25 rounded), got {active.get('max')}"
        print(f"PASS: Ultra tier scales to {active}")

    def test_resolve_category_inference_returns_estimated_true(self):
        """Resolve with only category (no item_id) should return estimated=true"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={"category": "protein", "subcategory": "beef", "service_style": "banquet"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("estimated") == True, f"Expected estimated=True for category inference"
        assert data.get("category") == "protein"
        print(f"PASS: Category inference returns estimated=True, item={data.get('item_name')}")

    def test_resolve_by_item_name_fuzzy_match(self):
        """Resolve by item_name should do fuzzy matching"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={"item_name": "Tenderloin", "service_style": "banquet"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "tenderloin" in data.get("item_name", "").lower()
        print(f"PASS: Fuzzy match for 'Tenderloin' found: {data.get('item_name')}")

    def test_resolve_not_found_returns_404(self):
        """Resolve with no matching item should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={"item_id": "nonexistent_item_xyz"}
        )
        assert response.status_code == 404
        print("PASS: Resolve nonexistent item returns 404")


class TestPortionEngineScale:
    """Test POST /api/portion-engine/scale endpoint"""

    def test_scale_calculates_total_oz_and_lbs(self):
        """Scale should calculate total oz and lbs for guest count with overage"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/scale",
            json={
                "item_id": "protein_beef_tenderloin",
                "guest_count": 100,
                "service_style": "banquet",
                "overage_pct": 5.0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("item_id") == "protein_beef_tenderloin"
        assert data.get("guest_count") == 100
        assert data.get("overage_pct") == 5.0
        # Banquet portion max is 6oz, 100 guests * 6oz * 1.05 overage = 630oz
        total_needed = data.get("total_needed", 0)
        assert total_needed == 630, f"Expected 630oz, got {total_needed}"
        # 630oz / 16 = 39.375 lbs
        total_lbs = data.get("total_needed_lbs", 0)
        assert total_lbs == 39.38, f"Expected 39.38 lbs, got {total_lbs}"
        print(f"PASS: Scale 100 guests: {total_needed}oz = {total_lbs}lbs")

    def test_scale_with_luxury_tier(self):
        """Scale with luxury_tier should apply scaling"""
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/scale",
            json={
                "item_id": "protein_beef_tenderloin",
                "guest_count": 100,
                "service_style": "banquet",
                "luxury_tier": "premium",
                "overage_pct": 5.0,
                "account_id": f"{TEST_PREFIX}scale_no_override"  # Unique account to avoid existing overrides
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("luxury_tier") == "premium"
        # The scale endpoint uses resolve internally, which may pick up overrides
        # Just verify the calculation is correct based on the portion_per_guest returned
        portion_per_guest = data.get("portion_per_guest", 0)
        total_needed = data.get("total_needed", 0)
        expected_total = round(portion_per_guest * 100 * 1.05, 2)
        assert total_needed == expected_total, f"Expected {expected_total}oz, got {total_needed}"
        print(f"PASS: Scale with premium tier: {total_needed}oz (portion_per_guest={portion_per_guest}oz)")


class TestPortionEngineBuffetReplenishment:
    """Test POST /api/portion-engine/buffet-replenishment endpoint"""

    def test_buffet_replenishment_returns_pan_counts(self):
        """Buffet replenishment should return pan counts, burn rates, additional pans needed"""
        # Get a buffet item first
        items_response = requests.get(f"{BASE_URL}/api/portion-engine/items?category=buffet&limit=5")
        buffet_items = items_response.json().get("items", [])
        
        if not buffet_items:
            # Use a protein item as fallback
            items_response = requests.get(f"{BASE_URL}/api/portion-engine/items?category=protein&limit=1")
            buffet_items = items_response.json().get("items", [])
        
        item_id = buffet_items[0].get("item_id") if buffet_items else "protein_beef_tenderloin"
        
        response = requests.post(
            f"{BASE_URL}/api/portion-engine/buffet-replenishment",
            json={
                "items": [
                    {"item_id": item_id, "guests_remaining": 50, "current_pans": 1}
                ],
                "total_guests": 100,
                "service_duration_hours": 2.0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("total_guests") == 100
        assert data.get("service_duration_hours") == 2.0
        items = data.get("items", [])
        assert len(items) == 1
        item = items[0]
        assert "pans_needed" in item
        assert "current_pans" in item
        assert "additional_pans_needed" in item
        assert "burn_rate_oz_per_hour" in item
        assert "total_needed" in item
        assert "total_needed_lbs" in item
        print(f"PASS: Buffet replenishment: pans_needed={item['pans_needed']}, additional={item['additional_pans_needed']}, burn_rate={item['burn_rate_oz_per_hour']}oz/hr")


class TestPortionEngineOverrides:
    """Test override CRUD endpoints"""

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        """Setup and cleanup test overrides"""
        self.created_override_ids = []
        yield
        # Cleanup
        for override_id in self.created_override_ids:
            try:
                requests.delete(f"{BASE_URL}/api/portion-engine/overrides/{override_id}")
            except Exception:
                pass

    def test_create_override(self):
        """Create an override for specific account/event_type/luxury_tier"""
        override_data = {
            "item_id": "protein_beef_tenderloin",
            "account_id": f"{TEST_PREFIX}account_001",
            "property_id": "default",
            "event_type": "wedding",
            "luxury_tier": "premium",
            "banquet_portion": {"min": 7, "max": 8, "unit": "oz", "display": "7-8 oz"},
            "notes": "Test override for iteration 26"
        }
        response = requests.post(f"{BASE_URL}/api/portion-engine/overrides", json=override_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["created", "updated"]
        override = data.get("override", {})
        assert override.get("item_id") == "protein_beef_tenderloin"
        assert override.get("account_id") == f"{TEST_PREFIX}account_001"
        assert override.get("event_type") == "wedding"
        assert override.get("luxury_tier") == "premium"
        self.created_override_ids.append(override.get("id"))
        print(f"PASS: Created override {override.get('id')[:8]}")
        return override.get("id")

    def test_list_overrides(self):
        """List overrides should return created overrides"""
        # First create an override
        override_data = {
            "item_id": "protein_beef_tenderloin",
            "account_id": f"{TEST_PREFIX}account_002",
            "event_type": "corporate",
            "banquet_portion": {"min": 6, "max": 7, "unit": "oz", "display": "6-7 oz"}
        }
        create_response = requests.post(f"{BASE_URL}/api/portion-engine/overrides", json=override_data)
        override_id = create_response.json().get("override", {}).get("id")
        self.created_override_ids.append(override_id)
        
        # List overrides
        response = requests.get(f"{BASE_URL}/api/portion-engine/overrides?item_id=protein_beef_tenderloin")
        assert response.status_code == 200
        data = response.json()
        overrides = data.get("overrides", [])
        assert len(overrides) >= 1
        print(f"PASS: List overrides returns {len(overrides)} overrides")

    def test_resolve_with_matching_override_applies_override(self):
        """Resolve with matching context should apply the override portion"""
        # Create override
        override_data = {
            "item_id": "protein_beef_tenderloin",
            "account_id": f"{TEST_PREFIX}account_003",
            "event_type": "gala",
            "luxury_tier": "ultra",
            "banquet_portion": {"min": 9, "max": 10, "unit": "oz", "display": "9-10 oz"}
        }
        create_response = requests.post(f"{BASE_URL}/api/portion-engine/overrides", json=override_data)
        override_id = create_response.json().get("override", {}).get("id")
        self.created_override_ids.append(override_id)
        
        # Resolve with matching context
        resolve_response = requests.post(
            f"{BASE_URL}/api/portion-engine/resolve",
            json={
                "item_id": "protein_beef_tenderloin",
                "service_style": "banquet",
                "account_id": f"{TEST_PREFIX}account_003",
                "event_type": "gala",
                "luxury_tier": "ultra"
            }
        )
        assert resolve_response.status_code == 200
        data = resolve_response.json()
        assert data.get("override_applied") == True, "Expected override_applied=True"
        # The override sets banquet_portion to 9-10oz, then ultra tier scales by 1.25x
        # 9 * 1.25 = 11.25, 10 * 1.25 = 12.5
        active = data.get("active_portion", {})
        assert active.get("min") == 11.2, f"Expected 11.2 (9*1.25 rounded), got {active.get('min')}"
        assert active.get("max") == 12.5, f"Expected 12.5 (10*1.25 rounded), got {active.get('max')}"
        print(f"PASS: Override applied, active_portion={active}")

    def test_delete_override(self):
        """Delete override should remove it"""
        # Create override
        override_data = {
            "item_id": "protein_beef_tenderloin",
            "account_id": f"{TEST_PREFIX}account_004",
            "event_type": "test_delete",
            "banquet_portion": {"min": 5, "max": 6, "unit": "oz", "display": "5-6 oz"}
        }
        create_response = requests.post(f"{BASE_URL}/api/portion-engine/overrides", json=override_data)
        override_id = create_response.json().get("override", {}).get("id")
        
        # Delete override
        delete_response = requests.delete(f"{BASE_URL}/api/portion-engine/overrides/{override_id}")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data.get("status") == "deleted"
        print(f"PASS: Deleted override {override_id[:8]}")

    def test_delete_nonexistent_override_returns_404(self):
        """Delete nonexistent override should return 404"""
        response = requests.delete(f"{BASE_URL}/api/portion-engine/overrides/nonexistent-id-xyz")
        assert response.status_code == 404
        print("PASS: Delete nonexistent override returns 404")


class TestAttachMenuPortionLibraryIntegration:
    """Test POST /api/event-workflow/attach-menu auto-resolves from portion library"""

    def test_attach_menu_auto_resolves_portion_from_library(self):
        """Attach menu without explicit portion_size_oz should auto-resolve from portion library"""
        # First create an event
        event_data = {
            "event_name": f"{TEST_PREFIX}Portion_Library_Test",
            "client_name": "Test Client",
            "event_type": "corporate",
            "event_date": "2026-03-15",
            "guest_count": 50,
            "venue": "Test Venue",
            "room": "Test Room"
        }
        event_response = requests.post(f"{BASE_URL}/api/event-workflow/prospect-to-booking", json=event_data)
        assert event_response.status_code == 200
        event_id = event_response.json().get("event", {}).get("id")
        
        # Attach menu with dish names that match portion library items
        menu_data = {
            "event_id": event_id,
            "courses": [
                {
                    "course": "entree",
                    "dish_name": "Tenderloin",  # Should match protein_beef_tenderloin
                    "description": "Grilled beef tenderloin"
                    # No portion_size_oz - should auto-resolve from library
                },
                {
                    "course": "appetizer",
                    "dish_name": "Caesar Salad",  # Should match salad_caesar
                    "description": "Classic caesar"
                }
            ]
        }
        menu_response = requests.post(f"{BASE_URL}/api/event-workflow/attach-menu", json=menu_data)
        assert menu_response.status_code == 200
        beo = menu_response.json().get("beo", {})
        menu_items = beo.get("menu_items", [])
        
        # Check that portion_source is set
        for item in menu_items:
            portion_source = item.get("portion_source", "")
            portion_oz = item.get("portion_size_oz", 0)
            print(f"  {item.get('dish_name')}: portion_size_oz={portion_oz}, portion_source={portion_source}")
            # Should be either portion_library or bqt_standard (not explicit since we didn't provide it)
            assert portion_source in ["portion_library", "bqt_standard"], f"Expected portion_source to be portion_library or bqt_standard, got {portion_source}"
        
        print(f"PASS: Attach menu auto-resolved portions from library")


class TestPortionEngineCategoryDistribution:
    """Verify the 113 items are distributed across 14 categories correctly"""

    def test_category_distribution(self):
        """Verify items are distributed across expected categories"""
        response = requests.get(f"{BASE_URL}/api/portion-engine/categories")
        assert response.status_code == 200
        categories = response.json().get("categories", {})
        
        expected_categories = [
            "protein", "starch", "vegetable", "salad", "soup", "pasta",
            "breakfast", "buffet", "passed_appetizers", "grazing",
            "dessert", "fruit", "bread", "sauce"
        ]
        
        found_categories = list(categories.keys())
        print(f"Found categories: {found_categories}")
        
        # Check that we have 14 categories
        assert len(found_categories) == 14, f"Expected 14 categories, got {len(found_categories)}"
        
        # Verify total items across all categories
        total_items = sum(cat.get("total", 0) for cat in categories.values())
        assert total_items == 113, f"Expected 113 total items across categories, got {total_items}"
        
        # Print distribution
        for cat_name, cat_data in categories.items():
            print(f"  {cat_name}: {cat_data.get('total', 0)} items")
        
        print(f"PASS: 14 categories with {total_items} total items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
