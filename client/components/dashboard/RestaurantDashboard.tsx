import React, { useState, useCallback, useEffect, Suspense } from "react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Eye, EyeOff, Sliders, X } from "lucide-react";
import { DashboardWidgetSystem } from "./DashboardWidgetSystem";
import { WeatherWidget } from "./WeatherWidget";
import { StaffManagement } from "./StaffManagement";
import { PanelSharingManager } from "./PanelSharingManager";
import { CustomWidgetBuilder, type CustomWidget } from "./CustomWidgetBuilder";
import {
  FinancialCustomWidgetBuilder,
  type FinancialCustomWidget,
} from "./FinancialCustomWidgetBuilder";
import ScheduleHUDWidget from "./ScheduleHUDWidget";

const LazyEnterpriseCommandCenter = React.lazy(() => import("./EnterpriseCommandCenter"));
import { MiniPanelManager } from "@/lib/mini-panel-storage";
import { WidgetManager, type Widget } from "./WidgetManager";

// Default widgets - comprehensive list with all possible widgets
const DEFAULT_WIDGETS: Widget[] = [
  {
    id: "labor-cost",
    name: "Labor Cost %",
    description: "Real-time labor cost percentage",
    icon: "💰",
    category: "Operations",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 5000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "revenue",
    name: "Revenue & Covers",
    description: "Today's revenue and covers seated",
    icon: "💸",
    category: "Operations",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 10000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "occupancy",
    name: "Occupancy %",
    description: "Current capacity utilization",
    icon: "🪑",
    category: "Operations",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 15000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "satisfaction",
    name: "Guest Satisfaction",
    description: "Real-time guest feedback scores",
    icon: "😊",
    category: "Operations",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 30000, showHeader: true },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "orders",
    name: "Orders Coming In",
    description: "Real-time order queue",
    icon: "📥",
    category: "Kitchen",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 2000, showHeader: false },
    roleDefaults: { manager: true, chef: true, staff: true, admin: true },
  },
  {
    id: "delivery",
    name: "Delivery/Shorts",
    description: "Incoming deliveries and short items",
    icon: "🛒",
    category: "Kitchen",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 30000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "sales-trend",
    name: "24h Sales Trend",
    description: "Hourly revenue trend chart",
    icon: "📈",
    category: "Analytics",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 60000, showHeader: true },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "daily-kpis",
    name: "Daily KPIs/Notes",
    description: "Key metrics and manager notes",
    icon: "📊",
    category: "Analytics",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 120000, showHeader: true },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "clock",
    name: "Team Clock In/Out",
    description: "Quick staff time tracking",
    icon: "🕐",
    category: "Staff",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 5000, showHeader: false },
    roleDefaults: { manager: true, chef: true, staff: true, admin: true },
  },
  {
    id: "goals",
    name: "Daily Goals Tracker",
    description: "Track daily targets and actual",
    icon: "🎯",
    category: "Staff",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 120000, showHeader: true },
    roleDefaults: { manager: true, chef: true, staff: false, admin: true },
  },
  {
    id: "vip-alerts",
    name: "VIP Guest Alerts",
    description: "Important guest notifications",
    icon: "👑",
    category: "Front of House",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 10000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "specials",
    name: "Menu Specials",
    description: "Today's featured items",
    icon: "🍴",
    category: "Kitchen",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 300000, showHeader: true },
    roleDefaults: { manager: true, chef: true, staff: true, admin: true },
  },
  {
    id: "messages",
    name: "Team Messages",
    description: "Unread team communication",
    icon: "💬",
    category: "Communications",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 30000, showHeader: false },
    roleDefaults: { manager: true, chef: true, staff: true, admin: true },
  },
  {
    id: "todays-events",
    name: "Today's Events",
    description: "Today's calendar events across all outlets",
    icon: "📅",
    category: "Communications",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 60000, showHeader: true },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "events",
    name: "Event Calendar",
    description: "Upcoming reservations and events",
    icon: "📅",
    category: "Communications",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 300000, showHeader: true },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "schedule-connected",
    name: "Staff Schedule",
    description: "Real-time staff schedule with filters",
    icon: "📋",
    category: "Staff",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 5000, showHeader: true },
    roleDefaults: { manager: true, chef: true, staff: true, admin: true },
  },
  {
    id: "staff-management",
    name: "Staff Management",
    description: "Manage staff information and records",
    icon: "👨‍💼",
    category: "Staff",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 30000, showHeader: true },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "integration-outlook",
    name: "Outlook Mail",
    description: "Outlook mail sync - email notifications and quick access",
    icon: "📧",
    category: "Mail",
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 300000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "integration-teams",
    name: "Microsoft Teams",
    description: "Chat notifications and team collaboration",
    icon: "💬",
    category: "Collaborate",
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 300000, showHeader: false },
    roleDefaults: { manager: true, chef: true, staff: true, admin: true },
  },
  {
    id: "integration-gmail",
    name: "Gmail",
    description: "Gmail mail sync - email notifications and quick access",
    icon: "📧",
    category: "Mail",
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 300000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "financial-health",
    name: "Financial Health",
    description: "Real-time P&L and financial health monitoring",
    icon: "💹",
    category: "Analytics",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 10000, showHeader: true },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "order-status",
    name: "Order Status",
    description: "Real-time order delivery and check-in status",
    icon: "📦",
    category: "Operations",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 5000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
];

