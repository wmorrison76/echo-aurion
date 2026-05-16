import type { RequestHandler } from "express";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Buffer } from "node:buffer";

const OUTPUT_DIR = path.join(process.cwd(), "public", "generated-assets");
const OUTPUT_URL_PREFIX = "/generated-assets";
const DEFAULT_MODEL = "gpt-image-1";
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "high";
const ALLOWED_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const ALLOWED_QUALITIES = new Set(["low", "medium", "high", "auto"]);
const CACHE_MAX_ENTRIES = 12;

type CachedGeneration = {
  imageUrl: string;
  dataUrl: string;
  prompt: string;
  size: string;
  quality: string;
  revisedPrompt: string | null;
  generatedAt: number;
};

const generationCache = new Map<string, CachedGeneration>();

function makeCacheKey(prompt: string, size: string, quality: string) {
  return `${quality}:::${size}:::${prompt}`;
}

function shouldRetryWithoutQuality(payload: OpenAIImageResponse) {
  const message = payload?.error?.message?.toLowerCase() ?? "";
  return message.includes("quality");
}

function readFromCache(key: string): CachedGeneration | null {
  const entry = generationCache.get(key);
  if (!entry) return null;
  generationCache.delete(key);
  generationCache.set(key, entry);
  return entry;
}

function writeToCache(key: string, entry: CachedGeneration) {
  generationCache.set(key, entry);
  while (generationCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = generationCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    generationCache.delete(oldestKey);
  }
}

type ReferenceImagePayload = {
  dataUrl: string;
  name?: string;
};

type GenerateRequestBody = {
  prompt?: string;
  size?: string;
  quality?: string;
  referenceImage?: ReferenceImagePayload | null;
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; revised_prompt?: string }>;
  error?: { message?: string };
};

type OpenAIResult = {
  base64: string;
  revisedPrompt: string | null;
  mime: string;
  qualityUsed: string;
};

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return null;
  const [, mime, base64] = match;
  try {
    return { buffer: Buffer.from(base64, "base64"), mime };
  } catch {
    return null;
  }
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

function toAbsolutePath(imageUrl: string) {
  if (!imageUrl.startsWith(OUTPUT_URL_PREFIX)) {
    throw new Error("invalid_image_path");
  }
  const filename = imageUrl.slice(OUTPUT_URL_PREFIX.length).replace(/^\/+/, "");
  const resolved = path.join(OUTPUT_DIR, filename);
  if (!resolved.startsWith(OUTPUT_DIR)) {
    throw new Error("invalid_image_path");
  }
  return resolved;
}

function sanitizeAssetName(name: string) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : `asset-${Date.now()}`;
}

async function ensureUniqueFilename(baseName: string, extension: string) {
  let candidate = `${baseName}.${extension}`;
  let attempt = 1;
  while (true) {
    const fullPath = path.join(OUTPUT_DIR, candidate);
    try {
      await fs.access(fullPath);
      candidate = `${baseName}-${attempt}.${extension}`;
      attempt += 1;
    } catch {
      return candidate;
    }
  }
}

async function persistImage(base64: string, mime: string) {
  await ensureOutputDir();
  const timestamp = Date.now();
  const suffix = crypto.randomBytes(4).toString("hex");
  const extension = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "png";
  const filename = `echo-asset-${timestamp}-${suffix}.${extension}`;
  const filePath = path.join(OUTPUT_DIR, filename);
  await fs.writeFile(filePath, Buffer.from(base64, "base64"));
  return `${OUTPUT_URL_PREFIX}/${filename}`;
}

function createOpenAIError(response: Response, payload: OpenAIImageResponse) {
  const message = payload?.error?.message || "openai_image_error";
  const error = new Error(message);
  (error as any).statusCode = response.status;
  (error as any).responseBody = payload;
  return error;
}

