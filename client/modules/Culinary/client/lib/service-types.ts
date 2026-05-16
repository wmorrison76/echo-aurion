// Service Types & Customer Management
// Supports multiple service concepts: à la carte, banquets, events, seasonal menus

export type ServiceType = "dine-in" | "takeout" | "delivery" | "catering" | "banquet" | "private-event";
export type MenuType = "regular" | "seasonal" | "event" | "prix-fixe" | "tasting-menu" | "custom";
export type DietaryRestriction = "vegetarian" | "vegan" | "gluten-free" | "dairy-free" | "nut-allergy" | "shellfish-allergy" | "kosher" | "halal";

export interface ServiceConcept {
  id: string;
  name: string;
  description?: string;
  serviceTypes: ServiceType[];
  menuTypes: MenuType[];
  minPartySize?: number;
  maxPartySize?: number;
  averageCheck: number;
  markupMultiplier: number; // 1.0 = base price, 1.3 = 30% markup
  active: boolean;
  createdAt: number;
}

export interface EventRequest {
  id: string;
  eventName: string;
  concept: ServiceConcept;
  eventDate: string;
  eventTime: string;
  serviceType: ServiceType;
  partySize: number;
  guestList?: Array<{
    name: string;
    dietaryRestrictions: DietaryRestriction[];
    allergies?: string[];
    specialRequests?: string;
  }>;
  menuSelections: Array<{
    recipeId: string;
    recipeName: string;
    quantity: number;
    modifications?: string;
    cost: number;
    price: number;
  }>;
  totalCost: number;
  totalPrice: number;
  profit: number;
  status: "inquiry" | "confirmed" | "completed" | "cancelled";
  createdAt: number;
  notes?: string;
}

export interface SeasonalMenu {
  id: string;
  season: "spring" | "summer" | "fall" | "winter" | "custom";
  year?: number;
  startDate: string;
  endDate: string;
  concept: ServiceConcept;
  recipeIds: string[];
  description?: string;
  theme?: string;
  active: boolean;
  createdAt: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dietaryRestrictions: DietaryRestriction[];
  allergies: string[];
  preferences?: string;
  preferredConcept?: string;
  preferredServiceType?: ServiceType;
  totalEvents?: number;
  totalSpent?: number;
  notes?: string;
  createdAt: number;
}

export interface MenuVariant {
  id: string;
  baseRecipeId: string;
  baseName: string;
  variantName: string;
  modifications: string;
  dietaryFriendly: DietaryRestriction[];
  cost: number;
  price: number;
  active: boolean;
}

// Standard service markups
const SERVICE_MARKUPS: Record<ServiceType, number> = {
  "dine-in": 1.0, // Base markup
  "takeout": 0.95, // 5% discount
  "delivery": 1.15, // 15% delivery fee
  "catering": 1.25, // 25% catering markup
  "banquet": 1.3, // 30% banquet markup
  "private-event": 1.35, // 35% private event markup
};

const DEFAULT_CONCEPTS: ServiceConcept[] = [
  {
    id: "concept-alacarte",
    name: "À la carte",
    description: "Guests order individually from full menu",
    serviceTypes: ["dine-in", "takeout"],
    menuTypes: ["regular"],
    averageCheck: 45,
    markupMultiplier: 1.0,
    active: true,
    createdAt: Date.now(),
  },
  {
    id: "concept-banquet",
    name: "Banquet",
    description: "Pre-planned group meals with set menu",
    serviceTypes: ["banquet", "private-event"],
    menuTypes: ["prix-fixe", "tasting-menu"],
    minPartySize: 10,
    maxPartySize: 500,
    averageCheck: 85,
    markupMultiplier: 1.3,
    active: true,
    createdAt: Date.now(),
  },
  {
    id: "concept-catering",
    name: "Catering",
    description: "Off-premise catering services",
    serviceTypes: ["delivery", "catering"],
    menuTypes: ["prix-fixe", "custom"],
    minPartySize: 20,
    averageCheck: 65,
    markupMultiplier: 1.25,
    active: true,
    createdAt: Date.now(),
  },
];

/**
 * Create a new service concept
 * @param concept - Service concept details
 * @returns Created service concept
 */
