import React from "react";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
const STORAGE_KEY = "echoaurum-theme";
type Theme = "light" | "dark";
type ThemeContextValue = {
  theme: Theme;
  setTheme: (value: Theme) => void;
  toggleTheme: () => void;
};
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersLight = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: light)").matches
    : false;
  return prefersLight ? "light" : "dark";
}
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "dark") {
    root.classList.add("dark");
  }
  root.dataset.theme = theme;
}
function persistTheme(theme: Theme) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
}
export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = getInitialTheme();
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      if (initial === "dark") {
        root.classList.add("dark");
      }
      root.dataset.theme = initial;
    }
    return initial;
  });
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const listener = (event: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        return;
      }
      setThemeState(event.matches ? "light" : "dark");
    };
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);
  const setTheme = useCallback((value: Theme) => {
    persistTheme(value);
    setThemeState(value);
  }, []);
  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);
  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
