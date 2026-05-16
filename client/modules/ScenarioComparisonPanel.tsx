/******************************************************************** * LUCCCA — BUILD 46 * ScenarioComparisonPanel * * PURPOSE: * - Visual A vs B comparison for EC / Maestro * - Compare: Conflicts, Cost, Labor hours, Risk, Health score *********************************************************************/ import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/glass";
interface ScenarioData {
  headcount?: number;
  totalLaborHours?: number;
  laborCost?: number;
  riskScore?: number;
  healthScore?: number;
  conflictCount?: number;
  slaBreaches?: number;
}
interface ScenarioComparisonPanelProps {
  scenarioA?: ScenarioData;
  scenarioB?: ScenarioData;
  title?: string;
}
const ScenarioComparisonPanel: React.FC<ScenarioComparisonPanelProps> = ({
  scenarioA = {},
  scenarioB = {},
  title = "Scenario Comparison",
}) => {
  const getDelta = (
    newVal: number | undefined,
    oldVal: number | undefined,
  ): { value: number; direction: "up" | "down" | "neutral" } | null => {
    if (newVal === undefined || oldVal === undefined) return null;
    const delta = newVal - oldVal;
    if (Math.abs(delta) < 0.01) return { value: 0, direction: "neutral" };
    return { value: Math.abs(delta), direction: delta > 0 ? "up" : "down" };
  };
  return (
    <div className="p-4 w-full h-full overflow-y-auto bg-background dark:bg-surface font-sans text-sm space-y-4">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>{" "}
      </div>{" "}
      <div className="grid grid-cols-2 gap-3">
        {" "}
        <ScenarioCard title="Current Plan" data={scenarioA} />{" "}
        <ScenarioCard title="Proposed Plan" data={scenarioB} />{" "}
      </div>{" "}
      {/* Delta Summary */}{" "}
      <Card className="border border-slate-200 dark:border-border">
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <h3 className="font-semibold text-sm text-foreground">
            {" "}
            Impact Analysis{" "}
          </h3>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-2">
          {" "}
          <DeltaRow
            label="Headcount"
            old={scenarioA.headcount}
            new={scenarioB.headcount}
            unit="people"
          />{" "}
          <DeltaRow
            label="Labor Hours"
            old={scenarioA.totalLaborHours}
            new={scenarioB.totalLaborHours}
            unit="hrs"
          />{" "}
          <DeltaRow
            label="Labor Cost"
            old={scenarioA.laborCost}
            new={scenarioB.laborCost}
            unit="$"
          />{" "}
          <DeltaRow
            label="Risk Score"
            old={scenarioA.riskScore}
            new={scenarioB.riskScore}
            unit="pts"
          />{" "}
          <DeltaRow
            label="Health Score"
            old={scenarioA.healthScore}
            new={scenarioB.healthScore}
            unit="pts"
          />{" "}
          <DeltaRow
            label="Conflicts"
            old={scenarioA.conflictCount}
            new={scenarioB.conflictCount}
            unit="count"
            lower_is_better
          />{" "}
          <DeltaRow
            label="SLA Breaches"
            old={scenarioA.slaBreaches}
            new={scenarioB.slaBreaches}
            unit="count"
            lower_is_better
          />{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Recommendation */}{" "}
      <RecommendationBox scenarioA={scenarioA} scenarioB={scenarioB} />{" "}
    </div>
  );
};
function ScenarioCard({ title, data }: { title: string; data: ScenarioData }) {
  return (
    <Card className="border border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/50">
      {" "}
      <CardHeader className="pb-2">
        {" "}
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        <Row label="Headcount" value={data.headcount} />{" "}
        <Row label="Labor Hours" value={data.totalLaborHours} />{" "}
        <Row
          label="Labor Cost"
          value={data.laborCost ? `$${data.laborCost.toFixed(0)}` : undefined}
        />{" "}
        <Row label="Risk Score" value={data.riskScore?.toFixed(1)} />{" "}
        <Row label="Health Score" value={data.healthScore?.toFixed(1)} />{" "}
        <Row label="Conflicts" value={data.conflictCount} />{" "}
        <Row label="SLA Breaches" value={data.slaBreaches} />{" "}
      </CardContent>{" "}
    </Card>
  );
}
function Row({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="flex justify-between text-xs text-foreground/80">
      {" "}
      <span className="font-medium">{label}</span>{" "}
      <span className="font-semibold text-foreground">
        {" "}
        {value !== undefined ? value : "—"}{" "}
      </span>{" "}
    </div>
  );
}
function DeltaRow({
  label,
  old,
  new: newVal,
  unit,
  lower_is_better = false,
}: {
  label: string;
  old: number | undefined;
  new: number | undefined;
  unit: string;
  lower_is_better?: boolean;
}) {
  if (old === undefined || newVal === undefined) {
    return null;
  }
  const delta = newVal - old;
  const absDelta = Math.abs(delta);
  const pctChange = ((delta / old) * 100).toFixed(1);
  let direction: "up" | "down" | "neutral" = "neutral";
  let bgColor = "bg-slate-50 dark:bg-slate-800";
  let icon = null;
  if (Math.abs(delta) < 0.01) {
    direction = "neutral";
    bgColor = "bg-slate-50 dark:bg-slate-800";
    icon = <Minus className="w-3 h-3 text-muted-foreground" />;
  } else if (
    (delta > 0 && !lower_is_better) ||
    (delta < 0 && lower_is_better)
  ) {
    direction = "up";
    bgColor =
      "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800";
    icon = <TrendingUp className="w-3 h-3 text-green-600" />;
  } else {
    direction = "down";
    bgColor =
      "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800";
    icon = <TrendingDown className="w-3 h-3 text-red-600" />;
  }
  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 rounded text-xs",
        bgColor,
      )}
    >
      {" "}
      <span className="font-medium text-foreground">{label}</span>{" "}
      <div className="flex items-center gap-1.5">
        {" "}
        {icon}{" "}
        <span className="font-semibold text-foreground">
          {" "}
          {delta >= 0 ? "+" : ""} {absDelta.toFixed(1)} {unit}{" "}
        </span>{" "}
        <span className="text-foreground/60">({pctChange}%)</span>{" "}
      </div>{" "}
    </div>
  );
}
function RecommendationBox({
  scenarioA,
  scenarioB,
}: {
  scenarioA: ScenarioData;
  scenarioB: ScenarioData;
}) {
  const recommendations: string[] = []; // Cost analysis if (scenarioB.laborCost !== undefined && scenarioA.laborCost !== undefined) { if (scenarioB.laborCost < scenarioA.laborCost) { const savings = scenarioA.laborCost - scenarioB.laborCost; recommendations.push( `💰 Proposed plan saves $${savings.toFixed(0)} in labor costs` ); } } // Risk analysis if (scenarioB.riskScore !== undefined && scenarioA.riskScore !== undefined) { if (scenarioB.riskScore < scenarioA.riskScore) { recommendations.push( `✅ Proposed plan reduces operational risk` ); } else if (scenarioB.riskScore > scenarioA.riskScore) { recommendations.push( `⚠️ Proposed plan increases operational risk` ); } } // Conflicts analysis if ( scenarioB.conflictCount !== undefined && scenarioA.conflictCount !== undefined ) { if (scenarioB.conflictCount < scenarioA.conflictCount) { recommendations.push( `🎯 Proposed plan resolves ${scenarioA.conflictCount - scenarioB.conflictCount} conflict(s)` ); } else if (scenarioB.conflictCount > scenarioA.conflictCount) { recommendations.push( `❌ Proposed plan creates ${scenarioB.conflictCount - scenarioA.conflictCount} new conflict(s)` ); } } if (recommendations.length === 0) { recommendations.push("No significant differences detected"); } return ( <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"> <h4 className="font-semibold text-sm text-foreground mb-2"> Recommendation </h4> <div className="space-y-1"> {recommendations.map((rec, idx) => ( <p key={idx} className="text-xs text-foreground/80"> {rec} </p> ))} </div> </div> );
}
export default ScenarioComparisonPanel;
