import type { RequestHandler } from "express";
const ELEVEN_BASE = "https://api.elevenlabs.io/v1";
const MODEL_ID = process.env.ELEVEN_MODEL_ID || "eleven_multilingual_v2";
async function eleven<T = any>(path: string, init: RequestInit = {}) {
  const key = process.env.ELEVENLABS_API_KEY || "";
  if (!key) throw new Error("missing_elevenlabs_key");
  const r = await fetch(ELEVEN_BASE + path, {
    ...init,
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      ...(init.headers as any),
    },
  });
  if (!r.ok) throw new Error(`eleven_error_${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (/application\/json/i.test(ct)) return (await r.json()) as T;
  const buf = new Uint8Array(await r.arrayBuffer());
  return buf as unknown as T;
}
export const listVoices: RequestHandler = async (_req, res) => {
  try {
    const j: any = await eleven("/voices");
    const voices = (j?.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender || v.category || "neutral",
      language: v.labels?.accent || v.labels?.language || "multi",
    }));
    res.json({ ok: true, voices, model: MODEL_ID });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "voices_failed" });
  }
};
export const speak: RequestHandler = async (req, res) => {
  try {
    const {
      text = "",
      voiceId,
      stability = 0.45,
      similarity_boost = 0.9,
      style = 0.35,
      use_speaker_boost = true,
      download,
      locale,
    } = req.body || {};
    const dl =
      String((req.query as any)?.download ?? download ?? "") === "1" ||
      download === true;
    if (!text || !voiceId)
      return res
        .status(400)
        .json({ ok: false, error: "text_and_voice_required" });
    const body = {
      model_id: MODEL_ID,
      text: String(text),
      voice_settings: { stability, similarity_boost, style, use_speaker_boost },
      optimize_streaming_latency: 0,
    } as any;
    const audio: any = await eleven(`/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { Accept: "audio/mpeg" },
      body: JSON.stringify(body),
    });
    res.setHeader("Content-Type", "audio/mpeg");
    if (dl) {
      const safe = String(locale || "voice")
        .replace(/[^a-z0-9_-]/gi, "_")
        .toLowerCase();
      const fname = `echo-${safe}-${Date.now()}.mp3`;
      res.setHeader("Content-Disposition", `attachment; filename=\"${fname}\"`);
    }
    res.send(Buffer.from(audio));
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "tts_failed" });
  }
};
