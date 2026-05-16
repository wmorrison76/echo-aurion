/**
 * LUCCCA Labor Cost Integration Engine
 * =====================================
 * 
 * Complete labor cost management connecting Schedule to P&L.
 * Industry-standard features:
 * 
 * - Auto-plan event labor based on guest count ratios
 * - Real-time labor cost tracking
 * - Overtime/premium pay calculation
 * - Labor cost percentage in P&L
 * - Schedule-to-actual variance tracking
 * - Labor efficiency analytics
 * 
 * Integration Points:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    LABOR COST INTEGRATION ENGINE                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │                                                                         │
 * │  ┌─────────────────────────────────────────────────────────────────┐   │
 * │  │                 INPUTS (Data Sources)                            │   │
 * │  ├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤   │
 * │  │ Schedule │  Events  │  Labor   │  Time    │  Payroll │ Position│   │
 * │  │  Module  │ Calendar │  Rates   │  Clock   │  Rules   │  Config │   │
 * │  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬────┘   │
 * │       └──────────┴──────────┴──────────┴──────────┴──────────┘        │
 * │                              │                                         │
 * │                    ┌─────────▼─────────┐                              │
 * │                    │  LABOR PLANNING   │                              │
 * │                    │    ENGINE         │                              │
 * │                    └─────────┬─────────┘                              │
 * │                              │                                         │
 * │  ┌───────────────────────────┼───────────────────────────────────┐    │
 * │  │                           │                                   │    │
 * │  ▼                           ▼                                   ▼    │
 * │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
 * │  │   Auto-Plan  │  │   Cost Calc      │  │   Variance           │   │
 * │  │ (Guest Ratio)│  │ (OT/Premium)     │  │   Tracking           │   │
 * │  └──────────────┘  └──────────────────┘  └──────────────────────┘   │
 * │                              │                                         │
 * │                    ┌─────────▼─────────┐                              │
 * │                    │    P&L OUTPUT     │                              │
 * │                    │  (Labor Line)     │                              │
 * │                    └───────────────────┘                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { logger } from '../lib/logger.js';
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from '../lib/unified-event-bus.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Position configuration for labor planning
 */
export interface PositionConfig {
  id: string;
  code: string;
  name: string;
  department: LaborDepartment;
  
  // Ratios for auto-planning
  guestsPerStaff: number; // e.g., 20 guests per server
  minimumStaff: number; // Minimum regardless of guest count
  maximumStaff?: number; // Cap for large events
  
  // Rates
  baseHourlyRate: number;
  overtimeMultiplier: number;
  doubleTimeMultiplier: number;
  weekendDifferential: number; // Additional per hour
  nightDifferential: number; // Additional per hour for late shifts
  holidayMultiplier: number;
  
  // Scheduling rules
  minimumShiftHours: number;
  maximumShiftHours: number;
  breakRequiredAfterHours: number;
  breakDurationMinutes: number;
  
  // Skills required
  requiredSkills: string[];
  preferredSkills: string[];
}

export type LaborDepartment = 
  | 'kitchen'
  | 'service'
  | 'bar'
  | 'banquets'
  | 'stewarding'
  | 'pastry'
  | 'management'
  | 'support';

/**
 * Shift record
 */
export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  positionId: string;
  positionName: string;
  department: LaborDepartment;
  
  // Timing
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledHours: number;
  
  // Actual (filled after shift)
  actualStart?: string;
  actualEnd?: string;
  actualHours?: number;
  breakMinutes?: number;
  
  // Event association
  eventId?: string;
  eventName?: string;
  
  // Cost
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  regularRate: number;
  overtimeRate: number;
  doubleTimeRate: number;
  differentials: ShiftDifferential[];
  totalCost: number;
  
  // Status
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';
  
  // Metadata
  orgId: string;
  outletId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftDifferential {
  type: 'weekend' | 'night' | 'holiday' | 'on_call' | 'split_shift';
  amount: number;
  hours: number;
  total: number;
}

/**
 * Event labor plan
 */
export interface EventLaborPlan {
  id: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  
  // Planned staffing
  positions: EventPositionPlan[];
  
  // Totals
  totalScheduledHours: number;
  totalScheduledCost: number;
  totalActualHours?: number;
  totalActualCost?: number;
  
  // Metrics
  laborCostPerGuest: number;
  laborCostPercentage: number; // Of event revenue
  efficiency?: number; // Actual vs scheduled
  
  // Status
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
  
  orgId: string;
  outletId: string;
}

export interface EventPositionPlan {
  positionId: string;
  positionName: string;
  department: LaborDepartment;
  
  // Planning
  staffCount: number;
  hoursPerPerson: number;
  totalHours: number;
  
  // Costs
  hourlyRate: number;
  estimatedCost: number;
  
  // Assignments
  assignedEmployees: string[];
  shifts: string[]; // Shift IDs
  
  // Phase breakdown
  setupHours: number;
  serviceHours: number;
  breakdownHours: number;
}

/**
 * Labor cost summary for P&L
 */
export interface LaborCostSummary {
  period: {
    start: string;
    end: string;
  };
  outletId: string;
  
