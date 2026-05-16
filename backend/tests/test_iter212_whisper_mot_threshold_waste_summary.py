"""
iter212 Backend Tests - Whisper STT, Video MOT, Confidence Threshold, waste_summary intent

Tests:
1. Voice capture with transcript (text path) - POST /api/waste/capture/voice
2. Voice capture without transcript/audio - should return 400
3. Video MOT with 2 frames - POST /api/waste/capture/video-mot
4. Video MOT idempotency - same client_id returns idempotent_replay=true
5. Vision confidence threshold - items have needs_review flag
6. Admin threshold setter - PUT /api/waste/feature-flags/threshold
7. waste_summary Echo chat intent - POST /api/echo/chat
8. Regression tests for iter207-211 endpoints
"""
import pytest
import requests
import os
import base64
import io
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cfo-toolkit-deploy.preview.emergentagent.com")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


def create_test_png(width=100, height=100, color=(255, 0, 0)):
    """Create a small test PNG image and return base64 encoded string."""
    img = Image.new("RGB", (width, height), color)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


class TestWhisperSTTVoiceCapture:
    """Test Whisper STT voice capture endpoint - iter212 Phase 2"""

    def test_voice_capture_with_transcript_text_path(self):
        """POST /api/waste/capture/voice with transcript - should work (text path)"""
        # First init a capture
        init_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            json={"mode": "voice", "user_id": "test-user-212"}
        )
        assert init_resp.status_code == 200, f"Init failed: {init_resp.text}"
        capture_id = init_resp.json()["capture_id"]

        # Voice capture with transcript (text path - no audio needed)
        voice_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/voice",
            json={
                "capture_id": capture_id,
                "transcript": "threw out ten muffins and bacon"
            }
        )
        assert voice_resp.status_code == 200, f"Voice capture failed: {voice_resp.text}"
        data = voice_resp.json()
        
        assert data.get("ok") is True
        assert "items" in data
        assert len(data["items"]) >= 1, "Should have at least 1 item detected"
        assert data.get("stt_mode") == "text", f"Expected stt_mode='text', got {data.get('stt_mode')}"
        assert data.get("transcript") == "threw out ten muffins and bacon"
        print(f"✓ Voice capture with transcript: {len(data['items'])} items, stt_mode={data.get('stt_mode')}")

    def test_voice_capture_no_transcript_no_audio_returns_400(self):
        """POST /api/waste/capture/voice without transcript AND without audio_base64 - should return 400"""
        # First init a capture
        init_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            json={"mode": "voice", "user_id": "test-user-212-err"}
        )
        assert init_resp.status_code == 200
        capture_id = init_resp.json()["capture_id"]

        # Voice capture without transcript or audio
        voice_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/voice",
            json={"capture_id": capture_id}
        )
        assert voice_resp.status_code == 400, f"Expected 400, got {voice_resp.status_code}: {voice_resp.text}"
        print("✓ Voice capture without transcript/audio correctly returns 400")


