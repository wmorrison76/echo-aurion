import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/store/auth-store";
import { useSyncStore } from "@/store/sync-store";
import { initializeDatabase } from "@/lib/database/sqlite";
import { initializeApiClient } from "@/lib/api-client";
import {
  initializeNotifications,
  cleanupNotificationListeners,
} from "@/lib/notifications";
import { Toast } from "@/components/Toast";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, restoreSession, isLoading } = useAuthStore();
  const { startSync } = useSyncStore();

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDatabase();
        await initializeApiClient();
        await initializeNotifications();
        await restoreSession();

        // Start initial sync after auth restore
        startSync();
      } catch (error) {
        console.error("[App] Initialization error:", error);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    initialize();

    return () => {
      cleanupNotificationListeners();
    };
  }, []);

  if (isLoading) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animationEnabled: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        ) : (
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        )}
      </Stack>
      <Toast />
    </>
  );
}
