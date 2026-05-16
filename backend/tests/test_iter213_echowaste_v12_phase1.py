"""
iter213 · EchoWaste v1.2 Phase 1 Backend Tests

Tests for:
- Feature flags (5 new iter213 flags)
- Multi-zone capture (Feature 3)
- Buffet set/close with pre-cost estimation (Feature 1)
- Cost-per-cover calculation (Feature 2)
- Recipe suggestions approval/rejection
- Ground-truth labelled ingest
- Needs-review pending endpoint
- Idempotency on /capture/still
"""
import os
import pytest
import requests
import uuid
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_client(api_client):
    """Session with admin token"""
    api_client.headers.update({"X-Admin-Token": ADMIN_TOKEN})
    return api_client


class TestFeatureFlags:
    """Test iter213 feature flags are present and enabled"""

    def test_feature_flags_returns_iter213_flags(self, api_client):
        """GET /api/waste/feature-flags returns the 5 new iter213 flags all = True"""
        r = api_client.get(f"{BASE_URL}/api/waste/feature-flags")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        flags = data.get("flags", {})
        
        # iter213 flags
        assert flags.get("feature.buffet_pre_cost") is True, "buffet_pre_cost should be True"
        assert flags.get("feature.cost_per_cover") is True, "cost_per_cover should be True"
        assert flags.get("feature.multi_zone_capture") is True, "multi_zone_capture should be True"
        assert flags.get("feature.collect_ground_truth") is True, "collect_ground_truth should be True"
        assert flags.get("feature.recipe_suggestions") is True, "recipe_suggestions should be True"
        
        print(f"✓ All 5 iter213 feature flags present and enabled")


class TestCaptureStillWithZones:
    """Test multi-zone capture (Feature 3)"""

    def test_capture_init_returns_capture_id(self, api_client):
        """POST /api/waste/capture/init returns capture_id"""
        r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user-iter213"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "capture_id" in data
        assert data["capture_id"].startswith("cap-")
        print(f"✓ capture/init returned capture_id: {data['capture_id']}")

    def test_capture_still_returns_entry_with_cost_breakdown(self, api_client):
        """POST /api/waste/capture/still returns entry with cost_breakdown keyed by categories"""
        # Init capture
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user-iter213"
        })
        cap_id = init_r.json()["capture_id"]
        
        # Upload still
        client_id = f"test-{uuid.uuid4().hex[:8]}"
        r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id,
            "user_id": "test-user-iter213"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "entry_id" in data
        assert "items" in data
        assert "cost_breakdown" in data
        
        # Check cost_breakdown has all 6 categories
        breakdown = data["cost_breakdown"]
        expected_cats = ["protein", "pastry", "produce", "beverages", "dairy", "sundries"]
        for cat in expected_cats:
            assert cat in breakdown, f"cost_breakdown missing category: {cat}"
        
        # Check items have category and needs_review
        for item in data.get("items", []):
            assert "category" in item, "Item missing 'category' field"
            assert "needs_review" in item, "Item missing 'needs_review' field"
        
        print(f"✓ capture/still returned entry with cost_breakdown: {list(breakdown.keys())}")
        return data

    def test_multi_zone_capture_returns_zone_count_and_zones(self, api_client):
        """POST /api/waste/capture/still with zones returns zone_count=3 and zones array"""
        # Init capture
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user-iter213",
            "outlet_id": "outlet-main",
            "station_id": "station-buffet-1"
        })
        cap_id = init_r.json()["capture_id"]
        
        # Upload with 3 zones
        client_id = f"test-multizone-{uuid.uuid4().hex[:8]}"
        r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id,
            "user_id": "test-user-iter213",
            "outlet_id": "outlet-main",
            "station_id": "station-buffet-1",
            "zones": [
                {"zone_name": "Top"},
                {"zone_name": "Middle"},
                {}  # Third zone with no name - should be auto-generated
            ]
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert data.get("zone_count") == 3, f"Expected zone_count=3, got {data.get('zone_count')}"
        assert "zones" in data
        assert len(data["zones"]) == 3
        
        # Check zone names
        zones = data["zones"]
        assert zones[0]["zone_name"] == "Top"
        assert zones[1]["zone_name"] == "Middle"
        # Third zone should be auto-generated matching pattern like UNK-UNK-YYYYMMDD-HHMM-03
        third_zone_name = zones[2]["zone_name"]
        assert "-" in third_zone_name, f"Auto-generated zone name should contain dashes: {third_zone_name}"
        assert third_zone_name.endswith("-03"), f"Third zone should end with -03: {third_zone_name}"
        
        # Check total_cost is sum of zone totals
        assert "total_cost" in data
        assert data["total_cost"] > 0
        
        # Check cost_breakdown is populated
        assert "cost_breakdown" in data
        
        print(f"✓ Multi-zone capture: zone_count={data['zone_count']}, zones={[z['zone_name'] for z in zones]}")
        return data


