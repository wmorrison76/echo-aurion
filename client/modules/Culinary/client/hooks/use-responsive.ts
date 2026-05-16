import { useEffect, useState } from "react";

type BreakpointKey = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const breakpoints: Record<BreakpointKey, number> = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/**
 * Hook to detect current viewport size and breakpoint
 * @returns Object with current viewport info
 */
export function useResponsive() {
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
    breakpoint: "md" as BreakpointKey,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let breakpoint: BreakpointKey = "xl";
      if (width < breakpoints.sm) breakpoint = "xs";
      else if (width < breakpoints.md) breakpoint = "sm";
      else if (width < breakpoints.lg) breakpoint = "md";
      else if (width < breakpoints.xl) breakpoint = "lg";
      else if (width < breakpoints["2xl"]) breakpoint = "xl";
      else breakpoint = "2xl";

      setViewport({
        width,
        height,
        breakpoint,
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
      });
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return viewport;
}

/**
 * Hook to check if screen matches a specific breakpoint or larger
 * @param breakpoint - Breakpoint to check
 * @returns True if viewport is at least this breakpoint
 */
export function useBreakpoint(breakpoint: BreakpointKey): boolean {
  const viewport = useResponsive();
  return viewport.width >= breakpoints[breakpoint];
}

/**
 * Hook to check if device is mobile
 * @returns True if viewport is mobile size
 */
export function useIsMobile(): boolean {
  const viewport = useResponsive();
  return viewport.isMobile;
}

/**
 * Hook to check if device is tablet
 * @returns True if viewport is tablet size
 */
export function useIsTablet(): boolean {
  const viewport = useResponsive();
  return viewport.isTablet;
}

/**
 * Hook to check if device is desktop
 * @returns True if viewport is desktop size
 */
export function useIsDesktop(): boolean {
  const viewport = useResponsive();
  return viewport.isDesktop;
}
