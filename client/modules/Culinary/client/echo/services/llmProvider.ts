import type { ServiceContext } from "../brain/echoChefBrain";
import type { RecipeCodexMetadata } from "../codex";

export type LlmProviderName = "openai" | "gemini";

const LLM_PROVIDER: LlmProviderName =
  (process.env.LLM_PROVIDER as LlmProviderName) || "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-pro";

export interface GeneratedRecipe {
  title: string;
  description: string;
  yield: {
    amount: number;
    unit: string;
    perGuest?: boolean;
  };
  serviceContext?: ServiceContext;
  miseEnPlace: string[];
  ingredients: {
    section?: string;
    name: string;
    quantity: number | string;
    unit?: string;
    notes?: string;
  }[];
  steps: {
    order: number;
    instruction: string;
    timingMinutes?: number;
    techniqueTags?: string[];
  }[];
  equipment: string[];
  allergens: string[];
  dietaryTags: string[];
  holdingGuidelines?: string[];
  platingNotes?: string;
}

/**
 * High-level helper: given user intent + nearest neighbor recipes,
 * ask the LLM to generate a structured recipe draft.
 */
export async function generateRecipeDraftWithLlm(params: {
  userPrompt: string;
  serviceContext?: ServiceContext;
  guestCount?: number;
  neighbors: RecipeCodexMetadata[];
}): Promise<GeneratedRecipe> {
  const { userPrompt, serviceContext, guestCount, neighbors } = params;

  const neighborSummary = neighbors
    .map(
      (r, idx) =>
        `#${idx + 1}: ${r.title} [${r.cuisineRegion ?? "Unknown cuisine"}] – category=${
          r.category
        }, techniques=${r.primaryTechniques.join(", ")}, dietary=${r.dietaryTags.join(
          ", ",
        )}, service=${r.serviceContext ?? "unspecified"}`,
    )
    .join("\n");

  const baseInstruction = `
You are EchoAi³, a master chef, banquet chef, and food scientist.
Generate a SINGLE recipe as STRICT JSON matching the following TypeScript type:

type ServiceContext = "a_la_carte" | "banquet_plated" | "banquet_buffet" | "reception" | "room_service";

interface GeneratedRecipe {
  title: string;
  description: string;
  yield: { amount: number; unit: string; perGuest?: boolean };
  serviceContext?: ServiceContext;
  miseEnPlace: string[];
  ingredients: { section?: string; name: string; quantity: number | string; unit?: string; notes?: string }[];
  steps: { order: number; instruction: string; timingMinutes?: number; techniqueTags?: string[] }[];
  equipment: string[];
  allergens: string[];
  dietaryTags: string[];
  holdingGuidelines?: string[];
  platingNotes?: string;
}

Rules:
- Output ONLY valid JSON, no backticks, no commentary.
- Scale the recipe appropriately to the guestCount if provided.
- Use techniques and flavor structures similar to the neighbor recipes when appropriate.
- Respect serviceContext (banquet_plated, banquet_buffet, reception, etc.) for holding and plating guidelines.
- Include specific holding guidelines for banquet service (time limits, temperature, method).
`;

  const userInstruction = `
User request: ${userPrompt}
Service context: ${serviceContext ?? "unspecified"}
Estimated guest count: ${guestCount ?? "unspecified"}

Nearest neighbor recipes (summaries):
${neighborSummary}
`;

  if (LLM_PROVIDER === "gemini") {
    return generateWithGemini(baseInstruction, userInstruction);
  }

  return generateWithOpenAI(baseInstruction, userInstruction);
}

async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<GeneratedRecipe> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `OpenAI LLM error: ${res.status} ${res.statusText} – ${body}`,
    );
  }

  const json = (await res.json()) as any;
  const content: string | undefined = json.choices?.[0]?.message?.content ?? "";

  if (!content) {
    throw new Error("OpenAI LLM: empty response content.");
  }

  try {
    return JSON.parse(content) as GeneratedRecipe;
  } catch (err: any) {
    console.error("Failed to parse OpenAI recipe JSON:", err, content);
    throw new Error("OpenAI LLM: invalid JSON returned.");
  }
}

async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
): Promise<GeneratedRecipe> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Gemini LLM error: ${res.status} ${res.statusText} – ${body}`,
    );
  }

  const json = (await res.json()) as any;
  const text: string | undefined =
    json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini LLM: empty response text.");
  }

  try {
    return JSON.parse(text) as GeneratedRecipe;
  } catch (err: any) {
    console.error("Failed to parse Gemini recipe JSON:", err, text);
    throw new Error("Gemini LLM: invalid JSON returned.");
  }
}
