/**
 * EngOpsStandalone — entry point for /eng-ops/* internal tooling routes.
 */
import React, { useMemo } from "react";
import { EngOpsNotifications } from "./EngOpsNotifications";
import { EngOpsDismissalAudit } from "./EngOpsDismissalAudit";
import { EngOpsStratus } from "./EngOpsStratus";

export default function EngOpsStandalone() {
  const path = useMemo(() => window.location.pathname, []);
  if (path.startsWith("/eng-ops/dismissal-audit")) return <EngOpsDismissalAudit />;
  if (path.startsWith("/eng-ops/stratus")) return <EngOpsStratus />;
  return <EngOpsNotifications />;
}