  // Totals
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalDoubleTimeHours: number;
  totalHours: number;
  
  totalRegularCost: number;
  totalOvertimeCost: number;
  totalDoubleTimeCost: number;
  totalDifferentials: number;
  totalLaborCost: number;
  
  // By department
  departmentBreakdown: DepartmentLaborCost[];
  
  // By event
  eventBreakdown: EventLaborCost[];
  
  // Metrics
  laborCostPercentage: number; // Of revenue
  averageHourlyRate: number;
  overtimePercentage: number;
  
  // Variance
  scheduledCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
}

export interface DepartmentLaborCost {
  department: LaborDepartment;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  totalCost: number;
  headcount: number;
  averageRate: number;
  costPercentage: number;
}

export interface EventLaborCost {
  eventId: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  scheduledHours: number;
  actualHours: number;
  scheduledCost: number;
  actualCost: number;
  variance: number;
  laborCostPerGuest: number;
  efficiency: number;
}

/**
 * Payroll rules configuration
 */
export interface PayrollRules {
  // Overtime thresholds
  dailyOvertimeThreshold: number; // Hours after which OT starts (e.g., 8)
  weeklyOvertimeThreshold: number; // Hours after which OT starts (e.g., 40)
  dailyDoubleTimeThreshold?: number; // Hours after which DT starts (e.g., 12)
  
  // Seventh consecutive day rules
  seventhDayOvertimeMultiplier: number;
  seventhDayDoubleTimeAfterHours?: number;
  
  // Meal break rules
  mealBreakRequiredAfterHours: number;
  mealBreakDurationMinutes: number;
  mealBreakPenaltyAmount: number; // If break not provided
  
  // Rest period rules
  minimumRestBetweenShifts: number; // Hours
  restPeriodViolationPenalty: number;
  
  // Split shift rules
  splitShiftPremiumAmount: number;
  splitShiftDefinitionGapHours: number;
  
  // Holiday calendar
  holidays: string[]; // Dates (YYYY-MM-DD)
  holidayMultiplier: number;
  
