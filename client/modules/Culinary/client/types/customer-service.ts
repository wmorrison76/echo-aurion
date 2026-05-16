// Core types for managing customers, service concepts, events, and seasonal menus

export type ServiceType = "dine-in" | "takeout" | "delivery" | "catering" | "ghost-kitchen";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type Season = "spring" | "summer" | "fall" | "winter" | "custom";

// Customer profile types
export type CustomerProfile = {
  id: string;
  name: string;
  type: "individual" | "corporate" | "group" | "vip";
  email?: string;
  phone?: string;
  preferredServiceType: ServiceType;
  dietaryRestrictions: string[];
  allergies: string[];
  preferredMenuItems: string[]; // Recipe IDs
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

// Service concept - defines how service works (e.g., "Fine Dining", "Casual Counter", "Private Events")
export type ServiceConcept = {
  id: string;
  name: string;
  description?: string;
  serviceType: ServiceType;
  capacity: number;
  averageCheckSize: number; // Expected spend per customer
  seatingTime: number; // Minutes - how long customer typically stays
  serviceLevel: "quick" | "standard" | "premium"; // Impacts staffing & prep time
  defaultMenuId?: string; // Default menu for this service
  allowedPaymentMethods: string[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

// Operating hours for a service concept
export type ServiceHours = {
  id: string;
  serviceConcptId: string;
  dayOfWeek: DayOfWeek;
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
  isOpen: boolean;
  seatingCutoff?: string; // When to stop accepting new tables
};

// Event - special service occasion (e.g., private dinner, catering event, holiday service)
export type ServiceEvent = {
  id: string;
  serviceConcptId: string;
  name: string;
  description?: string;
  eventType: "regular" | "special" | "private" | "catering" | "holiday";
  date: number; // timestamp
  duration: number; // minutes
  expectedCovers: number;
  confirmedCovers?: number;
  customers: string[]; // Customer IDs
  assignedMenuId?: string;
  notes?: string;
  status: "planned" | "confirmed" | "in-progress" | "completed" | "cancelled";
  createdAt: number;
  updatedAt: number;
};

// Seasonal menu - variation of menu by season
export type SeasonalMenu = {
  id: string;
  season: Season;
  year?: number; // For custom seasons
  startDate: number;
  endDate: number;
  baseMenuId: string; // Parent menu
  modifications: MenuModification[];
  notes?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

// How a seasonal menu modifies the base menu
export type MenuModification = {
  type: "add" | "remove" | "replace" | "adjust-price";
  recipeId: string;
  newRecipeId?: string; // For "replace" type
  newPrice?: number; // For "adjust-price" type
  reason?: string;
};

// Cover type - used to segment revenue and costing (e.g., "Dinner", "Lunch", "Private Events")
export type CoverType = {
  id: string;
  serviceConcptId: string;
  name: string;
  sequenceInMenu: number;
  expectedPricePoint: number; // Average entree price
  profitTargetPercent: number; // Target profit margin %
  costTargetPercent: number; // Target COGS %
  platingStandard?: string; // Description of plating complexity
};

// Service shift scheduling
export type ServiceShift = {
  id: string;
  serviceConcptId: string;
  name: string;
  date: number;
  startTime: string;
  endTime: string;
  expectedCovers: number;
  confirmedCovers?: number;
  stations: StationAssignment[];
  notes?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  createdAt: number;
  updatedAt: number;
};

export type StationAssignment = {
  stationId: string;
  stationName: string;
  headCount: number;
  leadStaffId?: string;
  requiredSkillLevel: "junior" | "intermediate" | "senior" | "chef";
  assignments: { staffId: string; role: string }[];
};

// Comping strategy - rules for comped courses/items
export type CompStrategy = {
  id: string;
  serviceConcptId: string;
  name: string;
  triggerCondition: "customer-milestone" | "complaint" | "vip" | "promotional" | "seasonal";
  applicableCovers: string[]; // CoverType IDs
  maxCompValue: number;
  compFrequency: "per-shift" | "per-day" | "per-week" | "unlimited";
  requiresApproval: boolean;
  approverRole?: string;
  description?: string;
};

export type CompRecord = {
  id: string;
  strategyId: string;
  eventId: string;
  customerId?: string;
  recipeId: string;
  costValue: number;
  reason: string;
  approvedBy?: string;
  timestamp: number;
};

// Revenue by cover type (used in financial tracking)
export type CoverRevenue = {
  id: string;
  eventId: string;
  coverTypeId: string;
  coverCount: number;
  averageSpend: number;
  totalRevenue: number;
  totalCost: number;
  wasteAmount: number;
  profitMargin: number;
  timestamp: number;
};

// Metrics for service performance
export type ServiceMetrics = {
  serviceConcptId: string;
  period: { startDate: number; endDate: number };
  totalCovers: number;
  averageCheckSize: number;
  laborCostPercent: number;
  foodCostPercent: number;
  wastePercent: number;
  turnoverRate: number; // Covers per available seating per service
  customerSatisfaction?: number; // 1-5 scale
};
