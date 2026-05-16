import type {
  IngredientRequirement,
  PurchaseDelta,
} from "@/../shared/types/purchasing";

/**
 * Compute purchase deltas from ingredient requirements
 * Factors in on-hand and on-order inventory
 *
 * toOrder = max(0, required - available)
 * where available = onHand + onOrder
 */
export function computePurchaseDeltas(
  requirements: IngredientRequirement[],
  onHand: Record<string, number> = {},
  onOrder: Record<string, number> = {},
): PurchaseDelta[] {
  return requirements.map((req) => {
    const hand = onHand[req.ingredientId] ?? 0;
    const ordered = onOrder[req.ingredientId] ?? 0;
    const available = hand + ordered;

    const toOrder = Math.max(0, req.requiredQuantity - available);

    return {
      ingredientId: req.ingredientId,
      ingredientName: req.ingredientName,
      required: req.requiredQuantity,
      onHand: hand,
      onOrder: ordered,
      toOrder,
      unit: req.unit,
    };
  });
}
