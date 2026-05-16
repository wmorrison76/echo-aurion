export type NotificationEventType =
  | "delivery.received"
  | "delivery.rejected"
  | "delivery.failed"
  | "order.created"
  | "order.confirmed"
  | "order.shipped"
  | "order.cancelled"
  | "inventory.low_stock"
  | "inventory.out_of_stock"
  | "invoice.payment_due"
  | "invoice.payment_failed"
  | "invoice.paid"
  | "payment.completed"
  | "payment.failed"
  | "user.mentioned"
  | "alert.critical"
  | "alert.warning"
  | "system.maintenance"
  | "system.update";
export type NotificationChannel =
  | "email"
  | "sms"
  | "push"
  | "in_app"
  | "webhook";
export type NotificationPriority = "low" | "medium" | "high" | "critical";
export type NotificationStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "read";
export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushTokens?: string[];
  preferences?: NotificationPreferences;
}
export interface NotificationPreferences {
  channels: NotificationChannel[];
  eventTypes: NotificationEventType[];
  quietHours?: { startTime: string; endTime: string };
  enabled: boolean;
  unsubscribeToken?: string;
}
export interface NotificationPayload {
  id?: string;
  type: NotificationEventType;
  title: string;
  message: string;
  body?: string;
  icon?: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  recipients: string[] | NotificationRecipient[];
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  sendAt?: Date;
  retryCount?: number;
  maxRetries?: number;
}
export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  title: string;
  message: string;
  body?: string;
  icon?: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  recipientId: string;
  outletId?: string;
  status: NotificationStatus;
  metadata?: Record<string, any>;
  readAt?: Date;
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
}
export interface WebSocketMessage {
  id: string;
  type: "notification" | "event" | "heartbeat" | "subscribe" | "unsubscribe";
  payload: any;
  timestamp: Date;
  userId?: string;
  outletId?: string;
}
export interface NotificationSubscription {
  userId: string;
  outletId?: string;
  eventTypes: NotificationEventType[];
  channels: NotificationChannel[];
  subscriptionId: string;
  createdAt: Date;
}
export interface NotificationTemplate {
  id: string;
  name: string;
  eventType: NotificationEventType;
  title: string;
  titleTemplate?: string;
  body: string;
  bodyTemplate?: string;
  channels: NotificationChannel[];
  variables?: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface NotificationLog {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  recipient: string;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
}
export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalRead: number;
  deliveryRate: number;
  openRate: number;
  averageDeliveryTime: number;
  topEventTypes: Array<{ type: NotificationEventType; count: number }>;
  topChannels: Array<{ channel: NotificationChannel; count: number }>;
}
