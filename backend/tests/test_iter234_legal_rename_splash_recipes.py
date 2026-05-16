"""
iter234 Backend Tests — Legal outlet rename, proactive briefing, mobile recipe import.

Tests:
1. POST /api/echoaurium/seed-march-2026 — wipes legacy outlet IDs, inserts new 8 neutral names
2. GET /api/echoaurium/outlets — returns 8 rows with new names (Rooftop Lounge, etc.)
3. GET /api/echoaurium/pnl/full?outlet_id=outlet-rooftop — returns sections + kpis
4. GET /api/echo-voice/proactive-briefing — returns {ok, speech, alerts[], rain_warn}
5. POST /api/ecw-ops/recipes/save-imported — saves mobile-authored recipe
6. GET /api/ecw-ops/recipes — includes mobile-saved recipe with published_from='mobile'
7. POST /api/ecw-ops/recipes/import-url — bridge endpoint (may 502 if BBC blocks)
8. Regression: POST /api/echo-voice/chat with P&L question
9. Regression: POST /api/echo-voice/tts returns MP3 audio
10. Regression: GET /api/weather/current and /api/weather/rain-tracker
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# New outlet IDs from iter234
NEW_OUTLET_IDS = [
    "outlet-rooftop", "outlet-garden", "outlet-clubbar", "outlet-poolgrill",
    "outlet-marketcafe", "outlet-coastal", "outlet-ird", "outlet-ballroom"
]

# Legacy outlet IDs that should be wiped
LEGACY_OUTLET_IDS = [
    "outlet-windows", "outlet-nectar", "outlet-twoclub", "outlet-pools",
    "outlet-elate", "outlet-saltbreeze", "outlet-pelican"
]


class TestSeedMarch2026:
    """POST /api/echoaurium/seed-march-2026 — wipes legacy, inserts new 8 outlets"""

    def test_seed_returns_200(self):
        """Seed endpoint returns 200"""
        r = requests.post(f"{BASE_URL}/api/echoaurium/seed-march-2026")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        print(f"✓ POST /api/echoaurium/seed-march-2026 returns 200, outlets={data.get('outlets')}, lines={data.get('lines_written')}")

    def test_seed_returns_8_outlets(self):
        """Seed returns outlets=8"""
        r = requests.post(f"{BASE_URL}/api/echoaurium/seed-march-2026")
        data = r.json()
        assert data.get("outlets") == 8, f"Expected 8 outlets, got {data.get('outlets')}"
        print(f"✓ Seed created 8 outlets")


class TestEchoAuriumOutletsNewNames:
    """GET /api/echoaurium/outlets — returns 8 rows with new neutral names"""

    def test_outlets_returns_200(self):
        """Outlets endpoint returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/echoaurium/outlets returns 200")

    def test_outlets_returns_8_rows(self):
        """Outlets returns exactly 8 rows"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        data = r.json()
        rows = data.get("rows", [])
        assert len(rows) == 8, f"Expected 8 outlets, got {len(rows)}"
        print(f"✓ Outlets returns 8 rows")

    def test_outlets_all_active(self):
        """All 8 outlets have active=True"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        data = r.json()
        rows = data.get("rows", [])
        for o in rows:
            assert o.get("active") is True, f"Outlet {o.get('id')} should be active"
        print(f"✓ All 8 outlets are active")

    def test_outlets_have_new_names(self):
        """Outlets have new neutral names (Rooftop Lounge, not Windows on 66)"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        data = r.json()
        rows = data.get("rows", [])
        outlet_ids = [o.get("id") for o in rows]
        outlet_names = [o.get("name") for o in rows]
        
        # Check new IDs are present
        for new_id in NEW_OUTLET_IDS:
            assert new_id in outlet_ids, f"Missing new outlet ID: {new_id}"
        
        # Check legacy IDs are NOT present
        for legacy_id in LEGACY_OUTLET_IDS:
            assert legacy_id not in outlet_ids, f"Legacy outlet ID should be removed: {legacy_id}"
        
        # Check for new names
        assert "Rooftop Lounge" in outlet_names, "Missing 'Rooftop Lounge'"
        assert "Garden Room" in outlet_names, "Missing 'Garden Room'"
        assert "Club Bar" in outlet_names, "Missing 'Club Bar'"
        
        # Check legacy names are NOT present
        for name in outlet_names:
            assert "Windows" not in name, f"Legacy name 'Windows' found: {name}"
            assert "Nectar" not in name, f"Legacy name 'Nectar' found: {name}"
            assert "Thomas Keller" not in name, f"Legacy name 'Thomas Keller' found: {name}"
        
        print(f"✓ Outlets have new neutral names: {outlet_names}")


class TestPnLForNewOutlet:
    """GET /api/echoaurium/pnl/full?outlet_id=outlet-rooftop — returns sections + kpis"""

    def test_pnl_rooftop_returns_200(self):
        """P&L for outlet-rooftop returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full",
            params={"outlet_id": "outlet-rooftop", "period": "2026-03"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/echoaurium/pnl/full?outlet_id=outlet-rooftop returns 200")

    def test_pnl_rooftop_has_kpis(self):
        """P&L for outlet-rooftop has kpis"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full",
            params={"outlet_id": "outlet-rooftop", "period": "2026-03"},
        )
        data = r.json()
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "kpis" in data, "Missing 'kpis'"
        
        kpis = data["kpis"]
        assert "total_revenue" in kpis, "Missing total_revenue"
        assert "food_cost_pct" in kpis, "Missing food_cost_pct"
        assert "labor_cost_pct" in kpis, "Missing labor_cost_pct"
        assert "prime_cost_pct" in kpis, "Missing prime_cost_pct"
        
        print(f"✓ P&L KPIs for Rooftop: Revenue ${kpis['total_revenue']:,}, Food {kpis['food_cost_pct']}%, Labor {kpis['labor_cost_pct']}%, Prime {kpis['prime_cost_pct']}%")

    def test_pnl_rooftop_has_sections(self):
        """P&L for outlet-rooftop has sections"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full",
            params={"outlet_id": "outlet-rooftop", "period": "2026-03"},
        )
        data = r.json()
        assert "sections" in data, "Missing 'sections'"
        
        sections = data["sections"]
        expected = ["revenue", "cogs", "labor"]
        for sec in expected:
            assert sec in sections, f"Missing section: {sec}"
        
        print(f"✓ P&L sections: {list(sections.keys())}")


