// Environment configuration for cloud backend services

/**
 * Supabase Configuration
 */
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY || "",
};

/**
 * Toast POS Configuration
 */
export const toastConfig = {
  clientId: import.meta.env.VITE_TOAST_CLIENT_ID || "",
  clientSecret: import.meta.env.VITE_TOAST_CLIENT_SECRET || "",
  managementUrl: "https://api.toasttab.com",
  enabled: !!import.meta.env.VITE_TOAST_CLIENT_ID,
};

/**
 * USDA FoodData Configuration
 */
export const usdaConfig = {
  apiKey: import.meta.env.VITE_USDA_API_KEY || "",
  baseUrl: "https://fdc.nal.usda.gov/api",
  enabled: !!import.meta.env.VITE_USDA_API_KEY,
};

/**
 * Supplier API Credentials Configuration
 */
export const supplierConfig = {
  sysco: {
    apiKey: import.meta.env.VITE_SYSCO_API_KEY || "",
    apiSecret: import.meta.env.VITE_SYSCO_API_SECRET || "",
    customerId: import.meta.env.VITE_SYSCO_CUSTOMER_ID || "",
    enabled: !!import.meta.env.VITE_SYSCO_API_KEY,
  },
  usfoods: {
    apiKey: import.meta.env.VITE_USFOODS_API_KEY || "",
    customerId: import.meta.env.VITE_USFOODS_CUSTOMER_ID || "",
    enabled: !!import.meta.env.VITE_USFOODS_API_KEY,
  },
  gfs: {
    apiKey: import.meta.env.VITE_GFS_API_KEY || "",
    customerId: import.meta.env.VITE_GFS_CUSTOMER_ID || "",
    enabled: !!import.meta.env.VITE_GFS_API_KEY,
  },
};

/**
 * Firebase Configuration (optional alternative to Supabase)
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  enabled: !!import.meta.env.VITE_FIREBASE_API_KEY,
};

/**
 * Analytics Configuration
 */
export const analyticsConfig = {
  enabled: import.meta.env.VITE_ANALYTICS_ENABLED === "true",
  googleAnalyticsId: import.meta.env.VITE_GOOGLE_ANALYTICS_ID || "",
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || "",
};

/**
 * App Configuration
 */
export const appConfig = {
  environment: import.meta.env.MODE || "development",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  appVersion: "1.0.0",
  supportEmail: "support@echorecipepro.com",
  maxFileUploadSize: 50 * 1024 * 1024, // 50MB
  cacheTTL: 3600000, // 1 hour
};

/**
 * Feature Flags
 */
export const featureFlags = {
  cloudSync: true,
  posIntegration: !!toastConfig.enabled,
  supplierAPIs: !!(supplierConfig.sysco.enabled || supplierConfig.usfoods.enabled || supplierConfig.gfs.enabled),
  usdaNutrition: !!usdaConfig.enabled,
  advancedReporting: true,
  commandPalette: true,
  keyboardShortcuts: true,
  mobileApp: false, // Coming soon
  aiAssistant: false, // Coming soon
  advancedAnalytics: true,
  customBranding: true,
};

/**
 * Validate required configuration
 */
export function validateConfiguration(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check critical services
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    errors.push("Supabase configuration is missing");
  }

  // Check optional services with warnings
  if (!toastConfig.clientId) {
    warnings.push("Toast POS integration is not configured");
  }

  if (!usdaConfig.apiKey) {
    warnings.push("USDA nutrition database is not configured");
  }

  if (
    !supplierConfig.sysco.enabled &&
    !supplierConfig.usfoods.enabled &&
    !supplierConfig.gfs.enabled
  ) {
    warnings.push("No supplier APIs are configured");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get feature availability
 */
export function getFeatureAvailability() {
  return {
    cloudSync: featureFlags.cloudSync && supabaseConfig.url,
    posIntegration: featureFlags.posIntegration && toastConfig.enabled,
    supplierAPIs: featureFlags.supplierAPIs && (
      supplierConfig.sysco.enabled ||
      supplierConfig.usfoods.enabled ||
      supplierConfig.gfs.enabled
    ),
    usdaNutrition: featureFlags.usdaNutrition && usdaConfig.enabled,
    advancedReporting: featureFlags.advancedReporting,
    commandPalette: featureFlags.commandPalette,
    keyboardShortcuts: featureFlags.keyboardShortcuts,
  };
}

/**
 * Log configuration status (development only)
 */
export function logConfigurationStatus() {
  if (appConfig.isDevelopment) {
    console.log("=== Echo Recipe Pro Configuration ===");
    console.log("Environment:", appConfig.environment);
    console.log("API Base URL:", appConfig.apiBaseUrl);
    console.log("Supabase:", supabaseConfig.url ? "✓" : "✗");
    console.log("Toast POS:", toastConfig.enabled ? "✓" : "✗");
    console.log("USDA Nutrition:", usdaConfig.enabled ? "✓" : "✗");
    console.log("Features:", getFeatureAvailability());
    console.log("====================================");
  }
}
