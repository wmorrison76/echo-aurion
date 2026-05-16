"""iter256 · Avatar & Profile Switching Tests
Tests for William's avatar bug fixes:
1. /profiles returns both id and user_id fields
2. /profiles returns picture field with Echo_B/F/M/R rotation
3. /profiles sorted with admin/director first
4. switch-profile works with user_id field
5. /me with X-Dev-User-Id header returns correct user
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProfilesEndpoint:
    """Tests for GET /api/auth/jwt/profiles"""
    
    def test_profiles_returns_14_rows(self):
        """Verify /profiles returns 14 cleaned rows (test users filtered)"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/profiles")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        rows = data.get("rows", [])
        assert len(rows) == 14, f"Expected 14 profiles, got {len(rows)}"
    
    def test_profiles_have_both_id_and_user_id(self):
        """Each row must have BOTH id and user_id fields"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/profiles")
        assert r.status_code == 200
        rows = r.json().get("rows", [])
        for row in rows:
            assert "id" in row, f"Row missing 'id': {row}"
            assert "user_id" in row, f"Row missing 'user_id': {row}"
            assert row["id"] == row["user_id"], f"id != user_id: {row}"
    
    def test_profiles_have_picture_field(self):
        """Each row must have picture field set to Echo_B/F/M/R or URL"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/profiles")
        assert r.status_code == 200
        rows = r.json().get("rows", [])
        valid_echo = {"Echo_B", "Echo_F", "Echo_M", "Echo_R"}
        for row in rows:
            pic = row.get("picture")
            assert pic is not None, f"Row missing picture: {row}"
            # Either an Echo key or a URL
            assert pic in valid_echo or pic.startswith("http"), f"Invalid picture: {pic}"
    
    def test_director_user_has_correct_data(self):
        """director_user row has id='director_user', name='William Reyes', role='director', picture='Echo_B'"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/profiles")
        assert r.status_code == 200
        rows = r.json().get("rows", [])
        director = next((x for x in rows if x.get("id") == "director_user"), None)
        assert director is not None, "director_user not found in profiles"
        assert director["name"] == "William Reyes"
        assert director["role"] == "director"
        assert director["picture"] == "Echo_B", f"Expected Echo_B, got {director['picture']}"
    
    def test_profiles_sorted_admin_director_first(self):
        """Admin at index 0, director at index 1"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/profiles")
        assert r.status_code == 200
        rows = r.json().get("rows", [])
        assert len(rows) >= 2
        assert rows[0]["role"] == "admin", f"Row 0 should be admin, got {rows[0]['role']}"
        assert rows[1]["role"] == "director", f"Row 1 should be director, got {rows[1]['role']}"


class TestSwitchProfile:
    """Tests for POST /api/auth/jwt/switch-profile"""
    
    def test_switch_to_director_user(self):
        """switch-profile with user_id='director_user' returns director role"""
        r = requests.post(
            f"{BASE_URL}/api/auth/jwt/switch-profile?devAuth=1",
            json={"user_id": "director_user"},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        assert user.get("role") == "director"
        assert user.get("name") == "William Reyes"
    
    def test_switch_to_executive_chef(self):
        """switch-profile with user_id='executive_chef_user' returns executive-chef role"""
        r = requests.post(
            f"{BASE_URL}/api/auth/jwt/switch-profile?devAuth=1",
            json={"user_id": "executive_chef_user"},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200
        data = r.json()
        user = data.get("user", {})
        assert user.get("role") == "executive-chef"
        assert user.get("name") == "Chef Gio"
    
    def test_switch_profile_fallback_lookup(self):
        """switch-profile works for users that only have user_id field (fallback lookup)"""
        # This tests the fallback in auth.py line 403-404
        r = requests.post(
            f"{BASE_URL}/api/auth/jwt/switch-profile?devAuth=1",
            json={"user_id": "sous_chef_user"},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200
        data = r.json()
        user = data.get("user", {})
        assert user.get("role") == "sous-chef"


class TestMeEndpoint:
    """Tests for GET /api/auth/jwt/me"""
    
    def test_me_with_director_header(self):
        """GET /me with X-Dev-User-Id: director_user returns director role"""
        r = requests.get(
            f"{BASE_URL}/api/auth/jwt/me?devAuth=1",
            headers={"X-Dev-User-Id": "director_user"}
        )
        assert r.status_code == 200
        data = r.json()
        user = data.get("user", {})
        assert user.get("role") == "director"
        assert user.get("name") == "William Reyes"
    
    def test_me_without_header_returns_admin(self):
        """GET /me without X-Dev-User-Id header returns admin (default)"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/me?devAuth=1")
        assert r.status_code == 200
        data = r.json()
        user = data.get("user", {})
        assert user.get("role") == "admin"
    
    def test_me_with_executive_chef_header(self):
        """GET /me with X-Dev-User-Id: executive_chef_user returns executive-chef"""
        r = requests.get(
            f"{BASE_URL}/api/auth/jwt/me?devAuth=1",
            headers={"X-Dev-User-Id": "executive_chef_user"}
        )
        assert r.status_code == 200
        data = r.json()
        user = data.get("user", {})
        assert user.get("role") == "executive-chef"


class TestAllProfiles:
    """Verify all expected profiles are present"""
    
    def test_all_expected_profiles_present(self):
        """Dropdown must include admin, director, gm, exec-chef, pastry-chef, fb-director, controller, sous-chef, and more"""
        r = requests.get(f"{BASE_URL}/api/auth/jwt/profiles")
        assert r.status_code == 200
        rows = r.json().get("rows", [])
        ids = {row["id"] for row in rows}
        
        expected = {
            "admin", "director_user", "general_manager_user", 
            "executive_chef_user", "pastry_chef_user", "fb_director_user",
            "controller_user", "sous_chef_user"
        }
        for exp_id in expected:
            assert exp_id in ids, f"Missing profile: {exp_id}"
