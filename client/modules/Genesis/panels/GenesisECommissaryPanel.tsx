import React from "react";
/** * Genesis E — Commissary Fulfillment Queue * Shows submitted requests. Allows Deliver + Receive (v1). */ import {
  useMemo,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listIFOsForFulfillingLocation } from "@/lib/internal-fulfillment-store";
import {
  setIFOStatus,
  deliverIFO,
  receiveIFO,
} from "@/lib/internal-fulfillment-engine";
const COMMISSARY_ID = "banquets_production";
export default function GenesisECommissaryPanel() {
  const [, setTick] = useState(0);
  const queue = useMemo(() => {
    return listIFOsForFulfillingLocation(COMMISSARY_ID).filter(
      (o) => o.status !== "CANCELLED" && o.status !== "RECEIVED",
    );
  }, []);
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
              Genesis E — Commissary Queue{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              Pick/Pack/Fulfill outlet requests. Inventory + Aurum posting is
              automatic.{" "}
            </div>{" "}
          </div>{" "}
          <Badge>Commissary</Badge>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-auto p-4">
        {" "}
        <div className="space-y-3">
          {" "}
          {queue.map((o) => (
            <Card key={o.ifoId} className="p-4">
              {" "}
              <div className="flex items-center justify-between gap-2 mb-2">
                {" "}
                <div className="font-semibold text-foreground">
                  {" "}
                  {o.requestingLocationId} needs:{" "}
                </div>{" "}
                <Badge variant="outline">{o.status}</Badge>{" "}
              </div>{" "}
              <div className="text-sm text-foreground/80 space-y-1 mb-3">
                {" "}
                {o.lines.map((l) => (
                  <div key={l.lineId}>
                    {" "}
                    {l.quantity} {l.unit} — {l.itemName}{" "}
                  </div>
                ))}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/50 mb-3">{o.ifoId}</div>{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIFOStatus(o.ifoId, "PICKING");
                    setTick((t) => t + 1);
                  }}
                >
                  {" "}
                  Start Picking{" "}
                </Button>{" "}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIFOStatus(o.ifoId, "READY");
                    setTick((t) => t + 1);
                  }}
                >
                  {" "}
                  Mark Ready{" "}
                </Button>{" "}
                <Button
                  size="sm"
                  onClick={() => {
                    deliverIFO(o.ifoId);
                    setTick((t) => t + 1);
                  }}
                >
                  {" "}
                  Deliver{" "}
                </Button>{" "}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    receiveIFO(o.ifoId);
                    setTick((t) => t + 1);
                  }}
                >
                  {" "}
                  Receive + Post{" "}
                </Button>{" "}
              </div>{" "}
            </Card>
          ))}{" "}
          {queue.length === 0 && (
            <div className="text-sm text-foreground/50 text-center py-8">
              {" "}
              No active requests.{" "}
            </div>
          )}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
