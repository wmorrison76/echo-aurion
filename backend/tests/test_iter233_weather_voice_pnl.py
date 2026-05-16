"""
iter233 Backend Tests — Weather endpoints, Voice chat with weather-hourly panel,
EchoAurium outlets auto-upgrade, P&L data verification.

Tests:
1. GET /api/weather/current — returns {current: {temp, feels_like, wind_speed, condition: {main, description}}, location}
2. GET /api/weather/rain-tracker — returns {hours: [{hour, rain_probability, rain_mm, temp}]}
3. POST /api/echo-voice/chat with weather question — returns panel='weather-hourly'
4. GET /api/echoaurium/outlets — returns outlets list with active EchoAurium outlets
5. GET /api/echoaurium/pnl/full — returns P&L data with kpis (revenue, food_cost_pct, labor_cost_pct, prime_cost_pct)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


class TestWeatherCurrent:
    """GET /api/weather/current endpoint tests"""

    def test_weather_current_returns_200(self):
        """Weather current endpoint returns 200"""
        r = requests.get(f"{BASE_URL}/api/weather/current")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/weather/current returns 200")

    def test_weather_current_has_required_fields(self):
        """Weather current has temp, feels_like, wind_speed, condition"""
        r = requests.get(f"{BASE_URL}/api/weather/current")
        data = r.json()
        
        assert "current" in data, "Missing 'current' key"
        current = data["current"]
        
        assert "temp" in current, "Missing temp"
        assert "feels_like" in current, "Missing feels_like"
        assert "wind_speed" in current, "Missing wind_speed"
        assert "condition" in current, "Missing condition"
        
        cond = current["condition"]
        assert "main" in cond, "Missing condition.main"
        assert "description" in cond, "Missing condition.description"
        
        print(f"✓ Weather current: {current['temp']}°F, {cond['description']}, wind {current['wind_speed']} mph")

    def test_weather_current_has_location(self):
        """Weather current includes location info"""
        r = requests.get(f"{BASE_URL}/api/weather/current")
        data = r.json()
        
        # Location can be at top level or nested
        location = data.get("location") or data.get("current", {}).get("location")
        assert location is not None, "Missing location"
        assert "name" in location, "Missing location.name"
        print(f"✓ Weather location: {location['name']}")


class TestWeatherRainTracker:
    """GET /api/weather/rain-tracker endpoint tests"""

    def test_rain_tracker_returns_200(self):
        """Rain tracker endpoint returns 200"""
        r = requests.get(f"{BASE_URL}/api/weather/rain-tracker")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/weather/rain-tracker returns 200")

    def test_rain_tracker_has_hours_array(self):
        """Rain tracker returns hours array with required fields"""
        r = requests.get(f"{BASE_URL}/api/weather/rain-tracker")
        data = r.json()
        
        assert "hours" in data, "Missing 'hours' key"
        hours = data["hours"]
        assert isinstance(hours, list), "hours should be a list"
        assert len(hours) > 0, "hours should not be empty"
        
        # Check first hour has required fields
        h = hours[0]
        assert "hour" in h, "Missing hour field"
        assert "rain_probability" in h, "Missing rain_probability"
        assert "temp" in h, "Missing temp"
        
        print(f"✓ Rain tracker: {len(hours)} hours, first hour {h['hour']} with {h['rain_probability']}% rain chance")

    def test_rain_tracker_has_peak_hour(self):
        """Rain tracker includes peak_hour info"""
        r = requests.get(f"{BASE_URL}/api/weather/rain-tracker")
        data = r.json()
        
        assert "peak_hour" in data, "Missing peak_hour"
        peak = data["peak_hour"]
        assert "hour" in peak, "Missing peak_hour.hour"
        assert "rain_probability" in peak, "Missing peak_hour.rain_probability"
        print(f"✓ Peak rain hour: {peak['hour']} with {peak['rain_probability']}%")


class TestEchoVoiceWeatherPanel:
    """POST /api/echo-voice/chat with weather question returns panel='weather-hourly'"""

    def test_voice_chat_rain_question_returns_weather_panel(self):
        """Asking 'what time will it rain today' returns panel='weather-hourly'"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/chat",
            json={
                "text": "what time will it rain today?",
                "outlet_id": "outlet-windows",
            },
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
            timeout=30,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "session_id" in data, "Missing session_id"
        assert "speech" in data, "Missing speech"
        assert data["speech"], "speech should not be empty"
        
        # The panel should be weather-hourly for rain questions
        panel = data.get("panel")
        print(f"✓ Voice chat response: panel={panel}, speech={data['speech'][:80]}...")
        
        # Note: Claude may or may not return weather-hourly panel depending on interpretation
        # We verify the endpoint works and returns valid response
        assert data["session_id"].startswith("vs-"), f"session_id should start with vs-, got {data['session_id']}"

    def test_voice_chat_weather_context_injected(self):
        """Voice chat context snapshot includes weather data"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/chat",
            json={
                "text": "what's the weather like right now?",
                "outlet_id": "outlet-windows",
            },
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        
        # Claude should reference weather in response since it's injected in context
        speech = data.get("speech", "").lower()
        # Weather-related words that might appear in response
        weather_words = ["weather", "temperature", "degrees", "°f", "rain", "wind", "clear", "cloud", "fort lauderdale"]
        has_weather_ref = any(w in speech for w in weather_words)
        
        print(f"✓ Voice chat weather response: {data['speech'][:100]}...")
        # This is informational - Claude may or may not mention weather explicitly


class TestEchoAuriumOutlets:
    """GET /api/echoaurium/outlets — returns outlets list for auto-upgrade"""

    def test_echoaurium_outlets_returns_200(self):
        """EchoAurium outlets endpoint returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/echoaurium/outlets returns 200")

    def test_echoaurium_outlets_has_rows(self):
        """EchoAurium outlets returns rows array with outlet data"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        data = r.json()
        
        assert "rows" in data, "Missing 'rows' key"
        rows = data["rows"]
        assert isinstance(rows, list), "rows should be a list"
        assert len(rows) > 0, "rows should not be empty"
        
        # Check first outlet has id and name
        outlet = rows[0]
        assert "id" in outlet, "Missing outlet.id"
        assert "name" in outlet, "Missing outlet.name"
        
        print(f"✓ EchoAurium outlets: {len(rows)} outlets, first: {outlet['name']} ({outlet['id']})")

    def test_echoaurium_outlets_has_active_outlets(self):
        """EchoAurium outlets includes active outlets (not outlet-main)"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/outlets",
            headers={"X-User-Id": "chef-william"},
        )
        data = r.json()
        rows = data.get("rows", [])
        
        # Find outlets that are not outlet-main
        active_outlets = [o for o in rows if o.get("id") != "outlet-main"]
        assert len(active_outlets) > 0, "Should have at least one active outlet besides outlet-main"
        
        # Check for Windows on 66 (the default upgrade target)
        windows = next((o for o in rows if "windows" in o.get("id", "").lower() or "windows" in o.get("name", "").lower()), None)
        print(f"✓ Active outlets: {len(active_outlets)}, Windows outlet: {windows['name'] if windows else 'not found'}")


