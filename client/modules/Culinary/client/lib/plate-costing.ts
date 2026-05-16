// Plate Costing & Comp Analysis
// Tracks individual dish costs, portion sizes, and complimentary/wasted items

export interface PlateVariant {
  id: string;
  recipeId: string;
  recipeName: string;
  portionSize: string; // e.g., "6oz", "8oz", "12oz"
  portionWeight: number; // in grams for standardization
  cost: number;
  price: number;
  targetMargin: number;
  active: boolean;
}

export interface PlateServed {
  id: string;
  date: string;
  timestamp: number;
  plateVariantId: string;
  recipeName: string;
  portionSize: string;
  cost: number;
  price: number;
  status: "served" | "returned" | "comp" | "waste";
  reason?: string; // For returned/comp/waste
  notes?: string;
}

export interface CompRecord {
  id: string;
  date: string;
  timestamp: number;
  recipeName: string;
  cost: number;
  reason: "quality-issue" | "mistake" | "promotion" | "vip-guest" | "error" | "other";
  approvedBy?: string;
  notes?: string;
}

export interface PlateWaste {
  id: string;
  date: string;
  timestamp: number;
  recipeName: string;
  portionSize: string;
  cost: number;
  reason: "cold-holding" | "overprepared" | "customer-request" | "spoilage" | "mistake" | "other";
  notes?: string;
}

export interface DailyPlateAnalysis {
  date: string;
  totalPlatesServed: number;
  totalRevenue: number;
  totalCost: number;
  foodCostPercent: number;
  
  // Returns & issues
  platesReturned: number;
  returnRate: number;
  returnCost: number;
  
  // Comps
  compsIssued: number;
  compCost: number;
  compPercent: number; // Of revenue
  
  // Waste
  platesWasted: number;
  wasteCost: number;
  wastePercent: number; // Of cost
  
  // Net impact
  lostRevenue: number;
  totalCostOfIssues: number;
  effectiveMargin: number;
}

export interface CompAnalysis {
  period: "daily" | "weekly" | "monthly";
  totalComps: number;
  totalCompCost: number;
  compReasons: Record<string, { count: number; cost: number }>;
  topCompedDishes: Array<{ recipeName: string; count: number; cost: number }>;
  compPercent: number;
  recommendation: string;
}

export interface PortionAnalysis {
  recipeName: string;
  totalPortionsServed: number;
  standardPortionSize: string;
  variantsUsed: Array<{ portionSize: string; count: number; percent: number }>;
  costVariance: number; // Between different portion sizes
  recommendation: string;
}

/**
 * Create plate variant
 * @param variant - Plate variant details
 * @returns Created plate variant
 */
export function createPlateVariant(
  variant: Omit<PlateVariant, "id">,
): PlateVariant {
  return {
    ...variant,
    id: `plate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  };
}

/**
 * Record plate served
 * @param plateVariantId - Variant being served
 * @param cost - Plate cost
 * @param price - Menu price
 * @param status - Status of the plate
 * @param reason - Optional reason for non-served status
 * @returns Plate served record
 */
export function recordPlateServed(
  plateVariantId: string,
  recipeName: string,
  portionSize: string,
  cost: number,
  price: number,
  status: PlateServed["status"],
  reason?: string,
): PlateServed {
  const now = new Date();
  return {
    id: `plate-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: now.toISOString().split("T")[0],
    timestamp: now.getTime(),
    plateVariantId,
    recipeName,
    portionSize,
    cost,
    price,
    status,
    reason,
  };
}

/**
 * Record comp
 * @param recipeName - Name of comped dish
 * @param cost - Cost of dish
 * @param reason - Reason for comp
 * @returns Comp record
 */
export function recordComp(
  recipeName: string,
  cost: number,
  reason: CompRecord["reason"],
  approvedBy?: string,
  notes?: string,
): CompRecord {
  const now = new Date();
  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: now.toISOString().split("T")[0],
    timestamp: now.getTime(),
    recipeName,
    cost,
    reason,
    approvedBy,
    notes,
  };
}

/**
 * Generate daily plate analysis
 * @param platesServed - All plates served that day
 * @param comps - All comps that day
 * @param wastes - All wasted plates that day
 * @returns Daily analysis
 */
