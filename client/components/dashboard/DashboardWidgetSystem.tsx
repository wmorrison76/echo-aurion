import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/glass";
import {
  LaborCostWidget,
  RevenueWidget,
  OccupancyWidget,
  OrdersWidget,
  DeliveryWidget,
  ClockWidget,
  VIPAlertsWidget,
  MessagesWidget,
  ScheduleConnectedWidget,
  SatisfactionWidget,
  SalesTrendWidget,
  GenericWidget,
} from "./DashboardWidgets";
import { GoalsWidget } from "./GoalsWidget";
import { DraggableDashboardWidget } from "./DraggableDashboardWidget";
import { StaffManagement } from "./StaffManagement";
import { StaffCoverageContent } from "./StaffCoverageMiniPanel";
import { ScheduleHUDContent } from "./ScheduleHUDWidget";
import FinancialHealthWidget from "./FinancialHealthWidget";
import { FinancialCustomWidget } from "./FinancialCustomWidget";
import { TodaysEventsWidget } from "./TodaysEventsWidget";
import OutlookMiniPanel from "@/components/integrations/OutlookMiniPanel";
import TeamsMiniPanel from "@/components/integrations/TeamsMiniPanel";
import GmailMiniPanel from "@/components/integrations/GmailMiniPanel";
import { OrderStatusMiniPanel } from "./OrderStatusMiniPanel";
import type { Widget } from "./WidgetManager";
import type { FinancialCustomWidget as FinancialCustomWidgetType } from "./FinancialCustomWidgetBuilder";

export interface DashboardWidgetSystemProps {
  widgets: Widget[];
  onUpdateWidget: (widget: Widget) => void;
  userId: string;
  layoutMode?: "grid" | "cascade";
  onSnapAllToGrid?: () => void;
}

interface WidgetState {
  id: string;
  minimized: boolean;
  isPinned: boolean;
}

