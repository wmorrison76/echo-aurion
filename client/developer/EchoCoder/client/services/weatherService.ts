/**
 * Weather Service
 * Provides real-time weather data using Open-Meteo API (free, no authentication)
 */

export interface WeatherData {
  location: string;
  temperature: number;
  temperatureUnit: string;
  weatherCode: number;
  weatherDescription: string;
  humidity: number;
  windSpeed: number;
  windSpeedUnit: string;
  feelsLike: number;
  precipitationProbability: number;
  timestamp: number;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
}

class WeatherService {
  private readonly BASE_URL = "https://api.open-meteo.com/v1";
  private cache: Map<string, { data: WeatherData; timestamp: number }> =
    new Map();
  private CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Weather code to description mapping (WMO codes)
  private weatherDescriptions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  /**
   * Geocode location name to coordinates
   */
  async geocodeLocation(
    locationName: string,
  ): Promise<LocationCoordinates | null> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/geocoding?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`,
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.results || data.results.length === 0) return null;

      const result = data.results[0];
      return {
        latitude: result.latitude,
        longitude: result.longitude,
        name: result.name,
        country: result.country,
      };
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  /**
   * Get current weather for a location
   */
  async getWeather(locationName: string): Promise<WeatherData | null> {
    // Check cache
    const cached = this.cache.get(locationName.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // First, geocode the location
      const coordinates = await this.geocodeLocation(locationName);
      if (!coordinates) {
        return null;
      }

      // Get weather data
      const response = await fetch(
        `${this.BASE_URL}/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`,
      );

      if (!response.ok) return null;

      const data = await response.json();
      const current = data.current;

      const weatherData: WeatherData = {
        location: `${coordinates.name}${coordinates.country ? ", " + coordinates.country : ""}`,
        temperature: Math.round(current.temperature_2m),
        temperatureUnit: "°F",
        weatherCode: current.weather_code,
        weatherDescription: this.getWeatherDescription(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windSpeedUnit: "mph",
        feelsLike: Math.round(current.apparent_temperature),
        precipitationProbability: 0, // Not included in free tier
        timestamp: Date.now(),
      };

      // Cache the result
      this.cache.set(locationName.toLowerCase(), {
        data: weatherData,
        timestamp: Date.now(),
      });

      return weatherData;
    } catch (error) {
      console.error("Weather fetch error:", error);
      return null;
    }
  }

  /**
   * Format weather data for display
   */
  formatWeather(weather: WeatherData): string {
    return (
      `📍 ${weather.location}\n` +
      `🌡️ ${weather.temperature}${weather.temperatureUnit} (feels like ${weather.feelsLike}${weather.temperatureUnit})\n` +
      `☁️ ${weather.weatherDescription}\n` +
      `💧 Humidity: ${weather.humidity}%\n` +
      `💨 Wind: ${weather.windSpeed} ${weather.windSpeedUnit}`
    );
  }

  /**
   * Get weather description from WMO code
   */
  private getWeatherDescription(code: number): string {
    // Check exact match first
    if (this.weatherDescriptions[code]) {
      return this.weatherDescriptions[code];
    }

    // Check ranges for similar codes
    if (code >= 50 && code < 70) return "Rain";
    if (code >= 70 && code < 85) return "Snow";
    if (code >= 80 && code < 90) return "Showers";

    return "Unknown";
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cached locations
   */
  getCachedLocations(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance
let weatherService: WeatherService | null = null;

export function getWeatherService(): WeatherService {
  if (!weatherService) {
    weatherService = new WeatherService();
  }
  return weatherService;
}

export default WeatherService;