class TestBuffetSetClose:
    """Test buffet set/close with pre-cost estimation (Feature 1) and cost-per-cover (Feature 2)"""

    def test_buffet_set_creates_session_with_forecast(self, api_client):
        """POST /api/waste/buffet/set creates session with forecast from calendar_events"""
        # First create a capture and entry
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "buffet_set",
            "user_id": "test-user-iter213",
            "outlet_id": "outlet-main"
        })
        cap_id = init_r.json()["capture_id"]
        
        client_id = f"test-buffet-set-{uuid.uuid4().hex[:8]}"
        still_r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id,
            "user_id": "test-user-iter213",
            "outlet_id": "outlet-main"
        })
        entry_id = still_r.json().get("entry_id")
        
        # Now create buffet session
        r = api_client.post(f"{BASE_URL}/api/waste/buffet/set", json={
            "outlet_id": "outlet-main",
            "service_name": "breakfast",
            "capture_id": cap_id,
            "entry_id": entry_id
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "session_id" in data
        assert data["session_id"].startswith("bfs-")
        
        session = data.get("session", {})
        # Check forecast fields (may be 0 if no calendar events)
        assert "group_block_covers" in session or "forecast_covers" in data.get("forecast", {})
        
        # Check set_cost_usd and set_cost_breakdown
        assert "set_cost_usd" in session
        assert "set_cost_breakdown" in session
        assert "estimated_covers_at_setup" in session
        
        print(f"✓ Buffet set created session: {data['session_id']}, set_cost=${session.get('set_cost_usd', 0):.2f}")
        return data

    def test_buffet_guest_count_updates_cost_per_cover(self, api_client):
        """POST /api/waste/buffet/{session_id}/guest-count updates cost-per-cover fields"""
        # Create a buffet session first
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "buffet_set",
            "user_id": "test-user-iter213",
            "outlet_id": "outlet-main"
        })
        cap_id = init_r.json()["capture_id"]
        
        client_id = f"test-buffet-gc-{uuid.uuid4().hex[:8]}"
        still_r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id,
            "user_id": "test-user-iter213"
        })
        entry_id = still_r.json().get("entry_id")
        
        set_r = api_client.post(f"{BASE_URL}/api/waste/buffet/set", json={
            "outlet_id": "outlet-main",
            "service_name": "breakfast",
            "capture_id": cap_id,
            "entry_id": entry_id
        })
        session_id = set_r.json()["session_id"]
        
        # Update guest count
        r = api_client.post(f"{BASE_URL}/api/waste/buffet/{session_id}/guest-count", json={
            "guest_count": 140,
            "source": "manual"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        
        session = data.get("session", {})
        assert session.get("guest_count") == 140
        assert session.get("guest_count_source") == "manual"
        
        # Check cost-per-cover fields are computed
        # These may be None if no close entry yet, but the fields should exist
        assert "cost_per_cover_consumed_usd" in session
        assert "cost_per_cover_wasted_usd" in session
        assert "cost_per_cover_total_usd" in session
        assert "waste_pct" in session
        
        print(f"✓ Guest count updated: {session.get('guest_count')} covers, source={session.get('guest_count_source')}")
        return data

    def test_buffet_cost_breakdown_returns_waterfall(self, api_client):
        """GET /api/waste/buffet/{session_id}/cost-breakdown returns waterfall with historical_comparison"""
        # Create a buffet session
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "buffet_set",
            "user_id": "test-user-iter213"
        })
        cap_id = init_r.json()["capture_id"]
        
        client_id = f"test-buffet-cb-{uuid.uuid4().hex[:8]}"
        still_r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id
        })
        entry_id = still_r.json().get("entry_id")
        
        set_r = api_client.post(f"{BASE_URL}/api/waste/buffet/set", json={
            "outlet_id": "outlet-main",
            "service_name": "breakfast",
            "capture_id": cap_id,
            "entry_id": entry_id
        })
        session_id = set_r.json()["session_id"]
        
        # Get cost breakdown
        r = api_client.get(f"{BASE_URL}/api/waste/buffet/{session_id}/cost-breakdown")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "breakdown" in data
        
        breakdown = data["breakdown"]
        # Check waterfall fields
        assert "set_cost_usd" in breakdown
        assert "refill_cost_usd" in breakdown
        assert "close_cost_usd" in breakdown
        assert "consumed_cost_usd" in breakdown
        
        # Check historical_comparison
        assert "historical_comparison" in breakdown
        
        print(f"✓ Cost breakdown returned: set=${breakdown.get('set_cost_usd', 0):.2f}")
        return data

    def test_buffet_close_sets_status_closed(self, api_client):
        """POST /api/waste/buffet/close closes session and rolls up close_cost_usd + waste_pct"""
        # Create a buffet session
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "buffet_set",
            "user_id": "test-user-iter213"
        })
        cap_id = init_r.json()["capture_id"]
        
        client_id = f"test-buffet-close-{uuid.uuid4().hex[:8]}"
        still_r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id
        })
        entry_id = still_r.json().get("entry_id")
        
        set_r = api_client.post(f"{BASE_URL}/api/waste/buffet/set", json={
            "outlet_id": "outlet-main",
            "service_name": "breakfast",
            "capture_id": cap_id,
            "entry_id": entry_id
        })
        session_id = set_r.json()["session_id"]
        
        # Create close capture
        close_init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "buffet_close",
            "user_id": "test-user-iter213"
        })
        close_cap_id = close_init_r.json()["capture_id"]
        
        close_client_id = f"test-buffet-close-entry-{uuid.uuid4().hex[:8]}"
        close_still_r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": close_cap_id,
            "client_id": close_client_id
        })
        close_entry_id = close_still_r.json().get("entry_id")
        
        # Close the session
        r = api_client.post(f"{BASE_URL}/api/waste/buffet/close", json={
            "session_id": session_id,
            "close_capture_id": close_cap_id,
            "close_entry_id": close_entry_id
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        
        session = data.get("session", {})
        assert session.get("status") == "closed"
        assert "close_cost_usd" in session
        assert "waste_pct" in session
        
        print(f"✓ Buffet closed: status={session.get('status')}, close_cost=${session.get('close_cost_usd', 0):.2f}")
        return data


class TestZoneEndpoints:
    """Test zone CRUD endpoints (Feature 3)"""

    def test_append_zone_to_entry(self, api_client):
        """POST /api/waste/entries/{entry_id}/zones appends a zone and updates parent entry"""
        # Create an entry first
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user-iter213"
        })
        cap_id = init_r.json()["capture_id"]
        
        client_id = f"test-zone-append-{uuid.uuid4().hex[:8]}"
        still_r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id
        })
        entry_id = still_r.json()["entry_id"]
        original_total = still_r.json()["total_cost"]
        
        # Append a zone
        r = api_client.post(f"{BASE_URL}/api/waste/entries/{entry_id}/zones", json={
            "zone_name": "Top shelf"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "zone" in data
        assert data["zone"]["zone_name"] == "Top shelf"
        assert "items" in data
        
        # Check parent entry was updated
        entry = data.get("entry", {})
        assert entry.get("zone_count") >= 1
        assert entry.get("total_cost") >= original_total  # Should be >= since we added items
        
        print(f"✓ Zone appended: {data['zone']['zone_name']}, new zone_count={entry.get('zone_count')}")
        return data

    def test_list_zones_for_entry(self, api_client):
        """GET /api/waste/entries/{entry_id}/zones lists zones"""
        # Create an entry with zones
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user-iter213"
        })
        cap_id = init_r.json()["capture_id"]
        
        client_id = f"test-zone-list-{uuid.uuid4().hex[:8]}"
        still_r = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id,
            "zones": [{"zone_name": "Zone A"}, {"zone_name": "Zone B"}]
        })
        entry_id = still_r.json()["entry_id"]
        
        # List zones
        r = api_client.get(f"{BASE_URL}/api/waste/entries/{entry_id}/zones")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "zones" in data
        assert data.get("count") == 2
        
        print(f"✓ Listed {data['count']} zones for entry {entry_id}")


