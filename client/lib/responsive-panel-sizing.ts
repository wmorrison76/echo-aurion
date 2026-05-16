/**
 * Responsive Panel Sizing System
 * Automatically adjusts panel sizes based on viewport dimensions
 * Ensures balanced appearance on 13" laptops to 4K monitors
 */

export interface ResponsiveSize {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

/**
 * Calculate responsive panel sizes based on current viewport
 * Uses percentage-based approach for monitor-aware sizing
 */
export function calculateResponsiveSize(
  panelId: string,
  baseWidth: number,
  baseHeight: number,
): ResponsiveSize {
  const viewport = getViewportDimensions();

  // Calculate responsive width: 60-90% of available width
  // On small screens (13"): ~60%, on large screens: ~80%
  const widthRatio = getWidthRatio(viewport.width);
  const responsiveWidth = Math.round(viewport.width * widthRatio);

  // Calculate responsive height: 65-90% of available height  
  // On small screens: ~65%, on large screens: ~85%
  const heightRatio = getHeightRatio(viewport.height);
  const responsiveHeight = Math.round(viewport.height * heightRatio);

  // Apply scale factor based on base sizes vs viewport
  const scaleWidth = responsiveWidth / baseWidth;
  const scaleHeight = responsiveHeight / baseHeight;
  const scale = Math.min(scaleWidth, scaleHeight); // Use smaller scale to fit

  // Calculate final size with constraints
  const finalWidth = Math.round(baseWidth * Math.min(scale, 1.2)); // Max 20% growth
  const finalHeight = Math.round(baseHeight * Math.min(scale, 1.2));

  return {
    width: Math.max(finalWidth, 400), // Min width
    height: Math.max(finalHeight, 300), // Min height
    minWidth: 400,
    minHeight: 300,
    maxWidth: Math.round(viewport.width * 0.95), // 95% of viewport
    maxHeight: Math.round(viewport.height * 0.95),
  };
}

/**
 * Get optimal width ratio based on viewport width
 * 13" laptop (1024-1440px) -> 60%, 4K (2560+px) -> 85%
 */
function getWidthRatio(viewportWidth: number): number {
  if (viewportWidth < 768) return 0.95; // Mobile: full width
  if (viewportWidth < 1024) return 0.85; // Tablet
  if (viewportWidth < 1440) return 0.70; // 13" laptop
  if (viewportWidth < 1920) return 0.75; // 15-17" laptop
  if (viewportWidth < 2560) return 0.80; // 1080p desktop
  return 0.85; // 4K and above
}

/**
 * Get optimal height ratio based on viewport height
 * Ensures panels don't fill entire height, leaving room for other UI
 */
function getHeightRatio(viewportHeight: number): number {
  if (viewportHeight < 720) return 0.85; // Small: 85%
  if (viewportHeight < 1080) return 0.75; // Standard: 75%
  if (viewportHeight < 1440) return 0.80; // 1440p: 80%
  return 0.85; // 1600p+: 85%
}

/**
 * Get current viewport dimensions (excluding scrollbars)
 */
function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === "undefined") {
    return { width: 1280, height: 720 }; // Server-side fallback
  }

  return {
    width: Math.max(window.innerWidth, 1024),
    height: Math.max(window.innerHeight, 720),
  };
}

/**
 * Generate panel size presets for different viewport breakpoints
 * Useful for initial panel positioning
 */
export function getPanelSizePresets(panelId: string) {
  const viewport = getViewportDimensions();

  return {
    small: { width: 500, height: 400 }, // 13" laptop, minimized
    medium: { width: 800, height: 600 }, // Standard desktop
    large: { width: 1200, height: 800 }, // Large monitor
    xlarge: { width: 1600, height: 900 }, // 4K monitor
    responsive: calculateResponsiveSize(panelId, 800, 600), // Dynamic
  };
}

/**
 * Hook for responsive sizing - returns current responsive size
 * Updates on window resize
 */
export function useResponsiveSize(baseWidth: number, baseHeight: number) {
  const [size, setSize] = React.useState(() =>
    calculateResponsiveSize("", baseWidth, baseHeight),
  );

  React.useEffect(() => {
    const handleResize = () => {
      setSize(calculateResponsiveSize("", baseWidth, baseHeight));
    };

    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 300);
    };

    window.addEventListener("resize", debouncedResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", debouncedResize);
    };
  }, [baseWidth, baseHeight]);

  return size;
}

// Import React for the hook
import React from "react";
