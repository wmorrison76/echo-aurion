"""
Iteration 18 Backend Tests
==========================
Tests for:
1. Maestro BQT Dashboard (events API)
2. Recipe Import API with AI fallback
3. Menu Engineering Matrix API
4. POS Connector API (full flow)
5. GL Sync API (full flow)
6. Health endpoint
"""
import pytest
import requests
import os
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestHealthEndpoint:
    """Health check endpoint tests"""

    def test_health_returns_ok(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert "engines" in data
        print(f"Health check passed: {data.get('platform')} v{data.get('version')}")


class TestMaestroBQTDashboard:
    """Tests for Maestro BQT Dashboard data endpoints"""

    def test_events_list(self):
        """GET /api/events returns events for dashboard"""
        response = requests.get(f"{BASE_URL}/api/events", timeout=10)
        assert response.status_code == 200
        data = response.json()
        # Should have events array
        assert "events" in data or isinstance(data, list)
        events = data.get("events", data) if isinstance(data, dict) else data
        print(f"Events count: {len(events)}")
        # Verify event structure if events exist
        if events:
            event = events[0]
            # Check for expected fields used in dashboard
            assert "name" in event or "id" in event
            print(f"Sample event: {event.get('name', event.get('id', 'unknown'))}")


class TestRecipeImportAPI:
    """Tests for Recipe Import from URL"""

    def test_recipe_import_valid_url(self):
        """POST /api/recipe/import with valid recipe URL returns structured data"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": "https://www.bbcgoodfood.com/recipes/easy-chocolate-cake"},
            timeout=30,
        )
        assert response.status_code == 200
        data = response.json()
        assert "recipe" in data
        assert "source" in data
        recipe = data["recipe"]
        # Should have basic recipe fields
        assert "name" in recipe or "title" in recipe
        assert "ingredients" in recipe
        assert "instructions" in recipe
        print(f"Recipe imported: {recipe.get('name', recipe.get('title', 'unknown'))}")
        print(f"Source: {data.get('source')}")
        print(f"Ingredients count: {len(recipe.get('ingredients', []))}")
        print(f"Instructions count: {len(recipe.get('instructions', []))}")

    def test_recipe_import_invalid_url(self):
        """POST /api/recipe/import with invalid URL returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={"url": "not-a-valid-url"},
            timeout=10,
        )
        assert response.status_code == 400

    def test_recipe_import_missing_url(self):
        """POST /api/recipe/import without URL returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/recipe/import",
            json={},
            timeout=10,
        )
        assert response.status_code == 422


class TestMenuEngineeringAPI:
    """Tests for Menu Engineering Matrix"""

    def test_menu_matrix_returns_items(self):
        """GET /api/menu-engineering/matrix returns items with classifications"""
        response = requests.get(f"{BASE_URL}/api/menu-engineering/matrix", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "summary" in data
        items = data["items"]
        summary = data["summary"]
        print(f"Total items: {summary.get('total_items', len(items))}")
        print(f"Stars: {summary.get('stars', 0)}, Plowhorses: {summary.get('plowhorses', 0)}")
        print(f"Puzzles: {summary.get('puzzles', 0)}, Dogs: {summary.get('dogs', 0)}")
        # Verify item structure
        if items:
            item = items[0]
            assert "classification" in item
            assert item["classification"] in ["star", "plowhorse", "puzzle", "dog"]
            assert "name" in item
            assert "margin" in item
            assert "orders" in item

    def test_menu_overview(self):
        """GET /api/menu-engineering/overview returns quick counts"""
        response = requests.get(f"{BASE_URL}/api/menu-engineering/overview", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "total_items" in data
        assert "stars" in data
        assert "plowhorses" in data
        assert "puzzles" in data
        assert "dogs" in data


class TestPOSConnectorAPI:
    """Tests for POS Connector - full flow"""

    def test_pos_systems_list(self):
        """GET /api/pos-connector/systems returns supported POS systems"""
        response = requests.get(f"{BASE_URL}/api/pos-connector/systems", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "systems" in data
        systems = data["systems"]
        # Should have 5 POS systems
        assert len(systems) >= 5
        assert "toast" in systems
        assert "aloha" in systems
        assert "micros" in systems
        assert "square" in systems
        assert "clover" in systems
        print(f"POS systems: {list(systems.keys())}")

    def test_pos_connections_list(self):
        """GET /api/pos-connector/connections returns connections"""
        response = requests.get(f"{BASE_URL}/api/pos-connector/connections", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "connections" in data
        print(f"Existing POS connections: {data.get('count', len(data['connections']))}")

    def test_pos_full_flow_create_test_sync(self):
        """Full POS flow: create connection, test, sync"""
        # 1. Create connection
        create_response = requests.post(
            f"{BASE_URL}/api/pos-connector/connections",
            json={
                "pos_system": "toast",
                "display_name": f"TEST_Toast_Iter18_{uuid4().hex[:6]}",
                "location_id": "test-loc-123",
                "sync_interval_minutes": 30,
                "enabled": True,
            },
            timeout=10,
        )
        assert create_response.status_code == 200
        conn_data = create_response.json()
        assert "connection" in conn_data
        conn_id = conn_data["connection"]["id"]
        assert conn_data["connection"]["status"] == "pending_verification"
        print(f"Created POS connection: {conn_id}")

        # 2. Test connection
        test_response = requests.post(
            f"{BASE_URL}/api/pos-connector/connections/{conn_id}/test",
            timeout=10,
        )
        assert test_response.status_code == 200
        test_data = test_response.json()
        assert test_data.get("status") == "connected"
        print(f"Connection test passed: latency {test_data.get('latency_ms')}ms")

        # 3. Sync data
        sync_response = requests.post(
            f"{BASE_URL}/api/pos-connector/sync",
            json={"connection_id": conn_id, "sync_type": "full"},
            timeout=10,
        )
        assert sync_response.status_code == 200
        sync_data = sync_response.json()
        assert "sync" in sync_data
        assert sync_data["sync"]["status"] == "completed"
        print(f"Sync completed: {sync_data['sync'].get('records_synced', 0)} records")

    def test_pos_dashboard(self):
        """GET /api/pos-connector/dashboard returns stats"""
        response = requests.get(f"{BASE_URL}/api/pos-connector/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "total_connections" in data
        assert "active" in data
        print(f"POS Dashboard: {data.get('total_connections')} connections, {data.get('active')} active")

    def test_pos_sync_404_nonexistent(self):
        """POST /api/pos-connector/sync with nonexistent connection returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/pos-connector/sync",
            json={"connection_id": "nonexistent-id", "sync_type": "full"},
            timeout=10,
        )
        assert response.status_code == 404


