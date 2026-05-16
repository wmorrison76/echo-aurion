/**
 * LUCCCA Diagnostic Harness — Module contract types and base list.
 * Use generate-contracts.ts to produce module-contracts.generated.ts from panel-registry.
 */

export interface ModuleContract {
  id: string;
  openMethod: "url" | "programmatic";
  url?: string;
  openScript?: string;
  expect: {
    rootSelector: string;
    textContent?: string[];
  };
  timeoutMs?: number;
}

export const MODULE_CONTRACTS: ModuleContract[] = [];
