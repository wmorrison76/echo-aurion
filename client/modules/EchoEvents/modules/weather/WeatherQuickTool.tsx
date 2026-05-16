import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Compass,
  Droplets,
  Gauge,
  Loader2,
  MapPin,
  RefreshCw,
  Sunrise,
  Sunset,
  Sun,
  Umbrella,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentGeoLocation } from "@/hooks/useCurrentGeoLocation";
import { Input } from "@/components/ui/input";
import {
  type EventWindow,
  type ForecastDay,
  type HourlySnapshot,
  type WeatherForecast,
  type WeatherHistory,
  type WeatherHistoryRequestPayload,
} from "@shared/weather/types";
import { useWeatherForecast } from "./useWeatherForecast";
import { useWeatherHistory } from "./useWeatherHistory";
import { WeatherHistoryPanel } from "./WeatherHistoryPanel";
import { publishWeatherLocation } from "@/lib/weather-location-channel";
export interface WeatherQuickToolProps {
  mode?: "quick" | "decision";
  locationLabel?: string;
  address?: string;
  postalCode?: string;
  country?: string;
  eventStartISO?: string;
  eventEndISO?: string;
  autoRefreshMs?: number;
  windGustLimit?: number;
  rainProbLimit?: number;
  useDeviceLocation?: boolean;
  fallbackAddress?: string;
  fallbackPostalCode?: string;
  fallbackCountry?: string;
  fallbackLocationLabel?: string;
  historyDays?: number;
}
type WeatherTone = "default" | "caution" | "danger";
type RiskLevel = "low" | "moderate" | "high";
type DecisionAssessment = {
  riskLevel: RiskLevel;
  recommendation: string;
  maxPrecip: number;
  maxWindGust: number;
  rainStart: HourlySnapshot | null;
  peakGustHour: HourlySnapshot | null;
  windowHours: HourlySnapshot[];
};
type WeatherCodeDescriptor = {
  label: string;
  description: string;
  icon: LucideIcon;
  tone: WeatherTone;
};
const WEATHER_CODE_DETAILS: Record<number, WeatherCodeDescriptor> = {
  0: { label: "Clear", description: "Clear skies", icon: Sun, tone: "default" },
  1: {
    label: "Mostly Clear",
    description: "Mostly clear",
    icon: CloudSun,
    tone: "default",
  },
  2: {
    label: "Partly Cloudy",
    description: "Partly cloudy",
    icon: CloudSun,
    tone: "default",
  },
  3: {
    label: "Overcast",
    description: "Overcast",
    icon: Cloud,
    tone: "default",
  },
  45: { label: "Fog", description: "Foggy", icon: CloudFog, tone: "caution" },
  48: {
    label: "Dense Fog",
    description: "Dense fog",
    icon: CloudFog,
    tone: "caution",
  },
  51: {
    label: "Light Drizzle",
    description: "Light drizzle",
    icon: CloudDrizzle,
    tone: "default",
  },
  53: {
    label: "Drizzle",
    description: "Drizzle",
    icon: CloudDrizzle,
    tone: "default",
  },
  55: {
    label: "Heavy Drizzle",
    description: "Heavy drizzle",
    icon: CloudDrizzle,
    tone: "caution",
  },
  56: {
    label: "Freezing Drizzle",
    description: "Freezing drizzle",
    icon: CloudSnow,
    tone: "caution",
  },
  57: {
    label: "Freezing Drizzle",
    description: "Freezing drizzle",
    icon: CloudSnow,
    tone: "caution",
  },
  61: {
    label: "Light Rain",
    description: "Light rain",
    icon: CloudRain,
    tone: "default",
  },
  63: { label: "Rain", description: "Rain", icon: CloudRain, tone: "caution" },
  65: {
    label: "Heavy Rain",
    description: "Heavy rain",
    icon: CloudRain,
    tone: "danger",
  },
  66: {
    label: "Freezing Rain",
    description: "Freezing rain",
    icon: CloudSnow,
    tone: "danger",
  },
  67: {
    label: "Freezing Rain",
    description: "Freezing rain",
    icon: CloudSnow,
    tone: "danger",
  },
  71: {
    label: "Light Snow",
    description: "Light snow",
    icon: CloudSnow,
    tone: "default",
  },
  73: { label: "Snow", description: "Snow", icon: CloudSnow, tone: "caution" },
  75: {
    label: "Heavy Snow",
    description: "Heavy snow",
    icon: CloudSnow,
    tone: "danger",
  },
  77: {
    label: "Snow Grains",
    description: "Snow grains",
    icon: CloudSnow,
    tone: "caution",
  },
  80: {
    label: "Light Showers",
    description: "Light showers",
    icon: CloudRain,
    tone: "default",
  },
  81: {
    label: "Showers",
    description: "Showers",
    icon: CloudRain,
    tone: "caution",
  },
  82: {
    label: "Heavy Showers",
    description: "Heavy showers",
    icon: CloudRain,
    tone: "danger",
  },
  85: {
    label: "Snow Showers",
    description: "Snow showers",
    icon: CloudSnow,
    tone: "caution",
  },
  86: {
    label: "Heavy Snow Showers",
    description: "Heavy snow showers",
    icon: CloudSnow,
    tone: "danger",
  },
  95: {
    label: "Thunderstorm",
    description: "Thunderstorm",
    icon: CloudLightning,
    tone: "danger",
  },
  96: {
    label: "Thunderstorm",
    description: "Thunderstorm with hail",
    icon: CloudLightning,
    tone: "danger",
  },
  99: {
    label: "Thunderstorm",
    description: "Severe thunderstorm",
    icon: CloudLightning,
    tone: "danger",
  },
};
const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  high: "bg-red-500/15 text-red-400 border-red-500/30",
};
const RECOMMENDATION_ICONS: Record<RiskLevel, LucideIcon> = {
  low: Sun,
  moderate: Umbrella,
  high: AlertTriangle,
};
const PRECIP_COLORS: Record<WeatherTone, string> = {
  default: "text-blue-400",
  caution: "text-amber-400",
  danger: "text-red-400",
};
const HOUR_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const FULL_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});
export default function WeatherQuickTool({
  mode = "quick",
  locationLabel = "Event Location",
  address,
  postalCode,
  country = "US",
  eventStartISO,
  eventEndISO,
  autoRefreshMs,
  windGustLimit = 25,
  rainProbLimit = 50,
  useDeviceLocation = false,
  fallbackAddress,
  fallbackPostalCode,
  fallbackCountry,
  fallbackLocationLabel,
  historyDays = 90,
}: WeatherQuickToolProps) {
  const [selectedMode, setSelectedMode] = useState<
    "quick" | "decision" | "history"
  >(mode);
  const [manualMode, setManualMode] = useState(!useDeviceLocation);
  const [addressInput, setAddressInput] = useState(
    () => address ?? fallbackAddress ?? "",
  );
  useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);
  useEffect(() => {
    if (!manualMode) {
      setAddressInput(address ?? fallbackAddress ?? "");
    }
  }, [manualMode, address, fallbackAddress]);
  const {
    address: deviceAddress,
    postalCode: devicePostalCode,
    country: deviceCountry,
    label: deviceLabel,
    coords: deviceCoords,
    loading: deviceLoading,
    error: deviceError,
    refresh: refreshDeviceLocation,
  } = useCurrentGeoLocation({ enabled: useDeviceLocation });
  const resolvedAddress = useMemo(() => {
    if (useDeviceLocation) {
      if (deviceAddress) {
        return deviceAddress;
      }
      if (deviceError) {
        return fallbackAddress ?? address ?? null;
      }
      return address ?? fallbackAddress ?? null;
    }
    return address ?? null;
  }, [useDeviceLocation, deviceAddress, deviceError, fallbackAddress, address]);
  const resolvedPostalCode = useMemo(() => {
    if (useDeviceLocation) {
      if (devicePostalCode) {
        return devicePostalCode;
      }
      if (deviceError) {
        return fallbackPostalCode ?? postalCode ?? null;
      }
      return postalCode ?? fallbackPostalCode ?? null;
    }
    return postalCode ?? null;
  }, [
    useDeviceLocation,
    devicePostalCode,
    deviceError,
    fallbackPostalCode,
    postalCode,
  ]);
  const resolvedCountry = useMemo(() => {
    if (useDeviceLocation) {
      if (deviceCountry) {
        return deviceCountry;
      }
      if (deviceError) {
        return fallbackCountry ?? country ?? null;
      }
      return country ?? fallbackCountry ?? null;
    }
    return country ?? null;
  }, [useDeviceLocation, deviceCountry, deviceError, fallbackCountry, country]);
  const resolvedLabel = useMemo(() => {
    if (!manualMode) {
      if (useDeviceLocation) {
        if (deviceLabel) {
          return deviceLabel;
        }
        if (fallbackLocationLabel) {
          return fallbackLocationLabel;
        }
      }
      return locationLabel;
    }
    return addressInput.trim() || fallbackLocationLabel || locationLabel;
  }, [
    manualMode,
    useDeviceLocation,
    deviceLabel,
    fallbackLocationLabel,
    locationLabel,
    addressInput,
  ]);
  const shouldUseDevice = useDeviceLocation && !manualMode;
  const payload = useMemo(() => {
    const latitude = shouldUseDevice ? deviceCoords?.latitude : undefined;
    const longitude = shouldUseDevice ? deviceCoords?.longitude : undefined;
    const manualAddressReady = manualMode
      ? addressInput.trim().length > 0
      : true;
    if (!manualAddressReady && !shouldUseDevice) {
      return null;
    }
    if (!shouldUseDevice && !resolvedAddress && !manualAddressReady) {
      return null;
    }
    return {
      address: manualMode
        ? addressInput.trim() || undefined
        : (resolvedAddress ?? undefined),
      latitude,
      longitude,
      postalCode: resolvedPostalCode ?? undefined,
      country: resolvedCountry ?? undefined,
      eventStart: eventStartISO,
      eventEnd: eventEndISO,
    };
  }, [
    shouldUseDevice,
    deviceCoords,
    manualMode,
    addressInput,
    resolvedAddress,
    resolvedPostalCode,
    resolvedCountry,
    eventStartISO,
    eventEndISO,
  ]);
  const historyPayload = useMemo(() => {
    if (!payload) {
      return null;
    }
    return {
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      postalCode: payload.postalCode,
      country: payload.country,
      eventStart: payload.eventStart,
      eventEnd: payload.eventEnd,
      days: historyDays,
    } satisfies WeatherHistoryRequestPayload;
  }, [payload, historyDays]);
  const { forecast, loading, error, source, refresh } = useWeatherForecast(
    payload,
    { autoRefreshMs, enabled: Boolean(payload) },
  );
  const {
    history,
    loading: historyLoading,
    error: historyError,
    source: historySource,
    refresh: refreshHistory,
  } = useWeatherHistory(historyPayload, { enabled: Boolean(historyPayload) });
  const nextTwentyFourHours = useMemo<HourlySnapshot[]>(() => {
    if (!forecast) {
      return [];
    }
    const now = Date.now();
    return forecast.hourly
      .filter((point) => Date.parse(point.timestamp) >= now)
      .slice(0, 24);
  }, [forecast]);
  const decisionWindow = useMemo(() => {
    if (!forecast || !eventStartISO || !eventEndISO) {
      return [] as HourlySnapshot[];
    }
    const start = Date.parse(eventStartISO);
    const end = Date.parse(eventEndISO);
    return forecast.hourly.filter((point) => {
      const ts = Date.parse(point.timestamp);
      return ts >= start && ts <= end;
    });
  }, [forecast, eventStartISO, eventEndISO]);
  const decisionAssessment = useMemo<DecisionAssessment | null>(() => {
    if (!forecast || !eventStartISO || !eventEndISO) {
      return null;
    }
    const windowHours = decisionWindow;
    if (!windowHours.length) {
      return null;
    }
    const maxPrecip = windowHours.reduce(
      (max, point) => Math.max(max, point.precipitationProbability),
      0,
    );
    const maxWindGust = windowHours.reduce(
      (max, point) =>
        Math.max(max, point.windGustMph ?? point.windSpeedMph ?? 0),
      0,
    );
    const riskLevel = deriveRiskLevel(
      maxPrecip,
      maxWindGust,
      windGustLimit,
      rainProbLimit,
    );
    const rainStart =
      windowHours.find(
        (point) => point.precipitationProbability >= rainProbLimit,
      ) ?? null;
    const peakGustHour = windowHours.reduce<HourlySnapshot | null>(
      (peak, point) => {
        const gust = point.windGustMph ?? point.windSpeedMph ?? 0;
        if (!peak) {
          return point;
        }
        const currentPeak = peak.windGustMph ?? peak.windSpeedMph ?? 0;
        return gust > currentPeak ? point : peak;
      },
      null,
    );
    return {
      riskLevel,
      recommendation: buildRecommendation(riskLevel, maxPrecip, maxWindGust),
      maxPrecip,
      maxWindGust,
      rainStart,
      peakGustHour,
      windowHours,
    };
  }, [
    forecast,
    eventStartISO,
    eventEndISO,
    decisionWindow,
    rainProbLimit,
    windGustLimit,
  ]);
  const dailyOutlook = useMemo(() => forecast?.daily ?? [], [forecast]);
  const lastUpdated = forecast?.requestedAt
    ? new Date(forecast.requestedAt)
    : null;
  const descriptor = getWeatherDescriptor(
    Number(forecast?.current?.weatherCode ?? 0),
  );
  const locationDisplayLabel = forecast?.location?.label ?? resolvedLabel;
  useEffect(() => {
    if (!forecast) {
      return;
    }
    publishWeatherLocation({
      latitude: forecast.location.latitude,
      longitude: forecast.location.longitude,
      label: forecast.location.label ?? resolvedLabel,
      updatedAt: forecast.requestedAt,
    });
  }, [forecast, resolvedLabel]);
  return (
    <Card className="glass-panel border border-white/10 bg-card text-white shadow-lg">
      {" "}
      <CardHeader className="flex flex-col gap-1">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2 text-sm text-white/70">
            {" "}
            <MapPin className="h-4 w-4 text-primary" />{" "}
            <span className="font-medium text-white">
              {locationDisplayLabel}
            </span>{" "}
            {shouldUseDevice && deviceLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-white/60" />
            )}{" "}
          </div>{" "}
          <div className="flex flex-wrap items-center gap-2">
            {" "}
            {useDeviceLocation ? (
              <Button
                variant={shouldUseDevice ? "default" : "outline"}
                size="sm"
                className="text-white"
                onClick={() => setManualMode(false)}
                disabled={deviceLoading}
              >
                {" "}
                Use My Location{" "}
              </Button>
            ) : null}{" "}
            <Button
              variant={manualMode ? "default" : "outline"}
              size="sm"
              className="text-white"
              onClick={() => setManualMode(true)}
            >
              {" "}
              Set Manually{" "}
            </Button>{" "}
            {shouldUseDevice ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white"
                onClick={() => refreshDeviceLocation()}
                disabled={deviceLoading}
              >
                {" "}
                {deviceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}{" "}
              </Button>
            ) : null}{" "}
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white"
              onClick={() => refresh()}
              disabled={loading}
            >
              {" "}
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
        <CardTitle className="text-2xl font-semibold text-white">
          Operational Weather Command
        </CardTitle>{" "}
        <CardDescription className="text-white/60">
          {" "}
          {descriptor.label} · {descriptor.description}{" "}
        </CardDescription>{" "}
        {lastUpdated && (
          <p className="text-xs text-white/50">
            {" "}
            Updated {HOUR_FORMAT.format(lastUpdated)}{" "}
            {source ? ` · Source: ${source}` : ""}{" "}
          </p>
        )}{" "}
        {history?.requestedAt && (
          <p className="text-xs text-white/50">
            {" "}
            History updated {HOUR_FORMAT.format(
              new Date(history.requestedAt),
            )}{" "}
            {historySource ? ` · Source: ${historySource}` : ""}{" "}
          </p>
        )}{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        <div className="rounded-lg border border-white/15 bg-background p-4 text-xs text-white/80">
          {" "}
          <div className="flex flex-col gap-2">
            {" "}
            <p className="text-sm font-medium text-white">
              Location Source
            </p>{" "}
            <div className="flex flex-wrap gap-2">
              {" "}
              {useDeviceLocation ? (
                <Button
                  variant={shouldUseDevice ? "default" : "outline"}
                  size="sm"
                  className="text-white"
                  onClick={() => setManualMode(false)}
                  disabled={deviceLoading}
                >
                  {" "}
                  GPS{" "}
                </Button>
              ) : null}{" "}
              <Button
                variant={manualMode ? "default" : "outline"}
                size="sm"
                className="text-white"
                onClick={() => setManualMode(true)}
              >
                {" "}
                Manual{" "}
              </Button>{" "}
            </div>{" "}
            {manualMode ? (
              <div className="flex flex-col gap-2">
                {" "}
                <Input
                  value={addressInput}
                  onChange={(event) => setAddressInput(event.target.value)}
                  placeholder="Enter city, venue, or ZIP"
                  className="bg-background text-white placeholder:text-white/40"
                />{" "}
                <p className="text-white/60">
                  {" "}
                  We'll use this location to pull the latest forecast and
                  alerts.{" "}
                </p>{" "}
              </div>
            ) : (
              <p className="text-white/60">
                {" "}
                We'll use your device's GPS coordinates for the most precise
                conditions.{" "}
              </p>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {!payload && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            {" "}
            {manualMode
              ? "Provide a location to activate operational forecasting."
              : "Allow location access or switch to Manual mode to activate operational forecasting."}{" "}
          </div>
        )}{" "}
        {shouldUseDevice && deviceError && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200">
            {" "}
            Unable to use your live location ({deviceError}). Switch to Manual
            mode to set a specific location.{" "}
          </div>
        )}{" "}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {" "}
            {error}{" "}
          </div>
        )}{" "}
        {loading && !forecast ? <WeatherSkeleton /> : null}{" "}
        {forecast && (
          <Tabs
            value={selectedMode}
            onValueChange={(value) =>
              setSelectedMode(value as "quick" | "decision" | "history")
            }
          >
            {" "}
            <TabsList className="bg-background text-white">
              {" "}
              <TabsTrigger value="quick">Quick Look</TabsTrigger>{" "}
              <TabsTrigger value="decision">Event Decisions</TabsTrigger>{" "}
              <TabsTrigger value="history">History & Trends</TabsTrigger>{" "}
            </TabsList>{" "}
            <TabsContent value="quick" className="mt-6 space-y-6">
              {" "}
              <CurrentConditionsPanel
                forecast={forecast}
                descriptor={descriptor}
              />{" "}
              <Separator className="bg-background" />{" "}
              <HourlyTimeline hours={nextTwentyFourHours} />{" "}
              <Separator className="bg-background" />{" "}
              <DailyOutlookGrid days={dailyOutlook} />{" "}
            </TabsContent>{" "}
            <TabsContent value="decision" className="mt-6 space-y-6">
              {" "}
              <EventWindowSummary
                eventWindow={forecast.eventWindow}
                decision={decisionAssessment}
                eventStartISO={eventStartISO}
                eventEndISO={eventEndISO}
                locationLabel={locationDisplayLabel ?? locationLabel}
              />{" "}
              <Separator className="bg-background" />{" "}
              <HourlyTimeline
                hours={decisionWindow}
                highlightThresholds={{
                  rain: rainProbLimit,
                  wind: windGustLimit,
                }}
              />{" "}
              <Separator className="bg-background" />{" "}
              <DailyOutlookGrid
                days={dailyOutlook}
                highlightEventRange={{ eventStartISO, eventEndISO }}
              />{" "}
            </TabsContent>{" "}
            <TabsContent value="history" className="mt-6 space-y-6">
              {" "}
              <WeatherHistoryPanel
                history={history}
                loading={historyLoading}
                error={historyError}
                onRetry={refreshHistory}
              />{" "}
            </TabsContent>{" "}
          </Tabs>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
function WeatherSkeleton() {
  return (
    <div className="grid gap-6">
      {" "}
      <Skeleton className="h-40 w-full rounded-xl bg-background" />{" "}
      <Skeleton className="h-32 w-full rounded-xl bg-background" />{" "}
      <Skeleton className="h-64 w-full rounded-xl bg-background" />{" "}
    </div>
  );
}
function CurrentConditionsPanel({
  forecast,
  descriptor,
}: {
  forecast: WeatherForecast;
  descriptor: WeatherCodeDescriptor;
}) {
  const Icon = descriptor.icon;
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-background p-4 lg:grid-cols-2">
      {" "}
      <div className="flex flex-col gap-4">
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background">
            {" "}
            <Icon className="h-10 w-10 text-white" />{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="text-sm text-white/60">Current Conditions</p>{" "}
            <p className="text-3xl font-semibold text-white">
              {" "}
              {formatTemperature(forecast.current.temperatureF)}{" "}
            </p>{" "}
            <p className="text-sm text-white/60">
              {" "}
              Feels like{" "}
              {formatTemperature(forecast.current.apparentTemperatureF)}{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
          {" "}
          <DataPoint
            icon={Droplets}
            label="Humidity"
            value={formatPercentage(forecast.current.humidityPercent)}
          />{" "}
          <DataPoint
            icon={Wind}
            label="Wind"
            value={formatWind(forecast.current.windSpeedMph)}
          />{" "}
          <DataPoint
            icon={Compass}
            label="Direction"
            value={degreesToDirection(forecast.current.windDirection)}
          />{" "}
          <DataPoint
            icon={Gauge}
            label="Gusts"
            value={formatWind(forecast.current.windGustMph)}
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        {" "}
        <p className="flex items-center gap-2 text-white">
          {" "}
          <Sunrise className="h-4 w-4 text-orange-300" /> Sunrise •{" "}
          {formatTime(forecast.daily[0]?.sunrise)}{" "}
        </p>{" "}
        <p className="mt-2 flex items-center gap-2 text-white">
          {" "}
          <Sunset className="h-4 w-4 text-purple-300" /> Sunset •{" "}
          {formatTime(forecast.daily[0]?.sunset)}{" "}
        </p>{" "}
        <p className="mt-4 text-xs text-white/50">
          {" "}
          Narrative:{" "}
          {forecast.daily[0]?.narrative ?? "Favorable conditions"}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
function EventWindowSummary({
  eventWindow,
  decision,
  eventStartISO,
  eventEndISO,
  locationLabel,
}: {
  eventWindow: EventWindow | null;
  decision: DecisionAssessment | null;
  eventStartISO?: string;
  eventEndISO?: string;
  locationLabel: string;
}) {
  if (!eventWindow || !decision || !eventStartISO || !eventEndISO) {
    return (
      <div className="rounded-2xl border border-white/10 bg-background p-6 text-white/70">
        {" "}
        Provide an event window to unlock decision support.{" "}
      </div>
    );
  }
  const RiskIcon = RECOMMENDATION_ICONS[decision.riskLevel];
  return (
    <div className="rounded-2xl border border-white/10 bg-background p-6 text-white">
      {" "}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-sm text-white/60">Event Weather Readiness</p>{" "}
          <h3 className="text-xl font-semibold">{locationLabel}</h3>{" "}
          <p className="text-sm text-white/50">
            {" "}
            {formatFullDate(eventStartISO)} •{" "}
            {HOUR_FORMAT.format(new Date(eventStartISO))} to{" "}
            {HOUR_FORMAT.format(new Date(eventEndISO))}{" "}
          </p>{" "}
        </div>{" "}
        <Badge
          variant="outline"
          className={cn(
            "border text-sm",
            RISK_BADGE_CLASSES[decision.riskLevel],
          )}
        >
          {" "}
          {decision.riskLevel.toUpperCase()}{" "}
        </Badge>{" "}
      </div>{" "}
      <Separator className="my-4 bg-background" />{" "}
      <div className="grid gap-4 md:grid-cols-2">
        {" "}
        <div className="flex gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
          {" "}
          <RiskIcon className="mt-1 h-5 w-5 text-amber-300" />{" "}
          <div>
            {" "}
            <p className="text-sm font-medium text-white">
              Recommendation
            </p>{" "}
            <p className="text-sm text-white/70">
              {decision.recommendation}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-3 text-sm text-white/70">
          {" "}
          <DataPoint
            icon={Umbrella}
            label="Peak rain"
            value={formatPercentage(decision.maxPrecip)}
          />{" "}
          <DataPoint
            icon={Gauge}
            label="Peak gust"
            value={formatWind(decision.maxWindGust)}
          />{" "}
          <DataPoint
            icon={CloudRain}
            label="Rain start"
            value={formatTime(decision.rainStart?.timestamp)}
          />{" "}
          <DataPoint
            icon={Wind}
            label="Wind spike"
            value={formatTime(decision.peakGustHour?.timestamp)}
          />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function HourlyTimeline({
  hours,
  highlightThresholds,
}: {
  hours: HourlySnapshot[];
  highlightThresholds?: { rain: number; wind: number };
}) {
  if (!hours.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-background p-6 text-white/70">
        {" "}
        No hourly data available yet. Check back closer to event time.{" "}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {" "}
      <div className="flex items-center justify-between text-sm text-white/60">
        {" "}
        <p>Short-term timeline</p>{" "}
        {highlightThresholds && (
          <p>
            {" "}
            Thresholds: rain {highlightThresholds.rain}% · wind{" "}
            {highlightThresholds.wind} mph{" "}
          </p>
        )}{" "}
      </div>{" "}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {" "}
        {hours.map((point) => {
          const code = Number(point.weatherCode ?? 0);
          const descriptor = getWeatherDescriptor(code);
          const PrecipIcon = descriptor.icon;
          const rainTone = PRECIP_COLORS[descriptor.tone];
          const highlight = highlightThresholds
            ? point.precipitationProbability >= highlightThresholds.rain ||
              (point.windGustMph ?? point.windSpeedMph ?? 0) >=
                highlightThresholds.wind
            : false;
          return (
            <div
              key={point.timestamp}
              className={cn(
                "rounded-xl border bg-black/30 p-3 text-white/70 transition",
                highlight
                  ? "border-red-500/50 bg-red-500/10"
                  : "border-white/10",
              )}
            >
              {" "}
              <p className="text-xs text-white/50">
                {HOUR_FORMAT.format(new Date(point.timestamp))}
              </p>{" "}
              <p className="mt-1 text-lg font-semibold text-white">
                {formatTemperature(point.temperatureF)}
              </p>{" "}
              <div className="mt-2 flex items-center gap-2 text-xs">
                {" "}
                <PrecipIcon className="h-4 w-4 text-white/70" />{" "}
                <span>{descriptor.label}</span>{" "}
              </div>{" "}
              <div className="mt-2 flex items-center justify-between text-xs">
                {" "}
                <span className={cn(rainTone)}>
                  Rain {formatPercentage(point.precipitationProbability)}
                </span>{" "}
                <span>
                  Wind {formatWind(point.windGustMph ?? point.windSpeedMph)}
                </span>{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
}
function DailyOutlookGrid({
  days,
  highlightEventRange,
}: {
  days: ForecastDay[];
  highlightEventRange?: { eventStartISO?: string; eventEndISO?: string };
}) {
  const eventStart = highlightEventRange?.eventStartISO
    ? Date.parse(highlightEventRange.eventStartISO)
    : null;
  const eventEnd = highlightEventRange?.eventEndISO
    ? Date.parse(highlightEventRange.eventEndISO)
    : null;
  return (
    <div className="space-y-3">
      {" "}
      <div className="flex items-center justify-between text-sm text-white/60">
        {" "}
        <p>14-day operational outlook</p>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {" "}
        {days.map((day) => {
          const code = Number(day.weatherCode ?? 0);
          const descriptor = getWeatherDescriptor(code);
          const Icon = descriptor.icon;
          const dayDate = Date.parse(day.date);
          const inEventRange =
            eventStart && eventEnd
              ? dayDate >= eventStart && dayDate <= eventEnd
              : false;
          return (
            <div
              key={day.date}
              className={cn(
                "rounded-2xl border bg-black/30 p-4 text-white/70 transition",
                inEventRange
                  ? "border-primary/70 bg-primary/10"
                  : "border-white/10",
              )}
            >
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <div>
                  {" "}
                  <p className="text-xs text-white/50">
                    {DAY_FORMAT.format(new Date(day.date))}
                  </p>{" "}
                  <p className="text-sm font-medium text-white">
                    {" "}
                    {formatTemperature(day.temperatureHighF)} /{" "}
                    {formatTemperature(day.temperatureLowF)}{" "}
                  </p>{" "}
                </div>{" "}
                <Icon className="h-6 w-6 text-white/80" />{" "}
              </div>{" "}
              <div className="mt-3 flex items-center justify-between text-xs">
                {" "}
                <span className={cn(PRECIP_COLORS[descriptor.tone])}>
                  {" "}
                  Rain {formatPercentage(day.precipitationProbability)}{" "}
                </span>{" "}
                <span>
                  Wind {formatWind(day.windGustMaxMph ?? day.windSpeedMaxMph)}
                </span>{" "}
              </div>{" "}
              {day.narrative && (
                <p className="mt-2 text-xs text-white/50">{day.narrative}</p>
              )}{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
}
function DataPoint({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {" "}
      <Icon className="h-4 w-4 text-white/60" />{" "}
      <div>
        {" "}
        <p className="text-white/50">{label}</p>{" "}
        <p className="text-white font-medium">{value}</p>{" "}
      </div>{" "}
    </div>
  );
}
function getWeatherDescriptor(
  code: number | null | undefined,
): WeatherCodeDescriptor {
  if (code == null) {
    return DEFAULT_DESCRIPTOR;
  }
  return WEATHER_CODE_DETAILS[code] ?? DEFAULT_DESCRIPTOR;
}
const DEFAULT_DESCRIPTOR: WeatherCodeDescriptor = {
  label: "N/A",
  description: "Unavailable",
  icon: Cloud,
  tone: "default",
};
function formatTemperature(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)}°F`;
}
function formatPercentage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)}%`;
}
function formatWind(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)} mph`;
}
function degreesToDirection(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) {
    return "--";
  }
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}
function formatTime(value: string | undefined | null): string {
  if (!value) {
    return "--";
  }
  return HOUR_FORMAT.format(new Date(value));
}
function formatFullDate(value: string | undefined | null): string {
  if (!value) {
    return "--";
  }
  return FULL_DATE_FORMAT.format(new Date(value));
}
function deriveRiskLevel(
  maxPrecip: number,
  maxWindGust: number,
  windGustLimit: number,
  rainProbLimit: number,
): RiskLevel {
  if (maxPrecip >= rainProbLimit + 20 || maxWindGust >= windGustLimit + 10) {
    return "high";
  }
  if (maxPrecip >= rainProbLimit || maxWindGust >= windGustLimit) {
    return "moderate";
  }
  return "low";
}
function buildRecommendation(
  riskLevel: RiskLevel,
  maxPrecip: number,
  maxWindGust: number,
): string {
  if (riskLevel === "high") {
    return "Activate severe weather protocols, alert vendors, and secure assets immediately.";
  }
  if (riskLevel === "moderate") {
    return `Stage contingency plans. Expect up to ${Math.round(maxPrecip)}% rain risk and gusts near ${Math.round(maxWindGust)} mph.`;
  }
  return "Conditions favorable. Continue monitoring for updates every few hours.";
}
