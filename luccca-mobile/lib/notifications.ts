import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { getApiClient } from "@/lib/api-client";

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPayload {
  type: "event_reminder" | "event_created" | "sync_complete" | "sync_error";
  eventId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

let notificationListener: any = null;
let responseListener: any = null;

export async function initializeNotifications(): Promise<void> {
  try {
    // Check if device supports notifications
    if (!Device.isDevice) {
      console.warn(
        "[Notifications] Running on simulator/emulator, notifications limited",
      );
      return;
    }

    // Request notification permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn(
        "[Notifications] Notification permissions not granted, local notifications will be available",
      );
      return;
    }

    // Get device push token
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7F",
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    console.log("[Notifications] Expo push token:", token.data);

    // Register token with backend
    await registerPushToken(token.data);

    setupNotificationListeners();

    console.log("[Notifications] Notifications initialized successfully");
  } catch (error) {
    console.error("[Notifications] Failed to initialize:", error);
  }
}

async function registerPushToken(token: string): Promise<void> {
  try {
    const api = getApiClient();
    await api.post("/notifications/register-token", {
      pushToken: token,
      platform: Platform.OS,
      deviceId: Device.osBuildId,
    });
    console.log("[Notifications] Push token registered with backend");
  } catch (error) {
    console.warn("[Notifications] Failed to register push token:", error);
  }
}

function setupNotificationListeners(): void {
  // Handle notifications when app is in foreground
  notificationListener = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("[Notifications] Notification received:", notification);
      handleNotificationReceived(notification);
    },
  );

  // Handle notification tap
  responseListener = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log("[Notifications] Notification tapped:", response);
      handleNotificationResponse(response);
    },
  );
}

function handleNotificationReceived(
  notification: Notifications.Notification,
): void {
  const payload = notification.request.content.data as NotificationPayload;

  if (!payload) return;

  console.log("[Notifications] Processing notification:", payload.type);
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): void {
  const payload = response.notification.request.content
    .data as NotificationPayload;

  if (!payload) return;

  console.log(
    "[Notifications] User interacted with notification:",
    payload.type,
  );

  if (payload.type === "event_reminder" && payload.eventId) {
    console.log("[Notifications] Opening event:", payload.eventId);
    window.dispatchEvent(
      new CustomEvent("notification-event-tap", {
        detail: { eventId: payload.eventId },
      }),
    );
  }
}

export async function scheduleLocalNotification(
  payload: NotificationPayload,
  delaySeconds: number = 60,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.message,
        sound: "default",
        vibrate: [0, 250, 250, 250],
        data: payload,
      },
      trigger: {
        seconds: Math.max(1, delaySeconds),
      },
    });

    console.log("[Notifications] Scheduled local notification");
  } catch (error) {
    console.error("[Notifications] Failed to schedule notification:", error);
  }
}

export async function sendEventReminder(
  eventId: string,
  eventTitle: string,
  reminderMinutes: number,
): Promise<void> {
  try {
    const delaySeconds = reminderMinutes * 60;

    await scheduleLocalNotification(
      {
        type: "event_reminder",
        eventId,
        title: "📅 Event Reminder",
        message: `${eventTitle} starts in ${reminderMinutes} minutes`,
        data: { eventId },
      },
      delaySeconds,
    );

    console.log(`[Notifications] Event reminder scheduled for ${eventTitle}`);
  } catch (error) {
    console.error("[Notifications] Failed to send event reminder:", error);
  }
}

export async function sendSyncNotification(
  success: boolean,
  itemsCount: number,
): Promise<void> {
  try {
    if (success) {
      await scheduleLocalNotification({
        type: "sync_complete",
        title: "✅ Sync Complete",
        message: `${itemsCount} items synchronized with server`,
      });
    } else {
      await scheduleLocalNotification({
        type: "sync_error",
        title: "⚠️ Sync Failed",
        message: "Some items failed to sync. Will retry automatically.",
      });
    }
  } catch (error) {
    console.error("[Notifications] Failed to send sync notification:", error);
  }
}

export function cleanupNotificationListeners(): void {
  if (notificationListener) {
    Notifications.removeNotificationSubscription(notificationListener);
  }
  if (responseListener) {
    Notifications.removeNotificationSubscription(responseListener);
  }
}

export async function getAllScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error(
      "[Notifications] Failed to get scheduled notifications:",
      error,
    );
    return [];
  }
}

export async function cancelNotificationAsync(
  notificationId: string,
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log("[Notifications] Cancelled notification:", notificationId);
  } catch (error) {
    console.error("[Notifications] Failed to cancel notification:", error);
  }
}
