import { ExpoConfig, ConfigContext } from "@expo/config";
const config: ExpoConfig = {
  name: "Echo Recipe Pro",
  slug: "echo-recipe-pro",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTabletMode: true,
    bundleIdentifier: "com.echorecipepro.ios",
    buildNumber: "1",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.echorecipepro",
    versionCode: 1,
  },
  web: { favicon: "./assets/favicon.png", bundler: "metro" },
  plugins: [
    [
      "expo-build-properties",
      {
        android: { usesCleartextTraffic: true, compileSdkVersion: 34 },
        ios: { deploymentTarget: "13.0" },
      },
    ],
    ["expo-font"],
    ["expo-splash-screen"],
    ["expo-status-bar"],
  ],
  scheme: "echorecipepro",
  runtimeVersion: "1.0.0",
  updates: { fallbackToCacheTimeout: 0 },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    toastClientId: process.env.EXPO_PUBLIC_TOAST_CLIENT_ID,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    environment: process.env.NODE_ENV || "development",
  },
};
export default config;
