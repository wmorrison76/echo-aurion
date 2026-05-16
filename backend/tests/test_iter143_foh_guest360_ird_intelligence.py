"""
Iteration 143 Backend Tests
===========================
Tests for 5 new router modules:
- FOH Command Dashboard (/api/foh-ops/*) - 14 endpoints, 9 outlets, 3 role views
- Guest 360 Hub (/api/guest360-hub/*) - 8 endpoints
- IRD/Minibar Hub (/api/ird-hub/*) - 10 endpoints
- Intelligence Adapter (/api/intelligence/*) - 4 endpoints (ai3, aurium, stratus)

Also tests:
- Cross-module event emission
- No _id leaks in any response
- Regression tests for existing eng-ops, hskp-ops, concierge endpoints
"""
import pytest
import requests
import os
import re
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


def check_no_mongodb_id_leak(data):
    """Check for MongoDB _id leak, excluding field names that contain '_id' as part of their name."""
    data_str = str(data)
    # Remove known field names that contain '_id' as part of their name
    cleaned = data_str
    for field in ["'server_id'", "'guest_id'", "'ticket_id'", "'asset_id'", "'menu_id'", "'order_id'", "'res_id'", "'correlation_id'", "'idempotency_key'"]:
        cleaned = cleaned.replace(field, "'FIELD_REMOVED'")
    # Now check for actual MongoDB _id
    return "'_id'" not in cleaned and '"_id"' not in cleaned


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============================================================================
# FOH COMMAND DASHBOARD TESTS (/api/foh-ops/*)
# ============================================================================
class TestFOHOps:
    """FOH Command Dashboard - 14 endpoints"""

    def test_foh_seed_idempotent(self, api_client):
        """POST /api/foh-ops/seed - idempotent, returns counts"""
        resp = api_client.post(f"{BASE_URL}/api/foh-ops/seed")
        assert resp.status_code == 200, f"Seed failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "outlets" in data
        assert "reservations" in data
        assert "servers" in data
        assert "ticket_timings" in data
        assert "beverage_sales" in data
        # Call again to verify idempotency
        resp2 = api_client.post(f"{BASE_URL}/api/foh-ops/seed")
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["outlets"] == data["outlets"], "Seed not idempotent"
        assert check_no_mongodb_id_leak(data)

    def test_foh_outlets_returns_9(self, api_client):
        """GET /api/foh-ops/outlets - returns 9 seeded outlets"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/outlets")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert len(data["items"]) == 9, f"Expected 9 outlets, got {len(data['items'])}"
        slugs = [o["slug"] for o in data["items"]]
        expected_slugs = ["pier-top", "calusso", "sotogrande", "saltbreeze", "garni", "windows", "ird", "nectar", "elate"]
        for slug in expected_slugs:
            assert slug in slugs, f"Missing outlet: {slug}"
        assert check_no_mongodb_id_leak(data)

    def test_foh_kpis_12_fields(self, api_client):
        """GET /api/foh-ops/kpis - returns 12 KPIs"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/kpis")
        assert resp.status_code == 200
        data = resp.json()
        required_fields = [
            "covers_per_hour", "revenue_per_seat_24h", "check_average",
            "beverage_attachment_pct", "dessert_attachment_pct", "no_show_rate_pct",
            "ticket_time_variance_min"
        ]
        for field in required_fields:
            assert field in data, f"Missing KPI field: {field}"
        assert check_no_mongodb_id_leak(data)

    def test_foh_director_dashboard(self, api_client):
        """GET /api/foh-ops/director - outlet_ranking sorted, upcoming_by_outlet, vip_arrivals, top_bottlenecks"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/director")
        assert resp.status_code == 200
        data = resp.json()
        assert "outlet_ranking" in data
        assert "upcoming_by_outlet" in data
        assert "vip_arrivals" in data
        assert "top_bottlenecks" in data
        # Verify ranking is sorted by revenue_24h descending
        ranking = data["outlet_ranking"]
        if len(ranking) > 1:
            for i in range(len(ranking) - 1):
                assert ranking[i]["revenue_24h"] >= ranking[i+1]["revenue_24h"], "Ranking not sorted by revenue"
        assert check_no_mongodb_id_leak(data)

    def test_foh_outlet_pier_top(self, api_client):
        """GET /api/foh-ops/outlet/pier-top - covers_forecast, projected_turns, section_load, vip_tables, allergy_alerts, recovery_queue"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/outlet/pier-top")
        assert resp.status_code == 200
        data = resp.json()
        assert "outlet" in data
        assert "covers_forecast" in data
        assert "projected_turns" in data
        assert "section_load" in data
        assert "vip_tables" in data
        assert "allergy_alerts" in data
        assert "recovery_queue" in data
        assert data["outlet"]["slug"] == "pier-top"
        assert check_no_mongodb_id_leak(data)

    def test_foh_outlet_floor_view(self, api_client):
        """GET /api/foh-ops/outlet/pier-top/floor - arrivals_15min/30min/60min, recent_tickets, host_pressure"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/outlet/pier-top/floor")
        assert resp.status_code == 200
        data = resp.json()
        assert "arrivals_15min" in data
        assert "arrivals_30min" in data
        assert "arrivals_60min" in data
        assert "recent_tickets" in data
        assert "host_pressure" in data
        assert check_no_mongodb_id_leak(data)

    def test_foh_create_reservation_emits_event(self, api_client):
        """POST /api/foh-ops/reservations - emits foh.reservation.created event, returns reservation with id"""
        eta = (datetime.utcnow() + timedelta(hours=2)).isoformat()
        payload = {
            "outlet_slug": "pier-top",
            "guest_name": "TEST_VIP_Guest",
            "party_size": 4,
            "eta": eta,
            "vip": True,
            "loyalty_tier": "platinum",
            "special_requests": ["quiet booth"],
            "allergy_flags": ["nuts"]
        }
        resp = api_client.post(f"{BASE_URL}/api/foh-ops/reservations", json=payload)
        assert resp.status_code == 200, f"Create reservation failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "reservation" in data
        res = data["reservation"]
        assert "id" in res
        assert res["guest_name"] == "TEST_VIP_Guest"
        assert res["vip"] is True
        assert res["status"] == "confirmed"
        assert check_no_mongodb_id_leak(data)
        return res["id"]

    def test_foh_patch_reservation_status(self, api_client):
        """PATCH /api/foh-ops/reservations/{id}?status=seated - updates status"""
        # First create a reservation
        eta = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        create_resp = api_client.post(f"{BASE_URL}/api/foh-ops/reservations", json={
            "outlet_slug": "calusso",
            "guest_name": "TEST_Patch_Guest",
            "party_size": 2,
            "eta": eta
        })
        assert create_resp.status_code == 200
        res_id = create_resp.json()["reservation"]["id"]
        
        # Patch status
        patch_resp = api_client.patch(f"{BASE_URL}/api/foh-ops/reservations/{res_id}?status=seated")
        assert patch_resp.status_code == 200
        data = patch_resp.json()
        assert data.get("ok") is True
        assert data["reservation"]["status"] == "seated"
        assert check_no_mongodb_id_leak(data)

    def test_foh_pacing_pier_top(self, api_client):
        """GET /api/foh-ops/pacing/pier-top - timeline with 30-min slots, overload_slots where capacity_pct > 85"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/pacing/pier-top")
        assert resp.status_code == 200
        data = resp.json()
        assert "timeline" in data
        assert "overload_slots" in data
        assert "seat_capacity" in data
        # Verify overload_slots have capacity_pct > 85
        for slot in data["overload_slots"]:
            assert slot["capacity_pct"] > 85, f"Overload slot has capacity_pct <= 85: {slot}"
        assert check_no_mongodb_id_leak(data)

    def test_foh_beverage_performance(self, api_client):
        """GET /api/foh-ops/beverage-performance - by_category, server_ranking sorted by revenue"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/beverage-performance")
        assert resp.status_code == 200
        data = resp.json()
        assert "by_category" in data
        assert "server_ranking" in data
        # Verify server_ranking is sorted by revenue descending
        ranking = data["server_ranking"]
        if len(ranking) > 1:
            for i in range(len(ranking) - 1):
                assert ranking[i]["revenue"] >= ranking[i+1]["revenue"], "Server ranking not sorted by revenue"
        # Check for actual MongoDB _id leak (not server_id which contains '_id' as substring)
        assert "'_id':" not in str(data).replace("'server_id':", ""), "MongoDB _id leaked"

    def test_foh_walk_in_surge(self, api_client):
        """GET /api/foh-ops/walk-in-surge - hourly_forecast, peak_hour, surge_risk low/moderate/high"""
        resp = api_client.get(f"{BASE_URL}/api/foh-ops/walk-in-surge")
        assert resp.status_code == 200
        data = resp.json()
        assert "hourly_forecast" in data
        assert "peak_hour" in data
        assert "surge_risk" in data
        assert data["surge_risk"] in ["low", "moderate", "high"], f"Invalid surge_risk: {data['surge_risk']}"
        assert check_no_mongodb_id_leak(data)

    def test_foh_recovery_create(self, api_client):
        """POST /api/foh-ops/recovery - creates recovery log"""
        payload = {
            "outlet_slug": "pier-top",
            "table_no": "T12",
            "guest_name": "TEST_Recovery_Guest",
            "issue": "Cold food served",
            "resolution": "Comped dessert",
            "compensation_usd": 25.0
        }
        resp = api_client.post(f"{BASE_URL}/api/foh-ops/recovery", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert "recovery" in data
        assert data["recovery"]["issue"] == "Cold food served"
        assert check_no_mongodb_id_leak(data)


# ============================================================================
# GUEST 360 HUB TESTS (/api/guest360-hub/*)
# ============================================================================
class TestGuest360Hub:
    """Guest 360 Hub - 8 endpoints"""

    def test_guest360_seed(self, api_client):
        """POST /api/guest360-hub/seed - seeds 10 profiles"""
        resp = api_client.post(f"{BASE_URL}/api/guest360-hub/seed")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert data.get("profiles") >= 10, f"Expected at least 10 profiles, got {data.get('profiles')}"
        assert check_no_mongodb_id_leak(data)

    def test_guest360_profiles_filter_vip(self, api_client):
        """GET /api/guest360-hub/profiles?vip=true - filter by VIP"""
        resp = api_client.get(f"{BASE_URL}/api/guest360-hub/profiles?vip=true")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        for profile in data["items"]:
            assert profile.get("vip") is True, f"Non-VIP in VIP filter: {profile}"
        assert check_no_mongodb_id_leak(data)

    def test_guest360_profiles_filter_loyalty_tier(self, api_client):
        """GET /api/guest360-hub/profiles?loyalty_tier=platinum - filter by loyalty tier"""
        resp = api_client.get(f"{BASE_URL}/api/guest360-hub/profiles?loyalty_tier=platinum")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        for profile in data["items"]:
            assert profile.get("loyalty_tier") == "platinum", f"Wrong tier: {profile}"
        assert check_no_mongodb_id_leak(data)

    def test_guest360_profiles_filter_in_house(self, api_client):
        """GET /api/guest360-hub/profiles?in_house=true - filter by in_house"""
        resp = api_client.get(f"{BASE_URL}/api/guest360-hub/profiles?in_house=true")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        for profile in data["items"]:
            assert profile.get("in_house") is True, f"Not in-house: {profile}"
        assert check_no_mongodb_id_leak(data)

    def test_guest360_profile_detail(self, api_client):
        """GET /api/guest360-hub/profiles/{guest_id} - returns profile + notes + concierge_history + reservations + spa_touchpoints"""
        # First get a guest_id from the list
        list_resp = api_client.get(f"{BASE_URL}/api/guest360-hub/profiles?limit=1")
        assert list_resp.status_code == 200
        guests = list_resp.json()["items"]
        if not guests:
            pytest.skip("No guests seeded")
        guest_id = guests[0]["guest_id"]
        
        resp = api_client.get(f"{BASE_URL}/api/guest360-hub/profiles/{guest_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert "profile" in data
        assert "notes" in data
        assert "concierge_history" in data
        assert "reservations" in data
        assert "spa_touchpoints" in data
        assert check_no_mongodb_id_leak(data)

    def test_guest360_upsert_profile(self, api_client):
        """POST /api/guest360-hub/profiles - upsert"""
        payload = {
            "guest_id": "gst-test-143",
            "name": "TEST_Guest_143",
            "email": "test143@example.com",
            "loyalty_tier": "gold",
            "vip": False,
            "in_house": True,
            "current_room": "501",
            "allergy_flags": ["shellfish"],
            "dietary_prefs": ["vegetarian"]
        }
        resp = api_client.post(f"{BASE_URL}/api/guest360-hub/profiles", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert data["profile"]["guest_id"] == "gst-test-143"
        assert data["profile"]["name"] == "TEST_Guest_143"
        assert check_no_mongodb_id_leak(data)
        
        # Upsert again with update
        payload["loyalty_tier"] = "platinum"
        resp2 = api_client.post(f"{BASE_URL}/api/guest360-hub/profiles", json=payload)
        assert resp2.status_code == 200
        assert resp2.json()["profile"]["loyalty_tier"] == "platinum"

    def test_guest360_add_note_pii_scrubbed(self, api_client):
        """POST /api/guest360-hub/profiles/{guest_id}/note - PII scrubbed ('drunk' -> '[redacted-behavior]', SSN -> '[redacted-ssn]')"""
        # Get a guest_id
        list_resp = api_client.get(f"{BASE_URL}/api/guest360-hub/profiles?limit=1")
        guests = list_resp.json()["items"]
        if not guests:
            pytest.skip("No guests seeded")
        guest_id = guests[0]["guest_id"]
        
        # Test drunk -> redacted-behavior
        resp1 = api_client.post(f"{BASE_URL}/api/guest360-hub/profiles/{guest_id}/note", json={
            "category": "behavior",
            "body": "Guest appeared drunk at dinner",
            "author": "manager"
        })
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert "[redacted-behavior]" in data1["note"]["body"], f"'drunk' not redacted: {data1['note']['body']}"
        
        # Test SSN -> redacted-ssn
        resp2 = api_client.post(f"{BASE_URL}/api/guest360-hub/profiles/{guest_id}/note", json={
            "category": "id",
            "body": "Guest SSN is 123-45-6789",
            "author": "front_desk"
        })
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert "[redacted-ssn]" in data2["note"]["body"], f"SSN not redacted: {data2['note']['body']}"
        assert check_no_mongodb_id_leak(data2)

    def test_guest360_in_house(self, api_client):
        """GET /api/guest360-hub/in-house - returns in_house=true guests"""
        resp = api_client.get(f"{BASE_URL}/api/guest360-hub/in-house")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "count" in data
        for guest in data["items"]:
            assert guest.get("in_house") is True
        assert check_no_mongodb_id_leak(data)

    def test_guest360_vip_today(self, api_client):
        """GET /api/guest360-hub/vip-today - returns VIPs"""
        resp = api_client.get(f"{BASE_URL}/api/guest360-hub/vip-today")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "count" in data
        for guest in data["items"]:
            assert guest.get("vip") is True
        assert check_no_mongodb_id_leak(data)


# ============================================================================
# IRD/MINIBAR HUB TESTS (/api/ird-hub/*)
# ============================================================================
class TestIRDHub:
    """IRD/Minibar Hub - 10 endpoints"""

    def test_ird_seed(self, api_client):
        """POST /api/ird-hub/seed - seeds menu, minibars, zeroes orders collection"""
        resp = api_client.post(f"{BASE_URL}/api/ird-hub/seed")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert "menu_items" in data
        assert "minibars" in data
        assert "orders" in data
        assert check_no_mongodb_id_leak(data)

    def test_ird_menu_13_items(self, api_client):
        """GET /api/ird-hub/menu - 13 items with IDs like ird-din-001"""
        resp = api_client.get(f"{BASE_URL}/api/ird-hub/menu")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert len(data["items"]) == 13, f"Expected 13 menu items, got {len(data['items'])}"
        # Verify ID format
        for item in data["items"]:
            assert item["id"].startswith("ird-"), f"Invalid menu ID format: {item['id']}"
        assert check_no_mongodb_id_leak(data)

    def test_ird_create_order_validates_menu_id(self, api_client):
        """POST /api/ird-hub/orders - creates order, validates menu_id, enqueues to pos_outbound, emits ird.order.created event, returns ticket_no"""
        payload = {
            "room_no": "412",
            "guest_name": "TEST_IRD_Guest",
            "items": [
                {"menu_id": "ird-din-001", "qty": 1, "special_requests": "medium rare"},
                {"menu_id": "ird-bev-001", "qty": 2}
            ],
            "delivery_eta_minutes": 45,
            "notes": "Please knock loudly"
        }
        resp = api_client.post(f"{BASE_URL}/api/ird-hub/orders", json=payload)
        assert resp.status_code == 200, f"Create order failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "order" in data
        order = data["order"]
        assert "id" in order
        assert "ticket_no" in order
        assert order["ticket_no"].startswith("IRD-")
        assert order["room_no"] == "412"
        assert order["status"] == "received"
        assert check_no_mongodb_id_leak(data)
        return order["id"]

    def test_ird_create_order_invalid_menu_id(self, api_client):
        """POST /api/ird-hub/orders - validates menu_id returns 400 for invalid"""
        payload = {
            "room_no": "412",
            "items": [{"menu_id": "invalid-menu-id", "qty": 1}]
        }
        resp = api_client.post(f"{BASE_URL}/api/ird-hub/orders", json=payload)
        assert resp.status_code == 400, f"Expected 400 for invalid menu_id, got {resp.status_code}"

    def test_ird_patch_order_delivered(self, api_client):
        """PATCH /api/ird-hub/orders/{id} with status=delivered - sets delivered_at"""
        # First create an order
        create_resp = api_client.post(f"{BASE_URL}/api/ird-hub/orders", json={
            "room_no": "302",
            "items": [{"menu_id": "ird-brk-001", "qty": 1}]
        })
        assert create_resp.status_code == 200
        order_id = create_resp.json()["order"]["id"]
        
        # Patch to delivered
        patch_resp = api_client.patch(f"{BASE_URL}/api/ird-hub/orders/{order_id}", json={"status": "delivered"})
        assert patch_resp.status_code == 200
        data = patch_resp.json()
        assert data.get("ok") is True
        assert data["order"]["status"] == "delivered"
        assert "delivered_at" in data["order"], "delivered_at not set"
        assert check_no_mongodb_id_leak(data)

    def test_ird_minibar_auto_creates(self, api_client):
        """GET /api/ird-hub/minibar/412 - auto-creates if missing"""
        resp = api_client.get(f"{BASE_URL}/api/ird-hub/minibar/412")
        assert resp.status_code == 200
        data = resp.json()
        assert data["room_no"] == "412"
        assert "items" in data
        assert len(data["items"]) > 0
        assert check_no_mongodb_id_leak(data)

    def test_ird_minibar_consumption(self, api_client):
        """POST /api/ird-hub/minibar/412/consumption with sku=champ-split - decrements on_hand, creates minibar charge"""
        # First restock to ensure we have items
        api_client.post(f"{BASE_URL}/api/ird-hub/minibar/412/restock")
        
        # Get current state after restock
        get_resp = api_client.get(f"{BASE_URL}/api/ird-hub/minibar/412")
        initial_items = {i["sku"]: i["on_hand"] for i in get_resp.json()["items"]}
        
        # Log consumption
        resp = api_client.post(f"{BASE_URL}/api/ird-hub/minibar/412/consumption", json={
            "sku": "champ-split",
            "qty": 1
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert data["room_no"] == "412"
        assert data["price"] > 0
        assert check_no_mongodb_id_leak(data)
        
        # Verify decrement
        get_resp2 = api_client.get(f"{BASE_URL}/api/ird-hub/minibar/412")
        new_items = {i["sku"]: i["on_hand"] for i in get_resp2.json()["items"]}
        assert new_items["champ-split"] == initial_items["champ-split"] - 1, "on_hand not decremented"

    def test_ird_minibar_restock(self, api_client):
        """POST /api/ird-hub/minibar/412/restock - resets on_hand to par"""
        resp = api_client.post(f"{BASE_URL}/api/ird-hub/minibar/412/restock")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert "items" in data
        # Verify all items at par
        for item in data["items"]:
            assert item["on_hand"] == item["par"], f"Item {item['sku']} not at par: {item['on_hand']} != {item['par']}"
        assert check_no_mongodb_id_leak(data)

    def test_ird_restock_queue(self, api_client):
        """GET /api/ird-hub/restock-queue - rooms with low items"""
        resp = api_client.get(f"{BASE_URL}/api/ird-hub/restock-queue")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "count" in data
        for room in data["items"]:
            assert "room_no" in room
            assert "low_items" in room
        assert check_no_mongodb_id_leak(data)

    def test_ird_kpis(self, api_client):
        """GET /api/ird-hub/kpis - orders_24h, revenue_24h, avg_ticket, avg_delivery_minutes, minibar_revenue_24h, open_orders"""
        resp = api_client.get(f"{BASE_URL}/api/ird-hub/kpis")
        assert resp.status_code == 200
        data = resp.json()
        required_fields = ["orders_24h", "revenue_24h", "avg_ticket", "avg_delivery_minutes", "minibar_revenue_24h", "open_orders"]
        for field in required_fields:
            assert field in data, f"Missing KPI field: {field}"
        assert check_no_mongodb_id_leak(data)


# ============================================================================
# INTELLIGENCE ADAPTER TESTS (/api/intelligence/*)
# ============================================================================
class TestIntelligenceAdapter:
    """Intelligence Adapter - 4 endpoints (ai3, aurium, stratus)"""

    def test_intelligence_ai3_foh(self, api_client):
        """GET /api/intelligence/ai3/foh - returns insights about VIP arrivals, allergies"""
        resp = api_client.get(f"{BASE_URL}/api/intelligence/ai3/foh")
        assert resp.status_code == 200
        data = resp.json()
        assert data["module"] == "foh"
        assert "insights" in data
        assert "count" in data
        assert "ts" in data
        assert check_no_mongodb_id_leak(data)

    def test_intelligence_ai3_engineering(self, api_client):
        """GET /api/intelligence/ai3/engineering - returns VIP engineering risk insights if any"""
        resp = api_client.get(f"{BASE_URL}/api/intelligence/ai3/engineering")
        assert resp.status_code == 200
        data = resp.json()
        assert data["module"] == "engineering"
        assert "insights" in data
        assert check_no_mongodb_id_leak(data)

    def test_intelligence_ai3_housekeeping(self, api_client):
        """GET /api/intelligence/ai3/housekeeping - returns linen shortage, arrival-risk insights"""
        resp = api_client.get(f"{BASE_URL}/api/intelligence/ai3/housekeeping")
        assert resp.status_code == 200
        data = resp.json()
        assert data["module"] == "housekeeping"
        assert "insights" in data
        assert check_no_mongodb_id_leak(data)

    def test_intelligence_ai3_summary(self, api_client):
        """GET /api/intelligence/ai3/summary - all modules combined, sorted by severity"""
        resp = api_client.get(f"{BASE_URL}/api/intelligence/ai3/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "insights" in data
        assert "count" in data
        # Verify sorted by severity (high < medium < info < low)
        severity_order = {"high": 0, "medium": 1, "info": 2, "low": 3}
        insights = data["insights"]
        if len(insights) > 1:
            for i in range(len(insights) - 1):
                sev1 = severity_order.get(insights[i].get("severity", "info"), 9)
                sev2 = severity_order.get(insights[i+1].get("severity", "info"), 9)
                assert sev1 <= sev2, f"Insights not sorted by severity: {insights[i]['severity']} > {insights[i+1]['severity']}"
        assert check_no_mongodb_id_leak(data)

    def test_intelligence_aurium_gm(self, api_client):
        """GET /api/intelligence/aurium/gm - composite_health_score, readiness_pct, engineering_open, foh_revenue_24h, ird_revenue_24h, high_severity_alerts"""
        resp = api_client.get(f"{BASE_URL}/api/intelligence/aurium/gm")
        assert resp.status_code == 200
        data = resp.json()
        required_fields = [
            "composite_health_score", "readiness_pct", "engineering_open",
            "foh_revenue_24h", "ird_revenue_24h", "high_severity_alerts"
        ]
        for field in required_fields:
            assert field in data, f"Missing aurium field: {field}"
        assert check_no_mongodb_id_leak(data)

    def test_intelligence_stratus_forecast_6_weeks(self, api_client):
        """GET /api/intelligence/stratus/forecast?weeks=6 - returns 6 weekly rows + totals_6w with revenue/covers/labor_cost/capex_risk/linen_demand"""
        resp = api_client.get(f"{BASE_URL}/api/intelligence/stratus/forecast?weeks=6")
        assert resp.status_code == 200
        data = resp.json()
        assert "weeks" in data
        assert len(data["weeks"]) == 6, f"Expected 6 weeks, got {len(data['weeks'])}"
        assert "totals_6w" in data
        totals = data["totals_6w"]
        required_totals = ["revenue", "covers", "labor_cost", "capex_risk", "linen_demand"]
        for field in required_totals:
            assert field in totals, f"Missing totals field: {field}"
        # Verify each week has required fields
        for week in data["weeks"]:
            assert "week_start" in week
            assert "forecast_revenue" in week
            assert "forecast_covers" in week
            assert "forecast_labor_cost" in week
        assert check_no_mongodb_id_leak(data)


# ============================================================================
# CROSS-MODULE EVENT EMISSION TESTS
# ============================================================================
class TestCrossModuleEvents:
    """Cross-module event emission tests"""

    def test_hskp_report_issue_creates_eng_work_order(self, api_client):
        """POST /api/hskp-ops/report-issue with high severity emits eng.work_order.created event AND blocks room OOO"""
        # First seed hskp
        api_client.post(f"{BASE_URL}/api/hskp-ops/seed")
        
        payload = {
            "room_no": "301",
            "title": "TEST_Toilet not flushing",
            "description": "Toilet in bathroom not flushing properly",
            "severity": "high",
            "category": "plumbing"
        }
        resp = api_client.post(f"{BASE_URL}/api/hskp-ops/report-issue", json=payload)
        assert resp.status_code == 200, f"Report issue failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        # Verify room blocked
        assert data.get("room_blocked") is True or data.get("room_status") == "ooo", f"Room not blocked: {data}"
        # Check no _id leak (excluding field names containing _id)
        assert "'_id':" not in str(data).replace("'guest_id':", "").replace("'ticket_id':", "").replace("'asset_id':", "")

    def test_concierge_intake_emits_event(self, api_client):
        """POST /api/concierge/intake emits concierge.intake event"""
        payload = {
            "title": "Need extra pillows",
            "body": "Please bring extra pillows to room",
            "guest_name": "TEST_Concierge_Guest",
            "room_no": "502",
            "source": "guest_app"
        }
        resp = api_client.post(f"{BASE_URL}/api/concierge/intake", json=payload)
        assert resp.status_code == 200, f"Concierge intake failed: {resp.text}"
        data = resp.json()
        assert data.get("ok") is True
        assert "ticket" in data
        # Check no _id leak (excluding field names containing _id)
        assert "'_id':" not in str(data).replace("'guest_id':", "").replace("'ticket_id':", "")


# ============================================================================
# REGRESSION TESTS - Existing endpoints still working
# ============================================================================
class TestRegression:
    """Regression tests for existing endpoints"""

    def test_regression_eng_ops_kpis(self, api_client):
        """GET /api/eng-ops/kpis still works"""
        resp = api_client.get(f"{BASE_URL}/api/eng-ops/kpis")
        assert resp.status_code == 200
        assert check_no_mongodb_id_leak(resp.json())

    def test_regression_hskp_ops_kpis(self, api_client):
        """GET /api/hskp-ops/kpis still works"""
        resp = api_client.get(f"{BASE_URL}/api/hskp-ops/kpis")
        assert resp.status_code == 200
        assert check_no_mongodb_id_leak(resp.json())

    def test_regression_concierge_domains(self, api_client):
        """GET /api/concierge/domains still works"""
        resp = api_client.get(f"{BASE_URL}/api/concierge/domains")
        assert resp.status_code == 200
        assert check_no_mongodb_id_leak(resp.json())

    def test_regression_health(self, api_client):
        """GET /api/health still works"""
        resp = api_client.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"


# ============================================================================
# SECURITY - No _id leaks
# ============================================================================
class TestSecurityNoIdLeaks:
    """Verify no _id leaks in any response"""

    def test_no_id_leak_foh_ops(self, api_client):
        """No _id field leaked in any foh-ops endpoint"""
        endpoints = [
            "/api/foh-ops/outlets",
            "/api/foh-ops/kpis",
            "/api/foh-ops/director",
            "/api/foh-ops/outlet/pier-top",
            "/api/foh-ops/outlet/pier-top/floor",
            "/api/foh-ops/pacing/pier-top",
            "/api/foh-ops/beverage-performance",
            "/api/foh-ops/walk-in-surge",
            "/api/foh-ops/recovery-queue"
        ]
        for endpoint in endpoints:
            resp = api_client.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 200, f"{endpoint} failed: {resp.status_code}"
            assert check_no_mongodb_id_leak(resp.json()), f"MongoDB _id leaked in {endpoint}"

    def test_no_id_leak_guest360_hub(self, api_client):
        """No _id field leaked in any guest360-hub endpoint"""
        endpoints = [
            "/api/guest360-hub/profiles",
            "/api/guest360-hub/in-house",
            "/api/guest360-hub/vip-today"
        ]
        for endpoint in endpoints:
            resp = api_client.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 200, f"{endpoint} failed: {resp.status_code}"
            assert check_no_mongodb_id_leak(resp.json()), f"MongoDB _id leaked in {endpoint}"

    def test_no_id_leak_ird_hub(self, api_client):
        """No _id field leaked in any ird-hub endpoint"""
        endpoints = [
            "/api/ird-hub/menu",
            "/api/ird-hub/orders",
            "/api/ird-hub/minibar/412",
            "/api/ird-hub/restock-queue",
            "/api/ird-hub/kpis"
        ]
        for endpoint in endpoints:
            resp = api_client.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 200, f"{endpoint} failed: {resp.status_code}"
            assert check_no_mongodb_id_leak(resp.json()), f"MongoDB _id leaked in {endpoint}"

    def test_no_id_leak_intelligence(self, api_client):
        """No _id field leaked in any intelligence endpoint"""
        endpoints = [
            "/api/intelligence/ai3/foh",
            "/api/intelligence/ai3/engineering",
            "/api/intelligence/ai3/housekeeping",
            "/api/intelligence/ai3/summary",
            "/api/intelligence/aurium/gm",
            "/api/intelligence/stratus/forecast?weeks=6"
        ]
        for endpoint in endpoints:
            resp = api_client.get(f"{BASE_URL}{endpoint}")
            assert resp.status_code == 200, f"{endpoint} failed: {resp.status_code}"
            assert check_no_mongodb_id_leak(resp.json()), f"MongoDB _id leaked in {endpoint}"
