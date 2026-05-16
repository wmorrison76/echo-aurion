"""
iter263.4 Backend Tests — IRD Menu Builder + Spa Menu Builder + New Auth Profiles

Tests:
- IRD Builder: menu CRUD, publish, QR, orders, route-print
- IRD Public: guest menu + order (no auth)
- Spa Builder: menu CRUD, publish, QR, bookings
- Spa Public: guest menu + booking (no auth)
- Auth: new profiles (ird-manager, spa-director, spa-manager)
"""
import os
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestIRDBuilderMenu:
    """IRD Menu Builder endpoints"""

    def test_get_ird_menu_main(self, api):
        """GET /api/ird-builder/menu returns main menu with 5 sections, 49+ items"""
        r = api.get(f"{BASE_URL}/api/ird-builder/menu")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("title") == "In-Room Dining", f"Expected title 'In-Room Dining', got {data.get('title')}"
        sections = data.get("sections", [])
        assert len(sections) >= 5, f"Expected 5+ sections, got {len(sections)}"
        # Count total items
        total_items = sum(len(s.get("items", [])) for s in sections)
        assert total_items >= 49, f"Expected 49+ items, got {total_items}"
        print(f"✓ IRD main menu: {len(sections)} sections, {total_items} items")

    def test_get_ird_menu_amenities(self, api):
        """GET /api/ird-builder/menu?slug=amenities returns 4 sections"""
        r = api.get(f"{BASE_URL}/api/ird-builder/menu?slug=amenities")
        assert r.status_code == 200
        data = r.json()
        sections = data.get("sections", [])
        assert len(sections) >= 4, f"Expected 4+ sections (Flowers/Celebration/Family/Wellness), got {len(sections)}"
        section_ids = [s.get("id") for s in sections]
        expected = ["flowers", "celebration", "family", "wellness"]
        for exp in expected:
            assert exp in section_ids, f"Missing section '{exp}'"
        print(f"✓ Amenities menu: {len(sections)} sections")

    def test_put_ird_menu(self, api):
        """PUT /api/ird-builder/menu saves menu"""
        # First get current menu
        r = api.get(f"{BASE_URL}/api/ird-builder/menu")
        menu = r.json()
        menu["subtitle"] = f"Updated at {datetime.now().isoformat()}"
        
        r = api.put(f"{BASE_URL}/api/ird-builder/menu", json=menu)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print("✓ PUT /api/ird-builder/menu saves successfully")

    def test_publish_ird_menu_test_mode(self, api):
        """POST /api/ird-builder/publish with test_mode=true"""
        r = api.post(f"{BASE_URL}/api/ird-builder/publish", json={"slug": "main", "test_mode": True})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("is_live") is True
        assert data.get("test_mode") is True
        print("✓ Publish test mode works")


class TestIRDBuilderQR:
    """IRD QR code endpoint"""

    def test_qr_main(self, api):
        """GET /api/ird-builder/qr?slug=main returns url, svg, data_url"""
        r = api.get(f"{BASE_URL}/api/ird-builder/qr?slug=main")
        assert r.status_code == 200
        data = r.json()
        assert "url" in data
        assert "svg" in data
        assert "data_url" in data
        assert "main" in data["svg"], "SVG should contain slug 'main'"
        print(f"✓ QR endpoint returns: {data['url']}")


class TestIRDBuilderOrders:
    """IRD order management"""

    def test_create_order(self, api):
        """POST /api/ird-builder/orders creates order with 20% service charge"""
        order = {
            "room_no": "TEST-101",
            "guest_name": "Test Guest",
            "items": [
                {"item_id": "b1", "name": "Fruits & Berries Plate", "qty": 2, "unit_price": 16.0},
                {"item_id": "b3", "name": "Cage Free Eggs", "qty": 1, "unit_price": 22.0}
            ],
            "section": "main",
            "test_mode": True
        }
        r = api.post(f"{BASE_URL}/api/ird-builder/orders", json=order)
        assert r.status_code == 200
        data = r.json()
        assert "order_id" in data
        # Total = 2*16 + 1*22 = 54, grand_total = 54 * 1.20 = 64.80
        expected_total = 54.0
        expected_grand = 64.80
        assert abs(data.get("total", 0) - expected_total) < 0.01, f"Expected total {expected_total}, got {data.get('total')}"
        assert abs(data.get("grand_total", 0) - expected_grand) < 0.01, f"Expected grand_total {expected_grand}, got {data.get('grand_total')}"
        print(f"✓ Order created: {data['order_id']}, grand_total=${data['grand_total']}")
        return data["order_id"]

    def test_list_orders(self, api):
        """GET /api/ird-builder/orders lists orders"""
        r = api.get(f"{BASE_URL}/api/ird-builder/orders")
        assert r.status_code == 200
        data = r.json()
        assert "orders" in data
        print(f"✓ Orders list: {data.get('count', len(data['orders']))} orders")

    def test_list_orders_test_mode_filter(self, api):
        """GET /api/ird-builder/orders?test_mode=true filters correctly"""
        r = api.get(f"{BASE_URL}/api/ird-builder/orders?test_mode=true")
        assert r.status_code == 200
        data = r.json()
        for order in data.get("orders", []):
            assert order.get("test_mode") is True, "Filter should return only test orders"
        print(f"✓ Test mode filter works: {len(data.get('orders', []))} test orders")

    def test_route_to_printer(self, api):
        """POST /api/ird-builder/orders/{id}/route-print returns ticket + sets status"""
        # First create an order
        order = {
            "room_no": "TEST-PRINT",
            "items": [{"item_id": "test", "name": "Test Item", "qty": 1, "unit_price": 10.0}],
            "test_mode": True
        }
        r = api.post(f"{BASE_URL}/api/ird-builder/orders", json=order)
        order_id = r.json().get("order_id")
        
        # Route to printer
        r = api.post(f"{BASE_URL}/api/ird-builder/orders/{order_id}/route-print?station=main-kitchen")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "ticket" in data
        assert "IRD ORDER" in data["ticket"]
        print(f"✓ Route to printer works, ticket generated")


