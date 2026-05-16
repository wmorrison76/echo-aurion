import { readFileSync, writeFileSync } from "fs";
import fg from "fast-glob";
import path from "path";

// Enhanced color replacements for remaining patterns
const COLOR_REPLACEMENTS = [
  // Slate colors
  { pattern: /text-slate-400/g, replacement: "text-muted-foreground" },
  { pattern: /text-slate-300/g, replacement: "text-muted-foreground" },
  { pattern: /text-slate-100/g, replacement: "text-foreground" },
  { pattern: /text-slate-800/g, replacement: "text-foreground" },
  { pattern: /bg-slate-800/g, replacement: "bg-surface" },
  { pattern: /bg-slate-700/g, replacement: "bg-muted" },
  { pattern: /bg-slate-50/g, replacement: "bg-muted/30" },
  { pattern: /border-slate-200/g, replacement: "border-border" },
  { pattern: /border-slate-700/g, replacement: "border-border" },
  { pattern: /hover:bg-slate-700/g, replacement: "hover:bg-muted" },
  { pattern: /hover:bg-slate-50/g, replacement: "hover:bg-muted/30" },
  
  // Amber colors (keep for semantic meaning but make theme-aware)
  { pattern: /bg-amber-600/g, replacement: "bg-primary" },
  { pattern: /border-amber-500/g, replacement: "border-primary" },
  { pattern: /focus:border-amber-500/g, replacement: "focus:border-primary" },
  
  // Blue colors
  { pattern: /bg-blue-900/g, replacement: "bg-primary/20" },
  { pattern: /text-blue-200/g, replacement: "text-primary" },
  { pattern: /bg-blue-50/g, replacement: "bg-primary/10" },
  { pattern: /border-blue-200/g, replacement: "border-primary/20" },
  
  // Green colors
  { pattern: /bg-green-900/g, replacement: "bg-green-500/20" },
  { pattern: /text-green-200/g, replacement: "text-green-600 dark:text-green-400" },
  
  // Gray colors
  { pattern: /text-gray-400/g, replacement: "text-muted-foreground" },
  { pattern: /text-gray-300/g, replacement: "text-muted-foreground" },
  { pattern: /text-gray-800/g, replacement: "text-foreground" },
  { pattern: /bg-gray-900/g, replacement: "bg-surface" },
  { pattern: /bg-gray-800/g, replacement: "bg-surface" },
  { pattern: /bg-gray-100/g, replacement: "bg-muted/30" },
  { pattern: /border-gray-800/g, replacement: "border-border" },
  { pattern: /border-gray-200/g, replacement: "border-border" },
];

function fixFile(filePath: string): number {
  try {
    let content = readFileSync(filePath, "utf-8");
    let replacements = 0;
    
    // Apply all replacements
    for (const { pattern, replacement } of COLOR_REPLACEMENTS) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        replacements += matches.length;
      }
    }
    
    if (replacements > 0) {
      writeFileSync(filePath, content, "utf-8");
      console.log(`✅ ${filePath}: ${replacements} replacements`);
    }
    
    return replacements;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return 0;
  }
}

async function main() {
  const targetDir = process.argv[2] || "client/modules";
  const files = await fg(`${targetDir}/**/*.{tsx,ts}`, { ignore: ["**/node_modules/**", "**/dist/**"] });
  
  console.log(`🔍 Scanning ${files.length} files for remaining color fixes...\n`);
  
  let totalReplacements = 0;
  let filesModified = 0;
  
  for (const file of files) {
    const replacements = fixFile(file);
    if (replacements > 0) {
      totalReplacements += replacements;
      filesModified++;
    }
  }
  
  console.log("\n📊 Summary:");
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log("\n✨ Remaining color fixes complete!");
}

main().catch(console.error);
