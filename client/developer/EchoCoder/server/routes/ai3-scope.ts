import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();
const OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;

async function generateRecommendations(requirements: string): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `You are a product architect. Suggest features to expand the project scope.
Return JSON: { "recommendations": [{"feature": "...", "value": "high|medium|low", "effort": "low|med|high"}] }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Requirements:\n${requirements}` },
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
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { recommendations: [] };
  } catch (error) {
    console.error("Recommendations error:", error);
    throw error;
  }
}

async function breakdownMVP(requirements: string): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Break down project into MVP phases.
Return JSON: { "mvp": {"phase1": ["feature1"], "phase2": ["feature2"]}, "timeline": "X weeks" }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Break down MVP:\n${requirements}` },
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
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { mvp: {} };
  } catch (error) {
    console.error("MVP breakdown error:", error);
    throw error;
  }
}

async function assessRisks(requirements: string): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Assess project risks. Return JSON: { "risks": [{"risk": "...", "severity": "high|med|low", "mitigation": "..."}] }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Risk assessment:\n${requirements}` },
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
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { risks: [] };
  } catch (error) {
    console.error("Risk assessment error:", error);
    throw error;
  }
}

router.post("/recommendations", async (req: Request, res: Response) => {
  try {
    const { requirements } = req.body;
    const recommendations = await generateRecommendations(requirements);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

router.post("/mvp-breakdown", async (req: Request, res: Response) => {
  try {
    const { requirements } = req.body;
    const mvp = await breakdownMVP(requirements);
    res.json(mvp);
  } catch (error) {
    res.status(500).json({ error: "Failed to break down MVP" });
  }
});

router.post("/risk-assessment", async (req: Request, res: Response) => {
  try {
    const { requirements } = req.body;
    const risks = await assessRisks(requirements);
    res.json(risks);
  } catch (error) {
    res.status(500).json({ error: "Failed to assess risks" });
  }
});

export default router;
