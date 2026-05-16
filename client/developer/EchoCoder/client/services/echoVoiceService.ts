/**
 * EchoAI Voice Service
 * Full voice loop: Speech-to-text → AI processing → Text-to-speech
 * Uses Web Speech API for STT and ElevenLabs for TTS
 */

type SpeechRecognitionEvent = Event & {
  results?: SpeechRecognitionResultList;
  resultIndex?: number;
};

type SpeechRecognitionErrorEvent = Event & {
  error?: string;
};

interface VoiceOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface VoiceLoopConfig {
  speakingSpeed?: number; // 0.5 to 2.0
  voiceId?: string; // ElevenLabs voice ID
  autoPlay?: boolean;
  enableTTS?: boolean;
  enableSTT?: boolean;
}

export class EchoVoiceService {
  private recognition: any;
  private synth: SpeechSynthesis;
  private isListening: boolean = false;
  private currentTranscript: string = "";
  private voiceLoopConfig: VoiceLoopConfig;
  private elevenLabsApiKey: string;
  private onTranscriptUpdate?: (transcript: string) => void;
  private onVoiceStarted?: () => void;
  private onVoiceEnded?: () => void;
  private onError?: (error: string) => void;

  constructor(elevenLabsApiKey: string, config: VoiceLoopConfig = {}) {
    this.elevenLabsApiKey = elevenLabsApiKey;
    this.voiceLoopConfig = {
      speakingSpeed: 1.0,
      autoPlay: true,
      enableTTS: true,
      enableSTT: true,
      ...config,
    };

    this.synth = window.speechSynthesis;
    this.initializeRecognition();
  }

  /**
   * Initialize Web Speech API for speech recognition
   */
  private initializeRecognition(): void {
    // Use vendor-prefixed versions for browser compatibility
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.language = "en-US";

    // Setup event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onVoiceStarted?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onVoiceEnded?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";

      for (
        let i = event.resultIndex || 0;
        i < (event.results?.length || 0);
        i++
      ) {
        const transcript = event.results![i][0].transcript;

        if (event.results![i].isFinal) {
          this.currentTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Update UI with interim results
      const displayTranscript = this.currentTranscript + interimTranscript;
      this.onTranscriptUpdate?.(displayTranscript);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage =
        `Speech recognition error: ${event.error}` || "Unknown error";
      console.error(errorMessage);
      this.onError?.(errorMessage);
    };
  }

  /**
   * Start listening for voice input
   */
  startListening(options: VoiceOptions = {}): void {
    if (!this.recognition) {
      this.onError?.("Speech Recognition not available");
      return;
    }

    if (this.isListening) return;

    this.currentTranscript = "";
    this.recognition.language = options.language || "en-US";
    this.recognition.continuous = options.continuous ?? true;
    this.recognition.interimResults = options.interimResults ?? true;

    try {
      this.recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      this.onError?.(`Failed to start listening: ${error}`);
    }
  }

  /**
   * Stop listening
   */
  stopListening(): string {
    if (!this.recognition || !this.isListening) return this.currentTranscript;

    try {
      this.recognition.stop();
      this.isListening = false;
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
    }

    return this.currentTranscript;
  }

  /**
   * Abort listening immediately
   */
  abortListening(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Speak text using ElevenLabs API (full voice loop)
   * Streams audio response in real-time
   */
  async speak(
    text: string,
    options: {
      voiceId?: string;
      stability?: number; // 0-1
      similarityBoost?: number; // 0-1
      onAudioReady?: (audioBlob: Blob) => void;
      onError?: (error: string) => void;
    } = {},
  ): Promise<void> {
    if (!this.voiceLoopConfig.enableTTS) {
      console.log("Text-to-speech disabled");
      return;
    }

    try {
      const voiceId =
        options.voiceId ||
        this.voiceLoopConfig.voiceId ||
        "21m00Tcm4TlvDq8ikWAM"; // Default ElevenLabs voice
      const stability = options.stability ?? 0.75;
      const similarityBoost = options.similarityBoost ?? 0.75;

      // Call ElevenLabs API
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": this.elevenLabsApiKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `ElevenLabs API error: ${error.detail?.message || error.message || "Unknown error"}`,
        );
      }

      // Get audio blob
      const audioBlob = await response.blob();

      // Notify caller
      options.onAudioReady?.(audioBlob);

      // Auto-play if enabled
      if (this.voiceLoopConfig.autoPlay) {
        this.playAudio(audioBlob);
      }
    } catch (error) {
      const errorMsg = `Text-to-speech error: ${error}`;
      console.error(errorMsg);
      options.onError?.(errorMsg);
      this.onError?.(errorMsg);
    }
  }

  /**
   * Play audio blob
   */
  private playAudio(audioBlob: Blob): void {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.onerror = () => {
      console.error("Error playing audio");
      URL.revokeObjectURL(audioUrl);
    };

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
      URL.revokeObjectURL(audioUrl);
    });
  }

  /**
   * Full voice loop: Listen → Process → Speak
   */
  async startVoiceLoop(
    onTranscriptCaptured: (transcript: string) => Promise<string>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Start listening
      this.startListening();

      // Wait for speech to be recognized
      const checkInterval = setInterval(() => {
        if (!this.isListening && this.currentTranscript) {
          clearInterval(checkInterval);

          // Process the transcript
          onTranscriptCaptured(this.currentTranscript)
            .then((response) => {
              // Speak the response
              this.speak(response, {
                onError: (error) => reject(new Error(error)),
                onAudioReady: () => {
                  resolve();
                },
              });
            })
            .catch(reject);
        }
      }, 100);

      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (this.isListening) {
          this.stopListening();
        }
        reject(new Error("Voice loop timeout"));
      }, 60000);
    });
  }

  /**
   * Register callback for transcript updates
   */
  onTranscript(callback: (transcript: string) => void): void {
    this.onTranscriptUpdate = callback;
  }

  /**
   * Register callback for when voice starts
   */
  onStart(callback: () => void): void {
    this.onVoiceStarted = callback;
  }

  /**
   * Register callback for when voice ends
   */
  onEnd(callback: () => void): void {
    this.onVoiceEnded = callback;
  }

  /**
   * Register callback for errors
   */
  onVoiceError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  /**
   * Get current transcript
   */
  getTranscript(): string {
    return this.currentTranscript;
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get list of available voices from ElevenLabs
   */
  async getAvailableVoices(): Promise<
    Array<{ voiceId: string; name: string; previewUrl: string }>
  > {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": this.elevenLabsApiKey,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch voices");

      const data: any = await response.json();
      return (data.voices || []).map((voice: any) => ({
        voiceId: voice.voice_id,
        name: voice.name,
        previewUrl: voice.preview_url,
      }));
    } catch (error) {
      console.error("Error fetching voices:", error);
      return [];
    }
  }

  /**
   * Set speaking speed
   */
  setSpeakingSpeed(speed: number): void {
    this.voiceLoopConfig.speakingSpeed = Math.max(0.5, Math.min(2.0, speed));
  }

  /**
   * Set voice
   */
  setVoice(voiceId: string): void {
    this.voiceLoopConfig.voiceId = voiceId;
  }

  /**
   * Check if browser supports speech recognition
   */
  static isSpeechRecognitionSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition
    );
  }

  /**
   * Check if browser supports speech synthesis
   */
  static isSpeechSynthesisSupported(): boolean {
    return !!window.speechSynthesis;
  }
}

// Factory function for easy instantiation
export function createVoiceService(
  elevenLabsApiKey: string,
  config?: VoiceLoopConfig,
): EchoVoiceService {
  return new EchoVoiceService(elevenLabsApiKey, config);
}
