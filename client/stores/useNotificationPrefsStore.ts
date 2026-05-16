/********************************************************************
 * LUCCCA — BUILD 19
 * useNotificationPrefsStore.ts
 *
 * PURPOSE:
 *  - Per-user notification preferences
 *  - Controls what events they see and via which channels
 *
 * CHANNELS (today):
 *  - inApp (ChangeFeed)
 *  - email
 *  - sms
 *
 * FILTERS:
 *  - by severity
 *  - by type (event, maintenance, conflict, override)
 *********************************************************************/

import { create } from "zustand";

export type Channel = "inApp" | "email" | "sms" | "teams" | "slack";
export type Severity = "info" | "warn" | "danger";

export type QuietHours = {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
};

export type NotificationPrefs = {
  userId: string;
  enabled: boolean;
  channels: Channel[]; // which channels to use
  minSeverity: Severity; // only notify on this level or higher
  types: string[]; // ["event", "maintenance", "conflict", "override", "schedule"]
  quietHours?: QuietHours;
};

type NotificationPrefsState = {
  prefs: NotificationPrefs[];
  getPrefsForUser: (userId: string) => NotificationPrefs;
  setPrefsForUser: (userId: string, prefs: Partial<NotificationPrefs>) => void;
  shouldNotify: (
    userId: string,
    type: string,
    severity: Severity
  ) => boolean;
};

export const useNotificationPrefsStore = create<NotificationPrefsState>(
  (set, get) => ({
    prefs: [],

    getPrefsForUser: (userId) => {
      const found = get().prefs.find((p) => p.userId === userId);
      if (found) return found;

      // Create default preferences
      const def: NotificationPrefs = {
        userId,
        enabled: true,
        channels: ["inApp"],
        minSeverity: "info",
        types: ["event", "maintenance", "conflict", "override", "schedule"],
      };
      set((state) => ({ prefs: [...state.prefs, def] }));
      return def;
    },

    setPrefsForUser: (userId, patch) => {
      set((state) => {
        const existing = state.prefs.find((p) => p.userId === userId);
        if (!existing) {
          const def: NotificationPrefs = {
            userId,
            enabled: true,
            channels: ["inApp"],
            minSeverity: "info",
            types: [
              "event",
              "maintenance",
              "conflict",
              "override",
              "schedule",
            ],
            ...patch,
          };
          return { prefs: [...state.prefs, def] };
        }
        const updated: NotificationPrefs = { ...existing, ...patch };
        return {
          prefs: state.prefs.map((p) =>
            p.userId === userId ? updated : p
          ),
        };
      });
    },

    shouldNotify: (userId, type, severity) => {
      const prefs = get().getPrefsForUser(userId);

      // Check if notifications are enabled
      if (!prefs.enabled) return false;

      // Check if type is subscribed
      if (!prefs.types.includes(type)) return false;

      // Check severity level
      const severityLevels: Record<Severity, number> = {
        info: 0,
        warn: 1,
        danger: 2,
      };

      if (severityLevels[severity] < severityLevels[prefs.minSeverity]) {
        return false;
      }

      // Check quiet hours (if enabled)
      if (prefs.quietHours?.enabled) {
        const now = new Date();
        const currentHour = now.getHours();
        const { startHour, endHour } = prefs.quietHours;

        // Allow danger severity even during quiet hours
        if (severity !== "danger") {
          if (startHour < endHour) {
            // Normal case: e.g., 22-8 (10pm-8am)
            if (currentHour >= startHour || currentHour < endHour) {
              return false;
            }
          } else {
            // Wraparound case: e.g., 20-6 (8pm-6am spans midnight)
            if (currentHour >= startHour && currentHour < endHour) {
              return false;
            }
          }
        }
      }

      return true;
    },
  })
);

/********************************************************************
 * USAGE:
 *
 * Get preferences for a user:
 *   const prefs = useNotificationPrefsStore.getState().getPrefsForUser("user-123");
 *
 * Update preferences:
 *   useNotificationPrefsStore.getState().setPrefsForUser("user-123", {
 *     channels: ["inApp", "email"],
 *     minSeverity: "warn",
 *     types: ["conflict", "override"],
 *     quietHours: {
 *       enabled: true,
 *       startHour: 22,
 *       endHour: 8,
 *     }
 *   });
 *
 * Check if should notify:
 *   if (useNotificationPrefsStore.getState().shouldNotify("user-123", "conflict", "danger")) {
 *     // Send notification
 *   }
 *********************************************************************/
