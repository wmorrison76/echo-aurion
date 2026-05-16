/**
 * useVoiceRecognition.ts
 * ----------------------------------------------------------------------------
 * Web Speech API wrapper. Exposes start/stop, the running transcript, mic
 * amplitude (for orb sync), and a graceful fallback when SpeechRecognition
 * is unavailable (Firefox, some Safari configs).
 *
 * Why we own the AnalyserNode:
 *   The browser's SpeechRecognition doesn't expose volume — only text. To
 *   drive the orb's listening pulse we open a parallel getUserMedia stream
 *   and run an AnalyserNode for RMS. We tear it down on stop().
 *
 * Lifecycle:
 *   - start() → request mic, open AnalyserNode, start SpeechRecognition
 *   - on transcript → update state
 *   - on speech end → call onFinal(transcript)
 *   - stop() → close audio, abort recognition
 *
 * Permissions:
 *   First call triggers the mic permission prompt. We surface
 *   `permissionState` so the orchestrator can show a nice fallback if
 *   denied.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ----------------------------------------------------------------------------
// Type declarations — Web Speech API is not in lib.dom for all TS targets
// ----------------------------------------------------------------------------

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

interface UseVoiceRecognitionOptions {
  language?: string;
  /** Called when a final transcript arrives */
  onFinal?: (transcript: string) => void;
  /** Called on every interim update */
  onInterim?: (transcript: string) => void;
}

export type VoicePermission = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unavailable';

interface VoiceRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interim: string;
  amplitude: number;
  permissionState: VoicePermission;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {},
): VoiceRecognitionResult {
  const { language = 'en-US', onFinal, onInterim } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [amplitude, setAmplitude] = useState(0);
  const [permissionState, setPermissionState] = useState<VoicePermission>('unknown');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Detect support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setIsSupported(!!SR);
    if (!SR) setPermissionState('unavailable');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teardown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    recognitionRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setAmplitude(0);
    setIsListening(false);
  }, []);

  const start = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice recognition is not supported in this browser');
      setPermissionState('unavailable');
      return;
    }

    setError(null);
    setTranscript('');
    setInterim('');

    // ----- Mic stream + analyser -----
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState('granted');

      const ctxCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new ctxCtor();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        const a = analyserRef.current;
        if (!a) return;
        a.getByteTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buf.length);
        setAmplitude(Math.min(1, rms * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Microphone access failed: ${msg}`);
      setPermissionState('denied');
      teardown();
      return;
    }

    // ----- SpeechRecognition -----
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = language;

    recog.onresult = (event: SpeechRecognitionEventLike) => {
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) {
        setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText).trim());
        setInterim('');
        onFinal?.(finalText.trim());
      }
      if (interimText) {
        setInterim(interimText);
        onInterim?.(interimText);
      }
    };

    recog.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const code = event.error;
      // 'no-speech' fires routinely; suppress
      if (code === 'no-speech' || code === 'aborted') return;
      setError(code === 'not-allowed' ? 'Microphone permission denied' : `Voice error: ${code}`);
      teardown();
    };

    recog.onend = () => {
      setIsListening(false);
    };

    try {
      recog.start();
      recognitionRef.current = recog;
      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Could not start recognition: ${msg}`);
      teardown();
    }
  }, [language, onFinal, onInterim, teardown]);

  const stop = useCallback(() => {
    teardown();
  }, [teardown]);

  return {
    isSupported,
    isListening,
    transcript,
    interim,
    amplitude,
    permissionState,
    error,
    start,
    stop,
  };
}
