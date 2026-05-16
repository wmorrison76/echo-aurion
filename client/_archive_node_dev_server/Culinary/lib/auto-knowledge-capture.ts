import {
  storeKnowledgeVector,
  generateEmbedding,
} from "./knowledge-vector-service";
import type { AnyKnowledge } from "../../client/echo/types/knowledge";
const openaiApiKey =
  process.env
    .OPENAI_API_KEY; /** * Automatically capture and store knowledge from an OpenAI-generated recipe * Runs asynchronously without blocking API responses */
export async function captureOpenAIKnowledgeAsync(
  generatedRecipe: any,
  userPrompt: string,
  serviceContext?: string,
): Promise<void> {
  // Run in background without awaiting try { const knowledge = await extractKnowledgeFromRecipe( generatedRecipe, userPrompt, serviceContext, ); if (knowledge.length > 0) { for (const item of knowledge) { try { await storeKnowledgeVector(item); } catch (err) { console.error("Failed to store knowledge item:", err); } } } } catch (error) { console.error("Auto-knowledge capture failed:", error); }
} /** * Extract structured knowledge from a generated recipe */
async function extractKnowledgeFromRecipe(
  recipe: any,
  userPrompt: string,
  serviceContext?: string,
): Promise<AnyKnowledge[]> {
  if (!openaiApiKey) {
    return [];
  }
  try {
    const extractionPrompt = `From this generated recipe, extract structured knowledge items that should be stored in Echo's knowledge base: Recipe Title: ${recipe.title || "Untitled"}
User Request: ${userPrompt}
Service Context: ${serviceContext || "Not specified"} Recipe Content:
${JSON.stringify(recipe, null, 2)} Extract the following knowledge items as a JSON array:
1. The recipe itself (if valid and complete)
2. Any techniques mentioned
3. Key terminology
4. Cooking methods
5. Ingredient chemistry insights
6. Service considerations (if applicable)
7. Cost/yield considerations For each item, provide:
- type:"recipe" |"technique" |"terminology" |"beverage" |"hospitality" |"financial"
- title: string
- content: string (detailed explanation)
- domain:"culinary" |"finance" |"hospitality" |"beverage"
- tags: string[] (relevant tags)
- confidence: number (0-1, how confident this knowledge is accurate) Return ONLY a valid JSON array. Example:
[ {"type":"recipe","title":"Recipe Name","content":"Full recipe with instructions","domain":"culinary","tags": ["cuisine","technique","complexity"],"confidence": 0.95,"cuisine":"French","complexity": 3 }
]`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: extractionPrompt }],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });
    if (!response.ok) {
      console.warn("OpenAI extraction API error:", response.statusText);
      return [];
    }
    const data = (await response.json()) as any;
    const extractedContent = data.choices?.[0]?.message?.content;
    if (!extractedContent) {
      return [];
    }
    const knowledge: AnyKnowledge[] = [];
    try {
      const jsonMatch = extractedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const baseKnowledge = {
              id: `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: item.type || "terminology",
              title: item.title || "Untitled",
              description: item.content || "",
              content: item.content || "",
              source: "openai-auto-capture",
              sourceType: "openai" as const,
              tags: item.tags || [],
              domain: item.domain || "culinary",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              confidence: item.confidence || 0.75,
            };
            let knowledgeItem: AnyKnowledge = baseKnowledge as any;
            if (item.type === "recipe") {
              knowledgeItem = {
                ...baseKnowledge,
                type: "recipe",
                ingredients: item.ingredients || [],
                instructions: item.instructions || [],
                cuisine: item.cuisine,
                course: item.course,
                complexity: item.complexity || 3,
                prepTime: item.prepTime,
                cookTime: item.cookTime,
                yield: item.yield,
                techniques: item.techniques || [],
                flavorProfile: item.flavorProfile || [],
              } as any;
            } else if (item.type === "technique") {
              knowledgeItem = {
                ...baseKnowledge,
                type: "technique",
                steps: item.steps || [item.content],
                equipment: item.equipment || [],
                difficulty: item.difficulty || 2,
                applications: item.applications || [],
                tips: item.tips || [],
              } as any;
            } else if (item.type === "terminology") {
              knowledgeItem = {
                ...baseKnowledge,
                type: "terminology",
                definition: item.definition || item.content,
                context: item.context,
                synonyms: item.synonyms || [],
                examples: item.examples || [],
              } as any;
            } else if (item.type === "hospitality") {
              knowledgeItem = {
                ...baseKnowledge,
                type: "hospitality",
                category: item.category || "service",
                guidelines: item.guidelines || [],
                bestPractices: item.bestPractices || [],
              } as any;
            } else if (item.type === "financial") {
              knowledgeItem = {
                ...baseKnowledge,
                type: "financial",
                category: item.category || "food_cost",
                metrics: item.metrics || {},
              } as any;
            }
            knowledge.push(knowledgeItem);
          }
        }
      }
    } catch (parseError) {
      console.warn("Failed to parse extracted knowledge:", parseError);
    }
    return knowledge;
  } catch (error) {
    console.error("Error extracting knowledge from recipe:", error);
    return [];
  }
} /** * Process and standardize knowledge for storage */
function normalizeKnowledge(item: any, type: string): Partial<AnyKnowledge> {
  return {
    id: `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: type as any,
    title: item.title || item.name || "Untitled",
    description: item.description || item.content || "",
    content: item.content || item.description || "",
    source: "openai-auto-capture",
    sourceType: "openai" as const,
    tags: item.tags || [],
    domain: item.domain || "culinary",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confidence: item.confidence || 0.75,
  };
}
