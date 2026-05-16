/**
 * ===========================================================================
 * Guest detail view — drill-down composer
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Drill-down panel surfaced when the GM taps a tile in the
 *           ResonanceFloorView. Composes three Phase 1.5 components into
 *           one usable detail screen:
 *
 *             1. Trajectory headline (current score, lift gap, status)
 *             2. SignalTrail — what the system noticed (audit view)
 *             3. Intervention candidates — top-ranked templates for the
 *                guest's current affect quadrant + present signals
 *
 *           The intervention card surfaces only when the trajectory is in
 *           amber or red — the master doc's "intervention is required"
 *           threshold (§4.4). On green, the panel shows trajectory +
 *           signal trail without the candidate list (Silent Service: do
 *           not over-suggest when the visit is on track).
 *
 *           Master doc §8.4 staff controls: SignalTrail accepts an onFlag
 *           callback so the staff member can flag a misread signal. Phase
 *           1 logs the flag locally; persisting flags as training input
 *           is Phase 1.4+ work (per the trail's file header).
 *
 *  Tenet 5: this view is server-driven — it queries the API client which
 *  carries Idempotency-Key headers + retries on transient failures. The
 *  guest never sees this surface.
 * ===========================================================================
 */

import * as React from 'react';
import type { TrajectoryTile } from '../../../shared/types/resonance';
import {
  useFindCandidates,
  useRecentReadings,
  useRecordApproval,
  useRecordProposal,
  useRecordSkip,
  useTrajectory,
} from '../../lib/resonance/use-resonance';
import { fetchSignalsForVisit } from '../../lib/resonance/api';
import { InterventionCard } from '../../components/resonance/InterventionCard';
import { SignalTrail } from '../../components/resonance/SignalTrail';
import { quadrantOf } from '../../lib/resonance/score';
import { statusClasses, statusLabel } from '../../lib/resonance/trajectory';
import { cn } from '../../lib/utils';
import type { Signal } from '../../../shared/types/signals';

export interface GuestDetailViewProps {
  visitId: string;
  guestId: string;
  /** The tile clicked in the floor view; gives initial layout hints. */
  tile?: TrajectoryTile;
  /** Staff member id from auth context; used for proposeIntervention. */
  staffId: string;
}

