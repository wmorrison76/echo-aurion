/**
 * Reusable Module Sidebar Component
 * Used across modules (PurchRec, Culinary, etc.) to provide consistent navigation UI
 * 
 * Features:
 * - Role-based access control for menu items
 * - Collapsible/expandable state management
 * - Keyboard shortcuts (Ctrl/Cmd+B to toggle)
 * - Icon tooltips in collapsed mode
 * - CSS variable theming
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ChevronLeft, Menu } from "lucide-react";
import type { Role } from "@shared/auth";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: readonly Role[];
}

export interface NavGroup {
  id?: string;
  label: string;
  items: NavItem[];
}

export interface ModuleSidebarProps {
  navGroups: NavGroup[];
  currentPage: string;
  onPageChange: (page: string) => void;
  moduleName?: string;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function ModuleSidebar({
  navGroups,
  currentPage,
  onPageChange,
  moduleName = "Module",
  isCollapsed = false,
  onCollapsedChange,
}: ModuleSidebarProps) {
  let user = null;
  let role = null;

  try {
    const authContext = useAuth();
    user = authContext?.user ?? null;
    role = user?.role ?? null;
  } catch (err) {
    console.warn("[ModuleSidebar] AuthContext not available:", err);
    role = null;
  }

  const handleToggleCollapse = useCallback(() => {
    onCollapsedChange?.(!isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  // Keyboard shortcut: Ctrl/Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "b" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        handleToggleCollapse();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggleCollapse]);

  const hasAccessToPage = (pageRoles: readonly Role[]): boolean => {
    // Allow demo access if no role is set
    return !role || pageRoles.includes(role as any);
  };

  const allAccessiblePages = useMemo(
    () =>
      navGroups.flatMap((group) =>
        group.items
          .filter((item) => hasAccessToPage(item.roles))
          .map((item) => item.id)
      ),
    [navGroups, role]
  );

  // Default to first accessible page if current page is not accessible
  const activePage = useMemo(
    () =>
      allAccessiblePages.includes(currentPage)
        ? currentPage
        : allAccessiblePages[0],
    [currentPage, allAccessiblePages]
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-sidebar-foreground tracking-wide">
              {moduleName}
            </h2>
          </div>
        )}
        <button
          onClick={handleToggleCollapse}
          className={cn(
            "p-1.5 rounded-md hover:bg-sidebar-accent transition-colors",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
          )}
        </button>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            hasAccessToPage(item.roles)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="space-y-1">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-sidebar-foreground/60 px-2 uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
              )}
              <nav className="space-y-1">
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      activePage === item.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                  </button>
                ))}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {role && !isCollapsed && (
        <div className="border-t border-sidebar-border p-3">
          <p className="text-xs text-sidebar-foreground/60">
            <span className="font-semibold">{role}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export default ModuleSidebar;
