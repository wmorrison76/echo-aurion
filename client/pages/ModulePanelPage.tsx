/**
 * ModulePanelPage - Full-page view for sidebar modules
 * Renders Culinary, Pastry, Schedule, Ordering Inventory, Purchasing Receiving,
 * Video Conference, Whiteboard, etc. in the main content area.
 * Route: /panel/:panelId
 */
import React, { Suspense, lazy } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PANEL_METADATA } from "@/lib/panel-registry";

const MODULE_LOADERS: Record<string, () => Promise<{ default: React.ComponentType<any> }>> = {
  culinary: () => import("@/modules/Culinary"),
  pastry: () => import("@/modules/Pastry"),
  schedule: () => import("@/schedule-panel"),
  inventory: () => import("@/modules/OrderingInventory"),
  "purchasing-receiving": () => import("@/modules/PurchRec"),
  video: () => import("@/modules/VideoConference"),
  whiteboard: () => import("@/modules/Whiteboard"),
  aurum: () => import("@/modules/EchoAurum/EchoAurumPanel"),
  "echo-events": () => import("@/modules/EchoEventStudio"),
  layout: () => import("@/modules/EchoLayout"),
  mixology_sommelier: () => import("@/modules/MixologySommelier"),
  stratus: () => import("@/modules/EchoStratus"),
  "forecast-hub": () => import("@/modules/ForecastHub"),
  "maestro-bqt": () => import("@/modules/MaestroBQT"),
  // iter263 · Admin Console + its satellite aliases.
  "admin-console": () => import("@/modules/AdminConsole"),
  "system-updates": () => import("@/modules/AdminConsole"),
  "desktop-installers": () => import("@/modules/AdminConsole"),
  "it-operations": () => import("@/modules/AdminConsole"),
  "audit-security": () => import("@/modules/AdminConsole"),
  "feature-flags": () => import("@/modules/AdminConsole"),
  "tech-support": () => import("@/modules/AdminConsole"),
  "purchrec-sprint1": () => import("@/modules/PurchRec/Sprint1"),
  "vendor-scorecard": () => import("@/modules/PurchRec/Sprint2VendorScorecard"),
  "beo-planner": () => import("@/modules/BeoPlanner"),
  "ird-builder": () => import("@/modules/IRDBuilder"),
  "spa-builder": () => import("@/modules/SpaBuilder"),
};

function LoadingFallback({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center w-full min-h-[400px] bg-muted/20 rounded-lg">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-primary/30 border-t-primary mb-4" />
        <p className="text-muted-foreground">Loading {label}…</p>
      </div>
    </div>
  );
}

export default function ModulePanelPage() {
  const { panelId } = useParams<{ panelId: string }>();
  const loader = panelId ? MODULE_LOADERS[panelId] : null;
  const metadata = panelId ? PANEL_METADATA[panelId as keyof typeof PANEL_METADATA] : null;
  const label = metadata?.label ?? panelId ?? "Module";

  const LazyModule = loader ? lazy(loader) : null;

  if (!panelId || !loader) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <p className="text-muted-foreground mb-4">Module not found: {panelId ?? "(none)"}</p>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full" style={{ minHeight: "calc(100vh - 48px)" }}>
      {/* Minimal header */}
      <header className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </header>

      {/* Module content */}
      <main className="flex-1 min-h-0 flex flex-col overflow-auto">
        <Suspense fallback={<LoadingFallback label={label} />}>
          <div className="flex-1 min-h-[400px] flex flex-col overflow-auto">
            <LazyModule />
          </div>
        </Suspense>
      </main>
    </div>
  );
}
