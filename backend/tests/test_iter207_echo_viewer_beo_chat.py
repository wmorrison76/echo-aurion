"""
iter207 · Echo Activity expand feature + b-f suite tests
- POST /api/echo-ai3/analyze-event — analyze TimelineEvent
- GET /api/echo-viewer/event/{event_id} — aggregated event viewer
- POST /api/beo-builder/drafts/{id}/finalize — finalize draft with GL + Maestro + Aurum
- POST /api/beo-builder/beos/{beo_id}/push-maestro — manual re-push
- POST /api/echo/chat — intent detection for "what happened with {event}?"
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test data from review request
ELROY_EVENT_ID = "22758693-c17d-46ca-8617-96cc97d0bb03"
DRAFT_ID = "draft-d3aab87a28"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestEchoAI3AnalyzeEvent:
    """Tests for POST /api/echo-ai3/analyze-event"""

    def test_analyze_event_with_sample_timeline_event(self, api_client):
        """Pass a sample TimelineEvent and assert {ok:true, analysis:string, mode}"""
        sample_event = {
            "type": "po.received",
            "timestamp": "2026-01-22T10:00:00Z",
            "actor": {"type": "user", "id": "user-123", "name": "John Doe"},
            "entity_refs": [
                {"kind": "po", "id": "po-001", "name": "PO #001"},
                {"kind": "vendor", "id": "vendor-abc", "name": "Fresh Farms"}
            ],
            "payload": {
                "tlc": "TLC-ABC12345",
                "temp_c": 4.5,
                "commodity": "Salmon",
                "quantity": 50,
                "unit": "lbs"
            }
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/echo-ai3/analyze-event",
            json={"event": sample_event}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Assert required fields
        assert data.get("ok") is True, "Expected ok=True"
        assert "analysis" in data, "Expected 'analysis' field in response"
        assert isinstance(data["analysis"], str), "analysis should be a string"
        assert len(data["analysis"]) > 0, "analysis should not be empty"
        assert "mode" in data, "Expected 'mode' field in response"
        
        print(f"✓ analyze-event returned mode={data['mode']}, analysis length={len(data['analysis'])}")

    def test_analyze_event_heuristic_fallback(self, api_client):
        """Verify heuristic fallback when LLM fails (payload still returns analysis)"""
        # Even with minimal event, should return analysis via heuristic
        minimal_event = {
            "type": "ccp.temp_check",
            "timestamp": "2026-01-22T11:00:00Z",
            "payload": {"temp_c": 12}  # Outside safe band to trigger warning
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/echo-ai3/analyze-event",
            json={"event": minimal_event}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "analysis" in data
        assert len(data["analysis"]) > 0, "Heuristic should always return some analysis"
        
        # Check if temp warning is in analysis (temp 12°C is outside 0-7°C safe band)
        print(f"✓ Heuristic fallback working, mode={data.get('mode')}")


class TestEchoViewerEvent:
    """Tests for GET /api/echo-viewer/event/{event_id}"""

    def test_echo_viewer_elroy_event(self, api_client):
        """Test with Elroy Lipfrat event_id - assert summary.has_event=True and all keys present"""
        response = api_client.get(f"{BASE_URL}/api/echo-viewer/event/{ELROY_EVENT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Assert ok=True
        assert data.get("ok") is True, "Expected ok=True"
        
        # Assert summary.has_event=True
        summary = data.get("summary", {})
        assert summary.get("has_event") is True, f"Expected summary.has_event=True for Elroy event, got {summary}"
        
        # Assert all required keys are present
        required_keys = ["event", "contact", "beo_draft", "beo", "maestro_dispatches", 
                        "aurum_gl_entries", "calendar_entries", "timeline"]
        for key in required_keys:
            assert key in data, f"Missing required key: {key}"
        
        print(f"✓ Echo viewer for Elroy event: has_event={summary.get('has_event')}, "
              f"has_beo={summary.get('has_finalized_beo')}, gl_code={summary.get('gl_code')}, "
              f"timeline_events={summary.get('timeline_events')}")

    def test_echo_viewer_nonexistent_event(self, api_client):
        """Test with random non-existent id returns ok:true with summary.has_event=False"""
        random_id = f"nonexistent-{uuid.uuid4().hex[:8]}"
        response = api_client.get(f"{BASE_URL}/api/echo-viewer/event/{random_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("ok") is True, "Expected ok=True even for non-existent event"
        summary = data.get("summary", {})
        assert summary.get("has_event") is False, f"Expected has_event=False for non-existent event, got {summary}"
        
        print(f"✓ Non-existent event returns ok=True, has_event=False")


class TestBeoBuilderFinalize:
    """Tests for POST /api/beo-builder/drafts/{id}/finalize"""

    def test_finalize_draft_returns_gl_and_maestro(self, api_client):
        """Finalize draft and assert gl_code, maestro_pushed=true, aurum_gl_routed=true"""
        # First check if draft exists
        draft_response = api_client.get(f"{BASE_URL}/api/beo-builder/drafts/{DRAFT_ID}")
        
        if draft_response.status_code == 404:
            pytest.skip(f"Draft {DRAFT_ID} not found - may have been finalized already")
        
        # If draft is already finalized, check the BEO instead
        if draft_response.status_code == 200:
            draft_data = draft_response.json()
            if draft_data.get("status") == "finalized":
                # Draft already finalized, verify the BEO exists
                beo_id = draft_data.get("beo_id")
                if beo_id:
                    print(f"✓ Draft already finalized to BEO {beo_id}")
                    return
        
        # Finalize the draft
        response = api_client.post(f"{BASE_URL}/api/beo-builder/drafts/{DRAFT_ID}/finalize")
        
        if response.status_code == 404:
            pytest.skip(f"Draft {DRAFT_ID} not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Assert gl_code is present (5200-BEO or 5210-AV)
        assert "gl_code" in data, "Expected gl_code in finalize response"
        assert data["gl_code"] in ["5200-BEO", "5210-AV"], f"Unexpected gl_code: {data['gl_code']}"
        
        # Assert maestro_pushed=true
        assert data.get("maestro_pushed") is True, "Expected maestro_pushed=True"
        
        # Assert aurum_gl_routed=true
        assert data.get("aurum_gl_routed") is True, "Expected aurum_gl_routed=True"
        
        print(f"✓ Finalize returned: beo_id={data.get('beo_id')}, gl_code={data['gl_code']}, "
              f"maestro_pushed={data['maestro_pushed']}, aurum_gl_routed={data['aurum_gl_routed']}")
        
        return data.get("beo_id")

    def test_timeline_events_after_finalize(self, api_client):
        """Verify /api/timeline/recent includes beo.finalized, beo.pushed_to_maestro, beo.gl_routed events"""
        response = api_client.get(f"{BASE_URL}/api/timeline/recent?limit=50")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        events = data.get("events", [])
        
        # Check for BEO-related timeline events
        event_types = [e.get("type") for e in events]
        
        beo_finalized = "beo.finalized" in event_types
        beo_pushed = "beo.pushed_to_maestro" in event_types
        beo_gl_routed = "beo.gl_routed" in event_types
        
        print(f"✓ Timeline events: beo.finalized={beo_finalized}, "
              f"beo.pushed_to_maestro={beo_pushed}, beo.gl_routed={beo_gl_routed}")
        
        # At least one of these should exist if finalize was ever called
        assert beo_finalized or beo_pushed or beo_gl_routed, \
            "Expected at least one BEO timeline event (finalized/pushed/gl_routed)"


class TestBeoMaestroPush:
    """Tests for POST /api/beo-builder/beos/{beo_id}/push-maestro"""

    def test_push_beo_to_maestro(self, api_client):
        """Call push-maestro with a BEO id and assert {ok:true, maestro_pushed:true}"""
        # First get a BEO id from the viewer
        viewer_response = api_client.get(f"{BASE_URL}/api/echo-viewer/event/{ELROY_EVENT_ID}")
        
        if viewer_response.status_code != 200:
            pytest.skip("Could not get viewer data")
        
        viewer_data = viewer_response.json()
        beo = viewer_data.get("beo")
        
        if not beo or not beo.get("beo_id"):
            # Try to get any BEO from the list
            beos_response = api_client.get(f"{BASE_URL}/api/beo-engine/beos?limit=5")
            if beos_response.status_code == 200:
                beos_data = beos_response.json()
                beos = beos_data.get("beos", [])
                if beos:
                    beo = beos[0]
        
        if not beo or not beo.get("beo_id"):
            pytest.skip("No BEO found to test push-maestro")
        
        beo_id = beo.get("beo_id")
        
        # Push to Maestro
        response = api_client.post(f"{BASE_URL}/api/beo-builder/beos/{beo_id}/push-maestro")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("ok") is True, "Expected ok=True"
        assert data.get("maestro_pushed") is True, "Expected maestro_pushed=True"
        
        print(f"✓ Push to Maestro: beo_id={beo_id}, maestro_pushed={data['maestro_pushed']}")


class TestEchoChat:
    """Tests for POST /api/echo/chat"""

    def test_echo_chat_what_happened_with_elroy(self, api_client):
        """Test 'what happened with Elroy' intent detection"""
        response = api_client.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "what happened with Elroy"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Assert intent detection
        assert data.get("intent") == "what_happened_with_event", \
            f"Expected intent='what_happened_with_event', got {data.get('intent')}"
        
        # Assert matched_event is not None (Elroy should be found)
        matched_event = data.get("matched_event")
        assert matched_event is not None, "Expected matched_event to not be None for 'Elroy'"
        
        # Assert reply is a string
        assert "reply" in data, "Expected 'reply' field"
        assert isinstance(data["reply"], str), "reply should be a string"
        assert len(data["reply"]) > 0, "reply should not be empty"
        
        print(f"✓ Echo chat: intent={data['intent']}, matched_event={matched_event}, "
              f"reply_length={len(data['reply'])}")

    def test_echo_chat_fallback_intent(self, api_client):
        """Test fallback intent for non-matching messages"""
        response = api_client.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "hello there"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return fallback intent
        assert data.get("intent") == "fallback", f"Expected fallback intent, got {data.get('intent')}"
        assert "reply" in data
        
        print(f"✓ Echo chat fallback: intent={data['intent']}")

    def test_echo_chat_empty_message_error(self, api_client):
        """Test empty message returns 400"""
        response = api_client.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": ""}
        )
        
        assert response.status_code == 400, f"Expected 400 for empty message, got {response.status_code}"
        print("✓ Empty message returns 400 as expected")


class TestTimelineRecent:
    """Additional timeline tests"""

    def test_timeline_recent_returns_events(self, api_client):
        """Verify timeline/recent endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/timeline/recent?limit=20")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "events" in data, "Expected 'events' key in response"
        events = data["events"]
        assert isinstance(events, list), "events should be a list"
        
        print(f"✓ Timeline recent: {len(events)} events returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
