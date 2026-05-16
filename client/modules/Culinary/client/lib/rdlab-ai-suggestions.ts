import type { LabExperiment } from "@/stores/rdLabStore";
import {
  extractRDLabInsights,
  extractTechniquesFromInstructions,
} from "./rdlab-insights";
import {
  suggestTextureImprovements,
  getTexturePairings,
  getTexturesForFlavor,
} from "./rdlab-texture-reference";

export interface AISuggestion {
  id: string;
  type:
    | "texture"
    | "technique"
    | "parameter"
    | "flavor"
    | "measurement"
    | "risk";
  content: string;
  reasoning: string;
  confidence: number; // 0-1
  actionable: boolean;
}

/**
 * Generate AI suggestions for the current experiment based on history
 */
export function generateAISuggestionsForExperiment(
  currentExperiment: LabExperiment,
  allExperiments: LabExperiment[]
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const insights = extractRDLabInsights(allExperiments);

  // Texture pairing suggestions
  if (currentExperiment.textureObjectives.length > 0) {
    const textureSuggestions = suggestTextureImprovements(
      currentExperiment.textureObjectives,
      currentExperiment.flavorConstellations
    );

    textureSuggestions.forEach((ts, idx) => {
      suggestions.push({
        id: `texture-${idx}`,
        type: "texture",
        content: ts.suggestion,
        reasoning: ts.reason,
        confidence: 0.8,
        actionable: true,
      });
    });
  }

  // Parameter combination suggestions
  if (
    insights.parameterCombinations.length > 0 &&
    currentExperiment.variablesUnderTest.length > 0
  ) {
    const successful = insights.parameterCombinations
      .filter((c) => c.successRate > 0.75)
      .slice(0, 2);

    successful.forEach((combo, idx) => {
      if (
        combo.parameters.some((p) =>
          currentExperiment.variablesUnderTest.some(
            (v) =>
              v.toLowerCase().includes(p.toLowerCase()) ||
              p.toLowerCase().includes(v.split(" ")[0].toLowerCase())
          )
        )
      ) {
        suggestions.push({
          id: `param-${idx}`,
          type: "parameter",
          content: `Based on similar successful experiments, try combining: ${combo.parameters.slice(0, 2).join(", ")}`,
          reasoning: `${combo.frequency} successful experiments used this parameter combination`,
          confidence: 0.75,
          actionable: true,
        });
      }
    });
  }

  // Technique suggestions
  if (insights.molecularGastronomy.length > 0) {
    const topTechniques = insights.molecularGastronomy
      .filter((t) => t.successRate > 0.7)
      .slice(0, 2);

    topTechniques.forEach((tech, idx) => {
      const alreadyUsing = extractTechniquesFromInstructions(
        currentExperiment.testPlan.join(" ")
      ).some((t) => t.includes(tech.technique.toLowerCase().split(" ")[0]));

      if (!alreadyUsing) {
        suggestions.push({
          id: `tech-${idx}`,
          type: "technique",
          content: `Consider ${tech.technique} technique - creates ${tech.relatedTextures.join(", ")} textures`,
          reasoning: `${tech.technique} has ${(tech.successRate * 100).toFixed(0)}% success rate in your lab`,
          confidence: 0.7,
          actionable: true,
        });
      }
    });
  }

  // Measurement suggestions
  if (insights.scientificMeasurements.length > 0 && currentExperiment.sensoryTargets.length < 3) {
    const topMeasurements = insights.scientificMeasurements.slice(0, 2);

    topMeasurements.forEach((meas, idx) => {
      suggestions.push({
        id: `measure-${idx}`,
        type: "measurement",
        content: `Track ${meas.measurementType} (${meas.unit}) - typical range: ${meas.range.min.toFixed(1)}-${meas.range.max.toFixed(1)}`,
        reasoning: `${meas.frequency} experiments track this metric for scientific rigor`,
        confidence: 0.65,
        actionable: true,
      });
    });
  }

  // Risk/Challenge suggestions based on failure patterns
  if (insights.failurePatterns.length > 0) {
    const risks = insights.failurePatterns
      .filter((fp) => fp.frequency > 1)
      .slice(0, 2);

    risks.forEach((risk, idx) => {
      suggestions.push({
        id: `risk-${idx}`,
        type: "risk",
        content: `Watch out: ${risk.issue} has occurred in ${risk.frequency} experiments. ${risk.workaround || "Review handling procedures"}`,
        reasoning: "Common failure pattern from past experiments",
        confidence: 0.8,
        actionable: true,
      });
    });
  }

  // Flavor pairing suggestions
  if (currentExperiment.flavorConstellations.length > 0) {
    const flavorTargets = currentExperiment.flavorConstellations.slice(0, 2);

    flavorTargets.forEach((flavor, idx) => {
      const affinities = getTexturesForFlavor(flavor.toLowerCase());

      if (affinities.length > 0) {
        suggestions.push({
          id: `flavor-${idx}`,
          type: "flavor",
          content: `To enhance "${flavor}" flavor, use ${affinities.join(" or ")} textures`,
          reasoning: `Flavor science: ${flavor} pairs best with ${affinities[0]} texture`,
          confidence: 0.7,
          actionable: true,
        });
      }
    });
  }

  // Success pattern encouragement
  if (
    insights.successPatterns.length > 0 &&
    currentExperiment.status === "testing"
  ) {
    const successPattern = insights.successPatterns[0];
    if (
      successPattern.experiments.length > 2 &&
      successPattern.avgSuccessRate > 0.75
    ) {
      suggestions.push({
        id: "success-pattern",
        type: "parameter",
        content: `You're using "${successPattern.pattern}" - this approach has worked well before (${(successPattern.avgSuccessRate * 100).toFixed(0)}% success)`,
        reasoning: "Pattern recognition from successful experiments",
        confidence: 0.85,
        actionable: false,
      });
    }
  }

  // Sort by confidence and actionability
  return suggestions
    .sort(
      (a, b) =>
        (b.actionable ? 1 : 0) - (a.actionable ? 1 : 0) ||
        b.confidence - a.confidence
    )
    .slice(0, 6);
}

