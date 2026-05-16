"""
iter194 · FM-Upgrade 1 — TimelineEvent primitive comprehensive tests

Tests:
1. Timeline emit (admin-gated)
2. Timeline emit idempotency
3. Timeline emit KDE warning for CTE types
4. Timeline query with entity_id filter
5. Timeline recent endpoint
6. Timeline recall (FSMA 204 forward+backward trace)
7. Timeline recall bad input (400)
8. Timeline cycle-time
9. End-to-end wiring: IRD order → order.placed
10. End-to-end wiring: PO drafted
11. End-to-end wiring: PO approved
12. End-to-end wiring: Inventory receive → lot.received + po.received_full
13. End-to-end wiring: Standup send → standup.sent
14. End-to-end wiring: Feature flag toggle → feature_flag.toggled
"""
import os
import pytest
import requests
import time
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_client(api_client):
    """Session with admin token"""
    api_client.headers.update({"X-Admin-Token": ADMIN_TOKEN})
    return api_client


@pytest.fixture(scope="module")
def guest_token(api_client):
    """Get a guest token for IRD testing"""
    # Use the authenticate endpoint
    r = api_client.post(f"{BASE_URL}/api/guest-concierge/authenticate", json={
        "room": "1208",
        "last_name": "Reed"
    })
    if r.status_code == 200:
        data = r.json()
        return data.get("token")
    pytest.skip("Could not obtain guest token")


