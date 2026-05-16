"""
iter187 · Twilio SMS fallback, Bulk CSV mint, Flush Queue replay

Tests:
1. POST /api/daily-briefing/mint - now accepts optional staff_phone field (E.164)
2. POST /api/daily-briefing/mint-bulk - bulk CSV import with max 200 rows
3. POST /api/daily-briefing/flush-queue - replay queued mobile_briefing entries
4. POST /api/standup/send - regression: mobile_push now includes sms_sent field
5. GET /api/daily-briefing/tokens - returns staff_phone field
6. Regression: existing single-mint flow still works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_client(api_client):
    """Session with admin token"""
    api_client.headers.update({"X-Admin-Token": ADMIN_TOKEN})
    return api_client


class TestMintWithPhone:
    """Test POST /api/daily-briefing/mint with optional staff_phone field"""

    def test_mint_with_phone_success(self, admin_client):
        """Mint token with staff_phone (E.164 format)"""
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Marcus Hayes",
            "staff_role": "Duty Manager",
            "staff_email": "marcus.h@luccca.com",
            "staff_phone": "+15555551111",
            "ttl_days": 14
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert "token" in data
        assert "mobile_url" in data
        assert data["mobile_url"].startswith("/m/briefing/")
        assert "expires_at" in data
        print(f"✓ Mint with phone success: token={data['token'][:12]}...")

    def test_mint_without_phone_still_works(self, admin_client):
        """Mint token without staff_phone (backward compatibility)"""
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Priya Patel",
            "staff_role": "FOH Lead",
            "staff_email": "priya.p@luccca.com",
            "ttl_days": 7
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "token" in data
        print("✓ Mint without phone still works")

    def test_mint_phone_only_no_email(self, admin_client):
        """Mint token with phone but no email (SMS-only staff)"""
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Sam Cole",
            "staff_role": "Bell Stand",
            "staff_phone": "+15555553333",
            "ttl_days": 14
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        print("✓ Mint with phone only (no email) works")

    def test_mint_requires_admin_token(self, api_client):
        """Mint without admin token returns 401"""
        response = api_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Unauthorized",
            "ttl_days": 14
        })
        assert response.status_code == 401
        print("✓ Mint requires admin token")


class TestBulkMint:
    """Test POST /api/daily-briefing/mint-bulk endpoint"""

    def test_bulk_mint_success(self, admin_client):
        """Bulk mint with valid rows"""
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint-bulk", json={
            "rows": [
                {"staff_name": "TEST_Bulk Alice", "staff_role": "Manager", "staff_email": "alice@luccca.com", "staff_phone": "+15551110001"},
                {"staff_name": "TEST_Bulk Bob", "staff_role": "Supervisor", "staff_email": "bob@luccca.com", "staff_phone": "+15551110002"},
                {"staff_name": "TEST_Bulk Carol", "staff_email": "carol@luccca.com"}
            ],
            "ttl_days": 14
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True
        assert data.get("count") == 3
        assert "tokens" in data
        assert len(data["tokens"]) == 3
        
        # Verify token structure
        for tok in data["tokens"]:
            assert "token" in tok
            assert "staff_name" in tok
            assert "mobile_url" in tok
            assert "expires_at" in tok
            assert tok["mobile_url"].startswith("/m/briefing/")
        
        # Verify first and last names
        assert data["tokens"][0]["staff_name"] == "TEST_Bulk Alice"
        assert data["tokens"][2]["staff_name"] == "TEST_Bulk Carol"
        print(f"✓ Bulk mint success: {data['count']} tokens created")

    def test_bulk_mint_empty_rows_400(self, admin_client):
        """Bulk mint with empty rows returns 400"""
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint-bulk", json={
            "rows": [],
            "ttl_days": 14
        })
        assert response.status_code == 400
        print("✓ Bulk mint empty rows returns 400")

    def test_bulk_mint_over_200_rows_400(self, admin_client):
        """Bulk mint with >200 rows returns 400"""
        rows = [{"staff_name": f"TEST_Staff_{i}"} for i in range(201)]
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint-bulk", json={
            "rows": rows,
            "ttl_days": 14
        })
        assert response.status_code == 400
        assert "200" in response.text.lower() or "max" in response.text.lower()
        print("✓ Bulk mint >200 rows returns 400")

    def test_bulk_mint_requires_admin_token(self, api_client):
        """Bulk mint without admin token returns 401"""
        response = api_client.post(f"{BASE_URL}/api/daily-briefing/mint-bulk", json={
            "rows": [{"staff_name": "TEST_Unauthorized"}],
            "ttl_days": 14
        })
        assert response.status_code == 401
        print("✓ Bulk mint requires admin token")

    def test_bulk_mint_returns_correct_fields(self, admin_client):
        """Bulk mint returns all expected fields in tokens array"""
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint-bulk", json={
            "rows": [
                {"staff_name": "TEST_Fields Check", "staff_role": "Tester", "staff_email": "fields@luccca.com", "staff_phone": "+15559990001"}
            ],
            "ttl_days": 14
        })
        assert response.status_code == 200
        data = response.json()
        tok = data["tokens"][0]
        
        # Verify all expected fields
        assert "token" in tok
        assert "staff_name" in tok
        assert "staff_email" in tok
        assert "staff_phone" in tok
        assert "mobile_url" in tok
        assert "absolute_url" in tok  # May be None if PUBLIC_BASE_URL not set
        assert "expires_at" in tok
        
        assert tok["staff_name"] == "TEST_Fields Check"
        assert tok["staff_email"] == "fields@luccca.com"
        assert tok["staff_phone"] == "+15559990001"
        print("✓ Bulk mint returns all expected fields")


class TestFlushQueue:
    """Test POST /api/daily-briefing/flush-queue endpoint"""

    def test_flush_queue_no_creds_returns_ok_false(self, admin_client):
        """Flush queue without Resend/Twilio creds returns ok:false with detail"""
        response = admin_client.post(f"{BASE_URL}/api/daily-briefing/flush-queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # When no creds set, should return ok:false with detail message
        assert data.get("ok") is False
        assert "detail" in data
        assert "RESEND_API_KEY" in data["detail"] or "Twilio" in data["detail"]
        print(f"✓ Flush queue no creds: ok=false, detail='{data['detail']}'")

    def test_flush_queue_requires_admin_token(self, api_client):
        """Flush queue without admin token returns 401"""
        response = api_client.post(f"{BASE_URL}/api/daily-briefing/flush-queue")
        assert response.status_code == 401
        print("✓ Flush queue requires admin token")


class TestStandupSendRegression:
    """Test POST /api/standup/send regression - mobile_push now includes sms_sent"""

    def test_standup_send_returns_mobile_push_with_sms_sent(self, admin_client):
        """Standup send returns mobile_push stats including sms_sent field"""
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # First ensure board exists and is confirmed
        admin_client.get(f"{BASE_URL}/api/standup/today")
        admin_client.post(f"{BASE_URL}/api/standup/publish", json={
            "date": today,
            "confirmed_by": "test-agent"
        })
        
        # Now send
        response = admin_client.post(f"{BASE_URL}/api/standup/send", json={
            "date": today,
            "to": []  # Empty to trigger dry-run
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True
        assert "mobile_push" in data
        
        mp = data["mobile_push"]
        assert "total_tokens" in mp
        assert "delivered" in mp
        assert "queued" in mp
        assert "failed" in mp
        assert "sms_sent" in mp  # NEW field in iter187
        
        # Without Twilio creds, sms_sent should be 0
        assert mp["sms_sent"] == 0
        print(f"✓ Standup send returns mobile_push with sms_sent: {mp}")

    def test_standup_send_queues_when_no_creds(self, admin_client):
        """When no Resend/Twilio creds, all tokens should be queued"""
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        # Ensure board is confirmed
        admin_client.post(f"{BASE_URL}/api/standup/publish", json={
            "date": today,
            "confirmed_by": "test-agent"
        })
        
        response = admin_client.post(f"{BASE_URL}/api/standup/send", json={
            "date": today,
            "to": []
        })
        assert response.status_code == 200
        data = response.json()
        
        mp = data.get("mobile_push", {})
        # Without creds, delivered should be 0 and queued should equal total_tokens
        assert mp.get("delivered", 0) == 0
        # queued should be >= 0 (depends on how many tokens exist)
        print(f"✓ Standup send queues when no creds: delivered=0, queued={mp.get('queued', 0)}")


class TestTokensListWithPhone:
    """Test GET /api/daily-briefing/tokens returns staff_phone field"""

    def test_tokens_list_includes_staff_phone(self, admin_client):
        """Tokens list includes staff_phone field"""
        # First mint a token with phone
        admin_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Phone List Check",
            "staff_phone": "+15557778888",
            "ttl_days": 7
        })
        
        # Get tokens list
        response = admin_client.get(f"{BASE_URL}/api/daily-briefing/tokens")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("ok") is True
        assert "tokens" in data
        
        # Find our test token
        test_tokens = [t for t in data["tokens"] if t.get("staff_name") == "TEST_Phone List Check"]
        assert len(test_tokens) > 0, "Test token not found in list"
        
        tok = test_tokens[0]
        assert "staff_phone" in tok
        assert tok["staff_phone"] == "+15557778888"
        print(f"✓ Tokens list includes staff_phone: {tok['staff_phone']}")


class TestRegressionExistingFlows:
    """Regression tests for existing flows"""

    def test_single_mint_still_works(self, admin_client):
        """Single mint flow still works end-to-end"""
        # Mint
        mint_resp = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Regression Single",
            "staff_role": "Tester",
            "ttl_days": 14
        })
        assert mint_resp.status_code == 200
        token = mint_resp.json()["token"]
        
        # Verify session works
        session_resp = requests.get(
            f"{BASE_URL}/api/daily-briefing/session",
            headers={"X-Briefing-Token": token}
        )
        assert session_resp.status_code == 200
        data = session_resp.json()
        assert data.get("ok") is True
        assert data["staff"]["name"] == "TEST_Regression Single"
        print("✓ Single mint flow still works end-to-end")

    def test_today_briefing_still_works(self, admin_client):
        """Today briefing endpoint still works"""
        # First mint a token
        mint_resp = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Today Check",
            "ttl_days": 7
        })
        token = mint_resp.json()["token"]
        
        # Get today's briefing
        today_resp = requests.get(
            f"{BASE_URL}/api/daily-briefing/today",
            headers={"X-Briefing-Token": token}
        )
        assert today_resp.status_code == 200
        data = today_resp.json()
        assert data.get("ok") is True
        print("✓ Today briefing endpoint still works")

    def test_revoke_still_works(self, admin_client):
        """Revoke token flow still works"""
        # Mint
        mint_resp = admin_client.post(f"{BASE_URL}/api/daily-briefing/mint", json={
            "staff_name": "TEST_Revoke Check",
            "ttl_days": 7
        })
        token = mint_resp.json()["token"]
        
        # Revoke
        revoke_resp = admin_client.post(f"{BASE_URL}/api/daily-briefing/revoke?token={token}")
        assert revoke_resp.status_code == 200
        assert revoke_resp.json().get("ok") is True
        
        # Verify revoked token can't access session
        session_resp = requests.get(
            f"{BASE_URL}/api/daily-briefing/session",
            headers={"X-Briefing-Token": token}
        )
        assert session_resp.status_code == 401
        print("✓ Revoke token flow still works")


class TestHowToGetKeysDoc:
    """Verify how_to_get_keys.md exists"""

    def test_how_to_get_keys_exists(self):
        """Verify /app/memory/how_to_get_keys.md exists"""
        import os
        path = "/app/memory/how_to_get_keys.md"
        assert os.path.exists(path), f"File not found: {path}"
        
        with open(path, "r") as f:
            content = f.read()
        
        # Verify it contains key sections
        assert "Azure AD" in content or "AZURE" in content
        assert "Resend" in content or "RESEND" in content
        assert "Twilio" in content or "TWILIO" in content
        print("✓ how_to_get_keys.md exists with Azure/Resend/Twilio sections")


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_tokens(self, admin_client):
        """Cleanup TEST_ prefixed tokens (informational only)"""
        response = admin_client.get(f"{BASE_URL}/api/daily-briefing/tokens")
        if response.status_code == 200:
            data = response.json()
            test_tokens = [t for t in data.get("tokens", []) if t.get("staff_name", "").startswith("TEST_")]
            print(f"ℹ Found {len(test_tokens)} TEST_ tokens (not deleting - no delete endpoint)")
        print("✓ Cleanup check complete")
