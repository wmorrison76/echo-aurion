// Master Knowledge Codex - Central repository of all domain knowledge schemas

export type KnowledgeDomain =
  | "culinary"
  | "pastry"
  | "mixology"
  | "wine"
  | "hospitality"
  | "banquets"
  | "finance"
  | "inventory"
  | "labor"
  | "crm"
  | "bi";

export type KnowledgeItemType =
  | "ingredient"
  | "technique"
  | "flavor_compound"
  | "formula"
  | "cocktail_template"
  | "wine_profile"
  | "service_protocol"
  | "event_template"
  | "financial_model"
  | "inventory_item"
  | "labor_rule"
  | "guest_profile"
  | "forecast_model";

export interface BaseKnowledgeItem {
  id: string;
  domain: KnowledgeDomain;
  type: KnowledgeItemType;
  title: string;
  description: string;
  content: string;
  tags: string[];
  confidenceScore: number; // 0-1
  sources: string[]; // References to cookbooks, papers, training sessions
  createdAt: string;
  updatedAt: string;
  relatedItems: string[]; // IDs of related knowledge items
}

// CULINARY DOMAIN SCHEMAS

export interface IngredientKnowledge extends BaseKnowledgeItem {
  type: "ingredient";
  domain: "culinary";
  properties: {
    scientificName?: string;
    origin?: string;
    seasonality?: string[];
    yieldPercentage?: number;
    storageTemperature?: number;
    shelfLifeDays?: number;
    pH?: number;
    waterContent?: number;
    fatContent?: number;
    proteinContent?: number;
    allergens: string[];
    volatileCompounds?: string[];
    flavorFamily: string[];
  };
}

export interface TechniqueKnowledge extends BaseKnowledgeItem {
  type: "technique";
  domain: "culinary";
  properties: {
    steps: string[];
    equipment?: string[];
    temperatureRange?: [number, number];
    timeMinutes?: [number, number];
    difficulty: 1 | 2 | 3 | 4 | 5;
    applicableIngredients: string[];
    flavorImpact?: string[];
    textureImpact?: string[];
  };
}

export interface FlavorCompoundKnowledge extends BaseKnowledgeItem {
  type: "flavor_compound";
  domain: "culinary";
  properties: {
    chemicalFormula?: string;
    flavorProfile: string[];
    sources: string[];
    synergyWith: string[];
    conflictsWith: string[];
    concentration: number;
  };
}

// PASTRY DOMAIN SCHEMAS

export interface FormulaKnowledge extends BaseKnowledgeItem {
  type: "formula";
  domain: "pastry";
  properties: {
    flourBasisPercent: number;
    waterPercent: number;
    fatPercent: number;
    sugarPercent: number;
    eggPercent: number;
    saltPercent: number;
    leaveningPercent?: number;
    methodologySteps: string[];
    expectedTexture: string;
    commonDefects: string[];
    shelfLifeHours: number;
  };
}

// MIXOLOGY DOMAIN SCHEMAS

export interface CocktailTemplateKnowledge extends BaseKnowledgeItem {
  type: "cocktail_template";
  domain: "mixology";
  properties: {
    baseSpirit: string;
    components: Array<{ name: string; volumeMl: number; abvPercent?: number }>;
    family: string; // "sour", "old_fashioned", "martini", etc.
    difficulty: 1 | 2 | 3 | 4 | 5;
    glassware: string;
    garnish: string[];
    technique: string;
    estimatedABV: number;
    costPerServing: number;
  };
}

// WINE DOMAIN SCHEMAS

export interface WineProfileKnowledge extends BaseKnowledgeItem {
  type: "wine_profile";
  domain: "wine";
  properties: {
    grape: string;
    region: string;
    appellation?: string;
    vintage?: number;
    acidity: 1 | 2 | 3 | 4 | 5;
    tannin: 0 | 1 | 2 | 3 | 4 | 5;
    body: 1 | 2 | 3 | 4 | 5;
    alcoholPercent: number;
    sweetnessLevel: "dry" | "off_dry" | "medium" | "sweet";
    flavorNotes: string[];
    pairingGuides: string[];
    ageingPotential: string;
    serveTemperatureC: number;
  };
}

// HOSPITALITY DOMAIN SCHEMAS

