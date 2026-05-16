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
import React from "react";
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
} from "lucide-react";
import { cn } from "@/lib/glass";
import { osBus } from "@/lib/os-bus";
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
import maestroEventBus from "./event-bus";
import { moduleRegistry } from "./module-registry";
import type { Event } from "./types";

// Lazy-load child modules
const MaestroKitchen = lazy(() =>
  import("@/modules/Maestro").then((m) => ({ default: m.default })),
);
const RecipeSearch = lazy(() =>
  import("@/modules/RecipeSearch").then((m) => ({ default: m.default })),
);
const CulinaryEngine = lazy(() =>
  import("@/modules/_stubs/CulinaryEngine").then((m) => ({
    default: m.default,
  })),
);
const InventoryEngine = lazy(() =>
  import("@/modules/InventoryEngine").then((m) => ({ default: m.default })),
);
const LaborEngine = lazy(() =>
  import("@/modules/LaborEngine").then((m) => ({ default: m.default })),
);
const EngineeringEngine = lazy(() =>
  import("@/modules/EngineeringEngine").then((m) => ({ default: m.default })),
);
const FinancialsEngine = lazy(() =>
  import("@/modules/FinancialsEngine").then((m) => ({ default: m.default })),
);
const MaestroDashboard = lazy(() =>
  import("@/modules/MaestroDashboard").then((m) => ({ default: m.default })),
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

// Tab configuration
interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const TABS: TabConfig[] = [
  { id: "timeline", label: "Timeline", icon: <Calendar size={18} /> },
  { id: "kitchen", label: "Kitchen", icon: <ChefHat size={18} /> },
  { id: "recipes", label: "Recipes", icon: <ChefHat size={18} /> },
  { id: "beo", label: "BEO Operations", icon: <ListChecks size={18} /> }, // NEW: Complete BEO detail workflow
  { id: "culinary", label: "Culinary", icon: <Package size={18} /> }, // Phase 3
  { id: "inventory", label: "Inventory", icon: <Package size={18} /> }, // Phase 3
  { id: "labor", label: "Labor", icon: <Users size={18} /> }, // Phase 5
  { id: "engineering", label: "Engineering", icon: <Zap size={18} /> }, // Phase 5
  { id: "financials", label: "Financials", icon: <DollarSign size={18} /> }, // Phase 7
];

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

  const eventId = props?.payload?.eventId;

  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [registryStatus, setRegistryStatus] = React.useState<any>(null);
  const [systemHealthy, setSystemHealthy] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("timeline");

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

  if (loading && activeTab === "timeline") {
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
    <div className="h-full bg-background flex flex-col">
      {/* Header with Tabs */}
      <div className="border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <img
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'/%3E%3C/svg%3E"
                  alt="Maestro BQT"
                  className="w-8 h-8 object-contain"
                />
                Maestro BQT
                {!systemHealthy && (
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </h1>
              <p className="text-sm text-foreground/60 mt-1">
                Unified orchestrator for hospitality operations
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Metrics Summary */}
              <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-lg bg-background/40 border border-border/20">
                <div className="text-center">
                  <p className="text-xs text-foreground/60">Events</p>
                  <p className="text-lg font-bold text-foreground">
                    {metrics.totalEvents}
                  </p>
                </div>
                <div className="w-px h-8 bg-border/20" />
                <div className="text-center">
                  <p className="text-xs text-foreground/60">Guests</p>
                  <p className="text-lg font-bold text-foreground">
                    {metrics.totalGuests}
                  </p>
                </div>
                <div className="w-px h-8 bg-border/20" />
                <div className="text-center">
                  <p className="text-xs text-foreground/60">Avg Margin</p>
                  <p className="text-lg font-bold text-foreground">
                    {metrics.averageMargin.toFixed(0)}%
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

          {/* Tab Navigation */}
          <div className="flex overflow-x-auto gap-1 pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/20 border border-primary/30 text-primary"
                    : "bg-background/40 border border-border/20 text-foreground/60 hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
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

        {/* Recipes Tab */}
        {activeTab === "recipes" && (
          <Suspense fallback={<LoadingFallback />}>
            <RecipeSearch />
          </Suspense>
        )}

        {/* BEO Operations Tab - NEW */}
        {activeTab === "beo" && (
          <Suspense fallback={<LoadingFallback />}>
            <div className="w-full h-full">
              <MaestroDashboard />
            </div>
          </Suspense>
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
    </div>
  );
}

export { EventTimeline, ChangeFeed, RiskDashboard };
export { useMaestroData } from "./hooks";
export { maestroApi } from "./api";
export { maestroEventBus } from "./event-bus";
export { moduleRegistry } from "./module-registry";
