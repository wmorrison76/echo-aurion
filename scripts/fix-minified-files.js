#!/usr/bin/env node
/**
 * Fix Minified Files Script
 * Identifies and restores minified source files from git history
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findMinifiedFiles(rootDir) {
  const minifiedFiles = [];
  const extensions = [".tsx", ".ts", ".jsx", ".js"];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules and build directories
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

          // Minified files typically have < 25 lines but > 3000 chars
          if (lines < 25 && size > 3000) {
            // Check for minification patterns
            if (
              content.includes('} from"') ||
              content.includes('}from"') ||
              lines < 20
            ) {
              minifiedFiles.push({
                filepath: fullPath,
                lines,
                size,
                reason: `Minified: ${lines} lines, ${size} chars`,
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

function restoreFromGit(filepath) {
  try {
    // Try HEAD first
    try {
      const gitContent = execSync(`git show HEAD:${filepath}`, {
        encoding: "utf8",
        stdio: "pipe",
      });

      const gitLines = gitContent.split("\n").length;
      if (gitLines > 25) {
        fs.writeFileSync(filepath, gitContent, "utf8");
        console.log(`  ✅ Restored from HEAD: ${filepath}`);
        return true;
      }
    } catch (e) {
      // File might not be in HEAD
    }

    // Try to find last commit
    try {
      const lastCommit = execSync(
        `git log --format="%H" -1 -- "${filepath}"`,
        { encoding: "utf8", stdio: "pipe" }
      )
        .toString()
        .trim();

      if (lastCommit) {
        const gitContent = execSync(`git show ${lastCommit}:${filepath}`, {
          encoding: "utf8",
          stdio: "pipe",
        });

        const gitLines = gitContent.split("\n").length;
        if (gitLines > 25) {
          fs.writeFileSync(filepath, gitContent, "utf8");
          console.log(
            `  ✅ Restored from commit ${lastCommit.substring(0, 8)}: ${filepath}`
          );
          return true;
        }
      }
    } catch (e) {
      // Couldn't restore
    }

    console.log(`  ⚠️  Could not restore from git: ${filepath}`);
    return false;
  } catch (error) {
    console.error(`  ❌ Error restoring ${filepath}:`, error.message);
    return false;
  }
}

// Main
console.log("🔍 Scanning for minified files...\n");

const rootDir = path.resolve(__dirname, "..");
const modulesDir = path.join(rootDir, "client", "modules");
const minifiedFiles = findMinifiedFiles(modulesDir);

console.log(`Found ${minifiedFiles.length} potentially minified files:\n`);

if (minifiedFiles.length === 0) {
  console.log("✅ No minified files found!");
  process.exit(0);
}

// Group by module
const byModule = {};
for (const file of minifiedFiles) {
  const parts = file.filepath.split(path.sep);
  const moduleIdx = parts.indexOf("modules");
  const moduleName =
    moduleIdx >= 0
      ? parts.slice(moduleIdx + 1, -1).join("/")
      : path.dirname(file.filepath);
  if (!byModule[moduleName]) {
    byModule[moduleName] = [];
  }
  byModule[moduleName].push(file);
}

console.log("Minified files by module:");
for (const [module, files] of Object.entries(byModule)) {
  console.log(`\n📁 ${module}:`);
  for (const file of files) {
    console.log(`  ${path.basename(file.filepath)}: ${file.reason}`);
  }
}

console.log("\n\n🔧 Attempting to restore files from git history...\n");

let restored = 0;
let failed = 0;

for (const file of minifiedFiles) {
  if (restoreFromGit(file.filepath)) {
    restored++;
  } else {
    failed++;
  }
}

console.log(`\n\n📊 Summary:`);
console.log(`  ✅ Restored: ${restored}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📁 Total: ${minifiedFiles.length}`);

if (failed > 0) {
  console.log(`\n⚠️  ${failed} files could not be automatically restored.`);
  console.log(`   These files may need manual restoration or formatting.`);
}

if (restored > 0) {
  console.log(`\n✅ Successfully restored ${restored} files from git history!`);
  console.log(`   Please review the changes and test the build.`);
}
