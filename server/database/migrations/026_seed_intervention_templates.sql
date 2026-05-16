-- ===========================================================================
-- Migration: 026 - seed intervention_templates (Phase 1)
-- Layer:    Resonance
-- Phase:    1
-- Purpose:  Seed the intervention library with 10 templates clustered from
--           the operator-wisdom catalog at docs/operator-wisdom/.
--           Master doc §10.2 calls for "20 seed templates"; the BUILD_STATE
--           settled on 10 for the demo. Each template here covers 7-15
--           scenarios from the 200 William captured.
--
--           IMPORTANT: every template ships with times_used=0 and
--           success_rate=0. The library learns from real outcomes; it
--           does NOT pre-seed historical accuracy because that would be
--           uncanny-valley demo data. The numbers are honestly empty.
--
-- Re-runs:  Idempotent via ON CONFLICT (id) DO NOTHING. Safe to re-apply.
-- ===========================================================================

INSERT INTO interventions_library (
  id, name, description, affect_quadrants, requires_signals, exclude_signals,
  approach, effort, lead_time_minutes, estimated_cost_cents, estimated_cost_currency,
  reuse_cooldown_days, departments_required, proxemic_guidance, scripted_direction,
  do_nots, times_used, success_rate, last_used_at, active
) VALUES
(
  '11111111-0000-0000-0000-000000000001',
  'Weary arrival recovery',
  'Skip travel small-talk; offer comfort and a quiet seat in the lounge while the room finalizes. If a child is asleep, route all communication to the awake parent.',
  ARRAY['low-neg', 'low-pos'],
  NULL,
  ARRAY['celebration', 'high-energy'],
  'gentle-approach', 'light', 2, 4500, 'USD',
  0,
  ARRAY['front-desk', 'housekeeping', 'concierge'],
  'Approach from the side at the parent''s eye level; do not loom. Hand the welcome amenity directly, do not offer a tablet first.',
  'Skip questions about the trip itself. Confirm what is known about the room status as a precise number, not a vague phrase. Hand off something warm — a hot towel, a tea, a cool water — within 90 seconds of contact.',
  ARRAY['Do not ask about the trip', 'Do not present a check-in tablet without first offering the seat', 'Do not say it will be "just a few more minutes" if it will be longer', 'Do not move the family from the lounge until the room is verified ready'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000002',
  'Frustrated table calm-and-comp',
  'Captain visits with calm voice; acknowledges the wait briefly without making it the topic; the comp is offered as a gift, not an apology; gives the table physical breathing space after.',
  ARRAY['high-neg'],
  NULL,
  NULL,
  'gentle-approach', 'light', 1, 2500, 'USD',
  7,
  ARRAY['front-of-house'],
  'Approach from the open side; one hand visible; do not crowd. After the brief exchange and the comp, retreat to standby distance.',
  'Captain (not server) makes the visit. Calm voice. Acknowledge the wait in one sentence. Offer the comp framed as a gift: "the chef sent this for you" or "I wanted to bring you a glass of this — please". Do not ask the table to confirm or thank. Step away.',
  ARRAY['Do not apologize at length', 'Do not crowd', 'Do not announce the comp as compensation', 'Do not ask "is everything okay" — they have already shown you it is not'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000003',
  'Two-top tension protect',
  'Drop tempo. Stop visiting the table for non-essentials. Check back through eye contact only; if either guest signals openness, return; if not, give them the next 20 minutes uninterrupted.',
  ARRAY['high-neg'],
  NULL,
  NULL,
  'protective', 'frictionless', 0, 0, 'USD',
  30,
  ARRAY['front-of-house'],
  'No approach unless invited. Sweep the table only on hard signals (empty glass, dropped item). Eye-line check from across the room every 4-6 minutes.',
  'Reduce, do not add. The intervention IS the lack of intervention. Reseat any incoming party out of earshot if possible. If a hard signal happens (dropped glass, hand raised), respond fast and leave fast.',
  ARRAY['Do not ask "how is everything"', 'Do not refill water unprompted', 'Do not seat anyone within earshot', 'Do not have multiple staff visit in succession', 'Do not photograph or allow others to photograph'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000004',
  'In-the-zone protect',
  'Leave them alone. Do less, not more. Mark the moment quietly with a written note tucked into the bill; no spoken acknowledgment, no song, no comped dessert with a sparkler.',
  ARRAY['high-pos'],
  NULL,
  NULL,
  'protective', 'frictionless', 0, 0, 'USD',
  0,
  ARRAY['front-of-house'],
  'Approach only at hard signals. Staff does not photograph or fuss. Pacing matches their energy — if they are slow, you are slow.',
  'The risk on a 9-9 table is overdoing it. Right move is often less. A handwritten line on the bill, no public moment, no announcement. The guest decides what to do with it.',
  ARRAY['No song', 'No announcement', 'No comped dessert with a sparkler', 'No staff hovering', 'No "and what brings you in tonight?"'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000005',
  'Group celebration match-don''t-amplify',
  'Match their energy without amplifying. The captain visits once with a calm congratulatory word and a fresh round at table cost; pacing then goes back to background.',
  ARRAY['high-pos'],
  NULL,
  ARRAY['private', 'discretion-requested'],
  'gentle-approach', 'light', 5, 0, 'USD',
  0,
  ARRAY['front-of-house', 'bar'],
  'Stand at the table edge for the visit; one warm exchange; exit. Do not linger.',
  'One visit, one acknowledgment, one round back to table cost so the celebration continues without us in it. Energy is matched once, then we step back. Other tables are protected from spillover via seating, not via shushing.',
  ARRAY['Do not over-comp', 'Do not refer to the celebration repeatedly', 'Do not seat other tables within earshot', 'Do not use the music to amplify', 'Do not photograph them'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000006',
  'Solo-diner withdrawal honor',
  'Soft tone, sparse questions, let the silence be the silence. Do not entertain. If they engage, answer; if they do not, retreat without showing it.',
  ARRAY['low-neg'],
  NULL,
  NULL,
  'protective', 'frictionless', 0, 0, 'USD',
  0,
  ARRAY['front-of-house'],
  'Side approach; do not lean in; do not maintain eye contact past acknowledgment. Body language stays neutral, not warm and not cold.',
  'The guest came alone for a reason. Answer their questions; do not generate new ones. Service is precise and unhurried. If they want company, they will signal — until then, the staff is present but not seeking.',
  ARRAY['Do not ask about their day', 'Do not suggest joining a busier section', 'Do not over-refill', 'Do not assume sadness', 'Do not assume celebration', 'Do not match-make them with another solo guest'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000007',
  'Returning-after-loss warmth',
  'The table they had before, the server they had before. Brief warm acknowledgment that we know — no celebration, no questions. If they want to talk, the staff listens. If they don''t, the staff gives them the room.',
  ARRAY['low-pos', 'low-neg'],
  ARRAY['returning-guest', 'memorial-context'],
  NULL,
  'gentle-approach', 'light', 5, 0, 'USD',
  0,
  ARRAY['front-desk', 'front-of-house', 'bar'],
  'Minimal approach. One warm initial exchange, then space. The server who knew them is the right server; if unavailable, the captain handles it personally.',
  'Pre-prepare: same table, same staff, same drink available without asking. Initial exchange is one sentence: "good to see you again." No "how have you been?" If the guest opens the door, the staff walks through; if not, the staff stays back.',
  ARRAY['Do not say "I''m sorry for your loss" unless they bring it up', 'Do not seat them at a different table even if better is available', 'Do not bring up old memories first', 'Do not avoid them out of awkwardness — that reads as colder than warmth'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000008',
  'Pre-arrival quiet recall',
  'One preparation that the guest will encounter naturally; never named, never announced. The artwork is in the suite; the cocktail variation is what comes when they order their usual; the morning walk path is highlighted in the welcome card.',
  ARRAY['high-pos', 'high-neg', 'low-pos', 'low-neg'],
  ARRAY['returning-guest'],
  NULL,
  'cascade-only', 'medium', 1440, 5000, 'USD',
  0,
  ARRAY['concierge', 'housekeeping', 'kitchen', 'bar'],
  'No in-person component. The gesture sits in the environment; the staff member who delivers does so silently as if it is normal practice.',
  'Identify the recall (preference, prior request, prior named staff member). Position it where the guest will find it without ceremony. If the guest acknowledges it directly, the staff member confirms once with "yes, we held that for you" and moves on.',
  ARRAY['Do not say "we remembered"', 'Do not have staff bring it up first', 'Do not use the preference as a marketing touchpoint', 'Do not ask the guest to verify the detail before delivering — confidence in our records IS the gesture'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-000000000009',
  'Chicago hot dog moment',
  'The chef adds the course on top of the BEO. The captain delivers it without explanation. The guest is left to discover the meaning. If they ask, the captain says "the chef thought you might enjoy it" and stops there.',
  ARRAY['high-pos', 'low-pos', 'low-neg'],
  ARRAY['mentioned-on-prior-visit', 'memory-trigger'],
  NULL,
  'gentle-approach', 'medium', 30, 1500, 'USD',
  90,
  ARRAY['kitchen', 'front-of-house'],
  'Tableside delivery, no production, no announcement to the room.',
  'The kitchen produces the recall (a dish, a beverage, a small gesture from a prior visit). It arrives between courses without fanfare. The captain does not narrate. If the guest asks, the captain offers the minimum: "the chef thought you might enjoy it." The connection lands or it doesn''t — either is okay.',
  ARRAY['Do not explain the connection unprompted', 'Do not film or photograph', 'Do not put it on the bill', 'Do not have the chef visit the table to take credit', 'Do not bring it back next visit unless they request — gestures lose impact when expected'],
  0, 0, NULL, true
),
(
  '11111111-0000-0000-0000-00000000000a',
  'Lobby/queue pacing rescue',
  'Split the queue. Offer the next family or visibly distressed guest the lounge with water and a comp snack. Communicate ETA precisely. Do not promise faster service — deliver calm instead.',
  ARRAY['high-neg', 'low-neg'],
  NULL,
  NULL,
  'active-waiting', 'medium', 2, 3000, 'USD',
  0,
  ARRAY['front-desk', 'concierge'],
  'Manager presence visible at the front of the queue. Calm body language, slow voice, hand gestures that direct rather than rush.',
  'Identify the most-distressed guest in line first (child, elderly, medical, visibly upset). Move them to a private wait with comfort items. Communicate to the rest of the line a precise ETA — "fifteen minutes" or "we have one room being finished now and yours is third in the rotation." Specificity defuses; vagueness escalates.',
  ARRAY['Do not say "it will be just a few minutes" if it will not', 'Do not use the line "we are working on it"', 'Do not move VIPs ahead visibly', 'Do not let the manager disappear into the back office during a queue stress'],
  0, 0, NULL, true
)
ON CONFLICT (id) DO NOTHING;
