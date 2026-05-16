import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';
export type ColorScheme = 'cyan' | 'blue' | 'emerald' | 'violet' | 'rose';

interface UseThemeReturn {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}

const colorSchemes: ColorScheme[] = ['cyan', 'blue', 'emerald', 'violet', 'rose'];
const themes: Theme[] = ['light', 'dark'];

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('cyan');
  const [mounted, setMounted] = useState(false);

  // Load from localStorage and system preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedScheme = localStorage.getItem('colorScheme') as ColorScheme | null;

    if (savedTheme && themes.includes(savedTheme)) {
      setThemeState(savedTheme);
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(isDark ? 'dark' : 'light');
    }

    if (savedScheme && colorSchemes.includes(savedScheme)) {
      setColorSchemeState(savedScheme);
    }

    setMounted(true);
  }, []);

  // Apply theme to DOM
  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;

    // Remove old theme classes
    root.classList.remove('light', 'dark');
    // Add new theme class
    root.classList.add(newTheme);

    // Update body
    if (newTheme === 'dark') {
      root.style.colorScheme = 'dark';
    } else {
      root.style.colorScheme = 'light';
    }

    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  }, []);

  // Apply color scheme to DOM
  const applyColorScheme = useCallback((scheme: ColorScheme) => {
    const root = document.documentElement;

    // Remove old scheme classes
    colorSchemes.forEach((s) => root.classList.remove(`scheme-${s}`));
    // Add new scheme class
    root.classList.add(`scheme-${scheme}`);

    localStorage.setItem('colorScheme', scheme);
    setColorSchemeState(scheme);
  }, []);

  // Apply initial theme if mounted
  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
      applyColorScheme(colorScheme);
    }
  }, [mounted, applyTheme, applyColorScheme, theme, colorScheme]);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, applyTheme]);

  return {
    theme,
    colorScheme,
    setTheme: applyTheme,
    setColorScheme: applyColorScheme,
    toggleTheme,
  };
}