/**
 * Generate a single AI insight string for the whiteboard
 */
export function generateWhiteboardAIInsight(
  currentExperiment: LabExperiment,
  allExperiments: LabExperiment[]
): string | null {
  const suggestions = generateAISuggestionsForExperiment(
    currentExperiment,
    allExperiments
  );

  if (suggestions.length === 0) return null;

  const suggestion = suggestions[0];
  return `[AI Insight] ${suggestion.content}`;
}

/**
 * Get contextual AI hint based on experiment state
 */
export function getContextualAIHint(
  currentExperiment: LabExperiment,
  allExperiments: LabExperiment[],
  context: "hypothesis" | "parameters" | "textures" | "flavors" | "notes"
): string {
  const insights = extractRDLabInsights(allExperiments);

  switch (context) {
    case "hypothesis":
      if (insights.innovationPatterns.length > 0) {
        const innovation = insights.innovationPatterns[0];
        return `Consider how to test: ${innovation.innovation}`;
      }
      return "What are you trying to prove?";

    case "parameters":
      if (insights.parameterCombinations.length > 0) {
        const combo = insights.parameterCombinations[0];
        return `Successful parameters: ${combo.parameters[0] || "temperature control"}`;
      }
      return "What variables will you test?";

    case "textures":
      if (currentExperiment.textureObjectives.length > 0) {
        const texture = currentExperiment.textureObjectives[0];
        const pairings = getTexturePairings(texture);
        return `${texture} pairs well with: ${pairings.slice(0, 2).join(", ")}`;
      }
      return "What texture are you targeting?";

    case "flavors":
      if (currentExperiment.flavorConstellations.length > 0) {
        const flavor = currentExperiment.flavorConstellations[0];
        return `Flavor notes: ${flavor}`;
      }
      return "Describe the flavor profile";

    case "notes":
      if (insights.failurePatterns.length > 0) {
        const failure = insights.failurePatterns[0];
        return `Be aware: ${failure.issue} - ${failure.workaround}`;
      }
      return "Document your observations";

    default:
      return "Keep detailed notes for AI learning";
  }
}

/**
 * Generate success prediction based on similar experiments
 */
export function predictSuccessLikelihood(
  experiment: LabExperiment,
  allExperiments: LabExperiment[]
): { likelihood: number; reasoning: string[] } {
  const insights = extractRDLabInsights(allExperiments);
  const reasoning: string[] = [];
  let score = 0.5; // baseline

  // Check parameter match with successful experiments
  if (insights.parameterCombinations.length > 0) {
    const matches = insights.parameterCombinations.filter((combo) =>
      combo.parameters.some((p) =>
        experiment.variablesUnderTest.some((v) =>
          v.toLowerCase().includes(p.toLowerCase())
        )
      )
    );

    if (matches.length > 0) {
      const avgSuccessRate =
        matches.reduce((a, b) => a + b.successRate, 0) / matches.length;
      score = (score + avgSuccessRate) / 2;
      reasoning.push(
        `Similar parameter combinations succeeded ${(avgSuccessRate * 100).toFixed(0)}% of the time`
      );
    }
  }

  // Check technique success
  if (insights.molecularGastronomy.length > 0) {
    const techniques = extractTechniquesFromInstructions(
      experiment.testPlan.join(" ")
    );
    const matchingTechs = insights.molecularGastronomy.filter((t) =>
      techniques.some((tech) =>
        t.technique.toLowerCase().includes(tech.toLowerCase())
      )
    );

    if (matchingTechs.length > 0) {
      const avgTechSuccess =
        matchingTechs.reduce((a, b) => a + b.successRate, 0) /
        matchingTechs.length;
      score = (score + avgTechSuccess) / 2;
      reasoning.push(
        `Your technique choices have ${(avgTechSuccess * 100).toFixed(0)}% historical success`
      );
    }
  }

  // Avoid known failure patterns
  if (insights.failurePatterns.length > 0 && experiment.notes) {
    const riskCount = insights.failurePatterns.filter((fp) =>
      experiment.notes.toLowerCase().includes(fp.issue.toLowerCase())
    ).length;

    if (riskCount > 0) {
      score -= riskCount * 0.1;
      reasoning.push(`${riskCount} known risks detected - mitigate carefully`);
    }
  }

  // Ensure score is between 0 and 1
  score = Math.max(0, Math.min(1, score));

  return {
    likelihood: score,
    reasoning,
  };
}
