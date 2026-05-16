#!/usr/bin/env tsx
/**
 * Automated Theme Color Fix Script
 * 
 * Scans modules for hardcoded colors and replaces them with theme tokens
 * 
 * Usage: tsx scripts/fix-theme-colors.ts [module-path]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

// Color replacement patterns
const COLOR_REPLACEMENTS: Array<{
  pattern: RegExp;
  replacement: string;
  description: string;
}> = [
  // Borders
  {
    pattern: /border-gray-300\/?[0-9]*/g,
    replacement: "border-border",
    description: "Gray borders → border-border",
  },
  {
    pattern: /border-gray-400\/?[0-9]*/g,
    replacement: "border-border",
    description: "Gray borders → border-border",
  },
  {
    pattern: /border-slate-700\/?[0-9]*/g,
    replacement: "border-border",
    description: "Slate borders → border-border",
  },
  {
    pattern: /dark:border-slate-700\/?[0-9]*/g,
    replacement: "",
    description: "Remove dark:border overrides",
  },
  {
    pattern: /dark:border-gray-700\/?[0-9]*/g,
    replacement: "",
    description: "Remove dark:border overrides",
  },
  {
    pattern: /border-black\/?[0-9]*/g,
    replacement: "border-border",
    description: "Black borders → border-border",
  },

  // Backgrounds
  {
    pattern: /bg-white\/?[0-9]*/g,
    replacement: "bg-background",
    description: "White backgrounds → bg-background",
  },
  {
    pattern: /bg-gray-100\/?[0-9]*/g,
    replacement: "bg-surface",
    description: "Gray backgrounds → bg-surface",
  },
  {
    pattern: /bg-gray-200\/?[0-9]*/g,
    replacement: "bg-surface",
    description: "Gray backgrounds → bg-surface",
  },
  {
    pattern: /bg-gray-50\/?[0-9]*/g,
    replacement: "bg-surface",
    description: "Gray backgrounds → bg-surface",
  },
  {
    pattern: /bg-slate-900\/?[0-9]*/g,
    replacement: "bg-surface",
    description: "Slate backgrounds → bg-surface",
  },
  {
    pattern: /bg-slate-950\/?[0-9]*/g,
    replacement: "bg-card",
    description: "Slate backgrounds → bg-card",
  },
  {
    pattern: /dark:bg-slate-900\/?[0-9]*/g,
    replacement: "",
    description: "Remove dark:bg overrides",
  },
  {
    pattern: /dark:bg-slate-950\/?[0-9]*/g,
    replacement: "",
    description: "Remove dark:bg overrides",
  },
  {
    pattern: /dark:bg-white\/?[0-9]*/g,
    replacement: "",
    description: "Remove dark:bg overrides",
  },

  // Text colors
  {
    pattern: /text-slate-700/g,
    replacement: "text-foreground",
    description: "Slate text → text-foreground",
  },
  {
    pattern: /text-slate-900/g,
    replacement: "text-foreground",
    description: "Slate text → text-foreground",
  },
  {
    pattern: /text-slate-600/g,
    replacement: "text-muted-foreground",
    description: "Slate text → text-muted-foreground",
  },
  {
    pattern: /text-slate-500/g,
    replacement: "text-muted-foreground",
    description: "Slate text → text-muted-foreground",
  },
  {
    pattern: /text-gray-700/g,
    replacement: "text-foreground",
    description: "Gray text → text-foreground",
  },
  {
    pattern: /text-gray-600/g,
    replacement: "text-muted-foreground",
    description: "Gray text → text-muted-foreground",
  },
  {
    pattern: /text-gray-500/g,
    replacement: "text-muted-foreground",
    description: "Gray text → text-muted-foreground",
  },
  {
    pattern: /text-black/g,
    replacement: "text-foreground",
    description: "Black text → text-foreground",
  },
  {
    pattern: /dark:text-slate-100/g,
    replacement: "",
    description: "Remove dark:text overrides",
  },
  {
    pattern: /dark:text-slate-200/g,
    replacement: "",
    description: "Remove dark:text overrides",
  },
  {
    pattern: /dark:text-slate-300/g,
    replacement: "",
    description: "Remove dark:text overrides",
  },
  {
    pattern: /dark:text-slate-400/g,
    replacement: "",
    description: "Remove dark:text overrides",
  },
  {
    pattern: /dark:text-cyan-100/g,
    replacement: "",
    description: "Remove dark:text overrides",
  },
  {
    pattern: /dark:text-cyan-200/g,
    replacement: "",
    description: "Remove dark:text overrides",
  },

  // Primary colors
  {
    pattern: /bg-blue-500/g,
    replacement: "bg-primary",
    description: "Blue backgrounds → bg-primary",
  },
  {
    pattern: /bg-blue-600/g,
    replacement: "bg-primary",
    description: "Blue backgrounds → bg-primary",
  },
  {
    pattern: /hover:bg-blue-600/g,
    replacement: "hover:opacity-90",
    description: "Blue hover → opacity",
  },
  {
    pattern: /hover:bg-blue-700/g,
    replacement: "hover:opacity-90",
    description: "Blue hover → opacity",
  },
  {
    pattern: /text-blue-600/g,
    replacement: "text-primary",
    description: "Blue text → text-primary",
  },
  {
    pattern: /text-blue-300/g,
    replacement: "text-primary",
    description: "Blue text → text-primary",
  },
  {
    pattern: /border-blue-300/g,
    replacement: "border-primary",
    description: "Blue borders → border-primary",
  },
  {
    pattern: /border-blue-600/g,
    replacement: "border-primary",
    description: "Blue borders → border-primary",
  },
  {
    pattern: /ring-blue-300/g,
    replacement: "ring-primary",
    description: "Blue rings → ring-primary",
  },
  {
    pattern: /focus-visible:ring-blue-300/g,
    replacement: "focus-visible:ring-primary",
    description: "Blue focus rings → ring-primary",
  },

  // Muted/disabled
  {
    pattern: /bg-gray-400/g,
    replacement: "bg-muted",
    description: "Gray muted → bg-muted",
  },
  {
    pattern: /placeholder-gray-400/g,
    replacement: "placeholder-muted-foreground",
    description: "Gray placeholders → placeholder-muted-foreground",
  },
  {
    pattern: /dark:placeholder-slate-500/g,
    replacement: "",
    description: "Remove dark:placeholder overrides",
  },

  // Clean up multiple spaces after removals
  {
    pattern: /\s{2,}/g,
    replacement: " ",
    description: "Clean up multiple spaces",
  },
  {
    pattern: /className="\s+/g,
    replacement: 'className="',
    description: "Clean up leading spaces in className",
  },
  {
    pattern: /\s+"/g,
    replacement: '"',
    description: "Clean up trailing spaces before quote",
  },
];

