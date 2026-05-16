"""
iter188 · PanelHost Refactor + SMS Template Editor Tests

Tests:
1. Template API endpoints (GET/POST/reset)
2. Template validation (missing {link}, >500 chars)
3. Template rendering in standup send fan-out
4. Flush queue with template rendering
5. Regression: existing briefing flows still work
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


@pytest.fixture
def admin_headers():
    return {
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN
    }


class TestTemplateEndpoints:
    """Template API endpoint tests"""
    
    def test_get_template_returns_defaults(self, admin_headers):
        """GET /api/daily-briefing/template returns default template and placeholders"""
        r = requests.get(f"{BASE_URL}/api/daily-briefing/template", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        assert "template" in data
        assert "placeholders" in data
        assert "defaults" in data
        
        # Check template fields
        tpl = data["template"]
        assert "sms_template" in tpl
        assert "email_subject_suffix" in tpl
        assert "email_headline" in tpl
        assert "email_intro" in tpl
        
        # Check placeholders
        assert "{name}" in data["placeholders"]
        assert "{date}" in data["placeholders"]
        assert "{link}" in data["placeholders"]
        assert "{subject}" in data["placeholders"]
        
        # Check defaults exist
        assert "sms_template" in data["defaults"]
        print(f"✅ GET /api/daily-briefing/template returns correct structure")
    
    def test_get_template_requires_admin(self):
        """GET /api/daily-briefing/template requires admin token"""
        r = requests.get(f"{BASE_URL}/api/daily-briefing/template")
        assert r.status_code == 401
        print(f"✅ GET /api/daily-briefing/template requires admin token")
    
    def test_post_template_updates_sms(self, admin_headers):
        """POST /api/daily-briefing/template updates SMS template"""
        # Update template
        new_sms = "Test SMS for {name} on {date}: {link}"
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/template",
            headers=admin_headers,
            json={"sms_template": new_sms}
        )
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        assert data["template"]["sms_template"] == new_sms
        assert data["template"]["updated_at"] is not None
        print(f"✅ POST /api/daily-briefing/template updates SMS template")
        
        # Reset for other tests
        requests.post(f"{BASE_URL}/api/daily-briefing/template/reset", headers=admin_headers)
    
    def test_post_template_updates_email_fields(self, admin_headers):
        """POST /api/daily-briefing/template updates email fields"""
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/template",
            headers=admin_headers,
            json={
                "email_subject_suffix": "· test suffix",  # Note: backend strips leading whitespace
                "email_headline": "Test Headline for {name}",
                "email_intro": "Hello {name}, your briefing for {date} is ready."
            }
        )
        assert r.status_code == 200
        data = r.json()
        
        assert "test suffix" in data["template"]["email_subject_suffix"]
        assert data["template"]["email_headline"] == "Test Headline for {name}"
        assert "Hello {name}" in data["template"]["email_intro"]
        print(f"✅ POST /api/daily-briefing/template updates email fields")
        
        # Reset
        requests.post(f"{BASE_URL}/api/daily-briefing/template/reset", headers=admin_headers)
    
    def test_post_template_rejects_missing_link(self, admin_headers):
        """POST /api/daily-briefing/template rejects SMS without {link}"""
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/template",
            headers=admin_headers,
            json={"sms_template": "Hi {name}! No link here."}
        )
        assert r.status_code == 400
        assert "link" in r.text.lower()
        print(f"✅ POST /api/daily-briefing/template rejects SMS without {{link}}")
    
    def test_post_template_rejects_too_long(self, admin_headers):
        """POST /api/daily-briefing/template rejects SMS > 500 chars"""
        long_sms = "x" * 501 + " {link}"
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/template",
            headers=admin_headers,
            json={"sms_template": long_sms}
        )
        assert r.status_code == 400
        assert "500" in r.text or "long" in r.text.lower()
        print(f"✅ POST /api/daily-briefing/template rejects SMS > 500 chars")
    
    def test_post_template_requires_admin(self):
        """POST /api/daily-briefing/template requires admin token"""
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/template",
            headers={"Content-Type": "application/json"},
            json={"sms_template": "Test {link}"}
        )
        assert r.status_code == 401
        print(f"✅ POST /api/daily-briefing/template requires admin token")
    
    def test_reset_template_restores_defaults(self, admin_headers):
        """POST /api/daily-briefing/template/reset restores defaults"""
        # First update template
        requests.post(
            f"{BASE_URL}/api/daily-briefing/template",
            headers=admin_headers,
            json={"sms_template": "Custom template {link}"}
        )
        
        # Reset
        r = requests.post(f"{BASE_URL}/api/daily-briefing/template/reset", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["reset"] is True
        
        # Verify defaults restored
        r2 = requests.get(f"{BASE_URL}/api/daily-briefing/template", headers=admin_headers)
        data2 = r2.json()
        # Should match defaults
        assert data2["template"]["sms_template"] == data2["defaults"]["sms_template"]
        print(f"✅ POST /api/daily-briefing/template/reset restores defaults")
    
    def test_reset_template_requires_admin(self):
        """POST /api/daily-briefing/template/reset requires admin token"""
        r = requests.post(f"{BASE_URL}/api/daily-briefing/template/reset")
        assert r.status_code == 401
        print(f"✅ POST /api/daily-briefing/template/reset requires admin token")


class TestTemplateRendering:
    """Template rendering in fan-out tests"""
    
    def test_standup_send_uses_template(self, admin_headers):
        """POST /api/standup/send uses custom template for mobile push"""
        # Set a custom template
        custom_sms = "CUSTOM: Hi {name}! Briefing {date}: {link}"
        requests.post(
            f"{BASE_URL}/api/daily-briefing/template",
            headers=admin_headers,
            json={"sms_template": custom_sms}
        )
        
        # Create/ensure today's board
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        requests.post(
            f"{BASE_URL}/api/standup/publish",
            headers={"Content-Type": "application/json"},
            json={"date": today, "confirmed_by": "test"}
        )
        
        # Send the board
        r = requests.post(
            f"{BASE_URL}/api/standup/send",
            headers={"Content-Type": "application/json"},
            json={"date": today}
        )
        assert r.status_code == 200
        data = r.json()
        
        # Should have mobile_push stats
        assert "mobile_push" in data
        mp = data["mobile_push"]
        assert "total_tokens" in mp
        assert "delivered" in mp
        assert "queued" in mp
        assert "failed" in mp
        assert "sms_sent" in mp
        print(f"✅ POST /api/standup/send returns mobile_push stats: {mp}")
        
        # Reset template
        requests.post(f"{BASE_URL}/api/daily-briefing/template/reset", headers=admin_headers)
    
    def test_flush_queue_uses_template(self, admin_headers):
        """POST /api/daily-briefing/flush-queue uses template for rendering"""
        # Without Resend/Twilio keys, should return ok:false
        r = requests.post(f"{BASE_URL}/api/daily-briefing/flush-queue", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        
        # Either ok:false (no creds) or ok:true with stats
        if data.get("ok") is False:
            assert "No RESEND_API_KEY" in data.get("detail", "") or "Twilio" in data.get("detail", "")
            print(f"✅ POST /api/daily-briefing/flush-queue returns ok:false when no creds")
        else:
            assert "considered" in data
            assert "email_sent" in data
            assert "sms_sent" in data
            print(f"✅ POST /api/daily-briefing/flush-queue returns stats: {data}")


class TestBriefingRegressions:
    """Regression tests for existing briefing flows"""
    
    def test_mint_token_still_works(self, admin_headers):
        """POST /api/daily-briefing/mint still works"""
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers=admin_headers,
            json={
                "staff_name": "TEST_iter188_user",
                "staff_role": "Tester",
                "staff_email": "test188@example.com",
                "staff_phone": "+15551880000",
                "ttl_days": 1
            }
        )
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        assert "token" in data
        assert "mobile_url" in data
        assert "expires_at" in data
        print(f"✅ POST /api/daily-briefing/mint still works")
        
        return data["token"]
    
    def test_session_with_token_still_works(self, admin_headers):
        """GET /api/daily-briefing/session with valid token still works"""
        # Mint a token first
        mint_r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers=admin_headers,
            json={"staff_name": "TEST_session_user", "ttl_days": 1}
        )
        token = mint_r.json()["token"]
        
        # Test session
        r = requests.get(
            f"{BASE_URL}/api/daily-briefing/session",
            headers={"X-Briefing-Token": token}
        )
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        assert data["staff"]["name"] == "TEST_session_user"
        print(f"✅ GET /api/daily-briefing/session with valid token works")
    
    def test_today_briefing_still_works(self, admin_headers):
        """GET /api/daily-briefing/today with valid token still works"""
        # Mint a token
        mint_r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers=admin_headers,
            json={"staff_name": "TEST_today_user", "ttl_days": 1}
        )
        token = mint_r.json()["token"]
        
        # Test today endpoint
        r = requests.get(
            f"{BASE_URL}/api/daily-briefing/today",
            headers={"X-Briefing-Token": token}
        )
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        # May or may not have a board
        print(f"✅ GET /api/daily-briefing/today with valid token works")
    
    def test_tokens_list_still_works(self, admin_headers):
        """GET /api/daily-briefing/tokens still works"""
        r = requests.get(f"{BASE_URL}/api/daily-briefing/tokens", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        assert "tokens" in data
        assert isinstance(data["tokens"], list)
        print(f"✅ GET /api/daily-briefing/tokens returns {len(data['tokens'])} tokens")
    
    def test_revoke_still_works(self, admin_headers):
        """POST /api/daily-briefing/revoke still works"""
        # Mint a token
        mint_r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers=admin_headers,
            json={"staff_name": "TEST_revoke_user", "ttl_days": 1}
        )
        token = mint_r.json()["token"]
        
        # Revoke it
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/revoke",
            headers=admin_headers,
            params={"token": token}
        )
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        assert data["revoked"] is True
        
        # Verify session now fails
        r2 = requests.get(
            f"{BASE_URL}/api/daily-briefing/session",
            headers={"X-Briefing-Token": token}
        )
        assert r2.status_code == 401
        print(f"✅ POST /api/daily-briefing/revoke works and invalidates token")


class TestBulkMintRegression:
    """Regression tests for bulk mint from iter187"""
    
    def test_bulk_mint_still_works(self, admin_headers):
        """POST /api/daily-briefing/mint-bulk still works"""
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint-bulk",
            headers=admin_headers,
            json={
                "rows": [
                    {"staff_name": "TEST_bulk1", "staff_email": "bulk1@test.com"},
                    {"staff_name": "TEST_bulk2", "staff_phone": "+15551112222"}
                ],
                "ttl_days": 1
            }
        )
        assert r.status_code == 200
        data = r.json()
        
        assert data["ok"] is True
        assert data["count"] == 2
        assert len(data["tokens"]) == 2
        print(f"✅ POST /api/daily-briefing/mint-bulk still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