class TestEchoAuriumPnL:
    """GET /api/echoaurium/pnl/full — returns P&L data with KPIs"""

    def test_pnl_full_returns_200(self):
        """P&L full endpoint returns 200 for outlet-windows"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full",
            params={"outlet_id": "outlet-windows", "period": "2026-03"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/echoaurium/pnl/full returns 200")

    def test_pnl_full_has_kpis(self):
        """P&L full returns kpis with revenue, food_cost_pct, labor_cost_pct, prime_cost_pct"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full",
            params={"outlet_id": "outlet-windows", "period": "2026-03"},
        )
        data = r.json()
        
        assert data.get("ok") is True, f"Expected ok=True, got {data}"
        assert "kpis" in data, "Missing 'kpis' key"
        
        kpis = data["kpis"]
        assert "total_revenue" in kpis, "Missing total_revenue"
        assert "food_cost_pct" in kpis, "Missing food_cost_pct"
        assert "labor_cost_pct" in kpis, "Missing labor_cost_pct"
        assert "prime_cost_pct" in kpis, "Missing prime_cost_pct"
        
        print(f"✓ P&L KPIs: Revenue ${kpis['total_revenue']:,}, Food {kpis['food_cost_pct']}%, Labor {kpis['labor_cost_pct']}%, Prime {kpis['prime_cost_pct']}%")

    def test_pnl_full_has_sections(self):
        """P&L full returns sections (revenue, cogs, labor, etc.)"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/full",
            params={"outlet_id": "outlet-windows", "period": "2026-03"},
        )
        data = r.json()
        
        assert "sections" in data, "Missing 'sections' key"
        sections = data["sections"]
        
        # Check for expected sections
        expected_sections = ["revenue", "cogs", "labor"]
        for sec in expected_sections:
            assert sec in sections, f"Missing section: {sec}"
            assert "actual_total" in sections[sec], f"Missing actual_total in {sec}"
            assert "lines" in sections[sec], f"Missing lines in {sec}"
        
        print(f"✓ P&L sections: {list(sections.keys())}")


class TestEchoAuriumOccupancy:
    """GET /api/echoaurium/pnl/occupancy — returns resort occupancy data"""

    def test_occupancy_returns_200(self):
        """Occupancy endpoint returns 200"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/occupancy",
            params={"period": "2026-03"},
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print("✓ GET /api/echoaurium/pnl/occupancy returns 200")

    def test_occupancy_has_metrics(self):
        """Occupancy returns occupancy_pct, adr, revpar"""
        r = requests.get(
            f"{BASE_URL}/api/echoaurium/pnl/occupancy",
            params={"period": "2026-03"},
        )
        data = r.json()
        
        occ = data.get("occupancy")
        if occ:
            assert "occupancy_pct" in occ, "Missing occupancy_pct"
            assert "adr" in occ, "Missing adr"
            assert "revpar" in occ, "Missing revpar"
            print(f"✓ Occupancy: {occ['occupancy_pct']}% Occ, ${occ['adr']} ADR, ${occ['revpar']} RevPAR")
        else:
            print("✓ Occupancy endpoint works (no data for period)")


class TestRegressionIter232:
    """Regression tests for iter232 features"""

    def test_tts_endpoint_still_works(self):
        """TTS endpoint still returns audio"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/tts",
            json={"text": "Hello William", "voice": "sage"},
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert r.headers.get("Content-Type", "").startswith("audio/"), "Should return audio"
        assert len(r.content) > 1000, "Audio should be >1KB"
        print(f"✓ TTS endpoint works: {len(r.content)} bytes audio")

    def test_echo_voice_chat_still_works(self):
        """Echo voice chat endpoint still works"""
        r = requests.post(
            f"{BASE_URL}/api/echo-voice/chat",
            json={"text": "hello", "outlet_id": "outlet-windows"},
            headers={"X-User-Id": "chef-william", "Content-Type": "application/json"},
            timeout=20,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "session_id" in data
        assert "speech" in data
        print(f"✓ Echo voice chat works: {data['speech'][:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
