import React, { useEffect, useState } from "react";
import { Menu, X, Search, Moon, Sun } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import SmartSearch, { useGlobalSearch } from "@/components/SmartSearch";
import EchoHelp from "@/components/EchoHelp";
interface LayoutPanelProps {
  children: React.ReactNode;
}
export default function LayoutPanel({ children }: LayoutPanelProps) {
  const location = useLocation();
  const { preferences, updatePreference } = useUserPreferences();
  const { isOpen: isSearchOpen, openSearch, closeSearch } = useGlobalSearch();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  useEffect(() => {
    setIsSidebarExpanded(preferences.sidebarExpanded);
  }, [preferences.sidebarExpanded]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setIsSidebarExpanded(!isSidebarExpanded);
        updatePreference("sidebarExpanded", !isSidebarExpanded);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarExpanded, openSearch, updatePreference]);
  const toggleTheme = () => {
    const newTheme = preferences.theme === "dark" ? "light" : "dark";
    updatePreference("theme", newTheme);
  };
  return (
    <TooltipProvider>
      {" "}
      <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
        {" "}
        {/* Compact Top Navigation Bar */}{" "}
        <nav className="glass-panel flex h-12 items-center justify-between gap-1 border-t-0 border-x-0 flex-shrink-0 px-2 sm:px-3 rounded-b-lg">
          {" "}
          {/* Left: Menu + Logo */}{" "}
          <div className="flex items-center gap-2 min-w-0">
            {" "}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="p-1 hover:bg-accent rounded-md transition-colors flex-shrink-0"
              title="Toggle sidebar (Cmd+B)"
            >
              {" "}
              {isMobileSidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}{" "}
            </button>{" "}
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              {" "}
              <svg
                className="h-4 w-4 text-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                {" "}
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />{" "}
              </svg>{" "}
            </div>{" "}
            <span className="text-xs font-semibold truncate hidden sm:inline">
              CRM
            </span>{" "}
          </div>{" "}
          {/* Right: Search + Theme */}{" "}
          <div className="flex items-center gap-1 flex-shrink-0">
            {" "}
            <button
              onClick={openSearch}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="Search (Cmd+K)"
            >
              {" "}
              <Search className="h-4 w-4" />{" "}
            </button>{" "}
            <button
              onClick={toggleTheme}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="Toggle theme"
            >
              {" "}
              {preferences.theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}{" "}
            </button>{" "}
          </div>{" "}
        </nav>{" "}
        {/* Main Content Area */}{" "}
        <div className="flex flex-1 min-h-0 gap-0">
          {" "}
          {/* Sidebar - Compact when collapsed */}{" "}
          <aside
            className={cn(
              "glass-panel border-r flex flex-col transition-all duration-200 flex-shrink-0 rounded-r-lg",
              isSidebarExpanded ? "w-48" : "w-16",
            )}
          >
            {" "}
            <div className="flex-1 overflow-y-auto py-2 px-1">
              {" "}
              <Navigation
                isExpanded={isSidebarExpanded}
                onToggle={() => {
                  setIsSidebarExpanded(!isSidebarExpanded);
                  updatePreference("sidebarExpanded", !isSidebarExpanded);
                }}
              />{" "}
            </div>{" "}
          </aside>{" "}
          {/* Mobile Sidebar Overlay */}{" "}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}{" "}
          <aside
            className={cn(
              "glass-panel fixed left-0 top-12 bottom-0 z-50 w-48 border-r lg:hidden transition-transform duration-200 rounded-r-2xl",
              isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            {" "}
            <div className="overflow-y-auto py-2 px-1 h-full">
              {" "}
              <Navigation
                isExpanded={true}
                onToggle={() => setIsMobileSidebarOpen(false)}
              />{" "}
            </div>{" "}
          </aside>{" "}
          {/* Main Content */}{" "}
          <main className="flex-1 overflow-y-auto">
            {" "}
            <div className="h-full">
              {" "}
              <div className="p-3 sm:p-4 lg:p-6 space-y-4">{children}</div>{" "}
            </div>{" "}
          </main>{" "}
        </div>{" "}
        {/* Global Search */}{" "}
        <SmartSearch isOpen={isSearchOpen} onClose={closeSearch} />{" "}
        {/* Help System */} <EchoHelp />{" "}
      </div>{" "}
    </TooltipProvider>
  );
}
