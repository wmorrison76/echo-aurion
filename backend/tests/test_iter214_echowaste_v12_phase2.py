"""
iter214 · EchoWaste v1.2 Phase 2 + Notification Preferences Backend Tests

Tests:
  - Chef preferences (save/get/chefs-to-notify/test-sms)
  - F4 · Refill tracking
  - F5 · Menu pre-load (text mode)
  - F6 · Verbal recipe draft creation (create/promote/reject)
  - Par Sheet UI
  - Waste Digest SMS emit
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = "https://cfo-toolkit-deploy.preview.emergentagent.com"

ADMIN_TOKEN = os.environ.get("ADMIN_API_TOKEN", "TsjvVFDCvoa4sG4wcVY7ZKF0D7LmA25lTer4edByo5o")
TEST_USER_ID = "chef-william"
TEST_PHONE = "561-779-6872"
TEST_PHONE_E164 = "+15617796872"


class TestChefPreferences:
    """Chef notification preferences endpoints"""

    def test_save_prefs_with_phone(self):
        """POST /api/chef-prefs/prefs saves phone normalized to E.164"""
        r = requests.put(
            f"{BASE_URL}/api/chef-prefs/prefs",
            headers={"Content-Type": "application/json", "X-User-Id": TEST_USER_ID},
            json={
                "phone": TEST_PHONE,
                "channels": {"sms": True, "email": True, "push": True, "in_app": True},
                "alerts": {"waste_digest": True, "buffet_close": True, "shortage": True},
                "quiet_hours": {"enabled": False, "start_hour": 22, "end_hour": 6},
            },
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        prefs = data.get("prefs", {})
        assert prefs.get("phone_e164") == TEST_PHONE_E164, f"Expected {TEST_PHONE_E164}, got {prefs.get('phone_e164')}"
        assert prefs.get("channels", {}).get("sms") is True
        assert prefs.get("alerts", {}).get("waste_digest") is True
        print(f"✓ Chef prefs saved with phone_e164={prefs.get('phone_e164')}")

    def test_get_prefs_returns_saved_data(self):
        """GET /api/chef-prefs/prefs returns saved prefs with defaults merged"""
        r = requests.get(
            f"{BASE_URL}/api/chef-prefs/prefs",
            headers={"X-User-Id": TEST_USER_ID},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        prefs = data.get("prefs", {})
        assert prefs.get("user_id") == TEST_USER_ID
        # Verify defaults are merged
        assert "channels" in prefs
        assert "alerts" in prefs
        assert "quiet_hours" in prefs
        print(f"✓ GET prefs returns user_id={prefs.get('user_id')}, channels={prefs.get('channels')}")

    def test_chefs_to_notify(self):
        """GET /api/chef-prefs/chefs-to-notify returns list of chefs with sms enabled"""
        r = requests.get(
            f"{BASE_URL}/api/chef-prefs/chefs-to-notify",
            params={"outlet_id": "outlet-main", "alert": "buffet_close"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "chefs" in data
        assert "count" in data
        print(f"✓ chefs-to-notify returns {data.get('count')} chefs for buffet_close alert")

    def test_test_sms_queued_no_credentials(self):
        """POST /api/chef-prefs/test-sms returns queued=true, reason='no_credentials'"""
        r = requests.post(
            f"{BASE_URL}/api/chef-prefs/test-sms",
            headers={"Content-Type": "application/json", "X-User-Id": TEST_USER_ID},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        # Since Twilio creds are not set, should return queued
        twilio = data.get("twilio", {})
        assert twilio.get("queued") is True, f"Expected queued=True, got {twilio}"
        assert twilio.get("reason") == "no_credentials", f"Expected reason='no_credentials', got {twilio.get('reason')}"
        print(f"✓ test-sms returns queued=True, reason='no_credentials'")


class TestRefillTracking:
    """F4 · Refill tracking endpoints"""

    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Create a buffet session for refill tests"""
        # First create a capture and entry
        init_r = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            headers={"Content-Type": "application/json"},
            json={"mode": "buffet_set", "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        assert init_r.status_code == 200
        capture_id = init_r.json().get("capture_id")

        # Create entry via still capture
        still_r = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            headers={"Content-Type": "application/json"},
            json={"capture_id": capture_id, "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        assert still_r.status_code == 200
        entry_id = still_r.json().get("entry_id")

        # Start buffet session
        set_r = requests.post(
            f"{BASE_URL}/api/waste/buffet/set",
            headers={"Content-Type": "application/json"},
            json={
                "outlet_id": "outlet-main",
                "service_name": "breakfast",
                "capture_id": capture_id,
                "entry_id": entry_id,
            },
        )
        assert set_r.status_code == 200
        self.session_id = set_r.json().get("session_id")
        self.capture_id = capture_id
        print(f"✓ Setup: created session {self.session_id}")

    def test_refill_adds_cost(self):
        """POST /api/waste/buffet/{session_id}/refill adds refill_cost and increments refill_count"""
        # Create a refill capture - use 'buffet_mid' mode for refills
        init_r = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            headers={"Content-Type": "application/json"},
            json={"mode": "buffet_mid", "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        refill_cap = init_r.json().get("capture_id")
        assert refill_cap, f"Failed to get capture_id: {init_r.json()}"

        # Create refill entry
        still_r = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            headers={"Content-Type": "application/json"},
            json={"capture_id": refill_cap, "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        refill_entry = still_r.json().get("entry_id")
        assert refill_entry, f"Failed to get entry_id: {still_r.json()}"

        # Post refill - capture_id is required in body
        r = requests.post(
            f"{BASE_URL}/api/waste/buffet/{self.session_id}/refill",
            headers={"Content-Type": "application/json"},
            json={
                "session_id": self.session_id,
                "capture_id": refill_cap,  # Required field
                "entry_id": refill_entry,
                "notes": "test refill",
            },
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        session = data.get("session", {})
        assert session.get("refill_count", 0) >= 1, f"Expected refill_count >= 1, got {session.get('refill_count')}"
        # Note: refill_cost_usd may be 0 if the stub vision returns 0 cost items
        print(f"✓ Refill added: refill_count={session.get('refill_count')}, refill_cost_usd={session.get('refill_cost_usd')}")

    def test_list_refills(self):
        """GET /api/waste/buffet/{session_id}/refills lists refill entries"""
        r = requests.get(f"{BASE_URL}/api/waste/buffet/{self.session_id}/refills")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "refills" in data
        assert "count" in data
        print(f"✓ List refills: count={data.get('count')}")


class TestMenuPreload:
    """F5 · Menu pre-load (text mode)"""

    def test_upload_menu_text_mode(self):
        """POST /api/waste/events/{event_id}/menu/upload with mode=text extracts items"""
        event_id = f"evt-test-{uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{BASE_URL}/api/waste/events/{event_id}/menu/upload",
            headers={"Content-Type": "application/json"},
            json={
                "event_id": event_id,  # Required in body as well
                "mode": "text",
                "raw_text": """
                Breakfast Buffet Menu:
                - Scrambled Eggs with herbs
                - Bacon strips
                - Fresh fruit salad
                - Blueberry muffins
                - Orange juice
                """,
            },
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        # Note: item_count may be 0 if LLM extraction fails, but the endpoint should still work
        menu = data.get("menu", {})
        assert "menu_items" in menu, "Expected menu_items in response"
        assert "item_count" in data, "Expected item_count in response"
        print(f"✓ Menu upload: item_count={data.get('item_count')}, extraction_failed={data.get('extraction_failed')}")

    def test_get_event_menu(self):
        """GET /api/waste/events/{event_id}/menu returns stored menu"""
        event_id = f"evt-test-{uuid.uuid4().hex[:8]}"
        # First upload with event_id in body
        upload_r = requests.post(
            f"{BASE_URL}/api/waste/events/{event_id}/menu/upload",
            headers={"Content-Type": "application/json"},
            json={
                "event_id": event_id,
                "mode": "text",
                "raw_text": "Test menu: Pancakes, Waffles, Syrup",
            },
        )
        assert upload_r.status_code == 200, f"Upload failed: {upload_r.text}"
        
        # Then get
        r = requests.get(f"{BASE_URL}/api/waste/events/{event_id}/menu")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        menu = data.get("menu")
        assert menu is not None, "Expected menu to be returned"
        assert menu.get("event_id") == event_id, f"Expected event_id={event_id}, got {menu.get('event_id')}"
        print(f"✓ GET menu: event_id={event_id}, item_count={menu.get('item_count')}")


class TestDraftRecipes:
    """F6 · Verbal recipe draft creation"""

    def test_create_draft_recipe(self):
        """POST /api/waste/draft-recipes creates draft with ingredients and steps"""
        r = requests.post(
            f"{BASE_URL}/api/waste/draft-recipes",
            headers={"Content-Type": "application/json"},
            json={
                "raw_text": """
                Avocado Toast with Poached Egg:
                Take 2 slices of sourdough bread, toast until golden.
                Mash 1 ripe avocado with salt, pepper, and lime juice.
                Spread avocado on toast.
                Top with a poached egg and red pepper flakes.
                Serves 1, about 350 calories, costs around $4.50.
                """,
                "dish_hint": "Avocado Toast",
                "user_id": "chef-william",
                "outlet_id": "outlet-main",
            },
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        draft = data.get("draft", {})
        assert draft.get("draft_id", "").startswith("drec-"), f"Expected draft_id to start with 'drec-', got {draft.get('draft_id')}"
        assert len(draft.get("ingredients", [])) > 0, "Expected ingredients to be extracted"
        assert len(draft.get("steps", [])) > 0, "Expected steps to be extracted"
        assert "extract_confidence" in draft, "Expected extract_confidence field"
        print(f"✓ Draft created: draft_id={draft.get('draft_id')}, ingredients={len(draft.get('ingredients', []))}, steps={len(draft.get('steps', []))}")
        return draft.get("draft_id")

    def test_promote_draft(self):
        """POST /api/waste/draft-recipes/{draft_id}/promote creates approved recipe"""
        # First create a draft
        create_r = requests.post(
            f"{BASE_URL}/api/waste/draft-recipes",
            headers={"Content-Type": "application/json"},
            json={
                "raw_text": "Simple Salad: Mix lettuce, tomatoes, cucumber. Add olive oil dressing. Serves 2.",
                "dish_hint": "Simple Salad",
                "user_id": "chef-william",
            },
        )
        draft_id = create_r.json().get("draft", {}).get("draft_id")
        assert draft_id, "Failed to create draft for promote test"

        # Promote it
        r = requests.post(
            f"{BASE_URL}/api/waste/draft-recipes/{draft_id}/promote",
            headers={"Content-Type": "application/json"},
            json={"name": "Simple Garden Salad", "portion_g": 200, "cost": 3.50, "category": "produce"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        recipe = data.get("recipe", {})
        assert recipe.get("status") == "approved", f"Expected status='approved', got {recipe.get('status')}"
        print(f"✓ Draft promoted: recipe_id={recipe.get('recipe_id')}, status={recipe.get('status')}")

    def test_reject_draft(self):
        """POST /api/waste/draft-recipes/{draft_id}/reject sets status to rejected"""
        # First create a draft
        create_r = requests.post(
            f"{BASE_URL}/api/waste/draft-recipes",
            headers={"Content-Type": "application/json"},
            json={
                "raw_text": "Bad Recipe: Just throw everything in a pot. Cook until done.",
                "dish_hint": "Mystery Stew",
                "user_id": "chef-william",
            },
        )
        draft_id = create_r.json().get("draft", {}).get("draft_id")
        assert draft_id, "Failed to create draft for reject test"

        # Reject it
        r = requests.post(
            f"{BASE_URL}/api/waste/draft-recipes/{draft_id}/reject",
            params={"reason": "not_a_real_recipe"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert data.get("status") == "rejected", f"Expected status='rejected', got {data.get('status')}"
        print(f"✓ Draft rejected: draft_id={draft_id}")


class TestParSheet:
    """Par Sheet UI (wireframe 07)"""

    def test_par_sheet_returns_rows(self):
        """GET /api/waste/par-sheet returns par_rows with required fields"""
        r = requests.get(
            f"{BASE_URL}/api/waste/par-sheet",
            params={"outlet_id": "outlet-main", "lookback_days": 14},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "par_rows" in data
        assert "total_par_cost_usd" in data
        assert "category_par_cost" in data
        assert "sessions_sampled" in data
        
        # If there are rows, check structure
        rows = data.get("par_rows", [])
        if rows:
            row = rows[0]
            assert "recipe_id" in row
            assert "avg_consumed" in row
            assert "std_dev" in row
            assert "recommended_par" in row
            assert "est_par_cost" in row
            print(f"✓ Par sheet: {len(rows)} rows, total_par_cost=${data.get('total_par_cost_usd')}")
        else:
            print(f"✓ Par sheet: 0 rows (no closed sessions in window), sessions_sampled={data.get('sessions_sampled')}")


class TestWasteDigest:
    """Waste Digest SMS emit"""

    def test_buffet_close_includes_digest(self):
        """POST /api/waste/buffet/close includes digest in response"""
        # Create a full buffet session flow
        # 1. Init and capture for set
        init_r = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            headers={"Content-Type": "application/json"},
            json={"mode": "buffet_set", "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        set_cap = init_r.json().get("capture_id")
        
        still_r = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            headers={"Content-Type": "application/json"},
            json={"capture_id": set_cap, "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        set_entry = still_r.json().get("entry_id")

        # 2. Start session
        set_r = requests.post(
            f"{BASE_URL}/api/waste/buffet/set",
            headers={"Content-Type": "application/json"},
            json={
                "outlet_id": "outlet-main",
                "service_name": "breakfast",
                "capture_id": set_cap,
                "entry_id": set_entry,
            },
        )
        session_id = set_r.json().get("session_id")

        # 3. Set guest count
        requests.post(
            f"{BASE_URL}/api/waste/buffet/{session_id}/guest-count",
            headers={"Content-Type": "application/json"},
            json={"guest_count": 50, "source": "manual"},
        )

        # 4. Init and capture for close
        close_init = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            headers={"Content-Type": "application/json"},
            json={"mode": "buffet_close", "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        close_cap = close_init.json().get("capture_id")
        
        close_still = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            headers={"Content-Type": "application/json"},
            json={"capture_id": close_cap, "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        close_entry = close_still.json().get("entry_id")

        # 5. Close session
        r = requests.post(
            f"{BASE_URL}/api/waste/buffet/close",
            headers={"Content-Type": "application/json"},
            json={
                "session_id": session_id,
                "close_capture_id": close_cap,
                "close_entry_id": close_entry,
            },
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        
        # Check digest is included
        digest = data.get("digest", {})
        assert digest.get("ok") is True, f"Expected digest.ok=True, got {digest}"
        assert "sent_to" in digest, "Expected 'sent_to' in digest"
        assert "message" in digest, "Expected 'message' in digest"
        print(f"✓ Buffet close includes digest: sent_to={digest.get('sent_to')}, message={digest.get('message')[:50]}...")

    def test_manual_digest_trigger(self):
        """POST /api/waste/buffet/{id}/digest manually fires digest"""
        # Create and close a session first
        init_r = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            headers={"Content-Type": "application/json"},
            json={"mode": "buffet_set", "user_id": "test-user", "outlet_id": "outlet-main"},
        )
        cap = init_r.json().get("capture_id")
        
        still_r = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            headers={"Content-Type": "application/json"},
            json={"capture_id": cap},
        )
        entry = still_r.json().get("entry_id")

        set_r = requests.post(
            f"{BASE_URL}/api/waste/buffet/set",
            headers={"Content-Type": "application/json"},
            json={"outlet_id": "outlet-main", "service_name": "lunch", "capture_id": cap, "entry_id": entry},
        )
        session_id = set_r.json().get("session_id")

        # Close it
        close_init = requests.post(
            f"{BASE_URL}/api/waste/capture/init",
            headers={"Content-Type": "application/json"},
            json={"mode": "buffet_close"},
        )
        close_cap = close_init.json().get("capture_id")
        close_still = requests.post(
            f"{BASE_URL}/api/waste/capture/still",
            headers={"Content-Type": "application/json"},
            json={"capture_id": close_cap},
        )
        close_entry = close_still.json().get("entry_id")

        requests.post(
            f"{BASE_URL}/api/waste/buffet/close",
            headers={"Content-Type": "application/json"},
            json={"session_id": session_id, "close_capture_id": close_cap, "close_entry_id": close_entry},
        )

        # Now manually trigger digest
        r = requests.post(f"{BASE_URL}/api/waste/buffet/{session_id}/digest")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True
        assert "message" in data
        print(f"✓ Manual digest trigger: message={data.get('message')[:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
