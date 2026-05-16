"""
Iteration 97: PWA Features Testing
Tests for PWA manifest, icons, and related static files
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPWAManifest:
    """Tests for PWA manifest.json"""
    
    def test_manifest_accessible(self):
        """GET /manifest.json - returns 200"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: manifest.json is accessible")
    
    def test_manifest_valid_json(self):
        """GET /manifest.json - returns valid JSON"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Manifest should be a JSON object"
        print("PASSED: manifest.json is valid JSON")
    
    def test_manifest_name(self):
        """GET /manifest.json - name contains 'Echo AURION'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert "name" in data, "Manifest should have 'name' field"
        assert "Echo AURION" in data["name"], f"Name should contain 'Echo AURION', got: {data['name']}"
        print(f"PASSED: manifest name is '{data['name']}'")
    
    def test_manifest_short_name(self):
        """GET /manifest.json - short_name is 'Echo AURION'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert "short_name" in data, "Manifest should have 'short_name' field"
        assert data["short_name"] == "Echo AURION", f"short_name should be 'Echo AURION', got: {data['short_name']}"
        print(f"PASSED: manifest short_name is '{data['short_name']}'")
    
    def test_manifest_display_standalone(self):
        """GET /manifest.json - display is 'standalone'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert "display" in data, "Manifest should have 'display' field"
        assert data["display"] == "standalone", f"display should be 'standalone', got: {data['display']}"
        print(f"PASSED: manifest display is '{data['display']}'")
    
    def test_manifest_display_override(self):
        """GET /manifest.json - display_override includes 'window-controls-overlay'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert "display_override" in data, "Manifest should have 'display_override' field"
        assert isinstance(data["display_override"], list), "display_override should be a list"
        assert "window-controls-overlay" in data["display_override"], \
            f"display_override should include 'window-controls-overlay', got: {data['display_override']}"
        print(f"PASSED: manifest display_override is {data['display_override']}")
    
    def test_manifest_icons_count(self):
        """GET /manifest.json - icons array has 10 entries (8 regular + 2 maskable)"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert "icons" in data, "Manifest should have 'icons' field"
        assert isinstance(data["icons"], list), "icons should be a list"
        assert len(data["icons"]) == 10, f"icons should have 10 entries, got: {len(data['icons'])}"
        print(f"PASSED: manifest has {len(data['icons'])} icons")
    
    def test_manifest_icons_have_required_fields(self):
        """GET /manifest.json - each icon has src, sizes, type"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        for i, icon in enumerate(data["icons"]):
            assert "src" in icon, f"Icon {i} missing 'src'"
            assert "sizes" in icon, f"Icon {i} missing 'sizes'"
            assert "type" in icon, f"Icon {i} missing 'type'"
        print("PASSED: all icons have required fields (src, sizes, type)")
    
    def test_manifest_has_maskable_icons(self):
        """GET /manifest.json - has maskable icons"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        maskable_icons = [icon for icon in data["icons"] if icon.get("purpose") == "maskable"]
        assert len(maskable_icons) >= 2, f"Should have at least 2 maskable icons, got: {len(maskable_icons)}"
        print(f"PASSED: manifest has {len(maskable_icons)} maskable icons")


class TestPWAIcons:
    """Tests for PWA icon files"""
    
    def test_icon_192_exists(self):
        """GET /icons/icon-192.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-192.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert len(response.content) > 100, "Icon file should have content"
        print("PASSED: icon-192.png exists and has content")
    
    def test_icon_512_exists(self):
        """GET /icons/icon-512.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-512.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert len(response.content) > 100, "Icon file should have content"
        print("PASSED: icon-512.png exists and has content")
    
    def test_icon_maskable_192_exists(self):
        """GET /icons/icon-maskable-192.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-maskable-192.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert len(response.content) > 100, "Icon file should have content"
        print("PASSED: icon-maskable-192.png exists and has content")
    
    def test_icon_maskable_512_exists(self):
        """GET /icons/icon-maskable-512.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-maskable-512.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert len(response.content) > 100, "Icon file should have content"
        print("PASSED: icon-maskable-512.png exists and has content")
    
    def test_icon_48_exists(self):
        """GET /icons/icon-48.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-48.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: icon-48.png exists")
    
    def test_icon_72_exists(self):
        """GET /icons/icon-72.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-72.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: icon-72.png exists")
    
    def test_icon_96_exists(self):
        """GET /icons/icon-96.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-96.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: icon-96.png exists")
    
    def test_icon_128_exists(self):
        """GET /icons/icon-128.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-128.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: icon-128.png exists")
    
    def test_icon_256_exists(self):
        """GET /icons/icon-256.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-256.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: icon-256.png exists")
    
    def test_icon_384_exists(self):
        """GET /icons/icon-384.png - returns 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-384.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: icon-384.png exists")


class TestPWAScreenshots:
    """Tests for PWA screenshot files"""
    
    def test_screenshot_mobile_512_exists(self):
        """GET /screenshots/mobile-512.png - returns 200"""
        response = requests.get(f"{BASE_URL}/screenshots/mobile-512.png", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert len(response.content) > 100, "Screenshot file should have content"
        print("PASSED: mobile-512.png screenshot exists")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health - still works"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: /api/health still works")
    
    def test_command_center_endpoint(self):
        """GET /api/enterprise/command-center - still works"""
        response = requests.get(f"{BASE_URL}/api/enterprise/command-center", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASSED: /api/enterprise/command-center still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