  // State/jurisdiction specific
  jurisdiction: string;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_POSITION_CONFIGS: PositionConfig[] = [
  {
    id: 'server',
    code: 'SVR',
    name: 'Server',
    department: 'service',
    guestsPerStaff: 20,
    minimumStaff: 2,
    maximumStaff: 30,
    baseHourlyRate: 15.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 0,
    nightDifferential: 1.00,
    holidayMultiplier: 2.0,
    minimumShiftHours: 4,
    maximumShiftHours: 10,
    breakRequiredAfterHours: 6,
    breakDurationMinutes: 30,
    requiredSkills: ['food_service'],
    preferredSkills: ['wine_knowledge', 'pos_system'],
  },
  {
    id: 'bartender',
    code: 'BAR',
    name: 'Bartender',
    department: 'bar',
    guestsPerStaff: 50,
    minimumStaff: 1,
    maximumStaff: 10,
    baseHourlyRate: 18.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 2.00,
    nightDifferential: 2.00,
    holidayMultiplier: 2.0,
    minimumShiftHours: 4,
    maximumShiftHours: 10,
    breakRequiredAfterHours: 6,
    breakDurationMinutes: 30,
    requiredSkills: ['bartending', 'alcohol_service'],
    preferredSkills: ['craft_cocktails', 'wine_knowledge'],
  },
  {
    id: 'cook',
    code: 'COOK',
    name: 'Line Cook',
    department: 'kitchen',
    guestsPerStaff: 25,
    minimumStaff: 2,
    maximumStaff: 20,
    baseHourlyRate: 20.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 1.00,
    nightDifferential: 1.50,
    holidayMultiplier: 2.0,
    minimumShiftHours: 6,
    maximumShiftHours: 12,
    breakRequiredAfterHours: 5,
    breakDurationMinutes: 30,
    requiredSkills: ['cooking', 'food_safety'],
    preferredSkills: ['grill', 'saute', 'prep'],
  },
  {
    id: 'sous_chef',
    code: 'SOUS',
    name: 'Sous Chef',
    department: 'kitchen',
    guestsPerStaff: 100,
    minimumStaff: 1,
    maximumStaff: 4,
    baseHourlyRate: 28.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 0,
    nightDifferential: 0,
    holidayMultiplier: 1.5,
    minimumShiftHours: 8,
    maximumShiftHours: 14,
    breakRequiredAfterHours: 6,
    breakDurationMinutes: 30,
    requiredSkills: ['cooking', 'food_safety', 'leadership'],
    preferredSkills: ['menu_development', 'costing'],
  },
  {
    id: 'banquet_server',
    code: 'BSRV',
    name: 'Banquet Server',
    department: 'banquets',
    guestsPerStaff: 15,
    minimumStaff: 4,
    maximumStaff: 50,
    baseHourlyRate: 16.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 1.00,
    nightDifferential: 0,
    holidayMultiplier: 2.0,
    minimumShiftHours: 4,
    maximumShiftHours: 10,
    breakRequiredAfterHours: 6,
    breakDurationMinutes: 30,
    requiredSkills: ['banquet_service'],
    preferredSkills: ['wine_service', 'buffet_setup'],
  },
  {
    id: 'banquet_captain',
    code: 'BCAP',
    name: 'Banquet Captain',
    department: 'banquets',
    guestsPerStaff: 75,
    minimumStaff: 1,
    maximumStaff: 6,
    baseHourlyRate: 22.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 2.00,
    nightDifferential: 0,
    holidayMultiplier: 2.0,
    minimumShiftHours: 6,
    maximumShiftHours: 12,
    breakRequiredAfterHours: 6,
    breakDurationMinutes: 30,
    requiredSkills: ['banquet_service', 'leadership'],
    preferredSkills: ['event_coordination', 'client_relations'],
  },
  {
    id: 'steward',
    code: 'STEW',
    name: 'Steward/Dishwasher',
    department: 'stewarding',
    guestsPerStaff: 40,
    minimumStaff: 2,
    maximumStaff: 15,
    baseHourlyRate: 14.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 0,
    nightDifferential: 0.50,
    holidayMultiplier: 1.5,
    minimumShiftHours: 4,
    maximumShiftHours: 10,
    breakRequiredAfterHours: 6,
    breakDurationMinutes: 30,
    requiredSkills: ['sanitation'],
    preferredSkills: [],
  },
  {
    id: 'pastry_chef',
    code: 'PAST',
    name: 'Pastry Chef',
    department: 'pastry',
    guestsPerStaff: 100,
    minimumStaff: 1,
    maximumStaff: 5,
    baseHourlyRate: 25.00,
    overtimeMultiplier: 1.5,
    doubleTimeMultiplier: 2.0,
    weekendDifferential: 0,
    nightDifferential: 0,
    holidayMultiplier: 1.5,
    minimumShiftHours: 6,
    maximumShiftHours: 12,
    breakRequiredAfterHours: 6,
    breakDurationMinutes: 30,
    requiredSkills: ['pastry', 'baking'],
    preferredSkills: ['chocolate', 'sugar_work', 'cake_decorating'],
  },
];

const DEFAULT_PAYROLL_RULES: PayrollRules = {
  dailyOvertimeThreshold: 8,
  weeklyOvertimeThreshold: 40,
  dailyDoubleTimeThreshold: 12,
  seventhDayOvertimeMultiplier: 1.5,
  seventhDayDoubleTimeAfterHours: 8,
  mealBreakRequiredAfterHours: 5,
  mealBreakDurationMinutes: 30,
  mealBreakPenaltyAmount: 15.00,
  minimumRestBetweenShifts: 8,
  restPeriodViolationPenalty: 50.00,
  splitShiftPremiumAmount: 10.00,
  splitShiftDefinitionGapHours: 2,
  holidays: [],
  holidayMultiplier: 2.0,
  jurisdiction: 'CA', // California - strictest rules as default
};

// ============================================================================
// LABOR COST INTEGRATION ENGINE
// ============================================================================

export class LaborCostEngine {
  // Configuration stores
  private positionConfigs: Map<string, PositionConfig> = new Map();
  private payrollRules: Map<string, PayrollRules> = new Map(); // By org/jurisdiction
  
  // Data stores
  private shifts: Map<string, Shift> = new Map();
  private laborPlans: Map<string, EventLaborPlan> = new Map();
  private employeeWeeklyHours: Map<string, Map<string, number>> = new Map(); // employee -> week -> hours

  constructor() {
    // Initialize default position configs
    for (const config of DEFAULT_POSITION_CONFIGS) {
      this.positionConfigs.set(config.id, config);
    }
    
    this.initializeEventListeners();
    logger.info('[LaborCostEngine] Initialized with default position configs');
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private initializeEventListeners(): void {
    // Listen for BEO approvals to auto-generate labor plans
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.BEO_APPROVED, async (event) => {
      await this.autoGenerateLaborPlan(event.payload);
    });

    // Listen for shift completions to update costs
    unifiedEventBus.subscribe('shift:completed', async (event) => {
      await this.processCompletedShift(event.payload);
    });

    logger.info('[LaborCostEngine] Event listeners initialized');
  }

  // ============================================================================
  // AUTO-PLANNING (Guest Count Ratios)
  // ============================================================================

