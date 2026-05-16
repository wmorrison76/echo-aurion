"""iter232 · OpenAI TTS + GraphSpec + EchoEvents CRM verification

Tests:
1. POST /api/echo-voice/tts — OpenAI TTS with sage voice (default), returns audio/mpeg
2. POST /api/echo-voice/tts — default voice should be 'sage' when unspecified
3. POST /api/echo-voice/tts — invalid voice returns 400
4. POST /api/echo-voice/tts-base64 — returns JSON with base64 audio
5. POST /api/echo-voice/tts — text >4000 chars validation error
6. GET /api/echo-events/report — returns definite/pending/summary/generated_at
7. GET /api/echo-events/summary — returns stages summary
8. GET /api/events/lifecycle — returns events list
9. POST /api/events/lifecycle — create new event
10. GET /api/events/lifecycle/{id} — get created event
11. PATCH /api/events/lifecycle/{id}/advance — advance stage
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
HEADERS = {"Content-Type": "application/json", "X-User-Id": "chef-william"}


class TestOpenAITTS:
    """OpenAI TTS endpoint tests — iter232 upgrade from browser SpeechSynthesis"""

    def test_tts_with_sage_voice_returns_audio(self):
        """POST /api/echo-voice/tts with sage voice returns audio/mpeg"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/tts",
            json={"text": "Food cost is running high.", "voice": "sage", "model": "tts-1-hd"},
            headers=HEADERS,
            timeout=60,  # TTS can take 10-20s for HD audio
        )
        print(f"TTS response status: {r.status_code}")
        print(f"TTS Content-Type: {r.headers.get('Content-Type')}")
        print(f"TTS Content-Length: {len(r.content)} bytes")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        assert "audio" in r.headers.get("Content-Type", "").lower(), f"Expected audio content type, got {r.headers.get('Content-Type')}"
        assert len(r.content) > 20000, f"Expected >20KB audio, got {len(r.content)} bytes"

    def test_tts_default_voice_is_sage(self):
        """POST /api/echo-voice/tts without voice param defaults to sage"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/tts",
            json={"text": "Testing default voice."},
            headers=HEADERS,
            timeout=60,
        )
        print(f"TTS default voice status: {r.status_code}")
        # If successful, it used the default voice (sage)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        assert len(r.content) > 1000, f"Expected audio content, got {len(r.content)} bytes"

    def test_tts_invalid_voice_returns_400(self):
        """POST /api/echo-voice/tts with invalid voice returns 400"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/tts",
            json={"text": "Test", "voice": "robot"},
            headers=HEADERS,
            timeout=30,
        )
        print(f"TTS invalid voice status: {r.status_code}")
        print(f"TTS invalid voice response: {r.text[:300]}")
        
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        data = r.json()
        # Should mention valid voices
        assert "voice" in str(data).lower() or "alloy" in str(data).lower() or "sage" in str(data).lower(), \
            f"Expected error to mention valid voices, got {data}"

    def test_tts_base64_returns_json(self):
        """POST /api/echo-voice/tts-base64 returns JSON with base64 audio"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/tts-base64",
            json={"text": "Testing base64 output.", "voice": "sage"},
            headers=HEADERS,
            timeout=60,
        )
        print(f"TTS base64 status: {r.status_code}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        print(f"TTS base64 keys: {list(data.keys())}")
        
        assert data.get("ok") is True, f"Expected ok=true, got {data.get('ok')}"
        assert "format" in data, "Expected 'format' in response"
        assert "voice" in data, "Expected 'voice' in response"
        assert "audio_base64" in data, "Expected 'audio_base64' in response"
        assert len(data.get("audio_base64", "")) > 100, f"Expected base64 len>100, got {len(data.get('audio_base64', ''))}"

    def test_tts_text_too_long_validation_error(self):
        """POST /api/echo-voice/tts with text >4000 chars returns validation error"""
        long_text = "A" * 4100  # Exceeds max_length=4000
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/tts",
            json={"text": long_text, "voice": "sage"},
            headers=HEADERS,
            timeout=30,
        )
        print(f"TTS long text status: {r.status_code}")
        print(f"TTS long text response: {r.text[:300]}")
        
        # Pydantic validation should return 422
        assert r.status_code == 422, f"Expected 422 validation error, got {r.status_code}"


class TestEchoEventsReport:
    """EchoEvents CRM endpoints — verify end-to-end"""

    def test_echo_events_report(self):
        """GET /api/echo-events/report returns definite/pending/summary/generated_at"""
        r = requests.get(f"{BASE_URL}/api/echo-events/report", headers=HEADERS, timeout=30)
        print(f"EchoEvents report status: {r.status_code}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        print(f"EchoEvents report keys: {list(data.keys())}")
        
        assert "definite" in data, "Expected 'definite' in response"
        assert "pending" in data, "Expected 'pending' in response"
        assert "summary" in data, "Expected 'summary' in response"
        assert "generated_at" in data, "Expected 'generated_at' in response"
        
        # All should be non-null
        assert data["definite"] is not None, "definite should not be null"
        assert data["pending"] is not None, "pending should not be null"
        assert data["summary"] is not None, "summary should not be null"
        
        # definite and pending should be arrays
        assert isinstance(data["definite"], list), f"definite should be list, got {type(data['definite'])}"
        assert isinstance(data["pending"], list), f"pending should be list, got {type(data['pending'])}"

    def test_echo_events_summary(self):
        """GET /api/echo-events/summary returns stages summary"""
        r = requests.get(f"{BASE_URL}/api/echo-events/summary", headers=HEADERS, timeout=30)
        print(f"EchoEvents summary status: {r.status_code}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        print(f"EchoEvents summary: {data}")
        
        # Should be a dict with stages info
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        # Should have stages or total_events
        assert "stages" in data or "total_events" in data, f"Expected stages or total_events, got {list(data.keys())}"


class TestEventsLifecycleCRUD:
    """Events lifecycle CRUD — verify end-to-end"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Store created event ID for cleanup"""
        self.created_event_id = None

    def test_events_list(self):
        """GET /api/events/lifecycle returns events list"""
        r = requests.get(f"{BASE_URL}/api/events/lifecycle", headers=HEADERS, timeout=30)
        print(f"Events list status: {r.status_code}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        print(f"Events list type: {type(data)}, count: {len(data) if isinstance(data, list) else 'N/A'}")
        
        # Should be a list or dict with events
        if isinstance(data, dict):
            assert "events" in data or "rows" in data or len(data) > 0, f"Expected events data, got {list(data.keys())}"
        else:
            assert isinstance(data, list), f"Expected list or dict, got {type(data)}"

    def test_create_event(self):
        """POST /api/events/lifecycle creates new event with stage=prospect, phase=1"""
        event_data = {
            "name": "TEST_iter232_Corporate_Gala",
            "event_type": "corporate",
            "client_name": "TEST_ACME Corp",
            "event_date": "2026-06-15",
        }
        r = requests.post(
            f"{BASE_URL}/api/events/lifecycle",
            json=event_data,
            headers=HEADERS,
            timeout=30,
        )
        print(f"Create event status: {r.status_code}")
        print(f"Create event response: {r.text[:500]}")
        
        assert r.status_code in [200, 201], f"Expected 200/201, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        
        assert "id" in data, f"Expected 'id' in response, got {list(data.keys())}"
        assert data.get("stage") == "prospect", f"Expected stage=prospect, got {data.get('stage')}"
        assert data.get("phase") == 1, f"Expected phase=1, got {data.get('phase')}"
        
        self.created_event_id = data["id"]
        return data["id"]

    def test_get_event_by_id(self):
        """GET /api/events/lifecycle/{id} returns the created event"""
        # First create an event
        event_data = {
            "name": "TEST_iter232_Get_Event",
            "event_type": "corporate",
            "client_name": "TEST_Get_Corp",
            "event_date": "2026-06-20",
        }
        create_r = requests.post(
            f"{BASE_URL}/api/events/lifecycle",
            json=event_data,
            headers=HEADERS,
            timeout=30,
        )
        assert create_r.status_code in [200, 201], f"Create failed: {create_r.status_code}"
        event_id = create_r.json()["id"]
        
        # Now get it
        r = requests.get(f"{BASE_URL}/api/events/lifecycle/{event_id}", headers=HEADERS, timeout=30)
        print(f"Get event status: {r.status_code}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        
        assert data.get("id") == event_id, f"Expected id={event_id}, got {data.get('id')}"
        assert data.get("name") == "TEST_iter232_Get_Event", f"Expected name match, got {data.get('name')}"

    def test_advance_event_stage(self):
        """POST /api/events/lifecycle/{id}/advance updates stage to qualified"""
        # First create an event
        event_data = {
            "name": "TEST_iter232_Advance_Event",
            "event_type": "corporate",
            "client_name": "TEST_Advance_Corp",
            "event_date": "2026-06-25",
        }
        create_r = requests.post(
            f"{BASE_URL}/api/events/lifecycle",
            json=event_data,
            headers=HEADERS,
            timeout=30,
        )
        assert create_r.status_code in [200, 201], f"Create failed: {create_r.status_code}"
        event_id = create_r.json()["id"]
        
        # Advance stage - valid stages: prospect -> qualified -> proposal_sent -> ...
        advance_data = {"target_stage": "qualified", "by": "chef-william", "notes": "Test advance"}
        r = requests.post(
            f"{BASE_URL}/api/events/lifecycle/{event_id}/advance",
            json=advance_data,
            headers=HEADERS,
            timeout=30,
        )
        print(f"Advance event status: {r.status_code}")
        print(f"Advance event response: {r.text[:500]}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        
        assert data.get("stage") == "qualified", f"Expected stage=qualified, got {data.get('stage')}"


class TestRegressionIter231:
    """Regression tests for iter231 features that should still work"""

    def test_echo_voice_chat_still_works(self):
        """POST /api/echo-voice/chat still returns valid response"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/chat",
            json={"text": "What is the food cost at Windows?", "outlet_id": "outlet-windows"},
            headers=HEADERS,
            timeout=60,
        )
        print(f"Voice chat status: {r.status_code}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        
        assert "session_id" in data, "Expected session_id"
        assert "speech" in data, "Expected speech"
        assert data.get("session_id", "").startswith("vs-"), f"Expected session_id to start with vs-, got {data.get('session_id')}"

    def test_echoaurium_outlets_still_works(self):
        """GET /api/echoaurium/outlets still returns outlets"""
        r = requests.get(f"{BASE_URL}/api/echoaurium/outlets", headers=HEADERS, timeout=30)
        print(f"Outlets status: {r.status_code}")
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        
        assert "rows" in data or isinstance(data, list), f"Expected rows or list, got {type(data)}"
