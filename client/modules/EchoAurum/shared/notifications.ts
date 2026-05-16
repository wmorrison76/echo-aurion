export type NotificationSeverity = "info" | "success" | "warning" | "critical";
export interface ConsoleNotification {
  id: string;
  title: string;
  description: string;
  severity: NotificationSeverity;
  createdAt: string;
  href?: string;
  ctaLabel?: string;
}
