/**
 * EchoAi³ CI Guardrails Pack
 * --------------------------
 * Hooks intended for CI / automated checks when you deploy new
 * Builder.io content or Echo-aware modules.
 */

export function runEchoCiChecks(report = {}) {
  const results = [];

  if (!report.modules || !Array.isArray(report.modules)) {
    results.push({
      level: "error",
      code: "NO_MODULES",
      message: "CI report has no modules array.",
    });
  } else {
    if (report.modules.length === 0) {
      results.push({
        level: "warn",
        code: "EMPTY_MODULE_SET",
        message: "No modules were described in the CI report.",
      });
    }
  }

  return {
    ok: !results.some((r) => r.level === "error"),
    results,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * R&D-specific CI checks: Validate knowledge base integrity
 */
export function validateCulinaryKnowledge(knowledge = {}) {
  const results = [];

  // Check for required knowledge sections
  const requiredSections = ["yields", "allergens", "techniques", "ingredients"];
  for (const section of requiredSections) {
    if (!knowledge[section]) {
      results.push({
        level: "warn",
        code: `MISSING_${section.toUpperCase()}`,
        message: `Culinary knowledge missing ${section} data.`,
      });
    }
  }

  // Check for allergen completeness
  if (knowledge.allergens) {
    const allergenCount = Object.keys(knowledge.allergens).length;
    if (allergenCount < 8) {
      results.push({
        level: "warn",
        code: "INCOMPLETE_ALLERGENS",
        message: `Only ${allergenCount} allergens defined. Should include at least 8 major allergens.`,
      });
    }
  }

  // Check for technique coverage
  if (knowledge.techniques) {
    const techniques = Object.keys(knowledge.techniques);
    const requiredTechniques = [
      "hydration",
      "emulsification",
      "spherification",
      "tempering",
      "fermentation",
    ];
    const missing = requiredTechniques.filter(
      (t) => !techniques.some((kt) => kt.toLowerCase().includes(t))
    );
    if (missing.length > 0) {
      results.push({
        level: "warn",
        code: "MISSING_TECHNIQUES",
        message: `Missing critical techniques: ${missing.join(", ")}`,
      });
    }
  }

  return {
    ok: !results.some((r) => r.level === "error"),
    results,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * R&D-specific: Validate experiment configuration before execution
 */
export function validateExperimentConfig(config = {}) {
  const results = [];

  if (!config.experimentId) {
    results.push({
      level: "error",
      code: "NO_EXPERIMENT_ID",
      message: "Experiment must have an ID.",
    });
  }

  if (!config.recipe) {
    results.push({
      level: "error",
      code: "NO_RECIPE",
      message: "Experiment must reference a recipe.",
    });
  }

  if (!config.hypothesis) {
    results.push({
      level: "warn",
      code: "NO_HYPOTHESIS",
      message: "Experiment should have a documented hypothesis.",
    });
  }

  if (config.allergenConstraints && config.allergenConstraints.length === 0) {
    results.push({
      level: "info",
      code: "NO_ALLERGEN_CONSTRAINTS",
      message: "No allergen constraints specified.",
    });
  }

  return {
    ok: !results.some((r) => r.level === "error"),
    results,
    checkedAt: new Date().toISOString(),
  };
}
