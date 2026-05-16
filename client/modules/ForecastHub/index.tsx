/**
 * Phase 6C — ForecastHub
 * Living 21-day forecast + overrides. Shared shell (PanelFrame).
 * Inputs: occupancy, groups/banquets, reservations, outlet capacity/hours, historical baseline.
 * Outputs: B/L/D covers by outlet, banquet guest counts, confidence, deltas.
 * TraceLedger: FORECAST_UPDATED, FORECAST_OVERRIDE_SET, FORECAST_OVERRIDE_PROPOSED.
 */

import React from "react";
import { PanelFrame } from "@/components/echo/PanelFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type MealPeriod = "Breakfast" | "Lunch" | "Dinner";

type ForecastDay = { date: Date; label: string };

type OutletForecast = {
  outletId: string;
  outletName: string;
  baseline: Record<MealPeriod, number>;
  capacity: number;
  hours: string;
};

type TraceEventType =
  | "FORECAST_UPDATED"
  | "FORECAST_OVERRIDE_SET"
  | "FORECAST_OVERRIDE_PROPOSED";

type TraceEvent = {
  id: string;
  type: TraceEventType;
  createdAt: string;
  actor: string;
  details: string;
};

type ForecastWeights = {
  occupancy: number;
  reservations: number;
  banquets: number;
  capacity: number;
  baseline: number;
};

const DEFAULT_OUTLETS: OutletForecast[] = [
  {
    outletId: "terrace",
    outletName: "Terrace Grill",
    baseline: { Breakfast: 120, Lunch: 180, Dinner: 220 },
    capacity: 260,
    hours: "6a-11p",
  },
  {
    outletId: "azure",
    outletName: "Azure Lounge",
    baseline: { Breakfast: 60, Lunch: 90, Dinner: 160 },
    capacity: 180,
    hours: "7a-12a",
  },
  {
    outletId: "vista",
    outletName: "Vista Banquet",
    baseline: { Breakfast: 0, Lunch: 80, Dinner: 120 },
    capacity: 320,
    hours: "By event",
  },
];

