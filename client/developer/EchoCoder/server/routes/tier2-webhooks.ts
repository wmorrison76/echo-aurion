import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import {
  logWebhookOperation,
  logSensitiveOperationFailure,
} from "../lib/sentryBreadcrumbs";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
} from "../middleware/supabaseAuth";
import { featureGate } from "../middleware/featureGate";
import { tier2Limiter, webhookLimiter } from "../middleware/rateLimit";

const router: Router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",
);

// Security middleware stack: Auth -> Org Access -> Rate Limiting -> Feature Gating -> Admin Check
router.use(verifySupabaseAuth);
router.use(verifyOrganizationAccess);
router.use(webhookLimiter);
router.use(featureGate("tier2_webhooks"));
router.use(requireOrgAdmin);

// SSRF prevention: validate target URL
function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Block local/private addresses
    const blockedHosts = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      "169.254.169.254", // AWS metadata endpoint
    ];

    if (blockedHosts.some((host) => parsed.hostname === host)) {
      return false;
    }

    // Block private IP ranges
    if (parsed.hostname?.match(/^(10|172|192)\./)) {
      return false;
    }

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Create webhook
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, event_type, target_url, headers = {} } = req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !event_type || !target_url) {
      throwAppError(
        "workspace_id, event_type, and target_url are required",
        400,
      );
    }

    // SSRF prevention
    if (!validateWebhookUrl(target_url)) {
      throwAppError("Invalid or blocked webhook URL", 400);
    }

    const secret = crypto.randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("tier2_webhooks")
      .insert([
        {
          workspace_id,
          event_type,
          target_url,
          headers,
          secret,
          status: "active",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Log successful webhook creation
    logWebhookOperation("Webhook created", data.id, userId, workspace_id, {
      eventType,
      targetUrlDomain: new URL(target_url).hostname,
    });

    // Don't return secret in response
    const { secret: _, ...safeData } = data;

    return res.status(201).json({
      success: true,
      data: safeData,
      message: "Webhook created successfully",
    });
  }),
);

// List webhooks
router.get(
  "/:workspace_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("tier2_webhooks")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (error) throw error;

    // Don't return secrets
    const safeData = (data || []).map(({ secret: _, ...webhook }) => webhook);

    return res.status(200).json({
      success: true,
      data: safeData,
      message: "Webhooks retrieved successfully",
    });
  }),
);

// Update webhook
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { event_type, target_url, headers, status } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    // Validate new URL if provided
    if (target_url && !validateWebhookUrl(target_url)) {
      throwAppError("Invalid or blocked webhook URL", 400);
    }

    const { data, error } = await supabase
      .from("tier2_webhooks")
      .update({
        event_type,
        target_url,
        headers,
        status,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Don't return secret
    const { secret: _, ...safeData } = data;

    return res.status(200).json({
      success: true,
      data: safeData,
      message: "Webhook updated successfully",
    });
  }),
);

// Delete webhook
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { error } = await supabase
      .from("tier2_webhooks")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Webhook deleted successfully",
    });
  }),
);

// Test webhook (with timeout protection)
router.post(
  "/:id/test",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data: webhook, error: fetchError } = await supabase
      .from("tier2_webhooks")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !webhook) {
      throwAppError("Webhook not found", 404);
    }

    const testPayload = { event: "test", timestamp: new Date() };
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(JSON.stringify(testPayload))
      .digest("hex");

    try {
      // 5 second timeout for webhook test
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort("Webhook test timeout"), 5000);

      await fetch(webhook.target_url, {
        method: "POST",
        headers: {
          ...webhook.headers,
          "X-Webhook-Signature": signature,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
    } catch (fetchErr: any) {
      throwAppError(
        "Webhook test failed: " + (fetchErr.message || "Unknown error"),
        400,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Webhook test sent successfully",
    });
  }),
);

export default router;
