/**
 * ===========================================================================
 * React hooks for Aurion UI
 * ===========================================================================
 * Layer:    Aurion
 * Status:   IMPLEMENTED
 * Phase:    3/4
 *
 * Purpose:  Hooks wrapping the API client + voice state machine. Vanilla
 *           React (useState/useEffect/useReducer) — no react-query
 *           dependency, matching the Trust component pattern.
 *
 *           useAurionVoice exposes the orb state + a dispatch surface.
 *           useAurionWhispers polls /whispers/recent at a 30s cadence
 *           and gives the staff-log component a refresh handle.
 * ===========================================================================
 */

import * as React from 'react';
import {
  type VoiceState,
  type VoiceEvent,
  transition,
  INITIAL_VOICE_STATE,
} from './voice-state-machine';
import {
  startSession,
  endSession,
  recentWhispersForStaff,
  flagWhisper,
  AurionApiError,
  type WhisperFlagKind,
  type StartSessionArgs,
} from './api';
import type { StaffWhisper, VoiceSession } from '../../../shared/types/aurion';

// =============================================================================
// useAurionVoice — orb state + start/stop
// =============================================================================

export interface UseAurionVoice {
  state: VoiceState;
  session: VoiceSession | null;
  error: string | null;
  busy: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  dispatch: (event: VoiceEvent) => void;
}

export function useAurionVoice(args: StartSessionArgs): UseAurionVoice {
  const [state, setState] = React.useState<VoiceState>(INITIAL_VOICE_STATE);
  const [session, setSession] = React.useState<VoiceSession | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const dispatch = React.useCallback((event: VoiceEvent) => {
    setState((prev) => transition(prev, event));
  }, []);

  const start = React.useCallback(async () => {
    setBusy(true);
    setError(null);
    dispatch({ kind: 'connect' });
    try {
      const next = await startSession(args);
      setSession(next);
      dispatch({ kind: 'connected' });
    } catch (err) {
      const message = err instanceof AurionApiError ? err.message : 'Could not start session.';
      setError(message);
      dispatch({ kind: 'error', message });
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.context, args.voiceProfileId, args.guestId, args.staffId, dispatch]);

  const stop = React.useCallback(async () => {
    if (!session) {
      dispatch({ kind: 'disconnect' });
      return;
    }
    setBusy(true);
    try {
      await endSession(session.id);
      setSession(null);
      dispatch({ kind: 'disconnect' });
    } catch (err) {
      const message = err instanceof AurionApiError ? err.message : 'Could not end session.';
      setError(message);
      dispatch({ kind: 'error', message });
    } finally {
      setBusy(false);
    }
  }, [session, dispatch]);

  return { state, session, error, busy, start, stop, dispatch };
}

// =============================================================================
// useAurionWhispers — staff transparency log (Tenet 6)
// =============================================================================

export interface UseAurionWhispers {
  whispers: StaffWhisper[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  flag: (whisperId: string, kind: WhisperFlagKind, note?: string) => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000;

export function useAurionWhispers(opts: { autoRefresh?: boolean; limit?: number } = {}): UseAurionWhispers {
  const { autoRefresh = true, limit = 50 } = opts;
  const [whispers, setWhispers] = React.useState<StaffWhisper[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mounted = React.useRef(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await recentWhispersForStaff({ limit });
      if (mounted.current) setWhispers(next);
    } catch (err) {
      const message = err instanceof AurionApiError ? err.message : 'Could not load whispers.';
      if (mounted.current) setError(message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [limit]);

  const flag = React.useCallback(
    async (whisperId: string, kind: WhisperFlagKind, note?: string) => {
      await flagWhisper(whisperId, kind, note);
      setWhispers((prev) =>
        prev.map((w) =>
          w.id === whisperId
            ? { ...w, flaggedAsWrong: kind === 'wrong', staffNote: note ?? w.staffNote }
            : w,
        ),
      );
    },
    [],
  );

  React.useEffect(() => {
    mounted.current = true;
    void refresh();
    if (!autoRefresh) {
      return () => {
        mounted.current = false;
      };
    }
    const id = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [autoRefresh, refresh]);

  return { whispers, loading, error, refresh, flag };
}
