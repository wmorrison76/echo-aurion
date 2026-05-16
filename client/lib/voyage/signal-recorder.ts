/**
 * ===========================================================================
 * Voyage signal recorder - the client-side capture path
 * ===========================================================================
 * Layer:    Voyage
 * Status:   STUB
 * Phase:    2
 *
 * Purpose:  Records taps/dwells/dismisses/edits from the Voyage UI. Posts to /signals. Per master doc, every interaction is a row.
 *
 * Pending implementation:
 *   - [ ] recordTap(), recordDwell(), recordDismiss(), recordEdit()
 *   - [ ] Batch and flush periodically to reduce request volume
 *   - [ ] Failure tolerance: queue locally if offline
 *   - [ ] Respect Pause-Aurion - if paused, do not record beyond what Tenet 1 allows
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import type { SignalSource } from '../../../shared/types/signals';

export interface RecordTapArgs {
  source: SignalSource;
  subjectKind: string;
  subjectId: string;
  conversion?: 'considered';
}

export interface RecordDwellArgs {
  source: SignalSource;
  subjectKind: string;
  subjectId: string;
  durationMs: number;
}

export class VoyageSignalRecorder {
  recordTap(args: RecordTapArgs): void {
    throw new Error('Not implemented (Phase 2)');
  }

  recordDwell(args: RecordDwellArgs): void {
    throw new Error('Not implemented (Phase 2)');
  }

  recordDismiss(subjectKind: string, subjectId: string, reason?: string): void {
    throw new Error('Not implemented (Phase 2)');
  }

  recordEdit(subjectKind: string, subjectId: string, before: any, after: any): void {
    throw new Error('Not implemented (Phase 2)');
  }
}

export const voyageSignalRecorder = new VoyageSignalRecorder();
