/**
 * Predictive Alert Engine
 * ──────────────────────
 * AI-powered early warning system for operational issues before they happen.
 *
 * ALERTS:
 * - Margin erosion (predicts decline in profitability)
 * - Revenue shortage (will miss daily target)
 * - Labor overrun (exceeding labor budget)
 * - Waste spike (unusual waste pattern detected)
 * - Inventory shortage (will run out soon)
 * - Cash flow warning (liquidity risk)
 */

export interface PredictiveAlert {
  id: string;
  type: AlertType;
  outlet_id: string;
  severity: "critical" | "high" | "warning";
  title: string;
  message: string;
  predicted_impact: number; // Dollar amount at risk
  probability: number; // 0-100
  timeframe: string; // When the alert will occur
  recommended_action: string;
  timestamp: number;
  acknowledged: boolean;
  triggered_conditions: string[];
}

export type AlertType =
  | "margin_erosion"
  | "revenue_shortage"
  | "labor_overrun"
  | "waste_spike"
  | "inventory_shortage"
  | "cash_flow_warning"
  | "quality_risk"
  | "schedule_conflict";

interface AlertCondition {
  name: string;
  threshold: number;
  operator: ">" | "<" | "change";
  weight: number;
}

interface OutletMetrics {
  outlet_id: string;
  current_covers: number;
  projected_revenue: number;
  labor_cost_percent: number;
  food_cost_percent: number;
  waste_percent: number;
  inventory_days_on_hand: number;
  cash_available: number;
}

class PredictiveAlertEngine {
  private alerts: Map<string, PredictiveAlert[]> = new Map();
  private alertRules: Map<AlertType, AlertCondition[]> = new Map();
  private outletMetrics: Map<string, OutletMetrics> = new Map();
  private alertHistory: PredictiveAlert[] = [];

  constructor() {
    this.setupAlertRules();
  }

  /**
   * Setup alert detection rules
   */
  private setupAlertRules(): void {
    // Margin erosion detection
    this.alertRules.set("margin_erosion", [
      {
        name: "Food cost increasing",
        threshold: 35, // > 35% of F&B revenue
        operator: ">",
        weight: 0.4,
      },
      {
        name: "Labor cost increasing",
        threshold: 32, // > 32% of revenue
        operator: ">",
        weight: 0.3,
      },
      {
        name: "Waste ratio high",
        threshold: 5, // > 5% of consumption
        operator: ">",
        weight: 0.2,
      },
      {
        name: "Negative revenue trend",
        threshold: -10, // Declining 10%+ vs. last week
        operator: "change",
        weight: 0.1,
      },
    ]);

    // Revenue shortage detection
    this.alertRules.set("revenue_shortage", [
      {
        name: "Covers below forecast",
        threshold: -15, // 15% below forecast
        operator: "change",
        weight: 0.5,
      },
      {
        name: "Check average declining",
        threshold: -8, // 8% below average
        operator: "change",
        weight: 0.3,
      },
      {
        name: "No-shows increasing",
        threshold: 8, // > 8% no-show rate
        operator: ">",
        weight: 0.2,
      },
    ]);

    // Labor overrun detection
    this.alertRules.set("labor_overrun", [
      {
        name: "Actual labor > scheduled",
        threshold: 15, // 15% over schedule
        operator: ">",
        weight: 0.6,
      },
      {
        name: "Overtime trending up",
        threshold: 5, // > 5% overtime
        operator: ">",
        weight: 0.4,
      },
    ]);

    // Waste spike detection
    this.alertRules.set("waste_spike", [
      {
        name: "Waste above baseline",
        threshold: 8, // > 8% of consumption
        operator: ">",
        weight: 0.8,
      },
      {
        name: "Spoilage incident",
        threshold: 1, // Any spoilage logged
        operator: ">",
        weight: 0.2,
      },
    ]);

    // Inventory shortage detection
    this.alertRules.set("inventory_shortage", [
      {
        name: "Days on hand low",
        threshold: 3, // < 3 days on hand
        operator: "<",
        weight: 0.7,
      },
      {
        name: "High turnover items low",
        threshold: 1, // < 1 day on hand for key items
        operator: "<",
        weight: 0.3,
      },
    ]);

    // Cash flow warning
    this.alertRules.set("cash_flow_warning", [
      {
        name: "Cash below minimum",
        threshold: 5000, // < $5k available
        operator: "<",
        weight: 0.8,
      },
      {
        name: "Accounts payable high",
        threshold: 60, // > 60 days outstanding
        operator: ">",
        weight: 0.2,
      },
    ]);
  }

