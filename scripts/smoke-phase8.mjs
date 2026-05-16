#!/usr/bin/env node
/**
 * Smoke: Phase 8A Shadow Agents
 * Static validation for shadow-only agent contracts + supervisor.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const files = {
  supervisor: path.join(projectRoot, "server", "services", "agent-supervisor.ts"),
  routes: path.join(projectRoot, "server", "routes", "agent-supervisor.ts"),
  contracts: path.join(projectRoot, "shared", "types", "agent-contracts.ts"),
};

const missingFiles = Object.entries(files).filter(([, filePath]) => !fs.existsSync(filePath));
if (missingFiles.length) {
  console.error("❌ Missing Phase 8A files:");
  missingFiles.forEach(([key, filePath]) => console.error(`- ${key}: ${filePath}`));
  process.exit(1);
}

const supervisorContent = fs.readFileSync(files.supervisor, "utf-8");
const routesContent = fs.readFileSync(files.routes, "utf-8");

const checks = [
  { label: "shadow mode enforced", ok: supervisorContent.includes("shadow") },
  { label: "trace emission", ok: supervisorContent.includes("emitTrace") },
  { label: "control-plane consult", ok: supervisorContent.includes("consultControlPlane") },
  { label: "proposal route", ok: routesContent.includes("/api/agents/proposals") },
  { label: "action route", ok: routesContent.includes("/api/agents/actions") },
  { label: "jwt auth enforced", ok: routesContent.includes("jwtAuthMiddleware") },
  { label: "role enforcement", ok: routesContent.includes("requireRole") },
];

const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error("❌ Phase 8A smoke checks failed:");
  failed.forEach((check) => console.error(`- ${check.label}`));
  process.exit(1);
}

console.log("✅ Phase 8A shadow agent smoke checks passed.");