class TestVideoMOTCapture:
    """Test Video MOT multi-frame aggregation - iter212 Phase 2"""

    def test_video_mot_with_two_frames(self):
        """POST /api/waste/capture/video-mot with 2 frames - should work"""
        # Create 2 small test PNGs
        frame1_b64 = create_test_png(100, 100, (255, 0, 0))  # Red
        frame2_b64 = create_test_png(100, 100, (0, 255, 0))  # Green

        # First init a capture
        init_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            json={"mode": "video", "user_id": "test-user-212-mot"}
        )
        assert init_resp.status_code == 200
        capture_id = init_resp.json()["capture_id"]

        # Video MOT capture with 2 frames
        mot_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/video-mot",
            json={
                "capture_id": capture_id,
                "frames": [
                    {"frame_index": 0, "image_base64": frame1_b64},
                    {"frame_index": 1, "image_base64": frame2_b64}
                ],
                "duration_ms": 2000,
                "client_id": f"test-mot-{capture_id}"
            }
        )
        assert mot_resp.status_code == 200, f"Video MOT failed: {mot_resp.text}"
        data = mot_resp.json()

        assert data.get("ok") is True
        assert "entry_id" in data
        assert data.get("frames_analysed") == 2, f"Expected frames_analysed=2, got {data.get('frames_analysed')}"
        assert data.get("vision_mode") in ["video_mot_llm", "video_mot_stub"], f"Unexpected vision_mode: {data.get('vision_mode')}"
        print(f"✓ Video MOT: entry_id={data['entry_id']}, frames_analysed={data['frames_analysed']}, vision_mode={data['vision_mode']}")
        return data

    def test_video_mot_idempotency(self):
        """Second call with same client_id should return idempotent_replay=true"""
        # Create test frames
        frame1_b64 = create_test_png(100, 100, (100, 100, 100))
        frame2_b64 = create_test_png(100, 100, (150, 150, 150))

        # Init capture
        init_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            json={"mode": "video", "user_id": "test-user-212-idem"}
        )
        capture_id = init_resp.json()["capture_id"]
        client_id = f"test-idem-mot-{capture_id}"

        # First call
        resp1 = requests.post(
            f"{BASE_URL}/api/waste/capture/video-mot",
            json={
                "capture_id": capture_id,
                "frames": [
                    {"frame_index": 0, "image_base64": frame1_b64},
                    {"frame_index": 1, "image_base64": frame2_b64}
                ],
                "client_id": client_id
            }
        )
        assert resp1.status_code == 200
        entry_id_1 = resp1.json()["entry_id"]

        # Second call with same client_id
        resp2 = requests.post(
            f"{BASE_URL}/api/waste/capture/video-mot",
            json={
                "capture_id": capture_id,
                "frames": [
                    {"frame_index": 0, "image_base64": frame1_b64},
                    {"frame_index": 1, "image_base64": frame2_b64}
                ],
                "client_id": client_id
            }
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        
        assert data2.get("entry_id") == entry_id_1, "Should return same entry_id"
        assert data2.get("idempotent_replay") is True, "Should have idempotent_replay=true"
        print(f"✓ Video MOT idempotency: same entry_id={entry_id_1}, idempotent_replay=true")


class TestVisionConfidenceThreshold:
    """Test vision confidence threshold and needs_review flag - iter212"""

    def test_still_capture_has_needs_review_and_threshold(self):
        """Capture a still and verify items have needs_review bool and entry has confidence_threshold"""
        # Init capture
        init_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            json={"mode": "still", "user_id": "test-user-212-conf"}
        )
        capture_id = init_resp.json()["capture_id"]

        # Still capture (stub will be used for simple test image)
        test_img = create_test_png(100, 100, (200, 100, 50))
        still_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            json={
                "capture_id": capture_id,
                "media_base64": test_img,
                "client_id": f"test-conf-{capture_id}"
            }
        )
        assert still_resp.status_code == 200
        data = still_resp.json()
        entry_id = data["entry_id"]

        # GET the entry to verify confidence_threshold and needs_review
        entry_resp = requests.get(f"{BASE_URL}/api/waste/entries/{entry_id}")
        assert entry_resp.status_code == 200
        entry_data = entry_resp.json()

        entry = entry_data.get("entry")
        items = entry_data.get("items", [])

        # Verify entry has confidence_threshold
        assert "confidence_threshold" in entry, "Entry should have confidence_threshold"
        threshold = entry["confidence_threshold"]
        assert isinstance(threshold, (int, float)), f"confidence_threshold should be numeric, got {type(threshold)}"
        print(f"✓ Entry has confidence_threshold={threshold}")

        # Verify entry has low_confidence_count
        assert "low_confidence_count" in entry, "Entry should have low_confidence_count"
        low_conf_count = entry["low_confidence_count"]
        assert low_conf_count >= 0, "low_confidence_count should be >= 0"
        print(f"✓ Entry has low_confidence_count={low_conf_count}")

        # Verify each item has needs_review bool
        for item in items:
            assert "needs_review" in item, f"Item {item.get('item_id')} should have needs_review"
            assert isinstance(item["needs_review"], bool), f"needs_review should be bool"
        print(f"✓ All {len(items)} items have needs_review bool")


