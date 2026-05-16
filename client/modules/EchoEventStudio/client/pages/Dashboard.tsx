import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { get } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Calendar,
  ClipboardList,
  FileText,
  LineChart,
  Flame,
  Users,
  UploadCloud,
  UserPlus,
  RefreshCw,
  Loader2,
} from "lucide-react";
import PipelineAnalytics from "../components/PipelineAnalytics";
import {
  buildMetricsFromProspects,
  ensureDemoProspects,
  isDemoSeeded,
  seedDemoData,
} from "../lib/demo-data";

type CrmMetrics = {
  clientsCount: number;
  vipClientsCount: number;
  prospectsCount: number;
  openProspectsCount: number;
  rush72hCount: number;
  pipeline30d: number;
  weighted30d: number;
  pipeline18: number;
  weighted18: number;
};

type MetricsResponse = { success: boolean; data: CrmMetrics };

type Prospect = {
  id: string;
  name: string;
  status: string;
  event_date: string;
  estimated_revenue?: number;
};

type ResortForecastDay = {
  id?: string;
  date: string;
  guestCount: number;
  occPct: number;
  rooms: number;
};

type ResortOutletMeta = {
  id: string;
  name: string;
  resort_category?: string | null;
  outlet_type?: string | null;
};

type ResortOutletForecast = {
  id: string;
  forecast_day_id: string;
  outlet_id: string;
  meal_period: string;
  final_forecast: number;
};

type ResortForecastResponse = {
  success: boolean;
  data: {
    forecastDays: ResortForecastDay[];
    outletMeta: ResortOutletMeta[];
    outletForecasts: ResortOutletForecast[];
  };
};

