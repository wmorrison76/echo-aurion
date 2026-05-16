/**
* LUCCCA | EF-04..EF-05
* File: <absolute path from repo root>
* Created: 2025-07-27 by AI
* Depends On: react, zustand, framer-motion, @react-three/fiber, @react-three/drei
* Exposes: useVoiceSync, EchoAvatarPanel
* Location Notes: Consumed by Echo Assistant panel / Fluid Whiteboard
* Tests: packages/echoscope/tests/avatar
* ADR: docs/adr/ADR-echo-avatars.md
*/

import { useEffect, useRef } from 'react';
import { useAvatarStore } from './useAvatarStore';

/**
 * useVoiceSync
 * Captures mic input amplitude and updates mouthOpen + isTalking in the store.
 * Simple RMS amplitude mapping — enough for basic lip flap simulation.
 */
export const useVoiceSync = (enabled: boolean = true) => {
  const { setMouthOpen, setIsTalking } = useAvatarStore();
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        dataRef.current = dataArray;

        const loop = () => {
          if (!analyserRef.current || !dataRef.current) return;
          analyserRef.current.getByteTimeDomainData(dataRef.current);
          // Compute RMS
          let sum = 0;
          for (let i = 0; i < dataRef.current.length; i++) {
            const v = (dataRef.current[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataRef.current.length);
          const mouth = Math.min(1, Math.max(0, rms * 8)); // scale factor
          setMouthOpen(mouth);
          setIsTalking(mouth > 0.05);
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        console.warn('useVoiceSync: microphone permission denied or unavailable', e);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [enabled, setIsTalking, setMouthOpen]);
};
