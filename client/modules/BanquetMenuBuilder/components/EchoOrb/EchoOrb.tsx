/**
 * EchoOrb.tsx
 * ----------------------------------------------------------------------------
 * React wrapper for EchoOrbCanvas. Mounts the canvas, runs the renderer,
 * forwards click/keyboard activation, and exposes the orb's state to the
 * surrounding presence system (drawer, hint cards, voice).
 *
 * Position contract:
 *   Echo lives in fixed positioning, bottom-right. The host module
 *   reserves z-space at z-index 50. Drawer (Pkg 4) and hint cards live
 *   above the orb in stacking order but the orb is the persistent anchor.
 * ----------------------------------------------------------------------------
 */

import React, { useEffect, useRef } from 'react';
import { EchoOrbCanvas, type OrbState } from './EchoOrbCanvas';

interface EchoOrbProps {
  state: OrbState;
  /** 0..1 mic amplitude — only relevant when state === 'listening' */
  micAmplitude?: number;
  /** Click/tap on the orb */
  onActivate: () => void;
  /** Optional aria-label override */
  ariaLabel?: string;
  /** Diameter in CSS px (default 72) */
  size?: number;
}

export const EchoOrb: React.FC<EchoOrbProps> = ({
  state,
  micAmplitude = 0,
  onActivate,
  ariaLabel,
  size = 72,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<EchoOrbCanvas | null>(null);

  // Mount renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new EchoOrbCanvas(canvasRef.current);
    rendererRef.current = renderer;
    renderer.resize();
    renderer.start();

    const handleResize = () => renderer.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // State sync
  useEffect(() => {
    rendererRef.current?.setState(state);
  }, [state]);

  // Mic amp sync (every render — cheap setter)
  useEffect(() => {
    rendererRef.current?.setOptions({ micAmplitude });
  }, [micAmplitude]);

  return (
    <button
      type="button"
      className={`bmb-echo-orb bmb-echo-orb--${state}`}
      onClick={onActivate}
      aria-label={ariaLabel ?? echoLabelFor(state)}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        className="bmb-echo-orb__canvas"
        aria-hidden="true"
      />
    </button>
  );
};

function echoLabelFor(state: OrbState): string {
  switch (state) {
    case 'idle':
      return 'Open Echo';
    case 'listening':
      return 'Echo is listening';
    case 'thinking':
      return 'Echo is thinking';
    case 'speaking':
      return 'Echo is responding';
  }
}
