import React, { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  CloudRain,
  Feather,
  MapPin,
  RefreshCw,
  Thermometer,
  TrendingUp,
  Wind,
} from "lucide-react";
import type {
  HistoricalWeatherDay,
  WeatherHistory,
} from "@shared/weather/types";
interface WeatherHistoryPanelProps {
  history: WeatherHistory | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}
const DATE_LABEL_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});
const FULL_DATE_LABEL = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
export function WeatherHistoryPanel({
  history,
  loading,
  error,
  onRetry,
}: WeatherHistoryPanelProps) {
  const chartData = useMemo(() => {
    if (!history) {
      return [] as Array<{
        date: string;
        high: number;
        low: number;
        precip: number;
      }>;
    }
    return history.days.map((day) => ({
      date: DATE_LABEL_FORMAT.format(new Date(day.date)),
      high: Number.isNaN(day.temperatureHighF)
        ? null
        : Number(day.temperatureHighF.toFixed(1)),
      low: Number.isNaN(day.temperatureLowF)
        ? null
        : Number(day.temperatureLowF.toFixed(1)),
      precip: Number.isNaN(day.precipitationTotalInches)
        ? 0
        : Number(day.precipitationTotalInches.toFixed(2)),
    }));
  }, [history]);
  if (loading && !history) {
    return <HistorySkeleton />;
  }
  if (error) {
    return (
      <Card className="border border-red-500/30 bg-red-500/10 text-red-100">
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          {" "}
          <div className="flex items-center gap-2 text-red-200">
            {" "}
            <AlertCircle className="h-5 w-5" />{" "}
            <CardTitle className="text-base">
              Weather history unavailable
            </CardTitle>{" "}
          </div>{" "}
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-red-300/40 text-red-100"
          >
            {" "}
            <RefreshCw className="mr-2 h-4 w-4" /> Retry{" "}
          </Button>{" "}
        </CardHeader>{" "}
        <CardContent className="text-sm text-red-100/80">
          {error}
        </CardContent>{" "}
      </Card>
    );
  }
  if (!history) {
    return null;
  }
  const { aggregates } = history;
  const highlightCards = buildHighlightCards(aggregates);
  return (
    <Card className="border border-white/10 bg-black/40 text-white">
      {" "}
      <CardHeader className="space-y-1">
        {" "}
        <div className="flex items-center gap-2 text-xs text-white/60">
          {" "}
          <MapPin className="h-3 w-3 text-white/50" />{" "}
          <span>{history.location.label}</span>{" "}
        </div>{" "}
        <CardTitle className="text-lg font-semibold">
          90-day climate intelligence
        </CardTitle>{" "}
        <p className="text-xs text-white/60">
          {" "}
          {FULL_DATE_LABEL.format(new Date(history.startDate))} –{" "}
          {FULL_DATE_LABEL.format(new Date(history.endDate))}{" "}
        </p>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          {" "}
          <MetricCard
            icon={Thermometer}
            label="Average high"
            value={formatTemperature(aggregates.avgHighF)}
            sublabel={`Past 7 days: ${formatTemperature(aggregates.recent7DayAvgHighF)}`}
          />{" "}
          <MetricCard
            icon={Feather}
            label="Average low"
            value={formatTemperature(aggregates.avgLowF)}
            sublabel={`Past 7 days: ${formatTemperature(aggregates.recent7DayAvgLowF)}`}
          />{" "}
          <MetricCard
            icon={CloudRain}
            label="Average precipitation"
            value={formatPrecip(aggregates.avgPrecipInches)}
            sublabel={`Past 7 days: ${formatPrecip(aggregates.recent7DayAvgPrecipInches)}`}
          />{" "}
        </div>{" "}
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          {" "}
          <div className="mb-3 flex items-center justify-between text-xs text-white/60">
            {" "}
            <span>Daily temperature & precipitation trend</span>{" "}
            <Button
              size="sm"
              variant="ghost"
              onClick={onRetry}
              className="text-white/70 hover:text-white"
            >
              {" "}
              <RefreshCw
                className={
                  loading ? "mr-2 h-3 w-3 animate-spin" : "mr-2 h-3 w-3"
                }
              />{" "}
              Refresh{" "}
            </Button>{" "}
          </div>{" "}
          <div className="h-64">
            {" "}
            <ResponsiveContainer width="100%" height="100%">
              {" "}
              <ComposedChart
                data={chartData}
                margin={{ left: 0, right: 0, top: 16, bottom: 0 }}
              >
                {" "}
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 3"
                />{" "}
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.45)"
                  tick={{ fontSize: 12 }}
                />{" "}
                <YAxis
                  yAxisId="temperature"
                  stroke="rgba(255,255,255,0.45)"
                  tick={{ fontSize: 12 }}
                  domain={["auto", "auto"]}
                />{" "}
                <YAxis
                  yAxisId="precip"
                  orientation="right"
                  stroke="rgba(255,255,255,0.45)"
                  tick={{ fontSize: 12 }}
                  domain={[0, "auto"]}
                />{" "}
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    color: "white",
                  }}
                />{" "}
                <Legend
                  iconType="circle"
                  wrapperStyle={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 12,
                  }}
                />{" "}
                <Area
                  yAxisId="temperature"
                  type="monotone"
                  dataKey="high"
                  name="High"
                  stroke="#38bdf8"
                  fill="rgba(56, 189, 248, 0.3)"
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                />{" "}
                <Area
                  yAxisId="temperature"
                  type="monotone"
                  dataKey="low"
                  name="Low"
                  stroke="#a855f7"
                  fill="rgba(168, 85, 247, 0.25)"
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                />{" "}
                <Bar
                  yAxisId="precip"
                  dataKey="precip"
                  name="Precip (in)"
                  fill="rgba(96, 165, 250, 0.6)"
                />{" "}
              </ComposedChart>{" "}
            </ResponsiveContainer>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {" "}
          {highlightCards.map((card) => (
            <HighlightCard key={card.label} {...card} />
          ))}{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
function buildHighlightCards(aggregates: WeatherHistory["aggregates"]) {
  const entries: Array<{
    label: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    description: string;
  }> = [];
  if (aggregates.wettestDay) {
    entries.push({
      label: "Wettest day",
      value: `${formatDateLabel(aggregates.wettestDay)} · ${formatPrecip(aggregates.wettestDay.precipitationTotalInches)}`,
      icon: CloudRain,
      description: "Plan for saturated ground conditions",
    });
  }
  if (aggregates.driestDay) {
    entries.push({
      label: "Driest day",
      value: `${formatDateLabel(aggregates.driestDay)} · ${formatPrecip(aggregates.driestDay.precipitationTotalInches)}`,
      icon: TrendingUp,
      description: "Ideal for outdoor activations",
    });
  }
  if (aggregates.peakWindDay) {
    entries.push({
      label: "Peak wind",
      value: `${formatDateLabel(aggregates.peakWindDay)} · ${formatWind(aggregates.peakWindMph)}`,
      icon: Wind,
      description: "Secure tenting and stage structures",
    });
  }
  if (!entries.length) {
    entries.push({
      label: "Stable conditions",
      value: "Minimal variance detected",
      icon: Feather,
      description: "Historical record shows limited disruption risk",
    });
  }
  return entries;
}
function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background p-4">
      {" "}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
        {" "}
        <Icon className="h-5 w-5 text-white" />{" "}
      </div>{" "}
      <div className="flex flex-col">
        {" "}
        <span className="text-xs text-white/60">{label}</span>{" "}
        <span className="text-lg font-semibold text-white">{value}</span>{" "}
        <span className="text-[11px] text-white/50">{sublabel}</span>{" "}
      </div>{" "}
    </div>
  );
}
function HighlightCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background p-4 text-sm text-white/80">
      {" "}
      <div className="flex items-center gap-2 text-white">
        {" "}
        <Icon className="h-5 w-5" />{" "}
        <span className="text-sm font-semibold">{label}</span>{" "}
      </div>{" "}
      <p className="mt-2 text-white">{value}</p>{" "}
      <p className="mt-2 text-xs text-white/50">{description}</p>{" "}
    </div>
  );
}
function HistorySkeleton() {
  return (
    <div className="space-y-4">
      {" "}
      <Skeleton className="h-16 rounded-2xl bg-background" />{" "}
      <Skeleton className="h-64 rounded-2xl bg-background" />{" "}
      <Skeleton className="h-28 rounded-2xl bg-background" />{" "}
    </div>
  );
}
function formatTemperature(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)}°F`;
}
function formatPrecip(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${value.toFixed(2)} in`;
}
function formatWind(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)} mph`;
}
function formatDateLabel(day: HistoricalWeatherDay): string {
  return FULL_DATE_LABEL.format(new Date(day.date));
}
