/**
 * Translation Endpoint
 * Handles text translation using Google Translate API
 * Backend handles API key securely (never exposed to client)
 */

import express from "express";

const router = express.Router();

interface TranslateRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; // Optional, auto-detect if not provided
}

interface TranslateResponse {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

// Get API key from environment
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

if (!GOOGLE_TRANSLATE_API_KEY) {
  console.warn(
    "⚠️ GOOGLE_TRANSLATE_API_KEY not set. Translation endpoint will return original text.",
  );
}

/**
 * POST /api/translate
 * Translate text using Google Translate API
 */
router.post("/", async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } =
      req.body as TranslateRequest;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        error: "Missing required fields: text, targetLanguage",
      });
    }

    // If API key is not configured, return original text
    if (!GOOGLE_TRANSLATE_API_KEY) {
      return res.status(200).json({
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage || "auto",
        targetLanguage: targetLanguage,
        warning: "Translation API not configured",
      } as TranslateResponse);
    }

    try {
      // Use Google Translate API v2
      const requestBody = new URLSearchParams({
        q: text,
        target: targetLanguage,
        key: GOOGLE_TRANSLATE_API_KEY,
      });

      if (sourceLanguage && sourceLanguage !== "auto") {
        requestBody.append("source", sourceLanguage);
      }

      const response = await fetch(
        "https://translation.googleapis.com/language/translate/v2",
        {
          method: "POST",
          body: requestBody,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Google Translate API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as any;
      const translatedText =
        data.data?.translations?.[0]?.translatedText || text;
      const detectedSourceLanguage =
        data.data?.translations?.[0]?.detectedSourceLanguage ||
        sourceLanguage ||
        "unknown";

      return res.status(200).json({
        originalText: text,
        translatedText: translatedText,
        sourceLanguage: detectedSourceLanguage,
        targetLanguage: targetLanguage,
      } as TranslateResponse);
    } catch (apiError: any) {
      console.error("❌ Google Translate API Error:", apiError.message);

      // Return original text if API fails
      return res.status(200).json({
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage || "auto",
        targetLanguage: targetLanguage,
        error: "Translation service temporarily unavailable",
      } as TranslateResponse);
    }
  } catch (error) {
    console.error("❌ Translation endpoint error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/translate/languages
 * Get list of supported languages
 */
router.get("/languages", (req, res) => {
  const supportedLanguages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "zh-CN", name: "Chinese (Simplified)" },
    { code: "zh-TW", name: "Chinese (Traditional)" },
    { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" },
    { code: "pl", name: "Polish" },
    { code: "nl", name: "Dutch" },
    { code: "tr", name: "Turkish" },
    { code: "vi", name: "Vietnamese" },
    { code: "th", name: "Thai" },
    { code: "id", name: "Indonesian" },
    { code: "uk", name: "Ukrainian" },
  ];

  return res.status(200).json({
    languages: supportedLanguages,
  });
});

export const translateRouter = router;
