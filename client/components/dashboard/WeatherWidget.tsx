import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Cloud,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  ChevronRight,
  Settings,
  X,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
    hourly?: Array<{
      time: string;
      temp: number;
      condition: string;
      icon: string;
      humidity: number;
      windSpeed: number;
      precipitation?: number;
    }>;
  }>;
  location: string;
}

interface WeatherWidgetProps {
  restaurantAddress?: string;
  expanded?: boolean;
  compact?: boolean;
  forecastDays?: number;
}

const getWeatherIcon = (condition: string) => {
  const lower = condition.toLowerCase();
  if (lower.includes("rain")) return <CloudRain size={32} />;
  if (lower.includes("cloud")) return <Cloud size={32} />;
  if (lower.includes("clear") || lower.includes("sunny"))
    return <Sun size={32} />;
  return <Cloud size={32} />;
};

export function WeatherWidget({
  restaurantAddress = "Fort Lauderdale, FL",
  expanded = false,
  compact = false,
  forecastDays = 4,
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showSettings, setShowSettings] = useState(false);
  const [showHourlyForecast, setShowHourlyForecast] = useState(false);
  const [selectedForecastDay, setSelectedForecastDay] = useState<
    WeatherData["forecast"][0] | null
  >(null);
  const [zipCode, setZipCode] = useState<string>("33316");
  const [tempZipCode, setTempZipCode] = useState<string>("33316");
  const [countryCode, setCountryCode] = useState<string>("US");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const errorNotifiedRef = useRef(false);

  // Load saved ZIP code from localStorage on mount
  useEffect(() => {
    const savedZipCode = localStorage.getItem("weather-zip-code");
    const savedCountryCode = localStorage.getItem("weather-country-code");

    if (savedZipCode) {
      setZipCode(savedZipCode);
      setTempZipCode(savedZipCode);
    }
    if (savedCountryCode) {
      setCountryCode(savedCountryCode);
    }
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        errorNotifiedRef.current = false; // Reset error notification on each fetch

        // Use backend endpoint to fetch real weather data from OpenWeatherMap
        // The backend endpoint now uses ZIP code instead of city ID
        // Send client's current timestamp and timezone offset to ensure accuracy
        const now = new Date();
        const clientTime = now.getTime();
        const timezoneOffset = now.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
        const response = await fetch(
          `/api/weather?zipCode=${zipCode}&countryCode=${countryCode}&clientTime=${clientTime}&tzOffset=${timezoneOffset}`,
        );

        if (!response.ok) {
          // Try to parse error details from response
          let errorMessage = "Failed to fetch weather data";
          let shouldShowToast = false;
          let isFallback = false;
          try {
            const errorData = await response.json();
            if (errorData.fallback) {
              // Fallback data available, don't show error
              shouldShowToast = false;
              isFallback = true;
              console.warn(
                "[WeatherWidget] Using fallback weather data from server",
              );
            } else if (errorData.message) {
              errorMessage = errorData.message;
              shouldShowToast = true;
            } else if (errorData.error) {
              errorMessage = errorData.error;
              shouldShowToast = true;
            }
          } catch {
            // Response is not JSON, use status text
            errorMessage = `Weather service error (${response.status}): ${response.statusText}`;
            shouldShowToast = true;
          }

          if (response.status === 404) {
            isFallback = true;
            shouldShowToast = false;
          }

          if (shouldShowToast) {
            console.error("Weather API error:", errorMessage);
            setError(errorMessage);
          }

          // Show error toast only once and for actual errors (not fallback)
          if (!errorNotifiedRef.current && shouldShowToast && !isFallback) {
            errorNotifiedRef.current = true;
            toast({
              title: "Weather Update Failed",
              description: errorMessage,
              variant: "destructive",
            });
          }

          // Fallback to mock data if API fails
          const generateHourlyForecast = (
            temp: number,
            condition: string,
            icon: string,
          ) => {
            const hours = [];
            for (let i = 0; i < 24; i += 3) {
              const date = new Date();
              date.setHours(i);
              hours.push({
                time: date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }),
                temp: temp + Math.floor(Math.random() * 10 - 5),
                condition,
                icon,
                humidity: 65 + Math.floor(Math.random() * 20 - 10),
                windSpeed: 10 + Math.floor(Math.random() * 5),
                precipitation: Math.floor(Math.random() * 30),
              });
            }
            return hours;
          };

          setWeather({
            current: {
              temp: 72,
              condition: "Partly Cloudy",
              icon: "⛅",
              humidity: 65,
              windSpeed: 10,
              feelsLike: 70,
            },
            forecast: [
              {
                date: "Today",
                high: 75,
                low: 62,
                condition: "Partly Cloudy",
                icon: "⛅",
                hourly: generateHourlyForecast(72, "Partly Cloudy", "⛅"),
              },
              {
                date: "Tomorrow",
                high: 78,
                low: 65,
                condition: "Sunny",
                icon: "☀️",
                hourly: generateHourlyForecast(76, "Sunny", "☀️"),
              },
              {
                date: "Wed",
                high: 72,
                low: 60,
                condition: "Rainy",
                icon: "🌧️",
                hourly: generateHourlyForecast(68, "Rainy", "🌧���"),
              },
              {
                date: "Thu",
                high: 70,
                low: 58,
                condition: "Cloudy",
                icon: "☁️",
                hourly: generateHourlyForecast(66, "Cloudy", "☁️"),
              },
              {
                date: "Fri",
                high: 76,
                low: 64,
                condition: "Sunny",
                icon: "☀️",
                hourly: generateHourlyForecast(74, "Sunny", "☀️"),
              },
            ],
            location: restaurantAddress,
          });
          return;
        }

        const weatherData = (await response.json()) as WeatherData;
        setWeather(weatherData);
        setError(null);
        errorNotifiedRef.current = false;
      } catch {
        setError(null);

        // Don't show toast for network errors - just use fallback data silently
        // Fallback to mock data if network error
        const generateHourlyForecast = (
          temp: number,
          condition: string,
          icon: string,
        ) => {
          const hours = [];
          for (let i = 0; i < 24; i += 3) {
            const date = new Date();
            date.setHours(i);
            hours.push({
              time: date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              temp: temp + Math.floor(Math.random() * 10 - 5),
              condition,
              icon,
              humidity: 65 + Math.floor(Math.random() * 20 - 10),
              windSpeed: 10 + Math.floor(Math.random() * 5),
              precipitation: Math.floor(Math.random() * 30),
            });
          }
          return hours;
        };

        setWeather({
          current: {
            temp: 72,
            condition: "Partly Cloudy",
            icon: "⛅",
            humidity: 65,
            windSpeed: 10,
            feelsLike: 70,
          },
          forecast: [
            {
              date: "Today",
              high: 75,
              low: 62,
              condition: "Partly Cloudy",
              icon: "⛅",
              hourly: generateHourlyForecast(72, "Partly Cloudy", "⛅"),
            },
            {
              date: "Tomorrow",
              high: 78,
              low: 65,
              condition: "Sunny",
              icon: "☀️",
              hourly: generateHourlyForecast(76, "Sunny", "☀️"),
            },
            {
              date: "Wed",
              high: 72,
              low: 60,
              condition: "Rainy",
              icon: "🌧️",
              hourly: generateHourlyForecast(68, "Rainy", "🌧️"),
            },
            {
              date: "Thu",
              high: 70,
              low: 58,
              condition: "Cloudy",
              icon: "☁️",
              hourly: generateHourlyForecast(66, "Cloudy", "☁️"),
            },
            {
              date: "Fri",
              high: 76,
              low: 64,
              condition: "Sunny",
              icon: "☀️",
              hourly: generateHourlyForecast(74, "Sunny", "☀️"),
            },
          ],
          location: restaurantAddress,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh weather every 30 minutes
    const interval = setInterval(() => {
      errorNotifiedRef.current = false; // Reset error notification on each refresh
      fetchWeather();
    }, 1800000);
    return () => clearInterval(interval);
  }, [zipCode, countryCode, restaurantAddress, toast]);

  const handleSaveZipCode = () => {
    if (tempZipCode.trim()) {
      setZipCode(tempZipCode);
      localStorage.setItem("weather-zip-code", tempZipCode);
      localStorage.setItem("weather-country-code", countryCode);
      setShowSettings(false);
    }
  };

  if (loading || !weather) {
    return (
      <div className="p-3 text-center text-foreground/50 text-xs">
        Loading weather...
      </div>
    );
  }

  // Compact idiogram view
  if (compact) {
    return (
      <>
        {/* Hourly Forecast Popout - 12 Hours */}
        {showHourlyForecast &&
          selectedForecastDay?.hourly &&
          selectedForecastDay.hourly.length > 0 &&
          createPortal(
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 pointer-events-none bg-black/40">
              <div className="pointer-events-auto relative bg-background border border-border/40 rounded-lg shadow-2xl p-4 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Close Button */}
                <button
                  onClick={() => setShowHourlyForecast(false)}
                  className="absolute top-3 right-3 p-1 hover:bg-foreground/10 rounded transition-colors"
                  type="button"
                >
                  <X size={18} />
                </button>

                {/* 12-Hour Forecast Display */}
                <div className="space-y-3 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedForecastDay.date} - 12 Hour Forecast
                  </h3>

                  {/* Scrollable Hours Grid */}
                  <div className="overflow-y-auto flex-1 pr-2 min-h-0">
                    <div className="grid grid-cols-1 gap-2">
                      {selectedForecastDay.hourly
                        .slice(0, 12)
                        .map((hour, index) => (
                          <div
                            key={`${hour.time}-${index}`}
                            className="bg-background/50 border border-border/20 rounded p-3 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-4">
                              {/* Time and Weather */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="text-2xl flex-shrink-0">
                                  {hour.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-foreground text-sm">
                                    {hour.time}
                                  </div>
                                  <div className="text-xs text-foreground/60 truncate">
                                    {hour.condition}
                                  </div>
                                </div>
                              </div>

                              {/* Temperature */}
                              <div className="text-2xl font-bold text-foreground flex-shrink-0">
                                {Math.round(hour.temp)}°F
                              </div>

                              {/* Details */}
                              <div className="flex items-center gap-3 text-xs text-foreground/70 flex-shrink-0">
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <Droplets size={12} />
                                  {hour.humidity}%
                                </div>
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <Wind size={12} />
                                  {Math.round(hour.windSpeed)}mph
                                </div>
                              </div>
                            </div>

                            {/* Precipitation if present */}
                            {hour.precipitation !== undefined &&
                              hour.precipitation > 0 && (
                                <div className="text-xs text-foreground/60 mt-2 pl-8">
                                  💧 {hour.precipitation}% chance of rain
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}

        <div className="flex items-center gap-1">
          {weather.forecast.slice(0, forecastDays).map((day) => (
            <button
              key={day.date}
              onClick={() => {
                setSelectedForecastDay(day);
                setShowHourlyForecast(true);
              }}
              className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-primary/10 transition-colors cursor-pointer group"
              title={`${day.date}: ${day.high}°/${day.low}°`}
            >
              <div className="text-lg group-hover:scale-110 transition-transform">
                {day.icon}
              </div>
              <div className="text-xs font-medium text-foreground/80 group-hover:text-foreground">
                {day.date}
              </div>
              <div className="text-xs text-foreground/60">{day.high}°</div>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Customize Weather Location</DialogTitle>
            <DialogDescription>
              Enter your ZIP code to get weather for your location
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                ZIP Code
              </label>
              <Input
                type="text"
                placeholder="Enter ZIP code (e.g., 33316)"
                value={tempZipCode}
                onChange={(e) => setTempZipCode(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Country Code
              </label>
              <Input
                type="text"
                placeholder="US, CA, GB, etc."
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                maxLength={2}
                className="mt-1"
              />
              <p className="text-xs text-foreground/50 mt-1">
                2-letter country code (e.g., US, CA, FR)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveZipCode}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Save
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Current Weather - Compact */}
      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-400/20 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground/60 mb-1 truncate">
              {weather.location}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-lg">{weather.current.icon}</div>
              <div className="flex flex-col">
                <div className="text-lg font-bold text-foreground">
                  {Math.round(weather.current.temp)}°F
                </div>
                <div className="text-xs text-foreground/70">
                  {weather.current.condition}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1 text-foreground/70">
                <Droplets size={12} />
                <span>{weather.current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1 text-foreground/70">
                <Wind size={12} />
                <span>{weather.current.windSpeed}mph</span>
              </div>
            </div>
          </div>

          {/* Settings & Toggle Buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 hover:bg-primary/10 rounded transition-colors flex-shrink-0"
              title="Customize location"
            >
              <Settings
                size={16}
                className="text-foreground/60 hover:text-foreground"
              />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-primary/10 rounded transition-colors flex-shrink-0"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <ChevronRight
                size={16}
                className={cn(
                  "transition-transform text-foreground/60",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Hourly Forecast Popout - 12 Hours */}
      {showHourlyForecast &&
        selectedForecastDay?.hourly &&
        selectedForecastDay.hourly.length > 0 &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 pointer-events-none bg-black/40">
            <div className="pointer-events-auto relative bg-background border border-border/40 rounded-lg shadow-2xl p-4 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              {/* Close Button */}
              <button
                onClick={() => setShowHourlyForecast(false)}
                className="absolute top-3 right-3 p-1 hover:bg-foreground/10 rounded transition-colors"
                type="button"
              >
                <X size={18} />
              </button>

              {/* 12-Hour Forecast Display */}
              <div className="space-y-3 flex flex-col flex-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedForecastDay.date} - 12 Hour Forecast
                </h3>

                {/* Scrollable Hours Grid */}
                <div className="overflow-y-auto flex-1 pr-2 min-h-0">
                  <div className="grid grid-cols-1 gap-2">
                    {selectedForecastDay.hourly
                      .slice(0, 12)
                      .map((hour, index) => (
                        <div
                          key={`${hour.time}-${index}`}
                          className="bg-background/50 border border-border/20 rounded p-3 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            {/* Time and Weather */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="text-2xl flex-shrink-0">
                                {hour.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-foreground text-sm">
                                  {hour.time}
                                </div>
                                <div className="text-xs text-foreground/60 truncate">
                                  {hour.condition}
                                </div>
                              </div>
                            </div>

                            {/* Temperature */}
                            <div className="text-2xl font-bold text-foreground flex-shrink-0">
                              {Math.round(hour.temp)}°F
                            </div>

                            {/* Details */}
                            <div className="flex items-center gap-3 text-xs text-foreground/70 flex-shrink-0">
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <Droplets size={12} />
                                {hour.humidity}%
                              </div>
                              <div className="flex items-center gap-1 whitespace-nowrap">
                                <Wind size={12} />
                                {Math.round(hour.windSpeed)}mph
                              </div>
                            </div>
                          </div>

                          {/* Precipitation if present */}
                          {hour.precipitation !== undefined &&
                            hour.precipitation > 0 && (
                              <div className="text-xs text-foreground/60 mt-2 pl-8">
                                💧 {hour.precipitation}% chance of rain
                              </div>
                            )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Forecast - Expanded */}
      {isExpanded && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-foreground/70 px-1">
            7-Day Forecast
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {weather.forecast.slice(0, 7).map((day) => (
              <button
                key={day.date}
                onClick={() => {
                  setSelectedForecastDay(day);
                  setShowHourlyForecast(true);
                }}
                className="bg-background/60 border border-border/30 hover:border-primary/50 hover:bg-background/80 rounded p-0.5 text-center text-xs space-y-0.5 transition-colors cursor-pointer group"
              >
                <div className="font-medium text-foreground/80 text-xs group-hover:text-foreground">
                  {day.date}
                </div>
                <div className="text-sm group-hover:scale-110 transition-transform inline-block">
                  {day.icon}
                </div>
                <div className="flex justify-center gap-0.5">
                  <span className="font-semibold text-foreground text-xs">
                    {day.high}°
                  </span>
                  <span className="text-foreground/60 text-xs">{day.low}°</span>
                </div>
              </button>
            ))}
          </div>

          {/* Details */}
          <div className="bg-background/40 border border-border/20 rounded p-1.5 text-xs space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-foreground/70">Feels Like</span>
              <span className="font-semibold text-foreground">
                {weather.current.feelsLike}°F
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foreground/70">Humidity</span>
              <span className="font-semibold text-foreground">
                {weather.current.humidity}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foreground/70">Wind Speed</span>
              <span className="font-semibold text-foreground">
                {weather.current.windSpeed} mph
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
