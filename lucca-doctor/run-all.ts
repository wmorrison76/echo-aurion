import { spawnSync } from 'child_process';

const checks: Array<[string, string]> = [
  ['collapsed-files', 'lucca-doctor/collapsed-files.ts'],
  ['circular-deps', 'lucca-doctor/circular-deps.ts'],
  ['missing-indexes', 'lucca-doctor/missing-indexes.ts'],
  ['missing-exports', 'lucca-doctor/missing-exports.ts'],
  ['alias-check', 'lucca-doctor/alias-check.ts'],
];

let failed = 0;
for (const [, script] of checks) {
  const result = spawnSync('npx', ['tsx', script], { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}

if (failed > 0) {
  console.error(`\n✗ lucca-doctor: ${failed}/${checks.length} check(s) failed`);
  process.exit(1);
}
console.log('\n✓ lucca-doctor: all checks passed');
