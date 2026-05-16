/**
 * LUCCCA AI Forecasting Engine
 * ============================
 * 
 * Intelligent demand forecasting for proactive inventory management.
 * Predicts ingredient needs based on:
 * - Historical consumption patterns
 * - Events calendar (BEOs, banquets, private events)
 * - Seasonality and trends
 * - Weather impact
 * - Day-of-week patterns
 * - Holiday calendars
 * 
 * Goals:
 * - Predict ingredient needs before running low
 * - Minimize waste from over-ordering
 * - Optimize order timing (bulk discounts, lead times)
 * - Support minimal staff operations through automation
 * 
 * Flow:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      AI FORECASTING ENGINE                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                    DATA COLLECTION LAYER                         │   │
 * │  ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤   │
 * │  │Historical│  Events  │ Weather  │ POS/Sales│ Recipes  │ Holidays│   │
 * │  │   Data   │ Calendar │   API    │   Data   │  Usage   │ Calendar│   │
 * │  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬────┘   │
 * │       └──────────┴──────────┴──────────┴──────────┴──────────┘        │
 * │                              │                                         │
 * │                    ┌─────────▼─────────┐                              │
 * │                    │  FEATURE PIPELINE  │                              │
 * │                    └─────────┬─────────┘                              │
 * │                              │                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                     FORECASTING MODELS                           │   │
 * │  ├──────────────┬──────────────┬──────────────┬──────────────────┤   │
 * │  │   Demand     │  Ingredient  │   Event      │   Anomaly        │   │
 * │  │  Predictor   │   Forecaster │   Impact     │   Detector       │   │
 * │  └──────────────┴──────────────┴──────────────┴──────────────────┘   │
 * │                              │                                         │
 * │                    ┌─────────▼─────────┐                              │
 * │                    │ RECOMMENDATION    │                              │
 * │                    │    ENGINE         │                              │
 * │                    └─────────┬─────────┘                              │
 * │                              │                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                      OUTPUT LAYER                                │   │
 * │  ├──────────────┬──────────────┬──────────────┬──────────────────┤   │
 * │  │  Ingredient  │   Purchase   │    Alert     │   Optimization   │   │
 * │  │  Forecasts   │   Schedules  │   Triggers   │   Suggestions    │   │
 * │  └──────────────┴──────────────┴──────────────┴──────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { logger } from '../lib/logger.js';
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from '../lib/unified-event-bus.js';
import { operationsCoreEngine, type CanonicalIngredient, type PurchaseOrderSuggestion } from './operations-core-engine.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Time-series data point for historical analysis
 */
export interface ConsumptionDataPoint {
  date: string; // YYYY-MM-DD
  ingredientId: string;
  quantity: number;
  unit: string;
  source: 'production' | 'pos' | 'waste' | 'adjustment';
  outletId: string;
  metadata?: {
    recipeId?: string;
    eventId?: string;
    mealPeriod?: 'breakfast' | 'lunch' | 'dinner' | 'late_night';
  };
}

/**
 * Event data for demand impact calculation
 */
export interface EventData {
  id: string;
  name: string;
  type: 'banquet' | 'private_event' | 'holiday' | 'conference' | 'wedding' | 'regular';
  date: string;
  startTime?: string;
  endTime?: string;
  guestCount: number;
  outletId: string;
  menuItems?: string[]; // Recipe IDs
  beoId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

/**
 * Weather data for impact analysis
 */
export interface WeatherData {
  date: string;
  temperature: number;
  temperatureUnit: 'F' | 'C';
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'hot' | 'cold';
  humidity?: number;
  precipitation?: number;
}

/**
 * Seasonality pattern
 */
export interface SeasonalityPattern {
  ingredientId: string;
  dayOfWeekMultipliers: Record<number, number>; // 0-6 (Sun-Sat)
  monthMultipliers: Record<number, number>; // 1-12
  holidayMultipliers: Record<string, number>; // holiday_name -> multiplier
}

/**
 * Forecast result for an ingredient
 */
export interface IngredientForecast {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  unit: string;
  
  // Daily forecasts
  dailyForecasts: DailyForecast[];
  
  // Aggregated metrics
  totalForecastedDemand: number;
  peakDemandDay: string;
  peakDemandQuantity: number;
  averageDailyDemand: number;
  
  // Stock projections
  stockoutDate?: string; // When we'll run out
  daysUntilStockout?: number;
  
