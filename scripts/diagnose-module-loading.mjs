#!/usr/bin/env node
/**
 * Module Loading Diagnostic Script
 * Checks for common issues preventing modules from loading
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

console.log("🔍 LUCCCA Module Loading Diagnostic\n");
console.log("=" .repeat(60));

const issues = [];
const warnings = [];

// 1. Check if modules exist
console.log("\n1️⃣ Checking module directories...");
const modulesDir = join(rootDir, "client", "modules");
if (!existsSync(modulesDir)) {
  issues.push("❌ client/modules directory does not exist!");
} else {
  const modules = readdirSync(modulesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`   ✅ Found ${modules.length} module directories`);
  
  // Check critical modules
  const criticalModules = ["Culinary", "MaestroBQT", "Schedule", "Pastry", "EchoAurum"];
  for (const module of criticalModules) {
    const modulePath = join(modulesDir, module);
    if (!existsSync(modulePath)) {
      warnings.push(`⚠️  Critical module '${module}' not found`);
    } else {
      // Check for index file
      const indexFiles = ["index.tsx", "index.ts", "index.jsx", "index.js"];
      const hasIndex = indexFiles.some(file => existsSync(join(modulePath, file)));
      if (!hasIndex) {
        issues.push(`❌ Module '${module}' has no index file (${indexFiles.join(", ")} expected)`);
      }
    }
  }
}

// 2. Check panel registry
console.log("\n2️⃣ Checking panel registry...");
const panelRegistryPath = join(rootDir, "client", "lib", "panel-registry.ts");
if (!existsSync(panelRegistryPath)) {
  issues.push("❌ panel-registry.ts not found!");
} else {
  const registryContent = readFileSync(panelRegistryPath, "utf-8");
  const moduleImports = registryContent.match(/import\(["']@\/modules\/([^"']+)["']\)/g) || [];
  console.log(`   ✅ Found ${moduleImports.length} module imports in registry`);
  
  // Check if imports match actual modules
  const importedModules = moduleImports.map(imp => {
    const match = imp.match(/@\/modules\/([^"']+)/);
    return match ? match[1] : null;
  }).filter(Boolean);
  
  for (const module of importedModules) {
    const modulePath = join(modulesDir, module);
    if (!existsSync(modulePath)) {
      warnings.push(`⚠️  Registry references module '${module}' but directory doesn't exist`);
    }
  }
}

// 3. Check React imports
console.log("\n3️⃣ Checking React imports...");
const reactShimPath = join(rootDir, "client", "lib", "react-shim.ts");
if (!existsSync(reactShimPath)) {
  warnings.push("⚠️  react-shim.ts not found (may cause React null errors)");
} else {
  console.log("   ✅ React shim found");
}

// 4. Check Sentry configuration
console.log("\n4️⃣ Checking Sentry configuration...");
const sentryInitPath = join(rootDir, "client", "sentry-init.ts");
if (existsSync(sentryInitPath)) {
  const sentryContent = readFileSync(sentryInitPath, "utf-8");
  if (sentryContent.includes("VITE_SENTRY_DSN")) {
    console.log("   ✅ Sentry initialization found");
    console.log("   ⚠️  Note: Set VITE_SENTRY_DSN environment variable to enable error tracking");
  }
} else {
  warnings.push("⚠️  sentry-init.ts not found");
}

// 5. Check Vite config
console.log("\n5️⃣ Checking Vite configuration...");
const viteConfigPath = join(rootDir, "vite.config.ts");
if (existsSync(viteConfigPath)) {
  const viteContent = readFileSync(viteConfigPath, "utf-8");
  
  if (viteContent.includes("optimizeDeps")) {
    console.log("   ✅ optimizeDeps configured");
  } else {
    warnings.push("⚠️  optimizeDeps not found in vite.config.ts");
  }
  
  if (viteContent.includes("dedupe")) {
    console.log("   ✅ dedupe configured (prevents multiple React instances)");
  } else {
    warnings.push("⚠️  dedupe not found in vite.config.ts");
  }
  
  if (viteContent.includes("react")) {
    console.log("   ✅ React aliases configured");
  } else {
    warnings.push("⚠️  React aliases not found in vite.config.ts");
  }
}

// 6. Check for common import errors
console.log("\n6️⃣ Checking for common import patterns...");
const indexTsxPath = join(rootDir, "client", "index.tsx");
if (existsSync(indexTsxPath)) {
  const indexContent = readFileSync(indexTsxPath, "utf-8");
  if (indexContent.includes("react-shim")) {
    console.log("   ✅ React shim imported in index.tsx");
  } else {
    warnings.push("⚠️  React shim not imported in index.tsx");
  }
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("\n📊 SUMMARY\n");

if (issues.length === 0 && warnings.length === 0) {
  console.log("✅ No critical issues found!");
  console.log("\n💡 If modules still fail to load:");
  console.log("   1. Check browser console for specific errors");
  console.log("   2. Verify VITE_SENTRY_DSN is set (optional, for error tracking)");
  console.log("   3. Clear Vite cache: rm -rf node_modules/.vite");
  console.log("   4. Restart dev server: npm run dev:all");
} else {
  if (issues.length > 0) {
    console.log("❌ CRITICAL ISSUES:");
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  if (warnings.length > 0) {
    console.log("\n⚠️  WARNINGS:");
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  console.log("\n💡 Next steps:");
  console.log("   1. Fix critical issues above");
  console.log("   2. Check browser console for runtime errors");
  console.log("   3. Open module-status panel in the app to see detailed diagnostics");
}

console.log("\n" + "=".repeat(60));
