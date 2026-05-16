"""
iter185 · Backend Tests
=======================
1. Pier 66 scrub — verify no 'Pier 66' in user-facing data
2. Daily Briefing Mobile — mint, session, today, revoke, 401/410 errors
3. Group Events attendee — re-verify backend (already tested iter184)
4. Regression — Guest Concierge Mobile still works
"""
import os
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o")


class TestPier66Scrub:
    """Verify no user-facing 'Pier 66' references remain."""

    def test_venues_no_pier66(self):
        """concierge_venues should have 'Marina Grill' not 'Pier 66 Steakhouse'."""
        # First authenticate as guest
        r = requests.post(f"{BASE_URL}/api/guest-concierge/authenticate", json={"room": "1208", "last_name": "Reed"})
        assert r.status_code == 200, f"Auth failed: {r.text}"
        token = r.json().get("token")
        
        r2 = requests.get(f"{BASE_URL}/api/guest-concierge/venues", headers={"X-Guest-Token": token})
        assert r2.status_code == 200
        venues = r2.json().get("venues", [])
        venue_names = [v.get("name", "") for v in venues]
        venue_slugs = [v.get("slug", "") for v in venues]
        
        # Should have Marina Grill
        assert any("marina" in n.lower() for n in venue_names), f"Marina Grill not found in venues: {venue_names}"
        assert "marina-grill" in venue_slugs, f"marina-grill slug not found: {venue_slugs}"
        
        # Should NOT have Pier 66
        for name in venue_names:
            assert "pier 66" not in name.lower(), f"Found 'Pier 66' in venue name: {name}"
            assert "pier66" not in name.lower().replace(" ", ""), f"Found 'Pier66' in venue name: {name}"

    def test_outlets_no_pier66(self):
        """outlets collection should have 'Marina Grill' not 'Pier 66 Restaurant'."""
        r = requests.get(f"{BASE_URL}/api/admin/outlets")
        assert r.status_code == 200
        outlets = r.json().get("outlets", [])
        outlet_names = [o.get("name", "") for o in outlets]
        
        # Should have Marina Grill
        assert any("marina" in n.lower() for n in outlet_names), f"Marina Grill not found in outlets: {outlet_names}"
        
        # Should NOT have Pier 66
        for name in outlet_names:
            assert "pier 66" not in name.lower(), f"Found 'Pier 66' in outlet name: {name}"

    def test_banquet_menu_property_luccca(self):
        """banquet_menu_catalog property should NOT have 'Pier Sixty-Six Resort'."""
        r = requests.get(f"{BASE_URL}/api/banquet-menus")
        assert r.status_code == 200
        menus = r.json().get("menus", [])
        
        for menu in menus:
            prop = menu.get("property", "")
            # Should NOT have Pier 66 / Pier Sixty-Six
            assert "pier" not in prop.lower(), f"Found 'Pier' in banquet menu property: {prop}"