  /**
   * Auto-generate labor plan for an event based on guest count
   */
  async autoGenerateLaborPlan(params: {
    eventId: string;
    eventName: string;
    eventDate: string;
    eventType: string;
    guestCount: number;
    eventRevenue?: number;
    eventDurationHours?: number;
    outletId: string;
    orgId: string;
    menuSelections?: any[];
  }): Promise<EventLaborPlan> {
    logger.info(`[LaborCostEngine] Auto-generating labor plan for event ${params.eventId}`);

    const positions: EventPositionPlan[] = [];
    let totalHours = 0;
    let totalCost = 0;

    // Determine event duration (default 6 hours if not specified)
    const serviceDuration = params.eventDurationHours || 6;
    const setupHours = Math.ceil(serviceDuration * 0.25); // 25% of service for setup
    const breakdownHours = Math.ceil(serviceDuration * 0.15); // 15% for breakdown
    const totalEventHours = serviceDuration + setupHours + breakdownHours;

    // Calculate staff needs by position based on guest count
    for (const [positionId, config] of this.positionConfigs) {
      // Skip positions not relevant to event type
      if (!this.isPositionNeededForEventType(config, params.eventType)) {
        continue;
      }

      // Calculate staff count based on ratio
      let staffCount = Math.ceil(params.guestCount / config.guestsPerStaff);
      staffCount = Math.max(staffCount, config.minimumStaff);
      if (config.maximumStaff) {
        staffCount = Math.min(staffCount, config.maximumStaff);
      }

      // Determine hours per person based on department
      let hoursPerPerson = totalEventHours;
      let positionSetupHours = setupHours;
      let positionServiceHours = serviceDuration;
      let positionBreakdownHours = breakdownHours;

      // Kitchen staff may have longer prep hours
      if (config.department === 'kitchen' || config.department === 'pastry') {
        hoursPerPerson += 2; // Additional prep time
        positionSetupHours += 2;
      }

      // Calculate costs
      const totalPositionHours = staffCount * hoursPerPerson;
      const estimatedCost = this.calculateShiftCost(
        config,
        hoursPerPerson,
        new Date(params.eventDate),
        false // Don't calculate OT at planning stage
      ) * staffCount;

      positions.push({
        positionId,
        positionName: config.name,
        department: config.department,
        staffCount,
        hoursPerPerson,
        totalHours: totalPositionHours,
        hourlyRate: config.baseHourlyRate,
        estimatedCost,
        assignedEmployees: [],
        shifts: [],
        setupHours: positionSetupHours * staffCount,
        serviceHours: positionServiceHours * staffCount,
        breakdownHours: positionBreakdownHours * staffCount,
      });

      totalHours += totalPositionHours;
      totalCost += estimatedCost;
    }

    const plan: EventLaborPlan = {
      id: crypto.randomUUID(),
      eventId: params.eventId,
      eventName: params.eventName,
      eventDate: params.eventDate,
      guestCount: params.guestCount,
      positions,
      totalScheduledHours: totalHours,
      totalScheduledCost: totalCost,
      laborCostPerGuest: totalCost / params.guestCount,
      laborCostPercentage: params.eventRevenue ? (totalCost / params.eventRevenue) * 100 : 0,
      status: 'draft',
      orgId: params.orgId,
      outletId: params.outletId,
    };

    this.laborPlans.set(plan.id, plan);

    // Emit labor plan created event
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.LABOR_PLAN_GENERATED, {
      planId: plan.id,
      eventId: params.eventId,
      totalHours,
      totalCost,
      positionCount: positions.length,
    }, {
      source: { bus: 'unified', module: 'labor_cost_engine' },
      tenantId: params.orgId,
      outletId: params.outletId,
    });

    logger.info(`[LaborCostEngine] Generated labor plan: ${positions.length} positions, ${totalHours} hours, $${totalCost.toFixed(2)} estimated cost`);

    return plan;
  }

  /**
   * Determine if position is needed for event type
   */
  private isPositionNeededForEventType(config: PositionConfig, eventType: string): boolean {
    const eventPositionMap: Record<string, LaborDepartment[]> = {
      'banquet': ['kitchen', 'banquets', 'stewarding', 'pastry', 'bar', 'management'],
      'wedding': ['kitchen', 'banquets', 'stewarding', 'pastry', 'bar', 'management'],
      'corporate': ['kitchen', 'banquets', 'stewarding', 'bar', 'management'],
      'private_dining': ['kitchen', 'service', 'bar', 'stewarding'],
      'cocktail_reception': ['bar', 'service', 'kitchen', 'stewarding'],
      'gala': ['kitchen', 'banquets', 'stewarding', 'pastry', 'bar', 'management'],
    };

    const neededDepartments = eventPositionMap[eventType] || 
      ['kitchen', 'service', 'bar', 'stewarding'];

    return neededDepartments.includes(config.department);
  }

  // ============================================================================
  // COST CALCULATION (OT/Premium Pay)
  // ============================================================================