function getUserOutletIds(): string[] {
  if (typeof window === "undefined") return [];
  const userRaw = localStorage.getItem("auth_user");
  if (!userRaw) return [];
  try {
    const parsed = JSON.parse(userRaw);
    const outletIds =
      parsed?.outlet_ids ||
      parsed?.outletIds ||
      parsed?.outlets ||
      parsed?.allowed_outlet_ids ||
      [];
    return Array.isArray(outletIds)
      ? outletIds.map((id: string) => String(id))
      : [];
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [metrics, setMetrics] = React.useState<CrmMetrics | null>(null);
  const [recentProspects, setRecentProspects] = React.useState<Prospect[]>([]);
  const [resortForecast, setResortForecast] = React.useState<
    ResortForecastResponse["data"] | null
  >(null);
  const [extraDays, setExtraDays] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [demoMode, setDemoMode] = React.useState(false);
  const [demoSeeded, setDemoSeeded] = React.useState(false);

  const healthScore = React.useMemo(() => {
    if (!metrics) return null;
    const pipelineRatio =
      metrics.pipeline30d > 0 ? metrics.weighted30d / metrics.pipeline30d : 0.5;
    const rushPenalty = Math.min(25, metrics.rush72hCount * 3);
    const openPenalty = Math.min(
      20,
      Math.max(0, metrics.openProspectsCount - 25),
    );
    const score = Math.round(
      Math.max(
        0,
        Math.min(100, 70 + pipelineRatio * 30 - rushPenalty - openPenalty),
      ),
    );
    return score;
  }, [metrics]);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [m, p] = await Promise.all([
        get<MetricsResponse>("/api/crm/metrics"),
        get<{ prospects?: Prospect[] }>("/api/prospects"),
      ]);
      setMetrics(m?.data || null);
      const list = Array.isArray(p?.prospects) ? p.prospects : [];
      setRecentProspects(list.slice(0, 8));
      setDemoMode(false);
      try {
        const rf = await get<ResortForecastResponse>("/api/resort/forecast");
        setResortForecast(rf?.data || null);
      } catch {
        setResortForecast(null);
      }
    } catch {
      const fallback = ensureDemoProspects();
      setMetrics(buildMetricsFromProspects(fallback));
      setRecentProspects(fallback.slice(0, 8));
      setDemoMode(true);
    } finally {
      setDemoSeeded(isDemoSeeded());
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated) {
      const fallback = ensureDemoProspects();
      setMetrics(buildMetricsFromProspects(fallback));
      setRecentProspects(fallback.slice(0, 8));
      setDemoMode(true);
      setDemoSeeded(isDemoSeeded());
      setIsLoading(false);
      return;
    }

    fetchData();
  }, [auth.isAuthenticated, auth.isLoading, fetchData]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Echo Event Studio</h1>
            <p className="text-muted-foreground">
              Sales pipeline, clients, import, and forecasting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button onClick={() => navigate("/prospects")} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Open Pipeline
            </Button>
          </div>
        </div>

        {demoMode ? (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-semibold">Demo mode active</div>
                <div className="text-muted-foreground">
                  Backend unavailable. Showing local demo metrics.
                </div>
              </div>
              {!demoSeeded ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    seedDemoData();
                    setDemoSeeded(true);
                    fetchData();
                  }}
                >
                  Seed demo data
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Clients"
            description="CRM contacts"
            icon={<Users className="h-4 w-4 text-blue-500" />}
            value={metrics ? metrics.clientsCount.toLocaleString() : "—"}
            badge={
              metrics && metrics.vipClientsCount > 0
                ? `${metrics.vipClientsCount} VIP`
                : undefined
            }
          />
          <MetricCard
            title="Prospects"
            description="Pipeline rows"
            icon={<UserPlus className="h-4 w-4 text-purple-500" />}
            value={metrics ? metrics.prospectsCount.toLocaleString() : "—"}
            badge={metrics ? `${metrics.openProspectsCount} open` : undefined}
          />
          <MetricCard
            title="Pipeline (30d)"
            description="Unweighted"
            icon={<Calendar className="h-4 w-4 text-amber-500" />}
            value={
              metrics
                ? `$${Math.round(metrics.pipeline30d).toLocaleString()}`
                : "—"
            }
            badge={
              metrics && metrics.rush72hCount > 0
                ? `${metrics.rush72hCount} in 72h`
                : undefined
            }
          />
          <MetricCard
            title="Weighted (30d)"
            description="Stage-weighted"
            icon={<LineChart className="h-4 w-4 text-emerald-500" />}
            value={
              metrics
                ? `$${Math.round(metrics.weighted30d).toLocaleString()}`
                : "—"
            }
          />
          <MetricCard
            title="Pipeline Health"
            description="AI risk index"
            icon={<LineChart className="h-4 w-4 text-cyan-500" />}
            value={healthScore !== null ? `${healthScore}` : "—"}
            badge={
              healthScore !== null
                ? healthScore > 75
                  ? "Strong"
                  : healthScore > 55
                    ? "Watch"
                    : "Risk"
                : undefined
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Move faster across CRM workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/clients")}
                className="gap-2"
              >
                <Users className="h-4 w-4" /> Clients
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/import")}
                className="gap-2"
              >
                <UploadCloud className="h-4 w-4" /> Import Clients
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/forecast")}
                className="gap-2"
              >
                <LineChart className="h-4 w-4" /> Forecast
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/resort-forecast")}
                className="gap-2"
              >
                <Flame className="h-4 w-4" /> 21-Day Forecast
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/prospects")}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" /> Prospects
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/beo")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" /> Create BEO
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/reo")}
                className="gap-2"
              >
                <ClipboardList className="h-4 w-4" /> Create REO
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Prospects</CardTitle>
              <CardDescription>Latest pipeline activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : recentProspects.length === 0 ? (
                <div className="text-sm text-muted-foreground space-y-3">
                  <div>No prospects yet.</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate("/prospects")}>
                      Create prospect
                    </Button>
                    {!demoSeeded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          seedDemoData();
                          setDemoSeeded(true);
                          fetchData();
                        }}
                      >
                        Seed demo data
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                recentProspects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(p.event_date).toLocaleDateString()} • $
                        {Math.round(p.estimated_revenue || 0).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {String(p.status || "").toLowerCase()}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>21-Day Forecast Snapshot</CardTitle>
                <CardDescription>
                  Today + next 2 days (add up to 4 more) for your outlets.
                </CardDescription>
              </div>
              <Input
                className="w-24"
                type="number"
                min={0}
                max={4}
                value={extraDays}
                onChange={(event) =>
                  setExtraDays(
                    Math.min(4, Math.max(0, Number(event.target.value || 0))),
                  )
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !resortForecast ? (
              <div className="text-sm text-muted-foreground">
                Resort forecast not available.
              </div>
            ) : (
              <ResortForecastMiniPanel
                data={resortForecast}
                extraDays={extraDays}
                outletIds={getUserOutletIds()}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Sales Pipeline & Analytics</h2>
          <PipelineAnalytics />
        </div>
      </div>
    </div>
  );
}

function ResortForecastMiniPanel({
  data,
  extraDays,
  outletIds,
}: {
  data: ResortForecastResponse["data"];
  extraDays: number;
  outletIds: string[];
}) {
  const visibleDays = data.forecastDays.slice(
    0,
    Math.min(data.forecastDays.length, 3 + extraDays),
  );
  const outletMap = new Map(
    data.outletMeta.map((outlet) => [outlet.id, outlet]),
  );

  const aggregated = React.useMemo(() => {
    const dayMap = new Map(data.forecastDays.map((day) => [day.id, day.date]));
    const map = new Map<string, Record<string, number>>();
    data.outletForecasts.forEach((row) => {
      const date = dayMap.get(row.forecast_day_id);
      if (!date) return;
      if (!map.has(row.outlet_id)) map.set(row.outlet_id, {});
      const entry = map.get(row.outlet_id)!;
      entry[date] = (entry[date] || 0) + Number(row.final_forecast || 0);
    });
    return map;
  }, [data.outletForecasts, data.forecastDays]);

  return (
    <div className="space-y-3">
      {Array.from(aggregated.entries()).map(([outletId, forecast]) => {
        const outlet = outletMap.get(outletId);
        const isAssigned = outletIds.includes(outletId);
        return (
          <div
            key={outletId}
            className={`rounded-md border px-3 py-2 ${
              isAssigned
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-border/50"
            }`}
          >
            <div className="text-sm font-medium">
              {outlet?.name || outletId}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2 text-xs">
              {visibleDays.map((day) => (
                <div
                  key={`${outletId}-${day.date}`}
                  className="rounded-md border border-border/40 p-2"
                >
                  <div className="text-muted-foreground">
                    {day.date.slice(5)}
                  </div>
                  <div className="font-semibold">{forecast[day.date] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({
  title,
  description,
  value,
  icon,
  badge,
}: {
  title: string;
  description: string;
  value: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon} {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <div className="text-3xl font-bold">{value}</div>
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      </CardContent>
    </Card>
  );
}
