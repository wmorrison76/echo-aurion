import React, { createContext, useContext, useState, useEffect } from "react";
import { lightTheme, darkTheme, type Theme } from "../lib/theme";
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });
  const theme = isDark ? darkTheme : lightTheme;
  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--color-${key}`, value);
    });
  }, [isDark, theme]);
  const toggleTheme = () => setIsDark((prev) => !prev);
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {" "}
      {children}{" "}
    </ThemeContext.Provider>
  );
};
