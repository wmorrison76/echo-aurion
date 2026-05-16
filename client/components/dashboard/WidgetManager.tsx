import { useState, useMemo } from "react";
import {
  GripVertical,
  Eye,
  EyeOff,
  Settings2,
  Search,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { renderWidgetIcon } from "@/lib/widget-icons";

/**
 * Dashboard widget data source reference (live vs mock).
 * See docs/ENTERPRISE_SYSTEM_AUDIT/DASHBOARD_NOT_CONNECTED.md for full list.
 * Live/API: custom-financial-* (/api/financial-data-query), labor-sync minipanels, weather (/api/weather), KPI (/api/v1/kpi/daily).
 * Mock/not connected: labor-cost, revenue, occupancy, and widgets using only local useState with no fetch.
 */
export interface Widget {
  id: string;
  name: string;
  description: string;
  icon: string;
  category?: string;
  enabled: boolean;
  minimized: boolean;
  schedule?: {
    refreshInterval: number;
    showHeader: boolean;
  };
  roleDefaults?: {
    manager: boolean;
    chef: boolean;
    staff: boolean;
    admin: boolean;
  };
}

export interface WidgetManagerProps {
  widgets: Widget[];
  onUpdateWidget: (widget: Widget) => void;
  onReorderWidgets: (widgets: Widget[]) => void;
}

const DEFAULT_WIDGETS: Widget[] = [
  {
    id: "labor-cost",
    name: "Labor Cost %",
    description: "Real-time labor cost percentage",
    icon: "💼",
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
    icon: "💵",
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
    icon: "🏪",
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
    icon: "⭐",
    category: "Operations",
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 30000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "orders",
    name: "Orders Coming In",
    description: "Real-time order queue",
    icon: "📋",
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
    icon: "🚚",
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
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 60000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "daily-kpis",
    name: "Daily KPIs/Notes",
    description: "Key metrics and manager notes",
    icon: "📊",
    category: "Analytics",
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 120000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "clock",
    name: "Team Clock In/Out",
    description: "Quick staff time tracking",
    icon: "⏰",
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
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 120000, showHeader: false },
    roleDefaults: { manager: true, chef: true, staff: false, admin: true },
  },
  {
    id: "vip-alerts",
    name: "VIP Guest Alerts",
    description: "Important guest notifications",
    icon: "🔔",
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
    icon: "🍽️",
    category: "Front of House",
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 300000, showHeader: false },
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
    id: "events",
    name: "Event Calendar",
    description: "Upcoming reservations and events",
    icon: "📅",
    category: "Communications",
    enabled: false,
    minimized: false,
    schedule: { refreshInterval: 300000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "schedule-connected",
    name: "Schedule (Connected)",
    description: "Real-time staff schedule with filters",
    icon: "👥",
    category: "Staff",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 5000, showHeader: false },
    roleDefaults: { manager: true, chef: true, staff: true, admin: true },
  },
  {
    id: "staff-coverage",
    name: "Staff Coverage",
    description: "Today's staff coverage percentage and availability",
    icon: "👤",
    category: "Staff",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 30000, showHeader: false },
    roleDefaults: { manager: true, chef: false, staff: false, admin: true },
  },
  {
    id: "realtime-staff-coverage",
    name: "Real-Time Staff Coverage",
    description: "Live staff status by department",
    icon: "🔴",
    category: "Staff",
    enabled: true,
    minimized: false,
    schedule: { refreshInterval: 5000, showHeader: false },
    roleDefaults: { manager: true, chef: true, staff: false, admin: true },
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
];

const CATEGORY_ORDER = [
  "Mail",
  "Collaborate",
  "Operations",
  "Kitchen",
  "Staff",
  "Front of House",
  "Communications",
  "Analytics",
  "General",
];

interface Category {
  name: string;
  icon: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Mail: "📬",
  Collaborate: "💬",
  Operations: "🏪",
  Kitchen: "👨‍🍳",
  Staff: "👥",
  "Front of House": "🎤",
  Communications: "📢",
  Analytics: "📊",
  General: "📦",
};

function fuzzySearch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (!q) return 1;
  if (t.includes(q)) return 2;

  let score = 0;
  let queryIndex = 0;

  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      score++;
      queryIndex++;
    }
  }

  return queryIndex === q.length ? score / t.length : 0;
}

