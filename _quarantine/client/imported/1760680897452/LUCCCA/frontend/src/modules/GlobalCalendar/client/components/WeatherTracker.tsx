import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  Zap,
  Wind,
  Thermometer,
  Droplets,
  Eye,
  Navigation,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Satellite,
  Activity
} from "lucide-react";

interface WeatherTrackerProps {
  children: React.ReactNode;
}

interface WeatherData {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    visibility: number;
    uvIndex: number;
    icon: string;
  };
  alerts: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    expires: Date;
  }>;
  radar: {
    precipitation: Array<{
      time: Date;
      intensity: number;
      type: string;
    }>;
    storms: Array<{
      id: string;
      center: { lat: number; lon: number };
      direction: number;
      speed: number;
      intensity: string;
      category: string;
    }>;
  };
  forecast: Array<{
    time: Date;
    temperature: number;
    condition: string;
    precipitation: number;
    icon: string;
  }>;
}

export default function WeatherTracker({ children }: WeatherTrackerProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get user's location
  const getUserLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude });
        fetchWeatherData(latitude, longitude);
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setLoading(false);
        // Fallback to demo location (New York)
        setLocation({ lat: 40.7128, lon: -74.0060 });
        fetchWeatherData(40.7128, -74.0060);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Fetch weather data (mock implementation for demo)
  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate realistic mock data
      const mockData: WeatherData = {
        location: {
          name: "Current Location",
          lat,
          lon
        },
        current: {
          temperature: Math.round(15 + Math.random() * 20),
          condition: ["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Heavy Rain"][Math.floor(Math.random() * 5)],
          humidity: Math.round(40 + Math.random() * 40),
          windSpeed: Math.round(5 + Math.random() * 20),
          windDirection: Math.round(Math.random() * 360),
          pressure: Math.round(1000 + Math.random() * 40),
          visibility: Math.round(5 + Math.random() * 15),
          uvIndex: Math.round(Math.random() * 10),
          icon: ["☀️", "⛅", "☁️", "🌦️", "🌧️"][Math.floor(Math.random() * 5)]
        },
        alerts: [
          {
            type: "storm",
            severity: "moderate",
            title: "Thunderstorm Watch",
            description: "Severe thunderstorms possible in your area. Monitor conditions closely.",
            expires: new Date(Date.now() + 6 * 60 * 60 * 1000)
          }
        ],
        radar: {
          precipitation: Array.from({ length: 12 }, (_, i) => ({
            time: new Date(Date.now() + i * 10 * 60 * 1000),
            intensity: Math.random() * 100,
            type: Math.random() > 0.7 ? "heavy" : Math.random() > 0.4 ? "moderate" : "light"
          })),
          storms: [
            {
              id: "storm_001",
              center: { lat: lat + 0.2, lon: lon - 0.1 },
              direction: 225, // SW
              speed: 25,
              intensity: "moderate",
              category: "thunderstorm"
            },
            {
              id: "storm_002", 
              center: { lat: lat - 0.1, lon: lon + 0.15 },
              direction: 180, // S
              speed: 15,
              intensity: "light",
              category: "rain"
            }
          ]
        },
        forecast: Array.from({ length: 24 }, (_, i) => ({
          time: new Date(Date.now() + i * 60 * 60 * 1000),
          temperature: Math.round(15 + Math.random() * 20 + Math.sin(i * Math.PI / 12) * 5),
          condition: ["Clear", "Partly Cloudy", "Cloudy", "Rain"][Math.floor(Math.random() * 4)],
          precipitation: Math.round(Math.random() * 100),
          icon: ["☀️", "⛅", "☁️", "🌧️"][Math.floor(Math.random() * 4)]
        }))
      };

      setWeatherData(mockData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && location) {
      interval = setInterval(() => {
        fetchWeatherData(location.lat, location.lon);
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, location]);

  // Initialize on component mount
  useEffect(() => {
    getUserLocation();
  }, []);

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "clear": case "sunny": return <Sun className="h-8 w-8 text-yellow-500" />;
      case "partly cloudy": return <Cloud className="h-8 w-8 text-gray-400" />;
      case "cloudy": case "overcast": return <Cloud className="h-8 w-8 text-gray-600" />;
      case "light rain": case "rain": return <CloudRain className="h-8 w-8 text-blue-500" />;
      case "heavy rain": case "thunderstorm": return <Zap className="h-8 w-8 text-purple-500" />;
      case "snow": return <CloudSnow className="h-8 w-8 text-blue-200" />;
      default: return <Sun className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "extreme": return "border-red-500 bg-red-50 text-red-700";
      case "severe": return "border-orange-500 bg-orange-50 text-orange-700";
      case "moderate": return "border-yellow-500 bg-yellow-50 text-yellow-700";
      case "minor": return "border-blue-500 bg-blue-50 text-blue-700";
      default: return "border-gray-500 bg-gray-50 text-gray-700";
    }
  };

  const formatDirection = (degrees: number) => {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return directions[Math.round(degrees / 45) % 8];
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Real-time Weather Tracker</span>
              {lastUpdate && (
                <Badge variant="outline" className="text-xs">
                  Updated {lastUpdate.toLocaleTimeString()}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => location && fetchWeatherData(location.lat, location.lon)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Satellite className="h-4 w-4 mr-1" />
                {autoRefresh ? "Live" : "Manual"}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {loading && !weatherData && (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Getting your location and weather data...</span>
          </div>
        )}

        {weatherData && (
          <div className="space-y-4">
            {/* Current Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Current Conditions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    {getWeatherIcon(weatherData.current.condition)}
                    <div>
                      <div className="text-3xl font-bold">{weatherData.current.temperature}°C</div>
                      <div className="text-sm text-muted-foreground">{weatherData.current.condition}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Droplets className="h-3 w-3" />
                      <span>{weatherData.current.humidity}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Wind className="h-3 w-3" />
                      <span>{weatherData.current.windSpeed} km/h {formatDirection(weatherData.current.windDirection)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Thermometer className="h-3 w-3" />
                      <span>{weatherData.current.pressure} hPa</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{weatherData.current.visibility} km</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Storm Tracking</CardTitle>
                  <CardDescription>Active storms in your area</CardDescription>
                </CardHeader>
                <CardContent>
                  {weatherData.radar.storms.length > 0 ? (
                    <div className="space-y-3">
                      {weatherData.radar.storms.map((storm) => (
                        <div key={storm.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{storm.category}</span>
                            <Badge variant={storm.intensity === "severe" ? "destructive" : "secondary"}>
                              {storm.intensity}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center space-x-1">
                              <Navigation className="h-3 w-3" />
                              <span>Moving {formatDirection(storm.direction)} at {storm.speed} km/h</span>
                            </div>
                            <div>Distance: ~{Math.round(Math.sqrt(
                              Math.pow((storm.center.lat - (location?.lat || 0)) * 111, 2) +
                              Math.pow((storm.center.lon - (location?.lon || 0)) * 111, 2)
                            ))} km</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <Satellite className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No active storms detected</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weather Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  {weatherData.alerts.length > 0 ? (
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {weatherData.alerts.map((alert, index) => (
                          <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm mt-1">{alert.description}</p>
                            <div className="text-xs mt-2">
                              Expires: {alert.expires.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No active weather alerts</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Precipitation Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Precipitation Forecast (Next 2 Hours)</CardTitle>
                <CardDescription>Real-time precipitation tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weatherData.radar.precipitation.slice(0, 12).map((precip, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-16 text-sm">{precip.time.toLocaleTimeString().slice(0, 5)}</div>
                      <div className="flex-1">
                        <Progress value={precip.intensity} className="h-2" />
                      </div>
                      <div className="w-16 text-sm capitalize">{precip.type}</div>
                      <div className="w-12 text-sm">{Math.round(precip.intensity)}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hourly Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>24-Hour Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex space-x-4 pb-2">
                    {weatherData.forecast.slice(0, 12).map((hour, index) => (
                      <div key={index} className="flex flex-col items-center space-y-2 min-w-20">
                        <div className="text-xs text-muted-foreground">
                          {hour.time.toLocaleTimeString().slice(0, 5)}
                        </div>
                        <div className="text-2xl">{hour.icon}</div>
                        <div className="text-sm font-medium">{hour.temperature}°</div>
                        <div className="text-xs text-center">{hour.condition}</div>
                        <div className="text-xs text-blue-500">{hour.precipitation}%</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
