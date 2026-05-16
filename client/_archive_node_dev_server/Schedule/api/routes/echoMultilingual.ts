/** * Echo Multilingual API Route * Handles multilingual voice and text queries with language detection and translation * Integrates with EchoVoice frontend component */ import { Router } from"express";
import { z } from"zod";
import { validateBody } from"../../middleware/validate";
import OpenAI from"openai"; const router = Router(); const echoMultilingualSchema = z.object({ prompt: z.string().min(1,"Prompt required"), lang: z.enum(["en","fr","it","de","pt","es"]).default("en"), context: z .object({ org_id: z.string().optional(), dept_id: z.string().optional(), user_id: z.string().optional(), }) .optional(),
import { getSubmoduleOpenAIClient } from "@/modules/_shared/openai-client";
}); /** * POST /api/echo-multilingual * Process voice/text input in any supported language * Returns AI response in the same language with synthesis-ready text */
router.post("/", validateBody(echoMultilingualSchema), async (req, res, next) => { try { const { prompt, lang, context } = req.body; const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) { return res.status(503).json({ error:"Echo service not configured", reply:"Echo AI is not available at this moment. Please try again later.", }); } const client = getSubmoduleOpenAIClient(); // Map language codes to full names for better AI context const langMap: Record<string, string> = { en:"English", fr:"French", it:"Italian", de:"German", pt:"Portuguese", es:"Spanish", }; const fullLangName = langMap[lang] ||"English"; // System prompt for multilingual Echo const systemPrompt = `
You are Echo Voice, a multilingual AI assistant for hospitality managers. CRITICAL INSTRUCTIONS:
1. Respond ONLY in ${fullLangName} (language code: ${lang})
2. Keep responses concise (1-3 sentences max for voice synthesis)
3. Be professional, actionable, and specific
4. Never switch languages - stay in ${fullLangName} at all times
5. Optimize text for text-to-speech clarity Context:
${context?.org_id ? `- Organization: ${context.org_id}` :""}
${context?.dept_id ? `- Department: ${context.dept_id}` :""}
${context?.user_id ? `- User: ${context.user_id}` :""} Provide concise, actionable responses for hospitality management queries.
`; const response = await client.chat.completions.create({ model:"gpt-4o-mini", messages: [ { role:"system", content: systemPrompt, }, { role:"user", content: prompt, }, ], temperature: 0.7, max_tokens: 150, }); const reply = response.choices[0].message.content ||"I could not process that request. Please try again."; res.json({ success: true, reply, lang, prompt_received: prompt, model: response.model, usage: { input_tokens: response.usage?.prompt_tokens || 0, output_tokens: response.usage?.completion_tokens || 0, }, }); } catch (error) { console.error("Echo multilingual error:", error); next(error); } }
); /** * POST /api/echo-multilingual/detect-language * Detect the language of user input */
router.post("/detect-language", validateBody(z.object({ text: z.string().min(1) })), async (req, res, next) => { try { const { text } = req.body; const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) { return res.status(503).json({ error:"Service not available" }); } const client = getSubmoduleOpenAIClient(); const response = await client.chat.completions.create({ model:"gpt-3.5-turbo", messages: [ { role:"system", content: 'Detect the language of the given text. Respond with ONLY a language code (en, fr, it, de, pt, es) or"unknown". No other text.', }, { role:"user", content: text, }, ], temperature: 0, max_tokens: 10, }); const detected = (response.choices[0].message.content ||"unknown").toLowerCase().trim(); const validLangs = ["en","fr","it","de","pt","es","unknown"]; const lang = validLangs.includes(detected) ? detected :"unknown"; res.json({ success: true, detected_lang: lang, text }); } catch (error) { console.error("Language detection error:", error); next(error); } }
); export default router;
