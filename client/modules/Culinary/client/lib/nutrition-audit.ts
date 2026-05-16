/**
 * Nutrition Audit Utilities
 * Validate nutritional data accuracy for FDA compliant label printing
 */

export interface NutritionAuditResult {
  isValid: boolean;
  score: number; // 0-100, 100 is perfect
  warnings: NutritionWarning[];
  errors: NutritionError[];
  recommendations: string[];
}

export interface NutritionWarning {
  field: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export interface NutritionError {
  field: string;
  message: string;
}

export interface NutritionData {
  calories?: number;
  fat?: number; // grams
  saturatedFat?: number; // grams
  transFat?: number; // grams
  cholesterol?: number; // mg
  sodium?: number; // mg
  carbs?: number; // grams
  fiber?: number; // grams
  sugars?: number; // grams
  protein?: number; // grams
  vitaminA?: number; // % DV
  vitaminC?: number; // % DV
  calcium?: number; // % DV
  iron?: number; // % DV
  servingSize?: string;
  servingsPerContainer?: number;
}

/**
 * Audit nutritional data for FDA label compliance and accuracy
 */
export function auditNutrition(
  nutrition: Partial<NutritionData>,
  servingSize?: string,
  servingsPerContainer?: number
): NutritionAuditResult {
  const warnings: NutritionWarning[] = [];
  const errors: NutritionError[] = [];
  const recommendations: string[] = [];

  let score = 100;

  // Check for missing essential fields
  const essentialFields = ["calories", "fat", "carbs", "protein", "sodium"];
  const missingFields = essentialFields.filter((field) => nutrition[field as keyof NutritionData] === undefined || nutrition[field as keyof NutritionData] === null);

  if (missingFields.length > 0) {
    errors.push({
      field: "essential_nutrients",
      message: `Missing essential nutritional data: ${missingFields.join(", ")}. These are required for FDA labels.`,
    });
    score -= 30;
  }

  // Validate calorie range
  if (nutrition.calories !== undefined) {
    if (nutrition.calories < 0) {
      errors.push({
        field: "calories",
        message: "Calories cannot be negative",
      });
      score -= 10;
    }
    if (nutrition.calories > 5000) {
      warnings.push({
        field: "calories",
        message: "Unusually high calorie content. Verify this is correct.",
        severity: "medium",
      });
      score -= 5;
    }
  }

  // Validate fat values
  if (nutrition.fat !== undefined && nutrition.fat < 0) {
    errors.push({
      field: "fat",
      message: "Fat content cannot be negative",
    });
    score -= 10;
  }

  // Check saturated + trans fat doesn't exceed total fat
  if (
    nutrition.fat !== undefined &&
    nutrition.saturatedFat !== undefined &&
    nutrition.transFat !== undefined
  ) {
    const saturatedPlusTrans = (nutrition.saturatedFat || 0) + (nutrition.transFat || 0);
    if (saturatedPlusTrans > nutrition.fat) {
      errors.push({
        field: "fat_composition",
        message: "Saturated fat + trans fat cannot exceed total fat content",
      });
      score -= 15;
    }
  }

  // Validate carbs and components
  if (nutrition.carbs !== undefined && nutrition.carbs < 0) {
    errors.push({
      field: "carbs",
      message: "Carbohydrates cannot be negative",
    });
    score -= 10;
  }

  // Check fiber doesn't exceed carbs
  if (nutrition.carbs !== undefined && nutrition.fiber !== undefined) {
    if (nutrition.fiber > nutrition.carbs) {
      errors.push({
        field: "fiber",
        message: "Fiber content cannot exceed total carbohydrates",
      });
      score -= 15;
    }
  }

  // Check sugars doesn't exceed carbs
  if (nutrition.carbs !== undefined && nutrition.sugars !== undefined) {
    if (nutrition.sugars > nutrition.carbs) {
      errors.push({
        field: "sugars",
        message: "Sugar content cannot exceed total carbohydrates",
      });
      score -= 15;
    }
  }

  // Validate protein
  if (nutrition.protein !== undefined && nutrition.protein < 0) {
    errors.push({
      field: "protein",
      message: "Protein cannot be negative",
    });
    score -= 10;
  }

  // Validate sodium
  if (nutrition.sodium !== undefined) {
    if (nutrition.sodium < 0) {
      errors.push({
        field: "sodium",
        message: "Sodium cannot be negative",
      });
      score -= 10;
    }
    if (nutrition.sodium > 10000) {
      warnings.push({
        field: "sodium",
        message: "Very high sodium content. Verify this is correct.",
        severity: "high",
      });
      score -= 10;
    }
  }

  // Validate cholesterol
  if (nutrition.cholesterol !== undefined && nutrition.cholesterol < 0) {
    errors.push({
      field: "cholesterol",
      message: "Cholesterol cannot be negative",
    });
    score -= 10;
  }

  // Check daily value percentages are 0-100
  const dvFields = ["vitaminA", "vitaminC", "calcium", "iron"];
  dvFields.forEach((field) => {
    const value = nutrition[field as keyof NutritionData];
    if (value !== undefined && typeof value === 'number') {
      if (value < 0 || value > 100) {
        warnings.push({
          field,
          message: `${field} percentage should typically be 0-100% daily value`,
          severity: "medium",
        });
        score -= 5;
      }
    }
  });

  // Check serving size and servings are defined
  if (!servingSize || (typeof servingSize === 'string' && servingSize.trim() === "")) {
    errors.push({
      field: "serving_size",
      message: "Serving size must be specified for FDA labels",
    });
    score -= 15;
  }

  if (typeof servingsPerContainer === 'number') {
    if (!servingsPerContainer || servingsPerContainer <= 0) {
      errors.push({
        field: "servings_per_container",
        message: "Servings per container must be a positive number",
      });
      score -= 15;
    }
  } else {
    errors.push({
      field: "servings_per_container",
      message: "Servings per container must be specified",
    });
    score -= 15;
  }

  // Validate macronutrient totals
  if (nutrition.calories !== undefined) {
    const calculatedCalories = calculateCaloriesFromMacros(
      nutrition.fat,
      nutrition.carbs,
      nutrition.protein
    );

    if (calculatedCalories > 0) {
      const difference = Math.abs(nutrition.calories - calculatedCalories);
      const percentDiff = (difference / calculatedCalories) * 100;

      if (percentDiff > 10) {
        warnings.push({
          field: "calorie_macronutrient_mismatch",
          message: `Calculated calories (${calculatedCalories}) differ from stated calories (${nutrition.calories}) by ${percentDiff.toFixed(1)}%. Please verify macronutrient values.`,
          severity: "high",
        });
        score -= 20;
      }
    }
  }

  // Add recommendations based on data quality
  if (score < 80) {
    recommendations.push(
      "Consider using USDA database or nutrition analysis software to verify values"
    );
  }

  if (missingFields.length > 0) {
    recommendations.push(
      "Fill in all essential fields before generating labels"
    );
  }

  if (!servingSize) {
    recommendations.push("Define a standard serving size (e.g., 1 cup, 100g)");
  }

  // Ensure score is between 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    isValid: errors.length === 0,
    score,
    warnings,
    errors,
    recommendations,
  };
}

