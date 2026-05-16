/**
 * Safe require/import for optional dependencies.
 * Prevents dev server crashes when optional packages aren't installed.
 *
 * Usage:
 *  const mod = safeRequire("@vercel/postgres");
 *  if (!mod) { ...fallback... }
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function safeRequire<T = any>(moduleName: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(moduleName) as T;
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    // Only suppress "cannot find module" errors; rethrow others.
    if (
      msg.includes("Cannot find module") ||
      msg.includes("cannot find module")
    ) {
      console.warn(`[safeRequire] Optional dependency missing: ${moduleName}`);
      return null;
    }
    console.error(`[safeRequire] Error loading ${moduleName}:`, err);
    throw err;
  }
}
