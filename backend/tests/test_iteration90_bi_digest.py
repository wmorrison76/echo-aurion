"""
Iteration 90: Weekly BI Email Digest Tests
==========================================
Tests for the 5 new digest endpoints + regression for original 7 Enterprise BI endpoints.
- GET /api/enterprise-bi/digest/preview - returns data snapshot and HTML email content
- GET /api/enterprise-bi/digest/settings - returns recipients, schedule_day, schedule_hour, enabled
- PUT /api/enterprise-bi/digest/settings - updates recipients list, schedule, enabled flag
- POST /api/enterprise-bi/digest/send - sends digest to configured recipients
- GET /api/enterprise-bi/digest/history - returns past digest sends
- Regression: STR, P&L, Portfolio, PMS endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ═══════════════════════════════════════════════════════════════
# DIGEST ENDPOINTS (NEW)
# ═══════════════════════════════════════════════════════════════

class TestDigestPreview:
    """GET /api/enterprise-bi/digest/preview - returns data snapshot and HTML email"""
    
    def test_preview_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/preview")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /digest/preview returns 200")
    
    def test_preview_has_data_snapshot(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/preview")
        data = response.json()
        assert "data" in data, "Response missing 'data' field"
        snapshot = data["data"]
        # Verify key metrics in snapshot
        assert "occupancy" in snapshot, "Snapshot missing occupancy"
        assert "adr" in snapshot, "Snapshot missing ADR"
        assert "revpar" in snapshot, "Snapshot missing RevPAR"
        assert "mpi" in snapshot, "Snapshot missing MPI"
        assert "ari" in snapshot, "Snapshot missing ARI"
        assert "rgi" in snapshot, "Snapshot missing RGI"
        assert "total_revenue" in snapshot, "Snapshot missing total_revenue"
        assert "gop" in snapshot, "Snapshot missing GOP"
        assert "gop_margin" in snapshot, "Snapshot missing gop_margin"
        assert "otb_next_7d" in snapshot, "Snapshot missing otb_next_7d"
        assert "market_position" in snapshot, "Snapshot missing market_position"
        print(f"✓ Preview data snapshot has all required fields: occ={snapshot['occupancy']}%, RGI={snapshot['rgi']}")
    
    def test_preview_has_html_content(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/preview")
        data = response.json()
        assert "html" in data, "Response missing 'html' field"
        html = data["html"]
        assert len(html) > 500, "HTML content too short"
        assert "Weekly BI Digest" in html, "HTML missing title"
        assert "STR Index Scores" in html, "HTML missing STR section"
        assert "MPI" in html and "ARI" in html and "RGI" in html, "HTML missing index labels"
        assert "P&amp;L Snapshot" in html or "P&L Snapshot" in html, "HTML missing P&L section"
        print(f"✓ Preview HTML content is valid ({len(html)} chars)")


class TestDigestSettings:
    """GET/PUT /api/enterprise-bi/digest/settings - manage recipients and schedule"""
    
    def test_get_settings_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /digest/settings returns 200")
    
    def test_get_settings_has_required_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings")
        data = response.json()
        assert "recipients" in data, "Settings missing recipients"
        assert "schedule_day" in data, "Settings missing schedule_day"
        assert "schedule_hour" in data, "Settings missing schedule_hour"
        assert "enabled" in data, "Settings missing enabled"
        assert isinstance(data["recipients"], list), "recipients should be a list"
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
        print(f"✓ Settings has all fields: {len(data['recipients'])} recipients, enabled={data['enabled']}")
    
    def test_update_settings_add_recipient(self, api_client):
        # Get current settings
        current = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings").json()
        test_email = "test_iter90@example.com"
        
        # Add test recipient
        updated = {
            "recipients": current.get("recipients", []) + [test_email],
            "schedule_day": current.get("schedule_day", "monday"),
            "schedule_hour": current.get("schedule_hour", 7),
            "enabled": current.get("enabled", True)
        }
        response = api_client.put(f"{BASE_URL}/api/enterprise-bi/digest/settings", json=updated)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        result = response.json()
        assert result.get("status") == "updated", "Expected status 'updated'"
        
        # Verify persistence
        verify = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings").json()
        assert test_email in verify["recipients"], "Test email not persisted"
        print(f"✓ PUT /digest/settings adds recipient: {test_email}")
        
        # Cleanup - remove test email
        cleanup = {
            "recipients": [e for e in verify["recipients"] if e != test_email],
            "schedule_day": verify["schedule_day"],
            "schedule_hour": verify["schedule_hour"],
            "enabled": verify["enabled"]
        }
        api_client.put(f"{BASE_URL}/api/enterprise-bi/digest/settings", json=cleanup)
    
    def test_update_settings_toggle_enabled(self, api_client):
        # Get current settings
        current = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings").json()
        original_enabled = current.get("enabled", True)
        
        # Toggle enabled
        updated = {
            "recipients": current.get("recipients", []),
            "schedule_day": current.get("schedule_day", "monday"),
            "schedule_hour": current.get("schedule_hour", 7),
            "enabled": not original_enabled
        }
        response = api_client.put(f"{BASE_URL}/api/enterprise-bi/digest/settings", json=updated)
        assert response.status_code == 200
        
        # Verify toggle
        verify = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings").json()
        assert verify["enabled"] == (not original_enabled), "Toggle not persisted"
        print(f"✓ Toggle enabled: {original_enabled} -> {not original_enabled}")
        
        # Restore original
        restore = {**updated, "enabled": original_enabled}
        api_client.put(f"{BASE_URL}/api/enterprise-bi/digest/settings", json=restore)


class TestDigestSend:
    """POST /api/enterprise-bi/digest/send - manually trigger digest email"""
    
    def test_send_with_recipients_returns_sent(self, api_client):
        # Ensure we have recipients
        current = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings").json()
        if not current.get("recipients"):
            # Add a test recipient
            updated = {
                "recipients": ["test_send@example.com"],
                "schedule_day": "monday",
                "schedule_hour": 7,
                "enabled": True
            }
            api_client.put(f"{BASE_URL}/api/enterprise-bi/digest/settings", json=updated)
        
        response = api_client.post(f"{BASE_URL}/api/enterprise-bi/digest/send")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "sent", f"Expected status 'sent', got {data.get('status')}"
        assert "digest" in data, "Response missing digest record"
        digest = data["digest"]
        assert "id" in digest, "Digest missing id"
        assert "sent_at" in digest, "Digest missing sent_at"
        assert "recipients" in digest, "Digest missing recipients"
        assert "data_snapshot" in digest, "Digest missing data_snapshot"
        assert digest.get("trigger") == "manual", "Trigger should be 'manual'"
        print(f"✓ POST /digest/send returns 'sent' with digest id={digest['id']}")
    
    def test_send_without_recipients_returns_skipped(self, api_client):
        # Save current settings
        current = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/settings").json()
        
        # Clear recipients
        empty = {
            "recipients": [],
            "schedule_day": "monday",
            "schedule_hour": 7,
            "enabled": True
        }
        api_client.put(f"{BASE_URL}/api/enterprise-bi/digest/settings", json=empty)
        
        # Try to send
        response = api_client.post(f"{BASE_URL}/api/enterprise-bi/digest/send")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "skipped", f"Expected 'skipped', got {data.get('status')}"
        assert "reason" in data, "Skipped response should have reason"
        print(f"✓ POST /digest/send with no recipients returns 'skipped': {data.get('reason')}")
        
        # Restore settings
        api_client.put(f"{BASE_URL}/api/enterprise-bi/digest/settings", json=current)


class TestDigestHistory:
    """GET /api/enterprise-bi/digest/history - view past digest sends"""
    
    def test_history_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /digest/history returns 200")
    
    def test_history_has_required_structure(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/history")
        data = response.json()
        assert "total" in data, "History missing total count"
        assert "history" in data, "History missing history array"
        assert isinstance(data["history"], list), "history should be a list"
        print(f"✓ History structure valid: {data['total']} total digests")
    
    def test_history_entries_have_required_fields(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/history")
        data = response.json()
        if data["history"]:
            entry = data["history"][0]
            assert "id" in entry, "Entry missing id"
            assert "sent_at" in entry, "Entry missing sent_at"
            assert "recipients" in entry, "Entry missing recipients"
            assert "data_snapshot" in entry, "Entry missing data_snapshot"
            assert "trigger" in entry, "Entry missing trigger"
            assert entry["trigger"] in ["manual", "scheduled"], f"Invalid trigger: {entry['trigger']}"
            print(f"✓ History entry valid: id={entry['id']}, trigger={entry['trigger']}")
        else:
            print("✓ History is empty (no digests sent yet)")
    
    def test_history_limit_parameter(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/digest/history?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["history"]) <= 5, "Limit parameter not respected"
        print(f"✓ History limit=5 returns {len(data['history'])} entries")


# ═══════════════════════════════════════════════════════════════
# REGRESSION: ORIGINAL 7 ENTERPRISE BI ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class TestRegressionSTR:
    """Regression: GET /api/enterprise-bi/str/dashboard"""
    
    def test_str_dashboard_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/str/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "indices" in data
        assert "comp_set" in data
        assert "trend_12m" in data
        print("✓ REGRESSION: STR dashboard working")


class TestRegressionPnL:
    """Regression: GET /api/enterprise-bi/pnl/waterfall"""
    
    def test_pnl_waterfall_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/pnl/waterfall")
        assert response.status_code == 200
        data = response.json()
        assert "waterfall" in data
        assert "summary" in data
        print("✓ REGRESSION: P&L waterfall working")


class TestRegressionPortfolio:
    """Regression: GET /api/enterprise-bi/portfolio/dashboard"""
    
    def test_portfolio_dashboard_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/portfolio/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "properties" in data
        assert "portfolio_summary" in data
        print("✓ REGRESSION: Portfolio dashboard working")


class TestRegressionPMS:
    """Regression: PMS endpoints (arrivals, departures, otb-pace, guest-mix)"""
    
    def test_pms_arrivals_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/pms/arrivals")
        assert response.status_code == 200
        data = response.json()
        assert "arrivals" in data
        print("✓ REGRESSION: PMS arrivals working")
    
    def test_pms_departures_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/pms/departures")
        assert response.status_code == 200
        data = response.json()
        assert "departures" in data
        print("✓ REGRESSION: PMS departures working")
    
    def test_pms_otb_pace_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/pms/otb-pace")
        assert response.status_code == 200
        data = response.json()
        assert "pace" in data
        print("✓ REGRESSION: PMS OTB pace working")
    
    def test_pms_guest_mix_returns_200(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/enterprise-bi/pms/guest-mix")
        assert response.status_code == 200
        data = response.json()
        assert "by_source" in data
        print("✓ REGRESSION: PMS guest mix working")


# ═══════════════════════════════════════════════════════════════
# EMAIL DEMO LOG VERIFICATION
# ═══════════════════════════════════════════════════════════════

class TestEmailDemoLog:
    """Verify emails are demo-logged to DB when no SendGrid key"""
    
    def test_email_log_shows_bi_digest_category(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/email/log?category=bi_digest")
        assert response.status_code == 200
        data = response.json()
        assert "emails" in data
        assert "stats" in data
        # Check if sendgrid is configured
        if not data.get("sendgrid_configured"):
            print("✓ SendGrid NOT configured - emails demo-logged to DB")
        else:
            print("✓ SendGrid IS configured - emails sent via SendGrid")
        print(f"✓ Email log has {len(data['emails'])} bi_digest entries")
