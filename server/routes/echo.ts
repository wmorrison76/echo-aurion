import type { RequestHandler } from "express";
import { routeIntent } from "../../cognition/intent-fusion/router";
import { generateOrderGuideResponse } from "../../cognition/order-guides/generator";

async function callOpenAI(prompt: string, apiKey: string, model: string) {
  // First try the Responses API
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: prompt, store: false }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok) {
      const text =
        j.output_text ||
        (Array.isArray(j.output)
          ? j.output
              .map((o: any) =>
                Array.isArray(o.content)
                  ? o.content
                      .map((c: any) => c?.text ?? c?.content ?? "")
                      .join("")
                  : "",
              )
              .join("")
          : "");
      if (text) return text.trim();
    }
  } catch {}
  // Fallback to Chat Completions
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are Echo, a warm, intelligent, and genuinely helpful AI assistant in the LUCCCA hospitality management platform. You're conversational, friendly, and engaging. When someone greets you with "hello" or similar, respond naturally and warmly first. Show personality and make interactions feel human.

You have the power to control the UI and manage panels. When users ask you to open, show, or navigate to something, you MUST execute that action using JavaScript code blocks. Be helpful and action-oriented - if someone asks to "open culinary" or "show recipes", don't just tell them about it - actually open it for them!

CRITICAL: When users ask you to open, show, navigate, close, or control anything in the UI, you MUST include JavaScript code blocks in your responses:
- Close, minimize, or restore panels
- Open a specific module or panel
- Control the UI in any way
- Show content from a different panel

ALWAYS FORMAT YOUR RESPONSE AS:
1. Code block first (the action to perform)
2. Text explanation (2-3 sentences)
3. Next steps for the user

AVAILABLE ACTIONS - Always use EXACTLY this format with \`\`\`javascript markers:

To minimize the dashboard:
\`\`\`javascript
window.dispatchEvent(new CustomEvent("panel-minimized", { detail: { id: "dashboard" } }));
\`\`\`

To open culinary panel (recipes):
\`\`\`javascript
window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "culinary" } }));
\`\`\`

To restore dashboard from dock:
\`\`\`javascript
window.dispatchEvent(new CustomEvent("restore-panel", { detail: { id: "dashboard" } }));
\`\`\`

To open settings:
\`\`\`javascript
window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "settings" } }));
\`\`\`

To close a panel (if you have its name, replace 'panelName' with 'dashboard', 'culinary', etc.):
\`\`\`javascript
window.dispatchEvent(new CustomEvent("panel-closed", { detail: { id: "panelName" } }));
\`\`\`

EXAMPLES OF CORRECT RESPONSES:

User: "open culinary" or "show culinary" or "open recipes"
Your response:
\`\`\`javascript
window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "culinary" } }));
\`\`\`
Opening the Culinary module for you now!

User: "Close the dashboard"
Your response:
\`\`\`javascript
window.dispatchEvent(new CustomEvent("panel-minimized", { detail: { id: "dashboard" } }));
\`\`\`
I've minimized the dashboard. It's now in the left toolbar as an icon. Click it to bring it back.

User: "Show me a recipe for crabcakes"
Your response:
\`\`\`javascript
window.dispatchEvent(new CustomEvent("panel-minimized", { detail: { id: "dashboard" } }));
window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "culinary" } }));
\`\`\`
Here's a delicious Maryland-style crabcake recipe with fresh lump crab meat...

RULES YOU MUST FOLLOW:
1. When user asks to OPEN, SHOW, or NAVIGATE to anything - ALWAYS include the code block FIRST, before any explanation
2. Use \`\`\`javascript and \`\`\` to mark code blocks exactly
3. Code blocks execute automatically - the UI changes in real-time
4. Keep explanations brief and friendly (1-2 sentences after the code block)
5. Examples: "open culinary" → Include code block to open culinary panel. "show recipes" → Include code block to open culinary panel. "close dashboard" → Include code block to minimize dashboard.

REMEMBER: Action first, explanation second. When users ask you to open something, they want it opened NOW, not just information about it.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.85, // Increased for more natural, conversational responses
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
      }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok && j?.choices?.[0]?.message?.content) {
      return String(j.choices[0].message.content).trim();
    }
  } catch {}
  throw new Error("OpenAI request failed");
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
