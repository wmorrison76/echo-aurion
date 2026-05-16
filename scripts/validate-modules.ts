#!/usr/bin/env tsx
/**
 * Module Validator
 * Scans all client/modules/* folders for problematic patterns
 * Identifies nested node_modules, large files, and structural issues
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface ValidationIssue {
  type:
    | "nested_node_modules"
    | "large_archive"
    | "large_directory"
    | "large_file"
    | "missing_entry_point"
    | "invalid_manifest"
    | "circular_import";
  path: string;
  size?: string;
  sizeBytes?: number;
  action: "remove" | "review" | "investigate";
  severity: "critical" | "warning" | "info";
  description: string;
}

interface ModuleValidationResult {
  name: string;
  path: string;
  status: "healthy" | "warning" | "critical";
  fileCount: number;
  directorySize: string;
  directorySizeBytes: number;
  issues: ValidationIssue[];
  recommendations: string[];
  estimatedSpaceFreed: string;
}

interface ValidationReport {
  timestamp: string;
  modules: Record<string, ModuleValidationResult>;
  summary: {
    totalModules: number;
    healthy: number;
    warning: number;
    critical: number;
    totalFileCount: number;
    estimatedTotalSpaceFreed: string;
  };
}

// Configuration
const MODULES_DIR = path.join(process.cwd(), "client", "modules");
const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
const LARGE_DIR_THRESHOLD = 50 * 1024 * 1024; // 50MB
const LARGE_ARCHIVE_THRESHOLD = 5 * 1024 * 1024; // 5MB

// File types to check
const PROBLEMATIC_PATTERNS = {
  nestedNodeModules: /node_modules/,
  archives: /\.(zip|tar|tar\.gz|tar\.bz2|rar)$/i,
  buildArtifacts: /^(dist|build|\.next|out|coverage|\.cache)$/,
  duplicateLocks: /^(pnpm-lock|yarn\.lock|package-lock)\.yaml$/i,
};

/**
 * Get directory size recursively
 */
function getDirectorySize(dirPath: string): number {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += fs.statSync(filePath).size;
      }
    }
  } catch (error) {
    // Silently skip inaccessible directories
  }
  return size;
}

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
 * Count all files in a directory
 */
function countFiles(dirPath: string): number {
  let count = 0;
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        count += countFiles(filePath);
      } else {
        count++;
      }
    }
  } catch (error) {
    // Silently skip inaccessible directories
  }
  return count;
}

/**
 * Check for nested node_modules
 */
function checkNestedNodeModules(modulePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  try {
    const files = fs.readdirSync(modulePath, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory() && file.name === "node_modules") {
        const nodeModulesPath = path.join(modulePath, "node_modules");
        const size = getDirectorySize(nodeModulesPath);
        issues.push({
          type: "nested_node_modules",
          path: path.relative(process.cwd(), nodeModulesPath),
          size: formatBytes(size),
          sizeBytes: size,
          action: "remove",
          severity: "critical",
          description:
            "Nested node_modules directory causes ENOSPC errors and bloats file watcher",
        });
      }
    }
  } catch (error) {
    // Silently skip
  }
  return issues;
}

/**
 * Check for large archives
 */
function checkLargeArchives(modulePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  try {
    const walkDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            walkDir(filePath);
          } else if (PROBLEMATIC_PATTERNS.archives.test(file.name)) {
            const stats = fs.statSync(filePath);
            if (stats.size > LARGE_ARCHIVE_THRESHOLD) {
              issues.push({
                type: "large_archive",
                path: path.relative(process.cwd(), filePath),
                size: formatBytes(stats.size),
                sizeBytes: stats.size,
                action: "remove",
                severity: "warning",
                description: `Large archive file (${formatBytes(stats.size)}) - can be removed`,
              });
            }
          }
        }
      } catch (error) {
        // Silently skip
      }
    };
    walkDir(modulePath);
  } catch (error) {
    // Silently skip
  }
  return issues;
}

/**
 * Check for large directories (dist, build, etc)
 */
function checkLargeDirectories(modulePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  try {
    const files = fs.readdirSync(modulePath, { withFileTypes: true });
    for (const file of files) {
      if (
        file.isDirectory() &&
        PROBLEMATIC_PATTERNS.buildArtifacts.test(file.name)
      ) {
        const dirPath = path.join(modulePath, file.name);
        const size = getDirectorySize(dirPath);
        if (size > LARGE_DIR_THRESHOLD) {
          issues.push({
            type: "large_directory",
            path: path.relative(process.cwd(), dirPath),
            size: formatBytes(size),
            sizeBytes: size,
            action: "remove",
            severity: "warning",
            description: `Large ${file.name} directory (${formatBytes(size)}) - build artifact`,
          });
        }
      }
    }
  } catch (error) {
    // Silently skip
  }
  return issues;
}

