"""
Iteration 109: Chef Gio Training Module & Kitchen War Room Tests
================================================================
Tests for:
- Chef Gio Training Module (AI culinary training with Emergent LLM Key)
- Kitchen War Room dashboard (live operations view)

Chef Gio uses conversational AI via Emergent LLM Key (gpt-4.1) to walk through BEOs.
Kitchen War Room shows all active operations at a glance.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self, api_client):
        """Verify API is running"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestChefGioTrainingModes:
    """Test training modes endpoint"""
    
    def test_get_training_modes(self, api_client):
        """GET /api/chef-gio/training-modes - returns 4 modes"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/training-modes")
        assert response.status_code == 200
        data = response.json()
        assert "modes" in data
        modes = data["modes"]
        assert len(modes) == 4
        mode_ids = [m["id"] for m in modes]
        assert "full_walkthrough" in mode_ids
        assert "quiz" in mode_ids
        assert "scenario" in mode_ids
        assert "freeform" in mode_ids
        print(f"✓ Training modes: {mode_ids}")


class TestChefGioKnowledgeBase:
    """Test knowledge base endpoints"""
    
    def test_get_knowledge_base(self, api_client):
        """GET /api/chef-gio/knowledge-base - returns core topics and custom entries"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/knowledge-base")
        assert response.status_code == 200
        data = response.json()
        assert "core_topics" in data
        assert "custom_entries" in data
        assert len(data["core_topics"]) >= 10  # Should have 10 core topics
        print(f"✓ Knowledge base: {len(data['core_topics'])} core topics, {data['total_custom']} custom entries")
    
    def test_add_custom_knowledge(self, api_client):
        """POST /api/chef-gio/knowledge-base/add - adds custom training knowledge"""
        payload = {
            "chef_id": "test-chef-001",
            "chef_name": "Test Chef",
            "topic": "TEST_Oven Temperature Tips",
            "content": "Always preheat Rational ovens 15 minutes before service for consistent results.",
            "applies_to": "all"
        }
        response = api_client.post(f"{BASE_URL}/api/chef-gio/knowledge-base/add", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["topic"] == payload["topic"]
        assert data["content"] == payload["content"]
        print(f"✓ Added custom knowledge: {data['id']}")


class TestChefGioSessionManagement:
    """Test session creation and management"""
    
    def test_create_session_with_beo(self, api_client):
        """POST /api/chef-gio/sessions/create with BEO number - creates session with AI opening"""
        payload = {
            "beo_number": 7186,
            "chef_name": "Sous Chef Alex",
            "mode": "full_walkthrough"
        }
        # LLM calls take 5-15 seconds
        response = api_client.post(f"{BASE_URL}/api/chef-gio/sessions/create", json=payload, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["session_id"].startswith("gio-")
        assert "opening_message" in data
        assert len(data["opening_message"]) > 50  # Should have substantial opening
        assert data["mode"] == "full_walkthrough"
        # BEO data should be loaded
        if data.get("beo_data"):
            assert data["beo_data"]["beo_number"] == 7186
        print(f"✓ Created session with BEO: {data['session_id']}")
        print(f"  Opening message preview: {data['opening_message'][:100]}...")
        return data["session_id"]
    
    def test_create_freeform_session_no_beo(self, api_client):
        """POST /api/chef-gio/sessions/create with NO beo_number - starts freeform session"""
        payload = {
            "chef_name": "Line Cook Maria",
            "mode": "freeform"
        }
        response = api_client.post(f"{BASE_URL}/api/chef-gio/sessions/create", json=payload, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "opening_message" in data
        assert data["beo_data"] is None  # No BEO loaded
        print(f"✓ Created freeform session: {data['session_id']}")
        print(f"  Opening: {data['opening_message'][:100]}...")
    
    def test_list_sessions(self, api_client):
        """GET /api/chef-gio/sessions - lists all training sessions"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/sessions")
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
        print(f"✓ Listed {len(data['sessions'])} sessions")


class TestChefGioConversation:
    """Test conversation flow with Chef Gio"""
    
    @pytest.fixture(scope="class")
    def session_id(self, api_client):
        """Create a session for conversation tests"""
        payload = {
            "beo_number": 7186,
            "chef_name": "Test Trainee",
            "mode": "full_walkthrough"
        }
        response = api_client.post(f"{BASE_URL}/api/chef-gio/sessions/create", json=payload, timeout=30)
        assert response.status_code == 200
        return response.json()["session_id"]
    
    def test_send_message_and_get_response(self, api_client, session_id):
        """POST /api/chef-gio/sessions/{session_id}/message - sends message and gets AI response"""
        payload = {"message": "What's the most labor-intensive item on this menu?"}
        response = api_client.post(f"{BASE_URL}/api/chef-gio/sessions/{session_id}/message", json=payload, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 20  # Should have meaningful response
        assert "message_count" in data
        print(f"✓ Got Chef Gio response: {data['response'][:100]}...")
    
    def test_get_session_history(self, api_client, session_id):
        """GET /api/chef-gio/sessions/{session_id}/history - returns full conversation history"""
        response = api_client.get(f"{BASE_URL}/api/chef-gio/sessions/{session_id}/history")
        assert response.status_code == 200
        data = response.json()
        assert "session" in data
        assert "messages" in data
        assert len(data["messages"]) >= 2  # At least opening + one exchange
        # Verify message structure
        for msg in data["messages"]:
            assert "role" in msg
            assert "content" in msg
            assert msg["role"] in ["user", "assistant"]
        print(f"✓ Session history: {len(data['messages'])} messages")
    
    def test_send_empty_message_fails(self, api_client, session_id):
        """POST with empty message should return 400"""
        payload = {"message": "   "}
        response = api_client.post(f"{BASE_URL}/api/chef-gio/sessions/{session_id}/message", json=payload, timeout=10)
        assert response.status_code == 400
        print("✓ Empty message correctly rejected")
    
    def test_invalid_session_returns_404(self, api_client):
        """POST to non-existent session should return 404"""
        payload = {"message": "Hello"}
        response = api_client.post(f"{BASE_URL}/api/chef-gio/sessions/invalid-session-xyz/message", json=payload, timeout=10)
        assert response.status_code == 404
        print("✓ Invalid session correctly returns 404")


class TestKitchenWarRoomEquipment:
    """Test Kitchen War Room equipment endpoint"""
    
    def test_get_equipment_status(self, api_client):
        """GET /api/kitchen-production/equipment - returns equipment grid"""
        response = api_client.get(f"{BASE_URL}/api/kitchen-production/equipment")
        assert response.status_code == 200
        data = response.json()
        assert "equipment" in data
        assert "summary" in data
        # Check summary has expected fields
        summary = data["summary"]
        assert "working_ovens" in summary
        assert "total_oven_sheet_pan_capacity" in summary
        print(f"✓ Equipment: {summary['working_ovens']} working ovens, {summary['total_oven_sheet_pan_capacity']} pan capacity")


class TestKitchenWarRoomFiring:
    """Test Kitchen War Room firing sequence endpoint"""
    
    def test_firing_sequence(self, api_client):
        """POST /api/kitchen-production/firing-sequence - returns firing timeline"""
        payload = {
            "beo_numbers": [7186, 7169],
            "fire_time": "17:30"
        }
        response = api_client.post(f"{BASE_URL}/api/kitchen-production/firing-sequence", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "firing_timeline" in data
        assert "demand" in data
        # Check demand summary
        demand = data["demand"]
        assert "total_sheet_pans_needed" in demand
        assert "utilization_pct" in demand
        assert "has_bottleneck" in demand
        print(f"✓ Firing sequence: {len(data['firing_timeline'])} timeline items, {demand['utilization_pct']}% utilization")
        if demand["has_bottleneck"]:
            print(f"  ⚠ Bottleneck detected: {demand['overflow_pans']} overflow pans")


class TestKitchenWarRoomCartLabels:
    """Test Kitchen War Room cart labels endpoint"""
    
    def test_cart_labels(self, api_client):
        """POST /api/kitchen-production/cart-labels - returns cart assignments"""
        payload = {"beo_numbers": [7186, 7169]}
        response = api_client.post(f"{BASE_URL}/api/kitchen-production/cart-labels", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "labels" in data
        assert "total_carts" in data
        # Check label structure
        if data["labels"]:
            label = data["labels"][0]
            assert "cart_number" in label
            assert "beo_number" in label
            assert "cart_type" in label  # HOT or COLD
            assert "room" in label
        print(f"✓ Cart labels: {data['total_carts']} carts assigned")


class TestKitchenWarRoomSupplierShortage:
    """Test Kitchen War Room supplier shortage detection"""
    
    def test_supplier_shortage_detect(self, api_client):
        """POST /api/kitchen-production/supplier-shortage/detect - returns shortage alerts"""
        payload = {"beo_numbers": [7186, 7169]}
        response = api_client.post(f"{BASE_URL}/api/kitchen-production/supplier-shortage/detect", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "shortages" in data
        assert "callouts" in data
        # Check callouts structure
        callouts = data["callouts"]
        assert "foh_shortages" in callouts
        assert "boh_shortages" in callouts
        print(f"✓ Supplier shortage: {len(data['shortages'])} shortages, FOH: {len(callouts['foh_shortages'])}, BOH: {len(callouts['boh_shortages'])}")


class TestKitchenWarRoomIntegration:
    """Integration test - all War Room endpoints together"""
    
    def test_war_room_full_load(self, api_client):
        """Test all War Room endpoints load together (as frontend does)"""
        active_beos = [7186, 7169]
        fire_time = "17:30"
        
        # Equipment
        eq_resp = api_client.get(f"{BASE_URL}/api/kitchen-production/equipment")
        assert eq_resp.status_code == 200
        
        # Firing sequence
        fire_resp = api_client.post(f"{BASE_URL}/api/kitchen-production/firing-sequence", 
                                    json={"beo_numbers": active_beos, "fire_time": fire_time})
        assert fire_resp.status_code == 200
        
        # Cart labels
        cart_resp = api_client.post(f"{BASE_URL}/api/kitchen-production/cart-labels",
                                    json={"beo_numbers": active_beos})
        assert cart_resp.status_code == 200
        
        # Supplier shortage
        short_resp = api_client.post(f"{BASE_URL}/api/kitchen-production/supplier-shortage/detect",
                                     json={"beo_numbers": active_beos})
        assert short_resp.status_code == 200
        
        print("✓ Kitchen War Room full load successful - all 4 endpoints working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
