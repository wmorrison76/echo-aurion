/**
 * ===========================================================================
 * Test database helpers
 * ===========================================================================
 * Layer:    tests / saucier-prep
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Building blocks for integration tests gated on DATABASE_URL_TEST.
 *           NEVER call these from a runtime path that touches DATABASE_URL
 *           (production). Test files must use describe.skipIf(!DATABASE_URL_TEST)
 *           before invoking any helper here.
 *
 * Exports:
 *   - getTestPool(): pg Pool connected to DATABASE_URL_TEST (cached singleton)
 *   - closeTestPool(): graceful pool shutdown for afterAll hooks
 *   - withTransaction(pool, fn): BEGIN/ROLLBACK wrapper — Postgres transactional
 *     DDL semantics mean schema-touch tests inside the callback also roll back
 *   - applyMigrations(): spawns server/database/migrate.ts in a child process
 *     with DATABASE_URL=DATABASE_URL_TEST set in env. Never mutates in-process
 *     env. Idempotent because all echo_resonance migrations use
 *     CREATE TABLE IF NOT EXISTS.
 *
 * SECURITY:
 *   - Connection strings are never logged. pg-node redacts passwords from
 *     error messages. The spawn inherits stdio for visibility during dev;
 *     anyone running tests sees migration progress without leaking creds.
 *
 * WARNING: DO NOT call applyMigrations() against the production DATABASE_URL.
 *          The skip guard requires DATABASE_URL_TEST, not DATABASE_URL.
 * ===========================================================================
 */

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');

let cachedPool: Pool | null = null;

/**
 * Returns a pg Pool connected to DATABASE_URL_TEST.
 * Throws if the env var is unset — callers MUST gate via describe.skipIf first.
 */
export function getTestPool(): Pool {
  if (cachedPool) return cachedPool;
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set');
  }
  // Neon-style: ensure sslmode=require is in the connection string.
  const withSsl = url.includes('sslmode=')
    ? url
    : url + (url.includes('?') ? '&' : '?') + 'sslmode=require';
  cachedPool = new Pool({
    connectionString: withSsl,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return cachedPool;
}

/**
 * Closes the cached test pool. Call from afterAll() in test suites.
 * Idempotent — safe to call when no pool is open.
 */
export async function closeTestPool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = null;
  }
}

/**
 * Wraps a callback in a BEGIN/ROLLBACK transaction so test-side writes don't
 * persist. Postgres supports transactional DDL — schema changes inside the
 * callback also roll back, so this works for migration-shape tests too.
 *
 * Caller exceptions still propagate after rollback, so `expect().rejects`
 * patterns work naturally.
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('ROLLBACK');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {
        // swallow — the original error is what the caller cares about
      });
      throw err;
    }
  } finally {
    client.release();
  }
}

/**
 * Runs server/database/migrate.ts against DATABASE_URL_TEST in a child process.
 * Forks with DATABASE_URL=DATABASE_URL_TEST in the env, never mutating in-process
 * env (which would break the production connection module if it ever imported).
 *
 * Migrations are idempotent (CREATE TABLE IF NOT EXISTS), so this is safe to
 * call multiple times — the runner's schema_migrations table tracks what's
 * already applied.
 */
export async function applyMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    throw new Error('DATABASE_URL_TEST is not set');
  }
  return new Promise((resolve, reject) => {
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
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`migrate.ts exited with code ${code}`));
    });
  });
}
