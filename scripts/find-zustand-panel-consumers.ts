/**
 * PanelHost Conflict Detector — find files that read from Zustand panel stores.
 * When the old PanelHost (React useState) is active, these consumers see stale/empty state.
 *
 * Run: pnpm run audit:panelhost-conflict
 * Output: audit/zustand-panel-consumers.json + console report
 */

import * as fs from "fs";
import * as path from "path";

const PROJECT_ROOT = process.cwd();
const CLIENT_DIR = path.join(PROJECT_ROOT, "client");
const AUDIT_DIR = path.join(PROJECT_ROOT, "audit");

interface StoreConsumer {
  file: string;
  line: number;
  store: "panel-store-enhanced" | "panel-store" | "unified-panel-store" | "echocoder-panel-store";
  importedSymbol: string;
  risk: "HIGH" | "MEDIUM" | "LOW";
  explanation: string;
}

const consumers: StoreConsumer[] = [];

const storePatterns: Array<{
  store: StoreConsumer["store"];
  patterns: RegExp[];
  risk: StoreConsumer["risk"];
  explanation: string;
}> = [
  {
    store: "panel-store-enhanced",
    patterns: [
      /from\s+['"].*panel-store-enhanced['"]/,
      /usePanelStoreEnhanced/,
    ],
    risk: "HIGH",
    explanation:
      "This file reads from the Zustand enhanced panel store, but the old PanelHost uses React useState. This code will see EMPTY/STALE state at runtime.",
  },
  {
    store: "panel-store",
    patterns: [
      /from\s+['"].*\/panel-store['"]/,
      /from\s+['"]@\/lib\/stores\/panel-store['"]/,
      /usePanelStore(?!Enhanced)/,
    ],
    risk: "MEDIUM",
    explanation:
      "This file reads from the simple Zustand panel store. If the old PanelHost does not sync to this store, data will be stale.",
  },
  {
    store: "unified-panel-store",
    patterns: [
      /from\s+['"].*unified-panel-store['"]/,
    ],
    risk: "HIGH",
    explanation:
      "This file reads from the unified panel store which delegates to panel-store-enhanced. Same divergence risk.",
  },
  {
    store: "echocoder-panel-store",
    patterns: [
      /from\s+['"].*EchoCoder.*usePanelStore['"]/,
    ],
    risk: "LOW",
    explanation:
      "EchoCoder has its own panel store; lower risk for main app PanelHost divergence.",
  },
];

function collectFiles(dir: string, ext: string[]): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "diagnostics") {
        out.push(...collectFiles(full, ext));
      }
    } else if (e.isFile() && ext.some((x) => e.name.endsWith(x))) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  const files = collectFiles(CLIENT_DIR, [".ts", ".tsx"]);

  for (const file of files) {
    const rel = path.relative(PROJECT_ROOT, file);
    if (
      rel.includes("panel-store-enhanced.ts") ||
      rel.includes("panel-store.ts") ||
      rel.includes("unified-panel-store.ts")
    )
      continue;
    const source = fs.readFileSync(file, "utf-8");
    const lines = source.split("\n");

    for (const { store, patterns, risk, explanation } of storePatterns) {
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of patterns) {
          if (pattern.test(lines[i])) {
            consumers.push({
              file: rel,
              line: i + 1,
              store,
              importedSymbol: lines[i].trim(),
              risk,
              explanation,
            });
          }
        }
      }
    }
  }

  const byFile = new Map<string, StoreConsumer[]>();
  for (const c of consumers) {
    const list = byFile.get(c.file) ?? [];
    list.push(c);
    byFile.set(c.file, list);
  }
  const deduped: StoreConsumer[] = [];
  for (const [, list] of byFile) {
    const byStore = new Map<string, StoreConsumer>();
    for (const c of list) {
      const key = `${c.store}:${c.line}`;
      if (!byStore.has(key) || (c.risk === "HIGH" && byStore.get(key)!.risk !== "HIGH"))
        byStore.set(key, c);
    }
    deduped.push(...byStore.values());
  }
  const sorted = deduped.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.risk] - order[b.risk] || a.file.localeCompare(b.file);
  });

  console.log(`\n🔍 Found ${sorted.length} Zustand panel store consumers\n`);

  const high = sorted.filter((c) => c.risk === "HIGH");
  const medium = sorted.filter((c) => c.risk === "MEDIUM");
  const low = sorted.filter((c) => c.risk === "LOW");

  if (high.length > 0) {
    console.log(`🚨 HIGH RISK (${high.length} files) — These will see WRONG state:`);
    for (const c of high) {
      console.log(`   ${c.file}:${c.line}`);
      console.log(`     ${c.importedSymbol}`);
      console.log(`     → ${c.explanation}\n`);
    }
  }

  if (medium.length > 0) {
    console.log(`⚠️  MEDIUM RISK (${medium.length} files):`);
    for (const c of medium) {
      console.log(`   ${c.file}:${c.line}`);
    }
  }

  if (low.length > 0) {
    console.log(`\n📋 LOW RISK (${low.length} files):`);
    for (const c of low) {
      console.log(`   ${c.file}:${c.line}`);
    }
  }

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(AUDIT_DIR, "zustand-panel-consumers.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        total: sorted.length,
        high: high.length,
        medium: medium.length,
        low: low.length,
        consumers: sorted,
      },
      null,
      2
    )
  );

  if (high.length > 0) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`VERDICT: ${high.length} files read panel state from Zustand`);
    console.log(`while the active PanelHost writes to React useState.`);
    console.log(`This can cause panels to not render or show wrong state.`);
    console.log(`${"=".repeat(60)}\n`);
    console.log(`Options:`);
    console.log(`  1. Switch to PanelHostIntegrated (use the Zustand path)`);
    console.log(`  2. Make old PanelHost sync its state TO the Zustand store`);
    console.log(`  3. Change these ${high.length} files to not depend on Zustand panel state`);
  }

  console.log(`\n   Report: audit/zustand-panel-consumers.json`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