export function generateDailyPlateAnalysis(
  date: string,
  platesServed: PlateServed[],
  comps: CompRecord[],
  wastes: PlateWaste[],
): DailyPlateAnalysis {
  // Filter by date
  const dayPlates = platesServed.filter((p) => p.date === date);
  const dayComps = comps.filter((c) => c.date === date);
  const dayWastes = wastes.filter((w) => w.date === date);

  // Calculate metrics
  const servedPlates = dayPlates.filter((p) => p.status === "served");
  const returnedPlates = dayPlates.filter((p) => p.status === "returned");
  const wastedPlates = dayPlates.filter((p) => p.status === "waste");

  const totalPlatesServed = servedPlates.length;
  const totalRevenue = servedPlates.reduce((sum, p) => sum + p.price, 0);
  const totalCost = dayPlates.reduce((sum, p) => sum + p.cost, 0);
  const foodCostPercent = totalRevenue > 0 ? Math.round((totalCost / totalRevenue) * 10000) / 100 : 0;

  const platesReturned = returnedPlates.length;
  const returnRate = totalPlatesServed > 0 ? Math.round((platesReturned / totalPlatesServed) * 10000) / 100 : 0;
  const returnCost = returnedPlates.reduce((sum, p) => sum + p.cost, 0);

  const compsIssued = dayComps.length;
  const compCost = dayComps.reduce((sum, c) => sum + c.cost, 0);
  const compPercent = totalRevenue > 0 ? Math.round((compCost / totalRevenue) * 10000) / 100 : 0;

  const platesWasted = wastedPlates.length + dayWastes.length;
  const wasteCost = wastedPlates.reduce((sum, p) => sum + p.cost, 0) + dayWastes.reduce((sum, w) => sum + w.cost, 0);
  const wastePercent = totalCost > 0 ? Math.round((wasteCost / totalCost) * 10000) / 100 : 0;

  const lostRevenue = returnedPlates.reduce((sum, p) => sum + p.price, 0) + compCost;
  const totalCostOfIssues = returnCost + compCost + wasteCost;
  const effectiveMargin = totalRevenue > 0 ? Math.round(((totalRevenue - totalCost - totalCostOfIssues) / totalRevenue) * 10000) / 100 : 0;

  return {
    date,
    totalPlatesServed,
    totalRevenue,
    totalCost,
    foodCostPercent,
    platesReturned,
    returnRate,
    returnCost,
    compsIssued,
    compCost,
    compPercent,
    platesWasted,
    wasteCost,
    wastePercent,
    lostRevenue,
    totalCostOfIssues,
    effectiveMargin,
  };
}

/**
 * Analyze comp patterns
 * @param comps - Array of comp records
 * @param period - Time period to analyze
 * @returns Comp analysis with recommendations
 */
export function analyzeComps(comps: CompRecord[], period: "daily" | "weekly" | "monthly" = "daily"): CompAnalysis {
  const totalComps = comps.length;
  const totalCompCost = comps.reduce((sum, c) => sum + c.cost, 0);

  // Group by reason
  const reasonMap = new Map<string, { count: number; cost: number }>();
  comps.forEach((comp) => {
    const existing = reasonMap.get(comp.reason) || { count: 0, cost: 0 };
    existing.count++;
    existing.cost += comp.cost;
    reasonMap.set(comp.reason, existing);
  });

  const compReasons = Object.fromEntries(reasonMap);

  // Top comped dishes
  const dishMap = new Map<string, { count: number; cost: number }>();
  comps.forEach((comp) => {
    const existing = dishMap.get(comp.recipeName) || { count: 0, cost: 0 };
    existing.count++;
    existing.cost += comp.cost;
    dishMap.set(comp.recipeName, existing);
  });

  const topCompedDishes = Array.from(dishMap.entries())
    .map(([recipeName, data]) => ({ recipeName, ...data }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  // Estimate monthly impact
  const estimatedMonthlyCompCost = period === "daily" ? totalCompCost * 30 : totalCompCost;
  let recommendation = "Comp levels are acceptable.";
  if (estimatedMonthlyCompCost > 500) {
    const topDish = topCompedDishes[0];
    if (topDish) {
      recommendation = `${topDish.recipeName} is frequently comped (${topDish.count}x). Review recipe quality or preparation procedures.`;
    }
  }

  return {
    period,
    totalComps,
    totalCompCost,
    compReasons,
    topCompedDishes,
    compPercent: 0, // Would need daily revenue to calculate
    recommendation,
  };
}

/**
 * Analyze portion size variations
 * @param platesServed - Plates served
 * @param recipeName - Recipe to analyze
 * @returns Portion analysis
 */
export function analyzePortions(platesServed: PlateServed[], recipeName: string): PortionAnalysis {
  const dishPlates = platesServed.filter((p) => p.recipeName === recipeName && p.status === "served");
  const totalPortionsServed = dishPlates.length;

  // Group by portion size
  const sizeMap = new Map<string, number>();
  dishPlates.forEach((plate) => {
    sizeMap.set(plate.portionSize, (sizeMap.get(plate.portionSize) || 0) + 1);
  });

  const variantsUsed = Array.from(sizeMap.entries()).map(([portionSize, count]) => ({
    portionSize,
    count,
    percent: Math.round((count / totalPortionsServed) * 10000) / 100,
  }));

  // Find standard size (most common)
  const standardPortionSize =
    variantsUsed.length > 0 ? variantsUsed.sort((a, b) => b.count - a.count)[0].portionSize : "standard";

  // Calculate cost variance
  const costs = dishPlates.map((p) => p.cost);
  const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
  const costVariance = Math.round((Math.max(...costs) - Math.min(...costs)) / avgCost * 10000) / 100;

  let recommendation = `${recipeName} is consistently portioned at ${standardPortionSize}.`;
  if (costVariance > 15) {
    recommendation = `Portion variance is ${costVariance}%. Consider standardizing portion sizes to reduce cost variation.`;
  }

  return {
    recipeName,
    totalPortionsServed,
    standardPortionSize,
    variantsUsed,
    costVariance,
    recommendation,
  };
}

/**
 * Calculate effective price after adjustments
 * @param menuPrice - Menu listed price
 * @param returnRate - Percentage of returned plates
 * @param compRate - Percentage of comped plates
 * @returns Effective average price
 */
export function calculateEffectivePrice(
  menuPrice: number,
  returnRate: number,
  compRate: number,
): number {
  // Returns reduce revenue to 0 (customer doesn't pay)
  // Comps reduce revenue to 0 (comp cost but no revenue)
  const effectivePrice = menuPrice * (1 - (returnRate + compRate) / 100);
  return Math.round(effectivePrice * 100) / 100;
}
