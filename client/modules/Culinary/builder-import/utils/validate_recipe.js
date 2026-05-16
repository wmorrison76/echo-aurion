export function validateRecipe(r) {
  const errors = [];

  if (!r.title || typeof r.title !== "string" || r.title.trim().length === 0) {
    errors.push("Missing or invalid title");
  }

  if (r.title && r.title.length > 500) {
    errors.push("Title too long (max 500 chars)");
  }

  if (!Array.isArray(r.ingredients)) {
    errors.push("Ingredients must be array");
  }

  if (!Array.isArray(r.steps)) {
    errors.push("Steps must be array");
  }

  if (r.ingredients && r.ingredients.length === 0) {
    errors.push("Recipe must have at least one ingredient");
  }

  if (r.steps && r.steps.length === 0) {
    errors.push("Recipe must have at least one step");
  }

  if (r.ingredients && r.ingredients.some((i) => typeof i !== "string")) {
    errors.push("All ingredients must be strings");
  }

  if (r.steps && r.steps.some((s) => typeof s !== "string")) {
    errors.push("All steps must be strings");
  }

  return errors;
}
