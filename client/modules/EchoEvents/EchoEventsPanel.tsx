import React from "react";
import {
  BarChart3,
  Building,
  Calendar,
  FileText,
  GanttChart,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Loader2,
  ListChecks,
  RefreshCw,
  Settings,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { get } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import CrmWowDashboard from "./components/dashboard/CrmWowDashboard";
import CrmDetailPanel from "./components/dashboard/CrmDetailPanel";
import { BeoOpsGanttPanel } from "./components/BeoOpsGanttPanel";
import { MasterOpsPanel } from "./components/MasterOpsPanel";
import OpsBoard from "./components/events/OpsBoard";
import EnhancedBeoGenerator from "./components/EnhancedBeoGenerator";
import BeoBuilder from "./components/BeoBuilder";
import EchoViewerDrawer from "./components/EchoViewerDrawer";
import EchoChatBubble from "./components/EchoChatBubble";
import WhiteLabelProvider from "./components/WhiteLabelProvider";
import { MenuLibrary } from "./components/menu/MenuLibrary";
import { EventMenuPanel } from "./components/menu/EventMenuPanel";
import type { Menu } from "@shared/menu-types";
import EventsCalendarModal from "./components/EventsCalendarModal";
import { RewardsAdminPanelNew } from "./components/admin/RewardsAdminPanelNew";

// iter201 · Consolidated Events suite — these modules used to live as 4
// separate sidebar entries. Now lazy-loaded as tabs inside Echo Events so the
// whole suite "talks" through one shared AI + data spine.
const ScenarioPlannerLazy = React.lazy(() => import("@/modules/ScenarioPlanner"));
const EventBriefLazy = React.lazy(() => import("@/modules/EventBrief"));
const ConventionManagementLazy = React.lazy(() => import("@/modules/ConventionManagement"));
const EchoEventsReportLazy = React.lazy(() => import("./index"));

export interface EchoEventsPanelProps {
  panelId?: string;
  onDelete?: () => void;
  initialView?: EchoEventsViewId;
  detailPanel?: string;
}

type EchoEventsViewId =
  | "dashboard"
  | "crm"
  | "master-ops"
  | "beo-gantt"
  | "events"
  | "contracts"
  | "menus"
  | "calendar"
  | "report"
  | "scenario"
  | "ai-brief"
  | "conventions"
  | "analytics"
  | "admin";

const VIEWS: Array<{
  id: EchoEventsViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "crm", label: "CRM", icon: Users },
  { id: "master-ops", label: "Master Ops", icon: GanttChart },
  { id: "beo-gantt", label: "BEO Gantt", icon: ListChecks },
  { id: "events", label: "Events", icon: Calendar },
  { id: "contracts", label: "BEO / Contracts", icon: FileText },
  { id: "menus", label: "Menus", icon: UtensilsCrossed },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "report", label: "Events Report", icon: FileText },
  { id: "scenario", label: "Scenario Planner", icon: LineChartIcon },
  { id: "ai-brief", label: "AI Event Brief", icon: LayoutDashboard },
  { id: "conventions", label: "Conventions", icon: Building },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "admin", label: "Admin", icon: Settings },
];

// iter209 · code-split (audit FE-1) — CRM surface lives in ./tabs/CrmTab.tsx
const CrmTabLazy = React.lazy(() => import("./tabs/CrmTab"));
import type { CrmMetrics, CrmForecastMonth } from "./tabs/CrmTab";

