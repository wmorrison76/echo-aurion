import {
  SUPPLIER_CATALOG,
  SUPPLIERS,
  type SupplierCatalogItem,
  type SupplierProfile,
} from "@/data/suppliers";
import {
  convertToBaseUnit,
  createIngredientKey,
  extractIngredientMetadata,
  normalizeUnit,
} from "@/lib/yield-calculations";

export type SupplierQuote = {
  supplierId: string;
  supplierName: string;
  sku: string;
  ingredientName: string;
  matchStrength: number;
  packSize: number;
  packUnit: string;
  pricePerPack: number;
  currency: string;
  minOrderPacks: number;
  leadTimeDays: number;
  reliability: number;
  sustainabilityScore: number;
  unitCost: number | null;
  unitCostUnit: string | null;
  estimatedCost: number | null;
  matchesUnit: boolean;
  lastUpdated: string;
};

type QuoteParams = {
  ingredientName: string;
  quantity?: number | null;
  unit?: string;
};

const MAX_LEADTIME_WEIGHT = 4;

export function getSupplierQuotesForIngredient({
  ingredientName,
  quantity,
  unit,
}: QuoteParams): SupplierQuote[] {
  const normalizedName = ingredientName.trim();
  if (!normalizedName) return [];
  const ingredientKey = createIngredientKey(normalizedName);
  const ingredientMeta = extractIngredientMetadata(normalizedName);
  const targetUnit = unit ? normalizeUnit(unit) : "";

  const baseUnitInfo = typeof unit === "string" ? convertToBaseUnit(1, unit) : null;
  const quantityInfo =
    quantity != null && Number.isFinite(quantity) && unit
      ? convertToBaseUnit(Number(quantity), unit)
      : null;

  const candidates = SUPPLIER_CATALOG.filter((item) => {
    if (item.ingredientKey === ingredientKey) return true;
    const descriptors = new Set(
      item.descriptors.map((token) => token.toLowerCase()),
    );
    return ingredientMeta.tokens.some((token) => descriptors.has(token));
  });

  return candidates
    .map((item) => buildQuote(item, ingredientMeta.tokens, ingredientKey, baseUnitInfo, quantityInfo, targetUnit))
    .filter((quote): quote is SupplierQuote => quote !== null)
    .sort((a, b) => b.matchStrength - a.matchStrength)
    .slice(0, 5);
}

export function findBestSupplierQuote(params: QuoteParams): SupplierQuote | null {
  const [first] = getSupplierQuotesForIngredient(params);
  return first ?? null;
}

function buildQuote(
  item: SupplierCatalogItem,
  ingredientTokens: string[],
  ingredientKey: string,
  requestedUnitInfo: ReturnType<typeof convertToBaseUnit>,
  requestedQtyInfo: ReturnType<typeof convertToBaseUnit>,
  requestedUnit: string,
): SupplierQuote | null {
  const supplier = resolveSupplier(item.supplierId);
  if (!supplier) return null;

  const packBase = convertToBaseUnit(item.packSize, item.packUnit);
  if (!packBase) return null;

  const pricePerBaseUnit = item.pricePerPack / packBase.value;
  const matchesUnit = Boolean(
    requestedUnitInfo && requestedUnitInfo.dimension === packBase.dimension,
  );

  let unitCost: number | null = null;
  if (pricePerBaseUnit && matchesUnit && requestedUnitInfo) {
    unitCost = pricePerBaseUnit * requestedUnitInfo.value;
  }

  let estimatedCost: number | null = null;
  if (requestedQtyInfo && requestedQtyInfo.dimension === packBase.dimension) {
    estimatedCost = pricePerBaseUnit * requestedQtyInfo.value;
  } else if (unitCost != null && requestedQtyInfo && requestedUnitInfo) {
    estimatedCost = unitCost * (requestedQtyInfo.value / requestedUnitInfo.value);
  }

  const descriptorMatches = countDescriptorOverlap(ingredientTokens, item.descriptors);
  const keyMatch = ingredientKey === item.ingredientKey ? 1 : 0;
  const reliabilityWeight = supplier.reliability * 2.5;
  const sustainabilityWeight = supplier.sustainabilityScore * 1.5;
  const leadTimePenalty = Math.min(item.leadTimeDays, MAX_LEADTIME_WEIGHT) * 0.4;
  const matchStrength =
    keyMatch * 6 + descriptorMatches * 1.6 + reliabilityWeight + sustainabilityWeight - leadTimePenalty;

  return {
    supplierId: item.supplierId,
    supplierName: supplier.name,
    sku: item.sku,
    ingredientName: item.ingredientName,
    matchStrength,
    packSize: item.packSize,
    packUnit: item.packUnit.toUpperCase(),
    pricePerPack: item.pricePerPack,
    currency: item.currency,
    minOrderPacks: item.minOrderPacks,
    leadTimeDays: item.leadTimeDays,
    reliability: supplier.reliability,
    sustainabilityScore: supplier.sustainabilityScore,
    unitCost,
    unitCostUnit:
      unitCost != null
        ? (requestedUnit
            ? requestedUnit.toUpperCase()
            : requestedUnitInfo?.unit?.toUpperCase() ?? null)
        : null,
    estimatedCost,
    matchesUnit,
    lastUpdated: item.lastUpdated,
  };
}

function resolveSupplier(id: string): SupplierProfile | undefined {
  return SUPPLIERS.find((supplier) => supplier.id === id);
}

function countDescriptorOverlap(tokens: string[], descriptors: string[]): number {
  if (!tokens.length || !descriptors.length) return 0;
  const descriptorSet = new Set(descriptors.map((token) => token.toLowerCase()));
  return tokens.reduce((score, token) => (descriptorSet.has(token) ? score + 1 : score), 0);
}
