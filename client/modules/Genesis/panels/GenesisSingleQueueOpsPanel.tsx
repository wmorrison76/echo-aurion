/**
 * Genesis E — Single Queue Ops Panel (Phase 2 & 3)
 * Combined Procurement Orchestrator UI with Handshake Contract
 * Tabs: Plan / Vendors / Offsets / Aurum Draft / History
 */

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/glass";
import { osBus } from "@/lib/os-bus";

import type { User } from "@/../shared/types/genesis-permissions";
import type {
  InventoryOffsetsSnapshot,
  ProcurementPlan,
  Vendor,
  VendorSchedule,
} from "@/../shared/types/genesis-procurement";

import { getGenesisConfig } from "@/lib/genesis-config-store";
import {
  runCombinedProcurement,
  exportPlanAsCSV,
  exportPlanAsJSON,
} from "@/lib/genesis/orchestrator/runCombinedProcurement";
import { listIFOs } from "@/lib/ifo-store";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import {
  getLastProcurementPlan,
  getProcurementHistory,
  saveProcurementPlan,
} from "@/stores/genesisProcurementStore";
import {
  getInventoryOffsets,
  updateOffset,
} from "@/stores/inventoryOffsetsStore";
import {
  getVendorSchedule,
  getVersion,
  updateVendor,
} from "@/stores/vendorScheduleStore";
import {
  canEditOffsets,
  canEditVendorSchedule,
} from "@/lib/genesis/permissions/permissionChecks";
import { PermissionGate, ProtectedButton } from "@/lib/genesis/ui/uiGuards";

type PageId = "plan" | "vendors" | "offsets" | "aurum" | "history";

interface DemandItem {
  demandId: string;
  locationId: string;
  itemKey: string;
  itemName: string;
  unit: string;
  quantity: number;
  quantityOffset?: number;
  totalQuantity: number;
  dueAt: string;
  priority: "ASAP" | "STANDARD" | "LOW";
  sourceType: "IFO" | "PAR" | "OFFSET" | "LEAD_TIME_TASK";
  sourceId: string;
}