class TestIRDPublic:
    """Public guest endpoints (no auth)"""

    def test_public_menu(self, api):
        """GET /api/ird-public/menu returns menu (preview if not published)"""
        r = api.get(f"{BASE_URL}/api/ird-public/menu")
        assert r.status_code == 200
        data = r.json()
        assert "title" in data
        assert "sections" in data
        print(f"✓ Public menu: {data.get('title')}, preview={data.get('_preview', False)}")

    def test_public_order(self, api):
        """POST /api/ird-public/order creates order (auto-flags test_mode)"""
        order = {
            "room_no": "PUBLIC-201",
            "guest_name": "Public Guest",
            "items": [{"item_id": "a1", "name": "Buffalo Chicken", "qty": 1, "unit_price": 26.0}],
            "section": "main"
        }
        r = api.post(f"{BASE_URL}/api/ird-public/order", json=order)
        assert r.status_code == 200
        data = r.json()
        assert "order_id" in data
        # Should auto-flag test_mode based on menu state
        print(f"✓ Public order created: {data['order_id']}, test_mode={data.get('test_mode')}")


class TestSpaBuilderMenu:
    """Spa Menu Builder endpoints"""

    def test_get_spa_menu(self, api):
        """GET /api/spa-builder/menu returns Zenova Spa with 9 categories, 54+ services"""
        r = api.get(f"{BASE_URL}/api/spa-builder/menu")
        assert r.status_code == 200
        data = r.json()
        assert "Zenova" in data.get("title", ""), f"Expected Zenova in title, got {data.get('title')}"
        categories = data.get("categories", [])
        assert len(categories) >= 9, f"Expected 9+ categories, got {len(categories)}"
        # Count services
        total_services = sum(len(c.get("services", [])) for c in categories)
        assert total_services >= 54, f"Expected 54+ services, got {total_services}"
        # Check policies
        policies = data.get("policies", [])
        assert len(policies) >= 7, f"Expected 7+ policies, got {len(policies)}"
        print(f"✓ Spa menu: {len(categories)} categories, {total_services} services, {len(policies)} policies")

    def test_put_spa_menu(self, api):
        """PUT /api/spa-builder/menu saves menu"""
        r = api.get(f"{BASE_URL}/api/spa-builder/menu")
        menu = r.json()
        menu["subtitle"] = f"Updated {datetime.now().isoformat()}"
        
        r = api.put(f"{BASE_URL}/api/spa-builder/menu", json=menu)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        print("✓ PUT /api/spa-builder/menu saves successfully")

    def test_publish_spa_menu(self, api):
        """POST /api/spa-builder/publish flips is_live"""
        r = api.post(f"{BASE_URL}/api/spa-builder/publish", json={"slug": "main", "test_mode": True})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("is_live") is True
        print("✓ Spa publish works")


class TestSpaBuilderQR:
    """Spa QR endpoint"""

    def test_qr(self, api):
        """GET /api/spa-builder/qr returns url, svg, data_url"""
        r = api.get(f"{BASE_URL}/api/spa-builder/qr")
        assert r.status_code == 200
        data = r.json()
        assert "url" in data
        assert "svg" in data
        assert "data_url" in data
        print(f"✓ Spa QR: {data['url']}")


