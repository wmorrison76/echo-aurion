/**
 * compositionPersistence.ts
 * ----------------------------------------------------------------------------
 * Watches the composition store and persists changes to MongoDB on a
 * debounced timer. Hooks into the store's `subscribeWithSelector` middleware.
 *
 * Design contract:
 *   - User edits NEVER block on a network call. The store is authoritative
 *     locally; persistence is an eventually-consistent background concern.
 *   - On reconnect after offline, the latest local state wins (last-write-
 *     wins). This is intentional for chef workflow — we'd rather drop a
 *     stale background sync than lose an edit the chef just made.
 *   - The first save creates a draft document; subsequent saves update.
 *
 * Failure handling:
 *   On persistence failure we surface a console.warn and a toast event
 *   (the host app handles toasts). We do NOT clear `isDirty` until a
 *   successful save lands, so the store remembers it has unsaved work.
 * ----------------------------------------------------------------------------
 */

// NOTE: This module runs in the browser. Do NOT import the MongoDB-backed
// repositories directly — they pull in the `mongodb` Node module which would
// break the browser bundle. All persistence goes through the HTTP API at
// /api/banquet-menus/drafts which is backed server-side by menuDraftRepository.

import { useCompositionStore } from '../hooks/useCompositionStore';
import type { CompositionState } from '../hooks/useCompositionStore';
import type { MenuDraft } from '../BanquetMenuBuilder.types';

const DRAFTS_ENDPOINT = '/api/banquet-menus/drafts';

function generateDraftId(): string {
  const rand = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `draft-${rand}`;
}

