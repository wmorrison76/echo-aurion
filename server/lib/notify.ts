/********************************************************************
 * LUCCCA — BUILD 17
 * Auto-Notify Stakeholders
 *
 * PURPOSE:
 *  - Publish system-level notifications to alert departments
 *  - Future adapters: Email, SMS, Teams/Slack
 *
 * CURRENT OUTPUT:
 *  - Pushes message to ChangeFeedStore (in-app feed)
 *********************************************************************/

export type NotifyLevel = "info" | "warn" | "danger";

export type NotifyPayload = {
  type: string;
  action?: string;
  message: string;
  severity?: NotifyLevel;
  source?: string;
  target?: string;
  metadata?: Record<string, any>;
};

/**
 * In-memory queue for notifications
 * In production, these would be published to WebSocket, message queue, or external service
 */
const notificationQueue: NotifyPayload[] = [];

export function notify(payload: NotifyPayload) {
  const fullPayload: NotifyPayload = {
    severity: "info",
    source: "system",
    ...payload,
  };

  notificationQueue.push(fullPayload);

  // Log notification
  console.log(
    `[NOTIFY] ${fullPayload.type.toUpperCase()} | ${fullPayload.severity} | ${fullPayload.message}`
  );

  // In a real system, this would:
  // 1. Check user notification preferences (useNotificationPrefsStore)
  // 2. Route to Email, SMS, Teams, In-App based on channel preferences
  // 3. Respect quiet hours
  // 4. Filter by severity + type preferences

  // For now, we just queue it
  return fullPayload;
}

/**
 * Get all pending notifications
 */
export function getNotificationQueue(): NotifyPayload[] {
  return notificationQueue;
}

/**
 * Clear queue
 */
export function clearNotificationQueue() {
  const count = notificationQueue.length;
  notificationQueue.length = 0;
  return count;
}

/**
 * Convenience functions for common notification types
 */

export function notifyConflict(
  space: string,
  description: string,
  severity: NotifyLevel = "warn",
  source = "system"
) {
  return notify({
    type: "conflict",
    action: "detected",
    message: `Conflict in ${space}: ${description}`,
    severity,
    source,
    target: space,
  });
}

export function notifyScheduleChange(
  space: string,
  description: string,
  source = "system"
) {
  return notify({
    type: "schedule",
    action: "changed",
    message: `Schedule update for ${space}: ${description}`,
    severity: "info",
    source,
    target: space,
  });
}

export function notifyOverride(
  space: string,
  decision: "approved" | "denied",
  reason: string,
  actor: string
) {
  return notify({
    type: "override",
    action: decision,
    message: `Override ${decision}: ${reason}`,
    severity: decision === "approved" ? "warn" : "danger",
    source: actor,
    target: space,
  });
}

export function notifyAutoResolve(conflictId: string, description: string) {
  return notify({
    type: "conflict",
    action: "auto-resolved",
    message: `Auto-resolved: ${description}`,
    severity: "info",
    source: "system-auto-resolve",
    target: conflictId,
  });
}
