// Waste prevention strategies and AI-powered recommendations

export type WastePreventionStrategy = {
  id: string;
  title: string;
  description: string;
  category: "prep" | "cooking" | "plating" | "storage" | "training";
  potentialSavings: number; // percentage
  difficulty: "easy" | "medium" | "hard";
  implementationTime: number; // days
  resources: string[];
  expectedROI: number; // months to break even
  successRate: number; // 0-1
};

export type WasteAlert = {
  id: string;
  type: "high-waste" | "trend-spike" | "ingredient-at-risk" | "cost-impact";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  suggestedAction: string;
  affectedItem: string;
  metric: number;
  threshold: number;
  timestamp: number;
};

export type WasteInsight = {
  id: string;
  title: string;
  insight: string;
  dataPoints: number;
  confidence: number; // 0-1
  actionItems: string[];
  estimatedImpact: {
    costSavings: number;
    timeRequired: number;
  };
};

/**
 * Waste prevention strategies database
 */
export const WASTE_PREVENTION_STRATEGIES: WastePreventionStrategy[] = [
  {
    id: "strat-01",
    title: "Implement FIFO Inventory System",
    description: "First-In-First-Out system to reduce spoilage",
    category: "storage",
    potentialSavings: 15,
    difficulty: "easy",
    implementationTime: 3,
    resources: ["staff training", "inventory labels"],
    expectedROI: 1,
    successRate: 0.95,
  },
  {
    id: "strat-02",
    title: "Precision Portioning Station",
    description: "Pre-portioned ingredients reduce overpreparation waste",
    category: "prep",
    potentialSavings: 12,
    difficulty: "medium",
    implementationTime: 7,
    resources: ["scales", "portion cups", "labeling system"],
    expectedROI: 2,
    successRate: 0.88,
  },
  {
    id: "strat-03",
    title: "Trim Reduction Technique Training",
    description: "Advanced knife skills to minimize vegetable waste",
    category: "training",
    potentialSavings: 8,
    difficulty: "medium",
    implementationTime: 14,
    resources: ["culinary training course", "practice materials"],
    expectedROI: 3,
    successRate: 0.85,
  },
  {
    id: "strat-04",
    title: "Vegetable Scrap Broth Program",
    description: "Use vegetable scraps to create stock for other dishes",
    category: "cooking",
    potentialSavings: 10,
    difficulty: "easy",
    implementationTime: 5,
    resources: ["storage containers", "recipe development"],
    expectedROI: 1,
    successRate: 0.90,
  },
  {
    id: "strat-05",
    title: "Temperature Control Monitoring",
    description: "Implement sensors to maintain optimal storage conditions",
    category: "storage",
    potentialSavings: 20,
    difficulty: "hard",
    implementationTime: 30,
    resources: ["IoT sensors", "monitoring software", "installation"],
    expectedROI: 6,
    successRate: 0.92,
  },
  {
    id: "strat-06",
    title: "Plate Waste Analytics Program",
    description: "Track and analyze plate waste to identify problem items",
    category: "plating",
    potentialSavings: 7,
    difficulty: "easy",
    implementationTime: 7,
    resources: ["data collection forms", "analysis software"],
    expectedROI: 2,
    successRate: 0.88,
  },
];

/**
 * Generate waste prevention recommendations
 */
export function generateWasteRecommendations(
  currentWastePercent: number,
  wasteByCategory: Record<string, number>,
): WastePreventionStrategy[] {
  const recommendations: WastePreventionStrategy[] = [];

  // High prep waste
  if ((wasteByCategory["prep-waste"] || 0) > 8) {
    recommendations.push(
      WASTE_PREVENTION_STRATEGIES.find((s) => s.id === "strat-03")!,
    );
  }

  // High spoilage risk
  if ((wasteByCategory["spoilage"] || 0) > 5) {
    recommendations.push(
      WASTE_PREVENTION_STRATEGIES.find((s) => s.id === "strat-01")!,
    );
  }

  // Cooking loss
  if ((wasteByCategory["cooking-loss"] || 0) > 10) {
    recommendations.push(
      WASTE_PREVENTION_STRATEGIES.find((s) => s.id === "strat-04")!,
    );
  }

  // Plate waste
  if ((wasteByCategory["plate-waste"] || 0) > 6) {
    recommendations.push(
      WASTE_PREVENTION_STRATEGIES.find((s) => s.id === "strat-06")!,
    );
  }

  // Overall high waste
  if (currentWastePercent > 12) {
    recommendations.push(
      WASTE_PREVENTION_STRATEGIES.find((s) => s.id === "strat-05")!,
    );
  }

  // Remove duplicates and sort by ROI
  return Array.from(new Set(recommendations)).sort(
    (a, b) => a.expectedROI - b.expectedROI,
  );
}

/**
 * Detect waste anomalies
 */