export default function EchoEventsPanel({
  panelId,
  onDelete,
  initialView,
  detailPanel,
}: EchoEventsPanelProps) {
  const [active, setActive] = React.useState<EchoEventsViewId>(
    initialView || "dashboard",
  );
  const [crmDetailPanel, setCrmDetailPanel] = React.useState<string | null>(
    detailPanel || null,
  );
  const [selectedMenu, setSelectedMenu] = React.useState<Menu | null>(null);
  const [selectedMenuItems, setSelectedMenuItems] = React.useState<string[]>(
    [],
  );

  const handleSelectMenu = React.useCallback(
    (menu: Menu, items: string[] = []) => {
      setSelectedMenu(menu);
      setSelectedMenuItems(items);
    },
    [],
  );

  const handleToggleMenuItem = React.useCallback((itemId: string) => {
    setSelectedMenuItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  }, []);

  const handleClearMenu = React.useCallback(() => {
    setSelectedMenu(null);
    setSelectedMenuItems([]);
  }, []);

  React.useEffect(() => {
    if (initialView) setActive(initialView);
  }, [initialView]);

  React.useEffect(() => {
    if (detailPanel) setCrmDetailPanel(detailPanel);
  }, [detailPanel]);

  // Allow deep-links from shared ops drawer/actions.
  React.useEffect(() => {
    const handler = (evt: Event) => {
      const ce = evt as unknown as CustomEvent<any>;
      const detail = ce?.detail ?? {};
      const kind = String(detail?.kind || "");
      if (kind === "recipe" || kind === "menu_item") {
        setActive("menus");
        return;
      }
      if (kind === "purchase_order" || kind === "receiving") {
        setActive("contracts");
        return;
      }
      setActive("beo-gantt");
    };
    window.addEventListener("ops:navigate", handler as EventListener);
    return () =>
      window.removeEventListener("ops:navigate", handler as EventListener);
  }, []);

  const [crmMetrics, setCrmMetrics] = React.useState<CrmMetrics | null>(null);
  const [crmForecast, setCrmForecast] = React.useState<CrmForecastMonth[]>([]);
  const [crmLoading, setCrmLoading] = React.useState(false);

  const refreshCrm = React.useCallback(async () => {
    try {
      setCrmLoading(true);
      const [m, f] = await Promise.all([
        get<{ success: boolean; data: CrmMetrics }>("/api/crm/metrics"),
        get<{ success: boolean; data: { months: CrmForecastMonth[] } }>(
          "/api/crm/forecast?months=12",
        ),
      ]);
      setCrmMetrics(m?.data || null);
      setCrmForecast(Array.isArray(f?.data?.months) ? f.data.months : []);
    } catch {
      setCrmMetrics(null);
      setCrmForecast([]);
    } finally {
      setCrmLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshCrm();
  }, [refreshCrm]);

  return (
    <WhiteLabelProvider>
    <div className="h-full flex bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-xl">
        <div className="px-4 py-3 border-b border-sidebar-border bg-sidebar-accent/40">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <div className="text-sm font-semibold text-foreground">
              Echo Events
            </div>
          </div>
          <div className="text-[11px] text-foreground/60 mt-1 truncate">
            panel: {panelId || "—"}
          </div>
        </div>

        <div className="p-2 space-y-1">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const isActive = v.id === active;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActive(v.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5 border border-transparent",
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 min-h-0">
          {active === "dashboard" && (
            <div className="h-full overflow-auto p-4">
              <CrmWowDashboard />
            </div>
          )}

          {active === "crm" && (
            <div className="h-full overflow-auto p-4">
              <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Loading CRM…</div>}>
                <CrmTabLazy
                  crmLoading={crmLoading}
                  crmMetrics={crmMetrics}
                  crmForecast={crmForecast}
                  onRefresh={refreshCrm}
                  detailPanel={crmDetailPanel}
                  onCloseDetail={() => setCrmDetailPanel(null)}
                />
              </React.Suspense>
            </div>
          )}

          {active === "master-ops" && (
            <div className="h-full">
              <MasterOpsPanel />
            </div>
          )}

          {active === "beo-gantt" && (
            <div className="h-full">
              <BeoOpsGanttPanel />
            </div>
          )}

          {active === "events" && (
            <div className="h-full overflow-auto p-4">
              <OpsBoard />
            </div>
          )}

          {active === "contracts" && (
            <div className="h-full overflow-auto p-4 space-y-4">
              <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">
                  BEO / Contracts
                </div>
                <EventsCalendarModal>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                  >
                    Open Calendar
                  </button>
                </EventsCalendarModal>
              </div>

              {/* iter203a · 3-panel BEO Builder (library ↔ selected with arrows) */}
              <div className="rounded-lg border border-border/20 overflow-hidden" style={{ height: "640px" }}>
                <BeoBuilder />
              </div>

              {/* iter202 · Events-with-BEO overview (was missing — previously only showed the generator) */}
              <ContractsEventsOverview />

              <div className="flex flex-wrap items-center gap-3">
                <EnhancedBeoGenerator
                  selectedMenu={selectedMenu ?? undefined}
                  selectedItems={selectedMenuItems}
                />
                <div className="text-xs text-foreground/60">
                  Generate a contract/BEO pack for an event workflow.
                </div>
              </div>
            </div>
          )}

          {active === "menus" && (
            <div className="h-full overflow-auto p-4 space-y-4">
              <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">
                  Menus
                </div>
                <div className="text-xs text-foreground/60">
                  Menu library and catalog management
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MenuLibrary
                  selectedMenu={selectedMenu}
                  selectedItems={selectedMenuItems}
                  onSelectMenu={handleSelectMenu}
                  onToggleItem={handleToggleMenuItem}
                />
                <EventMenuPanel
                  selectedMenu={selectedMenu}
                  selectedItems={selectedMenuItems}
                  onToggleItem={handleToggleMenuItem}
                  onClearMenu={handleClearMenu}
                />
              </div>
            </div>
          )}

          {active === "calendar" && (
            <div className="h-full overflow-auto p-4 space-y-4">
              <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">
                  Calendar
                </div>
                <EventsCalendarModal>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                  >
                    Open Calendar
                  </button>
                </EventsCalendarModal>
              </div>
              <div className="text-xs text-foreground/60">
                Open the calendar to review upcoming events and schedules.
              </div>
            </div>
          )}

          {active === "analytics" && (
            <div className="h-full overflow-auto p-4">
              <EchoEventsAnalyticsView
                crmLoading={crmLoading}
                crmMetrics={crmMetrics}
                crmForecast={crmForecast}
                onRefresh={refreshCrm}
              />
            </div>
          )}

          {active === "report" && (
            <div data-testid="ee-tab-report" className="h-full overflow-auto">
              <React.Suspense fallback={<div className="p-6 text-xs text-foreground/60">Loading Events Report…</div>}>
                <EchoEventsReportLazy />
              </React.Suspense>
            </div>
          )}

          {active === "scenario" && (
            <div data-testid="ee-tab-scenario" className="h-full overflow-auto">
              <React.Suspense fallback={<div className="p-6 text-xs text-foreground/60">Loading Scenario Planner…</div>}>
                <ScenarioPlannerLazy />
              </React.Suspense>
            </div>
          )}

          {active === "ai-brief" && (
            <div data-testid="ee-tab-ai-brief" className="h-full overflow-auto">
              <React.Suspense fallback={<div className="p-6 text-xs text-foreground/60">Loading AI Event Brief…</div>}>
                <EventBriefLazy />
              </React.Suspense>
            </div>
          )}

          {active === "conventions" && (
            <div data-testid="ee-tab-conventions" className="h-full overflow-auto">
              <React.Suspense fallback={<div className="p-6 text-xs text-foreground/60">Loading Conventions…</div>}>
                <ConventionManagementLazy />
              </React.Suspense>
            </div>
          )}

          {active === "admin" && (
            <div className="h-full overflow-auto p-4 space-y-4">
              <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">
                  Admin
                </div>
                <div className="text-xs text-foreground/60">
                  Rewards / governance
                </div>
              </div>
              <RewardsAdminPanelNew />
            </div>
          )}
        </div>
      </div>
      <EchoViewerDrawer />
      <EchoChatBubble />
    </div>
    </WhiteLabelProvider>
  );
}

function EchoEventsAnalyticsView({
  crmLoading,
  crmMetrics,
  crmForecast,
  onRefresh,
}: {
  crmLoading: boolean;
  crmMetrics: CrmMetrics | null;
  crmForecast: CrmForecastMonth[];
  onRefresh: () => Promise<void>;
}) {
  const chartData = React.useMemo(
    () =>
      crmForecast.map((m) => ({
        month: String(m.month || "").slice(0, 7),
        pipeline: Math.round(m.pipeline || 0),
        weighted: Math.round(m.weighted || 0),
        goal: Math.round(m.goal || 0),
      })),
    [crmForecast],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Analytics</div>
          <div className="text-xs text-foreground/60">
            Live CRM metrics + forecast (stage-weighted).
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onRefresh()}
          disabled={crmLoading}
        >
          {crmLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pipeline (30d)</CardTitle>
            <CardDescription>Upcoming event revenue</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            ${Math.round(crmMetrics?.pipeline30d || 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weighted (30d)</CardTitle>
            <CardDescription>Stage-weighted forecast</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">
            ${Math.round(crmMetrics?.weighted30d || 0).toLocaleString()}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rush risk (72h)</CardTitle>
            <CardDescription>Events inside 3 days</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {crmMetrics?.rush72hCount ?? 0}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">VIP clients</CardTitle>
            <CardDescription>Clients tagged “vip”</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {crmMetrics?.vipClientsCount ?? 0}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            12‑Month Forecast
          </CardTitle>
          <CardDescription>
            Pipeline vs weighted vs goals (if configured).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {crmLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pipeline"
                    stroke="#3b82f6"
                    name="Pipeline"
                  />
                  <Line
                    type="monotone"
                    dataKey="weighted"
                    stroke="#10b981"
                    name="Weighted"
                  />
                  <Line
                    type="monotone"
                    dataKey="goal"
                    stroke="#f59e0b"
                    name="Goal"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


// iter202 · BEO/Contracts events overview — lists all scheduled events so users
// can see which ones already have a BEO and which still need one. Uses the same
// /api/events source as the old Echo Events module.
function ContractsEventsOverview() {
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "with_beo" | "needs_beo">("all");

  React.useEffect(() => {
    (async () => {
      try {
        const apiBase = (import.meta as any).env?.VITE_REACT_APP_BACKEND_URL ||
          (import.meta as any).env?.REACT_APP_BACKEND_URL ||
          (typeof window !== "undefined" ? window.location.origin : "");
        const r = await fetch(`${apiBase}/api/events?limit=100`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const items = Array.isArray(j) ? j : (j.events || j.data || []);
        setEvents(items);
      } catch (e: any) {
        setError(e.message || "failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const shown = React.useMemo(() => {
    if (filter === "with_beo") return events.filter(e => e.beo_id || e.beo_status === "issued" || e.stage === "beo_issued");
    if (filter === "needs_beo") return events.filter(e => !e.beo_id && e.stage !== "beo_issued" && ["contract_signed", "deposit_received", "menu_selected"].includes(e.stage));
    return events;
  }, [events, filter]);

  return (
    <div className="rounded-lg border border-border/20 bg-background/40 p-4" data-testid="contracts-events-overview">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Events & BEO Status</div>
        <div className="flex gap-1">
          {[
            { id: "all" as const, label: `All (${events.length})` },
            { id: "with_beo" as const, label: "With BEO" },
            { id: "needs_beo" as const, label: "Needs BEO" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              data-testid={`contracts-filter-${f.id}`}
              className={`text-[10px] px-2.5 py-1 rounded-md border transition-colors ${
                filter === f.id
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-transparent text-foreground/60 border-border/40 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-xs text-foreground/60 py-6 text-center">Loading events…</div>}
      {error && <div className="text-xs text-red-400 py-6 text-center">Failed: {error}</div>}
      {!loading && !error && shown.length === 0 && (
        <div className="text-xs text-foreground/50 py-6 text-center">No events in this filter.</div>
      )}
      {!loading && !error && shown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-foreground/50 border-b border-border/20">
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Stage</th>
                <th className="py-2 pr-3">Guests</th>
                <th className="py-2 pr-3">BEO</th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 50).map((ev, i) => {
                const hasBeo = Boolean(ev.beo_id || ev.beo_status === "issued" || ev.stage === "beo_issued");
                return (
                  <tr key={ev.id || i} data-testid={`contracts-row-${i}`} className="border-b border-border/10 hover:bg-white/[0.02]">
                    <td className="py-2 pr-3 text-foreground">{ev.name || ev.title || "Untitled"}</td>
                    <td className="py-2 pr-3 text-foreground/70 font-mono text-[10px]">
                      {(ev.start_date || ev.event_date || "")?.slice(0, 10) || "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider bg-white/5 text-foreground/70">
                        {ev.stage || "—"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-foreground/70">{ev.guaranteed_count || ev.guest_count || "—"}</td>
                    <td className="py-2 pr-3">
                      {hasBeo ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wider bg-emerald-500/15 text-emerald-300">ISSUED</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wider bg-amber-500/15 text-amber-300">PENDING</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
