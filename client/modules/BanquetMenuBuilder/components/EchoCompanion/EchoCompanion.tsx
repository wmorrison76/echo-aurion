/**
 * EchoCompanion.tsx
 * ----------------------------------------------------------------------------
 * The single component the panel imports to get all of Echo.
 *
 * Renders:
 *   - The orb (fixed bottom-right)
 *   - The current hint card (anchored to upper-left of orb)
 *   - The drawer (when open)
 *   - A small voice toggle button next to the orb (when supported)
 *
 * The panel-side integration is a one-liner:
 *   <EchoCompanion />
 *
 * That keeps the BanquetMenuBuilderPanel from caring about Echo's internal
 * structure. Future Echo features (e.g. proactive notifications) can land
 * inside this component without touching the panel.
 * ----------------------------------------------------------------------------
 */

import React from 'react';
import { useEchoCompanion } from '../../hooks/useEchoCompanion';
import { EchoOrb } from '../EchoOrb/EchoOrb';
import { EchoHintCard } from '../EchoHints/EchoHintCard';
import { EchoDrawer } from '../EchoDrawer/EchoDrawer';

export const EchoCompanion: React.FC = () => {
  const {
    orbState,
    micAmplitude,
    activateOrb,
    isVoiceSupported,
    isListening,
    voiceError,
    startVoice,
    stopVoice,
    currentHint,
    dismissHint,
    showHintInCritique,
  } = useEchoCompanion();

  const handleVoiceToggle = () => {
    if (isListening) {
      stopVoice();
    } else {
      void startVoice();
    }
  };

  return (
    <>
      {/* Floating orb anchor — fixed bottom-right */}
      <div className="bmb-echo-anchor" role="region" aria-label="Echo assistant">
        {/* Hint card anchored above the orb */}
        {currentHint && !isListening && (
          <div className="bmb-echo-anchor__hint">
            <EchoHintCard
              hint={currentHint}
              onAction={showHintInCritique}
              onDismiss={dismissHint}
            />
          </div>
        )}

        {/* Voice toggle (only when Web Speech is supported) */}
        {isVoiceSupported && (
          <button
            type="button"
            className={[
              'bmb-echo-anchor__voice',
              isListening ? 'bmb-echo-anchor__voice--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={handleVoiceToggle}
            aria-label={isListening ? 'Stop listening' : 'Talk to Echo'}
            aria-pressed={isListening}
            title={voiceError ?? (isListening ? 'Stop listening' : 'Talk to Echo')}
          >
            <span className="bmb-echo-anchor__voice-icon" aria-hidden="true">
              {isListening ? '◉' : '🎙'}
            </span>
          </button>
        )}

        {/* The orb itself */}
        <EchoOrb
          state={orbState}
          micAmplitude={micAmplitude}
          onActivate={activateOrb}
        />
      </div>

      {/* Drawer slides in from the right when open */}
      <EchoDrawer />
    </>
  );
};
