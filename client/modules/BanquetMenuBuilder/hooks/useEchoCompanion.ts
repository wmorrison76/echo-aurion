/**
 * useEchoCompanion.ts
 * ----------------------------------------------------------------------------
 * Top-level orchestrator. Wires the orb state machine, the voice pipeline,
 * the hint system, and the drawer mode. Components below this hook just
 * subscribe to specific slices.
 *
 * Behavior contract:
 *   - Orb tap → opens drawer (default mode = compose, unless a current
 *     hint is showing, in which case drawer opens in critique mode focused
 *     on that hint's signal)
 *   - Orb long-press / explicit voice activation → starts mic, orb goes
 *     to 'listening', voice transcript flows to the active drawer mode
 *   - Voice 'final' utterance → routed:
 *       drawer closed       → opens drawer in compose mode with utterance
 *                              as refinement
 *       drawer open compose → uses utterance as refinement
 *       drawer open critique→ ignored (critique doesn't take input)
 *       drawer open generate→ appended to brief
 *   - Drawer close → orb returns to 'idle', mic stops
 *
 * All of this lives in one place so the rules are auditable and we don't
 * end up with conflicting state mutations from multiple sources.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useCallback, useRef } from 'react';
import { useEchoOrb } from './useEchoOrb';
import { useEchoHints } from './useEchoHints';
import { useVoiceRecognition } from './useVoiceRecognition';
import type { EchoHint } from '../components/EchoHints/EchoHintCard';
import { attachAuditLifecycle } from '../services/echoAuditLogger';

interface UseEchoCompanionOptions {
  /** Optional language override for voice recognition */
  voiceLanguage?: string;
}

interface UseEchoCompanionResult {
  // Orb
  orbState: 'idle' | 'listening' | 'thinking' | 'speaking';
  micAmplitude: number;
  activateOrb: () => void;
  // Voice
  isVoiceSupported: boolean;
  isListening: boolean;
  voiceError: string | null;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  // Hints
  currentHint: EchoHint | null;
  dismissHint: (hintId: string) => void;
  showHintInCritique: (hint: EchoHint) => void;
  // Drawer
  isDrawerOpen: boolean;
  closeDrawer: () => void;
}

export function useEchoCompanion(
  options: UseEchoCompanionOptions = {},
): UseEchoCompanionResult {
  const orbState = useEchoOrb((s) => s.orbState);
  const micAmp = useEchoOrb((s) => s.micAmplitude);
  const setOrbState = useEchoOrb((s) => s.setOrbState);
  const setMicAmplitude = useEchoOrb((s) => s.setMicAmplitude);

  const drawerOpen = useEchoOrb((s) => s.drawerOpen);
  const drawerMode = useEchoOrb((s) => s.drawerMode);
  const openDrawer = useEchoOrb((s) => s.openDrawer);
  const closeDrawer = useEchoOrb((s) => s.closeDrawer);

  const { currentHint, dismiss: dismissHint } = useEchoHints();

  const lastFinalUtteranceRef = useRef<string>('');

  // Voice — onFinal routes the transcript per drawer state
  const handleFinal = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      lastFinalUtteranceRef.current = text;

      if (!drawerOpen) {
        // Open drawer in compose with utterance as refinement
        openDrawer('compose', { voiceRefinement: text });
        return;
      }

      switch (drawerMode) {
        case 'compose':
          // Surface as a context update — drawer picks it up via context
          openDrawer('compose', { voiceRefinement: text });
          break;
        case 'generate':
          // Append to current brief — drawer reads voice utterance via context
          openDrawer('generate', { voiceAppend: text });
          break;
        case 'critique':
          // Critique doesn't take input — ignore
          break;
      }
    },
    [drawerOpen, drawerMode, openDrawer],
  );

  const voice = useVoiceRecognition({
    language: options.voiceLanguage,
    onFinal: handleFinal,
  });

  // Mirror voice listening → orb state
  useEffect(() => {
    if (voice.isListening) {
      setOrbState('listening');
    } else if (orbState === 'listening') {
      setOrbState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isListening]);

  // Mirror voice amplitude → orb amplitude
  useEffect(() => {
    setMicAmplitude(voice.amplitude);
  }, [voice.amplitude, setMicAmplitude]);

  // Orb activation: tap = open drawer
  const activateOrb = useCallback(() => {
    if (drawerOpen) {
      closeDrawer();
      return;
    }
    // If there's a current hint, default to critique mode focused on it
    if (currentHint?.signalId) {
      openDrawer('critique', { focusSignalId: currentHint.signalId });
    } else {
      openDrawer('compose');
    }
  }, [drawerOpen, currentHint, openDrawer, closeDrawer]);

  const showHintInCritique = useCallback(
    (hint: EchoHint) => {
      openDrawer('critique', { focusSignalId: hint.signalId ?? hint.id });
    },
    [openDrawer],
  );

  // Stop voice on drawer close
  useEffect(() => {
    if (!drawerOpen && voice.isListening) {
      voice.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  // Audit lifecycle
  useEffect(() => {
    return attachAuditLifecycle();
  }, []);

  return {
    orbState,
    micAmplitude: micAmp,
    activateOrb,
    isVoiceSupported: voice.isSupported,
    isListening: voice.isListening,
    voiceError: voice.error,
    startVoice: voice.start,
    stopVoice: voice.stop,
    currentHint,
    dismissHint,
    showHintInCritique,
    isDrawerOpen: drawerOpen,
    closeDrawer,
  };
}
