/**
 * Module Settings Routes (D8)
 *
 *   GET    /api/modules
 *     List the canonical modules with their current enabled state for the
 *     caller's org. Used by Admin → Module Settings to render toggles.
 *
 *   GET    /api/modules/:name
 *     Single-module status for the caller's org (cache-aware).
 *
 *   POST   /api/modules/:name/toggle           [admin]
 *     Body: { enabled: boolean, orgId?: string, scope?: "global"|"org" }
 *     Writes a feature_flags row keyed "module:{name}". When orgId is
 *     supplied with scope="org", uses targetType="org_ids" so disabling
 *     for one customer does not affect others.
 *
 * Why the modular framework matters: the platform sells "any module
 * off; competitor APIs in" but the wiring was never consumed (see
 * server/lib/module-gate.ts header). This route exposes the missing
 * admin surface and invalidates the gate cache after each write.
 *
 * Auth: read endpoints use the standard (optional) JWT middleware
 * upstream — they expose only label/description/enabled, no secrets.
 * Toggle requires ADMIN_TOKEN (header x-admin-token) since flipping a
 * module off for an org is a customer-visible action.
 */

import express, { Request, Response } from "express";
import { logger } from "../lib/logger";
import { requireAdminToken } from "../middleware/adminAuth";
import { featureFlagService } from "../services/feature-flag-service";
import {
  isModuleEnabledForOrg,
  listKnownModules,
  getModuleDescriptor,
  invalidateModuleGateCache,
} from "../lib/module-gate";

const router = express.Router();

const FLAG_PREFIX = "module:";

function callerOrgId(req: Request): string | undefined {
  return (
    (req as any).user?.org_id ||
    (req as any).user?.orgId ||
    (req.headers["x-org-id"] as string | undefined)
  );
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const orgId = callerOrgId(req);
    const modules = listKnownModules();
    const enriched = await Promise.all(
      modules.map(async (m) => {
        const enabled = await isModuleEnabledForOrg(m.name, orgId);
        return {
          name: m.name,
          label: m.label,
          description: m.description,
          category: m.category,
          defaultEnabled: m.defaultEnabled,
          enabled,
          flagKey: `${FLAG_PREFIX}${m.name}`,
        };
      }),
    );
    res.json({
      success: true,
      orgId: orgId ?? null,
      modules: enriched,
    });
  } catch (err) {
    logger.error("[Modules] list failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "List failed" });
  }
});

router.get("/:name", async (req: Request, res: Response) => {
  try {
    const desc = getModuleDescriptor(req.params.name);
    if (!desc) return res.status(404).json({ error: "Unknown module" });
    const orgId = callerOrgId(req);
    const enabled = await isModuleEnabledForOrg(desc.name, orgId);
    res.json({
      success: true,
      module: {
        name: desc.name,
        label: desc.label,
        description: desc.description,
        category: desc.category,
        defaultEnabled: desc.defaultEnabled,
        enabled,
        flagKey: `${FLAG_PREFIX}${desc.name}`,
      },
    });
  } catch (err) {
    logger.error("[Modules] read failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Read failed" });
  }
});

router.post("/:name/toggle", requireAdminToken, async (req: Request, res: Response) => {
  try {
    const desc = getModuleDescriptor(req.params.name);
    if (!desc) return res.status(404).json({ error: "Unknown module" });

    const { enabled, orgId, scope } = req.body ?? {};
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ error: "Body field 'enabled' (boolean) is required" });
    }

    const flagName = `${FLAG_PREFIX}${desc.name}`;

    // Org-scoped toggle: only this org sees the change.
    // Global toggle: status flipped for everyone (admin-only path).
    if (scope === "org" && orgId) {
      // Read existing flag to merge org list rather than overwrite.
      const existing = await featureFlagService.getFlag(flagName);
      const currentIds = new Set(existing?.targetConfig?.orgIds ?? []);
      if (enabled) {
        // Enabling for this org means: ensure flag is enabled and this
        // org is in the targeted list (or remove from disabled list).
        currentIds.add(orgId);
        await featureFlagService.setFlag(
          flagName,
          "enabled",
          "org_ids",
          { orgIds: Array.from(currentIds) },
          desc.label,
          desc.description,
        );
      } else {
        // Disabling for this org: flag becomes a deny-list — represented
        // as status=disabled + org_ids set to the disabled orgs.
        currentIds.add(orgId);
        await featureFlagService.setFlag(
          flagName,
          "disabled",
          "org_ids",
          { orgIds: Array.from(currentIds) },
          desc.label,
          desc.description,
        );
      }
    } else {
      // Global toggle.
      await featureFlagService.setFlag(
        flagName,
        enabled ? "enabled" : "disabled",
        "all",
        undefined,
        desc.label,
        desc.description,
      );
    }

    invalidateModuleGateCache(desc.name);

    logger.info("[Modules] toggled", {
      module: desc.name,
      enabled,
      scope: scope ?? "global",
      orgId: orgId ?? null,
    });

    res.json({
      success: true,
      module: desc.name,
      enabled,
      scope: scope ?? "global",
      orgId: orgId ?? null,
    });
  } catch (err) {
    logger.error("[Modules] toggle failed", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Toggle failed" });
  }
});

export { router as modulesRouter };
export default router;
