"""
iter192 · Mobile Build 3 — Native Push Notifications + Offline Caching + Sidebar Tri-State

Tests:
1. POST /api/push/register — creates push_devices row, returns {ok:true, device_id}
2. POST /api/push/unregister — sets active=false
3. GET /api/push/devices/mine — returns devices for the staff token
4. GET /api/push/devices/all (admin) — returns all active devices
5. POST /api/push/broadcast (admin) — logs to push_log and returns stats
6. Invalid/revoked token → 401 on all push endpoints
7. Missing title/body on /broadcast → 400
8. POST /api/standup/send includes native push dispatch via send_push_to_staff()
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def staff_token(api_client):
    """Mint a fresh briefing token for testing push registration"""
    r = api_client.post(
        f"{BASE_URL}/api/daily-briefing/mint",
        headers={"X-Admin-Token": ADMIN_TOKEN},
        json={
            "staff_name": f"TEST_iter192_Push_{uuid.uuid4().hex[:6]}",
            "staff_role": "Duty Manager",
            "staff_email": f"test.push.{uuid.uuid4().hex[:6]}@luccca.com",
            "ttl_days": 1
        }
    )
    assert r.status_code == 200, f"Failed to mint token: {r.text}"
    data = r.json()
    assert "token" in data, f"No token in response: {data}"
    return data["token"]


class TestPushRegister:
    """POST /api/push/register — creates push_devices row"""
    
    def test_register_device_success(self, api_client, staff_token):
        """Register a device with valid token"""
        device_token = f"test-device-{uuid.uuid4().hex[:16]}"
        r = api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={
                "device_token": device_token,
                "platform": "web",
                "app_variant": "staff",
                "model": "Chrome Browser",
                "os_version": "Windows 11"
            }
        )
        assert r.status_code == 200, f"Register failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "device_id" in data
        # device_id is truncated token
        assert device_token[:16] in data["device_id"]
    
    def test_register_device_ios(self, api_client, staff_token):
        """Register an iOS device"""
        device_token = f"ios-device-{uuid.uuid4().hex[:16]}"
        r = api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={
                "device_token": device_token,
                "platform": "ios",
                "app_variant": "staff",
                "model": "iPhone 15 Pro",
                "os_version": "17.4"
            }
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
    
    def test_register_device_android(self, api_client, staff_token):
        """Register an Android device"""
        device_token = f"android-device-{uuid.uuid4().hex[:16]}"
        r = api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={
                "device_token": device_token,
                "platform": "android",
                "app_variant": "staff"
            }
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True
    
    def test_register_invalid_platform_400(self, api_client, staff_token):
        """Invalid platform returns 400"""
        r = api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={
                "device_token": "test-device",
                "platform": "invalid_platform"
            }
        )
        assert r.status_code == 400
    
    def test_register_no_token_401(self, api_client):
        """Missing token returns 401"""
        r = api_client.post(
            f"{BASE_URL}/api/push/register",
            json={
                "device_token": "test-device",
                "platform": "web"
            }
        )
        assert r.status_code == 401
    
    def test_register_invalid_token_401(self, api_client):
        """Invalid token returns 401"""
        r = api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": "invalid-token-12345"},
            json={
                "device_token": "test-device",
                "platform": "web"
            }
        )
        assert r.status_code == 401


class TestPushUnregister:
    """POST /api/push/unregister — sets active=false"""
    
    def test_unregister_device_success(self, api_client, staff_token):
        """Unregister a previously registered device"""
        device_token = f"unregister-test-{uuid.uuid4().hex[:16]}"
        # First register
        r1 = api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={"device_token": device_token, "platform": "web"}
        )
        assert r1.status_code == 200
        
        # Then unregister
        r2 = api_client.post(
            f"{BASE_URL}/api/push/unregister",
            headers={"X-Briefing-Token": staff_token},
            json={"device_token": device_token, "platform": "web"}
        )
        assert r2.status_code == 200
        assert r2.json().get("ok") is True
    
    def test_unregister_no_token_401(self, api_client):
        """Missing token returns 401"""
        r = api_client.post(
            f"{BASE_URL}/api/push/unregister",
            json={"device_token": "test-device", "platform": "web"}
        )
        assert r.status_code == 401


class TestPushDevicesMine:
    """GET /api/push/devices/mine — returns devices for the staff token"""
    
    def test_devices_mine_returns_registered(self, api_client, staff_token):
        """Returns devices registered by this token"""
        # Register a device first
        device_token = f"mine-test-{uuid.uuid4().hex[:16]}"
        api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={"device_token": device_token, "platform": "web"}
        )
        
        # Get my devices
        r = api_client.get(
            f"{BASE_URL}/api/push/devices/mine",
            headers={"X-Briefing-Token": staff_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "total" in data
        assert "devices" in data
        assert isinstance(data["devices"], list)
        # Should have at least one device
        assert data["total"] >= 1
    
    def test_devices_mine_no_token_401(self, api_client):
        """Missing token returns 401"""
        r = api_client.get(f"{BASE_URL}/api/push/devices/mine")
        assert r.status_code == 401


class TestPushDevicesAll:
    """GET /api/push/devices/all (admin) — returns all active devices"""
    
    def test_devices_all_admin_success(self, api_client):
        """Admin can list all devices"""
        r = api_client.get(
            f"{BASE_URL}/api/push/devices/all",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "total" in data
        assert "devices" in data
        assert isinstance(data["devices"], list)
    
    def test_devices_all_no_admin_401(self, api_client):
        """Missing admin token returns 401"""
        r = api_client.get(f"{BASE_URL}/api/push/devices/all")
        assert r.status_code == 401
    
    def test_devices_all_invalid_admin_401(self, api_client):
        """Invalid admin token returns 401"""
        r = api_client.get(
            f"{BASE_URL}/api/push/devices/all",
            headers={"X-Admin-Token": "invalid-admin-token"}
        )
        assert r.status_code == 401


class TestPushBroadcast:
    """POST /api/push/broadcast (admin) — logs to push_log and returns stats"""
    
    def test_broadcast_success(self, api_client, staff_token):
        """Admin can broadcast to all devices"""
        # First ensure there's at least one device
        device_token = f"broadcast-test-{uuid.uuid4().hex[:16]}"
        api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={"device_token": device_token, "platform": "web"}
        )
        
        # Broadcast
        r = api_client.post(
            f"{BASE_URL}/api/push/broadcast",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={
                "title": "Test Broadcast",
                "body": "This is a test broadcast message",
                "link": "/test"
            }
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "stats" in data
        stats = data["stats"]
        assert "total" in stats
        assert "queued" in stats  # Without FCM/APNs keys, all go to queued
    
    def test_broadcast_missing_title_400(self, api_client):
        """Missing title returns 400"""
        r = api_client.post(
            f"{BASE_URL}/api/push/broadcast",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"body": "Test body only"}
        )
        assert r.status_code == 400
    
    def test_broadcast_missing_body_400(self, api_client):
        """Missing body returns 400"""
        r = api_client.post(
            f"{BASE_URL}/api/push/broadcast",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"title": "Test title only"}
        )
        assert r.status_code == 400
    
    def test_broadcast_empty_title_400(self, api_client):
        """Empty title returns 400"""
        r = api_client.post(
            f"{BASE_URL}/api/push/broadcast",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"title": "   ", "body": "Test body"}
        )
        assert r.status_code == 400
    
    def test_broadcast_no_admin_401(self, api_client):
        """Missing admin token returns 401"""
        r = api_client.post(
            f"{BASE_URL}/api/push/broadcast",
            json={"title": "Test", "body": "Test"}
        )
        assert r.status_code == 401


class TestStandupSendNativePush:
    """POST /api/standup/send includes native push dispatch"""
    
    def test_standup_send_includes_mobile_push(self, api_client, staff_token):
        """Standup send fans out to native push devices"""
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Register a device for this staff token
        device_token = f"standup-push-{uuid.uuid4().hex[:16]}"
        api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": staff_token},
            json={"device_token": device_token, "platform": "android"}
        )
        
        # Ensure board exists and is confirmed
        api_client.get(f"{BASE_URL}/api/standup/today")
        api_client.post(
            f"{BASE_URL}/api/standup/publish",
            json={"date": today, "confirmed_by": "test-iter192"}
        )
        
        # Send the standup
        r = api_client.post(
            f"{BASE_URL}/api/standup/send",
            json={"date": today}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # Should have mobile_push stats
        assert "mobile_push" in data
        mobile_push = data["mobile_push"]
        assert "total_tokens" in mobile_push
        assert "delivered" in mobile_push
        assert "queued" in mobile_push


class TestGroupEventOfflineCache:
    """Group Event Attendee offline caching tests (backend verification)"""
    
    def test_group_event_returns_itinerary(self, api_client):
        """GET /api/group-events/events/{code} returns itinerary for caching"""
        # Use the seeded test event
        r = api_client.get(
            f"{BASE_URL}/api/group-events/events/acme-offsite-2026",
            params={"attendee_code": "0D8sZLBT"}
        )
        assert r.status_code == 200
        data = r.json()
        assert "event" in data
        event = data["event"]
        assert event.get("code") == "acme-offsite-2026"
        assert "itinerary" in event
        # Itinerary should be cacheable
        assert isinstance(event["itinerary"], list)


class TestRevokedTokenAuth:
    """Revoked token returns 401 on all push endpoints"""
    
    def test_revoked_token_register_401(self, api_client):
        """Revoked token cannot register device"""
        # Mint and immediately revoke a token
        mint_r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"staff_name": "TEST_Revoke_Check", "ttl_days": 1}
        )
        token = mint_r.json().get("token")
        
        # Revoke it
        api_client.post(
            f"{BASE_URL}/api/daily-briefing/revoke",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            params={"token": token}
        )
        
        # Try to register with revoked token
        r = api_client.post(
            f"{BASE_URL}/api/push/register",
            headers={"X-Briefing-Token": token},
            json={"device_token": "test", "platform": "web"}
        )
        assert r.status_code == 401
    
    def test_revoked_token_devices_mine_401(self, api_client):
        """Revoked token cannot list devices"""
        # Mint and revoke
        mint_r = api_client.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"staff_name": "TEST_Revoke_Mine", "ttl_days": 1}
        )
        token = mint_r.json().get("token")
        api_client.post(
            f"{BASE_URL}/api/daily-briefing/revoke",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            params={"token": token}
        )
        
        r = api_client.get(
            f"{BASE_URL}/api/push/devices/mine",
            headers={"X-Briefing-Token": token}
        )
        assert r.status_code == 401


class TestHealthAndRegression:
    """Basic health and regression checks"""
    
    def test_health_endpoint(self, api_client):
        """Health endpoint returns healthy"""
        r = api_client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
    
    def test_staff_mobile_me_still_works(self, api_client, staff_token):
        """Staff mobile /me endpoint still works"""
        r = api_client.get(
            f"{BASE_URL}/api/staff-mobile/me",
            headers={"X-Briefing-Token": staff_token}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "staff" in data
        assert "capabilities" in data