  // Order recommendations
  recommendedOrderDate?: string;
  recommendedOrderQuantity?: number;
  
  // Confidence
  confidenceScore: number; // 0-1
  confidenceFactors: string[];
}

export interface DailyForecast {
  date: string;
  predictedDemand: number;
  lowerBound: number; // 90% confidence interval
  upperBound: number;
  projectedStock: number;
  demandFactors: DemandFactor[];
}

export interface DemandFactor {
  type: 'base' | 'event' | 'seasonality' | 'weather' | 'trend' | 'anomaly';
  name: string;
  impact: number; // Multiplier or additive value
  confidence: number;
}

/**
 * Order schedule recommendation
 */
export interface OrderSchedule {
  id: string;
  supplierId: string;
  supplierName: string;
  recommendedOrderDate: string;
  deliveryDate: string;
  items: OrderScheduleItem[];
  totalEstimatedCost: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  rationale: string[];
  savingsOpportunity?: number;
  orgId: string;
  outletId: string;
}

export interface OrderScheduleItem {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  forecastedDemand: number;
  recommendedQuantity: number;
  unit: string;
  estimatedCost: number;
  leadTimeDays: number;
}

/**
 * Forecasting configuration
 */
export interface ForecastingConfig {
  // Forecast horizon
  forecastDays: number;
  
  // Model weights
  historicalWeight: number;
  eventWeight: number;
  seasonalityWeight: number;
  weatherWeight: number;
  trendWeight: number;
  
  // Safety stock
  safetyStockDays: number;
  safetyStockMultiplier: number;
  
  // Ordering optimization
  minOrderValue: number;
  orderLeadTimeDays: number;
  preferredOrderDays: number[]; // 0-6 for specific days
  
  // Alert thresholds
  urgentStockoutDays: number;
  warningStockoutDays: number;
  
  // AI settings
  enableMLPredictions: boolean;
  enableAnomalyDetection: boolean;
  anomalyThreshold: number;
}

const DEFAULT_FORECAST_CONFIG: ForecastingConfig = {
  forecastDays: 14,
  historicalWeight: 0.4,
  eventWeight: 0.3,
  seasonalityWeight: 0.15,
  weatherWeight: 0.05,
  trendWeight: 0.1,
  safetyStockDays: 3,
  safetyStockMultiplier: 1.2,
  minOrderValue: 100,
  orderLeadTimeDays: 2,
  preferredOrderDays: [1, 3], // Monday, Wednesday
  urgentStockoutDays: 2,
  warningStockoutDays: 5,
  enableMLPredictions: true,
  enableAnomalyDetection: true,
  anomalyThreshold: 2.5, // Standard deviations
};

// ============================================================================
// AI FORECASTING ENGINE
// ============================================================================

export class AIForecastingEngine {
  private config: ForecastingConfig;
  
  // Historical data stores
  private consumptionHistory: Map<string, ConsumptionDataPoint[]> = new Map();
  private eventHistory: Map<string, EventData[]> = new Map();
  private weatherHistory: Map<string, WeatherData[]> = new Map();
  
  // Computed patterns
  private seasonalityPatterns: Map<string, SeasonalityPattern> = new Map();
  private baselineDemand: Map<string, number> = new Map();
  private trendSlopes: Map<string, number> = new Map();
  
  // Cache for forecasts
  private forecastCache: Map<string, { forecast: IngredientForecast; timestamp: number }> = new Map();
  private cacheValidityMs: number = 15 * 60 * 1000; // 15 minutes
  
  constructor(config: Partial<ForecastingConfig> = {}) {
    this.config = { ...DEFAULT_FORECAST_CONFIG, ...config };
    this.initializeEventListeners();
    logger.info('[AIForecastingEngine] Initialized');
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private initializeEventListeners(): void {
    // Listen for inventory consumption events
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.INVENTORY_UPDATED, async (event) => {
      await this.recordConsumption(event.payload);
    });

    // Listen for BEO/Event approvals
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.BEO_APPROVED, async (event) => {
      await this.addEvent(event.payload);
    });

    // Listen for calendar events
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.CALENDAR_EVENT_CREATED, async (event) => {
      await this.addEvent(event.payload);
    });

