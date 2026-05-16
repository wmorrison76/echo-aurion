import type { RequestHandler } from "express";

interface OfflineDataSync {
  resourceType: "schedules" | "forecasts" | "tasks" | "messages";
  lastSyncTime: string;
  itemCount: number;
  dataSize: number;
  status: "synced" | "pending" | "error";
}

interface PushNotification {
  notificationId: string;
  type: "schedule" | "alert" | "message" | "task" | "forecast";
  title: string;
  body: string;
  priority: "high" | "normal" | "low";
  actions: Array<{
    actionId: string;
    label: string;
    url?: string;
  }>;
  createdAt: string;
  expiresAt: string;
}

interface MobileEnhancementsData {
  offlineCapabilities: {
    syncStatus: OfflineDataSync[];
    cacheSize: number;
    lastFullSync: string;
    queuedActions: number;
  };
  pushNotifications: {
    enabled: boolean;
    recentNotifications: PushNotification[];
    scheduledNotifications: PushNotification[];
  };
  performanceMetrics: {
    averageLoadTime: number;
    offlineAccessTime: number;
    syncSpeed: number;
  };
  features: {
    offlineScheduleViewing: boolean;
    offlineShiftSwapping: boolean;
    offlineTimeClocking: boolean;
    biometricAuth: boolean;
    voiceCommands: boolean;
  };
  recommendations: string[];
}

const generateMobileEnhancementsHandler: RequestHandler = async (req, res) => {
  try {
    const { deviceType = "iOS", appVersion = "3.0" } = req.body;

    const offlineSyncStatus: OfflineDataSync[] = [
      {
        resourceType: "schedules",
        lastSyncTime: new Date(Date.now() - 300000).toISOString(),
        itemCount: 42,
        dataSize: 2.4,
        status: "synced",
      },
      {
        resourceType: "forecasts",
        lastSyncTime: new Date(Date.now() - 600000).toISOString(),
        itemCount: 28,
        dataSize: 1.8,
        status: "synced",
      },
      {
        resourceType: "tasks",
        lastSyncTime: new Date(Date.now() - 120000).toISOString(),
        itemCount: 156,
        dataSize: 4.2,
        status: "synced",
      },
      {
        resourceType: "messages",
        lastSyncTime: new Date(Date.now() - 60000).toISOString(),
        itemCount: 83,
        dataSize: 3.1,
        status: "synced",
      },
    ];

    const recentNotifications: PushNotification[] = [
      {
        notificationId: "notif-001",
        type: "schedule",
        title: "Your Shift is Tomorrow",
        body: "Dinner service at 6:00 PM - Station: Line Cook",
        priority: "high",
        actions: [
          { actionId: "confirm", label: "Confirm Shift" },
          { actionId: "swap", label: "Request Swap" },
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        notificationId: "notif-002",
        type: "alert",
        title: "High Demand Forecast",
        body: "Expected 95 covers today - Peak hours 12-2 PM & 6-9 PM",
        priority: "normal",
        actions: [
          { actionId: "view", label: "View Details", url: "/forecast" },
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        notificationId: "notif-003",
        type: "message",
        title: "Manager: Schedule Update",
        body: "Your availability preference has been approved",
        priority: "normal",
        actions: [{ actionId: "open", label: "Open Message" }],
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        expiresAt: new Date(Date.now() + 604800000).toISOString(),
      },
    ];

    const scheduledNotifications: PushNotification[] = [
      {
        notificationId: "notif-sched-001",
        type: "task",
        title: "Prep Reminder: Mise en Place",
        body: "Time to begin prep for dinner service",
        priority: "high",
        actions: [
          { actionId: "start", label: "Start Prep" },
          { actionId: "delay", label: "Delay 15 min" },
        ],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
      {
        notificationId: "notif-sched-002",
        type: "forecast",
        title: "Weekend Forecast",
        body: "Saturday: 120 covers expected. Sunday: 85 covers.",
        priority: "normal",
        actions: [{ actionId: "ack", label: "Acknowledge" }],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 604800000).toISOString(),
      },
    ];

    const features = {
      offlineScheduleViewing: true,
      offlineShiftSwapping: true,
      offlineTimeClocking: true,
      biometricAuth: deviceType === "iOS" || deviceType === "Android",
      voiceCommands: true,
    };

    const recommendations = [
      "✅ Enable Offline Mode - Users can view schedules without connectivity",
      "✅ Implement Service Workers - Cache critical data for 7-day offline access",
      "✅ Add Biometric Auth - Fingerprint/Face ID for secure clock-in",
      "✅ Voice Commands - 'Clock in', 'View schedule', 'Find shift swap'",
      "✅ Smart Notifications - Consolidate related alerts into single notification",
      "✅ Dark Mode - Reduce battery drain, improve night-shift usability",
      "✅ Accessibility Features - Large text, high contrast, voice guidance",
      "📊 Battery Optimization - Implement adaptive sync intervals based on usage",
      "🔔 Notification Preference Center - Let users control notification frequency",
      "📱 Home Screen Widgets - Quick access to next shift, demand forecast",
    ];

    const mobileData: MobileEnhancementsData = {
      offlineCapabilities: {
        syncStatus: offlineSyncStatus,
        cacheSize: 11.5,
        lastFullSync: new Date(Date.now() - 120000).toISOString(),
        queuedActions: 0,
      },
      pushNotifications: {
        enabled: true,
        recentNotifications,
        scheduledNotifications,
      },
      performanceMetrics: {
        averageLoadTime: 1.2,
        offlineAccessTime: 0.3,
        syncSpeed: 2.4,
      },
      features,
      recommendations,
    };

    res.json(mobileData);
  } catch (error) {
    console.error("[MOBILE] Enhancements error:", error);
    res.status(500).json({
      error: "Mobile enhancements data generation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default generateMobileEnhancementsHandler;
