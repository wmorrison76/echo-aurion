import type { Lang } from "@/i18n";

interface TranslationCache {
  [key: string]: {
    [lang: string]: string;
    timestamp: number;
  };
}

interface TranslationRequest {
  text: string;
  targetLang: Lang;
  context?: string;
  skipCache?: boolean;
}

interface TranslationBatch {
  texts: string[];
  targetLang: Lang;
  context?: string;
}

const LANGUAGE_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
};

const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

class TranslationService {
  private memoryCache: TranslationCache = {};
  private pendingRequests: Map<string, Promise<string>> = new Map();
  private batchQueue: TranslationBatch[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY || "";
    this.loadCacheFromStorage();
  }

  /**
   * Translate a single text with caching
   */
  async translate(request: TranslationRequest): Promise<string> {
    const { text, targetLang, context, skipCache = false } = request;

    // Return early if already in target language or empty
    if (!text || text.trim().length === 0) {
      return text;
    }

    // Check if it's already English (source language)
    const cacheKey = this.generateCacheKey(text, context);

    // Return from cache if available and not skipped
    if (!skipCache && this.memoryCache[cacheKey]?.[targetLang]) {
      const cached = this.memoryCache[cacheKey][targetLang];
      if (Date.now() - this.memoryCache[cacheKey].timestamp < CACHE_DURATION) {
        return cached;
      }
    }

    // Check for pending request to avoid duplicate API calls
    const pendingKey = `${cacheKey}:${targetLang}`;
    if (this.pendingRequests.has(pendingKey)) {
      return this.pendingRequests.get(pendingKey)!;
    }

    // Create translation promise
    const translationPromise = this.performTranslation(text, targetLang, context);
    this.pendingRequests.set(pendingKey, translationPromise);

    try {
      const translation = await translationPromise;

      // Store in cache
      if (!this.memoryCache[cacheKey]) {
        this.memoryCache[cacheKey] = { timestamp: Date.now() };
      }
      this.memoryCache[cacheKey][targetLang] = translation;

      // Persist to storage (debounced)
      this.saveCacheToStorage();

      return translation;
    } finally {
      this.pendingRequests.delete(pendingKey);
    }
  }

  /**
   * Translate multiple texts efficiently
   */
  async translateBatch(request: TranslationBatch): Promise<string[]> {
    const { texts, targetLang, context } = request;

    // Separate cached and uncached texts
    const results: (string | null)[] = texts.map((text) => {
      const cacheKey = this.generateCacheKey(text, context);
      return this.memoryCache[cacheKey]?.[targetLang] || null;
    });

    const uncachedTexts = texts.filter((_, idx) => results[idx] === null);

    if (uncachedTexts.length === 0) {
      return results as string[];
    }

    // Translate uncached texts
    const translations = await this.performBatchTranslation(
      uncachedTexts,
      targetLang,
      context
    );

    // Merge results
    let translationIdx = 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i] === null) {
        const cacheKey = this.generateCacheKey(texts[i], context);
        results[i] = translations[translationIdx];

        if (!this.memoryCache[cacheKey]) {
          this.memoryCache[cacheKey] = { timestamp: Date.now() };
        }
        this.memoryCache[cacheKey][targetLang] = translations[translationIdx];

        translationIdx++;
      }
    }

    this.saveCacheToStorage();
    return results as string[];
  }

  /**
   * Perform actual translation via OpenAI API
   */
  private async performTranslation(
    text: string,
    targetLang: Lang,
    context?: string
  ): Promise<string> {
    if (!this.apiKey) {
      console.warn("OpenAI API key not configured, returning original text");
      return text;
    }

    try {
      const systemPrompt = `You are a professional translator. Translate the following text to ${LANGUAGE_NAMES[targetLang]}${
        context ? ` (context: ${context})` : ""
      }. 
      IMPORTANT: 
      - Return ONLY the translated text, nothing else
      - Preserve formatting, punctuation, and special characters
      - Keep technical terms unchanged if they are proper nouns or technical names
      - Maintain the exact same structure and line breaks
      - Do not add explanations or notes`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0.3,
          max_tokens: Math.min(
            Math.ceil(text.length * 1.5),
            2000
          ),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Translation API error:", error);
        return text;
      }

      const data: any = await response.json();
      const translation =
        data.choices?.[0]?.message?.content?.trim() || text;

      return translation;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  }

  /**
   * Perform batch translation via OpenAI API
   */
  private async performBatchTranslation(
    texts: string[],
    targetLang: Lang,
    context?: string
  ): Promise<string[]> {
    if (!this.apiKey || texts.length === 0) {
      return texts;
    }

    try {
      const batchText = texts
        .map((t, i) => `[${i}] ${t}`)
        .join("\n---\n");

      const systemPrompt = `You are a professional translator. Translate each numbered text to ${LANGUAGE_NAMES[targetLang]}${
        context ? ` (context: ${context})` : ""
      }.
      IMPORTANT:
      - Return ONLY the translations in the same format: [0] translated text
      - Preserve all formatting and punctuation
      - Keep technical terms unchanged if they are proper nouns
      - Maintain exact structure
      - Do not add explanations`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: batchText,
            },
          ],
          temperature: 0.3,
          max_tokens: Math.min(
            Math.ceil(batchText.length * 1.5),
            4000
          ),
        }),
      });

      if (!response.ok) {
        console.error("Batch translation API error");
        return texts;
      }

      const data: any = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";

      // Parse batch response
      const translations: string[] = new Array(texts.length);
      const lines = responseText.split("\n");

      for (const line of lines) {
        const match = line.match(/^\[(\d+)\]\s+(.*)$/);
        if (match) {
          const idx = parseInt(match[1]);
          const translation = match[2];
          if (idx < texts.length) {
            translations[idx] = translation;
          }
        }
      }

      // Fallback for any missing translations
      for (let i = 0; i < texts.length; i++) {
        if (!translations[i]) {
          translations[i] = texts[i];
        }
      }

      return translations;
    } catch (error) {
      console.error("Batch translation error:", error);
      return texts;
    }
  }

  /**
   * Generate cache key from text and context
   */
  private generateCacheKey(text: string, context?: string): string {
    const normalizedText = text.toLowerCase().trim();
    const key = context
      ? `${normalizedText}:${context}`
      : normalizedText;
    return Buffer.from(key).toString("base64");
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem("translation-cache");
      if (stored) {
        const cache = JSON.parse(stored);
        this.memoryCache = cache;
      }
    } catch (error) {
      console.warn("Failed to load translation cache:", error);
    }
  }

  /**
   * Save cache to localStorage (with debouncing)
   */
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private saveCacheToStorage(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      try {
        // Only store recent translations to avoid localStorage bloat
        const recentCache: TranslationCache = {};
        const now = Date.now();

        for (const [key, value] of Object.entries(this.memoryCache)) {
          if (now - value.timestamp < CACHE_DURATION) {
            recentCache[key] = value;
          }
        }

        localStorage.setItem("translation-cache", JSON.stringify(recentCache));
      } catch (error) {
        console.warn("Failed to save translation cache:", error);
      }
    }, 5000); // Debounce for 5 seconds
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.memoryCache = {};
    localStorage.removeItem("translation-cache");
  }

  /**
   * Get cache stats
   */
  getCacheStats(): {
    entries: number;
    size: string;
  } {
    const size = new Blob([JSON.stringify(this.memoryCache)]).size;
    return {
      entries: Object.keys(this.memoryCache).length,
      size: `${(size / 1024).toFixed(2)} KB`,
    };
  }
}

export const translationService = new TranslationService();
export type { TranslationRequest, TranslationBatch };
