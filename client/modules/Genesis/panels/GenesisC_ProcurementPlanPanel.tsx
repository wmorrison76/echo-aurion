/**
 * Genesis C — Procurement Plan Panel
 * RBAC:
 * - PROCUREMENT_VIEW: can view plans
 * - PROCUREMENT_RUN: can run procurement
 */

import React from "react";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Lock,
  Play,
  TrendingDown,
} from "lucide-react";

import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";
import { osBus } from "@/lib/os-bus";

import type { User } from "@/../shared/types/genesis-permissions";
import type { ProcurementPlan } from "@/../shared/types/genesis-procurement";

import { getGenesisConfig } from "@/lib/genesis-config-store";
import {
  runCombinedProcurement,
  exportPlanAsCSV,
  exportPlanAsJSON,
} from "@/lib/genesis/orchestrator/runCombinedProcurement";
import { listIFOs } from "@/lib/ifo-store";
import { can } from "@/lib/genesis/permissions/permissionChecks";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import {
  getLastProcurementPlan,
  getProcurementHistory,
  saveProcurementPlan,
} from "@/stores/genesisProcurementStore";
import { getInventoryOffsets } from "@/stores/inventoryOffsetsStore";
import { getVendorSchedule, getVersion } from "@/stores/vendorScheduleStore";

type TabId = "CURRENT" | "HISTORY" | "ANALYSIS";