  /**
   * Calculate shift cost with overtime, differentials, etc.
   */
  calculateShiftCost(
    config: PositionConfig,
    hours: number,
    date: Date,
    calculateOT: boolean = true,
    weeklyHoursWorked: number = 0
  ): number {
    const rules = this.getPayrollRules('default');
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = rules.holidays.includes(date.toISOString().split('T')[0]);
    
    let totalCost = 0;
    let remainingHours = hours;
    
    // Calculate regular hours (up to daily threshold)
    let regularHours = 0;
    let overtimeHours = 0;
    let doubleTimeHours = 0;
    
    if (calculateOT) {
      // Check weekly overtime first
      const weeklyOTStart = Math.max(0, rules.weeklyOvertimeThreshold - weeklyHoursWorked);
      const weeklyRegular = Math.min(hours, weeklyOTStart);
      
      // Then check daily limits
      regularHours = Math.min(weeklyRegular, rules.dailyOvertimeThreshold);
      remainingHours -= regularHours;
      
      if (remainingHours > 0 && rules.dailyDoubleTimeThreshold) {
        // OT hours (between 8-12 typically)
        overtimeHours = Math.min(remainingHours, rules.dailyDoubleTimeThreshold - rules.dailyOvertimeThreshold);
        remainingHours -= overtimeHours;
        
        // DT hours (after 12)
        doubleTimeHours = remainingHours;
      } else {
        overtimeHours = remainingHours;
      }
    } else {
      regularHours = hours;
    }
    
    // Calculate base pay
    let baseRate = config.baseHourlyRate;
    
    // Apply holiday multiplier to base rate
    if (isHoliday) {
      baseRate *= config.holidayMultiplier;
    }
    
    // Calculate costs by hour type
    totalCost += regularHours * baseRate;
    totalCost += overtimeHours * baseRate * config.overtimeMultiplier;
    totalCost += doubleTimeHours * baseRate * config.doubleTimeMultiplier;
    
    // Add differentials
    if (isWeekend && !isHoliday) {
      totalCost += hours * config.weekendDifferential;
    }
    
    // Night differential (assume 6PM-6AM)
    // Would need actual shift times for accurate calculation
    
    return totalCost;
  }

  /**
   * Calculate actual shift cost with all details
   */
  calculateActualShiftCost(shift: Shift): {
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
    regularCost: number;
    overtimeCost: number;
    doubleTimeCost: number;
    differentialsCost: number;
    totalCost: number;
  } {
    const config = this.positionConfigs.get(shift.positionId);
    if (!config) {
      return {
        regularHours: shift.actualHours || shift.scheduledHours,
        overtimeHours: 0,
        doubleTimeHours: 0,
        regularCost: (shift.actualHours || shift.scheduledHours) * 20,
        overtimeCost: 0,
        doubleTimeCost: 0,
        differentialsCost: 0,
        totalCost: (shift.actualHours || shift.scheduledHours) * 20,
      };
    }

    const rules = this.getPayrollRules(shift.orgId);
    const date = new Date(shift.scheduledDate);
    const hours = shift.actualHours || shift.scheduledHours;
    
    // Get employee's weekly hours
    const weeklyHours = this.getEmployeeWeeklyHours(shift.employeeId, shift.scheduledDate);
    
    // Calculate hour types
    const weeklyOTStart = Math.max(0, rules.weeklyOvertimeThreshold - weeklyHours);
    const dailyRegular = Math.min(hours, rules.dailyOvertimeThreshold);
    const regularHours = Math.min(dailyRegular, weeklyOTStart);
    
    let remainingHours = hours - regularHours;
    let overtimeHours = 0;
    let doubleTimeHours = 0;
    
    if (rules.dailyDoubleTimeThreshold) {
      overtimeHours = Math.min(remainingHours, rules.dailyDoubleTimeThreshold - rules.dailyOvertimeThreshold);
      doubleTimeHours = Math.max(0, remainingHours - overtimeHours);
    } else {
      overtimeHours = remainingHours;
    }
    
    // Calculate costs
    const isHoliday = rules.holidays.includes(shift.scheduledDate);
    const baseRate = isHoliday ? 
      config.baseHourlyRate * config.holidayMultiplier : 
      config.baseHourlyRate;
    
    const regularCost = regularHours * baseRate;
    const overtimeCost = overtimeHours * baseRate * config.overtimeMultiplier;
    const doubleTimeCost = doubleTimeHours * baseRate * config.doubleTimeMultiplier;
    
    // Calculate differentials
    let differentialsCost = 0;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (isWeekend && !isHoliday) {
      differentialsCost += hours * config.weekendDifferential;
    }
    
    const totalCost = regularCost + overtimeCost + doubleTimeCost + differentialsCost;
    
    return {
      regularHours,
      overtimeHours,
      doubleTimeHours,
      regularCost,
      overtimeCost,
      doubleTimeCost,
      differentialsCost,
      totalCost,
    };
  }

  // ============================================================================
  // SHIFT MANAGEMENT
  // ============================================================================

