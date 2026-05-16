/**
 * MaestroBQT Module
 * Unified orchestrator for hospitality operations
 * 7 Core Builds:
 * 1. Maestro BQT Core + Kitchen (Events & Kitchen Operations)
 * 2. Culinary Engine (Production)
 * 3. Inventory Engine (Supply Chain)
 * 4. Scheduling Engine (Labor)
 * 5. Engineering/AV (Assets & Facilities)
 * 6. EchoStratus/Aurum (Financial Intelligence)
 * 7. Orchestrator (Event Bus & Notifications)
 */

// CRITICAL: Import React normally - let Vite handle it
import React, { Suspense } from "react";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  ChefHat,
  Package,
  Users,
  Zap,
  DollarSign,
  Settings,
  ListChecks,
  LayoutGrid,
  Search,
  Warehouse,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { osBus } from "@/lib/os-bus";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  useMaestroData,
  useEventBusSubscription,
  useMetricsCalculation,
} from "./hooks";
import { EventTimeline } from "./components/EventTimeline";
import BEOInbox from "./components/BEOInbox";
import IncomingEventsFeed from "./components/IncomingEventsFeed";
import { ChangeFeed } from "./components/ChangeFeed";
import { RiskDashboard } from "./components/RiskDashboard";
import { BEOWorkflowList, ChangelogToolbarButton } from "./components/BEOWorkflow";
import maestroEventBus from "./event-bus";
import { moduleRegistry } from "./module-registry";
import type { Event } from "./types";

// Lazy-load child modules (use React.lazy so lazy is in scope when bundle loads)
const MaestroKitchen = React.lazy(() =>
  import("@/modules/Maestro").then((m) => ({ default: m.default })),
);
const RecipeSearch = React.lazy(() =>
  import("@/modules/Culinary/client/pages/sections/RecipeSearch").then((m) => ({ default: m.default })).catch(() => ({ default: () => <div className="p-6 text-sm text-muted-foreground">Recipe Search unavailable</div> })),
);
const CulinaryEngine = React.lazy(() =>
  import("../_stubs/CulinaryEngine").then((m) => ({
    default: m.default,
  })).catch(() => ({ default: () => <div className="p-6 text-sm text-muted-foreground">Culinary Engine unavailable</div> })),
);
const InventoryEngine = React.lazy(() =>
  import("@/modules/InventoryReceiving").then((m) => ({ default: m.default })).catch(() => ({ default: () => <div className="p-6 text-sm text-muted-foreground">Inventory unavailable</div> })),
);
const LaborEngine = React.lazy(() =>
  import("@/modules/LaborCommandCenter").then((m) => ({ default: m.default })).catch(() => ({ default: () => <div className="p-6 text-sm text-muted-foreground">Labor unavailable</div> })),
);
const EngineeringEngine = React.lazy(() =>
  import("@/modules/Engineering").then((m) => ({ default: m.default })).catch(() => ({ default: () => <div className="p-6 text-sm text-muted-foreground">Engineering unavailable</div> })),
);
const FinancialsEngine = React.lazy(() =>
  import("@/modules/FinancialOps").then((m) => ({ default: m.default })).catch(() => ({ default: () => <div className="p-6 text-sm text-muted-foreground">Financials unavailable</div> })),
);
const MaestroDashboard = React.lazy(() =>
  import("@/modules/MaestroDashboard").then((m) => ({ default: m.default })),
);
const BanquetMenuBuilderPanel = React.lazy(() =>
  import("@/modules/BanquetMenuBuilder")
    .then((m) => ({ default: m.BanquetMenuBuilderModule.panel }))
    .catch(() => ({
      default: () => (
        <div className="p-6 text-sm text-muted-foreground">
          Banquet Menu Builder unavailable
        </div>
      ),
    })),
);
const ProductionCommandCenter = React.lazy(() =>
  import("./components/ProductionCommandCenter").then((m) => ({ default: m.default })),
);

// Loading Fallback Component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-foreground/60">Loading module...</p>
      </div>
    </div>
  );
}

