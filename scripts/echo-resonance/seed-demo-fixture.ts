/**
 * ===========================================================================
 * seed-demo-fixture — load the property fixture into the test database
 * ===========================================================================
 * Layer:    Demo / seed tooling
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Load tests/fixtures/echo-resonance/property-fixture.ts into the
 *           database so the trajectory dashboard renders real-looking tiles
 *           during the Day 12 dry run + Day 14 demo.
 *
 *           For each visit in the fixture:
 *             1. Insert a resonance_trajectories row with entry score from
 *                the starting quadrant.
 *             2. Insert one initial resonance_readings row driving the
 *                trajectory's currentScore + sparkline.
 *             3. Insert a signal capturing the initial-signals from the
 *                fixture (e.g., anniversary-7, returning-guest), so the
 *                intervention-library has signal pattern to filter on.
 *
 *  Idempotent: ON CONFLICT (visit_id) DO NOTHING on trajectories. Re-running
 *  is safe.
 *
 *  SAFETY: refuses to run unless DATABASE_URL_TEST is set. Never targets the
 *  production DB. The fixture is synthetic; running it in prod would seed
 *  fictional rows that survive Tenet 7 decay (their expires_at is far enough
 *  out to leak through).
 *
 * Usage:
 *     export DATABASE_URL_TEST=postgres://...
 *     pnpm tsx scripts/echo-resonance/seed-demo-fixture.ts
 *
 *  Or via npm script (see package.json):
 *     pnpm demo:seed
 * ===========================================================================
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  PROPERTY,
  STAFF,
  VISITS,
  quadrantToReading,
} from '../../tests/fixtures/echo-resonance/property-fixture';

const DATABASE_URL = process.env.DATABASE_URL_TEST;

async function main(): Promise<void> {
  if (!DATABASE_URL) {
    console.error(
      '[seed-demo-fixture] DATABASE_URL_TEST is not set. Refusing to run.\n' +
        'This script must NOT target production. Provision a Neon test branch and:\n' +
        '  export DATABASE_URL_TEST=postgres://...\n' +
        'before running.',
    );
    process.exit(1);
  }

  // Defensive guard: refuse production-shaped DSNs even if DATABASE_URL_TEST
  // is set to a prod URL by mistake.
  if (
    DATABASE_URL.includes('production') ||
    DATABASE_URL.includes('-prod') ||
    DATABASE_URL.includes('/prod_') ||
    DATABASE_URL.includes('/echo_aurion_prod')
  ) {
    console.error(
      '[seed-demo-fixture] DATABASE_URL_TEST appears to point at a production-named DB:\n' +
        `  ${DATABASE_URL.replace(/:[^@]+@/, ':****@')}\n` +
        'Refusing to run. Use a separate test branch.',
    );
    process.exit(2);
  }

  const pool = new Pool({
    connectionString: DATABASE_URL.includes('sslmode=')
      ? DATABASE_URL
      : `${DATABASE_URL}${DATABASE_URL.includes('?') ? '&' : '?'}sslmode=require`,
    ssl: { rejectUnauthorized: false },
    max: 3,
  });

  console.log('[seed-demo-fixture] connecting…');
  const client = await pool.connect();

  try {
    console.log(`[seed-demo-fixture] property: ${PROPERTY.name} (${PROPERTY.id})`);
    console.log(`[seed-demo-fixture] visits: ${VISITS.length}`);
    console.log(`[seed-demo-fixture] staff:  ${STAFF.length}`);

    let trajectoryInserts = 0;
    let readingInserts = 0;
    let signalInserts = 0;

    for (const visit of VISITS) {
      const seed = quadrantToReading(visit.startingQuadrant);
      const liftGoal = seed.resonance + 2;
      const liftGap = liftGoal - seed.resonance;
      const status =
        liftGap <= 0 ? 'green' : liftGap <= 1.0 ? 'amber' : 'red';

      // 1. Trajectory row
      const tResult = await client.query(
        `INSERT INTO resonance_trajectories
           (visit_id, guest_id, property_id, started_at, last_updated_at,
            entry_score, current_score, trajectory, projected_exit_score,
            lift_goal, lift_gap, status, reading_count, has_open_intervention)
         VALUES ($1, $2, $3, $4, NOW(), $5, $5, 0, $5, $6, $7, $8, 0, false)
         ON CONFLICT (visit_id) DO NOTHING
         RETURNING visit_id`,
        [
          visit.visitId,
          visit.guestId,
          PROPERTY.id,
          visit.arrivalTimeIso,
          seed.resonance,
          liftGoal,
          liftGap,
          status,
        ],
      );
      if (tResult.rowCount && tResult.rowCount > 0) trajectoryInserts++;

      // 2. Initial reading row
      const readingId = uuidv4();
      const readingExpires = new Date(
        Date.now() + 30 * 86_400_000,
      ).toISOString(); // 30 days, matches RETENTION_DAYS.emotional
      const rResult = await client.query(
        `INSERT INTO resonance_readings
           (id, guest_id, visit_id, timestamp, captured_by, channel,
            arousal, valence, resonance, signals, confidence,
            expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6,
                 $7, $8, $9, $10::jsonb, 0.85,
                 $11, NOW(), NOW())`,
        [
          readingId,
          visit.guestId,
          visit.visitId,
          visit.arrivalTimeIso,
          visit.capturedBy,
          visit.channel,
          seed.arousal,
          seed.valence,
          seed.resonance,
          JSON.stringify(visit.initialSignals ?? []),
          readingExpires,
        ],
      );
      if (rResult.rowCount && rResult.rowCount > 0) readingInserts++;

      // 3. Initial signals (if any)
      for (const tag of visit.initialSignals ?? []) {
        const signalId = uuidv4();
        await client.query(
          `INSERT INTO signals
             (id, guest_id, visit_id, timestamp, source, subject, tags,
              conversion, note, sensitivity, expires_at, created_at)
           VALUES ($1, $2, $3, $4, 'staff-whisper',
                   $5::jsonb, $6::jsonb,
                   NULL, NULL, 'emotional', $7, NOW())`,
          [
            signalId,
            visit.guestId,
            visit.visitId,
            visit.arrivalTimeIso,
            JSON.stringify({ kind: 'free-text', text: 'demo seed' }),
            JSON.stringify([tag]),
            readingExpires,
          ],
        );
        signalInserts++;
      }
    }

    console.log('[seed-demo-fixture] complete', {
      trajectories: trajectoryInserts,
      readings: readingInserts,
      signals: signalInserts,
    });
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed-demo-fixture] failed', err);
  process.exit(3);
});
