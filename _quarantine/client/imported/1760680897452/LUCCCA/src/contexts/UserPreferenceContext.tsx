// src/context/UserPreferenceContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

// Define the shape of your preference object
interface UserPreferences {
  darkMode: boolean;
  sidebarOpen: boolean;
  language: string;
  accountType: "basic" | "pro" | "enterprise";
  [key: string]: any;
}

interface PreferenceContextType {
  preferences: UserPreferences;
  updatePreference: (key: string, value: any) => void;
  loadModulePreferences: (module: string) => void;
}

const defaultPreferences: UserPreferences = {
  darkMode: false,
  sidebarOpen: true,
  language: "en",
  accountType: "basic",
};

const PreferenceContext = createContext<PreferenceContextType | undefined>(undefined);

export const UserPreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  const updatePreference = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const loadModulePreferences = (module: string) => {
    // Optional: dynamically fetch or hydrate preferences for that module
    if (module === "Whiteboard") {
      setPreferences(prev => ({
        ...prev,
        whiteboardLayout: "grid",
        snapToGrid: true,
      }));
    }

    if (module === "EchoStratus" && preferences.accountType === "enterprise") {
      import("@/preferences/stratusDefaults").then(mod => {
        setPreferences(prev => ({ ...prev, ...mod.defaults }));
      });
    }
  };

  useEffect(() => {
    // You can load from localStorage or an API here
    const storedPrefs = localStorage.getItem("user-preferences");
    if (storedPrefs) {
      setPreferences(JSON.parse(storedPrefs));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("user-preferences", JSON.stringify(preferences));
  }, [preferences]);

  return (
    <PreferenceContext.Provider value={{ preferences, updatePreference, loadModulePreferences }}>
      {children}
    </PreferenceContext.Provider>
  );
};

export const useUserPreferences = (): PreferenceContextType => {
  const context = useContext(PreferenceContext);
  if (!context) {
    throw new Error("useUserPreferences must be used within a UserPreferenceProvider");
  }
  return context;
};
