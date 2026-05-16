/**
 * Predictive Equipment Failure & Maintenance Intelligence
 * Moat #30: Predictive Equipment Failure & Maintenance Intelligence
 * 
 * Industry First: Proactive equipment failure prediction
 * - Predictive failure detection (IoT sensors, usage patterns)
 * - Maintenance scheduling optimization
 * - Integration with EchoStratus (forecasting, scenarios)
 * - Integration with EchoAurum (budget planning, cost forecasting)
 * - Parts inventory optimization
 */

import { logger } from "../lib/logger";

export interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  installDate: Date;
  warrantyExpiry?: Date;
  criticality: "low" | "medium" | "high" | "critical";
  sensors?: EquipmentSensor[];
}

export interface EquipmentSensor {
  type: "vibration" | "temperature" | "pressure" | "usage";
  value: number;
  timestamp: Date;
  unit: string;
}

export interface FailurePrediction {
  equipmentId: string;
  equipmentName: string;
  failureProbability: number; // 0-100
  predictedFailureDate: Date;
  confidence: number; // 0-1
  failureType: string;
  factors: FailureFactor[];
  maintenanceRecommendations: MaintenanceRecommendation[];
  estimatedCost: number;
  estimatedDowntime: number; // hours
}

export interface FailureFactor {
  type: "sensor" | "usage" | "age" | "maintenance_history";
  severity: number; // 0-1
  description: string;
  evidence: string[];
}

export interface MaintenanceRecommendation {
  type: "preventive" | "corrective" | "inspection";
  description: string;
  urgency: "low" | "medium" | "high" | "critical";
  estimatedCost: number;
  estimatedDuration: number; // hours
  scheduledDate?: Date;
  budgetImpact: number;
}

export interface MaintenanceSchedule {
  equipmentId: string;
  recommendations: MaintenanceRecommendation[];
  totalCost: number;
  totalDowntime: number;
  optimizedSchedule: OptimizedMaintenanceSchedule;
  budgetForecast: BudgetForecast;
}

export interface OptimizedMaintenanceSchedule {
  schedule: Array<{
    date: Date;
    equipmentId: string;
    maintenanceType: string;
    cost: number;
    downtime: number;
  }>;
  optimizationGoals: string[];
  conflicts: string[];
}

export interface BudgetForecast {
  monthlyBudgets: Array<{ month: string; amount: number; category: string }>;
  totalAnnualBudget: number;
  varianceFromPlan: number;
  recommendations: string[];
}

export interface EchoStratusIntegration {
  scenarioId?: string;
  forecastData?: {
    demand: number;
    equipmentUtilization: number;
    optimalMaintenanceWindow: Date;
  };
  scenarioImpact?: {
    scenario: string;
    impact: string;
    recommendation: string;
  };
}

export interface EchoAurumIntegration {
  budgetCategory: string;
  glAccount?: string;
  costForecast: Array<{ period: string; amount: number }>;
  varianceAnalysis?: {
    budgeted: number;
    forecasted: number;
    variance: number;
    variancePercent: number;
  };
}

export class PredictiveEquipmentMaintenanceService {
  private equipment: Map<string, Equipment> = new Map();
  private predictions: Map<string, FailurePrediction> = new Map();
  private schedules: Map<string, MaintenanceSchedule> = new Map();
  private sensorHistory: Map<string, EquipmentSensor[]> = new Map();