  /**
   * Create shifts from labor plan
   */
  async createShiftsFromPlan(
    planId: string,
    assignments: Array<{
      positionId: string;
      employeeId: string;
      employeeName: string;
      startTime: string;
      endTime: string;
    }>
  ): Promise<Shift[]> {
    const plan = this.laborPlans.get(planId);
    if (!plan) {
      throw new Error(`Labor plan not found: ${planId}`);
    }

    const createdShifts: Shift[] = [];

    for (const assignment of assignments) {
      const positionPlan = plan.positions.find(p => p.positionId === assignment.positionId);
      const config = this.positionConfigs.get(assignment.positionId);
      
      if (!positionPlan || !config) continue;

      const scheduledHours = this.calculateHoursBetween(assignment.startTime, assignment.endTime);
      const costCalc = this.calculateActualShiftCost({
        ...assignment,
        scheduledDate: plan.eventDate,
        scheduledHours,
        positionName: config.name,
        department: config.department,
        orgId: plan.orgId,
        outletId: plan.outletId,
      } as any);

      const shift: Shift = {
        id: crypto.randomUUID(),
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        positionId: assignment.positionId,
        positionName: config.name,
        department: config.department,
        scheduledDate: plan.eventDate,
        scheduledStart: assignment.startTime,
        scheduledEnd: assignment.endTime,
        scheduledHours,
        eventId: plan.eventId,
        eventName: plan.eventName,
        regularHours: costCalc.regularHours,
        overtimeHours: costCalc.overtimeHours,
        doubleTimeHours: costCalc.doubleTimeHours,
        regularRate: config.baseHourlyRate,
        overtimeRate: config.baseHourlyRate * config.overtimeMultiplier,
        doubleTimeRate: config.baseHourlyRate * config.doubleTimeMultiplier,
        differentials: [],
        totalCost: costCalc.totalCost,
        status: 'scheduled',
        orgId: plan.orgId,
        outletId: plan.outletId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.shifts.set(shift.id, shift);
      
      // Add shift to position plan
      positionPlan.shifts.push(shift.id);
      positionPlan.assignedEmployees.push(assignment.employeeId);

      // Track weekly hours
      this.addEmployeeWeeklyHours(assignment.employeeId, plan.eventDate, scheduledHours);

      createdShifts.push(shift);
    }

    // Update plan totals
    this.recalculatePlanTotals(planId);

    logger.info(`[LaborCostEngine] Created ${createdShifts.length} shifts for plan ${planId}`);

    return createdShifts;
  }

  /**
   * Record actual shift completion
   */
  async completeShift(
    shiftId: string,
    actualStart: string,
    actualEnd: string,
    breakMinutes: number = 0
  ): Promise<Shift> {
    const shift = this.shifts.get(shiftId);
    if (!shift) {
      throw new Error(`Shift not found: ${shiftId}`);
    }

    // Calculate actual hours
    const actualHours = this.calculateHoursBetween(actualStart, actualEnd) - (breakMinutes / 60);
    
    // Update shift
    shift.actualStart = actualStart;
    shift.actualEnd = actualEnd;
    shift.actualHours = actualHours;
    shift.breakMinutes = breakMinutes;
    shift.status = 'completed';
    shift.updatedAt = new Date().toISOString();

    // Recalculate cost with actual hours
    const costCalc = this.calculateActualShiftCost(shift);
    shift.regularHours = costCalc.regularHours;
    shift.overtimeHours = costCalc.overtimeHours;
    shift.doubleTimeHours = costCalc.doubleTimeHours;
    shift.totalCost = costCalc.totalCost;

    this.shifts.set(shiftId, shift);

    // Update labor plan if associated
    if (shift.eventId) {
      const plan = Array.from(this.laborPlans.values()).find(p => p.eventId === shift.eventId);
      if (plan) {
        this.recalculatePlanActuals(plan.id);
      }
    }

    // Emit event for P&L updates
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.COST_UPDATED, {
      type: 'labor',
      shiftId,
      eventId: shift.eventId,
      actualCost: shift.totalCost,
      hours: actualHours,
    }, {
      source: { bus: 'unified', module: 'labor_cost_engine' },
      tenantId: shift.orgId,
      outletId: shift.outletId,
    });

    return shift;
  }

  /**
   * Process completed shift (called from event listener)
   */
  private async processCompletedShift(payload: any): Promise<void> {
    // Handle shift completion events from Schedule module
  }

  // ============================================================================
  // P&L INTEGRATION
  // ============================================================================

