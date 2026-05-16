/**
 * ===========================================================================
 * SignalTag taxonomy
 * ===========================================================================
 * Layer:    Substrate: Signal Graph
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Structured taxonomy of faint signals staff and Aurion observe.
 *
 * WARNING: This is the canonical type contract for the structured signal tag taxonomy.
 * Modifications require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

export type SignalTagClass =
  | 'body-language' | 'voice-interaction' | 'behavioral'
  | 'group-dynamics' | 'environmental' | 'voice-prosody';

export interface SignalTag {
  class: SignalTagClass;
  tag: string;
  affectHint?: { arousalDelta?: number; valenceDelta?: number };
}

export const TAG_LIBRARY = {
  bodyLanguage: ['leaning-in', 'checking-phone', 'arms-crossed', 'shoulders-dropped',
    'scanning-room', 'making-eye-contact', 'avoiding-eye-contact', 'fidgeting',
    'still-and-attentive', 'relaxed-posture'],
  voiceInteraction: ['short-answers', 'laughing', 'asking-many-questions',
    'monosyllabic', 'terse', 'effusive', 'soft-spoken', 'loud'],
  behavioral: ['ordered-fast', 'lingering-on-menu', 'no-wine-after-course-two',
    'declined-dessert', 'asked-for-check-early', 'extended-coffee',
    'photographed-food', 'multiple-courses-shared'],
  groupDynamics: ['one-person-quiet', 'celebrating', 'tension-between-two',
    'attentive-to-child', 'business-conversation', 'reunion-energy',
    'first-date-energy', 'long-time-couple-energy'],
  environmental: ['next-to-noisy-table', 'draft-from-door', 'view-obstructed',
    'table-running-long', 'lighting-too-bright', 'music-volume-issue'],
  voiceProsody: ['vocal-warmth', 'hesitation', 'sighing', 'high-energy',
    'low-energy', 'accent-shift', 'emotional-quaver'],
} as const;
