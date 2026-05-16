import { execSync } from 'child_process';

const SRC_PATHS = ['client', 'server', 'shared', 'cognition'];

function run() {
  const issues: string[][] = [];
  for (const src of SRC_PATHS) {
    try {
      const raw = execSync(
        `npx madge --circular --json --extensions ts,tsx,js,jsx ${src}`,
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const result = JSON.parse(raw) as string[][];
      for (const cycle of result) issues.push(cycle);
    } catch (err: any) {
      try {
        const result = JSON.parse(err.stdout?.toString() || '[]') as string[][];
        for (const cycle of result) issues.push(cycle);
      } catch {
        console.error(`⚠ circular-deps: madge failed on ${src}`);
      }
    }
  }
  if (issues.length === 0) {
    console.log('✓ circular-deps: clean');
    process.exit(0);
  }
  console.error(`✗ circular-deps: ${issues.length} cycle(s)`);
  for (const cycle of issues) {
    console.error(`  ${cycle.join(' → ')} → ${cycle[0]}`);
  }
  console.error('\nFix by extracting shared types/interfaces to a `core/` or `shared/` module.');
  process.exit(1);
}

run();
