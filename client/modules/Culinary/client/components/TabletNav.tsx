import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Printer, Trash2, TrendingUp, Settings, Package, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABLET_NAV_ITEMS: NavItem[] = [
  {
    path: "/tablet/labels",
    label: "Recipe Labels",
    icon: <Printer className="h-5 w-5" />,
    description: "Print recipe labels",
  },
  {
    path: "/tablet/inventory",
    label: "Inventory Management",
    icon: <Package className="h-5 w-5" />,
    description: "Shelf counts & orders",
  },
  {
    path: "/tablet/receiving",
    label: "Receiving Check-In",
    icon: <ShoppingCart className="h-5 w-5" />,
    description: "Check in deliveries",
  },
  {
    path: "/tablet/waste",
    label: "Waste Tracking",
    icon: <Trash2 className="h-5 w-5" />,
    description: "Track waste by category",
  },
  {
    path: "/tablet/transfers",
    label: "Inventory Transfer",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "Transfer between departments",
  },
  {
    path: "/tablet/admin",
    label: "Admin Dashboard",
    icon: <Settings className="h-5 w-5" />,
    description: "Manage tablet devices & recipes",
  },
];

export function TabletNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="w-full bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-1">
          Kitchen Tablet
        </h2>
        <p className="text-xs text-slate-500">Operations Center</p>
      </div>
      <nav className="space-y-1 p-3">
        {TABLET_NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-start gap-3 px-3 py-3 rounded-lg transition-all group",
              currentPath === item.path
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-300 hover:bg-slate-800/50 border border-transparent",
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex-shrink-0",
                currentPath === item.path
                  ? "text-emerald-400"
                  : "text-slate-400 group-hover:text-slate-300",
              )}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.label}</div>
              <div
                className={cn(
                  "text-xs mt-0.5",
                  currentPath === item.path
                    ? "text-emerald-300/70"
                    : "text-slate-500",
                )}
              >
                {item.description}
              </div>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function TabletSidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-slate-50">
      <TabletNav />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
