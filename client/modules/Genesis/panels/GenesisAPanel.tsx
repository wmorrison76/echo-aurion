import React, { useEffect, useMemo, useState } from "react";
import type {
  ForecastHorizon,
  GenesisAProfile,
  OperationScale,
} from "@/../shared/types/genesis";
import {
  getGenesisA,
  HORIZON_LABELS,
  saveGenesisA,
  SCALE_LABELS,
} from "@/lib/genesis-store";
import { osBus } from "@/lib/os-bus";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
function clampInt(v: number, min: number, max: number) {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}
function normalizeOptionalText(value: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}
function normalizeOptionalDate(value: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}
export default function GenesisAPanel() {
  const { t } = useI18n();
  const [form, setForm] = useState<GenesisAProfile>(() => getGenesisA());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    setForm(getGenesisA());
  }, []);
  const scaleOptions = useMemo(
    () => Object.keys(SCALE_LABELS) as OperationScale[],
    [],
  );
  const horizonOptions = useMemo(
    () => Object.keys(HORIZON_LABELS) as ForecastHorizon[],
    [],
  );
  const recommendedHorizon = useMemo<ForecastHorizon>(() => {
    if (form.scale === "PORTFOLIO") return "DAYS_90";
    if (form.scale === "RESORT") return "DAYS_60";
    if (form.scale === "MULTI_OUTLET") return "DAYS_30";
    return "DAYS_30";
  }, [form.scale]);
  function update<K extends keyof GenesisAProfile>(
    key: K,
    value: GenesisAProfile[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function onSave() {
    const kitchensCount = clampInt(form.kitchensCount, 1, 50);
    const propertyName = normalizeOptionalText(form.propertyName);
    const goLiveDateISO = normalizeOptionalDate(form.goLiveDateISO);
    const {
      createdAtISO: _createdAtISO,
      updatedAtISO: _updatedAtISO,
      ...rest
    } = form;
    const saved = saveGenesisA({
      ...rest,
      version: 1,
      kitchensCount,
      propertyName,
      goLiveDateISO,
    });
    setForm(saved);
    setSavedAt(new Date().toLocaleString());
    osBus.emit("genesis:a_saved", saved);
  }
  return (
    <div className="p-4 space-y-4">
      {" "}
      <div className="space-y-1">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold">
              {t("module.genesis-a.title")}
            </div>{" "}
            <div className="text-sm opacity-70">
              {" "}
              {t("module.genesis-a.description")}{" "}
            </div>{" "}
          </div>{" "}
          <ModuleChatButton
            moduleId="genesis-a"
            moduleName={t("module.genesis-a.title")}
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {" "}
        <div className="space-y-1">
          {" "}
          <label className="text-sm font-medium">
            {" "}
            Property Name (optional){" "}
          </label>{" "}
          <input
            className="w-full rounded-md border px-3 py-2 bg-transparent"
            value={form.propertyName ?? ""}
            onChange={(e) => update("propertyName", e.target.value || null)}
            placeholder="Pier Sixty-Six"
          />{" "}
        </div>{" "}
        <div className="space-y-1">
          {" "}
          <label className="text-sm font-medium">
            Go-Live Date (optional)
          </label>{" "}
          <input
            type="date"
            className="w-full rounded-md border px-3 py-2 bg-transparent"
            value={form.goLiveDateISO ?? ""}
            onChange={(e) => update("goLiveDateISO", e.target.value || null)}
          />{" "}
        </div>{" "}
        <div className="space-y-1">
          {" "}
          <label className="text-sm font-medium">Operation Scale</label>{" "}
          <select
            className="w-full rounded-md border px-3 py-2 bg-transparent"
            value={form.scale}
            onChange={(e) => update("scale", e.target.value as OperationScale)}
          >
            {" "}
            {scaleOptions.map((k) => (
              <option key={k} value={k}>
                {" "}
                {SCALE_LABELS[k]}{" "}
              </option>
            ))}{" "}
          </select>{" "}
          <div className="text-xs opacity-70">
            {" "}
            Recommended forecast horizon:{""}{" "}
            <span className="font-medium">
              {" "}
              {HORIZON_LABELS[recommendedHorizon]}{" "}
            </span>{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-1">
          {" "}
          <label className="text-sm font-medium">Kitchens Count</label>{" "}
          <input
            type="number"
            min={1}
            max={50}
            className="w-full rounded-md border px-3 py-2 bg-transparent"
            value={form.kitchensCount}
            onChange={(e) =>
              update(
                "kitchensCount",
                clampInt(parseInt(e.target.value || "1", 10), 1, 50),
              )
            }
          />{" "}
          <div className="text-xs opacity-70">
            {" "}
            Includes banquets, pastry, IRD, outlets with production.{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-2 md:col-span-2">
          {" "}
          <div className="text-sm font-medium">Overnight Production</div>{" "}
          <div className="flex flex-wrap gap-3">
            {" "}
            <label className="inline-flex items-center gap-2">
              {" "}
              <input
                type="checkbox"
                checked={form.hasOvernightBaker}
                onChange={(e) => update("hasOvernightBaker", e.target.checked)}
              />{" "}
              <span>Overnight Baker</span>{" "}
            </label>{" "}
            <label className="inline-flex items-center gap-2">
              {" "}
              <input
                type="checkbox"
                checked={form.hasOvernightCook}
                onChange={(e) => update("hasOvernightCook", e.target.checked)}
              />{" "}
              <span>Overnight Cook</span>{" "}
            </label>{" "}
          </div>{" "}
          <div className="text-xs opacity-70">
            {" "}
            This informs inventory cadence + future par/lead-time logic (Phase
            D/E).{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-1">
          {" "}
          <label className="text-sm font-medium">
            {" "}
            Default Forecast Horizon{" "}
          </label>{" "}
          <select
            className="w-full rounded-md border px-3 py-2 bg-transparent"
            value={form.defaultForecastHorizon}
            onChange={(e) =>
              update(
                "defaultForecastHorizon",
                e.target.value as ForecastHorizon,
              )
            }
          >
            {" "}
            {horizonOptions.map((k) => (
              <option key={k} value={k}>
                {" "}
                {HORIZON_LABELS[k]}{" "}
              </option>
            ))}{" "}
          </select>{" "}
          <div className="text-xs opacity-70">
            {" "}
            Used by Group Intelligence + procurement horizon defaults (later
            phases).{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex items-center gap-3">
        {" "}
        <button
          className="rounded-md border px-4 py-2 hover:opacity-90"
          onClick={onSave}
        >
          {" "}
          Save Genesis A{" "}
        </button>{" "}
        {savedAt ? (
          <div className="text-xs opacity-70">Saved: {savedAt}</div>
        ) : (
          <div className="text-xs opacity-60">Not saved yet</div>
        )}{" "}
      </div>{" "}
      <div className="text-xs opacity-60">
        {" "}
        Stored locally as <span className="font-mono">
          luccca:genesis:A:v1
        </span>{" "}
        . Emits <span className="font-mono">genesis:a_saved</span>.{" "}
      </div>{" "}
    </div>
  );
}