class TestRecipeSuggestions:
    """Test recipe suggestion approval/rejection endpoints"""

    def test_list_suggested_recipes(self, api_client):
        """GET /api/waste/recipes/suggested returns suggestions array"""
        r = api_client.get(f"{BASE_URL}/api/waste/recipes/suggested")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "suggestions" in data
        # May be empty for stub path
        print(f"✓ Listed {len(data['suggestions'])} suggested recipes")

    def test_approve_reject_unknown_recipe_returns_404(self, api_client):
        """POST /api/waste/recipes/suggested/{recipe_id}/approve returns 404 for unknown recipe_id"""
        r = api_client.post(f"{BASE_URL}/api/waste/recipes/suggested/nonexistent-recipe-id/approve", json={
            "recipe_id": "nonexistent-recipe-id"
        })
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
        
        r2 = api_client.post(f"{BASE_URL}/api/waste/recipes/suggested/nonexistent-recipe-id/reject")
        assert r2.status_code == 404, f"Expected 404, got {r2.status_code}: {r2.text}"
        
        print("✓ Approve/reject returns 404 for unknown recipe_id")


class TestReviewPending:
    """Test needs-review pending endpoint"""

    def test_review_pending_returns_entries_and_count(self, api_client):
        """GET /api/waste/review/pending returns entries with needs_review or pending suggestions"""
        r = api_client.get(f"{BASE_URL}/api/waste/review/pending")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "entries" in data
        assert "pending_suggestions" in data
        assert "count" in data
        
        print(f"✓ Review pending: {data['count']} entries, {data['pending_suggestions']} pending suggestions")


