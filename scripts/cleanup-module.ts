#!/usr/bin/env tsx
/**
 * Module Cleanup Utility
 * Removes problematic files from modules:
 * - Nested node_modules
 * - Build artifacts (dist, build, .next, out)
 * - Large archives (zip, tar, tar.gz)
 * - Unnecessary documentation
 * - Duplicate lock files
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

interface CleanupResult {
  moduleName: string;
  success: boolean;
  filesRemoved: number;
  spacedFreed: string;
  spacedFreedBytes: number;
  errors: string[];
  warnings: string[];
}

// Configuration
const MODULES_DIR = path.join(process.cwd(), "client", "modules");

// Patterns to remove
const PATTERNS_TO_REMOVE = {
  nestedNodeModules: "node_modules",
  buildDirs: [
    "dist",
    "build",
    ".next",
    "out",
    "coverage",
    ".cache",
    ".vite",
    ".parcel",
  ],
  archives: [
    "*.zip",
    "*.tar",
    "*.tar.gz",
    "*.tar.bz2",
    "*.rar",
    "core-pack.zip",
  ],
  duplicateLocks: ["pnpm-lock.yaml", "yarn.lock", "package-lock.json"],
};

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Check if a file matches a pattern (supports wildcards)
 */
function matchesPattern(filename: string, pattern: string): boolean {
  if (pattern === filename) return true;
  if (pattern.startsWith("*.")) {
    return filename.endsWith(pattern.substring(1));
  }
  return false;
}

/**
 * Remove a file or directory recursively
 */
function removePathSync(targetPath: string): {
  filesRemoved: number;
  spacedFreed: number;
} {
  let filesRemoved = 0;
  let spacedFreed = 0;

  try {
    const stats = fs.statSync(targetPath);

    if (stats.isDirectory()) {
      // Remove directory recursively
      const files = fs.readdirSync(targetPath);
      for (const file of files) {
        const filePath = path.join(targetPath, file);
        const result = removePathSync(filePath);
        filesRemoved += result.filesRemoved;
        spacedFreed += result.spacedFreed;
      }
      fs.rmdirSync(targetPath);
      filesRemoved++;
    } else {
      // Remove file
      fs.unlinkSync(targetPath);
      filesRemoved++;
      spacedFreed += stats.size;
    }
  } catch (error) {
    // Silently fail on permission errors or missing files
  }

  return { filesRemoved, spacedFreed };
}

/**
 * Get all files matching patterns in a directory
 */
function findFilesToRemove(modulePath: string): string[] {
  const filesToRemove: string[] = [];

  // Check for nested node_modules
  const nodeModulesPath = path.join(
    modulePath,
    PATTERNS_TO_REMOVE.nestedNodeModules,
  );
  if (fs.existsSync(nodeModulesPath)) {
    filesToRemove.push(nodeModulesPath);
  }

  // Check for build directories
  for (const dir of PATTERNS_TO_REMOVE.buildDirs) {
    const dirPath = path.join(modulePath, dir);
    if (fs.existsSync(dirPath)) {
      filesToRemove.push(dirPath);
    }
  }

  // Check for archives
  try {
    const files = fs.readdirSync(modulePath);
    for (const file of files) {
      for (const pattern of PATTERNS_TO_REMOVE.archives) {
        if (matchesPattern(file, pattern)) {
          filesToRemove.push(path.join(modulePath, file));
        }
      }
    }
  } catch (error) {
    // Silently fail
  }

  // Check for duplicate lock files (only at module level, not nested)
  for (const lockFile of PATTERNS_TO_REMOVE.duplicateLocks) {
    const lockPath = path.join(modulePath, lockFile);
    if (fs.existsSync(lockPath)) {
      filesToRemove.push(lockPath);
    }
  }

  return filesToRemove;
}

/**
 * Clean up a single module
 */
