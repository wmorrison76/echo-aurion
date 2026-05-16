export interface SpeechOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  speakerBoost?: boolean;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
const DEFAULT_STABILITY = 0.5;
const DEFAULT_SIMILARITY_BOOST = 0.75;

class AudioCache {
  private cache = new Map<string, string>();
  private maxSize = 50;

  set(key: string, dataUrl: string) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, dataUrl);
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}

const audioCache = new AudioCache();

export async function textToSpeech(
  text: string,
  options: SpeechOptions = {},
): Promise<Blob> {
  // Validate input
  if (!text || typeof text !== "string") {
    const errorMsg = `Invalid text input: expected string, got ${typeof text}`;
    console.error("TTS validation error:", {
      textType: typeof text,
      textValue: text,
    });
    throw new Error(errorMsg);
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    throw new Error("Text cannot be empty");
  }

  const voiceId = options.voiceId || DEFAULT_VOICE_ID;
  const cacheKey = `${voiceId}:${trimmedText}`;

  // Check cache first
  const cachedDataUrl = audioCache.get(cacheKey);
  if (cachedDataUrl) {
    const binaryString = atob(cachedDataUrl.split(",")[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: "audio/mpeg" });
  }

  try {
    // Ensure all parameters are properly typed primitives
    const stability = typeof options.stability === "number" ? options.stability : DEFAULT_STABILITY;
    const similarityBoost = typeof options.similarityBoost === "number" ? options.similarityBoost : DEFAULT_SIMILARITY_BOOST;
    const speakerBoost = typeof options.speakerBoost === "boolean" ? options.speakerBoost : true;

    const requestBody = {
      text: String(trimmedText),
      voiceId: String(voiceId),
      stability: Number(stability),
      similarityBoost: Number(similarityBoost),
      speakerBoost: Boolean(speakerBoost),
    };

    let jsonBody: string;
    try {
      jsonBody = JSON.stringify(requestBody);
    } catch (stringifyErr) {
      console.error("Failed to stringify request body:", {
        error: stringifyErr,
        requestBody,
        textType: typeof trimmedText,
        textLength: String(trimmedText).length,
      });
      throw new Error(
        `Failed to serialize text-to-speech request: ${stringifyErr instanceof Error ? stringifyErr.message : String(stringifyErr)}`
      );
    }

    const response = await fetch(`/api/elevenlabs/text-to-speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: jsonBody,
    });

    if (!response.ok) {
      let errorBody = "";
      let errorDetails = "";
      try {
        const jsonResponse = await response.json();
        errorBody = jsonResponse.error || `HTTP ${response.status}`;
        errorDetails = jsonResponse.details || "";
      } catch {
        try {
          errorBody = await response.text();
        } catch {
          errorBody = `Unable to read error body (status: ${response.status})`;
        }
      }

      console.error("ElevenLabs API response:", {
        status: response.status,
        statusText: response.statusText,
        error: errorBody,
        details: errorDetails,
      });

      // Provide helpful error message for 401
      let userFriendlyError = errorBody;
      if (response.status === 401) {
        userFriendlyError =
          "Text-to-speech unavailable: Invalid API key. Please configure ELEVENLABS_API_KEY.";
      }

      throw new Error(
        `ElevenLabs API error: ${response.status} - ${userFriendlyError || response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("audio")) {
      throw new Error(
        `Invalid response type: expected audio, got ${contentType}`,
      );
    }

    const blob = await response.blob();

    // Cache the result
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    await new Promise((resolve) => {
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        audioCache.set(cacheKey, dataUrl);
        resolve(null);
      };
    });

    return blob;
  } catch (error) {
    console.error("Text-to-speech error:", error);
    throw error;
  }
}

export function playAudio(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to play audio"));
      };

      audio.play().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

export function stopAudio() {
  const audios = document.querySelectorAll("audio");
  audios.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
}

export function clearAudioCache() {
  audioCache.clear();
}

export async function speakText(
  text: string,
  options: SpeechOptions = {},
): Promise<void> {
  try {
    // Validate input early and thoroughly
    if (!text) {
      const errorMsg = "Text parameter is null, undefined, or falsy";
      console.error("speakText validation error:", {
        text,
        textType: typeof text,
      });
      throw new Error(errorMsg);
    }

    if (typeof text !== "string") {
      const errorMsg = `Invalid text parameter: expected string, got ${typeof text}`;
      console.error("speakText type error:", {
        textType: typeof text,
        textConstructor: (text as any)?.constructor?.name,
        textValue: String(text).substring(0, 100),
      });
      throw new Error(errorMsg);
    }

    // Ensure text is a clean string (not a proxy or special object)
    const cleanText = String(text);
    if (!cleanText.trim()) {
      throw new Error("Text cannot be empty");
    }

    // Validate options object
    const cleanOptions: SpeechOptions = {};
    if (options.voiceId && typeof options.voiceId === "string") {
      cleanOptions.voiceId = options.voiceId;
    }
    if (typeof options.stability === "number") {
      cleanOptions.stability = options.stability;
    }
    if (typeof options.similarityBoost === "number") {
      cleanOptions.similarityBoost = options.similarityBoost;
    }
    if (typeof options.speakerBoost === "boolean") {
      cleanOptions.speakerBoost = options.speakerBoost;
    }

    const blob = await textToSpeech(cleanText, cleanOptions);
    await playAudio(blob);
  } catch (error) {
    console.error("Error speaking text:", error);
    // Log detailed error info for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack?.substring(0, 500),
      });

      // Provide helpful context and gracefully degrade
      if (
        error.message.includes("401") ||
        error.message.includes("Unauthorized")
      ) {
        console.warn(
          "⚠️ ElevenLabs API authentication failed. Voice feature unavailable. Update ELEVENLABS_API_KEY environment variable.",
        );
        // Gracefully degrade - don't throw, just log warning
        return;
      } else if (error.message.includes("not configured")) {
        console.warn("⚠️ ElevenLabs API key not set in server environment. Voice feature disabled.");
        return;
      } else if (
        error.message.includes("Invalid text") ||
        error.message.includes("cannot be empty")
      ) {
        console.error(
          "⚠️ Invalid text input provided to text-to-speech service.",
        );
      } else if (error.message.includes("Failed to serialize")) {
        console.error(
          "⚠️ Text data could not be serialized for API request.",
        );
      }
    }
    // Don't re-throw authentication/config errors - voice is just disabled
    // Other errors would have been handled above
  }
}

export async function checkServiceHealth(): Promise<{
  success: boolean;
  configured: boolean;
  message?: string;
}> {
  try {
    const response = await fetch("/api/elevenlabs/health");
    const data = await response.json();
    console.log("TTS Health check:", data);
    return {
      success: data.success,
      configured: data.configured,
      message: data.message,
    };
  } catch (error) {
    console.error("Health check failed:", error);
    return {
      success: false,
      configured: false,
      message: "Unable to check TTS service",
    };
  }
}
