import { Router, Request, Response } from "express";
import type { RequestHandler } from "express";

const router = Router();

interface OpenWeatherMain {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  temp_min?: number;
  temp_max?: number;
}

interface OpenWeatherWind {
  speed: number;
  deg?: number;
}

interface OpenWeatherWeather {
  main: string;
  description: string;
  icon: string;
}

interface OpenWeatherForecast {
  list: Array<{
    dt: number;
    main: OpenWeatherMain;
    weather: OpenWeatherWeather[];
    wind: OpenWeatherWind;
  }>;
  city?: {
    name: string;
    country: string;
  };
}

interface WeatherData {
  current: {
    temp: number;
    condition: string;
    icon: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }>;
  location: string;
}

const getWeatherEmoji = (condition: string): string => {
  const lower = condition.toLowerCase();
  if (lower.includes("thunderstorm") || lower.includes("storm")) return "⛈️";
  if (lower.includes("drizzle") || lower.includes("rain")) return "🌧️";
  if (lower.includes("snow")) return "❄️";
  if (
    lower.includes("mist") ||
    lower.includes("smoke") ||
    lower.includes("haze")
  )
    return "🌫️";
  if (lower.includes("cloud")) return "☁️";
  if (lower.includes("clear") || lower.includes("sunny")) return "☀️";
  return "⛅";
};

const generateHourlyForecast = (
  baseTemp: number,
  condition: string,
  clientTime?: string | string[],
  tzOffset?: string | string[],
) => {
  const hours = [];

  try {
    let tzOffsetMs = 0;
    let clientTimestampMs = Date.now();

    if (tzOffset) {
      const tzStr = Array.isArray(tzOffset) ? tzOffset[0] : tzOffset;
      const parsed = parseInt(tzStr);
      if (!isNaN(parsed)) {
        tzOffsetMs = parsed;
      }
    }

    if (clientTime) {
      const ctStr = Array.isArray(clientTime) ? clientTime[0] : clientTime;
      const parsed = parseInt(ctStr);
      if (!isNaN(parsed)) {
        clientTimestampMs = parsed;
      }
    }

    const baseLocalTimestampMs = clientTimestampMs - tzOffsetMs;

    for (let i = 0; i < 12; i++) {
      const date = new Date(baseLocalTimestampMs + i * 3600000);
      hours.push({
        time:
          date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }) || `${i}:00 AM`,
        temp: baseTemp + Math.floor(Math.random() * 6 - 3),
        condition,
        icon: getWeatherEmoji(condition),
        humidity: 65 + Math.floor(Math.random() * 10 - 5),
        windSpeed: 8 + Math.floor(Math.random() * 4 - 2),
        precipitation: 0,
      });
    }
  } catch (err) {
    console.error("[WEATHER] Error generating hourly forecast:", err);
    for (let i = 0; i < 12; i++) {
      hours.push({
        time: `${i % 12 || 12}:00 ${i < 12 ? "AM" : "PM"}`,
        temp: baseTemp,
        condition,
        icon: getWeatherEmoji(condition),
        humidity: 65,
        windSpeed: 8,
        precipitation: 0,
      });
    }
  }

  return hours;
};

const getFallbackWeatherData = (
  cityName: string,
  countryCode: string,
  clientTime?: string | string[],
  tzOffset?: string | string[],
) => {
  return {
    current: {
      temp: 72,
      condition: "Clear",
      icon: "☀️",
      humidity: 65,
      windSpeed: 8,
      feelsLike: 70,
    },
    forecast: [
      {
        date: "Today",
        high: 78,
        low: 72,
        condition: "Clear",
        icon: "☀️",
        hourly: generateHourlyForecast(72, "Clear", clientTime, tzOffset),
      },
      {
        date: "Tomorrow",
        high: 76,
        low: 71,
        condition: "Partly Cloudy",
        icon: "⛅",
        hourly: generateHourlyForecast(
          74,
          "Partly Cloudy",
          clientTime,
          tzOffset,
        ),
      },
      {
        date: "Thu",
        high: 75,
        low: 70,
        condition: "Cloudy",
        icon: "☁️",
        hourly: generateHourlyForecast(71, "Cloudy", clientTime, tzOffset),
      },
      {
        date: "Fri",
        high: 74,
        low: 68,
        condition: "Rain",
        icon: "🌧️",
        hourly: generateHourlyForecast(70, "Rain", clientTime, tzOffset),
      },
      {
        date: "Sat",
        high: 77,
        low: 72,
        condition: "Clear",
        icon: "☀️",
        hourly: generateHourlyForecast(74, "Clear", clientTime, tzOffset),
      },
    ],
    location: `${cityName}, ${countryCode}`,
    fallback: true,
  };
};

