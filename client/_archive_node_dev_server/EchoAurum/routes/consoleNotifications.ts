import type { RequestHandler } from "express";
import type { ConsoleNotification } from "../../shared/notifications";
import { consoleNotifications } from "../../shared/notificationsData";
export const handleConsoleNotifications: RequestHandler = (_req, res) => {
  const notifications: ConsoleNotification[] = consoleNotifications;
  res.status(200).json({ notifications });
};
