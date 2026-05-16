/**
 * Voice Transcription Route (D2)
 *
 * Thin Whisper wrapper: accepts an audio blob (multipart/form-data) or a
 * pre-captured transcript and returns the transcript text.
 *
 * Distinct from /api/voice-commands/process which also runs NLP routing.
 * The inventory voice-capture flow only needs the transcript — the
 * inventory-specific parser (PurchasingReceiving/client/lib/voice-nlp.ts)
 * runs client-side against the outlet's items + locations.
 *
 * Auth: basicAuthMiddleware. Without OPENAI_API_KEY the endpoint returns
 * 503 with an explicit "transcription service not available" payload, so
 * the client UI can show a fallback "type it manually" path.
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { basicAuthMiddleware } from "../middleware/auth";
import { logger } from "../lib/logger";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // Whisper supports up to 25 MB
});

let openai: any = null;
try {
  const OpenAI = require("openai").default;
  openai = getOpenAIClient();
} catch {
  logger.warn("[VoiceTranscribe] openai package not available");
}

const router = Router();
router.use(basicAuthMiddleware);

router.post("/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!openai || !process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        provisioned: false,
        error: "Transcription service not provisioned",
        detail: "OPENAI_API_KEY not set in environment. UI should fall back to manual entry.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "audio file required (multipart/form-data, field name 'audio')",
      });
    }

    // OpenAI's node SDK accepts a Buffer wrapped as a File-like via
    // toFile helper. Older SDKs accept a Buffer with a name attribute.
    const audioBlob = req.file.buffer;
    const filename = req.file.originalname || "audio.webm";

    let fileForApi: any;
    try {
      // SDK v4+: toFile(buffer, filename)
      const { toFile } = require("openai/uploads");
import { getOpenAIClient } from "../lib/env";
      fileForApi = await toFile(audioBlob, filename);
    } catch {
      // Fallback for older SDKs — attach name onto the buffer.
      (audioBlob as any).name = filename;
      fileForApi = audioBlob;
    }

    const language = (req.body.language as string) || "en";
    const startedAt = Date.now();
    const transcription = await openai.audio.transcriptions.create({
      file: fileForApi,
      model: "whisper-1",
      language,
    });
    const durationMs = Date.now() - startedAt;

    logger.info("[VoiceTranscribe] transcribed", {
      bytes: audioBlob.length,
      durationMs,
      transcriptLength: transcription.text?.length ?? 0,
    });

    res.json({
      success: true,
      transcript: transcription.text ?? "",
      durationMs,
    });
  } catch (err) {
    logger.error("[VoiceTranscribe] error", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Transcription failed",
    });
  }
});

export { router as voiceTranscribeRouter };
export default router;
