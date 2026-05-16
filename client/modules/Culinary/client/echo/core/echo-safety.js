/**
 * EchoAi³ Safety Layer
 * --------------------
 * Very lightweight placeholder for guardrails. Centralizes the
 * filtering logic so you can upgrade it later.
 */

const DEFAULT_BLOCKLIST = [
  /<script/i,
  /DROP\s+TABLE/i,
  /rm\s+-rf\s+\/?/i,
];

export function createSafetyLayer(options = {}) {
  const module = options.module || "UnknownModule";
  const extraBlocklist = options.blocklist || [];

  const blocklist = [...DEFAULT_BLOCKLIST, ...extraBlocklist];

  return {
    /**
     * Filter the user prompt and optionally replace / warn.
     */
    async filter(prompt) {
      let filtered = String(prompt ?? "");

      for (const pattern of blocklist) {
        if (pattern.test(filtered)) {
          console.warn(
            `[EchoAi³ Safety] Blocked pattern in module "${module}" for prompt: `,
            filtered
          );
          // Replace sensitive content but keep length similar.
          filtered = filtered.replace(pattern, "[filtered]");
        }
      }

      return filtered;
    },
  };
}
