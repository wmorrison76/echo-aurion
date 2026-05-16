#!/usr/bin/env node

/**
 * Culinary Module Import Fixer
 * Converts all @/ imports to relative paths
 * Usage: node scripts/fix-culinary-imports.js
 */

const fs = require("fs");
const path = require("path");

const culinaryRoot = "client/modules/Culinary";

function getRelativeDepth(filePath) {
  const relative = path.relative(culinaryRoot, filePath);
  const depth = relative.split(path.sep).length - 1;
  return depth;
}

function convertImportPath(filePath, importPath) {
  // Don't modify UI components that are already duplicated locally
  if (importPath.startsWith("@/components/ui/")) {
    return `./components/ui/${importPath.slice("@/components/ui/".length)}`;
  }

  // Convert @/ to relative paths based on depth
  const depth = getRelativeDepth(filePath);
  const prefix = "../".repeat(depth);

  if (importPath.startsWith("@/")) {
    return prefix + importPath.slice(2);
  }

  return importPath;
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;

    // Match: import ... from "@/...";
    // Match: import type ... from "@/...";
    const importRegex = /from\s+["'](@\/[^"']+)["']/g;

    content = content.replace(importRegex, (match, importPath) => {
      const newPath = convertImportPath(filePath, importPath);
      return `from "${newPath}"`;
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✓ Fixed: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
  }

  return false;
}

function walkDir(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!item.startsWith(".") && item !== "node_modules") {
        files.push(...walkDir(fullPath));
      }
    } else if (item.endsWith(".tsx") || item.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main
console.log("🔧 Fixing Culinary module imports...\n");

const files = walkDir(culinaryRoot);
let fixed = 0;

for (const file of files) {
  if (fixFile(file)) {
    fixed++;
  }
}

console.log(`\n✅ Fixed ${fixed}/${files.length} files`);
