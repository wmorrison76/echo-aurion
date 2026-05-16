#!/usr/bin/env node
/**
 * Fix Minified Files Script
 * 
 * This script identifies and restores minified source files from git history.
 * Minified files are identified by having very few lines (< 25) but large file sizes (> 3000 chars).
 * 
 * Usage: npm run fix-minified-files
 * Or: tsx scripts/fix-minified-files.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MinifiedFile {
  filepath: string;
  lines: number;
  size: number;
  reason: string;
}

/**
 * Check if a file appears to be minified
 */
function isMinified(filepath: string): MinifiedFile | null {
  try {
    const content = fs.readFileSync(filepath, "utf8");
    const lines = content.split("\n").length;
    const size = content.length;

    // Minified files typically have:
    // - Very few lines (< 25)
    // - Large file size (> 3000 chars)
    // - Patterns like: } from"react" (no space before quote)
    // - Multiple statements on single lines

    if (lines < 25 && size > 3000) {
      // Check for minification patterns
      const hasMinifiedPatterns =
        content.includes('} from"') ||
        content.includes('}from"') ||
        content.includes('import.*from"') ||
        (lines < 20 && size > 5000);

      if (hasMinifiedPatterns) {
        return {
          filepath,
          lines,
          size,
          reason: `Minified pattern detected: ${lines} lines, ${size} chars`,
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Find all minified files in the codebase
 */
function findMinifiedFiles(rootDir: string): MinifiedFile[] {
  const minifiedFiles: MinifiedFile[] = [];
  const extensions = [".tsx", ".ts", ".jsx", ".js"];

  function walkDir(dir: string) {
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
        const result = isMinified(fullPath);
        if (result) {
          minifiedFiles.push(result);
        }
      }
    }
  }

  walkDir(rootDir);
  return minifiedFiles;
}

/**
 * Try to restore a file from git history
 */
function restoreFromGit(filepath: string): boolean {
  try {
    // Try to get the file from HEAD (current commit)
    try {
      const gitContent = execSync(
        `git show HEAD:${filepath}`,
        { encoding: "utf8", stdio: "pipe" }
      );
      
      // Check if the git version is not minified
      const gitLines = gitContent.split("\n").length;
      if (gitLines > 25) {
        // Git version looks good, restore it
        fs.writeFileSync(filepath, gitContent, "utf8");
        console.log(`  ✅ Restored from HEAD: ${filepath}`);
        return true;
      }
    } catch (e) {
      // File might not be in HEAD, try to find when it was last modified
    }

    // Try to find the last commit where file was modified
    try {
      const lastCommit = execSync(
        `git log --format="%H" -1 -- "${filepath}"`,
        { encoding: "utf8", stdio: "pipe" }
      ).trim();

      if (lastCommit) {
        const gitContent = execSync(
          `git show ${lastCommit}:${filepath}`,
          { encoding: "utf8", stdio: "pipe" }
        );

        const gitLines = gitContent.split("\n").length;
        if (gitLines > 25) {
          fs.writeFileSync(filepath, gitContent, "utf8");
          console.log(`  ✅ Restored from commit ${lastCommit.substring(0, 8)}: ${filepath}`);
          return true;
        }
      }
    } catch (e) {
      // Couldn't restore from git
    }

    console.log(`  ⚠️  Could not restore from git: ${filepath}`);
    return false;
  } catch (error) {
    console.error(`  ❌ Error restoring ${filepath}:`, error);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log("🔍 Scanning for minified files...\n");

  const rootDir = path.resolve(__dirname, "..");
  const minifiedFiles = findMinifiedFiles(path.join(rootDir, "client", "modules"));

  console.log(`Found ${minifiedFiles.length} potentially minified files:\n`);

  if (minifiedFiles.length === 0) {
    console.log("✅ No minified files found!");
    return;
  }

  // Group by directory for better reporting
  const byModule: Record<string, MinifiedFile[]> = {};
  for (const file of minifiedFiles) {
    const moduleName = file.filepath.split(path.sep).slice(-3, -1).join("/");
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
    console.log(
      `\n⚠️  ${failed} files could not be automatically restored.`,
    );
    console.log(`   These files may need manual restoration or formatting.`);
  }

  if (restored > 0) {
    console.log(
      `\n✅ Successfully restored ${restored} files from git history!`,
    );
    console.log(`   Please review the changes and test the build.`);
  }
}

// Run the script
const isMainModule = process.argv[1] === __filename || process.argv[1] === path.join(process.cwd(), 'scripts/fix-minified-files.ts');

if (isMainModule) {
  main();
}

export { findMinifiedFiles, restoreFromGit, isMinified };
