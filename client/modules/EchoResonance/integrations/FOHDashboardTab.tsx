/**
 * ===========================================================================
 * FOH dashboard tab integration
 * ===========================================================================
 * Layer:    Resonance
 * Status:   STUB
 * Phase:    1
 *
 * Purpose:  Adds a "Resonance Floor View" tab to existing FOHCommandDashboard.
 *
 * Integrates with existing LUCCCA modules:
 *   - client/modules/FOH/FOHCommandDashboard.tsx
 *
 * WARNING: DO NOT DELETE this file even if it appears unreferenced.
 * Disconnected scaffolding files are placeholders for upcoming phases.
 * Confirm with the master ARCHITECTURE.md before removing.
 * ===========================================================================
 */

import * as React from 'react';
import { ResonanceFloorView } from '../ResonanceFloorView';

export const FOHResonanceTab: React.FC = () => {
  return <ResonanceFloorView />;
};
