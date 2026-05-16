import type { RequestHandler } from "express";
import { routeIntent } from "../../cognition/intent-fusion/router";
import { generateOrderGuideResponse } from "../../cognition/order-guides/generator";
async function callOpenAI(prompt: string, apiKey: string, model: string) {
  // First try the Responses API try { const r = await fetch("https://api.openai.com/v1/responses", { method:"POST", headers: {"Content-Type":"application/json", Authorization: `Bearer ${apiKey}`, }, body: JSON.stringify({ model, input: prompt, store: false }), }); const j: any = await r.json().catch(() => ({})); if (r.ok) { const text = j.output_text || (Array.isArray(j.output) ? j.output .map((o: any) => Array.isArray(o.content) ? o.content .map((c: any) => c?.text ?? c?.content ??"") .join("") :"", ) .join("") :""); if (text) return text.trim(); } } catch {} // Fallback to Chat Completions try { const r = await fetch("https://api.openai.com/v1/chat/completions", { method:"POST", headers: {"Content-Type":"application/json", Authorization: `Bearer ${apiKey}`, }, body: JSON.stringify({ model: model, messages: [ { role:"system", content:"You are Echo, an engineering copilot. Answer concisely and propose next steps.", }, { role:"user", content: prompt }, ], temperature: 0.3, }), }); const j: any = await r.json().catch(() => ({})); if (r.ok && j?.choices?.[0]?.message?.content) { return String(j.choices[0].message.content).trim(); } } catch {} throw new Error("OpenAI request failed");
}
async function maybeHandleCognition(prompt: string): Promise<string | null> {
  try {
    const routed = await routeIntent({ channel: "text", transcript: prompt });
    if (routed.intent === "generate-order-guide") {
      const response = generateOrderGuideResponse(prompt);
      if (response) {
        return response;
      }
      return "I mapped your request to order guide generation but could not parse any known recipes.";
    }
  } catch (error) {
    console.error("cognition_route_error", error);
  }
  return null;
}
export const handleEcho: RequestHandler = async (req, res) => {
  const { prompt = "", locale } = (req.body ?? {}) as {
    prompt?: string;
    locale?: string;
  };
  const apiKey =
    process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = process.env.ECHO_OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey)
    return res.status(400).json({ ok: false, error: "missing_api_key" });
  const toHint = (loc?: string) => {
    const l = (loc || "").toLowerCase();
    if (!l) return "";
    if (l.startsWith("pt")) return "Responda em português do Brasil (pt-BR).";
    if (l.startsWith("es")) return "Responde en español (es-ES).";
    if (l.startsWith("fr")) return "Réponds en français (fr-FR).";
    if (l.startsWith("it")) return "Rispondi in italiano (it-IT).";
    return `Reply in ${loc}.`;
  };
  const langHint = toHint(typeof locale === "string" ? locale : "");
  try {
    const cognition = await maybeHandleCognition(String(prompt));
    if (cognition) {
      return res.json({ ok: true, text: cognition });
    }
    const text = await callOpenAI(
      `${langHint}\n${String(prompt)}`,
      apiKey,
      model,
    );
    return res.json({ ok: true, text });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "echo_failed" });
  }
};
