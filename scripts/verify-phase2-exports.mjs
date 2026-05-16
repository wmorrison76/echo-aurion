#!/usr/bin/env node
/**
 * Phase 2 Export Verification Script
 * 
 * Verifies that all Genesis panels and Schedule components have correct exports
 * and React imports for Phase 2 completion.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const modulesPath = path.join(projectRoot, 'client', 'modules');

console.log('🔍 Phase 2 Export Verification\n');
console.log('============================================================\n');

// Check Genesis panels
const genesisPanelsPath = path.join(modulesPath, 'Genesis', 'panels');
const genesisPanels = fs.existsSync(genesisPanelsPath) 
  ? fs.readdirSync(genesisPanelsPath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.tsx'))
      .map(dirent => dirent.name)
  : [];

console.log(`📋 Genesis Panels: ${genesisPanels.length} files\n`);

let genesisIssues = [];
genesisPanels.forEach(panel => {
  const panelPath = path.join(genesisPanelsPath, panel);
  const content = fs.readFileSync(panelPath, 'utf-8');
  
  const hasDefaultExport = /export\s+default\s+function\s+\w+|export\s+default\s+\w+/.test(content);
  const hasReactImport = /^import.*React|^import\s+React/.test(content) || /import\s+.*from\s+["']react["']/.test(content);
  
  if (!hasDefaultExport) {
    genesisIssues.push({ panel, issue: 'Missing default export' });
  }
  if (!hasReactImport && /useState|useEffect|useMemo/.test(content)) {
    genesisIssues.push({ panel, issue: 'Missing React import but uses hooks' });
  }
});

// Check Schedule components
const scheduleComponentsPath = path.join(modulesPath, 'Schedule', 'client', 'components');
const scheduleComponents = [];

function findScheduleComponents(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    const fullPath = path.join(dir, item.name);
    if (item.isFile() && item.name.endsWith('.tsx') && item.name.includes('Panel') || item.name.includes('Dashboard')) {
      const relativePath = path.relative(scheduleComponentsPath, fullPath);
      scheduleComponents.push(relativePath);
    } else if (item.isDirectory() && item.name !== 'ui') {
      findScheduleComponents(fullPath);
    }
  });
}

findScheduleComponents(scheduleComponentsPath);

console.log(`📋 Schedule Components: ${scheduleComponents.length} files\n`);

let scheduleIssues = [];
scheduleComponents.forEach(component => {
  const componentPath = path.join(scheduleComponentsPath, component);
  if (!fs.existsSync(componentPath)) {
    scheduleIssues.push({ component, issue: 'File not found' });
    return;
  }
  
  const content = fs.readFileSync(componentPath, 'utf-8');
  const hasDefaultExport = /export\s+default\s+function\s+\w+|export\s+default\s+\w+/.test(content);
  const hasReactImport = /^import.*React|^import\s+React/.test(content) || /import\s+.*from\s+["']react["']/.test(content);
  
  if (!hasDefaultExport) {
    scheduleIssues.push({ component, issue: 'Missing default export' });
  }
  if (!hasReactImport && /useState|useEffect|useMemo/.test(content)) {
    scheduleIssues.push({ component, issue: 'Missing React import but uses hooks' });
  }
});

console.log('============================================================\n');
console.log('📊 SUMMARY\n');
console.log(`✅ Genesis Panels: ${genesisPanels.length - genesisIssues.length}/${genesisPanels.length} correct`);
console.log(`✅ Schedule Components: ${scheduleComponents.length - scheduleIssues.length}/${scheduleComponents.length} correct`);

if (genesisIssues.length > 0 || scheduleIssues.length > 0) {
  console.log('\n⚠️  ISSUES FOUND:\n');
  if (genesisIssues.length > 0) {
    console.log('Genesis Panels:');
    genesisIssues.forEach(({ panel, issue }) => {
      console.log(`   - ${panel}: ${issue}`);
    });
  }
  if (scheduleIssues.length > 0) {
    console.log('\nSchedule Components:');
    scheduleIssues.forEach(({ component, issue }) => {
      console.log(`   - ${component}: ${issue}`);
    });
  }
  process.exit(1);
} else {
  console.log('\n✅ All exports verified correct!');
  process.exit(0);
}
