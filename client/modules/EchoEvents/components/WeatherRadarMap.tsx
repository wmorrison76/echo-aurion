/**
 * Weather Radar Map — REAL data only (iter265).
 *
 * Sources:
 *  · Iowa State Mesonet WMS  → NOAA NEXRAD base reflectivity (5-min composite)
 *      https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi
 *      Free, no key, time-aware (?TIME=ISO8601 returns archived frame).
 *  · NWS Alerts API          → real storm/wind/severe-thunderstorm warnings
 *      https://api.weather.gov/alerts/active?point={lat},{lon}
 *      Free, no key. Polygons rendered as fill layer.
 *  · Tomorrow.io (optional)  → precipitation enrichment if VITE_TOMORROW_IO_KEY set.
 *
 * No `generateRadarFrames`, no fake spiral storms, no SVG-painted Florida.
 * If a source is down, the panel says so — we never fabricate.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  MapPin,
  Activity,
  RefreshCw,
  AlertTriangle,
  Bell,
  Calendar,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  EventLocationInfo,
  getMultipleEventLocations,
  formatAddress,
} from "@/lib/event-location-utils";
import {
  weatherNotificationService,
  EventWeatherAlert,
} from "@/lib/weather-notification-service";
import WeatherNotificationPopup from "./WeatherNotificationPopup";
import { Event } from "../../shared/beo-reo-types";
import {
  getLatestWeatherLocation,
  subscribeWeatherLocation,
  type WeatherLocationSnapshot,
} from "@/lib/weather-location-channel";

interface WeatherRadarMapProps {
  children: React.ReactNode;
}

// NOAA Alerts API response (subset we use)
interface NwsAlert {
  id: string;
  properties: {
    id: string;
    event: string;
    severity: "Minor" | "Moderate" | "Severe" | "Extreme" | "Unknown";
    headline: string;
    description: string;
    effective: string;
    expires: string;
    areaDesc: string;
  };
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
}

const NEXRAD_WMS = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi";
const NEXRAD_LAYER = "nexrad-n0r-wmst";
const NWS_ALERTS = "https://api.weather.gov/alerts/active";
const FRAME_INTERVAL_MIN = 5; // Iowa State archive updates every 5 min
const FRAME_COUNT = 13; // 60 min of history (12 past + 1 current)

const PRECIP_SOURCE_ID = "nexrad-radar";
const ALERTS_SOURCE_ID = "nws-alerts";
const EVENT_SOURCE_ID = "event-locations";

function isoMinutesAgo(min: number): string {
  // NEXRAD archive snaps to 5-min boundaries
  const d = new Date(Date.now() - min * 60 * 1000);
  const m = d.getUTCMinutes();
  const snapped = m - (m % FRAME_INTERVAL_MIN);
  d.setUTCMinutes(snapped, 0, 0);
  return d.toISOString();
}

function buildFrameTimes(): string[] {
  // 12 frames back to now, 5-min steps
  const times: string[] = [];
  for (let i = (FRAME_COUNT - 1) * FRAME_INTERVAL_MIN; i >= 0; i -= FRAME_INTERVAL_MIN) {
    times.push(isoMinutesAgo(i));
  }
  return times;
}

function severityToColor(sev: NwsAlert["properties"]["severity"]): string {
  switch (sev) {
    case "Extreme":
      return "#dc2626";
    case "Severe":
      return "#ea580c";
    case "Moderate":
      return "#f59e0b";
    case "Minor":
      return "#eab308";
    default:
      return "#94a3b8";
  }
}

function alertsToGeoJSON(
  alerts: NwsAlert[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, { color: string; event: string; severity: string; headline: string }> {
  return {
    type: "FeatureCollection",
    features: alerts
      .filter((a) => a.geometry)
      .map((a) => ({
        type: "Feature",
        id: a.properties.id,
        geometry: a.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
        properties: {
          color: severityToColor(a.properties.severity),
          event: a.properties.event,
          severity: a.properties.severity,
          headline: a.properties.headline,
        },
      })),
  };
}

function eventsToGeoJSON(
  events: EventLocationInfo[],
): GeoJSON.FeatureCollection<GeoJSON.Point, { name: string }> {
  return {
    type: "FeatureCollection",
    features: events.map(({ event, location, address }, index) => ({
      type: "Feature",
      id: `event-${event.id ?? index}`,
      geometry: { type: "Point", coordinates: [location.longitude, location.latitude] },
      properties: { name: event.name ?? formatAddress(address) },
    })),
  };
}

export default function WeatherRadarMap({ children }: WeatherRadarMapProps) {
  const initialLocation = getLatestWeatherLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(FRAME_COUNT - 1); // start at "now"
  const [center, setCenter] = useState(() =>
    initialLocation
      ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
      : { lat: 28.5, lng: -82.0 },
  );
  const [zoom, setZoom] = useState(() => (initialLocation ? 8 : 6));
  const [activeLocation, setActiveLocation] = useState<WeatherLocationSnapshot | null>(
    initialLocation,
  );
  const [alerts, setAlerts] = useState<NwsAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [eventLocations, setEventLocations] = useState<EventLocationInfo[]>([]);
  const [showEvents, setShowEvents] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState<EventWeatherAlert[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<EventWeatherAlert | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const frameTimes = useMemo(() => buildFrameTimes(), []);
  const activeFrameTime = frameTimes[currentFrame] ?? frameTimes[frameTimes.length - 1];

  const MAP_STYLE_URL =
    import.meta.env.VITE_MAP_STYLE_URL ?? "https://demotiles.maplibre.org/style.json";
  const TOMORROW_KEY = import.meta.env.VITE_TOMORROW_IO_KEY as string | undefined;

  // ─── Subscribe to weather-location channel ───
  useEffect(() => subscribeWeatherLocation((loc) => setActiveLocation(loc)), []);

  useEffect(() => {
    if (!activeLocation) return;
    setCenter({ lat: activeLocation.latitude, lng: activeLocation.longitude });
  }, [activeLocation]);

  // ─── Fetch real NWS alerts whenever location changes / dialog opens ───
  const fetchAlerts = useCallback(async (lat: number, lng: number) => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const res = await fetch(
        `${NWS_ALERTS}?point=${lat.toFixed(4)},${lng.toFixed(4)}`,
        { headers: { Accept: "application/geo+json" } },
      );
      if (!res.ok) throw new Error(`NWS ${res.status}`);
      const data = await res.json();
      setAlerts((data.features ?? []) as NwsAlert[]);
    } catch (e: any) {
      setAlertsError(e?.message ?? "Failed to load NWS alerts");
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchAlerts(center.lat, center.lng);
    const id = setInterval(() => fetchAlerts(center.lat, center.lng), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [isOpen, center.lat, center.lng, fetchAlerts]);

  // ─── Map init ───
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.resize();
      return;
    }

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl({ showZoom: true }), "top-right");

    map.on("load", () => {
      // NEXRAD radar — raster WMS
      map.addSource(PRECIP_SOURCE_ID, {
        type: "raster",
        tiles: [
          `${NEXRAD_WMS}?service=WMS&request=GetMap&version=1.1.1&layers=${NEXRAD_LAYER}` +
            `&styles=&format=image/png&transparent=true&srs=EPSG:3857` +
            `&bbox={bbox-epsg-3857}&width=256&height=256&TIME=${activeFrameTime}`,
        ],
        tileSize: 256,
        attribution: "NOAA NEXRAD via Iowa State Mesonet",
      });
      map.addLayer({
        id: "nexrad-radar-layer",
        type: "raster",
        source: PRECIP_SOURCE_ID,
        paint: { "raster-opacity": 0.7 },
      });

      // Optional Tomorrow.io overlay (only if key provided)
      if (TOMORROW_KEY) {
        map.addSource("tomorrow-precip", {
          type: "raster",
          tiles: [
            `https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/precipitationIntensity/now.png?apikey=${TOMORROW_KEY}`,
          ],
          tileSize: 256,
          attribution: "Tomorrow.io",
        });
        map.addLayer({
          id: "tomorrow-precip-layer",
          type: "raster",
          source: "tomorrow-precip",
          paint: { "raster-opacity": 0.45 },
        });
      }

      // NWS alert polygons
      map.addSource(ALERTS_SOURCE_ID, {
        type: "geojson",
        data: alertsToGeoJSON(alerts),
      });
      map.addLayer({
        id: "nws-alerts-fill",
        type: "fill",
        source: ALERTS_SOURCE_ID,
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.25,
        },
      });
      map.addLayer({
        id: "nws-alerts-line",
        type: "line",
        source: ALERTS_SOURCE_ID,
        paint: {
          "line-color": ["get", "color"],
          "line-width": 2,
        },
      });

      // Event locations
      map.addSource(EVENT_SOURCE_ID, {
        type: "geojson",
        data: eventsToGeoJSON([]),
      });
      map.addLayer({
        id: "event-locations-pt",
        type: "circle",
        source: EVENT_SOURCE_ID,
        paint: {
          "circle-radius": 8,
          "circle-color": "#38bdf8",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "event-locations-label",
        type: "symbol",
        source: EVENT_SOURCE_ID,
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, 1.2],
          "text-size": 11,
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#f8fafc",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.4,
        },
      });

      // Click on alert polygon to surface details
      map.on("click", "nws-alerts-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, string>;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-family:system-ui;max-width:260px"><strong style="color:${props.color}">${props.event}</strong><br><span style="font-size:11px;opacity:0.7">${props.severity}</span><br><span style="font-size:12px">${props.headline}</span></div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "nws-alerts-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "nws-alerts-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
      setZoom(Number(map.getZoom().toFixed(2)));
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [isOpen]);

  // ─── Swap NEXRAD tiles when frame changes (timeline scrubbing) ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getSource(PRECIP_SOURCE_ID)) return;

    // Force tile re-fetch by removing+re-adding source with new TIME
    if (map.getLayer("nexrad-radar-layer")) map.removeLayer("nexrad-radar-layer");
    if (map.getSource(PRECIP_SOURCE_ID)) map.removeSource(PRECIP_SOURCE_ID);
    map.addSource(PRECIP_SOURCE_ID, {
      type: "raster",
      tiles: [
        `${NEXRAD_WMS}?service=WMS&request=GetMap&version=1.1.1&layers=${NEXRAD_LAYER}` +
          `&styles=&format=image/png&transparent=true&srs=EPSG:3857` +
          `&bbox={bbox-epsg-3857}&width=256&height=256&TIME=${activeFrameTime}`,
      ],
      tileSize: 256,
      attribution: "NOAA NEXRAD via Iowa State Mesonet",
    });
    map.addLayer({
      id: "nexrad-radar-layer",
      type: "raster",
      source: PRECIP_SOURCE_ID,
      paint: { "raster-opacity": 0.7 },
    });
  }, [activeFrameTime]);

  // ─── Update alert source when fetched ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource(ALERTS_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(alertsToGeoJSON(alerts) as any);
  }, [alerts]);

  // ─── Update events source when toggled / fetched ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource(EVENT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(eventsToGeoJSON(showEvents ? eventLocations : []) as any);
  }, [eventLocations, showEvents]);

  // ─── Active-location marker ───
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeLocation) return;
    const lngLat: [number, number] = [activeLocation.longitude, activeLocation.latitude];

    const place = () => {
      if (!markerRef.current) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:16px;height:16px;border-radius:9999px;background:#38bdf8;border:2px solid #fff;box-shadow:0 0 12px rgba(56,189,248,0.6);";
        markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      } else {
        markerRef.current.setLngLat(lngLat);
      }
      map.flyTo({ center: lngLat, zoom: Math.max(map.getZoom(), 7), essential: true });
    };
    if (map.isStyleLoaded()) place();
    else map.once("load", place);
  }, [activeLocation]);

  // ─── Event locations + notifications ───
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const sampleEvents = getSampleEvents();
        const locs = await getMultipleEventLocations(sampleEvents);
        setEventLocations(locs);
        await weatherNotificationService.addEventsToMonitoring(sampleEvents);
        setWeatherAlerts(weatherNotificationService.getActiveAlerts());
      } catch (e) {
        console.error("event locations error", e);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    return weatherNotificationService.subscribe((alert: EventWeatherAlert) => {
      setWeatherAlerts((prev) => {
        const existing = prev.find((a) => a.id === alert.id);
        return existing ? prev.map((a) => (a.id === alert.id ? alert : a)) : [...prev, alert];
      });
      if ((alert.severity === "high" || alert.severity === "critical") && !alert.acknowledged) {
        setSelectedAlert(alert);
        setShowNotificationPopup(true);
      }
    });
  }, []);

  // ─── Timeline animation ───
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setCurrentFrame((p) => (p + 1) % FRAME_COUNT);
      }, 800);
    } else if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [isPlaying]);

  const topAlert = alerts[0];
  const frameDate = new Date(activeFrameTime);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div onClick={() => setIsOpen(true)} data-testid="weather-radar-open">
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>Live Weather Radar · NOAA NEXRAD</span>
              <Badge
                variant="outline"
                className={
                  topAlert
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }
                data-testid="radar-status-badge"
              >
                {topAlert ? topAlert.properties.severity.toUpperCase() : "CLEAR"}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {weatherAlerts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                  onClick={() => setShowNotificationPopup(true)}
                  data-testid="weather-alerts-button"
                >
                  <Bell className="h-4 w-4 mr-1 animate-pulse" />
                  {weatherAlerts.length} Alert{weatherAlerts.length > 1 ? "s" : ""}
                </Button>
              )}
              {activeLocation && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 border-sky-200 text-sky-700"
                >
                  <MapPin className="h-3 w-3" />
                  {activeLocation.label ??
                    `${activeLocation.latitude.toFixed(2)}, ${activeLocation.longitude.toFixed(2)}`}
                </Badge>
              )}
              <Badge variant="outline" data-testid="radar-frame-time">
                {frameDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchAlerts(center.lat, center.lng)}
                data-testid="radar-refresh-btn"
              >
                <RefreshCw className={`h-4 w-4 ${alertsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between bg-surface dark:bg-gray-900 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={showEvents ? "default" : "outline"}
                onClick={() => setShowEvents(!showEvents)}
                data-testid="toggle-events-btn"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Events ({eventLocations.length})
              </Button>
              {!TOMORROW_KEY && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Tomorrow.io overlay disabled (set VITE_TOMORROW_IO_KEY)
                </Badge>
              )}
              {alertsError && (
                <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                  NWS Alerts: {alertsError}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Sources: NOAA NEXRAD · NWS · {TOMORROW_KEY ? "Tomorrow.io · " : ""}OpenStreetMap
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Map */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Interactive Weather Radar</span>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">
                        {center.lat.toFixed(2)}°, {center.lng.toFixed(2)}°
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div
                    ref={mapRef}
                    className="relative w-full h-96 overflow-hidden rounded-b-lg"
                    data-testid="weather-radar-map"
                  />
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="mt-4">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Radar Timeline · 1-hour history (5-min steps)
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentFrame(0)}
                          data-testid="radar-skip-back"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={isPlaying ? "default" : "outline"}
                          onClick={() => setIsPlaying(!isPlaying)}
                          data-testid="radar-play-btn"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentFrame(FRAME_COUNT - 1)}
                          data-testid="radar-skip-forward"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentFrame(FRAME_COUNT - 1)}
                          data-testid="radar-now-btn"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Now
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[currentFrame]}
                      onValueChange={(v) => {
                        setCurrentFrame(v[0]);
                        setIsPlaying(false);
                      }}
                      max={FRAME_COUNT - 1}
                      step={1}
                      className="w-full"
                      data-testid="radar-timeline-slider"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>60 min ago</span>
                      <span>30 min ago</span>
                      <span>Now</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: alerts list */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>NWS Active Alerts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent
                  className="space-y-3 max-h-96 overflow-y-auto"
                  data-testid="nws-alerts-list"
                >
                  {alertsLoading && (
                    <p className="text-sm text-muted-foreground">Loading alerts…</p>
                  )}
                  {!alertsLoading && alerts.length === 0 && !alertsError && (
                    <p className="text-sm text-muted-foreground">
                      No active alerts at this location.
                    </p>
                  )}
                  {alerts.map((a) => (
                    <div
                      key={a.properties.id}
                      className="border-l-4 pl-3 py-1 text-sm"
                      style={{ borderColor: severityToColor(a.properties.severity) }}
                    >
                      <p className="font-semibold">{a.properties.event}</p>
                      <p
                        className="text-xs"
                        style={{ color: severityToColor(a.properties.severity) }}
                      >
                        {a.properties.severity}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
                        {a.properties.headline}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {a.properties.areaDesc}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reflectivity Legend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {[
                      { color: "#08F", label: "Light", dbz: "5-20 dBZ" },
                      { color: "#0F0", label: "Moderate", dbz: "20-35 dBZ" },
                      { color: "#FF0", label: "Heavy", dbz: "35-45 dBZ" },
                      { color: "#F80", label: "Very Heavy", dbz: "45-55 dBZ" },
                      { color: "#F00", label: "Severe", dbz: "55+ dBZ" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center space-x-2">
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
            </div>
          </div>
        </div>
      </DialogContent>

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

// ─── Helpers ───
function getSampleEvents(): Event[] {
  // TODO: wire to real events API. Until then, an empty list — no fake events.
  return [];
}