async function putDraft(propertyId: string, draftId: string, draft: unknown): Promise<MenuDraft> {
  const res = await fetch(`${DRAFTS_ENDPOINT}/${encodeURIComponent(draftId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, draft }),
  });
  if (!res.ok) {
    throw new Error(`PUT ${DRAFTS_ENDPOINT}/${draftId} failed: HTTP ${res.status}`);
  }
  const payload = await res.json();
  return payload.draft as MenuDraft;
}

// ----------------------------------------------------------------------------
// Tunables
// ----------------------------------------------------------------------------

/** How long after the last edit before we sync. */
const DEBOUNCE_MS = 1500;

/** Force a sync after this many milliseconds even if edits keep streaming. */
const MAX_BATCH_MS = 8000;

// ----------------------------------------------------------------------------
// Internal state
// ----------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let maxBatchTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let pendingSyncRequested = false;
let unsubscribe: (() => void) | null = null;

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export interface PersistenceOptions {
  /** Called after a successful sync */
  onSyncSuccess?: (draftId: string) => void;
  /** Called when a sync attempt fails */
  onSyncError?: (err: unknown) => void;
}

/**
 * Begin watching the composition store. Call once per module mount.
 * Returns a teardown function.
 */
export function startCompositionPersistence(options: PersistenceOptions = {}): () => void {
  if (unsubscribe) {
    // Already running — return existing teardown
    return stopCompositionPersistence;
  }

  unsubscribe = useCompositionStore.subscribe(
    (state) => ({
      isDirty: state.meta.isDirty,
      // Include a shallow snapshot of structural data so we re-trigger
      // when the actual content changes (not just isDirty toggling).
      sectionCount: Object.keys(state.sections).length,
      itemCount: Object.keys(state.items).length,
    }),
    (curr, prev) => {
      if (!curr.isDirty) return;
      // Schedule a sync
      scheduleSync(options);
    },
    {
      equalityFn: (a, b) =>
        a.isDirty === b.isDirty &&
        a.sectionCount === b.sectionCount &&
        a.itemCount === b.itemCount,
    },
  );

  return stopCompositionPersistence;
}

export function stopCompositionPersistence(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (maxBatchTimer) {
    clearTimeout(maxBatchTimer);
    maxBatchTimer = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/**
 * Force an immediate sync regardless of debounce. Used on:
 *   - Window unload / page hide
 *   - Explicit "Save" button
 *   - Module unmount
 */
export async function flushCompositionSync(
  options: PersistenceOptions = {},
): Promise<string | null> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (maxBatchTimer) {
    clearTimeout(maxBatchTimer);
    maxBatchTimer = null;
  }
  return runSync(options);
}

// ----------------------------------------------------------------------------
// Internal
// ----------------------------------------------------------------------------

function scheduleSync(options: PersistenceOptions): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    if (maxBatchTimer) {
      clearTimeout(maxBatchTimer);
      maxBatchTimer = null;
    }
    void runSync(options);
  }, DEBOUNCE_MS);

  // Set the max-batch ceiling on first edit of a streak
  if (!maxBatchTimer) {
    maxBatchTimer = setTimeout(() => {
      maxBatchTimer = null;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      void runSync(options);
    }, MAX_BATCH_MS);
  }
}

async function runSync(options: PersistenceOptions): Promise<string | null> {
  if (inFlight) {
    // A sync is already running; mark that we want another after it finishes
    pendingSyncRequested = true;
    return null;
  }

  inFlight = true;
  try {
    const state = useCompositionStore.getState();
    if (!state.meta.isDirty) {
      inFlight = false;
      return state.meta.draftId;
    }

    const draftPayload = serializeForPersistence(state);
    const propertyId = state.meta.propertyId;
    if (!propertyId) {
      // No property scope yet; demo preload runs first, so this is a transient
      // race during the first ~50ms after mount. Skip silently.
      inFlight = false;
      return null;
    }

    const draftId = state.meta.draftId ?? generateDraftId();
    await putDraft(propertyId, draftId, draftPayload);

    if (!state.meta.draftId) {
      useCompositionStore.setState((prev) => ({
        meta: { ...prev.meta, draftId },
      }));
    }

    // Mark synced
    useCompositionStore.setState((prev) => ({
      meta: { ...prev.meta, isDirty: false, lastSyncedAt: Date.now() },
    }));

    options.onSyncSuccess?.(draftId);
    return draftId;
  } catch (err) {
    console.warn('[compositionPersistence] sync failed', err);
    options.onSyncError?.(err);
    return null;
  } finally {
    inFlight = false;
    if (pendingSyncRequested) {
      pendingSyncRequested = false;
      // Re-queue a debounced sync to capture anything edited during the failed run
      scheduleSync(options);
    }
  }
}

// ----------------------------------------------------------------------------
// Serialization — store shape → MenuDraft document shape
// ----------------------------------------------------------------------------

function serializeForPersistence(state: CompositionState): Omit<MenuDraft, 'id'> {
  const orderedSections = Object.values(state.sections).sort((a, b) => a.order - b.order);

  return {
    propertyId: state.meta.propertyId,
    eventType: state.meta.eventType,
    guestCount: state.meta.guestCount,
    budgetPerGuest: state.meta.budgetPerGuest,
    currency: state.meta.currency,
    sections: orderedSections.map((s) => ({
      id: s.id,
      kind: s.kind,
      name: s.name,
      items: s.itemInstanceIds
        .map((iid) => state.items[iid])
        .filter(Boolean)
        .map((entry) => ({
          instanceId: entry.instanceId,
          itemId: entry.itemId,
          itemSnapshot: entry.itemSnapshot,
          priceOverride: entry.priceOverride,
          notes: entry.notes,
        })),
    })),
    status: 'in_progress',
    updatedAt: new Date(),
    // Echo-related fields populated by Package 4
    echoMetrics: undefined,
    acceptanceMetrics: undefined,
  };
}

// ----------------------------------------------------------------------------
// Window lifecycle hooks
// ----------------------------------------------------------------------------

/**
 * Wire up beforeunload + visibilitychange for graceful save on page hide.
 * Call this once at module mount, alongside startCompositionPersistence.
 */
export function attachLifecyclePersistence(options: PersistenceOptions = {}): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleHide = () => {
    void flushCompositionSync(options);
  };

  window.addEventListener('beforeunload', handleHide);
  window.addEventListener('pagehide', handleHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') handleHide();
  });

  return () => {
    window.removeEventListener('beforeunload', handleHide);
    window.removeEventListener('pagehide', handleHide);
  };
}
