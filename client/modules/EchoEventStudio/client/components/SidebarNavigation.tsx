import React, { useEffect, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Users,
  UserRound,
  Calendar,
  FileText,
  ClipboardList,
  Menu,
  UploadCloud,
  CalendarDays,
  BarChart3,
  LineChart,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  shortcut?: string;
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
    href: "/dashboard",
    shortcut: "Cmd+1",
    description: "Overview and key metrics",
  },
  {
    id: "prospects",
    label: "Prospects",
    icon: Users,
    href: "/prospects",
    shortcut: "Cmd+2",
    description: "Lead pipeline and prospect management",
  },
  {
    id: "clients",
    label: "Clients",
    icon: UserRound,
    href: "/clients",
    shortcut: "Cmd+3",
    description: "CRM contact directory",
  },
  {
    id: "forecast",
    label: "Forecast",
    icon: LineChart,
    href: "/forecast",
    shortcut: "Cmd+4",
    description: "18-month revenue forecast & gaps",
  },
  {
    id: "resort-forecast",
    label: "21-Day Forecast",
    icon: LineChart,
    href: "/resort-forecast",
    description: "Resort outlet + meal period forecast",
  },
  {
    id: "import",
    label: "Import",
    icon: UploadCloud,
    href: "/import",
    shortcut: "Cmd+5",
    description: "Import clients from CSV/Excel",
  },
  {
    id: "events",
    label: "Events",
    icon: Calendar,
    href: "/events",
    shortcut: "Cmd+6",
    description: "Event lifecycle and scheduling",
  },
  {
    id: "beo",
    label: "BEO/Contracts",
    icon: FileText,
    href: "/beo",
    shortcut: "Cmd+7",
    description: "Banquet Event Orders and contracts",
  },
  {
    id: "reo",
    label: "REO / Outlets",
    icon: ClipboardList,
    href: "/reo",
    description: "Restaurant Event Orders by outlet",
  },
  {
    id: "menus",
    label: "Menu Catalog",
    icon: Menu,
    href: "/menus",
    shortcut: "Cmd+8",
    description: "Menu items and catalog management",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    href: "/calendar",
    shortcut: "Cmd+9",
    description: "Centralized event calendar",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    description: "Performance metrics and insights",
  },
  {
    id: "sales-leader",
    label: "Sales Leader",
    icon: ShieldCheck,
    href: "/sales-leader",
    description: "Manager goals, reviews, and approvals",
  },
  {
    id: "admin",
    label: "Admin",
    icon: Settings,
    href: "/admin",
    description: "System configuration and settings",
  },
];

export default function SidebarNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+1..9 or Ctrl+1..9
      const isMeta = e.metaKey || e.ctrlKey;
      const number = parseInt(e.key);
      if (isMeta && number >= 1 && number <= 9) {
        e.preventDefault();
        const item = NAV_ITEMS[number - 1];
        if (item) {
          navigate(item.href);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const isActive = (href: string) => {
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  return (
    <aside className="w-60 h-full flex-shrink-0 overflow-y-auto scrollbar-hide border-r bg-sidebar text-sidebar-foreground border-border">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <h2 className="font-semibold text-sm text-sidebar-foreground">
              Echo Event
            </h2>
            <p className="text-xs text-muted-foreground">Studio</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              to={item.href}
              title={item.description}
              aria-current={active ? "page" : undefined}
              data-active={active ? "true" : "false"}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-out",
                "text-sm font-medium border",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-border"
                  : "border-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground",
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-muted-foreground font-mono hidden group-hover:inline">
                  {item.shortcut}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="mt-auto p-4 border-t border-border bg-sidebar">
        <p className="text-xs text-muted-foreground text-center">
          Use Cmd+1-9 or Ctrl+1-9 to navigate quickly
        </p>
      </div>
    </aside>
  );
}
