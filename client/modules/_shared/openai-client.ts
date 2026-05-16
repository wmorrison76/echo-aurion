/**
 * D17c-followup · Shared OpenAI client for sub-modules.
 *
 * Each sub-module under client/modules/ ships with its own server/
 * bundle that has an INDEPENDENT build, so it can't import from
 * server/lib/env.ts (D17c canonical). Until those builds get
 * unified, this shared helper sits in client/modules/_shared/
 * (which IS reachable via the @/modules/* alias) and gives every
 * sub-module the same lazy-singleton + env policy.
 *
 * The 12 sub-module sites the audit flagged (EchoCanvasStudio,
 * Schedule, etc.) replace `new OpenAI(...)` with
 * `getSubmoduleOpenAIClient()`.
 *
 * Behavior matches D17c's getOpenAIClient():
 *   · returns null when OPENAI_API_KEY is unset (caller degrades)
 *   · OPENAI_BASE_URL env override honored
 *   · single instance per process (token counter + pool shared)
 *
 * If the import path becomes a problem in a sub-module's build,
 * fall back to the D17e pattern: inline a 5-line copy of this
 * function at the top of that file. Same behavior, isolated build.
 */

let _client: any = undefined;

export function getSubmoduleOpenAIClient(): any {
  if (_client !== undefined) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    _client = null;
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require("openai").default ?? require("openai").OpenAI;
  _client = new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  });
  return _client;
}

export function getSubmoduleOpenAIClientOrThrow(): any {
  const c = getSubmoduleOpenAIClient();
  if (!c) {
    throw new Error(
      "submodule fuse-box: OPENAI_API_KEY is not wired. Set it in " +
      ".env or your secrets manager and restart."
    );
  }
  return c;
}

/** Test seam — clear the cache so unit tests can re-bind env. */
export function _resetSubmoduleOpenAICacheForTests(): void {
  _client = undefined;
}
