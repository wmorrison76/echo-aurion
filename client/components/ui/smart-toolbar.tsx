/**
 * Smart Toolbar Component
 *
 * Enterprise-grade unified toolbar for all modules
 * - Fully responsive (mobile, tablet, desktop)
 * - Theme-aware (dark/light mode support)
 * - Accessible (ARIA, keyboard navigation)
 * - Standardized styling using CSS variables
 *
 * Usage:
 * ```tsx
 * <SmartToolbar
 *   title="Module Name"
 *   actions={toolbarActions}
 *   position="top"
 *   responsive={true}
 * />
 * ```
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { Separator } from "./separator";
import { useTheme } from "next-themes";

export interface ToolbarAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive" | "secondary" | "ghost" | "outline";
  group?: string;
  tooltip?: string;
  shortcut?: string;
  visible?: boolean;
}

export interface SmartToolbarProps {
  title?: string;
  subtitle?: string;
  actions?: ToolbarAction[];
  position?: "top" | "bottom" | "floating";
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  responsive?: boolean;
  collapsible?: boolean;
  sticky?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function SmartToolbar({
  title,
  subtitle,
  actions = [],
  position = "top",
  orientation = "horizontal",
  size = "md",
  responsive = true,
  collapsible = false,
  sticky = false,
  className,
  children,
}: SmartToolbarProps) {
  const { theme } = useTheme();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Responsive detection
  React.useEffect(() => {
    if (!responsive) return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [responsive]);

  const visibleActions = actions.filter((a) => a.visible !== false);
  const groupedActions = React.useMemo(() => {
    const groups: Record<string, ToolbarAction[]> = { default: [] };
    visibleActions.forEach((action) => {
      const group = action.group || "default";
      if (!groups[group]) groups[group] = [];
      groups[group].push(action);
    });
    return groups;
  }, [visibleActions]);

  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    md: "h-10 px-3 text-sm",
    lg: "h-12 px-4 text-base",
  };

  const positionClasses = {
    top: sticky ? "sticky top-0 z-50" : "",
    bottom: sticky ? "sticky bottom-0 z-50" : "",
    floating: "fixed top-4 left-1/2 -translate-x-1/2 z-50 shadow-lg",
  };

  if (isCollapsed && collapsible) {
    return (
      <div
        className={cn(
          "flex items-center justify-between",
          "bg-card/95 backdrop-blur-lg border-b border-border",
          "px-4 py-2",
          positionClasses[position],
          className,
        )}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Expand toolbar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        {title && <span className="font-semibold">{title}</span>}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex items-center gap-2",
          "bg-card/95 backdrop-blur-lg border-b border-border",
          "px-4 py-2",
          responsive && isMobile && "flex-col items-stretch",
          positionClasses[position],
          className,
        )}
        role="toolbar"
        aria-label={title || "Toolbar"}
      >
        {(title || subtitle) && (
          <div className="flex flex-col min-w-0 flex-1">
            {title && (
              <h3 className="font-semibold text-foreground truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}

        <div
          className={cn(
            "flex items-center gap-1",
            orientation === "vertical" && "flex-col",
            responsive && isMobile && "flex-wrap justify-center w-full",
          )}
        >
          {Object.entries(groupedActions).map(
            ([groupName, groupActions], groupIndex) => (
              <React.Fragment key={groupName}>
                {groupIndex > 0 && (
                  <Separator
                    orientation={
                      orientation === "vertical" ? "horizontal" : "vertical"
                    }
                    className={cn(
                      orientation === "vertical" ? "w-full" : "h-6",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex items-center gap-1",
                    orientation === "vertical" && "flex-col",
                    responsive && isMobile && "flex-wrap justify-center",
                  )}
                >
                  {groupActions.map((action) => {
                    const button = (
                      <Button
                        key={action.id}
                        variant={action.variant || "ghost"}
                        size={size}
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className={cn(sizeClasses[size], "transition-all")}
                        aria-label={action.label}
                      >
                        {action.icon}
                        {!isMobile && action.label && (
                          <span className="ml-2">{action.label}</span>
                        )}
                      </Button>
                    );

                    if (action.tooltip || action.shortcut) {
                      return (
                        <Tooltip key={action.id}>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent>
                            <p>{action.tooltip || action.label}</p>
                            {action.shortcut && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {action.shortcut}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return button;
                  })}
                </div>
              </React.Fragment>
            ),
          )}
        </div>

        {collapsible && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="ml-auto"
            aria-label="Collapse toolbar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
