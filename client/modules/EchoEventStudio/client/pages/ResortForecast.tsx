import { useCallback, useEffect, useMemo, useState } from "react";
import { get, put } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, Flame } from "lucide-react";
import { useAccessStore } from "@/components/admin/_stubs/EcosystemControlPanel";

type ForecastDay = {
  id?: string;
  date: string;
  guestCount: number;
  occPct: number;
  rooms: number;
};

type OutletMeta = {
  id: string;
  name: string;
  resort_category?: string | null;
  outlet_type?: string | null;
};

type OutletForecast = {
  id: string;
  forecast_day_id: string;
  outlet_id: string;
  meal_period: string;
  echoai_forecast: number;
  final_forecast: number;
  confidence: number;
  user_override?: number;
};

type ForecastResponse = {
  success: boolean;
  data: {
    startDate: string;
    endDate: string;
    forecastDays: ForecastDay[];
    outletMeta: OutletMeta[];
    outletForecasts: OutletForecast[];
    groupBlocks: Array<{
      groupName: string;
      date: string;
      rooms: number;
      guests: number;
    }>;
    activations: Array<{
      id: string;
      activation_date: string;
      name: string;
      impact_tags?: string[];
    }>;
  };
};

type DrilldownResponse = {
  success: boolean;
  data: {
    outlet: OutletForecast;
    components: Array<{
      component_type: string;
      value: number;
      coefficient: number;
      source?: string;
    }>;
  };
};

type HeatmapResponse = {
  success: boolean;
  data: Array<{
    date: string;
    outletId: string;
    forecast: number;
    intensity: number;
  }>;
};

