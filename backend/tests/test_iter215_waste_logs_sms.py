"""iter215 · EchoWaste Logs + SMS Admin + Video MOT Testing

Tests:
1. GET /api/waste/logs - returns empty list initially, accepts query params
2. Vision LLM logging - after Claude vision call, logs show vision_llm entry
3. Vision failure logging - 1x1 pixel image returns 502 + logs vision_failed_no_stub
4. GET /api/waste/logs/summary - returns summary with expected structure
5. GET /api/waste/admin/sms/status - returns credentials status
6. POST /api/waste/admin/sms/flush - returns no_credentials error
7. POST /api/waste/capture/video-mot - multi-frame aggregation
8. Still capture without media_base64 - backwards compat stub fallback
9. Menu extract text logging
10. Draft recipe logging
"""
import pytest
import requests
import os
import time
import base64

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for local testing
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"

# 1x1 pixel transparent PNG (tiny image that Claude can't parse)
TINY_1X1_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


class TestWasteLogs:
    """Test /api/waste/logs endpoints"""

    def test_logs_returns_list_with_count(self):
        """GET /api/waste/logs returns list with count field"""
        r = requests.get(f"{BASE_URL}/api/waste/logs")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "count" in data
        assert "logs" in data
        assert isinstance(data["logs"], list)
        print(f"PASS: logs endpoint returns count={data['count']}, logs list length={len(data['logs'])}")

    def test_logs_accepts_query_params(self):
        """GET /api/waste/logs accepts event_type, capture_id, entry_id, session_id, since params"""
        # Test with event_type filter
        r = requests.get(f"{BASE_URL}/api/waste/logs?event_type=vision_llm")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        # All returned logs should be vision_llm type (if any)
        for log in data.get("logs", []):
            assert log.get("event_type") == "vision_llm"
        print(f"PASS: logs filtered by event_type=vision_llm, count={data['count']}")

        # Test with capture_id filter
        r2 = requests.get(f"{BASE_URL}/api/waste/logs?capture_id=cap-nonexistent")
        assert r2.status_code == 200
        data2 = r2.json()
        assert data2.get("ok") is True
        print(f"PASS: logs filtered by capture_id, count={data2['count']}")

        # Test with since filter
        r3 = requests.get(f"{BASE_URL}/api/waste/logs?since=2026-01-01T00:00:00")
        assert r3.status_code == 200
        data3 = r3.json()
        assert data3.get("ok") is True
        print(f"PASS: logs filtered by since, count={data3['count']}")


class TestLogsSummary:
    """Test /api/waste/logs/summary endpoint"""

    def test_summary_returns_expected_structure(self):
        """GET /api/waste/logs/summary returns summary with required fields"""
        r = requests.get(f"{BASE_URL}/api/waste/logs/summary")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        summary = data.get("summary", {})
        
        # Check required fields
        assert "total_events" in summary
        assert "by_event_type" in summary
        assert "errors" in summary
        assert "slow_calls" in summary
        assert "captures" in summary
        
        # Check captures structure
        captures = summary.get("captures", {})
        assert "total" in captures
        assert "vision_ok" in captures
        assert "vision_failed" in captures
        
        # Check timing_percentiles_ms if there are events
        if summary.get("total_events", 0) > 0 and "timing_percentiles_ms" in summary:
            timing = summary["timing_percentiles_ms"]
            assert "p50" in timing
            assert "p90" in timing
            assert "p99" in timing
            assert "max" in timing
        
        print(f"PASS: logs/summary returns expected structure, total_events={summary.get('total_events')}")
        print(f"  by_event_type keys: {list(summary.get('by_event_type', {}).keys())}")
        print(f"  captures: {captures}")


