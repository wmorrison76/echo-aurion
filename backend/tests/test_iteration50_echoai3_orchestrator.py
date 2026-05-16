"""
Iteration 50 - EchoAi³ Orchestrator & Canvas Interface Tests
============================================================
Phase 7A: Testing the Synthetic Operational Intelligence Layer

Tests:
- POST /api/echoai3/think - main intelligence endpoint
- Intent classification across 9 domains (finance, events, inventory, labor, culinary, vendor, guest, beverage, operations)
- Intent type detection (answer, simulate, recommend, forecast, compare, alert, explain, quantify)
- Session management (create, list, get, delete)
- Feedback submission
- TraceLedger audit trail
- Health check endpoint
- Scheduler status (still running after code changes)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestEchoAi3Health:
    """Health check and system status tests"""
    
    def test_echoai3_health_endpoint(self):
        """Test /api/echoai3/health returns operational status with 9 domains"""
        response = requests.get(f"{BASE_URL}/api/echoai3/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "operational"
        assert "domains" in data
        assert len(data["domains"]) == 9, f"Expected 9 domains, got {len(data['domains'])}"
        
        # Verify all 9 domains present
        expected_domains = ["finance", "events", "inventory", "labor", "culinary", "vendor", "guest", "beverage", "operations"]
        for domain in expected_domains:
            assert domain in data["domains"], f"Missing domain: {domain}"
        
        # Verify TraceLedger active
        assert data["trace_ledger"] == "Active — hash-chained audit trail"
        assert data["llm_key_configured"] == True
        print(f"Health check passed: {data['status']}, {len(data['domains'])} domains, TraceLedger: {data['trace_ledger']}")
    
    def test_scheduler_still_running(self):
        """Test /api/echo-stratus/scheduler/status - scheduler still running after code changes"""
        response = requests.get(f"{BASE_URL}/api/echo-stratus/scheduler/status")
        assert response.status_code == 200, f"Scheduler status failed: {response.text}"
        
        data = response.json()
        assert data["running"] == True, "Scheduler should be running"
        assert "monthly_pnl_review" in str(data.get("jobs", [])), "Monthly P&L review job should be scheduled"
        print(f"Scheduler running: {data['running']}, jobs: {data.get('jobs', [])}")


class TestEchoAi3Think:
    """Main intelligence endpoint tests"""
    
    def test_think_finance_query(self):
        """Test finance domain classification with GL/budget data sources"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What is our current EBITDA margin and food cost percentage?", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert "message_id" in data
        assert "response" in data
        assert "session_id" in data
        assert "intent" in data
        assert "confidence" in data
        assert "data_sources" in data
        assert "trace_id" in data
        
        # Verify finance domain classification
        assert data["intent"]["primary_domain"] == "finance", f"Expected finance domain, got {data['intent']['primary_domain']}"
        
        # Verify data sources include financial collections
        sources = data["data_sources"]
        assert "gl_entries" in sources or "budgets" in sources or "invoices" in sources, f"Expected financial data sources, got {sources}"
        
        print(f"Finance query: domain={data['intent']['primary_domain']}, confidence={data['confidence']}, sources={sources}")
        return data["session_id"]
    
    def test_think_events_query(self):
        """Test events domain classification"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Show me upcoming banquet events and their guest counts", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert data["intent"]["primary_domain"] == "events", f"Expected events domain, got {data['intent']['primary_domain']}"
        
        # Verify events data sources
        sources = data["data_sources"]
        assert "events" in sources or "beos" in sources or "calendar_events" in sources, f"Expected events data sources, got {sources}"
        
        print(f"Events query: domain={data['intent']['primary_domain']}, sources={sources}")
    
    def test_think_inventory_query(self):
        """Test inventory domain classification"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Which inventory items are below par level and need reordering?", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert data["intent"]["primary_domain"] == "inventory", f"Expected inventory domain, got {data['intent']['primary_domain']}"
        
        sources = data["data_sources"]
        assert "ingredients" in sources or "waste_tracking" in sources, f"Expected inventory data sources, got {sources}"
        
        print(f"Inventory query: domain={data['intent']['primary_domain']}, sources={sources}")
    
    def test_think_simulate_intent(self):
        """Test simulate intent detection (what if...)"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What if we add 200 covers to Saturday's banquet? What's the impact on labor and inventory?", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert data["intent"]["intent_type"] == "simulate", f"Expected simulate intent, got {data['intent']['intent_type']}"
        
        print(f"Simulate intent: type={data['intent']['intent_type']}, domain={data['intent']['primary_domain']}")
    
    def test_think_recommend_intent(self):
        """Test recommend intent detection"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What should I do to optimize our labor costs this month?", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert data["intent"]["intent_type"] == "recommend", f"Expected recommend intent, got {data['intent']['intent_type']}"
        
        print(f"Recommend intent: type={data['intent']['intent_type']}, domain={data['intent']['primary_domain']}")
    
    def test_think_labor_domain(self):
        """Test labor domain classification"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Show me the staffing schedule and overtime hours for this week", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert data["intent"]["primary_domain"] == "labor", f"Expected labor domain, got {data['intent']['primary_domain']}"
        
        print(f"Labor query: domain={data['intent']['primary_domain']}")
    
    def test_think_culinary_domain(self):
        """Test culinary domain classification"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What recipes use chicken breast and what's the prep time?", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert data["intent"]["primary_domain"] == "culinary", f"Expected culinary domain, got {data['intent']['primary_domain']}"
        
        print(f"Culinary query: domain={data['intent']['primary_domain']}")
    
    def test_think_vendor_domain(self):
        """Test vendor domain classification"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What's our contract pricing with Sysco and when is the next delivery?", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        assert data["intent"]["primary_domain"] == "vendor", f"Expected vendor domain, got {data['intent']['primary_domain']}"
        
        print(f"Vendor query: domain={data['intent']['primary_domain']}")
    
    def test_think_response_structure(self):
        """Test complete response structure from /think endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Give me a quick operational overview", "user_id": "owner-001"}
        )
        assert response.status_code == 200, f"Think failed: {response.text}"
        
        data = response.json()
        
        # Verify all required fields
        required_fields = ["message_id", "response", "session_id", "intent", "confidence", 
                          "data_completeness", "data_sources", "rules_triggered", "trace_id", 
                          "user", "timestamp"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify intent structure
        intent = data["intent"]
        assert "primary_domain" in intent
        assert "secondary_domains" in intent
        assert "intent_type" in intent
        assert "domain_scores" in intent
        assert "confidence" in intent
        
        # Verify user info
        assert "name" in data["user"]
        assert "role" in data["user"]
        
        print(f"Response structure valid: {len(required_fields)} fields present")


class TestEchoAi3Sessions:
    """Session management tests"""
    
    def test_create_session_via_think(self):
        """Test session creation via /think endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "TEST_SESSION: What's our revenue today?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        
        data = response.json()
        session_id = data["session_id"]
        assert session_id is not None
        assert session_id.startswith("session-")
        
        print(f"Created session: {session_id}")
        return session_id
    
    def test_list_sessions(self):
        """Test GET /api/echoai3/sessions"""
        response = requests.get(f"{BASE_URL}/api/echoai3/sessions?user_id=owner-001")
        assert response.status_code == 200, f"List sessions failed: {response.text}"
        
        data = response.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)
        
        if len(data["sessions"]) > 0:
            session = data["sessions"][0]
            assert "session_id" in session
            assert "preview" in session
            assert "turn_count" in session
            
        print(f"Listed {len(data['sessions'])} sessions")
        return data["sessions"]
    
    def test_get_session_by_id(self):
        """Test GET /api/echoai3/session/{session_id}"""
        # First create a session
        create_resp = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "TEST_GET_SESSION: Hello EchoAi3", "user_id": "owner-001"}
        )
        session_id = create_resp.json()["session_id"]
        
        # Get the session
        response = requests.get(f"{BASE_URL}/api/echoai3/session/{session_id}")
        assert response.status_code == 200, f"Get session failed: {response.text}"
        
        data = response.json()
        assert data["session_id"] == session_id
        assert "messages" in data
        assert len(data["messages"]) >= 2  # At least user + assistant message
        
        print(f"Got session {session_id} with {len(data['messages'])} messages")
    
    def test_session_continuity(self):
        """Test that session maintains conversation history"""
        # Create session with first message
        resp1 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "TEST_CONTINUITY: What's our food cost?", "user_id": "owner-001"}
        )
        session_id = resp1.json()["session_id"]
        
        # Send follow-up in same session
        resp2 = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "And what about labor cost?", "session_id": session_id, "user_id": "owner-001"}
        )
        assert resp2.json()["session_id"] == session_id
        
        # Verify session has both exchanges
        session_resp = requests.get(f"{BASE_URL}/api/echoai3/session/{session_id}")
        messages = session_resp.json()["messages"]
        assert len(messages) >= 4, f"Expected at least 4 messages, got {len(messages)}"
        
        print(f"Session continuity verified: {len(messages)} messages in session")
    
    def test_delete_session(self):
        """Test DELETE /api/echoai3/session/{session_id}"""
        # Create a session
        create_resp = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "TEST_DELETE: Temporary session", "user_id": "owner-001"}
        )
        session_id = create_resp.json()["session_id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/echoai3/session/{session_id}")
        assert response.status_code == 200, f"Delete session failed: {response.text}"
        
        data = response.json()
        assert data["deleted"] == True
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/echoai3/session/{session_id}")
        assert "error" in get_resp.json() or get_resp.json().get("messages") is None
        
        print(f"Deleted session {session_id}")


class TestEchoAi3Feedback:
    """Feedback submission tests"""
    
    def test_submit_feedback(self):
        """Test POST /api/echoai3/feedback"""
        # First create a message
        think_resp = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "TEST_FEEDBACK: Quick question", "user_id": "owner-001"}
        )
        message_id = think_resp.json()["message_id"]
        session_id = think_resp.json()["session_id"]
        
        # Submit feedback
        response = requests.post(
            f"{BASE_URL}/api/echoai3/feedback",
            json={"message_id": message_id, "session_id": session_id, "rating": 5, "feedback": "Very helpful!"}
        )
        assert response.status_code == 200, f"Feedback failed: {response.text}"
        
        data = response.json()
        assert data["recorded"] == True
        
        print(f"Feedback recorded for message {message_id}")


class TestEchoAi3TraceLedger:
    """TraceLedger audit trail tests"""
    
    def test_get_decision_trace(self):
        """Test GET /api/echoai3/trace/{message_id}"""
        # First create a decision
        think_resp = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "TEST_TRACE: What's our EBITDA?", "user_id": "owner-001"}
        )
        message_id = think_resp.json()["message_id"]
        
        # Get the trace
        response = requests.get(f"{BASE_URL}/api/echoai3/trace/{message_id}")
        assert response.status_code == 200, f"Get trace failed: {response.text}"
        
        data = response.json()
        assert data["message_id"] == message_id
        assert "trail" in data
        
        # Trail should have at least the decision entry
        if len(data["trail"]) > 0:
            entry = data["trail"][0]
            assert "event_type" in entry or "type" in entry
            
        print(f"Trace retrieved for message {message_id}: {len(data['trail'])} entries")


class TestEchoAi3DomainRules:
    """Domain reasoning rules tests"""
    
    def test_rules_triggered_on_high_food_cost(self):
        """Test that domain rules trigger on relevant queries"""
        # Query about food cost should potentially trigger rules
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Analyze our food cost percentage and any concerns", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Rules may or may not trigger depending on actual data
        assert "rules_triggered" in data
        assert isinstance(data["rules_triggered"], list)
        
        print(f"Rules triggered: {len(data['rules_triggered'])} rules")
        for rule in data["rules_triggered"]:
            print(f"  - {rule.get('rule', 'unknown')}: {rule.get('severity', 'unknown')}")


class TestEchoAi3IntentTypes:
    """Test all intent type classifications"""
    
    def test_forecast_intent(self):
        """Test forecast intent detection"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "What's the revenue projection for next month?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"]["intent_type"] == "forecast", f"Expected forecast, got {data['intent']['intent_type']}"
        print(f"Forecast intent detected")
    
    def test_compare_intent(self):
        """Test compare intent detection"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Compare our food cost vs labor cost this month", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"]["intent_type"] == "compare", f"Expected compare, got {data['intent']['intent_type']}"
        print(f"Compare intent detected")
    
    def test_alert_intent(self):
        """Test alert intent detection"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Are there any critical risks or urgent issues I should know about?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"]["intent_type"] == "alert", f"Expected alert, got {data['intent']['intent_type']}"
        print(f"Alert intent detected")
    
    def test_explain_intent(self):
        """Test explain intent detection"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "Why did our food cost increase last week?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"]["intent_type"] == "explain", f"Expected explain, got {data['intent']['intent_type']}"
        print(f"Explain intent detected")
    
    def test_quantify_intent(self):
        """Test quantify intent detection"""
        response = requests.post(
            f"{BASE_URL}/api/echoai3/think",
            json={"query": "How much revenue did we generate this month?", "user_id": "owner-001"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["intent"]["intent_type"] == "quantify", f"Expected quantify, got {data['intent']['intent_type']}"
        print(f"Quantify intent detected")
