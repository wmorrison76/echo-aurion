import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXTENSIONS = new Set(['.ts', '.tsx', '.jsx', '.js']);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.gitnexus',
  'INSTALL',
]);

const SUSPICIOUS_RATIO = 200;
const MIN_FILE_SIZE = 1000;

interface Suspect {
  file: string;
  size: number;
  lines: number;
  ratio: number;
}

async function walk(dir: string, results: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) await walk(full, results);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

async function check(file: string): Promise<Suspect | null> {
  const content = await fs.readFile(file, 'utf8');
  const size = content.length;
  if (size < MIN_FILE_SIZE) return null;
  const lines = content.split('\n').length;
  const ratio = size / lines;
  if (ratio >= SUSPICIOUS_RATIO) {
    return { file: path.relative(ROOT, file), size, lines, ratio: Math.round(ratio) };
  }
  return null;
}

async function main() {
  const files = await walk(ROOT);
  const suspects: Suspect[] = [];
  for (const file of files) {
    const result = await check(file);
    if (result) suspects.push(result);
  }
  if (suspects.length === 0) {
    console.log('✓ collapsed-files: clean');
    process.exit(0);
  }
  console.error(`✗ collapsed-files: ${suspects.length} suspect file(s)`);
  for (const s of suspects.sort((a, b) => b.ratio - a.ratio)) {
    console.error(`  ${s.file} — ${s.size}b / ${s.lines}L (ratio ${s.ratio})`);
  }
  console.error('\nRun: npx prettier --write <file> to fix.');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
