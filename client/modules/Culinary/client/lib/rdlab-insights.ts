import type { LabExperiment } from "@/stores/rdLabStore";
import { getTexturesForTechnique, getTexturesForFlavor } from "./rdlab-texture-reference";

/**
 * AI-extracted insights from R&D experiments
 */
export interface RDLabInsights {
  successPatterns: SuccessPattern[];
  failurePatterns: FailurePattern[];
  parameterCombinations: ParameterCombination[];
  molecularGastronomy: MolecularTechnique[];
  textureInsights: TextureInsight[];
  innovationPatterns: InnovationPattern[];
  scientificMeasurements: ScientificMeasurement[];
  teamRecommendations: string[];
  trendingTechniques: TrendingTechnique[];
}

export interface SuccessPattern {
  pattern: string;
  frequency: number;
  avgSuccessRate: number;
  experiments: string[];
  description: string;
}

export interface FailurePattern {
  issue: string;
  frequency: number;
  cause?: string;
  workaround?: string;
  affectedExperiments: string[];
}

export interface ParameterCombination {
  parameters: string[];
  frequency: number;
  successRate: number;
  textures: string[];
  technique?: string;
}

export interface MolecularTechnique {
  technique: string;
  usage: number;
  successRate: number;
  relatedTextures: string[];
  experimentExamples: string[];
  scienceNotes?: string;
}

export interface TextureInsight {
  texture: string;
  frequency: number;
  bestPairs: string[];
  successRate: number;
  techniques: string[];
  recommendations: string[];
}

export interface InnovationPattern {
  innovation: string;
  category: "ingredient" | "technique" | "combination" | "presentation";
  noveltyScore: number;
  successRate: number;
  potentialApplications: string[];
}

export interface ScientificMeasurement {
  measurementType: string;
  unit: string;
  avgValue: number;
  range: { min: number; max: number };
  frequency: number;
}

export interface TrendingTechnique {
  technique: string;
  recentExperiments: number;
  trend: "rising" | "stable" | "declining";
  successRate: number;
}

/**
 * Extract comprehensive insights from experiments
 */
export function extractRDLabInsights(
  experiments: LabExperiment[]
): RDLabInsights {
  const readyExperiments = experiments.filter(
    (e) => e.status === "ready" || e.status === "testing"
  );
  const testedExperiments = experiments.filter((e) => e.status !== "ideation");

  return {
    successPatterns: extractSuccessPatterns(readyExperiments, testedExperiments),
    failurePatterns: extractFailurePatterns(testedExperiments),
    parameterCombinations: extractParameterCombinations(readyExperiments),
    molecularGastronomy: extractMolecularTechniques(experiments),
    textureInsights: extractTextureInsights(experiments),
    innovationPatterns: extractInnovationPatterns(experiments),
    scientificMeasurements: extractScientificMeasurements(experiments),
    teamRecommendations: generateTeamRecommendations(
      readyExperiments,
      testedExperiments
    ),
    trendingTechniques: extractTrendingTechniques(experiments),
  };
}

/**
 * Extract patterns from successful experiments
 */
