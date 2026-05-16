// Generates release notes markdown from git log using Conventional Commits.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const TAG = process.env.RELEASE_TAG || '0.1.0';
const RANGE = process.env.RELEASE_RANGE || '';
const args = ['log', '--pretty=format:%H|%ad|%s', '--date=short'];
if (RANGE) args.push(RANGE);
const res = spawnSync('git', args, { encoding: 'utf8' });
if (res.status !== 0) {
  console.error('git log failed:', res.stderr);
  process.exit(1);
}

const lines = res.stdout.trim().split('\n').filter(Boolean);
const sections = { feat: [], fix: [], perf: [], docs: [], chore: [], refactor: [], test: [], ci: [], build: [], style: [], revert: [] };
for (const line of lines){
  const [, , subject] = line.split('|');
  const m = subject.match(/^(\w+)(?:\(.*\))?:\s*(.*)$/);
  if (m && sections[m[1]]) sections[m[1]].push(m[2]);
}

function section(name, items){
  if (!items.length) return '';
  return `\n### ${name}\n- ` + items.join('\n- ') + '\n';
}

let md = `# Release ${TAG}\n`;
for (const key of Object.keys(sections)){
  md += section(key, sections[key]);
}
writeFileSync('RELEASE_NOTES.md', md);
console.log('✓ Wrote RELEASE_NOTES.md');