const handleWeather: RequestHandler = async (req: Request, res: Response) => {
  try {
    const {
      zipCode = "33316",
      countryCode = "US",
      cityName = "Fort Lauderdale",
      clientTime,
      tzOffset,
    } = req.query;

    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      console.warn("[WEATHER] OpenWeatherMap API key not configured");
      const fallbackData = getFallbackWeatherData(
        cityName as string,
        countryCode as string,
        clientTime,
        tzOffset,
      );
      return res.status(200).json(fallbackData);
    }

    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?zip=${zipCode},${countryCode}&appid=${apiKey}&units=imperial`;

    console.log(
      "[WEATHER] Fetching from OpenWeatherMap:",
      forecastUrl.replace(apiKey, "***"),
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Weather fetch timeout"), 10000);

    let forecastResponse;
    try {
      forecastResponse = await fetch(forecastUrl, {
        signal: controller.signal,
      });
      console.log(
        "[WEATHER] OpenWeatherMap response status:",
        forecastResponse.status,
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("[WEATHER] Fetch failed:", fetchError);
      const fallbackData = getFallbackWeatherData(
        cityName as string,
        countryCode as string,
        clientTime,
        tzOffset,
      );
      return res.status(200).json(fallbackData);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!forecastResponse.ok) {
      const statusText = forecastResponse.statusText || "Unknown error";
      console.error(
        "[WEATHER] OpenWeatherMap API error:",
        forecastResponse.status,
        statusText,
      );

      try {
        const errorBody = await forecastResponse.text().catch(() => "");
        console.error("[WEATHER] Response body:", errorBody);
      } catch (e) {
        console.error("[WEATHER] Could not read error body:", e);
      }

      const fallbackData = getFallbackWeatherData(
        cityName as string,
        countryCode as string,
        clientTime,
        tzOffset,
      );
      return res.status(200).json(fallbackData);
    }

    let forecastData: OpenWeatherForecast;
    try {
      forecastData = (await forecastResponse.json()) as OpenWeatherForecast;
    } catch (parseError) {
      console.error("[WEATHER] Failed to parse API response:", parseError);
      const fallbackData = getFallbackWeatherData(
        cityName as string,
        countryCode as string,
        clientTime,
        tzOffset,
      );
      return res.status(200).json(fallbackData);
    }

    if (!forecastData || !forecastData.list || forecastData.list.length === 0) {
      console.error("[WEATHER] Invalid forecast data structure");
      const fallbackData = getFallbackWeatherData(
        cityName as string,
        countryCode as string,
        clientTime,
        tzOffset,
      );
      return res.status(200).json(fallbackData);
    }

    const currentForecast = forecastData.list[0];
    if (
      !currentForecast ||
      !currentForecast.main ||
      !currentForecast.weather ||
      currentForecast.weather.length === 0
    ) {
      console.error("[WEATHER] Invalid current forecast data");
      const fallbackData = getFallbackWeatherData(
        cityName as string,
        countryCode as string,
        clientTime,
        tzOffset,
      );
      return res.status(200).json(fallbackData);
    }

    const currentWeather = currentForecast.weather[0];

    const weatherData: WeatherData = {
      current: {
        temp: Math.round(currentForecast.main.temp),
        condition: currentWeather.main,
        icon: getWeatherEmoji(currentWeather.main),
        humidity: currentForecast.main.humidity,
        windSpeed: Math.round(currentForecast.wind?.speed || 0),
        feelsLike: Math.round(currentForecast.main.feels_like),
      },
      forecast: [],
      location: `${forecastData.city?.name || cityName}, ${
        forecastData.city?.country || countryCode
      }`,
    };

    const dailyForecasts = new Map<
      string,
      Array<(typeof forecastData.list)[0]>
    >();

    for (const item of forecastData.list) {
      if (!item || !item.dt) continue;
      const date = new Date(item.dt * 1000);
      const dayKey = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      if (!dailyForecasts.has(dayKey)) {
        dailyForecasts.set(dayKey, []);
      }
      dailyForecasts.get(dayKey)!.push(item);
    }

    let dayCount = 0;
    for (const [dayKey, forecasts] of dailyForecasts) {
      if (dayCount >= 5 || forecasts.length === 0) break;

      const temps = forecasts
        .map((f) => f?.main?.temp || 0)
        .filter((t) => t !== 0);
      if (temps.length === 0) continue;

      const high = Math.round(Math.max(...temps));
      const low = Math.round(Math.min(...temps));

      const conditions = forecasts
        .map((f) => f?.weather?.[0]?.main)
        .filter((c): c is string => !!c);
      const condition =
        (conditions.length > 0
          ? conditions.sort(
              (a, b) =>
                conditions.filter((x) => x === a).length -
                conditions.filter((x) => x === b).length,
            )[conditions.length - 1]
          : "Clear") || "Clear";

      let clientTimestampMs = Date.now();
      let tzOffsetMs = 0;

      if (clientTime) {
        const ctStr = Array.isArray(clientTime)
          ? clientTime[0]
          : (clientTime as string);
        const parsed = parseInt(ctStr);
        if (!isNaN(parsed)) {
          clientTimestampMs = parsed;
        }
      }

      if (tzOffset) {
        const tzStr = Array.isArray(tzOffset)
          ? tzOffset[0]
          : (tzOffset as string);
        const parsed = parseInt(tzStr);
        if (!isNaN(parsed)) {
          tzOffsetMs = parsed;
        }
      }

      const clientLocalTimestampMs = clientTimestampMs - tzOffsetMs;

      const clientLocalDate = new Date(clientLocalTimestampMs);

      let startHour = new Date(clientLocalDate);
      startHour.setUTCMinutes(0);
      startHour.setUTCSeconds(0);
      startHour.setUTCMilliseconds(0);

      if (startHour.getTime() < clientLocalDate.getTime()) {
        startHour.setUTCHours(startHour.getUTCHours() + 1);
      }

      if (dayCount > 0) {
        const dayStartDate = new Date(clientLocalDate);
        dayStartDate.setUTCHours(0, 0, 0, 0);
        dayStartDate.setUTCDate(dayStartDate.getUTCDate() + dayCount);
        startHour = dayStartDate;
      }

      const hourly = [];
      const tempRange = high - low;

      for (let i = 0; i < 12; i++) {
        const hourDate = new Date(startHour);
        hourDate.setHours(hourDate.getHours() + i);

        let closestForecast = forecasts[0];
        let minDiff = Math.abs(
          new Date(forecasts[0].dt * 1000).getTime() - hourDate.getTime(),
        );

        for (const f of forecasts) {
          if (!f || !f.dt) continue;
          const diff = Math.abs(
            new Date(f.dt * 1000).getTime() - hourDate.getTime(),
          );
          if (diff < minDiff) {
            minDiff = diff;
            closestForecast = f;
          }
        }

        const hourOfDay = hourDate.getHours();
        let tempVariation = 0;
        if (hourOfDay >= 6 && hourOfDay <= 14) {
          tempVariation = Math.round(((hourOfDay - 6) * tempRange) / 10);
        } else if (hourOfDay < 6) {
          tempVariation = Math.round(-tempRange / 3);
        } else {
          tempVariation = Math.round((-(hourOfDay - 14) * tempRange) / 10);
        }

        const forecastWeather = closestForecast?.weather?.[0];
        if (!forecastWeather) continue;

        const timeStr =
          hourDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }) || `${i % 12 || 12}:00 ${i < 12 ? "AM" : "PM"}`;

        hourly.push({
          time: timeStr,
          temp: Math.round((closestForecast?.main?.temp || 70) + tempVariation),
          condition: forecastWeather.main,
          icon: getWeatherEmoji(forecastWeather.main),
          humidity: Math.round(
            Math.max(
              40,
              Math.min(
                90,
                (closestForecast?.main?.humidity || 65) +
                  (Math.random() * 10 - 5),
              ),
            ),
          ),
          windSpeed: Math.round(
            Math.max(
              0,
              (closestForecast?.wind?.speed || 8) + (Math.random() * 4 - 2),
            ),
          ),
          precipitation: 0,
        });
      }

      weatherData.forecast.push({
        date: dayKey,
        high,
        low,
        condition,
        icon: getWeatherEmoji(condition),
        hourly,
      });

      dayCount++;
    }

    return res.status(200).json(weatherData);
  } catch (error) {
    console.error("[WEATHER] Unexpected error:", error);

    try {
      const cityName = (req.query.cityName as string) || "Fort Lauderdale";
      const countryCode = (req.query.countryCode as string) || "US";
      const fallbackData = getFallbackWeatherData(
        cityName,
        countryCode,
        req.query.clientTime,
        req.query.tzOffset,
      );
      return res.status(200).json(fallbackData);
    } catch (fallbackError) {
      console.error("[WEATHER] Failed to return fallback data:", fallbackError);
      return res.status(200).json({
        current: {
          temp: 72,
          condition: "Clear",
          icon: "☀️",
          humidity: 65,
          windSpeed: 8,
          feelsLike: 70,
        },
        forecast: [
          {
            date: "Today",
            high: 78,
            low: 72,
            condition: "Clear",
            icon: "☀️",
          },
        ],
        location: "Unknown",
        error: "Weather service temporarily unavailable",
      });
    }
  }
};

router.get("/weather", handleWeather);

export default router;
