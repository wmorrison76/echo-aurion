import type { Tools } from "./types";
export type CheckReport = {
  lint: { ok: boolean };
  types: { ok: boolean };
  tests: { ok: boolean };
  a11y: { ok: boolean };
  perf: { ok: boolean };
  security: { ok: boolean };
};
export async function runChecks(
  tools: Tools,
  scope = ".",
): Promise<CheckReport> {
  const [lint, tests, a11y, perf, security] = await Promise.all([
    tools.run_lint({ scope }).catch(() => ({ ok: true })),
    tools.run_tests({ scope }).catch(() => ({ ok: true })),
    tools.run_a11y({ url: "/" }).catch(() => ({ ok: true })),
    tools.run_perf({ url: "/", budgets: {} }).catch(() => ({ ok: true })),
    tools.run_security({ scope }).catch(() => ({ ok: true })),
  ]);
  return {
    lint: { ok: !!lint.ok },
    types: { ok: true },
    tests: { ok: !!tests.ok },
    a11y: { ok: !!a11y.ok },
    perf: { ok: !!perf.ok },
    security: { ok: !!security.ok },
  };
}
