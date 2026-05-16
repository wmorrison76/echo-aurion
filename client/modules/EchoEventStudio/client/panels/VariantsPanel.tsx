import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSceneStore } from "@/store/sceneStore";
import {
  generateVariant,
  diffVariants,
  type Variant,
  type VariantDiff,
} from "@/lib/variants";
export interface VariantsPanelProps {
  onVariantSelect?: (variant: Variant) => void;
}
export function VariantsPanel({ onVariantSelect }: VariantsPanelProps) {
  const { objects } = useSceneStore();
  const [variants, setVariants] = useState<Variant[]>([]);
  const addVariant = (label: string, tweak: (objs: any[]) => any[]) => {
    const variant = { ...generateVariant(objects, tweak), name: label };
    setVariants((prev) => [...prev, variant]);
  };
  const addTableVariant = () => {
    addVariant("A: +1 table", (objs) => [
      ...objs,
      {
        id: `table-${Date.now()}`,
        type: "table_round",
        position: [Math.random() * 4 - 2, 0.75, Math.random() * 4 - 2] as [
          number,
          number,
          number,
        ],
        size: [1.5, 0.8, 1.5] as [number, number, number],
        seats: 8,
      },
    ]);
  };
  const addBuffetVariant = () => {
    addVariant("B: +1 buffet", (objs) => [
      ...objs,
      {
        id: `buffet-${Date.now()}`,
        type: "buffet",
        position: [0, 0.9, 0] as [number, number, number],
        size: [3, 0.9, 0.9] as [number, number, number],
      },
    ]);
  };
  const compactVariant = () => {
    addVariant("C: Compact (90%)", (objs) =>
      objs.map((x) => ({
        ...x,
        position: [x.position[0] * 0.9, x.position[1], x.position[2] * 0.9] as [
          number,
          number,
          number,
        ],
      })),
    );
  };
  const deleteVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Variants (A/B/C)</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2">
        {" "}
        <div className="flex flex-col gap-2">
          {" "}
          <Button size="sm" onClick={addTableVariant} className="text-xs h-8">
            {" "}
            Make A (+1 Table){" "}
          </Button>{" "}
          <Button size="sm" onClick={addBuffetVariant} className="text-xs h-8">
            {" "}
            Make B (+1 Buffet){" "}
          </Button>{" "}
          <Button size="sm" onClick={compactVariant} className="text-xs h-8">
            {" "}
            Make C (Compact){" "}
          </Button>{" "}
        </div>{" "}
        {variants.length > 0 && (
          <div className="border-t pt-2 space-y-2">
            {" "}
            <div className="text-xs font-semibold">Variants:</div>{" "}
            {variants.map((variant, idx) => {
              const baseVariant = variants[0] || { objects };
              const diff =
                idx === 0
                  ? { seatDelta: 0, costDelta: 0, countDelta: 0 }
                  : diffVariants(baseVariant as any, variant);
              return (
                <div
                  key={variant.id}
                  className="border rounded px-2 py-1 text-xs space-y-1 bg-muted/20"
                >
                  {" "}
                  <div className="flex items-center justify-between">
                    {" "}
                    <span className="font-semibold">{variant.name}</span>{" "}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 text-destructive"
                      onClick={() => deleteVariant(variant.id)}
                    >
                      {" "}
                      ✕{" "}
                    </Button>{" "}
                  </div>{" "}
                  {idx > 0 && (
                    <div className="text-muted-foreground space-y-0.5">
                      {" "}
                      <div>
                        {" "}
                        Seats: {diff.seatDelta >= 0 ? "+" : ""}{" "}
                        {diff.seatDelta}{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        Cost: {diff.costDelta >= 0 ? "+" : ""}${" "}
                        {diff.costDelta}{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        Items: {diff.countDelta >= 0 ? "+" : ""}{" "}
                        {diff.countDelta}{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-6 text-xs"
                    onClick={() => onVariantSelect?.(variant)}
                  >
                    {" "}
                    Load{" "}
                  </Button>{" "}
                </div>
              );
            })}{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
