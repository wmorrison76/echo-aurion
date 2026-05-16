/**
 * Theme Enforcement Utility
 * 
 * Ensures all modules use theme tokens instead of hardcoded colors
 * Provides utilities for consistent theme-aware styling
 */

/**
 * Get CSS variable value at runtime
 */
export function getThemeVar(variable: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
}

/**
 * Get theme color values
 */
export const themeColors = {
  background: () => getThemeVar('--background'),
  foreground: () => getThemeVar('--foreground'),
  primary: () => getThemeVar('--primary'),
  secondary: () => getThemeVar('--secondary'),
  muted: () => getThemeVar('--muted'),
  mutedForeground: () => getThemeVar('--muted-foreground'),
  accent: () => getThemeVar('--accent'),
  border: () => getThemeVar('--border'),
  card: () => getThemeVar('--card'),
  cardForeground: () => getThemeVar('--card-foreground'),
  destructive: () => getThemeVar('--destructive'),
  destructiveForeground: () => getThemeVar('--destructive-foreground'),
  success: () => getThemeVar('--success') || '#22c55e',
  warning: () => getThemeVar('--warning') || '#f59e0b',
} as const;

/**
 * Theme-aware inline styles helper
 * Use this when you MUST use inline styles (e.g., canvas, SVG)
 */
export function themeStyle(property: 'color' | 'backgroundColor' | 'borderColor' | 'fill' | 'stroke', token: keyof typeof themeColors): React.CSSProperties {
  return {
    [property]: themeColors[token](),
  } as React.CSSProperties;
}

/**
 * Check if a color string is a hardcoded hex/rgb value
 */
export function isHardcodedColor(color: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) || 
         /^rgb\(/i.test(color) || 
         /^rgba\(/i.test(color);
}

/**
 * Convert hardcoded color to theme token class
 */
export function colorToThemeClass(color: string, type: 'text' | 'bg' | 'border' = 'text'): string {
  // Common color mappings
  const colorMap: Record<string, string> = {
    // Dark colors -> foreground
    '#000000': type === 'text' ? 'text-foreground' : type === 'bg' ? 'bg-foreground' : 'border-foreground',
    '#0b0f14': type === 'text' ? 'text-foreground' : type === 'bg' ? 'bg-background' : 'border-border',
    '#121821': type === 'text' ? 'text-foreground' : type === 'bg' ? 'bg-surface' : 'border-border',
    // Light colors -> muted
    '#9aa7b1': type === 'text' ? 'text-muted-foreground' : type === 'bg' ? 'bg-muted' : 'border-muted',
    '#667080': type === 'text' ? 'text-muted-foreground' : type === 'bg' ? 'bg-muted' : 'border-muted',
    // Primary colors
    '#00d1ff': type === 'text' ? 'text-primary' : type === 'bg' ? 'bg-primary' : 'border-primary',
    '#0564ff': type === 'text' ? 'text-primary' : type === 'bg' ? 'bg-primary' : 'border-primary',
  };
  
  return colorMap[color.toLowerCase()] || (type === 'text' ? 'text-foreground' : type === 'bg' ? 'bg-background' : 'border-border');
}

/**
 * Theme-aware className builder
 * Ensures proper contrast and theme compliance
 */
export function buildThemeClasses(options: {
  text?: 'primary' | 'secondary' | 'muted' | 'accent' | 'destructive' | 'success' | 'warning';
  bg?: 'background' | 'surface' | 'card' | 'muted' | 'primary' | 'secondary' | 'accent';
  border?: 'default' | 'muted' | 'accent' | 'primary';
  hover?: boolean;
  focus?: boolean;
}): string {
  const classes: string[] = [];
  
  // Text colors with proper contrast
  if (options.text) {
    switch (options.text) {
      case 'primary':
        classes.push('text-foreground');
        break;
      case 'secondary':
        classes.push('text-muted-foreground');
        break;
      case 'muted':
        classes.push('text-muted-foreground opacity-70');
        break;
      case 'accent':
        classes.push('text-primary');
        break;
      case 'destructive':
        classes.push('text-destructive');
        break;
      case 'success':
        classes.push('text-green-500 dark:text-green-400');
        break;
      case 'warning':
        classes.push('text-yellow-500 dark:text-yellow-400');
        break;
    }
  }
  
  // Background colors
  if (options.bg) {
    switch (options.bg) {
      case 'background':
        classes.push('bg-background');
        break;
      case 'surface':
        classes.push('bg-surface');
        break;
      case 'card':
        classes.push('bg-card');
        break;
      case 'muted':
        classes.push('bg-muted');
        break;
      case 'primary':
        classes.push('bg-primary text-primary-foreground');
        break;
      case 'secondary':
        classes.push('bg-secondary text-secondary-foreground');
        break;
      case 'accent':
        classes.push('bg-accent text-accent-foreground');
        break;
    }
  }
  
  // Border colors
  if (options.border) {
    switch (options.border) {
      case 'default':
        classes.push('border-border');
        break;
      case 'muted':
        classes.push('border-muted');
        break;
      case 'accent':
        classes.push('border-primary/20');
        break;
      case 'primary':
        classes.push('border-primary');
        break;
    }
  }
  
  // Interactive states
  if (options.hover) {
    classes.push('hover:opacity-80 transition-opacity');
  }
  
  if (options.focus) {
    classes.push('focus:ring-2 focus:ring-primary focus:ring-offset-2');
  }
  
  return classes.join(' ');
}

/**
 * Ensure minimum contrast ratio for accessibility
 * Returns appropriate text class based on background
 */
export function ensureContrast(
  background: 'background' | 'surface' | 'card' | 'muted' | 'primary' | 'secondary',
  textType: 'primary' | 'secondary' = 'primary'
): string {
  const textClasses: Record<string, Record<string, string>> = {
    background: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
    },
    surface: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
    },
    card: {
      primary: 'text-card-foreground',
      secondary: 'text-muted-foreground',
    },
    muted: {
      primary: 'text-foreground',
      secondary: 'text-muted-foreground',
    },
    primary: {
      primary: 'text-primary-foreground',
      secondary: 'text-primary-foreground/80',
    },
    secondary: {
      primary: 'text-secondary-foreground',
      secondary: 'text-secondary-foreground/80',
    },
  };
  
  return textClasses[background]?.[textType] || 'text-foreground';
}

/**
 * Module wrapper class that ensures theme compliance
 */
export const MODULE_WRAPPER_CLASS = 'bg-background text-foreground min-h-full';

/**
 * Card component class with proper theme support
 */
export const CARD_CLASS = 'bg-card text-card-foreground border border-border rounded-lg shadow-sm';

/**
 * Input component class with proper theme support
 */
export const INPUT_CLASS = 'bg-background text-foreground border-border focus:border-primary focus:ring-primary';

/**
 * Button primary class
 */
export const BUTTON_PRIMARY_CLASS = 'bg-primary text-primary-foreground hover:opacity-90';

/**
 * Button secondary class
 */
export const BUTTON_SECONDARY_CLASS = 'bg-secondary text-secondary-foreground hover:opacity-90';

/**
 * Text hierarchy classes with proper contrast
 */
export const TEXT_CLASSES = {
  heading: 'text-foreground font-semibold',
  body: 'text-foreground',
  secondary: 'text-muted-foreground',
  muted: 'text-muted-foreground opacity-70',
  link: 'text-primary hover:underline',
  error: 'text-destructive',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
} as const;
