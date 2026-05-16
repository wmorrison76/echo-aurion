# Real-Time Notifications System with WebSocket

Complete guide for Echo Ops real-time notifications using WebSocket, push notifications, and multi-channel delivery.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup](#setup)
4. [WebSocket Connection](#websocket-connection)
5. [Notification Types](#notification-types)
6. [Sending Notifications](#sending-notifications)
7. [Client Implementation](#client-implementation)
8. [Push Notifications](#push-notifications)
9. [Email & SMS](#email--sms)
10. [API Reference](#api-reference)

## 🎯 Overview

The real-time notification system provides:

- **WebSocket connections**: Real-time push to connected clients
- **Multi-channel delivery**: Email, SMS, push, in-app, webhooks
- **Notification templates**: Reusable notification templates
- **Delivery tracking**: Track delivery and read status
- **User preferences**: Customizable notification settings
- **Quiet hours**: Respect user's quiet hours for notifications
- **Analytics**: Detailed notification metrics and stats

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (Browser/  │
│   Mobile)   │
└──────┬──────┘
       │ WebSocket
       │
┌──────▼──────────┐
│  WebSocket      │
│  Manager        │
└──────┬──────────┘
       │
       ├─→ In-App Notifications
       │   (Real-time push)
       │
       └─→ Notification Service
           ├─→ Email Channel
           ├─→ SMS Channel
           ├─→ Push Channel
           ├─→ Webhook Channel
           └─→ Database Storage
```

## ⚙️ Setup

### Install Dependencies

```bash
npm install socket.io socket.io-client expo-notifications twilio nodemailer
```

### Environment Variables

```env
# WebSocket
WEBSOCKET_URL=wss://your-domain.com/socket.io
WEBSOCKET_PORT=3001

# Push Notifications
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx

# Email Service
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=noreply@example.com

# SMS Service
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Notifications
NOTIFICATION_RETENTION_DAYS=90
QUIET_HOURS_ENABLED=true
```

### Initialize WebSocket Server

```typescript
import express from "express";
import { createServer } from "http";
import { WebSocketManager } from "@server/lib/websocketManager";

const app = express();
const httpServer = createServer(app);
const wsManager = new WebSocketManager(httpServer);

httpServer.listen(3001, () => {
  console.log("WebSocket server running on port 3001");
});
```

## 🔌 WebSocket Connection

### Client Connection

```typescript
import { io } from "socket.io-client";

const socket = io("wss://your-domain.com:3001", {
  auth: {
    token: "your-auth-token",
    userId: "user-id",
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Handle connection
socket.on("connected", (data) => {
  console.log("Connected:", data);
});

// Subscribe to notifications
socket.emit("subscribe", {
  outletId: "outlet-123",
  eventTypes: ["delivery.received", "order.created"],
});

// Listen for notifications
socket.on("notification", (message) => {
  console.log("Received notification:", message.payload);
});
```

### React Hook for WebSocket

```typescript
import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export function useWebSocket(userId: string, token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WEBSOCKET_URL, {
      auth: { userId, token },
    });

    newSocket.on("connected", () => {
      setConnected(true);
    });

    newSocket.on("notification", (message) => {
      setNotifications((prev) => [message.payload, ...prev]);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, token]);

  const subscribe = useCallback(
    (outletId: string, eventTypes: string[]) => {
      socket?.emit("subscribe", { outletId, eventTypes });
    },
    [socket],
  );

  const unsubscribe = useCallback(
    (outletId: string, eventTypes: string[]) => {
      socket?.emit("unsubscribe", { outletId, eventTypes });
    },
    [socket],
  );

  const markAsRead = useCallback(
    (notificationId: string) => {
      socket?.emit("notification:read", { notificationId });
    },
    [socket],
  );

  return {
    socket,
    connected,
    notifications,
    subscribe,
    unsubscribe,
    markAsRead,
  };
}
```

## 📬 Notification Types

### Supported Event Types

```typescript
type NotificationEventType =
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
```

### Notification Priority Levels

- **critical**: Immediate delivery, high visibility
- **high**: Prioritized in delivery queue
- **medium**: Normal priority (default)
- **low**: Can be batched and delayed

## 📤 Sending Notifications

### Send Single Notification

```typescript
import { notificationService } from "@shared/notifications/notificationService";

async function sendDeliveryNotification(
  userId: string,
  deliveryId: string,
  outletId: string,
) {
  await notificationService.sendNotification({
    type: "delivery.received",
    title: "Delivery Received",
    message: `Delivery ${deliveryId} has been received`,
    priority: "high",
    channels: ["in_app", "push", "email"],
    recipients: [userId],
    metadata: {
      deliveryId,
      outletId,
      actionUrl: `/deliveries/${deliveryId}`,
    },
  });
}
```

### Send Bulk Notifications

```typescript
async function notifyOutletOfOrder(
  outletId: string,
  orderNumber: string,
  amount: number,
) {
  const { data: staff } = await supabase
    .from("user_outlets")
    .select("user_id")
    .eq("outlet_id", outletId)
    .eq("role", "manager");

  const recipientIds = staff?.map((s) => s.user_id) || [];

  await notificationService.sendBulkNotifications(recipientIds, {
    type: "order.created",
    title: "New Order",
    message: `Order #${orderNumber} for $${amount.toFixed(2)} has been created`,
    priority: "medium",
    channels: ["in_app", "push"],
    metadata: {
      orderNumber,
      outletId,
      actionUrl: `/orders/${orderNumber}`,
    },
  });
}
```

### Send Using Template

```typescript
async function sendPaymentFailureNotification(
  userId: string,
  vendorName: string,
  amount: number,
) {
  await notificationService.sendWithTemplate("payment-failure", [userId], {
    vendorName,
    amount: amount.toFixed(2),
  });
}
```

## 📱 Client Implementation

### React Notification Component

```typescript
import React, { useEffect } from 'react';
import { useWebSocket } from '@hooks/useWebSocket';
import { Toast } from '@components/Toast';

export function NotificationCenter() {
  const { notifications, connected, markAsRead } = useWebSocket(
    userId,
    authToken
  );

  return (
    <div className="notification-center">
      <div className="header">
        <h2>Notifications ({notifications.length})</h2>
        <span className={connected ? 'online' : 'offline'}>
          {connected ? '🟢 Connected' : '🔴 Offline'}
        </span>
      </div>

      <div className="notifications-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification ${notification.status}`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="notification-header">
              <h3>{notification.title}</h3>
              <span className={`priority-${notification.priority}`}>
                {notification.priority}
              </span>
            </div>
            <p className="notification-message">{notification.message}</p>
            <div className="notification-meta">
              <time>{new Date(notification.createdAt).toLocaleString()}</time>
              {notification.status !== 'read' && (
                <button onClick={() => markAsRead(notification.id)}>
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🔔 Push Notifications

### Register for Push Notifications

```typescript
import * as Notifications from "expo-notifications";

export async function registerForPushNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push notification permissions");
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID,
  });

  // Save token to server
  await fetch("/api/push-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token.data }),
  });

  return token.data;
}
```

### Listen for Push Notifications

```typescript
export function usePushNotifications() {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { notification } = response;
        console.log("Notification opened:", notification.request.content.data);
        // Navigate to relevant screen
      },
    );

    return () => subscription.remove();
  }, []);
}
```

## 📧 Email & SMS

### Email Notification Template

```typescript
const emailTemplate = {
  subject: "Order Received: #{{orderNumber}}",
  html: `
    <h2>New Order Received</h2>
    <p>Order #{{orderNumber}} for ${{ amount }} has been created.</p>
    <p>
      <a href="{{actionUrl}}">View Order Details</a>
    </p>
  `,
};
```

### SMS Notification

```typescript
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

async function sendSmsNotification(phoneNumber: string, message: string) {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });
}
```

## 🔌 API Reference

### Send Notification

```typescript
POST /api/notifications

{
  "type": "delivery.received",
  "title": "Delivery Received",
  "message": "Delivery has been received",
  "priority": "high",
  "channels": ["in_app", "push", "email"],
  "recipients": ["user-id"],
  "metadata": {
    "deliveryId": "delivery-123",
    "outletId": "outlet-123"
  }
}
```

### Get Notifications

```typescript
GET /api/notifications?limit=50&offset=0

Response:
[
  {
    "id": "notif_xxx",
    "type": "delivery.received",
    "title": "Delivery Received",
    "message": "...",
    "status": "delivered",
    "priority": "high",
    "createdAt": "2024-01-01T12:00:00Z",
    "readAt": null
  }
]
```

### Mark as Read

```typescript
PUT /api/notifications/:id/read

Response:
{
  "id": "notif_xxx",
  "status": "read",
  "readAt": "2024-01-01T12:05:00Z"
}
```

### Update Preferences

```typescript
PUT /api/notification-preferences

{
  "channels": ["push", "email"],
  "eventTypes": ["delivery.received", "order.created"],
  "quietHours": {
    "startTime": "22:00",
    "endTime": "08:00"
  },
  "enabled": true
}
```

## 🔒 Security

### Best Practices

1. **Authenticate WebSocket connections**: Always verify user identity
2. **Encrypt sensitive data**: Encrypt metadata before storage
3. **Validate event types**: Only allow authorized event subscriptions
4. **Rate limiting**: Prevent notification flooding
5. **CORS validation**: Restrict WebSocket origins
6. **Audit logging**: Log all notification sends

### Input Validation

```typescript
import { z } from 'zod';

const notificationSchema = z.object({
  type: z.enum(['delivery.received', 'order.created', ...]),
  title: z.string().max(255),
  message: z.string().max(1000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])),
  recipients: z.array(z.string()),
});

const payload = notificationSchema.parse(request.body);
```

## 📊 Monitoring

### Get Notification Stats

```typescript
GET /api/notifications/stats?outlet_id=outlet-123

Response:
{
  "totalSent": 1000,
  "totalDelivered": 980,
  "totalFailed": 20,
  "totalRead": 850,
  "deliveryRate": 98,
  "openRate": 85,
  "topEventTypes": [
    { "type": "delivery.received", "count": 450 },
    { "type": "order.created", "count": 300 }
  ],
  "topChannels": [
    { "channel": "in_app", "count": 800 },
    { "channel": "push", "count": 600 }
  ]
}
```

## 🚀 Deployment

- [ ] Set up WebSocket server with SSL/TLS (WSS)
- [ ] Configure push notification credentials
- [ ] Set up email service
- [ ] Configure SMS service
- [ ] Enable database migrations
- [ ] Set up webhook endpoints
- [ ] Configure quiet hours for users
- [ ] Set up notification cleanup job
- [ ] Enable analytics tracking
- [ ] Test all notification channels

---

**Version**: 1.0.0  
**Last Updated**: 2024