export function createServiceConcept(
  concept: Omit<ServiceConcept, "id" | "createdAt">,
): ServiceConcept {
  return {
    ...concept,
    id: `concept-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
}

/**
 * Get default service concepts
 * @returns Array of default service concepts
 */
export function getDefaultServiceConcepts(): ServiceConcept[] {
  return DEFAULT_CONCEPTS;
}

/**
 * Calculate markup for a given service type
 * @param basePrice - Original menu price
 * @param serviceType - Service type
 * @returns Adjusted price with markup
 */
export function calculateServiceMarkup(basePrice: number, serviceType: ServiceType): number {
  const markup = SERVICE_MARKUPS[serviceType] || 1.0;
  return Math.round(basePrice * markup * 100) / 100;
}

/**
 * Create event request
 * @param eventData - Event details
 * @returns Created event request
 */
export function createEventRequest(
  eventData: Omit<EventRequest, "id" | "createdAt" | "totalCost" | "totalPrice" | "profit">,
): EventRequest {
  const totalCost = eventData.menuSelections.reduce((sum, item) => sum + item.cost * item.quantity, 0);
  const totalPrice = eventData.menuSelections.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const profit = totalPrice - totalCost;

  return {
    ...eventData,
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    totalCost,
    totalPrice,
    profit,
  };
}

/**
 * Filter recipes by dietary restrictions
 * @param recipeIds - Array of recipe IDs to check
 * @param restrictions - Customer's dietary restrictions
 * @param recipeMap - Map of recipes with their allergens/restrictions
 * @returns Filtered recipe IDs that match restrictions
 */
export function filterRecipesByDiet(
  recipeIds: string[],
  restrictions: DietaryRestriction[],
  recipeMap: Map<string, { allergens: string[]; isDairy?: boolean; isNut?: boolean; isGluten?: boolean }>,
): string[] {
  if (restrictions.length === 0) return recipeIds;

  return recipeIds.filter((id) => {
    const recipe = recipeMap.get(id);
    if (!recipe) return false;

    // Check each restriction
    for (const restriction of restrictions) {
      switch (restriction) {
        case "vegetarian":
          if (recipe.allergens.some((a) => ["meat", "seafood", "fish"].includes(a.toLowerCase())))
            return false;
          break;
        case "vegan":
          if (
            recipe.allergens.some((a) => ["meat", "seafood", "fish", "dairy", "egg"].includes(a.toLowerCase())) ||
            recipe.isDairy
          )
            return false;
          break;
        case "gluten-free":
          if (recipe.isGluten) return false;
          break;
        case "dairy-free":
          if (recipe.isDairy) return false;
          break;
        case "nut-allergy":
          if (recipe.isNut) return false;
          break;
      }
    }

    return true;
  });
}

/**
 * Calculate event profitability
 * @param event - Event request
 * @param targetMargin - Target profit margin (0-1)
 * @returns Profitability analysis
 */
export function analyzeEventProfitability(
  event: EventRequest,
  targetMargin: number = 0.35,
): {
  totalCost: number;
  totalPrice: number;
  profit: number;
  margin: number;
  pricePerPerson: number;
  costPerPerson: number;
  isAtTarget: boolean;
  recommendation: string;
} {
  const margin = event.totalPrice > 0 ? event.profit / event.totalPrice : 0;
  const pricePerPerson = event.partySize > 0 ? event.totalPrice / event.partySize : 0;
  const costPerPerson = event.partySize > 0 ? event.totalCost / event.partySize : 0;
  const isAtTarget = margin >= targetMargin;

  let recommendation = "Pricing is optimal for this event.";
  if (!isAtTarget) {
    const shortfall = (targetMargin - margin) * 100;
    recommendation = `Margin is ${(margin * 100).toFixed(1)}%, ${shortfall.toFixed(1)}% below target. Consider adjusting menu selections or price.`;
  }

  return {
    totalCost: event.totalCost,
    totalPrice: event.totalPrice,
    profit: event.profit,
    margin: Math.round(margin * 10000) / 100,
    pricePerPerson,
    costPerPerson,
    isAtTarget,
    recommendation,
  };
}

/**
 * Create seasonal menu
 * @param menuData - Seasonal menu details
 * @returns Created seasonal menu
 */
export function createSeasonalMenu(
  menuData: Omit<SeasonalMenu, "id" | "createdAt">,
): SeasonalMenu {
  return {
    ...menuData,
    id: `menu-seasonal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
}

/**
 * Get active seasonal menu for a date
 * @param date - Date to check (YYYY-MM-DD)
 * @param menus - Array of seasonal menus
 * @returns Active seasonal menu or null
 */
export function getActiveSeasonalMenu(date: string, menus: SeasonalMenu[]): SeasonalMenu | null {
  return menus.find((menu) => menu.active && date >= menu.startDate && date <= menu.endDate) || null;
}

/**
 * Create customer profile
 * @param customerData - Customer details
 * @returns Created customer profile
 */
export function createCustomerProfile(
  customerData: Omit<CustomerProfile, "id" | "createdAt">,
): CustomerProfile {
  return {
    ...customerData,
    id: `customer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
}

/**
 * Suggest menu for customer based on preferences
 * @param customer - Customer profile
 * @param availableRecipes - Available recipes with metadata
 * @returns Recommended recipe IDs
 */
export function suggestMenuForCustomer(
  customer: CustomerProfile,
  availableRecipes: Array<{ id: string; allergens: string[]; isDairy?: boolean; isNut?: boolean; isGluten?: boolean }>,
): string[] {
  const filtered = filterRecipesByDiet(
    availableRecipes.map((r) => r.id),
    customer.dietaryRestrictions,
    new Map(availableRecipes.map((r) => [r.id, r])),
  );

  // Further filter by allergies
  return filtered.filter((id) => {
    const recipe = availableRecipes.find((r) => r.id === id);
    if (!recipe) return false;
    return !customer.allergies.some((allergy) =>
      recipe.allergens.some((a) => a.toLowerCase().includes(allergy.toLowerCase())),
    );
  });
}
