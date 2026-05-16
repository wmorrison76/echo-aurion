/**
 * ===========================================================================
 * Property fixture — Grand Floridian-shaped synthetic data for the demo
 * ===========================================================================
 * Layer:    Test / demo seed
 * Status:   PARTIAL (one example fully populated; remaining slots marked TODO)
 * Phase:    1
 *
 * Purpose:  Synthetic property + outlets + staff + active visits the demo
 *           runs against. Lets the trajectory dashboard render real-looking
 *           tiles, the whisper widget have something to whisper about, and
 *           the intervention library surface candidates against actual
 *           guest affect coordinates.
 *
 *           ONE OF EACH category is fully filled in below as the example
 *           shape. The TODO markers are where William's taste replaces the
 *           placeholder. Until he edits, the demo runs against the example
 *           plus generated UUIDs for the placeholders — defensible enough
 *           for a Day 12 dry run.
 *
 * How to edit (William, dictate-friendly):
 *   - Outlets: tell me your 4-6 dining/wellness/marina rooms by name.
 *     Format: "{name}: {short description}"
 *     Example: "Victoria's: Michelin-tier tasting room, 8 tables, intimate"
 *   - Staff: 12-18 first names + roles.
 *     Format: "{name} - {role}"
 *     Example: "Maria - captain"
 *   - Active visits: 5-8 guests checking in across the demo service window.
 *     Format: "{guest name}, party of {n}, {occasion}, arriving {time},
 *              starting affect: {high-pos / high-neg / low-pos / low-neg}"
 *     Example: "Henderson, party of 2, anniversary, 6pm Friday, low-pos"
 *
 * SECURITY: All data here is synthetic. Names and IDs are intentionally
 * fictional. NEVER seed this fixture against a production database.
 * The seed script `scripts/echo-resonance/seed-demo-fixture.ts` requires
 * DATABASE_URL_TEST to be set explicitly — it refuses production URLs.
 * ===========================================================================
 */

import type {
  AffectQuadrant,
  ResonanceChannel,
} from '../../../shared/types/resonance';

// ---------------------------------------------------------------------------
// Property identity
// ---------------------------------------------------------------------------

export const PROPERTY = {
  id: 'aaaaaaaa-1111-1111-1111-111111111111',
  name: 'Aurum Grand Floridian-shaped Demo',
  /**
   * Synthetic property — fictional but operationally realistic. Replace name
   * + brand voice in production via the LUCCCA properties table; this
   * fixture is for the demo only.
   */
  brandVoice: 'understated luxury · the gesture in the glue',
};

// ---------------------------------------------------------------------------
// Outlets
//   ONE example fully populated below. Replace the TODO entries with your
//   outlet inventory in your own time.
// ---------------------------------------------------------------------------

export interface OutletFixture {
  id: string;
  name: string;
  type: 'fine-dining' | 'casual-dining' | 'bar' | 'breakfast' | 'banquet' | 'spa' | 'pool' | 'beach-club' | 'marina' | 'kids-club';
  description: string;
}

export const OUTLETS: OutletFixture[] = [
  // ── EXAMPLE (fully populated) ─────────────────────────────────────────
  {
    id: 'bbbbbbbb-1111-0000-0000-000000000001',
    name: "Victoria's",
    type: 'fine-dining',
    description:
      'Michelin-tier tasting room. Eight tables, two seatings nightly. Captain-and-server-pair service model. The platform\'s testbed for the in-the-zone protect template.',
  },
  // ── TODO: replace these when ready ────────────────────────────────────
  {
    id: 'bbbbbbbb-1111-0000-0000-000000000002',
    name: 'TODO outlet 2',
    type: 'casual-dining',
    description: 'TODO: name + a sentence in your voice',
  },
  {
    id: 'bbbbbbbb-1111-0000-0000-000000000003',
    name: 'TODO outlet 3',
    type: 'bar',
    description: 'TODO',
  },
  {
    id: 'bbbbbbbb-1111-0000-0000-000000000004',
    name: 'TODO outlet 4',
    type: 'breakfast',
    description: 'TODO',
  },
  {
    id: 'bbbbbbbb-1111-0000-0000-000000000005',
    name: 'TODO outlet 5',
    type: 'spa',
    description: 'TODO',
  },
  {
    id: 'bbbbbbbb-1111-0000-0000-000000000006',
    name: 'TODO outlet 6',
    type: 'beach-club',
    description: 'TODO',
  },
];

// ---------------------------------------------------------------------------
// Staff
//   ONE example fully populated. Replace TODO entries.
// ---------------------------------------------------------------------------

export interface StaffFixture {
  id: string;
  firstName: string;
  role: 'captain' | 'server' | 'sommelier' | 'front-desk' | 'concierge' | 'gm' | 'host' | 'bartender' | 'spa-therapist' | 'banquet-captain';
  outletId?: string;
}

