import React from "react";
import {
  Package,
  CheckCircle,
  AlertTriangle,
  ArrowRightCircle,
} from "lucide-react";
import { cn } from "@/lib/glass";
import type { EventCart } from "../lib/event-cart-store";

export function EventCartPanel({
  cart,
  onStageItem,
  onLoadItem,
}: {
  cart: EventCart | null;
  onStageItem: (itemId: string, qty: number) => void;
  onLoadItem: (itemId: string, qty: number) => void;
}) {
  if (!cart) {
    return (
      <div className="rounded-lg border border-border/20 bg-background/40 p-4 text-sm text-foreground/60">
        No event cart staged yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/20 bg-background/40 overflow-hidden">
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              Event Cart
            </div>
            <div className="text-xs text-foreground/60">
              {cart.items.length} items •{" "}
              {new Date(cart.updatedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/10">
        {cart.items.map((item) => {
          const remaining = Math.max(0, item.requiredQty - item.stagedQty);
          const warning = item.receivedQty < item.requiredQty;
          return (
            <div
              key={item.id}
              className="p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {item.itemName}
                </div>
                <div className="text-xs text-foreground/60">
                  Required {item.requiredQty} {item.unit} • Received{" "}
                  {item.receivedQty} • Staged {item.stagedQty}
                </div>
                {warning && (
                  <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-1">
                    <AlertTriangle className="w-3 h-3" /> Short on hand (
                    {remaining} remaining)
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStageItem(item.id, remaining || 1)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md border border-border/30",
                    remaining > 0
                      ? "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                      : "text-foreground/30 cursor-not-allowed",
                  )}
                  disabled={remaining <= 0}
                >
                  Stage
                </button>
                <button
                  type="button"
                  onClick={() => onLoadItem(item.id, 1)}
                  className="px-2 py-1 text-xs rounded-md border border-border/30 text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                >
                  Load
                </button>
                {item.stagedQty >= item.requiredQty ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowRightCircle className="w-4 h-4 text-foreground/40" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
