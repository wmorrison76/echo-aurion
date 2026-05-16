import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { transcribeAudio, translateText, VOICE_LANGUAGES } from "@/lib/voice-translate";

const STORAGE_KEY = "voice-translate.targetLanguage";

export type VoiceTranslatePayload = {
  transcript: string;
  translation: string;
  sourceLanguage?: string;
  targetLanguage: string;
};

export type UseVoiceTranslateOptions = {
  onComplete?: (payload: VoiceTranslatePayload) => void;
  onError?: (error: string) => void;
};

export const useVoiceTranslate = (options: UseVoiceTranslateOptions = {}) => {
  const { onComplete, onError } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<string | undefined>(undefined);
  const [targetLanguage, setTargetLanguage] = useState<string>(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem(STORAGE_KEY) || "en";
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioDataRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, targetLanguage);
    }
  }, [targetLanguage]);

  const stopRecorder = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    setTranscript("");
    setTranslation("");
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      lastAudioDataRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          lastAudioDataRef.current = Date.now();

          if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
          }

          pauseTimerRef.current = setTimeout(() => {
            const timeSinceLast = Date.now() - lastAudioDataRef.current;
            if (timeSinceLast > 120 && mediaRecorder.state === "recording") {
              stopRecorder();
            }
          }, 180);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];

        try {
          const transcription = await transcribeAudio(audioBlob);
          setTranscript(transcription.text);
          setSourceLanguage(transcription.language);

          const translated = await translateText(
            transcription.text,
            targetLanguage,
            transcription.language,
          );
          setTranslation(translated);
          setIsProcessing(false);
          onComplete?.({
            transcript: transcription.text,
            translation: translated,
            sourceLanguage: transcription.language,
            targetLanguage,
          });
        } catch (error) {
          setIsProcessing(false);
          const message = error instanceof Error ? error.message : "Voice translation failed";
          onError?.(message);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(60);
      setIsRecording(true);
      setTranscript("");
      setTranslation("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Microphone unavailable";
      onError?.(message);
    }
  }, [onComplete, onError, stopRecorder, targetLanguage]);

  const languages = useMemo(() => VOICE_LANGUAGES, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    translation,
    sourceLanguage,
    targetLanguage,
    setTargetLanguage,
    languages,
    startRecording,
    stopRecording: stopRecorder,
    cancelRecording,
  };
};
