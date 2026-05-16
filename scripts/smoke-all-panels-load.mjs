#!/usr/bin/env node
/**
 * Smoke: load every panel from PANEL_REGISTRY (via Vite context).
 * Writes docs/smoke-system/panel-load-results.json.
 * Exit 0 only if all panels load and export a default.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const result = spawnSync(
  "pnpm",
  ["exec", "vite-node", "client/smoke-panel-load-runner.ts"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, NODE_ENV: "test" },
  }
);

process.exit(result.status ?? 1);
