import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatQuantity } from "@/lib/recipe-scaling";

const formatFactor = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (Math.abs(value - Math.round(value)) < 1e-6) {
    return String(Math.round(value));
  }
  return value.toFixed(3).replace(/\.0+$/, "").replace(/0+$/, "");
};

const parseFactorInput = (raw: string): number | null => {
  if (!raw.trim()) return null;
  const normalized = raw.replace(/,/g, ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};

const formatNumeric = (value: number): string => {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value - Math.round(value)) < 1e-6) {
    return String(Math.round(value));
  }
  if (value < 10) {
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  return value.toFixed(1).replace(/\.0$/, "");
};

type ScaleRecipeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFactor: number;
  onApply: (factor: number) => void;
  onPrint: (factor: number) => void;
  onReset: () => void;
  basePortionCount?: number;
  portionUnit?: string;
  baseYieldQty?: number;
  yieldUnit?: string;
};

const quickOptions = [
  { label: "½×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "3×", value: 3 },
];

export function ScaleRecipeDialog({
  open,
  onOpenChange,
  initialFactor,
  onApply,
  onPrint,
  onReset,
  basePortionCount,
  portionUnit,
  baseYieldQty,
  yieldUnit,
}: ScaleRecipeDialogProps) {
  const [factorInput, setFactorInput] = useState(() => formatFactor(initialFactor));
  const hasPortion = Number.isFinite(basePortionCount) && (basePortionCount ?? 0) > 0;
  const hasYield = Number.isFinite(baseYieldQty) && (baseYieldQty ?? 0) > 0;
  const portionLabel = portionUnit?.trim() ?? "";
  const yieldLabel = yieldUnit?.trim() ?? "";

  useEffect(() => {
    if (open) {
      setFactorInput(formatFactor(initialFactor));
    }
  }, [initialFactor, open]);

  const parsedFactor = useMemo(() => parseFactorInput(factorInput), [factorInput]);
  const isFactorValid = parsedFactor != null;
  const effectiveFactor = parsedFactor ?? initialFactor;

  const scaledPortion = useMemo(() => {
    if (!hasPortion) return undefined;
    return (basePortionCount as number) * effectiveFactor;
  }, [basePortionCount, effectiveFactor, hasPortion]);

  const scaledYield = useMemo(() => {
    if (!hasYield) return undefined;
    return (baseYieldQty as number) * effectiveFactor;
  }, [baseYieldQty, effectiveFactor, hasYield]);

  const applyWithFactor = (nextFactor: number) => {
    setFactorInput(formatFactor(nextFactor));
  };

  const handlePortionTargetChange = (raw: string) => {
    setPortionInput(raw);
    if (!hasPortion) return;
    const normalized = raw.replace(/,/g, ".");
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const nextFactor = numeric / (basePortionCount as number);
    setFactorInput(formatFactor(nextFactor));
  };

  const [portionInput, setPortionInput] = useState<string>(() =>
    hasPortion && parsedFactor ? formatNumeric((basePortionCount as number) * parsedFactor) : "",
  );

  useEffect(() => {
    if (hasPortion) {
      setPortionInput(() => {
        const currentFactor = parseFactorInput(formatFactor(initialFactor)) ?? initialFactor;
        return formatNumeric((basePortionCount as number) * currentFactor);
      });
    }
  }, [basePortionCount, hasPortion, initialFactor, open]);

  useEffect(() => {
    if (hasPortion && parsedFactor != null) {
      setPortionInput(formatNumeric((basePortionCount as number) * parsedFactor));
    }
  }, [basePortionCount, hasPortion, parsedFactor]);

  const apply = () => {
    const target = parsedFactor ?? initialFactor;
    onApply(target);
  };

  const print = () => {
    const target = parsedFactor ?? initialFactor;
    onPrint(target);
  };

  const reset = () => {
    setFactorInput("1");
    if (hasPortion) {
      setPortionInput(formatNumeric(basePortionCount as number));
    }
    onReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg print:hidden">
        <DialogHeader>
          <DialogTitle>Scale recipe before printing</DialogTitle>
          <DialogDescription>
            Adjust the ingredient quantities by choosing a multiplier or target yield before sending
            the recipe to the printer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="scale-multiplier">Scale multiplier</Label>
            <Input
              id="scale-multiplier"
              inputMode="decimal"
              value={factorInput}
              onChange={(event) => setFactorInput(event.target.value)}
              placeholder="1"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {quickOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  onClick={() => applyWithFactor(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Button type="button" variant="ghost" onClick={reset}>
                Reset
              </Button>
            </div>
          </div>

          {hasPortion && (
            <div className="space-y-2">
              <Label htmlFor="scale-portions">Target portions</Label>
              <Input
                id="scale-portions"
                inputMode="decimal"
                value={portionInput}
                onChange={(event) => handlePortionTargetChange(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Original portion: {formatNumeric(basePortionCount as number)}
                {portionLabel ? ` ${portionLabel}` : ""}
              </p>
            </div>
          )}

          {(hasYield || hasPortion) && (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              {hasPortion && (
                <div>
                  <span className="font-medium">Scaled portions:</span>{" "}
                  {formatNumeric(scaledPortion as number)}
                  {portionLabel ? ` ${portionLabel}` : ""}
                </div>
              )}
              {hasYield && (
                <div className="mt-2">
                  <span className="font-medium">Scaled yield:</span>{" "}
                  {formatQuantity(scaledYield as number)}
                  {yieldLabel ? ` ${yieldLabel}` : ""}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" disabled={!isFactorValid} onClick={apply}>
            Apply scale
          </Button>
          <Button type="button" disabled={!isFactorValid} onClick={print}>
            Scale &amp; Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
