#!/usr/bin/env node
/**
 * Theme hardcoded color enforcement
 * Fails if hardcoded colors appear in restricted areas.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const INCLUDED_DIRS = [
  "client/modules",
  "client/components",
  "client/pages",
  "client/layouts",
];

const EXCLUDED_DIRS = [
  "client/components/ui",
  "client/modules/**/components/ui",
];

const EXCLUDED_FILES = [
  "client/global.css",
  "client/tailwind.config.ts",
  "tailwind.config.ts",
];

const EXTENSIONS = [".ts", ".tsx", ".css"];

const ALLOWLIST_MARKER = "theme-hardcoded-ok";

const COLOR_PATTERNS = [
  /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
  /\b(?:rgb|rgba|hsl|hsla)\(/gi,
];

function matchesExcludedDir(filePath) {
  return EXCLUDED_DIRS.some((entry) => {
    const normalized = entry.replace("/**", "");
    return filePath.includes(normalized);
  });
}

function matchesExcludedFile(filePath) {
  return EXCLUDED_FILES.some((entry) => filePath.endsWith(entry));
}

function walk(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
      continue;
    }
    if (!EXTENSIONS.includes(path.extname(entry.name))) continue;
    results.push(fullPath);
  }
  return results;
}

const filesToScan = INCLUDED_DIRS.flatMap((dir) =>
  walk(path.join(projectRoot, dir))
).filter((filePath) => !matchesExcludedDir(filePath) && !matchesExcludedFile(filePath));

const violations = [];

for (const filePath of filesToScan) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (line.includes(ALLOWLIST_MARKER)) return;
    for (const pattern of COLOR_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          violations.push({
            file: path.relative(projectRoot, filePath),
            line: index + 1,
            match,
            snippet: line.trim(),
          });
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error("❌ Hardcoded color violations found:");
  violations.forEach((violation) => {
    console.error(
      `- ${violation.file}:${violation.line} "${violation.match}" -> ${violation.snippet}`
    );
  });
  process.exit(1);
}

console.log("✅ Theme hardcoded color check passed.");
