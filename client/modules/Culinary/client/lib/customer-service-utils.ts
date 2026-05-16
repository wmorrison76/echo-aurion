import type {
  CustomerProfile,
  ServiceConcept,
  ServiceHours,
  ServiceEvent,
  CoverType,
  CompStrategy,
  CompRecord,
  SeasonalMenu,
  DayOfWeek,
} from "@/types/customer-service";
import {
  MOCK_CUSTOMERS,
  MOCK_SERVICE_CONCEPTS,
  MOCK_SERVICE_HOURS,
  MOCK_SERVICE_EVENTS,
  MOCK_COVER_TYPES,
  MOCK_COMP_STRATEGIES,
  MOCK_COMP_RECORDS,
  MOCK_SEASONAL_MENUS,
} from "@/data/customer-service";

// Customer utilities
export function getCustomerById(id: string): CustomerProfile | undefined {
  return MOCK_CUSTOMERS.find((c) => c.id === id);
}

export function getAllCustomers(): CustomerProfile[] {
  return [...MOCK_CUSTOMERS];
}

export function getCustomersByType(type: CustomerProfile["type"]): CustomerProfile[] {
  return MOCK_CUSTOMERS.filter((c) => c.type === type);
}

export function getVIPCustomers(): CustomerProfile[] {
  return getCustomersByType("vip");
}

export function filterCustomersByAllergen(allergen: string): CustomerProfile[] {
  return MOCK_CUSTOMERS.filter((c) => c.allergies.includes(allergen));
}

export function filterCustomersByDietaryRestriction(
  restriction: string,
): CustomerProfile[] {
  return MOCK_CUSTOMERS.filter((c) => c.dietaryRestrictions.includes(restriction));
}

// Service concept utilities
export function getServiceConceptById(id: string): ServiceConcept | undefined {
  return MOCK_SERVICE_CONCEPTS.find((s) => s.id === id);
}

export function getAllServiceConcepts(): ServiceConcept[] {
  return [...MOCK_SERVICE_CONCEPTS];
}

export function getEnabledServiceConcepts(): ServiceConcept[] {
  return MOCK_SERVICE_CONCEPTS.filter((s) => s.enabled);
}

export function getServiceConceptsByType(
  serviceType: ServiceConcept["serviceType"],
): ServiceConcept[] {
  return MOCK_SERVICE_CONCEPTS.filter((s) => s.serviceType === serviceType);
}

// Service hours utilities
export function getServiceHoursById(id: string): ServiceHours | undefined {
  return MOCK_SERVICE_HOURS.find((h) => h.id === id);
}

export function getServiceHoursByServiceConcept(
  serviceConcptId: string,
): ServiceHours[] {
  return MOCK_SERVICE_HOURS.filter((h) => h.serviceConcptId === serviceConcptId);
}

export function getServiceHoursByDay(
  serviceConcptId: string,
  dayOfWeek: DayOfWeek,
): ServiceHours | undefined {
  return MOCK_SERVICE_HOURS.find(
    (h) => h.serviceConcptId === serviceConcptId && h.dayOfWeek === dayOfWeek,
  );
}

export function isServiceOpenOnDay(
  serviceConcptId: string,
  dayOfWeek: DayOfWeek,
): boolean {
  const hours = getServiceHoursByDay(serviceConcptId, dayOfWeek);
  return hours ? hours.isOpen : false;
}

export function getOperatingDays(serviceConcptId: string): DayOfWeek[] {
  return getServiceHoursByServiceConcept(serviceConcptId)
    .filter((h) => h.isOpen)
    .map((h) => h.dayOfWeek);
}

// Service event utilities
export function getServiceEventById(id: string): ServiceEvent | undefined {
  return MOCK_SERVICE_EVENTS.find((e) => e.id === id);
}

export function getAllServiceEvents(): ServiceEvent[] {
  return [...MOCK_SERVICE_EVENTS];
}

export function getServiceEventsByServiceConcept(
  serviceConcptId: string,
): ServiceEvent[] {
  return MOCK_SERVICE_EVENTS.filter((e) => e.serviceConcptId === serviceConcptId);
}