class TestSpaBuilderBookings:
    """Spa booking management"""

    def test_create_booking(self, api):
        """POST /api/spa-builder/booking-request creates booking with status=pending"""
        booking = {
            "guest_name": "Test Spa Guest",
            "room_no": "SPA-301",
            "service_id": "custom",
            "service_name": "Zhenova Custom Massage",
            "duration_minutes": 60,
            "price": 240.0,
            "requested_for": "2026-05-02T14:00"
        }
        r = api.post(f"{BASE_URL}/api/spa-builder/booking-request", json=booking)
        assert r.status_code == 200
        data = r.json()
        assert "booking_id" in data
        assert data.get("status") == "pending"
        print(f"✓ Booking created: {data['booking_id']}, status={data['status']}")

    def test_list_bookings(self, api):
        """GET /api/spa-builder/bookings lists pending requests"""
        r = api.get(f"{BASE_URL}/api/spa-builder/bookings")
        assert r.status_code == 200
        data = r.json()
        assert "bookings" in data
        print(f"✓ Bookings list: {data.get('count', len(data['bookings']))} bookings")


class TestSpaPublic:
    """Public spa endpoints (no auth)"""

    def test_public_menu(self, api):
        """GET /api/spa-public/menu returns menu"""
        r = api.get(f"{BASE_URL}/api/spa-public/menu")
        assert r.status_code == 200
        data = r.json()
        assert "title" in data
        assert "categories" in data
        print(f"✓ Public spa menu: {data.get('title')}")

    def test_public_booking(self, api):
        """POST /api/spa-public/booking-request creates booking"""
        booking = {
            "guest_name": "Public Spa Guest",
            "room_no": "PUB-401",
            "service_id": "florida",
            "service_name": "Authentic Florida",
            "duration_minutes": 100,
            "price": 425.0,
            "requested_for": "2026-05-03T10:00"
        }
        r = api.post(f"{BASE_URL}/api/spa-public/booking-request", json=booking)
        assert r.status_code == 200
        data = r.json()
        assert "booking_id" in data
        print(f"✓ Public booking created: {data['booking_id']}")


class TestAuthNewProfiles:
    """New auth profiles: ird-manager, spa-director, spa-manager"""

    def test_login_ird_manager(self, api):
        """POST /api/auth/jwt/login with ird@luccca.com returns role=ird-manager"""
        r = api.post(f"{BASE_URL}/api/auth/jwt/login", json={
            "email": "ird@luccca.com",
            "password": "Welcome2026!"
        })
        assert r.status_code == 200, f"IRD login failed: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        user = data.get("user", {})
        assert user.get("role") == "ird-manager", f"Expected role 'ird-manager', got {user.get('role')}"
        print(f"✓ IRD Manager login: {user.get('name')}, role={user.get('role')}")

    def test_login_spa_director(self, api):
        """POST /api/auth/jwt/login with spadir@luccca.com returns role=spa-director"""
        r = api.post(f"{BASE_URL}/api/auth/jwt/login", json={
            "email": "spadir@luccca.com",
            "password": "Welcome2026!"
        })
        assert r.status_code == 200, f"Spa Director login failed: {r.text}"
        data = r.json()
        user = data.get("user", {})
        assert user.get("role") == "spa-director", f"Expected role 'spa-director', got {user.get('role')}"
        print(f"✓ Spa Director login: {user.get('name')}, role={user.get('role')}")

    def test_login_spa_manager(self, api):
        """POST /api/auth/jwt/login with spa@luccca.com returns role=spa-manager"""
        r = api.post(f"{BASE_URL}/api/auth/jwt/login", json={
            "email": "spa@luccca.com",
            "password": "Welcome2026!"
        })
        assert r.status_code == 200, f"Spa Manager login failed: {r.text}"
        data = r.json()
        user = data.get("user", {})
        assert user.get("role") == "spa-manager", f"Expected role 'spa-manager', got {user.get('role')}"
        print(f"✓ Spa Manager login: {user.get('name')}, role={user.get('role')}")


class TestRegression:
    """Regression tests for previous iter263.3 features"""

    def test_health(self, api):
        """GET /api/health returns healthy"""
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json().get("status") == "healthy"
        print("✓ Health check passed")

    def test_admin_console_pulse(self, api):
        """GET /api/admin-console/pulse returns uptime"""
        r = api.get(f"{BASE_URL}/api/admin-console/pulse")
        assert r.status_code == 200
        data = r.json()
        assert "uptime_seconds" in data
        print(f"✓ Admin pulse: uptime={data.get('uptime_seconds')}s")

    def test_beo_calendar(self, api):
        """GET /api/beo-planner/calendar returns days with BEOs"""
        r = api.get(f"{BASE_URL}/api/beo-planner/calendar")
        assert r.status_code == 200
        data = r.json()
        assert "days" in data
        print(f"✓ BEO calendar: {len(data.get('days', []))} days")

    def test_vendor_scorecards(self, api):
        """GET /api/vendor-scorecard/scorecards returns vendors"""
        r = api.get(f"{BASE_URL}/api/vendor-scorecard/scorecards")
        assert r.status_code == 200
        data = r.json()
        assert "scorecards" in data
        print(f"✓ Vendor scorecards: {len(data.get('scorecards', []))} vendors")
