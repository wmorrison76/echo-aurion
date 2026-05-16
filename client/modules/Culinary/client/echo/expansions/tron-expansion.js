/**
 * EchoAi³ TRON Expansion
 * ----------------------
 * Non-visual stub that describes how the TRON-style mapping would work.
 * Actual rendering should be implemented in the frontend (React / Canvas).
 */

export function enableTronExpansions() {
  if (typeof window === "undefined") return;

  // Simple global flag for now; your renderer can read this.
  window.__ECHO_TRON_ENABLED__ = true;

  console.log(
    "%cEchoAi³ TRON Expansion active.",
    "background:#0ff;color:#000;padding:2px 4px;border-radius:4px;"
  );
}

/**
 * Build a simple graph snapshot for visualization.
 */
export function buildTronGraphFromModules(moduleGraphSnapshot) {
  // The renderer can translate this into nodes / edges with glowing lines.
  return {
    nodes: Object.keys(moduleGraphSnapshot).map((id) => ({ id })),
    edges: Object.entries(moduleGraphSnapshot).flatMap(([from, tos]) =>
      tos.map((to) => ({ from, to }))
    ),
  };
}

/**
 * R&D-specific: Build a culinary knowledge graph for visualization
 */
export function buildCulinaryKnowledgeGraph(culinaryData = {}) {
  const nodes = [];
  const edges = [];

  // Ingredient nodes
  if (culinaryData.ingredients) {
    Object.entries(culinaryData.ingredients).forEach(([name, props]) => {
      nodes.push({
        id: `ingredient-${name}`,
        type: "ingredient",
        label: name,
        properties: props,
      });
    });
  }

  // Technique nodes
  if (culinaryData.techniques) {
    Object.keys(culinaryData.techniques).forEach((technique) => {
      nodes.push({
        id: `technique-${technique}`,
        type: "technique",
        label: technique,
      });
    });
  }

  // Allergen nodes
  if (culinaryData.allergens) {
    Object.keys(culinaryData.allergens).forEach((allergen) => {
      nodes.push({
        id: `allergen-${allergen}`,
        type: "allergen",
        label: allergen,
      });
    });
  }

  // Edges: ingredient → technique, ingredient → allergen
  if (culinaryData.ingredients && culinaryData.techniques) {
    Object.entries(culinaryData.ingredients).forEach(([ingredient, props]) => {
      if (props.techniques) {
        props.techniques.forEach((technique) => {
          edges.push({
            from: `ingredient-${ingredient}`,
            to: `technique-${technique}`,
            relationship: "used-in",
          });
        });
      }
    });
  }

  return {
    nodes,
    edges,
    timestamp: new Date().toISOString(),
    title: "Culinary Knowledge Graph (TRON)",
  };
}
