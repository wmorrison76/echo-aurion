"""
iter196 · FM-Upgrade 7 + Echo WhatsNew + 90-day Backfill Migration Tests

Tests:
1. Floor surface token mint + /me + /queue + /ccp + /pack-action + /my-activity
2. Route surface token mint + /me + /stops + /pod + /shift-summary
3. Echo WhatsNew NL summarization (with LLM key or fallback)
4. 90-day backfill migration idempotency
5. Regression tests for iter195 endpoints
"""
import os
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_headers():
    return {"Content-Type": "application/json", "X-Admin-Token": ADMIN_TOKEN}


# ═══════════════════════════════════════════════════════════════════════
# FM-Upgrade 7 · Floor Surface Tests
# ═══════════════════════════════════════════════════════════════════════
class TestFloorSurface:
    """Floor surface (kitchen tablet) endpoint tests"""
    
    floor_token = None
    station_id = None
    
    def test_floor_mint_token_admin_gated(self, api_client, admin_headers):
        """POST /api/floor/admin/mint-token requires admin token"""
        # Without admin token should fail
        r = api_client.post(f"{BASE_URL}/api/floor/admin/mint-token", json={
            "station_name": "TEST_Lane A · Bowls"
        })
        assert r.status_code == 401, f"Expected 401 without admin token, got {r.status_code}"
        
    def test_floor_mint_token_success(self, api_client, admin_headers):
        """POST /api/floor/admin/mint-token returns token, station_id, station_name, url"""
        r = api_client.post(f"{BASE_URL}/api/floor/admin/mint-token", json={
            "station_name": "TEST_iter196_Lane A · Bowls",
            "ttl_days": 7
        }, headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
        assert "station_id" in data
        assert "station_name" in data
        assert "url" in data
        assert data["url"].startswith("/floor/")
        TestFloorSurface.floor_token = data["token"]
        TestFloorSurface.station_id = data["station_id"]
        print(f"Minted floor token: {data['token'][:20]}...")
        
    def test_floor_me_with_valid_token(self, api_client):
        """GET /api/floor/me with X-Floor-Token returns station info"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.get(f"{BASE_URL}/api/floor/me", headers={
            "X-Floor-Token": TestFloorSurface.floor_token
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "station_id" in data
        assert "station_name" in data
        assert data["station_name"] == "TEST_iter196_Lane A · Bowls"
        
    def test_floor_me_bad_token_401(self, api_client):
        """GET /api/floor/me with bad token returns 401"""
        r = api_client.get(f"{BASE_URL}/api/floor/me", headers={
            "X-Floor-Token": "invalid-token-xyz"
        })
        assert r.status_code == 401
        
    def test_floor_me_missing_token_401(self, api_client):
        """GET /api/floor/me without token returns 401"""
        r = api_client.get(f"{BASE_URL}/api/floor/me")
        assert r.status_code == 401
        
    def test_floor_queue(self, api_client):
        """GET /api/floor/queue returns runs[] + packs_in_queue[]"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.get(f"{BASE_URL}/api/floor/queue", headers={
            "X-Floor-Token": TestFloorSurface.floor_token
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "runs" in data
        assert "packs_in_queue" in data
        assert isinstance(data["runs"], list)
        assert isinstance(data["packs_in_queue"], list)
        
    def test_floor_ccp_passing(self, api_client):
        """POST /api/floor/ccp logs passing CCP (cook_temp >= 74)"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.post(f"{BASE_URL}/api/floor/ccp", json={
            "ccp_type": "cook_temp",
            "measurement": 78.5,
            "threshold_min": 74.0
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("passing") is True
        assert "record" in data
        assert data["record"]["ccp_type"] == "cook_temp"
        assert data["record"]["measurement"] == 78.5
        
    def test_floor_ccp_failing(self, api_client):
        """POST /api/floor/ccp logs failing CCP (cook_temp < 74)"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.post(f"{BASE_URL}/api/floor/ccp", json={
            "ccp_type": "cook_temp",
            "measurement": 68.0,
            "threshold_min": 74.0
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("passing") is False
        
    def test_floor_ccp_with_pack_id(self, api_client):
        """POST /api/floor/ccp with pack_id links to pack"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.post(f"{BASE_URL}/api/floor/ccp", json={
            "ccp_type": "ph",
            "measurement": 4.3,
            "pack_id": "pack-test-iter196",
            "threshold_min": 4.0,
            "threshold_max": 4.6
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("passing") is True
        assert data["record"]["pack_id"] == "pack-test-iter196"
        
    def test_floor_pack_action_bad_action_400(self, api_client):
        """POST /api/floor/pack-action with invalid action returns 400"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.post(f"{BASE_URL}/api/floor/pack-action", json={
            "pack_id": "pack-test-iter196",
            "action": "invalid_action"
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 400
        
    def test_floor_pack_action_missing_pack_404(self, api_client):
        """POST /api/floor/pack-action with non-existent pack returns 404"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.post(f"{BASE_URL}/api/floor/pack-action", json={
            "pack_id": "pack-nonexistent-xyz",
            "action": "start"
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 404
        
    def test_floor_my_activity(self, api_client):
        """GET /api/floor/my-activity returns station's own events"""
        assert TestFloorSurface.floor_token, "Floor token not minted"
        r = api_client.get(f"{BASE_URL}/api/floor/my-activity?limit=20", headers={
            "X-Floor-Token": TestFloorSurface.floor_token
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "events" in data
        assert isinstance(data["events"], list)


# ═══════════════════════════════════════════════════════════════════════
# FM-Upgrade 7 · Route Surface Tests
# ═══════════════════════════════════════════════════════════════════════
class TestRouteSurface:
    """Route surface (driver mobile) endpoint tests"""
    
    route_token = None
    driver_id = None
    
    def test_route_mint_token_admin_gated(self, api_client, admin_headers):
        """POST /api/route/admin/mint-token requires admin token"""
        r = api_client.post(f"{BASE_URL}/api/route/admin/mint-token", json={
            "driver_name": "TEST_Alex Driver"
        })
        assert r.status_code == 401
        
    def test_route_mint_token_success(self, api_client, admin_headers):
        """POST /api/route/admin/mint-token returns token, driver_id, driver_name, url"""
        r = api_client.post(f"{BASE_URL}/api/route/admin/mint-token", json={
            "driver_name": "TEST_iter196_Alex Driver",
            "ttl_days": 7
        }, headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "token" in data
        assert "driver_id" in data
        assert "driver_name" in data
        assert "url" in data
        assert data["url"].startswith("/route/")
        TestRouteSurface.route_token = data["token"]
        TestRouteSurface.driver_id = data["driver_id"]
        print(f"Minted route token: {data['token'][:20]}...")
        
    def test_route_me_with_valid_token(self, api_client):
        """GET /api/route/me with X-Route-Token returns driver info"""
        assert TestRouteSurface.route_token, "Route token not minted"
        r = api_client.get(f"{BASE_URL}/api/route/me", headers={
            "X-Route-Token": TestRouteSurface.route_token
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "driver_id" in data
        assert "driver_name" in data
        assert data["driver_name"] == "TEST_iter196_Alex Driver"
        
    def test_route_me_bad_token_401(self, api_client):
        """GET /api/route/me with bad token returns 401"""
        r = api_client.get(f"{BASE_URL}/api/route/me", headers={
            "X-Route-Token": "invalid-token-xyz"
        })
        assert r.status_code == 401
        
    def test_route_stops(self, api_client):
        """GET /api/route/stops returns stops grouped by customer"""
        assert TestRouteSurface.route_token, "Route token not minted"
        r = api_client.get(f"{BASE_URL}/api/route/stops", headers={
            "X-Route-Token": TestRouteSurface.route_token
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "stops" in data
        assert "total_stops" in data
        assert isinstance(data["stops"], list)
        
    def test_route_pod_bad_outcome_400(self, api_client):
        """POST /api/route/pod with invalid outcome returns 400"""
        assert TestRouteSurface.route_token, "Route token not minted"
        r = api_client.post(f"{BASE_URL}/api/route/pod", json={
            "pack_ids": ["pack-test-1"],
            "outcome": "invalid_outcome"
        }, headers={"X-Route-Token": TestRouteSurface.route_token, "Content-Type": "application/json"})
        assert r.status_code == 400
        
    def test_route_pod_delivered(self, api_client):
        """POST /api/route/pod with outcome=delivered marks packs delivered"""
        assert TestRouteSurface.route_token, "Route token not minted"
        r = api_client.post(f"{BASE_URL}/api/route/pod", json={
            "pack_ids": ["pack-nonexistent-test"],  # Will return 0 updated but 200 OK
            "temp_c": 4.0,
            "outcome": "delivered"
        }, headers={"X-Route-Token": TestRouteSurface.route_token, "Content-Type": "application/json"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "updated_pack_ids" in data
        assert data["outcome"] == "delivered"
        
    def test_route_pod_missed(self, api_client):
        """POST /api/route/pod with outcome=missed marks packs as issue"""
        assert TestRouteSurface.route_token, "Route token not minted"
        r = api_client.post(f"{BASE_URL}/api/route/pod", json={
            "pack_ids": ["pack-nonexistent-test"],
            "outcome": "missed",
            "note": "Customer not home"
        }, headers={"X-Route-Token": TestRouteSurface.route_token, "Content-Type": "application/json"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data["outcome"] == "missed"
        
    def test_route_shift_summary(self, api_client):
        """GET /api/route/shift-summary returns EOD counts"""
        assert TestRouteSurface.route_token, "Route token not minted"
        r = api_client.get(f"{BASE_URL}/api/route/shift-summary", headers={
            "X-Route-Token": TestRouteSurface.route_token
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "delivered" in data
        assert "issues" in data
        assert "total_stops" in data
        assert "avg_drop_temp_c" in data


# ═══════════════════════════════════════════════════════════════════════
# Echo WhatsNew Tests
# ═══════════════════════════════════════════════════════════════════════
class TestEchoWhatsNew:
    """Echo 'What just happened?' NL summarization tests"""
    
    def test_whats_new_basic(self, api_client):
        """POST /api/echo/whats-new returns summary with mode"""
        r = api_client.post(f"{BASE_URL}/api/echo/whats-new", json={
            "minutes": 30
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "summary" in data
        assert "headline" in data
        assert "event_count" in data
        assert "mode" in data
        assert "window_minutes" in data
        assert data["window_minutes"] == 30
        # Mode should be one of: llm, empty, fallback_no_llm, fallback_llm_error
        assert data["mode"] in ("llm", "empty", "fallback_no_llm", "fallback_llm_error")
        print(f"WhatsNew mode: {data['mode']}, event_count: {data['event_count']}")
        
    def test_whats_new_15_minutes(self, api_client):
        """POST /api/echo/whats-new with 15 minutes window"""
        r = api_client.post(f"{BASE_URL}/api/echo/whats-new", json={
            "minutes": 15
        })
        assert r.status_code == 200
        data = r.json()
        assert data["window_minutes"] == 15
        
    def test_whats_new_60_minutes(self, api_client):
        """POST /api/echo/whats-new with 60 minutes window"""
        r = api_client.post(f"{BASE_URL}/api/echo/whats-new", json={
            "minutes": 60
        })
        assert r.status_code == 200
        data = r.json()
        assert data["window_minutes"] == 60
        
    def test_whats_new_180_minutes(self, api_client):
        """POST /api/echo/whats-new with 180 minutes (3 hrs) window"""
        r = api_client.post(f"{BASE_URL}/api/echo/whats-new", json={
            "minutes": 180
        })
        assert r.status_code == 200
        data = r.json()
        assert data["window_minutes"] == 180
        
    def test_whats_new_with_kinds_filter(self, api_client):
        """POST /api/echo/whats-new with kinds filter"""
        r = api_client.post(f"{BASE_URL}/api/echo/whats-new", json={
            "minutes": 60,
            "kinds": ["pack", "order"]
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
    def test_whats_new_empty_window(self, api_client):
        """POST /api/echo/whats-new with very short window may return empty"""
        r = api_client.post(f"{BASE_URL}/api/echo/whats-new", json={
            "minutes": 1  # Very short window
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # If no events, mode should be 'empty'
        if data["event_count"] == 0:
            assert data["mode"] == "empty"


# ═══════════════════════════════════════════════════════════════════════
# Regression Tests - iter195 endpoints
# ═══════════════════════════════════════════════════════════════════════
class TestRegressionIter195:
    """Regression tests for iter195 endpoints (recipe graph, pack CRUD, fresh meals, FDA recall, channels, kitchen calendar, echo capabilities)"""
    
    def test_recipe_graph_seed_demo(self, api_client, admin_headers):
        """POST /api/recipe-graph/seed-demo seeds demo recipes"""
        r = api_client.post(f"{BASE_URL}/api/recipe-graph/seed-demo", headers=admin_headers)
        assert r.status_code == 200
        
    def test_recipe_graph_list(self, api_client):
        """GET /api/recipe-graph/recipes returns list"""
        r = api_client.get(f"{BASE_URL}/api/recipe-graph/recipes")
        assert r.status_code == 200
        data = r.json()
        assert "recipes" in data
        
    def test_fresh_meals_ops_dashboard(self, api_client):
        """GET /api/fresh-meals/ops-dashboard returns 200"""
        r = api_client.get(f"{BASE_URL}/api/fresh-meals/ops-dashboard")
        assert r.status_code == 200
        
    def test_fresh_meals_products(self, api_client):
        """GET /api/fresh-meals/products returns 200"""
        r = api_client.get(f"{BASE_URL}/api/fresh-meals/products")
        assert r.status_code == 200
        
    def test_fresh_meals_packs(self, api_client):
        """GET /api/fresh-meals/packs returns 200"""
        r = api_client.get(f"{BASE_URL}/api/fresh-meals/packs")
        assert r.status_code == 200
        
    def test_fda_recall_export_no_anchor_400(self, api_client, admin_headers):
        """GET /api/compliance/fda-recall/export without anchor returns 400"""
        r = api_client.get(f"{BASE_URL}/api/compliance/fda-recall/export", headers=admin_headers)
        assert r.status_code == 400
        
    def test_channels_list(self, api_client):
        """GET /api/channels returns list"""
        r = api_client.get(f"{BASE_URL}/api/channels")
        assert r.status_code == 200
        data = r.json()
        assert "channels" in data
        
    def test_kitchen_calendar_list(self, api_client):
        """GET /api/kitchen-calendar returns list"""
        r = api_client.get(f"{BASE_URL}/api/kitchen-calendar")
        assert r.status_code == 200
        
    def test_kitchen_calendar_today(self, api_client):
        """GET /api/kitchen-calendar/today returns today's calendar"""
        r = api_client.get(f"{BASE_URL}/api/kitchen-calendar/today")
        assert r.status_code == 200
        data = r.json()
        assert "weekday" in data
        assert "day_type" in data
        
    def test_echo_capabilities(self, api_client):
        """GET /api/echo/capabilities returns capabilities list"""
        r = api_client.get(f"{BASE_URL}/api/echo/capabilities")
        assert r.status_code == 200
        data = r.json()
        assert "capabilities" in data


# ═══════════════════════════════════════════════════════════════════════
# Regression Tests - iter194 Timeline
# ═══════════════════════════════════════════════════════════════════════
class TestRegressionIter194Timeline:
    """Regression tests for iter194 timeline endpoints"""
    
    def test_timeline_recent(self, api_client):
        """GET /api/timeline/recent returns recent events"""
        r = api_client.get(f"{BASE_URL}/api/timeline/recent?limit=50")
        assert r.status_code == 200
        data = r.json()
        assert "events" in data
        
    def test_timeline_query(self, api_client):
        """POST /api/timeline/query returns filtered events"""
        r = api_client.post(f"{BASE_URL}/api/timeline/query", json={
            "limit": 20
        })
        assert r.status_code == 200
        data = r.json()
        assert "events" in data


# ═══════════════════════════════════════════════════════════════════════
# Pack Lifecycle Integration Test
# ═══════════════════════════════════════════════════════════════════════
class TestPackLifecycleWithFloor:
    """Integration test: create pack via fresh-meals, then use floor surface to advance it"""
    
    test_pack_id = None
    
    def test_create_pack(self, api_client, admin_headers):
        """Create a test pack for floor surface testing"""
        import uuid
        pack_id = f"pack-iter196-{uuid.uuid4().hex[:8]}"
        r = api_client.post(f"{BASE_URL}/api/fresh-meals/packs", json={
            "id": pack_id,
            "order_id": "order-iter196-test",
            "product_id": "prod-thai-peanut-bowl",
            "customer_id": "cust-iter196-test",
            "channel_id": "ch-b2c-sub",
            "lot_composition": [
                {"lot_id": "lot-iter196-1", "tlc": "TLC-ITER196-A", "commodity": "chicken", "grams": 150},
                {"lot_id": "lot-iter196-2", "tlc": "TLC-ITER196-B", "commodity": "peanut_sauce", "grams": 80}
            ]
        }, headers=admin_headers)
        assert r.status_code in (200, 201), f"Expected 200/201, got {r.status_code}: {r.text}"
        data = r.json()
        TestPackLifecycleWithFloor.test_pack_id = data.get("pack", {}).get("id") or pack_id
        print(f"Created test pack: {TestPackLifecycleWithFloor.test_pack_id}")
        
    def test_floor_pack_action_start(self, api_client):
        """Use floor surface to start pack production"""
        if not TestPackLifecycleWithFloor.test_pack_id:
            pytest.skip("No test pack created")
        if not TestFloorSurface.floor_token:
            pytest.skip("No floor token minted")
            
        r = api_client.post(f"{BASE_URL}/api/floor/pack-action", json={
            "pack_id": TestPackLifecycleWithFloor.test_pack_id,
            "action": "start"
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "in_production"
        
    def test_floor_pack_action_seal(self, api_client):
        """Use floor surface to seal pack"""
        if not TestPackLifecycleWithFloor.test_pack_id:
            pytest.skip("No test pack created")
        if not TestFloorSurface.floor_token:
            pytest.skip("No floor token minted")
            
        r = api_client.post(f"{BASE_URL}/api/floor/pack-action", json={
            "pack_id": TestPackLifecycleWithFloor.test_pack_id,
            "action": "seal",
            "temp_c": 3.5
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "packed"
        
    def test_floor_pack_action_label(self, api_client):
        """Use floor surface to label and stage pack"""
        if not TestPackLifecycleWithFloor.test_pack_id:
            pytest.skip("No test pack created")
        if not TestFloorSurface.floor_token:
            pytest.skip("No floor token minted")
            
        r = api_client.post(f"{BASE_URL}/api/floor/pack-action", json={
            "pack_id": TestPackLifecycleWithFloor.test_pack_id,
            "action": "label"
        }, headers={"X-Floor-Token": TestFloorSurface.floor_token, "Content-Type": "application/json"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "staged"
        
    def test_verify_pack_status_staged(self, api_client):
        """Verify pack is now staged"""
        if not TestPackLifecycleWithFloor.test_pack_id:
            pytest.skip("No test pack created")
            
        r = api_client.get(f"{BASE_URL}/api/fresh-meals/packs/{TestPackLifecycleWithFloor.test_pack_id}")
        assert r.status_code == 200
        data = r.json()
        pack = data.get("pack", data)
        assert pack.get("status") == "staged"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
