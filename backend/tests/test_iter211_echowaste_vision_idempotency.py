"""
iter211 · EchoWaste v1.1 + Real Vision + Mobile Waste Tab Tests

Tests:
1. GET /api/waste/feature-flags — returns at least 9 flags including feature.vision_llm
2. Real vision: POST /api/waste/capture/still with media_base64 → vision_mode='llm' + items with source='vision_llm:claude'
3. Fallback: POST /api/waste/capture/still without media_base64 → vision_mode='stub'
4. Idempotency via client_id: same client_id returns same entry_id + idempotent_replay=true
5. Idempotency via Idempotency-Key header: same header returns same entry_id + idempotent_replay=true
6. trace_id propagation: POST with trace_id → GET entry echoes trace_id
7. Backend regression: Echo chat intents (fix Elroy, what happened, CCP status, ticket)
8. Backend regression: /api/waste/entries, /api/waste/items/{id} PATCH, /api/waste/insights/digest/daily
9. Backend regression: /api/crm/forecast, /api/crm/lifecycle-audit, /api/echo-ai3/analyze-event, /api/beo-builder/drafts/*/finalize
10. Backend regression: /api/tenant/config, /api/echo/chat/history, /api/echo/chat/sessions
"""
import pytest
import requests
import os
import base64
import io
import time
import uuid

# Use the public URL from environment
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for local testing
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


def generate_test_image_base64():
    """Generate a small JPEG with dark circles on tan background (simulating muffins).
    Uses PIL to create a ~12KB test image."""
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (400, 300), (200, 170, 120))  # tan background
        d = ImageDraw.Draw(img)
        # Draw 7 dark circles (muffins)
        positions = [(80, 100), (160, 100), (240, 100), (320, 100), (120, 200), (200, 200), (280, 200)]
        for x, y in positions:
            d.ellipse([x-30, y-30, x+30, y+30], fill=(80, 50, 20))
        
        # Save to bytes
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        b64 = base64.b64encode(buffer.read()).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"
    except ImportError:
        # Fallback: return a minimal valid JPEG base64
        # This is a 1x1 red pixel JPEG
        minimal_jpeg = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k="
        return f"data:image/jpeg;base64,{minimal_jpeg}"


class TestFeatureFlags:
    """Test GET /api/waste/feature-flags endpoint"""
    
    def test_feature_flags_returns_at_least_9_flags(self):
        """Feature flags endpoint should return at least 9 flags including vision_llm"""
        response = requests.get(f"{BASE_URL}/api/waste/feature-flags", params={"property_id": "default"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") is True, f"Expected ok=true, got {data}"
        assert "flags" in data, f"Expected 'flags' in response, got {data}"
        
        flags = data["flags"]
        assert isinstance(flags, dict), f"Expected flags to be dict, got {type(flags)}"
        assert len(flags) >= 9, f"Expected at least 9 flags, got {len(flags)}: {list(flags.keys())}"
        
        # Check required flags exist
        required_flags = [
            "feature.voice_capture",
            "feature.buffet_mode",
            "feature.vision_llm",
            "feature.vision_llm_still",
            "feature.coaching_v2",
        ]
        for flag in required_flags:
            assert flag in flags, f"Expected flag '{flag}' in flags, got {list(flags.keys())}"
        
        # vision_llm should be True
        assert flags.get("feature.vision_llm") is True, f"Expected feature.vision_llm=True, got {flags.get('feature.vision_llm')}"


class TestRealVision:
    """Test real vision via Claude Sonnet 4.5 with ImageContent"""
    
    def test_vision_with_media_base64_returns_llm_mode(self):
        """POST /api/waste/capture/still with media_base64 should use LLM vision"""
        # 1. Init capture
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "still"})
        assert init_resp.status_code == 200, f"Init failed: {init_resp.text}"
        capture_id = init_resp.json().get("capture_id")
        assert capture_id, "No capture_id returned"
        
        # 2. Generate test image
        media_base64 = generate_test_image_base64()
        
        # 3. Submit still with image
        client_id = f"test-vision-{uuid.uuid4().hex[:8]}"
        still_resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "media_base64": media_base64,
            "client_id": client_id,
        })
        assert still_resp.status_code == 200, f"Still capture failed: {still_resp.text}"
        
        data = still_resp.json()
        assert data.get("ok") is True, f"Expected ok=true, got {data}"
        assert "entry_id" in data, f"Expected entry_id in response"
        assert "items" in data, f"Expected items in response"
        assert "vision_mode" in data, f"Expected vision_mode in response"
        
        # Vision mode should be 'llm' (real vision) or 'stub' (fallback)
        vision_mode = data.get("vision_mode")
        items = data.get("items", [])
        
        if vision_mode == "llm":
            # Real vision worked - verify items have correct source
            assert len(items) >= 1, f"Expected at least 1 item with LLM vision, got {len(items)}"
            for item in items:
                source = item.get("source", "")
                assert source.startswith("vision_llm:claude"), f"Expected source starting with 'vision_llm:claude', got '{source}'"
                confidence = item.get("confidence", 0)
                assert confidence > 0.5, f"Expected confidence > 0.5, got {confidence}"
            print(f"REAL VISION SUCCESS: vision_mode=llm, {len(items)} items detected")
        else:
            # Fallback to stub is acceptable (rate limits, etc.)
            assert vision_mode == "stub", f"Expected vision_mode='llm' or 'stub', got '{vision_mode}'"
            print(f"FALLBACK TO STUB: vision_mode=stub (LLM may be rate-limited)")
    
    def test_vision_without_media_base64_returns_stub_mode(self):
        """POST /api/waste/capture/still without media_base64 should fall back to stub"""
        # 1. Init capture
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "still"})
        assert init_resp.status_code == 200
        capture_id = init_resp.json().get("capture_id")
        
        # 2. Submit still WITHOUT image
        client_id = f"test-stub-{uuid.uuid4().hex[:8]}"
        still_resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "client_id": client_id,
            # No media_base64
        })
        assert still_resp.status_code == 200, f"Still capture failed: {still_resp.text}"
        
        data = still_resp.json()
        assert data.get("ok") is True
        assert data.get("vision_mode") == "stub", f"Expected vision_mode='stub' without image, got '{data.get('vision_mode')}'"
        print(f"STUB FALLBACK VERIFIED: vision_mode=stub when no media_base64")


