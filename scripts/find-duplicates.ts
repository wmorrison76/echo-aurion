#!/usr/bin/env tsx
/**
 * Find and Archive Duplicate Files
 * 
 * Scans the codebase for duplicate files and moves them to DUParchive folder
 * 
 * Usage: tsx scripts/find-duplicates.ts [target-directory]
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, copyFileSync, unlinkSync } from "fs";
import { join, dirname, basename, relative } from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";

interface FileInfo {
  path: string;
  hash: string;
  size: number;
}

interface DuplicateGroup {
  hash: string;
  files: FileInfo[];
  keep: FileInfo; // The file to keep (usually the first one)
  duplicates: FileInfo[]; // Files to archive
}

function calculateFileHash(filePath: string): string {
  try {
    const content = readFileSync(filePath);
    return createHash("md5").update(content).digest("hex");
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return "";
  }
}

function findFiles(dir: string, fileList: FileInfo[] = [], baseDir: string = dir): FileInfo[] {
  if (!existsSync(dir)) {
    return fileList;
  }

  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    
    // Skip certain directories
    if (
      file.includes("node_modules") ||
      file.includes(".git") ||
      file.includes("dist") ||
      file.includes("build") ||
      file.includes("DUParchive") ||
      file.startsWith(".")
    ) {
      continue;
    }

    try {
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        findFiles(filePath, fileList, baseDir);
      } else if (stat.isFile()) {
        // Only process certain file types
        const ext = filePath.split(".").pop()?.toLowerCase();
        if (["tsx", "ts", "jsx", "js", "json", "md", "css", "scss"].includes(ext || "")) {
          const hash = calculateFileHash(filePath);
          if (hash) {
            fileList.push({
              path: filePath,
              hash,
              size: stat.size,
            });
          }
        }
      }
    } catch (error) {
      // Skip files we can't read
      continue;
    }
  }

  return fileList;
}

function findDuplicates(files: FileInfo[]): DuplicateGroup[] {
  const hashMap = new Map<string, FileInfo[]>();

  // Group files by hash
  for (const file of files) {
    if (!hashMap.has(file.hash)) {
      hashMap.set(file.hash, []);
    }
    hashMap.get(file.hash)!.push(file);
  }

  // Find groups with duplicates
  const duplicates: DuplicateGroup[] = [];

  for (const [hash, fileList] of hashMap.entries()) {
    if (fileList.length > 1) {
      // Sort by path length (shorter paths are usually the "original")
      // Or by modification time (newer files might be duplicates)
      const sorted = fileList.sort((a, b) => {
        // Prefer files in root/client or root/server
        const aDepth = a.path.split("/").length;
        const bDepth = b.path.split("/").length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        return a.path.localeCompare(b.path);
      });

      duplicates.push({
        hash,
        files: sorted,
        keep: sorted[0], // Keep the first one
        duplicates: sorted.slice(1), // Archive the rest
      });
    }
  }

  return duplicates;
}

function archiveDuplicates(duplicates: DuplicateGroup[], archiveDir: string): void {
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  const archiveLog: string[] = [];
  archiveLog.push("# Duplicate Files Archive");
  archiveLog.push(`Generated: ${new Date().toISOString()}\n`);
  archiveLog.push(`Total duplicate groups: ${duplicates.length}\n`);

  let totalArchived = 0;

  for (const group of duplicates) {
    archiveLog.push(`\n## Hash: ${group.hash.substring(0, 8)}...`);
    archiveLog.push(`**Keeping:** ${group.keep.path}`);
    archiveLog.push(`**Archiving ${group.duplicates.length} duplicate(s):**\n`);

    for (const dup of group.duplicates) {
      const relativePath = relative(process.cwd(), dup.path);
      const archivePath = join(archiveDir, relativePath);
      const archiveDirPath = dirname(archivePath);

      // Create directory structure in archive
      if (!existsSync(archiveDirPath)) {
        mkdirSync(archiveDirPath, { recursive: true });
      }

      try {
        // Copy to archive
        copyFileSync(dup.path, archivePath);
        
        // Remove original
        unlinkSync(dup.path);
        
        archiveLog.push(`  ✅ Archived: ${dup.path}`);
        archiveLog.push(`     → ${archivePath}`);
        totalArchived++;
      } catch (error) {
        archiveLog.push(`  ❌ Error archiving ${dup.path}: ${error}`);
      }
    }
  }

  // Write log file
  const logPath = join(archiveDir, "ARCHIVE_LOG.md");
  writeFileSync(logPath, archiveLog.join("\n"), "utf-8");

  console.log(`\n📦 Archived ${totalArchived} duplicate files to ${archiveDir}`);
  console.log(`📝 Archive log: ${logPath}`);
}

function main() {
  const targetPath = process.argv[2] || process.cwd();
  const archiveDir = join(process.cwd(), "DUParchive");

  console.log(`🔍 Scanning for duplicate files in: ${targetPath}`);
  console.log("");

  // Find all files
  console.log("📁 Scanning files...");
  const files = findFiles(targetPath);
  console.log(`   Found ${files.length} files`);

  // Find duplicates
  console.log("\n🔎 Finding duplicates...");
  const duplicates = findDuplicates(files);
  console.log(`   Found ${duplicates.length} duplicate groups`);

  if (duplicates.length === 0) {
    console.log("\n✅ No duplicates found!");
    return;
  }

  // Show summary
  let totalDuplicates = 0;
  for (const group of duplicates) {
    totalDuplicates += group.duplicates.length;
  }

  console.log(`   Total duplicate files: ${totalDuplicates}`);
  console.log("");

  // Show preview
  console.log("📋 Preview (first 10 groups):");
  for (const group of duplicates.slice(0, 10)) {
    console.log(`\n   Hash: ${group.hash.substring(0, 8)}... (${group.files.length} files)`);
    console.log(`   Keep: ${group.keep.path}`);
    for (const dup of group.duplicates.slice(0, 3)) {
      console.log(`   Dup:  ${dup.path}`);
    }
    if (group.duplicates.length > 3) {
      console.log(`   ... and ${group.duplicates.length - 3} more`);
    }
  }

  if (duplicates.length > 10) {
    console.log(`\n   ... and ${duplicates.length - 10} more groups`);
  }

  // Archive duplicates
  console.log(`\n📦 Archiving duplicates to: ${archiveDir}`);
  archiveDuplicates(duplicates, archiveDir);

  console.log("\n✅ Done!");
}

// Always run main when script is executed
main();

export { findFiles, findDuplicates, archiveDuplicates };
