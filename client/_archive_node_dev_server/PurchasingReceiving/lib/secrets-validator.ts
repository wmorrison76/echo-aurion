import { logger } from "./logger"; /** * Critical secrets required for production */
const CRITICAL_SECRETS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]; /** * Optional but recommended secrets */
const OPTIONAL_SECRETS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "VITE_SENTRY_DSN",
  "SENTRY_DSN",
]; /** * Validate all required secrets are present * Logs warnings but does not crash the app to allow degraded operation */
export function validateSecrets() {
  const environment = process.env.NODE_ENV || "development";
  const missing: string[] = [];
  const warnings: string[] = []; // Check critical secrets for (const secret of CRITICAL_SECRETS) { if (!process.env[secret]) { missing.push(secret); } } // Warn about missing critical secrets but don't crash if (missing.length > 0) { logger.warn( `⚠️ Missing critical secrets in ${environment}: ${missing.join(",")}. App will run in degraded mode.`, ); } // Check optional secrets for (const secret of OPTIONAL_SECRETS) { if (!process.env[secret]) { warnings.push(secret); } } if (warnings.length > 0) { logger.debug(`Optional secrets not configured: ${warnings.join(",")}`); } if (missing.length === 0) { logger.info("✓ All critical secrets validated"); }
}