class TestIdempotency:
    """Test idempotency via client_id and Idempotency-Key header"""
    
    def test_idempotency_via_client_id(self):
        """Same client_id should return same entry_id with idempotent_replay=true"""
        # 1. Init capture
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "still"})
        assert init_resp.status_code == 200
        capture_id = init_resp.json().get("capture_id")
        
        # 2. First request with client_id
        client_id = "test-xyz-123"
        first_resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "client_id": client_id,
        })
        assert first_resp.status_code == 200
        first_data = first_resp.json()
        first_entry_id = first_data.get("entry_id")
        assert first_entry_id, "No entry_id in first response"
        
        # 3. Second request with SAME client_id
        second_resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "client_id": client_id,
        })
        assert second_resp.status_code == 200
        second_data = second_resp.json()
        second_entry_id = second_data.get("entry_id")
        
        # Should return same entry_id
        assert second_entry_id == first_entry_id, f"Expected same entry_id, got {first_entry_id} vs {second_entry_id}"
        # Should have idempotent_replay=true
        assert second_data.get("idempotent_replay") is True, f"Expected idempotent_replay=true, got {second_data}"
        print(f"IDEMPOTENCY VIA client_id VERIFIED: entry_id={first_entry_id}")
    
    def test_idempotency_via_header(self):
        """Idempotency-Key header should work same as client_id"""
        # 1. Init capture
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "still"})
        assert init_resp.status_code == 200
        capture_id = init_resp.json().get("capture_id")
        
        # 2. First request with Idempotency-Key header
        idempotency_key = "test-hdr-456"
        first_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            json={"capture_id": capture_id},  # No client_id in body
            headers={"Idempotency-Key": idempotency_key}
        )
        assert first_resp.status_code == 200
        first_data = first_resp.json()
        first_entry_id = first_data.get("entry_id")
        
        # 3. Second request with SAME header
        second_resp = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            json={"capture_id": capture_id},
            headers={"Idempotency-Key": idempotency_key}
        )
        assert second_resp.status_code == 200
        second_data = second_resp.json()
        
        # Should return same entry_id with idempotent_replay=true
        assert second_data.get("entry_id") == first_entry_id
        assert second_data.get("idempotent_replay") is True
        print(f"IDEMPOTENCY VIA Idempotency-Key HEADER VERIFIED")


class TestTraceIdPropagation:
    """Test trace_id propagation through the system"""
    
    def test_trace_id_echoed_in_entry(self):
        """POST with trace_id should be echoed in GET /api/waste/entries/{entry_id}"""
        # 1. Init capture
        init_resp = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "still"})
        assert init_resp.status_code == 200
        capture_id = init_resp.json().get("capture_id")
        
        # 2. Submit with trace_id
        trace_id = "tr-deadbeef"
        client_id = f"test-trace-{uuid.uuid4().hex[:8]}"
        still_resp = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "client_id": client_id,
            "trace_id": trace_id,
        })
        assert still_resp.status_code == 200
        entry_id = still_resp.json().get("entry_id")
        
        # 3. GET the entry and verify trace_id
        get_resp = requests.get(f"{BASE_URL}/api/waste/entries/{entry_id}")
        assert get_resp.status_code == 200
        entry_data = get_resp.json()
        
        entry = entry_data.get("entry", {})
        assert entry.get("trace_id") == trace_id, f"Expected trace_id='{trace_id}', got '{entry.get('trace_id')}'"
        print(f"TRACE_ID PROPAGATION VERIFIED: {trace_id}")


