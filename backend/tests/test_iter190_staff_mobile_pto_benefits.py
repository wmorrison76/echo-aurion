"""
iter190 · Staff Mobile + PTO + Benefits + Delivery Preference Tests

Tests:
- GET/POST /api/daily-briefing/preference (per-staff delivery preference)
- GET /api/staff-mobile/me (role-gated staff info + capabilities)
- POST /api/pto/request (create PTO request)
- GET /api/pto/mine (list own PTO requests)
- POST /api/pto/cancel/{id} (cancel own request)
- POST /api/pto/decide (admin approve/reject)
- GET /api/pto/pending (admin list pending)
- GET /api/benefits/mine (benefits catalog)
- Regression: /api/standup/send mobile_push stats, flush-queue
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def fresh_briefing_token(api_client):
    """Mint a fresh briefing token for testing"""
    r = api_client.post(
        f"{BASE_URL}/api/daily-briefing/mint",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        json={
            "staff_name": "TEST_iter190_Staff",
            "staff_role": "Test Role",
            "staff_email": "test_iter190@luccca.test",
            "staff_phone": "+15551234567",
            "ttl_days": 1
        }
    )
    assert r.status_code == 200, f"Failed to mint token: {r.text}"
    data = r.json()
    assert data.get("ok") is True
    return data["token"]


@pytest.fixture(scope="module")
def existing_token_william_reed():
    """Existing token from iter189 smoke: William Reed, pref=off"""
    return "rEn3QrMhxnOnqBJIMCDGPT0-"


@pytest.fixture(scope="module")
def existing_token_priya_patel():
    """Existing token from iter190 smoke: Priya Patel, role=general default"""
    return "Dd042vpMWUMv5uvwV_DBusVp"


# ─── Delivery Preference Tests ────────────────────────────────────────────────
class TestDeliveryPreference:
    """Tests for GET/POST /api/daily-briefing/preference"""

    def test_get_preference_returns_default_both(self, api_client, fresh_briefing_token):
        """New token should default to 'both' preference"""
        r = api_client.get(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("delivery_preference") == "both"
        assert data.get("options") == ["both", "email", "sms", "off"]
        assert "staff_name" in data
        assert "has_email" in data
        assert "has_phone" in data

    def test_get_preference_returns_correct_fields(self, api_client, fresh_briefing_token):
        """Verify all expected fields are returned"""
        r = api_client.get(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("staff_name") == "TEST_iter190_Staff"
        assert data.get("has_email") is True  # We provided email
        assert data.get("has_phone") is True  # We provided phone

    def test_post_preference_updates_to_email(self, api_client, fresh_briefing_token):
        """Update preference to email-only"""
        r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"delivery_preference": "email"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("delivery_preference") == "email"

    def test_post_preference_updates_to_sms(self, api_client, fresh_briefing_token):
        """Update preference to SMS-only"""
        r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"delivery_preference": "sms"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("delivery_preference") == "sms"

    def test_post_preference_updates_to_off(self, api_client, fresh_briefing_token):
        """Update preference to off"""
        r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"delivery_preference": "off"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("delivery_preference") == "off"

    def test_post_preference_invalid_value_400(self, api_client, fresh_briefing_token):
        """Invalid preference value should return 400"""
        r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"delivery_preference": "invalid_value"}
        )
        assert r.status_code == 400

    def test_get_preference_persists(self, api_client, fresh_briefing_token):
        """Verify preference persists after update"""
        # First set to 'both'
        api_client.post(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"delivery_preference": "both"}
        )
        # Then verify GET returns 'both'
        r = api_client.get(
            f"{BASE_URL}/api/daily-briefing/preference",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        assert r.json().get("delivery_preference") == "both"

    def test_get_preference_requires_token(self, api_client):
        """GET preference without token should return 401"""
        r = api_client.get(f"{BASE_URL}/api/daily-briefing/preference")
        assert r.status_code == 401

    def test_post_preference_requires_token(self, api_client):
        """POST preference without token should return 401"""
        r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/preference",
            json={"delivery_preference": "email"}
        )
        assert r.status_code == 401


# ─── Staff Mobile /me Tests ───────────────────────────────────────────────────
class TestStaffMobileMe:
    """Tests for GET /api/staff-mobile/me"""

    def test_staff_me_returns_staff_and_capabilities(self, api_client, fresh_briefing_token):
        """GET /api/staff-mobile/me should return staff info and capabilities"""
        r = api_client.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "staff" in data
        assert "capabilities" in data
        
        staff = data["staff"]
        assert "id" in staff
        assert "name" in staff
        assert "email" in staff
        assert "role" in staff
        assert "title" in staff

    def test_staff_me_capabilities_structure(self, api_client, fresh_briefing_token):
        """Verify capabilities structure with role flags"""
        r = api_client.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        caps = r.json().get("capabilities", {})
        
        # Check all expected capability flags exist
        expected_flags = [
            "role", "is_general", "is_salary", "is_manager", "is_owner",
            "can_view_dashboard", "can_edit_standup", "can_manage_hiring",
            "can_mint_tokens", "can_approve_pto", "can_view_financials",
            "can_view_coworker_schedule", "can_view_total_hours"
        ]
        for flag in expected_flags:
            assert flag in caps, f"Missing capability flag: {flag}"

    def test_staff_me_unresolved_token_defaults_to_general(self, api_client, existing_token_priya_patel):
        """Unresolved token (no matching employee) should default to role='general'"""
        r = api_client.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": existing_token_priya_patel}
        )
        # May return 401 if token expired/invalid, or 200 with general role
        if r.status_code == 200:
            data = r.json()
            caps = data.get("capabilities", {})
            # For unresolved token, role should be 'general'
            assert caps.get("role") == "general" or caps.get("is_general") is True

    def test_staff_me_requires_token(self, api_client):
        """GET /api/staff-mobile/me without token should return 401"""
        r = api_client.get(f"{BASE_URL}/api/staff-mobile/me")
        assert r.status_code == 401


# ─── PTO Request Tests ────────────────────────────────────────────────────────
class TestPTORequest:
    """Tests for PTO request flow"""

    def test_pto_request_creates_pending(self, api_client, fresh_briefing_token):
        """POST /api/pto/request creates a pending PTO request"""
        start = (date.today() + timedelta(days=7)).isoformat()
        end = (date.today() + timedelta(days=10)).isoformat()
        
        r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={
                "start_date": start,
                "end_date": end,
                "reason": "TEST_iter190 vacation",
                "kind": "vacation"
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "request" in data
        req = data["request"]
        assert req.get("status") == "pending"
        assert req.get("start_date") == start
        assert req.get("end_date") == end
        assert "id" in req

    def test_pto_request_validates_date_format(self, api_client, fresh_briefing_token):
        """Invalid date format should return 400"""
        r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={
                "start_date": "invalid-date",
                "end_date": "2026-01-20"
            }
        )
        assert r.status_code == 400

    def test_pto_request_rejects_end_before_start(self, api_client, fresh_briefing_token):
        """end_date before start_date should return 400"""
        r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={
                "start_date": "2026-01-20",
                "end_date": "2026-01-15"
            }
        )
        assert r.status_code == 400

    def test_pto_request_rejects_over_60_days(self, api_client, fresh_briefing_token):
        """Request > 60 days should return 400"""
        start = date.today().isoformat()
        end = (date.today() + timedelta(days=65)).isoformat()
        
        r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={
                "start_date": start,
                "end_date": end
            }
        )
        assert r.status_code == 400

    def test_pto_request_requires_token(self, api_client):
        """POST /api/pto/request without token should return 401"""
        r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            json={"start_date": "2026-01-20", "end_date": "2026-01-25"}
        )
        assert r.status_code == 401


# ─── PTO Mine Tests ───────────────────────────────────────────────────────────
class TestPTOMine:
    """Tests for GET /api/pto/mine"""

    def test_pto_mine_returns_own_requests(self, api_client, fresh_briefing_token):
        """GET /api/pto/mine returns own requests"""
        # First create a request
        start = (date.today() + timedelta(days=14)).isoformat()
        end = (date.today() + timedelta(days=16)).isoformat()
        api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"start_date": start, "end_date": end, "reason": "TEST_iter190_mine"}
        )
        
        # Then fetch mine
        r = api_client.get(
            f"{BASE_URL}/api/pto/mine",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "requests" in data
        assert "total" in data
        # Should have at least one request
        assert len(data["requests"]) >= 1

    def test_pto_mine_includes_balance(self, api_client, fresh_briefing_token):
        """GET /api/pto/mine should include pto_balance_days field"""
        r = api_client.get(
            f"{BASE_URL}/api/pto/mine",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        # pto_balance_days may be None if no employee record, but field should exist
        assert "pto_balance_days" in data

    def test_pto_mine_requires_token(self, api_client):
        """GET /api/pto/mine without token should return 401"""
        r = api_client.get(f"{BASE_URL}/api/pto/mine")
        assert r.status_code == 401


# ─── PTO Cancel Tests ─────────────────────────────────────────────────────────
class TestPTOCancel:
    """Tests for POST /api/pto/cancel/{id}"""

    def test_pto_cancel_own_pending_request(self, api_client, fresh_briefing_token):
        """Can cancel own pending request"""
        # Create a request
        start = (date.today() + timedelta(days=21)).isoformat()
        end = (date.today() + timedelta(days=22)).isoformat()
        create_r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"start_date": start, "end_date": end, "reason": "TEST_iter190_cancel"}
        )
        assert create_r.status_code == 200
        req_id = create_r.json()["request"]["id"]
        
        # Cancel it
        r = api_client.post(
            f"{BASE_URL}/api/pto/cancel/{req_id}",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("canceled") == req_id

    def test_pto_cancel_already_canceled_400(self, api_client, fresh_briefing_token):
        """Cannot cancel already-canceled request"""
        # Create and cancel a request
        start = (date.today() + timedelta(days=28)).isoformat()
        end = (date.today() + timedelta(days=29)).isoformat()
        create_r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"start_date": start, "end_date": end, "reason": "TEST_iter190_double_cancel"}
        )
        req_id = create_r.json()["request"]["id"]
        
        # First cancel
        api_client.post(
            f"{BASE_URL}/api/pto/cancel/{req_id}",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        
        # Second cancel should fail
        r = api_client.post(
            f"{BASE_URL}/api/pto/cancel/{req_id}",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 400

    def test_pto_cancel_not_found_404(self, api_client, fresh_briefing_token):
        """Cancel non-existent request returns 404"""
        r = api_client.post(
            f"{BASE_URL}/api/pto/cancel/nonexistent-id-12345",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 404


# ─── PTO Admin Tests ──────────────────────────────────────────────────────────
class TestPTOAdmin:
    """Tests for admin PTO endpoints"""

    def test_pto_pending_returns_queue(self, api_client):
        """GET /api/pto/pending returns pending queue"""
        r = api_client.get(
            f"{BASE_URL}/api/pto/pending",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "requests" in data
        assert "total" in data

    def test_pto_pending_requires_admin(self, api_client):
        """GET /api/pto/pending without admin token returns 401"""
        r = api_client.get(f"{BASE_URL}/api/pto/pending")
        assert r.status_code == 401

    def test_pto_decide_approves_pending(self, api_client, fresh_briefing_token):
        """POST /api/pto/decide approves pending request"""
        # Create a pending request
        start = (date.today() + timedelta(days=35)).isoformat()
        end = (date.today() + timedelta(days=36)).isoformat()
        create_r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"start_date": start, "end_date": end, "reason": "TEST_iter190_approve"}
        )
        req_id = create_r.json()["request"]["id"]
        
        # Approve it
        r = api_client.post(
            f"{BASE_URL}/api/pto/decide",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"request_id": req_id, "decision": "approved", "reviewer_note": "Test approval"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("decision") == "approved"

    def test_pto_decide_rejects_pending(self, api_client, fresh_briefing_token):
        """POST /api/pto/decide rejects pending request"""
        # Create a pending request
        start = (date.today() + timedelta(days=42)).isoformat()
        end = (date.today() + timedelta(days=43)).isoformat()
        create_r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"start_date": start, "end_date": end, "reason": "TEST_iter190_reject"}
        )
        req_id = create_r.json()["request"]["id"]
        
        # Reject it
        r = api_client.post(
            f"{BASE_URL}/api/pto/decide",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"request_id": req_id, "decision": "rejected"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("decision") == "rejected"

    def test_pto_decide_non_pending_404(self, api_client, fresh_briefing_token):
        """POST /api/pto/decide on non-pending returns 404"""
        # Create and approve a request first
        start = (date.today() + timedelta(days=49)).isoformat()
        end = (date.today() + timedelta(days=50)).isoformat()
        create_r = api_client.post(
            f"{BASE_URL}/api/pto/request",
            headers={"X-Briefing-Token": fresh_briefing_token},
            json={"start_date": start, "end_date": end, "reason": "TEST_iter190_double_decide"}
        )
        req_id = create_r.json()["request"]["id"]
        
        # First approval
        api_client.post(
            f"{BASE_URL}/api/pto/decide",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"request_id": req_id, "decision": "approved"}
        )
        
        # Second decision should fail (not pending anymore)
        r = api_client.post(
            f"{BASE_URL}/api/pto/decide",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"request_id": req_id, "decision": "rejected"}
        )
        assert r.status_code == 404

    def test_pto_decide_requires_admin(self, api_client):
        """POST /api/pto/decide without admin token returns 401"""
        r = api_client.post(
            f"{BASE_URL}/api/pto/decide",
            json={"request_id": "test", "decision": "approved"}
        )
        assert r.status_code == 401


# ─── Benefits Tests ───────────────────────────────────────────────────────────
class TestBenefits:
    """Tests for GET /api/benefits/mine"""

    def test_benefits_mine_returns_catalog(self, api_client, fresh_briefing_token):
        """GET /api/benefits/mine returns benefits catalog"""
        r = api_client.get(
            f"{BASE_URL}/api/benefits/mine",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "employee" in data
        assert "enrolled" in data
        assert "catalog" in data
        assert "note" in data

    def test_benefits_mine_catalog_has_8_items(self, api_client, fresh_briefing_token):
        """Benefits catalog should have 8 default items"""
        r = api_client.get(
            f"{BASE_URL}/api/benefits/mine",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        catalog = r.json().get("catalog", [])
        assert len(catalog) == 8
        
        # Verify expected slugs
        slugs = [item.get("slug") for item in catalog]
        expected_slugs = ["health", "dental", "vision", "401k", "pto", "meals", "stay", "spa"]
        for slug in expected_slugs:
            assert slug in slugs, f"Missing benefit: {slug}"

    def test_benefits_mine_includes_pto_balance(self, api_client, fresh_briefing_token):
        """GET /api/benefits/mine should include pto_balance_days"""
        r = api_client.get(
            f"{BASE_URL}/api/benefits/mine",
            headers={"X-Briefing-Token": fresh_briefing_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert "pto_balance_days" in data

    def test_benefits_mine_requires_token(self, api_client):
        """GET /api/benefits/mine without token returns 401"""
        r = api_client.get(f"{BASE_URL}/api/benefits/mine")
        assert r.status_code == 401


# ─── Regression Tests ─────────────────────────────────────────────────────────
class TestRegressions:
    """Regression tests for existing functionality"""

    def test_standup_send_returns_mobile_push_stats(self, api_client):
        """POST /api/standup/send should return mobile_push stats"""
        today = date.today().isoformat()
        
        # First publish the board
        api_client.post(
            f"{BASE_URL}/api/standup/publish",
            json={"date": today, "confirmed_by": "test"}
        )
        
        # Then send
        r = api_client.post(
            f"{BASE_URL}/api/standup/send",
            json={"date": today}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "mobile_push" in data
        mp = data["mobile_push"]
        assert "total_tokens" in mp
        assert "delivered" in mp
        assert "queued" in mp
        assert "failed" in mp
        assert "sms_sent" in mp

    def test_flush_queue_returns_ok_false_no_keys(self, api_client):
        """POST /api/daily-briefing/flush-queue returns ok:false when no keys"""
        r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/flush-queue",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200
        data = r.json()
        # Should return ok:false when no Resend/Twilio keys
        assert data.get("ok") is False
        assert "detail" in data

    def test_guest_auto_auth_still_works(self, api_client):
        """Guest auto-auth via POST /api/guest-concierge/authenticate should work"""
        r = api_client.post(
            f"{BASE_URL}/api/guest-concierge/authenticate",
            json={"room": "1208", "last_name": "Reed"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "guest" in data

    def test_briefing_admin_panel_endpoints_work(self, api_client):
        """Daily Briefing Admin panel endpoints should work"""
        # Template endpoint
        r = api_client.get(
            f"{BASE_URL}/api/daily-briefing/template",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
        
        # Tokens list
        r = api_client.get(
            f"{BASE_URL}/api/daily-briefing/tokens",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ─── Capacitor Config Validation ──────────────────────────────────────────────
class TestCapacitorConfig:
    """Verify Capacitor config file is syntactically valid"""

    def test_capacitor_config_exists(self):
        """capacitor.config.ts should exist"""
        import os
        config_path = "/app/capacitor.config.ts"
        assert os.path.exists(config_path), f"Capacitor config not found at {config_path}"

    def test_capacitor_config_is_valid_typescript(self):
        """capacitor.config.ts should be valid TypeScript (basic check)"""
        with open("/app/capacitor.config.ts", "r") as f:
            content = f.read()
        
        # Basic checks for valid TS structure
        assert "import type { CapacitorConfig }" in content
        assert "const config: CapacitorConfig" in content
        assert "export default config" in content
        assert "appId:" in content
        assert "appName:" in content
        assert "webDir:" in content
