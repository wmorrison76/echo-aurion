import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sidebar item configuration
 */
export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  children?: SidebarItem[];
  expandable?: boolean;
}

/**
 * Sidebar context for managing state
 */
interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
  collapsible: boolean;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

/**
 * Sidebar provider component
 */
interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  collapsible = true,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const value: SidebarContextType = {
    isOpen,
    toggle: () => setIsOpen(!isOpen),
    close: () => setIsOpen(false),
    open: () => setIsOpen(true),
    collapsible,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * Main sidebar component
 */
interface SidebarProps {
  children: ReactNode;
  side?: "left" | "right";
  width?: "sm" | "md" | "lg";
  className?: string;
}

const WIDTH_MAP = {
  sm: "w-48",
  md: "w-64",
  lg: "w-80",
};

export function Sidebar({
  children,
  side = "left",
  width = "md",
  className,
}: SidebarProps) {
  const { isOpen } = useSidebar();
  const positionClass = side === "left" ? "left-0" : "right-0";

  return (
    <aside
      className={cn(
        "fixed top-0 bottom-0 z-40 bg-sidebar border-r border-border/20",
        "overflow-y-auto transition-transform duration-300",
        positionClass,
        WIDTH_MAP[width],
        isOpen ? "translate-x-0" : cn(side === "left" ? "-translate-x-full" : "translate-x-full"),
        "md:relative md:translate-x-0",
        className
      )}
    >
      {children}
    </aside>
  );
}

/**
 * Sidebar toggle button
 */
interface SidebarToggleProps {
  className?: string;
}

export function SidebarToggle({ className }: SidebarToggleProps) {
  const { toggle, isOpen } = useSidebar();

  return (
    <button
      onClick={toggle}
      className={cn(
        "md:hidden p-2 rounded-md hover:bg-muted transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        className
      )}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

/**
 * Sidebar header component
 */
interface SidebarHeaderProps {
  children: ReactNode;
  className?: string;
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 bg-sidebar border-b border-border/20",
        "px-6 py-4 z-10",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Sidebar content wrapper
 */
interface SidebarContentProps {
  children: ReactNode;
  className?: string;
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  return (
    <nav
      className={cn("flex flex-col gap-1 px-3 py-4", className)}
      aria-label="Sidebar navigation"
    >
      {children}
    </nav>
  );
}

/**
 * Sidebar item component
 */
interface SidebarItemProps {
  item: SidebarItem;
  level?: number;
  onItemClick?: (item: SidebarItem) => void;
}

export function SidebarItem({
  item,
  level = 0,
  onItemClick,
}: SidebarItemProps) {
  const [expanded, setExpanded] = useState(false);
  const { close: closeSidebar } = useSidebar();

  const handleClick = useCallback(() => {
    if (item.expandable) {
      setExpanded(!expanded);
    } else {
      item.onClick?.();
      onItemClick?.(item);
      closeSidebar();
    }
  }, [item, expanded, onItemClick, closeSidebar]);

  const paddingLeft = `${level * 12}px`;
  const isExpandable = item.expandable || (item.children && item.children.length > 0);

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary",
          item.active
            ? "bg-primary/10 text-primary font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        )}
        style={{ paddingLeft: `calc(0.75rem + ${paddingLeft})` }}
        aria-current={item.active ? "page" : undefined}
      >
        {item.icon && (
          <span className="h-5 w-5 flex-shrink-0">{item.icon}</span>
        )}
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge && (
          <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
            {item.badge}
          </span>
        )}
        {isExpandable && (
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded && "rotate-90"
            )}
          />
        )}
      </button>

      {isExpandable && expanded && item.children && (
        <div className="mt-1">
          {item.children.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              level={level + 1}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Sidebar menu component
 */
interface SidebarMenuProps {
  items: SidebarItem[];
  onItemClick?: (item: SidebarItem) => void;
  className?: string;
}

export function SidebarMenu({
  items,
  onItemClick,
  className,
}: SidebarMenuProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          item={item}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}

/**
 * Sidebar footer component
 */
interface SidebarFooterProps {
  children: ReactNode;
  className?: string;
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 bg-sidebar border-t border-border/20",
        "px-6 py-4 mt-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Sidebar backdrop (for mobile)
 */
export function SidebarBackdrop() {
  const { isOpen, close } = useSidebar();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 bg-black/50 md:hidden"
      onClick={close}
      role="presentation"
      aria-hidden="true"
    />
  );
}

/**
 * Hook for responsive sidebar behavior
 */
export function useSidebarResponsive() {
  const { isOpen, close } = useSidebar();
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && isOpen) {
      close();
    }
  }, [isMobile, isOpen, close]);

  return { isMobile, isOpen };
}