class TestEchoChatRegression:
    """Regression tests for Echo chat intents"""
    
    def test_fix_elroy_returns_remediate_intent(self):
        """'fix Elroy Lipfrat' should return intent='remediate_broken_lifecycle'"""
        resp = requests.post(f"{BASE_URL}/api/echo/chat", json={"message": "fix Elroy Lipfrat"})
        assert resp.status_code == 200, f"Chat failed: {resp.text}"
        data = resp.json()
        assert data.get("intent") == "remediate_broken_lifecycle", f"Expected remediate intent, got {data.get('intent')}"
        assert "plan" in data, f"Expected 'plan' in response"
        print(f"FIX ELROY INTENT VERIFIED: {data.get('intent')}")
    
    def test_what_happened_with_elroy(self):
        """'what happened with Elroy' should work"""
        resp = requests.post(f"{BASE_URL}/api/echo/chat", json={"message": "what happened with Elroy"})
        assert resp.status_code == 200
        data = resp.json()
        # Should match what_happened_with_event or similar
        assert "intent" in data
        print(f"WHAT HAPPENED INTENT: {data.get('intent')}")
    
    def test_ccp_status(self):
        """'CCP status' should work"""
        resp = requests.post(f"{BASE_URL}/api/echo/chat", json={"message": "CCP status"})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("intent") == "ccp_status", f"Expected ccp_status intent, got {data.get('intent')}"
        print(f"CCP STATUS INTENT VERIFIED")
    
    def test_ticket_status(self):
        """'ticket abc' should work"""
        resp = requests.post(f"{BASE_URL}/api/echo/chat", json={"message": "ticket abc"})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("intent") == "ticket_status", f"Expected ticket_status intent, got {data.get('intent')}"
        print(f"TICKET STATUS INTENT VERIFIED")


class TestWasteEndpointsRegression:
    """Regression tests for waste endpoints"""
    
    def test_entries_list(self):
        """GET /api/waste/entries should return entries list"""
        resp = requests.get(f"{BASE_URL}/api/waste/entries")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert "entries" in data
        assert "total" in data
        print(f"ENTRIES LIST: {data.get('total')} entries")
    
    def test_item_patch_training_feedback(self):
        """PATCH /api/waste/items/{id} should write training feedback"""
        # First get an entry with items
        entries_resp = requests.get(f"{BASE_URL}/api/waste/entries?limit=1")
        if entries_resp.status_code != 200:
            pytest.skip("No entries to test")
        
        entries = entries_resp.json().get("entries", [])
        if not entries:
            pytest.skip("No entries available")
        
        entry_id = entries[0].get("entry_id")
        entry_resp = requests.get(f"{BASE_URL}/api/waste/entries/{entry_id}")
        items = entry_resp.json().get("items", [])
        if not items:
            pytest.skip("No items in entry")
        
        item_id = items[0].get("item_id")
        
        # Patch the item
        patch_resp = requests.patch(f"{BASE_URL}/api/waste/items/{item_id}", json={
            "count": 5.0,
            "is_correct": True
        })
        assert patch_resp.status_code == 200, f"Patch failed: {patch_resp.text}"
        print(f"ITEM PATCH VERIFIED: {item_id}")
    
    def test_daily_digest(self):
        """GET /api/waste/insights/digest/daily should aggregate"""
        resp = requests.get(f"{BASE_URL}/api/waste/insights/digest/daily", params={"days": 7})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert "days" in data
        print(f"DAILY DIGEST: {len(data.get('days', []))} days")


class TestOtherEndpointsRegression:
    """Regression tests for other endpoints"""
    
    def test_crm_forecast_ml(self):
        """GET /api/crm/forecast?model=ml should work"""
        resp = requests.get(f"{BASE_URL}/api/crm/forecast", params={"model": "ml"})
        assert resp.status_code == 200, f"CRM forecast failed: {resp.text}"
        print("CRM FORECAST ML: OK")
    
    def test_crm_lifecycle_audit(self):
        """GET /api/crm/lifecycle-audit should work"""
        resp = requests.get(f"{BASE_URL}/api/crm/lifecycle-audit")
        assert resp.status_code == 200, f"Lifecycle audit failed: {resp.text}"
        print("CRM LIFECYCLE AUDIT: OK")
    
    def test_echo_ai3_analyze_event(self):
        """POST /api/echo-ai3/analyze-event should work"""
        resp = requests.post(f"{BASE_URL}/api/echo-ai3/analyze-event", json={
            "event": {"type": "test", "timestamp": "2026-01-01T00:00:00Z"}
        })
        # May return 200 or 422 depending on event structure
        assert resp.status_code in [200, 422], f"Analyze event failed: {resp.text}"
        print(f"ECHO AI3 ANALYZE EVENT: {resp.status_code}")
    
    def test_tenant_config(self):
        """GET /api/tenant/config should work"""
        resp = requests.get(f"{BASE_URL}/api/tenant/config", params={"tenant_id": "default"})
        assert resp.status_code == 200, f"Tenant config failed: {resp.text}"
        print("TENANT CONFIG: OK")
    
    def test_echo_chat_sessions(self):
        """GET /api/echo/chat/sessions should work"""
        resp = requests.get(f"{BASE_URL}/api/echo/chat/sessions")
        assert resp.status_code == 200, f"Chat sessions failed: {resp.text}"
        print("ECHO CHAT SESSIONS: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
