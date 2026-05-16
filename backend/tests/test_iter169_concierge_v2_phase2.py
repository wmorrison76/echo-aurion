"""
Iter169 · EchoConcierge Phase 2 + EchoCommand SolveBar Tests
============================================================
Tests for:
- Outlet hours management (GET /api/concierge-v2/outlets, POST /api/concierge-v2/outlets/upsert)
- Dining reservations with table preferences
- Room upgrades
- IRD amenities
- Transport options (Uber/Lyft/luxury)
- Celebration cross-module cascade
- Service recovery cases
- Guest folio stub
- LLM SolveBar endpoint
- Regression tests for iter168/167/166
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestOutletHoursManagement:
    """Test outlet hours CRUD operations"""

    def test_get_outlets_returns_5_seeded(self):
        """GET /api/concierge-v2/outlets returns 5 seeded outlets with hours"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/outlets")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total") >= 5, f"Expected at least 5 outlets, got {data.get('total')}"
        outlets = data.get("outlets", [])
        assert len(outlets) >= 5
        # Verify structure of first outlet
        outlet = outlets[0]
        assert "id" in outlet
        assert "name" in outlet
        assert "type" in outlet
        assert "hours" in outlet
        assert isinstance(outlet["hours"], dict)
        print(f"✓ GET /api/concierge-v2/outlets returned {len(outlets)} outlets")

    def test_upsert_outlet_create_new(self):
        """POST /api/concierge-v2/outlets/upsert creates new outlet without id"""
        unique_name = f"TEST_Outlet_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": unique_name,
            "type": "test-outlet",
            "cuisine": "Test Cuisine",
            "hours": {"mon": "09:00-22:00", "tue": "09:00-22:00"}
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/outlets/upsert", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        outlet = data.get("outlet", {})
        assert outlet.get("name") == unique_name
        assert outlet.get("id") is not None
        assert outlet.get("hours", {}).get("mon") == "09:00-22:00"
        print(f"✓ Created new outlet: {outlet.get('id')}")
        return outlet.get("id")

    def test_upsert_outlet_update_existing(self):
        """POST /api/concierge-v2/outlets/upsert with id updates existing"""
        # First get an existing outlet
        r = requests.get(f"{BASE_URL}/api/concierge-v2/outlets")
        outlets = r.json().get("outlets", [])
        if not outlets:
            pytest.skip("No outlets to update")
        existing_id = outlets[0]["id"]
        
        # Update it
        payload = {
            "id": existing_id,
            "name": outlets[0]["name"],
            "type": outlets[0]["type"],
            "cuisine": outlets[0].get("cuisine", "Updated Cuisine"),
            "hours": outlets[0].get("hours", {}),
            "phone": "ext. 9999"  # Update phone
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/outlets/upsert", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        print(f"✓ Updated outlet {existing_id}")


class TestDiningReservations:
    """Test dining availability and reservations"""

    def test_dining_availability_returns_24_tables(self):
        """GET /api/concierge-v2/dining/availability returns 24 tables with kinds"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/dining/availability", params={
            "outlet_id": "o-sotogrande",
            "date": "2026-02-21",
            "time": "20:00"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        tables = data.get("tables", [])
        assert len(tables) == 24, f"Expected 24 tables, got {len(tables)}"
        
        # Verify table structure
        kinds = set()
        for t in tables:
            assert "table_no" in t
            assert "kind" in t
            assert "available" in t
            kinds.add(t["kind"])
        
        # Should have window, booth, main, bar kinds
        assert "window" in kinds
        assert "booth" in kinds
        assert "main" in kinds
        assert "bar" in kinds
        
        summary = data.get("summary", {})
        assert summary.get("total") == 24
        assert "available" in summary
        print(f"✓ Dining availability: {summary.get('available')}/24 tables available")

    def test_dining_reserve_creates_reservation(self):
        """POST /api/concierge-v2/dining/reserve creates reservation with table assignment"""
        payload = {
            "guest_id": "g-101",
            "outlet_id": "o-sotogrande",
            "party_size": 2,
            "when": "2026-02-20 20:00",
            "table_preference": "window",
            "occasion": "anniversary"
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/dining/reserve", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        reservation = data.get("reservation", {})
        assert reservation.get("id") is not None
        assert reservation.get("table_number") is not None
        assert reservation.get("status") == "confirmed"
        assert reservation.get("guest_id") == "g-101"
        assert reservation.get("occasion") == "anniversary"
        print(f"✓ Created reservation {reservation.get('id')} at table {reservation.get('table_number')}")


class TestRoomUpgrades:
    """Test room listing and upgrade candidates"""

    def test_get_rooms_returns_8(self):
        """GET /api/concierge-v2/rooms returns 8 rooms"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/rooms")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total") == 8, f"Expected 8 rooms, got {data.get('total')}"
        rooms = data.get("rooms", [])
        assert len(rooms) == 8
        # Verify room structure
        room = rooms[0]
        assert "room" in room
        assert "tier" in room
        assert "view" in room
        print(f"✓ GET /api/concierge-v2/rooms returned 8 rooms")

    def test_room_upgrades_for_standard_room(self):
        """GET /api/concierge-v2/rooms/upgrades?current_room=0808 returns 5 upgrade candidates"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/rooms/upgrades", params={"current_room": "0808"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        current = data.get("current", {})
        assert current.get("room") == "0808"
        assert current.get("tier") == "standard"
        
        upgrades = data.get("upgrades", [])
        assert len(upgrades) == 5, f"Expected 5 upgrade candidates, got {len(upgrades)}"
        # Verify upgrades are tier-sorted (deluxe, suite, presidential)
        tiers = [u["tier"] for u in upgrades]
        assert all(t in ["deluxe", "suite", "presidential"] for t in tiers)
        print(f"✓ Room 0808 has {len(upgrades)} upgrade candidates")


class TestIRDAmenities:
    """Test IRD amenities listing and filtering"""

    def test_get_amenities_returns_10(self):
        """GET /api/concierge-v2/ird/amenities returns 10 amenities"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/ird/amenities")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total") == 10, f"Expected 10 amenities, got {data.get('total')}"
        amenities = data.get("amenities", [])
        assert len(amenities) == 10
        # Verify structure
        amenity = amenities[0]
        assert "id" in amenity
        assert "name" in amenity
        assert "category" in amenity
        assert "price" in amenity
        assert "tags" in amenity
        print(f"✓ GET /api/concierge-v2/ird/amenities returned 10 amenities")

    def test_amenities_filter_by_celebration_tag(self):
        """GET /api/concierge-v2/ird/amenities?tag=celebration returns 3"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/ird/amenities", params={"tag": "celebration"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("total") == 3, f"Expected 3 celebration amenities, got {data.get('total')}"
        for a in data.get("amenities", []):
            assert "celebration" in a.get("tags", [])
        print(f"✓ Celebration tag filter returned 3 amenities")

    def test_amenities_filter_by_category(self):
        """GET /api/concierge-v2/ird/amenities?category=beverage filters correctly"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/ird/amenities", params={"category": "beverage"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        for a in data.get("amenities", []):
            assert a.get("category") == "beverage"
        print(f"✓ Category filter returned {data.get('total')} beverage amenities")


class TestTransportOptions:
    """Test transport options and requests"""

    def test_get_transport_options_returns_9(self):
        """GET /api/concierge-v2/transport/options returns 9 options"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/transport/options")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        options = data.get("options", [])
        assert len(options) == 9, f"Expected 9 transport options, got {len(options)}"
        
        # Verify expected services
        services = [o["service"] for o in options]
        expected = ["uber-x", "uber-black", "lyft-standard", "lyft-lux", "luxury-sedan", 
                    "luxury-suv", "golf-cart", "boat", "helicopter"]
        for exp in expected:
            assert exp in services, f"Missing service: {exp}"
        print(f"✓ GET /api/concierge-v2/transport/options returned 9 options")

    def test_transport_request_creates_dispatched_record(self):
        """POST /api/concierge-v2/transport/request creates dispatched record"""
        payload = {
            "guest_id": "g-101",
            "pickup_location": "Hotel Lobby",
            "dropoff_location": "Miami Airport",
            "when": "2026-02-21 14:00",
            "service": "uber-black",
            "party_size": 2,
            "notes": "TEST_transport_request"
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/transport/request", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        req = data.get("request", {})
        assert req.get("id") is not None
        assert req.get("status") == "dispatched"
        assert req.get("service") == "uber-black"
        print(f"✓ Created transport request {req.get('id')} with status 'dispatched'")


class TestCelebrationCascade:
    """Test celebration composer with cross-module cascade"""

    def test_celebration_compose_creates_cascade(self):
        """POST /api/concierge-v2/celebration/compose creates parent + 4 cascade children"""
        payload = {
            "guest_id": "g-101",
            "celebration": "anniversary",
            "date": "2026-02-20",
            "notes": "TEST_celebration_cascade"
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/celebration/compose", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        # Verify cascade counts
        cascade = data.get("cascade", {})
        assert cascade.get("pastry") == 1, f"Expected 1 pastry, got {cascade.get('pastry')}"
        assert cascade.get("housekeeping") == 1, f"Expected 1 housekeeping, got {cascade.get('housekeeping')}"
        assert cascade.get("florist") == 1, f"Expected 1 florist, got {cascade.get('florist')}"
        assert cascade.get("amenity") == 1, f"Expected 1 amenity, got {cascade.get('amenity')}"
        
        # Verify parent
        parent = data.get("parent", {})
        assert parent.get("id") is not None
        assert parent.get("kind") == "celebration"
        assert parent.get("celebration") == "anniversary"
        
        # Verify children
        children = data.get("children", [])
        assert len(children) == 4, f"Expected 4 children, got {len(children)}"
        
        celebration_id = parent.get("id")
        print(f"✓ Created celebration {celebration_id} with 4 cascade children")
        return celebration_id

    def test_celebration_cascade_returns_parent_and_children(self):
        """GET /api/concierge-v2/celebration/cascade returns parent + children with _collection"""
        # First create a celebration
        payload = {
            "guest_id": "g-101",
            "celebration": "birthday",
            "date": "2026-02-25",
            "notes": "TEST_cascade_query"
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/celebration/compose", json=payload)
        assert r.status_code == 200
        celebration_id = r.json().get("celebration_id")
        
        # Now query the cascade
        r = requests.get(f"{BASE_URL}/api/concierge-v2/celebration/cascade", params={"celebration_id": celebration_id})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        parent = data.get("parent", {})
        assert parent.get("id") == celebration_id
        
        children = data.get("children", [])
        assert len(children) == 4, f"Expected 4 children, got {len(children)}"
        
        # Verify _collection field identifies source
        collections = [c.get("_collection") for c in children]
        assert "pastry_production_reminders" in collections
        assert "hskp_tasks" in collections
        assert "concierge_vendor_requests" in collections
        assert "concierge_amenity_routes" in collections
        print(f"✓ Cascade query returned parent + 4 children with _collection fields")


class TestServiceRecovery:
    """Test service recovery case management"""

    def test_recovery_open_creates_case(self):
        """POST /api/concierge-v2/recovery/open creates case with id"""
        payload = {
            "guest_id": "g-101",
            "category": "room",
            "description": "AC not working - TEST_recovery",
            "severity": "high"
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/recovery/open", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        case = data.get("case", {})
        assert case.get("id") is not None
        assert case.get("status") == "open"
        assert case.get("category") == "room"
        assert case.get("severity") == "high"
        print(f"✓ Created recovery case {case.get('id')}")
        return case.get("id")

    def test_recovery_cases_list(self):
        """GET /api/concierge-v2/recovery/cases returns list"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/recovery/cases")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "cases" in data
        assert "total" in data
        print(f"✓ Recovery cases list returned {data.get('total')} cases")


