/**
 * D17e · TS-side Fuse Box — single source for infrastructure env reads
 * on the Node/TS server bundle. Mirror of `backend/config.py`.
 *
 * Background: the audit found 5 places loading JWT_SECRET independently,
 * three of them with hardcoded dev fallbacks like
 *   "dev-secret-key-change-in-production"
 * that quietly become the live key if someone forgets to set it in
 * production. This module is the one place where those env reads
 * happen. Everything else imports from here.
 *
 * Conventions match `backend/config.py`:
 *   - LUCCCA_ENV is the canonical environment variable; falls back to
 *     NODE_ENV so an Electron / Node process gets the same answer as
 *     the Python backend
 *   - getJwtSecret() throws in production if not set; logs a one-time
 *     warning in dev and uses a stable dev default so HMR / restarts
 *     don't churn signed tokens
 *   - Singleton: first read constructs and caches; subsequent reads
 *     return the cached value
 */

export type LucccaEnv = "development" | "staging" | "production";

let _env: LucccaEnv | null = null;
export function getEnv(): LucccaEnv {
  if (_env) return _env;
  const raw = (process.env.LUCCCA_ENV ?? process.env.NODE_ENV ?? "development")
    .toLowerCase();
  if (raw === "prod" || raw === "production") _env = "production";
  else if (raw === "stage" || raw === "staging") _env = "staging";
  else _env = "development";
  return _env;
}

export const isProduction = (): boolean => getEnv() === "production";
export const isDevelopment = (): boolean => getEnv() === "development";

let _jwtSecret: string | null = null;
let _jwtWarned = false;

/**
 * Read the JWT_SECRET. Production: throws if unset. Development: stable
 * dev default + a one-time warning so you don't drown in the logs.
 *
 * The dev default is intentionally stable across restarts (no Date.now()
 * suffix) so signed tokens survive a watch-mode reload.
 */
export function getJwtSecret(): string {
  if (_jwtSecret) return _jwtSecret;
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length > 0) {
    _jwtSecret = fromEnv;
    return _jwtSecret;
  }
  if (isProduction()) {
    throw new Error(
      "fuse-box: JWT_SECRET is not set in production. Set it via .env " +
      "or your secrets manager and restart. Refusing to issue tokens."
    );
  }
  if (!_jwtWarned) {
    _jwtWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[fuse-box] JWT_SECRET not set; using stable dev default. " +
      "Set JWT_SECRET in .env for any non-development run."
    );
  }
  _jwtSecret = "luccca-dev-jwt-secret-not-for-production";
  return _jwtSecret;
}

// ─── OpenAI (LUCCCA's account, not per-tenant) ──────────────────────────

let _openaiKey: string | null | undefined = undefined;

/**
 * Read OPENAI_API_KEY. Returns null if unset — callers decide whether
 * that's fatal. (Some routes degrade to a "live AI features off" mode
 * rather than 500-ing.) The audit before D17c found 43 sites each
 * doing `process.env.OPENAI_API_KEY` inline; this is the new home.
 */
export function getOpenAIKey(): string | null {
  if (_openaiKey !== undefined) return _openaiKey;
  const v = process.env.OPENAI_API_KEY;
  _openaiKey = (v && v.length > 0) ? v : null;
  return _openaiKey;
}

export function getOpenAIBaseUrl(): string {
  return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
}

let _openaiClient: unknown = undefined;

/**
 * Lazy-singleton OpenAI client. First call constructs; subsequent
 * calls return the cached instance. Returns null if no key is wired —
 * callers that *require* the client should use getOpenAIClientOrThrow().
 *
 * Why a singleton: the openai SDK keeps a connection pool and a token
 * counter internally. Re-instantiating per request leaks both.
 */
export function getOpenAIClient(): any {
  if (_openaiClient !== undefined) return _openaiClient;
  const key = getOpenAIKey();
  if (!key) {
    _openaiClient = null;
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require("openai").default ?? require("openai").OpenAI;
  _openaiClient = new OpenAI({ apiKey: key, baseURL: getOpenAIBaseUrl() });
  return _openaiClient;
}

export function getOpenAIClientOrThrow(): any {
  const c = getOpenAIClient();
  if (!c) {
    throw new Error(
      "fuse-box: OPENAI_API_KEY is not wired. Set it in .env or the " +
      "secrets manager and restart the server."
    );
  }
  return c;
}

/** Test seam — clear the cache so unit tests can re-bind env. */
export function _resetEnvCacheForTests(): void {
  _env = null;
  _jwtSecret = null;
  _jwtWarned = false;
  _openaiKey = undefined;
  _openaiClient = undefined;
}
