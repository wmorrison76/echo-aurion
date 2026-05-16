/**
 * Hook: useResponsivePanelContent
 * Makes panel content automatically responsive to panel resizing
 * Provides container dimensions that scale with panel size
 */

import { useEffect, useRef, useState } from "react";

export interface ResponsiveContentDimensions {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isCompact: boolean; // Width < 600px
  isNormal: boolean; // Width 600-1000px
  isExpanded: boolean; // Width > 1000px
  scale: number; // Content scale factor (0.8 - 1.2)
}

/**
 * Hook that provides responsive dimensions based on parent container
 * Automatically updates when container resizes
 */
export function useResponsivePanelContent(
  containerRef?: React.RefObject<HTMLDivElement>,
): ResponsiveContentDimensions {
  const [dimensions, setDimensions] = useState<ResponsiveContentDimensions>({
    width: 800,
    height: 600,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isCompact: false,
    isNormal: true,
    isExpanded: false,
    scale: 1,
  });

  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const element = containerRef?.current;
    if (!element) return;

    // Create ResizeObserver to watch for container size changes
    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        // Calculate responsive properties
        const isMobile = width < 480;
        const isTablet = width >= 480 && width < 768;
        const isDesktop = width >= 768;

        const isCompact = width < 600;
        const isNormal = width >= 600 && width < 1000;
        const isExpanded = width >= 1000;

        // Calculate content scale based on width
        // Small panels (400px) = 0.8x scale
        // Medium panels (800px) = 1.0x scale
        // Large panels (1200px+) = 1.1x scale
        let scale = 1;
        if (width < 500) scale = 0.8;
        else if (width < 700) scale = 0.9;
        else if (width < 900) scale = 1;
        else if (width < 1200) scale = 1.05;
        else scale = 1.1;

        setDimensions({
          width: Math.round(width),
          height: Math.round(height),
          isMobile,
          isTablet,
          isDesktop,
          isCompact,
          isNormal,
          isExpanded,
          scale,
        });
      }
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [containerRef]);

  return dimensions;
}

/**
 * Hook for responsive text sizing
 * Scales text based on available width
 */
export function useResponsiveTextSize(baseSize: number = 16) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = useResponsivePanelContent(containerRef);

  return {
    containerRef,
    fontSize: Math.round(baseSize * dims.scale),
    lineHeight: Math.round(baseSize * dims.scale * 1.5),
    headingSize: Math.round(baseSize * dims.scale * 1.5),
  };
}

/**
 * Hook for responsive spacing
 * Scales padding/margins based on panel width
 */
export function useResponsiveSpacing(baseSpacing: number = 16) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = useResponsivePanelContent(containerRef);

  return {
    containerRef,
    padding: Math.round(baseSpacing * dims.scale),
    gap: Math.round(baseSpacing * dims.scale * 0.75),
    margin: Math.round(baseSpacing * dims.scale),
  };
}

/**
 * Hook for responsive grid layout
 * Automatically adjusts grid columns based on width
 */
export function useResponsiveGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dims = useResponsivePanelContent(containerRef);

  let columns = 1;
  if (dims.isCompact) columns = 1;
  else if (dims.isNormal && dims.width < 800) columns = 1;
  else if (dims.isNormal) columns = 2;
  else columns = 3;

  return {
    containerRef,
    columns,
    gap: Math.round(16 * dims.scale),
  };
}
