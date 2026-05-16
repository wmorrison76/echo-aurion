/**
 * Theme System
 * Manages light/dark theme support and customization
 * Week 12 Implementation
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

const LIGHT_THEME: Theme = {
  mode: 'light',
  colors: {
    primary: '#1e3a8a',
    secondary: '#64748b',
    accent: '#06b6d4',
    background: '#f9fafb',
    surface: '#ffffff',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      disabled: '#d1d5db',
    },
    border: '#e5e7eb',
  },
};

const DARK_THEME: Theme = {
  mode: 'dark',
  colors: {
    primary: '#60a5fa',
    secondary: '#cbd5e1',
    accent: '#06b6d4',
    background: '#0f172a',
    surface: '#1e293b',
    error: '#f87171',
    success: '#34d399',
    warning: '#fbbf24',
    info: '#60a5fa',
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
      disabled: '#64748b',
    },
    border: '#334155',
  },
};

export class ThemeManager {
  private currentMode: ThemeMode = 'system';
  private prefersDark: boolean = this.getSystemPreference();
  private listeners: Set<(theme: Theme) => void> = new Set();

  constructor() {
    // Load saved preference
    const saved = localStorage.getItem('theme-mode');
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      this.currentMode = saved as ThemeMode;
    }

    // Listen for system preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.prefersDark = e.matches;
        if (this.currentMode === 'system') {
          this.notifyListeners();
        }
      });
    }

    // Apply initial theme
    this.applyTheme();
  }

  /**
   * Get current active theme
   */
  getCurrentTheme(): Theme {
    if (this.currentMode === 'system') {
      return this.prefersDark ? DARK_THEME : LIGHT_THEME;
    }
    return this.currentMode === 'dark' ? DARK_THEME : LIGHT_THEME;
  }

  /**
   * Set theme mode
   */
  setThemeMode(mode: ThemeMode): void {
    this.currentMode = mode;
    localStorage.setItem('theme-mode', mode);
    this.applyTheme();
    this.notifyListeners();
  }

  /**
   * Get theme mode
   */
  getThemeMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Toggle between light and dark
   */
  toggleTheme(): void {
    const theme = this.getCurrentTheme();
    this.setThemeMode(theme.mode === 'light' ? 'dark' : 'light');
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Private: Apply theme to document
   */
  private applyTheme(): void {
    const theme = this.getCurrentTheme();
    const root = document.documentElement;

    // Set CSS variables
    const colors = theme.colors;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-info', colors.info);
    root.style.setProperty('--color-text-primary', colors.text.primary);
    root.style.setProperty('--color-text-secondary', colors.text.secondary);
    root.style.setProperty('--color-text-disabled', colors.text.disabled);
    root.style.setProperty('--color-border', colors.border);

    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', theme.mode);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.primary);
    }

    // Update body background
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.text.primary;
  }

  /**
   * Private: Get system preference
   */
  private getSystemPreference(): boolean {
    if (!window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Private: Notify listeners
   */
  private notifyListeners(): void {
    const theme = this.getCurrentTheme();
    this.listeners.forEach((listener) => listener(theme));
  }
}

// Export singleton
export const themeManager = new ThemeManager();

/**
 * React Hook for theme
 */
export function useTheme() {
  const [theme, setTheme] = React.useState(themeManager.getCurrentTheme());

  React.useEffect(() => {
    const unsubscribe = themeManager.subscribe(setTheme);
    return unsubscribe;
  }, []);

  return {
    theme,
    setThemeMode: (mode: ThemeMode) => themeManager.setThemeMode(mode),
    toggleTheme: () => themeManager.toggleTheme(),
    getMode: () => themeManager.getThemeMode(),
  };
}
