"""
Iteration 136: Cake Designer v3.0 Asset Library Tests
=====================================================
Tests for:
- 15 textures with roughness/metalness values
- 12 piping patterns with complexity and time estimates
- 8 flower arrangements with time and cost per item
- 12 templates across 5 categories (wedding/kids/novelty/seasonal/celebration)
- 10 stands with material properties and prices
- Order generation with full costing breakdown
- Consultation CRUD endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestCakeAssetTextures:
    """Tests for GET /api/cake-assets/textures - 15 textures with roughness/metalness"""

    def test_get_all_textures_returns_15(self):
        """Verify 15 textures are returned"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/textures")
        assert response.status_code == 200
        data = response.json()
        assert "textures" in data
        assert data["total"] == 15
        assert len(data["textures"]) == 15

    def test_textures_have_roughness_metalness(self):
        """Verify all textures have roughness and metalness values"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/textures")
        data = response.json()
        for tex in data["textures"]:
            assert "roughness" in tex, f"Texture {tex['name']} missing roughness"
            assert "metalness" in tex, f"Texture {tex['name']} missing metalness"
            assert isinstance(tex["roughness"], (int, float))
            assert isinstance(tex["metalness"], (int, float))
            assert 0 <= tex["roughness"] <= 1
            assert 0 <= tex["metalness"] <= 1

    def test_mirror_glaze_texture_properties(self):
        """Verify Mirror Glaze has correct roughness (0.08) and metalness (0.3)"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/textures")
        data = response.json()
        mirror_glaze = next((t for t in data["textures"] if "mirror" in t["name"].lower()), None)
        assert mirror_glaze is not None, "Mirror Glaze texture not found"
        assert mirror_glaze["roughness"] == 0.08
        assert mirror_glaze["metalness"] == 0.3

    def test_geode_crystal_texture_exists(self):
        """Verify Geode Crystal texture exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/textures")
        data = response.json()
        geode = next((t for t in data["textures"] if "geode" in t["name"].lower()), None)
        assert geode is not None, "Geode Crystal texture not found"
        assert geode["category"] == "special"

    def test_metallic_textures_exist(self):
        """Verify metallic textures (gold, silver, rose gold) exist"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/textures")
        data = response.json()
        names = [t["name"].lower() for t in data["textures"]]
        assert any("gold" in n and "metallic" in n for n in names), "Metallic Gold not found"
        assert any("silver" in n and "metallic" in n for n in names), "Metallic Silver not found"
        assert any("rose" in n for n in names), "Rose Gold not found"


