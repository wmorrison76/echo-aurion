/**
 * ===========================================================================
 * React-Query hooks for Resonance UI
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  React-Query wrappers over the API client. Components import
 *           these directly; the rest of the app does not need to know
 *           which fetch library is in use.
 *
 *           Polling cadences (defaults; overridable per call):
 *             - useFloorView:          5 seconds (the GM dashboard refresh)
 *             - useTrajectory:         5 seconds (drill-down detail)
 *             - useRecentReadings:     10 seconds (signal trail)
 *             - useInterventionCandidates: not polled (POST, on-demand)
 *
 *           All mutation hooks invalidate the relevant query keys on success
 *           so the dashboard reflects new state without a manual refresh.
 *
 *  IMPORTANT: a QueryClientProvider must wrap the consuming subtree.
 *  Existing app shell already provides this for the rest of the platform.
 * ===========================================================================
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type {
  AffectCoordinate,
  InterventionExecution,
  NewResonanceReading,
  ResonanceReading,
} from '../../../shared/types/resonance';

// ---------------------------------------------------------------------------
// Query-key factory — central source of truth for invalidation
// ---------------------------------------------------------------------------

export const resonanceKeys = {
  all: ['echo-resonance'] as const,
  floor: (propertyId: string) => ['echo-resonance', 'floor', propertyId] as const,
  trajectory: (visitId: string) =>
    ['echo-resonance', 'trajectory', visitId] as const,
  recentReadings: (guestId: string, limit: number) =>
    ['echo-resonance', 'guest', guestId, 'readings', limit] as const,
  templates: ['echo-resonance', 'templates'] as const,
  signalsForGuest: (guestId: string, limit: number) =>
    ['echo-resonance', 'guest', guestId, 'signals', limit] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Floor view — the GM's grid of active trajectories. Polled at 5 seconds
 * by default; the dashboard refreshes "between seconds" but not faster
 * than the master doc's perception cadence requires.
 */
export function useFloorView(
  propertyId: string,
  options: { refetchIntervalMs?: number; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: resonanceKeys.floor(propertyId),
    queryFn: () => api.fetchFloorView(propertyId),
    refetchInterval: options.refetchIntervalMs ?? 5_000,
    enabled: options.enabled ?? Boolean(propertyId),
  });
}

/**
 * Single trajectory by visit id. Returns null when no trajectory exists.
 */
export function useTrajectory(
  visitId: string,
  options: { refetchIntervalMs?: number; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: resonanceKeys.trajectory(visitId),
    queryFn: () => api.fetchTrajectory(visitId),
    refetchInterval: options.refetchIntervalMs ?? 5_000,
    enabled: options.enabled ?? Boolean(visitId),
  });
}

/**
 * Recent readings for a guest — used by the signal trail / drill-down view.
 */
export function useRecentReadings(
  guestId: string,
  limit = 10,
  options: { refetchIntervalMs?: number; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: resonanceKeys.recentReadings(guestId, limit),
    queryFn: () => api.fetchRecentReadings(guestId, limit),
    refetchInterval: options.refetchIntervalMs ?? 10_000,
    enabled: options.enabled ?? Boolean(guestId),
  });
}

/**
 * Admin: list intervention templates.
 */
export function useTemplates(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: resonanceKeys.templates,
    queryFn: () => api.listTemplates(),
    enabled: options.enabled ?? true,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Submit a reading. On success, invalidates the floor view (so the tile
 * recolors) AND the affected trajectory + recent readings keys.
 */
export function useSubmitReading() {
  const qc = useQueryClient();
  return useMutation<ResonanceReading, Error, NewResonanceReading>({
    mutationFn: api.submitReading,
    onSuccess: (data) => {
      // We don't always know the propertyId on the client; invalidate the
      // whole resonance namespace so any open dashboard re-fetches.
      qc.invalidateQueries({ queryKey: resonanceKeys.all });
    },
  });
}

/**
 * Find candidates for the current affect+signals snapshot. Mutation rather
 * than query: the inputs are rich + the result is on-demand.
 */
export function useFindCandidates() {
  return useMutation({
    mutationFn: (args: {
      affect: AffectCoordinate;
      presentSignals: string[];
      guestId: string;
      visitId: string;
    }) => api.findCandidates(args),
  });
}

export function useRecordProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.recordProposal,
    onSuccess: () => qc.invalidateQueries({ queryKey: resonanceKeys.all }),
  });
}

export function useRecordApproval() {
  const qc = useQueryClient();
  return useMutation<InterventionExecution, Error, { executionId: string; approvedBy: string }>({
    mutationFn: ({ executionId, approvedBy }) => api.recordApproval(executionId, approvedBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: resonanceKeys.all }),
  });
}

export function useRecordExecution() {
  const qc = useQueryClient();
  return useMutation<InterventionExecution, Error, { executionId: string; preReading?: number }>({
    mutationFn: ({ executionId, preReading }) =>
      api.recordExecution(executionId, preReading),
    onSuccess: () => qc.invalidateQueries({ queryKey: resonanceKeys.all }),
  });
}

export function useRecordSkip() {
  const qc = useQueryClient();
  return useMutation<InterventionExecution, Error, { executionId: string; notes?: string }>({
    mutationFn: ({ executionId, notes }) => api.recordSkip(executionId, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: resonanceKeys.all }),
  });
}

export function useRecordOutcome() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { executionId: string; outcomeScore: number; postReading: number }
  >({
    mutationFn: ({ executionId, outcomeScore, postReading }) =>
      api.recordOutcome(executionId, outcomeScore, postReading),
    onSuccess: () => qc.invalidateQueries({ queryKey: resonanceKeys.all }),
  });
}
