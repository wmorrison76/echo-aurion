/** * Maestro Dashboard Layout * * Responsive grid layout for the dashboard with: * - Left sidebar: Event selector and filters * - Main canvas: Floating, draggable, resizable panels * - Right rail: Watch panels and AI insights * - Bottom rail: Timeline and production clock */ import React, {
  useMemo,
} from "react";
import { useMaestro } from "@/contexts/MaestroContext";
import { useMaestroStore } from "@/stores/useMaestroStore";
import { getRbacPermissions } from "@/lib/maestro-rbac";
import { useAuth } from "@/contexts/AuthContext";
import { EventCommandPanel } from "./panels/EventCommandPanel";
import { BEOPanel } from "./panels/BEOPanel";
import { ChangelogPanel } from "./panels/ChangelogPanel";
import { ProductionPanel } from "./panels/ProductionPanel";
import { ProductionCalendarPanel } from "./panels/ProductionCalendarPanel";
import { InventoryPanel } from "./panels/InventoryPanel";
import { LaborPanel } from "./panels/LaborPanel";
import { WatchPanels } from "./panels/WatchPanels";
import { AIPanel } from "./panels/AIPanel";
import { ApprovalWorkflowPanel } from "./panels/ApprovalWorkflowPanel";
import { EventSelector } from "./components/EventSelector";
import { FilterBar } from "./components/FilterBar";
const PANEL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  event_command: EventCommandPanel,
  beo: BEOPanel,
  changelog: ChangelogPanel,
  approvals: ApprovalWorkflowPanel,
  production: ProductionPanel,
  production_calendar: ProductionCalendarPanel,
  inventory: InventoryPanel,
  labor: LaborPanel,
  ai: AIPanel,
};
export const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const { currentEvent, isLoading, error } = useMaestro();
  const {
    events,
    eventsLoading,
    selectedEventId,
    selectEvent,
    sidebarOpen,
    toggleSidebar,
    showWatchPanel,
    toggleWatchPanel,
  } = useMaestroStore(); // Get user's role-based permissions const userRole = user?.role ??"guest"; const rbacPermissions = useMemo( () => getRbacPermissions(userRole as any), [userRole], ); // Determine which panels should be visible const visiblePanels = useMemo( () => ( Object.keys(PANEL_COMPONENTS) as Array<keyof typeof PANEL_COMPONENTS> ).filter((panelId) => { const perm = rbacPermissions[panelId]; return perm?.visible ?? false; }), [rbacPermissions], ); const selectedEvent = events.find((e: any) => e.id === selectedEventId); return ( <div className="flex h-screen bg-card text-slate-50"> {/* LEFT SIDEBAR: Event Selector & Filters */} <div className={`flex flex-col border-r border-border bg-surface transition-all duration-300 ${ sidebarOpen ?"w-80" :"w-0" } overflow-hidden`} > <div className="flex-1 overflow-y-auto"> {/* Header */} <div className="p-4 border-b border-border"> <h2 className="text-lg font-semibold text-white mb-4">Events</h2> <EventSelector events={events} selectedId={selectedEventId} onSelect={selectEvent} loading={eventsLoading} /> </div> {/* Filters */} <div className="p-4 border-b border-border"> <FilterBar /> </div> {/* Quick Actions */} <div className="p-4 space-y-2"> <button onClick={toggleWatchPanel} className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${ showWatchPanel ?"bg-amber-600 text-white hover:bg-amber-700" :"bg-slate-800 text-slate-300 hover:bg-slate-700" }`} > {showWatchPanel ?"Hide" :"Show"} Watch Panel </button> </div> </div> {/* Sidebar Toggle */} <button onClick={toggleSidebar} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 border-t border-border" title="Toggle sidebar" > ☰ </button> </div> {/* MAIN CANVAS: Floating Panels */} <div className="flex-1 flex overflow-hidden"> <div className="flex-1 relative bg-surface overflow-hidden"> {/* Loading State */} {isLoading && ( <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"> <div className="text-center"> <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500 mx-auto mb-4"></div> <p className="text-white">Loading event...</p> </div> </div> )} {/* Error State */} {error && ( <div className="absolute inset-0 flex items-center justify-center z-50"> <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md"> <h3 className="font-semibold text-red-100 mb-2">Error</h3> <p className="text-red-200 text-sm">{error}</p> </div> </div> )} {/* Empty State */} {!currentEvent && !isLoading && !error && ( <div className="flex items-center justify-center h-full"> <div className="text-center"> <p className="text-slate-400 mb-4">Select an event to begin</p> {eventsLoading && ( <p className="text-muted-foreground text-sm">Loading events...</p> )} </div> </div> )} {/* Panel Grid */} {currentEvent && ( <div className="w-full h-full p-4 overflow-auto"> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {visiblePanels.map((panelId) => { const PanelComponent = PANEL_COMPONENTS[panelId]; return ( <div key={panelId} className="bg-slate-800 border border-border rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow" > {PanelComponent ? ( <PanelComponent eventId={currentEvent.id} /> ) : null} </div> ); })} </div> </div> )} </div> {/* RIGHT RAIL: Watch Panels & AI */} {showWatchPanel && ( <div className="w-96 border-l border-border bg-surface overflow-y-auto"> <WatchPanels eventId={currentEvent?.id} /> </div> )} </div> {/* Sidebar Toggle Button (when closed) */} {!sidebarOpen && ( <button onClick={toggleSidebar} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 border-l border-border" title="Toggle sidebar" > ☰ </button> )} </div> );
};
