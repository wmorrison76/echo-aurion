import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { Pool } from "pg";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DATABASE_URL   = process.env.DATABASE_URL || "";
const EMBED_MODEL    = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small"; // 1536 dims

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const pool   = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } });

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "3mb" }));

  app.get("/api/echo-ai/health", (_req, res) => {
    res.json({ ok: true, stt: !!OPENAI_API_KEY, tts: !!OPENAI_API_KEY, search: !!pool });
  });

  // STT
  app.post("/api/echo-ai/stt", upload.single("audio"), async (req, res) => {
    try {
      if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY missing" });
      if (!req.file) return res.status(400).json({ error: "No audio file provided (field: audio)" });
      const file = new File([req.file.buffer], req.file.originalname || "audio.webm", { type: req.file.mimetype });
      const out = await openai.audio.transcriptions.create({ model: "whisper-1", file } as any);
      res.json({ text: out.text || "" });
    } catch (e) {
      console.error("[/stt] error:", e);
      res.status(500).json({ error: "Transcription failed" });
    }
  });

  // TTS
  app.post("/api/echo-ai/tts", async (req, res) => {
    try {
      if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY missing" });
      const { text, voice = "alloy" } = req.body || {};
      if (!text) return res.status(400).json({ error: "Missing text" });
      const speech = await openai.audio.speech.create({ model: "tts-1", voice, input: text, format: "mp3" } as any);
      const buf = Buffer.from(await speech.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", String(buf.length));
      res.send(buf);
    } catch (e) {
      console.error("[/tts] error:", e);
      res.status(500).json({ error: "TTS failed" });
    }
  });

  // Vector search (already there in your file; leaving for completeness)
  app.post("/api/echo-ai/search", async (req, res) => {
    try {
      if (!pool) return res.status(500).json({ error: "DATABASE_URL missing" });
      const q: string = (req.body?.q || "").trim();
      const limit = Math.min(Math.max(parseInt(req.body?.limit || "8", 10) || 8, 1), 50);
      if (!q) return res.status(400).json({ error: "Query 'q' required" });

      const emb = await openai.embeddings.create({ model: EMBED_MODEL, input: q });
      const vec = `[${emb.data[0].embedding.join(",")}]`;
      const client = await pool.connect();
      try {
        const useTsv = /\w/.test(q);
        const sql = useTsv
          ? `
            SELECT d.title, c.doc_id, c.chunk_id, c.chunk_index, c.content,
                   1 - (c.embedding <=> $1::vector) AS score
            FROM chunks c
            JOIN documents d USING (doc_id)
            WHERE c.tsv @@ plainto_tsquery('english', $2)
            ORDER BY c.embedding <=> $1::vector
            LIMIT $3
          `
          : `
            SELECT d.title, c.doc_id, c.chunk_id, c.chunk_index, c.content,
                   1 - (c.embedding <=> $1::vector) AS score
            FROM chunks c
            JOIN documents d USING (doc_id)
            ORDER BY c.embedding <=> $1::vector
            LIMIT $2
          `;
        const params = useTsv ? [vec, q, limit] : [vec, limit];
        const { rows } = await client.query(sql, params as any);
        res.json({ results: rows });
      } finally {
        client.release();
      }
    } catch (e) {
      console.error("[/search] error:", e);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // NEW: Chat with optional RAG grounding
  app.post("/api/echo-ai/chat", async (req: Request, res: Response) => {
    try {
      if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY missing" });
      const prompt: string = (req.body?.prompt || "").trim();
      if (!prompt) return res.status(400).json({ error: "Missing prompt" });

      // optional RAG
      let context = "";
      if (pool) {
        const emb = await openai.embeddings.create({ model: EMBED_MODEL, input: prompt });
        const vec = `[${emb.data[0].embedding.join(",")}]`;
        const client = await pool.connect();
        try {
          const { rows } = await client.query(
            `SELECT content FROM chunks ORDER BY embedding <=> $1::vector LIMIT 6`,
            [vec] as any
          );
          context = rows.map(r => r.content).join("\n---\n");
        } finally {
          client.release();
        }
      }

      const messages = [
        { role: "system", content: "You are Echo, a BOH/FOH operations assistant for hotels & events. Be concise, actionable, and precise." },
        ...(context ? [{ role: "system", content: `Relevant notes:\n${context}` }] : []),
        { role: "user", content: prompt },
      ];

      const out = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages,
      });

      res.json({ reply: out.choices[0]?.message?.content ?? "" });
    } catch (e) {
      console.error("[/chat] error:", e);
      res.status(500).json({ error: "Chat failed" });
    }
  });

  return app;
}

export default createServer;