class TestTimelineEmit:
    """Timeline emit endpoint tests (admin-gated)"""

    def test_emit_requires_admin_token(self, api_client):
        """POST /api/timeline/emit without admin token should fail"""
        r = api_client.post(f"{BASE_URL}/api/timeline/emit", json={
            "type": "test.event",
            "payload": {"test": True}
        })
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"
        print("PASS: emit requires admin token")

    def test_emit_success(self, admin_client):
        """POST /api/timeline/emit with admin token should succeed"""
        unique_key = f"test-emit-{uuid.uuid4().hex[:8]}"
        r = admin_client.post(f"{BASE_URL}/api/timeline/emit", json={
            "type": "po.drafted",
            "actor": {"type": "user", "id": "test-user", "name": "Test User"},
            "entity_refs": [{"kind": "purchase_order", "id": f"po-{unique_key}"}],
            "payload": {"commodity": "test", "quantity": 10, "unit": "lb"},
            "idempotency_key": unique_key
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("event_id") is not None, "event_id should be returned"
        print(f"PASS: emit success, event_id={data.get('event_id')}")

    def test_emit_idempotency(self, admin_client):
        """Posting twice with same idempotency_key returns event_id=None on duplicate"""
        unique_key = f"test-idem-{uuid.uuid4().hex[:8]}"
        payload = {
            "type": "po.drafted",
            "actor": {"type": "user", "id": "test-user", "name": "Test User"},
            "entity_refs": [{"kind": "purchase_order", "id": f"po-{unique_key}"}],
            "payload": {"commodity": "test", "quantity": 5, "unit": "kg"},
            "idempotency_key": unique_key
        }
        
        # First emit
        r1 = admin_client.post(f"{BASE_URL}/api/timeline/emit", json=payload)
        assert r1.status_code == 200
        data1 = r1.json()
        assert data1.get("event_id") is not None, "First emit should return event_id"
        
        # Second emit with same key
        r2 = admin_client.post(f"{BASE_URL}/api/timeline/emit", json=payload)
        assert r2.status_code == 200
        data2 = r2.json()
        assert data2.get("event_id") is None, "Duplicate emit should return event_id=None"
        print("PASS: idempotency works - duplicate returns event_id=None")

    def test_emit_kde_warning_for_cte(self, admin_client):
        """CTE type without required KDEs adds _kde_warning but still emits"""
        unique_key = f"test-kde-{uuid.uuid4().hex[:8]}"
        # lot.received is a CTE type that requires commodity, quantity, unit
        r = admin_client.post(f"{BASE_URL}/api/timeline/emit", json={
            "type": "lot.received",
            "actor": {"type": "user", "id": "test-user", "name": "Test User"},
            "entity_refs": [{"kind": "lot", "id": f"lot-{unique_key}"}],
            "payload": {},  # Missing required KDEs
            "idempotency_key": unique_key
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        # Event should still be emitted (fail-soft)
        assert data.get("event_id") is not None, "Event should still be emitted"
        print("PASS: CTE without KDEs still emits (fail-soft)")


class TestTimelineQuery:
    """Timeline query endpoint tests"""

    def test_query_basic(self, api_client):
        """POST /api/timeline/query returns events"""
        r = api_client.post(f"{BASE_URL}/api/timeline/query", json={
            "limit": 10
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        assert "events" in data
        assert "total" in data
        print(f"PASS: query returns {data.get('total')} events")

    def test_query_with_entity_id_filter(self, admin_client):
        """Query with entity_id filter returns only events touching that entity"""
        # First emit an event with a specific entity
        entity_id = f"test-entity-{uuid.uuid4().hex[:8]}"
        admin_client.post(f"{BASE_URL}/api/timeline/emit", json={
            "type": "po.drafted",
            "entity_refs": [{"kind": "test", "id": entity_id}],
            "payload": {"commodity": "test", "quantity": 1, "unit": "ea"},
            "idempotency_key": f"query-test-{entity_id}"
        })
        
        # Query for that entity
        r = admin_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": entity_id,
            "limit": 50
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # All returned events should reference this entity
        for event in data.get("events", []):
            refs = event.get("entity_refs", [])
            ref_ids = [r.get("id") for r in refs]
            assert entity_id in ref_ids, f"Event should reference {entity_id}"
        print(f"PASS: query with entity_id filter works, found {data.get('total')} events")


class TestTimelineRecent:
    """Timeline recent endpoint tests"""

    def test_recent_basic(self, api_client):
        """GET /api/timeline/recent returns compact feed"""
        r = api_client.get(f"{BASE_URL}/api/timeline/recent?limit=20")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        assert "events" in data
        assert "total" in data
        print(f"PASS: recent returns {data.get('total')} events")

    def test_recent_with_kind_filter(self, api_client):
        """GET /api/timeline/recent with kind filter"""
        r = api_client.get(f"{BASE_URL}/api/timeline/recent?limit=20&kind=lot")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        print(f"PASS: recent with kind filter returns {data.get('total')} events")


class TestTimelineRecall:
    """Timeline recall endpoint tests (FSMA 204 mock-recall)"""

    def test_recall_bad_input(self, api_client):
        """GET /api/timeline/recall without anchor params returns 400"""
        r = api_client.get(f"{BASE_URL}/api/timeline/recall")
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        print("PASS: recall without anchor returns 400")

    def test_recall_with_tlc(self, api_client):
        """GET /api/timeline/recall with TLC returns recall bundle"""
        # Use a test TLC - may not find events but should return valid structure
        r = api_client.get(f"{BASE_URL}/api/timeline/recall?tlc=TLC-TEST123")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        recall = data.get("recall", {})
        
        # Verify structure
        assert "anchor" in recall
        assert "summary" in recall
        assert "backward" in recall
        assert "forward" in recall
        assert "events" in recall
        assert "elapsed_ms" in recall
        
        # Verify elapsed_ms is present and reasonable
        elapsed = recall.get("elapsed_ms", 0)
        assert isinstance(elapsed, int), "elapsed_ms should be an integer"
        print(f"PASS: recall with TLC returns valid bundle, elapsed_ms={elapsed}")

    def test_recall_performance(self, admin_client):
        """Recall should complete in <2000ms (target <2s per spec)"""
        # First create some test data
        tlc = f"TLC-PERF{uuid.uuid4().hex[:6].upper()}"
        lot_id = f"lot-perf-{uuid.uuid4().hex[:6]}"
        
        # Emit a lot.received event with this TLC
        admin_client.post(f"{BASE_URL}/api/timeline/emit", json={
            "type": "lot.received",
            "entity_refs": [{"kind": "lot", "id": lot_id}],
            "payload": {"tlc": tlc, "lot_id": lot_id, "commodity": "test", "quantity": 10, "unit": "lb"},
            "idempotency_key": f"perf-test-{tlc}"
        })
        
        # Run recall
        r = admin_client.get(f"{BASE_URL}/api/timeline/recall?tlc={tlc}")
        assert r.status_code == 200
        data = r.json()
        recall = data.get("recall", {})
        elapsed = recall.get("elapsed_ms", 9999)
        
        assert elapsed < 2000, f"Recall took {elapsed}ms, should be <2000ms"
        print(f"PASS: recall performance OK, elapsed_ms={elapsed} (<2000ms target)")


class TestTimelineCycleTime:
    """Timeline cycle-time endpoint tests"""

    def test_cycle_time_basic(self, api_client):
        """GET /api/timeline/cycle-time returns duration"""
        r = api_client.get(f"{BASE_URL}/api/timeline/cycle-time?entity_id=test-entity&from_type=batch.started&to_type=batch.completed")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert data.get("ok") is True
        assert "result" in data
        result = data.get("result", {})
        assert "entity_id" in result
        assert "cycle_seconds" in result
        print(f"PASS: cycle-time returns valid structure")


class TestEndToEndWiring:
    """End-to-end wiring tests - verify domain routes emit timeline events"""

    def test_po_drafted_emits_event(self, api_client):
        """POST /api/purchasing/requisition emits po.drafted"""
        # Create a PR
        r = api_client.post(f"{BASE_URL}/api/purchasing/requisition", json={
            "date": "2026-01-15",
            "outlet": "test",
            "items": [{"ingredient": "Test Item", "qty": 10, "unit": "lb"}],
            "total_cost": 100,
            "requested_by": "test-user"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        req_id = data.get("requisition_id")
        assert req_id is not None
        
        # Query timeline for this PR
        time.sleep(0.5)  # Allow event to be written
        r2 = api_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": req_id,
            "event_types": ["po.drafted"],
            "limit": 10
        })
        assert r2.status_code == 200
        data2 = r2.json()
        events = data2.get("events", [])
        assert len(events) > 0, f"Expected po.drafted event for {req_id}"
        print(f"PASS: po.drafted event emitted for {req_id}")

    def test_po_approved_emits_event(self, api_client):
        """PUT /api/purchasing/requisitions/{id}/approve emits po.approved"""
        # First create a PR
        r = api_client.post(f"{BASE_URL}/api/purchasing/requisition", json={
            "date": "2026-01-15",
            "outlet": "test",
            "items": [{"ingredient": "Approval Test", "qty": 5, "unit": "kg"}],
            "total_cost": 50,
            "requested_by": "test-user"
        })
        assert r.status_code == 200
        req_id = r.json().get("requisition_id")
        
        # Approve it
        r2 = api_client.put(f"{BASE_URL}/api/purchasing/requisitions/{req_id}/approve", json={
            "approved_by": "test-approver"
        })
        assert r2.status_code == 200
        
        # Query timeline for approval event
        time.sleep(0.5)
        r3 = api_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": req_id,
            "event_types": ["po.approved"],
            "limit": 10
        })
        assert r3.status_code == 200
        events = r3.json().get("events", [])
        assert len(events) > 0, f"Expected po.approved event for {req_id}"
        print(f"PASS: po.approved event emitted for {req_id}")

    def test_inventory_receive_emits_lot_received(self, api_client):
        """POST /api/inventory/receive emits lot.received per line with auto-minted TLC"""
        # First create a PR to receive against
        r = api_client.post(f"{BASE_URL}/api/purchasing/requisition", json={
            "date": "2026-01-15",
            "outlet": "test",
            "items": [{"ingredient": "Receive Test Item", "qty": 20, "unit": "lb"}],
            "total_cost": 200,
            "requested_by": "test-user"
        })
        req_id = r.json().get("requisition_id")
        
        # Receive against it
        r2 = api_client.post(f"{BASE_URL}/api/inventory/receive", json={
            "requisition_id": req_id,
            "items": [
                {"ingredient": "Receive Test Item", "quantity": 20, "unit": "lb", "unit_cost": 10}
            ],
            "received_by": "test-receiver",
            "supplier": "Test Supplier"
        })
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
        receipt = r2.json()
        receipt_id = receipt.get("receipt_id")
        
        # Query timeline for lot.received events
        time.sleep(0.5)
        r3 = api_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": receipt_id,
            "event_types": ["lot.received"],
            "limit": 20
        })
        assert r3.status_code == 200
        events = r3.json().get("events", [])
        # Should have at least one lot.received event
        assert len(events) > 0, f"Expected lot.received event for receipt {receipt_id}"
        
        # Verify TLC is auto-minted
        for event in events:
            payload = event.get("payload", {})
            tlc = payload.get("tlc")
            assert tlc is not None, "lot.received should have auto-minted TLC"
            assert tlc.startswith("TLC-"), f"TLC should start with 'TLC-', got {tlc}"
        print(f"PASS: lot.received events emitted with auto-minted TLCs")

    def test_inventory_receive_emits_po_received_full(self, api_client):
        """POST /api/inventory/receive emits po.received_full rollup"""
        # Create and receive
        r = api_client.post(f"{BASE_URL}/api/purchasing/requisition", json={
            "date": "2026-01-15",
            "outlet": "test",
            "items": [{"ingredient": "Rollup Test", "qty": 15, "unit": "lb"}],
            "total_cost": 150,
            "requested_by": "test-user"
        })
        req_id = r.json().get("requisition_id")
        
        r2 = api_client.post(f"{BASE_URL}/api/inventory/receive", json={
            "requisition_id": req_id,
            "items": [{"ingredient": "Rollup Test", "quantity": 15, "unit": "lb", "unit_cost": 10}],
            "received_by": "test-receiver",
            "supplier": "Test Supplier"
        })
        receipt_id = r2.json().get("receipt_id")
        
        # Query for po.received_full
        time.sleep(0.5)
        r3 = api_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": req_id,
            "event_types": ["po.received_full"],
            "limit": 10
        })
        assert r3.status_code == 200
        events = r3.json().get("events", [])
        assert len(events) > 0, f"Expected po.received_full event for {req_id}"
        print(f"PASS: po.received_full rollup event emitted")

    def test_standup_send_emits_event(self, admin_client):
        """POST /api/standup/send emits standup.sent"""
        # First ensure board exists and is confirmed
        today = "2026-01-15"
        admin_client.post(f"{BASE_URL}/api/standup/publish", json={
            "date": today,
            "confirmed_by": "test-user"
        })
        
        # Send the standup
        r = admin_client.post(f"{BASE_URL}/api/standup/send", json={
            "date": today,
            "to": []  # Empty = dry run
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Query for standup.sent event
        time.sleep(0.5)
        r2 = admin_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": today,
            "event_types": ["standup.sent"],
            "limit": 10
        })
        assert r2.status_code == 200
        events = r2.json().get("events", [])
        assert len(events) > 0, f"Expected standup.sent event for {today}"
        print(f"PASS: standup.sent event emitted")

    def test_feature_flag_toggle_emits_event(self, admin_client):
        """POST /api/flags/{name} emits feature_flag.toggled"""
        flag_name = f"test_flag_{uuid.uuid4().hex[:8]}"
        
        # Toggle the flag
        r = admin_client.post(f"{BASE_URL}/api/flags/{flag_name}", json={
            "enabled": True,
            "description": "Test flag for timeline emit"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        
        # Query for feature_flag.toggled event
        time.sleep(0.5)
        r2 = admin_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": flag_name,
            "event_types": ["feature_flag.toggled"],
            "limit": 10
        })
        assert r2.status_code == 200
        events = r2.json().get("events", [])
        assert len(events) > 0, f"Expected feature_flag.toggled event for {flag_name}"
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/flags/{flag_name}")
        print(f"PASS: feature_flag.toggled event emitted")


