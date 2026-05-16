#!/usr/bin/env node
/**
 * Unminify Files Script
 * 
 * CRITICAL DISCOVERY: Files were minified BEFORE being committed to git.
 * Git history contains minified versions, so we can't restore from git.
 * 
 * Solution: Use Prettier to reformat (unminify) the files.
 * Prettier will properly format the code with proper line breaks and spacing.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find minified files (files with < 25 lines but > 3000 chars)
 */
function findMinifiedFiles(rootDir) {
  const minifiedFiles = [];
  const extensions = [".tsx", ".ts"];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.name === "node_modules" ||
        entry.name === "dist" ||
        entry.name === ".git" ||
        entry.name.startsWith(".")
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (
        entry.isFile() &&
        extensions.some((ext) => entry.name.endsWith(ext))
      ) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const lines = content.split("\n").length;
          const size = content.length;

          // Minified files: < 25 lines but > 3000 chars
          if (lines < 25 && size > 3000) {
            if (
              content.includes('} from"') ||
              content.includes('}from"') ||
              lines < 20
            ) {
              minifiedFiles.push({
                filepath: fullPath,
                lines,
                size,
              });
            }
          }
        } catch (error) {
          // Skip files we can't read
        }
      }
    }
  }

  walkDir(rootDir);
  return minifiedFiles;
}

/**
 * Use Prettier to format (unminify) a file
 */
function formatFile(filepath) {
  try {
    // Use Prettier to format the file
    execSync(`npx prettier --write "${filepath}"`, {
      encoding: "utf8",
      stdio: "pipe",
    });

    // Check if formatting helped
    const content = fs.readFileSync(filepath, "utf8");
    const lines = content.split("\n").length;

    if (lines > 25) {
      console.log(`  ✅ Formatted: ${filepath} (now ${lines} lines)`);
      return true;
    } else {
      console.log(`  ⚠️  Still minified: ${filepath} (${lines} lines)`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Error formatting ${filepath}:`, error.message);
    return false;
  }
}

// Main
console.log("🔍 Scanning for minified files...\n");

const rootDir = path.resolve(__dirname, "..");
const modulesDir = path.join(rootDir, "client", "modules");
const minifiedFiles = findMinifiedFiles(modulesDir);

console.log(`Found ${minifiedFiles.length} minified files\n`);

if (minifiedFiles.length === 0) {
  console.log("✅ No minified files found!");
  process.exit(0);
}

// Focus on critical files first (index.tsx files that break builds)
const criticalFiles = minifiedFiles.filter((f) =>
  f.filepath.includes("/index.tsx")
);
const otherFiles = minifiedFiles.filter((f) => !f.filepath.includes("/index.tsx"));

console.log(`📁 Critical files (index.tsx): ${criticalFiles.length}`);
console.log(`📁 Other files: ${otherFiles.length}\n`);

console.log("🔧 Formatting critical files first...\n");

let formatted = 0;
let failed = 0;

// Format critical files first
for (const file of criticalFiles) {
  if (formatFile(file.filepath)) {
    formatted++;
  } else {
    failed++;
  }
}

console.log(`\n📊 Critical Files Summary:`);
console.log(`  ✅ Formatted: ${formatted}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📁 Total: ${criticalFiles.length}`);

if (otherFiles.length > 0) {
  console.log(`\n⚠️  ${otherFiles.length} other minified files found.`);
  console.log(`   Run again to format those, or format individually.`);
}

if (formatted > 0) {
  console.log(`\n✅ Successfully formatted ${formatted} critical files!`);
  console.log(`   Please test the build to verify fixes.`);
}
