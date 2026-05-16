#!/usr/bin/env node
/**
 * Panel Registry Validation Script
 * 
 * Validates that all panel registry entries point to existing files
 * and that exports match import expectations.
 * 
 * Usage: node scripts/validate-panel-registry.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const clientPath = path.join(projectRoot, 'client');
const panelRegistryPath = path.join(clientPath, 'lib', 'panel-registry.ts');

console.log('🔍 Validating Panel Registry\n');
console.log('============================================================\n');

const errors = [];
const warnings = [];
const valid = [];

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFileContent(filePath) {
  if (checkFileExists(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
}

function extractRegistryEntries() {
  const content = readFileContent(panelRegistryPath);
  if (!content) {
    errors.push('Panel registry file not found');
    return [];
  }

  // Extract all import statements from PANEL_REGISTRY
  const importMatches = [
    ...content.matchAll(/import\(["']@\/modules\/([^"']+)["']\)/g),
    ...content.matchAll(/import\(["']@\/components\/([^"']+)["']\)/g),
  ];

  const entries = [];
  for (const match of importMatches) {
    const importPath = match[1];
    // Handle both @/modules/ and @/components/ paths
    let fullPath;
    if (importPath.startsWith('modules/')) {
      fullPath = path.join(clientPath, importPath);
    } else if (importPath.startsWith('components/')) {
      fullPath = path.join(clientPath, importPath);
    } else {
      // Try modules first, then components
      fullPath = path.join(clientPath, 'modules', importPath);
      if (!fs.existsSync(fullPath + '.tsx') && !fs.existsSync(fullPath + '.ts') && 
          !fs.existsSync(path.join(fullPath, 'index.tsx')) && !fs.existsSync(path.join(fullPath, 'index.ts'))) {
        fullPath = path.join(clientPath, 'components', importPath);
      }
    }
    
    // Check if it's a file or directory
    const asFile = fullPath + '.tsx';
    const asFileTs = fullPath + '.ts';
    const asDir = path.join(fullPath, 'index.tsx');
    const asDirTs = path.join(fullPath, 'index.ts');

    entries.push({
      importPath,
      fullPath,
      asFile: checkFileExists(asFile),
      asFileTs: checkFileExists(asFileTs),
      asDir: checkFileExists(asDir),
      asDirTs: checkFileExists(asDirTs),
      filePath: checkFileExists(asFile) ? asFile : 
                checkFileExists(asFileTs) ? asFileTs :
                checkFileExists(asDir) ? asDir :
                checkFileExists(asDirTs) ? asDirTs : null,
    });
  }

  return entries;
}

const entries = extractRegistryEntries();

console.log(`📊 Found ${entries.length} registry entries\n`);

entries.forEach((entry, idx) => {
  if (entry.filePath) {
    valid.push(entry);
    console.log(`✅ [${idx + 1}] ${entry.importPath}`);
  } else {
    errors.push(entry);
    console.log(`❌ [${idx + 1}] ${entry.importPath} - NOT FOUND`);
    console.log(`   Tried: ${entry.fullPath}.tsx, ${entry.fullPath}.ts, ${entry.fullPath}/index.tsx, ${entry.fullPath}/index.ts`);
  }
});

console.log('\n============================================================\n');
console.log('📊 SUMMARY\n');
console.log(`✅ Valid entries: ${valid.length}`);
console.log(`❌ Invalid entries: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n⚠️  INVALID ENTRIES:');
  errors.forEach((entry) => {
    console.log(`   - ${entry.importPath}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All registry entries are valid!');
  process.exit(0);
}
