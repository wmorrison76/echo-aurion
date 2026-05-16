"""
Weather Service — Real OpenWeatherMap + Demand Impact
=====================================================
Fetches real weather data from OpenWeatherMap API with intelligent
caching. Falls back to seasonal simulation if API unavailable.
Provides demand impact analysis for F&B operations.
"""
import os
import httpx
from fastapi import APIRouter, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
from database import db
import math

router = APIRouter()

API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")
RESORT_LAT = 26.1224
RESORT_LON = -80.1373
RESORT_NAME = "Fort Lauderdale, FL"

RESORT_LOCATION = {
    "name": RESORT_NAME,
    "lat": RESORT_LAT,
    "lon": RESORT_LON,
    "timezone": "America/New_York",
}

# Cache weather data for 30 minutes
_weather_cache = {"data": None, "expires": None}
_forecast_cache = {"data": None, "expires": None}


async def _fetch_owm_current():
    """Fetch current weather from OpenWeatherMap API."""
    if not API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"lat": RESORT_LAT, "lon": RESORT_LON, "appid": API_KEY, "units": "imperial"},
            )
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        print(f"[Weather] OWM current fetch error: {e}")
    return None


async def _fetch_owm_forecast():
    """Fetch 5-day/3-hour forecast from OpenWeatherMap API."""
    if not API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={"lat": RESORT_LAT, "lon": RESORT_LON, "appid": API_KEY, "units": "imperial"},
            )
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        print(f"[Weather] OWM forecast fetch error: {e}")
    return None