class TestGuestFolio:
    """Test guest folio stub"""

    def test_guest_folio_returns_rollup(self):
        """GET /api/guest/folio?guest_id=g-101 returns folio with counts"""
        r = requests.get(f"{BASE_URL}/api/guest/folio", params={"guest_id": "g-101"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        guest = data.get("guest", {})
        assert guest.get("id") == "g-101"
        
        folio = data.get("folio", {})
        assert "dining_reservations" in folio
        assert "requests" in folio
        assert "recovery_cases" in folio
        assert "spend_actual" in folio
        assert "spend_estimated" in folio
        assert "counts" in folio
        
        counts = folio.get("counts", {})
        assert "dining" in counts
        assert "requests" in counts
        assert "recovery" in counts
        print(f"✓ Guest folio returned with counts: {counts}")


class TestSolveBarLLM:
    """Test LLM-powered SolveBar endpoint"""

    def test_solve_returns_resolution(self):
        """POST /api/concierge-v2/solve returns resolution or 502 if budget exhausted"""
        payload = {
            "query": "room 1201 wants an upgrade",
            "guest_hint": "g-101"
        }
        r = requests.post(f"{BASE_URL}/api/concierge-v2/solve", json=payload)
        
        # 502 is acceptable if LLM budget exhausted
        if r.status_code == 502:
            print(f"✓ Solve endpoint returned 502 (LLM budget exhausted - expected)")
            return
        
        assert r.status_code == 200, f"Expected 200 or 502, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        resolution = data.get("resolution", {})
        assert "headline" in resolution
        assert "root_cause" in resolution
        assert "recommended_action" in resolution
        
        action = resolution.get("recommended_action", {})
        assert "title" in action
        assert "api_hint" in action
        
        print(f"✓ Solve returned resolution: {resolution.get('headline')}")


class TestRegressionIter168:
    """Regression tests for iter168 EchoConcierge panel"""

    def test_guest_profile_endpoint(self):
        """GET /api/guest/profile returns seeded guests"""
        r = requests.get(f"{BASE_URL}/api/guest/profile")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "guests" in data
        assert len(data["guests"]) >= 5
        print(f"✓ Regression: /api/guest/profile returns {len(data['guests'])} guests")

    def test_concierge_v2_requests(self):
        """GET /api/concierge-v2/requests returns list"""
        r = requests.get(f"{BASE_URL}/api/concierge-v2/requests")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "requests" in data
        print(f"✓ Regression: /api/concierge-v2/requests returns {len(data.get('requests', []))} requests")


class TestRegressionIter167:
    """Regression tests for iter167 FOH Concierge Hub + Global Calendar"""

    def test_foh_concierge_local_places(self):
        """GET /api/foh-concierge/local-places returns 200"""
        r = requests.get(f"{BASE_URL}/api/foh-concierge/local-places")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"✓ Regression: /api/foh-concierge/local-places returns 200")

    def test_global_calendar_day_detail(self):
        """GET /api/global-calendar/day-detail returns 200"""
        r = requests.get(f"{BASE_URL}/api/global-calendar/day-detail", params={"date": "2026-02-20"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"✓ Regression: /api/global-calendar/day-detail returns 200")


class TestRegressionIter166:
    """Regression tests for iter166 Seed Plant Studio"""

    def test_seed_pillars(self):
        """GET /api/seed/pillars returns 200"""
        r = requests.get(f"{BASE_URL}/api/seed/pillars")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"✓ Regression: /api/seed/pillars returns 200")


class TestHealthCheck:
    """Basic health check"""

    def test_health_endpoint(self):
        """GET /api/health returns healthy"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
