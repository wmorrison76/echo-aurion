import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCommitteeConfig } from "@/hooks/use-committee-config";
import {
  DefaultCommitteeConfig,
  resolveCommitteeConfig,
  type CommitteeConfig,
  type CommitteeMode,
  type CommitteeWeights,
} from "@modules/Maestro/committee";
const weightLabels: Record<keyof CommitteeWeights, string> = {
  wCost: "Total Spend",
  wWaste: "Projected Waste",
  wStockout: "Stockout Risk",
  wShelf: "Shelf-Life",
  wQc: "QC Risk",
  wLabor: "Labor",
};
type CommitteeDraft = Pick<
  CommitteeConfig,
  | "mode"
  | "enforceHardStops"
  | "underOrderThreshold"
  | "escalationSpendDeltaPct"
> & { weights: CommitteeWeights };
function toDraft(config: CommitteeConfig): CommitteeDraft {
  return {
    mode: config.mode,
    enforceHardStops: config.enforceHardStops,
    underOrderThreshold: Number(config.underOrderThreshold),
    escalationSpendDeltaPct: Number(config.escalationSpendDeltaPct),
    weights: { ...config.weights },
  };
}
function formatPercent(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}
function sanitizeNumber(value: string, fallback: number): number {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function buildOverrides(draft: CommitteeDraft): Partial<CommitteeConfig> {
  const overrides: Partial<CommitteeConfig> = {};
  if (draft.mode !== DefaultCommitteeConfig.mode) {
    overrides.mode = draft.mode;
  }
  if (draft.enforceHardStops !== DefaultCommitteeConfig.enforceHardStops) {
    overrides.enforceHardStops = draft.enforceHardStops;
  }
  if (
    Math.abs(
      draft.underOrderThreshold - DefaultCommitteeConfig.underOrderThreshold,
    ) > 1e-6
  ) {
    overrides.underOrderThreshold = draft.underOrderThreshold;
  }
  if (
    Math.abs(
      draft.escalationSpendDeltaPct -
        DefaultCommitteeConfig.escalationSpendDeltaPct,
    ) > 1e-6
  ) {
    overrides.escalationSpendDeltaPct = draft.escalationSpendDeltaPct;
  }
  const weightsChanged = (
    Object.keys(draft.weights) as Array<keyof CommitteeWeights>
  ).some(
    (key) =>
      Math.abs(draft.weights[key] - DefaultCommitteeConfig.weights[key]) > 1e-6,
  );
  if (weightsChanged) {
    overrides.weights = { ...draft.weights };
  }
  return overrides;
}
function renderOverridesSnippet(overrides: Partial<CommitteeConfig>): string {
  if (!Object.keys(overrides).length) {
    return "const config = resolveCommitteeConfig();";
  }
  const lines: string[] = [
    "const config = resolveCommitteeConfig({",
    " overrides: {",
  ];
  if (overrides.mode) {
    lines.push(` mode:"${overrides.mode}",`);
  }
  if (overrides.enforceHardStops != null) {
    lines.push(` enforceHardStops: ${overrides.enforceHardStops},`);
  }
  if (overrides.underOrderThreshold != null) {
    lines.push(
      ` underOrderThreshold: ${overrides.underOrderThreshold.toFixed(6)},`,
    );
  }
  if (overrides.escalationSpendDeltaPct != null) {
    lines.push(
      ` escalationSpendDeltaPct: ${overrides.escalationSpendDeltaPct.toFixed(4)},`,
    );
  }
  if (overrides.weights) {
    lines.push(" weights: {");
    (Object.keys(overrides.weights) as Array<keyof CommitteeWeights>).forEach(
      (key) => {
        const value = overrides.weights![key];
        lines.push(` ${key}: ${value.toFixed(4)},`);
      },
    );
    lines.push(" },");
  }
  lines.push(" },", "});");
  return lines.join("\n");
}
export function CommitteeConfigPanel() {
  const resolved = useCommitteeConfig();
  const [draft, setDraft] = useState<CommitteeDraft>(() => toDraft(resolved));
  useEffect(() => {
    setDraft(toDraft(resolved));
  }, [
    resolved.mode,
    resolved.enforceHardStops,
    resolved.underOrderThreshold,
    resolved.escalationSpendDeltaPct,
    resolved.weights.wCost,
    resolved.weights.wWaste,
    resolved.weights.wStockout,
    resolved.weights.wShelf,
    resolved.weights.wQc,
    resolved.weights.wLabor,
  ]);
  const weightTotal = useMemo(() => {
    return (Object.values(draft.weights) as number[]).reduce(
      (sum, value) => sum + value,
      0,
    );
  }, [draft.weights]);
  const overrides = useMemo(() => buildOverrides(draft), [draft]);
  const compiledConfig = useMemo(() => {
    return resolveCommitteeConfig({ overrides });
  }, [overrides]);
  const configSnippet = useMemo(
    () => renderOverridesSnippet(overrides),
    [overrides],
  );
  const handleWeightChange = (key: keyof CommitteeWeights, value: string) => {
    setDraft((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: sanitizeNumber(value, prev.weights[key]),
      },
    }));
  };
  const resetToDefaults = () => {
    setDraft(toDraft(DefaultCommitteeConfig));
  };
  const applyResolved = () => {
    setDraft(toDraft(resolved));
  };
  return (
    <Card className="border border-sky-500/20 bg-card">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="text-lg text-sky-100">
          Committee Configuration
        </CardTitle>{" "}
        <CardDescription className="text-sky-200/80">
          {" "}
          Adjust orchestration mode, guardrails, and scoring weights before
          calling{" "}
          <span className="ml-1 font-semibold text-sky-100">runCommittee</span>
          .{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        <div className="grid gap-4 md:grid-cols-2">
          {" "}
          <div className="space-y-2">
            {" "}
            <Label className="text-xs uppercase tracking-[0.28em] text-slate-400">
              {" "}
              Mode{" "}
            </Label>{" "}
            <Select
              value={draft.mode}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, mode: value as CommitteeMode }))
              }
            >
              {" "}
              <SelectTrigger>
                {" "}
                <SelectValue placeholder="Select committee mode" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="dual">
                  {" "}
                  Dual-Core • Planner + Risk{" "}
                </SelectItem>{" "}
                <SelectItem value="triple">
                  {" "}
                  Triple-Core • Planner + Risk + Historian{" "}
                </SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
            <p className="text-xs text-slate-400">
              {" "}
              Dual mode runs risk review only. Triple mode adds the historian
              agent to adjust based on uptake and waste history.{" "}
            </p>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label className="text-xs uppercase tracking-[0.28em] text-slate-400">
              {" "}
              Hard Stops{" "}
            </Label>{" "}
            <div className="flex items-center justify-between rounded-md border border-slate-800/80 bg-surface px-3 py-2">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-medium text-slate-100">
                  Enforce policy stops
                </p>{" "}
                <p className="text-xs text-slate-400">
                  {" "}
                  Blocks the run whenever critical policies fail instead of
                  issuing soft fixes.{" "}
                </p>{" "}
              </div>{" "}
              <Switch
                checked={draft.enforceHardStops}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, enforceHardStops: checked }))
                }
              />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-2">
          {" "}
          <div className="space-y-2">
            {" "}
            <Label className="text-xs uppercase tracking-[0.28em] text-slate-400">
              {" "}
              Under-Order Threshold (Stockout Probability){" "}
            </Label>{" "}
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={draft.underOrderThreshold}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  underOrderThreshold: sanitizeNumber(
                    event.target.value,
                    prev.underOrderThreshold,
                  ),
                }))
              }
            />{" "}
            <p className="text-xs text-slate-400">
              {" "}
              Current tolerance:{" "}
              <span className="font-semibold text-slate-200">
                {formatPercent(draft.underOrderThreshold, 3)}
              </span>{" "}
            </p>{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <Label className="text-xs uppercase tracking-[0.28em] text-slate-400">
              {" "}
              Escalation Spend Delta{" "}
            </Label>{" "}
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={draft.escalationSpendDeltaPct}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  escalationSpendDeltaPct: sanitizeNumber(
                    event.target.value,
                    prev.escalationSpendDeltaPct,
                  ),
                }))
              }
            />{" "}
            <p className="text-xs text-slate-400">
              {" "}
              Escalates decisions when spend exceeds baseline by{" "}
              <span className="ml-1 font-semibold text-slate-200">
                {" "}
                {formatPercent(draft.escalationSpendDeltaPct)}{" "}
              </span>{" "}
              .{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="rounded-lg border border-slate-800/60 bg-surface p-4">
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <h4 className="text-sm font-semibold text-slate-100">
                Scoring Weights
              </h4>{" "}
              <p className="text-xs text-slate-400">
                {" "}
                Weights determine how metrics contribute to the composite
                score.{" "}
              </p>{" "}
            </div>{" "}
            <Badge
              variant={
                Math.abs(weightTotal - 1) < 0.001 ? "outline" : "destructive"
              }
              className={
                Math.abs(weightTotal - 1) < 0.001
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-100"
              }
            >
              {" "}
              Sum {weightTotal.toFixed(2)}{" "}
            </Badge>{" "}
          </div>{" "}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {" "}
            {(Object.keys(draft.weights) as Array<keyof CommitteeWeights>).map(
              (key) => (
                <div key={key} className="space-y-1.5">
                  {" "}
                  <Label className="text-xs font-medium text-slate-200">
                    {" "}
                    {weightLabels[key]}{" "}
                  </Label>{" "}
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={draft.weights[key]}
                    onChange={(event) =>
                      handleWeightChange(key, event.target.value)
                    }
                  />{" "}
                </div>
              ),
            )}{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),auto]">
          {" "}
          <div className="space-y-2">
            {" "}
            <Label className="text-xs uppercase tracking-[0.28em] text-slate-400">
              {" "}
              Config Preview{" "}
            </Label>{" "}
            <pre className="max-h-64 overflow-auto rounded-md border border-slate-800/80 bg-card p-3 text-xs leading-relaxed text-slate-200">
              {configSnippet}{" "}
            </pre>{" "}
            <p className="text-xs text-slate-400">
              {" "}
              Resolved output:{" "}
              <span className="ml-1 font-semibold text-slate-200">
                {" "}
                mode={compiledConfig.mode}{" "}
              </span>{" "}
              ,{" "}
              <span className="ml-1 font-semibold text-slate-200">
                {" "}
                hardStops={compiledConfig.enforceHardStops ? "on" : "off"}{" "}
              </span>{" "}
              , score weights sum {weightTotal.toFixed(2)}.{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex flex-col gap-2">
            {" "}
            <Button variant="secondary" onClick={applyResolved}>
              {" "}
              Sync with Env Values{" "}
            </Button>{" "}
            <Button variant="outline" onClick={resetToDefaults}>
              {" "}
              Reset to Defaults{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
