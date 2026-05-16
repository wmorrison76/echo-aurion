"""
NOAA/NWS Weather Feed
=====================
A.4 from the CFO toolkit. The single highest-leverage external signal
a hospitality forecast can consume that's also free. NOAA/NWS API
requires no API key (only a User-Agent header per their policy).

This module:
  · Resolves a property's lat/lon to the NWS forecast office grid.
  · Fetches the 7-day forecast for the property location.
  · Caches results in `weather_forecast` so we hit NOAA at most once
    every CACHE_TTL_MINUTES per property.
  · Persists every fetch to `weather_history` (append-only) so the
    learner can ask "what was the weather on the day this forecast
    was made" — needed for the trial-level retrospective signal
    attribution to work.
  · Publishes `weather.updated` to the event bus so downstream
    forecast subscribers can recompute.

Doctrine alignment:
  · §3.1 append-only — `weather_history` is append-only
  · §1.1 transparency — the cache TTL and last-fetched-at are
    surfaced honestly so a stale forecast is visible
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from database import db


router = APIRouter(prefix="/api/weather", tags=["cfo-weather"])

_now = lambda: datetime.now(timezone.utc).isoformat()


CACHE_TTL_MINUTES = 240            # NWS updates ~hourly; we refresh every 4h
USER_AGENT = "EchoAurionLUCCCA/1.0 (hospitality-forecasting; contact via property)"
NWS_BASE = "https://api.weather.gov"
HTTP_TIMEOUT_SECONDS = 8


def _ensure_indexes():
    db["property_weather_locations"].create_index([("property_id", 1)], unique=True)
    db["weather_forecast"].create_index([("property_id", 1), ("for_date", 1)], unique=True)
    db["weather_history"].create_index([("property_id", 1), ("fetched_at", -1)])


try:
    _ensure_indexes()
except Exception:
    pass


class LocationConfig(BaseModel):
    property_id: str
    lat: float
    lon: float
    timezone_name: str = "UTC"


@router.post("/locations")
async def configure_location(loc: LocationConfig):
    """Register a property's coordinates so the weather feed knows
    where to fetch from. One-time setup per property."""
    record = loc.model_dump()
    record["updated_at"] = _now()
    db["property_weather_locations"].update_one(
        {"property_id": loc.property_id}, {"$set": record}, upsert=True,
    )
    record.pop("_id", None)
    return {"location": record, "next_step": "POST /api/weather/refresh/{property_id} to fetch"}


@router.post("/refresh/{property_id}")
async def refresh_forecast(property_id: str, force: bool = Query(False)):
    """Fetch (or re-fetch if `force`) the 7-day forecast from NWS for
    the configured location. Returns cached value if within TTL unless
    `force=true`."""
    location = db["property_weather_locations"].find_one(
        {"property_id": property_id}, {"_id": 0},
    )
    if not location:
        raise HTTPException(404, f"No location configured for property {property_id}. POST /locations first.")

    if not force:
        existing = db["weather_history"].find_one(
            {"property_id": property_id}, {"_id": 0}, sort=[("fetched_at", -1)],
        )
        if existing:
            try:
                fetched_dt = datetime.fromisoformat(existing["fetched_at"].replace("Z", "+00:00"))
                if datetime.now(timezone.utc) - fetched_dt < timedelta(minutes=CACHE_TTL_MINUTES):
                    return {
                        "property_id": property_id,
                        "cached": True,
                        "fetched_at": existing["fetched_at"],
                        "forecast": existing.get("forecast", []),
                        "ttl_minutes": CACHE_TTL_MINUTES,
                    }
            except Exception:
                pass

    # Step 1: NWS gridpoints lookup for the lat/lon
    points_url = f"{NWS_BASE}/points/{location['lat']:.4f},{location['lon']:.4f}"
    points_data = _fetch_json(points_url)
    if not points_data:
        return _failure_response(property_id, "failed_to_resolve_nws_gridpoint", points_url)
    properties = points_data.get("properties", {})
    forecast_url = properties.get("forecast")
    if not forecast_url:
        return _failure_response(property_id, "nws_gridpoint_returned_no_forecast_url", points_url)

    # Step 2: Forecast lookup
    forecast_data = _fetch_json(forecast_url)
    if not forecast_data:
        return _failure_response(property_id, "failed_to_fetch_forecast", forecast_url)
    periods = (forecast_data.get("properties") or {}).get("periods") or []
    if not periods:
        return _failure_response(property_id, "nws_returned_no_periods", forecast_url)

    # Persist forecast per-day. NWS returns 14 periods (day/night × 7 days).
    # We collapse to 7 daily rows by combining the day period + the next
    # night period.
    daily_rows: List[Dict] = []
    by_date: Dict[str, Dict] = {}
    for p in periods:
        try:
            start_dt = datetime.fromisoformat(p["startTime"].replace("Z", "+00:00"))
            day_iso = start_dt.date().isoformat()
        except Exception:
            continue
        slot = "day" if p.get("isDaytime") else "night"
        bucket = by_date.setdefault(day_iso, {"date": day_iso})
        bucket[f"{slot}_temp_f"] = p.get("temperature")
        bucket[f"{slot}_short_forecast"] = p.get("shortForecast")
        bucket[f"{slot}_detailed_forecast"] = p.get("detailedForecast")
        bucket[f"{slot}_wind"] = p.get("windSpeed")
        bucket[f"{slot}_precip_pct"] = (p.get("probabilityOfPrecipitation") or {}).get("value")

    for day_iso, bucket in sorted(by_date.items()):
        # Derive simple signals for the forecaster
        precip_max = max(
            (bucket.get("day_precip_pct") or 0),
            (bucket.get("night_precip_pct") or 0),
        )
        forecast_text = " / ".join(filter(None, [bucket.get("day_short_forecast"), bucket.get("night_short_forecast")]))
        is_rainy = "rain" in forecast_text.lower() or precip_max >= 50
        is_snowy = "snow" in forecast_text.lower()
        bucket["precip_max_pct"] = precip_max
        bucket["forecast_summary"] = forecast_text
        bucket["is_rainy"] = is_rainy
        bucket["is_snowy"] = is_snowy
        daily_rows.append(bucket)

        # Cache per-day forecast for fast lookups
        db["weather_forecast"].update_one(
            {"property_id": property_id, "for_date": day_iso},
            {"$set": {**bucket, "property_id": property_id, "for_date": day_iso, "updated_at": _now()}},
            upsert=True,
        )

    # Append history row
    history_row = {
        "property_id": property_id,
        "fetched_at": _now(),
        "lat": location["lat"],
        "lon": location["lon"],
        "forecast": daily_rows,
        "source": "nws.api.weather.gov",
    }
    db["weather_history"].insert_one(history_row.copy())

    # Publish event so outlet_capture subscribers recompute
    try:
        from event_bus import publish
        publish("weather.updated", {"property_id": property_id, "days": len(daily_rows)}, source="weather_service")
    except Exception:
        pass

    history_row.pop("_id", None)
    return {
        "property_id": property_id,
        "cached": False,
        "fetched_at": history_row["fetched_at"],
        "forecast": daily_rows,
        "days": len(daily_rows),
    }


@router.get("/{property_id}")
async def get_forecast(property_id: str):
    """Return the cached 7-day forecast (or a not-yet-fetched response)."""
    rows = list(
        db["weather_forecast"].find({"property_id": property_id}, {"_id": 0})
        .sort("for_date", 1)
    )
    if not rows:
        return {
            "property_id": property_id,
            "available": False,
            "reason": "no_cached_forecast",
            "remediation": "POST /api/weather/refresh/{property_id} to fetch",
        }
    last_fetched = db["weather_history"].find_one(
        {"property_id": property_id}, {"_id": 0, "fetched_at": 1},
        sort=[("fetched_at", -1)],
    )
    return {
        "property_id": property_id,
        "available": True,
        "forecast": rows,
        "days": len(rows),
        "last_fetched_at": (last_fetched or {}).get("fetched_at"),
    }


@router.get("/{property_id}/at/{day}")
async def weather_at(property_id: str, day: str):
    """Get the forecast / historical weather for a single day. Used by
    the outlet capture retrospective for signal attribution."""
    row = db["weather_forecast"].find_one(
        {"property_id": property_id, "for_date": day}, {"_id": 0},
    )
    if row:
        return row
    return {
        "property_id": property_id,
        "for_date": day,
        "available": False,
        "reason": "no_cached_forecast_for_date",
    }


# ─────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────
def _fetch_json(url: str) -> Optional[Dict]:
    """GET a URL with the NWS-required User-Agent header. Returns parsed
    JSON or None on failure. Failure cases are logged via the audit
    fail-soft policy — never raise from inside the cached endpoint."""
    req = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_SECONDS) as resp:
            if resp.status != 200:
                return None
            data = resp.read()
            return json.loads(data.decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None
    except Exception:
        return None


def _failure_response(property_id: str, reason: str, attempted_url: str) -> Dict:
    """Doctrine §1.1 — failures are reported honestly with the URL
    that was tried so the operator knows what to investigate."""
    failure = {
        "property_id": property_id,
        "fetched_at": _now(),
        "success": False,
        "reason": reason,
        "attempted_url": attempted_url,
    }
    db["weather_history"].insert_one(failure.copy())
    failure.pop("_id", None)
    return failure
