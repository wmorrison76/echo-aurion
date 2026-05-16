/**
 * Strict Mode (A4.6)
 *
 * The prospect-to-plate chain has two intentional soft-fail paths from
 * earlier tickets:
 *
 *   - A2's createBEOFromEvent: when the underlying beo_banquet_orders
 *     INSERT fails (commonly because the dev DB doesn't have a
 *     department fixture or a calendar_events row yet), the engine
 *     uses a placeholder UUID so the chain keeps running. The chef
 *     sees a warn log; the failure is otherwise invisible.
 *
 *   - A3's scaleBEORecipes: when the recipes catalog has no row for a
 *     linked recipe id, the service falls back to a one-line inferred
 *     recipe (1 portion per guest) so the BEO can still be priced. The
 *     warning is in result.warnings.
 *
 * Both behaviors are correct for dev (chain stays alive while fixtures
 * are being built), wrong for production (silent data quality issues).
 *
 * This module gives operators a single switch to flip both paths from
 * soft-fail to fail-loud. Callers can also override per-call when they
 * need finer control (e.g. a "what-if" preview that should never crash
 * even on a strict deploy).
 *
 * Resolution order, highest priority first:
 *   1. Per-call `allowSoftFail` — explicit caller wins.
 *   2. Per-feature env vars (RECIPE_CHAIN_STRICT, BEO_CHAIN_STRICT) —
 *      lets operators tighten one part of the chain without the other.
 *   3. Global RECIPE_STRICT_MODE env var.
 *   4. NODE_ENV — production defaults to strict, everything else to
 *      soft-fail. (Conservative: existing prod deploys that haven't
 *      set any of the env vars above will switch to strict; flip
 *      RECIPE_STRICT_MODE=false to opt out during migration.)
 *
 * Defaults are deliberately conservative for production correctness.
 * Opt out explicitly when you need the soft-fail behavior.
 */

export type StrictArea = "beo-create" | "recipe-scale" | "general";

function envFlag(name: string): boolean | undefined {
  const v = process.env[name];
  if (v == null) return undefined;
  const norm = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(norm)) return true;
  if (["0", "false", "no", "off"].includes(norm)) return false;
  return undefined;
}

/**
 * Decide whether a given soft-fail site should fail loudly.
 *
 *   isStrict({ area: "beo-create" })
 *   isStrict({ area: "recipe-scale", allowSoftFail: true })
 */
export function isStrict(opts: {
  area: StrictArea;
  allowSoftFail?: boolean;
}): boolean {
  // 1. Caller override wins.
  if (typeof opts.allowSoftFail === "boolean") {
    return !opts.allowSoftFail;
  }

  // 2. Per-area env var.
  if (opts.area === "beo-create") {
    const f = envFlag("BEO_CHAIN_STRICT");
    if (typeof f === "boolean") return f;
  } else if (opts.area === "recipe-scale") {
    const f = envFlag("RECIPE_CHAIN_STRICT");
    if (typeof f === "boolean") return f;
  }

  // 3. Global env var.
  const global = envFlag("RECIPE_STRICT_MODE");
  if (typeof global === "boolean") return global;

  // 4. Default by NODE_ENV.
  return (process.env.NODE_ENV || "").toLowerCase() === "production";
}

/**
 * StrictModeError — thrown by soft-fail sites when strict mode is on.
 * Carries an `area` so observability layers can group failures by which
 * part of the chain rejected the action.
 */
export class StrictModeError extends Error {
  area: StrictArea;
  details?: Record<string, unknown>;

  constructor(area: StrictArea, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "StrictModeError";
    this.area = area;
    this.details = details;
  }
}
