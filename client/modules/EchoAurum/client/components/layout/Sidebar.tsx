import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Layers,
  FileText,
  BarChart3,
  Settings,
  Boxes,
  Shield,
  Eye,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  group: "app" | "marketing" | "resources";
  visible?: boolean;
}
const navItems: NavItem[] = [
  // App Navigation { label:"Dashboard", href:"/dashboard", icon: <Home className="h-5 w-5" />, group:"app", }, { label:"GL Operations", href:"/gl", icon: <Layers className="h-5 w-5" />, group:"app", }, { label:"AP & Invoices", href:"/ap", icon: <FileText className="h-5 w-5" />, group:"app", }, { label:"Reports", href:"/reports", icon: <BarChart3 className="h-5 w-5" />, group:"app", }, { label:"Audit", href:"/audit", icon: <Shield className="h-5 w-5" />, group:"app", }, { label:"Purchasing", href:"/purchasing", icon: <Boxes className="h-5 w-5" />, group:"app", }, { label:"Console", href:"/console", icon: <Eye className="h-5 w-5" />, group:"app", }, { label:"Admin", href:"/admin", icon: <Settings className="h-5 w-5" />, group:"app", }, // Marketing Navigation { label:"Features", href:"/features", icon: <Layers className="h-5 w-5" />, group:"marketing", }, { label:"Security", href:"/security", icon: <Shield className="h-5 w-5" />, group:"marketing", }, { label:"Pricing", href:"/pricing", icon: <BarChart3 className="h-5 w-5" />, group:"marketing", }, { label:"Docs", href:"/docs", icon: <FileText className="h-5 w-5" />, group:"marketing", }, // Resources { label:"Overview", href:"/overview", icon: <Eye className="h-5 w-5" />, group:"resources", },
];
interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function Sidebar({ open: controlledOpen, onOpenChange }: SidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation(); // Use controlled or internal state const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen; const setOpen = (value: boolean) => { if (controlledOpen === undefined) { setInternalOpen(value); } onOpenChange?.(value); }; // Close sidebar when clicking outside or on a link useEffect(() => { const handleClickOutside = (e: MouseEvent) => { const sidebar = document.getElementById("sidebar"); const trigger = document.getElementById("sidebar-trigger"); if ( sidebar && !sidebar.contains(e.target as Node) && !trigger?.contains(e.target as Node) ) { setOpen(false); } }; if (isOpen) { document.addEventListener("click", handleClickOutside); return () => document.removeEventListener("click", handleClickOutside); } }, [isOpen, setOpen]); // Determine which nav items to show based on current page const isOnAppPages = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/gl") || location.pathname.startsWith("/ap") || location.pathname.startsWith("/reports") || location.pathname.startsWith("/admin") || location.pathname.startsWith("/console") || location.pathname.startsWith("/purchasing") || location.pathname.startsWith("/audit"); const appNavItems = navItems.filter((item) => item.group ==="app"); const marketingNavItems = navItems.filter( (item) => item.group ==="marketing", ); const resourceNavItems = navItems.filter( (item) => item.group ==="resources", ); const visibleItems = isOnAppPages ? appNavItems : [...marketingNavItems, ...resourceNavItems]; return ( <> {/* Sidebar Trigger Button */} <div className="fixed left-4 top-16 z-50 lg:hidden"> <Button id="sidebar-trigger" variant="ghost" size="icon" onClick={() => setOpen(!isOpen)} className="rounded-xl bg-gradient-to-br from-surface/85 to-surface/75 border border-white/20 backdrop-blur-xl text-muted-foreground hover:text-foreground hover:bg-surface-variant/80 transition-all duration-200 shadow-lg shadow-black/20" > {isOpen ? ( <ChevronLeft className="h-5 w-5" /> ) : ( <Menu className="h-5 w-5" /> )} </Button> </div> {/* Overlay */} {isOpen && ( <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-200" onClick={() => setOpen(false)} /> )} {/* Sidebar */} <aside id="sidebar" className={cn("fixed left-0 top-16 z-50 h-[calc(100vh-64px)] w-48 border-r border-white/20 bg-gradient-to-br from-surface/85 via-surface/80 to-surface/75 backdrop-blur-3xl transition-all duration-200 shadow-xl shadow-black/20", !isOpen &&"translate-x-[-100%] lg:translate-x-0", collapsed &&"w-20", )} > {/* Navigation */} <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6"> {visibleItems.length > 0 && ( <nav className="space-y-2"> {visibleItems.map((item) => ( <Link key={item.href} to={item.href} onClick={() => { // Close sidebar on mobile when clicking a link if (window.innerWidth < 1024) { setOpen(false); } }} className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", location.pathname === item.href ?"bg-aurum-500/20 text-aurum-300" :"text-muted-foreground hover:text-foreground hover:bg-surface-variant/40", )} title={collapsed ? item.label : undefined} > <span className="flex-shrink-0">{item.icon}</span> {!collapsed && <span>{item.label}</span>} {/* Glass tooltip on hover (collapsed state) */} {collapsed && ( <div className="absolute left-full ml-2 hidden rounded-lg bg-surface/80 border border-border/40 backdrop-blur-xl px-3 py-2 text-xs whitespace-nowrap text-foreground group-hover:block z-50"> {item.label} </div> )} </Link> ))} </nav> )} </div> {/* Footer - Collapse Toggle (desktop only) */} <div className="hidden lg:block border-t border-white/10 px-3 py-4"> <button onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center justify-center rounded-xl px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-background transition-all duration-200 border border-transparent hover:border-white/20 backdrop-blur-sm" title={collapsed ?"Expand sidebar" :"Collapse sidebar"} > {collapsed ? ( <Menu className="h-5 w-5" /> ) : ( <ChevronLeft className="h-5 w-5" /> )} </button> </div> </aside> </> );
}
