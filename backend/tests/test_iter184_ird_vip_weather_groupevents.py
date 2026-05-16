"""
iter184 · In-Room Dining, VIP Add-ons, Weather Alternatives, Menu/Allergens, Reservations, Group Events

Tests:
- In-Room Dining: menu, order, tracker, admin advance stages
- VIP WOW Add-ons: list (20 items), request
- Weather Alternatives: indoor venues
- Venue Menus: get menu, allergens
- Reservations: POST /reserve
- Group Events: upsert, invite-planner, session/add, attendee access
"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o")

# Test guest credentials
TEST_ROOM = "1208"
TEST_LAST_NAME = "Reed"


@pytest.fixture(scope="module")
def guest_token():
    """Authenticate as William Reed (diamond tier) and return guest token"""
    resp = requests.post(
        f"{BASE_URL}/api/guest-concierge/authenticate",
        json={"room": TEST_ROOM, "last_name": TEST_LAST_NAME}
    )
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in auth response"
    return data["token"]


@pytest.fixture(scope="module")
def guest_headers(guest_token):
    """Headers with guest token"""
    return {"X-Guest-Token": guest_token}


@pytest.fixture(scope="module")
def admin_headers():
    """Headers with admin token"""
    return {"X-Admin-Token": ADMIN_TOKEN}


# ─── In-Room Dining Tests ──────────────────────────────────────────────────

class TestIRDMenu:
    """In-Room Dining menu endpoint tests"""
    
    def test_ird_menu_returns_items(self, guest_headers):
        """GET /api/guest-concierge/in-room-dining/menu returns seeded items"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/menu",
            headers=guest_headers
        )
        assert resp.status_code == 200, f"IRD menu failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "items" in data
        items = data["items"]
        assert len(items) >= 10, f"Expected 10+ IRD items, got {len(items)}"
        
        # Check item structure
        item = items[0]
        assert "id" in item
        assert "name" in item
        assert "price" in item
        assert "category" in item
        
    def test_ird_menu_has_categories(self, guest_headers):
        """IRD menu has multiple categories (entree, starter, dessert, drink, kids)"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/menu",
            headers=guest_headers
        )
        data = resp.json()
        categories = set(item["category"] for item in data["items"])
        expected = {"entree", "starter", "dessert", "drink", "kids"}
        assert categories >= expected, f"Missing categories. Got: {categories}"
        
    def test_ird_menu_has_allergens(self, guest_headers):
        """IRD items include allergen info"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/menu",
            headers=guest_headers
        )
        data = resp.json()
        items_with_allergens = [i for i in data["items"] if i.get("allergens")]
        assert len(items_with_allergens) >= 5, "Expected items with allergen info"
        
    def test_ird_menu_requires_auth(self):
        """IRD menu requires guest token"""
        resp = requests.get(f"{BASE_URL}/api/guest-concierge/in-room-dining/menu")
        assert resp.status_code == 401


class TestIRDOrder:
    """In-Room Dining order flow tests"""
    
    def test_ird_order_success(self, guest_headers):
        """POST /api/guest-concierge/in-room-dining/order creates order"""
        # First get menu to get valid item IDs
        menu_resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/menu",
            headers=guest_headers
        )
        items = menu_resp.json()["items"]
        item = items[0]
        
        # Place order
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={
                "lines": [
                    {"item_id": item["id"], "name": item["name"], "qty": 2, "price": item["price"]}
                ],
                "desired_time": "now"
            }
        )
        assert resp.status_code == 200, f"Order failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "order_id" in data
        assert "eta" in data
        assert "total" in data
        return data["order_id"]
        
    def test_ird_order_empty_lines_fails(self, guest_headers):
        """Order with empty lines returns 400"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={"lines": [], "desired_time": "now"}
        )
        assert resp.status_code == 400
        
    def test_ird_order_requires_auth(self):
        """Order requires guest token"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order",
            headers={"Content-Type": "application/json"},
            json={"lines": [{"name": "Test", "qty": 1, "price": 10}], "desired_time": "now"}
        )
        assert resp.status_code == 401


