/**
 * Avatar Voice API Routes
 * Handles audio transcription and synthesis
 */

import { Router, Request, Response } from 'express';
import { logger } from '../lib/logger';
import multer from 'multer';
import { getOpenAIClient, getOpenAIKey } from '../lib/env';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// D17c · OpenAI access goes through the fuse-box helper. The whisper
// REST endpoint is still hardcoded here pending D17d (URL centralization).
const OPENAI_API_KEY = getOpenAIKey();
const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Lazy-singleton client; null when no key is wired (callers degrade
// gracefully — see line 65: `if (openaiClient) { ... }`).
const openaiClient: any = getOpenAIClient();

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using Whisper API
 */
export async function handleTranscribe(req: Request, res: Response) {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  try {
    logger.info('[VOICE] Transcribing audio:', file.originalname);

    if (!OPENAI_API_KEY) {
      logger.warn('[VOICE] OpenAI API key not configured, using mock transcription');
      const mockTranscripts = [
        'check inventory',
        'create purchase order',
        'schedule shift for tomorrow',
        'what is the cost of beef',
        'quality check required',
      ];
      const randomIndex = Math.floor(Math.random() * mockTranscripts.length);
      const mockText = mockTranscripts[randomIndex];
      return res.json({
        success: true,
        text: mockText,
        language: 'en',
      });
    }

    // Call Whisper API - prefer OpenAI SDK if available, otherwise use manual fetch
    let transcriptText = '';
    let detectedLanguage = 'en';

    if (openaiClient) {
      // Use OpenAI SDK (cleaner, handles multipart automatically)
      try {
        // Create a File-like object for Node.js (OpenAI SDK expects File or Buffer)
        const fileBlob = Buffer.from(file.buffer);
        const transcription = await openaiClient.audio.transcriptions.create({
          file: fileBlob as any,
          model: 'whisper-1',
          language: 'en',
          filename: file.originalname,
        });
        transcriptText = transcription.text || '';
        detectedLanguage = transcription.language || 'en';
      } catch (sdkError) {
        logger.error('[VOICE] OpenAI SDK transcription failed, falling back to fetch:', sdkError);
        // Fall through to manual fetch
      }
    }

    if (!transcriptText && OPENAI_API_KEY) {
      // Fallback: Manual multipart form data construction for fetch
      const boundary = `----WebKitFormBoundary${Date.now()}`;
      const formParts: Buffer[] = [];
      
      formParts.push(Buffer.from(`--${boundary}\r\n`));
      formParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${file.originalname}"\r\n`));
      formParts.push(Buffer.from(`Content-Type: ${file.mimetype || 'audio/webm'}\r\n\r\n`));
      formParts.push(file.buffer);
      formParts.push(Buffer.from(`\r\n--${boundary}\r\n`));
      formParts.push(Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`));
      formParts.push(Buffer.from(`--${boundary}\r\n`));
      formParts.push(Buffer.from(`Content-Disposition: form-data; name="language"\r\n\r\nen\r\n`));
      formParts.push(Buffer.from(`--${boundary}--\r\n`));
      
      const formBody = Buffer.concat(formParts);

      const whisperResponse = await fetch(OPENAI_WHISPER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: formBody,
      });

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        logger.error('[VOICE] Whisper API error:', errorText);
        throw new Error(`Whisper API error: ${whisperResponse.status}`);
      }

      const whisperData = await whisperResponse.json();
      transcriptText = whisperData.text || '';
      detectedLanguage = whisperData.language || 'en';
    }

    if (!transcriptText) {
      throw new Error('Transcription failed - no text returned');
    }

    logger.info('[VOICE] Transcription complete:', transcriptText.substring(0, 50));

    return res.json({
      success: true,
      text: transcriptText,
      language: detectedLanguage,
    });
  } catch (error) {
    logger.error('[VOICE] Transcription error:', error);
    return res.status(500).json({
      error: 'Transcription failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/voice/synthesize
 * Generate speech from text using TTS
 * Optional: Use ElevenLabs for higher quality
 */
export async function handleSynthesize(req: Request, res: Response) {
  const { text, voiceId = 'default' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    logger.info('[VOICE] Synthesizing text:', text.substring(0, 50));

    // Use OpenAI TTS (faster) or ElevenLabs (higher quality)
    // TODO: Install @openai/sdk to enable real TTS
    // const response = await openai.audio.speech.create({
    //   model: 'tts-1-hd', // High definition
    //   voice: 'onyx', // Professional male voice
    //   input: text,
    // });

    // For testing, return a simple silent audio chunk
    const silentAudioBuffer = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]); // MPEG header

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(silentAudioBuffer);

  } catch (error) {
    logger.error('[VOICE] TTS error:', error);
    return res.status(500).json({
      error: 'Text-to-speech failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/voice/voices
 * List available voices for synthesis
 */
export async function handleListVoices(req: Request, res: Response) {
  const voices = [
    {
      id: 'onyx',
      name: 'Onyx',
      description: 'Professional male voice',
      language: 'en',
    },
    {
      id: 'nova',
      name: 'Nova',
      description: 'Professional female voice',
      language: 'en',
    },
    {
      id: 'alloy',
      name: 'Alloy',
      description: 'Friendly male voice',
      language: 'en',
    },
    {
      id: 'echo',
      name: 'Echo',
      description: 'Energetic male voice',
      language: 'en',
    },
  ];
  
  return res.json({
    voices,
    defaultVoice: 'onyx',
  });
}

/**
 * POST /api/voice/detect-emotion
 * Detect emotion from audio
 */
export async function handleDetectEmotion(req: Request, res: Response) {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }
  
  try {
    // For now, use a simple heuristic based on transcription
    // In production, you'd use a dedicated emotion detection model
    
    // Note: This endpoint requires real Whisper API - using mock for now
    // In production, implement real emotion detection via Whisper + sentiment analysis
    const mockText = 'neutral statement';
    
    // Simple sentiment analysis
    let emotion = 'neutral';
    
    const positiveWords = ['happy', 'great', 'good', 'excellent', 'love', 'amazing'];
    const negativeWords = ['sad', 'bad', 'terrible', 'hate', 'awful', 'angry'];
    const questionWords = ['what', 'why', 'how', 'when', 'where'];
    
    const positiveCount = positiveWords.filter(w => text.includes(w)).length;
    const negativeCount = negativeWords.filter(w => text.includes(w)).length;
    const isQuestion = questionWords.some(w => text.startsWith(w));
    
    if (isQuestion) {
      emotion = 'questioning';
    } else if (positiveCount > negativeCount) {
      emotion = 'positive';
    } else if (negativeCount > positiveCount) {
      emotion = 'negative';
    }
    
    return res.json({
      emotion,
      confidence: 0.65, // Placeholder
      text,
    });
    
  } catch (error) {
    logger.error('[VOICE] Emotion detection error:', error);
    return res.status(500).json({
      error: 'Emotion detection failed',
    });
  }
}

router.post('/transcribe', upload.single('audio'), handleTranscribe);
router.post('/synthesize', handleSynthesize);
router.get('/voices', handleListVoices);
router.post('/detect-emotion', upload.single('audio'), handleDetectEmotion);

export default router;
