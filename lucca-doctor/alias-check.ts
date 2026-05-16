import { promises as fs } from 'fs';
import path from 'path';
import { readTsconfigAliases, type AliasMap } from './_tsconfig';

const ROOT = process.cwd();

function normalizeTarget(target: string): string {
  return target
    .replace(/^\.\//, '')
    .replace(/\/\*$/, '')
    .replace(/\/$/, '');
}

async function readViteAliases(): Promise<AliasMap> {
  const viteFiles = ['vite.config.ts', 'vite.config.js'];
  for (const f of viteFiles) {
    try {
      const raw = await fs.readFile(path.join(ROOT, f), 'utf8');
      const aliasBlock = raw.match(/alias\s*:\s*\{([^}]+)\}/);
      if (!aliasBlock) continue;
      const map: AliasMap = {};
      const entryRe = /['"`]?([@\w\-/.]+)['"`]?\s*:\s*[^,'"`]*['"`]([^'"`]+)['"`]/g;
      let m;
      while ((m = entryRe.exec(aliasBlock[1])) !== null) {
        map[m[1]] = normalizeTarget(m[2]);
      }
      return map;
    } catch {}
  }
  return {};
}

async function main() {
  const ts = readTsconfigAliases();
  const vite = await readViteAliases();

  const issues: string[] = [];
  for (const [alias, target] of Object.entries(ts)) {
    if (!(alias in vite)) {
      issues.push(`tsconfig has alias '${alias}' → '${target}' but vite.config doesn't`);
    } else if (vite[alias] !== target) {
      issues.push(`Alias '${alias}' mismatch: tsconfig='${target}' vite='${vite[alias]}'`);
    }
  }
  for (const [alias, target] of Object.entries(vite)) {
    if (!(alias in ts)) {
      issues.push(`vite.config has alias '${alias}' → '${target}' but tsconfig doesn't`);
    }
  }

  if (issues.length === 0) {
    console.log('✓ alias-check: clean');
    process.exit(0);
  }
  console.error(`✗ alias-check: ${issues.length} alignment issue(s)`);
  for (const i of issues) console.error(`  ${i}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