    logger.info('[AIForecastingEngine] Event listeners initialized');
  }

  // ============================================================================
  // DATA INGESTION
  // ============================================================================

  /**
   * Record consumption data point
   */
  async recordConsumption(data: {
    ingredientId: string;
    quantity: number;
    unit: string;
    source: ConsumptionDataPoint['source'];
    outletId: string;
    recipeId?: string;
    eventId?: string;
  }): Promise<void> {
    const dataPoint: ConsumptionDataPoint = {
      date: new Date().toISOString().split('T')[0],
      ingredientId: data.ingredientId,
      quantity: data.quantity,
      unit: data.unit,
      source: data.source,
      outletId: data.outletId,
      metadata: {
        recipeId: data.recipeId,
        eventId: data.eventId,
      },
    };

    const key = `${data.outletId}:${data.ingredientId}`;
    const history = this.consumptionHistory.get(key) || [];
    history.push(dataPoint);
    
    // Keep last 365 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const filtered = history.filter(h => new Date(h.date) >= cutoff);
    
    this.consumptionHistory.set(key, filtered);
    
    // Invalidate cache for this ingredient
    this.forecastCache.delete(key);
    
    // Update baseline demand
    this.updateBaselineDemand(key, data.ingredientId);
  }

  /**
   * Add event to forecast consideration
   */
  async addEvent(event: Partial<EventData>): Promise<void> {
    if (!event.id || !event.date || !event.outletId) return;

    const eventData: EventData = {
      id: event.id,
      name: event.name || 'Unnamed Event',
      type: event.type || 'regular',
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      guestCount: event.guestCount || 0,
      outletId: event.outletId,
      menuItems: event.menuItems,
      beoId: event.beoId,
      status: event.status || 'confirmed',
    };

    const key = event.outletId;
    const events = this.eventHistory.get(key) || [];
    
    // Update or add event
    const existingIndex = events.findIndex(e => e.id === event.id);
    if (existingIndex >= 0) {
      events[existingIndex] = eventData;
    } else {
      events.push(eventData);
    }
    
    this.eventHistory.set(key, events);
    
    // Invalidate all forecasts for this outlet
    for (const [cacheKey] of this.forecastCache) {
      if (cacheKey.startsWith(event.outletId)) {
        this.forecastCache.delete(cacheKey);
      }
    }

    logger.debug(`[AIForecastingEngine] Event added: ${eventData.name} on ${eventData.date}`);
  }

  /**
   * Add weather data
   */
  async addWeatherData(outletId: string, weather: WeatherData): Promise<void> {
    const history = this.weatherHistory.get(outletId) || [];
    
    // Update or add weather data
    const existingIndex = history.findIndex(w => w.date === weather.date);
    if (existingIndex >= 0) {
      history[existingIndex] = weather;
    } else {
      history.push(weather);
    }
    
    // Keep last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const filtered = history.filter(w => new Date(w.date) >= cutoff);
    
    this.weatherHistory.set(outletId, filtered);
  }

  /**
   * Bulk import historical consumption data
   */
  async importHistoricalData(data: ConsumptionDataPoint[]): Promise<number> {
    let imported = 0;
    
    for (const point of data) {
      const key = `${point.outletId}:${point.ingredientId}`;
      const history = this.consumptionHistory.get(key) || [];
      history.push(point);
      this.consumptionHistory.set(key, history);
      imported++;
    }
    
    // Recalculate all patterns
    await this.recalculatePatterns();
    
    logger.info(`[AIForecastingEngine] Imported ${imported} historical data points`);
    return imported;
  }

  // ============================================================================
  // FORECASTING CORE
  // ============================================================================

  /**
   * Generate forecast for an ingredient
   */
  async forecastIngredient(
    ingredientId: string,
    outletId: string,
    days?: number
  ): Promise<IngredientForecast> {
    const forecastDays = days || this.config.forecastDays;
    const cacheKey = `${outletId}:${ingredientId}`;
    
    // Check cache
    const cached = this.forecastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheValidityMs) {
      return cached.forecast;
    }

    // Get ingredient info
    const ingredient = operationsCoreEngine.getIngredient(ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient not found: ${ingredientId}`);
    }

    // Get historical data
    const history = this.consumptionHistory.get(cacheKey) || [];
    
    // Calculate baseline demand
    const baseline = this.calculateBaselineDemand(history);
    
    // Get seasonality pattern
    const seasonality = this.getSeasonalityPattern(ingredientId, history);
    
    // Get upcoming events
    const events = this.getUpcomingEvents(outletId, forecastDays);
    
    // Get trend
    const trend = this.calculateTrend(history);
    
    // Generate daily forecasts
    const dailyForecasts: DailyForecast[] = [];
    let projectedStock = ingredient.currentStock;
    let stockoutDate: string | undefined;
    let daysUntilStockout: number | undefined;
    let totalDemand = 0;
    let peakDemand = 0;
    let peakDay = '';

    for (let i = 0; i < forecastDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const month = date.getMonth() + 1;

      // Calculate demand factors
      const demandFactors: DemandFactor[] = [];
      let predictedDemand = baseline;

      // Base demand
      demandFactors.push({
        type: 'base',
        name: 'Historical Average',
        impact: baseline,
        confidence: this.calculateHistoricalConfidence(history.length),
      });

      // Seasonality (day of week)
      const dowMultiplier = seasonality?.dayOfWeekMultipliers[dayOfWeek] || 1;
      if (dowMultiplier !== 1) {
        predictedDemand *= dowMultiplier;
        demandFactors.push({
          type: 'seasonality',
          name: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} Pattern`,
          impact: dowMultiplier,
          confidence: 0.8,
        });
      }

      // Seasonality (month)
      const monthMultiplier = seasonality?.monthMultipliers[month] || 1;
      if (monthMultiplier !== 1) {
        predictedDemand *= monthMultiplier;
        demandFactors.push({
          type: 'seasonality',
          name: `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month]} Pattern`,
          impact: monthMultiplier,
          confidence: 0.7,
        });
      }

      // Events impact
      const dayEvents = events.filter(e => e.date === dateStr);
      for (const event of dayEvents) {
        const eventImpact = this.calculateEventImpact(ingredientId, event);
        if (eventImpact > 0) {
          predictedDemand += eventImpact;
          demandFactors.push({
            type: 'event',
            name: `${event.name} (${event.guestCount} guests)`,
            impact: eventImpact,
            confidence: event.status === 'confirmed' ? 0.95 : 0.6,
          });
        }
      }

      // Trend adjustment
      if (trend !== 0) {
        const trendAdjustment = baseline * trend * i;
        predictedDemand += trendAdjustment;
        demandFactors.push({
          type: 'trend',
          name: trend > 0 ? 'Upward Trend' : 'Downward Trend',
          impact: trendAdjustment,
          confidence: 0.6,
        });
      }

      // Calculate confidence interval (simplified)
      const variance = this.calculateVariance(history, baseline);
      const lowerBound = Math.max(0, predictedDemand - variance);
      const upperBound = predictedDemand + variance;

      // Update projected stock
      projectedStock -= predictedDemand;

      // Track stockout
      if (projectedStock <= 0 && !stockoutDate) {
        stockoutDate = dateStr;
        daysUntilStockout = i;
      }

      // Track peak
      if (predictedDemand > peakDemand) {
        peakDemand = predictedDemand;
        peakDay = dateStr;
      }

      totalDemand += predictedDemand;

      dailyForecasts.push({
        date: dateStr,
        predictedDemand,
        lowerBound,
        upperBound,
        projectedStock: Math.max(0, projectedStock),
        demandFactors,
      });
    }

    // Calculate order recommendation
    let recommendedOrderDate: string | undefined;
    let recommendedOrderQuantity: number | undefined;

    if (stockoutDate) {
      // Order before stockout considering lead time
      const orderDate = new Date(stockoutDate);
      orderDate.setDate(orderDate.getDate() - this.config.orderLeadTimeDays - this.config.safetyStockDays);
      
      // Adjust to preferred order day if configured
      if (this.config.preferredOrderDays.length > 0) {
        while (!this.config.preferredOrderDays.includes(orderDate.getDay())) {
          orderDate.setDate(orderDate.getDate() - 1);
        }
      }

      recommendedOrderDate = orderDate.toISOString().split('T')[0];
      
      // Calculate quantity to cover forecast + safety stock
      recommendedOrderQuantity = Math.ceil(
        totalDemand * this.config.safetyStockMultiplier
      );
    }

    // Calculate overall confidence
    const confidenceFactors: string[] = [];
    let confidenceScore = 0.5; // Base confidence

    if (history.length >= 90) {
      confidenceScore += 0.2;
      confidenceFactors.push('90+ days of historical data');
    } else if (history.length >= 30) {
      confidenceScore += 0.1;
      confidenceFactors.push('30+ days of historical data');
    } else {
      confidenceFactors.push('Limited historical data - consider manual review');
    }

    if (events.length > 0) {
      confidenceScore += 0.1;
      confidenceFactors.push(`${events.length} upcoming events factored in`);
    }

    if (Math.abs(trend) < 0.05) {
      confidenceScore += 0.1;
      confidenceFactors.push('Stable consumption pattern');
    } else {
      confidenceFactors.push(`${trend > 0 ? 'Increasing' : 'Decreasing'} trend detected`);
    }

    const forecast: IngredientForecast = {
      ingredientId,
      ingredientName: ingredient.name,
      currentStock: ingredient.currentStock,
      unit: ingredient.baseUnit,
      dailyForecasts,
      totalForecastedDemand: totalDemand,
      peakDemandDay: peakDay,
      peakDemandQuantity: peakDemand,
      averageDailyDemand: totalDemand / forecastDays,
      stockoutDate,
      daysUntilStockout,
      recommendedOrderDate,
      recommendedOrderQuantity,
      confidenceScore: Math.min(1, confidenceScore),
      confidenceFactors,
    };

    // Cache the result
    this.forecastCache.set(cacheKey, { forecast, timestamp: Date.now() });

    return forecast;
  }

  /**
   * Generate forecasts for all ingredients at an outlet
   */
  async forecastAllIngredients(
    orgId: string,
    outletId?: string,
    days?: number
  ): Promise<IngredientForecast[]> {
    const ingredients = operationsCoreEngine.listIngredients(orgId, outletId);
    const forecasts: IngredientForecast[] = [];

    for (const ingredient of ingredients) {
      try {
        const forecast = await this.forecastIngredient(
          ingredient.id,
          ingredient.outletId || outletId || '',
          days
        );
        forecasts.push(forecast);
      } catch (error: any) {
        logger.warn(`[AIForecastingEngine] Failed to forecast ${ingredient.name}: ${error.message}`);
      }
    }

    // Sort by urgency (days until stockout)
    forecasts.sort((a, b) => {
      if (a.daysUntilStockout === undefined && b.daysUntilStockout === undefined) return 0;
      if (a.daysUntilStockout === undefined) return 1;
      if (b.daysUntilStockout === undefined) return -1;
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    return forecasts;
  }

  /**
   * Generate optimized order schedule
   */
  async generateOrderSchedule(
    orgId: string,
    outletId: string,
    days?: number
  ): Promise<OrderSchedule[]> {
    const forecasts = await this.forecastAllIngredients(orgId, outletId, days);
    const schedules: Map<string, OrderSchedule> = new Map();

    // Group by recommended order date and supplier
    for (const forecast of forecasts) {
      if (!forecast.recommendedOrderDate || !forecast.recommendedOrderQuantity) continue;

      const ingredient = operationsCoreEngine.getIngredient(forecast.ingredientId);
      if (!ingredient || !ingredient.preferredSupplierId) continue;

      const key = `${forecast.recommendedOrderDate}:${ingredient.preferredSupplierId}`;
      let schedule = schedules.get(key);

      if (!schedule) {
        const deliveryDate = new Date(forecast.recommendedOrderDate);
        deliveryDate.setDate(deliveryDate.getDate() + this.config.orderLeadTimeDays);

        schedule = {
          id: crypto.randomUUID(),
          supplierId: ingredient.preferredSupplierId,
          supplierName: ingredient.vendorCodes[0]?.vendorName || 'Unknown',
          recommendedOrderDate: forecast.recommendedOrderDate,
          deliveryDate: deliveryDate.toISOString().split('T')[0],
          items: [],
          totalEstimatedCost: 0,
          priority: 'medium',
          rationale: [],
          orgId,
          outletId,
        };
        schedules.set(key, schedule);
      }

      // Add item to schedule
      const estimatedCost = forecast.recommendedOrderQuantity * (ingredient.lastPurchaseCost || 0);
      
      schedule.items.push({
        ingredientId: forecast.ingredientId,
        ingredientName: forecast.ingredientName,
        currentStock: forecast.currentStock,
        forecastedDemand: forecast.totalForecastedDemand,
        recommendedQuantity: forecast.recommendedOrderQuantity,
        unit: forecast.unit,
        estimatedCost,
        leadTimeDays: ingredient.leadTimeDays,
      });

      schedule.totalEstimatedCost += estimatedCost;

      // Update priority based on stockout urgency
      if (forecast.daysUntilStockout !== undefined) {
        if (forecast.daysUntilStockout <= this.config.urgentStockoutDays) {
          schedule.priority = 'urgent';
          schedule.rationale.push(`URGENT: ${forecast.ingredientName} will run out in ${forecast.daysUntilStockout} days`);
        } else if (forecast.daysUntilStockout <= this.config.warningStockoutDays && schedule.priority !== 'urgent') {
          schedule.priority = 'high';
          schedule.rationale.push(`${forecast.ingredientName} needs reorder soon`);
        }
      }
    }

    // Convert to array and calculate savings opportunities
    const result: OrderSchedule[] = [];
    for (const schedule of schedules.values()) {
      // Check if combining orders would save money
      if (schedule.totalEstimatedCost < this.config.minOrderValue) {
        schedule.rationale.push(`Below minimum order value (${this.config.minOrderValue}). Consider combining orders.`);
      }

      result.push(schedule);
    }

    // Sort by priority then date
    result.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.recommendedOrderDate).getTime() - new Date(b.recommendedOrderDate).getTime();
    });

    return result;
  }

  /**
   * Get alerts for critical stock situations
   */
  async getStockAlerts(
    orgId: string,
    outletId?: string
  ): Promise<{
    urgent: IngredientForecast[];
    warning: IngredientForecast[];
    normal: IngredientForecast[];
  }> {
    const forecasts = await this.forecastAllIngredients(orgId, outletId);

    return {
      urgent: forecasts.filter(f => 
        f.daysUntilStockout !== undefined && 
        f.daysUntilStockout <= this.config.urgentStockoutDays
      ),
      warning: forecasts.filter(f => 
        f.daysUntilStockout !== undefined && 
        f.daysUntilStockout > this.config.urgentStockoutDays &&
        f.daysUntilStockout <= this.config.warningStockoutDays
      ),
      normal: forecasts.filter(f => 
        f.daysUntilStockout === undefined || 
        f.daysUntilStockout > this.config.warningStockoutDays
      ),
    };
  }

  // ============================================================================
  // PATTERN CALCULATION
  // ============================================================================

  private calculateBaselineDemand(history: ConsumptionDataPoint[]): number {
    if (history.length === 0) return 0;

    // Calculate daily totals
    const dailyTotals = new Map<string, number>();
    for (const point of history) {
      const current = dailyTotals.get(point.date) || 0;
      dailyTotals.set(point.date, current + point.quantity);
    }

    // Return average daily consumption
    const totals = Array.from(dailyTotals.values());
    return totals.reduce((sum, v) => sum + v, 0) / Math.max(1, totals.length);
  }

  private getSeasonalityPattern(
    ingredientId: string,
    history: ConsumptionDataPoint[]
  ): SeasonalityPattern | undefined {
    if (history.length < 30) return undefined;

    const dayOfWeekTotals: Record<number, number[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
    };
    const monthTotals: Record<number, number[]> = {
      1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
      7: [], 8: [], 9: [], 10: [], 11: [], 12: [],
    };

    // Group by day of week and month
    for (const point of history) {
      const date = new Date(point.date);
      dayOfWeekTotals[date.getDay()].push(point.quantity);
      monthTotals[date.getMonth() + 1].push(point.quantity);
    }

    // Calculate baseline
    const baseline = this.calculateBaselineDemand(history);
    if (baseline === 0) return undefined;

    // Calculate multipliers
    const dayOfWeekMultipliers: Record<number, number> = {};
    const monthMultipliers: Record<number, number> = {};

    for (let i = 0; i < 7; i++) {
      const values = dayOfWeekTotals[i];
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        dayOfWeekMultipliers[i] = avg / baseline;
      } else {
        dayOfWeekMultipliers[i] = 1;
      }
    }

    for (let i = 1; i <= 12; i++) {
      const values = monthTotals[i];
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        monthMultipliers[i] = avg / baseline;
      } else {
        monthMultipliers[i] = 1;
      }
    }

    return {
      ingredientId,
      dayOfWeekMultipliers,
      monthMultipliers,
      holidayMultipliers: {}, // Would be populated from holiday calendar
    };
  }

  private calculateTrend(history: ConsumptionDataPoint[]): number {
    if (history.length < 14) return 0;

    // Calculate weekly averages for last 8 weeks
    const weeklyAverages: number[] = [];
    const now = new Date();

    for (let w = 0; w < 8; w++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (w * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekData = history.filter(h => {
        const date = new Date(h.date);
        return date >= weekStart && date < weekEnd;
      });

      if (weekData.length > 0) {
        const avg = weekData.reduce((sum, d) => sum + d.quantity, 0) / weekData.length;
        weeklyAverages.unshift(avg); // Add at beginning (oldest first)
      }
    }

    if (weeklyAverages.length < 4) return 0;

    // Calculate simple linear regression slope
    const n = weeklyAverages.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += weeklyAverages[i];
      sumXY += i * weeklyAverages[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    // Return normalized slope (% change per week)
    return avgY !== 0 ? slope / avgY : 0;
  }

  private calculateVariance(history: ConsumptionDataPoint[], baseline: number): number {
    if (history.length < 7) return baseline * 0.3; // Default 30% variance

    const dailyTotals = new Map<string, number>();
    for (const point of history) {
      const current = dailyTotals.get(point.date) || 0;
      dailyTotals.set(point.date, current + point.quantity);
    }

    const values = Array.from(dailyTotals.values());
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    return Math.sqrt(variance);
  }

  private calculateHistoricalConfidence(dataPoints: number): number {
    if (dataPoints >= 365) return 0.95;
    if (dataPoints >= 180) return 0.85;
    if (dataPoints >= 90) return 0.75;
    if (dataPoints >= 30) return 0.6;
    if (dataPoints >= 14) return 0.4;
    return 0.2;
  }

  private getUpcomingEvents(outletId: string, days: number): EventData[] {
    const events = this.eventHistory.get(outletId) || [];
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= now && eventDate <= endDate && e.status !== 'cancelled';
    });
  }

  private calculateEventImpact(ingredientId: string, event: EventData): number {
    // Base impact calculation
    // In production, this would look at:
    // - Historical consumption during similar events
    // - Menu items planned for the event
    // - Guest count
    
    const baseImpactPerGuest = 0.1; // Default assumption
    let impact = event.guestCount * baseImpactPerGuest;

    // Adjust by event type
    const eventTypeMultipliers: Record<EventData['type'], number> = {
      wedding: 1.5,
      banquet: 1.3,
      conference: 0.8,
      private_event: 1.2,
      holiday: 1.5,
      regular: 1.0,
    };

    impact *= eventTypeMultipliers[event.type] || 1.0;

    return impact;
  }

  private updateBaselineDemand(key: string, ingredientId: string): void {
    const history = this.consumptionHistory.get(key) || [];
    const baseline = this.calculateBaselineDemand(history);
    this.baselineDemand.set(ingredientId, baseline);
  }

  private async recalculatePatterns(): Promise<void> {
    for (const [key, history] of this.consumptionHistory) {
      const [, ingredientId] = key.split(':');
      
      // Update baseline
      const baseline = this.calculateBaselineDemand(history);
      this.baselineDemand.set(ingredientId, baseline);

      // Update seasonality
      const seasonality = this.getSeasonalityPattern(ingredientId, history);
      if (seasonality) {
        this.seasonalityPatterns.set(ingredientId, seasonality);
      }

      // Update trend
      const trend = this.calculateTrend(history);
      this.trendSlopes.set(ingredientId, trend);
    }

    // Clear cache
    this.forecastCache.clear();

    logger.info('[AIForecastingEngine] Patterns recalculated');
  }

  // ============================================================================
  // STATISTICS & DIAGNOSTICS
  // ============================================================================

  getStats(): {
    ingredientsTracked: number;
    totalDataPoints: number;
    eventsTracked: number;
    cacheSize: number;
    forecastAccuracy?: number;
  } {
    let totalDataPoints = 0;
    let totalEvents = 0;

    for (const history of this.consumptionHistory.values()) {
      totalDataPoints += history.length;
    }

    for (const events of this.eventHistory.values()) {
      totalEvents += events.length;
    }

    return {
      ingredientsTracked: this.consumptionHistory.size,
      totalDataPoints,
      eventsTracked: totalEvents,
      cacheSize: this.forecastCache.size,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.forecastCache.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): ForecastingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ForecastingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.clearCache();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const aiForecastingEngine = new AIForecastingEngine();

export default aiForecastingEngine;
