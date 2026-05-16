// SECURITY: Client-side environment variables ONLY
// Server-side secrets (OpenAI, database credentials, etc.) are NEVER exposed to client
// All sensitive operations are proxied through /api endpoints

export const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const VITE_SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";
export const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Validate required keys on load
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "⚠️ Supabase credentials not found. Database features may not work."
  );
}

// AI features require backend /api endpoints - never direct API key access
export const AI_FEATURES_ENABLED = true; // Controlled by /api endpoint availability
