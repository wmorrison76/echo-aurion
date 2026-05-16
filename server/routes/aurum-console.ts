import { Router } from "express";

import type { ConsoleOverview } from "../../client/modules/EchoAurum/shared/console";
import type { ConsoleNotification } from "../../client/modules/EchoAurum/shared/notifications";

import { consoleOverview } from "../../client/modules/EchoAurum/shared/consoleData";
import { consoleNotifications } from "../../client/modules/EchoAurum/shared/notificationsData";
import { requireSession } from "../../client/modules/EchoAurum/server/middleware/session";

const router = Router();

router.post(
  "/console/overview",
  requireSession({ role: "viewer" }),
  (_req, res) => {
    const overview: ConsoleOverview = consoleOverview;
    res.status(200).json({ overview });
  },
);

router.post(
  "/console/notifications",
  requireSession({ role: "viewer" }),
  (_req, res) => {
    const notifications: ConsoleNotification[] = consoleNotifications;
    res.status(200).json({ notifications });
  },
);

export default router;