  /**
   * Evaluate metrics and generate alerts
   */
  public evaluateMetrics(metrics: OutletMetrics): PredictiveAlert[] {
    const alerts: PredictiveAlert[] = [];

    this.outletMetrics.set(metrics.outlet_id, metrics);

    // Check each alert type
    for (const [alertType, conditions] of this.alertRules.entries()) {
      const alert = this.checkConditions(alertType, conditions, metrics);

      if (alert) {
        alerts.push(alert);
      }
    }

    // Store alerts
    if (!this.alerts.has(metrics.outlet_id)) {
      this.alerts.set(metrics.outlet_id, []);
    }

    this.alerts.get(metrics.outlet_id)!.push(...alerts);

    // Add to history
    this.alertHistory.push(...alerts);
    if (this.alertHistory.length > 10000) {
      this.alertHistory.shift();
    }

    return alerts;
  }

  /**
   * Check alert conditions
   */
  private checkConditions(
    alertType: AlertType,
    conditions: AlertCondition[],
    metrics: OutletMetrics,
  ): PredictiveAlert | null {
    let totalWeight = 0;
    let conditionScore = 0;
    const triggeredConditions: string[] = [];

    for (const condition of conditions) {
      const conditionMet = this.evaluateCondition(condition, metrics);

      if (conditionMet) {
        conditionScore += condition.weight;
        triggeredConditions.push(condition.name);
      }

      totalWeight += condition.weight;
    }

    const probability = (conditionScore / totalWeight) * 100;

    if (probability >= 50) {
      return {
        id: this.generateId(),
        type: alertType,
        outlet_id: metrics.outlet_id,
        severity: this.calculateSeverity(alertType, probability),
        title: this.getAlertTitle(alertType),
        message: this.generateAlertMessage(alertType, metrics),
        predicted_impact: this.estimateImpact(alertType, metrics),
        probability: Math.round(probability),
        timeframe: this.getTimeframe(alertType),
        recommended_action: this.getRecommendedAction(alertType),
        timestamp: Date.now(),
        acknowledged: false,
        triggered_conditions: triggeredConditions,
      };
    }

    return null;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: AlertCondition,
    metrics: OutletMetrics,
  ): boolean {
    let value = 0;

    // Map condition names to metrics
    switch (condition.name) {
      case "Food cost increasing":
        value = metrics.food_cost_percent;
        break;
      case "Labor cost increasing":
        value = metrics.labor_cost_percent;
        break;
      case "Waste ratio high":
        value = metrics.waste_percent;
        break;
      case "Covers below forecast":
        value = metrics.current_covers; // Simplified
        break;
      case "Actual labor > scheduled":
        value = metrics.labor_cost_percent;
        break;
      case "Waste above baseline":
        value = metrics.waste_percent;
        break;
      case "Days on hand low":
        value = metrics.inventory_days_on_hand;
        break;
      case "Cash below minimum":
        value = metrics.cash_available;
        break;
      default:
        return false;
    }

    if (condition.operator === ">") {
      return value > condition.threshold;
    } else if (condition.operator === "<") {
      return value < condition.threshold;
    } else if (condition.operator === "change") {
      // Simplified: assume change if not exactly the threshold
      return Math.abs(value - condition.threshold) > 5;
    }

    return false;
  }

  /**
   * Calculate alert severity
   */
  private calculateSeverity(
    alertType: AlertType,
    probability: number,
  ): "critical" | "high" | "warning" {
    if (alertType === "cash_flow_warning" || alertType === "margin_erosion") {
      if (probability >= 75) return "critical";
      if (probability >= 60) return "high";
    }

    if (alertType === "revenue_shortage" || alertType === "labor_overrun") {
      if (probability >= 80) return "critical";
      if (probability >= 65) return "high";
    }

    return probability >= 70 ? "high" : "warning";
  }

