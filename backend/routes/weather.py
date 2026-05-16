"""
Weather Service — Simulated weather data for resort operations.
Provides current conditions and forecast for demand planning.
"""
from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
import random
import math

router = APIRouter()

RESORT_LOCATION = {
    "name": "Fort Lauderdale, FL",
    "lat": 26.1224,
    "lon": -80.1373,
    "timezone": "America/New_York",
}

WEATHER_CONDITIONS = [
    {"id": 800, "main": "Clear", "description": "clear sky", "icon": "01d"},
    {"id": 801, "main": "Clouds", "description": "few clouds", "icon": "02d"},
    {"id": 802, "main": "Clouds", "description": "scattered clouds", "icon": "03d"},
    {"id": 500, "main": "Rain", "description": "light rain", "icon": "09d"},
    {"id": 501, "main": "Rain", "description": "moderate rain", "icon": "10d"},
    {"id": 200, "main": "Thunderstorm", "description": "thunderstorm", "icon": "11d"},
]


def _generate_current():
    now = datetime.now(timezone.utc)
    hour = now.hour
    base_temp = 78 + random.uniform(-3, 3)
    if hour < 6 or hour > 20:
        base_temp -= 8
    elif hour > 10 and hour < 16:
        base_temp += 4

    cond = random.choice(WEATHER_CONDITIONS[:4])
    humidity = random.randint(55, 85)
    wind = round(random.uniform(3, 15), 1)

    return {
        "location": RESORT_LOCATION,
        "current": {
            "temp": round(base_temp, 1),
            "feels_like": round(base_temp + random.uniform(-2, 3), 1),
            "temp_min": round(base_temp - 4, 1),
            "temp_max": round(base_temp + 5, 1),
            "humidity": humidity,
            "pressure": random.randint(1010, 1025),
            "visibility": random.randint(8000, 10000),
            "wind_speed": wind,
            "wind_deg": random.randint(0, 360),
            "clouds": random.randint(0, 80),
            "condition": cond,
            "uv_index": round(random.uniform(2, 11), 1),
        },
        "timestamp": now.isoformat(),
    }


def _generate_forecast(days=7):
    now = datetime.now(timezone.utc)
    forecast = []
    for d in range(days):
        day = now + timedelta(days=d)
        base = 78 + random.uniform(-5, 5) + 3 * math.sin(d * 0.8)
        rain_chance = random.randint(0, 100)
        cond_idx = 0 if rain_chance < 40 else (1 if rain_chance < 60 else (3 if rain_chance < 80 else 4))
        cond = WEATHER_CONDITIONS[cond_idx]

        forecast.append({
            "date": day.strftime("%Y-%m-%d"),
            "day_name": day.strftime("%A"),
            "temp_high": round(base + 5, 1),
            "temp_low": round(base - 6, 1),
            "humidity": random.randint(50, 90),
            "wind_speed": round(random.uniform(3, 18), 1),
            "rain_chance": rain_chance,
            "rain_amount_mm": round(random.uniform(0, 15), 1) if rain_chance > 50 else 0,
            "condition": cond,
            "uv_index": round(random.uniform(3, 11), 1),
            "demand_impact": "high" if rain_chance > 70 else ("moderate" if rain_chance > 40 else "low"),
            "indoor_bias": rain_chance > 50,
        })

    return forecast


def _generate_rain_tracker():
    """Hourly rain probability for next 24 hours."""
    now = datetime.now(timezone.utc)
    hours = []
    for h in range(24):
        t = now + timedelta(hours=h)
        base_rain = random.uniform(0, 60)
        if 14 <= (t.hour % 24) <= 18:
            base_rain += 25
        hours.append({
            "hour": t.strftime("%H:00"),
            "rain_probability": min(100, round(base_rain)),
            "rain_mm": round(random.uniform(0, 5), 1) if base_rain > 40 else 0,
            "temp": round(78 + random.uniform(-5, 8), 1),
        })
    return hours


@router.get("/api/weather/current")
def get_current_weather():
    data = _generate_current()
    return data


@router.get("/api/weather/forecast")
def get_forecast(days: int = 7):
    forecast = _generate_forecast(min(days, 14))
    return {
        "location": RESORT_LOCATION,
        "forecast": forecast,
        "days": len(forecast),
    }


@router.get("/api/weather/rain-tracker")
def get_rain_tracker():
    hours = _generate_rain_tracker()
    return {
        "location": RESORT_LOCATION,
        "hours": hours,
        "peak_hour": max(hours, key=lambda x: x["rain_probability"]),
        "total_rain_mm": round(sum(h["rain_mm"] for h in hours), 1),
    }


@router.get("/api/weather/demand-impact")
def get_demand_impact():
    """Weather-driven demand forecast for F&B operations."""
    forecast = _generate_forecast(7)
    impacts = []
    for day in forecast:
        outdoor_pct = max(20, 100 - day["rain_chance"])
        indoor_pct = 100 - outdoor_pct
        covers_modifier = 1.0
        if day["rain_chance"] > 70:
            covers_modifier = 0.85
        elif day["rain_chance"] < 20 and day["temp_high"] > 75:
            covers_modifier = 1.15

        impacts.append({
            "date": day["date"],
            "day_name": day["day_name"],
            "weather": day["condition"]["main"],
            "rain_chance": day["rain_chance"],
            "outdoor_dining_pct": outdoor_pct,
            "indoor_dining_pct": indoor_pct,
            "covers_modifier": round(covers_modifier, 2),
            "recommendation": (
                "Increase indoor prep, reduce patio setup" if day["rain_chance"] > 60
                else "Full patio service, outdoor bar active" if day["rain_chance"] < 30
                else "Standard setup, monitor conditions"
            ),
        })

    return {
        "location": RESORT_LOCATION,
        "impacts": impacts,
        "avg_covers_modifier": round(sum(i["covers_modifier"] for i in impacts) / len(impacts), 2),
    }
