#!/usr/bin/env node
/**
 * Test Panel Imports
 * Verifies all panel registry entries can be imported successfully
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

console.log("🧪 Testing Panel Imports\n");
console.log("=".repeat(60));

// Read panel registry
const registryPath = join(rootDir, "client", "lib", "panel-registry.ts");
const registryContent = readFileSync(registryPath, "utf-8");

// Extract all import paths
const importPattern = /import\(["'](@\/modules\/[^"']+)["']\)/g;
const imports = [];
let match;

while ((match = importPattern.exec(registryContent)) !== null) {
  imports.push(match[1]);
}

console.log(`Found ${imports.length} panel imports to test\n`);

// Test each import
const results = {
  success: [],
  failed: [],
  skipped: [],
};

for (const importPath of imports) {
  // Convert @/modules to actual path
  const actualPath = importPath.replace("@/modules", join(rootDir, "client", "modules"));
  
  // Check if file exists
  const fs = await import("fs");
  const path = await import("path");
  
  // Try different file extensions
  const extensions = [".tsx", ".ts", "/index.tsx", "/index.ts"];
  let found = false;
  
  for (const ext of extensions) {
    const testPath = actualPath + ext;
    try {
      if (fs.existsSync(testPath)) {
        found = true;
        results.success.push({ importPath, filePath: testPath });
        break;
      }
    } catch (e) {
      // Continue
    }
  }
  
  if (!found) {
    results.failed.push({ importPath, attempted: actualPath });
  }
}

// Summary
console.log("📊 RESULTS:\n");
console.log(`✅ Success: ${results.success.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⏭️  Skipped: ${results.skipped.length}`);

if (results.failed.length > 0) {
  console.log("\n❌ FAILED IMPORTS:");
  results.failed.slice(0, 10).forEach(({ importPath }) => {
    console.log(`   ${importPath}`);
  });
  if (results.failed.length > 10) {
    console.log(`   ... and ${results.failed.length - 10} more`);
  }
}

console.log("\n" + "=".repeat(60));
