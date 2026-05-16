import { useState, useEffect, useCallback } from 'react';

export interface UserPreferences {
  // Layout preferences
  sidebarExpanded: boolean;
  defaultView: 'my-work' | 'team-overview' | 'active-events' | 'analytics-view' | 'admin-panel';
  sidebarAutoCollapse: boolean;
  compactMode: boolean;
  // Theme preferences
  theme: 'light' | 'dark' | 'system';
  accentColor: 'blue' | 'purple' | 'green' | 'orange';
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'normal' | 'large';
  // Notification preferences
  notifications: boolean;
  soundEffects: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  notificationFrequency: 'immediate' | 'hourly' | 'daily';
  // View preferences
  tablePageSize: 10 | 25 | 50 | 100;
  defaultSortOrder: 'asc' | 'desc';
  showAvatars: boolean;
  showTooltips: boolean;
  showHelpButton: boolean;
  autoSave: boolean;
  autoSaveInterval: 30 | 60 | 120;
  // Search preferences
  recentSearches: string[];
  searchHistory: Array<{ query: string; timestamp: Date; results: number }>;
  maxRecentSearches: number;
  // Dashboard preferences
  dashboardLayout: 'grid' | 'list';
  widgetOrder: string[];
  hiddenWidgets: string[];
  collapsedWidgets: string[];
  refreshInterval: 30 | 60 | 300;
  // Advanced preferences
  developerMode: boolean;
  betaFeatures: boolean;
  analytics: boolean;
  debugMode: boolean;
  // AI preferences
  aiSuggestionsEnabled: boolean;
  aiConfidenceThreshold: number;
  echoMonitoring: boolean;
  aiPersonalization: boolean;
  // Collaboration preferences
  showPresence: boolean;
  allowCollaboration: boolean;
  shareAnalytics: boolean;
  mentionNotifications: boolean;
  // Performance preferences
  animationsEnabled: boolean;
  preloadData: boolean;
  offlineMode: boolean;
  compressionEnabled: boolean;
}

const defaultPreferences: UserPreferences = {
  // Layout
  sidebarExpanded: false,
  defaultView: 'my-work',
  sidebarAutoCollapse: true,
  compactMode: false,
  // Theme
  theme: 'dark',
  accentColor: 'blue',
  reducedMotion: false,
  highContrast: false,
  fontSize: 'normal',
  // Notifications
  notifications: true,
  soundEffects: false,
  desktopNotifications: true,
  emailNotifications: true,
  notificationFrequency: 'immediate',
  // View
  tablePageSize: 25,
  defaultSortOrder: 'desc',
  showAvatars: true,
  showTooltips: true,
  showHelpButton: true,
  autoSave: true,
  autoSaveInterval: 30,
  // Search
  recentSearches: [],
  searchHistory: [],
  maxRecentSearches: 5,
  // Dashboard
  dashboardLayout: 'grid',
  widgetOrder: ['overview', 'events', 'revenue', 'team'],
  hiddenWidgets: [],
  collapsedWidgets: [],
  refreshInterval: 60,
  // Advanced
  developerMode: false,
  betaFeatures: false,
  analytics: true,
  debugMode: false,
  // AI
  aiSuggestionsEnabled: true,
  aiConfidenceThreshold: 0.8,
  echoMonitoring: true,
  aiPersonalization: true,
  // Collaboration
  showPresence: true,
  allowCollaboration: true,
  shareAnalytics: false,
  mentionNotifications: true,
  // Performance
  animationsEnabled: true,
  preloadData: true,
  offlineMode: false,
  compressionEnabled: true,
};

const STORAGE_KEY = 'hospitality-crm-preferences';

const getStoredPreferences = (): Partial<UserPreferences> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (parsed.searchHistory) {
      parsed.searchHistory = parsed.searchHistory.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to load user preferences:', error);
    return {};
  }
};

const setStoredPreferences = (preferences: UserPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save user preferences:', error);
  }
};

