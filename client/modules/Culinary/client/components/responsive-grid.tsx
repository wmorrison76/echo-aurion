import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const gapClasses = {
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const colClasses = {
  1: {
    mobile: "grid-cols-1",
    tablet: "sm:grid-cols-1",
    desktop: "md:grid-cols-1",
  },
  2: {
    mobile: "grid-cols-1",
    tablet: "sm:grid-cols-2",
    desktop: "md:grid-cols-2",
  },
  3: {
    mobile: "grid-cols-1",
    tablet: "sm:grid-cols-2",
    desktop: "md:grid-cols-3",
  },
  4: {
    mobile: "grid-cols-1",
    tablet: "sm:grid-cols-2",
    desktop: "lg:grid-cols-4",
  },
};

/**
 * Responsive grid component that adapts column count based on breakpoint
 * @example
 * <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
 *   {children}
 * </ResponsiveGrid>
 */
export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "md",
  className,
}: ResponsiveGridProps) {
  const colCount = cols.desktop ?? 3;
  const defaultCols = (
    {
      1: colClasses[1],
      2: colClasses[2],
      3: colClasses[3],
      4: colClasses[4],
    } as const
  )[Math.min(colCount, 4) as keyof typeof colClasses] || colClasses[3];

  return (
    <div
      className={cn(
        "grid",
        defaultCols.mobile,
        defaultCols.tablet,
        defaultCols.desktop,
        gapClasses[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  direction?: "row" | "col";
  align?: "start" | "center" | "end";
  justify?: "start" | "center" | "between" | "end";
  className?: string;
}

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  between: "justify-between",
  end: "justify-end",
};

/**
 * Responsive stack component for flexible layouts
 * @example
 * <ResponsiveStack direction="col" gap="md" align="center">
 *   {children}
 * </ResponsiveStack>
 */
export function ResponsiveStack({
  children,
  gap = "md",
  direction = "col",
  align = "start",
  justify = "start",
  className,
}: ResponsiveStackProps) {
  const directionClass = direction === "row" ? "flex-row" : "flex-col";

  return (
    <div
      className={cn(
        "flex",
        directionClass,
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  padding?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
};

const paddingClasses = {
  xs: "px-2 sm:px-3",
  sm: "px-3 sm:px-4",
  md: "px-4 sm:px-6",
  lg: "px-6 sm:px-8",
};

/**
 * Responsive container component with max-width and padding
 * @example
 * <ResponsiveContainer size="lg" padding="md">
 *   {children}
 * </ResponsiveContainer>
 */
export function ResponsiveContainer({
  children,
  size = "lg",
  padding = "md",
  className,
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        sizeClasses[size],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