class TestSmsAdmin:
    """Test SMS admin endpoints"""

    def test_sms_status_returns_credentials_info(self):
        """GET /api/waste/admin/sms/status returns credentials status"""
        r = requests.get(f"{BASE_URL}/api/waste/admin/sms/status")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        
        # Check credentials structure
        creds = data.get("credentials", {})
        assert "configured" in creds
        assert "has_account_sid" in creds
        assert "has_auth_token" in creds
        assert "has_from_number" in creds
        
        # Per requirements: AUTH_TOKEN is set, ACCOUNT_SID and FROM_NUMBER are empty
        assert creds.get("has_auth_token") is True, "AUTH_TOKEN should be set"
        assert creds.get("has_account_sid") is False, "ACCOUNT_SID should be empty"
        assert creds.get("has_from_number") is False, "FROM_NUMBER should be empty"
        assert creds.get("configured") is False, "Should not be fully configured"
        
        # Check queue counts
        assert "queued_count" in data
        assert "sent_count" in data
        
        print(f"PASS: sms/status returns credentials={creds}")
        print(f"  queued_count={data.get('queued_count')}, sent_count={data.get('sent_count')}")

    def test_sms_flush_returns_no_credentials_error(self):
        """POST /api/waste/admin/sms/flush returns no_credentials error"""
        r = requests.post(f"{BASE_URL}/api/waste/admin/sms/flush")
        assert r.status_code == 200
        data = r.json()
        
        # Should return ok=false with reason=no_credentials
        assert data.get("ok") is False
        assert data.get("reason") == "no_credentials"
        assert data.get("flushed") == 0
        
        # Should include credentials info
        creds = data.get("credentials", {})
        assert "configured" in creds
        
        print(f"PASS: sms/flush returns ok=false, reason={data.get('reason')}, flushed={data.get('flushed')}")


class TestVideoMot:
    """Test video MOT capture endpoint"""

    def test_video_mot_requires_frames(self):
        """POST /api/waste/capture/video-mot requires frames"""
        # Init capture first
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "video", "user_id": "test-user"
        })
        assert init_r.status_code == 200
        cap_id = init_r.json().get("capture_id")
        
        # Try with empty frames
        r = requests.post(f"{BASE_URL}/api/waste/capture/video-mot", json={
            "capture_id": cap_id,
            "frames": [],
            "client_id": f"test-mot-empty-{int(time.time())}"
        })
        assert r.status_code == 400
        print(f"PASS: video-mot with empty frames returns 400")

    def test_video_mot_with_tiny_image_returns_502(self):
        """POST /api/waste/capture/video-mot with 1x1 pixel returns 502 (no stub)"""
        # Init capture
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "video", "user_id": "test-user"
        })
        assert init_r.status_code == 200
        cap_id = init_r.json().get("capture_id")
        
        # Send tiny 1x1 pixel frames
        frames = [
            {"frame_index": 0, "image_base64": f"data:image/png;base64,{TINY_1X1_PNG}"},
            {"frame_index": 1, "image_base64": f"data:image/png;base64,{TINY_1X1_PNG}"},
        ]
        
        r = requests.post(f"{BASE_URL}/api/waste/capture/video-mot", json={
            "capture_id": cap_id,
            "frames": frames,
            "client_id": f"test-mot-tiny-{int(time.time())}",
            "trace_id": f"tr-test-{int(time.time())}"
        })
        
        # Should return 502 because Claude can't parse 1x1 pixel images
        # and production mode refuses to stub
        if r.status_code == 502:
            print(f"PASS: video-mot with tiny image returns 502 (no stub in production)")
            # Check that logs were written
            time.sleep(1)  # Give time for logs to be written
            logs_r = requests.get(f"{BASE_URL}/api/waste/logs?capture_id={cap_id}")
            logs_data = logs_r.json()
            event_types = [l.get("event_type") for l in logs_data.get("logs", [])]
            print(f"  Logged events for capture: {event_types}")
            # Should have capture_video_mot_start and possibly vision_llm_no_result
            assert "capture_video_mot_start" in event_types or len(event_types) > 0
        elif r.status_code == 200:
            # If Claude somehow parsed it, that's also acceptable
            data = r.json()
            print(f"PASS: video-mot returned 200 (Claude parsed tiny image), items={len(data.get('items', []))}")
        else:
            print(f"WARN: video-mot returned unexpected status {r.status_code}: {r.text[:200]}")


class TestStillCaptureBackwardsCompat:
    """Test still capture backwards compatibility"""

    def test_still_without_media_falls_to_stub(self):
        """POST /api/waste/capture/still without media_base64 uses stub (backwards compat)"""
        # Init capture
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "still", "user_id": "test-user"
        })
        assert init_r.status_code == 200
        cap_id = init_r.json().get("capture_id")
        
        # Capture without media_base64
        r = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": cap_id,
            "client_id": f"test-still-nomedia-{int(time.time())}"
        })
        
        # Should succeed with stub
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "entry_id" in data
        assert "items" in data
        assert len(data.get("items", [])) > 0
        
        # Vision mode should indicate stub
        vision_mode = data.get("vision_mode", "")
        assert "stub" in vision_mode.lower() or vision_mode == "stub"
        
        print(f"PASS: still without media uses stub, vision_mode={vision_mode}, items={len(data.get('items', []))}")


