import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const prompt = String(req.body?.prompt || req.query.prompt || "");
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    const resp = await client.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-5-chat-latest" if you want higher quality and have access
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
    });

    const reply = resp.choices?.[0]?.message?.content ?? "";
    res.status(200).json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "server error" });
  }
}