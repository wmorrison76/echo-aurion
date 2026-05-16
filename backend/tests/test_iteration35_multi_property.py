"""
Iteration 35 - Multi-Property Outlet Management Tests
Tests for:
- GET/PUT /api/admin/settings (multi_property_enabled toggle)
- CRUD /api/admin/properties (create, list, update, delete)
- GET /api/admin/properties/{id}/summary
- GET /api/admin/cross-property-dashboard
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAdminSettings:
    """Tests for /api/admin/settings endpoint"""
    
    def test_get_settings_returns_multi_property_fields(self, api_client):
        """GET /api/admin/settings returns multi_property_enabled and default_property_id"""
        response = api_client.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "multi_property_enabled" in data, "Response missing multi_property_enabled field"
        assert "default_property_id" in data, "Response missing default_property_id field"
        assert isinstance(data["multi_property_enabled"], bool), "multi_property_enabled should be boolean"
        print(f"Settings: multi_property_enabled={data['multi_property_enabled']}, default_property_id={data['default_property_id']}")
    
    def test_update_settings_toggle_multi_property(self, api_client):
        """PUT /api/admin/settings updates multi_property_enabled toggle"""
        # Get current state
        get_response = api_client.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_state = get_response.json().get("multi_property_enabled", False)
        
        # Toggle to opposite state
        new_state = not current_state
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/settings",
            json={"multi_property_enabled": new_state}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_data = update_response.json()
        assert updated_data["multi_property_enabled"] == new_state, f"Expected {new_state}, got {updated_data['multi_property_enabled']}"
        
        # Verify persistence with GET
        verify_response = api_client.get(f"{BASE_URL}/api/admin/settings")
        assert verify_response.status_code == 200
        assert verify_response.json()["multi_property_enabled"] == new_state
        
        # Restore original state
        api_client.put(f"{BASE_URL}/api/admin/settings", json={"multi_property_enabled": current_state})
        print(f"Toggle test passed: {current_state} -> {new_state} -> {current_state}")


def get_property_id(prop):
    """Helper to get property ID from either 'property_id' or 'id' field"""
    return prop.get("property_id") or prop.get("id")


class TestPropertiesCRUD:
    """Tests for /api/admin/properties CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def ensure_multi_property_enabled(self, api_client):
        """Ensure multi-property mode is enabled for property tests"""
        api_client.put(f"{BASE_URL}/api/admin/settings", json={"multi_property_enabled": True})
        yield
    
    def test_list_properties_returns_enriched_data(self, api_client):
        """GET /api/admin/properties lists properties with outlet_names and outlet_count"""
        response = api_client.get(f"{BASE_URL}/api/admin/properties")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "properties" in data, "Response missing properties array"
        assert "total" in data, "Response missing total count"
        assert isinstance(data["properties"], list), "properties should be a list"
        
        # If there are properties, verify enrichment
        if data["properties"]:
            prop = data["properties"][0]
            assert "outlet_names" in prop, "Property missing outlet_names enrichment"
            assert "outlet_count" in prop, "Property missing outlet_count enrichment"
            print(f"Found {data['total']} properties, first: {prop.get('name', 'N/A')}")
        else:
            print("No properties found (empty list)")
    
    def test_create_property_with_outlets(self, api_client):
        """POST /api/admin/properties creates a new property with name, code, address, outlet_ids"""
        # First get available outlets
        outlets_response = api_client.get(f"{BASE_URL}/api/admin/outlets")
        assert outlets_response.status_code == 200
        outlets = outlets_response.json().get("outlets", [])
        outlet_ids = [o["outlet_id"] for o in outlets[:2]] if outlets else []
        
        # Create property
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "name": f"TEST_Property_{unique_id}",
            "code": f"TP{unique_id[:3].upper()}",
            "address": "123 Test Street, Test City",
            "outlet_ids": outlet_ids
        }
        
        response = api_client.post(f"{BASE_URL}/api/admin/properties", json=create_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert "property_id" in created, "Created property missing property_id"
        assert created["name"] == create_payload["name"], f"Name mismatch: {created['name']}"
        assert created["code"] == create_payload["code"], f"Code mismatch: {created['code']}"
        assert created["address"] == create_payload["address"], f"Address mismatch"
        assert created["outlet_ids"] == outlet_ids, f"Outlet IDs mismatch"
        assert created["active"] == True, "New property should be active"
        
        # Verify persistence with GET
        list_response = api_client.get(f"{BASE_URL}/api/admin/properties")
        assert list_response.status_code == 200
        props = list_response.json()["properties"]
        found = next((p for p in props if get_property_id(p) == created["property_id"]), None)
        assert found is not None, "Created property not found in list"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/properties/{created['property_id']}")
        print(f"Created and verified property: {created['property_id']}")
    
    def test_update_property_fields(self, api_client):
        """PUT /api/admin/properties/{id} updates property fields"""
        # Create a test property first
        unique_id = str(uuid.uuid4())[:8]
        create_response = api_client.post(f"{BASE_URL}/api/admin/properties", json={
            "name": f"TEST_Update_{unique_id}",
            "code": "UPD",
            "address": "Original Address"
        })
        assert create_response.status_code == 200
        property_id = create_response.json()["property_id"]
        
        # Update the property
        update_payload = {
            "name": f"TEST_Updated_{unique_id}",
            "address": "Updated Address 456",
            "active": False
        }
        update_response = api_client.put(f"{BASE_URL}/api/admin/properties/{property_id}", json=update_payload)
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        assert updated["name"] == update_payload["name"], f"Name not updated"
        assert updated["address"] == update_payload["address"], f"Address not updated"
        assert updated["active"] == False, f"Active status not updated"
        
        # Verify persistence
        list_response = api_client.get(f"{BASE_URL}/api/admin/properties")
        props = list_response.json()["properties"]
        found = next((p for p in props if get_property_id(p) == property_id), None)
        assert found is not None
        assert found["name"] == update_payload["name"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/properties/{property_id}")
        print(f"Updated and verified property: {property_id}")
    
    def test_delete_property(self, api_client):
        """DELETE /api/admin/properties/{id} removes property"""
        # Create a test property
        unique_id = str(uuid.uuid4())[:8]
        create_response = api_client.post(f"{BASE_URL}/api/admin/properties", json={
            "name": f"TEST_Delete_{unique_id}",
            "code": "DEL"
        })
        assert create_response.status_code == 200
        property_id = create_response.json()["property_id"]
        
        # Delete the property
        delete_response = api_client.delete(f"{BASE_URL}/api/admin/properties/{property_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        deleted = delete_response.json()
        assert deleted["deleted"] == property_id, f"Delete response mismatch"
        
        # Verify removal
        list_response = api_client.get(f"{BASE_URL}/api/admin/properties")
        props = list_response.json()["properties"]
        found = next((p for p in props if get_property_id(p) == property_id), None)
        assert found is None, "Deleted property still exists in list"
        print(f"Deleted and verified removal: {property_id}")
    
    def test_delete_nonexistent_property_returns_404(self, api_client):
        """DELETE /api/admin/properties/{id} returns 404 for non-existent property"""
        response = api_client.delete(f"{BASE_URL}/api/admin/properties/nonexistent-prop-id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestPropertySummary:
    """Tests for /api/admin/properties/{id}/summary endpoint"""
    
    def test_property_summary_returns_complete_data(self, api_client):
        """GET /api/admin/properties/{id}/summary returns property summary with outlets, capacity, staff"""
        # Ensure multi-property is enabled
        api_client.put(f"{BASE_URL}/api/admin/settings", json={"multi_property_enabled": True})
        
        # Get existing properties
        props_response = api_client.get(f"{BASE_URL}/api/admin/properties")
        assert props_response.status_code == 200
        properties = props_response.json().get("properties", [])
        
        # Find a property with property_id (new format) or create one
        property_id = None
        for p in properties:
            if "property_id" in p:
                property_id = p["property_id"]
                break
        
        if not property_id:
            # Create a test property with outlets
            outlets_response = api_client.get(f"{BASE_URL}/api/admin/outlets")
            outlet_ids = [o["outlet_id"] for o in outlets_response.json().get("outlets", [])[:2]]
            
            create_response = api_client.post(f"{BASE_URL}/api/admin/properties", json={
                "name": "TEST_Summary_Property",
                "code": "TSP",
                "outlet_ids": outlet_ids
            })
            property_id = create_response.json()["property_id"]
        
        # Get summary
        response = api_client.get(f"{BASE_URL}/api/admin/properties/{property_id}/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "property" in data, "Summary missing property object"
        assert "outlets" in data, "Summary missing outlets array"
        assert "total_capacity" in data, "Summary missing total_capacity"
        assert "active_outlets" in data, "Summary missing active_outlets"
        assert "total_outlets" in data, "Summary missing total_outlets"
        assert "staff_count" in data, "Summary missing staff_count"
        assert "users" in data, "Summary missing users array"
        
        print(f"Property summary: {data['property'].get('name', 'N/A')}, {data['total_outlets']} outlets, {data['staff_count']} staff")
    
    def test_property_summary_nonexistent_returns_404(self, api_client):
        """GET /api/admin/properties/{id}/summary returns 404 for non-existent property"""
        response = api_client.get(f"{BASE_URL}/api/admin/properties/nonexistent-prop-id/summary")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestCrossPropertyDashboard:
    """Tests for /api/admin/cross-property-dashboard endpoint"""
    
    def test_dashboard_disabled_when_multi_property_off(self, api_client):
        """GET /api/admin/cross-property-dashboard returns enabled=False when multi-property disabled"""
        # Disable multi-property
        api_client.put(f"{BASE_URL}/api/admin/settings", json={"multi_property_enabled": False})
        
        response = api_client.get(f"{BASE_URL}/api/admin/cross-property-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("enabled") == False, f"Expected enabled=False, got {data.get('enabled')}"
        assert "message" in data, "Response should include message when disabled"
        print(f"Dashboard disabled message: {data.get('message', 'N/A')}")
    
    def test_dashboard_enabled_returns_comparison_data(self, api_client):
        """GET /api/admin/cross-property-dashboard returns comparison data when enabled"""
        # Enable multi-property
        api_client.put(f"{BASE_URL}/api/admin/settings", json={"multi_property_enabled": True})
        
        response = api_client.get(f"{BASE_URL}/api/admin/cross-property-dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("enabled") == True, f"Expected enabled=True, got {data.get('enabled')}"
        assert "total_properties" in data, "Response missing total_properties"
        assert "total_outlets" in data, "Response missing total_outlets"
        assert "total_staff" in data, "Response missing total_staff"
        assert "properties" in data, "Response missing properties comparison array"
        
        # Verify property comparison structure
        if data["properties"]:
            prop = data["properties"][0]
            assert "property_id" in prop, "Property comparison missing property_id"
            assert "name" in prop, "Property comparison missing name"
            assert "outlet_count" in prop, "Property comparison missing outlet_count"
            assert "active_outlets" in prop, "Property comparison missing active_outlets"
            assert "total_capacity" in prop, "Property comparison missing total_capacity"
            assert "staff_count" in prop, "Property comparison missing staff_count"
        
        print(f"Dashboard: {data['total_properties']} properties, {data['total_outlets']} outlets, {data['total_staff']} staff")


class TestOutletsEndpoint:
    """Verify outlets endpoint still works (regression test)"""
    
    def test_list_outlets(self, api_client):
        """GET /api/admin/outlets returns outlets list"""
        response = api_client.get(f"{BASE_URL}/api/admin/outlets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "outlets" in data, "Response missing outlets array"
        assert "total" in data, "Response missing total count"
        print(f"Found {data['total']} outlets")


class TestUsersEndpoint:
    """Verify users endpoint still works (regression test)"""
    
    def test_list_users(self, api_client):
        """GET /api/admin/users returns users list"""
        response = api_client.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response missing users array"
        assert "total" in data, "Response missing total count"
        print(f"Found {data['total']} users")


class TestGLCodesEndpoint:
    """Verify GL codes endpoint still works (regression test)"""
    
    def test_list_gl_codes(self, api_client):
        """GET /api/admin/gl-codes returns GL codes list"""
        response = api_client.get(f"{BASE_URL}/api/admin/gl-codes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "gl_codes" in data, "Response missing gl_codes array"
        assert "total" in data, "Response missing total count"
        print(f"Found {data['total']} GL codes")


class TestModulesEndpoint:
    """Verify modules endpoint still works (regression test)"""
    
    def test_list_modules(self, api_client):
        """GET /api/admin/modules returns available modules"""
        response = api_client.get(f"{BASE_URL}/api/admin/modules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "modules" in data, "Response missing modules array"
        assert len(data["modules"]) > 0, "Modules list should not be empty"
        print(f"Found {len(data['modules'])} available modules")