function extractSuccessPatterns(
  successExps: LabExperiment[],
  allTestedExps: LabExperiment[]
): SuccessPattern[] {
  const patterns = new Map<string, SuccessPattern>();

  successExps.forEach((exp) => {
    // Variables under test patterns
    exp.variablesUnderTest.forEach((variable) => {
      const key = `variable:${variable}`;
      const existing = patterns.get(key);
      const matchingExps = allTestedExps.filter((e) =>
        e.variablesUnderTest.some((v) =>
          v.toLowerCase().includes(variable.toLowerCase())
        )
      );
      const successCount = matchingExps.filter((e) => e.status === "ready").length;
      const successRate = matchingExps.length > 0 ? successCount / matchingExps.length : 0;

      if (existing) {
        existing.frequency += 1;
        existing.avgSuccessRate =
          (existing.avgSuccessRate * (existing.frequency - 1) + successRate) /
          existing.frequency;
      } else {
        patterns.set(key, {
          pattern: variable,
          frequency: 1,
          avgSuccessRate: successRate,
          experiments: [exp.id],
          description: `Testing "${variable}" consistently leads to successful outcomes`,
        });
      }
    });

    // Texture objectives patterns
    exp.textureObjectives.forEach((texture) => {
      const key = `texture:${texture}`;
      const existing = patterns.get(key);

      if (existing) {
        existing.frequency += 1;
        existing.experiments.push(exp.id);
      } else {
        patterns.set(key, {
          pattern: texture,
          frequency: 1,
          avgSuccessRate: 0.8,
          experiments: [exp.id],
          description: `Texture objective "${texture}" achieved in successful experiments`,
        });
      }
    });

    // Technique patterns from test plan
    extractTechniquesFromInstructions(exp.testPlan.join(" ")).forEach(
      (technique) => {
        const key = `technique:${technique}`;
        const existing = patterns.get(key);

        if (existing) {
          existing.frequency += 1;
        } else {
          patterns.set(key, {
            pattern: technique,
            frequency: 1,
            avgSuccessRate: 0.75,
            experiments: [exp.id],
            description: `${technique} technique contributes to successful outcomes`,
          });
        }
      }
    );
  });

  return Array.from(patterns.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}

/**
 * Extract patterns from failures/challenges
 */
function extractFailurePatterns(
  testedExps: LabExperiment[]
): FailurePattern[] {
  const patterns = new Map<string, FailurePattern>();

  testedExps.forEach((exp) => {
    const notesLower = exp.notes.toLowerCase();

    // Look for common problem indicators
    const problemKeywords = [
      "syneresis",
      "separation",
      "weeping",
      "breaking",
      "curdling",
      "seizing",
      "overcooked",
      "undercooked",
      "collapse",
      "shrinking",
      "browning",
      "burning",
      "bitterness",
      "grittiness",
      "crystallize",
      "oxidation",
      "contamination",
    ];

    problemKeywords.forEach((keyword) => {
      if (notesLower.includes(keyword)) {
        const existing = patterns.get(keyword);
        if (existing) {
          existing.frequency += 1;
          existing.affectedExperiments.push(exp.id);
        } else {
          patterns.set(keyword, {
            issue: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            frequency: 1,
            cause: "Related to handling, temperature, or technique",
            workaround: "Review test plan timing and environmental controls",
            affectedExperiments: [exp.id],
          });
        }
      }
    });
  });

  return Array.from(patterns.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

/**
 * Extract successful parameter combinations
 */
function extractParameterCombinations(
  successExps: LabExperiment[]
): ParameterCombination[] {
  const combinations: ParameterCombination[] = [];

  successExps.forEach((exp) => {
    const params = exp.variablesUnderTest.slice(0, 3);
    const textures = exp.textureObjectives;
    const techniques = extractTechniquesFromInstructions(
      exp.testPlan.join(" ")
    );

    combinations.push({
      parameters: params,
      frequency: 1,
      successRate: 0.85,
      textures,
      technique: techniques[0],
    });
  });

  // Merge similar combinations
  const merged = new Map<string, ParameterCombination>();
  combinations.forEach((combo) => {
    const key = combo.parameters.sort().join("|");
    const existing = merged.get(key);

    if (existing) {
      existing.frequency += 1;
      existing.successRate =
        (existing.successRate * (existing.frequency - 1) + combo.successRate) /
        existing.frequency;
    } else {
      merged.set(key, combo);
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8);
}

/**
 * Extract molecular gastronomy techniques
 */
function extractMolecularTechniques(
  experiments: LabExperiment[]
): MolecularTechnique[] {
  const techniques = new Map<string, MolecularTechnique>();
  const mgTechniques = [
    "emulsification",
    "spherification",
    "gelification",
    "foaming",
    "fermentation",
    "sous vide",
    "centrifuge",
    "deconstruction",
    "molecular",
    "hydrocolloid",
    "cryogenic",
    "caviar",
    "powder",
    "air",
    "mousse",
    "espuma",
    "koji",
    "miso",
    "clarification",
    "tempering",
  ];

  experiments.forEach((exp) => {
    const text = [
      exp.title,
      ...exp.tags,
      exp.hypothesis,
      ...exp.testPlan,
      ...exp.variablesUnderTest,
      exp.notes,
    ]
      .join(" ")
      .toLowerCase();

    mgTechniques.forEach((tech) => {
      if (text.includes(tech)) {
        const existing = techniques.get(tech);
        const textures = getTexturesForTechnique(tech);

        if (existing) {
          existing.usage += 1;
          existing.successRate =
            exp.status === "ready"
              ? existing.successRate * 0.9 + 0.1
              : existing.successRate * 0.95;
        } else {
          techniques.set(tech, {
            technique: tech.charAt(0).toUpperCase() + tech.slice(1),
            usage: 1,
            successRate: exp.status === "ready" ? 0.8 : 0.5,
            relatedTextures: textures,
            experimentExamples: [exp.id],
          });
        }
      }
    });
  });

  return Array.from(techniques.values())
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 8);
}

/**
 * Extract texture-specific insights
 */
function extractTextureInsights(
  experiments: LabExperiment[]
): TextureInsight[] {
  const insights = new Map<string, TextureInsight>();

  experiments.forEach((exp) => {
    exp.textureObjectives.forEach((texture) => {
      const techniques = extractTechniquesFromInstructions(
        exp.testPlan.join(" ")
      );
      const flavorTargets = exp.flavorConstellations;

      const existing = insights.get(texture);
      if (existing) {
        existing.frequency += 1;
        existing.successRate =
          exp.status === "ready"
            ? existing.successRate * 0.9 + 0.1
            : existing.successRate * 0.95;
      } else {
        insights.set(texture, {
          texture,
          frequency: 1,
          bestPairs: [],
          successRate: exp.status === "ready" ? 0.8 : 0.5,
          techniques,
          recommendations: [
            `Try combining with contrasting textures`,
            `Pair with complementary flavors`,
            `Consider temperature relationships`,
          ],
        });
      }
    });
  });

  return Array.from(insights.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 6);
}

/**
 * Extract innovation patterns
 */
function extractInnovationPatterns(
  experiments: LabExperiment[]
): InnovationPattern[] {
  const patterns: InnovationPattern[] = [];

  experiments
    .filter((e) => e.status === "ready")
    .forEach((exp) => {
      // Innovation from future food angles
      exp.futureFoodAngles.forEach((angle) => {
        patterns.push({
          innovation: angle,
          category: "ingredient",
          noveltyScore: 0.7,
          successRate: 0.8,
          potentialApplications: [
            "Menu integration",
            "Scaling to production",
            "Cross-track application",
          ],
        });
      });

      // Innovation from flavor constellations
      exp.flavorConstellations.forEach((flavor) => {
        patterns.push({
          innovation: flavor,
          category: "combination",
          noveltyScore: 0.6,
          successRate: 0.75,
          potentialApplications: [
            "Seasonal menu opportunity",
            "Private dining event",
          ],
        });
      });
    });

  return patterns.slice(0, 10);
}

/**
 * Extract scientific measurements
 */
function extractScientificMeasurements(
  experiments: LabExperiment[]
): ScientificMeasurement[] {
  const measurements = new Map<string, ScientificMeasurement>();

  experiments.forEach((exp) => {
    const sensoryText = [...exp.sensoryTargets, exp.notes].join(" ");

    // Extract numeric patterns from sensory targets
    const numberMatches = sensoryText.match(/[\d.]+/g);
    const measurementTypes = [
      "rheometer",
      "brix",
      "viscosity",
      "temperature",
      "intensity",
      "wobble",
      "hold",
      "dwell time",
      "inoculation",
      "salinity",
      "pH",
    ];

    measurementTypes.forEach((type) => {
      if (sensoryText.toLowerCase().includes(type)) {
        const existing = measurements.get(type);
        const values = numberMatches?.map(Number) || [];

        if (existing && values.length > 0) {
          existing.frequency += 1;
          existing.avgValue =
            (existing.avgValue * (existing.frequency - 1) +
              values[0]) /
            existing.frequency;
        } else if (!existing && values.length > 0) {
          measurements.set(type, {
            measurementType: type,
            unit: getUnitForMeasurement(type),
            avgValue: values[0],
            range: { min: values[0], max: values[0] },
            frequency: 1,
          });
        }
      }
    });
  });

  return Array.from(measurements.values()).slice(0, 8);
}

/**
 * Extract trending techniques
 */
function extractTrendingTechniques(
  experiments: LabExperiment[]
): TrendingTechnique[] {
  const recent = experiments.slice(-5); // Last 5 experiments
  const allTechniques = new Set<string>();

  experiments.forEach((exp) => {
    extractTechniquesFromInstructions(
      [...exp.testPlan, exp.hypothesis].join(" ")
    ).forEach((t) => allTechniques.add(t));
  });

  const trending: TrendingTechnique[] = [];

  allTechniques.forEach((technique) => {
    const recentCount = recent.filter((e) =>
      [...e.testPlan, e.hypothesis]
        .join(" ")
        .toLowerCase()
        .includes(technique)
    ).length;

    const totalCount = experiments.filter((e) =>
      [...e.testPlan, e.hypothesis]
        .join(" ")
        .toLowerCase()
        .includes(technique)
    ).length;

    if (totalCount > 0) {
      trending.push({
        technique,
        recentExperiments: recentCount,
        trend:
          recentCount > totalCount * 0.3
            ? "rising"
            : recentCount > totalCount * 0.15
              ? "stable"
              : "declining",
        successRate:
          experiments.filter(
            (e) =>
              e.status === "ready" &&
              [...e.testPlan, e.hypothesis]
                .join(" ")
                .toLowerCase()
                .includes(technique)
          ).length / (totalCount + 1),
      });
    }
  });

  return trending
    .sort((a, b) => b.recentExperiments - a.recentExperiments)
    .slice(0, 6);
}

/**
 * Generate team recommendations
 */
function generateTeamRecommendations(
  successExps: LabExperiment[],
  allTestedExps: LabExperiment[]
): string[] {
  const recommendations: string[] = [];

  if (successExps.length > 0) {
    recommendations.push(
      `Focus team efforts on ${successExps[0]?.title || "successful techniques"}`
    );
  }

  const techniques = new Set<string>();
  successExps.forEach((e) => {
    extractTechniquesFromInstructions(e.testPlan.join(" ")).forEach((t) =>
      techniques.add(t)
    );
  });

  if (techniques.size > 0) {
    recommendations.push(
      `Scale ${Array.from(techniques)[0]} technique to production phase`
    );
  }

  const textureGoals = new Set<string>();
  successExps.forEach((e) => {
    e.textureObjectives.forEach((t) => textureGoals.add(t));
  });

  if (textureGoals.size > 0) {
    recommendations.push(
      `Texture expertise in ${Array.from(textureGoals).slice(0, 2).join(" & ")} is strong—leverage for mentoring`
    );
  }

  return recommendations.slice(0, 4);
}

/**
 * Extract techniques from instruction text
 */
export function extractTechniquesFromInstructions(text: string): string[] {
  const techniques = [
    "emulsify",
    "foam",
    "gel",
    "spherify",
    "ferment",
    "sous vide",
    "dehydrate",
    "caramelize",
    "clarify",
    "centrifuge",
    "smoke",
    "pressure cook",
    "mold",
    "tempering",
    "setting",
  ];

  const lowerText = text.toLowerCase();
  return techniques.filter((t) => lowerText.includes(t));
}

/**
 * Get unit for measurement type
 */
function getUnitForMeasurement(measurementType: string): string {
  const units: Record<string, string> = {
    rheometer: "Hz",
    brix: "°Bx",
    viscosity: "cP",
    temperature: "°C",
    intensity: "/10",
    wobble: "Hz",
    hold: "hours",
    "dwell time": "minutes",
    inoculation: "%",
    salinity: "%",
    pH: "pH",
  };

  return units[measurementType] || "units";
}