export function DashboardWidgetSystem({
  widgets,
  onUpdateWidget,
  userId,
  layoutMode = "grid",
  onSnapAllToGrid,
}: DashboardWidgetSystemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetStates, setWidgetStates] = useState<Map<string, WidgetState>>(
    () => {
      const saved = localStorage.getItem(`dashboard-widgets-${userId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return new Map(parsed.map((w: any) => [w.id, w]));
        } catch {
          return new Map();
        }
      }
      return new Map();
    },
  );

  // Persist widget states
  useEffect(() => {
    const statesArray = Array.from(widgetStates.values());
    localStorage.setItem(
      `dashboard-widgets-${userId}`,
      JSON.stringify(statesArray),
    );
  }, [widgetStates, userId]);

  const getWidgetState = useCallback(
    (id: string): WidgetState => {
      return (
        widgetStates.get(id) || {
          id,
          minimized: false,
          isPinned: false,
        }
      );
    },
    [widgetStates],
  );

  const toggleMinimized = (id: string) => {
    const state = getWidgetState(id);
    setWidgetStates(
      new Map(widgetStates).set(id, {
        ...state,
        minimized: !state.minimized,
      }),
    );
  };

  const togglePin = (id: string) => {
    const state = getWidgetState(id);
    setWidgetStates(
      new Map(widgetStates).set(id, {
        ...state,
        isPinned: !state.isPinned,
      }),
    );
  };

  const handleDetachWidget = (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (widget) {
      // Store widget data temporarily for the popped-out panel
      sessionStorage.setItem(
        `popup-widget-${id}`,
        JSON.stringify({
          id,
          name: widget.name,
          icon: widget.icon,
          enabled: widget.enabled,
        }),
      );

      // Open as a floating/detached widget by dispatching a custom event
      window.dispatchEvent(
        new CustomEvent("widget-pop-out", {
          detail: {
            widgetId: id,
            widgetName: widget.name,
            widgetIcon: widget.icon,
          },
        }),
      );
    }
  };

  const handleSnapToGrid = (id: string) => {
    // Individual widget snap to grid - just trigger the parent callback if needed
    if (onSnapAllToGrid) {
      // Parent can handle it if needed
    }
  };

  const handlePopOut = (id: string) => {
    // Pop out the widget - trigger the detach
    handleDetachWidget(id);
  };

  // Widget component map
  const widgetComponentMap: Record<string, React.ComponentType<any>> = {
    "labor-cost": LaborCostWidget,
    revenue: RevenueWidget,
    occupancy: OccupancyWidget,
    orders: OrdersWidget,
    delivery: DeliveryWidget,
    clock: ClockWidget,
    "vip-alerts": VIPAlertsWidget,
    messages: MessagesWidget,
    "schedule-connected": ScheduleConnectedWidget,
    "staff-management": StaffManagement,
    "staff-coverage": StaffCoverageContent,
    "realtime-staff-coverage": ScheduleHUDContent,
    satisfaction: SatisfactionWidget,
    "sales-trend": SalesTrendWidget,
    "daily-kpis": GenericWidget,
    goals: GoalsWidget,
    specials: GenericWidget,
    "todays-events": TodaysEventsWidget,
    events: GenericWidget,
    "financial-health": FinancialHealthWidget,
    "integration-outlook": OutlookMiniPanel,
    "integration-teams": TeamsMiniPanel,
    "integration-gmail": GmailMiniPanel,
    "order-status": OrderStatusMiniPanel,
  };

  const getWidgetComponent = (widgetId: string) => {
    if (widgetId.startsWith("custom-financial-")) {
      return FinancialCustomWidget;
    }
    if (widgetId.startsWith("custom-")) {
      return GenericWidget;
    }
    return widgetComponentMap[widgetId] || GenericWidget;
  };

  const enabledWidgets = widgets.filter((w) => w.enabled);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-auto bg-background/40"
    >
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(255,255,255,.1) 25%, rgba(255,255,255,.1) 26%, transparent 27%, transparent 74%, rgba(255,255,255,.1) 75%, rgba(255,255,255,.1) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(255,255,255,.1) 25%, rgba(255,255,255,.1) 26%, transparent 27%, transparent 74%, rgba(255,255,255,.1) 75%, rgba(255,255,255,.1) 76%, transparent 77%, transparent)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Draggable Widgets Container */}
      <div className="relative w-full min-h-full">
        {enabledWidgets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Widgets Enabled
              </h3>
              <p className="text-foreground/60">
                Go to Settings → Dashboard Widgets to enable widgets
              </p>
            </div>
          </div>
        ) : (
          <>
            {enabledWidgets.map((widget, index) => {
              const state = getWidgetState(widget.id);
              const Component = getWidgetComponent(widget.id);

              return (
                <DraggableDashboardWidget
                  key={widget.id}
                  id={widget.id}
                  title={widget.name}
                  icon={widget.icon}
                  userId={userId}
                  layoutMode={layoutMode}
                  cascadeIndex={index}
                  onClose={() => {
                    // Remove widget from enabled list
                    onUpdateWidget({ ...widget, enabled: false });
                  }}
                  onSnapToGrid={handleSnapToGrid}
                  onPopOut={handlePopOut}
                >
                  <div className="w-full h-full overflow-auto">
                    {widget.id.startsWith("custom-financial-") ? (
                      // Financial custom widget
                      (() => {
                        const stored = sessionStorage.getItem(
                          `financial-widget-${widget.id}`,
                        );
                        const config = stored ? JSON.parse(stored) : null;
                        return config ? (
                          <Component
                            config={config}
                            minimized={state.minimized}
                            showHeader={false}
                            onMinimize={() => toggleMinimized(widget.id)}
                            onPin={() => togglePin(widget.id)}
                            onDetach={() => handleDetachWidget(widget.id)}
                            isPinned={state.isPinned}
                            title={widget.name}
                            icon={widget.icon}
                            widgetId={widget.id}
                            userId={userId}
                          />
                        ) : (
                          <div className="text-center py-4 text-foreground/40">
                            <p className="text-xs">Widget data not found</p>
                          </div>
                        );
                      })()
                    ) : (
                      // Regular widget
                      <Component
                        minimized={state.minimized}
                        showHeader={false}
                        onMinimize={() => toggleMinimized(widget.id)}
                        onPin={() => togglePin(widget.id)}
                        onDetach={() => handleDetachWidget(widget.id)}
                        isPinned={state.isPinned}
                        title={widget.name}
                        icon={widget.icon}
                        widgetId={widget.id}
                        userId={userId}
                      />
                    )}
                  </div>
                </DraggableDashboardWidget>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
