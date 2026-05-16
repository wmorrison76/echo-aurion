import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useYieldAnalytics } from "@/hooks/use-yield-analytics";
import { useYieldStore } from "@/context/YieldContext";
import { READY_MADE_ITEMS, getReadyMadeItem } from "@/data/readyMadeItems";
import {
  calculateProcurementPlan,
  type DemandSample,
  type ProcurementPlan,
} from "@/lib/predictive-procurement";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function formatNumber(value: number, fractionDigits = 0): string {
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      })
    : "—";
}

type YieldTrackingPanelProps = {
  className?: string;
};

export function YieldTrackingPanel({ className }: YieldTrackingPanelProps) {
  const analytics = useYieldAnalytics();
  const { records, addRecord } = useYieldStore();
  const [showReadyMadeOnly, setShowReadyMadeOnly] = useState<boolean>(true);
  const [selectedReadyMadeId, setSelectedReadyMadeId] = useState<string>(
    READY_MADE_ITEMS[0]?.id ?? "",
  );
  const [targetPortions, setTargetPortions] = useState<number>(
    READY_MADE_ITEMS[0]?.defaultPortions ?? 60,
  );
  const [portionSize, setPortionSize] = useState<number>(
    READY_MADE_ITEMS[0]?.portionSize ?? 150,
  );
  const [portionUnit, setPortionUnit] = useState<string>(
    READY_MADE_ITEMS[0]?.portionUnit ?? "G",
  );
  const [bufferPercent, setBufferPercent] = useState<number>(8);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(
    READY_MADE_ITEMS[0]?.leadTimeDays ?? 2,
  );

  useEffect(() => {
    const match = getReadyMadeItem(selectedReadyMadeId);
    if (!match) return;
    setTargetPortions((prev) => (prev > 0 ? prev : match.defaultPortions));
    setPortionSize((prev) => (prev > 0 ? prev : match.portionSize));
    setPortionUnit((prev) => (prev.trim() ? prev : match.portionUnit));
    setLeadTimeDays((prev) => (prev > 0 ? prev : match.leadTimeDays));
  }, [selectedReadyMadeId]);

  const timelineData = useMemo(() => {
    const dataset = showReadyMadeOnly
      ? analytics.timeline.filter((point) => point.itemType === "readyMade")
      : analytics.timeline;
    return dataset.map((point) => ({
      date: point.date.slice(0, 10),
      yieldPercent: point.yieldPercent ?? null,
      label: point.label,
    }));
  }, [analytics.timeline, showReadyMadeOnly]);

  const selectedReadyMade = useMemo(
    () => getReadyMadeItem(selectedReadyMadeId),
    [selectedReadyMadeId],
  );

  const readyMadeHistory = useMemo<DemandSample[]>(() => {
    return records
      .filter(
        (record) =>
          record.itemType === "readyMade" &&
          record.readyMadeId === selectedReadyMadeId &&
          (record.forecastPortions || record.outputPortions),
      )
      .map((record) => ({
        date: new Date(record.recordedAt).toISOString().slice(0, 10),
        portions: record.forecastPortions ?? record.outputPortions ?? 0,
      }))
      .filter((sample) => sample.portions > 0);
  }, [records, selectedReadyMadeId]);

  const readyMadeYield = useMemo(() => {
    const summary = analytics.readyMadeSummaries.find(
      (item) => item.id === selectedReadyMadeId,
    );
    if (!summary) return selectedReadyMade?.defaultYieldPercent ?? 0;
    return summary.averageYield || selectedReadyMade?.defaultYieldPercent || 0;
  }, [analytics.readyMadeSummaries, selectedReadyMade, selectedReadyMadeId]);

  const procurementPlan = useMemo<ProcurementPlan | null>(() => {
    if (!selectedReadyMade) return null;
    const yieldPercent = readyMadeYield > 0 ? readyMadeYield : selectedReadyMade.defaultYieldPercent;
    return calculateProcurementPlan({
      targetPortions: targetPortions > 0 ? targetPortions : selectedReadyMade.defaultPortions,
      portionSize: portionSize > 0 ? portionSize : selectedReadyMade.portionSize,
      portionUnit: (portionUnit || selectedReadyMade.portionUnit).toUpperCase(),
      expectedYieldPercent: yieldPercent,
      inputUnit: selectedReadyMade.standardBatchUnit,
      shrinkageBufferPercent: bufferPercent,
      leadTimeDays,
      standardBatchQty: selectedReadyMade.standardBatchQty,
      standardBatchUnit: selectedReadyMade.standardBatchUnit,
      demandHistory: readyMadeHistory,
    });
  }, [
    selectedReadyMade,
    readyMadeYield,
    targetPortions,
    portionSize,
    portionUnit,
    bufferPercent,
    leadTimeDays,
    readyMadeHistory,
  ]);

  return (
    <section className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Yield tracking</h2>
          <p className="text-sm text-muted-foreground">
            Monitor lab performance, ready-made coverage, and procurement readiness.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Switch
            id="yield-ready-made-filter"
            checked={showReadyMadeOnly}
            onCheckedChange={setShowReadyMadeOnly}
          />
          <Label htmlFor="yield-ready-made-filter" className="cursor-pointer">
            Highlight ready-made items
          </Label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Recorded tests" value={formatNumber(analytics.totalRecords)} />
        <StatCard label="Average yield" value={formatPercent(analytics.averageYield)} />
        <StatCard
          label="30-day average"
          value={formatPercent(analytics.trailing30DayAverage)}
        />
        <StatCard
          label="Ready-made coverage"
          value={`${formatNumber(analytics.readyMadeCoverage)} items`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Yield velocity</CardTitle>
          <CardDescription>
            Trend line of validated yields across ingredients and ready-made items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Log a yield test to activate the velocity chart.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ left: 12, right: 12 }}>
                  <defs>
                    <linearGradient id="yieldGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis
                    domain={[0, "dataMax"]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0];
                      const data = point.payload as {
                        date: string;
                        yieldPercent: number | null;
                        label: string;
                      };
                      return (
                        <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                          <div className="font-medium">{data.date}</div>
                          <div>{data.label}</div>
                          <div className="text-sky-500">{formatPercent(data.yieldPercent ?? NaN)}</div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="yieldPercent"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#yieldGradient)"
                    dot={{ r: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ready-made performance</CardTitle>
            <CardDescription>
              Coverage summary for catalog items linked to chef-tested yields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.readyMadeSummaries.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                Link a readiness test to a ready-made item to build coverage.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.readyMadeSummaries.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.tests} tests · Avg {formatPercent(item.averageYield)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>
                        Portions: {item.averagePortions ? formatNumber(item.averagePortions, 1) : "—"}
                      </div>
                      <div>
                        Batch: {item.typicalBatch ? formatNumber(item.typicalBatch, 1) : "—"}
                        {item.typicalBatchUnit ? ` ${item.typicalBatchUnit}` : ""}
                      </div>
                      <div>
                        Updated {formatDistanceToNow(new Date(item.lastRecordedAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Predictive procurement</CardTitle>
            <CardDescription>
              Forecast input requirements against recent demand and yield.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ready-made-selector">Ready-made item</Label>
              <Select
                value={selectedReadyMadeId}
                onValueChange={setSelectedReadyMadeId}
              >
                <SelectTrigger id="ready-made-selector">
                  <SelectValue placeholder="Select ready-made" />
                </SelectTrigger>
                <SelectContent>
                  {READY_MADE_ITEMS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="forecast-portions">Target portions</Label>
                <Input
                  id="forecast-portions"
                  type="number"
                  min={1}
                  value={targetPortions}
                  onChange={(event) => setTargetPortions(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer-percent">Buffer %</Label>
                <Input
                  id="buffer-percent"
                  type="number"
                  min={0}
                  value={bufferPercent}
                  onChange={(event) => setBufferPercent(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portion-size">Portion size</Label>
                <Input
                  id="portion-size"
                  type="number"
                  min={1}
                  value={portionSize}
                  onChange={(event) => setPortionSize(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portion-unit">Portion unit</Label>
                <Input
                  id="portion-unit"
                  value={portionUnit}
                  onChange={(event) => setPortionUnit(event.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-time">Lead time (days)</Label>
                <Input
                  id="lead-time"
                  type="number"
                  min={0}
                  value={leadTimeDays}
                  onChange={(event) => setLeadTimeDays(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective yield</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                  {formatPercent(readyMadeYield)}
                </div>
              </div>
            </div>

            {procurementPlan ? (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Recommended input</span>
                  <span className="font-semibold">
                    {formatNumber(procurementPlan.recommendedInputQty, 2)}
                    {` ${procurementPlan.recommendedInputUnit}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Recommended batches</span>
                  <span className="font-semibold">
                    {formatNumber(procurementPlan.recommendedBatches)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Portions covered</span>
                  <span className="font-semibold">
                    {formatNumber(procurementPlan.expectedPortionsCovered)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Coverage window</span>
                  <span className="font-semibold">
                    {formatNumber(procurementPlan.coverageDays, 1)} days
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Next availability {procurementPlan.nextAvailabilityDate || "—"}; review on
                  {" "}
                  {procurementPlan.reviewDate || "—"}.
                </div>
                {procurementPlan.warnings.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-xs text-amber-600">
                    {procurementPlan.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Provide a target and portion details to generate a procurement plan.
              </div>
            )}

            <Button
              type="button"
              disabled={!procurementPlan}
              onClick={() => {
                if (!selectedReadyMade || !procurementPlan) return;
                addRecord({
                  ingredientName: selectedReadyMade.name,
                  prepDescription: "Predictive procurement draft",
                  method: "Predictive procurement draft",
                  notes: `Plan logged ${new Date().toISOString().slice(0, 10)}`,
                  inputQty: selectedReadyMade.standardBatchQty,
                  inputUnit: selectedReadyMade.standardBatchUnit,
                  outputQty: procurementPlan.expectedPortionsCovered * portionSize,
                  outputUnit: portionUnit.toUpperCase(),
                  yieldPercent: readyMadeYield,
                  itemType: "readyMade",
                  readyMadeId: selectedReadyMade.id,
                  readyMadeName: selectedReadyMade.name,
                  outputPortions: procurementPlan.expectedPortionsCovered,
                  portionSize,
                  portionUnit: portionUnit.toUpperCase(),
                  batchSize: selectedReadyMade.standardBatchQty,
                  batchUnit: selectedReadyMade.standardBatchUnit,
                  forecastPortions: targetPortions,
                  shrinkageBufferPercent: bufferPercent,
                  leadTimeDays,
                  demandHistory: readyMadeHistory,
                  procurementPlan,
                });
              }}
              variant="outline"
              className="w-full"
            >
              Log plan as draft yield
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top performing ingredients</CardTitle>
          <CardDescription>
            Quick view of the most validated ingredients and prep methods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topIngredients.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              Record multiple yield tests to surface leading ingredients.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.topIngredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{ingredient.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {ingredient.tests} tests · Avg {formatPercent(ingredient.averageYield)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(ingredient.lastRecordedAt), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </Card>
  );
}