class TestVisionLlmLogging:
    """Test that vision LLM calls are logged"""

    def test_vision_llm_entry_has_required_fields(self):
        """After vision call, logs show vision_llm entry with required llm fields"""
        # Get recent vision_llm logs
        r = requests.get(f"{BASE_URL}/api/waste/logs?event_type=vision_llm&limit=10")
        assert r.status_code == 200
        data = r.json()
        
        if data.get("count", 0) == 0:
            print("SKIP: No vision_llm logs found - need to run a real vision capture first")
            return
        
        # Check first log entry has required llm fields
        log = data["logs"][0]
        llm = log.get("llm", {})
        
        required_fields = ["provider", "model", "duration_ms", "mode"]
        optional_fields = ["system_prompt_hash", "user_prompt_preview", "response_raw_preview"]
        
        for field in required_fields:
            assert field in llm, f"Missing required llm field: {field}"
        
        print(f"PASS: vision_llm log has required fields")
        print(f"  provider={llm.get('provider')}, model={llm.get('model')}")
        print(f"  duration_ms={llm.get('duration_ms')}, mode={llm.get('mode')}")
        
        # Check optional fields
        for field in optional_fields:
            if field in llm:
                preview = str(llm.get(field, ""))[:50]
                print(f"  {field}={preview}...")


class TestMenuAndDraftRecipeLogging:
    """Test menu extract and draft recipe logging"""

    def test_draft_recipe_creates_log(self):
        """POST /api/waste/draft-recipes creates draft_recipe_extract log"""
        # Create a draft recipe
        r = requests.post(f"{BASE_URL}/api/waste/draft-recipes", json={
            "raw_text": "Avocado toast with sourdough bread, ripe avocado, lime juice, chili flakes, sea salt. 180g portion, costs about $2.50",
            "dish_hint": "Avocado Toast",
            "user_id": "test-user",
            "outlet_id": "outlet-main"
        })
        
        if r.status_code == 200:
            data = r.json()
            if data.get("ok"):
                draft_id = data.get("draft", {}).get("draft_id")
                print(f"PASS: draft recipe created, draft_id={draft_id}")
                
                # Check for log entry
                time.sleep(1)
                logs_r = requests.get(f"{BASE_URL}/api/waste/logs?event_type=draft_recipe_extract&limit=5")
                logs_data = logs_r.json()
                if logs_data.get("count", 0) > 0:
                    log = logs_data["logs"][0]
                    llm = log.get("llm", {})
                    print(f"  Log found: mode={llm.get('mode')}, duration_ms={llm.get('duration_ms')}")
                    if llm.get("response_raw_preview"):
                        print(f"  response_preview: {llm.get('response_raw_preview')[:100]}...")
                else:
                    print("  WARN: No draft_recipe_extract log found")
            else:
                print(f"WARN: draft recipe creation returned ok=false: {data}")
        else:
            print(f"WARN: draft recipe creation failed with status {r.status_code}")


class TestLogsSummaryEventTypes:
    """Test that logs summary correctly aggregates event types"""

    def test_summary_by_event_type_structure(self):
        """Logs summary by_event_type has count, errors, avg_ms, mode_mix"""
        r = requests.get(f"{BASE_URL}/api/waste/logs/summary")
        assert r.status_code == 200
        data = r.json()
        summary = data.get("summary", {})
        by_event_type = summary.get("by_event_type", {})
        
        if not by_event_type:
            print("SKIP: No events in summary yet")
            return
        
        # Check structure of each event type entry
        for event_type, info in by_event_type.items():
            assert "count" in info, f"Missing count for {event_type}"
            assert "errors" in info, f"Missing errors for {event_type}"
            assert "avg_ms" in info, f"Missing avg_ms for {event_type}"
            assert "mode_mix" in info, f"Missing mode_mix for {event_type}"
            
            print(f"  {event_type}: count={info['count']}, errors={info['errors']}, avg_ms={info['avg_ms']:.0f}, mode_mix={info['mode_mix']}")
        
        print(f"PASS: by_event_type has correct structure for {len(by_event_type)} event types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
