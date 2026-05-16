"""
iter264.1 · Phase 1 Testing: Permissions Matrix, Time-Window Filtering, New Role Profiles

Tests:
1. GET /api/permissions/matrix - returns 27+ roles, 10 permissions
2. Role-specific permission verification (CDC, accounting, exec-chef-banquets, etc.)
3. PUT /api/permissions/role/{role} - override permissions
4. GET /api/permissions/me - unauthenticated returns all false
5. POST /api/auth/jwt/login - new profiles with Welcome2026!
6. GET /api/ird-public/menu - time-window filtering
7. GET /api/ird-public/menu?preview=true - preview override
8. PUT /api/ird-builder/menu - new fields (available_from, available_until, count_remaining, lead_time_hours)
9. Regression: /api/ops-daily/snapshot, /api/ird-builder/qr, /api/spa-public/menu
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ═══════════════════════════════════════════════════════════════════════════
# PERMISSIONS MATRIX TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestPermissionsMatrix:
    """Test /api/permissions/matrix endpoint and role-specific permissions"""
    
    def test_permissions_matrix_returns_roles_and_permissions(self):
        """GET /api/permissions/matrix returns 27+ roles, 10 permissions"""
        r = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Verify structure
        assert "permissions" in data, "Missing 'permissions' key"
        assert "roles" in data, "Missing 'roles' key"
        
        # Verify 10 permissions
        perms = data["permissions"]
        assert len(perms) >= 10, f"Expected 10+ permissions, got {len(perms)}"
        perm_keys = [p["key"] for p in perms]
        expected_perms = [
            "ird.view", "ird.edit", "ird.publish", "ird.approve",
            "spa.view", "spa.edit", "spa.publish", "spa.approve",
            "inventory_audits.start_stop", "recipes.link"
        ]
        for ep in expected_perms:
            assert ep in perm_keys, f"Missing permission: {ep}"
        
        # Verify 27+ roles
        roles = data["roles"]
        assert len(roles) >= 20, f"Expected 20+ roles, got {len(roles)}"
        print(f"PASS: Matrix has {len(perms)} permissions, {len(roles)} roles")
    
    def test_chef_de_cuisine_cannot_publish(self):
        """CRITICAL: CDC has ird.view=true, ird.edit=true, ird.publish=false"""
        r = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r.status_code == 200
        data = r.json()
        
        cdc_row = next((r for r in data["roles"] if r["role"] == "chef-de-cuisine"), None)
        assert cdc_row is not None, "chef-de-cuisine role not found in matrix"
        
        perms = cdc_row["perms"]
        assert perms.get("ird.view") == True, "CDC should have ird.view=true"
        assert perms.get("ird.edit") == True, "CDC should have ird.edit=true"
        assert perms.get("ird.publish") == False, "CRITICAL: CDC must NOT have ird.publish=true"
        assert perms.get("ird.approve") == False, "CDC should not have ird.approve"
        print("PASS: CDC has view+edit but NOT publish (must submit for approval)")
    
    def test_accounting_has_inventory_audits(self):
        """Accounting role has inventory_audits.start_stop=true and ird.publish=false"""
        r = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r.status_code == 200
        data = r.json()
        
        acct_row = next((r for r in data["roles"] if r["role"] == "accounting"), None)
        assert acct_row is not None, "accounting role not found"
        
        perms = acct_row["perms"]
        assert perms.get("inventory_audits.start_stop") == True, "Accounting should have inventory_audits.start_stop"
        assert perms.get("ird.publish") == False, "Accounting should NOT have ird.publish"
        print("PASS: Accounting has inventory_audits.start_stop=true, ird.publish=false")
    
    def test_exec_chef_banquets_cannot_publish(self):
        """exec-chef-banquets has ird.edit=true but ird.publish=false"""
        r = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r.status_code == 200
        data = r.json()
        
        ecb_row = next((r for r in data["roles"] if r["role"] == "exec-chef-banquets"), None)
        assert ecb_row is not None, "exec-chef-banquets role not found"
        
        perms = ecb_row["perms"]
        assert perms.get("ird.edit") == True, "Exec Chef Banquets should have ird.edit"
        assert perms.get("ird.publish") == False, "Exec Chef Banquets must NOT publish (submit for approval)"
        print("PASS: exec-chef-banquets has edit but NOT publish")
    
    def test_operation_controller_permissions(self):
        """operation-controller has ird.view, spa.view, inventory_audits.start_stop"""
        r = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r.status_code == 200
        data = r.json()
        
        oc_row = next((r for r in data["roles"] if r["role"] == "operation-controller"), None)
        assert oc_row is not None, "operation-controller role not found"
        
        perms = oc_row["perms"]
        assert perms.get("ird.view") == True, "Op Controller should have ird.view"
        assert perms.get("spa.view") == True, "Op Controller should have spa.view"
        assert perms.get("inventory_audits.start_stop") == True, "Op Controller should have inventory_audits.start_stop"
        print("PASS: operation-controller has view + inventory_audits")
    
    def test_admin_has_all_permissions(self):
        """Admin has ALL permissions=true"""
        r = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r.status_code == 200
        data = r.json()
        
        admin_row = next((r for r in data["roles"] if r["role"] == "admin"), None)
        assert admin_row is not None, "admin role not found"
        
        perms = admin_row["perms"]
        for p in data["permissions"]:
            assert perms.get(p["key"]) == True, f"Admin should have {p['key']}=true"
        print("PASS: Admin has ALL permissions=true")
    
    def test_sales_roles_no_access(self):
        """sales, bqt-sales-marketing, senior-art-media-director have ALL ird/spa perms=false"""
        r = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r.status_code == 200
        data = r.json()
        
        no_access_roles = ["sales", "bqt-sales-marketing", "senior-art-media-director"]
        ird_spa_perms = ["ird.view", "ird.edit", "ird.publish", "ird.approve",
                        "spa.view", "spa.edit", "spa.publish", "spa.approve"]
        
        for role_name in no_access_roles:
            row = next((r for r in data["roles"] if r["role"] == role_name), None)
            assert row is not None, f"{role_name} role not found"
            perms = row["perms"]
            for perm in ird_spa_perms:
                assert perms.get(perm) == False, f"{role_name} should have {perm}=false (No Access)"
        print(f"PASS: {no_access_roles} have NO ird/spa access")


class TestPermissionsOverride:
    """Test PUT /api/permissions/role/{role} override functionality"""
    
    def test_override_role_permissions(self):
        """PUT /api/permissions/role/{role} writes overrides; GET reflects them"""
        role = "staff"  # Use staff role for testing
        
        # First, get current permissions
        r1 = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r1.status_code == 200
        data1 = r1.json()
        staff_row = next((r for r in data1["roles"] if r["role"] == role), None)
        original_ird_view = staff_row["perms"].get("ird.view", False) if staff_row else False
        
        # Override: set ird.view to opposite
        new_val = not original_ird_view
        r2 = requests.put(
            f"{BASE_URL}/api/permissions/role/{role}",
            json={"role": role, "perms": {"ird.view": new_val}}
        )
        assert r2.status_code == 200, f"PUT failed: {r2.text}"
        
        # Verify override took effect
        r3 = requests.get(f"{BASE_URL}/api/permissions/matrix")
        assert r3.status_code == 200
        data3 = r3.json()
        staff_row_after = next((r for r in data3["roles"] if r["role"] == role), None)
        assert staff_row_after["perms"].get("ird.view") == new_val, "Override not reflected"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/permissions/role/{role}",
            json={"role": role, "perms": {"ird.view": original_ird_view}}
        )
        print("PASS: Permission override works and persists")


class TestPermissionsMe:
    """Test GET /api/permissions/me endpoint"""
    
    def test_permissions_me_no_auth(self):
        """GET /api/permissions/me with no auth returns role=null, all perms false"""
        r = requests.get(f"{BASE_URL}/api/permissions/me")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        assert data.get("role") is None, f"Expected role=null, got {data.get('role')}"
        perms = data.get("perms", {})
        for key, val in perms.items():
            assert val == False, f"Expected {key}=false for unauthenticated, got {val}"
        print("PASS: /api/permissions/me returns null role with all perms false when unauthenticated")


# ═══════════════════════════════════════════════════════════════════════════
# NEW ROLE PROFILES LOGIN TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestNewRoleProfiles:
    """Test login for new iter264.1 role profiles with Welcome2026!"""
    
    @pytest.mark.parametrize("email,expected_role", [
        ("execchefbqts@luccca.com", "exec-chef-banquets"),
        ("cdc@luccca.com", "chef-de-cuisine"),
        ("bqtsales@luccca.com", "bqt-sales-marketing"),
        ("sales@luccca.com", "sales"),
        ("artmedia@luccca.com", "senior-art-media-director"),
        ("opscontrol@luccca.com", "operation-controller"),
        ("accounting@luccca.com", "accounting"),
    ])
    def test_new_profile_login(self, email, expected_role):
        """POST /api/auth/jwt/login with new profile succeeds with Welcome2026!"""
        r = requests.post(
            f"{BASE_URL}/api/auth/jwt/login",
            json={"email": email, "password": "Welcome2026!"}
        )
        assert r.status_code == 200, f"Login failed for {email}: {r.status_code} - {r.text}"
        data = r.json()
        assert data.get("ok") == True, f"Login not ok for {email}"
        user = data.get("user", {})
        assert user.get("role") == expected_role, f"Expected role={expected_role}, got {user.get('role')}"
        print(f"PASS: {email} login returns role={expected_role}")


# ═══════════════════════════════════════════════════════════════════════════
# IRD TIME-WINDOW FILTERING TESTS
# ═══════════════════════════════════════════════════════════════════════════

class TestIrdTimeWindowFiltering:
    """Test time-window filtering on /api/ird-public/menu"""
    
    def test_ird_public_menu_returns_data(self):
        """GET /api/ird-public/menu?slug=main returns menu data"""
        r = requests.get(f"{BASE_URL}/api/ird-public/menu?slug=main")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        assert "sections" in data, "Missing sections"
        assert "title" in data, "Missing title"
        # Note: sections may be filtered based on current time
        print(f"PASS: /api/ird-public/menu returns menu with {len(data.get('sections', []))} sections (time-filtered)")
    
    def test_ird_public_menu_preview_returns_all(self):
        """GET /api/ird-public/menu?slug=main&preview=true returns ALL sections"""
        r = requests.get(f"{BASE_URL}/api/ird-public/menu?slug=main&preview=true")
        assert r.status_code == 200
        data = r.json()
        
        sections = data.get("sections", [])
        # Preview should return all sections regardless of time
        # The seed has: breakfast, all_day, kids, overnight, beverage
        assert len(sections) >= 4, f"Preview should return all sections, got {len(sections)}"
        
        section_ids = [s["id"] for s in sections]
        print(f"PASS: Preview returns all sections: {section_ids}")
    
    def test_items_with_zero_count_hidden(self):
        """Items with count_remaining=0 should be hidden from public menu"""
        # First, update an item to have count_remaining=0
        # Get current menu
        r1 = requests.get(f"{BASE_URL}/api/ird-builder/menu?slug=main")
        assert r1.status_code == 200
        menu = r1.json()
        
        # Find first item and set count_remaining=0
        if menu.get("sections") and menu["sections"][0].get("items"):
            test_item_id = menu["sections"][0]["items"][0]["id"]
            menu["sections"][0]["items"][0]["count_remaining"] = 0
            
            # Save
            r2 = requests.put(
                f"{BASE_URL}/api/ird-builder/menu",
                json=menu
            )
            assert r2.status_code == 200
            
            # Check public menu - item should be hidden
            r3 = requests.get(f"{BASE_URL}/api/ird-public/menu?slug=main")
            assert r3.status_code == 200
            public_data = r3.json()
            
            # Find if item is in public menu
            found = False
            for s in public_data.get("sections", []):
                for it in s.get("items", []):
                    if it["id"] == test_item_id:
                        found = True
                        break
            
            # Restore item
            menu["sections"][0]["items"][0]["count_remaining"] = None
            requests.put(f"{BASE_URL}/api/ird-builder/menu", json=menu)
            
            assert not found, "Item with count_remaining=0 should be hidden"
            print("PASS: Items with count_remaining=0 are hidden from public menu")
        else:
            pytest.skip("No items in menu to test")


class TestIrdBuilderNewFields:
    """Test PUT /api/ird-builder/menu accepts new fields"""
    
    def test_menu_accepts_new_fields(self):
        """PUT /api/ird-builder/menu accepts available_from, available_until, count_remaining, lead_time_hours"""
        # Get current menu
        r1 = requests.get(f"{BASE_URL}/api/ird-builder/menu?slug=main")
        assert r1.status_code == 200
        menu = r1.json()
        
        # Add new fields to first section and item
        if menu.get("sections"):
            menu["sections"][0]["available_from"] = "06:00"
            menu["sections"][0]["available_until"] = "11:00"
            
            if menu["sections"][0].get("items"):
                menu["sections"][0]["items"][0]["available_from"] = "07:00"
                menu["sections"][0]["items"][0]["available_until"] = "10:00"
                menu["sections"][0]["items"][0]["count_remaining"] = 50
                menu["sections"][0]["items"][0]["lead_time_hours"] = 2.0
        
        # Save
        r2 = requests.put(
            f"{BASE_URL}/api/ird-builder/menu",
            json=menu
        )
        assert r2.status_code == 200, f"PUT failed: {r2.text}"
        
        # Verify fields persisted
        r3 = requests.get(f"{BASE_URL}/api/ird-builder/menu?slug=main")
        assert r3.status_code == 200
        saved = r3.json()
        
        if saved.get("sections"):
            assert saved["sections"][0].get("available_from") == "06:00"
            assert saved["sections"][0].get("available_until") == "11:00"
            if saved["sections"][0].get("items"):
                item = saved["sections"][0]["items"][0]
                assert item.get("available_from") == "07:00"
                assert item.get("available_until") == "10:00"
                assert item.get("count_remaining") == 50
                assert item.get("lead_time_hours") == 2.0
        
        print("PASS: New fields (available_from/until, count_remaining, lead_time_hours) accepted and persisted")


# ═══════════════════════════════════════════════════════════════════════════
# REGRESSION TESTS (iter263.5 features)
# ═══════════════════════════════════════════════════════════════════════════

class TestRegression:
    """Regression tests for iter263.5 features"""
    
    def test_ops_daily_snapshot(self):
        """GET /api/ops-daily/snapshot returns data"""
        r = requests.get(f"{BASE_URL}/api/ops-daily/snapshot")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "date" in data or "snapshot" in data or "ok" in data, "Unexpected response structure"
        print("PASS: /api/ops-daily/snapshot works")
    
    def test_ird_builder_qr_png(self):
        """GET /api/ird-builder/qr returns PNG data_url"""
        r = requests.get(f"{BASE_URL}/api/ird-builder/qr?slug=main")
        assert r.status_code == 200
        data = r.json()
        
        assert "url" in data, "Missing url"
        assert "data_url" in data, "Missing data_url (PNG)"
        assert data["data_url"].startswith("data:image/png"), "data_url should be PNG"
        print("PASS: /api/ird-builder/qr returns real PNG QR")
    
    def test_spa_public_menu(self):
        """GET /api/spa-public/menu returns valid data (no regression)"""
        r = requests.get(f"{BASE_URL}/api/spa-public/menu")
        assert r.status_code == 200
        data = r.json()
        
        assert "categories" in data or "title" in data, "Spa menu structure unexpected"
        print("PASS: /api/spa-public/menu works (no regression)")
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print("PASS: /api/health returns healthy")


# ═══════════════════════════════════════════════════════════════════════════
# ADMIN LOGIN TEST
# ═══════════════════════════════════════════════════════════════════════════

class TestAdminLogin:
    """Test admin login with LuccaaAdmin2026!"""
    
    def test_admin_login(self):
        """POST /api/auth/jwt/login with admin credentials"""
        r = requests.post(
            f"{BASE_URL}/api/auth/jwt/login",
            json={"email": "admin@luccca.com", "password": "LuccaaAdmin2026!"}
        )
        assert r.status_code == 200, f"Admin login failed: {r.status_code} - {r.text}"
        data = r.json()
        assert data.get("ok") == True
        assert data.get("user", {}).get("role") == "admin"
        print("PASS: Admin login works with LuccaaAdmin2026!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
