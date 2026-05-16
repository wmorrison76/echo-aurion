// File: src/components/EchoCore/components/theme/DashboardThemeContext.jsx
import React, { createContext, useContext, useState } from "react";

// [TEAM LOG: Theme] - Provides theme state (light/dark) and accent gradients
const DashboardThemeContext = createContext();

export function DashboardThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [gradient, setGradient] = useState("from-blue-500 to-purple-500");

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const updateGradient = (newGradient) => setGradient(newGradient);

  return (
    <DashboardThemeContext.Provider value={{ isDarkMode, toggleTheme, gradient, updateGradient }}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export const useDashboardTheme = () => useContext(DashboardThemeContext);