export function WidgetManager({
  widgets,
  onUpdateWidget,
  onReorderWidgets,
}: WidgetManagerProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categorized = useMemo(() => {
    const cats = new Map<string, Widget[]>();

    widgets.forEach((widget) => {
      const cat = widget.category || "General";
      if (!cats.has(cat)) {
        cats.set(cat, []);
      }
      cats.get(cat)!.push(widget);
    });

    return cats;
  }, [widgets]);

  const categories = useMemo(() => {
    const cats = Array.from(categorized.keys()).sort((a, b) => {
      const aIdx = CATEGORY_ORDER.indexOf(a);
      const bIdx = CATEGORY_ORDER.indexOf(b);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    if (!selectedCategory && cats.length > 0) {
      return cats;
    }

    return cats;
  }, [categorized, selectedCategory]);

  const activeCategory =
    selectedCategory || (categories.length > 0 ? categories[0] : null);

  const filteredWidgets = useMemo(() => {
    if (!activeCategory) return [];

    const categoryWidgets = categorized.get(activeCategory) || [];

    if (!searchQuery) {
      return categoryWidgets;
    }

    return categoryWidgets
      .map((w) => ({
        widget: w,
        score: Math.max(
          fuzzySearch(searchQuery, w.name),
          fuzzySearch(searchQuery, w.description),
          fuzzySearch(searchQuery, w.category || ""),
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ widget }) => widget);
  }, [categorized, activeCategory, searchQuery]);

  const allFilteredWidgets = useMemo(() => {
    if (!searchQuery) return [];

    return widgets
      .map((w) => ({
        widget: w,
        score: Math.max(
          fuzzySearch(searchQuery, w.name) * 2, // Name match is more important
          fuzzySearch(searchQuery, w.description),
          fuzzySearch(searchQuery, w.category || ""),
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ widget }) => widget);
  }, [widgets, searchQuery]);

  const displayWidgets = searchQuery ? allFilteredWidgets : filteredWidgets;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = widgets.findIndex((w) => w.id === draggedItem);
    const targetIndex = widgets.findIndex((w) => w.id === targetId);

    const newWidgets = [...widgets];
    const [movedWidget] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, movedWidget);

    onReorderWidgets(newWidgets);
    setDraggedItem(null);
  };

  const toggleWidget = (widget: Widget) => {
    // Check if this is an integration widget that needs authentication
    if (widget.id.startsWith("integration-") && !widget.enabled) {
      const service = widget.id.replace("integration-", "") as
        | "outlook"
        | "teams"
        | "gmail";

      // Dispatch event to open large integration panel with authentication
      window.dispatchEvent(
        new CustomEvent("open-integration-panel", {
          detail: { service, showLargePanel: true },
        }),
      );

      // Enable the widget (it will be fully functional once authenticated)
      onUpdateWidget({ ...widget, enabled: true });
    } else {
      // Regular widget toggle
      onUpdateWidget({ ...widget, enabled: !widget.enabled });
    }
  };

  const toggleHeader = (widget: Widget) => {
    onUpdateWidget({
      ...widget,
      schedule: {
        ...widget.schedule!,
        showHeader: !widget.schedule?.showHeader,
      },
    });
  };

  const updateRefreshInterval = (widget: Widget, interval: number) => {
    onUpdateWidget({
      ...widget,
      schedule: {
        ...widget.schedule!,
        refreshInterval: interval,
      },
    });
  };

  return (
    <div className="flex h-full bg-background/40 rounded-lg border border-border/30 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-48 border-r border-border/30 bg-background/20 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-border/30">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-2.5 top-2.5 text-foreground/40"
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCategory(null);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-background/60 border border-border/30 rounded-md text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-foreground/60">
                Found {allFilteredWidgets.length} widget
                {allFilteredWidgets.length !== 1 ? "s" : ""}
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {categories.map((category) => {
                const categoryWidgetCount =
                  categorized.get(category)?.length || 0;
                const isSelected = activeCategory === category;

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md transition-colors text-sm",
                      isSelected
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-foreground/70 hover:text-foreground hover:bg-foreground/5",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0">
                        {CATEGORY_ICONS[category] || "📦"}
                      </span>
                      <span className="truncate">{category}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                        isSelected ? "bg-primary/30" : "bg-foreground/10",
                      )}
                    >
                      {categoryWidgetCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {!searchQuery && (
          <div className="px-6 py-4 border-b border-border/30 bg-background/20">
            <h3 className="text-base font-semibold text-foreground">
              {activeCategory}
            </h3>
            <p className="text-xs text-foreground/60 mt-1">
              Manage widgets for {activeCategory?.toLowerCase()}
            </p>
          </div>
        )}

        {searchQuery && (
          <div className="px-6 py-4 border-b border-border/30 bg-background/20">
            <h3 className="text-base font-semibold text-foreground">
              Search Results
            </h3>
            <p className="text-xs text-foreground/60 mt-1">
              Found {allFilteredWidgets.length} widget
              {allFilteredWidgets.length !== 1 ? "s" : ""} matching "
              {searchQuery}"
            </p>
          </div>
        )}

        {/* Widgets List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {displayWidgets.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-foreground/60 text-sm">
                  {searchQuery
                    ? "No widgets found"
                    : "No widgets in this category"}
                </p>
              </div>
            </div>
          ) : (
            displayWidgets.map((widget) => (
              <div
                key={widget.id}
                draggable
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, widget.id)}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  draggedItem === widget.id
                    ? "border-primary/50 bg-primary/10 opacity-75 cursor-grabbing"
                    : "border-border/30 bg-background/40 hover:border-border/50 cursor-move",
                )}
              >
                <div className="flex items-start gap-3">
                  <GripVertical
                    size={16}
                    className="text-foreground/40 mt-0.5 flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex-shrink-0">
                          {renderWidgetIcon(widget.id, widget.icon, "md")}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {widget.name}
                          </h4>
                          <p className="text-xs text-foreground/60 truncate">
                            {widget.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleWidget(widget)}
                          className={cn(
                            "p-2 rounded transition-colors",
                            widget.enabled
                              ? "text-green-600 bg-green-500/10 hover:bg-green-500/20"
                              : "text-foreground/40 hover:bg-foreground/5",
                          )}
                          title={widget.enabled ? "Disable" : "Enable"}
                        >
                          {widget.enabled ? (
                            <Eye size={16} />
                          ) : (
                            <EyeOff size={16} />
                          )}
                        </button>

                        <button
                          onClick={() =>
                            setExpandedWidget(
                              expandedWidget === widget.id ? null : widget.id,
                            )
                          }
                          className={cn(
                            "p-2 rounded transition-colors",
                            expandedWidget === widget.id
                              ? "text-foreground bg-primary/20"
                              : "text-foreground/60 hover:text-foreground hover:bg-foreground/10",
                          )}
                          title="Widget Settings"
                        >
                          <Settings2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Settings */}
                    {expandedWidget === widget.id && (
                      <div className="mt-3 pt-3 border-t border-border/20 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-foreground/70 block mb-1.5">
                            Refresh Interval
                          </label>
                          <select
                            value={widget.schedule?.refreshInterval || 60000}
                            onChange={(e) =>
                              updateRefreshInterval(
                                widget,
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full px-2 py-1.5 text-xs rounded bg-background/60 border border-border/30 text-foreground focus:outline-none focus:border-primary/50"
                          >
                            <option value={2000}>2 seconds</option>
                            <option value={5000}>5 seconds</option>
                            <option value={10000}>10 seconds</option>
                            <option value={30000}>30 seconds</option>
                            <option value={60000}>1 minute</option>
                            <option value={300000}>5 minutes</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`header-${widget.id}`}
                            checked={widget.schedule?.showHeader || false}
                            onChange={() => toggleHeader(widget)}
                            className="w-4 h-4 rounded accent-primary cursor-pointer"
                          />
                          <label
                            htmlFor={`header-${widget.id}`}
                            className="text-xs text-foreground/70 cursor-pointer"
                          >
                            Show widget header
                          </label>
                        </div>

                        {widget.roleDefaults && (
                          <div>
                            <label className="text-xs font-medium text-foreground/70 block mb-1.5">
                              Show by default for:
                            </label>
                            <div className="space-y-1 text-xs">
                              {Object.entries(widget.roleDefaults).map(
                                ([role, enabled]) => (
                                  <div
                                    key={role}
                                    className="flex items-center gap-2 capitalize text-foreground/60"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      className="w-3 h-3 rounded accent-primary"
                                      disabled
                                    />
                                    <span>{role}</span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_WIDGETS };
