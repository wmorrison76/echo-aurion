"""
Iteration 144 Backend Tests
===========================
Tests for:
1. KDS (Kitchen Display System) - 15 endpoints, 11 stations, 3 modes
2. LLM-backed narrative synthesis in /api/intelligence/ai3/summary and /aurium/gm
3. AI³ NLP chat expansion with OPS SNAPSHOT context

Endpoints tested:
- POST /api/kds/seed (idempotent)
- GET /api/kds/stations
- GET /api/kds/expo (+ mode filters)
- GET /api/kds/station/{slug}
- GET /api/kds/tickets
- POST /api/kds/tickets
- POST /api/kds/tickets/{id}/bump-item
- POST /api/kds/tickets/{id}/fire-course
- POST /api/kds/tickets/{id}/hold
- POST /api/kds/tickets/{id}/recall
- POST /api/kds/tickets/{id}/fulfill
- POST /api/kds/tickets/{id}/reroute
- GET /api/kds/allday
- GET /api/kds/pacing
- POST /api/kds/86 and GET /api/kds/86
- GET /api/intelligence/ai3/summary?use_llm=true
- GET /api/intelligence/aurium/gm?use_llm=true
- POST /api/ai3-nlp/chat (expanded context)
- Regression tests for prior modules
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestKDSSeed:
    """KDS seed endpoint - idempotent, seeds 11 stations + demo tickets"""
    
    def test_kds_seed_idempotent(self, api_client):
        # First call
        r1 = api_client.post(f"{BASE_URL}/api/kds/seed")
        assert r1.status_code == 200, f"KDS seed failed: {r1.text}"
        d1 = r1.json()
        assert d1.get("ok") is True
        assert d1.get("stations") >= 11, f"Expected 11+ stations, got {d1.get('stations')}"
        
        # Second call should be idempotent
        r2 = api_client.post(f"{BASE_URL}/api/kds/seed")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2.get("ok") is True
        # Stations count should remain same (idempotent)
        assert d2.get("stations") == d1.get("stations"), "Seed not idempotent for stations"
        print(f"PASS: KDS seed idempotent - {d1.get('stations')} stations, {d1.get('tickets')} tickets")


class TestKDSStations:
    """GET /api/kds/stations - returns stations with health color and suggested_action"""
    
    def test_list_stations_with_health(self, api_client):
        # Ensure seeded
        api_client.post(f"{BASE_URL}/api/kds/seed")
        
        r = api_client.get(f"{BASE_URL}/api/kds/stations")
        assert r.status_code == 200, f"Stations list failed: {r.text}"
        data = r.json()
        assert "items" in data
        stations = data["items"]
        assert len(stations) >= 11, f"Expected 11+ stations, got {len(stations)}"
        
        # Check station structure
        station = stations[0]
        assert "slug" in station
        assert "name" in station
        assert "health" in station
        health = station["health"]
        assert "color" in health, "Health should have color"
        assert health["color"] in ("green", "yellow", "red")
        # suggested_action may be None for green stations
        assert "suggested_action" in health
        
        # No _id leak
        assert "_id" not in station
        assert "_id" not in health
        
        print(f"PASS: KDS stations - {len(stations)} stations with health colors")


class TestKDSExpo:
    """GET /api/kds/expo - Expo Command Screen payload"""
    
    def test_expo_full_payload(self, api_client):
        api_client.post(f"{BASE_URL}/api/kds/seed")
        
        r = api_client.get(f"{BASE_URL}/api/kds/expo")
        assert r.status_code == 200, f"Expo failed: {r.text}"
        data = r.json()
        
        # Check top_bar structure
        assert "top_bar" in data
        tb = data["top_bar"]
        assert "active_tickets" in tb
        assert "danger" in tb
        assert "aging_counts" in tb
        assert "avg_ticket_seconds" in tb
        assert "longest" in tb
        assert "eighty_six_count" in tb
        assert "pacing_drift_min" in tb
        
        # Check station_health array
        assert "station_health" in data
        assert isinstance(data["station_health"], list)
        
        # Check tickets array with cards
        assert "tickets" in data
        if data["tickets"]:
            ticket = data["tickets"][0]
            assert "id" in ticket
            assert "ticket_no" in ticket
            assert "mode" in ticket
            assert "aging" in ticket
            assert "next_action" in ticket
            assert "items" in ticket
            assert "_id" not in ticket
        
        # Check allday array
        assert "allday" in data
        
        # Check eighty_six
        assert "eighty_six" in data
        
        print(f"PASS: KDS expo - {tb['active_tickets']} active tickets, {len(data['station_health'])} stations")
    
    def test_expo_mode_restaurant(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/kds/expo?mode=restaurant")
        assert r.status_code == 200
        data = r.json()
        # All tickets should be restaurant mode
        for t in data.get("tickets", []):
            assert t.get("mode") == "restaurant", f"Expected restaurant mode, got {t.get('mode')}"
        print(f"PASS: KDS expo mode=restaurant filter - {len(data.get('tickets', []))} tickets")
    
    def test_expo_mode_ird(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/kds/expo?mode=ird")
        assert r.status_code == 200
        data = r.json()
        for t in data.get("tickets", []):
            assert t.get("mode") == "ird"
        print(f"PASS: KDS expo mode=ird filter - {len(data.get('tickets', []))} tickets")
    
    def test_expo_mode_banquet(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/kds/expo?mode=banquet")
        assert r.status_code == 200
        data = r.json()
        for t in data.get("tickets", []):
            assert t.get("mode") == "banquet"
        print(f"PASS: KDS expo mode=banquet filter - {len(data.get('tickets', []))} tickets")


class TestKDSStationView:
    """GET /api/kds/station/{slug} - Per-station queue sorted by VIP first then age desc"""
    
    def test_station_grill_queue(self, api_client):
        api_client.post(f"{BASE_URL}/api/kds/seed")
        
        r = api_client.get(f"{BASE_URL}/api/kds/station/grill")
        assert r.status_code == 200, f"Station grill failed: {r.text}"
        data = r.json()
        
        assert data.get("station") == "grill"
        assert "health" in data
        assert "items" in data
        assert "count" in data
        
        # Check sorting: VIP first, then by age desc
        items = data["items"]
        if len(items) >= 2:
            # VIP items should come before non-VIP
            vip_indices = [i for i, it in enumerate(items) if it.get("vip")]
            non_vip_indices = [i for i, it in enumerate(items) if not it.get("vip")]
            if vip_indices and non_vip_indices:
                assert max(vip_indices) < min(non_vip_indices), "VIP items should be sorted first"
        
        # No _id leak
        for it in items:
            assert "_id" not in it
            assert "_id" not in it.get("item", {})
        
        print(f"PASS: KDS station/grill - {data['count']} items, health={data['health'].get('color')}")


class TestKDSTicketCRUD:
    """POST /api/kds/tickets - create with 2+ items across stations"""
    
    def test_create_ticket_sequential_fire(self, api_client):
        api_client.post(f"{BASE_URL}/api/kds/seed")
        
        payload = {
            "mode": "restaurant",
            "outlet_slug": "pier-top",
            "table_no": "T99",
            "cover_count": 4,
            "guest_name": "TEST_VIP Guest",
            "vip": True,
            "allergy_flags": ["shellfish"],
            "course_fire_policy": "sequential",
            "items": [
                {"sku": "test-app-1", "name": "TEST Appetizer", "qty": 2, "station_slug": "pantry", "course": "app"},
                {"sku": "test-ent-1", "name": "TEST Entree", "qty": 2, "station_slug": "grill", "course": "entree"},
                {"sku": "test-des-1", "name": "TEST Dessert", "qty": 2, "station_slug": "pastry", "course": "dessert"}
            ]
        }
        r = api_client.post(f"{BASE_URL}/api/kds/tickets", json=payload)
        assert r.status_code == 200, f"Create ticket failed: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True
        ticket = data.get("ticket")
        assert ticket is not None
        assert "id" in ticket
        assert ticket.get("mode") == "restaurant"
        assert ticket.get("vip") is True
        assert len(ticket.get("items", [])) == 3
        
        # Sequential fire: first course (app) should be "working", others "new"
        items = ticket.get("items", [])
        app_items = [i for i in items if i.get("course") == "app"]
        entree_items = [i for i in items if i.get("course") == "entree"]
        dessert_items = [i for i in items if i.get("course") == "dessert"]
        
        for it in app_items:
            assert it.get("status") == "working", f"App item should be working, got {it.get('status')}"
            assert it.get("fired_at") is not None
        for it in entree_items:
            assert it.get("status") == "new", f"Entree item should be new, got {it.get('status')}"
        for it in dessert_items:
            assert it.get("status") == "new", f"Dessert item should be new, got {it.get('status')}"
        
        # No _id leak
        assert "_id" not in ticket
        
        print(f"PASS: KDS create ticket - id={ticket['id']}, sequential fire policy verified")
        return ticket["id"]
    
    def test_bump_item_auto_fulfill(self, api_client):
        # Create a simple ticket
        payload = {
            "mode": "restaurant",
            "outlet_slug": "pier-top",
            "table_no": "T100",
            "cover_count": 1,
            "course_fire_policy": "all_at_once",
            "items": [
                {"sku": "test-single", "name": "TEST Single Item", "qty": 1, "station_slug": "grill", "course": "entree"}
            ]
        }
        r = api_client.post(f"{BASE_URL}/api/kds/tickets", json=payload)
        assert r.status_code == 200
        ticket_id = r.json()["ticket"]["id"]
        
        # Bump the only item
        r2 = api_client.post(f"{BASE_URL}/api/kds/tickets/{ticket_id}/bump-item", json={"item_index": 0})
        assert r2.status_code == 200, f"Bump item failed: {r2.text}"
        data = r2.json()
        
        assert data.get("ok") is True
        ticket = data.get("ticket")
        # All items bumped -> ticket should be auto-fulfilled
        assert ticket.get("status") == "fulfilled", f"Expected fulfilled, got {ticket.get('status')}"
        assert ticket["items"][0]["status"] == "bumped"
        assert ticket["items"][0]["bumped_at"] is not None
        
        print(f"PASS: KDS bump-item auto-fulfills when all items bumped")
    
    def test_fire_course(self, api_client):
        # Create ticket with sequential fire
        payload = {
            "mode": "restaurant",
            "outlet_slug": "pier-top",
            "table_no": "T101",
            "cover_count": 2,
            "course_fire_policy": "sequential",
            "items": [
                {"sku": "test-app-fc", "name": "TEST App FC", "qty": 1, "station_slug": "pantry", "course": "app"},
                {"sku": "test-ent-fc", "name": "TEST Entree FC", "qty": 1, "station_slug": "grill", "course": "entree"}
            ]
        }
        r = api_client.post(f"{BASE_URL}/api/kds/tickets", json=payload)
        assert r.status_code == 200
        ticket_id = r.json()["ticket"]["id"]
        
        # Fire next course (entree)
        r2 = api_client.post(f"{BASE_URL}/api/kds/tickets/{ticket_id}/fire-course")
        assert r2.status_code == 200, f"Fire course failed: {r2.text}"
        data = r2.json()
        
        assert data.get("ok") is True
        assert data.get("fired_course") == "entree"
        ticket = data.get("ticket")
        # Entree items should now be "working"
        entree_items = [i for i in ticket.get("items", []) if i.get("course") == "entree"]
        for it in entree_items:
            assert it.get("status") == "working"
            assert it.get("fired_at") is not None
        
        print(f"PASS: KDS fire-course advances to entree")
    
    def test_hold_ticket(self, api_client):
        # Create ticket
        payload = {
            "mode": "restaurant",
            "outlet_slug": "pier-top",
            "table_no": "T102",
            "cover_count": 2,
            "items": [{"sku": "test-hold", "name": "TEST Hold", "qty": 1, "station_slug": "grill", "course": "entree"}]
        }
        r = api_client.post(f"{BASE_URL}/api/kds/tickets", json=payload)
        ticket_id = r.json()["ticket"]["id"]
        
        # Hold
        r2 = api_client.post(f"{BASE_URL}/api/kds/tickets/{ticket_id}/hold")
        assert r2.status_code == 200, f"Hold failed: {r2.text}"
        assert r2.json().get("ok") is True
        
        # Verify status
        r3 = api_client.get(f"{BASE_URL}/api/kds/tickets?status=holding")
        tickets = r3.json().get("items", [])
        held = [t for t in tickets if t.get("id") == ticket_id]
        assert len(held) == 1
        assert held[0].get("status") == "holding"
        
        print(f"PASS: KDS hold ticket - status=holding")
    
    def test_recall_ticket(self, api_client):
        # Create and bump
        payload = {
            "mode": "restaurant",
            "outlet_slug": "pier-top",
            "table_no": "T103",
            "cover_count": 1,
            "items": [{"sku": "test-recall", "name": "TEST Recall", "qty": 1, "station_slug": "grill", "course": "entree"}]
        }
        r = api_client.post(f"{BASE_URL}/api/kds/tickets", json=payload)
        ticket_id = r.json()["ticket"]["id"]
        
        # Bump item
        api_client.post(f"{BASE_URL}/api/kds/tickets/{ticket_id}/bump-item", json={"item_index": 0})
        
        # Recall
        r2 = api_client.post(f"{BASE_URL}/api/kds/tickets/{ticket_id}/recall")
        assert r2.status_code == 200, f"Recall failed: {r2.text}"
        data = r2.json()
        
        assert data.get("ok") is True
        ticket = data.get("ticket")
        assert ticket.get("status") == "working"
        # Bumped items should revert to working
        assert ticket["items"][0]["status"] == "working"
        assert ticket["items"][0]["bumped_at"] is None
        
        print(f"PASS: KDS recall reverts bumped items to working")
    
    def test_fulfill_ticket(self, api_client):
        payload = {
            "mode": "restaurant",
            "outlet_slug": "pier-top",
            "table_no": "T104",
            "cover_count": 1,
            "items": [{"sku": "test-fulfill", "name": "TEST Fulfill", "qty": 1, "station_slug": "grill", "course": "entree"}]
        }
        r = api_client.post(f"{BASE_URL}/api/kds/tickets", json=payload)
        ticket_id = r.json()["ticket"]["id"]
        
        r2 = api_client.post(f"{BASE_URL}/api/kds/tickets/{ticket_id}/fulfill")
        assert r2.status_code == 200, f"Fulfill failed: {r2.text}"
        assert r2.json().get("ok") is True
        
        print(f"PASS: KDS fulfill ticket")
    
    def test_reroute_item(self, api_client):
        payload = {
            "mode": "restaurant",
            "outlet_slug": "pier-top",
            "table_no": "T105",
            "cover_count": 1,
            "items": [{"sku": "test-reroute", "name": "TEST Reroute", "qty": 1, "station_slug": "grill", "course": "entree"}]
        }
        r = api_client.post(f"{BASE_URL}/api/kds/tickets", json=payload)
        ticket_id = r.json()["ticket"]["id"]
        
        # Reroute from grill to saute
        r2 = api_client.post(f"{BASE_URL}/api/kds/tickets/{ticket_id}/reroute", json={"item_index": 0, "new_station": "saute"})
        assert r2.status_code == 200, f"Reroute failed: {r2.text}"
        data = r2.json()
        
        assert data.get("ok") is True
        ticket = data.get("ticket")
        assert ticket["items"][0]["station_slug"] == "saute"
        
        print(f"PASS: KDS reroute item from grill to saute")


class TestKDSAllday:
    """GET /api/kds/allday - rolled-up item counts"""
    
    def test_allday_counts(self, api_client):
        api_client.post(f"{BASE_URL}/api/kds/seed")
        
        r = api_client.get(f"{BASE_URL}/api/kds/allday")
        assert r.status_code == 200, f"Allday failed: {r.text}"
        data = r.json()
        
        assert "items" in data
        if data["items"]:
            item = data["items"][0]
            assert "name" in item
            assert "qty" in item
            assert "new_qty" in item
            assert "working_qty" in item
            assert "ready_qty" in item
            assert "vip_qty" in item
            assert "allergy_variants" in item
        
        print(f"PASS: KDS allday - {len(data['items'])} item types")


class TestKDSPacing:
    """GET /api/kds/pacing - FOH-facing pacing drift"""
    
    def test_pacing_output(self, api_client):
        api_client.post(f"{BASE_URL}/api/kds/seed")
        
        r = api_client.get(f"{BASE_URL}/api/kds/pacing")
        assert r.status_code == 200, f"Pacing failed: {r.text}"
        data = r.json()
        
        assert "avg_ticket_minutes" in data
        assert "target_minutes" in data
        assert "drift_minutes" in data
        assert "foh_suggestion" in data  # May be None or string
        
        print(f"PASS: KDS pacing - avg={data['avg_ticket_minutes']}min, drift={data['drift_minutes']}min")


class TestKDS86List:
    """POST /api/kds/86 and GET /api/kds/86 - 86 list CRUD"""
    
    def test_86_add_and_list(self, api_client):
        # Add item to 86 list
        r = api_client.post(f"{BASE_URL}/api/kds/86?sku=TEST-86-ITEM&name=Test%2086%20Item")
        assert r.status_code == 200, f"Add 86 failed: {r.text}"
        assert r.json().get("ok") is True
        
        # List 86
        r2 = api_client.get(f"{BASE_URL}/api/kds/86")
        assert r2.status_code == 200
        data = r2.json()
        
        assert "items" in data
        skus = [i.get("sku") for i in data["items"]]
        assert "TEST-86-ITEM" in skus
        
        # No _id leak
        for item in data["items"]:
            assert "_id" not in item
        
        print(f"PASS: KDS 86 list - {len(data['items'])} items")


class TestIntelligenceLLM:
    """LLM-backed narrative synthesis in /api/intelligence endpoints"""
    
    def test_ai3_summary_with_llm(self, api_client):
        """GET /api/intelligence/ai3/summary?use_llm=true - must return narrative field"""
        r = api_client.get(f"{BASE_URL}/api/intelligence/ai3/summary?use_llm=true", timeout=30)
        assert r.status_code == 200, f"AI3 summary failed: {r.text}"
        data = r.json()
        
        assert "insights" in data
        assert "count" in data
        assert "narrative" in data  # May be None if LLM timed out, but field must exist
        assert "ts" in data
        
        # No _id leak
        for insight in data.get("insights", []):
            assert "_id" not in insight
        
        if data.get("narrative"):
            print(f"PASS: AI3 summary with LLM - narrative generated ({len(data['narrative'])} chars)")
        else:
            print(f"PASS: AI3 summary with LLM - narrative field present (null - LLM may have timed out)")
    
    def test_aurium_gm_with_llm(self, api_client):
        """GET /api/intelligence/aurium/gm?use_llm=true - must return narrative field"""
        r = api_client.get(f"{BASE_URL}/api/intelligence/aurium/gm?use_llm=true", timeout=30)
        assert r.status_code == 200, f"Aurium GM failed: {r.text}"
        data = r.json()
        
        assert "composite_health_score" in data
        assert "readiness_pct" in data
        assert "narrative" in data  # May be None if LLM timed out
        
        if data.get("narrative"):
            print(f"PASS: Aurium GM with LLM - narrative generated ({len(data['narrative'])} chars)")
        else:
            print(f"PASS: Aurium GM with LLM - narrative field present (null - LLM may have timed out)")


class TestAI3NLPChat:
    """POST /api/ai3-nlp/chat - AI³ chat with expanded OPS SNAPSHOT context"""
    
    def test_chat_rooms_ready_query(self, api_client):
        """Query 'how many rooms are ready?' should mention rooms/ready count"""
        # Seed housekeeping data first
        api_client.post(f"{BASE_URL}/api/hskp-ops/seed")
        
        payload = {
            "query": "how many rooms are ready?",
            "user_id": "usr-gm-001",
            "session_id": "test-session-rooms"
        }
        r = api_client.post(f"{BASE_URL}/api/ai3/ask", json=payload, timeout=30)
        assert r.status_code == 200, f"AI3 chat failed: {r.text}"
        data = r.json()
        
        assert "response" in data
        response_lower = data["response"].lower()
        # Should mention rooms or ready in response
        assert "room" in response_lower or "ready" in response_lower or "housekeeping" in response_lower, \
            f"Response should mention rooms/ready: {data['response'][:200]}"
        
        print(f"PASS: AI3 NLP chat - rooms query answered")
    
    def test_chat_foh_outlets_query(self, api_client):
        """Query 'what FOH outlets exist?' should mention Pier Top/Calusso etc."""
        # Seed FOH data
        api_client.post(f"{BASE_URL}/api/foh-ops/seed")
        
        payload = {
            "query": "what FOH outlets exist?",
            "user_id": "usr-gm-001",
            "session_id": "test-session-foh"
        }
        r = api_client.post(f"{BASE_URL}/api/ai3/ask", json=payload, timeout=30)
        assert r.status_code == 200, f"AI3 chat failed: {r.text}"
        data = r.json()
        
        assert "response" in data
        response_lower = data["response"].lower()
        # Should mention outlets
        assert "outlet" in response_lower or "pier" in response_lower or "calusso" in response_lower or "restaurant" in response_lower, \
            f"Response should mention FOH outlets: {data['response'][:200]}"
        
        print(f"PASS: AI3 NLP chat - FOH outlets query answered")
    
    def test_chat_kds_tickets_query(self, api_client):
        """Query 'how many active KDS tickets' should reference KDS kitchen"""
        api_client.post(f"{BASE_URL}/api/kds/seed")
        
        payload = {
            "query": "how many active KDS tickets?",
            "user_id": "usr-gm-001",
            "session_id": "test-session-kds"
        }
        r = api_client.post(f"{BASE_URL}/api/ai3/ask", json=payload, timeout=30)
        assert r.status_code == 200, f"AI3 chat failed: {r.text}"
        data = r.json()
        
        assert "response" in data
        response_lower = data["response"].lower()
        # Should mention KDS or kitchen or tickets
        assert "kds" in response_lower or "kitchen" in response_lower or "ticket" in response_lower, \
            f"Response should mention KDS/kitchen: {data['response'][:200]}"
        
        print(f"PASS: AI3 NLP chat - KDS tickets query answered")
    
    def test_chat_engineering_work_orders(self, api_client):
        """Query 'list open engineering work orders' should include work order samples"""
        api_client.post(f"{BASE_URL}/api/eng-ops/seed")
        
        payload = {
            "query": "list open engineering work orders",
            "user_id": "usr-gm-001",
            "session_id": "test-session-eng"
        }
        r = api_client.post(f"{BASE_URL}/api/ai3/ask", json=payload, timeout=30)
        assert r.status_code == 200, f"AI3 chat failed: {r.text}"
        data = r.json()
        
        assert "response" in data
        response_lower = data["response"].lower()
        # Should mention engineering or work order
        assert "engineering" in response_lower or "work order" in response_lower or "maintenance" in response_lower, \
            f"Response should mention engineering: {data['response'][:200]}"
        
        print(f"PASS: AI3 NLP chat - engineering work orders query answered")


class TestNoIdLeaks:
    """Verify no MongoDB _id leaks in any KDS response"""
    
    def test_no_id_leak_kds_expo(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/kds/expo")
        assert r.status_code == 200
        text = r.text
        assert '"_id"' not in text, "MongoDB _id leaked in /api/kds/expo"
        print("PASS: No _id leak in /api/kds/expo")
    
    def test_no_id_leak_kds_stations(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/kds/stations")
        assert r.status_code == 200
        text = r.text
        assert '"_id"' not in text, "MongoDB _id leaked in /api/kds/stations"
        print("PASS: No _id leak in /api/kds/stations")
    
    def test_no_id_leak_kds_allday(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/kds/allday")
        assert r.status_code == 200
        text = r.text
        assert '"_id"' not in text, "MongoDB _id leaked in /api/kds/allday"
        print("PASS: No _id leak in /api/kds/allday")
    
    def test_no_id_leak_kds_86(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/kds/86")
        assert r.status_code == 200
        text = r.text
        assert '"_id"' not in text, "MongoDB _id leaked in /api/kds/86"
        print("PASS: No _id leak in /api/kds/86")


class TestRegressionPriorModules:
    """Regression tests for prior iteration modules"""
    
    def test_regression_eng_ops_kpis(self, api_client):
        api_client.post(f"{BASE_URL}/api/eng-ops/seed")
        r = api_client.get(f"{BASE_URL}/api/eng-ops/kpis")
        assert r.status_code == 200, f"eng-ops/kpis failed: {r.text}"
        data = r.json()
        assert "open_ticket_count" in data or "work_order_completion_rate" in data
        print("PASS: Regression - /api/eng-ops/kpis")
    
    def test_regression_hskp_ops_kpis(self, api_client):
        api_client.post(f"{BASE_URL}/api/hskp-ops/seed")
        r = api_client.get(f"{BASE_URL}/api/hskp-ops/kpis")
        assert r.status_code == 200, f"hskp-ops/kpis failed: {r.text}"
        data = r.json()
        assert "rooms_ready" in data or "total_rooms" in data
        print("PASS: Regression - /api/hskp-ops/kpis")
    
    def test_regression_foh_ops_outlets(self, api_client):
        api_client.post(f"{BASE_URL}/api/foh-ops/seed")
        r = api_client.get(f"{BASE_URL}/api/foh-ops/outlets")
        assert r.status_code == 200, f"foh-ops/outlets failed: {r.text}"
        data = r.json()
        assert "items" in data
        print("PASS: Regression - /api/foh-ops/outlets")
    
    def test_regression_concierge_domains(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/concierge/domains")
        assert r.status_code == 200, f"concierge/domains failed: {r.text}"
        data = r.json()
        assert "domains" in data
        print("PASS: Regression - /api/concierge/domains")
    
    def test_regression_guest360_profiles(self, api_client):
        api_client.post(f"{BASE_URL}/api/guest360-hub/seed")
        r = api_client.get(f"{BASE_URL}/api/guest360-hub/profiles")
        assert r.status_code == 200, f"guest360-hub/profiles failed: {r.text}"
        data = r.json()
        assert "items" in data
        print("PASS: Regression - /api/guest360-hub/profiles")
    
    def test_regression_ird_hub_menu(self, api_client):
        api_client.post(f"{BASE_URL}/api/ird-hub/seed")
        r = api_client.get(f"{BASE_URL}/api/ird-hub/menu")
        assert r.status_code == 200, f"ird-hub/menu failed: {r.text}"
        data = r.json()
        assert "items" in data
        print("PASS: Regression - /api/ird-hub/menu")
    
    def test_regression_intelligence_ai3_summary(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/intelligence/ai3/summary")
        assert r.status_code == 200, f"intelligence/ai3/summary failed: {r.text}"
        data = r.json()
        assert "insights" in data
        print("PASS: Regression - /api/intelligence/ai3/summary")
    
    def test_regression_health(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print("PASS: Regression - /api/health")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
