/**
 * Theme Color Utilities
 * 
 * Utilities to get theme-aware colors dynamically from CSS variables
 * Ensures all modules use theme colors instead of hardcoded values
 */

/**
 * Get a CSS variable value
 */
export function getCSSVariable(variable: string, fallback?: string): string {
  if (typeof window === "undefined") return fallback || "";
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  
  return value || fallback || "";
}

/**
 * Get primary color from theme
 */
export function getPrimaryColor(): string {
  return getCSSVariable("--primary", "#00d1ff");
}

/**
 * Get secondary color from theme
 */
export function getSecondaryColor(): string {
  return getCSSVariable("--secondary", "#7c4dff");
}

/**
 * Get accent color from theme
 */
export function getAccentColor(): string {
  return getCSSVariable("--accent", "#ff6ad5");
}

/**
 * Get destructive color from theme
 */
export function getDestructiveColor(): string {
  return getCSSVariable("--destructive", "#ef4444");
}

/**
 * Get success color from theme
 */
export function getSuccessColor(): string {
  return getCSSVariable("--success", "#22c55e");
}

/**
 * Get warning color from theme
 */
export function getWarningColor(): string {
  return getCSSVariable("--warning", "#f59e0b");
}

/**
 * Check if dark mode is active
 */
export function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Get a palette of theme-aware colors for charts/visualizations
 */
export function getThemePalette(): string[] {
  const primary = getPrimaryColor();
  const secondary = getSecondaryColor();
  const accent = getAccentColor();
  const destructive = getDestructiveColor();
  const success = getSuccessColor();
  const warning = getWarningColor();
  const dark = isDarkMode();
  
  return [
    primary,
    secondary,
    accent,
    success,
    warning,
    destructive,
    dark ? "#fbbf24" : "#d97706", // Amber
    dark ? "#a78bfa" : "#7c3aed", // Purple
    dark ? "#f472b6" : "#db2777", // Pink
    dark ? "#06b6d4" : "#0891b2", // Cyan
  ];
}

/**
 * Get color with opacity for backgrounds
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
