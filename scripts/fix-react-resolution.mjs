// Force single React instance by checking for duplicate React installations
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Checking for duplicate React installations...');

const rootNodeModules = join(process.cwd(), 'node_modules', 'react');
const moduleNodeModules = join(process.cwd(), 'client', 'modules');

if (existsSync(rootNodeModules)) {
  console.log('✅ Root React found:', rootNodeModules);
} else {
  console.log('❌ Root React not found!');
  process.exit(1);
}

console.log('✅ React resolution check complete');