class TestCakeAssetPiping:
    """Tests for GET /api/cake-assets/piping - 12 patterns with complexity and time"""

    def test_get_all_piping_returns_12(self):
        """Verify 12 piping patterns are returned"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/piping")
        assert response.status_code == 200
        data = response.json()
        assert "patterns" in data
        assert data["total"] == 12
        assert len(data["patterns"]) == 12

    def test_piping_has_complexity_and_time(self):
        """Verify all piping patterns have complexity and time_min"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/piping")
        data = response.json()
        for pattern in data["patterns"]:
            assert "complexity" in pattern, f"Pattern {pattern['name']} missing complexity"
            assert "time_min" in pattern, f"Pattern {pattern['name']} missing time_min"
            assert 1 <= pattern["complexity"] <= 5
            assert pattern["time_min"] > 0

    def test_cornelli_lace_complexity_5_time_120(self):
        """Verify Cornelli Lace has complexity 5 and 120 min time"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/piping")
        data = response.json()
        cornelli = next((p for p in data["patterns"] if "cornelli" in p["name"].lower()), None)
        assert cornelli is not None, "Cornelli Lace not found"
        assert cornelli["complexity"] == 5
        assert cornelli["time_min"] == 120

    def test_basket_weave_complexity_4_time_90(self):
        """Verify Basket Weave has complexity 4 and 90 min time"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/piping")
        data = response.json()
        basket = next((p for p in data["patterns"] if "basket" in p["name"].lower()), None)
        assert basket is not None, "Basket Weave not found"
        assert basket["complexity"] == 4
        assert basket["time_min"] == 90

    def test_shell_rope_rosette_patterns_exist(self):
        """Verify shell, rope, rosette patterns exist"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/piping")
        data = response.json()
        names = [p["name"].lower() for p in data["patterns"]]
        assert any("shell" in n for n in names), "Shell Border not found"
        assert any("rope" in n for n in names), "Rope Border not found"
        assert any("rosette" in n for n in names), "Rosette Border not found"


class TestCakeAssetFlowers:
    """Tests for GET /api/cake-assets/flowers - 8 arrangements with time and cost"""

    def test_get_all_flowers_returns_8(self):
        """Verify 8 flower arrangements are returned"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        assert response.status_code == 200
        data = response.json()
        assert "flowers" in data
        assert data["total"] == 8
        assert len(data["flowers"]) == 8

    def test_flowers_have_time_and_cost(self):
        """Verify all flowers have time_hr and cost_per"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        data = response.json()
        for flower in data["flowers"]:
            assert "time_hr" in flower, f"Flower {flower['name']} missing time_hr"
            assert "cost_per" in flower, f"Flower {flower['name']} missing cost_per"
            assert flower["time_hr"] > 0
            assert flower["cost_per"] > 0

    def test_cascading_roses_exists(self):
        """Verify Cascading Roses arrangement exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        data = response.json()
        roses = next((f for f in data["flowers"] if "cascading" in f["name"].lower()), None)
        assert roses is not None, "Cascading Roses not found"
        assert roses["style"] == "cascade"

    def test_sugar_peonies_exists(self):
        """Verify Sugar Peonies arrangement exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        data = response.json()
        peonies = next((f for f in data["flowers"] if "peony" in f["name"].lower() or "peonies" in f["name"].lower()), None)
        assert peonies is not None, "Sugar Peonies not found"

    def test_orchid_spray_exists(self):
        """Verify Orchid Spray arrangement exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        data = response.json()
        orchid = next((f for f in data["flowers"] if "orchid" in f["name"].lower()), None)
        assert orchid is not None, "Orchid Spray not found"
        assert orchid["style"] == "spray"

    def test_tropical_arrangement_exists(self):
        """Verify Tropical Arrangement exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/flowers")
        data = response.json()
        tropical = next((f for f in data["flowers"] if "tropical" in f["name"].lower()), None)
        assert tropical is not None, "Tropical Arrangement not found"


class TestCakeAssetTemplates:
    """Tests for GET /api/cake-assets/templates - 12 templates across 5 categories"""

    def test_get_all_templates_returns_12(self):
        """Verify 12 templates are returned"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert data["total"] == 12
        assert len(data["templates"]) == 12

    def test_templates_have_5_categories(self):
        """Verify templates span 5 categories: wedding, kids, novelty, seasonal, celebration"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        data = response.json()
        categories = set(t["category"] for t in data["templates"])
        expected = {"wedding", "kids", "novelty", "seasonal", "celebration"}
        assert categories == expected, f"Expected {expected}, got {categories}"

    def test_filter_wedding_templates(self):
        """Verify filtering by category=wedding returns only wedding templates"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates?category=wedding")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for t in data["templates"]:
            assert t["category"] == "wedding"

    def test_classic_wedding_3tier_exists(self):
        """Verify Classic Wedding 3-Tier template exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        data = response.json()
        classic = next((t for t in data["templates"] if "classic wedding" in t["name"].lower()), None)
        assert classic is not None, "Classic Wedding 3-Tier not found"
        assert classic["category"] == "wedding"
        assert len(classic["tiers"]) == 3

    def test_mad_hatter_template_exists(self):
        """Verify Mad Hatter Tea Party template exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        data = response.json()
        mad_hatter = next((t for t in data["templates"] if "mad hatter" in t["name"].lower()), None)
        assert mad_hatter is not None, "Mad Hatter Tea Party not found"
        assert mad_hatter["category"] == "novelty"

    def test_princess_castle_template_exists(self):
        """Verify Princess Castle template exists (kids category)"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        data = response.json()
        princess = next((t for t in data["templates"] if "princess" in t["name"].lower()), None)
        assert princess is not None, "Princess Castle not found"
        assert princess["category"] == "kids"

    def test_christmas_elegance_template_exists(self):
        """Verify Christmas Elegance template exists (seasonal category)"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        data = response.json()
        christmas = next((t for t in data["templates"] if "christmas" in t["name"].lower()), None)
        assert christmas is not None, "Christmas Elegance not found"
        assert christmas["category"] == "seasonal"

    def test_mirror_glaze_showpiece_template_exists(self):
        """Verify Mirror Glaze Showpiece template exists (celebration category)"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/templates")
        data = response.json()
        mirror = next((t for t in data["templates"] if "mirror glaze" in t["name"].lower()), None)
        assert mirror is not None, "Mirror Glaze Showpiece not found"
        assert mirror["category"] == "celebration"


class TestCakeAssetStands:
    """Tests for GET /api/cake-assets/stands - 10 stands with material properties"""

    def test_get_all_stands_returns_10(self):
        """Verify 10 stands are returned"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        assert response.status_code == 200
        data = response.json()
        assert "stands" in data
        assert data["total"] == 10
        assert len(data["stands"]) == 10

    def test_stands_have_material_properties(self):
        """Verify all stands have metalness, roughness, and price"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        data = response.json()
        for stand in data["stands"]:
            assert "metalness" in stand, f"Stand {stand['name']} missing metalness"
            assert "roughness" in stand, f"Stand {stand['name']} missing roughness"
            assert "price" in stand, f"Stand {stand['name']} missing price"
            assert stand["price"] > 0

    def test_crystal_pedestal_exists(self):
        """Verify Crystal Pedestal stand exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        data = response.json()
        crystal = next((s for s in data["stands"] if "crystal" in s["name"].lower()), None)
        assert crystal is not None, "Crystal Pedestal not found"

    def test_wood_rustic_stand_exists(self):
        """Verify Rustic Wood Slice stand exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        data = response.json()
        wood = next((s for s in data["stands"] if "wood" in s["name"].lower()), None)
        assert wood is not None, "Rustic Wood Slice not found"
        assert wood["metalness"] == 0  # Wood has no metalness

    def test_acrylic_clear_stand_exists(self):
        """Verify Clear Acrylic Riser stand exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        data = response.json()
        acrylic = next((s for s in data["stands"] if "acrylic" in s["name"].lower()), None)
        assert acrylic is not None, "Clear Acrylic Riser not found"

    def test_floating_illusion_stand_exists(self):
        """Verify Floating Illusion stand exists"""
        response = requests.get(f"{BASE_URL}/api/cake-assets/stands")
        data = response.json()
        floating = next((s for s in data["stands"] if "floating" in s["name"].lower()), None)
        assert floating is not None, "Floating Illusion not found"


