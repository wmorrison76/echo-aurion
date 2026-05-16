/** * Scenario Compare * Lets managers see KPI deltas quickly (revenue, labor hours, labor%). * Supports up to 5 scenarios side-by-side. */
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Loader } from "lucide-react";
import type {
  ScenarioSpec,
  ScenarioResult,
} from "../../../shared/types/forecast";
interface Props {
  org_id: string;
  outlet_id: string;
  dept_id: string;
  horizon?: 7 | 30 | 90;
}
export const ScenarioCompare: React.FC<Props> = ({
  org_id,
  outlet_id,
  dept_id,
  horizon = 7,
}) => {
  const [scenarios, setScenarios] = React.useState<ScenarioSpec[]>([
    {
      id: "base",
      label: "Baseline",
      sales_growth_pct: 0,
      wage_increase_pct: 0,
      staffing_delta_hours: 0,
    },
    {
      id: "s1",
      label: "Growth +5%",
      sales_growth_pct: 5,
      wage_increase_pct: 0,
      staffing_delta_hours: 0,
    },
    {
      id: "s2",
      label: "Staff +12h",
      sales_growth_pct: 0,
      wage_increase_pct: 0,
      staffing_delta_hours: 12,
    },
  ]);
  const [result, setResult] = React.useState<ScenarioResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const handleRun = async () => {
    if (scenarios.length === 0 || scenarios.length > 5) {
      setError("Provide between 1 and 5 scenarios");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forecast/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base: { org_id, outlet_id, dept_id, horizon },
          specs: scenarios,
        }),
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      const data: ScenarioResult = await res.json();
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Scenario error:", err);
    } finally {
      setLoading(false);
    }
  };
  const updateScenario = (
    id: string,
    field: keyof Omit<ScenarioSpec, "id" | "label">,
    value: number,
  ) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
  };
  const addScenario = () => {
    if (scenarios.length >= 5) {
      setError("Maximum 5 scenarios");
      return;
    }
    const newId = `s${Date.now()}`;
    setScenarios((prev) => [
      ...prev,
      {
        id: newId,
        label: `Scenario ${prev.length}`,
        sales_growth_pct: 0,
        wage_increase_pct: 0,
        staffing_delta_hours: 0,
      },
    ]);
  };
  const removeScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };
  return (
    <Card className="p-6 space-y-4">
      {" "}
      <div className="space-y-2">
        {" "}
        <h2 className="text-2xl font-bold">Scenario Comparison</h2>{" "}
        <p className="text-sm text-muted-foreground">
          {" "}
          Build up to 5 scenarios and compare KPIs side-by-side{" "}
        </p>{" "}
      </div>{" "}
      {/* Error State */}{" "}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {" "}
          {error}{" "}
        </div>
      )}{" "}
      {/* Scenario Builder */}{" "}
      <div className="space-y-3 border-b pb-4">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <h3 className="font-semibold">
            Scenarios ({scenarios.length}/5)
          </h3>{" "}
          <Button
            variant="outline"
            size="sm"
            onClick={addScenario}
            disabled={scenarios.length >= 5}
            className="gap-2"
          >
            {" "}
            <Plus size={16} /> Add{" "}
          </Button>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {" "}
          {scenarios.map((scenario) => (
            <Card key={scenario.id} className="p-4 space-y-3">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <input
                  type="text"
                  value={scenario.label}
                  onChange={(e) => {
                    setScenarios((prev) =>
                      prev.map((s) =>
                        s.id === scenario.id
                          ? { ...s, label: e.target.value }
                          : s,
                      ),
                    );
                  }}
                  className="font-semibold bg-transparent border-none outline-none flex-1"
                />{" "}
                {scenario.id !== "base" && (
                  <button
                    onClick={() => removeScenario(scenario.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {" "}
                    <X size={16} />{" "}
                  </button>
                )}{" "}
              </div>{" "}
              <div className="space-y-2">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Sales Growth %{" "}
                  </label>{" "}
                  <Input
                    type="number"
                    value={scenario.sales_growth_pct || 0}
                    onChange={(e) =>
                      updateScenario(
                        scenario.id,
                        "sales_growth_pct",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="0"
                    className="text-sm"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Wage Increase %{" "}
                  </label>{" "}
                  <Input
                    type="number"
                    value={scenario.wage_increase_pct || 0}
                    onChange={(e) =>
                      updateScenario(
                        scenario.id,
                        "wage_increase_pct",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="0"
                    className="text-sm"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Staffing Δ Hours{" "}
                  </label>{" "}
                  <Input
                    type="number"
                    value={scenario.staffing_delta_hours || 0}
                    onChange={(e) =>
                      updateScenario(
                        scenario.id,
                        "staffing_delta_hours",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="0"
                    className="text-sm"
                  />{" "}
                </div>{" "}
              </div>{" "}
            </Card>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Run Button */}{" "}
      <Button onClick={handleRun} disabled={loading} className="w-full gap-2">
        {" "}
        {loading ? (
          <>
            {" "}
            <Loader className="animate-spin" size={16} /> Comparing...{" "}
          </>
        ) : (
          "Run Comparison"
        )}{" "}
      </Button>{" "}
      {/* Results */}{" "}
      {result && (
        <div className="space-y-4 border-t pt-4">
          {" "}
          <h3 className="font-semibold">Results</h3>{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {result.outcomes.map((outcome) => {
              const isBase = outcome.id === "base";
              const baseRevenue = result.base.totals.revenue || 1;
              const varianceColor =
                outcome.kpis.variance_vs_base >= 0
                  ? "text-green-600"
                  : "text-red-600";
              return (
                <Card
                  key={outcome.id}
                  className={`p-4 space-y-3 ${isBase ? "border-primary border-2" : ""}`}
                >
                  {" "}
                  <div className="space-y-1">
                    {" "}
                    <h4 className="font-semibold">{outcome.label}</h4>{" "}
                    {isBase && (
                      <div className="text-xs text-primary font-medium">
                        {" "}
                        Baseline{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {" "}
                    <div>
                      {" "}
                      <div className="text-muted-foreground text-xs">
                        Revenue
                      </div>{" "}
                      <div className="font-medium">
                        {" "}
                        $
                        {outcome.forecast.totals.revenue.toLocaleString(
                          undefined,
                          { maximumFractionDigits: 0 },
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <div className="text-muted-foreground text-xs">
                        Hours
                      </div>{" "}
                      <div className="font-medium">
                        {" "}
                        {outcome.forecast.totals.labor_hours.toFixed(1)}h{" "}
                      </div>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <div className="text-muted-foreground text-xs">
                        Avg SPLH
                      </div>{" "}
                      <div className="font-medium">
                        {" "}
                        ${outcome.forecast.totals.avg_splh.toFixed(2)}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <div className="text-muted-foreground text-xs">
                        Labor %
                      </div>{" "}
                      <div className="font-medium">
                        {" "}
                        {outcome.kpis.labor_pct.toFixed(1)}%{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  {!isBase && (
                    <div
                      className={`bg-muted p-2 rounded text-sm font-semibold ${varianceColor}`}
                    >
                      {" "}
                      {outcome.kpis.variance_vs_base >= 0 ? "+" : ""}{" "}
                      {outcome.kpis.variance_vs_base.toFixed(1)}% vs Base{" "}
                    </div>
                  )}{" "}
                </Card>
              );
            })}{" "}
          </div>{" "}
          {/* Summary */}{" "}
          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            {" "}
            <div className="font-semibold">Summary</div>{" "}
            <div className="grid grid-cols-2 gap-4">
              {" "}
              <div>
                {" "}
                <div className="text-muted-foreground">Base Revenue</div>{" "}
                <div className="font-medium">
                  {" "}
                  $
                  {result.base.totals.revenue.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                </div>{" "}
              </div>{" "}
              <div>
                {" "}
                <div className="text-muted-foreground">Base Avg SPLH</div>{" "}
                <div className="font-medium">
                  {" "}
                  ${result.base.totals.avg_splh.toFixed(2)}{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Empty State */}{" "}
      {!result && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          {" "}
          <p>Build your scenarios above, then click"Run Comparison"</p>{" "}
        </div>
      )}{" "}
    </Card>
  );
};
