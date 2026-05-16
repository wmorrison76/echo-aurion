/**
 * Responsive Design Utilities
 * 
 * Provides utilities for responsive design across all modules
 * Standardizes breakpoints and responsive behavior
 */

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Responsive classes helper
 * Returns appropriate classes based on screen size
 */
export function responsiveClasses(classes: {
  default?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  "2xl"?: string;
}): string {
  const base = classes.default || "";
  const sm = classes.sm ? `sm:${classes.sm}` : "";
  const md = classes.md ? `md:${classes.md}` : "";
  const lg = classes.lg ? `lg:${classes.lg}` : "";
  const xl = classes.xl ? `xl:${classes.xl}` : "";
  const xl2xl = classes["2xl"] ? `2xl:${classes["2xl"]}` : "";

  return [base, sm, md, lg, xl, xl2xl].filter(Boolean).join(" ");
}

/**
 * Responsive grid columns
 */
export function responsiveGrid(cols: {
  default: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  "2xl"?: number;
}): string {
  const gridCols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    12: "grid-cols-12",
  };

  const classes = [
    gridCols[cols.default] || `grid-cols-${cols.default}`,
    cols.sm ? `sm:${gridCols[cols.sm] || `grid-cols-${cols.sm}`}` : "",
    cols.md ? `md:${gridCols[cols.md] || `grid-cols-${cols.md}`}` : "",
    cols.lg ? `lg:${gridCols[cols.lg] || `grid-cols-${cols.lg}`}` : "",
    cols.xl ? `xl:${gridCols[cols.xl] || `grid-cols-${cols.xl}`}` : "",
    cols["2xl"] ? `2xl:${gridCols[cols["2xl"]] || `grid-cols-${cols["2xl"]}`}` : "",
  ].filter(Boolean);

  return `grid ${classes.join(" ")}`;
}

/**
 * Responsive padding
 */
export function responsivePadding(size: {
  default?: "sm" | "md" | "lg" | "xl";
  sm?: "sm" | "md" | "lg" | "xl";
  md?: "sm" | "md" | "lg" | "xl";
  lg?: "sm" | "md" | "lg" | "xl";
  xl?: "sm" | "md" | "lg" | "xl";
}): string {
  const paddingMap: Record<string, string> = {
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  };

  const classes = [
    size.default ? paddingMap[size.default] : "",
    size.sm ? `sm:${paddingMap[size.sm]}` : "",
    size.md ? `md:${paddingMap[size.md]}` : "",
    size.lg ? `lg:${paddingMap[size.lg]}` : "",
    size.xl ? `xl:${paddingMap[size.xl]}` : "",
  ].filter(Boolean);

  return classes.join(" ");
}

/**
 * Responsive text size
 */
export function responsiveText(size: {
  default?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  sm?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  md?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  lg?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  xl?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
}): string {
  const textMap: Record<string, string> = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
  };

  const classes = [
    size.default ? textMap[size.default] : "",
    size.sm ? `sm:${textMap[size.sm]}` : "",
    size.md ? `md:${textMap[size.md]}` : "",
    size.lg ? `lg:${textMap[size.lg]}` : "",
    size.xl ? `xl:${textMap[size.xl]}` : "",
  ].filter(Boolean);

  return classes.join(" ");
}

/**
 * Check if current screen size matches breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === "undefined") return false;
  
  const width = window.innerWidth;
  return width >= breakpoints[breakpoint];
}