async function callOpenAIWithReference(
  apiKey: string,
  prompt: string,
  size: string,
  quality: string,
  reference: ReferenceImagePayload,
) {
  const decoded = decodeDataUrl(reference.dataUrl);
  if (!decoded) {
    throw new Error("invalid_reference_image");
  }

  async function attempt(qualityOverride: string | null): Promise<OpenAIResult> {
    const form = new FormData();
    form.append("model", DEFAULT_MODEL);
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("size", size);
    if (qualityOverride) {
      form.append("quality", qualityOverride);
    }
    const fileName = reference.name || "reference.png";
    const buffer = Buffer.from(decoded.buffer);
    const blob = new Blob([buffer], { type: decoded.mime });
    form.append("image", blob, fileName);

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as OpenAIImageResponse;
    if (!response.ok) {
      if (
        qualityOverride &&
        response.status === 400 &&
        shouldRetryWithoutQuality(payload)
      ) {
        return attempt(null);
      }
      throw createOpenAIError(response, payload);
    }
    const base64 = payload?.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("missing_image_data");
    }
    return {
      base64,
      revisedPrompt: payload?.data?.[0]?.revised_prompt ?? null,
      mime: decoded.mime,
      qualityUsed: qualityOverride ?? "auto",
    };
  }

  return attempt(quality !== "auto" ? quality : null);
}

async function callOpenAIForGeneration(
  apiKey: string,
  prompt: string,
  size: string,
  quality: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (process.env.OPENAI_ORGANIZATION_ID) {
    headers["OpenAI-Organization"] = process.env.OPENAI_ORGANIZATION_ID;
  }

  async function attempt(qualityOverride: string | null): Promise<OpenAIResult> {
    const requestBody: Record<string, unknown> = {
      model: DEFAULT_MODEL,
      prompt,
      size,
      n: 1,
    };
    if (qualityOverride) {
      requestBody.quality = qualityOverride;
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
    const payload = (await response.json().catch(() => ({}))) as OpenAIImageResponse;
    if (!response.ok) {
      if (
        qualityOverride &&
        response.status === 400 &&
        shouldRetryWithoutQuality(payload)
      ) {
        return attempt(null);
      }
      throw createOpenAIError(response, payload);
    }
    const base64 = payload?.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("missing_image_data");
    }
    return {
      base64,
      revisedPrompt: payload?.data?.[0]?.revised_prompt ?? null,
      mime: "image/png",
      qualityUsed: qualityOverride ?? "auto",
    };
  }

  return attempt(quality !== "auto" ? quality : null);
}

function removeFromCacheByUrl(imageUrl: string) {
  for (const [key, entry] of generationCache.entries()) {
    if (entry.imageUrl === imageUrl) {
      generationCache.delete(key);
    }
  }
}

function updateCacheUrl(oldUrl: string, nextUrl: string) {
  for (const [key, entry] of generationCache.entries()) {
    if (entry.imageUrl === oldUrl) {
      generationCache.set(key, { ...entry, imageUrl: nextUrl });
    }
  }
}