export default function RestaurantDashboard() {
  // State to force re-render when mini-panels update
  const [miniPanelRefresh, setMiniPanelRefresh] = useState(0);

  // Initialize widgets from localStorage or use defaults
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem("restaurant-dashboard-widgets");
    if (saved) {
      try {
        const savedWidgets = JSON.parse(saved);
        // Merge saved widgets with DEFAULT_WIDGETS to preserve categories and new fields
        const merged = DEFAULT_WIDGETS.map((defaultWidget) => {
          const savedWidget = savedWidgets.find(
            (w: Widget) => w.id === defaultWidget.id,
          );
          if (savedWidget) {
            // Merge: keep saved enabled/minimized state, but use DEFAULT for categories and new fields
            return {
              ...defaultWidget,
              enabled: savedWidget.enabled,
              minimized: savedWidget.minimized,
            };
          }
          return defaultWidget;
        });
        localStorage.setItem(
          "restaurant-dashboard-widgets",
          JSON.stringify(merged),
        );
        return merged;
      } catch {
        localStorage.setItem(
          "restaurant-dashboard-widgets",
          JSON.stringify(DEFAULT_WIDGETS),
        );
        return DEFAULT_WIDGETS;
      }
    }
    // Save defaults to localStorage on first load
    localStorage.setItem(
      "restaurant-dashboard-widgets",
      JSON.stringify(DEFAULT_WIDGETS),
    );
    return DEFAULT_WIDGETS;
  });

  const [showDashboardWidgets, setShowDashboardWidgets] = useState(() => {
    const saved = localStorage.getItem("show-dashboard-widgets");
    return saved ? JSON.parse(saved) : true; // Show widgets by default
  });

  const [showWidgetManager, setShowWidgetManager] = useState(false);

  const [layoutMode, setLayoutMode] = useState<"grid" | "cascade">(() => {
    const saved = localStorage.getItem("dashboard-layout-mode");
    return (saved as "grid" | "cascade") || "grid";
  });

  // Save layout mode to localStorage
  const handleSetLayoutMode = (mode: "grid" | "cascade") => {
    setLayoutMode(mode);
    localStorage.setItem("dashboard-layout-mode", mode);
  };

  const handleSnapAllToGrid = () => {
    // Clear all saved widget positions to force them back to grid
    const userId = "default";
    widgets.forEach((widget) => {
      localStorage.removeItem(`dashboard-widget-pos-${userId}-${widget.id}`);
    });
    // Force a re-render by triggering a state update
    setMiniPanelRefresh((prev) => prev + 1);
  };

  const handleUpdateWidget = useCallback((updatedWidget: Widget) => {
    setWidgets((prev) => {
      const newWidgets = prev.map((w) =>
        w.id === updatedWidget.id ? updatedWidget : w,
      );
      localStorage.setItem(
        "restaurant-dashboard-widgets",
        JSON.stringify(newWidgets),
      );
      return newWidgets;
    });
  }, []);

  const handleAddCustomWidget = useCallback((customWidget: CustomWidget) => {
    // Convert custom widget to Dashboard widget format
    const newWidget: Widget = {
      id: customWidget.id,
      name: customWidget.name,
      description: `Custom widget with metrics: ${customWidget.metrics.join(", ")}`,
      icon: "⭐",
      enabled: true,
      minimized: false,
      schedule: { refreshInterval: 10000, showHeader: true },
      roleDefaults: { manager: true, chef: false, staff: false, admin: true },
    };

    setWidgets((prev) => {
      const newWidgets = [...prev, newWidget];
      localStorage.setItem(
        "restaurant-dashboard-widgets",
        JSON.stringify(newWidgets),
      );
      return newWidgets;
    });
  }, []);

  const handleAddFinancialCustomWidget = useCallback(
    (widget: FinancialCustomWidget) => {
      // Store financial widget data in session storage for DashboardWidgetSystem to access
      sessionStorage.setItem(
        `financial-widget-${widget.id}`,
        JSON.stringify(widget),
      );

      // Convert to Dashboard widget format
      const newWidget: Widget = {
        id: widget.id,
        name: widget.name,
        description: `Financial metrics: ${widget.selectedMetrics.join(", ")}`,
        icon: "💰",
        enabled: true,
        minimized: false,
        schedule: { refreshInterval: 30000, showHeader: true },
        roleDefaults: { manager: true, chef: false, staff: false, admin: true },
      };

      setWidgets((prev) => {
        const newWidgets = [...prev, newWidget];
        localStorage.setItem(
          "restaurant-dashboard-widgets",
          JSON.stringify(newWidgets),
        );
        return newWidgets;
      });
    },
    [],
  );

  const [viewMode, setViewMode] = useState<"command-center" | "widgets">(() => {
    return (localStorage.getItem("dashboard-view-mode") as any) || "command-center";
  });

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-background to-background/50">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-b border-border/20 bg-background/30">
        <button
          onClick={() => { setViewMode("command-center"); localStorage.setItem("dashboard-view-mode", "command-center"); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "command-center" ? "bg-primary/20 text-primary border border-primary/30" : "text-foreground/40 hover:text-foreground/60"}`}
          data-testid="view-command-center"
        >
          Operations Command Center
        </button>
        <button
          onClick={() => { setViewMode("widgets"); localStorage.setItem("dashboard-view-mode", "widgets"); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === "widgets" ? "bg-primary/20 text-primary border border-primary/30" : "text-foreground/40 hover:text-foreground/60"}`}
          data-testid="view-widgets"
        >
          Classic Widgets ({widgets.filter(w => w.enabled).length})
        </button>
      </div>

      {viewMode === "command-center" ? (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>}>
          <LazyEnterpriseCommandCenter />
        </Suspense>
      ) : (
      <>{/* Original Widget Dashboard */}
      {/* Header */}
      <div className="border-b border-border/30 pr-0.5 bg-background/40">
        <div className="max-w-full mx-auto space-y-6">
          {/* Welcome Message with Weather */}
          <Card className="border border-border/30 bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-4">
                {/* Welcome Section - Left */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground leading-tight">
                    Restaurant Overview
                  </h2>
                  <p className="text-sm text-foreground/70 mt-1">
                    Welcome back, William Morrison
                  </p>
                </div>

                {/* 4-Day Weather Idiograms - Right */}
                <div className="flex-shrink-0">
                  <WeatherWidget
                    restaurantAddress="New York, NY"
                    expanded={true}
                    compact={true}
                    forecastDays={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Sections */}
          {/* Real-time Staff Coverage now renders as a mini-panel */}
        </div>
      </div>

      {/* Widget Manager Modal - Apple Settings Style */}
      {showWidgetManager && (
        <div className="fixed inset-0 bg-black/50 z-[999999] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-96 bg-background border border-border/30 rounded-lg shadow-2xl flex flex-col z-[999999]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/30 p-4 bg-background/40">
              <h2 className="text-lg font-semibold text-foreground">
                Manage Widgets
              </h2>
              <button
                onClick={() => setShowWidgetManager(false)}
                className="p-1.5 hover:bg-foreground/10 rounded transition-colors text-foreground/60 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            {/* Widget Manager Component */}
            <div className="flex-1 overflow-hidden">
              <WidgetManager
                widgets={widgets}
                onUpdateWidget={handleUpdateWidget}
                onReorderWidgets={(reorderedWidgets) => {
                  setWidgets(reorderedWidgets);
                  localStorage.setItem(
                    "restaurant-dashboard-widgets",
                    JSON.stringify(reorderedWidgets),
                  );
                }}
              />
            </div>

            {/* Footer */}
            <div className="border-t border-border/30 p-4 bg-background/40 flex gap-2 justify-end">
              <button
                onClick={() => {
                  localStorage.setItem(
                    "restaurant-dashboard-widgets",
                    JSON.stringify(DEFAULT_WIDGETS),
                  );
                  setWidgets(DEFAULT_WIDGETS);
                }}
                className="px-4 py-2 rounded-lg bg-foreground/10 text-foreground/70 hover:bg-foreground/20 transition-colors text-sm font-medium"
                type="button"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setShowWidgetManager(false)}
                className="px-4 py-2 rounded-lg bg-primary/30 text-foreground hover:bg-primary/40 transition-colors text-sm font-medium"
                type="button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget System - Collapsible */}
      {!showDashboardWidgets ? (
        <div className="flex-1 flex items-center justify-center border-t border-border/30 bg-background/20">
          <button
            onClick={() => {
              setShowDashboardWidgets(true);
              localStorage.setItem("show-dashboard-widgets", "true");
            }}
            className="px-6 py-3 bg-primary/30 hover:bg-primary/40 text-foreground rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>📊</span>
            <span>Show Dashboard Grid</span>
            <span className="text-xs text-foreground/60">
              ({widgets.filter((w) => w.enabled).length} widgets)
            </span>
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-visible flex flex-col hover:bg-background/50 transition-colors duration-300">
          {/* Header with Controls */}
          <div className="border-b border-border/30 bg-background/40 p-2 flex items-center justify-between gap-4 hover:bg-background/60 transition-colors duration-200 -mt-0.5">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Dashboard ({widgets.filter((w) => w.enabled).length} widgets)
              </h3>

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                {/* Snap All to Grid */}
                {layoutMode === "grid" && (
                  <button
                    onClick={handleSnapAllToGrid}
                    className="inline-flex items-center justify-center w-7 h-7 text-foreground/60 hover:text-foreground hover:bg-blue-500/10 rounded transition-colors"
                    title="Snap all widgets to grid"
                    type="button"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                    </svg>
                  </button>
                )}

                {/* Copy Panel */}
                <button
                  onClick={() => {
                    // Copy dashboard state to clipboard
                    const state = JSON.stringify({
                      widgets: widgets.map((w) => ({
                        id: w.id,
                        enabled: w.enabled,
                      })),
                      layoutMode: layoutMode,
                    });
                    navigator.clipboard.writeText(state);
                  }}
                  className="inline-flex items-center justify-center w-7 h-7 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors"
                  title="Copy dashboard state"
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 4h12v12H4V4zm2 2v8h8V6H6zM10 10h12v12H10V10zm2 2v8h8v-8h-8z" />
                  </svg>
                </button>

                {/* Manage Widgets */}
                <button
                  onClick={() => setShowWidgetManager(true)}
                  className="inline-flex items-center justify-center w-7 h-7 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors"
                  title="Manage widgets"
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
                  </svg>
                </button>

                {/* Add Widget */}
                <CustomWidgetBuilder
                  onCreateWidget={handleAddCustomWidget}
                  existingWidgets={widgets.filter(
                    (w) =>
                      w.id.startsWith("custom-") &&
                      !w.id.startsWith("custom-financial-"),
                  )}
                />

                {/* Add Financial Widget */}
                <FinancialCustomWidgetBuilder
                  onCreateWidget={handleAddFinancialCustomWidget}
                  existingWidgets={widgets
                    .filter((w) => w.id.startsWith("custom-financial-"))
                    .map((w) => {
                      const stored = sessionStorage.getItem(
                        `financial-widget-${w.id}`,
                      );
                      return stored ? JSON.parse(stored) : null;
                    })
                    .filter((w) => w !== null)}
                />

                {/* Reset Layout */}
                <button
                  onClick={() => {
                    const userId = "default";
                    localStorage.removeItem(`dashboard-widgets-${userId}`);
                    window.location.reload();
                  }}
                  className="inline-flex items-center justify-center w-7 h-7 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors"
                  title="Reset widget positions to default layout"
                  type="button"
                >
                  <span className="text-lg">↻</span>
                </button>

                {/* Sharing */}
                <PanelSharingManager
                  panelId="dashboard"
                  panelTitle="Restaurant Overview"
                />
              </div>
            </div>

            {/* Layout Controls - Icons only */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleSetLayoutMode("grid")}
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded transition-all duration-200",
                  layoutMode === "grid"
                    ? "bg-primary/40 text-primary shadow-lg shadow-primary/20 scale-105"
                    : "bg-foreground/10 text-foreground/60 hover:bg-foreground/20 hover:scale-105",
                )}
                title="Grid layout - Organized grid arrangement"
                type="button"
              />
              <button
                onClick={() => handleSetLayoutMode("cascade")}
                className={cn(
                  "inline-flex items-center justify-center w-8 h-8 rounded transition-all duration-200",
                  layoutMode === "cascade"
                    ? "bg-primary/40 text-primary shadow-lg shadow-primary/20 scale-105"
                    : "bg-foreground/10 text-foreground/60 hover:bg-foreground/20 hover:scale-105",
                )}
                title="Cascade layout - Free positioning"
                type="button"
              />
            </div>

            {/* Hide Button */}
            <button
              onClick={() => {
                setShowDashboardWidgets(false);
                localStorage.setItem("show-dashboard-widgets", "false");
              }}
              className="text-xs px-3 py-1 text-foreground/60 hover:text-foreground hover:bg-primary/10 rounded transition-colors"
            >
              Hide
            </button>
          </div>

          {/* Widget System - Full height grid */}
          <div className="flex-1 overflow-hidden">
            <DashboardWidgetSystem
              key={`dashboard-widgets-${layoutMode}-${miniPanelRefresh}`}
              widgets={widgets}
              onUpdateWidget={handleUpdateWidget}
              userId="default"
              layoutMode={layoutMode}
              onSnapAllToGrid={handleSnapAllToGrid}
            />
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