class TestCakeOrderGeneration:
    """Tests for POST /api/cake-assets/order - print-ready order with costing"""

    def test_create_order_returns_order_number(self):
        """Verify order creation returns order_number"""
        payload = {
            "design": {
                "name": "TEST_Order_Cake",
                "version": "V001",
                "tiers": [
                    {"shape": "round", "diameter": 10, "height": 5, "flavor": "Chocolate", "frostingStyle": "fondant", "frostingColor": "#ffffff", "fillingFlavor": "Ganache"}
                ],
                "decorations": [],
                "stand": "crystal"
            },
            "client": {"name": "TEST_Client", "email": "test@example.com"}
        }
        response = requests.post(f"{BASE_URL}/api/cake-assets/order", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "order_number" in data
        assert data["order_number"].startswith("CK-")

    def test_order_has_full_costing_breakdown(self):
        """Verify order includes full costing breakdown"""
        payload = {
            "design": {
                "name": "TEST_Costing_Cake",
                "tiers": [
                    {"shape": "round", "diameter": 12, "height": 5, "flavor": "Vanilla Bean", "frostingStyle": "buttercream", "frostingColor": "#ffffff", "fillingFlavor": "Raspberry Jam"},
                    {"shape": "round", "diameter": 9, "height": 5, "flavor": "Chocolate", "frostingStyle": "fondant", "frostingColor": "#ffffff", "fillingFlavor": "Ganache"}
                ],
                "decorations": [{"name": "Rose", "type": "flower", "color": "#ff0000"}]
            },
            "client": {"name": "TEST_Client"}
        }
        response = requests.post(f"{BASE_URL}/api/cake-assets/order", json=payload)
        data = response.json()
        assert "costing" in data
        costing = data["costing"]
        assert "food_cost" in costing
        assert "labor_hours" in costing
        assert "labor_cost" in costing
        assert "total_cost" in costing
        assert "suggested_price" in costing
        assert "per_serving" in costing

    def test_order_has_production_notes(self):
        """Verify order includes production_notes with assembly time"""
        payload = {
            "design": {
                "name": "TEST_Production_Cake",
                "tiers": [
                    {"shape": "round", "diameter": 10, "height": 4, "flavor": "Vanilla Bean", "frostingStyle": "fondant", "frostingColor": "#ffffff", "fillingFlavor": "Lemon Curd"}
                ],
                "decorations": []
            },
            "client": {}
        }
        response = requests.post(f"{BASE_URL}/api/cake-assets/order", json=payload)
        data = response.json()
        assert "production_notes" in data
        assert "assembly time" in data["production_notes"].lower()

    def test_order_calculates_servings(self):
        """Verify order calculates total_servings"""
        payload = {
            "design": {
                "name": "TEST_Servings_Cake",
                "tiers": [
                    {"shape": "round", "diameter": 10, "height": 5, "flavor": "Vanilla Bean", "frostingStyle": "buttercream", "frostingColor": "#ffffff", "fillingFlavor": "None"}
                ],
                "decorations": []
            },
            "client": {}
        }
        response = requests.post(f"{BASE_URL}/api/cake-assets/order", json=payload)
        data = response.json()
        assert "total_servings" in data
        assert data["total_servings"] > 0

    def test_order_tier_details(self):
        """Verify order includes tier details with servings and costs"""
        payload = {
            "design": {
                "name": "TEST_Tier_Details",
                "tiers": [
                    {"shape": "round", "diameter": 8, "height": 4, "flavor": "Chocolate", "frostingStyle": "ganache", "frostingColor": "#3d1c0a", "fillingFlavor": "Chocolate Ganache"}
                ],
                "decorations": []
            },
            "client": {}
        }
        response = requests.post(f"{BASE_URL}/api/cake-assets/order", json=payload)
        data = response.json()
        assert "tiers" in data
        assert len(data["tiers"]) == 1
        tier = data["tiers"][0]
        assert "servings" in tier
        assert "food_cost" in tier
        assert "labor_hrs" in tier


class TestCakeConsultation:
    """Tests for consultation CRUD endpoints"""

    def test_create_consultation(self):
        """Verify consultation creation returns session_id and share_link"""
        payload = {
            "client_name": "TEST_Consultation_Client",
            "designer_name": "TEST_Designer",
            "initial_design": {"name": "Test Cake"}
        }
        response = requests.post(f"{BASE_URL}/api/cake-consultation/create", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["session_id"].startswith("consult-")
        assert "share_link" in data
        assert "expires_at" in data

    def test_get_consultation_session(self):
        """Verify getting consultation session returns design state"""
        # First create a session
        create_resp = requests.post(f"{BASE_URL}/api/cake-consultation/create", json={
            "client_name": "TEST_Get_Client",
            "designer_name": "TEST_Designer",
            "initial_design": {"name": "Get Test Cake"}
        })
        session_id = create_resp.json()["session_id"]

        # Then get it
        response = requests.get(f"{BASE_URL}/api/cake-consultation/session/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["client_name"] == "TEST_Get_Client"
        assert "design_state" in data

    def test_approve_consultation(self):
        """Verify consultation approval endpoint works"""
        # Create session
        create_resp = requests.post(f"{BASE_URL}/api/cake-consultation/create", json={
            "client_name": "TEST_Approve_Client",
            "designer_name": "TEST_Designer"
        })
        session_id = create_resp.json()["session_id"]

        # Approve it
        response = requests.post(f"{BASE_URL}/api/cake-consultation/session/{session_id}/approve", json={
            "comments": "Looks great!",
            "client_name": "TEST_Approve_Client"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "approved"

        # Verify approval persisted
        get_resp = requests.get(f"{BASE_URL}/api/cake-consultation/session/{session_id}")
        assert get_resp.json()["client_approved"] == True

    def test_add_comment_to_consultation(self):
        """Verify adding comment to consultation works"""
        # Create session
        create_resp = requests.post(f"{BASE_URL}/api/cake-consultation/create", json={
            "client_name": "TEST_Comment_Client",
            "designer_name": "TEST_Designer"
        })
        session_id = create_resp.json()["session_id"]

        # Add comment
        response = requests.post(f"{BASE_URL}/api/cake-consultation/session/{session_id}/comment", json={
            "sender": "Client",
            "text": "Can we add more roses?"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "comment_added"
        assert "message" in data
        assert data["message"]["text"] == "Can we add more roses?"

    def test_list_active_consultations(self):
        """Verify listing active consultations works"""
        response = requests.get(f"{BASE_URL}/api/cake-consultation/active")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "total" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
