import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import slugify from "./utils/slugify.js";
import { validateTerm } from "./utils/validate_term.js";
import { validateRecipe } from "./utils/validate_recipe.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILDER_API_KEY = process.env.BUILDER_API_KEY;
const TERMS_MODEL = "echoculinaryterm";
const RECIPES_MODEL = "echorecipe";
const DATA_FILE = path.join(__dirname, "echo_culinary_knowledge.json");

if (!BUILDER_API_KEY) {
  console.error("ERROR: BUILDER_API_KEY environment variable not set");
  console.error("Export it: export BUILDER_API_KEY=your_write_api_key");
  process.exit(1);
}

if (!fs.existsSync(DATA_FILE)) {
  console.error(`ERROR: ${DATA_FILE} not found`);
  console.error("Run the Python scanner first to generate this file");
  process.exit(1);
}

const knowledge = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

async function uploadToBuilder(model, data) {
  const url = `https://builder.io/api/v3/content/${model}?apiKey=${BUILDER_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        published: "published",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `HTTP ${response.status}: ${text}` };
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

async function uploadTerms() {
  console.log(`\n📚 Uploading ${knowledge.terms.length} culinary terms...\n`);

  let successCount = 0;
  let skipCount = 0;

  for (const entry of knowledge.terms) {
    const errors = validateTerm(entry);
    if (errors.length > 0) {
      console.log(`⊘ Skipping term "${entry.term}": ${errors.join(", ")}`);
      skipCount++;
      continue;
    }

    entry.slug = entry.slug || slugify(entry.term);
    entry.updated_at = new Date().toISOString();
    entry.status = entry.status || "auto-imported";

    const result = await uploadToBuilder(TERMS_MODEL, entry);

    if (result.id) {
      console.log(`✔ Term: "${entry.term}"`);
      successCount++;
    } else {
      console.log(`✖ Error uploading "${entry.term}": ${result.error}`);
    }

    // Rate limiting: 150ms between requests
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(
    `\n📊 Terms complete: ${successCount} uploaded, ${skipCount} skipped\n`,
  );
  return { success: successCount, skipped: skipCount };
}

async function uploadRecipes() {
  console.log(`🍳 Uploading ${knowledge.recipes.length} recipes...\n`);

  let successCount = 0;
  let skipCount = 0;

  for (const recipe of knowledge.recipes) {
    const errors = validateRecipe(recipe);
    if (errors.length > 0) {
      console.log(`⊘ Skipping recipe "${recipe.title}": ${errors.join(", ")}`);
      skipCount++;
      continue;
    }

    recipe.slug = recipe.slug || slugify(recipe.title);
    recipe.updated_at = new Date().toISOString();
    recipe.status = recipe.status || "auto-imported";

    const result = await uploadToBuilder(RECIPES_MODEL, recipe);

    if (result.id) {
      console.log(`✔ Recipe: "${recipe.title}"`);
      successCount++;
    } else {
      console.log(`✖ Error uploading "${recipe.title}": ${result.error}`);
    }

    // Rate limiting: 150ms between requests
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(
    `\n📊 Recipes complete: ${successCount} uploaded, ${skipCount} skipped\n`,
  );
  return { success: successCount, skipped: skipCount };
}

async function run() {
  console.log("\n============================================");
  console.log("    Builder.io Culinary Knowledge Import");
  console.log("============================================");

  const termsResult = await uploadTerms();
  const recipesResult = await uploadRecipes();

  console.log("============================================");
  console.log(
    `Total Terms:   ${termsResult.success} ✔ ${termsResult.skipped} ⊘`,
  );
  console.log(
    `Total Recipes: ${recipesResult.success} ✔ ${recipesResult.skipped} ⊘`,
  );
  console.log("============================================");
  console.log(
    "\n✅ Import complete! Your terms and recipes are now in Builder.io",
  );
  console.log("   Echo can now fetch and reason about culinary knowledge.\n");
}

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