  /**
   * Get alert title
   */
  private getAlertTitle(alertType: AlertType): string {
    const titles: Record<AlertType, string> = {
      margin_erosion: "Margin Erosion Risk",
      revenue_shortage: "Revenue Shortfall Expected",
      labor_overrun: "Labor Cost Overrun",
      waste_spike: "Unusual Waste Detected",
      inventory_shortage: "Inventory Low",
      cash_flow_warning: "Cash Flow Warning",
      quality_risk: "Quality Risk Detected",
      schedule_conflict: "Schedule Conflict",
    };

    return titles[alertType];
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    alertType: AlertType,
    metrics: OutletMetrics,
  ): string {
    switch (alertType) {
      case "margin_erosion":
        return `Margin trending downward. Food cost at ${metrics.food_cost_percent.toFixed(1)}%, labor at ${metrics.labor_cost_percent.toFixed(1)}%. Action needed.`;

      case "revenue_shortage":
        return `Current covers (${metrics.current_covers}) trending below forecast. Risk missing daily target.`;

      case "labor_overrun":
        return `Labor cost at ${metrics.labor_cost_percent.toFixed(1)}% of revenue. Likely to exceed budget.`;

      case "waste_spike":
        return `Waste at ${metrics.waste_percent.toFixed(1)}% - abnormally high. Investigate causes.`;

      case "inventory_shortage":
        return `Only ${metrics.inventory_days_on_hand.toFixed(1)} days of inventory remaining. Reorder soon.`;

      case "cash_flow_warning":
        return `Available cash: $${metrics.cash_available.toFixed(0)}. Monitor for liquidity concerns.`;

      default:
        return "Alert triggered";
    }
  }

  /**
   * Estimate financial impact
   */
  private estimateImpact(alertType: AlertType, metrics: OutletMetrics): number {
    switch (alertType) {
      case "margin_erosion":
        const excessCost =
          (metrics.food_cost_percent - 30) * (metrics.projected_revenue / 100);
        return Math.max(0, excessCost);

      case "revenue_shortage":
        return Math.max(0, metrics.projected_revenue * 0.15); // 15% shortfall

      case "labor_overrun":
        const excessLabor =
          (metrics.labor_cost_percent - 30) * (metrics.projected_revenue / 100);
        return Math.max(0, excessLabor);

      case "waste_spike":
        return Math.max(
          0,
          metrics.waste_percent * ((metrics.projected_revenue * 0.3) / 100),
        );

      default:
        return 0;
    }
  }

  /**
   * Get timeframe
   */
  private getTimeframe(alertType: AlertType): string {
    switch (alertType) {
      case "margin_erosion":
        return "Within 2 weeks";
      case "revenue_shortage":
        return "Today or tomorrow";
      case "labor_overrun":
        return "This week";
      case "waste_spike":
        return "Immediately";
      case "inventory_shortage":
        return "Within 3-5 days";
      case "cash_flow_warning":
        return "Within 2 weeks";
      default:
        return "Soon";
    }
  }

  /**
   * Get recommended action
   */
  private getRecommendedAction(alertType: AlertType): string {
    switch (alertType) {
      case "margin_erosion":
        return "Review pricing strategy and reduce portion costs. Check supplier rates.";

      case "revenue_shortage":
        return "Run limited-time promotion or increase marketing spend.";

      case "labor_overrun":
        return "Review scheduling. Cross-train staff to improve efficiency.";

      case "waste_spike":
        return "Investigate root cause. Improve inventory rotation.";

      case "inventory_shortage":
        return "Place emergency order with supplier. Consider temporary menu adjustments.";

      case "cash_flow_warning":
        return "Accelerate receivables. Negotiate extended payment terms with suppliers.";

      default:
        return "Take corrective action immediately.";
    }
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string): void {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find((a) => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        return;
      }
    }
  }

  /**
   * Get unacknowledged alerts
   */
  public getUnacknowledgedAlerts(outletId: string): PredictiveAlert[] {
    return (this.alerts.get(outletId) || []).filter((a) => !a.acknowledged);
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit = 50): PredictiveAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export const predictiveAlertEngine = new PredictiveAlertEngine();
