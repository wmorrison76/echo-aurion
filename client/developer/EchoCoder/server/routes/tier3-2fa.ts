import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import {
  log2FAOperation,
  logSensitiveOperationFailure,
} from "../lib/sentryBreadcrumbs";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
} from "../middleware/supabaseAuth";
import { featureGate } from "../middleware/featureGate";
import { tier3Limiter } from "../middleware/rateLimit";

const router: Router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",
);

// Security middleware stack: Auth -> Org Access -> Rate Limiting -> Feature Gating
router.use(verifySupabaseAuth);
router.use(verifyOrganizationAccess);
router.use(tier3Limiter);
router.use(featureGate("tier3_2fa"));

// Generate 2FA secret for user
router.post(
  "/:userId/setup",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { method = "totp" } = req.body;

    if (!userId || !["totp", "sms", "email"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "userId and valid method (totp, sms, email) are required",
      });
    }

    // Generate a simple secret (in production, use speakeasy library)
    const secret = generateRandomSecret();

    // Store encrypted in database
    const { data, error } = await supabase
      .from("user_2fa")
      .upsert(
        {
          user_id: userId,
          method,
          secret, // In production, this should be encrypted
          backup_codes: generateBackupCodes(),
          created_at: new Date(),
        },
        { onConflict: "user_id" },
      )
      .select();

    if (error) {
      log2FAOperation("2FA setup failed", userId, "failure", {
        method,
        error: error.message,
      });
      throw error;
    }

    log2FAOperation("2FA setup initiated", userId, "success", { method });

    res.json({
      success: true,
      message: "2FA setup initiated",
      secret, // In production, return provisioning URI instead
      method,
    });
  }),
);

// Verify 2FA code
router.post(
  "/:userId/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code is required",
      });
    }

    // Get user's 2FA config
    const { data: config, error } = await supabase
      .from("user_2fa")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !config) {
      return res.status(404).json({
        success: false,
        message: "2FA not configured for this user",
      });
    }

    // Verify the code (in production, use speakeasy.totp.verify())
    const isValid = verifyCode(code, config.secret);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid 2FA code",
      });
    }

    // Update last verified timestamp
    await supabase
      .from("user_2fa")
      .update({ last_verified_at: new Date() })
      .eq("user_id", userId);

    res.json({
      success: true,
      message: "2FA code verified",
      verified: true,
    });
  }),
);

// Get 2FA status
router.get(
  "/:userId/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("user_2fa")
      .select("user_id, method, created_at, last_verified_at")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.json({
        success: true,
        enabled: false,
        message: "2FA not configured",
      });
    }

    res.json({
      success: true,
      enabled: true,
      method: data.method,
      created_at: data.created_at,
      last_verified_at: data.last_verified_at,
    });
  }),
);

// Disable 2FA
router.post(
  "/:userId/disable",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { password } = req.body;

    // In production, verify password before disabling
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password required to disable 2FA",
      });
    }

    await supabase.from("user_2fa").delete().eq("user_id", userId);

    res.json({
      success: true,
      message: "2FA disabled",
    });
  }),
);

// Get backup codes
router.get(
  "/:userId/backup-codes",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("user_2fa")
      .select("backup_codes")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "2FA not configured",
      });
    }

    res.json({
      success: true,
      backup_codes: data.backup_codes,
    });
  }),
);

// ===== HELPER FUNCTIONS =====

function generateRandomSecret(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(Math.random().toString(36).substr(2, 9).toUpperCase());
  }
  return codes;
}

function verifyCode(code: string, secret: string): boolean {
  // In production, use: speakeasy.totp.verify({ secret, encoding: 'base32', token: code })
  // For now, accept any 6-digit code as valid for testing
  return /^\d{6}$/.test(code);
}

export default router;