export const preferencesCategories = {
  layout: ['sidebarExpanded', 'defaultView', 'sidebarAutoCollapse', 'compactMode'] as const,
  theme: ['theme', 'accentColor', 'reducedMotion', 'highContrast', 'fontSize'] as const,
  notifications: ['notifications', 'soundEffects', 'desktopNotifications', 'emailNotifications', 'notificationFrequency'] as const,
  view: ['tablePageSize', 'defaultSortOrder', 'showAvatars', 'showTooltips', 'showHelpButton', 'autoSave', 'autoSaveInterval'] as const,
  search: ['recentSearches', 'searchHistory', 'maxRecentSearches'] as const,
  dashboard: ['dashboardLayout', 'widgetOrder', 'hiddenWidgets', 'collapsedWidgets', 'refreshInterval'] as const,
  advanced: ['developerMode', 'betaFeatures', 'analytics', 'debugMode'] as const,
  ai: ['aiSuggestionsEnabled', 'aiConfidenceThreshold', 'echoMonitoring', 'aiPersonalization'] as const,
  collaboration: ['showPresence', 'allowCollaboration', 'shareAnalytics', 'mentionNotifications'] as const,
  performance: ['animationsEnabled', 'preloadData', 'offlineMode', 'compressionEnabled'] as const,
};

export type PreferenceCategory = keyof typeof preferencesCategories;

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const stored = getStoredPreferences();
    return { ...defaultPreferences, ...stored };
  });

  useEffect(() => {
    setStoredPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (preferences.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(preferences.theme);
    }
    root.classList.remove('accent-blue', 'accent-purple', 'accent-green', 'accent-orange');
    root.classList.add(`accent-${preferences.accentColor}`);
    if (preferences.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    root.classList.remove('font-small', 'font-normal', 'font-large');
    root.classList.add(`font-${preferences.fontSize}`);
    if (!preferences.animationsEnabled) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }
  }, [
    preferences.theme,
    preferences.accentColor,
    preferences.reducedMotion,
    preferences.highContrast,
    preferences.fontSize,
    preferences.animationsEnabled,
  ]);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  const resetCategory = useCallback((category: keyof typeof preferencesCategories) => {
    const categoryKeys = preferencesCategories[category] as readonly (keyof UserPreferences)[];
    const categoryDefaults = Object.keys(defaultPreferences)
      .filter(key => categoryKeys.includes(key as keyof UserPreferences))
      .reduce((acc, key) => ({
        ...acc,
        [key]: defaultPreferences[key as keyof UserPreferences],
      }), {});
    updatePreferences(categoryDefaults);
  }, [updatePreferences]);

  const addSearchHistory = useCallback((query: string, results: number) => {
    const newEntry = { query, timestamp: new Date(), results };
    setPreferences(prev => ({
      ...prev,
      searchHistory: [newEntry, ...prev.searchHistory.slice(0, 49)],
    }));
  }, []);

  const addRecentSearch = useCallback((query: string) => {
    setPreferences(prev => ({
      ...prev,
      recentSearches: [
        query,
        ...prev.recentSearches.filter(search => search !== query).slice(0, prev.maxRecentSearches - 1),
      ],
    }));
  }, []);

  const toggleSidebar = useCallback(() => {
    updatePreference('sidebarExpanded', !preferences.sidebarExpanded);
  }, [preferences.sidebarExpanded, updatePreference]);

  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `hospitality-crm-preferences-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [preferences]);

  const importPreferences = useCallback((importedPreferences: Partial<UserPreferences>) => {
    try {
      const validatedPreferences = { ...defaultPreferences, ...importedPreferences };
      setPreferences(validatedPreferences);
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }, []);

  const getPreference = useCallback(<K extends keyof UserPreferences>(key: K): UserPreferences[K] => {
    return preferences[key];
  }, [preferences]);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    resetCategory,
    addSearchHistory,
    addRecentSearch,
    toggleSidebar,
    exportPreferences,
    importPreferences,
    getPreference,
  };
};

export default useUserPreferences;
