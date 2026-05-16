import { useEventStore } from "@/store/event-store";
import { useAnalyticsStore } from "@/store/analytics-store";
import { sendEventReminder, sendSyncNotification } from "@/lib/notifications";

export class PushNotificationManager {
  static async handleEventCreatedNotification(eventData: {
    eventId: string;
    title: string;
    reminderMinutes: number;
  }): Promise<void> {
    try {
      const { trackEvent } = useAnalyticsStore.getState();

      trackEvent("event_reminder_scheduled", "system_event", {
        eventId: eventData.eventId,
        reminderMinutes: eventData.reminderMinutes,
      });

      if (eventData.reminderMinutes > 0) {
        await sendEventReminder(
          eventData.eventId,
          eventData.title,
          eventData.reminderMinutes,
        );
      }

      console.log("[PushNotificationManager] Event reminder scheduled");
    } catch (error) {
      console.error(
        "[PushNotificationManager] Failed to handle event created:",
        error,
      );
    }
  }

  static async handleSyncCompletedNotification(syncData: {
    success: boolean;
    itemsCount: number;
    syncedAt: string;
  }): Promise<void> {
    try {
      const { trackEvent } = useAnalyticsStore.getState();

      trackEvent("sync_completed", "system_event", {
        success: syncData.success,
        itemsCount: syncData.itemsCount,
      });

      if (syncData.itemsCount > 0) {
        await sendSyncNotification(syncData.success, syncData.itemsCount);
      }

      console.log("[PushNotificationManager] Sync notification sent");
    } catch (error) {
      console.error(
        "[PushNotificationManager] Failed to handle sync completed:",
        error,
      );
    }
  }

  static async handleConflictDetectedNotification(conflictData: {
    eventId: string;
    eventTitle: string;
    conflictType: string;
  }): Promise<void> {
    try {
      const { trackEvent } = useAnalyticsStore.getState();

      trackEvent("conflict_detected", "system_event", {
        eventId: conflictData.eventId,
        conflictType: conflictData.conflictType,
      });

      console.log(
        "[PushNotificationManager] Conflict detected:",
        conflictData.eventTitle,
      );
    } catch (error) {
      console.error(
        "[PushNotificationManager] Failed to handle conflict detected:",
        error,
      );
    }
  }

  static async handleIntegrationSyncNotification(integrationData: {
    provider: string;
    success: boolean;
    message: string;
    syncedEvents: number;
  }): Promise<void> {
    try {
      const { trackEvent } = useAnalyticsStore.getState();

      trackEvent("integration_sync_completed", "system_event", {
        provider: integrationData.provider,
        success: integrationData.success,
        syncedEvents: integrationData.syncedEvents,
      });

      console.log(
        "[PushNotificationManager] Integration sync completed:",
        integrationData.provider,
      );
    } catch (error) {
      console.error(
        "[PushNotificationManager] Failed to handle integration sync:",
        error,
      );
    }
  }
}
