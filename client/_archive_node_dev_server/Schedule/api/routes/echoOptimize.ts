/** * Echo Optimization API Route * Provides AI-driven optimization suggestions * POST /api/echo/optimize */ import { Router } from"express";
import { z } from"zod";
import { getSupabase } from"../../lib/supabase";
import { validateBody } from"../../middleware/validate";
import { requireRole } from"../../middleware/auth";
import OpenAI from"openai"; const router = Router(); const optimizeSchema = z.object({ org_id: z.string().uuid(), dept_id: z.string().uuid(), lang: z.enum(["en","fr","it","de","pt","es"]).default("en"),
import { getSubmoduleOpenAIClient } from "@/modules/_shared/openai-client";
}); /** * POST /api/echo/optimize * Analyze schedules and suggest optimizations */
router.post("/optimize", requireRole("DEPT_MGR","GM","ADMIN"), validateBody(optimizeSchema), async (req, res, next) => { try { const { org_id, dept_id, lang } = req.body; const supabase = getSupabase(); if (!supabase) { return res.json({ issues: [], recommendations: [], }); } // Fetch recent schedule data const { data: shifts } = await supabase .from("shifts") .select("*") .eq("dept_id", dept_id) .gte("starts_at", new Date(Date.now() - 7 * 86400000).toISOString()) .limit(50); // Fetch forecast data const { data: forecast } = await supabase .from("interval_coverage") .select("*") .eq("dept_id", dept_id) .gte("ts", new Date(Date.now() - 7 * 86400000).toISOString()) .limit(100); const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) { return res.json({ issues: ["Staff understaffed during peak hours","High overtime exposure", ], recommendations: ["Add afternoon shift coverage","Consider cross-training", ], }); } const client = getSubmoduleOpenAIClient(); const prompt = `
You are a labor optimization expert. Analyze this schedule and forecast data and provide specific recommendations.
Department: ${dept_id}
Shifts (sample): ${JSON.stringify(shifts?.slice(0, 10) || [])}
Forecast (sample): ${JSON.stringify(forecast?.slice(0, 10) || [])} Identify:
1. Overstaffing periods (>20% above forecast)
2. Understaffing periods (>20% below forecast)
3. High overtime exposure
4. Fairness concerns (uneven shifts)
5. Skill gaps Response format: JSON with {"issues": [...],"recommendations": [...] }
Respond in ${lang}.
`; const response = await client.chat.completions.create({ model:"gpt-4o-mini", messages: [ { role:"system", content:"You are a hospitality labor optimization AI. Provide specific, actionable insights.", }, { role:"user", content: prompt, }, ], temperature: 0.3, max_tokens: 1000, }); const content = response.choices[0]?.message?.content ||"{}"; let result = { issues: [], recommendations: [] }; try { result = JSON.parse(content); } catch (e) { result = { issues: [content], recommendations: ["Consult with management for detailed analysis", ], }; } res.json({ org_id, dept_id, lang, ...result, generated_at: new Date().toISOString(), }); } catch (err) { next(err); } }
); export default router;