export const GuestDetailView: React.FC<GuestDetailViewProps> = ({
  visitId,
  guestId,
  tile,
  staffId,
}) => {
  const trajectoryQuery = useTrajectory(visitId);
  const readingsQuery = useRecentReadings(guestId, 10);

  // Signals trail — fetch fresh; no react-query hook is dedicated to
  // this query yet (use-resonance.ts focuses on trajectory + readings).
  // Inline fetch + state keeps Phase 1 simple; future polish can promote
  // to a useSignalsForVisit hook with consistent cache keys.
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [signalsLoading, setSignalsLoading] = React.useState(true);
  const [signalsError, setSignalsError] = React.useState<string | null>(null);

  const refreshSignals = React.useCallback(async (): Promise<void> => {
    setSignalsLoading(true);
    setSignalsError(null);
    try {
      const result = await fetchSignalsForVisit(visitId);
      setSignals(result);
    } catch (err) {
      setSignalsError(err instanceof Error ? err.message : 'failed to load signals');
    } finally {
      setSignalsLoading(false);
    }
  }, [visitId]);

  React.useEffect(() => {
    void refreshSignals();
  }, [refreshSignals]);

  // Candidate interventions — fired only when trajectory is amber/red
  const candidatesMutation = useFindCandidates();
  const proposeMutation = useRecordProposal();
  const approveMutation = useRecordApproval();
  const skipMutation = useRecordSkip();

  const trajectory = trajectoryQuery.data;
  const status = trajectory?.status ?? tile?.status ?? null;
  const sc = status ? statusClasses(status) : null;

  // Trigger candidate fetch whenever trajectory becomes amber/red and we
  // have at least one reading to inform the affect coordinate.
  const lastReading = readingsQuery.data?.[0];
  React.useEffect(() => {
    if (!trajectory || !lastReading) return;
    if (trajectory.status === 'green') return;
    candidatesMutation.mutate({
      affect: { arousal: lastReading.arousal, valence: lastReading.valence },
      presentSignals: lastReading.signals.map((t) => `${t.kind}:${t.value}`),
      guestId,
      visitId,
    });
    // candidatesMutation is stable; including it would re-fire forever
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajectory?.status, lastReading?.id]);

  const candidates = candidatesMutation.data ?? [];
  const topCandidate = candidates[0];

  // Track which candidate (if any) has an active proposal so the card
  // shows the right state. For Phase 1 we keep a small in-memory map.
  const [proposalsByTemplate, setProposalsByTemplate] = React.useState<
    Record<string, { executionId: string; status: 'proposed' | 'approved' }>
  >({});
  const topProposal = topCandidate
    ? proposalsByTemplate[topCandidate.id]
    : undefined;
  const proposalBusy =
    proposeMutation.isPending ||
    approveMutation.isPending ||
    skipMutation.isPending;

  async function handleApprove(): Promise<void> {
    if (!topCandidate || !lastReading) return;

    let executionId = topProposal?.executionId;

    // If no proposal exists yet, propose-and-approve in one click. This
    // collapses the two API calls into one tap from the GM's perspective.
    if (!executionId) {
      const proposal = await proposeMutation.mutateAsync({
        templateId: topCandidate.id,
        guestId,
        visitId,
        proposedBy: 'staff',
        cascadeId: null,
      });
      executionId = proposal.id;
      setProposalsByTemplate((prev) => ({
        ...prev,
        [topCandidate.id]: { executionId: executionId!, status: 'proposed' },
      }));
    }

    await approveMutation.mutateAsync({ executionId, approvedBy: staffId });
    setProposalsByTemplate((prev) => ({
      ...prev,
      [topCandidate.id]: { executionId, status: 'approved' },
    }));
    void refreshSignals();
  }

  async function handleSkip(reason: string): Promise<void> {
    if (!topCandidate) return;
    let executionId = topProposal?.executionId;
    if (!executionId) {
      const proposal = await proposeMutation.mutateAsync({
        templateId: topCandidate.id,
        guestId,
        visitId,
        proposedBy: 'staff',
        cascadeId: null,
      });
      executionId = proposal.id;
    }
    await skipMutation.mutateAsync({ executionId, notes: reason });
    setProposalsByTemplate((prev) => ({
      ...prev,
      [topCandidate.id]: { executionId: executionId!, status: 'approved' }, // out-of-loop; placeholder
    }));
    void refreshSignals();
  }

  function handleFlagSignal(signalId: string): void {
    // Phase 1: log locally. Phase 1.4+ will persist as a training signal
    // back to Echo-Deep per master doc §8.4.
    // eslint-disable-next-line no-console
    console.info('[GuestDetailView] signal flagged as misread', { signalId });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Trajectory headline */}
      <section aria-label="Trajectory summary" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Trajectory
          </h3>
          {status && sc && (
            <span
              className={cn('rounded-md px-2 py-0.5 text-xs font-medium', sc.text, sc.bg)}
            >
              {statusLabel(status)}
            </span>
          )}
        </div>
        {trajectory ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="text-foreground">
              <span className="text-2xl font-semibold tabular-nums">
                {trajectory.currentScore.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground"> / 10</span>
            </span>
            <span className="text-xs text-muted-foreground">
              entry {trajectory.entryScore.toFixed(1)} → projected{' '}
              {trajectory.projectedExitScore.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {trajectory.liftGap > 0
                ? `+${trajectory.liftGap.toFixed(1)} to goal`
                : 'goal met'}
            </span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            {trajectoryQuery.isLoading ? 'Loading trajectory…' : 'No trajectory yet for this visit.'}
          </div>
        )}
      </section>

      {/* Intervention candidate (only when amber/red) */}
      {status !== 'green' && topCandidate && lastReading && (
        <section aria-label="Suggested intervention">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suggested
          </h3>
          <InterventionCard
            template={topCandidate}
            execution={
              topProposal
                ? {
                    id: topProposal.executionId,
                    templateId: topCandidate.id,
                    guestId,
                    visitId,
                    proposedAt: '',
                    proposedBy: 'staff',
                    status: topProposal.status,
                    cascadeId: null,
                    createdAt: '',
                    updatedAt: '',
                  }
                : undefined
            }
            onApprove={() => void handleApprove()}
            onSkip={(reason) => void handleSkip(reason)}
            busy={proposalBusy}
          />
          {candidatesMutation.isError && (
            <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
              Could not load intervention candidates.
            </p>
          )}
          {candidates.length > 1 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                {candidates.length - 1} other option
                {candidates.length - 1 === 1 ? '' : 's'}
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {candidates.slice(1, 4).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rounded-md border border-border bg-background p-2 text-xs text-muted-foreground"
                  >
                    <strong className="text-foreground">{tpl.name}</strong> · {tpl.description}
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {/* Signal trail */}
      <section aria-label="Signal trail">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          What the system noticed
        </h3>
        <SignalTrail
          signals={signals}
          loading={signalsLoading}
          error={
            signalsError
              ? { message: signalsError, onRetry: () => void refreshSignals() }
              : undefined
          }
          onFlag={handleFlagSignal}
        />
      </section>
    </div>
  );
};

export default GuestDetailView;
