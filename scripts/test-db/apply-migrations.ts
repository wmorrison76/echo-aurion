/**
 * scripts/test-db/apply-migrations.ts
 *
 * CLI entrypoint for the `npm run test:db:apply-migrations` script.
 * Loads .env.test, then spawns server/database/migrate.ts with
 * DATABASE_URL=DATABASE_URL_TEST in the child env so the runner connects
 * to the test database without ever mutating the parent process's
 * production-pointing DATABASE_URL.
 *
 * Usage:
 *   npm run test:db:apply-migrations
 *
 * Prerequisites:
 *   - .env.test exists at repo root with DATABASE_URL_TEST set
 *   - See docs/maestro/recon/BLOCKER_A_NEON_SETUP.md for setup steps
 */

import * as dotenv from 'dotenv';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');

dotenv.config({ path: path.join(REPO_ROOT, '.env.test') });

const url = process.env.DATABASE_URL_TEST;
if (!url) {
  console.error('❌ DATABASE_URL_TEST is not set.');
  console.error('   Create .env.test at repo root and add the connection string.');
  console.error('   See docs/maestro/recon/BLOCKER_A_NEON_SETUP.md for setup steps.');
  process.exit(1);
}

console.log('🚀 Applying migrations to test database...\n');

const proc = spawn('npx', ['tsx', 'server/database/migrate.ts'], {
  cwd: REPO_ROOT,
  env: {
    ...process.env,
    DATABASE_URL: url,
    NODE_ENV: 'test',
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

proc.on('error', (err) => {
  console.error('❌ Failed to spawn migration runner:', err.message);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code ?? 1);
});
