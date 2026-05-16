/**
 * ===========================================================================
 * Floor view — the trajectory dashboard module
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  The screen GMs open during shift. Wraps TrajectoryDashboard
 *           with shift context (header, property identity, current time)
 *           and a drill-down side panel that opens when the GM taps a
 *           tile. The drill-down composes GuestDetailView so the GM can
 *           see the signal trail and intervention candidates for the
 *           selected visit without leaving the floor.
 *
 *           Per master doc §10.2: "Demo at end of phase: a real shift at
 *           the pilot property where the GM uses the trajectory dashboard
 *           live." This is that screen.
 *
 *           Sidebar/floating layout: dashboard fills the main column;
 *           drill-down slides in from the right as a 480px panel when a
 *           tile is tapped. Close button + Escape key dismiss.
 *
 *           The floating WhisperWidget renders alongside so staff can
 *           submit a faint signal without leaving the dashboard. The
 *           widget posts to /api/echo-resonance/readings; the dashboard's
 *           5-second poll picks up the new state on the next tick.
 *
 * Tenet 5 (privacy spine): everything on this screen is staff-facing.
 * Guest names render only when the LUCCCA guest table is wired (the
 * Phase 1.5 integration boundary for `guestName` lives in trajectory-
 * engine.getFloorView). Today the tile pseudonymizes to "Visit XXXX".
 * ===========================================================================
 */

import * as React from 'react';
import { ResonanceErrorBoundary } from '../../components/resonance/ResonanceErrorBoundary';
import { TrajectoryDashboard } from '../../components/resonance/TrajectoryDashboard';
import { WhisperWidget } from '../../components/resonance/WhisperWidget';
import type { TrajectoryTile } from '../../../shared/types/resonance';
import { GuestDetailView } from './GuestDetailView';

export interface ResonanceFloorViewProps {
  /** Property the GM is working at. Required — there is always one shift. */
  propertyId: string;
  /** Staff member id (from auth context) — used by the whisper widget. */
  staffId: string;
  /** Optional friendly name shown in the header (e.g., "Grand Floridian"). */
  propertyName?: string;
}

export const ResonanceFloorView: React.FC<ResonanceFloorViewProps> = ({
  propertyId,
  staffId,
  propertyName,
}) => {
  const [selected, setSelected] = React.useState<TrajectoryTile | null>(null);
  const [now, setNow] = React.useState<Date>(() => new Date());

  // Tick the header clock every minute so "as of 7:42p" stays current.
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleSelectTile = React.useCallback((tile: TrajectoryTile) => {
    setSelected(tile);
  }, []);

  const handleCloseDetail = React.useCallback(() => {
    setSelected(null);
  }, []);

  // ESC closes the detail panel — keyboard accessibility + GM muscle memory
  React.useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') handleCloseDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, handleCloseDetail]);

  const headerTime = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="relative flex h-full min-h-screen flex-col bg-background">
      {/* Header — quiet shift context */}
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {propertyName ?? 'Floor'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Trajectory dashboard · as of {headerTime}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Tap a tile for the trail · ESC to close
        </div>
      </header>

      {/* Main grid */}
      <main className="flex-1 px-6 py-6">
        <ResonanceErrorBoundary label="the floor view">
          <TrajectoryDashboard
            propertyId={propertyId}
            onSelectTile={handleSelectTile}
          />
        </ResonanceErrorBoundary>
      </main>

      {/* Drill-down panel */}
      {selected && (
        <aside
          className="fixed inset-y-0 right-0 z-30 w-full max-w-[480px] overflow-y-auto border-l border-border bg-card shadow-2xl"
          role="dialog"
          aria-label={`${selected.guestName || 'Visit'} detail`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {selected.guestName || `Visit ${selected.visitId.slice(-4).toUpperCase()}`}
              </h2>
              {selected.tableOrRoom && (
                <p className="text-xs text-muted-foreground">{selected.tableOrRoom}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseDetail}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close detail panel"
            >
              ×
            </button>
          </div>

          <ResonanceErrorBoundary label="this guest's detail">
            <GuestDetailView
              visitId={selected.visitId}
              guestId={selected.guestId}
              tile={selected}
              staffId={staffId}
            />
          </ResonanceErrorBoundary>
        </aside>
      )}

      {/* Floating whisper widget — always available, never blocking */}
      <WhisperWidget
        activeGuestId={selected?.guestId ?? ''}
        activeVisitId={selected?.visitId ?? null}
        staffId={staffId}
        position="bottom-right"
      />
    </div>
  );
};

export default ResonanceFloorView;