export default function GenesisC_ProcurementPlanPanel() {
  const { t } = useI18n();

  const [user, setUser] = React.useState<User | null>(null);
  const [plan, setPlan] = React.useState<ProcurementPlan | null>(null);
  const [history, setHistory] = React.useState<ProcurementPlan[]>([]);
  const [vendorVersionId, setVendorVersionId] = React.useState<string | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [tab, setTab] = React.useState<TabId>("CURRENT");

  React.useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setPlan(getLastProcurementPlan());
    setHistory(getProcurementHistory(20));
  }, []);

  const canViewPlan = can(user, "PROCUREMENT_VIEW");
  const canRunProcurement = can(user, "PROCUREMENT_RUN");

  const download = React.useCallback(
    (content: string, mime: string, filename: string) => {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const handleExportJSON = React.useCallback(() => {
    if (!plan) return;
    download(
      exportPlanAsJSON(plan),
      "application/json",
      `procurement-plan-${plan.planId}.json`,
    );
  }, [download, plan]);

  const handleExportCSV = React.useCallback(() => {
    if (!plan) return;
    download(
      exportPlanAsCSV(plan),
      "text/csv",
      `procurement-plan-${plan.planId}.csv`,
    );
  }, [download, plan]);

  const handleRun = React.useCallback(async () => {
    if (!canRunProcurement) {
      setMessage({
        type: "error",
        text: "Insufficient permission: PROCUREMENT_RUN",
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const config = getGenesisConfig();
      const vendors = getVendorSchedule();
      const offsets = getInventoryOffsets();
      const ifos = listIFOs();

      const demands = ifos.map((ifo: any) => ({
        demandId: ifo.id,
        locationId: ifo.requestingOutletId,
        itemKey: `${ifo.itemCategory}_${ifo.itemName}`,
        itemName: ifo.itemName,
        unit: ifo.unit || "ea",
        quantity: ifo.quantity,
        totalQuantity: ifo.quantity,
        dueAt: new Date(ifo.dueAt).toISOString(),
        priority: ifo.priority || "STANDARD",
        sourceType: "IFO",
        sourceId: ifo.id,
      }));

      const vendorVersion = getVersion();
      setVendorVersionId(vendorVersion.versionId);

      const result = runCombinedProcurement({
        config,
        demands,
        vendorSchedule: vendors,
        inventoryOffsets: offsets,
      });

      setPlan(result.plan);
      saveProcurementPlan(result.plan);
      setHistory(getProcurementHistory(20));

      osBus.emit("genesis:procurement_plan_generated", {
        planId: result.plan.planId,
        vendorRulesVersionId: vendorVersion.versionId,
        asOfDateISO: vendorVersion.asOfDateISO,
        actor: user?.userId,
        timestamp: new Date().toISOString(),
      });

      setMessage({
        type: "success",
        text: "Procurement plan generated successfully!",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to run procurement",
      });
    } finally {
      setLoading(false);
    }
  }, [canRunProcurement, user?.userId]);

  if (!canViewPlan) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background p-4">
        <Card className="p-6 max-w-md text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Access Restricted
          </h3>
          <p className="text-sm text-foreground/70 mt-2">
            You don't have permission to view procurement plans.
          </p>
          <p className="text-xs text-foreground/60 mt-3">
            Required permission{" "}
            <code className="bg-foreground/10 px-2 py-1 rounded">
              PROCUREMENT_VIEW
            </code>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">
              {t("module.genesis-c.title")}
            </div>
            <div className="text-sm text-foreground/70 mt-1">
              {t("module.genesis-c.description")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModuleChatButton
              moduleId="genesis-c"
              moduleName={t("module.genesis-c.title")}
            />
            <Badge variant="outline">Phase 3</Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {message ? (
            <Card
              className={[
                "p-4 flex gap-3",
                message.type === "success"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30",
              ].join(" ")}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={
                    message.type === "success"
                      ? "text-green-200"
                      : "text-red-200"
                  }
                >
                  {message.text}
                </p>
              </div>
            </Card>
          ) : null}

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabId)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="CURRENT">Current Plan</TabsTrigger>
              <TabsTrigger value="HISTORY">History</TabsTrigger>
              <TabsTrigger value="ANALYSIS">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="CURRENT" className="space-y-4">
              {plan ? (
                <>
                  <Card className="p-4">
                    <div className="text-sm font-medium text-foreground mb-3">
                      Plan Summary
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-foreground/70">
                          Generated
                        </div>
                        <div className="text-sm font-semibold text-foreground mt-1">
                          {new Date(plan.generatedAt).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-foreground/70">
                          Vendors
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {plan.vendorCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-foreground/70">
                          Total Lines
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {plan.totalLineCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-foreground/70">
                          Total Value
                        </div>
                        <div className="text-2xl font-bold text-green-500">
                          ${plan.totalValue.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {vendorVersionId ? (
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <div className="text-xs text-foreground/70 mb-1">
                          Vendor Rules Version
                        </div>
                        <div className="font-mono text-xs bg-foreground/5 p-2 rounded">
                          {vendorVersionId}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={handleExportJSON}>
                        <Download className="w-4 h-4 mr-2" />
                        Export JSON
                      </Button>
                      <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </Card>

                  {plan.warnings?.length ? (
                    <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                      <div className="text-sm font-medium text-foreground mb-3 flex gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Warnings ({plan.warnings.length})
                      </div>
                      <div className="space-y-2">
                        {plan.warnings.map((w: any) => (
                          <div
                            key={w.warningId}
                            className={cn(
                              "p-2 rounded text-sm",
                              w.severity === "critical"
                                ? "bg-red-900/20 text-red-200"
                                : "bg-amber-900/20 text-amber-200",
                            )}
                          >
                            {w.message}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : null}
                </>
              ) : (
                <Card className="p-8 text-center">
                  <div className="text-foreground/70 mb-4">
                    No plan generated yet. Click “Run Procurement” to start.
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="HISTORY" className="space-y-4">
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((h, idx) => (
                    <Card
                      key={idx}
                      className="p-4 hover:bg-foreground/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">
                            {new Date(h.generatedAt).toLocaleString()}
                          </div>
                          <div className="text-sm text-foreground/70 mt-1">
                            {h.vendorCount} vendors • {h.totalLineCount} lines •
                            ${h.totalValue.toFixed(2)}
                          </div>
                        </div>
                        <Badge variant="outline">{h.planId}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-foreground/70">No history available</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ANALYSIS" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-medium text-foreground mb-3 flex gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Cost Analysis
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground/70">
                      Avg Cost per Line
                    </span>
                    <span className="font-semibold text-foreground">
                      $
                      {plan
                        ? (
                            plan.totalValue / Math.max(1, plan.totalLineCount)
                          ).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-sm text-foreground/70">
                      Vendor Count
                    </span>
                    <span className="font-semibold text-foreground">
                      {plan?.vendorCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-sm text-foreground/70">
                      Total Lines
                    </span>
                    <span className="font-semibold text-foreground">
                      {plan?.totalLineCount || 0}
                    </span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border/30 p-4 bg-background space-y-2">
        {!canRunProcurement ? (
          <p className="text-sm text-amber-600 dark:text-amber-400 flex gap-2">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            You don't have permission to run procurement.
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button
            onClick={handleRun}
            disabled={loading || !canRunProcurement}
            className="flex-1"
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? "Running..." : "Run Procurement"}
          </Button>
          {plan ? (
            <Button variant="outline" size="lg" onClick={handleExportJSON}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
