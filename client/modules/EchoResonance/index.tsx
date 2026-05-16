/**
 * ===========================================================================
 * EchoResonance module — top-level entry point
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  The /echo-resonance route's mounting point. Composes the floor
 *           view as the primary surface; future routing (admin templates
 *           list, audit log, etc.) plugs in here.
 *
 *           Phase 1 surface: just the floor view. Phase 1.5+ will wrap
 *           this with a sub-router for /echo-resonance/admin and
 *           /echo-resonance/templates as those screens land.
 *
 *           PropertyId + staffId arrive from props (LUCCCA's existing
 *           layout shell injects them from the auth/property context).
 *           No environment lookups, no global state — props in, UI out.
 * ===========================================================================
 */

import * as React from 'react';
import { ResonanceErrorBoundary } from '../../components/resonance/ResonanceErrorBoundary';
import { ResonanceFloorView } from './ResonanceFloorView';

export interface EchoResonanceModuleProps {
  /** Active property id from the LUCCCA auth/property context. */
  propertyId: string;
  /** Active staff member id. */
  staffId: string;
  /** Friendly name for the property header (e.g., "Grand Floridian"). */
  propertyName?: string;
}

export const EchoResonanceModule: React.FC<EchoResonanceModuleProps> = ({
  propertyId,
  staffId,
  propertyName,
}) => {
  return (
    <ResonanceErrorBoundary label="Echo Resonance">
      <ResonanceFloorView
        propertyId={propertyId}
        staffId={staffId}
        propertyName={propertyName}
      />
    </ResonanceErrorBoundary>
  );
};

export default EchoResonanceModule;