class TestAdminThresholdSetter:
    """Test admin endpoint to tune confidence threshold - iter212"""

    def test_set_threshold_requires_admin_token(self):
        """PUT /api/waste/feature-flags/threshold without admin token should fail"""
        resp = requests.put(
            f"{BASE_URL}/api/waste/feature-flags/threshold",
            json={"property_id": "default", "threshold": 0.6}
        )
        # Should be 401 or 403 without admin token
        assert resp.status_code in [401, 403, 422], f"Expected auth error, got {resp.status_code}"
        print("✓ Threshold setter requires admin token")

    def test_set_threshold_with_admin_token(self):
        """PUT /api/waste/feature-flags/threshold with admin token should work"""
        resp = requests.put(
            f"{BASE_URL}/api/waste/feature-flags/threshold",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"property_id": "default", "threshold": 0.6}
        )
        assert resp.status_code == 200, f"Set threshold failed: {resp.text}"
        data = resp.json()
        
        assert data.get("ok") is True
        assert data.get("property_id") == "default"
        assert data.get("threshold") == 0.6
        print(f"✓ Threshold set to 0.6 for property_id=default")

    def test_next_capture_uses_new_threshold(self):
        """After setting threshold to 0.6, next capture should show confidence_threshold=0.6"""
        # First set threshold to 0.6
        set_resp = requests.put(
            f"{BASE_URL}/api/waste/feature-flags/threshold",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"property_id": "default", "threshold": 0.6}
        )
        assert set_resp.status_code == 200

        # Init and capture
        init_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            json={"mode": "still", "user_id": "test-user-212-thresh"}
        )
        capture_id = init_resp.json()["capture_id"]

        test_img = create_test_png(100, 100, (50, 150, 200))
        still_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            json={
                "capture_id": capture_id,
                "media_base64": test_img,
                "client_id": f"test-thresh-{capture_id}"
            }
        )
        assert still_resp.status_code == 200
        entry_id = still_resp.json()["entry_id"]

        # GET entry and verify threshold
        entry_resp = requests.get(f"{BASE_URL}/api/waste/entries/{entry_id}")
        entry = entry_resp.json().get("entry", {})
        
        assert entry.get("confidence_threshold") == 0.6, f"Expected threshold=0.6, got {entry.get('confidence_threshold')}"
        print(f"✓ New capture has confidence_threshold=0.6")

        # Reset threshold back to default 0.55 for other tests
        requests.put(
            f"{BASE_URL}/api/waste/feature-flags/threshold",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            json={"property_id": "default", "threshold": 0.55}
        )


class TestWasteSummaryEchoChatIntent:
    """Test waste_summary Echo chat intent - iter212"""

    def test_waste_summary_intent(self):
        """POST /api/echo/chat with 'waste summary' should return intent=waste_summary"""
        resp = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "waste summary"}
        )
        assert resp.status_code == 200, f"Chat failed: {resp.text}"
        data = resp.json()

        assert data.get("intent") == "waste_summary", f"Expected intent=waste_summary, got {data.get('intent')}"
        reply = data.get("reply", "")
        # Reply should contain 'Today' and a dollar amount
        assert "Today" in reply or "today" in reply.lower() or "No EchoWaste" in reply, f"Reply should mention Today: {reply}"
        print(f"✓ waste_summary intent: {reply[:100]}...")

    def test_how_much_did_we_waste_today_triggers_waste_summary(self):
        """'how much did we waste today' should also trigger waste_summary intent"""
        resp = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "how much did we waste today"}
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data.get("intent") == "waste_summary", f"Expected intent=waste_summary, got {data.get('intent')}"
        print(f"✓ 'how much did we waste today' triggers waste_summary intent")


