"""
Iteration 51 - EchoAi³ Redesigned Canvas Backend Tests
======================================================
Tests the redesigned EchoAi³ Synthetic Command Center:
- POST /api/echoai3/think - main intelligence endpoint
- Intent classification (finance, simulate, etc.)
- Session management (list, get, delete)
- Feedback/calibration endpoint
- Health check with 9 domains
- TraceLedger trace retrieval
- Voice transcribe endpoint (error handling)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestEchoAi3Health:
    """Health endpoint tests - verify all 9 domains and layer status"""

    def test_health_returns_operational(self):
        """GET /api/echoai3/health returns status=operational"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"
        print(f"✓ Health status: {data['status']}")

    def test_health_has_9_domains(self):
        """Health endpoint lists all 9 domains"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health")
        assert response.status_code == 200
        data = response.json()
        assert "domains" in data
        assert len(data["domains"]) == 9
        expected_domains = ["finance", "events", "inventory", "labor", "culinary", "vendor", "guest", "beverage", "operations"]
        for domain in expected_domains:
            assert domain in data["domains"], f"Missing domain: {domain}"
        print(f"✓ All 9 domains present: {data['domains']}")

    def test_health_has_layer_status(self):
        """Health endpoint shows all 5 layers"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health")
        assert response.status_code == 200
        data = response.json()
        assert "layer_1" in data
        assert "layer_2" in data
        assert "layer_3" in data
        assert "layer_4" in data
        assert "layer_5" in data
        assert "trace_ledger" in data
        print(f"✓ All layers present, TraceLedger: {data['trace_ledger']}")

    def test_health_llm_configured(self):
        """Health shows LLM key is configured"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("llm_key_configured") == True
        print("✓ LLM key configured")


class TestEchoAi3Think:
    """Main intelligence endpoint tests"""

    def test_think_basic_query(self):
        """POST /api/echoai3/think returns response with required fields"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What is our current revenue?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "message_id" in data
        assert "response" in data
        assert "session_id" in data
        assert "intent" in data
        assert "confidence" in data
        assert "data_sources" in data
        assert "trace_id" in data
        
        print(f"✓ Think response has all required fields")
        print(f"  - message_id: {data['message_id'][:20]}...")
        print(f"  - confidence: {data['confidence']}%")
        print(f"  - trace_id: {data['trace_id']}")

    def test_think_finance_domain(self):
        """Finance query classified as finance domain"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What is our EBITDA margin and food cost breakdown?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"]["primary_domain"] == "finance"
        assert "gl_entries" in data["data_sources"] or "budgets" in data["data_sources"]
        print(f"✓ Finance query classified correctly: {data['intent']['primary_domain']}")
        print(f"  - Sources: {data['data_sources']}")

    def test_think_events_domain(self):
        """Events query classified as events domain"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Show me upcoming banquet events and guest counts", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"]["primary_domain"] == "events"
        print(f"✓ Events query classified correctly: {data['intent']['primary_domain']}")

    def test_think_inventory_domain(self):
        """Inventory query classified as inventory domain"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Which inventory items are below par level?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"]["primary_domain"] == "inventory"
        print(f"✓ Inventory query classified correctly: {data['intent']['primary_domain']}")

    def test_think_simulate_intent(self):
        """'What if' query classified as simulate intent_type"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What if we add 200 covers to Saturday's banquet?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"]["intent_type"] == "simulate"
        print(f"✓ Simulate intent classified correctly: {data['intent']['intent_type']}")

    def test_think_recommend_intent(self):
        """'Should I' query classified as recommend intent_type"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Should I increase staffing for the weekend?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"]["intent_type"] == "recommend"
        print(f"✓ Recommend intent classified correctly: {data['intent']['intent_type']}")

    def test_think_session_continuity(self):
        """Multiple messages in same session maintain history"""
        # First message - creates session
        r1 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What is our food cost?", "user_id": "owner-001"}
        )
        assert r1.status_code == 200
        session_id = r1.json()["session_id"]
        
        # Second message - same session
        r2 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "How does that compare to last month?", "session_id": session_id, "user_id": "owner-001"}
        )
        assert r2.status_code == 200
        assert r2.json()["session_id"] == session_id
        
        # Verify session has both messages
        r3 = requests.get(f"{BASE_URL}/api/echoai3/session/{session_id}")
        assert r3.status_code == 200
        messages = r3.json().get("messages", [])
        assert len(messages) >= 4  # 2 user + 2 assistant
        print(f"✓ Session continuity works: {len(messages)} messages in session")


class TestEchoAi3Sessions:
    """Session management tests"""

    def test_list_sessions(self):
        """GET /api/echoai3/sessions returns sessions with previews"""
        response = requests.get(f"{BASE_URL}/api/echoai3/sessions?user_id=owner-001")
        assert response.status_code == 200
        data = response.json()
        
        assert "sessions" in data
        if len(data["sessions"]) > 0:
            session = data["sessions"][0]
            assert "session_id" in session
            assert "preview" in session
            assert "turn_count" in session
            print(f"✓ Sessions list: {len(data['sessions'])} sessions")
            print(f"  - First preview: {session['preview'][:50]}...")
        else:
            print("✓ Sessions list returned (empty)")

    def test_get_session(self):
        """GET /api/echoai3/session/{id} returns full session"""
        # Create a session first
        r1 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Test session retrieval", "user_id": "owner-001"}
        )
        session_id = r1.json()["session_id"]
        
        # Get the session
        response = requests.get(f"{BASE_URL}/api/echoai3/session/{session_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_id"] == session_id
        assert "messages" in data
        assert len(data["messages"]) >= 2
        print(f"✓ Session retrieved: {len(data['messages'])} messages")

    def test_delete_session(self):
        """DELETE /api/echoai3/session/{id} removes session"""
        # Create a session
        r1 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Session to delete", "user_id": "owner-001"}
        )
        session_id = r1.json()["session_id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/echoai3/session/{session_id}")
        assert response.status_code == 200
        assert response.json().get("deleted") == True
        
        # Verify it's gone
        r2 = requests.get(f"{BASE_URL}/api/echoai3/session/{session_id}")
        assert r2.json().get("error") == "Session not found" or r2.json().get("session_id") is None
        print(f"✓ Session deleted successfully")


class TestEchoAi3Feedback:
    """Feedback/calibration endpoint tests"""

    def test_submit_feedback(self):
        """POST /api/echoai3/feedback stores calibration feedback"""
        # Create a message first
        r1 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Test feedback submission", "user_id": "owner-001"}
        )
        data = r1.json()
        message_id = data["message_id"]
        session_id = data["session_id"]
        
        # Submit feedback
        response = requests.post(
            f"{BASE_URL}/api/echoai3/feedback",
            json={
                "message_id": message_id,
                "session_id": session_id,
                "rating": 5,
                "feedback": "Accurate response"
            }
        )
        assert response.status_code == 200
        assert response.json().get("recorded") == True
        print(f"✓ Feedback recorded for message {message_id[:15]}...")


class TestEchoAi3Trace:
    """TraceLedger audit trail tests"""

    def test_get_trace(self):
        """GET /api/echoai3/trace/{message_id} returns audit trail"""
        # Create a message first
        r1 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Test trace retrieval", "user_id": "owner-001"}
        )
        message_id = r1.json()["message_id"]
        
        # Get trace
        response = requests.get(f"{BASE_URL}/api/echoai3/trace/{message_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["message_id"] == message_id
        assert "trail" in data
        print(f"✓ Trace retrieved: {len(data['trail'])} entries")


class TestEchoAi3Voice:
    """Voice transcription endpoint tests"""

    def test_voice_transcribe_no_file_error(self):
        """POST /api/echoai3/voice/transcribe returns 422 without file"""
        response = requests.post(f"{BASE_URL}/api/echoai3/voice/transcribe")
        # Should return 422 Unprocessable Entity when no file is provided
        assert response.status_code == 422
        print(f"✓ Voice endpoint returns 422 without file (expected)")

    def test_voice_transcribe_empty_form(self):
        """POST /api/echoai3/voice/transcribe with empty form returns error"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/voice/transcribe",
            files={}
        )
        assert response.status_code == 422
        print(f"✓ Voice endpoint handles empty form correctly")


class TestEchoAi3IntentTypes:
    """Test all intent type classifications"""

    def test_forecast_intent(self):
        """Forecast query classified correctly"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What is the revenue projection for next month?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        assert response.json()["intent"]["intent_type"] == "forecast"
        print("✓ Forecast intent classified correctly")

    def test_compare_intent(self):
        """Compare query classified correctly"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Compare food cost vs beverage cost", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        assert response.json()["intent"]["intent_type"] == "compare"
        print("✓ Compare intent classified correctly")

    def test_alert_intent(self):
        """Alert query classified correctly"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What are the critical risks I should address?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        assert response.json()["intent"]["intent_type"] == "alert"
        print("✓ Alert intent classified correctly")

    def test_explain_intent(self):
        """Explain query classified correctly"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Why did food cost increase last week?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        assert response.json()["intent"]["intent_type"] == "explain"
        print("✓ Explain intent classified correctly")

    def test_quantify_intent(self):
        """Quantify query classified correctly"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "How much did we spend on labor this month?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        assert response.json()["intent"]["intent_type"] == "quantify"
        print("✓ Quantify intent classified correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
