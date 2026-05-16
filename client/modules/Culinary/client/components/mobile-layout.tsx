import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout wrapper for mobile-optimized content
 * Provides proper spacing and padding for mobile devices
 */
export function MobileOptimizedLayout({
  children,
  className,
}: MobileOptimizedLayoutProps) {
  return (
    <div className={cn("w-full", className)}>
      {children}
    </div>
  );
}

interface MobileCardProps {
  children: ReactNode;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Touch-friendly card component optimized for mobile
 * Larger touch targets and appropriate spacing
 */
export function MobileCard({
  children,
  clickable = false,
  onClick,
  className,
}: MobileCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 sm:p-4",
        clickable && "active:scale-98 transition-transform cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface MobileToolbarProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

/**
 * Mobile toolbar for primary actions
 * Sticks to bottom on mobile for easy thumb reach
 */
export function MobileToolbar({
  children,
  sticky = true,
  className,
}: MobileToolbarProps) {
  return (
    <div
      className={cn(
        "flex gap-2 p-2 sm:p-3 bg-background border-t",
        sticky && "fixed bottom-0 left-0 right-0 z-40 sm:static sm:border-t",
        sticky && "max-h-[80px] overflow-x-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Mobile-optimized page header
 */
export function MobilePageHeader({
  title,
  subtitle,
  action,
  className,
}: MobilePageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface MobileTouchTargetProps {
  children: ReactNode;
  minSize?: "sm" | "md" | "lg";
  className?: string;
}

const minSizeClasses = {
  sm: "min-h-8 min-w-8",
  md: "min-h-10 min-w-10",
  lg: "min-h-12 min-w-12",
};

/**
 * Ensures touch target meets minimum size (44x44px for accessibility)
 */
export function MobileTouchTarget({
  children,
  minSize = "md",
  className,
}: MobileTouchTargetProps) {
  return (
    <div className={cn("flex items-center justify-center", minSizeClasses[minSize], className)}>
      {children}
    </div>
  );
}

interface MobileTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-optimized table with horizontal scroll on small screens
 */
export function MobileTable({ children, className }: MobileTableProps) {
  return (
    <div className={cn("overflow-x-auto -mx-2 sm:mx-0", className)}>
      <div className="min-w-full px-2 sm:px-0">
        {children}
      </div>
    </div>
  );
}

interface MobileModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  className?: string;
}

/**
 * Mobile-optimized modal/sheet that takes full height on mobile
 */
export function MobileModal({
  open,
  title,
  children,
  onClose,
  actions,
  className,
}: MobileModalProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 sm:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-lg",
          "max-h-[90vh] overflow-y-auto",
          "sm:max-h-full sm:rounded-lg",
          "flex flex-col",
          className,
        )}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-background">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4">
          {children}
        </div>

        {/* Actions */}
        {actions && (
          <div className="sticky bottom-0 flex gap-2 p-4 border-t bg-background">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}

interface MobileTabsProps {
  tabs: Array<{ id: string; label: string; content: ReactNode }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Mobile-optimized tabs with better touch targets
 */
export function MobileTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: MobileTabsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Tab buttons */}
      <div className="flex gap-1 border-b overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-3 sm:px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              "border-b-2 border-transparent",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

interface MobileListProps {
  items: Array<{ id: string; label: string; description?: string; onClick?: () => void }>;
  className?: string;
}

/**
 * Mobile-optimized list with touch-friendly items
 */
export function MobileList({ items, className }: MobileListProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={cn(
            "p-3 sm:p-4 rounded-lg border bg-card",
            item.onClick && "cursor-pointer active:opacity-75 transition-opacity",
          )}
        >
          <div className="font-medium text-sm">{item.label}</div>
          {item.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {item.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