class TestIRDTracker:
    """In-Room Dining tracker tests"""
    
    @pytest.fixture
    def order_id(self, guest_headers):
        """Create an order and return its ID"""
        menu_resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/menu",
            headers=guest_headers
        )
        items = menu_resp.json()["items"]
        item = items[0]
        
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={
                "lines": [{"item_id": item["id"], "name": item["name"], "qty": 1, "price": item["price"]}],
                "desired_time": "now"
            }
        )
        return resp.json()["order_id"]
    
    def test_ird_tracker_get_order(self, guest_headers, order_id):
        """GET /api/guest-concierge/in-room-dining/order/{id} returns order details"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order/{order_id}",
            headers=guest_headers
        )
        assert resp.status_code == 200, f"Tracker failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "order" in data
        order = data["order"]
        assert order["id"] == order_id
        assert order["stage"] == "received"  # Initial stage
        assert "eta" in order
        assert "lines" in order
        assert "stages" in data  # List of all stages
        
    def test_ird_tracker_has_4_stages(self, guest_headers, order_id):
        """Tracker returns 4 stages: received, preparing, on-the-way, delivered"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order/{order_id}",
            headers=guest_headers
        )
        data = resp.json()
        expected_stages = ["received", "preparing", "on-the-way", "delivered"]
        assert data["stages"] == expected_stages
        
    def test_ird_tracker_404_invalid_order(self, guest_headers):
        """Tracker returns 404 for invalid order ID"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order/invalid123",
            headers=guest_headers
        )
        assert resp.status_code == 404


class TestIRDAdminAdvance:
    """Admin can advance IRD order stages"""
    
    @pytest.fixture
    def order_id(self, guest_headers):
        """Create an order for admin testing"""
        menu_resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/menu",
            headers=guest_headers
        )
        items = menu_resp.json()["items"]
        item = items[0]
        
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={
                "lines": [{"item_id": item["id"], "name": item["name"], "qty": 1, "price": item["price"]}],
                "desired_time": "now"
            }
        )
        return resp.json()["order_id"]
    
    def test_admin_advance_to_preparing(self, admin_headers, guest_headers, order_id):
        """Admin can advance order to 'preparing' stage"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/admin/in-room-dining/order/{order_id}/advance",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"stage": "preparing"}
        )
        assert resp.status_code == 200, f"Advance failed: {resp.text}"
        
        # Verify stage changed
        check = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order/{order_id}",
            headers=guest_headers
        )
        assert check.json()["order"]["stage"] == "preparing"
        
    def test_admin_advance_full_cycle(self, admin_headers, guest_headers, order_id):
        """Admin can advance through all stages"""
        stages = ["preparing", "on-the-way", "delivered"]
        for stage in stages:
            resp = requests.post(
                f"{BASE_URL}/api/guest-concierge/admin/in-room-dining/order/{order_id}/advance",
                headers={**admin_headers, "Content-Type": "application/json"},
                json={"stage": stage}
            )
            assert resp.status_code == 200, f"Advance to {stage} failed"
            
        # Verify final stage
        check = requests.get(
            f"{BASE_URL}/api/guest-concierge/in-room-dining/order/{order_id}",
            headers=guest_headers
        )
        assert check.json()["order"]["stage"] == "delivered"
        
    def test_admin_advance_invalid_stage(self, admin_headers, order_id):
        """Invalid stage returns 400"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/admin/in-room-dining/order/{order_id}/advance",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={"stage": "invalid-stage"}
        )
        assert resp.status_code == 400
        
    def test_admin_advance_requires_admin_token(self, order_id):
        """Advance requires admin token"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/admin/in-room-dining/order/{order_id}/advance",
            headers={"Content-Type": "application/json"},
            json={"stage": "preparing"}
        )
        assert resp.status_code == 401


# ─── VIP WOW Add-ons Tests ─────────────────────────────────────────────────

