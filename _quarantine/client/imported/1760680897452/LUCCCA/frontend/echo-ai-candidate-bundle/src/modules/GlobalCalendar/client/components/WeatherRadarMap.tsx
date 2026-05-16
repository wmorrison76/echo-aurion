import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MapPin,
  Activity,
  Clock,
  Layers,
  Satellite,
  CloudRain,
  Zap,
  Wind,
  AlertTriangle,
  RefreshCw,
  Bell,
  Calendar,
  Users,
  Building2
} from "lucide-react";
import { EventLocationInfo, getMultipleEventLocations, convertToRadarFormat, formatAddress } from "@/lib/event-location-utils";
import { weatherNotificationService, EventWeatherAlert } from "@/lib/weather-notification-service";
import WeatherNotificationPopup from "./WeatherNotificationPopup";
import { Event } from "../../shared/beo-reo-types";

interface WeatherRadarMapProps {
  children: React.ReactNode;
}

interface RadarFrame {
  timestamp: Date;
  precipitationData: Array<{
    lat: number;
    lng: number;
    intensity: number;
    type: 'light' | 'moderate' | 'heavy' | 'severe';
  }>;
  storms: Array<{
    id: string;
    center: { lat: number; lng: number };
    radius: number;
    intensity: 'light' | 'moderate' | 'severe';
    movement: { direction: number; speed: number };
    category: string;
  }>;
}

