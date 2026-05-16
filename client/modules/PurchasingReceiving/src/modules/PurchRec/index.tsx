import React, { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TurtleLoader } from "@/components/TurtleLoader";
import type { Role } from "@shared/auth";
import { Lock, RefreshCw } from "lucide-react";
import type { OrderGuideRow } from "./services/orderGuide.service";
const PURCHASING_ROLES: readonly Role[] = ["Admin", "Manager"];
const RECEIVING_ROLES: readonly Role[] = ["Admin", "Manager", "Receiver"];
const INVENTORY_ROLES: readonly Role[] = [
  "Admin",
  "Manager",
  "Chef",
  "Finance",
];
const LEDGER_ROLES: readonly Role[] = ["Admin", "Manager", "Finance"];
const OrderGuidePanel = lazy(() =>
  import("./components/OrderGuidePanel").then((mod) => ({
    default: mod.OrderGuidePanel,
  })),
);
const OrderFormDrawer = lazy(() =>
  import("./components/OrderFormDrawer").then((mod) => ({
    default: mod.OrderFormDrawer,
  })),
);
const ReceivingPanel = lazy(() =>
  import("./components/ReceivingPanel").then((mod) => ({
    default: mod.ReceivingPanel,
  })),
);
const InventoryLotsPanel = lazy(() =>
  import("./components/InventoryLotsPanel").then((mod) => ({
    default: mod.InventoryLotsPanel,
  })),
);
const StockLedgerPanel = lazy(() =>
  import("./components/StockLedgerPanel").then((mod) => ({
    default: mod.StockLedgerPanel,
  })),
);
const DETAIL_PANELS = [
  {
    key: "receiving",
    title: "Receiving",
    description:
      "Post deliveries, capture lot data, and update on-hand balances.",
    roles: RECEIVING_ROLES,
    lockedTitle: "Receiving access required",
    lockedDescription:
      "Switch to an Admin, Manager, or Receiver profile to post deliveries and record lots.",
    fallback: "inventory",
  },
  {
    key: "inventory",
    title: "Inventory Lots",
    description:
      "Monitor current lots, expirations, and vendor sourcing trends.",
    roles: INVENTORY_ROLES,
    lockedTitle: "Inventory visibility restricted",
    lockedDescription:
      "Switch to an Admin, Manager, Chef, or Finance profile to review lot positions and expirations.",
    fallback: "ledger",
  },
  {
    key: "ledger",
    title: "Stock Ledger",
    description:
      "Audit inbound, outbound, and adjustment history across ingredients.",
    roles: LEDGER_ROLES,
    lockedTitle: "Ledger access required",
    lockedDescription:
      "Switch to an Admin, Manager, or Finance profile to audit stock movements and adjustments.",
    fallback: "receiving",
  },
] as const;
type DetailPanelKey = (typeof DETAIL_PANELS)[number]["key"];
type DetailPanelConfig = (typeof DETAIL_PANELS)[number];
function PanelLoader({
  message,
  note,
  compact = false,
}: {
  message: string;
  note: string;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex items-center justify-center p-6"
          : "flex h-full items-center justify-center"
      }
    >
      {" "}
      <TurtleLoader message={message} note={note} small={compact} />{" "}
    </div>
  );
}
function PermissionNotice({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  const classes = [
    "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center text-slate-300",
    className,
  ]
    .filter(Boolean)
    .join("");
  return (
    <div className={classes}>
      {" "}
      <Lock className="mb-3 h-8 w-8 text-slate-400" />{" "}
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>{" "}
      <p className="text-sm leading-relaxed text-slate-400">
        {description}
      </p>{" "}
    </div>
  );
} /** * PurchasingReceiving Module - Floating Panel * Main entry point for the purchasing & receiving module * Used by both full-page and floating panel contexts */
export default function PurchasingReceivingModule() {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderFormSeedRows, setOrderFormSeedRows] = useState<
    OrderGuideRow[] | null
  >(null);
  const [activeDetailPanel, setActiveDetailPanel] = useState<DetailPanelKey>(
    DETAIL_PANELS[0].key,
  ); // Allow demo/test access even without proper role const canUseOrderGuide = !role || PURCHASING_ROLES.includes(role as any); const canUseOrderForm = canUseOrderGuide; const detailAccess = useMemo<Record<DetailPanelKey, boolean>>(() => { const map = {} as Record<DetailPanelKey, boolean>; DETAIL_PANELS.forEach((panel) => { // Allow demo access if no role is set map[panel.key] = !role || panel.roles.includes(role as any); }); return map; }, [role]); const firstAccessiblePanel = useMemo<DetailPanelKey>(() => { const allowed = DETAIL_PANELS.find((panel) => detailAccess[panel.key]); return allowed?.key ?? DETAIL_PANELS[0].key; }, [detailAccess]); const handleSendToOrderForm = useCallback( (rows: OrderGuideRow[]) => { if (!rows.length || !canUseOrderForm) return; setOrderFormSeedRows(rows); setOrderFormOpen(true); }, [canUseOrderForm], ); const renderDetailPanel = (panel: DetailPanelConfig) => { const fallbackKey = panel.fallback; switch (panel.key) { case"receiving": return ( <Suspense fallback={ <PanelLoader message="Loading receiving workspace" note="Syncing inbound deliveries and QC checkpoints" /> } > <ReceivingPanel panelId="RCV-1" onClose={() => setActiveDetailPanel(fallbackKey)} onMinimize={() => setActiveDetailPanel(fallbackKey)} /> </Suspense> ); case"inventory": return ( <Suspense fallback={ <PanelLoader message="Loading inventory lots" note="Aggregating vendor batches and expirations" /> } > <InventoryLotsPanel panelId="INV-1" onClose={() => setActiveDetailPanel(fallbackKey)} onMinimize={() => setActiveDetailPanel(fallbackKey)} /> </Suspense> ); case"ledger": return ( <Suspense fallback={ <PanelLoader message="Loading stock ledger" note="Compiling adjustments and cost movements" /> } > <StockLedgerPanel panelId="LED-1" onClose={() => setActiveDetailPanel(fallbackKey)} onMinimize={() => setActiveDetailPanel(fallbackKey)} /> </Suspense> ); default: return null; } }; return ( <div className="w-full h-full flex flex-col bg-background overflow-hidden"> {/* Header with flow diagram */} <div className="flex-shrink-0 border-b border-border/30 p-4"> <div className="space-y-3"> <div className="flex items-center justify-between"> <h2 className="text-lg font-semibold text-foreground"> Purchasing → Inventory </h2> <Button size="sm" variant="ghost" onClick={() => window.location.reload()} className="h-8 w-8 p-0" > <RefreshCw size={16} /> </Button> </div> <p className="text-xs text-foreground/60"> Build purchasing plans from demand, review orders, and hand off to receiving & inventory. </p> <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-foreground/50"> <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-100 text-[10px] px-2 py-0.5" > Demand → Order Guide </Badge> <span>→</span> <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-100 text-[10px] px-2 py-0.5" > Draft PO </Badge> <span>→</span> <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-[10px] px-2 py-0.5" > Receiving </Badge> <span>→</span> <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-100 text-[10px] px-2 py-0.5" > Lots </Badge> <span>→</span> <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-100 text-[10px] px-2 py-0.5" > Ledger </Badge> </div> </div> </div> {/* Tabbed content area */} <div className="flex-1 overflow-hidden"> <Tabs value={canUseOrderGuide ?"guide" : activeDetailPanel} onValueChange={(value) => { if (value !=="guide") setActiveDetailPanel(value as DetailPanelKey); }} className="h-full flex flex-col" > <TabsList className="h-auto w-full justify-start rounded-none border-b border-border/30 bg-transparent p-0"> {canUseOrderGuide && ( <TabsTrigger value="guide" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent" > Order Guide </TabsTrigger> )} {DETAIL_PANELS.map((panel) => ( <TabsTrigger key={panel.key} value={panel.key} disabled={!detailAccess[panel.key]} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent disabled:opacity-50" > {panel.title} </TabsTrigger> ))} </TabsList> {/* Order Guide Tab */} {canUseOrderGuide && ( <TabsContent value="guide" className="flex-1 overflow-auto border-0 p-0" > <Suspense fallback={ <PanelLoader message="Loading order guide" note="Pulling menu demand, pars, and vendor pricing" /> } > <div className="h-full"> <OrderGuidePanel panelId="OG-1" onClose={() => setActiveDetailPanel("receiving")} onMinimize={() => setActiveDetailPanel("receiving")} onSendToOrderForm={handleSendToOrderForm} /> </div> </Suspense> </TabsContent> )} {/* Detail Panels Tabs */} {DETAIL_PANELS.map((panel) => ( <TabsContent key={panel.key} value={panel.key} className="flex-1 overflow-auto border-0 p-0" > {detailAccess[panel.key] ? ( renderDetailPanel(panel) ) : ( <div className="h-full p-4"> <PermissionNotice className="h-full" title={panel.lockedTitle} description={panel.lockedDescription} /> </div> )} </TabsContent> ))} </Tabs> </div> {/* Order Form Drawer */} {canUseOrderForm && orderFormOpen && ( <Suspense fallback={ <div className="flex items-center justify-center p-6"> <TurtleLoader message="Loading order form" note="Preparing draft PO" small /> </div> } > <div className="border-t border-border/30 bg-background p-4"> <OrderFormDrawer open={orderFormOpen} onOpenChange={setOrderFormOpen} seedRows={orderFormSeedRows || undefined} /> </div> </Suspense> )} </div> );
}