export interface ServiceProtocolKnowledge extends BaseKnowledgeItem {
  type: "service_protocol";
  domain: "hospitality";
  properties: {
    serviceStyle: string; // "casual", "fine_dining", "banquet", etc.
    guestCapacity: [number, number];
    expectedTurntimeMinutes: number;
    serverToGuestRatio: number;
    sequenceSteps: string[];
    recoveryStrategies: string[];
    complaintCategories: string[];
  };
}

// BANQUET DOMAIN SCHEMAS

export interface EventTemplateKnowledge extends BaseKnowledgeItem {
  type: "event_template";
  domain: "banquets";
  properties: {
    eventType: string; // "wedding", "corporate", "conference", etc.
    roomSetup: string;
    guestCountRange: [number, number];
    courseCount: number;
    estimatedDurationMinutes: number;
    staffingGuidelines: string;
    beverageServiceModel: string;
    specialConsiderations: string[];
  };
}

// FINANCE DOMAIN SCHEMAS

export interface FinancialModelKnowledge extends BaseKnowledgeItem {
  type: "financial_model";
  domain: "finance";
  properties: {
    modelType: string; // "recipe_costing", "labor_budgeting", "forecast", etc.
    assumptions: Record<string, number | string>;
    calculations: string[];
    outputs: Record<string, any>;
    bestPractices: string[];
    benchmarks: Record<string, number>;
  };
}

// INVENTORY DOMAIN SCHEMAS

export interface InventoryItemKnowledge extends BaseKnowledgeItem {
  type: "inventory_item";
  domain: "inventory";
  properties: {
    supplier: string;
    parLevel: number;
    reorderPoint: number;
    leadTimeDays: number;
    unitCost: number;
    packageSize: string;
    conversionFactors: Record<string, number>;
    wastePercentage: number;
  };
}

// LABOR DOMAIN SCHEMAS

export interface LaborRuleKnowledge extends BaseKnowledgeItem {
  type: "labor_rule";
  domain: "labor";
  properties: {
    ruleType: string; // "compliance", "scheduling", "wage", etc.
    jurisdiction?: string;
    ruleText: string;
    interpretation: string;
    commonViolations: string[];
    bestPractices: string[];
  };
}

// CRM DOMAIN SCHEMAS

export interface GuestProfileTemplateKnowledge extends BaseKnowledgeItem {
  type: "guest_profile";
  domain: "crm";
  properties: {
    profileType: string; // "vip", "regular", "corporate", etc.
    preferenceCategories: string[];
    expectedBehaviors: string[];
    serviceAdjustments: string[];
    recoveryProtocols: string[];
    personalizationTactics: string[];
  };
}

// BI DOMAIN SCHEMAS

export interface ForecastModelKnowledge extends BaseKnowledgeItem {
  type: "forecast_model";
  domain: "bi";
  properties: {
    modelType: string; // "sales", "labor", "cost", etc.
    inputs: string[];
    methodology: string;
    accuracy: number;
    seasonalityFactors: Record<string, number>;
    externalSignals: string[];
  };
}

// Union type for all knowledge items
export type KnowledgeItem =
  | IngredientKnowledge
  | TechniqueKnowledge
  | FlavorCompoundKnowledge
  | FormulaKnowledge
  | CocktailTemplateKnowledge
  | WineProfileKnowledge
  | ServiceProtocolKnowledge
  | EventTemplateKnowledge
  | FinancialModelKnowledge
  | InventoryItemKnowledge
  | LaborRuleKnowledge
  | GuestProfileTemplateKnowledge
  | ForecastModelKnowledge;

// Knowledge Graph Connection
export interface KnowledgeConnection {
  sourceId: string;
  targetId: string;
  relationshipType:
    | "uses"
    | "complements"
    | "conflicts_with"
    | "derives_from"
    | "enables"
    | "requires";
  strength: number; // 0-1
}

export interface KnowledgeGraph {
  nodes: KnowledgeItem[];
  connections: KnowledgeConnection[];
  lastUpdated: string;
}

// Knowledge Ingestion Interface
export interface KnowledgeIngestionResult {
  itemsProcessed: number;
  itemsStored: number;
  itemsFailed: number;
  newConnections: number;
  processingTimeMs: number;
}