export default function WeatherRadarMap({ children }: WeatherRadarMapProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [zoom, setZoom] = useState(6);
  const [center, setCenter] = useState({ lat: 28.5, lng: -82.0 }); // Florida center
  const [selectedLayer, setSelectedLayer] = useState<'precipitation' | 'temperature' | 'pressure'>('precipitation');
  const [timeRange, setTimeRange] = useState<'past' | 'current' | 'forecast'>('current');
  const [loading, setLoading] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [eventLocations, setEventLocations] = useState<EventLocationInfo[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<EventWeatherAlert[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<EventWeatherAlert | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(null);

  // Generate realistic radar frames with proper weather systems
  const generateRadarFrames = (): RadarFrame[] => {
    const frames: RadarFrame[] = [];
    const now = new Date();

    // Generate 24 frames (past 2 hours: 12 frames, forecast 2 hours: 12 frames)
    for (let i = -12; i <= 12; i++) {
      const timestamp = new Date(now.getTime() + i * 10 * 60 * 1000); // 10-minute intervals

      const precipitationData = [];
      const storms = [];

      // Major storm system moving from west to east
      const mainStormLat = 29.5 + (i * 0.01); // Slow northward movement
      const mainStormLng = -85.0 + (i * 0.08); // Moving east across Florida

      if (mainStormLng < -79.0) { // Storm visible while over/near Florida
        storms.push({
          id: 'main_storm',
          center: { lat: mainStormLat, lng: mainStormLng },
          radius: 80 + Math.sin(i * 0.5) * 10,
          intensity: Math.abs(i) < 3 ? 'severe' : Math.abs(i) < 6 ? 'moderate' : 'light',
          movement: { direction: 75, speed: 35 },
          category: 'Severe Thunderstorm'
        });

        // Dense precipitation around main storm (spiral pattern)
        for (let j = 0; j < 500; j++) {
          const angle = (j * 0.3) + (i * 0.1);
          const spiralRadius = (j * 0.003) + Math.random() * 0.8;
          const lat = mainStormLat + Math.cos(angle) * spiralRadius;
          const lng = mainStormLng + Math.sin(angle) * spiralRadius;

          if (lat >= 24.0 && lat <= 31.0 && lng >= -87.5 && lng <= -79.0) {
            const distanceFromCenter = Math.sqrt(Math.pow(lat - mainStormLat, 2) + Math.pow(lng - mainStormLng, 2));
            let intensity = Math.max(0, 90 - (distanceFromCenter * 100));
            intensity += Math.random() * 20 - 10; // Add some variation

            precipitationData.push({
              lat,
              lng,
              intensity: Math.max(0, Math.min(100, intensity)),
              type: intensity > 70 ? 'heavy' : intensity > 40 ? 'moderate' : 'light'
            });
          }
        }
      }

      // Secondary storm in the Gulf
      const gulfStormLat = 26.0 + (i * 0.02);
      const gulfStormLng = -84.5 + (i * 0.03);

      if (Math.abs(i) <= 8) {
        storms.push({
          id: 'gulf_storm',
          center: { lat: gulfStormLat, lng: gulfStormLng },
          radius: 60,
          intensity: 'moderate',
          movement: { direction: 45, speed: 20 },
          category: 'Thunderstorm Complex'
        });

        // Precipitation around gulf storm
        for (let j = 0; j < 200; j++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 0.8;
          const lat = gulfStormLat + Math.cos(angle) * distance;
          const lng = gulfStormLng + Math.sin(angle) * distance;

          precipitationData.push({
            lat,
            lng,
            intensity: Math.random() * 60 + 20,
            type: Math.random() > 0.6 ? 'moderate' : 'light'
          });
        }
      }

      // Scattered showers across the region
      for (let k = 0; k < 300; k++) {
        const lat = 24.0 + Math.random() * 7.0; // Florida extent
        const lng = -87.5 + Math.random() * 8.5;

        // Create clusters of precipitation
        const clusterCenterLat = 26.5 + Math.sin(k * 0.1) * 2;
        const clusterCenterLng = -82.0 + Math.cos(k * 0.15) * 3;

        if (Math.random() > 0.7) { // 30% chance for scattered showers
          const offsetLat = (Math.random() - 0.5) * 1.0;
          const offsetLng = (Math.random() - 0.5) * 1.0;

          precipitationData.push({
            lat: clusterCenterLat + offsetLat,
            lng: clusterCenterLng + offsetLng,
            intensity: Math.random() * 40 + 10,
            type: Math.random() > 0.8 ? 'moderate' : 'light'
          });
        }
      }

      // Cold front line (for certain frames)
      if (i >= -6 && i <= 6) {
        const frontLng = -86.0 + (i * 0.15);
        for (let frontLat = 24.0; frontLat <= 31.0; frontLat += 0.1) {
          if (Math.random() > 0.3) {
            precipitationData.push({
              lat: frontLat + (Math.random() - 0.5) * 0.2,
              lng: frontLng + (Math.random() - 0.5) * 0.3,
              intensity: Math.random() * 50 + 30,
              type: Math.random() > 0.5 ? 'moderate' : 'light'
            });
          }
        }
      }

      frames.push({
        timestamp,
        precipitationData,
        storms
      });
    }

    return frames;
  };

  const [radarFrames] = useState<RadarFrame[]>(generateRadarFrames);

  // Load event locations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEventLocations();
      setupWeatherNotifications();
    }
  }, [isOpen]);

  // Subscribe to weather notifications
  useEffect(() => {
    const unsubscribe = weatherNotificationService.subscribe((alert: EventWeatherAlert) => {
      setWeatherAlerts(prev => {
        const existing = prev.find(a => a.id === alert.id);
        if (existing) {
          return prev.map(a => a.id === alert.id ? alert : a);
        }
        return [...prev, alert];
      });

      // Show notification popup for new high-severity alerts
      if ((alert.severity === 'high' || alert.severity === 'critical') && !alert.acknowledged) {
        setSelectedAlert(alert);
        setShowNotificationPopup(true);
      }
    });

    return unsubscribe;
  }, []);

  const loadEventLocations = async () => {
    try {
      // Get sample events (in production, this would fetch from database)
      const sampleEvents = getSampleEvents();
      const locations = await getMultipleEventLocations(sampleEvents);
      setEventLocations(locations);
    } catch (error) {
      console.error('Error loading event locations:', error);
    }
  };

  const setupWeatherNotifications = async () => {
    try {
      const sampleEvents = getSampleEvents();
      await weatherNotificationService.addEventsToMonitoring(sampleEvents);

      // Load existing alerts
      const existingAlerts = weatherNotificationService.getActiveAlerts();
      setWeatherAlerts(existingAlerts);
    } catch (error) {
      console.error('Error setting up weather notifications:', error);
    }
  };

  const getSampleEvents = (): Event[] => {
    const now = new Date();
    return [
      {
        id: '1',
        account_id: 'acc_1',
        name: 'Corporate Leadership Summit',
        status: 'definite',
        start_at: new Date(now.getTime() + 15 * 60 * 60 * 1000),
        end_at: new Date(now.getTime() + 23 * 60 * 60 * 1000),
        timezone: 'America/New_York',
        expected_guests: 250,
        manager_id: 'mgr_1',
        currency: 'USD',
        weather_plan: {
          id: 'wp_1',
          event_id: '1',
          primary_plan: 'hybrid',
          backup_plans: [],
          weather_triggers: [],
          decision_timeline: [],
          last_forecast_check: now
        },
        functions: [],
        line_items: []
      },
      {
        id: '2',
        account_id: 'acc_2',
        name: 'Tech Innovation Conference',
        status: 'definite',
        start_at: new Date(now.getTime() + 36 * 60 * 60 * 1000),
        end_at: new Date(now.getTime() + 42 * 60 * 60 * 1000),
        timezone: 'America/New_York',
        expected_guests: 180,
        manager_id: 'mgr_2',
        currency: 'USD',
        weather_plan: {
          id: 'wp_2',
          event_id: '2',
          primary_plan: 'indoor',
          backup_plans: [],
          weather_triggers: [],
          decision_timeline: [],
          last_forecast_check: now
        },
        functions: [],
        line_items: []
      },
      {
        id: '3',
        account_id: 'acc_3',
        name: 'Wedding Reception',
        status: 'definite',
        start_at: new Date(now.getTime() + 60 * 60 * 60 * 1000),
        end_at: new Date(now.getTime() + 66 * 60 * 60 * 1000),
        timezone: 'America/New_York',
        expected_guests: 120,
        manager_id: 'mgr_3',
        currency: 'USD',
        weather_plan: {
          id: 'wp_3',
          event_id: '3',
          primary_plan: 'outdoor',
          backup_plans: [],
          weather_triggers: [],
          decision_timeline: [],
          last_forecast_check: now
        },
        functions: [],
        line_items: []
      }
    ];
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % radarFrames.length);
      }, 500); // 500ms per frame
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, radarFrames.length]);

  const currentRadarFrame = radarFrames[currentFrame];

  const handleTimeSliderChange = (value: number[]) => {
    setCurrentFrame(value[0]);
    setIsPlaying(false);
  };

  const getIntensityColor = (intensity: number): string => {
    // Colors matching real doppler radar
    if (intensity > 90) return '#8B0000'; // Dark red - extreme
    if (intensity > 80) return '#DC143C'; // Crimson - severe
    if (intensity > 70) return '#FF4500'; // Orange red - heavy
    if (intensity > 60) return '#FF6347'; // Tomato - heavy moderate
    if (intensity > 50) return '#FFA500'; // Orange - moderate
    if (intensity > 40) return '#FFD700'; // Gold - light moderate
    if (intensity > 30) return '#FFFF00'; // Yellow - light
    if (intensity > 20) return '#32CD32'; // Lime green - very light
    if (intensity > 10) return '#00FA9A'; // Medium spring green - trace
    return '#40E0D0'; // Turquoise - very light trace
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getCurrentStormInfo = () => {
    if (!currentRadarFrame?.storms.length) return null;
    const storm = currentRadarFrame.storms[0];
    return {
      name: storm.category,
      location: `${storm.center.lat.toFixed(1)}°N, ${Math.abs(storm.center.lng).toFixed(1)}°W`,
      intensity: storm.intensity,
      movement: `${storm.movement.direction}° at ${storm.movement.speed} km/h`,
      threat: storm.intensity === 'severe' ? 'HIGH' : storm.intensity === 'moderate' ? 'MODERATE' : 'LOW'
    };
  };

  const stormInfo = getCurrentStormInfo();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div onClick={() => setIsOpen(true)}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Live Weather Radar & Storm Tracking</span>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {stormInfo?.threat || 'MONITORING'}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {weatherAlerts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => setShowNotificationPopup(true)}
                >
                  <Bell className="h-4 w-4 mr-1 animate-pulse" />
                  {weatherAlerts.length} Alert{weatherAlerts.length > 1 ? 's' : ''}
                </Button>
              )}
              <Badge variant="outline">
                {formatTime(currentRadarFrame?.timestamp || new Date())}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => setLoading(!loading)}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map Controls */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={selectedLayer === 'precipitation' ? 'default' : 'outline'}
                  onClick={() => setSelectedLayer('precipitation')}
                >
                  <CloudRain className="h-4 w-4 mr-1" />
                  Precipitation
                </Button>
                <Button
                  size="sm"
                  variant={selectedLayer === 'temperature' ? 'default' : 'outline'}
                  onClick={() => setSelectedLayer('temperature')}
                >
                  <Satellite className="h-4 w-4 mr-1" />
                  Temperature
                </Button>
                <Button
                  size="sm"
                  variant={selectedLayer === 'pressure' ? 'default' : 'outline'}
                  onClick={() => setSelectedLayer('pressure')}
                >
                  <Layers className="h-4 w-4 mr-1" />
                  Pressure
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  size="sm"
                  variant={showEvents ? 'default' : 'outline'}
                  onClick={() => setShowEvents(!showEvents)}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Events ({eventLocations.length})
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => setZoom(Math.max(4, zoom - 1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">Zoom: {zoom}</span>
              <Button size="sm" variant="outline" onClick={() => setZoom(Math.min(12, zoom + 1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Radar Map */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Interactive Weather Radar</span>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Florida Region</span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div
                    ref={mapRef}
                    className="relative w-full h-96 bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden rounded-b-lg"
                    style={{
                      backgroundImage: `radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
                                       radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                                       radial-gradient(circle at 40% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`
                    }}
                  >
                    {/* Geographic Base Layer */}
                    <div className="absolute inset-0">
                      {/* Florida State */}
                      <div className="absolute" style={{ left: '65%', top: '35%', width: '140px', height: '200px' }}>
                        <svg viewBox="0 0 100 120" className="w-full h-full opacity-40">
                          <path d="M20 10 L80 15 L85 25 L90 40 L88 55 L85 70 L80 85 L70 95 L60 100 L50 105 L40 110 L30 115 L25 110 L20 100 L15 85 L12 70 L10 55 L12 40 L15 25 Z"
                                fill="none" stroke="rgba(156, 163, 175, 0.8)" strokeWidth="1.5"/>
                          {/* Keys */}
                          <circle cx="45" cy="115" r="8" fill="none" stroke="rgba(156, 163, 175, 0.6)" strokeWidth="1"/>
                          <circle cx="35" cy="118" r="4" fill="none" stroke="rgba(156, 163, 175, 0.6)" strokeWidth="1"/>
                        </svg>
                      </div>

                      {/* Georgia */}
                      <div className="absolute border border-gray-500 opacity-30" style={{ left: '60%', top: '5%', width: '100px', height: '80px', borderRadius: '20px 20px 0 0' }} />

                      {/* Alabama */}
                      <div className="absolute border border-gray-500 opacity-30" style={{ left: '45%', top: '8%', width: '80px', height: '120px', borderRadius: '10px' }} />

                      {/* Gulf of Mexico */}
                      <div className="absolute" style={{ left: '20%', top: '60%', width: '200px', height: '100px' }}>
                        <div className="w-full h-full bg-blue-900 opacity-20 rounded-full"></div>
                        <div className="absolute inset-0 text-blue-300 opacity-50 text-xs flex items-center justify-center font-semibold">Gulf of Mexico</div>
                      </div>

                      {/* Atlantic Ocean */}
                      <div className="absolute" style={{ left: '80%', top: '30%', width: '150px', height: '200px' }}>
                        <div className="w-full h-full bg-blue-900 opacity-20 rounded-l-full"></div>
                        <div className="absolute inset-0 text-blue-300 opacity-50 text-xs flex items-center justify-center font-semibold rotate-90">Atlantic</div>
                      </div>

                      {/* Major Cities */}
                      <div className="absolute text-gray-300 text-xs font-semibold" style={{ left: '68%', top: '25%' }}>Jacksonville</div>
                      <div className="absolute text-gray-300 text-xs font-semibold" style={{ left: '60%', top: '45%' }}>Orlando</div>
                      <div className="absolute text-gray-300 text-xs font-semibold" style={{ left: '50%', top: '60%' }}>Tampa</div>
                      <div className="absolute text-gray-300 text-xs font-semibold" style={{ left: '75%', top: '85%' }}>Miami</div>

                      {/* Coordinate Grid */}
                      <div className="absolute inset-0 opacity-20">
                        {[...Array(8)].map((_, i) => (
                          <div key={`h-${i}`} className="absolute w-full h-px bg-gray-400" style={{ top: `${(i + 1) * 12.5}%` }} />
                        ))}
                        {[...Array(10)].map((_, i) => (
                          <div key={`v-${i}`} className="absolute h-full w-px bg-gray-400" style={{ left: `${(i + 1) * 10}%` }} />
                        ))}
                      </div>
                    </div>

                    {/* Precipitation Layer */}
                    {selectedLayer === 'precipitation' && currentRadarFrame?.precipitationData.map((point, index) => {
                      // Convert lat/lng to screen coordinates for Florida region
                      // Florida bounds: lat 24-31, lng -87.5 to -79.5
                      const x = ((point.lng + 87.5) / 8.0) * 100;
                      const y = ((31.0 - point.lat) / 7.0) * 100;

                      // Skip points outside visible area
                      if (x < 0 || x > 100 || y < 0 || y > 100) return null;

                      const size = Math.max(1, Math.min(8, point.intensity / 15));
                      const opacity = Math.max(0.3, Math.min(0.9, point.intensity / 100));

                      return (
                        <div
                          key={index}
                          className="absolute"
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            width: `${size}px`,
                            height: `${size}px`,
                            backgroundColor: getIntensityColor(point.intensity),
                            transform: 'translate(-50%, -50%)',
                            borderRadius: point.intensity > 50 ? '50%' : '2px',
                            opacity: opacity,
                            filter: point.intensity > 70 ? 'blur(0.5px)' : 'none',
                            boxShadow: point.intensity > 80 ? `0 0 ${size/2}px ${getIntensityColor(point.intensity)}` : 'none'
                          }}
                        />
                      );
                    })}

                    {/* Storm Centers */}
                    {currentRadarFrame?.storms.map((storm, index) => {
                      // Convert lat/lng to screen coordinates for Florida region
                      const x = ((storm.center.lng + 87.5) / 8.0) * 100;
                      const y = ((31.0 - storm.center.lat) / 7.0) * 100;

                      // Skip storms outside visible area
                      if (x < -10 || x > 110 || y < -10 || y > 110) return null;

                      const stormSize = storm.intensity === 'severe' ? 12 : storm.intensity === 'moderate' ? 10 : 8;
                      const radiusSize = Math.min(100, storm.radius * 0.8); // Scale radius appropriately

                      return (
                        <div key={storm.id} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                          {/* Storm eye */}
                          <div className={`relative rounded-full border-4 ${
                            storm.intensity === 'severe' ? 'border-red-500 bg-red-200 shadow-lg shadow-red-500/50' :
                            storm.intensity === 'moderate' ? 'border-orange-500 bg-orange-200 shadow-lg shadow-orange-500/50' :
                            'border-yellow-500 bg-yellow-200 shadow-lg shadow-yellow-500/50'
                          } animate-pulse`}
                          style={{ width: `${stormSize}px`, height: `${stormSize}px` }}>
                            <Zap className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                              storm.intensity === 'severe' ? 'h-5 w-5 text-red-700' :
                              storm.intensity === 'moderate' ? 'h-4 w-4 text-orange-700' :
                              'h-3 w-3 text-yellow-700'
                            }`} />
                          </div>

                          {/* Movement vector */}
                          <div
                            className={`absolute top-1/2 left-1/2 h-0.5 origin-left ${
                              storm.intensity === 'severe' ? 'bg-red-600' :
                              storm.intensity === 'moderate' ? 'bg-orange-600' :
                              'bg-yellow-600'
                            }`}
                            style={{
                              width: `${Math.min(30, storm.movement.speed)}px`,
                              transform: `translate(-50%, -50%) rotate(${storm.movement.direction}deg)`
                            }}
                          >
                            <div className={`absolute right-0 top-1/2 w-0 h-0 transform -translate-y-1/2 ${
                              storm.intensity === 'severe' ? 'border-l-2 border-t-1 border-b-1 border-red-600' :
                              storm.intensity === 'moderate' ? 'border-l-2 border-t-1 border-b-1 border-orange-600' :
                              'border-l-2 border-t-1 border-b-1 border-yellow-600'
                            }`} />
                          </div>

                          {/* Storm radius */}
                          <div
                            className={`absolute top-1/2 left-1/2 rounded-full border-2 border-dashed opacity-20 ${
                              storm.intensity === 'severe' ? 'border-red-400' :
                              storm.intensity === 'moderate' ? 'border-orange-400' :
                              'border-yellow-400'
                            }`}
                            style={{
                              width: `${radiusSize}px`,
                              height: `${radiusSize}px`,
                              transform: 'translate(-50%, -50%)'
                            }}
                          />

                          {/* Storm label */}
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-white bg-black bg-opacity-60 px-2 py-1 rounded whitespace-nowrap">
                            {storm.category}
                          </div>
                        </div>
                      );
                    })}

                    {/* Event Location Markers */}
                    {showEvents && eventLocations.map((eventLocation, index) => {
                      const radarCoords = convertToRadarFormat(eventLocation.location);
                      // Convert lat/lng to screen coordinates for Florida region
                      const x = ((radarCoords.lng + 87.5) / 8.0) * 100;
                      const y = ((31.0 - radarCoords.lat) / 7.0) * 100;

                      // Skip events outside visible area
                      if (x < -5 || x > 105 || y < -5 || y > 105) return null;

                      // Check if this event has any weather alerts
                      const hasAlert = weatherAlerts.some(alert => alert.event.id === eventLocation.event.id);
                      const alertSeverity = hasAlert ? weatherAlerts.find(alert => alert.event.id === eventLocation.event.id)?.severity : null;

                      return (
                        <div key={eventLocation.event.id} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                          {/* Event marker */}
                          <div className={`relative rounded-lg border-2 p-2 shadow-lg cursor-pointer transition-all hover:scale-110 ${
                            hasAlert
                              ? alertSeverity === 'critical' ? 'border-red-500 bg-red-100' :
                                alertSeverity === 'high' ? 'border-orange-500 bg-orange-100' :
                                alertSeverity === 'medium' ? 'border-yellow-500 bg-yellow-100' :
                                'border-blue-500 bg-blue-100'
                              : 'border-primary bg-primary/10 hover:bg-primary/20'
                          }`}
                          onClick={() => {
                            if (hasAlert) {
                              setSelectedAlert(weatherAlerts.find(alert => alert.event.id === eventLocation.event.id) || null);
                              setShowNotificationPopup(true);
                            }
                          }}
                          >
                            {hasAlert && (
                              <div className="absolute -top-1 -right-1">
                                <AlertTriangle className={`h-4 w-4 animate-pulse ${
                                  alertSeverity === 'critical' ? 'text-red-600' :
                                  alertSeverity === 'high' ? 'text-orange-600' :
                                  alertSeverity === 'medium' ? 'text-yellow-600' :
                                  'text-blue-600'
                                }`} />
                              </div>
                            )}

                            <Building2 className={`h-4 w-4 ${
                              hasAlert
                                ? alertSeverity === 'critical' ? 'text-red-700' :
                                  alertSeverity === 'high' ? 'text-orange-700' :
                                  alertSeverity === 'medium' ? 'text-yellow-700' :
                                  'text-blue-700'
                                : 'text-primary'
                            }`} />
                          </div>

                          {/* Event tooltip */}
                          <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="font-semibold">{eventLocation.event.name}</div>
                            <div className="text-gray-300">{eventLocation.venue?.name}</div>
                            <div className="text-gray-400">{eventLocation.event.expected_guests} guests</div>
                            <div className="text-gray-400">
                              {eventLocation.event.start_at.toLocaleDateString()} {eventLocation.event.start_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {hasAlert && (
                              <div className={`mt-1 font-medium ${
                                alertSeverity === 'critical' ? 'text-red-300' :
                                alertSeverity === 'high' ? 'text-orange-300' :
                                alertSeverity === 'medium' ? 'text-yellow-300' :
                                'text-blue-300'
                              }`}>
                                ⚠️ Weather Alert: {alertSeverity?.toUpperCase()}
                              </div>
                            )}
                            <div className="text-gray-400 mt-1">
                              📍 {formatAddress(eventLocation.address)}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Location marker - Tampa Bay area */}
                    <div className="absolute" style={{ left: '50%', top: '60%', transform: 'translate(-50%, -50%)' }}>
                      <div className="relative">
                        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                        <div className="absolute w-6 h-6 bg-blue-500 rounded-full opacity-30 animate-ping" style={{ top: '-6px', left: '-6px' }}></div>
                        <MapPin className="h-6 w-6 text-blue-400 drop-shadow-lg absolute -top-7 -left-3" />
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-blue-900 bg-opacity-80 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          Tampa Bay
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Controls */}
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Radar Timeline</span>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setCurrentFrame(0)}>
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={isPlaying ? "default" : "outline"}
                          onClick={() => setIsPlaying(!isPlaying)}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setCurrentFrame(radarFrames.length - 1)}>
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setCurrentFrame(12)}>
                          <Clock className="h-4 w-4" />
                          Now
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Slider
                        value={[currentFrame]}
                        onValueChange={handleTimeSliderChange}
                        max={radarFrames.length - 1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>2 hrs ago</span>
                        <span>Current</span>
                        <span>2 hrs forecast</span>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {formatTime(currentRadarFrame?.timestamp || new Date())}
                        {currentFrame < 12 && " (Past)"}
                        {currentFrame === 12 && " (Now)"}
                        {currentFrame > 12 && " (Forecast)"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Storm Info Panel */}
            <div className="space-y-4">
              {/* Current Storm Info */}
              {stormInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>Active Storm</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <p className="font-medium">{stormInfo.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Location:</span>
                      <p className="font-medium text-sm">{stormInfo.location}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Movement:</span>
                      <p className="font-medium text-sm">{stormInfo.movement}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Threat Level:</span>
                      <Badge className={
                        stormInfo.threat === 'HIGH' ? 'bg-red-500' :
                        stormInfo.threat === 'MODERATE' ? 'bg-orange-500' : 'bg-yellow-500'
                      }>
                        {stormInfo.threat}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legend */}
              <Card>
                <CardHeader>
                  <CardTitle>Precipitation Legend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { color: '#40E0D0', label: 'Trace', dbz: '< 10 dBZ' },
                      { color: '#00FA9A', label: 'Light', dbz: '10-20 dBZ' },
                      { color: '#32CD32', label: 'Light-Mod', dbz: '20-30 dBZ' },
                      { color: '#FFFF00', label: 'Moderate', dbz: '30-40 dBZ' },
                      { color: '#FFA500', label: 'Heavy', dbz: '40-50 dBZ' },
                      { color: '#FF4500', label: 'Very Heavy', dbz: '50-60 dBZ' },
                      { color: '#DC143C', label: 'Severe', dbz: '60+ dBZ' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded border border-gray-600"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          <div className="text-xs text-muted-foreground">{item.dbz}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Time Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Frame:</span>
                      <span>{currentFrame + 1} of {radarFrames.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span>
                        {currentFrame < 12 ? 'Historical' : currentFrame === 12 ? 'Current' : 'Forecast'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Weather Notification Popup */}
      <WeatherNotificationPopup
        isOpen={showNotificationPopup}
        onClose={() => {
          setShowNotificationPopup(false);
          setSelectedAlert(null);
        }}
        alert={selectedAlert || undefined}
      />
    </Dialog>
  );
}
