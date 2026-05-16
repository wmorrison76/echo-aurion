import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  UtensilsCrossed,
  BarChart3,
  Settings,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  description: string;
  shortcut: string;
}
const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    description: "Overview of activities and key metrics",
    shortcut: "Cmd+1",
  },
  {
    id: "prospects",
    name: "Prospects",
    icon: Users,
    href: "/prospects",
    description: "Lead pipeline and prospect management",
    shortcut: "Cmd+2",
  },
  {
    id: "events",
    name: "Events",
    icon: Calendar,
    href: "/events",
    description: "Event lifecycle and scheduling",
    shortcut: "Cmd+3",
  },
  {
    id: "beo",
    name: "BEO/Contracts",
    icon: FileText,
    href: "/beo",
    description: "Banquet Event Orders and contracts",
    shortcut: "Cmd+4",
  },
  {
    id: "menus",
    name: "Menu Catalog",
    icon: UtensilsCrossed,
    href: "/menus",
    description: "Menu items and catalog management",
    shortcut: "Cmd+5",
  },
  {
    id: "calendar",
    name: "Calendar",
    icon: Calendar,
    href: "/calendar",
    description: "Global event calendar and timeline",
    shortcut: "Cmd+6",
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    description: "Performance metrics and insights",
    shortcut: "Cmd+7",
  },
  {
    id: "admin",
    name: "Admin",
    icon: Settings,
    href: "/admin",
    description: "System configuration and settings",
    shortcut: "Cmd+8",
  },
];
interface NavigationProps {
  isExpanded: boolean;
  onToggle: () => void;
}
export default function Navigation({ isExpanded, onToggle }: NavigationProps) {
  const location = useLocation();
  const [hoveredId, setHoveredId] = useState<string | null>(null); // Keyboard shortcuts for navigation useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { if (!e.metaKey && !e.ctrlKey) return; const shortcutMap: Record<string, number> = {"1": 0, // Dashboard"2": 1, // Prospects"3": 2, // Events"4": 3, // BEO"5": 4, // Menus"6": 5, // Calendar"7": 6, // Analytics"8": 7, // Admin }; const itemIndex = shortcutMap[e.key]; if (itemIndex !== undefined) { e.preventDefault(); const item = navigationItems[itemIndex]; if (item) { window.location.href = item.href; } } }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, []); const isActive = (href: string) => { if (href ==="/" && location.pathname ==="/") return true; if (href !=="/" && location.pathname.startsWith(href)) return true; return false; }; return ( <nav className="h-full flex flex-col gap-1 py-6 px-3 overflow-y-auto"> <TooltipProvider> {navigationItems.map((item, index) => { const Icon = item.icon; const active = isActive(item.href); const hovered = hoveredId === item.id; return ( <Tooltip key={item.id} delayDuration={300}> <TooltipTrigger asChild> <Link to={item.href} onMouseEnter={() => setHoveredId(item.id)} onMouseLeave={() => setHoveredId(null)} className={cn("group relative flex h-12 items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 overflow-hidden","before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:to-white/5 before:opacity-0 before:transition-opacity before:duration-200", active ?"bg-gradient-to-r from-primary/90 to-primary text-primary-foreground shadow-lg shadow-primary/20" :"text-muted-foreground hover:text-foreground hover:bg-background dark:hover:bg-background" )} > <div className={cn("flex items-center justify-center h-6 w-6 rounded-lg transition-all duration-200", active ?"bg-background shadow-lg" :"group-hover:bg-background" )}> <Icon className={cn("h-5 w-5 transition-transform duration-200", hovered &&"scale-115" )} /> </div> {isExpanded && ( <> <div className="flex-1 flex flex-col gap-0.5"> <span className="text-sm font-semibold leading-tight">{item.name}</span> </div> {active && ( <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-background"> <ChevronRight className="h-4 w-4" /> </div> )} </> )} {active && !isExpanded && ( <div className="absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary shadow-lg shadow-primary/50" /> )} </Link> </TooltipTrigger> {!isExpanded && ( <TooltipContent side="right" className="flex flex-col gap-2 bg-gradient-to-br from-slate-900 to-slate-800 border-border"> <span className="font-semibold text-sm">{item.name}</span> <span className="text-xs text-slate-300 max-w-xs">{item.description}</span> <span className="text-xs font-mono text-primary/80 pt-1 border-t border-border">{item.shortcut}</span> </TooltipContent> )} </Tooltip> ); })} </TooltipProvider> </nav> );
}