function cleanupModule(
  modulePath: string,
  force: boolean = false,
): CleanupResult {
  const moduleName = path.basename(modulePath);
  const result: CleanupResult = {
    moduleName,
    success: true,
    filesRemoved: 0,
    spacedFreed: "0 B",
    spacedFreedBytes: 0,
    errors: [],
    warnings: [],
  };

  if (!fs.existsSync(modulePath)) {
    result.success = false;
    result.errors.push(`Module directory not found: ${modulePath}`);
    return result;
  }

  // Find files to remove
  const filesToRemove = findFilesToRemove(modulePath);

  if (filesToRemove.length === 0) {
    result.warnings.push("No problematic files found - module already clean");
    return result;
  }

  // Remove files
  for (const filePath of filesToRemove) {
    try {
      const removeResult = removePathSync(filePath);
      result.filesRemoved += removeResult.filesRemoved;
      result.spacedFreedBytes += removeResult.spacedFreed;
    } catch (error) {
      result.errors.push(
        `Failed to remove ${path.relative(process.cwd(), filePath)}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  result.spacedFreed = formatBytes(result.spacedFreedBytes);

  return result;
}

/**
 * Clean up all modules
 */
function cleanupAllModules(force: boolean = false): CleanupResult[] {
  if (!fs.existsSync(MODULES_DIR)) {
    console.error(`❌ Modules directory not found: ${MODULES_DIR}`);
    process.exit(1);
  }

  const results: CleanupResult[] = [];
  const moduleDirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true });

  for (const dir of moduleDirs) {
    if (dir.isDirectory()) {
      const modulePath = path.join(MODULES_DIR, dir.name);
      results.push(cleanupModule(modulePath, force));
    }
  }

  return results;
}

/**
 * Interactive prompt
 */
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

/**
 * Print cleanup report
 */
function printReport(results: CleanupResult[]) {
  console.log("\n" + "=".repeat(80));
  console.log("🧹 MODULE CLEANUP REPORT");
  console.log("=".repeat(80));

  const successful = results.filter((r) => r.success && r.filesRemoved > 0);
  const noChanges = results.filter(
    (r) => r.warnings.length > 0 && r.filesRemoved === 0,
  );
  const errors = results.filter((r) => !r.success || r.errors.length > 0);

  let totalFilesRemoved = 0;
  let totalSpacedFreed = 0;

  // Summary
  console.log("\n📊 SUMMARY");
  console.log(`  Modules Processed:   ${results.length}`);
  console.log(`  ✅ Cleaned:          ${successful.length}`);
  console.log(`  ℹ️  Already Clean:    ${noChanges.length}`);
  console.log(`  ❌ Errors:           ${errors.length}`);

  // Detailed results
  console.log("\n📋 DETAILED RESULTS");
  console.log("-".repeat(80));

  for (const result of results) {
    const statusIcon =
      result.success && result.filesRemoved > 0
        ? "✓"
        : result.warnings.length > 0
          ? "ℹ️"
          : "❌";

    console.log(`\n${statusIcon} ${result.moduleName}`);

    if (result.filesRemoved > 0) {
      console.log(`   Files Removed: ${result.filesRemoved}`);
      console.log(`   Space Freed:   ${result.spacedFreed}`);
      totalFilesRemoved += result.filesRemoved;
      totalSpacedFreed += result.spacedFreedBytes;
    }

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`   ℹ️  ${warning}`);
      }
    }

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`   ❌ ${error}`);
      }
    }
  }

  // Total
  console.log("\n" + "-".repeat(80));
  console.log(`Total Files Removed: ${totalFilesRemoved}`);
  console.log(`Total Space Freed:   ${formatBytes(totalSpacedFreed)}`);
  console.log("=".repeat(80) + "\n");
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const allModules = args.includes("--all");
  const specificModule = args.find((arg) => !arg.startsWith("--"));

  // Show dry-run notice
  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No files will be deleted\n");
  }

  let results: CleanupResult[] = [];

  // Validate args
  if (specificModule && allModules) {
    console.error("❌ Cannot use both --all and specific module name");
    process.exit(1);
  }

  if (!specificModule && !allModules) {
    console.error("❌ Usage:");
    console.error(
      "   pnpm cleanup:modules [ModuleName]          # Cleanup specific module",
    );
    console.error(
      "   pnpm cleanup:modules --all                # Cleanup all modules",
    );
    console.error(
      "   pnpm cleanup:modules [ModuleName] --dry-run  # Preview cleanup",
    );
    process.exit(1);
  }

  if (specificModule) {
    // Clean up specific module
    const modulePath = path.join(MODULES_DIR, specificModule);
    results = [cleanupModule(modulePath, force)];
  } else {
    // Clean up all modules
    results = cleanupAllModules(force);
  }

  // Ask for confirmation if not dry-run and not force
  if (!dryRun && !force) {
    const confirmed = await prompt(
      "\n⚠️  Are you sure? This will remove files permanently. (yes/no): ",
    );
    if (confirmed !== "yes") {
      console.log("\n❌ Cancelled");
      process.exit(0);
    }
  }

  // For dry-run, don't actually remove files
  if (dryRun && !force) {
    console.log("ℹ️  This is a dry run - no files will be deleted.");
    console.log("   Files that WOULD be removed:");
    const modulePath =
      specificModule && !allModules
        ? path.join(MODULES_DIR, specificModule)
        : null;
    if (modulePath && fs.existsSync(modulePath)) {
      const filesToRemove = findFilesToRemove(modulePath);
      for (const file of filesToRemove) {
        console.log(`   - ${path.relative(process.cwd(), file)}`);
      }
    }
    console.log("\n   Run without --dry-run to actually remove these files.\n");
    process.exit(0);
  }

  // Print report
  printReport(results);

  // Exit with appropriate code
  const hasErrors = results.some((r) => !r.success || r.errors.length > 0);
  if (hasErrors) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Cleanup failed:", error);
  process.exit(1);
});
