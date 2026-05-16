"""
Iteration 17 - Menu Engineering Matrix, POS Connector, GL Sync Tests
=====================================================================
Tests for:
1. Menu Engineering Matrix API - classifications (star/plowhorse/puzzle/dog)
2. POS Connector - systems, connections, test, sync
3. GL Sync - platforms, connections, activate, mappings, journal sync
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")


class TestHealthEndpoint:
    """Basic health check to verify backend is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["platform"] == "LUCCCA Enterprise"
        assert data["version"] == "3.1"
        print(f"✓ Health check passed - version {data['version']}")


class TestMenuEngineeringMatrix:
    """Menu Engineering Matrix API tests - item classification"""
    
    def test_get_matrix(self):
        """GET /api/menu-engineering/matrix returns items with classifications"""
        response = requests.get(f"{BASE_URL}/api/menu-engineering/matrix")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "items" in data
        assert "summary" in data
        
        items = data["items"]
        summary = data["summary"]
        
        # Verify items have required fields
        if len(items) > 0:
            item = items[0]
            assert "id" in item
            assert "name" in item
            assert "classification" in item
            assert item["classification"] in ["star", "plowhorse", "puzzle", "dog"]
            assert "price" in item
            assert "cost" in item
            assert "margin" in item
            assert "orders" in item
            assert "revenue" in item
            assert "profit" in item
            print(f"✓ Matrix returned {len(items)} items with classifications")
        
        # Verify summary has required fields
        assert "total_items" in summary
        assert "stars" in summary
        assert "plowhorses" in summary
        assert "puzzles" in summary
        assert "dogs" in summary
        assert "median_margin" in summary
        assert "median_orders" in summary
        assert "total_revenue" in summary
        assert "total_profit" in summary
        assert "recommendations" in summary
        
        # Verify counts add up
        total = summary["stars"] + summary["plowhorses"] + summary["puzzles"] + summary["dogs"]
        assert total == summary["total_items"], f"Classification counts ({total}) should equal total_items ({summary['total_items']})"
        print(f"✓ Summary: {summary['stars']} stars, {summary['plowhorses']} plowhorses, {summary['puzzles']} puzzles, {summary['dogs']} dogs")
    
    def test_get_overview(self):
        """GET /api/menu-engineering/overview returns quick counts"""
        response = requests.get(f"{BASE_URL}/api/menu-engineering/overview")
        assert response.status_code == 200
        data = response.json()
        
        # Verify overview has counts
        assert "total_items" in data
        assert "stars" in data
        assert "plowhorses" in data
        assert "puzzles" in data
        assert "dogs" in data
        print(f"✓ Overview: {data['total_items']} total items")


