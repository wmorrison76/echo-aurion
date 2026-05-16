import React, { useEffect, useMemo, useState } from "react";
import type {
  CostAttributionMode,
  GenesisBConfig,
  InventoryCadence,
  LocationKind,
} from "@/../shared/types/genesis-b";
import {
  APN_MODE_LABELS,
  CADENCE_LABELS,
  getGenesisB,
  KIND_LABELS,
  saveGenesisB,
} from "@/lib/genesis-b-store";
import { osBus } from "@/lib/os-bus";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
function clamp(v: number, min: number, max: number) {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}
function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}
export default function GenesisBPanel() {
  const { t } = useI18n();
  const [cfg, setCfg] = useState<GenesisBConfig>(() => getGenesisB());
  const [tab, setTab] = useState<"NODES" | "FULFILL" | "APN" | "CADENCE">(
    "NODES",
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => {
    setCfg(getGenesisB());
  }, []);
  const locationOptions = useMemo(() => cfg.locations, [cfg.locations]);
  const outlets = useMemo(
    () => cfg.locations.filter((l) => l.kind === "OUTLET"),
    [cfg.locations],
  );
  const commissaries = useMemo(
    () =>
      cfg.locations.filter((l) => l.canActAsCommissary || l.kind !== "OUTLET"),
    [cfg.locations],
  );
  const kindKeys = useMemo(
    () => Object.keys(KIND_LABELS) as LocationKind[],
    [],
  );
  const cadenceKeys = useMemo(
    () => Object.keys(CADENCE_LABELS) as InventoryCadence[],
    [],
  );
  const apnKeys = useMemo(
    () => Object.keys(APN_MODE_LABELS) as CostAttributionMode[],
    [],
  );
  function updateCfg(next: GenesisBConfig) {
    setCfg(next);
  }
  function save() {
    const {
      createdAtISO: _createdAtISO,
      updatedAtISO: _updatedAtISO,
      ...payload
    } = cfg;
    const saved = saveGenesisB(payload);
    setCfg(saved);
    setSavedAt(new Date().toLocaleString());
    osBus.emit("genesis:b_saved", saved);
  }
  function toggleRule(idx: number, enabled: boolean) {
    updateCfg({
      ...cfg,
      fulfillmentRules: cfg.fulfillmentRules.map((r, i) =>
        i === idx ? { ...r, isEnabled: enabled } : r,
      ),
    });
  }
  function updateRule(
    idx: number,
    patch: Partial<GenesisBConfig["fulfillmentRules"][number]>,
  ) {
    updateCfg({
      ...cfg,
      fulfillmentRules: cfg.fulfillmentRules.map((r, i) =>
        i === idx ? { ...r, ...patch } : r,
      ),
    });
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
              {t("module.genesis-b.title")}
            </div>{" "}
            <div className="text-sm opacity-70">
              {" "}
              {t("module.genesis-b.description")}{" "}
            </div>{" "}
          </div>{" "}
          <ModuleChatButton
            moduleId="genesis-b"
            moduleName={t("module.genesis-b.title")}
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex flex-wrap gap-2">
        {" "}
        {(["NODES", "FULFILL", "APN", "CADENCE"] as const).map((t) => (
          <button
            key={t}
            className={`rounded-md border px-3 py-1 text-sm ${tab === t ? "opacity-100" : "opacity-70"}`}
            onClick={() => setTab(t)}
          >
            {" "}
            {t === "NODES"
              ? "Nodes"
              : t === "FULFILL"
                ? "Fulfillment"
                : t === "APN"
                  ? "APN Rules"
                  : "Cadence"}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {tab === "NODES" && (
        <div className="space-y-3">
          {" "}
          <div className="text-sm font-medium">Locations & Nodes</div>{" "}
          <div className="text-xs opacity-70">
            {" "}
            These are your supply/production nodes. Any outlet can be toggled to
            act as a commissary later.{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            {cfg.locations.map((loc, idx) => (
              <div key={loc.id} className="rounded-md border p-3 space-y-2">
                {" "}
                <div className="flex flex-wrap items-center gap-2">
                  {" "}
                  <input
                    className="rounded-md border px-2 py-1 bg-transparent"
                    value={loc.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      updateCfg({
                        ...cfg,
                        locations: cfg.locations.map((l, i) =>
                          i === idx ? { ...l, name } : l,
                        ),
                      });
                    }}
                  />{" "}
                  <select
                    className="rounded-md border px-2 py-1 bg-transparent"
                    value={loc.kind}
                    onChange={(e) => {
                      const kind = e.target.value as LocationKind;
                      updateCfg({
                        ...cfg,
                        locations: cfg.locations.map((l, i) =>
                          i === idx ? { ...l, kind } : l,
                        ),
                      });
                    }}
                  >
                    {" "}
                    {kindKeys.map((k) => (
                      <option key={k} value={k}>
                        {" "}
                        {KIND_LABELS[k]}{" "}
                      </option>
                    ))}{" "}
                  </select>{" "}
                  <label className="inline-flex items-center gap-2 text-sm">
                    {" "}
                    <input
                      type="checkbox"
                      checked={loc.canActAsCommissary}
                      onChange={(e) => {
                        updateCfg({
                          ...cfg,
                          locations: cfg.locations.map((l, i) =>
                            i === idx
                              ? { ...l, canActAsCommissary: e.target.checked }
                              : l,
                          ),
                        });
                      }}
                    />{" "}
                    Can act as commissary{" "}
                  </label>{" "}
                </div>{" "}
                <div className="text-xs opacity-70">
                  {" "}
                  Node ID: <span className="font-mono">{loc.id}</span>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <div className="text-xs opacity-70">Notes</div>{" "}
                  <input
                    className="w-full rounded-md border px-2 py-1 bg-transparent"
                    value={loc.notes ?? ""}
                    onChange={(e) => {
                      const notes = normalizeOptionalText(e.target.value);
                      updateCfg({
                        ...cfg,
                        locations: cfg.locations.map((l, i) =>
                          i === idx ? { ...l, notes } : l,
                        ),
                      });
                    }}
                    placeholder="Optional ops notes (hours, delivery windows, etc.)"
                  />{" "}
                </div>{" "}
                {loc.kind === "OUTLET" && (
                  <div className="text-xs opacity-70">
                    {" "}
                    Outlet defaults: cadence {CADENCE_LABELS[loc.cadence]} •
                    commissary capabilities{""}{" "}
                    {loc.canActAsCommissary ? "on" : "off"}{" "}
                  </div>
                )}{" "}
                {loc.kind !== "OUTLET" && (
                  <div className="text-xs opacity-70">
                    {" "}
                    Node defaults: cadence {CADENCE_LABELS[loc.cadence]}{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <div className="text-xs opacity-60">
            {" "}
            Nodes: {locationOptions.length} • Outlets: {outlets.length} •
            Commissaries: {commissaries.length}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {tab === "FULFILL" && (
        <div className="space-y-3">
          {" "}
          <div className="text-sm font-medium">
            Internal Fulfillment Rules
          </div>{" "}
          <div className="text-xs opacity-70">
            {" "}
            Rules define lead time + due-time behavior per commissary →
            outlet.{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            {cfg.fulfillmentRules.map((r, idx) => {
              const from = locationOptions.find(
                (l) => l.id === r.fromLocationId,
              );
              const to = locationOptions.find((l) => l.id === r.toOutletId);
              return (
                <div
                  key={`${r.fromLocationId}_${r.toOutletId}`}
                  className="rounded-md border p-3 space-y-2"
                >
                  {" "}
                  <div className="flex flex-wrap items-center gap-2">
                    {" "}
                    <div className="text-sm font-medium">
                      {" "}
                      {from?.name ?? "Unknown"} → {to?.name ?? "Unknown"}{" "}
                    </div>{" "}
                    <label className="inline-flex items-center gap-2 text-sm">
                      {" "}
                      <input
                        type="checkbox"
                        checked={r.isEnabled}
                        onChange={(e) => toggleRule(idx, e.target.checked)}
                      />{" "}
                      Enabled{" "}
                    </label>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {" "}
                    <div className="space-y-1">
                      {" "}
                      <div className="text-xs opacity-70">
                        {" "}
                        Lead Time (hours){" "}
                      </div>{" "}
                      <input
                        type="number"
                        min={0}
                        max={168}
                        className="w-full rounded-md border px-2 py-1 bg-transparent"
                        value={r.leadTimeHours}
                        onChange={(e) =>
                          updateRule(idx, {
                            leadTimeHours: clamp(
                              parseInt(e.target.value || "0", 10),
                              0,
                              168,
                            ),
                          })
                        }
                      />{" "}
                    </div>{" "}
                    <div className="space-y-1">
                      {" "}
                      <div className="text-xs opacity-70">
                        Default Due Time
                      </div>{" "}
                      <select
                        className="w-full rounded-md border px-2 py-1 bg-transparent"
                        value={r.defaultDueTime}
                        onChange={(e) =>
                          updateRule(idx, {
                            defaultDueTime: e.target.value as any,
                          })
                        }
                      >
                        {" "}
                        <option value="ASAP">ASAP</option>{" "}
                        <option value="NEXT_DELIVERY_WINDOW">
                          {" "}
                          Next delivery window{" "}
                        </option>{" "}
                        <option value="CUSTOM">Custom (chef sets)</option>{" "}
                      </select>{" "}
                    </div>{" "}
                    <div className="space-y-1">
                      {" "}
                      <div className="text-xs opacity-70">Notes</div>{" "}
                      <input
                        className="w-full rounded-md border px-2 py-1 bg-transparent"
                        value={r.notes ?? ""}
                        onChange={(e) =>
                          updateRule(idx, {
                            notes: normalizeOptionalText(e.target.value),
                          })
                        }
                        placeholder="Chicken stock, cheesecake pars, bulk prep..."
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-xs opacity-60">
                    {" "}
                    From: <span className="font-mono">{r.fromLocationId}</span>
                    {""} • To:{" "}
                    <span className="font-mono">{r.toOutletId}</span>{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
          <div className="text-xs opacity-70">
            {" "}
            Next phase wires these rules into ordering + delivery
            calendars.{" "}
          </div>{" "}
        </div>
      )}{" "}
      {tab === "APN" && (
        <div className="space-y-3">
          {" "}
          <div className="text-sm font-medium">
            APN Cost Attribution Rules
          </div>{" "}
          <div className="text-xs opacity-70">
            {" "}
            Default posting policy for internal fulfillment; produces consistent
            COGS without chefs deciding during service.{" "}
          </div>{" "}
          <div className="rounded-md border p-3 space-y-3">
            {" "}
            <div className="space-y-1">
              {" "}
              <div className="text-xs opacity-70">Default Mode</div>{" "}
              <select
                className="w-full rounded-md border px-2 py-1 bg-transparent"
                value={cfg.apn.mode}
                onChange={(e) =>
                  updateCfg({
                    ...cfg,
                    apn: {
                      ...cfg.apn,
                      mode: e.target.value as CostAttributionMode,
                    },
                  })
                }
              >
                {" "}
                {apnKeys.map((k) => (
                  <option key={k} value={k}>
                    {" "}
                    {APN_MODE_LABELS[k]}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <label className="inline-flex items-center gap-2 text-sm">
              {" "}
              <input
                type="checkbox"
                checked={cfg.apn.producerCreditEnabled}
                onChange={(e) =>
                  updateCfg({
                    ...cfg,
                    apn: {
                      ...cfg.apn,
                      producerCreditEnabled: e.target.checked,
                    },
                  })
                }
              />{" "}
              Credit producing node (performance transparency){" "}
            </label>{" "}
            <label className="inline-flex items-center gap-2 text-sm">
              {" "}
              <input
                type="checkbox"
                checked={cfg.apn.auditNotationsEnabled}
                onChange={(e) =>
                  updateCfg({
                    ...cfg,
                    apn: {
                      ...cfg.apn,
                      auditNotationsEnabled: e.target.checked,
                    },
                  })
                }
              />{" "}
              Auto-annotate policy changes in EchoAurum (audit trail){" "}
            </label>{" "}
            <label className="inline-flex items-center gap-2 text-sm">
              {" "}
              <input
                type="checkbox"
                checked={cfg.apn.allowSubBuckets}
                onChange={(e) =>
                  updateCfg({
                    ...cfg,
                    apn: { ...cfg.apn, allowSubBuckets: e.target.checked },
                  })
                }
              />{" "}
              Allow “Production for Outlets” sub-buckets (future){" "}
            </label>{" "}
            <div className="text-xs opacity-70">
              {" "}
              Next phase wires this into EchoAurum posting events.{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {tab === "CADENCE" && (
        <div className="space-y-3">
          {" "}
          <div className="text-sm font-medium">
            Inventory Cadence Defaults
          </div>{" "}
          <div className="text-xs opacity-70">
            {" "}
            Sets how often each node should count inventory.{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            {cfg.locations.map((loc, idx) => (
              <div
                key={loc.id}
                className="rounded-md border p-3 flex flex-wrap items-center gap-2"
              >
                {" "}
                <div className="min-w-[220px]">
                  {" "}
                  <div className="text-sm font-medium">{loc.name}</div>{" "}
                  <div className="text-xs opacity-70">
                    {" "}
                    {KIND_LABELS[loc.kind]}{" "}
                  </div>{" "}
                </div>{" "}
                <select
                  className="rounded-md border px-2 py-1 bg-transparent"
                  value={loc.cadence}
                  onChange={(e) => {
                    const cadence = e.target.value as InventoryCadence;
                    updateCfg({
                      ...cfg,
                      locations: cfg.locations.map((l, i) =>
                        i === idx ? { ...l, cadence } : l,
                      ),
                    });
                  }}
                >
                  {" "}
                  {cadenceKeys.map((k) => (
                    <option key={k} value={k}>
                      {" "}
                      {CADENCE_LABELS[k]}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
                <div className="text-xs opacity-70">
                  {" "}
                  Echo uses this later to score inventory health +
                  confidence.{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
      <div className="flex items-center gap-3 pt-2">
        {" "}
        <button
          className="rounded-md border px-4 py-2 hover:opacity-90"
          onClick={save}
        >
          {" "}
          Save Genesis B{" "}
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
          luccca:genesis:B:v1
        </span>{" "}
        . Emits <span className="font-mono">genesis:b_saved</span>.{" "}
      </div>{" "}
    </div>
  );
}