const DEFAULT_WEIGHTS: ForecastWeights = {
  occupancy: 0.28,
  reservations: 0.24,
  banquets: 0.2,
  capacity: 0.16,
  baseline: 0.12,
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** BEO breakdown row from API */
type BEOBreakdownRow = {
  date: string;
  beoId: string;
  beoNumber: string;
  groupName: string;
  outletId?: string | null;
  outletName?: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  lateNight: number;
  total: number;
};

/** Hotel context and summary per date from API */
type HubSummaryDay = {
  roomCount: number;
  guestCount: number;
  uncapturedTotal: number;
  transientGuestCount: number;
};

/** Holiday in range (US or religious) */
type HolidayInRange = { date: string; title: string; type: "us" | "religious" };

/** Volume heat level for heatmap */
type VolumeHeat = "low" | "medium" | "high";

const API_BASE = "/api/forecast/hub";

export default function ForecastHubPanel() {
  const { user } = useAuth();
  const role = user?.role ?? "Staff";
  const canOverride = role === "Finance" || role === "Admin";
  const canPropose = role === "Manager";

  const [days] = React.useState<ForecastDay[]>(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 22 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return { date, label: i === 0 ? "Today" : formatDate(date) };
    });
  });

  const [occupancy, setOccupancy] = React.useState(0.78);
  const [reservations, setReservations] = React.useState(184);
  const [banquets, setBanquets] = React.useState(2);
  const [outlets, setOutlets] =
    React.useState<OutletForecast[]>(DEFAULT_OUTLETS);
  const [weights, setWeights] =
    React.useState<ForecastWeights>(DEFAULT_WEIGHTS);
  const [overrideByOutlet, setOverrideByOutlet] = React.useState<
    Record<string, number>
  >({
    terrace: 0.05,
    azure: 0,
    vista: 0.08,
  });
  const [proposalByOutlet, setProposalByOutlet] = React.useState<
    Record<string, number>
  >({});
  const [events, setEvents] = React.useState<TraceEvent[]>([
    {
      id: "ev-1",
      type: "FORECAST_UPDATED",
      createdAt: new Date().toISOString(),
      actor: "Echo Forecast Engine",
      details: "Baseline refresh from historical baseline model.",
    },
  ]);

  // ForecastHub API: BEO breakdown, hotel context, capture rates, summary (uncaptured + transient)
  const [beoBreakdown, setBeoBreakdown] = React.useState<BEOBreakdownRow[]>([]);
  const [hubSummaryByDate, setHubSummaryByDate] = React.useState<
    Record<string, HubSummaryDay>
  >({});
  const [captureRates, setCaptureRates] = React.useState<
    Record<string, number>
  >({});
  const [transientByDate, setTransientByDate] = React.useState<
    Record<string, number>
  >({});
  const [holidaysInRange, setHolidaysInRange] = React.useState<
    HolidayInRange[]
  >([]);
  const [hubLoading, setHubLoading] = React.useState(false);
  const [hubError, setHubError] = React.useState<string | null>(null);

  const dateRange = React.useMemo(() => {
    const start = toISODate(days[0].date);
    const end = toISODate(days[days.length - 1].date);
    return { start, end };
  }, [days]);

  React.useEffect(() => {
    let cancelled = false;
    setHubLoading(true);
    setHubError(null);
    const { start, end } = dateRange;
    Promise.all([
      fetch(`${API_BASE}/beo-breakdown?start=${start}&end=${end}`).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/hotel-context?start=${start}&end=${end}`).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/capture-rates`).then((r) => r.json()),
      fetch(`${API_BASE}/summary?start=${start}&end=${end}`).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/transient?start=${start}&end=${end}`).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/holidays?start=${start}&end=${end}`).then((r) =>
        r.json(),
      ),
    ])
      .then(
        ([
          beoRes,
          hotelRes,
          captureRes,
          summaryRes,
          transientRes,
          holidaysRes,
        ]) => {
          if (cancelled) return;
          if (beoRes.success && beoRes.data) setBeoBreakdown(beoRes.data);
          if (summaryRes.success && summaryRes.data?.byDate)
            setHubSummaryByDate(summaryRes.data.byDate);
          if (captureRes.success && captureRes.data?.rates)
            setCaptureRates(captureRes.data.rates);
          if (transientRes.success && transientRes.data?.byDate)
            setTransientByDate(transientRes.data.byDate);
          if (holidaysRes.success && Array.isArray(holidaysRes.data))
            setHolidaysInRange(holidaysRes.data);
        },
      )
      .catch((err) => {
        if (!cancelled)
          setHubError(
            err instanceof Error
              ? err.message
              : "Failed to load forecast hub data",
          );
      })
      .finally(() => {
        if (!cancelled) setHubLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange.start, dateRange.end]);

  const saveCaptureRates = React.useCallback(async () => {
    const res = await fetch(`${API_BASE}/capture-rates`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates: captureRates }),
    });
    const data = await res.json();
    if (data.success) {
      setEvents((prev) => [
        {
          id: `cap-${Date.now()}`,
          type: "FORECAST_OVERRIDE_SET",
          createdAt: new Date().toISOString(),
          actor: user?.name ?? "User",
          details: "Capture rates updated.",
        },
        ...prev,
      ]);
    }
  }, [captureRates, user?.name]);

  const saveTransientForDate = React.useCallback(
    async (date: string, count: number) => {
      const res = await fetch(`${API_BASE}/transient`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, transientGuestCount: count }),
      });
      const data = await res.json();
      if (data.success) {
        setTransientByDate((prev) => ({ ...prev, [date]: count }));
      }
    },
    [],
  );

  const totalWeights = Object.values(weights).reduce((s, x) => s + x, 0);
  const norm = React.useMemo(() => {
    if (!totalWeights) return DEFAULT_WEIGHTS;
    return {
      occupancy: weights.occupancy / totalWeights,
      reservations: weights.reservations / totalWeights,
      banquets: weights.banquets / totalWeights,
      capacity: weights.capacity / totalWeights,
      baseline: weights.baseline / totalWeights,
    };
  }, [totalWeights, weights]);

  const forecastByOutlet = React.useMemo(() => {
    return outlets.map((o) => {
      const base = Object.values(o.baseline).reduce((s, v) => s + v, 0);
      const capF = o.capacity / 300;
      const resF = reservations / 220;
      const bqtF = banquets / 3;
      const score =
        norm.baseline * clamp(base / 400, 0.4, 1.4) +
        norm.capacity * clamp(capF, 0.5, 1.4) +
        norm.reservations * clamp(resF, 0.6, 1.5) +
        norm.banquets * clamp(bqtF, 0.4, 1.6) +
        norm.occupancy * clamp(occupancy, 0.4, 1.1);
      const ov = canOverride ? (overrideByOutlet[o.outletId] ?? 0) : 0;
      const conf = clamp(0.62 + score * 0.28 + ov * 0.4, 0.45, 0.92);
      const meal = (p: MealPeriod) =>
        Math.round(o.baseline[p] * (0.9 + score) * (1 + ov));
      return {
        outlet: o,
        base,
        mealBreakdown: {
          Breakfast: meal("Breakfast"),
          Lunch: meal("Lunch"),
          Dinner: meal("Dinner"),
        } as Record<MealPeriod, number>,
        confidence: conf,
      };
    });
  }, [
    outlets,
    reservations,
    banquets,
    occupancy,
    norm,
    overrideByOutlet,
    canOverride,
  ]);

  const banquetGuests = React.useMemo(
    () => Math.round(banquets * 140 + reservations * 0.1),
    [banquets, reservations],
  );

  const forecastTotals = React.useMemo(() => {
    const totals = forecastByOutlet.map((e) => {
      const t = Object.values(e.mealBreakdown).reduce((s, v) => s + v, 0);
      return { outletId: e.outlet.outletId, total: t, delta: t - e.base };
    });
    return { totals, overall: totals.reduce((s, x) => s + x.total, 0) };
  }, [forecastByOutlet]);

  const onOverrideSave = () => {
    if (!canOverride) return;
    setEvents((prev) => [
      {
        id: `override-${Date.now()}`,
        type: "FORECAST_OVERRIDE_SET",
        createdAt: new Date().toISOString(),
        actor: user?.name ?? "Finance",
        details: "Override factors updated for outlet forecasts.",
      },
      ...prev,
    ]);
  };

  const onRefresh = () => {
    setEvents((prev) => [
      {
        id: `forecast-${Date.now()}`,
        type: "FORECAST_UPDATED",
        createdAt: new Date().toISOString(),
        actor: "ForecastHub",
        details: "Forecast recalculated with updated demand inputs.",
      },
      ...prev,
    ]);
  };

  const onProposal = (outletId: string) => {
    if (!canPropose) return;
    const name =
      outlets.find((x) => x.outletId === outletId)?.outletName ?? "Outlet";
    setEvents((prev) => [
      {
        id: `proposal-${Date.now()}`,
        type: "FORECAST_OVERRIDE_PROPOSED",
        createdAt: new Date().toISOString(),
        actor: user?.name ?? "Outlet Manager",
        details: `Proposed adjustment for ${name}.`,
      },
      ...prev,
    ]);
  };

  const dayMul = (d: Date) => {
    const w = d.getDay();
    if (w === 5 || w === 6) return 1.15;
    if (w === 0) return 1.05;
    return 1;
  };

  // Per-day, per-outlet breakdown for all 21 days (P&L-style drill-down)
  const forecastByDay = React.useMemo(() => {
    return days.map((day) => {
      const m = dayMul(day.date);
      const dayOfWeek = day.date.toLocaleDateString("en-US", {
        weekday: "short",
      });
      const outletRows = forecastByOutlet.map((e) => {
        const mealBreakdown = {
          Breakfast: Math.round(e.mealBreakdown.Breakfast * m),
          Lunch: Math.round(e.mealBreakdown.Lunch * m),
          Dinner: Math.round(e.mealBreakdown.Dinner * m),
        };
        const subtotal =
          mealBreakdown.Breakfast + mealBreakdown.Lunch + mealBreakdown.Dinner;
        return {
          outletId: e.outlet.outletId,
          outletName: e.outlet.outletName,
          ...mealBreakdown,
          subtotal,
        };
      });
      const totalCovers = outletRows.reduce((s, r) => s + r.subtotal, 0);
      const banquetForDay = Math.round(banquetGuests * m);
      return {
        date: day.date,
        label: day.label,
        dayOfWeek,
        multiplier: m,
        outlets: outletRows,
        totalCovers,
        banquetGuests: banquetForDay,
      };
    });
  }, [days, forecastByOutlet, banquetGuests]);

  // Merge hub summary (rooms, hotel guests, uncaptured, transient) into each day
  const forecastByDayWithHub = React.useMemo(() => {
    return forecastByDay.map((row) => {
      const dateStr = toISODate(row.date);
      const hub = hubSummaryByDate[dateStr] ?? {
        roomCount: 0,
        guestCount: 0,
        uncapturedTotal: 0,
        transientGuestCount: 0,
      };
      return {
        ...row,
        roomCount: hub.roomCount,
        guestCount: hub.guestCount,
        uncapturedTotal: hub.uncapturedTotal,
        transientGuestCount:
          transientByDate[dateStr] ?? hub.transientGuestCount ?? 0,
      };
    });
  }, [forecastByDay, hubSummaryByDate, transientByDate]);

  // Volume heat (low/medium/high) by total covers for heatmap — quartiles
  const volumeHeatByDate = React.useMemo(() => {
    const totals = forecastByDayWithHub
      .map((r) => r.totalCovers + r.banquetGuests)
      .filter((n) => n > 0);
    if (totals.length === 0) return {} as Record<string, VolumeHeat>;
    const sorted = [...totals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.33)] ?? sorted[0];
    const q2 =
      sorted[Math.floor(sorted.length * 0.66)] ?? sorted[sorted.length - 1];
    const byDate: Record<string, VolumeHeat> = {};
    forecastByDayWithHub.forEach((row) => {
      const dateStr = toISODate(row.date);
      const v = row.totalCovers + row.banquetGuests;
      if (v <= q1) byDate[dateStr] = "low";
      else if (v <= q2) byDate[dateStr] = "medium";
      else byDate[dateStr] = "high";
    });
    return byDate;
  }, [forecastByDayWithHub]);

  // Holidays by date for overlay
  const holidaysByDate = React.useMemo(() => {
    const map: Record<string, HolidayInRange[]> = {};
    holidaysInRange.forEach((h) => {
      const d = h.date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(h);
    });
    return map;
  }, [holidaysInRange]);

  const heatmapBgClass = (heat: VolumeHeat) => {
    switch (heat) {
      case "high":
        return "bg-amber-500/25 border-amber-500/40";
      case "medium":
        return "bg-amber-400/15 border-amber-400/30";
      default:
        return "bg-emerald-500/10 border-emerald-500/20";
    }
  };

  return (
    <PanelFrame
      title="ForecastHub"
      subtitle="Living 21-Day Forecast + Overrides"
      status="Phase 6C"
      chrome
      className="h-full w-full flex flex-col min-h-0"
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-6 pb-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">21-Day Forecast Window</h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(days[0].date)} →{" "}
                {formatDate(days[days.length - 1].date)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="uppercase">
                {role} Access
              </Badge>
              <Button onClick={onRefresh} variant="secondary">
                Recalculate Forecast
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="bg-background/80">
              <CardHeader>
                <CardTitle className="text-lg">Demand Inputs</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Occupancy (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(occupancy * 100)}
                    onChange={(e) =>
                      setOccupancy(clamp(Number(e.target.value) / 100, 0.2, 1))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Reservations
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={reservations}
                    onChange={(e) => setReservations(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Groups / Banquets
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={banquets}
                    onChange={(e) => setBanquets(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Baseline (mock)
                  </label>
                  <Input value="Baseline v2.1 (90-day)" readOnly />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Outlet capacity & hours
                  </label>
                  {outlets.map((o) => (
                    <div
                      key={o.outletId}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-2 text-xs"
                    >
                      <span className="font-semibold">{o.outletName}</span>
                      <Input
                        type="number"
                        className="h-8 w-[90px]"
                        value={o.capacity}
                        onChange={(e) =>
                          setOutlets((prev) =>
                            prev.map((x) =>
                              x.outletId === o.outletId
                                ? { ...x, capacity: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                      <Input
                        className="h-8 w-[110px]"
                        value={o.hours}
                        onChange={(e) =>
                          setOutlets((prev) =>
                            prev.map((x) =>
                              x.outletId === o.outletId
                                ? { ...x, hours: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/80">
              <CardHeader>
                <CardTitle className="text-lg">Forecast Weights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    ["Occupancy", "occupancy"],
                    ["Reservations", "reservations"],
                    ["Groups/Banquet", "banquets"],
                    ["Capacity", "capacity"],
                    ["Baseline", "baseline"],
                  ] as const
                ).map(([label, k]) => (
                  <div key={k} className="flex items-center gap-3 text-sm">
                    <span className="w-32 text-muted-foreground">{label}</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="h-8 w-24"
                      value={weights[k].toFixed(2)}
                      onChange={(e) =>
                        setWeights((prev) => ({
                          ...prev,
                          [k]: Number(e.target.value),
                        }))
                      }
                      disabled={!canOverride}
                    />
                    <Badge variant={canOverride ? "secondary" : "outline"}>
                      {(norm[k] * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
                {!canOverride && (
                  <p className="text-xs text-muted-foreground">
                    Finance role required to edit weights.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">Output Forecast Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-3">
                {forecastByOutlet.map((e) => {
                  const t = Object.values(e.mealBreakdown).reduce(
                    (s, v) => s + v,
                    0,
                  );
                  const d = t - e.base;
                  return (
                    <div
                      key={e.outlet.outletId}
                      className="rounded-lg border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">
                            {e.outlet.outletName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {e.outlet.hours} • Cap {e.outlet.capacity}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Confidence {Math.round(e.confidence * 100)}%
                          </Badge>
                          <Badge
                            variant={d >= 0 ? "secondary" : "destructive"}
                            className="capitalize"
                          >
                            Δ {d >= 0 ? "+" : ""}
                            {d}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        {(["Breakfast", "Lunch", "Dinner"] as MealPeriod[]).map(
                          (p) => (
                            <div
                              key={p}
                              className="rounded-md border border-border/50 bg-background/80 p-2 text-center"
                            >
                              <div className="text-muted-foreground">{p}</div>
                              <div className="text-base font-semibold">
                                {e.mealBreakdown[p]}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                      {canOverride && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            Override (%)
                          </span>
                          <Input
                            type="number"
                            className="h-8 w-[90px]"
                            value={Math.round(
                              (overrideByOutlet[e.outlet.outletId] ?? 0) * 100,
                            )}
                            onChange={(ev) =>
                              setOverrideByOutlet((prev) => ({
                                ...prev,
                                [e.outlet.outletId]:
                                  Number(ev.target.value) / 100,
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={onOverrideSave}
                          >
                            Save Override
                          </Button>
                        </div>
                      )}
                      {canPropose && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            Propose (%)
                          </span>
                          <Input
                            type="number"
                            className="h-8 w-[90px]"
                            value={Math.round(
                              (proposalByOutlet[e.outlet.outletId] ?? 0) * 100,
                            )}
                            onChange={(ev) =>
                              setProposalByOutlet((prev) => ({
                                ...prev,
                                [e.outlet.outletId]:
                                  Number(ev.target.value) / 100,
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onProposal(e.outlet.outletId)}
                          >
                            Propose Adjustment
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <div className="text-xs text-muted-foreground">
                    Total covers (today)
                  </div>
                  <div className="text-3xl font-semibold">
                    {forecastTotals.overall}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Banquet guests:{" "}
                    <span className="font-semibold text-foreground">
                      {banquetGuests}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    TraceLedger Events
                  </div>
                  <div className="mt-3 space-y-3 text-xs">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-md border border-border/50 bg-background p-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{ev.type}</span>
                          <span className="text-muted-foreground">
                            {new Date(ev.createdAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <div className="text-muted-foreground">{ev.actor}</div>
                        <div className="text-foreground">{ev.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Group/BEO breakdown — group names by BEO with meal period */}
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">Group/BEO Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">
                All group names by BEO with meal period (B/L/D/Late). Data from
                BEO and calendar.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {hubLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading BEO breakdown…
                </p>
              ) : beoBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No BEOs in this window. Add events to see group names and meal
                  breakdown.
                </p>
              ) : (
                <table className="w-full text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/50">
                      <th className="text-left px-3 py-2 font-semibold">
                        Date
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        BEO #
                      </th>
                      <th className="text-left px-3 py-2 font-semibold">
                        Group name
                      </th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground">
                        B
                      </th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground">
                        L
                      </th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground">
                        D
                      </th>
                      <th className="text-center px-2 py-2 font-semibold text-muted-foreground">
                        Late
                      </th>
                      <th className="text-right px-3 py-2 font-semibold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {beoBreakdown.map((row, idx) => (
                      <tr
                        key={`${row.date}-${row.beoId}-${idx}`}
                        className="hover:bg-muted/20"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                          {row.beoNumber}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {row.groupName}
                        </td>
                        <td className="text-center px-2 py-2 tabular-nums">
                          {row.breakfast}
                        </td>
                        <td className="text-center px-2 py-2 tabular-nums">
                          {row.lunch}
                        </td>
                        <td className="text-center px-2 py-2 tabular-nums">
                          {row.dinner}
                        </td>
                        <td className="text-center px-2 py-2 tabular-nums">
                          {row.lateNight}
                        </td>
                        <td className="text-right px-3 py-2 font-medium tabular-nums">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Hotel context + Capture rate and uncaptured */}
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">
                Hotel Context & Capture Rate
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                # Rooms and # Hotel guests (in-house). Per-outlet capture %
                (e.g. 108% for 2-meal outlets). Uncaptured = additional guests
                beyond reservations + BEO. Transient = non-hotel (outside)
                guests.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {hubError && (
                <p className="text-sm text-destructive">{hubError}</p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Today — Hotel context
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>
                      <strong># Rooms:</strong>{" "}
                      {hubSummaryByDate[toISODate(days[0].date)]?.roomCount ??
                        0}
                    </span>
                    <span>
                      <strong># Hotel guests:</strong>{" "}
                      {hubSummaryByDate[toISODate(days[0].date)]?.guestCount ??
                        0}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Capture rate % (per outlet)
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {outlets.map((o) => (
                      <div
                        key={o.outletId}
                        className="flex items-center gap-1.5 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {o.outletName}:
                        </span>
                        <Input
                          type="number"
                          className="h-8 w-16"
                          min={0}
                          max={500}
                          value={Math.round(captureRates[o.outletId] ?? 100)}
                          onChange={(e) =>
                            setCaptureRates((prev) => ({
                              ...prev,
                              [o.outletId]: Number(e.target.value) || 100,
                            }))
                          }
                          disabled={!canOverride}
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    ))}
                    {canOverride && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={saveCaptureRates}
                      >
                        Save capture rates
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Uncaptured guest (today)
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {hubSummaryByDate[toISODate(days[0].date)]
                      ?.uncapturedTotal ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Additional guests outlets can expect beyond reservations +
                    BEO (from hotel capture %).
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">
                    Transient (outside) — non-hotel
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-9 w-24"
                      min={0}
                      value={transientByDate[toISODate(days[0].date)] ?? 0}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 0;
                        setTransientByDate((prev) => ({
                          ...prev,
                          [toISODate(days[0].date)]: v,
                        }));
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        saveTransientForDate(
                          toISODate(days[0].date),
                          transientByDate[toISODate(days[0].date)] ?? 0,
                        )
                      }
                    >
                      Save today
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Walk-in / off-the-street guest count.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Volume heatmap + US/religious holidays + same period last year */}
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">Volume & Calendar</CardTitle>
              <p className="text-sm text-muted-foreground">
                High-volume days (heatmap), US federal and religious holidays,
                and same period last year for transit comparison.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="font-semibold text-muted-foreground uppercase">
                  Legend:
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded border border-emerald-500/20 bg-emerald-500/10" />{" "}
                  Low volume
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded border border-amber-400/30 bg-amber-400/15" />{" "}
                  Medium
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded border border-amber-500/40 bg-amber-500/25" />{" "}
                  High volume
                </span>
                <span className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-blue-500/15 border-blue-500/40"
                  >
                    US
                  </Badge>{" "}
                  US holiday
                </span>
                <span className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-purple-500/15 border-purple-500/40"
                  >
                    Rel
                  </Badge>{" "}
                  Religious
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {forecastByDayWithHub.map((row) => {
                  const dateStr = toISODate(row.date);
                  const heat = volumeHeatByDate[dateStr] ?? "low";
                  const dayHolidays = holidaysByDate[dateStr] ?? [];
                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "flex flex-col items-center justify-center rounded border p-2 min-w-[52px]",
                        heatmapBgClass(heat),
                      )}
                      title={`${formatDate(row.date)}: ${row.totalCovers + row.banquetGuests} covers${dayHolidays.length ? ` — ${dayHolidays.map((h) => h.title).join(", ")}` : ""}`}
                    >
                      <span className="text-xs font-medium">
                        {formatDate(row.date)}
                      </span>
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                        {dayHolidays.map((h) => (
                          <Badge
                            key={h.date + h.title}
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1",
                              h.type === "us"
                                ? "bg-blue-500/15 border-blue-500/40"
                                : "bg-purple-500/15 border-purple-500/40",
                            )}
                          >
                            {h.type === "us" ? "US" : "Rel"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  Same period last year (transit comparison)
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Connect historical covers data to show YoY change and increase
                  in transit business vs. same day / same period last year.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When historical API is available, this section will show: same
                  period last year covers, % change, and holiday-aligned
                  comparison.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 21-Day Forecast Breakdown — P&L-style line-by-line drill-down */}
          <Card className="bg-background/80">
            <CardHeader>
              <CardTitle className="text-lg">
                21-Day Forecast Breakdown
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Line-by-line guest forecast by day, outlet, and meal period.
                Rooms, Hotel guests, Uncaptured, Transient (outside). Scroll
                horizontally for all columns.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto overflow-y-visible">
              <div className="min-w-[1000px]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/50 sticky top-0 z-10">
                      <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">
                        Date
                      </th>
                      <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">
                        Day
                      </th>
                      {outlets.map((o) => (
                        <React.Fragment key={o.outletId}>
                          <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">
                            B
                          </th>
                          <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">
                            L
                          </th>
                          <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">
                            D
                          </th>
                          <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">
                            {o.outletName}
                          </th>
                        </React.Fragment>
                      ))}
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">
                        Total Covers
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">
                        Banquet
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap text-muted-foreground">
                        Rooms
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap text-muted-foreground">
                        Hotel
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap text-muted-foreground">
                        Uncaptured
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap text-muted-foreground">
                        Transient
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {forecastByDayWithHub.map((row, idx) => {
                      const dateStr = toISODate(row.date);
                      const heat = volumeHeatByDate[dateStr] ?? "low";
                      const dayHolidays = holidaysByDate[dateStr] ?? [];
                      return (
                        <tr
                          key={row.label}
                          className={cn(
                            "hover:bg-muted/30 border-l-4",
                            idx % 2 === 1 && "bg-muted/5",
                            heat === "high" && "border-l-amber-500",
                            heat === "medium" && "border-l-amber-400",
                            heat === "low" && "border-l-emerald-500/60",
                          )}
                        >
                          <td className="px-3 py-2 whitespace-nowrap font-medium">
                            <div className="flex flex-col gap-0.5">
                              <span>{formatDate(row.date)}</span>
                              {dayHolidays.length > 0 && (
                                <div className="flex flex-wrap gap-0.5">
                                  {dayHolidays.map((h) => (
                                    <Badge
                                      key={h.date + h.title}
                                      variant="outline"
                                      className={cn(
                                        "text-[9px] px-1 py-0",
                                        h.type === "us"
                                          ? "bg-blue-500/15 border-blue-500/40"
                                          : "bg-purple-500/15 border-purple-500/40",
                                      )}
                                      title={h.title}
                                    >
                                      {h.type === "us" ? "US" : "Rel"}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {row.dayOfWeek}
                          </td>
                          {row.outlets.map((out) => (
                            <React.Fragment key={out.outletId}>
                              <td className="text-center px-2 py-2 tabular-nums">
                                {out.Breakfast}
                              </td>
                              <td className="text-center px-2 py-2 tabular-nums">
                                {out.Lunch}
                              </td>
                              <td className="text-center px-2 py-2 tabular-nums">
                                {out.Dinner}
                              </td>
                              <td className="text-right px-3 py-2 font-medium tabular-nums">
                                {out.subtotal}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="text-right px-3 py-2 font-semibold tabular-nums">
                            {row.totalCovers}
                          </td>
                          <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">
                            {row.banquetGuests}
                          </td>
                          <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">
                            {row.roomCount}
                          </td>
                          <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">
                            {row.guestCount}
                          </td>
                          <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">
                            {row.uncapturedTotal}
                          </td>
                          <td className="text-right px-3 py-2 tabular-nums text-muted-foreground">
                            {row.transientGuestCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PanelFrame>
  );
}