export function detectWasteAlerts(
  currentWastePercent: number,
  previousWastePercent: number,
  wasteByCategory: Record<string, number>,
  ingredientWaste: Record<string, number>,
): WasteAlert[] {
  const alerts: WasteAlert[] = [];

  // Spike detection
  const percentChange = ((currentWastePercent - previousWastePercent) / previousWastePercent) * 100;

  if (percentChange > 25) {
    alerts.push({
      id: `alert-spike-${Date.now()}`,
      type: "trend-spike",
      severity: percentChange > 50 ? "critical" : "high",
      message: `Waste has spiked by ${percentChange.toFixed(1)}% compared to previous period`,
      suggestedAction: "Investigate recent recipe changes or staff additions",
      affectedItem: "Overall waste",
      metric: currentWastePercent,
      threshold: previousWastePercent * 1.25,
      timestamp: Date.now(),
    });
  }

  // High individual category waste
  for (const [category, amount] of Object.entries(wasteByCategory)) {
    if (amount > 12) {
      alerts.push({
        id: `alert-${category}-${Date.now()}`,
        type: "high-waste",
        severity: amount > 20 ? "critical" : amount > 15 ? "high" : "medium",
        message: `${category.replace(/-/g, " ")} is at ${amount.toFixed(1)}%`,
        suggestedAction: `Review procedures for ${category.replace(/-/g, " ")}`,
        affectedItem: category,
        metric: amount,
        threshold: 12,
        timestamp: Date.now(),
      });
    }
  }

  // Ingredient-specific alerts
  for (const [ingredient, waste] of Object.entries(ingredientWaste)) {
    if (waste > 15) {
      alerts.push({
        id: `alert-ingredient-${Date.now()}`,
        type: "ingredient-at-risk",
        severity: "medium",
        message: `High waste for ${ingredient}: ${waste.toFixed(1)}%`,
        suggestedAction: `Consider alternative suppliers or recipes for ${ingredient}`,
        affectedItem: ingredient,
        metric: waste,
        threshold: 15,
        timestamp: Date.now(),
      });
    }
  }

  return alerts;
}

/**
 * Generate waste insights from historical data
 */
export function generateWasteInsights(
  wasteHistory: Array<{
    date: number;
    percent: number;
    category: string;
  }>,
): WasteInsight[] {
  const insights: WasteInsight[] = [];

  if (wasteHistory.length < 7) {
    return insights;
  }

  // Trend analysis
  const recentWaste = wasteHistory.slice(-7).map((w) => w.percent);
  const avgRecent = recentWaste.reduce((a, b) => a + b) / recentWaste.length;
  const avgPrevious =
    wasteHistory
      .slice(-14, -7)
      .reduce((sum, w) => sum + w.percent, 0) / 7;

  if (avgRecent > avgPrevious * 1.15) {
    insights.push({
      id: `insight-trend-${Date.now()}`,
      title: "Waste Trend Increasing",
      insight: `Waste has been trending upward. Current average ${avgRecent.toFixed(1)}% vs previous ${avgPrevious.toFixed(1)}%`,
      dataPoints: 14,
      confidence: 0.85,
      actionItems: [
        "Review recent staff additions or schedule changes",
        "Audit recipe standardization",
        "Check equipment maintenance",
      ],
      estimatedImpact: {
        costSavings: 500,
        timeRequired: 5,
      },
    });
  }

  // Day-of-week pattern
  const dayPatterns: Record<number, number[]> = {};
  wasteHistory.forEach((w) => {
    const day = new Date(w.date).getDay();
    if (!dayPatterns[day]) dayPatterns[day] = [];
    dayPatterns[day].push(w.percent);
  });

  for (const [day, values] of Object.entries(dayPatterns)) {
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      parseInt(day)
    ];
    const avgDay = values.reduce((a, b) => a + b) / values.length;

    if (avgDay > avgRecent * 1.2) {
      insights.push({
        id: `insight-day-${day}-${Date.now()}`,
        title: `High Waste on ${dayName}s`,
        insight: `${dayName}s average ${avgDay.toFixed(1)}% waste, which is above weekly average`,
        dataPoints: values.length,
        confidence: 0.78,
        actionItems: [
          `Increase prep on ${dayName}s`,
          "Review staffing levels",
          "Check supplier quality on that delivery day",
        ],
        estimatedImpact: {
          costSavings: 200,
          timeRequired: 3,
        },
      });
    }
  }

  return insights.slice(0, 3); // Return top 3 insights
}

/**
 * Calculate waste reduction impact
 */
export function calculateReductionImpact(
  currentWastePercent: number,
  targetWastePercent: number,
  annualFoodCost: number,
): {
  annualSavings: number;
  monthlySavings: number;
  percentReduction: number;
} {
  const currentCost = annualFoodCost * (currentWastePercent / 100);
  const targetCost = annualFoodCost * (targetWastePercent / 100);
  const annualSavings = currentCost - targetCost;

  return {
    annualSavings,
    monthlySavings: annualSavings / 12,
    percentReduction: ((currentWastePercent - targetWastePercent) / currentWastePercent) * 100,
  };
}

/**
 * Get strategy implementation checklist
 */
export function getImplementationChecklist(strategy: WastePreventionStrategy): {
  week: number;
  tasks: string[];
}[] {
  const checklist: { week: number; tasks: string[] }[] = [];
  const weeksNeeded = Math.ceil(strategy.implementationTime / 7);

  for (let i = 0; i < weeksNeeded; i++) {
    checklist.push({
      week: i + 1,
      tasks: [],
    });
  }

  // Distribute resources across weeks
  const tasksPerWeek = Math.ceil(strategy.resources.length / weeksNeeded);

  strategy.resources.forEach((resource, index) => {
    const weekIndex = Math.floor(index / tasksPerWeek);
    if (checklist[weekIndex]) {
      checklist[weekIndex].tasks.push(`Prepare/acquire: ${resource}`);
    }
  });

  // Add training and monitoring tasks
  if (weeksNeeded > 1) {
    checklist[0].tasks.unshift("Schedule training sessions");
    checklist[weeksNeeded - 1].tasks.push("Begin monitoring and data collection");
  }

  return checklist;
}
