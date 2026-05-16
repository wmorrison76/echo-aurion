import { promises as fs } from 'fs';
import path from 'path';
import { readTsconfigAliases } from './_tsconfig';

const ROOT = process.cwd();
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.gitnexus',
  'INSTALL',
]);

const IMPORT_RE = /from\s+['"](@\/[^'"]+)['"]/g;

interface Issue {
  file: string;
  importPath: string;
  resolvedDir: string;
}

async function walk(dir: string, results: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) await walk(full, results);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function resolveAlias(aliasPath: string, aliasMap: Record<string, string>): string | null {
  const sorted = Object.keys(aliasMap).sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (aliasPath.startsWith(alias)) {
      const rest = aliasPath.slice(alias.length);
      const target = aliasMap[alias].replace(/\/\*$/, '');
      return path.join(ROOT, target, rest);
    }
  }
  return null;
}

async function isDirectoryWithoutIndex(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isDirectory()) return false;
    const candidates = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
    for (const c of candidates) {
      try {
        await fs.access(path.join(filePath, c));
        return false;
      } catch {}
    }
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const aliasMap = readTsconfigAliases();
  if (Object.keys(aliasMap).length === 0) {
    console.log('⚠ missing-indexes: no path aliases found in tsconfig — skipping');
    process.exit(0);
  }

  const files = await walk(ROOT);
  const issues: Issue[] = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    let match;
    while ((match = IMPORT_RE.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = resolveAlias(importPath, aliasMap);
      if (!resolved) continue;
      if (await isDirectoryWithoutIndex(resolved)) {
        issues.push({
          file: path.relative(ROOT, file),
          importPath,
          resolvedDir: path.relative(ROOT, resolved),
        });
      }
    }
  }

  if (issues.length === 0) {
    console.log('✓ missing-indexes: clean');
    process.exit(0);
  }
  const seen = new Set<string>();
  const unique = issues.filter((i) =>
    seen.has(i.resolvedDir) ? false : (seen.add(i.resolvedDir), true),
  );
  console.error(`✗ missing-indexes: ${unique.length} folder(s) imported without index.tsx`);
  for (const i of unique) {
    console.error(`  ${i.resolvedDir} ← ${i.file} (imports ${i.importPath})`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
