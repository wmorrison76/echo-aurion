/**
 * Push Notification Service
 * ────────────────────────
 * FCM/APNs integration for real-time notifications across mobile app.
 *
 * NOTIFICATION TYPES:
 * - Order alerts (new order, status change)
 * - Shift alerts (upcoming shift, time entry reminder)
 * - Inventory alerts (low stock, expiration)
 * - Financial alerts (margin erosion, budget variance)
 * - System alerts (sync failed, connection issues)
 */

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  priority: "high" | "normal" | "low";
  timestamp: number;
  read: boolean;
  action_url?: string;
}

export type NotificationType =
  | "order_alert"
  | "shift_alert"
  | "inventory_alert"
  | "financial_alert"
  | "system_alert"
  | "message"
  | "custom";

export interface NotificationSubscription {
  device_id: string;
  user_id: string;
  platform: "ios" | "android" | "web";
  token: string;
  outlet_id: string;
  topics: NotificationType[];
  enabled: boolean;
  created_at: number;
}

class PushNotificationService {
  private notifications: Map<string, PushNotification> = new Map();
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private handlers: Map<NotificationType, Function[]> = new Map();

  /**
   * Register device for push notifications
   */
  public async registerDevice(
    deviceId: string,
    userId: string,
    platform: "ios" | "android" | "web",
    token: string,
    outletId: string,
    topics: NotificationType[] = [],
  ): Promise<NotificationSubscription> {
    const subscription: NotificationSubscription = {
      device_id: deviceId,
      user_id: userId,
      platform,
      token,
      outlet_id: outletId,
      topics: topics.length > 0 ? topics : this.getDefaultTopics(),
      enabled: true,
      created_at: Date.now(),
    };

    this.subscriptions.set(deviceId, subscription);

    console.log(
      `[PushNotifications] Device registered: ${deviceId} (${platform})`,
    );

    // Register with FCM/APNs
    await this.registerWithProvider(subscription);

    return subscription;
  }

  /**
   * Send notification to device
   */
  public async sendNotification(
    deviceId: string,
    notification: Omit<PushNotification, "id" | "timestamp" | "read">,
  ): Promise<PushNotification> {
    const push: PushNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: Date.now(),
      read: false,
    };

    const subscription = this.subscriptions.get(deviceId);
    if (!subscription || !subscription.enabled) {
      console.warn(
        `[PushNotifications] Device not found or disabled: ${deviceId}`,
      );
      return push;
    }

    // Check if user is subscribed to this topic
    if (!subscription.topics.includes(notification.type)) {
      console.log(
        `[PushNotifications] User not subscribed to ${notification.type}`,
      );
      return push;
    }

    try {
      // Send via provider
      await this.sendViaProvider(subscription, push);

      // Store locally
      this.notifications.set(push.id, push);

      console.log(
        `[PushNotifications] Sent: ${notification.type} to ${deviceId}`,
      );
    } catch (error) {
      console.error("[PushNotifications] Send error:", error);
    }

    return push;
  }

  /**
   * Broadcast notification to multiple devices
   */
  public async broadcastNotification(
    notification: Omit<PushNotification, "id" | "timestamp" | "read">,
    filter?: { outlet_id?: string; topic?: NotificationType },
  ): Promise<number> {
    let deviceIds = Array.from(this.subscriptions.keys());

    if (filter?.outlet_id) {
      deviceIds = deviceIds.filter(
        (id) => this.subscriptions.get(id)?.outlet_id === filter.outlet_id,
      );
    }

    if (filter?.topic) {
      deviceIds = deviceIds.filter((id) =>
        this.subscriptions.get(id)?.topics.includes(filter.topic!),
      );
    }

    console.log(
      `[PushNotifications] Broadcasting to ${deviceIds.length} devices`,
    );

    let sent = 0;
    for (const deviceId of deviceIds) {
      try {
        await this.sendNotification(deviceId, notification);
        sent++;
      } catch (error) {
        console.error(
          `[PushNotifications] Failed to send to ${deviceId}:`,
          error,
        );
      }
    }

    return sent;
  }

  /**
   * Handle incoming notification
   */
  public async handleIncomingNotification(
    notification: PushNotification,
  ): Promise<void> {
    // Store notification
    this.notifications.set(notification.id, notification);

    // Call registered handlers
    const handlers = this.handlers.get(notification.type) || [];
    for (const handler of handlers) {
      try {
        handler(notification);
      } catch (error) {
        console.error("[PushNotifications] Handler error:", error);
      }
    }

    // Emit event for app to display
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notification:received", {
          detail: notification,
        }),
      );
    }
  }

  /**
   * Register handler for notification type
   */
  public onNotification(
    type: NotificationType,
    handler: (notification: PushNotification) => void,
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }

    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Mark notification as read
   */
  public markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Get unread count
   */
  public getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter((n) => !n.read)
      .length;
  }

  /**
   * Get notifications
   */
  public getNotifications(limit = 50, unreadOnly = false): PushNotification[] {
    let notifications = Array.from(this.notifications.values());

    if (unreadOnly) {
      notifications = notifications.filter((n) => !n.read);
    }

    return notifications
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Update subscription topics
   */
  public updateTopics(
    deviceId: string,
    topics: NotificationType[],
  ): NotificationSubscription | null {
    const subscription = this.subscriptions.get(deviceId);
    if (!subscription) return null;

    subscription.topics = topics;
    return subscription;
  }

  /**
   * Disable notifications
   */
  public disableNotifications(deviceId: string): void {
    const subscription = this.subscriptions.get(deviceId);
    if (subscription) {
      subscription.enabled = false;
      console.log(`[PushNotifications] Notifications disabled for ${deviceId}`);
    }
  }

  /**
   * Send via provider (FCM/APNs)
   */
  private async sendViaProvider(
    subscription: NotificationSubscription,
    notification: PushNotification,
  ): Promise<void> {
    const payload = {
      token: subscription.token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      android: {
        priority: notification.priority,
        notification: {
          sound: "default",
          channelId: "default",
          clickAction: notification.action_url,
        },
        data: notification.data,
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            sound: "default",
            badge: 1,
            "content-available": 1,
          },
          data: notification.data,
        },
      },
    };

    // Send to backend for FCM/APNs dispatch
    const response = await fetch("/api/mobile/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }
  }

  /**
   * Register with provider
   */
  private async registerWithProvider(
    subscription: NotificationSubscription,
  ): Promise<void> {
    await fetch("/api/mobile/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
  }

  /**
   * Get default notification topics
   */
  private getDefaultTopics(): NotificationType[] {
    return [
      "order_alert",
      "shift_alert",
      "inventory_alert",
      "financial_alert",
      "system_alert",
    ];
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export const pushNotificationService = new PushNotificationService();
