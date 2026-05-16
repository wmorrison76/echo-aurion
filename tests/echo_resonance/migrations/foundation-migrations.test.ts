/**
 * ===========================================================================
 * TICKET_001 - Foundation migrations integration tests
 * ===========================================================================
 * Layer:    Substrate / Saucier
 * Status:   PARTIAL
 * Phase:    1
 *
 * Purpose:  Verify migrations 008-012 (the resonance + signals foundation):
 *           - SQL structure satisfies the Tenet 2 / Tenet 7 invariants
 *           - Required indexes are present
 *           - Foreign key from interventions_executed -> interventions_library
 *             is preserved
 *           - Migrations are additive-only (no DROP/ALTER on existing LUCCCA
 *             tables)
 *
 *           Tests are organized in two layers:
 *             - Static: read SQL files, assert structural contract.
 *               Runs in any CI without a database. ALWAYS executes.
 *             - DB integration: applies migrations to a real test database,
 *               verifies actual schema state. SKIPPED unless
 *               DATABASE_URL_TEST is set (intentionally distinct from the
 *               production DATABASE_URL).
 *
 * Pending implementation:
 *   - [x] Static structural assertions for 008-012
 *   - [x] Additive-only invariant across all 18 echo_resonance files
 *   - [x] Header-filename consistency check
 *   - [x] DB integration: apply, schema state, FK, indexes, NOT NULL on
 *         expires_at + sensitivity (gated on DATABASE_URL_TEST)
 *   - [ ] DB integration: rollback verification (BLOCKED — no rollback
 *         mechanism exists; see HANDOFF_OVERNIGHT.md and TODO-023 in
 *         server/services/migration-rollback-service.ts — Blocker B)
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 *          DO NOT execute the DB-integration tests against production.
 *          The skip guard requires DATABASE_URL_TEST, NOT DATABASE_URL.
 * ===========================================================================
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';
import {
  applyMigrations,
  closeTestPool,
  getTestPool,
  withTransaction,
} from '../../_helpers/test-db';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(HERE, '../../../server/database/migrations');

function readMigration(filename: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8');
}

const SQL_008 = readMigration('008_resonance_readings.sql');
const SQL_009 = readMigration('009_resonance_trajectories.sql');
const SQL_010 = readMigration('010_interventions_library.sql');
const SQL_011 = readMigration('011_interventions_executed.sql');
const SQL_012 = readMigration('012_signals.sql');

const ALL_ECHO_RESONANCE_FILES = [
  '008_resonance_readings.sql',
  '009_resonance_trajectories.sql',
  '010_interventions_library.sql',
  '011_interventions_executed.sql',
  '012_signals.sql',
  '013_voice_sessions.sql',
  '014_prosody_readings.sql',
  '015_staff_whispers.sql',
  '016_trips.sql',
  '017_trip_briefs.sql',
  '018_trip_blocks.sql',
  '019_corporate_blocks.sql',
  '020_venues.sql',
  '021_media_assets.sql',
  '022_service_credits.sql',
  '023_trust_scores.sql',
  '024_cross_property_consent.sql',
  '025_training_corpus.sql',
];

describe('TICKET_001 - foundation migrations 008-012 (static)', () => {
  describe('008 resonance_readings', () => {
    it('declares CREATE TABLE IF NOT EXISTS resonance_readings', () => {
      expect(SQL_008).toMatch(/CREATE TABLE IF NOT EXISTS\s+resonance_readings/);
    });

    it('Tenet 2: expires_at TIMESTAMPTZ NOT NULL is present', () => {
      expect(SQL_008).toMatch(/expires_at\s+TIMESTAMPTZ\s+NOT NULL/i);
    });

    it('idx_resonance_readings_expires index exists on expires_at', () => {
      expect(SQL_008).toMatch(
        /CREATE INDEX\s+idx_resonance_readings_expires\s+ON\s+resonance_readings\s*\(\s*expires_at\s*\)/i,
      );
    });
  });

  describe('009 resonance_trajectories', () => {
    it('declares CREATE TABLE IF NOT EXISTS resonance_trajectories', () => {
      expect(SQL_009).toMatch(/CREATE TABLE IF NOT EXISTS\s+resonance_trajectories/);
    });

    it('idx_trajectories_property_active is a partial index on active visits', () => {
      expect(SQL_009).toMatch(
        /CREATE INDEX\s+idx_trajectories_property_active\s+ON\s+resonance_trajectories[^;]*WHERE\s+ended_at\s+IS\s+NULL/i,
      );
    });
  });

  describe('010 interventions_library', () => {
    it('declares CREATE TABLE IF NOT EXISTS interventions_library with id PK', () => {
      expect(SQL_010).toMatch(/CREATE TABLE IF NOT EXISTS\s+interventions_library/);
      expect(SQL_010).toMatch(/id\s+UUID\s+PRIMARY KEY/i);
    });
  });

  describe('011 interventions_executed', () => {
    it('declares CREATE TABLE IF NOT EXISTS interventions_executed', () => {
      expect(SQL_011).toMatch(/CREATE TABLE IF NOT EXISTS\s+interventions_executed/);
    });

    it('FK to interventions_library on template_id is preserved', () => {
      expect(SQL_011).toMatch(
        /template_id\s+UUID\s+NOT NULL\s+REFERENCES\s+interventions_library\s*\(\s*id\s*\)/i,
      );
    });
  });

  describe('012 signals', () => {
    it('declares CREATE TABLE IF NOT EXISTS signals', () => {
      expect(SQL_012).toMatch(/CREATE TABLE IF NOT EXISTS\s+signals/);
    });

    it('Tenet 2: expires_at TIMESTAMPTZ NOT NULL is present', () => {
      expect(SQL_012).toMatch(/expires_at\s+TIMESTAMPTZ\s+NOT NULL/i);
    });

    it('Tenet 7: sensitivity TEXT NOT NULL is present', () => {
      expect(SQL_012).toMatch(/sensitivity\s+TEXT\s+NOT NULL/i);
    });

    it('idx_signals_expires index exists on expires_at', () => {
      expect(SQL_012).toMatch(
        /CREATE INDEX\s+idx_signals_expires\s+ON\s+signals\s*\(\s*expires_at\s*\)/i,
      );
    });
  });

  describe('additive-only invariant (all 18 echo_resonance files 008-025)', () => {
    const banned = /DROP\s+TABLE|DROP\s+INDEX|ALTER\s+TABLE[^;]*DROP|ALTER\s+COLUMN|RENAME\s+TO|RENAME\s+COLUMN/gi;

    for (const filename of ALL_ECHO_RESONANCE_FILES) {
      it(`${filename} contains no destructive DDL`, () => {
        const sql = readMigration(filename);
        const hits = sql.match(banned) || [];
        expect(hits).toEqual([]);
      });
    }
  });

  describe('header-filename consistency (foundation 008-012)', () => {
    const cases: Array<[string, RegExp]> = [
      ['008_resonance_readings.sql', /^-- Migration:\s+008\s+-\s+resonance_readings/m],
      ['009_resonance_trajectories.sql', /^-- Migration:\s+009\s+-\s+resonance_trajectories/m],
      ['010_interventions_library.sql', /^-- Migration:\s+010\s+-\s+interventions_library/m],
      ['011_interventions_executed.sql', /^-- Migration:\s+011\s+-\s+interventions_executed/m],
      ['012_signals.sql', /^-- Migration:\s+012\s+-\s+signals/m],
    ];

    for (const [filename, pattern] of cases) {
      it(`${filename} header matches filename`, () => {
        expect(readMigration(filename)).toMatch(pattern);
      });
    }
  });
});

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'TICKET_001 - foundation migrations 008-012 (DB integration)',
  () => {
    // SKIPPED unless DATABASE_URL_TEST is set.
    // NEVER use the production DATABASE_URL here; the skip guard is intentional.
    // beforeAll applies migrations 001-025 in order via the canonical runner;
    // tests then verify schema state via direct queries against information_schema
    // and pg_indexes. Insert-validation tests use withTransaction() so writes
    // never persist.

    let pool: Pool;

    beforeAll(async () => {
      await applyMigrations();
      pool = getTestPool();
    }, 60_000);

    afterAll(async () => {
      await closeTestPool();
    });

    it('all five foundation migrations are recorded in schema_migrations', async () => {
      const result = await pool.query(
        `SELECT filename FROM schema_migrations
         WHERE filename IN (
           '008_resonance_readings.sql',
           '009_resonance_trajectories.sql',
           '010_interventions_library.sql',
           '011_interventions_executed.sql',
           '012_signals.sql'
         )
         ORDER BY filename`,
      );
      expect(result.rows.map((r) => r.filename)).toEqual([
        '008_resonance_readings.sql',
        '009_resonance_trajectories.sql',
        '010_interventions_library.sql',
        '011_interventions_executed.sql',
        '012_signals.sql',
      ]);
    });

    it('LUCCCA foundation migrations 001-007 also recorded — 008-012 applied on top, no conflict', async () => {
      const result = await pool.query(
        `SELECT count(*)::int AS n FROM schema_migrations WHERE filename ~ '^00[1-7]_'`,
      );
      expect(result.rows[0].n).toBeGreaterThanOrEqual(7);
    });

    it('all five expected tables exist in public schema', async () => {
      const result = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name IN (
             'resonance_readings',
             'resonance_trajectories',
             'interventions_library',
             'interventions_executed',
             'signals'
           )
         ORDER BY table_name`,
      );
      expect(result.rows.map((r) => r.table_name)).toEqual([
        'interventions_executed',
        'interventions_library',
        'resonance_readings',
        'resonance_trajectories',
        'signals',
      ]);
    });

    it('FK from interventions_executed.template_id to interventions_library(id) is enforced', async () => {
      await withTransaction(pool, async (client) => {
        const fakeTemplate = '00000000-0000-0000-0000-000000000001';
        await expect(
          client.query(
            `INSERT INTO interventions_executed
               (id, template_id, guest_id, visit_id, proposed_by, status)
             VALUES (gen_random_uuid(), $1::uuid, gen_random_uuid(), gen_random_uuid(), 'staff', 'proposed')`,
            [fakeTemplate],
          ),
        ).rejects.toThrow(/foreign key|violates|reference/i);
      });
    });

    it('expected indexes exist (idx_resonance_readings_expires, idx_signals_expires, idx_trajectories_property_active)', async () => {
      const result = await pool.query(
        `SELECT indexname FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname IN (
             'idx_resonance_readings_expires',
             'idx_signals_expires',
             'idx_trajectories_property_active'
           )
         ORDER BY indexname`,
      );
      expect(result.rows.map((r) => r.indexname)).toEqual([
        'idx_resonance_readings_expires',
        'idx_signals_expires',
        'idx_trajectories_property_active',
      ]);
    });

    it('Tenet 2: NOT NULL on resonance_readings.expires_at is enforced', async () => {
      await withTransaction(pool, async (client) => {
        await expect(
          client.query(
            `INSERT INTO resonance_readings
               (id, guest_id, captured_by, channel, arousal, valence, resonance, confidence)
             VALUES (gen_random_uuid(), gen_random_uuid(), 'staff-id', 'observation', 0.5, 0.5, 7, 0.8)`,
          ),
        ).rejects.toThrow(/null value.*expires_at|expires_at.*null/i);
      });
    });

    it('Tenet 2: NOT NULL on signals.expires_at is enforced', async () => {
      await withTransaction(pool, async (client) => {
        await expect(
          client.query(
            `INSERT INTO signals (id, guest_id, source, subject, sensitivity)
             VALUES (gen_random_uuid(), gen_random_uuid(), 'staff-whisper',
                     '{"kind":"free-text","text":"x"}'::jsonb, 'preference')`,
          ),
        ).rejects.toThrow(/null value.*expires_at|expires_at.*null/i);
      });
    });

    it('Tenet 7: NOT NULL on signals.sensitivity is enforced', async () => {
      await withTransaction(pool, async (client) => {
        await expect(
          client.query(
            `INSERT INTO signals (id, guest_id, source, subject, expires_at)
             VALUES (gen_random_uuid(), gen_random_uuid(), 'staff-whisper',
                     '{"kind":"free-text","text":"x"}'::jsonb,
                     NOW() + interval '1 day')`,
          ),
        ).rejects.toThrow(/null value.*sensitivity|sensitivity.*null/i);
      });
    });

    it.todo(
      'rollback BLOCKED: no rollback mechanism exists. See HANDOFF_OVERNIGHT.md and TODO-023 in server/services/migration-rollback-service.ts (Blocker B)',
    );
  },
);
