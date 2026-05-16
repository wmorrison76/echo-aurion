#!/usr/bin/env node
/**
 * Panel Registry Audit
 *
 * - Verifies import targets exist
 * - Flags stubbed module paths
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const clientRoot = path.join(projectRoot, "client");
const panelRegistryPath = path.join(clientRoot, "lib", "panel-registry.ts");

const errors = [];
const warnings = [];

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function resolveImportPath(importPath) {
  if (importPath.startsWith("@/modules/")) {
    return path.join(clientRoot, importPath.replace("@/", ""));
  }
  if (importPath.startsWith("@/components/")) {
    return path.join(clientRoot, importPath.replace("@/", ""));
  }
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
    errors.push("panel-registry.ts not found");
    return [];
  }
  const content = fs.readFileSync(panelRegistryPath, "utf-8");
  const registryBlock = extractRegistryBlock(content);
  if (!registryBlock) {
    errors.push("panel-registry.ts registry block not found");
    return [];
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
  return Object.values(entries);
}

const imports = extractRegistryEntries();

console.log("🔎 Panel Registry Audit\n");
console.log(`Found ${imports.length} dynamic imports.\n`);

imports.forEach((importPath) => {
  const resolved = resolveImportPath(importPath);
  const filePath = resolveFileCandidate(resolved);
  const isStub = importPath.includes("/_stubs/") || importPath.includes("\\_stubs\\");

  if (isStub) {
    errors.push(`Stubbed module detected: ${importPath}`);
  }

  if (!filePath) {
    errors.push(`Missing module file for import: ${importPath}`);
    return;
  }

  if (importPath.includes("node_modules")) {
    warnings.push(`Unexpected import from node_modules: ${importPath}`);
  }
});

if (warnings.length) {
  console.log("⚠️  Warnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
  console.log("");
}

if (errors.length) {
  console.log("❌ Errors:");
  errors.forEach((error) => console.log(`- ${error}`));
  process.exit(1);
}

console.log("✅ Panel registry audit passed.");