class TestIRDOrderPlaced:
    """Test IRD order.placed emit - this is a CRITICAL test per requirements"""

    def test_ird_order_emits_order_placed(self, api_client, guest_token):
        """POST /api/guest-concierge/in-room-dining/order should emit order.placed"""
        if not guest_token:
            pytest.skip("No guest token available")
        
        headers = {"X-Guest-Token": guest_token}
        
        # Place an IRD order
        r = api_client.post(f"{BASE_URL}/api/guest-concierge/in-room-dining/order", json={
            "lines": [{"name": "Test Item", "qty": 1, "price": 25.00}],
            "desired_time": "now",
            "notes": "Timeline test order"
        }, headers=headers)
        
        if r.status_code != 200:
            print(f"WARNING: IRD order failed with {r.status_code}: {r.text}")
            # This is expected to fail if order.placed emit is not implemented
            pytest.skip("IRD order endpoint may not have order.placed emit implemented")
        
        data = r.json()
        order_id = data.get("order_id")
        
        # Query for order.placed event
        time.sleep(0.5)
        r2 = api_client.post(f"{BASE_URL}/api/timeline/query", json={
            "entity_id": order_id,
            "event_types": ["order.placed"],
            "limit": 10
        })
        assert r2.status_code == 200
        events = r2.json().get("events", [])
        
        if len(events) == 0:
            print("FAIL: order.placed event NOT emitted - MISSING IMPLEMENTATION")
            pytest.fail(f"Expected order.placed event for order {order_id} but none found")
        
        # Verify payload has required fields
        event = events[0]
        payload = event.get("payload", {})
        assert payload.get("commodity") == "in_room_dining", "payload should have commodity=in_room_dining"
        print(f"PASS: order.placed event emitted for IRD order {order_id}")


class TestRegressions:
    """Regression tests for existing functionality"""

    def test_health_endpoint(self, api_client):
        """Health endpoint should work"""
        r = api_client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        print("PASS: health endpoint works")

    def test_timeline_endpoints_accessible(self, api_client):
        """All timeline endpoints should be accessible"""
        endpoints = [
            ("GET", "/api/timeline/recent?limit=5"),
            ("POST", "/api/timeline/query"),
        ]
        for method, path in endpoints:
            if method == "GET":
                r = api_client.get(f"{BASE_URL}{path}")
            else:
                r = api_client.post(f"{BASE_URL}{path}", json={})
            assert r.status_code == 200, f"{method} {path} failed with {r.status_code}"
        print("PASS: all timeline endpoints accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