export default function GenesisSingleQueueOpsPanel() {
  const [user, setUser] = React.useState<User | null>(null);
  const [plan, setPlan] = React.useState<ProcurementPlan | null>(null);
  const [vendors, setVendors] = React.useState<VendorSchedule | null>(null);
  const [offsets, setOffsets] = React.useState<InventoryOffsetsSnapshot | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<ProcurementPlan[]>([]);
  const [editingVendorId, setEditingVendorId] = React.useState<string | null>(
    null,
  );
  const [editingOffsetId, setEditingOffsetId] = React.useState<string | null>(
    null,
  );
  const [tab, setTab] = React.useState<PageId>("plan");

  React.useEffect(() => {
    const current = getCurrentUser();
    setUser(current);
    setPlan(getLastProcurementPlan());
    setVendors(getVendorSchedule());
    setOffsets(getInventoryOffsets());
    setHistory(getProcurementHistory(10));
  }, []);

  const handleRunProcurement = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = getGenesisConfig();
      const ifos = listIFOs();

      const demands: DemandItem[] = ifos.map((ifo: any) => ({
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

      if (!vendors || !offsets) {
        throw new Error("Missing vendor schedule or inventory offsets");
      }

      const vendorVersion = getVersion();
      const result = runCombinedProcurement({
        config,
        demands,
        vendorSchedule: vendors,
        inventoryOffsets: offsets,
      });

      setPlan(result.plan);
      saveProcurementPlan(result.plan);
      setHistory(getProcurementHistory(10));

      osBus.emit("genesis:procurement_run_requested", {
        planId: result.plan.planId,
        asOfDateISO: vendorVersion.asOfDateISO,
        vendorRulesVersionId: vendorVersion.versionId,
        actor: user?.userId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run procurement",
      );
    } finally {
      setLoading(false);
    }
  }, [offsets, user?.userId, vendors]);

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

  const handleUpdateVendor = React.useCallback(
    (vendorId: string, updates: Partial<Vendor>) => {
      updateVendor(vendorId, updates);
      setVendors(getVendorSchedule());
      setEditingVendorId(null);
    },
    [],
  );

  const handleUpdateOffset = React.useCallback(
    (offsetId: string, onHandQty: number, onOrderQty: number) => {
      updateOffset(offsetId, { onHandQty, onOrderQty });
      setOffsets(getInventoryOffsets());
      setEditingOffsetId(null);
    },
    [],
  );

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">
              Genesis E — Single Queue Ops
            </div>
            <div className="text-sm text-foreground/70 mt-1">
              Combined procurement orchestrator: merge E/F/G/H logic into
              unified plan
            </div>
          </div>
          <Badge>{user?.role || "Unknown"}</Badge>
        </div>
      </div>

      {error ? (
        <div className="flex-shrink-0 bg-red-900/20 border border-red-600/30 p-3 m-4 rounded text-red-200 text-sm">
          {error}
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as PageId)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="flex-shrink-0 ml-4 mt-4 w-fit">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="offsets">Offsets</TabsTrigger>
          <TabsTrigger value="aurum">Aurum Draft</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <ProtectedButton
              user={user}
              requiredPermission="PROCUREMENT_RUN"
              onClick={handleRunProcurement}
              disabled={loading}
              className="px-4 py-2 bg-primary hover:opacity-90 text-white rounded disabled:opacity-50"
            >
              {loading ? "Running..." : "Run Combined Procurement"}
            </ProtectedButton>

            {plan ? (
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold">Plan Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-foreground/70">Plan ID</div>
                    <div className="font-mono text-xs">{plan.planId}</div>
                  </div>
                  <div>
                    <div className="text-foreground/70">Generated</div>
                    <div>{new Date(plan.generatedAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-foreground/70">Total Lines</div>
                    <div className="text-lg font-semibold">
                      {plan.totalLineCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-foreground/70">Total Value</div>
                    <div className="text-lg font-semibold">
                      ${plan.totalValue.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-foreground/70">Vendors</div>
                    <div className="text-lg font-semibold">
                      {plan.vendorCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-foreground/70">Warnings</div>
                    <div
                      className={cn(
                        "text-lg font-semibold",
                        plan.warnings.length > 0
                          ? "text-amber-500"
                          : "text-green-500",
                      )}
                    >
                      {plan.warnings.length}
                    </div>
                  </div>
                </div>

                {plan.warnings.length > 0 ? (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-2">Warnings</h4>
                    <div className="space-y-1 text-xs">
                      {plan.warnings.map((w: any) => (
                        <div
                          key={w.warningId}
                          className={cn(
                            "p-2 rounded",
                            w.severity === "critical"
                              ? "bg-red-900/20 text-red-200"
                              : "bg-amber-900/20 text-amber-200",
                          )}
                        >
                          {w.message}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-2 pt-3">
                  <ProtectedButton
                    user={user}
                    requiredPermission="AURUM_DRAFT_EXPORT"
                    onClick={handleExportJSON}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                  >
                    Export JSON
                  </ProtectedButton>
                  <ProtectedButton
                    user={user}
                    requiredPermission="AURUM_DRAFT_EXPORT"
                    onClick={handleExportCSV}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
                  >
                    Export CSV
                  </ProtectedButton>
                </div>
              </Card>
            ) : !loading ? (
              <Card className="p-4 text-center text-foreground/70">
                No plan generated yet. Click "Run Combined Procurement" to
                start.
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="flex-1 overflow-auto p-4">
          <PermissionGate
            user={user}
            requiredPermission="VENDOR_SCHEDULE_VIEW"
            fallback={
              <div className="text-foreground/70">
                No permission to view vendors
              </div>
            }
          >
            <div className="space-y-3">
              {vendors?.vendors?.map((vendor: any) => (
                <Card key={vendor.vendorId} className="p-4">
                  {editingVendorId === vendor.vendorId &&
                  canEditVendorSchedule(user) ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        defaultValue={vendor.leadTimeDays}
                        placeholder="Lead time (days)"
                        className="w-full px-2 py-1 bg-background border border-border/30 rounded text-sm"
                        onChange={(e) =>
                          handleUpdateVendor(vendor.vendorId, {
                            leadTimeDays: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                      <button
                        onClick={() => setEditingVendorId(null)}
                        className="text-xs px-2 py-1 bg-primary text-white rounded"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold">{vendor.name}</h4>
                        <div className="text-xs text-foreground/70 mt-1">
                          Lead Time: {vendor.leadTimeDays} days
                        </div>
                        <div className="text-xs text-foreground/70">
                          Delivery:{" "}
                          {Array.isArray(vendor.deliveryDays)
                            ? vendor.deliveryDays.join(",")
                            : "—"}
                        </div>
                        <div className="text-xs text-foreground/70">
                          Cutoff: {vendor.cutoffTimeUTC || "N/A"}
                        </div>
                      </div>
                      {canEditVendorSchedule(user) ? (
                        <button
                          onClick={() => setEditingVendorId(vendor.vendorId)}
                          className="text-xs px-2 py-1 bg-slate-700 text-white rounded"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </PermissionGate>
        </TabsContent>

        <TabsContent value="offsets" className="flex-1 overflow-auto p-4">
          <PermissionGate
            user={user}
            requiredPermission="OFFSETS_VIEW"
            fallback={
              <div className="text-foreground/70">
                No permission to view offsets
              </div>
            }
          >
            <div className="space-y-3">
              {offsets?.offsets?.map((offset: any) => (
                <Card key={offset.offsetId} className="p-4">
                  {editingOffsetId === offset.offsetId &&
                  canEditOffsets(user) ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        defaultValue={offset.onHandQty}
                        placeholder="On hand"
                        className="w-full px-2 py-1 bg-background border border-border/30 rounded text-sm"
                        onChange={(e) =>
                          handleUpdateOffset(
                            offset.offsetId,
                            parseInt(e.target.value) || 0,
                            offset.onOrderQty,
                          )
                        }
                      />
                      <button
                        onClick={() => setEditingOffsetId(null)}
                        className="text-xs px-2 py-1 bg-primary text-white rounded"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold">{offset.itemName}</h4>
                        <div className="text-xs text-foreground/70 mt-1">
                          On Hand: {offset.onHandQty} {offset.unit}
                        </div>
                        <div className="text-xs text-foreground/70">
                          On Order: {offset.onOrderQty} {offset.unit}
                        </div>
                        <div className="text-xs text-foreground/70">
                          Location: {offset.locationId}
                        </div>
                      </div>
                      {canEditOffsets(user) ? (
                        <button
                          onClick={() => setEditingOffsetId(offset.offsetId)}
                          className="text-xs px-2 py-1 bg-slate-700 text-white rounded"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </PermissionGate>
        </TabsContent>

        <TabsContent value="aurum" className="flex-1 overflow-auto p-4">
          <PermissionGate
            user={user}
            requiredPermission="AURUM_DRAFT_VIEW"
            fallback={
              <div className="text-foreground/70">
                No permission to view drafts
              </div>
            }
          >
            {plan?.aurumDrafts && plan.aurumDrafts.length > 0 ? (
              <div className="space-y-3">
                {plan.aurumDrafts.map((draft: any) => (
                  <Card key={draft.draftId} className="p-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-foreground/70">Account</div>
                        <div className="font-mono">{draft.account}</div>
                      </div>
                      <div>
                        <div className="text-foreground/70">Cost Center</div>
                        <div className="font-mono">{draft.costCenter}</div>
                      </div>
                      <div>
                        <div className="text-foreground/70">Amount</div>
                        <div className="font-semibold">${draft.amount}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center text-foreground/70">
                No journal drafts yet. Run procurement to generate.
              </Card>
            )}
          </PermissionGate>
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((h: any) => (
                <Card key={h.planId} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="text-sm">
                      <div className="font-semibold">
                        {h.totalLineCount} lines
                      </div>
                      <div className="text-xs text-foreground/70">
                        {new Date(h.generatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      ${h.totalValue.toFixed(2)}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-4 text-center text-foreground/70">
                No history yet.
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
