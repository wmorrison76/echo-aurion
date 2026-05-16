/**
 * useVoiceRecording Hook
 * Handles audio recording, transcription, and audio playback
 */

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

interface UseVoiceRecordingOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
}

export const useVoiceRecording = (options: UseVoiceRecordingOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Transcription mutation
  const transcribeMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append('audio', blob);
      
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Transcription failed');
      return response.json();
    },
    onSuccess: (data) => {
      setTranscript(data.text);
      options.onTranscript?.(data.text);
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      console.error('[VOICE] Transcription error:', error);
      options.onError?.(error);
      setIsProcessing(false);
    },
  });
  
  /**
   * Start recording audio
   */
  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setTranscript('');
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
    } catch (error) {
      console.error('[VOICE] Microphone access denied:', error);
      options.onError?.(error as Error);
    }
  }, [options]);
  
  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    
    const mediaRecorder = mediaRecorderRef.current;
    
    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        
        // Create blob
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Transcribe
        await transcribeMutation.mutateAsync(blob);
        resolve();
      };
      
      mediaRecorder.stop();
      
      // Stop all audio tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }, [transcribeMutation]);
  
  /**
   * Play audio (for avatar speech)
   */
  const playAudio = useCallback(async (audioSource: Blob | ArrayBuffer | string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      let audioBuffer: AudioBuffer;
      
      if (typeof audioSource === 'string') {
        // URL - fetch and decode
        const response = await fetch(audioSource);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } else if (audioSource instanceof Blob) {
        // Blob - convert to ArrayBuffer
        const arrayBuffer = await audioSource.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      } else {
        // Already ArrayBuffer
        audioBuffer = await audioContext.decodeAudioData(audioSource);
      }
      
      // Create source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      // Return promise that resolves when audio finishes
      return new Promise<void>((resolve) => {
        source.onended = () => resolve();
      });
      
    } catch (error) {
      console.error('[VOICE] Playback error:', error);
      throw error;
    }
  }, []);
  
  /**
   * Get audio as WAV format (for compatibility)
   */
  const getAudioAsWav = useCallback(async (): Promise<Blob | null> => {
    if (!audioBlob) return null;
    
    // Convert WebM to WAV if needed
    // For now, return as-is (most APIs support WebM)
    return audioBlob;
  }, [audioBlob]);
  
  /**
   * Cancel recording
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
    chunksRef.current = [];
    setTranscript('');
  }, []);
  
  return {
    // State
    isRecording,
    isProcessing,
    transcript,
    audioBlob,
    
    // Methods
    startRecording,
    stopRecording,
    cancelRecording,
    playAudio,
    getAudioAsWav,
    
    // Mutation state
    isTranscribing: transcribeMutation.isPending,
    transcriptionError: transcribeMutation.error,
  };
};

export default useVoiceRecording;
