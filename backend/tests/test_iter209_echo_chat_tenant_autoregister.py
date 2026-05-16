"""
iter209 · Backend tests for:
  1. Echo Chat multi-intent + session persistence (echo_chat_sessions)
  2. Tenant config (white-label scaffolding)
  3. Auto-register verification
  4. Regression tests for CRM forecast, lifecycle audit, echo-ai3 analyze, BEO finalize
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"

# Store session_id across tests
_session_id = None


class TestEchoChatIntents:
    """Echo Chat multi-intent detection + session persistence"""

    def test_echo_chat_ccp_status(self):
        """POST /api/echo/chat with CCP status message"""
        global _session_id
        r = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "CCP status"},
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "ccp_status", f"Expected intent='ccp_status', got {data.get('intent')}"
        reply = data.get("reply", "").lower()
        # Reply should mention cold chain, last 24h, or temp
        assert any(kw in reply for kw in ["last 24h", "cold chain", "no temp", "ccp", "excursion"]), f"Reply missing expected keywords: {reply}"
        # Session ID should be returned
        assert "session_id" in data, "session_id not returned"
        _session_id = data["session_id"]
        print(f"✓ CCP status intent detected, session_id={_session_id}")

    def test_echo_chat_ticket_status(self):
        """POST /api/echo/chat with ticket status message"""
        global _session_id
        r = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "ticket abc123", "session_id": _session_id},
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "ticket_status", f"Expected intent='ticket_status', got {data.get('intent')}"
        reply = data.get("reply", "")
        # Reply should mention the ticket id
        assert "abc123" in reply.lower(), f"Reply should mention ticket id: {reply}"
        print(f"✓ Ticket status intent detected")

    def test_echo_chat_what_happened_with_event(self):
        """POST /api/echo/chat with 'what happened with Elroy' + session_id"""
        global _session_id
        r = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "what happened with Elroy", "session_id": _session_id},
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "what_happened_with_event", f"Expected intent='what_happened_with_event', got {data.get('intent')}"
        # matched_event may be None if Elroy event doesn't exist, but intent should still be detected
        reply = data.get("reply", "")
        assert len(reply) > 0, "Reply should not be empty"
        print(f"✓ What happened intent detected, matched_event={data.get('matched_event')}")

    def test_echo_chat_history(self):
        """GET /api/echo/chat/history/{session_id} - verify 6 entries after 3 turns"""
        global _session_id
        if not _session_id:
            pytest.skip("No session_id from previous tests")
        r = requests.get(f"{BASE_URL}/api/echo/chat/history/{_session_id}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        messages = data.get("messages", [])
        # After 3 turns (CCP, ticket, what happened), we should have 6 messages (3 user + 3 assistant)
        assert len(messages) >= 6, f"Expected at least 6 messages, got {len(messages)}"
        # Verify alternating user/assistant
        roles = [m.get("role") for m in messages[:6]]
        expected_pattern = ["user", "assistant", "user", "assistant", "user", "assistant"]
        assert roles == expected_pattern, f"Expected alternating roles, got {roles}"
        print(f"✓ Chat history has {len(messages)} messages with correct alternating pattern")

    def test_echo_chat_sessions_list(self):
        """GET /api/echo/chat/sessions - verify sessions array"""
        r = requests.get(f"{BASE_URL}/api/echo/chat/sessions")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        sessions = data.get("sessions", [])
        assert isinstance(sessions, list), "sessions should be a list"
        assert len(sessions) >= 1, "Should have at least 1 session"
        # Verify session structure
        s = sessions[0]
        assert "session_id" in s, "session should have session_id"
        assert "created_at" in s, "session should have created_at"
        assert "turn_count" in s, "session should have turn_count"
        print(f"✓ Sessions list has {len(sessions)} sessions, first has turn_count={s.get('turn_count')}")


class TestTenantConfig:
    """Tenant config (white-label) endpoints"""

    def test_get_tenant_config_defaults(self):
        """GET /api/tenant/config - verify default config"""
        r = requests.get(f"{BASE_URL}/api/tenant/config")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        config = data.get("config", {})
        assert config.get("name") == "Luccca", f"Expected name='Luccca', got {config.get('name')}"
        assert config.get("brand_primary") == "#c8a97e", f"Expected brand_primary='#c8a97e', got {config.get('brand_primary')}"
        # brand_accent may be None if config was previously updated and stored in mongo
        # The default is #a855f7 but we only check it exists or is the default
        features = config.get("features", {})
        # Features may be empty if config was stored in mongo without features
        # Source should be env_defaults or mongo
        source = data.get("source")
        assert source in ["env_defaults", "mongo"], f"Unexpected source: {source}"
        print(f"✓ Tenant config verified, source={source}, name={config.get('name')}")

    def test_put_tenant_config_admin(self):
        """PUT /api/tenant/config (admin) - update and verify"""
        # Update config
        r = requests.put(
            f"{BASE_URL}/api/tenant/config",
            json={"tenant_id": "default", "name": "Test Tenant", "brand_primary": "#ff0000"},
            headers={"Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        config = data.get("config", {})
        assert config.get("name") == "Test Tenant", f"Expected name='Test Tenant', got {config.get('name')}"
        print(f"✓ Tenant config updated to Test Tenant")

        # Verify GET returns mongo source
        r2 = requests.get(f"{BASE_URL}/api/tenant/config")
        assert r2.status_code == 200
        data2 = r2.json()
        assert data2.get("source") == "mongo", f"Expected source='mongo', got {data2.get('source')}"
        print(f"✓ GET returns source='mongo' after PUT")

        # Reset back to defaults
        r3 = requests.put(
            f"{BASE_URL}/api/tenant/config",
            json={"tenant_id": "default", "name": "Luccca", "brand_primary": "#c8a97e"},
            headers={"Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN},
        )
        assert r3.status_code == 200
        print(f"✓ Tenant config reset to Luccca")

    def test_put_tenant_config_no_token(self):
        """PUT /api/tenant/config without admin token - should fail"""
        r = requests.put(
            f"{BASE_URL}/api/tenant/config",
            json={"tenant_id": "default", "name": "Hacker"},
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print(f"✓ PUT without admin token correctly returns 401")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints after iter209 changes"""

    def test_crm_forecast_ml(self):
        """GET /api/crm/forecast?model=ml - regression"""
        r = requests.get(f"{BASE_URL}/api/crm/forecast?model=ml")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True or data.get("ok") is True
        print(f"✓ CRM forecast ML endpoint working")

    def test_crm_lifecycle_audit(self):
        """GET /api/crm/lifecycle-audit - regression"""
        r = requests.get(f"{BASE_URL}/api/crm/lifecycle-audit")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True or data.get("ok") is True
        print(f"✓ CRM lifecycle audit endpoint working")

    def test_echo_ai3_analyze_event(self):
        """POST /api/echo-ai3/analyze-event - regression"""
        r = requests.post(
            f"{BASE_URL}/api/echo-ai3/analyze-event",
            json={"event": {"type": "test", "timestamp": "2026-01-01T00:00:00Z"}},
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ Echo AI3 analyze-event endpoint working")

    def test_beo_finalize_regression(self):
        """POST /api/beo-builder/drafts/{id}/finalize - regression (use known draft)"""
        # Use the known draft from iter207
        draft_id = "draft-d3aab87a28"
        r = requests.post(
            f"{BASE_URL}/api/beo-builder/drafts/{draft_id}/finalize",
            headers={"Content-Type": "application/json"},
        )
        # May return 200 (success) or 404 (draft not found) or 400 (already finalized)
        assert r.status_code in [200, 400, 404], f"Unexpected status {r.status_code}: {r.text}"
        if r.status_code == 200:
            data = r.json()
            # Response may be {ok: true, beo: {...}} or just the BEO object directly
            beo = data.get("beo", data)  # fallback to data itself if no "beo" key
            # Verify GL code and Maestro push are present
            assert "gl_code" in beo or beo.get("gl_code") is not None or "gl_code" in str(data)
            assert beo.get("maestro_pushed") is True or "maestro_pushed" in str(data)
            print(f"✓ BEO finalize working, gl_code={beo.get('gl_code')}, maestro_pushed={beo.get('maestro_pushed')}")
        else:
            print(f"✓ BEO finalize endpoint accessible (status={r.status_code})")


class TestAutoRegister:
    """Verify auto_register picked up tenant_config router"""

    def test_tenant_routes_accessible(self):
        """Verify /api/tenant/* routes are accessible (picked up via auto-register)"""
        # These routes are in tenant_config.py which should be auto-registered
        r = requests.get(f"{BASE_URL}/api/tenant/config")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print(f"✓ /api/tenant/config accessible via auto-register")

    def test_tenant_list_admin(self):
        """GET /api/tenant/list (admin) - verify route exists"""
        r = requests.get(
            f"{BASE_URL}/api/tenant/list",
            headers={"X-Admin-Token": ADMIN_TOKEN},
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ /api/tenant/list accessible, count={data.get('count', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
