import type { RequestHandler } from "express";

interface MenuFeasibilityRequest {
  menuItem: string;
  inventory?: Record<string, number>; // ingredient -> quantity
  staffCount?: number;
  staffSkills?: string[];
  demandForecast?: number;
  recipeIngredients?: Record<string, number>;
}

interface FeasibilityResult {
  canMake: boolean;
  feasibility: number; // 0-100
  constraints: Array<{
    type: "inventory" | "staff" | "equipment" | "demand";
    severity: "blocker" | "warning" | "info";
    message: string;
  }>;
  recommendations: string[];
  estimatedCost: number;
  expectedDemand: number;
}

async function analyzeMenuItemFeasibility(
  menuItem: string,
  inventory: Record<string, number>,
  staffCount: number,
  staffSkills: string[],
  demandForecast: number,
  recipeIngredients: Record<string, number>,
  apiKey: string,
  model: string
): Promise<FeasibilityResult> {
  try {
    // Build a detailed prompt for AI analysis
    const inventoryStr = Object.entries(inventory)
      .map(([item, qty]) => `${item}: ${qty} units`)
      .join(", ");

    const ingredientsStr = Object.entries(recipeIngredients)
      .map(([item, qty]) => `${item}: ${qty} units`)
      .join(", ");

    const prompt = `You are a restaurant operations expert analyzing menu feasibility. Analyze if we can make "${menuItem}" given these constraints:

RECIPE REQUIREMENTS:
Ingredients: ${ingredientsStr}

CURRENT INVENTORY:
${inventoryStr}

STAFFING:
- Available staff: ${staffCount} people
- Skills: ${staffSkills.join(", ")}

DEMAND FORECAST:
- Expected covers: ${demandForecast}

Provide a JSON response with:
{
  "canMake": boolean,
  "feasibility": number (0-100),
  "inventoryConstraints": string[],
  "staffConstraints": string[],
  "equipmentConstraints": string[],
  "demandConstraints": string[],
  "recommendations": string[],
  "estimatedCost": number,
  "expectedDemand": number
}

Be specific about:
1. Which ingredients are short/sufficient
2. If staffing is adequate
3. Equipment needs
4. Demand vs. capacity
5. Cost per cover and profitability`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a restaurant operations and menu planning expert. Provide feasibility analysis in JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "{}";

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Build constraint objects
    const constraints = [];

    // Inventory constraints
    if (analysis.inventoryConstraints) {
      analysis.inventoryConstraints.forEach((msg: string) => {
        constraints.push({
          type: "inventory" as const,
          severity: msg.toLowerCase().includes("short") ? ("blocker" as const) : ("info" as const),
          message: msg,
        });
      });
    }

    // Staff constraints
    if (analysis.staffConstraints) {
      analysis.staffConstraints.forEach((msg: string) => {
        constraints.push({
          type: "staff" as const,
          severity: msg.toLowerCase().includes("insufficient") ? ("warning" as const) : ("info" as const),
          message: msg,
        });
      });
    }

    // Equipment constraints
    if (analysis.equipmentConstraints) {
      analysis.equipmentConstraints.forEach((msg: string) => {
        constraints.push({
          type: "equipment" as const,
          severity: "info" as const,
          message: msg,
        });
      });
    }

    // Demand constraints
    if (analysis.demandConstraints) {
      analysis.demandConstraints.forEach((msg: string) => {
        constraints.push({
          type: "demand" as const,
          severity: "info" as const,
          message: msg,
        });
      });
    }

    return {
      canMake: analysis.canMake ?? false,
      feasibility: Math.max(0, Math.min(100, analysis.feasibility ?? 50)),
      constraints,
      recommendations: analysis.recommendations ?? [],
      estimatedCost: analysis.estimatedCost ?? 0,
      expectedDemand: analysis.expectedDemand ?? demandForecast,
    };
  } catch (error) {
    console.error("Error analyzing menu feasibility:", error);
    // Return fallback analysis
    return generateFallbackAnalysis(
      menuItem,
      inventory,
      staffCount,
      demandForecast,
      recipeIngredients
    );
  }
}

function generateFallbackAnalysis(
  menuItem: string,
  inventory: Record<string, number>,
  staffCount: number,
  demandForecast: number,
  recipeIngredients: Record<string, number>
): FeasibilityResult {
  const constraints = [];
  let feasibilityScore = 85;

  // Check inventory constraints
  const missingIngredients: string[] = [];
  for (const [ingredient, required] of Object.entries(recipeIngredients)) {
    const available = inventory[ingredient] || 0;
    if (available < required) {
      missingIngredients.push(ingredient);
      feasibilityScore -= 15;
    }
  }

  if (missingIngredients.length > 0) {
    constraints.push({
      type: "inventory",
      severity: "blocker",
      message: `Missing/insufficient ingredients: ${missingIngredients.join(", ")}`,
    });
  }

  // Check staff constraints
  if (staffCount < 2) {
    constraints.push({
      type: "staff",
      severity: "warning",
      message: "Minimum 2 staff members recommended for cooking and plating",
    });
    feasibilityScore -= 10;
  }

  // Check demand
  if (demandForecast > 30 && staffCount < 4) {
    constraints.push({
      type: "staff",
      severity: "warning",
      message: `High demand (${demandForecast} covers) but only ${staffCount} staff available`,
    });
    feasibilityScore -= 10;
  }

  const recommendations = [];
  if (missingIngredients.length > 0) {
    recommendations.push(
      `Reorder ${missingIngredients[0]} before service`
    );
  }
  if (demandForecast > 20) {
    recommendations.push(
      `Prepare mise en place 30 minutes early for high-volume service`
    );
  }
  recommendations.push(`Brief staff on order of execution for ${menuItem}`);

  return {
    canMake: feasibilityScore >= 60,
    feasibility: Math.max(0, feasibilityScore),
    constraints,
    recommendations,
    estimatedCost: 18.5,
    expectedDemand: demandForecast,
  };
}

const analyzeFeasibilityHandler: RequestHandler = async (req, res) => {
  try {
    const {
      menuItem,
      inventory = {},
      staffCount = 2,
      staffSkills = ["general cooking"],
      demandForecast = 10,
      recipeIngredients = {},
    } = req.body as MenuFeasibilityRequest;

    if (!menuItem) {
      return res.status(400).json({
        error: "menuItem is required",
      });
    }

    const apiKey =
      process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const model = process.env.ECHO_OPENAI_MODEL || "gpt-3.5-turbo";

    let result: FeasibilityResult;

    if (apiKey) {
      result = await analyzeMenuItemFeasibility(
        menuItem,
        inventory,
        staffCount,
        staffSkills,
        demandForecast,
        recipeIngredients,
        apiKey,
        model
      );
    } else {
      result = generateFallbackAnalysis(
        menuItem,
        inventory,
        staffCount,
        demandForecast,
        recipeIngredients
      );
    }

    res.json(result);
  } catch (error) {
    console.error("Menu feasibility analysis error:", error);

    const { menuItem, inventory = {}, staffCount = 2, demandForecast = 10, recipeIngredients = {} } = req.body as MenuFeasibilityRequest;

    const fallbackResult = generateFallbackAnalysis(
      menuItem,
      inventory,
      staffCount,
      demandForecast,
      recipeIngredients
    );

    res.status(200).json({
      ...fallbackResult,
      fallback: true,
    });
  }
};

export default analyzeFeasibilityHandler;