class TestPOSConnector:
    """POS Connector API tests - systems, connections, sync"""
    
    def test_list_pos_systems(self):
        """GET /api/pos-connector/systems returns 5 POS systems"""
        response = requests.get(f"{BASE_URL}/api/pos-connector/systems")
        assert response.status_code == 200
        data = response.json()
        
        assert "systems" in data
        systems = data["systems"]
        
        # Verify all 5 systems are present
        expected_systems = ["toast", "aloha", "micros", "square", "clover"]
        for sys in expected_systems:
            assert sys in systems, f"Missing POS system: {sys}"
            assert "name" in systems[sys]
            assert "features" in systems[sys]
            assert "sync_types" in systems[sys]
            assert "auth_type" in systems[sys]
            assert "status" in systems[sys]
        
        print(f"✓ Found {len(systems)} POS systems: {', '.join(systems.keys())}")
    
    def test_list_connections(self):
        """GET /api/pos-connector/connections returns connection list"""
        response = requests.get(f"{BASE_URL}/api/pos-connector/connections")
        assert response.status_code == 200
        data = response.json()
        
        assert "connections" in data
        assert "count" in data
        print(f"✓ Found {data['count']} existing POS connections")
    
    def test_create_connection(self):
        """POST /api/pos-connector/connections creates a new connection"""
        payload = {
            "pos_system": "toast",
            "display_name": "TEST_Main Restaurant POS",
            "location_id": "TEST_LOC_001",
            "sync_interval_minutes": 15,
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/pos-connector/connections", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "connection" in data
        conn = data["connection"]
        assert conn["pos_system"] == "toast"
        assert conn["display_name"] == "TEST_Main Restaurant POS"
        assert conn["status"] == "pending_verification"
        assert "id" in conn
        
        # Store connection ID for subsequent tests
        TestPOSConnector.test_connection_id = conn["id"]
        print(f"✓ Created POS connection: {conn['id']}")
        return conn["id"]
    
    def test_test_connection(self):
        """POST /api/pos-connector/connections/{id}/test tests connection"""
        # First create a connection if not exists
        if not hasattr(TestPOSConnector, 'test_connection_id'):
            self.test_create_connection()
        
        conn_id = TestPOSConnector.test_connection_id
        response = requests.post(f"{BASE_URL}/api/pos-connector/connections/{conn_id}/test")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "connected"
        assert "latency_ms" in data
        assert "tested_at" in data
        print(f"✓ Connection test passed - latency: {data['latency_ms']}ms")
    
    def test_trigger_sync(self):
        """POST /api/pos-connector/sync triggers sync"""
        # First create a connection if not exists
        if not hasattr(TestPOSConnector, 'test_connection_id'):
            self.test_create_connection()
        
        conn_id = TestPOSConnector.test_connection_id
        payload = {
            "connection_id": conn_id,
            "sync_type": "full"
        }
        response = requests.post(f"{BASE_URL}/api/pos-connector/sync", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "sync" in data
        sync = data["sync"]
        assert sync["status"] == "completed"
        assert "records_synced" in sync
        assert "details" in sync
        print(f"✓ Sync completed - {sync['records_synced']} records synced")
    
    def test_pos_dashboard(self):
        """GET /api/pos-connector/dashboard returns dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/pos-connector/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_connections" in data
        assert "active" in data
        assert "pending" in data
        assert "disconnected" in data
        assert "total_syncs" in data
        assert "connections" in data
        print(f"✓ POS Dashboard: {data['total_connections']} connections, {data['active']} active")
    
    def test_sync_nonexistent_connection(self):
        """POST /api/pos-connector/sync with invalid connection returns 404"""
        payload = {
            "connection_id": "nonexistent-id-12345",
            "sync_type": "full"
        }
        response = requests.post(f"{BASE_URL}/api/pos-connector/sync", json=payload)
        assert response.status_code == 404
        print("✓ Correctly returns 404 for nonexistent connection")


class TestGLSync:
    """GL Sync API tests - platforms, connections, mappings, journal sync"""
    
    def test_list_platforms(self):
        """GET /api/gl-sync/platforms returns quickbooks, sage, xero"""
        response = requests.get(f"{BASE_URL}/api/gl-sync/platforms")
        assert response.status_code == 200
        data = response.json()
        
        assert "platforms" in data
        platforms = data["platforms"]
        
        expected = ["quickbooks", "sage", "xero"]
        for p in expected:
            assert p in platforms, f"Missing platform: {p}"
            assert "name" in platforms[p]
            assert "features" in platforms[p]
            assert "auth_type" in platforms[p]
        
        print(f"✓ Found {len(platforms)} GL platforms: {', '.join(platforms.keys())}")
    
    def test_list_gl_connections(self):
        """GET /api/gl-sync/connections returns connection list"""
        response = requests.get(f"{BASE_URL}/api/gl-sync/connections")
        assert response.status_code == 200
        data = response.json()
        
        assert "connections" in data
        assert "count" in data
        print(f"✓ Found {data['count']} existing GL connections")
    
    def test_create_gl_connection(self):
        """POST /api/gl-sync/connections creates a new GL connection"""
        payload = {
            "platform": "quickbooks",
            "company_name": "TEST_LUCCCA Resort LLC",
            "auto_sync": True,
            "sync_frequency": "daily"
        }
        response = requests.post(f"{BASE_URL}/api/gl-sync/connections", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "connection" in data
        conn = data["connection"]
        assert conn["platform"] == "quickbooks"
        assert conn["company_name"] == "TEST_LUCCCA Resort LLC"
        assert conn["status"] == "pending_auth"
        assert "id" in conn
        
        TestGLSync.test_connection_id = conn["id"]
        print(f"✓ Created GL connection: {conn['id']}")
        return conn["id"]
    
    def test_activate_connection(self):
        """POST /api/gl-sync/connections/{id}/activate activates connection"""
        if not hasattr(TestGLSync, 'test_connection_id'):
            self.test_create_gl_connection()
        
        conn_id = TestGLSync.test_connection_id
        response = requests.post(f"{BASE_URL}/api/gl-sync/connections/{conn_id}/activate")
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active"
        assert "activated_at" in data
        print(f"✓ GL connection activated at {data['activated_at']}")
    
    def test_add_account_mapping(self):
        """POST /api/gl-sync/connections/{id}/mappings adds account mapping"""
        if not hasattr(TestGLSync, 'test_connection_id'):
            self.test_create_gl_connection()
            self.test_activate_connection()
        
        conn_id = TestGLSync.test_connection_id
        payload = {
            "luccca_code": "4000",
            "luccca_name": "Food Revenue",
            "external_code": "40000",
            "external_name": "Sales - Food",
            "sync_direction": "push"
        }
        response = requests.post(f"{BASE_URL}/api/gl-sync/connections/{conn_id}/mappings", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "mapping" in data
        mapping = data["mapping"]
        assert mapping["luccca_code"] == "4000"
        assert mapping["external_code"] == "40000"
        assert "id" in mapping
        print(f"✓ Added account mapping: {mapping['luccca_code']} -> {mapping['external_code']}")
    
    def test_sync_journals(self):
        """POST /api/gl-sync/sync/journals syncs journal entries"""
        if not hasattr(TestGLSync, 'test_connection_id'):
            self.test_create_gl_connection()
            self.test_activate_connection()
        
        conn_id = TestGLSync.test_connection_id
        payload = {
            "connection_id": conn_id
        }
        response = requests.post(f"{BASE_URL}/api/gl-sync/sync/journals", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "sync" in data
        sync = data["sync"]
        assert sync["status"] == "completed"
        assert sync["type"] == "journal_push"
        assert "entries_synced" in sync
        assert "total_debits" in sync
        assert "total_credits" in sync
        print(f"✓ Journal sync: {sync['entries_synced']} entries, D: ${sync['total_debits']}, C: ${sync['total_credits']}")
    
    def test_gl_dashboard(self):
        """GET /api/gl-sync/dashboard returns dashboard with stats"""
        response = requests.get(f"{BASE_URL}/api/gl-sync/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_connections" in data
        assert "active_connections" in data
        assert "total_mappings" in data
        assert "gl_codes_count" in data
        assert "journal_entries_count" in data
        assert "recent_syncs" in data
        assert "gl_codes" in data
        
        print(f"✓ GL Dashboard: {data['gl_codes_count']} GL codes, {data['journal_entries_count']} journal entries")
    
    def test_sync_inactive_connection_fails(self):
        """POST /api/gl-sync/sync/journals with inactive connection returns 400"""
        # Create a new connection but don't activate it
        payload = {
            "platform": "sage",
            "company_name": "TEST_Inactive Company",
            "auto_sync": False,
            "sync_frequency": "weekly"
        }
        create_response = requests.post(f"{BASE_URL}/api/gl-sync/connections", json=payload)
        assert create_response.status_code == 200
        inactive_conn_id = create_response.json()["connection"]["id"]
        
        # Try to sync - should fail
        sync_payload = {"connection_id": inactive_conn_id}
        response = requests.post(f"{BASE_URL}/api/gl-sync/sync/journals", json=sync_payload)
        assert response.status_code == 400
        print("✓ Correctly returns 400 for inactive connection sync attempt")
    
    def test_activate_nonexistent_connection(self):
        """POST /api/gl-sync/connections/{id}/activate with invalid ID returns 404"""
        response = requests.post(f"{BASE_URL}/api/gl-sync/connections/nonexistent-id-12345/activate")
        assert response.status_code == 404
        print("✓ Correctly returns 404 for nonexistent connection activation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
