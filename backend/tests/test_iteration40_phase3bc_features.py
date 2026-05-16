"""
Iteration 40 - Phase 3B+3C Features Testing
Tests for:
1. POS & GL Hub (Toast POS + QuickBooks Online OAuth scaffolding)
2. Real-Time Layout Collaboration (session-based with cursor sharing)
3. VR/360 Walkthrough (virtual tours with scenes and hotspots)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestPosGlHubStatus:
    """POS & GL Hub - Integration Status"""
    
    def test_status_returns_200(self):
        """GET /api/pos-gl/status returns 200"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/status")
        assert response.status_code == 200
        print("PASS: /api/pos-gl/status returns 200")
    
    def test_status_has_two_providers(self):
        """Status returns 2 providers (toast, quickbooks)"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/status")
        data = response.json()
        assert "integrations" in data
        assert len(data["integrations"]) == 2
        providers = [i["provider"] for i in data["integrations"]]
        assert "toast" in providers
        assert "quickbooks" in providers
        print(f"PASS: Status has 2 providers: {providers}")
    
    def test_status_structure(self):
        """Each integration has required fields"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/status")
        data = response.json()
        for integration in data["integrations"]:
            assert "provider" in integration
            assert "name" in integration
            assert "status" in integration
            assert "features" in integration
            assert "config" in integration
        print("PASS: Integration structure valid")


class TestToastPosIntegration:
    """Toast POS - Connect, Sync, Orders, Menu"""
    
    def test_toast_connect(self):
        """POST /api/pos-gl/toast/connect connects with credentials"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/toast/connect", json={
            "client_id": "test-toast-client",
            "client_secret": "test-secret",
            "restaurant_external_id": "test-restaurant-123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "connection" in data
        assert data["connection"]["status"] == "connected"
        print(f"PASS: Toast connected - {data['connection']['connection_id']}")
    
    def test_toast_sync(self):
        """POST /api/pos-gl/toast/sync triggers data sync"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/toast/sync")
        assert response.status_code == 200
        data = response.json()
        assert "sync_id" in data
        assert data.get("status") == "success"
        assert "records" in data
        assert data["records"]["orders_synced"] > 0
        assert data["records"]["menu_items_synced"] > 0
        print(f"PASS: Toast sync - {data['records']['orders_synced']} orders, {data['records']['menu_items_synced']} menu items")
    
    def test_toast_orders(self):
        """GET /api/pos-gl/toast/orders returns demo orders"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/toast/orders?limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert len(data["orders"]) > 0
        order = data["orders"][0]
        assert "order_id" in order
        assert "order_type" in order
        assert "total" in order
        assert "payment_type" in order
        print(f"PASS: Toast orders - {len(data['orders'])} orders returned")
    
    def test_toast_menu_sync(self):
        """GET /api/pos-gl/toast/menu-sync returns synced menu categories"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/toast/menu-sync")
        assert response.status_code == 200
        data = response.json()
        assert "synced_items" in data
        assert data["synced_items"] > 0
        assert "categories" in data
        assert len(data["categories"]) > 0
        print(f"PASS: Toast menu sync - {data['synced_items']} items, {len(data['categories'])} categories")


