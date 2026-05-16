import React, { useMemo, useState } from "react";
import { RequirePerm, GatedButton } from "@/lib/genesis/permissions/uiGuards";
import { useGenesisProcurementStore } from "@/stores/genesisProcurementStoreHook";
import { useVendorScheduleStore } from "@/stores/vendorScheduleStoreHook";
import { useInventoryOffsetsStore } from "@/stores/inventoryOffsetsStoreHook";
import { useGenesisQueueStore } from "@/stores/genesisQueueStoreHook";
import { useBudgetStore } from "@/lib/genesis/device/budget/useBudgetStore";
import { computeMissingItemsSignals } from "@/lib/genesis/device/missingItems/missingSignals";
import { buildOrderGuide } from "@/lib/genesis/device/orderGuides/buildOrderGuide";
import { downloadTextFile } from "@/lib/genesis/device/orderGuides/download";
import { getCurrentUser } from "@/stores/genesisAuthStore"; /** * Genesis Ordering Hub (Desktop) * ----------------------------- * Single place to manage ordering. * - AI starts with recommendation * - Shows missing-order detection * - Shows lightweight budget bars * - Exports order guide (TXT now; PDF later) * * Designed to mount as a Panel OR a route. */
export default function GenesisOrderingHub() {
  const procurement = useGenesisProcurementStore();
  const vendor = useVendorScheduleStore();
  const offsets = useInventoryOffsetsStore();
  const queue = useGenesisQueueStore();
  const budget = useBudgetStore();
  const [active, setActive] = useState<
    "TODAY" | "VENDORS" | "GUIDES" | "BUDGET"
  >("TODAY");
  const versionNow = vendor.getVersion(new Date());
  const actor = (() => {
    const u = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    return u
      ? { userId: u.userId, role: u.role, displayName: u.displayName }
      : {
          userId: "local",
          role: "PURCHASING_MANAGER",
          displayName: "Purchasing",
        };
  })();
  const missing = useMemo(() => {
    return computeMissingItemsSignals({
      queueRequests: queue.requests,
      offsets: offsets.offsets,
      lastPlan: procurement.lastPlan,
    });
  }, [queue.requests, offsets.offsets, procurement.lastPlan]);
  return (
    <div className="p-4 space-y-4 bg-background text-foreground">
      {" "}
      <div className="flex items-start justify-between gap-3">
        {" "}
        <div>
          {" "}
          <h2 className="text-xl font-semibold">Genesis Ordering</h2>{" "}
          <p className="text-sm opacity-80">
            AI-first ordering. Internal-first fulfillment. Vendor consolidation.
            Finance-safe audit.
          </p>{" "}
          <div className="text-xs opacity-70 mt-1">
            {" "}
            Vendor rules:{" "}
            <span className="font-semibold">{versionNow.versionId}</span>{" "}
          </div>{" "}
        </div>{" "}
        <GatedButton
          perm="PROCUREMENT_RUN"
          className="px-4 py-2 rounded-md border font-semibold hover:opacity-80"
          onClick={() => procurement.runNow(actor)}
        >
          {" "}
          Run AI procurement{" "}
        </GatedButton>{" "}
      </div>{" "}
      {missing.length > 0 && (
        <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-3">
          {" "}
          <div className="font-semibold text-sm">
            Potential missing items
          </div>{" "}
          <div className="text-sm opacity-90 mt-1">
            {" "}
            You may have skipped items that usually appear based on demand
            cadence. Review before sending.{" "}
          </div>{" "}
          <ul className="mt-2 text-sm space-y-1">
            {" "}
            {missing.slice(0, 6).map((m) => (
              <li
                key={m.key}
                className="flex items-center justify-between gap-2"
              >
                {" "}
                <span>• {m.label}</span>{" "}
                <span className="text-xs opacity-70">{m.reason}</span>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </div>
      )}{" "}
      <div className="flex gap-2 text-sm flex-wrap">
        {" "}
        {[
          ["TODAY", "Today's Needs"],
          ["VENDORS", "Vendor Carts"],
          ["GUIDES", "Order Guides"],
          ["BUDGET", "Budget"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={`px-3 py-2 rounded-md border ${active === k ? "font-semibold bg-primary text-primary-foreground" : "opacity-70 hover:opacity-100"}`}
            onClick={() => setActive(k as any)}
          >
            {" "}
            {label}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {active === "TODAY" && (
        <RequirePerm perm="PROCUREMENT_VIEW">
          {" "}
          <div className="rounded-lg border p-3 space-y-2">
            {" "}
            <div className="font-semibold text-sm">AI Recommendation</div>{" "}
            {!procurement.lastPlan ? (
              <div className="text-sm opacity-70">
                Run AI procurement to generate recommendations.
              </div>
            ) : (
              <>
                {" "}
                <div className="text-sm opacity-80">
                  {procurement.lastPlan.explain ||
                    "Procurement plan generated successfully."}
                </div>{" "}
                <details className="rounded-md border p-2">
                  {" "}
                  <summary className="cursor-pointer text-sm font-medium">
                    Raw plan JSON
                  </summary>{" "}
                  <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap max-h-[360px]">
                    {" "}
                    {JSON.stringify(procurement.lastPlan, null, 2)}{" "}
                  </pre>{" "}
                </details>{" "}
              </>
            )}{" "}
          </div>{" "}
        </RequirePerm>
      )}{" "}
      {active === "VENDORS" && (
        <RequirePerm perm="PROCUREMENT_VIEW">
          {" "}
          <div className="rounded-lg border p-3 space-y-2">
            {" "}
            <div className="font-semibold text-sm">Vendor Carts</div>{" "}
            <div className="text-sm opacity-70">
              {" "}
              (v1) This view reads from the generated plan; next patch can
              render true vendor cart UI per vendor.{" "}
            </div>{" "}
            <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-[360px] border rounded-md p-2">
              {" "}
              {JSON.stringify(
                procurement.lastPlan?.vendorDrops ?? {},
                null,
                2,
              )}{" "}
            </pre>{" "}
          </div>{" "}
        </RequirePerm>
      )}{" "}
      {active === "GUIDES" && (
        <RequirePerm perm="PROCUREMENT_VIEW">
          {" "}
          <div className="rounded-lg border p-3 space-y-3">
            {" "}
            <div className="font-semibold text-sm">
              Download Order Guide
            </div>{" "}
            <div className="text-sm opacity-80">
              {" "}
              Generates a physical inventory / ordering checklist. (Text/CSV
              now; PDF can be added next.){" "}
            </div>{" "}
            <button
              className="px-3 py-2 rounded-md border text-sm hover:opacity-80"
              onClick={() => {
                const guide = buildOrderGuide({
                  propertyName: "LUCCCA",
                  generatedAtISO: new Date().toISOString(),
                  items: procurement.lastPlan?.items ?? [],
                  missingSignals: missing,
                });
                downloadTextFile(
                  `order-guide-${new Date().toISOString().slice(0, 10)}.txt`,
                  guide,
                );
              }}
            >
              {" "}
              Download guide{" "}
            </button>{" "}
          </div>{" "}
        </RequirePerm>
      )}{" "}
      {active === "BUDGET" && (
        <RequirePerm perm="PROCUREMENT_VIEW">
          {" "}
          <div className="rounded-lg border p-3 space-y-3">
            {" "}
            <div className="font-semibold text-sm">
              Monthly Budget Guardrails
            </div>{" "}
            <div className="text-sm opacity-80">
              {" "}
              Lightweight bars only (no accounting screens). Green/Yellow/Red
              guidance.{" "}
            </div>{" "}
            <BudgetBars />{" "}
            <div className="text-xs opacity-70">
              Configure budgets in onboarding or purchasing settings later.
            </div>{" "}
          </div>{" "}
        </RequirePerm>
      )}{" "}
    </div>
  );
  function BudgetBars() {
    const cats = budget.categories;
    return (
      <div className="space-y-2">
        {" "}
        {cats.map((c: any) => {
          const pct =
            c.monthlyBudget > 0
              ? Math.min(1, c.monthToDateSpend / c.monthlyBudget)
              : 0;
          const status = pct < 0.85 ? "ok" : pct < 1.0 ? "warn" : "over";
          return (
            <div key={c.key} className="space-y-1">
              {" "}
              <div className="flex items-center justify-between text-sm">
                {" "}
                <div className="font-medium">{c.label}</div>{" "}
                <div className="text-xs opacity-70">
                  {" "}
                  ${c.monthToDateSpend.toFixed(0)} / $
                  {c.monthlyBudget.toFixed(0)}{" "}
                </div>{" "}
              </div>{" "}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                {" "}
                <div
                  className={`h-2 ${status === "ok" ? "bg-emerald-400/70" : status === "warn" ? "bg-yellow-400/70" : "bg-red-400/70"}`}
                  style={{ width: `${pct * 100}%` }}
                />{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>
    );
  }
}
