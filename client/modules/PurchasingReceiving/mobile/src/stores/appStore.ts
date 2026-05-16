import { create } from "zustand";
export interface AppSettings {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  offlineMode: boolean;
  languageCode: string;
  autoSyncInterval: number;
}
interface AppState {
  settings: AppSettings;
  isConnected: boolean;
  syncInProgress: boolean;
  lastSyncTime: number | null;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setConnectivity: (connected: boolean) => void;
  setSyncInProgress: (inProgress: boolean) => void;
  updateLastSyncTime: () => void;
}
const defaultSettings: AppSettings = {
  theme: "light",
  notificationsEnabled: true,
  offlineMode: false,
  languageCode: "en",
  autoSyncInterval: 300000,
};
export const useAppStore = create<AppState>((set) => ({
  settings: defaultSettings,
  isConnected: true,
  syncInProgress: false,
  lastSyncTime: null,
  updateSettings: (newSettings: Partial<AppSettings>) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  setConnectivity: (connected: boolean) => set({ isConnected: connected }),
  setSyncInProgress: (inProgress: boolean) =>
    set({ syncInProgress: inProgress }),
  updateLastSyncTime: () => set({ lastSyncTime: Date.now() }),
}));