export default function ResortForecastPage() {
  const actionPermissions = useAccessStore((s) => s.actionPermissions);
  const [forecastDays, setForecastDays] = useState<ForecastDay[]>([]);
  const [outletMeta, setOutletMeta] = useState<OutletMeta[]>([]);
  const [outletForecasts, setOutletForecasts] = useState<OutletForecast[]>([]);
  const [groupBlocks, setGroupBlocks] = useState<
    ForecastResponse["data"]["groupBlocks"]
  >([]);
  const [activations, setActivations] = useState<
    ForecastResponse["data"]["activations"]
  >([]);
  const [heatmap, setHeatmap] = useState<HeatmapResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedMealPeriod, setSelectedMealPeriod] = useState<string>("all");
  const [extraDays, setExtraDays] = useState(0);
  const [drilldown, setDrilldown] = useState<DrilldownResponse["data"] | null>(
    null,
  );
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const roleId = useMemo(() => {
    if (typeof window === "undefined") return "EC";
    const storedRoleId = localStorage.getItem("user-role-id");
    if (storedRoleId) return storedRoleId;
    const rawRole = (
      localStorage.getItem("user-role") || "Admin"
    ).toUpperCase();
    if (rawRole.includes("ADMIN")) return "EC";
    if (rawRole.includes("DIRECTOR")) return "DIRECTOR_FB";
    if (rawRole.includes("MANAGER")) return "DIRECTOR_FB";
    if (rawRole.includes("CHEF")) return "EXEC_CHEF";
    return "LINE_COOK";
  }, []);

  const canOverride = useMemo(() => {
    const permission = actionPermissions.find(
      (perm) => perm.id === "resort_forecast:forecast:override",
    );
    if (!permission) {
      return ["EC", "DIRECTOR_FB", "EXEC_CHEF", "BANQUET_MANAGER"].includes(
        roleId,
      );
    }
    return Boolean(permission.rolePermissions?.[roleId]);
  }, [actionPermissions, roleId]);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<ForecastResponse>("/api/resort/forecast");
      setForecastDays(res?.data?.forecastDays || []);
      setOutletMeta(res?.data?.outletMeta || []);
      setOutletForecasts(res?.data?.outletForecasts || []);
      setGroupBlocks(res?.data?.groupBlocks || []);
      setActivations(res?.data?.activations || []);

      const heat = await get<HeatmapResponse>("/api/resort/forecast/heatmap");
      setHeatmap(Array.isArray(heat?.data) ? heat.data : []);
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const visibleDays = useMemo(() => {
    const count = Math.min(forecastDays.length, 3 + Math.min(extraDays, 4));
    return forecastDays.slice(0, count);
  }, [forecastDays, extraDays]);

  const dayMap = useMemo(
    () => new Map(forecastDays.map((day) => [day.id, day.date])),
    [forecastDays],
  );

  const outletMap = useMemo(
    () => new Map(outletMeta.map((outlet) => [outlet.id, outlet])),
    [outletMeta],
  );

  const filteredForecasts = useMemo(() => {
    return outletForecasts.filter((row) => {
      if (selectedOutlet !== "all" && row.outlet_id !== selectedOutlet)
        return false;
      if (
        selectedMealPeriod !== "all" &&
        row.meal_period !== selectedMealPeriod
      )
        return false;
      return true;
    });
  }, [outletForecasts, selectedMealPeriod, selectedOutlet]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, OutletForecast[]>>();
    filteredForecasts.forEach((row) => {
      const date = dayMap.get(row.forecast_day_id);
      if (!date) return;
      if (!map.has(row.outlet_id)) map.set(row.outlet_id, new Map());
      const outletMap = map.get(row.outlet_id)!;
      if (!outletMap.has(date)) outletMap.set(date, []);
      outletMap.get(date)!.push(row);
    });
    return map;
  }, [filteredForecasts, dayMap]);

  const saveOverride = async (row: OutletForecast, value: number) => {
    await put("/api/resort/forecast/override", {
      date: dayMap.get(row.forecast_day_id),
      outletId: row.outlet_id,
      mealPeriod: row.meal_period,
      overrideValue: value,
    });
    fetchForecast();
  };

  const openDrilldown = async (row: OutletForecast) => {
    const date = dayMap.get(row.forecast_day_id);
    if (!date) return;
    const res = await get<DrilldownResponse>(
      `/api/resort/forecast/drilldown?date=${date}&outletId=${row.outlet_id}&mealPeriod=${row.meal_period}`,
    );
    setDrilldown(res?.data || null);
  };

  const heatmapByOutlet = useMemo(() => {
    const map = new Map<string, Array<{ date: string; intensity: number }>>();
    heatmap.forEach((entry) => {
      if (!entry.date) return;
      if (!map.has(entry.outletId)) map.set(entry.outletId, []);
      map
        .get(entry.outletId)!
        .push({ date: entry.date, intensity: entry.intensity });
    });
    return map;
  }, [heatmap]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">21-Day Resort Forecast</h1>
            <p className="text-muted-foreground mt-2">
              EchoAi^3 predictions with outlet-level overrides and explainable
              drivers.
            </p>
            {lastUpdated ? (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated {new Date(lastUpdated).toLocaleString()}
              </p>
            ) : null}
          </div>
          <Button variant="outline" onClick={fetchForecast} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forecast Controls</CardTitle>
            <CardDescription>
              Filter by outlet and meal period, and adjust visible days.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Outlet</label>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All outlets</SelectItem>
                  {outletMeta.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Meal period
              </label>
              <Select
                value={selectedMealPeriod}
                onValueChange={setSelectedMealPeriod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All periods</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="late_night">Late night</SelectItem>
                  <SelectItem value="all_day">All day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Extra days (0-4)
              </label>
              <Input
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outlet Heatmap</CardTitle>
            <CardDescription>
              Higher intensity indicates higher forecast demand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {outletMeta.map((outlet) => {
                  const entries = (heatmapByOutlet.get(outlet.id) || []).slice(
                    0,
                    21,
                  );
                  return (
                    <div key={outlet.id} className="space-y-2">
                      <div className="text-sm font-medium">{outlet.name}</div>
                      <div className="grid grid-cols-7 gap-2">
                        {entries.map((entry) => (
                          <div
                            key={`${outlet.id}-${entry.date}`}
                            className="h-8 rounded-md flex items-center justify-center text-xs text-foreground/80"
                            style={{
                              backgroundColor: `rgba(239, 68, 68, ${0.1 + entry.intensity * 0.6})`,
                            }}
                          >
                            {entry.date.slice(5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Low</span>
                  <div className="h-2 w-32 rounded-full bg-gradient-to-r from-red-500/10 to-red-500/70" />
                  <span>High</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outlet Forecast (Visible Days)</CardTitle>
            <CardDescription>
              EchoAi^3 baseline and manager overrides.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {[...grouped.keys()].map((outletId) => {
                  const outlet = outletMap.get(outletId);
                  const dateMap = grouped.get(outletId)!;
                  return (
                    <div
                      key={outletId}
                      className="rounded-lg border border-border/60 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {outlet?.name || outletId}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {outlet?.resort_category ||
                            outlet?.outlet_type ||
                            "outlet"}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {visibleDays.map((day) => {
                          const rows = dateMap.get(day.date) || [];
                          return (
                            <div
                              key={`${outletId}-${day.date}`}
                              className="rounded-md border border-border/50 p-3 space-y-2"
                            >
                              <div className="text-xs font-semibold">
                                {day.date}
                              </div>
                              {rows.length === 0 ? (
                                <div className="text-xs text-muted-foreground">
                                  No forecast
                                </div>
                              ) : (
                                rows.map((row) => (
                                  <div
                                    key={row.id}
                                    className="space-y-1 text-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="uppercase text-muted-foreground">
                                        {row.meal_period}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openDrilldown(row)}
                                        className="h-6 px-2"
                                      >
                                        Details
                                      </Button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>EchoAi^3</span>
                                      <span className="font-semibold">
                                        {row.echoai_forecast}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Final</span>
                                      <span className="font-semibold">
                                        {row.final_forecast}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Input
                                        className="h-7 text-xs"
                                        type="number"
                                        defaultValue={
                                          row.user_override ??
                                          row.final_forecast
                                        }
                                        disabled={!canOverride}
                                        onBlur={(event) =>
                                          saveOverride(
                                            row,
                                            Number(
                                              event.target.value ||
                                                row.final_forecast,
                                            ),
                                          )
                                        }
                                      />
                                      <Flame className="h-3 w-3 text-orange-500" />
                                    </div>
                                    {!canOverride ? (
                                      <div className="text-[10px] text-muted-foreground">
                                        Override permission required
                                      </div>
                                    ) : null}
                                  </div>
                                ))
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Group Blocks</CardTitle>
            <CardDescription>
              Upcoming group and banquet activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupBlocks.slice(0, 10).map((block) => (
              <div
                key={`${block.groupName}-${block.date}`}
                className="rounded-md border border-border/60 p-3"
              >
                <div className="font-semibold">{block.groupName}</div>
                <div className="text-xs text-muted-foreground">
                  {block.date} • {block.guests} guests
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resort Activations</CardTitle>
            <CardDescription>
              Sales & marketing activations across the property.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activations.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No activations scheduled.
              </div>
            ) : (
              activations.map((activation) => (
                <div
                  key={activation.id}
                  className="rounded-md border border-border/60 p-3"
                >
                  <div className="font-semibold">{activation.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {activation.activation_date}
                    {activation.impact_tags?.length
                      ? ` • ${activation.impact_tags.join(", ")}`
                      : ""}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(drilldown)}
        onOpenChange={(open) => !open && setDrilldown(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forecast Drilldown</DialogTitle>
            <DialogDescription>
              Component factors used by EchoAi^3.
            </DialogDescription>
          </DialogHeader>
          {drilldown ? (
            <div className="space-y-2">
              <div className="text-sm">
                Final forecast:{" "}
                <span className="font-semibold">
                  {drilldown.outlet.final_forecast}
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Coeff</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drilldown.components.map((component, idx) => (
                      <TableRow key={`${component.component_type}-${idx}`}>
                        <TableCell className="capitalize">
                          {component.component_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(component.value || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(component.coefficient || 1).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {component.source ? (
                            <Badge variant="outline">{component.source}</Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