class TestQuickBooksIntegration:
    """QuickBooks Online - OAuth, Sync, Chart of Accounts, P&L"""
    
    def test_quickbooks_auth_url(self):
        """GET /api/pos-gl/quickbooks/auth-url generates OAuth URL"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/quickbooks/auth-url", params={
            "client_id": "test-qb-client",
            "redirect_uri": "https://example.com/callback"
        })
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "state" in data
        assert "appcenter.intuit.com" in data["auth_url"]
        print(f"PASS: QuickBooks auth URL generated with state: {data['state']}")
    
    def test_quickbooks_connect(self):
        """POST /api/pos-gl/quickbooks/connect connects QuickBooks"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/quickbooks/connect", json={
            "client_id": "test-qb-client",
            "realm_id": "test-realm-123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "connection" in data
        assert data["connection"]["status"] == "connected"
        print(f"PASS: QuickBooks connected - {data['connection']['connection_id']}")
    
    def test_quickbooks_sync(self):
        """POST /api/pos-gl/quickbooks/sync triggers GL sync"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/quickbooks/sync")
        assert response.status_code == 200
        data = response.json()
        assert "sync_id" in data
        assert data.get("status") == "success"
        assert "records" in data
        assert data["records"]["accounts_synced"] > 0
        print(f"PASS: QuickBooks sync - {data['records']['accounts_synced']} accounts synced")
    
    def test_quickbooks_chart_of_accounts(self):
        """GET /api/pos-gl/quickbooks/chart-of-accounts returns 10 GL accounts"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/quickbooks/chart-of-accounts")
        assert response.status_code == 200
        data = response.json()
        assert "accounts" in data
        assert len(data["accounts"]) == 10
        account = data["accounts"][0]
        assert "id" in account
        assert "name" in account
        assert "type" in account
        assert "balance" in account
        print(f"PASS: Chart of accounts - {len(data['accounts'])} accounts")
    
    def test_quickbooks_profit_loss(self):
        """GET /api/pos-gl/quickbooks/profit-loss returns P&L with $1.5M revenue"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/quickbooks/profit-loss")
        assert response.status_code == 200
        data = response.json()
        assert "revenue" in data
        assert "cost_of_goods" in data
        assert "gross_profit" in data
        assert "net_income" in data
        # Verify ~$1.5M revenue
        assert data["revenue"]["total"] > 1500000
        print(f"PASS: P&L - Revenue: ${data['revenue']['total']:,.0f}, Net Income: ${data['net_income']:,.0f}")


class TestPosGlWebhooks:
    """POS/GL Webhooks - Toast and QuickBooks"""
    
    def test_toast_webhook(self):
        """POST /api/pos-gl/webhooks/toast receives webhook event"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/webhooks/toast", json={
            "eventType": "ORDER_CREATED",
            "orderId": "test-order-123",
            "timestamp": "2026-01-15T10:00:00Z"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("received") == True
        assert data.get("event_type") == "ORDER_CREATED"
        print("PASS: Toast webhook received")
    
    def test_quickbooks_webhook(self):
        """POST /api/pos-gl/webhooks/quickbooks receives webhook event"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/webhooks/quickbooks", json={
            "eventNotifications": [{
                "dataChangeEvent": {
                    "entities": [{"name": "Invoice", "id": "123"}]
                }
            }]
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("received") == True
        print("PASS: QuickBooks webhook received")


class TestPosGlSyncLog:
    """POS/GL Sync Log"""
    
    def test_sync_log(self):
        """GET /api/pos-gl/sync-log returns sync/webhook events"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/sync-log?limit=20")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        # Should have logs from previous sync operations
        assert len(data["logs"]) > 0
        print(f"PASS: Sync log - {len(data['logs'])} events")
    
    def test_sync_log_filter_by_provider(self):
        """GET /api/pos-gl/sync-log?provider=toast filters by provider"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/sync-log?provider=toast")
        assert response.status_code == 200
        data = response.json()
        for log in data["logs"]:
            assert log["provider"] == "toast"
        print(f"PASS: Sync log filtered by toast - {len(data['logs'])} events")


class TestPosGlDisconnect:
    """POS/GL Disconnect Integration"""
    
    def test_disconnect_toast(self):
        """POST /api/pos-gl/disconnect/toast disconnects integration"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/disconnect/toast")
        assert response.status_code == 200
        data = response.json()
        assert data.get("disconnected") == True
        assert data.get("provider") == "toast"
        print("PASS: Toast disconnected")
    
    def test_verify_toast_disconnected(self):
        """Verify Toast shows disconnected status"""
        response = requests.get(f"{BASE_URL}/api/pos-gl/status")
        data = response.json()
        toast = next((i for i in data["integrations"] if i["provider"] == "toast"), None)
        assert toast is not None
        assert toast["status"] == "disconnected"
        print("PASS: Toast status verified as disconnected")
    
    def test_reconnect_toast(self):
        """Reconnect Toast for other tests"""
        response = requests.post(f"{BASE_URL}/api/pos-gl/toast/connect", json={
            "client_id": "test-toast-client",
            "client_secret": "test-secret",
            "restaurant_external_id": "test-restaurant-123"
        })
        assert response.status_code == 200
        print("PASS: Toast reconnected")


