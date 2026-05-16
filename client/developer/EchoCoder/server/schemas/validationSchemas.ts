import { z } from "zod";

// Common schemas
export const uuidSchema = z.string().uuid("Invalid UUID format");
export const emailSchema = z.string().email("Invalid email format");
export const urlSchema = z.string().url("Invalid URL format");

// Tier 2 Workspaces
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(500).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

// Tier 2 Roles
export const createRoleSchema = z.object({
  workspace_id: uuidSchema,
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default([]),
  description: z.string().max(500).optional(),
});

// Tier 2 Feature Flags
export const createFeatureFlagSchema = z.object({
  workspace_id: uuidSchema,
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  enabled: z.boolean().default(false),
  rollout_percentage: z.number().int().min(0).max(100).default(0),
  metadata: z.record(z.any()).optional(),
});

// Tier 2 Webhooks
export const createWebhookSchema = z.object({
  workspace_id: uuidSchema,
  event_type: z.string().min(1).max(100),
  target_url: urlSchema,
  headers: z.record(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Tier 3 2FA
export const setup2FASchema = z.object({
  user_id: uuidSchema,
  method: z.enum(["totp", "sms", "email"]),
});

// Tier 3 IP Whitelist
export const addIPWhitelistSchema = z.object({
  workspace_id: uuidSchema,
  ip_address: z.string().ip({ version: "v4" }).or(z.string().ip({ version: "v6" })),
  description: z.string().max(255).optional(),
});

// Tier 3 SSO
export const createSSOConfigSchema = z.object({
  workspace_id: uuidSchema,
  provider: z.enum(["okta", "azure", "google", "github"]),
  client_id: z.string().min(1),
  client_secret: z.string().min(1), // Will be encrypted before storage
  metadata: z.record(z.any()).optional(),
});

// Tier 4 A/B Testing
export const createABTestSchema = z.object({
  content_id: uuidSchema,
  variant_a: z.string().min(1),
  variant_b: z.string().min(1),
  traffic_split: z.number().min(0).max(100).default(50),
});

// Tier 4 Image Optimization
export const optimizeImageSchema = z.object({
  asset_id: uuidSchema,
  format: z.enum(["webp", "jpeg", "png", "avif"]).default("webp"),
  quality: z.number().int().min(1).max(100).default(80),
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
});

// Tier 4 Targeting
export const createTargetingRuleSchema = z.object({
  workspace_id: uuidSchema,
  name: z.string().min(1).max(255),
  conditions: z.object({
    type: z.enum(["demographic", "behavioral", "location"]),
    value: z.any(),
  }),
  target_audience: z.number().int().min(1).optional(),
});

// Validator helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.errors
        .map(err => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      throw new Error(`Validation error: ${formatted}`);
    }
    throw error;
  }
}