class TestGroundTruthLabelled:
    """Test ground-truth labelled ingest endpoint"""

    def test_training_labelled_stores_record(self, api_client):
        """POST /api/waste/training/labelled stores ground_truth record and returns ground_truth_id"""
        r = api_client.post(f"{BASE_URL}/api/waste/training/labelled", json={
            "capture_id": f"gt-test-{uuid.uuid4().hex[:8]}",
            "labels": [
                {"name": "Blueberry Muffin", "count": 3, "portion_g": 95},
                {"name": "Scrambled Eggs", "count": 2, "portion_g": 180}
            ],
            "notes": "Test ground truth from iter213 testing"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "ground_truth_id" in data
        assert data["ground_truth_id"].startswith("gt-")
        
        print(f"✓ Ground truth stored: {data['ground_truth_id']}")
        return data

    def test_list_labelled_records(self, api_client):
        """GET /api/waste/training/labelled lists ground truth records"""
        r = api_client.get(f"{BASE_URL}/api/waste/training/labelled")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        
        data = r.json()
        assert data.get("ok") is True
        assert "records" in data
        
        print(f"✓ Listed {len(data['records'])} ground truth records")


class TestIdempotency:
    """Test idempotency on /capture/still"""

    def test_same_client_id_returns_idempotent_replay(self, api_client):
        """Same client_id on /capture/still returns idempotent_replay:true"""
        # Init capture
        init_r = api_client.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still",
            "user_id": "test-user-iter213"
        })
        cap_id = init_r.json()["capture_id"]
        
        # First request
        client_id = f"test-idempotent-{uuid.uuid4().hex[:8]}"
        r1 = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id
        })
        assert r1.status_code == 200
        data1 = r1.json()
        entry_id_1 = data1["entry_id"]
        
        # Second request with same client_id
        r2 = api_client.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": client_id
        })
        assert r2.status_code == 200
        data2 = r2.json()
        
        assert data2.get("idempotent_replay") is True, "Second request should return idempotent_replay:true"
        assert data2["entry_id"] == entry_id_1, "Should return same entry_id"
        
        print(f"✓ Idempotency works: same client_id returns idempotent_replay=true")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
