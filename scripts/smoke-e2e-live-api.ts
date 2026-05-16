/**
 * Optional E2E: Live API pass for spine-chain and trace-ledger.
 * Run with the server up to validate real wiring (production readiness).
 *
 * Usage:
 *   Start server: pnpm dev:backend (or start)
 *   Then: SMOKE_E2E_BASE_URL=http://localhost:3001 pnpm exec tsx scripts/smoke-e2e-live-api.ts
 *
 * If SMOKE_E2E_BASE_URL is not set, the script exits 0 without making requests
 * (so the main smoke harness does not require a running server).
 */

const BASE_URL =
  process.env.SMOKE_E2E_BASE_URL || process.env.SMOKE_E2E ? "http://localhost:3001" : "";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

async function run(): Promise<void> {
  if (!BASE_URL) {
    process.exit(0);
    return;
  }

  const healthRes = await fetch(`${BASE_URL}/api/health-check`, { method: "GET" }).catch(() => null);
  assert(healthRes?.ok ?? false, "Health check failed or server not reachable");

  const spineRes = await fetch(`${BASE_URL}/api/spine-chain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId: "e2e-org",
      nodes: [
        { id: "n1", type: "invoice", label: "Invoice" },
        { id: "n2", type: "recipe", label: "Recipe" },
      ],
      links: [{ fromId: "n1", toId: "n2", relation: "feeds" }],
    }),
  }).catch(() => null);
  assert(spineRes?.ok ?? false, "Spine-chain POST failed");
  const spineJson = await spineRes!.json().catch(() => ({}));
  assert(spineJson?.id != null, "Spine-chain response missing chain id");

  const traceRes = await fetch(`${BASE_URL}/api/trace-ledger`, { method: "GET" }).catch(() => null);
  assert(traceRes?.ok ?? false, "Trace-ledger GET failed");
  const traceJson = await traceRes!.json().catch(() => ({}));
  const hasRecords =
    Array.isArray(traceJson) ||
    (traceJson?.records != null && Array.isArray(traceJson.records)) ||
    (traceJson?.entries != null && Array.isArray(traceJson.entries));
  assert(hasRecords, "Trace-ledger response must have records, entries, or be an array");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[smoke-e2e-live-api]", err?.message ?? err);
    process.exit(1);
  });
