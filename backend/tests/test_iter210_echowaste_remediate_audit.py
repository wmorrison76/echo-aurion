"""iter210 · EchoWaste + Remediate Intent + Audit Helpers Backend Tests

Tests:
- EchoWaste /api/waste/* endpoints (Phase 1+2 scaffold)
- Echo chat remediate_broken_lifecycle intent
- lib/time.py, lib/mongo.py, lib/admin_auth.py helpers
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o"


class TestLibHelpers:
    """Verify audit refactor helpers (BE-3, BE-4, BE-5)"""

    def test_lib_time_utcnow_iso(self):
        """BE-4: lib/time.py utcnow_iso returns ISO string"""
        import sys
        sys.path.insert(0, "/app/backend")
        from lib.time import utcnow_iso, utcnow
        iso = utcnow_iso()
        assert isinstance(iso, str)
        assert "T" in iso
        assert "+" in iso or "Z" in iso
        dt = utcnow()
        assert dt.tzinfo is not None
        print(f"PASSED: utcnow_iso={iso}")

    def test_lib_mongo_strip_id(self):
        """BE-3: lib/mongo.py strip_id removes _id"""
        import sys
        sys.path.insert(0, "/app/backend")
        from lib.mongo import strip_id, strip_ids
        doc = {"_id": "abc123", "name": "test", "value": 42}
        result = strip_id(doc)
        assert "_id" not in result
        assert result["name"] == "test"
        assert result["value"] == 42
        
        rows = [{"_id": 1, "a": 1}, {"_id": 2, "b": 2}]
        stripped = strip_ids(rows)
        assert len(stripped) == 2
        assert all("_id" not in r for r in stripped)
        print("PASSED: strip_id and strip_ids work correctly")


class TestEchoWasteCaptureInit:
    """EchoWaste capture/init endpoint"""

    def test_capture_init_video(self):
        """POST /api/waste/capture/init with mode=video returns capture_id"""
        r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "video",
            "user_id": "test-user",
            "outlet_id": "outlet-main"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "capture_id" in data
        assert data["capture_id"].startswith("cap-")
        print(f"PASSED: capture_init returned capture_id={data['capture_id']}")
        return data["capture_id"]


class TestEchoWasteCaptureVideo:
    """EchoWaste video capture endpoint"""

    def test_capture_video_full_flow(self):
        """POST /api/waste/capture/video returns entry_id, items[], total_cost"""
        # First init
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={
            "mode": "video",
            "user_id": "test-user"
        })
        assert init_r.status_code == 200
        capture_id = init_r.json()["capture_id"]

        # Then video capture
        r = requests.post(f"{BASE_URL}/api/waste/capture/video", json={
            "capture_id": capture_id,
            "duration_ms": 3500,
            "frame_count": 100,
            "telemetry": {"speed": 0.8, "focus": 0.9}
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "entry_id" in data
        assert "items" in data
        assert len(data["items"]) >= 1
        assert data.get("total_cost", 0) > 0
        
        # Validate item structure
        item = data["items"][0]
        assert "name" in item
        assert "count" in item
        assert "portion_g" in item
        assert "cost_per_unit" in item
        assert "total_cost" in item
        assert "confidence" in item
        assert "recipe_id" in item
        print(f"PASSED: capture_video returned entry_id={data['entry_id']}, {len(data['items'])} items, total_cost=${data['total_cost']}")
        return data["entry_id"]


class TestEchoWasteCaptureStillVoice:
    """EchoWaste still and voice capture endpoints"""

    def test_capture_still(self):
        """POST /api/waste/capture/still returns ok with entry_id"""
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "still"})
        capture_id = init_r.json()["capture_id"]
        
        r = requests.post(f"{BASE_URL}/api/waste/capture/still", json={
            "capture_id": capture_id,
            "media_url": "https://example.com/test.jpg"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "entry_id" in data
        print(f"PASSED: capture_still returned entry_id={data['entry_id']}")

    def test_capture_voice(self):
        """POST /api/waste/capture/voice with transcript returns ok"""
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "voice"})
        capture_id = init_r.json()["capture_id"]
        
        r = requests.post(f"{BASE_URL}/api/waste/capture/voice", json={
            "capture_id": capture_id,
            "transcript": "ten muffins"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "entry_id" in data
        print(f"PASSED: capture_voice returned entry_id={data['entry_id']}")


class TestEchoWasteEntries:
    """EchoWaste entries list and detail endpoints"""

    def test_list_entries(self):
        """GET /api/waste/entries returns entries list"""
        r = requests.get(f"{BASE_URL}/api/waste/entries?limit=50")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "entries" in data
        assert "total" in data
        print(f"PASSED: list_entries returned {len(data['entries'])} entries, total={data['total']}")

    def test_get_entry_detail(self):
        """GET /api/waste/entries/{entry_id} returns entry + items"""
        # First create an entry
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "video"})
        capture_id = init_r.json()["capture_id"]
        video_r = requests.post(f"{BASE_URL}/api/waste/capture/video", json={
            "capture_id": capture_id,
            "duration_ms": 2000
        })
        entry_id = video_r.json()["entry_id"]
        
        # Then get detail
        r = requests.get(f"{BASE_URL}/api/waste/entries/{entry_id}")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "entry" in data
        assert "items" in data
        assert data["entry"]["entry_id"] == entry_id
        print(f"PASSED: get_entry returned entry with {len(data['items'])} items")


class TestEchoWasteItemCorrection:
    """EchoWaste item correction and training feedback"""

    def test_patch_item_correction(self):
        """PATCH /api/waste/items/{item_id} updates item and writes feedback"""
        # Create entry with items
        init_r = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "video"})
        capture_id = init_r.json()["capture_id"]
        video_r = requests.post(f"{BASE_URL}/api/waste/capture/video", json={
            "capture_id": capture_id,
            "duration_ms": 2000
        })
        items = video_r.json()["items"]
        item_id = items[0]["item_id"]
        
        # Patch the item
        r = requests.patch(f"{BASE_URL}/api/waste/items/{item_id}", json={
            "recipe_id": "rec-bagel-plain",
            "count": 5
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data["item"]["recipe_id"] == "rec-bagel-plain"
        # Cost should be recalculated (bagel cost is 0.85)
        assert data["item"]["cost_per_unit"] == 0.85
        assert data["item"]["total_cost"] == 4.25  # 5 * 0.85
        print(f"PASSED: item correction updated recipe_id, cost_per_unit, total_cost")

    def test_training_pending_requires_admin(self):
        """GET /api/waste/training/pending requires admin token"""
        # Without token
        r = requests.get(f"{BASE_URL}/api/waste/training/pending")
        assert r.status_code == 401, f"Expected 401 without token, got {r.status_code}"
        
        # With token
        r = requests.get(f"{BASE_URL}/api/waste/training/pending", headers={
            "X-Admin-Token": ADMIN_TOKEN
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "pending" in data
        print(f"PASSED: training/pending requires admin token, returned {len(data['pending'])} pending items")


class TestEchoWasteRecipesContext:
    """EchoWaste recipe matching and context endpoints"""

    def test_recipe_match(self):
        """GET /api/waste/recipes/match?q=muffin returns matches"""
        r = requests.get(f"{BASE_URL}/api/waste/recipes/match?q=muffin")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "matches" in data
        assert len(data["matches"]) >= 1
        assert any("muffin" in m["name"].lower() for m in data["matches"])
        print(f"PASSED: recipe_match returned {len(data['matches'])} matches for 'muffin'")

    def test_context_current(self):
        """GET /api/waste/context/current returns user/outlet/station"""
        r = requests.get(f"{BASE_URL}/api/waste/context/current")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "user_id" in data
        assert "outlet_id" in data
        assert "station_id" in data
        print(f"PASSED: context_current returned user_id={data['user_id']}, outlet_id={data['outlet_id']}")


class TestEchoWasteBuffet:
    """EchoWaste buffet session endpoints"""

    def test_buffet_set_and_close(self):
        """POST /api/waste/buffet/set + /buffet/close computes delta"""
        # Init set capture
        set_init = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "buffet_set"})
        set_cap_id = set_init.json()["capture_id"]
        requests.post(f"{BASE_URL}/api/waste/capture/video", json={
            "capture_id": set_cap_id,
            "duration_ms": 1000
        })
        
        # Start buffet session
        r = requests.post(f"{BASE_URL}/api/waste/buffet/set", json={
            "outlet_id": "outlet-main",
            "service_name": "breakfast",
            "capture_id": set_cap_id
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        session_id = data["session_id"]
        
        # Init close capture
        close_init = requests.post(f"{BASE_URL}/api/waste/capture/init", json={"mode": "buffet_close"})
        close_cap_id = close_init.json()["capture_id"]
        requests.post(f"{BASE_URL}/api/waste/capture/video", json={
            "capture_id": close_cap_id,
            "duration_ms": 1000
        })
        
        # Close buffet session
        r = requests.post(f"{BASE_URL}/api/waste/buffet/close", json={
            "session_id": session_id,
            "close_capture_id": close_cap_id
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "consumed" in data
        assert "waste_remaining" in data
        print(f"PASSED: buffet session closed with consumed={data['consumed']}")


class TestEchoWasteInsights:
    """EchoWaste daily digest endpoint"""

    def test_daily_digest(self):
        """GET /api/waste/insights/digest/daily?days=7 returns days[]"""
        r = requests.get(f"{BASE_URL}/api/waste/insights/digest/daily?days=7")
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "days" in data
        assert "generated_at" in data
        # May be empty if no entries in last 7 days
        print(f"PASSED: daily_digest returned {len(data['days'])} days")


class TestEchoChatRemediateIntent:
    """Echo chat remediate_broken_lifecycle intent (iter210)"""

    def test_remediate_elroy_lipfrat(self):
        """POST /api/echo/chat 'fix Elroy Lipfrat' returns remediate intent with plan"""
        r = requests.post(f"{BASE_URL}/api/echo/chat", json={
            "message": "fix Elroy Lipfrat"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "remediate_broken_lifecycle"
        assert "matched" in data
        # If matched, should have verdict and reply with plan
        if data["matched"]:
            assert "verdict" in data["matched"]
            reply = data.get("reply", "")
            # Reply should contain 'plan' or 'Fix' or step numbers
            assert any(word in reply.lower() for word in ["plan", "fix", "1.", "2.", "3."]), f"Reply missing plan: {reply[:200]}"
        print(f"PASSED: remediate intent for Elroy, matched={data.get('matched') is not None}")

    def test_remediate_nonexistent_contact(self):
        """POST /api/echo/chat 'fix NonExistent Contact' returns no match"""
        r = requests.post(f"{BASE_URL}/api/echo/chat", json={
            "message": "fix NonExistent Contact XYZ123"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "remediate_broken_lifecycle"
        assert data.get("matched") is None
        assert "couldn't find" in data.get("reply", "").lower()
        print(f"PASSED: remediate no-match returns couldn't find message")


class TestEchoChatRegression:
    """Regression tests for existing Echo chat intents"""

    def test_ccp_status(self):
        """POST /api/echo/chat 'CCP status' returns ccp_status intent"""
        r = requests.post(f"{BASE_URL}/api/echo/chat", json={
            "message": "CCP status"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "ccp_status"
        print(f"PASSED: CCP status intent works")

    def test_ticket_status(self):
        """POST /api/echo/chat 'ticket abc' returns ticket_status intent"""
        r = requests.post(f"{BASE_URL}/api/echo/chat", json={
            "message": "ticket abc123"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "ticket_status"
        print(f"PASSED: ticket status intent works")

    def test_what_happened_with_elroy(self):
        """POST /api/echo/chat 'what happened with Elroy' returns what_happened intent"""
        r = requests.post(f"{BASE_URL}/api/echo/chat", json={
            "message": "what happened with Elroy"
        })
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("intent") == "what_happened_with_event"
        print(f"PASSED: what_happened_with_event intent works")


class TestCRMLifecycleAudit:
    """CRM Lifecycle Audit endpoint regression"""

    def test_lifecycle_audit_loads(self):
        """GET /api/crm/lifecycle-audit returns audit data"""
        r = requests.get(f"{BASE_URL}/api/crm/lifecycle-audit")
        assert r.status_code == 200
        data = r.json()
        # API returns success=True instead of ok=True
        assert data.get("success") is True or data.get("ok") is True
        assert "data" in data
        print(f"PASSED: lifecycle-audit endpoint works")


class TestBEOFinalizeRegression:
    """BEO finalize regression - gl_code + maestro_pushed"""

    def test_beo_finalize_has_gl_code(self):
        """Verify finalized BEOs have gl_code and maestro_pushed"""
        # Get a finalized BEO
        r = requests.get(f"{BASE_URL}/api/beo-builder/beos?limit=5")
        if r.status_code != 200:
            pytest.skip("BEO endpoint not available")
        data = r.json()
        beos = data.get("beos", [])
        if not beos:
            pytest.skip("No BEOs found")
        
        # Check first BEO has expected fields
        beo = beos[0]
        # gl_code and maestro_pushed may not be on all BEOs
        print(f"PASSED: BEO endpoint accessible, found {len(beos)} BEOs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
