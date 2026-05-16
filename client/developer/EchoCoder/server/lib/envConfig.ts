/**
 * Environment variable configuration for production
 * Validates required variables on startup
 */

export interface EnvConfig {
  // Supabase (Server-side, not client)
  supabaseUrl: string;
  supabaseServiceRoleKey: string;

  // Sentry
  sentryDsn?: string;
  sentryAuthToken?: string;

  // OpenAI
  openaiApiKey?: string;

  // Node environment
  nodeEnv: "development" | "production" | "test";
  port: number;

  // Feature flags
  enableSentry: boolean;
  enableAuth: boolean;
}

export function loadEnvConfig(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV || "development") as
    | "development"
    | "production"
    | "test";

  const isDev = nodeEnv === "development";

  // Supabase - REQUIRED for production, optional for development
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    if (isDev) {
      console.warn(
        "⚠️  SUPABASE_URL not set. Database features will be unavailable.",
      );
    } else {
      throw new Error(
        "SUPABASE_URL environment variable is required. Set it to your Supabase project URL.",
      );
    }
  }

  if (!supabaseServiceRoleKey) {
    if (isDev) {
      console.warn(
        "⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Database features will be unavailable.",
      );
    } else {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY environment variable is required. Use the service role key from Supabase, NOT the anon key.",
      );
    }
  }

  // Validate it's a service role key (not anon key)
  if (
    supabaseServiceRoleKey &&
    !supabaseServiceRoleKey.startsWith("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")
  ) {
    console.warn(
      "⚠️  SUPABASE_SERVICE_ROLE_KEY may not be valid. Ensure you're using the service role key, not the anon key.",
    );
  }

  const config: EnvConfig = {
    supabaseUrl,
    supabaseServiceRoleKey,
    sentryDsn: process.env.SENTRY_DSN,
    sentryAuthToken: process.env.SENTRY_AUTH_TOKEN,
    openaiApiKey: process.env.ECHO_OPENAI_API_KEY,
    nodeEnv,
    port: parseInt(process.env.PORT || "3000", 10),
    enableSentry: !!process.env.SENTRY_DSN,
    enableAuth: process.env.ENABLE_AUTH !== "false", // Default enabled
  };

  // Validate configuration
  if (config.enableAuth && !config.enableSentry) {
    console.warn(
      "⚠️  Authentication enabled but Sentry not configured. Errors won't be tracked.",
    );
  }

  return config;
}

/**
 * Get singleton env config (loaded once on startup)
 */
let envConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!envConfig) {
    envConfig = loadEnvConfig();
  }
  return envConfig;
}

/**
 * Create Supabase client with server credentials
 */
export function createSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const config = getEnvConfig();

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Supabase credentials not configured");
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
}
