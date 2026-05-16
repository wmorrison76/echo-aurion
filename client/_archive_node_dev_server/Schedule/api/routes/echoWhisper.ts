/** * Echo Whisper API Route * Conversational AI assistant for managers * POST /api/echo/whisper */ import { Router } from"express";
import { z } from"zod";
import { validateBody } from"../../middleware/validate";
import OpenAI from"openai"; const router = Router(); const whisperSchema = z.object({ prompt: z.string().min(1,"Prompt required"), lang: z.enum(["en","fr","it","de","pt","es"]).default("en"), context: z .object({ org_id: z.string().optional(), dept_id: z.string().optional(), }) .optional(),
import { getSubmoduleOpenAIClient } from "@/modules/_shared/openai-client";
}); /** * POST /api/echo/whisper * Send natural language query to Echo */
router.post("/whisper", validateBody(whisperSchema), async (req, res, next) => { try { const { prompt, lang, context } = req.body; const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) { return res.json({ reply:"Echo AI is not configured. Please set OPENAI_API_KEY environment variable.", }); } const client = getSubmoduleOpenAIClient(); const systemPrompt = `
You are Echo Whisper, a multilingual hospitality AI assistant helping managers with labor insights.
Respond in ${lang} with professional, concise tone.
Current context: ${context?.org_id ? `Organization: ${context.org_id}` :""} ${context?.dept_id ? `Department: ${context.dept_id}` :""}
Provide actionable recommendations based on common hospitality challenges.
`; const response = await client.chat.completions.create({ model:"gpt-4o-mini", messages: [ { role:"system", content: systemPrompt, }, { role:"user", content: prompt, }, ], temperature: 0.4, max_tokens: 500, }); const reply = response.choices[0]?.message?.content ||"No response from Echo"; res.json({ reply, lang, timestamp: new Date().toISOString(), }); } catch (err) { next(err); }
}); /** * POST /api/echo/whisper/optimize * Get Echo's optimization suggestions */
router.post("/whisper/optimize", validateBody( z.object({ dept_id: z.string().uuid(), org_id: z.string().uuid(), lang: z.enum(["en","fr","it","de","pt","es"]).default("en"), }) ), async (req, res, next) => { try { const { dept_id, org_id, lang } = req.body; const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) { return res.json({ suggestions: ["Configure OpenAI API key to enable Echo optimization", ], }); } const client = getSubmoduleOpenAIClient(); const response = await client.chat.completions.create({ model:"gpt-4o-mini", messages: [ { role:"system", content: `You are an expert hospitality labor optimization AI.
Respond in ${lang} with specific, actionable optimization suggestions.
Format response as a JSON array of suggestion strings.`, }, { role:"user", content: `Analyze labor patterns for department ${dept_id} and suggest 3-5 specific optimizations.`, }, ], temperature: 0.3, max_tokens: 500, }); const content = response.choices[0]?.message?.content ||"[]"; // Try to parse as JSON, fallback to array let suggestions: string[] = []; try { suggestions = JSON.parse(content); if (!Array.isArray(suggestions)) suggestions = [content]; } catch { suggestions = [content]; } res.json({ org_id, dept_id, suggestions, lang, }); } catch (err) { next(err); } }
); export default router;
