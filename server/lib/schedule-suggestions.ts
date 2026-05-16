/********************************************************************
 * LUCCCA — BUILD 16
 * Suggested Alternate Schedule Engine
 *
 * PURPOSE:
 *  - Suggest alternate times when an event conflicts
 *  - Respect buffer windows + locks
 *  - Rank results by "least disruption"
 *
 * NOTE:
 *  - Deterministic algorithm now
 *  - Can be replaced with AI / LLM model later
 *********************************************************************/

export type SpaceLock = {
  space: string;
  start: number;
  end: number;
};

export type SuggestionResult = {
  start: number;
  end: number;
  score: number;
  daysAhead: number;
  formattedTime: string;
};

/**
 * Generate alternate time suggestions for an event
 * when it conflicts with existing locks/events.
 *
 * Algorithm:
 *  1. Test candidate times at 30-minute intervals
 *  2. Check against all locks for the same space
 *  3. Return top 5 by "score" (smaller offset = better)
 */
export function suggestAlternates(
  requested: { space: string; start: number; end: number; duration?: number },
  locks: SpaceLock[]
): SuggestionResult[] {
  const INTERVAL_MS = 30 * 60 * 1000; // 30-minute intervals
  const SEARCH_HORIZON = 7 * 24 * 60 * 60 * 1000; // Search up to 7 days ahead
  const MAX_SUGGESTIONS = 5;

  const duration = requested.duration || requested.end - requested.start;
  const suggestions: SuggestionResult[] = [];

  // Test time slots forward
  for (let offset = INTERVAL_MS; offset <= SEARCH_HORIZON; offset += INTERVAL_MS) {
    const candidateStart = requested.start + offset;
    const candidateEnd = candidateStart + duration;

    // Check if this candidate conflicts with any lock
    const hasConflict = locks.some(
      (l) =>
        l.space === requested.space &&
        l.end > candidateStart &&
        candidateEnd > l.start
    );

    if (!hasConflict) {
      const daysAhead = Math.round(offset / (24 * 60 * 60 * 1000) * 10) / 10;
      const date = new Date(candidateStart);

      suggestions.push({
        start: candidateStart,
        end: candidateEnd,
        score: offset, // smaller = better
        daysAhead,
        formattedTime: date.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      if (suggestions.length >= MAX_SUGGESTIONS) {
        break;
      }
    }
  }

  // Sort by score (ascending)
  return suggestions.sort((a, b) => a.score - b.score);
}

/**
 * Quick availability check
 * Returns true if there's a clear window for the requested duration
 */
export function isTimeAvailable(
  space: string,
  start: number,
  end: number,
  locks: SpaceLock[]
): boolean {
  return !locks.some(
    (l) => l.space === space && l.end > start && end > l.start
  );
}

/**
 * Find the next available slot for a space
 * Useful for "find earliest" queries
 */
export function findNextAvailableSlot(
  space: string,
  duration: number,
  locks: SpaceLock[],
  searchHorizon = 7 * 24 * 60 * 60 * 1000
): SuggestionResult | null {
  const INTERVAL_MS = 30 * 60 * 1000;
  const now = Date.now();

  for (let offset = 0; offset <= searchHorizon; offset += INTERVAL_MS) {
    const candidateStart = now + offset;
    const candidateEnd = candidateStart + duration;

    if (isTimeAvailable(space, candidateStart, candidateEnd, locks)) {
      const date = new Date(candidateStart);
      return {
        start: candidateStart,
        end: candidateEnd,
        score: offset,
        daysAhead: Math.round(offset / (24 * 60 * 60 * 1000) * 10) / 10,
        formattedTime: date.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }
  }

  return null;
}