export const handleImageGenerate: RequestHandler = async (req, res) => {
  try {
    const { prompt = "", size = DEFAULT_SIZE, quality = DEFAULT_QUALITY, referenceImage = null } =
      (req.body ?? {}) as GenerateRequestBody;
    const trimmedPrompt = String(prompt || "").trim();
    if (!trimmedPrompt) {
      res.status(400).json({ ok: false, error: "prompt_required" });
      return;
    }
    const effectiveSize = ALLOWED_SIZES.has(String(size)) ? String(size) : DEFAULT_SIZE;
    const effectiveQuality = ALLOWED_QUALITIES.has(String(quality)) ? String(quality) : DEFAULT_QUALITY;
    const apiKey =
      process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      res.status(400).json({ ok: false, error: "missing_api_key" });
      return;
    }

    let cacheKey: string | null = null;
    if (!referenceImage?.dataUrl) {
      cacheKey = makeCacheKey(trimmedPrompt, effectiveSize, effectiveQuality);
      const cached = readFromCache(cacheKey);
      if (cached) {
        res.json({
          ok: true,
          ...cached,
          cacheHit: true,
        });
        return;
      }
    }

    let result: OpenAIResult;
    if (referenceImage?.dataUrl) {
      result = await callOpenAIWithReference(
        apiKey,
        trimmedPrompt,
        effectiveSize,
        effectiveQuality,
        referenceImage,
      );
    } else {
      result = await callOpenAIForGeneration(apiKey, trimmedPrompt, effectiveSize, effectiveQuality);
    }

    const resolvedQuality = result.qualityUsed || effectiveQuality;

    const imageUrl = await persistImage(result.base64, result.mime);
    const dataUrl = `data:${result.mime};base64,${result.base64}`;
    const generatedAt = Date.now();
    const responsePayload = {
      ok: true,
      imageUrl,
      dataUrl,
      prompt: trimmedPrompt,
      size: effectiveSize,
      quality: resolvedQuality,
      revisedPrompt: result.revisedPrompt || null,
      generatedAt,
      cacheHit: false,
    };

    if (cacheKey) {
      writeToCache(cacheKey, {
        imageUrl,
        dataUrl,
        prompt: trimmedPrompt,
        size: effectiveSize,
        quality: resolvedQuality,
        revisedPrompt: result.revisedPrompt || null,
        generatedAt,
      });
    }

    res.json(responsePayload);
  } catch (error: any) {
    console.error("image_generate_error", error);
    const status = typeof error?.statusCode === "number" ? error.statusCode : 500;
    const message =
      typeof error?.message === "string" && error.message.trim().length > 0
        ? error.message.trim()
        : "image_generation_failed";

    res.status(status).json({
      ok: false,
      error: message,
      details: error?.responseBody ?? null,
    });
  }
};

export const handleImageDelete: RequestHandler = async (req, res) => {
  try {
    const imageUrl = String(req.body?.imageUrl || "");
    if (!imageUrl) {
      res.status(400).json({ ok: false, error: "image_url_required" });
      return;
    }
    const filePath = toAbsolutePath(imageUrl);
    await fs.unlink(filePath);
    removeFromCacheByUrl(imageUrl);
    res.json({ ok: true, imageUrl });
  } catch (error: any) {
    console.error("image_delete_error", error);
    const status = typeof error?.statusCode === "number" ? error.statusCode : 400;
    const message = error?.message || "image_delete_failed";
    res.status(status).json({ ok: false, error: message });
  }
};

export const handleImageSave: RequestHandler = async (req, res) => {
  try {
    const imageUrl = String(req.body?.imageUrl || "");
    const name = String(req.body?.name || "");
    if (!imageUrl || !name.trim()) {
      res.status(400).json({ ok: false, error: "image_url_and_name_required" });
      return;
    }
    await ensureOutputDir();
    const sourcePath = toAbsolutePath(imageUrl);
    const stat = await fs.stat(sourcePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      res.status(404).json({ ok: false, error: "image_not_found" });
      return;
    }
    const extension = path.extname(sourcePath).replace(/^\./, "") || "png";
    const baseName = sanitizeAssetName(name);
    const candidate = await ensureUniqueFilename(baseName, extension);
    const targetPath = path.join(OUTPUT_DIR, candidate);
    await fs.rename(sourcePath, targetPath);
    const nextUrl = `${OUTPUT_URL_PREFIX}/${candidate}`;
    updateCacheUrl(imageUrl, nextUrl);
    res.json({ ok: true, imageUrl: nextUrl });
  } catch (error: any) {
    console.error("image_save_error", error);
    const status = typeof error?.statusCode === "number" ? error.statusCode : 400;
    const message = error?.message || "image_save_failed";
    res.status(status).json({ ok: false, error: message });
  }
};