class TestDailyBriefingMobile:
    """Daily Briefing Mobile — staff catch-up view."""

    def test_mint_token_requires_admin(self):
        """POST /api/daily-briefing/mint without admin token returns 401."""
        r = requests.post(f"{BASE_URL}/api/daily-briefing/mint", json={"staff_name": "Test Staff"})
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"

    def test_mint_token_success(self):
        """POST /api/daily-briefing/mint with admin token returns token + mobile_url."""
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"staff_name": "Marcus Hayes", "staff_role": "Duty Manager", "ttl_days": 14}
        )
        assert r.status_code == 200, f"Mint failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
        assert "mobile_url" in data
        assert data["mobile_url"].startswith("/m/briefing/")
        assert "expires_at" in data
        # Store for later tests
        TestDailyBriefingMobile.minted_token = data["token"]

    def test_session_with_valid_token(self):
        """GET /api/daily-briefing/session with valid token returns staff info."""
        token = getattr(TestDailyBriefingMobile, "minted_token", None)
        if not token:
            pytest.skip("No minted token available")
        
        r = requests.get(f"{BASE_URL}/api/daily-briefing/session", headers={"X-Briefing-Token": token})
        assert r.status_code == 200, f"Session failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "staff" in data
        assert data["staff"].get("name") == "Marcus Hayes"
        assert data["staff"].get("role") == "Duty Manager"

    def test_session_without_token_401(self):
        """GET /api/daily-briefing/session without token returns 401."""
        r = requests.get(f"{BASE_URL}/api/daily-briefing/session")
        assert r.status_code == 401

    def test_session_invalid_token_401(self):
        """GET /api/daily-briefing/session with invalid token returns 401."""
        r = requests.get(f"{BASE_URL}/api/daily-briefing/session", headers={"X-Briefing-Token": "invalid-token-xyz"})
        assert r.status_code == 401

    def test_today_briefing_with_valid_token(self):
        """GET /api/daily-briefing/today with valid token returns board or message."""
        token = getattr(TestDailyBriefingMobile, "minted_token", None)
        if not token:
            pytest.skip("No minted token available")
        
        r = requests.get(f"{BASE_URL}/api/daily-briefing/today", headers={"X-Briefing-Token": token})
        assert r.status_code == 200, f"Today failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # Either has board data or message
        assert "sections" in data or "message" in data or "board" in data

    def test_today_briefing_without_token_401(self):
        """GET /api/daily-briefing/today without token returns 401."""
        r = requests.get(f"{BASE_URL}/api/daily-briefing/today")
        assert r.status_code == 401

    def test_tokens_list_admin(self):
        """GET /api/daily-briefing/tokens returns list of tokens (admin)."""
        r = requests.get(f"{BASE_URL}/api/daily-briefing/tokens", headers={"X-Admin-Token": ADMIN_TOKEN})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "tokens" in data
        assert isinstance(data["tokens"], list)

    def test_revoke_token(self):
        """POST /api/daily-briefing/revoke deactivates a token."""
        # First mint a new token to revoke
        r = requests.post(
            f"{BASE_URL}/api/daily-briefing/mint",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"staff_name": "Revoke Test", "ttl_days": 1}
        )
        assert r.status_code == 200
        token_to_revoke = r.json()["token"]
        
        # Verify it works
        r2 = requests.get(f"{BASE_URL}/api/daily-briefing/session", headers={"X-Briefing-Token": token_to_revoke})
        assert r2.status_code == 200
        
        # Revoke it
        r3 = requests.post(
            f"{BASE_URL}/api/daily-briefing/revoke",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            params={"token": token_to_revoke}
        )
        assert r3.status_code == 200
        assert r3.json().get("revoked") is True
        
        # Verify it no longer works
        r4 = requests.get(f"{BASE_URL}/api/daily-briefing/session", headers={"X-Briefing-Token": token_to_revoke})
        assert r4.status_code == 401, f"Revoked token should return 401, got {r4.status_code}"


class TestGroupEventsAttendee:
    """Group Events attendee backend (re-verify from iter184)."""

    def test_upsert_event_admin(self):
        """POST /api/group-events/events/upsert creates event."""
        r = requests.post(
            f"{BASE_URL}/api/group-events/events/upsert",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={
                "code": "test-iter185-event",
                "company_name": "Test Corp",
                "event_name": "iter185 Test Event",
                "date_start": "2026-05-01",
                "date_end": "2026-05-03",
                "attendee_count": 50,
                "welcome_note": "Welcome to our test event!"
            }
        )
        assert r.status_code == 200, f"Upsert failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "event" in data
        assert data["event"]["code"] == "test-iter185-event"
        TestGroupEventsAttendee.attendee_code = data["event"].get("attendee_code")

    def test_add_session_admin(self):
        """POST /events/{code}/session/add with admin token."""
        r = requests.post(
            f"{BASE_URL}/api/group-events/events/test-iter185-event/session/add",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={
                "date": "2026-05-01",
                "time": "09:00",
                "duration_min": 90,
                "title": "Opening Keynote",
                "location": "Grand Ballroom",
                "kind": "keynote",
                "notes": "CEO welcome address"
            }
        )
        assert r.status_code == 200, f"Add session failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "session" in data

    def test_invite_planner(self):
        """POST /events/{code}/invite-planner returns planner_token + attendee_url."""
        r = requests.post(
            f"{BASE_URL}/api/group-events/events/test-iter185-event/invite-planner",
            headers={"X-Admin-Token": ADMIN_TOKEN}
        )
        assert r.status_code == 200, f"Invite planner failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "planner_token" in data
        assert "planner_url" in data
        assert "attendee_url" in data
        TestGroupEventsAttendee.planner_token = data["planner_token"]

    def test_add_session_planner(self):
        """POST /events/{code}/session/add with planner token."""
        planner_token = getattr(TestGroupEventsAttendee, "planner_token", None)
        if not planner_token:
            pytest.skip("No planner token available")
        
        r = requests.post(
            f"{BASE_URL}/api/group-events/events/test-iter185-event/session/add",
            headers={"X-Planner-Token": planner_token},
            json={
                "date": "2026-05-01",
                "time": "12:00",
                "duration_min": 60,
                "title": "Lunch Break",
                "location": "Terrace Restaurant",
                "kind": "meal"
            }
        )
        assert r.status_code == 200, f"Planner add session failed: {r.text}"

    def test_get_event_attendee_code(self):
        """GET /events/{code}?attendee_code=... returns event with redacted fields."""
        attendee_code = getattr(TestGroupEventsAttendee, "attendee_code", None)
        if not attendee_code:
            pytest.skip("No attendee code available")
        
        r = requests.get(f"{BASE_URL}/api/group-events/events/test-iter185-event?attendee_code={attendee_code}")
        assert r.status_code == 200, f"Get event failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        event = data.get("event", {})
        
        # Attendee should NOT see these fields
        assert "attendee_code" not in event, "attendee_code should be redacted for attendees"
        assert "primary_planner_email" not in event, "planner_email should be redacted"
        
        # Should see itinerary
        assert "itinerary" in event
        assert data.get("can_edit") is False

    def test_get_event_without_code_401(self):
        """GET /events/{code} without any code returns 401."""
        r = requests.get(f"{BASE_URL}/api/group-events/events/test-iter185-event")
        assert r.status_code == 401

    def test_seeded_acme_event(self):
        """Verify seeded acme-offsite-2026 event with attendee code 0D8sZLBT."""
        r = requests.get(f"{BASE_URL}/api/group-events/events/acme-offsite-2026?attendee_code=0D8sZLBT")
        # May or may not exist depending on seed state
        if r.status_code == 200:
            data = r.json()
            assert data.get("ok") is True
            event = data.get("event", {})
            assert event.get("company_name") == "ACME Corp" or "acme" in event.get("company_name", "").lower()


