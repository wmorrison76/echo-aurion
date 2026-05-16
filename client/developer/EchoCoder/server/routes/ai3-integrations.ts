import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();
const OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY;

async function suggestIntegrations(
  requirements: string,
  modules: string[],
): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `You are an integration architect. Suggest relevant third-party services (Stripe, Auth0, Supabase, Zapier, SendGrid, etc).
Return JSON: { "integrations": [{"name": "...", "reason": "...", "cost": "$$$", "complexity": "low|med|high"}] }`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Requirements:\n${requirements}\n\nModules:\n${modules.join("\n")}`,
          },
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
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { integrations: [] };
  } catch (error) {
    console.error("Integration suggestion error:", error);
    throw error;
  }
}

async function generateIntegrationConfig(
  integrationName: string,
  requirements: string,
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Generate production-ready ${integrationName} integration code with environment setup, error handling, and type safety.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate ${integrationName} config for:\n${requirements}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Integration config generation error:", error);
    throw error;
  }
}

async function generateDatabaseMigrations(
  databaseType: "postgresql" | "mongodb" | "mysql",
  schema: string,
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OpenAI API key not configured");

  const systemPrompt = `Generate ${databaseType} migration scripts with proper indexing, constraints, and rollback procedures.`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Schema:\n${schema}` },
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

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Migration generation error:", error);
    throw error;
  }
}

router.post("/suggest", async (req: Request, res: Response) => {
  try {
    const { requirements, modules } = req.body;
    const suggestions = await suggestIntegrations(requirements, modules);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: "Failed to suggest integrations" });
  }
});

router.post("/generate-config", async (req: Request, res: Response) => {
  try {
    const { integration, requirements } = req.body;
    const config = await generateIntegrationConfig(integration, requirements);
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate config" });
  }
});

router.post("/migrations", async (req: Request, res: Response) => {
  try {
    const { databaseType, schema } = req.body;
    const migrations = await generateDatabaseMigrations(databaseType, schema);
    res.json({ migrations });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate migrations" });
  }
});

export default router;
