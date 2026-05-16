"""
iter235 Backend Tests — Shift Notes, Team Chat, Dashboard Tab, Department Selector, Quick Launch.

Tests:
1. POST /api/ecw-ops/shift-notes — creates shift note and persists
2. GET /api/ecw-ops/shift-notes?outlet_id=outlet-rooftop — returns rows sorted desc
3. GET /api/team-chat/rooms?user_id=chef-william — returns {ok, count, rows}
4. Regression: GET /api/echoaurium/outlets — returns 8 neutral outlet names
5. Regression: GET /api/echo-voice/proactive-briefing — returns {ok, speech, alerts, rain_warn}
6. Regression: POST /api/ecw-ops/recipes/save-imported — saves mobile-authored recipes
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Expected outlet names from iter234
EXPECTED_OUTLET_NAMES = [
    "Rooftop Lounge", "Garden Room", "Club Bar", "Pool Grill",
    "Market Cafe", "Coastal Kitchen", "In-Room Dining", "Ballroom Catering"
]


class TestShiftNotesCreate:
    """POST /api/ecw-ops/shift-notes — creates shift note and persists"""

    @pytest.fixture
    def test_shift_note_data(self):
        """Generate unique test shift note data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "outlet_id": "outlet-rooftop",
            "shift": "pm",
            "text": f"TEST_Shift_Note_{unique_id}: Prep complete, all stations ready for dinner service.",
            "authored_by": "chef-william",
        }

    def test_create_shift_note_returns_200(self, test_shift_note_data):
        """POST /api/ecw-ops/shift-notes returns 200"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            json=test_shift_note_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print("✓ POST /api/ecw-ops/shift-notes returns 200")

    def test_create_shift_note_returns_ok_and_note(self, test_shift_note_data):
        """POST /api/ecw-ops/shift-notes returns {ok:True, note:{id,...}}"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            json=test_shift_note_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "note" in data, "Missing 'note' in response"
        
        note = data["note"]
        assert "id" in note, "Missing 'id' in note"
        assert note.get("outlet_id") == test_shift_note_data["outlet_id"], "outlet_id mismatch"
        assert note.get("shift") == test_shift_note_data["shift"], "shift mismatch"
        assert note.get("text") == test_shift_note_data["text"], "text mismatch"
        assert "created_at" in note, "Missing 'created_at' in note"
        
        print(f"✓ Shift note created: id={note['id']}, shift={note['shift']}, outlet={note['outlet_id']}")
        return note["id"]

    def test_create_shift_note_persists(self, test_shift_note_data):
        """Shift note persists and can be retrieved via GET"""
        # Create the note
        create_r = requests.post(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            json=test_shift_note_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        assert create_r.status_code == 200
        created_note = create_r.json()["note"]
        note_id = created_note["id"]
        
        # Wait for DB write
        time.sleep(0.3)
        
        # Retrieve via GET
        get_r = requests.get(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            params={"outlet_id": test_shift_note_data["outlet_id"], "limit": 50},
        )
        assert get_r.status_code == 200
        data = get_r.json()
        rows = data.get("rows", [])
        
        # Find our note
        our_note = next((n for n in rows if n.get("id") == note_id), None)
        assert our_note is not None, f"Created note {note_id} not found in GET response"
        assert our_note.get("text") == test_shift_note_data["text"], "Text mismatch after persistence"
        
        print(f"✓ Shift note {note_id} persisted and retrieved successfully")


class TestShiftNotesList:
    """GET /api/ecw-ops/shift-notes?outlet_id=outlet-rooftop — returns rows sorted desc"""

    def test_list_shift_notes_returns_200(self):
        """GET /api/ecw-ops/shift-notes returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            params={"outlet_id": "outlet-rooftop"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/ecw-ops/shift-notes returns 200")

    def test_list_shift_notes_returns_ok_and_rows(self):
        """GET /api/ecw-ops/shift-notes returns {ok, count, rows}"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            params={"outlet_id": "outlet-rooftop"},
        )
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "count" in data, "Missing 'count'"
        assert "rows" in data, "Missing 'rows'"
        assert isinstance(data["rows"], list), "rows should be a list"
        
        print(f"✓ Shift notes list: count={data['count']}, rows={len(data['rows'])}")

    def test_list_shift_notes_sorted_desc(self):
        """Shift notes are sorted by created_at descending (newest first)"""
        # Create two notes with slight delay
        note1_data = {
            "outlet_id": "outlet-rooftop",
            "shift": "am",
            "text": f"TEST_First_Note_{uuid.uuid4().hex[:6]}",
            "authored_by": "chef-william",
        }
        r1 = requests.post(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            json=note1_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        assert r1.status_code == 200
        note1_id = r1.json()["note"]["id"]
        
        time.sleep(0.5)  # Ensure different timestamps
        
        note2_data = {
            "outlet_id": "outlet-rooftop",
            "shift": "pm",
            "text": f"TEST_Second_Note_{uuid.uuid4().hex[:6]}",
            "authored_by": "chef-william",
        }
        r2 = requests.post(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            json=note2_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        assert r2.status_code == 200
        note2_id = r2.json()["note"]["id"]
        
        time.sleep(0.3)
        
        # Get list
        get_r = requests.get(
            f"{BASE_URL}/api/ecw-ops/shift-notes",
            params={"outlet_id": "outlet-rooftop", "limit": 50},
        )
        data = get_r.json()
        rows = data.get("rows", [])
        
        # Find positions
        note1_idx = next((i for i, n in enumerate(rows) if n.get("id") == note1_id), -1)
        note2_idx = next((i for i, n in enumerate(rows) if n.get("id") == note2_id), -1)
        
        # Second note (newer) should appear before first note (older)
        assert note2_idx < note1_idx, f"Notes not sorted desc: note2 at {note2_idx}, note1 at {note1_idx}"
        
        print(f"✓ Shift notes sorted desc: newer note at idx {note2_idx}, older at idx {note1_idx}")


class TestTeamChatRooms:
    """GET /api/team-chat/rooms?user_id=chef-william — returns {ok, count, rows}"""

    def test_team_chat_rooms_returns_200(self):
        """GET /api/team-chat/rooms returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/team-chat/rooms",
            params={"user_id": "chef-william"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/team-chat/rooms returns 200")

    def test_team_chat_rooms_returns_ok_and_rows(self):
        """GET /api/team-chat/rooms returns {ok, count, rows} — empty is OK"""
        r = requests.get(
            f"{BASE_URL}/api/team-chat/rooms",
            params={"user_id": "chef-william"},
        )
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "count" in data, "Missing 'count'"
        assert "rows" in data, "Missing 'rows'"
        assert isinstance(data["rows"], list), "rows should be a list"
        
        # Empty is acceptable per spec
        print(f"✓ Team chat rooms: count={data['count']}, rows={len(data['rows'])} (empty is OK)")


class TestRegressionOutlets:
    """Regression: GET /api/echoaurium/outlets — returns 8 neutral outlet names"""

    def test_outlets_returns_8_neutral_names(self):
        """Outlets returns 8 rows with neutral names (Rooftop Lounge, etc.)"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        rows = data.get("rows", [])
        
        assert len(rows) == 8, f"Expected 8 outlets, got {len(rows)}"
        
        outlet_names = [o.get("name") for o in rows]
        for expected_name in EXPECTED_OUTLET_NAMES:
            assert expected_name in outlet_names, f"Missing outlet: {expected_name}"
        
        print(f"✓ Outlets regression: 8 neutral names verified - {outlet_names}")


class TestRegressionProactiveBriefing:
    """Regression: GET /api/echo-voice/proactive-briefing — returns {ok, speech, alerts, rain_warn}"""

    def test_proactive_briefing_returns_required_fields(self):
        """Proactive briefing returns ok, speech, alerts, rain_warn"""
        r = requests.get(
            f"{BASE_URL}/api/echo-voice/proactive-briefing",
            params={"outlet_id": "outlet-rooftop"},
            headers={"X-User-Id": "chef-william"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "speech" in data, "Missing 'speech'"
        assert "alerts" in data, "Missing 'alerts'"
        assert "rain_warn" in data, "Missing 'rain_warn'"
        
        # Speech should be non-empty
        assert len(data["speech"]) > 10, f"Speech too short: {data['speech']}"
        
        print(f"✓ Proactive briefing regression: speech='{data['speech'][:50]}...', alerts={len(data['alerts'])}, rain_warn={data['rain_warn']}")


class TestRegressionSaveImportedRecipe:
    """Regression: POST /api/ecw-ops/recipes/save-imported — saves mobile-authored recipes"""

    def test_save_imported_recipe_works(self):
        """Save imported recipe returns 200 with recipe_id and published_from='mobile'"""
        unique_id = uuid.uuid4().hex[:8]
        recipe_data = {
            "title": f"TEST_Regression_Recipe_{unique_id}",
            "ingredients": ["1 cup flour", "2 eggs"],
            "instructions": ["Mix", "Bake"],
            "outlet_id": "outlet-rooftop",
        }
        
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/recipes/save-imported",
            json=recipe_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "recipe_id" in data, "Missing 'recipe_id'"
        assert data.get("published_from") == "mobile", f"Expected published_from='mobile', got {data.get('published_from')}"
        
        print(f"✓ Save imported recipe regression: id={data['recipe_id']}, published_from={data['published_from']}")


class TestRegressionWeather:
    """Regression: Weather endpoints still work"""

    def test_weather_current(self):
        """Weather current endpoint works"""
        r = requests.get(f"{BASE_URL}/api/weather/current")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "current" in data, "Missing 'current'"
        print(f"✓ Weather current regression: {data['current'].get('temp')}°F")

    def test_weather_rain_tracker(self):
        """Rain tracker endpoint works"""
        r = requests.get(f"{BASE_URL}/api/weather/rain-tracker")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "hours" in data, "Missing 'hours'"
        print(f"✓ Rain tracker regression: {len(data['hours'])} hours")


class TestRegressionEchoVoiceChat:
    """Regression: POST /api/echo-voice/chat works"""

    def test_voice_chat_works(self):
        """Voice chat returns session_id and speech"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/chat",
            json={"text": "hello", "outlet_id": "outlet-rooftop"},
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
            timeout=30,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "session_id" in data, "Missing session_id"
        assert "speech" in data, "Missing speech"
        
        print(f"✓ Voice chat regression: session={data['session_id']}, speech='{data['speech'][:40]}...'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
