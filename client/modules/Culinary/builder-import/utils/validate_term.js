export function validateTerm(t) {
  const errors = [];

  if (!t.term || typeof t.term !== "string" || t.term.trim().length === 0) {
    errors.push("Missing or invalid term");
  }

  if (
    !t.definition ||
    typeof t.definition !== "string" ||
    t.definition.trim().length === 0
  ) {
    errors.push("Missing or invalid definition");
  }

  if (t.term && t.term.length > 200) {
    errors.push("Term too long (max 200 chars)");
  }

  if (t.definition && t.definition.length > 10000) {
    errors.push("Definition too long (max 10000 chars)");
  }

  if (t.categories && !Array.isArray(t.categories)) {
    errors.push("Categories must be an array");
  }

  if (t.aliases && !Array.isArray(t.aliases)) {
    errors.push("Aliases must be an array");
  }

  return errors;
}
