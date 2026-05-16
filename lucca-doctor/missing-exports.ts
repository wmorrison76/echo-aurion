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

const DEFAULT_IMPORT_RE = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
const HAS_DEFAULT_EXPORT_RE = /export\s+default\b/;

interface Issue {
  file: string;
  importedPath: string;
  resolvedFile: string;
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

async function resolveImport(
  importingFile: string,
  importPath: string,
  aliasMap: Record<string, string>,
): Promise<string | null> {
  let basePath: string;
  if (importPath.startsWith('@/')) {
    const target = aliasMap['@'];
    if (!target) return null;
    basePath = path.join(ROOT, target.replace(/\/\*$/, ''), importPath.slice(2));
  } else if (importPath.startsWith('.')) {
    basePath = path.resolve(path.dirname(importingFile), importPath);
  } else {
    return null;
  }

  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ];
  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch {}
  }
  return null;
}

async function fileHasDefaultExport(file: string): Promise<boolean> {
  try {
    const content = await fs.readFile(file, 'utf8');
    return HAS_DEFAULT_EXPORT_RE.test(content);
  } catch {
    return false;
  }
}

async function main() {
  const aliasMap = readTsconfigAliases();
  const files = await walk(ROOT);
  const issues: Issue[] = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    let match;
    while ((match = DEFAULT_IMPORT_RE.exec(content)) !== null) {
      const [, , importPath] = match;
      const importStart = content.lastIndexOf('import', match.index);
      if (content.slice(importStart, match.index).includes('type ')) continue;
      const resolved = await resolveImport(file, importPath, aliasMap);
      if (!resolved) continue;
      if (!(await fileHasDefaultExport(resolved))) {
        issues.push({
          file: path.relative(ROOT, file),
          importedPath: importPath,
          resolvedFile: path.relative(ROOT, resolved),
        });
      }
    }
  }

  if (issues.length === 0) {
    console.log('✓ missing-exports: clean');
    process.exit(0);
  }
  console.error(
    `✗ missing-exports: ${issues.length} default-import(s) target file(s) without default export`,
  );
  for (const i of issues.slice(0, 50)) {
    console.error(`  ${i.file} imports ${i.importedPath} → ${i.resolvedFile} (no default export)`);
  }
  if (issues.length > 50) console.error(`  ... and ${issues.length - 50} more`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