class TestProactiveBriefing:
    """GET /api/echo-voice/proactive-briefing — returns {ok, speech, alerts[], rain_warn}"""

    def test_proactive_briefing_returns_200(self):
        """Proactive briefing endpoint returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/echo-voice/proactive-briefing",
            params={"outlet_id": "outlet-rooftop"},
            headers={"X-User-Id": "chef-william"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print("✓ GET /api/echo-voice/proactive-briefing returns 200")

    def test_proactive_briefing_has_required_fields(self):
        """Proactive briefing returns ok, speech, alerts, rain_warn"""
        r = requests.get(
            f"{BASE_URL}/api/echo-voice/proactive-briefing",
            params={"outlet_id": "outlet-rooftop"},
            headers={"X-User-Id": "chef-william"},
        )
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "speech" in data, "Missing 'speech'"
        assert "alerts" in data, "Missing 'alerts'"
        assert "rain_warn" in data, "Missing 'rain_warn'"
        
        # Speech should be non-empty and time-aware
        speech = data["speech"]
        assert len(speech) > 10, f"Speech too short: {speech}"
        
        # Should contain time-aware greeting
        time_words = ["morning", "afternoon", "evening"]
        has_time = any(w in speech.lower() for w in time_words)
        assert has_time, f"Speech should be time-aware: {speech}"
        
        # alerts should be a list
        assert isinstance(data["alerts"], list), "alerts should be a list"
        
        # rain_warn should be boolean
        assert isinstance(data["rain_warn"], bool), "rain_warn should be boolean"
        
        print(f"✓ Proactive briefing: speech='{speech[:60]}...', alerts={len(data['alerts'])}, rain_warn={data['rain_warn']}")


class TestSaveImportedRecipe:
    """POST /api/ecw-ops/recipes/save-imported — saves mobile-authored recipe"""

    @pytest.fixture
    def test_recipe_data(self):
        """Generate unique test recipe data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "title": f"TEST_Mobile_Recipe_{unique_id}",
            "ingredients": ["2 cups flour", "1 cup sugar", "3 eggs"],
            "instructions": ["Mix dry ingredients", "Add eggs", "Bake at 350F"],
            "image": "https://example.com/test-image.jpg",
            "source_url": "https://example.com/test-recipe",
            "outlet_id": "outlet-rooftop",
        }

    def test_save_imported_returns_200(self, test_recipe_data):
        """Save imported recipe returns 200"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/recipes/save-imported",
            json=test_recipe_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print("✓ POST /api/ecw-ops/recipes/save-imported returns 200")

    def test_save_imported_returns_recipe_id(self, test_recipe_data):
        """Save imported recipe returns recipe_id and published_from='mobile'"""
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/recipes/save-imported",
            json=test_recipe_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
        )
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "recipe_id" in data, "Missing 'recipe_id'"
        assert data.get("published_from") == "mobile", f"Expected published_from='mobile', got {data.get('published_from')}"
        
        print(f"✓ Saved recipe: id={data['recipe_id']}, published_from={data['published_from']}")
        return data["recipe_id"]


class TestRecipesListWithMobileBadge:
    """GET /api/ecw-ops/recipes — includes mobile-saved recipe with published_from='mobile'"""

    def test_recipes_list_returns_200(self):
        """Recipes list returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/recipes",
            params={"outlet_id": "outlet-rooftop"},
            timeout=30,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/ecw-ops/recipes returns 200")

    def test_recipes_list_includes_mobile_authored(self):
        """Recipes list includes mobile-authored recipes"""
        # First save a mobile recipe
        unique_id = uuid.uuid4().hex[:8]
        save_data = {
            "title": f"TEST_Mobile_Badge_{unique_id}",
            "ingredients": ["test ingredient"],
            "instructions": ["test step"],
            "outlet_id": "outlet-rooftop",
        }
        save_r = requests.post(
            f"{BASE_URL}/api/ecw-ops/recipes/save-imported",
            json=save_data,
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
            timeout=30,
        )
        assert save_r.status_code == 200
        saved_id = save_r.json().get("recipe_id")
        
        # Wait a moment for DB write to complete
        import time
        time.sleep(0.5)
        
        # Now fetch recipes list with higher limit to ensure we get the new recipe
        r = requests.get(
            f"{BASE_URL}/api/ecw-ops/recipes",
            params={"outlet_id": "outlet-rooftop", "limit": 100},
            timeout=30,
        )
        data = r.json()
        rows = data.get("rows", [])
        
        # Find the mobile-authored recipe
        mobile_recipes = [rec for rec in rows if rec.get("published_from") == "mobile"]
        assert len(mobile_recipes) > 0, f"Should have at least one mobile-authored recipe. Got {len(rows)} total recipes."
        
        # Find our specific test recipe
        our_recipe = next((rec for rec in rows if rec.get("id") == saved_id), None)
        if our_recipe:
            assert our_recipe.get("published_from") == "mobile", f"Recipe should have published_from='mobile'"
        
        print(f"✓ Recipes list has {len(mobile_recipes)} mobile-authored recipes")


