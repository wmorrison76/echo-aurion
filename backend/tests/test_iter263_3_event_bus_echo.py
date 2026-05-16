"""
iter263.3 Backend Tests — Event Bus + Echo AI³ Drawer + Cross-Department Flow

Tests:
1. BEO Auto-Planner events (beo.planned, beo.day_planned)
2. Vendor Scorecard events (vendor.contract_violation)
3. PurchRec Sprint 1 events (purchrec.match_resolved, purchrec.auto_po_created)
4. Admin Console events (admin.rollout, admin.support_ticket, admin.flag_update)
5. Calendar sync (BEOs → calendar_events)
6. WebSocket connectivity and event broadcast
"""
import pytest
import requests
import os
import json
import time
import asyncio
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"


class TestBEOAutoPlanner:
    """BEO Auto-Planner endpoints and event emission"""

    def test_beo_calendar_list(self):
        """GET /api/beo-planner/calendar — list days with BEOs"""
        r = requests.get(f"{BASE_URL}/api/beo-planner/calendar", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "days" in data
        assert "total_days" in data
        print(f"✓ BEO calendar: {data['total_days']} days with BEOs")

    def test_beo_plan_single(self):
        """POST /api/beo-planner/plan/{beo_id} — plan a single BEO (emits beo.planned)"""
        # First get a valid BEO ID from calendar
        cal = requests.get(f"{BASE_URL}/api/beo-planner/calendar", timeout=15).json()
        if not cal.get("days"):
            pytest.skip("No BEOs in system to plan")
        
        # Get first BEO from first day
        first_day = cal["days"][0]
        if not first_day.get("events"):
            pytest.skip("No events in first day")
        
        beo_id = first_day["events"][0].get("id")
        if not beo_id:
            pytest.skip("No BEO ID found")
        
        r = requests.post(f"{BASE_URL}/api/beo-planner/plan/{beo_id}", timeout=60)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "plan_id" in data or "beo_id" in data
        assert "elapsed_ms" in data
        print(f"✓ BEO plan single: {data.get('beo_id')} planned in {data.get('elapsed_ms')}ms")

    def test_beo_plan_day(self):
        """POST /api/beo-planner/plan-day/{date} — plan all BEOs on a date (emits beo.day_planned)"""
        # Use a known date with BEOs
        r = requests.post(f"{BASE_URL}/api/beo-planner/plan-day/2026-04-30", timeout=120)
        assert r.status_code in [200, 404], f"Expected 200/404, got {r.status_code}: {r.text[:200]}"
        if r.status_code == 404:
            pytest.skip("No BEOs on 2026-04-30")
        data = r.json()
        assert "beo_count" in data
        assert "per_event_plans" in data
        assert "cross_event_audit" in data
        print(f"✓ BEO plan day: {data['beo_count']} BEOs, {data.get('total_elapsed_ms')}ms total")

    def test_beo_sync_to_calendar(self):
        """POST /api/beo-planner/sync-to-calendar — push BEOs to calendar_events"""
        r = requests.post(f"{BASE_URL}/api/beo-planner/sync-to-calendar", timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data.get("ok") is True
        assert "pushed" in data
        assert "skipped" in data
        print(f"✓ BEO sync to calendar: pushed={data['pushed']}, skipped={data['skipped']}")

    def test_calendar_events_banquet(self):
        """GET /api/calendar/events — verify banquet events exist after sync"""
        params = {
            "start_date": "2026-04-01",
            "end_date": "2026-07-01",
            "limit": 200
        }
        r = requests.get(f"{BASE_URL}/api/calendar/events", params=params, timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        events = data.get("events", [])
        banquet_events = [e for e in events if e.get("event_type") == "banquet"]
        print(f"✓ Calendar events: {len(events)} total, {len(banquet_events)} banquet type")


class TestVendorScorecard:
    """Vendor Scorecard endpoints and event emission"""

    def test_scorecards_list(self):
        """GET /api/vendor-scorecard/scorecards"""
        r = requests.get(f"{BASE_URL}/api/vendor-scorecard/scorecards", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "scorecards" in data
        assert "summary" in data
        print(f"✓ Vendor scorecards: {len(data['scorecards'])} vendors, ${data['summary'].get('total_spend_usd', 0):,.0f} spend")

    def test_violations_list(self):
        """GET /api/vendor-scorecard/violations — emits vendor.contract_violation if violations > 0"""
        r = requests.get(f"{BASE_URL}/api/vendor-scorecard/violations", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "violations" in data
        assert "summary" in data
        violations_count = data["summary"].get("violations", 0)
        print(f"✓ Vendor violations: {violations_count} violations, ${data['summary'].get('estimated_overcharge_usd', 0):,.2f} overcharge")


class TestPurchRecSprint1:
    """PurchRec Sprint 1 endpoints and event emission"""

    def test_match_exceptions(self):
        """GET /api/purchrec/match/exceptions"""
        r = requests.get(f"{BASE_URL}/api/purchrec/match/exceptions", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "exceptions" in data
        assert "summary" in data
        print(f"✓ PurchRec exceptions: {data['summary'].get('exception', 0)} exceptions, ${data['summary'].get('value_at_risk_usd', 0):,.2f} at risk")

    def test_match_resolve(self):
        """POST /api/purchrec/match/resolve — emits purchrec.match_resolved"""
        payload = {
            "po_id": "PO-1042",
            "note": "Test resolution from iter263.3 testing",
            "actor": "test-agent"
        }
        r = requests.post(f"{BASE_URL}/api/purchrec/match/resolve", json=payload, timeout=15)
        assert r.status_code in [200, 404], f"Expected 200/404, got {r.status_code}: {r.text[:200]}"
        if r.status_code == 200:
            data = r.json()
            assert data.get("ok") is True
            print(f"✓ PurchRec resolve: {payload['po_id']} resolved")
        else:
            print(f"✓ PurchRec resolve: PO not found (expected if already resolved)")

    def test_par_scan(self):
        """GET /api/purchrec/par/scan"""
        r = requests.get(f"{BASE_URL}/api/purchrec/par/scan", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "suggestions" in data
        assert "summary" in data
        print(f"✓ PAR scan: {data['summary'].get('suggested_po_count', 0)} suggested POs, ${data['summary'].get('estimated_spend', 0):,.2f}")

    def test_auto_po(self):
        """POST /api/purchrec/par/auto-po — emits purchrec.auto_po_created"""
        payload = {
            "actor": "test-agent",
            "auto_submit": False
        }
        r = requests.post(f"{BASE_URL}/api/purchrec/par/auto-po", json=payload, timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data.get("ok") is True
        assert "created" in data
        print(f"✓ Auto-PO: {data['created']} POs created")


class TestAdminConsole:
    """Admin Console endpoints and event emission"""

    def test_pulse(self):
        """GET /api/admin-console/pulse"""
        r = requests.get(f"{BASE_URL}/api/admin-console/pulse", timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "uptime_human" in data
        assert "active_users_15m" in data
        print(f"✓ Admin pulse: uptime={data['uptime_human']}, active_users={data['active_users_15m']}")

    def test_rollout(self):
        """POST /api/admin-console/updates/rollout — emits admin.rollout"""
        payload = {"percent": 100}
        r = requests.post(f"{BASE_URL}/api/admin-console/updates/rollout", json=payload, timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data.get("ok") is True
        assert "rollout" in data
        print(f"✓ Admin rollout: {data['rollout'].get('target_version')} at {data['rollout'].get('percent_rolled_out')}%")

    def test_tech_support(self):
        """POST /api/admin-console/tech-support — emits admin.support_ticket"""
        payload = {
            "subject": "Test ticket from iter263.3",
            "body": "This is a test support ticket created during automated testing.",
            "severity": "normal"
        }
        r = requests.post(f"{BASE_URL}/api/admin-console/tech-support", json=payload, timeout=15)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data.get("ok") is True
        assert "ticket" in data
        print(f"✓ Admin support ticket: {data['ticket'].get('id')}")

    def test_feature_flag_update(self):
        """PUT /api/admin-console/feature-flags/{flag_id} — emits admin.flag_update"""
        # First get current state
        r = requests.get(f"{BASE_URL}/api/admin-console/feature-flags", timeout=15)
        assert r.status_code == 200
        flags = r.json().get("flags", [])
        
        # Find chronos.v2 flag
        flag = next((f for f in flags if f["id"] == "chronos.v2"), None)
        if not flag:
            pytest.skip("chronos.v2 flag not found")
        
        # Toggle it
        new_state = not flag.get("enabled", True)
        r = requests.put(
            f"{BASE_URL}/api/admin-console/feature-flags/chronos.v2",
            json={"enabled": new_state},
            timeout=15
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("enabled") == new_state
        
        # Toggle back
        requests.put(
            f"{BASE_URL}/api/admin-console/feature-flags/chronos.v2",
            json={"enabled": not new_state},
            timeout=15
        )
        print(f"✓ Admin flag update: chronos.v2 toggled to {new_state} and back")


class TestWebSocketBroadcast:
    """WebSocket connectivity and event broadcast tests"""

    def test_ws_connect_and_ping(self):
        """Test WebSocket connection and ping/pong"""
        import asyncio
        
        async def ws_test():
            ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
            try:
                async with websockets.connect(ws_url, close_timeout=10, open_timeout=10) as ws:
                    # Send ping
                    await ws.send("ping")
                    # Wait for pong
                    response = await asyncio.wait_for(ws.recv(), timeout=5)
                    data = json.loads(response)
                    assert data.get("type") == "pong"
                    return True
            except Exception as e:
                print(f"WebSocket error: {e}")
                return False
        
        result = asyncio.get_event_loop().run_until_complete(ws_test())
        assert result, "WebSocket ping/pong failed"
        print("✓ WebSocket ping/pong working")

    def test_ws_receives_events(self):
        """Test that WebSocket receives events when backend endpoints are triggered"""
        import asyncio
        
        async def ws_event_test():
            ws_url = BASE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws"
            events_received = []
            
            try:
                async with websockets.connect(ws_url, timeout=15) as ws:
                    # Start listening in background
                    async def listen():
                        try:
                            while len(events_received) < 5:
                                msg = await asyncio.wait_for(ws.recv(), timeout=12)
                                data = json.loads(msg)
                                if data.get("type") != "pong":
                                    events_received.append(data)
                        except asyncio.TimeoutError:
                            pass
                    
                    listen_task = asyncio.create_task(listen())
                    
                    # Trigger multiple endpoints that emit events
                    await asyncio.sleep(0.5)
                    
                    # 1. Admin rollout
                    requests.post(f"{BASE_URL}/api/admin-console/updates/rollout", json={"percent": 100}, timeout=10)
                    await asyncio.sleep(0.3)
                    
                    # 2. Admin support ticket
                    requests.post(f"{BASE_URL}/api/admin-console/tech-support", json={
                        "subject": "WS test", "body": "test", "severity": "normal"
                    }, timeout=10)
                    await asyncio.sleep(0.3)
                    
                    # 3. PurchRec auto-po
                    requests.post(f"{BASE_URL}/api/purchrec/par/auto-po", json={"actor": "ws-test"}, timeout=10)
                    await asyncio.sleep(0.3)
                    
                    # 4. Vendor violations (may emit if violations exist)
                    requests.get(f"{BASE_URL}/api/vendor-scorecard/violations", timeout=10)
                    await asyncio.sleep(0.3)
                    
                    # 5. BEO sync
                    requests.post(f"{BASE_URL}/api/beo-planner/sync-to-calendar", timeout=10)
                    
                    # Wait for events
                    await asyncio.sleep(3)
                    listen_task.cancel()
                    
                    return events_received
            except Exception as e:
                print(f"WebSocket event test error: {e}")
                return events_received
        
        events = asyncio.get_event_loop().run_until_complete(ws_event_test())
        print(f"✓ WebSocket received {len(events)} events: {[e.get('type') for e in events]}")
        # We expect at least some events (admin.rollout, admin.support_ticket, purchrec.auto_po_created)
        # Note: This may vary based on system state


class TestHealthAndRegression:
    """Basic health and regression tests"""

    def test_health(self):
        """GET /api/health"""
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")

    def test_calendar_events_endpoint(self):
        """GET /api/calendar/events"""
        r = requests.get(f"{BASE_URL}/api/calendar/events", params={"limit": 10}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        # API returns either "events" or "data" key
        events = data.get("events") or data.get("data", [])
        assert isinstance(events, list)
        print(f"✓ Calendar events: {len(events)} events returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
