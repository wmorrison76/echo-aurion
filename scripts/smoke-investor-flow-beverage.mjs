#!/usr/bin/env node
/**
 * Smoke: Investor Flow (Beverage)
 * Static validation for investor-facing beverage flow documentation.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const demoDoc = path.join(projectRoot, "INVESTOR_MENU_FLOW_DEMO.md");

const requiredSnippets = ["investor", "menu", "beverage"];

if (!fs.existsSync(demoDoc)) {
  console.error("❌ Missing investor flow demo doc:", demoDoc);
  process.exit(1);
}

const content = fs.readFileSync(demoDoc, "utf-8").toLowerCase();
const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));

if (missing.length > 0) {
  console.error("❌ Investor flow demo missing required snippets:");
  missing.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

console.log("✅ Investor flow beverage smoke check passed.");
