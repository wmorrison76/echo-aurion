/**
* LUCCCA | EF Integration
* File: <absolute path from repo root>
* Created: 2025-07-27 by AI
* Depends On: EchoAvatarPanel, PaneRegistry, telemetry bus
* Exposes: Telemetry, Playwright test
* ADR: docs/adr/ADR-echo-avatars.md
*/

import { useAvatarStore } from '../../hooks/useAvatarStore';
import { emitTelemetry } from '../../../echocore/src/telemetry/events';

/**
 * Hook to emit telemetry whenever avatar state changes.
 */
import { useEffect } from 'react';

export const useAvatarTelemetry = () => {
  const { selected, emotion, isTalking } = useAvatarStore();

  useEffect(() => {
    emitTelemetry('avatar:change', { persona: selected });
  }, [selected]);

  useEffect(() => {
    emitTelemetry('avatar:emotion', { emotion });
  }, [emotion]);

  useEffect(() => {
    emitTelemetry('avatar:talk', { isTalking });
  }, [isTalking]);
};
