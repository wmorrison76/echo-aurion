#!/usr/bin/env node
/**
 * Module Index File Checker
 * 
 * Verifies that all modules have index.tsx or index.ts entry points.
 * 
 * Usage: node scripts/check-module-indexes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const modulesPath = path.join(projectRoot, 'client', 'modules');

console.log('🔍 Checking Module Index Files\n');
console.log('============================================================\n');

if (!fs.existsSync(modulesPath)) {
  console.error('❌ Modules directory not found:', modulesPath);
  process.exit(1);
}

const moduleDirs = fs.readdirSync(modulesPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found ${moduleDirs.length} module directories\n`);

const missingIndex = [];
const hasIndex = [];

moduleDirs.forEach(moduleName => {
  const modulePath = path.join(modulesPath, moduleName);
  const indexTsx = path.join(modulePath, 'index.tsx');
  const indexTs = path.join(modulePath, 'index.ts');
  
  if (fs.existsSync(indexTsx) || fs.existsSync(indexTs)) {
    hasIndex.push(moduleName);
    console.log(`✅ ${moduleName} - has index file`);
  } else {
    missingIndex.push(moduleName);
    console.log(`❌ ${moduleName} - missing index file`);
  }
});

console.log('\n============================================================\n');
console.log('📊 SUMMARY\n');
console.log(`✅ Modules with index: ${hasIndex.length}`);
console.log(`❌ Modules missing index: ${missingIndex.length}`);

if (missingIndex.length > 0) {
  console.log('\n⚠️  MODULES MISSING INDEX FILES:');
  missingIndex.forEach(name => {
    console.log(`   - ${name}`);
  });
  console.log('\n💡 These modules may not load correctly.');
  console.log('   Create index.tsx or index.ts in each module directory.');
  process.exit(1);
} else {
  console.log('\n✅ All modules have index files!');
  process.exit(0);
}
