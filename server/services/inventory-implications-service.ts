import type { TraceLedgerAppendInput, TraceLedgerEntry } from "../../shared/types/trace-ledger";
import { TraceLedgerService } from "./trace-ledger-service";
import { appendTraceEvent } from "./trace-ledger-fallback";

export interface InventoryImplication {
  ingredientId: string;
  ingredientName: string;
  requiredQty: number;
  currentOnHand: number;
  shortage: number;
  date: string;
}

export interface ActorContext {
  userId?: string;
  role?: string;
  system?: string;
}

/**
 * Derive inventory implications from demand deltas
 * This is a simplified version - in production, this would:
 * 1. Query active menu items
 * 2. Look up recipe ingredients
 * 3. Calculate ingredient requirements based on forecasted demand
 * 4. Check current inventory levels
 */
export async function deriveInventoryImplications(
  orgId: string,
  traceId: string,
  deltas: Array<{ date: string; delta: number }>,
  actor?: ActorContext,
): Promise<InventoryImplication[]> {
  const timestamp = new Date().toISOString();
  const actorContext = actor || { system: "inventory-engine" };

  // Simplified: For each delta, create a sample inventory implication
  // In production, this would query menu items, recipes, and inventory
  const implications: InventoryImplication[] = [];

  for (const delta of deltas) {
    // Sample implication - in production, compute from menu/recipes
    const implication: InventoryImplication = {
      ingredientId: `ingredient-${delta.date}`,
      ingredientName: "Sample Ingredient",
      requiredQty: Math.abs(delta.delta) * 0.5, // Simplified calculation
      currentOnHand: 100, // Would query actual inventory
      shortage: Math.max(0, Math.abs(delta.delta) * 0.5 - 100),
      date: delta.date,
    };

    implications.push(implication);

    // Emit trace entry for this implication
    await appendTraceEvent({
      orgId,
      entityType: "inventory-implication",
      entityId: `impl-${implication.ingredientId}-${delta.date}`,
      sourceRef: traceId,
      payload: {
        action: "INVENTORY_IMPLICATION_DERIVED",
        ingredientId: implication.ingredientId,
        ingredientName: implication.ingredientName,
        requiredQty: implication.requiredQty,
        currentOnHand: implication.currentOnHand,
        shortage: implication.shortage,
        date: implication.date,
        actor: actorContext,
        timestamp,
      },
    });
  }

  return implications;
}

/**
 * Query demand deltas from trace ledger by traceId
 */
export async function getDemandDeltasByTraceId(
  orgId: string,
  traceId: string,
): Promise<Array<{ date: string; delta: number }>> {
  try {
    const service = new TraceLedgerService();
    const entries = await service.listBySourceRef(orgId, traceId, 100);

    const deltas = entries
      .filter((entry) => entry.entityType === "demand-delta")
      .map((entry) => {
        const payload = entry.payload as any;
        return {
          date: payload.date,
          delta: payload.delta,
        };
      });

    return deltas;
  } catch {
    // Fallback to local storage if service unavailable
    try {
      const path = await import("path");
      const fs = await import("fs/promises");
      const ledgerPath = path.resolve(
        process.cwd(),
        "server/localdata/trace-ledger.v1.json",
      );

      const raw = await fs.readFile(ledgerPath, "utf8");
      const ledger = JSON.parse(raw);

      const deltas = ledger
        .filter(
          (entry: any) =>
            entry.orgId === orgId &&
            entry.sourceRef === traceId &&
            entry.entityType === "demand-delta",
        )
        .map((entry: any) => {
          const payload = entry.payload as any;
          return {
            date: payload.date,
            delta: payload.delta,
          };
        });

      return deltas;
    } catch {
      return [];
    }
  }
}