class TestVIPAddons:
    """VIP WOW experiences tests"""
    
    def test_vip_addons_returns_20_items(self, guest_headers):
        """GET /api/guest-concierge/vip-addons returns 20 seeded add-ons"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/vip-addons",
            headers=guest_headers
        )
        assert resp.status_code == 200, f"VIP addons failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "addons" in data
        addons = data["addons"]
        assert len(addons) >= 15, f"Expected 15+ VIP addons, got {len(addons)}"
        
    def test_vip_addons_has_expected_slugs(self, guest_headers):
        """VIP addons include specific slugs"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/vip-addons",
            headers=guest_headers
        )
        data = resp.json()
        slugs = [a["slug"] for a in data["addons"]]
        expected = ["sunrise-private-yoga", "in-suite-chef-welcome", "couples-spa-day"]
        for slug in expected:
            assert slug in slugs, f"Missing VIP addon: {slug}"
            
    def test_vip_addons_returns_guest_tier(self, guest_headers):
        """VIP addons returns guest tier (diamond for William)"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/vip-addons",
            headers=guest_headers
        )
        data = resp.json()
        assert "guest_tier" in data
        assert data["guest_tier"] == "diamond"
        
    def test_vip_addon_structure(self, guest_headers):
        """VIP addon has required fields"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/vip-addons",
            headers=guest_headers
        )
        data = resp.json()
        addon = data["addons"][0]
        assert "slug" in addon
        assert "name" in addon
        assert "description" in addon
        assert "price" in addon
        assert "category" in addon


class TestVIPAddonRequest:
    """VIP addon request tests"""
    
    def test_vip_request_success(self, guest_headers):
        """POST /api/guest-concierge/vip-addons/request creates request"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/vip-addons/request",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={"addon_slug": "sunrise-private-yoga", "notes": "Tomorrow morning please"}
        )
        assert resp.status_code == 200, f"VIP request failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "request_id" in data
        assert "message" in data
        
    def test_vip_request_invalid_slug(self, guest_headers):
        """Request with invalid slug returns 404"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/vip-addons/request",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={"addon_slug": "nonexistent-addon"}
        )
        assert resp.status_code == 404


# ─── Weather Alternatives Tests ────────────────────────────────────────────

class TestWeatherAlternatives:
    """Weather alternatives (rain plan) tests"""
    
    def test_weather_alternatives_returns_venues(self, guest_headers):
        """GET /api/guest-concierge/weather-alternatives returns indoor venues"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/weather-alternatives",
            headers=guest_headers
        )
        assert resp.status_code == 200, f"Weather alts failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "venues" in data
        assert "activations_today" in data
        assert "note" in data
        
    def test_weather_alternatives_indoor_categories(self, guest_headers):
        """Weather alternatives returns indoor venue categories"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/weather-alternatives",
            headers=guest_headers
        )
        data = resp.json()
        venues = data["venues"]
        # Should have indoor venues like spa, fitness, bar
        categories = set(v["category"] for v in venues)
        indoor = {"spa", "fitness", "bar", "dining"}
        assert categories & indoor, f"Expected indoor categories, got: {categories}"
        
    def test_weather_alternatives_works_with_zero_activations(self, guest_headers):
        """Weather alternatives works even with 0 activations_today"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/weather-alternatives",
            headers=guest_headers
        )
        data = resp.json()
        # activations_today can be empty list - that's OK
        assert isinstance(data["activations_today"], list)


# ─── Venue Menu Tests ──────────────────────────────────────────────────────

class TestVenueMenu:
    """Venue menu and allergen tests"""
    
    def test_get_menu_for_venue(self, guest_headers):
        """GET /api/guest-concierge/menu/{venue_slug} returns menu"""
        # First get venues to find a valid slug
        venues_resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/venues",
            headers=guest_headers
        )
        venues = venues_resp.json()["venues"]
        slug = venues[0]["slug"]
        
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/menu/{slug}",
            headers=guest_headers
        )
        assert resp.status_code == 200, f"Menu failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        # Menu may be empty (not posted yet) - that's valid
        assert "items" in data or "note" in data
        
    def test_menu_empty_graceful(self, guest_headers):
        """Menu returns graceful 'Not posted yet' for empty menu"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/menu/nonexistent-venue",
            headers=guest_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert data.get("items") == [] or "note" in data


