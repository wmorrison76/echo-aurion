"""
Iteration 78: Menu Designer Feature Tests
==========================================
Testing the Menu Designer feature for the Guest Ordering Platform:
- GET /api/guest-order/style - returns current style with 19 fonts
- GET /api/guest-order/manager/style - returns current style + 5 layout presets
- PUT /api/guest-order/manager/style - updates font_heading and saves to DB
- POST /api/guest-order/manager/style/preset/{layout} - applies layout presets
- Verify all 5 presets: classic, modern, bistro, fine_dining, brewery
- Verify existing guest ordering APIs still work
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMenuDesignerStyle:
    """Menu Designer Style API Tests"""
    
    def test_get_public_style_returns_fonts(self):
        """GET /api/guest-order/style returns current style with 19 fonts"""
        response = requests.get(f"{BASE_URL}/api/guest-order/style")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify fonts list exists and has 19 fonts
        assert "fonts" in data, "Response should contain 'fonts' list"
        fonts = data["fonts"]
        assert len(fonts) == 19, f"Expected 19 fonts, got {len(fonts)}"
        
        # Verify font structure
        for font in fonts:
            assert "name" in font, "Font should have 'name'"
            assert "category" in font, "Font should have 'category'"
            assert "style" in font, "Font should have 'style'"
            assert "url" in font, "Font should have 'url'"
        
        # Verify default style fields exist
        assert "font_heading" in data, "Should have font_heading"
        assert "font_body" in data, "Should have font_body"
        assert "font_accent" in data, "Should have font_accent"
        assert "color_background" in data, "Should have color_background"
        assert "color_card" in data, "Should have color_card"
        assert "color_accent" in data, "Should have color_accent"
        assert "color_gold" in data, "Should have color_gold"
        assert "color_text" in data, "Should have color_text"
        assert "color_muted" in data, "Should have color_muted"
        assert "layout" in data, "Should have layout"
        assert "show_emoji" in data, "Should have show_emoji"
        assert "show_prep_time" in data, "Should have show_prep_time"
        assert "show_description" in data, "Should have show_description"
        assert "header_text" in data, "Should have header_text"
        assert "border_radius" in data, "Should have border_radius"
        assert "card_style" in data, "Should have card_style"
        print(f"✓ Public style API returns {len(fonts)} fonts and all style fields")

    def test_get_manager_style_returns_layouts(self):
        """GET /api/guest-order/manager/style returns current style + 5 layout presets"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/style")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify structure
        assert "current" in data, "Should have 'current' style"
        assert "fonts" in data, "Should have 'fonts' list"
        assert "layouts" in data, "Should have 'layouts' dict"
        assert "layout_names" in data, "Should have 'layout_names' list"
        
        # Verify 5 layout presets
        layout_names = data["layout_names"]
        expected_layouts = ["classic", "modern", "bistro", "fine_dining", "brewery"]
        assert len(layout_names) == 5, f"Expected 5 layouts, got {len(layout_names)}"
        for layout in expected_layouts:
            assert layout in layout_names, f"Missing layout: {layout}"
        
        # Verify layouts dict has all presets with proper structure
        layouts = data["layouts"]
        for layout_name in expected_layouts:
            assert layout_name in layouts, f"Layouts dict missing: {layout_name}"
            preset = layouts[layout_name]
            assert "font_heading" in preset, f"{layout_name} missing font_heading"
            assert "font_body" in preset, f"{layout_name} missing font_body"
            assert "color_background" in preset, f"{layout_name} missing color_background"
        
        print(f"✓ Manager style API returns 5 layout presets: {layout_names}")

    def test_update_style_font_heading(self):
        """PUT /api/guest-order/manager/style updates font_heading and saves to DB"""
        # First get current style
        get_response = requests.get(f"{BASE_URL}/api/guest-order/manager/style")
        current = get_response.json()["current"]
        
        # Update font_heading to a different font
        new_font = "Cinzel" if current.get("font_heading") != "Cinzel" else "Montserrat"
        update_data = {**current, "font_heading": new_font}
        
        response = requests.put(
            f"{BASE_URL}/api/guest-order/manager/style",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("updated") == True, "Should return updated: true"
        assert data.get("font_heading") == new_font, f"font_heading should be {new_font}"
        
        # Verify persistence by fetching again
        verify_response = requests.get(f"{BASE_URL}/api/guest-order/style")
        verify_data = verify_response.json()
        assert verify_data.get("font_heading") == new_font, "Font change should persist"
        
        print(f"✓ Style update persisted: font_heading = {new_font}")


class TestLayoutPresets:
    """Layout Preset Application Tests"""
    
    def test_apply_fine_dining_preset(self):
        """POST /api/guest-order/manager/style/preset/fine_dining applies dark theme with Cinzel"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/fine_dining")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("applied") == "fine_dining", "Should return applied: fine_dining"
        assert data.get("font_heading") == "Cinzel", "fine_dining should use Cinzel font"
        assert data.get("font_body") == "Cormorant Garamond", "fine_dining should use Cormorant Garamond body"
        assert data.get("color_background") == "#0a0a0f", "fine_dining should have dark background"
        assert data.get("card_style") == "glass", "fine_dining should use glass card style"
        
        # Verify persistence
        verify = requests.get(f"{BASE_URL}/api/guest-order/style")
        verify_data = verify.json()
        assert verify_data.get("font_heading") == "Cinzel", "Cinzel font should persist"
        assert verify_data.get("color_background") == "#0a0a0f", "Dark background should persist"
        
        print("✓ fine_dining preset applied: dark theme with Cinzel font")

    def test_apply_brewery_preset(self):
        """POST /api/guest-order/manager/style/preset/brewery applies amber/dark theme with Abril Fatface"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/brewery")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("applied") == "brewery", "Should return applied: brewery"
        assert data.get("font_heading") == "Abril Fatface", "brewery should use Abril Fatface"
        assert data.get("font_body") == "Poppins", "brewery should use Poppins body"
        assert data.get("color_background") == "#1c1917", "brewery should have dark background"
        assert data.get("color_gold") == "#f59e0b", "brewery should have amber gold"
        
        print("✓ brewery preset applied: amber/dark theme with Abril Fatface")

    def test_apply_classic_preset(self):
        """POST /api/guest-order/manager/style/preset/classic resets to light theme with Playfair Display"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/classic")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("applied") == "classic", "Should return applied: classic"
        assert data.get("font_heading") == "Playfair Display", "classic should use Playfair Display"
        assert data.get("font_body") == "Inter", "classic should use Inter body"
        assert data.get("color_background") == "#faf9f7", "classic should have light background"
        assert data.get("card_style") == "elevated", "classic should use elevated card style"
        
        print("✓ classic preset applied: light theme with Playfair Display")

    def test_apply_modern_preset(self):
        """POST /api/guest-order/manager/style/preset/modern applies modern theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/modern")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("applied") == "modern", "Should return applied: modern"
        assert data.get("font_heading") == "Montserrat", "modern should use Montserrat"
        assert data.get("font_body") == "DM Sans", "modern should use DM Sans body"
        assert data.get("card_style") == "bordered", "modern should use bordered card style"
        
        print("✓ modern preset applied: Montserrat with bordered cards")

    def test_apply_bistro_preset(self):
        """POST /api/guest-order/manager/style/preset/bistro applies warm theme"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/bistro")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("applied") == "bistro", "Should return applied: bistro"
        assert data.get("font_heading") == "EB Garamond", "bistro should use EB Garamond"
        assert data.get("font_body") == "Libre Baskerville", "bistro should use Libre Baskerville body"
        assert data.get("card_style") == "flat", "bistro should use flat card style"
        
        print("✓ bistro preset applied: warm theme with EB Garamond")

    def test_invalid_preset_returns_400(self):
        """POST /api/guest-order/manager/style/preset/invalid returns 400"""
        response = requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/invalid_preset")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid preset returns 400 error")


class TestGuestOrderingAPIsStillWork:
    """Verify existing guest ordering APIs still work after Menu Designer changes"""
    
    def test_guest_auth_works(self):
        """POST /api/guest-order/auth still authenticates guests"""
        response = requests.post(
            f"{BASE_URL}/api/guest-order/auth",
            json={"room_number": "412", "last_name": "Smith"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("authenticated") == True, "Should authenticate"
        assert "token" in data, "Should return token"
        assert data.get("room_number") == "412", "Should return room number"
        print("✓ Guest auth still works: Room 412, Smith")

    def test_guest_menu_works(self):
        """GET /api/guest-order/menu still returns time-filtered menu"""
        response = requests.get(f"{BASE_URL}/api/guest-order/menu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "current_period" in data, "Should have current_period"
        assert "menu" in data, "Should have menu"
        assert "total_items" in data, "Should have total_items"
        print(f"✓ Guest menu works: {data['current_period']['label']} with {data['total_items']} items")

    def test_manager_periods_works(self):
        """GET /api/guest-order/manager/periods still returns periods"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/periods")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "periods" in data, "Should have periods"
        periods = data["periods"]
        assert len(periods) == 3, f"Expected 3 periods, got {len(periods)}"
        period_ids = [p["period_id"] for p in periods]
        assert "breakfast" in period_ids, "Should have breakfast period"
        assert "all_day" in period_ids, "Should have all_day period"
        assert "overnight" in period_ids, "Should have overnight period"
        print(f"✓ Manager periods works: {period_ids}")

    def test_manager_menu_works(self):
        """GET /api/guest-order/manager/menu still returns all items"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/menu")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "items" in data, "Should have items"
        items = data["items"]
        assert len(items) > 0, "Should have menu items"
        print(f"✓ Manager menu works: {len(items)} items")

    def test_manager_alerts_works(self):
        """GET /api/guest-order/manager/alerts still returns alerts"""
        response = requests.get(f"{BASE_URL}/api/guest-order/manager/alerts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "alerts" in data, "Should have alerts"
        assert "count" in data, "Should have count"
        print(f"✓ Manager alerts works: {data['count']} alerts")


class TestFontCategories:
    """Verify font categories and styles"""
    
    def test_font_categories_complete(self):
        """Verify all font categories are present: serif, sans-serif, script, monospace"""
        response = requests.get(f"{BASE_URL}/api/guest-order/style")
        data = response.json()
        fonts = data["fonts"]
        
        categories = set(f["category"] for f in fonts)
        expected_categories = {"serif", "sans-serif", "script", "monospace"}
        
        for cat in expected_categories:
            assert cat in categories, f"Missing font category: {cat}"
        
        # Count fonts per category
        category_counts = {}
        for f in fonts:
            cat = f["category"]
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        print(f"✓ Font categories: {category_counts}")
        
        # Verify specific artistic/acrylic fonts in script category
        script_fonts = [f["name"] for f in fonts if f["category"] == "script"]
        artistic_fonts = ["Great Vibes", "Sacramento", "Dancing Script", "Pacifico", "Satisfy", "Lobster"]
        for font in artistic_fonts:
            assert font in script_fonts, f"Missing artistic font: {font}"
        
        print(f"✓ Artistic/script fonts present: {script_fonts}")


class TestDisplayOptions:
    """Test display options (show_emoji, show_prep_time, show_description)"""
    
    def test_toggle_display_options(self):
        """Verify display options can be toggled"""
        # Get current style
        get_response = requests.get(f"{BASE_URL}/api/guest-order/manager/style")
        current = get_response.json()["current"]
        
        # Toggle show_emoji
        new_show_emoji = not current.get("show_emoji", True)
        update_data = {**current, "show_emoji": new_show_emoji}
        
        response = requests.put(
            f"{BASE_URL}/api/guest-order/manager/style",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        # Verify
        verify = requests.get(f"{BASE_URL}/api/guest-order/style")
        verify_data = verify.json()
        assert verify_data.get("show_emoji") == new_show_emoji, "show_emoji should toggle"
        
        # Reset to original
        update_data["show_emoji"] = current.get("show_emoji", True)
        requests.put(f"{BASE_URL}/api/guest-order/manager/style", json=update_data)
        
        print(f"✓ Display options can be toggled (show_emoji: {new_show_emoji})")


# Reset to classic preset at the end of tests
@pytest.fixture(scope="module", autouse=True)
def reset_to_classic():
    """Reset style to classic preset after all tests"""
    yield
    requests.post(f"{BASE_URL}/api/guest-order/manager/style/preset/classic")
    print("✓ Reset to classic preset after tests")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