class TestRecipeImportUrlBridge:
    """POST /api/ecw-ops/recipes/import-url — bridge endpoint"""

    def test_import_url_endpoint_exists(self):
        """Import URL endpoint exists and doesn't 500"""
        # Use a simple URL that might work or return 502 (blocked)
        r = requests.post(
            f"{BASE_URL}/api/ecw-ops/recipes/import-url",
            json={
                "url": "https://www.bbc.co.uk/food/recipes/breadbutterpudding_85301",
                "outlet_id": "outlet-rooftop",
            },
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
            timeout=30,
        )
        # Should not be 500 (internal error) - 502 is acceptable if BBC blocks
        assert r.status_code != 500, f"Should not return 500, got {r.status_code}: {r.text}"
        print(f"✓ POST /api/ecw-ops/recipes/import-url returns {r.status_code} (502 acceptable if blocked)")


class TestRegressionEchoVoiceChat:
    """Regression: POST /api/echo-voice/chat with P&L question"""

    def test_voice_chat_pnl_question(self):
        """Voice chat with 'show p&l' returns session_id and speech"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/chat",
            json={
                "text": "show p&l",
                "outlet_id": "outlet-rooftop",
            },
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
            timeout=30,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "session_id" in data, "Missing session_id"
        assert "speech" in data, "Missing speech"
        assert data["speech"], "speech should not be empty"
        
        print(f"✓ Voice chat P&L: session={data['session_id']}, speech='{data['speech'][:60]}...'")


class TestRegressionTTS:
    """Regression: POST /api/echo-voice/tts returns MP3 audio"""

    def test_tts_returns_audio(self):
        """TTS endpoint returns audio"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/tts",
            json={"text": "Good morning William", "voice": "sage"},
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert r.headers.get("Content-Type", "").startswith("audio/"), "Should return audio"
        assert len(r.content) > 1000, "Audio should be >1KB"
        print(f"✓ TTS returns {len(r.content)} bytes audio")


class TestRegressionWeather:
    """Regression: GET /api/weather/current and /api/weather/rain-tracker"""

    def test_weather_current(self):
        """Weather current endpoint works"""
        r = requests.get(f"{BASE_URL}/api/weather/current")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "current" in data, "Missing 'current'"
        print(f"✓ Weather current: {data['current'].get('temp')}°F")

    def test_weather_rain_tracker(self):
        """Rain tracker endpoint works"""
        r = requests.get(f"{BASE_URL}/api/weather/rain-tracker")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "hours" in data, "Missing 'hours'"
        print(f"✓ Rain tracker: {len(data['hours'])} hours")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