// Navigation items for Sidebar
interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "month-timeline", label: "Month Timeline (NEW)", icon: Calendar },
  { id: "production", label: "Production", icon: ListChecks },
  { id: "timeline", label: "Timeline", icon: Calendar },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "banquet-menus", label: "Banquet Menus", icon: BookOpen },
  { id: "recipes", label: "Recipes", icon: Search },
  { id: "beo", label: "BEO Operations", icon: ClipboardList },
  { id: "culinary", label: "Culinary", icon: ChefHat },
  { id: "inventory", label: "Inventory", icon: Warehouse },
  { id: "labor", label: "Labor", icon: Users },
  { id: "engineering", label: "Engineering", icon: Zap },
  { id: "financials", label: "Financials", icon: DollarSign },
];

// iter266.15 · Month Timeline (P&L-replay style for 1500+ BEOs) lazy-loaded
const BEOTimelineUI = React.lazy(() =>
  import("@/modules/BEOTimelineUI").then((m) => ({ default: m.default })),
);

/**
 * Main MaestroBQT Component - Unified Orchestrator
 */
export default function MaestroBQTModule(props: any) {
  const {
    events,
    spaces,
    tasks,
    changes,
    shortages,
    financials,
    conflicts,
    loading,
    error,
    refetch,
  } = useMaestroData();

  const eventId = props?.eventId ?? props?.payload?.eventId;

  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [registryStatus, setRegistryStatus] = React.useState<any>(null);
  const [systemHealthy, setSystemHealthy] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("dashboard");

  const metrics = useMetricsCalculation(events, financials);

  // Subscribe to event bus events
  useEventBusSubscription("*");

  React.useEffect(() => {
    const unsubCreate = osBus.on("calendar:event_created", ({ eventId }) => {
      osBus.emit("maestro:event_received", { eventId, source: "MaestroBQT" });
      console.log("[MaestroBQT] received new event", eventId);
    });

    const unsubUpdate = osBus.on("calendar:event_updated", ({ eventId }) => {
      osBus.emit("maestro:event_received", { eventId, source: "MaestroBQT" });
      console.log("[MaestroBQT] received updated event", eventId);
    });

    return () => {
      unsubCreate();
      unsubUpdate();
    };
  }, []);

  // Initialize module registry on mount
  React.useEffect(() => {
    const initializeRegistry = async () => {
      try {
        await moduleRegistry.discoverModules();
        setRegistryStatus(moduleRegistry.getStatus());
      } catch (err) {
        console.error(
          "[MaestroBQT] Failed to initialize module registry:",
          err,
        );
      }
    };

    initializeRegistry();
  }, []);

  // Monitor system health
  React.useEffect(() => {
    const unsubscribe = maestroEventBus.subscribe("*", (message) => {
      // Check for errors
      if (
        message.type &&
        (message.type.includes("ERROR") || message.type.includes("CONFLICT"))
      ) {
        setSystemHealthy(false);
        setTimeout(() => setSystemHealthy(true), 5000);
      }
    });

    return unsubscribe;
  }, []);

  if (loading && activeTab === "dashboard") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="space-y-4 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-foreground/60">Loading Maestro BQT...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false} panelMode>
      <div className="flex h-full w-full bg-background">
        {/* Sidebar */}
        <Sidebar>
          <SidebarHeader>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
              Maestro BQT
            </h2>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.id)}
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto flex flex-col">
          {/* Header with Metrics */}
          <div className="border-b border-border/20 bg-background/80 backdrop-blur-sm">
            <div className="px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <img
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'/%3E%3C/svg%3E"
                      alt="Maestro BQT"
                      className="w-8 h-8 object-contain"
                    />
                    {NAV_ITEMS.find((item) => item.id === activeTab)?.label || "Maestro BQT"}
                    {!systemHealthy && (
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </h1>
                  <p className="text-sm text-foreground/60 mt-1">
                    Unified orchestrator for hospitality operations
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Metrics Summary */}
                  <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-lg bg-background/40 border border-border/20">
                    <div className="text-center">
                      <p className="text-xs text-foreground/60">Events</p>
                      <p className="text-lg font-bold text-foreground">
                        {typeof metrics.totalEvents === 'number' ? metrics.totalEvents : '0'}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border/20" />
                    <div className="text-center">
                      <p className="text-xs text-foreground/60">Guests</p>
                      <p className="text-lg font-bold text-foreground">
                        {typeof metrics.totalGuests === 'number' ? metrics.totalGuests : '0'}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border/20" />
                    <div className="text-center">
                      <p className="text-xs text-foreground/60">Avg Margin</p>
                      <p className="text-lg font-bold text-foreground">
                        {typeof metrics.averageMargin === 'number' && !isNaN(metrics.averageMargin) ? metrics.averageMargin.toFixed(0) : '0'}%
                      </p>
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={refetch}
                    className="p-2 rounded-lg hover:bg-background/60 transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-5 h-5 text-foreground/60 hover:text-foreground" />
                  </button>
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
        {/* Dashboard Tab — Command Center Overview */}
        {activeTab === "dashboard" && (
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6" data-testid="maestro-bqt-dashboard">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground/50 mb-1">Active Events</p>
                <p className="text-2xl font-bold text-foreground">{events.length}</p>
                <p className="text-xs text-foreground/40 mt-0.5">{events.filter((e: any) => e.stage === "deposit_received" || e.stage === "contract_signed").length} confirmed</p>
              </div>
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground/50 mb-1">Total Guests</p>
                <p className="text-2xl font-bold text-foreground">{typeof metrics.totalGuests === 'number' ? metrics.totalGuests.toLocaleString() : '0'}</p>
                <p className="text-xs text-foreground/40 mt-0.5">across all events</p>
              </div>
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground/50 mb-1">Pipeline Revenue</p>
                <p className="text-2xl font-bold text-emerald-500">${typeof metrics.totalRevenue === 'number' ? metrics.totalRevenue.toLocaleString() : '0'}</p>
                <p className="text-xs text-foreground/40 mt-0.5">{typeof metrics.averageMargin === 'number' && !isNaN(metrics.averageMargin) ? metrics.averageMargin.toFixed(0) : '0'}% avg margin</p>
              </div>
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
                <p className="text-[10px] uppercase tracking-wider text-foreground/50 mb-1">Risk Alerts</p>
                <p className="text-2xl font-bold text-foreground">{(shortages?.length || 0) + (conflicts?.length || 0)}</p>
                <p className="text-xs text-foreground/40 mt-0.5">{shortages?.length || 0} shortages, {conflicts?.length || 0} conflicts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Events */}
              <div className="lg:col-span-2 rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border/10">
                  <h3 className="text-sm font-semibold text-foreground">Upcoming Events</h3>
                </div>
                <div className="divide-y divide-border/10">
                  {events.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-foreground/40 text-center">No events in pipeline</p>
                  ) : (
                    events.slice(0, 6).map((ev: any, i: number) => (
                      <div key={ev.id || i} className="px-4 py-3 flex items-center justify-between hover:bg-background/60 cursor-pointer transition-colors" onClick={() => { setSelectedEvent(ev); setActiveTab("timeline"); }}>
                        <div>
                          <p className="text-sm font-medium text-foreground">{ev.name || `Event ${i + 1}`}</p>
                          <p className="text-xs text-foreground/50">{ev.event_date || ev.date || "TBD"} — {ev.venue || "No venue"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{ev.guest_count || 0} guests</p>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium",
                            ev.stage === "deposit_received" || ev.stage === "contract_signed" ? "bg-emerald-500/15 text-emerald-500" :
                            ev.stage === "prospect" || ev.stage === "inquiry" ? "bg-yellow-500/15 text-yellow-500" :
                            "bg-blue-500/15 text-blue-500"
                          )}>{(ev.stage || "unknown").replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Quick Actions + Risk */}
              <div className="space-y-4">
                {/* Quick Actions */}
                <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Production Center", tab: "production", icon: ListChecks },
                      { label: "View Timeline", tab: "timeline", icon: Calendar },
                      { label: "BEO Operations", tab: "beo", icon: ClipboardList },
                      { label: "Kitchen Ops", tab: "kitchen", icon: ChefHat },
                      { label: "Financials", tab: "financials", icon: DollarSign },
                    ].map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.tab}
                          onClick={() => setActiveTab(action.tab)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground/70 hover:text-foreground hover:bg-background/60 border border-border/10 transition-colors"
                          data-testid={`quick-action-${action.tab}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Risk Summary */}
                <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <RiskDashboard
                    financials={financials}
                    shortages={shortages}
                    conflicts={conflicts}
                    events={events}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* iter266.15 · Month Timeline (NEW) — P&L-replay style for 1500+ BEOs */}
        {activeTab === "month-timeline" && (
          <Suspense fallback={<LoadingFallback />}>
            <div style={{ height: "calc(100vh - 120px)", minHeight: 600 }}>
              <BEOTimelineUI />
            </div>
          </Suspense>
        )}

        {/* Production Command Center Tab */}
        {activeTab === "production" && (
          <Suspense fallback={<LoadingFallback />}>
            <ProductionCommandCenter />
          </Suspense>
        )}


        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
            {eventId && (
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  marginBottom: 10,
                }}
              >
                <strong>Focused Event:</strong> {eventId}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Timeline */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <EventTimeline
                    events={events}
                    spaces={spaces}
                    selectedEvent={selectedEvent}
                    onSelectEvent={setSelectedEvent}
                  />
                </div>
              </div>

              {/* Right Column: Feeds & Dashboard */}
              <div className="space-y-6">
                <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <BEOInbox />
                </div>

                <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <IncomingEventsFeed />
                </div>

                {/* Risk Dashboard */}
                <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <RiskDashboard
                    financials={financials}
                    shortages={shortages}
                    conflicts={conflicts}
                    events={events}
                  />
                </div>

                {/* Change Feed */}
                <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                  <ChangeFeed changes={changes} events={events} limit={10} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kitchen Tab (Build #1) */}
        {activeTab === "kitchen" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <MaestroKitchen />
            </div>
          </Suspense>
        )}

        {/* Banquet Menus Tab (BMB Pkg 1) */}
        {activeTab === "banquet-menus" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <BanquetMenuBuilderPanel />
            </div>
          </Suspense>
        )}

        {/* Recipes Tab */}
        {activeTab === "recipes" && (
          <Suspense fallback={<LoadingFallback />}>
            <RecipeSearch />
          </Suspense>
        )}

        {/* BEO Operations Tab - Real BEO Workflow */}
        {activeTab === "beo" && (
          <BEOWorkflowList />
        )}

        {/* Culinary Tab (Phase 3) */}
        {activeTab === "culinary" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <CulinaryEngine />
            </div>
          </Suspense>
        )}

        {/* Inventory Tab (Phase 3) */}
        {activeTab === "inventory" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <InventoryEngine />
            </div>
          </Suspense>
        )}

        {/* Labor Tab (Phase 5) */}
        {activeTab === "labor" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <LaborEngine />
            </div>
          </Suspense>
        )}

        {/* Engineering Tab (Phase 5) */}
        {activeTab === "engineering" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <EngineeringEngine />
            </div>
          </Suspense>
        )}

        {/* Financials Tab (Phase 7) */}
        {activeTab === "financials" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <FinancialsEngine />
            </div>
          </Suspense>
        )}
          </div>

          {/* Module Status (Development) */}
          {process.env.NODE_ENV === "development" && registryStatus && (
            <div className="border-t border-border/20 bg-background/40 backdrop-blur-sm p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Module Registry Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {Object.entries(registryStatus.modules).map(
                  ([name, status]: [string, any]) => (
                    <div
                      key={name}
                      className={cn(
                        "px-2 py-1 rounded border",
                        status === "loaded"
                          ? "bg-green-500/10 border-green-500/30 text-green-700"
                          : status === "error"
                            ? "bg-red-500/10 border-red-500/30 text-red-700"
                            : "bg-gray-500/10 border-gray-500/30 text-gray-700",
                      )}
                    >
                      {name}: {status}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}

export { EventTimeline, ChangeFeed, RiskDashboard };
export { useMaestroData } from "./hooks";
export { maestroApi } from "./api";
export { maestroEventBus } from "./event-bus";
export { moduleRegistry } from "./module-registry";