/**
 * Check for large individual files
 */
function checkLargeFiles(modulePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  try {
    const walkDir = (dir: string) => {
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            walkDir(filePath);
          } else {
            const stats = fs.statSync(filePath);
            if (stats.size > LARGE_FILE_THRESHOLD) {
              issues.push({
                type: "large_file",
                path: path.relative(process.cwd(), filePath),
                size: formatBytes(stats.size),
                sizeBytes: stats.size,
                action: "review",
                severity: "info",
                description: `Large file (${formatBytes(stats.size)}) - review if needed`,
              });
            }
          }
        }
      } catch (error) {
        // Silently skip
      }
    };
    walkDir(modulePath);
  } catch (error) {
    // Silently skip
  }
  return issues;
}

/**
 * Check for missing entry point
 */
function checkMissingEntryPoint(modulePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const indexPath = path.join(modulePath, "index.tsx");
  const indexJsPath = path.join(modulePath, "index.ts");
  const appPath = path.join(modulePath, "App.tsx");

  if (
    !fs.existsSync(indexPath) &&
    !fs.existsSync(indexJsPath) &&
    !fs.existsSync(appPath)
  ) {
    issues.push({
      type: "missing_entry_point",
      path: path.relative(process.cwd(), modulePath),
      action: "investigate",
      severity: "critical",
      description: "No entry point found (index.tsx, index.ts, or App.tsx)",
    });
  }
  return issues;
}

/**
 * Check manifest validity
 */
