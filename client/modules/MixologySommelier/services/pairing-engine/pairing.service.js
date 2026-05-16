import pkg from "pg";
import { openai } from "./openai-client.js";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = {
  query: (text, params) => pool.query(text, params),
};

/**
 * Compute AI pairing suggestions between a recipe and all wines in inventory.
 */
export async function computePairingsForRecipe(recipeId) {
  try {
    const { rows: recipes } = await db.query(
      "SELECT * FROM recipes WHERE id=$1",
      [recipeId],
    );
    if (recipes.length === 0) {
      throw new Error(`Recipe ${recipeId} not found`);
    }
    const recipe = recipes[0];

    const { rows: wines } = await db.query("SELECT * FROM wines");
    const results = [];

    for (const wine of wines) {
      const score = calcScore(recipe, wine);
      if (score > 60) {
        const rationale = await getAIRationale(recipe, wine);
        results.push({
          wine_id: wine.id,
          recipe_id: recipeId,
          pairing_score: score,
          rationale,
        });

        // Store in database
        await db.query(
          `INSERT INTO pairing_evidence (wine_id, recipe_id, pairing_score, rationale)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (wine_id, recipe_id) DO UPDATE SET pairing_score=$3, rationale=$4`,
          [wine.id, recipeId, score, rationale],
        );
      }
    }

    return results.sort((a, b) => b.pairing_score - a.pairing_score);
  } catch (error) {
    console.error("Error in computePairingsForRecipe:", error);
    throw error;
  }
}

/**
 * Score recipe-wine pairing based on flavor profiles.
 * Returns 0-100.
 */
function calcScore(recipe, wine) {
  try {
    // Convert text levels to numeric (1-3)
    const recipeAcidity = recipe.acidity || 5;
    const recipeSpice = recipe.spice || 0;
    const recipeFatness = recipe.fatness || 5;
    const recipeUmami = recipe.umami || 4;

    const wineAcidity = levelToNum(wine.acidity || "medium");
    const wineBody = levelToNum(wine.body || "medium");
    const wineSweetness =
      wine.sweetness === "Off-Dry" || wine.sweetness === "off-dry" ? 1 : 0;
    const wineTannin = levelToNum(wine.tannin || "medium");

    // Acidity-to-fat balance (high acid + high fat = good)
    const acidityScore = 100 - Math.abs(recipeAcidity - wineAcidity * 3.33) * 2;

    // Body alignment (similar intensity = harmonious)
    const bodyScore = 100 - Math.abs(recipeFatness - wineBody * 3.33) * 1.5;

    // Spice & sweetness interaction (spicy + sweet = good)
    const spiceScore =
      recipeSpice > 6 && wineSweetness ? 20 : recipeSpice > 6 ? -10 : 0;

    // Umami & tannin interaction (umami + low tannin = elegant)
    const umamiBridge = recipeUmami > 6 && wineTannin < 2.5 ? 15 : 0;

    // Weighted average
    const totalScore =
      acidityScore * 0.35 + bodyScore * 0.3 + (spiceScore + umamiBridge) * 0.35;

    return Math.max(0, Math.min(100, totalScore));
  } catch (error) {
    console.error("Error in calcScore:", error);
    return 0;
  }
}

/**
 * Convert text level (Low/Medium/High) to numeric scale.
 */
function levelToNum(level) {
  const map = {
    low: 1,
    medium: 2,
    high: 3,
  };
  return map[String(level).toLowerCase()] || 2;
}

/**
 * Generate AI-powered rationale for pairing using OpenAI.
 */
async function getAIRationale(recipe, wine) {
  try {
    const prompt = `You are EchoAI³, a Master Sommelier with Michelin-level expertise.

Dish: ${recipe.name} (cuisine: ${recipe.cuisine || "modern"}, sauce: ${recipe.sauce || "n/a"})
Wine: ${wine.name} (${wine.region}, ${wine.vintage}, ${wine.varietals?.join(", ") || "blend"})

Explain in 2-3 sentences why this wine pairs exceptionally with this dish. Focus on:
1. Acidity balance with any fatty/rich components
2. Tannin/body harmony
3. Aromatic bridges or flavor resonance

Be concise and sommelier-professional.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating AI rationale:", error);
    return `This ${wine.name} pairs well with ${recipe.name} through balanced acidity and complementary aromatic profiles.`;
  }
}

/**
 * Bulk compute pairings for all recipes in database.
 */
export async function computeAllPairings() {
  try {
    const { rows: recipes } = await db.query("SELECT id FROM recipes");
    const allResults = [];

    for (const recipe of recipes) {
      const results = await computePairingsForRecipe(recipe.id);
      allResults.push(...results);
    }

    return allResults;
  } catch (error) {
    console.error("Error in computeAllPairings:", error);
    throw error;
  }
}
