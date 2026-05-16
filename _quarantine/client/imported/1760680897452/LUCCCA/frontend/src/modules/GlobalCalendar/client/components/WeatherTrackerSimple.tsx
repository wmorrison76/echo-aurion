import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CloudRain,
  Sun,
  Wind,
  Thermometer,
  RefreshCw,
  MapPin,
  Activity,
  AlertTriangle
} from "lucide-react";

interface WeatherTrackerSimpleProps {
  children: React.ReactNode;
}

export default function WeatherTrackerSimple({ children }: WeatherTrackerSimpleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock weather data
  const mockWeatherData = {
    location: "Current Location",
    temperature: 22,
    condition: "Partly Cloudy",
    humidity: 65,
    windSpeed: 12,
    alerts: [
      {
        title: "Thunderstorm Watch",
        severity: "moderate",
        description: "Possible severe weather in your area"
      }
    ],
    storms: [
      {
        name: "Storm System A",
        distance: "25 km NE",
        intensity: "Moderate",
        direction: "Moving SW at 15 km/h"
      }
    ]
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div onClick={() => setIsOpen(true)}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Real-time Weather Tracker</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

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
                  <Sun className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="text-3xl font-bold">{mockWeatherData.temperature}°C</div>
                    <div className="text-sm text-muted-foreground">{mockWeatherData.condition}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Wind className="h-3 w-3" />
                    <span>{mockWeatherData.windSpeed} km/h</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Thermometer className="h-3 w-3" />
                    <span>{mockWeatherData.humidity}% humidity</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storm Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockWeatherData.storms.map((storm, index) => (
                    <div key={index} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{storm.name}</span>
                        <Badge variant="secondary">{storm.intensity}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Distance: {storm.distance}</div>
                        <div>{storm.direction}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weather Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockWeatherData.alerts.map((alert, index) => (
                    <div key={index} className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900">{alert.title}</h4>
                          <p className="text-sm text-yellow-700 mt-1">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Weather Tracker Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Real-time Tracking:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Live storm movement and intensity</li>
                    <li>• Location-based weather alerts</li>
                    <li>• Precipitation radar updates</li>
                    <li>• Wind speed and direction</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Event Planning:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Weather impact assessments</li>
                    <li>• Venue recommendations</li>
                    <li>• Guest comfort alerts</li>
                    <li>• Equipment protection warnings</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button onClick={handleRefresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
