"""
iter263 · Admin Console + Chronos Deep-Dive Backend Tests

Tests:
- Admin Console endpoints (pulse, integrations, updates, installers, audit, feature-flags, tech-support)
- Chronos deep-dive graceful degradation (200 even on LLM budget exhaustion)
- Chronos ask with valid/invalid chips
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ═══════════════ Admin Console Endpoints ═══════════════

class TestAdminConsolePulse:
    """GET /api/admin-console/pulse — platform health snapshot"""
    
    def test_pulse_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/admin-console/pulse")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Validate required fields
        assert "uptime_human" in data, "Missing uptime_human"
        assert "active_users_15m" in data, "Missing active_users_15m"
        assert "total_users" in data, "Missing total_users"
        assert "admin_users" in data, "Missing admin_users"
        assert "recent_errors_24h" in data, "Missing recent_errors_24h"
        assert "collections_top" in data, "Missing collections_top"
        assert "panels_loaded_today" in data, "Missing panels_loaded_today"
        assert "version" in data, "Missing version"
        assert "environment" in data, "Missing environment"
        
        # Validate types
        assert isinstance(data["collections_top"], list), "collections_top should be a list"
        assert isinstance(data["active_users_15m"], int), "active_users_15m should be int"


class TestAdminConsoleIntegrations:
    """GET /api/admin-console/integrations — external integration health"""
    
    def test_integrations_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/admin-console/integrations")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Validate structure
        assert "items" in data, "Missing items"
        assert "healthy" in data, "Missing healthy"
        assert "total" in data, "Missing total"
        assert isinstance(data["items"], list), "items should be a list"
        
        # Validate required integrations are present
        integration_ids = [i["id"] for i in data["items"]]
        required_integrations = ["emergent-llm", "mongodb", "firebase-fcm", "twilio", "aws-s3", "email", "stripe"]
        for req_id in required_integrations:
            assert req_id in integration_ids, f"Missing required integration: {req_id}"


class TestAdminConsoleUpdates:
    """GET /api/admin-console/updates — release channel + version info"""
    
    def test_updates_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/admin-console/updates")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Validate required fields
        assert "current_version" in data, "Missing current_version"
        assert "latest_version" in data, "Missing latest_version"
        assert "channel" in data, "Missing channel"
        assert "update_available" in data, "Missing update_available"
        assert "changelog" in data, "Missing changelog"
        assert "rollout" in data, "Missing rollout"
        
        # Validate changelog structure
        assert isinstance(data["changelog"], list), "changelog should be a list"
        if data["changelog"]:
            entry = data["changelog"][0]
            assert "version" in entry, "changelog entry missing version"
            assert "changes" in entry, "changelog entry missing changes"


class TestAdminConsoleUpdateChannel:
    """POST /api/admin-console/updates/channel — switch release channel"""
    
    def test_set_channel_beta(self):
        r = requests.post(
            f"{BASE_URL}/api/admin-console/updates/channel",
            json={"channel": "beta"},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, "Expected ok: true"
        assert data.get("channel") == "beta", "Expected channel: beta"
    
    def test_set_channel_stable(self):
        # Reset to stable
        r = requests.post(
            f"{BASE_URL}/api/admin-console/updates/channel",
            json={"channel": "stable"},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, "Expected ok: true"


class TestAdminConsoleRollout:
    """POST /api/admin-console/updates/rollout — trigger rollout"""
    
    def test_rollout_50_percent(self):
        r = requests.post(
            f"{BASE_URL}/api/admin-console/updates/rollout",
            json={"percent": 50},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, "Expected ok: true"
        assert "rollout" in data, "Missing rollout in response"
        assert data["rollout"]["percent_rolled_out"] == 50, "Expected percent_rolled_out == 50"


class TestAdminConsoleInstallers:
    """GET /api/admin-console/installers — desktop/mobile install artifacts"""
    
    def test_installers_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/admin-console/installers")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Validate structure
        assert "pwa" in data, "Missing pwa"
        assert "desktop" in data, "Missing desktop"
        assert "mobile" in data, "Missing mobile"
        assert "mdm" in data, "Missing mdm"
        
        # Validate desktop has macOS/Windows/Linux
        desktop_os = [d["os"] for d in data["desktop"]]
        assert "macOS" in desktop_os, "Missing macOS installer"
        assert "Windows" in desktop_os, "Missing Windows installer"
        assert "Linux" in desktop_os, "Missing Linux installer"
        
        # Validate mobile has iOS/Android
        mobile_os = [m["os"] for m in data["mobile"]]
        assert "iOS" in mobile_os, "Missing iOS installer"
        assert "Android" in mobile_os, "Missing Android installer"


class TestAdminConsoleAudit:
    """GET /api/admin-console/audit — security/admin events"""
    
    def test_audit_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/admin-console/audit")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "events" in data, "Missing events"
        assert isinstance(data["events"], list), "events should be a list"


class TestAdminConsoleFeatureFlags:
    """GET/PUT /api/admin-console/feature-flags — list and toggle flags"""
    
    def test_feature_flags_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/admin-console/feature-flags")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "flags" in data, "Missing flags"
        assert isinstance(data["flags"], list), "flags should be a list"
        
        # Check chronos.v2 flag exists
        flag_ids = [f["id"] for f in data["flags"]]
        assert "chronos.v2" in flag_ids, "Missing chronos.v2 flag"
    
    def test_toggle_chronos_v2_flag(self):
        # Get current state
        r = requests.get(f"{BASE_URL}/api/admin-console/feature-flags")
        data = r.json()
        chronos_flag = next((f for f in data["flags"] if f["id"] == "chronos.v2"), None)
        assert chronos_flag is not None, "chronos.v2 flag not found"
        
        original_state = chronos_flag["enabled"]
        
        # Toggle to opposite
        r = requests.put(
            f"{BASE_URL}/api/admin-console/feature-flags/chronos.v2",
            json={"enabled": not original_state},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("enabled") == (not original_state), "Flag should be toggled"
        
        # Toggle back
        r = requests.put(
            f"{BASE_URL}/api/admin-console/feature-flags/chronos.v2",
            json={"enabled": original_state},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"


class TestAdminConsoleTechSupport:
    """POST/GET /api/admin-console/tech-support — create and list tickets"""
    
    def test_create_ticket(self):
        r = requests.post(
            f"{BASE_URL}/api/admin-console/tech-support",
            json={
                "subject": "TEST_iter263_ticket",
                "body": "This is a test ticket from iter263 testing",
                "severity": "normal"
            },
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True, "Expected ok: true"
        assert "ticket" in data, "Missing ticket in response"
        assert data["ticket"]["subject"] == "TEST_iter263_ticket", "Subject mismatch"
    
    def test_list_tickets(self):
        r = requests.get(f"{BASE_URL}/api/admin-console/tech-support")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "tickets" in data, "Missing tickets"
        assert isinstance(data["tickets"], list), "tickets should be a list"


# ═══════════════ Chronos Deep-Dive Graceful Degradation ═══════════════

class TestChronosDeepDive:
    """GET /api/chronos/deep-dive — must return 200 even on LLM budget exhaustion"""
    
    def test_deep_dive_returns_200_not_500(self):
        """Critical: deep-dive must never return 500, even when LLM is unavailable"""
        r = requests.get(f"{BASE_URL}/api/chronos/deep-dive")
        assert r.status_code == 200, f"Expected 200 (graceful degradation), got {r.status_code}: {r.text}"
        data = r.json()
        
        # Should have markdown content (either fresh or cached/degraded)
        assert "markdown" in data or "date" in data, "Response should have markdown or date"
        
        # If degraded, should have degraded flag
        if data.get("degraded"):
            assert "reason" in data or "markdown" in data, "Degraded response should explain why or have fallback content"
            print(f"Deep-dive returned degraded response: {data.get('reason', 'no reason given')}")


class TestChronosAsk:
    """POST /api/chronos/ask — chip-based analysis"""
    
    def test_ask_unknown_chip_returns_400(self):
        r = requests.post(
            f"{BASE_URL}/api/chronos/ask",
            json={"chip": "unknown-chip-xyz", "outlet_id": "test-outlet"},
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 400, f"Expected 400 for unknown chip, got {r.status_code}: {r.text}"
    
    def test_ask_valid_chip_returns_200(self):
        """Valid chip should return 200 (degraded allowed if LLM unavailable)"""
        r = requests.post(
            f"{BASE_URL}/api/chronos/ask",
            json={
                "chip": "why-labor-high",
                "outlet_id": "test-outlet",
                "outlet_name": "Test Outlet",
                "kpi_snapshot": {"labor_pct": 35, "covers": 120}
            },
            headers={"Content-Type": "application/json"}
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "response" in data, "Missing response field"
        assert "chip" in data, "Missing chip field"
        assert data["chip"] == "why-labor-high", "Chip mismatch"


# ═══════════════ Server Health ═══════════════

class TestServerHealth:
    """Verify server boots clean with no import errors"""
    
    def test_health_endpoint(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200, f"Health check failed: {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("status") == "healthy", "Server not healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
