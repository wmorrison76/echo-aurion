import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();
const OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;

async function coordMultipleModules(
  modules: string[],
  relationships: string,
): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Generate coordinated code for multiple modules that work together. Ensure proper API contracts and data flow.
Return JSON: { "coordinatedModules": {...}, "apis": [...], "dataFlow": "..." }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Coordinate:\n${modules.join("\n")}\n\nRelationships:\n${relationships}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { coordinatedModules: {} };
  } catch (error) {
    console.error("Module coordination error:", error);
    throw error;
  }
}

async function suggestRefactoring(code: string): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Analyze code and suggest refactorings. Return JSON: { "suggestions": [{"issue": "...", "fix": "..."}] }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Refactor:\n${code.slice(0, 2000)}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };
  } catch (error) {
    console.error("Refactoring suggestion error:", error);
    throw error;
  }
}

async function auditSecurity(code: string): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Security audit. Return JSON: { "vulnerabilities": [{"cve": "...", "severity": "critical|high|med", "fix": "..."}] }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Security audit:\n${code.slice(0, 2000)}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const responseText = response.data.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { vulnerabilities: [] };
  } catch (error) {
    console.error("Security audit error:", error);
    throw error;
  }
}

router.post("/coordinate-modules", async (req: Request, res: Response) => {
  try {
    const { modules, relationships } = req.body;
    const result = await coordMultipleModules(modules, relationships);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to coordinate modules" });
  }
});

router.post("/refactor-suggestions", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const result = await suggestRefactoring(code);
    res.json(result);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to generate refactoring suggestions" });
  }
});

router.post("/security-audit", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const result = await auditSecurity(code);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to audit security" });
  }
});

export default router;