export function getUpcomingServiceEvents(days: number = 30): ServiceEvent[] {
  const now = Date.now();
  const cutoff = now + days * 24 * 60 * 60 * 1000;
  return MOCK_SERVICE_EVENTS.filter(
    (e) => e.date >= now && e.date <= cutoff && e.status !== "cancelled",
  ).sort((a, b) => a.date - b.date);
}

export function getPastServiceEvents(days: number = 30): ServiceEvent[] {
  const now = Date.now();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return MOCK_SERVICE_EVENTS.filter((e) => e.date >= cutoff && e.date < now).sort(
    (a, b) => b.date - a.date,
  );
}

export function getServiceEventsByCustomer(customerId: string): ServiceEvent[] {
  return MOCK_SERVICE_EVENTS.filter((e) => e.customers.includes(customerId));
}

export function getTotalConfirmedCovers(eventId: string): number {
  const event = getServiceEventById(eventId);
  return event ? event.confirmedCovers ?? event.expectedCovers : 0;
}

export function getAvailableSeating(eventId: string, serviceConcptId: string): number {
  const event = getServiceEventById(eventId);
  const serviceConcept = getServiceConceptById(serviceConcptId);
  if (!event || !serviceConcept) return 0;
  const confirmedCovers = event.confirmedCovers ?? event.expectedCovers;
  return Math.max(0, serviceConcept.capacity - confirmedCovers);
}

// Cover type utilities
export function getCoverTypeById(id: string): CoverType | undefined {
  return MOCK_COVER_TYPES.find((c) => c.id === id);
}

export function getCoverTypesByServiceConcept(serviceConcptId: string): CoverType[] {
  return MOCK_COVER_TYPES.filter((c) => c.serviceConcptId === serviceConcptId).sort(
    (a, b) => a.sequenceInMenu - b.sequenceInMenu,
  );
}

export function getTotalExpectedCoverValue(
  eventId: string,
  serviceConcptId: string,
): number {
  const event = getServiceEventById(eventId);
  const serviceConcept = getServiceConceptById(serviceConcptId);
  if (!event || !serviceConcept) return 0;
  const confirmedCovers = event.confirmedCovers ?? event.expectedCovers;
  return confirmedCovers * serviceConcept.averageCheckSize;
}

// Comp strategy and records utilities
export function getCompStrategyById(id: string): CompStrategy | undefined {
  return MOCK_COMP_STRATEGIES.find((c) => c.id === id);
}

export function getCompStrategiesByServiceConcept(
  serviceConcptId: string,
): CompStrategy[] {
  return MOCK_COMP_STRATEGIES.filter((c) => c.serviceConcptId === serviceConcptId);
}

export function getCompStrategiesByTrigger(
  serviceConcptId: string,
  trigger: CompStrategy["triggerCondition"],
): CompStrategy[] {
  return getCompStrategiesByServiceConcept(serviceConcptId).filter(
    (c) => c.triggerCondition === trigger,
  );
}

export function getCompRecordsByEvent(eventId: string): CompRecord[] {
  return MOCK_COMP_RECORDS.filter((r) => r.eventId === eventId);
}

export function getTotalCompValue(eventId: string): number {
  return getCompRecordsByEvent(eventId).reduce((sum, r) => sum + r.costValue, 0);
}

export function getCompRecordsByCustomer(customerId: string): CompRecord[] {
  return MOCK_COMP_RECORDS.filter((r) => r.customerId === customerId);
}

export function getCompUsageForStrategy(
  strategyId: string,
  period: { startDate: number; endDate: number },
): number {
  return MOCK_COMP_RECORDS.filter(
    (r) => r.strategyId === strategyId && r.timestamp >= period.startDate && r.timestamp <= period.endDate,
  ).length;
}

