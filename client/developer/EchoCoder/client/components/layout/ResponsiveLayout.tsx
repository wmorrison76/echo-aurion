import React, { ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive breakpoint values in pixels
 */
export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/**
 * Media query strings for use in components
 */
export const MEDIA_QUERIES = {
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  "2xl": `(min-width: ${BREAKPOINTS["2xl"]}px)`,
} as const;

/**
 * Hook to detect current breakpoint
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<keyof typeof BREAKPOINTS>("xs");

  React.useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= BREAKPOINTS["2xl"]) setBreakpoint("2xl");
      else if (width >= BREAKPOINTS.xl) setBreakpoint("xl");
      else if (width >= BREAKPOINTS.lg) setBreakpoint("lg");
      else if (width >= BREAKPOINTS.md) setBreakpoint("md");
      else if (width >= BREAKPOINTS.sm) setBreakpoint("sm");
      else setBreakpoint("xs");
    };

    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * Responsive grid container with automatic column adjustment
 */
interface ResponsiveGridProps {
  children: ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    "2xl"?: number;
  };
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const GAP_MAP = {
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 1, md: 2, lg: 3, xl: 4 },
  gap = "md",
  className,
}: ResponsiveGridProps) {
  const gridClass = useMemo(() => {
    const classes: string[] = ["grid"];

    if (cols.xs) classes.push(`grid-cols-${cols.xs}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    if (cols["2xl"]) classes.push(`2xl:grid-cols-${cols["2xl"]}`);

    classes.push(GAP_MAP[gap] || GAP_MAP.md);

    return classes.join(" ");
  }, [cols, gap]);

  return <div className={cn(gridClass, className)}>{children}</div>;
}

/**
 * Responsive container with max-width and padding
 */
interface ResponsiveContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: boolean;
  className?: string;
}

const MAX_WIDTH_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "w-full",
};

export function ResponsiveContainer({
  children,
  maxWidth = "2xl",
  padding = true,
  className,
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto",
        MAX_WIDTH_MAP[maxWidth],
        padding && "px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Two-column responsive layout (sidebar + main)
 */
interface ResponsiveSidebarLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  sidebarWidth?: "narrow" | "normal" | "wide";
  collapseSidebar?: boolean;
  className?: string;
}

const SIDEBAR_WIDTH_MAP = {
  narrow: "w-48",
  normal: "w-64",
  wide: "w-80",
};

export function ResponsiveSidebarLayout({
  sidebar,
  main,
  sidebarWidth = "normal",
  collapseSidebar = false,
  className,
}: ResponsiveSidebarLayoutProps) {
  return (
    <div
      className={cn(
        "grid gap-0 overflow-hidden",
        collapseSidebar ? "grid-cols-1 lg:grid-cols-[auto_1fr]" : "grid-cols-1 md:grid-cols-[auto_1fr]",
        className
      )}
    >
      <aside
        className={cn(
          "bg-sidebar border-r border-border/20 overflow-y-auto",
          collapseSidebar ? "hidden lg:block" : "block",
          SIDEBAR_WIDTH_MAP[sidebarWidth],
          "h-[calc(100vh-120px)]"
        )}
      >
        {sidebar}
      </aside>
      <main className="overflow-auto">{main}</main>
    </div>
  );
}

/**
 * Stack layout with responsive direction change
 */
interface ResponsiveStackProps {
  children: ReactNode;
  direction?: "row" | "col";
  reverseAt?: keyof typeof BREAKPOINTS;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function ResponsiveStack({
  children,
  direction = "col",
  reverseAt,
  gap = "md",
  className,
}: ResponsiveStackProps) {
  const directionClass = direction === "row" ? "flex flex-row" : "flex flex-col";
  const reverseClass = reverseAt ? `${reverseAt}:flex-row-reverse` : "";

  return (
    <div
      className={cn(
        directionClass,
        reverseClass,
        GAP_MAP[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive spacing utility hook
 */
export function useResponsiveSpacing() {
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    const spacingMap = {
      xs: { padding: "p-2", margin: "m-2", gap: "gap-2" },
      sm: { padding: "p-3", margin: "m-3", gap: "gap-3" },
      md: { padding: "p-4", margin: "m-4", gap: "gap-4" },
      lg: { padding: "p-6", margin: "m-6", gap: "gap-6" },
      xl: { padding: "p-8", margin: "m-8", gap: "gap-8" },
      "2xl": { padding: "p-12", margin: "m-12", gap: "gap-12" },
    };

    return spacingMap[breakpoint] || spacingMap.md;
  }, [breakpoint]);
}

/**
 * Media query helper for conditional rendering
 */
interface ResponsiveProps {
  xs?: ReactNode;
  sm?: ReactNode;
  md?: ReactNode;
  lg?: ReactNode;
  xl?: ReactNode;
  "2xl"?: ReactNode;
}

export function Responsive({
  xs,
  sm,
  md,
  lg,
  xl,
  "2xl": xxl,
}: ResponsiveProps) {
  const breakpoint = useBreakpoint();

  const content = {
    xs,
    sm,
    md,
    lg,
    xl,
    "2xl": xxl,
  };

  return <>{content[breakpoint]}</>;
}
