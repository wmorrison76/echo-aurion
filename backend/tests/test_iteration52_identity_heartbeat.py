"""
Iteration 52 - EchoAi³ Self-Awareness Layer & Operational Heartbeat Tests
==========================================================================
Tests the new features:
1. Self-Awareness Layer - identity queries trigger special classification
2. Operational Heartbeat - live vital signs endpoint
3. Voice transcribe endpoint (422 without file)
4. Identity endpoint returns self_model
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestEchoAi3IdentityQueries:
    """Test Self-Awareness Layer - identity query detection and response"""

    def test_who_are_you_identity_query(self):
        """POST /api/echoai3/think with 'Who are you?' should classify as identity"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Who are you?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify identity classification
        assert "intent" in data
        assert data["intent"].get("intent_type") == "identity", f"Expected intent_type='identity', got {data['intent'].get('intent_type')}"
        assert data["intent"].get("is_identity_query") is True, "Expected is_identity_query=True"
        
        # Verify response mentions Echo, operational intelligence, LUCCCA
        response_text = data.get("response", "").lower()
        assert "echo" in response_text, "Response should mention 'Echo'"
        print(f"✓ 'Who are you?' classified as identity query with is_identity_query=True")

    def test_what_do_you_do_identity_query(self):
        """POST /api/echoai3/think with 'What do you do?' should trigger identity"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What do you do?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"].get("intent_type") == "identity"
        assert data["intent"].get("is_identity_query") is True
        print(f"✓ 'What do you do?' classified as identity query")

    def test_how_are_you_different_from_chatgpt(self):
        """POST /api/echoai3/think with 'How are you different from ChatGPT?' - identity query"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "How are you different from ChatGPT?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"].get("intent_type") == "identity"
        assert data["intent"].get("is_identity_query") is True
        print(f"✓ 'How are you different from ChatGPT?' classified as identity query")

    def test_are_you_a_chatbot_identity_query(self):
        """POST /api/echoai3/think with 'Are you a chatbot?' - identity query"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Are you a chatbot?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["intent"].get("intent_type") == "identity"
        assert data["intent"].get("is_identity_query") is True
        print(f"✓ 'Are you a chatbot?' classified as identity query")

    def test_normal_finance_query_not_identity(self):
        """POST /api/echoai3/think with normal finance query should NOT trigger identity"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What is our current EBITDA margin?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should be finance domain, NOT identity
        assert data["intent"].get("primary_domain") == "finance", f"Expected finance domain, got {data['intent'].get('primary_domain')}"
        assert data["intent"].get("intent_type") != "identity", "Finance query should NOT be identity type"
        assert data["intent"].get("is_identity_query") is not True, "Finance query should not have is_identity_query=True"
        print(f"✓ Finance query correctly classified as finance domain, not identity")

    def test_identity_response_mentions_echo_luccca(self):
        """Identity response should mention Echo, operational intelligence, LUCCCA in natural speech"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Tell me about yourself", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        
        response_text = data.get("response", "").lower()
        # Check for key identity terms (at least one should be present)
        identity_terms = ["echo", "operational", "intelligence", "luccca", "hospitality"]
        found_terms = [term for term in identity_terms if term in response_text]
        assert len(found_terms) >= 1, f"Response should mention identity terms. Found: {found_terms}"
        print(f"✓ Identity response mentions: {found_terms}")


class TestEchoAi3Heartbeat:
    """Test Real-Time Operational Heartbeat endpoint"""

    def test_heartbeat_returns_pulse_status(self):
        """GET /api/echoai3/heartbeat returns pulse status"""
        response = requests.get(f"{BASE_URL}/api/echoai3/heartbeat", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        # Verify pulse status
        assert "pulse" in data
        assert data["pulse"] in ["nominal", "attention", "elevated"], f"Invalid pulse: {data['pulse']}"
        print(f"✓ Heartbeat pulse status: {data['pulse']}")

    def test_heartbeat_returns_vitals(self):
        """GET /api/echoai3/heartbeat returns all vital signs"""
        response = requests.get(f"{BASE_URL}/api/echoai3/heartbeat", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        # Verify vitals object exists
        assert "vitals" in data
        vitals = data["vitals"]
        
        # Check all required vital signs
        required_vitals = [
            "food_cost_pct", "labor_pct", "ebitda_margin_pct",
            "revenue", "total_covers", "inventory_health", "items_below_par"
        ]
        for vital in required_vitals:
            assert vital in vitals, f"Missing vital: {vital}"
        
        print(f"✓ Heartbeat vitals: food_cost={vitals['food_cost_pct']}%, labor={vitals['labor_pct']}%, ebitda={vitals['ebitda_margin_pct']}%")
        print(f"  revenue=${vitals['revenue']}, covers={vitals['total_covers']}, inv_health={vitals['inventory_health']}%, below_par={vitals['items_below_par']}")

    def test_heartbeat_returns_signals_array(self):
        """GET /api/echoai3/heartbeat returns signals array"""
        response = requests.get(f"{BASE_URL}/api/echoai3/heartbeat", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        # Verify signals array exists
        assert "signals" in data
        assert isinstance(data["signals"], list)
        
        # If signals exist, verify structure
        if data["signals"]:
            signal = data["signals"][0]
            assert "signal" in signal
            assert "severity" in signal
            print(f"✓ Heartbeat signals: {len(data['signals'])} alerts - {[s['signal'] for s in data['signals']]}")
        else:
            print(f"✓ Heartbeat signals: No alerts (nominal)")

    def test_heartbeat_returns_timestamp(self):
        """GET /api/echoai3/heartbeat returns timestamp"""
        response = requests.get(f"{BASE_URL}/api/echoai3/heartbeat", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        assert "timestamp" in data
        assert "outlet_count" in data
        assert "active_events" in data
        print(f"✓ Heartbeat metadata: {data['outlet_count']} outlets, {data['active_events']} active events")


class TestEchoAi3IdentityEndpoint:
    """Test GET /api/echoai3/identity endpoint"""

    def test_identity_returns_self_model(self):
        """GET /api/echoai3/identity returns self_model with required fields"""
        response = requests.get(f"{BASE_URL}/api/echoai3/identity", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        # Verify self_model exists
        assert "self_model" in data
        model = data["self_model"]
        
        # Check required identity fields
        assert "anchor_statement" in model, "Missing anchor_statement"
        assert "primary_functions" in model, "Missing primary_functions"
        assert "tone" in model, "Missing tone"
        assert "boundaries" in model, "Missing boundaries"
        
        # Verify anchor statement mentions Echo
        assert "echo" in model["anchor_statement"].lower()
        
        print(f"✓ Identity self_model has anchor_statement, primary_functions ({len(model['primary_functions'])} functions), tone, boundaries")

    def test_identity_returns_role_descriptions(self):
        """GET /api/echoai3/identity returns role_descriptions"""
        response = requests.get(f"{BASE_URL}/api/echoai3/identity", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        assert "role_descriptions" in data
        roles = data["role_descriptions"]
        
        # Check some expected roles
        expected_roles = ["exec_chef", "controller", "gm", "owner", "manager"]
        for role in expected_roles:
            assert role in roles, f"Missing role description: {role}"
        
        print(f"✓ Identity role_descriptions: {list(roles.keys())}")


class TestEchoAi3Health:
    """Test GET /api/echoai3/health endpoint"""

    def test_health_returns_operational_with_9_domains(self):
        """GET /api/echoai3/health returns operational status with 9 domains"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("status") == "operational"
        assert "domains" in data
        assert len(data["domains"]) == 9, f"Expected 9 domains, got {len(data['domains'])}"
        
        expected_domains = ["finance", "events", "inventory", "labor", "culinary", "vendor", "guest", "beverage", "operations"]
        for domain in expected_domains:
            assert domain in data["domains"], f"Missing domain: {domain}"
        
        print(f"✓ Health status: operational with {len(data['domains'])} domains: {data['domains']}")

    def test_health_returns_llm_key_configured(self):
        """GET /api/echoai3/health returns llm_key_configured"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        assert "llm_key_configured" in data
        assert data["llm_key_configured"] is True
        print(f"✓ Health: llm_key_configured={data['llm_key_configured']}")


class TestEchoAi3VoiceTranscribe:
    """Test POST /api/echoai3/voice/transcribe endpoint"""

    def test_voice_transcribe_returns_422_without_file(self):
        """POST /api/echoai3/voice/transcribe returns 422 when called without file"""
        response = requests.post(f"{BASE_URL}/api/echoai3/voice/transcribe", timeout=10)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"✓ Voice transcribe returns 422 without file (endpoint exists)")


class TestEchoAi3Sessions:
    """Test sessions endpoint includes identity queries"""

    def test_sessions_list_includes_identity_queries(self):
        """GET /api/echoai3/sessions lists sessions including identity queries"""
        # First create an identity query session
        think_response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What is your purpose?", "user_id": "owner-001"},
            timeout=30
        )
        assert think_response.status_code == 200
        session_id = think_response.json().get("session_id")
        
        # Now list sessions
        response = requests.get(f"{BASE_URL}/api/echoai3/sessions?user_id=owner-001", timeout=10)
        assert response.status_code == 200
        data = response.json()
        
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
        
        # Find our session
        found = any(s.get("session_id") == session_id for s in data["sessions"])
        assert found, "Identity query session should appear in sessions list"
        print(f"✓ Sessions list includes identity query sessions")


class TestEchoAi3AdditionalIdentityTriggers:
    """Test additional identity trigger phrases"""

    def test_what_are_you_identity_query(self):
        """'What are you?' should trigger identity"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What are you?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"].get("is_identity_query") is True
        print(f"✓ 'What are you?' triggers identity")

    def test_why_should_i_trust_you_identity_query(self):
        """'Why should I trust you?' should trigger identity"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Why should I trust you?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"].get("is_identity_query") is True
        print(f"✓ 'Why should I trust you?' triggers identity")

    def test_how_do_you_work_identity_query(self):
        """'How do you work?' should trigger identity"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "How do you work?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"].get("is_identity_query") is True
        print(f"✓ 'How do you work?' triggers identity")

    def test_are_you_ai_identity_query(self):
        """'Are you AI?' should trigger identity"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Are you AI?", "user_id": "owner-001"},
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"].get("is_identity_query") is True
        print(f"✓ 'Are you AI?' triggers identity")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