class TestRegressionIter207to211:
    """Regression tests for iter207-211 endpoints"""

    def test_crm_forecast(self):
        """GET /api/crm/forecast should work"""
        resp = requests.get(f"{BASE_URL}/api/crm/forecast")
        assert resp.status_code == 200, f"CRM forecast failed: {resp.text}"
        print("✓ /api/crm/forecast works")

    def test_crm_lifecycle_audit(self):
        """GET /api/crm/lifecycle-audit should work"""
        resp = requests.get(f"{BASE_URL}/api/crm/lifecycle-audit")
        assert resp.status_code == 200, f"Lifecycle audit failed: {resp.text}"
        print("✓ /api/crm/lifecycle-audit works")

    def test_echo_ai3_analyze_event(self):
        """POST /api/echo-ai3/analyze-event should work"""
        resp = requests.post(
            f"{BASE_URL}/api/echo-ai3/analyze-event",
            json={"event": {"type": "test.event", "timestamp": "2026-01-01T00:00:00Z"}}
        )
        assert resp.status_code == 200, f"Analyze event failed: {resp.text}"
        print("✓ /api/echo-ai3/analyze-event works")

    def test_tenant_config(self):
        """GET /api/tenant/config should work"""
        resp = requests.get(f"{BASE_URL}/api/tenant/config")
        assert resp.status_code == 200, f"Tenant config failed: {resp.text}"
        print("✓ /api/tenant/config works")

    def test_waste_entries_list(self):
        """GET /api/waste/entries should work"""
        resp = requests.get(f"{BASE_URL}/api/waste/entries?limit=5")
        assert resp.status_code == 200, f"Waste entries failed: {resp.text}"
        data = resp.json()
        assert "entries" in data
        print(f"✓ /api/waste/entries works, {len(data['entries'])} entries")

    def test_waste_capture_still_stub(self):
        """POST /api/waste/capture/still (stub mode) should work"""
        init_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            json={"mode": "still", "user_id": "test-regression"}
        )
        capture_id = init_resp.json()["capture_id"]

        # Without media_base64, should use stub
        still_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            json={"capture_id": capture_id}
        )
        assert still_resp.status_code == 200
        data = still_resp.json()
        assert data.get("vision_mode") == "stub", f"Expected stub mode, got {data.get('vision_mode')}"
        print("✓ /api/waste/capture/still (stub) works")

    def test_echo_chat_what_happened(self):
        """POST /api/echo/chat with 'what happened' intent should work"""
        resp = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "what happened with Elroy?"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("intent") == "what_happened_with_event"
        print("✓ /api/echo/chat what_happened intent works")

    def test_echo_chat_fix_remediate(self):
        """POST /api/echo/chat with 'fix' intent should work"""
        resp = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "fix Elroy"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("intent") == "remediate_broken_lifecycle"
        print("✓ /api/echo/chat fix/remediate intent works")

    def test_echo_chat_ccp_status(self):
        """POST /api/echo/chat with 'CCP status' should work"""
        resp = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "CCP status"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("intent") == "ccp_status"
        print("✓ /api/echo/chat CCP status intent works")

    def test_echo_chat_ticket_status(self):
        """POST /api/echo/chat with 'ticket' should work"""
        resp = requests.post(
            f"{BASE_URL}/api/echo/chat",
            json={"message": "ticket abc123"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("intent") == "ticket_status"
        print("✓ /api/echo/chat ticket status intent works")

    def test_waste_daily_digest(self):
        """GET /api/waste/insights/digest/daily should work"""
        resp = requests.get(f"{BASE_URL}/api/waste/insights/digest/daily?days=1")
        assert resp.status_code == 200, f"Daily digest failed: {resp.text}"
        data = resp.json()
        assert "days" in data
        print(f"✓ /api/waste/insights/digest/daily works, {len(data['days'])} days")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