  /**
   * Get labor cost summary for P&L
   */
  getLaborCostSummary(
    orgId: string,
    outletId: string,
    startDate: string,
    endDate: string,
    totalRevenue?: number
  ): LaborCostSummary {
    // Filter shifts for the period
    const periodShifts = Array.from(this.shifts.values()).filter(s =>
      s.orgId === orgId &&
      s.outletId === outletId &&
      s.scheduledDate >= startDate &&
      s.scheduledDate <= endDate &&
      s.status === 'completed'
    );

    // Calculate totals
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalDoubleTimeHours = 0;
    let totalRegularCost = 0;
    let totalOvertimeCost = 0;
    let totalDoubleTimeCost = 0;
    let totalDifferentials = 0;

    const departmentData = new Map<LaborDepartment, {
      regularHours: number;
      overtimeHours: number;
      totalCost: number;
      headcount: Set<string>;
    }>();

    const eventData = new Map<string, {
      eventName: string;
      eventDate: string;
      guestCount: number;
      scheduledHours: number;
      actualHours: number;
      scheduledCost: number;
      actualCost: number;
    }>();

    for (const shift of periodShifts) {
      totalRegularHours += shift.regularHours;
      totalOvertimeHours += shift.overtimeHours;
      totalDoubleTimeHours += shift.doubleTimeHours;
      
      const config = this.positionConfigs.get(shift.positionId);
      const regularCost = shift.regularHours * shift.regularRate;
      const overtimeCost = shift.overtimeHours * shift.overtimeRate;
      const doubleTimeCost = shift.doubleTimeHours * shift.doubleTimeRate;
      const diffCost = shift.differentials.reduce((sum, d) => sum + d.total, 0);

      totalRegularCost += regularCost;
      totalOvertimeCost += overtimeCost;
      totalDoubleTimeCost += doubleTimeCost;
      totalDifferentials += diffCost;

      // Department aggregation
      const dept = shift.department;
      const deptData = departmentData.get(dept) || {
        regularHours: 0,
        overtimeHours: 0,
        totalCost: 0,
        headcount: new Set<string>(),
      };
      deptData.regularHours += shift.regularHours;
      deptData.overtimeHours += shift.overtimeHours;
      deptData.totalCost += shift.totalCost;
      deptData.headcount.add(shift.employeeId);
      departmentData.set(dept, deptData);

      // Event aggregation
      if (shift.eventId) {
        const evtData = eventData.get(shift.eventId) || {
          eventName: shift.eventName || '',
          eventDate: shift.scheduledDate,
          guestCount: 0,
          scheduledHours: 0,
          actualHours: 0,
          scheduledCost: 0,
          actualCost: 0,
        };
        evtData.scheduledHours += shift.scheduledHours;
        evtData.actualHours += shift.actualHours || shift.scheduledHours;
        evtData.actualCost += shift.totalCost;
        eventData.set(shift.eventId, evtData);
      }
    }

    const totalHours = totalRegularHours + totalOvertimeHours + totalDoubleTimeHours;
    const totalLaborCost = totalRegularCost + totalOvertimeCost + totalDoubleTimeCost + totalDifferentials;

    // Build department breakdown
    const departmentBreakdown: DepartmentLaborCost[] = [];
    for (const [dept, data] of departmentData) {
      departmentBreakdown.push({
        department: dept,
        regularHours: data.regularHours,
        overtimeHours: data.overtimeHours,
        totalHours: data.regularHours + data.overtimeHours,
        totalCost: data.totalCost,
        headcount: data.headcount.size,
        averageRate: data.totalCost / (data.regularHours + data.overtimeHours) || 0,
        costPercentage: totalLaborCost > 0 ? (data.totalCost / totalLaborCost) * 100 : 0,
      });
    }

    // Build event breakdown
    const eventBreakdown: EventLaborCost[] = [];
    for (const [eventId, data] of eventData) {
      const plan = Array.from(this.laborPlans.values()).find(p => p.eventId === eventId);
      const scheduledCost = plan?.totalScheduledCost || data.actualCost;
      const variance = data.actualCost - scheduledCost;

      eventBreakdown.push({
        eventId,
        eventName: data.eventName,
        eventDate: data.eventDate,
        guestCount: plan?.guestCount || 0,
        scheduledHours: data.scheduledHours,
        actualHours: data.actualHours,
        scheduledCost,
        actualCost: data.actualCost,
        variance,
        laborCostPerGuest: plan?.guestCount ? data.actualCost / plan.guestCount : 0,
        efficiency: data.scheduledHours > 0 ? (data.actualHours / data.scheduledHours) * 100 : 100,
      });
    }

    // Calculate scheduled vs actual variance
    const scheduledTotal = Array.from(this.laborPlans.values())
      .filter(p => p.orgId === orgId && p.outletId === outletId && 
        p.eventDate >= startDate && p.eventDate <= endDate)
      .reduce((sum, p) => sum + p.totalScheduledCost, 0);

    return {
      period: { start: startDate, end: endDate },
      outletId,
      totalRegularHours,
      totalOvertimeHours,
      totalDoubleTimeHours,
      totalHours,
      totalRegularCost,
      totalOvertimeCost,
      totalDoubleTimeCost,
      totalDifferentials,
      totalLaborCost,
      departmentBreakdown,
      eventBreakdown,
      laborCostPercentage: totalRevenue ? (totalLaborCost / totalRevenue) * 100 : 0,
      averageHourlyRate: totalHours > 0 ? totalLaborCost / totalHours : 0,
      overtimePercentage: totalHours > 0 ? (totalOvertimeHours + totalDoubleTimeHours) / totalHours * 100 : 0,
      scheduledCost: scheduledTotal,
      actualCost: totalLaborCost,
      variance: totalLaborCost - scheduledTotal,
      variancePercentage: scheduledTotal > 0 ? ((totalLaborCost - scheduledTotal) / scheduledTotal) * 100 : 0,
    };
  }