class TestGLSyncAPI:
    """Tests for GL Sync - full flow"""

    def test_gl_platforms_list(self):
        """GET /api/gl-sync/platforms returns supported platforms"""
        response = requests.get(f"{BASE_URL}/api/gl-sync/platforms", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "platforms" in data
        platforms = data["platforms"]
        assert "quickbooks" in platforms
        assert "sage" in platforms
        assert "xero" in platforms
        print(f"GL platforms: {list(platforms.keys())}")

    def test_gl_connections_list(self):
        """GET /api/gl-sync/connections returns connections"""
        response = requests.get(f"{BASE_URL}/api/gl-sync/connections", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "connections" in data
        print(f"Existing GL connections: {data.get('count', len(data['connections']))}")

    def test_gl_full_flow_create_activate_map_sync(self):
        """Full GL flow: create connection, activate, add mapping, sync journals"""
        # 1. Create connection
        create_response = requests.post(
            f"{BASE_URL}/api/gl-sync/connections",
            json={
                "platform": "quickbooks",
                "company_name": f"TEST_Company_Iter18_{uuid4().hex[:6]}",
                "auto_sync": True,
                "sync_frequency": "daily",
            },
            timeout=10,
        )
        assert create_response.status_code == 200
        conn_data = create_response.json()
        assert "connection" in conn_data
        conn_id = conn_data["connection"]["id"]
        assert conn_data["connection"]["status"] == "pending_auth"
        print(f"Created GL connection: {conn_id}")

        # 2. Activate connection
        activate_response = requests.post(
            f"{BASE_URL}/api/gl-sync/connections/{conn_id}/activate",
            timeout=10,
        )
        assert activate_response.status_code == 200
        activate_data = activate_response.json()
        assert activate_data.get("status") == "active"
        print(f"Connection activated at: {activate_data.get('activated_at')}")

        # 3. Add account mapping
        mapping_response = requests.post(
            f"{BASE_URL}/api/gl-sync/connections/{conn_id}/mappings",
            json={
                "luccca_code": "5000",
                "luccca_name": "Food Cost",
                "external_code": "50000",
                "external_name": "Cost of Goods Sold - Food",
                "sync_direction": "push",
            },
            timeout=10,
        )
        assert mapping_response.status_code == 200
        mapping_data = mapping_response.json()
        assert "mapping" in mapping_data
        print(f"Added mapping: {mapping_data['mapping'].get('luccca_code')} -> {mapping_data['mapping'].get('external_code')}")

        # 4. Sync journals
        sync_response = requests.post(
            f"{BASE_URL}/api/gl-sync/sync/journals",
            json={"connection_id": conn_id},
            timeout=10,
        )
        assert sync_response.status_code == 200
        sync_data = sync_response.json()
        assert "sync" in sync_data
        assert sync_data["sync"]["status"] == "completed"
        print(f"Journal sync: {sync_data['sync'].get('entries_synced', 0)} entries")

    def test_gl_dashboard(self):
        """GET /api/gl-sync/dashboard returns stats"""
        response = requests.get(f"{BASE_URL}/api/gl-sync/dashboard", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert "total_connections" in data
        assert "gl_codes_count" in data
        assert "journal_entries_count" in data
        print(f"GL Dashboard: {data.get('total_connections')} connections, {data.get('gl_codes_count')} GL codes")

    def test_gl_sync_inactive_400(self):
        """POST /api/gl-sync/sync/journals with inactive connection returns 400"""
        # First create an inactive connection
        create_response = requests.post(
            f"{BASE_URL}/api/gl-sync/connections",
            json={
                "platform": "sage",
                "company_name": f"TEST_Inactive_Iter18_{uuid4().hex[:6]}",
                "auto_sync": False,
            },
            timeout=10,
        )
        assert create_response.status_code == 200
        conn_id = create_response.json()["connection"]["id"]

        # Try to sync without activating
        sync_response = requests.post(
            f"{BASE_URL}/api/gl-sync/sync/journals",
            json={"connection_id": conn_id},
            timeout=10,
        )
        assert sync_response.status_code == 400

    def test_gl_activate_404_nonexistent(self):
        """POST /api/gl-sync/connections/{id}/activate with nonexistent returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/gl-sync/connections/nonexistent-id/activate",
            timeout=10,
        )
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
