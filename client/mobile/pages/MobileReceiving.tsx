/**
 * Mobile Receiving
 * Barcode/manual item entry; pack size, qty, vendor, outlet, location.
 * Emits trace RECEIVE_ITEM_* events; links to inventory update + cost effect.
 */

import React, { useState } from "react";
import { Package, Barcode, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { emitTrace } from "@/lib/trace-emitter";
import { enqueueTrace } from "../offline/traceQueue";
import type { ActionContext } from "@shared/types/action-context";
import { cn } from "@/lib/utils";

const SOURCE_PANEL = "mobile-receiving";
const DOMAIN = "inventory";

export default function MobileReceiving() {
  const auth = useAuth();
  const [barcode, setBarcode] = useState("");
  const [productId, setProductId] = useState("");
  const [packSize, setPackSize] = useState("");
  const [qty, setQty] = useState("");
  const [vendor, setVendor] = useState("");
  const [outlet, setOutlet] = useState("");
  const [location, setLocation] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  const orgId = auth?.user?.org_id ?? auth?.organization?.id ?? "";
  const userId = auth?.user?.id ?? "";
  const role = auth?.user?.role ?? "user";

  const buildActionContext = (): ActionContext => ({
    orgId,
    actor: { userId, role },
    sessionId: `mobile-${Date.now()}`,
    traceId: `receive-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = (barcode || productId).trim();
    const locationId = (location || outlet || "default").trim();
    if (!product || !qty) {
      setMessage("Item (barcode or ID) and quantity required.");
      setStatus("error");
      return;
    }
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setMessage("Quantity must be a positive number.");
      setStatus("error");
      return;
    }
    const costNum = unitCost ? parseFloat(unitCost) : 0;
    if (unitCost && (isNaN(costNum) || costNum < 0)) {
      setMessage("Unit cost must be a non-negative number.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setMessage("");

    const traceId = buildActionContext().traceId;
    const inputs = {
      product_id: product,
      location_id: locationId,
      qty: qtyNum,
      unit_cost: costNum,
      pack_size: packSize || undefined,
      vendor: vendor || undefined,
      outlet: outlet || undefined,
      source: SOURCE_PANEL,
    };

    try {
      if (isOnline) {
        const res = await fetch("/api/inventory/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: [
              {
                product_id: product,
                location_id: locationId,
                qty: qtyNum,
                unit_cost: costNum,
                vendor_id: vendor || undefined,
                source_ref: `mobile:${traceId}`,
              },
            ],
            user_id: userId,
            notes: packSize ? `Pack: ${packSize}` : undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data.message || data.error || "Receipt failed.");
          setStatus("error");
          return;
        }

        const entityId = data.data?.transaction_ids?.[0] ?? `receipt-${traceId}`;
        await emitTrace(
          "inventory_receipt",
          entityId,
          SOURCE_PANEL,
          DOMAIN,
          inputs,
          {
            transaction_ids: data.data?.transaction_ids,
            total_qty_received: data.data?.total_qty_received,
            total_cost: data.data?.total_cost,
          },
          { traceId, userId, role, orgId }
        );
        setMessage("Received. Inventory updated.");
        setStatus("ok");
      } else {
        const ctx = buildActionContext();
        const result = enqueueTrace(
          ctx,
          {
            domain: DOMAIN,
            sourcePanel: SOURCE_PANEL,
            inputs: { ...inputs, actionType: "receive_item", eventType: "RECEIVE_ITEM_QUEUED" },
            outputs: {},
            eventType: "RECEIVE_ITEM_QUEUED",
          },
          false
        );
        if (!result.queued) {
          setMessage(result.error ?? "Could not queue.");
          setStatus("error");
          return;
        }
        setMessage("Queued for sync when online.");
        setStatus("ok");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed.");
      setStatus("error");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Package className="h-5 w-5" />
        Receiving
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Barcode</label>
          <div className="flex items-center gap-2 border border-input rounded-lg px-3 py-2 bg-background">
            <Barcode className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter"
              className="flex-1 min-w-0 bg-transparent text-sm outline-none"
              autoComplete="off"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Product ID (if no barcode)</label>
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="UUID or SKU"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Pack size</label>
            <input
              type="text"
              value={packSize}
              onChange={(e) => setPackSize(e.target.value)}
              placeholder="e.g. 6/1#"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Qty *</label>
            <input
              type="text"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Unit cost (optional)</label>
          <input
            type="text"
            inputMode="decimal"
            value={unitCost}
            onChange={(e) => setUnitCost(e.target.value)}
            placeholder="0.00"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Vendor</label>
          <input
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Vendor ID or name"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Outlet</label>
            <input
              type="text"
              value={outlet}
              onChange={(e) => setOutlet(e.target.value)}
              placeholder="Outlet"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location ID"
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          )}
        >
          {status === "sending" ? "Sending…" : "Receive item"}
          <Send className="h-4 w-4" />
        </button>
      </form>
      {message && (
        <p
          className={cn(
            "text-sm",
            status === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
