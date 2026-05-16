/**
 * LUCCCA Diagnostic Harness — Layer 4: Auto-generate module contracts from panel-registry.
 * Output: scripts/module-contracts.generated.ts
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = process.cwd();
const REGISTRY_PATH = path.join(PROJECT_ROOT, "client/lib/panel-registry.ts");

function extractPanelKeys(source: string): string[] {
  const keys: string[] = [];
  const keyRe = /["']?([a-zA-Z0-9_-]+)["']?\s*:\s*(?:createSafeModuleLoader|\(\)\s*=>\s*import)/g;
  let m;
  while ((m = keyRe.exec(source)) !== null) {
    if (m[1]) keys.push(m[1]);
  }
  return [...new Set(keys)];
}

function main(): void {
  const source = fs.readFileSync(REGISTRY_PATH, "utf-8");
  const panelKeys = extractPanelKeys(source);

  const contracts = panelKeys.map((id) => ({
    id,
    openMethod: "programmatic" as const,
    openScript: `window.__DIAG_OPEN_PANEL__('${id}');`,
    expect: {
      rootSelector: `[data-module-root="${id}"]`,
    },
    timeoutMs: 10000,
  }));

  const output = `// AUTO-GENERATED — do not edit
// Regenerate with: npx tsx scripts/generate-contracts.ts

import type { ModuleContract } from "./module-contracts.js";

export const MODULE_CONTRACTS: ModuleContract[] = ${JSON.stringify(contracts, null, 2)};
`;

  fs.writeFileSync(path.join(PROJECT_ROOT, "scripts/module-contracts.generated.ts"), output);
  console.log(`Generated ${contracts.length} module contracts -> scripts/module-contracts.generated.ts`);
}

main();