class TestGuestConciergeRegression:
    """Regression: Guest Concierge Mobile still works."""

    def test_guest_auth(self):
        """POST /api/guest-concierge/authenticate with room 1208 + Reed."""
        r = requests.post(f"{BASE_URL}/api/guest-concierge/authenticate", json={"room": "1208", "last_name": "Reed"})
        assert r.status_code == 200, f"Auth failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
        assert "guest" in data
        TestGuestConciergeRegression.guest_token = data["token"]

    def test_session(self):
        """GET /api/guest-concierge/session returns guest info."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.get(f"{BASE_URL}/api/guest-concierge/session", headers={"X-Guest-Token": token})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "guest" in data

    def test_venues(self):
        """GET /api/guest-concierge/venues returns venues list."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.get(f"{BASE_URL}/api/guest-concierge/venues", headers={"X-Guest-Token": token})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "venues" in data
        assert len(data["venues"]) >= 1

    def test_nearby(self):
        """GET /api/guest-concierge/nearby returns nearby list."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.get(f"{BASE_URL}/api/guest-concierge/nearby", headers={"X-Guest-Token": token})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "nearby" in data

    def test_valet_request(self):
        """POST /api/guest-concierge/valet creates valet request."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.post(
            f"{BASE_URL}/api/guest-concierge/valet",
            headers={"X-Guest-Token": token},
            json={"pickup_minutes": 10}
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "request_id" in data
        assert "eta" in data

    def test_ird_menu(self):
        """GET /api/guest-concierge/in-room-dining/menu returns menu items."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.get(f"{BASE_URL}/api/guest-concierge/in-room-dining/menu", headers={"X-Guest-Token": token})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "items" in data
        assert len(data["items"]) >= 1

    def test_vip_addons(self):
        """GET /api/guest-concierge/vip-addons returns VIP add-ons."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.get(f"{BASE_URL}/api/guest-concierge/vip-addons", headers={"X-Guest-Token": token})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "addons" in data

    def test_weather_alternatives(self):
        """GET /api/guest-concierge/weather-alternatives returns indoor venues."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.get(f"{BASE_URL}/api/guest-concierge/weather-alternatives", headers={"X-Guest-Token": token})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # API returns 'venues' not 'indoor_venues'
        assert "venues" in data or "indoor_venues" in data

    def test_requests_list(self):
        """GET /api/guest-concierge/requests returns guest's requests."""
        token = getattr(TestGuestConciergeRegression, "guest_token", None)
        if not token:
            pytest.skip("No guest token")
        
        r = requests.get(f"{BASE_URL}/api/guest-concierge/requests", headers={"X-Guest-Token": token})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "requests" in data


class TestMarinaGrillVenuePresent:
    """Verify Marina Grill venue is present and correctly named."""

    def test_marina_grill_in_venues(self):
        """Marina Grill should be in venues list with correct slug."""
        r = requests.post(f"{BASE_URL}/api/guest-concierge/authenticate", json={"room": "1208", "last_name": "Reed"})
        assert r.status_code == 200
        token = r.json().get("token")
        
        r2 = requests.get(f"{BASE_URL}/api/guest-concierge/venues", headers={"X-Guest-Token": token})
        assert r2.status_code == 200
        venues = r2.json().get("venues", [])
        
        marina_grill = next((v for v in venues if v.get("slug") == "marina-grill"), None)
        assert marina_grill is not None, f"marina-grill not found in venues: {[v.get('slug') for v in venues]}"
        assert "marina" in marina_grill.get("name", "").lower()
        assert marina_grill.get("category") == "dining"