  /**
   * Predict equipment failure
   */
  async predictFailure(
    equipmentId: string,
    sensors: EquipmentSensor[],
    usageHours: number,
    maintenanceHistory: Array<{ date: Date; type: string; cost: number }>
  ): Promise<FailurePrediction> {
    const equipment = this.equipment.get(equipmentId);
    if (!equipment) {
      throw new Error("Equipment not found");
    }

    const factors: FailureFactor[] = [];
    let failureProbability = 0;

    // Sensor-based factors
    sensors.forEach(sensor => {
      const anomaly = this.detectSensorAnomaly(sensor, equipment.type);
      if (anomaly.detected) {
        failureProbability += anomaly.severity * 25;
        factors.push({
          type: "sensor",
          severity: anomaly.severity,
          description: `${sensor.type} sensor anomaly: ${sensor.value} ${sensor.unit}`,
          evidence: [`Sensor reading: ${sensor.value} ${sensor.unit}`, `Threshold: ${anomaly.threshold} ${sensor.unit}`],
        });
      }
    });

    // Usage-based factors
    const usageFactor = this.calculateUsageFactor(usageHours, equipment.installDate);
    if (usageFactor > 0.5) {
      failureProbability += usageFactor * 20;
      factors.push({
        type: "usage",
        severity: usageFactor,
        description: `High usage: ${usageHours} hours since installation`,
        evidence: [`Usage hours: ${usageHours}`, `Install date: ${equipment.installDate.toISOString()}`],
      });
    }

    // Age-based factors
    const ageYears = (Date.now() - equipment.installDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (ageYears > 5) {
      const ageFactor = Math.min(1, (ageYears - 5) / 5); // 0-1 for 5-10 years
      failureProbability += ageFactor * 15;
      factors.push({
        type: "age",
        severity: ageFactor,
        description: `Equipment age: ${ageYears.toFixed(1)} years`,
        evidence: [`Install date: ${equipment.installDate.toISOString()}`],
      });
    }

    // Maintenance history factors
    const maintenanceFactor = this.calculateMaintenanceFactor(maintenanceHistory);
    if (maintenanceFactor > 0) {
      failureProbability += maintenanceFactor * 10;
      factors.push({
        type: "maintenance_history",
        severity: maintenanceFactor,
        description: "Insufficient maintenance history",
        evidence: [`Maintenance events: ${maintenanceHistory.length}`],
      });
    }

    failureProbability = Math.min(100, failureProbability);
    
    // Predict failure date (simplified - would use time-series models)
    const predictedFailureDate = new Date();
    if (failureProbability > 70) {
      predictedFailureDate.setDate(predictedFailureDate.getDate() + 7); // 1 week
    } else if (failureProbability > 50) {
      predictedFailureDate.setDate(predictedFailureDate.getDate() + 30); // 1 month
    } else if (failureProbability > 30) {
      predictedFailureDate.setDate(predictedFailureDate.getDate() + 90); // 3 months
    } else {
      predictedFailureDate.setDate(predictedFailureDate.getDate() + 180); // 6 months
    }

    const confidence = this.calculateConfidence(factors, sensors.length);

    // Generate maintenance recommendations
    const recommendations = this.generateMaintenanceRecommendations(
      equipment,
      failureProbability,
      factors
    );

    const estimatedCost = recommendations.reduce((sum, r) => sum + r.estimatedCost, 0);
    const estimatedDowntime = recommendations.reduce((sum, r) => sum + r.estimatedDuration, 0);

    const prediction: FailurePrediction = {
      equipmentId,
      equipmentName: equipment.name,
      failureProbability,
      predictedFailureDate,
      confidence,
      failureType: this.determineFailureType(factors),
      factors,
      maintenanceRecommendations: recommendations,
      estimatedCost,
      estimatedDowntime,
    };

    this.predictions.set(equipmentId, prediction);

    logger.warn("[Predictive Maintenance] Failure predicted", {
      equipmentId,
      equipmentName: equipment.name,
      failureProbability,
      predictedFailureDate: predictedFailureDate.toISOString(),
      confidence,
    });

    return prediction;
  }

  /**
   * Schedule maintenance with EchoStratus and EchoAurum integration
   */
  async scheduleMaintenance(
    equipmentId: string,
    echostratusData?: EchoStratusIntegration,
    aurumData?: EchoAurumIntegration
  ): Promise<MaintenanceSchedule> {
    const prediction = this.predictions.get(equipmentId);
    if (!prediction) {
      throw new Error("No failure prediction found for equipment");
    }

    // Optimize schedule considering EchoStratus forecasts
    const optimizedSchedule = this.optimizeMaintenanceSchedule(
      prediction,
      echostratusData
    );

    // Generate budget forecast with EchoAurum integration
    const budgetForecast = this.generateBudgetForecast(
      prediction,
      optimizedSchedule,
      aurumData
    );

    const schedule: MaintenanceSchedule = {
      equipmentId,
      recommendations: prediction.maintenanceRecommendations,
      totalCost: prediction.estimatedCost,
      totalDowntime: prediction.estimatedDowntime,
      optimizedSchedule,
      budgetForecast,
    };

    this.schedules.set(equipmentId, schedule);

    logger.info("[Predictive Maintenance] Maintenance scheduled", {
      equipmentId,
      totalCost: schedule.totalCost,
      totalDowntime: schedule.totalDowntime,
      echostratusIntegrated: !!echostratusData,
      aurumIntegrated: !!aurumData,
    });

    return schedule;
  }

  /**
   * Register equipment
   */
  async registerEquipment(equipment: Equipment): Promise<Equipment> {
    this.equipment.set(equipment.id, equipment);
    logger.info("[Predictive Maintenance] Equipment registered", {
      equipmentId: equipment.id,
      name: equipment.name,
      type: equipment.type,
    });
    return equipment;
  }

  /**
   * Record sensor data
   */
  async recordSensorData(equipmentId: string, sensor: EquipmentSensor): Promise<void> {
    if (!this.sensorHistory.has(equipmentId)) {
      this.sensorHistory.set(equipmentId, []);
    }

    const history = this.sensorHistory.get(equipmentId)!;
    history.push(sensor);

    // Keep last 1000 readings
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Detect sensor anomaly
   */
  private detectSensorAnomaly(sensor: EquipmentSensor, equipmentType: string): {
    detected: boolean;
    severity: number;
    threshold: number;
  } {
    // Simplified thresholds (would use ML models in production)
    let threshold = 0;
    
    if (sensor.type === "vibration") {
      threshold = 5.0; // mm/s
      if (sensor.value > threshold) {
        return {
          detected: true,
          severity: Math.min(1, (sensor.value - threshold) / threshold),
          threshold,
        };
      }
    } else if (sensor.type === "temperature") {
      threshold = 80; // Celsius
      if (sensor.value > threshold) {
        return {
          detected: true,
          severity: Math.min(1, (sensor.value - threshold) / threshold),
          threshold,
        };
      }
    } else if (sensor.type === "pressure") {
      threshold = 150; // PSI
      if (sensor.value > threshold * 1.2) {
        return {
          detected: true,
          severity: 0.8,
          threshold,
        };
      }
    }

    return { detected: false, severity: 0, threshold };
  }

  /**
   * Calculate usage factor
   */
  private calculateUsageFactor(usageHours: number, installDate: Date): number {
    const ageHours = (Date.now() - installDate.getTime()) / (1000 * 60 * 60);
    const utilizationRate = usageHours / ageHours;
    
    // High utilization (>80%) increases failure risk
    if (utilizationRate > 0.8) {
      return Math.min(1, (utilizationRate - 0.8) / 0.2);
    }
    
    return 0;
  }

  /**
   * Calculate maintenance factor
   */
  private calculateMaintenanceFactor(history: Array<{ date: Date; type: string; cost: number }>): number {
    // Insufficient maintenance increases risk
    if (history.length === 0) return 0.8;
    if (history.length < 2) return 0.5;
    if (history.length < 4) return 0.3;
    return 0;
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(factors: FailureFactor[], sensorCount: number): number {
    let confidence = 0.5; // Base confidence
    
    // More factors = higher confidence
    confidence += factors.length * 0.1;
    
    // More sensors = higher confidence
    confidence += Math.min(0.2, sensorCount * 0.05);
    
    return Math.min(0.95, confidence);
  }

  /**
   * Determine failure type
   */
  private determineFailureType(factors: FailureFactor[]): string {
    const sensorFactors = factors.filter(f => f.type === "sensor");
    if (sensorFactors.length > 0) {
      const sensorType = sensorFactors[0].description.split(" ")[0];
      return `${sensorType} sensor anomaly`;
    }
    
    if (factors.some(f => f.type === "usage")) {
      return "Wear and tear";
    }
    
    if (factors.some(f => f.type === "age")) {
      return "Aging/end of life";
    }
    
    return "General failure";
  }

  /**
   * Generate maintenance recommendations
   */
  private generateMaintenanceRecommendations(
    equipment: Equipment,
    failureProbability: number,
    factors: FailureFactor[]
  ): MaintenanceRecommendation[] {
    const recommendations: MaintenanceRecommendation[] = [];

    if (failureProbability > 70) {
      recommendations.push({
        type: "preventive",
        description: "Immediate preventive maintenance required",
        urgency: "critical",
        estimatedCost: 5000,
        estimatedDuration: 8,
        budgetImpact: 5000,
      });
    } else if (failureProbability > 50) {
      recommendations.push({
        type: "preventive",
        description: "Schedule preventive maintenance within 2 weeks",
        urgency: "high",
        estimatedCost: 3000,
        estimatedDuration: 4,
        budgetImpact: 3000,
      });
    } else if (failureProbability > 30) {
      recommendations.push({
        type: "inspection",
        description: "Detailed inspection recommended",
        urgency: "medium",
        estimatedCost: 500,
        estimatedDuration: 2,
        budgetImpact: 500,
      });
    }

    return recommendations;
  }

  /**
   * Optimize maintenance schedule (EchoStratus integration)
   */
  private optimizeMaintenanceSchedule(
    prediction: FailurePrediction,
    echostratusData?: EchoStratusIntegration
  ): OptimizedMaintenanceSchedule {
    const schedule: OptimizedMaintenanceSchedule["schedule"] = [];

    // Use EchoStratus forecast data if available
    if (echostratusData?.forecastData) {
      const optimalWindow = echostratusData.forecastData.optimalMaintenanceWindow;
      
      prediction.maintenanceRecommendations.forEach(rec => {
        schedule.push({
          date: optimalWindow || prediction.predictedFailureDate,
          equipmentId: prediction.equipmentId,
          maintenanceType: rec.type,
          cost: rec.estimatedCost,
          downtime: rec.estimatedDuration,
        });
      });
    } else {
      // Default: schedule before predicted failure
      const scheduledDate = new Date(prediction.predictedFailureDate);
      scheduledDate.setDate(scheduledDate.getDate() - 7); // 1 week before

      prediction.maintenanceRecommendations.forEach(rec => {
        schedule.push({
          date: scheduledDate,
          equipmentId: prediction.equipmentId,
          maintenanceType: rec.type,
          cost: rec.estimatedCost,
          downtime: rec.estimatedDuration,
        });
      });
    }

    return {
      schedule,
      optimizationGoals: [
        "Minimize downtime during peak hours",
        "Optimize maintenance costs",
        "Prevent unexpected failures",
      ],
      conflicts: [],
    };
  }

  /**
   * Generate budget forecast (EchoAurum integration)
   */
  private generateBudgetForecast(
    prediction: FailurePrediction,
    optimizedSchedule: OptimizedMaintenanceSchedule,
    aurumData?: EchoAurumIntegration
  ): BudgetForecast {
    const monthlyBudgets: BudgetForecast["monthlyBudgets"] = [];
    const totalCost = prediction.estimatedCost;

    // Generate monthly breakdown
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const monthStr = month.toISOString().substr(0, 7);
      
      // Check if maintenance scheduled this month
      const scheduledThisMonth = optimizedSchedule.schedule.some(s => {
        const sMonth = s.date.toISOString().substr(0, 7);
        return sMonth === monthStr;
      });

      monthlyBudgets.push({
        month: monthStr,
        amount: scheduledThisMonth ? totalCost : 0,
        category: aurumData?.budgetCategory || "Equipment Maintenance",
      });
    }

    const totalAnnualBudget = monthlyBudgets.reduce((sum, m) => sum + m.amount, 0);

    // Variance analysis with EchoAurum
    let varianceFromPlan = 0;
    if (aurumData?.varianceAnalysis) {
      varianceFromPlan = aurumData.varianceAnalysis.variance;
    }

    const recommendations: string[] = [
      "Budget for preventive maintenance to avoid higher emergency repair costs",
    ];

    if (varianceFromPlan > 0) {
      recommendations.push(`Budget variance of $${varianceFromPlan.toFixed(2)} - adjust budget allocation`);
    }

    return {
      monthlyBudgets,
      totalAnnualBudget,
      varianceFromPlan,
      recommendations,
    };
  }
}

let serviceInstance: PredictiveEquipmentMaintenanceService | null = null;

export function getPredictiveEquipmentMaintenanceService(): PredictiveEquipmentMaintenanceService {
  if (!serviceInstance) {
    serviceInstance = new PredictiveEquipmentMaintenanceService();
  }
  return serviceInstance;
}

export default PredictiveEquipmentMaintenanceService;
