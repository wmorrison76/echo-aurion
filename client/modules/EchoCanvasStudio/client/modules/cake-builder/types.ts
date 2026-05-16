export type CakeShape = "round" | "square" | "sheet";

export interface TierSpec {
  diameter?: number; // inches (round/square as side)
  height: number; // inches per tier
  width?: number; // inches (sheet)
  depth?: number; // inches (sheet)
}

export interface DesignData {
  guests: number;
  shape: CakeShape;
  tiers: TierSpec[];
  baseFlavor: string;
  frosting: string;
  fillings: string[];
  color: string; // hex (outer frosting)
  stand: string;
  decorations: string[];
  crumbCoat: boolean;
  sliceAngle: number; // radians (round only)
  eventDate?: string; // ISO date
  frostingTexture?: "smooth" | "rustic" | "ridged";
  bumpIntensity?: number; // 0..1
  frostingThickness?: number; // inches
  fillingColor?: string; // hex
  cakeColorHex?: string; // hex for crumb
  fillingLayers?: number; // 1..3
  tronMode?: boolean;
  animateBuild?: boolean;
  theme?: "classic" | "birthday" | "holiday";
  studioBg?: "white" | "soft" | "black" | "peach" | "gradient";
  lights?: { key: number; fill: number; rim: number }; // 0..2
  crumbPattern?: "plain" | "confetti";
  interLayerFrosting?: boolean;
  interLayerFrostingThickness?: number; // inches, very thin, e.g., 0.05 - 0.2
  graphicWrap?: {
    url: string;
    opacity: number; // 0..1
    tint?: string;
  } | null;
  assemblyMode?: boolean;
  notes?: string; // Additional notes to include in PDF
  id?: string; // Design ID for saving
  layers?: any[]; // Cake layers
  composedImageUrl?: string; // Final composed image
  lastComposedAt?: string; // Timestamp of last composition
  tiersShape?: CakeShape; // Alternative property name for shape
}

export interface PricingBreakdown {
  servings: number;
  basePrice: number;
  decorations: number;
  stand: number;
  complexity: number;
  total: number;
}

export interface GalleryItem {
  id: string;
  savedAt: string;
  name: string;
  design: DesignData;
  imageDataUrl: string;
  price: PricingBreakdown;
}

export interface IntakeAnswers {
  occasion: string;
  eventDate?: string;
  eventTime?: string;
  bakeryAvailable: boolean;
  locationDetails: string;
  deliveryType: "delivery" | "pickup";
  venueAddress?: string;
  deliveryTime?: string;
  guestCount: number;
  otherDesserts: boolean;
  allergies: string[];
  dietaryPreferences: string[];
  severeAllergyNotes?: string;
  flavors: string[];
  multiFlavorPerTier: boolean;
  fillings: string[];
  frostings: string[];
  outdoorIcing: boolean;
  tiersShape: "round" | "square" | "sheet" | "cupcakes";
  tierCount: number;
  portionStyle: "standard" | "cocktail";
  specialDietNeeds: string[];
  themeNotes: string;
  inspirationLinks: string;
  designComplexity: "simple" | "intricate";
  textureNotes: string;
  decorativeElements: string[];
  freshFlowersBy: "baker" | "florist" | "client";
  cakeTopperBy: "client" | "bakery" | "none";
  needsSketch: boolean;
  approvesAdvancedCost: boolean;
  budgetMin?: number;
  budgetMax?: number;
  deliveryFeeApproved: boolean;
  venueRestrictions: string;
  cuttingBy: string;
  needCuttingGuide: boolean;
  storageNotes: string;
  depositConfirmed: boolean;
  finalPaymentDate?: string;
  cancellationAck: boolean;
  tastingRequested: boolean;
  tastingFlavors: string;
  matchingDesserts: string;
  needsLabels: boolean;
  standRental: boolean;
  displaySetup: boolean;
  tastingScheduled?: string;
  cakeType?: string;
  cakeIcing?: string;
  customShape?: string;
}

export interface IntakePresetPayload {
  version: number;
  preset: Partial<DesignData>;
  answers: IntakeAnswers;
}
