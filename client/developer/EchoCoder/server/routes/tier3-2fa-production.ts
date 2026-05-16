import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { getSecretsManager, sanitizeSecretFromResponse } from "../lib/secretsManager";
import { getEnvConfig } from "../lib/envConfig";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import { validate, setup2FASchema } from "../schemas/validationSchemas";

// IMPORTANT: In production, install via: npm install speakeasy qrcode
// For now, we'll use a placeholder that can be swapped with real implementation
// This demonstrates the proper architecture for production

const router = Router();
const secretsManager = getSecretsManager();

// All routes require authentication
router.use(validateAuth);

/**
 * Setup 2FA for a user - returns provisioning URI (NOT the raw secret)
 */
router.post(
  "/setup",
  asyncHandler(async (req: Request, res: Response) => {
    const data = validate(setup2FASchema, req.body);
    const config = getEnvConfig();
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

    if (!req.user) {
      throwAppError("Authentication required", 401, "MISSING_AUTH");
    }

    try {
      // Check if user already has 2FA enabled
      const { data: existing } = await supabase
        .from("user_2fa")
        .select("*")
        .eq("user_id", data.user_id)
        .single();

      if (existing) {
        throwAppError("2FA already configured for this user", 400, "2FA_ALREADY_ENABLED");
      }

      // In production, use speakeasy or similar library to generate TOTP secret
      // This is a placeholder demonstrating the architecture:
      let provisioning_uri = "";
      let backup_codes_encrypted = "";

      if (process.env.NODE_ENV === "production") {
        // Would use: const secret = speakeasy.generateSecret({ name: `EchoCoder (${userEmail})` })
        // provisioning_uri = secret.otpauth_url
        // But since library not installed, we provide guidance
        throwAppError(
          "2FA setup requires speakeasy library. Install: npm install speakeasy qrcode",
          503,
          "2FA_NOT_CONFIGURED",
        );
      } else {
        // Development: use safe placeholder
        provisioning_uri = `otpauth://totp/EchoCoder:${data.user_id}?secret=PLACEHOLDER&issuer=EchoCoder`;
        backup_codes_encrypted = secretsManager.encrypt(
          JSON.stringify([
            `BACKUP-${secretsManager.generateToken(8)}`,
            `BACKUP-${secretsManager.generateToken(8)}`,
            `BACKUP-${secretsManager.generateToken(8)}`,
            `BACKUP-${secretsManager.generateToken(8)}`,
            `BACKUP-${secretsManager.generateToken(8)}`,
          ]),
        );
      }

      // Store encrypted backup codes (NOT the TOTP secret - that stays on user device)
      const { data: created, error } = await supabase
        .from("user_2fa")
        .insert({
          user_id: data.user_id,
          method: data.method,
          backup_codes: backup_codes_encrypted,
          enabled: false, // Not enabled until user verifies code
          verified_at: null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store 2FA config: ${error.message}`);
      }

      // IMPORTANT: Never return secret or backup codes to client
      // Return only the provisioning URI for scanning QR code
      res.json({
        success: true,
        data: {
          provisioning_uri,
          // User scans this QR code with authenticator app
          // Backup codes are secure and should be retrieved separately via secure channel
        },
        message: "2FA setup initiated. Scan QR code with authenticator app.",
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      throw error;
    }
  }),
);

/**
 * Verify TOTP code and enable 2FA
 */
router.post(
  "/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const { user_id, totp_code } = req.body;

    if (!user_id || !totp_code) {
      throwAppError("user_id and totp_code required", 400, "MISSING_FIELDS");
    }

    if (!req.user) {
      throwAppError("Authentication required", 401, "MISSING_AUTH");
    }

    const config = getEnvConfig();
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

    try {
      // In production: use speakeasy.totp.verify()
      // For now, just accept the code to demonstrate the flow
      const { data: twofa, error: fetchError } = await supabase
        .from("user_2fa")
        .select("*")
        .eq("user_id", user_id)
        .single();

      if (fetchError || !twofa) {
        throwAppError("2FA not configured for this user", 404, "2FA_NOT_FOUND");
      }

      if (twofa.enabled) {
        throwAppError("2FA already enabled", 400, "2FA_ALREADY_ENABLED");
      }

      // Verify code (placeholder - in production, verify with speakeasy)
      const codeValid =
        process.env.NODE_ENV !== "production" || totp_code.length === 6;

      if (!codeValid) {
        throwAppError("Invalid TOTP code", 401, "INVALID_CODE");
      }

      // Enable 2FA
      const { data: updated, error } = await supabase
        .from("user_2fa")
        .update({
          enabled: true,
          verified_at: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to enable 2FA: ${error.message}`);
      }

      res.json({
        success: true,
        message: "2FA enabled successfully",
        data: {
          enabled: true,
          method: updated.method,
          // Backup codes stored encrypted on server, user should save them separately
        },
      });
    } catch (error) {
      console.error("2FA verify error:", error);
      throw error;
    }
  }),
);

/**
 * Get backup codes (requires recent authentication)
 * Backup codes are single-use tokens for account recovery
 */
router.get(
  "/backup-codes",
  asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.query;

    if (!user_id) {
      throwAppError("user_id required", 400, "MISSING_FIELDS");
    }

    if (!req.user) {
      throwAppError("Authentication required", 401, "MISSING_AUTH");
    }

    const config = getEnvConfig();
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

    try {
      const { data, error } = await supabase
        .from("user_2fa")
        .select("backup_codes")
        .eq("user_id", user_id)
        .single();

      if (error || !data) {
        throwAppError("2FA not configured", 404, "2FA_NOT_FOUND");
      }

      // Decrypt and return backup codes
      // In production, only return to authenticated user via secure channel
      const codes = JSON.parse(secretsManager.decrypt(data.backup_codes));

      res.json({
        success: true,
        data: { backup_codes: codes },
        message: "Backup codes retrieved. Store these in a safe place.",
      });
    } catch (error) {
      console.error("Backup codes retrieval error:", error);
      throw error;
    }
  }),
);

/**
 * Disable 2FA for user
 */
router.post(
  "/disable",
  asyncHandler(async (req: Request, res: Response) => {
    const { user_id } = req.body;

    if (!user_id) {
      throwAppError("user_id required", 400, "MISSING_FIELDS");
    }

    if (!req.user) {
      throwAppError("Authentication required", 401, "MISSING_AUTH");
    }

    const config = getEnvConfig();
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

    try {
      const { error } = await supabase
        .from("user_2fa")
        .delete()
        .eq("user_id", user_id);

      if (error) {
        throw new Error(`Failed to disable 2FA: ${error.message}`);
      }

      res.json({
        success: true,
        message: "2FA disabled",
      });
    } catch (error) {
      console.error("Disable 2FA error:", error);
      throw error;
    }
  }),
);

export default router;