def _owm_to_current(data: dict) -> dict:
    """Transform OWM current weather response to our format."""
    main = data.get("main", {})
    wind = data.get("wind", {})
    clouds = data.get("clouds", {})
    weather = data.get("weather", [{}])[0]
    rain = data.get("rain", {})

    return {
        "location": RESORT_LOCATION,
        "current": {
            "temp": round(main.get("temp", 78), 1),
            "feels_like": round(main.get("feels_like", 78), 1),
            "temp_min": round(main.get("temp_min", 72), 1),
            "temp_max": round(main.get("temp_max", 85), 1),
            "humidity": main.get("humidity", 65),
            "pressure": main.get("pressure", 1015),
            "visibility": data.get("visibility", 10000),
            "wind_speed": round(wind.get("speed", 8), 1),
            "wind_deg": wind.get("deg", 0),
            "clouds": clouds.get("all", 20),
            "condition": {
                "id": weather.get("id", 800),
                "main": weather.get("main", "Clear"),
                "description": weather.get("description", "clear sky"),
                "icon": weather.get("icon", "01d"),
            },
            "rain_1h": rain.get("1h", 0),
            "uv_index": 0,
        },
        "source": "openweathermap_live",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _owm_to_forecast(data: dict) -> list:
    """Transform OWM 5-day forecast into daily summaries."""
    entries = data.get("list", [])
    daily = {}

    for entry in entries:
        dt = datetime.fromtimestamp(entry["dt"], tz=timezone.utc)
        date_str = dt.strftime("%Y-%m-%d")
        if date_str not in daily:
            daily[date_str] = {
                "date": date_str,
                "day_name": dt.strftime("%A"),
                "temps": [],
                "humidity": [],
                "wind": [],
                "rain_total": 0,
                "conditions": [],
            }
        d = daily[date_str]
        d["temps"].append(entry["main"]["temp"])
        d["humidity"].append(entry["main"]["humidity"])
        d["wind"].append(entry["wind"]["speed"])
        d["rain_total"] += entry.get("rain", {}).get("3h", 0)
        d["conditions"].append(entry["weather"][0])

    result = []
    for date_str in sorted(daily.keys()):
        d = daily[date_str]
        temps = d["temps"]
        # Pick most common condition
        cond_counts = {}
        for c in d["conditions"]:
            k = c["main"]
            cond_counts[k] = cond_counts.get(k, 0) + 1
        dominant = max(d["conditions"], key=lambda c: cond_counts.get(c["main"], 0))

        rain_chance = min(100, round((d["rain_total"] / max(len(temps), 1)) * 40))
        if dominant["main"] in ("Rain", "Drizzle", "Thunderstorm"):
            rain_chance = max(rain_chance, 60)

        result.append({
            "date": date_str,
            "day_name": d["day_name"],
            "temp_high": round(max(temps), 1),
            "temp_low": round(min(temps), 1),
            "humidity": round(sum(d["humidity"]) / len(d["humidity"])),
            "wind_speed": round(sum(d["wind"]) / len(d["wind"]), 1),
            "rain_chance": rain_chance,
            "rain_amount_mm": round(d["rain_total"], 1),
            "condition": {
                "id": dominant.get("id", 800),
                "main": dominant.get("main", "Clear"),
                "description": dominant.get("description", ""),
                "icon": dominant.get("icon", "01d"),
            },
            "uv_index": 0,
            "demand_impact": "high" if rain_chance > 70 else ("moderate" if rain_chance > 40 else "low"),
            "indoor_bias": rain_chance > 50,
        })

    return result


def _seasonal_fallback_forecast(days: int = 7) -> list:
    """Deterministic seasonal forecast fallback when API is unavailable."""
    import random as rng
    now = datetime.now(timezone.utc)
    month = now.month
    base_temp = 82 if month in (6, 7, 8) else (72 if month in (12, 1, 2) else 78)

    forecast = []
    for d in range(days):
        day = now + timedelta(days=d)
        seed = int(day.strftime("%Y%m%d"))
        r = rng.Random(seed)
        temp_var = r.uniform(-4, 4) + 2 * math.sin(d * 0.6)
        rain_chance = r.randint(5, 85)
        cond_main = "Clear" if rain_chance < 30 else ("Clouds" if rain_chance < 55 else ("Rain" if rain_chance < 80 else "Thunderstorm"))

        forecast.append({
            "date": day.strftime("%Y-%m-%d"),
            "day_name": day.strftime("%A"),
            "temp_high": round(base_temp + temp_var + 4, 1),
            "temp_low": round(base_temp + temp_var - 5, 1),
            "humidity": r.randint(55, 85),
            "wind_speed": round(r.uniform(4, 16), 1),
            "rain_chance": rain_chance,
            "rain_amount_mm": round(r.uniform(1, 12), 1) if rain_chance > 50 else 0,
            "condition": {"id": 800 if cond_main == "Clear" else 500, "main": cond_main, "description": cond_main.lower(), "icon": "01d"},
            "uv_index": round(r.uniform(4, 10), 1),
            "demand_impact": "high" if rain_chance > 70 else ("moderate" if rain_chance > 40 else "low"),
            "indoor_bias": rain_chance > 50,
        })
    return forecast


def _calc_demand_impact(forecast_days: list) -> list:
    """Calculate F&B demand impact from weather forecast."""
    impacts = []
    for day in forecast_days:
        rain = day.get("rain_chance", 0)
        temp_high = day.get("temp_high", 78)

        outdoor_pct = max(15, 100 - rain)
        indoor_pct = 100 - outdoor_pct

        # Covers modifier based on weather
        covers_mod = 1.0
        if rain > 70:
            covers_mod = 0.82  # Heavy rain reduces covers
        elif rain > 50:
            covers_mod = 0.92
        elif rain < 20 and temp_high > 75:
            covers_mod = 1.12  # Great weather boosts
        elif temp_high > 90:
            covers_mod = 0.95  # Extreme heat slightly reduces

        # Menu recommendations
        if rain > 60:
            menu_rec = "Push comfort food, soups, braised items. Close patio service."
        elif rain > 35:
            menu_rec = "Standard setup. Have backup indoor capacity. Push warm appetizers."
        elif temp_high > 85:
            menu_rec = "Push cold items, salads, ceviche, frozen cocktails. Full patio + pool bar."
        else:
            menu_rec = "Full service all outlets. Feature seasonal specials."

        # Beverage impact
        if temp_high > 85 and rain < 30:
            bev_rec = "High volume: frozen cocktails, rose, white wine, pool bar specials"
        elif rain > 60:
            bev_rec = "Warm cocktails, red wine, whiskey flights, indoor bar focus"
        else:
            bev_rec = "Standard beverage program"

        impacts.append({
            "date": day["date"],
            "day_name": day["day_name"],
            "weather": day["condition"]["main"],
            "temp_high": temp_high,
            "temp_low": day.get("temp_low", 68),
            "rain_chance": rain,
            "rain_mm": day.get("rain_amount_mm", 0),
            "outdoor_dining_pct": outdoor_pct,
            "indoor_dining_pct": indoor_pct,
            "covers_modifier": round(covers_mod, 2),
            "menu_recommendation": menu_rec,
            "beverage_recommendation": bev_rec,
            "pool_bar_open": rain < 40 and temp_high > 70,
            "patio_service": rain < 50,
        })
    return impacts


# ══════════════════════════════
#  ENDPOINTS
# ══════════════════════════════

@router.get("/api/weather/current")
async def get_current_weather():
    """Get current weather — live from OpenWeatherMap with 30min cache."""
    now = datetime.now(timezone.utc)
    if _weather_cache["data"] and _weather_cache["expires"] and _weather_cache["expires"] > now:
        return _weather_cache["data"]

    live = await _fetch_owm_current()
    if live:
        result = _owm_to_current(live)
        _weather_cache["data"] = result
        _weather_cache["expires"] = now + timedelta(minutes=30)
        return result

    # Fallback to seasonal simulation
    from routes.weather import _generate_current as _legacy_current
    return _legacy_current()


@router.get("/api/weather/forecast")
async def get_forecast(days: int = 7):
    """Get weather forecast — live from OpenWeatherMap 5-day API."""
    now = datetime.now(timezone.utc)
    if _forecast_cache["data"] and _forecast_cache["expires"] and _forecast_cache["expires"] > now:
        cached = _forecast_cache["data"]
        return {"location": RESORT_LOCATION, "forecast": cached[:days], "days": min(days, len(cached)), "source": "openweathermap_cached"}

    live = await _fetch_owm_forecast()
    if live:
        forecast = _owm_to_forecast(live)
        _forecast_cache["data"] = forecast
        _forecast_cache["expires"] = now + timedelta(minutes=30)
        return {"location": RESORT_LOCATION, "forecast": forecast[:days], "days": min(days, len(forecast)), "source": "openweathermap_live"}

    # Fallback
    forecast = _seasonal_fallback_forecast(days)
    return {"location": RESORT_LOCATION, "forecast": forecast, "days": len(forecast), "source": "seasonal_model"}


@router.get("/api/weather/demand-impact")
async def get_demand_impact(days: int = 7):
    """Weather-driven demand forecast for F&B operations."""
    # Get forecast data
    forecast_resp = await get_forecast(days)
    forecast_days = forecast_resp.get("forecast", [])
    impacts = _calc_demand_impact(forecast_days)

    return {
        "location": RESORT_LOCATION,
        "impacts": impacts,
        "avg_covers_modifier": round(sum(i["covers_modifier"] for i in impacts) / max(len(impacts), 1), 2),
        "source": forecast_resp.get("source", "unknown"),
    }


@router.get("/api/weather/ops-forecast-overlay")
async def get_ops_forecast_weather_overlay():
    """Weather overlay for the 21-day ops forecast.
    Returns weather data aligned with the forecast dates for easy integration."""
    forecast_resp = await get_forecast(7)
    forecast_days = forecast_resp.get("forecast", [])
    impacts = _calc_demand_impact(forecast_days)

    # Build date-keyed lookup
    weather_by_date = {}
    for i, day in enumerate(forecast_days):
        impact = impacts[i] if i < len(impacts) else {}
        weather_by_date[day["date"]] = {
            "condition": day["condition"]["main"],
            "icon": day["condition"].get("icon", "01d"),
            "temp_high": day["temp_high"],
            "temp_low": day["temp_low"],
            "rain_chance": day["rain_chance"],
            "rain_mm": day.get("rain_amount_mm", 0),
            "humidity": day.get("humidity", 65),
            "wind_speed": day.get("wind_speed", 8),
            "covers_modifier": impact.get("covers_modifier", 1.0),
            "outdoor_dining_pct": impact.get("outdoor_dining_pct", 80),
            "indoor_dining_pct": impact.get("indoor_dining_pct", 20),
            "menu_recommendation": impact.get("menu_recommendation", ""),
            "beverage_recommendation": impact.get("beverage_recommendation", ""),
            "pool_bar_open": impact.get("pool_bar_open", True),
            "patio_service": impact.get("patio_service", True),
        }

    return {
        "weather_by_date": weather_by_date,
        "available_dates": list(weather_by_date.keys()),
        "source": forecast_resp.get("source", "unknown"),
    }


@router.get("/api/weather/rain-tracker")
async def get_rain_tracker():
    """Hourly rain probability for next 24 hours.
    Uses OWM 5-day/3-hour forecast data for the next 24 hours."""
    now = datetime.now(timezone.utc)

    # Try to use cached OWM forecast data for hourly resolution
    live = await _fetch_owm_forecast()
    if live:
        entries = live.get("list", [])
        hours = []
        for entry in entries[:8]:  # 8 x 3hr = 24hrs
            dt = datetime.fromtimestamp(entry["dt"], tz=timezone.utc)
            rain_3h = entry.get("rain", {}).get("3h", 0)
            pop = entry.get("pop", 0) * 100  # probability of precipitation
            temp = entry["main"]["temp"]

            # Spread 3-hour block into 3 individual hours
            for h_offset in range(3):
                hour_dt = dt + timedelta(hours=h_offset)
                hours.append({
                    "hour": hour_dt.strftime("%H:00"),
                    "rain_probability": min(100, round(pop)),
                    "rain_mm": round(rain_3h / 3, 1),
                    "temp": round(temp, 1),
                })

        hours = hours[:24]
        peak = max(hours, key=lambda x: x["rain_probability"]) if hours else {"hour": "00:00", "rain_probability": 0}
        return {
            "location": RESORT_LOCATION,
            "hours": hours,
            "peak_hour": peak,
            "total_rain_mm": round(sum(h["rain_mm"] for h in hours), 1),
            "source": "openweathermap_live",
        }

    # Fallback: simulated hourly rain
    import random as rng
    seed = int(now.strftime("%Y%m%d%H"))
    r = rng.Random(seed)
    hours = []
    for h in range(24):
        t = now + timedelta(hours=h)
        base_rain = r.uniform(0, 50)
        if 14 <= (t.hour % 24) <= 18:
            base_rain += 20
        hours.append({
            "hour": t.strftime("%H:00"),
            "rain_probability": min(100, round(base_rain)),
            "rain_mm": round(r.uniform(0, 4), 1) if base_rain > 40 else 0,
            "temp": round(78 + r.uniform(-4, 6), 1),
        })
    peak = max(hours, key=lambda x: x["rain_probability"])
    return {
        "location": RESORT_LOCATION,
        "hours": hours,
        "peak_hour": peak,
        "total_rain_mm": round(sum(h["rain_mm"] for h in hours), 1),
        "source": "seasonal_model",
    }
