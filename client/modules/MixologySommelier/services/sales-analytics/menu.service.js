import db from "./db-client.js";

/**
 * Sync menu updates from POS → recipes + pairings
 * @param {array} menu - Array of menu items
 * @returns {object} sync result
 */
export async function syncMenuItems(menu) {
  try {
    if (!Array.isArray(menu) || menu.length === 0) {
      return { status: "no items", count: 0 };
    }

    let synced = 0;
    const errors = [];

    for (const item of menu) {
      try {
        await db.query(
          `INSERT INTO recipes (id, name, cuisine, intensity, acidity, sweetness, fatness, umami, spice, sauce)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               cuisine = EXCLUDED.cuisine,
               intensity = EXCLUDED.intensity,
               acidity = EXCLUDED.acidity,
               sweetness = EXCLUDED.sweetness,
               fatness = EXCLUDED.fatness,
               umami = EXCLUDED.umami,
               spice = EXCLUDED.spice,
               sauce = EXCLUDED.sauce`,
          [
            item.id,
            item.name,
            item.cuisine || null,
            item.intensity || 5,
            item.acidity || 5,
            item.sweetness || 0,
            item.fatness || 5,
            item.umami || 5,
            item.spice || 2,
            item.sauce || null,
          ],
        );
        synced++;
      } catch (error) {
        console.error(`Error syncing menu item ${item.id}:`, error);
        errors.push({ item: item.id, error: error.message });
      }
    }

    return {
      status: "menu synced",
      count: synced,
      total: menu.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error in syncMenuItems:", error);
    throw error;
  }
}

/**
 * Get all recipes (synced menu items)
 * @returns {array} recipes
 */
export async function getRecipes() {
  try {
    const result = await db.query("SELECT * FROM recipes ORDER BY name");
    return result.rows || [];
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }
}

/**
 * Get single recipe by ID
 * @param {string} id - Recipe ID
 * @returns {object} recipe
 */
export async function getRecipeById(id) {
  try {
    const result = await db.query("SELECT * FROM recipes WHERE id = $1", [id]);
    return result.rows?.[0] || null;
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return null;
  }
}

/**
 * Update recipe (manual override)
 * @param {string} id - Recipe ID
 * @param {object} updates - Fields to update
 * @returns {object} result
 */
export async function updateRecipe(id, updates) {
  try {
    const {
      name,
      cuisine,
      intensity,
      acidity,
      sweetness,
      fatness,
      umami,
      spice,
      sauce,
    } = updates;

    await db.query(
      `UPDATE recipes 
       SET name = COALESCE($1, name),
           cuisine = COALESCE($2, cuisine),
           intensity = COALESCE($3, intensity),
           acidity = COALESCE($4, acidity),
           sweetness = COALESCE($5, sweetness),
           fatness = COALESCE($6, fatness),
           umami = COALESCE($7, umami),
           spice = COALESCE($8, spice),
           sauce = COALESCE($9, sauce)
       WHERE id = $10`,
      [
        name,
        cuisine,
        intensity,
        acidity,
        sweetness,
        fatness,
        umami,
        spice,
        sauce,
        id,
      ],
    );

    return { status: "updated", recipe_id: id };
  } catch (error) {
    console.error("Error updating recipe:", error);
    throw error;
  }
}