function checkManifest(modulePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const manifestPath = path.join(modulePath, "luccca-module.json");

  if (!fs.existsSync(manifestPath)) {
    // Not all modules have manifests - this is info level
    return issues;
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    if (!manifest.name) {
      issues.push({
        type: "invalid_manifest",
        path: path.relative(process.cwd(), manifestPath),
        action: "investigate",
        severity: "warning",
        description: "Manifest missing 'name' field",
      });
    }
  } catch (error) {
    issues.push({
      type: "invalid_manifest",
      path: path.relative(process.cwd(), manifestPath),
      action: "investigate",
      severity: "warning",
      description: `Invalid JSON in manifest: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
  return issues;
}

/**
 * Validate a single module
 */
function validateModule(modulePath: string): ModuleValidationResult {
  const moduleName = path.basename(modulePath);
  const fileCount = countFiles(modulePath);
  const dirSize = getDirectorySize(modulePath);

  // Collect all issues
  const issues: ValidationIssue[] = [
    ...checkNestedNodeModules(modulePath),
    ...checkLargeArchives(modulePath),
    ...checkLargeDirectories(modulePath),
    ...checkLargeFiles(modulePath),
    ...checkMissingEntryPoint(modulePath),
    ...checkManifest(modulePath),
  ];

  // Determine status
  let status: "healthy" | "warning" | "critical" = "healthy";
  if (issues.some((i) => i.severity === "critical")) {
    status = "critical";
  } else if (issues.some((i) => i.severity === "warning")) {
    status = "warning";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (issues.some((i) => i.type === "nested_node_modules")) {
    recommendations.push("Run: pnpm cleanup:modules " + moduleName);
  }
  if (issues.some((i) => i.type === "large_archive")) {
    recommendations.push(
      "Remove large archives manually or via cleanup script",
    );
  }
  if (issues.some((i) => i.type === "missing_entry_point")) {
    recommendations.push("Verify module has proper entry point (index.tsx)");
  }

  // Calculate space that could be freed
  let spaceFreeable = 0;
  issues.forEach((issue) => {
    if (issue.action === "remove" && issue.sizeBytes) {
      spaceFreeable += issue.sizeBytes;
    }
  });

  return {
    name: moduleName,
    path: path.relative(process.cwd(), modulePath),
    status,
    fileCount,
    directorySize: formatBytes(dirSize),
    directorySizeBytes: dirSize,
    issues,
    recommendations,
    estimatedSpaceFreed: formatBytes(spaceFreeable),
  };
}

/**
 * Main validation function
 */
function validateAllModules(): ValidationReport {
  if (!fs.existsSync(MODULES_DIR)) {
    console.error(`❌ Modules directory not found: ${MODULES_DIR}`);
    process.exit(1);
  }

  const modules: Record<string, ModuleValidationResult> = {};
  const moduleDirs = fs.readdirSync(MODULES_DIR, { withFileTypes: true });

  for (const dir of moduleDirs) {
    if (dir.isDirectory()) {
      const modulePath = path.join(MODULES_DIR, dir.name);
      modules[dir.name] = validateModule(modulePath);
    }
  }

  // Calculate summary
  const moduleList = Object.values(modules);
  let totalSpaceFreeable = 0;

  const summary = {
    totalModules: moduleList.length,
    healthy: moduleList.filter((m) => m.status === "healthy").length,
    warning: moduleList.filter((m) => m.status === "warning").length,
    critical: moduleList.filter((m) => m.status === "critical").length,
    totalFileCount: moduleList.reduce((sum, m) => sum + m.fileCount, 0),
    estimatedTotalSpaceFreed: "",
  };

  moduleList.forEach((m) => {
    totalSpaceFreeable += m.directorySizeBytes;
  });

  summary.estimatedTotalSpaceFreed = formatBytes(totalSpaceFreeable);

  return {
    timestamp: new Date().toISOString(),
    modules,
    summary,
  };
}

/**
 * Print validation report to console
 */
function printReport(report: ValidationReport) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 MODULE VALIDATION REPORT");
  console.log("=".repeat(80));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log("");

  // Summary
  console.log("📈 SUMMARY");
  console.log(`  Total Modules:       ${report.summary.totalModules}`);
  console.log(
    `  ✅ Healthy:          ${report.summary.healthy} (${Math.round((report.summary.healthy / report.summary.totalModules) * 100)}%)`,
  );
  console.log(`  ⚠️  Warning:         ${report.summary.warning}`);
  console.log(`  🔴 Critical:         ${report.summary.critical}`);
  console.log(`  Total Files:         ${report.summary.totalFileCount}`);
  console.log(
    `  Space to Free:       ${report.summary.estimatedTotalSpaceFreed}`,
  );
  console.log("");

  // Detailed per-module
  console.log("📋 MODULES DETAILS");
  console.log("-".repeat(80));

  const sortedModules = Object.values(report.modules).sort((a, b) => {
    // Sort by status (critical first), then by file count descending
    const statusOrder = { critical: 0, warning: 1, healthy: 2 };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.fileCount - a.fileCount;
  });

  for (const module of sortedModules) {
    const statusIcon =
      module.status === "healthy"
        ? "✅"
        : module.status === "warning"
          ? "⚠️"
          : "🔴";

    console.log(`\n${statusIcon} ${module.name}`);
    console.log(`   Status:  ${module.status.toUpperCase()}`);
    console.log(`   Files:   ${module.fileCount}`);
    console.log(`   Size:    ${module.directorySize}`);

    if (module.issues.length > 0) {
      console.log(`   Issues:  ${module.issues.length}`);
      for (const issue of module.issues) {
        const severityIcon =
          issue.severity === "critical"
            ? "🔴"
            : issue.severity === "warning"
              ? "⚠️"
              : "ℹ️";
        console.log(
          `     ${severityIcon} [${issue.type}] ${issue.description}`,
        );
        if (issue.size) {
          console.log(`        Path: ${issue.path} (${issue.size})`);
        } else {
          console.log(`        Path: ${issue.path}`);
        }
      }
    }

    if (module.recommendations.length > 0) {
      console.log(`   Recommendations:`);
      for (const rec of module.recommendations) {
        console.log(`     → ${rec}`);
      }
    }

    if (module.estimatedSpaceFreed !== "0 B") {
      console.log(`   Space to Free: ${module.estimatedSpaceFreed}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✨ Validation complete!");
  console.log("=".repeat(80) + "\n");
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const exportPath = args
    .find((arg) => arg.startsWith("--export="))
    ?.split("=")[1];

  const report = validateAllModules();

  if (jsonOutput || exportPath) {
    const jsonOutput = JSON.stringify(report, null, 2);
    if (exportPath) {
      fs.writeFileSync(exportPath, jsonOutput);
      console.log(`✅ Report exported to: ${exportPath}`);
    } else {
      console.log(jsonOutput);
    }
  } else {
    printReport(report);
  }

  // Exit with appropriate code
  if (report.summary.critical > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Validation failed:", error);
  process.exit(1);
});
