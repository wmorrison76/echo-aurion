/**
 * Voice Integration Hook for EchoAI
 *
 * Handles microphone access, audio capture, and transcription.
 * Bridges VoiceCommands module with EchoAI-Sentient.
 */

import { useCallback, useRef, useState } from "react";

export interface VoiceConfig {
  language?: string;
  interimResults?: boolean;
  maxSilenceMs?: number;
  minConfidence?: number;
}

export interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

const DEFAULT_CONFIG: VoiceConfig = {
  language: "en-US",
  interimResults: true,
  maxSilenceMs: 3000,
  minConfidence: 0.5,
};

/**
 * Hook for voice input integration
 */
export function useVoiceIntegration(config: VoiceConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: "",
    confidence: 0,
    error: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  /**
   * Request microphone access
   */
  const requestMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Microphone access denied";
      setState((prev) => ({
        ...prev,
        error: message,
        isListening: false,
      }));
      console.error("[VoiceIntegration] Microphone access error:", err);
      return false;
    }
  }, []);

  /**
   * Start listening for voice input
   */
  const startListening = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({
        ...prev,
        isListening: true,
        error: null,
        transcript: "",
      }));

      const hasAccess = await requestMicrophoneAccess();
      if (!hasAccess || !mediaStreamRef.current) {
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: "Microphone access required",
        }));
        return;
      }

      // Setup MediaRecorder
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current);

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstart = () => {
        console.log("[VoiceIntegration] Recording started");
        resetSilenceTimeout();
      };

      mediaRecorder.onstop = () => {
        console.log("[VoiceIntegration] Recording stopped");
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start listening";
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: message,
      }));
      console.error("[VoiceIntegration] Error starting listener:", err);
    }
  }, [requestMicrophoneAccess]);

  /**
   * Stop listening and process audio
   */
  const stopListening = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      if (mediaRecorderRef.current && state.isListening) {
        mediaRecorderRef.current.onstop = () => {
          console.log("[VoiceIntegration] Processing audio...");
          setState((prev) => ({
            ...prev,
            isProcessing: true,
            isListening: false,
          }));

          // Simulated transcription (in production, use Web Speech API or third-party service)
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/wav",
          });

          // For now, just return a placeholder
          // TODO: Integrate with actual speech-to-text service
          const transcript = "[Voice transcription would go here]";

          setState((prev) => ({
            ...prev,
            isProcessing: false,
            transcript,
            confidence: 0.8,
          }));

          resolve(transcript);
        };

        mediaRecorderRef.current.stop();
      } else {
        resolve("");
      }
    });
  }, [state.isListening]);

  /**
   * Reset silence timeout (for detecting when user stops speaking)
   */
  const resetSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    silenceTimeoutRef.current = window.setTimeout(async () => {
      if (state.isListening) {
        console.log("[VoiceIntegration] Silence detected, stopping recording");
        await stopListening();
      }
    }, finalConfig.maxSilenceMs || 3000);
  }, [state.isListening, stopListening, finalConfig.maxSilenceMs]);

  /**
   * Clean up resources
   */
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Already stopped
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Already stopped
        }
      });
      mediaStreamRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    audioChunksRef.current = [];
  }, []);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(async () => {
    if (state.isListening) {
      return await stopListening();
    } else {
      await startListening();
      return "";
    }
  }, [state.isListening, startListening, stopListening]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cleanup();
    setState({
      isListening: false,
      isProcessing: false,
      transcript: "",
      confidence: 0,
      error: null,
    });
  }, [cleanup]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    cleanup,
    reset,
  };
}

/**
 * Higher-order hook for integrating voice with chat input
 */
export function useVoiceChat(
  onTranscript: (transcript: string) => void,
  config?: VoiceConfig
) {
  const voice = useVoiceIntegration(config);

  const handleVoiceToggle = async () => {
    if (voice.isListening) {
      const transcript = await voice.stopListening();
      if (transcript && voice.confidence >= (config?.minConfidence || 0.5)) {
        onTranscript(transcript);
      }
    } else {
      await voice.startListening();
    }
  };

  return {
    ...voice,
    handleVoiceToggle,
  };
}
