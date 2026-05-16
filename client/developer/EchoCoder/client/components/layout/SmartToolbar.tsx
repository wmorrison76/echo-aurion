import React, { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Toolbar action item configuration
 */
export interface ToolbarAction {
  id: string;
  icon: ReactNode;
  label: string;
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive" | "secondary";
  group?: string;
  visible?: boolean;
}

/**
 * Position configurations for toolbar
 */
type ToolbarPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

interface ToolbarConfig {
  position?: ToolbarPosition;
  collapsible?: boolean;
  floating?: boolean;
  sticky?: boolean;
  responsive?: boolean;
}

/**
 * Hook to manage toolbar state
 */
export function useToolbar(config: ToolbarConfig = {}) {
  const {
    position = "top-left",
    collapsible = false,
    floating = true,
    sticky = false,
    responsive = true,
  } = config;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [actions, setActions] = useState<ToolbarAction[]>([]);

  const updateActions = (newActions: ToolbarAction[]) => {
    setActions(newActions);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return {
    position,
    isCollapsed,
    toggleCollapse,
    actions,
    updateActions,
    collapsible,
    floating,
    sticky,
    responsive,
  };
}

/**
 * Main toolbar component
 */
interface ToolbarProps {
  actions: ToolbarAction[];
  position?: ToolbarPosition;
  floating?: boolean;
  sticky?: boolean;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}

const POSITION_MAP = {
  "top-left": "top-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
};

const SIZE_MAP = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function Toolbar({
  actions,
  position = "top-left",
  floating = true,
  sticky = false,
  collapsible = false,
  isCollapsed = false,
  onCollapse,
  orientation = "horizontal",
  size = "md",
  className,
  children,
}: ToolbarProps) {
  const visibleActions = actions.filter((a) => a.visible !== false);

  const groupedActions = visibleActions.reduce(
    (acc, action) => {
      const group = action.group || "default";
      if (!acc[group]) acc[group] = [];
      acc[group].push(action);
      return acc;
    },
    {} as Record<string, ToolbarAction[]>
  );

  const positionClass = floating ? `fixed ${POSITION_MAP[position]} z-40` : "";
  const stickyClass = sticky && !floating ? "sticky" : "";

  return (
    <div
      className={cn(
        "flex items-center gap-1 p-2",
        "bg-card/90 backdrop-blur-lg border border-primary/30 rounded-lg",
        "shadow-lg hover:shadow-xl transition-shadow",
        orientation === "vertical" ? "flex-col" : "flex-row",
        positionClass,
        stickyClass,
        className
      )}
      role="toolbar"
      aria-label="Context toolbar"
    >
      {children}

      {Object.entries(groupedActions).map(([group, groupActions], groupIndex) => (
        <React.Fragment key={group}>
          {groupIndex > 0 && (
            <div className={cn(
              "bg-primary/20",
              orientation === "vertical" ? "h-px w-6" : "h-6 w-px"
            )} />
          )}
          <div
            className={cn(
              "flex items-center gap-1",
              orientation === "vertical" ? "flex-col" : "flex-row"
            )}
          >
            {groupActions.map((action) => (
              <ToolbarButton
                key={action.id}
                action={action}
                size={size}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * Individual toolbar button
 */
interface ToolbarButtonProps {
  action: ToolbarAction;
  size?: "sm" | "md" | "lg";
  isCollapsed?: boolean;
}

function ToolbarButton({ action, size = "md", isCollapsed = false }: ToolbarButtonProps) {
  const variantStyles = {
    default: "hover:bg-primary/10 text-foreground hover:text-primary",
    destructive: "hover:bg-destructive/10 text-destructive hover:text-destructive/90",
    secondary: "hover:bg-secondary/10 text-secondary hover:text-secondary/90",
  };

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.tooltip || action.label}
      className={cn(
        SIZE_MAP[size],
        "flex items-center justify-center rounded-md transition-all",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[action.variant || "default"]
      )}
      aria-label={action.label}
      aria-disabled={action.disabled}
    >
      <span className="flex items-center justify-center">{action.icon}</span>
    </button>
  );
}

/**
 * Contextual toolbar that shows/hides based on selection
 */
interface ContextualToolbarProps {
  isVisible: boolean;
  actions: ToolbarAction[];
  onClose: () => void;
  position?: ToolbarPosition;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ContextualToolbar({
  isVisible,
  actions,
  onClose,
  position = "top-left",
  size = "md",
  className,
}: ContextualToolbarProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <Toolbar
      actions={actions}
      position={position}
      floating={true}
      size={size}
      className={cn(
        "animate-in fade-in zoom-in-95 duration-200",
        className
      )}
    />
  );
}

/**
 * Floating action button (FAB) component
 */
interface FloatingActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  position?: "bottom-left" | "bottom-right";
  size?: "sm" | "md" | "lg";
  variant?: "default" | "destructive" | "secondary";
}

export function FloatingActionButton({
  icon,
  label,
  onClick,
  position = "bottom-right",
  size = "lg",
  variant = "default",
}: FloatingActionButtonProps) {
  const positionClass =
    position === "bottom-right"
      ? "bottom-6 right-6"
      : "bottom-6 left-6";

  const variantStyles = {
    default: "bg-primary hover:bg-primary/90 text-primary-foreground",
    destructive: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    secondary: "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
  };

  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "fixed z-40 rounded-full shadow-lg hover:shadow-xl transition-all",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
        positionClass,
        SIZE_MAP[size],
        variantStyles[variant],
        "flex items-center justify-center"
      )}
      aria-label={label}
    >
      <span className="flex items-center justify-center">{icon}</span>
    </button>
  );
}

/**
 * Toolbar group divider
 */
interface ToolbarDividerProps {
  orientation?: "horizontal" | "vertical";
}

export function ToolbarDivider({ orientation = "horizontal" }: ToolbarDividerProps) {
  return orientation === "vertical" ? (
    <div className="h-px w-6 bg-primary/20" />
  ) : (
    <div className="h-6 w-px bg-primary/20" />
  );
}

/**
 * Toolbar section with label
 */
interface ToolbarSectionProps {
  label?: string;
  children: ReactNode;
  className?: string;
}

export function ToolbarSection({ label, children, className }: ToolbarSectionProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

/**
 * Hook for managing toolbar visibility based on selection
 */
export function useSelectiveToolbar() {
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

  const isAnySelected = selectedItems.length > 0;
  const isSingleSelected = selectedItems.length === 1;
  const isMultipleSelected = selectedItems.length > 1;

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  return {
    selectedItems,
    setSelectedItems,
    toggleSelection,
    clearSelection,
    isAnySelected,
    isSingleSelected,
    isMultipleSelected,
  };
}
