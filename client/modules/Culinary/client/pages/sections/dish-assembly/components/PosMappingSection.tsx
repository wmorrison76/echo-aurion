import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { POS_SYSTEM_DEFINITIONS, PosMapping, buildPosCode } from "../utils";
import { Sparkles, CheckCircle2 } from "lucide-react";

type PosMappingSectionProps = {
  mappings: PosMapping[];
  onChange: (next: PosMapping[]) => void;
  menuPrice: string;
  menuTitle: string;
  variant?: "card" | "plain";
};

const PosMappingSection: React.FC<PosMappingSectionProps> = ({
  mappings,
  onChange,
  menuPrice,
  menuTitle,
  variant = "card",
}) => {
  const updateMapping = useCallback(
    (key: PosMapping["key"], patch: Partial<PosMapping>) => {
      onChange(
        mappings.map((entry) => {
          if (entry.key !== key) return entry;
          const merged: PosMapping = { ...entry, ...patch };
          if (patch.status) return merged;
          const status = merged.itemCode && merged.price ? "ready" : "draft";
          return { ...merged, status };
        }),
      );
    },
    [mappings, onChange],
  );

  const handleAutoPopulate = useCallback(() => {
    onChange(
      mappings.map((entry) => {
        const next: PosMapping = {
          ...entry,
          itemCode: buildPosCode(menuTitle || "Dish", entry.systemName),
          autoCode: true,
          price: menuPrice || entry.price,
          autoPrice: Boolean(menuPrice) || entry.autoPrice,
        };
        const status = next.itemCode && next.price ? "ready" : "draft";
        return { ...next, status };
      }),
    );
  }, [mappings, menuPrice, menuTitle, onChange]);

  const autoMapButton = (
    <Button
      size="sm"
      variant="outline"
      className="rounded-full border-primary/40 text-primary hover:bg-primary/10"
      onClick={handleAutoPopulate}
    >
      <Sparkles className="mr-1.5 h-4 w-4" />
      Auto map codes
    </Button>
  );

  const mappingsGrid = (
    <>
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 rounded-xl border border-primary/30 bg-muted/20 p-3 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
        <div>System</div>
        <div>Item Code</div>
        <div className="text-right">Price</div>
      </div>
      <div className="space-y-3">
        {POS_SYSTEM_DEFINITIONS.map((definition) => {
          const entry = mappings.find((mapping) => mapping.key === definition.key) ?? {
            key: definition.key,
            systemName: definition.name,
            itemCode: "",
            price: "",
            autoCode: true,
            autoPrice: true,
            status: "draft" as PosMapping["status"],
          };
          const badgeVariant =
            entry.status === "synced"
              ? "default"
              : entry.status === "ready"
                ? "secondary"
                : "outline";
          return (
            <div
              key={definition.key}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-3 rounded-xl border border-primary/20 bg-background/80 p-3 shadow-sm"
            >
              <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span className="text-sm font-semibold tracking-[0.22em] text-foreground">
                  {definition.name}
                </span>
                <Badge variant={badgeVariant} className="w-fit uppercase tracking-[0.3em]">
                  {entry.status}
                </Badge>
              </div>
              <div className="space-y-2">
                <Input
                  value={entry.itemCode}
                  onChange={(event) =>
                    updateMapping(definition.key, {
                      itemCode: event.target.value,
                      autoCode: false,
                    })
                  }
                  placeholder={`${definition.short.toUpperCase()}-ITEM`}
                  className="h-10 rounded-lg border-primary/30"
                />
                <div className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                  {entry.autoCode ? "Auto" : "Manual"}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Input
                  value={entry.price}
                  onChange={(event) =>
                    updateMapping(definition.key, {
                      price: event.target.value,
                      autoPrice: false,
                    })
                  }
                  placeholder={menuPrice || "$00.00"}
                  className="h-10 w-28 rounded-lg border-primary/30 text-right"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full text-emerald-500"
                  onClick={() =>
                    updateMapping(definition.key, {
                      status: entry.status === "synced" ? "ready" : "synced",
                    })
                  }
                  title="Toggle synced"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (variant === "card") {
    return (
      <Card className="border-primary/30 bg-background/95 shadow-lg">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            POS Integrations
          </CardTitle>
          {autoMapButton}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">{mappingsGrid}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-end gap-2">{autoMapButton}</div>
      {mappingsGrid}
    </div>
  );
};

export default PosMappingSection;