export const STAFF: StaffFixture[] = [
  // ── EXAMPLE ────────────────────────────────────────────────────────────
  {
    id: 'cccccccc-1111-0000-0000-000000000001',
    firstName: 'Maria',
    role: 'captain',
    outletId: OUTLETS[0].id, // Victoria's
  },
  // ── TODO: 12-17 more, real first names + roles ────────────────────────
  { id: 'cccccccc-1111-0000-0000-000000000002', firstName: 'TODO', role: 'sommelier', outletId: OUTLETS[0].id },
  { id: 'cccccccc-1111-0000-0000-000000000003', firstName: 'TODO', role: 'front-desk' },
  { id: 'cccccccc-1111-0000-0000-000000000004', firstName: 'TODO', role: 'concierge' },
  { id: 'cccccccc-1111-0000-0000-000000000005', firstName: 'TODO', role: 'gm' },
  { id: 'cccccccc-1111-0000-0000-000000000006', firstName: 'TODO', role: 'server' },
  { id: 'cccccccc-1111-0000-0000-000000000007', firstName: 'TODO', role: 'bartender' },
  { id: 'cccccccc-1111-0000-0000-000000000008', firstName: 'TODO', role: 'host' },
];

// ---------------------------------------------------------------------------
// Active visits — what the dashboard renders
//   ONE example fully populated. Replace TODO entries.
//
//   Each visit becomes a TrajectoryTile on the floor view. The
//   `startingQuadrant` drives the entry score and the initial readings the
//   demo replays into the system. The dashboard then evolves these via
//   the whisper widget + intervention library during the dry run.
// ---------------------------------------------------------------------------

export interface VisitFixture {
  visitId: string;
  guestId: string;
  guestName: string; // first + last (last initial only for demo per Tenet 5 spirit)
  partySize: number;
  tableOrRoom: string;
  occasion: 'anniversary' | 'birthday' | 'business' | 'leisure' | 'memorial' | 'honeymoon' | 'celebration' | 'recovery';
  /** Starting affect — drives entry score + initial reading. */
  startingQuadrant: AffectQuadrant;
  /** When the visit checks in (ISO time, demo-relative). */
  arrivalTimeIso: string;
  /** Optional seed signal that informs the intervention library. */
  initialSignals?: Array<{ kind: string; value: string }>;
  capturedBy: string; // staff id
  channel: ResonanceChannel;
}

export const VISITS: VisitFixture[] = [
  // ── EXAMPLE — anniversary couple from delayed flight ─────────────────
  {
    visitId: 'dddddddd-1111-0000-0000-000000000001',
    guestId: 'eeeeeeee-1111-0000-0000-000000000001',
    guestName: 'Henderson party',
    partySize: 2,
    tableOrRoom: 'Suite 412',
    occasion: 'anniversary',
    startingQuadrant: 'low-pos', // tired but content; the Mary Flagler shape
    arrivalTimeIso: '2026-05-09T22:30:00.000Z',
    initialSignals: [
      { kind: 'arrival-mode', value: 'delayed-flight' },
      { kind: 'occasion', value: 'anniversary-7' },
    ],
    capturedBy: STAFF[2].id, // front desk lead
    channel: 'observation',
  },
  // ── TODO: 4-7 more visits across the four quadrants ──────────────────
  {
    visitId: 'dddddddd-1111-0000-0000-000000000002',
    guestId: 'eeeeeeee-1111-0000-0000-000000000002',
    guestName: 'TODO 2',
    partySize: 4,
    tableOrRoom: 'TODO',
    occasion: 'leisure',
    startingQuadrant: 'high-pos',
    arrivalTimeIso: '2026-05-09T18:00:00.000Z',
    capturedBy: STAFF[2].id,
    channel: 'observation',
  },
  {
    visitId: 'dddddddd-1111-0000-0000-000000000003',
    guestId: 'eeeeeeee-1111-0000-0000-000000000003',
    guestName: 'TODO 3 (high-neg test case)',
    partySize: 3,
    tableOrRoom: 'TODO',
    occasion: 'business',
    startingQuadrant: 'high-neg',
    arrivalTimeIso: '2026-05-09T19:15:00.000Z',
    capturedBy: STAFF[2].id,
    channel: 'observation',
  },
  {
    visitId: 'dddddddd-1111-0000-0000-000000000004',
    guestId: 'eeeeeeee-1111-0000-0000-000000000004',
    guestName: 'TODO 4 (low-neg / withdrawn solo diner)',
    partySize: 1,
    tableOrRoom: 'TODO',
    occasion: 'recovery',
    startingQuadrant: 'low-neg',
    arrivalTimeIso: '2026-05-09T20:00:00.000Z',
    capturedBy: STAFF[2].id,
    channel: 'observation',
  },
  {
    visitId: 'dddddddd-1111-0000-0000-000000000005',
    guestId: 'eeeeeeee-1111-0000-0000-000000000005',
    guestName: 'TODO 5 (returning-after-loss)',
    partySize: 1,
    tableOrRoom: 'TODO',
    occasion: 'memorial',
    startingQuadrant: 'low-pos',
    arrivalTimeIso: '2026-05-09T19:30:00.000Z',
    initialSignals: [{ kind: 'returning-guest', value: 'memorial-context' }],
    capturedBy: STAFF[2].id,
    channel: 'observation',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a starting quadrant to (arousal, valence, resonance score) for
 * the seed reading. Mirrors the WhisperWidget quadrant defaults.
 */
export function quadrantToReading(q: AffectQuadrant): {
  arousal: number;
  valence: number;
  resonance: number;
} {
  switch (q) {
    case 'high-pos':
      return { arousal: 0.7, valence: 0.7, resonance: 9 };
    case 'high-neg':
      return { arousal: 0.7, valence: -0.7, resonance: 4 };
    case 'low-pos':
      return { arousal: -0.5, valence: 0.6, resonance: 7 };
    case 'low-neg':
      return { arousal: -0.5, valence: -0.6, resonance: 4 };
  }
}
