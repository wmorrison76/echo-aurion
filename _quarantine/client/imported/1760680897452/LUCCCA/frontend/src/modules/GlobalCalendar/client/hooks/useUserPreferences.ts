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
  autoSave: boolean;
  autoSaveInterval: 30 | 60 | 120; // seconds
  
  // Search preferences
  recentSearches: string[];
  searchHistory: Array<{
    query: string;
    timestamp: Date;
    results: number;
  }>;
  maxRecentSearches: number;
  
  // Dashboard preferences
  dashboardLayout: 'grid' | 'list';
  widgetOrder: string[];
  hiddenWidgets: string[];
  refreshInterval: 30 | 60 | 300; // seconds
  
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

// Type-safe localStorage functions
const getStoredPreferences = (): Partial<UserPreferences> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const parsed = JSON.parse(stored);
    
    // Convert date strings back to Date objects
    if (parsed.searchHistory) {
      parsed.searchHistory = parsed.searchHistory.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
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

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const stored = getStoredPreferences();
    return { ...defaultPreferences, ...stored };
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    setStoredPreferences(preferences);
  }, [preferences]);

  // Apply theme changes to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    root.classList.remove('light', 'dark');
    if (preferences.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(systemDark ? 'dark' : 'light');
    } else {
      root.classList.add(preferences.theme);
    }
    
    // Accent color
    root.classList.remove('accent-blue', 'accent-purple', 'accent-green', 'accent-orange');
    root.classList.add(`accent-${preferences.accentColor}`);
    
    // Accessibility
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
    
    // Font size
    root.classList.remove('font-small', 'font-normal', 'font-large');
    root.classList.add(`font-${preferences.fontSize}`);
    
    // Animations
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
    preferences.animationsEnabled
  ]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Update multiple preferences at once
  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  // Reset a specific category
  const resetCategory = useCallback((category: keyof typeof preferencesCategories) => {
    const categoryKeys = preferencesCategories[category];
    const categoryDefaults = Object.keys(defaultPreferences)
      .filter(key => categoryKeys.includes(key as keyof UserPreferences))
      .reduce((acc, key) => ({
        ...acc,
        [key]: defaultPreferences[key as keyof UserPreferences]
      }), {});
    
    updatePreferences(categoryDefaults);
  }, [updatePreferences]);

  // Add to search history
  const addSearchHistory = useCallback((query: string, results: number) => {
    const newEntry = {
      query,
      timestamp: new Date(),
      results
    };
    
    setPreferences(prev => ({
      ...prev,
      searchHistory: [newEntry, ...prev.searchHistory.slice(0, 49)] // Keep last 50
    }));
  }, []);

  // Add recent search
  const addRecentSearch = useCallback((query: string) => {
    setPreferences(prev => ({
      ...prev,
      recentSearches: [
        query,
        ...prev.recentSearches
          .filter(search => search !== query)
          .slice(0, prev.maxRecentSearches - 1)
      ]
    }));
  }, []);

  // Toggle sidebar expanded state
  const toggleSidebar = useCallback(() => {
    updatePreference('sidebarExpanded', !preferences.sidebarExpanded);
  }, [preferences.sidebarExpanded, updatePreference]);

  // Export preferences (for backup/sharing)
  const exportPreferences = useCallback(() => {
    const dataStr = JSON.stringify(preferences, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `hospitality-crm-preferences-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [preferences]);

  // Import preferences
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

  // Get preference by key with type safety
  const getPreference = useCallback(<K extends keyof UserPreferences>(
    key: K
  ): UserPreferences[K] => {
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

// Categories for organized preference management
export const preferencesCategories = {
  layout: ['sidebarExpanded', 'defaultView', 'sidebarAutoCollapse', 'compactMode'] as const,
  theme: ['theme', 'accentColor', 'reducedMotion', 'highContrast', 'fontSize'] as const,
  notifications: ['notifications', 'soundEffects', 'desktopNotifications', 'emailNotifications', 'notificationFrequency'] as const,
  view: ['tablePageSize', 'defaultSortOrder', 'showAvatars', 'showTooltips', 'autoSave', 'autoSaveInterval'] as const,
  search: ['recentSearches', 'searchHistory', 'maxRecentSearches'] as const,
  dashboard: ['dashboardLayout', 'widgetOrder', 'hiddenWidgets', 'refreshInterval'] as const,
  advanced: ['developerMode', 'betaFeatures', 'analytics', 'debugMode'] as const,
  ai: ['aiSuggestionsEnabled', 'aiConfidenceThreshold', 'echoMonitoring', 'aiPersonalization'] as const,
  collaboration: ['showPresence', 'allowCollaboration', 'shareAnalytics', 'mentionNotifications'] as const,
  performance: ['animationsEnabled', 'preloadData', 'offlineMode', 'compressionEnabled'] as const,
};

// Type helper for category keys
export type PreferenceCategory = keyof typeof preferencesCategories;

export default useUserPreferences;
