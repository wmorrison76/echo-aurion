/**
 * Hospitality OS Mobile App
 * ─────────────────────────
 * React Native iOS/Android app with offline support, real-time sync,
 * and local SQLite caching for operations teams.
 *
 * FEATURES:
 * - Shift management and time tracking
 * - Real-time order/POS updates
 * - Inventory tracking and scanning
 * - Push notifications for alerts
 * - Offline-first architecture
 * - LocalDB (SQLite) with automatic sync
 */

import React, { useEffect, useState } from "react";
import { NavigationContainer, NavigationProp } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator,
  View,
  Text,
  StatusBar,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Screens
import LoginScreen from "./screens/auth/LoginScreen";
import DashboardScreen from "./screens/dashboard/DashboardScreen";
import ShiftManagementScreen from "./screens/labor/ShiftManagementScreen";
import OrdersScreen from "./screens/pos/OrdersScreen";
import InventoryScreen from "./screens/inventory/InventoryScreen";
import SettingsScreen from "./screens/settings/SettingsScreen";
import SyncStatusScreen from "./screens/sync/SyncStatusScreen";

// Services
import { offlineDataQueue } from "../shared/mobile/offline-data-queue";
import { mobileAuthService } from "../shared/mobile/auth-service";
import { realtimeSyncMobile } from "../shared/mobile/realtime-sync-mobile";

// Types
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Shifts: undefined;
  Orders: undefined;
  Inventory: undefined;
  Sync: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

interface AppState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  isSyncing: boolean;
  unreadNotifications: number;
}

/**
 * Main App Component
 */
export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    isAuthenticated: false,
    isLoading: true,
    isOnboarded: false,
    isSyncing: false,
    unreadNotifications: 0,
  });

  const insets = useSafeAreaInsets();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize offline queue
      await offlineDataQueue.initialize();

      // Check authentication
      const isAuthed = await mobileAuthService.isAuthenticated();

      // Initialize real-time sync
      if (isAuthed) {
        await realtimeSyncMobile.initialize();
        startAutoSync();
      }

      setAppState((prev) => ({
        ...prev,
        isAuthenticated: isAuthed,
        isLoading: false,
      }));
    } catch (error) {
      console.error("[App] Initialization error:", error);
      setAppState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    }
  };

  const startAutoSync = () => {
    // Auto-sync every 30 seconds
    const syncInterval = setInterval(async () => {
      setAppState((prev) => ({ ...prev, isSyncing: true }));

      try {
        const result = await offlineDataQueue.syncWithServer();
        console.log(
          `[App] Auto-sync: ${result.synced}/${result.total} items synced`,
        );
      } catch (error) {
        console.error("[App] Auto-sync error:", error);
      } finally {
        setAppState((prev) => ({ ...prev, isSyncing: false }));
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  };

  if (appState.isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a1a1a",
          paddingTop: insets.top,
        }}
      >
        <ActivityIndicator size="large" color="#00b4d8" />
        <Text style={{ marginTop: 16, color: "#fff", fontSize: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000"
        translucent={Platform.OS === "android"}
      />

      <NavigationContainer>
        {appState.isAuthenticated ? (
          <MainNavigator
            isSyncing={appState.isSyncing}
            unreadNotifications={appState.unreadNotifications}
          />
        ) : (
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: "#1a1a1a" },
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

/**
 * Main App Navigator (Authenticated)
 */
interface MainNavigatorProps {
  isSyncing: boolean;
  unreadNotifications: number;
}

const MainNavigator: React.FC<MainNavigatorProps> = ({
  isSyncing,
  unreadNotifications,
}) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#00b4d8",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#1a1a1a",
          borderTopColor: "#333",
          borderTopWidth: 1,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => <DashboardIcon color={color} size={24} />,
        }}
      />

      <Tab.Screen
        name="Shifts"
        component={ShiftManagementScreen}
        options={{
          tabBarLabel: "Shifts",
          tabBarIcon: ({ color }) => <ShiftIcon color={color} size={24} />,
        }}
      />

      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: "Orders",
          tabBarIcon: ({ color }) => <OrderIcon color={color} size={24} />,
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : null,
        }}
      />

      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: "Inventory",
          tabBarIcon: ({ color }) => <InventoryIcon color={color} size={24} />,
        }}
      />

      <Tab.Screen
        name="Sync"
        component={SyncStatusScreen}
        options={{
          tabBarLabel: "Sync",
          tabBarIcon: ({ color }) => (
            <SyncIcon color={color} size={24} syncing={isSyncing} />
          ),
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color }) => <SettingsIcon color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Onboarding Screen
 */
const OnboardingScreen: React.FC = () => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#fff", fontSize: 18 }}>Onboarding</Text>
    </View>
  );
};

/**
 * Icon Components (Placeholders)
 */
const DashboardIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color }} />
);

const ShiftIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color }} />
);

const OrderIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color }} />
);

const InventoryIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color }} />
);

const SyncIcon = ({
  color,
  size,
  syncing,
}: {
  color: string;
  size: number;
  syncing: boolean;
}) => (
  <View
    style={{
      width: size,
      height: size,
      backgroundColor: syncing ? "#ff9500" : color,
    }}
  />
);

const SettingsIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ width: size, height: size, backgroundColor: color }} />
);

export default App;