class TestCollaborationSessions:
    """Real-Time Layout Collaboration - Sessions"""
    
    created_session_id = None
    
    def test_create_session(self):
        """POST /api/collaboration/sessions creates session with host participant"""
        response = requests.post(f"{BASE_URL}/api/collaboration/sessions", json={
            "name": "Test Layout Session",
            "layout_id": "layout-test-123",
            "room_name": "Grand Ballroom",
            "user_name": "Test Admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["name"] == "Test Layout Session"
        assert data["status"] == "active"
        assert len(data["participants"]) == 1
        assert data["participants"][0]["role"] == "host"
        assert data["participants"][0]["name"] == "Test Admin"
        TestCollaborationSessions.created_session_id = data["session_id"]
        print(f"PASS: Session created - {data['session_id']}")
    
    def test_list_sessions(self):
        """GET /api/collaboration/sessions lists active sessions"""
        response = requests.get(f"{BASE_URL}/api/collaboration/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "total" in data
        assert len(data["sessions"]) > 0
        print(f"PASS: Sessions listed - {len(data['sessions'])} active sessions")
    
    def test_get_session(self):
        """GET /api/collaboration/sessions/{id} returns session details"""
        session_id = TestCollaborationSessions.created_session_id
        response = requests.get(f"{BASE_URL}/api/collaboration/sessions/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == session_id
        assert "participants" in data
        print(f"PASS: Session retrieved - {data['name']}")
    
    def test_join_session(self):
        """POST /api/collaboration/sessions/{id}/join adds participant"""
        session_id = TestCollaborationSessions.created_session_id
        response = requests.post(f"{BASE_URL}/api/collaboration/sessions/{session_id}/join", json={
            "user_name": "Collaborator 1"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("joined") == True
        assert "participant" in data
        assert data["participant"]["role"] == "collaborator"
        print(f"PASS: Participant joined - {data['participant']['name']}")


class TestCollaborationEdits:
    """Real-Time Layout Collaboration - Edits and Cursors"""
    
    def test_record_edit(self):
        """POST /api/collaboration/sessions/{id}/edit records edit action"""
        session_id = TestCollaborationSessions.created_session_id
        response = requests.post(f"{BASE_URL}/api/collaboration/sessions/{session_id}/edit", json={
            "user_id": "user-test-123",
            "user_name": "Test Admin",
            "action": "move",
            "element_id": "table-1",
            "element_type": "table",
            "changes": {"x": 100, "y": 200}
        })
        assert response.status_code == 200
        data = response.json()
        assert "edit_id" in data
        assert data["action"] == "move"
        assert data["element_type"] == "table"
        print(f"PASS: Edit recorded - {data['edit_id']}")
    
    def test_get_edits(self):
        """GET /api/collaboration/sessions/{id}/edits returns edit history"""
        session_id = TestCollaborationSessions.created_session_id
        response = requests.get(f"{BASE_URL}/api/collaboration/sessions/{session_id}/edits")
        assert response.status_code == 200
        data = response.json()
        assert "edits" in data
        assert "total" in data
        assert len(data["edits"]) > 0
        print(f"PASS: Edit history - {len(data['edits'])} edits")
    
    def test_update_cursor(self):
        """POST /api/collaboration/sessions/{id}/cursor updates cursor position"""
        session_id = TestCollaborationSessions.created_session_id
        response = requests.post(f"{BASE_URL}/api/collaboration/sessions/{session_id}/cursor", json={
            "user_id": "user-test-123",
            "x": 150,
            "y": 250
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("updated") == True
        print("PASS: Cursor position updated")


class TestCollaborationSessionEnd:
    """Real-Time Layout Collaboration - End Session"""
    
    def test_end_session(self):
        """POST /api/collaboration/sessions/{id}/end ends session"""
        session_id = TestCollaborationSessions.created_session_id
        response = requests.post(f"{BASE_URL}/api/collaboration/sessions/{session_id}/end")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ended") == True
        print("PASS: Session ended")
    
    def test_verify_session_ended(self):
        """Verify session status is ended"""
        session_id = TestCollaborationSessions.created_session_id
        response = requests.get(f"{BASE_URL}/api/collaboration/sessions/{session_id}")
        data = response.json()
        assert data["status"] == "ended"
        print("PASS: Session status verified as ended")


class TestVrWalkthroughTours:
    """VR/360 Walkthrough - Tours"""
    
    created_tour_id = None
    
    def test_list_tours(self):
        """GET /api/vr-walkthrough/tours returns 4 demo tours"""
        response = requests.get(f"{BASE_URL}/api/vr-walkthrough/tours")
        assert response.status_code == 200
        data = response.json()
        assert "tours" in data
        assert "total" in data
        # Should have at least 4 demo tours seeded
        assert len(data["tours"]) >= 4
        print(f"PASS: Tours listed - {len(data['tours'])} tours")
    
    def test_create_tour(self):
        """POST /api/vr-walkthrough/tours creates new tour"""
        response = requests.post(f"{BASE_URL}/api/vr-walkthrough/tours", json={
            "name": "Test Conference Room Tour",
            "venue": "Test Venue",
            "description": "Test tour for automated testing",
            "room_type": "conference",
            "capacity": 50
        })
        assert response.status_code == 200
        data = response.json()
        assert "tour_id" in data
        assert data["name"] == "Test Conference Room Tour"
        assert data["status"] == "draft"
        TestVrWalkthroughTours.created_tour_id = data["tour_id"]
        print(f"PASS: Tour created - {data['tour_id']}")
    
    def test_get_tour(self):
        """GET /api/vr-walkthrough/tours/{id} returns tour with scenes"""
        tour_id = TestVrWalkthroughTours.created_tour_id
        response = requests.get(f"{BASE_URL}/api/vr-walkthrough/tours/{tour_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["tour_id"] == tour_id
        assert "scenes" in data
        print(f"PASS: Tour retrieved - {data['name']}")


class TestVrWalkthroughScenes:
    """VR/360 Walkthrough - Scenes"""
    
    created_scene_id = None
    
    def test_add_scene(self):
        """POST /api/vr-walkthrough/tours/{id}/scenes adds scene to tour"""
        tour_id = TestVrWalkthroughTours.created_tour_id
        response = requests.post(f"{BASE_URL}/api/vr-walkthrough/tours/{tour_id}/scenes", json={
            "name": "Entrance View",
            "description": "Main entrance panorama",
            "panorama_url": "https://example.com/panorama1.jpg",
            "initial_view": {"yaw": 0, "pitch": 0, "fov": 90},
            "order": 1
        })
        assert response.status_code == 200
        data = response.json()
        assert "scene_id" in data
        assert data["name"] == "Entrance View"
        assert data["tour_id"] == tour_id
        TestVrWalkthroughScenes.created_scene_id = data["scene_id"]
        print(f"PASS: Scene added - {data['scene_id']}")
    
    def test_list_scenes(self):
        """GET /api/vr-walkthrough/tours/{id}/scenes lists scenes"""
        tour_id = TestVrWalkthroughTours.created_tour_id
        response = requests.get(f"{BASE_URL}/api/vr-walkthrough/tours/{tour_id}/scenes")
        assert response.status_code == 200
        data = response.json()
        assert "scenes" in data
        assert len(data["scenes"]) > 0
        print(f"PASS: Scenes listed - {len(data['scenes'])} scenes")


class TestVrWalkthroughHotspots:
    """VR/360 Walkthrough - Hotspots"""
    
    def test_add_hotspot(self):
        """POST /api/vr-walkthrough/scenes/{id}/hotspots adds hotspot"""
        scene_id = TestVrWalkthroughScenes.created_scene_id
        response = requests.post(f"{BASE_URL}/api/vr-walkthrough/scenes/{scene_id}/hotspots", json={
            "type": "info",
            "yaw": 45,
            "pitch": -10,
            "label": "Reception Desk",
            "description": "Main reception area"
        })
        assert response.status_code == 200
        data = response.json()
        assert "hotspot_id" in data
        assert data["label"] == "Reception Desk"
        assert data["type"] == "info"
        print(f"PASS: Hotspot added - {data['hotspot_id']}")
    
    def test_list_hotspots(self):
        """GET /api/vr-walkthrough/scenes/{id}/hotspots lists hotspots"""
        scene_id = TestVrWalkthroughScenes.created_scene_id
        response = requests.get(f"{BASE_URL}/api/vr-walkthrough/scenes/{scene_id}/hotspots")
        assert response.status_code == 200
        data = response.json()
        assert "hotspots" in data
        assert len(data["hotspots"]) > 0
        print(f"PASS: Hotspots listed - {len(data['hotspots'])} hotspots")


class TestVrWalkthroughRoomConfigs:
    """VR/360 Walkthrough - Room Configurations"""
    
    def test_room_configs(self):
        """GET /api/vr-walkthrough/room-configs returns 4 room configurations"""
        response = requests.get(f"{BASE_URL}/api/vr-walkthrough/room-configs")
        assert response.status_code == 200
        data = response.json()
        assert "configs" in data
        assert len(data["configs"]) == 4
        config = data["configs"][0]
        assert "config_id" in config
        assert "name" in config
        assert "layout" in config
        assert "total_capacity" in config
        assert "dimensions" in config
        assert "elements" in config
        print(f"PASS: Room configs - {len(data['configs'])} configurations")


class TestVrWalkthroughDelete:
    """VR/360 Walkthrough - Delete Tour (Cascade)"""
    
    def test_delete_tour(self):
        """DELETE /api/vr-walkthrough/tours/{id} deletes tour and cascades"""
        tour_id = TestVrWalkthroughTours.created_tour_id
        response = requests.delete(f"{BASE_URL}/api/vr-walkthrough/tours/{tour_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("deleted") == True
        print("PASS: Tour deleted with cascade")
    
    def test_verify_tour_deleted(self):
        """Verify tour no longer exists"""
        tour_id = TestVrWalkthroughTours.created_tour_id
        response = requests.get(f"{BASE_URL}/api/vr-walkthrough/tours/{tour_id}")
        data = response.json()
        assert "error" in data
        print("PASS: Tour deletion verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
