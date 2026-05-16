export type VoiceLanguageOption = {
  code: string;
  label: string;
};

export const VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
];

export type VoiceTranslateResult = {
  transcript: string;
  translation: string;
  sourceLanguage?: string;
  targetLanguage: string;
};

export const transcribeAudio = async (audio: Blob) => {
  const formData = new FormData();
  formData.append("audio", audio);
  const response = await fetch("/api/voice/transcribe", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Transcription failed");
  }
  const data = await response.json();
  return { text: String(data.text || ""), language: data.language as string | undefined };
};

export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
) => {
  if (!text.trim()) return "";
  if (!targetLanguage || targetLanguage === sourceLanguage) return text;
  const systemPrompt = `Translate the user message from ${sourceLanguage || "auto"} to ${targetLanguage}. Return only the translated text.`;
  const response = await fetch("/api/echo-ai3/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: text }],
      systemPrompt,
      context: { module: "collaboration" },
      stream: false,
      maxTokens: 400,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Translation failed");
  }
  const data = await response.json();
  if (!data?.ok) {
    throw new Error(data?.error || "Translation failed");
  }
  return String(data.response || "");
};
