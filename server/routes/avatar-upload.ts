import { Router, Request, Response } from "express";
import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { logger } from "../lib/logger";

const router = Router();

const uploadsDir =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "uploads", "avatars")
    : path.join(
        process.cwd(),
        "client",
        "modules",
        "Schedule",
        "data",
        "avatars",
      );

async function ensureUploadsDir(): Promise<boolean> {
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      logger.info(`[AVATAR-UPLOAD] Created uploads directory: ${uploadsDir}`);
    }
    return true;
  } catch (error) {
    logger.warn(
      `[AVATAR-UPLOAD] Warning: Could not create directory ${uploadsDir}:`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

interface AvatarValidationResult {
  isAppropriate: boolean;
  confidence: number;
  reason?: string;
}

async function validateImageWithOpenAI(
  imageBuffer: Buffer,
): Promise<AvatarValidationResult> {
  try {
    const base64Image = imageBuffer.toString("base64");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ECHO_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-vision",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Analyze this image for workplace appropriateness. Check if it is: 1) A professional or casual photo suitable for a work environment, 2) Not containing offensive, violent, or inappropriate content, 3) Not containing explicit, NSFW, or adult content. Respond with ONLY a JSON object: {"appropriate": true/false, "confidence": 0-100, "reason": "brief explanation"}',
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = `OpenAI API error: ${JSON.stringify(errorData)}`;
      } catch {
        // If we can't parse JSON error, just use status message
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content || "{}";

    // Try to parse the response as JSON
    let parsed;
    try {
      // Extract JSON from response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      logger.warn(
        `[AVATAR-UPLOAD] Failed to parse OpenAI response: ${content}`,
      );
      return {
        isAppropriate: true,
        confidence: 50,
        reason: "Could not validate image, proceeding with caution",
      };
    }

    return {
      isAppropriate: parsed.appropriate === true,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 50)),
      reason: parsed.reason || undefined,
    };
  } catch (error) {
    logger.error(
      `[AVATAR-UPLOAD] Validation error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    // Fail open - allow upload if validation fails, but log the error
    return {
      isAppropriate: true,
      confidence: 0,
      reason: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function isValidImageMimetype(mimeType: string): boolean {
  const validMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];
  return validMimes.includes(mimeType);
}

interface AvatarUploadRequest extends Request {
  file?: Express.Multer.File;
}

async function handleAvatarUpload(req: AvatarUploadRequest, res: Response) {
  logger.info(`[AVATAR-UPLOAD] Upload request received`);

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file provided",
    });
  }

  const { mimetype, buffer, originalname } = req.file;

  // Validate file type
  if (!isValidImageMimetype(mimetype)) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid file type. Please upload a valid image (JPEG, PNG, GIF, WebP, SVG)",
    });
  }

  // Validate file size (max 5MB)
  if (buffer.length > 5 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: "File too large. Maximum size is 5MB",
    });
  }

  try {
    // Validate image appropriateness
    logger.info(`[AVATAR-UPLOAD] Validating image appropriateness`);
    const validationResult = await validateImageWithOpenAI(buffer);

    if (!validationResult.isAppropriate) {
      logger.warn(
        `[AVATAR-UPLOAD] Image rejected as inappropriate: ${validationResult.reason}`,
      );
      return res.status(400).json({
        success: false,
        error:
          "Image validation failed - image may not be appropriate for a work environment",
        details: validationResult.reason,
        validationConfidence: validationResult.confidence,
      });
    }

    logger.info(
      `[AVATAR-UPLOAD] Image validation passed (confidence: ${validationResult.confidence}%)`,
    );

    // Ensure uploads directory exists
    const dirExists = await ensureUploadsDir();
    if (!dirExists) {
      logger.warn(`[AVATAR-UPLOAD] Could not create uploads directory`);
      // Continue without disk storage
    }

    // Generate unique filename
    const ext = path.extname(originalname) || ".jpg";
    const filename = `avatar-${uuidv4()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file to disk if possible
    if (dirExists) {
      try {
        fs.writeFileSync(filepath, buffer);
        logger.info(`[AVATAR-UPLOAD] File saved: ${filepath}`);
      } catch (writeError) {
        logger.warn(
          `[AVATAR-UPLOAD] Could not write file to disk: ${
            writeError instanceof Error
              ? writeError.message
              : String(writeError)
          }`,
        );
        // Continue - we'll serve from memory
      }
    }

    // Convert to base64 for storage
    const base64Data = buffer.toString("base64");

    return res.json({
      success: true,
      avatarId: filename,
      filename: filename,
      base64: base64Data,
      mimeType: mimetype,
      size: buffer.length,
      validationConfidence: validationResult.confidence,
      message: "Avatar uploaded and validated successfully",
    });
  } catch (error) {
    logger.error(
      `[AVATAR-UPLOAD] Upload error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return res.status(500).json({
      success: false,
      error: "Upload failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleGetAvatar(req: Request, res: Response) {
  const { avatarId } = req.params;

  if (!avatarId) {
    return res.status(400).json({
      success: false,
      error: "Avatar ID is required",
    });
  }

  try {
    const filepath = path.join(uploadsDir, avatarId);

    // Security check: ensure the requested file is within uploads directory
    if (!filepath.startsWith(uploadsDir)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        error: "Avatar not found",
      });
    }

    // Determine content type
    const ext = path.extname(avatarId).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };

    const contentType = mimeTypes[ext] || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    // Stream the file
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);

    stream.on("error", (error) => {
      logger.error(`[AVATAR-UPLOAD] Stream error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: "Error retrieving avatar",
      });
    });
  } catch (error) {
    logger.error(
      `[AVATAR-UPLOAD] Get avatar error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve avatar",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

router.post("/upload", async (req: AvatarUploadRequest, res: Response) => {
  // Manual file parsing for base64 uploads (since we may not have multer configured globally)
  let buffer: Buffer;
  let mimeType: string;
  let originalName: string;

  // Check if file is provided as multipart or JSON base64
  if (req.file) {
    // From multer
    buffer = req.file.buffer;
    mimeType = req.file.mimetype;
    originalName = req.file.originalname;
  } else if (req.body.file && typeof req.body.file === "string") {
    // From base64 string
    const matches = req.body.file.match(/^data:(.*?);base64,(.*)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        error: "Invalid base64 format",
      });
    }
    mimeType = matches[1];
    buffer = Buffer.from(matches[2], "base64");
    originalName = req.body.filename || "avatar.jpg";
  } else {
    return res.status(400).json({
      success: false,
      error: "No file provided",
    });
  }

  // Create a mock Express.Multer.File object
  const file = {
    buffer,
    mimetype: mimeType,
    originalname: originalName,
  };

  // Temporarily attach to request for processing
  req.file = file as any;
  return await handleAvatarUpload(req, res);
});

router.get("/file/:avatarId", handleGetAvatar);

export default router;