interface FixResult {
  file: string;
  replacements: number;
  errors: string[];
}

function fixFile(filePath: string): FixResult {
  const result: FixResult = {
    file: filePath,
    replacements: 0,
    errors: [],
  };

  try {
    let content = readFileSync(filePath, "utf-8");
    let totalReplacements = 0;

    for (const { pattern, replacement, description } of COLOR_REPLACEMENTS) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        totalReplacements += matches.length;
      }
    }

    if (totalReplacements > 0) {
      writeFileSync(filePath, content, "utf-8");
      result.replacements = totalReplacements;
    }
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
  }

  return result;
}

function findTsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (
        !file.includes("node_modules") &&
        !file.includes(".git") &&
        !file.includes("dist") &&
        !file.includes("build")
      ) {
        findTsxFiles(filePath, fileList);
      }
    } else if (extname(file) === ".tsx" || extname(file) === ".ts") {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function main() {
  const targetPath = process.argv[2] || "client/modules";
  const fullPath = join(process.cwd(), targetPath);

  console.log(`🔍 Scanning for theme color fixes in: ${fullPath}`);
  console.log("");

  const files = findTsxFiles(fullPath);
  console.log(`📁 Found ${files.length} TypeScript/TSX files`);
  console.log("");

  const results: FixResult[] = [];
  let totalReplacements = 0;

  for (const file of files) {
    const result = fixFile(file);
    results.push(result);
    totalReplacements += result.replacements;

    if (result.replacements > 0) {
      console.log(`✅ ${file}: ${result.replacements} replacements`);
    }
    if (result.errors.length > 0) {
      console.error(`❌ ${file}: ${result.errors.join(", ")}`);
    }
  }

  console.log("");
  console.log("📊 Summary:");
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${results.filter((r) => r.replacements > 0).length}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log("");
  console.log("✨ Theme color fixes complete!");
}

// Always run main when script is executed
main();

export { fixFile, findTsxFiles, COLOR_REPLACEMENTS };
