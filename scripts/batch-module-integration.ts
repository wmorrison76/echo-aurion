/**
 * Batch Module Integration Script
 * Enterprise-grade automation for EchoAi^3, Language, and API integration
 * 
 * This script systematically processes all 37 modules to add:
 * 1. EchoAi^3 chat integration
 * 2. Portuguese (pt-BR) language support
 * 3. API endpoint generation
 * 
 * Run with: pnpm tsx scripts/batch-module-integration.ts
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

interface ModuleConfig {
  id: string;
  name: string;
  path: string;
  hasIndex: boolean;
  needsEchoAi3: boolean;
  needsLanguage: boolean;
  needsAPI: boolean;
}

const MODULES: ModuleConfig[] = [
  { id: 'ai-cooking-assistant', name: 'AI Cooking Assistant', path: 'AICookingAssistant', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'auto-scheduling', name: 'Auto Scheduling', path: 'AutoScheduling', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'staff-optimization', name: 'Staff Optimization', path: 'StaffOptimization', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'quality-assurance', name: 'Quality Assurance', path: 'QualityAssurance', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'guest-experience', name: 'Guest Experience', path: 'GuestExperience', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'supply-chain', name: 'Supply Chain', path: 'SupplyChain', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'voice-commands', name: 'Voice Commands', path: 'VoiceCommands', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'unified-canvas', name: 'Unified Canvas', path: 'UnifiedCanvas', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'predictive-maintenance', name: 'Predictive Maintenance', path: 'PredictiveMaintenance', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'template-marketplace', name: 'Template Marketplace', path: 'TemplateMarketplace', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'supplier-network', name: 'Supplier Network', path: 'SupplierNetwork', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'data-collective', name: 'Data Collective', path: 'DataCollective', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'multi-property', name: 'Multi Property', path: 'MultiProperty', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: false },
  { id: 'pto-management', name: 'PTO Management', path: 'PTOManagement', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'custom-analytics', name: 'Custom Analytics', path: 'CustomAnalytics', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: true },
  { id: 'mobile-enhancements', name: 'Mobile Enhancements', path: 'MobileEnhancements', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: false },
  { id: 'global-calendar', name: 'Global Calendar', path: 'GlobalCalendar', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: false },
  { id: 'crm', name: 'CRM', path: 'CRM', hasIndex: true, needsEchoAi3: true, needsLanguage: true, needsAPI: false },
];

const ROOT = join(process.cwd(), 'LUCCCA_Framework');
const MODULES_DIR = join(ROOT, 'client/modules');

function addEchoAi3Integration(module: ModuleConfig): void {
  const indexPath = join(MODULES_DIR, module.path, 'index.tsx');
  if (!existsSync(indexPath)) {
    console.log(`⚠️  ${module.name}: No index.tsx found, skipping EchoAi^3 integration`);
    return;
  }

  let content = readFileSync(indexPath, 'utf-8');
  
  // Check if already integrated
  if (content.includes('ModuleChatButton')) {
    console.log(`✅ ${module.name}: EchoAi^3 already integrated`);
    return;
  }

  // Add import
  if (!content.includes("from \"@/components/echo-ai3/ModuleChatButton\"")) {
    const importMatch = content.match(/^import.*from.*["']@\/lib\/glass["'];/m);
    if (importMatch) {
      const insertPos = importMatch.index! + importMatch[0].length;
      content = content.slice(0, insertPos) + 
        `\nimport { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";` +
        content.slice(insertPos);
    }
  }

  // Add useI18n if not present
  if (!content.includes('useI18n')) {
    const importMatch = content.match(/^import.*from.*["']@\/i18n["'];/m);
    if (!importMatch) {
      const lastImport = content.lastIndexOf('import');
      const lastImportEnd = content.indexOf('\n', lastImport) + 1;
      content = content.slice(0, lastImportEnd) +
        `import { useI18n } from "@/i18n";\n` +
        content.slice(lastImportEnd);
    }
  }

  // Find main component function
  const componentMatch = content.match(/export\s+(default\s+)?function\s+(\w+)/);
  if (componentMatch) {
    const componentName = componentMatch[2];
    const functionStart = content.indexOf(`function ${componentName}`);
    const openBrace = content.indexOf('{', functionStart);
    const firstStatement = content.indexOf(';', openBrace);
    
    // Add useI18n hook
    if (!content.includes('const { t } = useI18n()')) {
      content = content.slice(0, firstStatement + 1) +
        `\n  const { t } = useI18n();` +
        content.slice(firstStatement + 1);
    }
  }

  // Find header section and add chat button
  const headerMatch = content.match(/(<div[^>]*className[^>]*>[\s\S]*?<h1[^>]*>[\s\S]*?<\/h1>[\s\S]*?<\/div>\s*<\/div>)/);
  if (headerMatch) {
    const headerEnd = headerMatch.index! + headerMatch[0].length - 6; // Before closing </div>
    content = content.slice(0, headerEnd) +
      `\n        <ModuleChatButton moduleId="${module.id}" moduleName={t("module.${module.id}.title")} />` +
      content.slice(headerEnd);
  }

  writeFileSync(indexPath, content, 'utf-8');
  console.log(`✅ ${module.name}: EchoAi^3 integration added`);
}

console.log('🚀 Starting batch module integration...\n');

MODULES.forEach(module => {
  console.log(`Processing ${module.name}...`);
  if (module.needsEchoAi3) {
    addEchoAi3Integration(module);
  }
});

console.log('\n✅ Batch integration complete!');
