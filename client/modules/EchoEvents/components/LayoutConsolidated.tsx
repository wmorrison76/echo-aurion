import React, { useEffect, useState } from "react";
import {
  Moon,
  Sun,
  Bell,
  ChevronDown,
  Menu,
  X,
  Search,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import QuickActionFAB from "@/components/QuickActionFAB";
import WeatherAlertWidget from "@/components/WeatherAlertWidget";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import SmartSearch, { useGlobalSearch } from "@/components/SmartSearch";
import EchoAI from "@/components/EchoAI";
import EchoHelp from "@/components/EchoHelp";
interface LayoutProps {
  children: React.ReactNode;
}
export default function LayoutConsolidated({ children }: LayoutProps) {
  const location = useLocation();
  const { preferences, updatePreference } = useUserPreferences();
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useGlobalSearch();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    preferences.sidebarExpanded,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Update sidebar state when preferences change useEffect(() => { setIsSidebarExpanded(preferences.sidebarExpanded); }, [preferences.sidebarExpanded]); // Keyboard shortcuts useEffect(() => { const handleKeyDown = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) { if ((e.metaKey || e.ctrlKey) && e.key ==="k") { e.preventDefault(); openSearch(); } return; } // Toggle sidebar (Cmd+B) if ((e.metaKey || e.ctrlKey) && e.key ==="b") { e.preventDefault(); setIsSidebarExpanded(!isSidebarExpanded); updatePreference("sidebarExpanded", !isSidebarExpanded); } // Open search (Cmd+K or Ctrl+K) if ((e.metaKey || e.ctrlKey) && e.key ==="k") { e.preventDefault(); openSearch(); } // Help (?) if (e.key ==="?" && !e.metaKey && !e.ctrlKey) { e.preventDefault(); // Trigger help } }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [isSidebarExpanded, openSearch, updatePreference]); const toggleTheme = () => { const newTheme = preferences.theme ==="dark" ?"light" :"dark"; updatePreference("theme", newTheme); }; return ( <TooltipProvider> <div className="min-h-screen bg-background text-foreground"> {/* Top Navigation Bar */} <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-background backdrop-blur-sm dark:bg-card"> <div className="mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8"> {/* Left: Logo + Sidebar Toggle */} <div className="flex items-center gap-3"> <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="lg:hidden" title="Toggle sidebar (Cmd+B)" > {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />} </button> <div className="flex items-center gap-2"> <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"> <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24"> <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /> </svg> </div> <span className="hidden font-semibold tracking-tight lg:inline">HospitalityCRM</span> </div> </div> {/* Center: Search */} <div className="flex-1 max-w-md px-4"> <div className="relative hidden md:block"> <Input readOnly onClick={openSearch} placeholder="Search..." className="h-9 w-full rounded-lg border-border/50 bg-surface pl-10 pr-12 text-sm dark:bg-slate-800/50" /> <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /> <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border/50 bg-background px-1.5 py-0.5 text-xs font-medium dark:bg-slate-800"> Cmd+K </kbd> </div> </div> {/* Right: Weather + Notifications + Theme + Profile */} <div className="flex items-center gap-2"> {/* Weather Alert Widget */} <div className="hidden sm:block"> <WeatherAlertWidget /> </div> {/* Theme Toggle */} <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8" title={`Switch to ${preferences.theme ==="dark" ?"light" :"dark"} theme`} > {preferences.theme ==="dark" ? ( <Sun className="h-4 w-4" /> ) : ( <Moon className="h-4 w-4" /> )} </Button> {/* Notifications */} <Button variant="ghost" size="icon" className="h-8 w-8 relative" title="Notifications"> <Bell className="h-4 w-4" /> <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span> </Button> {/* Echo AI */} <div className="hidden sm:block"> <EchoAI isSystemAdmin={true} /> </div> {/* Profile Dropdown */} <DropdownMenu> <DropdownMenuTrigger asChild> <button className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface px-2 py-1 hover:bg-surface dark:bg-slate-800/50 dark:hover:bg-slate-800"> <Avatar className="h-7 w-7"> <AvatarImage src="/placeholder.svg" alt="WM" /> <AvatarFallback className="text-xs">WM</AvatarFallback> </Avatar> <ChevronDown className="h-4 w-4 text-muted-foreground" /> </button> </DropdownMenuTrigger> <DropdownMenuContent align="end" className="w-56"> <DropdownMenuLabel>William Morrison</DropdownMenuLabel> <p className="px-2 text-xs text-muted-foreground mb-2">Admin</p> <DropdownMenuSeparator /> <DropdownMenuItem> <User className="mr-2 h-4 w-4" /> Profile Settings </DropdownMenuItem> <DropdownMenuItem> <Settings className="mr-2 h-4 w-4" /> Preferences </DropdownMenuItem> <DropdownMenuSeparator /> <DropdownMenuItem className="text-red-500"> <LogOut className="mr-2 h-4 w-4" /> Sign out </DropdownMenuItem> </DropdownMenuContent> </DropdownMenu> </div> </div> </nav> {/* Sidebar */} <aside className={cn("fixed left-0 top-14 bottom-0 z-40 transition-all duration-300","border-r border-border/30 bg-background backdrop-blur-sm dark:bg-card", isSidebarExpanded ?"w-56" :"w-20","hidden lg:flex flex-col" )} > <Navigation isExpanded={isSidebarExpanded} onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)} /> {/* Sidebar Toggle Button */} <div className="border-t border-border/30 p-2"> <Button variant="ghost" size="sm" onClick={() => { setIsSidebarExpanded(!isSidebarExpanded); updatePreference("sidebarExpanded", !isSidebarExpanded); }} className="w-full justify-center" title="Toggle sidebar (Cmd+B)" > {isSidebarExpanded ?"Collapse" :"Expand"} </Button> </div> </aside> {/* Mobile Sidebar Overlay */} {isMobileSidebarOpen && ( <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} /> )} {/* Mobile Sidebar */} <aside className={cn("fixed left-0 top-14 bottom-0 z-35 w-56 transition-all duration-300 lg:hidden","border-r border-border/30 bg-background backdrop-blur-sm dark:bg-card", isMobileSidebarOpen ?"translate-x-0" :"-translate-x-full" )} > <Navigation isExpanded={true} onToggle={() => setIsMobileSidebarOpen(false)} /> </aside> {/* Main Content */} <main className={cn("relative z-10 pt-14 pb-8","transition-all duration-300","lg:pl-20 lg:pr-8", isSidebarExpanded &&"lg:pl-56" )} > <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"> {/* Page Content */} <div className="space-y-6">{children}</div> </div> </main> {/* Floating Action Button */} <QuickActionFAB /> {/* Global Search */} <SmartSearch isOpen={isSearchOpen} onClose={closeSearch} /> {/* Help System */} <EchoHelp /> </div> </TooltipProvider> );
}