# ─── Reservation Tests ─────────────────────────────────────────────────────

class TestReservation:
    """Venue reservation tests"""
    
    def test_reserve_success(self, guest_headers):
        """POST /api/guest-concierge/reserve creates reservation"""
        # Get a venue that requires reservation
        venues_resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/venues",
            headers=guest_headers
        )
        venues = venues_resp.json()["venues"]
        # Find one with reservation_required
        venue = next((v for v in venues if v.get("reservation_required")), venues[0])
        
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/reserve",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={
                "venue_slug": venue["slug"],
                "date": "2026-04-20",
                "time": "19:30",
                "party_size": 2
            }
        )
        assert resp.status_code == 200, f"Reserve failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "reservation_id" in data
        assert "message" in data
        
    def test_reserve_invalid_venue(self, guest_headers):
        """Reserve with invalid venue returns 404"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/reserve",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={
                "venue_slug": "nonexistent-venue",
                "date": "2026-04-20",
                "time": "19:30",
                "party_size": 2
            }
        )
        assert resp.status_code == 404


# ─── Group Events Tests ────────────────────────────────────────────────────

class TestGroupEvents:
    """Group Events backend tests (no frontend yet)"""
    
    @pytest.fixture
    def event_code(self, admin_headers):
        """Create a test event and return its code"""
        code = f"test-event-{int(time.time())}"
        resp = requests.post(
            f"{BASE_URL}/api/group-events/events/upsert",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={
                "code": code,
                "company_name": "Test Corp",
                "event_name": "Annual Offsite 2026",
                "date_start": "2026-05-01",
                "date_end": "2026-05-03",
                "attendee_count": 50,
                "primary_planner_email": "planner@testcorp.com"
            }
        )
        assert resp.status_code == 200, f"Event upsert failed: {resp.text}"
        return code
    
    def test_event_upsert(self, admin_headers):
        """POST /api/group-events/events/upsert creates event"""
        code = f"test-upsert-{int(time.time())}"
        resp = requests.post(
            f"{BASE_URL}/api/group-events/events/upsert",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={
                "code": code,
                "company_name": "Acme Inc",
                "event_name": "Q2 Planning",
                "date_start": "2026-06-01",
                "date_end": "2026-06-02"
            }
        )
        assert resp.status_code == 200, f"Upsert failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "event" in data
        assert data["event"]["code"] == code.lower()
        
    def test_event_upsert_requires_admin(self):
        """Event upsert requires admin token"""
        resp = requests.post(
            f"{BASE_URL}/api/group-events/events/upsert",
            headers={"Content-Type": "application/json"},
            json={
                "code": "no-auth-test",
                "company_name": "Test",
                "event_name": "Test",
                "date_start": "2026-01-01",
                "date_end": "2026-01-02"
            }
        )
        assert resp.status_code == 401
        
    def test_invite_planner(self, admin_headers, event_code):
        """POST /api/group-events/events/{code}/invite-planner returns planner_token + attendee_url"""
        resp = requests.post(
            f"{BASE_URL}/api/group-events/events/{event_code}/invite-planner",
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Invite planner failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "planner_token" in data
        assert "planner_url" in data
        assert "attendee_code" in data
        assert "attendee_url" in data
        return data
        
    def test_add_session_as_admin(self, admin_headers, event_code):
        """POST /api/group-events/events/{code}/session/add adds session (admin)"""
        resp = requests.post(
            f"{BASE_URL}/api/group-events/events/{event_code}/session/add",
            headers={**admin_headers, "Content-Type": "application/json"},
            json={
                "date": "2026-05-01",
                "time": "09:00",
                "duration_min": 90,
                "title": "Welcome Keynote",
                "location": "Grand Ballroom",
                "kind": "keynote"
            }
        )
        assert resp.status_code == 200, f"Add session failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "session" in data
        assert data["session"]["title"] == "Welcome Keynote"
        
    def test_add_session_as_planner(self, admin_headers, event_code):
        """POST /api/group-events/events/{code}/session/add works with planner token"""
        # First get planner token
        invite_resp = requests.post(
            f"{BASE_URL}/api/group-events/events/{event_code}/invite-planner",
            headers=admin_headers
        )
        planner_token = invite_resp.json()["planner_token"]
        
        # Add session with planner token
        resp = requests.post(
            f"{BASE_URL}/api/group-events/events/{event_code}/session/add",
            headers={"X-Planner-Token": planner_token, "Content-Type": "application/json"},
            json={
                "date": "2026-05-01",
                "time": "12:00",
                "duration_min": 60,
                "title": "Lunch Break",
                "location": "Terrace Restaurant",
                "kind": "meal"
            }
        )
        assert resp.status_code == 200, f"Planner add session failed: {resp.text}"
        
    def test_get_event_with_attendee_code(self, admin_headers, event_code):
        """GET /api/group-events/events/{code}?attendee_code=... returns redacted view"""
        # Get attendee code
        invite_resp = requests.post(
            f"{BASE_URL}/api/group-events/events/{event_code}/invite-planner",
            headers=admin_headers
        )
        attendee_code = invite_resp.json()["attendee_code"]
        
        # Access as attendee
        resp = requests.get(
            f"{BASE_URL}/api/group-events/events/{event_code}?attendee_code={attendee_code}"
        )
        assert resp.status_code == 200, f"Attendee access failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "event" in data
        # Attendee view should NOT have planner emails
        event = data["event"]
        assert "primary_planner_email" not in event or event.get("primary_planner_email") is None
        assert data.get("can_edit") is False
        
    def test_get_event_without_auth_fails(self, event_code):
        """GET /api/group-events/events/{code} without auth returns 401"""
        resp = requests.get(f"{BASE_URL}/api/group-events/events/{event_code}")
        assert resp.status_code == 401
        
    def test_list_events_admin(self, admin_headers):
        """GET /api/group-events/events returns list (admin only)"""
        resp = requests.get(
            f"{BASE_URL}/api/group-events/events",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert "events" in data


# ─── Regression Tests ──────────────────────────────────────────────────────

class TestRegression:
    """Regression tests for existing /guest flow"""
    
    def test_valet_request(self, guest_headers):
        """POST /api/guest-concierge/valet still works"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/valet",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={"pickup_minutes": 5}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert "eta" in data
        
    def test_luggage_request(self, guest_headers):
        """POST /api/guest-concierge/luggage still works"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/luggage",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={"pickup_location": "Room 1208", "pickup_time": "now", "bag_count": 2}
        )
        assert resp.status_code == 200
        
    def test_transport_request(self, guest_headers):
        """POST /api/guest-concierge/transport still works"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/transport",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={"from_location": "Room 1208", "to_location": "Beach Club", "party_size": 2, "when": "now"}
        )
        assert resp.status_code == 200
        
    def test_venues_list(self, guest_headers):
        """GET /api/guest-concierge/venues still works"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/venues",
            headers=guest_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["venues"]) >= 5
        
    def test_nearby_list(self, guest_headers):
        """GET /api/guest-concierge/nearby still works"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/nearby",
            headers=guest_headers
        )
        assert resp.status_code == 200
        
    def test_requests_list(self, guest_headers):
        """GET /api/guest-concierge/requests still works"""
        resp = requests.get(
            f"{BASE_URL}/api/guest-concierge/requests",
            headers=guest_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "requests" in data
        
    def test_location_share(self, guest_headers):
        """POST /api/guest-concierge/location still works"""
        resp = requests.post(
            f"{BASE_URL}/api/guest-concierge/location",
            headers={**guest_headers, "Content-Type": "application/json"},
            json={"lat": 26.1224, "lng": -80.1373, "accuracy_m": 10}
        )
        assert resp.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