  /**
   * Get labor cost for a specific event (for P&L drill-down)
   */
  getEventLaborCost(eventId: string): {
    scheduledHours: number;
    actualHours: number;
    scheduledCost: number;
    actualCost: number;
    variance: number;
    positionBreakdown: Array<{
      positionName: string;
      department: string;
      staffCount: number;
      totalHours: number;
      totalCost: number;
    }>;
    shifts: Shift[];
  } {
    const eventShifts = Array.from(this.shifts.values()).filter(s => s.eventId === eventId);
    const plan = Array.from(this.laborPlans.values()).find(p => p.eventId === eventId);

    const positionData = new Map<string, {
      positionName: string;
      department: string;
      employees: Set<string>;
      hours: number;
      cost: number;
    }>();

    let actualHours = 0;
    let actualCost = 0;

    for (const shift of eventShifts) {
      const hours = shift.actualHours || shift.scheduledHours;
      actualHours += hours;
      actualCost += shift.totalCost;

      const posData = positionData.get(shift.positionId) || {
        positionName: shift.positionName,
        department: shift.department,
        employees: new Set<string>(),
        hours: 0,
        cost: 0,
      };
      posData.employees.add(shift.employeeId);
      posData.hours += hours;
      posData.cost += shift.totalCost;
      positionData.set(shift.positionId, posData);
    }

    return {
      scheduledHours: plan?.totalScheduledHours || actualHours,
      actualHours,
      scheduledCost: plan?.totalScheduledCost || actualCost,
      actualCost,
      variance: actualCost - (plan?.totalScheduledCost || actualCost),
      positionBreakdown: Array.from(positionData.values()).map(p => ({
        positionName: p.positionName,
        department: p.department,
        staffCount: p.employees.size,
        totalHours: p.hours,
        totalCost: p.cost,
      })),
      shifts: eventShifts,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getPayrollRules(orgId: string): PayrollRules {
    return this.payrollRules.get(orgId) || DEFAULT_PAYROLL_RULES;
  }

  private calculateHoursBetween(start: string, end: string): number {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  }

  private getWeekKey(dateStr: string): string {
    const date = new Date(dateStr);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek.toISOString().split('T')[0];
  }

  private getEmployeeWeeklyHours(employeeId: string, dateStr: string): number {
    const weekKey = this.getWeekKey(dateStr);
    const employeeHours = this.employeeWeeklyHours.get(employeeId);
    return employeeHours?.get(weekKey) || 0;
  }

  private addEmployeeWeeklyHours(employeeId: string, dateStr: string, hours: number): void {
    const weekKey = this.getWeekKey(dateStr);
    let employeeHours = this.employeeWeeklyHours.get(employeeId);
    if (!employeeHours) {
      employeeHours = new Map();
      this.employeeWeeklyHours.set(employeeId, employeeHours);
    }
    const current = employeeHours.get(weekKey) || 0;
    employeeHours.set(weekKey, current + hours);
  }

  private recalculatePlanTotals(planId: string): void {
    const plan = this.laborPlans.get(planId);
    if (!plan) return;

    let totalHours = 0;
    let totalCost = 0;

    for (const position of plan.positions) {
      const positionShifts = position.shifts.map(id => this.shifts.get(id)).filter(Boolean) as Shift[];
      const positionHours = positionShifts.reduce((sum, s) => sum + s.scheduledHours, 0);
      const positionCost = positionShifts.reduce((sum, s) => sum + s.totalCost, 0);

      position.totalHours = positionHours;
      position.estimatedCost = positionCost;

      totalHours += positionHours;
      totalCost += positionCost;
    }

    plan.totalScheduledHours = totalHours;
    plan.totalScheduledCost = totalCost;
    plan.laborCostPerGuest = totalCost / plan.guestCount;

    this.laborPlans.set(planId, plan);
  }

  private recalculatePlanActuals(planId: string): void {
    const plan = this.laborPlans.get(planId);
    if (!plan) return;

    let totalActualHours = 0;
    let totalActualCost = 0;

    for (const position of plan.positions) {
      const positionShifts = position.shifts.map(id => this.shifts.get(id)).filter(Boolean) as Shift[];
      const completedShifts = positionShifts.filter(s => s.status === 'completed');
      
      const actualHours = completedShifts.reduce((sum, s) => sum + (s.actualHours || s.scheduledHours), 0);
      const actualCost = completedShifts.reduce((sum, s) => sum + s.totalCost, 0);

      totalActualHours += actualHours;
      totalActualCost += actualCost;
    }

    plan.totalActualHours = totalActualHours;
    plan.totalActualCost = totalActualCost;
    plan.efficiency = plan.totalScheduledHours > 0 ? 
      (totalActualHours / plan.totalScheduledHours) * 100 : 100;

    this.laborPlans.set(planId, plan);
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  setPositionConfig(config: PositionConfig): void {
    this.positionConfigs.set(config.id, config);
  }

  getPositionConfig(positionId: string): PositionConfig | undefined {
    return this.positionConfigs.get(positionId);
  }

  getAllPositionConfigs(): PositionConfig[] {
    return Array.from(this.positionConfigs.values());
  }

  setPayrollRules(orgId: string, rules: PayrollRules): void {
    this.payrollRules.set(orgId, rules);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getLaborPlan(planId: string): EventLaborPlan | undefined {
    return this.laborPlans.get(planId);
  }

  getEventLaborPlan(eventId: string): EventLaborPlan | undefined {
    return Array.from(this.laborPlans.values()).find(p => p.eventId === eventId);
  }

  getShift(shiftId: string): Shift | undefined {
    return this.shifts.get(shiftId);
  }

  getStats(): {
    totalPlans: number;
    totalShifts: number;
    completedShifts: number;
    positionConfigs: number;
  } {
    const shifts = Array.from(this.shifts.values());
    return {
      totalPlans: this.laborPlans.size,
      totalShifts: shifts.length,
      completedShifts: shifts.filter(s => s.status === 'completed').length,
      positionConfigs: this.positionConfigs.size,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const laborCostEngine = new LaborCostEngine();

export default laborCostEngine;