/**
 * Calculate estimated calories from macronutrients
 * Using standard conversion: fat=9 cal/g, carbs=4 cal/g, protein=4 cal/g
 */
function calculateCaloriesFromMacros(
  fat?: number,
  carbs?: number,
  protein?: number
): number {
  let calories = 0;
  if (fat !== undefined) calories += fat * 9;
  if (carbs !== undefined) calories += carbs * 4;
  if (protein !== undefined) calories += protein * 4;
  return calories;
}

/**
 * Generate FDA-compliant nutrition label text from data
 */
export function generateNutritionLabelText(nutrition: NutritionData): string {
  const lines: string[] = [];

  lines.push("Nutrition Facts");
  if (nutrition.servingSize) {
    lines.push(`Serving Size: ${nutrition.servingSize}`);
  }
  if (nutrition.servingsPerContainer) {
    lines.push(`Servings Per Container: ${nutrition.servingsPerContainer}`);
  }

  lines.push(""); // Blank line
  lines.push(`Calories: ${nutrition.calories || 0}`);
  lines.push("");

  lines.push("% Daily Value*");
  if (nutrition.fat !== undefined) {
    const fdvFat = ((nutrition.fat / 78) * 100).toFixed(0); // 78g is DV for fat
    lines.push(`Total Fat ${nutrition.fat}g - ${fdvFat}%`);
  }
  if (nutrition.saturatedFat !== undefined) {
    const fdvSatFat = ((nutrition.saturatedFat / 20) * 100).toFixed(0); // 20g is DV
    lines.push(`  Saturated Fat ${nutrition.saturatedFat}g - ${fdvSatFat}%`);
  }
  if (nutrition.transFat !== undefined) {
    lines.push(`  Trans Fat ${nutrition.transFat}g`);
  }
  if (nutrition.cholesterol !== undefined) {
    const fdvCholesterol = ((nutrition.cholesterol / 300) * 100).toFixed(0); // 300mg DV
    lines.push(
      `Cholesterol ${nutrition.cholesterol}mg - ${fdvCholesterol}%`
    );
  }
  if (nutrition.sodium !== undefined) {
    const fdvSodium = ((nutrition.sodium / 2300) * 100).toFixed(0); // 2300mg DV
    lines.push(`Sodium ${nutrition.sodium}mg - ${fdvSodium}%`);
  }
  if (nutrition.carbs !== undefined) {
    const fdvCarbs = ((nutrition.carbs / 275) * 100).toFixed(0); // 275g DV
    lines.push(`Total Carbohydrate ${nutrition.carbs}g - ${fdvCarbs}%`);
  }
  if (nutrition.fiber !== undefined) {
    const fdvFiber = ((nutrition.fiber / 28) * 100).toFixed(0); // 28g DV
    lines.push(`  Dietary Fiber ${nutrition.fiber}g - ${fdvFiber}%`);
  }
  if (nutrition.sugars !== undefined) {
    lines.push(`  Sugars ${nutrition.sugars}g`);
  }
  if (nutrition.protein !== undefined) {
    lines.push(`Protein ${nutrition.protein}g`);
  }

  lines.push("");
  lines.push("* Percent Daily Values are based on a 2,000 calorie diet.");

  return lines.join("\n");
}

/**
 * Get audit score as a visual indicator
 */
export function getAuditScoreLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 90) return { label: "Excellent", color: "text-green-600" };
  if (score >= 75) return { label: "Good", color: "text-blue-600" };
  if (score >= 50) return { label: "Fair", color: "text-yellow-600" };
  return { label: "Poor", color: "text-red-600" };
}
