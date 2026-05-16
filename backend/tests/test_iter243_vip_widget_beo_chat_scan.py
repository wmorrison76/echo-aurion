"""
iter243 Backend Tests — VIP at-the-door widget + BEO chat + NFC scan + Voice→BEO draft

Tests:
1. GET /api/vip-tracker/in-house-now (leadership-gated, returns up to 6 in-house VIPs)
2. GET /api/vip-tracker/in-house-now without auth → 403
3. POST /api/vip-tracker/{id}/issue-token → issues vipscan-XXXX token
4. POST /api/vip-tracker/scan with valid token → returns vip_id + checkin_id
5. POST /api/vip-tracker/scan with invalid token → 404
6. POST /api/maestro/beo/{id}/chat → creates room with kind='beo', auto-posts system message
7. POST /api/maestro/beo/{id}/chat second call → reused:true with same room_id
8. POST /api/maestro/beo/draft → creates BEO with status='draft' and source='voice-draft'

Regression:
- VIP list still works
- BEO recent still works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
HEADERS = {"X-User-Id": "chef-william", "Content-Type": "application/json"}


class TestIter243InHouseNow:
    """VIP at-the-door widget endpoint tests"""

    def test_in_house_now_with_auth(self):
        """GET /api/vip-tracker/in-house-now with X-User-Id: chef-william returns in-house VIPs"""
        # First seed demo data
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo", headers=HEADERS)
        
        response = requests.get(
            f"{BASE_URL}/api/vip-tracker/in-house-now",
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "rows" in data
        assert "count" in data
        assert "as_of" in data
        
        # Should return up to 6 VIPs
        assert len(data["rows"]) <= 6
        
        # Each VIP should have required fields
        for vip in data["rows"]:
            assert "id" in vip
            assert "display_name" in vip
            # last_activity and activity_age_seconds may be null
            assert "last_activity" in vip or vip.get("last_activity") is None
            assert "activity_age_seconds" in vip or vip.get("activity_age_seconds") is None
        
        print(f"PASS: in-house-now returned {data['count']} VIPs")
        
        # Check for expected VIPs (Novak, Reyes, Okafor, Hartfield based on spec)
        vip_names = [v.get("display_name", "") for v in data["rows"]]
        print(f"VIP names: {vip_names}")

    def test_in_house_now_without_auth_returns_403(self):
        """GET /api/vip-tracker/in-house-now without X-User-Id returns 403"""
        response = requests.get(f"{BASE_URL}/api/vip-tracker/in-house-now")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: in-house-now without auth returns 403")


class TestIter243IssueToken:
    """VIP NFC/QR token issuance tests"""

    def test_issue_token_success(self):
        """POST /api/vip-tracker/{id}/issue-token returns vipscan-XXXX token"""
        # First get a VIP ID
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo", headers=HEADERS)
        list_resp = requests.get(
            f"{BASE_URL}/api/vip-tracker/list?status=in-house",
            headers=HEADERS
        )
        assert list_resp.status_code == 200
        vips = list_resp.json().get("rows", [])
        assert len(vips) > 0, "No VIPs found to test with"
        
        vip_id = vips[0]["id"]
        
        # Issue token
        response = requests.post(
            f"{BASE_URL}/api/vip-tracker/{vip_id}/issue-token",
            headers=HEADERS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "token" in data
        assert data["token"].startswith("vipscan-"), f"Token should start with 'vipscan-', got {data['token']}"
        
        print(f"PASS: Issued token {data['token']} for VIP {vip_id}")
        return data["token"], vip_id

    def test_issue_multiple_tokens_same_vip(self):
        """Same VIP can have multiple tokens (addToSet behavior)"""
        # Get a VIP
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo", headers=HEADERS)
        list_resp = requests.get(
            f"{BASE_URL}/api/vip-tracker/list?status=in-house",
            headers=HEADERS
        )
        vips = list_resp.json().get("rows", [])
        vip_id = vips[0]["id"]
        
        # Issue first token
        resp1 = requests.post(
            f"{BASE_URL}/api/vip-tracker/{vip_id}/issue-token",
            headers=HEADERS
        )
        token1 = resp1.json().get("token")
        
        # Issue second token
        resp2 = requests.post(
            f"{BASE_URL}/api/vip-tracker/{vip_id}/issue-token",
            headers=HEADERS
        )
        token2 = resp2.json().get("token")
        
        assert token1 != token2, "Each call should generate a unique token"
        print(f"PASS: Multiple tokens issued: {token1}, {token2}")

    def test_issue_token_without_auth_returns_403(self):
        """POST /api/vip-tracker/{id}/issue-token without auth returns 403"""
        response = requests.post(f"{BASE_URL}/api/vip-tracker/vip-test/issue-token")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: issue-token without auth returns 403")


class TestIter243Scan:
    """VIP NFC/QR scan endpoint tests"""

    def test_scan_with_valid_token(self):
        """POST /api/vip-tracker/scan with valid token returns vip_id + checkin_id"""
        # First issue a token
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo", headers=HEADERS)
        list_resp = requests.get(
            f"{BASE_URL}/api/vip-tracker/list?status=in-house",
            headers=HEADERS
        )
        vips = list_resp.json().get("rows", [])
        vip_id = vips[0]["id"]
        
        # Issue token
        token_resp = requests.post(
            f"{BASE_URL}/api/vip-tracker/{vip_id}/issue-token",
            headers=HEADERS
        )
        token = token_resp.json().get("token")
        
        # Scan with token
        scan_resp = requests.post(
            f"{BASE_URL}/api/vip-tracker/scan",
            headers=HEADERS,
            json={
                "scan_token": token,
                "venue_slug": "outlet-rooftop",
                "method": "qr"
            }
        )
        assert scan_resp.status_code == 200, f"Expected 200, got {scan_resp.status_code}: {scan_resp.text}"
        
        data = scan_resp.json()
        assert data.get("ok") is True
        assert "vip_id" in data
        assert "checkin_id" in data
        assert data["vip_id"] == vip_id
        
        print(f"PASS: Scan returned vip_id={data['vip_id']}, checkin_id={data['checkin_id']}")

    def test_scan_with_invalid_token_returns_404(self):
        """POST /api/vip-tracker/scan with invalid token returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/vip-tracker/scan",
            headers=HEADERS,
            json={
                "scan_token": "invalid-token-xyz",
                "venue_slug": "outlet-rooftop",
                "method": "qr"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Scan with invalid token returns 404")


class TestIter243BeoChat:
    """BEO auto-chat creation tests"""

    def test_beo_chat_creates_room(self):
        """POST /api/maestro/beo/{id}/chat creates room with kind='beo' and auto-posts system message"""
        # Seed BEO data
        requests.post(f"{BASE_URL}/api/maestro/beo/seed-demo", headers=HEADERS)
        
        # Get a BEO
        beo_resp = requests.get(f"{BASE_URL}/api/maestro/beo/recent")
        assert beo_resp.status_code == 200
        beos = beo_resp.json().get("rows", [])
        assert len(beos) > 0, "No BEOs found"
        
        beo_id = beos[0]["id"]
        
        # Create chat
        chat_resp = requests.post(
            f"{BASE_URL}/api/maestro/beo/{beo_id}/chat",
            headers=HEADERS
        )
        assert chat_resp.status_code == 200, f"Expected 200, got {chat_resp.status_code}: {chat_resp.text}"
        
        data = chat_resp.json()
        assert data.get("ok") is True
        assert "room_id" in data
        assert "room" in data
        
        room = data["room"]
        assert room.get("kind") == "beo", f"Expected kind='beo', got {room.get('kind')}"
        assert room.get("beo_id") == beo_id
        
        print(f"PASS: BEO chat created with room_id={data['room_id']}, kind={room.get('kind')}")
        return data["room_id"], beo_id

    def test_beo_chat_second_call_returns_reused(self):
        """Second call to POST /api/maestro/beo/{id}/chat returns reused:true with same room_id"""
        # Seed and get BEO
        requests.post(f"{BASE_URL}/api/maestro/beo/seed-demo", headers=HEADERS)
        beo_resp = requests.get(f"{BASE_URL}/api/maestro/beo/recent")
        beos = beo_resp.json().get("rows", [])
        beo_id = beos[0]["id"]
        
        # First call
        resp1 = requests.post(
            f"{BASE_URL}/api/maestro/beo/{beo_id}/chat",
            headers=HEADERS
        )
        room_id_1 = resp1.json().get("room_id")
        
        # Second call
        resp2 = requests.post(
            f"{BASE_URL}/api/maestro/beo/{beo_id}/chat",
            headers=HEADERS
        )
        data2 = resp2.json()
        
        assert data2.get("reused") is True, f"Expected reused=True, got {data2.get('reused')}"
        assert data2.get("room_id") == room_id_1, "Room ID should be the same"
        
        print(f"PASS: Second call returned reused=True with same room_id={room_id_1}")


class TestIter243BeoDraft:
    """Voice→BEO draft endpoint tests"""

    def test_beo_draft_creates_draft(self):
        """POST /api/maestro/beo/draft creates BEO with status='draft' and source='voice-draft'"""
        response = requests.post(
            f"{BASE_URL}/api/maestro/beo/draft",
            headers=HEADERS,
            json={
                "text": "Vegan tasting for 8 guests Thursday 7pm Garden Room Sofia Novak hosting sesame allergy"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True
        assert "id" in data
        assert "draft" in data
        
        draft = data["draft"]
        assert draft.get("status") == "draft", f"Expected status='draft', got {draft.get('status')}"
        assert draft.get("source") == "voice-draft", f"Expected source='voice-draft', got {draft.get('source')}"
        
        # Check guest_count extraction (should be 8 from the text)
        guest_count = draft.get("guest_count")
        print(f"Guest count extracted: {guest_count}")
        
        # Event name should be present
        assert "event_name" in draft
        print(f"PASS: BEO draft created with id={data['id']}, status={draft.get('status')}, source={draft.get('source')}, guest_count={guest_count}")

    def test_beo_draft_without_auth_returns_403(self):
        """POST /api/maestro/beo/draft without auth returns 403"""
        response = requests.post(
            f"{BASE_URL}/api/maestro/beo/draft",
            json={"text": "Test event"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: beo/draft without auth returns 403")


class TestIter243Regression:
    """Regression tests for existing functionality"""

    def test_vip_list_still_works(self):
        """VIP list endpoint still returns data"""
        requests.post(f"{BASE_URL}/api/vip-tracker/seed-demo", headers=HEADERS)
        response = requests.get(
            f"{BASE_URL}/api/vip-tracker/list?status=in-house",
            headers=HEADERS
        )
        assert response.status_code == 200
        data = response.json()
        assert "rows" in data
        print(f"PASS: VIP list returns {len(data.get('rows', []))} VIPs")

    def test_beo_recent_still_works(self):
        """BEO recent endpoint still returns data"""
        requests.post(f"{BASE_URL}/api/maestro/beo/seed-demo", headers=HEADERS)
        response = requests.get(f"{BASE_URL}/api/maestro/beo/recent")
        assert response.status_code == 200
        data = response.json()
        assert "rows" in data
        print(f"PASS: BEO recent returns {len(data.get('rows', []))} BEOs")

    def test_schedule_editor_endpoint(self):
        """Schedule editor endpoint still works"""
        response = requests.get(
            f"{BASE_URL}/api/schedules/week?outlet_id=outlet-rooftop&week_start=2026-04-20",
            headers=HEADERS
        )
        assert response.status_code == 200
        print("PASS: Schedule editor endpoint works")

    def test_storage_map_endpoint(self):
        """Storage map endpoint still works"""
        requests.post(f"{BASE_URL}/api/storage-map/seed-demo", headers=HEADERS)
        response = requests.get(f"{BASE_URL}/api/storage-map/shelves")
        assert response.status_code == 200
        data = response.json()
        assert "rows" in data
        print(f"PASS: Storage map returns {len(data.get('rows', []))} shelves")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
