#!/usr/bin/env node
/**
 * Smoke: Open Core Panels (static validation)
 *
 * Ensures core panels resolve to real modules (no stubs).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const clientRoot = path.join(projectRoot, "client");
const panelRegistryPath = path.join(clientRoot, "lib", "panel-registry.ts");

const corePanels = [
  "dashboard",
  "culinary",
  "pastry",
  "inventory",
  "purchasing-receiving",
  "maestro-bqt",
  "aurum",
  "studio",
  "mixology_sommelier",
  "schedule",
  "layout",
  "events",
  "stratus",
];

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function resolveImportPath(importPath) {
  if (importPath.startsWith("@/")) {
    return path.join(clientRoot, importPath.replace("@/", ""));
  }
  return path.join(clientRoot, importPath);
}

function resolveFileCandidate(fullPath) {
  if (fileExists(fullPath)) {
    return fullPath;
  }
  const candidates = [
    `${fullPath}.tsx`,
    `${fullPath}.ts`,
    path.join(fullPath, "index.tsx"),
    path.join(fullPath, "index.ts"),
  ];
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

function extractRegistryBlock(content) {
  const registryStart = content.indexOf("export const PANEL_REGISTRY");
  if (registryStart === -1) return null;
  const braceStart = content.indexOf("{", registryStart);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < content.length; i += 1) {
    const char = content[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(braceStart + 1, i);
      }
    }
  }
  return null;
}

function extractRegistryEntries() {
  if (!fileExists(panelRegistryPath)) {
    throw new Error("panel-registry.ts not found");
  }
  const content = fs.readFileSync(panelRegistryPath, "utf-8");
  const registryBlock = extractRegistryBlock(content);
  if (!registryBlock) {
    throw new Error("panel-registry.ts registry block not found");
  }
  const entries = {};
  let currentKey = null;
  registryBlock.split("\n").forEach((line) => {
    const keyMatch = line.match(/^\s*(?:"([^"]+)"|([a-zA-Z0-9_]+))\s*:/);
    if (keyMatch) {
      currentKey = keyMatch[1] || keyMatch[2];
    }
    if (currentKey) {
      const importMatch = line.match(/import\(["']([^"']+)["']\)/);
      if (importMatch) {
        entries[currentKey] = importMatch[1];
        currentKey = null;
      }
    }
  });
  return entries;
}

const entries = extractRegistryEntries();
const errors = [];

corePanels.forEach((panelKey) => {
  const importPath = entries[panelKey];
  if (!importPath) {
    errors.push(`Missing core panel entry: ${panelKey}`);
    return;
  }

  if (importPath.includes("/_stubs/") || importPath.includes("\\_stubs\\")) {
    errors.push(`Core panel uses stub module: ${panelKey} -> ${importPath}`);
    return;
  }

  const resolved = resolveImportPath(importPath);
  const filePath = resolveFileCandidate(resolved);
  if (!filePath) {
    errors.push(`Core panel import missing file: ${panelKey} -> ${importPath}`);
  }
});

if (errors.length) {
  console.log("❌ Core panel smoke check failed:");
  errors.forEach((error) => console.log(`- ${error}`));
  process.exit(1);
}

console.log("✅ Core panel smoke check passed.");