export function isCompWithinLimits(
  strategy: CompStrategy,
  period: { startDate: number; endDate: number },
): boolean {
  if (strategy.compFrequency === "unlimited") return true;

  const usage = getCompUsageForStrategy(strategy.id, period);
  const limit =
    strategy.compFrequency === "per-shift"
      ? 1
      : strategy.compFrequency === "per-day"
        ? 1
        : strategy.compFrequency === "per-week"
          ? 7
          : Infinity;

  return usage < limit;
}

// Seasonal menu utilities
export function getSeasonalMenuById(id: string): SeasonalMenu | undefined {
  return MOCK_SEASONAL_MENUS.find((m) => m.id === id);
}

export function getActiveSeasonalMenus(): SeasonalMenu[] {
  const now = Date.now();
  return MOCK_SEASONAL_MENUS.filter(
    (m) => m.active && m.startDate <= now && m.endDate >= now,
  );
}

export function getSeasonalMenusByBaseMenu(baseMenuId: string): SeasonalMenu[] {
  return MOCK_SEASONAL_MENUS.filter((m) => m.baseMenuId === baseMenuId).sort(
    (a, b) => a.startDate - b.startDate,
  );
}

export function getSeasonalMenusByType(season: SeasonalMenu["season"]): SeasonalMenu[] {
  return MOCK_SEASONAL_MENUS.filter((m) => m.season === season);
}

// Revenue and profit calculations
export function calculateServiceMetrics(eventId: string): {
  totalCovers: number;
  projectedRevenue: number;
  projectedCogs: number;
  projectedProfit: number;
  profitMargin: number;
  compValue: number;
  netProfit: number;
} {
  const event = getServiceEventById(eventId);
  const serviceConcept = event ? getServiceConceptById(event.serviceConcptId) : null;

  if (!event || !serviceConcept) {
    return {
      totalCovers: 0,
      projectedRevenue: 0,
      projectedCogs: 0,
      projectedProfit: 0,
      profitMargin: 0,
      compValue: 0,
      netProfit: 0,
    };
  }

  const confirmedCovers = event.confirmedCovers ?? event.expectedCovers;
  const projectedRevenue = confirmedCovers * serviceConcept.averageCheckSize;
  const compValue = getTotalCompValue(eventId);
  const revenueAfterComp = projectedRevenue - compValue;
  const projectedCogs = revenueAfterComp * 0.35; // Assuming 35% COGS target
  const projectedProfit = revenueAfterComp - projectedCogs;
  const profitMargin =
    revenueAfterComp > 0 ? (projectedProfit / revenueAfterComp) * 100 : 0;

  return {
    totalCovers: confirmedCovers,
    projectedRevenue,
    projectedCogs,
    projectedProfit,
    profitMargin,
    compValue,
    netProfit: projectedProfit,
  };
}

export function calculateCoverMetrics(
  coverTypeId: string,
  coversCount: number,
): {
  expectedRevenue: number;
  targetCogs: number;
  targetProfit: number;
} {
  const coverType = getCoverTypeById(coverTypeId);
  if (!coverType) {
    return {
      expectedRevenue: 0,
      targetCogs: 0,
      targetProfit: 0,
    };
  }

  const expectedRevenue = coversCount * coverType.expectedPricePoint;
  const targetCogs = (expectedRevenue * coverType.costTargetPercent) / 100;
  const targetProfit = expectedRevenue - targetCogs;

  return {
    expectedRevenue,
    targetCogs,
    targetProfit,
  };
}

// Customer service history
export function getCustomerEventHistory(customerId: string): ServiceEvent[] {
  return getServiceEventsByCustomer(customerId).sort((a, b) => b.date - a.date);
}

export function getCustomerTotalEventCost(customerId: string): number {
  const events = getCustomerEventHistory(customerId);
  return events.reduce((total, event) => {
    const metrics = calculateServiceMetrics(event.id);
    return total + metrics.projectedCogs;
  }, 0);
}

export function getCustomerTotalEventRevenue(customerId: string): number {
  const events = getCustomerEventHistory(customerId);
  return events.reduce((total, event) => {
    const metrics = calculateServiceMetrics(event.id);
    return total + metrics.projectedRevenue;
  }, 0);
}
