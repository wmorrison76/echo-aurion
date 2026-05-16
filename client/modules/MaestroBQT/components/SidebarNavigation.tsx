/**
 * MaestroBQT Sidebar Navigation
 * Mimics Culinary's left sidebar structure
 * Collapsible sections with icons
 */

import React from "react";
import {
  Calendar,
  ChefHat,
  BookOpen,
  Package,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  GanttChart,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Brain,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/glass";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component?: React.ComponentType<any>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  mode?: "beo" | "production";
  collapsedSections?: Set<string>;
  onToggleSection?: (sectionTitle: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function buildNavSections(mode: "beo" | "production"): NavSection[] {
  if (mode === "beo") {
    return [
      {
        title: "BEO / OPS GANTT",
        items: [
          { id: "timeline", label: "Timeline", icon: Calendar },
          { id: "master-ops", label: "Master Ops", icon: GanttChart },
          { id: "per-event", label: "Per-Event", icon: GanttChart },
          { id: "ai-copilot", label: "AI Copilot", icon: Brain },
          { id: "department", label: "Department", icon: FileText },
          { id: "resource", label: "Resources", icon: Users },
          { id: "critical", label: "Critical Path", icon: AlertCircle },
          { id: "run-of-show", label: "Run-of-Show", icon: TrendingUp },
          { id: "history", label: "Historical Lookup", icon: BarChart3 },
          { id: "beo", label: "BEO Operations", icon: FileText },
          {
            id: "change-notifications",
            label: "Change Alerts",
            icon: AlertCircle,
          },
        ],
      },
    ];
  }

  return [
    {
      title: "PRODUCTION GANTT",
      items: [
        {
          id: "production-timeline",
          label: "Production Timeline",
          icon: GanttChart,
        },
        { id: "per-event", label: "Per-Event", icon: GanttChart },
        { id: "ai-copilot", label: "AI Copilot", icon: Brain },
        { id: "department", label: "Department", icon: FileText },
        { id: "resource", label: "Resources", icon: Users },
        { id: "critical", label: "Critical Path", icon: AlertCircle },
        { id: "run-of-show", label: "Run-of-Show", icon: TrendingUp },
      ],
    },
    {
      title: "PRODUCTION",
      items: [
        { id: "kitchen", label: "Kitchen", icon: ChefHat },
        { id: "recipes", label: "Recipes", icon: BookOpen },
        { id: "culinary", label: "Culinary", icon: ChefHat },
      ],
    },
    {
      title: "SUPPLY CHAIN",
      items: [
        { id: "inventory", label: "Inventory", icon: Package },
        { id: "ordering", label: "Ordering", icon: ShoppingCart },
      ],
    },
    {
      title: "PEOPLE & FINANCE",
      items: [
        { id: "labor", label: "Labor", icon: Users },
        { id: "financials", label: "Financials", icon: DollarSign },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
  ];
}

export function SidebarNavigation({
  activeTab,
  onTabChange,
  mode = "beo",
  collapsedSections = new Set(),
  onToggleSection,
  open,
  onOpenChange,
}: SidebarNavigationProps) {
  const [localCollapsed, setLocalCollapsed] =
    React.useState<Set<string>>(collapsedSections);
  const [localOpen, setLocalOpen] = React.useState<boolean>(true);

  // Mirror controlled/uncontrolled open state
  React.useEffect(() => {
    if (typeof open === "boolean") setLocalOpen(open);
  }, [open]);

  const sidebarOpen = typeof open === "boolean" ? open : localOpen;
  const setSidebarOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    if (typeof open !== "boolean") setLocalOpen(next);
  };

  const toggleSection = (sectionTitle: string) => {
    if (onToggleSection) {
      onToggleSection(sectionTitle);
    } else {
      setLocalCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(sectionTitle)) {
          next.delete(sectionTitle);
        } else {
          next.add(sectionTitle);
        }
        return next;
      });
    }
  };

  const isCollapsed = (title: string) => {
    if (onToggleSection) {
      return collapsedSections.has(title);
    }
    return localCollapsed.has(title);
  };

  const sections = React.useMemo(() => buildNavSections(mode), [mode]);
  const flatItems = React.useMemo(
    () => sections.flatMap((s) => s.items),
    [sections],
  );

  return (
    <div
      className={cn(
        "bg-card border-r border-border transition-all duration-700 ease-in-out relative group border-l-2 border-l-cyan-600/30",
        "absolute left-0 top-0 h-full z-40 flex flex-col",
        sidebarOpen
          ? "w-32 md:w-40 px-3 py-4"
          : "w-11 px-1 py-4 overflow-hidden flex flex-col items-center",
      )}
    >
      {/* Mobile toggle (top) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setSidebarOpen(!sidebarOpen);
        }}
        className="p-2 hover:bg-foreground/5 rounded transition-colors md:hidden self-start"
        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Header - only show text when open */}
      {sidebarOpen && (
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4 px-1 flex-shrink-0">
          Maestro BQT
        </h2>
      )}

      {/* Navigation */}
      {sidebarOpen ? (
        <div className="space-y-4 overflow-y-auto scrollbar-hide flex-1">
          {sections.map((section) => {
            const collapsed = isCollapsed(section.title);
            return (
              <div key={section.title}>
                <div
                  className="flex items-center justify-between px-1 mb-2 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => toggleSection(section.title)}
                >
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </h3>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-muted-foreground transition-transform flex-shrink-0",
                      !collapsed && "rotate-180",
                    )}
                  />
                </div>

                {!collapsed && (
                  <nav className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onTabChange(item.id);
                            if (window.innerWidth < 768) setSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center px-2 py-2 text-xs gap-2 justify-start rounded transition-colors flex-shrink-0",
                            isActive
                              ? "bg-cyan-600/20 text-cyan-300"
                              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300",
                          )}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">
                            {item.label.toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 w-full overflow-y-auto scrollbar-hide flex-1">
          {flatItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  if (window.innerWidth < 768) setSidebarOpen(false);
                }}
                title={item.label}
                className={cn(
                  "w-full p-2 rounded flex items-center justify-center transition-colors flex-shrink-0",
                  isActive
                    ? "bg-cyan-600/20 text-cyan-300"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300",
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Right Side Drag Handle */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-24 bg-gradient-to-r from-cyan-500/40 via-cyan-500/80 to-cyan-500/40 rounded-full cursor-pointer hidden md:flex flex-col items-center justify-center gap-1 transition-all hover:from-cyan-500/60 hover:via-cyan-500 hover:to-cyan-500/60 shadow-lg shadow-cyan-500/40 border border-cyan-500/50 focus:outline-none z-50"
        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <ChevronDown className="h-3 w-3 text-cyan-300 -rotate-90" />
        <ChevronDown className="h-3 w-3 text-cyan-300 -rotate-90" />
      </button>
    </div>
  );
}

export default SidebarNavigation;
