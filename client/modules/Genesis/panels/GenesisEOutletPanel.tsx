import React from "react";
/** * Genesis E — Outlet Request Panel * Creates IFO drafts and submits them. Minimal v1 UI. */ import {
  useMemo,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FulfillmentLine } from "@/../shared/types/internal-fulfillment";
import {
  createDraftIFO,
  listIFOsForRequestingLocation,
} from "@/lib/internal-fulfillment-store";
import { setIFOStatus } from "@/lib/internal-fulfillment-engine";
const OUTLET_ID = "restaurant_0";
const DEFAULT_COMMISSARIES = [
  { id: "banquets_production", name: "Banquets Production" },
  { id: "pastry_commissary", name: "Pastry Commissary" },
  { id: "storeroom", name: "Storeroom" },
];
export default function GenesisEOutletPanel() {
  const [fulfillerId, setFulfillerId] = useState(DEFAULT_COMMISSARIES[0].id);
  const [itemName, setItemName] = useState("Chicken Stock");
  const [qty, setQty] = useState(5);
  const [unit, setUnit] = useState("gal");
  const [, setTick] = useState(0);
  const orders = useMemo(
    () => listIFOsForRequestingLocation(OUTLET_ID),
    [OUTLET_ID],
  );
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-foreground">
              {" "}
              Genesis E — Outlet Requests{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              Order from Banquets Production / Pastry / Storeroom. Accounting is
              automatic (Genesis D).{" "}
            </div>{" "}
          </div>{" "}
          <Badge>Outlet</Badge>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {" "}
        <Card className="p-4">
          {" "}
          <div className="font-semibold text-foreground">
            Create Request
          </div>{" "}
          <div className="mt-4 space-y-3">
            {" "}
            <div>
              {" "}
              <div className="text-sm text-foreground/70 mb-2">
                Commissary
              </div>{" "}
              <select
                className="w-full rounded px-3 py-2 bg-background border border-border/30 text-foreground"
                value={fulfillerId}
                onChange={(e) => setFulfillerId(e.target.value)}
              >
                {" "}
                {DEFAULT_COMMISSARIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {" "}
                    {c.name}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <div className="grid grid-cols-3 gap-2">
              {" "}
              <input
                className="col-span-2 rounded px-3 py-2 bg-background border border-border/30 text-foreground"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Item name"
              />{" "}
              <input
                className="rounded px-3 py-2 bg-background border border-border/30 text-foreground"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unit"
              />{" "}
            </div>{" "}
            <div className="grid grid-cols-3 gap-2">
              {" "}
              <input
                className="rounded px-3 py-2 bg-background border border-border/30 text-foreground"
                type="number"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />{" "}
              <div className="col-span-2 text-sm text-foreground/70 flex items-center">
                {" "}
                Due: (v1 uses +24h; Genesis F adds delivery calendar){" "}
              </div>{" "}
            </div>{" "}
            <Button
              className="w-full"
              onClick={() => {
                const line: FulfillmentLine = {
                  lineId: `line_${Date.now()}`,
                  itemName,
                  unit,
                  quantity: qty,
                  fulfillFromInventory: true,
                  allowSubstitutions: true,
                  notes: "Auto-post to COGS (Receiving Pays).",
                };
                const draft = createDraftIFO({
                  requestingLocationId: OUTLET_ID,
                  fulfillingLocationId: fulfillerId,
                  dueAtISO: new Date(
                    Date.now() + 24 * 60 * 60 * 1000,
                  ).toISOString(),
                  deliveryWindow: null,
                  sourceType: "ADHOC",
                  sourceId: null,
                  costPolicyHint: "AUTO",
                  lines: [line],
                  systemNote:
                    "Genesis E: Outlet request created. Accounting will auto-route via Genesis D.",
                });
                setIFOStatus(draft.ifoId, "SUBMITTED");
                setTick((t) => t + 1);
              }}
            >
              {" "}
              Submit Request{" "}
            </Button>{" "}
          </div>{" "}
        </Card>{" "}
        <Card className="p-4">
          {" "}
          <div className="font-semibold text-foreground">My Requests</div>{" "}
          <div className="mt-4 space-y-2">
            {" "}
            {orders.map((o) => (
              <div
                key={o.ifoId}
                className="border-t border-border/30 pt-3 first:border-t-0"
              >
                {" "}
                <div className="flex items-center justify-between gap-2">
                  {" "}
                  <div className="font-semibold text-foreground">
                    {" "}
                    {o.lines[0]?.itemName}{" "}
                  </div>{" "}
                  <Badge variant="outline">{o.status}</Badge>{" "}
                </div>{" "}
                <div className="text-xs text-foreground/50 mt-1">{o.ifoId}</div>{" "}
                <div className="text-sm text-foreground/80 mt-2 space-y-1">
                  {" "}
                  {o.lines.map((l) => (
                    <div key={l.lineId}>
                      {" "}
                      {l.quantity} {l.unit} — {l.itemName}{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </div>
            ))}{" "}
            {orders.length === 0 && (
              <div className="text-sm text-foreground/50">No requests yet.</div>
            )}{" "}
          </div>{" "}
        </Card>{" "}
      </div>{" "}
    </div>
  );
}
